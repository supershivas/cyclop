@.claude/conventions-jeu.md

# Cyclopéen

<!-- Ce fichier ne décrit QUE le jeu actuel (section 15 des conventions).
     Ce qui a été essayé puis retiré part dans docs/archives/, avec sa raison.
     Chaque règle porte son coût : le bug, la mesure ou la raison qui l'a fait naître. -->

## Description

Titre de travail (tiré du lexique rare). On commande un secteur du front en
1914-18, à l'échelle de milliers de soldats, pendant une bataille de plusieurs
jours. La bataille est un terrain qui se transforme : les obus creusent, la pluie
fait la boue, l'eau monte dans les trous. Les pertes sont la monnaie du jeu. Ton :
la danse macabre, la catastrophe peinte avec calme. L'intention est dans `DESIGN.md`.

- **Production** : https://supershivas.github.io/cyclop/ (le dépôt s'appelle
  `supershivas/cyclop`)
- **Labo** : https://supershivas.github.io/cyclop/labo.html
- **Genre** : stratégie et gestion, temps réel avec pause active. Boucle
  principale : la bataille de plusieurs jours (jour : ordres et barrages ; nuit :
  l'évolution du terrain en lot).
- **Vue et rendu** : 3D low poly cubique, three.js, **perspective** à angle
  étroit (30°), plongée de 54°, tournée de 9° : les régiments lointains paraissent
  plus petits (Jérôme, v0.3.0 : c'est cela, « l'angle ») ; on la tourne (jusqu'à
  34°) et l'incline un peu, en douceur ; elle respire (un balancement de 2° en
  23 s, coupé si le système demande un mouvement réduit ; Jérôme, v0.3.1) ; elle
  ne sort jamais du terrain. Zoom par
  facteurs entiers au point visé (1, 2, 3, 4, 6, 8 pixels par mètre) ; aux zooms
  1 et 2, chaque soldat est un point. Sol en cubes et soldats en boîtes (Jérôme, v0.2.0 :
  les facettes et les sprites essayés au labo ne sont pas retenus). Profil game-system :
  `profils/pixel-3d-three.md`.
- **Cible** : ordinateur uniquement (souris, sélection au cadre, raccourcis,
  pause). Pas d'interface tactile ni d'aperçu téléphone (Jérôme, v0.1.0) : sur un
  écran tactile, l'écran titre dit que le jeu se joue sur un ordinateur.
