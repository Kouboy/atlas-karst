# Journal des versions

Ce journal condense les notes historiques auparavant réparties dans les fichiers `LISEZ-MOI-v*.txt`.

## 0.18e — Architecture de l’interface

- Navigation ramenée à quatre espaces exclusifs : Carnets, Explorer, Noter et Sources.
- Fusion des panneaux Territoires/Mémoire, Position/Proximité/Cavités et Observations/Repères locaux.
- Suppression du premier niveau des commandes d’échelle, profondeur et déplacement déjà présentes sur la carte.
- Une seule suppression de carnet et une seule actualisation globale restent visibles ; imports, tests de serveurs et effacements de sources passent dans les options techniques.
- Accès directs Carnets, Affichage et Noter depuis la carte, avec la fiche documentaire séparée du menu.
- Coque « carnet de terrain » sombre, fidèle aux tonalités vert-noir, phosphore et ambre de la carte, sans arrondis, dégradés, ombres, halos ni animations décoratives ; hiérarchie portée par les caractères, l’espace et les traits.
- Finition brutaliste : sans-serif neutre dans la coque, monospace réservée à la carte, grille plus ferme et suppression des derniers statuts pseudo-techniques décoratifs.
- Moteur cartographique, données et contrôleurs inchangés pendant cette passe d’architecture.

## 0.18d — Format canonique du carnet

- Nouveau fichier portable `.atlas`, JSON UTF-8 versionné et documenté, distinct des instantanés techniques internes.
- Séparation explicite entre contenu durable, présentation, références de sources, extraits documentaires et caches cartographiques jetables.
- Empreinte d’intégrité SHA-256, avec repli local déterministe si l’API cryptographique du navigateur est absente.
- Import compatible avec les anciennes sauvegardes `.atlas.json` et refus des schémas futurs ou des carnets altérés.
- Un carnet portant l’identifiant d’un territoire déjà présent est importé comme copie, sans remplacer l’original.
- Budget conseillé de 4 Mo et plafond d’import de 16 Mo pour préserver un format léger ; l’HTML autonome conserve l’instantané complet.

## 0.18c — Gestionnaire de territoires

- Bibliothèque locale multi-territoires avec sauvegarde IndexedDB indépendante, ouverture hors ligne et mémorisation du territoire actif.
- Sauvegarde automatique avant chaque bascule, renommage, duplication et suppression confirmée des territoires.
- Migration transparente de l’ancien instantané unique vers le registre territorial.
- L’ouverture d’un territoire restaure sa vue et ses données sans déclencher de synchronisation réseau automatique.
- Culture reconnaît les coordonnées WGS84 actuelles des catalogues ministériels, indépendamment de la casse et du séparateur décimal.
- Le cadastre conserve la couche bâtiments si le serveur refuse ponctuellement les parcelles, et Cartofriches affiche sa progression départementale.
- Les prototypes « Rencontres locales » et « Parcours guidés » quittent l’interface active : leur moteur est conservé en réserve pour une réinterprétation après stabilisation du nouveau modèle territorial.
- Le cadastre distingue désormais l’absence dans une sauvegarde, la couverture hors France et une panne réelle ; l’API Carto IGN fournit les parcelles par emprise lorsque le fichier communal Etalab est refusé.

## 0.18b — Création de territoire

- La synchronisation Cartofriches suit le schéma courant de la ressource (`geompoint`) et filtre les fiches départementales dans l’emprise locale, sans dépendre des anciennes colonnes `lat` / `long`.
- Ajout d’un panneau permettant de nommer un territoire de 16 × 16 km et de définir son centre par coordonnées ou depuis la géolocalisation ponctuelle.
- Changement de territoire possible sans recharger la page, avec recentrage, remise à zéro des couches territoriales et relance explicite des sources principales.
- Géocodage inverse du centre via la Géoplateforme afin de déterminer automatiquement commune et département avant le chargement cadastral.
- Suppression de l’adresse et de la commune charentaises encore codées en dur dans l’adresse officielle et le cadastre.
- Cloisonnement par territoire des observations, mémoires, repères de départ, Cartofriches, patrimoine, BSS et caches de données.
- Sauvegarde automatique du territoire actif dans l’instantané local et restauration de son identité dans l’interface.

## 0.18a — Modèle de territoire

