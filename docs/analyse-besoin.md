# Analyse du besoin - Erosion Coastal Guard
**Date:** 12/03/2026
**Source:** Claude (voir prompts/prompt-analyse-besoin.md)

---

## 1. GLOSSAIRE DES TERMES TECHNIQUES

| Terme | Définition simple |
|---|---|
| **Trait de côte** | La ligne imaginaire où la mer rencontre la terre (frontière eau/plage) |
| **Recul côtier** | La distance dont cette ligne s'est déplacée vers l'intérieur des terres |
| **Érosion côtière** | Le processus naturel (vagues, vent, pluie) qui grignote la terre |
| **Profil de plage** | La coupe transversale de la plage, du haut de la falaise jusqu'au fond de la mer |
| **Houle** | Les grandes vagues régulières venant du large |
| **Sédimentation** | Le dépôt de sable/gravier (inverse de l'érosion) |
| **Permis de construire** | Autorisation officielle pour bâtir, délivrée par la commune |
| **Zone de recul réglementaire** | Distance minimale légale entre une construction et le bord de mer |
| **LIDAR** | Technologie laser aérienne pour cartes 3D précises |
| **Bathymétrie** | Mesure de la profondeur sous-marine |
| **Indice de vulnérabilité côtière** | Score combinant plusieurs facteurs pour évaluer le risque |

---

## 2. PROCESSUS DE MESURE DU RECUL CÔTIER

### Méthodes de mesure

| Méthode | Description | Précision | Fréquence |
|---|---|---|---|
| Jalonnement terrain | Piquets plantés sur la plage, mesure manuelle | ± 5-10 cm | 2-4×/an |
| GPS différentiel | GPS de précision centimétrique | ± 2-5 cm | 2×/an |
| Photogrammétrie par drone | Modèle 3D par survol | ± 5-15 cm | 3-6 mois |
| Images satellites | Analyse automatisée | ± 10-50 cm | Mensuelle |

### Unités de mesure

| Ce qu'on mesure | Unité | Exemple |
|---|---|---|
| Recul annuel moyen | m/an | "La plage recule de 1,2 m/an" |
| Recul sur période | m sur X ans | "Recul de 25 m entre 1984 et 2024" |
| Surface perdue | m² ou hectares | "3,2 ha perdus depuis 2000" |
| Volume de sédiments perdus | m³ | "12 000 m³ emportés par la tempête" |

---

## 3. SEUILS ET ZONAGE RÉGLEMENTAIRE

### Calcul du recul projeté
Recul projeté = Recul annuel moyen × 100 ans
Zone de sécurité = Recul projeté + marge (30 à 50 m)


### Classification des zones

| Zone | Critère | Constructibilité |
|---|---|---|
| **VERTE** | Recul projeté < 10 m ET distance > 100 m | Constructible |
| **ORANGE** | Recul projeté 10-30 m OU distance 50-100 m | Avec conditions (étude géotech) |
| **ROUGE** | Recul projeté > 30 m OU distance < 50 m | INTERDICTION TOTALE |
| **NOIRE** | Danger immédiat (fissures, effondrement) | Évacuation requise |

### Réglementation marocaine
- **Loi 81-12 sur le littoral (2015)** : Interdiction de construire à moins de **100 m** du domaine public maritime
- **Dahir de 1916** : La bande côtière appartient à l'État
- **SDAU du Grand Agadir** : Schéma directeur d'aménagement urbain régional

---

## 4. ACTEURS ET LEURS RÔLES

| Acteur | Rôle | Actions dans le système |
|---|---|---|
| **Agent terrain** | Effectue les mesures GPS/drone | Enregistre relevés, photos, signale anomalies |
| **Géologue / Expert SIG** | Valide les données, calcule les taux de recul | Classe les zones, modifie statuts |
| **Service Urbanisme** | Consulte avant permis, refuse en zone rouge | Lit les zonages, valide/refuse permis |
| **Admin / Décideur** | Arbitre les conflits, valide les zonages officiels | Override possible, déclenche évacuations |
| **Public / Promoteurs** | Consulte les risques, dépose demandes | Accès en lecture seule |

---

## 5. DONNÉES SPÉCIFIQUES AGADIR/TAGHAZOUT

### Zones les plus menacées

| Zone | Risque | Cause |
|---|---|---|
| Plage d'Agadir (centre) | Moyen | Trafic nautique, extraction sable |
| Cap Ghir | Élevé | Falaises actives, houle directe |
| Taghazout village | Élevé | Constructions < 20 m du bord |
| Aourir / Tamraght | Moyen-élevé | Pression touristique |
| Embouchure de l'Oued Souss | Très élevé | Barrages en amont bloquent les sédiments |

### Chiffres clés
- Recul à Agadir : **0,3 à 0,8 m/an**
- Recul à Taghazout (falaises) : **0,1 à 0,5 m/an**
- Recul sur plages de surf : **0,5 à 1,5 m/an**
- Déficit sédimentaire : **300 000 m³/an** (dû aux barrages)

### Incidents documentés
- **2008** : Effondrement d'une portion de corniche à Agadir
- **2014** : Tempête atlantique → recul 3-5 m en une nuit
- **2019** : Fissures sur constructions à Taghazout (< 40 m du bord)

---

## 6. RÈGLES MÉTIER IDENTIFIÉES
RÈGLES DE CALCUL :
R1 : Recul_annuel = (Position_t1 - Position_t2) / Nombre_années
R2 : Recul_projeté_100ans = Recul_annuel × 100 × Facteur_risque
R3 : Zone = VERT si recul_projeté < 10m ET distance > 100m
ORANGE si recul_projeté 10-30m OU distance 50-100m
ROUGE si recul_projeté > 30m OU distance < 50m

RÈGLES DE VALIDATION :
R4 : Mesure valide si |recul_ponctuel| < 3 × recul_annuel_moyen
R5 : Mesure invalide si absence de coefficient_marée ou conditions_meteo
R6 : Rezonage possible uniquement après minimum 3 mesures consécutives

RÈGLES D'ALERTE :
R7 : Alerte URGENTE si recul > 2m en < 7 jours
R8 : Alerte SURVEILLANCE si tendance > +20% vs moyenne 5 ans
R9 : Notification propriétaire si sa parcelle change de zone

RÈGLES MÉTIER LÉGALES (Maroc) :
R10 : Tout permis sur parcelle < 100m du DPM → refus automatique
R11 : Zone ROUGE → blocage permis sans exception
R12 : Zone ORANGE → permis conditionnel (étude géotechnique requise)


---

## 7. CAS PARTICULIERS À ANTICIPER

### Tempêtes exceptionnelles

SI recul_mesuré > (3 × recul_annuel_moyen) EN MOINS DE 48H
ALORS ALERTE_TEMPÊTE → mesure d'urgence sous 72h
→ gel temporaire des permis
→ notification protection civile


### Erreurs de mesure

| Type d'erreur | Détection |
|---|---|
| GPS mal calibré | `IF recul > moyenne × 5 → SUSPECT` |
| Marée haute vs basse | Stocker heure + coefficient de marée |
| Repère déplacé | Comparer avec mesures voisines |
| Drone mal géoréférencé | Contrôle par points d'appui fixes |

### Fraude et corruption (AUDIT obligatoire)

1. **AUDIT LOG complet** : Toute modification = enregistrement (qui, quoi, quand, IP)
2. **SÉPARATION DES RÔLES** : Agent mesure ≠ Expert valide ≠ Urbaniste délivre
3. **DOUBLE VALIDATION** : Passage ROUGE→VERT requiert 2 experts + admin
4. **DONNÉES PUBLIQUES** : Zonages visibles par tous (transparence)

---

## 8. VERBES D'ACTION (FONCTIONNALITÉS)

- [ ] Enregistrer un nouveau relevé GPS (agent)
- [ ] Valider/invalider un relevé suspect (expert)
- [ ] Calculer le recul annuel moyen (automatique)
- [ ] Calculer le recul projeté sur 100 ans (automatique)
- [ ] Classer automatiquement les zones (vert/orange/rouge)
- [ ] Changer manuellement le statut d'une zone (expert+admin)
- [ ] Bloquer automatiquement un permis en zone rouge (trigger)
- [ ] Déclencher une alerte en cas de dépassement de seuil
- [ ] Visualiser l'évolution sur carte interactive
- [ ] Comparer ligne côte actuelle vs il y a 10 ans
- [ ] Consulter l'historique des modifications (audit)
- [ ] Notifier les propriétaires en cas de rezonage