- **Public** : joueur averti.
- **Les soldats** : chacun a un nom, un âge, un grade (la hiérarchie d'un
  régiment : un capitaine, deux lieutenants, un adjudant, des sergents, des
  caporaux, des soldats de 1re et 2e classe ; les grades allemands en face) et un
  état : fatigue des jambes et des bras, blessure (bras, jambe, tête), peur. Un clic
  sur un homme ouvre sa fiche (Jérôme, v0.3.0). De près (3 pixels par mètre et
  plus), le survol et le clic montrent un homme ; de loin, son régiment (hommes,
  blessés, morts, et la liste des officiers, des blessés et des morts, chaque nom
  ouvrant la fiche de l'homme) (Jérôme, v0.3.2). Les morts restent où ils sont
  tombés (`etat.corps` : `[x×10, y×10, camp, jour, id]`, sauvegardé ; Jérôme,
  v0.3.3) : un homme couché, au loin un pixel ; la couleur du camp le jour même,
  la glaise ensuite. Survolé ou cliqué, sa fiche.
- **Le feu se voit, le tronçon se lit** (Jérôme, v0.9.2 ; maquettes B et C du sujet
  « Attaque d'une tranchée » du labo, sur la frise du temps de `js/lib/labo-timeline.js`) :
  les informations sont dans le monde, pas dans des plaques. Un éclair à la bouche du
  fusil et un traceur pour chaque tir (`majTirs` de rendu3d.js, de `B.tirs`, que la
  logique remplit sans rien changer à la partie), un homme qui a très peur se tapit
  (`TAPI`) ; un fanion sur le parapet de chaque tronçon, à la couleur de celui qui le
  tient (`majFanions`), déchiré quand l'autre camp y est entré (`B.disputes`), amené puis
  hissé quand il change de main. Pas encore dessinés (au labo : traverses, fil de fer coupé,
  sacs retournés quand le tronçon est pris) ; les fusées (variante D) et le tout ensemble
  (E) n'ont pas été retenus.
- **Six régiments par camp** (Jérôme, v0.7.0 ; huit avant), 750 hommes.
- **La végétation** (Jérôme, v0.7.0) : l'herbe (`T.herbe`, 0 à 3 par case, tirée de
  la graine ; les obus la soufflent, la boue la tue : rejouée par la sauvegarde),
  des taches dans la couleur du sol et des touffes de près qui ondulent ; des
  buissons en haies et en bosquets (`T.buissons`, arrachés par les obus).
- **Les soldats de près et les effets** (Jérôme, v0.8.0) : la silhouette complète
  (`SOLDAT` de rendu3d.js : jambes, vareuse, visage, casque, fusil, sac ; de près
  seulement, à partir de 6 pixels par mètre) et tous les effets (`EFFETS` : gerbe,
  onde, obus qui tombe, fumée qui dérive, feu qui se propage, fusées le soir,
  corbeaux sur les morts) ; les autres variantes restent au labo.
- **Le temps qui passe** (Jérôme, v0.8.0) : le soleil (`majSoleil` : les ombres des
  soldats et des arbres tournent et s'allongent), le soir et la nuit (`obscurite` :
  une trame de terre de 16 h à 18 h, épaisse la nuit), les lumières qui la trouent
  (`majNuit` : lanternes le long des tranchées tenues, incendies, fusées).
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
- **La nuit et ses corvées** (Jérôme, v0.6.0) : une corvée par régiment (repos,
  réparer, caillebotis, inhumer, évacuer) ; voir `DESIGN.md`.
- **Le moral et l'expérience** (Jérôme, v0.5.0) : un moral par régiment (`moral`,
  `deroute` dans l'état), l'expérience de chaque homme (`exp` dans la foule), les
  promotions (`etat.grades`) ; voir `DESIGN.md`.
- **Le terrain au survol** (Jérôme, v0.5.0) : une plaque sous l'horloge dit ce qu'est
  la case sous la souris (`terrainSous` de bataille.js).
- **Les tranchées** (lot 1, Jérôme, v0.4.0) : quatre lignes par camp, des boyaux,
  des tronçons de 25 m qui changent de main ; voir `DESIGN.md`.
- **Session** : un run = une bataille de 10 à 15 jours sur un secteur (Jérôme, v0.9.0 ;
  trois avant), avec une mission (`etat.mission` : tenir, prendre ; `juger` à la fin,
  ou avant si le secteur tombe ; `etat.issue`) et une réserve de régiments frais pour
  la relève (`etat.reserves`, corvée `releve` de nuit.js : le régiment frais monte à
  12 m derrière la place qu'il prend). L'ordre de mission s'affiche au premier matin
  (pas en mode debug, que les scripts pilotent). Progression permanente prévue
  (Mémorial, état-major, trophées) : pas encore construite.
- **Steam** : porte ouverte (section 22). Manette : seulement le menu pour
  l'instant (`gamepad.js`).
- **Langue** : français seulement. **Son** : aucun en v0 (Jérôme, v0.1.0).
- Jeu : pas de sous-titre (section 3 des conventions).

### Palette « Boue et ciel bas » (js/palette.js, variables --jeu-*)

Choisie par Jérôme (v0.1.0). Trois valeurs éclaircies à la mesure de
`outils/lisibilite.mjs` : l'eau (proposée `#34434c`, même valeur que la boue en
gris) et les deux camps (proposés `#6f86a6` et `#5b5d48`, invisibles sur la boue).

| Lettre | Valeur | Rôle |
|---|---|---|
| `t` | `#16130f` | terre — le fond, l'ombre des soldats, les parois |
| `s` | `#2c2720` | boue sombre — creux dans la boue, parois |
| `b` | `#42392e` | boue |
| `g` | `#74664f` | glaise — sol humide, creux d'un sol sec, l'accent de l'interface |
| `h` | `#8d8a62` | herbe morte — sol sec, terre jetée |
| `e` | `#8a9799` | eau — reflète le ciel |
| `r` | `#a9a89a` | brume — pluie, fumée, glace, rides de l'eau |
| `o` | `#e4dfd0` | os — le texte, l'éclair d'un obus, le casque des choisis |
| `n` | `#a9bad0` | bleu horizon — nous |
| `x` | `#8f9374` | feldgrau — en face |

Un soldat se lit par sa couleur sur un sol sombre, par son ombre (`t`) sur un sol
clair. Un cratère : le creux un ton plus sombre, la lèvre de terre jetée un ton
plus clair (sans la lèvre, un cratère dans la boue ne se distinguait pas de la
boue en gris : échec mesuré). Aucune autre couleur dans le jeu ; seule exception :
le fond des boîtes de dialogue (`::backdrop` de `game.css`).

### Échelle

- Une case = 1 m. Hauteurs en quarts (25 cm). Secteur du lot minimal : 400 × 300
  cases, au milieu d'un terrain de 840 × 640 (des marges de 220 et 170 m, sans
  régiments, où les ordres ne vont pas) : tout dézoomé, la vue reste sur le
  terrain (Jérôme, v0.3.0).
