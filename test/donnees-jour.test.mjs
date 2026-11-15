// La lecture des données d'une journée (js/donnees-jour.js) : une vraie bataille, les totaux justes, les faits marquants.
import { nouvelleBataille, avancer, aube, instantane, photo, restaurer } from '../js/bataille.js';
import { lireJournee, faitsMarquants, lireBataille } from '../js/donnees-jour.js';
import { noterMoments, jourVide } from '../js/moments.js';
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

// Les moments clés (v0.134.0) : des compteurs par jour, tirés des événements ; la bataille entière pour la fin de partie
test('les moments : un compte par jour et par camp, sans trou, les déroutes au régiment', () => {
  const etat = { jour: 3, moments: [], regiments: [{ id: 0 }, { id: 1 }] };
  noterMoments(etat, [{ type: 'deroute', camp: 0, reg: 1 }, { type: 'char-detruit', camp: 1 }, { type: 'pont-coupe' }, { type: 'impact' }, { type: 'assaut', camp: 1 }]);
  assert.equal(etat.moments.length, 3);
  assert.deepEqual(etat.moments[0], jourVide());
  const m = etat.moments[2];
  assert.deepEqual([m.deroutes, m.chars, m.ponts, m.assauts], [[1, 0], [0, 1], [1, 0], [0, 1]]);
  assert.equal(etat.regiments[1].deroutes, 1);
  assert.equal(etat.regiments[0].deroutes, undefined);
});
test('la bataille entière : un jour par jour joué, nos morts justes, les moments se relisent à l\'identique', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  for (let k = 0; k < 400; k++) avancer(B);
  B.etat.phase = 'nuit'; aube(B);
  for (let k = 0; k < 200; k++) avancer(B);
  const avant = JSON.stringify(B.etat), F = lireBataille(B);
  assert.equal(JSON.stringify(B.etat), avant, 'lire ne change rien');
  assert.equal(F.jours, 2);
  assert.equal(F.moments.length, 2);
  assert.equal(F.tenus.length, 2);
  assert.equal(F.camps[0].mortsParJour.slice(0, 2).reduce((a, b) => a + b, 0), B.etat.pertes[0]);
  for (const t of F.tenus) assert.equal(t[0] + t[1], F.total);
  const C = restaurer(photo(B), R);
  assert.deepEqual(C.etat.moments, B.etat.moments);
  for (let k = 0; k < 120; k++) { avancer(B); avancer(C); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(C)));
});
test('les médailles de la bataille : les nouvelles (roc, inébranlable, survivant) ne viennent qu\'avec la bataille entière', async () => {
  const { palmares } = await import('../js/hud/medailles.js');
  const B = nouvelleBataille(3, R, { soldats: 800, jours: 3 });
  for (let k = 0; k < 2000; k++) avancer(B);
  B.etat.phase = 'nuit'; aube(B);
  for (let k = 0; k < 1500; k++) avancer(B);
  const jour = palmares(B, 0, 'jour'), tout = palmares(B, 0, 'total'), cles = l => l.map(m => m.cle);
  assert.ok(!cles(jour.regiments).includes('roc') && !jour.engins.length);
  assert.ok(cles(tout.regiments).includes('inebranlable'));
  assert.ok(cles(tout.soldats).includes('survivant'));
  for (const m of [...tout.regiments, ...tout.soldats, ...tout.engins]) assert.ok(m.titre && m.nom && m.detail && m.cle);
});
