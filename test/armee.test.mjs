// La foule : marcher vers sa place, la boue qui ralentit, le mur de deux mètres, les morts.
import { creerTerrain } from '../js/terrain.js';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, compacter, tuerDans, place, effrayer, reposer } from '../js/army.js';
import { createRng } from '../js/lib/rng.js';
import { REGLAGES as R } from '../js/data/reglages.js';

function monde(W = 60, H = 20) {
  const T = creerTerrain(1, { largeur: W, hauteur: H, arbres: 0 }, R);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  return T;
}
// un régiment d'un homme, qui doit aller en (x, y)
function seul(T, x0, y0, x, y) {
  const A = creerArmee({ capacite: 4, W: T.W, H: T.H });
  ajouterSoldat(A, x0, y0, 0, 0, 0, 0.5);
  A.tirT[0] = 1e9;                         // pas de tir
  const regiments = [{ id: 0, camp: 0, effectif: 1, ordre: { x, y, fx: 0, fy: -1, cols: 1, esp: 2 } }];
  const ctx = { T, R, regiments, champDe: () => null, rng: createRng(1), dt: 1 / 30, gel: false, frapper: () => {} };
  return { A, ctx };
}
function marcher(T, x0, y0, x, y, secondes) {
  const { A, ctx } = seul(T, x0, y0, x, y);
  for (let k = 0; k < secondes * 30; k++) { construireGrille(A); pasArmee(A, ctx); }
  return A;
}

group('foule');
test('un soldat rejoint sa place et s\'y arrête', () => {
  const A = marcher(monde(), 5.5, 10.5, 20.5, 10.5, 20);
  assert.ok(Math.abs(A.x[0] - 20.5) < 0.4 && Math.abs(A.y[0] - 10.5) < 0.4, `${A.x[0]}, ${A.y[0]}`);
});
test('la boue le ralentit', () => {
  const sec = marcher(monde(), 5.5, 10.5, 55.5, 10.5, 10);
  const T = monde(); T.humid.fill(0.95);
  const boue = marcher(T, 5.5, 10.5, 55.5, 10.5, 10);
  const ds = sec.x[0] - 5.5, db = boue.x[0] - 5.5;
  assert.ok(db < ds * 0.6, `sec ${ds.toFixed(1)} m, boue ${db.toFixed(1)} m`);
});
test('une marche de deux mètres ne se monte pas (sauf à force, très lentement)', () => {
  const T = monde();
  for (let j = 0; j < T.H; j++) for (let i = 30; i < T.W; i++) T.base[j * T.W + i] = 20 + R.vitesse.mur;
  const A = marcher(T, 5.5, 10.5, 50.5, 10.5, 30);
  assert.ok(A.x[0] < 31, `il est en ${A.x[0].toFixed(2)}`);
});
test('la place d\'un soldat dans sa formation : un front, des rangs derrière', () => {
  const o = { x: 100, y: 50, fx: 0, fy: -1, cols: 10, esp: 2 };
  const p0 = place(o, 0, [0, 0]), p9 = place(o, 9, [0, 0]), p10 = place(o, 10, [0, 0]);
  assert.ok(Math.abs(p9[0] - p0[0] - 18) < 1e-9);
  assert.ok(p10[1] > p0[1], 'le deuxième rang est derrière (plus au sud quand on fait face au nord)');
});
test('un obus tue près de lui, et les morts sont retirés', () => {
  const T = monde();
  const A = creerArmee({ capacite: 100, W: T.W, H: T.H });
  for (let k = 0; k < 50; k++) ajouterSoldat(A, 10 + (k % 10), 5 + Math.floor(k / 10), 0, 0, k, 0.5);
  construireGrille(A);
  let morts = 0;
  tuerDans(A, 14, 7, 6, { R, rng: createRng(2), T, frapper: i => { A.mort[i] = 1; morts++; } });
  assert.ok(morts > 0 && morts < 50, `${morts} morts`);
  assert.equal(compacter(A), morts);
  assert.equal(A.n, 50 - morts);
});
test('marcher fatigue les jambes, plus dans la boue ; des jambes lourdes ralentissent', () => {
  const sec = marcher(monde(), 5.5, 10.5, 55.5, 10.5, 10);
  const T = monde(); T.humid.fill(0.95);
  const boue = marcher(T, 5.5, 10.5, 55.5, 10.5, 10);
  assert.ok(sec.fatJ[0] > 0.05 && boue.fatJ[0] > sec.fatJ[0] * 1.5, `sec ${sec.fatJ[0].toFixed(2)}, boue ${boue.fatJ[0].toFixed(2)}`);
  const { A, ctx } = seul(monde(), 5.5, 10.5, 55.5, 10.5);
  A.fatJ[0] = 1;
  for (let k = 0; k < 300; k++) { construireGrille(A); pasArmee(A, ctx); }
  assert.ok(A.x[0] - 5.5 < (sec.x[0] - 5.5) * 0.75, 'épuisé, il va moins loin');
});
test('blessé à la jambe, il va deux fois moins vite', () => {
  const { A, ctx } = seul(monde(), 5.5, 10.5, 55.5, 10.5);
  A.blessure[0] = 2;
  for (let k = 0; k < 300; k++) { construireGrille(A); pasArmee(A, ctx); }
  const sain = marcher(monde(), 5.5, 10.5, 55.5, 10.5, 10);
  assert.ok(A.x[0] - 5.5 < (sain.x[0] - 5.5) * 0.6);
});
test('un obus fait peur jusqu\'à trois fois son rayon ; la nuit, la peur et la fatigue retombent', () => {
  const T = monde();
  const A = creerArmee({ capacite: 4, W: T.W, H: T.H });
  ajouterSoldat(A, 10, 10, 0, 0, 0, 0.5); ajouterSoldat(A, 40, 10, 0, 0, 1, 0.5);
  construireGrille(A);
  effrayer(A, 12, 10, 12, R.soldat.peurObus);
  assert.ok(A.peur[0] > 0.4 && A.peur[1] === 0, `${A.peur[0]} ${A.peur[1]}`);
  A.fatJ[0] = 0.8;
  reposer(A, R);
  assert.ok(A.peur[0] < 0.3 && A.fatJ[0] < 0.3);
});
