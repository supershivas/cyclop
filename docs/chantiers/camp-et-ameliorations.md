# Le camp, ses bâtiments et les améliorations (proposition, v0.84.0)

**Statut** : décisions de principe prises (voir la fin) ; lots 0 (labo), 1 (règle) et 2 (le camp à l'écran) faits, lots 3 à 5 à faire. Rien n'est dans le jeu. Les maquettes sont au labo (groupe « Camp », sujet « Le camp et ses bâtiments », 7 variantes `a-trancher`), les nombres dans `js/data/batiments.js` (des propositions, à mesurer). Source : la demande de Jérôme du 27 octobre (v0.83.1).

## Ce qui est demandé, et comment je le lis

1. **Un système d'amélioration pour les unités.**
2. **Des bâtiments pour les unités spéciales** (chars, aérodrome, maison des sapeurs, caserne des renforts, artillerie), vus au labo ; **les ordres se donnent en cliquant sur eux**, plus avec les boutons latéraux.
3. **La taille de la carte pour la « base »** : peut-être construire les bâtiments au fur et à mesure ; **une progression pendant la bataille**.
4. **« Ces bâtiments seront dans le système d'updates »** : je lis « d'améliorations » : les bâtiments *sont* ce qu'on améliore. Un seul système, pas deux : améliorer le parc des chars, c'est améliorer les chars. (Si « updates » voulait dire `app-update`, la mise à jour du jeu, rien à faire : un bâtiment est de la donnée.)

## Les cinq bâtiments (une unité spéciale = un bâtiment)

| Bâtiment | Remplace | Ordres | Niveau 1 → 3 |
|---|---|---|---|
| **Parc d'artillerie** | boutons 75 · 155 · 220 (touches 1-2-3) | un barrage par calibre, puis un clic | 75 (départ) → +155 → +220 sur affût à rails |
| **Aérodrome** | bouton « Avion » (4) | une passe, deux clics | 1 hangar, 2 avions → 2 hangars, 3 avions (aujourd'hui) → escadrille, 4 avions |
| **Parc des chars** | bouton « Char » (5) | sortir un char, puis l'objectif | abri à char (l'idée de Jérôme de la ROADMAP : une galerie couverte de terre d'où le Schneider sort) → 2 abris, un modèle de plus → atelier de réparation, 3 abris |
| **Maison des sapeurs** | bouton « Génie » (6) | refaire un pont (puis un nid dès le niveau 2) | 2 sections → 4 (aujourd'hui) → sections de 30 |
| **Caserne des renforts** | la corvée « relève » (nuit) | relever un régiment ; dès le niveau 2, l'équiper | 2 régiments en réserve → 4 (aujourd'hui) → 6 et un poste de secours |

Aux niveaux 2 et 3, **un choix entre deux améliorations** (« tir de réglage » ou « caissons doublés » pour l'artillerie, etc.) : on n'a jamais de quoi tout prendre, c'est ce qui fait de l'amélioration une décision. Le niveau de départ de l'artillerie et de la caserne est donné : c'est le jeu d'aujourd'hui, dégradé (le 155 et le 220 se gagnent).

## Cliquer un bâtiment pour ordonner

- Un clic sur le bâtiment le **choisit** (même anneau d'os que les régiments) et ouvre son **papier** (même `.papier` que la fenêtre d'un régiment : le rabat posé au-dessus de lui) : ses ordres, son niveau, l'amélioration suivante et son prix. L'ordre se donne comme aujourd'hui : un bouton du papier, puis un clic sur le sol (visée de barrage, deux clics de la passe, clic sur le pont…). Le papier est dans le labo (variantes A à G).
- **Le bâtiment dit son état** : une barre qui se remplit pendant la recharge, « PRÊT » à la fin (le langage des boutons de la v0.73.0 passe sur le toit), un chantier sous échafaudage, l'avion absent de sa cellule.
- **Trois accès, parce que le camp est à l'arrière et que l'œil est au front** : le clic sur le camp (zoom 1 à 2, on le voit) ; une rangée de cinq icônes sur la carte du haut (un clic = le même papier, sans quitter le front) ; la touche **B** glisse la caméra jusqu'au camp et revient (`centrerSur`, déjà là).
- **Le clavier reste** (conventions, section 8) : 1 à 6 choisissent le bâtiment et l'ordre comme les boutons le faisaient ; seul le panneau latéral `#batteries` disparaît.
- **Réseau** (jeu à deux) : choisir un bâtiment est local ; un ordre passe par `executerCmd` comme aujourd'hui ; bâtir et améliorer sont deux commandes de plus (`bat`, `ameliorer`) rejouées par les deux pages.

## La taille de la carte : ne pas l'agrandir

Le terrain fait 840 × 640 m (secteur 400 × 300, marges de 220 et 170 m). Notre 4e ligne est à la rangée 278 : **il reste 22 m de secteur et 170 m de marge arrière, soit ~190 m de profondeur**, sur 840 de large. Le camp du labo mesure **~240 × 45 m** en ligne (la disposition A, à ~60 m des tranchées : elle tient largement) et **~160 × 140 m** en cour (B : posée à 60 m des tranchées, elle atteint la limite du terrain, ~200 m contre ~190 disponibles : à resserrer si on la retient). Aucune case de plus.

Agrandir coûterait cher : 80 m de plus derrière nous, c'est +67 000 cases (+12,5 % de 537 600) donc autant de triangles de sol en plus tout dézoomé, là où le jeu a déjà payé 49 → 88 ms (v0.12.0, « Ce qui a été retiré »). Les bâtiments eux-mêmes sont légers (des boîtes : quelques milliers de triangles pour tout le camp, contre ~92 000 pour le sol ; ordre de grandeur, **non mesuré**) avec `scripts/mesure.mjs` avant de livrer.

Deux conséquences à accepter : le camp est **dans le terrain mais hors du champ d'ordres** (comme les marges aujourd'hui : « les ordres n'y vont pas » ; seuls les bâtiments s'y choisissent) ; et **les obus et les avions d'en face ne l'atteignent pas** (le camp n'est pas un second front ; le bombardement du camp resterait une piste, avec les bombardiers de nuit du labo). En face a le sien, symétrique, au nord, qu'on ne regarde pas.

## Une progression pendant la bataille

**Le camp démarre presque nu et se construit au fil des jours.** Au premier matin : le parc d'artillerie au niveau 1 (le 75) et la caserne au niveau 1 (deux régiments en réserve). Le reste est à bâtir.

**Une seule monnaie : la dotation de l'état-major.** Jamais des morts (DESIGN.md : « le compteur de morts n'est jamais une récompense » ; « pas de loot »). Elle tombe à l'aube (`DOTATION`, data) : **3 points au départ, +1 à chaque aube, +1 si nos lignes sont tenues à 75 % au moins, +2 la première fois qu'on prend une des quatre lignes d'en face** (au plus 8). Sur une bataille de 12 jours : environ 15 à 25 points. Le prix : un bâtiment au niveau 1 coûte 2 ou 3 ; un niveau 2, 2 à 3 ; un niveau 3, 3 à 4. **Tout prendre coûte 38 : on prend la moitié.** Les jalons récompensent de tenir et de prendre, pas de tuer.

**Un chantier dure une nuit** : on l'ordonne le jour (clic sur l'emplacement ou sur le bâtiment, « Améliorer »), il s'élève sous un échafaudage (le labo le montre) et s'achève à l'aube : cela se range dans la nuit, qui est déjà le moment où le terrain évolue en lot. La maison des sapeurs, au niveau 3, peut finir un chantier en une nuit quel que soit son niveau : sinon, un niveau 3 en prend deux. Le prix d'un bâtiment est donc aussi du temps.

Le parcours d'exemple du labo (`PARCOURS_EXEMPLE`, jours 1 à 12) montre une partie plausible : artillerie et caserne au départ, sapeurs (j. 2), chars (j. 3), aérodrome (j. 5), puis les améliorations. Ce n'est pas une règle : c'est le curseur « Jour » du labo.

**En face** reçoit la même dotation (modulée par la difficulté) et bâtit selon son IA ; ses chars sont le lot 4 de la ROADMAP « Chars ». **La campagne** (`docs/domaines/campagne.md`) peut donner un niveau de départ d'un bâtiment d'une bataille à l'autre : un second temps, comme la difficulté.

## Les améliorations des unités

Un seul arbre, deux étages :

1. **Les unités spéciales s'améliorent par leur bâtiment** (le tableau plus haut, `niveaux` de `data/batiments.js`) : niveaux 1 à 3, un choix à chaque palier, qui change un chiffre lisible (recharge −15 %, passe +30 %, travail −25 %…), jamais une courbe cachée.
2. **L'infanterie s'améliore par son équipement**, distribué à la caserne (niveau 2) : casques Adrian (la blessure à la tête tue moins), grenadiers (mêlée), section de mitrailleuses (le tir porte plus loin), brancardiers (les blessés rentrent plus vite). Deux emplacements par régiment. L'équipement se donne **à un régiment, la nuit** (une corvée de plus : « s'équiper »), il **meurt avec lui** (« un mort est mort »). Ce n'est **pas de l'expérience** : les chevrons, les caractéristiques et la fiche de l'homme (Tir, Force, Endurance, Calme) restent ce qu'ils sont, gagnés à survivre au feu ; l'équipement ne se gagne pas en tuant.

