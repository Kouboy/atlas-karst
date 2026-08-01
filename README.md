# Atlas Karst ASCII

Atlas Karst ASCII est un atlas cartographique expérimental, autonome et local, consacré à l’exploration d’un territoire karstique. Il combine des données ouvertes, des observations enregistrées dans le navigateur et des coupes souterraines explicitement présentées comme interprétatives.

L’application propose deux rendus Canvas : une carte symbolique d’arpenteur et une surface ASCII. Elle fonctionne sur ordinateur et mobile, avec déplacement, zoom, sélection, géolocalisation ponctuelle, import/export et mode hors ligne.

## Utilisation

Ouvrir [`index.html`](index.html) dans un navigateur moderne suffit pour consulter un instantané autonome.

Pour utiliser la géolocalisation et synchroniser plus sûrement les services distants, servir le fichier depuis une origine HTTPS. Certains navigateurs ou fournisseurs de données refusent les requêtes provenant directement d’une URL `file://`.

Commandes principales :

- glisser pour déplacer la carte ;
- molette ou pincement pour changer d’échelle ;
- toucher ou cliquer pour sélectionner une cellule ;
- flèches ou ZQSD pour se déplacer lorsque aucun contrôle de formulaire n’est actif ;
- `+` et `-` pour le zoom ;
- `[` et `]` pour la profondeur ;
- `Ctrl` + `Maj` + `D` pour le diagnostic.

Paramètres utiles dans l’URL :

- `?debug` active le diagnostic au démarrage ;
- `?offline` force la démonstration hors ligne ;
- `?online` autorise une actualisation réseau depuis un instantané.

## Données et prudence d’interprétation

L’Atlas peut consulter notamment OpenStreetMap, le cadastre, des données de relief et plusieurs inventaires publics. Leur disponibilité et leurs politiques d’accès peuvent évoluer.

Les profondeurs précédées de `≈`, volumes souterrains, connexions hydrologiques supposées et scénarios ne constituent ni des plans levés, ni des mesures locales, ni un diagnostic de stabilité. Ils doivent rester clairement distingués des observations et sources documentées.

Les données personnelles ajoutées par l’utilisateur restent dans son navigateur ou dans les exports qu’il déclenche lui-même.

## Développement

Le livrable principal demeure un fichier HTML autonome. Les sources maintenables vivent désormais dans `src/` et `index.html` est reconstruit à partir de celles-ci :

```text
npm run build
```

Le dépôt conserve le fichier généré afin qu’il puisse toujours être ouvert directement, sans installation ni serveur. Il faut ouvrir [`index.html`](index.html), jamais le gabarit `src/index.template.html` ; celui-ci redirige désormais vers le bon fichier s’il est ouvert par erreur. Les responsabilités des fichiers sources sont détaillées dans [`src/README.md`](src/README.md).

```text
npm test
```

Cette commande vérifie notamment :

- que `index.html` correspond exactement aux sources ;
- la syntaxe JavaScript embarquée ;
- la syntaxe de chaque module de source ;
- l’unicité des identifiants HTML ;
- l’absence de fonctions nommées dupliquées ;
- la cohérence du registre central des éléments d’interface ;
- la présence des contrats essentiels du pipeline Canvas et OSM.

Les scénarios navigateur demandent Chromium, installé une fois avec :

```text
npx playwright install chromium
npm run test:browser
```

Ils vérifient également l’ouverture directe du livrable autonome en `file://`.

Pour lancer tous les contrôles locaux :

```text
npm run test:all
```

GitHub Actions répète ces contrôles sur chaque pull request et sur chaque modification de `main`. En cas d’échec navigateur, une capture ciblée est conservée pour le diagnostic.

Les effets CRT animés ne tournent plus indéfiniment : seule une légère respiration s’active brièvement après un rendu ou une interaction, puis passe au repos. Les anciennes générations de balayages ont été retirées de la feuille de style. La case « Animations de l’interface et des points d’intérêt » désactive également les marqueurs, chargements et ornements documentaires animés restants.

Canvas est désormais l’unique moteur cartographique : les modes symbolique et ASCII partagent ainsi exactement la même géométrie, les mêmes interactions et le même pipeline d’effets. Si Canvas n’est pas disponible, l’application affiche une incompatibilité explicite au lieu de proposer un rendu partiel trompeur. Les anciens liens contenant `?renderer=dom` restent ouvrables et utilisent simplement Canvas.

## Historique

Les évolutions importantes sont regroupées dans [`CHANGELOG.md`](CHANGELOG.md). Les anciens fichiers `LISEZ-MOI-v*.txt` ont été condensés dans ce journal ; leur contenu original reste disponible dans l’historique Git.

La licence du projet sera définie ultérieurement.
