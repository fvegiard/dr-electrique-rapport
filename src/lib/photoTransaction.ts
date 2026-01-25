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

const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Transform Photo array to insert records for the photos table
 */
const transformPhotosToRecords = (
  photos: Photo[],
  rapportId: string,
  category: string
): PhotoInsertRecord[] => {
  return (photos || []).filter(photo => photo.storageUrl).map(photo => ({
    rapport_id: rapportId,
    category,
    url: photo.storageUrl || '',
    latitude: photo.geolocation?.latitude ?? null,
    longitude: photo.geolocation?.longitude ?? null,
    gps_accuracy: photo.geolocation?.accuracy ?? null,
  }));
};

/**
 * Attempt a single insert operation with error handling
 */
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

/**
 * Upload photos with retry logic (3 attempts with exponential backoff)
 *
 * @param photos - Array of photos from all categories
 * @param rapportId - The ID of the rapport these photos belong to
 * @param supabase - Supabase client instance
 * @returns Upload result with success status and counts
 */
export const uploadPhotosWithRetry = async (
  photos: { category: string; items: Photo[] }[],
  rapportId: string,
  supabase: SupabaseClient
): Promise<UploadResult> => {
  const allRecords: PhotoInsertRecord[] = [];

  // Collect all photo records
  for (const { category, items } of photos) {
    const records = transformPhotosToRecords(items, rapportId, category);
    allRecords.push(...records);
  }

  if (allRecords.length === 0) {
    return { success: true, insertedCount: 0, failedCount: 0, errors: [] };
  }

  const errors: string[] = [];

  // Attempt with retries
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const result = await attemptInsert(supabase, allRecords);

    if (result.success) {
      console.log(`[PhotoTransaction] Insert succeeded on attempt ${attempt + 1}`);
      return {
        success: true,
        insertedCount: allRecords.length,
        failedCount: 0,
        errors: [],
      };
    }

    errors.push(`Attempt ${attempt + 1}: ${result.error}`);
    console.warn(`[PhotoTransaction] Attempt ${attempt + 1} failed:`, result.error);

    // If we have more retries, wait before next attempt
    if (attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  // All retries exhausted
  console.error('[PhotoTransaction] All retry attempts exhausted');
  return {
    success: false,
    insertedCount: 0,
    failedCount: allRecords.length,
    errors,
  };
};

/**
 * Rollback a rapport and its associated data if critical photos fail
 * Use this only when photo persistence is critical and rapport should not exist without them
 *
 * @param rapportId - The ID of the rapport to delete
 * @param supabase - Supabase client instance
 * @returns boolean indicating if rollback was successful
 */
export const rollbackRapport = async (
  rapportId: string,
  supabase: SupabaseClient
): Promise<boolean> => {
  try {
    // Photos table has ON DELETE CASCADE, so deleting rapport removes photos too
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

/**
 * Insert all photos atomically - if any fail, none are inserted
 * Uses a single insert call to ensure all-or-nothing behavior
 *
 * @param photos - Array of photos grouped by category
 * @param rapportId - The ID of the rapport
 * @param supabase - Supabase client instance
 * @returns Object with success status and inserted records
 */
export const insertPhotosAtomic = async (
  photos: { category: string; items: Photo[] }[],
  rapportId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; count: number; error?: string }> => {
  const allRecords: PhotoInsertRecord[] = [];

  for (const { category, items } of photos) {
    const records = transformPhotosToRecords(items, rapportId, category);
    allRecords.push(...records);
  }

  if (allRecords.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const { error } = await supabase
      .from('photos')
      .insert(allRecords);

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: allRecords.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, count: 0, error: message };
  }
};

/**
 * Combined transaction: insert photos with retry, optionally rollback rapport on failure
 *
 * @param photos - Array of photos grouped by category
 * @param rapportId - The ID of the rapport
 * @param supabase - Supabase client instance
 * @param options - Configuration options
 * @returns Transaction result
 */
export const executePhotoTransaction = async (
  photos: { category: string; items: Photo[] }[],
  rapportId: string,
  supabase: SupabaseClient,
  options: {
    rollbackOnFailure?: boolean;
    criticalCategories?: string[]; // Only rollback if these categories fail
  } = {}
): Promise<{
  success: boolean;
  insertedCount: number;
  rolledBack: boolean;
  errors: string[];
}> => {
  const { rollbackOnFailure = false, criticalCategories = [] } = options;

  // Attempt upload with retries
  const result = await uploadPhotosWithRetry(photos, rapportId, supabase);

  if (result.success) {
    return {
      success: true,
      insertedCount: result.insertedCount,
      rolledBack: false,
      errors: [],
    };
  }

  // Check if we should rollback
  let shouldRollback = rollbackOnFailure;

  if (criticalCategories.length > 0) {
    // Only rollback if critical categories have photos that failed
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
