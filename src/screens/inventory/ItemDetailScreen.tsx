import { useEffect, useReducer } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CountButton } from '../../components/CountButton';
import { LoadingView } from '../../components/LoadingView';
import { useAppTheme } from '../../context/ThemeContext';
import { useItemsQuery, useDeleteItem } from '../../hooks/useItems';
import { useAdjustCount, useItemHistoryQuery } from '../../hooks/useItemCounts';
import { countReducer } from '../../state/countReducer';
import { isLowStock } from '../../types/database';
import type { InventoryStackParamList } from '../../navigation/types';

type Route = RouteProp<InventoryStackParamList, 'ItemDetail'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList, 'ItemDetail'>;

export function ItemDetailScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { data: items } = useItemsQuery();
  const adjustCount = useAdjustCount();
  const deleteItem = useDeleteItem();
  const { data: history } = useItemHistoryQuery(params.itemId);

  const item = items?.find((i) => i.id === params.itemId);

  // useReducer drives the big +/- display; the source of truth (Supabase +
  // offline queue) is updated through useAdjustCount, and this local
  // reducer is re-synced whenever the server/cache value changes.
  const [displayQuantity, dispatch] = useReducer(countReducer, item?.quantity ?? 0);

  useEffect(() => {
    if (item) dispatch({ type: 'set', quantity: item.quantity });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.quantity]);

  if (!item) return <LoadingView />;

  const low = isLowStock(item);

  function handleAdjust(delta: 1 | -1) {
    if (!item) return;
    dispatch(delta === 1 ? { type: 'increment' } : { type: 'decrement' });
    adjustCount.mutate({ item, delta });
  }

  function handleDelete() {
    deleteItem.mutate(item!.id, { onSuccess: () => navigation.goBack() });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        {item.sku ? <Text style={[styles.meta, { color: colors.textMuted }]}>SKU: {item.sku}</Text> : null}
        {item.barcode ? <Text style={[styles.meta, { color: colors.textMuted }]}>Barcode: {item.barcode}</Text> : null}
        {low ? <Text style={[styles.lowWarning, { color: colors.danger }]}>Below minimum stock ({item.min_stock})</Text> : null}
      </View>

      <View style={styles.counterArea}>
        <CountButton symbol="−" onPress={() => handleAdjust(-1)} disabled={displayQuantity === 0} />
        <Text style={[styles.bigNumber, { color: colors.text }]} testID="item-quantity">
          {displayQuantity}
        </Text>
        <CountButton symbol="+" onPress={() => handleAdjust(1)} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => navigation.navigate('CreateEditItem', { itemId: item.id })}
          style={[styles.actionButton, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text }}>Edit</Text>
        </Pressable>
        <Pressable onPress={handleDelete} style={[styles.actionButton, { borderColor: colors.danger }]}>
          <Text style={{ color: colors.danger }}>Delete</Text>
        </Pressable>
      </View>

      <Text style={[styles.historyTitle, { color: colors.text }]}>Recent history</Text>
      <FlatList
        data={history ?? []}
        keyExtractor={(h) => h.id}
        style={styles.historyList}
        renderItem={({ item: h }) => (
          <View style={[styles.historyRow, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>
              {h.delta > 0 ? '+' : ''}
              {h.delta} → {h.quantity_after}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {new Date(h.created_at).toLocaleString()}
              {h.latitude && h.longitude ? `  ·  ${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)}` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, padding: 16 }}>No counts recorded yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, gap: 4 },
  name: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 13 },
  lowWarning: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  counterArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 16 },
  bigNumber: { fontSize: 56, fontWeight: '800', minWidth: 90, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 },
  actionButton: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  historyTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 4 },
  historyList: { flex: 1 },
  historyRow: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
});
