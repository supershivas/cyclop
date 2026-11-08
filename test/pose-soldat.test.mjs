// Les poses et les animations du soldat articulé (js/pose-soldat.js) : la logique pure de l'atelier d'animation.
import { poseNeutre, poseDe, melanger, borner, miroir, animation, echantillon, marcheEnImages, CARRURE_NEUTRE } from '../js/pose-soldat.js';
import { CHAMPS, NOMS_CHAMPS, COURBES } from '../js/data/poses-soldat.js';

const proche = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

group('poses — le format');
test('toute pose du jeu a tous les champs, finis et dans leurs bornes', () => {
  for (const vit of [0, 0.5, 1]) for (const phase of [0, 1, 2, 3, 4, 5, 6]) for (const tir of [0, 0.5, 1]) for (const tapi of [0, 1]) for (const pistolet of [false, true]) {
    const p = poseDe({ vit, phase, tir, tapi, pistolet });
    for (const c of NOMS_CHAMPS) { assert.ok(Number.isFinite(p[c]), c); assert.ok(p[c] >= CHAMPS[c][0] - 1e-9 && p[c] <= CHAMPS[c][1] + 1e-9, `${c} ${p[c]}`); }
  }
  for (const pose of [poseDe({ melee: true, pouss: 1 }), poseDe({ retenu: true }), poseDe({ couche: 1 })]) for (const c of NOMS_CHAMPS) assert.ok(pose[c] >= CHAMPS[c][0] - 1e-9 && pose[c] <= CHAMPS[c][1] + 1e-9, c);
});
test("à l'arrêt, la pose est la neutre", () => {
  assert.deepEqual(poseDe(), poseNeutre());
});
test('la marche : les jambes en opposition de phase, le bras à l\'opposé de la jambe du même côté', () => {
  const p = poseDe({ vit: 1, phase: Math.PI / 2 });
  assert.ok(proche(p.hancheG, 0.55) && proche(p.hancheD, -0.55));
  assert.ok(proche(p.epauleG, -0.5) && proche(p.epauleD, 0.5));
});
test('accroupi : le corps baisse, les genoux plient, les basques suivent', () => {
  const p = poseDe({ tapi: 1 });
  assert.ok(proche(p.descente, 0.44) && proche(p.genouG, 1.9) && proche(p.basques, 0.75) && proche(p.buste, 0.55));
});
test("le tir : le fusil tourne de −1,45 rad ; l'officier tire d'une main, sans fusil à l'épaule ni mêlée", () => {
  assert.ok(proche(poseDe({ tir: 1 }).fusil, -1.45));
  assert.ok(proche(poseDe({ tir: 1, pistolet: true }).epauleD, 1.2));
  assert.deepEqual(poseDe({ melee: true, pistolet: true, tir: 0 }), poseDe({ pistolet: true }));
});
test('la mêlée : la poussée avance le fusil et le buste', () => {
  const a = poseDe({ melee: true, pouss: 0 }), b = poseDe({ melee: true, pouss: 1 });
  assert.ok(b.fusilZ > a.fusilZ && b.poussee > a.poussee && b.buste > a.buste);
});

