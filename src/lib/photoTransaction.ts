import type { SupabaseClient } from '@supabase/supabase-js';
import type { Photo } from '../types';

interface PhotoInsertRecord {
  rapport_id: string;
  category: string;
  url: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
}

interface UploadResult {
  success: boolean;
  insertedCount: number;
  failedCount: number;
  errors: string[];
}

const RETRY_DELAYS = [1000, 2000, 4000];
const STORAGE_BUCKET = 'rapport-photos';

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const raw = atob(parts[1] ?? '');
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const uploadSinglePhoto = async (
  supabase: SupabaseClient,
  photo: Photo,
  rapportId: string,
  category: string
): Promise<string | null> => {
  if (photo.storageUrl) return photo.storageUrl;

  const source = photo.data ?? photo.preview;
  if (!source) return null;

  const blob = base64ToBlob(source);
  const ts = Date.now();
  const safeName = (photo.filename ?? photo.id).replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${rapportId}/${category}/${ts}_${safeName}.jpg`;

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err: unknown) {
      console.warn(`[PhotoTransaction] Upload attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
      if (attempt < RETRY_DELAYS.length - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  return null;
};

const buildRecords = async (
  photos: { category: string; items: Photo[] }[],
  rapportId: string,
  supabase: SupabaseClient
): Promise<{ records: PhotoInsertRecord[]; failedCount: number; errors: string[] }> => {
  const records: PhotoInsertRecord[] = [];
  let failedCount = 0;
  const errors: string[] = [];

  for (const { category, items } of photos) {
    for (const photo of items ?? []) {
      const url = await uploadSinglePhoto(supabase, photo, rapportId, category);

      if (url) {
        records.push({
          rapport_id: rapportId,
          category,
          url,
          latitude: photo.geolocation?.latitude ?? null,
          longitude: photo.geolocation?.longitude ?? null,
          gps_accuracy: photo.geolocation?.accuracy ?? null,
        });
      } else {
        failedCount++;
        errors.push(`Failed to upload ${photo.filename ?? photo.id} (${category})`);
      }
    }
  }

  return { records, failedCount, errors };
};

const attemptInsert = async (
  supabase: SupabaseClient,
  records: PhotoInsertRecord[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('photos')
      .insert(records);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const uploadPhotosWithRetry = async (
  photos: { category: string; items: Photo[] }[],
  rapportId: string,
  supabase: SupabaseClient
): Promise<UploadResult> => {
  const { records, failedCount: uploadFailed, errors: uploadErrors } = await buildRecords(photos, rapportId, supabase);

  if (records.length === 0 && uploadFailed === 0) {
    return { success: true, insertedCount: 0, failedCount: 0, errors: [] };
  }

  if (records.length === 0) {
    return { success: false, insertedCount: 0, failedCount: uploadFailed, errors: uploadErrors };
  }

  const errors: string[] = [...uploadErrors];

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const result = await attemptInsert(supabase, records);

    if (result.success) {
      console.log(`[PhotoTransaction] Insert succeeded on attempt ${attempt + 1}, ${records.length} records`);
      return {
        success: uploadFailed === 0,
        insertedCount: records.length,
        failedCount: uploadFailed,
        errors,
      };
    }

    errors.push(`DB insert attempt ${attempt + 1}: ${result.error}`);
    console.warn(`[PhotoTransaction] Insert attempt ${attempt + 1} failed:`, result.error);

    if (attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  console.error('[PhotoTransaction] All retry attempts exhausted');
  return {
    success: false,
    insertedCount: 0,
    failedCount: records.length + uploadFailed,
    errors,
  };
};

export const rollbackRapport = async (
  rapportId: string,
  supabase: SupabaseClient
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('rapports')
      .delete()
      .eq('id', rapportId);

    if (error) {
      console.error('[PhotoTransaction] Rollback failed:', error);
      return false;
    }

    console.log(`[PhotoTransaction] Rolled back rapport ${rapportId}`);
    return true;
  } catch (err) {
    console.error('[PhotoTransaction] Rollback error:', err);
    return false;
  }
};

export const executePhotoTransaction = async (
  photos: { category: string; items: Photo[] }[],
  rapportId: string,
  supabase: SupabaseClient,
  options: {
    rollbackOnFailure?: boolean;
    criticalCategories?: string[];
  } = {}
): Promise<{
  success: boolean;
  insertedCount: number;
  rolledBack: boolean;
  errors: string[];
}> => {
  const { rollbackOnFailure = false, criticalCategories = [] } = options;

  const result = await uploadPhotosWithRetry(photos, rapportId, supabase);

  if (result.success) {
    return {
      success: true,
      insertedCount: result.insertedCount,
      rolledBack: false,
      errors: [],
    };
  }

  let shouldRollback = rollbackOnFailure;

  if (criticalCategories.length > 0) {
    const hasCriticalPhotos = photos.some(
      p => criticalCategories.includes(p.category) && p.items.length > 0
    );
    shouldRollback = rollbackOnFailure && hasCriticalPhotos;
  }

  let rolledBack = false;
  if (shouldRollback) {
    rolledBack = await rollbackRapport(rapportId, supabase);
  }

  return {
    success: false,
    insertedCount: 0,
    rolledBack,
    errors: result.errors,
  };
};
