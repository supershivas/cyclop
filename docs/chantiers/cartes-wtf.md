# Les cartes du soir (proposition, 24 nov. ; relue le 25 nov. ; le modèle des paquets, 26 nov. ; rien n'est en jeu)

**Le modèle (Jérôme, 26 nov. ; maquette au labo, sujet « Les cartes du soir »)** : le soir, on choisit **un paquet parmi trois** (trois familles de cartes : la musette, les hommes, les engins…) ; un paquet tient **3 à 5 cartes** (hasard) ; on l'ouvre (on le déchire), puis on **garde une carte**. Un paquet a sa rareté : **mat** (commun), **brillant**, **rose** (brillant, et toujours une carte mythique dedans). Une carte existe dans les **six raretés** des largages ; sa rareté change sa description (sa valeur) et sa matière (peu commun : lignes ; rare : foil bleu ; épique : foil d'argent et halo ; légendaire : foil doré, halo, lévitation ; mythique : rose, foil en nuages, étincelles). Une carte ne montre que **son nom** (en Antonio, la police des titres), **son image**, **sa description**, **sa rareté** : le dessin « l'étiquette » est retenu (le bandeau de rareté en haut, l'image en grand, le texte dessous). **La rareté remplace les niveaux** : une carte déjà tenue, tirée de nouveau, prend la rareté au-dessus de la sienne. Les tableaux plus bas (niveaux I, II, III) datent d'avant ce modèle : ils restent comme réserve d'effets, à reverser dans les six raretés de chaque carte (les neuf cartes de la maquette le sont déjà, `CARTES` de `js/labo-cartes-soir.js`).


Décidé (Jérôme, 24 nov., v0.169.0 ; remplacé par le modèle des paquets, ci-dessus) : le soir, 3 cartes tirées, on en garde une, jusqu'à la fin de la campagne ; une carte déjà tenue, tirée de nouveau, monte d'un niveau. Une carte change ce qu'on voit en jeu, jamais « +5 % ». Raretés : celles des largages (`RARETES` de `data/largages.js`) : C commun, PC peu commun, R rare, É épique, L légendaire, M mythique. Les cartes **maudites** donnent un gros bonus contre un défaut visible.

**Règle de la liste (Jérôme, 24 nov.)** : une carte ne s'appuie **que sur ce qui existe en jeu** : les effets des objets parachutés (`e` de `OBJETS`, `data/largages.js`) et les caprices (`data/caprices.js`). Une carte est donc **un objet qui revient** (chaque matin, à chaque vol, au premier assaut) ou **un caprice qu'on déclenche soi-même** (une fois par jour ou par partie, dans la musette). Rien qui demande une mécanique nouvelle (première liste retirée : voir en bas).

**Le survol (Jérôme, 25 nov.)** : comme dans Slay the Spire, les termes propres au jeu sont **soulignés** sur la carte ; le survol d'un terme ouvre une petite bulle qui l'explique (le glossaire est plus bas : une ligne par terme, des chiffres plutôt que des phrases). Dans ce document, un terme souligné est écrit <ins>ainsi</ins>.

**Les durées** sont en heures de l'horloge du jeu (une journée de 12 h fait 360 s : **1 h = 30 s** à vitesse normale). Les chiffres viennent des objets et des caprices tels qu'ils sont dans `data/`.