- Introduction d’un profil territorial sérialisable qui regroupe identité, centre, emprise, rattachement administratif et disponibilité des données patrimoniales embarquées.
- Passage de l’emprise navigable historique à 16 × 16 km autour de son centre, première fondation de l’Atlas généralisable.
- Suppression des replis « Charente » codés en dur dans Cartofriches, le patrimoine culturel et Hub’Eau au profit du profil actif.
- Ajout du territoire au schéma 3 des sauvegardes, avec compatibilité conservée pour les schémas 1 et 2.
- Séparation explicite entre données synchronisables partout et inventaires historiques locaux, afin qu’un futur territoire ne réutilise pas silencieusement les 736 points BSS charentais.
- Version du HUD reliée à la version d’exécution, territoire actif identifié dans l’en-tête et commande de diagnostic rendue directement accessible ; son activation ouvre désormais la colonne, déplie la section et l’amène au premier plan.

## 0.17u — Santé des sessions longues

- Plafonds explicites pour les caches de styles Canvas, d’hypothèses souterraines et de relations documentaires.
- Conservation limitée aux 18 fenêtres OSM locales les plus récentes.
- Entretien opportuniste pendant les périodes d’inactivité, sans boucle périodique permanente.
- Suspension réelle du contexte audio lorsque la page est masquée.
- Libération des requêtes, gestes, temporisateurs et animations transitoires lors de `pagehide`, avec restauration depuis le cache de navigation.
- Compteurs de santé de session intégrés au diagnostic et scénario navigateur de saturation/nettoyage.

## 0.17t — Orchestrateur applicatif

- Déplacement du démarrage complet dans `application-controller.js` avec état, durée, mode et erreur observables.
- Assemblage idempotent de tous les contrôleurs depuis un point d’entrée unique.
- Regroupement des actions documentaires globales : fiche mobile, navigation entre POI, relations et export texte.
- Réduction de `main.js` à la seule boucle de rendu mesurée, environ 4,3 Ko.
- Auto-diagnostic et audit structurel renforcés pour empêcher le retour d’écouteurs ou du démarrage dans le moteur de rendu.
- Scénario navigateur couvrant le démarrage unique et la délégation documentaire sans double branchement.

## 0.17s — Cycle de vie applicatif

- Extraction des événements globaux de visibilité, focus et préférence système dans `lifecycle-controller.js`.
- Centralisation du déverrouillage Web Audio après un geste explicite sur desktop et mobile.
- Regroupement des sons d’actions, bascule audio et observateurs de statuts asynchrones.
- Liaison idempotente empêchant les doubles écouteurs lors d’une réinitialisation applicative.
- Compteurs de cycle de vie et d’audio ajoutés au diagnostic et au rapport exportable.
- Scénario navigateur couvrant gestes, focus, visibilité, préférence d’animation et routage sonore.

## 0.17r — Contrôleur de vue

- Extraction des modes symbolique/ASCII, scénarios souterrains et couches cartographiques dans `view-controller.js`.
- Centralisation de la préférence d’animation ambiante et de sa persistance locale.
- Déplacement de la sélection documentaire des cavités et du recentrage sur la case mémorisée.
- Regroupement des commandes et du raccourci clavier de diagnostic dans le même contrôleur idempotent.
- Compteurs de modes, scénarios, couches, cavités, recentrages et diagnostics ajoutés au rapport exportable.
- Scénario navigateur couvrant mode de rendu, hydrologie, animation, scénario, cavité, sélection et diagnostic.
- Réduction de `main.js` à son noyau de rendu, de démarrage et de retours sonores globaux.

## 0.17q — Contrôleur des expériences

- Extraction des commandes de rencontres locales, du codex et des parcours guidés dans `experience-controller.js`.
- Centralisation des ouvertures, fermetures par bouton, arrière-plan ou clavier et interactions documentaires.
- Regroupement du choix, du démarrage, du déplacement, du recentrage et de l’arrêt des parcours.
- Branchement idempotent afin qu’une commande ne puisse pas lancer deux rencontres ou avancer deux étapes.
- Compteurs d’activité ajoutés à l’auto-diagnostic et au rapport exportable.
- Scénario navigateur couvrant une rencontre test, une action documentaire, le codex et un parcours complet démarrage → étape → recentrage → arrêt.
- Réduction supplémentaire de `main.js`, qui ne possède plus les événements propres aux expériences.

## 0.17p — Contrôleur des sources

- Extraction des commandes OSM, BSS, Cartofriches et patrimoine dans `source-controller.js`.
- Centralisation des sélecteurs de fichiers, imports, synchronisations, effacements et liens de téléchargement.
- Déplacement de la relance générale des données et de l’invalidation de ses caches hors de l’orchestrateur principal.
- Branchement idempotent des commandes afin d’empêcher les doubles imports ou synchronisations.
- Compteurs d’actions, imports, effacements, filtres et relances ajoutés au diagnostic exportable.
- Scénario navigateur couvrant trois imports locaux réels, leurs sauvegardes, les remises à zéro et une relance réseau simulée.
- Réduction supplémentaire de `main.js`, désormais consacré au rendu, aux expériences et au démarrage.

