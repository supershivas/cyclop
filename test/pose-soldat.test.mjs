// Les poses et les animations du soldat articulé (js/pose-soldat.js) : la logique pure de l'atelier d'animation.
import { poseNeutre, poseDe, melanger, borner, miroir, animation, echantillon, marcheEnImages } from '../js/pose-soldat.js';
import { CHAMPS, NOMS_CHAMPS } from '../js/data/poses-soldat.js';

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
  assert.deepEqual(miroir(m), p);
});
test('borner remet les champs dans leurs bornes et les NaN à zéro', () => {
  const b = borner({ buste: 50, genouG: -3, tete: NaN });
  assert.equal(b.buste, CHAMPS.buste[1]); assert.equal(b.genouG, 0); assert.equal(b.tete, 0);
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
