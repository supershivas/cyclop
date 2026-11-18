// Le camp : la dotation du soir, les arbres (le I donné, deux pistes de quatre rangs), l'achat au clic rendu jusqu'à l'aube, les refus à voix haute, la sauvegarde (la soirée, troisième jet).
import { positionDe } from '../js/avions.js';
import { zone } from '../js/bataille.js';
import { nouvelleBataille as nouvelleBatailleLibre, avancer, aube, photo, restaurer, ordonnerBarrage } from '../js/bataille.js';
const nouvelleBataille = (graine, R, opts = {}) => nouvelleBatailleLibre(graine, R, { premierFixe: true, ...opts });   // le 1er jour est tiré au hasard en jeu : les tests de règles veulent le temps de départ de la saison
import { affecterGueris, patients, charsDispo, appliquerDepart, sortieChars, emplacementCamp, campDe, campDeDepart, modif, rechargeDe, pvAvion, refusOrdre, refusNid, emprisesCamp, batimentSous, niveauDe, dotationSoir, acheterRang, rendreRang, annulerSoir, refusRang, refusRendre, infanterie, renfortsDe } from '../js/camp.js';
import { ORDRE_ARBRES } from '../js/data/ameliorations.js';
import { CORVEES } from '../js/data/corvees.js';
import { BATIMENTS, DOTATION } from '../js/data/batiments.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { placesChars, placeAvion, parcChars } from '../js/camp.js';
import { ordonnerChar } from '../js/chars.js';
import { codeAvion, codeChar, REPARE_AVION } from '../js/genie.js';
import { pointRonde, demiRonde, longueurRonde, RONDE } from '../js/ronde.js';

const petite = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6 });
const nuit = B => { while (B.etat.phase === 'jour') avancer(B); return aube(B); };

