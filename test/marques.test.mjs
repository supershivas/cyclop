// Les marques d'un homme (v0.37.0) : lues de l'état, jamais écrites ; une bataille minimale qui fait naître chacune, une qui ne la fait pas.
import { readFileSync } from 'node:fs';
import { nouvelleBataille, avancer, aube, photo, restaurer, mourir, capturer, marquer, ordonnerMarche, ordonnerBarrage, zone } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { tuerDans, construireGrille } from '../js/army.js';
import { BIT, TRAVAUX, IMMOBILE, compteBits } from '../js/marques.js';
import { marquesDe, sejours, ouEst } from '../js/marques.js';
import { MARQUES } from '../js/data/marques.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const bat = (graine = 3) => nouvelleBataille(graine, R, { soldats: 800, jours: 8 });
const ids = (B, id) => marquesDe(B, id).map(m => m.n);
const a = (B, id) => { const A = B.armee; for (let i = 0; i < A.n; i++) if (A.id[i] === id) return i; return -1; };
// un homme de grade ordinaire (ni gradé ni promu) du régiment k, vivant
const homme = (B, k = 0, rang = 6) => { const A = B.armee; for (let i = 0; i < A.n; i++) if (A.reg[i] === k && A.id[i] % 3 === 1) { return A.id[i]; } };
// avance le calendrier sans jouer les jours (les tableaux par jour suivent)
const auJour = (B, j) => { while (B.etat.pertesJour.length < j) B.etat.pertesJour.push([0, 0]); while (B.etat.prises.length < j) B.etat.prises.push([0, 0]); B.etat.jour = j; };
const evac = (B, id, jour, blessure, retour, reg = 0) => B.etat.evacues.push([id, jour, blessure, retour, reg, 0.3, 0, 0]);

group('marques — le catalogue');
test('35 marques, des numéros qui se suivent, une phrase chacune', () => {
  assert.equal(MARQUES.length, 35);
  MARQUES.forEach((m, k) => { assert.equal(m.n, k + 1); assert.ok(m.nom && m.dit && m.famille && m.id, m.id); });
  assert.equal(new Set(MARQUES.map(m => m.id)).size, 35);
});
test('lire les marques ne change rien à la partie ; la partie relue donne les mêmes', () => {
  const B = bat(), id = homme(B);
  evac(B, id, 1, 2, 2); B.etat.grades[id] = [3, 2];
  const avant = JSON.stringify(photo(B)), m = ids(B, id);
  for (let k = 0; k < 5; k++) marquesDe(B, id);
  assert.equal(JSON.stringify(photo(B)), avant);
  assert.deepEqual(ids(restaurer(photo(B), R), id), m);
});
test('le module est pur : ni DOM, ni horloge, ni hasard', () => {
  const s = readFileSync(new URL('../js/marques.js', import.meta.url), 'utf8');
  for (const interdit of ['document', 'window', 'Math.random', 'Date.now', 'performance.now', 'localStorage']) assert.ok(!s.includes(interdit), interdit);
});

group('marques — les séjours au front');
test('un homme du début : un séjour ouvert depuis le jour 1', () => {
  const B = bat(), id = homme(B);
  assert.deepEqual(sejours(B, id), [[1, null]]);
});
test('évacué puis revenu deux fois : trois séjours, le dernier commence le lendemain de la nuit du retour', () => {
  const B = bat(), id = homme(B);
  evac(B, id, 2, 1, 3); evac(B, id, 5, 2, 7);
  assert.deepEqual(sejours(B, id), [[1, 2], [4, 5], [8, null]]);
});
test('évacué et pas revenu : son séjour est clos', () => {
  const B = bat(), id = homme(B);
  evac(B, id, 2, 1, -1);
  assert.deepEqual(sejours(B, id), [[1, 2]]);
});
test('un régiment de la relève arrive le lendemain de la nuit : ses hommes ne sont pas « du premier jour »', () => {
  const B = bat(), reg = B.etat.regiments[0];
  auJour(B, 3); B.etat.phase = 'nuit'; B.etat.reserves[0] = 1;
  aube(B, { [reg.id]: 'releve' });
  const neuf = B.etat.regiments[B.etat.regiments.length - 1], A = B.armee;
  let id = null; for (let i = 0; i < A.n; i++) if (A.reg[i] === neuf.id) { id = A.id[i]; break; }
  assert.equal(neuf.arrive, 4);
  assert.deepEqual(sejours(B, id), [[4, null]]);
  assert.ok(!ids(B, id).includes(9), 'pas du premier jour');
  assert.ok(ids(B, homme(B, 1)).includes(9), 'les autres le sont');
});

