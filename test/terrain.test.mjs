// Le terrain : les cratères, la dureté, le plancher, la lèvre, l'eau.
import { creerTerrain, impact, hydroLignes, etat, hauteurQ, ETAT } from '../js/terrain.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { SECTEURS } from '../js/data/secteur.js';
import { METEO } from '../js/data/meteo.js';

// un petit terrain plat et sec, la nappe très bas
function plat(W = 21, H = 21) {
  const T = creerTerrain(1, { largeur: W, hauteur: H, arbres: 0 }, R);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  return T;
}
const diff = (T, i, j) => T.diff[j * T.W + i];

group('terrain — cratères');
test('un obus de 75 creuse son motif 3 × 3 : 1 m au centre, 50 cm sur les côtés, 25 cm aux coins', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  assert.equal(diff(T, 10, 10), -4);
  for (const [i, j] of [[9, 10], [11, 10], [10, 9], [10, 11]]) assert.equal(diff(T, i, j), -2);
  for (const [i, j] of [[9, 9], [11, 9], [9, 11], [11, 11]]) assert.equal(diff(T, i, j), -1);
});
test('la terre jetée fait une lèvre autour du cratère (jamais aux coins de l\'anneau)', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  let levre = 0;
  for (let j = 8; j <= 12; j++) for (let i = 8; i <= 12; i++) if (Math.max(Math.abs(i - 10), Math.abs(j - 10)) === 2 && diff(T, i, j) > 0) levre++;
  assert.ok(levre >= 6, `lèvre de ${levre} cases`);
  for (const [i, j] of [[8, 8], [12, 8], [8, 12], [12, 12]]) assert.equal(diff(T, i, j), 0);
});
test('plus profond, le sol est plus dur : un second obus au même endroit creuse deux fois moins', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  impact(T, 10.5, 10.5, '75', R);
  assert.equal(diff(T, 10, 10), -6);       // 4 quarts, puis 4 unités à 50 % = 2 quarts
});
test('le plancher dur arrête tout à −6 m', () => {
  const T = plat();
  for (let k = 0; k < 200; k++) impact(T, 10.5, 10.5, '220', R, k);
  assert.equal(diff(T, 10, 10), -R.terrain.plancher);
});
test('les gros calibres agrandissent le motif (5 × 5, 7 × 7)', () => {
  const T = plat(31, 31);
  impact(T, 15.5, 15.5, '155', R);
  assert.ok(diff(T, 13, 15) < 0 && diff(T, 17, 15) < 0, '155 : deux cases du centre');
  assert.equal(diff(T, 12, 15) > 0 || diff(T, 12, 15) === 0, true);
  const U = plat(31, 31);
  impact(U, 15.5, 15.5, '220', R);
  assert.ok(diff(U, 12, 15) < 0 && diff(U, 18, 15) < 0, '220 : trois cases du centre');
});
test('dans la boue, l\'obus s\'enfouit : il tue moins loin', () => {
  const T = plat(), U = plat();
  U.humid.fill(0.95);
  assert.ok(impact(U, 10.5, 10.5, '155', R).rayon < impact(T, 10.5, 10.5, '155', R).rayon);
});
test('un obus hors du champ ne fait rien', () => {
  const T = plat();
  assert.equal(impact(T, -5, 3, '75', R).rayon, 0);
  assert.ok(T.diff.every(v => v === 0));
});

