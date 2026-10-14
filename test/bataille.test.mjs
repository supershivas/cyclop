// La bataille : déterminisme, ordres refusés à voix haute, sauvegarde qui rejoue la même partie.
import { readFileSync } from 'node:fs';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, aube, photo, restaurer, effectifs, horloge, zone, tronconsTenus, rangDe, moralEnMots } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { tronconsDe, refusCorvee } from '../js/nuit.js';
import { identite, etatEnMots } from '../js/identite.js';
import { SECTEURS } from '../js/data/secteur.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const petite = (graine = 3) => nouvelleBataille(graine, R, { soldats: 200 });
// (x, y) dans le secteur → dans le terrain (les marges autour)
const M = SECTEURS.essai.marges, P = (x, y) => [x + M.x, y + M.y];
const empreinte = B => JSON.stringify(photo(B));

group('bataille');
test('même graine, mêmes ordres : même bataille', () => {
  const a = petite(), b = petite();
  for (const B of [a, b]) { ordonnerMarche(B, [0, 1], ...P(150, 150)); ordonnerBarrage(B, '155', ...P(200, 90)); }
  for (let k = 0; k < 600; k++) { avancer(a); avancer(b); }
  assert.equal(empreinte(a), empreinte(b));
});
test('le compteur de pertes est juste : morts + vivants = l\'effectif de départ', () => {
  const B = petite();
  ordonnerBarrage(B, '220', ...P(100, 216)); ordonnerBarrage(B, '155', ...P(300, 84), 1);
  for (let k = 0; k < 900; k++) avancer(B);
  const [nous, eux] = effectifs(B);
  assert.equal(nous + B.etat.pertes[0], 200);
  assert.equal(eux + B.etat.pertes[1], 200);
  assert.equal(B.armee.n, nous + eux);
  assert.ok(B.etat.pertes[0] + B.etat.pertes[1] > 0, 'des morts');
});
test('les morts restent où ils sont tombés : un corps par mort, gardé par la sauvegarde', () => {
  const B = petite();
  ordonnerBarrage(B, '220', ...P(100, 216)); ordonnerBarrage(B, '155', ...P(300, 84), 1);
  for (let k = 0; k < 900; k++) avancer(B);
  const C = B.etat.corps;
  assert.equal(C.length, B.etat.pertes[0] + B.etat.pertes[1]);
  const vivants = new Set(Array.from(B.armee.id.subarray(0, B.armee.n)));
  for (const c of C) assert.ok(!vivants.has(c[4]), 'un corps est un homme qui n\'est plus dans la foule');
  assert.deepEqual(restaurer(photo(B), R).etat.corps, C);
});
test('un ordre impossible se refuse, avec sa raison', () => {
  const B = petite();
  assert.match(ordonnerMarche(B, [], ...P(10, 10)).refus, /Aucun régiment/);
  assert.match(ordonnerMarche(B, [0], -5, 10).refus, /Hors du secteur/);
  assert.match(ordonnerMarche(B, [0], ...P(-20, 10)).refus, /Hors du secteur/, 'les marges ne prennent pas d\'ordres');
  assert.match(ordonnerMarche(B, [9], ...P(10, 10)).refus, /Aucun régiment/, 'un régiment d\'en face ne nous obéit pas');
  assert.ok(ordonnerBarrage(B, '75', ...P(200, 100)).ok);
  assert.match(ordonnerBarrage(B, '75', ...P(200, 100)).refus, /recharge/);
  assert.match(ordonnerBarrage(B, '420', 200, 100).refus, /Pas de batterie/);
});
test('la journée finit à 18 h, la nuit attend l\'aube, puis le dernier jour finit la bataille', () => {
  const B = petite();
  let n = 0;
  while (B.etat.phase === 'jour') { avancer(B); n++; }
  assert.equal(B.etat.phase, 'nuit');
  assert.equal(horloge(B).heure, 18);
  assert.equal(avancer(B).length, 0, 'rien ne bouge la nuit');
  assert.match(ordonnerMarche(B, [0], ...P(100, 100)).refus, /aube/);
  assert.ok(aube(B).ok);
  assert.equal(B.etat.jour, 2);
  while (B.etat.phase !== 'fin') { if (B.etat.phase === 'nuit') aube(B); avancer(B); }
  assert.equal(B.etat.jour, B.etat.meteo.length);
  assert.ok(n > 1000);
});
test('il pleut au moins un jour (le lot minimal doit voir venir la boue), jamais le premier', () => {
  for (let g = 1; g < 30; g++) {
    const m = nouvelleBataille(g, R, { soldats: 20 }).etat.meteo;
    assert.ok(m.includes('pluie'), `graine ${g} : ${m}`);
    assert.equal(m[0], 'sec');
  }
});

