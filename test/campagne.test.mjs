// La campagne, lot 1 : l'identité portable. Deux batailles d'une même campagne (graines de terrain différentes) donnent
// les mêmes noms à nos hommes ; la graine de la bataille n'en décide plus. Hors campagne, rien ne change.
import { nouvelleBataille, avancer, ordonnerMarche, photo, restaurer, zone, effectifs } from '../js/bataille.js';
import { quiEst } from '../js/hud/lecture.js';
import { empreinteEtat } from '../js/reseau/lockstep.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const bat = (graine, opts = {}) => nouvelleBataille(graine, R, { soldats: 200, jours: 3, ...opts });
const jouer = (B, n = 300) => { ordonnerMarche(B, [0, 1], zone(B).x0 + 150, zone(B).y0 + 150); for (let k = 0; k < n; k++) avancer(B); return B; };
const sansIdentite = B => { const p = photo(B); delete p.graineIdentite; return JSON.stringify(p); };

group('campagne — identité portable');
test('par défaut, la graine d\'identité est celle de la bataille', () => {
  assert.equal(bat(3).etat.graineIdentite, 3);
  assert.equal(bat(0).etat.graineIdentite, 0);
  assert.equal(JSON.stringify(photo(bat(3))), JSON.stringify(photo(bat(3, { graineIdentite: 3 }))));
});
test('la graine d\'identité ne change ni le terrain, ni la météo, ni les tirages, ni la partie', () => {
  const a = jouer(bat(3)), b = jouer(bat(3, { graineIdentite: 99 }));
  assert.equal(b.etat.graineIdentite, 99);
  assert.equal(sansIdentite(a), sansIdentite(b));
  assert.equal(a.etat.rng, b.etat.rng);
  assert.equal(empreinteEtat(a), empreinteEtat(b));
});
test('deux batailles d\'une même campagne : mêmes noms chez nous au même numéro, terrain et météo différents', () => {
  const a = bat(3, { graineIdentite: 11 }), b = bat(7, { graineIdentite: 11 });
  assert.notDeepEqual(a.etat.meteo.concat(a.etat.previsions), b.etat.meteo.concat(b.etat.previsions));
  for (let id = 0; id < 100; id++) assert.deepEqual(quiEst(a, id).qui, quiEst(b, id).qui, `n° ${id}`);
  // sans campagne, deux graines donnent d'autres hommes
  const c = bat(3), d = bat(7);
  assert.ok(Array.from({ length: 100 }, (_, id) => quiEst(c, id).qui.nom !== quiEst(d, id).qui.nom).filter(Boolean).length > 50);
});
test('en face, les hommes sont ceux de la bataille : d\'une bataille à l\'autre ce sont d\'autres hommes', () => {
  const a = bat(3, { graineIdentite: 11 }), b = bat(7, { graineIdentite: 11 }), A = a.armee;
  let differents = 0, n = 0;
  for (let i = 0; i < A.n; i++) {
    if (A.camp[i] !== 1) continue;
    n++;
    const x = quiEst(a, A.id[i]), y = quiEst(b, A.id[i]);
    assert.equal(x.reg.camp, 1);
    if (x.qui.nom !== y.qui.nom) differents++;
  }
  assert.ok(n > 50 && differents > n * 0.7, `${differents}/${n}`);
});
test('relue au milieu : la graine d\'identité est gardée, les noms aussi', () => {
  const B = jouer(bat(3, { graineIdentite: 11 }), 200), C = restaurer(JSON.parse(JSON.stringify(photo(B))), R);
  assert.equal(C.etat.graineIdentite, 11);
  for (let id = 0; id < 100; id++) assert.deepEqual(quiEst(C, id).qui, quiEst(B, id).qui);
  for (let k = 0; k < 200; k++) { avancer(B); avancer(C); }
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(C)));
});

// ─── Lot 2 : le registre de campagne ───────────────────────────────────────────────────────────────────────────────────────────────────
import { nouvelleCampagne, suivante, cloturer, cloturerDansLeStore, CLE } from '../js/campagne.js';
import { aube } from '../js/bataille.js';
import { CAMPAGNE } from '../js/data/campagne.js';
import { createStore, memoryBackend } from '../js/lib/save.js';
import { readFileSync } from 'node:fs';

