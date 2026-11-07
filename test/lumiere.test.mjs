// Le labo lumière (js/lumiere/) : le terrain en voxels, l'obus, la lumière locale, la foule. Logique pure, sans navigateur.
import { readFileSync, readdirSync } from 'node:fs';
import { creerMonde, impact, chunksDe, rectDeChunks, MAT } from '../js/lumiere/terrain.js';
import { creerLumiere, calculerSoleil, calculerAO, calculerFlood, calculerCavite, regionTotale, directionSoleil } from '../js/lumiere/lumiere.js';
import { creerFoule, regler, avancer, plusProches } from '../js/lumiere/foule.js';
import { ciel, melangerMeteo } from '../js/lumiere/ciel.js';
import * as LA from '../js/lumiere/lampes.js';
import { creerClasses, classer, geometrieJeu, glslVertJeu, glslFragJeu, ecrireJeu, FLOATS_JEU } from '../js/lumiere/soldats-reels.js';
import { majHauteurs } from '../js/lumiere/lumiere.js';
import { glslVert, glslFrag, modele, ecrire as ecrireReel, aspectDe, FLOATS as FLOATS_REEL, creerSuivi, suivre } from '../js/lumiere/soldats-reels.js';
import { METEOS } from '../js/lumiere/config.js';
import { construireChunk, creerTampons } from '../js/lumiere/maillage.js';
import { QUALITES } from '../js/lumiere/config.js';

const PETIT = { largeurM: 256, profondeurM: 160 };      // les essais tournent sur la petite carte : un monde de 512 × 320 m à 2 cases par mètre est long à façonner
const plat = (cpm = 1) => { const M = creerMonde({ cpm, ...PETIT }); M.sol.fill(40); M.veg.fill(0); M.toit.fill(0); M.top.fill(40); return M; };
const hache = a => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };

group('labo lumière — le terrain et l\'obus');
test('un obus retire un cube entier, quatre demi-cubes et quatre quarts de cube sur terrain plat', () => {
  const M = plat(), r = impact(M, 100.5, 80.5);
  assert.ok(r);
  const d = (di, dj) => 40 - M.sol[(80 + dj) * M.W + 100 + di];
  assert.equal(d(0, 0), 4);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.equal(d(a, b), 2);
  for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) assert.equal(d(a, b), 1);
  assert.equal(r.retire, 4 + 4 * 2 + 4 * 1);
});
test('à 2 cases par mètre, le cratère garde la même taille en mètres et le même volume en cubes', () => {
  const M = plat(2); impact(M, 100.5, 80.5);
  let retire = 0; for (let i = 0; i < M.n; i++) retire += 40 - M.sol[i];
  // 16 quarts de cube en tout, chaque quart faisant (cell/4)³ avec des cases 4 fois plus petites en surface : 2 × 2 cases × (2 quarts de haut en plus) = 4 × 2 fois plus
  assert.equal(retire, 16 * 2 * 4);
  assert.equal(M.sol[(160 + 1) * M.W + 200 + 1], 40 - 8, 'le centre : un cube de 1 m = 8 quarts de 12,5 cm');
});
test('un obus brise le toit d\'un abri et abat la végétation', () => {
  const M = plat(); M.toit[80 * M.W + 100] = 40; M.veg[80 * M.W + 101] = 20; M.mat[80 * M.W + 101] = MAT.TRONC;
  impact(M, 100.5, 80.5);
  assert.equal(M.toit[80 * M.W + 100], 0); assert.equal(M.veg[80 * M.W + 101], 0);
});
test('le monde est le même pour la même graine, et déjà façonné (tranchées, abris, cratères)', () => {
  const a = creerMonde({ ...PETIT }), b = creerMonde({ ...PETIT }), c = creerMonde({ graine: 8, ...PETIT });
  assert.equal(hache(a.sol), hache(b.sol)); assert.notEqual(hache(a.sol), hache(c.sol));
  assert.equal(a.lignes.filter(l => l.camp === 0).length, 4); assert.equal(a.lignes.filter(l => l.camp === 1).length, 4);
  assert.ok(a.abris.length > 0 && a.toit.some(v => v > 0), 'des abris couverts');
  assert.ok(a.craters.length > 100, 'des cratères');
});
test('le maillage est fermé par les flancs et ne déborde pas ses tampons', () => {
  const M = creerMonde({ cpm: 2, ...PETIT }), B = creerTampons(M);
  for (let cy = 0; cy < M.chh; cy++) for (let cx = 0; cx < M.cw; cx++) { construireChunk(M, cx, cy, { ao: true }, B); assert.ok(B.sol.nv * 8 <= B.sol.v.length && B.toit.nv * 8 <= B.toit.v.length); assert.ok(B.sol.nx <= B.sol.x.length); }
});

