-- Erosion Coastal Guard IA - Database Schema
-- Responsabilités: Procedures, Triggers, Business Logic, DB Connection

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS postgis; -- Optional, depends on environment

-- 1. UTILISATEUR
CREATE TABLE UTILISATEUR (
    id_utilisateur UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('AGENT', 'EXPERT', 'URBANISTE', 'ADMIN', 'PUBLIC')) DEFAULT 'PUBLIC',
    organisation VARCHAR(150),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ZONE_COTIERE
CREATE TABLE ZONE_COTIERE (
    id_zone UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type_cote VARCHAR(20) CHECK (type_cote IN ('FALAISE','PLAGE_SABLE','PLAGE_GALETS','MIXTE')),
    classification_actuelle VARCHAR(20) CHECK (classification_actuelle IN ('VERTE','ORANGE','ROUGE','NOIRE')) DEFAULT 'VERTE',
    recul_annuel_moyen DECIMAL(6,3) DEFAULT 0,
    recul_projete_100ans DECIMAL(8,3) DEFAULT 0,
    distance_moyenne_dpm DECIMAL(8,3) DEFAULT 150, -- Distance to Public Maritime Domain
    facteur_risque DECIMAL(3,1) DEFAULT 1.0,
    longueur_km DECIMAL(8,3),
    region VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. POINT_MESURE
CREATE TABLE POINT_MESURE (
    id_point UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_zone UUID REFERENCES ZONE_COTIERE(id_zone) ON DELETE CASCADE,
    code_point VARCHAR(30) UNIQUE NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    description_repere TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. RELEVE_TERRAIN
CREATE TABLE RELEVE_TERRAIN (
    id_releve UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_point UUID REFERENCES POINT_MESURE(id_point) ON DELETE CASCADE,
    id_agent UUID REFERENCES UTILISATEUR(id_utilisateur),
    date_mesure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_trait_cote DECIMAL(8,3) NOT NULL,
    methode_mesure VARCHAR(20) DEFAULT 'GPS_DGPS',
    coefficient_maree DECIMAL(4,2),
    conditions_meteo VARCHAR(20),
    statut_validation VARCHAR(20) CHECK (statut_validation IN ('EN_ATTENTE','VALIDE','REJETE','SUSPECT')) DEFAULT 'EN_ATTENTE',
    notes_terrain TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. PARCELLE
CREATE TABLE PARCELLE (
    id_parcelle UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_cadastrale VARCHAR(50) UNIQUE NOT NULL,
    id_zone UUID REFERENCES ZONE_COTIERE(id_zone),
    surface_m2 DECIMAL(12,2),
    proprietaire_nom VARCHAR(200),
    distance_trait_cote_m DECIMAL(8,2)
);

-- 6. DEMANDE_PERMIS
CREATE TABLE DEMANDE_PERMIS (
    id_demande UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_demandeur UUID REFERENCES UTILISATEUR(id_utilisateur),
    id_zone UUID REFERENCES ZONE_COTIERE(id_zone),
    id_parcelle UUID REFERENCES PARCELLE(id_parcelle),
    nom_projet VARCHAR(255),
    statut VARCHAR(20) CHECK (statut IN ('EN_COURS','APPROUVE','REFUSE','SUSPENDU')) DEFAULT 'EN_COURS',
    date_depot TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_trait_cote_m DECIMAL(8,2),
    blocage_automatique BOOLEAN DEFAULT FALSE,
    motif_blocage TEXT
);

-- 7. HISTORIQUE_CLASSIFICATION
CREATE TABLE HISTORIQUE_CLASSIFICATION (
    id_historique UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_zone UUID REFERENCES ZONE_COTIERE(id_zone) ON DELETE CASCADE,
    classification_avant VARCHAR(20),
    classification_apres VARCHAR(20),
    date_changement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    justification TEXT,
    id_expert UUID REFERENCES UTILISATEUR(id_utilisateur)
);

-- 8. AUDIT_LOG
CREATE TABLE AUDIT_LOG (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_utilisateur UUID REFERENCES UTILISATEUR(id_utilisateur),
    table_cible VARCHAR(50),
    id_enregistrement UUID,
    action VARCHAR(20), -- INSERT, UPDATE, DELETE
    valeur_avant TEXT,
    valeur_apres TEXT,
    timestamp_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- STORED PROCEDURES ---

-- Procedure: Calculate erosion and update zone (Rule R1, R2)
CREATE OR REPLACE PROCEDURE calculate_erosion_stats(target_zone_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
    avg_recul DECIMAL(6,3);
BEGIN
    SELECT COALESCE(AVG(diff), 0) INTO avg_recul
    FROM (
        SELECT 
            id_point,
            (MAX(distance_trait_cote) - MIN(distance_trait_cote)) / 
            GREATEST(EXTRACT(YEAR FROM AGE(MAX(date_mesure), MIN(date_mesure))), 0.1) as diff
        FROM RELEVE_TERRAIN rt
        JOIN POINT_MESURE pm ON rt.id_point = pm.id_point
        WHERE pm.id_zone = target_zone_id AND rt.statut_validation = 'VALIDE'
        GROUP BY id_point
    ) sub;

    UPDATE ZONE_COTIERE 
    SET recul_annuel_moyen = avg_recul,
        updated_at = CURRENT_TIMESTAMP
    WHERE id_zone = target_zone_id;
END;
$$;

-- --- TRIGGERS ---

-- Trigger: Auto-calculate 100-year projection and update classification (Rule R3)
CREATE OR REPLACE FUNCTION trg_func_update_risk()
RETURNS TRIGGER AS $$
BEGIN
    NEW.recul_projete_100ans := NEW.recul_annuel_moyen * 100 * NEW.facteur_risque;
    
    IF NEW.recul_projete_100ans > 30.0 OR NEW.distance_moyenne_dpm < 50.0 THEN
        NEW.classification_actuelle := 'ROUGE';
    ELSIF NEW.recul_projete_100ans >= 10.0 OR NEW.distance_moyenne_dpm <= 100.0 THEN
        NEW.classification_actuelle := 'ORANGE';
    ELSE
        NEW.classification_actuelle := 'VERTE';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_risk_update
BEFORE UPDATE OF recul_annuel_moyen, distance_moyenne_dpm, facteur_risque ON ZONE_COTIERE
FOR EACH ROW EXECUTE FUNCTION trg_func_update_risk();

-- Trigger: Log classification changes to history (Rule 4.3)
CREATE OR REPLACE FUNCTION trg_func_log_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.classification_actuelle <> NEW.classification_actuelle THEN
        INSERT INTO HISTORIQUE_CLASSIFICATION (id_zone, classification_avant, classification_apres, justification)
        VALUES (NEW.id_zone, OLD.classification_actuelle, NEW.classification_actuelle, 'Mise à jour automatique par calcul de recul');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_history_log
AFTER UPDATE ON ZONE_COTIERE
FOR EACH ROW EXECUTE FUNCTION trg_func_log_history();

-- Trigger: Block permits in RED zones or < 100m from coast (Rule R10, R11)
CREATE OR REPLACE FUNCTION trg_func_validate_permit()
RETURNS TRIGGER AS $$
DECLARE
    zone_class VARCHAR(20);
BEGIN
    SELECT classification_actuelle INTO zone_class FROM ZONE_COTIERE WHERE id_zone = NEW.id_zone;
    
    IF zone_class = 'ROUGE' OR NEW.distance_trait_cote_m < 100 THEN
        NEW.statut := 'REFUSE';
        NEW.blocage_automatique := TRUE;
        NEW.motif_blocage := 'Interdiction légale (Loi 81-12) ou risque élevé (Zone Rouge)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_permit_validation
BEFORE INSERT ON DEMANDE_PERMIS
FOR EACH ROW EXECUTE FUNCTION trg_func_validate_permit();

-- Trigger: Audit Log for sensitive tables
CREATE OR REPLACE FUNCTION trg_func_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO AUDIT_LOG (table_cible, id_enregistrement, action, valeur_apres)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id_zone, NEW.id_utilisateur, NEW.id_demande), TG_OP, row_to_json(NEW)::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_zone AFTER UPDATE ON ZONE_COTIERE FOR EACH ROW EXECUTE FUNCTION trg_func_audit();
CREATE TRIGGER trg_audit_permis AFTER INSERT OR UPDATE ON DEMANDE_PERMIS FOR EACH ROW EXECUTE FUNCTION trg_func_audit();
