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
    precision: 0.05,      // chance de toucher dans un groupe dense, à découvert
    densite: 10,          // soldats dans un carré de 8 m pour la précision pleine
    abri: 0.45,           // dans un creux d'un demi-mètre : la chance est multipliée par…
  },
  obus: {
    boue: 0.5,            // dans la boue, l'obus s'enfouit : rayon et lèvre multipliés par…
    abri: 0.6,            // un soldat dans un creux : chance multipliée par…
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