group('poses — le mélange');
test('mélanger : les extrémités, le milieu, un champ absent', () => {
  const a = poseDe({ tapi: 1 }), b = poseNeutre();
  assert.deepEqual(melanger(a, b, 0), a);
  assert.deepEqual(melanger(a, b, 1), b);
  assert.ok(proche(melanger(a, b, 0.5).genouG, 0.95));
  assert.ok(proche(melanger({ buste: 1 }, { buste: 0 }, 0.5).buste, 0.5));
});
test('le miroir échange les côtés, deux fois il rend la pose', () => {
  const p = poseDe({ vit: 1, phase: 1.3, tir: 0.7 });
  const m = miroir(p);
  assert.ok(proche(m.hancheG, p.hancheD) && proche(m.convG, -p.convD));
  const m2 = miroir(m); for (const c of NOMS_CHAMPS) assert.ok(Math.abs(m2[c] - p[c]) < 1e-12, c);      // (à l'arrondi près : le fusil se retourne de 0,79)
});
test("borner ne limite rien : seuls les valeurs non numériques tombent à zéro, tous les champs existent", () => {
  const b = borner({ buste: 50, genouG: -3, tete: NaN, fusilLacet: '2.5', coudeD: Infinity });
  assert.equal(b.buste, 50); assert.equal(b.genouG, -3); assert.equal(b.tete, 0); assert.equal(b.fusilLacet, 2.5); assert.equal(b.coudeD, 0);
  assert.deepEqual(Object.keys(b), NOMS_CHAMPS);
});
test('une pose hors de toute plage reste une pose : les articulations restent des nombres finis', () => {
  const folle = borner({ genouG: -2, hancheD: 9, epauleG: -7, fusil: 12, fusilLacet: -20, fusilRoulis: 15, fusilX: 3, fusilH: -4, fusilZ: 5, descente: -2, poussee: 3, buste: 8 });
  const J = articulations(folle);
  for (const j of Object.values(J)) assert.ok(j.pos.every(Number.isFinite) && j.rots.every(r => r.axe.every(Number.isFinite)));
});

group('animations — les images clés');
const A = (boucle = false) => animation('essai', [
  { t: 0, pose: { buste: 0 }, courbe: 'lineaire' },
  { t: 1, pose: { buste: 1 }, courbe: 'lineaire' },
  { t: 3, pose: { buste: 0.2 }, courbe: 'lineaire' },
], { boucle });
test('sans boucle : bornée aux extrémités, linéaire entre deux images', () => {
  const a = A();
  assert.ok(proche(echantillon(a, -5).buste, 0) && proche(echantillon(a, 0.5).buste, 0.5) && proche(echantillon(a, 1).buste, 1));
  assert.ok(proche(echantillon(a, 2).buste, 0.6) && proche(echantillon(a, 99).buste, 0.2));
});
test("en boucle : la dernière image mène à la première, et t se replie", () => {
  const a = A(true);
  assert.ok(a.duree > 3);
  assert.deepEqual(echantillon(a, 0.4), echantillon(a, 0.4 + a.duree));
  assert.deepEqual(echantillon(a, 0.4), echantillon(a, 0.4 - 2 * a.duree));
  const juste = echantillon(a, 3.5).buste;
  assert.ok(juste < 0.2 && juste > 0, `${juste}`);
});
test("les images arrivent dans le désordre : elles sont rangées par t", () => {
  const a = animation('x', [{ t: 1, pose: { buste: 1 } }, { t: 0, pose: { buste: 0 } }], { boucle: false });
  assert.equal(a.images[0].t, 0);
});
test("une animation vide ou d'une image seule est la neutre / cette image", () => {
  assert.deepEqual(echantillon(animation('v', []), 1), poseNeutre());
  assert.equal(echantillon(animation('u', [{ t: 0, pose: { buste: 0.3 } }]), 4).buste, 0.3);
});
test('chaque courbe va de 0 à 1 sans dépasser les images clés (hors ressort)', () => {
  for (const courbe of ['lineaire', 'doux', 'entree', 'sortie']) {
    const a = animation('c', [{ t: 0, pose: { buste: 0 }, courbe }, { t: 1, pose: { buste: 1 } }], { boucle: false });
    let prec = -1;
    for (let i = 0; i <= 20; i++) { const v = echantillon(a, i / 20).buste; assert.ok(v >= prec - 1e-12 && v >= 0 && v <= 1 + 1e-12, courbe); prec = v; }
  }
});
test('la marche en quatre images revient à son point de départ et reste près de la marche du jeu', () => {
  const m = marcheEnImages(1, 0.8);
  assert.deepEqual(echantillon(m, 0), echantillon(m, 0.8));
  const ecart = Math.max(...[0.1, 0.3, 0.5, 0.7].map(t => Math.abs(echantillon(m, t).hancheG - poseDe({ vit: 1, phase: t / 0.8 * 2 * Math.PI }).hancheG)));
  assert.ok(ecart < 0.2, `écart ${ecart}`);
});

