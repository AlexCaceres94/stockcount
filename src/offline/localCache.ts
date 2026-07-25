import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Item } from '../types/database';

const itemsKey = (userId: string) => `stockcount:cache:items:${userId}`;

export async function getCachedItems(userId: string): Promise<Item[]> {
  const raw = await AsyncStorage.getItem(itemsKey(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Item[];
  } catch {
    return [];
  }
}

export async function setCachedItems(userId: string, items: Item[]): Promise<void> {
  await AsyncStorage.setItem(itemsKey(userId), JSON.stringify(items));
}

export async function upsertCachedItem(userId: string, item: Item): Promise<Item[]> {
  const current = await getCachedItems(userId);
  const index = current.findIndex((i) => i.id === item.id);
  const next = index === -1 ? [item, ...current] : current.map((i) => (i.id === item.id ? item : i));
  await setCachedItems(userId, next);
  return next;
}

export async function removeCachedItem(userId: string, itemId: string): Promise<Item[]> {
  const current = await getCachedItems(userId);
  const next = current.filter((i) => i.id !== itemId);
  await setCachedItems(userId, next);
  return next;
}
