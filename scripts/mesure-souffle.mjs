// Le souffle des obus sur l'équilibre (v0.26.0) : un régiment en tranchée sous un barrage de 220, avec et sans souffle.
//   node scripts/mesure-souffle.mjs            → graines 3, 5, 7, 11
// Mesure : les morts, les hommes sortis de leur tranchée (à plus de 2 m de leur place) juste après la salve, et le temps qu'ils mettent à revenir.
import { nouvelleBataille, avancer, ordonnerBarrage, PAS } from '../js/bataille.js';
import { place } from '../js/army.js';
import { REGLAGES } from '../js/data/reglages.js';

function essai(graine, souffle) {
  const R = structuredClone(REGLAGES); R.obus.souffle = souffle;
  const B = nouvelleBataille(graine, R, { soldats: 400, jours: 3 });
  const reg = B.etat.regiments.find(r => r.camp === 0), o = reg.ordre;
  for (let k = 0; k < 4; k++) { ordonnerBarrage(B, '220', o.x + (k - 1.5) * 10, o.y, 1); B.etat.batteries['220'] = 0; }
  const p = [0, 0], hors = () => { let n = 0; const A = B.armee; for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) { place(reg.ordre, A.slot[i], p); if (Math.hypot(A.x[i] - p[0], A.y[i] - p[1]) > 2) n++; } return n; };
  let pic = 0, retour = null, fin = null;
  for (let t = 0; t < 30 * 90; t++) {
    avancer(B);
    if (!B.etat.barrages.length && fin === null) fin = t;
    const h = hors(); pic = Math.max(pic, h);
    if (fin !== null && retour === null && h <= 3) retour = (t - fin) * PAS;
  }
  return { morts: reg.pertes, pic, retour: retour === null ? '> 90' : retour.toFixed(0) };
}
for (const g of [3, 5, 7, 11]) {
  const a = essai(g, REGLAGES.obus.souffle), b = essai(g, 0);
  console.log(`graine ${g} : avec souffle — morts ${a.morts}, sortis au pire ${a.pic}, retour ${a.retour} s ; sans — morts ${b.morts}, sortis ${b.pic}, retour ${b.retour} s`);
}
