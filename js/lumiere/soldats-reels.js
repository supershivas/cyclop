// Les vrais soldats du jeu dans le labo lumière : le modèle articulé de js/rendu/soldat-articule.js (treize os, un visage, un aspect tiré du numéro de l'homme) et ses nuanceurs,
// portés de three.js (GLSL ES 1.0) à WebGL 2 (GLSL ES 3.0) par de simples remplacements de texte : le dessin est celui du jeu, la lumière est celle du labo (`eclairer`).
// Logique pure (des chaînes et des tableaux) : testée dans Node ; rendu.js les envoie au GPU. Au plus `SOLDATS_REELS.max` hommes, les plus proches du point visé.
import { modeleArticule, VERT, FRAG } from '../rendu/soldat-articule.js?v=0.113.0';
import { aspect } from '../aspect-soldat.js?v=0.113.0';
import { MONDE } from './config.js?v=0.113.0';

export const FLOATS = 26;                      // par homme : pos 3, camp, blessure, cap 4, grade, pose 4, corps 4, aspect 4, aspect2 4
export const ATTRIBUTS = [['aPos', 3, 0], ['aCamp', 1, 3], ['aWound', 1, 4], ['aCap', 4, 5], ['aGrade', 1, 9], ['aPose', 4, 10], ['aBody', 4, 14], ['aLook', 4, 18], ['aLook2', 4, 22]];
export const PAR_SOMMET = [['aPosition', 3, 'position'], ['aPart', 1, 'part'], ['aOs', 1, 'os'], ['aShow', 1, 'show'], ['aNor', 3, 'nor']];
// les lettres de palette de chaque uniforme du nuanceur du jeu (creerSoldatArticule)
export const COULEURS = { uNous: 'n', uEux: 'x', uOmbre: 't', uSel: 'o', uJambes: 's', uBois: 't', uToile: 'g', uCuir: 'b', uBotte: 't', uMetal: 'r', uTrait: 's' };
export const COULEURS_LISTES = { uPeau: ['o', 'r', 'g'], uMarque: ['g', 'g', 'b'], uCh: ['t', 's', 'b', 'g', 'r'] };

export const glslVert = () => '#version 300 es\nprecision highp float; precision highp int;\nin vec3 aPosition; out vec3 vWp, vNw; uniform mat4 uVP;\n' + VERT
  .replace(/\battribute\b/g, 'in').replace(/\bvarying\b/g, 'out').replace(/\bposition\b/g, 'aPosition')
  .replace('gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);', 'vWp = p + aPos; vNw = nw; gl_Position = uVP * vec4(vWp, 1.0);');
// `commun` : le début des nuanceurs du labo (la lumière : `eclairer`, `finir`) ; sa première ligne est `#version 300 es`
export const glslFrag = commun => commun + '\nin vec3 vWp, vNw; out vec4 fragColor;\n' + FRAG
  .replace(/\bvarying\b/g, 'in')
  .replace('gl_FragColor = vec4(c * vShade, 1.0);', 'gS = uS; gL = uLampOn; vec4 Ld = texture(uLight, vWp.xz / uCell / uGrid); fragColor = vec4(finir(eclairer(c * .62, normalize(vNw), vWp, Ld, 1., 0., 0., 0.)), 1.);');

const modeles = {};
export const modele = niveau => modeles[niveau] || (modeles[niveau] = modeleArticule({ niveau }));

// L'aspect de l'homme `i` : le même que le jeu tirerait de son numéro (rang, âge : des tirages de son numéro)
const aspects = new Map();
export function aspectDe(i, camp) {
  const k = i * 2 + camp; let a = aspects.get(k);
  if (!a) { a = aspect(i, camp, MONDE.graine, i % 29 === 0 ? 1 : i % 9 === 0 ? 3 : i % 5 === 0 ? 4 : 6, 20 + (i * 7) % 24); aspects.set(k, a); }
  return a;
}

