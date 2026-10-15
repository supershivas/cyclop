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
  vitesse: {
    marche: 1.3,          // m/s sur sol sec et plat
    sec: 1, humide: 0.8, boue: 0.38, eau: 0.25, glace: 0.75,
    pente1: 0.6,          // marche d'un demi-mètre
    pente2: 0.25,         // marche d'un mètre : très lent
    mur: 8,               // quarts : 2 m, infranchissable sans pente ni échelle
  },
  foule: {
    separation: 0.75,     // m
    espacement: 2.4,      // m entre deux places d'une formation
    largeur: 5,           // une formation est cinq fois plus large que profonde
    voisins: 6,           // voisins regardés au plus
    champ: 22,            // m : plus loin de sa place, on suit le champ de coûts
    champsMax: 10,        // champs gardés en cache
    champPeriode: 3,      // s : un champ périmé (terrain changé) est refait au plus tous les…
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
    // la peur (0 à 1) : les obus tout près, les morts à côté ; elle retombe lentement
    peurObus: 0.6,        // au bord du cratère (moins à trois fois le rayon)
    peurMort: 0.15,       // un homme qui tombe à moins de 4 m
    peurDecroit: 0.02,    // par seconde
    terreur: 0.85,        // au-delà, on ne tire plus
  },
  tir: {
    portee: 70,           // m
    cone: 0.75,           // rad, de part et d'autre du front
    periode: 5,           // s entre deux tirs d'un soldat (en moyenne)
    precision: 0.035,     // chance de toucher dans un groupe dense, à découvert (0,05 avant la v0.17.0 : l'assaut frontal coûtait 570 à 665 hommes sur 750 le premier jour ; 385 avec ceci et `mouvement`)
    densite: 10,          // soldats dans un carré de 8 m pour la précision pleine
    abri: 0.45,           // dans un creux d'un demi-mètre : la chance est multipliée par…
    mouvement: 0.75,      // un homme qui marche à pleine vitesse échappe au coup avec cette chance (proportionnelle à sa vitesse) : un assaut à découvert coûte moins (v0.17.0)
  },
  obus: {
    boue: 0.5,            // dans la boue, l'obus s'enfouit : rayon et lèvre multipliés par…
    abri: 0.6,            // un soldat dans un creux : chance multipliée par…
    souffle: 16,          // m/s : la vitesse dont le souffle jette un survivant collé au point de chute (elle tombe à zéro au bord de la zone ; il parcourt ~0,2 s × cette vitesse : 3 m) (v0.16.0)
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
    reposTravail: 0.4,    // un régiment à la corvée ne se repose que de cette part
    moralRepos: 0.15,     // le repos rend en plus cette part de ce qui manque au moral
    mortBlesse: 0.12,     // un blessé laissé au front meurt dans la nuit (à la tête : deux fois plus)
    rayonInhumer: 60,     // m autour du régiment
    inhumerParHomme: 1,   // corps qu'un homme peut porter en terre dans la nuit
    risqueDehors: 0.03,   // chance de tomber, par homme, pour une corvée au-delà de nos lignes (balles perdues, fusées)
    risqueBoyau: 0.005,   // … et pour porter les blessés par les boyaux
    rayonCorps: 40,       // m : les corps laissés autour d'un régiment…
    moralCorps: 0.003,    // … lui pèsent, chacun, au matin…
    moralCorpsMax: 0.15,  // … jusqu'à cette part de son moral
    moralEvacuer: 0.03,   // on s'occupe des blessés : le moral remonte un peu
    // les abris profonds (v0.11.0) : creusés nuit après nuit sous un tronçon
    abriMax: 3,           // niveaux (une nuit de travail chacun)
    abriParNiveau: 0.2,   // un obus tue d'autant moins (par niveau) ceux qui sont dans le tronçon
    abriDetruit: '220',   // le calibre qui crève un abri (un niveau par obus tombé dans le tronçon)
    // le ravitaillement : des vivres pour quelques jours, apportés de nuit par les boyaux
    vivres: 3,            // nuits de vivres d'un régiment ravitaillé
    faimRepos: 0.5,       // sans vivres, la nuit ne repose que de cette part…
    faimMoral: 0.06,      // … et le moral perd cela chaque nuit
    // le coup de main : quelques volontaires vont chercher des prisonniers dans la tranchée d'en face
    coupHommes: 20,       // volontaires au plus (et un sur cinq du régiment au plus)
    coupMort: 0.15,       // chance pour chacun d'y rester (moins s'il a de l'expérience)
    coupPrise: 0.2,       // prisonniers ramenés par volontaire (plus avec l'expérience, moins si l'autre veille)
    coupMoral: 0.06,      // le moral gagné (des prisonniers ramenés), ou perdu en face
    coupExp: 0.15,        // l'expérience des volontaires qui reviennent
    coupPortee: 200,      // m : jusqu'où ils vont chercher
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
  },
};
