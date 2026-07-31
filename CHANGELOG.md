# Journal des versions

Ce journal condense les notes historiques auparavant réparties dans les fichiers `LISEZ-MOI-v*.txt`.

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
