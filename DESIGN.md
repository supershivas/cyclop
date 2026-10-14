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
- **Partie** : 10 à 15 jours sur un secteur ; chaque nuit, le terrain évolue en
  lot (et, plus tard, les corvées : abris, caillebotis, inhumation, relève,
  ravitaillement).
- **Entre deux parties** : le Mémorial (chaque unité perdue garde un nom), l'état-
  major (doctrines débloquées, chacune avec un coût), les trophées déclaratifs,
  sobres (« tenir un secteur sans offensive », « gagner un mètre pour moins de
  100 hommes »). `[À VALIDER : rien de cela n'est construit]`

## Le lot minimal (v0.1.0)

La tranche verticale du terrain, et seulement elle (Jérôme, v0.1.0) :

1. Un champ de 400 × 300 cases de 1 m généré depuis une graine (bosses, quelques
   arbres).
2. 2 000 soldats en deux camps (huit régiments chacun), par `army.js`.
3. Des obus qui creusent des cratères : 75 (3 × 3), 155 (5 × 5), 220 (7 × 7),
   dureté croissante, plancher à −6 m, lèvre de terre jetée.
4. Pluie et boue sur trois jours simulés : l'humidité monte dans les creux, la
   nappe remplit les trous profonds, la vitesse des soldats baisse dans la boue.
5. Un compteur de pertes.

Rien d'autre : ni tranchées, ni moral, ni méta.

**Critère de validation** : 8 000 soldats (4 000 par camp), simulation et rendu
chacun sous 8 ms dans Chromium sans carte graphique (`node scripts/mesure.mjs`) ;
une bataille de trois jours lisible, cratère, boue, eau et soldat distinguables
(`node outils/lisibilite.mjs`, captures de `node scripts/trois-jours.mjs`).

## Les systèmes

### Le terrain

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

### Les hommes

Chacun a un nom, un âge, un grade, et ce qu'il endure : des jambes lourdes
d'avoir marché dans la boue, des bras las d'avoir tiré, une blessure, la peur
des obus et de ceux qui tombent à côté. On clique un homme : sa fiche dit qui
il est et ce qu'il endure, sobrement. Mort, sa fiche le dit (le Mémorial, plus
tard, les gardera tous). (Jérôme, v0.3.0)

### En face

Des barrages sur nos hommes les plus serrés, des avances de temps en temps ; un
régiment trop éprouvé retourne à son départ.

## Palette et échelle

Voir `CLAUDE.md`. « Boue et ciel bas » : la terre, la boue, la glaise, l'herbe
morte, l'eau qui reflète le ciel bas, la brume, l'os ; le bleu horizon et le
feldgrau, plus pâles que le sol sombre.

## Ce que le jeu refuse

- Aucune glorification de la guerre : pas de médailles qui brillent, pas de
  victoire claironnée. Le compteur de morts n'est jamais une récompense.
- Pas de gore explicite : les corps (plus tard) sont des entités d'un pixel.
- Pas de tutoriel bavard : les commandes sont dans les réglages, c'est tout.
- Pas de loot.

## Inspirations

La danse macabre et Felix Nussbaum ; Brûler ses vaisseaux ; la foule comme
personnage (les frères de Witt) ; les Horaces et les Curiaces (la fuite feinte,
plus tard) ; le Discours de la servitude volontaire (le moral, plus tard) ; John
Brosio ; le lexique rare pour nommer unités, lieux et trophées (nos régiments :
Porphyre, Protogyne, Céruléen, Viride, Syzygie, Murmuration, Hapax, Sinople).
