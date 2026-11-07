// Où est un régiment ? (v0.116.1) Une seule réponse pour tout le jeu : la pastille de la carte, le nom sur le champ, la caméra, le fanion, le chemin d'un ordre.
// Un régiment dont les hommes se sont scindés a plusieurs amas ; le premier (le plus nombreux) est « son » endroit, les autres sont ses isolés.
// Logique pure : lit `B.armee`, ne change rien (aucun DOM, aucune horloge, aucun hasard).
import { AMAS } from './data/amas.js?v=0.117.0';

// Les amas de chaque régiment vivant : Map(id du régiment → { amas, n, bl }). `amas` est trié du plus nombreux au moins nombreux (à égalité, le plus à l'ouest) ;
// chaque amas : { x, y (le centre des hommes), n, bl (les blessés), ymin, x0, x1, y0, y1 (l'emprise) }. `n` et `bl` du régiment : le total de tous ses amas.
// `filtre` : { camp, reg } pour ne regarder que l'un ou l'autre.
export function amasDe(B, filtre = {}) {
  const A = B.armee, C = AMAS.cellule, cellules = new Map();
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    if (filtre.camp !== undefined && A.camp[i] !== filtre.camp) continue;
    if (filtre.reg !== undefined && A.reg[i] !== filtre.reg) continue;
    const ci = Math.floor(A.x[i] / C), cj = Math.floor(A.y[i] / C), cle = (A.reg[i] * 4096 + cj) * 4096 + ci;
    let c = cellules.get(cle);
    if (!c) cellules.set(cle, c = { reg: A.reg[i], ci, cj, n: 0, bl: 0, sx: 0, sy: 0, ymin: 1e9, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, parent: null });
    c.n++; c.sx += A.x[i]; c.sy += A.y[i];
    if (A.blessure[i]) c.bl++;
    if (A.y[i] < c.ymin) c.ymin = A.y[i];
    if (A.x[i] < c.x0) c.x0 = A.x[i]; if (A.x[i] > c.x1) c.x1 = A.x[i];
    if (A.y[i] < c.y0) c.y0 = A.y[i]; if (A.y[i] > c.y1) c.y1 = A.y[i];
  }
  // on relie les cellules voisines du même régiment (union-find), puis on additionne
  const racine = c => { while (c.parent) c = c.parent; return c; };
  for (const c of cellules.values()) {
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const v = cellules.get((c.reg * 4096 + c.cj + dj) * 4096 + c.ci + di);
      if (!v) continue;
      const a = racine(c), b = racine(v);
      if (a !== b) b.parent = a;
    }
  }
  const parRegiment = new Map(), composantes = new Map();
  for (const c of cellules.values()) {
    const r = racine(c);
    let m = composantes.get(r);
    if (!m) {
      composantes.set(r, m = { x: 0, y: 0, n: 0, bl: 0, ymin: 1e9, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
      let g = parRegiment.get(c.reg);
      if (!g) parRegiment.set(c.reg, g = { amas: [], n: 0, bl: 0 });
      g.amas.push(m);
    }
    m.x += c.sx; m.y += c.sy; m.n += c.n; m.bl += c.bl;
    m.ymin = Math.min(m.ymin, c.ymin); m.x0 = Math.min(m.x0, c.x0); m.x1 = Math.max(m.x1, c.x1); m.y0 = Math.min(m.y0, c.y0); m.y1 = Math.max(m.y1, c.y1);
  }
  for (const g of parRegiment.values()) {
    for (const m of g.amas) { m.x /= m.n; m.y /= m.n; g.n += m.n; g.bl += m.bl; }
    g.amas.sort((p, q) => q.n - p.n || p.x - q.x || p.y - q.y);
  }
  return parRegiment;
}

// L'endroit d'un régiment : le centre de son plus gros amas ({ x, y, n, bl, ymin, x0, x1, y0, y1 }), ou null s'il n'a plus personne
export function placeDe(B, regId) {
  const g = amasDe(B, { reg: regId }).get(regId);
  return g ? g.amas[0] : null;
}
// ses isolés : les amas à part du gros qui comptent assez d'hommes pour qu'on les montre
export const isoles = g => g.amas.slice(1).filter(a => a.n >= AMAS.isole);
