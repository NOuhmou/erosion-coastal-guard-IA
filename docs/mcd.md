# Modèle Conceptuel de Données (MCD) - Erosion Coastal Guard
**Date:** 16/03/2026


---

## 1. ENTITÉS ET ATTRIBUTS

### ZONE_COTIERE
- **id_zone** UUID (PK)
- **code** VARCHAR(20) [UNIQUE]
- **nom** VARCHAR(150)
- **geom_polygon** GEOMETRY(Polygon)
- **type_cote** ENUM('FALAISE','PLAGE_SABLE','PLAGE_GALETS','MIXTE')
- **classification_actuelle** ENUM('VERTE','ORANGE','ROUGE','NOIRE')
- **classification_precedente** ENUM('VERTE','ORANGE','ROUGE','NOIRE') [NULLABLE]
- **facteur_risque** DECIMAL(3,1) [DEFAULT 1.0]
- **recul_annuel_moyen** DECIMAL(6,3) [NULLABLE]
- **recul_projete_100ans** DECIMAL(8,3) [NULLABLE]
- **region** VARCHAR(100)

### UTILISATEUR
- **id_utilisateur** UUID (PK)
- **nom** VARCHAR(100)
- **prenom** VARCHAR(100)
- **email** VARCHAR(255) [UNIQUE]
- **mot_de_passe_hash** VARCHAR(255)
- **role** ENUM('AGENT','EXPERT','URBANISTE','ADMIN','PUBLIC')
- **telephone** VARCHAR(20) [NULLABLE]
- **organisation** VARCHAR(150) [NULLABLE]
- **zone_assignee_id** UUID [FK → ZONE_COTIERE, NULLABLE]
- **actif** BOOLEAN [DEFAULT TRUE]
- **created_at** TIMESTAMP
- **derniere_connexion** TIMESTAMP [NULLABLE]

### POINT_MESURE
- **id_point** UUID (PK)
- **id_zone** UUID [FK → ZONE_COTIERE]
- **code_point** VARCHAR(30) [UNIQUE]
- **latitude** DECIMAL(10,7)
- **longitude** DECIMAL(10,7)
- **geom_point** GEOMETRY(Point, 4326)
- **description_repere** TEXT [NULLABLE]
- **actif** BOOLEAN [DEFAULT TRUE]
- **date_installation** DATE
- **created_at** TIMESTAMP

### RELEVE_TERRAIN
- **id_releve** UUID (PK)
- **id_point** UUID [FK → POINT_MESURE]
- **id_agent** UUID [FK → UTILISATEUR]
- **id_validateur** UUID [FK → UTILISATEUR, NULLABLE]
- **date_mesure** TIMESTAMP
- **distance_trait_cote** DECIMAL(8,3)
- **methode_mesure** ENUM('GPS_DGPS','DRONE','SATELLITE','JALONNEMENT')
- **coefficient_maree** DECIMAL(4,2)
- **heure_maree** ENUM('BASSE','MONTANTE','HAUTE','DESCENDANTE')
- **conditions_meteo** ENUM('CALME','VENTEUX','HOULE','TEMPETE')
- **vitesse_vent_kmh** DECIMAL(5,1) [NULLABLE]
- **hauteur_vagues_m** DECIMAL(4,2) [NULLABLE]
- **type_evenement** ENUM('NORMAL','TEMPETE','POST_TEMPETE','URGENCE') [DEFAULT 'NORMAL']
- **notes_terrain** TEXT [NULLABLE]
- **statut_validation** ENUM('EN_ATTENTE','VALIDE','REJETE','SUSPECT') [DEFAULT 'EN_ATTENTE']
- **date_validation** TIMESTAMP [NULLABLE]
- **motif_rejet** TEXT [NULLABLE]
- **created_at** TIMESTAMP

### PHOTO_RELEVE
- **id_photo** UUID (PK)
- **id_releve** UUID [FK → RELEVE_TERRAIN]
- **url_stockage** VARCHAR(500)
- **latitude** DECIMAL(10,7) [NULLABLE]
- **longitude** DECIMAL(10,7) [NULLABLE]
- **orientation_degres** DECIMAL(5,2) [NULLABLE]
- **description** VARCHAR(300) [NULLABLE]
- **created_at** TIMESTAMP

### CALCUL_RECUL
- **id_calcul** UUID (PK)
- **id_point** UUID [FK → POINT_MESURE]
- **id_releve_t1** UUID [FK → RELEVE_TERRAIN]
- **id_releve_t2** UUID [FK → RELEVE_TERRAIN]
- **recul_metres** DECIMAL(8,3)
- **duree_jours** INTEGER
- **recul_annualise** DECIMAL(6,3)
- **est_evenement_tempete** BOOLEAN [DEFAULT FALSE]
- **created_at** TIMESTAMP

