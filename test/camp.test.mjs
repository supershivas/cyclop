// Le camp : la dotation de l'aube, les chantiers d'une nuit, les refus à voix haute, la sauvegarde (lot 1 de docs/chantiers/camp-et-ameliorations.md).
import { nouvelleBataille, avancer, aube, photo, restaurer } from '../js/bataille.js';
import { campDeDepart, refusCamp, ordonnerChantier, dotationAube, niveauDe, coutDe, nuitsDe, choisis } from '../js/camp.js';
import { BATIMENTS, DOTATION } from '../js/data/batiments.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const petite = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6 });
const nuit = B => { while (B.etat.phase === 'jour') avancer(B); return aube(B); };

group('camp');
test('le premier matin : 3 points, l\'artillerie et la caserne au niveau 1, le reste à bâtir', () => {
  const B = petite(), c = B.etat.camp;
  assert.equal(c.dotation, DOTATION.depart);
  assert.deepEqual(Object.fromEntries(Object.keys(BATIMENTS).map(k => [k, niveauDe(B.etat, k)])), { artillerie: 1, aerodrome: 0, chars: 0, sapeurs: 0, caserne: 1 });
});
test('un ordre impossible se refuse à voix haute', () => {
  const B = petite(), e = B.etat;
  assert.match(refusCamp(e, 'cathedrale'), /n'existe pas/);
  e.camp.dotation = 1;
  assert.match(refusCamp(e, 'chars'), /2 points de dotation manquent/);
  e.camp.dotation = 0; assert.match(refusCamp(e, 'sapeurs'), /2 points de dotation manquent/);
  e.camp.dotation = 9;
  assert.match(refusCamp(e, 'artillerie'), /Choisissez/, 'le niveau 2 exige un choix');
  assert.equal(refusCamp(e, 'artillerie', 1), null);
  e.camp.batiments.caserne.niveau = 3; assert.match(refusCamp(e, 'caserne', 0), /niveau maximal/);
});
test('le chantier : payé tout de suite, fini à l\'aube, refusé pendant qu\'il dure', () => {
  const B = petite(), e = B.etat;
  assert.deepEqual(ordonnerChantier(e, 'chars'), { ok: true, vers: 1, nuits: 1 });
  assert.equal(e.camp.dotation, DOTATION.depart - coutDe('chars', 1));
  assert.equal(niveauDe(e, 'chars'), 0);
  assert.match(refusCamp(e, 'chars'), /en chantier/);
  assert.ok(ordonnerChantier(e, 'chars').refus, 'un second ordre est refusé');
  const dot = nuit(B).dotation;
  assert.deepEqual(dot.finis, [['chars', 1]]);
  assert.equal(niveauDe(e, 'chars'), 1);
  assert.equal(e.camp.batiments.chars.chantier, null);
});
test('le niveau 3 prend deux nuits, une seule avec « Équipe de nuit »', () => {
  const B = petite(), e = B.etat;
  assert.equal(nuitsDe(e, 2), 1); assert.equal(nuitsDe(e, 3), 2);
  e.camp.batiments.sapeurs = { niveau: 3, choix: [0, 1], chantier: null };
  assert.deepEqual(choisis(e, 'sapeurs'), ['Madriers taillés', 'Équipe de nuit']);
  assert.equal(nuitsDe(e, 3), 1);
});
test('la dotation de l\'aube : +1, +1 si nos lignes tiennent, +2 la première fois qu\'une ligne d\'en face est prise', () => {
  const B = petite(), e = B.etat, avant = e.camp.dotation;
  const d = dotationAube(B);
  assert.equal(d.aube, 1); assert.equal(d.tenue, DOTATION.tenue.points, 'nos lignes sont toutes à nous au départ'); assert.equal(d.lignes, 0);
  assert.equal(e.camp.dotation, avant + 2);
  // la 1re ligne d'en face passe à nous : +2, une seule fois
  B.troncons.forEach((tr, k) => { const L = B.lignes[tr.ligne]; if (L.camp !== 0 && L.rang === 0) e.troncons[k] = 0; });
  assert.equal(dotationAube(B).lignes, DOTATION.ligne);
  assert.equal(dotationAube(B).lignes, 0, 'la même ligne ne rapporte pas deux fois');
  assert.deepEqual(e.camp.lignes, [0]);
  // nos lignes tombent sous 75 % : plus de prime de tenue
  B.troncons.forEach((tr, k) => { if (B.lignes[tr.ligne].camp === 0) e.troncons[k] = 1; });
  assert.equal(dotationAube(B).tenue, 0);
});
test('l\'aube verse la dotation et la bataille en rend le détail', () => {
  const B = petite(), r = nuit(B);
  assert.ok(r.ok && r.dotation.points >= 1);
  assert.equal(B.etat.camp.dotation, DOTATION.depart + r.dotation.points);
});
test('relue au milieu d\'un chantier, la partie garde son camp, et relue après une nuit elle est la même partie', () => {
  const A = petite(7);
  ordonnerChantier(A.etat, 'aerodrome');
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.camp, A.etat.camp);
  assert.equal(B.etat.camp.batiments.aerodrome.chantier.vers, 1);
  for (const X of [A, B]) nuit(X);
  assert.deepEqual(B.etat.camp, A.etat.camp);
  assert.equal(niveauDe(B.etat, 'aerodrome'), 1);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(A)));
});
test('le niveau ne bride encore aucun ordre (lot 1) : un barrage de 220 part au premier matin', async () => {
  const { ordonnerBarrage } = await import('../js/bataille.js');
  const B = petite();
  assert.ok(ordonnerBarrage(B, '220', 300, 450).ok === true);
});
test('le camp de départ est neuf à chaque bataille (pas d\'état partagé)', () => {
  const a = campDeDepart(); a.batiments.chars.niveau = 2; a.lignes.push(0);
  assert.equal(campDeDepart().batiments.chars.niveau, 0); assert.deepEqual(campDeDepart().lignes, []);
});
