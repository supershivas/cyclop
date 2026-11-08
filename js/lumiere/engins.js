// Les engins du labo lumière : des chars et des biplans en boîtes (couleurs de la palette), de quoi projeter et recevoir des ombres sans reprendre les modèles du jeu
// (rendu/engins.js, rendu/avions-modeles.js : ils viennent à la session 3, par la même carte d'ombre). Logique pure : géométrie (tableaux) et mouvement (déterministe, aucune horloge).
import { ENGINS } from './config.js?v=0.131.0';

// Une boîte : centre, taille, lettre de palette. 24 sommets (4 par face, la normale de la face), 36 indices ; on les met à plat en triangles (la 3D est faite de faces nettes).
const FACES = [[[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]], [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
  [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]], [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
  [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]], [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]]];
export function assembler(boites) {
  const pos = [], nor = [], lettre = [];
  for (const b of boites) {
    const [cx, cy, cz] = b.c, [sx, sy, sz] = b.s, rot = b.inclinaison || 0, co = Math.cos(rot), si = Math.sin(rot);
    for (const [n, q] of FACES) for (const k of [0, 1, 2, 0, 2, 3]) {
      let x = q[k][0] * sx / 2, y = q[k][1] * sy / 2, z = q[k][2] * sz / 2, nx = n[0], ny = n[1], nz = n[2];
      if (rot) { [x, y] = [x * co - y * si, x * si + y * co]; [nx, ny] = [nx * co - ny * si, nx * si + ny * co]; }       // une inclinaison autour de l'axe z (une aile, un mât)
      pos.push(cx + x, cy + y, cz + z); nor.push(nx, ny, nz); lettre.push(b.l);
    }
  }
  return { position: Float32Array.from(pos), normale: Float32Array.from(nor), lettres: lettre, n: pos.length / 3 };
}

// Le char : 1 unité = 1 m, l'avant à +x, le haut à +y, posé sur le sol (y = 0), ~6 m de long (un Schneider)
const CHAR = [
  { c: [0, 0.62, 0], s: [5.6, 0.9, 2.1], l: 'g' },                       // la coque
  { c: [0, 0.45, 1.25], s: [6.0, 0.9, 0.5], l: 't' }, { c: [0, 0.45, -1.25], s: [6.0, 0.9, 0.5], l: 't' },      // les chenilles
  { c: [0.5, 1.35, 0], s: [2.2, 0.9, 1.9], l: 'b' },                      // la cabine
  { c: [1.55, 1.1, 0], s: [1.2, 0.5, 1.6], l: 'g' },                      // le museau
  { c: [2.7, 1.25, 0.55], s: [1.8, 0.14, 0.14], l: 't' },                 // le canon
  { c: [-0.7, 1.9, 0], s: [0.7, 0.35, 0.7], l: 't' },                     // le périscope
];
// Le biplan : l'avant à +x, l'envergure sur z, ~6,3 m de long, 8 m d'envergure ; centré sur son centre de gravité
const AVION = [
  { c: [0, 0, 0], s: [6.0, 0.8, 0.7], l: 'w' },                           // le fuselage
  { c: [0.3, 0.95, 0], s: [1.4, 0.07, 8.0], l: 'g' }, { c: [0.3, -0.45, 0], s: [1.3, 0.07, 7.6], l: 'g' },      // les deux ailes
  { c: [0.35, 0.25, 1.9], s: [0.07, 1.4, 0.08], l: 't' }, { c: [0.35, 0.25, -1.9], s: [0.07, 1.4, 0.08], l: 't' },    // les mâts
  { c: [-3.1, 0.35, 0], s: [0.9, 0.06, 2.6], l: 'g' },                    // l'empennage
  { c: [-3.1, 0.75, 0], s: [0.9, 0.9, 0.06], l: 'w' },                    // la dérive
  { c: [3.05, 0, 0], s: [0.5, 0.7, 0.7], l: 'r' },                        // le moteur
  { c: [3.35, 0, 0], s: [0.06, 2.2, 0.15], l: 't' },                      // l'hélice
];
export const MODELES = { char: assembler(CHAR), avion: assembler(AVION) };