test('le secteur est entouré de marges, et les régiments sont dedans', () => {
  const B = petite();
  const Z = zone(B);
  assert.equal(B.terrain.W, Z.x1 + M.x); assert.equal(B.terrain.H, Z.y1 + M.y);
  for (let i = 0; i < B.armee.n; i++) assert.ok(B.armee.x[i] > Z.x0 && B.armee.x[i] < Z.x1 && B.armee.y[i] > Z.y0 && B.armee.y[i] < Z.y1);
});
test('touchés, certains meurent et d\'autres sont blessés ; blessé deux fois, on meurt', () => {
  const B = petite(8);
  for (let k = 0; k < 8; k++) ordonnerBarrage(B, '155', ...P(25 + k * 50, 233), 1);
  for (let k = 0; k < 900; k++) avancer(B);
  assert.ok(B.etat.blesses[0] > 0 && B.etat.pertes[0] > 0, `${B.etat.blesses[0]} blessés, ${B.etat.pertes[0]} morts`);
  let blesses = 0;
  for (let i = 0; i < B.armee.n; i++) if (B.armee.blessure[i]) blesses++;
  assert.ok(blesses > 0 && blesses <= B.etat.blesses[0]);
});
test('chaque soldat a un nom, un âge, un grade : toujours les mêmes pour la même graine', () => {
  const a = identite(5, 0, 17), b = identite(5, 0, 17), c = identite(5, 1, 17);
  assert.deepEqual(a, b);
  assert.ok(a.prenom && a.nom && a.age >= 19 && a.age <= 45 && a.grade);
  // la hiérarchie d'un régiment de 125 : un capitaine, deux lieutenants, un adjudant, des sergents, des caporaux, des soldats
  const grades = Array.from({ length: 125 }, (_, k) => identite(5, 0, k, k, 125).grade);
  const n = g => grades.filter(x => x === g).length;
  assert.equal(grades[0], 'capitaine'); assert.equal(n('capitaine'), 1);
  assert.equal(n('lieutenant') + n('sous-lieutenant'), 2); assert.equal(n('adjudant'), 1);
  assert.equal(n('sergent'), 10); assert.equal(n('caporal'), 21);
  assert.ok(n('soldat de 1re classe') > 10 && n('soldat de 2e classe') > 50);
  assert.equal(identite(5, 1, 0, 0, 125).grade, 'Hauptmann');
  assert.notDeepEqual(a, c);
  const noms = new Set(Array.from({ length: 200 }, (_, i) => { const x = identite(5, 0, i); return x.prenom + x.nom; }));
  assert.ok(noms.size > 150, 'peu de doublons');
  assert.deepEqual(etatEnMots(0, 0, 0, 0), ['reposé, calme']);
  assert.deepEqual(etatEnMots(0.8, 0.5, 0.9, 2), ['blessé à la jambe', 'jambes épuisées', 'bras las', 'terrifié']);
});
test('les numéros des soldats restent les leurs après les morts', () => {
  const B = petite(8);
  const avant = new Map();
  for (let i = 0; i < B.armee.n; i++) avant.set(B.armee.id[i], B.armee.camp[i]);
  ordonnerBarrage(B, '220', ...P(150, 216));
  for (let k = 0; k < 600; k++) avancer(B);
  const vus = new Set();
  for (let i = 0; i < B.armee.n; i++) { const id = B.armee.id[i]; assert.ok(!vus.has(id)); vus.add(id); assert.equal(avant.get(id), B.armee.camp[i]); }
});

