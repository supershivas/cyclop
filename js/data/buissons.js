// Des buissons plus variés (Jérôme, v0.62.0 : chantier 4 de ROADMAP.md ; au labo d'abord, sujet « Des buissons plus variés »). Chaque forme est une liste de boîtes [largeur, hauteur, profondeur, x, z]
// posées sur le sol ; la forme de chaque buisson vient du hachage de sa position (jamais du générateur de la bataille : `terrain.js` ne change pas) et sa rotation est un multiple de 90°.
export const BUISSONS_FORMES = [
  { id: 'rond', poids: 30, boites: [[1.3, 1, 1.1, 0, 0], [0.9, 0.7, 0.8, 0.9, 0.1]] },
  { id: 'etale', poids: 20, boites: [[2.1, 0.6, 1.5, 0, 0], [1.2, 0.5, 1, 0.8, 0.6]] },
  { id: 'haut', poids: 14, boites: [[0.8, 1.7, 0.8, 0, 0], [0.6, 1.2, 0.6, 0.45, 0.3]] },
  { id: 'touffes', poids: 14, boites: [[0.5, 0.75, 0.5, -0.65, -0.3], [0.55, 1, 0.55, 0.05, 0.2], [0.5, 0.6, 0.5, 0.7, -0.2]] },
  { id: 'ajonc', poids: 10, boites: [[1.4, 0.8, 1.2, 0, 0], [0.3, 0.4, 0.3, -0.4, 0.2], [0.3, 0.5, 0.3, 0.3, -0.2], [0.3, 0.35, 0.3, 0.5, 0.35]] },
  { id: 'ronces', poids: 6, boites: [[2.2, 0.35, 1, 0, 0], [1, 0.55, 1.4, 0.5, 0.1]] },
  { id: 'casse', poids: 6, casse: true, boites: [[1.3, 0.8, 1.1, 0, 0]] },       // un épineux brisé : penché, à moitié dégarni
];
// Les couleurs de la saison : le dessus, les flancs (des lettres de la palette, ou `#rrggbb` hors palette comme les arbres) ; `fruits` : de petits cubes sur le dessus (fleurs claires l'été, baies sombres l'automne)
export const BUISSONS_SAISONS = {
  ete: { dessus: ['v', 'w'], flanc: ['w', 's'], fruits: 'o' },
  automne: { dessus: ['#b8702c', '#a8451e', '#c48a3c'], flanc: ['#5e3a20', '#6a4524', '#5c4a26'], fruits: '#7a0f1c' },
  neige: { dessus: ['o'], flanc: ['b'], fruits: null },
  nu: { dessus: ['b', 's'], flanc: ['s', 's'], fruits: null, maigre: 0.7 },        // les branches nues de l'hiver : plus fins et plus bas
};
export const BUISSONS_TIRAGES = { forme: 81, rotation: 82, taille: 83 };
