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
  n: '#8cb6ff', // bleu horizon — nous
  x: '#dde874', // vert kaki clair — en face (Jérôme, v0.28.0 ; rouge #e0604f avant : un kaki pâle et jaune, plus clair que tout le sol, vert compris, pour s'en détacher ; la forme du casque, à pointe, aide)
  // Deux verts discrets (Jérôme, v0.9.3 : « le vert est intégré dans le design et ne fait pas de grandes différences ») : de la
  // même clarté que l'herbe morte et la glaise, un peu plus verts ; le sol en est nuancé (apparence.js, `verdure`)
  v: '#6f8147', // vert mousse — l'herbe qui reprend, par plaques
  w: '#5c6e3c', // vert sombre — l'herbe dans l'humide
};

// Deux couleurs d'alerte (Jérôme, v0.41.3 : « un élément coloré pour les régiments ébranlés (orange) et en déroute (rouge) »), HORS de la palette du terrain :
// elles ne sont ni dans `PALETTE`, ni dans `ORDRE` (les textures d'indices et la palette du moteur ne changent pas), elles ne servent qu'à l'interface et à son état moral.
// Mesurées (`lisibilite.config.mjs`) sur la terre : orange 8,3, rouge 5,0 ; l'information reste portée par la forme (« ! », « !! », le mot), la couleur la confirme.
export const ALERTES = {
  orange: '#f29a3a', // ébranlé
  rouge: '#e5533d',  // en déroute
};

// L'ordre des couleurs dans les textures d'indices (le shader lit la palette
// dans une texture de 12 × 1) : ne jamais le changer sans refaire les textures.
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
  brume: PALETTE.r,
  ebranle: ALERTES.orange,
  deroute: ALERTES.rouge,
};
