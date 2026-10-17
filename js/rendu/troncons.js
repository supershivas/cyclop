// Ce que l'état des tronçons montre sur le terrain : les fanions (à la couleur de celui qui tient le tronçon, déchirés quand l'autre
// camp y est entré), le clignotement d'un ordre et la surbrillance de la visée, les ouvrages des tranchées (traverses, sacs de terre,
// fil de fer, portes d'abri). Le dessin seulement : tout se lit de l'état, rien n'en est sauvegardé.
import { PALETTE } from '../palette.js?v=0.23.0';
import { ligneY } from '../tranchees.js?v=0.23.0';

// `THREE`, `scene`, `col` (une couleur de la palette), `surface(x, z)` (la hauteur du sol), `projeter()` (le centre de la vue et les pixels par mètre),
// `vue`, `zooms` viennent de creerRendu ; `bataille()`, `tAnim()` (le temps du dessin), `vide()` (rien n'est dessiné) et `survolTroncons()`
// (les tronçons que le survol allume) sont lus à chaque image, parce qu'ils changent. L'ordre d'ajout à la scène est celui d'avant la découpe.
export function creerTroncons({ THREE, scene, col, surface, projeter, vue, zooms, bataille, tAnim, vide, survolTroncons }) {
  // ─── Les fanions des tronçons (Jérôme, v0.9.2) : un fanion sur le parapet de chaque tronçon, à la couleur de celui qui
  // le tient. Déchiré quand l'autre camp y est entré ; quand le tronçon change de main, le nôtre descend, celui d'en
  // face monte. Rien n'est écrit : on lit la ligne, tronçon par tronçon, même de loin (un point de couleur). ───
  let fanP = null, fanF = null, fanEtat = [];
  const fanMat = new THREE.Matrix4(), fanQ = new THREE.Quaternion(), fanE = new THREE.Euler(), fanS = new THREE.Vector3(), fanV = new THREE.Vector3();
  const fanCol = { 0: new THREE.Color(PALETTE.n), 1: new THREE.Color(PALETTE.x) };
  function preparerFanions() {
    const B = bataille();
    for (const m of [fanP, fanF]) if (m) { scene.remove(m); m.dispose(); }
    fanP = fanF = null; fanEtat = [];
    const n = B.troncons?.length || 0;
    if (!n) return;
    const plan = new THREE.PlaneGeometry(1, 1);          // deux triangles : 128 fanions ne doivent presque rien coûter (des boîtes : +3 000 triangles, +10 ms tout dézoomé)
    fanP = new THREE.InstancedMesh(plan, new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.t), side: THREE.DoubleSide }), n);
    fanF = new THREE.InstancedMesh(plan, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), n);
    for (const m of [fanP, fanF]) { m.frustumCulled = false; m.renderOrder = 2; scene.add(m); }
    B.troncons.forEach((tr, k) => {
      const L = B.lignes[tr.ligne], x = (tr.x0 + tr.x1) / 2, z = ligneY(L, x) + L.face * 1.2;
      fanEtat.push({ x, z, tient: B.etat.troncons[k], ancien: B.etat.troncons[k], t: 99 });   // t : depuis combien de temps il a changé de main
    });
  }
  // ─── Un ordre validé (Jérôme, v0.14.0) : les tronçons visés clignotent quelques secondes, trois traits fins le long de
  // la tranchée (au parapet, au milieu, au parados), os sur le sol, sans rien changer à la partie. ───
  const CLIGN_MAX = 3000, clX = new Float32Array(CLIGN_MAX * 3), clignotes = [];
  const clGeo = new THREE.BufferGeometry();
  clGeo.setAttribute('position', new THREE.BufferAttribute(clX, 3).setUsage(THREE.DynamicDrawUsage));
  clGeo.setDrawRange(0, 0);
  const clMat = new THREE.LineBasicMaterial({ color: col('o'), depthTest: false, depthWrite: false });
  const clignotants = new THREE.LineSegments(clGeo, clMat); clignotants.frustumCulled = false; clignotants.renderOrder = 7; scene.add(clignotants);
  function clignoter(troncons, duree = 3) { clignotes.push({ troncons: [...troncons], duree, t: duree }); while (clignotes.length > 6) clignotes.shift(); }
  // La surbrillance (v0.21.0) : ce que l'ordre en cours de visée occuperait, au curseur : les tronçons, ou l'emprise des régiments en terrain libre
  // (les mêmes traits que le clignotement, sans clignoter) ; { troncons: [], rects: [{ x, y, l, p }] }
  let surbrillance = { troncons: [], rects: [] };
  function majClignotants(dt) {
    const B = bataille();
    let v = 0;
    const troncon = t => {
      const tr = B.troncons[t], L = B.lignes[tr?.ligne];
      if (!L) return;
      for (const dz of [-1.4, 0, 1.4]) for (let x = tr.x0; x < tr.x1 && v + 2 <= CLIGN_MAX; x += 1.5) {
        for (const xx of [x, Math.min(tr.x1, x + 1.5)]) { const z = ligneY(L, xx) + dz; clX[v * 3] = xx; clX[v * 3 + 1] = surface(xx, z) + 0.15; clX[v * 3 + 2] = z; v++; }
      }
    };
    const seg = (xa, za, xb, zb) => {
      const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, zb - za) / 2));
      for (let k = 0; k < n && v + 2 <= CLIGN_MAX; k++) for (const t of [k / n, (k + 1) / n]) { const xx = xa + (xb - xa) * t, zz = za + (zb - za) * t; clX[v * 3] = xx; clX[v * 3 + 1] = surface(xx, zz) + 0.15; clX[v * 3 + 2] = zz; v++; }
    };
    for (let k = clignotes.length - 1; k >= 0; k--) {
      const f = clignotes[k];
      if ((f.t -= dt) <= 0) { clignotes.splice(k, 1); continue; }
      if (Math.floor((f.duree - f.t) * 4) % 2) continue;                       // quatre fois par seconde : allumé, éteint
      for (const t of f.troncons) troncon(t);
    }
    for (const t of surbrillance.troncons) troncon(t);
    for (const t of survolTroncons()) troncon(t);
    for (const r of surbrillance.rects) { const x0 = r.x - r.l / 2, x1 = r.x + r.l / 2, z0 = r.y - r.p / 2, z1 = r.y + r.p / 2; seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0); }
    clGeo.attributes.position.needsUpdate = true; clGeo.setDrawRange(0, v);
  }

  // ─── Les ouvrages des tranchées (Jérôme, v0.18.0) : des traverses en travers de la tranchée, des sacs de terre sur le parapet (à l'envers
  // quand le tronçon est pris : le parapet devient le parados), du fil de fer devant les premières lignes (coupé là où l'autre camp
  // est entré ou a pris), l'entrée des abris dans la paroi arrière (une porte par niveau). Le dessin seulement : rien n'en est sauvegardé,
  // tout se lit de l'état ; refait deux fois par seconde, et seulement ce qu'on voit, à partir de 3 pixels par mètre. ───
  const OUV_BOITES = 2400, ouvPos = new Float32Array(OUV_BOITES * 30 * 3), ouvCol = new Float32Array(OUV_BOITES * 30 * 3);
  const ouvGeo = new THREE.BufferGeometry();
  ouvGeo.setAttribute('position', new THREE.BufferAttribute(ouvPos, 3).setUsage(THREE.DynamicDrawUsage));
  ouvGeo.setAttribute('color', new THREE.BufferAttribute(ouvCol, 3).setUsage(THREE.DynamicDrawUsage));
  ouvGeo.setDrawRange(0, 0);
  const ouvMesh = new THREE.Mesh(ouvGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); ouvMesh.frustumCulled = false; ouvMesh.renderOrder = 1; scene.add(ouvMesh);
  const FIL_MAX = 5000, filPos = new Float32Array(FIL_MAX * 3), filGeo = new THREE.BufferGeometry();
  filGeo.setAttribute('position', new THREE.BufferAttribute(filPos, 3).setUsage(THREE.DynamicDrawUsage));
  filGeo.setDrawRange(0, 0);
  const filLignes = new THREE.LineSegments(filGeo, new THREE.LineBasicMaterial({ color: col('r') })); filLignes.frustumCulled = false; filLignes.renderOrder = 1; scene.add(filLignes);
  const cSacH = col('g'), cSacB = col('b'), cTravH = col('g'), cTravB = col('s'), cPorteH = col('g'), cPorteB = col('t');
  let ouvT = 0;
  function majOuvrages(dt) {
    const B = bataille();
    ouvT -= dt;
    const { cx, cz, p } = projeter();
    const voir = !!B && B.etat.tranchees && p >= 3;
    ouvMesh.visible = filLignes.visible = voir;
    if (!voir || ouvT > 0) return;
    ouvT = 0.5;
    const e = Math.hypot(vue.vw, vue.vh) / p + 30, et = B.etat;
    let nv = 0, nf = 0;
    const sommet = (x, y, z, c) => { ouvPos[nv * 3] = x; ouvPos[nv * 3 + 1] = y; ouvPos[nv * 3 + 2] = z; ouvCol[nv * 3] = c.r; ouvCol[nv * 3 + 1] = c.g; ouvCol[nv * 3 + 2] = c.b; nv++; };
    const quad = (a, b, c, d, k) => { sommet(...a, k); sommet(...b, k); sommet(...c, k); sommet(...a, k); sommet(...c, k); sommet(...d, k); };
    const boite = (x0, x1, y0, y1, z0, z1, haut, flanc) => {
      if (nv + 30 > OUV_BOITES * 30) return;
      quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], haut);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], flanc);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], flanc);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], flanc);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], flanc);
    };
    const trait = (x0, y0, z0, x1, y1, z1) => { if (nf + 2 > FIL_MAX) return; filPos.set([x0, y0, z0, x1, y1, z1], nf * 3); nf += 2; };
    B.troncons.forEach((tr, t) => {
      const L = B.lignes[tr.ligne], xm = (tr.x0 + tr.x1) / 2, zc = ligneY(L, xm);
      if (Math.abs(xm - cx) > e || Math.abs(zc - cz) > e) return;
      const pris = et.troncons[t] !== L.camp, f = L.face;
      // les traverses : deux par tronçon, en travers de la tranchée
      for (const x of [tr.x0 + 6, tr.x0 + 18]) { const z = ligneY(L, x), h = surface(x, z); boite(x - 0.25, x + 0.25, h, h + 1.2, z - 1.5, z + 1.5, cTravH, cTravB); }
      // les sacs de terre : sur le parapet, du côté de l'ennemi ; à l'envers quand le tronçon est pris
      const cote = (pris ? -1 : 1) * f * (L.amp + 2.1);
      for (let x = tr.x0; x < tr.x1; x += 2.5) { const xx = x + 1.2, z = ligneY(L, xx) + cote, h = surface(xx, z); boite(x, x + 2.3, h, h + 0.35, z - 0.25, z + 0.25, cSacH, cSacB); }
      // le fil de fer : devant les premières lignes ; coupé, il ne reste que des bouts, à terre
      if (L.rang === 0) {
        const coupe = pris || B.disputes[t], dz = f * (L.amp + 7);
        for (let x = tr.x0, n = 0; x < tr.x1; x += 1.5, n++) {
          if (coupe && n % 5 > 1) continue;
          const xa = x, xb = Math.min(tr.x1, x + 1.5), za = ligneY(L, xa) + dz, zb = ligneY(L, xb) + dz, ha = surface(xa, za), hb = surface(xb, zb), k = coupe ? 0.3 : 1;
          trait(xa, ha + 0.45 * k, za, xb, hb + 0.45 * k, zb); trait(xa, ha + 0.9 * k, za, xb, hb + 0.9 * k, zb);
          if (n % 3 === 0 && !coupe) trait(xa, ha, za, xa, ha + 1, za);          // un piquet
        }
      }
      // les abris : une porte dans la paroi arrière par niveau creusé
      const niveau = et.abris[t] || 0;
      for (let d = 0; d < niveau; d++) { const x = xm - (niveau - 1) * 2 + d * 4, z = ligneY(L, x) - f * (L.amp + 1.4), h = surface(x, ligneY(L, x)); boite(x - 0.7, x + 0.7, h, h + 1.3, z - 0.2, z + 0.2, cPorteH, cPorteB); }
    });
    ouvGeo.attributes.position.needsUpdate = true; ouvGeo.attributes.color.needsUpdate = true; ouvGeo.setDrawRange(0, nv);
    filGeo.attributes.position.needsUpdate = true; filGeo.setDrawRange(0, nf);
  }

  function majFanions(dt) {
    const B = bataille();
    if (!fanP) return;
    const p = zooms[vue.zoom];
    for (let k = 0; k < fanEtat.length; k++) {
      const f = fanEtat[k], tient = B.etat.troncons[k];
      if (tient !== f.tient) { f.ancien = f.tient; f.tient = tient; f.t = 0; }
      f.t += dt;
      const dechire = B.disputes[k] === 1 && f.t > 3;
      // monté : 0 (en bas) à 1 (en haut) ; le changement de main : l'ancien descend en 1,2 s, le nouveau monte en 2,5 s
      let monte = 1, camp = f.tient;
      if (f.t < 1.2) { camp = f.ancien; monte = 1 - f.t / 1.2; } else if (f.t < 3.7) monte = (f.t - 1.2) / 2.5;
      const y0 = surface(f.x, f.z);
      const gros = Math.max(1, 3 / Math.max(p, 1));              // de loin, un fanion doit encore faire un pixel
      // la hampe (3 m) et le drapeau (1,3 × 0,8 m), qui flotte un peu
      fanS.set(0.12 * gros, 3, 1); fanV.set(f.x, y0 + 1.5, f.z);
      fanMat.compose(fanV, fanQ.identity(), fanS); fanP.setMatrixAt(k, fanMat);
      const vent = Math.sin(tAnim() * 4 + k) * 0.08, w = (dechire ? 0.6 : 1.3) * gros, h = (dechire ? 0.5 : 0.8) * gros;
      fanE.set(0, 0, dechire ? -0.35 : vent); fanQ.setFromEuler(fanE);
      fanS.set(w, h, 1); fanV.set(f.x + w / 2, y0 + 0.4 + 2.5 * monte - (dechire ? 0.2 : 0), f.z);
      fanMat.compose(fanV, fanQ, fanS); fanF.setMatrixAt(k, fanMat);
      fanF.setColorAt(k, fanCol[camp]);
    }
    fanP.instanceMatrix.needsUpdate = fanF.instanceMatrix.needsUpdate = true;
    if (fanF.instanceColor) fanF.instanceColor.needsUpdate = true;
    fanP.visible = fanF.visible = !vide();
  }

  return {
    preparer: preparerFanions,                                   // une bataille est branchée : un fanion par tronçon
    maj(dt) { majFanions(dt); majClignotants(dt); majOuvrages(dt); },
    clignoter,                                                   // un ordre validé : les tronçons visés clignotent
    surligner(s) { surbrillance = s || { troncons: [], rects: [] }; },   // ce que l'ordre en cours de visée occuperait
  };
}
