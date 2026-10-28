// Le fil de fer devant la 1re ligne : les obus le coupent, il se relit tel quel (v0.98.0).
import { nouvelleBataille, avancer, photo, restaurer } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { filCoupe, degatsFil } from '../js/fil.js';
import { FIL } from '../js/data/fil.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const petite = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6 });
// un tronçon de 1re ligne d'en face : son réseau et son milieu, devant la ligne
const premier = B => { const k = B.troncons.findIndex((tr, i) => B.lignes[tr.ligne].rang === 0 && B.lignes[tr.ligne].camp === 1), tr = B.troncons[k], L = B.lignes[tr.ligne], x = (tr.x0 + tr.x1) / 2; return { k, x, y: ligneY(L, x) + L.face * FIL.decalage }; };

group('fil de fer');
test('chaque tronçon de 1re ligne a son réseau ; les autres lignes n\'en ont pas', () => {
  const B = petite();
  B.troncons.forEach((tr, k) => assert.equal(B.etat.fil[k], B.lignes[tr.ligne].rang === 0 ? FIL.pv : 0, `tronçon ${k}`));
});
test('un obus tombé dessus l\'abîme, plusieurs le coupent ; un obus loin ne change rien', () => {
  const B = petite(), { k, x, y } = premier(B);
  degatsFil(B, x, y + 300, '220'); assert.equal(B.etat.fil[k], FIL.pv, 'loin');
  degatsFil(B, x, y, '75'); assert.equal(B.etat.fil[k], FIL.pv - FIL.obus['75']); assert.equal(filCoupe(B.etat, k), false);
  for (let i = 0; i < 4; i++) degatsFil(B, x, y, '75');
  assert.equal(B.etat.fil[k], 0); assert.equal(filCoupe(B.etat, k), true);
  degatsFil(B, x, y, '220'); assert.equal(B.etat.fil[k], 0, 'jamais sous zéro');
});
test('un gros calibre fait plus de dégâts, et moins loin du centre', () => {
  const a = petite(), b = petite(), { k, x, y } = premier(a);
  degatsFil(a, x, y, '155'); degatsFil(b, x, y, '75');
  assert.ok(a.etat.fil[k] < b.etat.fil[k]);
  const c = petite(); degatsFil(c, x, y + 3, '155'); assert.ok(c.etat.fil[k] > a.etat.fil[k], 'à 3 m du centre : moins abîmé');
});
test('un barrage tiré sur le fil le coupe, et la partie relue garde le fil abîmé', () => {
  const A = petite(7), { k, x, y } = premier(A);
  A.etat.barrages.push({ camp: 0, cal: '155', x, y, reste: 12, prochain: A.etat.temps, dispersion: 0 });
  for (let i = 0; i < 400; i++) avancer(A);
  assert.ok(A.etat.fil[k] < FIL.pv, `fil ${A.etat.fil[k]}`);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.fil, A.etat.fil);
});
