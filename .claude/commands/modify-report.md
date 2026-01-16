# Modification d'un Rapport Journalier

Modifie un rapport journalier existant dans Supabase.

## Arguments
- `$REPORT_ID` - UUID du rapport a modifier (requis)
- `$FIELD` - Champ a modifier (optionnel)
- `$VALUE` - Nouvelle valeur (optionnel)

## Instructions

Tu es charge de modifier un rapport journalier dans la base de donnees Supabase de DR Electrique.

### 1. Informations de connexion Supabase

- **URL:** `https://iawsshgkogntmdzrfjyw.supabase.co`
- **Table:** `rapports`

### 2. Structure de la table `rapports`

| Colonne | Type | Modifiable |
|---------|------|------------|
| `id` | UUID | Non |
| `created_at` | timestamp | Non |
| `date` | date | Oui |
| `redacteur` | text | Oui |
| `projet` | text | Oui |
| `projet_nom` | text | Oui |
| `adresse` | text | Oui |
| `meteo` | text | Oui |
| `temperature` | integer | Oui |
| `main_oeuvre` | JSONB | Oui |
| `materiaux` | JSONB | Oui |
| `equipements` | JSONB | Oui |
| `soustraitants` | JSONB | Oui |
| `ordres_travail` | JSONB | Oui |
| `reunions` | JSONB/text | Oui |
| `notes_generales` | text | Oui |
| `problemes_securite` | text | Oui |
| `total_heures_mo` | decimal | Oui (recalculer) |
| `total_photos` | integer | Non (auto) |
| `has_extras` | boolean | Oui (recalculer) |
| `total_extras` | decimal | Oui (recalculer) |
| `extras_factures` | boolean | Oui |

### 3. Types de modifications courantes

#### 3.1 Modifier les heures de main d'oeuvre

**Structure attendue:**
```json
[
  {
    "id": "mo-1",
    "employe": "Nom Employe",
    "heureDebut": "06:00",
    "heureFin": "14:15",
    "description": "Description"
  }
]
```

**Exemple SQL:**
```sql
-- Modifier l'heure de fin du premier employe
UPDATE rapports
SET main_oeuvre = jsonb_set(
  main_oeuvre,
  '{0,heureFin}',
  '"15:30"'
)
WHERE id = '$REPORT_ID';

-- Recalculer le total des heures
-- Formule: SUM((heureFin - heureDebut) en heures decimales)
```

#### 3.2 Ajouter un materiau

```sql
UPDATE rapports
SET materiaux = materiaux || '[{
  "id": "mat-new-1",
  "item": "Cable 14/2",
  "quantite": 100,
  "unite": "pieds",
  "detectedByAI": false,
  "confidence": null
}]'::jsonb
WHERE id = '$REPORT_ID';
```

#### 3.3 Modifier un ordre de travail

**Structure:**
```json
{
  "id": "ot-1",
  "description": "Description du travail",
  "isExtra": true,
  "montantExtra": 500.00,
  "status": "en_cours|complete|bloque"
}
```

**Exemple - Changer le status:**
```sql
UPDATE rapports
SET ordres_travail = jsonb_set(
  ordres_travail,
  '{0,status}',
  '"complete"'
)
WHERE id = '$REPORT_ID';
```

#### 3.4 Marquer les extras comme factures

```sql
UPDATE rapports
SET extras_factures = true
WHERE id = '$REPORT_ID';
```

### 4. Validation apres modification

Apres toute modification, verifie:

1. **Coherence des heures:**
   - `total_heures_mo` = somme des (heureFin - heureDebut) pour chaque employe

2. **Coherence des extras:**
   - `has_extras` = true si au moins un ordre de travail a `isExtra: true`
   - `total_extras` = somme des `montantExtra` pour les ordres avec `isExtra: true`

3. **Validation JSONB:**
   - Tous les tableaux JSONB doivent etre des arrays valides

### 5. Requetes de verification

```sql
-- Verifier le rapport modifie
SELECT * FROM rapports WHERE id = '$REPORT_ID';

-- Verifier les totaux
SELECT
  id,
  total_heures_mo,
  has_extras,
  total_extras,
  (SELECT COUNT(*) FROM jsonb_array_elements(main_oeuvre)) as nb_employes,
  (SELECT COUNT(*) FROM jsonb_array_elements(materiaux)) as nb_materiaux,
  (SELECT COUNT(*) FROM jsonb_array_elements(ordres_travail) WHERE value->>'isExtra' = 'true') as nb_extras
FROM rapports
WHERE id = '$REPORT_ID';
```

### 6. Annuler une modification (si necessaire)

Si tu dois annuler, tu peux utiliser Supabase Dashboard:
1. Aller dans Table Editor > rapports
2. Trouver le rapport par ID
3. Cliquer sur "History" pour voir les versions precedentes
4. Restaurer si disponible

### 7. Documentation

Refere-toi a la documentation complete:
`docs/DAILY_REPORT_VERIFICATION.md`

### 8. Reponse attendue

Apres modification, fournis:
- Confirmation de la modification
- Anciennes valeurs vs nouvelles valeurs
- Validation des totaux recalcules
