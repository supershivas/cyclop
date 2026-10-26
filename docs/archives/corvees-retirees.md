# Les corvées retirées : caillebotis et coup de main (v0.38.3)

Jérôme, v0.38.3 : « enlève les corvées nocturnes inutiles ou peu utiles. Il y en a trop. » La carte d'un régiment ouvert en offrait neuf (plus « Fiche ») ;
elle en offre sept : repos, réparer, inhumer, évacuer, abris, vivres, relève.

## Les caillebotis (v0.6.0)

- **Ce que c'était** : `T.caille` (un octet par case), posé sur les cases d'une tranchée par la corvée ; sur une telle case, `army.js` ramenait la boue à « humide » (la marche
  ne ralentissait plus), `apparence.js` la peignait en planches claires et sombres.
- **Pourquoi c'est parti** : une seule case de la tranchée en profitait, et la corvée « réparer » (recreuser ce que les obus ont comblé) disait déjà « la tranchée est praticable » ;
  deux corvées de tranchée qui se ressemblaient, une de trop. Le joueur n'en choisissait jamais une pour l'effet.
- **Si on le reprend** : la place est libre dans `data/corvees.js` ; `SORTES` de `nuit.js` garde `reparer` à l'indice 0, un travail de terrain de plus se pose à la fin.
  Une ancienne sauvegarde qui avait posé des caillebotis rejoue sans eux (`SORTES[1]` n'existe plus : le travail est ignoré).

## Le coup de main (v0.11.0)

- **Ce que c'était** : des volontaires (les plus aguerris, au plus 20 et un cinquième du régiment) allaient dans la tranchée d'en face (`cibleDuCoup`, à `nuit.coupPortee` 200 m) ;
  chacun y restait avec `coupMort` (0,15, moins avec l'expérience), les autres ramenaient des prisonniers (`coupPrise`) que `capturer` (bataille.js) retirait de la foule d'en face
  (`etat.prisonniers`, `reg.prisonniers`) ; le moral montait chez nous et baissait en face (`coupMoral`) ; les volontaires gagnaient de l'expérience (`coupExp`). En face en faisait aussi
  (`choixEnFace`, 15 % des nuits d'un régiment au moral haut).
- **Pourquoi c'est parti** : il coûtait des hommes à un jeu où les pertes sont la monnaie, et ne rapportait que quelques prisonniers qui ne servaient à rien (pas de renseignement :
  l'idée « des prisonniers qui parlent » n'a jamais été construite). La marque n° 18 du catalogue (ROADMAP §6, « revenu d'un coup de main ») est retirée avec lui.
- **Ce qui change pour les parties** : en face choisit, à la place, entre abris et repos (le tirage `h` du hachage n'est plus lu pour le coup) ; les nuits d'une partie sauvegardée avant
  la v0.38.3 qui avaient un coup de main rejouent sans lui (la sauvegarde ne les rejoue pas : seuls les travaux de terrain le sont).
- **Si on le reprend** : le groupe « Arcade » du labo (`js/labo-arcade.js`) a d'autres idées de surprise nocturne ; un coup de main qui rapporterait quelque chose (le renseignement : où en face prépare son assaut,
  `ROADMAP.md` « La nuit, la suite ») serait à cadrer d'abord.


## Réparer la tranchée, inhumer les morts, creuser des abris (v0.77.1)

Jérôme : « la nuit, enlever les actions inutiles (réparer les tranchées, abris, inhumer) ». Retirés : les trois corvées de `data/corvees.js`, leurs effets dans `corvees` de nuit.js (`travail`, `combles`, `SORTES`, `rejouerTravaux`), `etat.travaux` et `etat.abris` (bataille.js ; `VERSION` 14 s'est faite avec la victoire anticipée, les anciennes sauvegardes cassent comme d'habitude), `abriDe` et le crève-abri du 220 (`tomber`), `ctx.abri` (army.js, avions.js), les portes d'abris dessinées (rendu/troncons.js), les lignes du bilan de l'aube (inhumés, tronçons réparés, abris), les réglages `rayonInhumer`, `inhumerParHomme`, `risqueDehors`, `abriMax`, `abriParNiveau`, `abriDetruit`, les trois tests (réparer, inhumer, abris) et le choix d'en face. Ce que cela coûtait : un choix de plus par régiment et par nuit pour un effet que Jérôme jugeait sans intérêt (les obus recreusaient rarement une tranchée au point d'y compter ; les abris n'ont jamais changé une bataille). **Conséquences** : les morts restent où ils sont tombés pour toute la bataille (leur poids sur le moral, `rayonCorps`, ne redescend plus), les tranchées comblées par les obus le restent, aucun obus ne trouve plus d'abri. `etat.tombes` (les tombes) reste lu par le dessin et le survol : il est toujours vide.
