# Inventaire des signaux visuels (lecture du code, v0.66.3)

Audit en lecture seule, sans toucher au code. Sources : `js/rendu/soldats.js`, `shaders.js`, `eclats.js`, `troncons.js`, `js/rendu3d.js` (visée), `js/hud/retours.js`, `lecture.js`, `main.js` (cartes, étiquettes), `palette.js`. À compléter par une lecture des captures (`outils/captures.mjs`) : ce document dit ce que le code dessine, pas ce que le joueur voit.

## Sur le terrain

| Information | Signal actuel | Canal | Remarque |
|---|---|---|---|
| Camp | Vareuse bleu horizon (nous) / vert kaki clair (eux) ; ombre `t` | couleur | portée par la couleur seule ; casque à pointe pour l'équipé |
| Régiment choisi | casque en os + anneau d'os, liseré de terre, au pied de chaque homme | forme + luminosité | tous les zooms |
| Régiment survolé | anneau à la couleur du camp | forme | même canal que « choisi » : seule la teinte change |
| Peur d'un homme (≥ 0,5) | il se tapit | pose | coupe le tir ; invisible aux zooms 1 et 2 (points) |
| Homme qui tire | bras et fusil levés, éclair à la bouche, trait vers la cible | pose + éclat | |
| Feu retenu | fusil baissé (`tirVal = -1`) | pose | lisible seulement de près |
| Marche | jambes qui marchent, cap lissé dans le sens du déplacement | mouvement | |
| Mort / tombe | corps couché, puis tertre et croix le lendemain | forme | |
| Blessé | **aucun signe propre sur le terrain** (fiche et cartes seulement) | — | à vérifier sur captures |
| Moral du régiment (ébranlé, déroute) | **rien sur le terrain** : carré numéroté orange / rouge dans la carte et l'étiquette | HUD seul | écart principal : l'état qui compte le plus se lit hors du champ |
| Posture (à volonté, retenu) | mot sur la carte ; fusil baissé sur le terrain | texte + pose | |
| Qui tient un tronçon | fanion à la couleur du camp, déchiré si l'autre camp y est entré ; sacs de terre à l'envers | couleur + forme | dès 3 px/m |
| Ouvrages | traverses, sacs, fil de fer (coupé), portes d'abri | forme | dès 3 px/m |
| Ordre pris | les tronçons visés clignotent 3 s ; fanion et réponse des hommes (retours.js) | mouvement | |
| Ordre en visée | ligne + croix, chemin en pointillés (contourne l'eau, ponts), surbrillance des tronçons ; refus en classe `refus` | forme | |
| Barrage visé | cercle du souffle posé sur le sol, cibles concentriques | forme | |
| Passe d'avion | bande de A au curseur, puis la passe tracée | forme | |
| Impact | éclat en trois temps, fumée, particules, feux qui restent | éclat | 24 impacts dessinés au plus à la fois |
| Terrain transformé | cratères, boue, eau qui monte, herbe qui reprend | couleur sol | palette fermée |
| Météo, nuit | pluie, neige, brouillard, voile de nuit, fusées éclairantes | voile + particules | |
| Corbeaux, feux | ambiance | forme | rien ne dit s'ils ont un sens de jeu |

## Dans l'interface

| Information | Signal actuel |
|---|---|
| Moral | trois niveaux (`niveauMoral` : tient / ébranlé / déroute), carré du numéro orange ou rouge, « ! » / « !! », mot en majuscules |
| Ordre en cours | statut de la carte : Attaque, En marche, En mouvement, Tient |
| Expérience | chevrons (carte, fiche) |
| Peur, fatigue, expérience, moral | jauges à repères (`REPERES` de barres.js) sur la fiche |
| Pertes | compteur et fil des pertes (`pertes.js`) |
| Carte | tronçons de 25 m à la couleur de celui qui les tient, régiments en cercles numérotés |

## Constats

1. **L'écart principal** : le moral n'a aucun signe sur le terrain. Le joueur regarde le champ, mais l'état d'un régiment se lit dans le HUD. Seule la peur individuelle s'y voit, par la pose tapie, et pas aux zooms 1 et 2.
2. **Deux couleurs d'alerte seulement** (orange, rouge), réservées à l'interface. Le champ de bataille n'a pas de couleur d'état ; il reste trois canaux : forme, mouvement, luminosité.
3. **Beaucoup de signaux dépendent du zoom** : poses et fusils dès 4 px/m, ouvrages dès 3 px/m, points aux zooms 1 et 2. Un état critique doit se lire aux zooms les plus éloignés.
4. **Un canal pour plusieurs sens** : l'anneau sert à « choisi » et à « survolé » (différence de teinte). Le clignotement sert à l'ordre pris et au tronçon visé.
5. **Pas d'état « mal en point » pour le champ** : blessés, ravitaillement et fatigue d'un régiment ne se lisent qu'à la fiche.

## Pistes à instruire (rien n'est décidé)

- Un signe de moral porté par le régiment sur le terrain (cohésion de l'anneau, trame, oscillation), lisible à tous les zooms ; à essayer au labo avant le jeu.
- Distinguer « choisi » et « survolé » par la forme, pas par la teinte seule.
- Décider un budget de signaux simultanés et un ordre de priorité.
- Vérifier chaque signal en niveaux de gris et au zoom 1 (`outils/lisibilite.mjs`).

## À vérifier

Ce document est tiré de la lecture du code. Il reste à confirmer sur captures : la visibilité du blessé, de la peur aux zooms 1 et 2, du signe de déroute, et la surcharge d'un écran de barrage.
