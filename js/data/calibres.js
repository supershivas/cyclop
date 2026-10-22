// Les obus. Un motif = ce qu'un obus creuse, en quarts (25 cm) à dureté
// pleine, case par case (1 case = 1 m) ; la dureté croissante du sol réduit la
// profondeur réelle (terrain.js). La lèvre : quarts de terre éjectée sur
// l'anneau autour du motif. Rayon : m, la distance où il peut tuer. Letal : multiplie la chance de toucher un homme dans ce rayon
// Eclats : combien de petits creux et monticules autour, pour la forme d'essai du labo (cratere.js).
// (le 75, le plus juste, ne tue que ceux qu'il touche ; les gros obus fauchent).
export const CALIBRES = {
  '75': {
    motif: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ],
    levre: 1, eclats: 4, rayon: 4, salve: 24, cadence: 2, recharge: 40, dispersion: 14, letal: 1,
  },
  '155': {
    motif: [
      [1, 2, 3, 2, 1],
      [2, 5, 6, 5, 2],
      [3, 6, 8, 6, 3],
      [2, 5, 6, 5, 2],
      [1, 2, 3, 2, 1],
    ],
    levre: 2, eclats: 8, rayon: 7, salve: 12, cadence: 1, recharge: 70, dispersion: 18, letal: 1.5,
  },
  '220': {
    motif: [
      [0, 1, 2, 2, 2, 1, 0],
      [1, 2, 4, 5, 4, 2, 1],
      [2, 4, 7, 9, 7, 4, 2],
      [2, 5, 9, 12, 9, 5, 2],
      [2, 4, 7, 9, 7, 4, 2],
      [1, 2, 4, 5, 4, 2, 1],
      [0, 1, 2, 2, 2, 1, 0],
    ],
    levre: 2, eclats: 14, rayon: 10, salve: 6, cadence: 0.5, recharge: 110, dispersion: 22, letal: 2,
  },
};
export const NOMS_CALIBRES = Object.keys(CALIBRES);
