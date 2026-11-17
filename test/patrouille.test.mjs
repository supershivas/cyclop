// La patrouille de nuit (js/patrouille.js, prototype du labo v0.142.0) : logique pure, sans navigateur.
import { creerPatrouille, pasPatrouille, allerA, coucher, vivants } from '../js/patrouille.js';
import { PATROUILLE } from '../js/data/patrouille.js';

// quarante hommes au sud, le but 120 m plus au nord, un poste d'en face juste derrière le but
const nouvelle = (graine = 3) => {
  const hommes = Array.from({ length: PATROUILLE.hommes }, (_, k) => k);
  const places = hommes.map(k => ({ x: 100 + (k % 8) * 1.5, y: 200 + Math.floor(k / 8) * 1.5 }));
  return creerPatrouille({ hommes, places, but: { x: 105, y: 80 }, graine });
};
const monde = (creux = () => false) => ({ creux, postes: [{ x: 105, y: 40 }] });
const jouer = (P, s, M = monde(), dt = 0.1) => { const ev = []; for (let k = 0; k < s / dt && !P.issue; k++) ev.push(...pasPatrouille(P, dt, M)); return ev; };

group('la patrouille de nuit');

test('même graine, même nuit : les mêmes fusées, les mêmes morts', () => {
  const a = nouvelle(), b = nouvelle();
  const ea = jouer(a, 200), eb = jouer(b, 200);
  assert.deepEqual(ea, eb);
  assert.equal(vivants(a), vivants(b));
});

test('couchée dans les trous, elle n\'est jamais vue', () => {
  const P = nouvelle(); coucher(P, true); allerA(P, 105, 199);      // (elle ne bouge presque pas : elle reste sous les fusées)
  jouer(P, 120, monde(() => true));
  assert.equal(P.alerte, 0); assert.equal(vivants(P), PATROUILLE.hommes);
});

test('debout sous les fusées, elle est vue et le poste tire', () => {
  const P = nouvelle();
  const ev = jouer(P, 300);
  assert.ok(ev.some(e => e.t === 'fusee'), 'des fusées');
  assert.ok(ev.some(e => e.t === 'rafale'), 'des rafales');
  assert.ok(vivants(P) < PATROUILLE.hommes, 'des morts');
});

test('elle arrive au but, et la partie finie refuse les ordres', () => {
  const P = nouvelle(); P.prochaine = 1e9;       // (pas de fusée : rien ne la voit)
  const ev = jouer(P, 300);
  assert.equal(P.issue, 'arrivee'); assert.ok(ev.some(e => e.t === 'issue'));
  assert.ok(allerA(P, 0, 0).refus); assert.ok(coucher(P).refus);
});
