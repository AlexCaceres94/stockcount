import { supabase } from './supabase';

/**
 * Uploads a locally captured photo (file:// uri from expo-camera) to the
 * `item-photos` Supabase Storage bucket and returns its public URL.
 * Bucket is public, so the returned URL can be used directly in <Image>.
 */
export async function uploadItemPhoto(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('item-photos').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('item-photos').getPublicUrl(path);
  return data.publicUrl;
}
