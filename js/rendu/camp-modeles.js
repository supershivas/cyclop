// Les bâtiments du camp dessinés en volumes (Jérôme, v0.87.0) : sortis du labo (`labo-batiments.js`) pour que le jeu les dessine aussi (`rendu/camp.js`).
// Chaque fabrique `BATIR[clé](A, niveau)` rend { g, w, d } : le groupe centré sur son emprise (w le long de x, d le long de z), l'avant (le front) à −z ; `A` est `atelier(THREE)` (engins.js).
// 1 unité = 1 m, la palette du jeu seulement ; le dessin seulement, rien n'y est écrit.
import { PALETTE as P } from '../palette.js?v=0.126.0';
import { schneider } from './engins.js?v=0.126.0';
import { PIEDS } from '../data/batiments.js?v=0.126.0';

// ─── Les pièces communes ───────────────────────────────────────────────────
export const G = A => new A.THREE.Group();
// Le camp qu'on dessine (réglé par `rendu/camp.js` avant chaque bâtiment) : la couleur de son armée (`n` : nous, `x` : en face) teinte les soldats, les faîtages et les drapeaux
let CAMP = 0;
export const regler_camp = c => { CAMP = c; };
const coulCamp = () => (CAMP === 0 ? P.n : P.x);
// Le soldat du camp (Jérôme, retour du 1er nov. : « les soldats des bâtiments ne doivent pas être des boîtes, mais le même modèle que les autres ») : les MÊMES boîtes que le soldat équipé du jeu
// (`geometrieSoldat('equipe')` de geometries.js : bottes, bandes molletières, capote, ceinturon, bras, mains, visage, casque, cimier et visière chez nous, pointe chez eux, fusil, baïonnette, sac),
// les mêmes cotes, une couleur de la palette par partie ; fondues en UN maillage par camp (une couleur par sommet, la face du dessus plus claire, le sud, l'est et l'ouest plus sombres :
// l'éclairage plat du jeu) : un seul appel de dessin par homme, sans arêtes. Le devant est +z.
const PARTS_SOLDAT = [   // x0, x1, y0, y1, z0, z1, partie
  [-0.2, -0.03, 0.12, 0.82, -0.09, 0.09, 3], [0.03, 0.2, 0.12, 0.82, -0.09, 0.09, 3],
  [-0.21, -0.02, 0, 0.12, -0.1, 0.2, 8], [0.02, 0.21, 0, 0.12, -0.1, 0.2, 8],
  [-0.27, 0.27, 0.56, 0.84, -0.17, 0.17, 0], [-0.24, 0.24, 0.8, 1.42, -0.15, 0.15, 0],
  [-0.255, 0.255, 0.77, 0.86, -0.16, 0.16, 7], [-0.17, -0.07, 0.84, 0.97, 0.15, 0.2, 7], [-0.02, 0.08, 0.84, 0.97, 0.15, 0.2, 7], [0.13, 0.23, 0.84, 0.97, 0.15, 0.2, 7],
  [-0.3, -0.2, 0.55, 0.82, -0.2, -0.06, 5], [-0.22, 0.22, 1.35, 1.46, -0.2, 0.2, 5], [-0.09, 0.09, 1.38, 1.43, 0.1, 0.16, 7],
  [-0.35, -0.24, 0.82, 1.4, -0.07, 0.07, 0], [0.24, 0.35, 0.82, 1.4, -0.07, 0.07, 0],
  [-0.35, -0.24, 0.74, 0.84, -0.06, 0.06, 9], [0.24, 0.35, 0.74, 0.84, -0.06, 0.06, 9],
  [-0.1, 0.1, 1.4, 1.6, -0.1, 0.1, 6], [-0.16, 0.16, 1.57, 1.7, -0.16, 0.16, 2],
  [0.37, 0.42, 0.55, 1.95, -0.03, 0.03, 4], [0.385, 0.405, 1.95, 2.2, -0.012, 0.012, 4], [-0.19, 0.19, 0.95, 1.38, -0.32, -0.15, 5],
];
const PARTS_CAMP = {   // ce qui n'est que chez nous (cimier, visière, moustache) ou que chez eux (pointe, couvre-nuque)
  0: [[-0.02, 0.02, 1.7, 1.79, -0.14, 0.14, 12], [-0.15, 0.15, 1.6, 1.64, 0.15, 0.22, 12], [-0.07, 0.07, 1.47, 1.51, 0.1, 0.14, 13]],
  1: [[-0.015, 0.015, 1.7, 1.84, -0.015, 0.015, 22], [-0.15, 0.15, 1.6, 1.64, -0.22, -0.15, 22]],
};
const geosSoldat = new Map();
function geoSoldat(A, camp) {
  if (geosSoldat.has(camp)) return geosSoldat.get(camp);
  const { THREE } = A, K = camp === 0 ? P.n : P.x;
  const couleur = { 0: K, 2: K, 3: P.g, 4: P.s, 5: P.g, 6: P.o, 7: P.b, 8: P.t, 9: P.o, 12: K, 13: P.t, 22: P.t };
  const pos = [], col = [], nor = [], c = new THREE.Color();
  for (const [x0, x1, y0, y1, z0, z1, k] of [...PARTS_SOLDAT, ...PARTS_CAMP[camp]]) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).toNonIndexed(); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const p = g.attributes.position, n = g.attributes.normal; c.set(couleur[k] ?? K);
    for (let i = 0; i < p.count; i++) {
      const ny = n.getY(i), nx = n.getX(i), nz = n.getZ(i), f = ny > 0.5 ? 1 : ny < -0.5 ? 0.45 : nz > 0.5 ? 0.82 : nz < -0.5 ? 0.6 : nx > 0 ? 0.7 : 0.62;
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(nx, ny, nz); col.push(c.r * f, c.g * f, c.b * f);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geosSoldat.set(camp, geo); return geo;
}
const matSoldat = new Map();
export function soldatDetaille(A) {
  if (!matSoldat.has(A.THREE)) matSoldat.set(A.THREE, new A.THREE.MeshBasicMaterial({ vertexColors: true }));
  const m = new A.THREE.Mesh(geoSoldat(A, CAMP), matSoldat.get(A.THREE)); m.userData.soldat = true; return m;
}
export const soldat = (A, g, x, z, ang = Math.PI) => { const m = soldatDetaille(A); m.position.set(x, 0, z); m.rotation.y = ang; g.add(m); return m; };
const rang = (A, g, x0, z0, n, pas = 0.9, long = 10) => { for (let k = 0; k < n; k++) soldat(A, g, x0 + (k % long) * pas, z0 + Math.floor(k / long) * 1.1); };
// une baraque à pignon : murs w × h × L, toit en deux pans
function baraque(A, g, [x, z], w, L, h, mur, toit, rot = 0) {
  const b = G(A);
  A.b(b, [w, h, L], mur, [0, h / 2, 0]);
  A.prisme(b, [[-w / 2 - 0.3, h], [w / 2 + 0.3, h], [0, h + w * 0.3]], L + 0.6, toit);
  A.b(b, [0.3, 0.22, L + 0.7], coulCamp(), [0, h + w * 0.3 + 0.02, 0]);                                  // le faîtage, à la couleur de l'armée
  A.b(b, [w * 0.35, h * 0.7, 0.1], P.t, [0, h * 0.35, L / 2 + 0.03], [0, 0, 0], false);                  // la porte
  b.position.set(x, 0, z); b.rotation.y = rot; g.add(b); return b;
}
const arche = (R, n = 12) => { const p = [[-R, 0]]; for (let k = 1; k < n; k++) { const a = Math.PI - k * Math.PI / n; p.push([R * Math.cos(a), R * 0.8 * Math.sin(a)]); } p.push([R, 0]); return p; };
// le socle : plat, posé sur le point le plus haut de l'emprise et descendant jusqu'au plus bas (`creux`, m ; v0.99.5), pour que le bâtiment ne lévite pas sur une pente et qu'aucune bosse ne perce le sol
let CREUX = 0;
export const regler_creux = c => { CREUX = Math.max(0, c); };
// (Jérôme, retour du 1er nov. : « la piste est posée directement sur le sol, pas de rectangle autour ; idem pour les autres bâtiments » : plus aucun socle ; `sol` ne dessine rien, `rendu/camp.js` pose le bâtiment à mi-hauteur de son emprise)
function sol() {}

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