group('camp');
const bridee = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6, camp: true });
const auSoir = B => { while (B.etat.phase === 'jour') avancer(B); return B; };
const r2 = (e, o, camp = 0) => [...campDe(e, camp).rangs[o]];
test('le premier matin : 0 point, tous les bâtiments au niveau I, aucun rang, rien acheté', () => {
  const B = bridee(), K = B.etat.camp;
  assert.equal(K.dotation, DOTATION.depart);
  for (const k of Object.keys(BATIMENTS)) assert.equal(niveauDe(B.etat, k), 1, k);
  for (const o of ORDRE_ARBRES) assert.deepEqual(K.rangs[o], [0, 0], o);
  assert.deepEqual(K.achats, []);
  const a = campDeDepart(); a.rangs.chars[0] = 2; a.lignes.push(0);
  assert.deepEqual(campDeDepart().rangs.chars, [0, 0], 'pas d\'état partagé'); assert.deepEqual(campDeDepart().lignes, []);
});
test('un achat impossible se refuse à voix haute : le jour, les points, le rang d\'avant, le lien, le bout de la piste', () => {
  const B = bridee(), e = B.etat;
  e.camp.dotation = 50;
  assert.match(refusRang(e, 'artillerie', 0), /le soir/);
  auSoir(B); e.camp.dotation = 1;
  assert.match(refusRang(e, 'artillerie', 0), /1 point de dotation manque/);
  assert.match(refusRang(e, 'artillerie', 9), /n'existe pas/);
  e.camp.dotation = 50;
  e.camp.rangs.artillerie[0] = 3;
  assert.match(refusRang(e, 'artillerie', 0), /demande d'abord « Observateurs » \(III, Aérodrome\)/, 'le lien croisé');
  e.camp.rangs.aerodrome[1] = 2; assert.equal(refusRang(e, 'artillerie', 0), null);
  e.camp.rangs.artillerie[0] = 4; assert.match(refusRang(e, 'artillerie', 0), /au bout/);
  assert.match(refusRang(petite().etat, 'artillerie', 0), /Pas de camp/);
});
test('acheter : acquis et payé au clic ; rendre le dernier de la piste, et avec lui ce qui en dépendait ; « Annuler » rend tout le soir', () => {
  const B = auSoir(bridee()), e = B.etat; e.camp.dotation = 30;
  assert.equal(acheterRang(e, 'artillerie', 0).ok, true);
  assert.equal(e.camp.dotation, 28); assert.equal(modif(e, 0, 'artillerie.dispersion'), 0.9, 'l\'effet est là tout de suite');
  acheterRang(e, 'artillerie', 0); acheterRang(e, 'aerodrome', 1); acheterRang(e, 'aerodrome', 1);
  assert.deepEqual(r2(e, 'artillerie'), [2, 0]); assert.equal(e.camp.dotation, 30 - 2 - 3 - 2 - 3);
  // Vol rasant (aérodrome, Observateurs V) demande Tables de tir (artillerie, Justesse III) : on monte, puis on rend Tables de tir
  e.camp.rangs.aerodrome[1] = 3; e.camp.dotation = 30;
  assert.equal(acheterRang(e, 'aerodrome', 1).ok, true);
  assert.match(refusRendre(e, 'artillerie', 1), /Rien n'a été acheté ce soir/);
  const r = rendreRang(e, 'artillerie', 0);
  assert.equal(r.ok, true); assert.deepEqual(r.rendus.map(x => x.join(':')), ['artillerie:0:1', 'aerodrome:1:3'], 'Vol rasant suit Tables de tir');
  assert.equal(e.camp.dotation, 30 - 5 + 3 + 5);
  const a = annulerSoir(e);
  assert.equal(a.ok, true); assert.deepEqual(r2(e, 'artillerie'), [0, 0]); assert.equal(e.camp.achats.length, 0);
  assert.match(annulerSoir(e).refus, /Rien n'a été acheté/);
});
test('l\'aube confirme les achats du soir : ils ne se rendent plus et leurs effectifs montent', () => {
  const B = auSoir(bridee()), e = B.etat; e.camp.dotation = 30;
  const avions = e.avions[0].length, reserves = e.reserves[0], sections = e.sapeurs[0], chars = e.charsDispo[0];
  acheterRang(e, 'aerodrome', 0); acheterRang(e, 'caserne', 0); acheterRang(e, 'sapeurs', 0); acheterRang(e, 'chars', 0);
  assert.equal(e.avions[0].length, avions, 'pas encore : l\'aube confirme');
  const d = aube(B);
  assert.equal(d.dotation.achetes.length, 4);
  assert.equal(e.avions[0].length, avions + 1); assert.equal(e.reserves[0], reserves + 2); assert.equal(e.sapeurs[0], sections + 2); assert.equal(e.charsDispo[0], chars + 1);
  assert.equal(niveauDe(e, 'aerodrome'), 2, 'le dessin suit les engins');
  auSoir(B); assert.match(refusRendre(e, 'aerodrome', 0), /l'aube a confirmé/);
});
test('la dotation du soir : +2, +1 si nos lignes tiennent, +2 la première fois qu\'une ligne d\'en face est prise', () => {
  const B = petite(), e = B.etat, avant = e.camp.dotation;
  const d = dotationSoir(B);
  assert.equal(d.base, 2); assert.equal(e.camp.soir.points, d.points); assert.equal(d.tenue, DOTATION.tenue.points); assert.equal(d.lignes, 0);
  assert.equal(e.camp.dotation, avant + 3);
  B.troncons.forEach((tr, k) => { const L = B.lignes[tr.ligne]; if (L.camp !== 0 && L.rang === 0) e.troncons[k] = 0; });
  assert.equal(dotationSoir(B).lignes, DOTATION.ligne);
  assert.equal(dotationSoir(B).lignes, 0, 'la même ligne ne rapporte pas deux fois');
  B.troncons.forEach((tr, k) => { if (B.lignes[tr.ligne].camp === 0) e.troncons[k] = 1; });
  assert.equal(dotationSoir(B).tenue, 0);
});
test('le soir verse la dotation ; l\'aube ne verse rien et rend le détail du soir', () => {
  const B = petite(), e = B.etat;
  auSoir(B);
  assert.ok(e.camp.soir.points >= 2 && e.camp.soir.jour === 1);
  assert.equal(e.camp.dotation, DOTATION.depart + e.camp.soir.points);
  const r = aube(B);
  assert.equal(e.camp.dotation, DOTATION.depart + r.dotation.soir.points);
});
test('relue au milieu d\'un soir d\'achats, la partie garde ses achats ; relue après l\'aube elle est la même partie', () => {
  const A = auSoir(bridee(11));
  A.etat.camp.dotation = 9; acheterRang(A.etat, 'aerodrome', 0); acheterRang(A.etat, 'artillerie', 1);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.camp, A.etat.camp); assert.deepEqual(B.etat.campEux, A.etat.campEux);
  assert.equal(rendreRang(B.etat, 'aerodrome', 0).ok, true, 'rendable après relecture'); acheterRang(B.etat, 'aerodrome', 0);
  for (const X of [A, B]) aube(X);
  assert.deepEqual(B.etat.camp, A.etat.camp);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(A)));
});
test('tout est prêt dès le premier matin : les calibres, l\'avion, le char et le génie ; refaire un nid demande « Chantier »', () => {
  const B = bridee();
  for (const cal of ['75', '155', '220', 'avion', 'char', 'genie']) assert.equal(refusOrdre(B.etat, 0, cal), null, cal);
  for (const cal of ['75', '155', '220']) assert.equal(ordonnerBarrage(B, cal, 300, 450).ok, true, `barrage de ${cal}`);
  assert.match(refusNid(B.etat, 0), /« Chantier » \(II, Sapeurs\)/);
  B.etat.camp.rangs.sapeurs[0] = 1; assert.equal(refusNid(B.etat, 0), null);
  assert.equal(petite().etat.camp.bride, false, 'par défaut (tests, labo, jeu à deux) rien n\'est bridé'); assert.equal(refusNid(petite().etat, 0), null);
});
test('le camp est dans la marge arrière, derrière notre 4e ligne, sans que deux bâtiments se touchent, et un point le retrouve', () => {
  const B = bridee(), e = B.etat;
  const em = emprisesCamp(e);
  assert.equal(em.length, 6);
  const quatrieme = e.marges.y + 278;
  for (const b of em) assert.ok(b.y - b.d / 2 > quatrieme + 30 && b.y + b.d / 2 < e.marges.y + 300 + e.marges.y, `${b.cle} derrière la 4e ligne, dans le terrain`);
  for (const a of em) for (const b of em) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 + 4 || Math.abs(a.y - b.y) >= (a.d + b.d) / 2, `${a.cle} et ${b.cle} se chevauchent`);
  for (const b of em) { assert.equal(batimentSous(e, b.x, b.y), b.cle); assert.ok(b.x - b.w / 2 >= 0 && b.x + b.w / 2 <= 2 * e.marges.x + 400); }
  assert.equal(batimentSous(e, 10, 10), null);
});
test('le départ de la partie bridée : 2 régiments frais, 2 sections, 2 chars et 3 avions (le niveau I)', () => {
  const B = bridee();
  assert.deepEqual(B.etat.reserves, [2, 2]); assert.equal(B.etat.sapeurs[0], 2); assert.deepEqual(B.etat.avions[0], [100, 100, 100]); assert.equal(B.etat.charsDispo[0], 2);
  assert.deepEqual(B.etat.avions[1], [100, 100, 100], 'en face part du même camp');
  assert.deepEqual(petite().etat.reserves, [4, 4], 'hors partie bridée, rien ne change');
});
test('modif : le produit des rangs acquis de l\'onglet, 1 pour un autre camp et hors partie bridée ; la recharge suit le parc', () => {
  const B = bridee(), e = B.etat;
  e.camp.rangs.artillerie = [2, 1];
  assert.ok(Math.abs(modif(e, 0, 'artillerie.dispersion') - 0.81) < 1e-9); assert.equal(modif(e, 0, 'artillerie.recharge'), 0.9);
  assert.equal(modif(e, 1, 'artillerie.dispersion'), 1); assert.equal(modif(petite().etat, 0, 'artillerie.dispersion'), 1);
  assert.equal(rechargeDe(e, 0, '155'), 0.9);
  e.camp.rangs.artillerie = [0, 3]; assert.ok(Math.abs(rechargeDe(e, 0, '220') - 0.9 * 0.9 * 0.75) < 1e-9, 'Tube neuf : le 220 seul');
});
test('le blindage du siège : les avions d\'avant et ceux d\'après tiennent 20 % de plus', () => {
  const B = auSoir(bridee()), e = B.etat; e.camp.dotation = 10;
  acheterRang(e, 'aerodrome', 1); aube(B);
  assert.deepEqual(e.avions[0], [120, 120, 120]); assert.equal(pvAvion(e, 0), 120);
});
test('l\'Infanterie vaut pour tous nos régiments : les casques font moins de morts sous les obus (même graine, mêmes obus)', () => {
  const morts = casques => {
    const B = bridee(11);
    if (casques) B.etat.camp.rangs.infanterie = [1, 0];
    for (let k = 0; k < 900; k++) { avancer(B); if (k % 60 === 0) for (let q = 0; q < 3; q++) B.etat.barrages.push({ camp: 1, cal: '155', x: 280 + q * 30, y: 440, reste: 6, prochain: B.etat.temps }); }
    return B.etat.pertes[0];
  };
  const sans = morts(false), avec = morts(true);
  assert.ok(avec <= sans, `avec casques ${avec}, sans ${sans}`);
  assert.equal(infanterie(bridee().etat, 0, 'obus'), 1);
  assert.ok(!CORVEES.some(c => c.id.startsWith('eq-')), 'la corvée d\'équipement n\'existe plus');
});
test('les régiments frais d\'un rang de la caserne relèvent aussi le plafond de la bataille', () => {
  const B = auSoir(bridee()), e = B.etat; e.camp.dotation = 10;
  const avant = renfortsDe(e, 0).plafond;
  acheterRang(e, 'caserne', 0); aube(B);
  assert.equal(renfortsDe(e, 0).plafond, avant + 2); assert.equal(renfortsDe(e, 0).restants, 4);
});
test('en face a son camp : le même départ que nous, sa dotation selon la difficulté ; hors partie bridée, aucun', () => {
  const B = bridee(), K = B.etat.campEux;
  assert.ok(K.bride); assert.equal(K.dotation, DOTATION.depart); assert.equal(K.mult, 1);
  assert.equal(petite().etat.campEux ?? null, null);
  const calme = nouvelleBataille(5, R, { soldats: 200, jours: 6, camp: true, difficulte: 'calme' }), dur = nouvelleBataille(5, R, { soldats: 200, jours: 6, camp: true, difficulte: 'offensive' });
  assert.equal(calme.etat.campEux.mult, 0.7); assert.equal(dur.etat.campEux.mult, 1.3); assert.equal(calme.etat.camp.mult, 1, 'la nôtre ne change jamais');
  B.etat.campEux.rangs.artillerie = [1, 0];
  assert.equal(modif(B.etat, 1, 'artillerie.dispersion'), 0.9); assert.equal(modif(B.etat, 0, 'artillerie.dispersion'), 1);
});
test('en face achète seul le soir : son plan, avec sa dotation ; l\'aube confirme et sa réserve grandit ; jamais de char ni d\'avion', () => {
  const B = bridee(), e = B.etat; e.campEux.dotation = 20;
  auSoir(B);
  assert.ok(e.campEux.achats.length >= 2, `des achats (${e.campEux.achats.length})`);
  assert.ok(e.campEux.dotation < 20 + e.campEux.soir.points);
  aube(B);
  let pic = e.reserves[1];
  for (let k = 0; k < 4 && e.phase !== 'fin'; k++) { e.campEux.dotation = Math.max(e.campEux.dotation, 10); nuit(B); pic = Math.max(pic, e.reserves[1]); }
  assert.ok(e.campEux.rangs.artillerie[0] >= 1); assert.ok(pic >= 4, `sa réserve a grandi (${pic})`);
  assert.deepEqual(e.campEux.rangs.chars, [0, 0]); assert.deepEqual(e.campEux.rangs.aerodrome, [0, 0]);
});
test('son camp est le nôtre tourné d\'un demi-tour, au nord ; il ne se choisit pas', () => {
  const B = bridee(), e = B.etat;
  const nous = emprisesCamp(e, 0).find(b => b.cle === 'sapeurs'), eux = emprisesCamp(e, 1).find(b => b.cle === 'sapeurs');
  assert.equal(nous.x + eux.x, 2 * e.marges.x + 400); assert.equal(nous.y + eux.y, 2 * e.marges.y + 300);
  assert.ok(eux.y < e.marges.y, 'dans la marge du nord'); assert.equal(eux.rot, Math.PI);
  assert.equal(batimentSous(e, eux.x, eux.y), null, 'un clic sur son camp ne choisit rien');
  assert.equal(batimentSous(e, eux.x, eux.y, 0, 1), 'sapeurs');
});
test('la campagne reporte les rangs du camp : la bataille suivante en part, sans la dotation', () => {
  const A = auSoir(bridee(21)); A.etat.camp.dotation = 50;
  acheterRang(A.etat, 'aerodrome', 0); acheterRang(A.etat, 'artillerie', 1); acheterRang(A.etat, 'sapeurs', 0); aube(A);
  const depart = Object.fromEntries(Object.entries(A.etat.camp.rangs).map(([o, r]) => [o, [...r]]));
  const S = nouvelleBataille(22, R, { soldats: 200, jours: 6, camp: true, campDepart: depart }), e = S.etat;
  assert.deepEqual(e.camp.rangs.aerodrome, [1, 0]); assert.deepEqual(e.camp.rangs.artillerie, [0, 1]);
  assert.equal(e.camp.dotation, DOTATION.depart, 'la dotation repart du départ'); assert.deepEqual(e.camp.achats, []);
  assert.equal(e.avions[0].length, 4); assert.equal(e.sapeurs[0], 4); assert.equal(modif(e, 0, 'artillerie.recharge'), 0.9);
  assert.deepEqual(e.campEux.rangs.aerodrome, [0, 0], 'en face repart du départ');
});
test('une partie avec le camp d\'en face relue est la même partie, après une nuit où il a acheté', () => {
  const A = bridee(23); A.etat.campEux.dotation = 12; nuit(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.campEux, A.etat.campEux);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(A)));
});

