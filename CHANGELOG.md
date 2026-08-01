# Journal des versions

Ce journal condense les notes historiques auparavant réparties dans les fichiers `LISEZ-MOI-v*.txt`.

## 0.17f — Sous-sol harmonisé

- Contrat visuel commun aux coupes ASCII et symboliques pour les profondeurs, niveaux de confiance, conduits, volumes, murs, piliers, eau et surface fantôme.
- Remplacement des rectangles artificiels aux zooms lointains par les seuls repères documentés ; les géométries redeviennent visibles lorsqu’elles occupent assez de cellules.
- Rendu symbolique distinct des volumes surfaciques et des réseaux linéaires, avec restitution des murs auparavant perdus.
- Fond ASCII minéral continu et calme, fractures espacées et projection de surface ramenée à quelques axes et silhouettes utiles.
- Projection fantôme dédiée : elle ne reconstruit plus toute la carte de surface à chaque coupe.
- Post-traitement souterrain commun aux deux modes, sans halo plein écran ni scanlines spécifiques à l’ASCII.
- Réduction mesurée de la phase « couches » d’environ 67 ms à 4–8 ms au zoom parcelle sur la vue de contrôle synchronisée.

## 0.17e — Moteur cartographique mesuré

- Extraction de la construction de grille, du relief et des couches de surface ou souterraines dans `map-engine.js`.
- Déplacement du moteur DOM de secours dans le même module cartographique.
- Mesure séparée de la mise en page, de l’indexation, de la grille, des couches, de la sortie et de l’interface.
- Affichage des principaux temps CPU dans le diagnostic et ajout au rapport exporté.
- Aucun minuteur périodique ni travail supplémentaire lorsque l’Atlas est au repos.

## 0.17d — Services applicatifs isolés

- Regroupement des accès OSM, cadastre, patrimoine, relief et BSS dans `data-services.js`.
- Séparation des retours sonores, du modèle d’exploration et des rencontres/parcours guidés.
- Conservation stricte de l’ordre historique dans le fichier autonome généré.
- Conservation des caches, délais d’attente, imports locaux et reprises de synchronisation existants.
- Réduction du fichier applicatif principal à environ 2 700 lignes sans modifier le livrable autonome.
- Ajout d’un audit empêchant les principaux services réseau de revenir dans `main.js`.

## 0.17c — Moteur Canvas isolé

- Séparation de l’initialisation, du moteur Canvas et de l’orchestration applicative.
- Regroupement du pipeline ASCII et symbolique dans `canvas-renderer.js`, sans changer son ordre d’exécution.
- Ajout d’un audit d’architecture qui empêche le retour silencieux du rendu dans le fichier principal.
- Conservation du livrable HTML autonome et du moteur DOM de secours.

## 0.17b — Repos graphique économe

- Arrêt automatique des animations plein écran après une courte impulsion de rendu.
- Mise en pause immédiate lorsque la fenêtre perd le focus ou devient invisible.
- Suppression des déplacements continus du grain ASCII et de la grille vectorielle.
- Suppression complète des balayages lumineux vectoriel et CRT.
- Suppression du filtre animé appliqué au halo vectoriel plein écran.
- Plafonnement adaptatif du bitmap Canvas à 8 millions de pixels sur desktop et 3,5 millions sur mobile.
- Nouveau module `performance.js` et diagnostic du budget Canvas.
- Scénario automatisé garantissant l’absence d’animation et de redraw JavaScript au repos.

## 0.17a — Sources structurées

- Séparation du gabarit HTML, des styles et du JavaScript applicatif dans `src/`.
- Isolation du diagnostic comme premier module logique distinct du moteur historique.
- Ajout d’une reconstruction déterministe qui conserve `index.html` comme livrable autonome.
- Blocage des contrôles si le fichier autonome n’est plus synchronisé avec ses sources.
- Version des tests navigateur dérivée automatiquement des métadonnées du projet.
- Vérification navigateur de l’ouverture directe du livrable en `file://`.
- Redirection automatique du gabarit de source vers le livrable lorsqu’il est ouvert par erreur.