group('marques — les blessures dont on est revenu (4 à 7)');
for (const [blessure, n] of [[1, 4], [2, 5], [3, 6]]) {
  test(`blessure ${blessure} : revenu, la marque ${n} ; évacué sans retour, aucune`, () => {
    const B = bat(), id = homme(B);
    evac(B, id, 1, blessure, -1);
    assert.ok(!ids(B, id).includes(n));
    B.etat.evacues[0][3] = 2;
    assert.ok(ids(B, id).includes(n));
    assert.equal(marquesDe(B, id).find(m => m.n === n).jour, 2);
  });
}
test('deux fois revenu : la marque 7 au deuxième retour', () => {
  const B = bat(), id = homme(B);
  evac(B, id, 1, 1, 2);
  assert.ok(!ids(B, id).includes(7));
  evac(B, id, 3, 2, 4);
  assert.ok(ids(B, id).includes(7));
  assert.equal(marquesDe(B, id).find(m => m.n === 7).jour, 4);
});

group('marques — le temps (9 à 13)');
test('du premier jour : celui qui est là depuis le jour 1', () => {
  const B = bat();
  assert.ok(ids(B, homme(B)).includes(9));
});
test('cinq jours de suite : cinq jours au front sans nuit de repos', () => {
  const B = bat(), id = homme(B), reg = B.etat.regiments[0];
  B.etat.jour = 6; B.etat.phase = 'jour';
  B.etat.nuits = [1, 2, 3, 4, 5].map(j => ({ jour: j, choix: { [reg.id]: 'reparer' }, bilan: [] }));
  assert.ok(ids(B, id).includes(10), '1 à 5 sans repos');
  B.etat.nuits[2].choix[reg.id] = 'repos';
  assert.ok(!ids(B, id).includes(10), 'une nuit de repos coupe la série');
  B.etat.jour = 9;
  B.etat.nuits = [1, 2, 3, 4, 5, 6, 7, 8].map(j => ({ jour: j, choix: { [reg.id]: j === 3 ? 'repos' : 'reparer' }, bilan: [] }));
  assert.ok(ids(B, id).includes(10), 'les jours 4 à 8 font cinq');
});
test('sous trois pluies : trois jours de pluie au front, pas deux ; le jour en cours ne compte pas', () => {
  const B = bat(), id = homme(B);
  B.etat.meteo = ['pluie', 'sec', 'pluie', 'pluie', 'sec', 'sec', 'sec', 'sec'];
  B.etat.jour = 4; B.etat.phase = 'jour';
  assert.ok(!ids(B, id).includes(11), 'deux jours finis');
  B.etat.phase = 'nuit';
  assert.ok(ids(B, id).includes(11), 'le troisième est fini');
  assert.equal(marquesDe(B, id).find(m => m.n === 11).jour, 4);
});
test('nuit de gel : une nuit de gel vue du front', () => {
  const B = bat(), id = homme(B);
  B.etat.meteo = ['sec', 'gel', 'sec', 'sec', 'sec', 'sec', 'sec', 'sec'];
  B.etat.nuits = [{ jour: 1, choix: {}, bilan: [] }];
  B.etat.jour = 2;
  assert.ok(!ids(B, id).includes(12));
  B.etat.nuits.push({ jour: 2, choix: {}, bilan: [] }); B.etat.jour = 3;
  assert.ok(ids(B, id).includes(12));
  // celui qui n'était pas encore là
  evac(B, id, 1, 1, 2);       // évacué la nuit 1, revient la nuit 2 : il n'a pas passé la nuit du 2 au front
  assert.ok(!ids(B, id).includes(12), 'absent la nuit de gel');
});
test('au dernier jour : debout quand la bataille est finie', () => {
  const B = bat(), id = homme(B);
  assert.ok(!ids(B, id).includes(13));
  B.etat.phase = 'fin';
  assert.ok(ids(B, id).includes(13));
});

