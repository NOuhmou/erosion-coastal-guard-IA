# Rapport court - Precision des calculs GPS

## Objet

Clarifier la difference entre les calculs de distance du projet manuel et du projet IA.

## Difference fondamentale

- **Projet manuel**: calcule une **distance geodesique brute** entre deux coordonnees GPS 2016 et 2026 avec la formule de Haversine. L'entree est donc un couple de points latitude/longitude, et la sortie est une distance en metres puis un recul annuel en metres/an.
- **Projet IA**: ne calcule pas d'abord une distance geodesique entre deux points GPS. Il traite surtout une **distance au trait de cote saisie ou validee terrain** (`distance_trait_cote`) et, selon le mode, reconstruit un recul a partir de l'ecart entre mesures successives ou d'un controle de coherence metier.

## Niveau de precision

- **Projet manuel**: precision numerique plus forte pour comparer deux positions GPS, car la formule est standard, continue et exprimee directement en metres avec un arrondi a 4 decimales.
- **Projet IA**: precision metier correcte pour le suivi terrain, mais la valeur stockee depend de la saisie et des regles de validation. Le projet mesure surtout un ecart de terrain ou une evolution de distance, pas une distance geodesique pure.

## Conclusion

Les deux projets ne calculent pas exactement la meme chose. Le projet manuel mesure la **distance GPS entre deux points**, alors que le projet IA manipule surtout la **distance au trait de cote** et le **recul observe**. Donc, si on parle de precision GPS au sens mathematique, le projet manuel est plus precis et plus comparable. Si on parle de precision de suivi terrain, le projet IA est pertinent mais dans un autre cadre de calcul.