group('poses — où sont les articulations');
import { articulations, OS_ARTICULES } from '../js/pose-soldat.js';
const pres = (a, b, e = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < e);
test('debout : les pivots sont ceux du modèle (genou à 0,5 m, hanche à 0,9 m, épaule à 1,38 m)', () => {
  const J = articulations(poseNeutre());
  assert.ok(pres(J.genouG.pos, [-0.11, 0.5, 0]) && pres(J.genouD.pos, [0.11, 0.5, 0]));
  assert.ok(pres(J.hancheG.pos, [-0.11, 0.9, 0]) && pres(J.epauleD.pos, [0.30, 1.38, 0]) && pres(J.chevilleD.pos, [0.11, 0.08, 0]));
});
test('la hanche fléchie de 90° : le genou part vers l\'avant (+z), à 0,4 m', () => {
  const J = articulations({ ...poseNeutre(), hancheG: Math.PI / 2 });
  assert.ok(pres(J.genouG.pos, [-0.11, 0.9, 0.4]), JSON.stringify(J.genouG.pos));
});
test('le genou plié renvoie la cheville vers l\'arrière (−z) : elle tourne autour du genou', () => {
  const a = articulations({ ...poseNeutre(), genouD: Math.PI / 2 }).chevilleD.pos;
  assert.ok(pres(a, [0.11, 0.5, -0.42], 1e-6), JSON.stringify(a));
});
test('chaque axe est unitaire, chaque articulation a son nom ; les deux jambes sont symétriques au repos', () => {
  const J = articulations(poseDe({ tir: 1 }));
  for (const [id, j] of Object.entries(J)) { assert.ok(j.nom && j.pos.every(Number.isFinite), id); for (const r of j.rots) assert.ok(Math.abs(Math.hypot(...r.axe) - 1) < 1e-9, id); }
  const R = articulations(poseNeutre());
  assert.ok(Math.abs(R.genouG.pos[0] + R.genouD.pos[0]) < 1e-9 && R.genouG.pos[1] === R.genouD.pos[1]);
});
test('le corps baissé descend toutes les articulations, la poussée avance la poitrine', () => {
  const a = articulations(poseNeutre()), b = articulations({ ...poseNeutre(), descente: 0.4, poussee: 0.2 });
  assert.ok(Math.abs(a.genouG.pos[1] - b.genouG.pos[1] - 0.4) < 1e-9 && b.poitrine.pos[2] > a.poitrine.pos[2] + 0.05 && Math.abs(b.genouG.pos[2]) < 1e-9);
});
test('la carrure : un homme plus grand a ses articulations plus haut', () => {
  const a = articulations(poseNeutre()), b = articulations(poseNeutre(), { taille: 1.1, epaules: 1, jambes: 1, ventre: 1, tete: 1 });
  assert.ok(b.epauleG.pos[1] > a.epauleG.pos[1] * 1.05);
});
test('une pose ne change pas quand on la lit : articulations ne modifie pas la pose reçue', () => {
  const p = poseDe({ vit: 1, phase: 1 }), copie = JSON.stringify(p);
  articulations(p); assert.equal(JSON.stringify(p), copie);
});

