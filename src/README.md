# Organisation des sources

`index.html` reste le livrable autonome ouvert par les utilisateurs. Il est généré par `npm run build` et ne doit pas être modifié directement. Le gabarit `index.template.html` n’est pas le site final ; s’il est ouvert par erreur, il redirige automatiquement vers le livrable.

- `index.template.html` contient la structure et les textes de l’interface.
- `styles/atlas.css` contient la feuille de style complète.
- `app/runtime.js` initialise le contexte global et la version.
- `app/performance.js` borne la résolution du Canvas, met les effets animés au repos et regroupe les rafales de données.
- `app/debug.js` porte le diagnostic et l’auto-vérification.
- `app/territory-model.js` définit le contrat géographique sérialisable d’un Atlas : identité, centre, emprise, rattachement administratif et données patrimoniales embarquées.
- `app/territory-controller.js` gère la bibliothèque locale de territoires : création, sauvegarde, ouverture hors ligne, renommage, duplication, suppression et cloisonnement des données.
- `app/bootstrap.js` charge les données embarquées, la configuration et l’état partagé.
- `app/source-registry.js` décrit les fournisseurs, couvertures, licences et politiques de portabilité, puis produit le catalogue, les attributions, les statuts et les références des carnets.
- `app/canvas-renderer.js` contient le pipeline de rendu ASCII et symbolique, jusqu’aux effets finaux du bitmap.
- `app/audio.js` porte les retours sonores et leur cycle de vie.
- `app/exploration-model.js` regroupe la géométrie commune, les index spatiaux et l’inventaire de proximité.
- `app/experiences.js` porte les rencontres locales, le codex et les parcours guidés.
- `app/data-services.js` regroupe les synchronisations, caches et conversions des sources cartographiques.
- `app/startup-loader.js` étale les synchronisations initiales dans une file bornée qui respecte les créneaux libres et la visibilité de la page.
- `app/source-controller.js` relie les synchronisations, imports, effacements et filtres des sources cartographiques à l’interface.
- `app/fieldwork-controller.js` porte la localisation ponctuelle, le repère maison, les observations et les mémoires locales.
- `app/experience-controller.js` relie les rencontres, le codex et les parcours guidés à leurs commandes d’interface.
- `app/view-controller.js` porte les modes de rendu, couches, scénarios, sélections documentaires et commandes de diagnostic.
- `app/lifecycle-controller.js` coordonne visibilité, focus, préférences système, déverrouillage mobile et retours sonores globaux.
- `app/application-controller.js` assemble les contrôleurs, porte le démarrage idempotent et les actions documentaires globales.
- `app/session-health.js` borne les caches de longue durée et libère les ressources transitoires lors du gel ou de la restauration de page.
- `app/main.js` ne contient plus que la boucle de rendu mesurée ; `app/map-engine.js` construit la grille et ses couches de surface ou souterraines selon leur contrat visuel partagé.
- `app/cell-inspector.js` transforme le pointeur en case et porte la sélection, le survol, la fiche documentaire ainsi que son panneau mobile.
- `app/ui-shell.js` relie les quatre sections natives du carnet, les accordéons, le dimensionnement responsive et l’alignement de la carte.
- `app/input-controller.js` porte le déplacement, la molette, le pincement, le zoom, la profondeur et les raccourcis cartographiques communs au desktop et au mobile.
- `app/carnet-format.js` définit le format portable `.atlas`, son empreinte d’intégrité et la conversion avec les instantanés internes en s’appuyant sur le registre central des sources.
- `app/snapshot-manager.js` valide, restaure et exporte les sauvegardes JSON, texte et HTML autonome ; IndexedDB conserve un instantané indépendant par territoire et migre l’ancienne sauvegarde unique.

Le générateur concatène les sources JavaScript dans cet ordre et les embarque avec les styles dans un unique fichier HTML classique. Ce choix conserve pour l’instant la portée globale et l’ordre d’initialisation de l’application, tout en permettant de réduire le monolithe sans migration brutale.

Après toute modification des sources :

```text
npm run build
npm run test:all
```

`npm run test:static` échoue si le livrable généré n’est plus synchronisé.

`npm run benchmark:render` mesure à chaud les deux modes souterrains sur quatre échelles et trois profondeurs avec une scène locale déterministe.
