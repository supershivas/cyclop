// La palette du jeu : le SEUL endroit où vivent ses couleurs (section 5 des
// conventions). « Boue et ciel bas » (Jérôme, v0.1.0), dix tons. Une lettre
// par couleur : c'est l'alphabet des sprites et des tuiles du labo.
//
// Trois valeurs ont été éclaircies à la mesure (outils/lisibilite.mjs) par
// rapport à la proposition : l'eau reflète le ciel bas (#34434c avait la même
// valeur que la boue : on ne les séparait pas en gris), et les deux camps sont
// plus pâles (#6f86a6 et #5b5d48 disparaissaient sur la boue). Un soldat se lit
// par sa couleur sur un sol sombre, par son ombre (terre) sur un sol clair.
export const PALETTE = {
  t: '#16130f', // terre — le fond, l'ombre des soldats, les parois
  s: '#2c2720', // boue sombre
  b: '#42392e', // boue
  g: '#74664f', // glaise — sol humide
  h: '#8d8a62', // herbe morte — sol sec
  e: '#8a9799', // eau — reflète le ciel
  r: '#a9a89a', // brume — pluie, fumée, eau gelée
  o: '#e4dfd0', // os — le texte, l'éclair
  n: '#a9bad0', // bleu horizon — nous
  x: '#8f9374', // feldgrau — en face
};

// L'ordre des couleurs dans les textures d'indices (le shader lit la palette
// dans une texture de 10 × 1) : ne jamais le changer sans refaire les textures.
export const ORDRE = Object.keys(PALETTE);
export const INDICE = Object.fromEntries(ORDRE.map((k, i) => [k, i]));

// Les rôles, lus par le CSS (variables --jeu-*) et par le rendu
export const ROLES = {
  fond: PALETTE.t,
  ombre: PALETTE.s,
  encre: PALETTE.o,
  accent: PALETTE.g,
  nous: PALETTE.n,
  eux: PALETTE.x,
};