group('camp — ce qui part du camp (v0.99.8)');
test('le char sort du parc des chars, et les avions décollent de la piste avant leur passe', () => {
  const B = bridee(), e = B.etat;
  const parc = sortieChars(e, 0); assert.ok(parc, 'un parc bâti a une sortie');
  const P = emplacementCamp(e, 'chars', 0); assert.ok(Math.abs(parc.x - P.x) < 12 && Math.abs(parc.y - (P.y - 10)) < 0.01);
  const Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  const r = ordonnerBarrage(B, 'char', cx, Z.y0 + 120, 0); assert.ok(r.ok, JSON.stringify(r));
  const c = e.chars[0]; assert.equal(c.x, parc.x); assert.equal(c.y, parc.y, 'il part de la place que montre le parc');
  e.temps = 10;
  const a = ordonnerBarrage(B, 'avion', cx, Z.y0 + 100, 0, cx + 40, Z.y0 + 100); assert.ok(a.ok, JSON.stringify(a));
  const v = e.mitraillages[0], A = emplacementCamp(e, 'aerodrome', 0);
  assert.ok(v.av && v.av.sP > 76, 'le vol a une roulette et une montée');
  const p0 = positionDe(v, v.t0), p1 = positionDe(v, v.t0 + 76 / 40 - 0.01), p2 = positionDe(v, v.t0 + v.av.sP / 40 + 0.01);
  assert.equal(p0.h, 0); assert.ok(Math.abs(p0.y - (A.y + 4)) < 0.5 && Math.abs(p0.x - A.x) <= 39 && p0.piste, 'il roule sur la piste de l\'aérodrome');
  assert.equal(p1.h, 0);
  assert.ok(p2.h > 40 && Math.abs(p2.x - v.ex) < 2 && Math.abs(p2.y - v.ey) < 2 && !p2.piste, 'puis il entre par l\'entrée de la passe, à l\'altitude de croisière');
  // la passe elle-même est décalée du temps de décollage ; relu, c'est le même vol
  const R2 = restaurer(JSON.parse(JSON.stringify(photo(B))), R);
  assert.deepEqual(R2.etat.mitraillages[0].av, v.av);
  for (let k = 0; k < 200; k++) { avancer(B); avancer(R2); }
  assert.equal(JSON.stringify(photo(R2)), JSON.stringify(photo(B)));
});
test('sans camp dessiné, un vol et un char naissent à l\'entrée comme avant', () => {
  const B = petite(), Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  assert.equal(sortieChars(B.etat, 0), null);
  ordonnerBarrage(B, 'avion', cx, Z.y0 + 100, 0); assert.equal(B.etat.mitraillages[0].av, undefined);
});

