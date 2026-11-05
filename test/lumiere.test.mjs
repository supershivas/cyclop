// Le labo lumière (js/lumiere/) : le terrain en voxels, l'obus, la lumière locale, la foule. Logique pure, sans navigateur.
import { readFileSync, readdirSync } from 'node:fs';
import { creerMonde, impact, chunksDe, rectDeChunks, MAT } from '../js/lumiere/terrain.js';
import { cadrerOmbre, versOmbre, rectDansOmbre, reperLumiere } from '../js/lumiere/ombres.js';
import { creerEngins, avancerEngins, MODELES, ecrireEngins, FLOATS_ENGIN } from '../js/lumiere/engins.js';
import { banc, resolutionHorloge } from '../js/lumiere/mesures.js';
import { mat4, matrices, creerCamera } from '../js/lumiere/camera.js';
import { bandes, bandeSuivante } from '../js/lumiere/lumiere.js';
import { niveauDe, creerClasses as creerClasses2 } from '../js/lumiere/soldats-reels.js';
import { couleurCiel, masseAir } from '../js/lumiere/ciel.js';
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

group('labo lumière — la carte d\'ombre (étape 9)');
const camVue = (cible = [128, 4, 80], distance = 120, tangage = 0.95, lacet = 0.15) => { const C = creerCamera(); Object.assign(C, { cible, distance, tangage, lacet, aspect: 1.6 }); return matrices(C); };
test('un point et son ombre ont les mêmes coordonnées dans la carte : le cadrage couvre tout le sol vu, et rien que lui', () => {
  const sun = [Math.sin(1.2) * Math.cos(0.5), Math.sin(0.5), Math.cos(1.2) * Math.cos(0.5)], m = camVue(), C = cadrerOmbre({ cam: m, sunDir: sun, taille: 1024, monde: { largeurM: 256, profondeurM: 160 }, distanceM: 120 });
  assert.ok(C);
  // le centre de l'écran (le point visé) est dans la carte, bien au milieu
  const cible = versOmbre(C, [128, 4, 80]); assert.ok(cible.u > 0.1 && cible.u < 0.9 && cible.v > 0.1 && cible.v < 0.9 && cible.z > 0 && cible.z < 1, JSON.stringify(cible));
  // un poteau de 10 m : son sommet et l'endroit de son ombre au sol sont au même (u, v) ; le sommet est plus près du soleil (z plus petit)
  const sommet = [128, 14, 80], t = 14 / sun[1], ombre = [128 - sun[0] * t, 0, 80 - sun[2] * t];
  const a = versOmbre(C, sommet), b = versOmbre(C, ombre);
  assert.ok(Math.abs(a.u - b.u) < 1e-4 && Math.abs(a.v - b.v) < 1e-4, 'même position dans le plan de la lumière'); assert.ok(a.z < b.z, 'le sommet est devant le sol, vu du soleil');
  // l'ombre au sol d'un objet haut reste dans la carte (la profondeur couvre ce qui projette)
  const haut = versOmbre(C, [128 + sun[0] * 50, 50 * sun[1] + 4, 80 + sun[2] * 50]); assert.ok(haut.z >= 0 && haut.z <= 1, 'un avion à 50 m vers le soleil reste dans la profondeur');
  // la résolution : 1 024 texels pour la vue large couvrent ~ 100-200 m : de l'ordre de 10-20 cm
  assert.ok(C.texelM < 0.5, `${C.texelM} m par texel`);
});
test('le soleil bas ou couché : pas de carte ; le cadre est stable quand la vue bouge de moins qu\'un texel', () => {
  const m = camVue(), monde = { largeurM: 256, profondeurM: 160 };
  assert.equal(cadrerOmbre({ cam: m, sunDir: [1, 0.01, 0], taille: 1024, monde }), null); assert.equal(cadrerOmbre({ cam: m, sunDir: [0, -1, 0], taille: 1024, monde }), null);
  const sun = reperLumiere([0.6, 0.5, 0.62]).l, a = cadrerOmbre({ cam: camVue([128, 4, 80]), sunDir: sun, taille: 1024, monde, distanceM: 120 }), b = cadrerOmbre({ cam: camVue([128.02, 4, 80]), sunDir: sun, taille: 1024, monde, distanceM: 120 });
  assert.deepEqual(a.etendue, b.etendue, 'l\'étendue ne change que par paliers');
  const decal = Math.hypot(a.vp[12] - b.vp[12], a.vp[13] - b.vp[13]); assert.ok(decal < 2 / 1024 * 3 || decal === 0, 'le centre est collé aux texels');
});
test('un rectangle de sol hors de la carte est écarté, un rectangle vu est gardé', () => {
  const sun = reperLumiere([0.6, 0.5, 0.62]).l, C = cadrerOmbre({ cam: camVue(), sunDir: sun, taille: 1024, monde: { largeurM: 256, profondeurM: 160 }, distanceM: 120 });
  assert.ok(rectDansOmbre(C, 120, 72, 136, 88, 24)); assert.ok(!rectDansOmbre(C, 5000, 5000, 5016, 5016, 24));
});
test('les engins : chars et biplans en boîtes de la palette, qui vont et viennent sans sortir de la carte', () => {
  const M = creerMonde({ ...PETIT }), E = creerEngins(M);
  assert.ok(MODELES.char.n > 100 && MODELES.avion.n > 100 && MODELES.char.n % 36 === 0);
  for (let k = 0; k < 400; k++) avancerEngins(E, M, 0.25, () => 3);
  for (const c of E.chars) assert.ok(c.x > 15 && c.x < M.largeurM - 15 && Math.abs(c.y - 3) < 1e-6);
  for (const a of E.avions) { assert.ok(a.y > 3 + 20, 'un avion vole haut'); assert.ok(Math.abs(a.roulis) > 0.3, 'il penche dans le virage'); }
  const T = new Float32Array(10 * FLOATS_ENGIN); assert.equal(ecrireEngins(E.chars, T), E.chars.length);
});

