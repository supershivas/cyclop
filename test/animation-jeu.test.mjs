// Qui joue quoi pour les hommes articulés (js/rendu/animation-jeu.js, étape 4 de docs/chantiers/animations-vers-le-jeu.md).
import { creerJeuAnimations, avecAnimation } from '../js/rendu/animation-jeu.js';
import { FLOTTANTS } from "../js/rendu/pose-jeu.js";
import { poseDe } from '../js/pose-soldat.js';
import { NOMS_CHAMPS, CANAUX } from '../js/data/poses-soldat.js';
import { ANIMATIONS } from '../js/data/animations.js';
import { ANIM_JEU, MARCHE_JEU, CANAUX_TIR_EN_MARCHE } from '../js/data/lecteur-animations.js';
import { echantillon } from '../js/pose-soldat.js';

const base = { vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, coup: 0, aspect: { rang: 6 } };
const vers = (j, id, h, t) => Array.from(j.pose(id, { ...base, ...h }, t));
const champ = (v, c) => v[NOMS_CHAMPS.indexOf(c)];
const anim = nom => ANIMATIONS.find(a => a.nom === nom);
const ecart = (v, P) => Math.max(...NOMS_CHAMPS.map(c => Math.abs(champ(v, c) - P[c])));

group('animation du jeu — qui joue quoi');
test('à l\'arrêt, la pose est celle de l\'animation « repos », à 1e-6 près (fondu fini)', () => {
  const j = creerJeuAnimations(); j.debut();
  for (let t = 0; t <= 1; t += 1 / 60) vers(j, 1, {}, t);
  assert.ok(ecart(vers(j, 1, {}, 1.1), echantillon(anim(ANIM_JEU.repos), 1.1)) < 1e-6);
});
test('en marche, la pose est celle de l\'animation « marche » à la phase de l\'homme, à 1e-6 près (Float32 : 1e-6 sur des angles < 2)', () => {
  const j = creerJeuAnimations(); j.debut();
  let t = 0, v;
  for (; t <= 1.5; t += 1 / 60) v = vers(j, 2, { vit: 1 }, t);
  const ta = j.hommes.get(2).ta;
  assert.ok(ecart(v, echantillon(anim(ANIM_JEU.marche), ta)) < 1e-6);
});
test('les jambes de la marche d\'avant (poseDe, vitesse 1) sont celles de l\'animation aux quatre images clés', () => {
  const marche = anim(ANIM_JEU.marche);
  marche.images.forEach((im, i) => {
    const P = poseDe({ vit: 1, phase: i * Math.PI / 2 });
    for (const c of [...CANAUX.jambeG, ...CANAUX.jambeD]) assert.ok(Math.abs(im.pose[c] - P[c]) < 1e-3, `image ${i} ${c}`);
  });
});
test('la vitesse de lecture suit la vitesse : à vitesse double, la phase avance deux fois plus vite', () => {
  const a = creerJeuAnimations(), b = creerJeuAnimations(); a.debut(); b.debut();
  vers(a, 3, { vit: 0.8 }, 0); vers(b, 3, { vit: 1.6 }, 0);
  const a0 = a.hommes.get(3).ta, b0 = b.hommes.get(3).ta;
  vers(a, 3, { vit: 0.8 }, 0.1); vers(b, 3, { vit: 1.6 }, 0.1);
  assert.ok(Math.abs((b.hommes.get(3).ta - b0) / (a.hommes.get(3).ta - a0) - 2) < 1e-9);
});
test('les états sans animation rendent null : poseJeu les garde', () => {
  const j = creerJeuAnimations(); j.debut();
  for (const h of [{ tir: -1 }, { tir: 2.4 }, { tapi: 1 }, { blessure: 2 }, { aspect: { rang: 1 } }]) {
    assert.equal(j.pose(9, { ...base, ...h }, 0), null, JSON.stringify(h));
    assert.equal(avecAnimation({ ...base, ...h }), false);
  }
  assert.ok(avecAnimation({ ...base, tir: 1 }));
});
test('un coup de feu (tirVal passe à 1) lance le tir une fois, 1 s ; un autre coup pendant ce temps ne le relance pas', () => {
  const j = creerJeuAnimations(); j.debut();
  let t = 0;
  for (; t < 1; t += 1 / 60) vers(j, 4, {}, t);
  vers(j, 4, { coup: 1, tir: 1 }, t); const depart = j.hommes.get(4).tir.depart;
  assert.ok(Math.abs(depart - t) < 1e-9);
  vers(j, 4, { coup: 0.4, tir: 1 }, t + 0.5); vers(j, 4, { coup: 1, tir: 1 }, t + 0.6);
  assert.equal(j.hommes.get(4).tir.depart, depart, 'pas de relance avant la fin');
  vers(j, 4, {}, t + 1.05);
  assert.equal(j.hommes.get(4).tir, null, 'fini après 1 s');
});
test('à l\'arrêt, tout vient du tir au milieu du coup ; en marche, seuls les bras et le fusil', () => {
  const tirA = anim(ANIM_JEU.tir);
  for (const marche of [false, true]) {
    const j = creerJeuAnimations(); j.debut();
    let t = 0;
    for (; t < 1; t += 1 / 60) vers(j, 5, { vit: marche ? 1 : 0 }, t);
    vers(j, 5, { vit: marche ? 1 : 0, coup: 1 }, t); const t0 = t;
    let v;
    for (t += 1 / 60; t < t0 + 0.6; t += 1 / 60) v = vers(j, 5, { vit: marche ? 1 : 0 }, t);
    const T = echantillon(tirA, t - 1 / 60 - t0);
    const canaux = marche ? CANAUX_TIR_EN_MARCHE : Object.keys(CANAUX);
    for (const k of canaux) for (const c of CANAUX[k]) assert.ok(Math.abs(champ(v, c) - T[c]) < 1e-5, `${marche ? 'marche' : 'arrêt'} ${c}`);
    if (marche) assert.ok(Math.abs(champ(v, 'hancheG') - echantillon(anim(ANIM_JEU.marche), j.hommes.get(5).ta)['hancheG']) < 1e-5, 'les jambes restent à la marche');
  }
});
test('le fondu ne saute pas au coup de feu : l\'image du coup est celle de l\'homme qui ne tire pas, puis l\'écart grandit sans à-coup', () => {
  for (const vit of [0, 1]) {
    const j = creerJeuAnimations(), ref = creerJeuAnimations(); j.debut(); ref.debut();
    let precEcart = null, pire = 0, auCoup = null;
    for (let n = 0; n < 180; n++) {
      const t = n / 60, coup = n === 90 ? 1 : 0;
      const v = vers(j, 6, { vit, coup, tir: coup ? 1 : 0 }, t), r = vers(ref, 6, { vit }, t);
      const ecart = v.map((x, i) => x - r[i]);       // ce que le coup de feu ajoute à la marche ou au repos
      if (precEcart && n >= 90 && n < 168) { const d = Math.max(...ecart.map((x, i) => Math.abs(x - precEcart[i]))); pire = Math.max(pire, d); if (n === 90) auCoup = d; }
      precEcart = ecart;
    }
    // sans fondu, du repos (fusil à −0,7) au tir (−1,45) la pose sauterait de 0,75 en une image ; le fondu de 0,2 s (12 images, courbe lisse) plus le mouvement propre du tir restent sous 0,2
    assert.ok(auCoup < 1e-5, `vit ${vit} : l'image du coup s'écarte de ${auCoup}`);
    assert.ok(pire < 0.2, `vit ${vit} : plus grand écart d'une image ${pire.toFixed(3)}`);
  }
});
test('un homme qui sort des plus proches est purgé', () => {
  const j = creerJeuAnimations(); j.debut(); vers(j, 7, {}, 0); vers(j, 8, {}, 0); j.fin();
  j.debut(); vers(j, 7, {}, 0.1); j.fin();
  assert.ok(j.hommes.has(7) && !j.hommes.has(8));
});
test('le lecteur coûte moins d\'1 ms pour 250 hommes (V8 chaud, 3 sur 4 marchent, un coup toutes les 5 s par homme)', () => {
  const j = creerJeuAnimations(), hs = Array.from({ length: 250 }, (_, i) => ({ ...base, vit: i % 4 ? 1 : 0 }));
  let n = 0;
  const image = () => { j.debut(); for (let i = 0; i < 250; i++) { hs[i].coup = (n + i * 7) % 300 === 0 ? 1 : 0; j.pose(i, hs[i], n / 60); } j.fin(); n++; };
  for (let k = 0; k < 600; k++) image();
  const N = 900, t0 = performance.now(); for (let k = 0; k < N; k++) image();
  const ms = (performance.now() - t0) / N;
  console.log(`    ${ms.toFixed(3)} ms pour 250 hommes`);
  assert.ok(ms < 1, `${ms} ms`);
});
