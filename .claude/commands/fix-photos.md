# Fix Photo Upload - DR Électrique

Implement photo upload to Supabase Storage in index.html.

## The Problem

Photos are captured with GPS and displayed in the form correctly. But when the form is submitted, photos are NOT saved to Supabase Storage - they're lost.

## The Solution

1. Add `uploadPhotoToStorage()` function to convert base64 to blob and upload
2. Add `uploadAllPhotos()` function to upload all photo categories
3. Modify `submitRapport()` to call these after inserting the rapport

## Step-by-Step Implementation

### Step 1: Check Supabase Prerequisites

Before coding, verify in Supabase Dashboard:

**Storage Bucket:**
- Go to Storage > Create new bucket
- Name: `photos`
- Public: Yes
- Add policy: Allow anonymous uploads

**Photos Table:**
```sql
CREATE TABLE IF NOT EXISTS photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    url TEXT NOT NULL,
    geolocation JSONB,
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read" ON photos FOR SELECT TO public USING (true);
```

### Step 2: Add Photo Upload Functions

In `index.html`, after the `sendEmailBackup` function (~line 226), add:

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

### Step 3: Modify submitRapport Function

Find `submitRapport` function. After the successful insert where you get `data`, add:

```javascript
// After: const { data, error } = await supabase.from('rapports').insert(...)
// And after checking for errors

if (data && data[0]) {
    const rapportId = data[0].id;

    // Upload photos to Supabase Storage
    const photoCount = (formData.photosGenerales?.length || 0) +
                       (formData.photosAvant?.length || 0) +
                       (formData.photosApres?.length || 0) +
                       (formData.photosProblemes?.length || 0);

    if (photoCount > 0) {
        console.log(`Uploading ${photoCount} photos...`);
        const uploadedPhotos = await uploadAllPhotos(formData, rapportId);
        console.log(`Successfully uploaded ${uploadedPhotos.length} photos`);
    }
}
```

### Step 4: Test

1. Run `npm run dev`
2. Open http://localhost:8002
3. Fill form, add at least one photo
4. Submit the form
5. Check browser console for upload logs
6. Go to Supabase Dashboard > Storage > photos bucket
7. Verify folder structure: `{rapport-id}/GENERAL/`
8. Go to Table Editor > photos
9. Verify records exist with URLs

### Step 5: Update Progress

After successful implementation, update `claude-progress.txt`:
- Mark steps as [x] completed
- Update status to COMPLETED
- Add any notes

### Step 6: Commit

```bash
git add index.html claude-progress.txt
git commit -m "feat(photos): implement upload to Supabase Storage

- Add uploadPhotoToStorage() for base64 to blob conversion
- Add uploadAllPhotos() to process all categories
- Integrate with submitRapport() function
- Photos now persist in Supabase Storage bucket"
git push
```

## Verification Checklist

- [ ] Supabase Storage bucket 'photos' exists and is public
- [ ] Photos table created with correct schema
- [ ] uploadPhotoToStorage function added
- [ ] uploadAllPhotos function added
- [ ] submitRapport modified to call upload functions
- [ ] Test submission with photos works
- [ ] Photos visible in Supabase Storage
- [ ] Photo records in photos table
- [ ] claude-progress.txt updated
- [ ] Changes committed and pushed
