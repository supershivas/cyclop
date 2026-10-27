// Les bâtiments du camp dessinés en volumes (Jérôme, v0.87.0) : sortis du labo (`labo-batiments.js`) pour que le jeu les dessine aussi (`rendu/camp.js`).
// Chaque fabrique `BATIR[clé](A, niveau)` rend { g, w, d } : le groupe centré sur son emprise (w le long de x, d le long de z), l'avant (le front) à −z ; `A` est `atelier(THREE)` (engins.js).
// 1 unité = 1 m, la palette du jeu seulement ; le dessin seulement, rien n'y est écrit.
import { PALETTE as P } from '../palette.js?v=0.88.0';
import { schneider } from './engins.js?v=0.88.0';
import { PIEDS } from '../data/batiments.js?v=0.88.0';

// ─── Les pièces communes ───────────────────────────────────────────────────
export const G = A => new A.THREE.Group();
export const soldat = (A, g, x, z) => A.b(g, [0.5, 1.7, 0.35], P.n, [x, 0.85, z], [0, 0, 0], false);          // 0,5 × 1,7 × 0,35 m, comme dans le jeu
const rang = (A, g, x0, z0, n, pas = 0.9, long = 10) => { for (let k = 0; k < n; k++) soldat(A, g, x0 + (k % long) * pas, z0 + Math.floor(k / long) * 1.1); };
// une baraque à pignon : murs w × h × L, toit en deux pans
function baraque(A, g, [x, z], w, L, h, mur, toit, rot = 0) {
  const b = G(A);
  A.b(b, [w, h, L], mur, [0, h / 2, 0]);
  A.prisme(b, [[-w / 2 - 0.3, h], [w / 2 + 0.3, h], [0, h + w * 0.3]], L + 0.6, toit);
  A.b(b, [w * 0.35, h * 0.7, 0.1], P.t, [0, h * 0.35, L / 2 + 0.03], [0, 0, 0], false);                  // la porte
  b.position.set(x, 0, z); b.rotation.y = rot; g.add(b); return b;
}
const arche = (R, n = 12) => { const p = [[-R, 0]]; for (let k = 1; k < n; k++) { const a = Math.PI - k * Math.PI / n; p.push([R * Math.cos(a), R * 0.8 * Math.sin(a)]); } p.push([R, 0]); return p; };
function sol(A, g, w, d, c = P.b) { A.b(g, [w, 0.2, d], c, [0, 0.1, 0], [0, 0, 0], false); }

