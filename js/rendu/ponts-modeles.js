// Les ouvrages des ponts en volumes (Jérôme, v0.47.2 : « les ponts B C D E F G K sont à conserver en jeu ») : dessinés par le jeu (`rendu/ponts.js`, un pont posé par l'éditeur de carte) et par le labo (`labo-ponts.js`).
// L'origine est le milieu du pont, au niveau du dessus du tablier (y = 0), x le long de la portée, z en travers ; `{ L, W, H }` : la longueur, la largeur utile, la hauteur du tablier sur l'eau.
// Volumes `THREE` à l'échelle (1 unité = 1 m), mêmes arêtes de terre que les chars ; le dessin seulement.
import { PALETTE as P } from '../palette.js?v=0.67.3';

// ─── La boîte à pièces : une boîte, un cylindre couché, un prisme, des arêtes de terre ───
export function outils(THREE) {
  const mats = new Map(), mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: new THREE.Color(c) })); return mats.get(c); };
  const arete = new THREE.LineBasicMaterial({ color: new THREE.Color(P.t) });
  const mesh = (g, geo, c, [x, y, z] = [0, 0, 0], rot = [0, 0, 0], bord = true) => {
    const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.rotation.set(...rot); g.add(m);
    if (bord) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), arete); l.position.copy(m.position); l.rotation.copy(m.rotation); g.add(l); }
    return m;
  };
  const b = (g, [w, h, d], c, pos, rot) => mesh(g, new THREE.BoxGeometry(w, h, d), c, pos, rot);
  // une barre entre deux points (x, y) à la profondeur z : un fer, une diagonale, un câble
  const barre = (g, [x1, y1], [x2, y2], ep, c, z = 0, prof = ep) => {
    const L = Math.hypot(x2 - x1, y2 - y1), m = b(g, [L, ep, prof], c, [(x1 + x2) / 2, (y1 + y2) / 2, z], [0, 0, Math.atan2(y2 - y1, x2 - x1)]);
    return m;
  };
  const cyl = (g, r, len, c, pos, axe = 'y', seg = 10, r2 = r) => mesh(g, new THREE.CylinderGeometry(r2, r, len, seg), c, pos, axe === 'x' ? [0, 0, Math.PI / 2] : axe === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]);
  // un volume extrudé d'un contour (x, y) et de trous (autant de listes de points), épais de `ep` sur z, centré
  const forme = (g, pts, trous, ep, c, pos = [0, 0, 0]) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const t of trous) s.holes.push(new THREE.Path(t.map(([x, y]) => new THREE.Vector2(x, y))));
    const geo = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: false }); geo.translate(0, 0, -ep / 2);
    return mesh(g, geo, c, pos);
  };
  // un demi-cercle (ou un arc) en points, de gauche à droite
  const arc = (cx, cy, rx, ry, n = 14) => Array.from({ length: n + 1 }, (_, k) => [cx - rx * Math.cos(k / n * Math.PI), cy + ry * Math.sin(k / n * Math.PI)]);
  return { THREE, b, barre, cyl, forme, arc, mesh };
}

