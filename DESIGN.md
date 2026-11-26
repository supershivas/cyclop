# Cyclopéen — Bible du jeu

Document de référence. Il décrit **l'intention** : ce que le jeu est et veut
être. La technique est dans `CLAUDE.md`. Les décisions de Jérôme sont datées par
version (« Jérôme, v0.1.0 ») ; les propositions pas encore tranchées portent
`[À VALIDER]`. Ce qui est décidé mais pas construit le dit (« pas construit »).

## Intention

On commande un secteur du front, en 1914-18 : des milliers d'hommes, un terrain
qui se transforme. Les obus creusent, la pluie fait la boue, l'eau monte dans les
trous, les arbres tombent. À tout moment, on **saute dans un homme**, un char,
un avion ou une mitrailleuse, et l'on voit la bataille à hauteur d'œil. Et le
front devient absurde : un zeppelin à soi, une mine qu'on fait sauter quand on
veut, un fusil dont chaque balle est un obus.

**La promesse (Jérôme, 24 nov., v0.169.0) : destruction, folie, immersion.**
Ce qui plaît : la destruction, les vues à la personne, les améliorations WTF.
Ce qui ne plaît pas : l'interface complexe, les statistiques trop nombreuses, les
résumés de fin de journée. Le ton reste celui de la danse macabre (la mort mène la
ronde, la catastrophe peinte avec calme, Brosio, Nussbaum), mais le jeu peut être
épique et drôle.

Le public : les joueurs d'itch.io, en navigateur ou en téléchargement, qui doivent
comprendre en cinq minutes, sans manuel.

## Deux éditions, un seul code (Jérôme, 24 nov., v0.169.0 ; pas construit)

- **L'édition itch.io** : tout ce que décrit ce document comme « cible » (les
  cartes du soir, la campagne en arbre, le premier jour guidé, l'écran allégé),
  sans jeu à deux. C'est elle qui sort.
- **Le jeu actuel** : la soirée en trois étapes, les arbres du camp, la campagne
  fixe, **le jeu à deux tel qu'il est** (Jérôme).

On choisit l'édition sur l'écran d'accueil (ou par l'adresse `/itch/`). Le moteur
(terrain, foule, tranchées, rendu, vues à la personne, largages, caprices) est
commun : une correction vaut pour les deux. Pas de branche git ni de copie du code
(deux moteurs divergeraient : chaque correction à fusionner, `main.js` en
conflit). Règles : `ROADMAP.md`, « Garde-fous ».

## Piliers (Jérôme, 24 nov., v0.169.0)

1. **Le terrain est le récit.** Ce qui s'est passé se lit dans le sol : cratères,
   boue, eau, arbres abattus. Rien ne s'efface tout seul.
2. **La destruction est un spectacle.** Chaque obus, chaque mine, chaque engin
   laisse une trace qu'on a envie de regarder.
3. **On saute dans un homme.** La vue à la personne est au centre du jeu, pas un
   bonus caché : une touche, un bouton, dès la première partie.
4. **Le front est fou.** Les cartes du soir, les largages et les caprices rendent
   chaque run différent et racontable.
5. **Lisible d'un coup d'œil.** On visualise (barres, tuiles, icônes) ; peu de
   chiffres à l'écran, aucun bloc de texte, pas de résumé à lire.
6. **La foule est un personnage** (les frères de Witt) : on commande des
   régiments, on regarde des milliers d'hommes.

