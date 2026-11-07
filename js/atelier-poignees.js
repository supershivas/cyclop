// Les poignées 3D de l'atelier d'animation (Jérôme, 7 nov. : « toutes les poignées 3D sur l'écran pour que le placement soit plus évident, comme sur les logiciels de 3D »).
// Trois outils, comme dans un logiciel de 3D : TOURNER (un anneau autour de chaque articulation choisie, un par axe), DÉPLACER (des flèches sur la poitrine et le fusil : baisser, pousser, décaler),
// ÉCHELLE (des cubes sur les trois axes : la carrure de l'homme, pour l'aperçu seulement, qui n'entre pas dans une animation). Les articulations viennent de `articulations` (js/pose-soldat.js) ;
// ce module ne sait ni ce qu'est une pose, ni le nuanceur : il pose des poignées, lit une valeur (`lire`), la change (`regler`) et rend la main.
// Les poignées gardent la même taille à l'écran à tous les zooms (une taille en pixels de l'image, divisée par `ppm`). Les couleurs des axes (rouge x, vert y, bleu z) sont celles des logiciels de 3D :
// c'est un outil, la palette du jeu ne s'y applique pas.
const COUL = { x: 0xe0604f, y: 0x8fd96a, z: 0x6aa5ff, choisi: 0xdde874, point: 0xe4dfd0 };
const PX = { anneau: 38, fleche: 46, point: 4, prise: 10, tube: 6 };
export const OUTILS = [['tourner', 'Tourner', 'E'], ['deplacer', 'Déplacer', 'W'], ['echelle', 'Échelle', 'R']];

