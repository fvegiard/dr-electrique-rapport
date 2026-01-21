# DR Électrique - Rapport Journalier

> **Claude Code Agent Context** - Self-sustaining project documentation

**Last Updated:** 2026-01-20
**Status:** In Development - Photo Upload to Supabase Storage

---

## Quick Start

```bash
cd D:\dev\dr-electrique-rapport
npm run dev  # Starts local server at http://localhost:8002
```

**Key commands:**
- `/continue` - Resume work from claude-progress.txt
- `/fix-photos` - Implement photo upload to Supabase Storage

---

## Project Overview

Daily report system for DR Électrique electrical contractors. Field employees submit reports with photos, GPS data, labor hours, and materials used.

| Resource | URL |
|----------|-----|
| Production | https://dr-electrique-rapport.netlify.app |
| Dashboard | https://dr-electrique-rapport.netlify.app/dashboard-a2c15af64b97e73f.html |
| Supabase | https://supabase.com/dashboard/project/iawsshgkogntmdzrfjyw |

---

## Tech Stack

- **Frontend:** React 18 + Babel (CDN, no build step)
- **Styling:** Tailwind CSS (CDN)
- **Backend:** Supabase (PostgreSQL + Storage)
- **AI:** Claude Vision for material detection
- **Hosting:** Netlify (static + serverless functions)

**IMPORTANT:** No build system. Keep it simple with CDN-loaded libraries.

---

## Current Task: Fix Photo Upload to Supabase Storage

### Problem

Photos are captured and displayed correctly, but they're stored as base64 in memory only. When the form is submitted, photos are **not persisted** to Supabase Storage.

### Current Flow (Broken)
```
Capture → Base64 in memory → Display in grid → LOST on submit
```

### Target Flow (To Implement)
```
Capture → Base64 → Upload to Storage → Save URL to photos table → Persist
```

---

## Exact Code Changes Needed

### Step 1: Add Photo Upload Function to index.html

Add after line ~190 (after `sendEmailBackup` function):

```javascript
// ============== PHOTO UPLOAD TO SUPABASE STORAGE ==============
const uploadPhotoToStorage = async (photo, rapportId, category) => {
    try {
        // Convert base64 to blob
        const base64Data = photo.data.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${rapportId}/${category}/${timestamp}_${photo.id}.jpg`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('photos')
            .upload(filename, blob, {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(filename);

        return {
            url: urlData.publicUrl,
            category: category,
            geolocation: photo.geolocation,
            timestamp: photo.timestamp
        };
    } catch (error) {
        console.error('Photo upload failed:', error);
        return null;
    }
};

const uploadAllPhotos = async (formData, rapportId) => {
    const categories = ['photosGenerales', 'photosAvant', 'photosApres', 'photosProblemes'];
    const categoryMap = {
        photosGenerales: 'GENERAL',
        photosAvant: 'AVANT',
        photosApres: 'APRES',
        photosProblemes: 'PROBLEMES'
    };

    const uploadedPhotos = [];

    for (const category of categories) {
        const photos = formData[category] || [];
        for (const photo of photos) {
            const result = await uploadPhotoToStorage(photo, rapportId, categoryMap[category]);
            if (result) {
                uploadedPhotos.push({
                    rapport_id: rapportId,
                    ...result
                });
            }
        }
    }

    // Insert photo records into photos table
    if (uploadedPhotos.length > 0) {
        const { error } = await supabase
            .from('photos')
            .insert(uploadedPhotos);

        if (error) {
            console.error('Failed to save photo records:', error);
        }
    }

    return uploadedPhotos;
};
```

### Step 2: Modify submitRapport Function

Find the `submitRapport` function (around line ~320) and modify it to:

1. First insert the rapport to get the ID
2. Then upload photos with that rapport ID
3. Update total_photos count

```javascript
// In submitRapport, AFTER successful insert:
const rapportId = data[0].id;

// Upload photos to storage
const uploadedPhotos = await uploadAllPhotos(formData, rapportId);
console.log(`Uploaded ${uploadedPhotos.length} photos to storage`);
```

### Step 3: Supabase Setup Required

Run these in Supabase SQL Editor:

```sql
-- Create photos table if not exists
CREATE TABLE IF NOT EXISTS photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    geolocation JSONB,
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policies for photos table
CREATE POLICY "Allow anonymous insert" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read" ON photos FOR SELECT TO public USING (true);

-- Storage bucket policies (run in Storage section)
-- Bucket name: photos (public)
```

In Supabase Dashboard > Storage:
1. Create bucket named `photos`
2. Make it public
3. Add RLS policies for anonymous upload and public read

---

## How to Verify Success

1. **Local Test:**
   ```bash
   npm run dev
   # Open http://localhost:8002
   # Fill form, add photos, submit
   ```

2. **Check Supabase Storage:**
   - Go to https://supabase.com/dashboard/project/iawsshgkogntmdzrfjyw/storage/buckets
   - Navigate to `photos` bucket
   - Verify folders created: `{rapport_id}/GENERAL/`, etc.

3. **Check photos table:**
   - Go to Table Editor > photos
   - Verify records with URLs and geolocation

4. **Dashboard Verification:**
   - Open dashboard, click on a report
   - Photos should load from Storage URLs

---

## Code Patterns to Follow

**Array safety (CRITICAL - recent bugs):**
```javascript
[...(array || [])]
array?.map(item => ...)
(array || []).forEach(...)
```

**Button events (CRITICAL):**
```javascript
<button type="button" onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    // handler
}}>
```

**Supabase calls:**
```javascript
const { data, error } = await supabase
    .from('table')
    .select('*');

if (error) {
    console.error('Failed:', error);
    return;
}
```

---

## DO NOT

- Change architecture (keep CDN/Babel approach)
- Add build tools (no Vite, webpack)
- Remove null safety checks
- Change button types from "button"
- Touch unrelated code

---

## Key File Locations

| File | Purpose |
|------|---------|
| `index.html` | Main app (~1550 lines of React) |
| `dashboard-a2c15af64b97e73f.html` | Admin dashboard |
| `netlify/functions/claude-vision.js` | Claude API proxy |
| `claude-progress.txt` | Current task progress |
| `.claude/commands/` | Slash commands for Claude Code |

---

## Contact

**Owner:** Francis Végiard
**Company:** DR Électrique
**Email:** fvegiard@outlook.com
