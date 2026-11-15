// Les arbres du dessin (labo « Des arbres plus variés », v0.52.6) : les familles de formes, leurs poids, leurs hauteurs, et les feuilles de chaque saison.
// Le dessin seulement : rien de ceci n'est sauvegardé ni ne touche à la partie. La famille, la taille, le sens et la chute des feuilles d'un arbre se tirent
// du hachage de sa position (`hash2(i, j, graine)`, jamais `Math.random`), donc `terrain.js` et la graine du monde ne changent pas.

// `h` : la hauteur (m) de l'arbre à `v` = 0 ; `dh` : ce que `v` (0 à 3, tiré par terrain.js) y ajoute. Le droit garde 6 + v, l'arbre d'avant.
// `feuilles` : la famille en porte (le mort, brisé par les obus, n'en porte jamais).
export const ARBRES_FAMILLES = [
  { id: 'droit', poids: 34, h: 6, dh: 1, feuilles: true },
  { id: 'penche', poids: 18, h: 5.5, dh: 0.9, feuilles: true },
  { id: 'double', poids: 14, h: 6, dh: 0.8, feuilles: true },
  { id: 'mort', poids: 4, h: 5, dh: 0.7, feuilles: false },
  { id: 'jeune', poids: 16, h: 3.4, dh: 0.4, feuilles: true },
  { id: 'grand', poids: 12, h: 9, dh: 1.2, feuilles: true },
];

// Les tirages de la position (le dernier nombre de `hash2` : la graine du tirage)
export const ARBRES_TIRAGES = { famille: 71, taille: 72, sens: 73, feuilles: 74, chute: 75, variante: 76, brule: 77, couche: 78 };
export const ARBRES_ECHELLE = { hauteur: [0.9, 1.14], largeur: [0.88, 1.2] };     // facteurs tirés, en plus de la hauteur de `v`

// Les feuilles par saison : une touffe est une boîte, son dessus et ses flancs prennent chacun une couleur de la palette, tour à tour dans la liste.
// `taille` : le facteur de la touffe ; `garde` : la part des touffes gardées (1 : toutes) ; `degarni` : la part gardée sur un arbre dégarni.
// Une couleur peut être une teinte `#rrggbb` hors palette (Jérôme, v0.59.2 : l'automne plus orangé, de plusieurs teintes ; exception déclarée dans CLAUDE.md).
// `neige` : pas de feuilles mais des coiffes plates sur les branches.
export const ARBRES_FEUILLES = {
  ete: { dessus: ['v', 'v', 'w'], flanc: ['w', 'w', 's'], taille: 0.85, garde: 1, degarni: 1 },
  automne: { dessus: ['#ff7a14', '#e8321e', '#ffb400', '#d11a2a', '#ff9a1f', '#f05a0a'], flanc: ['#a8430c', '#8a1410', '#b87a06', '#7a0f1c', '#b8520c', '#962c06'], taille: 0.85, garde: 1, degarni: 0.75 },
  printemps: { dessus: ['#9cbc50', '#87a944', '#b4ca64', '#a8c25a', '#e2dccb'], flanc: ['#5f7b2d', '#506b27', '#6c8735', '#7a7a5c'], taille: 0.82, garde: 0.95, degarni: 0.8 },    // (v0.135.0, une saison du jeu) le vert tendre des feuilles neuves, plus clair que l'herbe, et quelques touffes en fleurs ; hors palette comme l'automne
  neige: { dessus: ['o'], flanc: ['r'], neige: true, taille: 1, garde: 1, degarni: 1 },
};
// Un arbre sur trois est dégarni en automne ; la chute des feuilles (variante du labo) : la part de nus et de dégarnis au fil des jours
export const ARBRES_AUTOMNE = { degarni: 0.12, margeChute: 0.35 };     // (0,33 avant le 1er novembre : Jérôme, « trop d'arbres n'ont pas de feuillages »)
export const ARBRES_PPM_FEUILLES = 1;      // pixels par mètre à partir desquels on dessine les feuilles en détail (Jérôme, v0.61.0 : à tous les zooms ; 4 avant, et le cube de loin ne servait qu'en dessous)
// Le feuillage grossier (chantier terrain-végétation, lot 0, v0.135.2) : un arbre qui fait moins de `ppm` pixels par mètre à l'écran (tout dézoomé, ou loin derrière le point visé) garde ses touffes,
// leurs places et leurs couleurs, mais chaque touffe ronde n'a que `pans` pans et les anneaux `anneaux` (en degrés de latitude ; 15 triangles au lieu de 42) et ses branches tombent (le tronc seul) : à moins de
// 2,5 pixels par mètre, une branche de 20 cm ne fait pas un pixel. Mesuré : `docs/chantiers/terrain-vegetation-realiste.md`.
export const ARBRES_GROSSIER = { ppm: 2.5, anneaux: [90, 20, -30], pans: 5, elargir: 1.1 };     // elargir : un pentagone sur un anneau à 20° est plus étroit que l’hexagone fin à l’équateur (×1,1 garde la silhouette)

