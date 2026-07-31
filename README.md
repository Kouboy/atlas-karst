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
- `?online` autorise une actualisation réseau depuis un instantané ;
- `?renderer=dom` active l’ancien moteur DOM de secours.

## Données et prudence d’interprétation

L’Atlas peut consulter notamment OpenStreetMap, le cadastre, des données de relief et plusieurs inventaires publics. Leur disponibilité et leurs politiques d’accès peuvent évoluer.

Les profondeurs précédées de `≈`, volumes souterrains, connexions hydrologiques supposées et scénarios ne constituent ni des plans levés, ni des mesures locales, ni un diagnostic de stabilité. Ils doivent rester clairement distingués des observations et sources documentées.

Les données personnelles ajoutées par l’utilisateur restent dans son navigateur ou dans les exports qu’il déclenche lui-même.

## Développement

Le livrable principal demeure un fichier HTML autonome. Aucun paquet tiers n’est requis pour les contrôles du dépôt.

```text
npm test
```

Cette commande vérifie notamment :

- la syntaxe JavaScript embarquée ;
- l’unicité des identifiants HTML ;
- l’absence de fonctions nommées dupliquées ;
- la cohérence du registre central des éléments d’interface ;
- la présence des contrats essentiels du pipeline Canvas et OSM.

Le moteur Canvas est le mode normal. Le moteur DOM reste un filet de sécurité pendant la phase de stabilisation et pourra être retiré après comparaison fonctionnelle.

## Historique

Les évolutions importantes sont regroupées dans [`CHANGELOG.md`](CHANGELOG.md). Les anciens fichiers `LISEZ-MOI-v*.txt` ont été condensés dans ce journal ; leur contenu original reste disponible dans l’historique Git.

La licence du projet sera définie ultérieurement.