group('terrain — eau');
test('même graine, même terrain ; autre graine, autre terrain', () => {
  const S = SECTEURS.essai;
  const a = creerTerrain(5, S, R), b = creerTerrain(5, S, R), c = creerTerrain(6, S, R);
  assert.deepEqual(a.base, b.base);
  assert.deepEqual(a.arbres, b.arbres);
  assert.notDeepEqual(a.base, c.base);
});
test('sous la pluie, l\'eau et l\'humidité montent dans un cratère plus que sur le plat', () => {
  const T = plat(31, 31);
  impact(T, 15.5, 15.5, '220', R);
  for (let h = 0; h < 24; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
  const centre = 15 * T.W + 15, loin = 3 * T.W + 3;
  assert.ok(T.eau[centre] > T.eau[loin], `eau ${T.eau[centre]} contre ${T.eau[loin]}`);
  assert.ok(T.humid[centre] >= T.humid[loin]);
  assert.equal(etat(T, centre, R), ETAT.EAU);
});
test('par temps sec, le sol sèche', () => {
  const T = plat();
  T.humid.fill(0.6);
  for (let h = 0; h < 12; h++) hydroLignes(T, 0, T.H, METEO.sec, R);
  assert.ok(T.humid[0] < 0.6);
});
test('un trou creusé sous la nappe se remplit, même sans pluie', () => {
  const T = plat();
  T.nappe.fill(20 * 0.25 - 0.5);          // la nappe à 50 cm sous le sol
  impact(T, 10.5, 10.5, '75', R);         // un mètre de trou
  for (let h = 0; h < 12; h++) hydroLignes(T, 0, T.H, METEO.sec, R);
  assert.ok(T.eau[10 * T.W + 10] > R.hydro.eau, `eau ${T.eau[10 * T.W + 10]}`);
});
test('le gel : l\'eau devient de la glace, la boue porte', () => {
  const T = plat();
  T.eau[0] = 0.3; T.humid[1] = 0.95;
  assert.equal(etat(T, 0, R, true), ETAT.GLACE);
  assert.equal(etat(T, 1, R, true), ETAT.SEC);
  assert.equal(etat(T, 1, R, false), ETAT.BOUE);
});
test('hauteurQ = sol généré + différence', () => {
  const T = plat();
  impact(T, 10.5, 10.5, '75', R);
  assert.equal(hauteurQ(T, 10 * T.W + 10), 16);
});

group('terrain — végétation');
test('de l\'herbe, des buissons en haies ; un obus souffle l\'herbe et arrache les buissons autour de lui', () => {
  const T = creerTerrain(5, { largeur: 200, hauteur: 150, arbres: 10, haies: 3, buissons: 40 }, R);
  let herbe = 0; for (let c = 0; c < T.W * T.H; c++) if (T.herbe[c]) herbe++;
  assert.ok(herbe > T.W * T.H * 0.3, `de l'herbe (${herbe} cases)`);
  assert.ok(T.buissons.length > 40, 'des buissons');
  const b = T.buissons[0];
  impact(T, b.i + 0.5, b.j + 0.5, '220', R);
  assert.equal(b.detruit, 1, 'arraché');
  for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
    const i = b.i + di, j = b.j + dj;
    if (i >= 0 && j >= 0 && i < T.W && j < T.H) assert.equal(T.herbe[j * T.W + i], 0);
  }
});
test('la boue et l\'eau tuent l\'herbe, heure après heure', () => {
  const T = creerTerrain(5, { largeur: 60, hauteur: 40, arbres: 0 }, R);
  T.herbe.fill(3); T.humid.fill(0.95);
  for (let h = 0; h < 4; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
  assert.ok(T.herbe.every(v => v === 0));
});

group('terrain — le secteur de départ (l\'Atelier le montre)');
test('terrainDuSecteur monte les marges et creuse les tranchées ; deux fois la même graine, le même sol', async () => {
  const { terrainDuSecteur } = await import('../js/secteur-terrain.js');
  const S = SECTEURS.essai, a = terrainDuSecteur(S, S.marges, 7, R), b = terrainDuSecteur(S, S.marges, 7, R), c = terrainDuSecteur(S, S.marges, 8, R);
  assert.equal(a.terrain.W, S.largeur + 2 * S.marges.x);
  assert.equal(a.terrain.H, S.hauteur + 2 * S.marges.y);
  assert.equal(a.lignes.length, 8);
  assert.deepEqual(a.terrain.base, b.terrain.base);
  assert.notDeepEqual(a.terrain.base, c.terrain.base);
  assert.equal(terrainDuSecteur(S, S.marges, 7, R, { tranchees: false }).lignes.length, 0);
});
