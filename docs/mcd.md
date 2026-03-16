# Modèle Conceptuel de Données (MCD) - Erosion Coastal Guard
**Date:** 16/03/2026
**Source:** Claude (voir prompts/prompt-mcd.md)

---

## 1. ENTITÉS ET ATTRIBUTS

**Conventions** : 
- `#` = clé primaire
- `*` = attribut obligatoire
- `o` = attribut optionnel
- `FK` = clé étrangère
ZONE_COTIERE

id_zone UUID
code VARCHAR(20) [UNIQUE]

nom VARCHAR(150)

geom_polygon GEOMETRY(Polygon)

type_cote ENUM('FALAISE','PLAGE_SABLE','PLAGE_GALETS','MIXTE')

classification_actuelle ENUM('VERTE','ORANGE','ROUGE','NOIRE')
o classification_precedente ENUM

facteur_risque DECIMAL(3,1) [DEFAULT 1.0]
o recul_annuel_moyen DECIMAL(6,3) [calculé auto]
o recul_projete_100ans DECIMAL(8,3) [calculé auto]

region VARCHAR(100)

UTILISATEUR

id_utilisateur UUID
nom VARCHAR(100)

prenom VARCHAR(100)

email VARCHAR(255) [UNIQUE]

mot_de_passe_hash VARCHAR(255)

role ENUM('AGENT','EXPERT','URBANISTE','ADMIN','PUBLIC')
o telephone VARCHAR(20)
o organisation VARCHAR(150)
o zone_assignee_id UUID [FK→ZONE_COTIERE]

actif BOOLEAN [DEFAULT TRUE]

created_at TIMESTAMP
o derniere_connexion TIMESTAMP

POINT_MESURE
