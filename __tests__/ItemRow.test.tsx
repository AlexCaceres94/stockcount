import { render, screen, fireEvent } from '@testing-library/react-native';

import { ItemRow } from '../src/components/ItemRow';
import { ThemeProvider } from '../src/context/ThemeContext';
import type { Item } from '../src/types/database';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const baseItem: Item = {
  id: '1',
  user_id: 'user-1',
  name: 'Blue T-Shirt',
  sku: 'BTS-001',
  category: 'Apparel',
  barcode: '1234567890123',
  min_stock: 5,
  quantity: 2,
  photo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ItemRow', () => {
  it('renders the item name and quantity', async () => {
    renderWithTheme(<ItemRow item={baseItem} onPress={() => {}} />);
    expect(await screen.findByText('Blue T-Shirt')).toBeTruthy();
    expect(await screen.findByText('2')).toBeTruthy();
  });

  it('shows a low-stock badge when quantity is at or below min_stock', async () => {
    renderWithTheme(<ItemRow item={baseItem} onPress={() => {}} />);
    expect(await screen.findByText('LOW STOCK')).toBeTruthy();
  });

  it('does not show a low-stock badge when stock is healthy', async () => {
    renderWithTheme(<ItemRow item={{ ...baseItem, quantity: 20 }} onPress={() => {}} />);
    expect(screen.queryByText('LOW STOCK')).toBeNull();
  });

  it('calls onPress with the item when tapped', async () => {
    const onPress = jest.fn();
    renderWithTheme(<ItemRow item={baseItem} onPress={onPress} />);
    const row = await screen.findByTestId('item-row-1');
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledWith(baseItem);
  });
});
