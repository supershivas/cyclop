// Les nombres du jeu : aucun nombre magique dans la logique (section 12).
// L'atelier peut les régler (onglet Réglages) ; la version publiée est lue au
// lancement dans assets/design/reglages.json. Unités : mètres, secondes de jeu,
// « quarts » (un quart de cube = 25 cm, l'unité de hauteur du terrain).
export const REGLAGES = {
  terrain: {
    bosses: 3.2,          // m : amplitude des grandes bosses
    ondulation: 0.9,      // m : amplitude des petites
    plancher: 24,         // quarts sous le sol d'origine : plancher dur (−6 m)
    durete1: 4,           // quarts : jusqu'à 1 m, un quart coûte 1 (100 %)
    durete2: 12,          // quarts : jusqu'à 3 m, un quart coûte 2 (50 %) ; au-delà, 4 (25 %)
    levreMax: 8,          // quarts : la terre éjectée ne monte pas au-delà de 2 m
    nappeMin: 2,          // m sous le sol lissé : la nappe d'eau du secteur
    nappeMax: 3,
    arbreRayon: 5,        // m : un obus à moins de cette distance abat un arbre
  },
  hydro: {
    pluie: 0.0025,        // m d'eau par heure de pluie
    infiltration: 0.004,  // m par heure, dans un sol sec
    drainage: 0.0012,     // m par heure : l'eau qui stagne au-dessus de la nappe s'enfonce
    reserve: 0.09,        // m d'eau qu'un sol retient avant d'être de la boue pleine
    ruissellement: 0.45,  // part de l'écart de niveau qui coule vers le voisin le plus bas
    passes: 3,            // passes de ruissellement par heure
    evaporation: 0.0006,  // m par heure de temps sec
    sechage: 0.006,       // humidité perdue par heure de temps sec
    remontee: 0.2,        // part du manque comblée par la nappe, par heure
    capillarite: 1.5,     // m : au-dessus de la nappe, le sol est mouillé sur cette hauteur
    glissement: 0.12,     // part de l'humidité qui glisse vers le voisin plus bas, par heure
    eau: 0.07,            // m : au-delà, la case est de l'eau
    boue: 0.7,            // humidité : au-delà, de la boue
    humide: 0.4,          // humidité : au-delà, un sol humide
    humiditeDepart: 0.18,
  },
  // Le corps à corps (Jérôme, v0.69.0 : « l'animation au corps à corps est possible avec un combattant ennemi ; les statistiques de chacun jouent dans leur efficacité ») :
  // deux hommes de camps opposés à moins de `portee` mètres s'affrontent : ils s'arrêtent, se font face, et frappent à la baïonnette toutes les `periode` secondes (± 30 %).
  // La chance de toucher croît avec la force du frappeur et baisse avec l'endurance de l'autre (voir `caracteristiques` de identite.js : 0 à 100, 50 en moyenne) ; elle tombe avec la fatigue des bras.
  melee: {
    portee: 1.6,          // m
    periode: 1.6,         // s entre deux coups
    touche: 0.15,          // chance de toucher d'un homme moyen contre un homme moyen
    mortel: 0.55,         // chance qu'un coup qui touche tue (sinon : blessé, comme un tir)
    fatigue: 0.06,        // fatigue des bras par coup
    charge: 30,           // m : un ennemi seul (1 à 3 hommes dans son carré de 8 m) à cette distance est chargé à la baïonnette (v0.79.0)
    chargePart: 0,        // (0 : éteint ; 0,5 l'essayait : trop de morts, à calibrer) la part des hommes (par `rnd`, sans tirage) qui chargent ainsi
    arret: 0.12,          // la part de sa marche qu'un homme au corps à corps garde (il tient sa place d'escrime)
    force: 0.9,           // l'écart de chance qu'apporte la force : chance × (0,55 + force × cette valeur), force de 0 à 1
    endurance: 0.6,       // … et l'endurance de l'autre : chance × (1,3 − endurance × cette valeur)
  },
  // Les caractéristiques d'un homme (identite.js, de 0 à 100, 50 en moyenne) agissent par un facteur 1 ± amplitude × (valeur − 50 %) : l'adresse sur la chance de toucher d'un tir (plus d'adresse, plus de coups au but),
  // l'endurance sur la fatigue des jambes et le calme sur la peur qui le gagne (plus, moins) ; 0,6 : de × 0,7 à × 1,3. Un homme moyen n'est pas touché : la moyenne de la troupe reste celle d'avant.
  caracteristiques: { adresse: 0.6, endurance: 0.6, calme: 0.6 },
  // La progression des caractéristiques (Jérôme, v0.69.0 : « elles évoluent au fur et à mesure des combats ») : on progresse en pratiquant, de moins en moins vite près de 100, de `plafond` points au plus par
  // bataille au-dessus du départ ; une blessure et la terreur font perdre pour de bon (jamais sous `plancher`). Aucun hasard : tout vient de ce qui arrive à l'homme (points ; par seconde quand c'est dit).
  progression: {
    plafond: 25,
    plancher: 5,
    tir: 0.2, toucheTir: 1.6,                  // adresse : par coup tiré, par coup au but
    coup: 0.6, toucheCoup: 2, tue: 4,           // force : par coup de baïonnette, qui touche, qui tue
    marcheFatigue: 0.06,                       // endurance : par seconde de marche, les jambes lourdes (fatigue au-delà de 0,4)
    nuit: 2,                                   // endurance : par nuit passée au front les jambes lourdes
    seuilPeur: 0.35, tient: 0.02,              // calme : par seconde passée inquiet sous le feu (peur entre ce seuil et la terreur)
    terreur: 0.3, deroute: 0.1,                // calme perdu par seconde de terreur, de déroute du régiment
    blessure: { bras: 10, jambe: 10, tete: 8 },  // points perdus : adresse et force (bras), endurance (jambe), calme et la moitié en adresse (tête)
    promotion: 5,                              // calme gagné à une promotion
  },
  vitesse: {
    marche: 1.9,          // m/s sur sol sec et plat (Jérôme, v0.69.0 : « accélérer la marche, que l'action soit plus nerveuse » ; 1,3 avant)
    sec: 1, humide: 0.8, boue: 0.38, eau: 0.25, glace: 0.75,
    profond: 0.03,        // l'eau profonde d'un lac ou d'un fleuve : on n'y passe pas (v0.43.0)
    pente1: 0.6,          // marche d'un demi-mètre
    pente2: 0.25,         // marche d'un mètre : très lent
    mur: 8,               // quarts : 2 m, infranchissable sans pente ni échelle
  },
  foule: {
    separation: 0.75,     // m
    espacement: 2.4,      // m entre deux places d'une formation
    largeur: 5,           // une formation est cinq fois plus large que profonde
    formes: {             // (v0.23.0) la forme d'un régiment en terrain libre : `largeur` = rapport largeur / profondeur (le nombre de colonnes en sort), ou `cols` fixe
      bloc:    { nom: 'Bloc', largeur: 5 },
      ligne:   { nom: 'Ligne', largeur: 40 },        // large (au plus un secteur) et mince : tous tirent, tous sont exposés
      deux:    { nom: 'Par deux', cols: 2 },          // deux hommes de front
      colonne: { nom: 'Colonne', cols: 4 },           // quatre de front : étroite et longue, pour passer vite
    },
    voisins: 6,           // voisins regardés au plus
    champ: 22,            // m : plus loin de sa place, on suit le champ de coûts
    champsMax: 48,        // champs gardés en cache : au moins un par régiment (16) et leurs versions encore chaudes ; à 10, onze buts différents se chassaient du cache et chaque pas refaisait des champs (1,4 → 49 ms par pas, v0.34.2)
    champGroupes: 16,     // les régiments se partagent le passage à une nouvelle version des coûts en autant de rangs…
    champRetard: 0.17,    // s : …un rang tous les… (16 × 0,17 ≈ la période des coûts : un champ refait à la fois, v0.34.4)
    champPeriode: 3,      // s : un champ périmé (terrain changé) est refait au plus tous les…
    abri: 0.5,            // le coût d'un carré de 4 m où passe une tranchée intacte, multiplié par… : on préfère l'abri à découvert, même plus long (v0.21.4 ; 1 : plus de préférence)
    abriPart: 0.15,       // … dès que cette part du carré est en tranchée ou en boyau (2 : jamais)
  },
  soldat: {
    // la fatigue (0 à 1) : les jambes se fatiguent à marcher (plus dans la boue), les bras à tirer
    fatigueMarche: 0.01,  // par seconde de marche sur sol sec
    fatigueBoue: 2.5,     // la marche dans la boue fatigue d'autant plus
    reposJambes: 0.006,   // par seconde à l'arrêt
    fatigueTir: 0.05,     // par coup tiré
    reposBras: 0.004,     // par seconde
    effetFatigue: 0.4,    // des jambes épuisées ralentissent de 40 %
    nuitRepos: 0.7,       // une nuit efface 70 % de la fatigue et la moitié de la peur
    // les blessures : une jambe ralentit, un bras fait tirer deux fois moins ; blessé deux fois, on meurt
    mortelTir: 0.45,      // une balle tue 45 fois sur 100, sinon elle blesse
    jambeBlessee: 0.45,   // vitesse d'un homme blessé à la jambe
    brasBlesse: 2,        // le temps entre deux tirs, multiplié
    jambeLegere: 0.5,     // la part des blessés à la jambe qui peuvent encore marcher : avec ceux du bras, ils regagnent l'arrière et ne tirent plus (Jérôme, v0.35.0) ; la tête et les autres restent à terre
    arriere: 12,          // m : l'arrière, derrière la dernière ligne de leur camp, où les blessés qui marchent s'arrêtent
    // la peur (0 à 1) : les obus tout près, les morts à côté ; elle retombe lentement
    peurObus: 0.6,        // au bord du cratère (moins à trois fois le rayon)
    peurMort: 0.15,       // un homme qui tombe à moins de 4 m
    peurDecroit: 0.02,    // par seconde
    terreur: 0.85,        // au-delà, on ne tire plus
  },
  // la victoire anticipée de la mission « prendre » (Jérôme, v0.77.0) : la 1re ligne d'en face tenue à `priseMin` pendant `joursDeTenue` soirs de suite
  mission: { priseMin: 0.75, joursDeTenue: 2 },
  tir: {
    portee: 70,           // m
    cone: 0.75,           // rad, de part et d'autre du front
    periode: 5,           // s entre deux tirs d'un soldat (en moyenne)
    precision: 0.035,     // chance de toucher dans un groupe dense, à découvert (0,05 avant la v0.17.0 : l'assaut frontal coûtait 570 à 665 hommes sur 750 le premier jour ; 385 avec ceci et `mouvement`)
    densite: 10,          // soldats dans un carré de 8 m pour la précision pleine
    proche: 0,            // m (0 : éteint, v0.79.0 ; 25 l'essayait : trop de morts, à calibrer) : à cette distance, un homme seul est visé comme une cible dense (la chance monte jusqu'à la pleine à bout portant) ; v0.79.0, avant un homme seul était touché 10 fois moins
    abri: 0.45,           // dans un creux d'un demi-mètre : la chance est multipliée par…
    mouvement: 0.75,      // un homme qui marche à pleine vitesse échappe au coup avec cette chance (proportionnelle à sa vitesse) : un assaut à découvert coûte moins (v0.17.0)
  },
  // les postures d'un régiment (v0.36.0 ; textes : data/stances.js). Multiplicateurs de `tir` ; `volonte` est le tir d'avant : tout à 1.
  stance: {
    volonte: { portee: 1, precision: 1, periode: 1 },
    retenu: { portee: 0.5, precision: 1.5, periode: 1 },   // portée : la part de `tir.portee` (35 m) ; périodes et précision à régler à la mesure (scripts/mesure-stances.mjs)
  },
  obus: {
    boue: 0.5,            // dans la boue, l'obus s'enfouit : rayon et lèvre multipliés par…
    abri: 0.6,            // un soldat dans un creux : chance multipliée par…
    souffle: 16,          // m/s : la vitesse dont le souffle jette un survivant collé au point de chute (elle tombe à zéro au bord de la zone ; il parcourt ~0,2 s × cette vitesse : 3 m) (v0.16.0)
    projection: { min: 8, max: 15, rayonRef: 10, duree: 0.9, haut: 0.25 },   // (v0.24.0) un mort d'obus est jeté à l'opposé : de `min` (au bord du rayon) à `max` m (collé au point de chute) pour un rayon de `rayonRef`, en proportion du rayon de l'obus ; le vol dure `duree` s, `haut` : sa flèche, en part de la distance
    souffleZone: 1.8,     // la zone du souffle, en rayons de l'obus (les morts sont dans un rayon)
  },
  tranchee: {
    abriFace: 0.15,       // dans une tranchée, un tir qui vient de devant (le parapet) : chance multipliée par…
    abriDos: 0.6,         // … et de derrière (le parados : une tranchée prise sert à l'envers)
    espacement: 1.6,      // m entre deux hommes le long d'une tranchée occupée
    prise: 3,             // hommes dans un tronçon vide de ses défenseurs : il est pris
    melee: 2,             // un tronçon encore défendu est pris quand les attaquants y sont au moins autant de fois plus nombreux que les défenseurs (et au moins `prise`) …
    tenue: 6,             // … pendant ce nombre de secondes (la mêlée : `etat.melee`, par tronçon ; 1e9 : la règle d'avant la v0.15.0, un tronçon n'est pris que vide)
    assaut: 0.6,          // en face ne lance à l'assaut qu'un régiment qui a encore cette part de ses hommes
    rapport: 1.6,         // … et seulement là où il a au moins autant d'attaquants par défenseur (sinon, il prépare au 220)
  },
  // le moral d'un régiment (0 à 1) : les morts et la peur le font baisser, le calme, l'encadrement et
  // l'expérience le font remonter, la nuit plus encore (Jérôme, v0.5.0)
  moral: {
    depart: 0.85,
    mort: 0.0045,         // par mort, pour un régiment de 125 hommes (plus pour un plus petit)
    officier: 0.06,       // en plus, quand tombe un officier ou l'adjudant
    blesse: 0.0015,       // par blessé
    peur: 0.006,          // par seconde, multiplié par la peur moyenne des hommes
    retour: 0.0015,       // par seconde au calme (moins sans officiers, plus avec des hommes aguerris)
    prise: 0.06,          // un tronçon pris
    perte: 0.05,          // un tronçon perdu (pour ceux qui y étaient)
    nuit: 0.35,           // la nuit rend cette part de ce qui manque…
    cicatrice: 0.5,       // … mais jamais au-dessus de 1 − cicatrice × la part des hommes perdus
    ebranle: 0.5,         // en dessous : tire moins, refuse de sortir vers l'ennemi
    tirEbranle: 1.4,      // le temps entre deux tirs, multiplié
    deroute: 0.2,         // en dessous : la déroute (il reflue vers sa tranchée de départ, ne tire plus)
    ralliement: 0.4,      // au-dessus, un régiment en déroute se rallie
    avance: 10,           // m : un ordre qui rapproche de l'ennemi de plus que cela est une sortie
    contagion: 0.15,      // une déroute abat le moral des voisins (à moins de contagionRayon m) de cette part, au plus
    contagionRayon: 150,  // (deux régiments côte à côte sont à ~130 m l'un de l'autre)
    refusSous: 0.3,       // à l'aube, un régiment au moral si bas, qui a perdu plus de refusPertes de ses hommes…
    refusPertes: 0.35,
    refusChance: 0.5,     // … refuse de monter de toute la journée, une fois sur deux (le Discours de la servitude volontaire)
    poursuite: 0.6,       // en face, un régiment qui a ce moral (et la moitié de ses hommes) poursuit après une prise
  },
  // l'expérience d'un homme (0 à 1) : le feu qu'il a vu et survécu ; elle calme sa peur, assure son tir,
  // et le fait choisir quand il faut remplacer un gradé tombé
  experience: {
    feu: 0.08,            // un obus ou un mort tout près, survécu (moins plus loin)
    tir: 0.002,           // chaque tir
    prise: 0.1,           // un tronçon pris, pour ceux qui y sont
    nuit: 0.02,           // une nuit passée au front
    calme: 0.5,           // la peur qui le gagne, multipliée par 1 − calme × expérience
    adresse: 0.6,         // sa chance de toucher, multipliée par 1 + adresse × expérience
  },
  // la nuit et ses corvées (Jérôme, v0.6.0)
  nuit: {
    retourChance: 0.5,    // un blessé évacué revient au front avec cette chance (Jérôme, v0.18.0) …
    retourNuits: [0, 1, 2, 3],   // … après autant de nuits que sa blessure en demande : un bras 1, une jambe 2, la tête 3 (l'indice : la blessure)
    reposTravail: 0.4,    // un régiment à la corvée ne se repose que de cette part
    moralRepos: 0.15,     // le repos rend en plus cette part de ce qui manque au moral
    regroupe: 40,         // m : au matin, un homme plus loin que cela de sa place est ramené à sa place (le regroupement de l'aube, v0.78.0)
    mortBlesse: 0.12,     // un blessé laissé au front meurt dans la nuit (à la tête : deux fois plus)
    risqueBoyau: 0.005,   // … et pour porter les blessés par les boyaux
    rayonCorps: 40,       // m : les corps laissés autour d'un régiment…
    moralCorps: 0.003,    // … lui pèsent, chacun, au matin…
    moralCorpsMax: 0.15,  // … jusqu'à cette part de son moral
    moralEvacuer: 0.03,   // on s'occupe des blessés : le moral remonte un peu
    // le ravitaillement : des vivres pour quelques jours, apportés de nuit par les boyaux
    vivres: 3,            // nuits de vivres d'un régiment ravitaillé
    faimRepos: 0.5,       // sans vivres, la nuit ne repose que de cette part…
    faimMoral: 0.06,      // … et le moral perd cela chaque nuit
    calme: 60,            // m : dans une tranchée d'en face, un régiment d'en face à moins de cela : ni évacuer ni ravitailler (v0.22.0)
    // la mêlée de nuit (Jérôme, v0.39.0) : un tronçon où les deux camps se font face au soir se joue pendant la nuit
    meleeMort: 0.3,       // chance de tomber, par homme, à forces égales ; × 2 × (leurs forces / les forces totales) : le plus faible y laisse bien plus que le plus fort
  },
  jour: {
    duree: 360,           // s de jeu pour une journée (6 h → 18 h)
    heureDebut: 6,
    heureFin: 18,
  },
  ia: {
    barrage: 60,          // s entre deux barrages d'en face (en moyenne)
    offensive: 160,       // s entre deux avances d'en face
    avance: 45,           // m gagnés par une avance d'en face
    stance: '',           // la posture qu'en face prend dans ses tranchées (`retenu`) ; '' : aucune, il tire à volonté (v0.36.3, à décider d'après scripts/mesure-stances.mjs --ia)
  },
};
