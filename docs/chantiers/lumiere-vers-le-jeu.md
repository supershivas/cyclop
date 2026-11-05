# Brancher la lumière du labo sur le vrai jeu (plan, 5 novembre, v0.113.0)

Demande de Jérôme : le rendu du Labo lumière lui plaît ; il veut le voir dans le jeu, avec **des ombres portées pour les soldats, la fumée, les avions** (et le reste), un rendu qui tienne **plusieurs milliers de soldats**, et **un ciel plus réaliste** (soleil, nuages). Il a aussi vu **les soldats clignoter** au labo.

## Ce que je pense

**Garder three.js dans le jeu et y porter la lumière du labo, en quatre sessions.** Réécrire le rendu du jeu en WebGL 2 brut (comme le labo) refait le sol, les soldats, les arbres, les tranchées, les chars, les avions, les ponts, le camp, les effets : des semaines, pour un gain nul. Ce qui se porte, ce n'est pas du dessin, ce sont **des calculs purs sur un champ de hauteurs** (`js/lumiere/lumiere.js`, `lampes.js`, `ciel.js`), et le terrain du jeu (`T.base + T.diff`, en quarts de 25 cm, cases de 1 m) est du même modèle.

### Ce que le jeu a déjà (à ne pas refaire)
- un soleil qui se lève à gauche, des **ombres de relief** (`rendu/ombres-relief.js` : un masque par rangées, 3 ms par image, repeint dans la texture du sol), des ombres de nuages, un plan de ciel et de nuages (`rendu/ciel.js`), le voile de la nuit et ses lumières (`rendu/temps.js`, 192 sources), la météo (`rendu/meteo.js`), les soldats à tous les niveaux de détail (`rendu/soldats.js`, que le labo reprend) ;
- **une ombre au sol par soldat** (un quadrilatère teinté dans la texture du sol) : le labo ne l'a pas, d'où « pas d'ombres portées » ; mais elle est plate, ne tient pas compte du relief ni de l'ombre des autres, et n'existe ni pour la fumée, ni pour les avions, ni pour les chars.

### Ce que le labo apporte de neuf
AO par voxel et AO écran, lumière propagée sous les abris (flood fill), lanternes et lampes portées cachées par le relief, flashs d'obus, brume au sol, flaques, neige, faux terrain autour, ciel qui évolue. Tout est **déjà local et mesuré** (recalcul après un obus : 0,3 à 2 ms ; indépendant du nombre de soldats).

## Le plan, session par session