// ─── Les dix ouvrages ───
export const OUVRAGES = {
  // B : une passerelle de planches sur piles de bois, un garde-corps de poteaux et de cordes (le plus simple, le plus vite posé)
  planches: (O, { L, W, H }) => {
    const g = new O.THREE.Group();
    O.b(g, [L, 0.22, W], P.h, [0, -0.11, 0]);
    for (const z of [-W / 2 + 0.4, 0, W / 2 - 0.4]) O.b(g, [L, 0.3, 0.25], P.g, [0, -0.37, z]);
    for (const x of [-L / 3, 0, L / 3]) for (const z of [-W / 2 + 0.5, W / 2 - 0.5]) O.cyl(g, 0.22, H + 1.4, P.g, [x, -(H + 1.4) / 2 - 0.5, z], 'y', 7);
    for (const z of [-W / 2 + 0.1, W / 2 - 0.1]) {
      for (let x = -L / 2 + 0.3; x <= L / 2; x += 2.4) O.b(g, [0.14, 1.1, 0.14], P.g, [x, 0.55, z]);
      O.b(g, [L, 0.1, 0.1], P.o, [0, 1.05, z]); O.b(g, [L, 0.07, 0.07], P.o, [0, 0.55, z]);
    }
    return { g };
  },
  // C : un pont de pierre à trois arches en plein cintre, des parapets, des avant-becs sur l'eau
  arches: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), bas = -H - 1.5, pile = 1.1, ouv = (L - 4 * pile) / 3, hautArc = Math.min(H - 0.1, ouv * 0.5);
    const trous = [0, 1, 2].map(k => { const cx = -L / 2 + pile * 1.5 + ouv * (k + 0.5) + pile * k; return O.arc(cx, -H - 0.4, ouv / 2, hautArc).reverse(); });
    O.forme(g, [[-L / 2, bas], [L / 2, bas], [L / 2, -0.35], [-L / 2, -0.35]], trous, W, P.r);
    O.b(g, [L, 0.35, W], P.r, [0, -0.175, 0]);
    for (const z of [-W / 2 + 0.25, W / 2 - 0.25]) O.b(g, [L, 0.8, 0.45], P.r, [0, 0.4, z]);
    return { g };
  },
  // D : un pont en dos d'âne, une seule arche de pierre : le tablier monte au milieu
  dosdane: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), bas = -H - 1.5, haut = 1.3;
    const dessus = Array.from({ length: 13 }, (_, k) => { const u = k / 12; return [-L / 2 + u * L, haut * (1 - (2 * u - 1) ** 2) - 0.0]; });
    const contour = [[-L / 2, bas], [L / 2, bas], ...dessus.slice().reverse()];
    const trou = O.arc(0, -H - 0.2, L * 0.36, H * 0.9 + haut * 0.4).reverse();
    O.forme(g, contour, [trou], W, P.r);
    for (const z of [-W / 2 + 0.2, W / 2 - 0.2]) { const mur = [...dessus, ...dessus.slice().reverse().map(([x, y]) => [x, y + 0.7])]; O.forme(g, mur, [], 0.4, P.r, [0, 0, z]); }
    return { g };
  },
  // E : des chevalets de bois, un portique tous les quatre mètres, des contreventements en croix (le pont du génie)
  chevalets: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), h = H + 1.6;
    O.b(g, [L, 0.2, W], P.h, [0, -0.1, 0]);
    for (const z of [-W / 2 + 0.5, 0, W / 2 - 0.5]) O.b(g, [L, 0.28, 0.28], P.g, [0, -0.34, z]);
    const n = Math.round(L / 4);
    for (let k = 0; k <= n; k++) {
      const x = -L / 2 + k * L / n;
      if (k === 0 || k === n) continue;
      for (const z of [-W / 2 + 0.5, W / 2 - 0.5]) {
        O.cyl(g, 0.2, h, P.g, [x - 0.35, -0.5 - h / 2, z], 'y', 7); O.cyl(g, 0.2, h, P.g, [x + 0.35, -0.5 - h / 2, z], 'y', 7);
        O.barre(g, [x - 0.35, -0.5], [x + 0.35, -1.6], 0.14, P.b, z, 0.18); O.barre(g, [x + 0.35, -0.5], [x - 0.35, -1.6], 0.14, P.b, z, 0.18);
      }
      O.b(g, [0.18, 0.18, W - 0.6], P.b, [x, -1.3, 0]);
    }
    for (const z of [-W / 2 + 0.08, W / 2 - 0.08]) O.b(g, [L, 0.12, 0.12], P.g, [0, 0.45, z]);
    return { g };
  },
  // F : une poutre Warren métallique, le tablier en bas entre deux poutres à diagonales (rivets, un fer de 3,4 m de haut)
  warren: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), hf = 3.4, n = 8, pas = (L - 2) / n;
    O.b(g, [L, 0.3, W], P.s, [0, -0.15, 0]);
    for (const z of [-W / 2 - 0.15, W / 2 + 0.15]) {
      O.b(g, [L - 2, 0.3, 0.3], P.t, [0, 0.1, z]); O.b(g, [L - 2, 0.3, 0.3], P.t, [0, hf, z]);
      for (let k = 0; k < n; k++) {
        const x0 = -L / 2 + 1 + k * pas, x1 = x0 + pas, haute = k % 2 === 0;
        O.barre(g, haute ? [x0, 0.1] : [x0, hf], haute ? [x1, hf] : [x1, 0.1], 0.2, P.s, z, 0.22);
      }
    }
    for (let k = 0; k <= n; k += 2) O.b(g, [0.2, 0.2, W + 0.6], P.t, [-L / 2 + 1 + k * pas, hf, 0]);
    for (const s of [-1, 1]) O.b(g, [2.4, H + 1.5, W + 0.6], P.r, [s * (L / 2 - 0.8), -(H + 1.5) / 2 - 0.3, 0]);
    return { g };
  },
  // G : un pont suspendu, deux pylônes, des câbles en chaînette, des suspentes (la portée est franchie sans rien dans l'eau)
  suspendu: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), hp = 6.2;
    O.b(g, [L, 0.22, W - 0.8], P.h, [0, -0.11, 0]);
    for (const z of [-W / 2 + 0.3, W / 2 - 0.3]) O.b(g, [L, 0.3, 0.3], P.g, [0, -0.4, z]);
    for (const s of [-1, 1]) {
      const x = s * (L / 2 - 2.2);
      for (const z of [-W / 2 - 0.2, W / 2 + 0.2]) O.b(g, [0.9, hp + H + 1.5, 0.9], P.r, [x, hp / 2 - (H + 1.5) / 2, z]);
      O.b(g, [0.8, 0.7, W + 0.8], P.r, [x, hp, 0]);
    }
    for (const z of [-W / 2 - 0.2, W / 2 + 0.2]) {
      const pts = Array.from({ length: 17 }, (_, k) => { const u = k / 16, x = -(L / 2 - 2.2) + u * (L - 4.4); return [x, hp - 0.35 - (hp - 1.4) * 4 * u * (1 - u)]; });
      for (let k = 0; k < 16; k++) O.barre(g, pts[k], pts[k + 1], 0.1, P.t, z, 0.1);
      for (let k = 1; k < 16; k++) O.b(g, [0.04, pts[k][1] - 0.2, 0.04], P.s, [pts[k][0], (pts[k][1] + 0.2) / 2, z * 0.93]);
    }
    for (const s of [-1, 1]) O.b(g, [2.6, H + 1.5, W], P.r, [s * (L / 2 - 0.9), -(H + 1.5) / 2 - 0.2, 0]);
    return { g };
  },
  // H : un pont de bateaux (équipage de pont du génie) : des bateaux plats alignés sur l'eau, un tablier bas, deux rampes ; il suit le niveau de l'eau
  pontons: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), niveau = -H + 0.55, n = 5, pas = (L - 6) / (n - 1);
    for (let k = 0; k < n; k++) {
      const x = -(L - 6) / 2 + k * pas;
      O.forme(g, [[-1.7, 0], [1.7, 0], [2.1, 0.5], [-2.1, 0.5], [-1.7, 0]], [], 1.9, P.s, [x, niveau - 0.5, 0]);
      O.b(g, [pas + 0.2, 0.12, W - 1.2], P.g, [x, niveau + 0.14, 0]);
    }
    for (const x of [-1, 1]) {
      const x0 = x * (L - 6) / 2, x1 = x * L / 2;
      O.forme(g, [[x0, niveau + 0.2], [x1, 0], [x1, -0.25], [x0, niveau - 0.05]], [], W - 1.2, P.h);
    }
    for (let k = 0; k < n; k++) { const x = -(L - 6) / 2 + k * pas; O.cyl(g, 0.05, 1, P.o, [x, niveau + 0.6, W / 2 - 0.7], 'y', 5); O.cyl(g, 0.05, 1, P.o, [x, niveau + 0.6, -W / 2 + 0.7], 'y', 5); }
    return { g };
  },
  // I : des poutres pleines rivées sur deux piles de pierre à avant-becs (le pont de chemin de fer de 1900, le plus répandu)
  poutres: (O, { L, W, H }) => {
    const g = new O.THREE.Group();
    O.b(g, [L, 0.3, W], P.s, [0, -0.15, 0]);
    for (const z of [-W / 2 + 0.2, W / 2 - 0.2]) { O.b(g, [L, 1.2, 0.18], P.t, [0, -0.9, z]); O.b(g, [L, 0.2, 0.55], P.s, [0, -0.4, z]); O.b(g, [L, 0.2, 0.55], P.s, [0, -1.5, z]); }
    for (let x = -L / 2 + 1.5; x < L / 2; x += 3) for (const z of [-W / 2 + 0.2, W / 2 - 0.2]) O.b(g, [0.12, 1.1, 0.4], P.t, [x, -0.9, z]);
    for (const x of [-L / 6, L / 6]) { O.forme(g, [[-0.6, 0], [0.6, 0], [0.9, 0.4], [0.9, H + 2.6], [-0.9, H + 2.6], [-0.9, 0.4]], [], W - 1, P.r, [x, -H - 2.4, 0]); }
    for (const s of [-1, 1]) O.b(g, [2.6, H + 1.5, W], P.r, [s * (L / 2 - 0.9), -(H + 1.5) / 2 - 0.3, 0]);
    return { g };
  },
  // J : un pont à bascule (à contrepoids) : une volée baissée, l'autre relevée à 55°, des chaînes, un portique ; l'eau passe, et les bateaux aussi
  bascule: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), demi = L / 2 - 1.5, lev = new O.THREE.Group(), a = 0.96;
    O.b(g, [demi, 0.3, W], P.g, [-L / 2 + 1.5 + demi / 2, -0.15, 0]);
    for (const z of [-W / 2 + 0.3, W / 2 - 0.3]) O.b(g, [demi, 0.3, 0.3], P.b, [-L / 2 + 1.5 + demi / 2, -0.4, z]);
    O.b(lev, [demi, 0.3, W], P.g, [demi / 2, -0.15, 0]);
    for (const z of [-W / 2 + 0.3, W / 2 - 0.3]) O.b(lev, [demi, 0.3, 0.3], P.b, [demi / 2, -0.4, z]);
    O.b(lev, [2.2, 1.6, W - 0.4], P.s, [-1.1, -0.2, 0]);                  // le contrepoids, derrière l'axe
    lev.position.set(L / 2 - 1.5 - demi, -0.1, 0); lev.rotation.z = a; g.add(lev);
    for (const z of [-W / 2 - 0.2, W / 2 + 0.2]) {
      O.b(g, [0.5, 6.4, 0.5], P.s, [L / 2 - 1.2, 2.8 - 0.1, z]); O.b(g, [0.5, 0.5, 0.5], P.t, [L / 2 - 1.2, 6, z]);
      O.barre(g, [L / 2 - 1.2, 6], [L / 2 - 1.5 - demi + Math.cos(a) * demi * 0.9, -0.1 + Math.sin(a) * demi * 0.9], 0.07, P.t, z, 0.07);
    }
    for (const s of [-1, 1]) O.b(g, [3, H + 1.5, W], P.r, [s * (L / 2 - 0.5), -(H + 1.5) / 2 - 0.3, 0]);
    return { g };
  },
  // K : une passerelle de cordes et de planches, qui s'affaisse au milieu (un homme à la fois, ou presque : elle balance)
  cordes: (O, { L, W, H }) => {
    const g = new O.THREE.Group(), aff = Math.min(1.6, H * 0.7), larg = 1.6;
    const f = x => -aff * (1 - (2 * x / L) ** 2);                          // 0 aux appuis, −aff au milieu
    for (let x = -L / 2 + 0.35; x <= L / 2 - 0.2; x += 0.55) O.b(g, [0.45, 0.07, larg], P.h, [x, f(x), 0], [0, 0, 0]);
    for (const z of [-larg / 2 - 0.1, larg / 2 + 0.1]) {
      for (let k = 0; k < 24; k++) { const x1 = -L / 2 + k * L / 24, x2 = x1 + L / 24; O.barre(g, [x1, f(x1) + 0.05], [x2, f(x2) + 0.05], 0.06, P.g, z, 0.06); }
      for (let x = -L / 2 + 1; x < L / 2; x += 2) { O.barre(g, [x, f(x)], [x, f(x) + 0.95], 0.04, P.g, z, 0.04); }
      for (let k = 0; k < 24; k++) { const x1 = -L / 2 + k * L / 24, x2 = x1 + L / 24; O.barre(g, [x1, f(x1) + 1.0], [x2, f(x2) + 1.0], 0.05, P.g, z, 0.05); }
    }
    for (const s of [-1, 1]) for (const z of [-larg / 2 - 0.25, larg / 2 + 0.25]) O.cyl(g, 0.18, 2.4, P.g, [s * (L / 2 - 0.1), 0.6, z], 'y', 7);
    return { g };
  },
};

