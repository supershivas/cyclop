// Le camp : la dotation de l'aube, les chantiers d'une nuit, les refus à voix haute, la sauvegarde (lot 1 de docs/chantiers/camp-et-ameliorations.md).
import { positionDe } from '../js/avions.js';
import { zone } from '../js/bataille.js';
import { nouvelleBataille, avancer, aube, photo, restaurer, ordonnerBarrage } from '../js/bataille.js';
import { affecterGueris, patients, charsDispo, appliquerDepart, sortieChars, emplacementCamp, campDe, refusEquiper, equiper, facteurEquip, campDeDepart, modif, rechargeDe, pvAvion, refusOrdre, refusNid, emprisesCamp, batimentSous, refusCamp, ordonnerChantier, dotationAube, niveauDe, coutDe, nuitsDe, choisis } from '../js/camp.js';
import { BATIMENTS, DOTATION, EQUIPEMENTS, EQUIPEMENT, equipeEnMots } from '../js/data/batiments.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const petite = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6 });
const nuit = B => { while (B.etat.phase === 'jour') avancer(B); return aube(B); };

group('camp');
test('le premier matin : 0 point, tous les bâtiments au niveau 1 (v0.98.0)', () => {
  const B = petite(), c = B.etat.camp;
  assert.equal(c.dotation, 0); assert.equal(DOTATION.depart, 0);
  assert.deepEqual(Object.fromEntries(Object.keys(BATIMENTS).map(k => [k, niveauDe(B.etat, k)])), { artillerie: 1, aerodrome: 1, chars: 1, sapeurs: 1, caserne: 1, hopital: 1 });
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
  e.camp.dotation = 5;
  assert.deepEqual(ordonnerChantier(e, 'chars', 0), { ok: true, vers: 2, nuits: 1 });
  assert.equal(e.camp.dotation, 5 - coutDe('chars', 2));
  assert.equal(niveauDe(e, 'chars'), 1);
  assert.match(refusCamp(e, 'chars', 0), /en chantier/);
  assert.ok(ordonnerChantier(e, 'chars', 0).refus, 'un second ordre est refusé');
  const dot = nuit(B).dotation;
  assert.deepEqual(dot.finis, [['chars', 2]]);
  assert.equal(niveauDe(e, 'chars'), 2);
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
  A.etat.camp.dotation = 5; ordonnerChantier(A.etat, 'aerodrome', 0);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.camp, A.etat.camp);
  assert.equal(B.etat.camp.batiments.aerodrome.chantier.vers, 2);
  for (const X of [A, B]) nuit(X);
  assert.deepEqual(B.etat.camp, A.etat.camp);
  assert.equal(niveauDe(B.etat, 'aerodrome'), 2);
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
  assert.equal(campDeDepart().batiments.chars.niveau, 1); assert.deepEqual(campDeDepart().lignes, []);
});

