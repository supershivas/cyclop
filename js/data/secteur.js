// Les secteurs du front. Le lot minimal n'en a qu'un : un champ de bosses,
// quelques arbres, deux camps face à face, trois jours.
export const SECTEURS = {
  essai: {
    nom: 'Secteur d\'essai',
    largeur: 400,           // cases de 1 m
    hauteur: 300,
    jours: 3,
    pluieAuMoins: 1,        // jours de pluie garantis dans la chaîne (lot minimal : la boue doit venir)
    arbres: 40,             // dans le secteur (les marges en ont autant, à surface égale)
    regiments: 8,           // par camp
    soldats: 1000,          // par camp (la mesure en charge 4 000 : ?soldats=8000)
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
