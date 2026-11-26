# Roadmap — Cyclopéen

Les grosses évolutions envisagées ou en cours. Une entrée reste ici jusqu'à
sa livraison complète, puis en sort (le `CHANGELOG.md` garde la trace). Une
idée écartée part dans `docs/archives/` avec sa raison. **Ce fichier reste sous
15 ko** : le détail d'un chantier vit dans `docs/chantiers/`.

Statuts : **à l'étude** · **validé** (Jérôme a tranché) · **en cours** ·
**à mesurer** (livré, attend un playtest) · **gelé** (rien jusqu'à la sortie).

La roadmap jusqu'à la v0.169.0, avec tout son détail : `docs/archives/roadmap-avant-itch.md`.

## Le cap : la sortie sur itch.io (Jérôme, 24 nov., v0.169.0)

**Statut** : validé. L'intention est dans `DESIGN.md` (la promesse, les deux
éditions, la boucle, la campagne, les cartes, la sortie). Tout se construit dans
**l'édition itch** (un seul code, deux éditions : `DESIGN.md`) ; le jeu actuel
garde ses systèmes. Ordre des lots, du plus grand changement de
ressenti au plus mécanique ; chacun livrable seul, avec ce qu'il **retire** :

| # | Lot | Ce qu'il construit | Ce qu'il retire (archivé avec sa raison) |
|---|---|---|---|
| 0 | **Les deux éditions et les textes** — **fait (v0.170.0)** | `data/editions.js` (quels systèmes chaque édition branche), le choix sur l'écran d'accueil et `/itch/`, une clé de sauvegarde par édition ; le **mécanisme** des textes (un fichier par langue, `data/textes/fr.js`, une fonction `t()`), par lequel passe tout texte **nouveau** (Jérôme : les anciens textes migrent au lot 6) | rien |
| 1 | **Les cartes du soir** — **en cours** (le tirage et la carte gardée : `js/cartes.js`, 22 cartes en six raretés ; restent les effets, l'écran) | ~20 cartes en données (`data/cartes.js`, tirées de `docs/chantiers/cartes-wtf.md` : des objets parachutés qui reviennent, des caprices en poche), un seul écran (trois paquets, on en déchire un, on garde une carte : Jérôme, 26 nov.), les six raretés (elles remplacent le niveau II), les maudites | dans l'édition itch seulement : la soirée en trois étapes, les arbres du camp, les paquets de 10, la dotation, le résumé et les moments du soir (ils restent au jeu actuel) |
| 2 | **L'écran allégé** | à l'écran : l'objectif, les effectifs, la musette ; le reste au survol | les statistiques permanentes qui ne servent pas une décision |
| 3 | **Les vues à la personne au centre** | une touche et un bouton visibles pour entrer dans n'importe quel homme ou engin | rien |
| 4 | **Le premier jour guidé** | 4 ou 5 consignes d'une ligne, au bon moment, qu'on peut couper | rien |
| 5 | **La campagne en arbre** | parties de 1 à 5 jours, la graine de campagne (général adverse qui apprend, boss annoncé, ordre des mécaniques, particularités, branches), la doctrine de départ, les régiments gardés, les cartes débloquées pour de bon, les niveaux de galons | dans l'édition itch : les trois secteurs fixes, la durée de 10 à 15 jours |
| 6 | **L'anglais** | `data/textes/en.js` (préparé par Claude), la langue du navigateur, le choix dans les réglages | tous les textes restés dans le code |
| 7 | **La distribution** | `scripts/distrib.mjs` (liste blanche, sans labo, atelier, lumière, outils, tests, docs), un drapeau `DISTRIB` qui coupe la mise à jour automatique, un bouton plein écran, la musique en Opus (35 Mo de mp3), l'exécutable Electron, la page itch (prix libre, 3 € suggérés) | rien |
| 8 | **Faire connaître** | des GIF et vidéos courtes (`outils/trailer.mjs`), l'envoi aux streamers francophones | rien |

**Avant la sortie, à mesurer** : la fluidité sur une petite carte graphique (les
chiffres de `?perf=1` sur les deux Macs ; un réglage de qualité si besoin) ; la
perte d'un contexte WebGL (un message clair).

**Plus tard** : le défi du jour (classement en ligne, un service à choisir).

## Garde-fous contre la dette technique (Jérôme, 24 nov.)

La v0.169.0 comptait ~34 000 lignes de JS, dont ~8 000 pour le labo et l'atelier,
~2 200 pour le labo lumière, 2 415 pour `main.js` seul (1 498 après le lot de dette), et environ 3 300 textes
écrits dans le code. Les systèmes se sont empilés (la soirée a connu trois jets,
les vues à la personne six versions) avant d'être joués. Règles validées :

1. **Un module par système nouveau.** L'édition itch ajoute ses modules (cartes,
   campagne, guidage) sans toucher aux anciens ; le choix d'édition se fait **à un
   seul endroit** (`data/editions.js`, au branchement), jamais des `if (itch)`
   semés dans les règles.
