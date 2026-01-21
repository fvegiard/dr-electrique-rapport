// @ts-check
import { createClient } from '@supabase/supabase-js';

/**
 * Test prefix to identify test data for cleanup
 */
export const TEST_PREFIX = '[E2E-TEST] ';

/**
 * Creates a Supabase client configured for testing
 * Uses environment variables from .env.test
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found in environment');
    console.warn('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.test');

    // Return a mock client for tests that can run without Supabase
    return createMockSupabaseClient();
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Creates a mock Supabase client for tests without real credentials
 */
function createMockSupabaseClient() {
  const mockResponse = { data: [], error: null };

  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve(mockResponse)
          })
        }),
        ilike: () => ({
          order: () => ({
            limit: () => Promise.resolve(mockResponse)
          })
        }),
        order: () => ({
          limit: () => Promise.resolve(mockResponse)
        })
      }),
      delete: () => ({
        ilike: () => Promise.resolve(mockResponse),
        eq: () => Promise.resolve(mockResponse),
        in: () => Promise.resolve(mockResponse)
      }),
      insert: () => Promise.resolve(mockResponse),
      update: () => ({
        eq: () => Promise.resolve(mockResponse)
      })
    }),
    storage: {
      from: () => ({
        remove: () => Promise.resolve(mockResponse),
        list: () => Promise.resolve(mockResponse),
        upload: () => Promise.resolve({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://mock.url/image.png' } })
      })
    }
  };
}

/**
 * Cleans up all test rapports and associated photos
 * Uses the TEST_PREFIX to identify test data
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function cleanupTestRapports(supabase) {
  console.log('Cleaning up test rapports...');

  try {
    // Find all test rapports
    const { data: testRapports, error: findError } = await supabase
      .from('rapports')
      .select('id')
      .ilike('chantier', `%${TEST_PREFIX}%`);

    if (findError) {
      console.error('Error finding test rapports:', findError);
      return;
    }

    if (!testRapports || testRapports.length === 0) {
      console.log('No test rapports to clean up');
      return;
    }

    const rapportIds = testRapports.map(r => r.id);
    console.log(`Found ${rapportIds.length} test rapports to clean up`);

    // Delete associated photos first (foreign key constraint)
    const { error: photosError } = await supabase
      .from('photos')
      .delete()
      .in('rapport_id', rapportIds);

    if (photosError) {
      console.error('Error deleting test photos:', photosError);
    }

    // Delete the rapports
    const { error: rapportsError } = await supabase
      .from('rapports')
      .delete()
      .in('id', rapportIds);

    if (rapportsError) {
      console.error('Error deleting test rapports:', rapportsError);
    }

    console.log('Test cleanup complete');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Deletes a specific rapport and its photos
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} rapportId
 */
export async function deleteRapport(supabase, rapportId) {
  if (!rapportId) return;

  try {
    // Delete photos first
    await supabase
      .from('photos')
      .delete()
      .eq('rapport_id', rapportId);

    // Delete rapport
    await supabase
      .from('rapports')
      .delete()
      .eq('id', rapportId);

    console.log(`Deleted rapport ${rapportId}`);
  } catch (error) {
    console.error(`Error deleting rapport ${rapportId}:`, error);
  }
}

/**
 * Deletes photos from storage bucket
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} paths - Array of storage paths to delete
 * @param {string} bucket - Storage bucket name (default: 'photos')
 */
export async function deleteStorageFiles(supabase, paths, bucket = 'photos') {
  if (!paths || paths.length === 0) return;

  try {
    const { error } = await supabase
      .storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error('Error deleting storage files:', error);
    }
  } catch (error) {
    console.error('Storage deletion error:', error);
  }
}

/**
 * Creates a test rapport for use in tests
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} data - Rapport data
 * @returns {Promise<{id: string} | null>}
 */
export async function createTestRapport(supabase, data = {}) {
  const testData = {
    chantier: `${TEST_PREFIX}Test Chantier`,
    superviseur: 'Test Superviseur',
    date: new Date().toISOString().split('T')[0],
    description: 'Auto-generated test rapport',
    ...data
  };

  // Ensure test prefix is in chantier name
  if (!testData.chantier.includes(TEST_PREFIX)) {
    testData.chantier = `${TEST_PREFIX}${testData.chantier}`;
  }

  const { data: rapport, error } = await supabase
    .from('rapports')
    .insert(testData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating test rapport:', error);
    return null;
  }

  return rapport;
}

/**
 * Waits for a rapport to exist in the database
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} searchTerm - Term to search for in chantier name
 * @param {number} maxWaitMs - Maximum wait time in milliseconds
 * @returns {Promise<object | null>}
 */
export async function waitForRapport(supabase, searchTerm, maxWaitMs = 10000) {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < maxWaitMs) {
    const { data: rapports } = await supabase
      .from('rapports')
      .select('*')
      .ilike('chantier', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (rapports && rapports.length > 0) {
      return rapports[0];
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return null;
}
