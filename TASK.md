# DR Électrique - Rapport Journalier

> **Complete AI Context Document** - Any AI can continue development using this file

**Last Updated:** 2026-01-20
**Status:** Production (with photo persistence pending)

---

## Quick Start for AI Agents

```bash
# 1. Clone and install
git clone https://github.com/[owner]/dr-electrique-rapport.git
cd dr-electrique-rapport
npm install

# 2. Start local server
npm run dev  # Opens http://localhost:8002

# 3. Key files to read first
# - index.html (main app, ~2000 lines of React)
# - scripts/fix-photos.js (photo upload implementation)
```

---

## Project Overview

**Daily report system** for DR Électrique electrical contractors. Field employees submit reports with photos, GPS data, labor hours, materials used. Management views via real-time dashboard.

| Resource | URL |
|----------|-----|
| Production | https://dr-electrique-rapport.netlify.app |
| Dashboard | https://dr-electrique-rapport.netlify.app/dashboard-a2c15af64b97e73f.html |
| Supabase | https://supabase.com/dashboard/project/iawsshgkogntmdzrfjyw |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Babel | In-browser transpile, no build step |
| Styling | Tailwind CSS | CDN loaded |
| Backend | Supabase | PostgreSQL + Realtime + Storage |
| AI | Claude Vision | Material detection from photos |
| Hosting | Netlify | Static + serverless functions |
| CI/CD | GitHub Actions | Auto-deploy on push to main |

### Why No Build System?
The app uses CDN-loaded React with Babel transpilation. This is intentional for:
- Zero build complexity
- Direct browser debugging
- Simple deployment (just HTML files)
- **DO NOT migrate to Vite/webpack**

---

## Project Structure

```
dr-electrique-rapport/
├── index.html                       # Main form (React SPA, ~2000 lines)
├── dashboard-a2c15af64b97e73f.html  # Admin dashboard (obfuscated URL)
├── package.json                     # npm dependencies
├── netlify.toml                     # Netlify config
├── netlify/functions/
│   └── claude-vision.js             # Claude API proxy (secure key)
├── scripts/
│   ├── fix-photos.js                # Photo upload implementation
│   └── monitor.ps1                  # Windows monitoring script
├── .github/workflows/
│   ├── ci.yml                       # Main CI/CD pipeline
│   └── photo-upload-fix.yml         # Photo-specific tests
├── TASK.md                          # This file (AI context)
├── README.md                        # User setup guide
└── SETUP.md                         # Environment setup
```

---

## Current Status

### Working Features
| Feature | Status | Location |
|---------|--------|----------|
| Form submission | OK | `submitRapport()` in index.html:320 |
| Supabase database | OK | `rapports` table |
| GPS geolocation | OK | `PhotoUploadGPS` component |
| Claude Vision scan | OK | `netlify/functions/claude-vision.js` |
| Dashboard realtime | OK | Supabase subscriptions |
| Photo capture UI | OK | Grid display, delete buttons |

### Recent Bug Fixes (Last 5 commits)
| Commit | Bug | Fix |
|--------|-----|-----|
| 40f30f6 | Z-index blocking clicks | `pointer-events-none` on container |
| 40f30f6 | Spread on undefined | `[...(arr \|\| [])]` pattern |
| b1a1c0a | photos.map() crash | Null checks before .map() |
| a786fb8 | Photos disappearing | Added `type="button"` to all buttons |
| 07cd190 | PhotoUploadGPS buttons | Added type="button" |

### Pending: Photo Persistence
Photos are captured but stored only in memory (base64). They're lost on page refresh.

**Solution:** Upload to Supabase Storage (see scripts/fix-photos.js)

---

## Supabase Configuration

**Project ID:** `iawsshgkogntmdzrfjyw`

### Tables

**`rapports`** - Daily reports
```sql
-- Key columns
id UUID PRIMARY KEY,
date DATE,
redacteur TEXT,                  -- Employee name
projet TEXT,                     -- Project code
projet_nom TEXT,                 -- Project name
adresse TEXT,                    -- Site address
meteo TEXT,                      -- Weather
temperature INTEGER,
main_oeuvre JSONB,               -- Labor: [{nom, heures, taux}]
materiaux JSONB,                 -- Materials: [{description, quantite, unite}]
equipements JSONB,               -- Equipment: [{nom, heures}]
ordres_travail JSONB,            -- Work orders
reunions JSONB,                  -- Meetings
notes_generales TEXT,
problemes_securite TEXT,
total_heures_mo DECIMAL,
total_photos INTEGER,
has_extras BOOLEAN,
total_extras DECIMAL
```

