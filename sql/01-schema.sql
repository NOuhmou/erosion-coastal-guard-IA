-- =====================================================
-- BASE DE DONNÉES : EROSION COASTAL GUARD
-- VERSION FINALE - 09 AVRIL 2026
-- =====================================================

CREATE DATABASE IF NOT EXISTS coastal_guard;
USE coastal_guard;

-- =====================================================
-- 1. TABLE UTILISATEUR
-- =====================================================
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

-- =====================================================
-- 2. TABLE ZONE_COTIERE
-- =====================================================
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

-- =====================================================
-- 3. TABLE POINT_MESURE
-- =====================================================
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

-- =====================================================
-- 4. TABLE RELEVE_TERRAIN
-- =====================================================
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

-- =====================================================
-- 5. TABLE PARCELLE
-- =====================================================
CREATE TABLE PARCELLE (
    id_parcelle CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reference_cadastrale VARCHAR(50) UNIQUE NOT NULL,
    id_zone CHAR(36),
    surface_m2 DECIMAL(12,2),
    proprietaire_nom VARCHAR(200),
    distance_trait_cote_m DECIMAL(8,2),
    FOREIGN KEY (id_zone) REFERENCES ZONE_COTIERE(id_zone)
);

-- =====================================================
-- 6. TABLE DEMANDE_PERMIS
-- =====================================================
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

-- =====================================================
-- 7. TABLE HISTORIQUE_CLASSIFICATION
-- =====================================================
CREATE TABLE HISTORIQUE_CLASSIFICATION (
    id_historique CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    id_zone CHAR(36),
    classification_avant VARCHAR(20),
    classification_apres VARCHAR(20),
    date_changement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    justification TEXT,
    FOREIGN KEY (id_zone) REFERENCES ZONE_COTIERE(id_zone)
);