### HISTORIQUE_CLASSIFICATION
- **id_historique** UUID (PK)
- **id_zone** UUID [FK → ZONE_COTIERE]
- **classification_avant** ENUM('VERTE','ORANGE','ROUGE','NOIRE') [NULLABLE]
- **classification_apres** ENUM('VERTE','ORANGE','ROUGE','NOIRE')
- **date_changement** TIMESTAMP
- **id_expert_1** UUID [FK → UTILISATEUR]
- **id_expert_2** UUID [FK → UTILISATEUR, NULLABLE]
- **id_admin** UUID [FK → UTILISATEUR, NULLABLE]
- **recul_annuel_base** DECIMAL(6,3)
- **justification** TEXT
- **type_declencheur** ENUM('AUTOMATIQUE','MANUEL','URGENCE')

### ALERTE
- **id_alerte** UUID (PK)
- **id_zone** UUID [FK → ZONE_COTIERE]
- **id_releve_declencheur** UUID [FK → RELEVE_TERRAIN, NULLABLE]
- **type_alerte** ENUM('URGENTE','SURVEILLANCE','TEMPETE','FRAUDE')
- **niveau** ENUM('INFO','WARNING','CRITICAL')
- **titre** VARCHAR(200)
- **description** TEXT
- **valeur_mesuree** DECIMAL(8,3) [NULLABLE]
- **seuil_depasse** DECIMAL(8,3) [NULLABLE]
- **statut** ENUM('ACTIVE','ACQUITTEE','RESOLUE','FAUSSE') [DEFAULT 'ACTIVE']
- **id_createur** UUID [FK → UTILISATEUR]
- **id_traiteur** UUID [FK → UTILISATEUR, NULLABLE]
- **date_creation** TIMESTAMP
- **date_traitement** TIMESTAMP [NULLABLE]
- **notif_protection_civile** BOOLEAN [DEFAULT FALSE]

### PARCELLE
- **id_parcelle** UUID (PK)
- **reference_cadastrale** VARCHAR(50) [UNIQUE]
- **id_zone** UUID [FK → ZONE_COTIERE, NULLABLE]
- **geom_polygon** GEOMETRY(Polygon, 4326)
- **surface_m2** DECIMAL(12,2)
- **distance_trait_cote_m** DECIMAL(8,2) [NULLABLE]
- **proprietaire_nom** VARCHAR(200) [NULLABLE]
- **proprietaire_contact** VARCHAR(200) [NULLABLE]
- **classification_actuelle** ENUM('VERTE','ORANGE','ROUGE','NOIRE') [NULLABLE]
- **dans_dpm_100m** BOOLEAN [DEFAULT FALSE]
- **created_at** TIMESTAMP
- **updated_at** TIMESTAMP

### DEMANDE_PERMIS
- **id_demande** UUID (PK)
- **reference** VARCHAR(50) [UNIQUE]
- **id_demandeur** UUID [FK → UTILISATEUR]
- **id_zone** UUID [FK → ZONE_COTIERE]
- **id_parcelle** UUID [FK → PARCELLE]
- **date_depot** TIMESTAMP
- **type_projet** VARCHAR(150)
- **surface_construite_m2** DECIMAL(10,2)
- **nb_etages** INTEGER
- **statut** ENUM('EN_COURS','APPROUVE','REFUSE','SUSPENDU') [DEFAULT 'EN_COURS']
- **classification_zone_au_depot** ENUM('VERTE','ORANGE','ROUGE','NOIRE')
- **distance_trait_cote_m** DECIMAL(8,2)
- **blocage_automatique** BOOLEAN [DEFAULT FALSE]
- **motif_blocage** TEXT [NULLABLE]
- **id_urbaniste** UUID [FK → UTILISATEUR, NULLABLE]
- **date_decision** TIMESTAMP [NULLABLE]
- **motif_decision** TEXT [NULLABLE]
- **etude_geotechnique_requise** BOOLEAN [DEFAULT FALSE]
- **etude_geotechnique_fournie** BOOLEAN [DEFAULT FALSE]

