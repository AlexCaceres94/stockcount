import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { InventoryListScreen } from '../screens/inventory/InventoryListScreen';
import { ItemDetailScreen } from '../screens/inventory/ItemDetailScreen';
import { CreateEditItemScreen } from '../screens/inventory/CreateEditItemScreen';
import { BarcodeScannerScreen } from '../screens/inventory/BarcodeScannerScreen';
import { useAppTheme } from '../context/ThemeContext';
import type { InventoryStackParamList } from './types';

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export function InventoryStackNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: 'Inventory' }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item' }} />
      <Stack.Screen
        name="CreateEditItem"
        component={CreateEditItemScreen}
        options={{ title: 'Item details', presentation: 'modal' }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScannerScreen}
        options={{ title: 'Scan barcode', presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}