const magasin = (debug = false, backend = memoryBackend()) => createStore({ game: 'cyclopeen', debug, backend, entries: { campagne: { version: 1 } }, secret: ['gh-token'] });
// la bataille n de la campagne c, petite, jouée jusqu'à sa fin (avec une relève et une évacuation, pour que les chemins des survivants servent)
function jouerJusqu_aLaFin(c, { relever = false } = {}) {
  // sans mêlée de nuit (`meleeMort: 0`, v0.39.0) : ces tests suivent le registre, pas l'issue d'un corps à corps (la mêlée a ses tests, dans bataille.test.mjs)
  const s = suivante(c), B = nouvelleBataille(s.graine, { ...R, nuit: { ...R.nuit, meleeMort: 0 } }, { soldats: 200, jours: 3, secteur: s.secteur, mission: s.mission, graineIdentite: s.graineIdentite, campagne: s.campagne });
  ordonnerMarche(B, [0, 1], zone(B).x0 + 150, zone(B).y0 + 150);
  let nuits = 0;
  while (B.etat.phase !== 'fin') {
    if (B.etat.phase === 'nuit') { const choix = nuits === 0 ? { 0: 'evacuer', ...(relever ? { 1: 'releve' } : {}) } : {}; aube(B, choix); nuits++; }
    avancer(B);
  }
  return B;
}
let cache = null;
const unePartie = () => cache ??= (() => { const c = nouvelleCampagne(11), B = jouerJusqu_aLaFin(c, { relever: true }); return { c, B, apres: cloturer(c, B) }; })();

