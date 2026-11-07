// Cherche les faces de boîtes du soldat articulé qui sont dans le même plan (à 1,5 mm près, par défaut) et se recouvrent : elles se disputent chaque pixel et scintillent (z-fighting).
//   node outils/coplanaires-soldat.mjs [tolérance en m]
// Beaucoup de paires sont sans danger (deux accessoires qui ne se portent jamais ensemble, une boîte cachée dans une autre) : lire la colonne « show » (le code de visibilité de voir()).
import { boites, PARTIES, OS } from '../js/rendu/soldat-articule.js';
const B = boites(), NOM = Object.fromEntries(Object.entries(OS).map(([k, v]) => [v, k]));
// les faces dessinées d'une boîte : dessus (y1), devant (z1), est (x1), ouest (x0), + derrière (z0) au labo
const faces = b => { const [x0, x1, y0, y1, z0, z1, p, os, show, haut, avant, rot, niv] = b; if (rot) return [];
  return [{ ax: 'y', v: y1, a: [x0, x1], c: [z0, z1], col: haut }, { ax: 'z', v: z1, a: [x0, x1], c: [y0, y1], col: avant }, { ax: 'x', v: x1, a: [y0, y1], c: [z0, z1], col: p }, { ax: 'x', v: x0, a: [y0, y1], c: [z0, z1], col: p }, { ax: 'z', v: z0, a: [x0, x1], c: [y0, y1], col: p }]; };
const rec = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const tol = +process.argv[2] || 0.0015; let n = 0;
for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
  const bi = B[i], bj = B[j];
  if (bi[12] === 2 && bj[12] === 1 || bi[12] === 1 && bj[12] === 2) continue;           // niveaux qui ne se dessinent jamais ensemble
  for (const f of faces(bi)) for (const g of faces(bj)) if (f.ax === g.ax && Math.abs(f.v - g.v) < tol && rec(f.a, g.a) > 0.004 && rec(f.c, g.c) > 0.004 && f.col !== g.col) {
    n++; if (n <= 60) console.log(`${NOM[bi[7]]}/${NOM[bj[7]]} plan ${f.ax}=${f.v}/${g.v}  boîte ${i} [${bi.slice(0, 6)}] show ${bi[8]}  ×  boîte ${j} [${bj.slice(0, 6)}] show ${bj[8]}`);
  }
}
console.log(n, 'paires de faces dans un même plan, de couleurs différentes, à', tol, 'm');
