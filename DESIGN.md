# Cyclopéen — Bible du jeu

Document de référence. Il décrit **l'intention** : ce que le jeu est et veut
être. La technique est dans `CLAUDE.md`. Les décisions de Jérôme sont datées par
version (« Jérôme, v0.1.0 ») ; les propositions pas encore tranchées portent
`[À VALIDER]`.

## Intention

On commande un secteur du front, en 1914-18, pendant une bataille de dix à
quinze jours. On ne voit pas des combats séparés : on voit un terrain qui se
transforme. Les obus creusent, la pluie fait la boue, l'eau monte dans les trous,
les abris tombent et se refont la nuit. Des milliers d'hommes, chacun un point ou
une petite boîte, et au-dessus de tout un compteur de morts, sobre, qui est le
prix de chaque ordre. Le ton est celui de la danse macabre : la mort mène la
ronde et rend tout le monde égal ; la catastrophe est peinte avec calme, comme
chez Brosio ; la gravité ne se joue pas à la légère (Nussbaum). Référence : la
masse et le commandement de régiments de Total War, sans la micro-gestion ; le
moteur de foule de « Pierre et les rats ».

## Piliers

1. **Le terrain est le récit.** Ce qui s'est passé se lit dans le sol : cratères,
   boue, eau, arbres abattus. Rien ne s'efface tout seul.
2. **Les pertes sont la monnaie.** Chaque ordre a un prix en vies, compté et
   affiché, jamais glorieux.
3. **La foule est un personnage** (les frères de Witt) : on commande des
   régiments, on regarde des milliers d'hommes.
4. **Le temps est un ennemi lent** : la pluie de demain, la boue d'après-demain.
5. **On ne revient pas en arrière** (brûler ses vaisseaux) : une ligne prise
   donne ses tronçons, à l'envers ; un mort est mort.

## La boucle de jeu

- **Seconde** : choisir un régiment, l'envoyer quelque part, viser un barrage ;
  arrêter le temps pour réfléchir (pause active).
- **Minute** : un jour dure 5 à 8 minutes (6 en v0.1.0) : offensives, barrages,
  contre-attaques. On regarde la boue gagner.
- **Partie** : 10 à 15 jours sur un secteur, une mission ; chaque nuit, le terrain
  évolue en lot, et chaque régiment fait sa corvée (v0.6.0), ou est relevé (v0.9.0).
- **Entre deux parties** : le Mémorial (chaque unité perdue garde un nom), l'état-
  major (doctrines débloquées, chacune avec un coût), les trophées déclaratifs,
  sobres (« tenir un secteur sans offensive », « gagner un mètre pour moins de
  100 hommes »). `[À VALIDER : rien de cela n'est construit]`

## Le lot minimal (v0.1.0)

La tranche verticale du terrain, et seulement elle (Jérôme, v0.1.0) :

1. Un champ de 400 × 300 cases de 1 m généré depuis une graine (bosses, quelques
   arbres).
2. 2 000 soldats en deux camps (huit régiments chacun ; six depuis la v0.7.0, Jérôme), par `army.js`.
3. Des obus qui creusent des cratères : 75 (3 × 3), 155 (5 × 5), 220 (7 × 7),
   dureté croissante, plancher à −6 m, lèvre de terre jetée.
4. Pluie et boue sur trois jours simulés : l'humidité monte dans les creux, la
   nappe remplit les trous profonds, la vitesse des soldats baisse dans la boue.
5. Un compteur de pertes.

Rien d'autre : ni tranchées, ni moral, ni méta (les tranchées sont venues ensuite, lot 1, v0.4.0).

**Critère de validation** : 8 000 soldats (4 000 par camp), simulation et rendu
chacun sous 8 ms dans Chromium sans carte graphique (`node scripts/mesure.mjs`) ;
une bataille de trois jours lisible, cratère, boue, eau et soldat distinguables
(`node outils/lisibilite.mjs`, captures de `node scripts/trois-jours.mjs`).

## Les systèmes

### La bataille entière

Une bataille dure de dix à quinze jours (tirés de la graine) et porte une mission,
donnée en un ordre sobre au premier matin : tenir le secteur (nos lignes doivent
être à nous à la fin), ou prendre la première ligne d'en face et la tenir. Elle est
jugée à la fin, en une phrase, suivie des morts de chaque jour : rien d'autre. Le
secteur peut tomber avant (nos lignes à moins de 40 %, ou plus un homme) : la
bataille finit là. Quatre régiments frais attendent en réserve : la nuit, la relève
en fait monter un par les boyaux, à la place d'un régiment usé qui part au repos ;
la réserve ne revient pas. En face fait de même, prépare ses assauts au 220 et ne
sort que là où nos lignes ont faibli. (Jérôme, v0.9.0)

### Le temps qui passe

