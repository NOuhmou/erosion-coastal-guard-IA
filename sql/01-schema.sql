CREATE DATABASE coastal_guard;
USE coastal_guard;

-- 1. UTILISATEUR
CREATE TABLE UTILISATEUR (
    id_utilisateur CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'PUBLIC',
    organisation VARCHAR(150),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ZONE_COTIERE
CREATE TABLE ZONE_COTIERE (
    id_zone CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type_cote VARCHAR(20),
    classification_actuelle VARCHAR(20) DEFAULT 'VERTE',
    recul_annuel_moyen DECIMAL(6,3) DEFAULT 0,
    recul_projete_100ans DECIMAL(8,3) DEFAULT 0,
    distance_moyenne_dpm DECIMAL(8,3) DEFAULT 150,
    facteur_risque DECIMAL(3,1) DEFAULT 1.0,
    longueur_km DECIMAL(8,3),
    region VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. POINT_MESURE
CREATE TABLE POINT_MESURE (
    id_point CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_zone CHAR(36),
    code_point VARCHAR(30) UNIQUE NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    description_repere TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_zone) REFERENCES ZONE_COTIERE(id_zone) ON DELETE CASCADE
);

-- 4. RELEVE_TERRAIN
CREATE TABLE RELEVE_TERRAIN (
    id_releve CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_point CHAR(36),
    id_agent CHAR(36),
    date_mesure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_trait_cote DECIMAL(8,3) NOT NULL,
    methode_mesure VARCHAR(20),
    coefficient_maree DECIMAL(4,2),
    conditions_meteo VARCHAR(20),
    statut_validation VARCHAR(20) DEFAULT 'EN_ATTENTE',
    notes_terrain TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_point) REFERENCES POINT_MESURE(id_point) ON DELETE CASCADE,
    FOREIGN KEY (id_agent) REFERENCES UTILISATEUR(id_utilisateur)
);

-- 5. PARCELLE
CREATE TABLE PARCELLE (
    id_parcelle CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reference_cadastrale VARCHAR(50) UNIQUE NOT NULL,
    id_zone CHAR(36),
    surface_m2 DECIMAL(12,2),
    proprietaire_nom VARCHAR(200),
    distance_trait_cote_m DECIMAL(8,2),
    FOREIGN KEY (id_zone) REFERENCES ZONE_COTIERE(id_zone)
);

-- 6. DEMANDE_PERMIS
CREATE TABLE DEMANDE_PERMIS (
    id_demande CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_demandeur CHAR(36),
    id_zone CHAR(36),
    id_parcelle CHAR(36),
    nom_projet VARCHAR(255),
    statut VARCHAR(20) DEFAULT 'EN_COURS',
    date_depot TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_trait_cote_m DECIMAL(8,2),
    blocage_automatique BOOLEAN DEFAULT FALSE,
    motif_blocage TEXT,
    FOREIGN KEY (id_demandeur) REFERENCES UTILISATEUR(id_utilisateur),
    FOREIGN KEY (id_zone) REFERENCES ZONE_COTIERE(id_zone),
    FOREIGN KEY (id_parcelle) REFERENCES PARCELLE(id_parcelle)
);

-- 7. HISTORIQUE_CLASSIFICATION
CREATE TABLE HISTORIQUE_CLASSIFICATION (
    id_historique CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_zone CHAR(36),
    classification_avant VARCHAR(20),
    classification_apres VARCHAR(20),
    date_changement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    justification TEXT,
    FOREIGN KEY (id_zone) REFERENCES ZONE_COTIERE(id_zone)
);

-- 8. AUDIT_LOG
CREATE TABLE AUDIT_LOG (
    id_log CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    table_cible VARCHAR(50),
    id_enregistrement CHAR(36),
    action VARCHAR(20),
    valeur_apres TEXT,
    timestamp_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- PROCEDURE
-- ======================
DELIMITER //

CREATE PROCEDURE calculate_erosion_stats(IN target_zone_id CHAR(36))
BEGIN
    DECLARE avg_recul DECIMAL(6,3);

    SELECT IFNULL(AVG(diff),0) INTO avg_recul
    FROM (
        SELECT 
            id_point,
            (MAX(distance_trait_cote) - MIN(distance_trait_cote)) /
            GREATEST(TIMESTAMPDIFF(YEAR, MIN(date_mesure), MAX(date_mesure)),1) as diff
        FROM RELEVE_TERRAIN rt
        JOIN POINT_MESURE pm ON rt.id_point = pm.id_point
        WHERE pm.id_zone = target_zone_id AND rt.statut_validation = 'VALIDE'
        GROUP BY id_point
    ) sub;

    UPDATE ZONE_COTIERE 
    SET recul_annuel_moyen = avg_recul
    WHERE id_zone = target_zone_id;
END //

DELIMITER ;

-- ======================
-- TRIGGER RISK
-- ======================
DELIMITER //

CREATE TRIGGER trg_risk_update
BEFORE UPDATE ON ZONE_COTIERE
FOR EACH ROW
BEGIN
    SET NEW.recul_projete_100ans = NEW.recul_annuel_moyen * 100 * NEW.facteur_risque;

    IF NEW.recul_projete_100ans > 30 OR NEW.distance_moyenne_dpm < 50 THEN
        SET NEW.classification_actuelle = 'ROUGE';
    ELSEIF NEW.recul_projete_100ans >= 10 OR NEW.distance_moyenne_dpm <= 100 THEN
        SET NEW.classification_actuelle = 'ORANGE';
    ELSE
        SET NEW.classification_actuelle = 'VERTE';
    END IF;
END //

DELIMITER ;

-- ======================
-- TRIGGER HISTORIQUE
-- ======================
DELIMITER //

CREATE TRIGGER trg_history_log
AFTER UPDATE ON ZONE_COTIERE
FOR EACH ROW
BEGIN
    IF OLD.classification_actuelle <> NEW.classification_actuelle THEN
        INSERT INTO HISTORIQUE_CLASSIFICATION
        (id_historique, id_zone, classification_avant, classification_apres, justification)
        VALUES (UUID(), NEW.id_zone, OLD.classification_actuelle, NEW.classification_actuelle,
        'Mise à jour automatique');
    END IF;
END //

DELIMITER ;

-- ======================
-- TRIGGER PERMIS
-- ======================
DELIMITER //

CREATE TRIGGER trg_permit_validation
BEFORE INSERT ON DEMANDE_PERMIS
FOR EACH ROW
BEGIN
    DECLARE zone_class VARCHAR(20);

    SELECT classification_actuelle INTO zone_class
    FROM ZONE_COTIERE WHERE id_zone = NEW.id_zone;

    IF zone_class = 'ROUGE' OR NEW.distance_trait_cote_m < 100 THEN
        SET NEW.statut = 'REFUSE';
        SET NEW.blocage_automatique = TRUE;
        SET NEW.motif_blocage = 'Zone rouge ou distance < 100m';
    END IF;
END //

DELIMITER ;
