// Les secteurs du front. Le lot minimal n'en a qu'un : un champ de bosses,
// quelques arbres, deux camps face à face, trois jours.
export const SECTEURS = {
  essai: {
    nom: 'Secteur d\'essai',
    largeur: 400,           // cases de 1 m
    hauteur: 300,
    jours: 3,
    pluieAuMoins: 1,        // jours de pluie garantis dans la chaîne (lot minimal : la boue doit venir)
    arbres: 40,
    regiments: 8,           // par camp
    soldats: 1000,          // par camp (la mesure en charge 4 000 : ?soldats=8000)
    ligne: { eux: 70, nous: 230 },   // rangée de cases où chaque camp se tient au départ
  },
};
