// Le jeu à deux (v0.115.0) : les réglages de la partie et le duel aux points.
import { nouvelleBataille, avancer, aube, photo, restaurer, scoreDuel, progressionMission, bordereau, ticksParJour, ecartDuel } from '../js/bataille.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { DEFAUTS_DEUX, DUREES_DEUX, RENFORTS_DEUX, optionsDeuxValides, optionsDeuxEnBataille, DUEL } from '../js/data/deux.js';

const partie = (opts = {}, graine = 7) => nouvelleBataille(graine, R, { soldats: 200, deux: true, camp: true, ...optionsDeuxEnBataille({ ...DEFAUTS_DEUX, ...opts }) });
const jusquAuSoir = B => { const n = ticksParJour(R); for (let k = 0; k < n + 5 && B.etat.phase === 'jour'; k++) avancer(B); };

group('jeu à deux — les réglages');
test('les défauts sont valides ; une clé inconnue ou une valeur absente est refusée', () => {
  assert.ok(optionsDeuxValides(DEFAUTS_DEUX));
  assert.ok(!optionsDeuxValides({ ...DEFAUTS_DEUX, duree: 'infinie' }));
  assert.ok(!optionsDeuxValides({ ...DEFAUTS_DEUX, renforts: undefined }));
  assert.ok(!optionsDeuxValides(null));
});
test('la durée, les renforts, la dotation et les effectifs choisis se retrouvent dans la bataille, pour les deux camps', () => {
  const B = partie({ duree: 'moyenne', renforts: 'peu', dotation: 'large', effectifs: 'petits' });
  const ref = nouvelleBataille(7, R, { deux: true, camp: true });
  assert.equal(B.etat.meteo.length, DUREES_DEUX.moyenne.jours);
  assert.deepEqual(B.etat.reserves, [RENFORTS_DEUX.peu.n, RENFORTS_DEUX.peu.n]);
  assert.equal(B.etat.camp.dotation, 2 * ref.etat.camp.dotation);
  assert.equal(B.etat.campEux.dotation, 2 * ref.etat.camp.dotation);
  assert.equal(B.etat.mult ?? B.etat.camp.mult, 2);
  assert.equal(nouvelleBataille(7, R, { deux: true, camp: true, ...optionsDeuxEnBataille({ effectifs: 'petits' }) }).etat.parCamp, Math.round(ref.etat.parCamp * 0.5));
});
test('« renforts du secteur » et « durée longue » laissent le secteur décider', () => {
  const B = partie({ duree: 'longue', renforts: 'secteur' }), ref = nouvelleBataille(7, R, { deux: true, camp: true });
  assert.equal(B.etat.meteo.length, ref.etat.meteo.length);
  assert.deepEqual(B.etat.reserves, ref.etat.reserves);
});
test('deux machines avec les mêmes réglages calculent la même bataille', () => {
  const a = partie({ renforts: 'aucun', dotation: 'faible' }), b = partie({ renforts: 'aucun', dotation: 'faible' });
  for (let k = 0; k < 400; k++) { avancer(a); avancer(b); }
  assert.equal(empreinteEtat(a), empreinteEtat(b));
});

group('jeu à deux — le duel aux points');
test('la mission est le duel, sans missions secondaires ni bordereau du Mémorial', () => {
  const B = partie();
  assert.equal(B.etat.mission, 'duel');
  assert.deepEqual(B.etat.secondaires, []);
  assert.equal(bordereau(B).total, 0);
});
test('le score vient des tranchées d\'en face tenues au soir et des pertes d\'en face', () => {
  const B = partie();
  assert.deepEqual(scoreDuel(B), [0, 0]);
  B.etat.pointsPrise = [4, 1]; B.etat.pertes = [0, 3 * DUEL.pertesPour];
  assert.deepEqual(scoreDuel(B), [7, 1]);
  B.etat.pertes = [2 * DUEL.pertesPour, 0];
  assert.deepEqual(scoreDuel(B), [4, 3]);
});
test('chaque camp voit son score en premier, et la jauge penche de son côté', () => {
  const B = partie({ anticipee: 'non' }); B.etat.pointsPrise = [10, 0];
  assert.ok(progressionMission(B, 0).p > 0.5 && progressionMission(B, 1).p < 0.5);
  assert.match(progressionMission(B, 1).label, /^0 \/ 10$/);
});
test('au terme, le meilleur score gagne ; l\'égalité est un match nul', () => {
  const nul = partie({ duree: 'courte', anticipee: 'non' }); nul.etat.jour = nul.etat.meteo.length; jusquAuSoir(nul);
  assert.equal(nul.etat.phase, 'fin');
  assert.equal(nul.etat.issue.nul, nul.etat.issue.gagnant === null);
  const bleu = partie({ duree: 'courte', anticipee: 'non' }); bleu.etat.jour = bleu.etat.meteo.length; bleu.etat.pointsPrise = [9, 2]; jusquAuSoir(bleu);
  assert.equal(bleu.etat.issue.gagnant, 0); assert.equal(bleu.etat.issue.reussie, true);
  const kaki = partie({ duree: 'courte', anticipee: 'non' }); kaki.etat.jour = kaki.etat.meteo.length; kaki.etat.pointsPrise = [1, 30]; jusquAuSoir(kaki);
  assert.equal(kaki.etat.issue.gagnant, 1); assert.equal(kaki.etat.issue.reussie, false);
});
test('la victoire anticipée : assez d\'avance au soir finit la bataille avant son terme, si elle est permise', () => {
  const avec = partie({ duree: 'moyenne', anticipee: 'oui' }); avec.etat.pointsPrise = [0, ecartDuel(6)]; jusquAuSoir(avec);
  assert.equal(avec.etat.phase, 'fin'); assert.equal(avec.etat.issue.gagnant, 1); assert.ok(avec.etat.jour < avec.etat.meteo.length);
  const sans = partie({ duree: 'moyenne', anticipee: 'non' }); sans.etat.pointsPrise = [0, ecartDuel(6)]; jusquAuSoir(sans);
  assert.equal(sans.etat.phase, 'nuit');
});
test('l\'avance qui finit un duel croît avec les jours, puis plafonne', () => {
  assert.equal(ecartDuel(3), 3 * DUEL.ecartParJour); assert.equal(ecartDuel(15), DUEL.ecartMax); assert.ok(ecartDuel(1) < ecartDuel(2));
});
test('un camp sans plus un homme perd aussitôt, quel que soit son camp', () => {
  for (const camp of [0, 1]) {
    const B = partie({ anticipee: 'non' });
    for (const r of B.etat.regiments) if (r.camp === camp) r.effectif = 0;
    for (let k = 0; k < 40 && B.etat.phase === 'jour'; k++) avancer(B);
    assert.equal(B.etat.phase, 'fin', `camp ${camp}`);
    assert.equal(B.etat.issue.gagnant, 1 - camp);
  }
});
test('une partie à deux relue au milieu, puis après une nuit, est la même', () => {
  const B = partie({ duree: 'moyenne' }); jusquAuSoir(B);
  const b = restaurer(photo(B), R);
  assert.equal(empreinteEtat(b), empreinteEtat(B));
  assert.deepEqual(b.etat.pointsPrise, B.etat.pointsPrise);
  if (B.etat.phase === 'nuit') { aube(B, {}); aube(b, {}); }
  for (let k = 0; k < 300; k++) { avancer(B); avancer(b); }
  assert.equal(empreinteEtat(b), empreinteEtat(B));
});