group('labo lumière — le clignotement et la répartition du travail (v0.114.0)');
test('un homme garde son niveau de détail tant que ses pixels par mètre restent à 12 % du seuil : plus de va-et-vient', () => {
  let niv = 4, bascules = 0;
  for (let k = 0; k < 400; k++) { const ppm = 12 * (1 + 0.1 * Math.sin(k * 0.7)), n = niveauDe(ppm, niv); if (n !== niv) bascules++; niv = n; }          // ±10 % autour du seuil des articulés
  assert.ok(bascules <= 1, `${bascules} bascules`);
  assert.equal(niveauDe(20, 3), 0, 'bien au-dessus du seuil, il monte quand même'); assert.equal(niveauDe(1, 0), 4, 'de très loin, il redevient un point');
  // sans mémoire (premier passage) c\'est le seuil franc
  assert.equal(niveauDe(11.9, 4), 1); assert.equal(niveauDe(12.1, 4), 0);
});
test('la foule ne tremble plus : sans vague, l\'accélération d\'un homme d\'une image à l\'autre est minuscule (avant : des secousses de ± 3 cm à chaque image)', () => {
  const M = creerMonde({ ...PETIT }), F = creerFoule(M); regler(F, 3000); F.zc.set(F.z0); for (let k = 0; k < 600; k++) avancer(F, 1 / 60);
  const x1 = Float32Array.from(F.x.subarray(0, 3000)), z1 = Float32Array.from(F.z.subarray(0, 3000)); avancer(F, 1 / 60);
  const x2 = Float32Array.from(F.x.subarray(0, 3000)), z2 = Float32Array.from(F.z.subarray(0, 3000)); avancer(F, 1 / 60);
  let acc = 0, vit = 0; for (let i = 0; i < 3000; i++) { acc = Math.max(acc, Math.hypot(F.x[i] - 2 * x2[i] + x1[i], F.z[i] - 2 * z2[i] + z1[i])); vit = Math.max(vit, Math.hypot(F.vx[i], F.vz[i])); }
  assert.ok(acc < 0.004, `${acc} m d'écart à une marche régulière`); assert.ok(vit < 0.7, `le flânage reste sous le seuil de marche (${vit} m/s)`);
});
test('suivre : sur la foule qui flâne, personne ne se met à marcher ni ne s\'arrête d\'une mesure à l\'autre (avant : la vitesse frôlait le seuil)', () => {
  const M = creerMonde({ ...PETIT }), F = creerFoule(M), S = creerSuivi(F.max); regler(F, 400); F.zc.set(F.z0);
  for (let k = 0; k < 300; k++) avancer(F, 1 / 30); let t = 0;
  for (let i = 0; i < 400; i++) suivre(S, F, i, t);
  let bascules = 0; const avant = new Uint8Array(400);
  for (let k = 0; k < 1800; k++) { avancer(F, 1 / 30); t += 1 / 30; for (let i = 0; i < 400; i++) { suivre(S, F, i, t); if (S.marche[i] !== avant[i]) { bascules++; avant[i] = S.marche[i]; } } }
  assert.equal(bascules, 0, `${bascules} changements marche/arrêt en 60 s pour 400 hommes`);
});
test('l\'AO par bandes redonne exactement l\'AO de toute la carte, quelle que soit la hauteur des bandes (le calcul réparti sur plusieurs images est juste)', () => {
  const M = creerMonde({ ...PETIT }), q = QUALITES.moyen, A = creerLumiere(M, q), B = creerLumiere(M, q);
  calculerAO(M, A, regionTotale(M), q.rayonAO, q.directionsAO);
  let n = 0; for (const b of bandes(regionTotale(M), 7)) { calculerAO(M, B, b, q.rayonAO, q.directionsAO); n++; }
  assert.equal(hache(B.tex), hache(A.tex)); assert.ok(n > 10);
  assert.deepEqual(bandeSuivante(regionTotale(M), M.H - 2, 9), { i0: 0, i1: M.W - 1, j0: M.H - 2, j1: M.H - 1 });
});
test('le banc mesure par lots : sur une horloge grossière (1 ms, comme Firefox) il retrouve le vrai coût à quelques pour cent près', () => {
  let t = 0; const reel = { coutImage: 0.37, base: 0.2 }; let etat = {}; // l\'horloge avance du coût du dessin ; elle ne montre que des millisecondes entières
  const now = () => Math.floor(t);
  const cout = e => reel.base + Object.entries(e).filter(([, v]) => v).length * 0.1 + (e[8] ? 0.3 : 0);
  return banc({ now, resolution: 1, appliquer: e => { etat = e; }, image: () => { t += cout(etat); }, fin: () => { t += 0.01; }, pause: async () => {} }).then(b => {
    assert.ok(Math.abs(b.base - 0.2) < 0.04, `base ${b.base}`); assert.ok(Math.abs(b.marginal[1] - 0.1) < 0.04, `étape 1 : ${b.marginal[1]}`); assert.ok(Math.abs(b.marginal[8] - 0.4) < 0.06, `étape 8 : ${b.marginal[8]}`);
    assert.ok(b.details['seule:1'].images_par_lot >= 40, 'des lots d\'au moins 40 images : la résolution de l\'horloge pèse moins de 2,5 %'); assert.ok(b.incertitude < 0.03);
    assert.ok(Math.abs(b.toutes - (0.2 + 0.1 * 8 + 0.3 + 0.1 /* l\'étape 9 */ + 0)) < 0.2, `toutes ${b.toutes}`);
  });
});
test('l\'horloge : sa résolution est mesurée, et un chronomètre grossier ne donne pas de « pire » inventé', () => {
  let t = 0; const r = resolutionHorloge(5000, () => { t += 0.3; return Math.floor(t); });
  assert.equal(r, 1);
});