// Ce que le jeu dessine (Jérôme, v0.53.1, après le sujet « Des arbres plus variés » du labo) : les six formes, les feuilles de la saison, les abattus longs. Pas de chute des feuilles ni de printemps (restent au labo).
export const ARBRES_JEU = { feuilles: true, abattus: 'longs', chanfrein: 0.12, rond: true };     // chanfrein (Jérôme) : les touffes aux angles coupés, un pan de 12 % (au plus 30 cm) ; 0 : les cubes francs d'avant

// Les formes de couronne (Jérôme, 1er novembre : « la forme des feuillages doit être plus variée, nous n'avons que des sortes de champignons ») : par famille, les formes que prennent ses touffes
// (`dome`, `boule`, `galette`, `colonne`, `cone`, `irregulier` : `formeCouronne` de rendu/geometries.js), tour à tour selon le rang de la touffe et la variante de l'arbre.
export const ARBRES_COURONNES = {
  droit: ['boule', 'dome', 'irregulier'],
  penche: ['galette', 'irregulier', 'dome'],
  double: ['colonne', 'boule', 'irregulier'],
  jeune: ['boule', 'dome'],
  grand: ['cone', 'irregulier', 'boule', 'cone'],
  mort: ['irregulier'],
};
// Trois variantes par arbre (un hachage de sa position) : la largeur des touffes change, et le décalage dans la liste des formes
export const ARBRES_VARIANTES = { n: 3, largeur: [1, 1.22, 0.86] };

// L'arbre abattu reste où il est tombé (Jérôme, 1er novembre : « même axe, même largeur de tronc, même feuillage à moitié enterré »).
// `enfonce` : la part de sa hauteur dont il s'enfonce dans le sol (m par mètre d'échelle) ; `brule` : la part des abattus qui brûlent (les autres gardent leur feuillage un moment, puis il se fane) ;
// `tient` : s'écoulent avant que le feuillage ne commence à disparaître (s), puis `fane` s pour disparaître ; `brulure` : le feuillage d'un arbre brûlé disparaît en cette durée (s).
export const ARBRES_COUCHE = { enfonce: 0.22, brule: 0.55, tient: 25, fane: 70, brulure: 14, gardeAuChargement: 0.35 };

// ─── Les essences (chantier terrain-végétation, lot 3 ; labo « Des arbres réalistes », v0.137.0) ───
// Les arbres du front de 1914-18 au lieu des familles de formes : le peuplier d'Italie (en colonne, le long des routes), le saule têtard (un moignon
// épais couronné de rejets), le chêne (large, en masses), le hêtre (dense, ovale, tronc lisse), le bouleau (léger, tronc clair), le jeune et le mort
// d'avant. `tronc` : la lettre du tronc et des branches (la boue sombre `s` d'avant, sauf le bouleau). Choisi par `{ essences: true }` des arbres variés.
export const ARBRES_ESSENCES = [
  { id: 'peuplier', poids: 14, h: 13, dh: 1.2, feuilles: true, tronc: 's' },
  { id: 'saule', poids: 10, h: 4.2, dh: 0.4, feuilles: true, tronc: 's' },
  { id: 'chene', poids: 22, h: 8, dh: 1, feuilles: true, tronc: 's' },
  { id: 'hetre', poids: 18, h: 9, dh: 1, feuilles: true, tronc: 'b' },
  { id: 'bouleau', poids: 12, h: 8, dh: 0.8, feuilles: true, tronc: 'r' },
  { id: 'jeune', poids: 14, h: 3.4, dh: 0.4, feuilles: true, tronc: 's' },
  { id: 'mort', poids: 6, h: 5, dh: 0.7, feuilles: false, tronc: 's' },
];
ARBRES_COURONNES.peuplier = ['colonne', 'colonne', 'boule'];
ARBRES_COURONNES.saule = ['irregulier', 'boule', 'irregulier'];
ARBRES_COURONNES.chene = ['irregulier', 'galette', 'dome', 'irregulier'];
ARBRES_COURONNES.hetre = ['boule', 'dome', 'boule'];
ARBRES_COURONNES.bouleau = ['irregulier', 'boule'];