-- =====================================================
-- 8. TABLE AUDIT_LOG
-- =====================================================
CREATE TABLE AUDIT_LOG (
    id_log CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    table_cible VARCHAR(50),
    id_enregistrement CHAR(36),
    action VARCHAR(20),
    valeur_apres TEXT,
    timestamp_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PROCÉDURE STOCKÉE : Calculer les statistiques d'érosion
-- =====================================================
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

-- =====================================================
-- TRIGGER 1 : Classification automatique des zones
-- =====================================================
DELIMITER //

CREATE TRIGGER trg_risk_update
BEFORE UPDATE ON ZONE_COTIERE
FOR EACH ROW
BEGIN
    SET NEW.recul_projete_100ans = NEW.recul_annuel_moyen * 100 * NEW.facteur_risque;

    -- Règle ROUGE : recul > 30m OU distance_mer < 50m
    IF NEW.recul_projete_100ans > 30 OR NEW.distance_moyenne_dpm < 50 THEN
        SET NEW.classification_actuelle = 'ROUGE';
    -- Règle ORANGE : recul > 10m OU distance_mer < 100m
    ELSEIF NEW.recul_projete_100ans >= 10 OR NEW.distance_moyenne_dpm <= 100 THEN
        SET NEW.classification_actuelle = 'ORANGE';
    ELSE
        SET NEW.classification_actuelle = 'VERTE';
    END IF;
END //

DELIMITER ;

-- =====================================================
-- TRIGGER 2 : Historique des changements
-- =====================================================
DELIMITER //

CREATE TRIGGER trg_history_log
AFTER UPDATE ON ZONE_COTIERE
FOR EACH ROW
BEGIN
    IF OLD.classification_actuelle <> NEW.classification_actuelle THEN
        INSERT INTO HISTORIQUE_CLASSIFICATION
        (id_historique, id_zone, classification_avant, classification_apres, justification)
        VALUES (UUID(), NEW.id_zone, OLD.classification_actuelle, NEW.classification_actuelle,
        'Mise à jour automatique par trigger');
    END IF;
END //

DELIMITER ;

-- =====================================================
-- TRIGGER 3 : Validation automatique des permis
-- =====================================================
DELIMITER //

CREATE TRIGGER trg_permit_validation
BEFORE INSERT ON DEMANDE_PERMIS
FOR EACH ROW
BEGIN
    DECLARE zone_class VARCHAR(20);

    SELECT classification_actuelle INTO zone_class
    FROM ZONE_COTIERE WHERE id_zone = NEW.id_zone;

    -- Règle R10 + R11 : Zone ROUGE ou distance < 100m
    IF zone_class = 'ROUGE' OR NEW.distance_trait_cote_m < 100 THEN
        SET NEW.statut = 'REFUSE';
        SET NEW.blocage_automatique = TRUE;
        SET NEW.motif_blocage = 'Zone rouge ou distance < 100m (Loi 81-12)';
    -- Règle R12 : Zone ORANGE nécessite étude géotechnique
    ELSEIF zone_class = 'ORANGE' THEN
        SET NEW.etude_geotechnique_requise = TRUE;
    END IF;
END //

DELIMITER ;

-- =====================================================
-- DONNÉES DE TEST
-- =====================================================

-- 1. Zones
INSERT INTO ZONE_COTIERE (id_zone, nom, code, type_cote, classification_actuelle, recul_annuel_moyen, distance_moyenne_dpm, facteur_risque, longueur_km, region)
VALUES 
(UUID(), 'Agadir Centre', 'AG-001', 'URBAINE', 'ROUGE', 2.3, 45, 1.5, 5.2, 'Souss-Massa'),
(UUID(), 'Taghazout Bay', 'TG-001', 'SABLEUSE', 'ORANGE', 1.9, 85, 1.2, 3.8, 'Souss-Massa'),
(UUID(), 'Cap Ghir', 'CG-001', 'ROCHEUSE', 'VERTE', 0.7, 180, 0.8, 2.5, 'Souss-Massa'),
(UUID(), 'Anza Plage', 'AN-001', 'SABLEUSE', 'ORANGE', 2.1, 65, 1.3, 1.5, 'Souss-Massa'),
(UUID(), 'Oued Souss', 'OS-001', 'ESTUAIRE', 'ROUGE', 3.2, 30, 1.8, 4.0, 'Souss-Massa');

-- 2. Points de mesure
INSERT INTO POINT_MESURE (id_point, id_zone, code_point, latitude, longitude, description_repere, actif)
VALUES 
(UUID(), (SELECT id_zone FROM ZONE_COTIERE WHERE code = 'AG-001'), 'PT-AG-01', 30.4215, -9.6185, 'Plage principale', TRUE),
(UUID(), (SELECT id_zone FROM ZONE_COTIERE WHERE code = 'AG-001'), 'PT-AG-02', 30.4220, -9.6190, 'Zone portuaire', TRUE),
(UUID(), (SELECT id_zone FROM ZONE_COTIERE WHERE code = 'TG-001'), 'PT-TG-01', 30.5425, -9.7025, 'Baie nord', TRUE),
(UUID(), (SELECT id_zone FROM ZONE_COTIERE WHERE code = 'CG-001'), 'PT-CG-01', 30.6325, -9.8915, 'Falaise sud', TRUE),
(UUID(), (SELECT id_zone FROM ZONE_COTIERE WHERE code = 'AN-001'), 'PT-AN-01', 30.4405, -9.6475, 'Plage d''Anza', TRUE),
(UUID(), (SELECT id_zone FROM ZONE_COTIERE WHERE code = 'OS-001'), 'PT-OS-01', 30.3675, -9.5835, 'Embouchure', TRUE);

-- 3. Utilisateurs (agents)
INSERT INTO UTILISATEUR (id_utilisateur, nom, prenom, email, mot_de_passe_hash, role, organisation)
VALUES 
(UUID(), 'Admin', 'Système', 'admin@coastal.ma', 'admin_hash', 'ADMIN', 'ANP'),
(UUID(), 'Martin', 'Sophie', 'sophie.martin@coastal.ma', 'agent_hash', 'AGENT', 'DREAL'),
(UUID(), 'Benali', 'Karim', 'karim.benali@coastal.ma', 'agent_hash', 'AGENT', 'ONEE');

-- 4. Relevés terrain
INSERT INTO RELEVE_TERRAIN (id_releve, id_point, id_agent, distance_trait_cote, date_mesure, methode_mesure, statut_validation)
VALUES 
-- Agadir Centre
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-AG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 45.2, '2024-01-15', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-AG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 47.5, '2025-01-20', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-AG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 49.8, '2026-01-10', 'GPS_DGPS', 'VALIDE'),
-- Taghazout
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-TG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'sophie.martin@coastal.ma'), 85.0, '2024-02-10', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-TG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'sophie.martin@coastal.ma'), 86.5, '2025-02-15', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-TG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'sophie.martin@coastal.ma'), 87.9, '2026-01-20', 'GPS_DGPS', 'VALIDE'),
-- Cap Ghir
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-CG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 180.0, '2024-03-05', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-CG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 180.5, '2025-03-10', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-CG-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 180.7, '2026-02-01', 'GPS_DGPS', 'VALIDE'),
-- Anza
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-AN-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'sophie.martin@coastal.ma'), 65.0, '2024-04-12', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-AN-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'sophie.martin@coastal.ma'), 66.8, '2025-04-18', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-AN-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'sophie.martin@coastal.ma'), 67.1, '2026-02-15', 'GPS_DGPS', 'VALIDE'),
-- Oued Souss
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-OS-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 30.0, '2024-05-20', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-OS-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 32.5, '2025-05-25', 'GPS_DGPS', 'VALIDE'),
(UUID(), (SELECT id_point FROM POINT_MESURE WHERE code_point = 'PT-OS-01'), (SELECT id_utilisateur FROM UTILISATEUR WHERE email = 'karim.benali@coastal.ma'), 33.2, '2026-02-20', 'GPS_DGPS', 'VALIDE');

-- 5. Déclencher le calcul des statistiques
UPDATE ZONE_COTIERE SET recul_annuel_moyen = recul_annuel_moyen;

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================
SELECT '✅ Base de données créée avec succès !' as Status;
SELECT COUNT(*) as nb_zones FROM ZONE_COTIERE;
SELECT COUNT(*) as nb_points FROM POINT_MESURE;
SELECT COUNT(*) as nb_releves FROM RELEVE_TERRAIN;
SELECT COUNT(*) as nb_utilisateurs FROM UTILISATEUR;
