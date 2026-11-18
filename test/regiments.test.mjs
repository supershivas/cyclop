// Gestion des régiments (v0.116.0) : les transferts de la nuit, les blessés qui vont à l'hôpital, les régiments frais comptés.
import { nouvelleBataille as nouvelleBatailleLibre, avancer, aube, photo, restaurer, deployer, peutDeployer } from '../js/bataille.js';
const nouvelleBataille = (graine, R, opts = {}) => nouvelleBatailleLibre(graine, R, { premierFixe: true, ...opts });   // le 1er jour est tiré au hasard en jeu : les tests de règles veulent le temps de départ de la saison
import { refusCorvee, planifierTransfert, retirerTransfert, annulerTransferts, refusTransfert, disponibles, vides, prendreReserve } from '../js/nuit.js';
import { entreeHopital, renfortsDe, patients } from '../js/camp.js';
import { blessesDe, marcheBlesse } from '../js/bataille.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { lireBataille } from '../js/donnees-jour.js';
import { palmares } from '../js/hud/medailles.js';
import { place } from '../js/army.js';

const bridee = (graine = 5) => nouvelleBataille(graine, R, { soldats: 400, jours: 6, camp: true });
const effectif = (B, id) => { let n = 0; for (let i = 0; i < B.armee.n; i++) if (!B.armee.mort[i] && B.armee.reg[i] === id) n++; return n; };
const regs = B => B.etat.regiments.filter(r => r.camp === 0 && r.effectif > 0);