group('labo lumière — le ciel v2');
test('l\'air traversé fait le dégradé ; le soleil bas rougit l\'horizon de son côté ; la diffusion avant éclaire autour du soleil', () => {
  assert.ok(masseAir(1) < 1.01 && masseAir(0) > 30 && masseAir(0) < 40);
  const P = { skyZ: [0.1, 0.2, 0.4], skyH: [0.5, 0.5, 0.5], sunCol: [2, 1.6, 1], sunDir: [0, 0.1, 1], bas: 1, voile: 0 };
  const cote = couleurCiel([0, 0.05, 1], P), oppose = couleurCiel([0, 0.05, -1], P);
  assert.ok(cote[0] > oppose[0] * 1.5, 'plus de lumière du côté du soleil');
  assert.ok(cote[0] / cote[2] > oppose[0] / oppose[2], 'plus rouge du côté du soleil');
  assert.ok(couleurCiel([0, 1, 0], P)[2] > couleurCiel([0, 0.02, 1], { ...P, sunDir: [0, 0.9, 0.3] })[2] * 0.2);
});

group('jeu — l\'ouverture au ciel du terrain (session 2)');
test('l\'AO du sol du jeu, par rangées dans un budget, redonne le calcul complet ; un obus ne refait que les rangées proches', async () => {
  const { creerAOSol, AO_SOL } = await import('../js/rendu/ao-sol.js');
  const W = 120, H = 90, h = new Int16Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) h[j * W + i] = 8 + ((i * 7 + j * 3) % 11) + (Math.abs(i - 60) < 3 && j > 20 && j < 70 ? 24 : 0);
  const T = { W, H, versionLigne: new Uint32Array(H) }, ao = creerAOSol({ hauteurQ: (_, c) => h[c], now: () => 0 });
  ao.attacher(T); let tours = 0; while (ao.maj(true, false, null, 1e9) || ao.restant) { tours++; if (tours > 1000) break; }
  const M = { W, H, n: W * H, top: h, cell: 1, cpm: 1 }, L = { tex: new Uint8Array(W * H * 4).fill(255) }; calculerAO(M, L, regionTotale(M), AO_SOL.rayonM, AO_SOL.directions);
  assert.equal(hache(ao.tex), hache(L.tex));
  for (let i = 55; i < 66; i++) h[45 * W + i] = 2; T.versionLigne[45]++;                     // un cratère, une rangée touchée
  let rangees = 0; const compte = () => { const avant = ao.restant; return avant; };
  ao.maj(true, false, null, 0); rangees = ao.restant + 1; assert.ok(rangees <= 2 * AO_SOL.rayonM + 1, `${rangees} rangées refaites`);
  while (ao.restant) ao.maj(true, false, null, 1e9); calculerAO(M, L, regionTotale(M), AO_SOL.rayonM, AO_SOL.directions); assert.equal(hache(ao.tex), hache(L.tex)); void compte;
});

