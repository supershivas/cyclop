// La lecture des données d'une journée (js/donnees-jour.js) : une vraie bataille, les totaux justes, les faits marquants.
import { nouvelleBataille, avancer, aube, instantane, photo, restaurer } from '../js/bataille.js';
import { lireJournee, faitsMarquants } from '../js/donnees-jour.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('donnees-jour');
test('les effectifs lus s\'ajoutent : debout + blessés + morts + évacués = l\'effectif de départ', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  for (let k = 0; k < 600; k++) avancer(B);
  const d = lireJournee(B);
  for (const c of d.camps) {
    assert.equal(c.debout + c.blesses + c.morts + c.evacues, c.initial);
    assert.equal(c.regiments.length, 8);
    assert.equal(c.mortsParJour.length, d.jour);
  }
  assert.equal(d.camps[0].morts, B.etat.pertes[0]);
});
test('lire ne change rien à la bataille', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  for (let k = 0; k < 200; k++) avancer(B);
  const avant = JSON.stringify(B.etat);
  lireJournee(B);
  assert.equal(JSON.stringify(B.etat), avant);
});
test('les faits marquants : toujours au moins un, jamais plus que demandé', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  const f = faitsMarquants(lireJournee(B), 2);
  assert.ok(f.length >= 1 && f.length <= 2);
  assert.equal(f[0].genre, 'calme');
});

const sansHisto = B => { const p = photo(B); delete p.histo; return JSON.stringify(p); };
test('l\'historique : un instantané par soir, les totaux justes, sans doublon si la nuit est rejouée', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  for (let k = 0; k < 300; k++) avancer(B);
  B.etat.phase = 'nuit'; aube(B);
  assert.equal(B.etat.histo.length, 1);
  const h = B.etat.histo[0];
  assert.equal(h.jour, 1);
  assert.equal(h.regs.length, B.etat.regiments.length);
  for (const r of B.etat.regiments) { const [viv, bl, mo, mor] = h.regs[r.id]; assert.ok(bl <= viv && mo >= 0 && mor >= 0 && mor <= 100); }
  assert.deepEqual(h.pertes, B.etat.pertes);
  const n = B.etat.histo.length; B.etat.jour = 1; instantane(B);
  assert.equal(B.etat.histo.length, n, 'un soir déjà noté est remplacé, pas doublé');
});
test('l\'historique ne change pas la partie et se relit à l\'identique', () => {
  const a = nouvelleBataille(3, R, { soldats: 200, jours: 3 }), b = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  for (let k = 0; k < 300; k++) { avancer(a); avancer(b); if (k % 50 === 0) instantane(b); }
  assert.equal(sansHisto(a), sansHisto(b));
  b.etat.phase = 'nuit'; aube(b);
  const c = restaurer(photo(b), R);
  assert.deepEqual(c.etat.histo, b.etat.histo);
  for (let k = 0; k < 120; k++) { avancer(b); avancer(c); }
  assert.equal(JSON.stringify(photo(b)), JSON.stringify(photo(c)));
});
test('lireJournee lit l\'historique : effectifs et blessés de chaque jour', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  for (let k = 0; k < 400; k++) avancer(B);
  B.etat.phase = 'nuit'; aube(B);
  for (let k = 0; k < 200; k++) avancer(B);
  const d = lireJournee(B), n = d.camps[0];
  assert.equal(d.jour, 2);
  assert.equal(n.effectifParJour.length, 2);
  assert.equal(n.effectifParJour[1], n.debout + n.blesses);
  assert.equal(n.blessesParJour.reduce((a, b) => a + b, 0), B.etat.blesses[0]);
  for (const r of n.regiments) { assert.equal(r.historique.length, 2); assert.equal(r.historique[0].jour, 1); }
});
