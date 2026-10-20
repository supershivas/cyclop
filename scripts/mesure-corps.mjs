// Le corps à corps (v0.37.2) : N hommes d'un camp sur un seul de l'autre, au milieu d'un champ nu.
//   node scripts/mesure-corps.mjs                 → 20 contre 1, 8 graines, 120 s
//   node scripts/mesure-corps.mjs --n 4 --graines 20 --secondes 60
//   --regle tir.contact=0                         → essayer un réglage sans toucher au fichier (contact : 0 = l'ancien tir seulement)
// Pour chaque graine : combien de secondes avant que le seul homme ne soit tué ou pris (— : encore debout), et ses coups portés.
// La foule seule (`pasArmee`), sans bataille : le même tir, les mêmes réglages, un `frapper` qui blesse puis tue comme celui du jeu.
import { creerTerrain } from '../js/terrain.js';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, compacter } from '../js/army.js';
import { createRng } from '../js/lib/rng.js';
import { REGLAGES } from '../js/data/reglages.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const N = +arg('n', 20), graines = +arg('graines', 8), secondes = +arg('secondes', 120);
const R = structuredClone(REGLAGES);
for (const kv of (arg('regle', '') || '').split(',').filter(Boolean)) {
  const [chemin, v] = kv.split('='), [a, b] = chemin.split('.');
  R[a][b] = +v;
}

function essai(graine) {
  const T = creerTerrain(1, { largeur: 80, hauteur: 60, arbres: 0 }, R);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  const A = creerArmee({ capacite: N + 2, W: T.W, H: T.H });
  const rng = createRng(graine);
  // N attaquants en bloc, face au nord, à 8 m de l'homme seul qui est au milieu
  for (let k = 0; k < N; k++) ajouterSoldat(A, 40 + (k % 5) * 2 - 4, 38 + Math.floor(k / 5) * 2, 0, 0, 0, 0.3);
  ajouterSoldat(A, 37, 30, 1, 1, 0, 0.3);
  const regiments = [
    { id: 0, camp: 0, effectif: N, ordre: { x: 40, y: 32, fx: 0, fy: -1, cols: 5, esp: 2 } },
    { id: 1, camp: 1, effectif: 1, ordre: { x: 37, y: 30, fx: 0, fy: 1, cols: 1, esp: 2 } },
  ];
  let mort = null, coups = 0;
  const frapper = (i, cause, gravite, choc, par) => {
    if (A.mort[i]) return;
    if (A.blessure[i] || rng() < gravite) { A.mort[i] = 1; if (A.camp[i] === 1 && mort === null) mort = t; }
    else A.blessure[i] = 1 + Math.floor(rng() * 3);
  };
  const ctx = { T, R, regiments, champDe: () => null, rng, dt: 1 / 30, gel: false, frapper, tir: () => { coups++; }, faces: [], arriere: null };
  let t = 0;
  for (let k = 0; k < secondes * 30 && mort === null; k++) {
    t = k / 30;
    construireGrille(A); pasArmee(A, ctx);
  }
  return { mort, vivants: N };
}

const res = [];
for (let g = 1; g <= graines; g++) res.push(essai(g).mort);
const morts = res.filter(m => m !== null).sort((a, b) => a - b);
console.log(`${N} contre 1, ${graines} graines, ${secondes} s : ${morts.length} tués`);
console.log(res.map(m => m === null ? '—' : m.toFixed(1)).join('  '));
if (morts.length) console.log(`médiane ${morts[morts.length >> 1].toFixed(1)} s`);
