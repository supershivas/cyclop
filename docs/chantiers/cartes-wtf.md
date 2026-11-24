# Les cartes du soir (proposition, 24 nov. ; rien n'est construit)

Décidé (Jérôme, 24 nov., v0.169.0) : le soir, **3 cartes tirées, on en garde une**, jusqu'à la fin de la campagne ; une carte déjà tenue, tirée de nouveau, passe au **niveau II** (deux fois plus souvent, ou deux fois plus fort). Une carte change ce qu'on voit en jeu, jamais « +5 % ». Raretés : celles des largages (`RARETES` de `data/largages.js`) : C commun, PC peu commun, R rare, É épique, L légendaire, M mythique. Les cartes **maudites** donnent un gros bonus contre un défaut visible.

**Règle de la liste (Jérôme, 24 nov.)** : une carte ne s'appuie **que sur ce qui existe en jeu** : les effets des objets parachutés (`e` de `OBJETS`, `data/largages.js` : tir, vitesse, portée, balles sûres, invincible, sans peur, grenades, pertes, hommes, régiments, `tirs` de la musette, avions, chars, fil, flammes, nid, tromblon) et les caprices (`data/caprices.js`). Une carte est donc **un objet qui revient** (chaque matin, à chaque vol, au premier assaut) ou **un caprice qu'on déclenche soi-même** (une fois par jour ou par partie, dans la musette). Rien qui demande une mécanique nouvelle (première liste retirée : voir en bas).

## La musette et l'artillerie

| Carte | Effet | S'appuie sur | Rareté |
|---|---|---|---|
| Le dépôt | chaque matin, une salve de 75 dans la musette | `fuseeRouge` | C |
| La musette profonde | la musette garde 5 objets au lieu de 3 | `LARGAGE.musette` | PC |
| Le train de munitions | chaque matin, un barrage de 220 dans la musette | `obus220` | R |
| Le barrage roulant | chaque midi, un barrage roulant dans la musette | `barrageRoulant` | É |
| Le cuirassé | une fois par partie, l'obus de 400 dans la musette | `obus400` | M |

## Les largages

| Carte | Effet | S'appuie sur | Rareté |
|---|---|---|---|
| Les coureurs | nos coureurs vers les caisses vont deux fois plus vite | `brodequins`, `LARGAGE.coureurs` | C |
| Le pilote ami | un avion de largage de plus chaque jour | `LARGAGE.intervalle` | PC |
| La bonne étoile | la rareté de nos caisses monte d'un cran | `RARETES` | É |
| La pluie de caisses en poche | une fois par partie, on déclenche la pluie de caisses quand on veut | caprice `pluieCaisses` | L |

## Les caprices en poche (on les déclenche, pour nous)

