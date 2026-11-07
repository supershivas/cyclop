// Gestion des régiments (v0.115.0) : les transferts de la nuit, les blessés qui vont à l'hôpital, les régiments frais comptés.
import { nouvelleBataille, avancer, aube, photo, restaurer, deployer } from '../js/bataille.js';
import { planifierTransfert, annulerTransfert, refusTransfert, disponibles, prendreReserve } from '../js/nuit.js';
import { entreeHopital, renfortsDe, patients } from '../js/camp.js';
import { blessesDe, marcheBlesse } from '../js/bataille.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const bridee = (graine = 5) => nouvelleBataille(graine, R, { soldats: 400, jours: 6, camp: true });
const effectif = (B, id) => { let n = 0; for (let i = 0; i < B.armee.n; i++) if (!B.armee.mort[i] && B.armee.reg[i] === id) n++; return n; };
const regs = B => B.etat.regiments.filter(r => r.camp === 0 && r.effectif > 0);

group('régiments — les transferts de la nuit (v0.115.0)');
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
test('« tous » fusionne : le régiment donneur est vide, l\'autre a tout', () => {
  const B = bridee(), [a, b] = regs(B), total = a.effectif + b.effectif;
  B.etat.phase = 'nuit';
  assert.ok(planifierTransfert(B, 0, a.id, b.id, -1).ok);
  assert.equal(disponibles(B, 0, a.id), 0);
  assert.match(planifierTransfert(B, 0, a.id, b.id, 1).refus, /promis/);
  aube(B);
  assert.equal(a.effectif, 0); assert.equal(b.effectif, total); assert.equal(effectif(B, b.id), total);
});
test('les refus se disent : même régiment, camp adverse, trop d\'hommes, transfert croisé', () => {
  const B = bridee(), [a, b, c] = regs(B), eux = B.etat.regiments.find(r => r.camp === 1);
  B.etat.phase = 'nuit';
  assert.match(refusTransfert(B, 0, a.id, a.id, 1), /lui-même/);
  assert.match(refusTransfert(B, 0, a.id, eux.id, 1), /pas le vôtre/);
  assert.match(refusTransfert(B, 0, a.id, b.id, 0), /invalide/);
  assert.ok(planifierTransfert(B, 0, a.id, b.id, 5).ok);
  assert.match(refusTransfert(B, 0, b.id, c.id, 5), /reçoit/, 'un régiment qui reçoit ne donne pas');
  assert.match(refusTransfert(B, 0, c.id, a.id, 5), /envoie/, 'un régiment qui donne ne reçoit pas');
  const trop = planifierTransfert(B, 0, a.id, b.id, 9999);
  assert.ok(trop.ok && trop.tout, 'plus que ce qui reste : tout le reste');
});
test('annuler un transfert le retire ; il survit à la sauvegarde', () => {
  const B = bridee(), [a, b] = regs(B);
  B.etat.phase = 'nuit';
  planifierTransfert(B, 0, a.id, b.id, 10);
  const C = restaurer(photo(B), R);
  assert.deepEqual(C.etat.transferts[0], [{ de: a.id, vers: b.id, n: 10 }]);
  assert.ok(annulerTransfert(B, 0, 0).ok); assert.equal(disponibles(B, 0, a.id), a.effectif);
  assert.match(annulerTransfert(B, 0, 0).refus, /n'existe plus/);
});
test('un régiment relevé dans la nuit perd son transfert (il n\'a plus d\'hommes)', () => {
  const B = bridee(), [a, b] = regs(B), nb = b.effectif;
  B.etat.phase = 'nuit';
  planifierTransfert(B, 0, a.id, b.id, 10);
  aube(B, { [a.id]: 'releve' });
  assert.equal(b.effectif, nb, 'rien n\'a été transféré');
});

group('régiments — les blessés vont à l\'hôpital (v0.115.0)');
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

group('régiments — les renforts comptés (v0.115.0)');
test('la réserve dit combien de frais restent et combien ont servi, sans en ajouter chaque jour', () => {
  const B = bridee(), e = B.etat, t = renfortsDe(e, 0);
  assert.equal(t.pris, 0); assert.equal(t.restants, e.reserves[0]); assert.equal(t.total, e.reserves[0]);
  prendreReserve(e, 0);
  assert.deepEqual(renfortsDe(e, 0), { restants: t.restants - 1, pris: 1, total: t.total });
  const r = deployer(B, 0); assert.ok(r.ok || r.refus);
  const apres = renfortsDe(e, 0);
  for (let n = 0; n < 2; n++) { while (e.phase === 'jour') avancer(B); aube(B); }
  assert.equal(renfortsDe(e, 0).total, apres.total, 'deux jours passent : aucun régiment frais ne s\'ajoute');
});
