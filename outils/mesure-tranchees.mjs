// Le coût des trois niveaux de détail des tranchées (v0.84.0), sans navigateur : la géométrie seule d'un tronçon droit et plat, dans les trois états (intact, abîmé, détruit).
//   node outils/mesure-tranchees.mjs [--tronçons 128]
// Rend les triangles par tronçon, pour un secteur entier (128 tronçons : 4 lignes par camp, 16 tronçons de 25 m), le nombre de traits (fil de fer) et le temps de construction.
// Le dessin entier (avec le sol et les soldats) se mesure au labo (sujet « Les tranchées », bouton « Mesurer dans la scène ») ou avec `scripts/mesure-tranchees-labo.mjs`.
import { mesurerNiveau, NIVEAUX_TRANCHEES } from '../js/rendu/tranchee-modeles.js';

const n = +(process.argv.find((a, i) => process.argv[i - 1] === '--tronçons') || 128);
const now = () => Number(process.hrtime.bigint()) / 1e6;
console.log(`${n} tronçons, géométrie seule (un tronçon droit et plat)\n`);
console.log('niveau'.padEnd(16), 'intact'.padStart(8), 'abîmé'.padStart(8), 'détruit'.padStart(8), '  secteur intact (tri)'.padStart(24), 'traits'.padStart(8), 'construire'.padStart(12));
for (const N of NIVEAUX_TRANCHEES) {
  mesurerNiveau(N.n, 2, n, now);                                 // chauffer
  const r = [2, 1, 0].map(e => mesurerNiveau(N.n, e, n, now));
  console.log(`${N.n} ${N.nom}`.padEnd(16), ...r.map(m => String(Math.round(m.triangles / n)).padStart(8)), String(Math.round(r[0].triangles)).padStart(24), String(Math.round(r[0].traits / n)).padStart(8), `${r[0].ms.toFixed(1)} ms`.padStart(12));
}
