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
