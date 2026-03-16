
---
title: MODÈLE CONCEPTUEL DE DONNÉES - EROSION COASTAL GUARD
---
erDiagram

```mermaid

    %% ========== STYLES DES ENTITÉS ==========
    %% Les couleurs aident à identifier les groupes fonctionnels
    
    %% Entités principales (bleu)
    ZONE_COTIERE {
        uuid id_zone PK
        string code UK
        string nom
        geometry geom_polygon
        enum type_cote
        enum classification_actuelle
        enum classification_precedente
        decimal facteur_risque
        decimal recul_annuel_moyen
        decimal recul_projete_100ans
        string region
        timestamp created_at
        timestamp updated_at
    }
    
    %% Utilisateurs (orange)
    UTILISATEUR {
        uuid id_utilisateur PK
        string nom
        string prenom
        string email UK
        string mot_de_passe_hash
        enum role
        string telephone
        string organisation
        uuid zone_assignee_id FK
        boolean actif
        timestamp created_at
        timestamp derniere_connexion
    }
    
    %% Points et mesures (vert)
    POINT_MESURE {
        uuid id_point PK
        uuid id_zone FK
        string code_point UK
        decimal latitude
        decimal longitude
        geometry geom_point
        string description_repere
        boolean actif
        date date_installation
        timestamp created_at
    }
    
    RELEVE_TERRAIN {
        uuid id_releve PK
        uuid id_point FK
        uuid id_agent FK
        uuid id_validateur FK
        timestamp date_mesure
        decimal distance_trait_cote
        enum methode_mesure
        decimal coefficient_maree
        enum heure_maree
        enum conditions_meteo
        decimal vitesse_vent_kmh
        decimal hauteur_vagues_m
        enum type_evenement
        string notes_terrain
        enum statut_validation
        timestamp date_validation
        string motif_rejet
        timestamp created_at
    }
    
    PHOTO_RELEVE {
        uuid id_photo PK
        uuid id_releve FK
        string url_stockage
        decimal latitude
        decimal longitude
        decimal orientation_degres
        string description
        timestamp created_at
    }
    
    CALCUL_RECUL {
        uuid id_calcul PK
        uuid id_point FK
        uuid id_releve_t1 FK
        uuid id_releve_t2 FK
        decimal recul_metres
        integer duree_jours
        decimal recul_annualise
        boolean est_evenement_tempete
        timestamp created_at
    }
    
    %% Historique (violet)
    HISTORIQUE_CLASSIFICATION {
        uuid id_historique PK
        uuid id_zone FK
        enum classification_avant
        enum classification_apres
        timestamp date_changement
        uuid id_expert_1 FK
        uuid id_expert_2 FK
        uuid id_admin FK
        decimal recul_annuel_base
        string justification
        enum type_declencheur
    }
    
    %% Alertes (rouge)
    ALERTE {
        uuid id_alerte PK
        uuid id_zone FK
        uuid id_releve_declencheur FK
        enum type_alerte
        enum niveau
        string titre
        string description
        decimal valeur_mesuree
        decimal seuil_depasse
        enum statut
        uuid id_createur FK
        uuid id_traiteur FK
        timestamp date_creation
        timestamp date_traitement
        boolean notif_protection_civile
    }
    
    %% Parcelles et permis (marron)
    PARCELLE {
        uuid id_parcelle PK
        string reference_cadastrale UK
        uuid id_zone FK
        geometry geom_polygon
        decimal surface_m2
        decimal distance_trait_cote_m
        string proprietaire_nom
        string proprietaire_contact
        enum classification_actuelle
        boolean dans_dpm_100m
        timestamp created_at
        timestamp updated_at
    }
    
    DEMANDE_PERMIS {
        uuid id_demande PK
        string reference UK
        uuid id_demandeur FK
        uuid id_zone FK
        uuid id_parcelle FK
        timestamp date_depot
        string type_projet
        decimal surface_construite_m2
        integer nb_etages
        enum statut
        enum classification_zone_au_depot
        decimal distance_trait_cote_m
        boolean blocage_automatique
        string motif_blocage
        uuid id_urbaniste FK
        timestamp date_decision
        string motif_decision
        boolean etude_geotechnique_requise
        boolean etude_geotechnique_fournie
    }
    
    %% Notifications et audit (gris)
    NOTIFICATION {
        uuid id_notification PK
        uuid id_destinataire FK
        uuid id_alerte FK
        uuid id_demande FK
        enum type_evenement
        enum canal
        string sujet
        string corps
        enum statut_envoi
        timestamp date_creation
        timestamp date_envoi
    }
    
    AUDIT_LOG {
        uuid id_log PK
        uuid id_utilisateur FK
        timestamp timestamp_action
        string table_cible
        uuid id_enregistrement
        enum action
        string champ_modifie
        string valeur_avant
        string valeur_apres
        inet adresse_ip
        string user_agent
        string motif
    }
    
    RAPPORT {
        uuid id_rapport PK
        uuid id_zone FK
        uuid id_auteur FK
        string titre
        enum type_rapport
        date periode_debut
        date periode_fin
        string contenu
        string url_pdf
        boolean est_public
        enum statut
        timestamp date_publication
        timestamp created_at
    }
    
    %% Configuration (cyan)
    CONFIGURATION_SEUILS {
        uuid id_config PK
        string cle UK
        string valeur
        enum type_valeur
        string description
        string categorie
        enum modifiable_par
        uuid id_modificateur FK
        timestamp updated_at
    }

    %% ========== RELATIONS ==========
    
    %% Relations ZONE_COTIERE
    ZONE_COTIERE ||--o{ POINT_MESURE : "1---N  contient"
    ZONE_COTIERE ||--o{ HISTORIQUE_CLASSIFICATION : "1---N  archive"
    ZONE_COTIERE ||--o{ ALERTE : "1---N  génère"
    ZONE_COTIERE ||--o{ RAPPORT : "1---N  documente"
    ZONE_COTIERE ||--o{ PARCELLE : "1---N  inclut"
    ZONE_COTIERE ||--o{ DEMANDE_PERMIS : "1---N  concerne"
    ZONE_COTIERE }o--o{ UTILISATEUR : "0,1---0,N  assignée à"
    
    %% Relations POINT_MESURE
    POINT_MESURE ||--o{ RELEVE_TERRAIN : "1---N  a pour relevés"
    POINT_MESURE ||--o{ CALCUL_RECUL : "1---N  calcule"
    
    %% Relations RELEVE_TERRAIN
    RELEVE_TERRAIN ||--o{ PHOTO_RELEVE : "1---N  illustre"
    RELEVE_TERRAIN ||--o{ CALCUL_RECUL : "1---N  utilisé comme"
    RELEVE_TERRAIN }o--o{ ALERTE : "0,1---0,N  déclenche"
    
    %% Relations UTILISATEUR
    UTILISATEUR ||--o{ RELEVE_TERRAIN : "1---N  saisit"
    UTILISATEUR ||--o{ AUDIT_LOG : "1---N  trace"
    UTILISATEUR ||--o{ NOTIFICATION : "1---N  reçoit"
    UTILISATEUR ||--o{ DEMANDE_PERMIS : "1---N  dépose"
    UTILISATEUR ||--o{ RAPPORT : "1---N  produit"
    UTILISATEUR ||--o{ HISTORIQUE_CLASSIFICATION : "1---N  valide"
    
    %% Relations PARCELLE
    PARCELLE ||--o{ DEMANDE_PERMIS : "1---N  objet de"
    
    %% Relations ALERTE et DEMANDE
    ALERTE ||--o{ NOTIFICATION : "1---N  notifie via"
    DEMANDE_PERMIS ||--o{ NOTIFICATION : "1---N  notifie via"
    
    %% Relations CONFIGURATION
    CONFIGURATION_SEUILS }o--o{ UTILISATEUR : "0,1---0,N  modifiée par"
    
    %% Relations spécifiques (doubles)
    RELEVE_TERRAIN }o--|| UTILISATEUR : "validé par (expert)"
    RELEVE_TERRAIN }o--|| UTILISATEUR : "créé par (agent)"
    DEMANDE_PERMIS }o--|| UTILISATEUR : "instruit par (urbaniste)"