### NOTIFICATION
- **id_notification** UUID (PK)
- **id_destinataire** UUID [FK → UTILISATEUR]
- **id_alerte** UUID [FK → ALERTE, NULLABLE]
- **id_demande** UUID [FK → DEMANDE_PERMIS, NULLABLE]
- **type_evenement** ENUM('REZONAGE','ALERTE','PERMIS','URGENCE')
- **canal** ENUM('EMAIL','SMS','IN_APP')
- **sujet** VARCHAR(200)
- **corps** TEXT
- **statut_envoi** ENUM('EN_ATTENTE','ENVOYE','ECHEC') [DEFAULT 'EN_ATTENTE']
- **date_creation** TIMESTAMP
- **date_envoi** TIMESTAMP [NULLABLE]

### AUDIT_LOG
- **id_log** UUID (PK)
- **id_utilisateur** UUID [FK → UTILISATEUR]
- **timestamp_action** TIMESTAMP
- **table_cible** VARCHAR(50)
- **id_enregistrement** UUID
- **action** ENUM('INSERT','UPDATE','DELETE','LOGIN','EXPORT')
- **champ_modifie** VARCHAR(100) [NULLABLE]
- **valeur_avant** TEXT [NULLABLE]
- **valeur_apres** TEXT [NULLABLE]
- **adresse_ip** INET
- **user_agent** VARCHAR(300) [NULLABLE]
- **motif** TEXT [NULLABLE]

### RAPPORT
- **id_rapport** UUID (PK)
- **id_zone** UUID [FK → ZONE_COTIERE]
- **id_auteur** UUID [FK → UTILISATEUR]
- **titre** VARCHAR(200)
- **type_rapport** ENUM('ANNUEL','POST_TEMPETE','EXPERTISE','URGENT')
- **periode_debut** DATE
- **periode_fin** DATE
- **contenu** TEXT
- **url_pdf** VARCHAR(500) [NULLABLE]
- **est_public** BOOLEAN [DEFAULT FALSE]
- **statut** ENUM('BROUILLON','PUBLIE','ARCHIVE') [DEFAULT 'BROUILLON']
- **date_publication** TIMESTAMP [NULLABLE]
- **created_at** TIMESTAMP

### CONFIGURATION_SEUILS
- **id_config** UUID (PK)
- **cle** VARCHAR(100) [UNIQUE]
- **valeur** VARCHAR(200)
- **type_valeur** ENUM('DECIMAL','INTEGER','BOOLEAN','STRING')
- **description** TEXT
- **categorie** VARCHAR(50)
- **modifiable_par** ENUM('ADMIN_ONLY','EXPERT_ADMIN')
- **id_modificateur** UUID [FK → UTILISATEUR, NULLABLE]
- **updated_at** TIMESTAMP

---

## 2. RELATIONS AVEC CARDINALITÉS

| Entité A | Cardinalité | Entité B | Description |
|----------|-------------|----------|-------------|
| ZONE_COTIERE | (1,1) ──── (0,N) | POINT_MESURE | Une zone contient plusieurs points |
| ZONE_COTIERE | (1,1) ──── (0,N) | HISTORIQUE_CLASSIFICATION | Une zone a un historique |
| ZONE_COTIERE | (1,1) ──── (0,N) | ALERTE | Une zone génère des alertes |
| ZONE_COTIERE | (1,1) ──── (0,N) | RAPPORT | Une zone a des rapports |
| ZONE_COTIERE | (1,1) ──── (0,N) | PARCELLE | Une zone contient des parcelles |
| ZONE_COTIERE | (1,1) ──── (0,N) | DEMANDE_PERMIS | Une zone concerne des permis |
| ZONE_COTIERE | (0,1) ──── (0,N) | UTILISATEUR | Une zone assignée à des agents |
| POINT_MESURE | (1,1) ──── (1,N) | RELEVE_TERRAIN | Un point a plusieurs relevés |
| POINT_MESURE | (1,1) ──── (0,N) | CALCUL_RECUL | Un point a des calculs |
| RELEVE_TERRAIN | (1,1) ──── (0,N) | PHOTO_RELEVE | Un relevé a des photos |
| RELEVE_TERRAIN (t1) | (1,1) ──── (0,N) | CALCUL_RECUL | Relevé utilisé comme t1 |
| RELEVE_TERRAIN (t2) | (1,1) ──── (0,N) | CALCUL_RECUL | Relevé utilisé comme t2 |
| RELEVE_TERRAIN | (0,1) ──── (0,N) | ALERTE | Un relevé déclenche une alerte |
| UTILISATEUR | (1,1) ──── (0,N) | RELEVE_TERRAIN | Un agent saisit des relevés |
| UTILISATEUR | (1,1) ──── (0,N) | AUDIT_LOG | Un utilisateur a des traces |
| UTILISATEUR | (1,1) ──── (0,N) | NOTIFICATION | Un utilisateur reçoit des notifs |
| UTILISATEUR | (1,1) ──── (0,N) | DEMANDE_PERMIS | Un utilisateur dépose des permis |
| UTILISATEUR | (1,1) ──── (0,N) | RAPPORT | Un auteur produit des rapports |
| PARCELLE | (1,1) ──── (0,N) | DEMANDE_PERMIS | Une parcelle a des demandes |
| ALERTE | (1,1) ──── (0,N) | NOTIFICATION | Une alerte génère des notifs |
| DEMANDE_PERMIS | (1,1) ──── (0,N) | NOTIFICATION | Un permis génère des notifs |

 
---

