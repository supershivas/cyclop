// Les engins en volumes du jeu (Jérôme, v0.47.0) : l'atelier de formes (boîtes, cylindres, prismes, chenilles qui défilent, croix de fer) et le Schneider CA 1,
// sortis du labo (`labo-chars.js`, qui les reprend d'ici) pour que la bataille les dessine. Dessin seulement. 1 unité = 1 m, l'avant à +x, le haut à +y, la droite à +z.
import { PALETTE as P } from '../palette.js?v=0.108.0';

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
    // un fil tendu entre deux points (x, y, z), très fin, sans arêtes (le fil de fer)
    fil: (g, [x0, y0, z0], [x1, y1, z1], c, ep = 0.04) => {
      const l = Math.hypot(x1 - x0, y1 - y0, z1 - z0) || 0.01, m = new THREE.Mesh(new THREE.BoxGeometry(l, ep, ep), mat(c));
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), Math.asin((y1 - y0) / l)); g.add(m); return m;
    },
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


// Un Schneider détruit (Jérôme, 1er novembre : « les chars détruits ont des dégâts visibles : parties brûlées, chenilles détruites, éventrement ; la destruction est différente pour chaque char ») : la disposition `D`
// (`dispositionChar` de js/epaves.js) dit ce qui est arrivé à chaque partie ; aucune couleur nouvelle (le brûlé est la terre `t` et la boue sombre `s`). Rend le groupe, couché sur le sol, et ses débris (à plat, autour).
export function schneiderEpave(A, D) {
  const { THREE } = A, g = new THREE.Group(), corps = new THREE.Group(); g.add(corps);
  const noir = D.brule === 'noirci', taches = D.brule === 'taches';
  const coque = noir ? P.s : P.e, dessus = noir ? P.t : P.g;
  const chemin = [[-1.9, 0.2], [-1.5, 0], [1.4, 0], [2.0, 0.35], [1.7, 0.8], [-1.4, 0.8], [-2.0, 0.55]];
  // les chenilles : intacte (figée), cassée (l'avant en place, l'arrière pend et traîne), déroulée (à plat sur le sol, à côté, ses galets nus)
  [0, 1].forEach(k => {
    const z = k ? -0.9 : 0.9, etat = D.chenilles[k];
    if (etat === 'intacte') { A.chenille(corps, chemin, 0.42, z, { trou: 0, pas: 0.3, bande: noir ? P.t : P.b, patin: noir ? P.s : P.g }); return; }
    for (const [x, y] of [[-1.4, 0.3], [-0.5, 0.2], [0.4, 0.2], [1.3, 0.3]]) A.cyl(corps, 0.3, 0.3, P.s, [x, y, z], 'z', 8);                      // les galets nus
    const demi = etat === 'cassee' ? [[-0.2, 0], [1.4, 0], [2.0, 0.35], [1.7, 0.8], [-0.2, 0.8]] : null;
    if (demi) {
      A.chenille(corps, demi, 0.42, z, { trou: 0, pas: 0.3, bande: P.b, patin: P.g });
      for (let q = 0; q < 6; q++) A.b(corps, [0.34, 0.07, 0.42], q % 2 ? P.g : P.b, [-0.4 - q * 0.62 - 0.0, 0.7 - q * 0.12 - Math.min(q, 4) * 0.02, z + (k ? -1 : 1) * q * 0.07], [0, 0, -0.18 - q * 0.1]);   // la moitié arrière pend, puis traîne
      A.b(corps, [2.6, 0.06, 0.42], P.b, [-4.6, 0.06, z + (k ? -1 : 1) * 0.5], [0, 0.12 * (k ? 1 : -1), 0]);
    } else {
      const longueur = 8.2, n = 22;
      for (let q = 0; q < n; q++) A.b(corps, [0.34, 0.07, 0.42], q % 3 ? P.g : P.b, [-3.2 + q * (longueur / n), 0.05 + (q % 5 === 0 ? 0.05 : 0), (k ? -1 : 1) * (1.9 + Math.sin(q * 0.55) * 0.25)], [0, 0.04 * Math.sin(q), 0], false);
    }
  });
  // la caisse : entière, éventrée par un flanc (le panneau arraché, l'intérieur noir) ou par le ventre (le fond crevé, des tôles retournées)
  const haut = D.eventre === 'ventre' ? 0.55 : 1.05;
  A.b(corps, [4.3, 0.9, 1.65], coque, [-0.5, haut, 0]);
  if (D.eventre === 'flanc') {
    A.b(corps, [2.2, 0.8, 0.12], P.t, [-0.4, 1.1, D.cote * 0.78]);                                                                              // le trou : l'intérieur noir
    for (const [x, a] of [[-1.5, 0.6], [0.7, -0.5], [-0.3, 0.9]]) A.b(corps, [0.9, 0.7, 0.07], coque, [x, 1.1, D.cote * 1.15], [D.cote * 0.9, a * 0.3, 0.2 * a]);       // les tôles ouvertes vers l'extérieur
    A.b(corps, [1.4, 0.05, 0.6], P.t, [-0.4, 1.5, D.cote * 0.75], [D.cote * 0.5, 0, 0]);
  } else if (D.eventre === 'ventre') {
    for (const [x, z, a] of [[-1.6, 0.5, 0.5], [0.4, -0.6, -0.4], [1.4, 0.3, 0.7], [-0.5, 0, 0.2]]) A.b(corps, [1.0, 0.07, 0.8], coque, [x, 0.25, z], [a, a * 0.4, a]);       // les tôles du fond, retournées
    A.b(corps, [2.4, 0.06, 1.0], P.t, [-0.5, 0.18, 0]);
  }
  A.b(corps, [3.0, 0.7, 1.5], dessus === P.t ? P.t : coque, [-0.8, haut + 0.8, 0]);                                                              // la superstructure
  A.prisme(corps, [[1.65, haut - 0.45], [3.0, haut - 0.55], [3.0, haut - 0.2], [1.65, haut + 0.45]], 1.65, coque);                                  // la proue
  A.b(corps, [0.5, 0.18, 1.2], P.s, [3.15, 0.3, 0]);                                                                                              // l'éperon
  A.b(corps, [1.2, 0.8, 0.45], coque, [0.4, haut + 0.15, 0.98]);                                                                                 // le sponson du 75
  // le canon : droit, plié (vers le sol), ou arraché
  if (D.canon === 'droit') A.cyl(corps, 0.07, 0.8, P.t, [1.35, haut + 0.15, 1.05], 'x', 6);
  else if (D.canon === 'plie') { A.cyl(corps, 0.07, 0.5, P.t, [1.2, haut + 0.15, 1.05], 'x', 6); A.b(corps, [0.6, 0.13, 0.13], P.t, [1.7, haut - 0.1, 1.05], [0, 0, -0.9]); }
  // la coupole : en place, ouverte (le tampon soulevé), ou arrachée (un trou noir)
  if (D.coupole === 'place') { A.cyl(corps, 0.26, 0.4, P.g, [-0.1, haut + 1.3, 0.35], 'y', 8, 0.12); A.cyl(corps, 0.22, 0.34, P.g, [-1.6, haut + 1.25, -0.35], 'y', 8, 0.1); }
  else if (D.coupole === 'ouverte') { A.cyl(corps, 0.26, 0.2, P.g, [-0.1, haut + 1.25, 0.35], 'y', 8, 0.12); A.b(corps, [0.55, 0.06, 0.55], P.g, [0.2, haut + 1.55, 0.5], [0.3, 0.3, 0.9]); A.cyl(corps, 0.22, 0.34, P.g, [-1.6, haut + 1.25, -0.35], 'y', 8, 0.1); }
  else { A.cyl(corps, 0.22, 0.05, P.t, [-0.1, haut + 1.2, 0.35], 'y', 8); A.cyl(corps, 0.2, 0.05, P.t, [-1.6, haut + 1.2, -0.35], 'y', 8); }
  if (taches || noir) for (const [x, z, w] of [[-1.2, 0.3, 1.1], [0.5, -0.4, 0.9], [1.4, 0.5, 0.7], [-0.2, 0.1, 1.3]]) A.b(corps, [w, 0.04, w * 0.8], P.t, [x, haut + 1.2, z], [0, x, 0], false);   // les taches de suie sur le toit
  // les débris, à plat : plaques de blindage, maillons de chenille, poutres tordues, roues
  const debris = new THREE.Group(); g.add(debris);
  for (const d of D.debris) {
    const e = new THREE.Group(); e.position.set(d.dx, 0, d.dz); e.rotation.set(d.roulis, d.yaw, 0, 'YXZ');
    if (d.type === 'plaque') A.b(e, [1.0 * d.taille, 0.08, 0.7 * d.taille], coque, [0, 0.06, 0]);
    else if (d.type === 'maillon') for (let q = 0; q < 4; q++) A.b(e, [0.34, 0.07, 0.42], q % 2 ? P.g : P.b, [q * 0.36, 0.05, 0], [0, 0, 0], false);
    else if (d.type === 'poutre') A.b(e, [1.8 * d.taille, 0.1, 0.1], P.s, [0, 0.08, 0], [0, 0, 0.1]);
    else A.cyl(e, 0.3 * d.taille, 0.12, P.s, [0, 0.3 * d.taille, 0], 'z', 8);
    debris.add(e);
  }
  // les pièces arrachées qui gisent plus loin
  if (D.arrachee) { const e = new THREE.Group(); e.position.set(D.arrachee.dx, 0, D.arrachee.dz); e.rotation.set(0.5, 1.2, 0.4); A.cyl(e, 0.26, 0.4, P.g, [0, 0.3, 0], 'y', 8, 0.12); A.cyl(e, 0.12, 0.2, P.g, [0, 0.5, 0], 'y', 8); debris.add(e); }
  if (D.canonAbattu) { const e = new THREE.Group(); e.position.set(D.canonAbattu.dx, 0, D.canonAbattu.dz); e.rotation.set(0, 0.7, 0); A.cyl(e, 0.07, 1.3, P.t, [0, 0.1, 0], 'x', 6); A.b(e, [0.16, 0.34, 0.34], P.s, [-0.6, 0.18, 0]); debris.add(e); }
  g.rotation.order = 'YXZ'; corps.rotation.set(D.roulis, 0, D.tangage, 'XYZ'); corps.position.y = -D.enfonce;
  return { groupe: g, debris, corps, longueur: 6.0 };
}