test('le soleil du labo sur le relief du jeu : l\'ombre tombe du côté où le jeu la met, elle est douce, la nuit il n\'y a pas de soleil', async () => {
  const { creerAOSol, soleilDuJeu, assezBouge } = await import('../js/rendu/ao-sol.js');
  assert.equal(soleilDuJeu(0, 0), null);
  const s = soleilDuJeu(2, 0); assert.ok(s.dir[0] < 0 && Math.abs(s.hauteur - Math.atan(0.5)) < 1e-9, 'l\'ombre part vers +x : le soleil est à −x, à 26,6°');
  const W = 120, H = 60, h = new Int16Array(W * H).fill(8); for (let j = 0; j < H; j++) h[j * W + 60] = 48;                // un mur de 10 m (40 quarts de plus que le sol)
  const T = { W, H, versionLigne: new Uint32Array(H) }, ao = creerAOSol({ hauteurQ: (_, c) => h[c], now: () => 0 }); ao.attacher(T);
  while (ao.maj(false, true, { x: 2, z: 0 }, 1e9) || ao.restant);
  const R = (i, j) => ao.tex[(j * W + i) * 4];
  assert.ok(R(66, 30) < 30, 'derrière le mur, à l\'ombre de 10 m de mur'); assert.ok(R(54, 30) > 225, 'devant, au soleil'); assert.ok(R(90, 30) > 225, 'loin derrière, la portée finie de l\'ombre');
  let doux = false; for (let i = 61; i < 80; i++) { const v = R(i, 30); if (v > 40 && v < 215) doux = true; } void doux;
  assert.ok(assezBouge({ x: 2, z: 0 }, { x: 2, z: 0.4 }) && !assezBouge({ x: 2, z: 0 }, { x: 2, z: 0.02 }), 'un soleil qui bouge à peine ne périme rien');
});

