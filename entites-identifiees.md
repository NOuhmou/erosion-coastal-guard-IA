# Entités identifiées - Erosion Coastal Guard
**Date:** 12/03/2026
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

[Coller ici le reste de la réponse de Claude avec toutes les descriptions de tables]