group('camp — le stock de chars et d\'avions (v0.99.10)');
test('une bataille bridée a 2 chars et 3 avions au départ ; le parc et l\'aérodrome en gardent plus à leurs niveaux ; le stock s\'épuise', () => {
  const B = bridee(), e = B.etat, Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  assert.deepEqual(e.charsDispo, [2, 2]); assert.equal(e.avions[0].length, 3);
  assert.deepEqual(charsDispo(e, 0), 2);
  for (let n = 0; n < 2; n++) { e.batteries.char = 0; assert.ok(ordonnerBarrage(B, 'char', cx + 30 * n, Z.y0 + 120, 0).ok); }
  assert.equal(charsDispo(e, 0), 0);
  e.batteries.char = 0; const r = ordonnerBarrage(B, 'char', cx, Z.y0 + 120, 0);
  assert.match(r.refus, /Plus un char au parc/);
  // les rangs qui en ajoutent (les pistes « Le parc » et « Escadrille », II et IV) : 4 chars, 5 avions
  const A = bridee(); A.etat.camp.rangs.chars = [3, 0]; A.etat.camp.rangs.aerodrome = [3, 0]; appliquerDepart(A.etat, 0);
  assert.equal(A.etat.charsDispo[0], 4); assert.equal(A.etat.avions[0].length, 5);
  assert.equal(petite().etat.charsDispo[0], null, 'sans camp bridé, pas de limite');
});