group('régiments — les transferts de la nuit (v0.116.0)');
test('un transfert de 10 hommes se prévoit la nuit et s\'exécute à l\'aube, pas avant', () => {
  const B = bridee(), [a, b] = regs(B), na = a.effectif, nb = b.effectif;
  assert.match(planifierTransfert(B, 0, a.id, b.id, 10).refus, /la nuit/, 'le jour : refusé');
  B.etat.phase = 'nuit';
  const r = planifierTransfert(B, 0, a.id, b.id, 10);
  assert.ok(r.ok); assert.equal(r.n, 10);
  assert.equal(a.effectif, na, 'rien ne bouge pendant la nuit'); assert.equal(disponibles(B, 0, a.id), na - 10);
  aube(B);
  assert.equal(a.effectif, na - 10); assert.equal(b.effectif, nb + 10);
  assert.equal(effectif(B, a.id), na - 10); assert.equal(effectif(B, b.id), nb + 10, 'les hommes de l\'armée ont changé de régiment');
  assert.equal(a.initial - a.effectif - a.pertes - (a.releves || 0), 0, 'aucun homme perdu dans le compte');
  assert.deepEqual(B.etat.transferts[0], [], 'la liste est vidée');
});
test('au petit matin, les hommes transférés marchent jusqu\'à leur nouvelle place (v0.132.0)', () => {
  const B = bridee(), [a, b] = regs(B), A = B.armee;
  B.etat.phase = 'nuit';
  assert.ok(planifierTransfert(B, 0, a.id, b.id, 20).ok);
  const avant = new Map();
  for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.reg[i] === a.id) avant.set(i, [A.x[i], A.y[i]]);
  aube(B);
  const venus = [...avant.keys()].filter(i => A.reg[i] === b.id);
  assert.equal(venus.length, 20);
  for (const i of venus) assert.deepEqual([A.x[i], A.y[i]], avant.get(i), 'ils ne sautent pas à leur place : ils partent d\'où ils étaient');
  const pl = [0, 0], loin = () => venus.reduce((s, i) => { place(b.ordre, A.slot[i], pl); return s + Math.hypot(pl[0] - A.x[i], pl[1] - A.y[i]); }, 0) / venus.length;
  const d0 = loin();
  for (let k = 0; k < 600; k++) avancer(B);
  assert.ok(loin() < d0 - 15, `ils se rapprochent de leur place (${d0.toFixed(1)} → ${loin().toFixed(1)} m)`);
});
test('tous ses paquets donnés, un régiment est vidé : il est dissous à l\'aube, l\'autre a tout (la soirée, troisième jet)', () => {
  const B = bridee(), [a, b] = regs(B), total = a.effectif + b.effectif, na = a.effectif;
  B.etat.phase = 'nuit';
  assert.ok(planifierTransfert(B, 0, a.id, b.id, disponibles(B, 0, a.id)).ok);
  assert.equal(disponibles(B, 0, a.id), 0);
  assert.match(planifierTransfert(B, 0, a.id, b.id, 1).refus, /promis/);
  assert.deepEqual(vides(B, 0).map(r => r.id), [a.id], 'vidé : il sera dissous');
  aube(B);
  assert.equal(a.effectif, 0); assert.equal(a.dissous, 1); assert.equal(b.effectif, total); assert.equal(effectif(B, b.id), total);
  // la fin de partie s'en souvient : son jour, son nom, à qui sont allés ses hommes ; il perd ses médailles
  a.tues = 999;
  const d = lireBataille(B, 0).dissous;
  assert.equal(d.length, 1); assert.equal(d[0].nom, a.nom); assert.equal(d[0].jour, 1); assert.equal(d[0].donnes.length, 1); assert.equal(d[0].donnes[0].nom, b.nom); assert.equal(d[0].donnes[0].n, na, 'tous ses hommes au régiment qui les a reçus');
  assert.equal(lireBataille(B, 0).moments[0].dissous, 1, 'la frise le compte, le jour de sa dissolution');
  assert.ok(!palmares(B, 0, 'total').regiments.some(m => m.reg === a.id), 'ses médailles sont perdues avec son nom');
});
test('les blessés passent aussi, en paquets à part : on ne donne que ceux qu\'on a', () => {
  const B = bridee(), [a, b] = regs(B), A = B.armee;
  let n = 0; for (let i = 0; i < A.n && n < 12; i++) if (A.reg[i] === a.id && !A.mort[i]) { A.blessure[i] = 1; n++; }
  B.etat.phase = 'nuit';
  assert.equal(disponibles(B, 0, a.id, true), 12); assert.equal(disponibles(B, 0, a.id), a.effectif - 12);
  assert.match(refusTransfert(B, 0, a.id, b.id, 13, true), /plus que 12 blessés/);
  assert.ok(planifierTransfert(B, 0, a.id, b.id, 10, true).ok); assert.ok(planifierTransfert(B, 0, a.id, b.id, 10).ok);
  aube(B);
  let bl = 0; for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.reg[i] === b.id && A.blessure[i]) bl++;
  assert.ok(bl >= 8, `les blessés sont passés (${bl} ; la nuit en tue quelques-uns)`);
});
test('les refus se disent : même régiment, camp adverse, quantité, trop d\'hommes ; un régiment qui reçoit peut aussi donner', () => {
  const B = bridee(), [a, b, c] = regs(B), eux = B.etat.regiments.find(r => r.camp === 1);
  B.etat.phase = 'nuit';
  assert.match(refusTransfert(B, 0, a.id, a.id, 1), /lui-même/);
  assert.match(refusTransfert(B, 0, a.id, eux.id, 1), /pas le vôtre/);
  assert.match(refusTransfert(B, 0, a.id, b.id, 0), /invalide/);
  assert.ok(planifierTransfert(B, 0, a.id, b.id, 5).ok);
  assert.ok(planifierTransfert(B, 0, b.id, c.id, 5).ok, 'b donne ses propres hommes');
  assert.match(refusTransfert(B, 0, a.id, b.id, 9999), /n'a plus que/);
});
test('un paquet se retire ou s\'emmène ailleurs ; « Annuler les transferts » rend tout ; ils survivent à la sauvegarde', () => {
  const B = bridee(), [a, b, c] = regs(B);
  B.etat.phase = 'nuit';
  planifierTransfert(B, 0, a.id, b.id, 20);
  const C = restaurer(photo(B), R);
  assert.deepEqual(C.etat.transferts[0], [{ de: a.id, vers: b.id, n: 20, bl: false }]);
  assert.ok(retirerTransfert(B, 0, a.id, b.id, 10).ok); planifierTransfert(B, 0, a.id, c.id, 10);      // un paquet de b emmené à c : son origine reste a
  assert.deepEqual(B.etat.transferts[0], [{ de: a.id, vers: b.id, n: 10, bl: false }, { de: a.id, vers: c.id, n: 10, bl: false }]);
  assert.match(retirerTransfert(B, 0, a.id, b.id, 11).refus, /n'existe plus/);
  assert.ok(annulerTransferts(B, 0).ok); assert.equal(disponibles(B, 0, a.id), a.effectif);
  assert.match(annulerTransferts(B, 0).refus, /Aucun transfert/);
});
test('un régiment relevé dans la nuit perd son transfert (il n\'a plus d\'hommes)', () => {
  const B = bridee(), [a, b] = regs(B), nb = b.effectif;
  B.etat.phase = 'nuit';
  planifierTransfert(B, 0, a.id, b.id, 10);
  aube(B, { [a.id]: 'releve' });
  assert.equal(b.effectif, nb, 'rien n\'a été transféré');
});

group('régiments — les blessés vont à l\'hôpital (v0.116.0)');
test('un blessé qui marche entre à l\'hôpital et est compté parmi les soignés', () => {
  const B = bridee(), e = B.etat, A = B.armee, h = entreeHopital(e, 0);
  assert.ok(h, 'l\'hôpital est dessiné dans la partie bridée');
  let i = 0; while (A.camp[i] !== 0) i++;
  A.blessure[i] = 1;
  assert.ok(marcheBlesse(A, i, R)); assert.deepEqual(blessesDe(B, 0), { soignes: 0, enRoute: 1, champ: 0 });
  const reg = e.regiments[A.reg[i]], avant = reg.effectif, id = A.id[i];
  for (let k = 0; k < 6000 && !e.evacues.some(v => v[0] === id); k++) avancer(B);
  assert.ok(e.evacues.some(v => v[0] === id), 'il est entré à l\'hôpital');
  assert.equal(reg.effectif, avant - 1, 'il a quitté le front, vivant');
  assert.equal(patients(e, 0).filter(p => p.id === id).length, 1); assert.equal(blessesDe(B, 0).soignes, patients(e, 0).length);
});
test('sans hôpital dessiné (partie non bridée), les blessés vont à l\'arrière comme avant', () => {
  const B = nouvelleBataille(3, R, { soldats: 200, jours: 3 });
  assert.equal(entreeHopital(B.etat, 0), null);
});

group('régiments — les renforts comptés (v0.116.0)');
test('la réserve dit combien de frais restent et combien ont servi, sans en ajouter chaque jour', () => {
  const B = bridee(), e = B.etat, t = renfortsDe(e, 0);
  assert.equal(t.pris, 0); assert.equal(t.restants, e.reserves[0]); assert.equal(t.total, e.reserves[0]);
  prendreReserve(e, 0);
  assert.deepEqual(renfortsDe(e, 0), { restants: t.restants - 1, pris: 1, total: t.total, plafond: 3 });
  const r = deployer(B, 0); assert.ok(r.ok || r.refus);
  const apres = renfortsDe(e, 0);
  for (let n = 0; n < 2; n++) { while (e.phase === 'jour') avancer(B); aube(B); }
  assert.equal(renfortsDe(e, 0).total, apres.total, 'deux jours passent : aucun régiment frais ne s\'ajoute');
});
test('au plus 3 régiments de renfort par bataille, même avec une grosse réserve (v0.117.0)', () => {
  const B = bridee(), e = B.etat; e.reserves[0] = 6;
  assert.deepEqual(renfortsDe(e, 0), { restants: 3, pris: 0, total: 3, plafond: 3 });
  for (let k = 0; k < 3; k++) prendreReserve(e, 0);
  assert.equal(renfortsDe(e, 0).restants, 0);
  e.phase = 'nuit'; const reg = e.regiments.find(r => r.camp === 0);
  assert.match(refusCorvee(B, reg, 'releve'), /Plafond atteint/);
  e.phase = 'jour'; assert.match(peutDeployer(B, 0).refus, /Plafond atteint/);
});