// Une clôture de fil de fer autour d'une emprise w × d (piquets tous les 5 m, deux fils tendus de piquet en piquet), posée à (cx, cz) : seule chose qui borde l'aérodrome
function barbeles(A, g, w, d, cx, cz) {
  const pts = [], pas = 5;
  for (let x = -w / 2; x < w / 2; x += pas) pts.push([x, -d / 2]);
  for (let z = -d / 2; z < d / 2; z += pas) pts.push([w / 2, z]);
  for (let x = w / 2; x > -w / 2; x -= pas) pts.push([x, d / 2]);
  for (let z = d / 2; z > -d / 2; z -= pas) pts.push([-w / 2, z]);
  pts.forEach(([x, z], k) => {
    A.b(g, [0.14, 1.5, 0.14], P.g, [cx + x, 0.75, cz + z]);
    const [x2, z2] = pts[(k + 1) % pts.length];
    for (const y of [0.55, 1.1]) A.fil(g, [cx + x, y, cz + z], [cx + x2, y, cz + z2], P.s);
  });
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
    const g = G(A);                                                                       // plus de socle : la piste est posée sur le sol, entourée de barbelés
    A.b(g, [80, 0.3, 12], P.g, [0, 0.15, 4], [0, 0, 0], false);                           // la piste : une bande de glaise, 30 cm haute (le sol d'à côté l'enterre d'un côté de la pente)
    for (let k = -6; k <= 6; k++) A.b(g, [4, 0.02, 0.4], P.o, [k * 6, 0.31, 4], [0, 0, 0], false);       // l'axe en pointillé blanc
    for (const s of [-1, 1]) A.b(g, [80, 0.02, 0.25], P.o, [0, 0.305, 4 + s * 5.6], [0, 0, 0], false);   // les bords
    barbeles(A, g, 88, 44, 0, 0);                                                          // la clôture de fil de fer
    const hangars = [-32, -19, -6].slice(0, n);
    for (const x of hangars) { A.prisme(g, arche(5), 14, P.r, [x, 0, -16]); A.b(g, [8, 3.4, 0.1], P.t, [x, 1.7, -8.97], [0, 0, 0], false); }
    const avions = [[-32, -5, 0], [20, 4, 0.1], ...(n >= 2 ? [[-19, -5, 0]] : []), ...(n >= 3 ? [[-6, -5, 0], [34, 4, -0.1]] : [])];
    avions.slice(0, [0, 2, 3, 5][n]).forEach(([x, z, r], k) => { const a = biplan(A); a.position.set(x, 0, z); a.rotation.y = Math.PI / 2 + r; a.userData.parque = k; g.add(a); });      // `parque` : son rang ; `rendu/camp.js` cache ceux qui sont partis (v0.99.8)
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
    const c = schneider(A).groupe; c.position.set(baies[baies.length - 1], 0, -10); c.rotation.y = Math.PI / 2; c.userData.parc = true; g.add(c);      // `parc` : caché quand un char en sort (rendu/camp.js)
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
    rang(A, g, -4, -19, n >= 3 ? 36 : n >= 2 ? 24 : 12, 0.9, 12);               // la cour, devant la façade (hors des baraques : plus d'hommes dans les murs)
    return { g, w: 42, d: 28 };
  },
};
// L'hôpital (v0.99.11) : des pavillons blancs (os) à toit de boue et croix de terre, des tentes de triage, une ambulance
BATIR.hopital = (A, n) => {
  const g = G(A); sol(A, g, 30, 24);
  const places = [[-7, -4.5], [7, -4.5], [-7, 6.5], [7, 6.5]], nb = [0, 1, 2, 4][n];
  places.slice(0, nb).forEach(([x, z]) => {
    baraque(A, g, [x, z], 4.6, 9, 2.4, P.o, P.b, Math.PI / 2);
    A.b(g, [1.6, 0.25, 0.3], P.t, [x, 3.05, z], [0, 0, 0], false); A.b(g, [0.3, 0.25, 1.6], P.t, [x, 3.08, z], [0, 0, 0], false);        // la croix, sur le faîtage
  });
  for (let k = 0; k < (n >= 2 ? 3 : 2); k++) A.prisme(g, [[-1.5, 0], [1.5, 0], [0, 2]], 2.8, P.r, [-12 + k * 4, 0, -9]);                            // les tentes de triage
  if (n >= 3) { A.b(g, [3.4, 1.6, 2], P.o, [12, 0.9, -8]); A.b(g, [0.7, 0.2, 0.7], P.t, [12, 1.75, -8], [0, 0, 0], false); }                          // le bloc opératoire
  A.b(g, [3, 1.5, 1.8], P.g, [11.5, 0.95, 9.5]); A.b(g, [1.6, 0.1, 0.35], P.o, [11.5, 1.75, 9.5], [0, 0, 0], false);                                // l'ambulance
  return { g, w: 30, d: 24 };
};
// La vie d'un camp (v0.99.11 : « des drapeaux qui flottent, des soldats non armés qui bougent ») : un drapeau de l'armée au coin du bâtiment, et des hommes sans arme qui font les cent pas devant ;
// `rendu/camp.js` les anime à chaque image (`userData.drapeau`, `userData.marche`). `coul` : la couleur de l'armée (n : nous, x : en face).
export function vie(A, w, d, niveau, coul, graine) {
  const g = G(A), h = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233 + graine) * 43758.5453; return v - Math.floor(v); };
  A.cyl(g, 0.09, 8, P.o, [w / 2 - 1.2, 4, d / 2 - 1.2], 'y', 6);
  const f = G(A); f.position.set(w / 2 - 1.2, 7.3, d / 2 - 1.2);
  const toile = G(A); toile.position.set(1.1, 0, 0); A.b(toile, [2.2, 1.4, 0.06], coul, [0, 0, 0], [0, 0, 0], false); f.add(toile);
  f.userData.drapeau = { ph: h(1, 2) * 6 };
  g.add(f);
  for (let k = 0; k < 2 + niveau; k++) {
    const m = G(A), x0 = -w / 2 + 3 + h(k, 3) * (w / 2 - 3), long = 4 + h(k, 4) * 6;
    const h0 = soldatDetaille(A); m.add(h0);                                               // le même homme que dans le jeu (sans arme au bras : il flâne)
    m.userData.marche = { x0, x1: Math.min(w / 2 - 3, x0 + long), z: -d / 2 + 1.3 + (k % 2) * 1.1, v: 0.35 + h(k, 5) * 0.3, ph: h(k, 6) * 6 };
    m.position.set(x0, 0, m.userData.marche.z);
    g.add(m);
  }
  return g;
}
export const PIED = PIEDS;

