// Les animations toutes faites (js/anim-modeles.js) : le fusil à deux mains, le tir d'une seconde.
import { articulations, pointFusil, echantillon, borner, CARRURE_NEUTRE } from '../js/pose-soldat.js';
import { marcheFusil, tir, reposFusil, porterArme, PORT_ARME, MODELES, JAMBES_TIR } from '../js/anim-modeles.js';
import { assainir, miroirAnimation } from '../js/anim-edition.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const CARR = [CARRURE_NEUTRE, { taille: 1.1, epaules: 1.12, jambes: 0.92, ventre: 1, tete: 1 }];

group('modèles — le fusil à deux mains');
test('les deux mains sont sur le fusil (à 5 mm : la cinématique inverse les y amène) et la crosse est où on l\'a voulue', () => {
  for (const car of CARR) for (const base of [{}, { buste: 0.07 }, { buste: 0.1, hancheG: 0.22 }]) {
    const p = porterArme(base, car), J = articulations(p, car);
    assert.ok(dist(J.mainD.pos, pointFusil(p, car, PORT_ARME.mainDroite)) < 0.005, `main droite ${dist(J.mainD.pos, pointFusil(p, car, PORT_ARME.mainDroite))}`);
    assert.ok(dist(J.mainG.pos, pointFusil(p, car, PORT_ARME.mainGauche)) < 0.005, 'main gauche');
    assert.ok(dist(pointFusil(p, car, 0.55), PORT_ARME.crosse) < 0.04, `crosse ${pointFusil(p, car, 0.55)}`);
  }
});
test('le fusil reste devant le soldat, canon plus haut que la crosse, du côté gauche de la crosse (le canon va vers la gauche)', () => {
  const p = porterArme({}), crosse = pointFusil(p, CARRURE_NEUTRE, 0.55), bouche = pointFusil(p, CARRURE_NEUTRE, 1.95);
  assert.ok(bouche[2] > crosse[2] + 0.8 && bouche[1] > crosse[1] && bouche[0] < crosse[0], `${crosse} → ${bouche}`);
});
test('la marche : quatre images sur une foulée de 0,8 s, en boucle ; les bras portent toujours le fusil', () => {
  const m = marcheFusil();
  assert.equal(m.images.length, 4); assert.equal(m.mode, 'boucle'); assert.ok(Math.abs(m.duree - 0.8) < 1e-9);
  for (const i of m.images) assert.ok(dist(articulations(i.pose).mainD.pos, pointFusil(i.pose, CARRURE_NEUTRE, PORT_ARME.mainDroite)) < 0.005);
  assert.ok(m.images[0].pose.hancheG !== m.images[2].pose.hancheG, 'les jambes marchent');
  for (let t = 0; t < 0.8; t += 0.1) { const p = echantillon(m, t); assert.ok(NOMS_OK(p)); }
});
test('le repos : une seule image, le fusil à deux mains', () => {
  const r = reposFusil(); assert.equal(r.images.length, 1); assert.ok(dist(articulations(r.images[0].pose).mainG.pos, pointFusil(r.images[0].pose, CARRURE_NEUTRE, PORT_ARME.mainGauche)) < 0.005);
});

group('modèles — le tir d\'une seconde');
test('le tir dure une seconde, se joue une fois, revient à la charge', () => {
  const t = tir();
  assert.equal(t.mode, 'unefois'); assert.equal(t.duree, 1); assert.equal(t.images[0].t, 0); assert.equal(t.images.at(-1).t, 1);
  assert.deepEqual(t.images[0].pose, t.images.at(-1).pose);
  assert.ok(Math.abs(tir({ duree: 1.5 }).images.at(-1).t - 1.5) < 1e-9);
});
test('les pieds sont plantés : aucune jambe ne bouge pendant tout le tir', () => {
  const t = tir();
  for (const i of t.images) for (const c of ['hancheG', 'genouG', 'chevilleG', 'hancheD', 'genouD', 'chevilleD']) assert.ok(Math.abs(i.pose[c] - JAMBES_TIR[c]) < 1e-9, `${c} à ${i.t}`);
  for (let s = 0; s <= 1; s += 0.05) { const p = echantillon(t, s); for (const c of ['hancheG', 'genouG', 'hancheD', 'genouD']) assert.ok(Math.abs(p[c] - JAMBES_TIR[c]) < 1e-9); }
});
test('le fusil monte à l\'épaule, recule au coup, la visée est tenue (la pose dure), puis il redescend', () => {
  const t = tir(), buste = s => echantillon(t, s).fusil;
  assert.ok(buste(0.2) < buste(0) - 0.1, 'à l\'épaule');
  assert.ok(buste(0.26) < buste(0.2) - 0.05, 'le recul');
  assert.ok(Math.abs(buste(0.5) - buste(0.75)) < 0.02, 'tenue');
  assert.ok(buste(0.95) > buste(0.8) + 0.1, 'il redescend');
});
test('les modèles sont des animations valides, et leur miroir (gaucher) met le fusil à gauche', () => {
  for (const m of MODELES) {
    const a = m.creer(); const s = assainir(a, borner);
    assert.equal(s.images.length, a.images.length); assert.ok(s.nom && s.duree > 0, m.id);
  }
  const g = miroirAnimation(marcheFusil()), p = g.images[0].pose, d = marcheFusil().images[0].pose;
  assert.ok(pointFusil(d, CARRURE_NEUTRE, 0.55)[0] > 0.05 && pointFusil(p, CARRURE_NEUTRE, 0.55)[0] < -0.05, 'la crosse est contre la hanche droite du droitier, la gauche du gaucher');
  assert.ok(Math.abs(pointFusil(p, CARRURE_NEUTRE, 0.55)[0] + pointFusil(d, CARRURE_NEUTRE, 0.55)[0]) < 1e-9, 'symétrique');
  assert.ok(dist(articulations(p).mainG.pos, pointFusil(p, CARRURE_NEUTRE, PORT_ARME.mainDroite)) < 0.01, 'la main gauche du gaucher est sur la poignée (le miroir de la main droite du droitier)');
  assert.ok(dist(articulations(p).mainD.pos, pointFusil(p, CARRURE_NEUTRE, PORT_ARME.mainGauche)) < 0.01, 'et sa main droite sur le fût');
});
function NOMS_OK(p) { return Object.values(p).every(Number.isFinite); }

