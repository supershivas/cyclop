// Le générateur de carte (Jérôme, v0.49.0 : « un générateur de carte dans le jeu, une carte aléatoire dans la nouvelle partie, avec des fleuves, des côtes, des montagnes »).
// Les nombres et les mots de `generateur.js` : des fourchettes tirées de la graine. Tout est dans les mètres du SECTEUR (400 × 300 ; les marges sont aux négatifs et au-delà).
export const ID_ALEATOIRE = 'aleatoire';
export const GENERATEUR = {
  // ce qui est possible (chance de chaque trait, tirée l'un après l'autre)
  chances: { fleuve: 0.4, fleuveArriere: 0.15, cote: 0.4, montagne: 0.55, chaine: 0.3, collines: 0.7, plateau: 0.3, lac: 0.3, marecage: 0.15 },
  relief: { bosses: [0.4, 1.8], ondulation: [0.4, 1.4], nappe: [-1.4, 0.8] },
  vegetation: { arbres: [40, 260], bois: [0, 5], haies: [1, 10], buissons: [80, 360] },
  pluieAuMoins: [0, 4],
  saisons: { automne: 0.4, hiver: 0.3, ete: 0.3 },     // la saison de la carte (météo, neige, sol sec : data/meteo.js)
  // le fleuve du no man's land : demi-largeur, rangée de son milieu, pente (m d'écart entre l'ouest et l'est), ponts (au moins un : l'assaut passe)
  fleuve: { r: [5, 9], yMilieu: [135, 165], pente: 8, ponts: [1, 3], pontLargeur: 3, pontMarge: 5, debord: 320 },       // debord : de combien un fleuve dépasse le secteur de chaque côté (le terrain déborde de 220 m : il doit en sortir, pour que le dessin hors carte le continue)
  // la côte : un grand disque d'eau hors du secteur, d'un des quatre côtés, dont la rive est un arc (rayon, marge laissée aux tranchées)
  cote: { r: [170, 300], marge: 10, decalage: 70 },
  lac: { r: [18, 45] },
  marecage: { r: [22, 40], n: [1, 3] },        // des marécages : dans le no man's land (entre les bandes de tranchées), derrière les lignes ou sur les flancs
  // montagnes : une bosse haute (rayon, hauteur) hors du secteur ou sur ses flancs ; chaînes : une crête le long d'un segment ; collines et plateaux : dans le secteur
  montagne: { r: [55, 110], h: [9, 20] },
  chaine: { r: [30, 55], h: [8, 15], longueur: [120, 260] },
  collines: { n: [2, 5], r: [30, 70], h: [2, 6] },
  plateau: { r: [30, 60], h: [1, 4] },
  arriere: 20,           // m : l'eau reste à 20 m au moins de la bande des tranchées (les blessés qui marchent et la relève s'arrêtent à 12 m derrière)
  essais: 24,            // tirages d'une carte avant de renoncer aux eaux et de rendre une plaine
  // les noms : un nom commun selon ce qui domine, un lieu
  noms: {
    cote: ['La côte', 'Le littoral', 'Les dunes'], fleuve: ['La rivière', 'Le fleuve', 'Le gué'],
    montagne: ['Les hauteurs', 'La montagne', 'Le massif'], marecage: ['Les marais', 'Le marécage', 'Les roselières'], lac: ['Les étangs', 'Le lac'], plaine: ['La plaine', 'Les champs', 'Les friches'],
    lieux: ['de Verdelle', 'de Montmorel', 'de Sarrazin', 'de la Vauxbelle', 'des Corbeaux', 'de Rouvreuil', 'de Maucourt', 'de Brandelot', 'des Pendus', 'de Haute-Eau', 'de Sainte-Ursule', 'de Quinquin'],
  },
};
