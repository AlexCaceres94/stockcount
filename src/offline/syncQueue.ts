import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { supabase } from '../lib/supabase';
import type { NewItem, ItemUpdate } from '../types/database';

const QUEUE_KEY = 'stockcount:sync-queue';

export type SyncOperation =
  | { id: string; type: 'create_item'; userId: string; payload: NewItem & { clientItemId: string }; createdAt: string }
  | { id: string; type: 'update_item'; userId: string; itemId: string; payload: ItemUpdate; createdAt: string }
  | { id: string; type: 'delete_item'; userId: string; itemId: string; createdAt: string }
  | {
      id: string;
      type: 'adjust_count';
      userId: string;
      itemId: string;
      delta: number;
      quantityAfter: number;
      latitude: number | null;
      longitude: number | null;
      createdAt: string;
    };

export async function getQueue(): Promise<SyncOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncOperation[];
  } catch {
    return [];
  }
}

async function setQueue(queue: SyncOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueOperation(op: Omit<SyncOperation, 'id' | 'createdAt'>): Promise<SyncOperation> {
  const queue = await getQueue();
  const full = { ...op, id: uuidv4(), createdAt: new Date().toISOString() } as SyncOperation;
  await setQueue([...queue, full]);
  return full;
}

export async function getQueueLength(): Promise<number> {
  return (await getQueue()).length;
}

/**
 * Processes queued operations against Supabase in order (oldest first).
 * A failed operation (still offline, or a real server error) is kept in the
 * queue for the next flush attempt; everything before it that succeeded is
 * removed. Returns how many operations were successfully synced.
 */
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  let synced = 0;
  const stillPending: SyncOperation[] = [];

  for (const op of queue) {
    try {
      await applyOperation(op);
      synced += 1;
    } catch (err) {
      console.warn('[syncQueue] failed to sync operation, will retry later', op.type, err);
      stillPending.push(op);
    }
  }

  await setQueue(stillPending);
  return { synced, remaining: stillPending.length };
}

async function applyOperation(op: SyncOperation): Promise<void> {
  switch (op.type) {
    case 'create_item': {
      const { clientItemId: _clientItemId, ...payload } = op.payload;
      const { error } = await supabase.from('items').insert({ ...payload, user_id: op.userId });
      if (error) throw error;
      return;
    }
    case 'update_item': {
      const { error } = await supabase.from('items').update(op.payload).eq('id', op.itemId).eq('user_id', op.userId);
      if (error) throw error;
      return;
    }
    case 'delete_item': {
      const { error } = await supabase.from('items').delete().eq('id', op.itemId).eq('user_id', op.userId);
      if (error) throw error;
      return;
    }
    case 'adjust_count': {
      const { error: itemError } = await supabase
        .from('items')
        .update({ quantity: op.quantityAfter })
        .eq('id', op.itemId)
        .eq('user_id', op.userId);
      if (itemError) throw itemError;

      const { error: historyError } = await supabase.from('item_counts').insert({
        item_id: op.itemId,
        user_id: op.userId,
        delta: op.delta,
        quantity_after: op.quantityAfter,
        latitude: op.latitude,
        longitude: op.longitude,
        client_op_id: op.id,
      });
      if (historyError) throw historyError;
      return;
    }
  }
}
