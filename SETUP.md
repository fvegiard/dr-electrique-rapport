# DR Électrique - Rapport Journalier

Système de rapports journaliers pour chantiers électriques avec Supabase et Claude Vision AI.

## 🚀 Quick Start

### Installation
```bash
# Windows
setup.bat

# macOS/Linux
bash setup.sh
```

### Development
```bash
npm run dev
# Open http://localhost:8002
```

### Production Deployment
```bash
npm run deploy
```

## 📋 Features

### Employee Report Form (`index.html`)
- ✅ Time picker with arrow controls
- ✅ Claude Vision AI for material detection
- ✅ GPS geolocation on photos
- ✅ Work order tracking with EXTRA flag
- ✅ Offline support with localStorage fallback
- ✅ Real-time Supabase sync

### Admin Dashboard (`dashboard-a2c15af64b97e73f.html`)
- ✅ Real-time updates via Supabase subscription
- ✅ Missing reports alert by foreman
- ✅ Unbilled extras tracking
- ✅ Project filtering
- ✅ Photo gallery with GPS data
- ✅ Labour hours and equipment tracking

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Realtime) |
| **AI** | Claude Vision API (material detection) |
| **Hosting** | Netlify (static files) |
| **Dev Server** | Python HTTP server |

## 📦 Project Structure

```
dr-electrique-rapport/
├── index.html                          # Employee report form
├── dashboard-a2c15af64b97e73f.html     # Admin dashboard
├── package.json                        # Node.js dependencies
├── .env.example                        # Environment template
├── netlify.toml                        # Netlify config
├── .vscode/settings.json               # VS Code settings
├── setup.sh / setup.bat                # Setup scripts
└── README.md
```

## 🔐 Environment Configuration

Copy `.env.example` to `.env` and update:

```env
VITE_SUPABASE_URL=https://iawsshgkogntmdzrfjyw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
NETLIFY_SITE_ID=your-site-id
NETLIFY_AUTH_TOKEN=your-token
```

## 🌐 URLs

| Type | URL |
|------|-----|
| **Local Dev** | http://localhost:8002 |
| **Employee Form** | http://localhost:8002/ |
| **Admin Dashboard** | http://localhost:8002/dashboard-a2c15af64b97e73f.html |
| **Production** | https://dr-electrique-rapport.netlify.app |

## 📊 Database Schema

### `rapports` Table
```sql
- id (UUID primary key)
- created_at (timestamp)
- date (date)
- redacteur (text) - employee name
- projet (text) - project ID
- projet_nom (text) - project name
- adresse (text) - job site address
- meteo (text) - weather
- temperature (integer)
- main_oeuvre (JSONB) - labour hours per employee
- materiaux (JSONB) - materials used
- equipements (JSONB) - equipment used
- ordres_travail (JSONB) - work orders
- reunions (text/JSONB) - meetings
- notes_generales (text)
- problemes_securite (text) - safety issues
- total_heures_mo (decimal)
- total_photos (integer)
- has_extras (boolean)
- total_extras (decimal)
- extras_factures (boolean)
```

### `photos` Table
```sql
- id (UUID)
- rapport_id (UUID foreign key)
- url (text) - photo URL (Supabase storage)
- category (text) - GENERAL, AVANT, APRES, PROBLEME
- latitude (decimal)
- longitude (decimal)
- created_at (timestamp)
```

## 🎯 API Integration

### Supabase Client
```javascript
const SUPABASE_URL = 'https://iawsshgkogntmdzrfjyw.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Claude Vision API
Material detection using image analysis:
```javascript
fetch("https://api.anthropic.com/v1/messages", {
    headers: { "x-api-key": "sk-ant-api03-xxxxx" },
    body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        messages: [{
            role: "user",
            content: [{ type: "image", ... }, { type: "text", text: "Analyse..." }]
        }]
    })
})
```

## 🚀 Deployment to Netlify

### Method 1: GitHub Integration
1. Push to GitHub
2. Connect repo to Netlify
3. Auto-deploys on push

### Method 2: CLI Deployment
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Method 3: Drag & Drop
- Go to Netlify.com
- Drag folder to deploy zone

## 🧪 Testing

### Manual Testing
1. **Employee Form**: Fill out report and submit
2. **Dashboard**: Check if report appears in real-time
3. **Claude Vision**: Upload material photo for AI detection
4. **Offline Mode**: Disable network and submit - should save to localStorage

### API Testing
```bash
# Check Supabase connection
curl -X GET "https://iawsshgkogntmdzrfjyw.supabase.co/rest/v1/rapports?limit=5" \
  -H "apikey: your_anon_key" \
  -H "Authorization: Bearer your_anon_key"
```

## 📝 Requirements

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **Python** 3.8+ (for dev server)
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

## 🔒 Security

- ✅ CORS enabled for Supabase
- ✅ Geolocation only on user permission
- ✅ API keys stored in environment variables
- ✅ Row-level security on Supabase tables
- ✅ No sensitive data in localStorage (reports cleared after sync)

## 📞 Support

For issues or questions:
- Check browser console (F12) for errors
- Verify Supabase credentials
- Check Netlify deployment logs
- Review .env configuration

## 📄 License

MIT License - © L'Alliance Industrielle - Groupe DR Électrique Inc.

---

**Last Updated:** January 14, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