group('modèles — les démarches (v0.141.2)');
import { allures, allure, tirEpaule } from '../js/anim-modeles.js';
import { ALLURES, TIR_EPAULE } from '../js/data/lecteur-animations.js';
test('chaque allure garde les deux mains sur le fusil tout au long de la foulée et au repos (à 1 cm), les pieds sur le sol', () => {
  const A = allures();
  assert.equal(A.marche.length, ALLURES.nombre); assert.equal(A.repos.length, ALLURES.nombre);
  for (const an of A.animations.filter(a => a.nom !== A.tir)) for (let k = 0; k < 24; k++) {
    const p = echantillon(an, k * an.duree / 24), J = articulations(p);
    for (const [g, y] of [['D', PORT_ARME.mainDroite], ['G', PORT_ARME.mainGauche]]) assert.ok(dist(J['main' + g].pos, pointFusil(p, CARRURE_NEUTRE, y)) < 0.01, `${an.nom} ${k} main ${g}`);
    assert.ok(Math.min(J.piedG.pos[1], J.piedD.pos[1]) > -0.06, `${an.nom} ${k} : un pied sous le sol`);
  }
});
test('les allures sont différentes les unes des autres (cadence, foulée, buste, la jambe d\'appui au repos), et la même pour un même rang', () => {
  const v = Array.from({ length: ALLURES.nombre }, (_, n) => allure(n));
  for (const c of ['periode', 'foulee', 'buste', 'torsion']) assert.ok(new Set(v.map(a => a[c].toFixed(4))).size >= ALLURES.nombre - 2, c);
  assert.ok(v.some(a => a.repos.cote < 0) && v.some(a => a.repos.cote > 0), 'des deux jambes');
  assert.deepEqual(allure(5), allure(5));
});
test('le tir épaulé : la crosse au creux de l\'épaule droite, le canon droit devant, les deux mains sur le fusil', () => {
  const an = tirEpaule(), p = echantillon(an, 0.5), J = articulations(p), c = pointFusil(p, CARRURE_NEUTRE, 0.55), b = pointFusil(p, CARRURE_NEUTRE, 1.95);
  assert.ok(dist(c, J.epauleD.pos) < 0.2, `crosse à ${dist(c, J.epauleD.pos)} m de l'épaule`);
  assert.ok(b[2] - c[2] > 1.2 && Math.abs(b[0] - c[0]) < 0.05 && Math.abs(b[1] - c[1]) < 0.15, `canon ${b.map(x => x.toFixed(2))}`);
  for (const [g, y] of [['D', TIR_EPAULE.mainDroite], ['G', TIR_EPAULE.mainGauche]]) assert.ok(dist(J['main' + g].pos, pointFusil(p, CARRURE_NEUTRE, y)) < 0.01, `main ${g}`);
});
import { reposVivant } from '../js/anim-modeles.js';
test('le repos vivant : les mains restent sur le fusil, les pieds au sol, le poids passe d\'une jambe sur l\'autre, il regarde de chaque côté', () => {
  const an = reposVivant(allure(3), 'r');
  assert.ok(an.duree >= ALLURES.vivant.periode[0] && an.duree <= ALLURES.vivant.periode[1]);
  let appuiMin = 9, appuiMax = -9, tMin = 9, tMax = -9;
  for (let k = 0; k < 40; k++) {
    const p = echantillon(an, k * an.duree / 40), J = articulations(p);
    for (const [g, y] of [['D', PORT_ARME.mainDroite], ['G', PORT_ARME.mainGauche]]) assert.ok(dist(J['main' + g].pos, pointFusil(p, CARRURE_NEUTRE, y)) < 0.01, `main ${g} à ${k}`);
    assert.ok(Math.min(J.piedG.pos[1], J.piedD.pos[1]) > -0.02, 'pied sous le sol');
    appuiMin = Math.min(appuiMin, p.appui); appuiMax = Math.max(appuiMax, p.appui); tMin = Math.min(tMin, p.torsion); tMax = Math.max(tMax, p.torsion);
  }
  assert.ok(appuiMin < -0.01 && appuiMax > 0.01, `appui ${appuiMin} ${appuiMax}`);
  assert.ok(tMax - tMin > 0.15, `torsion ${tMin} ${tMax}`);
});
import { reposGeste } from '../js/anim-modeles.js';
import { GESTES } from '../js/data/lecteur-animations.js';
test('les gestes d\'attente : la main droite garde le fusil, les pieds au sol ; le guetteur se baisse, la main gauche va au casque et à la bouche', () => {
  for (const g of ['froid', 'pluie', 'guetteur', 'gestes']) {
    const an = reposGeste(allure(3), g, g); let cr = [9, -9], gauche = 0;
    assert.equal(an.duree, GESTES[g].duree);
    for (let k = 0; k < 60; k++) {
      const p = echantillon(an, k * an.duree / 60), J = articulations(p);
      assert.ok(dist(J.mainD.pos, pointFusil(p, CARRURE_NEUTRE, PORT_ARME.mainDroite)) < 0.01, `${g} : main droite à ${k}`);
      assert.ok(Math.min(J.piedG.pos[1], J.piedD.pos[1]) > -0.02, `${g} : pied sous le sol`);
      cr = [Math.min(cr[0], J.crane.pos[1]), Math.max(cr[1], J.crane.pos[1])]; gauche = Math.max(gauche, dist(J.mainG.pos, pointFusil(p, CARRURE_NEUTRE, PORT_ARME.mainGauche)));
    }
    if (g === 'guetteur') assert.ok(cr[1] - cr[0] > 0.15, `il se baisse : ${cr}`);
    if (g === 'gestes') assert.ok(gauche > 0.3, `la main gauche quitte le fût : ${gauche}`);
    if (g === 'froid') assert.ok(gauche > 0.05, 'il se frotte les mains');
  }
});

