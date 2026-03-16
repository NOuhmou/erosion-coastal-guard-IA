# Entités identifiées - Erosion Coastal Guard
**Date:** 16/03/2026
**Source:** Claude (voir prompts/prompt-identification-entites.md)

---

## VUE D'ENSEMBLE - 14 ENTITÉS

| # | Table | Rôle principal | Relations clés |
|---|-------|----------------|----------------|
| 1 | **UTILISATEUR** | Personnes accédant au système | zone_assignee_id → ZONE_COTIERE |
| 2 | **ZONE_COTIERE** | Segment du littoral | — |
| 3 | **POINT_MESURE** | Point GPS fixe | id_zone → ZONE_COTIERE |
| 4 | **RELEVE_TERRAIN** | Mesure terrain | id_point → POINT_MESURE, id_agent → UTILISATEUR |
| 5 | **PHOTO_RELEVE** | Photos des relevés | id_releve → RELEVE_TERRAIN |
| 6 | **CALCUL_RECUL** | Calculs de recul | id_point → POINT_MESURE, id_releve_t1/t2 → RELEVE |
| 7 | **HISTORIQUE_CLASSIFICATION** | Évolution des zones | id_zone → ZONE_COTIERE, id_expert → UTILISATEUR |
| 8 | **ALERTE** | Alertes système | id_zone → ZONE_COTIERE, id_releve → RELEVE |
| 9 | **DEMANDE_PERMIS** | Demandes de permis | id_demandeur → UTILISATEUR, id_zone → ZONE |
| 10 | **PARCELLE** | Parcelles cadastrales | id_zone → ZONE_COTIERE |
| 11 | **NOTIFICATION** | Messages utilisateurs | id_destinataire → UTILISATEUR, id_alerte → ALERTE |
| 12 | **AUDIT_LOG** | Journal d'audit | id_utilisateur → UTILISATEUR |
| 13 | **RAPPORT** | Rapports d'analyse | id_zone → ZONE, id_auteur → UTILISATEUR |
| 14 | **CONFIGURATION_SEUILS** | Paramètres système | id_modificateur → UTILISATEUR |

---

## DÉTAIL COMPLET DES TABLES

---

### Entité : UTILISATEUR

*Représente toute personne accédant au système, quel que soit son rôle. Un même utilisateur ne peut avoir qu'un seul rôle actif.*

