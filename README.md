# DR Électrique - Rapport Journalier

Système de rapports journaliers pour chantiers électriques.

## URLs Netlify

| Type | URL |
|------|-----|
| **Employés** | `https://dr-electrique-rapport.netlify.app` |
| **Admin** | `https://dr-electrique-rapport.netlify.app/dashboard-a2c15af64b97e73f.html` |

## Features

### Formulaire Employés (`index.html`)
- Time picker heures début/fin avec flèches
- **Claude Vision AI** pour scanner matériaux
- Photos avec géolocalisation GPS automatique
- Ordres de travail avec flag EXTRA
- Sync Supabase

### Dashboard Admin (secret URL)
- **Realtime updates** via Supabase subscription
- Rapports manquants par contremaître
- Extras non facturés
- Vue par projet
- Galerie photos

## Stack
- React 18 + Tailwind CSS
- Supabase (PostgreSQL + Realtime)
- Claude Vision API (material detection)
- Netlify (hosting)

## Supabase Config
- Project: `iawsshgkogntmdzrfjyw`
- Tables: `rapports`, `photos`

---
*L'Alliance Industrielle - Groupe DR Électrique Inc.*