**S1 — au labo, avant de toucher au jeu (la plus utile, la moins chère)**
1. **Le clignotement** : le reproduire et le tuer. Hypothèses (non vérifiées) : (a) un homme change de niveau de détail d'une image à l'autre quand ses pixels par mètre frôlent un seuil (ou quand le plafond des 250 articulés se joue entre deux hommes à égalité) → **hystérésis** par numéro ; (b) la marche au hasard de la foule fait trembler position, vitesse et cap (le suivi lisse, mais la foule bouge de ±0,8 m/s) → un déplacement plus calme ; (c) l'AO écran (étape 8) est bruitée d'une image à l'autre → un flou et un bruit stables ; (d) des points de 2 pixels qui glissent d'un demi-pixel. À vérifier une à une en coupant l'étape ou le niveau.
2. **Les ombres portées dynamiques par une carte d'ombre** : une projection orthogonale le long du soleil, sur le rectangle de sol vu ; les soldats (le niveau « boîte » de 10 triangles suffit), les arbres, les chars et **les avions** y sont dessinés en profondeur ; **la fumée** y est dessinée en transparence cumulée (une ombre qui s'éclaircit où le panache est mince). Les nuanceurs du sol et des soldats la lisent (PCF 3 × 3) ; elle se combine avec l'ombre du relief par un minimum. Coût visé : < 1,5 ms de GPU ; 1 024² suffisent au zoom 4 (0,15 m par texel), 2 048² tout dézoomé (les soldats y sont des points : pas d'ombre).
3. **Le ciel v2** : un dégradé physique (diffusion de Rayleigh et de Mie : le zénith, l'horizon, le rougissement du couchant), un soleil avec sa lueur, **des nuages éclairés** (la densité vers le soleil donne un bord clair et un ventre sombre, deux couches : cumulus et cirrus), le tout alimentant **l'éclairage du sol** (couleur de l'ambiance, du soleil, de la brume) pour que ciel et sol s'accordent. Une remarque de fond : la caméra du jeu plonge à 54° et ne voit presque jamais le ciel ; son réalisme se verra surtout **dans la lumière du sol**, les ombres de nuages, l'écran titre et la caméra libre.
4. **Vos mesures** : lancer « Mesurer le coût GPU » puis « Exporter (JSON) » sur votre machine et me donner le fichier : c'est la seule donnée qui manque (le conteneur n'a que le rendu logiciel). Elle décide des niveaux de qualité du jeu.

**S2 — le jeu : la lumière du terrain**
Brancher `calculerSoleil`, `calculerAO`, `calculerFlood`, `calculerCavite` sur le terrain du jeu (840 × 640 cases avec les marges), **par rangées dans un budget par image** (comme `ombres-relief.js`) et par région après un obus ; une texture de lumière (soleil, ouverture, propagée, creux) lue par le nuanceur du sol (`solMat`) et celui des soldats. Les abris du jeu (`tr.toit`) alimentent le flood fill. Le jeu garde ses aplats de palette : la lumière les multiplie. **L'AO des arêtes** (cuite dans le maillage du labo) ne se transpose pas (le sol du jeu est fait de rectangles fusionnés) : elle passe par l'AO écran ou par une texture par case.
Réécriture de `test/rendu.json` (les 37 images) et de `test/fumee.json` ; rien dans l'état ni la sauvegarde ni le jeu à deux (le rendu lit, il ne modifie jamais).

**S3 — le jeu : les ombres dynamiques et les lampes**
La carte d'ombre de S1 branchée sur les soldats (équipe articulée comprise), les arbres, la végétation, la fumée (`eclats.js`), les avions (`avions.js`), les chars ; l'ancienne ombre au sol en quadrilatère disparaît. Les lanternes du jeu (`lampesDe`), les fusées, les feux et les éclairs d'obus passent par la couche de lampes du labo et ses flashs.

**S4 — le jeu : ciel, météo, réglages, passage en revue**
Le ciel v2 et la météo du labo (brouillard, neige, pluie, nuages qui dérivent) à la place de `ciel.js` et `meteo.js`, un réglage « Éclairage : bas / moyen / haut » (les niveaux du labo), les budgets, la documentation, les références, la mesure sur 8 000 soldats (`scripts/mesure.mjs`).

## Les risques
- **La palette** : « aucune autre couleur dans le jeu ». Le labo ne mélange que des lettres de la palette, en continu, mais un ciel et une lumière réalistes poussent contre cette règle. Défaut que je prends : **on garde la règle** (des mélanges continus de la palette, un rendu « peint avec calme ») ; à changer si vous voulez un ciel libre.
- **Le coût sans carte graphique** : à 8 000 soldats le jeu est déjà à ~100 ms par image en rendu logiciel. Les ombres et l'AO écran s'y paient : d'où les niveaux de qualité, et des mesures sur du vrai matériel.
- **Le sol du jeu** n'est pas celui du labo (rectangles fusionnés de 25 × 25 cases, texture de couleurs) : la lumière doit passer par des textures, pas par des sommets.
- **Les références** (`rendu.json`, `fumee.json`) changent entièrement : à regarder image par image.

## À trancher (valeur par défaut entre parenthèses)
Palette (on la garde) ; matériel visé (un ordinateur de bureau récent avec carte graphique, le rendu logiciel seulement en secours) ; ordre (S1 d'abord, puis S2 à S4).

## Première mesure sur du vrai matériel (Jérôme, 5 novembre, v0.113.0)
Apple M1, Firefox 156, niveau Moyen (étapes 1 à 7), carte de 512 × 320 m, 34 000 soldats, 1,27 million de triangles, 691 appels de dessin : **60 images par seconde**, 16,67 ms (la synchronisation verticale plafonne : on ne voit pas la marge). Le banc donne 4 à 5 ms par image avec **toutes** les étapes, y compris l'AO écran : aucune étape ne se distingue (moins de 1 ms chacune). **Limites de la mesure** : Firefox n'a pas de chronomètre GPU (`chronoGPU: false`) et arrondit `performance.now()` à 1 ms (le recalcul local après un obus s'y lit 0,006 ms de moyenne et 1 ms de pire : c'est de la quantification) ; le banc prend le meilleur quart de 18 images, trop peu pour une horloge à 1 ms. **À retenir** : sur un GPU intégré récent, le budget de la lumière actuelle est très large (≥ 3 fois de marge) ; ce qui dépasse est du calcul CPU unique : l'AO de toute la carte, 230 ms (budget 120) au chargement ou quand on réactive l'étape. À refaire sur une machine plus modeste (Windows, GPU Intel) avant de fixer les niveaux de qualité du jeu.

## Session 1 faite (v0.114.0, 5 novembre)

Tout est au labo (`js/lumiere/README.md`, « Ajouts de la v0.114.0 » : le détail, les mesures, les pièges). Ce qui est fait :
1. **Le clignotement** : trois causes, aucune n'était l'AO écran. (a) vraie : le **masque des points** ne partait au GPU que s'il y avait des articulés ; (b) **hystérésis** par homme (niveau de détail, places limitées, marche/arrêt) ; (c) **la foule tremblait** (tirage de ±3 cm à chaque image) : flânage lent à la place. La piste « points de 2 pixels qui glissent » n'a pas été retenue (le jeu fait pareil ; la foule calme suffit).
2. **La carte d'ombre** (étape 9, 1 024² Moyen, 2 048² Haut) : soldats, troncs et buissons, chars et biplans du labo (des boîtes : les modèles du jeu viennent en S3), fumée (épaisseur cumulée, ombre pâle sous un panache mince), combinée au relief par un minimum, cadre stabilisé. Le coût GPU est à mesurer sur du vrai matériel.
3. **Le ciel v2** : air traversé, Mie, couchant, soleil et lueur, cumulus éclairés, cirrus ; l'ambiance du sol vient du même modèle. **Palette gardée.**
4. **Le banc sous Firefox** : des lots d'images assez longs pour l'horloge à 1 ms, la médiane, l'incertitude affichée et exportée.
5. **L'AO global réparti** : 3 ms par image au lieu de 230 ms d'un coup.

**Ce qui reste pour vous** : relancer « Mesurer le coût GPU » puis « Exporter (JSON) » (Firefox ou autre, niveau Moyen puis Haut) et me donner le fichier : la ligne de l'étape 9 donnera le vrai coût des ombres, et l'incertitude dira si la mesure est bonne. Le conteneur n'a que le rendu logiciel.

**Ce que S2 devra savoir** : (1) la carte d'ombre et `ombreCarte` s'appellent depuis `eclairer` : le jeu, qui passe par three.js, devra recevoir la matrice `uLVP`, la texture de profondeur comparée et la texture de fumée dans `solMat`/`soldatMat` (les nuanceurs du jeu sont déjà portés par remplacement de texte) ; (2) la hauteur des casteurs vient du jeu (arbres de `vegetation.js`, avions, chars) : un jeu d'instances par type, comme `engins.js` ; (3) le jeu a une ombre au sol par soldat (quadrilatère teinté) : elle disparaît en S3, quand la carte d'ombre est branchée.
