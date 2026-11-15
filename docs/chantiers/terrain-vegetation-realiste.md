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
| 0 | **Mesurer, économiser** | la référence (ci-dessous) ; les maillages vides ne passent plus par three.js ; moins de maillages pour les arbres ; une silhouette pour les arbres lointains | moins de triangles, moins d'envois | **v0.135.2** : feuillage grossier, matrices par plage ; M3 : three.js 4,1 → 2,7 ms |
| 1 | **Le grain du sol** | dans le nuanceur du sol, selon la matière de la case : mottes et ornières dans la boue, cailloux, terre jetée, brins vus de haut dans l'herbe ; des limites déchiquetées entre herbe, boue et glaise ; l'usure tirée de l'état existant (sol tassé le long des boyaux, éclats autour des cratères frais) ; trames de la palette | 0 triangle ; quelques lectures de bruit par pixel | **au labo en v0.136.0** (« Le grain du sol », B, C, D à trancher) ; l'usure pas encore |
| 2 | **L'herbe dense** | de loin : la texture du lot 1 ; dès 6 px/m : un seul appel qui tire les touffes dans le nuanceur de sommets (`gl_InstanceID` + hachage de la case), sans tableau rempli par le JS ; un fondu au zoom de bascule | triangles bornés, JS ~0 | à faire |
| 3 | **Les arbres de champ de bataille** | cime arrachée, branches cassées, tronc fendu, chicot ; choisis par les obus tombés près de l'arbre ; des sous-bois (broussailles, fûts couchés) | payé par le lot 0 | à faire |
| 4 | **Les débris** | piquets, sacs, caisses, fil à terre : un seul appel instancié, posés par un hachage de la graine près des tranchées et des cratères | un appel | si le budget le permet |

Règles de chaque lot : **labo avant jeu** (2 ou 3 variantes, Jérôme tranche) ; aucun tirage du générateur de la bataille ni de `Math.random` pour le dessin ; `rendu-empreinte` réécrite seulement après avoir regardé les images ; `fumee` ; `lisibilite` (le grain ne doit pas noyer les soldats, surtout le kaki d'en face sur l'herbe).

## Lot 0 : la référence


**Mesuré** (lot 0, v0.135.2 ; `node scripts/mesure.mjs --zooms 0,3,5,7`, 8 000 soldats, rendu logiciel, ±10 % d'un lancement à l'autre) :

| Vue | Triangles dessinés (arbres) avant → après | Rendu attendu avant → après | Envoi côté jeu avant → après |
|---|---|---|---|
| tout le champ (1 px/m) | 245 341 (198 715) → 113 769 (67 387) | 228 → 197 ms | 15,2 → 12,1 ms |
| zoom 4 px/m | 334 050 (33 907) → 338 225 (33 583) | 237 → 221 ms | 13,2 → 11,1 ms |
| zoom 8 px/m | 359 232 (14 785) → 365 368 (15 205) | 208 → 188 ms | 12,6 → 9,6 ms |
| zoom 16 px/m | 208 420 (4 542) → 210 644 (4 542) | 240 → 213 ms | 14,6 → 10,6 ms |

Deux économies : (1) **le feuillage grossier** (`ARBRES_GROSSIER` de data/arbres.js) sous 2,5 px/m à l'écran (tout dézoomé, loin derrière le point visé) : même touffes, mêmes places, mêmes couleurs, 15 triangles par touffe ronde au lieu de 42, le tronc seul ; tout le champ : les arbres 199 000 → 67 000 triangles ; 2 px/m : 107 000 → 56 000 triangles dessinés. (2) **les matrices envoyées par plage** (`envoyer` de rendu/vegetation.js) : sans plage, three.js renvoyait à chaque image tout le tampon de chacun des ~140 maillages d'arbres et de buissons (prévu pour tous les arbres de la carte, vides compris : ~14 Mo par image) ; d'où le gain aux zooms proches, où les triangles ne bougent pas. Compté avant (`inventaire()` de rendu3d.js) : 1 307 objets parcourus, 61 à 69 instanciés dont 8 à 40 vides (les rendre invisibles rapporterait peu). Images (`test/rendu.json` réécrite après les avoir regardées) : le haut des vues (arbres lointains) change sur 1 à 4 % des pixels ; pluie, gel, mêlée sur 8 à 12 % : les maillages de plus tirent des identifiants avec le hasard truqué, la pluie et les éclats se décalent (pas un changement de dessin). **Relevé sur le M3 de Jérôme** (`?perf=1`, v0.135.2, tout dézoomé, 1 327 soldats) : 100 i/s, image 10 ms, JS 7,0 ms (90 % : 9,0), three.js **2,7 ms**, sol 1,9, 1 172 appels, 218 k triangles. À comparer, avec prudence, au dernier relevé d'avant (v0.134.2, tout dézoomé : 91 i/s, three.js 4,1 ms, 907 appels) : le jeu a changé entre les deux (ciels, printemps), d'où plus d'appels ; three.js −1,4 ms malgré eux. Une pire image de 376 ms dont 3 ms de dessin : hors du JS du jeu (ramasse-miettes, onglet ou GPU), à surveiller.

## Lot 1 : le grain du sol (v0.136.0, au labo)

`data/grain-sol.js` (les matières, leurs lettres claires, leurs dosages ; les variantes), `solMat.f` de rendu/shaders.js (`uGrain`, éteint dans le jeu : `GRAIN_JEU` = 0, références inchangées), `grainSol` de rendu3d.js, sujet « Le grain du sol » du labo (l'atelier de terrain avec `{ grain }` et une case « Sans le grain »). La matière d'une case se reconnaît à sa couleur (`uPalSol`, refaite à chaque `attacher` : l'herbe rousse de l'automne) ; un point du grain prend la couleur de la case, de sa paroi (lettre d'ombre) ou de la lettre claire : aucune couleur nouvelle. Les bords déchiquetés lisent la case à côté, de sol à sol seulement.

**Mesuré** (`node scripts/mesure.mjs --grain N --zooms 3,5`, 8 000 soldats, rendu logiciel) : sans grain 214 / 183 ms (4 / 8 px/m) ; C 235 / 205 ; D 228 / 202 : **+7 à +12 %** en rendu logiciel (le nuanceur s'exécute pour chaque pixel du sol, sans carte graphique), à peu près ce que le lot 0 a rendu. Sur carte graphique : à relever sur le M3. Piste si on le garde : écrire l'indice de la matière dans l'alpha de la texture (aujourd'hui « marche » seulement) au lieu des 7 comparaisons de couleur (14 avec les bords).