group('sauvegarde');
test('une bataille relue est la même, et se comporte pareil', () => {
  const A = petite(11);
  ordonnerMarche(A, [0, 1, 2], ...P(200, 160)); ordonnerBarrage(A, '155', ...P(180, 120));
  for (let k = 0; k < 450; k++) avancer(A);
  const p = JSON.parse(JSON.stringify(photo(A)));
  const B = restaurer(p, R);
  assert.equal(empreinte(B), empreinte(A));
  assert.deepEqual(B.terrain.diff, A.terrain.diff);
  assert.deepEqual(B.terrain.eau, A.terrain.eau);
  for (let k = 0; k < 600; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('relue après une nuit, la bataille rejoue aussi l\'eau de la nuit', () => {
  const A = petite(4);
  ordonnerBarrage(A, '220', ...P(200, 150));
  while (A.etat.phase === 'jour') avancer(A);
  aube(A);
  for (let k = 0; k < 300; k++) avancer(A);
  const B = restaurer(JSON.parse(JSON.stringify(photo(A))), R);
  assert.deepEqual(B.terrain.humid, A.terrain.humid);
  for (let k = 0; k < 300; k++) { avancer(A); avancer(B); }
  assert.equal(empreinte(B), empreinte(A));
});
test('la sauvegarde ne contient pas le relief (graine et impacts seulement)', () => {
  const B = petite();
  const p = photo(B);
  assert.ok(!('terrain' in p) && !('base' in p) && Array.isArray(p.impacts));
});

test('une sauvegarde d\'avant les marges (v0.2) se relit : tout glisse dans le secteur', () => {
  const A = petite(4);
  ordonnerBarrage(A, '155', ...P(200, 150));
  for (let k = 0; k < 300; k++) avancer(A);
  // la même partie, écrite comme en v0.2 : sans marges, sans numéros ni fatigue
  const p = JSON.parse(JSON.stringify(photo(A)));
  delete p.marges; delete p.blesses;
  for (const imp of p.impacts) { imp[2] -= M.x * 10; imp[3] -= M.y * 10; }
  for (const r of p.regiments) for (const o of [r.ordre, r.depart]) { o.x -= M.x; o.y -= M.y; }
  for (const b of p.barrages) { b.x -= M.x; b.y -= M.y; }
  const xs = Float32Array.from({ length: p.armee.n }, (_, i) => A.armee.x[i] - M.x);
  p.armee.x = Buffer.from(xs.buffer).toString('base64');
  for (const k of ['id', 'fatJ', 'fatB', 'peur', 'blessure']) delete p.armee[k];
  const B = restaurer(p, R);
  assert.deepEqual(B.terrain.diff, A.terrain.diff);
  for (let i = 0; i < A.armee.n; i++) assert.ok(Math.abs(B.armee.x[i] - A.armee.x[i]) < 1e-3);
  assert.equal(B.armee.id[5], 5);
  for (let k = 0; k < 60; k++) avancer(B);
});

group('pureté');
group('tranchées');
test('quatre lignes par camp, creusées d\'un mètre et demi, en tronçons de 25 m ; les régiments sont dedans', () => {
  const B = petite(), T = B.terrain, S = SECTEURS.essai;
  assert.equal(B.lignes.length, 8);
  assert.equal(B.troncons.length, 8 * S.largeur / S.tranchees.troncon);
  for (const L of B.lignes) for (const x of [M.x + 13, M.x + 200, M.x + 377]) {
    const c = Math.round(ligneY(L, x + 0.5) - 0.5) * T.W + x;
    assert.ok(T.diff[c] <= -S.tranchees.profondeur, 'la ligne est creusée');
  }
  assert.deepEqual(tronconsTenus(B), [64, 64]);
  const A = B.armee;
  let dedans = 0;
  for (let i = 0; i < A.n; i++) if (T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] >= 0) dedans++;
  assert.ok(dedans > A.n * 0.8, `les hommes partent de leurs tranchées (${dedans} sur ${A.n})`);
});
test('un ordre sur une tranchée l\'occupe : les hommes se rangent le long du tracé', () => {
  // (sans déroute : un petit régiment pris sous un barrage en chemin refluerait)
  const B = nouvelleBataille(3, { ...R, moral: { ...R.moral, deroute: -1 } }, { soldats: 200 });
  const L = B.lignes.find(l => l.camp === 0 && l.rang === 2);
  const x = M.x + 30, r = ordonnerMarche(B, [0], x, ligneY(L, x));
  assert.ok(r.ok && r.tranchee);
  for (let k = 0; k < 30 * 120; k++) avancer(B);
  const A = B.armee, T = B.terrain;
  let n = 0, dedans = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === 0) { n++; if (T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] >= 0 && Math.abs(A.y[i] - L.y0) < 6) dedans++; }
  assert.ok(dedans > n * 0.8, `dans la troisième ligne (${dedans} sur ${n})`);
});
test('un tronçon vide de ses défenseurs, occupé par l\'autre camp, change de main ; la sauvegarde le garde', () => {
  const B = petite(), A = B.armee, T = B.terrain;
  // trois hommes d'en face dans un tronçon de notre quatrième ligne (vide)
  const L = B.lignes.find(l => l.camp === 0 && l.rang === 3), k = B.lignes.indexOf(L);
  const t = B.troncons.findIndex(tr => tr.ligne === k && tr.x0 === M.x + 200);
  let mis = 0;
  for (let i = 0; i < A.n && mis < 3; i++) if (A.camp[i] === 1) {
    const x = M.x + 210 + mis * 2; A.x[i] = x + 0.5; A.y[i] = ligneY(L, x + 0.5); mis++;
    assert.equal(T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)], t);
  }
  avancer(B);
  for (let p = 1; p < 15; p++) avancer(B);
  assert.equal(B.etat.troncons[t], 1, 'pris');
  assert.deepEqual(tronconsTenus(B), [63, 65]);
  assert.equal(B.etat.prises[0][1], 1);
  assert.deepEqual(restaurer(photo(B), R).etat.troncons, B.etat.troncons);
});
test('en face monte à l\'assaut de nos tranchées', () => {
  const B = petite();
  for (let k = 0; k < 30 * 360; k++) avancer(B);
  const vers = B.etat.regiments.filter(r => r.camp === 1 && r.ordre.trace && r.ordre.trace.ligne < 10);
  const repli = B.etat.regiments.filter(r => r.camp === 1 && r.effectif < r.initial * 0.4);
  assert.ok(vers.length + repli.length > 0, 'au moins un assaut dans la journée');
});

