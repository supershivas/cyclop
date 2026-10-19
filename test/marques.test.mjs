// Les marques d'un homme (v0.37.0) : lues de l'état, jamais écrites ; une bataille minimale qui fait naître chacune, une qui ne la fait pas.
import { readFileSync } from 'node:fs';
import { nouvelleBataille, avancer, aube, photo, restaurer, mourir, capturer } from '../js/bataille.js';
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
  assert.deepEqual(ids(B, id).filter(n => n > 9), [33], 'cinq à son compte, pas un ni dix');
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
test('0, 1, 4, 5, 9, 10 hommes abattus', () => {
  const B = bat(), A = B.armee, id = homme(B), i = a(B, id);
  const lire = v => { A.victimes[i] = v; return ids(B, id).filter(n => n >= 32 && n <= 34); };
  assert.deepEqual([0, 1, 4, 5, 9, 10, 40].map(lire), [[], [32], [32], [33], [33], [34], [34]]);
});
test('un évacué garde ses victimes ; il les retrouve en revenant', () => {
  const B = bat(), A = B.armee, reg = B.etat.regiments[0];
  let i = 0; while (A.reg[i] !== reg.id || A.id[i] % 3 !== 1) i++;
  const id = A.id[i]; A.blessure[i] = 1; A.victimes[i] = 5;
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