group('campagne — le registre');
test('une campagne neuve : trois batailles, labours puis crête puis marais, mêmes graines pour la même campagne', () => {
  const a = nouvelleCampagne(11), b = nouvelleCampagne(11);
  assert.deepEqual(a, b);
  assert.equal(a.statut, 'en cours'); assert.equal(a.longueur, 3);
  const n1 = suivante(a), n1b = suivante(b);
  assert.deepEqual(n1, n1b);
  assert.equal(n1.n, 1); assert.equal(n1.secteur, 'essai'); assert.equal(n1.mission, 'tenir');
  assert.deepEqual(n1.campagne, { id: 11, n: 1 });
  // les graines des trois batailles diffèrent (et ne sont pas celle de l'identité par hasard)
  const graines = [1, 2, 3].map(n => suivante({ ...a, batailles: Array(n - 1).fill({ regiments: [] }) }).graine);
  assert.equal(new Set(graines).size, 3);
  assert.notDeepEqual(nouvelleCampagne(12), a); assert.notEqual(suivante(nouvelleCampagne(12)).graine, n1.graine);
});
test('la bataille d\'une campagne le sait, et la partie n\'en change pas ; relue, elle le sait encore', () => {
  const a = jouer(bat(3)), b = jouer(bat(3, { campagne: { id: 11, n: 2 } }));
  assert.deepEqual(b.etat.campagne, { id: 11, n: 2 }); assert.equal(a.etat.campagne, null);
  const sans = B => { const p = photo(B); delete p.campagne; delete p.numeros; return JSON.stringify(p); };
  assert.equal(sans(a), sans(b));
  assert.deepEqual(restaurer(JSON.parse(JSON.stringify(photo(b))), R).etat.campagne, { id: 11, n: 2 });
});
test('on ne clôt pas une bataille qui n\'est pas finie, ni d\'une autre campagne', () => {
  const c = nouvelleCampagne(11), B = bat(3, { campagne: { id: 11, n: 1 } });
  assert.throws(() => cloturer(c, B), /pas finie/);
  const { B: fini } = unePartie();
  assert.throws(() => cloturer(nouvelleCampagne(12), fini), /pas de cette campagne/);
  const trois = { ...fini, etat: { ...fini.etat, campagne: { id: 11, n: 3 } } };
  assert.throws(() => cloturer(nouvelleCampagne(11), trois), /ne suit pas/);
});
test('clore une bataille : ce qui est gardé est le survivant (numéro, rang, expérience, victimes), jamais fatigue, peur ni identité', () => {
  const { B, apres } = unePartie(), e = apres.batailles[0], A = B.armee;
  assert.equal(apres.batailles.length, 1);
  assert.equal(e.n, 1); assert.equal(e.graine, B.etat.graine); assert.equal(e.secteur, 'essai'); assert.equal(e.jours, B.etat.jour);
  assert.deepEqual(e.pertes, B.etat.pertes); assert.equal(e.issue.reussie, B.etat.issue.reussie);
  assert.equal(e.regiments.length, B.etat.regiments.filter(r => r.camp === 0).length);
  const tous = e.regiments.flatMap(r => r.survivants), ids = tous.map(s => s[0]);
  assert.equal(new Set(ids).size, ids.length, 'un numéro, un homme');
  // les vivants de chez nous sont tous au registre, avec leur expérience et leurs victimes
  for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && !A.mort[i]) {
    const s = tous.find(x => x[0] === numeroCampagne(B.etat, A.id[i]));
    assert.ok(s, `n° ${A.id[i]} vivant mais absent`);
    assert.equal(s[2], A.exp[i]); assert.equal(s[3], A.victimes[i]);
  }
  // les morts n'y sont pas
  for (const m of B.etat.corps) if (m[2] === 0) assert.ok(!ids.includes(numeroCampagne(B.etat, m[4])), `n° ${m[4]} est mort`);
  // le rang : celui de la fiche (promus compris)
  for (const r of e.regiments) for (const s of r.survivants) assert.ok(Number.isInteger(s[1]) && s[1] >= 0 && s[1] <= 7);
  assert.equal(tous.every(s => s.length === 4 && s.every(Number.isFinite)), true);
  // ni nom, ni fatigue, ni peur, ni moral dans le registre (seul le nom du régiment y est)
  assert.ok(!/prenom|fatJ|fatB|peur|moral|blessure/.test(JSON.stringify(e)));
});
test('les évacués en route et les hommes d\'un régiment relevé sont au registre ; les morts d\'un régiment relevé n\'y sont pas', () => {
  const { B, apres } = unePartie(), tous = apres.batailles[0].regiments.flatMap(r => r.survivants).map(s => s[0]), N = id => numeroCampagne(B.etat, id);
  const rel = B.etat.releves;
  assert.ok(rel.length > 0, 'la relève a eu lieu');
  for (const [id] of rel) if (!B.etat.corps.some(m => m[4] === id)) assert.ok(tous.includes(N(id)), `relevé n° ${id}`);
  for (const e of B.etat.evacues) if (e.length >= 6 && e[3] === 0) assert.ok(tous.includes(N(e[0])), `évacué n° ${e[0]}`);
  for (const e of B.etat.evacues) if (e[3] === -1 && !B.etat.corps.some(m => m[4] === e[0])) assert.ok(!tous.includes(N(e[0])), `disparu n° ${e[0]}`);
});
test('clore deux fois, ou relire la partie arrêtée à la fin, donne le même registre', () => {
  const { c, B, apres } = unePartie();
  assert.equal(cloturer(apres, B), apres);
  const relue = restaurer(JSON.parse(JSON.stringify(photo(B))), R);
  assert.equal(JSON.stringify(cloturer(c, relue)), JSON.stringify(apres));
});
test('le registre passe par le magasin : écrit avant l\'écran de fin, relu identique, versionné, exporté sans jeton, autre clé en debug', () => {
  const { c, B, apres } = unePartie(), backend = memoryBackend(), st = magasin(false, backend);
  assert.equal(cloturerDansLeStore(st, B), null, 'aucune campagne au magasin : rien n\'est écrit');
  st.save(CLE, c); st.save('gh-token', 'secret');
  assert.equal(JSON.stringify(cloturerDansLeStore(st, B)), JSON.stringify(apres));
  const ecrit = JSON.parse(backend.get('cyclopeen:campagne'));
  assert.equal(ecrit.v, 1);
  assert.equal(JSON.stringify(st.load(CLE)), JSON.stringify(apres));
  cloturerDansLeStore(st, B);                                            // deux fois : rien ne change
  assert.equal(JSON.stringify(st.load(CLE)), JSON.stringify(apres));
  const exp = JSON.stringify(st.exportAll());
  assert.ok(exp.includes('"campagne"') && !exp.includes('secret'));
  assert.equal(cloturerDansLeStore(st, bat(3)), null, 'une bataille hors campagne ne touche pas au registre');
  // une campagne d'un autre numéro n'est pas écrasée
  st.save(CLE, nouvelleCampagne(99)); assert.equal(cloturerDansLeStore(st, B), null); assert.equal(st.load(CLE).id, 99);
  // en debug : une autre clé
  const dbg = magasin(true, backend); dbg.save(CLE, c);
  assert.ok(backend.get('cyclopeen:debug:campagne') && backend.get('cyclopeen:campagne'));
});
test('la suite : une défaite ne ferme pas la campagne ; elle finit après trois batailles, ou sous quatre régiments', () => {
  const { c, B, apres } = unePartie();
  assert.equal(apres.statut, 'en cours');
  const n2 = suivante(apres);
  assert.equal(n2.n, 2); assert.equal(n2.secteur, 'crete');
  assert.equal(suivante({ ...apres, batailles: [{ ...apres.batailles[0], issue: { reussie: false, texte: 'Le secteur est tombé.' } }] }).n, 2);
  // la troisième bataille ferme la campagne ; ensuite, plus de bataille
  const deux = { ...apres, batailles: [apres.batailles[0], { ...apres.batailles[0], n: 2 }] };
  const trois = cloturer(deux, { ...B, etat: { ...B.etat, campagne: { id: 11, n: 3 } } });
  assert.equal(trois.statut, 'terminee'); assert.equal(suivante(trois), null);
  // sous le plancher de régiments encore debout, elle s'effondre, même à la première bataille
  const debout = apres.batailles[0].regiments.filter(r => r.survivants.length >= c.hommesMin).length;
  assert.ok(debout >= CAMPAGNE.regimentsMin, `la partie d'essai garde ${debout} régiments`);
  const exigeante = cloturer({ ...c, regimentsMin: debout + 1 }, B);
  assert.equal(exigeante.statut, 'effondree'); assert.equal(suivante(exigeante), null);
  assert.equal(cloturer({ ...c, regimentsMin: debout }, B).statut, 'en cours');
  assert.equal(CAMPAGNE.longueur, 3); assert.equal(CAMPAGNE.regimentsMin, 4); assert.equal(c.hommesMin, 20);
  // un régiment réduit à quelques hommes n'est plus « debout »
  const miettes = { ...c, regimentsMin: 1, hommesMin: 1000 };
  assert.equal(cloturer(miettes, B).statut, 'effondree');
});
test('campagne.js reste pur : ni hasard, ni horloge, ni DOM', () => {
  for (const f of ['campagne.js', 'data/campagne.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|performance\.now|crypto\.|document\.|window\./.test(src), `${f} doit rester pur (section 10)`);
  }
});

// ─── Lot 3 : reconstituer ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { numeroCampagne } from '../js/bataille.js';
import { reconstituer } from '../js/campagne.js';
import { grade } from '../js/identite.js';

// Une bataille de campagne de pleine taille (750 par camp), « finie » sans être jouée : des morts, de l'expérience, des victimes données à la main.
function pleine(c, tuer = i => i % 7 === 0) {
  const s = suivante(c), B = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts });
  const A = B.armee;
  for (let i = 0; i < A.n; i++) if (A.camp[i] === 0) { A.exp[i] = ((A.id[i] * 7) % 10) / 10; A.victimes[i] = A.id[i] % 4; if (tuer(i)) A.mort[i] = 1; }
  B.etat.phase = 'fin'; B.etat.issue = { reussie: true, texte: 'Le secteur est tenu.' };
  return B;
}
const vivantsNous = B => { const out = []; for (let i = 0; i < B.armee.n; i++) if (B.armee.camp[i] === 0 && !B.armee.mort[i]) out.push(i); return out; };
const numerosNous = B => vivantsNous(B).map(i => numeroCampagne(B.etat, B.armee.id[i]));

