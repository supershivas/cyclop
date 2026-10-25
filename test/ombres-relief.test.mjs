// Les ombres du relief (labo « La lumière dans le relief », dessin seulement) : un mur d'un mètre cinquante ou plus met à l'ombre les cases que son ombre atteint,
// pas les autres ; le terrain qui change refait les rangées touchées ; éteintes, plus rien n'est à l'ombre. Un faux terrain, sans bataille ni navigateur.
import { creerOmbresRelief } from '../js/rendu/ombres-relief.js';

const W = 40, H = 40;
function terrain(murs) {
  const T = { W, H, h: new Int16Array(W * H), profond: new Uint8Array(W * H), versionLigne: new Uint32Array(H) };
  for (const [i, hq] of murs) for (let j = 0; j < H; j++) T.h[j * W + i] = hq;
  return T;
}
const hauteurQ = (T, c) => T.h[c];
// le soleil donné, puis toutes les rangées demandées (le rendu ne demande que celles qu'il repeint)
function calculer(o, sol) { o.maj(true, sol, 10); for (let j = 0; j < H; j++) o.ligneA(j); }
const ombre = (o, i, j) => o.masque[j * W + i];

group('ombres du relief — un mur de 2 m, le soleil à l\'est (l\'ombre part vers l\'ouest, 2 m d\'ombre par mètre)');
test('les cases que l\'ombre atteint sont à l\'ombre, les autres non', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([[20, 8]]); o.attacher(T);
  calculer(o, { x: -2, z: 0 });
  for (let i = 16; i <= 19; i++) assert.equal(ombre(o, i, 10), 1, `case ${i}`);       // 8 quarts = 2 m, ×2 : 4 m d'ombre
  assert.equal(ombre(o, 15, 10), 0, 'au-delà de l\'ombre');
  assert.equal(ombre(o, 21, 10), 0, 'côté soleil');
  assert.equal(ombre(o, 20, 10), 0, 'le sommet du mur est au soleil');
});
test('un relief de moins d\'un demi-mètre ne projette rien', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([[20, 1]]); o.attacher(T);
  calculer(o, { x: -2, z: 0 });
  assert.equal(ombre(o, 19, 10), 0);
});
test('le soleil de l\'autre côté : l\'ombre change de côté', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([[20, 8]]); o.attacher(T);
  calculer(o, { x: 2, z: 0 });
  for (let i = 21; i <= 24; i++) assert.equal(ombre(o, i, 10), 1, `case ${i}`);
  assert.equal(ombre(o, 19, 10), 0);
});
test('la nuit (soleil nul), rien n\'est à l\'ombre', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([[20, 8]]); o.attacher(T);
  calculer(o, { x: -2, z: 0 }); calculer(o, { x: 0, z: 0 });
  assert.equal(ombre(o, 19, 10), 0);
});

group('ombres du relief — le terrain change, l\'option s\'éteint');
test('un mur neuf refait ses rangées, sur place', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([]); o.attacher(T);
  const sol = { x: -2, z: 0 };
  calculer(o, sol);
  assert.equal(ombre(o, 10, 5), 0);
  T.h[5 * W + 12] = 8; T.versionLigne[5]++;                          // un obus : une rangée change
  const v = o.versions[5], v38 = o.versions[38];
  calculer(o, sol);
  assert.equal(ombre(o, 10, 5), 1);
  assert.equal(o.versions[38], v38, 'une rangée loin de l\'ombre n\'est pas touchée');
  assert.ok(o.versions[5] > v, 'le rendu est prévenu');
  assert.equal(ombre(o, 10, 38), 0, 'les autres rangées sont inchangées');
});
test('éteintes : tout redevient au soleil, et le rendu est prévenu', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([[20, 8]]); o.attacher(T);
  calculer(o, { x: -2, z: 0 });
  const v = o.versions[10];
  o.maj(false, { x: -2, z: 0 }, 1);
  o.ligneA(10);
  assert.equal(ombre(o, 19, 10), 0);
  assert.ok(o.versions[10] > v, 'le rendu est prévenu');
  const v2 = o.versions[10];
  o.maj(false, { x: -2, z: 0 }, 1);
  assert.equal(o.versions[10], v2, 'rien de plus à faire');
});
test('un soleil qui bouge à peine ne relance pas le calcul', () => {
  const o = creerOmbresRelief({ hauteurQ }); const T = terrain([[20, 8]]); o.attacher(T);
  calculer(o, { x: -2, z: 0 });
  const v = o.versions[10];
  o.maj(true, { x: -2, z: -0.01 }, 10);
  assert.equal(o.versions[10], v);
});