group('marques — le commandement (22, 23)');
test('gradé de circonstance : promu ; a pris le régiment : promu au rang 0', () => {
  const B = bat(), id = homme(B);
  assert.ok(!ids(B, id).some(n => n === 22 || n === 23));
  B.etat.grades[id] = [3, 2];
  assert.ok(ids(B, id).includes(22) && !ids(B, id).includes(23));
  B.etat.grades[id] = [0, 2];
  assert.ok(ids(B, id).includes(22) && ids(B, id).includes(23));
});
test('le capitaine du départ n\'a pas « pris » son régiment', () => {
  const B = bat(), A = B.armee;
  const capitaine = A.id[0];            // le premier numéro du premier régiment : capitaine de création
  assert.ok(!ids(B, capitaine).includes(23));
});
test('un capitaine tombé : le plus proche en dessous prend le régiment (22 et 23), la partie en fait la promotion', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0];
  const cap = A.id[0];
  mourir(B, 0, 'balle');
  const promus = Object.entries(B.etat.grades).filter(([, g]) => g[0] === 0);
  assert.equal(promus.length, 1);
  const id = Number(promus[0][0]);
  assert.ok(ids(B, id).includes(22) && ids(B, id).includes(23));
  assert.notEqual(id, cap);
});

group('marques — les statuts d\'un régiment (28, 29)');
test('du jour refusé : seulement le jour refusé', () => {
  const B = bat(), id = homme(B), reg = B.etat.regiments[0];
  reg.refus = B.etat.jour;
  assert.ok(ids(B, id).includes(28));
  reg.refus = B.etat.jour - 1;
  assert.ok(!ids(B, id).includes(28), 'effacé le lendemain');
  reg.refus = B.etat.jour + 1;
  assert.ok(!ids(B, id).includes(28), 'pas avant');
});
test('parmi les douze derniers : douze hommes debout au plus, les blessés ne comptent pas', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0], id = homme(B);
  const siens = []; for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) siens.push(i);
  assert.ok(!ids(B, id).includes(29));
  for (const i of siens) if (A.id[i] !== id) A.blessure[i] = 1;
  assert.ok(ids(B, id).includes(29), 'un seul debout');
  for (const i of siens.slice(0, 20)) A.blessure[i] = 0;
  assert.ok(!ids(B, id).includes(29), 'vingt debout');
});

group('marques — la fin (30, 31)');
test('un mort garde ses victimes ; la marque du fusil se lit sur sa fiche', () => {
  const B = bat(), A = B.armee, i = 5, id = A.id[i];
  A.victimes[i] = 6;
  mourir(B, i, 'balle');
  const c = B.etat.corps.find(c => c[4] === id);
  assert.equal(c[5], 6);
  assert.equal(ouEst(B, id).genre, 'mort');
  assert.deepEqual(ids(B, id).filter(n => n > 9), [34], 'cinq à son compte, pas un ni trois');
});
test('enterré par les siens : inhumé la nuit ; il garde ses victimes dans sa tombe', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0];
  let i = 0; while (A.reg[i] !== reg.id) i++;
  const id = A.id[i], x = A.x[i], y = A.y[i];
  A.victimes[i] = 2;
  mourir(B, i, 'balle');
  B.etat.phase = 'nuit'; aube(B, { [reg.id]: 'inhumer' });
  const t = B.etat.tombes.find(t => t[4] === id);
  assert.ok(t, 'inhumé');
  assert.equal(t[5], 2); assert.equal(t[7], 1);
  assert.deepEqual(ids(B, id).filter(n => n > 9).sort((u, v) => u - v), [30, 32]);
});
test('resté dans l\'entonnoir : un corps que trois nuits n\'ont pas relevé', () => {
  const B = bat(), A = B.armee, i = 5, id = A.id[i];
  mourir(B, i, 'balle');
  for (let k = 0; k < 2; k++) { B.etat.phase = 'nuit'; aube(B, {}); }
  assert.ok(!ids(B, id).includes(31), 'deux nuits');
  B.etat.phase = 'nuit'; aube(B, {});
  assert.ok(ids(B, id).includes(31), 'trois nuits');
});

group('marques — le fusil (32 à 34) : le palier le plus haut seulement');
test('0, 1, 2, 3, 4, 5 hommes abattus', () => {
  const B = bat(), A = B.armee, id = homme(B), i = a(B, id);
  const lire = v => { A.victimes[i] = v; return ids(B, id).filter(n => n >= 32 && n <= 34); };
  assert.deepEqual([0, 1, 2, 3, 4, 5, 40].map(lire), [[], [32], [32], [33], [33], [34], [34]]);
});
test('un évacué garde ses victimes ; il les retrouve en revenant', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0];
  let i = 0; while (A.reg[i] !== reg.id || A.id[i] % 3 !== 1) i++;
  const id = A.id[i]; A.blessure[i] = 1; A.victimes[i] = 3;
  B.etat.phase = 'nuit'; aube(B, { [reg.id]: 'evacuer' });
  assert.equal(ouEst(B, id).genre, 'evacue');
  assert.deepEqual(ids(B, id).filter(n => n > 9), [33]);
});
test('un prisonnier garde ses victimes', () => {
  const B = bat(), A = B.armee, i = 7, id = A.id[i];
  A.victimes[i] = 1;
  capturer(B, i);
  assert.equal(ouEst(B, id).genre, 'prisonnier');
  assert.deepEqual(ids(B, id).filter(n => n > 9), [32]);
});