test('chaque os relie deux articulations qui existent, et les poignées ne portent pas les extrémités', () => {
  const J = articulations(poseDe({ vit: 1, phase: 2 }));
  for (const [a, b] of OS_ARTICULES) { assert.ok(J[a] && J[b], `${a} ${b}`); assert.ok(Math.hypot(...J[a].pos.map((v, i) => v - J[b].pos[i])) > 0.02, `${a}-${b} confondus`); }
  for (const id of ['mainG', 'mainD', 'piedG', 'piedD', 'crane']) assert.ok(J[id].passif && !J[id].rots.length);
});
test('les os gardent leur longueur quand on plie : hanche-genou 0,4 m, genou-cheville 0,42 m, épaule-coude 0,3 m (hors poussée)', () => {
  for (const p of [poseNeutre(), poseDe({ tapi: 1 }), poseDe({ vit: 1, phase: 1 }), poseDe({ melee: true, pouss: 1 })]) {
    const J = articulations(p), d = (a, b) => Math.hypot(...J[a].pos.map((v, i) => v - J[b].pos[i]));
    assert.ok(Math.abs(d('hancheG', 'genouG') - 0.4) < 1e-6 && Math.abs(d('genouG', 'chevilleG') - 0.42) < 1e-6);
    if (!p.poussee) assert.ok(Math.abs(d('epauleD', 'coudeD') - 0.3) < 1e-6, `épaule-coude ${d('epauleD', 'coudeD')}`);      // (la poussée du nuanceur est un cisaillement : plus haut, plus en avant ; elle n'est pas rigide)
  }
});

group('poses — le fusil comme un corps');
test('le fusil a trois rotations et trois déplacements, à son axe (0,395 m) et à la hauteur de son pivot', () => {
  const f = articulations(poseNeutre()).fusil;
  assert.ok(pres(f.pos, [0.395, 1.3, 0]), JSON.stringify(f.pos));
  assert.deepEqual(f.rots.map(r => r.champ), ['fusil', 'fusilLacet', 'fusilRoulis']);
  assert.deepEqual(f.deplace.map(d => d.champ).sort(), ['fusilH', 'fusilX', 'fusilZ']);
});
test('la hauteur et la poussée du fusil le déplacent, le décalage latéral aussi (en largeur d\'épaules)', () => {
  const a = articulations(poseNeutre()).fusil.pos, b = articulations({ ...poseNeutre(), fusilH: 0.2, fusilZ: 0.3, fusilX: -0.1 }).fusil.pos;
  assert.ok(pres(b, [a[0] - 0.1, a[1] + 0.2, a[2] + 0.3]), JSON.stringify(b));
});
test('le lacet et le roulis tournent autour de l\'axe du fusil : son point d\'attache ne bouge pas', () => {
  const a = articulations(poseNeutre()).fusil.pos, b = articulations({ ...poseNeutre(), fusilLacet: 1, fusilRoulis: -0.7 }).fusil.pos;
  assert.ok(pres(a, b));
});
test('les axes des trois rotations sont perpendiculaires entre eux au repos : x, y, z', () => {
  const r = articulations(poseNeutre()).fusil.rots, d = (a, b) => Math.abs(a.axe[0] * b.axe[0] + a.axe[1] * b.axe[1] + a.axe[2] * b.axe[2]);
  assert.ok(d(r[0], r[1]) < 1e-6 && d(r[1], r[2]) < 1e-6 && d(r[0], r[2]) < 1e-6);
});
test('le miroir change le sens du lacet et du roulis', () => {
  const m = miroir({ ...poseNeutre(), fusilLacet: 0.5, fusilRoulis: -0.2, fusilH: 0.1 });
  assert.ok(proche(m.fusilLacet, -0.5) && proche(m.fusilRoulis, 0.2) && proche(m.fusilH, 0.1));
  assert.ok(proche(articulations(m).fusil.pos[0], -articulations({ ...poseNeutre(), fusilLacet: 0.5, fusilRoulis: -0.2, fusilH: 0.1 }).fusil.pos[0]), 'le fusil passe de l\'autre côté du corps');
});