group('camp — l\'IA et les chars (v0.99.11)');
const offensive = () => nouvelleBataille(5, R, { soldats: 400, jours: 6, camp: true, difficulte: 'offensive' });
test('à « Grande offensive », en face lance un char après un jour ; pas aux autres niveaux', () => {
  const B = offensive(), e = B.etat;
  assert.equal(e.chars.filter(c => c.camp === 1).length, 0);
  for (let k = 0; k < 10800 && e.phase === 'jour' && !e.chars.some(c => c.camp === 1); k++) avancer(B);
  const c = e.chars.find(k => k.camp === 1); assert.ok(c, 'un char d\'en face est parti');
  assert.ok(e.temps >= 180, 'pas avant son délai'); assert.equal(e.charsDispo[1], 1);
  const O = nouvelleBataille(5, R, { soldats: 400, jours: 6, camp: true });
  for (let k = 0; k < 10800 && O.etat.phase === 'jour'; k++) avancer(O);
  assert.equal(O.etat.chars.length, 0, 'ordinaire : aucun char d\'en face');
});
test('en face tire sur nos chars, à tous les niveaux, devant eux quand ils roulent', () => {
  for (const niveau of ['calme', 'ordinaire', 'offensive']) {
    const B = nouvelleBataille(5, R, { soldats: 400, jours: 6, camp: true, difficulte: niveau }), e = B.etat, Z = zone(B);
    const cx = (Z.x0 + Z.x1) / 2; e.chars.push({ id: 0, camp: 0, modele: 'schneider', x: cx, y: Z.y0 + 150, tx: cx, ty: Z.y0 + 150, pv: 100, pvMax: 100, etat: 'arrive', v: 0, hx: 0, hy: -1, cap: 0, canonT: 0, vise: null, cible: null, ar: undefined, chemin: null, k: 0, dx0: cx });
    e.ia.barrage = 0; let proches = 0, total = 0;
    const avant = e.impacts.length;
    for (let k = 0; k < 3000 && e.phase === 'jour'; k++) avancer(B);
    for (const im of e.impacts.slice(avant)) { total++; if (Math.hypot(im[2] / 10 - cx, im[3] / 10 - (Z.y0 + 150)) < 25) proches++; }
    assert.ok(proches >= 3 && proches / total > 0.1, `${niveau} : ${proches}/${total} obus tombent près de notre char`);
  }
});

