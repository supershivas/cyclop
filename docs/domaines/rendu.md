# Rendu

<!-- Sorti de CLAUDE.md : `rendu3d.js` et `rendu/` : caméra, sol, soldats, effets, nuit et ciel, performances du dessin. Le texte est celui d'origine, sans changement ; décisions datées, mesures et pièges avec leur coût. Un ajout se range ici, pas dans CLAUDE.md. -->

- **Le feu se voit, le tronçon se lit** (Jérôme, v0.9.2 ; maquettes B et C du sujet
  « Attaque d'une tranchée » du labo, sur la frise du temps de `js/lib/labo-timeline.js`) :
  les informations sont dans le monde, pas dans des plaques. Un éclair à la bouche du
  fusil et un traceur pour chaque tir (`majTirs` de rendu3d.js, de `B.tirs`, que la
  logique remplit sans rien changer à la partie), un homme qui a très peur se tapit
  (`TAPI`) ; un fanion sur le parapet de chaque tronçon, à la couleur de celui qui le
  tient (`majFanions`), déchiré quand l'autre camp y est entré (`B.disputes`), amené puis
  hissé quand il change de main. Les ouvrages (Jérôme, v0.18.0 ; `majOuvrages` de rendu3d.js) : deux traverses par
  tronçon, des sacs de terre sur le parapet (à l'envers quand le tronçon est pris : le parapet devient le parados), du fil de fer
  devant les premières lignes (coupé, à terre, là où l'autre camp est entré ou a pris), une porte dans la paroi arrière par niveau
  d'abri (`etat.abris`) ; tout se lit de l'état, rien n'en est sauvegardé ; à partir de 3 pixels par mètre, refait deux fois par
  seconde, seulement ce qu'on voit. Les fusées (variante D) et le tout ensemble (E) n'ont pas été retenus.
- **La végétation** (Jérôme, v0.7.0) : l'herbe (`T.herbe`, 0 à 3 par case, tirée de
  la graine ; les obus la soufflent, la boue la tue : rejouée par la sauvegarde),
  des taches dans la couleur du sol et des touffes de près qui ondulent ; des
  buissons en haies et en bosquets (`T.buissons`, arrachés par les obus).
- **Les soldats de près et les effets** (Jérôme, v0.8.0) : la silhouette complète
  (`SOLDAT` de rendu3d.js : jambes, vareuse, visage, casque, fusil, sac ; de près
  seulement, à partir de 6 pixels par mètre ; dès 4 pixels par mètre, une silhouette allégée, `legere` : jambes d'un bloc, corps, bras,
  tête, fusil, sans sac ; Jérôme, v0.17.0 : à 900 hommes vus au zoom 4, ~66 ms contre ~67 pour les boîtes, dans le bruit) et tous les effets (`EFFETS` : gerbe,
  onde, obus qui tombe, fumée qui dérive, feu qui se propage, fusées le soir,
  corbeaux sur les morts) ; les autres variantes restent au labo.
- **Le temps qui passe** (Jérôme, v0.8.0) : le soleil (`majSoleil` : les ombres des
  soldats et des arbres tournent et s'allongent), le soir et la nuit (`obscurite` :
  un voile de terre de 16 h à 18 h, épais la nuit, sans trame depuis la v0.9.3 : `styleNuit`), les lumières qui la trouent
  (`majNuit` : lanternes le long des tranchées tenues, lampes mobiles de l'arrière (v0.39.0), incendies, fusées).
- **L'écran titre** (Jérôme, v0.8.1) : derrière le titre, le moteur du jeu montre une
  bataille de décor (`decor` de main.js, jamais sauvegardée) : un no man's land
  labouré et gorgé de pluie, des morts, l'heure arrêtée au coucher du soleil (ombres
  longues, le soir qui tombe), des obus au loin, des colonnes de fumée (`fumer` de
  rendu3d.js). La caméra au ras du sol (`cameraLibre` : sans bornes, le ciel de la
  couleur de la brume) et une image différente à chaque lancement : graine, lieu,
  direction, heure entre 17 h et 17 h 45 (Jérôme, v0.8.2). Le titre, le menu et la
  roue sont sur des plaques opaques.
- **Plus d'arbres** (Jérôme, v0.8.0) : 150 dans le secteur et trois bois serrés (`bois`
  de secteur.js), autant dans les marges.
- **Les lampes de l'arrière** (Jérôme, v0.39.0 ; `lampesDe` de rendu/temps.js) : un régiment qui n'est pas en 1re ligne (une ligne de rang 2 à 4, ou un ordre en terrain libre derrière la 1re ligne de son camp ; en face aussi) a une lampe pour dix hommes (`LAMPES_PAR_HOMME`), qui va et vient le long de sa place à 0,7 à 1,5 m/s, 4 à 10 m derrière sa ligne, au-dessus du sol d'un mètre avec un balancement de pas. Le dessin seulement : tout vient de l'état et de `uT` (l'horloge de l'image), aucun tirage, rien de sauvegardé. Mêmes points que les lanternes fixes (120 au plus), 380 en tout ; la carte des lumières passe de 64 à 192 sources (une lumière hors de l'écran ne compte pas). Elles paraissent dès que la trame monte (16 h 15). Mesuré (8 000 soldats, rendu logiciel, nuit, dessin attendu) : zoom 1 80 ms contre 80, zoom 3 117 contre 113, zoom 5 148 contre 148 : dans le bruit. `test/rendu.json` réécrit (35 images : le soir et la nuit en sont plus lumineux ; `matin` et les suivantes : la mêlée de nuit change les morts). Non fait : les lampes ne suivent pas un trajet de corvée (ravitailleurs, brancardiers), elles vont et viennent. **Fusées de nuit** (v0.39.1, `majFusees` d'eclats.js) : phase `nuit`, une toutes les 2 à 6 s sur 140 m de large et 60 m de profondeur (le soir : 5 à 12 s, 80 × 35) ; même nombre de tirages par fusée, `test/rendu.json` inchangé (ses images de nuit sont trop courtes pour en voir une de plus).
- **Le ciel de la nuit** (Jérôme, v0.40.0 : « les étoiles et la lune, l'évolution des phases de la lune de jour en jour, nuit nuageuse, étoiles filantes » ; `data/lune.js`, `ciel.nuit` de rendu/ciel.js, `nuitCiel` de rendu/shaders.js) : un second plan plein écran, peint après le voile de la nuit à la profondeur du fond (`depthTest` : seuls les pixels que ni le sol ni rien n'a dessinés, donc le ciel, le reçoivent) : des étoiles (une grille d'angles, une case sur vingt-cinq, qui scintillent), la lune (un disque de 0,03 rad avec sa phase, une lueur), des nuages sombres devant, éclaircis près de la lune, une étoile filante toutes les 7 s une fois sur deux. **Tout vient du jour, de la graine et de l'horloge de l'image** (`lune(jour, graine)` : une phase par hachage de la graine plus (jour − 1) / 29,53, donc d'un trentième de lunaison par jour ; `couvertureNuit` : le temps puis un écart de nuit en nuit ; `clairDeLune`) : aucun tirage du générateur de la bataille, rien de sauvegardé. La pleine lune éclaire le champ (le voile de la nuit passe de 0,74 à 0,64 au plus : `obscurite(h, clair)`), la pluie et le brouillard l'étouffent (`CLARTE`). Le papier de la nuit dit la phase et le ciel (`#nuit-ciel`, `nomPhase`, `cielEnMots`). **La lune est basse** (hauteur 0,08 à 0,22 rad, testé) : la caméra du jeu à son plus bas (`tangage` 0,02, fov 30°) ne voit que ~15° de ciel ; à 0,5 rad (le premier essai) la lune n'était jamais à l'écran, trouvé en balayant le lacet sur des captures. Le plan se cache quand le haut de l'écran ne regarde pas au-dessus de l'horizon (la caméra normale : aucun coût) ; sinon le nuanceur plein écran coûte en rendu logiciel (8 000 soldats, nuit, dessin attendu : tangage 0,95 inchangé, 117 / 131 / 182 ms aux zooms 1, 3, 5 ; tangage 0,1 : 106 → 135 ms) ; un `discard` en tête du nuanceur coupait le test de profondeur avant lui (+23 à +32 ms même sans ciel visible). `test/fumee.json` réécrit (la ligne du papier), `test/rendu.json` réécrit (les images du soir et de la nuit montrent des étoiles et ses nuages). Non fait : la lune ne passe pas dans le ciel au fil de la nuit (elle est fixe pour une nuit), pas de reflet dans l'eau.
- **Des soldats qui épaulent** (Jérôme, v0.13.0) : à partir de 6 pixels par mètre (la silhouette), des bras le long du corps ; un
  homme qui tire (`B.tirs` : le 6e nombre est son indice) lève les bras et le fusil devant lui et se tourne vers sa cible, un
  instant (`aTir`, `tirVal` de `majTirs` : le dessin seulement). Les boîtes de loin ne tirent pas.
- **Les ombres et la profondeur** (Jérôme, v0.11.0) : l'ombre d'un soldat ou d'un arbre
  est le sol un ton plus sombre (la couleur de paroi de la case), fondue (transparence continue, plus de
  trame depuis la v0.12.1) de plus en plus claire vers son bout ; le fond d'un creux s'assombrit d'un ton à 1 m, d'un
  autre à 2,5 m, et d'un encore quand il est entouré de parois (`couleurCase`).
- **Tous face à l'ennemi à l'arrêt** (Jérôme, v0.52.1 puis v0.52.2 ; `maj` de rendu/soldats.js) : au départ chaque homme est déjà tourné vers l'ennemi (`CAPS` à NaN jusqu'à sa première image, puis l'ennemi : nous π, vers le nord ; en face 0) ; en marche (> 0,3 m/s) il regarde où il va (lissé 0,3) ; à l'arrêt il se tourne vers l'ennemi (lissé 0,1) ; quand il tire, la cible passe devant. La v0.52.1 les tournait toujours vers l'ennemi, même en marche : refusé. Avant (v0.48.0) ceux qui n'avaient jamais bougé regardaient le sud, donc nous tournions le dos à l'ennemi. Le dessin seulement ; `test/rendu.json` réécrit.
- **Le sol en cubes plus fins, au labo seulement** (Jérôme, v0.52.2 ; sujet « Le sol en cubes plus fins » du labo, `rendu.finesse` de rendu3d.js, `hauteurFine`) : `finesse` 1 (le jeu, inchangé au pixel près : `test/rendu.json` n'a pas bougé) ou 2 : chaque case se coupe en quatre cubes de 0,5 m dont la hauteur est la hauteur dessinée des quatre cases voisines mêlée au centre du petit cube, arrondie au quart ; à un mur de 1,5 m ou plus (tranchée, falaise) le petit cube garde la hauteur de sa case. **Les couleurs au demi-mètre** (v0.52.2, après « je ne vois pas une grande différence » : avec les seules hauteurs fines, les taches restaient en carrés d'un mètre) : une seconde texture `solTexFin` (2 W × 4 H, ~17 Mo, créée au premier passage en finesse 2 seulement, `ecrireFin`) donne quatre texels par case ; un petit cube prend la couleur de la case voisine (horizontale pour un hachage de la position < 0,3, verticale < 0,6) quand elle est du même niveau et hors de l'eau profonde, donc les bords des taches d'herbe et de boue sont effrangés au demi-mètre, sans hasard ; les rangées changées et leurs deux voisines sont réécrites. Aucune couleur nouvelle. Le nuanceur du sol n'a pas changé (les coordonnées sont normalisées par `uTaille`). Mesuré en jeu (rendu logiciel, dessin attendu, 750 hommes par camp, début de partie) : zoom 8 px/m, sol vide 13 000 → 45 000 triangles, 37 → 46 ms ; sur les tranchées 46 000 → 79 000, 50 → 64 ms ; zoom 4 px/m 54 000 → 115 000, 53 → 68 ms ; le sol coûte 0,3 → 5 ms par image côté jeu (refaire les morceaux). **Piège du labo** : `moteur(…, { zoom })` prend un **indice** de `ZOOMS` (0 à 7 : 1, 2, 3, 4, 6, 8, 12, 16 px/m), pas des pixels par mètre ; `zoom: 8` n'existe pas, le canvas restait noir (v0.52.2, trouvé en comptant les pixels clairs dans le même instant que le dessin, car une capture d'écran du canvas WebGL du labo est noire de toute façon : `mesure: true`) et le relevé de 706 000 triangles venait de là. Relevé du labo corrigé (zoom 8 px/m, 400 soldats) : 38 600 → 82 300 triangles, 44 → 48 ms. **Le lissage des bords** (`antialias: true`, essayé v0.52.2) coûte +60 à +80 % de dessin en rendu logiciel (zoom 1 : 79 → 141 ms) pour un effet à peine visible en basse résolution : non retenu.
- **Le sol au demi-mètre, en jeu à partir de 4 pixels par mètre** (Jérôme, v0.52.3 : « on passe au demi-mètre, c'est mieux » ; à la question toujours / dès 4 / dès 6, dès 4 ; `rendu.finesseDes = 4` dans main.js, `reglerFinesse` de rendu3d.js) : `dessiner` règle la finesse à chaque image (2 si `ZOOMS[zoom] >= finesseDes` et la caméra n'est pas libre, l'écran titre reste au mètre ; `attacher` repart au mètre). Les labos gardent `finesse` fixe (`finesseDes` null). **Les morceaux** se souviennent de leur finesse (`userData.F`) : un morceau fait à l'autre finesse ne se refait que dans la vue (`zoneVue` : le rectangle de sol vu plus 30 m ; 250 m autour du point visé si un coin regarde le ciel), les autres attendent qu'on les regarde ; les plus proches du centre d'abord, dans le budget de 4 ms. Un morceau fin coûte ~0,9 ms contre ~0,17 (mesuré : `stats.morceauxRefaits`, `msMorceaux`) : passer le seuil du zoom 3 au zoom 4 refait ~110 morceaux en ~25 images. La hauteur fine d'un morceau se calcule **une fois** dans une grille (`Int16Array`, bordure d'un cube), pas à chaque lecture des rectangles et des parois (×5). **Le décalage des parois** (`aDecal`) est un quart de mètre pour toutes les finesses : un morceau fait au mètre peut lire la texture fine (les deux se croisent le temps qu'on change de zoom), et un demi-mètre tombait pile entre deux texels. La texture fine (17 Mo) n'est écrite que tant que la finesse est 2 ; au retour elle est réécrite en entier (`finPerimee`, un à-coup d'environ 40 ms au passage du zoom). **Les hauteurs lues** : `surface` rend le cube dessiné sous le point (`hauteurFine`) en finesse 2, `surfaceLisse` interpole entre les centres des cubes de 0,5 m (les soldats), donc les arbres, tombes, herbes et lanternes se posent sur le cube dessiné ; écart entre le sol lissé et le cube sur 40 000 points d'un champ après une journée d'obus : moyenne 1,4 cm, 1 % des points à plus de 25 cm (les murs de 1,5 m : tranchées, falaises, où l'homme glisse d'un cube à l'autre). `versTerrain` : l'aller-retour écran → terrain → écran n'est exact ni au mètre ni au demi-mètre sur une paroi (le rayon touche le mur, `versEcran` repose le point sur son dessus) : 2, 10 et 27 points sur 400 à plus de 3 pixels aux zooms 4, 8, 16, contre 16, 18 et 24 au mètre ; le clic sur le sol tombe sur le cube vu (le hover de `fumee.json` lit « Terre jetée · Sol sec » là où il lisait « Sol sec » : le rayon touche la lèvre du cratère). **Mesuré** (8 000 soldats, rendu logiciel, dessin attendu, après barrages ; `node scripts/mesure.mjs --finesse 1|2|auto --zooms 3,4,5`, la mesure varie de ±10 % d'un lancement à l'autre) : zoom 4 px/m 122 → 129 ms (126 000 → 185 000 triangles), zoom 6 113 → 140, zoom 8 101 → 120 ; côté jeu le sol passe de ~1-2 à ~4-6 ms par image (le budget de 4 ms des morceaux, plus l'écriture de la texture fine et son envoi de 17 Mo toutes les 0,25 s). `test/rendu.json` réécrite : 28 des 37 images (toutes celles à 4 px/m ou plus : z4, z6, z8, obus, mêlée, choisis, rotation, soir, nuit, météo, retenu…) changent de 6 à 28 % de leurs pixels (bords de taches et de cratères en demi-mètres) ; `titre`, `z1`, `z2` ne bougent pas ; les six images `-z1` (choix, rotation, soir, météo) bougent de 0,1 à 1,4 % (les fumées et les éclats se posent sur le cube dessiné : positions différentes, pas de bug). `test/fumee.json` : l'étape `terrain` (le sol sous la souris) à partir de `fiche-regiment`. Non fait : écrire la texture fine par morceaux (three 0.170 renvoie tout, 17 Mo) ; un sol fin en dessous de 4 px/m.
- `js/rendu3d.js` (≈ 530 lignes ; le bord du terrain, `bord` de `creerRendu` et `rendu.bord` (Jérôme, v0.33.0, sujet « Le bord de la carte » du labo, variante A) : le jeu règle `faux-ciel` à chaque partie (Jérôme, v0.36.7 : le ciel noir devait suivre la météo ; un plan immense de plaques de la couleur du sol, `fauxMat`, qui se perd à 500 m dans la couleur du ciel, `js/rendu/ciel.js` (Jérôme, v0.36.8 : « léger dégradé, nuages ») : un plan plein écran peint avant tout, dégradé de l'horizon au zénith et nuages (bruit de valeur à quatre octaves, dérive lente, couverture et couleurs par temps : sec `e`, pluie `e` et `s`, brouillard `r`, gel `e` et `o`, tous mélangés en continu) lus du rayon de chaque pixel, donc ils suivent la caméra ; la caméra du jeu voit peu de ciel (fov 30°, plongée de 54°) ; la nuit, le voile le noircit ; `faux-noir`, l'ancien réglage, reste au labo), l'écran titre `null` (le terrain coupé net sur le ciel de brume) ; `noir`, `brume`, `papier` (le sol se fond sur `fondu` mètres dans la couleur du fond, dans `solMat`) et `faux` restent au labo ; les arbres des marges ne se fondent pas avec le sol) — three.js, ce qui ne se découpe pas encore : la caméra en perspective (`PerspectiveCamera`, `projeter`, `borner` la garde sur le terrain : les
  quatre coins de l'écran posés sur le sol ; `deplacerEcran`, `tourner`, `placerCamera`), la palette (une texture 10 × 2 : la couleur et celle de la paroi), le sol (morceaux de
  25 × 25 cases, dessus fusionnés en rectangles de même hauteur, parois sud, est et ouest seulement ; une texture RVBA d'une couleur par case et de sa paroi, refaite par
  rangées changées ; le même relief à tous les zooms, Jérôme, v0.12.0 ; `surface` et `surfaceLisse`, la hauteur lue par tous les modules), `versTerrain` (un rayon jusqu'au sol) /
  `versEcran`, la vue de ce qu'on voit (`majSoldats` : le rectangle englobant et la matrice écran, donnés aux soldats et à la végétation), `attacher` (brancher une bataille) et
  `dessiner` (l'ordre des appels compte : tampons, `needsUpdate`, budgets), et l'API publique. La respiration (`RESPIRATION`) s'ajoute à l'angle choisi (`souffle`), dans le dessin
  comme dans les conversions. Le rendu ne modifie jamais l'état. Un morceau du sol se refait aussi quand un de ses voisins change (ses parois sud, est et ouest en dépendent) ; les
  parois est et ouest (et les bords du champ, jusqu'au socle) existent pour la caméra tournée ; l'ouest, éclairé, garde la couleur du dessus.
- `js/rendu/` — ce que `rendu3d.js` a donné (v0.22.0, sans changement pour le joueur ; `docs/refonte-rendu3d.md`). Chaque morceau est une fabrique `creerX({ THREE, scene, col, … })` qui garde
  son état et se lit à chaque image ; ce qui change d'une partie ou d'une image à l'autre (la bataille `B`, le terrain `T`, `tAnim`, `vide`) est passé **en fonction**, jamais en valeur. L'ordre d'ajout
  à la scène et des tirages de `Math.random` est celui d'avant la découpe : le créer au même endroit de `creerRendu`. `shaders.js` (tout le GLSL, du texte), `geometries.js` (soldat, arbre, buisson :
  `creerGeometries(THREE, col)` ; la forme du soldat prend les attributs d'instance en paramètre), `meteo.js` (la pluie et le brouillard), `troncons.js` (fanions, clignotement et surbrillance d'un ordre,
  ouvrages des tranchées), `vegetation.js` (arbres, buissons, herbe, triés à chaque image ; `ombres()` rend le tampon des ombres d'arbres et le soleil, que possède `temps.js`), `temps.js` (le soleil,
  l'obscurité, les lanternes, la carte des lumières et le voile de la nuit ; `ecl` et `feux` sont lus pour éclairer fusées et incendies ; `styleNuit` du labo passe par `setStyleNuit`), `eclats.js` (éclats,
  balles, obus en vol, fumée, feux, fusées, corbeaux **et** les tirs et le souffle : une seule fabrique, car tout tire dans le même générateur de l'aspect `alea` — l'ordre des tirages fait l'image — et les
  mêmes tampons ; `tirs()` rend la pose des tireurs et le bond des soufflés, relus à chaque image par les soldats), `soldats.js` (les soldats, leurs anneaux, les corps et les tombes ; `maj({ x0, x1, z0, z1, e, p,
  choisis })` reçoit la vue calculée par `rendu3d.js`). Reste à décider : sortir le sol (`sol.js`) ou le laisser (voir `docs/refonte-rendu3d.md`).
- **La fumée de l'écran titre passait dans la partie** (Jérôme, v0.36.7 : « encore des fumées marron au démarrage ») : `attacher` ne vidait que les feux ; les éclats (fumée de 40 à 90 s), les balles et les obus en vol du décor restaient dans les tampons de `eclats.js`. `reinitialiser` les vide, avec les obus qui attendent le sol.
- **Le plan lointain de la caméra était resté dans un commentaire** (Jérôme, v0.36.8 : « avec une vue lointaine, une partie du champ est coupée ») : `camera.far = D * 6` était collé à la fin du commentaire de la ligne du `near`, donc `far` restait à 1 000 m (la valeur de création) ; au zoom 1 et à une vue basse, le fond du terrain, à plus de 1 000 m de la caméra, disparaissait en bande nette. Le faux terrain se perd à 500 m du champ dans la couleur du ciel. Un commentaire en fin de ligne ne doit jamais précéder du code.
- **Rendu logiciel (Chromium sans carte graphique)** : un triangle coûte cher.
  Au quart de mètre près, les courbes de niveau des bosses faisaient un triangle
  par case visible ; d'où `hauteurVueQ` : les bosses dessinées en marches d'un
  mètre, les cratères au demi-mètre (la logique garde le quart). Morceaux de 100
  cases : la moitié du champ restait dessinée au zoom 4 ; à 25, 6 500 triangles
  au lieu de 15 600 au zoom 8. Au-delà, c'est le remplissage des pixels qui coûte
  (~256 000 pixels à 640 × 400) : une seule lecture de texture par pixel (RVBA
  directe ; l'indice puis la palette coûtaient un tiers du rendu).
- **`gl.finish()` n'attend pas le rendu logiciel de Chromium** : la mesure lit un
  pixel (`readPixels`) pour attendre vraiment la fin du dessin.
- **Vue de biais, des fentes** : deux rectangles fusionnés qui ne partagent pas
  leurs sommets laissaient des fentes d'un pixel (le noir du fond) dès que la
  caméra tourne ; chaque face déborde de 3 cm (`E`).
- **La perspective coûte** (rendu logiciel, après trois jours d'obus, zoom 4,
  dessin attendu jusqu'au bout) : elle montre beaucoup de sol au loin, 54 000
  triangles et 46 ms ; d'où les facettes de 5 m au-delà du point visé (24 000
  triangles, 20 ms). Les facettes lointaines et le sol plat sont retirés depuis la v0.12.0 (voir « Ce qui a été retiré »). Les marges du terrain ont été mesurées pour elle : au zoom 1
  (640 × 400 pixels), le sol vu fait ~790 × 610 m.
- **La mesure au zoom 4** (v0.4.0) : la vue tombe sur des hommes rangés dans leurs
  tranchées (2 350 soldats vus au lieu de 591) : 46 ms jusqu'au bout du dessin, au
  lieu de 17. Le sol coûte autant qu'avant (~16 000 triangles) : ce sont les
  boîtes des soldats.
- **La caméra tournée coûte** (rendu logiciel, zoom 4, dessin attendu jusqu'au
  bout) : ~14,5 ms contre ~10,5 de face (parois est et ouest). Les soldats se
  trient dans l'axe de l'écran : un carré autour de la vue en dessinait six fois
  trop (28 ms). L'élimination des faces arrière ne gagnait presque rien et
  cachait des parois : abandonnée.
- **Le brouillard** sur tout l'écran rendait tout illisible : il s'épaissit
  seulement vers le haut de l'écran (le lointain). Il était tramé (Bayer) jusqu'à la v0.12.0 ; Jérôme (v0.12.1) ne veut plus de tramage : voile continu, ombres et fumée fondues.
- **Des balles et des obus à l'échelle** (Jérôme, v0.12.1) : une particule (point) a toujours au moins un pixel de côté, deux avec le facteur du zoom ; une balle, un trait d'un pixel (`LineSegments`) ; un obus, une ogive de 4 fois son diamètre, grossie deux fois (un 155 : 0,6 m de long, 1,2 avec le facteur, donc quelques pixels à 4 par mètre).
- **Les arbres et les buissons dessinés partout** : instanciés sans tri, ils
  coûtaient des dizaines de milliers de triangles hors de la vue (les buissons des
  marges : ~65 000). Ils sont triés à chaque image comme les soldats (`dansLaVue`). Tout dézoomé, tous les
  buissons du champ restaient dans la vue (59 600 triangles, 32 ms après trois jours) : ils
  ne sont plus dessinés quand le sol est à plat (15 900 triangles, 12 ms ; v0.7.1).
- **La v0.8.0 coûte** (rendu logiciel, dessin attendu jusqu'au bout) : la silhouette
  (~60 triangles par homme) n'est dessinée qu'à partir de 6 pixels par mètre (à 4,
  138 000 triangles pour 2 000 hommes) ; de loin, les arbres ne sont plus qu'un tronc,
  sans ombre. Restent les fumées et la trame du soir : 8 000 soldats au zoom 4, 66 ms
  (47 en v0.7) ; trois jours de bataille, 26 ms tout dézoomé, 41 ms au zoom 4.
- **Au ras du sol, on voit jusqu'à l'horizon** (l'écran titre) : 3 000 touffes d'herbe
  et tous les arbres avec leurs branches (78 000 triangles, 11 images/s en rendu
  logiciel). Les touffes s'arrêtent à 1,25 fois la distance du point visé, et un arbre
  plus loin que 1,3 fois (160 m au moins) n'est qu'un tronc : 18 à 27 images/s. Un seuil
  fixe de 70 m coupait l'herbe du jeu, où la caméra est haute (essayé, v0.8.2).
- **La nuit sans trame, mesurée** (labo, v0.9.3 ; 2 000 soldats, rendu logiciel, dessin attendu jusqu'au bout) : tout dézoomé, jour 54 ms, trame 63, voile continu 59, voile et halos 61 ; au zoom 4, jour 60, trame 71, voile 63, halos 65. Le voile continu n'est pas plus cher que la trame (le plan plein écran fait la même lecture de texture, sans le test de trame) ; il crée des couleurs hors palette. Adopté (voile et halos).
- **La nuit sans couleur nouvelle** : la palette n'a pas de « nuit » ; le soir et la
  nuit sont une trame (Bayer 4 × 4) de la couleur la plus sombre, trouée en douceur
  autour des lumières, peintes chaque image dans une petite carte (un quart de la
  résolution) : chercher 32 lumières pour chaque pixel coûtait plus que le reste du
  dessin (rendu logiciel, tout dézoomé : 46 ms au lieu de 26). Les ombres
  longues du matin étaient limitées à 3,5 fois la hauteur : à 5, celle d'un arbre
  traversait 45 m de champ.
- **L'herbe dans la couleur du sol** : en glaise sur le sol sec, comme le creux
  d'un cratère ; mais une tache seule, sans lèvre claire. En brume, elle se lisait
  comme du givre (essayé, v0.7.0). Éparse (une case sur 9 à 41) : un damier faisait
  du bruit partout (v0.1.0).
- **Une ombre opaque d'une seule couleur** (`t`) se lisait comme un trou (Jérôme,
  v0.11.0) : elle prend la couleur du sol un ton plus sombre, fondue vers son bout (trame jusqu'à la v0.12.0)
  (une lecture de texture de plus par pixel d'ombre : 77 ms au lieu de 73 au zoom 4,
  8 000 soldats, dessin attendu jusqu'au bout ; de l'ordre du bruit de la mesure).
- **Salves, balles, obus, corbeaux** (Jérôme, v0.25.0 ; `eclats.js`) : le tampon `ECLATS` (2 400) faisait le tour dans une salve de 220 (~200 éclats chacun, dont de la fumée de 8 à 16 s) et effaçait les
  éclats en vol : 6 000, et `particule` prend le premier emplacement libre parmi 24 avant d'écraser. Une balle court jusqu'à sa cible (`(distance − 1,5) / 110` s, 0,12 au moins ; elle ne faisait que 13 à
  20 m pour 70 de portée) : le tampon `BALLES` passe à 1 500 (160 tirs par image × la durée de vie). L'obus en vol est en os (`o`), pas en brume : contraste mesuré sur herbe, eau et vert, brume 1,3 à 1,8, os 2,3 à
  8,5, terre sombre 1,3 à 1,6 sur la boue ; il est allongé selon sa trajectoire de loin (au moins 6 pixels). Les corbeaux : trois nids de six au plus près de la vue, la moitié posée sur un corps, trois paliers (point
  aux zooms 1-2, trait 3-4 pixels par mètre, silhouette dès 6) ; aucun tirage de `alea`. Mesuré (8 000 soldats, rendu logiciel, dessin attendu) : zoom 4, 88 → 96 ms, dans le bruit.
- **Jeter des hommes depuis le labo** (v0.32.0 ; `labo-projections.js`) : `avancer` retire les morts du tableau (`compacter`) à chaque pas, donc les indices changent, les numéros (`id`) non : la maquette garde des `id` et se repère après chaque pas (`reperer`) ; le bond dessiné (`volT`, `volH`, `volD` de eclats.js) est indexé par soldat et se décale lui aussi, d'où `rendu.lancers(liste)` qui le repose en entier à chaque pas (le jeu ne pose plus aucun bond depuis la v0.32.3). Le jeu ne ralentit personne : la maquette retient le pas de ceux de l'anneau (position d'avant le pas + (pas fait) × force), même instant pour tous. `lancers` ne sert qu'au labo. La v0.32.3 a retiré le bond du souffle du jeu : `test/rendu.json` réécrit (six images du soir et de la nuit, celles où des obus tombent près d'hommes).
- **Fumées** (Jérôme, v0.27.0 ; `eclats.js`) : un coup de fusil laisse un petit nuage clair (`particule(2…)`, 1 coup sur 5 des tirs dessinés : à 160 tirs par image et 1 à 2 s de vie, le tampon `ECLATS` y suffit) ; la fumée d'un
  obus est noire (sorte 10, terre puis boue sombre, plus haute et plus large) avec la chance `FUMEE[calibre].noire` (75 : 12 %, 155 : 35 %, 220 : 60 %) et une colonne de 3 × `big` éclats reste 40 à 90 s (`reste` : 15, 30, 50 %), qui se dissipe sur
  le dernier quart de sa vie. Tout le dessin : aucun effet sur la partie.
- **Le soldat équipé et les morts couchés, retenus** (Jérôme, v0.28.0 : « D pour les cadavres, détails maximum pour les soldats » ; `SOLDAT = 'equipe-marche'`, `cadavre = 'poses'` de rendu3d.js). Proposés en v0.27.0 : le soldat équipé (`equipe`, `equipe-marche` dans `geometries.js` : bottes, capote, ceinturon, cartouchières, gourde, couverture, mains, baïonnette, casque et moustache de chaque camp ;
  les parties 10-19 ne se dessinent que pour nous, 20-29 que pour en face, `cache` du nuanceur ; `uBalance` : les bras balancent) et les cadavres qui sont les soldats couchés (`cadavre: 'couche' | 'poses'` de `creerRendu`,
  `corpsSoldatMat` : sur le dos, le ventre ou le côté, membres écartés selon le numéro ; la silhouette allégée dès 4 pixels par mètre, celle du style dès 6). Les autres variantes (`silhouette`, `planche`, `couche`) restent au labo.
  Mesuré (v0.28.0, 8 000 soldats, rendu logiciel, dessin attendu) : le soldat équipé coûte au zoom 8 138 000 triangles et 61 ms, contre 57 000 et 43-45 ms avec la silhouette ; zoom 4 inchangé (la silhouette allégée), ~100 ms.
- **La caméra libre** (Jérôme, v0.28.0 ; `vue.ciel` de rendu3d.js) : n'importe quelle direction (le lacet n'est plus borné), de l'horizon (`TG_CIEL_MIN` 0,02) presque au zénith (1,55), tous les zooms, le ciel de la couleur de la
  brume comme à l'écran titre ; le point visé reste sur le terrain et `borner` relève la caméra pour qu'elle reste à `GARDE_SOL` (1,5 m) au-dessus du sol sous elle (cinq itérations : la hauteur sous la caméra dépend de l'angle). Le plan proche passe de
  `D × 0,15` (14 m au zoom 4) à 0,5 m : sinon le sol du bas de l'écran, à moins de 14 m, était coupé et laissait voir le ciel sous les pieds. `versTerrain` rend `[-1e5, -1e5]` pour un rayon qui regarde le ciel (les ordres le refusent : « Hors du
  secteur »), `versEcran` rend `[-1e5, -1e5]` derrière la caméra (les étiquettes et la visée ne se mirent plus). Pas de limite de distance de dessin : tout dézoomé, vers l'horizon, les soldats d'un champ entier sont dans le cône ; non mesuré.
- **Les soldats scintillaient dans les cratères** (v0.16.0) : leur hauteur était celle de la case, en marches d'un demi-mètre
  (`hauteurVueQ`) : un homme à cheval sur deux cases changeait de hauteur à chaque pas. `surfaceLisse` (rendu3d.js) interpole entre
  les centres des quatre cases voisines : il glisse sur les bords des trous.
- **Les fanions et les tirs coûtent** (rendu logiciel, 8 000 soldats) : des boîtes de
  12 triangles pour 128 tronçons ajoutaient 3 000 triangles et ~10 ms tout dézoomé ; des
  plans de 2 triangles ne coûtent presque rien (v0.9.2). Les tirs sont vidés à chaque image
  et plafonnés à 160 points : tout dézoomé, il y en aurait des milliers.