**Les niveaux** : le niveau I est l'effet de base ; II, la carte tirée une deuxième fois ; III, une troisième. Un niveau III n'existe que là où le jeu a déjà une marche visible au-dessus (« — » sinon : la carte s'arrête au niveau II, et tirée de nouveau elle est remplacée par une autre). Voir « Le niveau III » plus bas.

## La musette et l'artillerie

| Carte | Niveau I : ce qu'on voit | Niveau II | Niveau III | S'appuie sur | Rareté |
|---|---|---|---|---|---|
| Le dépôt | Chaque matin, une <ins>salve de 75</ins> (24 obus) arrive dans la <ins>musette</ins> | Une salve le matin, une autre à midi | Le matin, un <ins>barrage de 155</ins> à la place de la salve | `fuseeRouge`, `fuseeVerte` | C |
| La musette profonde | La <ins>musette</ins> garde 5 objets au lieu de 3 (touches 7, 8, 9, 0 et une cinquième : Jérôme, 25 nov.) | 7 objets | — | `LARGAGE.musette` | PC |
| Le train de munitions | Chaque matin, un <ins>barrage de 220</ins> (6 gros obus qui crèvent les tranchées) dans la <ins>musette</ins> | Le matin et à midi | — | `obus220` | R |
| Le barrage roulant | Chaque midi, un <ins>barrage roulant</ins> dans la <ins>musette</ins> : trois salves de 75 qui avancent de 30 m en 30 m vers eux, toutes les 8 s ; on fait marcher un régiment derrière | Le matin et à midi | — | `barrageRoulant` | É |
| Le cuirassé | Une fois par partie, l'<ins>obus de 400</ins> dans la <ins>musette</ins> : quatre barrages de 220 au même endroit (24 obus) | Deux fois par partie | — | `obus400` | M |

## Les largages

| Carte | Niveau I : ce qu'on voit | Niveau II | Niveau III | S'appuie sur | Rareté |
|---|---|---|---|---|---|
| Les coureurs | Quand une <ins>caisse</ins> descend, nos 5 <ins>coureurs</ins> courent deux fois plus vite que les leurs | Nos coureurs sont 10 au lieu de 5 | Ils partent de deux fois plus loin (320 m au lieu de 160) | `brodequins`, `LARGAGE.coureurs`, `LARGAGE.rayonCourse` | C |
| Le pilote ami | Un <ins>avion de largage</ins> de plus chaque jour ; sa <ins>caisse</ins> tombe du côté de nos lignes (Jérôme, 25 nov.) | Deux avions de plus | — | `LARGAGE.intervalle` | PC |
| La bonne étoile | Chaque jour, une <ins>caisse</ins> tombe du côté de nos lignes (Jérôme, 25 nov.) ; les objets des caisses montent d'une <ins>rareté</ins> (un commun devient peu commun, un épique légendaire) | Deux raretés | — | `RARETES` | É |
| La pluie de caisses en poche | Une fois par partie, quand on veut (dans la <ins>musette</ins>) : la <ins>pluie de caisses</ins>, cinq avions qui larguent cinq caisses le long du front | Deux fois par partie | Une fois par jour | caprice `pluieCaisses` | L |

## Les caprices en poche (on les déclenche, pour nous)

Un caprice en poche est un objet de la <ins>musette</ins> : il se déclenche avec les touches 7-8-9 comme un barrage.

| Carte | Niveau I : ce qu'on voit | Niveau II | Niveau III | S'appuie sur | Rareté |
|---|---|---|---|---|---|
| Les héros | Chaque matin, un de nos hommes de <ins>première ligne</ins> devient <ins>invincible</ins> pendant 3 h et charge seul leur tranchée, avec des <ins>balles sûres</ins>. Eux n'ont pas de héros (le <ins>caprice</ins> ordinaire en donne un à chaque camp) | Deux héros chaque matin | Trois héros, qui chargent ensemble | caprice `heros` | PC |
| Notre zeppelin | Une fois par jour, on envoie le <ins>zeppelin</ins> : il traverse lentement le front, bas, et lâche une bombe (comme un obus de 155) toutes les 3 s sur leurs tranchées | Deux fois par jour | — | caprice `zeppelin` | É |
| Notre as | Une fois par jour, on envoie l'<ins>as</ins> : il passe trois fois au-dessus de leurs lignes en mitraillant ; son avion est six fois plus solide qu'un autre ; abattu, il tombe avec une <ins>caisse</ins> légendaire | Six passages au lieu de trois | — | caprice `as` | É |
| L'éclipse | Une fois par partie, quand on veut : la nuit tombe en plein jour pendant 1 h 30 ; leurs régiments s'arrêtent, les nôtres obéissent toujours | Deux fois par partie | — | caprice `eclipse` | R |
| La mine | Une fois par partie, on clique une de leurs tranchées : elle saute (un <ins>cratère</ins> géant, un tronçon rasé, une brèche ouverte) | Deux mines | — | caprice `mine` | L |
| Le tremblement de terre | Une fois par partie, quand on veut : le front tremble, des tranchées **des deux camps** s'effondrent au hasard et ensevelissent leurs hommes ; l'avantage, c'est de choisir le moment (eux en pleine marche, nous à l'abri) | Seules **leurs** tranchées s'effondrent | — | caprice `seisme` | M |

## Les hommes et la vue à la personne

