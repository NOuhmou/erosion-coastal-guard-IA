# Rapport de transparence AI - Prompts de developpement

Date: 2026-04-13
Projet: Erosion Coastal Guard IA
Perimetre: prompts utilises pendant le developpement du projet

## 1) Objet

Ce document presente une vision consolidee des prompts de developpement utilises sur le projet IA.
Il ne reproduit pas les prompts bruts mot a mot, mais decrit les familles de demandes, les resultats obtenus, les ecarts observes et les corrections appliquees.

## 2) Prompts de developpement

### 2.1 Backend API et architecture

Intentions de prompts:

- Generer une API Flask avec endpoints pour les zones, les points, les historiques et les mesures.
- Structurer les traitements de calcul et de persistance autour de MySQL.

Corrections appliquees:

- Ajout des endpoints de consultation historique.
- Renforcement de la lecture des donnees reelles plutot que de donnees simulees.

### 2.2 Logique metier des mesures GPS

Intentions de prompts:

- Calculer un recul annuel a partir des mesures terrain.
- Limiter les sauts incoherents entre deux mesures successives.

Corrections appliquees:

- Validation du pas maximal autorise entre deux mesures.

### 2.3 Dashboard et indicateurs

Intentions de prompts:

- Alimenter le dashboard avec des donnees issues de la base.
- Calculer les indicateurs a partir des mesures persistantes.

Corrections appliquees:

- Alignement des indicateurs avec les donnees stockees.

### 2.4 Audit et traçabilite

Intentions de prompts:

- Tracer les actions critiques du flux metier.
- Exposer les logs pour la recette.

Corrections appliquees:

- Mise en place d'un historique exploitable pour la QA.

### 2.5 Precision GPS et controles de coherence

Intentions de prompts:

- Comparer les distances calculees a des valeurs attendues.
- Valider les seuils de precision sur les mesures courtes et longues.

Corrections appliquees:

- Ajout d'un controle de coherence sur la saisie des distances.

## 3) Erreurs / ecarts de generation detectes

- Donnees de dashboard non toujours liees a une source persistante.
- Hypothese implicite d'authentification alors qu'elle n'etait pas encore disponible.
- Risque de confusion entre recul observe et distance absolue.

## 4) Corrections structurelles appliquees

- Passage a une logique principalement pilotee par la base.
- Validation stricte des distances saisies.
- Recuperation de la derniere mesure metier pour le calcul.
- Consolidation des endpoints de consultation.

## 5) Impact sur le livrable QA

Etat courant de verification:

- Total checks: 15
- Valides: 11
- Non valides: 4
