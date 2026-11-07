# Labo lumière — Cyclopéen

Une page à part, `labo-lumiere.html` (https://supershivas.github.io/cyclop/labo-lumiere.html ; lien dans les réglages du jeu), qui simule le futur jeu pour répondre à une question : **peut-on obtenir une lumière proche d'un GI voxel, sans raytracing, avec un budget tenable dans un navigateur ?** Elle ne change rien au jeu : c'est une maquette de mesure. Ordinateur seulement, WebGL 2.

Vue plongée sur un champ de bataille 14-18 : terrain en voxels déjà façonné (bosses, souches, buissons, **4 niveaux de tranchées par camp**, boyaux, **abris couverts**, 230 cratères), 1 000 à 50 000 soldats de quelques pixels (va-et-vient et vagues, aucun gameplay), un clic = **un obus** (un cube entier, 4 demi-cubes, 4 quarts de cube retirés), un **barrage**, une heure réglable (soleil bas, nuit), trois météos (sec, pluie, boue) et un jour de bataille (1 à 10) qui couvre le ciel.

## Les huit étapes (chacune s'active seule, réglages → engrenage, touches 1 à 8)

| # | Étape | Où elle vit | Ce qu'elle fait | Coût mesuré (rendu logiciel, grille 1 case/m ; chunk = recalcul local) |
|---|---|---|---|---|
| 1 | Lumière directe | `lumiere.js` `calculerSoleil` | par colonne, la pente de l'obstacle le plus haut vers le soleil (ombre douce, tronquée à 12-16 m pour rester locale) | carte 9-23 ms (un changement d'heure) ; chunk 0,01 ms ; GPU : une lecture de texture |
| 2 | AO par voxel | `lumiere.js` `calculerAO` + `maillage.js` | huit horizons par colonne (ouverture au ciel) + l'AO des arêtes de chaque cube, cuite dans le maillage | carte 18-38 ms ; chunk 0,6-1,6 ms ; GPU : ~0 |
| 3 | Mise à jour locale | `labo-lumiere.js` `obus` | un obus ne recalcule que son chunk et ses voisins, chaque étape sur sa zone d'influence ; décochée : toute la carte à chaque obus | 0,3-2 ms contre 50-100 ms en global |
| 4 | Lumière propagée | `lumiere.js` `calculerFlood` | flood fill façon Minecraft sous les toits des abris : la lumière entre par les bouts et perd 1/15 par mètre ; un toit brisé laisse entrer le jour | carte 5-12 ms ; chunk 0,1 ms |
| 5 | Atmosphère | `rendu.js` (composition), `particules.js` | brume au sol (intégrale exacte le long du rayon), fumée et poussière d'obus. Le fondu avec la distance, lui, est toujours là (« atmosphère simple » des niveaux bas) | GPU 0-4 ms |
| 6 | Lumières temporaires | `rendu.js` | jusqu'à 8 flashs d'obus (0,75 s) éclairent sol, soldats et fumée, sans ombre | GPU ~10 ms avec 4 flashs : **la plus chère après l'AO écran** |
| 7 | Météo | `ciel.js`, `lumiere.js` `calculerCavite`, `rendu.js` | boue sombre et brillante, flaques dans les creux (reflet du ciel, éclat du soleil), pluie, ciel et lumière du jour de bataille | carte 14-18 ms ; chunk 0,01 ms ; GPU 0-6 ms |
| 8 | AO écran | `rendu.js` (SSAO + flou) | contacts fins : soldats, débris, rebords (12 échantillons, rayon 0,75 m) | GPU 15-22 ms : **la plus chère** |

**Niveaux** (`QUALITES` de `config.js`) : Bas = 1, 2, 3 ; Moyen = 1 à 6 ; Haut = 1 à 8 et une grille deux fois plus fine (cube de 50 cm, 512 × 320 colonnes). Un niveau donne le départ ; chaque étape se surcharge à la main (marquée • dans les réglages, « Revenir au niveau »). Changer la grille régénère le terrain.