// un biplan : le nez à +x (rangé face au front par `face`)
function biplan(A, c = P.h) {
  const g = G(A);
  A.b(g, [5.6, 0.8, 0.7], c, [0, 1.1, 0]);
  A.b(g, [1.6, 0.08, 8.4], P.r, [0.4, 2.0, 0]); A.b(g, [1.6, 0.08, 8.4], P.r, [0.4, 0.75, 0]);
  for (const s of [-1, 1]) A.b(g, [0.06, 1.25, 0.06], P.s, [0.9, 1.4, s * 3.6], [0, 0, 0], false);
  A.b(g, [1.2, 0.06, 3], P.r, [-2.6, 1.3, 0]); A.b(g, [0.8, 0.9, 0.06], c, [-2.7, 1.75, 0]);
  A.cyl(g, 0.45, 0.1, P.s, [2.9, 1.1, 0], 'x', 8);
  for (const s of [-1, 1]) A.cyl(g, 0.35, 0.12, P.t, [0.8, 0.35, s * 0.9], 'z', 8);
  A.b(g, [0.05, 0.5, 1.8], P.s, [0.8, 0.6, 0], [0, 0, 0], false);
  return g;
}
// un canon : le tube à +x, relevé
function canon(A, cal) {
  const g = G(A);
  if (cal === '220') {
    A.b(g, [10, 0.5, 3.4], P.s, [0, 0.55, 0]);
    for (const s of [-1, 1]) A.b(g, [11, 0.12, 0.2], P.t, [0, 0.2, s * 1.4], [0, 0, 0], false);
    A.b(g, [3.4, 1.6, 2.4], P.g, [-0.5, 1.6, 0]);
    const t = G(A); t.position.set(0.4, 2.3, 0); t.rotation.z = 0.35; g.add(t);
    A.cyl(t, 0.26, 9, P.s, [4, 0, 0], 'x', 8); A.cyl(t, 0.36, 1.4, P.t, [-0.2, 0, 0], 'x', 8);
    return g;
  }
  const r = cal === '75' ? 0.55 : 0.8;
  for (const s of [-1, 1]) A.cyl(g, r, 0.14, P.t, [0, r, s * (r + 0.4)], 'z', 10);
  A.b(g, [0.2, 0.15, 2 * (r + 0.4)], P.s, [0, r, 0]);
  A.b(g, [cal === '75' ? 2.4 : 3.6, 0.18, 0.25], P.s, [-1.5, 0.25, 0], [0, 0, 0.12]);
  const t = G(A); t.position.set(0, r + 0.5, 0); t.rotation.z = 0.3; g.add(t);
  A.cyl(t, cal === '75' ? 0.1 : 0.17, cal === '75' ? 2.6 : 4.6, P.s, [cal === '75' ? 1 : 1.8, 0, 0], 'x', 8);
  A.b(g, [0.1, cal === '75' ? 1.0 : 1.4, 1.5], P.g, [0.5, r + 0.7, 0]);
  return g;
}
// un échafaudage autour d'une emprise : un chantier
export function chantier(A, w, d, h = 4) {
  const g = G(A);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) A.b(g, [0.2, h, 0.2], P.g, [sx * w / 2, h / 2, sz * d / 2]);
  for (const y of [1.4, 2.8]) { for (const sz of [-1, 1]) A.b(g, [w, 0.12, 0.12], P.g, [0, y, sz * d / 2], [0, 0, 0], false); for (const sx of [-1, 1]) A.b(g, [0.12, 0.12, d], P.g, [sx * w / 2, y, 0], [0, 0, 0], false); }
  A.b(g, [w * 0.6, 0.3, d * 0.6], P.b, [0, 0.15, 0]);                   // le tas de planches
  return g;
}