const bridee = (graine = 5) => nouvelleBataille(graine, R, { soldats: 200, jours: 6, camp: true });
test('partie bridée : les trois calibres, l\'avion, le char et le génie sont prêts dès le premier matin (v0.98.0 ; les niveaux les améliorent)', () => {
  const B = bridee();
  assert.ok(B.etat.camp.bride);
  for (const cal of ['75', '155', '220', 'avion', 'char', 'genie']) assert.equal(refusOrdre(B.etat, 0, cal), null, cal);
  for (const cal of ['75', '155', '220']) assert.equal(ordonnerBarrage(B, cal, 300, 450).ok, true, `barrage de ${cal}`);
});
test('partie bridée : refaire un nid demande les sapeurs au niveau 2 ; hors partie bridée, rien n\'est bridé', () => {
  const B = bridee();
  B.etat.camp.batiments.sapeurs.niveau = 1;
  assert.match(refusNid(B.etat, 0), /niveau 2/);
  B.etat.camp.batiments.sapeurs.niveau = 2; assert.equal(refusNid(B.etat, 0), null);
  assert.equal(refusOrdre(petite().etat, 1, 'char'), null, 'hors partie bridée, en face non plus');
  assert.equal(refusOrdre(B.etat, 1, 'char'), null, 'en face aussi : tout est prêt au départ');
});
test('par défaut (tests, labo, jeu à deux) rien n\'est bridé', () => {
  assert.equal(petite().etat.camp.bride, false);
  assert.equal(refusOrdre(petite().etat, 0, 'char'), null);
});
test('le camp est dans la marge arrière, derrière notre 4e ligne, sans que deux bâtiments se touchent, et un point le retrouve', () => {
  const B = bridee(), e = B.etat;
  e.camp.batiments.chars.niveau = 1; e.camp.batiments.aerodrome.chantier = { vers: 1, nuits: 1, choix: null }; e.camp.batiments.sapeurs.niveau = 1;
  const em = emprisesCamp(e);
  assert.equal(em.length, 6);
  const quatrieme = e.marges.y + 278;
  for (const b of em) assert.ok(b.y - b.d / 2 > quatrieme + 30 && b.y + b.d / 2 < e.marges.y + 300 + e.marges.y, `${b.cle} derrière la 4e ligne, dans le terrain`);
  for (const a of em) for (const b of em) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 + 4 || Math.abs(a.y - b.y) >= (a.d + b.d) / 2, `${a.cle} et ${b.cle} se chevauchent`);
  for (const b of em) { assert.equal(batimentSous(e, b.x, b.y), b.cle); assert.ok(b.x - b.w / 2 >= 0 && b.x + b.w / 2 <= 2 * e.marges.x + 400); }
  assert.equal(batimentSous(e, 10, 10), null);
  e.camp.batiments.chars.niveau = 0;
  assert.ok(!emprisesCamp(e).some(b => b.cle === 'chars'), 'un bâtiment à bâtir n\'a pas d\'emprise');
});
test('une partie bridée relue est la même partie, camp compris', () => {
  const A = bridee(8); A.etat.camp.dotation = 5; ordonnerChantier(A.etat, 'sapeurs', 0); nuit(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.camp, A.etat.camp); assert.ok(B.etat.camp.bride);
  assert.equal(niveauDe(B.etat, 'sapeurs'), 2); assert.equal(B.etat.sapeurs[0], 4);
});

