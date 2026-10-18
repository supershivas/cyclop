# Roadmap — Cyclopéen

Les grosses évolutions envisagées ou en cours. Une entrée reste ici jusqu'à
sa livraison complète, puis en sort (le `CHANGELOG.md` garde la trace). Une
idée écartée part dans `docs/archives/` avec sa raison.

Statuts : **à l'étude** · **validé** (Jérôme a tranché) · **en cours** ·
**à mesurer** (livré, attend un playtest).

## En cours

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

### Découper `rendu3d.js` (docs/refonte-rendu3d.md)

**Statut** : fait jusqu'à l'étape 6 (v0.22.0, sans effet pour le joueur) — `rendu3d.js` 1 634 → 513 lignes (`js/rendu/` : shaders, formes, météo, tronçons, végétation, temps, éclats, soldats),
`main.js` 1 204 → 867 (`js/hud/`) ; filets : `outils/fumee.mjs` (le HUD) et `outils/rendu-empreinte.mjs` (34 images du canvas). Reste à décider : sortir le sol (`sol.js`) ou le laisser ;
recommandé : le laisser tant qu'aucun besoin n'apparaît. Plus tard, côté `main.js` : la rangée des régiments, le survol et la visée.

### Jeu à deux sur le même réseau

**Statut** : en cours — premier lot livré (v0.30.0), à jouer pour de vrai sur deux machines

Un joueur par armée (le bleu invite et joue nous, le kaki rejoint et joue en face), chacun sur son ordinateur, sans serveur : le **lockstep** (`js/reseau/lockstep.js` :
les deux machines calculent la même bataille, on n'échange que les ordres) sur un canal WebRTC appairé à la main (`js/reseau/lien.js` : une invitation, une réponse à se passer par un message).

- [x] Le test de déterminisme (`js/determinisme.js`, `outils/determinisme.mjs`, `determinisme.html`) : Node 22 et Chromium donnent le même état ; `Math.sin`, `Math.cos` et `x ** 1,5` diffèrent déjà au dernier bit entre les deux (hypot, sqrt : identiques)
- [x] Un second commandant : `planMarche` / `ordonnerMarche` / `peutOrdonner` / `ordonnerBarrage` / `peutBarrage` prennent un camp, `etat.deux` fait taire l'IA d'en face, ses batteries (`etat.batteriesEux`) rechargent comme les nôtres ; l'interface sait quel camp elle joue (`MOI` de main.js : cartes, carte tournée, pertes, nuit, couleurs)
- [x] Une horloge partagée : pause (Espace, le menu), ×2 / ×4 : des ordres du lockstep, appliqués au même cadre chez les deux
- [x] La nuit à deux : chacun ses corvées, l'aube part quand les deux sont prêts (`corvee`, `pret`)
- [x] Mission et fin : l'objectif du kaki est l'inverse de celui du bleu ; la fin dit qui l'emporte (`juger` reste du point de vue du bleu)
- [x] Un test de bout en bout : `outils/deux.mjs` (deux pages s'appairent, jouent, aucune désynchronisation) ; `test/lockstep.test.mjs` (réseau factice qui retarde)
- [ ] **Lancer `determinisme.html` dans Firefox** (pas dans le conteneur) et jouer une partie Chrome contre Firefox ; si `sin`, `cos` ou `** 1,5` y divergent : les remplacer dans la logique (army.js, terrain.js, tranchees.js) par des opérations exactes
- [ ] Jouer sur deux vraies machines : les adresses WebRTC d'un navigateur sont parfois masquées (mDNS) ; si l'appairage échoue sur un réseau, ajouter un serveur STUN ou un relais
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

- **Carte et ordres, la suite** (v0.14.0 et 0.15.0 : secteurs, carte, mêlée) : un ordre « tenir S3·N2 » depuis la carte (reculer d'une
  ligne), des ordres par secteur voisin, la mêlée dessinée sur le terrain (le nombre d'attaquants au-dessus du tronçon).

- **Tranchées, la suite** (v0.18.0 : traverses, sacs, fil de fer, abris dessinés) : 3 lignes en secteur calme, 5 en secteur fortifié ;
  les ouvrages au labo (variantes) ; le fil de fer qu'on coupe à la pince la nuit.
- **La nuit, la suite** (v0.11.0 : abris, vivres, coups de main, tombes) : des
  prisonniers qui parlent (le renseignement : où en face prépare son assaut).
- **Moral et expérience, la suite** (v0.11.0 : contagion, refus d'un jour,
  poursuite) : la fuite feinte jouée par le joueur (un régiment qui recule exprès
  pour disperser le poursuivant), l'expérience gardée d'une bataille à l'autre
  (le Mémorial).
- **Évacuer les blessés, la suite** (v0.18.0 : ils reviennent, une fois sur deux) : de jour, sous le feu ; la boue qui ralentit les brancardiers.
- **Lignes de vue** (une crête cache), mêlées de tranchées rares.
- **Hors de vue, les soldats comptés** au lieu d'être simulés un par un.
- **Champs de coûts recalculés par morceaux** quand le terrain change (aujourd'hui :
  le résumé du terrain est refait en entier toutes les 3 s, par bandes).
- **Mines** de 1916-17 : un événement rare, −10 m, un champ à part.
- **Méta** : le Mémorial, l'état-major (doctrines), les trophées déclaratifs.
- **D'autres secteurs et d'autres missions** (un seul secteur, deux missions en v0.9.0).
- **Son**, police d'identité auto-hébergée.
- **Soldats en sprites** (poses, atelier de dessin) : essayés en v0.1.1, non retenus pour l'instant (`docs/archives/`).
