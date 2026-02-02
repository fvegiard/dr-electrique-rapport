import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  .env file not found. Ensuring environment variables are set manually.');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET_NAME = 'rapport-photos';
const PHOTOS_TABLE = 'photos';
const DRY_RUN = process.argv.includes('--dry-run');

async function cleanupStorage() {
  console.log(`🧹 Starting cleanup for bucket "${BUCKET_NAME}"...`);
  if (DRY_RUN) console.log('👀 DRY RUN MODE: No files will be deleted.');

  // 1. List all files in storage
  // Note: Supabase implementation of list might need pagination if > 1000 files.
  // For now, we list the root and common subfolders if structure is known, 
  // or use a recursive approach if possible. 'rapport-photos' seems flat or by project?
  // Based on utils/photoUtils.ts, path is `${projectId}/${category}/${timestamp}_${safeName}.jpg`
  // We need to list recursively.
  
  // Listing all files (limit 1000 for this script version)
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 100, search: '' }); // Listing root folders (projects) first if strictly hierarchical

  // Since it's hierarchical (projectId/category/file), we might need to dig deeper.
  // Strategy: List all photos from the DATABASE first to know what is VALID.
  // THEN list storage. 
  // Actually, simpler strategy for recursive storage listing is tricky without a known structure.
  
  // ALTERNATIVE: List all valid storage paths from DB
  const { data: dbPhotos, error: dbError } = await supabase
    .from(PHOTOS_TABLE)
    .select('storage_path');

  if (dbError) {
    console.error('❌ Error fetching photos from DB:', dbError);
    return;
  }

  const validPaths = new Set(dbPhotos.map(p => p.storage_path).filter(Boolean));
  console.log(`✅ Found ${validPaths.size} valid photo references in database.`);

  // Now we need to traverse the storage to find files NOT in validPaths.
  // We'll iterate through project folders (top level).
  const { data: projectFolders, error: projError } = await supabase.storage.from(BUCKET_NAME).list();
  if (projError) {
    console.error('❌ Error listing storage root:', projError);
    return;
  }

  let totalDeleted = 0;
  let totalFound = 0;

  for (const projectFolder of projectFolders) {
    if (!projectFolder.id) continue; // Skip if not a folder/file
    
    // Check if it's a folder (Supabase list returns objects, metadata often null for folders)
    // We assume top level are project IDs.
    const projectId = projectFolder.name;
    
    // List categories inside project
    const { data: categories, error: catError } = await supabase.storage.from(BUCKET_NAME).list(projectId);
    if (catError) continue;

    for (const category of categories) {
      const categoryName = category.name;
      const folderPath = `${projectId}/${categoryName}`;

      // List files in category
      const { data: files, error: fileError } = await supabase.storage.from(BUCKET_NAME).list(folderPath);
      if (fileError) continue;

      for (const file of files) {
        if (file.name === '.emptyFolderPlaceholder') continue; // Ignore placeholders using exact name

        const fullPath = `${folderPath}/${file.name}`;
        totalFound++;

        // Check age > 24h
        const created = new Date(file.created_at);
        const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);

        if (ageHours < 24) {
           // Skip young files
           continue;
        }

        if (!validPaths.has(fullPath)) {
          console.log(`🗑️ Orphan found: ${fullPath} (Age: ${ageHours.toFixed(1)}h)`);
          
          if (!DRY_RUN) {
             const { error: delError } = await supabase.storage.from(BUCKET_NAME).remove([fullPath]);
             if (delError) {
               console.error(`   Failed to delete ${fullPath}:`, delError.message);
             } else {
               console.log(`   Deleted.`);
               totalDeleted++;
             }
          } else {
             totalDeleted++; // Count as "would be deleted"
          }
        }
      }
    }
  }

  console.log(`\n🎉 Cleanup complete.`);
  console.log(`   Total files scanned: ${totalFound}`);
  console.log(`   Orphaned files ${DRY_RUN ? 'identified' : 'deleted'}: ${totalDeleted}`);
}

cleanupStorage().catch(err => console.error('Unexpected error:', err));
