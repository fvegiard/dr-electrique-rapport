# 📸 Photo Debug Command

Specialized debugging for photo upload issues.

## Trigger Phrases
- "photos marchent pas"
- "debug photos"
- "photos not working"
- "images perdues"

## Known Photo Architecture

```
User captures photo
       ↓
processPhoto() compresses
       ↓
uploadPhotoToStorage() → Supabase Storage bucket "rapport-photos"
       ↓
Returns { storageUrl, preview, data }
       ↓
Form submit → mapPhotos() filters and maps
       ↓
uploadPhotosWithRetry() → INSERT into photos table
```

## Common Failure Points

### 1. Storage Upload Fails
**Symptom:** `storageUrl` is undefined
**Check:**
```bash
# List recent storage objects
curl -s "$SUPABASE_URL/storage/v1/object/list/rapport-photos" \
  -H "apikey: $SUPABASE_KEY"
```
**Fix:** Fallback chain should catch this (storageUrl > preview > data)

### 2. Photos Filtered Out
**Symptom:** Photos in state but not in payload
**Check:** `src/lib/photoTransaction.ts` line ~39
**Fix:** Ensure filter includes `|| p.data`

### 3. Empty URLs Saved
**Symptom:** Rows in `photos` table with `url = ""`
**Check:**
```sql
SELECT id, url FROM photos WHERE url = '' OR url IS NULL;
```
**Fix:** Add validation before INSERT

### 4. Wrong rapport_id
**Symptom:** Photos exist but not linked to rapport
**Check:**
```sql
SELECT p.id, p.rapport_id, r.id as actual_rapport
FROM photos p
LEFT JOIN rapports r ON p.rapport_id = r.id
WHERE r.id IS NULL;
```

## Debug Queries

```sql
-- Recent photos with details
SELECT 
  p.id,
  p.category,
  p.rapport_id,
  LEFT(p.url, 50) as url_preview,
  p.created_at
FROM photos p
ORDER BY created_at DESC
LIMIT 10;

-- Photos per rapport
SELECT 
  r.id,
  r.date,
  r.redacteur,
  COUNT(p.id) as photo_count
FROM rapports r
LEFT JOIN photos p ON r.id = p.rapport_id
WHERE r.created_at > NOW() - INTERVAL '7 days'
GROUP BY r.id, r.date, r.redacteur
ORDER BY r.created_at DESC;

-- Storage vs DB comparison
-- (Run in Supabase dashboard)
SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'rapport-photos';
SELECT COUNT(*) FROM photos;
```

## Fix Priority Chain

```typescript
// CORRECT ORDER - never lose photos
url: photo.storageUrl || photo.preview || photo.data || ''

// Also in filter
.filter(p => p.storageUrl || p.preview || p.data)
```

## Test Procedure

1. Open form in incognito
2. Take 2 test photos
3. Open browser DevTools → Network tab
4. Submit form
5. Check:
   - Network request payload (photos included?)
   - Response (success?)
   - Supabase dashboard (rows created?)

## Auto-Fix Script

```bash
# Check and fix photoTransaction.ts
grep -n "storageUrl.*data" src/lib/photoTransaction.ts

# If missing preview, apply fix:
sed -i 's/photo\.storageUrl || photo\.data/photo.storageUrl || photo.preview || photo.data/g' \
  src/lib/photoTransaction.ts
```