## 4. CONTRAINTES PRINCIPALES

### Contraintes CHECK

```sql
-- Auto-validation interdite
CHECK (RELEVE_TERRAIN.id_agent != RELEVE_TERRAIN.id_validateur)

-- Blocage automatique des permis
CHECK (DEMANDE_PERMIS.blocage_automatique = TRUE
       WHEN distance_trait_cote_m < 100 OR classification_zone_au_depot = 'ROUGE')

-- Facteur de risque
CHECK (ZONE_COTIERE.facteur_risque BETWEEN 1.0 AND 3.0)

-- Distance positive
CHECK (RELEVE_TERRAIN.distance_trait_cote > 0)

-- Calcul recul
CHECK (CALCUL_RECUL.id_releve_t1 != id_releve_t2)
CHECK (CALCUL_RECUL.duree_jours > 0)

-- Périodes valides
CHECK (RAPPORT.periode_fin > periode_debut)

-- Coordonnées GPS
CHECK (POINT_MESURE.latitude BETWEEN -90 AND 90)
CHECK (POINT_MESURE.longitude BETWEEN -180 AND 180)

-- AUDIT_LOG : pas de modification
CREATE RULE no_update_audit AS ON UPDATE TO AUDIT_LOG DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO AUDIT_LOG DO INSTEAD NOTHING;

-- HISTORIQUE_CLASSIFICATION : même règle
-- CALCUL_RECUL : seulement depuis relevés VALIDE
-- DEMANDE_PERMIS.classification_zone_au_depot : figé à l'INSERT

BEFORE UPDATE ON ZONE_COTIERE
WHEN (classification_actuelle = 'ROUGE' AND NEW.classification = 'VERTE')
THEN
    IF NOT EXISTS (
        SELECT 1 FROM HISTORIQUE_CLASSIFICATION 
        WHERE id_zone = NEW.id_zone 
        AND classification_apres = 'VERTE'
        AND id_expert_2 IS NOT NULL 
        AND id_admin IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Double validation obligatoire pour passage ROUGE→VERT';
    END IF;

-- Zones
CREATE INDEX idx_zone_classification ON ZONE_COTIERE(classification_actuelle, region);
CREATE INDEX idx_zone_recul ON ZONE_COTIERE(recul_annuel_moyen);

-- Points de mesure
CREATE INDEX idx_point_zone ON POINT_MESURE(id_zone, actif);
CREATE INDEX idx_point_coords ON POINT_MESURE USING GIST(geom_point);

-- Relevés
CREATE INDEX idx_releve_point_date ON RELEVE_TERRAIN(id_point, date_mesure DESC);
CREATE INDEX idx_releve_statut ON RELEVE_TERRAIN(statut_validation);
CREATE INDEX idx_releve_date ON RELEVE_TERRAIN(date_mesure);

-- Historique
CREATE INDEX idx_historique_zone_date ON HISTORIQUE_CLASSIFICATION(id_zone, date_changement DESC);

-- Alertes
CREATE INDEX idx_alerte_statut ON ALERTE(statut, niveau);
CREATE INDEX idx_alerte_zone ON ALERTE(id_zone, date_creation DESC);

-- Parcelles et permis
CREATE INDEX idx_parcelle_zone ON PARCELLE(id_zone, dans_dpm_100m);
CREATE INDEX idx_demande_statut ON DEMANDE_PERMIS(statut, date_depot);
CREATE INDEX idx_demande_parcelle ON DEMANDE_PERMIS(id_parcelle);

-- Notifications
CREATE INDEX idx_notification_destinataire ON NOTIFICATION(id_destinataire, date_creation DESC);

-- Audit
CREATE INDEX idx_audit_utilisateur ON AUDIT_LOG(id_utilisateur, timestamp_action DESC);
CREATE INDEX idx_audit_table ON AUDIT_LOG(table_cible, timestamp_action);