// Écrit l'homme `n` du tampon : h = { x, y, z, camp, vit, tapi, cap, temps, aspect } (comme `ecrire` de creerSoldatArticule)
export function ecrire(T, n, h) {
  const a = h.aspect, c = a.carrure, t = a.traits, o = n * FLOATS, cap = h.cap ?? 0, ph = (h.temps ?? 0) * 8 + h.x * 1.7 + h.z * 1.3;
  T[o] = h.x; T[o + 1] = h.y; T[o + 2] = h.z; T[o + 3] = h.camp; T[o + 4] = 0;
  T[o + 5] = Math.cos(cap); T[o + 6] = Math.sin(cap); T[o + 7] = Math.sin(ph); T[o + 8] = Math.cos(ph);
  T[o + 9] = a.rang ?? 6;
  T[o + 10] = h.vit ?? 0; T[o + 11] = h.tir ?? 0; T[o + 12] = h.tapi ?? 0; T[o + 13] = 0;
  T[o + 14] = c.taille; T[o + 15] = c.epaules; T[o + 16] = c.jambes; T[o + 17] = c.tete;
  T[o + 18] = a.coiffe; T[o + 19] = a.cheveux; T[o + 20] = a.couleur; T[o + 21] = a.barbe;
  T[o + 22] = a.acc; T[o + 23] = a.peau; T[o + 24] = t.yeux + 3 * t.nez + 9 * t.bouche + 27 * t.sourcils + 81 * (t.rides || 0); T[o + 25] = c.ventre;
}

// Le suivi des hommes dessinés : leur vitesse (lissée) et leur cap, d'après leur déplacement sur 0,2 s. L'homme marche ou s'arrête avec une HYSTÉRÉSIS (SOLDATS_REELS.marche) : sans elle, une vitesse qui frôle le seuil
// le faisait passer de la marche à l'arrêt (le cap, les jambes) d'une mesure à l'autre, et on le voyait clignoter.
export function creerSuivi(max) { return { ox: new Float32Array(max), oz: new Float32Array(max), ot: new Float32Array(max).fill(-1), vit: new Float32Array(max), cap: new Float32Array(max), marche: new Uint8Array(max) }; }
export function suivre(S, F, i, t, K = SOLDATS_REELS.marche) {
  if (S.ot[i] < 0 || t - S.ot[i] > 3) { S.ox[i] = F.x[i]; S.oz[i] = F.z[i]; S.ot[i] = t; S.cap[i] = F.camp[i] ? 0 : Math.PI; S.vit[i] = 0; S.marche[i] = 0; return; }
  const dt = t - S.ot[i]; if (dt < 0.2) return;
  const dx = F.x[i] - S.ox[i], dz = F.z[i] - S.oz[i], v = Math.hypot(dx, dz) / dt;
  const brute = S.marche[i] ? S.vit[i] * 0.4 + v * 0.6 : v;                         // lissée tant qu'il marche
  S.marche[i] = (S.marche[i] ? brute > K.arrete : brute > K.demarre) ? 1 : 0;
  S.vit[i] = S.marche[i] ? brute : 0;
  const but = F.camp[i] ? 0 : Math.PI;                                              // à l'arrêt : face à l'ennemi (nous vers le nord, en face vers le sud)
  const vers = S.marche[i] ? Math.atan2(dx, dz) : but;
  let d = vers - S.cap[i]; d = Math.atan2(Math.sin(d), Math.cos(d)); S.cap[i] += d * (1 - Math.exp(-dt / 0.22));
  S.ox[i] = F.x[i]; S.oz[i] = F.z[i]; S.ot[i] = t;
}

// ─── Les soldats du jeu, de loin à près : la boîte, la silhouette allégée, le soldat équipé (rendu/geometries.js, rendu/shaders.js) ───
// La géométrie vient du jeu : `creerGeometries` veut un THREE, on lui en donne un de pacotille qui garde les tableaux (aucun THREE n'est chargé).
import { creerGeometries } from '../rendu/geometries.js?v=0.113.0';
import { soldatMat } from '../rendu/shaders.js?v=0.113.0';
import { SOLDATS_REELS } from './config.js?v=0.113.0';

