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
  },
};
