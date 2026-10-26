// Les engins en volumes du jeu (Jérôme, v0.47.0) : l'atelier de formes (boîtes, cylindres, prismes, chenilles qui défilent, croix de fer) et le Schneider CA 1,
// sortis du labo (`labo-chars.js`, qui les reprend d'ici) pour que la bataille les dessine. Dessin seulement. 1 unité = 1 m, l'avant à +x, le haut à +y, la droite à +z.
import { PALETTE as P } from '../palette.js?v=0.77.1';

// ─── Le petit atelier de volumes ─────────────────────────────────────────────
// Un matériau éclairé (un peu de lumière au-dessus : les faces se distinguent) et des arêtes de terre sur chaque pièce
export function atelier(THREE) {
  const mats = new Map();
  const mat = c => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: new THREE.Color(c) })); return mats.get(c); };
  const arete = new THREE.LineBasicMaterial({ color: new THREE.Color(P.t) });
  const poser = (g, geo, couleur, [x, y, z], rot = [0, 0, 0], bord = true) => {
    const m = new THREE.Mesh(geo, mat(couleur)); m.position.set(x, y, z); m.rotation.set(rot[0], rot[1], rot[2]); g.add(m);
    if (bord) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), arete); l.position.copy(m.position); l.rotation.copy(m.rotation); g.add(l); }
    return m;
  };
  const A = {
    THREE,
    // une boîte w × h × d (x, y, z)
    b: (g, [w, h, d], c, pos, rot) => poser(g, new THREE.BoxGeometry(w, h, d), c, pos, rot),
    // un cylindre de rayon r et de longueur len, couché sur l'axe 'x', 'y' ou 'z'
    cyl: (g, r, len, c, pos, axe = 'y', seg = 8, r2 = r) => {
      const geo = new THREE.CylinderGeometry(r2, r, len, seg);
      return poser(g, geo, c, pos, axe === 'x' ? [0, 0, Math.PI / 2] : axe === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]);
    },
    // un polygone du plan (x, y), épaissi de `ep` sur z, centré en z
    prisme: (g, pts, ep, c, pos = [0, 0, 0], rot) => {
      const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const geo = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: false }); geo.translate(0, 0, -ep / 2);
      return poser(g, geo, c, pos, rot);
    },
    // une cage de chenille : le contour de la chenille (un polygone fermé du plan x, y) en bande évidée, et des patins qui défilent dessus
    chenille: (g, chemin, largeur, z, { bande = P.b, patin = P.g, trou = 0.8, pas = 0.34 } = {}) => {
      const cx = chemin.reduce((a, p) => a + p[0], 0) / chemin.length, cy = chemin.reduce((a, p) => a + p[1], 0) / chemin.length;
      const s = new THREE.Shape(chemin.map(([x, y]) => new THREE.Vector2(x, y)));
      if (trou) s.holes.push(new THREE.Path(chemin.map(([x, y]) => new THREE.Vector2(cx + (x - cx) * trou, cy + (y - cy) * trou)).reverse()));
      const geo = new THREE.ExtrudeGeometry(s, { depth: largeur * 0.8, bevelEnabled: false }); geo.translate(0, 0, -largeur * 0.4);
      poser(g, geo, bande, [0, 0, z], [0, 0, 0], false);
      // les patins : de petites boîtes régulièrement posées sur le contour, qui défilent quand le char avance
      const seg = chemin.map((p, i) => { const q = chemin[(i + 1) % chemin.length]; return { p, q, l: Math.hypot(q[0] - p[0], q[1] - p[1]), a: Math.atan2(q[1] - p[1], q[0] - p[0]) }; });
      const total = seg.reduce((a, t) => a + t.l, 0), n = Math.round(total / pas);
      const patins = new THREE.InstancedMesh(new THREE.BoxGeometry(pas * 0.82, 0.07, largeur), mat(patin), n);
      patins.position.z = z; g.add(patins);
      const o = new THREE.Object3D();
      const maj = decalage => {
        for (let k = 0; k < n; k++) {
          let d = ((k * total / n + decalage) % total + total) % total, i = 0;
          while (d > seg[i].l) { d -= seg[i].l; i++; }
          const t = seg[i], u = d / t.l;
          o.position.set(t.p[0] + (t.q[0] - t.p[0]) * u, t.p[1] + (t.q[1] - t.p[1]) * u, 0); o.rotation.set(0, 0, t.a); o.updateMatrix(); patins.setMatrixAt(k, o.matrix);
        }
        patins.instanceMatrix.needsUpdate = true;
      };
      maj(0);
      return maj;
    },
    // la croix de fer (Balkenkreuz) : un fond de terre, deux bras d'os, posée sur un flanc (le plan x, y, à la profondeur z)
    croix: (g, [x, y, z], t) => {
      const fond = A.b(g, [t * 1.25, t * 1.25, 0.03], P.t, [x, y, z]); void fond;
      poser(g, new THREE.BoxGeometry(t * 1.1, t * 0.34, 0.04), P.o, [x, y, z + Math.sign(z) * 0.01], [0, 0, 0], false);
      poser(g, new THREE.BoxGeometry(t * 0.34, t * 1.1, 0.04), P.o, [x, y, z + Math.sign(z) * 0.01], [0, 0, 0], false);
    },
  };
  return A;
}


