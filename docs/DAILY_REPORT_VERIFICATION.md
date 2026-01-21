# Procedure de Verification des Rapports Journaliers

## Vue d'ensemble

Ce document decrit la procedure complete pour verifier et modifier les rapports journaliers des employes via le dashboard et Supabase.

---

## 1. Acces au Dashboard

### URL du Dashboard
```
https://[votre-domaine]/dashboard-a2c15af64b97e73f.html
```

### Navigation
Le dashboard contient 6 onglets principaux:
- **Dashboard** - Vue d'ensemble quotidienne
- **Rapports Journaliers** - Liste complete des rapports
- **Ordres de Travail** - Suivi des travaux
- **Reunions** - Historique des reunions
- **Photos** - Galerie avec GPS
- **Extras a Facturer** - Travaux supplementaires

---

## 2. Verification Quotidienne

### 2.1 Verifier les Rapports Manquants

**Emplacement:** Dashboard > Vue d'ensemble

1. Acceder a l'onglet "Dashboard"
2. Consulter la section **"Rapports Manquants"** (alerte rouge)
3. La liste affiche les contremaitres qui n'ont pas soumis leur rapport

**Logique de detection:**
```javascript
// Les contremaitres sont filtres de la liste EMPLOYES
const contreMaitres = EMPLOYES.filter(e => e.role === "Contremaitre");
const submittedBy = todayRapports.map(r => r.redacteur);
const missing = contreMaitres.filter(cm => !submittedBy.includes(cm.nom));
```

### 2.2 Verifier le Contenu des Rapports

**Emplacement:** Dashboard > Rapports Journaliers

1. Selectionner la date souhaitee
2. Filtrer par projet si necessaire
3. Cliquer sur un rapport pour le developper
4. Verifier les elements suivants:

| Element | Verification |
|---------|-------------|
| Projet | Correspond au chantier assigne |
| Date | Date correcte |
| Meteo | Coherent avec la journee |
| Main d'oeuvre | Heures de debut/fin correctes |
| Materiaux | Quantites coherentes |
| Equipements | Heures d'utilisation |
| Ordres de travail | Status a jour |
| Photos | GPS active si requis |

### 2.3 Verifier les Extras

**Emplacement:** Dashboard > Extras a Facturer

1. Consulter le total des extras non factures
2. Pour chaque extra:
   - Verifier le montant
   - Verifier la description
   - Marquer comme "Facture" une fois traite

---

## 3. Verification dans Supabase

### 3.1 Acces a Supabase

1. Aller sur: https://supabase.com/dashboard
2. Se connecter avec les identifiants du projet
3. Projet: `iawsshgkogntmdzrfjyw`

### 3.2 Structure de la Table `rapports`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `created_at` | timestamp | Date/heure creation |
| `date` | date | Date du rapport |
| `redacteur` | text | Nom de l'employe |
| `projet` | text | ID du projet |
| `projet_nom` | text | Nom du projet |
| `adresse` | text | Adresse du chantier |
| `meteo` | text | Conditions meteo |
| `temperature` | integer | Temperature (C) |
| `main_oeuvre` | JSONB | Heures des employes |
| `materiaux` | JSONB | Materiaux utilises |
| `equipements` | JSONB | Equipements utilises |
| `soustraitants` | JSONB | Sous-traitants |
| `ordres_travail` | JSONB | Ordres de travail |
| `reunions` | JSONB/text | Reunions |
| `notes_generales` | text | Notes |
| `problemes_securite` | text | Problemes de securite |
| `total_heures_mo` | decimal | Total heures MO |
| `total_photos` | integer | Nombre de photos |
| `has_extras` | boolean | Contient des extras |
| `total_extras` | decimal | Montant total extras |
| `extras_factures` | boolean | Extras factures |

### 3.3 Requetes SQL Utiles

**Rapports du jour:**
```sql
SELECT * FROM rapports
WHERE date = CURRENT_DATE
ORDER BY created_at DESC;
```

