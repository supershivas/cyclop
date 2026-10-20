# Roadmap — Cyclopéen

Les grosses évolutions envisagées ou en cours. Une entrée reste ici jusqu'à
sa livraison complète, puis en sort (le `CHANGELOG.md` garde la trace). Une
idée écartée part dans `docs/archives/` avec sa raison.

Statuts : **à l'étude** · **validé** (Jérôme a tranché) · **en cours** ·
**à mesurer** (livré, attend un playtest).

## En cours

### L'éditeur de carte de l'atelier

**Statut** : lots 0 à 3 faits (Jérôme : format « retouches sur la génération ») ; reste à mesurer sur une vraie carte retouchée et publiée

Principe : un secteur garde sa graine et son bruit (`creerTerrain`) ; l'éditeur ajoute des retouches déclaratives (formes de relief, objets), jamais une carte de hauteurs entière (fichier lourd, diffs illisibles, déterminisme perdu).

- [x] Lot 0 — l'onglet « Carte » de l'atelier, en lecture seule (`atelier-carte.js`, `secteur-terrain.js`)
- [x] Lot 1 — curseurs de `relief`, d'arbres, de bois, de haies, de buissons, de pluie ; brouillon `secteurs`, publication dans `assets/design/secteurs.json`, fusion au lancement (`appliquerSecteurs`). Reste, avec le lot 2 : garder les retouches dans `etat` pour qu'une partie sauvegardée refasse son sol, pas celui d'une carte republiée
- [x] Lot 2 — retouches de relief (bosse, creux, crête, plateau, gomme), annuler / rétablir, appliquées dans `creerTerrain` (`formes.js`) ; la partie garde son sol dans `etat.sol`
- [x] Lot 3 — objets posés (arbre, buisson, bois, haie, dégager), lignes de tranchées au curseur, contrôle à voix haute (`validerSecteur`) qui refuse la publication d'un secteur invalide ; la partie garde aussi ses tranchées et ses objets (`secteurDuJeu`)
- [x] Lot 4 — « Essayer dans le jeu » : `?essai=<secteur>&graine=<n>`, une bataille d'essai sans sauvegarde avec le brouillon de ce navigateur ; coût de la simulation mesuré sur quatre cartes retouchées : inchangé
- [x] Éditeur visuel (Jérôme : chiffres nommés et décrits, outils de construction) — boîte à outils à icônes, scène large, inspecteur ; Sélectionner (déplacer, redimensionner, supprimer) ; chaque champ avec son nom, son unité et sa description
- [x] Vue 3D dans l'atelier (le moteur du jeu, lumière au choix) ; on y pose des formes et des objets d'un clic
- [x] **Créer et dupliquer une carte** (Jérôme, v0.38.0) : « Nouvelle carte… » (copie ou vierge), nom et résumé, suppression, publiée dans `cartes.json` et ajoutée à la liste des nouvelles parties. Reste : donner une carte à la campagne (`data/campagne.js` ne joue que les trois d'origine), choisir la taille d'une carte (400 × 300 partout)
- [ ] Plus tard (non décidé) — export / import JSON d'un secteur, copier-coller d'une forme, déplacer et redimensionner à la souris dans la vue 3D

### Refonte UX/UI (docs/ui-cible.md)

**Statut** : validé (Jérôme, v0.18.1) — un lot par session, chacun livrable seul ; on se concentre sur l'UX/UI

Décisions : étoiles = chevrons d'expérience (`A.exp`, aucun nouvel état) ; nom d'un régiment = numéro d'ordre + nom du lexique
(« 3 · Viride », jamais de vrais numéros de régiment) ; carte en option C (la grille et ses cases d'ordre, de vraies proportions, des
cercles-régiments par-dessus) et la touche M disparaît (carte toujours visible) ; toujours sur `main`.

- [x] Lot 1 — le râtelier : trois boutons papier 75 / 155 / 220, touches 1 2 3 (v0.18.1)
- [x] Lot 2 — haut de l'écran : réglages et carnet en haut à gauche ; pertes des deux armées en feuille de situation, au centre ; carte
  fixe en haut à droite ; montre, lecture / pause / avance rapide (×1, ×2, ×4 par `setTimeScale`, plafonnée par `perf.sim`, retour à ×1
  sur un assaut, une déroute, un tronçon pris), météo (aujourd'hui et lendemain, `etat.previsions` : pas de météo dans la journée) ;
  terrain sous la souris réduit à 2 lignes et une barre de vitesse (v0.19.0)
- [x] Lot 3 — la rangée des 8 régiments : cartes compactes (numéro + nom, chevrons, barre debout / blessés / tombés en encres papier :
  plein / hachuré / vide + ✕, pas de vert-orange-rouge), flèches si l'écran est étroit ; la carte choisie s'ouvre vers le haut
  (`actionDe`, actions) (v0.20.0)
- [x] Lot 4 — la sélection sur le terrain : contour des soldats choisis (halo aux zooms 1 et 2), ligne du centre du régiment au curseur
  terminée par une croix (DOM), destinations en surbrillance (`peutOrdonner` : l'ordre à sec, extrait de `ordonnerMarche`), clic droit ;
  mesure du rendu (v0.21.0)
- [x] Lot 5 — le survol global : un régiment (les deux camps) et un tronçon en surbrillance (v0.21.1)
- [x] Hors lots — le clic gauche choisit puis ordonne (v0.21.2), la carte en quatre secteurs A à D (v0.21.3), la marche le long de la tranchée (v0.21.4), les corvées au-dessus des cartes et pas d'évacuation chez l'ennemi (v0.22.0)
- [x] Lot 6 — les formations (bloc, ligne, par deux, colonne) : `ordre.forme` (`foule.formes` de reglages.js, `formation` de bataille.js), choisie par quatre boutons de la carte ouverte pour le prochain ordre en terrain libre ; sur une tranchée, le tracé décide (v0.23.0)
- [x] Plus tard : la fiche à gauche sous le carnet, le papier de la nuit au centre à la place des pertes, le cadran de vue retiré (touche C pour recentrer) (v0.26.0)
- [x] Haut de l'écran allégé, barre du temps, pertes en barres de vie, équerres au clic sur un régiment, visée d'un barrage, design system en variables (v0.30.0 à v0.33.0)
- [x] La fenêtre d'ordres : variante C « Le rabat », au-dessus de la carte du régiment choisi (v0.34.6 ; la variante près des hommes, v0.34.0, essayée puis remplacée)

### Découper `rendu3d.js` (docs/refonte-rendu3d.md)

**Statut** : fait jusqu'à l'étape 6 (v0.22.0, sans effet pour le joueur) — `rendu3d.js` 1 634 → 513 lignes (`js/rendu/` : shaders, formes, météo, tronçons, végétation, temps, éclats, soldats),
`main.js` 1 204 → 867 (`js/hud/`) ; filets : `outils/fumee.mjs` (le HUD) et `outils/rendu-empreinte.mjs` (34 images du canvas). Reste à décider : sortir le sol (`sol.js`) ou le laisser ;
recommandé : le laisser tant qu'aucun besoin n'apparaît. Plus tard, côté `main.js` : la rangée des régiments, le survol et la visée.

### Jeu à deux sur le même réseau

**Statut** : en cours — livré et connecté (v0.34.1 : code court de 6 signes), joué entre deux Mac en Chrome ; Firefox ne se connecte pas

Un joueur par armée (le bleu invite et joue nous, le kaki rejoint et joue en face), chacun sur son ordinateur, sans serveur : le **lockstep** (`js/reseau/lockstep.js` :
les deux machines calculent la même bataille, on n'échange que les ordres) sur un canal WebRTC (`js/reseau/lien.js`) appairé par un code de 6 signes qui passe par le relais public ntfy.sh (`js/reseau/relais.js`, v0.34.1), ou à la main (une invitation, une réponse), avec un STUN pour les adresses (v0.33.1).

- [x] Le test de déterminisme (`js/determinisme.js`, `outils/determinisme.mjs`, `determinisme.html`) : Node 22 et Chromium donnent le même état ; `Math.sin`, `Math.cos` et `x ** 1,5` diffèrent déjà au dernier bit entre les deux (hypot, sqrt : identiques)
- [x] Un second commandant : `planMarche` / `ordonnerMarche` / `peutOrdonner` / `ordonnerBarrage` / `peutBarrage` prennent un camp, `etat.deux` fait taire l'IA d'en face, ses batteries (`etat.batteriesEux`) rechargent comme les nôtres ; l'interface sait quel camp elle joue (`MOI` de main.js : cartes, carte tournée, pertes, nuit, couleurs)
- [x] Une horloge partagée : pause (Espace, le menu), ×2 / ×4 : des ordres du lockstep, appliqués au même cadre chez les deux
- [x] La nuit à deux : chacun ses corvées, l'aube part quand les deux sont prêts (`corvee`, `pret`)
- [x] Mission et fin : l'objectif du kaki est l'inverse de celui du bleu ; la fin dit qui l'emporte (`juger` reste du point de vue du bleu)
- [x] Un test de bout en bout : `outils/deux.mjs` (deux pages s'appairent, jouent, aucune désynchronisation) ; `test/lockstep.test.mjs` (réseau factice qui retarde)
- [x] Deux vrais Mac sur le même Wi-Fi : Chrome se connecte (STUN v0.33.1, code court v0.34.1) ; l'écran d'échec conseille Chrome (v0.34.3)
- [ ] **Firefox ne se connecte pas** (`failed`, cause non trouvée) : pister la permission « Réseau local » de macOS, les adresses `.local` de Firefox, `media.peerconnection.ice.obfuscate_host_addresses`
- [ ] **Lancer `determinisme.html` dans Firefox** (pas dans le conteneur) et jouer une partie Chrome contre Firefox une fois la connexion possible ; si `sin`, `cos` ou `** 1,5` y divergent : les remplacer dans la logique (army.js, terrain.js, tranchees.js) par des opérations exactes
- [ ] Pas testé : Windows, un réseau avec isolation des clients, un réseau lent (le délai de 6 cadres tient jusqu'à ~150 ms d'aller-retour)
- [ ] À mesurer : l'équilibre à deux (attaquant et défenseur humains, skill `equilibrage`), la durée d'une partie
- [ ] Reconnexion (aujourd'hui, une coupure ramène à l'écran titre) ; une partie à deux qui se sauvegarde ; les réglages de l'atelier doivent être les mêmes (sinon refus à l'appairage)
- [ ] À trancher dans `DESIGN.md` : brouillard de guerre ou carte ouverte (carte ouverte aujourd'hui)
- Plus tard : le tour à tour sur le même écran (sans réseau)

### Lot minimal : la tranche verticale du terrain

**Statut** : à mesurer (v0.1.0) — attend la décision de Jérôme pour la v1.0.0

- [x] Champ de 400 × 300 cases depuis une graine, bosses, arbres
- [x] 2 000 soldats en deux camps (`army.js`), ordres de marche, tir
- [x] Obus et cratères (75, 155, 220), dureté, plancher, lèvre
- [x] Pluie, boue et eau sur trois jours ; la boue ralentit
- [x] Compteur de pertes
- [x] Critère : simulation sous 8 ms à 8 000 soldats ; rendu sous 8 ms côté jeu
  (comme `pierreStats()`). En attendant la fin du dessin (rendu logiciel), le zoom
  1 tient 7 ms, les zooms 4 et 8 de 8 à 16 ms sur un champ labouré : à trancher
- [x] Lisibilité : cratère, boue, eau, soldat distinguables en gris

## À l'étude (validé dans le principe par le prompt de départ, pas construit)

- **Le pas de fin de journée** (v0.34.4 : les saccades en pleine bataille sont réglées) : il reste un pas de 300 à 500 ms quand l'écran passe à la nuit
  (les douze heures d'eau, `hydroLignes`, sur 537 000 cases d'un coup) ; l'étaler demande de découper en rangées dans le même ordre, avec la
  progression dans l'état et dans `etapesRejouer`. Et un pas de 100 ms quand huit régiments partent vers huit buts différents.
- **Équilibre des obus** (v0.34.5 : le 155 et le 220 plus meurtriers que le 75) : à mesurer sur une bataille entière avant de toucher à `precision` ou à `rapport`.
- **Ralentir plutôt que jeter** (v0.32.3) : le jeu ne ralentit personne dans l'anneau du souffle ; à décider d'après les variantes B à D du sujet « Projections » du labo.

- **Carte et ordres, la suite** (v0.14.0 et 0.15.0 : secteurs, carte, mêlée) : un ordre « tenir S3·N2 » depuis la carte (reculer d'une
  ligne), des ordres par secteur voisin, la mêlée dessinée sur le terrain (le nombre d'attaquants au-dessus du tronçon).

- **Tranchées, la suite** (v0.18.0 : traverses, sacs, fil de fer, abris dessinés) : 3 lignes en secteur calme, 5 en secteur fortifié ;
  les ouvrages au labo (variantes) ; le fil de fer qu'on coupe à la pince la nuit.
- **La nuit, la suite** (v0.11.0 : abris, vivres, tombes ; v0.38.3 : le coup de main et ses prisonniers sont retirés, voir
  `docs/archives/corvees-retirees.md`) : l'ambiance de la nuit (à cadrer).
- **Moral et expérience, la suite** (v0.11.0 : contagion, refus d'un jour,
  poursuite) : la fuite feinte jouée par le joueur (un régiment qui recule exprès
  pour disperser le poursuivant), l'expérience gardée d'une bataille à l'autre
  (le Mémorial).
- **Évacuer les blessés, la suite** (v0.18.0 : ils reviennent, une fois sur deux) : de jour, sous le feu ; la boue qui ralentit les brancardiers.
- **Lignes de vue** (une crête cache), mêlées de tranchées rares.
- **Hors de vue, les soldats comptés** au lieu d'être simulés un par un.
- **Champs de coûts recalculés par morceaux** quand le terrain change (aujourd'hui :
  le résumé du terrain est refait en entier toutes les 3 s, par bandes).
- **Mines** de 1916-17 : un événement rare, −10 m, un champ à part (voir aussi les gaz, « Pistes avancées »).
- **Méta** : le Mémorial, la campagne, l'état-major (doctrines), les trophées déclaratifs (voir « Pistes avancées » : Mémorial et campagne sont développés).
- **D'autres secteurs et d'autres missions** (un seul secteur, deux missions en v0.9.0).
- **Son**, police d'identité auto-hébergée.
- **Soldats en sprites** (poses, atelier de dessin) : essayés en v0.1.1, non retenus pour l'instant (`docs/archives/`).

## Pistes avancées (brainstorming v0.35.0)

**Statut** : à l'étude — rien n'est construit, rien n'est tranché. Inspirations : Total War (stances, moral de position, campagne), *Hearts of Iron*
et *Order of Battle* (planification, transmissions), *Close Combat* (brouillard, moral). Chaque piste respecte `DESIGN.md` : pas de gloire, pas
de gore, pas de couleur hors palette. Le nombre d'hommes qu'un soldat a abattus se lit sur sa fiche et peut donner des marques (Jérôme, v0.35.0) : un fait, pas un score de jeu.

**Barème** : 1 *session* = un lot livrable seul (logique + tests + mesure + `CLAUDE.md` + version), comme les lots de la refonte UX/UI. Les chiffres
sont des ordres de grandeur d'avant lecture fine du code, à réviser au cadrage.

**Ordre conseillé** : 1. Stances → 2. Plan de nuit → 3. Mémorial (registre) → 4. Campagne → 5. Gaz. Les stances sont petites et affinent l'équilibre ;
le plan de nuit change le rythme sans nouvelle donnée persistante ; le Mémorial (registre seul) prépare la campagne ; la campagne porte la
méta ; les gaz sont la plus grosse prise de risque (ton, rendu, nuit) et demandent d'abord d'étaler l'eau de la nuit (voir « À l'étude »).

### Dettes communes à anticiper (valent pour les cinq pistes)

- **`main.js` fait 1 188 lignes** (le `CLAUDE.md` en annonce encore 867) : stances, plan, Mémorial y ajouteraient du HUD. Sortir d'abord la rangée des
  régiments (`majRegiments`, `placerFenetre`), le survol et la visée vers `js/hud/`, et mettre le `CLAUDE.md` à jour.
- **Sauvegarde** (Jérôme : « on peut changer les sauvegardes, pas de parties en cours ») : les parties d'avant **peuvent casser**. Plus de `??=` ni de test « une partie d'avant se relit » pour une piste neuve : on ajoute le champ à l'état
  et on monte `VERSION` (bataille.js:31) quand le format change. Ce qui reste exigé : une partie sauvegardée puis relue **dans la même version** est la même partie (tests « relue au milieu »). Un état hors bataille (campagne, Mémorial) a sa **propre clé**
  `cyclopeen:…`, versionnée par `js/lib/save.js`, avec export / import JSON (jamais le jeton) et une autre clé en mode debug ; ses migrations ne sont pas nécessaires tant que rien n'est public. Dette à part : les `??=` d'`etapesRestaurer` pour les parties d'avant la v0.35.0 peuvent être retirés.
- **Jeu à deux** : toute action neuve est une commande de `executerCmd` (main.js:297), toute donnée neuve entre dans `empreinteEtat`, et `outils/deux.mjs`
  + `test/lockstep.test.mjs` s'étendent avec elle. Les réglages sont comparés à l'appairage (`empreinte des réglages`) : un nombre neuf dans `reglages.js`
  oblige les deux machines à la même version.
- **Déterminisme** : pas de `Math.sin`, `Math.cos`, `** 1,5` dans la logique neuve (écart Node / Chromium au dernier bit, Firefox non testé) ; **ne pas déplacer l'ordre
  des tirages** (météo puis positions de départ) : un hasard neuf vient d'un hachage graine-jour-numéro (comme `retours` de nuit.js) ou d'une branche à part.
- **Filets de refonte** : `test/fumee.json` (HUD) et `test/rendu.json` (34 images) bougent dès qu'on touche au texte d'une carte ou au dessin. Ajouter l'image
  **avant** de coder, réécrire la référence sur l'ancien code, puis comparer (méthode du `CLAUDE.md`, « L'empreinte du dessin »).
- **Les nombres** vont dans `js/data/reglages.js` (atelier), **les textes** dans `js/data/*.js` avec clé stable, rien en dur dans la logique (conventions §12-13).
- **Les touches** : déjà prises, A E R F (vue), C, T, Espace, Échap, 1 2 3 (barrages), + − et les flèches. Toute commande clavier neuve se tranche au cadrage
  (conventions §8 : tout est possible au clavier et à la souris).

### Prompt de clôture commun (à coller à la fin de chaque lot)

```text
Clôture du lot : (1) `node --input-type=module --check < f.js` sur chaque module touché ; (2) `node outils/test-run.mjs` ; (3) `node outils/fumee.mjs` et
`node outils/rendu-empreinte.mjs` : si l'écart est voulu, dis pourquoi puis réécris la référence (`--ecrire`) ; (4) `node outils/deux.mjs` si une commande,
une règle ou un état partagé a changé ; (5) `node outils/captures.mjs` + `outils/audit-ecran.mjs` + `outils/lisibilite.mjs` si l'écran ou une couleur a changé,
et regarde les captures ; (6) version.json (correctif / mineur), CHANGELOG.md, `node outils/stamp-version.mjs` ; (7) mets à jour CLAUDE.md (le jeu actuel,
le piège rencontré avec son coût mesuré) et ROADMAP.md (coche le lot) ; (8) commit en français qui dit ce que le joueur verra, push sur main ; donne-moi
les deux URL. Les sauvegardes d'avant peuvent casser (monte VERSION si le format change) : pas besoin de me prévenir. Si une règle vaut pour tous les jeux : « Proposition pour CONVENTIONS.md ».
```

---

### 1. Les stances (feu à volonté, feu retenu, à couvert)

**Statut** : à l'étude. Inspiration : Total War (« tenir la position », « feu à volonté / retenu »). Aujourd'hui un régiment tire quand il a un ennemi dans son
cône et que la peur le permet (`tirer`, army.js:215) ; la carte du régiment note « pas encore d'action de tir par régiment ».

**Intention** : un contrôle fin du *comment* un régiment tient, sans micro-gestion : on choisit une posture, pas des tirs. Chaque posture a un prix, sinon elle est
dominée.

**Ancrage** : `tirer(A, i, o, ctx)` (portée `R.tir.portee`, cône, `precision`, `abri`, `mouvement`) ; la cadence `tirT` dans `pasArmee` ; l'ordre `reg.ordre`
(`fx`, `fy`, `trace`) ; `reg.refus` et `reg.vivres` comme modèle d'état par régiment ; `TAPI` (le dessin d'un homme tapi) ; `prises` / `R.tranchee.melee` pour le décompte
des défenseurs ; la fenêtre du rabat (`actionDe`, `majRegiments`) ; `enFace(B, rng)` pour l'IA.

**Postures proposées** (valeurs à mesurer, jamais à l'œil) :

| Id | Nom | Effet | Prix |
|---|---|---|---|
| `volonte` | À volonté | comme aujourd'hui | — |
| `retenu` | Feu retenu | n'ouvre le feu qu'à `retenu.portee` (≈ 35 m), précision ×1,5, fatigue des bras ÷2 | laisse l'assaut approcher ; ne harcèle plus |
| `couvert` | À couvert | ne tire pas, se tapit ; l'ennemi touche ×0,6 ; la peur retombe plus vite | compte pour moitié dans la défense d'un tronçon (la mêlée le prend) |
| `baionnette` *(plan C)* | Baïonnette | ne tire pas en marchant, pèse ×1,5 dans la mêlée | jambes plus lasses ; expose à découvert |

**Décisions à trancher au cadrage** (défaut en gras) : combien de postures (**2 : volonté / retenu**) ; l'IA d'en face s'en sert-elle (**oui, retenu sur ses tronçons défendus**) ;
touches (**boutons dans le rabat seulement, puis Maj+chiffre**) ; une posture survit-elle à un ordre de marche (**elle revient à `volonte` en marchant, `retenu` se reprend à l'arrivée**).

**Plan fin (lots)**

1. ✅ **Fait (cadrage v0.36.0, sans version : aucun effet visible).** *Logique* : `reglages.js` (`stance`), `data/stances.js` (id, nom, court, dit), `reg.stance` (`??= 'volonte'` à la relecture), filtre dans `tirer` (portée) et facteurs de précision / cadence ;
   ordre des tirages inchangé en `volonte` (test : une bataille sans stance donne les mêmes morts qu'avant, graines 3, 7, 8).
2. ✅ **Fait (v0.36.0).** *Commande* (`ordonnerStance` / `peutStance` existent déjà, lot 1) : refus à voix haute (déroute, nuit) ; commande `stance` de `executerCmd` ; `empreinteEtat` ; test lockstep.
3. ✅ **Fait (v0.36.1).** *HUD* : boutons dans le rabat, mot de la posture dans `actionDe` et sous le nom de la carte, ligne du carnet ; `test/fumee.json` réécrit ; grisé et raison au clic.
4. ✅ **Fait (v0.36.2, `retenu` seulement : `couvert` n'existe pas).** *Dessin* : `couvert` = hommes tapis (`TAPI`), `retenu` = fusil bas, pas d'éclair hors portée (le dessin seulement) ; image ajoutée à `test/rendu.json` avant.
5. ✅ **Fait (v0.36.3, sans version : rien de visible).** *IA et équilibre* : `ia.stance` (éteint, `postureIA`), mesure avec appui d'artillerie (`scripts/mesure-stances.mjs --appui 60 [--ia on|off]`, détail dans le `CLAUDE.md`). Jérôme : `retenu` garde 35 m et ×1,5 ; l'IA n'en use pas.

<details><summary>Plans de développement et coût</summary>

| Plan | Contenu | Coût | Risque |
|---|---|---|---|
| **A — Deux postures** | volonté / retenu, lots 1-3, sans IA | **2 sessions** | faible : une règle de portée |
| **B — Trois postures + IA** | + `couvert`, + lots 4-5 | **3-4 sessions** | moyen : l'équilibre de la défense (la mêlée compte la posture) |
| **C — Postures de mouvement** | + `baionnette`, allure (marche prudente / course : `ordre.allure`) | **5-6 sessions** | élevé : encourage l'assaut frontal déjà coûteux (v0.17.0) |

Recommandé : A, mesurer, puis B.
</details>

**Cadrage (Jérôme)** : deux postures (volonté / retenu) ; l'IA d'en face n'en use pas avant le lot 5 ; boutons du rabat + Maj+chiffre (touche physique, Maj+1 volonté, Maj+2 retenu) ; un ordre de marche remet à volonté, sans mémoire.
**Mesure du lot 1** (détail dans le `CLAUDE.md`, « Les postures, mesurées ») : `retenu` à 35 m / ×1,5 est neutre pour les morts de l'attaquant et coûte +28 % de morts au défenseur ; à 49 m ou à ×2,5 il domine. Le point d'équilibre reste à régler (session « Équilibre des stances »), avec un scénario où l'assaut atteint la tranchée (le tir seul ne l'y mène jamais en 300 s). `fatB` n'a aucun effet sur le tir : pas de prix par la fatigue.

**Dettes anticipées** : touches (voir plus haut) ; sans munitions, `retenu` n'a pas de vrai coût (le prix est la portée et la cadence : à mesurer, et à relier aux vivres si on ajoute des
cartouches un jour) ; `couvert` change `prises` (la mêlée) : test « la mêlée » à étendre ; l'IA ne doit pas devenir invulnérable en `couvert` ; deux : la posture est une commande.

<details><summary>Prompts</summary>

```text
Cadrage « stances ». Lis ROADMAP.md §1, CLAUDE.md (tirer, moral, mêlée, deux), DESIGN.md. Avant tout code, pose-moi UNE AskUserQuestion (4 questions max, option
recommandée en premier) : nombre de postures, rôle de l'IA, commandes (boutons / touches), effet d'un ordre de marche sur la posture. Puis écris le plan du lot 1 avec les
fichiers touchés, les tests à écrire (dont « sans stance, mêmes morts qu'avant » sur les graines 3, 7, 8) et les dettes que tu vois. N'écris pas de code avant ma réponse.
```

```text
Lot 1 « stances » (logique). Applique le plan validé. reg.stance dans l'état (VERSION montée) ; paramètres dans reglages.js ; textes dans data/stances.js ; aucun Math.random,
aucun tirage déplacé. Écris les tests (portée, précision, sauvegarde relue, lockstep) AVANT le code qui les fait passer. Mesure avec scripts/mesure.mjs sur les graines 3, 7, 8
et donne un tableau morts / blessés / durée par posture. Puis le prompt de clôture commun.
```

```text
Équilibre des stances. Rejoue 3 graines × (volonté, retenu, couvert) × (attaque, défense), 9 000 pas, et dis laquelle domine. Si l'une domine, propose DEUX réglages
(nombres + effet attendu), mesure-les, ne change rien sans mon accord (AskUserQuestion).
```
</details>

---

### 2. Le plan de nuit (ordres différés)

**Statut** : à l'étude. Inspiration : la planification de *Hearts of Iron*, les ordres de bataille de Total War.

**Intention** : la nuit, on prépare le jour : « à 6 h, barrage de 155 sur B2 ; à 6 h 20, B1 attaque ». Le jour exécute, la pause active corrige. Le plan ne voit pas l'avenir :
l'ennemi bouge, la pluie tombe, la batterie recharge.

**Ancrage** : le papier de la nuit (`#nuit`, `nuitEtat` : `choix` puis `aube`) ; `ordonnerMarche` / `peutOrdonner` / `planMarche` et `ordonnerBarrage` / `peutBarrage`
(bataille.js:249-300 ; **`peutBarrage` refuse la nuit**, à ouvrir pour un ordre planifié) ; `avancer` et `etat.tickJour`, `ticksParJour(R)`, `horloge` ; la prévision météo (`etat.previsions`, juste 7 fois sur 10) ;
`noter` / le carnet de bord ; la barre du temps (`hud/temps.js`) et la frise de `js/lib/labo-timeline.js` ; `executerCmd` ; l'état `etat.batteries` (instant de fin de recharge, `etat.temps`).

**Modèle** : `etat.plan = [{ id, t, camp, type: 'marche' | 'barrage', ids | cal, x, y, forme }]`, trié par `t` puis par `id` (l'hôte avant l'invité, comme le lockstep) ; chaque ordre est
validé à sec à la pose **et** revalidé à l'heure (le terrain, le moral, la recharge ont pu changer) ; un refus à l'heure est dit au carnet, jamais en silence (conventions §12).

**Décisions à trancher** (défaut en gras) : nombre d'ordres par régiment (**4**) ; un ordre manuel du jour annule-t-il les ordres planifiés de ce régiment (**non, bouton « Annuler le plan »**) ;
à deux, le plan de l'autre est-il visible (**oui, carte ouverte comme aujourd'hui ; un engagement par hachage puis révélation à l'aube est la suite**) ; planifier les corvées de la nuit suivante (**non**).

**Plan fin (lots)**

1. *Modèle et exécution* : `etat.plan` (dans l'état neuf), `poserPlan` / `retirerPlan` (refus à voix haute), exécution dans `avancer` au pas `t` via les mêmes `ordonner…` (donc mêmes règles, même lockstep), purge à la fin du jour ;
   `peutBarrage(…, { planifie: true })`. Tests : plan relu, plan exécuté au bon pas, ordre refusé à l'heure, déterminisme à deux.
2. *Commande* : `plan` dans `executerCmd`, `empreinteEtat`, `pret` attend les plans des deux ; `outils/deux.mjs` joue une nuit avec plan.
3. *HUD simple* : liste dans le papier de la nuit (« 6 h 20 · Viride · attaque B1 en face »), heure choisie par pas de 10 min, suppression ; module `js/hud/plan.js` (pas dans main.js).
4. *Frise et visée fantôme* : les ordres sur la frise du jour (réutilise `labo-timeline.js`), la visée de la nuit montre l'emprise de l'ordre planifié (`rendu.surligner`), le clignotement à l'exécution ; sujet « Le plan de nuit » au labo (variantes liste / frise / carte).
5. *Carnet et lecture* : « 6 h 20 : Viride part à l'attaque de B1 en face », « le barrage de 6 h n'a pas pu partir : la batterie recharge » ; fiche du jour dans le bilan du soir (ce qui a été joué du plan).
6. *Suite (plan C)* : déclencheurs (« si un tronçon est perdu », « à la première pluie »), délai de transmission.

<details><summary>Plans de développement et coût</summary>

| Plan | Contenu | Coût | Risque |
|---|---|---|---|
| **A — Le minuteur** | lots 1-3 : ordres de marche et de barrage à heure fixe, liste textuelle | **3-4 sessions** | faible : tout passe par les ordres existants |
| **B — Sur la frise** | + lots 4-5, + gestion à deux (engagement / révélation à l'aube) | **6-8 sessions** | moyen : UI de la frise, tension de design |
| **C — Plan conditionnel** | + déclencheurs, + transmissions (coureur, fil coupé) | **10-14 sessions** | élevé : lié au brouillard de guerre, jamais tranché |

Recommandé : A, jouer deux batailles, puis B.
</details>

**Dettes anticipées** : **tension de design** — « la bataille est un terrain qui se transforme » : un plan trop riche rend le jour spectateur ; plafonner les ordres et garder la pause active comme moment fort ;
`etat.temps` la nuit (la recharge des batteries compte-t-elle la nuit ? **à vérifier avant le lot 1**) ; `nuitEtat` vit dans main.js (extraire avant d'ajouter) ; `test/fumee.json` à réécrire ; clavier (liste navigable) ;
une partie relue au matin avec un plan en cours (test « relue au milieu du plan ») ; l'IA d'en face n'a pas de plan (son `enFace` reste réactif).

<details><summary>Prompts</summary>

```text
Cadrage « plan de nuit ». Lis ROADMAP.md §2, CLAUDE.md (la nuit sur le champ, nuitEtat, ordres, deux), bataille.js (peutBarrage, avancer, aube). Vérifie D'ABORD si etat.temps
avance la nuit (recharge des batteries) et dis-moi ce que ça change. Puis UNE AskUserQuestion (4 questions max, recommandé en premier) : ordres par régiment, ordre manuel vs plan,
visibilité à deux, types d'ordres du lot 1. Sors le plan du lot 1 avec fichiers, tests, dettes. Pas de code avant ma réponse.
```

```text
Lot 1 « plan de nuit ». etat.plan dans l'état neuf (VERSION montée), exécution dans avancer par les mêmes ordonnerMarche / ordonnerBarrage (aucune règle dupliquée), refus à l'heure dits au carnet.
Tests d'abord : relu au milieu, exécuté au bon pas, refusé à l'heure (batterie, déroute, hors secteur), déterminisme (outils/deux.mjs avec un plan). Ne touche pas à l'ordre des
tirages. Puis le prompt de clôture commun.
```

```text
Lot « plan de nuit » : interface. Crée js/hud/plan.js (fabrique creerPlan({ $, bataille: () => B, … }), état propre, jamais B lui-même), pas de code dans main.js sauf le branchement.
Montre-moi 3 variantes au labo (liste, frise, carte) avec depuis: 'X.Y.Z' et une entrée de labo-journal.js avant d'en brancher une. Tout au clavier ET à la souris.
```
</details>

---

### 3. Le Mémorial

**Statut** : à l'étude (« À VALIDER » dans `DESIGN.md`). Inspiration : *Darkest Dungeon* (le cimetière), mais sobre : la danse macabre, pas le trophée.

**Intention** : chaque homme tombé garde son nom. Après la bataille, un lieu où on les relit. Aucune récompense : pas de classement, pas de totaux mis en avant.

**Ancrage** : `etat.corps` (`[x×10, y×10, camp, jour, id]`, sauvegardé) ; `mourir(B, i, cause, ou)` ; `identite.js` (nom, âge, grade **tirés de la graine et du numéro**) ; `A.victimes` ; `etat.evacues` ;
`juger` / `etat.issue` ; l'écran titre et son décor (`decor`, `cameraLibre`, `fumer`) ; la fiche (`hud/fiche.js`) ; `nomTroncon` ; `js/lib/save.js`.

**Point dur** : l'identité dépend de la graine de la bataille. Le Mémorial **stocke des chaînes** (nom, âge, grade, régiment, jour, lieu, cause), jamais un numéro à re-dériver.

**Décisions à trancher** (défaut en gras) : les morts des deux camps (**oui, deux listes, mêmes caractères**) ; les victimes d'un homme sur sa ligne (**non : seulement sur la fiche, v0.35.0**) ; des totaux (**aucun en tête ; le détail seul**) ;
un bouton sur l'écran titre (**oui, discret, sous Continuer / Nouvelle partie ; conventions §3**) ; les blessés évacués qui ne reviennent jamais (**« disparus du front »**).

**Plan fin (lots)**

1. *Collecte* : module pur `js/memorial.js` (`recueillir(B)` : des enregistrements compacts `[nom, âge, grade, régiment, camp, jour, cause, lieu]`), écrit en fin de bataille dans `cyclopeen:memorial` (versionné, `save.js`),
   idempotent (clé = graine + date), plafonné et compact (quota de `localStorage`) ; export / import ; clé autre en mode debug. Tests : même bataille, même registre ; relue au milieu, même registre.
2. *L'écran* : un papier (`.papier`) par bataille puis par régiment, noms en liste, recherche au clavier, flèches, Échap ; épitaphes sobres (`data/epitaphes.js` : « tombé le 3ᵉ jour, tronçon 2 de B1, d'un obus ») ; aucun chiffre en gras.
3. *Dans le monde* : le décor de l'écran titre devient un champ de croix à l'heure arrêtée ; survol d'une croix = le nom (la capsule de `hommeSous`) ; plafond de croix dessinées (rendu logiciel) ; image ajoutée à `test/rendu.json` avant.
4. *Régiments dissous et survivants* : « le Viride n'est plus », « 12 hommes ont survécu à trois batailles » (nécessite la campagne).

<details><summary>Plans de développement et coût</summary>

| Plan | Contenu | Coût | Risque |
|---|---|---|---|
| **A — Le registre** | lots 1-2 | **2 sessions** | faible |
| **B — Le champ de croix** | + lot 3, réutilise le décor du titre | **4-5 sessions** | moyen : budget de rendu, ton |
| **C — Mémorial de campagne** | + lot 4, épitaphes par bataille, régiments dissous | **7+ sessions** (après la campagne) | moyen : dépend de l'identité portable (piste 4) |
</details>

**Dettes anticipées** : quota `localStorage` (≈ 1 500 morts × 20 batailles : compact ou IndexedDB) ; écran titre (conventions §3 : l'ordre Continuer / Nouvelle partie / roue ne bouge pas) ; une fin de bataille quittée avant le bilan
(écrire à la mort de la dernière journée, pas seulement à l'écran de fin ?) ; deux : le registre est celui de chaque machine ; textes en français seulement mais en données ; `DESIGN.md` : retirer « À VALIDER » une fois livré.

<details><summary>Prompts</summary>

```text
Cadrage « Mémorial ». Lis ROADMAP.md §3, DESIGN.md (« Ce que le jeu refuse », l'entre-deux-parties), identite.js, mourir, juger. Une AskUserQuestion (4 questions max, recommandé en premier) :
deux camps ou un, ce qu'une ligne montre (jamais un compteur récompense), place sur l'écran titre, sort des évacués. Puis le plan du lot 1 : format compact d'un enregistrement, estimation
de taille pour 20 batailles, tests, et comment tu t'assures qu'on ne re-dérive jamais une identité depuis une autre graine.
```

```text
Lot 1 « Mémorial » (collecte). js/memorial.js pur et testé dans Node, clé cyclopeen:memorial via js/lib/save.js (version, migration vide), idempotent, plafonné. Écris le test « même bataille,
même registre » et « relue au milieu » avant le code. Rien dans l'état de bataille. Puis le prompt de clôture commun.
```

```text
Lot « Mémorial » : l'écran. Un papier sobre, au clavier et à la souris, sans gras sur les nombres, épitaphes dans data/epitaphes.js. Montre-moi DEUX variantes au labo (liste par régiment / par jour)
avant de brancher. Vérifie lisibilité (outils/lisibilite.mjs) et audit-ecran. Aucune couleur hors palette.
```
</details>

---

### 4. La campagne

**Statut** : à l'étude. Inspiration : la campagne de Total War, réduite à ce que ce jeu sait faire : relier des batailles par des hommes nommés.

**Intention** : ce qu'on fait dans une bataille pèse dans la suivante : les régiments décimés, les vétérans, les gradés promus. Le Mémorial en est la mémoire. Pas de victoire claironnée : « le secteur suivant ».

**Ancrage** : `etat.mission` / `juger` / `etat.issue` ; `etat.reserves` et la relève ; `etat.grades`, `A.exp`, `A.victimes`, `etat.evacues` (retours) ; `nouvelleBataille` (options, ordre des tirages) ; `data/secteur.js` (trois secteurs) ;
`data/lexique.js` (noms de régiments) ; `identite.js` ; l'écran titre (`demanderSecteur`) ; `js/lib/save.js`.

**Point dur** : l'identité d'un homme (nom, âge) vient de `graine` + numéro. Une campagne a donc deux graines : une **`graineIdentite`** stable pour toute la campagne (les noms ne changent pas d'une bataille à l'autre) et la graine de chaque bataille
(terrain, météo). Hors campagne, `graineIdentite = graine`.

**Décisions** (Jérôme, cadrage v0.36.3) : longueur **3 batailles** ; ce qui passe **effectifs, expérience, grades, victimes** (pas la fatigue, la peur ni le moral) ; renforts **recrues sans expérience** ; défaite **repli : la campagne continue, finit sous quatre régiments** ; à deux **non, la campagne est solo** ; secteur **un seul au début, puis choisi**.

**Difficulté croissante** (Jérôme : « la première bataille nous sommes en surnombre, avec l'avantage du terrain, puis ça évolue ») — ordre proposé, à mesurer avec `scripts/trois-jours.mjs` étendu avant de figer les nombres :

| | Secteur | Mission | Rapport de forces | Terrain | IA d'en face |
|---|---|---|---|---|---|
| 1 | Les labours (`essai`) | tenir | nous en surnombre (~1,3 contre 1) | plat, à notre avantage | `offensive` basse |
| 2 | La crête (`crete`) | prendre | parité | ils tiennent la crête (7 m) | `offensive` normale |
| 3 | Le marais (`marais`) | tenir | eux en surnombre (~1,3 contre 1) | boue, quatre jours de pluie au moins | `offensive` et `barrage` hauts |

Dépendance : `parCamp` est une valeur unique pour les deux camps (`nouvelleBataille`) ; le surnombre demande un effectif par camp (capacité de l'armée, sauvegarde, `empreinteEtat`). Les recrues sans expérience s'ajoutent à la montée de l'adversaire ; on peut permuter 2 et 3 si la mesure le montre (le marais freine aussi l'attaquant).

**Plan fin (lots)**

1. ~~*Identité portable*~~ **livré** (`etat.graineIdentite`, `VERSION` 2, `test/campagne.test.mjs`) : elle ne sert qu'aux noms de NOS hommes (`quiEst`) ; en face, la graine de bataille. Reste pour le lot 3 : `quiEst`, `premierDe` et `relever` additionnent les `initial` des régiments (numéros contigus) ; des vétérans qui gardent leurs numéros demandent un `reg.premier` ou un compteur de campagne.
2. ~~*Registre de campagne*~~ **livré** (`js/campagne.js` : `nouvelleCampagne`, `suivante`, `cloturer`, `cloturerDansLeStore` ; `js/data/campagne.js` ; clé `cyclopeen:campagne` ; écrit dans `montrerFin` avant l'écran de fin, idempotent). **Pas encore atteignable en jeu** : rien ne démarre une campagne avant le lot 7 (écran titre) ; `etat.campagne` ({ id, n }) est posé par `nouvelleBataille(…, { campagne })`. Restent : les batailles 2 et 3 reprennent les survivants du registre (lot 3), le surnombre par camp, la mesure d'attrition.
3. ~~*Reconstituer*~~ **livré** (`nouvelleBataille(…, { troupes, soldatsEux, iaRythme })`, `reconstituer`, `etat.numeros`) : les vétérans prennent les premières places de leur régiment, complétés par des recrues ; expérience et victimes relues, hiérarchie par les places (pas de `etat.grades`) ; effectif par camp et rythme de l'IA pour la difficulté croissante. Test : 750 hommes, mêmes numéros, mêmes noms. **Reste** : régler les nombres de `data/campagne.js` d'après `scripts/mesure-campagne.mjs`.
4. ~~*Entre deux batailles*~~ **livré** : `passage` (régiments, vétérans et recrues, blessés de retour, fusions ; « voir et valider », Jérôme), quatre variantes au labo dont A branchée au lot 5. **Reste** : le carnet de campagne (quatre lignes, comme celui de bataille), les noms des dissous au Mémorial.
5. ~~*Le secteur suivant*~~ **livré** (v0.36.4) : l'ordre des secteurs est fixe (pas de choix, Jérôme) ; la mission suit l'issue (réussie → prendre, manquée → tenir) ; le papier de campagne « Le registre » (variante A du labo) est branché à la fin de chaque bataille de campagne, Entrée pour partir ; `outils/campagne.mjs` le joue dans le navigateur. Atteignable par le mode debug seulement (`__jeu.campagne`) jusqu'au lot 7.
6. ~~*Fin de campagne*~~ **livré** (v0.36.5) : un papier sobre (une ligne par bataille, deux listes de noms repliées, « Écran titre »), `bilan(c)` donne les noms comme des chaînes pour le Mémorial. **Reste** : le Mémorial lui-même (§3), qui les reprendra ; le grade d'un tombé n'est pas gardé.
7. ~~*Écran titre et menus*~~ **livré** (v0.36.6) : « Nouvelle campagne », « Continuer la campagne », confirmations, export / import (le registre est dans `store.exportAll`), clé autre en debug ; `outils/campagne-titre.mjs`.
8. *Suite (plan C)* : état-major (doctrines débloquées, chacune avec un coût), saisons, trophées déclaratifs sobres (`DESIGN.md`).

<details><summary>Plans de développement et coût</summary>

| Plan | Contenu | Coût | Risque |
|---|---|---|---|
| **A — La chaîne de trois** | lots 1, 2, 3, 6, 7 : trois batailles de suite, vétérans reportés, sans écran de réorganisation | **5-6 sessions** | moyen : l'identité portable, l'équilibre d'attrition |
| **B — Réorganiser et choisir** | + lots 4-5 : papier de campagne, fusion, choix du secteur | **9-11 sessions** | moyen : UI, durée d'une partie (3 × 60-90 min) |
| **C — État-major et saisons** | + lot 8, météo de saison, doctrines | **15+ sessions** | élevé : beaucoup de contenu, équilibre long |

Recommandé : A, car il prouve le principe (des hommes qui survivent à une bataille) avant d'y ajouter de l'interface.
</details>

**Dettes anticipées** : l'identité (ci-dessus) ; l'ordre des tirages de `nouvelleBataille` (les troupes se posent *après* les tirages d'avant) ; `numeroDe`, `etat.regiments` et les ids de régiment ; une bataille de 10 à 15 jours dure 1 h à 1 h 30 : la sauvegarde en cours existe, mais la
campagne doit survivre à un onglet fermé entre deux batailles ; mesure d'attrition (3 batailles jouées sans les mains, `scripts/trois-jours.mjs` étendu) ; les nuits du bilan de campagne (`etat.evacues` : tous ceux qui devaient revenir reviennent ?) ;
le Mémorial doit être là d'abord ou en même temps.

<details><summary>Prompts</summary>

```text
Cadrage « campagne ». Lis ROADMAP.md §4, CLAUDE.md (identite, nouvelleBataille, mission, réserves, retours, sauvegarde), DESIGN.md (entre deux parties). Montre-moi d'abord, en 10 lignes, où une
graineIdentite devrait passer et ce que ça casserait. Puis UNE AskUserQuestion (4 questions max, recommandé en premier) : longueur, ce qui passe d'une bataille à l'autre, renforts,
défaite. Plan du lot 1 avec tests. Pas de code avant ma réponse.
```

```text
Lot 1 « campagne » (identité portable). `graineIdentite` optionnelle dans nouvelleBataille, égale à `graine` par défaut ; identite.js la lit. Aucun tirage déplacé (les anciennes sauvegardes peuvent casser : VERSION montée).
Tests : deux batailles d'une même campagne donnent le même nom au même numéro. Puis le prompt de clôture commun.
```

```text
Lots 2-3 « campagne » (registre, reconstitution). js/campagne.js pur, testé dans Node, clé cyclopeen:campagne via js/lib/save.js, écrite AVANT l'écran de fin. Test de bout en bout : trois
batailles jouées sans les mains (scripts/trois-jours.mjs étendu), vétérans reportés, rapport d'attrition par régiment. Dis-moi si la partie est jouable (durée, effectifs) ; si non, AskUserQuestion
avec deux réglages mesurés.
```
</details>

---

### 5. Les gaz

**Statut** : à l'étude, **à valider sur le ton avant tout** (aucune mention dans `DESIGN.md`). Deux maquettes au labo depuis la v0.38.2 (« Les gaz » : un mur qui dérive, ou qui coule dans les creux ; sans règle, sans champ de 4 m, un nuage de maquette) : elles ne remplacent pas la maquette du dessin de la nappe demandée plus bas. Inspiration : la météo et le relief de *Total War* (vent, pluie), les nappes de *Company of Heroes*.

**Intention** : un ennemi qui ne se voit presque pas, qui obéit au terrain : il dérive avec le vent, descend dans les creux, stagne dans les tranchées, la pluie le lave. Le jeu y gagne un usage du relief et de la météo qu'il n'avait pas. Le joueur le **subit** d'abord ; l'employer
est une décision de ton séparée.

**Garde-fous proposés** : pas de description de blessure ; pas de gloire à gazer ; le carnet dit sobrement (« des obus qui font peu de bruit ») ; pas de compteur de gazés mis en avant.

**Ancrage** : `hydroLignes` (l'humidité qui glisse vers la case la plus basse : même idée, 4 m de maille comme les champs de coûts) ; `meteo.js` (**pas de vent aujourd'hui**) ; `calibres.js` et `NOMS_CALIBRES` (les impacts sauvegardés gardent l'**indice** du calibre : n'en ajouter qu'à la fin) ;
`effrayer`, `reposer`, `mourir` ; `enFace` ; `rendu/eclats.js` (`fumer`), `rendu/temps.js` (voile continu) ; `hud/carte.js` ; les corvées (`data/corvees.js`) ; `photo` / `restaurer` (les champs en b64, comme `coutsActuels`).

**Modèle** : `etat.gaz` = grille d'octets (≈ 210 × 160 cases de 4 m, ~34 ko), évoluée chaque seconde : advection selon `vent` en huit directions avec reste fractionnaire (**pas de trigonométrie**), glissement vers le bas, diffusion, lavage par la pluie et le vent fort. Sauvegardée en b64 (rien à rejouer, contrairement à l'eau),
dans `empreinteEtat`. `A.gaz[i]` : la dose d'un homme (sauvegardée avec la foule). Le vent d'un jour vient d'un hachage graine-jour (aucun tirage déplacé) ; la prévision le dit 7 fois sur 10 comme la météo. Les parties d'avant ne se relisent plus (`VERSION` montée).

**Décisions à trancher** (défaut en gras) : on le veut (**à décider avant tout**) ; qui l'emploie (**en face seulement d'abord**) ; effet (**peur, toux : tir ×, mort dans la nuit comme un blessé laissé, `mortBlesse`**) ; protection (**masques : un état par régiment, une corvée de nuit, un coût de cadence**) ; les abris profonds
(**piégeux : le gaz y descend**, plan C).

**Plan fin (lots)**

1. *Le vent* : `vent` (direction en huit, force 0-2) par jour, hachage graine-jour, affiché dans la barre du temps et dans la prévision (pictogramme dans `hud/meteo-icones.js`), sans effet encore. Tests : même vent à la relecture.
2. *Le champ* : `js/gaz.js` pur (advection, glissement, diffusion, dissipation), pas à pas fixe, b64 dans la sauvegarde, `empreinteEtat` ; test de déterminisme (Node / Chromium) et « relue au milieu d'un nuage ».
3. *Les hommes* : dose, peur, toux (cadence), mort dans la nuit ; `reg.masques` (0 à 1) qui divise la dose, au prix de la cadence ; corvée « Masques » de nuit, ordre « Masques » de jour ; `R.gaz` dans reglages.js.
4. *L'obus à gaz de l'ennemi* : un calibre ajouté **à la fin** de `NOMS_CALIBRES`, sans cratère (la branche `impact` saute) ; `enFace` le tire sur nos tronçons quand le vent est bon, seulement sous condition (**aucun tirage de plus quand il n'y en a pas**) ; carnet.
5. *Le dessin* : une nappe (texture de la grille, couleur `v` fondue, déclarée comme exception dans `CLAUDE.md` au même titre que le voile), sur la carte aussi ; sujet « Les gaz » au labo (nappe lisse / volutes en particules / cases) ; mesure en rendu logiciel, 8 000 soldats, tous zooms.
6. *Les réponses du joueur* : marcher vers les hauteurs (le champ de coûts peut éviter le gaz : option), aérer, évacuer la nuit, inhumer sous gaz = dangereux.
7. *Notre gaz* (plan B) : une batterie, le vent change (retour de nappe).

<details><summary>Plans de développement et coût</summary>

| Plan | Contenu | Coût | Risque |
|---|---|---|---|
| **A — La menace** | lots 1-5 (en face seulement) | **6-8 sessions** | moyen-élevé : rendu, nuit, ton |
| **B — Les deux camps** | + lot 7, IA, équilibre | **10-12 sessions** | élevé : retour de nappe, éthique du jeu |
| **C — Gaz et terrain** | + lot 6, abris piégeux, champ de coûts évitant le gaz, mines | **14+ sessions** | élevé : interaction avec tout le moteur |

Recommandé : **ne rien commencer** avant (a) ma décision de ton, (b) l'eau de la nuit étalée (« À l'étude »), (c) la mesure de rendu d'une nappe au labo (variantes seules, sans règle).
</details>

**Dettes anticipées** : l'évolution de la nuit en lot (le pas de 300 à 500 ms de fin de journée existe déjà ; un champ de 34 000 cases coûte peu, mais l'ordre « eau puis gaz » se rejoue) ; `NOMS_CALIBRES` (ajout à la fin seulement) ; `Math.sin` / `cos` interdits (l'advection en huit directions ne s'en sert pas) ;
`hauteurQ` rejoue le relief, pas le gaz (sauvegardé) ; `enFace` : le hasard conditionné ; `test/rendu.json` : image ajoutée avant ; palette : aucune couleur nouvelle (`v` fondu) ; la quantité de texte du carnet reste de quatre lignes.

<details><summary>Prompts</summary>

```text
Cadrage « gaz ». Lis ROADMAP.md §5, DESIGN.md (« Ce que le jeu refuse »), CLAUDE.md (météo, nuit, calibres, hydroLignes, rendu/temps.js). AVANT tout le reste, AskUserQuestion (4 questions max, recommandé en premier) sur le ton :
le gaz est-il dans le jeu, qui l'emploie, comment il est dit au joueur, ce qui est montré. Si je réponds « non » ou « plus tard », arrête-toi et écris-le dans ROADMAP.md (idée écartée → docs/archives/ avec la raison).
Sinon, plan du lot 1 (vent) avec fichiers, tests et dettes.
```

```text
Maquette « gaz » au labo, sans règle. Sujet « Les gaz » : trois variantes de dessin d'une nappe sur un secteur après trois jours d'obus (lisse, volutes, cases). Utilise le moteur du jeu (mêmes modules), un champ de test qui dérive et descend dans les creux, aucune
couleur hors palette. Donne le coût mesuré (rendu logiciel, 8 000 soldats, zooms 1, 4, 8, dessin attendu : ?mesure=1) et ajoute l'entrée de labo-journal.js. Je choisis la variante avant tout lot de règle.
```

```text
Lot 2 « gaz » (le champ). js/gaz.js pur, sans trigonométrie, advection en huit directions avec reste, glissement vers le bas par hauteurQ, dissipation par la pluie / le vent ; b64 dans photo / restaurer ; empreinteEtat.
Tests d'abord : déterminisme (Node contre Chromium via outils/determinisme.mjs), relu au milieu d'un nuage, conservation de la masse à la dissipation près. Puis le prompt de clôture commun.
```
</details>

---

---

### 6. Les marques d'un homme (mentions du livret, sur la fiche)

**Statut** : à l'étude. Idée de Jérôme : des médailles / hauts faits / statuts que chaque soldat gagne, en icône sur la fiche, le texte au survol.

**Intention** : donner un poids à chaque homme nommé (ce qu'il a subi, fait, été), sans gloire. `DESIGN.md` refuse « les médailles qui brillent » :
ce sont donc des **mentions d'un livret militaire**, à l'encre sur papier. Même esprit que les chevrons d'expérience (v0.35.0 : « sans emplacement vide ») et que le compteur de victimes de la fiche (« ne donne ni expérience ni avantage »).

**Garde-fous** : aucun effet de jeu par défaut ; pas d'emplacement vide, pas de « 12/31 », pas de fanfare (le carnet de bord n'en dit que les plus rares) ; des marques ambiguës exprès (« A tremblé », « Du jour refusé »).

**Ancrage** : `hud/fiche.js` et `hud/lecture.js` (`auFront`, `prochainGrade`), `hud/barres.js` ; `A.exp`, `A.victimes` (nombre d'hommes abattus au fusil, déjà sauvegardé, familles « Le fusil »), `etat.grades`, `etat.evacues` (retours), `etat.corps`, `etat.tombes`, `etat.nuits`, `reg.refus` ;
`effrayer`, `tuerDans`, `prises`, `mourir` pour les événements ; `photoArmee` / `restaurerArmee` ; sprites en matrices de lettres (`js/lib/sprites.js`, conventions §12) ; le carnet (`noter`).

**Le catalogue (35 marques, 6 familles)** — **L** : se lit de l'état existant ; **C** : demande un événement compté (`A.marques`, bits, sauvegardé). Sources à vérifier au cadrage.

| # | Famille (cadre) | Nom | Icône | Condition | Src |
|---|---|---|---|---|---|
| 1 | Marques (rond) | Baptisé du feu | flamme basse | survit à son premier obus à moins de 10 m | C |
| 2 | | Secoué par le souffle | trait courbe qui rejette | projeté par un obus, remis debout | C |
| 3 | | Déterré | pelle dans un monticule | dans un abri crevé par un 220, sorti vivant | C |
| 4 | | Marqué au bras | bras barré | blessé au bras, revenu | L |
| 5 | | Marqué à la jambe | jambe barrée | idem à la jambe | L |
| 6 | | Marqué à la tête | casque fendu | idem à la tête | L |
| 7 | | Deux fois revenu | deux flèches de retour | évacué et revenu deux fois | L |
| 8 | | A regagné l'arrière à pied | un pas vers le bas | blessé léger, arrivé en marchant (v0.35.0) | C |
| 9 | Le temps (rond, un trait) | Du premier jour | trait vertical | au front depuis le jour 1 | L |
| 10 | | Cinq jours de suite | cinq crans | cinq jours au front sans relève ni repos | L (à vérifier) |
| 11 | | Sous trois pluies | trois gouttes | trois jours de pluie au front | L |
| 12 | | Nuit de gel | cristal | une nuit de gel en tranchée | L |
| 13 | | Au dernier jour | aube | debout à la fin de la bataille | C |
| 14 | Services (carré) | Pelle et pioche | pelle | trois nuits de corvée de travaux | L (corvée du régiment) |
| 15 | | Brancardier | brancard | une nuit d'évacuation | L (idem) |
| 16 | | Porteur de terre | croix et pelle | a inhumé les morts de sa tranchée | L (idem) |
| 17 | | La soupe par les boyaux | gamelle | a ravitaillé | L (idem) |
| 18 | | ~~Coup de main~~ | ~~fil coupé~~ | retirée (v0.38.3 : la corvée « coup de main » n'existe plus ; le numéro reste, les autres ne bougent pas) | — |
| 19 | | Entré le premier | porte ouverte | premier homme dans un tronçon pris | C |
| 20 | | A tenu seul | homme seul entre deux traverses | dernier défenseur d'un tronçon avant renfort ou chute | C |
| 21 | | Tronçon repris | tronçon à l'endroit | présent à la reprise d'un tronçon perdu | C |
| 22 | Commandement (carré, chevron) | Gradé de circonstance | galon neuf | promu parce qu'un supérieur est tombé | L |
| 23 | | A pris le régiment | fanion | devenu commandant du régiment | L (carnet) |
| 24 | | Cité à l'ordre du régiment | feuille pliée | le plus aguerri des entrés dans un tronçon pris ce jour-là (un par régiment et par jour) | C |
| 25 | Statuts (losange, peuvent s'effacer) | A tremblé | main qui tremble | sa peur a dépassé la terreur une fois | C |
| 26 | | N'a pas reflué | pied planté | resté à son poste pendant la déroute du régiment | C |
| 27 | | Rallié | retour en arc | a reflué avec le régiment, puis est revenu | C |
| 28 | | Du jour refusé | fusil à terre | dans un régiment qui a refusé de monter | L |
| 29 | | Parmi les douze derniers | douze points | son régiment n'a plus que douze hommes debout | L |
| 30 | Fin (fiche d'un mort, Mémorial) | Enterré par les siens | croix au crayon | inhumé (`etat.tombes`) | L |
| 31 | | Resté dans l'entonnoir | creux sans croix | corps non inhumé après trois nuits | L |
| 32 | Le fusil (octogone) | Un à son compte | un point | a abattu un homme au fusil (`A.victimes` ≥ 1) | L |
| 33 | | Cinq à son compte | cinq points | `A.victimes` ≥ 5 (seuil à mesurer) | L |
| 34 | | Dix à son compte | dix points en deux rangs | `A.victimes` ≥ 10 (seuil à mesurer) | L |
| 35 | | A abattu un gradé | un galon barré | une victime était officier ou adjudant | C |

**Les marques du fusil** (Jérôme : le nombre de tués est permis comme marque) : seuils **à mesurer** (combien d'hommes abat un soldat dans une bataille ? `A.victimes`, graines 3, 7, 8, tous nos régiments à l'attaque, puis en défense) pour que 5 et 10 soient rares mais atteignables ; le texte reste un fait sans éloge (« Cinq à son compte »).

**Affichage** : une rangée d'icônes sous le nom (sprites d'environ 11 px, encre `t` / `s` sur le papier, aucune couleur neuve) ; **la forme du cadre porte la famille** (rond, carré, losange, octogone pour le fusil : la forme porte l'information, `lisibilite.mjs`) ;
texte au survol **et au focus clavier** (`tabindex`, `aria-label` : le survol seul va contre conventions §7) ; six icônes au plus, les plus récentes d'abord, puis « +N ».

**Décisions à trancher** (défaut en gras) : effet de jeu (**aucun**) ; seuils du fusil (**1, 5, 10, à mesurer**) ; marques d'en face (**non, les nôtres seulement**) ; « Cité à l'ordre du régiment » (**générique, sans la Croix de guerre réelle**) ; les statuts s'effacent (**après une nuit**) ; le carnet en dit (**les rares : 19, 20, 23, 24**).

**Plan fin (lots)**

1. *Moteur de lecture* : `js/marques.js` pur (`marquesDe(B, id)` → liste ordonnée), `js/data/marques.js` (id, famille, icône en matrice, nom, dit), seuils dans `reglages.js` (`marques`) ; **17 marques lues de l'état** (4-7, 9-12, 22, 23, 28-34, + 14-17 si l'état retient l'homme). Aucun champ neuf. Tests : une bataille minimale par marque.
2. *Fiche* : rangée d'icônes dans `hud/fiche.js`, survol et focus, `aria-label`, `test/fumee.json` réécrit, `lisibilite.mjs` sur les cadres ; sujet « Les marques » au labo (variantes d'icônes) avec entrée de `labo-journal.js`.
3. *Événements* : `A.marques` (`Uint32Array`, dans `photoArmee` ; `VERSION` montée) ; bits posés dans `effrayer`, `tuerDans`, `prises`, `mourir`, la déroute ; **aucun tirage de hasard ajouté** ; `empreinteEtat` si la marque peut changer une règle (par défaut non : pas d'effet de jeu).
4. *Carnet et régiment* : une ligne de carnet pour les marques rares ; la fenêtre du régiment les compte sans les classer.
5. *Campagne et Mémorial* : les marques entrent dans le registre de campagne (identité d'un vétéran) et deviennent l'épitaphe sobre au Mémorial ; un blessé évacué garde les siennes (`etat.evacues[7]`).

<details><summary>Plans de développement et coût</summary>

| Plan | Contenu | Coût | Risque |
|---|---|---|---|
| **A — Les marques lues** | lots 1-2 : 17 marques lues de l'état, rangée sur la fiche | **2-3 sessions** | faible : tout se lit, aucun événement à poser |
| **B — Les marques comptées** | + lots 3-4 : les 18 autres, `A.marques`, carnet | **5-6 sessions** | moyen : événements dans `tuerDans` / `prises` |
| **C — Portées par la campagne** | + lot 5 : vétérans, épitaphes, régiments dissous | **8+ sessions** (après les pistes 3 et 4) | moyen : identité portable |

Recommandé : A, puis juger sur pièces avant de compter quoi que ce soit.
</details>

**Dettes anticipées** : les seuils du fusil à mesurer (voir plus haut) ; la rangée s'ajoute à `fiche.js` sans alourdir `main.js` ; les corvées sont notées par régiment (`etat.nuits`), pas par homme — « Pelle et pioche » dit alors « son régiment » à moins de marquer l'homme (lot 3) ;
`A.marques` à 32 bits suffit pour les 18 marques comptées mais pas pour beaucoup plus (prévoir un second champ) ; les icônes sont des matrices de lettres de la palette : tout `test/rendu.json` reste intact (la fiche est du DOM) ; textes en données, clés stables.

<details><summary>Prompts</summary>

```text
Cadrage « marques d'un homme ». Lis ROADMAP.md §6 (le catalogue de 35 marques), DESIGN.md (« Ce que le jeu refuse »), CLAUDE.md (la fiche en jauges, les chevrons, A.victimes), js/hud/fiche.js, hud/lecture.js, etat.evacues, etat.nuits, etat.grades.
Pour chacune des 15 marques marquées L, vérifie dans le code qu'elle se lit vraiment de l'état et dis-moi lesquelles ne le peuvent pas (avec la ligne qui manque). Puis UNE AskUserQuestion (4 questions max, recommandé en premier) :
effet de jeu, marques d'en face, effacement des statuts, lignes de carnet. Plan du lot 1 avec fichiers, tests et dettes. Pas de code avant ma réponse.
```

```text
Lot 1 « marques » (lecture). js/marques.js pur et testé dans Node, js/data/marques.js (icône en matrice de lettres de la palette, nom, dit), seuils dans reglages.js. Aucun champ neuf.
Tests d'abord, par marque : une bataille minimale qui la fait naître et une qui ne la fait pas. Pour celles du fusil, mesure d'abord les seuils sur des batailles entières (graines 3, 7, 8) et donne-moi la distribution des victimes par homme. Puis le prompt de clôture commun.
```

```text
Lot 2 « marques » (fiche). Rangée d'icônes dans hud/fiche.js : cadre rond / carré / losange selon la famille, texte au survol ET au focus (tabindex, aria-label), six au plus puis « +N », aucun emplacement vide.
Montre-moi DEUX variantes d'icônes au labo (sujet « Les marques », entrée dans labo-journal.js) avant d'en brancher une ; lisibilité en gris (outils/lisibilite.mjs) et audit-ecran. Réécris test/fumee.json en prouvant que le reste n'a pas bougé.
```

```text
Lot 3 « marques » (événements). A.marques en Uint32Array dans l'état (VERSION montée), dans photoArmee / restaurerArmee ; bits posés là où l'événement a lieu. Aucun tirage de hasard ajouté, aucun ordre de tirage déplacé : prouve-le par une bataille de 9 000 pas
identique avant / après (graines 3, 7, 8). Test « relue au milieu », et outils/deux.mjs si un bit peut changer une règle. Puis le prompt de clôture commun.
```
</details>

### 7. L'arcade : des surprises sur le champ (caisses, obus ratés, sapes, chars)

**Statut** : à l'étude, **maquettes au labo (v0.38.2, groupe « Arcade »), rien dans le jeu**. Demande de Jérôme : des mécaniques plus arcade pour rendre la bataille imprévisible, pour des enfants qui aiment Star Wars, Fortnite et Minecraft. Gardé : ce qui se dit dans le ton (la danse macabre), jamais un loot qui brille ni une récompense au nombre de morts (DESIGN.md).

**Maquettes** : les caisses (parachute, piégée), les obus ratés (gît avec un cercle / fume / couve), les sapes (galerie entendue ou non, fourneau, cratère-lac), les gaz (voir §5), les chars (le losange, ou qui s'enlise). Les avions ne sont pas maquettés : un biplan d'observation (révèle quelques secondes les batteries) est d'époque, un duel aérien est du Star Wars : à décider.

**À trancher avant tout lot de règle** : lesquelles, avec quel ton ; pour chacune ce que ça coûte à la logique (une mine = des obus `220` à l'indice du calibre déjà là, une caisse = un état sauvegardé, un obus raté = un tirage de plus dans `tomber` : **déplace les parties d'avant**, donc `VERSION`) ; le jeu à deux (tout l'aléa vient de la graine et de l'état).

### Annexe : comparatif des coûts (plan recommandé de chaque piste)

| Piste | Plan recommandé | Sessions | Dépend de |
|---|---|---|---|
| 1. Stances | A puis B | 2 → 4 | `main.js` allégé (HUD) |
| 2. Plan de nuit | A puis B | 3-4 → 6-8 | vérifier `etat.temps` la nuit |
| 3. Mémorial | A | 2 | — (prépare 4) |
| 4. Campagne | A | 5-6 | 3, identité portable |
| 5. Gaz | rien avant décision de ton | 6-8 | décision de ton, eau de la nuit étalée, maquette au labo |
| 6. Marques d'un homme | A | 2-3 | — (la campagne et le Mémorial les prolongent) |