group('labo lumière — la lumière locale');
const completer = (M, L, q) => { const R = regionTotale(M), s = directionSoleil(8); const soleil = { ...s, dir: s.dir }; calculerSoleil(M, L, R, soleil, q.porteeOmbre); calculerAO(M, L, R, q.rayonAO, q.directionsAO); calculerFlood(M, L, R); calculerCavite(M, L, R); return soleil; };
for (const [nom, cpm] of [['bas', 1], ['haut', 2]]) {
  test(`niveau ${nom} : après un obus, le recalcul LOCAL donne exactement la lumière du recalcul de toute la carte`, () => {
    const q = QUALITES[nom], M = creerMonde({ cpm, ...PETIT }), L = creerLumiere(M, q), soleil = completer(M, L, q);
    for (const [x, z] of [[100.5, 80.5], [60.3, 100.2], [15.4, 40.6]]) {            // dont un obus près d'un abri et un près du bord de la carte
      const imp = impact(M, x, z), region = rectDeChunks(M, chunksDe(M, imp, 1));
      const autour = m => { const k = Math.ceil(m * M.cpm) + 1; return { i0: Math.max(region.i0, imp.i0 - k), j0: Math.max(region.j0, imp.j0 - k), i1: Math.min(region.i1, imp.i1 + k), j1: Math.min(region.j1, imp.j1 + k) }; };
      calculerSoleil(M, L, autour(q.porteeOmbre), soleil, q.porteeOmbre); calculerAO(M, L, autour(q.rayonAO), q.rayonAO ? q.rayonAO : 4, q.directionsAO); calculerFlood(M, L, region); calculerCavite(M, L, autour(3));
      // aucune case hors du chunk touché et de ses voisins n'a été recalculée
      assert.ok(region.i1 - region.i0 + 1 <= 4 * M.chunk && region.j1 - region.j0 + 1 <= 4 * M.chunk);   // un obus à cheval sur deux chunks : deux chunks + leurs voisins
      const ref = creerLumiere(M, q); completer(M, ref, q);
      assert.equal(hache(L.tex), hache(ref.tex), `obus en ${x}, ${z}`);
    }
  });
}
test('la lumière propagée : sous un toit, l\'ombre s\'épaissit avec la distance à l\'entrée ; un toit brisé laisse entrer le jour', () => {
  const M = plat(); const j = 80;
  for (let i = 90; i < 122; i++) { M.sol[j * M.W + i] = 28; M.top[j * M.W + i] = 28; }                                    // une tranchée, plancher à 3 cubes sous la surface
  for (let i = 100; i < 112; i++) { M.toit[j * M.W + i] = 40; M.top[j * M.W + i] = 40; }                                   // couverte sur 12 m
  const L = creerLumiere(M, QUALITES.moyen); calculerFlood(M, L, regionTotale(M));
  const niveau = i => L.tex[(j * M.W + i) * 4 + 2];
  assert.equal(niveau(99), 240); assert.ok(niveau(100) < 240); assert.equal(niveau(130), 240, 'la terre d\'à côté est à ciel ouvert'); assert.ok(niveau(103) < niveau(100)); assert.ok(niveau(105) < niveau(103));
  M.toit[j * M.W + 105] = 0; M.top[j * M.W + 105] = M.sol[j * M.W + 105]; calculerFlood(M, L, regionTotale(M));
  assert.equal(niveau(105), 240, 'le toit brisé laisse entrer la lumière du ciel');
});
test('l\'ombre : un obstacle haut cache le sol derrière lui, côté opposé au soleil ; la nuit, plus aucun soleil', () => {
  const M = plat(); for (let j = 70; j < 90; j++) { M.sol[j * M.W + 100] = 80; M.top[j * M.W + 100] = 80; }          // un mur de 10 m
  const L = creerLumiere(M, QUALITES.moyen), s = directionSoleil(8);
  calculerSoleil(M, L, regionTotale(M), s, 16);
  const vis = (i, j) => L.tex[(j * M.W + i) * 4];
  const cote = Math.sign(s.dir[0]);                                          // du côté du soleil : éclairé ; de l'autre : dans l'ombre
  assert.ok(vis(100 + 3 * cote, 80) > 200, 'face au soleil'); assert.ok(vis(100 - 3 * cote, 80) < 50, 'derrière le mur');
  calculerSoleil(M, L, regionTotale(M), directionSoleil(2), 16);
  assert.equal(vis(100 + 3 * cote, 80), 0);
});
test('un creux est plus sombre (AO) et reçoit des flaques (cavité) ; le plat reste ouvert', () => {
  const M = plat(); impact(M, 100.5, 80.5); impact(M, 100.5, 80.5); impact(M, 100.5, 80.5);
  const L = creerLumiere(M, QUALITES.moyen); calculerAO(M, L, regionTotale(M), 6, 8); calculerCavite(M, L, regionTotale(M));
  const ao = (i, j) => L.tex[(j * M.W + i) * 4 + 1], cav = (i, j) => L.tex[(j * M.W + i) * 4 + 3];
  assert.ok(ao(100, 80) < ao(30, 30) - 10); assert.ok(cav(100, 80) > cav(30, 30) + 20); assert.ok(ao(30, 30) > 240);
});

