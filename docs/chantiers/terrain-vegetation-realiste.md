# Un terrain et une végétation plus réalistes, au même coût (plan, 15 novembre, v0.135.1)

Jérôme : « Peut-on avoir une végétation et un terrain bien plus réalistes tout en gardant les mêmes performances ? »

## Décisions (Jérôme, v0.135.1)

- **Le style reste** : les cubes francs et la palette fermée. Le réalisme vient de la matière (le grain du sol), de l'usure (le sol tassé, les éclats) et de la destruction (les bois hachés), pas de couleurs nouvelles ni d'un sol lissé. Les teintes intermédiaires sont des **trames ordonnées de lettres de la palette**.
- **Le budget** : chaque lot reste dans le bruit sur **les deux** mesures : `node scripts/mesure.mjs --zooms 0,3,5,7` (8 000 soldats, rendu logiciel ; ±10 % d'un lancement à l'autre) **et** un relevé `?perf=1` sur le M3 de Jérôme (images par seconde, JS par image, appels de dessin).
- **L'ordre** : lot 0 (mesurer, économiser), puis le grain du sol, l'herbe dense, les arbres détruits, les débris.

## Pourquoi c'est possible

1. **L'image fait 640 × 400** (agrandie sans lissage) : du détail par pixel dans un nuanceur coûte peu, même en rendu logiciel. Ce qui coûte, ce sont les **triangles** et les **appels de dessin** (900 à 2 200 par image sur le M3, three.js 4 à 6 ms : `docs/domaines/rendu.md`).
2. **Le jeu dépense pour rien** : des maillages instanciés vides passent quand même par three.js (un appel de dessin, l'état du programme, les uniformes), les arbres ont des dizaines de maillages.
3. **La lumière, le relief et l'eau sont déjà riches** : ce qui fait « jeu de cubes », c'est la surface uniforme de chaque case et la végétation en boîtes.

**Méthode : on économise d'abord, on dépense ensuite.** Chaque lot dit ses mesures avant / après dans `docs/domaines/rendu.md`.

## Les lots

| # | Lot | Ce qu'il fait | Coût visé | État |
|---|---|---|---|---|
| 0 | **Mesurer, économiser** | la référence (ci-dessous) ; les maillages vides ne passent plus par three.js ; moins de maillages pour les arbres ; une silhouette pour les arbres lointains | moins d'appels de dessin, moins de JS | en cours |
| 1 | **Le grain du sol** | dans le nuanceur du sol, selon la matière de la case : mottes et ornières dans la boue, cailloux, terre jetée, brins vus de haut dans l'herbe ; des limites déchiquetées entre herbe, boue et glaise ; l'usure tirée de l'état existant (sol tassé le long des boyaux, éclats autour des cratères frais) ; trames de la palette | 0 triangle ; quelques lectures de bruit par pixel | à faire (labo d'abord) |
| 2 | **L'herbe dense** | de loin : la texture du lot 1 ; dès 6 px/m : un seul appel qui tire les touffes dans le nuanceur de sommets (`gl_InstanceID` + hachage de la case), sans tableau rempli par le JS ; un fondu au zoom de bascule | triangles bornés, JS ~0 | à faire |
| 3 | **Les arbres de champ de bataille** | cime arrachée, branches cassées, tronc fendu, chicot ; choisis par les obus tombés près de l'arbre ; des sous-bois (broussailles, fûts couchés) | payé par le lot 0 | à faire |
| 4 | **Les débris** | piquets, sacs, caisses, fil à terre : un seul appel instancié, posés par un hachage de la graine près des tranchées et des cratères | un appel | si le budget le permet |

Règles de chaque lot : **labo avant jeu** (2 ou 3 variantes, Jérôme tranche) ; aucun tirage du générateur de la bataille ni de `Math.random` pour le dessin ; `rendu-empreinte` réécrite seulement après avoir regardé les images ; `fumee` ; `lisibilite` (le grain ne doit pas noyer les soldats, surtout le kaki d'en face sur l'herbe).

## Lot 0 : la référence

(rempli par les mesures de la session)