group('marques — l\'ordre de la rangée');
test('les plus récentes d\'abord, puis celles sans date, dans l\'ordre du catalogue', () => {
  const B = bat(), A = B.armee, id = homme(B), i = a(B, id);
  evac(B, id, 1, 1, 2); B.etat.grades[id] = [3, 4]; A.victimes[i] = 1;
  B.etat.jour = 5;
  const m = marquesDe(B, id);
  assert.deepEqual(m.map(x => x.n), [22, 4, 9, 32]);
  assert.equal(m[3].jour, null);
});

group('marques — les icônes');
test('chaque marque a un dessin de 9 × 9 cases dans la palette (t, s, .), un sigle, et sa famille un cadre', async () => {
  const { ICONES, SIGLES } = await import('../js/data/marques-icones.js');
  const { FAMILLES } = await import('../js/data/marques.js');
  const { CADRES } = await import('../js/hud/marques.js');
  for (const m of MARQUES) {
    const d = ICONES[m.id];
    assert.ok(d && d.length === 9 && d.every(l => /^[.ts]{9}$/.test(l)), m.id);
    assert.ok(d.some(l => /[ts]/.test(l)), `${m.id} : un dessin vide`);
    assert.ok(SIGLES[m.id], m.id);
    assert.ok(CADRES[FAMILLES[m.famille].cadre], m.famille);
  }
  assert.equal(new Set(Object.values(FAMILLES).map(f => f.cadre)).size, Object.keys(FAMILLES).length, 'un cadre par famille');
  assert.equal(new Set(Object.values(ICONES).map(d => d.join())).size, 35, 'deux marques ne se dessinent pas pareil');
});

// ─── Lot 3 : les événements comptés (A.marques) ───
const aDeBit = (B, id, bit) => { const A = B.armee, i = a(B, id); return i >= 0 && (A.marques[i] & bit) !== 0; };
const nuit = (B, choix = {}) => { B.etat.phase = 'nuit'; return aube(B, choix); };

group('marques — les événements comptés : l\'obus');
test('baptisé du feu : survit à un obus tombé tout près ; secoué par le souffle : jeté par lui', () => {
  const B = bat(), A = B.armee, T = B.terrain;
  const [p, q, loin] = [0, 1, 2].map(k => k);
  // trois hommes de chez nous : l'un tout près du point de chute, l'un à l'anneau du souffle, l'un très loin
  const x0 = 100, y0 = 100, rayon = 10;
  const place = (i, d) => { A.x[i] = x0 + d; A.y[i] = y0; A.vx[i] = A.vy[i] = 0; };
  place(p, 2); place(q, 17); place(loin, 150);
  for (let i = 3; i < A.n; i++) { A.x[i] = 300 + (i % 50); A.y[i] = 300; }
  construireGrille(A);
  const ctx = { T, R, rng: () => 0.999, frapper: () => {}, abri: null };
  tuerDans(A, x0, y0, rayon, ctx, 1);
  assert.ok(A.marques[p] & BIT.bapteme, 'tout près, vivant');
  assert.ok(!(A.marques[q] & BIT.bapteme), 'à 17 m : pas tout près');
  assert.ok(A.marques[p] & BIT.souffle, 'jeté par le souffle');
  assert.ok(!(A.marques[loin] & (BIT.bapteme | BIT.souffle)), 'très loin : rien');
  assert.ok(!(A.marques[q] & BIT.souffle), 'à l\'anneau, le souffle ne le jette pas assez');
});
test('l\'obus qui le tue ne lui laisse pas la marque', () => {
  const B = bat(), A = B.armee, T = B.terrain;
  A.x[0] = 100; A.y[0] = 100;
  for (let i = 1; i < A.n; i++) { A.x[i] = 300 + (i % 50); A.y[i] = 300; }
  construireGrille(A);
  tuerDans(A, 100, 100, 10, { T, R, rng: () => 0, frapper: i => { A.mort[i] = 1; }, abri: null }, 1);
  assert.ok(!(A.marques[0] & BIT.bapteme));
});
test('déterré : sorti vivant d\'un abri crevé par un 220 ; sans abri, aucune marque', () => {
  const lancer = abris => {
    const B = nouvelleBataille(7, R, { soldats: 800, jours: 3 });
    if (abris) for (let k = 0; k < B.troncons.length; k++) B.etat.abris[k] = 1;
    const Z = zone(B), L = B.lignes.find(l => l.camp === 0 && l.rang === 0), x = Z.x0 + 200;
    ordonnerBarrage(B, '220', x, ligneY(L, x));
    B.etat.barrages[0].reste = 60;        // une longue salve : de quoi en poser quelques-uns sur la tranchée
    for (let k = 0; k < 2400; k++) avancer(B);
    let n = 0; for (let i = 0; i < B.armee.n; i++) if (B.armee.marques[i] & BIT.deterre) n++;
    return n;
  };
  assert.equal(lancer(false), 0);
  assert.ok(lancer(true) > 0, 'des hommes sortis de l\'abri');
});