group('moral et expérience');
test('les morts font tomber le moral ; en déroute, un régiment refuse les ordres et reflue ; ébranlé, il ne sort pas', () => {
  const B = petite(), reg = B.etat.regiments[0];
  reg.moral = 0.45;                                   // (un régiment déjà ébranlé : de 34 hommes, étalés dans leur tranchée, il tiendrait longtemps)
  const avant = reg.moral;
  let deroute = false;
  for (let k = 0; k < 30 * 300 && !deroute; k++) {
    if (k % 240 === 0) ordonnerBarrage(B, '220', reg.ordre.x, reg.ordre.y, 1);
    for (const e of avancer(B)) if (e.type === 'deroute' && e.reg === 0) deroute = true;
  }
  assert.ok(reg.moral < avant, 'le moral a baissé');
  assert.ok(deroute && reg.deroute, 'la déroute');
  assert.equal(moralEnMots(reg, R), 'en déroute');
  assert.deepEqual(reg.ordre, reg.depart, 'il reflue vers sa tranchée de départ');
  const r = ordonnerMarche(B, [0], reg.ordre.x, reg.ordre.y + 30);
  assert.ok(r.refus && /déroute/.test(r.refus), r.refus);
  // ébranlé (mais pas en déroute) : reculer, oui ; sortir vers l'ennemi, non
  reg.deroute = false; reg.moral = 0.4;
  assert.ok(ordonnerMarche(B, [0], reg.ordre.x, reg.ordre.y + 20).ok);
  assert.match(ordonnerMarche(B, [0], reg.ordre.x, reg.ordre.y - 60).refus, /ne sortira pas/);
});
test('la nuit rend une part du moral, jamais au-dessus de ce que les pertes laissent', () => {
  const B = petite(), reg = B.etat.regiments[0];
  reg.moral = 0.1; reg.pertes = 10;
  B.etat.phase = 'nuit'; aube(B);
  const plafond = 1 - R.moral.cicatrice * 10 / reg.initial;
  assert.ok(reg.moral > 0.1 && reg.moral < plafond);
});
test('un capitaine tombé est remplacé par un lieutenant ; ce dernier par un sous-lieutenant…', () => {
  const B = petite(), A = B.armee;
  const cap = [...A.id.subarray(0, A.n)].findIndex((id, i) => A.reg[i] === 0 && rangDe(B, id, 0) === 0);
  assert.ok(cap >= 0);
  // un barrage exactement sur lui jusqu'à ce qu'il tombe
  for (let k = 0; k < 30 * 200 && !A.mort[cap] && A.id[cap] === 0; k++) {
    if (k % 300 === 0) ordonnerBarrage(B, '220', A.x[cap], A.y[cap], 1);
    avancer(B);
  }
  const vivants = [...A.id.subarray(0, A.n)];
  assert.ok(!vivants.includes(0), 'le capitaine est mort');
  const capitaines = vivants.filter((id, i) => A.reg[i] === 0 && rangDe(B, id, 0) === 0);
  assert.equal(capitaines.length, 1, 'un nouveau capitaine');
  assert.ok(B.etat.grades[capitaines[0]], 'promu');
});
test('ceux qui survivent au feu prennent de l\'expérience ; elle se sauvegarde', () => {
  const B = petite(), A = B.armee;
  ordonnerBarrage(B, '155', ...P(100, 216));
  for (let k = 0; k < 30 * 60; k++) avancer(B);
  let max = 0; for (let i = 0; i < A.n; i++) max = Math.max(max, A.exp[i]);
  assert.ok(max > 0.1, `aguerris (${max.toFixed(2)})`);
  const C = restaurer(photo(B), R).armee;
  assert.deepEqual(Array.from(C.exp.subarray(0, C.n)), Array.from(A.exp.subarray(0, A.n)));
});

