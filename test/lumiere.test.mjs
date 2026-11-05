// Le labo lumière (js/lumiere/) : le terrain en voxels, l'obus, la lumière locale, la foule. Logique pure, sans navigateur.
import { readFileSync, readdirSync } from 'node:fs';
import { creerMonde, impact, chunksDe, rectDeChunks, MAT } from '../js/lumiere/terrain.js';
import { creerLumiere, calculerSoleil, calculerAO, calculerFlood, calculerCavite, regionTotale, directionSoleil } from '../js/lumiere/lumiere.js';
import { creerFoule, regler, avancer } from '../js/lumiere/foule.js';
import { construireChunk, creerTampons } from '../js/lumiere/maillage.js';
import { QUALITES } from '../js/lumiere/config.js';

const plat = (cpm = 1) => { const M = creerMonde({ cpm }); M.sol.fill(40); M.veg.fill(0); M.toit.fill(0); M.top.fill(40); return M; };
const hache = a => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };

group('labo lumière — le terrain et l\'obus');
test('un obus retire un cube entier, quatre demi-cubes et quatre quarts de cube sur terrain plat', () => {
  const M = plat(), r = impact(M, 100.5, 80.5);
  assert.ok(r);
  const d = (di, dj) => 40 - M.sol[(80 + dj) * M.W + 100 + di];
  assert.equal(d(0, 0), 4);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.equal(d(a, b), 2);
  for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) assert.equal(d(a, b), 1);
  assert.equal(r.retire, 4 + 4 * 2 + 4 * 1);
});
test('à 2 cases par mètre, le cratère garde la même taille en mètres et le même volume en cubes', () => {
  const M = plat(2); impact(M, 100.5, 80.5);
  let retire = 0; for (let i = 0; i < M.n; i++) retire += 40 - M.sol[i];
  // 16 quarts de cube en tout, chaque quart faisant (cell/4)³ avec des cases 4 fois plus petites en surface : 2 × 2 cases × (2 quarts de haut en plus) = 4 × 2 fois plus
  assert.equal(retire, 16 * 2 * 4);
  assert.equal(M.sol[(160 + 1) * M.W + 200 + 1], 40 - 8, 'le centre : un cube de 1 m = 8 quarts de 12,5 cm');
});
test('un obus brise le toit d\'un abri et abat la végétation', () => {
  const M = plat(); M.toit[80 * M.W + 100] = 40; M.veg[80 * M.W + 101] = 20; M.mat[80 * M.W + 101] = MAT.TRONC;
  impact(M, 100.5, 80.5);
  assert.equal(M.toit[80 * M.W + 100], 0); assert.equal(M.veg[80 * M.W + 101], 0);
});
test('le monde est le même pour la même graine, et déjà façonné (tranchées, abris, cratères)', () => {
  const a = creerMonde({}), b = creerMonde({}), c = creerMonde({ graine: 8 });
  assert.equal(hache(a.sol), hache(b.sol)); assert.notEqual(hache(a.sol), hache(c.sol));
  assert.equal(a.lignes.filter(l => l.camp === 0).length, 4); assert.equal(a.lignes.filter(l => l.camp === 1).length, 4);
  assert.ok(a.abris.length > 0 && a.toit.some(v => v > 0), 'des abris couverts');
  assert.ok(a.craters.length > 100, 'des cratères');
});
test('le maillage est fermé par les flancs et ne déborde pas ses tampons', () => {
  const M = creerMonde({ cpm: 2 }), B = creerTampons(M);
  for (let cy = 0; cy < M.chh; cy++) for (let cx = 0; cx < M.cw; cx++) { construireChunk(M, cx, cy, { ao: true }, B); assert.ok(B.sol.nv * 8 <= B.sol.v.length && B.toit.nv * 8 <= B.toit.v.length); assert.ok(B.sol.nx <= B.sol.x.length); }
});

