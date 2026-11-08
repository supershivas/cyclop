// Le terrain d'un secteur, tel que la bataille le monte au départ : le sol de la graine, ses marges, les tranchées creusées.
// Partagé par la bataille (`monter` de bataille.js) et l'Atelier (la carte) : ce qu'on y voit est ce que le jeu monte.
// Logique pure : aucun DOM, aucune horloge, aucun hasard hors de la graine.
import { creerTerrain, hauteurQ } from './terrain.js?v=0.131.0';
import { creuserTranchees } from './tranchees.js?v=0.131.0';
import { terrainsDeBase } from './camp.js?v=0.131.0';

// → { terrain, lignes, troncons } ; `tranchees: false` : le sol seul (une bataille d'avant la v0.4.0 se relit sans tranchées)
export function terrainDuSecteur(S, marges, graine, R, { tranchees = true } = {}) {
  const m = marges, W = S.largeur + 2 * m.x, H = S.hauteur + 2 * m.y, aire = W * H / (S.largeur * S.hauteur);
  // autant d'arbres, de haies, de bois et de buissons dans les marges, à surface égale
  const terrain = creerTerrain(graine, {
    largeur: W, hauteur: H, ox: m.x, oy: m.y, relief: S.relief, saison: S.saison, retouches: S.retouches, objets: S.objets,
    arbres: Math.round(S.arbres * aire), haies: Math.round((S.haies ?? 0) * aire),
    bois: Math.round((S.bois ?? 0) * aire), buissons: Math.round((S.buissons ?? 0) * aire),
  }, R);
  // aucun arbre sur les terrains des bâtiments de la base, ni à 20 m autour (les chars sortent du parc sans buter sur un tronc)
  const bases = terrainsDeBase({ largeur: S.largeur, hauteur: S.hauteur }, m), A = terrain.arbres;
  for (let k = A.length - 1; k >= 0; k--) { const x = A[k].i + 0.5, y = A[k].j + 0.5; if (bases.some(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1)) A.splice(k, 1); }
  const { lignes, troncons } = tranchees ? creuserTranchees(terrain, S, m.x, m.y, graine) : { lignes: [], troncons: [] };
  return { terrain, lignes, troncons };
}

/* La coupe nord-sud d'un secteur (12 valeurs de 0 à 1, du haut, côté d'en face, au bas, chez nous) : ce que l'écran de choix des parties dessine d'une carte. Une carte de l'atelier la calcule sur son terrain. */
export function profilDe(T, S, n = 12) {
  const m = S.marges, out = [];
  for (let k = 0; k < n; k++) {
    const j0 = m.y + Math.floor(k * S.hauteur / n), j1 = m.y + Math.floor((k + 1) * S.hauteur / n);
    let somme = 0, nb = 0;
    for (let j = j0; j < j1; j++) for (let i = m.x; i < m.x + S.largeur; i += 4) { somme += hauteurQ(T, j * T.W + i) / 4; nb++; }
    out.push(+Math.max(0.05, Math.min(1, 0.5 + (somme / nb - 3) / 14)).toFixed(2));
  }
  return out;
}