## Ajouts de la v0.112.0 (Jérôme : « continue les tests avec les vrais modèles de soldats ; ajoute la météo, le faux terrain en dehors, le ciel qui évolue »)

- **Les vrais soldats du jeu** (`soldats-reels.js`) : le modèle articulé de `js/rendu/soldat-articule.js` (treize os, visage, casque Adrian / Stahlhelm, sac, fusil, aspect tiré du numéro par `aspect-soldat.js`) pour **les 150 hommes les plus proches du point visé** (`plusProches`), dès 9 pixels par mètre (le niveau moyen ; le fin dès 20). Les nuanceurs du jeu (GLSL ES 1.0, three.js) sont **portés à WebGL 2 par remplacement de texte** (`glslVert`, `glslFrag` : aucune copie à tenir à jour) ; seul l'aplat de couleur est remplacé par `eclairer`, la lumière du labo (ombres, AO, flood, flashs, météo, nuages). Vitesse, cap (face à l'ennemi à l'arrêt) et peur (accroupi près d'un obus) viennent du suivi `creerSuivi`. L'homme dessiné en modèle est **masqué dans le tampon des points** (`aHide`). Case « Vrais soldats du jeu » dans les réglages ; coût dans le panneau (« Vrais soldats du jeu : n · ms »).
- **Le faux terrain en dehors** (`horsCarte` de la composition, `HORS_CARTE`) : la carte est un plateau (`M.bordM`, ses flancs descendent au bord dans `maillage.js`) qui se prolonge jusqu'à l'horizon par un sol calculé à l'écran (herbe, glaise, boue, vert : les matières de la palette ; relief faux pour l'ombrage seulement), éclairé comme le reste (soleil, nuages, météo, nuit) et fondu dans l'horizon. Aucun maillage de plus.
- **Le ciel qui évolue** : des **nuages** qui dérivent avec le vent (un champ de bruit sur un plan à 420 m, `NUAGES`), **leur ombre au sol** sur la même fonction (le nuage et son ombre s'accordent), le disque du soleil, **les étoiles qui scintillent et la lune** la nuit ; la couverture suit la météo et le jour de bataille. Bouton « Cycle » : la journée passe (un changement d'heure recalcule les ombres de toute la carte, 10 à 60 ms).
- **La météo** : cinq temps (`METEOS` : sec, pluie, boue, **brouillard, neige**), des nombres mélangeables (`melangerMeteo`), qui glissent d'un temps à l'autre ; bouton **« Temps qui change »** : le temps tourne tout seul (`METEO_AUTO` : un hasard à graine toutes les 22 à 40 s). Neige : le sol blanchit, des flocons. Brouillard : la brume au sol épaissit. Pluie : des traits inclinés par le vent, des flaques. Choisir un temps active l'étape 7 s'il le faut.

## Ajouts de la v0.113.0 (Jérôme : « ce ne sont pas de vrais soldats, ce sont encore des boîtes ; des sources de lumière dans les tranchées, sur certains soldats ; augmenter la taille de la carte ; ajoute une colline »)