**`photos`** - Photo metadata (needs creation)
```sql
CREATE TABLE photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rapport_id UUID REFERENCES rapports(id),
    category TEXT NOT NULL,        -- GENERAL, AVANT, APRES, PROBLEMES
    url TEXT NOT NULL,             -- Supabase Storage public URL
    geolocation JSONB,             -- {latitude, longitude, accuracy}
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON photos
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read" ON photos
    FOR SELECT TO public USING (true);
```

### Storage Bucket

**Bucket:** `photos` (public, anonymous upload)

**RLS Policies:**
```sql
CREATE POLICY "Allow anonymous uploads" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'photos');
CREATE POLICY "Allow anonymous delete" ON storage.objects
    FOR DELETE TO anon USING (bucket_id = 'photos');
```

---

## Photo System

### Photo Categories (4 sections in form)
1. `photosGenerales` - General site photos
2. `photosAvant` - Before photos
3. `photosApres` - After photos
4. `photosProblemes` - Problem/safety photos

### Photo Object Structure
```javascript
{
  id: "photo_1705678901234",           // Unique ID
  data: "data:image/jpeg;base64,...",  // Base64 image data
  geolocation: {
    enabled: true,
    latitude: 45.5017,
    longitude: -73.5673,
    accuracy: 10.5
  },
  timestamp: "2026-01-20T10:30:00.000Z"
}
```

### Current Flow (Broken)
```
Capture → Base64 in memory → Display in grid → LOST on submit
```

### Target Flow (To Implement)
```
Capture → Base64 → Upload to Storage → Save URL to photos table → Persist
```

---

## Key Code Locations

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `submitRapport()` | index.html | ~320 | Main form submission |
| `PhotoUploadGPS` | index.html | ~562 | Photo capture component |
| `calculateHours()` | index.html | ~250 | Labor time calculation |
| `sendEmailBackup()` | index.html | ~400 | Fallback if Supabase fails |

---

## Environment Variables

### GitHub Secrets (for CI/CD)
```
SUPABASE_URL=https://iawsshgkogntmdzrfjyw.supabase.co
SUPABASE_ANON_KEY=eyJ...
NETLIFY_AUTH_TOKEN=nfp_...
```

### Netlify Environment
```
ANTHROPIC_API_KEY=sk-ant-...  # For Claude Vision
```

---

## Development

### Local Server
```bash
npm run dev           # Python HTTP server on port 8002
# or
python -m http.server 8002
```

### Testing Supabase Connection
```bash
curl -s "https://iawsshgkogntmdzrfjyw.supabase.co/rest/v1/rapports?select=id&limit=1" \
  -H "apikey: YOUR_ANON_KEY"
```

### Browser Console Tests
```javascript
// Check Supabase client
window.supabaseClient

// Test photo capture
window.testAddPhoto('photosGenerales')
```

---

## CI/CD Pipeline

**Trigger:** Push to `main` branch

**Jobs:**
1. `test` - Supabase connection + HTML validation
2. `deploy` - Netlify production deploy

**Workflows:**
- `.github/workflows/ci.yml` - Main pipeline
- `.github/workflows/photo-upload-fix.yml` - Photo-specific tests

---

## For AI Agents: Implementation Guide

### Priority Task: Photo Upload

The main task is implementing photo persistence. See `scripts/fix-photos.js` for the complete implementation.

**Integration steps:**
1. Add the functions from fix-photos.js to index.html
2. Modify submitRapport() to call uploadAllPhotos()
3. Update dashboard to fetch and display photos

### Code Patterns to Follow

**Supabase calls:**
```javascript
const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('column', value);

if (error) {
    console.error('Operation failed:', error);
    return;
}
```

**Array safety (critical - recent bugs):**
```javascript
// Always use this pattern:
[...(array || [])]
array?.map(item => ...)
(array || []).forEach(...)
```

**Button events:**
```javascript
// ALL buttons must have type="button" to prevent form submission
<button type="button" onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    // handler
}}>
```

### DO NOT
- Change architecture (keep CDN/Babel approach)
- Add build tools (no Vite, webpack, etc.)
- Touch unrelated code
- Remove any null safety checks
- Change button types from "button"

### DO
- Keep backwards compatibility
- Add error handling
- Use existing patterns
- Test on mobile (primary use case)

---

## Troubleshooting

### "Photos disappear when I click"
**Cause:** Button without `type="button"` triggers form submit
**Fix:** Add `type="button"` to all interactive buttons

### "Cannot read property 'map' of undefined"
**Cause:** Array state is undefined
**Fix:** Use `[...(arr || [])]` and `arr?.map()` patterns

### "Supabase connection failed"
**Check:**
1. Environment variables set correctly
2. RLS policies allow the operation
3. Network/CORS issues

### "Photos not uploading"
**Check:**
1. Storage bucket exists
2. RLS policies on storage.objects
3. photos table exists with correct schema

---

## Contact

**Project Owner:** Francis Végiard
**Company:** DR Électrique
**Email:** fvegiard@outlook.com
