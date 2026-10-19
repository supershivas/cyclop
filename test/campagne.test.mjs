// La campagne, lot 1 : l'identité portable. Deux batailles d'une même campagne (graines de terrain différentes) donnent
// les mêmes noms à nos hommes ; la graine de la bataille n'en décide plus. Hors campagne, rien ne change.
import { nouvelleBataille, avancer, ordonnerMarche, photo, restaurer, zone } from '../js/bataille.js';
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
  const s = suivante(c), B = nouvelleBataille(s.graine, R, { soldats: 200, jours: 3, secteur: s.secteur, mission: s.mission, graineIdentite: s.graineIdentite, campagne: s.campagne });
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
  const graines = [1, 2, 3].map(n => suivante({ ...a, batailles: Array(n - 1).fill({}) }).graine);
  assert.equal(new Set(graines).size, 3);
  assert.notDeepEqual(nouvelleCampagne(12), a); assert.notEqual(suivante(nouvelleCampagne(12)).graine, n1.graine);
});
test('la bataille d\'une campagne le sait, et la partie n\'en change pas ; relue, elle le sait encore', () => {
  const a = jouer(bat(3)), b = jouer(bat(3, { campagne: { id: 11, n: 2 } }));
  assert.deepEqual(b.etat.campagne, { id: 11, n: 2 }); assert.equal(a.etat.campagne, null);
  const sans = B => { const p = photo(B); delete p.campagne; return JSON.stringify(p); };
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
    const s = tous.find(x => x[0] === A.id[i]);
    assert.ok(s, `n° ${A.id[i]} vivant mais absent`);
    assert.equal(s[2], A.exp[i]); assert.equal(s[3], A.victimes[i]);
  }
  // les morts n'y sont pas
  for (const m of B.etat.corps) if (m[2] === 0) assert.ok(!ids.includes(m[4]), `n° ${m[4]} est mort`);
  // le rang : celui de la fiche (promus compris)
  for (const r of e.regiments) for (const s of r.survivants) assert.ok(Number.isInteger(s[1]) && s[1] >= 0 && s[1] <= 7);
  assert.equal(tous.every(s => s.length === 4 && s.every(Number.isFinite)), true);
  // ni nom, ni fatigue, ni peur, ni moral dans le registre (seul le nom du régiment y est)
  assert.ok(!/prenom|fatJ|fatB|peur|moral|blessure/.test(JSON.stringify(e)));
});
test('les évacués en route et les hommes d\'un régiment relevé sont au registre ; les morts d\'un régiment relevé n\'y sont pas', () => {
  const { B, apres } = unePartie(), tous = apres.batailles[0].regiments.flatMap(r => r.survivants).map(s => s[0]);
  const rel = B.etat.releves;
  assert.ok(rel.length > 0, 'la relève a eu lieu');
  for (const [id] of rel) if (!B.etat.corps.some(m => m[4] === id)) assert.ok(tous.includes(id), `relevé n° ${id}`);
  for (const e of B.etat.evacues) if (e.length >= 6 && e[3] === 0) assert.ok(tous.includes(e[0]), `évacué n° ${e[0]}`);
  for (const e of B.etat.evacues) if (e[3] === -1 && !B.etat.corps.some(m => m[4] === e[0])) assert.ok(!tous.includes(e[0]), `disparu n° ${e[0]}`);
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
  assert.equal(n2.n, 2); assert.equal(n2.secteur, 'crete'); assert.equal(n2.mission, 'prendre');
  assert.equal(suivante({ ...apres, batailles: [{ ...apres.batailles[0], issue: { reussie: false, texte: 'Le secteur est tombé.' } }] }).n, 2);
  // la troisième bataille ferme la campagne ; ensuite, plus de bataille
  const deux = { ...apres, batailles: [apres.batailles[0], { ...apres.batailles[0], n: 2 }] };
  const trois = cloturer(deux, { ...B, etat: { ...B.etat, campagne: { id: 11, n: 3 } } });
  assert.equal(trois.statut, 'terminee'); assert.equal(suivante(trois), null);
  // sous le plancher de régiments encore debout, elle s'effondre, même à la première bataille
  const debout = apres.batailles[0].regiments.filter(r => r.survivants.length).length;
  assert.ok(debout >= CAMPAGNE.regimentsMin, `la partie d'essai garde ${debout} régiments`);
  const exigeante = cloturer({ ...c, regimentsMin: debout + 1 }, B);
  assert.equal(exigeante.statut, 'effondree'); assert.equal(suivante(exigeante), null);
  assert.equal(cloturer({ ...c, regimentsMin: debout }, B).statut, 'en cours');
  assert.equal(CAMPAGNE.longueur, 3); assert.equal(CAMPAGNE.regimentsMin, 4);
});
test('campagne.js reste pur : ni hasard, ni horloge, ni DOM', () => {
  for (const f of ['campagne.js', 'data/campagne.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|performance\.now|crypto\.|document\.|window\./.test(src), `${f} doit rester pur (section 10)`);
  }
});
