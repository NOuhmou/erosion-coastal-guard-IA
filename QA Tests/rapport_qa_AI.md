# Rapport QA - Erosion Coastal Guard IA

Date: 2026-04-13

## Synthese

- Total des verifications checklist: 15
- Validees: 11
- Non validees: 4

---

## RQA-01 - Initialisation plateforme (DB + Seeds + Backend + Frontend)

Objectif:
Verifier en un seul scenario que la base est installee, les seeds sont charges, le backend demarre correctement et le frontend est accessible.

Etapes:

1. Verifier l'acces a la base de donnees et aux tables principales.
2. Confirmer la presence des donnees de seed minimales.
3. Demarrer le backend et verifier les logs de demarrage.
4. Ouvrir l'URL du frontend et verifier le chargement initial.

Resultat attendu:
La base est accessible, les seeds sont presents, le backend repond sans erreur et le frontend est charge correctement.

Application:
VALIDE

---

## RQA-02 - Comptes de test et authentification

Objectif:
Verifier la disponibilite des comptes de test et la presence d'un mecanisme d'authentification exploitable.

Etapes:

1. Tenter l'authentification avec les comptes declares.
2. Verifier les roles associes.

Resultat attendu:
Les comptes se connectent avec les permissions attendues.

Application:
NON VALIDE

---

## RQA-03 - Endpoint historique GPS

Objectif:
Verifier l'exposition de l'endpoint historique.

Etapes:

1. Interroger `/api/historical-data`.
2. Verifier le retour des series par zone et par annee.

Resultat attendu:
L'endpoint retourne des donnees reelles et structurees.

Application:
VALIDE

---

## RQA-04 - Endpoint classification

Objectif:
Verifier l'exposition de l'endpoint de classification.

Etapes:

1. Interroger `/api/classification-history`.
2. Verifier l'ordre chronologique et les champs retournes.

Resultat attendu:
L'endpoint retourne l'historique de classification depuis la base.

Application:
VALIDE

---

## RQA-05 - Endpoint audit

Objectif:
Verifier l'exposition de l'endpoint d'audit.

Etapes:

1. Interroger `/api/audit-logs`.
2. Verifier la presence des actions et horodatages.

Resultat attendu:
Les logs sont lisibles et issus des donnees persistantes.

Application:
VALIDE

---

## RQA-06 - Dashboard coherent

Objectif:
Verifier la coherence des valeurs du dashboard.

Etapes:

1. Ouvrir le dashboard.
2. Comparer les valeurs avec la base.

Resultat attendu:
Les KPI et valeurs affichees sont coherentes.

Application:
NON VALIDE

---

## RQA-07 - Derniere mesure affichee

Objectif:
Verifier que la derniere mesure metier est celle affichee dans les vues.

Etapes:

1. Comparer les mesures disponibles pour une zone.
2. Verifier la mesure retenue par l'interface.

Resultat attendu:
La derniere mesure valide est affichee.

Application:
NON VALIDE

---

## RQA-08 - Recalcul automatique apres modification

Objectif:
Verifier le recalcul et la mise a jour du recul apres ecriture.

Etapes:

1. Effectuer une mise a jour geospatiale.
2. Verifier la nouvelle mesure de recul.

Resultat attendu:
Le recul est recalcule et la nouvelle valeur est visible.

Application:
NON VALIDE

---

## RQA-09 - Cohérence zone, point, historique et recul

Objectif:
Verifier la coherence entre les entites de suivi.

Etapes:

1. Verifier les relations entre zone, point et historique.
2. Confirmer la coherence du recul associe.

Resultat attendu:
Les relations sont coherentes et les donnees correspondent au suivi terrain.

Application:
VALIDE

---

## RQA-10 - Pas de perte de donnees apres operation

Objectif:
Verifier la persistance des donnees apres creation et mise a jour.

Etapes:

1. Creer ou modifier une donnee metier.
2. Recharger les vues et verifier la persistence.

Resultat attendu:
Les donnees restent presentes et lisibles.

Application:
VALIDE

---

## RQA-11 - KPI zone rouge

Objectif:
Verifier que le KPI zone rouge repose sur une somme reelle.

Etapes:

1. Lire l'indicateur de surface en zone rouge.
2. Comparer avec `longueur_km` en base.

Resultat attendu:
Le KPI correspond a la somme reelle des zones rouges.

Application:
VALIDE

---

## RQA-12 - Tableau audit reel

Objectif:
Verifier que le tableau audit provient des donnees reelles.

Etapes:

1. Ouvrir le tableau audit.
2. Comparer les lignes avec l'historique persistant.

Resultat attendu:
Le tableau affiche les vrais evenements persistants.

Application:
VALIDE

---

## Conclusion

Le rapport QA base sur la checklist indique une validation partielle (11/15).
Les points encore non valides concernent l'authentification de test, la coherence du dashboard, l'affichage de la derniere mesure et le recalcul automatique apres modification.
