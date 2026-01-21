# 📷 Corrections Photos - DR Électrique Rapport Journalier

## Problèmes identifiés et corrigés

| Problème | Solution | Impact |
|----------|----------|--------|
| Photos non compressées (3-5MB) | Compression Canvas (max 500KB) | ✅ -90% taille |
| Stockage base64 dans JSON | Supabase Storage + URLs | ✅ Payload léger |
| Pas de watermark | Timestamp + GPS automatique | ✅ Traçabilité |
| Timeouts Supabase | Photos compressées avant upload | ✅ Fiabilité |

## Fichiers modifiés

```
D:\GitHub\dr-electrique-rapport\
├── index.html                    # Composant PhotoUploadGPS modifié
├── photo-utils.js                # Nouvelles fonctions de compression (NEW)
├── supabase_storage_setup.sql    # Migration SQL pour Storage (NEW)
└── src/components/
    └── PhotoUploadFixed.js       # Version module ES6 (NEW)
```

## Configuration Supabase appliquée

### Bucket Storage
- **Nom:** `rapport-photos`
- **Public:** Oui (URLs accessibles)
- **Limite:** 5MB par fichier
- **Types:** JPEG, PNG, WebP

### Policies
- `Allow anonymous uploads` - Pour l'app mobile
- `Allow public read` - Pour afficher les photos

### Colonnes ajoutées à `rapports`
- `photos_generales` (JSONB)
- `photos_avant` (JSONB)
- `photos_apres` (JSONB)
- `photos_problemes` (JSONB)

## Comportement des photos

### Avant (problématique)
```
Photo 3.5MB → Base64 4.6MB → JSON payload → Timeout Supabase
```

### Après (corrigé)
```
Photo 3.5MB → Compression 350KB → Upload Storage → URL dans JSON → ✅
```

### Watermark automatique
Chaque photo inclut maintenant:
- Date et heure
- Logo DR Électrique
- Coordonnées GPS (si activé)

## Test

1. Ouvrir le rapport sur mobile
2. Prendre une photo
3. Vérifier dans la console:
   ```
   [Photo] Compressé: 3500KB → 350KB (-90%)
   [Photo] Uploaded to storage: PRJ-001/GENERALES/1234567890_photo.jpg
   ```
4. Vérifier l'icône ☁️ sur la miniature (= uploadé dans Storage)
5. Vérifier la taille affichée (ex: "350KB")

## Rollback

Si problème, revenir à l'ancienne version:
```bash
git checkout HEAD~1 -- index.html
```

## Best practices appliquées (Construction Photo Apps)

Sources: SiteCam, Raken, CompanyCam, GoAudits

1. ✅ Compression client-side avant upload
2. ✅ Timestamp automatique
3. ✅ Géolocalisation (GPS-stamp)
4. ✅ Watermark avec branding
5. ✅ Storage cloud (CDN)
6. ✅ Metadata (taille, dimensions)
7. ✅ Catégorisation (Avant/Après/Problèmes)
8. ⬜ Offline sync (à implémenter si besoin)

---
*Corrections appliquées le 2026-01-20 par Léna AI*
