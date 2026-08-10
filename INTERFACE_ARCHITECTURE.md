# Architecture de l’interface — v0.18e

La coque suit une règle simple : un élément doit aider à regarder le territoire ou à consigner quelque chose. La carte reste l’espace principal ; le panneau n’affiche qu’une section à la fois.

## Hiérarchie

| Section | Fonction | Contenu principal |
|---|---|---|
| Carnets | gérer l’objet portable | bibliothèque, création, renommage, duplication, import et export |
| Explorer | se situer et régler la lecture | position, proximité, recherche d’une cavité, affichage, point de départ et légende |
| Noter | produire du contenu local | observations, zones, visées, repères, récits et mémoire locale |
| Sources | renouveler et contrôler les données | état global, patrimoine, friches, BSS, réglages et diagnostic |

## Matrice de tri

| Ancien panneau ou commande | Décision | Destination ou justification |
|---|---|---|
| Territoires + Mémoire de l’Atlas | fusionner | Carnets |
| Ma position + Autour de moi + Aller à une cavité | fusionner | Explorer / Se situer |
| Observations + Repères patrimoine et mystère | fusionner | Noter / Notes de terrain |
| Couches | renommer et déplacer | Explorer / Affichage |
| Navigation géographique | réduire | Explorer / Point de départ ; pavé directionnel retiré car la carte, le clavier et le tactile le remplacent |
| Échelle + Profondeur | retirer du panneau | commandes déjà présentes sur la carte |
| Suppression depuis Mémoire | supprimer | doublon de la suppression dans Carnets |
| Recharger toutes les données + synchroniser OSM | hiérarchiser | Actualiser le territoire reste visible ; OSM détaillé passe dans les options techniques |
| Imports CSV/JSON, tests de serveurs, vidage de couche | déplacer | Options techniques de chaque source |
| Diagnostic et audio | déplacer | Sources / Réglages |
| Rencontres et parcours | conserver hors interface | prototypes en réserve tant que le modèle territorial n’est pas stabilisé |

## Règles visuelles

- aucune bordure arrondie ;
- aucun dégradé, ombre, halo, flou ou texture décorative dans la coque ;
- aucune animation d’interface décorative ;
- une palette sombre vert-noir, texte clair, phosphore doux et ambre issue de la carte ;
- une sans-serif neutre pour la coque, la monospace étant réservée à la carte ;
- une grille brutaliste stricte : titres francs, traits continus, aucun indicateur pseudo-technique décoratif ;
- une action principale par bloc ;
- les détails techniques sont fermés par défaut ;
- les états utilisent du texte et une structure, jamais la couleur seule ;
- le même ordre et les mêmes mots sont utilisés sur ordinateur et mobile.

Le moteur Canvas et le langage visuel interne de la carte ne sont pas redessinés dans cette version. Cette séparation permet de valider l’architecture avant la reconstruction complète de la coque prévue en v0.18f.
