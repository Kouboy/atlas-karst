# Organisation des sources

`index.html` reste le livrable autonome ouvert par les utilisateurs. Il est généré par `npm run build` et ne doit pas être modifié directement. Le gabarit `index.template.html` n’est pas le site final ; s’il est ouvert par erreur, il redirige automatiquement vers le livrable.

- `index.template.html` contient la structure et les textes de l’interface.
- `styles/atlas.css` contient la feuille de style complète.
- `app/runtime.js` initialise le contexte global et la version.
- `app/debug.js` porte le diagnostic et l’auto-vérification.
- `app/main.js` contient encore le moteur historique. Il sera réduit par extractions successives.

Le générateur concatène les sources JavaScript dans cet ordre et les embarque avec les styles dans un unique fichier HTML classique. Ce choix conserve pour l’instant la portée globale et l’ordre d’initialisation de l’application, tout en permettant de réduire le monolithe sans migration brutale.

Après toute modification des sources :

```text
npm run build
npm run test:all
```

`npm run test:static` échoue si le livrable généré n’est plus synchronisé.