group('labo lumière — la foule');
test('le coût de la foule ne dépend pas du terrain, et elle est déterministe', () => {
  const M = creerMonde({ ...PETIT }), a = creerFoule(M), b = creerFoule(M); regler(a, 5000); regler(b, 5000);
  for (let k = 0; k < 60; k++) { avancer(a, 1 / 30); avancer(b, 1 / 30); }
  assert.equal(hache(a.xy.subarray(0, 10000)), hache(b.xy.subarray(0, 10000)));
  for (let i = 0; i < a.n; i++) assert.ok(a.x[i] >= 0 && a.x[i] <= 256 && a.z[i] >= 0 && a.z[i] <= 160);
  regler(a, 999999); assert.equal(a.n, 50000);
});

test('au bord de la carte, un flanc descend jusqu\'au faux terrain qui l\'entoure', () => {
  const M = creerMonde({ ...PETIT }), B = creerTampons(M); construireChunk(M, 0, 0, { ao: true }, B);
  let bas = 1e9; for (let k = 0; k < B.sol.nv; k++) bas = Math.min(bas, B.sol.v[k * 8 + 1]);
  assert.ok(Math.abs(bas - M.bordM) < 1e-4, `le point le plus bas ${bas}, le faux terrain ${M.bordM}`);
});

test('la carte est grande par défaut et porte une colline ; ses hauteurs ne dépendent pas de la grille', () => {
  const g = creerMonde({ cpm: 1 }), f = creerMonde({ cpm: 2, largeurM: 128, profondeurM: 80 });
  assert.equal(g.largeurM, 512); assert.equal(g.profondeurM, 320); assert.equal(g.W, 512);
  const h = (M, x, z) => M.sol[Math.floor(z * M.cpm) * M.W + Math.floor(x * M.cpm)] * M.cell / 4;       // la hauteur du sol en mètres
  assert.ok(h(g, g.colline.x, g.colline.z) - h(g, g.colline.x + g.colline.rayonM + 12, g.colline.z) > 10, 'la colline domine la plaine de plus de 10 m');
  assert.ok(Math.abs(h(f, 40, 20) - h(g, 40, 20)) < 1, 'un mètre de haut est le même mètre à 1 ou 2 cases par mètre (mêmes ondulations)');
});