group('marques — les événements comptés : la peur et la déroute');
test('a tremblé : la peur dépasse la terreur ; la marque s\'efface à l\'aube', () => {
  const B = bat(), id = homme(B), i = a(B, id);
  B.armee.peur[i] = 0.95;
  for (let k = 0; k < 30; k++) avancer(B);
  assert.ok(aDeBit(B, id, BIT.tremble) && ids(B, id).includes(25));
  nuit(B);
  assert.ok(!aDeBit(B, id, BIT.tremble) && !ids(B, id).includes(25), 'effacée après une nuit');
});
test('n\'a pas reflué : trois secondes immobile pendant la déroute ; rallié : les autres, au ralliement ; ces statuts durent une nuit', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0];
  const siens = []; for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) siens.push(i);
  const [fixe, fuit, blesse] = siens, idF = A.id[fixe], idU = A.id[fuit];
  A.blessure[blesse] = 1;
  reg.deroute = true; reg.moral = 0;
  for (let k = 0; k < 3; k++) { A.vx[fixe] = A.vy[fixe] = 0; A.vx[fuit] = 3; A.vy[fuit] = 0; A.vx[blesse] = A.vy[blesse] = 0; marquer(B); }
  assert.ok(aDeBit(B, idF, BIT.pasReflue), 'resté en place');
  assert.ok(!aDeBit(B, idU, BIT.pasReflue), 'a reflué');
  assert.ok(!(A.marques[blesse] & BIT.pasReflue), 'un blessé qui ne bouge pas n\'a pas tenu un poste');
  assert.equal(compteBits(A.marques[fixe], IMMOBILE), 3);
  reg.moral = 1;
  for (let k = 0; k < 31; k++) avancer(B);
  assert.equal(reg.deroute, false, 'rallié');
  assert.ok(aDeBit(B, idU, BIT.rallie) && ids(B, idU).includes(27));
  assert.ok(!aDeBit(B, idF, BIT.rallie), 'celui qui n\'a pas reflué n\'est pas « rallié »');
  nuit(B);
  for (const id of [idF, idU]) assert.ok(!ids(B, id).some(n => n >= 25 && n <= 27), 'effacés');
});
test('a regagné l\'arrière à pied : un blessé léger arrivé à l\'arrière en marchant ; la tête reste à terre', () => {
  const B = bat(), A = B.armee, ar = arriereDe(B)[0];
  const [u, v] = [3, 4];
  A.blessure[u] = 1; A.blessure[v] = 3;
  for (const i of [u, v]) { A.y[i] = ar + 0.5; A.x[i] = 200 + i; }
  marquer(B);
  assert.ok(A.marques[u] & BIT.aPied);
  assert.ok(!(A.marques[v] & BIT.aPied));
});
import { arriereDe } from '../js/bataille.js';