- **Les soldats, avec l'échelle de détail du jeu** (`soldats-reels.js`, ce que fait `rendu/soldats.js`) : chaque homme a le niveau de ses pixels par mètre — **point** de deux pixels (le jeu aux zooms 1 et 2), **boîte** (dès 2,5 px/m ; 10 triangles), **silhouette allégée** (dès 4 ; 50), **soldat équipé** (dès 6 ; 218 : casque Adrian ou Stahlhelm, sac, gourde, cartouchières, fusil, jambes et bras qui balancent à la marche), **articulé** (dès 12, les 250 plus proches ; le modèle fin dès 24). Les géométries sont **celles du jeu** (`creerGeometries` de `rendu/geometries.js` avec un THREE de pacotille qui garde les tableaux) et les nuanceurs sont `soldatMat` et `VERT`/`FRAG` portés à WebGL 2 par remplacement de texte : aucune copie. **Comparé à des captures du vrai jeu** (zooms 6 et 8) : même silhouette, mêmes couleurs de palette. Le premier jet de la v0.112.0 ne montrait les vrais soldats qu'à 150 hommes et laissait le reste en colonnes bleues : c'était le défaut. Le choix se fait par homme, en un passage sur la foule (`classer` : ~2 ms à 50 000 soldats ; les débordements descendent d'un niveau) ; son vent, son cap (face à l'ennemi à l'arrêt) et sa peur viennent de `creerSuivi`.
- **Des sources de lumière** (`lampes.js`, étape 6) : **des lanternes** accrochées tous les 17 m le long de chaque ligne de tranchée et dans chaque abri couvert (242 sur la carte de 512 × 320 m, 13 ms), **des lampes portées** par un soldat sur 41 (au plus 48, près du point visé, refaites tous les 0,15 s : ~6 ms). Une lampe éclaire les colonnes de son rayon (une courbe douce) **si le relief ne la cache pas** (le parapet coupe la lumière : testé) ; le résultat est une couche de la grille, lue par tous les nuanceurs comme la texture du soleil. Une flamme se voit (un point doux, ajouté à l'image) ; par grand jour elle est à peine visible. Les lanternes se refont par région quand un obus change le relief.
- **Une carte plus grande** : 512 × 320 m par défaut (4 fois l'aire), au choix 256 × 160, 512 × 320 ou 768 × 480 (`TAILLES`, réglages) ; la grille revient à 1 case par mètre au-delà de 700 000 colonnes. **Les hauteurs ne dépendent plus de la grille** (tout ce qui était écrit en quarts de cube vaut un cube de 1 m : × cpm) : un mètre de haut est le même à 1 ou 2 cases par mètre. Le décor suit l'aire (obus, souches, buissons, bois, abris, boyaux). Le fondu avec la distance ne commence qu'au-delà du point visé (sinon la vue large était voilée).
- **Une colline** (`MONDE.colline`, `poserColline`) : 46 m de rayon, 16 m de haut, un sommet plat et des flancs raides dans le no man's land, que les tranchées coupent ; bouton « Vue colline ».

## Les outils de test

- **Mesures** (panneau de droite) : images par seconde, ms par image, soldats, grille, chunks, triangles, **ms par étape** (carte entière, chunk, GPU), recalcul local après un obus avec son budget, GPU par passe (si `EXT_disjoint_timer_query_webgl2`). **Une étape qui dépasse son budget (`ETAPES[].budget`) est écrite en rouge avec ▲ : elle n'est jamais masquée.**
- **Mesurer le coût GPU** : le banc rend l'image avec toutes les étapes coupées, puis chaque étape seule, puis cumulées (le meilleur quart de 18 images, attente de la fin du dessin). C'est la seule mesure du coût GPU d'une étape quand le navigateur n'a pas de chronomètre GPU.
- **Comparer** (C) : bascule instantanée tout activé / tout désactivé ; **Écran partagé** (V) : sans lumière à gauche, avec à droite (position réglable). Désactivé = couleurs de la palette, faces des cubes seulement.
- **Exporter (JSON)** : version, navigateur, niveau, grille, soldats, ms de chaque étape et de chaque passe, budgets, dépassements, banc.
- **Caméras** : vue large, vue tranchée (sur un abri couvert), vue cratère (le dernier obus). Clic droit glissé : tourner ; Maj glissé : déplacer ; molette : zoom ; **cases « toits transparents »** dans les réglages pour voir la lumière propagée sous les abris.
- `node outils/lumiere.mjs [--banc] [--sortie dossier]` : le même parcours dans Chromium (obus, niveaux, 1 000 puis 50 000 soldats, comparaison, météo, nuit, export), aucune erreur de console exigée. `node outils/test-run.mjs test/lumiere.test.mjs` : les règles pures.

## Les modules (à reprendre tels quels dans le jeu)

Logique pure (aucun DOM, aucune horloge, aucun `Math.random` : testé) :

| Fichier | Rôle |
|---|---|
| `config.js` | tous les nombres et textes : monde, obus, étapes et budgets, niveaux, météos, caméra, flash |
| `terrain.js` | colonnes de hauteur en quarts de cube (`sol`, `veg`, `toit`, `mat`, `top`), génération (graine 7), `impact`, `chunksDe` |
| `lumiere.js` | `calculerSoleil`, `calculerAO`, `calculerFlood`, `calculerCavite` sur une région ; la texture RGBA8 (R soleil, G ouverture, B propagée, A creux) |
| `maillage.js` | un chunk → sommets (position, AO, variation, normale, matière, « dessous ») et indices |
| `foule.js` | la foule (un xorshift par soldat, vagues) ; le sol sous chaque soldat est lu **par le nuanceur** : le coût ne dépend pas de la lumière |
| `particules.js` | débris, fumée, poussière |
| `ciel.js` | heure, jour de bataille, météo → soleil, ciel, ambiances (couleurs de la palette mélangées) |
| `camera.js` | caméra orbitale (fov 30°, jamais sous le sol), rayon, toucher le sol |

Hors logique : `rendu.js` (WebGL 2 : lit tout, ne modifie rien), `mesures.js` (chronomètres, budgets, banc, export), et `js/labo-lumiere.js` (l'écran).

## Ce qu'on a appris (v0.111.0)

- **Le coût de la lumière ne dépend pas des soldats** : le recalcul local vaut la même chose à 1 000 et à 50 000 soldats (outils/lumiere.mjs le vérifie à chaque niveau) ; la foule coûte 1,5 ms de CPU à 50 000 et un point par soldat au GPU.
- **Le recalcul local est exact** : après un obus, le recalcul des seules zones d'influence (dans le chunk touché et ses voisins) redonne exactement la texture d'un recalcul de toute la carte (test « le recalcul LOCAL donne exactement… »). La portée de l'ombre (≤ 16 m, un chunk) et le rayon de l'AO (≤ 8 m) sont ce qui le permet ; une ombre plus longue obligerait à recalculer plus loin.
- **La grille fine coûte 4 fois plus de colonnes et ~4 fois plus de calcul** : à 2 cases/m, le recalcul local dépasse le budget de 2 ms (1,8-3,4 ms) et un changement d'heure prend ~60 ms.
- **Un flood fill n'a de sens qu'avec des toits** : un terrain en colonnes n'a pas de surplomb, donc sans les abris couverts toutes les colonnes valent « ciel ouvert ». Vu de dessus, les abris cachent leur propre lumière : d'où la case « toits transparents ».
- **L'AO du maillage** (arêtes) et l'AO en espace écran ne font pas double emploi : la première donne les creux des cubes, la seconde les contacts avec les corps et les débris.
- **Pièges** : `smoothstep(a, b, x)` avec a > b est indéfini en GLSL (la fumée était un disque dur) ; une particule transparente dessinée avant d'activer le mélange est opaque ; `readPixels` pour attendre la fin du dessin déclenche un avertissement « GPU stall » dans la console (le banc seulement) ; `isBusyDefault` de app-update.js voit tout `[role="dialog"]`, même caché : le tiroir des réglages ne porte ce rôle que s'il est ouvert.
- **Les soldats coûtent** (triangles par homme) : boîte 10, allégée 50, équipé 218, articulé 1 272 (le modèle entier : les boîtes absentes sont aplaties par le nuanceur) ; le plafond de chaque niveau est dans `SOLDATS_REELS`.
- **Piège** : le nuanceur du jeu lit `position`, `projectionMatrix` et écrit `gl_FragColor` (three.js) ; le remplacement de texte le suppose (`test/lumiere.test.mjs` le vérifie) : si `soldat-articule.js` change ces mots, le test échoue.
- **Non mesuré** : le conteneur n'a que le rendu logiciel (SwiftShader). Les temps GPU se comparent d'une étape à l'autre, jamais en absolu ; il reste à lancer le banc sur une vraie carte graphique et à joindre l'export JSON.