**Clé primaire :** id_utilisateur (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_utilisateur** | UUID | PK | Identifiant unique auto-généré |
| nom | VARCHAR(100) | NOT NULL | Nom de famille |
| prenom | VARCHAR(100) | NOT NULL | Prénom |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Identifiant de connexion |
| mot_de_passe_hash | VARCHAR(255) | NOT NULL | Hashé avec bcrypt |
| role | ENUM | NOT NULL | 'AGENT', 'EXPERT', 'URBANISTE', 'ADMIN', 'PUBLIC' |
| telephone | VARCHAR(20) | NULLABLE | Téléphone de contact |
| organisation | VARCHAR(150) | NULLABLE | Commune, Agence, Bureau d'études |
| zone_assignee_id | UUID | FK → ZONE_COTIERE, NULLABLE | Pour les agents terrain |
| actif | BOOLEAN | DEFAULT TRUE | Désactivation sans suppression |
| created_at | TIMESTAMP | NOT NULL | Date de création |
| derniere_connexion | TIMESTAMP | NULLABLE | Dernière connexion |

**Clés étrangères :**
- `zone_assignee_id` → ZONE_COTIERE(`id_zone`)

**Règles métier :**
- CHECK role IN ('AGENT','EXPERT','URBANISTE','ADMIN','PUBLIC')
- Un agent ne peut pas valider ses propres relevés (contrôle applicatif)

---

### Entité : ZONE_COTIERE

*Segment du littoral défini géographiquement. Unité de base du monitoring. Une zone peut contenir plusieurs points de mesure.*

**Clé primaire :** id_zone (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_zone** | UUID | PK | Identifiant unique |
| nom | VARCHAR(150) | NOT NULL | Ex: 'Plage Agadir Centre', 'Cap Ghir' |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Ex: 'AGD-001', 'TGH-003' |
| description | TEXT | NULLABLE | Description de la zone |
| geom_polygon | GEOMETRY(Polygon, 4326) | NOT NULL | Emprise spatiale (PostGIS) |
| longueur_km | DECIMAL(8,3) | NOT NULL | Longueur du linéaire côtier |
| type_cote | ENUM | NOT NULL | 'FALAISE','PLAGE_SABLE','PLAGE_GALETS','MIXTE' |
| classification_actuelle | ENUM | NOT NULL | 'VERTE','ORANGE','ROUGE','NOIRE' |
| classification_precedente | ENUM | NULLABLE | Pour détecter les changements |
| date_derniere_classification | DATE | NOT NULL | Date du dernier classement |
| recul_annuel_moyen | DECIMAL(6,3) | NULLABLE | En m/an, calculé automatiquement |
| recul_projete_100ans | DECIMAL(8,3) | NULLABLE | En m, calculé automatiquement |
| facteur_risque | DECIMAL(3,1) | DEFAULT 1.0 | 1.0 normal, 1.5 tempête, 2.0 falaise active |
| region | VARCHAR(100) | NOT NULL | 'Agadir', 'Taghazout', 'Cap Ghir' |
| created_at | TIMESTAMP | NOT NULL | Date de création |
| updated_at | TIMESTAMP | NOT NULL | Date de mise à jour |

**Règles métier :**
- CHECK type_cote IN ('FALAISE','PLAGE_SABLE','PLAGE_GALETS','MIXTE')
- CHECK classification_actuelle IN ('VERTE','ORANGE','ROUGE','NOIRE')
- CHECK facteur_risque BETWEEN 1.0 AND 3.0
- TRIGGER: Mise à jour automatique de la classification selon recul_projete_100ans

---

### Entité : POINT_MESURE

*Point géographique fixe matérialisé sur le terrain (piquet, repère GPS). Chaque zone possède plusieurs points de mesure répartis tous les 100 à 500 m.*

**Clé primaire :** id_point (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_point** | UUID | PK | Identifiant unique |
| id_zone | UUID | FK → ZONE_COTIERE, NOT NULL | Zone parente |
| code_point | VARCHAR(30) | UNIQUE, NOT NULL | Ex: 'AGD-001-P12' |
| latitude | DECIMAL(10,7) | NOT NULL | Coordonnée WGS84 |
| longitude | DECIMAL(10,7) | NOT NULL | Coordonnée WGS84 |
| geom_point | GEOMETRY(Point, 4326) | NOT NULL | Point PostGIS |
| description_repere | TEXT | NULLABLE | Description physique du repère |
| actif | BOOLEAN | DEFAULT TRUE | Point détruit = désactivé |
| date_installation | DATE | NOT NULL | Date d'installation |
| created_at | TIMESTAMP | NOT NULL | Date de création |

**Clés étrangères :**
- `id_zone` → ZONE_COTIERE(`id_zone`)

**Règles métier :**
- CHECK latitude BETWEEN -90 AND 90
- CHECK longitude BETWEEN -180 AND 180

---

### Entité : RELEVE_TERRAIN

*Enregistrement d'une mesure réalisée sur le terrain par un agent à une date donnée. Table centrale du monitoring.*

**Clé primaire :** id_releve (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_releve** | UUID | PK | Identifiant unique |
| id_point | UUID | FK → POINT_MESURE, NOT NULL | Point mesuré |
| id_agent | UUID | FK → UTILISATEUR, NOT NULL | Rôle = AGENT uniquement |
| date_mesure | TIMESTAMP | NOT NULL | Date et heure précises |
| distance_trait_cote | DECIMAL(8,3) | NOT NULL | Distance en mètres au trait de côte |
| methode_mesure | ENUM | NOT NULL | 'GPS_DGPS','DRONE','SATELLITE','JALONNEMENT' |
| coefficient_maree | DECIMAL(4,2) | NOT NULL | Obligatoire pour normaliser |
| heure_maree | ENUM | NOT NULL | 'BASSE','MONTANTE','HAUTE','DESCENDANTE' |
| conditions_meteo | ENUM | NOT NULL | 'CALME','VENTEUX','HOULE','TEMPETE' |
| vitesse_vent_kmh | DECIMAL(5,1) | NULLABLE | Vitesse du vent |
| hauteur_vagues_m | DECIMAL(4,2) | NULLABLE | Hauteur des vagues |
| type_evenement | ENUM | DEFAULT 'NORMAL' | 'NORMAL','TEMPETE','POST_TEMPETE','URGENCE' |
| notes_terrain | TEXT | NULLABLE | Observations de l'agent |
| statut_validation | ENUM | DEFAULT 'EN_ATTENTE' | 'EN_ATTENTE','VALIDE','REJETE','SUSPECT' |
| id_validateur | UUID | FK → UTILISATEUR, NULLABLE | Rôle = EXPERT |
| date_validation | TIMESTAMP | NULLABLE | Date de validation |
| motif_rejet | TEXT | NULLABLE | Si statut = REJETE ou SUSPECT |
| created_at | TIMESTAMP | NOT NULL | Date de création |

**Clés étrangères :**
- `id_point` → POINT_MESURE(`id_point`)
- `id_agent` → UTILISATEUR(`id_utilisateur`)
- `id_validateur` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- CHECK id_agent ≠ id_validateur (un agent ne valide pas sa propre mesure)
- CHECK distance_trait_cote > 0
- CHECK coefficient_maree BETWEEN 20 AND 120
- TRIGGER: Si |recul| > 3 × moyenne_zone → statut = 'SUSPECT' automatiquement

---

### Entité : PHOTO_RELEVE

*Photos géolocalisées associées à un relevé terrain. Un relevé peut avoir plusieurs photos.*

**Clé primaire :** id_photo (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_photo** | UUID | PK | Identifiant unique |
| id_releve | UUID | FK → RELEVE_TERRAIN, NOT NULL | Relevé associé |
| url_stockage | VARCHAR(500) | NOT NULL | Chemin fichier ou URL cloud |
| latitude | DECIMAL(10,7) | NULLABLE | EXIF extrait de la photo |
| longitude | DECIMAL(10,7) | NULLABLE | EXIF extrait de la photo |
| orientation_degres | DECIMAL(5,2) | NULLABLE | Direction de prise de vue |
| description | VARCHAR(300) | NULLABLE | Description de la photo |
| created_at | TIMESTAMP | NOT NULL | Date de création |

**Clés étrangères :**
- `id_releve` → RELEVE_TERRAIN(`id_releve`)

**Règles métier :**
- CHECK orientation_degres BETWEEN 0 AND 360

---

### Entité : CALCUL_RECUL

*Résultats des calculs de recul côtier entre deux relevés consécutifs. Table générée automatiquement, jamais modifiée manuellement.*

**Clé primaire :** id_calcul (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_calcul** | UUID | PK | Identifiant unique |
| id_point | UUID | FK → POINT_MESURE, NOT NULL | Point concerné |
| id_releve_t1 | UUID | FK → RELEVE_TERRAIN, NOT NULL | Relevé le plus ancien |
| id_releve_t2 | UUID | FK → RELEVE_TERRAIN, NOT NULL | Relevé le plus récent |
| recul_metres | DECIMAL(8,3) | NOT NULL | Positif = recul, Négatif = accrétion |
| duree_jours | INTEGER | NOT NULL | Jours entre t1 et t2 |
| recul_annualise | DECIMAL(6,3) | NOT NULL | = recul_metres / (duree_jours/365) |
| est_evenement_tempete | BOOLEAN | DEFAULT FALSE | Exclure des moyennes si TRUE |
| created_at | TIMESTAMP | NOT NULL | Date de création |

**Clés étrangères :**
- `id_point` → POINT_MESURE(`id_point`)
- `id_releve_t1` → RELEVE_TERRAIN(`id_releve`)
- `id_releve_t2` → RELEVE_TERRAIN(`id_releve`)

**Règles métier :**
- CHECK id_releve_t1 ≠ id_releve_t2
- CHECK duree_jours > 0
- Générée uniquement à partir de relevés validés (statut = 'VALIDE')

---

### Entité : HISTORIQUE_CLASSIFICATION

*Trace toutes les évolutions de classification d'une zone. Essentiel pour l'audit et la traçabilité.*

**Clé primaire :** id_historique (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_historique** | UUID | PK | Identifiant unique |
| id_zone | UUID | FK → ZONE_COTIERE, NOT NULL | Zone concernée |
| classification_avant | ENUM | NULLABLE | NULL si première classification |
| classification_apres | ENUM | NOT NULL | Nouvelle classification |
| date_changement | TIMESTAMP | NOT NULL | Date du changement |
| id_expert_1 | UUID | FK → UTILISATEUR, NOT NULL | Premier validateur |
| id_expert_2 | UUID | FK → UTILISATEUR, NULLABLE | Requis si ROUGE→VERT |
| id_admin | UUID | FK → UTILISATEUR, NULLABLE | Requis si ROUGE→VERT |
| recul_annuel_base | DECIMAL(6,3) | NOT NULL | Recul ayant justifié le changement |
| justification | TEXT | NOT NULL | Obligatoire |
| type_declencheur | ENUM | NOT NULL | 'AUTOMATIQUE','MANUEL','URGENCE' |

**Clés étrangères :**
- `id_zone` → ZONE_COTIERE(`id_zone`)
- `id_expert_1` → UTILISATEUR(`id_utilisateur`)
- `id_expert_2` → UTILISATEUR(`id_utilisateur`)
- `id_admin` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- Si classification_avant='ROUGE' ET classification_apres='VERTE' → id_expert_2 et id_admin obligatoires
- Enregistrement IMMUABLE (pas de UPDATE ni DELETE)
- TRIGGER: Créé automatiquement lors de toute MAJ de ZONE_COTIERE.classification_actuelle

---

### Entité : ALERTE

*Alertes générées automatiquement quand un seuil est dépassé, ou manuellement par un expert.*

**Clé primaire :** id_alerte (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_alerte** | UUID | PK | Identifiant unique |
| id_zone | UUID | FK → ZONE_COTIERE, NOT NULL | Zone concernée |
| id_releve_declencheur | UUID | FK → RELEVE_TERRAIN, NULLABLE | Relevé déclencheur |
| type_alerte | ENUM | NOT NULL | 'URGENTE','SURVEILLANCE','TEMPETE','FRAUDE' |
| niveau | ENUM | NOT NULL | 'INFO','WARNING','CRITICAL' |
| titre | VARCHAR(200) | NOT NULL | Titre de l'alerte |
| description | TEXT | NOT NULL | Description détaillée |
| valeur_mesuree | DECIMAL(8,3) | NULLABLE | Valeur déclencheuse |
| seuil_depasse | DECIMAL(8,3) | NULLABLE | Seuil configuré |
| statut | ENUM | DEFAULT 'ACTIVE' | 'ACTIVE','ACQUITTEE','RESOLUE','FAUSSE' |
| id_createur | UUID | FK → UTILISATEUR, NOT NULL | Système ou expert |
| id_traiteur | UUID | FK → UTILISATEUR, NULLABLE | Qui a traité l'alerte |
| date_creation | TIMESTAMP | NOT NULL | Date de création |
| date_traitement | TIMESTAMP | NULLABLE | Date de traitement |
| notif_protection_civile | BOOLEAN | DEFAULT FALSE | TRUE si notification envoyée |

**Clés étrangères :**
- `id_zone` → ZONE_COTIERE(`id_zone`)
- `id_releve_declencheur` → RELEVE_TERRAIN(`id_releve`)
- `id_createur` → UTILISATEUR(`id_utilisateur`)
- `id_traiteur` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- TRIGGER R7: Si recul > 2m en < 7 jours → alerte URGENTE + CRITICAL
- TRIGGER R8: Si tendance > +20% vs moyenne 5 ans → alerte SURVEILLANCE
- TRIGGER: Si type_evenement='TEMPETE' → notif_protection_civile = TRUE

---

### Entité : DEMANDE_PERMIS

*Demande de permis de construire déposée via le système. Liée à une parcelle et automatiquement vérifiée par rapport au zonage.*

**Clé primaire :** id_demande (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_demande** | UUID | PK | Identifiant unique |
| reference | VARCHAR(50) | UNIQUE, NOT NULL | 'PC-AGD-2024-0142' |
| id_demandeur | UUID | FK → UTILISATEUR, NOT NULL | Rôle PUBLIC ou URBANISTE |
| id_zone | UUID | FK → ZONE_COTIERE, NOT NULL | Zone concernée |
| id_parcelle | UUID | FK → PARCELLE, NOT NULL | Parcelle concernée |
| date_depot | TIMESTAMP | NOT NULL | Date de dépôt |
| type_projet | VARCHAR(150) | NOT NULL | 'Résidentiel', 'Hôtel', 'Route' |
| surface_construite_m2 | DECIMAL(10,2) | NOT NULL | Surface de construction |
| nb_etages | INTEGER | NOT NULL | Nombre d'étages |
| statut | ENUM | DEFAULT 'EN_COURS' | 'EN_COURS','APPROUVE','REFUSE','SUSPENDU' |
| classification_zone_au_depot | ENUM | NOT NULL | Snapshot du zonage |
| distance_trait_cote_m | DECIMAL(8,2) | NOT NULL | Distance calculée |
| blocage_automatique | BOOLEAN | DEFAULT FALSE | TRUE si zone ROUGE ou < 100m |
| motif_blocage | TEXT | NULLABLE | Raison du blocage |
| id_urbaniste | UUID | FK → UTILISATEUR, NULLABLE | Agent traitant |
| date_decision | TIMESTAMP | NULLABLE | Date de décision |
| motif_decision | TEXT | NULLABLE | Motif de la décision |
| etude_geotechnique_requise | BOOLEAN | DEFAULT FALSE | TRUE si zone ORANGE |
| etude_geotechnique_fournie | BOOLEAN | DEFAULT FALSE | TRUE si fournie |

**Clés étrangères :**
- `id_demandeur` → UTILISATEUR(`id_utilisateur`)
- `id_zone` → ZONE_COTIERE(`id_zone`)
- `id_parcelle` → PARCELLE(`id_parcelle`)
- `id_urbaniste` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- TRIGGER R10: Si distance_trait_cote_m < 100 → blocage_automatique = TRUE
- TRIGGER R11: Si classification_zone = 'ROUGE' → blocage_automatique = TRUE
- TRIGGER R12: Si classification_zone = 'ORANGE' → etude_geotechnique_requise = TRUE
- CHECK surface_construite_m2 > 0 ET nb_etages >= 1

---

### Entité : PARCELLE

*Parcelle cadastrale pouvant faire l'objet d'une demande de permis. Contient la géométrie et les informations foncières.*

**Clé primaire :** id_parcelle (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_parcelle** | UUID | PK | Identifiant unique |
| reference_cadastrale | VARCHAR(50) | UNIQUE, NOT NULL | Réf. officielle du cadastre |
| id_zone | UUID | FK → ZONE_COTIERE, NULLABLE | NULL si hors zone |
| geom_polygon | GEOMETRY(Polygon, 4326) | NOT NULL | Géométrie parcelle |
| surface_m2 | DECIMAL(12,2) | NOT NULL | Surface en m² |
| distance_trait_cote_m | DECIMAL(8,2) | NULLABLE | Calculée automatiquement |
| proprietaire_nom | VARCHAR(200) | NULLABLE | Nom du propriétaire |
| proprietaire_contact | VARCHAR(200) | NULLABLE | Contact |
| classification_actuelle | ENUM | NULLABLE | Héritée de la zone |
| dans_dpm_100m | BOOLEAN | DEFAULT FALSE | TRUE si bande 100m Loi 81-12 |
| created_at | TIMESTAMP | NOT NULL | Date de création |
| updated_at | TIMESTAMP | NOT NULL | Date de mise à jour |

**Clés étrangères :**
- `id_zone` → ZONE_COTIERE(`id_zone`)

**Règles métier :**
- CHECK surface_m2 > 0
- TRIGGER: MAJ automatique distance_trait_cote_m via PostGIS
- TRIGGER R9: Notification propriétaire si classification_actuelle change

---

### Entité : NOTIFICATION

*Messages envoyés aux utilisateurs (email, SMS, in-app) suite à des événements système.*

**Clé primaire :** id_notification (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_notification** | UUID | PK | Identifiant unique |
| id_destinataire | UUID | FK → UTILISATEUR, NOT NULL | Destinataire |
| id_alerte | UUID | FK → ALERTE, NULLABLE | Si liée à une alerte |
| id_demande | UUID | FK → DEMANDE_PERMIS, NULLABLE | Si liée à un permis |
| type_evenement | ENUM | NOT NULL | 'REZONAGE','ALERTE','PERMIS','URGENCE' |
| canal | ENUM | NOT NULL | 'EMAIL','SMS','IN_APP' |
| sujet | VARCHAR(200) | NOT NULL | Sujet du message |
| corps | TEXT | NOT NULL | Contenu du message |
| statut_envoi | ENUM | DEFAULT 'EN_ATTENTE' | 'EN_ATTENTE','ENVOYE','ECHEC' |
| date_creation | TIMESTAMP | NOT NULL | Date de création |
| date_envoi | TIMESTAMP | NULLABLE | Date d'envoi |

**Clés étrangères :**
- `id_destinataire` → UTILISATEUR(`id_utilisateur`)
- `id_alerte` → ALERTE(`id_alerte`)
- `id_demande` → DEMANDE_PERMIS(`id_demande`)

---

### Entité : AUDIT_LOG

*Journal d'audit immuable. Toute action sensible génère une entrée. Table en APPEND ONLY.*

**Clé primaire :** id_log (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_log** | UUID | PK | Identifiant unique |
| id_utilisateur | UUID | FK → UTILISATEUR, NOT NULL | Utilisateur concerné |
| timestamp_action | TIMESTAMP | NOT NULL | Date précise |
| table_cible | VARCHAR(50) | NOT NULL | Table modifiée |
| id_enregistrement | UUID | NOT NULL | ID de la ligne modifiée |
| action | ENUM | NOT NULL | 'INSERT','UPDATE','DELETE','LOGIN','EXPORT' |
| champ_modifie | VARCHAR(100) | NULLABLE | Colonne modifiée |
| valeur_avant | TEXT | NULLABLE | Ancienne valeur (JSON) |
| valeur_apres | TEXT | NULLABLE | Nouvelle valeur (JSON) |
| adresse_ip | INET | NOT NULL | Adresse IP |
| user_agent | VARCHAR(300) | NULLABLE | Navigateur/application |
| motif | TEXT | NULLABLE | Justification |

**Clés étrangères :**
- `id_utilisateur` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- TABLE APPEND ONLY — aucun UPDATE ni DELETE autorisé
- Déclenché automatiquement par triggers
- Rétention légale : 10 ans minimum

---

### Entité : RAPPORT

*Rapports d'analyse produits par les experts et validés par l'administration.*

**Clé primaire :** id_rapport (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_rapport** | UUID | PK | Identifiant unique |
| id_zone | UUID | FK → ZONE_COTIERE, NOT NULL | Zone concernée |
| id_auteur | UUID | FK → UTILISATEUR, NOT NULL | Rôle EXPERT ou ADMIN |
| titre | VARCHAR(200) | NOT NULL | Titre du rapport |
| type_rapport | ENUM | NOT NULL | 'ANNUEL','POST_TEMPETE','EXPERTISE','URGENT' |
| periode_debut | DATE | NOT NULL | Début de période |
| periode_fin | DATE | NOT NULL | Fin de période |
| contenu | TEXT | NOT NULL | Texte complet ou lien PDF |
| url_pdf | VARCHAR(500) | NULLABLE | Lien vers PDF |
| est_public | BOOLEAN | DEFAULT FALSE | Visible par PUBLIC |
| statut | ENUM | DEFAULT 'BROUILLON' | 'BROUILLON','PUBLIE','ARCHIVE' |
| date_publication | TIMESTAMP | NULLABLE | Date de publication |
| created_at | TIMESTAMP | NOT NULL | Date de création |

**Clés étrangères :**
- `id_zone` → ZONE_COTIERE(`id_zone`)
- `id_auteur` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- CHECK periode_fin > periode_debut

---

### Entité : CONFIGURATION_SEUILS

*Paramètres configurables du système (seuils d'alerte, facteurs de risque, fréquences).*

**Clé primaire :** id_config (UUID)

**Attributs :**

| Colonne | Type SQL | Contrainte | Description |
|---------|----------|------------|-------------|
| **id_config** | UUID | PK | Identifiant unique |
| cle | VARCHAR(100) | UNIQUE, NOT NULL | Ex: 'SEUIL_ALERTE_URGENTE_M' |
| valeur | VARCHAR(200) | NOT NULL | Valeur en texte |
| type_valeur | ENUM | NOT NULL | 'DECIMAL','INTEGER','BOOLEAN','STRING' |
| description | TEXT | NOT NULL | Explication |
| categorie | VARCHAR(50) | NOT NULL | 'SEUILS','ZONAGE','ALERTES','LEGAUX' |
| modifiable_par | ENUM | NOT NULL | 'ADMIN_ONLY','EXPERT_ADMIN' |
| id_modificateur | UUID | FK → UTILISATEUR, NULLABLE | Dernier modificateur |
| updated_at | TIMESTAMP | NOT NULL | Date de mise à jour |

**Clés étrangères :**
- `id_modificateur` → UTILISATEUR(`id_utilisateur`)

**Règles métier :**
- Toute modification loguée dans AUDIT_LOG
- Exemples: SEUIL_VERT_RECUL_100ANS=10, SEUIL_ROUGE_RECUL_100ANS=30, DISTANCE_DPM_LEGALE=100

---

## RÉSUMÉ DES RELATIONS PRINCIPALES

| Relation | Type | Description |
|----------|------|-------------|
| **UTILISATEUR → ZONE_COTIERE** | 0..1 --- N | Un agent assigné à une ou plusieurs zones |
| **ZONE_COTIERE → POINT_MESURE** | 1 --- N | Une zone contient plusieurs points |
| **POINT_MESURE → RELEVE_TERRAIN** | 1 --- N | Un point a plusieurs relevés |
| **RELEVE_TERRAIN → PHOTO_RELEVE** | 1 --- N | Un relevé a plusieurs photos |
| **RELEVE_TERRAIN → CALCUL_RECUL** | 2 --- N | Un calcul nécessite 2 relevés |
| **ZONE_COTIERE → HISTORIQUE_CLASSIFICATION** | 1 --- N | Archive des changements |
| **ZONE_COTIERE → ALERTE** | 1 --- N | Une zone génère des alertes |
| **PARCELLE → DEMANDE_PERMIS** | 1 --- N | Une parcelle a plusieurs demandes |
| **UTILISATEUR → AUDIT_LOG** | 1 --- N | Traçabilité des actions |