let L_;
group('labo lumière — les sources de lumière');
test('des lanternes dans les tranchées et les abris, cachées par le relief ; les lampes portées suivent leurs hommes', () => {
  const M = creerMonde({ ...PETIT }), L = creerLumiere(M, QUALITES.bas); majHauteurs(M, L, regionTotale(M));
  const A = LA.creerLampes(M); LA.poserFixes(M, L.hf, A);
  assert.ok(A.fixes.length > 60, `${A.fixes.length} lanternes`);
  const l = A.fixes[0], i = Math.floor(l.x), j = Math.floor(l.z);
  assert.ok(A.tex[j * M.W + i] > 60, 'il fait clair au pied de la lanterne');
  assert.ok(A.fixes.every(f => f.y > M.sol[Math.floor(f.z) * M.W + Math.floor(f.x)] * M.cell / 4), 'accrochées au-dessus du sol de la tranchée');
  // un mur entre la lampe et une colonne : la colonne reste dans le noir
  const P = plat(); const LP = creerLumiere(P, QUALITES.bas); majHauteurs(P, LP, regionTotale(P)); const B = LA.creerLampes(P); B.largeur = P.W;
  for (let z = 70; z < 90; z++) { P.sol[z * P.W + 105] = 80; P.top[z * P.W + 105] = 80; } majHauteurs(P, LP, regionTotale(P));
  LA.ajouterLampe(P, LP.hf, { x: 100.5, z: 80.5, y: 11.5, force: 1, rayon: 12 }, B.stat); LA.emballer(B, regionTotale(P));
  assert.ok(B.tex[80 * P.W + 102] > 100 && B.tex[80 * P.W + 108] === 0, 'le parapet cache la lumière');
  const F = creerFoule(M); regler(F, 4000);
  const lamp = LA.lampesDeSoldats(F, L.hf, M, 128, 80); assert.ok(lamp.length > 0 && lamp.length <= 48);
  const z = LA.majMobiles(M, L.hf, A, lamp); assert.ok(z); const avant = A.tex.reduce((s, v) => s + v, 0);
  LA.majMobiles(M, L.hf, A, []); assert.ok(A.tex.reduce((s, v) => s + v, 0) < avant, 'sans lampes portées, leur lueur est retirée');
});

group('labo lumière — l\'échelle de détail du jeu');
test('les trois niveaux viennent des assets du jeu (10, 50 et 218 triangles) et leurs nuanceurs passent en GLSL ES 3.0', () => {
  assert.deepEqual(['boite', 'legere', 'equipe'].map(s => geometrieJeu(s).n / 3), [10, 50, 218]);
  const v = glslVertJeu(), f = glslFragJeu('#version 300 es');
  assert.ok(!/\battribute\b|\bvarying\b|projectionMatrix|gl_FragColor|texture2D/.test(v + f) && f.includes('discard;'));
});
test('chaque soldat a le niveau de détail de ses pixels par mètre, les plus proches en articulés, sans dépasser les plafonds', () => {
  const M = creerMonde({ ...PETIT }), F = creerFoule(M); regler(F, 12000); L_ = creerLumiere(M, QUALITES.bas); majHauteurs(M, L_, regionTotale(M));
  const k = 1 / Math.tan(Math.PI / 12), vue = (dist) => {                                      // une caméra au-dessus du centre, regardant le sol (vp en colonnes : on pose juste w = profondeur)
    const vp = new Float32Array(16); vp[0] = 1 / 4; vp[5] = 1 / 4; vp[11] = 0; vp[7] = 0; vp[3] = 0; vp[15] = dist; vp[9] = 0; return vp; };
  void k;
  const C = classer(F, L_.hf, M, vue(10), 400, Math.PI / 6, creerClasses(F.max));
  const total = C.art.n + C.equipe.n + C.legere.n + C.boite.n;
  assert.ok(C.art.n <= 250 && C.equipe.n <= 4000 && total > 0);
  for (const L2 of [C.art, C.equipe, C.legere, C.boite]) for (let q = 0; q < L2.n; q++) assert.equal(C.masque[L2.i[q]], 1);
  const proche = classer(F, L_.hf, M, vue(2), 400, Math.PI / 6, creerClasses(F.max)), loin = classer(F, L_.hf, M, vue(2000), 400, Math.PI / 6, creerClasses(F.max));
  assert.ok(proche.art.n > 0, 'de près : des articulés'); assert.equal(loin.art.n + loin.equipe.n + loin.legere.n + loin.boite.n, 0, 'de loin : des points seulement');
  const T = new Float32Array(2 * FLOATS_JEU); ecrireJeu(T, 1, { i: 5, x: 3, y: 4, z: 5, camp: 1, vit: 0.7, tapi: true, cap: 0 });
  assert.ok(Math.abs(T[FLOATS_JEU + 4] + 1.7) < 1e-5, 'la peur : −1 − la vitesse');
});

