import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppTheme } from '../../context/ThemeContext';
import { useItemsQuery } from '../../hooks/useItems';
import type { InventoryStackParamList } from '../../navigation/types';

type Route = RouteProp<InventoryStackParamList, 'BarcodeScanner'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList, 'BarcodeScanner'>;

const SCANNABLE_TYPES = ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] as const;

export function BarcodeScannerScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const mode = params?.mode ?? 'lookup';
  const { data: items } = useItemsQuery();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned) return;
    setScanned(true);
    const code = result.data;

    if (mode === 'assign') {
      navigation.navigate('CreateEditItem', { prefillBarcode: code });
      return;
    }

    const existing = items?.find((i) => i.barcode === code);
    if (existing) {
      navigation.replace('ItemDetail', { itemId: existing.id });
    } else {
      navigation.navigate('CreateEditItem', { prefillBarcode: code });
    }
  }

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24, gap: 16 }]}>
        <Text style={{ color: colors.text, textAlign: 'center', fontSize: 15 }}>
          StockCount needs camera access to scan barcodes.
        </Text>
        <Pressable onPress={requestPermission} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...SCANNABLE_TYPES] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Align the barcode inside the frame</Text>
      </View>
      {scanned ? (
        <Pressable
          onPress={() => setScanned(false)}
          style={[styles.rescanButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>Scan again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: 250, height: 150, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  hint: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  rescanButton: { position: 'absolute', bottom: 40, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});
