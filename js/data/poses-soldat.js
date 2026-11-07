// Les nombres des poses du soldat articulé (rad, mètres). Ils sont ceux du nuanceur de js/rendu/soldat-articule.js (lignes « la pose »), recopiés ici pour que
// l'atelier d'animation les lise comme de la donnée : une pose est une valeur par articulation, une animation une suite de poses.

// Les champs d'une pose, dans l'ordre, avec leur borne (min, max) pour les curseurs de l'atelier.
// Toutes les rotations sont des rotations autour de x (fléchir) sauf `conv*` (autour de y : l'épaule qui tourne vers l'intérieur).
export const CHAMPS = {
  buste: [-0.6, 1.2],          // le buste penché autour de la hanche (tronc, tête, bras, fusil, basques)
  tete: [-0.6, 0.8],           // la tête penchée en plus du buste
  hancheG: [-1.5, 2.4], genouG: [0, 3.0], chevilleG: [-1.6, 1.6],
  hancheD: [-1.5, 2.4], genouD: [0, 3.0], chevilleD: [-1.6, 1.6],
  epauleG: [-1.5, 3.0], coudeG: [0, 2.6], convG: [-1.2, 1.2],
  epauleD: [-1.5, 3.0], coudeD: [0, 2.6], convD: [-1.2, 1.2],
  fusil: [-2.4, 0.6],          // la rotation du fusil autour de son pivot
  fusilX: [-0.5, 0.5],         // son décalage latéral (en largeur d'épaules)
  fusilZ: [-0.5, 0.8],         // son décalage vers l'avant (la poussée de la baïonnette)
  fusilY: [0.8, 1.5],          // la hauteur de son pivot
  descente: [0, 0.9],          // le corps baissé (accroupi, genou à terre)
  poussee: [0, 0.4],           // le buste qui part vers l'avant (la mêlée)
  basques: [0, 1.2],           // les basques de la vareuse, qui suivent les cuisses
  couche: [0, 1],              // 0 debout, 1 couché sur le dos
};
export const NOMS_CHAMPS = Object.keys(CHAMPS);

// La marche (vitesse v de 0 à 1, phase de 0 à 2π) : l'amplitude des jambes et des bras
export const MARCHE = { hanche: 0.55, genou: 0.9, epaule: 0.5, coude0: 0.25, coude: 0.35, cheville: 0.8, leanV: 0.07 };
// L'accroupi (tapi de 0 à 1)
export const TAPI = { hanche: 1.05, genou: 1.9, epaule: 0.7, coude: 1.5, lean: 0.55, descente: 0.44, basques: 0.75 };
// Le tir à l'épaule (tir de 0 à 1) : fusil et pistolet (l'officier tire d'une main)
export const TIR = {
  fusil: { epaule: 1.35, coudeG: 0.35, coudeD: 0.7, convG: 0.6, convD: -0.5, angle: -1.45, x: -0.28, pivot: 1.3, lean: 0.12 },
  pistolet: { epauleG: 0.25, epauleD: 1.2, coudeG: 0.5, coudeD: 0.4, convG: 0.0, convD: -0.15, lean: 0.12 },
};
// Le feu retenu (le fusil baissé en travers des hanches, les deux mains dessus)
export const RETENU = { epaule: 0.5, coudeG: 1.0, coudeD: 0.8, convG: 0.5, convD: -0.3, angle: -1.9, x: -0.18, pivot: 0.9, lean: 0.03 };
// La mêlée (la fente, les bras tendus, le fusil à l'horizontale ; `pouss` de 0 à 1 : la poussée)
export const MELEE = { epaule: 1.0, coudeG: 0.45, coudeD: 0.6, convG: 0.55, convD: -0.45, angle: -1.45, x: -0.3, pivot: 0.95, z: 0.5, hancheG: 0.55, hancheGp: 0.2, hancheD: -0.4, genouG: 0.5, genouGp: 0.2, genouD: 0.35, lean: 0.22, leanP: 0.15, poussee: 0.2 };
// Couché sur le dos
export const COUCHE = { hancheG: 0.3, hancheD: 0.0, genouG: 0.7, genouD: 0.1, epaule: 0.0, coude: 0.1 };
// Le fusil en bandoulière (sans tir)
export const FUSIL_REPOS = { angle: 0, x: 0, pivot: 1.3 };

// Les courbes d'adoucissement d'une animation (t de 0 à 1)
export const COURBES = {
  lineaire: t => t,
  doux: t => t * t * (3 - 2 * t),
  entree: t => t * t,
  sortie: t => 1 - (1 - t) * (1 - t),
  ressort: t => 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-5 * t),
};