## 0.17o — Contrôleur de terrain

- Extraction de la géolocalisation ponctuelle et de ses messages de permission dans un contrôleur dédié.
- Centralisation du placement de la maison, de la saisie de coordonnées et de l’alignement cadastral dans ce même contrôleur.
- Regroupement des ajouts et suppressions d’observations et de mémoires locales, sans modifier leur stockage existant.
- Branchement idempotent des commandes de terrain pour éviter les doubles écouteurs lors d’une évolution du démarrage.
- Compteurs de localisations, placements et contributions locales ajoutés au diagnostic exportable.
- Scénario navigateur couvrant localisation simulée, maison, observation, mémoire locale et effacement de la position.
- Réduction de `main.js` à environ 18 Ko ; l’orchestrateur ne possède plus la logique du travail de terrain.

## 0.17n — Démarrage réseau étagé

- Remplacement du lancement simultané de cinq services par une file limitée à deux synchronisations concurrentes.
- Chaque nouvelle tâche attend un créneau libre du navigateur afin que l’affichage et les interactions restent prioritaires.
- Les tâches non encore lancées restent en attente lorsque l’onglet est masqué et reprennent à son retour.
- Un échec de service reste isolé et n’empêche pas les autres sources de terminer leur chargement.
- Compteurs de tâches, concurrence, créneaux libres, pauses de visibilité et échecs ajoutés au diagnostic exportable.
- Scénario navigateur déterministe couvrant l’ordre initial, la limite de concurrence et la poursuite après erreur.

## 0.17m — Peau visuelle consolidée

- Fusion de cinq générations successives de styles cartographiques en une seule définition finale pour chaque mode.
- Suppression de huit anciennes animations de balayage, scintillement et dérive qui restaient déclarées derrière des pseudo-calques masqués.
- Conservation de l’apparence finale symbolique et ASCII ainsi que du calque FX Canvas borné à une brève respiration.
- Réduction de la feuille CSS d’environ 14 Ko et retrait des pseudo-calques cartographiques devenus inutiles.
- La préférence « animations » gouverne maintenant aussi les marqueurs, chargements et ornements documentaires restants.
- Audit statique renforcé sur l’unicité des peaux et test navigateur étendu à toutes les animations visibles au repos.

## 0.17l — Moteur Canvas unique

- Retrait du moteur DOM de secours après comparaison fonctionnelle : il ne couvrait ni le rendu symbolique, ni les marqueurs, ni le pipeline visuel complet.
- Unification du rendu, du survol, de la sélection, du déplacement, des relations, des parcours et du cadre géographique sur la géométrie Canvas.
- Suppression de la grille de plusieurs milliers de nœuds DOM et des styles, mesures et événements qui lui étaient réservés.
- Compatibilité conservée avec les anciens liens `?renderer=dom`, désormais ignorés au profit du moteur Canvas.
- Message d’incompatibilité explicite pour les navigateurs sans Canvas, afin d’éviter un mode dégradé incomplet.
- Contrats statiques et scénario navigateur dédiés au caractère exclusif du moteur Canvas.

## 0.17k — Coque responsive isolée

- Extraction des panneaux, accordéons, statuts latéraux et signaux documentaires dans `ui-shell.js`.
- Déplacement dans la même coque du profil de grille responsive, de l’alignement mobile et du recalage du Canvas.
- Regroupement des demandes d’ajustement concurrentes dans une seule animation, avec compteurs des demandes, exécutions et regroupements.
- Cache du conteneur principal et conservation d’un unique observateur de redimensionnement pendant toute la session.
- Branchement centralisé des commandes de panneau, du volet d’information et des réactions au redimensionnement.
- Diagnostic « Coque responsive » et scénario navigateur dédié aux rafales d’ajustement et aux états desktop/mobile.
- Réduction de `main.js` d’environ 820 à 470 lignes ; l’orchestrateur ne possède plus le détail de la mise en page.

## 0.17j — Sauvegardes vérifiables

