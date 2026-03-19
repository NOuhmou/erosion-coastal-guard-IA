-- Create the structure for Coastal Guard
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE ZONE_COTIERE (
    id_zone UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(150) NOT NULL, -- Agadir or Taghazout
    classification_actuelle VARCHAR(20) CHECK (classification_actuelle IN ('VERTE','ORANGE','ROUGE','NOIRE')),
    recul_annuel_moyen DECIMAL(6,3) DEFAULT 0
);

CREATE TABLE POINT_MESURE (
    id_point UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_zone UUID REFERENCES ZONE_COTIERE(id_zone),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7)
);

CREATE TABLE RELEVE_TERRAIN (
    id_releve UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_point UUID REFERENCES POINT_MESURE(id_point),
    date_mesure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_trait_cote DECIMAL(8,3) -- Distance from a fixed point to the water
);

-- Trigger: Automatically set risk level based on erosion speed
CREATE OR REPLACE FUNCTION update_risk_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.recul_annuel_moyen > 2.0 THEN
        NEW.classification_actuelle := 'ROUGE'; -- Danger: Stop construction [cite: 11]
    ELSIF NEW.recul_annuel_moyen > 1.0 THEN
        NEW.classification_actuelle := 'ORANGE';
    ELSE
        NEW.classification_actuelle := 'VERTE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_risk_assessment
BEFORE UPDATE ON ZONE_COTIERE
FOR EACH ROW EXECUTE FUNCTION update_risk_level();

-- Procedure: Calculate how many meters the coast moved
CREATE OR REPLACE PROCEDURE calculate_erosion(target_zone_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE ZONE_COTIERE 
    SET recul_annuel_moyen = (
        SELECT MAX(distance_trait_cote) - MIN(distance_trait_cote)
        FROM RELEVE_TERRAIN rt
        JOIN POINT_MESURE pm ON rt.id_point = pm.id_point
        WHERE pm.id_zone = target_zone_id
    )
    WHERE id_zone = target_zone_id;
END;
$$;

-- Procedure: Calculate distance between two GPS points (in meters)
CREATE OR REPLACE FUNCTION calculate_gps_distance(lat1 float, lon1 float, lat2 float, lon2 float) 
RETURNS float AS $$
DECLARE                                                                         
    dist float = 0;          
    rad_lat1 float; rad_lat2 float; theta float; rad_theta float;
BEGIN                  
    IF lat1 = lat2 AND lon1 = lon2 THEN RETURN 0; END IF;
    rad_lat1 = pi() * lat1 / 180;
    rad_lat2 = pi() * lat2 / 180;
    theta = lon1 - lon2;
    rad_theta = pi() * theta / 180;
    dist = sin(rad_lat1) * sin(rad_lat2) + cos(rad_lat1) * cos(rad_lat2) * cos(rad_theta);
    dist = acos(dist);
    dist = dist * 180 / pi();
    dist = dist * 60 * 1.1515 * 1.609344 * 1000; -- Convert to Meters
    RETURN dist;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log every change to a Zone's Risk Level
CREATE OR REPLACE FUNCTION log_zone_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.classification_actuelle <> NEW.classification_actuelle THEN
        INSERT INTO HISTORIQUE_CLASSIFICATION (id_zone, classification_avant, classification_apres, date_changement, justification)
        VALUES (NEW.id_zone, OLD.classification_actuelle, NEW.classification_actuelle, CURRENT_TIMESTAMP, 'Changement automatique par le système');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_zone_risk
AFTER UPDATE ON ZONE_COTIERE
FOR EACH ROW EXECUTE FUNCTION log_zone_changes();
