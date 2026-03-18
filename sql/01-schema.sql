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