// ─── Les cinq bâtiments ────────────────────────────────────────────────────
// Chacun rend { g, w, d } : le groupe, centré sur son emprise (w le long de x, d le long de z) ; l'avant (le front) est à −z. Un `niveau` de 1 à 3.
export const BATIR = {
  artillerie(A, n) {
    const g = G(A); sol(A, g, 34, 22);
    A.b(g, [34, 1.1, 1.2], P.g, [0, 0.75, 10]); for (const s of [-1, 1]) A.b(g, [1.2, 1.1, 20], P.g, [s * 16.4, 0.75, 0]);       // le merlon de sacs
    const poser = (cal, x, z) => { const c = canon(A, cal); c.position.set(x, 0, z); c.rotation.y = Math.PI / 2; g.add(c); };
    for (const x of [-12, -4, 4, 12]) poser('75', x, 5);
    if (n >= 2) for (const x of [-9, 9]) poser('155', x, -2);
    if (n >= 3) poser('220', 0, -7);
    for (const [x, z] of [[-14.5, 9], [14.5, 9], ...(n >= 2 ? [[-14.5, 3]] : []), ...(n >= 3 ? [[14.5, 3]] : [])]) for (let k = 0; k < 3; k++) A.b(g, [1.2, 0.6, 0.8], P.t, [x, 0.5 + (k % 2) * 0.6, z - 0.4 + k * 0.4], [0, 0, 0], false);
    if (n >= 2) baraque(A, g, [-12, 8.2], 3, 5, 1.8, P.g, P.b, Math.PI / 2);                  // l'abri des servants
    return { g, w: 34, d: 22 };
  },
  aerodrome(A, n) {
    const g = G(A); sol(A, g, 84, 40, P.h);
    A.b(g, [80, 0.1, 14], P.v, [0, 0.22, 4], [0, 0, 0], false);                           // la bande d'herbe fauchée
    const hangars = [-32, -19, -6].slice(0, n);
    for (const x of hangars) { A.prisme(g, arche(5), 14, P.r, [x, 0, -16]); A.b(g, [8, 3.4, 0.1], P.t, [x, 1.7, -8.97], [0, 0, 0], false); }
    const avions = [[-32, -5, 0], [20, 4, 0.1], ...(n >= 2 ? [[-19, -5, 0]] : []), ...(n >= 3 ? [[-6, -5, 0], [34, 4, -0.1]] : [])];
    for (const [x, z, r] of avions.slice(0, [0, 2, 3, 5][n])) { const a = biplan(A); a.position.set(x, 0, z); a.rotation.y = Math.PI / 2 + r; g.add(a); }
    if (n >= 2) { for (let k = 0; k < 4; k++) A.cyl(g, 0.3, 0.9, P.b, [12 + (k % 2) * 0.8, 0.55, -14 + Math.floor(k / 2) * 0.8], 'y', 8); baraque(A, g, [24, -16], 4, 6, 2, P.r, P.b); }
    if (n >= 3) { baraque(A, g, [36, -14], 4, 6, 3.4, P.h, P.b); A.b(g, [1.4, 0.4, 1.4], P.t, [36, 4.2, -14]); }
    A.cyl(g, 0.08, 7, P.s, [40, 3.5, -2], 'y', 6); A.cyl(g, 0.6, 2.6, P.o, [38.8, 6.6, -2], 'x', 8, 0.15);        // la manche à air
    return { g, w: 84, d: 40 };
  },
  chars(A, n) {
    const g = G(A); sol(A, g, 32, 30);
    const baies = n === 1 ? [0] : n === 2 ? [-4.8, 4.8] : [-9.6, 0, 9.6];
    for (const x of baies) {
      A.prisme(g, [[-5.2, 0], [-3.6, 3.6], [3.6, 3.6], [5.2, 0]], 12, P.g, [x, 0, 3]);          // le tertre qui couvre la galerie
      A.b(g, [6, 3.1, 0.3], P.t, [x, 1.55, -3.1], [0, 0, 0], false);                         // la porte de la galerie
      for (const s of [-1, 1]) A.b(g, [0.4, 3.3, 0.5], P.b, [x + s * 3.2, 1.65, -3.2]);        // ses poteaux
      A.b(g, [7, 0.4, 0.5], P.b, [x, 3.3, -3.2]);
    }
    const c = schneider(A).groupe; c.position.set(baies[baies.length - 1], 0, -10); c.rotation.y = Math.PI / 2; g.add(c);
    if (n >= 3) {
      for (const s of [-1, 1]) A.b(g, [0.2, 0.15, 28], P.t, [s * 0.75 - 12.6, 0.25, 0], [0, 0, 0], false);                        // la voie de service
      A.b(g, [14, 3.4, 5], P.s, [-1, 1.7, 12.4]); A.prisme(g, [[-7.3, 3.4], [7.3, 3.4], [0, 4.6]], 5.6, P.b, [-1, 0, 12.4]);        // l'atelier
      A.cyl(g, 0.12, 2.2, P.t, [5, 5.6, 12.4], 'y', 6);
      A.b(g, [0.5, 8, 0.5], P.g, [10, 4, 9]); A.b(g, [7, 0.4, 0.4], P.g, [6.6, 8, 9]); A.b(g, [0.1, 3.6, 0.1], P.t, [3.5, 6.2, 9], [0, 0, 0], false);  // la grue
      A.cyl(g, 1, 3.6, P.s, [13.5, 1.1, 10], 'x', 8);                                                                                 // la citerne
    }
    return { g, w: 32, d: 30 };
  },
  sapeurs(A, n) {
    const g = G(A); sol(A, g, 26, 22);
    baraque(A, g, [-6, -4], 5, 9, 2.6, P.h, P.b, Math.PI / 2);
    for (let l = 0; l < 4; l++) A.b(g, [6, 0.25, 1.4], P.g, [-8, 0.35 + l * 0.27, 6], [0, 0, 0], false);           // les madriers
    for (let k = 0; k < 8; k++) A.cyl(g, 0.5, 1, P.h, [1 + k * 1.1, 0.7, 6.5 + (k % 2) * 0.4], 'y', 8);          // les gabions
    if (n >= 2) {
      for (const [x, z] of [[8, -6], [8, -2.5]]) { A.prisme(g, [[-2.6, 0.6], [2.6, 0.6], [2.2, 0], [-2.2, 0]], 1.2, P.b, [x, 0.3, z]); A.b(g, [4, 0.1, 0.8], P.g, [x, 0.7, z], [0, 0, 0], false); }  // les pontons
      for (const x of [4, 7]) { A.b(g, [0.18, 3.2, 0.18], P.g, [x, 1.6, -1.2], [0.3, 0, 0], false); A.b(g, [0.18, 3.2, 0.18], P.g, [x, 1.6, 1.2], [-0.3, 0, 0], false); }          // les chevalets
      rang(A, g, -10, 2, 10);
    }
    if (n >= 3) {
      baraque(A, g, [-8, 9], 4, 5, 2.4, P.g, P.b); A.cyl(g, 0.2, 2.2, P.t, [-8, 4.2, 9], 'y', 6);               // la forge
      A.b(g, [0.4, 6, 0.4], P.g, [10, 3, 8]); A.b(g, [5, 0.3, 0.3], P.g, [7.8, 6, 8]);                              // la grue
      for (const s of [-1, 1]) A.b(g, [10, 0.1, 0.12], P.t, [3, 0.25, 3 + s * 0.45], [0, 0, 0], false);
      A.b(g, [2.2, 0.7, 1.2], P.s, [3, 0.7, 3]); rang(A, g, -10, 3.4, 10);
    }
    return { g, w: 26, d: 22 };
  },
  caserne(A, n) {
    const g = G(A); sol(A, g, 42, 28);
    const places = [[-3.5, -8], [3.5, -8], [-10.5, -8], [10.5, -8], [-3.5, 8], [3.5, 8]];
    const nb = [0, 2, 4, 6][n];
    places.slice(0, nb).forEach(([x, z], k) => { const b = baraque(A, g, [x, z], 5, 14, 2.6, k === 5 && n >= 3 ? P.o : P.h, P.b, 0); void b; });
    if (n >= 3) { A.b(g, [1.6, 0.25, 0.25], P.o, [3.5, 4.6, 8], [0, 0, 0], false); A.b(g, [0.25, 1.6, 0.25], P.o, [3.5, 4.6, 8], [0, 0, 0], false); }          // la croix du poste de secours
    for (let k = 0; k < (n >= 2 ? 4 : 2); k++) A.prisme(g, [[-1.6, 0], [1.6, 0], [0, 2.2]], 3, P.r, [-17 + (k % 2) * 4, 0, -6 + Math.floor(k / 2) * 5]);          // les tentes
    if (n >= 2) { A.b(g, [3, 1.8, 2], P.s, [17, 0.9, 0]); A.cyl(g, 0.2, 2, P.t, [17.8, 2.6, 0.5], 'y', 6); }          // la cuisine roulante
    A.cyl(g, 0.08, 8, P.o, [0, 4, 0], 'y', 6); A.b(g, [2, 1.2, 0.05], P.n, [1.1, 7.3, 0], [0, 0, 0], false);          // le mât et son fanion
    rang(A, g, -4, -1, n >= 3 ? 36 : n >= 2 ? 24 : 12, 0.9, 12);
    return { g, w: 42, d: 28 };
  },
};
export const PIED = PIEDS;