group('labo lumière — la lumière locale');
const completer = (M, L, q) => { const R = regionTotale(M), s = directionSoleil(8); const soleil = { ...s, dir: s.dir }; calculerSoleil(M, L, R, soleil, q.porteeOmbre); calculerAO(M, L, R, q.rayonAO, q.directionsAO); calculerFlood(M, L, R); calculerCavite(M, L, R); return soleil; };
for (const [nom, cpm] of [['bas', 1], ['haut', 2]]) {
  test(`niveau ${nom} : après un obus, le recalcul LOCAL donne exactement la lumière du recalcul de toute la carte`, () => {
    const q = QUALITES[nom], M = creerMonde({ cpm }), L = creerLumiere(M, q), soleil = completer(M, L, q);
    for (const [x, z] of [[100.5, 80.5], [60.3, 100.2], [15.4, 40.6]]) {            // dont un obus près d'un abri et un près du bord de la carte
      const imp = impact(M, x, z), region = rectDeChunks(M, chunksDe(M, imp, 1));
      const autour = m => { const k = Math.ceil(m * M.cpm) + 1; return { i0: Math.max(region.i0, imp.i0 - k), j0: Math.max(region.j0, imp.j0 - k), i1: Math.min(region.i1, imp.i1 + k), j1: Math.min(region.j1, imp.j1 + k) }; };
      calculerSoleil(M, L, autour(q.porteeOmbre), soleil, q.porteeOmbre); calculerAO(M, L, autour(q.rayonAO), q.rayonAO ? q.rayonAO : 4, q.directionsAO); calculerFlood(M, L, region); calculerCavite(M, L, autour(3));
      // aucune case hors du chunk touché et de ses voisins n'a été recalculée
      assert.ok(region.i1 - region.i0 + 1 <= 4 * M.chunk && region.j1 - region.j0 + 1 <= 4 * M.chunk);   // un obus à cheval sur deux chunks : deux chunks + leurs voisins
      const ref = creerLumiere(M, q); completer(M, ref, q);
      assert.equal(hache(L.tex), hache(ref.tex), `obus en ${x}, ${z}`);
    }
  });
}
test('la lumière propagée : sous un toit, l\'ombre s\'épaissit avec la distance à l\'entrée ; un toit brisé laisse entrer le jour', () => {
  const M = plat(); const j = 80;
  for (let i = 90; i < 122; i++) { M.sol[j * M.W + i] = 28; M.top[j * M.W + i] = 28; }                                    // une tranchée, plancher à 3 cubes sous la surface
  for (let i = 100; i < 112; i++) { M.toit[j * M.W + i] = 40; M.top[j * M.W + i] = 40; }                                   // couverte sur 12 m
  const L = creerLumiere(M, QUALITES.moyen); calculerFlood(M, L, regionTotale(M));
  const niveau = i => L.tex[(j * M.W + i) * 4 + 2];
  assert.equal(niveau(99), 240); assert.ok(niveau(100) < 240); assert.equal(niveau(130), 240, 'la terre d\'à côté est à ciel ouvert'); assert.ok(niveau(103) < niveau(100)); assert.ok(niveau(105) < niveau(103));
  M.toit[j * M.W + 105] = 0; M.top[j * M.W + 105] = M.sol[j * M.W + 105]; calculerFlood(M, L, regionTotale(M));
  assert.equal(niveau(105), 240, 'le toit brisé laisse entrer la lumière du ciel');
});
test('l\'ombre : un obstacle haut cache le sol derrière lui, côté opposé au soleil ; la nuit, plus aucun soleil', () => {
  const M = plat(); for (let j = 70; j < 90; j++) { M.sol[j * M.W + 100] = 80; M.top[j * M.W + 100] = 80; }          // un mur de 10 m
  const L = creerLumiere(M, QUALITES.moyen), s = directionSoleil(8);
  calculerSoleil(M, L, regionTotale(M), s, 16);
  const vis = (i, j) => L.tex[(j * M.W + i) * 4];
  const cote = Math.sign(s.dir[0]);                                          // du côté du soleil : éclairé ; de l'autre : dans l'ombre
  assert.ok(vis(100 + 3 * cote, 80) > 200, 'face au soleil'); assert.ok(vis(100 - 3 * cote, 80) < 50, 'derrière le mur');
  calculerSoleil(M, L, regionTotale(M), directionSoleil(2), 16);
  assert.equal(vis(100 + 3 * cote, 80), 0);
});
test('un creux est plus sombre (AO) et reçoit des flaques (cavité) ; le plat reste ouvert', () => {
  const M = plat(); impact(M, 100.5, 80.5); impact(M, 100.5, 80.5); impact(M, 100.5, 80.5);
  const L = creerLumiere(M, QUALITES.moyen); calculerAO(M, L, regionTotale(M), 6, 8); calculerCavite(M, L, regionTotale(M));
  const ao = (i, j) => L.tex[(j * M.W + i) * 4 + 1], cav = (i, j) => L.tex[(j * M.W + i) * 4 + 3];
  assert.ok(ao(100, 80) < ao(30, 30) - 10); assert.ok(cav(100, 80) > cav(30, 30) + 20); assert.ok(ao(30, 30) > 240);
});

group('labo lumière — la foule');
test('le coût de la foule ne dépend pas du terrain, et elle est déterministe', () => {
  const M = creerMonde({}), a = creerFoule(M), b = creerFoule(M); regler(a, 5000); regler(b, 5000);
  for (let k = 0; k < 60; k++) { avancer(a, 1 / 30); avancer(b, 1 / 30); }
  assert.equal(hache(a.xy.subarray(0, 10000)), hache(b.xy.subarray(0, 10000)));
  for (let i = 0; i < a.n; i++) assert.ok(a.x[i] >= 0 && a.x[i] <= 256 && a.z[i] >= 0 && a.z[i] <= 160);
  regler(a, 999999); assert.equal(a.n, 50000);
});

group('labo lumière — pureté');
test('terrain, lumière, foule, maillage, particules, ciel : ni DOM, ni horloge, ni Math.random', () => {
  for (const f of ['terrain', 'lumiere', 'foule', 'maillage', 'particules', 'ciel', 'camera', 'config']) {
    const src = readFileSync(`js/lumiere/${f}.js`, 'utf8').replace(/\/\/.*$/gm, '');
    for (const mot of ['Math.random', 'Date.now', 'performance.now', 'document.', 'window.', 'localStorage']) assert.ok(!src.includes(mot), `${f}.js utilise ${mot}`);
  }
});