// ─── Lot 3 : ce que les niveaux et les choix changent ───
const niveauEtChoix = (B, cle, niveau, choix = []) => { B.etat.camp.batiments[cle] = { niveau, choix, chantier: null }; };
test('le départ de la partie bridée : 2 régiments en réserve, 2 sections de génie et 3 avions (le niveau 1; v0.99.10 : 3 avions) de chaque bâtiment)', () => {
  const B = bridee();
  assert.deepEqual(B.etat.reserves, [2, 2]); assert.equal(B.etat.sapeurs[0], 2); assert.deepEqual(B.etat.avions[0], [100, 100, 100]);
  assert.deepEqual(B.etat.avions[1], [100, 100, 100], 'en face part du même camp (v0.92.0)');
  assert.deepEqual(petite().etat.reserves, [4, 4], 'hors partie bridée, rien ne change');
});
test('améliorer fait venir les effectifs : l\'aérodrome 4 avions, puis 5 ; les sapeurs 4 sections ; la caserne 4 puis 6 régiments', () => {
  const B = bridee(), e = B.etat; e.camp.dotation = 30;
  ordonnerChantier(e, 'aerodrome', 0); ordonnerChantier(e, 'sapeurs', 0); ordonnerChantier(e, 'caserne', 0); nuit(B);
  assert.equal(e.camp.batiments.aerodrome.niveau, 2); assert.deepEqual(e.avions[0], [100, 100, 100, 100]);
  assert.equal(e.sapeurs[0], 4);
  assert.equal(e.reserves[0], 4);
  ordonnerChantier(e, 'aerodrome', 0); ordonnerChantier(e, 'caserne', 1); nuit(B); nuit(B);
  assert.equal(e.avions[0].length, 5); assert.equal(e.reserves[0], 6);
});
test('le blindage du siège : les avions d\'avant et ceux d\'après tiennent 40 % de plus', () => {
  const B = bridee(), e = B.etat; e.camp.dotation = 30;
  ordonnerChantier(e, 'aerodrome', 1); nuit(B);
  assert.deepEqual(e.avions[0], [140, 140, 140, 140]); assert.equal(pvAvion(e, 0), 140);
});
test('modif : le produit des niveaux et des choix pris, 1 pour en face et hors partie bridée', () => {
  const B = bridee(), e = B.etat;
  assert.equal(modif(e, 0, 'artillerie.dispersion'), 1);
  niveauEtChoix(B, 'artillerie', 2, [0]); assert.equal(modif(e, 0, 'artillerie.dispersion'), 0.8);
  niveauEtChoix(B, 'artillerie', 3, [1, 0]); assert.equal(modif(e, 0, 'artillerie.recharge'), 0.85); assert.ok(Math.abs(modif(e, 0, 'artillerie.salve220') - 10 / 6) < 1e-9);
  niveauEtChoix(B, 'chars', 3, [0, 1]); assert.ok(Math.abs(modif(e, 0, 'chars.recharge') - 0.64) < 1e-9, 'deux paliers de 0,8'); assert.equal(modif(e, 0, 'chars.canon'), 1); assert.equal(modif(e, 0, 'chars.vitesse'), 1.15);
  assert.equal(modif(e, 1, 'chars.recharge'), 1, 'en face');
  assert.equal(modif(petite().etat, 0, 'chars.recharge'), 1, 'hors partie bridée');
});
test('la recharge d\'une batterie suit le parc : « Caissons doublés » raccourcit un barrage de 155', () => {
  const B = bridee(), e = B.etat; niveauEtChoix(B, 'artillerie', 2, [1]);
  assert.equal(ordonnerBarrage(B, '155', 300, 450).ok, true);
  assert.ok(Math.abs(e.batteries['155'] - e.temps - 70 * 0.85) < 1e-6, `${e.batteries['155']}`);
  assert.equal(rechargeDe(e, 0, '220'), 0.85); niveauEtChoix(B, 'artillerie', 3, [1, 1]); assert.ok(Math.abs(rechargeDe(e, 0, '220') - 0.85 * 0.75) < 1e-9);
});
test('« Salve longue » : le 220 tire 10 coups ; « Tir de réglage » resserre la dispersion', () => {
  const B = bridee(), e = B.etat; niveauEtChoix(B, 'artillerie', 3, [0, 0]);
  ordonnerBarrage(B, '220', 300, 450); assert.equal(e.barrages.at(-1).reste, 10);
  const C = bridee(); niveauEtChoix(C, 'artillerie', 3, [0, 1]); ordonnerBarrage(C, '220', 300, 450); assert.equal(C.etat.barrages.at(-1).reste, 6);
});
test('une partie bridée relue après un chantier à choix est la même partie', () => {
  const A = bridee(9); A.etat.camp.dotation = 20; ordonnerChantier(A.etat, 'artillerie', 1); nuit(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.etat.camp, A.etat.camp); assert.equal(modif(B.etat, 0, 'artillerie.recharge'), 0.85);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(A)));
});

