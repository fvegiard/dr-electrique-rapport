# Analyse Deep Dive & Recherche: Système de Rapports Journaliers (2026)

## 1. Contexte & Objectifs
L'objectif est de moderniser le système de gestion de rapports journaliers pour **DR Électrique** en s'alignant sur les standards de l'industrie de 2026 et les exigences légales du Québec (CNESST/CCQ).

## 2. Synthèse des Recherches Internet

### 2.1 Standards de l'Industrie & Meilleures Pratiques (2026)
Le marché des logiciels de gestion pour entrepreneurs électriciens en 2026 met l'accent sur :
*   **Tableaux de Bord Temps Réel (Dashboards)** : Visualisation immédiate des KPIs.
    *   *KPIs Critiques* : Marge brute, Taux d'utilisation de la main-d'œuvre, Variance du temps de complétion (Planifié vs Réel).
    *   *Tendances* : Analyse des causes racines des retards (météo, attente de matériel).
*   **Documentation Visuelle** : Photos/Vidéos géolocalisées et horodatées obligatoires pour chaque rapport.
*   **Suivi Automatisé** : Météo automatique (via API), suivi des équipements, et heures travaillées.

### 2.2 Fonctionnalités "Must-Have" pour Applications Mobiles
*   **Mode Hors-Ligne (Offline First)** : Crucial pour les chantiers sans réseau (sous-sols, zones éloignées). Synchronisation auto au retour du signal.
*   **Scan & Voix** : Saisie vocale des notes et scan des matériaux par IA pour réduire le temps administratif des contremaîtres.
*   **Sécurité & Conformité** : Listes de contrôle de sécurité intégrées (TBT - Toolbox Talks).

### 2.3 Exigences Légales Québec (CNESST / CCQ)
Bien qu'il n'existe pas de "formulaire unique" imposé par la CNESST pour un rapport journalier universel, plusieurs obligations créent un **besoin légal implicite** :
*   **Registre d'accidents et d'incidents** : Obligation de consigner tout événement, même mineur.
*   **Analyse des risques** : Obligation d'identifier et documenter les risques quotidiens (surtout pour >20 travailleurs).
*   **CCQ** : Obligation de tenir un "registre des activités quotidiennes" pour la paie et la conformité.
*   *Conclusion* : Le rapport journalier est le document légal de référence en cas de litige ou d'audit.

## 3. Analyse de l'Existant (DR Électrique)

### 3.1 Points Forts Actuels
*   **Captation de Données** : Le formulaire `rapport-form.html` couvre bien les bases (Main d'œuvre, Matériaux, Photos, Notes).
*   **Interface** : L'utilisation de composants React (même via CDN) permet une interactivité correcte.
*   **GPS & Photos** : La fonctionnalité de géolocalisation des photos est présente.

### 3.2 Lacunes & Risques Identifiés
*   **Architecture Fragile** : 
    *   Utilisation de React via CDN (`<script src="...">`) dans des fichiers HTML uniques. Cela rend difficile la maintenance, les tests unitaires et l'optimisation des performances (pas de Tree Shaking).
    *   **Risque de Sécurité Critique** : Les clés API Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) sont hardcodées directement dans les fichiers JS/HTML.
*   **Dashboard Basique** : 
    *   Présente des données statiques ("Aujourd'hui").
    *   Manque de visualisation temporelle (Graphiques d'évolution des heures, cumulatifs par projet).
    *   Pas d'export PDF formel pour archivage ou envoi client.
*   **Expérience Utilisateur (UX)** :
    *   Pas de feedback visuel fort sur la synchro hors-ligne (autre qu'un écran "Sauvegardé localement").
    *   Navigation entre les projets peu fluide sur le dashboard.

## 4. Recommandations Stratégiques

### 4.1 Architecture & Sécurité (Priorité 1)
*   **Migration Vite/React Complète** : Abandonner le format "Fichiers HTML isolés" pour une véritable *Single Page Application* (SPA) compilée avec Vite.
*   **Gestion des Secrets** : Déplacer les clés API vers un fichier `.env` et utiliser `import.meta.env`.
*   **Dockerisation** : Standardiser l'environnement de build (déjà entamé).

### 4.2 Améliorations Fonctionnelles (Dashboard)
*   **Analytics** : Ajouter des graphiques (via `recharts` ou `chart.js`) pour visualiser :
    *   Heures cumulées vs Budget par projet.
    *   Ratio Extras / Contrat de base.
*   **Vue "Calendrier"** : Aperçu visuel des rapports soumis/manquants sur le mois.

### 4.3 Améliorations Fonctionnelles (Mobile/Formulaire)
*   **Pré-remplissage Intelligent** : Si un contremaître sélectionne un projet, pré-remplir l'équipe habituelle de ce projet.
*   **Mode Sombre "Haut Contraste"** : Pour lisibilité en plein soleil ou environnements sombres (demandé dans les objectifs précédents).

## 5. Plan d'Action Proposé
1.  **Refactorisation Infrastructure** : Finaliser la migration vers Vite et nettoyer les secrets.
2.  **Dashboard 2.0** : Intégrer des visualisations graphiques et une meilleure navigation.
3.  **Tests & Validation** : Simuler des conditions hors-ligne et valider la synchro Supabase.
