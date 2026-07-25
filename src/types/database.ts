export interface Item {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  barcode: string | null;
  min_stock: number;
  quantity: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type NewItem = Pick<Item, 'name'> &
  Partial<Pick<Item, 'sku' | 'category' | 'barcode' | 'min_stock' | 'quantity' | 'photo_url'>>;

export type ItemUpdate = Partial<
  Pick<Item, 'name' | 'sku' | 'category' | 'barcode' | 'min_stock' | 'quantity' | 'photo_url'>
>;

export interface ItemCount {
  id: string;
  item_id: string;
  user_id: string;
  delta: number;
  quantity_after: number;
  latitude: number | null;
  longitude: number | null;
  client_op_id: string | null;
  created_at: string;
}

export function isLowStock(item: Pick<Item, 'quantity' | 'min_stock'>): boolean {
  return item.quantity <= item.min_stock;
}