- Extraction de la validation, de la restauration IndexedDB, des exports JSON, texte et HTML autonome dans `snapshot-manager.js`.
- Acceptation explicite des schémas historiques 1 et 2, avec refus lisible des instantanés provenant d’une version future incompatible.
- Limite d’import à 64 Mo afin qu’un fichier accidentellement énorme ne puisse pas saturer la session.
- Téléchargements déclenchés par un lien temporairement attaché au document pour une meilleure compatibilité mobile.
- Compteurs de constructions, restaurations, imports, exports et opérations IndexedDB ajoutés au diagnostic.
- Scénario navigateur de round-trip couvrant l’état cartographique, IndexedDB et le rejet d’un schéma futur.
- Réduction de `main.js` d’environ 950 à 820 lignes ; il ne contient plus les détails du format de sauvegarde.

## 0.17i — Inspecteur unifié

- Extraction de la conversion pointeur/cellule, de la sélection assistée, du survol et des fiches documentaires dans `cell-inspector.js`.
- Rattachement au même inspecteur du chemin spécial des balises symboliques, auparavant encore déclenché depuis le moteur Canvas.
- Conservation géographique de la sélection lors des changements d’échelle, avec resynchronisation du marqueur si elle reste dans l’emprise.
- Fiche mobile ouverte directement après un toucher, sans pointeur ni classe de déplacement résiduelle.
- Compteurs des sélections de terrain, points d’intérêt, interactions tactiles et survols ajoutés au diagnostic.
- Deux scénarios navigateur dédiés au parcours survol → clic → zoom clavier et à la sélection tactile mobile.
- Réduction de `main.js` d’environ 1 670 à 950 lignes ; le moteur Canvas ne possède plus la logique de sélection symbolique.

## 0.17h — Gestes unifiés

- Extraction du déplacement, de la molette, du pincement, du zoom, de la profondeur et des raccourcis dans `input-controller.js`.
- État temporaire des pointeurs centralisé afin qu’un seul contrôleur possède le drag et le pincement sur desktop comme sur mobile.
- Conservation de l’aperçu GPU pendant le drag, suivie d’un unique rendu cartographique au relâchement.
- Nettoyage vérifié des captures, transformations et classes tactiles après chaque geste.
- Compteurs de déplacements, pincements et molettes ajoutés au diagnostic et à son rapport.
- Deux scénarios navigateur dédiés au drag sans rafale et au pincement tactile autour de son point central.
- Réduction de `main.js` d’environ 2 020 à 1 670 lignes sans modifier le livrable autonome.

## 0.17g — Démarrage regroupé

- Premier affichage conservé immédiatement, mais suppression du second rendu identique lors du chargement d’un instantané.
- Regroupement des arrivées OSM, cadastre, relief, cavités et adresse dans une fenêtre de 90 ms, bornée à 220 ms.
- Une interaction ou un rendu direct couvre automatiquement les mises à jour de données déjà en attente, sans reconstruction supplémentaire.
- Compteur local des demandes, rendus réellement exécutés et rafales regroupées dans le diagnostic et son rapport exporté.
- Autocontrôle relancé après la dernière rafale afin que le diagnostic reflète l’image stabilisée plutôt qu’un état intermédiaire du démarrage.
- Scénario navigateur dédié aux rafales et au recouvrement par une interaction.
- Budgets de diagnostic séparés : premier rendu à froid sous 140 ms, puis rendus stabilisés sous 80 ms.
- Sur l’instantané synchronisé de contrôle : passage de 8 à 3 rendus au démarrage, soit environ 144 à 62 ms de CPU cartographique cumulé.

## 0.17f — Sous-sol harmonisé

- Contrat visuel commun aux coupes ASCII et symboliques pour les profondeurs, niveaux de confiance, conduits, volumes, murs, piliers, eau et surface fantôme.
- Remplacement des rectangles artificiels aux zooms lointains par les seuls repères documentés ; les géométries redeviennent visibles lorsqu’elles occupent assez de cellules.
- Rendu symbolique distinct des volumes surfaciques et des réseaux linéaires, avec restitution des murs auparavant perdus.
- Fond ASCII minéral continu et calme, fractures espacées et projection de surface ramenée à quelques axes et silhouettes utiles.
- Projection fantôme dédiée : elle ne reconstruit plus toute la carte de surface à chaque coupe.
- Post-traitement souterrain commun aux deux modes, sans halo plein écran ni scanlines spécifiques à l’ASCII.
- Réduction mesurée de la phase « couches » d’environ 67 ms à 4–8 ms au zoom parcelle sur la vue de contrôle synchronisée.
- Conservation des galeries et connexions qui traversent l’écran lorsque leur point d’origine est hors champ ; ordre de composition stabilisé pendant les déplacements.

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
