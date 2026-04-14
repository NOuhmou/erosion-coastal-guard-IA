# 🌊 Erosion-Coastal Guard

![Status](https://img.shields.io/badge/status-en%20développement-yellow)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Licence](https://img.shields.io/badge/licence-MIT-green)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-000000?logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)

> **Prototype académique** — Souss-Massa Resilience Prototype 2026  
> Système de monitoring du recul du trait de côte pour la région **Souss-Massa** (Agadir & Taghazout)

---

## 📋 Table des matières

- [À propos du projet](#-à-propos-du-projet)
- [Technologies utilisées](#-technologies-utilisées)
- [Fonctionnalités](#-fonctionnalités)
- [Règles métier](#-règles-métier)
- [Structure du projet](#-structure-du-projet)
- [Installation](#-installation)
- [API REST](#-api-rest)
- [Rapport de transparence IA](#-rapport-de-transparence-ia)
- [Perspectives d'amélioration](#-perspectives-damélioration)
- [Équipe](#-équipe)

---

## 🌍 À propos du projet

**Erosion-Coastal Guard** est un outil de surveillance et d'analyse de l'érosion côtière développé dans le cadre du **Souss-Massa Resilience Prototype 2026**. Il permet aux agents de terrain de saisir des relevés GPS, de classifier automatiquement les zones à risque et de visualiser l'évolution du recul du trait de côte via un tableau de bord interactif.

---

## 🛠 Technologies utilisées

| Couche | Technologie | Rôle |
|---|---|---|
| **Backend** | Flask (Python) | Serveur API REST |
| **Base de données** | MySQL 8.0 | Stockage des données |
| **Frontend** | HTML / CSS / JavaScript | Interface utilisateur |
| **Cartographie** | Leaflet.js | Carte interactive des points GPS |
| **Graphiques** | Chart.js | Visualisation de l'évolution |

---

## ✅ Fonctionnalités

1. 📊 **Dashboard KPI** — recul moyen, nombre de zones rouges, total de points GPS
2. 🗺️ **Carte interactive** — visualisation des points de mesure avec Leaflet.js
3. 📈 **Graphiques dynamiques** — évolution temporelle (barres et courbe) via Chart.js
4. 🔴 **Tableau des zones** — classification automatique **VERT / ORANGE / ROUGE**
5. 📝 **Saisie terrain** — formulaire dédié aux agents de mesure
6. 🔍 **Page d'audit** — traçabilité complète des changements de classification
7. 🔌 **API REST** — 8 endpoints pour l'accès aux données
8. 🗄️ **Base de données** — 8 tables, 3 triggers, 1 procédure stockée

---

## ⚙️ Règles métier

Les triggers MySQL assurent une classification **automatique et temps réel** des zones :

| Condition | Classification |
|---|---|
| Recul > 30 m **ou** distance au bord < 50 m | 🔴 **ROUGE** |
| Recul > 10 m **ou** distance au bord < 100 m | 🟠 **ORANGE** |
| Autres cas | 🟢 **VERT** |

Les trois triggers implémentés :
- 🔴 **Classification automatique** des zones selon les seuils ci-dessus
- 🚫 **Blocage automatique des permis** en zone rouge
- 📜 **Historisation** de tous les changements de classification

---

## 📁 Structure du projet

```
erosion-coastal-guard-IA/
├── backend/
│   └── app.py              # Serveur Flask + endpoints API
├── frontend/
│   ├── index.html          # Interface principale
│   ├── script.js           # Logique front + appels API
│   └── styles.css          # Styles et mise en page
├── sql/
│   └── 01-schema.sql       # Schéma BDD, triggers, procédure stockée
└── docs/
    ├── analyse-besoin.md
    ├── mcd.md
    └── ...
```

---

## 🚀 Installation

### Prérequis

- Python 3.x
- MySQL 8.0+
- PHP (pour le serveur frontend local)

### Étapes

**1. Cloner le dépôt**
```bash
git clone https://github.com/NOuhmou/erosion-coastal-guard-IA.git
cd erosion-coastal-guard-IA
```

**2. Installer les dépendances Python**
```bash
pip install flask flask-cors pymysql
```

**3. Créer la base de données MySQL**
```bash
mysql -u root -p < sql/01-schema.sql
```

**4. Lancer le backend Flask**
```bash
python backend/app.py
```

**5. Lancer le frontend**
```bash
php -S localhost:5500 -t frontend/
```

**6. Accéder à l'application**

Ouvrir [http://localhost:5500](http://localhost:5500) dans votre navigateur.

---

## 🔌 API REST

Base URL : `http://localhost:5000`

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | État du serveur |
| `GET` | `/api/kpi` | Indicateurs clés (KPI) |
| `GET` | `/api/graphiques` | Données pour les graphiques |
| `GET` | `/api/zones-risque` | Liste des zones classifiées |
| `GET` | `/api/points-carte` | Points GPS pour la carte |
| `GET` | `/api/agents` | Liste des agents de terrain |
| `GET` | `/api/releves` | Historique des relevés |
| `POST` | `/api/releves` | Soumettre un nouveau relevé |

**Exemple d'appel :**
```bash
curl http://localhost:5000/api/kpi
```

---

## 🤖 Rapport de transparence IA

Ce projet a été réalisé avec l'assistance d'outils d'IA dans un cadre académique.

| Outil | Usage |
|---|---|
| **Claude** (Anthropic) | Génération de code, architecture, documentation |
| **Gemini** (Google) | Suggestions, recherche de solutions |
| **Cursor** | Assistance à la complétion de code |

### Hallucinations corrigées

| Problème détecté | Correction apportée |
|---|---|
| CORS non configuré | Ajout de `flask-cors` et configuration explicite |
| Colonnes `latitude`/`longitude` manquantes | Ajout dans le schéma SQL et les endpoints |
| Données de test vides | Insertion de jeux de données de test dans le script SQL |

---

## 🔭 Perspectives d'amélioration

- [ ] 🔐 **Authentification** — Système de login avec rôles (admin, agent, consultant)
- [ ] 📱 **Application mobile** — App React Native pour la saisie terrain hors-ligne
- [ ] 🛰️ **Intégration satellite** — Import automatique de données Sentinel-2 / Copernicus
- [ ] 🤖 **Prédiction ML** — Modèle de machine learning pour anticiper le recul côtier
- [ ] 📧 **Alertes automatiques** — Notifications e-mail/SMS lors du passage en zone rouge
- [ ] 🗃️ **Export de rapports** — Génération PDF/Excel des données et cartographies
- [ ] 🌐 **Déploiement cloud** — Hébergement sur un serveur accessible aux collectivités

---

## 👩‍💻 Équipe

**Équipe Augmentés — IA** | Souss-Massa Resilience Prototype 2026

| Membre | Rôle |
|---|---|
| Najat | Développement & Architecture |
| Salma | Développement & Base de données |
| Haytem | Développement & Frontend |

---

<div align="center">

*Projet académique réalisé dans le cadre du Souss-Massa Resilience Prototype 2026*  
🌊 *Protéger le littoral marocain, une donnée à la fois.*

</div>


