# Rapport de Transparence IA
## Projet : Erosion-Coastal Guard

> **Surveillance du recul du trait de côte — Région Souss-Massa (Agadir & Taghazout)**

---

## 1. Introduction

### Contexte

Le projet **Erosion-Coastal Guard** s'inscrit dans une démarche de surveillance environnementale côtière pour la région Souss-Massa, au Maroc. Il vise à collecter, stocker et visualiser les données de recul du trait de côte autour des zones d'Agadir et de Taghazout, permettant ainsi aux acteurs locaux de suivre l'évolution de l'érosion marine dans le temps.

### Objectif du rapport

Ce rapport de transparence a pour but de documenter de manière honnête et rigoureuse l'utilisation des outils d'intelligence artificielle (IA) dans le cadre du développement de ce projet. Il répond aux questions suivantes :

- Quels outils IA ont été utilisés, et pour quoi ?
- Quels prompts ont été soumis à ces outils ?
- Quelles erreurs (hallucinations) l'IA a-t-elle produites, et comment ont-elles été corrigées ?
- Quelle est la valeur ajoutée réelle de l'IA comparée à un développement entièrement manuel ?

Ce rapport s'adresse à l'équipe pédagogique et constitue une trace académique de la démarche adoptée par l'**Équipe Augmentés (IA)**.

---

## 2. Méthodologie

### Outils IA utilisés

| Outil | Rôle principal dans le projet |
|-------|-------------------------------|
| **Claude (Anthropic)** | Outil principal : analyse du besoin, modélisation des données (MCD), scripts SQL, backend Flask |
| **Gemini (Google)** | Optimisation et relecture des requêtes SQL |
| **Cursor** | Génération assistée du frontend (dashboard, carte, formulaires) |

### Approche générale

La démarche adoptée suit un cycle itératif en quatre étapes :

1. **Rédaction d'un prompt précis** décrivant la tâche à accomplir avec le contexte technique
2. **Génération du code ou du contenu** par l'IA
3. **Relecture critique et test** du résultat dans l'environnement réel (MySQL, Flask, navigateur)
4. **Correction manuelle** des erreurs et réintégration dans le projet

L'IA n'a jamais été utilisée comme une boîte noire : chaque production a été vérifiée, testée et, si nécessaire, corrigée à la main.

---

## 3. Liste des prompts utilisés

Les prompts ci-dessous sont les formulations réelles soumises aux outils IA au cours du projet.

### Prompt 1 — Analyse du besoin

```
Tu es un expert en analyse fonctionnelle et en systèmes d'information environnementaux.

Je développe une application web de surveillance du recul du trait de côte pour la région
Souss-Massa au Maroc (zones d'Agadir et Taghazout).

Aide-moi à :
1. Identifier les règles métier principales (seuils d'alerte, fréquence de relevé, etc.)
2. Lister les acteurs du système (utilisateurs, rôles)
3. Décrire les grandes fonctionnalités attendues

Le système doit gérer : des zones côtières, des points de mesure GPS, des relevés d'érosion
horodatés, des agents de terrain, et des permis de construction en zone sensible.
```

---

### Prompt 2 — Modèle Conceptuel de Données (MCD)

```
Sur la base de l'analyse du besoin suivante, génère un Modèle Conceptuel de Données (MCD)
complet pour une base de données MySQL.

Contexte : application de surveillance côtière (Agadir, Taghazout).

Entités à inclure :
- ZONE_COTIERE (identifiant, nom, superficie, niveau de risque)
- POINT_MESURE (GPS, rattaché à une zone)
- RELEVE_EROSION (date, valeur de recul en mètres, agent responsable)
- AGENT (nom, rôle, zone assignée)
- PERMIS_CONSTRUCTION (numéro, zone, statut de validation)
- et toutes les entités associées nécessaires

Fournis : la liste des entités avec leurs attributs, les cardinalités des associations,
et un schéma textuel du MCD. Le résultat doit contenir au moins 14 entités.
```

---

### Prompt 3 — Scripts SQL (tables, triggers, procédure stockée)