// Le Schneider CA 1 : une caisse trapue, un éperon, un 75 à droite
export function schneider(A) {
  const { THREE } = A, g = new THREE.Group(), coque = P.e;
  const chemin = [[-1.9, 0.2], [-1.5, 0], [1.4, 0], [2.0, 0.35], [1.7, 0.8], [-1.4, 0.8], [-2.0, 0.55]];
  const m1 = A.chenille(g, chemin, 0.42, 0.9, { trou: 0, pas: 0.3 }), m2 = A.chenille(g, chemin, 0.42, -0.9, { trou: 0, pas: 0.3 });
  A.b(g, [4.3, 0.9, 1.65], coque, [-0.5, 1.05, 0]);                       // la caisse
  A.b(g, [3.0, 0.7, 1.5], coque, [-0.8, 1.85, 0]);                        // la superstructure
  A.prisme(g, [[1.65, 0.6], [3.0, 0.5], [3.0, 0.85], [1.65, 1.5]], 1.65, coque);                       // la proue en coin
  A.prisme(g, [[1.65, 1.5], [3.0, 0.85], [3.0, 0.95], [1.65, 1.6]], 1.4, P.g);
  A.b(g, [0.5, 0.18, 1.2], P.s, [3.15, 0.3, 0]);                          // l'éperon qui coupe les fils de fer
  A.prisme(g, [[0, 0], [0.55, 0.14], [0, 0.28]], 0.9, P.s, [3.1, 0.62, 0]);
  A.b(g, [1.2, 0.8, 0.45], coque, [0.4, 1.2, 0.98]);                      // le sponson du 75, à droite
  A.cyl(g, 0.07, 0.8, P.t, [1.35, 1.2, 1.05], 'x', 6);                    // le canon de 75 de tranchée, court
  A.b(g, [0.16, 0.34, 0.34], P.s, [0.95, 1.2, 1.05]);
  for (const s of [-1, 1]) A.b(g, [0.1, 0.1, 0.1], P.t, [2.2, 1.3, s * 0.4]);                          // les Hotchkiss de proue
  A.cyl(g, 0.26, 0.4, P.g, [-0.1, 2.35, 0.35], 'y', 8, 0.12);             // les deux coupoles
  A.cyl(g, 0.22, 0.34, P.g, [-1.6, 2.3, -0.35], 'y', 8, 0.1);
  A.b(g, [0.8, 0.08, 0.7], P.s, [-2.0, 2.24, 0.1]);                       // la trappe arrière
  for (let k = 0; k < 4; k++) A.b(g, [0.04, 0.12, 0.02], P.t, [-1.5 + k * 0.7, 1.95, 0.76], [0, 0, 0], false);       // les créneaux de vision
  for (const s of [1, -1]) { A.b(g, [1.2, 0.05, 0.02], P.h, [-0.8, 1.9, s * 0.76], [0, 0, 0], false); A.b(g, [0.9, 0.5, 0.02], P.g, [-1.2, 1.05, s * 0.83], [0, 0, 0], false); }
  return { groupe: g, longueur: 6.0, maj: (dt, v) => { m1.d = (m1.d || 0) + v * dt; m1(m1.d); m2(m1.d); } };
}

