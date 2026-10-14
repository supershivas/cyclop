# Conventions communes — jeux Supershivas

Ce fichier vit dans `supershivas/game-system` et il est la source de vérité.
Chaque jeu en reçoit une copie dans `.claude/conventions-jeu.md` via
`scripts/sync-game-system.sh`, lancé automatiquement au début de chaque session.

**Ne modifie jamais `.claude/conventions-jeu.md` dans un jeu.** Il est écrasé à
chaque synchronisation. Si une règle doit changer, propose-la-moi (voir
« Évolution de ces règles »).

**Priorité** : le `CLAUDE.md` du jeu prévaut sur ce fichier. En cas de conflit,
applique la règle du jeu et signale-moi le conflit.

**Cadre** : des jeux faits seul, joués dans le navigateur (GitHub Pages), et
qui doivent pouvoir partir un jour sur Steam sans être réécrits (section 22).

**Socle — tous les jeux**

- Version, changelog, mise à jour automatique sans perte de partie (2, 4).
- Écran titre sans sous-titre, réglages derrière une roue crantée (3).
- Palette restreinte déclarée, échelle entière pour le pixel art (5, 7).
- Cible d'affichage déclarée, et deux URL à chaque livraison (7, 20).
- Clavier et pointeur au minimum, toutes les actions possibles des deux (8).
- Boucle à pas fixe, pause sur modale ou perte de focus (9).
- Sauvegarde automatique, versionnée, exportable (11).
- Contenu en données, règles en code (12).
- Bible `DESIGN.md` et `CLAUDE.md` qui ne décrivent que le jeu actuel (15).
- Mode debug par l'adresse (`?debug=1`) (18).
- Aucune ressource chargée depuis un CDN au lancement du jeu (21, 22).

**À la demande** : labo, atelier, langues, manette, équipe d'agents et
playtests, outils de mesure supplémentaires.

---

## 1. Git et déploiement

- Pousse toujours directement sur `main`, même si la session désigne une
  branche `claude/...`. Pas de pull request sauf demande explicite.
- Un push sur `main` déploie en production (GitHub Pages, racine du dépôt,
  avec `.nojekyll` pour que `CHANGELOG.md` et les dossiers commençant par `_`
  soient servis). Vérifie que le jeu se charge sans erreur avant de pousser
  (section 19).
- Messages de commit en français, courts, qui disent **ce que le joueur verra**
  (ou ne verra plus), pas l'opération : « Les loups reculent quand on fuit »,
  pas « fix wolf AI ». Aucun identifiant de modèle dans un commit ni dans le code.
- **Préviens-moi avant de pousser** un changement qui casse les sauvegardes
  existantes (section 11).
- Après chaque version poussée, donne-moi les deux URL de la section 20.

## 2. Version

- Format `MAJEUR.MINEUR.CORRECTIF`. Chaque push qui change ce que voit ou vit
  le joueur incrémente un niveau :
  - **correctif** : bug, ajustement visuel, réglage, texte ;
  - **mineur** : nouvelle mécanique, nouvelle zone, nouvel écran ; le correctif
    repart à 0 ;
  - **majeur** : uniquement sur ma demande (refonte, changement de moteur).
- En cas de doute entre correctif et mineur, choisis correctif. Un push sans
  effet pour le joueur (documentation, outils, `CLAUDE.md`) ne change pas la
  version.
- Un nouveau jeu démarre en `0.1.0` tant que le lot minimal n'est pas validé,
  puis passe en `1.0.0` sur ma décision.
- Source unique : `version.json` à la racine :
  ```json
  { "version": "1.4.2", "date": "2026-10-13", "changes": ["Les loups reculent quand on fuit"] }
  ```
  `changes` : 1 à 3 lignes lisibles par un joueur. Historique dans
  `CHANGELOG.md` à la racine (le plus récent en haut, `## 1.4.2 — 2026-10-13`
  puis des lignes `- …`).
