// La végétation : les arbres (un tronc, quelques branches nues ; abattus, une souche), les buissons (deux ou trois boîtes basses ; arrachés, il
// n'en reste rien) et l'herbe (des touffes de cinq brins, seulement de près, qui ondulent au vent). Seulement ce qu'on voit est dessiné : tous,
// ils coûtaient des dizaines de milliers de triangles (CLAUDE.md, « Les arbres et les buissons dessinés partout »). Le dessin seulement.
import * as SH from './shaders.js?v=0.49.0';
import { creerGeometries } from './geometries.js?v=0.49.0';

// `THREE`, `scene`, `col`, `camera`, `vue`, `solY` (la hauteur moyenne du sol), `distance(zoom)`, `surface(x, z)` et `petit()` (aux zooms où un soldat n'est qu'un point)
// viennent de creerRendu ; `terrain()`, `vide()` et `ombres()` sont lus à chaque appel (le terrain change à chaque bataille). `ombres()` rend `{ ARBRES_OMBRES, aoPos, aoGeo, soleil }` :
// les arbres vus remplissent le tampon des ombres, qui reste à rendu3d.js avec le soleil (il passera ici avec lui).
export function creerVegetation({ THREE, scene, col, camera, vue, solY: SOL_Y, distance, surface, petit, terrain, vide, ombres }) {
  const { geometrieArbre, geometrieBuisson } = creerGeometries(THREE, col);
  // ─── Les arbres : un tronc, quelques branches nues ; abattus, une souche ───
  const arbresMesh = [];
  const arbreMat = new THREE.MeshBasicMaterial({ color: col('s'), side: THREE.DoubleSide });
  function preparerArbres() {
    const T = terrain();
    arbresMesh.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    arbresMesh.length = 0;
    for (const loin of [false, true]) for (const abattu of [0, 1]) for (let v = 0; v < 4; v++) {
      const m = new THREE.InstancedMesh(geometrieArbre(v, abattu, loin), arbreMat, Math.max(1, T.arbres.length));
      m.count = 0; m.frustumCulled = false; m.userData = { abattu, v, loin };
      arbresMesh.push(m); scene.add(m);
    }
  }
  // un objet posé en (x, z) tombe-t-il dans l'écran (avec une marge pour sa hauteur) ?
  const dansLaVue = (x, z, e, b) => {
    if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return false;
    const cxp = e[0] * x + e[4] * SOL_Y + e[8] * z + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * z + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * z + e[15];
    return cxp > -1.15 * cw && cxp < 1.15 * cw && cyp > -1.3 * cw && cyp < 1.3 * cw;
  };
  // les arbres et les buissons : seulement ceux qu'on voit (tous, ils coûtaient des dizaines de milliers de triangles)
  function majArbres(e, b) {
    const T = terrain(), { ARBRES_OMBRES, aoPos, aoGeo, soleil } = ombres();
    const m4 = new THREE.Matrix4();
    let o = 0;
    // de loin (le sol à plat, ou plus loin de la caméra que le point visé, de 30 %, et 160 m au moins), un arbre n'est qu'un tronc
    const cp = camera.position, lim = Math.max(160, distance(vue.zoom) * 1.3) ** 2;
    const loin = a => petit() || (a.i - cp.x) ** 2 + (SOL_Y - cp.y) ** 2 + (a.j - cp.z) ** 2 > lim;
    for (const m of arbresMesh) {
      let n = 0;
      for (const a of T.arbres) {
        if (a.abattu !== m.userData.abattu || a.v !== m.userData.v || loin(a) !== m.userData.loin || !dansLaVue(a.i + 0.5, a.j + 0.5, e, b)) continue;
        const y = surface(a.i + 0.5, a.j + 0.5);
        m4.makeTranslation(a.i + 0.5, y, a.j + 0.5);
        m.setMatrixAt(n++, m4);
        if (o < ARBRES_OMBRES && !m.userData.loin) { aoPos[o * 4] = a.i + 0.5; aoPos[o * 4 + 1] = y; aoPos[o * 4 + 2] = a.j + 0.5; aoPos[o * 4 + 3] = a.abattu ? 1.2 : 6 + a.v; o++; }
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    }
    const at = aoGeo.attributes.aPos; at.clearUpdateRanges(); at.addUpdateRange(0, o * 4); at.needsUpdate = true;
    aoGeo.instanceCount = soleil.lengthSq() > 0.01 && !petit() ? o : 0;     // (de loin, pas d'ombres d'arbres)
  }

  // ─── Les buissons : deux ou trois boîtes basses ; arrachés, il n'en reste rien ───
  // le dessus du feuillage plus clair (la glaise), les flancs sombres (la boue)
  const buissonsMesh = [];
  const buissonMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  function preparerBuissons() {
    const T = terrain();
    buissonsMesh.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    buissonsMesh.length = 0;
    for (let v = 0; v < 3; v++) {
      const m = new THREE.InstancedMesh(geometrieBuisson(v), buissonMat, Math.max(1, T.buissons.length));
      m.count = 0; m.frustumCulled = false; m.userData = { v };
      buissonsMesh.push(m); scene.add(m);
    }
  }
  function majBuissons(e, bornes) {
    const T = terrain();
    // de loin (le sol à plat), un buisson ne fait que deux pixels : on ne les dessine pas (tout le champ : ~25 000 triangles)
    if (petit()) { for (const m of buissonsMesh) m.count = 0; return; }
    const m4 = new THREE.Matrix4();
    for (const m of buissonsMesh) {
      let n = 0;
      for (const b of T.buissons) {
        if (b.detruit || b.v !== m.userData.v || !dansLaVue(b.i + 0.5, b.j + 0.5, e, bornes)) continue;
        m4.makeTranslation(b.i + 0.5, surface(b.i + 0.5, b.j + 0.5), b.j + 0.5);
        m.setMatrixAt(n++, m4);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    }
  }

  // ─── L'herbe : des touffes de cinq brins (seulement de près), qui ondulent au vent ;
  // une touffe disparaît quand l'herbe de sa case meurt (obus, boue) ───
  let touffes = null;                 // { x, z, c } : les touffes possibles (tirées une fois, l'aspect seulement)
  const TOUFFES_MAX = 6000;
  const tPos = new Float32Array(TOUFFES_MAX * 3);
  const herbeGeo = new THREE.InstancedBufferGeometry();
  {
    const p = [], h = [];
    for (const [x, l, ht] of [[-0.34, -0.2, 0.5], [-0.15, -0.06, 0.75], [0.02, 0.04, 0.9], [0.2, 0.12, 0.7], [0.36, 0.22, 0.45]]) {
      p.push(x - 0.07, 0, 0, x + 0.07, 0, 0, x + l, ht, 0); h.push(0, 0, 1);
    }
    herbeGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    herbeGeo.setAttribute('aHaut', new THREE.Float32BufferAttribute(h, 1));
    herbeGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
    herbeGeo.instanceCount = 0;
  }
  const herbeMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uBas: { value: col('g') }, uHaut: { value: col('h') } },
    vertexShader: SH.herbeMat.v,
    fragmentShader: SH.herbeMat.f,
    side: THREE.DoubleSide,
  });
  const herbeMesh = new THREE.Mesh(herbeGeo, herbeMat); herbeMesh.frustumCulled = false; herbeMesh.renderOrder = 1;
  scene.add(herbeMesh);
  function preparerHerbe() {
    const T = terrain();
    // une touffe pour ~10 m² d'herbe drue (moins pour l'herbe rare), placée par un hachage de la case
    const xs = [], zs = [], cs = [];
    for (let j = 0; j < T.H; j++) for (let i = 0; i < T.W; i++) {
      const c = j * T.W + i, d = T.herbe[c];
      if (!d) continue;
      const hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0;
      if ((hsh % 1000) / 1000 >= d * 0.035) continue;
      xs.push(i + ((hsh >>> 10) % 100) / 100); zs.push(j + ((hsh >>> 17) % 100) / 100); cs.push(c);
    }
    touffes = { x: Float32Array.from(xs), z: Float32Array.from(zs), c: Int32Array.from(cs) };
  }
  function majHerbe(x0, x1, z0, z1, e, masquee) {
    const T = terrain();
    if (masquee || !touffes) { herbeMesh.visible = false; vuesHerbe = 0; return; }
    if (!vide()) herbeMesh.visible = true;
    let k = 0;
    const { x: X, z: Z, c: Cc } = touffes;
    // (pas plus loin de la caméra que le point visé, de 25 % : au-delà, une touffe ne fait qu'un pixel ; au ras du sol,
    // sans cette limite, il y en avait 3 000 jusqu'à l'horizon)
    const cp = camera.position, lim = (distance(vue.zoom) * 1.25) ** 2;
    for (let n = 0; n < X.length && k < TOUFFES_MAX; n++) {
      const x = X[n], y = Z[n];
      if (x < x0 || x > x1 || y < z0 || y > z1 || !T.herbe[Cc[n]] || (x - cp.x) ** 2 + (SOL_Y - cp.y) ** 2 + (y - cp.z) ** 2 > lim) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.05 * cw || cxp > 1.05 * cw || cyp < -1.1 * cw || cyp > 1.1 * cw) continue;
      tPos[k * 3] = x; tPos[k * 3 + 1] = surface(x, y); tPos[k * 3 + 2] = y;
      k++;
    }
    const a = herbeGeo.attributes.aPos; a.clearUpdateRanges(); a.addUpdateRange(0, k * 3); a.needsUpdate = true;
    herbeGeo.instanceCount = k;
    vuesHerbe = k;
  }
  let vuesHerbe = 0;

  return {
    preparer() { preparerArbres(); preparerBuissons(); preparerHerbe(); },      // une bataille est branchée
    majArbres, majBuissons, majHerbe,
    setTemps(t) { herbeMat.uniforms.uT.value = t; },                              // le vent
    get vuesHerbe() { return vuesHerbe; },                                       // les touffes dessinées (pour les stats)
  };
}
