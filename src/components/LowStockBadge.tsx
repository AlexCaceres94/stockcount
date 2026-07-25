import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';

export function LowStockBadge() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.warning }]}>
      <Text style={styles.text}>LOW STOCK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  text: { color: '#1A1D24', fontSize: 11, fontWeight: '700' },
});
