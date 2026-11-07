// La lecture des données d'une journée (js/donnees-jour.js) : une vraie bataille, les totaux justes, les faits marquants.
import { nouvelleBataille, avancer } from '../js/bataille.js';
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
