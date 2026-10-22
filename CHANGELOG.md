# Journal des versions

## 0.52.5 — 2026-10-22
- Les cratères sont ronds : une lèvre de terre jetée plus épaisse d'un côté et de petits éclats autour, au lieu d'un carré à gradins (les anciennes sauvegardes ne se relisent pas)

## 0.52.4 — 2026-10-22
- Au labo : des cratères moins carrés (disque, lèvre jetée d'un côté, éclats, ovale) à comparer au motif carré du jeu ; rien ne change en jeu

## 0.52.3 — 2026-10-22
- Le sol est plus fin de près : des cubes d'un demi-mètre dont la hauteur suit la pente et des taches de couleur au demi-mètre, à partir de 4 pixels par mètre (le mètre reste de loin)

## 0.52.2 — 2026-10-22
- Les soldats sont tournés vers l'ennemi dès le début de la partie ; en marche ils regardent où ils vont, puis se tournent vers l'ennemi à l'arrêt

## 0.52.1 — 2026-10-22
- Tous les soldats, des deux armées, regardent vers l'ennemi, à l'arrêt comme en marche (sauf quand ils tirent sur une cible)

## 0.52.0 — 2026-10-21
- Un réglage « Saison » dans l'inspecteur de l'éditeur de carte (automne par défaut, hiver, été) : il fixe le temps de la bataille et l'état du sol de n'importe quelle carte, publiée avec ses autres retouches

## 0.51.0 — 2026-10-21
- Des roseaux dans les marécages (de hautes touffes qui ondulent) ; les marécages sont plus rares sur la carte aléatoire (15 % des cartes)
- Les saisons : l'hiver tire de la neige (elle tombe, blanchit le sol par plaques), du gel et du brouillard, jamais de pluie ; l'été du temps sec et des jours de forte chaleur, avec un sol qui boit (les trous ne se remplissent plus) ; l'automne est le temps d'avant. La carte aléatoire tire sa saison
- Les fleuves sortent du terrain et continuent dans le décor hors carte en suivant leur vrai tracé (méandres et largeur comprises)
- Choix de la carte : à gauche les titres seulement ; un clic sur l'aperçu l'agrandit, on le parcourt (glisser, Maj, molette), un clic ou Échap le réduit

## 0.50.0 — 2026-10-21
- Des marécages : un disque aux bords rongés où la nappe affleure par plaques (flaques peu profondes qu'on traverse très lentement, boue), dans l'éditeur de carte (outil Marécage) et dans la carte aléatoire
- Les rives sont moins géométriques : un lac ou une côte a des anses et des caps (±22 % du rayon), un fleuve s'élargit et se resserre (±35 %) et serpente autour de son trait ; les cartes déjà faites changent de forme

## 0.49.0 — 2026-10-21
- Une carte aléatoire dans le choix de la nouvelle partie : un fleuve en travers du no man's land (avec un à trois ponts, dont un porte un char), parfois un fleuve ou des étangs derrière les lignes, une côte (la mer d'un des quatre côtés), des montagnes et des chaînes, des collines et des plateaux, une végétation et une nappe tirées de la graine
- « Autre terrain » en tire une autre, montrée en 3D avant de jouer ; l'eau ne touche jamais une tranchée
- Un char arrive sur la route sans regarder le terrain (une côte ou un lac derrière nos lignes ne l'enlise pas)

## 0.48.1 — 2026-10-21
- De près (3 pixels par mètre et plus), un clic sur un de nos hommes ouvre sa fiche ; son régiment se choisit par sa carte, son nom, le cadre ou T
- Les avions viennent de loin : ils entrent par le bord de la carte derrière leur camp, la traversent à 45 m/s et frappent en passant sur la bande visée
- Les chars naissent hors de la carte et entrent sur la route (8 m/s) jusqu'à l'arrière de leur camp, puis avancent vers leur but

## 0.48.0 — 2026-10-21
- Sept ponts en jeu (passerelle de planches, pierre à trois arches, dos d'âne, chevalets, poutre Warren, suspendu, cordes), au choix dans l'éditeur de carte ; l'eau passe dessous ; pierre, métal et chevalets portent un char, les autres cèdent sous lui
- Les régiments tiennent compte des ponts : le chemin (qui contourne l'eau) s'affiche en pointillés avant le clic, un ordre sans passage est refusé à voix haute
- Un régiment en route n'a plus le statut « Tient » : « En marche », « En mouvement », « Attaque »
- Les soldats avancent de face, plus à reculons
- La touche I ouvre la fiche de l'homme (ou du régiment) sous le pointeur, un des nôtres compris

## 0.47.1 — 2026-10-21
- Un fleuve qui touche le bord de la carte continue en méandres dans le faux terrain
- Les faces nord du terrain (vues quand on tourne la caméra) ont la couleur du sol, plus celle du fond ; les parois d'eau sont de l'eau
- Un pont part du point le plus haut de chaque rive
- Le cartouche du nom d'un régiment contient son texte
- Une infobulle (titre, sous-titre, gras) au survol de la barre de vie, du jour et des icônes de météo
- Au labo, le groupe Terrain : dix ponts, l'eau passe dessous

## 0.47.0 — 2026-10-21
- Un cinquième bouton, « Char » (touche 5) : un Schneider CA 1 part de l'arrière de nos lignes en droite ligne vers le point cliqué (une ligne pointillée montre sa route), à 3,6 km/h
- Il franchit les tranchées, ralentit dans un cratère de plus de 0,75 m, s'enlise dans plus de 1,5 m ou dans l'eau profonde, et ses mitrailleuses couchent les hommes de l'autre camp à 28 m
- Un obus qui tombe sur lui l'abîme (un 220 le détruit, un 75 de loin ne fait rien) ; l'épave fume ; on n'en lance un autre qu'après 240 s

## 0.46.0 — 2026-10-21
- Un quatrième bouton, « Avion » (touche 4), à côté des trois calibres : un clic sur le sol, et un avion passe en ligne sur la bande visée (12 m de large, 60 m de long, le long de l'axe nord-sud), avec traceurs et poussière
- Les hommes de la bande sont touchés (35 %, moins dans un creux ou une tranchée) ou effrayés, de l'un et l'autre camp ; l'escadrille ne revient qu'après 90 s (les obus : 40 à 110 s)

## 0.45.0 — 2026-10-21
- Au labo, les chars d'assaut sont cinq engins dessinés à l'échelle (Mark IV, avec sa livrée allemande de Cambrai, Renault FT à tourelle tournante, Schneider CA 1, Saint-Chamond, A7V allemand), qu'on regarde à la caméra libre (glisser, Maj, molette, « Suivre », trois crans de zoom en plus)
- Au labo, les gaz sont trois nuages en volumes translucides (les bouteilles de chlore de 1915, les obus à phosgène et à ypérite, une nappe qui coule dans les creux)
- Au labo, quatre propositions de gameplay pour les avions, jouables à la caméra libre : l'avion de réglage de tir, le cirque du Baron rouge, le mitraillage, les bombardiers de nuit

## 0.44.0 — 2026-10-21
- Dans l'éditeur de carte, un pont sur un lac ou un fleuve
- Un obus tombé sur un pont le coupe

## 0.43.0 — 2026-10-21
- Dans l'éditeur de carte, un lac et un fleuve : une eau profonde qu'on ne traverse pas
- Les régiments s'arrêtent à la rive

## 0.42.0 — 2026-10-21
- Dans l'atelier, on choisit la carte de chaque bataille de la campagne
- Le jeu se recharge de nouveau (deux imports perdus à la fusion de la v0.41.3)

## 0.41.3 — 2026-10-21
- Le nom d'un régiment sur le champ est un cartouche cliquable : le numéro dans un carré (bleu ; orange si le régiment est ébranlé, rouge en déroute), le nom et le secteur, le statut, la barre debout / blessés
- La carte d'un régiment dans la rangée a une hauteur fixe, la barre toujours au même endroit, un « ! » (« !! » en déroute) sur le coin et un fond hachuré quand il est ébranlé (plus légèrement s'il est choisi)
- Les messages (ordre refusé, mise à jour, alerte) tombent sous les pertes, au centre, avec un liseré et un petit mot par genre, au lieu de recouvrir les cartes des régiments
- Un ordre en terrain libre plante un fanion et chaque homme lève un « ! » ; un obus qui tombe laisse un éclair et un anneau de poussière ; un bouton rebondit quand on le clique

## 0.41.2 — 2026-10-21
- La vitesse du temps choisie (×2, ×4) est gardée jusqu'à la nuit

## 0.41.1 — 2026-10-21
- Les versants ne se couvrent plus d'eau sous la pluie : l'eau reste dans les creux et sur le plat

## 0.41.0 — 2026-10-21
- Un clic sur le nom d'un régiment, sur le champ, le choisit comme sa carte de la rangée (Maj : en ajouter à la sélection)
- Au labo, un point vert (tranché, en jeu), rouge (à trancher) ou orange (indéfini) devant chaque sujet et chaque groupe
- Au labo, trois sujets à trancher, quatre propositions chacun (rien n'est encore dans le jeu) : le nom d'un régiment sur le champ (h1 nom, h2 statut, une vraie cible de clic), les toasts (qui recouvrent aujourd'hui la rangée des cartes) et la carte d'ordre de la rangée (hauteur fixe, barre toujours au même endroit, fond différent pour un régiment ébranlé)

## 0.40.1 — 2026-10-20
- Au labo, trois sujets pour rendre les actions plus satisfaisantes, à essayer avant d'en retenir une (rien n'est encore dans le jeu) : le clic sur un bouton (rebond, tampon, onde, cran, maintien), un ordre d'un régiment sur un secteur (fanion, onde, réponse des hommes, bannière, réticule) et un coup d'obus (trajectoire, impact en trois temps, onde de choc, terre qui retombe, gel d'image)

## 0.40.0 — 2026-10-20
- La nuit, le ciel : des étoiles, une lune dont la phase change de jour en jour (une lunaison en trente jours), des nuits plus ou moins nuageuses, des étoiles filantes — à voir en baissant la caméra
- Une pleine lune éclaire un peu le champ, la pluie et le brouillard l'étouffent ; le papier de la nuit dit la phase de la lune et l'état du ciel

## 0.39.1 — 2026-10-20
- La nuit, les fusées éclairantes montent plus souvent (toutes les 2 à 6 s au lieu de 5 à 12) et sur un front plus large

## 0.39.0 — 2026-10-20
- La nuit, la mêlée continue : un tronçon où les deux camps se font face au soir est tranché pendant la nuit (le plus faible y laisse la plus grande part de ses hommes), et l'aube dit les morts au corps à corps et les tronçons pris ou perdus
- Un régiment au contact de l'ennemi ne reçoit aucune corvée : sa carte dit « Au contact » et ses boutons sont grisés avec la raison
- À l'arrière, des lampes vont et viennent dans la nuit, une pour dix hommes, dans les deux camps

## 0.38.3 — 2026-10-20
- La nuit, la carte d'un régiment à qui l'on a donné un ordre se grise
- Sept corvées au lieu de neuf : plus de caillebotis ni de coup de main
- Donner une corvée à plusieurs régiments à la fois les atteint tous (seul le premier la recevait, sans que l'écran le dise)
- Les boutons empilés d'un régiment (ordres, formes, postures, corvées) ont tous la même largeur

## 0.38.2 — 2026-10-20
- Au labo, un groupe « Arcade » : des maquettes de caisses de ravitaillement, d'obus ratés, de sapes, de gaz et de chars d'assaut, à essayer avant d'en retenir une (rien n'est encore dans le jeu)

## 0.38.1 — 2026-10-19
- Les lueurs des feux et des lanternes ne traversent plus les collines

## 0.38.0 — 2026-10-19
- Dans l'atelier, on crée une nouvelle carte, à partir d'une carte existante ou d'un champ vierge, avec son nom et son résumé
- Une carte publiée s'ajoute à la liste des cartes d'une nouvelle partie

## 0.37.1 — 2026-10-19
- Le choix du secteur à la nouvelle partie a deux colonnes : la liste des secteurs à gauche, le secteur choisi en 3D à droite, qui tourne
- Le terrain montré est celui qu'on jouera ; « Autre terrain » en tire un autre

## 0.37.0 — 2026-10-19
- L'atelier s'ouvre sur un éditeur de carte visuel : on pose des bosses, des creux, des crêtes, des arbres et des haies, on les déplace, on règle chaque chiffre nommé et décrit
- La carte se regarde aussi en 3D, avec le moteur du jeu, à l'heure et par le temps qu'on choisit ; on y pose d'un clic, et « Essayer dans le jeu » lance une bataille d'essai
- Une partie garde le sol, les tranchées et les arbres qu'elle a reçus au départ : republier une carte ne la change pas

## 0.36.8 — 2026-10-19
- Le ciel a un léger dégradé et des nuages qui dérivent, selon la météo
- Vue lointaine : le fond du champ n'est plus coupé, il se perd dans la brume de l'horizon

## 0.36.7 — 2026-10-19
- Plus de fumée brune de l'écran titre au début d'une partie
- Le ciel prend la couleur du temps : gris-bleu au sec, sombre sous la pluie, clair dans le brouillard, pâle au gel

## 0.36.6 — 2026-10-19
- L'écran titre propose « Nouvelle campagne » (trois batailles, vos survivants d'une bataille à l'autre) et « Continuer la campagne » ; la campagne est dans l'export et l'import de la sauvegarde

## 0.36.5 — 2026-10-19
- À la fin d'une campagne, un papier sobre dit chaque bataille, puis les noms de ceux qui sont tombés et de ceux qui sont restés (la campagne n'est pas encore jouable depuis l'écran titre)

## 0.36.4 — 2026-10-19
- Entre deux batailles de campagne, un registre dit ce que sera chaque régiment ; la mission de la bataille suivante suit l'issue de la précédente (la campagne n'est pas encore jouable depuis l'écran titre)

## 0.36.3 — 2026-10-19
- Le labo propose quatre façons de dire, entre deux batailles de campagne, ce qui reste de la bataille finie et ce que sera chaque régiment (la campagne n'est pas encore jouable)

## 0.36.2 — 2026-10-19
- Un régiment en feu retenu porte son fusil baissé devant lui, la baïonnette ne dépasse plus de sa tête, et ne le lève que pour tirer

## 0.36.1 — 2026-10-19
- Les boutons « À volonté » et « Feu retenu » sont dans la fenêtre du régiment choisi ; la carte du régiment et le carnet disent la posture, et un régiment en déroute dit pourquoi il ne l'accepte pas

## 0.36.0 — 2026-10-19
- Maj+1 et Maj+2 donnent aux régiments choisis la posture « à volonté » ou « feu retenu » (il n'ouvre le feu que de près et vise mieux) ; le carnet de bord le dit, et le jeu à deux le partage

## 0.35.0 — 2026-10-18
- Un blessé qui peut marcher (le bras, une jambe légère) regagne l'arrière au lieu de rester dans la tranchée ; les autres restent à terre
- Avec des régiments choisis, un clic sur un régiment à nous leur donne l'ordre au lieu de le choisir ; le survol et le clic prennent le corps entier d'un homme
- La fiche d'un homme (et d'un régiment) montre la peur, la fatigue, l'expérience, le corps blessé, ses jours au front, ses victimes et son prochain grade ; les chevrons n'apparaissent qu'avec l'expérience

## 0.34.6 — 2026-10-18
- La fenêtre d'ordres revient au-dessus de la carte du régiment choisi et se relève d'un coup, comme un rabat

## 0.34.5 — 2026-10-18
- Les obus de 155 et de 220 sont plus meurtriers : ils fauchent davantage d'hommes dans leur rayon, le 75 reste précis mais tue moins

## 0.34.4 — 2026-10-18
- Plus de saccade toutes les trois secondes en pleine bataille : les régiments ne recalculent plus leur chemin tous ensemble

## 0.34.3 — 2026-10-18
- Jouer à deux : si la connexion échoue sous Firefox, l'écran conseille Chrome (Firefox ne se connecte pas entre deux Mac, Chrome oui)

## 0.34.2 — 2026-10-18
- Plus de ralentissement brutal en pleine bataille quand beaucoup de régiments marchent vers des endroits différents

## 0.34.1 — 2026-10-18
- Jouer à deux : un code de 6 signes suffit, plus de copier-coller (il reste en secours, replié)

## 0.34.0 — 2026-10-18
- La fenêtre d'ordres s'ouvre près des hommes du régiment choisi, d'un petit bond, reliée à eux par une pointe, et les suit quand ils marchent

## 0.33.1 — 2026-10-18
- Le jeu à deux se connecte entre deux ordinateurs : les adresses sont complétées, et l'écran dit pourquoi une connexion échoue

## 0.33.0 — 2026-10-18
- Les pertes en barres de vie, comme un duel : nous à gauche, en face à droite, le jour au milieu, les tronçons tenus dessous ; les chiffres au survol d'un segment
- Un clic sur la carte d'un régiment referme quatre équerres sur ses hommes en plus de centrer la caméra
- Le champ se prolonge au-delà du bord de la carte, puis la nuit le mange (plus de bord coupé net)
- Au labo : cinq façons d'ouvrir la fenêtre d'ordres

## 0.32.3 — 2026-10-18
- Quand on vise un barrage, le cercle du souffle du calibre se pose sur le champ : une zone assombrie et deux anneaux, plus serrés vers le centre
- Les hommes qui survivent au souffle d'un obus ne sautent plus : soit projetés, soit ralentis, jamais de saut

## 0.32.2 — 2026-10-18
- Les marqueurs de régiment sur la carte ont la couleur de leur armée (bleu pour nous, vert kaki en face) et un liseré sombre
- Un clic sur la carte d'un régiment centre la caméra sur lui, avec un sonar qui se resserre autour de ses hommes
- Au labo : la barre de vie (quatre propositions), le clic sur un régiment (quatre animations) et le bord de la carte (cinq propositions)

## 0.32.1 — 2026-10-18
- Le terrain sous la souris tient sur une seule ligne ; sur une tranchée : « Tranchée B1 » puis sa ligne de vie, aux couleurs des deux armées (les hommes de chacune dans le tronçon)

## 0.32.0 — 2026-10-18
- Au labo, deux nouveaux sujets : « Projections » (un obus sur un régiment en marche : les hommes du souffle sont jetés puis tués ou blessés, ceux d'à côté ralentis puis repartent ensemble) et « Visée d'un obus » (le cercle du rayon, quatre types, pour chaque calibre)
- Le jeu ne change pas

## 0.31.4 — 2026-10-18
- Les boutons de vitesse n'ont plus de liseré (il était coupé)

## 0.31.3 — 2026-10-18
- Un seul style de titres, des textes et des espacements pris dans une échelle (quelques pixels bougent)
- Menu, Réglages et le temps ont le même habillage, en papier

## 0.31.2 — 2026-10-18
- La barre du temps, variante D : une frise de la bataille (la météo de chaque jour, la nuit, un trait bleu pour où l'on est, les changements de météo en pictogrammes), de la largeur des boutons du haut ; la mission et le terrain sous la souris restent dessous
- Les boutons du haut ont tous la même hauteur

## 0.31.1 — 2026-10-18
- Le labo a une page d'accueil : ce qui a changé version par version, avec un lien vers le bon sujet, ce qui est nouveau depuis votre dernière visite, ce qui reste à trancher
- Au labo, les visuels périmés sont refaits ou marqués « ancienne » : l'écran d'aujourd'hui, la caméra libre, les notes du champ ; dans chaque sujet, la variante en jeu est la A

## 0.31.0 — 2026-10-18
- Le champ gagne de la place sur un petit écran : le temps à côté des réglages, les pertes sur une ligne par camp, la carte repliable, un billet sans montre dessinée (en haut à gauche, sous le temps), des batteries à jauge de recharge ; le bouton de prévision disparaît
- Au labo, « La barre du temps » : cinq mises en page d'une frise de la bataille (jours, nuits, repère, changements de météo)

## 0.30.0 — 2026-10-18
- Jouer à deux (bouton de l'écran titre) : deux ordinateurs sur le même réseau, sans serveur. L'un invite (le bleu), l'autre rejoint (le kaki) en se passant deux textes ; les deux commandent leur armée dans la même bataille, en même temps : ordres, barrages, pause partagée, ×2 et ×4, nuit et aube (chacun ses corvées, l'aube vient quand les deux sont prêts)
- Le kaki voit la carte et la caméra tournées d'un demi-tour (ses lignes en bas) et les couleurs de l'interface à sa main ; la partie à deux ne se sauvegarde pas

## 0.29.0 — 2026-10-18
- Trois secteurs à choisir en début de partie (touches 1, 2, 3) : Les labours, La crête (une crête de 7 m que l'ennemi tient : il faut la monter), Le marais (un fond plat où la nappe affleure, quatre jours de pluie au moins)
- Les tranchées serpentent : un tracé irrégulier, une largeur qui varie, des boyaux sinueux, plus de créneaux en carré (une partie déjà commencée garde ses hommes mais retrouve ses tranchées au nouveau tracé)

## 0.28.0 — 2026-10-17
- Les soldats sont équipés (bottes, capote, ceinturon, cartouchières, gourde, couverture, baïonnette, casque et moustache chez nous, casque à pointe en face) et leurs bras balancent à la marche ; les morts sont ces mêmes soldats couchés, sur le dos, le ventre ou le côté
- L'armée d'en face est vert kaki clair (elle était rouge), plus claire que tout le sol ; le rouge disparaît du jeu (un ordre refusé passe à la glaise)
- La caméra est libre : toutes les directions, de l'horizon au zénith, le ciel de la couleur de la brume comme à l'accueil ; seul le sol la bloque ; C recentre
- Des barres de chargement au lancement du jeu et quand on relit ou commence une partie

## 0.27.0 — 2026-10-17
- Les fusils fument : un petit nuage clair à chaque coup, qui dérive avec le vent
- La fumée des bombardements reste parfois (40 à 90 s) et vire au noir parfois, d'autant plus souvent que le calibre est gros (75 : 12 % noire, 155 : 35 %, 220 : 60 %)
- Au labo, à choisir : des soldats plus détaillés (équipement, casque de chaque camp, bras qui balancent) et des cadavres qui sont les soldats couchés (sujet « Cadavres »)

## 0.26.0 — 2026-10-17
- Le papier de la nuit prend la place des pertes, au centre du haut de l'écran ; la fiche s'ouvre à gauche, sous le carnet
- Le cadran de vue disparaît de l'écran : la touche C recentre la caméra (tourner et incliner restent à A, E, R, F et à la molette)

## 0.25.0 — 2026-10-17
- Les balles courent jusqu'à leur cible (jusqu'à 70 m, au lieu de 13 à 20 m) ; les obus se voient de loin : allongés selon leur trajectoire, couleur d'os
- Les salves ne mangent plus les éclats encore en vol (le tampon passe de 2 400 à 6 000)
- Les corbeaux se posent sur les morts (trois nids de six) et se dessinent selon le zoom : un point, un trait, puis une silhouette aux ailes qui battent

## 0.24.0 — 2026-10-17
- Un homme tué par un obus est projeté loin du point de chute (3 à 15 m selon le calibre et sa distance) : on le voit voler, et son corps reste où il retombe

## 0.23.0 — 2026-10-17
- Un régiment en terrain libre se range en bloc, en ligne, par deux ou en colonne : quatre boutons sur sa carte ouverte, pour le prochain ordre de marche (la visée montre la place prise ; sur une tranchée, les hommes suivent le tracé)

## 0.22.0 — 2026-10-16
- La nuit, les corvées de chaque régiment s'ouvrent au-dessus de sa carte, comme les actions du jour ; chaque carte dit la corvée prévue ; le papier de la nuit ne garde que le bilan
- Dans une tranchée d'en face, on n'évacue pas les blessés et on ne ravitaille pas, sauf si la tranchée est toute à nous et qu'aucun régiment d'en face n'est tout près

## 0.21.4 — 2026-10-16
- Un régiment qui se déplace préfère l'abri : il suit la tranchée plutôt que de longer à découvert, même si c'est un peu plus long

## 0.21.3 — 2026-10-16
- La carte se simplifie : quatre secteurs A à D (un régiment de départ n'en occupe plus deux), des lignes numérotées de 1 à 4 de chaque côté ; une tranchée se dit B1, ou B1 en face
- La fiche d'un régiment s'ouvre juste au-dessus de sa carte, centrée sur elle

## 0.21.2 — 2026-10-16
- Le clic gauche choisit puis ordonne : un clic sur un de nos régiments le choisit, un clic sur le sol y envoie les régiments choisis, qui restent choisis
- Le clic droit (ou Échap) annule : le barrage visé, la fiche, puis les régiments choisis ; le réglage « tout au bouton gauche » disparaît

## 0.21.1 — 2026-10-16
- Le survol allume l'élément entier : un régiment avec tous ses hommes (les nôtres en bleu, ceux d'en face en rouge), et, sur une tranchée vide, le tronçon
- Survoler la carte d'un régiment ou son cercle sur la carte allume aussi ses hommes sur le terrain

## 0.21.0 — 2026-10-16
- Un régiment choisi se voit : un anneau au pied de chacun de ses hommes, à tous les zooms
- Avant de donner un ordre, une ligne va du régiment au curseur, terminée par une croix, et ce que l'ordre occuperait s'allume (les tronçons visés, ou la place des régiments en terrain libre) ; la croix est rouge quand l'ordre ne partirait pas

## 0.20.0 — 2026-10-16
- Nos régiments en bas de l'écran : une carte par régiment (numéro et nom, chevrons d'expérience, barre debout / blessés / tombés) ; la carte choisie s'ouvre vers le haut, avec son ordre et ses actions (Marcher, Regagner sa tranchée, Fiche)
- Le râtelier passe en bas à droite ; les feuilles de situation disparaissent

## 0.19.0 — 2026-10-16
- Le haut de l'écran se réorganise : les pertes des deux armées au centre, la carte du secteur toujours visible à droite (ses régiments en cercles numérotés ; la touche M disparaît), le carnet à gauche
- Le temps : arrêter, ×1, ×2, ×4 (un assaut ramène à ×1) ; la montre, la météo (clic : le temps d'aujourd'hui et la prévision) et le terrain sous la souris en deux lignes et une barre de marche

## 0.18.1 — 2026-10-16
- Le râtelier : trois boutons en papier de campagne, 75, 155 et 220, avec leur touche (1, 2, 3) ; couché quand il se recharge

## 0.18.0 — 2026-10-16
- Les tranchées ont des traverses, des sacs de terre sur le parapet (à l'envers quand le tronçon est pris), du fil de fer coupé là où l'ennemi a passé, des portes d'abri
- Les blessés évacués reviennent une fois sur deux, après 1 nuit (bras), 2 (jambe) ou 3 (tête)

## 0.17.0 — 2026-10-15
- Un assaut à découvert coûte moins d'hommes : une cible qui court est plus dure à toucher, et le tir est un peu moins précis
- La moitié des régiments part en 2e ligne ; la carte et les noms (S1-2 · Porphyre) suivent
- Les soldats ont des bras et un fusil épaulé dès 4 pixels par mètre (silhouette allégée)

## 0.16.0 — 2026-10-15
- Notre armée est d'un bleu plus franc : on la distingue sous la pluie et dans la brume
- Les soldats ne sautent plus au bord des cratères
- Les explosions jettent les survivants proches

## 0.15.0 — 2026-10-15
- Une tranchée attaquée par beaucoup d'hommes contre quelques-uns tombe en quelques secondes (la mêlée)
- La feuille du régiment et la carte disent les forces en présence : « attaque S3·F1 : 38 contre 5 »

## 0.14.0 — 2026-10-15
- Huit secteurs numérotés, un régiment chacun : une carte (touche M) montre qui tient chaque tranchée (S3·N1, S3·F2)
- Un ordre sur une tranchée la fait clignoter, et la feuille du régiment dit ce qu'il fait : tient S3·N1, attaque S3·F1…

## 0.13.0 — 2026-10-15
- La nuit se joue sur le champ de bataille : on choisit des régiments, puis leur corvée, sans boîte de dialogue
- Les soldats ont des bras : ils épaulent le fusil, se tournent vers l'ennemi et tirent

## 0.12.1 — 2026-10-15
- Les noms de la liste de la fiche d'un régiment se lisent de nouveau
- Les balles sont de fins traits, les obus des ogives à leur taille
- Plus de tramage : le brouillard, les ombres et la fumée sont des fondus continus

## 0.12.0 — 2026-10-15
- Le terrain garde le même relief à tous les zooms, même tout dézoomé (un peu plus lourd à dessiner)
- L'armée d'en face est rouge : on la distingue d'un coup d'œil sur le champ de bataille

## 0.11.0 — 2026-10-15
- La nuit : creuser des abris, ravitailler, tenter un coup de main ; les morts inhumés ont une tombe
- Une déroute gagne les voisins ; un régiment brisé refuse de monter un jour ; en face poursuit après une prise
- Des ombres plus douces, posées sur le sol ; les cratères et les tranchées plus profonds à l'œil

## 0.10.0 — 2026-10-15
- L'interface devient des papiers de campagne : une montre, des feuilles de situation par régiment choisi, un râtelier d'obus, des croix au crayon pour les morts
- Un carnet de bord note les événements marquants à l'heure où ils arrivent (tronçon pris ou perdu, assaut, déroute)

## 0.9.3 — 2026-10-15
- Le sol se nuance de vert, discrètement
- La nuit sans trame : un voile continu, des halos chauds autour des lanternes, des feux et des fusées
- On peut zoomer tout près des soldats (12 et 16 pixels par mètre)

## 0.9.2 — 2026-10-15
- Le feu se voit : un éclair et un trait clair à chaque tir, les hommes terrifiés se tapissent
- Chaque tronçon de tranchée porte un fanion à la couleur de celui qui le tient : déchiré quand l'autre camp y entre, amené puis hissé quand il tombe

## 0.9.1 — 2026-10-15
- La vue se tourne et s'incline avec le bouton du milieu, ou avec un petit cadran en bas à droite : plus de gêne avec les gestes de souris de Firefox
- Maj + bouton du milieu déplace la vue

## 0.9.0 — 2026-10-15

- La bataille entière : de 10 à 15 jours, une mission (tenir le secteur, ou prendre leur première ligne) jugée à la fin
- La relève : la nuit, un régiment usé cède sa place à un régiment frais de la réserve
- En face prépare ses assauts au 220 et ne sort que là où nos lignes ont faibli

## 0.8.2 — 2026-10-14

- L'écran titre : la caméra au ras du sol, sous un ciel bas, et une image différente à chaque lancement

## 0.8.1 — 2026-10-14

- L'écran titre montre le champ de bataille : vue de près, au coucher du soleil, sous la fumée, rendu par le jeu

## 0.8.0 — 2026-10-14

- Le temps passe : les ombres tournent et s'allongent, le soir tombe, la nuit s'éclaire de lanternes et d'incendies
- Les soldats ont des jambes, un casque, un fusil et un sac ; les obus tombent, soulèvent la terre, enfument le champ
- Plus d'arbres et des bois, que le feu gagne de proche en proche ; des fusées le soir, des corbeaux sur les morts

## 0.7.1 — 2026-10-14

- Le champ vu de loin redevient fluide : les buissons n'y sont plus dessinés

## 0.7.0 — 2026-10-14

- Six régiments par camp au lieu de huit
- De l'herbe, des buissons en haies, plus d'arbres : les obus et la boue les font disparaître
- Au labo : des soldats plus détaillés et des effets d'explosion et d'ambiance à comparer

## 0.6.0 — 2026-10-14

- La nuit, une corvée par régiment : repos, réparer la tranchée, caillebotis, inhumer les morts, évacuer les blessés
- Un blessé laissé au front peut mourir dans la nuit ; les corps laissés pèsent sur le moral
- À l'aube, le bilan de la nuit

## 0.5.0 — 2026-10-14

- Le moral : un régiment éprouvé est ébranlé, refuse de sortir, puis part en déroute ; la nuit le reprend
- L'expérience : ceux qui survivent au feu s'aguerrissent ; un gradé tombé est remplacé
- Survolez le terrain : un coin dit ce qu'il est (boue, tranchée, cratère…)

## 0.4.0 — 2026-10-14

- Les tranchées : quatre lignes par camp, des boyaux, des tronçons qu'on prend et qu'on perd
- Un clic droit sur une tranchée l'occupe ; prise, elle protège à l'envers
- En face monte à l'assaut de nos lignes

## 0.3.3 — 2026-10-14

- Les morts restent où ils sont tombés ; survolez-les, ils ont un nom
- Le clic droit ne déclenche plus les gestes du navigateur ; un réglage met tout au bouton gauche

## 0.3.2 — 2026-10-14

- Survolez un homme pour savoir qui il est ; de loin, un régiment pour ses pertes
- La fiche d'un régiment : ses officiers, ses blessés, ses morts, et leurs fiches

## 0.3.1 — 2026-10-14

- La caméra respire : elle se balance d'elle-même, très lentement

## 0.3.0 — 2026-10-14

- La caméra voit en perspective : les régiments lointains paraissent plus petits
- Chaque soldat a un nom, un âge, un grade et un état : cliquez-le
- Les hommes se fatiguent, sont blessés (bras, jambe, tête), ont peur
- Dézoomer garde toujours le terrain à l'écran : il déborde du secteur
- Labo : la caméra qui respire, très lentement

## 0.2.0 — 2026-10-14

- La caméra a un léger angle : on sent la profondeur du champ
- On la tourne et l'incline un peu (A et E, R et F, ou en glissant avec le bouton droit)
- Le labo ne montre plus le sol à facettes ni les soldats en sprites (non retenus)

## 0.1.1 — 2026-10-14

- Labo : un sol à facettes, plus organique, à comparer aux cubes
- Labo : les soldats en sprites (deux pas de marche, le casque de chaque camp)

## 0.1.0 — 2026-10-14

- Un champ de bataille de 400 × 300 m où les obus creusent des cratères
- Deux camps de 1 000 hommes, des ordres de marche et trois batteries
- Trois jours de temps : la pluie fait la boue, l'eau monte dans les trous