group('marques — les événements comptés : un tronçon pris');
// un tronçon de la 1re ligne (de `camp`), des défenseurs de l'autre camp épinglés, vingt attaquants épinglés dans une case
function prise(nDef, { perdu = false, campLigne = 1 } = {}) {
  const B = nouvelleBataille(3, R, { soldats: 400, jours: 3 });
  const k = B.troncons.findIndex(t => B.lignes[t.ligne].camp === campLigne && B.lignes[t.ligne].rang === 0), A = B.armee, T = B.terrain;
  const att = 1 - campLigne, def = campLigne;
  if (perdu) B.etat.troncons[k] = att;                 // le tronçon est tombé, on le reprend
  const cases = []; for (let c = 0; c < T.troncon.length && cases.length < 40; c++) if (T.troncon[c] === k) cases.push(c);
  const [cx, cy] = [cases[0] % T.W, Math.floor(cases[0] / T.W)];
  const dans = i => T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] === k;
  const defs = [], atts = [];
  const tenant = perdu ? att : def;                    // qui tient le tronçon au départ (les défenseurs)
  for (let i = 0; i < A.n; i++) if (dans(i)) A.y[i] += 40;       // les autres hommes du tronçon, loin
  for (let i = 0; i < A.n && defs.length < nDef; i++) if (A.camp[i] === tenant) defs.push(i);
  const attaquants = 1 - tenant;
  const r0 = B.etat.regiments.filter(r => r.camp === attaquants).map(r => r.id);
  for (const r of r0.slice(0, 2)) { let n = 0; for (let i = 0; i < A.n && n < 10; i++) if (A.reg[i] === r && !defs.includes(i)) { atts.push(i); n++; } }
  atts.forEach((i, n) => { A.exp[i] = 0.1 + 0.04 * (n % 10); });
  const profond = atts[0];
  const epingler = () => {
    defs.forEach(i => { A.x[i] = cx + 0.5; A.y[i] = cy + 0.5; A.mort[i] = 0; });
    atts.forEach(i => { A.x[i] = cx + 0.5; A.y[i] = cy + (i === profond ? (attaquants === 1 ? 0.95 : 0.05) : 0.5); A.mort[i] = 0; });
  };
  const dits = [];        // les marques rares que le carnet de bord reprend
  for (let s = 0; s < 30 * 14 && B.etat.troncons[k] === tenant; s++) { epingler(); for (const e of avancer(B)) if (e.type === 'marque') dits.push(e); }
  return { B, k, defs, atts, profond, attaquants, dits, ok: B.etat.troncons[k] === attaquants };
}
const bits = (B, i) => B.armee.marques[i];
test('entré le premier : le plus avancé des attaquants, lui seul', () => {
  const { B, atts, profond, ok, dits } = prise(3);
  assert.ok(ok, 'le tronçon est pris');
  const lui = atts.filter(i => bits(B, i) & BIT.entrePremier);
  assert.deepEqual(lui, [profond]);
  assert.deepEqual(dits.filter(e => e.marque === 'entre-premier').map(e => e.id), [B.armee.id[profond]], 'le carnet le dit');
});
test('a tenu seul : le dernier défenseur, pas l\'un de trois', () => {
  const seul = prise(1), trois = prise(3);
  assert.ok(seul.ok && trois.ok);
  assert.ok(bits(seul.B, seul.defs[0]) & BIT.tenuSeul);
  assert.equal(seul.dits.filter(e => e.marque === 'tenu-seul').length, 1, 'le carnet le dit');
  assert.ok(trois.defs.every(i => !(bits(trois.B, i) & BIT.tenuSeul)));
});
test('tronçon repris : ceux qui reprennent un tronçon de leur ligne ; qui prend celui de l\'autre ne le reprend pas', () => {
  const repris = prise(3, { perdu: true, campLigne: 0 }), neuf = prise(3);
  assert.ok(repris.ok && neuf.ok);
  assert.ok(repris.atts.every(i => bits(repris.B, i) & BIT.repris), 'ils le reprennent');
  assert.ok(neuf.atts.every(i => !(bits(neuf.B, i) & BIT.repris)), 'ils le prennent');
});
test('cité à l\'ordre du régiment : le plus aguerri des entrés, un par régiment et par jour', () => {
  const { B, atts, dits } = prise(3);
  assert.equal(dits.filter(e => e.marque === 'cite').length, 2, 'le carnet le dit, une fois par régiment');
  const cites = atts.filter(i => bits(B, i) & BIT.cite);
  const regs = new Set(atts.map(i => B.armee.reg[i]));
  assert.equal(cites.length, regs.size, 'un par régiment');
  for (const r of regs) {
    const siens = atts.filter(i => B.armee.reg[i] === r), meilleur = siens.reduce((m, i) => B.armee.exp[i] > B.armee.exp[m] ? i : m, siens[0]);
    assert.ok(bits(B, meilleur) & BIT.cite, `le plus aguerri du régiment ${r}`);
  }
  // le même jour, un régiment déjà cité ne l'est plus
  const Bn = nouvelleBataille(3, R, { soldats: 400, jours: 3 });
  assert.ok(Bn.etat.regiments.every(r => r.cite === undefined));
});

