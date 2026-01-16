# Verification des Rapports Journaliers

Effectue une verification complete des rapports journaliers pour la date specifiee.

## Arguments
- `$DATE` - Date a verifier (format: YYYY-MM-DD, defaut: aujourd'hui)

## Instructions

Tu es charge de verifier les rapports journaliers des employes de DR Electrique. Voici les etapes a suivre:

### 1. Lire le code source pour comprendre la structure

Lis ces fichiers pour comprendre le systeme:
- `index.html` - Formulaire de rapport (lignes 835-1402 pour RapportForm)
- `dashboard-a2c15af64b97e73f.html` - Dashboard admin

### 2. Verifier la configuration Supabase

Le projet utilise Supabase avec:
- **URL:** `https://iawsshgkogntmdzrfjyw.supabase.co`
- **Table principale:** `rapports`
- **Table photos:** `photos`

### 3. Verifier les rapports manquants

Les contremaitres qui doivent soumettre un rapport quotidien sont definis dans `EMPLOYES`:
- Maxime Robert
- Jean-Pierre Lavoie
- Marc Tremblay
- Luc Bergeron
- Paul Gagnon
- Pierre Bouchard
- Simon Cote
- Francois Morin
- Michel Roy
- Eric Leblanc

Compare cette liste avec les `redacteur` dans les rapports de la date $DATE.

### 4. Verifier le contenu des rapports

Pour chaque rapport, verifie:

#### 4.1 Donnees obligatoires
- [ ] `redacteur` - Nom de l'employe present
- [ ] `projet` - ID projet valide (PRJ-001 a PRJ-005)
- [ ] `date` - Date correcte
- [ ] `adresse` - Adresse du chantier remplie

#### 4.2 Main d'oeuvre (JSONB)
```json
{
  "id": "string",
  "employe": "string (requis)",
  "heureDebut": "HH:MM",
  "heureFin": "HH:MM",
  "description": "string (optionnel)"
}
```
- Verifier que les heures sont coherentes (fin > debut)
- Verifier le calcul de `total_heures_mo`

#### 4.3 Materiaux (JSONB)
```json
{
  "id": "string",
  "item": "string",
  "quantite": "number",
  "unite": "string",
  "detectedByAI": "boolean",
  "confidence": "number|null"
}
```

#### 4.4 Ordres de travail (JSONB)
```json
{
  "id": "string",
  "description": "string",
  "isExtra": "boolean",
  "montantExtra": "number|null",
  "status": "en_cours|complete|bloque"
}
```
- Si `isExtra: true`, verifier que `montantExtra` est present
- Verifier la coherence de `has_extras` et `total_extras`

### 5. Verifier les photos

Pour chaque rapport, verifier dans la table `photos`:
- Nombre de photos correspond a `total_photos`
- Categories utilisees: GENERAL, AVANT, APRES, PROBLEME
- Presence de coordonnees GPS si applicable

### 6. Generer un rapport de verification

Produis un rapport structuree avec:

```markdown
## Rapport de Verification - $DATE

### Rapports Soumis
- Total: X rapports
- Liste: [noms des redacteurs]

### Rapports Manquants
- Liste: [noms des contremaitres manquants]

### Alertes
- [Liste des problemes detectes]

### Extras Non Factures
- Total: $X.XX
- Details: [liste des extras]

### Actions Requises
- [Liste des actions a prendre]
```

### 7. Requetes SQL utiles

```sql
-- Rapports de la date
SELECT * FROM rapports WHERE date = '$DATE';

-- Extras non factures
SELECT id, projet_nom, redacteur, total_extras
FROM rapports
WHERE has_extras = true AND extras_factures = false AND date = '$DATE';

-- Photos par rapport
SELECT r.id, r.redacteur, COUNT(p.id) as nb_photos
FROM rapports r
LEFT JOIN photos p ON p.rapport_id = r.id
WHERE r.date = '$DATE'
GROUP BY r.id, r.redacteur;
```

### 8. Documentation

Refere-toi a la documentation complete:
`docs/DAILY_REPORT_VERIFICATION.md`