// ─── Lot 4 : l'équipement des régiments ───
const regNous = B => B.etat.regiments.find(r => r.camp === 0);
test('équiper demande la caserne au niveau 2, de la dotation, une place libre, une pièce qu\'il n\'a pas', () => {
  const B = bridee(), e = B.etat, r = regNous(B);
  assert.match(refusEquiper(B, r, 'casque'), /caserne au niveau 2/);
  e.camp.batiments.caserne.niveau = 2; e.camp.dotation = 5;
  assert.equal(refusEquiper(B, r, 'casque'), null);
  e.camp.dotation = 0; assert.match(refusEquiper(B, r, 'casque'), /point de dotation/); e.camp.dotation = 5;
  assert.match(refusEquiper(B, r, 'lance-flammes'), /Pas de telle pièce/);
  assert.equal(equiper(B, r, 'casque'), true); assert.equal(e.camp.dotation, 4); assert.deepEqual(r.equip, ['casque']);
  assert.match(refusEquiper(B, r, 'casque'), /a déjà/);
  assert.equal(equiper(B, r, 'grenades'), true);
  assert.match(refusEquiper(B, r, 'hotchkiss'), new RegExp(`${EQUIPEMENT.places} pièces`));
  assert.equal(equiper(B, r, 'hotchkiss'), false, 'rien ne change quand c\'est refusé'); assert.equal(e.camp.dotation, 3);
  assert.match(refusEquiper(B, B.etat.regiments.find(x => x.camp === 1), 'casque'), /caserne au niveau 2/, 'chaque camp équipe avec sa caserne (v0.94.0)');
  { const P = petite(); assert.match(refusEquiper(P, P.etat.regiments[0], 'casque'), /Pas de caserne dans cette partie/); }
  assert.equal(facteurEquip(r, 'casque', 'obus'), EQUIPEMENTS.casque.obus); assert.equal(facteurEquip(r, 'brancards', 'retour'), 1);
  assert.equal(equipeEnMots(r), 'casques adrian et grenadiers');
});
test('la corvée de nuit équipe le régiment, coûte un point et lui ôte son repos ; sans caserne elle se refuse à voix haute', async () => {
  const { refusCorvee } = await import('../js/nuit.js');
  const B = bridee(), e = B.etat, r = regNous(B);
  assert.match(refusCorvee(B, r, 'eq-casque'), /caserne au niveau 2/);
  e.camp.batiments.caserne.niveau = 2; e.camp.dotation = 5;
  while (e.phase === 'jour') avancer(B);
  const avant = e.camp.dotation, autre = e.regiments.filter(x => x.camp === 0)[1];
  const res = aube(B, { [r.id]: 'eq-brancards', [autre.id]: 'repos' });
  assert.deepEqual(r.equip, ['brancards']); assert.equal(res.bilan[0].equipes, 1);
  assert.equal(e.camp.dotation, avant - EQUIPEMENT.cout + res.dotation.points, 'un point payé, la dotation du matin versée');
  assert.equal(autre.equip, undefined);
});
test('la dernière pièce ne se donne pas si la caisse s\'est vidée : le régiment se repose', () => {
  const B = bridee(), e = B.etat; e.camp.batiments.caserne.niveau = 2;
  const [a, b] = e.regiments.filter(x => x.camp === 0); e.camp.dotation = 1;
  while (e.phase === 'jour') avancer(B);
  const res = aube(B, { [a.id]: 'eq-casque', [b.id]: 'eq-grenades' });
  assert.equal(res.bilan[0].equipes, 1); assert.equal((a.equip?.length ?? 0) + (b.equip?.length ?? 0), 1);
});
test('les casques font moins de morts sous les obus (même graine, mêmes obus)', () => {
  const morts = casques => {
    const B = bridee(11);
    for (const r of B.etat.regiments) if (r.camp === 0 && casques) r.equip = ['casque'];
    B.etat.camp.batiments.artillerie.niveau = 3;
    for (let k = 0; k < 8; k++) ordonnerBarrage(B, '155', 300 + k * 6, 460, 1);
    for (let k = 0; k < 900; k++) { avancer(B); if (k % 60 === 0) for (let q = 0; q < 3; q++) B.etat.barrages.push({ camp: 1, cal: '155', x: 280 + q * 30, y: 440, reste: 6, prochain: B.etat.temps }); }
    return B.etat.pertes[0];
  };
  const sans = morts(false), avec = morts(true);
  assert.ok(avec <= sans, `avec casques ${avec}, sans ${sans}`);
});
test('une partie équipée relue est la même partie, équipement compris', () => {
  const A = bridee(13); A.etat.camp.batiments.caserne.niveau = 2; A.etat.camp.dotation = 5; equiper(A, regNous(A), 'hotchkiss');
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(regNous(B).equip, ['hotchkiss']);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(A)));
});