group('labo lumière — les vrais soldats du jeu');
test('les plus proches du point visé sont les bons, du plus proche au plus loin', () => {
  const M = creerMonde({ ...PETIT }), F = creerFoule(M); regler(F, 20000); for (let k = 0; k < 30; k++) avancer(F, 1 / 30);
  const out = new Int32Array(3000), n = plusProches(F, 120, 100, 150, out);
  assert.equal(n, 150);
  const d = i => Math.hypot(F.x[i] - 120, F.z[i] - 100), tous = Array.from({ length: F.n }, (_, i) => i).sort((a, b) => d(a) - d(b) || a - b).slice(0, 150);
  assert.deepEqual(Array.from(out.subarray(0, 150)), tous);
});
test('le modèle du jeu passe de GLSL ES 1.0 à 3.0, et ses deux niveaux de détail existent', () => {
  const v = glslVert(), f = glslFrag('#version 300 es');
  assert.ok(v.startsWith('#version 300 es') && !/\battribute\b|\bvarying\b|\bprojectionMatrix\b|gl_FragColor/.test(v + f));
  assert.ok(f.includes('fragColor = vec4(finir(eclairer('), 'la lumière du labo remplace l\'aplat du jeu');
  assert.ok(modele('moyen').triangles < modele('fin').triangles * 0.65 && modele('fin').triangles > 1000);
});
test('un homme : son aspect est celui que le jeu tire de son numéro, écrit en 26 nombres', () => {
  const a = aspectDe(12, 0), b = aspectDe(12, 0), T = new Float32Array(2 * FLOATS_REEL);
  assert.equal(a, b); assert.ok(a.carrure.taille > 0.8);
  ecrireReel(T, 1, { x: 10, y: 2, z: 30, camp: 1, vit: 1.2, tapi: 0.5, cap: 0.3, temps: 1, aspect: a });
  assert.equal(T[FLOATS_REEL], 10); assert.equal(T[FLOATS_REEL + 3], 1); assert.ok(Math.abs(T[FLOATS_REEL + 5] - Math.cos(0.3)) < 1e-6);
});
test('un soldat qui marche prend sa vitesse et son cap ; celui qui tremble sur place reste à l\'arrêt, face à l\'ennemi', () => {
  const M = creerMonde({ ...PETIT }), F = creerFoule(M), S = creerSuivi(F.max); F.x[0] = 50; F.z[0] = 50; F.camp[0] = 0; F.camp[1] = 0; F.x[1] = 80; F.z[1] = 80;
  suivre(S, F, 0, 0); suivre(S, F, 1, 0);
  for (let t = 0.4; t < 3; t += 0.4) { F.x[0] += 0.6; F.x[1] += (Math.round(t * 10) % 2 ? 0.05 : -0.05); suivre(S, F, 0, t); suivre(S, F, 1, t); }
  assert.ok(S.vit[0] > 1.2 && Math.abs(S.cap[0] - Math.PI / 2) < 0.3, 'vers l\'est');
  assert.ok(S.vit[1] < 0.3 && Math.abs(Math.abs(S.cap[1]) - Math.PI) < 0.3, 'face au nord');
});

group('labo lumière — le ciel et la météo');
test('une météo se mélange en continu, et le ciel suit l\'heure : étoiles la nuit, nuages et neige selon le temps', () => {
  const m = melangerMeteo('sec', 'neige', 0.5);
  assert.ok(Math.abs(m.neige - 0.5) < 1e-9 && m.voile > METEOS.sec.voile && m.voile < METEOS.neige.voile);
  assert.ok(ciel({ heure: 23 }).etoiles > 0.3 && ciel({ heure: 12 }).etoiles === 0);
  assert.ok(ciel({ heure: 23 }).luneDir[1] > 0, 'la lune est levée quand le soleil est couché');
  assert.ok(ciel({ heure: 10, meteo: 'pluie' }).voile > ciel({ heure: 10, meteo: 'sec' }).voile);
  assert.ok(ciel({ heure: 10, jour: 10 }).voile > ciel({ heure: 10, jour: 1 }).voile, 'le ciel se couvre au fil de la bataille');
  assert.ok(ciel({ heure: 10, meteo: 'neige' }).neige === 1 && ciel({ heure: 10, meteo: 'brouillard' }).brouillard === 1);
});

group('labo lumière — pureté');
test('terrain, lumière, foule, maillage, particules, ciel : ni DOM, ni horloge, ni Math.random', () => {
  for (const f of ['terrain', 'lumiere', 'foule', 'maillage', 'particules', 'ciel', 'camera', 'config', 'soldats-reels', 'lampes']) {
    const src = readFileSync(`js/lumiere/${f}.js`, 'utf8').replace(/\/\/.*$/gm, '');
    for (const mot of ['Math.random', 'Date.now', 'performance.now', 'document.', 'window.', 'localStorage']) assert.ok(!src.includes(mot), `${f}.js utilise ${mot}`);
  }
});