Le soleil se lève à l'est et se couche à l'ouest : les ombres des hommes et des
arbres tournent avec lui, longues le matin et le soir, courtes à midi. De 16 h à
18 h, le soir tombe (une trame de terre qui monte) ; la nuit, le champ n'est plus
éclairé que par les lanternes des tranchées, les incendies et les fusées, et, à l'arrière, les lampes que portent les hommes (une pour dix, des deux camps ; Jérôme, v0.39.0). Un tronçon où les deux camps se font face au soir ne s'apaise pas : la mêlée se joue pendant la nuit, et ceux qui y sont ne font ni corvée ni vrai repos (Jérôme, v0.39.0 ; en 14-18, un combat engagé ne s'arrêtait pas au coucher du soleil et la tranchée prise était contre-attaquée dans la nuit). Les
obus tombent du ciel, soulèvent une gerbe de terre, laissent une fumée qui
dérive ; un arbre touché brûle et le feu gagne ses voisins ; des corbeaux
tournent au-dessus des morts. (Jérôme, v0.8.0)

### Le terrain

De l'herbe par plaques, des buissons en haies et en bosquets, des arbres : le
champ est vivant au premier matin. Les obus soufflent l'herbe et arrachent les
buissons, la boue tue l'herbe heure après heure : au fil des jours, le vert
disparaît. (Jérôme, v0.7.0)


Un champ de hauteurs (pas de voxels pleins), cube de 1 m, quantifié au quart. Un
octet par case : la différence avec le sol généré. La sauvegarde garde la graine
et la liste des impacts, jamais d'image du sol. Mines (−10 m, champ à part) : plus
tard.

### L'eau et le temps

Une chaîne de jours tirée au sort (sec, pluie, brouillard, gel), une prévision
vague du lendemain, juste sept fois sur dix. La boue ralentit (×0,38), l'eau plus
encore, et l'obus s'y enfouit (il tue moins loin). Le gel durcit la boue.

### La foule

Chaque soldat a une place dans la formation de son régiment ; loin d'elle, il suit
un champ de coûts qui contourne la boue et les marches de deux mètres. Il tire
vers le carré d'ennemis le plus dense de son front ; un creux l'abrite.

### Les tranchées

Quatre lignes par camp, parallèles au front, en créneaux (des baies et des
pare-éclats), à 20 m l'une de l'autre ; des boyaux en zigzag les relient ; 130 m
de no man's land entre les premières. Au départ, la moitié des régiments tient la
première ligne, l'autre moitié la deuxième. Chaque ligne est coupée en tronçons de
25 m : un tronçon que l'autre camp occupe sans qu'un seul défenseur y reste change
de main. Le parapet protège du tir qui vient de devant ; le parados, beaucoup
moins, de celui qui vient de derrière : une tranchée prise sert à l'envers. Les
obus la comblent comme le reste du sol (leur terre retombe dedans), la pluie la
remplit de boue. On l'occupe d'un clic droit dessus. En face monte à l'assaut de
notre ligne la plus proche qu'on tient encore ; un régiment trop éprouvé retourne
dans sa tranchée. (Jérôme, v0.4.0 : le lot 1)

### La nuit et ses corvées

La nuit, chaque régiment reçoit une corvée : le repos (la fatigue et la peur
tombent, le moral remonte un peu plus), réparer sa tranchée (les tronçons comblés
par les obus sont recreusés), inhumer les morts autour de lui (ils partent en terre, leur fiche le dit ; au-delà
de nos lignes, des hommes y restent), évacuer ses blessés (ils quittent le front,
vivants). Un régiment qui travaille se repose moins. Un blessé laissé au front peut
mourir dans la nuit ; les corps laissés autour d'un régiment pèsent sur son moral au
matin. En face fait ses corvées lui aussi. À l'aube, le bilan de la nuit, en deux
lignes. (Jérôme, v0.6.0)

Puis (v0.11.0) : creuser des abris profonds sous sa tranchée (une nuit par niveau,
trois niveaux : les obus y tuent de moins en moins ; un 220 tombé dans le tronçon en
crève un ; un tronçon pris garde ses abris, pour l'autre camp) ; ravitailler (des
vivres pour trois nuits : sans eux, la nuit repose moins et le moral baisse). En face fait tout
cela aussi. (v0.38.3 : sept corvées au total ; les caillebotis et le coup de main sont retirés, voir
`docs/archives/corvees-retirees.md`.) Les morts inhumés ont une tombe là où ils sont tombés : un tertre de
glaise et une croix pâle, qui restent jusqu'à la fin.

### Le moral et l'expérience

Chaque régiment a un moral. Les morts le font baisser (un officier plus encore),
la peur de ses hommes aussi ; au calme il remonte, plus vite s'il a encore ses
officiers et des hommes aguerris ; un tronçon pris le relève, un tronçon perdu
l'abat. La nuit en rend une part, jamais tout : les pertes laissent leur marque.
Ébranlé, un régiment tire moins et refuse de sortir vers l'ennemi ; trop bas, il
part en déroute : il ne tire plus, reflue vers sa tranchée de départ et n'obéit
plus, jusqu'à ce qu'il se rallie. On le refuse à voix haute (« Céruléen est
ébranlé : il ne sortira pas »). En face obéit aux mêmes règles : ses assauts se
brisent sur le moral avant de se briser sur les pertes.

Puis (v0.11.0) : une déroute gagne les voisins (le moral des régiments du même
camp autour de lui tombe, d'autant plus qu'ils sont près). Un régiment brisé le soir
(moral au plus bas, plus d'un tiers de ses hommes perdus) peut refuser de monter de
toute la journée suivante : il tient sa tranchée, rien de plus — le Discours de la
servitude volontaire : il suffit de ne plus servir. En face, après une prise, un
régiment encore frais poursuit sur notre ligne suivante : c'est la leçon des Horaces
et des Curiaces à l'envers (la fuite qui disperse le poursuivant reste à faire).

Chaque homme prend de l'expérience à survivre au feu : un obus, un camarade qui
tombe à côté, ses tirs, un tronçon pris, une nuit au front. Aguerri, il a moins
peur et tire mieux. Quand un gradé tombe, le plus proche en dessous de lui (le plus
aguerri à rang égal) prend sa place, et ainsi de suite jusqu'aux caporaux ; un
nouveau capitaine s'annonce. (Jérôme, v0.5.0)

### Les hommes

Chacun a un nom, un âge, un grade, et ce qu'il endure : des jambes lourdes
d'avoir marché dans la boue, des bras las d'avoir tiré, une blessure, la peur
des obus et de ceux qui tombent à côté. On clique un homme : sa fiche dit qui
il est et ce qu'il endure, sobrement. Mort, sa fiche le dit (le Mémorial, plus
tard, les gardera tous). (Jérôme, v0.3.0)

Les morts restent où ils sont tombés : un homme couché, de la couleur de son camp
le jour où il tombe, de la couleur de la glaise dès le lendemain ; au loin, un
pixel. Survolé, il a encore un nom. (Jérôme, v0.3.3)

De près, on regarde des hommes : le survol dit qui il est. De loin, on regarde
des régiments : le survol dit combien ils sont encore, combien sont blessés,
combien sont morts ; un clic ouvre la fiche du régiment, d'où l'on va à celle de
chaque officier, de chaque blessé, de chaque mort. (Jérôme, v0.3.2)

Un blessé qui peut encore marcher (un bras, ou une jambe légère) ne reste pas dans
la tranchée : il regagne l'arrière, sans tirer ; les autres restent à terre
jusqu'à la nuit. (Jérôme, v0.35.0) Sa fiche montre sa peur, la fatigue de ses
jambes et de ses bras, son expérience, son corps avec la blessure, ses jours au
front, ce qu'il fait, son prochain grade, et les hommes qu'il a abattus (Jérôme,
v0.35.0 : un fait de sa fiche, ni une récompense ni de l'expérience ; il ne
compte que les coups de fusil, pas les obus). Un régiment montre les mêmes
jauges, en moyenne.

Plus tard, certains prendront de l'expérience (`[À VALIDER]` : voir `ROADMAP.md`).

### En face

Des barrages sur nos hommes les plus serrés, des avances de temps en temps ; un
régiment trop éprouvé retourne à son départ.

## Palette et échelle

Voir `CLAUDE.md`. « Boue et ciel bas » : la terre, la boue, la glaise, l'herbe
morte, l'eau qui reflète le ciel bas, la brume, l'os ; le bleu horizon et le
vert kaki clair d'en face, plus pâles que le sol sombre.

## Ce que le jeu refuse

- Aucune glorification de la guerre : pas de médailles qui brillent, pas de
  victoire claironnée. Le compteur de morts n'est jamais une récompense
  de jeu (ni expérience, ni avantage) : le nombre d'hommes qu'un soldat a abattus est un fait
  de sa fiche et de ses marques (Jérôme, v0.35.0).
- Pas de gore explicite : un corps est un homme couché, d'un pixel au loin.
- Pas de tutoriel bavard : les commandes sont dans les réglages, c'est tout.
- Pas de loot.

## Inspirations

La danse macabre et Felix Nussbaum ; Brûler ses vaisseaux ; la foule comme
personnage (les frères de Witt) ; les Horaces et les Curiaces (la fuite feinte,
plus tard) ; le Discours de la servitude volontaire (le moral, plus tard) ; John
Brosio ; le lexique rare pour nommer unités, lieux et trophées (nos régiments :
Porphyre, Protogyne, Céruléen, Viride, Syzygie, Murmuration, Hapax, Sinople).
