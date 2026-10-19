// La campagne, lot 1 : l'identité portable. Deux batailles d'une même campagne (graines de terrain différentes) donnent
// les mêmes noms à nos hommes ; la graine de la bataille n'en décide plus. Hors campagne, rien ne change.
import { nouvelleBataille, avancer, ordonnerMarche, photo, restaurer, zone } from '../js/bataille.js';
import { quiEst } from '../js/hud/lecture.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const bat = (graine, opts = {}) => nouvelleBataille(graine, R, { soldats: 200, jours: 3, ...opts });
const jouer = (B, n = 300) => { ordonnerMarche(B, [0, 1], zone(B).x0 + 150, zone(B).y0 + 150); for (let k = 0; k < n; k++) avancer(B); return B; };
const sansIdentite = B => { const p = photo(B); delete p.graineIdentite; return JSON.stringify(p); };

group('campagne — identité portable');
test('par défaut, la graine d\'identité est celle de la bataille', () => {
  assert.equal(bat(3).etat.graineIdentite, 3);
  assert.equal(bat(0).etat.graineIdentite, 0);
  assert.equal(JSON.stringify(photo(bat(3))), JSON.stringify(photo(bat(3, { graineIdentite: 3 }))));
});
test('la graine d\'identité ne change ni le terrain, ni la météo, ni les tirages, ni la partie', () => {
  const a = jouer(bat(3)), b = jouer(bat(3, { graineIdentite: 99 }));
  assert.equal(b.etat.graineIdentite, 99);
  assert.equal(sansIdentite(a), sansIdentite(b));
  assert.equal(a.etat.rng, b.etat.rng);
  assert.equal(empreinteEtat(a), empreinteEtat(b));
});
test('deux batailles d\'une même campagne : mêmes noms chez nous au même numéro, terrain et météo différents', () => {
  const a = bat(3, { graineIdentite: 11 }), b = bat(7, { graineIdentite: 11 });
  assert.notDeepEqual(a.etat.meteo.concat(a.etat.previsions), b.etat.meteo.concat(b.etat.previsions));
  for (let id = 0; id < 100; id++) assert.deepEqual(quiEst(a, id).qui, quiEst(b, id).qui, `n° ${id}`);
  // sans campagne, deux graines donnent d'autres hommes
  const c = bat(3), d = bat(7);
  assert.ok(Array.from({ length: 100 }, (_, id) => quiEst(c, id).qui.nom !== quiEst(d, id).qui.nom).filter(Boolean).length > 50);
});
test('en face, les hommes sont ceux de la bataille : d\'une bataille à l\'autre ce sont d\'autres hommes', () => {
  const a = bat(3, { graineIdentite: 11 }), b = bat(7, { graineIdentite: 11 }), A = a.armee;
  let differents = 0, n = 0;
  for (let i = 0; i < A.n; i++) {
    if (A.camp[i] !== 1) continue;
    n++;
    const x = quiEst(a, A.id[i]), y = quiEst(b, A.id[i]);
    assert.equal(x.reg.camp, 1);
    if (x.qui.nom !== y.qui.nom) differents++;
  }
  assert.ok(n > 50 && differents > n * 0.7, `${differents}/${n}`);
});
test('relue au milieu : la graine d\'identité est gardée, les noms aussi', () => {
  const B = jouer(bat(3, { graineIdentite: 11 }), 200), C = restaurer(JSON.parse(JSON.stringify(photo(B))), R);
  assert.equal(C.etat.graineIdentite, 11);
  for (let id = 0; id < 100; id++) assert.deepEqual(quiEst(C, id).qui, quiEst(B, id).qui);
  for (let k = 0; k < 200; k++) { avancer(B); avancer(C); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(C)));
});