Ce que la proposition refuse : une expérience qui monte avec les morts causés, des unités qui montent de niveau « toutes seules », un arbre à vingt branches.

## Données, état, tests

- **Données** : `js/data/batiments.js` (déjà écrit pour le labo) : `BATIMENTS`, `EQUIPEMENTS`, `DOTATION`. Les chiffres des unités restent dans leurs fichiers (`calibres.js`, `chars.js`, `genie.js`, `mitraillage.js`) ; un niveau les **modifie** par des facteurs (`effets: { recharge: 0.85 }`), il ne les remplace pas.
- **Règle pure** : un `js/camp.js` (aucun DOM) : `refusCamp(B, ordre)` rend la raison à voix haute (« 3 points manquent », « le parc des chars est en chantier jusqu'à l'aube », « l'aérodrome est au niveau 1 : pas de troisième avion ») ; `batir`, `ameliorer`, `dotationAube`. Les ordres existants (`ordonnerBarrage`, `ordonnerMitraillage`, char, génie) **testent le niveau du bâtiment** avant tout.
- **État** : `etat.camp = { dotation, batiments: { [cle]: { niveau, choix: [], chantier: { vers, nuits } } }, equipements }`, sauvegardé ; `VERSION` de bataille.js monte (l'exception de Jérôme : pas de migration). **Une partie sauvegardée puis relue reste la même partie** (tests « relue au milieu » et « relue après une nuit » à étendre).
- **Dessin** : un module `rendu/camp.js` reprend les fabriques du labo (`BATIR` de `labo-batiments.js`, à sortir comme l'a été le char dans `rendu/engins.js`) ; il ne modifie jamais l'état ; une empreinte de plus dans `rendu.json`.
- **Difficulté** : les trois niveaux ne changent que l'adversaire ; la dotation ne bouge pas (à décider).

## Lots proposés (labo avant jeu ; chacun livrable seul)

0. **Fait (v0.84.0)** : le labo (ce document, les maquettes, le papier d'un bâtiment, le parcours des jours). Reste : que Jérôme tranche (questions ci-dessous).
1. **Fait (v0.85.0) : règle sans écran** : `data/batiments.js` branché, `camp.js`, la dotation à l'aube, `etat.camp` ; **aucun niveau ne bride encore rien** (tout est « niveau max » par défaut) ; tests + sauvegarde ; équilibrage mesuré (`scripts/mesure-camp.mjs` : dotation versée sur les graines 3, 7, 8).
2. **Fait (v0.86.0) : le camp dessiné et cliquable** : `rendu/camp.js`, le choix au clic, le papier d'un bâtiment, la touche B, les icônes de la carte ; les boutons latéraux sont retirés ; les niveaux brident (artillerie 75 seule au départ…). La mesure du rendu et `rendu-empreinte`.
3. **Construire et améliorer** : le chantier d'une nuit, les choix aux paliers, le papier de la nuit qui dit les chantiers.
4. **L'équipement des régiments** (casque, grenadiers…), la corvée « s'équiper ».
5. **En face et la campagne** : l'IA qui bâtit, le niveau de départ d'une bataille à l'autre.

## Décisions de Jérôme (27 octobre, sur les recommandations ci-dessus)

1. **Monnaie** : la dotation de l'état-major à l'aube.
2. **Disposition** : le camp en ligne (A) ; la cour (B) reste au labo, non retenue.
3. **Départ** : le camp presque nu (artillerie au niveau 1, caserne au niveau 1).
4. **Boutons latéraux** : retirés au lot 2.

**Reste à trancher au labo** : le dessin de chaque bâtiment (variantes C à G, encore `a-trancher`) et les nombres (à mesurer au lot 1).

## Lot 1, ce qui est construit (v0.85.0)

`js/camp.js` (pur) : `campDeDepart`, `refusCamp` (la phrase du refus : bâtiment inconnu, chantier en cours, niveau maximal, points manquants, choix exigé aux niveaux 2 et 3), `ordonnerChantier` (paie tout de suite, le niveau vient à l'aube), `dotationAube` (chantiers d'une nuit, ou deux au niveau 3 sauf « Équipe de nuit » ; puis +1, +1 si nos lignes sont tenues à 75 %, +2 par ligne d'en face prise pour la première fois). `etat.camp` est sauvegardé (`VERSION` 16) ; `aube()` rend `dotation` ({ points, aube, tenue, lignes, finis }) pour le papier de la nuit. `test/camp.test.mjs` : 9 tests (départ, refus, chantier, deux nuits, jalons, sauvegarde relue au milieu d'un chantier et après une nuit).
**Rien ne bride encore un ordre** (un barrage de 220 part au premier matin) et rien ne s'affiche : c'est le lot 2. Pas de commande réseau non plus : `bat` et `ameliorer` viendront avec l'écran. Reste à mesurer : la dotation versée sur des batailles entières (graines 3, 7, 8) pour vérifier les ~15 à 25 points.

## Lot 2, ce qui est construit (v0.86.0)

- **Dessin** : `rendu/camp-modeles.js` (les fabriques `BATIR`, sorties du labo) et `rendu/camp.js` (un volume par bâtiment de `etat.camp`, échafaudage pendant un chantier, liseré d'os autour du choisi). **Seulement dans la partie bridée** (`etat.camp.bride`, option `camp: true` de `nouvelleBataille`, donnée par `nouvelle()` et la campagne de main.js) : le labo, les tests, `rendu.json` et le jeu à deux n'ont pas de camp. Le plan est `CAMP_PLAN` (data/batiments.js : à 80 m derrière la 4e ligne, au milieu du front) ; le test vérifie qu'aucun bâtiment ne touche un autre ni ne sort du terrain.
- **Lueur** : sous la lumière commune (faite pour les gris clairs des chars et des ponts), la boue et la glaise de la palette tombaient presque au noir ; chaque matière du camp porte une lueur (`LUEUR` = 0,9 × sa couleur, éteinte avec la nuit). Piège : mesuré à l'œil sur le premier matin, pas sur une série de jours.
- **Coût du dessin** (mesuré, `renderer.info`, partie de la graine 7, caméra sur le camp) : 42 868 triangles sans camp, **+892 au départ** (artillerie et caserne niveau 1), **+2 979** avec les cinq bâtiments au niveau 3, soit au plus +7 % dans cette vue ; hors du champ de la caméra, rien.
- **Clic et papier** (`hud/camp.js`, `main.js`) : un clic sur l'emprise d'un bâtiment (`batimentSous`, 1 m de marge) le choisit ; cinq pastilles en bas à droite (là où étaient les boutons) et la touche **B** (la caméra glisse jusqu'au camp, et revient à la seconde pression) donnent les deux autres accès. Le papier porte **les boutons de batterie eux-mêmes** (ils sont rangés dans `#batteries`, caché, quand aucun bâtiment ne les réclame) : leur barre de charge, PRÊT, « FERMÉ » (bâtiment absent ou niveau trop bas, avec la raison dans l'infobulle) et leur refus à voix haute n'ont pas changé. Échap ferme le papier. Clavier 1 à 6 inchangé (il refuse « Le parc des chars n'est pas encore bâti »).
- **Bridage** (`refusOrdre`, `refusNid` de camp.js, appelés par `peutBarrage` et `ordonnerBarrage`) : 75 / 155 / 220 aux niveaux 1 / 2 / 3 de l'artillerie, l'avion à l'aérodrome, le char au parc des chars, le génie à la maison des sapeurs, un nid refait au niveau 2 des sapeurs. En face n'est jamais bridé.
- **Bâtir** : le bouton du papier (« Bâtir : Abri à char (3 pts) ») paie tout de suite ; le papier de la nuit dit les chantiers finis et la dotation tombée.
- **Écart avec la proposition** : les pastilles sont en bas à droite et non sur la carte du haut (là où l'œil les cherchait déjà) ; **le jeu à deux garde ses boutons latéraux** : il n'a pas de camp (un camp par camp, miroir pour l'invité, les commandes `bat` et `ameliorer` dans le lockstep : lot 5).
- **Reporté au lot 3** : les deux améliorations de chaque palier (le choix n'est pas demandé : `CHOIX_ACTIFS` = faux dans camp.js), le nombre d'avions, de sections, de régiments en réserve par niveau. Un niveau ouvre donc des ordres, rien d'autre.
- Références : `fumee.json` réécrite (le HUD a trois éléments de plus, la fumée ouvre l'artillerie par le mode debug avant ses barrages, puis choisit le parc des chars et le bâtit) ; `rendu.json` ne bouge pas.
