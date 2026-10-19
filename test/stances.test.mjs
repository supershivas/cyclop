// Les stances (lot 1, logique) : une posture par régiment, qui change la portée, la précision et la cadence du tir.
// La référence « sans stance » a été relevée sur le code d'avant le lot : l'ordre des tirages n'a pas bougé.
import { nouvelleBataille, avancer, ordonnerMarche, photo, restaurer, zone, peutStance, ordonnerStance } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { creerTerrain } from '../js/terrain.js';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, chanceTir } from '../js/army.js';
import { createRng } from '../js/lib/rng.js';
import { STANCES } from '../js/data/stances.js';
import { REGLAGES as R } from '../js/data/reglages.js';

// Tous nos régiments à l'assaut de la 1re ligne d'en face, 4 500 pas (150 s) : le combat a lieu (60 à 80 morts de chez nous)
function assaut(graine, Rj = R, avant = null) {
  const B = nouvelleBataille(graine, Rj, { soldats: 400, jours: 3 });
  const L = B.lignes.find(l => l.camp === 1 && l.rang === 0), Z = zone(B), x = Z.x0 + 200;
  ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).map(r => r.id), x, ligneY(L, x));
  if (avant) avant(B);
  for (let k = 0; k < 4500; k++) avancer(B);
  return B;
}
const bilan = B => ({ pertes: B.etat.pertes, blesses: B.etat.blesses, rng: B.etat.rng, emp: empreinteEtat(B) });

group('stances — rien ne bouge sans elles');
const REFERENCE = {            // relevé sur le code d'avant les stances (pertes, blessés, hasard) ; l'empreinte, relevée à la v0.36.0, y ajoute la posture
  3: { pertes: [62, 4], blesses: [39, 4], rng: 1162883254, emp: 'd4ac213' },
  7: { pertes: [57, 5], blesses: [47, 3], rng: 2535038889, emp: 'e738935e' },
  8: { pertes: [77, 3], blesses: [45, 4], rng: 271952004, emp: 'dcf4ff3a' },
};
for (const g of [3, 7, 8]) {
  test(`sans stance, mêmes morts, mêmes blessés, même hasard qu'avant (graine ${g})`, () => {
    assert.deepEqual(bilan(assaut(g)), REFERENCE[g]);
  });
}
test('« retenu » réglé comme « volonté » ne change rien : le filtre n\'ajoute aucun tirage', () => {
  const Rn = structuredClone(R); Rn.stance.retenu = { ...Rn.stance.volonte };
  const B = assaut(3, Rn, b => ordonnerStance(b, b.etat.regiments.filter(r => r.camp === 0).map(r => r.id), 'retenu'));
  assert.deepEqual(bilan(B), REFERENCE[3]);
  assert.equal(B.etat.regiments[0].stance, 'retenu');
});

group('stances — la règle de tir');
test('chaque posture est une donnée : un nom, un mot court, une phrase, et ses nombres', () => {
  for (const id of ['volonte', 'retenu']) {
    assert.ok(STANCES[id].nom && STANCES[id].court && STANCES[id].dit, id);
    for (const k of ['portee', 'precision', 'periode']) assert.equal(typeof R.stance[id][k], 'number', `${id}.${k}`);
  }
  assert.deepEqual(R.stance.volonte, { portee: 1, precision: 1, periode: 1 });
  assert.ok(R.stance.retenu.portee < 1 && R.stance.retenu.precision > 1);
});
test('la chance de toucher : celle d\'avant en volonté, plus haute en retenu', () => {
  const avant = (bestN, exp) => R.tir.precision * Math.min(1, bestN / R.tir.densite) * (1 + R.experience.adresse * exp);
  assert.equal(chanceTir(R, 'volonte', 4, 0.3), avant(4, 0.3));
  assert.equal(chanceTir(R, undefined, 4, 0.3), avant(4, 0.3), 'un régiment sans posture tire à volonté');
  assert.ok(Math.abs(chanceTir(R, 'retenu', 4, 0.3) - avant(4, 0.3) * R.stance.retenu.precision) < 1e-12);
});
// un tireur du camp 0 regarde vers le nord (y décroît) ; un ennemi à `d` mètres devant lui
function face(stance, d, Rj = R) {
  const T = creerTerrain(1, { largeur: 128, hauteur: 128, arbres: 0 }, Rj);
  T.base.fill(20); T.nappe.fill(-20); T.humid.fill(0.1);
  const A = creerArmee({ capacite: 8, W: T.W, H: T.H });
  ajouterSoldat(A, 40.5, 100.5, 0, 0, 0, 0.5);
  ajouterSoldat(A, 40.5, 100.5 - d, 1, 1, 0, 0.5);
  A.tirT[0] = 0; A.tirT[1] = 1e9;
  const regiments = [
    { id: 0, camp: 0, effectif: 1, stance, ordre: { x: 40.5, y: 100.5, fx: 0, fy: -1, cols: 1, esp: 2 } },
    { id: 1, camp: 1, effectif: 1, ordre: { x: 40.5, y: 100.5 - d, fx: 0, fy: 1, cols: 1, esp: 2 } },
  ];
  const tirs = [];
  const ctx = { T, R: Rj, regiments, champDe: () => null, rng: createRng(1), dt: 1 / 30, gel: false, frapper: () => {}, faces: [], tir: (...a) => tirs.push(a) };
  construireGrille(A); pasArmee(A, ctx);
  return { A, tirs };
}
test('en retenu, on n\'ouvre pas le feu à 50 m (ni fatigue ni expérience), à volonté si', () => {
  const v = face('volonte', 50), r = face('retenu', 50);
  assert.equal(v.tirs.length, 1); assert.ok(v.A.fatB[0] > 0 && v.A.exp[0] > 0);
  assert.equal(r.tirs.length, 0); assert.equal(r.A.fatB[0], 0); assert.equal(r.A.exp[0], 0);
});
test('en retenu, on tire à 30 m', () => {
  const r = face('retenu', 30);
  assert.equal(r.tirs.length, 1); assert.ok(r.A.fatB[0] > 0);
});
test('la cadence suit la posture : le délai avant le tir suivant est multiplié', () => {
  const Rl = structuredClone(R); Rl.stance.retenu.periode = 2;
  const v = face('volonte', 30, Rl).A.tirT[0], r = face('retenu', 30, Rl).A.tirT[0];
  assert.ok(v > 0);
  assert.equal(r, v * 2);
});