| Carte | Niveau I : ce qu'on voit | Niveau II | Niveau III | S'appuie sur | Rareté |
|---|---|---|---|---|---|
| Le porte-bonheur | L'homme qu'on prend <ins>à la personne</ins> court deux fois plus vite sans se fatiguer et tire trois fois plus vite, tant qu'on est dans ses yeux | Ses dix premières balles de chaque jour sont des <ins>balles sûres</ins> | — | `brodequins`, `cartouches`, `lunette` | C |
| Le Lebel à lunette | L'homme qu'on prend <ins>à la personne</ins> a chaque jour vingt <ins>balles sûres</ins> qui portent jusqu'à 400 m | Quarante balles | — | `lunette` | R |
| Le fusil du canonnier | L'homme qu'on prend <ins>à la personne</ins> a chaque jour douze coups où chaque balle est un obus de 75 qui tombe là où elle va | Vingt-quatre coups | — | `canonnier` | L |
| Le clairon | Chaque matin, le premier régiment à qui l'on donne un ordre a le <ins>clairon</ins> pendant 4 h : il court une fois et demie plus vite et il est <ins>sans peur</ins> | Les deux premiers régiments | — | `clairon` | PC |
| Les grenadiers | Au <ins>premier assaut du jour</ins>, chaque homme du régiment lance trois grenades sur ceux d'en face à moins de 30 m | Aux deux premiers assauts | — | `citrons` | R |
| Le lance-flammes | Au <ins>premier assaut du jour</ins>, un homme du régiment reçoit un <ins>lance-flammes</ins> pendant 1 h : il crache le feu à 15 m devant lui, ceux d'en face y brûlent ou s'enfuient | Deux hommes du régiment | Aux deux premiers assauts, deux hommes chaque fois | `lanceflammes` | É |
| Le drapeau | Une fois par partie, un <ins>drapeau</ins> dans la <ins>musette</ins>, à planter où l'on veut : pendant 6 h, le régiment perd quatre fois moins d'hommes, ne part plus en <ins>déroute</ins> et tire une fois et demie plus vite, nos régiments à 50 m aussi ; à la fin, ses blessés se relèvent. Un homme d'en face qui l'atteint l'arrache | Deux drapeaux par partie | — | `drapeau` | L |
| Les renforts du soir | Chaque soir, dix hommes (une <ins>demi-section</ins>) rejoignent notre régiment qui a le moins d'hommes | Vingt hommes (une section) | Quarante hommes (une compagnie) | `demiSection`, `section`, `compagnie` | C |
| Les taxis de la Marne | Une fois par partie, quand on veut : deux <ins>régiments frais</ins> se déploient tout de suite, sans rien prendre à la <ins>réserve</ins> | — | — | `taxi` | M |

## Les engins et les armes

| Carte | Niveau I : ce qu'on voit | Niveau II | Niveau III | S'appuie sur | Rareté |
|---|---|---|---|---|---|
| Le mécanicien | Chaque matin, nos <ins>chars</ins>, sur le champ et au <ins>parc</ins>, sont réparés | Le matin et à midi | — | `outils` | C |
| Le blindage | Nos <ins>chars</ins> ont deux fois plus de points de vie, toute la campagne | Trois fois plus | — | `blindage` | R |
| Les balles incendiaires | Les mitrailleuses de nos avions tuent deux fois plus, toute la campagne | Trois fois plus | — | `incendiaires` | PC |
| Les bombes Aasen | À chaque vol de nos avions, quatre <ins>bombes Aasen</ins> (comme des obus de 155) tombent sur leur passage | Huit bombes | — | `aasen` | R |
| L'escadrille | Deux avions de plus à l'<ins>aérodrome</ins>, toute la campagne | Quatre avions de plus | — | `escadrille` | É |
| La cheddite | Chaque matin, leur <ins>fil de fer</ins> saute sur 60 m devant notre régiment le plus avancé (une brèche pour passer) | 120 m | Devant nos deux régiments les plus avancés | `cheddite` | C |
| Le nid du matin | Chaque matin, un <ins>nid de mitrailleuse</ins> est posé sur notre <ins>première ligne</ins>, devant notre régiment le plus avancé | Deux nids | — | `hotchkiss` | R |

## Maudites (un gros bonus, un défaut visible)