group('la nuit et ses corvées');
// une journée sous les obus, jusqu'à la nuit
function jusquALaNuit(B) {
  const reg = B.etat.regiments[0];
  for (let k = 0; B.etat.phase === 'jour'; k++) {
    if (k % 600 === 0) ordonnerBarrage(B, '220', reg.ordre.x, reg.ordre.y, 1);
    avancer(B);
  }
}
test('évacuer : les blessés du régiment quittent le front vivants ; ce ne sont pas des morts', () => {
  const B = petite(); jusquALaNuit(B);
  const A = B.armee, nb = new Map();
  for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.blessure[i]) nb.set(A.reg[i], (nb.get(A.reg[i]) || 0) + 1);
  const g = [...nb.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  assert.ok(g !== undefined, 'des blessés');
  const blesses = [...A.id.subarray(0, A.n)].filter((id, i) => A.reg[i] === g && A.blessure[i]);
  const pertes = B.etat.pertes[0], r = aube(B, { [g]: 'evacuer' });
  assert.ok(r.ok);
  const restants = [...A.id.subarray(0, A.n)];
  for (const id of blesses) assert.ok(!restants.includes(id), 'parti');
  assert.equal(r.bilan[0].evacues + r.bilan[0].mortsCorvee, blesses.length, 'chacun évacué, ou tombé en route');
  assert.equal(B.etat.pertes[0], pertes + r.bilan[0].mortsCorvee + r.bilan[0].mortsBlesses);
  assert.equal(B.etat.evacues.length, r.bilan[0].evacues + r.bilan[1].evacues, 'en face évacue aussi les siens');
});
test('réparer : les tronçons comblés sont recreusés ; la partie relue rejoue la réparation', () => {
  const B = petite(); jusquALaNuit(B);
  const T = B.terrain, reg = B.etat.regiments[0], ks = new Set(tronconsDe(B, reg));
  const combles = () => { let n = 0; for (let c = 0; c < T.W * T.H; c++) if (ks.has(T.troncon[c]) && T.diff[c] > -B.profondeur) n++; return n; };
  assert.ok(combles() > 0, 'les obus en ont comblé');
  const r = aube(B, { 0: 'reparer' });
  assert.equal(combles(), 0);
  assert.ok(r.bilan[0].repares > 0);
  for (let k = 0; k < 300; k++) avancer(B);
  const C = restaurer(photo(B), R);
  assert.deepEqual(Array.from(C.terrain.diff), Array.from(T.diff));
});
test('inhumer : les corps proches partent en terre ; les caillebotis se posent ; pas de tranchée, pas de caillebotis', () => {
  const B = petite(); jusquALaNuit(B);
  const corps = B.etat.corps.length;
  assert.ok(corps > 0);
  const r = aube(B, { 0: 'inhumer', 1: 'caillebotis' });
  assert.ok(r.bilan[0].inhumes > 0);
  assert.equal(B.etat.tombes.length, r.bilan[0].inhumes);
  assert.equal(B.etat.corps.length, corps - r.bilan[0].inhumes + r.bilan[0].mortsCorvee + r.bilan[0].mortsBlesses);
  assert.ok(r.bilan[0].caillebotis > 0 && B.terrain.caille.some(v => v));
  const reg = B.etat.regiments[2]; reg.ordre = { ...reg.ordre, trace: undefined };
  assert.match(refusCorvee(B, reg, 'caillebotis'), /ne tient pas de tranchée/);
});
test('un blessé laissé au front peut mourir dans la nuit', () => {
  const B = nouvelleBataille(3, { ...R, nuit: { ...R.nuit, mortBlesse: 1 } }, { soldats: 200 });
  jusquALaNuit(B);
  const A = B.armee;
  let blesses = 0; for (let i = 0; i < A.n; i++) if (A.blessure[i]) blesses++;
  assert.ok(blesses > 0);
  const r = aube(B, {});
  // (sauf ceux qu'en face évacue)
  assert.equal(r.bilan[0].mortsBlesses + r.bilan[1].mortsBlesses + r.bilan[1].evacues + r.bilan[1].mortsCorvee, blesses);
  for (let i = 0; i < A.n; i++) assert.equal(A.blessure[i], 0);
});

test('aucun hasard ni horloge dans les règles', () => {
  for (const f of ['bataille.js', 'terrain.js', 'army.js', 'champs.js', 'apparence.js', 'identite.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|performance\.now|crypto\./.test(src), `${f} doit rester pur (section 10)`);
  }
});
