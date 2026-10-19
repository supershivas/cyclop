// Le terrain d'un secteur, tel que la bataille le monte au départ : le sol de la graine, ses marges, les tranchées creusées.
// Partagé par la bataille (`monter` de bataille.js) et l'Atelier (la carte) : ce qu'on y voit est ce que le jeu monte.
// Logique pure : aucun DOM, aucune horloge, aucun hasard hors de la graine.
import { creerTerrain } from './terrain.js?v=0.37.1';
import { creuserTranchees } from './tranchees.js?v=0.37.1';

// → { terrain, lignes, troncons } ; `tranchees: false` : le sol seul (une bataille d'avant la v0.4.0 se relit sans tranchées)
export function terrainDuSecteur(S, marges, graine, R, { tranchees = true } = {}) {
  const m = marges, W = S.largeur + 2 * m.x, H = S.hauteur + 2 * m.y, aire = W * H / (S.largeur * S.hauteur);
  // autant d'arbres, de haies, de bois et de buissons dans les marges, à surface égale
  const terrain = creerTerrain(graine, {
    largeur: W, hauteur: H, ox: m.x, oy: m.y, relief: S.relief, retouches: S.retouches, objets: S.objets,
    arbres: Math.round(S.arbres * aire), haies: Math.round((S.haies ?? 0) * aire),
    bois: Math.round((S.bois ?? 0) * aire), buissons: Math.round((S.buissons ?? 0) * aire),
  }, R);
  const { lignes, troncons } = tranchees ? creuserTranchees(terrain, S, m.x, m.y, graine) : { lignes: [], troncons: [] };
  return { terrain, lignes, troncons };
}