| Carte | Niveau I : ce qu'on voit | Niveau II | Niveau III | S'appuie sur | Rareté |
|---|---|---|---|---|---|
| Les artilleurs ivres | Chaque matin, deux <ins>barrages de 155</ins> dans la <ins>musette</ins> ; **mais** chaque jour, un <ins>tir trop court</ins> : un barrage de 155 tombe sur notre <ins>première ligne</ins>, sans prévenir | Trois barrages le matin ; toujours un seul tir court | — | `fuseeVerte`, caprice `tirCourt` | C |
| Le vent qui tourne | Une fois par jour, on lâche la <ins>nappe de gaz</ins> depuis nos lignes ; **mais** le vent est tiré au hasard : elle peut revenir sur nous | Deux fois par jour | — | caprice `gaz` | PC |
| Le général à cheval | Nos régiments sont <ins>sans peur</ins>, toute la campagne ; **mais** chaque jour, un de nos régiments reçoit un <ins>ordre absurde</ins> : il sort seul à l'assaut et l'on ne peut ni l'arrêter ni le commander pendant 2 h | Le régiment qui sort a le <ins>clairon</ins> | — | `intrepide`, caprice `ordreAbsurde` | R |
| Les chars fous | Chaque matin, un <ins>char</ins> neuf de plus ; **mais** il sort tout seul et fonce droit sur leur première ligne, sans ordre | Deux chars chaque matin | — | `ft`, caprice `charsPerdus` | R |

35 cartes. Les **pistes** d'un run : **la musette** (le dépôt, le train de munitions, la musette profonde, les artilleurs ivres), **à la personne** (le porte-bonheur, le Lebel à lunette, le fusil du canonnier), **les caprices en poche** (le zeppelin, l'as, la mine, l'éclipse), **les engins** (le blindage, l'escadrille, les bombes Aasen, le mécanicien).

## Le glossaire du survol

Ce que dit la bulle quand on survole un terme souligné. Une ligne, des chiffres ; une icône quand le jeu en a déjà une (celles des catégories de `CATEGORIES` et des caprices).

**L'image (Jérôme, 26 nov.)** : en production, chaque bulle montre une image au-dessus de sa ligne : une capture de l'interface (un bouton, une barre, une fenêtre) ou une capture du jeu (le zoom est indiqué) qui montre la chose telle que le joueur la verra. Les images se tirent du jeu lui-même, à graine fixe (un script de captures, comme `outils/captures.mjs`), pour être refaites quand l'écran change ; elles sont en basse résolution, à la palette du jeu.

