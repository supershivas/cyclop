// La bataille : déterminisme, ordres refusés à voix haute, sauvegarde qui rejoue la même partie.
import { readFileSync } from 'node:fs';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, aube, photo, restaurer, effectifs, horloge } from '../js/bataille.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const petite = (graine = 3) => nouvelleBataille(graine, R, { soldats: 200 });
const empreinte = B => JSON.stringify(photo(B));

group('bataille');
test('même graine, mêmes ordres : même bataille', () => {
  const a = petite(), b = petite();
  for (const B of [a, b]) { ordonnerMarche(B, [0, 1], 150, 150); ordonnerBarrage(B, '155', 200, 90); }
  for (let k = 0; k < 600; k++) { avancer(a); avancer(b); }
  assert.equal(empreinte(a), empreinte(b));
});
test('le compteur de pertes est juste : morts + vivants = l\'effectif de départ', () => {
  const B = petite();
  ordonnerBarrage(B, '220', 100, 230); ordonnerBarrage(B, '155', 300, 70, 1);
  for (let k = 0; k < 900; k++) avancer(B);
  const [nous, eux] = effectifs(B);
  assert.equal(nous + B.etat.pertes[0], 200);
  assert.equal(eux + B.etat.pertes[1], 200);
  assert.equal(B.armee.n, nous + eux);
  assert.ok(B.etat.pertes[0] + B.etat.pertes[1] > 0, 'des morts');
});
test('un ordre impossible se refuse, avec sa raison', () => {
  const B = petite();
  assert.match(ordonnerMarche(B, [], 10, 10).refus, /Aucun régiment/);
  assert.match(ordonnerMarche(B, [0], -5, 10).refus, /Hors du secteur/);
  assert.match(ordonnerMarche(B, [9], 10, 10).refus, /Aucun régiment/, 'un régiment d\'en face ne nous obéit pas');
  assert.ok(ordonnerBarrage(B, '75', 200, 100).ok);
  assert.match(ordonnerBarrage(B, '75', 200, 100).refus, /recharge/);
  assert.match(ordonnerBarrage(B, '420', 200, 100).refus, /Pas de batterie/);
});
test('la journée finit à 18 h, la nuit attend l\'aube, puis le dernier jour finit la bataille', () => {
  const B = petite();
  let n = 0;
  while (B.etat.phase === 'jour') { avancer(B); n++; }
  assert.equal(B.etat.phase, 'nuit');
  assert.equal(horloge(B).heure, 18);
  assert.equal(avancer(B).length, 0, 'rien ne bouge la nuit');
  assert.match(ordonnerMarche(B, [0], 100, 100).refus, /aube/);
  assert.ok(aube(B).ok);
  assert.equal(B.etat.jour, 2);
  while (B.etat.phase !== 'fin') { if (B.etat.phase === 'nuit') aube(B); avancer(B); }
  assert.equal(B.etat.jour, B.etat.meteo.length);
  assert.ok(n > 1000);
});
test('il pleut au moins un jour (le lot minimal doit voir venir la boue), jamais le premier', () => {
  for (let g = 1; g < 30; g++) {
    const m = nouvelleBataille(g, R, { soldats: 20 }).etat.meteo;
    assert.ok(m.includes('pluie'), `graine ${g} : ${m}`);
    assert.equal(m[0], 'sec');
  }
});

group('sauvegarde');
test('une bataille relue est la même, et se comporte pareil', () => {
  const A = petite(11);
  ordonnerMarche(A, [0, 1, 2], 200, 160); ordonnerBarrage(A, '155', 180, 120);
  for (let k = 0; k < 450; k++) avancer(A);
  const p = JSON.parse(JSON.stringify(photo(A)));
  const B = restaurer(p, R);
  assert.equal(empreinte(B), empreinte(A));
  assert.deepEqual(B.terrain.diff, A.terrain.diff);
  assert.deepEqual(B.terrain.eau, A.terrain.eau);
  for (let k = 0; k < 600; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('relue après une nuit, la bataille rejoue aussi l\'eau de la nuit', () => {
  const A = petite(4);
  ordonnerBarrage(A, '220', 200, 150);
  while (A.etat.phase === 'jour') avancer(A);
  aube(A);
  for (let k = 0; k < 300; k++) avancer(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.terrain.humid, A.terrain.humid);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('la sauvegarde ne contient pas le relief (graine et impacts seulement)', () => {
  const B = petite();
  const p = photo(B);
  assert.ok(!('terrain' in p) && !('base' in p) && Array.isArray(p.impacts));
});

group('pureté');
test('aucun hasard ni horloge dans les règles', () => {
  for (const f of ['bataille.js', 'terrain.js', 'army.js', 'champs.js', 'apparence.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|performance\.now|crypto\./.test(src), `${f} doit rester pur (section 10)`);
  }
});
