// Le camp : la dotation de l'aube, les chantiers d'une nuit, les refus à voix haute, la sauvegarde (lot 1 de docs/chantiers/camp-et-ameliorations.md).
import { nouvelleBataille, avancer, aube, photo, restaurer, ordonnerBarrage } from '../js/bataille.js';
import { campDeDepart, refusOrdre, refusNid, emprisesCamp, batimentSous, refusCamp, ordonnerChantier, dotationAube, niveauDe, coutDe, nuitsDe, choisis } from '../js/camp.js';
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
  assert.equal(refusCamp(e, 'artillerie'), null, 'sans choix d\'amélioration au lot 2 (leurs effets viennent au lot 3)');
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

const bridee = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6, camp: true });
test('partie bridée : un barrage de 155 est refusé tant que l\'artillerie est au niveau 1, et s\'ouvre au niveau 2', () => {
  const B = bridee();
  assert.ok(B.etat.camp.bride);
  assert.equal(ordonnerBarrage(B, '75', 300, 450).ok, true);
  assert.match(ordonnerBarrage(B, '155', 300, 450).refus, /niveau 2/);
  assert.match(ordonnerBarrage(B, '220', 300, 450).refus, /niveau 3/);
  B.etat.camp.batiments.artillerie.niveau = 2;
  assert.equal(ordonnerBarrage(B, '155', 300, 450).ok, true);
});
test('partie bridée : l\'avion, le char et le génie demandent leur bâtiment, dit à voix haute', () => {
  const B = bridee();
  for (const [cal, nom] of [['avion', /aérodrome n'est pas encore bâti/], ['char', /parc des chars n'est pas encore bâti/], ['genie', /maison des sapeurs n'est pas encore bâti/]]) assert.match(ordonnerBarrage(B, cal, 300, 450).refus, nom);
  ordonnerChantier(B.etat, 'chars');
  assert.match(refusOrdre(B.etat, 0, 'char'), /en chantier/);
  nuit(B);
  assert.equal(refusOrdre(B.etat, 0, 'char'), null);
});
test('partie bridée : refaire un nid demande les sapeurs au niveau 2 ; en face n\'est jamais bridé', () => {
  const B = bridee();
  B.etat.camp.batiments.sapeurs.niveau = 1;
  assert.match(refusNid(B.etat, 0), /niveau 2/);
  B.etat.camp.batiments.sapeurs.niveau = 2; assert.equal(refusNid(B.etat, 0), null);
  assert.equal(refusOrdre(B.etat, 1, 'char'), null);
});
test('par défaut (tests, labo, jeu à deux) rien n\'est bridé', () => {
  assert.equal(petite().etat.camp.bride, false);
  assert.equal(refusOrdre(petite().etat, 0, 'char'), null);
});
test('le camp est dans la marge arrière, derrière notre 4e ligne, sans que deux bâtiments se touchent, et un point le retrouve', () => {
  const B = bridee(), e = B.etat;
  e.camp.batiments.chars.niveau = 1; e.camp.batiments.aerodrome.chantier = { vers: 1, nuits: 1, choix: null }; e.camp.batiments.sapeurs.niveau = 1;
  const em = emprisesCamp(e);
  assert.equal(em.length, 5);
  const quatrieme = e.marges.y + 278;
  for (const b of em) assert.ok(b.y - b.d / 2 > quatrieme + 40 && b.y + b.d / 2 < e.marges.y + 300 + e.marges.y, `${b.cle} derrière la 4e ligne, dans le terrain`);
  for (const a of em) for (const b of em) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 + 4 || Math.abs(a.y - b.y) >= (a.d + b.d) / 2, `${a.cle} et ${b.cle} se chevauchent`);
  for (const b of em) { assert.equal(batimentSous(e, b.x, b.y), b.cle); assert.ok(b.x - b.w / 2 >= 0 && b.x + b.w / 2 <= 2 * e.marges.x + 400); }
  assert.equal(batimentSous(e, 10, 10), null);
  e.camp.batiments.chars.niveau = 0;
  assert.ok(!emprisesCamp(e).some(b => b.cle === 'chars'), 'un bâtiment à bâtir n\'a pas d\'emprise');
});
test('une partie bridée relue est la même partie, camp compris', () => {
  const A = bridee(8); ordonnerChantier(A.etat, 'sapeurs'); nuit(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.camp, A.etat.camp); assert.ok(B.etat.camp.bride);
  assert.match(ordonnerBarrage(B, '155', 300, 450).refus, /niveau 2/);
});