```
Génère les scripts SQL complets pour MySQL (version 8.0) correspondant au MCD suivant.

[MCD fourni en contexte]

Je veux :
1. Les CREATE TABLE pour les 8 tables principales avec clés primaires, étrangères,
   contraintes NOT NULL et valeurs par défaut
2. 3 triggers :
   - trg_permit_validation : refuse un permis si la zone est classée "critique"
   - trg_alert_erosion : crée une alerte si le recul dépasse 0.5 m en un relevé
   - trg_update_zone_risk : met à jour le niveau de risque de la zone après chaque relevé
3. 1 procédure stockée : calculate_erosion_stats(zone_id) qui retourne les stats
   d'érosion (min, max, moyenne, total) pour une zone donnée

Important : utilise la syntaxe MySQL stricte (pas PostgreSQL).
```

---

### Prompt 4 — Backend Flask (API REST)

```
Génère un backend Python Flask complet pour mon application de surveillance côtière.

Base de données : MySQL (tables déjà créées)
Connexion : PyMySQL

Endpoints à créer :
- GET  /api/zones          → liste toutes les zones côtières
- GET  /api/zones/<id>     → détail d'une zone
- POST /api/releves        → ajouter un relevé d'érosion
- GET  /api/releves/<zone_id> → historique des relevés d'une zone
- GET  /api/alerts         → liste des alertes actives
- GET  /api/agents         → liste des agents
- GET  /api/stats/<zone_id> → appelle la procédure stockée calculate_erosion_stats
- GET  /api/dashboard      → données agrégées pour le tableau de bord

Retourne du JSON. Inclus la gestion des erreurs (try/except) et les codes HTTP appropriés.
Configure CORS pour permettre les appels depuis le frontend.
```

---

### Prompt 5 — Frontend (dashboard, carte, graphiques, formulaire)

```
Génère le frontend complet pour un dashboard de surveillance côtière.

Stack : HTML, CSS, JavaScript vanilla + Leaflet.js (carte) + Chart.js (graphiques)

Pages à créer :
1. Dashboard principal : KPIs (nombre de zones, alertes actives, dernier relevé),
   graphique d'évolution de l'érosion sur 12 mois, tableau des zones avec niveau de risque
2. Carte interactive (Leaflet) centrée sur Agadir (30.4278° N, -9.5981° E) avec markers
   pour chaque zone côtière, colorés selon le niveau de risque
3. Formulaire d'ajout de relevé : sélection de la zone, du point de mesure, valeur de
   recul, date, agent
4. Page alertes : liste des alertes avec filtres par zone et par niveau

Le frontend doit consommer les endpoints Flask listés ci-dessus.
Style sobre et professionnel, responsive, avec une palette de couleurs bleue/marine.
```

---

## 4. Hallucinations et corrections

Une **hallucination** désigne une erreur produite par l'IA : code incorrect, syntaxe invalide, fonctionnalité manquante ou hypothèse fausse sur l'environnement technique.

| # | Problème généré par l'IA | Impact | Solution apportée manuellement |
|---|--------------------------|--------|-------------------------------|
| 1 | Code SQL généré en syntaxe **PostgreSQL** (ex. : `gen_random_uuid()`, `$$` pour les blocs) au lieu de MySQL | Scripts non exécutables | Conversion vers MySQL : `UUID()`, `DELIMITER $$`, syntaxe des triggers adaptée |
| 2 | **CORS non configuré** dans le backend Flask (erreurs bloquantes côté navigateur) | Frontend incapable de contacter l'API | Ajout de `from flask_cors import CORS` et `CORS(app)` ; installation de `flask-cors` |
| 3 | Colonnes `latitude` et `longitude` **absentes** de la table `ZONE_COTIERE` dans le MCD et le SQL | Impossible d'afficher les zones sur la carte Leaflet | Ajout manuel via `ALTER TABLE ZONE_COTIERE ADD COLUMN latitude DECIMAL(9,6), ADD COLUMN longitude DECIMAL(9,6)` |
| 4 | **Aucune donnée de test** générée dans les scripts SQL | Base vide, impossible de tester le frontend | Insertion manuelle : 5 zones, 6 points de mesure, 15 relevés d'érosion |
| 5 | Endpoint **`/api/agents` manquant** dans le code Flask généré | Page agents du dashboard vide | Ajout manuel de la route dans `app.py` |
| 6 | La procédure stockée `calculate_erosion_stats` contenait des **erreurs de syntaxe** MySQL (variables non déclarées) | Procédure non exécutable | Correction de la déclaration des variables (`DECLARE`) et de la syntaxe `CALL` |
| 7 | Le trigger `trg_permit_validation` avait des **conditions logiques incorrectes** (mauvaise comparaison du niveau de risque) | Permis acceptés même en zone critique | Correction de la condition `IF NEW.zone_risque = 'critique'` et du message d'erreur SIGNAL |

