# Interface cible — Cyclopéen

Le champ de bataille occupe tout l'écran. Tous les panneaux sont des
papiers de campagne (`.papier`) superposés au monde, jamais des
plaques génériques. L'interface du bas ne prend que la hauteur
strictement nécessaire : une rangée de cartes de régiment.

┌──────────────────────────────────────────────────────────────┐
│ Réglages  Pertes des deux armées      Carte (fixe) +          │
│ Carnet    (debout/blessés/tombés)     heure, jour, météo,     │
│ de bord                                environnement         │
│                                                              │
│                 CHAMP DE BATAILLE (plein écran)              │
│                                                              │
│ ← [cartes des 8 régiments] →            Râtelier 75/155/220  │
└──────────────────────────────────────────────────────────────┘

## Haut gauche — réglages et carnet de bord
Boutons discrets : réglages, carnet de bord (existant, replacé).

## Haut centre — pertes des deux armées
Les pertes générales des deux camps, debout / blessés / tombés,
dans le style des feuilles de situation (encre de terre, croix au
crayon pour les morts), pas des barres de progression génériques.

## Haut droite — carte et informations factuelles
- La carte des secteurs (construireCarte/majCarte), fixe, toujours
  visible en overlay. Proportions du no man's land semi-réalistes.
  Régiments = cercles avec leur numéro. Pas de nom de secteur.
- Dessous la carte : play / pause / avance rapide ; l'heure et le
  jour (la montre de gousset) ; l'icône météo — clic = modale avec
  les prévisions pour le reste du jour et le lendemain.
- En dernier : description de l'environnement sous la souris
  (terrainSous : boue, terre, eau…) avec un petit bar chart de
  vitesse de déplacement. Pas plus de détails.

## Bas, centre — les 8 régiments
Une rangée de huit cartes compactes, une seule hauteur de rangée ;
flèches de navigation latérale si l'écran est étroit.

Chaque carte, sans autre texte :
- le numéro du régiment (3eRI, 65eRI…) ;
- des étoiles de progression selon les dégâts infligés (formule à
  définir) ;
- une barre d'état des forces : debout / blessés / tombés
  (couleurs : encres papier à proposer dans la palette existante).
Au survol de la barre d'état : tooltip définissant les couleurs.

Carte sélectionnée (clic sur la carte ou sur le régiment au sol) :
- elle s'ouvre en hauteur, verticalement, sans pousser les autres ;
- elle montre les actions disponibles en boutons (marche, tir,
  barrage, se protéger…) et l'ordre en cours en mots (actionDe) ;
- sur le terrain, chaque soldat du régiment est entouré d'un
  contour visible ; une ligne se trace du centre de gravité du
  régiment vers le curseur, terminée par une croix ; les
  destinations possibles sont en surbrillance ; le clic droit
  valide : chaque soldat reçoit son point de destination
  individuel, la formation conservée.

Formations : plusieurs configurations possibles (ligne, par deux…).

## Bas, droite — le râtelier d'obus
Trois boutons : 75, 155, 220 (touches 1/2/3 déjà câblées).

## Rollover global
Le survol met en surbrillance l'élément entier : un régiment avec
tous ses soldats, un tronçon, un régiment ennemi.
