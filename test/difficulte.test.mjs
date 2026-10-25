// Les niveaux de difficulté d'une partie (v0.70.0) : un profil de données qui ne change que l'adversaire.
import { nouvelleBataille, avancer, photo, restaurer, effectifs } from '../js/bataille.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { DIFFICULTES, DIFFICULTE_DEFAUT } from '../js/data/difficulte.js';
import { STANCES } from '../js/data/stances.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('difficulté — des données');
test('chaque niveau a un nom, une phrase, des forces, un rythme et une posture connue', () => {
  assert.ok(DIFFICULTES[DIFFICULTE_DEFAUT]);
  for (const [id, D] of Object.entries(DIFFICULTES)) {
    assert.ok(D.nom && D.desc, id);
    assert.ok(D.forces > 0 && D.ia.barrage > 0 && D.ia.offensive > 0, id);
    assert.ok(D.stance === '' || STANCES[D.stance], id);
  }
});

group('difficulté — le front ordinaire est la partie d\'avant');
test('sans niveau ou en « ordinaire », même effectif, même rythme, même hasard après 600 pas', () => {
  const a = nouvelleBataille(5, R, { soldats: 200, jours: 3 }), b = nouvelleBataille(5, R, { soldats: 200, jours: 3, difficulte: 'ordinaire' });
  assert.equal(a.etat.difficulte, 'ordinaire');
  assert.deepEqual(a.etat.iaRythme, { barrage: 1, offensive: 1 });
  assert.equal(a.etat.parCampEux, a.etat.parCamp);
  for (let k = 0; k < 600; k++) { avancer(a); avancer(b); }
  assert.equal(empreinteEtat(a), empreinteEtat(b));
  assert.equal(a.etat.rng, b.etat.rng);
});

group('difficulté — l\'adversaire change');
test('les forces, le rythme et la posture d\'en face suivent le niveau', () => {
  const calme = nouvelleBataille(5, R, { soldats: 200, jours: 3, difficulte: 'calme' }), dure = nouvelleBataille(5, R, { soldats: 200, jours: 3, difficulte: 'offensive' });
  assert.equal(calme.etat.parCampEux, Math.round(200 / 1.3));
  assert.equal(dure.etat.parCampEux, Math.round(200 / 0.8));
  assert.ok(effectifs(calme)[1] < effectifs(calme)[0] && effectifs(dure)[1] > effectifs(dure)[0]);
  assert.ok(calme.etat.iaRythme.barrage > 1 && dure.etat.iaRythme.barrage < 1);
  assert.equal(dure.etat.iaStance, 'retenu');
  assert.equal(calme.etat.iaStance, '');
});
test('en « grande offensive », ceux d\'en face qui tiennent leur tranchée sont en « retenu »', () => {
  const B = nouvelleBataille(5, R, { soldats: 200, jours: 3, difficulte: 'offensive' });
  for (let k = 0; k < 40; k++) avancer(B);
  assert.ok(B.etat.regiments.some(r => r.camp === 1 && r.stance === 'retenu'));
  assert.ok(B.etat.regiments.filter(r => r.camp === 0).every(r => r.stance !== 'retenu'));
});
test('la campagne l\'emporte : soldatsEux et iaRythme donnés ne sont pas touchés par le niveau', () => {
  const B = nouvelleBataille(5, R, { soldats: 200, jours: 3, difficulte: 'offensive', soldatsEux: 150, iaRythme: { barrage: 2, offensive: 3 } });
  assert.equal(B.etat.parCampEux, 150);
  assert.deepEqual(B.etat.iaRythme, { barrage: 2, offensive: 3 });
});
test('un niveau inconnu retombe sur « ordinaire »', () => {
  assert.equal(nouvelleBataille(5, R, { soldats: 200, jours: 3, difficulte: 'nimporte' }).etat.difficulte, 'ordinaire');
});

group('difficulté — la sauvegarde');
test('relue au milieu, une partie « grande offensive » est la même partie', () => {
  const a = nouvelleBataille(7, R, { soldats: 200, jours: 3, difficulte: 'offensive' });
  for (let k = 0; k < 500; k++) avancer(a);
  const b = restaurer(JSON.parse(JSON.stringify(photo(a))), R);
  assert.equal(b.etat.difficulte, 'offensive');
  assert.equal(b.etat.iaStance, 'retenu');
  for (let k = 0; k < 500; k++) { avancer(a); avancer(b); }
  assert.equal(empreinteEtat(a), empreinteEtat(b));
});
