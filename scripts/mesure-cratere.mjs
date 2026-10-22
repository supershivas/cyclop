// La forme des cratères (labo, v0.52.4) : combien de cases chaque forme touche, le volume creusé et jeté,
// la profondeur au centre, et ce que coûte impact() (10 000 impacts, sans navigateur).
//   node scripts/mesure-cratere.mjs [--ascii]
import { creerTerrain, impact } from '../js/terrain.js';
import { FORMES } from '../js/cratere.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { hash2 } from '../js/lib/rng.js';

const plat = (W = 400, H = 300) => { const T = creerTerrain(1, { largeur: W, hauteur: H, arbres: 0 }, R); T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1); return T; };
const ascii = process.argv.includes('--ascii');
for (let k = 0; k < 3000; k++) impact(plat(), 20, 20, '155', R, k, false, FORMES.tout);   // (l'échauffement du moteur JS)
console.log('forme    calibre  cases touchées  creusé  jeté  centre   µs/impact');
for (const [nomForme, forme] of Object.entries(FORMES)) for (const cal of ['75', '155', '220']) {
  // 40 impacts isolés, à des positions fractionnaires : moyenne des cases, du volume et de la profondeur
  let cases = 0, creuse = 0, jete = 0, centre = 0;
  const N = 40;
  for (let k = 0; k < N; k++) {
    const T = plat(41, 41), x = 20 + hash2(k, 1, 5), y = 20 + hash2(k, 2, 5);
    impact(T, Math.round(x * 10) / 10, Math.round(y * 10) / 10, cal, R, k, false, forme);
    for (let c = 0; c < T.diff.length; c++) { const d = T.diff[c]; if (d) { cases++; if (d < 0) creuse -= d; else jete += d; } }
    centre += -T.diff[Math.floor(y) * 41 + Math.floor(x)];
    if (ascii && k === 0) { for (let j = 12; j <= 28; j++) console.log([...Array(17)].map((_, i) => { const d = T.diff[j * 41 + 12 + i]; return d === 0 ? ' .' : String(d).padStart(2); }).join('')); }
  }
  // le coût : 10 000 impacts répartis sur un secteur
  const T = plat();
  const t0 = performance.now();
  for (let k = 0; k < 10000; k++) impact(T, 10 + hash2(k, 1, 9) * 380, 10 + hash2(k, 2, 9) * 280, cal, R, k, false, forme);
  const us = (performance.now() - t0) / 10;
  console.log(`${nomForme.padEnd(8)} ${cal.padEnd(7)} ${(cases / N).toFixed(1).padStart(10)}  ${(creuse / N).toFixed(0).padStart(10)} ${(jete / N).toFixed(0).padStart(5)} ${(centre / N).toFixed(1).padStart(7)} ${us.toFixed(1).padStart(9)}`);
}