group('poses — la cinématique inverse');
import { ikBras, ikJambe } from '../js/pose-soldat.js';
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const CORPS = [
  ['debout', {}], ['penché', { buste: 0.5 }], ['poussée', { buste: 0.3, poussee: 0.2 }], ['baissé', { descente: 0.4, buste: 0.2 }], ['couché', { couche: 1 }], ['tout', { buste: -0.3, poussee: 0.15, descente: 0.3 }],
];
const CARR = [{ taille: 1, epaules: 1, jambes: 1, ventre: 1, tete: 1 }, { taille: 1.12, epaules: 1.15, jambes: 0.9, ventre: 1, tete: 1 }];
test('la main rejoint toute cible atteignable : la cinématique directe la retrouve (corps penché, poussé, baissé, couché, carrures)', () => {
  let n = 0, pire = 0;
  for (const [nom, corps] of CORPS) for (const car of CARR) for (const g of ['G', 'D']) for (const sh of [-0.8, 0.2, 1.1, 2.4]) for (const conv of [-1, 0, 0.9]) for (const el of [0.3, 1.2, 2.3]) {
    const but = articulations({ ...poseNeutre(), ...corps, ['epaule' + g]: sh, ['conv' + g]: conv, ['coude' + g]: el }, car)['main' + g].pos;
    const depart = { ...poseNeutre(), ...corps };           // (la pose de départ est celle du repos : le pli du coude est vers l'avant)
    const r = ikBras(depart, car, g, but), e = dist(articulations({ ...depart, ...r }, car)['main' + g].pos, but);
    pire = Math.max(pire, e); n++;
    assert.ok(e < 1e-6, `${nom} ${g} sh${sh} conv${conv} el${el} : écart ${e}`);
  }
  assert.ok(n > 800 && pire < 1e-6);
});
test('une cible hors de portée : le bras se tend vers elle, la main s\'arrête à la longueur du bras', () => {
  for (const g of ['G', 'D']) {
    const P = poseNeutre(), loin = [0.4, 1.6, 3];
    const r = ikBras(P, CARR[0], g, loin), main = articulations({ ...P, ...r })['main' + g].pos, epaule = articulations({ ...P, ...r })['epaule' + g].pos;
    assert.ok(Math.abs(dist(main, epaule) - 0.62) < 1e-3, `portée ${dist(main, epaule)}`);
    const v = [loin[0] - epaule[0], loin[1] - epaule[1], loin[2] - epaule[2]], w = [main[0] - epaule[0], main[1] - epaule[1], main[2] - epaule[2]];
    const cos = (v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) / (Math.hypot(...v) * Math.hypot(...w));
    assert.ok(cos > 0.9999, `direction ${cos}`);
  }
});
test('la cheville rejoint toute cible atteignable, et le pied garde son angle dans le monde', () => {
  let n = 0;
  for (const [nom, corps] of CORPS) for (const car of CARR) for (const g of ['G', 'D']) for (const hip of [-0.6, 0.3, 1.3]) for (const kn of [0.05, 0.9, 2.2]) {
    const arrivee = { ...poseNeutre(), ...corps, ['hanche' + g]: hip, ['genou' + g]: kn, ['cheville' + g]: 0.2 };
    const but = articulations(arrivee, car)['cheville' + g].pos;
    const depart = { ...poseNeutre(), ...corps, ['hanche' + g]: 0.1, ['genou' + g]: 0.4, ['cheville' + g]: 0.3 };
    const r = ikJambe(depart, car, g, but), P = { ...depart, ...r };
    assert.ok(dist(articulations(P, car)['cheville' + g].pos, but) < 1e-6, `${nom} ${g}`);
    assert.ok(Math.abs((P['cheville' + g] - P['genou' + g] + P['hanche' + g]) - (depart['cheville' + g] - depart['genou' + g] + depart['hanche' + g])) < 1e-9, 'le pied tourne dans le monde');
    n++;
  }
  assert.ok(n > 200);
});
test('le genou plie à l\'envers vers l\'arrière, le coude vers l\'avant : le sens du pli actuel est gardé', () => {
  const depart = poseNeutre(), but = articulations({ ...depart, hancheG: 0.9, genouG: 1.3 })['chevilleG'].pos;
  const r = ikJambe(depart, CARR[0], 'G', but);
  assert.ok(r.genouG > 0, `genou ${r.genouG}`);
  const b2 = ikBras(depart, CARR[0], 'D', articulations({ ...depart, epauleD: 0.5, coudeD: 1.4 }).mainD.pos);
  assert.ok(b2.coudeD > 0, `coude ${b2.coudeD}`);
});
test('les angles restent proches des actuels : un bras déjà levé de plus d\'un tour ne saute pas d\'un tour', () => {
  const P = { ...poseNeutre(), epauleD: 0.5 + 2 * Math.PI, coudeD: 1 + 2 * Math.PI, convD: 0.3 - 2 * Math.PI };
  const but = articulations({ ...poseNeutre(), epauleD: 0.6, coudeD: 1.1, convD: 0.35 }).mainD.pos;
  const r = ikBras(P, CARR[0], 'D', but);
  assert.ok(Math.abs(r.epauleD - P.epauleD) < Math.PI && Math.abs(r.coudeD - P.coudeD) < Math.PI && Math.abs(r.convD - P.convD) < Math.PI, JSON.stringify(r));
});
test('une cible juste au-dessus de l\'épaule (azimut indéfini) ne donne ni NaN ni saut', () => {
  const P = poseNeutre(), sp = articulations(P).epauleD.pos, r = ikBras(P, CARR[0], 'D', [sp[0], sp[1] + 0.4, sp[2]]);
  for (const v of Object.values(r)) assert.ok(Number.isFinite(v));
  assert.ok(dist(articulations({ ...P, ...r }).mainD.pos, [sp[0], sp[1] + 0.4, sp[2]]) < 1e-6);
});
test('les mains et les chevilles ont des poignées de déplacement par cinématique inverse', () => {
  const J = articulations(poseNeutre());
  for (const id of ['mainG', 'mainD', 'chevilleG', 'chevilleD']) assert.ok(J[id].ik && J[id].deplace.length === 3 && J[id].deplace.every(d => d.ik), id);
});

