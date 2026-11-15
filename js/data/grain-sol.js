// Le grain du sol (chantier terrain-végétation, lot 1 ; labo « Le grain du sol », v0.136.0) : du détail dans chaque case, sans triangle de plus,
// dans le nuanceur du sol (`solMat.f` de rendu/shaders.js). AUCUNE COULEUR NOUVELLE : un point du grain prend soit la couleur de la case,
// soit sa paroi (la lettre d'ombre : OMBRE de palette.js), soit la lettre plus claire de `CLAIR` ci-dessous. Le jeu : `GRAIN_JEU` (0 : éteint).

// Les matières reconnues, dans l'ordre des tableaux du nuanceur (`uPalSol`, `uClairSol`, `uGrainP`) : la lettre de la case, la lettre claire
// qui y fait ses cailloux, ses brins ou ses éclats de glaise, et ses quatre dosages (de 0 à 1, avant `force`) :
//   motte : des amas sombres (un bruit de ~3 cellules) ; point sombre : des points sombres seuls ; point clair : des points clairs seuls ;
//   fente : des fentes sombres (la glaise qui sèche, la boue qui se craquelle)
export const MATIERES = [
  { lettre: 't', clair: 's', motte: 0.10, sombre: 0.04, clairs: 0.06, fente: 0.00 },     // terre (fond des trous)
  { lettre: 's', clair: 'b', motte: 0.22, sombre: 0.05, clairs: 0.08, fente: 0.00 },     // boue sombre : mottes, flaques de terre
  { lettre: 'b', clair: 'g', motte: 0.20, sombre: 0.06, clairs: 0.07, fente: 0.03 },     // boue : mottes, quelques éclats de glaise
  { lettre: 'g', clair: 'h', motte: 0.08, sombre: 0.05, clairs: 0.06, fente: 0.06 },     // glaise : fentes, mottes rares
  { lettre: 'h', clair: 'r', motte: 0.05, sombre: 0.10, clairs: 0.035, fente: 0.00 },    // herbe morte : touffes sombres, cailloux clairs
  { lettre: 'v', clair: 'h', motte: 0.06, sombre: 0.14, clairs: 0.10, fente: 0.00 },     // vert mousse : brins sombres et secs
  { lettre: 'w', clair: 'v', motte: 0.08, sombre: 0.14, clairs: 0.10, fente: 0.00 },     // vert sombre
];

// Les variantes du labo (0 : rien, le jeu d'avant). `cellule` : la taille d'un point du grain en m ; `bords` : de combien de m la limite
// entre deux cases est déchiquetée (0 : bords francs) ; `force` : multiplie les dosages. Le grain s'efface de loin (`ppmPlein` : pixels par
// mètre où il est entier, `ppmNul` : où il a disparu ; une cellule de 25 cm ne fait plus un pixel sous 4 px/m, elle scintillerait).
export const GRAIN_VARIANTES = [
  null,
  { nom: 'Le grain', cellule: 0.25, bords: 0, force: 1, ppmPlein: 4, ppmNul: 2 },
  { nom: 'Le grain et les bords déchiquetés', cellule: 0.25, bords: 0.45, force: 1, ppmPlein: 4, ppmNul: 2 },
  { nom: 'Le grain gros et les bords', cellule: 0.5, bords: 0.6, force: 1.5, ppmPlein: 2, ppmNul: 1 },
];
export const GRAIN_JEU = 0;
