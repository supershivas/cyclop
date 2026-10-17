# Découper `rendu3d.js` — compte rendu

Statut : **fait jusqu'à l'étape 6** (v0.22.0, aucun changement pour le joueur). Reste une décision : sortir le sol ou le laisser (étape 7).
`rendu3d.js` : 1 634 → 513 lignes ; `main.js` : 1 204 → 867 (le HUD est dans `js/hud/`).

## Le modèle (tenu)
Chaque sous-système est une fabrique `creerX({ THREE, scene, col, … })` dans `js/rendu/` : elle garde son état, rend `{ maj(…), … }`, et `dessiner()` les appelle dans le
même ordre qu'avant (tampons, `needsUpdate`, budgets). Ce qui change d'une partie ou d'une image (`B`, `T`, `tAnim`, `vide`, `survolTroncons`) est passé **en fonction**. Pas de classe, pas de
bus d'événements. Deux morceaux qui se partagent un tampon ou un générateur de hasard sont **un seul** morceau (c'est ainsi que le tir est parti avec les éclats : `alea`, `particule`, `balle`).
Le module est créé au **même endroit** de `creerRendu` que le code d'avant : l'ordre d'ajout à la scène et des tirages de `Math.random` est celui d'avant.

## Les étapes
| # | Morceau | Résultat |
|---|---|---|
| 0 | Le test du dessin (`outils/rendu-empreinte.mjs`) | 34 images à horloge et hasard truqués, hachées au pixel près ; deux lancements identiques ; 0,0001 de respiration change tout |
| 1 | Pluie et brume — `meteo.js` | images identiques |
| 2 | Fanions, clignotement des ordres, ouvrages — `troncons.js` | images identiques ; premier `ctx` (les quatre dernières entrées sont des fonctions) |
| 3 | Arbres, buissons, herbe, `dansLaVue` — `vegetation.js` | images identiques |
| 4 | Soleil, nuit, lanternes, lumières — `temps.js` (avec le tampon des ombres d'arbres) | images identiques |
| 5 | Éclats, balles, fumée, feux, fusées, corbeaux **et tirs** — `eclats.js` | images identiques ; un seul module (le hasard `alea` est partagé) |
| 6 | Soldats, anneaux, corps, tombes — `soldats.js` | images identiques ; `rendu3d.js` calcule la vue et la donne à `maj` |
| 7 | Le sol — `sol.js` ? | **à décider** |

Mesures à chaque étape (rendu logiciel, 8 000 soldats, `scripts/mesure.mjs` avant / après) : dans le bruit, de 50 à 99 ms selon le zoom, jamais de dérive d'une étape à l'autre.
Avant la découpe de `rendu3d.js` : `geometries.js` et `shaders.js` (le GLSL est identique à l'octet) ; pour `main.js` : `js/hud/` (`lecture`, `fiche`, `carnet`, `pertes`, `carte`, `nuit`).

## Ce que l'empreinte a dû apprendre en route
Elle ne protège que ce qu'elle dessine. Avant chaque étape, on a ajouté à son scénario les images que le morceau touchait, et réécrit la référence **sur l'ancien code** (`git stash push -- js/rendu3d.js`,
`--ecrire`, `stash pop`) : l'écran titre (étape 5), le souffle d'un 155 (5), les anneaux de sélection, le survol et les tombes (6), le clignotement d'un ordre et la surbrillance de la visée (2), les trois styles
de nuit du labo (4). Sans ces images, les extractions auraient passé sans que personne ne regarde ce qu'elles cassaient.

## L'étape 7 : le sol
`surface` et `surfaceLisse` sont passées en paramètre à sept modules ; la texture de couleurs et `refaire` alimentent `dessiner` et le budget de ms (que l'empreinte, au temps figé, ne voit pas).
- **L'extraire** (`sol.js`, `rendu3d.js` vers ~300 lignes) : seulement si un besoin précis l'exige (le labo ou l'atelier qui réutiliseraient le sol sans le moteur). Il faudrait d'abord une image de l'empreinte
  qui dépend du budget (un champ labouré après plusieurs jours de pluie, dessiné d'un coup) et mesurer `sol` de `cyclopStats()`.
- **Le laisser** : un fichier d'environ 500 lignes (caméra, palette, sol, orchestration) qui se lit d'une traite. Recommandé tant qu'aucun besoin n'apparaît.

## Ce qu'on ne fait pas
Un moteur d'entités ou un graphe de scène maison (on garde three.js tel quel) ; changer l'ordre des appels de `dessiner()` ; fusionner des tampons « pour faire propre ».
