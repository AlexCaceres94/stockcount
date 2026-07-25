import { supabase } from './supabase';

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
