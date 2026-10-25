# Règles de la bataille

<!-- Sorti de CLAUDE.md : la foule, le tir, le moral, les postures, les tranchées, la nuit et ses corvées, les champs de coûts, la sauvegarde rejouée, l'équilibrage. Le texte est celui d'origine, sans changement ; décisions datées, mesures et pièges avec leur coût. Un ajout se range ici, pas dans CLAUDE.md. -->

- **Les soldats** : chacun a un nom, un âge, un grade (la hiérarchie d'un
  régiment : un capitaine, deux lieutenants, un adjudant, des sergents, des
  caporaux, des soldats de 1re et 2e classe ; les grades allemands en face) et un
  état : fatigue des jambes et des bras, blessure (bras, jambe, tête), peur. Un clic
  sur un homme ouvre sa fiche (Jérôme, v0.3.0). De près (3 pixels par mètre et
  plus), le survol et le clic montrent un homme ; de loin, son régiment (hommes,
  blessés, morts, et la liste des officiers, des blessés et des morts, chaque nom
  ouvrant la fiche de l'homme) (Jérôme, v0.3.2). Les morts restent où ils sont
  tombés (`etat.corps` : `[x×10, y×10, camp, jour, id]`, sauvegardé ; Jérôme,
  v0.3.3) : un homme couché, au loin un pixel ; la couleur du camp le jour même,
  la glaise ensuite. Survolé ou cliqué, sa fiche.
- **La mêlée de nuit** (Jérôme, v0.39.0 : « il faut décider ce que deviennent les régiments au corps à corps » ; `meleeNuit`, `contactDe`, `comptes` de nuit.js, `CONTACT` de data/corvees.js, `nuit.meleeMort`) : un tronçon où les deux camps sont présents au soir est une mêlée en cours ; elle ne s'arrête pas avec le soleil. `aube` la joue **avant** les corvées : chaque homme du tronçon tombe avec la chance `meleeMort` (0,3) × 2 × (leurs forces / toutes les forces), donc à forces égales 30 %, le plus faible y laisse bien plus (3 contre 20 : 52 % contre 8 %) ; puis la règle du jour (`prises` : au moins `prise` attaquants et `melee` fois les défenseurs) dit si le tronçon change de main (les vainqueurs s'aguerrissent, leur moral remonte, celui des tenants baisse, événement `prise`), sinon la mêlée est encore là au matin. Les régiments **au contact** (un de leurs hommes dans un tronçon disputé) ne reçoivent aucune corvée : `refusCorvee` les refuse toutes, `repos` comprise, « Au contact de l'ennemi : il se bat toute la nuit » ; leur carte dit « Au contact » (`CONTACT`, pas un choix : `corvee()` ne le connaît pas), leur nuit est un travail (`faite = 'contact'` : ils se reposent comme à la corvée, `reposTravail`). Le bilan dit les morts « au corps à corps » et les tronçons pris ou perdus. Sans tronçon disputé, aucun tirage de plus. Mesuré (`scratchpad`, 750 hommes, sans ordres, 7 jours, graines 3, 7, 11) : le contact commence au jour 3 ou 4, 2 à 8 régiments, 3 à 39 morts par nuit au total, 48, 87 et 62 par bataille sur 620 à 810 de pertes, aucun tronçon ne change de main (les deux camps s'épuisent). Une attaque qui atteint la tranchée se joue donc la nuit : sur les petites batailles des tests (200 hommes, deux régiments à l'assaut), la mêlée a détruit les régiments au point d'effondrer la campagne d'essai (`meleeMort: 0` pour `jouerJusqu_aLaFin` de campagne.test.mjs, le registre n'étant pas l'objet). **Non fait** : un homme qui rentre vivant d'un coup de main, la contre-attaque dirigée par le joueur, la mêlée du jour (toujours `prises`).
- **Les blessés reviennent** (Jérôme, v0.18.0) : un blessé évacué (corvée `evacuer`) revient avec une chance sur deux
  (`nuit.retourChance`) après autant de nuits que sa blessure en demande (`nuit.retourNuits` : un bras 1, une jambe 2, la tête 3), dans
  son régiment, avec son numéro et son expérience, par l'arrière (`retours` de nuit.js ; le tirage est un hachage graine-numéro-jour, pas
  le générateur de la bataille). `etat.evacues` : `[numéro, jour, blessure, nuit du retour (0 : pas encore, −1 : non), régiment,
  expérience]` ; les évacués d'avant la v0.18.0 (deux nombres) ne reviennent pas. Le bilan de l'aube le dit.
- **Chez l'ennemi, ni évacuer ni ravitailler** (Jérôme, v0.22.0) : un régiment dont la tranchée d'ordre est une ligne de l'autre camp
  (`chezLEnnemi` de nuit.js) a 130 m à découvert entre lui et ses boyaux : `refusCorvee` refuse « évacuer » et « ravitailler » (« Chez l'ennemi,
  la soupe ne passe pas : … »), sauf si la tranchée est toute à lui (`etat.troncons`) et qu'aucun régiment de l'autre camp n'est à moins de
  `nuit.calme` (60 m). Réparer, abris, inhumer, relève restent possibles ; la règle vaut aussi pour en face
  (`choixEnFace` retombe au repos). Un grisé par corvée au-dessus de la carte dit pourquoi au clic.
