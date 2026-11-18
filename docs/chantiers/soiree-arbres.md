# La soirée, troisième jet : le contenu des arbres (validé par Jérôme le 18 nov. ; rien n'est en jeu)

ROADMAP, « Le soir, le moment des améliorations », « Troisième jet » (18 nov.) : **5 niveaux** par bâtiment,
le I donné, puis **2 pistes × 4 rangs** (II à V), plus forts et plus chers à chaque rang, un lien croisé là où
il a un sens ; **les intitulés du jeu** ; l'**Infanterie** autonome, ouverte dès le départ. Rien n'est construit :
ce tableau se valide avant le dessin (le troisième jet au labo) et avant les règles (lot 1 bis, `camp.js`).

**Lecture** : chaque rang donne un facteur lu par `modif(etat, camp, clé)` (les facteurs d'une même clé se
multiplient, comme aujourd'hui) ; `+n` s'ajoute (avions, chars, sections, régiments frais). Une clé en
*italique* n'existe pas encore dans `camp.js` (à brancher au lot 1 bis). **Prix** : 2, 3, 4, 5 points aux
rangs II à V (14 par piste, 28 par onglet, 196 pour les sept). Un rang demande le rang d'avant **de sa
piste** ; les deux pistes s'achètent (décision du deuxième jet). **Lien** : un rang qui demande aussi un
rang d'un autre onglet.

## Parc d'artillerie (I : Batteries de campagne : 75, 155 et 220 prêts)

| Rang | Piste « Justesse » | Effet | Piste « Cadence » | Effet |
|---|---|---|---|---|
| II · 2 | Tir de réglage | dispersion ×0,90 (`artillerie.dispersion`) | Caissons doublés | recharge ×0,90 (`artillerie.recharge`) |
| III · 3 | Tables de tir | dispersion ×0,90 | Pointeurs aguerris | recharge ×0,90 |
| IV · 4 | Repérage au son | dispersion ×0,85 | Tube neuf | recharge du 220 ×0,75 (`artillerie.recharge220`) |
| V · 5 | Réglage par avion | dispersion ×0,80 · **lien : Aérodrome, Observateurs III** | Le 220 sur rails | salve du 220 : 10 coups au lieu de 6 (`artillerie.salve220`) · **lien : Sapeurs, Voie de 60 V** |

## Aérodrome (I : Terrain et un hangar : 3 avions)

| Rang | Piste « Escadrille » | Effet | Piste « Observateurs » | Effet |
|---|---|---|---|---|
| II · 2 | Deuxième hangar | +1 avion (`avions`) | Blindage du siège | points de vie ×1,20 (`aerodrome.pv`) |
| III · 3 | Moteur de 180 ch | recharge ×0,80 (`aerodrome.recharge`) | Observateurs | passe ×1,30 plus longue (`aerodrome.longueur`) |
| IV · 4 | Troisième hangar | +1 avion | Réservoir auto-obturant | points de vie ×1,20 |
| V · 5 | Mitrailleuses jumelées | chaque passe touche ×1,25 (`aerodrome.letal`) | Vol rasant | passe ×1,15 et touche ×1,10 · **lien : Parc d'artillerie, Tables de tir III** |

## Parc des chars (I : Abri à char : 2 chars, recharge 240 s)

| Rang | Piste « Le parc » | Effet | Piste « Le char » | Effet |
|---|---|---|---|---|
| II · 2 | Deuxième abri | +1 char (`chars`) | Chenilles larges | franchit ×1,33 (`chars.franchit`) |
| III · 3 | Atelier de réparation | recharge ×0,80 (`chars.recharge`) | Canon à tir rapide | canon ×0,75 (`chars.canon`) |
| IV · 4 | Troisième abri | +1 char | Blindage renforcé | points de vie ×1,30 (`chars.pv`) |
| V · 5 | Grue de dépannage | recharge ×0,80 ; une épave se relève à 3/4 au lieu de 1/2 (*`chars.releve`*) · **lien : Sapeurs, Forge et grue IV** | Moteur renforcé | vitesse ×1,15 (`chars.vitesse`) |

## Maison des sapeurs (I : Baraque du génie : 2 sections de 20, les ponts)

| Rang | Piste « Sections » | Effet | Piste « Matériel » | Effet |
|---|---|---|---|---|
| II · 2 | Chantier | +2 sections ; les nids se refont (`sections`) | Madriers taillés | travail ×0,85 (`sapeurs.travail`) |
| III · 3 | Sections de 30 | hommes ×1,5 (`sapeurs.hommes`) | Voiturettes Decauville | marche ×1,25 (`sapeurs.vitesse`) |
| IV · 4 | Cinquième section | +1 section | Forge et grue | travail ×0,85 |
| V · 5 | Sections de 40 | hommes ×4/3 : 40 par section (`sapeurs.hommes`) | Voie de 60 | marche ×1,20 ; deux réparations d'engin par jour (*`sapeurs.reparations`*) |

## Caserne (I : Baraquements : 2 régiments frais ; la relève et les régiments frais seulement)

| Rang | Piste « Réserve » | Effet | Piste « Ordinaire » | Effet |
|---|---|---|---|---|
| II · 2 | Cantonnement | +2 régiments frais (`reserves`) | Cuisine roulante | vivres ×4/3 : quatre nuits (`caserne.vivres`) |
| III · 3 | Camp de repos | +2 régiments frais | Foyer du soldat | le repos de nuit rend ×1,20 de moral (*`caserne.repos`*) |
| IV · 4 | Dépôt divisionnaire | +1 régiment frais ; le plafond par bataille +1 | Cantine de campagne | vivres ×1,25 : cinq nuits |
| V · 5 | Train de renfort | un régiment frais se déploie à tout moment, deux fois plus vite (*`caserne.deploiement`*) | Permissions | un régiment relevé revient plein de moral (*`caserne.releve`*) · **lien : Hôpital, Convalescence IV** |

## Hôpital (I : Infirmerie : la moitié des évacués revient)

| Rang | Piste « Sauver » (au front) | Effet | Piste « Guérir » (à l'arrière) | Effet |
|---|---|---|---|---|
| II · 2 | Hôpital de campagne | blessés laissés qui meurent ×0,85 (`hopital.mort`) | Chirurgiens | évacués qui reviennent ×1,10 (`hopital.retour`) |
| III · 3 | Ambulances | mort ×0,85 | Pavillons | retour ×1,10 |
| IV · 4 | Salle d'opération | mort ×0,85 | Convalescence | retour ×1,15 |
| V · 5 | Poste avancé | mort ×0,80 · **lien : Infanterie, Brancardiers III** | Grand hôpital | retour ×1,15 ; les guéris reviennent dès l'aube suivante (*`hopital.delai`*) |

## Infanterie (I : Lebel et baïonnette ; ouverte dès le départ, autonome)

| Rang | Piste « Protéger » | Effet | Piste « Frapper » | Effet |
|---|---|---|---|---|
| II · 2 | Casques Adrian | éclats d'obus qui tuent ×0,80 (`obus`) | Grenadiers | corps à corps ×1,15 (`melee`) |
| III · 3 | Brancardiers | blessés laissés qui meurent ×0,70 (`mortBlesse`) | Section Hotchkiss | portée du tir ×1,10 (`portee`) |
| IV · 4 | Sacs à terre et pare-éclats | en tranchée, éclats ×0,85 (*`tranchee`*) | Fusiliers-mitrailleurs | portée ×1,05 et tir ×1,10 (*`tir`*) |
| V · 5 | Brancardiers aguerris | mortBlesse ×0,70 ; retour ×1,25 (`retour`) · **lien : Hôpital, Ambulances III** | Nettoyeurs de tranchée | corps à corps ×1,25 · **lien : Parc des chars, Canon à tir rapide III** |

Les clés `obus`, `melee`, `portee`, `mortBlesse`, `retour` sont celles de `EQUIPEMENTS` (data/batiments.js) :
aujourd'hui portées **par un régiment** (une corvée de nuit, 1 point) ; l'Infanterie les donnerait **à tous nos
régiments** (question posée à Jérôme).

## Les décisions de Jérôme (18 nov.)

- **Le tableau** : validé tel quel pour le troisième jet ; les chiffres se règlent au lot 4 (la mesure).
- **« Équipe de nuit » disparaît** (son effet, un chantier en une nuit, n'a plus d'objet) : le rang V de la piste Sections devient **Sections de 40** (Jérôme : « section de 40 ? »).
- **L'Infanterie vaut pour tous nos régiments** à l'achat (comme un bâtiment pour tous ses engins) : la corvée « équipement » de nuit disparaît au passage en jeu.
- **Le rapport : environ 12 rangs par bataille** : les prix restent 2, 3, 4, 5 et **le soir rapporte +2 au lieu de +1** (`DOTATION.soir`), soit ~25 à 35 points par bataille tenue ; une campagne de trois batailles achète la moitié de l'arbre. À passer en jeu avec les règles (lot 1 bis), pas avant.

## Le rapport : combien de rangs par bataille

Mesuré (18 nov., `node scripts/mesure-camp.mjs --avec-seul --difficultes … --graines …`, 300 soldats, 11 jours, **un joueur passif** : aucun ordre, donc aucune ligne d'en face prise) :

| Niveau | Graines | Jours joués | Dotation | D'où |
|---|---|---|---|---|
| Secteur calme | 1 à 8 | 11 | **20** (17 à 20) | 10 soirs + 7 à 10 soirs de lignes tenues |
| Front ordinaire | 1 à 10 | 8 à 11 | **15,5** (12 à 19) | 7 à 10 soirs + 4 à 9 lignes tenues |
| Grande offensive | 1 à 10 | 4 à 6 (le secteur tombe) | **6,4** (5 à 8) | 3 à 5 soirs + 2 ou 3 lignes tenues |

Un joueur qui prend des lignes ajoute jusqu'à **+8** (+2 par ligne d'en face, quatre au plus) : environ **20 à 28** sur
une bataille tenue de 11 jours, plus sur 15 jours (2 par soir). En campagne, les niveaux du camp passent d'une
bataille à l'autre (`campDepart`, campagne.js), pas la dotation.

**Ce que cela donne à 2, 3, 4, 5 points** (196 pour tout) : ~20 points = **7 à 10 rangs** dans une bataille (dix rangs II,
ou une piste entière et trois rangs II), un dixième de l'arbre ; une campagne de trois batailles en achète un tiers.
Un rang V (14 points sur une seule piste) prend les deux tiers d'une bataille.