const FAUX_THREE = { InstancedBufferGeometry: class { setAttribute(n, a) { this[n] = a; } }, Float32BufferAttribute: class { constructor(a, k) { this.array = Float32Array.from(a); this.itemSize = k; } } };
export const STYLES_JEU = { boite: 'boite', legere: 'legere', equipe: 'equipe-marche' };
const geoms = {};
export function geometrieJeu(style) {
  if (geoms[style]) return geoms[style];
  const gi = creerGeometries(FAUX_THREE, () => null).geometrieSoldat(STYLES_JEU[style], [{}, {}, {}, {}, {}, {}, {}]);
  const pos = gi.position.array, nor = new Float32Array(pos.length);
  for (let t = 0; t < pos.length; t += 9) {                                               // une normale par triangle (les boîtes sont des faces planes)
    const ax = pos[t + 3] - pos[t], ay = pos[t + 4] - pos[t + 1], az = pos[t + 5] - pos[t + 2], bx = pos[t + 6] - pos[t], by = pos[t + 7] - pos[t + 1], bz = pos[t + 8] - pos[t + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let v = 0; v < 3; v++) { nor[t + 3 * v] = nx; nor[t + 3 * v + 1] = ny; nor[t + 3 * v + 2] = nz; }
  }
  return (geoms[style] = { position: pos, aPart: gi.aPart.array, aJambe: gi.aJambe.array, aBras: gi.aBras.array, aGr: gi.aGr.array, aNor: nor, n: pos.length / 3 });
}
export const PAR_SOMMET_JEU = [['aPosition', 3, 'position'], ['aPart', 1, 'aPart'], ['aJambe', 1, 'aJambe'], ['aBras', 1, 'aBras'], ['aGr', 1, 'aGr'], ['aNor', 3, 'aNor']];
export const FLOATS_JEU = 11;                  // par homme : pos 3, camp, vitesse, tir 2 (pose, cap), corps 2 (largeur, hauteur), grade, blessure
export const ATTRIBUTS_JEU = [['aPos', 3, 0], ['aCamp', 1, 3], ['aVit', 1, 4], ['aTir', 2, 5], ['aVar', 2, 7], ['aGrade', 1, 9], ['aBless', 1, 10]];
export const COULEURS_JEU = { uNous: 'n', uEux: 'x', uOmbre: 't', uSel: 'o', uJambes: 's', uFusil: 't', uSac: 'g', uVisage: 'h', uCuir: 'b', uBotte: 't' };

export const glslVertJeu = () => '#version 300 es\nprecision highp float; precision highp int;\nin vec3 aPosition; in vec3 aNor; out vec3 vWp, vNw; uniform mat4 uVP;\n' + soldatMat.v
  .replace(/\battribute\b/g, 'in').replace(/\bvarying\b/g, 'out').replace(/\bposition\b/g, 'aPosition')
  .replace('gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);', 'vWp = p + aPos; vNw = aNor; gl_Position = uVP * vec4(vWp, 1.0);');