2. **`main.js` ne grossit plus.** Il ne fait que brancher les modules de
   l'édition choisie ; ce qu'on y touche, on le sort dans un module.
3. **Le moteur marche pour les deux éditions.** Tout changement du terrain, de la
   foule, du rendu, des vues, des largages ou des caprices se vérifie dans les deux
   (`fumee` et `rendu-empreinte` pour chacune).
4. **Le labo seulement pour le visuel.** Une règle se décide dans la roadmap et se
   construit directement en jeu ; le labo sert aux variantes à regarder.
5. **Les textes nouveaux en données** dès le lot 0 (le mécanisme d'abord, les
   anciens textes au lot 6).
6. **Une mesure par lot** : les tests ciblés, `rendu-empreinte`, `fumee` ; un
   système retiré emporte ses tests.

**Le lot de dette (Jérôme, 24 nov.) : fait.** `main.js` passe de 2 415 à 1 498 lignes : douze modules en sont sortis (`hud/choix-secteur.js`, `decor-titre.js`, `fin.js`, `visees.js`, `etiquettes.js`, `rangee.js`, `recit.js`, `survol.js`, `batteries.js`, `parc.js`, `fiche-avion.js`, `reglages.js`, `reseau/partie.js`, `debug-jeu.js`) et le soir a un seul point d'entrée (`ouvrirSoir`, l'aiguillage des éditions) ; `CLAUDE.md` passe de 24,6 à 20 ko (le texte déplacé tel quel dans `docs/domaines/`) ; les pistes avancées sont archivées. Vérifié : `fumee`, `rendu-empreinte` (40 images identiques), `deux.mjs`, `lockstep`. **Pas fait** : retirer les variantes anciennes du labo (la section 16 des conventions les garde). **Repéré** : la fumée varie d'une exécution à l'autre sur `objet-bandeau` (le bandeau d'un objet parachuté, selon l'instant où une caisse tombe), avant comme après le lot : à rendre déterministe. Un outil pour la suite : `eslint` (dans `/opt/node-tools`) avec `no-undef` attrape les variables oubliées lors d'un découpage.

Les sauvegardes de l'édition itch (une mise à jour relit-elle une campagne en
cours ?) : à décider plus près de la sortie (Jérôme, 24 nov. : « on verra en temps
utile ») ; d'ici là, l'exception de `CLAUDE.md` vaut pour les deux éditions.

## En cours

- **Les vues à la personne, deuxième passe** (v0.165.0 → v0.169.0) — **à mesurer** :
  le voile noir a-t-il disparu, la sensation de l'avion, la portée de visée du char.
- **Fluidité** (Jérôme, v0.134.1 : « le jeu lag ») — **en cours** : attend les
  chiffres de `?perf=1` sur les deux Macs ; ensuite, dans l'ordre : regrouper les
  morceaux du sol lointains, étaler la simulation, ne renvoyer que les rangées
  changées des textures, un Web Worker en dernier recours. **Bloque la sortie.**
- **Les largages et les caprices** (v0.162.0, v0.163.0) — **à mesurer** : la
  fréquence, la force des objets, ce que l'IA fait de sa musette, la place des
  caprices dans la journée. Gardés tous les deux (Jérôme, 24 nov.).

## Gelé jusqu'à la sortie

- **Le jeu à deux** (lockstep, WebRTC, ntfy.sh) : **gardé tel qu'il est dans le
  jeu actuel** (Jérôme, 24 nov.), absent de l'édition itch ; les systèmes de
  l'édition itch n'ont pas à le supporter. Restent ouverts : Firefox ne se connecte
  pas, un serveur TURN, le déterminisme sous Firefox.
- **Le labo lumière** (`js/lumiere/`) : son passage en jeu (`docs/chantiers/lumiere-vers-le-jeu.md`).
- **L'atelier d'animation** : `docs/chantiers/animations-vers-le-jeu.md`.
- **La patrouille de nuit** (au labo depuis la v0.142.0) : à reprendre, peut-être
  comme particularité d'une partie.
- **L'éditeur de carte** : restent la taille d'une carte, l'export d'un secteur.
- **Le terrain réaliste** (`docs/chantiers/terrain-vegetation-realiste.md`) : le
  lot 1, le grain du sol.
- **Les chars** : les quatre autres engins et leur déblocage (pourront devenir des
  mécaniques de campagne ou des cartes), le char d'en face (A7V).
- **Le lot minimal et la v1.0.0** : la v1.0.0 se décide avec la sortie (Jérôme).

## À l'étude

- Le tri de la liste des cartes et le paquet de départ : `docs/chantiers/cartes-wtf.md`.
- Les doctrines de départ et les généraux adverses (5 de chaque), les quatre
  boss, les niveaux de galons.
- La place de la vue à la personne dans une partie : un outil (jouer un homme
  pendant qu'on commande) ou une récompense (après l'assaut).

## Pistes avancées

Archivées le 24 nov. : `docs/archives/pistes-avancees.md` (brainstorming v0.35.0, dépassé par le cap de la sortie). Une piste qu'on reprend repasse par « À l'étude ».
