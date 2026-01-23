# 🧠 Claude Project Memory

> Persistent knowledge about this project. Never ask Francis twice.
> Update this when discovering new facts.

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | DR Électrique - Rapport Journalier |
| **Owner** | Francis Végiard (fvegiard) |
| **Company** | DR Électrique (L'Alliance Industrielle) |
| **Purpose** | Daily field reports for electrical workers |
| **Live URL** | https://dr-electrique-rapport.netlify.app |
| **Dashboard** | https://dr-electrique-rapport.netlify.app/dashboard.html |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Netlify (auto-deploy on push) |
| Repo | github.com/fvegiard/dr-electrique-rapport |

## Credentials & IDs

```yaml
# Supabase
Project ID: iawsshgkogntmdzrfjyw
Project URL: https://iawsshgkogntmdzrfjyw.supabase.co
Storage Bucket: rapport-photos

# Netlify
Site ID: bc99f38e-70f5-4eb9-8df6-4900c66fae04
Site Name: dr-electrique-rapport
Team: fvegiard

# GitHub
Repo: fvegiard/dr-electrique-rapport
Branch: main (production)
```

## Database Schema

### Table: `rapports`
```sql
id              UUID PRIMARY KEY
date            DATE
projet          TEXT
redacteur       TEXT (employee name)
meteo           TEXT
temperature     INTEGER (nullable)
heure_debut     TIME
heure_fin       TIME
total_heures    DECIMAL
notes           TEXT
securite        TEXT
created_at      TIMESTAMPTZ
-- Photos now in separate table (not JSONB here)
```

### Table: `photos`
```sql
id              UUID PRIMARY KEY
rapport_id      UUID REFERENCES rapports(id)
category        TEXT ('generales', 'avant', 'apres', 'travaux')
url             TEXT (storageUrl or base64)
latitude        DECIMAL (nullable)
longitude       DECIMAL (nullable)
gps_accuracy    DECIMAL (nullable)
created_at      TIMESTAMPTZ
```

### Table: `employes`
```sql
id              UUID PRIMARY KEY
nom             TEXT
actif           BOOLEAN
```

### Table: `projets`
```sql
id              TEXT PRIMARY KEY (e.g., 'PRJ-001')
nom             TEXT
adresse         TEXT
actif           BOOLEAN
```

## Active Projects (Chantiers)

| Code | Name | Address |
|------|------|---------|
| PRJ-001 | Alexis Nihon Phase 2 | 1500 Atwater, Montréal |
| PRJ-002 | Fairview Pointe-Claire | Pointe-Claire |
| PRJ-003 | Tour des Canadiens 4 | Downtown Montreal |
| PRJ-004 | Kahnawake Cultural Art Center | Kahnawake |
| PRJ-005 | Data Center | TBD |

## Key Employees

| Name | Role | Default |
|------|------|---------|
| Maxime Robert | Contremaître | ✅ Yes |
| Francis Végiard | Owner/Admin | |

## Architecture Decisions

### ADR-001: Photos in Separate Table
- **Date:** 2026-01-23
- **Decision:** Store photos in `photos` table with `rapport_id` FK
- **Reason:** JSONB arrays were causing sync issues, separate table allows better querying
- **Consequences:** Need JOIN for dashboard display

### ADR-002: Photo URL Fallback Chain
- **Date:** 2026-01-23
- **Decision:** Priority order: `storageUrl > preview > data`
- **Reason:** Storage upload can fail silently, need fallbacks
- **Consequences:** Photos never lost, may use base64 if Storage fails

### ADR-003: Standalone HTML Form
- **Date:** 2026-01-23
- **Decision:** Keep index.html as standalone (not React build)
- **Reason:** Simpler for field workers, works offline
- **Consequences:** Two codebases to maintain (HTML + React dashboard)

## Bug History

| Date | Issue | Root Cause | Fix | Commit |
|------|-------|------------|-----|--------|
| 2026-01-23 | Photos not saved to DB | Missing `preview` in fallback | Add to chain | `de99618` |
| 2026-01-23 | Photos not in payload | Filter excluded photos without storageUrl | Add `p.data` check | `de99618` |
| 2026-01-19 | `photos.map is not a function` | `photos` was undefined | `Array.isArray()` check | `b1a1c0a` |
| 2026-01-19 | Click photo = form submit | Button missing `type="button"` | Add attribute | `f2fab9e` |
| 2026-01-16 | Wrong default hours | Hardcoded values | Change to 06:00-14:15 | `ffa6972` |

## Files to Know

```
src/
├── lib/
│   └── photoTransaction.ts    # ⚠️ Photo upload logic (bug-prone)
├── components/
│   └── RapportForm.tsx        # Main form component
├── types/
│   └── index.ts               # TypeScript interfaces
└── utils/
    └── photoUtils.ts          # Photo compression/processing

index.html                      # Standalone form (production)
dashboard.html                  # Admin dashboard
```

## Environment Variables (Netlify)

```bash
VITE_SUPABASE_URL=https://iawsshgkogntmdzrfjyw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (check Netlify dashboard)
```

## Common Issues & Solutions

### "Photos don't appear in dashboard"
1. Check `photos` table has entries
2. Verify `rapport_id` matches
3. Check URL is not empty string

### "Form won't submit"
1. Check Supabase connection
2. Verify API key in env vars
3. Check browser console for errors

### "Blank screen on load"
1. Missing Supabase credentials
2. Check `index.html` has fallback values
3. Verify Netlify env vars

---
*This file is the source of truth. Update when learning new facts.*