group('marques — les événements comptés : l\'arme');
test('a abattu un gradé : un tireur qui tue un capitaine reçoit la marque ; qui tue un simple soldat, non', () => {
  const duel = victime => {
    const Rd = structuredClone(R); Rd.tir.precision = 0.9;       // (un duel : le fusil touche presque toujours)
    const B = nouvelleBataille(5, Rd, { soldats: 400, jours: 3 }), A = B.armee;
    const tireur = A.id.findIndex((id, i) => i < A.n && A.camp[i] === 0 && A.reg[i] === 0 && id % 7 === 3);
    const regE = B.etat.regiments.find(r => r.camp === 1);
    let cible = -1;
    for (let i = 0; i < A.n; i++) if (A.camp[i] === 1 && A.reg[i] === regE.id && (victime === 'capitaine' ? A.id[i] === B.etat.regiments.slice(0, regE.id).reduce((s, r) => s + r.initial, 0) : A.id[i] % 7 === 5)) { cible = i; break; }
    for (let i = 0; i < A.n; i++) if (i !== tireur && i !== cible) { A.x[i] = 5; A.y[i] = 5 + (i % 40); }
    const idT = A.id[tireur], idC = A.id[cible];
    A.exp[tireur] = 1;
    for (let s = 0; s < 4000; s++) {
      const t = a(B, idT), c = a(B, idC);
      if (c < 0) break;
      A.x[t] = 420; A.y[t] = 320; A.x[c] = 420; A.y[c] = 295; A.vx[t] = A.vy[t] = 0; A.vx[c] = A.vy[c] = 0; A.peur[c] = 0;
      avancer(B);
    }
    return { B, idT, idC, mort: a(B, idC) < 0 };
  };
  const g = duel('capitaine'), s = duel('soldat');
  assert.ok(g.mort && s.mort, 'les deux cibles sont tombées');
  assert.ok(aDeBit(g.B, g.idT, BIT.gradeAbattu) && ids(g.B, g.idT).includes(35), 'le capitaine');
  assert.ok(!aDeBit(s.B, s.idT, BIT.gradeAbattu), 'le simple soldat');
});

group('marques — les événements comptés : les nuits');
test('un coup de main : ceux qui en reviennent portent la marque', () => {
  const B = nouvelleBataille(7, R, { soldats: 800, jours: 3 }), reg = B.etat.regiments.find(r => r.camp === 0);
  nuit(B, { [reg.id]: 'coup' });
  assert.ok(B.etat.nuits[0].bilan[0].coups, 'le coup de main a eu lieu');
  let n = 0; for (let i = 0; i < B.armee.n; i++) if (B.armee.marques[i] & BIT.coup) n++;
  assert.ok(n > 0 && n <= R.nuit.coupHommes);
});
test('pelle et pioche : trois nuits de travaux, valide ; les autres corvées, les blessés, non', () => {
  const B = bat(), reg = B.etat.regiments[0], A = B.armee, ok = homme(B), iOk = a(B, ok);
  const blesse = A.id.findIndex((id, i) => i < A.n && A.reg[i] === 0 && i !== iOk && id % 3 === 1);
  A.blessure[blesse] = 1; const idB = A.id[blesse];
  nuit(B, { [reg.id]: 'caillebotis' }); assert.ok(!ids(B, ok).includes(14), 'une nuit');
  nuit(B, { [reg.id]: 'caillebotis' }); assert.ok(!ids(B, ok).includes(14), 'deux nuits');
  nuit(B, { [reg.id]: 'caillebotis' });
  assert.ok(ids(B, ok).includes(14), 'trois nuits');
  assert.ok(!ids(B, idB).includes(14), 'le blessé n\'a pas travaillé');
  const C = bat(); for (let k = 0; k < 3; k++) nuit(C, { [C.etat.regiments[0].id]: 'repos' });
  assert.ok(!ids(C, homme(C)).includes(14), 'le repos n\'est pas un travail');
});
test('brancardier, porteur de terre, la soupe par les boyaux : la corvée du régiment, pour ceux qui sont valides', () => {
  const B = bat(), reg = B.etat.regiments[0], A = B.armee, id = homme(B);
  const blesse = A.id.findIndex((x, i) => i < A.n && A.reg[i] === 0 && x % 3 === 1 && x !== id);
  A.blessure[blesse] = 3; const idB = A.id[blesse];
  for (let i = 0; i < 6; i++) { mourir(B, 20 + i, 'balle'); }      // des corps à porter en terre, tout près
  nuit(B, { [reg.id]: 'ravitailler' });
  assert.ok(ids(B, id).includes(17) && !ids(B, id).includes(15));
  nuit(B, { [reg.id]: 'inhumer' });
  assert.ok(ids(B, id).includes(16), 'porteur de terre');
  nuit(B, { [reg.id]: 'evacuer' });
  assert.ok(ids(B, id).includes(15), 'brancardier');
  assert.ok(!aDeBit(B, idB, BIT.soupe) || ouEst(B, idB).genre !== 'vivant', 'le blessé n\'a rien porté');
});
test('un évacué garde ses marques et les retrouve en revenant ; un mort et un prisonnier aussi', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0];
  let i = 0; while (A.reg[i] !== reg.id || A.id[i] % 3 !== 1) i++;
  const id = A.id[i]; A.blessure[i] = 1; A.marques[i] = BIT.souffle | BIT.cite | BIT.tremble;
  nuit(B, { [reg.id]: 'evacuer' });
  const e = B.etat.evacues.find(e => e[0] === id);
  assert.equal(e[7], BIT.souffle | BIT.cite, 'sans le statut');
  assert.deepEqual(ids(B, id).filter(n => n === 2 || n === 24 || n === 25), [2, 24]);
  // il revient (une chance sur deux, après un jour pour le bras) : ses marques reviennent avec lui
  for (let k = 0; k < 4 && !B.etat.evacues.some(x => x[0] === id && x[3] !== 0); k++) nuit(B, {});
  const rev = B.etat.evacues.find(x => x[0] === id);
  if (rev[3] > 0) assert.ok(aDeBit(B, id, BIT.souffle | BIT.cite), 'revenu avec ses marques');
  const j = 9, idM = A.id[j]; A.marques[j] = BIT.bapteme; mourir(B, j, 'balle');
  assert.ok(ids(B, idM).includes(1), 'le mort');
  const k2 = 11, idP = A.id[k2]; A.marques[k2] = BIT.coup; capturer(B, k2);
  assert.ok(ids(B, idP).includes(18), 'le prisonnier');
});

