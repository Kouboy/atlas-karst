# Format portable `.atlas` — schéma 1

Un fichier `.atlas` est un document JSON UTF-8 autonome décrivant un petit carnet territorial. Il ne dépend ni du stockage du navigateur, ni d’un compte, ni d’un serveur particulier.

## Principes

- `format` vaut `atlas-carnet` et `schema` vaut `1`.
- `territory` fixe l’identité, le centre et l’emprise géographique.
- `content` contient uniquement les contributions durables : point de départ, observations, notes et état des expériences conservées.
- `presentation` mémorise la vue, le rendu et les couches choisies sans modifier le contenu.
- `sources.references` cite les fournisseurs consultés, leur licence, leur lien et la manière dont ils sont utilisés.
- `sources.extracts` embarque les petits ensembles documentaires utiles au carnet : adresse, cavités, friches, patrimoine et forages.
- `cachePolicy` énumère les données volontairement exclues : OSM, cadastre, relief et couvertures de requêtes. Elles restent actualisables et ne sont pas constitutives du carnet.
- `integrity` protège tout le document, sauf le champ `integrity` lui-même, avec une sérialisation canonique aux clés triées.

## Structure minimale

```json
{
  "format": "atlas-carnet",
  "schema": 1,
  "metadata": {},
  "territory": {},
  "content": {
    "observations": [],
    "notes": []
  },
  "presentation": {},
  "sources": {
    "references": [],
    "extracts": {}
  },
  "cachePolicy": {
    "embedded": false,
    "excluded": []
  },
  "integrity": {
    "algorithm": "SHA-256",
    "digest": "…",
    "bytes": 0
  }
}
```

## Compatibilité et limites

L’application accepte les anciennes sauvegardes `atlas-karst-snapshot` et les migre lors de l’import, mais elle n’en réexporte pas les caches dans le fichier `.atlas`. Un schéma plus récent que celui compris par l’application est refusé sans être modifié.

Le budget conseillé est de 4 Mo et le plafond d’import d’un carnet est de 16 Mo. L’export HTML autonome reste le format prévu lorsqu’une copie complète de l’état cartographique chargé est nécessaire.