- Ne code jamais la version en dur : le jeu lit `version.json`.
- GitHub Pages sert les fichiers avec dix minutes de cache : après chaque
  changement de version, lance `node outils/stamp-version.mjs`, qui ajoute
  `?v=X.Y.Z` aux imports et aux feuilles de style. Sans cela, un joueur peut
  tourner avec un mélange d'anciens et de nouveaux modules.

## 3. Écran titre, en-tête et réglages

- **Pas de sous-titre.** Jamais de sous-titre ni de baseline sous le nom du
  jeu.
- **L'écran titre** propose, dans cet ordre : *Continuer* (s'il existe une
  partie), *Nouvelle partie* (avec confirmation si elle efface une partie), puis
  la roue crantée. Rien d'autre n'est obligatoire.
- **Réglages** : ils s'ouvrent uniquement par une icône roue crantée, sans
  libellé, avec `aria-label="Réglages"`, depuis l'écran titre et depuis la
  pause. Ils contiennent ce qui s'applique au jeu (volumes musique et effets
  séparés, qualité, langue, commandes…) puis, en bas, dans cet ordre :
  - le numéro de version (`v1.4.2`) ;
  - les 5 dernières versions (lues dans `CHANGELOG.md`) ;
  - l'export de la sauvegarde en JSON, et son import ;
  - les liens discrets vers le Labo et l'Atelier, s'ils existent.
- En jeu, le nom du jeu n'est pas obligatoire à l'écran. S'il y a un en-tête,
  le nom est à gauche, c'est un vrai lien qui ramène à l'écran titre (après
  sauvegarde), et la roue crantée est à droite.
- Les réglages et l'écran titre peuvent être habillés aux couleurs du jeu.

## 4. Mise à jour automatique

- Le jeu vérifie `version.json` (`cache: 'no-store'`) au retour au premier plan
  et toutes les 5 minutes : c'est ce que fait `modules/app-update.js`.
- **Une mise à jour ne fait jamais perdre une partie.** Le jeu indique au
  module qu'il est « occupé » tant qu'une partie est en cours hors pause ; la
  mise à jour attend alors l'écran titre, la pause ou le retour au premier
  plan. Juste avant de recharger, la partie est sauvegardée (section 11).
- Après rechargement, un toast confirme : « Mis à jour en v1.4.3 ».
- Si le jeu a un service worker, le module déclenche aussi `update()` et
  `SKIP_WAITING`.

## 5. Identité visuelle

Le design system propre aux jeux **reste à définir** (voir `DESIGN-SYSTEM.md`
dans game-system). En attendant, ces règles valent pour tous :

- **Palette restreinte**, déclarée dans le `CLAUDE.md` du jeu (nom et valeur
  de chaque couleur), dans un seul module de code (`palette.js` ou
  `design.js`), et **identique** entre le canvas, le HUD, les commandes et
  l'écran titre. Aucune couleur hors palette, aucun dégradé ni transparence
  qui fabrique une teinte de plus, sauf exception déclarée dans `CLAUDE.md`.
- **Une police d'identité au plus, auto-hébergée** (`fonts/`), avec une
  police d'interface lisible si besoin. Jamais chargée depuis Google Fonts ou
  un CDN : un chargement raté en silence fait perdre l'identité du jeu (c'est
  arrivé). Vérifier qu'elle a les majuscules accentuées.
- **Valeurs en variables** : tailles de texte, espacements, rayons, durées
  d'animation viennent d'une échelle déclarée une fois (variables CSS et
  constantes JS), jamais inventés au cas par cas.
- **Icônes de l'interface hors du jeu** (réglages, labo, atelier) : au trait,
  d'un seul jeu, auto-hébergé. Dans le jeu, les signes sont dessinés dans le
  style du jeu.
- **La forme porte l'information, la couleur la confirme** : un élément doit
  rester reconnaissable en niveaux de gris (vérifié par
  `outils/lisibilite.mjs`).

## 6. Favicon et icônes

Dès la création :

- `favicon.svg` (lisible à 16 px, dans la palette du jeu), `favicon.ico`
  (16, 32, 48) et `apple-touch-icon.png` (180 × 180) ;