export const glslFragJeu = commun => commun + '\nin vec3 vWp, vNw; out vec4 fragColor;\n' + soldatMat.f
  .replace(/\bvarying\b/g, 'in')
  .replace(/gl_FragColor = vec4\(texture2D[^;]*;\s*return;/, 'discard;')                    // l'ombre au sol du jeu : le labo a la sienne (la lumière)
  .replace('gl_FragColor = vec4(c, 1.0);', 'gS = uS; gL = uLampOn; vec4 Ld = texture(uLight, vWp.xz / uCell / uGrid); fragColor = vec4(finir(eclairer(c * .62, normalize(vNw), vWp, Ld, 1., 0., 0., 0.)), 1.);');

// L'écriture d'un homme (comme `ecrire` de rendu/soldats.js) : `tapi` à 1 : la peur (aVit < 0 : −1 − la vitesse)
const hv = i => { let h = Math.imul(i + 1, 2654435761); h ^= h >>> 15; h = Math.imul(h, 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
export function ecrireJeu(T, n, h) {
  const o = n * FLOATS_JEU;
  T[o] = h.x; T[o + 1] = h.y; T[o + 2] = h.z; T[o + 3] = h.camp; T[o + 4] = h.tapi ? -1 - h.vit : h.vit;
  T[o + 5] = 0; T[o + 6] = h.cap ?? 0;
  T[o + 7] = 1 + (hv(h.i) - 0.5) * 0.28; T[o + 8] = 1 + (hv(h.i + 99991) - 0.5) * 0.14;       // la largeur et la taille de chaque homme (±14 %, ±7 %)
  T[o + 9] = 0; T[o + 10] = 0;
}

// Classe les soldats vus : pour chacun, ses pixels par mètre (k / profondeur de l'écran) donne son niveau de détail. Les `maxArticule` plus proches en articulés, au plus `maxEquipe` équipés, `maxLegere` allégés ;
// ceux qui dépassent descendent d'un niveau. `masque[i] = 1` : l'homme est dessiné en géométrie (le point est caché). Rend les listes (indices) et leur taille.
// L'HYSTÉRÉSIS (v0.114.0, le clignotement) : `niv[i]` garde le niveau de l'image d'avant (0 articulé … 3 boîte, 4 point) ; un homme le conserve tant que ses pixels par mètre restent à 12 % du seuil
// et, pour les places limitées (les 250 articulés…), il passe avant ceux qui n'y étaient pas. Avant, deux hommes à égalité se disputaient la dernière place d'une image à l'autre.
export function creerClasses(max) {
  const l = () => ({ i: new Int32Array(max), n: 0 });
  return { art: l(), equipe: l(), legere: l(), boite: l(), w: new Float32Array(max), cand: [new Int32Array(max), new Int32Array(max), new Int32Array(max)], nc: [0, 0, 0], masque: new Float32Array(max), plusProche: 0, niv: new Uint8Array(max).fill(4), prec: new Uint8Array(max).fill(4), ppm: new Float32Array(max), nivListe: 0 };
}
// le niveau voulu pour des pixels par mètre `ppm`, sachant le niveau précédent `p`
export function niveauDe(ppm, p, S = SOLDATS_REELS) {
  const T = [S.pxmArticule, S.pxmEquipe, S.pxmLegere, S.pxmBoite], H = S.hysteresis || { bas: 1, haut: 1 };
  const base = ppm >= T[0] ? 0 : ppm >= T[1] ? 1 : ppm >= T[2] ? 2 : ppm >= T[3] ? 3 : 4;
  if (p === base || p > 4) return base;
  const bas = p < 4 ? T[p] * H.bas : 0, haut = p > 0 ? T[p - 1] * H.haut : Infinity;       // le niveau p dure de T[p]·bas à T[p−1]·haut
  return ppm >= bas && ppm < haut ? p : base;
}
export function classer(F, hf, M, vp, H, fov, C = creerClasses(F.max), S = SOLDATS_REELS) {
  const k = (H / 2) / Math.tan(fov / 2), { W } = M, art = C.art, eq = C.equipe, lg = C.legere, bt = C.boite, prio = (S.hysteresis || { priorite: 1 }).priorite;
  art.n = eq.n = lg.n = bt.n = 0; C.nc[0] = C.nc[1] = C.nc[2] = 0; C.masque.fill(0); C.plusProche = 0;
  for (let i = 0; i < F.n; i++) {
    const x = F.x[i], z = F.z[i], y = hf[Math.min(M.H - 1, z * M.cpm | 0) * W + Math.min(W - 1, x * M.cpm | 0)] + 0.9, prev = C.niv[i];
    C.niv[i] = 4; C.prec[i] = prev;
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]; if (cw < 0.5) continue;
    const ppm = k / cw;
    const cx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw, cy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw;
    if (cx < -1.12 || cx > 1.12 || cy < -1.15 || cy > 1.15) continue;
    const niv = niveauDe(ppm, prev, S);
    if (niv === 4) continue;
    C.w[i] = cw; C.ppm[i] = ppm;
    if (niv === 3) { C.niv[i] = 3; bt.i[bt.n++] = i; } else { C.cand[niv > 1 ? 2 : niv][C.nc[niv > 1 ? 2 : niv]++] = i; C.niv[i] = niv; }
  }
  // un homme qui occupait déjà un niveau garde sa place d'abord : sa profondeur compte pour 15 % de moins
  const par = (a, b) => C.w[a] * (C.prec[a] === C.nivListe ? prio : 1) - C.w[b] * (C.prec[b] === C.nivListe ? prio : 1);
  const sel = (cand, n, cap, dest, trop, niveau) => {
    const liste = Array.from(cand.subarray(0, n));
    if (n > cap) { C.nivListe = niveau; liste.sort(par); for (let q = cap; q < n; q++) trop(liste[q]); liste.length = cap; }
    for (const i of liste) { dest.i[dest.n++] = i; C.niv[i] = niveau; }
  };
  const versEq = i => { C.cand[1][C.nc[1]++] = i; }, versLg = i => { C.cand[2][C.nc[2]++] = i; }, versBt = i => { bt.i[bt.n++] = i; C.niv[i] = 3; };
  sel(C.cand[0], C.nc[0], S.maxArticule, art, versEq, 0);
  sel(C.cand[1], C.nc[1], S.maxEquipe, eq, versLg, 1);
  sel(C.cand[2], C.nc[2], S.maxLegere, lg, versBt, 2);
  for (const L of [art, eq, lg, bt]) for (let q = 0; q < L.n; q++) C.masque[L.i[q]] = 1;
  if (art.n) { let m = 1e9; for (let q = 0; q < art.n; q++) m = Math.min(m, C.w[art.i[q]]); C.plusProche = k / m; }
  return C;
}

// Le même sommet pour la CARTE D'OMBRE : la boîte du soldat (10 triangles) qui projette, sans l'ombre au sol du jeu (le quadrilatère plat de l'ombre ferait une rayure dans la carte) et un peu plus mince que l'homme
// en volume qui la reçoit (0,8 en largeur) : le modèle articulé déborde de sa boîte, et sa face tournée vers le soleil s'ombrerait elle-même.
export const glslVertOmbre = () => glslVertJeu()
  .replace('if (cache) p = vec3(0.0);', 'if (cache || (kp > 0.5 && kp < 1.5)) p = vec3(0.0); else p.xz *= 0.8;');
