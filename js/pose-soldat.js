// Les poses et les animations du soldat articulé (logique pure : aucun DOM, aucun THREE, aucune horloge).
//
//  · une POSE est un objet { buste, tete, hancheG, genouG, … } (les champs de `CHAMPS`, data/poses-soldat.js) : un angle par articulation ;
//  · `poseDe(état)` rend la pose qu'écrit le nuanceur de js/rendu/soldat-articule.js pour un état du jeu (marche, tir, accroupi, mêlée…) : la référence que l'atelier d'animation
//    rejoue avant qu'on la retouche ;
//  · une ANIMATION est { nom, boucle, images: [{ t, pose, courbe }] } : des poses clés rangées par temps (en secondes) ; `echantillon(anim, t)` rend la pose à l'instant t ;
//  · `melanger(a, b, k)` interpole deux poses champ par champ.
import { CHAMPS, NOMS_CHAMPS, MARCHE, TAPI, TIR, RETENU, MELEE, COUCHE, FUSIL_REPOS, COURBES } from './data/poses-soldat.js?v=0.124.0';

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

// Assainit une pose lue (l'atelier, un fichier importé) : tous les champs, des nombres finis ; AUCUNE limite (la plage de `CHAMPS` n'est que la course d'un curseur)
export function borner(p) {
  const r = {};
  for (const c of NOMS_CHAMPS) r[c] = Number.isFinite(+p[c]) ? +p[c] : 0;
  return r;
}

// Le miroir : gauche ↔ droite (la convergence des épaules change de signe)
export function miroir(p) {
  const r = { ...p };
  for (const c of ['hanche', 'genou', 'cheville', 'epaule', 'coude']) { r[c + 'G'] = p[c + 'D']; r[c + 'D'] = p[c + 'G']; }
  r.convG = -p.convD; r.convD = -p.convG;
  r.fusilX = -p.fusilX; r.fusilLacet = -p.fusilLacet; r.fusilRoulis = -p.fusilRoulis;
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

// ─── où sont les articulations ? (cinématique directe : le nuanceur plie, ici on suit les mêmes rotations pour poser les poignées de l'atelier) ───
// Les mêmes pivots, les mêmes rotations, dans le même ordre que js/rendu/soldat-articule.js : jambe (cheville, genou, hanche), bras (coude, épaule, tour), puis le buste penché autour de la hanche, la poussée, le corps baissé, couché.
// `rx(p, pv, a)` du nuanceur est la rotation de −a (main droite) autour de +x ; `ry` celle de +a autour de +y.
export const CARRURE_NEUTRE = { taille: 1, epaules: 1, jambes: 1, ventre: 1, tete: 1 };
const rxp = (p, pv, a) => { const dy = p[1] - pv[1], dz = p[2] - pv[2], c = Math.cos(a), s = Math.sin(a); return [p[0], pv[1] + dy * c + dz * s, pv[2] + dz * c - dy * s]; };
const ryp = (p, pv, a) => { const dx = p[0] - pv[0], dz = p[2] - pv[2], c = Math.cos(a), s = Math.sin(a); return [pv[0] + dx * c + dz * s, p[1], pv[2] + dz * c - dx * s]; };
const rzp = (p, pv, a) => { const dx = p[0] - pv[0], dy = p[1] - pv[1], c = Math.cos(a), s = Math.sin(a); return [pv[0] + dx * c - dy * s, pv[1] + dx * s + dy * c, p[2]]; };
const unitaire = v => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };

// Rend { id: { nom, pos: [x, y, z], rots: [{ champ, axe, signe }], deplace: [{ champ, axe, k }] } } en mètres, le soldat debout au centre, face à +z.
//  · `rots` : tourner de φ (main droite) autour de `axe` change le champ de `signe × φ` ;
//  · `deplace` : bouger l'articulation de d (mètres) le long de `axe` change le champ de `k × d`.
export function articulations(pose, car = CARRURE_NEUTRE) {
  const P = { ...poseNeutre(), ...pose };
  const wd = car.epaules, sq = Math.sqrt(wd), sl = car.taille * car.jambes, st = car.taille * (1 + (1 - car.jambes) * 0.6);
  const mp = (p, xs, zs) => [p[0] * xs, p[1] <= 0.9 ? p[1] * sl : 0.9 * sl + (p[1] - 0.9) * st, p[2] * zs];
  const hanche = mp([0, 0.9, 0], 1, 1);
  const haut = p => { const q = rxp(p, hanche, P.buste); q[2] += P.poussee * Math.max(0, q[1] - 0.6); return q; };
  const global = p => { let q = [p[0], p[1] - P.descente, p[2]]; if (P.couche > 0.5) { q = rxp(q, [0, 0, 0], 1.5708); q[1] += 0.16; } return q; };
  // la direction d'un vecteur après une chaîne de transformations : la différence de deux points proches
  const dir = (f, p, v) => { const e = 0.01, a = f(p), b = f([p[0] + v[0] * e, p[1] + v[1] * e, p[2] + v[2] * e]); return unitaire([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); };
  const J = {};
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
  // les jambes (pas de buste : elles ne suivent que le corps baissé et couché)
  for (const [g, c, nom] of [['G', -1, 'gauche'], ['D', 1, 'droite']]) {
    const hp = mp([c * 0.11, 0.9, 0], sq, 1), kp = mp([c * 0.11, 0.5, 0], sq, 1), ap = mp([c * 0.11, 0.08, 0], sq, 1);
    const hip = P['hanche' + g], kn = P['genou' + g];
    const aGen = global;
    J['hanche' + g] = { nom: `Hanche ${nom}`, pos: aGen(hp), rots: [{ champ: 'hanche' + g, axe: dir(aGen, hp, X), signe: -1 }] };
    const kFin = rxp(kp, hp, hip), aFin = rxp(rxp(ap, kp, -kn), hp, hip);
    J['genou' + g] = { nom: `Genou ${nom}`, pos: aGen(kFin), rots: [{ champ: 'genou' + g, axe: dir(aGen, kFin, X), signe: 1 }] };
    J['cheville' + g] = { nom: `Cheville ${nom}`, pos: aGen(aFin), rots: [{ champ: 'cheville' + g, axe: dir(aGen, aFin, X), signe: -1 }] };
    // le bout du pied : tourne avec la cheville, puis le genou, puis la hanche
    const pied = rxp(rxp(rxp(mp([c * 0.11, 0.03, 0.18], sq, 1), ap, P['cheville' + g]), kp, -kn), hp, hip);
    J['pied' + g] = { nom: `Pied ${nom}`, pos: aGen(pied), rots: [], passif: true };
  }
  // les bras : le coude tourne dans l'épaule (rx puis ry autour de l'épaule), puis tout le haut du corps se penche
  const aHaut = p => global(haut(p));
  for (const [g, c, nom] of [['G', -1, 'gauche'], ['D', 1, 'droite']]) {
    const sp = mp([c * 0.30, 1.38, 0], wd, 1), ep = mp([c * 0.30, 1.08, 0], wd, 1);
    const sh = P['epaule' + g], conv = P['conv' + g];
    const bras = p => ryp(rxp(p, sp, sh), sp, conv);
    const axeFlex = dir(q => aHaut(ryp(q, sp, conv)), sp, X), axeTour = dir(aHaut, sp, Y);
    J['epaule' + g] = { nom: `Épaule ${nom}`, pos: aHaut(sp), rots: [{ champ: 'epaule' + g, axe: axeFlex, signe: -1 }, { champ: 'conv' + g, axe: axeTour, signe: 1 }] };
    J['coude' + g] = { nom: `Coude ${nom}`, pos: aHaut(bras(ep)), rots: [{ champ: 'coude' + g, axe: axeFlex, signe: -1 }] };
    // la main : au bout de l'avant-bras, elle tourne avec le coude puis l'épaule
    J['main' + g] = { nom: `Main ${nom}`, pos: aHaut(bras(rxp(mp([c * 0.30, 0.76, 0], wd, 1), ep, P['coude' + g]))), rots: [], passif: true };
  }
  // le buste (pivot : la hanche) et la tête
  J.bassin = { nom: 'Buste (pivot : la hanche)', pos: global(hanche), rots: [{ champ: 'buste', axe: dir(global, hanche, X), signe: -1 }] };
  const cou = mp([0, 1.42, 0], 1, 1);
  J.tete = { nom: 'Tête', pos: aHaut(cou), rots: [{ champ: 'tete', axe: dir(aHaut, cou, X), signe: -1 }] };
  J.crane = { nom: 'Sommet de la tête', pos: aHaut(rxp(mp([0, 1.64, 0], 1, 1), cou, P.tete)), rots: [], passif: true };
  // le fusil, un corps à lui : sa flexion (autour de x, au pivot), puis le lacet (y) et le roulis (z) autour de son axe (à 0,395 m de l'axe du corps, décalé comme lui), puis sa poussée en avant et sa hauteur
  const fp = mp([0, P.fusilY, 0], 1, 1), c = [(0.395 + P.fusilX) * wd, fp[1], 0], cT = [c[0], c[1] + P.fusilH, P.fusilZ];
  const roulis = q => rzp(q, c, P.fusilRoulis);
  J.fusil = { nom: 'Fusil', pos: aHaut(cT), rots: [
    { champ: 'fusil', axe: dir(q => aHaut(roulis(ryp(q, c, P.fusilLacet))), cT, X), signe: -1 },
    { champ: 'fusilLacet', axe: dir(q => aHaut(roulis(q)), cT, Y), signe: 1 },
    { champ: 'fusilRoulis', axe: dir(aHaut, cT, Z), signe: 1 }],
    deplace: [{ champ: 'fusilX', axe: dir(aHaut, cT, X), k: 1 / wd }, { champ: 'fusilH', axe: dir(aHaut, cT, Y), k: 1 }, { champ: 'fusilZ', axe: dir(aHaut, cT, Z), k: 1 }] };
  // la poitrine : baisser le corps, le pousser vers l'avant (la poussée agit sur ce qui est au-dessus de 0,6 m)
  const poit = mp([0, 1.15, 0], 1, 1), hPoit = Math.max(0.15, rxp(poit, hanche, P.buste)[1] - 0.6);
  J.poitrine = { nom: 'Poitrine (le corps)', pos: aHaut(poit), rots: [], deplace: [{ champ: 'descente', axe: Y, k: -1 }, { champ: 'poussee', axe: Z, k: 1 / hPoit }],
    echelle: [{ cle: 'epaules', axe: dir(aHaut, poit, X) }, { cle: 'taille', axe: dir(aHaut, poit, Y) }, { cle: 'ventre', axe: dir(aHaut, poit, Z) }] };
  return J;
}

// Les os, comme un squelette de logiciel de 3D : des paires d'articulations (js/atelier-poignees.js les dessine en losanges allongés)
export const OS_ARTICULES = [
  ['hancheG', 'genouG'], ['genouG', 'chevilleG'], ['chevilleG', 'piedG'], ['hancheD', 'genouD'], ['genouD', 'chevilleD'], ['chevilleD', 'piedD'],
  ['hancheG', 'hancheD'], ['hancheG', 'bassin'], ['hancheD', 'bassin'], ['bassin', 'poitrine'], ['poitrine', 'epauleG'], ['poitrine', 'epauleD'], ['poitrine', 'tete'], ['tete', 'crane'],
  ['epauleG', 'coudeG'], ['coudeG', 'mainG'], ['epauleD', 'coudeD'], ['coudeD', 'mainD'],
];
