// Les arbres du dessin (labo « Des arbres plus variés », v0.52.6) : les familles de formes, leurs poids, leurs hauteurs, et les feuilles de chaque saison.
// Le dessin seulement : rien de ceci n'est sauvegardé ni ne touche à la partie. La famille, la taille, le sens et la chute des feuilles d'un arbre se tirent
// du hachage de sa position (`hash2(i, j, graine)`, jamais `Math.random`), donc `terrain.js` et la graine du monde ne changent pas.

// `h` : la hauteur (m) de l'arbre à `v` = 0 ; `dh` : ce que `v` (0 à 3, tiré par terrain.js) y ajoute. Le droit garde 6 + v, l'arbre d'avant.
// `feuilles` : la famille en porte (le mort, brisé par les obus, n'en porte jamais).
export const ARBRES_FAMILLES = [
  { id: 'droit', poids: 30, h: 6, dh: 1, feuilles: true },
  { id: 'penche', poids: 18, h: 5.5, dh: 0.9, feuilles: true },
  { id: 'double', poids: 14, h: 6, dh: 0.8, feuilles: true },
  { id: 'mort', poids: 10, h: 5, dh: 0.7, feuilles: false },
  { id: 'jeune', poids: 16, h: 3.4, dh: 0.4, feuilles: true },
  { id: 'grand', poids: 12, h: 9, dh: 1.2, feuilles: true },
];

// Les tirages de la position (le dernier nombre de `hash2` : la graine du tirage)
export const ARBRES_TIRAGES = { famille: 71, taille: 72, sens: 73, feuilles: 74, chute: 75 };
export const ARBRES_ECHELLE = { hauteur: [0.9, 1.14], largeur: [0.88, 1.2] };     // facteurs tirés, en plus de la hauteur de `v`

// Les feuilles par saison : une touffe est une boîte, son dessus et ses flancs prennent chacun une couleur de la palette, tour à tour dans la liste.
// `taille` : le facteur de la touffe ; `garde` : la part des touffes gardées (1 : toutes) ; `degarni` : la part gardée sur un arbre dégarni.
// Une couleur peut être une teinte `#rrggbb` hors palette (Jérôme, v0.59.2 : l'automne plus orangé, de plusieurs teintes ; exception déclarée dans CLAUDE.md).
// `neige` : pas de feuilles mais des coiffes plates sur les branches.
export const ARBRES_FEUILLES = {
  ete: { dessus: ['v', 'v', 'w'], flanc: ['w', 'w', 's'], taille: 0.85, garde: 1, degarni: 1 },
  automne: { dessus: ['#ff7a14', '#e8321e', '#ffb400', '#d11a2a', '#ff9a1f', '#f05a0a'], flanc: ['#a8430c', '#8a1410', '#b87a06', '#7a0f1c', '#b8520c', '#962c06'], taille: 0.85, garde: 1, degarni: 0.5 },
  printemps: { dessus: ['v', 'h'], flanc: ['h', 'g'], taille: 0.7, garde: 0.6, degarni: 0.4 },    // une teinte du labo : le printemps n'est pas une saison du jeu
  neige: { dessus: ['o'], flanc: ['r'], neige: true, taille: 1, garde: 1, degarni: 1 },
};
// Un arbre sur trois est dégarni en automne ; la chute des feuilles (variante du labo) : la part de nus et de dégarnis au fil des jours
export const ARBRES_AUTOMNE = { degarni: 0.33, margeChute: 0.35 };
export const ARBRES_PPM_FEUILLES = 1;      // pixels par mètre à partir desquels on dessine les feuilles en détail (Jérôme, v0.61.0 : à tous les zooms ; 4 avant, et le cube de loin ne servait qu'en dessous)

// Ce que le jeu dessine (Jérôme, v0.53.1, après le sujet « Des arbres plus variés » du labo) : les six formes, les feuilles de la saison, les abattus longs. Pas de chute des feuilles ni de printemps (restent au labo).
export const ARBRES_JEU = { feuilles: true, abattus: 'longs' };
