export type CountAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; quantity: number };

export function countReducer(state: number, action: CountAction): number {
  switch (action.type) {
    case 'increment':
      return state + 1;
    case 'decrement':
      return Math.max(0, state - 1);
    case 'set':
      return Math.max(0, Math.trunc(action.quantity));
    default:
      return state;
  }
}

export function deltaForAction(action: CountAction): number {
  switch (action.type) {
    case 'increment':
      return 1;
    case 'decrement':
      return -1;
    case 'set':
      return 0;
  }
}

export function isLowStockQuantity(quantity: number, minStock: number): boolean {
  return quantity <= minStock;
}
