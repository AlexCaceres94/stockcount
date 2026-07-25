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
 * Applies a +1 / -1 / arbitrary delta to an item's quantity, records the
 * change in item_counts with a GPS tag, and works fully offline (the change
 * lands in the local cache immediately and a sync operation is queued).
 */
export function useAdjustCount() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, delta }: { item: Item; delta: number }) => {
      const quantityAfter = Math.max(0, item.quantity + delta);
      const { latitude, longitude } = await tryGetLocation();

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

      const { error: itemError } = await supabase
        .from('items')
        .update({ quantity: quantityAfter })
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
    onMutate: async ({ item, delta }) => {
      await queryClient.cancelQueries({ queryKey: ['items', userId] });
      const previous = queryClient.getQueryData<Item[]>(['items', userId]);

      queryClient.setQueryData<Item[]>(['items', userId], (old) =>
        (old ?? []).map((i) => (i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['items', userId], context.previous);
      }
    },
    onSettled: () => {
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

// Re-exported for screens that want a synchronous read of the current cache
// (e.g. to render something instantly before the query resolves).
export async function getInitialItems(userId: string) {
  return getCachedItems(userId);
}