Abandonnés (Jérôme, 24 nov. : « pas importants, peuvent être changés ») : « les
pertes sont la monnaie » (le compteur reste, il n'est plus le cœur du jeu) et
« pas de tutoriel ».

## La boucle de jeu (cible, Jérôme, 24 nov. ; pas construite)

- **Seconde** : choisir un régiment, l'envoyer, viser un barrage, sauter dans un
  homme ; arrêter le temps (pause active).
- **Jour** (5 à 8 minutes) : offensives, barrages, largages, le caprice du jour.
- **Soir** : **3 cartes tirées, on en garde une** (« Les cartes du soir »). Plus de
  résumé, plus de moments du jour, plus d'arbres ni de paquets d'hommes.
- **Partie** : **1 à 5 jours** sur un secteur, une mission (réglage fin plus tard).
- **Campagne** : **3 à 5 parties** enchaînées sur un arbre de progression tiré à
  la création (« La campagne »).
- **D'une campagne à l'autre** : des cartes nouvelles débloquées pour de bon, la
  vitrine qui se remplit, des niveaux de galons (difficulté).

Aujourd'hui (v0.169.0) : une bataille dure 10 à 15 jours, la soirée a trois
étapes (`hud/soiree.js`), la campagne enchaîne trois secteurs fixes
(`data/campagne.js`).

## Apprendre à jouer (Jérôme, 24 nov. ; pas construit)

Le **premier jour de la première partie est guidé** : quatre ou cinq consignes
d'une ligne, au moment où elles servent (choisir, marcher, barrage, sauter dans un
homme), qui s'effacent seules et se coupent dans les réglages. Les systèmes
arrivent un par un (la partie 1 n'a ni chars, ni avions, ni gaz).

## L'écran (Jérôme, 24 nov. ; pas construit)

Dans l'édition itch, à l'écran pendant la bataille : l'**objectif**, les
**effectifs**, la **musette**. Le moral, l'expérience, le détail d'un tronçon
passent au survol. Pas de jeu à deux dans cette édition (il reste dans le jeu
actuel).

## La campagne (Jérôme, 24 nov. ; pas construite)

À la création, la graine tire, **sans le montrer** : le **général adverse** (un
nom, une doctrine : artilleur, sapeur, gazeur, cavalier, prudent), le **boss**,
l'**ordre d'apparition des mécaniques** (chars, avions, gaz, mines, nuit, eau),
**une particularité par partie** et les **branches** entre les parties.

- **Au départ** : on choisit **1 doctrine parmi 3** (« Artilleur : un 155 de plus,
  un régiment de moins ») ; on voit **le boss**, annoncé dès le début, pour préparer
  ses cartes contre lui.
- **Entre deux parties** : 2 ou 3 secteurs au choix ; on voit leur terrain et leur
  récompense ; la particularité, l'élite et la mécanique nouvelle restent cachées
  jusqu'au premier matin.
- **Le général adverse apprend** : à chaque partie, il contre ce qu'on a le plus
  utilisé (beaucoup d'artillerie : il creuse plus profond).
- **Ce qui passe d'une partie à l'autre** : les cartes ; les régiments survivants,
  leurs vétérans et leurs pertes (un régiment décimé revient faible, ou on le
  change pour un frais mais novice).

| Partie | Taille | Ce qui revient | Ce qui change d'un run à l'autre |
|---|---|---|---|
| 1. L'arrivée | 2 régiments contre 2, petite carte (~250 × 180), été ou couvert, 1-2 jours, l'infanterie et le 75 | la forme, le guidage | **une particularité** parmi une douzaine : un village, une rivière et son pont, un char abandonné, un as qui passe, la pleine lune, un cimetière, une ferme fortifiée, un dépôt à prendre, un brouillard du matin |
| 2. Le front | 3 contre 3, carte moyenne, 2-3 jours | un choix de 2 branches | **2 axes** : terrain (crête, marais, méandre), météo (pluie, brouillard), mission (tenir, prendre, raid, escorte d'un char) ; **la 1re mécanique** de l'ordre tiré |
| 3. L'élite | 4 contre 4, 3 jours | un adversaire spécial | **3 axes** et l'élite : troupes d'assaut, nid fortifié, lance-flammes, train blindé ; **la 2e mécanique** |
| 4. Le carrefour | variable | une partie étrange | nuit permanente, hiver, ville en ruines, inondation, deux fronts ; les cartes maudites pèsent |
| 5. Le boss | grande carte, 4-5 jours | le boss annoncé | la Grosse Bertha (un canon caché à trouver), le Fort (à prendre), l'Offensive du printemps (une vague énorme), le Gaz (une nappe qui avance chaque jour) |

Une campagne de 3 parties joue 1, 2 et 5. Le sel d'un run est la **combinaison** :
la doctrine de départ, le général adverse, l'ordre des mécaniques, la piste de
cartes suivie, le boss. Emprunts : Slay the Spire (la carte à branches, le boss
connu, le choix de départ, les reliques et les malédictions, les niveaux de
difficulté, le défi du jour) ; Total War (des unités qu'on garde et qui
s'aguerrissent, un général adverse qui a un nom). Refusés : la carte stratégique
et l'économie de Total War, les événements en texte de FTL (trop de lecture).

**Plus tard** (Jérôme, 24 nov.) : un **défi du jour** (la même graine pour tous,
une tentative, un classement en ligne : un service à choisir).

## Les cartes du soir (Jérôme, 24 nov. ; pas construites)

Le soir, on choisit un paquet parmi trois (trois familles de cartes), on le déchire,
3 à 5 cartes en sortent, on en garde une jusqu'à la fin de la campagne (Jérôme, 26 nov.).
Une carte a l'une des six raretés des largages ; tirée de nouveau, elle prend la rareté
au-dessus (la rareté remplace les niveaux). Un paquet est mat, brillant ou rose (le rose
contient toujours une carte mythique). Une carte **change ce qu'on voit**, jamais un
pourcentage, et **ne s'appuie que sur ce qui existe en jeu** (Jérôme, 24 nov.) :
c'est un objet parachuté qui revient (une salve de 75 chaque matin, le fusil du
canonnier pour l'homme qu'on incarne) ou un caprice qu'on déclenche soi-même
(notre zeppelin, la mine sous la tranchée choisie). Une carte qui demanderait une
mécanique nouvelle attend que la mécanique existe. Des cartes **maudites** : un
gros bonus, un défaut visible. Les raretés sont celles des largages. Des **pistes**
se dessinent (la musette, à la personne, les caprices en poche, les engins) : un run
qui en suit une devient un style de jeu. Chaque campagne finie ajoute pour de bon
des cartes plus folles au paquet. La liste proposée (35 cartes, à trier) :
`docs/chantiers/cartes-wtf.md`.

Différence avec les largages : un objet parachuté sert une fois, le jour ; une
carte dure toute la campagne.

## La sortie (Jérôme, 24 nov.)

- **L'édition itch.io** sur **itch.io**, en navigateur **et** en téléchargement (Windows, Mac, Linux).
  **Pas de Steam**, sauf grosse surprise.
- **Prix libre à partir de 0 €, 3 € suggérés** ; un lien discret « Soutenir » dans
  le jeu.
- **Langues** : le français, puis **l'anglais d'abord** (préparé par Claude) ; le
  jeu démarre dans la langue du navigateur. Titre : **Cyclopéen** en français,
  **Cyclopean** en anglais.
- **Faire connaître** : des GIF et des vidéos courtes de destruction et de vue à la
  personne (`outils/trailer.mjs`) ; le jeu envoyé à des streamers francophones.

## Les systèmes (ce qui existe, v0.169.0)

### La bataille

Une mission, donnée au premier matin : tenir le secteur, ou prendre la première
ligne d'en face et la tenir. Jugée à la fin, ou avant si le secteur tombe. Des
régiments frais attendent à la caserne et se déploient à tout moment du jour ; la
déroute se retire vers elle. En face prépare ses assauts au 220 et sort là où nos
lignes ont faibli. Trois difficultés (Secteur calme, Front ordinaire, Grande
offensive) ne changent que l'adversaire. (Jérôme, v0.9.0, v0.70.0, v0.101.0)

### Le temps qui passe

Le soleil se lève à gauche et se couche à droite : les ombres tournent avec lui. Le
soir tombe ; la nuit, le champ n'est éclairé que par les lanternes, les incendies,
les fusées et les lampes des hommes. Le ciel de la nuit change d'un soir à l'autre
(la lune, les nuages, les étoiles filantes). Un tronçon où les deux camps se font
face au soir se bat toute la nuit. Les obus soulèvent une gerbe de terre ; un arbre
touché brûle et le feu gagne ses voisins ; des corbeaux tournent au-dessus des
morts. (Jérôme, v0.8.0, v0.39.0, v0.40.0)

### Le terrain, l'eau et la météo

De l'herbe, des buissons, des arbres par essence et par saison : le champ est
vivant au premier matin, et le vert disparaît au fil des jours. Un champ de
hauteurs en cubes de 1 m, au quart ; la sauvegarde garde la graine et les impacts.
Une chaîne de jours tirée au sort (sec, pluie, brouillard, gel), une prévision
juste sept fois sur dix. La boue ralentit, l'eau plus encore, l'obus s'y enfouit.
(Jérôme, v0.7.0, v0.53.1, v0.138.0)

### La foule, les tranchées, le moral

Chaque soldat a une place dans la formation de son régiment et suit un champ de
coûts qui contourne la boue. Quatre lignes de tranchées par camp, en tronçons de
25 m qui changent de main ; une tranchée prise sert à l'envers. Chaque régiment a
un moral : ébranlé, il refuse de sortir ; trop bas, il part en déroute, qui gagne
les voisins. Chaque homme s'aguerrit au feu ; quand un gradé tombe, le suivant
prend sa place. (Jérôme, v0.4.0, v0.5.0, v0.11.0)

### La nuit

Chaque régiment reçoit une corvée : le repos, évacuer les blessés, ravitailler, la
relève (Jérôme, v0.6.0 ; quatre depuis la v0.77.1). Les morts inhumés ont une tombe.
Aujourd'hui, la soirée en trois étapes (la journée, le camp et ses arbres, les
régiments) précède la nuit (v0.150.0) ; **elle sera remplacée par les cartes du
soir**.

### Le camp, les engins, les largages, les caprices

Derrière nos lignes, cinq bâtiments (artillerie, aérodrome, chars, sapeurs,
caserne) donnent les ordres spéciaux : barrages 75, 155, 220, mitraillage, char,
génie. Deux ou trois avions par jour lâchent une caisse au-dessus du no man's
land : le premier homme qui l'atteint prend l'objet pour son camp (35 objets,
six raretés, v0.162.0). Un caprice par jour (douze : tir trop court, zeppelin,
nappe de gaz, mine, as, éclipse…, v0.163.0). Les uns et les autres sont gardés
(Jérôme, 24 nov.).

### Les vues à la personne

On prend la place d'un soldat, d'un char, d'un avion ou d'une mitrailleuse : on
vise, on tire, le sol se creuse, les arbres tombent (v0.144.0 à v0.169.0).

### Les hommes

Chacun a un nom, un âge, un grade, ce qu'il endure ; de près, un visage, un
squelette, une allure. Les morts restent où ils sont tombés. Un clic ouvre sa
fiche. (Jérôme, v0.3.0, v0.35.0, v0.105.0)

## Palette et échelle

Voir `CLAUDE.md`. « Boue et ciel bas » : la terre, la boue, la glaise, l'herbe
morte, l'eau qui reflète le ciel bas, la brume, l'os ; le bleu horizon et le
vert kaki clair d'en face. Les cartes du soir restent dans la palette.

## Ce que le jeu refuse

- Les blocs de texte, les résumés à lire, les tableaux de statistiques (Jérôme,
  24 nov.) : on visualise.
- Un tutoriel bavard : le premier jour guide en quatre ou cinq lignes, pas plus.
- Les améliorations en pourcentages (« +5 % ») : une carte se voit en jeu.
- Le compteur de morts comme récompense (ni expérience, ni avantage) : le nombre
  d'hommes qu'un soldat a abattus est un fait de sa fiche (v0.35.0).
- Le gore explicite : du sang sur les blessés et les morts (v0.140.2), pas plus.
- Le loot n'est plus refusé (v0.161.0) ; la glorification non plus (v0.70.0).

## Inspirations

La danse macabre et Felix Nussbaum ; John Brosio ; Brûler ses vaisseaux ; la foule
comme personnage (les frères de Witt) ; les Horaces et les Curiaces ; le Discours de
la servitude volontaire ; Slay the Spire (la campagne) ; Total War (la masse, les
unités qu'on garde) ; le lexique rare pour nommer unités, lieux et trophées (nos
régiments : Porphyre, Protogyne, Céruléen, Viride, Syzygie, Murmuration, Hapax,
Sinople).