| Terme | La bulle | L'image de la bulle |
|---|---|---|
| <ins>musette</ins> | Ce que vous gardez pour plus tard : 3 objets au plus, lancés avec les touches 7, 8, 9 puis un clic sur le terrain | Capture de l'interface : les trois emplacements de la musette au-dessus du râtelier, un objet dans chacun (liseré de rareté), les chiffres 7, 8, 9 |
| <ins>salve de 75</ins> | 24 petits obus en quelques secondes, là où l'on clique ; tue les hommes à découvert, abîme peu les tranchées | Le jeu, zoom 4 : une salve de 75 qui tombe sur des hommes à découvert, petites gerbes serrées |
| <ins>barrage de 155</ins> | 12 obus moyens ; creuse le sol, abîme les tranchées | Le jeu, zoom 4 : un barrage de 155 sur une tranchée, des cratères moyens dans le parapet |
| <ins>barrage de 220</ins> | 6 gros obus ; chacun crève une tranchée et laisse un cratère | Le jeu, zoom 4 : la même tranchée après un 220, coupée par un grand cratère |
| <ins>barrage roulant</ins> | Trois salves de 75 qui avancent de 30 m toutes les 8 s ; une troupe qui marche juste derrière arrive sur des tranchées sonnées | Le jeu, zoom 2 : trois lignes d'explosions qui avancent, un régiment qui marche derrière (une flèche montre le sens) |
| <ins>obus de 400</ins> | L'obus mythique : quatre barrages de 220 au même endroit | Le jeu, zoom 2 : le champ après l'obus de 400, un trou béant au milieu des lignes |
| <ins>caisse</ins> | Un avion la largue au-dessus du no man's land ; le premier homme, d'un camp ou de l'autre, qui l'atteint prend l'objet | Le jeu, zoom 8 : une caisse sous son parachute, puis l'objet qui flotte sous sa flèche de couleur |
| <ins>coureurs</ins> | Les 5 hommes de chaque camp, à moins de 160 m, qui courent vers une caisse qui descend | Le jeu, zoom 4 : des hommes des deux camps qui courent vers une caisse qui descend |
| <ins>avion de largage</ins> | L'avion qui lâche les caisses : un toutes les 3 à 5 heures du jour | Le jeu, zoom 4 : l'avion de largage au-dessus du no man's land, la caisse qui se détache ; à côté, l'annonce à l'écran |
| <ins>rareté</ins> | Commun, peu commun, rare, épique, légendaire, mythique : la couleur de la flèche au-dessus de l'objet | Planche : les six flèches de rareté côte à côte, de commun à mythique, avec leur nom |
| <ins>pluie de caisses</ins> | Cinq avions à la suite, cinq caisses le long du front, cinq courses en même temps | Le jeu, dézoomé : cinq parachutes le long du front ; à côté, le bandeau du caprice |
| <ins>caprice</ins> | Un événement par jour, annoncé 12 s avant ; d'habitude il tombe au hasard sur un camp | Capture de l'interface : l'annonce d'un caprice (icône, nom, compte à rebours de 12 s) |
| <ins>première ligne</ins> | La tranchée la plus proche de l'ennemi | Le jeu, zoom 2 : nos tranchées, la plus proche de l'ennemi entourée |
| <ins>invincible</ins> | Les balles et les obus ne le blessent pas | Le jeu, zoom 8 : un héros qui court sous les balles, l'icône du boost au-dessus de lui |
| <ins>balles sûres</ins> | Chaque balle tue celui qu'elle vise | Capture de l'interface : la fiche d'un homme avec le Lebel à lunette et le compte des balles qui restent |
| <ins>zeppelin</ins> | Un dirigeable lent et bas qui traverse le front en lâchant ses bombes (comme des 155) ; on peut l'abattre | Le jeu, zoom 4 : le zeppelin bas au-dessus des tranchées, des bombes qui tombent |
| <ins>as</ins> | Un pilote d'élite : trois passages de mitrailleuse, un avion six fois plus solide | Le jeu, zoom 4 : l'avion de l'as en rase-mottes, la traînée de ses rafales au sol |
| <ins>cratère</ins> | Un trou d'obus ; un grand cratère ouvre un passage dans la tranchée, et l'eau y monte s'il pleut | Le jeu, zoom 8 : un grand cratère qui coupe une tranchée, de l'eau au fond |
| <ins>à la personne</ins> | Le bouton « À la personne » de la fiche d'un homme : on voit par ses yeux, on le fait marcher, viser et tirer soi-même | Deux captures côte à côte : le bouton « À la personne » de la fiche d'un homme, puis la vue par ses yeux |
| <ins>clairon</ins> | Le régiment court une fois et demie plus vite et n'a plus peur | Le jeu, zoom 4 : un régiment qui charge, l'icône du clairon au-dessus ; sa barre dans la rangée des régiments |
| <ins>sans peur</ins> | Le régiment ne recule jamais sous le feu et ne part pas en déroute | Capture de l'interface : la barre de moral d'un régiment, marquée sans peur (pleine, verrouillée) |
| <ins>déroute</ins> | Un régiment brisé fuit vers l'arrière et n'obéit plus jusqu'à ce qu'il se reforme | Le jeu, zoom 4 : un régiment en déroute qui reflue vers l'arrière ; sa carte de régiment marquée « en déroute » |
| <ins>premier assaut du jour</ins> | Le premier régiment envoyé, ce jour-là, au-delà de notre première ligne (dans le no man's land ou chez eux) | Schéma sur une capture dézoomée : notre première ligne en trait, la flèche d'un régiment qui la franchit |
| <ins>lance-flammes</ins> | Le lance-flammes Schilt, l'arme française de 1915 : un jet de feu à 15 m, deux fois par seconde | Le jeu, zoom 8 : un homme qui crache le feu dans une tranchée ennemie |
| <ins>drapeau</ins> | Planté, il tient le régiment autour de lui ; si un homme d'en face l'atteint, il l'arrache | Le jeu, zoom 8 : le drapeau planté, le cercle de 50 m autour, les régiments qu'il touche |
| <ins>demi-section</ins> | Dix hommes ; une section en fait vingt, une compagnie quarante | Planche : 10, 20, 40 silhouettes en rang, sous les mots demi-section, section, compagnie |
| <ins>régiments frais</ins> | Des régiments complets, reposés, qui n'ont pas encore combattu | Le jeu, zoom 4 : un régiment frais qui sort de la caserne, sa carte de régiment pleine |
| <ins>réserve</ins> | Les régiments frais qui attendent à la caserne ; on les envoie pour relever un régiment épuisé | Capture de l'interface : la caserne ouverte, la liste des régiments en réserve |
| <ins>chars</ins> | Nos chars FT : on les envoie depuis le parc vers leurs lignes ; ils tirent au canon | Le jeu, zoom 8 : un char FT de notre camp qui avance vers leurs lignes |
| <ins>parc</ins> | Le bâtiment du camp où attendent et se réparent les chars | Capture de l'interface : la fenêtre du parc, la liste des chars (déployés, au parc, détruits) |
| <ins>bombes Aasen</ins> | Des bombes à main lâchées par nos aviateurs | Le jeu, zoom 4 : un de nos avions qui lâche ses bombes, les explosions sur son passage |
| <ins>aérodrome</ins> | Le bâtiment du camp d'où partent nos avions | Capture de l'interface : la fenêtre de l'aérodrome, la liste de nos avions |
| <ins>fil de fer</ins> | Les barbelés devant leurs tranchées : un homme qui les traverse va au pas, à découvert | Le jeu, zoom 8 : les barbelés devant leur tranchée, avec une brèche ouverte par la cheddite |
| <ins>nid de mitrailleuse</ins> | Une mitrailleuse Hotchkiss dans un abri : elle balaie le no man's land devant elle | Le jeu, zoom 8 : un nid Hotchkiss sur notre tranchée, son cône de tir ; à côté, sa fiche |
| <ins>tir trop court</ins> | Notre artillerie se trompe de réglage : un barrage tombe sur nos propres hommes | Le jeu, zoom 4 : un barrage qui tombe sur notre propre tranchée, l'annonce du caprice à côté |
| <ins>nappe de gaz</ins> | Un nuage de chlore qui dérive avec le vent 2 h ; ceux qui sont dedans ne tirent plus, fuient ou tombent | Le jeu, zoom 2 : le nuage de gaz qui dérive, une flèche pour le vent |
| <ins>ordre absurde</ins> | L'état-major envoie un régiment à l'assaut, tout de suite ; pendant 2 h, on ne peut plus lui donner d'ordre | Le jeu, zoom 4 : un de nos régiments qui sort seul ; sa carte de régiment marquée verrouillée (cadenas, 2 h) |

Le survol se construit une fois pour toutes (un module : le terme, sa bulle), et sert aussi aux fiches des objets et aux bandeaux des caprices.

## Ce qu'un joueur neuf ne comprend pas (relecture du 25 nov.)

En lisant les cartes comme quelqu'un qui découvre le jeu :

1. **« Au premier assaut du jour, un homme du régiment porte le Schilt »** : trois inconnues. « Schilt » est le nom d'un lance-flammes français de 1915 : la carte dit maintenant « lance-flammes » et le nom passe dans la bulle. « Le premier assaut du jour » n'existe pas en jeu : il faut une règle (proposée : le premier régiment envoyé au-delà de notre première ligne ce jour-là). « Porte » ne dit pas l'effet : la carte dit maintenant 1 h, 15 m, brûlent ou fuient. Même chose pour « Les grenadiers ».
2. **« L'homme qu'on incarne »** : le joueur ne sait pas qu'on peut voir par les yeux d'un homme. Le terme devient « à la personne », le nom du bouton de la fiche, souligné. Et la carte doit dire ce qui se passe si on n'y va jamais : rien (c'est une piste de jeu, pas un bonus pour tous).
3. **Les calibres (75, 155, 220, 400)** ne parlent à personne : la carte donne le nombre d'obus, la bulle dit ce que fait chacun (tue / creuse / crève une tranchée).
4. **Les caisses sont à tout le monde** : « Le pilote ami » et « La bonne étoile » donnent aussi des caisses (et de meilleures) à l'ennemi, s'il court plus vite. Écrit tel quel, le joueur croit que les caisses sont les siennes. À trancher : la caisse du pilote ami tombe du côté de nos lignes (un paramètre de largage, pas une mécanique), ou la carte dit franchement « pour le premier qui y court ».
5. **« La musette profonde »** : 5 objets, mais la musette n'a que trois touches (7, 8, 9). Il faut une touche de plus (0 ?) ou que la musette fasse défiler ses objets.
6. **« Le tremblement de terre »** frappe les deux camps : sans le dire, le joueur ne voit pas pourquoi le prendre. La carte le dit ; le niveau II le rend à nous seuls (le caprice tire déjà ses tranchées : il suffit de filtrer le camp).
7. **« Les héros (eux n'en ont pas) »** : la parenthèse supposait qu'on connaisse le caprice ordinaire. Dit en clair.
8. **Les noms qui ne disent pas l'effet** : « Le porte-bonheur » (on attend de la chance, c'est de la vitesse) et « Le cuirassé » (on attend un navire, c'est l'obus de 400). Proposé : « Les brodequins » et « Le 400 de Douaumont ».
9. **« Chaque matin, dans la musette »** quand la musette est pleine : l'objet est-il perdu ? Le joueur ne le saura pas. À dire sur la carte, ou l'objet attend qu'une place se libère.

