// Les vrais soldats du jeu dans le labo lumière : le modèle articulé de js/rendu/soldat-articule.js (treize os, un visage, un aspect tiré du numéro de l'homme) et ses nuanceurs,
// portés de three.js (GLSL ES 1.0) à WebGL 2 (GLSL ES 3.0) par de simples remplacements de texte : le dessin est celui du jeu, la lumière est celle du labo (`eclairer`).
// Logique pure (des chaînes et des tableaux) : testée dans Node ; rendu.js les envoie au GPU. Au plus `SOLDATS_REELS.max` hommes, les plus proches du point visé.
import { modeleArticule, VERT, FRAG } from '../rendu/soldat-articule.js?v=0.112.0';
import { aspect } from '../aspect-soldat.js?v=0.112.0';
import { MONDE } from './config.js?v=0.112.0';

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
  .replace('gl_FragColor = vec4(c * vShade, 1.0);', 'gS = uS; vec4 Ld = texture(uLight, vWp.xz / uCell / uGrid); fragColor = vec4(finir(eclairer(c * .62, normalize(vNw), vWp, Ld, 1., 0., 0., 0.)), 1.);');

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

// Le suivi des hommes dessinés : leur vitesse (lissée : la marche au hasard de la foule tremble) et leur cap, d'après leur déplacement sur 0,35 s
export function creerSuivi(max) { return { ox: new Float32Array(max), oz: new Float32Array(max), ot: new Float32Array(max).fill(-1), vit: new Float32Array(max), cap: new Float32Array(max), dirx: new Float32Array(max), dirz: new Float32Array(max) }; }
export function suivre(S, F, i, t) {
  if (S.ot[i] < 0 || t - S.ot[i] > 3) { S.ox[i] = F.x[i]; S.oz[i] = F.z[i]; S.ot[i] = t; S.cap[i] = F.camp[i] ? 0 : Math.PI; S.vit[i] = 0; return; }
  const dt = t - S.ot[i]; if (dt < 0.35) return;
  const dx = F.x[i] - S.ox[i], dz = F.z[i] - S.oz[i], v = Math.hypot(dx, dz) / dt;
  S.vit[i] = S.vit[i] * 0.4 + v * 0.6;
  const but = F.camp[i] ? 0 : Math.PI;                                              // à l'arrêt : face à l'ennemi (nous vers le nord, en face vers le sud)
  const vers = v > 0.45 ? Math.atan2(dx, dz) : but;
  let d = vers - S.cap[i]; d = Math.atan2(Math.sin(d), Math.cos(d)); S.cap[i] += d * 0.5;
  S.ox[i] = F.x[i]; S.oz[i] = F.z[i]; S.ot[i] = t;
}
