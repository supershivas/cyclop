// Les secteurs du front. Le lot minimal n'en a qu'un : un champ de bosses,
// quelques arbres, deux camps face à face, trois jours.
export const SECTEURS = {
  essai: {
    nom: 'Secteur d\'essai',
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
    regiments: 6,           // par camp (8 avant la v0.7.0 : Jérôme en a retiré deux)
    soldats: 750,           // par camp (six régiments de 125) (la mesure en charge 4 000 : ?soldats=8000)
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
      // au départ : les régiments, la moitié dans la première ligne, la moitié dans la deuxième
      depart: [0, 1],
    },
  },
};