group('campagne — reconstituer');
test('750 hommes : les survivants gardent leur numéro, leur nom, leur expérience, leurs victimes ; des recrues complètent, sans expérience', () => {
  const c0 = nouvelleCampagne(11), B1 = pleine(c0), c1 = cloturer(c0, B1);
  const s = suivante(c1), B2 = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts }), A2 = B2.armee, A1 = B1.armee;
  assert.equal(s.n, 2); assert.equal(s.secteur, 'crete');
  assert.equal(B2.etat.parCamp, 750);
  const nous2 = []; for (let i = 0; i < A2.n; i++) if (A2.camp[i] === 0) nous2.push(i);
  assert.equal(nous2.length, 750, 'chaque régiment est reconstitué à plein');
  const n1 = new Map(vivantsNous(B1).map(i => [A1.id[i], i]));           // numéro (= numéro de bataille en bataille 1) → indice
  const numeros = nous2.map(i => numeroCampagne(B2.etat, A2.id[i]));
  assert.equal(new Set(numeros).size, 750, 'un numéro, un homme');
  let veterans = 0;
  for (const i of nous2) {
    const num = numeroCampagne(B2.etat, A2.id[i]);
    if (n1.has(num)) {
      veterans++;
      const j = n1.get(num);
      assert.equal(A2.exp[i], A1.exp[j], `expérience de n° ${num}`); assert.equal(A2.victimes[i], A1.victimes[j]);
      const a = quiEst(B1, A1.id[j]).qui, b = quiEst(B2, A2.id[i]).qui;
      assert.equal(`${b.prenom} ${b.nom}`, `${a.prenom} ${a.nom}`, `nom de n° ${num}`);
      assert.equal(quiEst(B2, A2.id[i]).reg.nom, quiEst(B1, A1.id[j]).reg.nom, 'dans son régiment');
      assert.ok(quiEst(B2, A2.id[i]).qui.rang <= a.rang, 'jamais rétrogradé');
    } else {
      assert.equal(A2.exp[i], 0); assert.equal(A2.victimes[i], 0); assert.ok(num >= c1.prochainNumero, `recrue n° ${num}`);
    }
  }
  assert.equal(veterans, vivantsNous(B1).length);
  assert.ok(veterans > 600 && veterans < 750);
  // la hiérarchie est celle d'un régiment à plein : un capitaine, des lieutenants… par la place, comme avant
  for (const r of B2.etat.regiments.filter(r => r.camp === 0)) {
    const ids = []; for (let i = 0; i < A2.n; i++) if (A2.reg[i] === r.id) ids.push(i);
    ids.sort((x, y) => A2.slot[x] - A2.slot[y]);
    ids.forEach((i, k) => { const g = grade(k, r.initial), rang = quiEst(B2, A2.id[i]).qui.rang; assert.ok(rang === g || (g === 6 && rang === 7), `place ${k} de ${r.nom} : ${rang} au lieu de ${g}`); });
  }
});
test('les vétérans prennent les premières places : le capitaine tombé est remplacé par le gradé survivant le plus haut', () => {
  const c0 = nouvelleCampagne(11), B1 = pleine(c0, () => false), A = B1.armee;
  assert.equal(quiEst(B1, 0).qui.rang, 0); assert.equal(quiEst(B1, 1).qui.rang, 1);            // le n° 0 est le capitaine du 1er régiment, le n° 1 son 1er lieutenant
  A.mort[0] = 1;
  const s = suivante(cloturer(c0, B1)), B2 = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts });
  const tete = B2.armee.id.findIndex((_, i) => B2.armee.reg[i] === 0 && B2.armee.slot[i] === 0);
  assert.equal(numeroCampagne(B2.etat, B2.armee.id[tete]), 1, 'le 1er lieutenant devient capitaine');
  assert.equal(quiEst(B2, B2.armee.id[tete]).qui.rang, 0);
  const numeros = []; for (let i = 0; i < B2.armee.n; i++) if (B2.armee.camp[i] === 0) numeros.push(numeroCampagne(B2.etat, B2.armee.id[i]));
  assert.ok(!numeros.includes(0), 'le mort ne revient pas');
});
test('la reconstitution ne change que les hommes : même terrain, mêmes places, mêmes tirages', () => {
  const c0 = nouvelleCampagne(11), B1 = pleine(c0), c1 = cloturer(c0, B1), s = suivante(c1);
  const a = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts }), b = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts, troupes: null });
  assert.equal(a.etat.rng, b.etat.rng);
  assert.deepEqual(a.etat.meteo, b.etat.meteo); assert.deepEqual(Array.from(a.armee.x.subarray(0, a.armee.n)), Array.from(b.armee.x.subarray(0, b.armee.n)));
  assert.deepEqual(Array.from(a.armee.slot.subarray(0, a.armee.n)), Array.from(b.armee.slot.subarray(0, b.armee.n)));
});
test('en bataille, les recrues de la relève reçoivent des numéros neufs, jamais ceux d\'un vétéran, et le registre suit', () => {
  const c0 = nouvelleCampagne(11), c1 = cloturer(c0, pleine(c0)), s = suivante(c1);
  const B = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts }), avant = Math.max(...numerosNous(B));
  B.etat.phase = 'nuit'; aube(B, { 0: 'releve' });
  const tous = []; for (let i = 0; i < B.armee.n; i++) if (B.armee.camp[i] === 0 && !B.armee.mort[i]) tous.push(numeroCampagne(B.etat, B.armee.id[i]));
  assert.equal(new Set(tous).size, tous.length, 'aucun numéro en double');
  const noms = B.etat.regiments.filter(r => r.camp === 0).map(r => r.nom);
  assert.equal(new Set(noms).size, noms.length, `aucun nom de régiment en double : ${noms}`);
  const neufs = tous.filter(n => n > avant);
  assert.equal(neufs.length, 93, 'le régiment relevé est remplacé par des recrues'); assert.ok(Math.min(...neufs) >= c1.prochainNumero);
  const quelqun = B.armee.id.find((id, i) => i < B.armee.n && B.armee.camp[i] === 0 && numeroCampagne(B.etat, id) > avant);
  assert.ok(quiEst(B, quelqun).qui.nom);
  B.etat.phase = 'fin'; B.etat.issue = { reussie: true, texte: '' };
  const c2 = cloturer(c1, B), ids = c2.batailles[1].regiments.flatMap(r => r.survivants).map(x => x[0]);
  assert.ok(c2.prochainNumero > Math.max(...tous), 'le compteur de campagne passe devant');
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.some(n => n > avant), 'les recrues de la relève sont au registre');
});
test('relue au milieu, une bataille de campagne garde ses numéros, ses noms et son compteur', () => {
  const c0 = nouvelleCampagne(11), c1 = cloturer(c0, pleine(c0)), s = suivante(c1);
  const B = nouvelleBataille(s.graine, R, { jours: 3, ...s.opts });
  for (let k = 0; k < 60; k++) avancer(B);
  const C = restaurer(JSON.parse(JSON.stringify(photo(B))), R);
  assert.deepEqual(C.etat.numeros, B.etat.numeros); assert.equal(C.etat.prochainNumero, B.etat.prochainNumero);
  for (let i = 0; i < B.armee.n; i++) assert.deepEqual(quiEst(C, B.armee.id[i]).qui, quiEst(B, B.armee.id[i]).qui);
  B.etat.phase = 'nuit'; C.etat.phase = 'nuit'; aube(B, { 0: 'releve' }); aube(C, { 0: 'releve' });
  assert.equal(JSON.stringify(photo(B)), JSON.stringify(photo(C)));
});
test('plus de régiments au registre que de places : les plus fournis restent, les autres versent leurs hommes aux places vides', () => {
  const reg = (nom, n, base) => ({ nom, depart: 94, survivants: Array.from({ length: n }, (_, k) => [base + k, 6, k / 100, 0]) });
  const regs = [reg('A', 90, 0), reg('B', 20, 100), reg('C', 80, 200), reg('D', 10, 300), reg('E', 85, 400), reg('F', 70, 500), reg('G', 60, 600), reg('H', 50, 700), reg('I', 40, 800), reg('J', 5, 900)];
  const t = reconstituer(regs, 8, 94);
  assert.deepEqual(t.map(r => r.nom), ['A', 'C', 'E', 'F', 'G', 'H', 'I', 'B'].sort((a, b) => 'ABCDEFGHIJ'.indexOf(a) - 'ABCDEFGHIJ'.indexOf(b)));
  assert.ok(t.every(r => r.survivants.length <= 94));
  const sorti = t.flatMap(r => r.survivants.map(s => s[0])), entre = regs.flatMap(r => r.survivants.map(s => s[0]));
  assert.equal(new Set(sorti).size, sorti.length);
  assert.equal(sorti.length, entre.length, 'aucun vétéran perdu tant qu\'il y a de la place');
  assert.equal(JSON.stringify(reconstituer(regs, 8, 94)), JSON.stringify(t), 'déterministe');
});
test('des forces inégales : un effectif par camp, la relève y est fidèle', () => {
  const B = nouvelleBataille(5, R, { jours: 3, soldats: 400, soldatsEux: 320 });
  assert.deepEqual(effectifs(B), [400, 320]);
  assert.equal(B.etat.parCampEux, 320);
  B.etat.phase = 'nuit';
  const eux = B.etat.regiments.find(r => r.camp === 1);
  aube(B, { [eux.id]: 'releve' });
  const frais = B.etat.regiments.filter(r => r.camp === 1 && r.arrive).pop();
  assert.equal(frais.initial, 40);                                       // 320 / 8
  assert.equal(B.etat.regiments.filter(r => r.camp === 0 && r.arrive).length, 0);
});
test('la difficulté monte : surnombre chez nous au début, chez eux à la fin', () => {
  const faible = (n, plan) => suivante({ ...nouvelleCampagne(11), batailles: Array(n - 1).fill({ regiments: [{ nom: 'X', depart: 94, survivants: [] }] }), prochainNumero: 750 }).opts;
  const [o1, o2, o3] = [1, 2, 3].map(n => faible(n));
  assert.ok(o1.soldatsEux < 750 && o2.soldatsEux === 750 && o3.soldatsEux > 750, `${o1.soldatsEux} ${o2.soldatsEux} ${o3.soldatsEux}`);
  assert.ok(o1.iaRythme.offensive > o2.iaRythme.offensive && o2.iaRythme.offensive > o3.iaRythme.offensive);
  assert.equal(o1.troupes, null);
});