group('stances — les ordres');
const petite = (g = 3) => nouvelleBataille(g, R, { soldats: 200, jours: 3 });
test('un régiment naît à volonté ; on le met en retenu, et on le remet', () => {
  const B = petite();
  assert.ok(B.etat.regiments.every(r => r.stance === 'volonte'));
  assert.equal(peutStance(B, [0, 1], 'retenu').ok, true);
  assert.equal(B.etat.regiments[0].stance, 'volonte', 'l\'ordre à sec ne change rien');
  const r = ordonnerStance(B, [0, 1], 'retenu');
  assert.deepEqual(r.regiments, [0, 1]);
  assert.equal(B.etat.regiments[1].stance, 'retenu'); assert.equal(B.etat.regiments[2].stance, 'volonte');
  ordonnerStance(B, [0], 'volonte');
  assert.equal(B.etat.regiments[0].stance, 'volonte');
});
test('un ordre de posture impossible se refuse, avec sa raison', () => {
  const B = petite(), E = B.etat.regiments.find(r => r.camp === 1);
  assert.match(ordonnerStance(B, [0], 'baionnette').refus, /posture/i);
  assert.match(ordonnerStance(B, [], 'retenu').refus, /Aucun régiment/);
  assert.match(ordonnerStance(B, [E.id], 'retenu').refus, /Aucun régiment/, 'pas le régiment d\'un autre camp');
  B.etat.regiments[2].deroute = true;
  const d = ordonnerStance(B, [2], 'retenu');
  assert.match(d.refus, /déroute/); assert.equal(B.etat.regiments[2].stance, 'volonte');
  const m = ordonnerStance(B, [0, 2], 'retenu');
  assert.deepEqual(m.regiments, [0]); assert.match(m.refus, /déroute/, 'les autres obéissent, le refus est dit');
  B.etat.phase = 'nuit';
  assert.match(ordonnerStance(B, [0], 'retenu').refus, /nuit/i);
});
test('un ordre de marche remet le régiment à volonté (la posture est une consigne de place)', () => {
  const B = petite(), Z = zone(B);
  ordonnerStance(B, [0, 1], 'retenu');
  ordonnerMarche(B, [0], Z.x0 + 100, Z.y0 + 150);
  assert.equal(B.etat.regiments[0].stance, 'volonte');
  assert.equal(B.etat.regiments[1].stance, 'retenu', 'les autres gardent la leur');
});
test('un ordre de marche refusé laisse la posture', () => {
  const B = petite(), Z = zone(B);
  ordonnerStance(B, [0], 'retenu');
  B.etat.regiments[0].deroute = true;
  assert.ok(ordonnerMarche(B, [0], Z.x0 + 100, Z.y0 + 150).refus);
  assert.equal(B.etat.regiments[0].stance, 'retenu');
});

group('stances — la sauvegarde');
test('la posture est gardée, et la partie relue au milieu reste la même', () => {
  const A = petite(11);
  ordonnerStance(A, [0, 3], 'retenu');
  for (let k = 0; k < 450; k++) avancer(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.equal(B.etat.regiments[3].stance, 'retenu');
  assert.equal(empreinteEtat(B), empreinteEtat(A));
  for (let k = 0; k < 600; k++) { avancer(A); avancer(B); }
  assert.equal(empreinteEtat(B), empreinteEtat(A));
  assert.deepEqual(B.etat.pertes, A.etat.pertes);
});
test('une partie d\'avant les stances se relit à volonté', () => {
  const A = petite(11);
  for (let k = 0; k < 300; k++) avancer(A);
  const p = JSON.parse(JSON.stringify(photo(A)));
  for (const r of p.regiments) delete r.stance;
  const B = restaurer(p, R);
  assert.ok(B.etat.regiments.every(r => r.stance === 'volonte'));
  assert.equal(empreinteEtat(B), empreinteEtat(A));
});