export const FLOATS_ENGIN = 7;           // par engin : x, y, z, cap, tangage, roulis, camp (0 nous, 1 eux)
export function creerEngins(M, graine = 3) {
  let s = (graine * 2654435761) >>> 0 || 1;
  const alea = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const chars = [], avions = [];
  for (let k = 0; k < ENGINS.chars; k++) {                   // des chars qui vont et viennent en travers du no man's land, chacun sur sa voie
    const camp = k & 1, z = M.profondeurM * (0.5 + (camp ? -1 : 1) * (0.05 + 0.06 * (k >> 1)));
    chars.push({ camp, x: M.largeurM * (0.15 + 0.7 * alea()), z, sens: alea() < 0.5 ? 1 : -1, cap: 0, tangage: 0, roulis: 0, y: 0 });
  }
  for (let k = 0; k < ENGINS.avions; k++) {                  // des biplans qui tournent au-dessus de la ligne
    const [r0, r1] = ENGINS.rayonCercle, [a0, a1] = ENGINS.altitudeAvion;
    avions.push({ camp: k & 1, cx: M.largeurM * (0.25 + 0.5 * alea()), cz: M.profondeurM * (0.3 + 0.4 * alea()), rayon: r0 + (r1 - r0) * alea(), phase: alea() * 6.283, sens: k & 1 ? -1 : 1, alt: a0 + (a1 - a0) * alea(), x: 0, y: 0, z: 0, cap: 0, tangage: 0, roulis: 0 });
  }
  const E = { chars, avions }; avancerEngins(E, M, 0, () => 0); return E;
}
// Fait avancer les engins de `dt` secondes ; `hauteur(x, z)` : le sol en mètres. Un char suit le sol (tangage), un biplan penche dans le virage.
export function avancerEngins(E, M, dt, hauteur) {
  for (const c of E.chars) {
    c.x += c.sens * ENGINS.vitesseChar * dt;
    if (c.x > M.largeurM - 20) { c.x = M.largeurM - 20; c.sens = -1; } else if (c.x < 20) { c.x = 20; c.sens = 1; }
    c.cap = c.sens > 0 ? 0 : Math.PI;                          // l'avant du modèle est à +x ; tourné d'un demi-tour il va vers −x
    const f = hauteur(c.x + c.sens * 2.2, c.z), b = hauteur(c.x - c.sens * 2.2, c.z);
    c.y = (f + b) / 2; c.tangage = Math.atan2(f - b, 4.4);
  }
  for (const a of E.avions) {
    a.phase += a.sens * ENGINS.vitesseAvion / a.rayon * dt;
    a.x = a.cx + Math.cos(a.phase) * a.rayon; a.z = a.cz + Math.sin(a.phase) * a.rayon;
    const alt = a.alt + 4 * Math.sin(a.phase * 2.3);
    a.y = hauteur(a.x, a.z) + alt;
    a.cap = -Math.atan2(a.sens * Math.cos(a.phase), -a.sens * Math.sin(a.phase));      // la tangente du cercle
    a.roulis = -a.sens * 0.45; a.tangage = 0.04 * Math.cos(a.phase * 2.3);
  }
}
// Écrit les engins dans un tampon d'instances d'un type : [x, y, z, cap, tangage, roulis, camp] par engin
export function ecrireEngins(liste, T) { let n = 0; for (const e of liste) { const o = n * FLOATS_ENGIN; T[o] = e.x; T[o + 1] = e.y; T[o + 2] = e.z; T[o + 3] = e.cap; T[o + 4] = e.tangage; T[o + 5] = e.roulis; T[o + 6] = e.camp; n++; } return n; }
