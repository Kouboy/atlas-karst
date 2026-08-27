# Registre des sources

La version 0.18g établit une seule description canonique des données consultées par l’Atlas ; les versions 0.18h et 0.18i l’étendent à l’hydrométrie puis à la biodiversité agrégée. Le registre exécutable vit dans `src/app/source-registry.js` ; ce document en expose la politique humaine.

| Identifiant | Fournisseur | Couverture | Conservation dans un carnet `.atlas` |
| --- | --- | --- | --- |
| `openstreetmap` | OpenStreetMap | mondiale | référence, resynchronisation nécessaire |
| `adresse` | Base Adresse Nationale / Géoplateforme | France | extrait embarqué |
| `cadastre` | DGFiP / Etalab / IGN | France | référence, resynchronisation nécessaire |
| `cavites` | Géorisques / BRGM | France | extrait embarqué |
| `cartofriches` | Cartofriches / Cerema | France | extrait embarqué |
| `culture` | Ministère de la Culture | France | extrait embarqué |
| `wikipedia` | Wikipédia francophone | mondiale | extrait embarqué |
| `bss` | BRGM / Hub’Eau | France | extrait embarqué |
| `hydrometry` | Hub’Eau / PHyC / Vigicrues | France | extrait embarqué |
| `biodiversity` | GBIF et jeux contributeurs | mondiale | extrait agrégé embarqué |
| `nature` | API Carto Nature · IGN / INPN | France | extrait embarqué |
| `relief` | IGN / Copernicus / Open-Meteo | mondiale, priorité France | référence, resynchronisation nécessaire |

## Principes

- Un petit carnet conserve les observations et extraits documentaires utiles, pas les grands fonds cartographiques reproductibles.
- Chaque source possède un identifiant stable, un fournisseur, une licence, une couverture et une politique de rafraîchissement explicites.
- L’interface, les attributions, le diagnostic et les exports `.atlas` dérivent de la même définition.
- L’ajout d’un fournisseur commence par une entrée dans le registre, puis par son adaptateur de synchronisation et ses tests. Une source expérimentale ne doit pas être présentée comme disponible tant que ces trois éléments ne sont pas réunis.
- Les mentions de licence décrivent les jeux actuellement interrogés ; elles devront être revérifiées si un fournisseur, une route d’API ou un jeu de données change.
- Les espaces naturels remarquables sont des statuts de protection ou des inventaires écologiques. Ils donnent du contexte, sans démontrer la présence actuelle d’une espèce ni épuiser les règles locales applicables.