// ─── Lot 5 : le camp d'en face, la campagne ───
test('en face a son camp : le même départ que nous, sa dotation selon la difficulté ; hors partie bridée, aucun', () => {
  const B = bridee(), K = B.etat.campEux;
  assert.ok(K.bride); assert.equal(K.dotation, DOTATION.depart); assert.equal(K.mult, 1);
  assert.deepEqual(B.etat.reserves, [2, 2], 'en face part de la même réserve');
  assert.equal(petite().etat.campEux ?? null, null);
  const calme = nouvelleBataille(5, R, { soldats: 200, jours: 6, camp: true, difficulte: 'calme' }), dur = nouvelleBataille(5, R, { soldats: 200, jours: 6, camp: true, difficulte: 'offensive' });
  assert.equal(calme.etat.campEux.mult, 0.7); assert.equal(dur.etat.campEux.mult, 1.3); assert.equal(calme.etat.camp.mult, 1, 'la nôtre ne change jamais');
});
test('les choix d\'en face comptent pour elle seule : ses calibres sont prêts, son artillerie au niveau 2 resserre sa dispersion', () => {
  const B = bridee();
  for (const cal of ['75', '155', '220']) assert.equal(ordonnerBarrage(B, cal, 300, 200, 1).ok, true, cal);
  B.etat.campEux.batiments.artillerie = { niveau: 2, choix: [0], chantier: null };
  assert.equal(modif(B.etat, 1, 'artillerie.dispersion'), 0.8, 'ses choix comptent aussi');
  assert.equal(modif(B.etat, 0, 'artillerie.dispersion'), 1, 'et ne changent rien chez nous');
});
test('en face bâtit seule à l\'aube : l\'artillerie, la caserne, les sapeurs, avec sa dotation, et ses effectifs suivent', () => {
  const B = bridee(), e = B.etat; e.campEux.dotation = 20;
  nuit(B);                                    // l'aube : la dotation tombe, l'IA commande les chantiers
  const en = Object.values(e.campEux.batiments).filter(c => c.chantier).length;
  assert.ok(en >= 2, `des chantiers ouverts (${en})`);
  assert.ok(e.campEux.dotation < 20);
  let pic = e.reserves[1];       // (depuis la v0.101.0 en face déploie un régiment frais de sa réserve dans la journée : on regarde le plus haut qu'elle atteint, pas où elle finit)
  for (let k = 0; k < 4 && e.phase !== 'fin'; k++) { e.campEux.dotation = Math.max(e.campEux.dotation, 10); nuit(B); pic = Math.max(pic, e.reserves[1]); }
  assert.ok(campDe(e, 1).batiments.artillerie.niveau >= 2); assert.ok(pic >= 4, `sa réserve a grandi (${pic})`);
  assert.equal(e.campEux.batiments.chars.niveau, 1, 'elle ne bâtit pas ce qu\'elle n\'emploie pas');
});
test('son camp est le nôtre tourné d\'un demi-tour, au nord ; il ne se choisit pas', () => {
  const B = bridee(), e = B.etat; e.campEux.batiments.sapeurs.niveau = 1; e.camp.batiments.sapeurs.niveau = 1;
  const nous = emprisesCamp(e, 0).find(b => b.cle === 'sapeurs'), eux = emprisesCamp(e, 1).find(b => b.cle === 'sapeurs');
  assert.equal(nous.x + eux.x, 2 * e.marges.x + 400); assert.equal(nous.y + eux.y, 2 * e.marges.y + 300);
  assert.ok(eux.y < e.marges.y, 'dans la marge du nord'); assert.equal(eux.rot, Math.PI);
  assert.equal(batimentSous(e, eux.x, eux.y), null, 'un clic sur son camp ne choisit rien');
  assert.equal(batimentSous(e, eux.x, eux.y, 0, 1), 'sapeurs');
});
test('la campagne reporte les niveaux du camp : la bataille suivante en part, sans le chantier ni la dotation', () => {
  const A = bridee(21); A.etat.camp.dotation = 50;
  ordonnerChantier(A.etat, 'aerodrome', 0); ordonnerChantier(A.etat, 'artillerie', 1); ordonnerChantier(A.etat, 'sapeurs', 0); nuit(A);
  const depart = Object.fromEntries(Object.entries(A.etat.camp.batiments).map(([k, c]) => [k, { niveau: c.niveau, choix: [...c.choix] }]));
  const S = nouvelleBataille(22, R, { soldats: 200, jours: 6, camp: true, campDepart: depart }), e = S.etat;
  assert.equal(e.camp.batiments.aerodrome.niveau, 2); assert.equal(e.camp.batiments.artillerie.niveau, 2); assert.deepEqual(e.camp.batiments.artillerie.choix, [1]);
  assert.equal(e.camp.dotation, DOTATION.depart, 'la dotation repart du départ'); assert.equal(e.camp.batiments.aerodrome.chantier, null);
  assert.equal(e.avions[0].length, 4, 'les avions de l\'aérodrome au niveau 2'); assert.equal(e.sapeurs[0], 4); assert.equal(modif(e, 0, 'artillerie.recharge'), 0.85);
  assert.equal(e.campEux.batiments.aerodrome.niveau, 1, 'en face repart du départ');
});
test('une partie avec le camp d\'en face relue est la même partie, après une nuit où elle a bâti', () => {
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
  // les niveaux supérieurs : 3 puis 4 chars, 4 puis 5 avions (les chars sortis ne reviennent pas)
  e.camp.dotation = 20; e.camp.batiments.chars.niveau = 2; e.camp.batiments.aerodrome.niveau = 2;
  const A = bridee(); appliquerDepart(A.etat, 0); // (un départ neuf au niveau 1)
  A.etat.camp.batiments.chars.niveau = 3; A.etat.camp.batiments.aerodrome.niveau = 3; appliquerDepart(A.etat, 0);
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
  e.camp.batiments.hopital.niveau = 2; e.camp.batiments.hopital.choix = [0];
  assert.equal(modif(e, 0, 'hopital.mort'), 0.75 * 0.75, 'les pavillons puis les ambulances'); assert.equal(modif(e, 0, 'hopital.retour'), 1);
  e.camp.batiments.hopital.choix = [1]; assert.equal(modif(e, 0, 'hopital.retour'), 1.25, 'les chirurgiens');
  for (let k = 0; k < 40; k++) e.evacues.push([5000 + k, 1, 1, 0, 0, 0, 0]);
  assert.equal(patients(e, 0).length, 40); assert.equal(patients(e, 1).length, 0); assert.equal(patients(e, 0).filter(p => p.pret).length, 0, 'le premier jour : personne n\'est guéri');
  assert.match(affecterGueris(e, 0, 99).refus, /pas le vôtre/); assert.ok(affecterGueris(e, 0, 1).ok); assert.equal(e.affectation[0], 1);
  const avant = B.armee.n; nuit(B); nuit(B);
  assert.ok(patients(e, 0).filter(p => p.pret).length === 0, 'ceux qui revenaient sont revenus');
  const revenus = e.evacues.filter(p => p[3] > 0);
  assert.ok(revenus.length >= 8, `une bonne part revient (${revenus.length}/40)`);
  const dans = revenus.map(p => { for (let i = 0; i < B.armee.n; i++) if (B.armee.id[i] === p[0]) return B.armee.reg[i]; return -1; });
  assert.ok(dans.every(r => r === 1), 'tous au régiment choisi'); assert.ok(B.armee.n >= avant - 400);
});