## Le niveau III

Possible, mais pas partout :

- **Le compte** : une bataille de 10 à 15 soirs, 3 cartes par soir, un paquet de ~20 cartes au départ. Tirer une carte trois fois et la garder trois fois n'arrive qu'à celui qui suit une piste : c'est une récompense, pas la règle. Le niveau III ne pèse donc pas sur l'équilibre ordinaire.
- **Là où il marche** : quand le jeu a déjà une marche visible au-dessus (les renforts : demi-section, section, compagnie ; le dépôt : 75 puis 155 ; la cheddite : un puis deux régiments ; les coureurs : plus vite, plus nombreux, plus loin). Le joueur voit le saut.
- **Là où il casse** : un « une fois par partie » mythique passé à trois (trois obus de 400, trois tremblements) devient le jeu entier ; un « deux fois plus » passé à « quatre fois plus » redevient un pourcentage. Ces cartes s'arrêtent au niveau II.
- **Décidé (Jérôme, 25 nov.)** : niveau II pour toutes (sauf les taxis), niveau III pour sept cartes (le dépôt, les coureurs, la pluie de caisses, les héros, le lance-flammes, les renforts du soir, la cheddite). Une carte au plus haut niveau ne revient plus dans les tirages.

## Retirées de la première liste (elles demandaient une mécanique absente)