> **Observation :** La quasi-totalité des erreurs provenait d'une confusion entre MySQL et PostgreSQL, signe que l'IA généralise à partir de sa connaissance de plusieurs SGBD sans toujours respecter les contraintes de l'environnement spécifié. La solution systématique a été de **préciser explicitement "MySQL 8.0"** dans chaque prompt ultérieur.

---

## 5. Analyse comparative : IA vs Développement Manuel

### Tableau comparatif

| Critère | Approche IA (réelle) | Approche manuelle (estimée) |
|---------|---------------------|------------------------------|
| Temps de développement | **2 jours** | 5 à 6 jours |
| Lignes de code produites | ~1 200 lignes | ~800 lignes |
| Corrections nécessaires | 7 interventions | ~5 interventions |
| Documentation | Générée automatiquement | À rédiger manuellement |
| Gain de temps estimé | **~60 %** | — |
| Cohérence du code | Bonne (à vérifier) | Maîtrisée dès l'écriture |
| Courbe d'apprentissage | Faible (prompting) | Élevée (maîtrise technique) |

### Analyse

**Avantages observés de l'approche IA :**

L'IA a permis de générer un squelette fonctionnel complet en très peu de temps. Des tâches répétitives ou structurées — comme l'écriture de multiples `CREATE TABLE`, la définition de routes Flask similaires, ou la génération de composants HTML — ont été réalisées en quelques minutes plutôt qu'en plusieurs heures. La documentation (commentaires dans le code, nommage des variables) est également de meilleure qualité qu'elle ne l'aurait été sous la pression du temps.

**Limites constatées :**

L'IA produit plus de lignes de code que nécessaire (~1 200 vs ~800 en approche manuelle), parfois avec de la redondance. Surtout, elle ne connaît pas l'environnement réel du projet : elle a supposé PostgreSQL, ignoré la configuration CORS, et omis des colonnes pourtant critiques. Ces erreurs, si elles n'avaient pas été détectées, auraient rendu le projet non fonctionnel.

**Conclusion de la comparaison :**

L'approche IA est efficace **à condition d'avoir les compétences techniques pour valider et corriger** ce qu'elle produit. Elle ne remplace pas la compréhension du domaine — elle l'accélère pour ceux qui savent quoi vérifier.

---

## 6. Leçons apprises

**1. La précision du prompt détermine la qualité du résultat**
Les prompts vagues génèrent du code générique et souvent incorrect. En précisant systématiquement la version du SGBD (`MySQL 8.0`), le framework (`Flask`), et les contraintes (`pas de PostgreSQL`), la qualité des sorties s'est nettement améliorée au fil du projet.

**2. L'IA est un accélérateur, pas un remplaçant**
Chaque ligne de code générée a nécessité une vérification. Sur les 7 corrections effectuées, certaines (CORS, colonnes manquantes) auraient pu bloquer le projet entier si elles n'avaient pas été détectées rapidement. La compétence technique reste indispensable pour utiliser l'IA de façon productive.

**3. Les hallucinations sont prévisibles et évitables**
La confusion MySQL/PostgreSQL est un pattern connu des LLMs. Apprendre à anticiper les zones de risque (syntaxe spécifique à un outil, configuration réseau, données de test) permet de formuler des prompts défensifs et de réduire les corrections a posteriori.

**4. L'IA valorise la documentation, pas seulement le code**
L'analyse du besoin, les commentaires dans le code et ce rapport lui-même ont été rédigés plus rapidement grâce à l'IA. Dans un projet académique, cet apport sur la qualité de la documentation est souvent sous-estimé.

---

## 7. Conclusion

Ce rapport documente une utilisation réfléchie et critique de l'intelligence artificielle dans le cadre du projet **Erosion-Coastal Guard**. L'IA — principalement Claude — a joué un rôle central dans la production du code et de la documentation, permettant un gain de temps estimé à 60 % par rapport à un développement entièrement manuel.

Cette expérience confirme que l'IA générative est un outil puissant pour le développement logiciel, mais qu'elle exige une posture active de la part du développeur : vérifier, tester, corriger, et savoir formuler des prompts pertinents. Les 7 hallucinations corrigées dans ce projet illustrent bien cette réalité.


---

*Rapport rédigé dans le cadre du projet académique Erosion-Coastal Guard — Équipe Augmentés (IA)*
*Région Souss-Massa, Agadir & Taghazout, Maroc*