| Carte | Effet | S'appuie sur | Rareté |
|---|---|---|---|
| Les héros | chaque matin, un de nos hommes devient invincible et charge seul (eux n'en ont pas) | caprice `heros` | PC |
| Notre zeppelin | une fois par jour, on envoie le zeppelin sur leurs lignes | caprice `zeppelin` | É |
| Notre as | une fois par jour, l'as mitraille leurs lignes | caprice `as` | É |
| L'éclipse | une fois par partie, la nuit tombe en plein jour quand on veut | caprice `eclipse` | R |
| La mine | une fois par partie, on choisit la tranchée sous laquelle elle saute | caprice `mine` | L |
| Le tremblement de terre | une fois par partie, quand on veut | caprice `seisme` | M |

## Les hommes et la vue à la personne

| Carte | Effet | S'appuie sur | Rareté |
|---|---|---|---|
| Le porte-bonheur | l'homme qu'on incarne court deux fois plus vite et tire trois fois plus vite | `brodequins`, `cartouches` | C |
| Le Lebel à lunette | l'homme qu'on incarne a vingt balles sûres à 400 m chaque jour | `lunette` | R |
| Le fusil du canonnier | l'homme qu'on incarne : chaque balle est un 75, douze par jour | `canonnier` | L |
| Le clairon | chaque matin, le premier régiment qui sort a le clairon (vitesse, sans peur) | `clairon` | PC |
| Les grenadiers | au premier assaut du jour, le régiment lance ses grenades | `citrons` | R |
| Le lance-flammes | au premier assaut du jour, un homme du régiment porte le Schilt | `lanceflammes` | É |
| Le drapeau | une fois par partie, un drapeau à planter où l'on veut | `drapeau` | L |
| Les renforts du soir | chaque soir, dix hommes rejoignent le régiment le plus éprouvé | `demiSection` | C |
| Les taxis de la Marne | une fois par partie, deux régiments frais, tout de suite | `taxi` | M |

## Les engins et les armes

| Carte | Effet | S'appuie sur | Rareté |
|---|---|---|---|
| Le mécanicien | chaque matin, nos chars sont réparés | `outils` | C |
| Le blindage | nos chars ont deux fois plus de points de vie, toute la campagne | `blindage` | R |
| Les balles incendiaires | nos avions tuent deux fois plus, toute la campagne | `incendiaires` | PC |
| Les bombes Aasen | à chaque vol de nos avions, quatre bombes | `aasen` | R |
| L'escadrille | deux avions de plus, toute la campagne | `escadrille` | É |
| La cheddite | chaque matin, leur fil saute sur 60 m devant notre régiment le plus avancé | `cheddite` | C |
| Le nid du matin | chaque matin, un nid de mitrailleuse posé sur notre première ligne | `hotchkiss` | R |

## Maudites (un gros bonus, un défaut visible)

| Carte | Effet | S'appuie sur | Rareté |
|---|---|---|---|
| Les artilleurs ivres | chaque matin, deux barrages de 155 dans la musette ; chaque jour, un tir trop court sur nos lignes | `fuseeVerte`, caprice `tirCourt` | C |
| Le vent qui tourne | une fois par jour, on lâche la nappe de gaz depuis nos lignes ; le vent est tiré au hasard | caprice `gaz` | PC |
| Le général à cheval | nos régiments n'ont jamais peur ; chaque jour, l'un d'eux sort tout seul (l'ordre absurde, chez nous seulement) | `intrepide`, caprice `ordreAbsurde` | R |
| Les chars fous | un char de plus chaque matin, qui sort tout seul et fonce sans ordre | `neuf`, caprice `charsPerdus` | R |

35 cartes. Les **pistes** d'un run : **la musette** (le dépôt, le train de munitions, la musette profonde, les artilleurs ivres), **à la personne** (le porte-bonheur, le Lebel à lunette, le fusil du canonnier), **les caprices en poche** (le zeppelin, l'as, la mine, l'éclipse), **les engins** (le blindage, l'escadrille, les bombes Aasen, le mécanicien).

## Retirées de la première liste (elles demandaient une mécanique absente)

Les obus rebondissants, l'entonnoir, le dépôt qui saute, la mine de Messines en trois nuits (le joueur ne voit pas le résultat : remplacée par « La mine », le caprice), le barrage qui marche, le tremblement sur commande (remplacé par le caprice), les taupes, la forêt de Birnam, les cyclistes, la roulante, les pigeons, les chiens, les éléphants (les canons n'ont pas de place sur le terrain), la cavalerie, le char-tortue, le train blindé, l'écluse, le gel, l'as aveugle, le cinéaste, le faiseur de pluie, l'œil du tireur (le ralenti). Certaines pourront revenir **le jour où leur mécanique existe** (une particularité de campagne, un boss) : on ajoute alors la mécanique d'abord, la carte ensuite.

## Ce qui reste à décider

- Le tri de la liste et le paquet de départ (proposé : ~20 cartes ; les autres se débloquent par les campagnes finies).
- Le niveau II de chaque carte (deux fois plus souvent, ou plus fort).
- Le bouton qui déclenche un caprice en poche (la musette, touches 7-8-9, est l'endroit naturel).