group('marques — rien ne change la partie');
const REFERENCE9000 = {      // relevé sur le code d'avant les événements comptés (lot 2) : morts, blessés, hasard, empreinte
  3: { pertes: [130, 20], blesses: [85, 23], rng: 4046103909, emp: '951d1ce9' },
  7: { pertes: [121, 22], blesses: [99, 14], rng: 2819399367, emp: '6a6d06c5' },
  8: { pertes: [143, 21], blesses: [93, 14], rng: 1524836149, emp: 'e851f89f' },
};
for (const g of [3, 7, 8]) {
  test(`un assaut de 9 000 pas : mêmes morts, mêmes blessés, même hasard qu'avant les marques (graine ${g})`, () => {
    const B = nouvelleBataille(g, R, { soldats: 400, jours: 3 });
    const L = B.lignes.find(l => l.camp === 1 && l.rang === 0), Z = zone(B), x = Z.x0 + 200;
    ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).map(r => r.id), x, ligneY(L, x));
    for (let k = 0; k < 9000; k++) avancer(B);
    assert.deepEqual({ pertes: B.etat.pertes, blesses: B.etat.blesses, rng: B.etat.rng, emp: empreinteEtat(B) }, REFERENCE9000[g]);
    let avec = 0; for (let i = 0; i < B.armee.n; i++) if (B.armee.marques[i]) avec++;
    assert.ok(avec > 0, 'des hommes marqués');
  });
}
test('la partie relue au milieu garde les bits ; jouée ensuite, elle reste la même', () => {
  const B = nouvelleBataille(7, R, { soldats: 400, jours: 3 }), L = B.lignes.find(l => l.camp === 1 && l.rang === 0), Z = zone(B), x = Z.x0 + 200;
  ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).map(r => r.id), x, ligneY(L, x));
  for (let k = 0; k < 2400; k++) avancer(B);
  const C = restaurer(photo(B), R);
  assert.deepEqual(Array.from(C.armee.marques.subarray(0, C.armee.n)), Array.from(B.armee.marques.subarray(0, B.armee.n)));
  for (let k = 0; k < 600; k++) { avancer(B); avancer(C); }
  assert.deepEqual(Array.from(C.armee.marques.subarray(0, C.armee.n)), Array.from(B.armee.marques.subarray(0, B.armee.n)));
  assert.equal(empreinteEtat(C), empreinteEtat(B));
});
