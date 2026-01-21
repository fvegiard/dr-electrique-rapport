import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Test Helper
 * Provides utilities to verify DB records and Storage files in E2E tests
 */

const SUPABASE_URL = 'https://iawsshgkogntmdzrfjyw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client for test verification
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_ANON_KEY environment variable is required for E2E tests');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/**
 * Verify a rapport exists in the database
 */
export async function verifyRapportExists(rapportId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rapports')
    .select('id')
    .eq('id', rapportId)
    .single();

  if (error) {
    console.error('Error verifying rapport:', error);
    return false;
  }
  return !!data;
}

/**
 * Get rapport by ID with all fields
 */
export async function getRapport(rapportId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rapports')
    .select('*')
    .eq('id', rapportId)
    .single();

  if (error) {
    console.error('Error fetching rapport:', error);
    return null;
  }
  return data;
}

/**
 * Get photos for a rapport from the photos table
 */
export async function getPhotosForRapport(rapportId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('rapport_id', rapportId);

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
  return data || [];
}

/**
 * Verify photo count in database matches expected
 */
export async function verifyPhotoCount(rapportId: string, expectedCount: number): Promise<boolean> {
  const photos = await getPhotosForRapport(rapportId);
  return photos.length === expectedCount;
}

/**
 * Verify photos exist in Storage bucket
 */
export async function verifyPhotosInStorage(rapportId: string): Promise<{
  exists: boolean;
  files: string[];
}> {
  const supabase = getSupabaseClient();

  // List files in the rapport's folder
  const { data, error } = await supabase.storage
    .from('photos')
    .list(rapportId, {
      limit: 100,
      offset: 0,
    });

  if (error) {
    console.error('Error listing storage files:', error);
    return { exists: false, files: [] };
  }

  // Check subfolders (GENERAL, AVANT, APRES, PROBLEMES)
  const allFiles: string[] = [];
  const categories = ['GENERAL', 'AVANT', 'APRES', 'PROBLEMES'];

  for (const category of categories) {
    const { data: categoryFiles, error: categoryError } = await supabase.storage
      .from('photos')
      .list(`${rapportId}/${category}`, {
        limit: 100,
        offset: 0,
      });

    if (!categoryError && categoryFiles) {
      allFiles.push(...categoryFiles.map(f => `${rapportId}/${category}/${f.name}`));
    }
  }

  return {
    exists: allFiles.length > 0,
    files: allFiles
  };
}

/**
 * Verify photo URLs are accessible
 */
export async function verifyPhotoUrlsAccessible(rapportId: string): Promise<boolean> {
  const photos = await getPhotosForRapport(rapportId);

  if (photos.length === 0) {
    return false;
  }

  // Check if at least one photo URL is accessible
  for (const photo of photos) {
    if (photo.url) {
      try {
        const response = await fetch(photo.url, { method: 'HEAD' });
        if (response.ok) {
          return true;
        }
      } catch {
        // Continue checking other URLs
      }
    }
  }

  return false;
}

/**
 * Clean up test data (call in afterAll or afterEach)
 */
export async function cleanupTestRapport(rapportId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Delete photos from storage first
  const categories = ['GENERAL', 'AVANT', 'APRES', 'PROBLEMES'];
  for (const category of categories) {
    const { data: files } = await supabase.storage
      .from('photos')
      .list(`${rapportId}/${category}`);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${rapportId}/${category}/${f.name}`);
      await supabase.storage.from('photos').remove(filePaths);
    }
  }

  // Delete photo records from DB (cascade should handle this, but explicit is better)
  await supabase
    .from('photos')
    .delete()
    .eq('rapport_id', rapportId);

  // Delete the rapport
  await supabase
    .from('rapports')
    .delete()
    .eq('id', rapportId);
}

/**
 * Get the most recent rapport (useful for finding test-submitted rapport)
 */
export async function getMostRecentRapport() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rapports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching most recent rapport:', error);
    return null;
  }
  return data;
}

/**
 * Wait for a rapport to appear in the database (polling)
 */
export async function waitForRapport(
  matchFn: (rapport: Record<string, unknown>) => boolean,
  timeoutMs = 10000,
  pollIntervalMs = 500
): Promise<Record<string, unknown> | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const rapport = await getMostRecentRapport();
    if (rapport && matchFn(rapport)) {
      return rapport;
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}