- Soldat : 0,5 × 1,7 × 0,35 m (une boîte dont on ne dessine que le dessus et la
  face sud, plus son ombre). Arbre : 6 à 9 m.
- Image : basse résolution (hauteur ≈ 400 pixels, facteur entier
  `round(hauteur / 400)`), agrandie sans lissage. À 1 280 × 800 : 640 × 400 ×2.
- Caméra (`CAMERA` de rendu3d.js) : `fov` 30°, `tangage` 0,95 rad (0,7 à 1,35),
  `yaw` 0,15 rad (±0,6) ; à la distance où un mètre du point visé fait `ppm`
  pixels. Planche d'échelle : sujet « Échelle » du labo.

### Commandes

| Action | Clavier | Souris |
|---|---|---|
| Choisir un régiment | T (tous) | clic (Maj : ajouter), glisser (cadre) |
| Voir un homme, un régiment | — | survol ; clic (de près : un homme ; de loin : son régiment) |
| Marcher (sur une tranchée : l'occuper) | — | clic droit ; ou, réglage « tout au bouton gauche », clic sur le sol (Échap laisse les régiments choisis) |
| Barrage de 75, 155, 220 | 1, 2, 3 (touche physique) puis clic | bouton de la batterie puis clic |
| Arrêter le temps (pause active) | Espace | — |
| Déplacer la vue | flèches, ZQSD / WASD (selon l'écran) | Maj + glisser avec le bouton du milieu (la molette) |
| Tourner, incliner la vue | A et E (Q et E en QWERTY), R et F (touches physiques, en continu) | glisser avec le bouton du milieu (ou le droit) ; le cadran en bas à droite (Jérôme, v0.9.1) |
| Zoom | + et − | molette |
| Menu (pause) | Échap (annule d'abord un barrage visé) | bouton du HUD |

## Stack

- Vanilla JS, modules ES, sans build ; GitHub Pages par le workflow
  `.github/workflows/pages.yml` (tests avant publication).
- **three.js 0.170.0** (accord de Jérôme, v0.1.0), copié dans `vendor/` avec sa
  licence ; `js/three-lib.js` le charge et coupe la gestion des couleurs. Aucun CDN.
- Modules de game-system dans `js/lib/` (tenus à jour par
  `scripts/sync-game-system.sh`) : app-update, debug, game.css, gamepad,
  gh-publish, keys, labo-shell, loop, pointer, rng, save, sprites. Outils dans
  `outils/`.
- Données : `localStorage`, clés `cyclopeen:partie`, `cyclopeen:prefs` (le zoom,
  la caméra, `gauche` : tout au bouton gauche),
  `cyclopeen:atelier` (brouillon), `cyclopeen:gh-token` (jamais exporté). Export /
  import JSON dans les réglages.

## Structure

**Logique (pure : aucun DOM, aucune horloge, aucun hasard hors de la graine ; testée dans Node)**

- `js/terrain.js` — le champ de hauteurs : `base` (le sol généré depuis la
  graine, en quarts, jamais sauvegardé) + `diff` (un octet par case : ce que les
  obus ont fait). `impact()` : le motif du calibre, la dureté (0-1 m : 100 %,
  1-3 m : 50 %, au-delà : 25 %), le plancher à −6 m, la lèvre, les arbres abattus.
  `hydroLignes()` : une heure d'eau sur des rangées (pluie, nappe, infiltration,
  ruissellement, glissement de l'humidité vers les trous, évaporation). États :
  sec, humide, boue, eau, glace. `hauteurVueQ` : la hauteur dessinée (voir Pièges).
- `js/army.js` — la foule, copie divergente de `js/swarm.js` de Pierre (voir
  l'en-tête) : tableaux typés, grille de voisinage (2 m) par tri par comptage,
  séparation, place dans la formation du régiment, champ de coûts quand la place
  est loin, vitesse selon la case et la marche, tir par cône vers le carré
  d'ennemis le plus dense (carrés de 8 m), obus (`tuerDans`), `compacter`. Chaque
  soldat a un numéro (`id`, stable), une fatigue des jambes (la marche, plus dans
  la boue) et des bras (le tir), une blessure, une peur (`effrayer` : les obus
  jusqu'à trois fois leur rayon, un homme qui tombe à côté) ; jambes lourdes ou
  blessées : plus lent ; bras blessé : tire moitié moins ; terrifié : ne tire plus ;
  la nuit repose (`reposer`). L'expérience (`exp`) : le feu survécu (`effrayer`
  avec `R.experience`), les tirs, les prises, les nuits ; elle calme la peur et
  assure le tir. Un régiment ébranlé tire moins ; en déroute, il ne tire plus. Touché (`frapper` dans bataille.js) : tué ou blessé,
  et blessé deux fois, tué.
- `js/tranchees.js` — les tranchées : `ligneY` (le tracé d'une ligne, une
  fonction de x : créneaux de 10 m de part et d'autre, une ondulation lente),
  `creuserTranchees` (creusées dans `diff` à 1,5 m, un parapet d'un quart du côté
  de l'ennemi, des boyaux ; `T.troncon` : le tronçon de 25 m de chaque case de
  ligne), `ligneSous`. Les données sont dans `secteur.js` (`tranchees`).
- `js/nuit.js` — les corvées de la nuit (`corvees`, appelée par `aube(B, choix)`) :
  `tronconsDe` (la tranchée d'un régiment), `refusCorvee`, `travail` (réparer,
  caillebotis : `T.caille`), `choixEnFace`, `rejouerTravaux`. Les textes sont dans
  `data/corvees.js`, les nombres dans `reglages.js` (`nuit`). L'état garde
  `travaux`, `tombes`, `evacues`, `nuits`.
- `js/champs.js` — les champs de coûts : le terrain résumé en carrés de 4 m
  (`couts`, un octet), Dial, une direction par carré ; cache par but et version.
- `js/bataille.js` — l'état d'une partie et ses règles (`tirs`, `disputes` : pour le dessin seulement, jamais sauvegardés) : `nouvelleBataille`,
  `avancer` (un pas de 1/30 s), ordres (`ordonnerMarche`, `ordonnerBarrage` :
  ils rendent `{ refus }`), en face (barrages sur nos hommes les plus serrés,
  assauts sur nos tranchées), les tronçons (`prises` toutes les 15 pas,
  `tronconsTenus`, `etat.troncons` : qui tient chacun), le moral (`moral` chaque
  seconde, `moralEnMots`, la déroute, les refus d'ordres), les grades (`rangDe`,
  `promouvoir`), `terrainSous`, jour / nuit / fin, `aube`, `horloge`, `photo` / `restaurer` /
  `rejouerTerrain`. À un nouvel ordre, les places sont données dans l'ordre où
  sont les hommes (le long du front, puis d'avant en arrière) : sinon ils se
  croisaient.
- `js/apparence.js` — la couleur d'une case (partagée par le rendu, le labo,
  l'outil de lisibilité). `js/tuiles.js` — des tuiles d'essai peintes par elle.
- `js/identite.js` — le nom, l'âge, le grade d'un soldat (tirés de la graine et de
  son numéro ; le grade, de son rang de création dans son régiment, ou de sa
  promotion), son état et son expérience en mots. `js/data/noms.js` : prénoms, noms, grades de chaque camp.
- `js/data/` — `reglages.js` (tous les nombres, modifiables par l'atelier ;
  `soldat` : fatigue, blessures, peur),
  `calibres.js` (motifs 3 × 3, 5 × 5, 7 × 7), `meteo.js` (états et chaîne de
  Markov, prévision juste 7 fois sur 10), `secteur.js`, `lexique.js` (noms de
  nos régiments).

**Rendu et cycle de vie**

- `js/rendu3d.js` — three.js : caméra en perspective (`PerspectiveCamera`,
  `borner` la garde sur le terrain : les quatre coins de l'écran posés sur le sol),
  sol en morceaux de 25 × 25 cases (dessus fusionnés en rectangles de même
  hauteur, parois sud seulement), une texture RVBA d'une couleur par case (et de
  sa paroi), refaite par rangées changées ; aux zooms 1 et 2, le sol est une seule
  image plate où une marche d'un mètre devient une courbe de niveau ; soldats en
  instances (boîte et ombre) ou en points 2 × 2, seulement ceux qu'on voit ; arbres
  instanciés ; éclats et fumée d'obus ; pluie ; brouillard tramé (plus épais vers
  le haut de l'écran). `versTerrain` (un rayon jusqu'au sol) / `versEcran`. Au
  loin (au-delà du point visé), un morceau n'est plus que des facettes de 5 m sans
  parois (`construireGros`). La respiration (`RESPIRATION`) s'ajoute à l'angle
  choisi (`souffle`), dans le dessin comme dans les conversions. Le
  rendu ne modifie jamais l'état. Un morceau du sol se refait aussi quand un de ses voisins change (ses
  parois sud, est et ouest en dépendent). Les parois est et ouest (et les bords
  du champ, jusqu'au socle) existent pour la caméra tournée ; l'ouest, éclairé,
  garde la couleur du dessus. `deplacerEcran`, `tourner`, `placerCamera`.
- `js/main.js` — écran titre → bataille → nuit → fin ; le zoom et la caméra
  gardés dans `cyclopeen:prefs` ; les fiches (un homme, un régiment ; Échap
  les ferme), le repère de l'homme et la bulle du survol (`majBulle`, chaque image) ; HUD (horloge, prévision,
  morts des deux camps, batteries, régiments choisis, noms de nos régiments au-
  dessus d'eux) ; commandes ; sauvegarde ; mise à jour ; mode debug ;
  `window.cyclopStats()`.
- `index.html`, `css/style.css` — l'écran, le HUD et les dialogues (palette du jeu).
- `labo.html`, `js/labo.js` — le labo : échelle, sols et cratères (couleur et
  gris), palette, le moteur en direct (zoom 4, zoom 1, après un jour de pluie,
  gel), la caméra (perspective et respiration / immobile / sans perspective / plus
  de perspective / respiration marquée), les calibres. Les
  sujets du moteur affichent ce que coûte le dessin et proposent les zooms.
- `atelier.html`, `js/atelier.js`, `js/design-store.js` — l'atelier : les réglages
  chiffrés, publiés dans `assets/design/reglages.json`.
- `test/` — `node outils/test-run.mjs` (terrain, foule, bataille, sauvegarde, pureté).
- `scripts/mesure.mjs`, `scripts/trois-jours.mjs` — la mesure du critère et la
  bataille de trois jours jouée sans les mains (captures dans `captures/`).
- `lisibilite.config.mjs` — paires de couleurs et tuiles mesurées.

## Mode debug et mesure

- `?debug=1` : `window.__jeu` (`state`, `stats`, `avancer(n, passerNuits)`,
  `barrage(cal, x, y, camp)`, `marche(ids, x, y)`, `zoom(i)`, `camera(yaw, k)`, `teleport`,
  `bataille()`, `rendu()`, `fiche()`, `survol(x, y)`, `nuit()` : ouvre la nuit, `fin()` : la fin), `&seed=7`. F9 masque le panneau. Les
  coordonnées du mode debug sont celles du **secteur** (0..400, 0..300) : les marges
  s'ajoutent dans `main.js`.
- `?soldats=8000` : une bataille de 8 000 soldats (les deux camps).
- `?mesure=1` : chaque image attend la fin du dessin (lecture d'un pixel) ;
  `cyclopStats().ms.renduFini`. Sans lui, `rendu` est le temps côté jeu (comme
  `pierreStats()` de Pierre).

## Vérifier et livrer

```bash
node outils/test-run.mjs                 # règles, sauvegarde, pureté
node outils/captures.mjs --page index.html --page labo.html --page atelier.html
node outils/audit-ecran.mjs --page index.html --page labo.html --page atelier.html
node outils/lisibilite.mjs               # contraste, tuiles en gris
node scripts/mesure.mjs                  # 8 000 soldats : simulation et rendu
node scripts/trois-jours.mjs             # trois jours de bataille, captures chaque soir
node outils/stamp-version.mjs            # après chaque changement de version.json
```

## Exceptions aux conventions

- **Pas d'aperçu téléphone** (`apercu.html` retiré) : le jeu est pour ordinateur
  seulement (Jérôme, v0.1.0). Les deux URL d'une livraison sont le jeu et le labo.
- La manette n'ouvre que le menu (stratégie à la souris) : la section 22 demande
  plus le jour où le portage Steam se décide.
- Police : celle du système (mono), en attendant une police d'identité auto-hébergée.
- Les morceaux du sol font 25 × 25 cases, pas ~128 × 128 comme demandé au départ :
  mesuré (rendu logiciel), voir Pièges.

## Ce qui a été retiré

| Quoi | Version | Pourquoi (ce que ça coûtait) |
|---|---|---|
| Ombrage du sol en damier selon la pente | 0.1.0 (avant livraison) | du bruit partout : chaque bosse se lisait comme un cratère |
| Sol à facettes, soldats en sprites (labo) | 0.1.1 → 0.2.0 | non retenus par Jérôme ; facettes : +30 % de triangles sur un champ labouré, trame bruyante (`docs/archives/sol-facettes-et-soldats-sprites.md`) |

## Pièges connus

- **Déterminisme et cache** : un champ de coûts calculé « quand le cache le veut »
  aurait rendu une partie relue différente. Les champs ne dépendent que de `couts`,
  un résumé du terrain qui fait partie de l'état (sauvegardé) et n'est refait qu'à
  pas fixes, par bandes, dans un tampon à part (`coutsNeufs`) copié d'un coup.
- **La sauvegarde rejoue le terrain** (`rejouerTerrain`) : impacts du pas, puis
  l'eau, dans le même ordre que la partie ; la nuit en lot. Toute règle nouvelle
  qui change le terrain doit y être rejouée, sinon la partie relue diverge (le
  test « relue après une nuit » le voit). ~1,2 s pour relire un début de partie
  dans le navigateur.
- **Les impacts sont arrondis au décimètre avant d'être appliqués** : c'est ce que
  la sauvegarde garde (`[jour, pas, x×10, y×10, calibre]`).
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
- **Une marche d'un quart sur les bosses** : l'humidité glissait vers chaque case
  plus basse et dessinait une ligne sèche le long de chaque courbe de niveau ; elle
  ne glisse plus que vers une marche d'un demi-mètre (un trou).
- **Vue de biais, des fentes** : deux rectangles fusionnés qui ne partagent pas
  leurs sommets laissaient des fentes d'un pixel (le noir du fond) dès que la
  caméra tourne ; chaque face déborde de 3 cm (`E`).
- **La perspective coûte** (rendu logiciel, après trois jours d'obus, zoom 4,
  dessin attendu jusqu'au bout) : elle montre beaucoup de sol au loin, 54 000
  triangles et 46 ms ; d'où les facettes de 5 m au-delà du point visé (24 000
  triangles, 20 ms). Les marges du terrain ont été mesurées pour elle : au zoom 1
  (640 × 400 pixels), le sol vu fait ~790 × 610 m.
- **Les tranchées sont creusées dans `diff`** avant que les impacts ne soient
  rejoués (`monter`) : la sauvegarde n'en garde rien. Une bataille d'avant la
  v0.4.0 (`etat.tranchees` absent) se relit sans tranchées : les creuser sous des
  hommes déjà placés aurait changé la partie. Elles changent toutes les batailles
  (positions de départ), sans changer l'ordre des tirages.
- **Une tranchée de 2 m** ne se quitterait qu'à force (`vitesse.mur` : 8 quarts) :
  elle fait 1,5 m (6 quarts) plus un parapet d'un quart, une marche « raide »
  qui ralentit seulement. La protection au tir dépend du côté d'où vient la balle
  (`B.faces` : le côté de l'ennemi d'origine de chaque tronçon) ; contre les obus,
  c'est la règle du creux.
- **La mesure au zoom 4** (v0.4.0) : la vue tombe sur des hommes rangés dans leurs
  tranchées (2 350 soldats vus au lieu de 591) : 46 ms jusqu'au bout du dessin, au
  lieu de 17. Le sol coûte autant qu'avant (~16 000 triangles) : ce sont les
  boîtes des soldats.
- **Les sauvegardes d'avant les marges** (v0.2) se relisent : `restaurer` décale
  impacts, régiments, barrages et soldats de la largeur des marges et refait le
  résumé du terrain ; les soldats prennent leur numéro dans l'ordre (test).
- **La caméra tournée coûte** (rendu logiciel, zoom 4, dessin attendu jusqu'au
  bout) : ~14,5 ms contre ~10,5 de face (parois est et ouest). Les soldats se
  trient dans l'axe de l'écran : un carré autour de la vue en dessinait six fois
  trop (28 ms). L'élimination des faces arrière ne gagnait presque rien et
  cachait des parois : abandonnée.
- **Le brouillard** tramé sur tout l'écran rendait tout illisible : il s'épaissit
  seulement vers le haut de l'écran (le lointain).
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
- **Les travaux de la nuit changent le terrain** : ils sont notés dans
  `etat.travaux` et rejoués par `rejouerTerrain` après l'eau de la nuit (l'aube
  vient après elle) ; le test « réparer … relue » le vérifie. Une mort de la nuit
  passe par `mourir` (pertes, moral, promotions, corps), comme de jour.
- **Un tir sans cible** comptait pour la fatigue des bras (et l'aurait fait pour
  l'expérience) : des hommes « bras morts de fatigue » sans avoir vu l'ennemi. `tirer`
  rend false quand personne n'est à portée (v0.5.0).
- **En face se saignait à blanc** (v0.9.0, sur une bataille entière jouée sans
  ordres) : un assaut toutes les 160 s, n'importe où, de 130 m à découvert : plus de
  1 000 morts en cinq jours, et plus personne en face au sixième. Il ne sort plus que
  là où il a 1,6 attaquant par défenseur (`tranchee.rapport`) ; sinon il prépare au
  220 sur ce tronçon : une semaine de pilonnage, puis des assauts où nos lignes ont
  faibli (~300 morts chez nous, ~700 en face, sur 11 et 15 jours).
- **Les petites batailles des tests durent trois jours** (`jours: 3` de `petite`) :
  quinze jours de 200 hommes, c'était une minute de plus par test.
- **Le moral trop vif** : à 0,03 par seconde de peur, un seul barrage mettait un
  régiment en déroute en 30 s, et il se ralliait aussi vite ; à 0,006 (et un retour
  de 0,0015), une déroute dure le reste du jour (mesuré, 1 000 hommes par camp).
- **Les fanions et les tirs coûtent** (rendu logiciel, 8 000 soldats) : des boîtes de
  12 triangles pour 128 tronçons ajoutaient 3 000 triangles et ~10 ms tout dézoomé ; des
  plans de 2 triangles ne coûtent presque rien (v0.9.2). Les tirs sont vidés à chaque image
  et plafonnés à 160 points : tout dézoomé, il y en aurait des milliers.
- **Le clic droit et les gestes de Firefox** (Jérôme, v0.3.3) : un clic droit glissé
  déclenchait les gestes du navigateur (ou d'une extension). `main.js` empêche
  `pointerdown` des boutons droit et du milieu sur le canvas (ce qui supprime
  mousedown et mouseup) et arrête mousedown, mouseup, auxclick, contextmenu à la
  capture. Une extension installée avant la page peut encore les lire : d'où le
  réglage « tout au bouton gauche » et, pour la caméra, le bouton du milieu et le cadran à l'écran (v0.9.1 : tourner au clic droit restait gêné par les gestes de souris de Firefox).
- Ordre des tirages : `nouvelleBataille` tire la météo (une branche du générateur),
  puis les positions de départ. Changer cet ordre change toutes les batailles.