// ─── Lot 4 : le papier de campagne (voir et valider) ─────────────────────────────────────────────────────────────────────────────────────
import { passage } from '../js/campagne.js';

group('campagne — le passage entre deux batailles');
test('sept jours par bataille (Jérôme, v0.36.3), le rapport de forces de la crête reste la parité', () => {
  assert.deepEqual(CAMPAGNE.batailles.map(b => b.jours), [7, 7, 7]);
  assert.equal(CAMPAGNE.batailles[1].forces, 1);
  const c = nouvelleCampagne(11);
  assert.equal(suivante(c).opts.jours, 7);
  assert.equal(nouvelleBataille(5, R, suivante(c).opts).etat.meteo.length, 7);
});
test('rien à montrer avant la première bataille, ni après la dernière', () => {
  assert.equal(passage(nouvelleCampagne(11)), null);
  const { apres } = unePartie();
  assert.equal(passage({ ...apres, statut: 'terminee' }), null);
});
test('le papier dit, régiment par régiment, vétérans + recrues = effectif plein, et qui le commande', () => {
  const { apres } = unePartie(), p = passage(apres);
  assert.equal(p.n, 2); assert.equal(p.secteur, 'crete'); assert.equal(p.jours, 7);
  assert.equal(p.derniere.n, 1); assert.deepEqual(p.derniere.pertes, apres.batailles[0].pertes);
  assert.equal(p.regiments.length, 8);
  assert.equal(p.regiments.reduce((t, r) => t + r.veterans + r.recrues, 0), 750);
  for (const r of p.regiments) {
    assert.ok(r.veterans >= 0 && r.recrues >= 0 && r.chevrons >= 0 && r.chevrons <= 3);
    assert.equal(r.neuf, r.veterans === 0); assert.equal(r.commandant === null, r.veterans === 0);
    if (r.commandant) { assert.ok(r.commandant.prenom && r.commandant.nom); assert.equal(typeof r.commandant.promu, 'boolean'); }
  }
  // c'est bien ce que la reconstitution fera : le commandant du papier est le capitaine de la bataille suivante
  const s = suivante(apres), B2 = nouvelleBataille(s.graine, R, s.opts);
  p.regiments.forEach((r, k) => {
    if (!r.commandant) return;
    const tete = B2.armee.id.findIndex((_, i) => B2.armee.reg[i] === k && B2.armee.slot[i] === 0), q = quiEst(B2, B2.armee.id[tete]);
    assert.equal(`${q.qui.prenom} ${q.qui.nom}`, `${r.commandant.prenom} ${r.commandant.nom}`, r.nom);
    assert.equal(q.qui.grade, 'capitaine'); assert.equal(q.reg.nom, r.nom);
    const vet = B2.armee.exp.reduce((n, e, i) => n + (i < B2.armee.n && B2.armee.reg[i] === k && e > 0 ? 1 : 0), 0);
    assert.ok(vet <= r.veterans);
  });
});
test('les fusions : d\'où viennent les hommes ajoutés, quels régiments sont dissous, et rien ne se perd sans être dit', () => {
  const reg = (nom, n, base, enRoute = 0) => ({ nom, depart: 94, enRoute, survivants: Array.from({ length: n }, (_, k) => [base + k, 6, k / 100, 0]) });
  const noms = 'ABCDEFGHIJKL'.split('');
  const comptes = [90, 20, 80, 10, 85, 70, 60, 50, 40, 5, 3, 2];
  const regiments = noms.map((n, k) => reg(n, comptes[k], k * 100, k === 2 ? 4 : 0));
  const c = { ...nouvelleCampagne(11), batailles: [{ n: 1, graine: 1, secteur: 'essai', mission: 'tenir', jours: 7, issue: { reussie: true, texte: '' }, pertes: [100, 80], regiments }], prochainNumero: 1200 };
  const p = passage(c);
  assert.equal(p.regiments.length, 8);
  assert.deepEqual(p.dissous.sort(), ['B', 'D', 'J', 'K', 'L'].sort().filter(x => p.dissous.includes(x)));
  const vers = new Set(p.regiments.map(r => r.nom)), tousDissous = new Set(noms.filter(n => !vers.has(n)));
  assert.deepEqual([...tousDissous].sort(), [...p.dissous].sort());
  assert.ok(p.fusions.every(f => tousDissous.has(f.de) && vers.has(f.vers) && f.hommes > 0));
  const entres = comptes.reduce((a, b) => a + b, 0), gardes = p.regiments.reduce((t, r) => t + r.veterans, 0);
  assert.equal(gardes + p.perdus, entres, 'chaque survivant est placé ou compté perdu');
  assert.equal(p.fusions.reduce((t, f) => t + f.hommes, 0), p.regiments.reduce((t, r) => t + r.fusionnes, 0));
  assert.equal(p.regiments.find(r => r.nom === 'C').enRoute, 4);
});
test('les blessés qui reviennent sont au registre, par régiment', () => {
  const { B, apres } = unePartie(), attendu = B.etat.evacues.filter(e => e.length >= 6 && e[3] === 0).length;
  assert.equal(apres.batailles[0].regiments.reduce((t, r) => t + r.enRoute, 0), attendu);
  assert.ok(attendu > 0);
});

