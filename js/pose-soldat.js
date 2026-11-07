// Les poses et les animations du soldat articulé (logique pure : aucun DOM, aucun THREE, aucune horloge).
//
//  · une POSE est un objet { buste, tete, hancheG, genouG, … } (les champs de `CHAMPS`, data/poses-soldat.js) : un angle par articulation ;
//  · `poseDe(état)` rend la pose qu'écrit le nuanceur de js/rendu/soldat-articule.js pour un état du jeu (marche, tir, accroupi, mêlée…) : la référence que l'atelier d'animation
//    rejoue avant qu'on la retouche ;
//  · une ANIMATION est { nom, boucle, images: [{ t, pose, courbe }] } : des poses clés rangées par temps (en secondes) ; `echantillon(anim, t)` rend la pose à l'instant t ;
//  · `melanger(a, b, k)` interpole deux poses champ par champ.
import { CHAMPS, NOMS_CHAMPS, MARCHE, TAPI, TIR, RETENU, MELEE, COUCHE, FUSIL_REPOS, COURBES } from './data/poses-soldat.js';

// La pose neutre : debout, bras le long du corps (le coude à peine plié, comme à l'arrêt)
export function poseNeutre() {
  const p = {};
  for (const c of NOMS_CHAMPS) p[c] = 0;
  p.coudeG = p.coudeD = MARCHE.coude0;
  p.fusilY = FUSIL_REPOS.pivot;
  return p;
}

// L'état du jeu → la pose, comme le nuanceur : { vit 0..1, phase (rad), tir 0..1, tapi 0..1, couche 0|1, retenu, melee, pouss 0..1, pistolet }
export function poseDe({ vit = 0, phase = 0, tir = 0, tapi = 0, couche = 0, retenu = false, melee = false, pouss = 0, pistolet = false } = {}) {
  const P = poseNeutre();
  const v = Math.min(1, Math.max(0, vit)), sph = Math.sin(phase), cph = Math.cos(phase);
  if (melee && pistolet) melee = false;                 // l'officier ne fait ni mêlée ni feu retenu
  if (retenu && pistolet) retenu = false;
  const t = melee ? 0 : Math.min(1, Math.max(0, tir));
  // les jambes
  for (const [g, sg] of [['G', 1], ['D', -1]]) {
    let hip = sg * sph * MARCHE.hanche * v, kn = MARCHE.genou * v * Math.max(0, sg * cph);
    hip += tapi * TAPI.hanche; kn += tapi * TAPI.genou;
    if (melee) { hip = g === 'G' ? MELEE.hancheG + MELEE.hancheGp * pouss : MELEE.hancheD; kn = g === 'G' ? MELEE.genouG + MELEE.genouGp * pouss : MELEE.genouD; }
    if (couche > 0.5) { hip = g === 'G' ? COUCHE.hancheG : COUCHE.hancheD; kn = g === 'G' ? COUCHE.genouG : COUCHE.genouD; }
    P['hanche' + g] = hip; P['genou' + g] = kn; P['cheville' + g] = (kn - hip) * MARCHE.cheville;
  }
  // les bras
  for (const [g, sa0] of [['G', -sph], ['D', sph]]) {
    const gauche = g === 'G', sa = sa0;
    let sh = sa * MARCHE.epaule * v, el = MARCHE.coude0 + MARCHE.coude * v * Math.max(0, sa), conv = 0;
    if (pistolet) { sh += (((gauche ? TIR.pistolet.epauleG : TIR.pistolet.epauleD) - sh)) * t; el += (((gauche ? TIR.pistolet.coudeG : TIR.pistolet.coudeD) - el)) * t; conv = t * (gauche ? TIR.pistolet.convG : TIR.pistolet.convD); }
    else { sh += (TIR.fusil.epaule - sh) * t; el += ((gauche ? TIR.fusil.coudeG : TIR.fusil.coudeD) - el) * t; conv = t * (gauche ? TIR.fusil.convG : TIR.fusil.convD); }
    sh += (TAPI.epaule - sh) * tapi; el += (TAPI.coude - el) * tapi;
    if (retenu) { sh = RETENU.epaule; el = gauche ? RETENU.coudeG : RETENU.coudeD; conv = gauche ? RETENU.convG : RETENU.convD; }
    if (melee) { sh = MELEE.epaule; el = gauche ? MELEE.coudeG : MELEE.coudeD; conv = gauche ? MELEE.convG : MELEE.convD; }
    if (couche > 0.5) { sh = COUCHE.epaule; el = COUCHE.coude; }
    P['epaule' + g] = sh; P['coude' + g] = el; P['conv' + g] = conv;
  }
  // le fusil
  if (melee) { P.fusil = MELEE.angle; P.fusilX = MELEE.x; P.fusilY = MELEE.pivot; P.fusilZ = MELEE.z * pouss; }
  else if (retenu) { P.fusil = RETENU.angle; P.fusilX = RETENU.x; P.fusilY = RETENU.pivot; }
  else { P.fusil = TIR.fusil.angle * t; P.fusilX = TIR.fusil.x * t; P.fusilY = TIR.fusil.pivot; }
  // le corps
  P.buste = MARCHE.leanV * v + TIR.fusil.lean * t + TAPI.lean * tapi + (melee ? MELEE.lean + MELEE.leanP * pouss : 0) + (retenu ? RETENU.lean : 0);
  P.descente = TAPI.descente * tapi;
  P.poussee = melee ? MELEE.poussee * pouss : 0;
  P.basques = TAPI.basques * tapi;
  P.couche = couche > 0.5 ? 1 : 0;
  for (const c of NOMS_CHAMPS) P[c] += 0;        // −0 devient 0 (une pose se compare et s'écrit en JSON)
  return P;
}

