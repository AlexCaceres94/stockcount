import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCachedItems, removeCachedItem, setCachedItems, upsertCachedItem } from '../offline/localCache';
import { enqueueOperation } from '../offline/syncQueue';
import type { Item, ItemUpdate, NewItem } from '../types/database';

async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Every mutation below (create, update, delete) follows the same three steps:
 *   1. Save the change to the local AsyncStorage cache right away, so the
 *      UI has something to show even if the network call never happens.
 *   2. If we're online, try Supabase directly.
 *   3. If we're offline, or the Supabase call fails, add the change to the
 *      sync queue (src/offline/syncQueue.ts) so it gets retried automatically
 *      the next time the app is back online.
 */

export function useItemsQuery() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: ['items', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Item[]> => {
      const online = await isConnected();

      if (!online) {
        return getCachedItems(userId);
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) {
        // Network hiccup even though NetInfo said we're online — fall back to cache.
        return getCachedItems(userId);
      }

      await setCachedItems(userId, data ?? []);
      return data ?? [];
    },
  });
}

export function useItemQuery(itemId: string | undefined) {
  const items = useItemsQuery();
  return items.data?.find((i) => i.id === itemId);
}

export function useCreateItem() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewItem) => {
      const clientItemId = uuidv4();
      const optimisticItem: Item = {
        id: clientItemId,
        user_id: userId,
        name: input.name,
        sku: input.sku ?? null,
        category: input.category ?? null,
        barcode: input.barcode ?? null,
        min_stock: input.min_stock ?? 0,
        quantity: input.quantity ?? 0,
        photo_url: input.photo_url ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const online = await isConnected();

      if (!online) {
        await upsertCachedItem(userId, optimisticItem);
        await enqueueOperation({
          type: 'create_item',
          userId,
          payload: { ...input, clientItemId },
        });
        return optimisticItem;
      }

      const { data, error } = await supabase
        .from('items')
        .insert({ ...input, user_id: userId })
        .select()
        .single();

      if (error) {
        await upsertCachedItem(userId, optimisticItem);
        await enqueueOperation({
          type: 'create_item',
          userId,
          payload: { ...input, clientItemId },
        });
        return optimisticItem;
      }

      await upsertCachedItem(userId, data);
      return data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] });
    },
  });
}

export function useUpdateItem() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, changes }: { itemId: string; changes: ItemUpdate }) => {
      const cached = await getCachedItems(userId);
      const existing = cached.find((i) => i.id === itemId);
      const optimistic: Item | undefined = existing
        ? { ...existing, ...changes, updated_at: new Date().toISOString() }
        : undefined;
      if (optimistic) await upsertCachedItem(userId, optimistic);

      const online = await isConnected();
      if (!online) {
        await enqueueOperation({ type: 'update_item', userId, itemId, payload: changes });
        return optimistic;
      }

      const { data, error } = await supabase
        .from('items')
        .update(changes)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        await enqueueOperation({ type: 'update_item', userId, itemId, payload: changes });
        return optimistic;
      }

      await upsertCachedItem(userId, data);
      return data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] });
    },
  });
}

export function useDeleteItem() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await removeCachedItem(userId, itemId);

      const online = await isConnected();
      if (!online) {
        await enqueueOperation({ type: 'delete_item', userId, itemId });
        return;
      }

      const { error } = await supabase.from('items').delete().eq('id', itemId).eq('user_id', userId);
      if (error) {
        await enqueueOperation({ type: 'delete_item', userId, itemId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', userId] });
    },
  });
}