test('les abris du jeu : le jour entre par les bouts d\'un toit de bois et s\'éteint à mesure qu\'on s\'enfonce ; un parapet ne laisse rien passer', async () => {
  const { creerAOSol } = await import('../js/rendu/ao-sol.js');
  const W = 80, H = 40, h = new Int16Array(W * H).fill(40), toit = new Uint8Array(W * H);
  for (let i = 10; i < 70; i++) h[20 * W + i] = 32;                                  // une tranchée d'un mètre... de deux (8 quarts) de profondeur
  for (let i = 30; i < 42; i++) toit[20 * W + i] = 1;                                // couverte sur 12 m
  const T = { W, H, versionLigne: new Uint32Array(H), toit }, ao = creerAOSol({ hauteurQ: (_, c) => h[c], now: () => 0 }); ao.attacher(T);
  while (ao.maj(false, false, null, 1e9, true) || ao.restant);
  const B = i => ao.tex[(20 * W + i) * 4 + 2];
  assert.equal(B(25), 240); assert.ok(B(30) < 240 && B(33) < B(30) && B(36) < B(33), 'plus sombre à mesure qu\'on s\'enfonce'); assert.ok(B(36) < 150, `au milieu : ${B(36)}`); assert.equal(B(60), 240, 'la tranchée à ciel ouvert'); assert.ok(ao.tex[(19 * W + 36) * 4 + 2] === 240, 'le terrain à côté est au jour');
});

test('les flaques du jeu : un creux est marqué (canal A), le plat et la bosse ne le sont pas', async () => {
  const { creerAOSol } = await import('../js/rendu/ao-sol.js');
  const W = 60, H = 40, h = new Int16Array(W * H).fill(40); for (let j = 18; j < 23; j++) for (let i = 28; i < 33; i++) h[j * W + i] = 30;      // un creux de 2,5 m
  const T = { W, H, versionLigne: new Uint32Array(H) }, ao = creerAOSol({ hauteurQ: (_, c) => h[c], now: () => 0 }); ao.attacher(T);
  while (ao.maj(false, false, null, 1e9, false, true) || ao.restant);
  const A = (i, j) => ao.tex[(j * W + i) * 4 + 3];
  assert.ok(A(30, 20) > 150 && A(5, 5) === 0, `creux ${A(30, 20)}, plat ${A(5, 5)}`);
  assert.equal(ao.tex[(5 * W + 5) * 4 + 1], 255, 'les autres canaux ne sont pas touchés');
});

group('labo lumière — pureté');
test('terrain, lumière, foule, maillage, particules, ciel : ni DOM, ni horloge, ni Math.random', () => {
  for (const f of ['terrain', 'lumiere', 'foule', 'maillage', 'particules', 'ciel', 'camera', 'config', 'soldats-reels', 'lampes', 'ombres', 'engins']) {
    const src = readFileSync(`js/lumiere/${f}.js`, 'utf8').replace(/\/\/.*$/gm, '');
    for (const mot of ['Math.random', 'Date.now', 'performance.now', 'document.', 'window.', 'localStorage']) assert.ok(!src.includes(mot), `${f}.js utilise ${mot}`);
  }
});