**Rapports manquants (par projet):**
```sql
SELECT DISTINCT projet_nom, date
FROM rapports
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

**Extras non factures:**
```sql
SELECT id, projet_nom, redacteur, date, total_extras
FROM rapports
WHERE has_extras = true AND extras_factures = false;
```

**Heures totales par employe (semaine):**
```sql
SELECT redacteur, SUM(total_heures_mo) as heures_totales
FROM rapports
WHERE date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY redacteur
ORDER BY heures_totales DESC;
```

---

## 4. Modification des Rapports

### 4.1 Via Supabase (Methode Recommandee)

#### Modifier un rapport existant

1. Aller dans **Table Editor** > **rapports**
2. Trouver le rapport par ID ou filtrer par date/redacteur
3. Cliquer sur la ligne pour editer
4. Modifier les champs necessaires
5. Sauvegarder avec **Save**

#### Modifier les donnees JSONB (main_oeuvre, materiaux, etc.)

**Structure main_oeuvre:**
```json
[
  {
    "id": "mo-1",
    "employe": "Nom Employe",
    "heureDebut": "06:00",
    "heureFin": "14:15",
    "description": "Travaux effectues"
  }
]
```

**Structure materiaux:**
```json
[
  {
    "id": "mat-1",
    "item": "Cable 14/2",
    "quantite": 100,
    "unite": "pieds",
    "detectedByAI": false,
    "confidence": null
  }
]
```

**Structure ordres_travail:**
```json
[
  {
    "id": "ot-1",
    "description": "Description du travail",
    "isExtra": true,
    "montantExtra": 500.00,
    "status": "en_cours"
  }
]
```

#### Mise a jour SQL directe

**Modifier les heures d'un employe:**
```sql
UPDATE rapports
SET main_oeuvre = jsonb_set(
  main_oeuvre,
  '{0,heureFin}',
  '"15:30"'
)
WHERE id = 'uuid-du-rapport';
```

**Ajouter un materiau:**
```sql
UPDATE rapports
SET materiaux = materiaux || '[{"id":"mat-new","item":"Nouveau materiau","quantite":10,"unite":"unite"}]'::jsonb
WHERE id = 'uuid-du-rapport';
```

**Marquer extras comme factures:**
```sql
UPDATE rapports
SET extras_factures = true
WHERE id = 'uuid-du-rapport';
```

### 4.2 Via Dashboard (Limite)

Le dashboard permet uniquement:
- Marquer les extras comme factures (bouton "Marquer facture")

Pour d'autres modifications, utiliser Supabase directement.

---

## 5. Verification des Photos

### 5.1 Table `photos`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `rapport_id` | UUID | Reference au rapport |
| `url` | text | URL Supabase Storage |
| `category` | text | GENERAL, AVANT, APRES, PROBLEME |
| `latitude` | decimal | Coordonnee GPS |
| `longitude` | decimal | Coordonnee GPS |
| `created_at` | timestamp | Date/heure creation |

### 5.2 Verifier les Photos avec GPS

**Dans le dashboard:**
- Les photos avec GPS affichent un badge vert "GPS"
- Cliquer sur une photo pour voir les coordonnees

**Via SQL:**
```sql
SELECT p.*, r.projet_nom, r.date, r.redacteur
FROM photos p
JOIN rapports r ON p.rapport_id = r.id
WHERE p.latitude IS NOT NULL
ORDER BY p.created_at DESC;
```

---

## 6. Liste de Verification Quotidienne

### Matin (avant 9h)
- [ ] Consulter les rapports manquants de la veille
- [ ] Verifier les heures de debut des equipes

### Midi
- [ ] Verifier les rapports du matin
- [ ] Controler les extras declares

### Fin de journee (apres 16h)
- [ ] S'assurer que tous les contremaitres ont soumis
- [ ] Verifier les heures de fin
- [ ] Controler les materiaux declares
- [ ] Verifier les ordres de travail

### Hebdomadaire (Vendredi)
- [ ] Exporter les heures totales par employe
- [ ] Reviser tous les extras non factures
- [ ] Verifier la coherence des projets

---

## 7. Resolution de Problemes

### Rapport non visible dans le dashboard

1. Verifier dans Supabase si le rapport existe
2. Si absent, verifier le localStorage de l'employe (`dr_rapports_pending`)
3. Si present en localStorage, resoumettre manuellement

### Donnees corrompues (JSONB invalide)

```sql
-- Verifier la validite JSONB
SELECT id, main_oeuvre::text
FROM rapports
WHERE NOT (main_oeuvre IS NULL OR jsonb_typeof(main_oeuvre) = 'array');
```

### Photos manquantes

1. Verifier la table `photos` pour le `rapport_id`
2. Verifier le Supabase Storage bucket `photos`

---

## 8. Contacts & Support

- **Supabase Dashboard:** https://supabase.com/dashboard/project/iawsshgkogntmdzrfjyw
- **Documentation Supabase:** https://supabase.com/docs
- **Depot Git:** [URL du repository]

---

## Historique des modifications

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-16 | 1.0 | Creation initiale |