- **La nuit et ses corvées** (Jérôme, v0.6.0) : une corvée par régiment (repos,
  réparer, inhumer, évacuer) ; puis (Jérôme, v0.11.0) les abris profonds
  (`etat.abris`), les vivres (`reg.vivres`) et les tombes dessinées (`etat.tombes`) ; voir `DESIGN.md`.
  **Sept corvées** (Jérôme, v0.38.3 : « il y en a trop » ; `data/corvees.js`) : les caillebotis et le coup de main sont retirés (voir « Ce qui a été retiré »).
  **Un ordre donné grise la carte** (Jérôme, v0.38.3) : la corvée de chaque régiment est celle d'hier si elle est encore possible, sinon le repos ; `nuit.donnees` (`hud/nuit.js`, remis à zéro à chaque nuit)
  garde ceux à qui l'on a **donné** un ordre cette nuit, et `majRegiments` met la classe `donne` à leur carte (glaise, sans la bande de leur camp, le mot de la corvée en os ; choisie, elle redevient claire :
  la sélection prime). Un ordre donné à plusieurs régiments les grise tous (`surChoix` est un rappel du jeu à deux : seul, `reseau` est nul et il ne fait rien).
- **Le moral et l'expérience** (Jérôme, v0.5.0) : un moral par régiment (`moral`,
  `deroute` dans l'état), l'expérience de chaque homme (`exp` dans la foule), les
  promotions (`etat.grades`) ; puis (Jérôme, v0.11.0) la contagion de la déroute, le
  refus d'un jour (`reg.refus` : le jour refusé), la poursuite d'en face après une
  prise ; voir `DESIGN.md`.
