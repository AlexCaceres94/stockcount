import { countReducer, deltaForAction, isLowStockQuantity } from '../src/state/countReducer';

describe('countReducer', () => {
  it('increments the count by 1', () => {
    expect(countReducer(5, { type: 'increment' })).toBe(6);
  });

  it('decrements the count by 1', () => {
    expect(countReducer(5, { type: 'decrement' })).toBe(4);
  });

  it('never decrements below zero', () => {
    expect(countReducer(0, { type: 'decrement' })).toBe(0);
  });

  it('sets an explicit quantity', () => {
    expect(countReducer(5, { type: 'set', quantity: 42 })).toBe(42);
  });

  it('clamps a negative "set" quantity to zero', () => {
    expect(countReducer(5, { type: 'set', quantity: -3 })).toBe(0);
  });

  it('truncates a fractional "set" quantity', () => {
    expect(countReducer(0, { type: 'set', quantity: 7.9 })).toBe(7);
  });

  it('is a pure function: same input always produces the same output', () => {
    const result1 = countReducer(10, { type: 'increment' });
    const result2 = countReducer(10, { type: 'increment' });
    expect(result1).toBe(result2);
  });
});

describe('deltaForAction', () => {
  it('maps increment to +1', () => {
    expect(deltaForAction({ type: 'increment' })).toBe(1);
  });

  it('maps decrement to -1', () => {
    expect(deltaForAction({ type: 'decrement' })).toBe(-1);
  });

  it('maps set to 0 (not counted as a +/- delta)', () => {
    expect(deltaForAction({ type: 'set', quantity: 10 })).toBe(0);
  });
});

describe('isLowStockQuantity', () => {
  it('flags a quantity at or below the minimum as low stock', () => {
    expect(isLowStockQuantity(3, 5)).toBe(true);
    expect(isLowStockQuantity(5, 5)).toBe(true);
  });

  it('does not flag a quantity above the minimum', () => {
    expect(isLowStockQuantity(6, 5)).toBe(false);
  });
});
