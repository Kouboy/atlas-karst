# Organisation des sources

`index.html` reste le livrable autonome ouvert par les utilisateurs. Il est généré par `npm run build` et ne doit pas être modifié directement. Le gabarit `index.template.html` n’est pas le site final ; s’il est ouvert par erreur, il redirige automatiquement vers le livrable.

- `index.template.html` contient la structure et les textes de l’interface.
- `styles/atlas.css` contient la feuille de style complète.
- `app/runtime.js` initialise le contexte global et la version.
- `app/performance.js` borne la résolution du Canvas, met les effets animés au repos et regroupe les rafales de données.
- `app/debug.js` porte le diagnostic et l’auto-vérification.
- `app/bootstrap.js` charge les données embarquées, la configuration et l’état partagé.
- `app/canvas-renderer.js` contient le pipeline de rendu ASCII et symbolique, jusqu’aux effets finaux du bitmap.
- `app/audio.js` porte les retours sonores et leur cycle de vie.
- `app/exploration-model.js` regroupe la géométrie commune, les index spatiaux et l’inventaire de proximité.
- `app/experiences.js` porte les rencontres locales, le codex et les parcours guidés.
- `app/data-services.js` regroupe les synchronisations, caches et conversions des sources cartographiques.
- `app/map-engine.js` construit la grille, ses couches de surface ou souterraines, leur contrat visuel partagé et le rendu DOM de secours.
- `app/input-controller.js` porte le déplacement, la molette, le pincement, le zoom, la profondeur et les raccourcis cartographiques communs au desktop et au mobile.
- `app/main.js` orchestre les fonctions applicatives qui restent à extraire progressivement.

Le générateur concatène les sources JavaScript dans cet ordre et les embarque avec les styles dans un unique fichier HTML classique. Ce choix conserve pour l’instant la portée globale et l’ordre d’initialisation de l’application, tout en permettant de réduire le monolithe sans migration brutale.

Après toute modification des sources :

```text
npm run build
npm run test:all
```

`npm run test:static` échoue si le livrable généré n’est plus synchronisé.

`npm run benchmark:render` mesure à chaud les deux modes souterrains sur quatre échelles et trois profondeurs avec une scène locale déterministe.