group('camp — l\'hôpital (v0.99.11)');
test('l\'hôpital compte les évacués, change la mort et le retour par niveau, et renvoie les guéris où l\'on veut', () => {
  const B = bridee(), e = B.etat;
  assert.equal(niveauDe(e, 'hopital'), 1); assert.equal(modif(e, 0, 'hopital.mort'), 1);
  e.camp.rangs.hopital = [2, 0];
  assert.ok(Math.abs(modif(e, 0, 'hopital.mort') - 0.85 * 0.85) < 1e-9, 'l\'hôpital de campagne puis les ambulances'); assert.equal(modif(e, 0, 'hopital.retour'), 1);
  e.camp.rangs.hopital = [0, 1]; assert.equal(modif(e, 0, 'hopital.retour'), 1.1, 'les chirurgiens');
  for (let k = 0; k < 40; k++) e.evacues.push([5000 + k, 1, 1, 0, 0, 0, 0]);
  assert.equal(patients(e, 0).length, 40); assert.equal(patients(e, 1).length, 0); assert.equal(patients(e, 0).filter(p => p.pret).length, 0, 'le premier jour : personne n\'est guéri');
  assert.match(affecterGueris(e, 0, 99).refus, /pas le vôtre/); assert.ok(affecterGueris(e, 0, 1).ok); assert.equal(e.affectation[0], 1);
  const avant = B.armee.n; nuit(B); nuit(B);
  assert.ok(patients(e, 0).filter(p => p.pret && p.id >= 5000).length === 0, 'ceux qui revenaient sont revenus (les blessés entrés à l\'hôpital pendant la 2e journée attendent encore leur nuit : v0.116.0)');
  const revenus = e.evacues.filter(p => p[3] > 0);
  assert.ok(revenus.length >= 8, `une bonne part revient (${revenus.length}/40)`);
  const dans = revenus.map(p => { for (let i = 0; i < B.armee.n; i++) if (B.armee.id[i] === p[0]) return B.armee.reg[i]; return -1; });
  assert.ok(dans.every(r => r === 1), 'tous au régiment choisi'); assert.ok(B.armee.n >= avant - 400);
});