group('campagne — le secteur suivant');
test('l\'ordre des secteurs est fixe, la mission suit l\'issue : victoire, on prend ; défaite, on tient (Jérôme, v0.36.4)', () => {
  const { apres } = unePartie();
  const apresIssue = (c, reussie) => ({ ...c, batailles: c.batailles.map(b => ({ ...b, issue: { reussie, texte: '' } })) });
  assert.equal(suivante(nouvelleCampagne(11)).mission, 'tenir');                      // la 1re est donnée
  assert.equal(suivante(apresIssue(apres, true)).mission, 'prendre');
  assert.equal(suivante(apresIssue(apres, false)).mission, 'tenir');
  assert.equal(suivante(apresIssue(apres, null)).mission, 'tenir', 'une issue inconnue n\'ouvre pas l\'offensive');
  const deux = c => ({ ...c, batailles: [...c.batailles, { ...c.batailles[0], n: 2 }] });
  const g = apresIssue(apres, true), p = apresIssue(apres, false);
  assert.deepEqual([suivante(g).secteur, suivante(deux(g)).secteur], ['crete', 'marais']);
  assert.deepEqual([suivante(p).secteur, suivante(deux(p)).secteur], ['crete', 'marais'], 'le secteur ne dépend pas de l\'issue');
  assert.equal(suivante(apresIssue(deux(apres), false)).mission, 'tenir');
  assert.equal(suivante(apresIssue(deux(apres), true)).mission, 'prendre');
  // la difficulté suit le rang de la bataille, pas la mission
  assert.equal(suivante(g).opts.soldatsEux, suivante(p).opts.soldatsEux);
  assert.equal(passage(g).mission, 'prendre'); assert.equal(passage(p).mission, 'tenir');
});