- **Les blessés qui marchent** (Jérôme, v0.35.0 ; `pasArmee` d'army.js, `arriereDe` de bataille.js) : un blessé au bras, ou à la jambe pour la moitié d'entre eux (`soldat.jambeLegere`, un hachage de son numéro : `legere`), quitte sa place et marche tout droit vers
  l'arrière de son camp (12 m derrière sa dernière ligne, `soldat.arriere`), sans tirer ; la tête et la jambe lourde restent à terre. Rien dans l'état : la règle se lit de la blessure et du numéro. Mesuré (graines 3, 7, 8, 9 000 pas, tous nos régiments envoyés à l'attaque) : nos morts 384/404/394 → 299/364/319, leurs morts
  47/44/43 → 36/40/35 ; les blessés ne sont plus touchés deux fois (« blessé deux fois, on meurt »). Les parties d'avant se relisent et divergent après coup (leurs blessés se mettent en marche).
- **Les tranchées** (lot 1, Jérôme, v0.4.0) : quatre lignes par camp, des boyaux,
  des tronçons de 25 m qui changent de main ; voir `DESIGN.md`.
- `js/terrain.js` — le champ de hauteurs : `base` (le sol généré depuis la
  graine, en quarts, jamais sauvegardé) + `diff` (un octet par case : ce que les
  obus ont fait). `impact()` : le motif du calibre, la dureté (0-1 m : 100 %,
  1-3 m : 50 %, au-delà : 25 %), le plancher à −6 m, la lèvre, les arbres abattus.
  `hydroLignes()` : une heure d'eau sur des rangées (pluie, nappe, infiltration,
  ruissellement, glissement de l'humidité vers les trous, évaporation). États :
  sec, humide, boue, eau, glace. `hauteurVueQ` : la hauteur dessinée (voir Pièges).
- `js/army.js` — la foule, copie divergente de `js/swarm.js` de Pierre (voir
  l'en-tête) : tableaux typés, grille de voisinage (2 m) par tri par comptage,
  séparation, place dans la formation du régiment, champ de coûts quand la place
  est loin, vitesse selon la case et la marche, tir par cône vers le carré
  d'ennemis le plus dense (carrés de 8 m), obus (`tuerDans`), `compacter`. Chaque
  soldat a un numéro (`id`, stable), une fatigue des jambes (la marche, plus dans
  la boue) et des bras (le tir), une blessure, une peur (`effrayer` : les obus
  jusqu'à trois fois leur rayon, un homme qui tombe à côté) ; jambes lourdes ou
  blessées : plus lent ; bras blessé : tire moitié moins ; terrifié : ne tire plus ;
  la nuit repose (`reposer`). L'expérience (`exp`) : le feu survécu (`effrayer`
  avec `R.experience`), les tirs, les prises, les nuits ; elle calme la peur et
  assure le tir. Un régiment ébranlé tire moins ; en déroute, il ne tire plus. Touché (`frapper` dans bataille.js) : tué ou blessé,
  et blessé deux fois, tué.
- **Les postures** (stances, lot 1 logique, commande Maj+1 / Maj+2 (v0.36.0) et deux boutons du rabat (v0.36.1 ; le dessin, v0.36.2 : un régiment en `retenu` porte son fusil baissé, le nuanceur des soldats tourne la partie 4 autour des hanches quand `aTir.x` vaut −1, que `majSoldats` pose pour `stance === 'retenu'` ; la pose de tir, quand il tire, passe devant ; pas d'éclair hors portée : `tirer` ne dessine un tir qu'avec une cible à portée, rien à faire ; `couvert` n'existe pas, donc pas de tapi ; `data-stance` dans `majRegiments`, grisés avec la raison au survol et au clic quand `peutStance` refuse ; la posture est dite par `actionDe`, par un mot sur la carte du régiment, `.posture`, et au carnet) ; `reg.stance`, `data/stances.js`, `R.stance`, `parametresStance` et `chanceTir` d'army.js, `peutStance` / `ordonnerStance` de bataille.js) : `volonte` (le tir d'avant, tout à 1) et `retenu` (portée × 0,5 = 35 m, précision × 1,5, cadence × 1 ; Jérôme, cadrage v0.36.0 : deux postures, l'IA d'en face n'en use pas (`ia.stance` vide : le code est là, `postureIA`, éteint ; v0.36.3), boutons du rabat puis Maj+chiffre au lot 2, un ordre de marche remet à `volonte` sans mémoire). Les nombres sont des multiplicateurs de `tir` : `volonte` vaut 1 partout, donc une bataille sans posture est celle d'avant au bit près (test : graines 3, 7, 8 comparées à une référence relevée avant le lot, morts, blessés, `etat.rng`, empreinte). Un régiment sans `stance` tire à volonté ; `restaurer` pose `??= 'volonte'`, la relève (`nuit.js`) aussi. La posture est une commande du jeu à deux (`stance` de `executerCmd`, `lancerStance`, dans `empreinteEtat` ; `onAction` de main.js lit `e.shiftKey` : Maj+chiffre est la posture, jamais le barrage, `keyIs` ne distinguant pas Maj sur une touche physique).
- `js/tranchees.js` — les tranchées : `ligneY` (le tracé d'une ligne, une
  fonction de x : trois ondulations de 70, 28 et 11 m tirées de la phase de la ligne, `demiLargeur` 1 à 1,5 m ; v0.29.0 : plus de créneaux en carré),
  `creuserTranchees` (creusées dans `diff` à 1,5 m, un parapet d'un quart du côté
  de l'ennemi, des boyaux ; `T.troncon` : le tronçon de 25 m de chaque case de
  ligne), `ligneSous`. Les données sont dans `secteur.js` (`tranchees`).
- `js/nuit.js` — les corvées de la nuit (`corvees`, appelée par `aube(B, choix)`) :
  `tronconsDe` (la tranchée d'un régiment), `refusCorvee`, `travail` (réparer),
  `choixEnFace`, `rejouerTravaux`. Les textes sont dans
  `data/corvees.js`, les nombres dans `reglages.js` (`nuit`). L'état garde
  `travaux`, `tombes`, `evacues`, `nuits`, `abris` ({ tronçon : niveau } ; lu par
  `abriDe` de bataille.js dans `tuerDans`) ; chaque régiment, ses
  `vivres` (en nuits).
- `js/champs.js` — les champs de coûts : le terrain résumé en carrés de 4 m
  (`couts`, un octet), Dial, une direction par carré ; cache par but et version.
- `js/bataille.js` — l'état d'une partie et ses règles (`tirs`, `disputes` : pour le dessin seulement, jamais sauvegardés) : `nouvelleBataille`,
  `avancer` (un pas de 1/30 s), ordres (`ordonnerMarche`, `ordonnerBarrage` :
  ils rendent `{ refus }`), en face (barrages sur nos hommes les plus serrés,
  assauts sur nos tranchées), les tronçons (`prises` toutes les 15 pas,
  `tronconsTenus`, `etat.troncons` : qui tient chacun), le moral (`moral` chaque
  seconde, `moralEnMots`, la déroute, les refus d'ordres), les grades (`rangDe`,
  `promouvoir`), `terrainSous`, jour / nuit / fin, `aube`, `horloge`, `photo` / `restaurer` /
  `rejouerTerrain`. À un nouvel ordre, les places sont données dans l'ordre où
  sont les hommes (le long du front, puis d'avant en arrière) : sinon ils se
  croisaient.
- `js/formes.js`, `js/objets.js`, `js/secteur-terrain.js` — les retouches de relief d'un secteur (bosse, creux, crête, plateau), ses objets posés (arbres, bois, haies, dégagements ; l'atelier les pose) et le terrain que la bataille monte au départ, partagé avec l'atelier.
- `js/apparence.js` — la couleur d'une case (partagée par le rendu, le labo,
  l'outil de lisibilité). `js/tuiles.js` — des tuiles d'essai peintes par elle.
- `js/identite.js` — le nom, l'âge, le grade d'un soldat (tirés de la graine et de
  son numéro ; le grade, de son rang de création dans son régiment, ou de sa
  promotion), son état et son expérience en mots. `js/data/noms.js` : prénoms, noms, grades de chaque camp.
- `js/data/` — `reglages.js` (tous les nombres, modifiables par l'atelier ;
  `soldat` : fatigue, blessures, peur),
  `calibres.js` (motifs 3 × 3, 5 × 5, 7 × 7), `meteo.js` (états et chaîne de
  Markov, prévision juste 7 fois sur 10), `secteur.js`, `lexique.js` (noms de
  nos régiments).

**Rendu et cycle de vie**

- **Des tranchées qui serpentent** (Jérôme, v0.29.0 : « moins géométriques ») : les créneaux en carré (±1,5 m tous les 10 m) et le zigzag des boyaux faisaient un dessin au cordeau. Le tracé est une somme de bruits lissés (`ligneY`), sa pente reste sous 0,3 case par colonne (la tranchée se suit
  sans se couper : deux cases de large au moins), les boyaux sont des sinusoïdes ; `L.baie` n'est plus lu. Cela change la forme des tranchées d'une partie sauvegardée avant (le terrain est refait de la graine) : ses hommes gardent leur place, les ordres se recalculent.
- **Longer la tranchée à découvert** (Jérôme, v0.21.4) : un carré de 4 m où passait une tranchée comptait +8 de relief (ses parois) : le champ
  de coûts contournait la tranchée par le sol nu à côté. Un carré dont 15 % au moins est en tranchée ou en boyau encore creusés
  (`T.troncon` et `diff` ≤ −2) coûte désormais la moitié (`foule.abri`, `abriPart`) et ne compte plus de relief : un régiment qui
  marche le long de son front reste dans la tranchée (graines 3, 5, 7, 30 s : 50-57 % des hommes en tranchée, contre 12-31 %), sans
  arriver plus tard (140 m restants contre 143). Les cratères ne comptent pas (les descendre ralentit). Une tranchée comblée par les obus ne
  protège plus : son carré redevient ordinaire à la prochaine mise à jour des coûts. `calculerCoutsBande` donne aussi la vue de `troncon`.
- **Les postures, mesurées** (`scripts/mesure-stances.mjs`, 9 graines, 9 000 pas, 750 hommes par camp, sans IA ni artillerie : tous les régiments d'un camp à l'assaut de la 1re ligne de l'autre) : **l'assaut n'atteint jamais la tranchée en 300 s** (0 tronçon perdu, 0 mêlée ; l'attaquant perd 280 à 300 hommes, le défenseur ~40), donc ce scénario ne mesure que le tir sur le no man's land. Écart-type de la moyenne : ~5 morts sur 290, ~2 sur 40. `retenu` à 35 m et ×1,5 est neutre pour les morts de l'attaquant (292 → 296 en attaque, 281 → 286 en défense, dans le bruit) **mais coûte au défenseur** : ses morts passent de 39 ± 2 à 50 ± 2 quand il tient en `retenu` contre un assaut à volonté (+28 %), car l'attaquant tire sans réponse entre 70 et 35 m. À 49 m (×0,7) : l'attaquant perd 343 ± 7 au lieu de 281 et le défenseur 40 : dominant. À 35 m et ×2,5 : 418 ± 4, dominant aussi. Le point d'équilibre est entre 35 et 49 m à ×1,5 ; non réglé (les réglages restent 0,5 et 1,5 : la posture n'est pas encore accessible). **`soldat.fatB` (fatigue des bras) n'a aucun effet sur le tir** (`army.js` l'écrit, `identite.js` l'affiche) : la « fatigue des bras ÷2 » du plan n'aurait rien coûté. Le prix d'une posture est donc sa portée, sa précision et sa cadence, pas la fatigue.
- **Les postures, avec appui d'artillerie, et l'IA** (Jérôme, v0.36.3 : `retenu` reste à 35 m et ×1,5, l'IA d'en face n'en use pas ; `scripts/mesure-stances.mjs --appui 60`, 9 graines, 9 000 pas) : avec 60 s de barrages d'abord (220, 155, 75 sur la ligne visée), l'assaut atteint la tranchée (0,3 à 0,9 tronçon perdu, mêlée 2 à 5 s). Morts de l'attaquant : 223 (attaque) et 222 (défense) contre un défenseur à volonté, **209 et 208 contre un défenseur en `retenu`** (−6 %, ± 3,5) ; morts du défenseur ~63 dans tous les cas : `retenu` n'a aucun coût mesuré pour le défenseur et gagne ou perd quelques pour cent selon la portée. Essais (défenseur en `retenu`, morts de l'attaquant en attaque / défense) : 42 m 237 / 230, 49 m 270 / 260, 35 m ×2 263 / 267, 42 m ×1,8 279 / 272 ; seul le premier est proche de la neutralité, les autres dominent. **L'IA** : `ia.stance` (`''` : éteint ; `'retenu'` : ses régiments qui tiennent leur propre tranchée, `postureIA` de bataille.js, lue de l'ordre, sans hasard ; à volonté dès qu'ils sortent ou plient ; muette à deux). Allumée, nos assauts (avec appui, IA qui joue) : 247,6 → 266,6 morts chez nous (+8 %), tronçons perdus par l'IA 4,3 → 3,1 (−28 %), mêlée 20 → 13 s, ses morts 65 → 70 : un défenseur un peu plus dur, pas invulnérable ; à 42 et 49 m, nous perdons 260 et 294. Éteinte par défaut, à allumer dans `reglages.js` ou l'atelier. La seule valeur de `retenu` qui n'est pas dominante est celle du jeu ; la posture reste un choix de tempo, pas un coup de force : si elle devait coûter quelque chose (cadence, ouverture du feu retardée), ce serait une décision de design.
- **Le cache des champs de coûts et les ralentissements** (Jérôme, v0.34.6 et v0.34.4 : « au jour 5 le jeu rame très fort », puis « ça rame encore au jour 2 » ; Firefox, quel que soit le zoom ; `foule.champsMax`, `champGroupes`, `champRetard`, `champDe` de bataille.js) : un champ de marche se calcule en 5 ms (33 600 carrés ; la file de seaux en tableaux typés et la relaxation déroulée n'y gagnent que 20 %, le calcul est près de son minimum) et le cache le garde par (but, version des coûts). **Deux défauts.** (1) À 10 champs gardés pour 16 régiments, dès que plus de dix buts différents étaient demandés dans un même pas, ils se chassaient du cache et chaque pas les refaisait : 1,4 → 49 ms par pas en continu (profil : `calculer`, 68 s sur 80) ; `champsMax` est à 48 (16 régiments × deux versions, plus la relève). (2) À chaque nouvelle version des coûts (toutes les ~2,7 s), les seize régiments redemandaient leur champ **dans le même pas** : 55 à 100 ms d'un coup, un saccadement toutes les 2,7 s (graine 7, barrages continus : médiane 1,2 ms, 99e centile 59, max 426) ; la moyenne par pas ne le montre pas, il faut les centiles. Désormais chaque régiment garde l'ancienne version (`B.coutsPrec`, sauvegardée) pendant `(id % 16) × 0,17` s après le changement (`etat.couts.depuis`), puis passe à la nouvelle : un champ par intervalle, 99e centile 13 ms. Le délai ne vient que de l'état, donc la partie relue suit les mêmes champs (test « relue au milieu de l'étalement » ; sans `coutsPrec` sauvegardé il échoue). Équivalence mesurée (3 graines, 8 régiments en marche, 90 s) : distance au but à 0,7 m près, pertes dans le bruit. **Il reste** un pas de 100 ms quand on envoie huit régiments à huit buts différents (un champ neuf chacun, pas de version précédente à suivre) et un pas de 300 à 500 ms à la toute fin de chaque journée (graine 7, jours 1 à 3 : 337, 498, 317 ms) : c'est `for (p < 12) hydroLignes(T, 0, T.H, …)` de `avancer`, les douze heures d'eau de la nuit sur les 537 000 cases d'un coup (une heure : ~146 ms) ; `hydroLignes` est à état et sensible à l'ordre des cases (l'eau coule d'une case à la voisine) et la sauvegarde le rejoue : ne pas le réécrire pour le rendre plus vite. Pour l'étaler sans changer la partie, il faudrait le découper en rangées dans le même ordre (passe après passe, rangée après rangée, comme `avancerEau`) pendant la phase `nuit`, avec la progression dans l'état et dans `etapesRejouer` : pas fait (un à-coup d'une demi-seconde par jour, au moment où l'écran passe à la nuit). Un test de saccade doit regarder les centiles et le pire pas, pas la moyenne.
- **Déterminisme et cache** : un champ de coûts calculé « quand le cache le veut »
  aurait rendu une partie relue différente. Les champs ne dépendent que de `couts`,
  un résumé du terrain qui fait partie de l'état (sauvegardé) et n'est refait qu'à
  pas fixes, par bandes, dans un tampon à part (`coutsNeufs`) copié d'un coup.
- **La sauvegarde rejoue le terrain** (`rejouerTerrain`) : impacts du pas, puis
  l'eau, dans le même ordre que la partie ; la nuit en lot. Toute règle nouvelle
  qui change le terrain doit y être rejouée, sinon la partie relue diverge (le
  test « relue après une nuit » le voit). ~1,2 s pour relire un début de partie
  dans le navigateur.
- **La forme des cratères : rond, lèvre jetée et éclats** (Jérôme, v0.52.5, choisi au labo parmi six variantes ; essayées en v0.52.4 ; sujet « Des cratères moins carrés » du labo, `js/cratere.js`, `impact(T, x, y, cal, R, n, gel, forme)`) : le dernier paramètre vaut `FORME_JEU` (= `FORMES.tout`) ; `null` rend l'ancien motif carré (le labo, les tests de l'ancien motif) ; les autres entrées de `FORMES` (`rond`, `levre`, `eclats`, `ovale`) ne sont plus que des variantes du labo. **Rond** : un disque `p·(1 − (d/R)²)` pris au point exact de l'obus (arrondi au décimètre par la sauvegarde), échantillonné en quatre points par case, rayon cherché par dichotomie pour creuser le volume de la matrice (une fois arrondi), amplitude 0,9 à 1 selon `hash2(n, 7, 41)` ; la dureté et le plancher sont ceux d'`impact` (on lui passe des quarts à creuser). **Lèvre** : le volume de l'ancien anneau carré, réparti en anneau rond de −0,3 à 2,2 m du bord, 0,35 à 1 selon l'angle (côté tiré de `n`), 30 % de cases sautées, chaque case arrondie par un hachage (le total tient en moyenne). **Éclats** : `eclats` de `data/calibres.js` (4, 8, 14) creux ou monticules d'un quart. Mesuré (`node scripts/mesure-cratere.mjs`, 10 000 obus) : `impact()` 1,5 à 2,8 µs → 6 à 13 µs, cases touchées par obus du même ordre (17/45/56 au lieu de 18/40/66), volume creusé de −4 % (75) à −11 % (220) : la parabole creuse plus au centre, où la dureté coûte double. Le piège : sans lèvre ronde, un creux rond gardait l'anneau carré (centré sur la case, pas sur l'obus : un trou d'un côté) ; un creux rond a donc toujours une lèvre ronde. `rejouerTerrain` rejoue `impact()` avec la forme du jeu : `VERSION` de bataille.js passe à 5 (les anciennes sauvegardes ne se relisent pas : accord de Jérôme). **Le coût de la bascule** : le terrain change, donc le hasard de toutes les parties : `test/rendu.json` (31 images sur 37 changent, de 0,2 à 56 % des pixels : les scènes de combat divergent, les obus et les zooms vides sont identiques), `test/fumee.json` (le soir et la nuit : pertes de chez nous 89 → 57 morts à ce soir-là, du même ordre ailleurs) et `REFERENCE` de `test/stances.test.mjs` (pertes 62, 57, 77 → 69, 72, 76) sont réécrites ; les cinq tests de nuit de `bataille.test.mjs` prennent la graine 5 (`SEED_NUIT` : avec la graine 3, le jour finissait au contact et la corvée demandée était refusée). Piège : `stamp-version` avant de relancer les tests, sinon les tests qui importent `secteur.js?v=` voient une autre instance (7 échecs trompeurs).
- **Les impacts sont arrondis au décimètre avant d'être appliqués** : c'est ce que
  la sauvegarde garde (`[jour, pas, x×10, y×10, calibre]`).
- **Les tranchées sont creusées dans `diff`** avant que les impacts ne soient
  rejoués (`monter`) : la sauvegarde n'en garde rien. Une bataille d'avant la
  v0.4.0 (`etat.tranchees` absent) se relit sans tranchées : les creuser sous des
  hommes déjà placés aurait changé la partie. Elles changent toutes les batailles
  (positions de départ), sans changer l'ordre des tirages.
- **Une tranchée de 2 m** ne se quitterait qu'à force (`vitesse.mur` : 8 quarts) :
  elle fait 1,5 m (6 quarts) plus un parapet d'un quart, une marche « raide »
  qui ralentit seulement. La protection au tir dépend du côté d'où vient la balle
  (`B.faces` : le côté de l'ennemi d'origine de chaque tronçon) ; contre les obus,
  c'est la règle du creux.
- **Les sauvegardes d'avant les marges** (v0.2) se relisent : `restaurer` décale
  impacts, régiments, barrages et soldats de la largeur des marges et refait le
  résumé du terrain ; les soldats prennent leur numéro dans l'ordre (test).
- **Les travaux de la nuit changent le terrain** : ils sont notés dans
  `etat.travaux` et rejoués par `rejouerTerrain` après l'eau de la nuit (l'aube
  vient après elle) ; le test « réparer … relue » le vérifie. Une mort de la nuit
  passe par `mourir` (pertes, moral, promotions, corps), comme de jour.
- **Un tir sans cible** comptait pour la fatigue des bras (et l'aurait fait pour
  l'expérience) : des hommes « bras morts de fatigue » sans avoir vu l'ennemi. `tirer`
  rend false quand personne n'est à portée (v0.5.0).
- **En face se saignait à blanc** (v0.9.0, sur une bataille entière jouée sans
  ordres) : un assaut toutes les 160 s, n'importe où, de 130 m à découvert : plus de
  1 000 morts en cinq jours, et plus personne en face au sixième. Il ne sort plus que
  là où il a 1,6 attaquant par défenseur (`tranchee.rapport`) ; sinon il prépare au
  220 sur ce tronçon : une semaine de pilonnage, puis des assauts où nos lignes ont
  faibli (~300 morts chez nous, ~700 en face, sur 11 et 15 jours).
- **Le refus d'un jour se juge sur le moral du soir** (avant que la nuit n'en rende une
  part) : jugé à l'aube, il ne venait presque jamais (il fallait un moral de 0,02 le
  soir). La contagion porte à 150 m : deux régiments côte à côte sont à ~130 m l'un de
  l'autre, et à 80 m seul celui de derrière s'en ressentait (v0.11.0).
- **Les abris ne changent pas le terrain** (ils sont dans l'état, pas dans `diff`) : la
  sauvegarde n'a rien à rejouer ; un 220 qui les crève le fait pendant le jour, dans
  `tomber`, et l'état sauvegardé le garde.
- **Un seul défenseur gardait un tronçon contre un régiment entier** (v0.15.0) : un tronçon ne changeait de main que vide de ses
  défenseurs, et un blessé debout suffisait ; deux ou trois hommes résistaient des minutes à des dizaines d'attaquants. Désormais
  (`prises`, `R.tranchee.melee` et `tenue`) un tronçon est pris quand les attaquants y sont au moins 2 fois plus nombreux (et au moins 3)
  pendant 6 s : la mêlée (`etat.melee`, par tronçon, sauvegardée ; elle retombe deux fois plus vite qu'elle ne monte). Mesuré
  (graines 7 et 8, tous les régiments envoyés dans la 1re ligne d'en face, 3 jours) : la règle change peu le cours d'une attaque
  frontale (graine 7, au soir du jour 2 : nous tenons 46 tronçons avec la mêlée, 41 sans ; 623 morts chez nous, 644 sans ; et dès le premier jour, 570 des nôtres sur 750), car les attaquants meurent à
  découvert avant d'y entrer ; elle joue sur une brèche (test « la mêlée » : trois défenseurs, vingt attaquants). `tenue: 1e9`
  redonne l'ancienne règle.
- **Un régiment, un secteur** (v0.14.0) : un ordre sur une tranchée étale le régiment sur 46 m au plus (`largeurSecteur` − 4), plus
  serré s'il le faut ; à 94 hommes, la longueur de deux rangs faisait ~66 m, et « un secteur » en couvrait trois. Les tests : un assaut de
  l'ennemi se teste en vidant quatre régiments seulement (tous vidés, la bataille finit), et un 220 sur un secteur (deux tronçons)
  se tire en plusieurs salves. L'équilibre (huit régiments sur la 1re ligne seule : deux fois plus d'hommes au mètre) n'est pas
  encore mesuré.
- **L'assaut frontal coûtait trop** (v0.17.0 ; Jérôme : « adoucir ») : tous les régiments envoyés dans la 1re ligne d'en face perdaient
  570 à 665 hommes sur 750 le premier jour (mesuré, graines 7 et 8 : presque tout par le tir à découvert, 540 à 627, très peu par les obus).
  `tir.mouvement` (0,75 : un homme qui marche à pleine vitesse échappe au coup avec cette chance) et `tir.precision` (0,05 → 0,035) les
  ramènent à 382-390 (graines 7 et 8) ; `mouvement` seul (0,5 ou 0,75) n'en ôtait que 70 à 130 : l'essentiel des morts tombe quand les
  attaquants s'arrêtent et se serrent devant la tranchée. Une bataille sans ordres devient plus calme (graine 7, 4 jours : 121 des nôtres
  et 16 en face, contre 223 et 151 avant) : en face attaque moins.
- **Le 75 est le plus précis, pas le plus meurtrier** (Jérôme, v0.34.5) : la chance de toucher un homme dans le rayon (`tuerDans`, 0,7 × (1 − d/r)^1,5) est multipliée par `letal` du calibre (`calibres.js` : 75 → 1, 155 → 1,5, 220 → 2 ; plafonnée à 0,95). Hommes touchés attendus par obus sur une troupe de 0,2 homme/m² : ~1,6, ~7,4, ~20 (avant : 1,6, ~4,9, ~10) ; par salve complète, 39, 89, 120 (avant : 39, 59, 60), avant dispersion et abris. Mesuré sur un régiment de 400 hommes, une salve : bruité (graines 3, 5, 7), à refaire sur une bataille entière avant de toucher à `precision` ou à `rapport`. Le dessin a changé (13 images de `test/rendu.json`, plus de morts sous les obus).
- **Le souffle des obus** (Jérôme, v0.16.0) : `tuerDans` (army.js) jette les survivants jusqu'à `obus.souffleZone` (1,8) rayons du
  point de chute, à l'opposé, d'une vitesse qui tombe à zéro au bord (`obus.souffle`, 16 m/s au centre ; la vitesse retombe d'elle-même,
  ~3 m parcourus, puis la marche les ramène à leur place) ; sans hasard, donc la partie relue est la même. Le dessin les faisait sauter
  (`souffler`, un bond de 0,6 s) : **retiré en v0.32.3** (Jérôme : « soit projection, soit ralentissement, pas de saut » ; la poussée reste, le bond non ; le jeu ne ralentit personne : à décider d'après les variantes B à D du sujet « Projections » du labo).
  **Mesuré sur l'équilibre** (`scripts/mesure-souffle.mjs`, v0.26.0 : 4 salves de 220 sur un régiment en tranchée, graines 3, 5, 7, 11) : le souffle sort 6 à 9 hommes de leur place (à plus de 2 m) et ils sont revenus en 1 s ; les morts
  ne bougent pas au-delà du bruit (5-15 avec, 9-16 sans). Rien à régler. Le bleu de nos soldats (v0.16.0) se lit sous la pluie (capture du zoom 4, jour 1 sous pluie) : rien à régler non plus.
- **Les morts d'obus sont projetés** (Jérôme, v0.24.0) : `projeter` (bataille.js, appelé par `frapper` avec le choc `{ x0, y0, d, rayon }` que `tuerDans` donne) jette le corps à
  l'opposé du point de chute, de `obus.projection.min` à `max` m (8 à 15 pour un rayon de 10, en proportion du rayon : un 75 jette de 3 à 6 m, un 220 de 8 à 15), sans hasard (collé au point de chute : un côté
  fixé par le numéro) ; `etat.corps` garde le point d'arrivée (rien de neuf dans la sauvegarde). `B.volants` (`[indice du corps, x, y du départ, âge]`, vieilli par `avancer`, jamais sauvegardé) : le dessin
  (`majCorps`) fait voler le corps de là où l'homme est tombé, sur une flèche de `projection.haut` fois la distance, pendant `projection.duree` s. Les morts de la nuit ne volent pas.
- **Les petites batailles des tests durent trois jours** (`jours: 3` de `petite`) :
  quinze jours de 200 hommes, c'était une minute de plus par test.
- **Le moral trop vif** : à 0,03 par seconde de peur, un seul barrage mettait un
  régiment en déroute en 30 s, et il se ralliait aussi vite ; à 0,006 (et un retour
  de 0,0015), une déroute dure le reste du jour (mesuré, 1 000 hommes par camp).
- Ordre des tirages : `nouvelleBataille` tire la météo (une branche du générateur),
  puis les positions de départ. Changer cet ordre change toutes les batailles.
- **Les caractéristiques de chaque homme et le corps à corps (Jérôme, v0.69.0 ; `caracteristiques` de identite.js, `R.melee`, `R.caracteristiques`, `facteur` et le bloc `duel` de `pasArmee` d'army.js)** : (1) **quatre caractéristiques de 0 à 100** (l'adresse au tir, la force, l'endurance, le calme ; la moyenne de deux hachages du numéro et du camp : 50 en moyenne, écart-type 20) dans l'armée (`A.adresse`, `A.force`, `A.endurance`, `A.calme`, sauvegardées, `VERSION` 11 ; la campagne ne les emporte pas d'une bataille à l'autre : le numéro de bataille, pas celui de campagne, les tire) ; la fiche d'un homme les montre (quatre jauges, `CARACTERISTIQUES`, `caracEnMots`). Elles jouent par un facteur `1 ± amplitude × (valeur − 50 %)` (`R.caracteristiques`, 0,6 : de × 0,7 à × 1,3, rien pour un homme moyen : **la moyenne de la troupe reste celle d'avant**) : l'adresse sur la chance de toucher d'un tir (`chanceTir`), l'endurance sur la fatigue des jambes, le calme sur la peur qui le gagne (`effrayer`, tous ses appels : obus, avions, chars, un mort à côté). (2) **Le corps à corps** : deux hommes d'**camps opposés à moins de `R.melee.portee` (1,6 m)** (l'ennemi le plus proche de la grille de voisinage déjà parcourue pour la séparation : aucun parcours de plus) s'affrontent : ils ne marchent plus qu'à `arret` (12 %) de leur marche, ne tirent plus, se font face (`A.duelAng`, que le dessin lit) et frappent toutes les `periode` (1,6 s ± 30 %, sur le `tirT` du tir) ; la chance de toucher vaut `touche` (0,15) × (0,55 + 0,9 × force du frappeur) × (1,3 − 0,6 × endurance de l'autre) × (1 − 0,4 × fatigue des bras) × l'expérience, un coup qui touche tue avec `mortel` (0,55) × (1,2 − 0,4 × endurance), sinon blesse comme un tir (`frapper(…, 'mêlée', …, tireur)` : le tueur compte sa victime). Ni un blessé, ni un régiment en déroute, ni un homme que la terreur tient ne se bat ; il se fait quand même frapper. Un assaut qui arrive dans une tranchée ou une file qui se croise engage donc ses hommes un à un, sans règle d'assaut de plus ; `A.duel` et `A.duelAng` ne sont pas sauvegardés (refaits à chaque pas, déplacés par `compacter`). **Mesuré** (`test/melee.test.mjs`) : deux hommes moyens, 200 duels, 10 s : 80 à 120 morts par camp, à peu près égaux ; un fort et endurant (100) contre un faible (0) : plus de deux fois plus de morts chez le faible, d'un camp comme de l'autre. **Piège** : le premier du tableau frappe toujours le premier si les deux coups partent au même pas (le test lançait les deux temporisations à zéro : 80 morts contre 120 ; `tirT` s'étale à l'initialisation). (3) **La marche passe de 1,3 à 1,9 m/s** (`R.vitesse.marche`, « que l'action soit plus nerveuse ») : un assaut qui traverse le no man's land (150 m) y passe 80 s au lieu de 115 ; la fatigue, la peur et le tir qui lisent la vitesse en rapport à `marche` ne changent pas de sens ; **les pertes d'un assaut type doublent** (`test/stances.test.mjs`, 200 hommes par camp, 150 s : nos morts 62 → 114, les leurs 6 → 83 pour la graine 3 ; **sans corps à corps (`touche` 0), la marche seule donne 47 et 11** : c'est lui qui rend l'assaut sanglant des deux côtés, avant les défenseurs ne perdaient presque personne) ; essayé à 0,4 : 132 et 109, à 0,2 : 104 et 100, retenu 0,15 : à rééquilibrer à la mesure si Jérôme le trouve trop sanglant (`R.melee.touche`, `R.vitesse.marche`).
- **La place des gradés (constaté pour les grades à l'écran, v0.68.0 ; rien changé)** : à la création, l'homme de rang `k` prend la place `k` de la formation, donc le capitaine, les lieutenants et l'adjudant sont **au bout gauche du premier rang** (places 0 à 3), les sergents et caporaux juste après ; `reattribuer` (marche) range ensuite tout le monde selon sa position, sans égard au grade. `placesCommandement(o, n)` de army.js (pur, testé) donne les places d'un commandement au milieu du premier rang (le capitaine au centre, les lieutenants aux quarts, l'adjudant derrière lui) : **essayé dans `nouvelleBataille` et `reattribuer`, retiré** : 5 tests de nuit de `test/bataille.test.mjs` (évacuer, réparer, inhumer, sept corvées, mêlée de nuit : leurs scénarios dépendent du contact au soir, que la disposition change) et toutes les références de rendu changent, et c'est un changement de simulation, pas de dessin. Il ne sert que la parade du labo. À décider avec Jérôme (voir la proposition de gameplay dans `docs/pistes-avancees.md`).