import { poseMort, chute } from '../js/anim-modeles.js';
import { MORTS } from '../js/data/lecteur-animations.js';
test('les morts : chacun sa pose, tirée de son numéro (la même deux fois), sur les quatre côtés ; rien sous le sol ni qui flotte (mains, pieds, fusil)', () => {
  const cotes = [0, 0, 0, 0]; let echecs = 0;
  for (let n = 0; n < 300; n++) {
    const p = poseMort(n);
    assert.deepEqual(p, poseMort(n));
    const q = Math.floor(p.couche / 2); cotes[q]++;
    assert.ok(Math.abs(p.couche - (2 * q + 1)) < 1e-9, 'étendu');
    const A = articulations(p), ys = ['mainG', 'mainD', 'piedG', 'piedD', 'crane', 'genouG', 'genouD', 'coudeG', 'coudeD'].map(j => A[j].pos[1]);
    const f = [0.55, 1.95].map(y => pointFusil(p, CARRURE_NEUTRE, y)[1]);
    if (Math.min(...ys) < -0.07 || Math.min(...f) < -0.1 || Math.max(A.mainG.pos[1], A.mainD.pos[1], A.piedG.pos[1], A.piedD.pos[1], ...f) > MORTS.haut + 0.1) echecs++;
  }
  assert.ok(cotes.every(c => c > 30), `les quatre côtés : ${cotes}`);
  assert.ok(echecs <= 3, `${echecs} poses sur 300 hors du sol`);
});
test('la chute : debout au départ, étendue dans la pose du mort à la fin, la tête descend sans remonter', () => {
  for (const n of [3, 17, 404, 9001]) {
    const an = chute(n), fin = poseMort(n);
    assert.equal(an.mode, 'unefois');
    assert.ok(articulations(echantillon(an, 0)).crane.pos[1] > 1.5);
    const p = echantillon(an, an.duree);
    for (const c of ['couche', 'hancheG', 'epauleD', 'fusil', 'fusilRoulis']) assert.ok(Math.abs(p[c] - fin[c]) < 1e-6, c);
    let avant = Infinity;
    for (let t = 0; t <= 0.85 * an.duree; t += 0.05) { const y = articulations(echantillon(an, t)).crane.pos[1]; assert.ok(y <= avant + 0.02, `t ${t.toFixed(2)}`); avant = y; }
  }
});