group('camp — les engins du parc, le retour des chars et le génie à la base (v0.130.0)');
test('le parc ne montre que les chars du stock ; un char lancé libère une place', () => {
  const B = bridee(), e = B.etat, Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  assert.equal(placesChars(e, 0).length, 2, 'deux chars au parc au niveau 1');
  assert.equal(placesChars(e, 1).length, 2, 'et chez eux');
  const sortie = sortieChars(e, 0), p0 = placesChars(e, 0)[0];
  assert.ok(Math.hypot(p0.x - sortie.x, p0.y - sortie.y) < 0.01, 'la 1re place est la sortie');
  assert.ok(ordonnerBarrage(B, 'char', cx, Z.y0 + 120, 0).ok);
  assert.equal(placesChars(e, 0).length, 1);
  for (let k = 0; k < 3; k++) assert.ok(placeAvion(e, 0, k), 'une cellule par avion de la flotte');
  assert.ok(Math.abs(placeAvion(e, 1, 0).x - (emplacementCamp(e, 'aerodrome', 1).x - (-32))) < 0.01, 'tourné d\'un demi-tour chez eux');
});
test('un char abîmé rentre au parc avec ses dégâts, le génie le répare là et lui seul, puis il ressort', () => {
  const B = bridee(), e = B.etat, Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  assert.ok(ordonnerBarrage(B, 'char', cx, Z.y0 + 120, 0).ok);
  const c = e.chars[0]; for (let n = 0; n < 300; n++) avancer(B);
  c.pv = 30; c.exp = 0.4; c.tues = 7;
  e.batteries.genie = 0;
  assert.match(ordonnerBarrage(B, 'genie', c.x, c.y, 0).refus, /à la base/, 'le génie ne répare pas sur le champ');
  assert.equal(ordonnerChar(B, c.id, 'rentrer', 0, 0, 0).ok, true);
  for (let n = 0; n < 20000 && e.chars.length; n++) avancer(B);
  assert.equal(e.chars.length, 0, 'le char a quitté le champ');
  const r = parcChars(e, 0)[0]; assert.ok(r, 'il est au parc'); assert.equal(r.pv, 30); assert.equal(r.tues, 7); assert.equal(charsDispo(e, 0), 2, 'le stock a retrouvé sa place');
  assert.equal(placesChars(e, 0).find(p => p.id === r.id) !== undefined, true, 'et il se voit à une place du parc');
  // le génie le répare, une fois par jour
  assert.match(ordonnerBarrage(B, 'genie', cx, Z.y0 + 100, 0, codeChar(999), 0).refus, /n'est pas au parc/);
  const g = ordonnerBarrage(B, 'genie', cx, Z.y0 + 100, 0, codeChar(r.id), 0); assert.ok(g.ok, JSON.stringify(g));
  assert.equal(e.genies[0].parc, r.id);
  e.batteries.genie = 0; assert.match(ordonnerBarrage(B, 'genie', cx, Z.y0 + 100, 0, REPARE_AVION, 0).refus, /par jour/);
  for (let n = 0; n < 80000 && e.genies[0]?.etat !== 'travaille' && e.phase === 'jour'; n++) avancer(B);
  assert.equal(e.genies[0].etat, 'travaille'); e.genies[0].travail = 0.9999; avancer(B); avancer(B);
  assert.equal(r.pv, r.pvMax); assert.equal(r.repar, 1); assert.equal(e.genies.length, 0);
  // il ressort après le char neuf, avec son numéro, son expérience et ses points de vie
  e.batteries.char = 0; assert.ok(ordonnerBarrage(B, 'char', cx, Z.y0 + 120, 0).ok);
  assert.equal(e.chars[0].id !== r.id, true, 'le neuf d\'abord');
  e.batteries.char = 0; assert.ok(ordonnerBarrage(B, 'char', cx + 30, Z.y0 + 120, 0).ok);
  const re = e.chars.find(k => k.id === r.id); assert.ok(re, 'puis le rentré'); assert.equal(re.exp, 0.4); assert.equal(re.tues, 7); assert.equal(re.repar, 1);
  assert.equal(parcChars(e, 0).length, 0);
});
test('le génie relève l\'épave d\'un char sur le champ : à moitié de sa solidité, une fois par jour (v0.132.0)', () => {
  const B = bridee(), e = B.etat, Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  assert.ok(ordonnerBarrage(B, 'char', cx, Z.y0 + 120, 0).ok);
  const c = e.chars[0]; for (let n = 0; n < 300; n++) avancer(B);
  c.pv = 0; c.etat = 'detruit'; c.v = 0;
  e.batteries.genie = 0;
  const g = ordonnerBarrage(B, 'genie', c.x + 3, c.y, 0); assert.ok(g.ok, JSON.stringify(g));
  assert.equal(e.genies[0].char, c.id); assert.equal(e.genies[0].epave, true);
  e.batteries.genie = 0; assert.match(ordonnerBarrage(B, 'genie', c.x, c.y, 0).refus, /par jour/, 'c\'est la réparation d\'engin du jour');
  for (let n = 0; n < 80000 && e.genies[0]?.etat !== 'travaille' && e.phase === 'jour'; n++) avancer(B);
  assert.equal(e.genies[0].etat, 'travaille');
  assert.equal(c.etat, 'detruit', 'pas avant la fin du travail');
  e.genies[0].travail = 0.9999; avancer(B); avancer(B);
  assert.equal(c.etat, 'arrive'); assert.equal(c.pv, Math.round(c.pvMax / 2)); assert.equal(c.repar, 1); assert.equal(e.genies.length, 0);
  assert.equal(ordonnerChar(B, c.id, 'rentrer', 0, 0, 0).ok, true, 'relevé, il peut rentrer au parc');
});
test('en face aussi, le génie relève l\'épave d\'un de ses chars (v0.133.0)', () => {
  const B = bridee(), e = B.etat, Z = zone(B), cx = (Z.x0 + Z.x1) / 2;
  assert.ok(ordonnerBarrage(B, 'char', cx, Z.y0 + 150, 1).ok, 'un char d\'en face');
  const c = e.chars.find(k => k.camp === 1); for (let n = 0; n < 300; n++) avancer(B);
  c.pv = 0; c.etat = 'detruit'; c.v = 0; e.ia.genie = 0;
  for (let n = 0; n < 50 && !e.genies.some(g => g.camp === 1); n++) avancer(B);
  const g = e.genies.find(k => k.camp === 1); assert.ok(g, 'leur génie part');
  assert.equal(g.char, c.id); assert.equal(g.epave, true);
  for (let n = 0; n < 80000 && g.etat !== 'travaille' && e.phase === 'jour'; n++) avancer(B);
  assert.equal(g.etat, 'travaille'); g.travail = 0.9999; avancer(B); avancer(B);
  assert.equal(c.etat, 'arrive'); assert.equal(c.pv, Math.round(c.pvMax / 2));
});
test('le génie répare l\'avion que l\'on désigne (pas forcément le plus abîmé), pas un avion intact', () => {
  const B = bridee(), e = B.etat, Z = zone(B), cx = (Z.x0 + Z.x1) / 2, max = pvAvion(e, 0);
  e.batteries.genie = 0;
  assert.match(ordonnerBarrage(B, 'genie', cx, Z.y0 + 100, 0, codeAvion(0), 0).refus, /pas abîmé/);
  e.avions[0][0] = Math.floor(max / 2); e.avions[0][2] = Math.floor(max / 4);
  assert.ok(ordonnerBarrage(B, 'genie', cx, Z.y0 + 100, 0, codeAvion(0), 0).ok);
  assert.equal(e.genies[0].avion, 0, 'celui qu\'on a désigné, pas le plus abîmé');
});
test('la ronde des gardes reste hors de l\'emprise du bâtiment et boucle sur elle-même', () => {
  for (const [w, d, cle] of [[34, 22, 'artillerie'], [84, 40, 'aerodrome'], [32, 30, 'chars']]) {
    const [hx, hz] = demiRonde(w, d, cle), L = longueurRonde(hx, hz), marge = cle === 'aerodrome' ? RONDE.margeAerodrome : RONDE.marge;
    for (let s = 0; s < L; s += 0.5) {
      const [x, z] = pointRonde(hx, hz, s);
      assert.ok(Math.abs(x) >= w / 2 + marge - 1e-9 || Math.abs(z) >= d / 2 + marge - 1e-9, `hors de l'emprise (${cle}, s=${s})`);
      const [x2, z2] = pointRonde(hx, hz, s + 0.5); assert.ok(Math.hypot(x2 - x, z2 - z) <= 0.5 + 1e-9, 'jamais de saut');
    }
    assert.deepEqual(pointRonde(hx, hz, 0), pointRonde(hx, hz, L));
  }
});
