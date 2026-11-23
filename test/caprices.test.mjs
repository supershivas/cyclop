// Les caprices du front (v0.163.0) : un par jour, chacun forcé et son effet, le verrou de l'ordre absurde, la sauvegarde, les deux machines.
import { nouvelleBataille as nb, avancer, photo, restaurer, zone, ordonnerMarche, NOUS, EUX } from '../js/bataille.js';
import { CAPRICES } from '../js/data/caprices.js';
import { forcerCaprice, capriceDuJour, obscuriteCaprice, positionGaz } from '../js/caprices.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('caprices');
const nouvelle = (g = 7, o = {}) => nb(g, R, { soldats: 600, premierFixe: true, camp: true, ...o });
const pas = (B, n) => { const ev = []; for (let k = 0; k < n && B.etat.phase === 'jour'; k++) ev.push(...avancer(B)); return ev; };

test('un caprice par jour, tiré de la graine ; sans caprices (opts), la bataille n\'en a pas', () => {
  const B = nouvelle(5);
  const ev = pas(B, 30 * 300);
  assert.equal(ev.filter(e => e.type === 'caprice').length, 1);
  assert.equal(B.etat.caprices.histo.length, 1);
  assert.equal(B.etat.caprices.histo[0][1], capriceDuJour(5, 1).id);
  const S = nouvelle(5, { caprices: false });
  pas(S, 30 * 300);
  assert.equal(S.etat.caprices, null);
});

test('le tirage sur 600 jours : chaque caprice tombe, les communs plus souvent que les mythiques', () => {
  const n = {};
  for (let j = 1; j <= 600; j++) { const id = capriceDuJour(3, j).id; n[id] = (n[id] ?? 0) + 1; }
  for (const K of CAPRICES) assert.ok(n[K.id] > 0, K.id);
  assert.ok(n.tirCourt > n.eclipse && n.obusPerdus > n.seisme);
});

test('chacun des caprices forcé fait ce qu\'il dit, sans erreur', () => {
  for (const K of CAPRICES) {
    const B = nouvelle(9);
    pas(B, 30);
    const avant = { impacts: B.etat.impacts.length, chars: B.etat.chars.length, caisses: B.etat.largages.caisses.length, vols: B.etat.mitraillages.length };
    forcerCaprice(B, K.id, EUX);
    const ev = pas(B, 30 * 5);
    assert.ok(ev.some(e => e.type === 'caprice' && e.id === K.id), `${K.id} : tombé`);
    const a = B.etat.caprices.actif;
    if (K.id === 'tirCourt') assert.ok(B.etat.impacts.length > avant.impacts, 'des obus');
    if (K.id === 'obusPerdus') assert.ok(B.etat.impacts.length > avant.impacts + 2);
    if (K.id === 'heros') { assert.equal(a.ids.length, 2); assert.equal(B.etat.caprices.soldats.length, 2); }
    if (K.id === 'charsPerdus') assert.ok(B.etat.chars.length >= avant.chars + 1, 'un char au moins');
    if (K.id === 'pluieCaisses') assert.equal(B.etat.largages.caisses.length, avant.caisses + K.n);
    if (K.id === 'ordreAbsurde') { assert.equal(a.regs.length, 2); const reg = B.etat.regiments[a.regs[0]]; assert.ok(ordonnerMarche(B, [reg.id], reg.ordre.x, reg.ordre.y, 'bloc', reg.camp).refus, 'verrouillé'); }
    if (K.id === 'zeppelin') { pas(B, 30 * 30); assert.ok(ev.concat(pas(B, 30 * 20)).length >= 0 && B.etat.impacts.length > avant.impacts, 'des bombes'); }
    if (K.id === 'gaz') { const p0 = positionGaz(a, a.t0), p1 = positionGaz(a, B.etat.temps); assert.ok(p0.x !== p1.x || p0.y !== p1.y, 'il dérive'); }
    if (K.id === 'mine') assert.ok(B.etat.impacts.length >= avant.impacts + K.coups);
    if (K.id === 'as') { assert.ok(B.etat.mitraillages.length > avant.vols, 'il vole'); assert.ok(B.etat.mitraillages.some(v => v.k === -1)); }
    if (K.id === 'eclipse') assert.ok(obscuriteCaprice(B.etat) > 0.3);
    if (K.id === 'seisme') assert.ok(B.etat.impacts.length >= avant.impacts + K.coups * 0.8);
    pas(B, 30 * 30);
  }
});

test('une partie relue pendant un caprice (le gaz, les héros) reste la même partie', () => {
  for (const id of ['gaz', 'heros', 'as']) {
    const A = nouvelle(11);
    pas(A, 30);
    forcerCaprice(A, id, NOUS);
    pas(A, 30 * 4);
    const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
    for (let k = 0; k < 30 * 15; k++) { avancer(A); avancer(B); }
    assert.equal(empreinteEtat(B), empreinteEtat(A), id);
    assert.deepEqual(JSON.parse(JSON.stringify(B.etat.caprices)), JSON.parse(JSON.stringify(A.etat.caprices)));
  }
});

test('à deux : les deux machines vivent le même caprice', () => {
  const [A, B] = [nouvelle(13, { deux: true }), nouvelle(13, { deux: true })];
  for (let k = 0; k < 30 * 280; k++) { avancer(A); avancer(B); }
  assert.equal(A.etat.caprices.histo.length, 1);
  assert.equal(empreinteEtat(A), empreinteEtat(B));
});
