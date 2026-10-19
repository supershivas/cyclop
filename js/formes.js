// Les retouches de relief d'un secteur (lot 2 de l'éditeur de carte) : des formes posées sur le sol que le bruit a tiré. Logique pure.
// Une forme : { f, x, y, r, h } en mètres, dans les coordonnées du SECTEUR (comme le mode debug : 0..400, 0..300 ; les marges sont aux négatifs et au-delà) ;
//   bosse  : monte de h m au centre, jusqu'à r m ;      creux   : descend de h m ;
//   crete  : une bosse le long du segment (x, y) → (x2, y2), large de r de chaque côté ;
//   plateau: aplanit à la hauteur h (absolue, en m : celle que lit l'atelier au survol), pleinement jusqu'à 0,6 r, fondu jusqu'à r.
// Les formes s'appliquent dans l'ordre de la liste, après le bruit et avant les tranchées : sans hasard, donc une partie relue refait le même sol.
export const FORMES = ['bosse', 'creux', 'crete', 'plateau'];

const lisse = u => u * u * (3 - 2 * u);
function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
export const extremite = F => [F.x2 ?? F.x, F.y2 ?? F.y];
// la distance d'un point du secteur au cœur de la forme (son centre, ou son segment)
export function distanceForme(F, x, y) { const [x2, y2] = extremite(F); return distSegment(x, y, F.x, F.y, x2, y2); }

/* `base` : les hauteurs en quarts (Int16Array de W × H) du terrain, dont le secteur commence en (ox, oy). */
export function appliquerFormes(base, W, H, ox, oy, formes) {
  for (const F of formes || []) {
    const [x2, y2] = extremite(F), r = F.r;
    if (!(r > 0)) continue;
    const i0 = Math.max(0, Math.floor(Math.min(F.x, x2) + ox - r)), i1 = Math.min(W - 1, Math.ceil(Math.max(F.x, x2) + ox + r));
    const j0 = Math.max(0, Math.floor(Math.min(F.y, y2) + oy - r)), j1 = Math.min(H - 1, Math.ceil(Math.max(F.y, y2) + oy + r));
    const signe = F.f === 'creux' ? -1 : 1;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = distSegment(i + 0.5 - ox, j + 0.5 - oy, F.x, F.y, x2, y2);
      if (d >= r) continue;
      const c = j * W + i;
      if (F.f === 'plateau') base[c] = Math.round(base[c] + (F.h * 4 - base[c]) * lisse(Math.min(1, (1 - d / r) / 0.4)));
      else base[c] += Math.round(signe * F.h * 4 * (0.5 + 0.5 * Math.cos(Math.PI * d / r)));
    }
  }
}