// Deux poses mélangées : (1 − k) a + k b, champ par champ ; un champ absent d'une pose vaut celui de la neutre
export function melanger(a, b, k) {
  const N = poseNeutre(), r = {};
  for (const c of NOMS_CHAMPS) { const x = a[c] ?? N[c], y = b[c] ?? N[c]; r[c] = x + (y - x) * k; }
  return r;
}

// Garde chaque champ dans sa borne (l'atelier et les données importées)
export function borner(p) {
  const r = {};
  for (const c of NOMS_CHAMPS) { const [lo, hi] = CHAMPS[c]; r[c] = Math.min(hi, Math.max(lo, Number.isFinite(p[c]) ? p[c] : 0)); }
  return r;
}

// Le miroir : gauche ↔ droite (la convergence des épaules change de signe)
export function miroir(p) {
  const r = { ...p };
  for (const c of ['hanche', 'genou', 'cheville', 'epaule', 'coude']) { r[c + 'G'] = p[c + 'D']; r[c + 'D'] = p[c + 'G']; }
  r.convG = -p.convD; r.convD = -p.convG;
  r.fusilX = -p.fusilX;
  return r;
}

// Une animation : des images clés { t, pose, courbe } rangées par t croissant ; `duree` (s) ; `boucle` : revient à la première image après la dernière
export function animation(nom, images, { boucle = true, duree = null } = {}) {
  const tri = [...images].sort((a, b) => a.t - b.t);
  const fin = tri.length ? tri[tri.length - 1].t : 0;
  return { nom, boucle, duree: duree ?? (boucle && tri.length > 1 ? fin + (fin - (tri[tri.length - 2].t)) : fin), images: tri };
}

// La pose de l'animation à l'instant t (secondes). Entre deux images clés : la courbe de la première. En boucle, la dernière image mène à la première.
export function echantillon(anim, t) {
  const I = anim.images;
  if (!I.length) return poseNeutre();
  if (I.length === 1) return { ...poseNeutre(), ...I[0].pose };
  const D = anim.duree;
  if (anim.boucle) t = ((t % D) + D) % D; else t = Math.min(Math.max(t, 0), D);
  if (t <= I[0].t) return anim.boucle ? segment(I[I.length - 1], I[0], D, t + D - I[I.length - 1].t) : { ...poseNeutre(), ...I[0].pose };
  for (let i = 0; i < I.length - 1; i++) if (t < I[i + 1].t) return segment(I[i], I[i + 1], I[i + 1].t - I[i].t, t - I[i].t);
  const dernier = I[I.length - 1];
  return anim.boucle ? segment(dernier, I[0], D - dernier.t, t - dernier.t) : { ...poseNeutre(), ...dernier.pose };
}

function segment(a, b, largeur, dt) {
  const k = largeur > 1e-9 ? Math.min(1, Math.max(0, dt / largeur)) : 1;
  return melanger(a.pose, b.pose, (COURBES[a.courbe] ?? COURBES.doux)(k));
}

// Les animations du jeu rejouées en poses clés : la marche (quatre images sur une foulée) et le tir (repos, épaule, recul)
export function marcheEnImages(vit = 1, periode = 0.8) {
  return animation('marche', [0, 1, 2, 3].map(i => ({ t: i * periode / 4, pose: poseDe({ vit, phase: i * Math.PI / 2 }), courbe: 'doux' })), { boucle: true, duree: periode });
}