## 0.16s — Filet de sécurité automatisé

- Ajout de tests navigateur reproductibles pour les rendus symbolique, ASCII et DOM.
- Vérification des formats desktop, mobile portrait et mobile paysage.
- Contrôle du diagnostic intégré, de la navigation clavier, des cibles tactiles et du budget de rendu.
- Échec des tests en cas d’erreur JavaScript ou console inattendue.
- Exécution automatique des audits statiques et navigateur dans GitHub Actions.
- Une capture ciblée est conservée pour chaque scénario en échec.

## 0.16r — Stabilisation du dépôt

- Adoption de la v0.16q comme nouvelle base officielle du dépôt.
- Réparation du diagnostic intégré et de ses autocontrôles.
- Suppression de cinq définitions de fonctions symboliques dupliquées.
- Reprise automatique de la dernière vue demandée lorsqu’un chargement OSM était déjà en cours.
- Cibles tactiles principales portées à 44 px sur mobile.
- Surface Canvas focalisable et consignes clavier disponibles en texte de repli.
- Raccourcis cartographiques neutralisés lorsqu’un bouton, un lien ou un champ possède le focus.
- Documentation consolidée et contrôles statiques reproductibles.

## 0.16q — Pipeline Canvas consolidé

- Une seule autorité de dimensionnement pour la grille et le Canvas.
- Pipeline ordonné : données, dessin, halo, finition du mode, effets finaux.
- Post-traitements statiques composités dans le bitmap Canvas.
- Effets animés calés sur le rectangle exact de la carte et synchronisés pendant le déplacement.
- Révision OSM propagée au post-traitement et au diagnostic.

## 0.16d–0.16e — Cartographie d’arpenteur

- Balises géographiques stables et une seule icône par point d’intérêt.
- Cartouches documentaires séparés, placement déterministe et détection Canvas.
- Déduplication des réseaux OSM et filtrage du bruit selon l’échelle.
- Simplification indépendante du cadrage et hiérarchie graphique renforcée.
- Relief plus mat, trame d’arpentage, bâtiments cadastraux embossés et cadre instrumenté.

## 0.15f–0.15h — Lecture et fiches

- Textes secondaires et infobulles rendus plus lisibles.
- Positionnement sur pixels entiers pour réduire le flou.
- Fiche courte pour le terrain ordinaire et fiche complète pour les points d’intérêt.
- Deux états manuels pour la fenêtre d’information, avec hauteur adaptée au contenu.

## 0.13a–0.13d — Passage au Canvas

- Remplacement des milliers de cellules HTML par un Canvas, avec moteur DOM de secours.
- Canvas opaque et pan stable dans Firefox.
- Marqueurs masqués pendant le déplacement puis recalés au relâchement.
- Conversion géographique basée sur la zone réelle des cellules, sans marges du Canvas.
- Ciblage, survol, sélection et limites fondés sur une géométrie commune.
- Index spatial invalidé lorsque les données OSM changent.

## 0.12b–0.12f — Responsive et index spatial

- Grille panoramique responsive avec hystérésis.
- Format commun et index spatial léger pour les points d’intérêt, OSM et le cadastre.
- Sélection et survol mis à jour sans reconstruction DOM complète.
- Infobulle différée et ancrée à la cellule.
- Limites réelles de l’emprise représentées par le cadre « Terra incognita ».

## 0.11e–0.11i — Mobile, textures et retours sensoriels

- Géolocalisation mobile clarifiée et vérification du contexte sécurisé.
- Ciblage fondé sur les centres réels des cellules.
- Expérimentations de textures géographiques stables puis animées globalement.
- Suspension des animations pendant le pan et la pincée, avec respect de la réduction des animations.
- Retour final à des sols calmes et statiques pour préserver la fluidité.
- Sons et effets de sélection différenciés par famille de point d’intérêt.
