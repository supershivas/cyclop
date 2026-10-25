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

Choisie par Jérôme (v0.1.0). Lettres : `t s b g h e r o` (terre, boue, glaise, herbe morte, eau, brume, os), `n` bleu horizon (nous), `x` vert kaki clair (en face), `v w` (herbe qui reprend). **Aucune autre couleur dans le jeu**, hors les exceptions listées (alertes de l'interface, feuilles d'automne, fondus continus, fond des dialogues, voile de nuit). Valeurs, rôles, exceptions datées et mesures de lisibilité : `docs/domaines/rendu.md`, « Palette ». Toute couleur nouvelle se vérifie avec `outils/lisibilite.mjs`.

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

Souris et clavier (choisir, marcher, barrages 1-2-3, avion 4, génie 6, pause Espace, caméra flèches/ZQSD, A/E/R/F, C, molette, Échap/clic droit pour annuler). Le tableau complet est dans `docs/domaines/interface.md`, « Commandes ».

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

## Où lire quoi (le détail est hors de ce fichier, pour le garder court)

**Avant de toucher à un domaine, lis son fichier** : il porte les décisions datées, les mesures et les pièges (et leur coût) de ce domaine. Un `CLAUDE.md` de dossier charge tout seul le fichier de `js/rendu/`, `js/hud/` et `js/reseau/` dès qu'on y lit un fichier ; ailleurs, c'est à toi de l'ouvrir.

| Si tu touches à… | Lis |
|---|---|
| `js/army.js`, `bataille.js`, `nuit.js`, `tranchees.js`, `champs.js`, `identite.js`, `data/` : tir, moral, postures, corvées, mêlée de nuit, tranchées, champs de coûts, équilibrage, sauvegarde rejouée | `docs/domaines/bataille.md` |
| `js/rendu3d.js`, `js/rendu/` : caméra, sol, soldats, nuit et ciel, effets, performances du dessin (chargé seul dans `js/rendu/`) | `docs/domaines/rendu.md` |
| `js/main.js`, `js/hud/`, `index.html`, `css/` : cartes, fiche, carte, papier de la nuit, haut de l'écran, survol, choix du secteur (chargé seul dans `js/hud/`) | `docs/domaines/interface.md` (+ `docs/design-system.md`, `docs/ui-cible.md`) |
| `js/campagne.js`, `data/campagne.js` : registre, papier de campagne, reconstitution, identité portable | `docs/domaines/campagne.md` |
| `js/eaux.js`, `generateur.js`, saisons, secteurs, ponts, `js/chars.js`, `js/avions.js`, mitraillage aérien | `docs/domaines/terrain-engins.md` |
| `js/reseau/`, le jeu à deux, `lancerMarche`, `executerCmd` (chargé seul dans `js/reseau/`) | `docs/domaines/reseau.md` |
| `labo.html`, `js/labo*.js`, `atelier.html`, `js/atelier*.js`, `design-store.js`, contenu publié | `docs/domaines/labo-atelier.md` |
| `test/`, `outils/fumee.mjs`, `outils/rendu-empreinte.mjs`, `scripts/` : références, mesures | `docs/domaines/tests.md` |

Autres : `DESIGN.md` (l'intention), `ROADMAP.md` (`docs/pistes-avancees.md` : les pistes non construites), `docs/archives/` (ce qui a été retiré), `docs/refonte-rendu3d.md`.

## Structure (une ligne par module ; le détail est dans le fichier du domaine)

- Logique pure (aucun DOM, aucune horloge, aucun hasard hors de la graine ; testée dans Node) : `terrain.js` (champ de hauteurs `base` + `diff`, eau), `army.js` (la foule), `tranchees.js`, `nuit.js` (corvées), `champs.js` (coûts de marche), `bataille.js` (état, règles, ordres, sauvegarde), `formes.js` / `objets.js` / `secteur-terrain.js` (retouches de relief, objets, terrain d'un secteur), `identite.js`, `eaux.js`, `generateur.js`, `chars.js`, `avions.js`, `campagne.js`, `reseau/`, `data/` (les nombres et les textes).
- Rendu : `rendu3d.js` (three.js, la caméra, l'API) + `rendu/` (soldats, sol, ciel, temps, effets, ponts, chars, avions). Le rendu ne modifie jamais l'état.
- Interface : `main.js` (écran titre → bataille → nuit → fin, commandes, boucle), `hud/` (papiers, cartes, fiche, carte), `index.html`, `css/style.css`.
- Outils de contenu : `labo.html` + `js/labo*.js`, `atelier.html` + `js/atelier*.js` + `design-store.js`.
- Vérification : `test/` (règles, `fumee.json` et `rendu.json` : des références), `outils/`, `scripts/`, `lisibilite.config.mjs`.

## Mode debug et mesure

- `?debug=1` : `window.__jeu` (`state`, `stats`, `avancer(n, passerNuits)`,
  `barrage(cal, x, y, camp)`, `marche(ids, x, y)`, `zoom(i)`, `camera(yaw, k)`, `teleport`,
  `bataille()`, `rendu()`, `fiche()`, `survol(x, y)`, `nuit()` : ouvre la nuit, `fin()` : la fin), `&seed=7`. F9 masque le panneau. Les
  coordonnées du mode debug sont celles du **secteur** (0..400, 0..300) : les marges
  s'ajoutent dans `main.js`.
- `?debug=1&grades=fanion` (ou `jumelles`, `galons`) : les grades à l'écran (v0.68.0, au labo seulement : sans ce paramètre tous les soldats sont pareils).
- `?soldats=8000` : une bataille de 8 000 soldats (les deux camps).
- `?mesure=1` : chaque image attend la fin du dessin (lecture d'un pixel) ;
  `cyclopStats().ms.renduFini`. Sans lui, `rendu` est le temps côté jeu (comme
  `pierreStats()` de Pierre).

## Vérifier et livrer

**Ne lance que ce que le changement touche** (les tests de règles durent ~5 min en tout) :

| Tu as touché… | Lance |
|---|---|
| `army.js`, tir, moral, postures | `node outils/test-run.mjs --court test/armee.test.mjs test/stances.test.mjs` (~35 s) |
| `terrain.js`, eaux, formes, générateur, saisons | `... test/terrain.test.mjs` (~13 s) |
| `bataille.js`, `nuit.js`, `tranchees.js`, `champs.js`, sauvegarde | `... test/bataille.test.mjs` (~195 s) ; `--filtre <mot>` pour un test |
| `campagne.js`, `data/campagne.js` | `... test/campagne.test.mjs` (~46 s) |
| `js/reseau/` | `... test/lockstep.test.mjs` (~9 s) puis `node outils/deux.mjs` |
| le dessin | `node outils/rendu-empreinte.mjs` ; le HUD : `node outils/fumee.mjs` |
| avant de pousser une règle | `node outils/test-run.mjs --court` (tous) |

`--court` n'imprime que les échecs et le bilan ; `rendu-empreinte` et `fumee` aussi (une ligne si tout est identique, `--detail` pour la liste).

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
node outils/stamp.mjs                    # après chaque changement de version.json (l'outil de game-system, puis les exemples des commentaires de js/lib remis sans `?v=` : la synchronisation les défait)
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

Rangés par domaine dans `docs/domaines/` (voir « Où lire quoi ») : chacun dit son coût (le bug, la mesure). Un piège nouveau s'écrit dans le fichier de son domaine, pas ici.
