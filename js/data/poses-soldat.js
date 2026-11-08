// Les nombres des poses du soldat articulé (rad, mètres). Ils sont ceux du nuanceur de js/rendu/soldat-articule.js (lignes « la pose »), recopiés ici pour que
// l'atelier d'animation les lise comme de la donnée : une pose est une valeur par articulation, une animation une suite de poses.

// Les champs d'une pose, dans l'ordre. La plage (min, max) n'est que la COURSE DU CURSEUR de l'atelier, jamais une limite (Jérôme, 7 nov. : « ne pas limiter les déplacements et les rotations ») :
// les poignées et les champs numériques vont au-delà, le nuanceur accepte n'importe quel angle. Un tour entier (2π) de chaque côté pour les rotations, 1,5 m pour les déplacements.
// Toutes les rotations sont des rotations autour de x (fléchir) sauf `conv*` et `fusilLacet` (autour de y) et `fusilRoulis` (autour de z).
const R = [-2 * Math.PI, 2 * Math.PI], D = [-1.5, 1.5];
export const CHAMPS = {
  buste: R,                    // le buste penché autour de la hanche (tronc, tête, bras, fusil, basques)
  tete: R,                     // la tête penchée en plus du buste
  hancheG: R, genouG: R, chevilleG: R,
  hancheD: R, genouD: R, chevilleD: R,
  epauleG: R, coudeG: R, convG: R,
  epauleD: R, coudeD: R, convD: R,
  fusil: R,                    // la rotation du fusil autour de son pivot
  fusilX: D,                   // son décalage latéral (en largeur d'épaules)
  fusilZ: D,                   // son décalage vers l'avant (la poussée de la baïonnette)
  fusilY: [-1, 3],             // la hauteur de son pivot
  descente: D,                 // le corps baissé (accroupi, genou à terre) ; négatif : le corps relevé
  poussee: D,                  // le buste qui part vers l'avant (la mêlée)
  basques: R,                  // les basques de la vareuse, qui suivent les cuisses
  couche: [0, 1],              // 0 debout, 1 couché sur le dos (le nuanceur lit « plus de 0,5 »)
  // le fusil, en plus (v0.113.2) : sa hauteur, puis deux rotations après la flexion (le lacet : la visée à gauche ou à droite quand il est à l'horizontale ; le roulis : l'inclinaison de côté)
  fusilH: D, fusilLacet: R, fusilRoulis: R,
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
