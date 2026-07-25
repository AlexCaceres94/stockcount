import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { upsertCachedItem, getCachedItems } from '../offline/localCache';
import { enqueueOperation } from '../offline/syncQueue';
import type { Item, ItemCount } from '../types/database';

async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

// GPS is optional: if the user hasn't granted location permission, or the
// fix fails for any reason, we just save null coordinates instead of
// blocking the count. Counting inventory should never fail because of GPS.
async function tryGetLocation(): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return { latitude: null, longitude: null };

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return { latitude: null, longitude: null };
  }
}

/**
 * Adds `delta` (+1 or -1) to an item's quantity, and logs the change in
 * item_counts with a GPS tag.
 *
 * The screen that calls this (ItemDetailScreen) already updates the big
 * number on screen instantly through its own useReducer, so this function
 * doesn't need to do any "optimistic UI" trick itself — it just needs to
 * get the new quantity saved (online, in Supabase; offline, in the queue)
 * and then tell React Query to refetch so every screen agrees on the number.
 */
export function useAdjustCount() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, delta }: { item: Item; delta: number }) => {
      const quantityAfter = Math.max(0, item.quantity + delta);
      const { latitude, longitude } = await tryGetLocation();

      // Always save the new quantity in the local cache first, so the
      // inventory list still shows the right number even if the app closes
      // before the network call below finishes.
      const updatedItem: Item = { ...item, quantity: quantityAfter, updated_at: new Date().toISOString() };
      await upsertCachedItem(userId, updatedItem);

      const online = await isConnected();

      if (!online) {
        await enqueueOperation({
          type: 'adjust_count',
          userId,
          itemId: item.id,
          delta,
          quantityAfter,
          latitude,
          longitude,
        });
        return updatedItem;
      }

      // Online: write straight to Supabase — update the item's quantity and
      // add one row to the history table.
      const { error: itemError } = await supabase
        .from('items')
        .update({ quantity: quantityAfter, updated_at: updatedItem.updated_at })
        .eq('id', item.id)
        .eq('user_id', userId);

      const { error: historyError } = await supabase.from('item_counts').insert({
        item_id: item.id,
        user_id: userId,
        delta,
        quantity_after: quantityAfter,
        latitude,
        longitude,
      });

      // If Supabase call failed even though NetInfo said we're online (a
      // flaky connection, a dropped request, etc.), fall back to the same
      // queue offline mode uses so the change isn't lost.
      if (itemError || historyError) {
        await enqueueOperation({
          type: 'adjust_count',
          userId,
          itemId: item.id,
          delta,
          quantityAfter,
          latitude,
          longitude,
        });
      }

      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] });
    },
  });
}

export function useItemHistoryQuery(itemId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: ['item-history', itemId],
    enabled: Boolean(itemId && userId),
    queryFn: async (): Promise<ItemCount[]> => {
      const online = await isConnected();
      if (!online) return [];

      const { data, error } = await supabase
        .from('item_counts')
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];
      return data ?? [];
    },
  });
}

// Lets a screen read the current cached items synchronously (e.g. to show
// something instantly before the query above resolves).
export async function getInitialItems(userId: string) {
  return getCachedItems(userId);
}
