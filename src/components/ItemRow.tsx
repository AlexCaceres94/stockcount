import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import { isLowStock } from '../types/database';
import type { Item } from '../types/database';
import { LowStockBadge } from './LowStockBadge';

interface Props {
  item: Item;
  onPress: (item: Item) => void;
}

export function ItemRow({ item, onPress }: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const low = isLowStock(item);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      testID={`item-row-${item.id}`}
    >
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.background }]}>
          <Text style={{ fontSize: 18 }}>📦</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text, fontSize: isCompact ? 15 : 16 }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.sku ? (
          <Text style={[styles.sku, { color: colors.textMuted }]} numberOfLines={1}>
            SKU: {item.sku}
          </Text>
        ) : null}
        {low ? <LowStockBadge /> : null}
      </View>

      <View style={styles.qtyBox}>
        <Text style={[styles.qty, { color: low ? colors.danger : colors.text }]}>{item.quantity}</Text>
        <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>in stock</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  name: { fontWeight: '600' },
  sku: { fontSize: 12 },
  qtyBox: { alignItems: 'flex-end' },
  qty: { fontSize: 20, fontWeight: '700' },
  qtyLabel: { fontSize: 11 },
});