- `icon-192.png` et `icon-512.png` si le jeu est installable (PWA) ;
- `favicon-labo.svg` et `favicon-atelier.svg` s'ils existent (sections 16 et
  17) ;
- une image de partage `og.png` (1200 × 630), qui servira aussi de base à la
  capsule Steam.

## 7. Écran, cibles et échelle

- **La cible est déclarée** dans la section Description du `CLAUDE.md` :
  téléphone en portrait, téléphone en paysage, bureau, ou plusieurs. Un jeu
  qui vise le téléphone tient d'abord en 375 × 667.
- **Espace logique fixe.** La logique et le rendu travaillent dans une
  résolution logique déclarée (par exemple 320 × 180, 360 × 640). Aucune
  valeur en pixels d'écran dans la logique. La mise à l'échelle se fait en un
  seul endroit, au rendu.
- **Pixel art : échelle entière uniquement** (×1, ×2, ×3), jamais
  fractionnaire, `image-rendering: pixelated`, aucun lissage. Le canvas est
  dimensionné en pixels physiques (`devicePixelRatio`), sinon un écran à 125 %
  brouille tout. `modules/pixel-canvas.js` fait tout cela.
- **Échelle de référence.** Tout se mesure au héros : sa taille en pixels est
  déclarée dans `CLAUDE.md`, et les autres tailles en découlent (une porte
  ≈ le héros, un loup à sa hanche…). Une planche d'échelle (sujet du labo, ou
  `echelle.html`) montre côte à côte le héros et chaque élément.
