// Les secteurs du front : trois cartes à choisir en début de partie (v0.29.0). Même taille, mêmes lignes (400 × 300 m, quatre lignes par camp) : ce qui change
// est le sol, l'eau et ce qui pousse. `resume` et `profil` (une coupe nord-sud du sol, de la 4e ligne d'en face à la nôtre, 0 bas, 1 haut) disent
// la carte au joueur ; `relief` est lu par creerTerrain (bosses et ondulation : des facteurs, `crete`, `nappe` : m de plus ou de moins sous le sol).
const ESSAI = {
    nom: 'Les labours',
    resume: 'Un champ ouvert aux bosses douces, quelques bosquets : le front tel qu\'on l\'imagine. La boue vient avec la pluie.',
    profil: [0.50, 0.55, 0.50, 0.46, 0.52, 0.56, 0.50, 0.47, 0.52, 0.50, 0.46, 0.50],
    largeur: 400,           // cases de 1 m
    hauteur: 300,
    jours: { min: 10, max: 15 },   // la durée de la bataille, tirée de la graine (trois jours avant la v0.9.0)
    reserves: 4,            // régiments frais en réserve, par camp : la relève (v0.9.0)
    // la mission, tirée de la graine, jugée à la fin (v0.9.0)
    missions: ['tenir', 'prendre'],
    pluieAuMoins: 2,        // jours de pluie garantis dans la chaîne (la boue doit venir)
    arbres: 150,            // dans le secteur (les marges en ont autant, à surface égale ; 40 avant la v0.7.0, 70 avant la v0.8.0)
    bois: 3,                // des bois serrés (une trentaine d'arbres chacun), dans le secteur ; autant dans les marges, à surface égale
    haies: 5,               // des lignes de buissons, dans tout le terrain (v0.7.0)
    buissons: 160,          // des buissons épars, dans tout le terrain
    regiments: 8,           // par camp : un régiment par secteur de 50 m (Jérôme, v0.14.0 ; six avant, huit avant la v0.7.0)
    soldats: 750,           // par camp (huit régiments de 94) (la mesure en charge 4 000 : ?soldats=8000)
    ligne: { eux: 70, nous: 230 },   // rangée de cases où chaque camp se tient au départ (dans le secteur)
    // le terrain déborde du secteur : des marges sans régiments, pour que la vue reste toujours sur le
    // terrain, même tout dézoomée (Jérôme, v0.3.0). En perspective (30°, plongée de 54°), le zoom 1 d'une
    // image de 640 × 400 pixels voit ~790 × 610 m de sol : 400 + 2 × 220 = 840, 300 + 2 × 170 = 640.
    marges: { x: 220, y: 170 },
    // les tranchées (lot 1, v0.4.0) : quatre lignes par camp (rangées du secteur, la première d'abord),
    // en créneaux, des boyaux de l'une à l'autre ; 130 m de no man's land entre les premières lignes
    tranchees: {
      lignes: { nous: [215, 235, 256, 278], eux: [85, 65, 44, 22] },
      profondeur: 6,        // quarts : 1,5 m (à 2 m, on n'en sortirait qu'à force)
      parapet: 1,           // quart de terre jetée du côté de l'ennemi
      creneau: 1.5,         // m : les baies alternent de part et d'autre du tracé
      baie: 10,             // m : la longueur d'une baie
      troncon: 25,          // m : un tronçon, ce qui se prend et se perd
      boyaux: 4,            // par camp
      // au départ : les rangs de lignes où se tiennent les régiments (de gauche à droite, autant par rang)
      depart: [0, 1],       // la moitié des régiments en 1re ligne, la moitié en 2e (Jérôme, v0.17.0 ; les huit sur la 1re ligne en v0.14.0)
    },
};

export const SECTEURS = {
  essai: ESSAI,
  // Une crête tenue par l'ennemi : il faut monter. Du relief, peu d'arbres, des haies, peu d'eau.
  crete: {
    ...ESSAI,
    nom: 'La crête',
    resume: 'Une crête haute de 7 m court devant leurs lignes : ils la tiennent, il faut la monter. Des bosses fortes, des haies, peu de bois, un sol qui boit.',
    profil: [0.50, 0.78, 0.98, 0.84, 0.52, 0.34, 0.30, 0.26, 0.30, 0.24, 0.26, 0.22],
    relief: { bosses: 1.6, ondulation: 1.2, crete: { y: 62, hauteur: 7, largeur: 42 }, nappe: 0.8 },
    pluieAuMoins: 1, arbres: 60, bois: 2, haies: 9, buissons: 230,
  },
  // Un fond de vallée : plat, la nappe affleure, la pluie noie vite les trous.
  marais: {
    ...ESSAI,
    nom: 'Le marais',
    resume: 'Un fond plat où la nappe affleure : le moindre trou se remplit, la boue vient dès le deuxième jour. Peu de relief, des saules, des haies basses.',
    profil: [0.30, 0.28, 0.30, 0.27, 0.29, 0.28, 0.30, 0.27, 0.29, 0.28, 0.30, 0.28],
    relief: { bosses: 0.45, ondulation: 0.55, nappe: -1.4 },
    pluieAuMoins: 4, arbres: 90, bois: 1, haies: 3, buissons: 320,
  },
};
