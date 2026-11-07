// Où est un régiment ? (v0.114.1) Un régiment scindé (une poche chez l'ennemi) a un plus gros amas, des isolés, et un chemin de départ pour chacun.
import { nouvelleBataille, zone, cheminsVers, ordonnerMarche, avancer } from '../js/bataille.js';
import { amasDe, placeDe, isoles } from '../js/amas.js';
import { AMAS } from '../js/data/amas.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { ligneY } from '../js/tranchees.js';

// le régiment 0 de chez nous, dont `k` hommes sont portés dans la tranchée d'en face (1re ligne, au milieu du secteur)
function scinde(k, graine = 3) {
  const B = nouvelleBataille(graine, R, { soldats: 400, jours: 3 });
  const A = B.armee, reg = B.etat.regiments.find(r => r.camp === 0), Z = zone(B);
  const L = B.lignes.find(l => l.camp === 1 && l.rang === 0), x = Z.x0 + 200, y = ligneY(L, x);
  let porte = 0;
  for (let i = 0; i < A.n && porte < k; i++) if (A.reg[i] === reg.id && !A.mort[i]) { A.x[i] = x + (porte % 6); A.y[i] = y + ((porte / 6) | 0); porte++; }
  return { B, reg, x, y, porte };
}

group('amas — où est un régiment');
test('un régiment entier est un seul amas, à son centre', () => {
  const { B, reg } = scinde(0);
  const g = amasDe(B, { reg: reg.id }).get(reg.id);
  assert.equal(g.amas.length, 1);
  assert.equal(g.n, B.armee.reg.slice(0, B.armee.n).filter((r, i) => r === reg.id && !B.armee.mort[i]).length);
  assert.deepEqual(isoles(g), []);
});
test('une poche chez l\'ennemi est un isolé : le gros reste le gros, la poche a son centre à elle', () => {
  const { B, reg, x, y, porte } = scinde(14);
  assert.equal(porte, 14);
  const g = amasDe(B, { reg: reg.id }).get(reg.id);
  assert.equal(g.amas.length, 2);
  const [gros, poche] = g.amas;
  assert.ok(gros.n > poche.n);
  assert.equal(poche.n, 14);
  assert.ok(Math.hypot(poche.x - x, poche.y - y) < 6, 'la poche est où sont ses hommes (la tranchée d\'en face)');
  assert.ok(Math.hypot(gros.x - x, gros.y - y) > 40, 'le gros n\'est pas tiré vers la poche (la moyenne l\'aurait fait)');
  assert.deepEqual(isoles(g).map(a => a.n), [14]);
  assert.equal(placeDe(B, reg.id).x, gros.x);
});
test('une poche sous le seuil n\'est pas montrée, mais elle compte dans le total du régiment', () => {
  const { B, reg } = scinde(AMAS.isole - 1);
  const g = amasDe(B, { reg: reg.id }).get(reg.id);
  assert.equal(g.amas.length, 2);
  assert.deepEqual(isoles(g), []);
});
test('un chemin par amas : le gros part du gros, la poche part de la poche', () => {
  const { B, reg, x, y } = scinde(14);
  const Z = zone(B), [c] = cheminsVers(B, [reg], Z.x0 + 100, Z.y0 + 40);
  const g = amasDe(B, { reg: reg.id }).get(reg.id);
  assert.deepEqual(c.pts[0], [g.amas[0].x, g.amas[0].y]);
  assert.equal(c.autres.length, 1);
  assert.deepEqual(c.autres[0].pts[0], [g.amas[1].x, g.amas[1].y]);
  assert.ok(Math.hypot(c.autres[0].x - x, c.autres[0].y - y) < 6);
});
test('un régiment sans personne n\'a pas d\'endroit', () => {
  const { B, reg } = scinde(0);
  for (let i = 0; i < B.armee.n; i++) if (B.armee.reg[i] === reg.id) B.armee.mort[i] = 1;
  assert.equal(placeDe(B, reg.id), null);
});
test('lire les amas ne change rien à la partie', () => {
  const a = scinde(14).B, b = scinde(14).B;
  amasDe(a); cheminsVers(a, [a.etat.regiments[0]], 100, 100);
  for (let k = 0; k < 200; k++) { avancer(a); avancer(b); }
  assert.deepEqual(Array.from(a.armee.x.slice(0, a.armee.n)), Array.from(b.armee.x.slice(0, b.armee.n)));
});