- **Hauteur d'écran** : `100dvh` et `visualViewport`, jamais `100vh` ni
  `innerHeight` seul (barres d'adresse mobiles).
- **Le navigateur ne prend aucun geste au jeu** : pas de sélection de texte,
  pas de loupe ni de menu contextuel sur appui long, pas de zoom à la pince,
  pas de rechargement en tirant vers le bas, pas de surlignage au toucher
  (`modules/pointer.js` et `modules/game.css`). Ctrl+F et F12 restent libres.
- **Zones tactiles** : 44 × 44 px minimum ; 48 pour un public enfant.
- **Le survol ne porte aucune information** : une information qui n'existe
  qu'au survol n'existe pas au doigt. Les styles `:hover` vont dans
  `@media (hover: hover)`.
- `prefers-reduced-motion` : les animations d'interface longues sont
  raccourcies ou sautées.

## 8. Commandes

- **Toute action se fait au clavier et au pointeur** (souris ou doigt). Un
  geste raccourcit un ordre, il n'est jamais le seul chemin.
- **Déplacements : touche physique** (`event.code`). ZQSD en AZERTY, WASD en
  QWERTY et les flèches marchent sans réglage.
- **Commandes nommées par une lettre** (M la carte, I l'inventaire, E
  l'action) : le caractère (`event.key`), pour que la touche écrite M ouvre la
  carte quel que soit le clavier ; repli sur `event.code` si ce n'est pas une
  lettre latine.
- Aucun raccourci avec Ctrl, Cmd ou Alt. Aucune commande ne se répète quand on
  garde la touche enfoncée (`e.repeat`), sauf un déplacement lu en continu.
- **Pas de recherche automatique** : Firefox cherche dans la page dès qu'on
  tape une lettre. Hors des champs de saisie, toute touche imprimable est
  retenue (`preventDefault`), même sans effet. Espace et Entrée restent libres
  sur un bouton qui a le focus.
- **Souris et doigt produisent les mêmes gestes** (Pointer Events). Ne jamais
  capturer le pointeur avant que l'appui soit devenu un glissement (seuil :
  la taille d'une cible tactile).
- **Manette** (si le jeu vise Steam ou le salon) : `modules/gamepad.js`,
  mêmes actions que le clavier, sans configuration.
- `modules/keys.js` et `modules/pointer.js` appliquent cette section : utilise-les.

## 9. Boucle et temps

- **Simulation à pas fixe, découplée du rendu** : le jeu va à la même vitesse
  à 30, 60 ou 144 images par seconde. Le retard rattrapé en une image est
  plafonné, sinon la boucle s'emballe (`modules/loop.js`).
- Le comportement **onglet caché** est déclaré dans `CLAUDE.md` : pause (par
  défaut), ou simulation qui continue à pas grossier puis rattrapage borné.
  Jamais de progression quand le jeu est fermé, sauf décision explicite.
- **Pause** automatique quand une modale s'ouvre ou que la fenêtre perd le
  focus.
- Le temps de jeu se lit par la boucle, jamais par `Date.now()` dans la
  logique (le mode debug doit pouvoir l'accélérer).

## 10. Hasard et déterminisme

- Tout le hasard du jeu passe par un générateur à graine (`modules/rng.js`).
  `Math.random` est interdit dans la logique de jeu.
- Les règles (combat, résolution, score) sont des **fonctions pures** : même
  état, même graine, même résultat. C'est ce qui permet les tests, les
  simulations d'équilibrage et le rejeu d'un bug.
- La graine d'une partie est sauvegardée, et peut être imposée par l'adresse
  (`&seed=123`) en mode debug.
- Un monde généré l'est à partir d'une graine fixe déclarée : changer l'ordre
  des tirages change le monde. Le signaler avant de pousser.

## 11. Sauvegarde

- Sauvegarde **automatique** : régulièrement, à chaque événement marquant, et
  à la fermeture (`pagehide` et `visibilitychange` vers caché). Le joueur ne
  perd jamais plus de quelques secondes, ni lors d'une mise à jour.
- **Format versionné** (`{ v: 3, ... }`) avec des migrations : une ancienne
  sauvegarde se relit toujours, ou le jeu me prévient avant de pousser
  (section 1). `modules/save.js` gère versions, migrations et clés.
- **Clés préfixées** par le nom du jeu (`kingvi:save`, `kingvi:prefs`). La
  partie, la progression permanente (méta, roguelite) et les réglages sont des
  entrées distinctes, dès le premier commit.
- **Export et import JSON** dans les réglages (partie, progression, réglages ;
  jamais un jeton).
- En mode debug, la partie se sauvegarde sous une autre clé et les réglages ne
  sont jamais écrits.
- `localStorage` suffit par défaut. Une synchronisation entre appareils se
  décide avec moi.
- Une sauvegarde relue doit être **la même partie** : un test écrit, relit et
  compare (et, idéalement, fait tourner les deux quelques secondes pour
  vérifier qu'elles restent identiques).

## 12. Données et code

- **Le contenu est de la donnée, la règle est du code.** Ajouter un ennemi,
  une carte, une recette, un niveau, un texte ne demande aucune ligne de code :
  c'est une entrée dans `data/` (JS ou JSON). Le code ne connaît pas les noms.
- **Pas de nombre magique** dans la logique : toute constante de gameplay vit
  dans `data/` (ou `tuning`), toute constante visuelle dans le module de
  design.
- **Un module, une responsabilité** : la simulation ne dessine jamais, le rendu
  ne modifie jamais l'état.
- Un ordre impossible se **refuse à voix haute** : la fonction rend la raison du
  refus, et l'écran la montre. Jamais un `return` muet.
- Les sprites et les tuiles sont de **la donnée lisible** : des matrices de
  lettres (une lettre par couleur de la palette, `.` pour le vide), dans le
  code ou en JSON (`modules/sprites.js`). Une image importée (PNG) est
  convertie à la palette.

## 13. Textes et langues

- Le français est la langue de référence.
- Un jeu bilingue passe **toutes** les chaînes visibles par `modules/i18n.js`,
  avec une entrée dans chaque langue ; jamais de texte en dur dans le HTML ou
  le JS.
- Un texte du jeu a une **clé stable** (pour l'atelier et la traduction).
- Les textes du jeu sont courts. Le jeu montre plutôt qu'il ne dit.

## 14. Son

- Web Audio, déverrouillé au premier geste du joueur.
- Volumes **musique** et **effets** séparés dans les réglages, gardés dans les
  préférences. Le son se coupe quand l'onglet est caché.
- Musique : fichiers `assets/music/` (OGG ou MP3) ou synthèse ; effets : de
  préférence synthétisés (`modules/audio.js`), sinon fichiers courts.
- Le labo a une section Son qui fait entendre chaque son.

## 15. Documents du jeu

- **`DESIGN.md` — la bible** : intention, piliers, boucle de jeu, systèmes,
  palette et échelle, « Ce que le jeu refuse ». Elle décrit l'intention ;
  `CLAUDE.md` décrit la technique. Tous les agents la lisent en premier.
- **`CLAUDE.md` ne décrit que le jeu actuel.** Ce qui a été essayé puis retiré
  part dans `docs/archives/`, avec la raison du retrait, et un tableau « Ce qui
  a été retiré » rappelle ce qu'il ne faut pas reconstruire. Rien de ce qui
  n'existe pas n'est décrit au présent.
- Chaque règle de `CLAUDE.md` porte **son coût** : le bug, la mesure ou la
  raison qui l'a fait naître. Sans cela, elle sera défaite dans six semaines.
- **`ROADMAP.md`** : les grosses évolutions envisagées ou en cours, avec leur
  statut. Une entrée sort de la roadmap une fois livrée.
- Une décision de design que j'ai prise se note avec sa version :
  « (Jérôme, v1.47.0) ».

## 16. Labo

Le **Labo** est un banc d'essai où je compare des variantes avant d'en adopter
une. Il **montre** ; il ne modifie jamais le contenu du jeu (c'est l'Atelier).

- **Accès** : `labo.html`, lien discret dans les réglages. Jamais dans
  l'écran de jeu.
- **En-tête** : le nom du jeu (lien de retour) suivi de « LABO » en police
  mono, majuscules espacées, dans un cadre fin, sur la couleur d'accent du jeu.
  Onglet : « Labo — Nom du jeu », favicon `favicon-labo.svg` = le favicon du
  jeu avec une pastille sombre (`#1C1C1E`, liseré blanc) portant une fiole
  blanche au trait.
- **Écran à hauteur fixe** (`100dvh`) : seul le contenu de la variante défile.
  **Jamais une longue page à défiler.**
- **Menu** : des groupes (onglets), leurs sujets (marge de gauche ; puces sur
  mobile), et les variantes du sujet ouvert : **A, B, C…, A est toujours
  l'actuelle**. Clic, flèches du clavier, balayage sur mobile.
- **Adresse** : elle garde le sujet et la lettre (`#loups-C`).
- **Chaque variante** a un titre et une phrase qui dit ce qu'elle change ;
  « actuelle », « retenue » (branchée dans le jeu), « ancienne ».
- **Le labo utilise les mêmes modules que le jeu** (rendu, sprites, son) : ce
  qu'on y voit est ce que le jeu affichera. Il ne lit ni n'écrit la sauvegarde.
- Sujets utiles : la planche d'échelle, chaque animation, la palette, les
  sons, les écrans, les variantes d'un réglage.
- Modèle : `templates/starter/labo.html` et `js/labo.js` de game-system, sur
  `modules/labo-shell.js` (ajouter un sujet ou une variante = une entrée du
  tableau `GROUPES` ; skill `variante-labo`).

## 17. Atelier

L'**Atelier** modifie le contenu que le jeu lit : dessins, animations,
placement sur la carte, niveaux, textes, réglages chiffrés. C'est une page à
part, jamais un onglet du labo.

- **Accès** : `atelier.html`, lien dans les réglages et icône pinceau dans
  l'en-tête du labo (et une fiole vers le labo dans celui de l'atelier).
- **En-tête** : nom du jeu + « ATELIER », fond sombre `#1C1C1E`, texte blanc.
  Onglet « Atelier — Nom du jeu », favicon `favicon-atelier.svg` (même pastille
  que le labo, avec un pinceau).
- **Outils** : un par sorte de contenu (éditeur de pixels, carte où l'on place
  les objets, éditeur de textes, curseurs de réglages, palette…).
- **Données** : chaque modification est enregistrée tout de suite dans le
  navigateur, puis **publiée** d'un geste dans le dépôt : un seul commit sur
  `main` par l'API de GitHub (`modules/gh-publish.js`), avec un jeton
  personnel fin (droit « Contents » sur ce seul dépôt), gardé dans ce
  navigateur et jamais exporté. Le jeu lit le contenu publié à son lancement ;
  ce qui n'est pas encore publié reste visible dans ce navigateur et signalé
  (« 3 à publier »).
- Le contenu publié vit dans un dossier déclaré (`assets/design/`,
  `data/ville.json`…), sous des **clés stables**. Une retouche locale plus
  ancienne que la version publiée s'efface devant elle.
- Les **boîtes de dialogue** sont rattachées au `body`, jamais rangées dans un
  conteneur caché (elles s'ouvriraient invisibles et bloqueraient la page).
- Pour un gros travail de dessin, on peut passer par Pixel Studio
  (`supershivas/pixel-studio`) : export PNG à la palette, import dans
  l'atelier.
- Modèle : `templates/starter/atelier.html` et `js/atelier.js` de
  game-system (dessins, réglages, publication) ; référence complète :
  `atelier.html` de `supershivas/kingvi`.

## 18. Mode debug

- `?debug=1` dans l'adresse charge `modules/debug.js` ; sans le paramètre, le
  module n'est même pas chargé.
- Il expose `window.__jeu` : `state()` (position, zone, PV, drapeaux, FPS…),
  `events` (journal horodaté des événements du jeu), `teleport(lieu)`,
  `timeScale(n)`, `setSeed(n)`, `reset()`, et ce que le jeu y ajoute.
- C'est l'interface des scripts de test, des captures et du harnais de
  playtest : tout ce qu'un test doit voir ou provoquer y passe.

## 19. Vérifier avant de livrer

Une contrainte sans instrument est un vœu. Avant de pousser :

1. La syntaxe de chaque module modifié :
   `node --input-type=module --check < fichier.js` (`node --check fichier.js`
   ne lit pas le fichier comme un module et laisse passer des erreurs).
2. `node outils/test-run.mjs` : les tests des règles, de la sauvegarde, des
   invariants (dans `test/`), sans navigateur.
3. Le jeu se charge **sans erreur dans la console** (Playwright, Chromium de
   `/opt/pw-browsers`) : `node outils/captures.mjs`.
4. Pour toute modification d'écran ou de CSS : `node outils/audit-ecran.mjs`
   (débordement, amputation, cibles trop petites) et, pour toute couleur ou
   tout sprite, `node outils/lisibilite.mjs`.
5. Pour tout chiffre d'équilibrage : une mesure (skill `equilibrage`), pas un
   choix à l'œil.
6. **Les deux captures**, toujours ensemble : la cible principale et l'autre
   (téléphone et bureau). Regarde-les vraiment.

Le conteneur n'a pas de carte graphique : les FPS s'y comparent d'une version à
l'autre, jamais en absolu.

## 20. Livrer

**Toute livraison donne deux URL, sans qu'on ait à le demander** :

- **le jeu** — `https://supershivas.github.io/<repo>/`, à ouvrir sur la cible
  principale (au doigt si c'est un téléphone) ;
- **l'aperçu** — le même jeu dans l'autre format : `apercu.html` (le jeu dans
  un cadre de téléphone, dans une `iframe`, jamais réduit par
  `transform: scale()`), ou la version bureau pour un jeu pensé pour le
  téléphone, et inversement.

Avec une seule URL, on ouvre le jeu en 1 400 px de large, tout y tient, et l'on
ne voit rien. Ajoute les liens du labo ou de l'atelier s'ils ont changé.

## 21. Code

- Vanilla JS en modules ES, sans build, par défaut. Une autre stack se décide
  avec moi au démarrage.
- **N'ajoute aucune dépendance sans me demander.** Une bibliothèque acceptée
  (Phaser, three.js…) est **copiée dans `vendor/`**, à une version fixée, avec
  sa licence : jamais de CDN, jamais de `npm install` pour le jeu lui-même.
  Les outils de développement (Playwright) vivent à part (`outils/`), jamais
  servis au joueur.
- Les modules de game-system sont utilisés tels quels ; un besoin qu'ils ne
  couvrent pas se propose pour game-system plutôt que de les modifier.
- Noms clairs. Des commentaires là où le « pourquoi » n'est pas évident.
- Les performances se mesurent sur un scénario déclaré (« 200 objets à
  60 images/s ») avant d'empiler des fonctionnalités dessus.

## 22. Porte ouverte vers Steam

Tant que je n'ai pas dit « navigateur seulement », le jeu reste portable :

- aucune ressource distante au lancement (polices, bibliothèques, sons, images :
  tout est dans le dépôt) ; chemins relatifs uniquement ;
- plein écran proposé (touche F11 du navigateur ou bouton), et le jeu
  s'adapte à toute taille de fenêtre (16:9, 16:10, ultra-large) ;
- manette prise en charge (section 8) ;
- sauvegarde exportable (section 11), et toutes les clés passent par
  `modules/save.js` : le jour du portage, seul ce module change de stockage ;
- rien d'indispensable ne dépend de l'adresse (`?…`) hors du mode debug ;
- l'empaquetage (Tauri ou Electron, Steamworks pour les succès et la
  sauvegarde dans le nuage) se fait le jour venu, sans réécrire le jeu.

## 23. Agents et playtests

- Les agents (`.claude/agents/`) proposent, mesurent, testent, critiquent :
  **ils n'implémentent jamais rien d'eux-mêmes**. Je tranche.
- Un playtest produit un dossier `playtests/vX.Y.Z/<run-id>/` (carnet,
  captures, journal, retours, synthèse, décisions), avec une case
  « Jérôme tranche » par proposition.
- Les joueurs fictifs ne lisent que le carnet et les captures de la partie,
  jamais le code, la bible ni les retours des autres.
- Un testeur classe en BLOQUANT, MAJEUR, MINEUR ; une régression est toujours
  bloquante.

## 24. Maintenance du CLAUDE.md

- Mets à jour le `CLAUDE.md` du jeu dès qu'une décision durable est prise :
  structure, choix technique, exception à ces conventions, piège rencontré.
- Garde-le à jour ; supprime ce qui est devenu faux ; archive ce qui a été
  retiré (section 15).
- Si une règle découverte semble valoir pour tous les jeux, ne l'écris pas
  dans ce fichier : propose-la-moi en fin de réponse, sous la forme
  « Proposition pour CONVENTIONS.md : … ». Un piège qui vaut pour tous se
  propose pour `LECONS.md` de game-system.

## 25. Nouveau jeu

Le plus simple : coller `templates/PROMPT-NOUVEAU-JEU.md` de game-system au début
de la première session. À la création d'un jeu :

0. Pose toutes les décisions à trancher avec `AskUserQuestion`, en questions à
   choix multiples (genre, vue, rendu, cible, palette, commandes, sauvegarde,
   labo, atelier, outils, agents, Steam…).
1. Installe avec `templates/installer.sh` de game-system : le jeu de départ,
   les modules (`js/lib/`), les outils (`outils/`), `CLAUDE.md`,
   `DESIGN.md`, `ROADMAP.md`, la synchronisation (`scripts/`,
   `.claude/settings.json`), le workflow, et ce que mes réponses demandent
   (labo, atelier, agents, playtest).
2. Retire les modules et outils non retenus, puis lance la synchronisation.
3. Construis le **lot minimal** : la boucle de jeu au cœur du jeu, jouable aux
   deux cibles, avec son critère de validation mesurable. Rien d'autre tant
   qu'il n'est pas validé.
4. Propose-moi la ligne à ajouter au tableau des jeux du README de game-system.

## Évolution de ces règles

Je modifie ce fichier moi-même, ou je demande à Claude Code de le faire dans
game-system. Les jeux récupèrent la nouvelle version à leur prochaine session.