Les obus rebondissants, l'entonnoir, le dépôt qui saute, la mine de Messines en trois nuits (le joueur ne voit pas le résultat : remplacée par « La mine », le caprice), le barrage qui marche, le tremblement sur commande (remplacé par le caprice), les taupes, la forêt de Birnam, les cyclistes, la roulante, les pigeons, les chiens, les éléphants (les canons n'ont pas de place sur le terrain), la cavalerie, le char-tortue, le train blindé, l'écluse, le gel, l'as aveugle, le cinéaste, le faiseur de pluie, l'œil du tireur (le ralenti). Certaines pourront revenir **le jour où leur mécanique existe** (une particularité de campagne, un boss) : on ajoute alors la mécanique d'abord, la carte ensuite.

## Décidé le 26 nov. (Jérôme)

- Les paquets (trois à choisir, 3 à 5 cartes, mat / brillant / rose), les six raretés de carte et leurs matières, l'ouverture qu'on déchire : voir « Le modèle » en tête.
- La rareté remplace les niveaux II et III : une carte tirée de nouveau prend la rareté au-dessus.
- Le dessin de carte : l'étiquette.

## Décidé le 25 nov. (Jérôme)

- Le niveau III : sur les sept cartes proposées seulement (remplacé le 26 nov. par la rareté).
- Les caisses du pilote ami et de la bonne étoile tombent du côté de nos lignes (un réglage du largage).
- La musette profonde : des touches à la suite de 7, 8, 9 (0, puis une cinquième).

## Ce qui reste à décider

- Les familles de paquets (trois, ou plus et trois tirées chaque soir) ; les chances d'un paquet mat, brillant, rose ; les chances des raretés dans un paquet (proposé : celles des caisses, 50, 25, 13, 7, 4, 1 sur 100).
- Une carte mythique tirée de nouveau (elle ne peut plus monter) : remplacée par une autre, ou un bonus.
- Le tri de la liste et le paquet de départ (proposé : ~20 cartes ; les autres se débloquent par les campagnes finies).
- La cinquième touche de la musette profonde (7, 8, 9, 0, puis laquelle ?), et l'objet du matin quand la musette est pleine (point 9).
- La règle du « premier assaut du jour » (point 1).
- Le bouton qui déclenche un caprice en poche (la musette, touches 7-8-9, est l'endroit naturel).
