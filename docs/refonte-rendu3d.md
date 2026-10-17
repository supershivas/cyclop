# Découper `rendu3d.js` — le plan

Statut : en cours — l'étape 0 est faite (`outils/rendu-empreinte.mjs`, 22 images, stable sur deux lancements) ; les suivantes attendent. Aucun changement pour le joueur ; un commit par étape, l'empreinte du dessin ne doit pas bouger.

## Pourquoi
`creerRendu` est une seule fermeture de ~1 300 lignes (221 déclarations). Mesuré par section : 120 d'entre elles sont lues dans plus d'une
section. Le gros du couplage tient en peu de choses : la scène et la caméra (`THREE`, `scene`, `camera`, `vue`, `projeter`), la palette (`col`),
le sol (`surface`, lu par 12 sections) et un outil, `dansLaVue` / `vide` / `tient`. Le reste est bien plus local qu'il n'y paraît.

## Le modèle
Un objet `ctx`, construit d'abord, que chaque morceau reçoit : `{ THREE, scene, camera, vue, col, projeter, surface, surfaceLisse, bataille: () => B, … }`.
Chaque sous-système devient une fabrique `creerX(ctx)` dans `js/rendu/` qui garde son état et rend `{ maj(dt, …), … }` ; `dessiner()` les appelle dans le même ordre
qu'aujourd'hui (l'ordre compte : tampons, `needsUpdate`, budgets). Pas de classe, pas de bus d'événements : le modèle est celui de `js/hud/`.
`ctx` ne contient jamais l'état d'un sous-système : si deux morceaux se partagent un tampon, ils deviennent un seul morceau.

## L'ordre, du plus facile au plus dur
| # | Morceau | Pourquoi dans cet ordre |
|---|---|---|
| 0 | **Un test de dessin** (`outils/rendu-empreinte.mjs`) | rien ne se découpe sans lui (voir plus bas) |
| 1 | ✔ Pluie et brume (`js/rendu/meteo.js`) — empreinte identique, coût dans le bruit (8 000 soldats : 77-90 ms contre 81-93) | lues seulement par leur section et `dessiner` |
| 2 | ✔ Fanions, clignotants, ouvrages (`js/rendu/troncons.js`) — 25 images identiques, perf dans le bruit | un seul bloc cohérent ; besoin de `projeter` et `tient` |
| 3 | ✔ Arbres, buissons, herbe + `dansLaVue` (`js/rendu/vegetation.js`) — 25 images identiques ; le tampon des ombres et le soleil restent à `rendu3d.js` jusqu'à l'étape 4 | partagent `dansLaVue` et le soleil (`ARBRES_OMBRES`) |
| 4 | Le temps qui passe (soleil, obscurité, lumières, nuit) | `soleil` est lu par les arbres : après l'étape 3 |
| 5 | Éclats, balles, fumée, feux, corbeaux (`ecl*`, `particule`, `feux`) | lié à `arbresEtat` / `brules` et au tir : à faire après 3 |
| 6 | Soldats, tombes, corps, anneaux, tirs (`attrs*`, `tirVal`, `volT`) | le plus gros bloc ; le tir (« Le feu se voit ») et le souffle y sont mêlés |
| 7 | Le sol (`morceaux`, `construireMorceau`, `surface`) | le cœur : `surface` sort en dernier, quand tous ses lecteurs ont `ctx` |

Les étapes 1 à 4 enlèvent à peu près 500 lignes sans toucher un tampon partagé. L'étape 6 est la seule où je m'attends à un vrai arbitrage (le tir est dessiné par
les soldats **et** par les éclats).

## L'étape 0 : prouver que le dessin n'a pas bougé
Le test de fumée (`outils/fumee.mjs`) ne voit que le HUD. Il faut une empreinte du **canvas** :
- un temps figé : `performance.now` et `requestAnimationFrame` remplacés (`addInitScript`) par une horloge qui avance de 1/30 s par image, et `Math.random` par un
  générateur à graine (la pluie, les éclats et les corbeaux le lisent : voir « Les mesures » plus bas) ;
- une partie à graine fixe, temps arrêté, quelques barrages (pour les éclats), la nuit et une capture à chaque zoom utile (1, 2, 4, 6, 8) : tout le dessin y passe ;
- l'empreinte : un hachage des pixels du canvas (`readPixels`), écrit dans `test/rendu.json`, comparé exactement. Le rendu logiciel est déterministe sur une même machine ;
  si une autre machine donne autre chose, on garde la comparaison par image (PNG) plutôt que par hachage.
Si ce test ne peut pas être rendu stable, on s'arrête là et on garde le découpage actuel : sans preuve, on ne touche pas au dessin.

## Les mesures à tenir
- `node scripts/mesure.mjs` avant et après chaque étape : le coût de dessin ne monte pas au-delà du bruit (CLAUDE.md : ±2 ms à 8 000 soldats).
- Le nombre de triangles (`trianglesDessines`) est identique, à l'unité.
- `node outils/test-run.mjs` et `node outils/fumee.mjs` verts ; aucune erreur console.

## Ce que je ne ferais pas
- Un moteur d'entités ou un graphe de scène maison : on garde three.js tel quel.
- Changer l'ordre des appels de `dessiner()` ou fusionner des tampons « pour faire propre ».
- Découper le sol en premier : c'est le morceau dont tout dépend.