// Les couronnes en grappes (`{ grappes: true }`) : chaque touffe devient `n` boules plus petites (`taille` de la touffe), serrées autour de son centre
// (`ecart` de sa largeur), à des hauteurs un peu différentes, chacune de sa teinte : la couronne se bosselle, la lumière s'y accroche. Chaque boule
// a la résolution `moyen` (5 pans, 25 triangles ; la touffe ronde d'avant : 42) ; de loin, le feuillage grossier reste une boule par touffe.
export const ARBRES_GRAPPES = { n: 3, taille: [0.6, 0.78], ecart: 0.34, moyen: { anneaux: [90, 45, 5, -30], pans: 5 } };

// Les teintes par essence et par saison (`{ teintes: 'palette' | 'etendues' }`) ; sans : celles de ARBRES_FEUILLES pour tous. Une variante de l'arbre
// (`ARBRES_VARIANTES`) décale le départ dans la liste : deux chênes voisins n'ont pas les mêmes tons.
// `palette` : les lettres de la palette l'été (le saule gris-vert prend la brume `r`), les teintes d'automne et de printemps déjà admises (exception
// de CLAUDE.md), réparties par essence. `etendues` : des verts d'été à part par essence, hors palette : UNE EXCEPTION À FAIRE ADMETTRE (labo, à trancher).
export const ARBRES_TEINTES = {
  palette: {
    ete: {
      peuplier: { dessus: ['v', 'w', 'v'], flanc: ['w', 's'] }, saule: { dessus: ['v', 'h', 'v', 'r'], flanc: ['w', 'g', 'w'] }, chene: { dessus: ['w', 'v', 'w'], flanc: ['s', 'w'] },
      hetre: { dessus: ['v', 'v', 'h'], flanc: ['w', 'w'] }, bouleau: { dessus: ['h', 'v', 'h'], flanc: ['v', 'w'] },
    },
    automne: {
      peuplier: { dessus: ['#ffb400', '#ff9a1f'], flanc: ['#b87a06', '#b8520c'] }, saule: { dessus: ['#ffb400', '#b87a06'], flanc: ['#7a7a5c', '#b87a06'] },
      chene: { dessus: ['#a8430c', '#b8520c', '#962c06'], flanc: ['#7a0f1c', '#8a1410'] }, hetre: { dessus: ['#f05a0a', '#ff7a14', '#e8321e'], flanc: ['#962c06', '#a8430c'] },
      bouleau: { dessus: ['#ffb400', '#ff9a1f', '#ffb400'], flanc: ['#b87a06'] },
    },
    printemps: {
      peuplier: { dessus: ['#b4ca64', '#a8c25a'], flanc: ['#6c8735'] }, saule: { dessus: ['#e2dccb', '#b4ca64'], flanc: ['#7a7a5c'] },
      chene: { dessus: ['#87a944', '#9cbc50'], flanc: ['#506b27'] }, hetre: { dessus: ['#9cbc50', '#a8c25a'], flanc: ['#5f7b2d'] },
      bouleau: { dessus: ['#b4ca64', '#e2dccb'], flanc: ['#6c8735'] },
    },
  },
  etendues: {
    ete: {
      peuplier: { dessus: ['#6f8240', '#61743a', '#788a46'], flanc: ['#3f4c26', '#47552a'] }, saule: { dessus: ['#8e9478', '#a2a68a', '#7f8a62'], flanc: ['#565c44', '#4c523c'] },
      chene: { dessus: ['#56652e', '#4c5a2a', '#5f6e33'], flanc: ['#323c1e', '#2b331a'] }, hetre: { dessus: ['#73843a', '#677836', '#7c8c42'], flanc: ['#414d22', '#3a4520'] },
      bouleau: { dessus: ['#93984e', '#888f48', '#9fa35a'], flanc: ['#5a6030', '#545a2e'] },
    },
  },
};
