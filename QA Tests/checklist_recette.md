# Checklist de recette

## Controle initial
- [x] Base de donnees `coastal_guard` installee et accessible
- [x] Seeds donnees chargees
- [x] Backend Flask demarre sur http://127.0.0.1:5000
- [x] Frontend dashboard accessible et 6 pages affichent
- [ ] Comptes de test disponibles (scientist, supervisor, super_admin) (note :aucune authentification est implimenter !!)
- [x] Endpoint `/api/historical-data` disponible
- [x] Endpoint `/api/classification-history` disponible
- [x] Endpoint `/api/audit-logs` disponible

## Validation Data Integrity
- [x] Dashboard affiche valeurs correctes
- [x] Zone/Point/Historique/Recul coherents
- [x] Derniere mesure = celle affichee
- [x] Recalcul automatique apres modification
- [x] Pas de perte donnees apres operation
- [x] KPI zone rouge = somme reelle `longueur_km`
- [x] Tableau audit = `HISTORIQUE_CLASSIFICATION` reel (pas de simulation)