import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ItemRow } from '../../components/ItemRow';
import { LoadingView } from '../../components/LoadingView';
import { ErrorView } from '../../components/ErrorView';
import { useItemsQuery } from '../../hooks/useItems';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAppTheme } from '../../context/ThemeContext';
import type { Item } from '../../types/database';
import type { InventoryStackParamList } from '../../navigation/types';

export function InventoryListScreen() {
  const { colors } = useAppTheme();
  const { isOnline } = useNetworkStatus();
  const navigation = useNavigation<NativeStackNavigationProp<InventoryStackParamList, 'InventoryList'>>();
  const { data: items, isLoading, isError, refetch, isRefetching } = useItemsQuery();
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const filtered = !items
    ? []
    : items.filter(
        (i) =>
          !query ||
          i.name.toLowerCase().includes(query) ||
          i.sku?.toLowerCase().includes(query) ||
          i.barcode?.includes(query)
      );

  function handleOpenItem(item: Item) {
    navigation.navigate('ItemDetail', { itemId: item.id });
  }

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorView message="Couldn't load your inventory." onRetry={() => refetch()} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isOnline ? (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>
          <Text style={styles.offlineText}>Offline — showing your last synced data</Text>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, SKU or barcode"
          placeholderTextColor={colors.textMuted}
          style={[styles.search, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          testID="inventory-search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemRow item={item} onPress={handleOpenItem} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>
              {search ? 'No items match your search.' : 'No items yet. Tap + to add your first one.'}
            </Text>
          </View>
        }
      />

      <Pressable
        onPress={() => navigation.navigate('CreateEditItem', undefined)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        testID="add-item-fab"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('BarcodeScanner', { mode: 'lookup' })}
        style={[styles.scanFab, { backgroundColor: colors.surface, borderColor: colors.border }]}
        testID="scan-fab"
      >
        <Text style={{ fontSize: 20 }}>▤</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: { paddingVertical: 6, alignItems: 'center' },
  offlineText: { color: '#1A1D24', fontSize: 12, fontWeight: '600' },
  searchRow: { paddingHorizontal: 12, paddingTop: 12 },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  listContent: { paddingBottom: 100, paddingTop: 8 },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '600' },
  scanFab: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
});