group('poses — les modes de lecture et le point du fusil');
import { pointFusil, modeDe } from '../js/pose-soldat.js';
test('en une fois la dernière pose est tenue, en boucle la dernière image mène à la première, en aller-retour on revient', () => {
  const mk = mode => animation('m', [{ t: 0, pose: { buste: 0 }, courbe: 'lineaire' }, { t: 1, pose: { buste: 1 }, courbe: 'lineaire' }], { mode, duree: 2 });
  const u = mk('unefois'), b = mk('boucle'), ar = mk('allerretour');
  assert.ok(proche(echantillon(u, 1.5).buste, 1) && proche(echantillon(u, 99).buste, 1));
  assert.ok(proche(echantillon(b, 1.5).buste, 0.5) && proche(echantillon(b, 2.25).buste, echantillon(b, 0.25).buste));
  assert.ok(proche(echantillon(ar, 0.5).buste, 0.5) && proche(echantillon(ar, 2.5).buste, echantillon(ar, 1.5).buste) && proche(echantillon(ar, 3.5).buste, echantillon(ar, 0.5).buste));
  assert.equal(modeDe({ boucle: false }), 'unefois'); assert.equal(modeDe({}), 'boucle'); assert.equal(modeDe({ mode: 'allerretour', boucle: true }), 'allerretour');
});
test('chaque courbe va de 0 à 1 (le palier tient la pose jusqu\'au bout)', () => {
  for (const [nom, f] of Object.entries(COURBES)) { assert.ok(proche(f(0), 0, 1e-6) && proche(f(1), 1, 1e-6), nom); }
  assert.equal(COURBES.palier(0.99), 0);
});
test('le point du fusil : sur l\'axe du fusil, à la hauteur demandée ; il suit sa flexion', () => {
  assert.ok(pres(pointFusil(poseNeutre(), CARRURE_NEUTRE, 1.3), articulations(poseNeutre()).fusil.pos));
  const horizontal = { ...poseNeutre(), fusil: -Math.PI / 2 }, a = pointFusil(horizontal, CARRURE_NEUTRE, 0.55), b = pointFusil(horizontal, CARRURE_NEUTRE, 1.95);
  assert.ok(b[2] - a[2] > 1.3 && Math.abs(b[1] - a[1]) < 1e-6, `à l'horizontale : ${a} → ${b}`);
});
