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
  facteurs entiers au point visé (1, 2, 3, 4, 6, 8, 12, 16 pixels par mètre ; Jérôme, v0.9.3 : tout près des soldats) ; aux zooms
  1 et 2, chaque soldat est un point (le sol, lui, garde le même relief à tous les zooms ; Jérôme, v0.12.0) ; en face est vert kaki clair (palette `x`). Sol en cubes et soldats en boîtes (Jérôme, v0.2.0 :
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
  hissé quand il change de main. Les ouvrages (Jérôme, v0.18.0 ; `majOuvrages` de rendu3d.js) : deux traverses par
  tronçon, des sacs de terre sur le parapet (à l'envers quand le tronçon est pris : le parapet devient le parados), du fil de fer
  devant les premières lignes (coupé, à terre, là où l'autre camp est entré ou a pris), une porte dans la paroi arrière par niveau
  d'abri (`etat.abris`) ; tout se lit de l'état, rien n'en est sauvegardé ; à partir de 3 pixels par mètre, refait deux fois par
  seconde, seulement ce qu'on voit. Les fusées (variante D) et le tout ensemble (E) n'ont pas été retenus.
- **Des papiers de campagne** (Jérôme, v0.10.0 ; variantes C et D du sujet « Plaques et journal » du labo) : le HUD est
  fait de ce qu'un officier a sur lui, pas de plaques toutes pareilles. `.papier` (l'os, l'encre de terre, une ombre d'un
  cran) : le billet de la montre (heure, météo, mission, terrain sous la souris ; la montre dessinée est retirée en v0.30.0 : l'heure est dans le texte), une rangée de cartes de régiment (v0.20.0 ;
  `majRegiments` de main.js : numéro et nom, chevrons d'expérience, barre debout / blessés / tombés ; la fenêtre du régiment choisi est posée juste au-dessus de sa carte et se relève d'un coup, charnière en bas (v0.34.6, variante C « Le rabat » du sujet « La fenêtre d'ordres » du labo ; v0.34.0 et v0.34.1 : près des hommes, avec une pointe, essayé puis remplacé ; `placerFenetre` de main.js, `#reg-ouvert` est dans la couche du champ, positionné à chaque image sur sa carte, caché si la carte a défilé hors de la rangée) :
  l'ordre en mots, un tampon si le moral baisse, « Marcher » (le prochain clic sur le sol), « Regagner sa tranchée », « Fiche » ; ses boutons ont tous la même largeur, deux colonnes égales (quatre pour les formes) : v0.38.3, `docs/design-system.md` ; v0.23.0 : quatre formes pour le prochain ordre en terrain libre, bloc / ligne / par deux / colonne, `foule.formes`, `ordre.forme`, `formation` de bataille.js ; sur une tranchée, le tracé décide), un râtelier d'obus (debout : prêt ; couché : se recharge), des croix au crayon pour les morts (douze, puis un nombre),
  la fiche en papier, et le **carnet de bord** (`noter`, `raconter` : tronçon pris ou perdu, l'autre camp entré chez nous
  (`dispute`), assaut et préparation d'en face (`assaut`, `preparation`, de `bataille.js`), déroute, ralliement, nouveau
  commandant ; quatre lignes à l'écran, la dernière surlignée ; il remplace les bulles d'avant, et n'est pas sauvegardé : il
  repart à zéro quand on relit une partie). `nomTroncon(B, t)` dit « tronçon 3 de la 1re ligne ».
- **Huit régiments par camp, quatre secteurs** (Jérôme, v0.14.0 ; v0.21.3 : plus simple), 750 hommes (94 chacun). Le front est vu en quatre
  secteurs de 100 m, A à D de l'ouest à l'est (`nombreZones`, `zoneDe`, `lettreZone` de bataille.js ; la logique garde des colonnes de
  50 m, `secteurDe`, `largeurSecteur`) : un régiment de départ occupe exactement un secteur, sans chevaucher le voisin. Chaque camp a
  quatre lignes, numérotées de 1 (la plus avancée) à 4 ; une tranchée se dit « B1 » (secteur B, notre 1re ligne), « B1–C1 » si elle court
  sur deux secteurs, « B2 en face » chez l'autre camp (`nomTranchee`, `codeLigne` ; `nomTroncon` : « B1, tronçon 3 »). Quatre régiments
  partent en 1re ligne, quatre en 2e (`depart: [0, 1]` de secteur.js ; Jérôme, v0.17.0) ; une lettre de la carte choisit les régiments qui
  couvrent ce secteur (`etendueZones`), et un ordre sur une tranchée étale un régiment sur 46 m au plus. La **carte**
  (`#carte`, toujours visible en haut à droite depuis la v0.19.0 : plus de touche M ; `construireCarte` / `majCarte` / `majRondes` de
  main.js) montre les 4 secteurs × 4 lignes de chaque camp (les lignes d'en face en vert kaki, leur numéro aussi), chaque case en quatre
  tronçons à la couleur de celui qui les tient ; une case envoie les régiments choisis dans cette tranchée (`ordreCase`) ; les régiments y
  sont des cercles numérotés. Tout ordre sur une tranchée (carte ou clic gauche) fait clignoter les tronçons visés trois secondes, sur le
  terrain (`rendu.clignoter`) et sur la carte, et le carnet dit ce que chacun va faire (`ordreDonne`) ; `actionDe(B, reg)` le dit en mots
  (« tient B1 », « attaque B1 en face », « marche à l'attaque de B1 en face ») sur la carte du régiment, avec les forces en présence dans
  la tranchée visée (« attaque B1 en face : 38 contre 5, mêlée 4/6 s » ; `forcesTroncons`, au plus une demi-seconde de retard) ; sur la
  carte, une case où l'autre camp est entré montre « attaquants·défenseurs ».
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
- **La nuit sur le champ** (Jérôme, v0.13.0) : plus de boîte de dialogue la nuit ni à l'aube. Le champ reste (assombri, ses
  lumières), un papier (`#nuit`, `nuitEtat` de main.js : `choix` puis `aube`) donne le bilan du jour ; on choisit des régiments (clic
  sur eux ou sur leur carte, cadre, T) puis une corvée parmi celles qui s'ouvrent au-dessus de la carte du dernier choisi (v0.22.0 : plus de
  liste dans le papier ; `donnerCorvee`, `corveesNuit`, `majRegiments`), dite sur chaque carte (`court` de data/corvees.js) et sous leur nom ;
  « À l'aube » lance `aube(B, corveesNuit)`, le bilan s'affiche sur le même papier, « Le jour se lève » reprend. Pas de marche ni de
  barrage la nuit (dit à voix haute) ; les batteries sont cachées.
- **La mêlée de nuit** (Jérôme, v0.39.0 : « il faut décider ce que deviennent les régiments au corps à corps » ; `meleeNuit`, `contactDe`, `comptes` de nuit.js, `CONTACT` de data/corvees.js, `nuit.meleeMort`) : un tronçon où les deux camps sont présents au soir est une mêlée en cours ; elle ne s'arrête pas avec le soleil. `aube` la joue **avant** les corvées : chaque homme du tronçon tombe avec la chance `meleeMort` (0,3) × 2 × (leurs forces / toutes les forces), donc à forces égales 30 %, le plus faible y laisse bien plus (3 contre 20 : 52 % contre 8 %) ; puis la règle du jour (`prises` : au moins `prise` attaquants et `melee` fois les défenseurs) dit si le tronçon change de main (les vainqueurs s'aguerrissent, leur moral remonte, celui des tenants baisse, événement `prise`), sinon la mêlée est encore là au matin. Les régiments **au contact** (un de leurs hommes dans un tronçon disputé) ne reçoivent aucune corvée : `refusCorvee` les refuse toutes, `repos` comprise, « Au contact de l'ennemi : il se bat toute la nuit » ; leur carte dit « Au contact » (`CONTACT`, pas un choix : `corvee()` ne le connaît pas), leur nuit est un travail (`faite = 'contact'` : ils se reposent comme à la corvée, `reposTravail`). Le bilan dit les morts « au corps à corps » et les tronçons pris ou perdus. Sans tronçon disputé, aucun tirage de plus. Mesuré (`scratchpad`, 750 hommes, sans ordres, 7 jours, graines 3, 7, 11) : le contact commence au jour 3 ou 4, 2 à 8 régiments, 3 à 39 morts par nuit au total, 48, 87 et 62 par bataille sur 620 à 810 de pertes, aucun tronçon ne change de main (les deux camps s'épuisent). Une attaque qui atteint la tranchée se joue donc la nuit : sur les petites batailles des tests (200 hommes, deux régiments à l'assaut), la mêlée a détruit les régiments au point d'effondrer la campagne d'essai (`meleeMort: 0` pour `jouerJusqu_aLaFin` de campagne.test.mjs, le registre n'étant pas l'objet). **Non fait** : un homme qui rentre vivant d'un coup de main, la contre-attaque dirigée par le joueur, la mêlée du jour (toujours `prises`).
- **Les lampes de l'arrière** (Jérôme, v0.39.0 ; `lampesDe` de rendu/temps.js) : un régiment qui n'est pas en 1re ligne (une ligne de rang 2 à 4, ou un ordre en terrain libre derrière la 1re ligne de son camp ; en face aussi) a une lampe pour dix hommes (`LAMPES_PAR_HOMME`), qui va et vient le long de sa place à 0,7 à 1,5 m/s, 4 à 10 m derrière sa ligne, au-dessus du sol d'un mètre avec un balancement de pas. Le dessin seulement : tout vient de l'état et de `uT` (l'horloge de l'image), aucun tirage, rien de sauvegardé. Mêmes points que les lanternes fixes (120 au plus), 380 en tout ; la carte des lumières passe de 64 à 192 sources (une lumière hors de l'écran ne compte pas). Elles paraissent dès que la trame monte (16 h 15). Mesuré (8 000 soldats, rendu logiciel, nuit, dessin attendu) : zoom 1 80 ms contre 80, zoom 3 117 contre 113, zoom 5 148 contre 148 : dans le bruit. `test/rendu.json` réécrit (35 images : le soir et la nuit en sont plus lumineux ; `matin` et les suivantes : la mêlée de nuit change les morts). Non fait : les lampes ne suivent pas un trajet de corvée (ravitailleurs, brancardiers), elles vont et viennent. **Fusées de nuit** (v0.39.1, `majFusees` d'eclats.js) : phase `nuit`, une toutes les 2 à 6 s sur 140 m de large et 60 m de profondeur (le soir : 5 à 12 s, 80 × 35) ; même nombre de tirages par fusée, `test/rendu.json` inchangé (ses images de nuit sont trop courtes pour en voir une de plus).
- **Le ciel de la nuit** (Jérôme, v0.40.0 : « les étoiles et la lune, l'évolution des phases de la lune de jour en jour, nuit nuageuse, étoiles filantes » ; `data/lune.js`, `ciel.nuit` de rendu/ciel.js, `nuitCiel` de rendu/shaders.js) : un second plan plein écran, peint après le voile de la nuit à la profondeur du fond (`depthTest` : seuls les pixels que ni le sol ni rien n'a dessinés, donc le ciel, le reçoivent) : des étoiles (une grille d'angles, une case sur vingt-cinq, qui scintillent), la lune (un disque de 0,03 rad avec sa phase, une lueur), des nuages sombres devant, éclaircis près de la lune, une étoile filante toutes les 7 s une fois sur deux. **Tout vient du jour, de la graine et de l'horloge de l'image** (`lune(jour, graine)` : une phase par hachage de la graine plus (jour − 1) / 29,53, donc d'un trentième de lunaison par jour ; `couvertureNuit` : le temps puis un écart de nuit en nuit ; `clairDeLune`) : aucun tirage du générateur de la bataille, rien de sauvegardé. La pleine lune éclaire le champ (le voile de la nuit passe de 0,74 à 0,64 au plus : `obscurite(h, clair)`), la pluie et le brouillard l'étouffent (`CLARTE`). Le papier de la nuit dit la phase et le ciel (`#nuit-ciel`, `nomPhase`, `cielEnMots`). **La lune est basse** (hauteur 0,08 à 0,22 rad, testé) : la caméra du jeu à son plus bas (`tangage` 0,02, fov 30°) ne voit que ~15° de ciel ; à 0,5 rad (le premier essai) la lune n'était jamais à l'écran, trouvé en balayant le lacet sur des captures. Le plan se cache quand le haut de l'écran ne regarde pas au-dessus de l'horizon (la caméra normale : aucun coût) ; sinon le nuanceur plein écran coûte en rendu logiciel (8 000 soldats, nuit, dessin attendu : tangage 0,95 inchangé, 117 / 131 / 182 ms aux zooms 1, 3, 5 ; tangage 0,1 : 106 → 135 ms) ; un `discard` en tête du nuanceur coupait le test de profondeur avant lui (+23 à +32 ms même sans ciel visible). `test/fumee.json` réécrit (la ligne du papier), `test/rendu.json` réécrit (les images du soir et de la nuit montrent des étoiles et ses nuages). Non fait : la lune ne passe pas dans le ciel au fil de la nuit (elle est fixe pour une nuit), pas de reflet dans l'eau.
- **Des soldats qui épaulent** (Jérôme, v0.13.0) : à partir de 6 pixels par mètre (la silhouette), des bras le long du corps ; un
  homme qui tire (`B.tirs` : le 6e nombre est son indice) lève les bras et le fusil devant lui et se tourne vers sa cible, un
  instant (`aTir`, `tirVal` de `majTirs` : le dessin seulement). Les boîtes de loin ne tirent pas.
- **Les blessés reviennent** (Jérôme, v0.18.0) : un blessé évacué (corvée `evacuer`) revient avec une chance sur deux
  (`nuit.retourChance`) après autant de nuits que sa blessure en demande (`nuit.retourNuits` : un bras 1, une jambe 2, la tête 3), dans
  son régiment, avec son numéro et son expérience, par l'arrière (`retours` de nuit.js ; le tirage est un hachage graine-numéro-jour, pas
  le générateur de la bataille). `etat.evacues` : `[numéro, jour, blessure, nuit du retour (0 : pas encore, −1 : non), régiment,
  expérience]` ; les évacués d'avant la v0.18.0 (deux nombres) ne reviennent pas. Le bilan de l'aube le dit.
- **Chez l'ennemi, ni évacuer ni ravitailler** (Jérôme, v0.22.0) : un régiment dont la tranchée d'ordre est une ligne de l'autre camp
  (`chezLEnnemi` de nuit.js) a 130 m à découvert entre lui et ses boyaux : `refusCorvee` refuse « évacuer » et « ravitailler » (« Chez l'ennemi,
  la soupe ne passe pas : … »), sauf si la tranchée est toute à lui (`etat.troncons`) et qu'aucun régiment de l'autre camp n'est à moins de
  `nuit.calme` (60 m). Réparer, abris, inhumer, relève restent possibles ; la règle vaut aussi pour en face
  (`choixEnFace` retombe au repos). Un grisé par corvée au-dessus de la carte dit pourquoi au clic.
- **La nuit et ses corvées** (Jérôme, v0.6.0) : une corvée par régiment (repos,
  réparer, inhumer, évacuer) ; puis (Jérôme, v0.11.0) les abris profonds
  (`etat.abris`), les vivres (`reg.vivres`) et les tombes dessinées (`etat.tombes`) ; voir `DESIGN.md`.
  **Sept corvées** (Jérôme, v0.38.3 : « il y en a trop » ; `data/corvees.js`) : les caillebotis et le coup de main sont retirés (voir « Ce qui a été retiré »).
  **Un ordre donné grise la carte** (Jérôme, v0.38.3) : la corvée de chaque régiment est celle d'hier si elle est encore possible, sinon le repos ; `nuit.donnees` (`hud/nuit.js`, remis à zéro à chaque nuit)
  garde ceux à qui l'on a **donné** un ordre cette nuit, et `majRegiments` met la classe `donne` à leur carte (glaise, sans la bande de leur camp, le mot de la corvée en os ; choisie, elle redevient claire :
  la sélection prime). Un ordre donné à plusieurs régiments les grise tous (`surChoix` est un rappel du jeu à deux : seul, `reseau` est nul et il ne fait rien).
- **Le moral et l'expérience** (Jérôme, v0.5.0) : un moral par régiment (`moral`,
  `deroute` dans l'état), l'expérience de chaque homme (`exp` dans la foule), les
  promotions (`etat.grades`) ; puis (Jérôme, v0.11.0) la contagion de la déroute, le
  refus d'un jour (`reg.refus` : le jour refusé), la poursuite d'en face après une
  prise ; voir `DESIGN.md`.
- **Les ombres et la profondeur** (Jérôme, v0.11.0) : l'ombre d'un soldat ou d'un arbre
  est le sol un ton plus sombre (la couleur de paroi de la case), fondue (transparence continue, plus de
  trame depuis la v0.12.1) de plus en plus claire vers son bout ; le fond d'un creux s'assombrit d'un ton à 1 m, d'un
  autre à 2,5 m, et d'un encore quand il est entouré de parois (`couleurCase`).
- **Le terrain au survol** (Jérôme, v0.5.0 ; v0.19.0) : un papier dit ce qu'est la case sous la souris, en deux lignes et une barre
  de marche (`terrainResume` de bataille.js, qui garde les deux premières lignes de `terrainSous` ; le reste n'est plus montré).
- **La rangée des régiments** (Jérôme, v0.20.0 ; `docs/ui-cible.md`) : au centre du bas, une carte par régiment de chez nous encore en vie
  (112 px ; trop étroit : des flèches font défiler la rangée). Le nom est « 3 · Viride » (`numeroDe`, l'ordre dans le camp ; le même numéro
  est dans les cercles de la carte et au-dessus des régiments). Les chevrons (0 à 3, `chevrons` de identite.js) sont l'expérience moyenne
  des hommes, aux seuils des mots (0,08, 0,25, 0,6) ; ils n'apparaissent qu'avec l'expérience, sans emplacement vide (Jérôme, v0.35.0) : rien n'est compté de ce qu'on a tué (DESIGN.md : le compteur de morts n'est jamais
  une récompense). La barre : plein = debout, hachuré = blessés, vide = tombés (la forme porte l'information). S'ouvre le régiment choisi en
  dernier. Pas encore d'action de tir ni de barrage par régiment : le jeu n'en a pas (le barrage est celui des batteries).
- **La sélection sur le terrain** (Jérôme, v0.21.0) : un anneau d'os (liseré de terre) au pied de chaque homme des régiments choisis, à tous les
  zooms (`anneaux` de rendu3d.js, des points sans test de profondeur sous les soldats ; coût mesuré, tous les régiments choisis, 8 000
  soldats, rendu logiciel : +0,3 à 0,7 ms côté jeu, +2 à 7 ms dessin attendu, dans le bruit de la mesure). La visée (`majVisee`, un SVG) : une
  ligne de chaque régiment choisi au curseur, une croix au bout, glaise si l'ordre ne partirait pas ; `rendu.surligner` allume ce que l'ordre
  occuperait (les tronçons, ou une emprise par régiment en terrain libre, mêmes traits que le clignotement). `peutOrdonner` (bataille.js) est
  l'ordre à sec : `ordonnerMarche` et lui partent du même `planMarche`, rien n'est changé avant le clic. Le clic gauche valide (v0.21.2 : choisir puis ordonner ; le clic droit annule). **Viser un barrage** (v0.32.3, Jérôme : « D » du sujet « Visée d'un obus » du labo ; `viseeObus` de main.js, le même SVG `#visee`) : le cercle du souffle du calibre (`CALIBRES[cal].rayon`) posé sur le sol, chaque point projeté par `versEcran` (il suit le relief et la perspective), zone assombrie (un fondu : hors palette comme les ombres), deux anneaux pointillés à 2/3 et 1/3 du rayon, un point ; il ne dit pas la dispersion des obus (14 à 18 m).
- **Le clic sur une carte de régiment** (Jérôme, v0.32.2 ; sujet « Le clic sur un régiment » du labo, variante A retenue) : la caméra glisse jusqu'au centre des hommes du régiment en 0,6 s (`centrerSur`, `majCentrage` de main.js ; zoom et angle inchangés,
  coupée par un déplacement à la main, instantanée si le système demande un mouvement réduit) et quatre équerres d'os (`#equerres`, v0.33.0 : le sonar de la v0.32.2 est retiré) se referment sur l'emprise de ses hommes pendant 1,4 s ; la carte s'allume un instant (`.clic`, posée à la construction de la carte : la rangée est refaite à chaque
  changement, l'animation ne rejoue pas). Pas au Maj-clic (ajouter à la sélection), pas au clic qui désélectionne, pas au clic sur un cercle de la carte. Le dessin seulement. Les pins de la carte (`.carte-ronde`) sont pleins de la couleur de leur armée (bleu, vert kaki), cerclés de terre : le choisi garde sa couleur et prend un anneau d'os.
- **Les blessés qui marchent** (Jérôme, v0.35.0 ; `pasArmee` d'army.js, `arriereDe` de bataille.js) : un blessé au bras, ou à la jambe pour la moitié d'entre eux (`soldat.jambeLegere`, un hachage de son numéro : `legere`), quitte sa place et marche tout droit vers
  l'arrière de son camp (12 m derrière sa dernière ligne, `soldat.arriere`), sans tirer ; la tête et la jambe lourde restent à terre. Rien dans l'état : la règle se lit de la blessure et du numéro. Mesuré (graines 3, 7, 8, 9 000 pas, tous nos régiments envoyés à l'attaque) : nos morts 384/404/394 → 299/364/319, leurs morts
  47/44/43 → 36/40/35 ; les blessés ne sont plus touchés deux fois (« blessé deux fois, on meurt »). Les parties d'avant se relisent et divergent après coup (leurs blessés se mettent en marche).
- **La fiche en jauges** (Jérôme, v0.35.0 ; `hud/barres.js`, `hud/fiche.js`, `hud/lecture.js` : `actionEnMots`, `auFront`, `moyennes`) : un homme : peur, jambes, bras, expérience (des barres dont la longueur est le niveau, des repères aux seuils des mots, aucune couleur d'alerte ; les chevrons gagnés à côté de l'expérience), le corps entier avec la partie blessée pleine
  et barrée (le côté du bras ou de la jambe vient du numéro), ce qu'il fait, depuis quand il est au front, le prochain grade (`prochainGrade` : celui du rang au-dessus, pris quand un supérieur tombe) et **les hommes qu'il a abattus** (`A.victimes`, sauvegardé ; `frapper(…, par)` ne le crédite que pour un coup de fusil, jamais un obus ; un évacué le garde dans `etat.evacues[6]`).
  DESIGN.md dit que le compteur de morts n'est jamais une récompense : Jérôme a tranché pour ce compteur sur la fiche (v0.35.0), qui ne donne ni expérience ni avantage. Un régiment : les mêmes jauges en moyenne, plus le moral et les vivres (la fenêtre du régiment n'en a pas : elle est refaite à chaque changement, des jauges qui bougent sans cesse lui feraient perdre les clics).
- **Le survol prend le corps entier** (Jérôme, v0.35.0 ; `hommeSous` de main.js) : de près, l'homme sous le pointeur est celui dont la capsule pieds-casque (1,8 m, `rendu.hauteurSol`, projetée par `versEcran`) contient le pointeur, le plus bas à l'écran s'il y en a plusieurs ; avant, c'était l'homme le plus proche du point de sol sous la souris : la tête, vue de biais, tombait derrière lui. Les morts couchés gardent un rayon de sol (1 m au moins).
- **Avec des régiments choisis, le clic ordonne** (Jérôme, v0.35.0) : un clic gauche sur un régiment à nous ne le choisit plus quand d'autres sont choisis (le jour) : l'ordre part, même sur sa place. Changer de choix : sa carte, son cercle, le cadre, T, ou Maj-clic. La nuit, le clic choisit toujours (les corvées).
- **Le nom d'un régiment se clique** (Jérôme, v0.41.0 ; `$('etiquettes').onclick` de main.js, `.etiquette` en `pointer-events: auto`) : un clic sur son nom, au-dessus de ses hommes, le choisit comme sa carte de la rangée (Maj : ajouter ; le seul choisi se désélectionne) mais sans glisser la caméra ; la nuit aussi. Sous le nom, le survol continue (`pointermove` de `#etiquettes` : `souris`). Le nom est encore la ligne d'avant (« 2 · Protogyne · B · Au contact de l'ennemi » : dure à viser, mal hiérarchisée) : les maquettes du sujet « Le nom d'un régiment » du labo en proposent quatre. `test/fumee.json` réécrit : la souris de l'étape `fiche-regiment` tombe sur un nom, donc `terrain` y est caché.
- **Le survol global** (Jérôme, v0.21.1) : le régiment sous la souris (un homme de près, le régiment de loin, des deux camps), ou sous une carte
  ou un cercle de la carte, s'allume avec tous ses hommes : les anneaux de la sélection, à la couleur de son camp (ceux des choisis restent
  d'os) ; sans régiment, le tronçon sous la souris, mêmes traits que le clignotement, sauf si la visée d'un ordre le montre déjà
  (`appliquerSurvol` de main.js, `rendu.survoler`). Le dessin seulement.
- **Le haut de l'écran allégé** (Jérôme, v0.30.0 : sur un 13 pouces, le champ était trop petit) : le temps (arrêter, ×1, ×2, ×4) est à côté des réglages, en petit ; les pertes sont un duel (v0.33.0 : une barre de vie de chaque côté du jour, nous à gauche, la vie collée au centre ; aucun chiffre hors du survol d'un segment ; dessous les tronçons tenus, une graduation d'os ou de terre chacun ; `hud/pertes.js`, sujet « La barre de vie » du labo, variante A) ; la carte se replie sur son en-tête (`#carte-bascule`, `prefs.carte`) ; le billet est en haut à gauche sous les boutons de vitesse, de la même largeur que leur rangée (`.haut-bloc`, `contain: inline-size` : sa propre largeur ne compte pas) ; v0.30.1 : le bouton de prévision et sa fenêtre, un doublon, sont retirés ; v0.31.2 : le billet est la **barre du temps** (`hud/temps.js`, variante D du sujet « La barre du temps » du labo : la météo de chaque jour en couleur, demain hachuré, la nuit dessous, un trait bleu et un drapeau pour où l'on est, les changements de météo en pictogrammes de `hud/meteo-icones.js` ; seuls les jours passés et le jour même sont lus dans l'état, la logique tire la météo d'avance et le joueur ne la connaît pas) avec dessous la mission et le terrain sous la souris ; les trois boutons du haut font tous `--jeu-cible` de haut ; le terrain sous la souris est la dernière ligne du billet, **toujours une seule ligne** (v0.31.5 : le sol et la marche ; sur une tranchée, « Tranchée B1 » puis sa ligne de vie, nous à gauche, en face à droite, aux couleurs des deux armées, de `forcesTroncons` ; elle garde sa place : le billet ne saute pas) ; les batteries : l'obus debout, le calibre, une jauge de recharge. Non fait : décaler le point visé vers le milieu de la zone libre (le haut et le bas pèsent maintenant à peu près autant : gain de quelques pixels, qui demanderait de réécrire `test/rendu.json`).
- **Le haut de l'écran** (Jérôme, v0.19.0 ; `docs/ui-cible.md`) : à gauche le menu, les réglages et le carnet de bord (la fiche s'ouvre dessous, v0.26.0) ; au centre les pertes des deux armées (`majPertes`, en feuille de situation), que le papier de la nuit remplace la nuit (v0.26.0, Jérôme : `.haut-centre:has(.nuit:not([hidden]))`) ;
  à droite la carte, le temps (arrêter, ×1, ×2, ×4 : `setTimeScale` plafonné par `perf.sim` sous ~20 ms, un assaut / une prise / une
  déroute ramène à ×1 ; la partie est la même, seul le nombre de pas par image change), la montre, la météo (clic : aujourd'hui et la
  prévision de demain, il n'y a pas de météo dans la journée) et le terrain. La carte est en proportions (lignes à 20 m, un no man's land
  resserré à 64 px) et les régiments y sont des cercles numérotés (`numeroDe`, l'ordre dans le camp ; un clic les choisit).
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
| `n` | `#8cb6ff` | bleu horizon — nous (Jérôme, v0.16.0 : l'ancien `#a9bad0` avait la couleur de la pluie et de la brume, `r` : sous la pluie, notre armée se perdait ; plus saturé, il passe toutes les paires de `lisibilite.mjs`) |
| `x` | `#dde874` | vert kaki clair — en face (Jérôme, v0.28.0 ; rouge `#e0604f` avant : un kaki pâle et jaune, plus clair que tout le sol, vert compris, sinon il se perdait dans l'herbe ; ΔE ≥ 45 de chaque sol, contraste ≥ 1,7 ; le casque à pointe de l'équipé aide) |
| `v` | `#6f8147` | vert mousse — l'herbe qui reprend, par plaques (Jérôme, v0.9.3 : « intégré dans le design, sans grandes différences ») |
| `w` | `#5c6e3c` | vert sombre — l'herbe dans l'humide |

Un soldat se lit par sa couleur sur un sol sombre, par son ombre (`t`) sur un sol
clair. Un cratère : le creux un ton plus sombre, la lèvre de terre jetée un ton
plus clair (sans la lèvre, un cratère dans la boue ne se distinguait pas de la
boue en gris : échec mesuré). Aucune autre couleur dans le jeu ; exceptions : les fondus continus (brouillard, bout des ombres et de la fumée : des mélanges d'une couleur de palette avec ce qu'elle recouvre ; Jérôme, v0.12.1),  le fond des boîtes de dialogue (`::backdrop` de `game.css`) et la
nuit (le voile continu et ses halos mélangent la terre, le sol et l'os : des couleurs qui ne sont pas dans la palette ; Jérôme, v0.9.3).

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
| Choisir un régiment | T (tous) | clic sur lui, sur sa carte ou son cercle (Maj : ajouter), glisser (cadre) |
| Voir un homme, un régiment | — | survol ; clic sur ceux d'en face ou sur un mort (sans régiment choisi) ; pour les nôtres, le bouton « Fiche » de leur carte |
| Marcher (sur une tranchée : l'occuper) | — | clic gauche sur le sol, les régiments choisis restent choisis (v0.21.2) |
| Annuler | Échap | clic droit : le barrage visé, « Marcher », la fiche, puis les régiments choisis |
| Posture des régiments choisis : à volonté, feu retenu | Maj+1, Maj+2 (touche physique ; Maj+3 ne fait rien) | deux boutons dans la fenêtre du régiment (v0.36.1) |
| Barrage de 75, 155, 220 | 1, 2, 3 (touche physique) puis clic | bouton de la batterie puis clic |
| Arrêter le temps (pause active) | Espace | — |
| Déplacer la vue | flèches, ZQSD / WASD (selon l'écran) | Maj + glisser avec le bouton du milieu (la molette) |
| Tourner, incliner la vue | A et E (Q et E en QWERTY), R et F (touches physiques, en continu) | glisser avec le bouton du milieu (ou le droit) ; le cadran à l'écran (v0.9.1) est retiré en v0.26.0 (Jérôme) |
| Recentrer la vue | C (l'angle d'origine) | — |
| Zoom | + et − | molette |
| Menu (pause) | Échap (quand rien n'est à annuler) | bouton du HUD |

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
  la caméra),
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
- **Les postures** (stances, lot 1 logique, commande Maj+1 / Maj+2 (v0.36.0) et deux boutons du rabat (v0.36.1 ; le dessin, v0.36.2 : un régiment en `retenu` porte son fusil baissé, le nuanceur des soldats tourne la partie 4 autour des hanches quand `aTir.x` vaut −1, que `majSoldats` pose pour `stance === 'retenu'` ; la pose de tir, quand il tire, passe devant ; pas d'éclair hors portée : `tirer` ne dessine un tir qu'avec une cible à portée, rien à faire ; `couvert` n'existe pas, donc pas de tapi ; `data-stance` dans `majRegiments`, grisés avec la raison au survol et au clic quand `peutStance` refuse ; la posture est dite par `actionDe`, par un mot sur la carte du régiment, `.posture`, et au carnet) ; `reg.stance`, `data/stances.js`, `R.stance`, `parametresStance` et `chanceTir` d'army.js, `peutStance` / `ordonnerStance` de bataille.js) : `volonte` (le tir d'avant, tout à 1) et `retenu` (portée × 0,5 = 35 m, précision × 1,5, cadence × 1 ; Jérôme, cadrage v0.36.0 : deux postures, l'IA d'en face n'en use pas (`ia.stance` vide : le code est là, `postureIA`, éteint ; v0.36.3), boutons du rabat puis Maj+chiffre au lot 2, un ordre de marche remet à `volonte` sans mémoire). Les nombres sont des multiplicateurs de `tir` : `volonte` vaut 1 partout, donc une bataille sans posture est celle d'avant au bit près (test : graines 3, 7, 8 comparées à une référence relevée avant le lot, morts, blessés, `etat.rng`, empreinte). Un régiment sans `stance` tire à volonté ; `restaurer` pose `??= 'volonte'`, la relève (`nuit.js`) aussi. La posture est une commande du jeu à deux (`stance` de `executerCmd`, `lancerStance`, dans `empreinteEtat` ; `onAction` de main.js lit `e.shiftKey` : Maj+chiffre est la posture, jamais le barrage, `keyIs` ne distinguant pas Maj sur une touche physique).
- `js/tranchees.js` — les tranchées : `ligneY` (le tracé d'une ligne, une
  fonction de x : trois ondulations de 70, 28 et 11 m tirées de la phase de la ligne, `demiLargeur` 1 à 1,5 m ; v0.29.0 : plus de créneaux en carré),
  `creuserTranchees` (creusées dans `diff` à 1,5 m, un parapet d'un quart du côté
  de l'ennemi, des boyaux ; `T.troncon` : le tronçon de 25 m de chaque case de
  ligne), `ligneSous`. Les données sont dans `secteur.js` (`tranchees`).
- `js/nuit.js` — les corvées de la nuit (`corvees`, appelée par `aube(B, choix)`) :
  `tronconsDe` (la tranchée d'un régiment), `refusCorvee`, `travail` (réparer),
  `choixEnFace`, `rejouerTravaux`. Les textes sont dans
  `data/corvees.js`, les nombres dans `reglages.js` (`nuit`). L'état garde
  `travaux`, `tombes`, `evacues`, `nuits`, `abris` ({ tronçon : niveau } ; lu par
  `abriDe` de bataille.js dans `tuerDans`) ; chaque régiment, ses
  `vivres` (en nuits).
- `js/reseau/` — le jeu à deux, sur le réseau (Jérôme, v0.30.0 : « le jeu à deux en local » = deux ordinateurs sur le même réseau). `lockstep.js` (pure, testée dans Node) : `creerLockstep({ B, moi, envoyer, executer })` ;
  un cadre = un pas de la simulation (ou d'attente : pause, nuit), les ordres donnés au cadre F partent pour F + 6 (200 ms), un cadre ne se joue que quand on a les ordres, même vides, des deux joueurs (`cadre_()` rend false sinon : on attend),
  ceux de l'hôte s'exécutent avant ceux de l'invité, et toutes les 90 cadres une empreinte de l'état (`empreinteEtat` : temps, hommes, régiments, tronçons, hasard) est comparée : un écart est dit à voix haute (`surEcart`).
  `lien.js` : un canal de données WebRTC fiable et ordonné, sans serveur de jeu ; STUN seulement pour les adresses (v0.33.1, Jérôme : « la connexion ne se fait jamais » entre deux machines : sans STUN, les adresses locales sont des noms mDNS que l'autre machine ne résout souvent pas ; il n'est contacté qu'en invitant ou répondant) ; `surEtat` dit `failed` à l'écran, et seuls `failed` et `closed` ferment la partie (`disconnected` se rétablit) ; l'invitation et la réponse sont deux textes en base64 (~830 signes). `relais.js` (Jérôme, v0.34.1 : « code court », accord pour l'envoi à ntfy.sh) : l'hôte affiche un code de 6 signes (sans I, O, 0, 1), c'est le nom d'un sujet de ntfy.sh (`cyclopeen-CODE`) où il dépose l'invitation et lit la réponse que l'invité y dépose ; le relais public ne voit que ces deux textes, jamais la partie, et n'est contacté qu'en invitant ou en rejoignant ; il garde les messages ~12 h. Le copier-coller reste, replié, si le relais est injoignable. `node outils/deux.mjs --code` joue ce chemin (demande le réseau).
  La poignée de main (main.js) : l'hôte envoie `init` (version du jeu, empreinte des réglages, graine, secteur), l'invité refuse si la version ou les réglages diffèrent (`refus`), sinon `ok` : les deux créent la même bataille (`deux: true`).
- `js/campagne.js` et `js/data/campagne.js` — la campagne, lot 2 (Jérôme, cadrage v0.36.3 ; atteignable depuis l'écran titre depuis la v0.36.6) : trois batailles de sept jours (Jérôme, v0.36.3 : environ deux heures la campagne ; mesuré sur la campagne 11, joueur passif : bataille 1 à 15 jours 359 morts, à 7 jours 151 ; bataille 3 tenue à 7 jours, manquée à 10-15) (labours / tenir, crête / prendre, marais / tenir ; la crête reste à la parité : 1,25 contre 1 ne sauve que ~85 hommes) reliées par un registre, hors de l'état d'une bataille, clé `cyclopeen:campagne` (`js/lib/save.js`, version 1, autre clé en debug, exporté avec le reste, jamais de jeton). `nouvelleCampagne(graineIdentite)`, `suivante(c)` (la bataille à jouer : graine tirée par hachage de la graine d'identité, secteur, mission, `campagne: { id, n }`), `cloturer(c, B)` (idempotente ; erreur de programmation si la bataille n'est pas finie, d'une autre campagne ou hors suite) et `cloturerDansLeStore(store, B)`, que `montrerFin` de main.js appelle **avant** d'ouvrir l'écran de fin (une partie relue arrêtée à la fin la rejoue sans effet). Le registre garde, par régiment de chez nous (clé : son nom du lexique), les survivants `[numéro, rang, expérience, victimes]` : jamais un nom (il vient de `graineIdentite`), ni fatigue, peur, blessure ou moral. Sont survivants : les vivants (blessés compris), les évacués en route (`e[3] === 0`) et les hommes d'un régiment relevé (`etat.releves`, posé par la corvée `releve` : sans lui, `compacter` les efface avant la clôture). Ne le sont pas : les morts, les évacués qui ne reviendront pas (`e[3] === -1`, « disparus du front » : décision à confirmer au lot 4). Statut : `effondree` sous `regimentsMin` (4) régiments qui ont encore un homme, sinon `terminee` après la 3e bataille ; une défaite ne ferme rien. `VERSION` 3 (`etat.campagne`, `etat.releves`).
- **Le papier de campagne** (campagne, lot 4 ; `passage(c)` de campagne.js, sujet « Le papier de campagne » du labo, `js/labo-campagne.js`) : entre deux batailles, le joueur **voit et valide** (Jérôme, v0.36.3) : aucune décision, la règle de `reconstituer` s'applique et le papier la dit (la bataille qui finit, chaque régiment : vétérans, recrues, chevrons, évacués de retour (`enRoute` au registre), qui le commande (`commandant` : le survivant de plus haut rang, nommé par `identite`, avec son ancien grade s'il est promu), les fusions (`fusions` : de qui vers qui), les dissous, ce qui se perd). Le commandant du papier est celui que la bataille suivante met à la place 0 (test). **Branché en jeu (lot 5, v0.36.4 ; variante A « Le registre » du labo retenue, les trois autres non)** : `hud/campagne.js` (`creerCampagne({ $ })`, `#campagne`, un papier posé au milieu du champ comme celui de la nuit, `.campagne` de style.css) ; à la fin d'une bataille de campagne, `montrerFin` (main.js) écrit le registre puis, si la campagne continue, **remplace l'écran de fin** par ce papier (le bouton « Partir pour la bataille n » a le focus : Entrée) ; `lancerCampagne` sort la bataille suivante de `suivante(c)` (`etapesCampagne`, `lancer` : `commencer` en est un cas) ; **finie** (`terminee`, `effondree`), c'est le papier de fin (lot 6, v0.36.5) qui remplace `dialogue-fin` : voir ci-dessous. **Secteurs dans un ordre fixe** (Jérôme, v0.36.4 : pas de choix) et **mission selon l'issue** (`missionSelonIssue` de data/campagne.js : réussie → prendre, manquée ou inconnue → tenir ; la bataille 1 est donnée) ; la difficulté suit le rang de la bataille, pas le secteur ni la mission. **Atteignable depuis l'écran titre depuis le lot 7** (ci-dessous) ; le mode debug la démarre aussi, `__jeu.campagne(graineIdentite)`. `node outils/campagne.mjs` joue la bataille 1 dans le navigateur (≈ 100 s de calcul), vérifie le registre, Entrée, et que la bataille 2 est la crête avec 588 vétérans. `reconstituer(…, journal)` tient le journal des fusions sans changer le résultat.
- **La fin de la campagne, sans fanfare** (campagne, lot 6, v0.36.5 ; `bilan(c)` de campagne.js, `montrerFin` de hud/campagne.js, `TEXTES` de data/campagne.js) : le registre garde maintenant nos morts de chaque bataille (`tombes` : `[numéro de campagne, jour, régiment]`, tirés de `etat.corps` ; test : autant de tombes que de pertes), et `bilan` en fait, **sans total en tête ni classement** (DESIGN.md : aucune glorification, le compteur de morts n'est jamais une récompense) : une ligne par bataille (le secteur, les jours, « tenue » ou « manquée », les tombés), la liste des tombés (prénom, nom, régiment, jour, bataille) et celle de ceux qui sont restés (les survivants de la dernière bataille présents à toutes les autres, avec leur grade), repliées dans deux `<details>`. Les noms sont des **chaînes tirées de `graineIdentite`** : c'est ce qu'un Mémorial (ROADMAP §3, pas construit) gardera tel quel, jamais un numéro à re-dériver. Le grade d'un tombé n'est pas gardé (le rang se perd avec l'homme) : seulement son nom. Un seul geste, « Écran titre » (Entrée) ; une seule forme, pas de variantes au labo (à demander). `outils/campagne.mjs --tout oui` joue les trois batailles (≈ 5 minutes) et vérifie le papier de fin.
- **La campagne depuis l'écran titre** (campagne, lot 7, v0.36.6 ; `campagneEnCours`, `confirmer`, `#nouvelle-campagne`, `#continuer-campagne` de main.js) : « Nouvelle campagne » (graine d'identité de l'horloge, ou `?seed=` en debug ; confirmation si une campagne ou une partie est en cours) écrit un registre neuf et lance la bataille 1. « Continuer » reprend la partie sauvegardée et s'appelle **« Continuer la campagne »** quand cette partie est une bataille de campagne (`partie.campagne`). Si on l'a **remplacée par une autre partie** (« Nouvelle partie » le dit à voix haute : « la campagne reprendra à cette bataille avec Continuer la campagne »), le registre reste en cours et le titre propose **« Continuer la campagne »**, qui repart de la bataille qui suit la dernière close (`lancerCampagne` : même graine, donc la même bataille si aucune n'est close). Une campagne finie (`terminee`, `effondree`) n'a pas de bouton : le registre reste, « Nouvelle campagne » l'efface. L'export et l'import des réglages emportent le registre (`store.exportAll` : `cyclopeen:campagne`, jamais le jeton ; testé), et le mode debug en a un autre (`cyclopeen:debug:campagne`). `node outils/campagne-titre.mjs` (≈ 30 s, aucune bataille jouée) vérifie ces chemins. **Reste de la campagne** : le carnet de campagne (quatre lignes, comme celui de bataille ; lot 4), l'état-major et les saisons (lot 8, plan C), le Mémorial.
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
- `js/formes.js`, `js/objets.js`, `js/secteur-terrain.js` — les retouches de relief d'un secteur (bosse, creux, crête, plateau), ses objets posés (arbres, bois, haies, dégagements ; l'atelier les pose) et le terrain que la bataille monte au départ, partagé avec l'atelier.
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

- `js/rendu3d.js` (≈ 530 lignes ; le bord du terrain, `bord` de `creerRendu` et `rendu.bord` (Jérôme, v0.33.0, sujet « Le bord de la carte » du labo, variante A) : le jeu règle `faux-ciel` à chaque partie (Jérôme, v0.36.7 : le ciel noir devait suivre la météo ; un plan immense de plaques de la couleur du sol, `fauxMat`, qui se perd à 500 m dans la couleur du ciel, `js/rendu/ciel.js` (Jérôme, v0.36.8 : « léger dégradé, nuages ») : un plan plein écran peint avant tout, dégradé de l'horizon au zénith et nuages (bruit de valeur à quatre octaves, dérive lente, couverture et couleurs par temps : sec `e`, pluie `e` et `s`, brouillard `r`, gel `e` et `o`, tous mélangés en continu) lus du rayon de chaque pixel, donc ils suivent la caméra ; la caméra du jeu voit peu de ciel (fov 30°, plongée de 54°) ; la nuit, le voile le noircit ; `faux-noir`, l'ancien réglage, reste au labo), l'écran titre `null` (le terrain coupé net sur le ciel de brume) ; `noir`, `brume`, `papier` (le sol se fond sur `fondu` mètres dans la couleur du fond, dans `solMat`) et `faux` restent au labo ; les arbres des marges ne se fondent pas avec le sol) — three.js, ce qui ne se découpe pas encore : la caméra en perspective (`PerspectiveCamera`, `projeter`, `borner` la garde sur le terrain : les
  quatre coins de l'écran posés sur le sol ; `deplacerEcran`, `tourner`, `placerCamera`), la palette (une texture 10 × 2 : la couleur et celle de la paroi), le sol (morceaux de
  25 × 25 cases, dessus fusionnés en rectangles de même hauteur, parois sud, est et ouest seulement ; une texture RVBA d'une couleur par case et de sa paroi, refaite par
  rangées changées ; le même relief à tous les zooms, Jérôme, v0.12.0 ; `surface` et `surfaceLisse`, la hauteur lue par tous les modules), `versTerrain` (un rayon jusqu'au sol) /
  `versEcran`, la vue de ce qu'on voit (`majSoldats` : le rectangle englobant et la matrice écran, donnés aux soldats et à la végétation), `attacher` (brancher une bataille) et
  `dessiner` (l'ordre des appels compte : tampons, `needsUpdate`, budgets), et l'API publique. La respiration (`RESPIRATION`) s'ajoute à l'angle choisi (`souffle`), dans le dessin
  comme dans les conversions. Le rendu ne modifie jamais l'état. Un morceau du sol se refait aussi quand un de ses voisins change (ses parois sud, est et ouest en dépendent) ; les
  parois est et ouest (et les bords du champ, jusqu'au socle) existent pour la caméra tournée ; l'ouest, éclairé, garde la couleur du dessus.
- `js/hud/` — le HUD, sorti de `main.js` (v0.22.0, sans changement pour le joueur) : des fabriques `creer…({ $, bataille: () => B, … })` qui gardent
  leur propre état et reçoivent la bataille en cours à chaque appel (jamais `B` lui-même : main.js le remplace à chaque partie), et les actions
  (choisir, ordonner) en rappels. `lecture.js` (qui est un homme, ce que compte un régiment : des fonctions de `B`, sans DOM), `fiche.js`, `carnet.js`,
  `pertes.js`, `carte.js` (le dessin de la carte ; `surSecteur`, `surCase`, `surRonde` sont à main.js), `nuit.js` (le papier de la nuit : `etat`, `corvees`).
  Restent dans main.js (1 188 lignes depuis la v0.35.0 ; 867 à la découpe) : la rangée des régiments (`majRegiments`, lié aux ordres), le survol et la visée, les commandes, la boucle, l'écran titre et son décor.
- `js/rendu/` — ce que `rendu3d.js` a donné (v0.22.0, sans changement pour le joueur ; `docs/refonte-rendu3d.md`). Chaque morceau est une fabrique `creerX({ THREE, scene, col, … })` qui garde
  son état et se lit à chaque image ; ce qui change d'une partie ou d'une image à l'autre (la bataille `B`, le terrain `T`, `tAnim`, `vide`) est passé **en fonction**, jamais en valeur. L'ordre d'ajout
  à la scène et des tirages de `Math.random` est celui d'avant la découpe : le créer au même endroit de `creerRendu`. `shaders.js` (tout le GLSL, du texte), `geometries.js` (soldat, arbre, buisson :
  `creerGeometries(THREE, col)` ; la forme du soldat prend les attributs d'instance en paramètre), `meteo.js` (la pluie et le brouillard), `troncons.js` (fanions, clignotement et surbrillance d'un ordre,
  ouvrages des tranchées), `vegetation.js` (arbres, buissons, herbe, triés à chaque image ; `ombres()` rend le tampon des ombres d'arbres et le soleil, que possède `temps.js`), `temps.js` (le soleil,
  l'obscurité, les lanternes, la carte des lumières et le voile de la nuit ; `ecl` et `feux` sont lus pour éclairer fusées et incendies ; `styleNuit` du labo passe par `setStyleNuit`), `eclats.js` (éclats,
  balles, obus en vol, fumée, feux, fusées, corbeaux **et** les tirs et le souffle : une seule fabrique, car tout tire dans le même générateur de l'aspect `alea` — l'ordre des tirages fait l'image — et les
  mêmes tampons ; `tirs()` rend la pose des tireurs et le bond des soufflés, relus à chaque image par les soldats), `soldats.js` (les soldats, leurs anneaux, les corps et les tombes ; `maj({ x0, x1, z0, z1, e, p,
  choisis })` reçoit la vue calculée par `rendu3d.js`). Reste à décider : sortir le sol (`sol.js`) ou le laisser (voir `docs/refonte-rendu3d.md`).
- `js/main.js` — écran titre → bataille → nuit → fin ; le zoom et la caméra
  gardés dans `cyclopeen:prefs` ; les fiches (un homme, un régiment ; Échap
  les ferme), le repère de l'homme et la bulle du survol (`majBulle`, chaque image) ; HUD en papiers de campagne (montre, cartes de régiment, carnet de bord,
  croix des morts, râtelier d'obus, noms de nos régiments au-dessus d'eux) ; commandes ; sauvegarde ; mise à jour ; mode debug ;
  `window.cyclopStats()`.
- `index.html`, `css/style.css` — l'écran, le HUD (dont le papier de la nuit) et les dialogues (palette du jeu). **Le design system** (Jérôme, v0.31.3 : « beaucoup d'incohérence ») est dans `:root` et dans `docs/design-system.md` : quatre tailles de texte, une échelle d'espacement (2, 4, 8, 12, 16), la hauteur des boutons, l'ombre, les titres ; avant lui, 52 tailles de texte dont 44 en pixels écrits à la main (huit valeurs pour la même fonction) et deux titres d'un papier différents. Ne plus écrire un pixel qui n'y soit pas.
- `labo.html`, `js/labo.js` — le labo, qui s'ouvre sur une **page d'accueil** (`#accueil`, Jérôme, v0.31.1 ; `accueil` de `js/lib/labo-shell.js`, venue de game-system) : le journal des changements (`js/labo-journal.js` : une entrée par version qui touche au labo, chaque ligne avec un `ref` « sujet-Lettre » qui mène à la variante), ce qui est nouveau depuis la dernière visite (localStorage `labo:<jeu>:vu`), les sujets sans variante en jeu (« à trancher »), l'index. **À chaque changement du labo : une entrée dans le journal, `depuis: 'X.Y.Z'` sur les variantes ajoutées ou changées, et les `ref` revus** (réordonner des variantes change les lettres ; un lien cassé s'affiche ⚠). Dans chaque sujet, A est la variante en jeu ; une maquette que le jeu a dépassée est refaite ou passée en « ancienne » avec la version qui l'a remplacée (v0.31.1 : « Plaques et journal » repeint à l'écran d'aujourd'hui, la montre dessinée est ancienne ; caméra libre ajoutée). échelle, sols et cratères (couleur et
  gris), palette, le moteur en direct (zoom 4, zoom 1, après un jour de pluie,
  gel), le sol vert (`verdure` d'apparence.js : taches, plaques, prairie ; retenu : les plaques), la nuit sans trame (`styleNuit` de rendu3d.js : trame, voile continu, voile et halos ; retenu : voile et halos), les projections d'un obus sur un régiment en marche (`js/labo-projections.js`, Jérôme, v0.32.0 : A le jeu tel qu'il est, B à D trois façons de jeter les hommes du souffle puis de ralentir ceux de l'anneau, tous au même instant : pas de vague) et la visée d'un obus (le cercle du souffle, quatre types, pour chaque calibre ; retenu en v0.32.3 : les cibles concentriques), les plaques et le journal de l'interface, l'attaque d'une tranchée (frise du temps), la caméra (perspective et respiration / immobile / sans perspective / plus
  de perspective / respiration marquée), les calibres. Les
  sujets du moteur affichent ce que coûte le dessin et proposent les zooms. **Le groupe « Arcade »** (Jérôme, v0.38.2 ; `js/labo-arcade.js` ; des mécaniques de surprise à essayer avant d'en brancher une, **rien n'est dans le jeu**) : les caisses de ravitaillement (parachute, ou piégée), les obus ratés (il gît avec un cercle, il fume, il couve), les sapes (galerie entendue ou non, fourneau seul, cratère qui se remplit d'eau), les gaz (un mur au vent, ou coulant dans les creux), les chars d'assaut (le losange en volumes `THREE`, ou qui s'enlise). Elles jouent sur le vrai moteur (obus à dispersion nulle posés par `etat.barrages`, vrais morts et cratères, `mourir`) ; ce que la logique ne sait pas (caisse, nuage, char, galerie) est dessiné par-dessus (un SVG) et suivi dans la maquette seulement. Le piège : `scene()` met la dispersion des calibres à zéro pour la durée de la maquette (`CALIBRES` est partagé : elle la rend au nettoyage) et fait taire l'IA d'en face (`ia.barrage` et `ia.offensive` énormes). **Les sujets de satisfaction** (Jérôme, v0.40.1 ; `js/labo-satisfaction.js`, groupe « Interface » : « Le clic sur un bouton », « Un ordre sur un secteur », « Le coup d'obus » ; la A est ce que le jeu fait aujourd'hui, B à F cinq propositions chacun, **rien n'est dans le jeu**) : le dessin seulement, par-dessus le vrai moteur (un SVG, un canvas 2D, des div, suivis de la caméra par `versEcran`). L'ordre est un vrai `ordonnerMarche` (régiments 1 et 2, un refus se dit à voix haute), l'obus un vrai obus de la logique à dispersion nulle posé dans `etat.barrages` (un seul, `VOL` = 1,3 s de jeu avant la chute ; la maquette rend `CALIBRES` au nettoyage). Les effets d'impact naissent des événements `impact` du rendu : la maquette remplace `rendu.dessiner` pour les lire (et pour le gel d'image, qui saute le dessin sans arrêter la logique), et le rend au nettoyage. Aucun son (le jeu est muet depuis la v0.1.0) : ce qu'il ajouterait est dit dans les notes. Tout est raccourci ou coupé avec `prefers-reduced-motion` (secousse et gel d'image coupés). **Les sujets du HUD** (Jérôme, v0.41.0 ; `js/labo-hud-ux.js`, groupe « Interface » : « Le nom d'un régiment », « Les toasts », « La carte d'ordre » ; la A est le jeu d'aujourd'hui, B à E quatre propositions chacun, statut `a-trancher`, **rien n'est dans le jeu**) : les noms sont posés sur le moteur en direct (`versEcran`, cliquables), les toasts sur un HUD d'exemple (trois messages à déclencher), les cartes en tous leurs états (une ligne mesure la hauteur des cartes et la place de la barre). Les décisions demandées : le nom (h1), le statut (h2), le reste en corps de texte ; une cible de clic de 44 px ; un toast qui ne recouvre pas la rangée des cartes ; une carte d'ordre jamais sur plusieurs lignes, dont la barre ne change pas de place, et dont seul le fond dit « ébranlé » (le « ! » reste). **Les points d'état** (Jérôme, v0.41.0 ; `etatSujet` et `etatGroupe` de `js/lib/labo-shell.js`, de game-system, règle de la section 16 des conventions) : devant chaque sujet et chaque groupe, vert (rond) = une variante est en jeu (`actuelle` ou `retenue`), rouge (carré) = à trancher (une variante `a-trancher`, ou des statuts sans variante en jeu), orange (triangle) = aucune variante n'a de statut (le groupe Arcade).
- `atelier.html`, `js/atelier.js`, `js/design-store.js` — l'atelier : les réglages
  chiffrés, publiés dans `assets/design/reglages.json`.
  **L'éditeur de carte est le premier onglet de l'atelier, celui qui s'ouvre** (Jérôme : « je ne vois pas où est l'éditeur de carte (…) j'ai uniquement la longue liste de champs » : les réglages chiffrés étaient l'onglet par défaut ; ils s'appellent maintenant « Réglages chiffrés » et viennent après, puis « Publier » ; l'adresse `#Carte`, `#Réglages`, `#Publier` n'a pas changé). **L'onglet « Carte »** (Jérôme, lots 0 à 4 de l'éditeur de carte ; `js/atelier-carte.js`) : **un éditeur visuel** (Jérôme : « je ne comprends pas les chiffres de l'éditeur (…) chaque champ identifié par un nom et une description » ; « l'éditeur de carte doit devenir visuel, avec les outils de construction »). Trois colonnes qui remplissent l'écran (`.at-plein`, `.ed`) : à gauche la **boîte à outils** (Sélectionner, Gomme ; Bosse, Creux, Crête, Plateau ; Arbre, Buisson, Bois, Haie, Dégager, avec leur icône ; Annuler, Rétablir), au centre la **scène** (la carte, large, zoom ajusté ou × 1 à × 4, repères tous les 50 m, une barre qui lit le sol sous la souris **en mots** : position depuis l'ouest et le haut, secteur, hauteur, sol, herbe), à droite l'**inspecteur** (l'outil ou la forme choisie, ce qui est posé, les réglages du secteur). **La vue 3D** (Jérôme : « Ajoute une vue 3D dans l'atelier » ; `js/apercu-3d.js`, chargée à la demande : three.js ne se charge qu'au premier passage en 3D) : le bouton **3D** de la barre du haut remplace le plan par **le moteur même du jeu** (`creerRendu`, sans respiration de la caméra) posé sur une bataille de départ (`nouvelleBataille`, sur le secteur retouché : `SECTEURS[id]` est remplacé le temps de la monter, puis rendu) : sol en cubes, tranchées, arbres, régiments à leur place (case « Soldats (3D) » : sinon 16 hommes), lumière du jour. **On y construit** (Jérôme : « poser des objets directement dans la 3D ») : glisser tourne et incline (sous 4 px de mouvement, c'est un clic), le bouton droit (ou Maj) déplace, la molette zoome ; **un clic sur le sol pose avec l'outil choisi** (`clic3D` d'atelier-carte.js ; le point vient de `rendu.versTerrain`, moins les marges), la Gomme retire le plus proche, Sélectionner choisit (on règle ses chiffres dans l'inspecteur ; pas de déplacement à la souris en 3D, le glissé tourne la vue) ; les traits (crête, haie) se posent en **deux clics** (`trace3d`, Échap annule). Les formes sont dessinées par-dessus (`surcouche3D` : une surcouche canvas, chaque point projeté par `versEcran`, donc elles suivent le relief et la perspective ; anneau du pinceau au curseur, signe au centre) pendant que le sol se refait (~1 s). La caméra est gardée quand le terrain se refait (un curseur refait la 3D après 120 ms, ~6 s au premier passage dans le rendu logiciel de Chromium). **Lumière (3D)** : plein jour (midi), soir, aube, pluie, brouillard, gel (`regarderAu(B, heure, meteo)` de bataille.js : l'heure du premier jour et le temps, rien d'autre ; sans remonter la bataille). Le plan et la 3D se refont chacun à leur tour (`perimee2D`, `perimee3D`) : on ne calcule que la vue qu'on regarde. Non fait : déplacer ou redimensionner à la souris dans la 3D, la nuit (le papier de la nuit n'existe qu'en partie).
  **Les cartes à vous** (Jérôme : « je veux pouvoir créer une nouvelle carte (à partir d'une existante ou from scratch) dans l'éditeur ; une fois publiée, elle s'ajoute à la liste des cartes des nouvelles parties » ; v0.38.0) : le bouton **Nouvelle carte…** de la barre du haut ouvre un dialogue (nom, « Partir de » : un champ vierge, ou une copie de n'importe quelle carte, la vôtre ou d'origine, **retouches comprises**) ; la carte est une **copie complète d'un secteur** (`nouvelleCarte`, `idCarte` : `carte-` + le nom sans accent, 24 signes, jamais un id pris), pas une dérivation : retoucher l'original ensuite ne la change pas. Le modèle vierge est `VIERGE` de `data/secteur.js` (relief presque plat, ni arbre, ni haie, les mêmes lignes ; pas dans la liste des parties). Même taille (400 × 300) et mêmes marges pour toutes. Elle vit dans le brouillon (`cartes: { id: secteur entier }`, plus `supprimees: [id]`) jusqu'à la publication, qui écrit **`assets/design/cartes.json`** (les secteurs d'origine, eux, restent des retouches dans `secteurs.json`) : l'atelier refait `chargerContenu()` au clic (une carte créée depuis l'ouverture de la page n'est pas dans le `contenu` du démarrage : bug trouvé en jouant la publication contre une API simulée), contrôle la carte (`validerSecteur`, un nom non vide), calcule sa coupe nord-sud (`profilDe` de secteur-terrain.js : 12 valeurs de 0 à 1, ce que la liste des parties dessine) et écrit le secteur entier. Le jeu les ajoute à `SECTEURS` au lancement (`appliquerCartes` de design-store.js, **avant** `appliquerSecteurs`, jamais par-dessus un secteur d'origine, marquées `perso: true`) : elles apparaissent après les trois d'origine dans le choix de la nouvelle partie (touches 1 à 9 pour les neuf premières) ; le contenu des cartes est dans l'empreinte du jeu à deux. Dans l'éditeur, la liste « Secteur » les marque « · à vous » ; l'inspecteur dit si la carte est publiée ou pas, permet de changer le **nom** et le **résumé** (valable aussi pour les cartes d'origine : une retouche `nom` / `resume` de `secteurs.json`), et de **supprimer** une carte à vous (un brouillon s'efface ; une carte publiée sort de `cartes.json` à la prochaine publication). Une partie sauvegardée sur une carte supprimée retombe sur `essai` pour ce que `etat.sol` ne porte pas (`secteurDuJeu`) ; son sol est celui qu'elle avait. « Essayer dans le jeu » marche sur une carte à vous (le jeu lit le brouillon). Pas testé avec un vrai jeton : la publication est jouée contre une API GitHub simulée (blobs, arbre, commit : le fichier écrit est le bon).
  **Sélectionner** : un clic choisit une retouche ou un objet, on glisse son carré central pour le déplacer, les autres carrés (rayon, bouts d'un trait) pour le redimensionner, Suppr le retire, Échap désélectionne ; un glissé est une seule entrée de l'historique. **Chaque chiffre a un nom, une unité et une description** (`data/carte-outils.js` : `OUTILS`, `CHAMPS`, `champ(nom, genre)` pour les champs d'une forme, dont le nom change avec le genre : la « profondeur » d'un creux est la « hauteur » d'une bosse ; `data/secteur-params.js` : `desc` de chaque réglage ; test « chaque chiffre a un nom et une description »). Ajouter un outil est une entrée de données. Le terrain d'un secteur vu de dessus (secteur et graine au choix, courbes de niveau au mètre, arbres et buissons, tranchées des deux
  camps, secteurs A à D, une ligne de lecture au survol). Il monte le sol par `terrainDuSecteur` (`js/secteur-terrain.js`, logique pure, extrait de `monter` de bataille.js : le jeu et l'atelier montent le même terrain) et le peint par `couleurCase` : ce qu'on y voit est le départ de la bataille.
  **Les réglages d'un secteur** (lot 1 ; `data/secteur-params.js` : le chemin, les bornes, le pas de chaque curseur) : bosses, ondulation, nappe, la crête (si le secteur en a une), arbres, bois, haies, buissons, jours de pluie ; la carte se refait 120 ms après la main (le terrain coûte ~0,3 s). Les retouches vont dans le brouillon (`secteurs: { id: { 'relief.bosses': 2.5 } }`, à plat),
  se publient dans `assets/design/secteurs.json` (objets : `deplier`) et le jeu les pose sur `SECTEURS` au lancement (`appliquerSecteurs` de design-store.js, main.js), publiées puis celles de ce navigateur, comme les réglages chiffrés ; elles entrent dans l'empreinte du jeu à deux (`empreinteReglages`). **La partie garde son sol** (lot 2, Jérôme : « retouches sur la génération ») : `nouvelleBataille` copie dans `etat.sol` ce qui fait le terrain du secteur (`relief`, `arbres`, `bois`, `haies`, `buissons`, `retouches`, `objets`, `tranchees`) et `secteurDuJeu(etat)` (bataille.js : toutes les règles le lisent, au lieu de `SECTEURS[…]`) le pose par-dessus `SECTEURS` : republier un secteur ne change pas le sol d'une partie en cours ni d'une partie relue (test « la partie en garde une copie »). Une partie d'avant n'a pas `etat.sol` et lit le secteur d'aujourd'hui. Le jeu à deux se vérifie par l'empreinte des retouches (`empreinteReglages`).
  **Les retouches de relief** (lot 2 ; `js/formes.js`, logique pure) : une liste de formes `{ f, x, y, r, h }` (`x2`, `y2` pour une crête) en mètres, coordonnées du **secteur** (négatives dans les marges) : `bosse` (+h au centre, fondu en cosinus jusqu'à r), `creux` (−h), `crete` (une bosse le long d'un segment), `plateau` (aplanit à la hauteur absolue h, pleinement jusqu'à 0,6 r). `creerTerrain` les applique dans l'ordre de la liste après le bruit et avant les tranchées (`appliquerFormes` : sans hasard ; sans formes, le sol est celui d'avant, au bit près) ; la nappe ne les suit pas (un creux sous la nappe se remplit). L'atelier : outils Lire / Bosse / Creux / Crête (un glissé) / Plateau / Gomme, rayon et hauteur au curseur, annuler et rétablir (un historique en mémoire, perdu avec la page), anneaux et signes dessinés sur la carte (case « Retouches »). Dans le brouillon et dans `secteurs.json`, la liste est la clé `retouches` (un tableau remplace l'ancien en entier). **Les objets et les tranchées** (lot 3 ; `js/objets.js`, `validerSecteur` de tranchees.js) : `objets` est une liste `{ o, x, y, … }` : `arbre`, `buisson`, `bois` (r : 40 essais d'arbres serrés, comme ceux de la graine), `haie` (un segment, des trous), `degager` (r : retire les arbres et les buissons **de la graine**, jamais ce qui est posé). Les dégagements passent d'abord, puis les objets dans l'ordre (`poserObjets`, appelé par `creerTerrain` après les arbres de la graine ; sans hasard hors de la graine : les tirages de la graine sont ceux d'avant). Outils de l'atelier : Arbre, Buisson, Bois, Haie (un glissé), Dégager ; la Gomme retire la retouche ou l'objet le plus proche (déplacer : l'outil Sélectionner) ; une seule histoire pour annuler et rétablir le relief et les objets.
  Les lignes de tranchées se règlent au curseur (`tranchees.lignes.nous.0` à `.3`, `eux`, la rangée en m depuis le haut du secteur ; `tranchees.creneau` 0,5 à 2,5 : l'amplitude du tracé ; `tranchees.boyaux`). Le brouillon écrit un tableau comme un objet (`{ "lignes": { "nous": { "0": 212 } } }`) : `fusion` le pose sur le tableau d'origine. **Le contrôle** (`validerSecteur(S)`, dit à voix haute dans le panneau et refait par l'onglet Publier, qui refuse un secteur qui échoue) : lignes dans l'ordre et à 10 m au moins l'une de l'autre, à 6 m du bord, 60 m de no man's land entre les premières lignes, au moins un boyau, un tracé qui ne se coupe pas (deux cases de large d'une colonne à l'autre, pour huit graines : à une amplitude de 5 m, il se coupe ; l'atelier plafonne à 2,5). Les régiments de départ se placent sur `B.lignes` : ils suivent les lignes déplacées (`tranchees.depart` ne dit que les rangs). Non fait : les « limites » de `ligne: { eux: 70, nous: 230 }` (lues seulement sans tranchées).
  **Essayer dans le jeu** (lot 4 ; bouton de l'onglet Carte, grisé tant que le contrôle signale un problème) : ouvre `./?essai=<secteur>&graine=<n>` dans un autre onglet. Le jeu y lit déjà les retouches de ce navigateur (le brouillon, comme les réglages) : `main.js` saute l'écran titre, lance la bataille (`commencer`) et dit « Partie d'essai : rien n'est sauvegardé » ; `ESSAI` coupe `sauvegarder()` et le `store.clear('partie')` de « Nouvelle bataille » : la partie réelle du joueur reste intacte. Rien n'est publié.
  Mesuré (`SECTEURS.essai` retouché, 750 hommes par camp, 2 400 pas, graine 7, quatre régiments en marche vers la 1re ligne d'en face) : le coût de la simulation ne bouge pas (médiane 1,06 à 1,14 ms, 99e centile 7,2 à 9,2 ms, que le sol soit nu, en falaises de 8 m, barré d'une crête de 12 m ou couvert de plateaux, de haies et de 400 arbres). Une crête de 12 m en travers du no man's land est un mur : deux régiments sur quatre sont encore à ~130 m du but après 80 s, contre ~65 m sur le sol nu (la marche ralentit sur la pente, rien ne se bloque). Suite : `ROADMAP.md`.
- `test/` — `node outils/test-run.mjs` (terrain, foule, bataille, sauvegarde, pureté). `test/fumee.json` (l'empreinte du HUD, `outils/fumee.mjs`) et `test/rendu.json` (celle du dessin, `outils/rendu-empreinte.mjs`) : des références, pas des tests de règles.
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
node outils/rendu-empreinte.mjs           # le dessin : 37 images à horloge et hasard truqués, hachées au pixel près (test/rendu.json)
node outils/fumee.mjs                    # le jeu dans le navigateur : un scénario fixe, aucune erreur console, l'empreinte du HUD (test/fumee.json)
node outils/captures.mjs --page index.html --page labo.html --page atelier.html
node outils/audit-ecran.mjs --page index.html --page labo.html --page atelier.html
node outils/lisibilite.mjs               # contraste, tuiles en gris
node outils/deux.mjs                     # le jeu à deux : deux pages s'appairent, jouent, aucune désynchronisation (~30 s)
node scripts/mesure.mjs                  # 8 000 soldats : simulation et rendu
node scripts/trois-jours.mjs             # trois jours de bataille, captures chaque soir
node outils/stamp-version.mjs            # après chaque changement de version.json
```

## Exceptions aux conventions

- **Les sauvegardes d'avant peuvent casser** (Jérôme : « on peut changer les sauvegardes, pas de parties en cours ») : les conventions (sections 1 et 11) demandent de prévenir avant de pousser un
  changement qui casse les sauvegardes, et des migrations ; ici, tant qu'aucune partie réelle n'est en cours, on monte `VERSION` (bataille.js) sans écrire de `??=` pour l'ancien format et sans prévenir.
  Ce qui reste exigé : le format est versionné, et une partie sauvegardée puis relue dans la même version est la même partie (tests « relue au milieu », « relue après une nuit »).
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
| Le sol plat des zooms 1 et 2, les facettes de 5 m au loin | 0.12.0 | Jérôme veut la même résolution du terrain à tous les zooms ; coût : tout dézoomé, 8 000 soldats, rendu logiciel, 49 → 88 ms (12 800 → 88 000 triangles) ; zooms 4 et 8 inchangés |
| Sol à facettes, soldats en sprites (labo) | 0.1.1 → 0.2.0 | non retenus par Jérôme ; facettes : +30 % de triangles sur un champ labouré, trame bruyante (`docs/archives/sol-facettes-et-soldats-sprites.md`) |
| Les corvées « caillebotis » et « coup de main » (`T.caille`, `etat.prisonniers`, `capturer`, `nuit.coup*`) | 0.38.3 | Jérôme : « il y en a trop » ; les caillebotis ne servaient qu'à faire marcher plus vite sur une case de boue de la tranchée (et doublaient « réparer ») ; le coup de main coûtait des hommes et ne rapportait que quelques prisonniers qui ne servaient à rien (`docs/archives/corvees-retirees.md`) |

## Pièges connus

- **Le jeu à deux** (Jérôme, v0.30.0 ; `js/reseau/`, `lancerMarche`, `lancerBarrage`, `executerCmd`, `demarrerReseau` de main.js) : l'hôte est le bleu (NOUS), l'invité le kaki (EUX). Un ordre du joueur ne change rien tout de suite : l'ordre à sec (`peutOrdonner`, `peutBarrage`, avec le camp)
  dit le refus à voix haute, puis `commander` l'envoie aux deux machines, qui l'exécutent au même cadre (`executerCmd` : marche, barrage, pause, vitesse, corvée, prêt). Les commandes : `marche`, `barrage`, `stance`, `pause`, `vitesse`, `corvee`, `pret`.
  Le jeu à deux **n'arrête jamais la boucle** (`loop.pause()` n'est pas appelé : les cadres vides font passer les ordres, la pause est un ordre partagé, `lockstep.etat.pause`) ; perdre le focus ou ouvrir le menu envoie la pause aux deux, la fermer la lève (`pauseParMoi`).
  L'interface joue `MOI` : au kaki, la caméra est tournée d'un demi-tour (`placerCamera(π + yaw)`), la carte aussi (ses lignes en bas, A à D de droite à gauche : `creerCarte({ moi })`, y miroir), les variables `--jeu-nous` / `--jeu-eux` sont échangées (ses cartes en kaki, celles d'en face en bleu :
  `reglerCamp`), les pertes et la nuit lisent son camp ; son objectif est l'inverse de celui du bleu (`objectif()`). La partie à deux ne s'écrit pas dans `cyclopeen:partie`, ni la caméra dans les préférences. Le mode debug : `__jeu.reseau()` (cadre, écart, empreinte), `__jeu.marche` / `barrage` passent par le lockstep ;
  **n'y pas appeler `avancer(n)` ni `nuit()` en partie à deux** (ils changent une machine seulement : désynchronisation). `outils/deux.mjs` joue deux pages de Chromium l'une contre l'autre (`--disable-features=WebRtcHideLocalIpsWithMdns` : sans lui, Chromium masque ses adresses locales).
  Mesuré (deux pages, ×4, un jour, une nuit, une aube, 12 000 cadres) : aucun écart. **Deux vrais Mac, même Wi-Fi (Jérôme, v0.34.1) : Chrome se connecte (code court compris), Firefox échoue** (`failed`, cause non trouvée : permission « Réseau local » de macOS, adresses `.local` de Firefox, `media.peerconnection.ice.obfuscate_host_addresses` à tester ; l'écran conseille Chrome, v0.34.3). **Pas testé** : Windows, un réseau avec isolation des clients, un réseau lent (le délai de 6 cadres tient jusqu'à ~150 ms d'aller-retour ; au-delà, la partie attend l'autre : elle ralentit, elle ne diverge pas).
- **Le choix du secteur, en deux colonnes** (Jérôme, v0.37.1 : « lors d'une nouvelle partie, à gauche la liste des cartes, à droite le visuel 3D de la carte qui bouge » ; `demanderSecteur` de main.js, `#dialogue-carte`) : à gauche la liste des secteurs (`SECTEURS` **avec les retouches de l'atelier** : une carte éditée, vanilla comprise, se présente retouchée), à droite le secteur choisi en 3D, la caméra tourne seule (`apercu-3d.js` : le moteur du jeu, `rotation: 0,12 rad/s`, `cadrer`, sans soldats ; on peut aussi la tourner à la main). **Le terrain montré est celui qu'on jouera** : la graine est tirée à l'ouverture (`window.__seed` ou l'horloge) et rendue avec le secteur (`{ secteur, graine }` ; trois appelants : nouvelle partie, nouvelle bataille de la fin, invitation du jeu à deux) ; « Autre terrain » en tire une autre (le relief, les arbres et la boue changent, pas le caractère du secteur). Un clic choisit (et montre), « Jouer ce secteur », un double-clic ou Entrée lancent, les chiffres 1 à 3 et les flèches changent de choix, Échap annule. Sans WebGL, la liste reste utilisable (`console.warn`). `game.css` (synchronisé) limite un dialogue à 520 px : `#dialogue-carte` lève `max-width`. Le dialogue ne dessine rien dans la bataille de l'écran titre : c'est un second moteur (`creerRendu` dans la boîte), arrêté à la fermeture (`activer(false)`).
- **Trois secteurs** (Jérôme, v0.29.0 : « 3 cartes différentes à choisir en début de partie » ; `data/secteur.js`, `demanderSecteur` de main.js, touches 1 2 3) : `essai` (« Les labours » : l'ancien secteur, rien n'a changé pour lui hors les tranchées), `crete` (une bosse
  de 7 m de haut, large de 42, à 62 m du haut du secteur, qui serpente de ±15 m : leurs lignes la tiennent ; bosses ×1,6, nappe 0,8 m plus profonde, peu de bois, des haies, un jour de pluie au moins) et `marais` (bosses ×0,45, nappe 1,4 m plus
  haute : les creux se remplissent, quatre jours de pluie au moins, 320 buissons, 90 arbres). Même taille, mêmes lignes (400 × 300 m) : ce qui change est dans `relief` (lu par `creerTerrain`), les nombres d'arbres et la pluie ; `profil` et `resume` font la carte
  du choix. L'id du secteur est dans l'état (`etat.secteur`) : une partie d'avant relit `essai`. En mode debug, `?secteur=crete` sans demander. Test « trois secteurs » : relief, crête, tranchées continues.
- **Des tranchées qui serpentent** (Jérôme, v0.29.0 : « moins géométriques ») : les créneaux en carré (±1,5 m tous les 10 m) et le zigzag des boyaux faisaient un dessin au cordeau. Le tracé est une somme de bruits lissés (`ligneY`), sa pente reste sous 0,3 case par colonne (la tranchée se suit
  sans se couper : deux cases de large au moins), les boyaux sont des sinusoïdes ; `L.baie` n'est plus lu. Cela change la forme des tranchées d'une partie sauvegardée avant (le terrain est refait de la graine) : ses hommes gardent leur place, les ordres se recalculent.
- **Longer la tranchée à découvert** (Jérôme, v0.21.4) : un carré de 4 m où passait une tranchée comptait +8 de relief (ses parois) : le champ
  de coûts contournait la tranchée par le sol nu à côté. Un carré dont 15 % au moins est en tranchée ou en boyau encore creusés
  (`T.troncon` et `diff` ≤ −2) coûte désormais la moitié (`foule.abri`, `abriPart`) et ne compte plus de relief : un régiment qui
  marche le long de son front reste dans la tranchée (graines 3, 5, 7, 30 s : 50-57 % des hommes en tranchée, contre 12-31 %), sans
  arriver plus tard (140 m restants contre 143). Les cratères ne comptent pas (les descendre ralentit). Une tranchée comblée par les obus ne
  protège plus : son carré redevient ordinaire à la prochaine mise à jour des coûts. `calculerCoutsBande` donne aussi la vue de `troncon`.
- **Le contenu publié par l'atelier ne doit pas faire bouger les références** (v0.38.0 ; Jérôme a publié des retouches de « Les labours » : `fumee.json` et `rendu.json` n'étaient plus bons, 11 étapes et la plupart des images) : `fumee.mjs`, `rendu-empreinte.mjs`, `campagne.mjs` et `campagne-titre.mjs` servent `{}` pour tout `assets/design/*.json` (`context.route`) : la référence est celle du jeu d'origine. Un test de navigateur qui veut le contenu publié doit le demander. `node outils/test-run.mjs`, lui, ne lit jamais ces fichiers.
- **Le test de fumée est un test de refonte** (`outils/fumee.mjs`) : l'empreinte du HUD à 13 étapes (`test/fumee.json`) ne doit pas bouger quand on découpe
  du code sans rien changer ; une règle ou un texte qui change exprès demande de la réécrire (`--ecrire`, sur l'ancien code d'abord pour prouver le reste).
  Pièges rencontrés en l'écrivant : la boucle avance d'un nombre de pas qui dépend de la machine avant qu'on l'arrête (d'où `setSeed` et la pause dans le
  même instant) ; un clic à l'écran vise un point qui dépend de la respiration de la caméra, donc de l'horloge (d'où les ordres par `__jeu`) ; un ordre
  fait clignoter trois secondes d'horloge (d'où l'attente). Et (v0.40.0) le clic sur une carte glisse la caméra 0,6 s : le terrain sous la souris à l'étape `fiche-regiment` dépendait de l'instant (« Herbe » ou « Herbe rare » selon la vitesse de la machine) ; on attend 1 s avant l'étape. Et à la découpe de `rendu3d.js` : `geometrieSoldat` lisait `attrsI`, un état du rendu, sans le dire ;
  seul un essai qui compare les formes avant et après (`creerGeometries` contre l'ancien code) l'a vu.
- **L'empreinte du dessin** (`outils/rendu-empreinte.mjs`, `test/rendu.json`) : 37 images (l'écran titre, tous les zooms, obus en vol puis fumée, mêlée, souffle d'un 155, régiments choisis et survolés, tombes, ordre qui clignote et surbrillance de la visée, vue tournée, soir, nuit en trois styles,
  pluie, brouillard, gel, feu retenu de près) dont les pixels ne doivent pas bouger quand on découpe `rendu3d.js`. Elle truque `performance.now` et `requestAnimationFrame` (une image =
  1/30 s = un pas de la simulation) et `Math.random` (graine fixe) : sans cela la respiration de la caméra, la pluie et les éclats changent à chaque lancement. Le budget de ms
  du sol ne coupe plus rien (le temps ne passe pas dans une image). Les pixels sont lus dans le même instant que le dessin (`drawImage` du canvas WebGL : après, il serait vide).
  Mesurée : deux lancements identiques ; un changement de 0,0001 de la respiration change toutes les images. Un changement voulu du dessin demande de réécrire la référence (`--ecrire`) ;
  une autre machine peut donner d'autres pixels (rendu logiciel) : réécrire alors la référence sur l'ancien code avant de découper.
  **Ce que la découpe a appris** : une image que l'empreinte ne dessine pas n'est pas protégée (l'écran titre, le souffle, les anneaux de sélection, les tombes, le clignotement d'un ordre, les trois styles
  de nuit du labo n'y étaient pas : chacun a été ajouté **avant** de découper son morceau, la référence réécrite sur l'ancien code) ; régénérer la référence sans toucher le code fautif prouve le reste
  (`git stash push -- js/rendu3d.js`, `--ecrire`, `stash pop`) ; remplacer dans un fichier un texte qu'on a déjà modifié ne trouve rien (extraire le texte d'origine, le garder, puis le transformer à part).
- **Les postures, mesurées** (`scripts/mesure-stances.mjs`, 9 graines, 9 000 pas, 750 hommes par camp, sans IA ni artillerie : tous les régiments d'un camp à l'assaut de la 1re ligne de l'autre) : **l'assaut n'atteint jamais la tranchée en 300 s** (0 tronçon perdu, 0 mêlée ; l'attaquant perd 280 à 300 hommes, le défenseur ~40), donc ce scénario ne mesure que le tir sur le no man's land. Écart-type de la moyenne : ~5 morts sur 290, ~2 sur 40. `retenu` à 35 m et ×1,5 est neutre pour les morts de l'attaquant (292 → 296 en attaque, 281 → 286 en défense, dans le bruit) **mais coûte au défenseur** : ses morts passent de 39 ± 2 à 50 ± 2 quand il tient en `retenu` contre un assaut à volonté (+28 %), car l'attaquant tire sans réponse entre 70 et 35 m. À 49 m (×0,7) : l'attaquant perd 343 ± 7 au lieu de 281 et le défenseur 40 : dominant. À 35 m et ×2,5 : 418 ± 4, dominant aussi. Le point d'équilibre est entre 35 et 49 m à ×1,5 ; non réglé (les réglages restent 0,5 et 1,5 : la posture n'est pas encore accessible). **`soldat.fatB` (fatigue des bras) n'a aucun effet sur le tir** (`army.js` l'écrit, `identite.js` l'affiche) : la « fatigue des bras ÷2 » du plan n'aurait rien coûté. Le prix d'une posture est donc sa portée, sa précision et sa cadence, pas la fatigue.
- **Les postures, avec appui d'artillerie, et l'IA** (Jérôme, v0.36.3 : `retenu` reste à 35 m et ×1,5, l'IA d'en face n'en use pas ; `scripts/mesure-stances.mjs --appui 60`, 9 graines, 9 000 pas) : avec 60 s de barrages d'abord (220, 155, 75 sur la ligne visée), l'assaut atteint la tranchée (0,3 à 0,9 tronçon perdu, mêlée 2 à 5 s). Morts de l'attaquant : 223 (attaque) et 222 (défense) contre un défenseur à volonté, **209 et 208 contre un défenseur en `retenu`** (−6 %, ± 3,5) ; morts du défenseur ~63 dans tous les cas : `retenu` n'a aucun coût mesuré pour le défenseur et gagne ou perd quelques pour cent selon la portée. Essais (défenseur en `retenu`, morts de l'attaquant en attaque / défense) : 42 m 237 / 230, 49 m 270 / 260, 35 m ×2 263 / 267, 42 m ×1,8 279 / 272 ; seul le premier est proche de la neutralité, les autres dominent. **L'IA** : `ia.stance` (`''` : éteint ; `'retenu'` : ses régiments qui tiennent leur propre tranchée, `postureIA` de bataille.js, lue de l'ordre, sans hasard ; à volonté dès qu'ils sortent ou plient ; muette à deux). Allumée, nos assauts (avec appui, IA qui joue) : 247,6 → 266,6 morts chez nous (+8 %), tronçons perdus par l'IA 4,3 → 3,1 (−28 %), mêlée 20 → 13 s, ses morts 65 → 70 : un défenseur un peu plus dur, pas invulnérable ; à 42 et 49 m, nous perdons 260 et 294. Éteinte par défaut, à allumer dans `reglages.js` ou l'atelier. La seule valeur de `retenu` qui n'est pas dominante est celle du jeu ; la posture reste un choix de tempo, pas un coup de force : si elle devait coûter quelque chose (cadence, ouverture du feu retardée), ce serait une décision de design.
- **L'identité portable** (Jérôme, cadrage de la campagne, lot 1 ; `etat.graineIdentite`, `nouvelleBataille(…, { graineIdentite })`, `quiEst` de hud/lecture.js, `VERSION` 2) : les noms, âges et grades de NOS hommes viennent de `graineIdentite` (égale à `graine` hors campagne : rien ne change, vérifié par `test/campagne.test.mjs` : même photo, même `rng`, même empreinte, et `fumee.json` / `rendu.json` intacts) ; ceux d'en face viennent toujours de `graine`, sinon « Müller Hans » n° 5 renaîtrait à chaque bataille. Elle ne sert qu'à `identite()` : ni `createRng`, ni `creerTerrain`, ni les hachages de jours, de mission, de corvée ou de retour (`nuit.js`). **Numéro de bataille et numéro de campagne** (lot 3) : `quiEst`, `premierDe`, `rangDe` et `relever` retrouvent régiment et rang en additionnant les `initial` des régiments (les numéros de bataille, `id`, sont contigus par régiment : on n'y touche pas, `A.victimes`, `etat.evacues` et `etat.corps` y sont indexés). Le nom d'un de nos hommes vient de son **numéro de campagne**, `numeroCampagne(etat, id)` = `etat.numeros[id] ?? id` : `etat.numeros` ({ numéro de bataille : numéro de campagne }, `{}` en campagne, `null` hors campagne) et `etat.prochainNumero` (le compteur : la relève y puise des numéros neufs, jamais celui d'un vétéran). Les ennemis n'ont pas de numéro de campagne. Un vétéran promu change d'âge (l'âge dépend du grade, `identite`), pas de nom.
- **Reconstituer** (campagne, lot 3 ; `nouvelleBataille(…, { troupes, soldatsEux, iaRythme })`, `reconstituer` et `suivante` de campagne.js) : chaque régiment reprend ses survivants **aux premières places** (le rang d'avant, puis l'expérience : la hiérarchie d'un régiment est celle de ses places, `grade(k, n)`, donc un capitaine tombé est remplacé par le gradé survivant le plus haut, jamais rétrogradé), puis des recrues sans expérience, jusqu'à l'effectif plein (94). Plus de régiments au registre que de places (huit) : les plus fournis restent, les autres versent leurs hommes aux places vides du plus clairsemé (« fusion » automatique, le papier de réorganisation du lot 4 la remplacera). Un régiment sans survivant garde son nom, recruté à neuf (le Mémorial dira « le Viride n'est plus », lot 4). Rien ne change à la partie hors les hommes : mêmes places, mêmes tirages, mêmes positions (test). Un seul survivant d'un régiment dévasté devient capitaine : cas limite assumé. `soldatsEux` (`etat.parCampEux`, `parRegimentEux` : la relève d'en face y est fidèle) et `iaRythme` (facteurs de la durée entre deux actions de l'IA : `enFace`) portent la difficulté croissante de `data/campagne.js` (`forces` : 1,3 puis 1 puis 0,77 ; `ia` : 1,4 / 1 / 0,7). **Ces nombres sont des propositions**, `scripts/mesure-campagne.mjs` les mesure (voir ROADMAP.md §4). `VERSION` 4.
- **Le cache des champs de coûts et les ralentissements** (Jérôme, v0.34.6 et v0.34.4 : « au jour 5 le jeu rame très fort », puis « ça rame encore au jour 2 » ; Firefox, quel que soit le zoom ; `foule.champsMax`, `champGroupes`, `champRetard`, `champDe` de bataille.js) : un champ de marche se calcule en 5 ms (33 600 carrés ; la file de seaux en tableaux typés et la relaxation déroulée n'y gagnent que 20 %, le calcul est près de son minimum) et le cache le garde par (but, version des coûts). **Deux défauts.** (1) À 10 champs gardés pour 16 régiments, dès que plus de dix buts différents étaient demandés dans un même pas, ils se chassaient du cache et chaque pas les refaisait : 1,4 → 49 ms par pas en continu (profil : `calculer`, 68 s sur 80) ; `champsMax` est à 48 (16 régiments × deux versions, plus la relève). (2) À chaque nouvelle version des coûts (toutes les ~2,7 s), les seize régiments redemandaient leur champ **dans le même pas** : 55 à 100 ms d'un coup, un saccadement toutes les 2,7 s (graine 7, barrages continus : médiane 1,2 ms, 99e centile 59, max 426) ; la moyenne par pas ne le montre pas, il faut les centiles. Désormais chaque régiment garde l'ancienne version (`B.coutsPrec`, sauvegardée) pendant `(id % 16) × 0,17` s après le changement (`etat.couts.depuis`), puis passe à la nouvelle : un champ par intervalle, 99e centile 13 ms. Le délai ne vient que de l'état, donc la partie relue suit les mêmes champs (test « relue au milieu de l'étalement » ; sans `coutsPrec` sauvegardé il échoue). Équivalence mesurée (3 graines, 8 régiments en marche, 90 s) : distance au but à 0,7 m près, pertes dans le bruit. **Il reste** un pas de 100 ms quand on envoie huit régiments à huit buts différents (un champ neuf chacun, pas de version précédente à suivre) et un pas de 300 à 500 ms à la toute fin de chaque journée (graine 7, jours 1 à 3 : 337, 498, 317 ms) : c'est `for (p < 12) hydroLignes(T, 0, T.H, …)` de `avancer`, les douze heures d'eau de la nuit sur les 537 000 cases d'un coup (une heure : ~146 ms) ; `hydroLignes` est à état et sensible à l'ordre des cases (l'eau coule d'une case à la voisine) et la sauvegarde le rejoue : ne pas le réécrire pour le rendre plus vite. Pour l'étaler sans changer la partie, il faudrait le découper en rangées dans le même ordre (passe après passe, rangée après rangée, comme `avancerEau`) pendant la phase `nuit`, avec la progression dans l'état et dans `etapesRejouer` : pas fait (un à-coup d'une demi-seconde par jour, au moment où l'écran passe à la nuit). Un test de saccade doit regarder les centiles et le pire pas, pas la moyenne.
- **La fumée de l'écran titre passait dans la partie** (Jérôme, v0.36.7 : « encore des fumées marron au démarrage ») : `attacher` ne vidait que les feux ; les éclats (fumée de 40 à 90 s), les balles et les obus en vol du décor restaient dans les tampons de `eclats.js`. `reinitialiser` les vide, avec les obus qui attendent le sol.
- **Le plan lointain de la caméra était resté dans un commentaire** (Jérôme, v0.36.8 : « avec une vue lointaine, une partie du champ est coupée ») : `camera.far = D * 6` était collé à la fin du commentaire de la ligne du `near`, donc `far` restait à 1 000 m (la valeur de création) ; au zoom 1 et à une vue basse, le fond du terrain, à plus de 1 000 m de la caméra, disparaissait en bande nette. Le faux terrain se perd à 500 m du champ dans la couleur du ciel. Un commentaire en fin de ligne ne doit jamais précéder du code.
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
  triangles, 20 ms). Les facettes lointaines et le sol plat sont retirés depuis la v0.12.0 (voir « Ce qui a été retiré »). Les marges du terrain ont été mesurées pour elle : au zoom 1
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
- **Le refus d'un jour se juge sur le moral du soir** (avant que la nuit n'en rende une
  part) : jugé à l'aube, il ne venait presque jamais (il fallait un moral de 0,02 le
  soir). La contagion porte à 150 m : deux régiments côte à côte sont à ~130 m l'un de
  l'autre, et à 80 m seul celui de derrière s'en ressentait (v0.11.0).
- **Les abris ne changent pas le terrain** (ils sont dans l'état, pas dans `diff`) : la
  sauvegarde n'a rien à rejouer ; un 220 qui les crève le fait pendant le jour, dans
  `tomber`, et l'état sauvegardé le garde.
- **Une ombre opaque d'une seule couleur** (`t`) se lisait comme un trou (Jérôme,
  v0.11.0) : elle prend la couleur du sol un ton plus sombre, fondue vers son bout (trame jusqu'à la v0.12.0)
  (une lecture de texture de plus par pixel d'ombre : 77 ms au lieu de 73 au zoom 4,
  8 000 soldats, dessin attendu jusqu'au bout ; de l'ordre du bruit de la mesure).
- **Un seul défenseur gardait un tronçon contre un régiment entier** (v0.15.0) : un tronçon ne changeait de main que vide de ses
  défenseurs, et un blessé debout suffisait ; deux ou trois hommes résistaient des minutes à des dizaines d'attaquants. Désormais
  (`prises`, `R.tranchee.melee` et `tenue`) un tronçon est pris quand les attaquants y sont au moins 2 fois plus nombreux (et au moins 3)
  pendant 6 s : la mêlée (`etat.melee`, par tronçon, sauvegardée ; elle retombe deux fois plus vite qu'elle ne monte). Mesuré
  (graines 7 et 8, tous les régiments envoyés dans la 1re ligne d'en face, 3 jours) : la règle change peu le cours d'une attaque
  frontale (graine 7, au soir du jour 2 : nous tenons 46 tronçons avec la mêlée, 41 sans ; 623 morts chez nous, 644 sans ; et dès le premier jour, 570 des nôtres sur 750), car les attaquants meurent à
  découvert avant d'y entrer ; elle joue sur une brèche (test « la mêlée » : trois défenseurs, vingt attaquants). `tenue: 1e9`
  redonne l'ancienne règle.
- **Un régiment, un secteur** (v0.14.0) : un ordre sur une tranchée étale le régiment sur 46 m au plus (`largeurSecteur` − 4), plus
  serré s'il le faut ; à 94 hommes, la longueur de deux rangs faisait ~66 m, et « un secteur » en couvrait trois. Les tests : un assaut de
  l'ennemi se teste en vidant quatre régiments seulement (tous vidés, la bataille finit), et un 220 sur un secteur (deux tronçons)
  se tire en plusieurs salves. L'équilibre (huit régiments sur la 1re ligne seule : deux fois plus d'hommes au mètre) n'est pas
  encore mesuré.
- **L'assaut frontal coûtait trop** (v0.17.0 ; Jérôme : « adoucir ») : tous les régiments envoyés dans la 1re ligne d'en face perdaient
  570 à 665 hommes sur 750 le premier jour (mesuré, graines 7 et 8 : presque tout par le tir à découvert, 540 à 627, très peu par les obus).
  `tir.mouvement` (0,75 : un homme qui marche à pleine vitesse échappe au coup avec cette chance) et `tir.precision` (0,05 → 0,035) les
  ramènent à 382-390 (graines 7 et 8) ; `mouvement` seul (0,5 ou 0,75) n'en ôtait que 70 à 130 : l'essentiel des morts tombe quand les
  attaquants s'arrêtent et se serrent devant la tranchée. Une bataille sans ordres devient plus calme (graine 7, 4 jours : 121 des nôtres
  et 16 en face, contre 223 et 151 avant) : en face attaque moins.
- **Le 75 est le plus précis, pas le plus meurtrier** (Jérôme, v0.34.5) : la chance de toucher un homme dans le rayon (`tuerDans`, 0,7 × (1 − d/r)^1,5) est multipliée par `letal` du calibre (`calibres.js` : 75 → 1, 155 → 1,5, 220 → 2 ; plafonnée à 0,95). Hommes touchés attendus par obus sur une troupe de 0,2 homme/m² : ~1,6, ~7,4, ~20 (avant : 1,6, ~4,9, ~10) ; par salve complète, 39, 89, 120 (avant : 39, 59, 60), avant dispersion et abris. Mesuré sur un régiment de 400 hommes, une salve : bruité (graines 3, 5, 7), à refaire sur une bataille entière avant de toucher à `precision` ou à `rapport`. Le dessin a changé (13 images de `test/rendu.json`, plus de morts sous les obus).
- **Le souffle des obus** (Jérôme, v0.16.0) : `tuerDans` (army.js) jette les survivants jusqu'à `obus.souffleZone` (1,8) rayons du
  point de chute, à l'opposé, d'une vitesse qui tombe à zéro au bord (`obus.souffle`, 16 m/s au centre ; la vitesse retombe d'elle-même,
  ~3 m parcourus, puis la marche les ramène à leur place) ; sans hasard, donc la partie relue est la même. Le dessin les faisait sauter
  (`souffler`, un bond de 0,6 s) : **retiré en v0.32.3** (Jérôme : « soit projection, soit ralentissement, pas de saut » ; la poussée reste, le bond non ; le jeu ne ralentit personne : à décider d'après les variantes B à D du sujet « Projections » du labo).
  **Mesuré sur l'équilibre** (`scripts/mesure-souffle.mjs`, v0.26.0 : 4 salves de 220 sur un régiment en tranchée, graines 3, 5, 7, 11) : le souffle sort 6 à 9 hommes de leur place (à plus de 2 m) et ils sont revenus en 1 s ; les morts
  ne bougent pas au-delà du bruit (5-15 avec, 9-16 sans). Rien à régler. Le bleu de nos soldats (v0.16.0) se lit sous la pluie (capture du zoom 4, jour 1 sous pluie) : rien à régler non plus.
- **Les morts d'obus sont projetés** (Jérôme, v0.24.0) : `projeter` (bataille.js, appelé par `frapper` avec le choc `{ x0, y0, d, rayon }` que `tuerDans` donne) jette le corps à
  l'opposé du point de chute, de `obus.projection.min` à `max` m (8 à 15 pour un rayon de 10, en proportion du rayon : un 75 jette de 3 à 6 m, un 220 de 8 à 15), sans hasard (collé au point de chute : un côté
  fixé par le numéro) ; `etat.corps` garde le point d'arrivée (rien de neuf dans la sauvegarde). `B.volants` (`[indice du corps, x, y du départ, âge]`, vieilli par `avancer`, jamais sauvegardé) : le dessin
  (`majCorps`) fait voler le corps de là où l'homme est tombé, sur une flèche de `projection.haut` fois la distance, pendant `projection.duree` s. Les morts de la nuit ne volent pas.
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
- **La barre de chargement** (Jérôme, v0.28.0 ; `hud/chargement.js`, `#chargement` d'index.html) : le HTML la porte avant tout script (5 %), main.js la remplit (le jeu, les réglages, le moteur, le décor) puis la retire ; relire une partie passe par `etapesRestaurer`
  (bataille.js, un générateur : `[part, étape]` entre deux morceaux, `restaurer` le vide d'un coup, même partie) et une partie neuve par `etapesNouvelle` ; la barre reste jusqu'à ce que `jouer` ait branché la bataille au rendu. Le mode debug ne s'arrête jamais pour peindre
  (`instantane`) : les scripts gardent leurs minutages.
- **Les soldats scintillaient dans les cratères** (v0.16.0) : leur hauteur était celle de la case, en marches d'un demi-mètre
  (`hauteurVueQ`) : un homme à cheval sur deux cases changeait de hauteur à chaque pas. `surfaceLisse` (rendu3d.js) interpole entre
  les centres des quatre cases voisines : il glisse sur les bords des trous.
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
  capture. Une extension installée avant la page peut encore les lire : d'où (v0.21.2) le clic gauche pour choisir et ordonner (le clic droit n'annule que) et, pour la caméra, le bouton du milieu et le cadran à l'écran (v0.9.1 : tourner au clic droit restait gêné par les gestes de souris de Firefox).
- Ordre des tirages : `nouvelleBataille` tire la météo (une branche du générateur),
  puis les positions de départ. Changer cet ordre change toutes les batailles.
