# DR Électrique - Rapport Journalier

Système de rapports journaliers pour chantiers électriques.

## URLs Netlify

| Type         | URL                                                                         |
| ------------ | --------------------------------------------------------------------------- |
| **Employés** | `https://dr-electrique-rapport.netlify.app`                                 |
| **Admin**    | `https://dr-electrique-rapport.netlify.app/dashboard-a2c15af64b97e73f.html` |

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
- Netlify (hosting + serverless functions)

## Environment Variables (Netlify)

Set these in Netlify Dashboard > Site Settings > Environment Variables:

| Variable            | Description                              |
| ------------------- | ---------------------------------------- |
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude Vision |

## Local Development

```bash
# Install dependencies (optional, for Netlify CLI)
npm install

# Start local server
npm run dev
# or
python -m http.server 8002
```

## Deployment

```bash
# Deploy to Netlify
npm run deploy
```

## Supabase Config

- Project: `iawsshgkogntmdzrfjyw`
- Tables: `rapports`, `photos`

## Security Notes

- API keys are stored in Netlify environment variables (not in code)
- Dashboard URL is obfuscated for basic access control
- All API calls go through Netlify serverless functions

---

_L'Alliance Industrielle - Groupe DR Électrique Inc._