// ─── Lot 6 : la fin de campagne, sans fanfare ───────────────────────────────────────────────────────────────────────────────────────────
import { bilan } from '../js/campagne.js';
import { TEXTES } from '../js/data/campagne.js';

group('campagne — la fin');
test('le registre garde nos morts, et eux seuls : numéro de campagne, jour, régiment', () => {
  const { B, apres } = unePartie(), t = apres.batailles[0].tombes, nos = B.etat.corps.filter(m => m[2] === 0);
  assert.equal(t.length, nos.length); assert.ok(t.length > 0);
  assert.equal(t.length, B.etat.pertes[0], 'chaque mort compté a son corps, donc son nom');
  const num = t.map(x => x[0]);
  assert.equal(new Set(num).size, num.length, 'un mort, une fois');
  const vivants = new Set(apres.batailles[0].regiments.flatMap(r => r.survivants.map(s => s[0])));
  assert.ok(num.every(n => !vivants.has(n)), 'un mort n\'est pas un survivant');
  // le régiment et le jour sont ceux de la mort
  const noms = new Set(B.etat.regiments.filter(r => r.camp === 0).map(r => r.nom));
  assert.ok(t.every(([, jour, reg]) => jour >= 1 && jour <= B.etat.jour && noms.has(reg)));
});
test('le bilan : bataille par bataille, les noms de ceux qui sont tombés et de ceux qui sont restés ; rien en tête', () => {
  const { c, B, apres } = unePartie();
  // une campagne de deux batailles : la 2e rejoue la même (mêmes survivants), pour que « restés » ait un sens
  const deux = { ...apres, statut: 'terminee', batailles: [apres.batailles[0], { ...apres.batailles[0], n: 2, secteur: 'crete' }] };
  const b = bilan(deux);
  assert.equal(b.statut, 'terminee'); assert.equal(b.texte, TEXTES.fin.terminee);
  assert.deepEqual(b.batailles.map(x => x.n), [1, 2]);
  assert.equal(b.batailles[0].tombes, apres.batailles[0].tombes.length);
  assert.equal(b.tombes.length, 2 * apres.batailles[0].tombes.length);
  // les noms sont ceux de la bataille (même graine d'identité, même numéro)
  const t = apres.batailles[0].tombes[0], q = quiEst(B, B.etat.corps.find(m => numeroCampagne(B.etat, m[4]) === t[0])[4]).qui;
  const m = b.tombes.find(x => x.numero === t[0]);
  assert.equal(`${m.prenom} ${m.nom}`, `${q.prenom} ${q.nom}`);
  assert.ok(m.regiment && m.jour >= 1 && m.bataille === 1);
  // restés : ceux qui étaient là à toutes les batailles (ici : tous les survivants)
  assert.equal(b.restes.length, apres.batailles[0].regiments.reduce((n, r) => n + r.survivants.length, 0));
  assert.ok(b.restes.every(r => r.prenom && r.nom && r.grade && r.regiment));
  // un homme qui manque à une bataille n'est pas « resté »
  const manque = { ...deux, batailles: [{ ...deux.batailles[0], regiments: deux.batailles[0].regiments.map((r, k) => k ? r : { ...r, survivants: r.survivants.slice(1) }) }, deux.batailles[1]] };
  assert.equal(bilan(manque).restes.length, b.restes.length - 1, 'le premier survivant du 1er régiment manquait à la 1re bataille');
  // pas de fanfare : aucun mot de victoire, de gloire ni de score
  assert.ok(!/victoire|gloire|bravo|score|record|médaille|!/i.test(JSON.stringify(TEXTES)));
  assert.equal(bilan({ ...c, statut: 'effondree', batailles: deux.batailles }).texte, TEXTES.fin.effondree);
});
