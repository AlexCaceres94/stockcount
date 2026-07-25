import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCreateItem, useItemsQuery, useUpdateItem } from '../../hooks/useItems';
import { uploadItemPhoto } from '../../lib/uploadPhoto';
import type { InventoryStackParamList } from '../../navigation/types';

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Keep it under 100 characters'),
  sku: z.string().max(50).optional().or(z.literal('')),
  category: z.string().max(50).optional().or(z.literal('')),
  barcode: z.string().max(64).optional().or(z.literal('')),
  min_stock: z.coerce.number({ invalid_type_error: 'Must be a number' }).int().min(0, 'Must be 0 or more'),
  quantity: z.coerce.number({ invalid_type_error: 'Must be a number' }).int().min(0, 'Must be 0 or more'),
});

type ItemFormValues = z.infer<typeof itemSchema>;

type Route = RouteProp<InventoryStackParamList, 'CreateEditItem'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList, 'CreateEditItem'>;

export function CreateEditItemScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { data: items } = useItemsQuery();

  const editingItem = params?.itemId ? items?.find((i) => i.id === params.itemId) : undefined;
  const isEditing = Boolean(editingItem);

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const [photoUri, setPhotoUri] = useState<string | null>(editingItem?.photo_url ?? null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: editingItem?.name ?? '',
      sku: editingItem?.sku ?? '',
      category: editingItem?.category ?? '',
      barcode: editingItem?.barcode ?? '',
      min_stock: editingItem?.min_stock ?? 0,
      quantity: editingItem?.quantity ?? 0,
    },
  });

  useEffect(() => {
    if (params?.prefillBarcode) {
      setValue('barcode', params.prefillBarcode);
    }
  }, [params?.prefillBarcode, setValue]);

  async function handleTakePhoto() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setShowCamera(true);
  }

  async function handleShutter() {
    const result = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
    if (result) setPhotoUri(result.uri);
    setShowCamera(false);
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      let photoUrl = editingItem?.photo_url ?? null;

      if (photoUri && photoUri !== editingItem?.photo_url && user) {
        setUploading(true);
        photoUrl = await uploadItemPhoto(user.id, photoUri);
        setUploading(false);
      }

      const payload = {
        name: values.name.trim(),
        sku: values.sku?.trim() || null,
        category: values.category?.trim() || null,
        barcode: values.barcode?.trim() || null,
        min_stock: values.min_stock,
        quantity: values.quantity,
        photo_url: photoUrl,
      };

      if (isEditing && editingItem) {
        await updateItem.mutateAsync({ itemId: editingItem.id, changes: payload });
      } else {
        await createItem.mutateAsync(payload);
      }

      navigation.goBack();
    } catch (err) {
      setUploading(false);
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong saving this item.');
    }
  });

  if (showCamera) {
    return (
      <View style={styles.flex}>
        <CameraView ref={cameraRef} style={styles.flex} facing="back" />
        <View style={styles.cameraControls}>
          <Pressable onPress={() => setShowCamera(false)} style={styles.cancelShutter}>
            <Text style={{ color: '#fff' }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleShutter} style={styles.shutter} testID="camera-shutter" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={handleTakePhoto} style={styles.photoPicker}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted }}>Tap to add a photo</Text>
          </View>
        )}
      </Pressable>

      <Field label="Name" error={errors.name?.message} colors={colors}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="e.g. Blue cotton t-shirt"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              testID="field-name"
            />
          )}
        />
      </Field>

      <Field label="SKU" error={errors.sku?.message} colors={colors}>
        <Controller
          control={control}
          name="sku"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            />
          )}
        />
      </Field>

      <Field label="Category" error={errors.category?.message} colors={colors}>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            />
          )}
        />
      </Field>

      <Field label="Barcode" error={errors.barcode?.message} colors={colors}>
        <View style={styles.barcodeRow}>
          <Controller
            control={control}
            name="barcode"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Scan or type"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.flex1, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
                testID="field-barcode"
              />
            )}
          />
          <Pressable
            onPress={() => navigation.navigate('BarcodeScanner', { mode: 'assign' })}
            style={[styles.scanButton, { borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 18 }}>▤</Text>
          </Pressable>
        </View>
      </Field>

      <View style={styles.row}>
        <Field label="Quantity" error={errors.quantity?.message} colors={colors} style={styles.flex1}>
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <TextInput
                value={String(field.value)}
                onChangeText={field.onChange}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              />
            )}
          />
        </Field>
        <Field label="Min. stock" error={errors.min_stock?.message} colors={colors} style={styles.flex1}>
          <Controller
            control={control}
            name="min_stock"
            render={({ field }) => (
              <TextInput
                value={String(field.value)}
                onChangeText={field.onChange}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              />
            )}
          />
        </Field>
      </View>

      {submitError ? <Text style={[styles.error, { color: colors.danger }]}>{submitError}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || uploading}
        style={[styles.submit, { backgroundColor: colors.primary, opacity: isSubmitting || uploading ? 0.6 : 1 }]}
        testID="save-item"
      >
        {isSubmitting || uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{isEditing ? 'Save changes' : 'Create item'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  error,
  colors,
  children,
  style,
}: {
  label: string;
  error?: string;
  colors: ReturnType<typeof useAppTheme>['colors'];
  children: ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  container: { padding: 20, gap: 4, paddingBottom: 48 },
  photoPicker: { alignSelf: 'center', marginBottom: 16 },
  photo: { width: 120, height: 120, borderRadius: 16 },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  error: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  barcodeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanButton: { width: 46, height: 46, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  submit: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  cancelShutter: { padding: 12 },
  shutter: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)' },
});