export function creerPoignees(THREE, { canvas, camera, ppm, lire, regler, echelleLire, echelleRegler, avant, apres, os = [] }) {
  const scene = new THREE.Scene();
  const E = { outil: 'tourner', sel: null, survol: null, drag: null, J: null, actives: [], marqueurs: new Map(), cle: '', lecture: false, os: null };
  // ─── les os : des losanges allongés d'une articulation à l'autre, comme un squelette de logiciel de 3D (les poignées en deviennent lisibles : on voit ce qu'on plie) ───
  function creerOs() {
    const g = new THREE.BufferGeometry(), r = 0.2;      // la bague au cinquième de la longueur
    const P = [0, 0, 0, 1, 0, r, 0, 1, r, -1, 0, r, 0, -1, r, 0, 0, 1];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.map((v, i) => i % 3 === 2 ? v : v * 1), 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4]);
    const aretes = new THREE.EdgesGeometry(g, 1);
    return os.map(([a, b]) => {
      const grp = new THREE.Group(), vue = new THREE.Mesh(g, mat(0xe4dfd0, { opacity: 0.32, side: THREE.DoubleSide })), fil = new THREE.LineSegments(aretes, new THREE.LineBasicMaterial({ color: 0xe4dfd0, depthTest: false, transparent: true, opacity: 0.9 }));
      vue.renderOrder = 9; fil.renderOrder = 10; grp.add(vue, fil); grp.matrixAutoUpdate = false; scene.add(grp);
      return { a, b, grp };
    });
  }
  const ray = new THREE.Raycaster();
  const V3 = a => new THREE.Vector3(a[0], a[1], a[2]);
  const mat = (c, extra = {}) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, ...extra });
  const invisible = () => new THREE.MeshBasicMaterial({ visible: false });
  const dominante = a => { const m = Math.max(Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2])); return Math.abs(a[0]) === m ? 'x' : Math.abs(a[1]) === m ? 'y' : 'z'; };

  // ─── les marqueurs : un petit cube sur chaque articulation que l'outil peut régler ───
  function marqueur(id) {
    let m = E.marqueurs.get(id);
    if (!m) {
      const vue = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(COUL.point)); vue.renderOrder = 12;
      const prise = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), invisible());
      scene.add(vue, prise); m = { id, vue, prise }; E.marqueurs.set(id, m);
    }
    return m;
  }
  const concerne = j => E.outil === 'tourner' ? j.rots?.length : E.outil === 'deplacer' ? j.deplace?.length : false;

  // ─── les poignées actives (anneaux, flèches, cubes), refaites quand l'outil ou le choix changent ───
  function reconstruire() {
    for (const a of E.actives) { scene.remove(a.vue, a.prise); a.vue.traverse?.(o => { o.geometry?.dispose(); }); a.prise.geometry.dispose(); }
    E.actives = [];
    if (!E.J) return;
    const ajouter = a => { a.vue.traverse(o => { o.renderOrder = 11; }); scene.add(a.vue, a.prise); E.actives.push(a); };
    if (E.outil === 'tourner' && E.sel && E.J[E.sel]) {
      for (const r of E.J[E.sel].rots) {
        const c = r.champ.startsWith('conv') ? 'y' : 'x', pts = [];
        for (let i = 0; i < 48; i++) pts.push(Math.cos(i / 48 * Math.PI * 2), Math.sin(i / 48 * Math.PI * 2), 0);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        const vue = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: COUL[c], depthTest: false, transparent: true }));
        const prise = new THREE.Mesh(new THREE.TorusGeometry(1, PX.tube / PX.anneau, 6, 40), invisible());
        ajouter({ type: 'anneau', id: E.sel, rot: r, base: COUL[c], vue, prise });
      }
    } else if (E.outil === 'deplacer') {
      for (const [id, j] of Object.entries(E.J)) for (const d of j.deplace ?? []) ajouter(fleche('fleche', id, d, COUL[dominante(d.axe)], false));
    } else if (E.outil === 'echelle' && E.J.poitrine?.echelle) {
      for (const d of E.J.poitrine.echelle) ajouter(fleche('cube', 'poitrine', d, COUL[dominante(d.axe)], true));
    }
  }
  // une flèche (ou un tige à cube) le long de +z local ; la prise est un cylindre épais
  function fleche(type, id, d, couleur, cube) {
    const g = new THREE.Group();
    const l = new THREE.BufferGeometry(); l.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0.85], 3));
    g.add(new THREE.Line(l, new THREE.LineBasicMaterial({ color: couleur, depthTest: false, transparent: true })));
    const bout = cube ? new THREE.BoxGeometry(0.2, 0.2, 0.2).translate(0, 0, 0.9) : new THREE.ConeGeometry(0.1, 0.3, 8).rotateX(Math.PI / 2).translate(0, 0, 0.88);
    g.add(new THREE.Mesh(bout, mat(couleur)));
    const prise = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5), invisible());
    return { type, id, d, base: couleur, vue: g, prise };
  }
  const matrice = (obj, pos, axe, echelle) => {                 // l'objet : son z local sur `axe`, à `pos`, de taille `echelle`
    const z = V3(axe).normalize(), u = Math.abs(z.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(z).normalize() : new THREE.Vector3(1, 0, 0).cross(z).normalize(), v = z.clone().cross(u);
    obj.matrix.makeBasis(u, v, z).scale(new THREE.Vector3(echelle, echelle, echelle)).setPosition(V3(pos)); obj.matrixAutoUpdate = false; obj.matrixWorldNeedsUpdate = true;
  };

  // ─── chaque image : poser les poignées sur les articulations ───
  function maj(J, etat = {}) {
    E.J = J; E.lecture = !!etat.lecture;
    if (!E.os) E.os = creerOs();
    const cle = `${E.outil}|${E.sel}`;
    if (cle !== E.cle) { E.cle = cle; reconstruire(); }
    const px = 1 / ppm();
    // les os : dessinés pendant l'édition, cachés pendant la lecture (le soldat est alors plein et net)
    for (const o of E.os) {
      const A = J[o.a], B = J[o.b]; o.grp.visible = !E.lecture && !!A && !!B; if (!o.grp.visible) continue;
      const d = V3(B.pos).sub(V3(A.pos)), L = d.length(); if (L < 1e-4) { o.grp.visible = false; continue; }
      matrice(o.grp, A.pos, d.toArray(), 1); o.grp.matrix.scale(new THREE.Vector3(px * 6, px * 6, L)); o.grp.matrixWorldNeedsUpdate = true;
    }
    for (const [id, j] of Object.entries(J)) {
      const m = marqueur(id), ok = E.outil === 'echelle' ? false : concerne(j);
      m.vue.visible = ok; m.prise.visible = ok;
      m.vue.material.opacity = E.lecture ? 0.3 : 1;                 // en lecture : seulement suggérées
      m.vue.position.set(...j.pos); m.vue.scale.setScalar(px * PX.point * (E.lecture ? 1.2 : 2));
      m.prise.position.set(...j.pos); m.prise.scale.setScalar(px * PX.prise);
      m.vue.material.color.setHex(id === E.sel ? COUL.choisi : id === E.survol?.id && E.survol.type === 'marqueur' ? COUL.choisi : COUL.point);
    }
    for (const a of E.actives) {
      a.vue.visible = !E.lecture;
      const j = J[a.id], vif = E.survol?.a === a || E.drag?.a === a;
      if (a.type === 'anneau') {
        const { u, v, z } = base(a.rot.axe); a.vue.matrix.makeBasis(u, v, z).scale(new THREE.Vector3(px * PX.anneau, px * PX.anneau, px * PX.anneau)).setPosition(V3(j.pos)); a.vue.matrixAutoUpdate = false; a.vue.matrixWorldNeedsUpdate = true;
        a.prise.matrix.copy(a.vue.matrix); a.prise.matrixAutoUpdate = false; a.prise.matrixWorldNeedsUpdate = true;
        a.vue.material.color.setHex(vif ? COUL.choisi : a.base);
      } else {
        matrice(a.vue, j.pos, a.d.axe, px * PX.fleche); matrice(a.prise, j.pos, a.d.axe, px * PX.fleche);
        a.vue.children[1].material.color.setHex(vif ? COUL.choisi : a.base); a.vue.children[0].material.color.setHex(vif ? COUL.choisi : a.base);
      }
    }
  }
  // un repère (u, v, z) direct dont z est l'axe : u × v = z
  function base(axe) {
    const z = V3(axe).normalize(), t = Math.abs(z.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), u = t.clone().cross(z).normalize(), v = z.clone().cross(u);
    return { u, v, z };
  }

  // ─── la souris ───
  const rayon = e => { const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera); return ray; };
  function toucher(e) {
    rayon(e);
    scene.updateMatrixWorld(true);
    const ordre = [...(E.lecture ? [] : E.actives).map(a => ({ obj: a.prise, a })), ...[...E.marqueurs.values()].filter(m => m.prise.visible).map(m => ({ obj: m.prise, m }))];
    let meilleur = null;
    for (const o of ordre) {
      const hit = ray.intersectObject(o.obj, false)[0]; if (!hit) continue;
      const poids = hit.distance - (o.a ? 1000 : 0);        // une poignée de l'outil passe avant un marqueur
      if (!meilleur || poids < meilleur.poids) meilleur = { poids, ...o };
    }
    return meilleur ? (meilleur.a ? { type: 'poignee', a: meilleur.a } : { type: 'marqueur', id: meilleur.m.id }) : null;
  }
  // l'angle (main droite) du point visé autour de l'axe, dans le plan de l'anneau
  function angle(e, d) {
    const r = rayon(e).ray, n = d.z, den = r.direction.dot(n);
    if (Math.abs(den) < 0.08) return null;                  // l'anneau est vu par la tranche : pas de mesure sûre
    const t = d.centre.clone().sub(r.origin).dot(n) / den, q = r.origin.clone().addScaledVector(r.direction, t).sub(d.centre);
    return Math.atan2(q.dot(d.v), q.dot(d.u));
  }
  // la position du pointeur le long d'une droite (point p, direction unitaire a) : le point de la droite le plus proche du rayon
  function sur(e, p, a) {
    const r = rayon(e).ray, b = a.dot(r.direction), den = 1 - b * b;
    if (den < 1e-3) return null;
    const rr = p.clone().sub(r.origin);
    return (b * rr.dot(r.direction) - rr.dot(a)) / den;
  }
  function down(e) {
    const t = toucher(e);
    if (!t) return false;
    if (t.type === 'marqueur') { E.sel = t.id; return true; }
    const a = t.a, J = E.J[a.id], centre = V3(J.pos);
    avant?.();
    if (a.type === 'anneau') {
      const d = { ...base(a.rot.axe), centre }, phi = angle(e, d);
      E.drag = { a, d, v0: lire(a.rot.champ), phi0: phi ?? 0, dernier: phi ?? 0, cumul: 0 };
    } else {
      const axe = V3(a.d.axe).normalize(), t0 = sur(e, centre, axe);
      E.drag = { a, centre, axe, t0: t0 ?? 0, v0: a.type === 'cube' ? echelleLire(a.d.cle) : lire(a.d.champ) };
    }
    return true;
  }
  function move(e, shift) {
    if (!E.drag) { const t = toucher(e); E.survol = t ? (t.type === 'poignee' ? { type: 'poignee', a: t.a } : { type: 'marqueur', id: t.id }) : null; return !!t; }
    const D = E.drag, a = D.a;
    if (a.type === 'anneau') {
      const phi = angle(e, D.d); if (phi === null) return true;
      let dp = phi - D.dernier; if (dp > Math.PI) dp -= 2 * Math.PI; if (dp < -Math.PI) dp += 2 * Math.PI;
      D.cumul += dp; D.dernier = phi;
      let v = D.v0 + a.rot.signe * D.cumul;
      if (shift) v = Math.round(v / (Math.PI / 12)) * (Math.PI / 12);
      regler(a.rot.champ, v);
    } else {
      const t = sur(e, D.centre, D.axe); if (t === null) return true;
      if (a.type === 'cube') { const f = D.t0 > 1e-3 ? Math.max(0.4, Math.min(2, t / D.t0)) : 1; echelleRegler(a.d.cle, D.v0 * f); }
      else { let v = D.v0 + a.d.k * (t - D.t0); if (shift) v = Math.round(v / 0.05) * 0.05; regler(a.d.champ, v); }
    }
    return true;
  }
  function up() { if (E.drag) { E.drag = null; apres?.(); } }

  return {
    scene, maj, down, move, up,
    get outil() { return E.outil; }, set outil(o) { E.outil = o; E.drag = null; E.survol = null; },
    get sel() { return E.sel; }, set sel(s) { E.sel = s; },
    get actif() { return !!E.drag; }, get survol() { return E.survol; },
    nom: id => E.J?.[id]?.nom ?? '',
    rendre(renderer) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(scene, camera); renderer.autoClear = ac; },
    dispose() { for (const a of E.actives) { a.prise.geometry.dispose(); } },
  };
}
