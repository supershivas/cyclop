// La végétation : les arbres (un tronc, quelques branches nues ; abattus, une souche), les buissons (deux ou trois boîtes basses ; arrachés, il
// n'en reste rien) et l'herbe (des touffes de cinq brins, seulement de près, qui ondulent au vent). Seulement ce qu'on voit est dessiné : tous,
// ils coûtaient des dizaines de milliers de triangles (docs/domaines/rendu.md, « Les arbres et les buissons dessinés partout »). Le dessin seulement.
import * as SH from './shaders.js?v=0.67.2';
import { creerGeometries } from './geometries.js?v=0.67.2';
import { hash2 } from '../lib/rng.js?v=0.67.2';
import { BUISSONS_FORMES, BUISSONS_SAISONS, BUISSONS_TIRAGES } from '../data/buissons.js?v=0.67.2';
import { ARBRES_FAMILLES, ARBRES_TIRAGES, ARBRES_ECHELLE, ARBRES_AUTOMNE, ARBRES_PPM_FEUILLES, ARBRES_FEUILLES } from '../data/arbres.js?v=0.67.2';

// `THREE`, `scene`, `col`, `camera`, `vue`, `solY` (la hauteur moyenne du sol), `distance(zoom)`, `surface(x, z)` et `petit()` (aux zooms où un soldat n'est qu'un point)
// viennent de creerRendu ; `terrain()`, `vide()` et `ombres()` sont lus à chaque appel (le terrain change à chaque bataille). `ombres()` rend `{ ARBRES_OMBRES, aoPos, aoGeo, soleil }` :
// les arbres vus remplissent le tampon des ombres, qui reste à rendu3d.js avec le soleil (il passera ici avec lui).
export function creerVegetation({ THREE, scene, col, camera, vue, solY: SOL_Y, distance, surface, petit, terrain, vide, ombres, ppm, saison, arbres: optsArbres = null, buissons: optsBuissons = null }) {
  const { geometrieArbre, geometrieBuisson, geometrieBuissonVarie, geometrieTroncs, geometrieTroncLoin, geometrieFeuilles, geometrieAbattuLong } = creerGeometries(THREE, col);
  // `arbres` : null, les arbres d'avant (un tronc, quatre branches) ; sinon (labo « Des arbres plus variés ») `{ formes, feuilles, chute, abattus }` : des familles de formes, des feuilles
  // selon la saison (`saison()` rend l'horloge de la bataille ou null), la chute des feuilles au fil des jours, les abattus longs. `ppm()` : les pixels par mètre du zoom.
  let opts = optsArbres, forcee = null, trisArbres = 0, msArbres = 0;
  // ─── Les arbres : un tronc, quelques branches nues ; abattus, une souche ───
  const arbresMesh = [];
  const arbreMat = new THREE.MeshBasicMaterial({ color: col('s'), side: THREE.DoubleSide });
  function preparerArbres() {
    const T = terrain();
    arbresMesh.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    arbresMesh.length = 0;
    if (opts) { preparerArbresVaries(T); return; }
    for (const loin of [false, true]) for (const abattu of [0, 1]) for (let v = 0; v < 4; v++) {
      const m = new THREE.InstancedMesh(geometrieArbre(v, abattu, loin), arbreMat, Math.max(1, T.arbres.length));
      m.count = 0; m.frustumCulled = false; m.userData = { abattu, v, loin, tri: m.geometry.attributes.position.count / 3 };
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
    const t0 = performance.now();
    if (opts) majArbresVaries(e, b); else majArbresActuels(e, b);
    msArbres += (performance.now() - t0 - msArbres) * 0.05;
  }
  function majArbresActuels(e, b) {
    const T = terrain(), { ARBRES_OMBRES, aoPos, aoGeo, soleil } = ombres();
    const m4 = new THREE.Matrix4();
    let o = 0;
    trisArbres = 0;
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
      trisArbres += n * m.userData.tri;
    }
    const at = aoGeo.attributes.aPos; at.clearUpdateRanges(); at.addUpdateRange(0, o * 4); at.needsUpdate = true;
    aoGeo.instanceCount = soleil.lengthSq() > 0.01 && !petit() ? o : 0;     // (de loin, pas d'ombres d'arbres)
  }

  // ─── Les arbres variés (labo « Des arbres plus variés », v0.52.6) ───
  // Un maillage de tronc par famille (et un tronc de loin, deux abattus), des maillages de feuilles par (famille, dégarni) refaits quand la saison change.
  // Famille, taille, sens et chute de chaque arbre : le hachage de sa position, tiré une fois par bataille (`infos`, parallèle à `T.arbres` : on n'écrit rien dans le terrain).
  let couronnes = [], couronneMode = null, couronneCoul = [];       // un maillage par teinte (6 au plus) : pas de couleur par instance, qui restait blanche sur certaines cartes graphiques
  let infos = [], troncs = [], feuilles = [], loinMesh = null, abattuMesh = [null, null], modeVu = null;
  const tire = (a, graine) => hash2(a.i, a.j, graine);
  function preparerArbresVaries(T) {
    const poids = ARBRES_FAMILLES.reduce((s, f) => s + f.poids, 0), cap = Math.max(1, T.arbres.length);
    const [h0, h1] = ARBRES_ECHELLE.hauteur, [w0, w1] = ARBRES_ECHELLE.largeur;
    infos = T.arbres.map(a => {
      let r = tire(a, ARBRES_TIRAGES.famille) * poids, fam = 0;
      while (fam < ARBRES_FAMILLES.length - 1 && r >= ARBRES_FAMILLES[fam].poids) r -= ARBRES_FAMILLES[fam++].poids;
      const F = ARBRES_FAMILLES[fam], t = tire(a, ARBRES_TIRAGES.taille), hr = (F.h + a.v * F.dh) / F.h * (h0 + (h1 - h0) * t);
      const sxz = (w0 + (w1 - w0) * tire(a, ARBRES_TIRAGES.taille + 100)) * (1 + (hr - 1) * 0.5), yaw = tire(a, ARBRES_TIRAGES.sens) * Math.PI * 2;
      return { fam, sx: sxz, sy: hr, H: F.h * hr, c: Math.cos(yaw), s: Math.sin(yaw), d: tire(a, ARBRES_TIRAGES.feuilles), t: tire(a, ARBRES_TIRAGES.chute) };
    });
    feuilleMat ??= new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const ajouter = (geo, userData) => {
      const m = new THREE.InstancedMesh(geo, userData.couronne ? new THREE.MeshBasicMaterial() : userData.feuilles ? feuilleMat : arbreMat, cap);
      m.count = 0; m.frustumCulled = false; m.userData = { ...userData, tri: geo.attributes.position.count / 3 };
      arbresMesh.push(m); scene.add(m); return m;
    };
    troncs = ARBRES_FAMILLES.map(F => ajouter(geometrieTroncs(F.id), {}));
    loinMesh = ajouter(geometrieTroncLoin(), {});
    // la couronne de loin (ou en dessous de 4 pixels par mètre) : un seul cube par arbre, à la couleur de la saison (Jérôme, v0.59.3 : les feuilles se voient à tous les zooms)
    const cube = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0).toNonIndexed();
    couronnes = Array.from({ length: 6 }, () => ajouter(cube, { couronne: true }));
    couronneMode = null;
    abattuMesh = [0, 1].map(() => ajouter(opts.abattus === 'longs' ? geometrieAbattuLong() : geometrieArbre(0, 1), {}));
    // (créés au premier besoin : un objet de plus dans la scène tire des identifiants avec `Math.random`, voir « Piège » plus haut)
    feuilles = ARBRES_FAMILLES.map(() => [null, null]);
    modeVu = null;
  }
  // les feuilles de la saison : la saison de la bataille (été, automne, hiver nu, hiver sous la neige), ou celle qu'on force (le printemps du labo)
  function modeFeuilles() {
    if (forcee) return forcee;
    if (!opts.feuilles) return 'nu';
    const h = saison?.();
    if (!h) return 'automne';
    return h.enneige ? 'neige' : h.saison === 'hiver' ? 'nu' : h.saison === 'ete' ? 'ete' : 'automne';
  }
  function refaireFeuilles(mode) {
    modeVu = mode;
    ARBRES_FAMILLES.forEach((F, f) => [0, 1].forEach(d => {
      const g = mode === 'nu' ? null : geometrieFeuilles(F.id, mode, d);
      let m = feuilles[f][d];
      if (!g) { if (m) m.userData.vide = true; return; }
      if (!m) {
        m = new THREE.InstancedMesh(g, feuilleMat, Math.max(1, terrain().arbres.length));
        m.count = 0; m.frustumCulled = false; m.userData = { feuilles: true };
        feuilles[f][d] = m; arbresMesh.push(m); scene.add(m);
      } else { m.geometry.dispose(); m.geometry = g; }
      m.userData.vide = false; m.userData.tri = g.attributes.position.count / 3;
    }));
  }
  // 0 : touffu, 1 : dégarni, 2 : nu. En automne, un arbre sur trois est dégarni ; avec la chute (labo), la part de nus et de dégarnis grandit de jour en jour.
  function etatFeuilles(inf, mode, h) {
    if (mode === 'printemps') return inf.d < 0.5 ? 1 : 0;
    if (mode !== 'automne') return 0;
    if (opts.chute && h) { const p = h.jours > 1 ? (h.jour - 1) / (h.jours - 1) : 0; return inf.t < p ? 2 : inf.t < p + ARBRES_AUTOMNE.margeChute ? 1 : 0; }
    return inf.d < ARBRES_AUTOMNE.degarni ? 1 : 0;
  }
  let feuilleMat = null;                  // (au premier besoin : un objet de plus dans la scène change l'empreinte)
  const m4v = new THREE.Matrix4();
  function majArbresVaries(e, b) {
    const T = terrain(), { ARBRES_OMBRES, aoPos, aoGeo, soleil } = ombres();
    if (!infos.length && T.arbres.length) return;
    const mode = modeFeuilles(), pm = ppm(), feuillu = pm >= ARBRES_PPM_FEUILLES && mode !== 'nu';
    if (feuillu && mode !== modeVu) refaireFeuilles(mode);
    const h = saison?.() || null;
    if (mode !== 'nu' && mode !== couronneMode) { couronneCoul = (ARBRES_FEUILLES[mode]?.dessus ?? []).map(c => c[0] === '#' ? new THREE.Color(c) : col(c)); couronneMode = mode; couronnes.forEach((m, i) => m.material.color.copy(couronneCoul[i % couronneCoul.length] ?? col('o'))); }
    for (const m of arbresMesh) m.userData.n = 0;
    const cp = camera.position, lim = Math.max(160, distance(vue.zoom) * 1.3) ** 2, pose = petit();
    let o = 0;
    const couronne = (k, x, y, z, inf) => {
      if (mode === 'nu' || !couronneCoul.length) return;
      const d = etatFeuilles(inf, mode, h); if (d >= 2) return;
      const w = inf.sx * 4.2 * (d ? 0.7 : 1), m = couronnes[(k % couronneCoul.length) % couronnes.length];
      m4v.set(w, 0, 0, x, 0, inf.H * 0.45, 0, y + inf.H * 0.55, 0, 0, w, z, 0, 0, 0, 1);
      m.setMatrixAt(m.userData.n++, m4v);
    };
    const mettre = (m, x, y, z, inf) => {
      m4v.set(inf.c * inf.sx, 0, inf.s * inf.sx, x, 0, inf.sy, 0, y, -inf.s * inf.sx, 0, inf.c * inf.sx, z, 0, 0, 0, 1);
      m.setMatrixAt(m.userData.n++, m4v);
    };
    for (let k = 0; k < T.arbres.length; k++) {
      const a = T.arbres[k], inf = infos[k];
      if (!dansLaVue(a.i + 0.5, a.j + 0.5, e, b)) continue;
      const loin = (a.i - cp.x) ** 2 + (SOL_Y - cp.y) ** 2 + (a.j - cp.z) ** 2 > lim;       // (le détail à tous les zooms : seuls les arbres au-delà de la portée n'ont qu'un cube)
      const x = a.i + 0.5, z = a.j + 0.5, y = surface(x, z);
      if (a.abattu) mettre(abattuMesh[loin ? 1 : 0], x, y, z, { ...inf, sx: 0.85 + inf.d * 0.3, sy: 0.85 + inf.d * 0.3 });
      else if (loin) { m4v.set(inf.sx, 0, 0, x, 0, inf.H, 0, y, 0, 0, inf.sx, z, 0, 0, 0, 1); loinMesh.setMatrixAt(loinMesh.userData.n++, m4v); couronne(k, x, y, z, inf); }
      else {
        mettre(troncs[inf.fam], x, y, z, inf);
        if (!feuillu) couronne(k, x, y, z, inf);
        if (feuillu) { const d = etatFeuilles(inf, mode, h), m = d < 2 ? feuilles[inf.fam][d] : null; if (m && !m.userData.vide) mettre(m, x, y, z, inf); }
      }
      if (o < ARBRES_OMBRES && !loin) { aoPos[o * 4] = x; aoPos[o * 4 + 1] = y; aoPos[o * 4 + 2] = z; aoPos[o * 4 + 3] = a.abattu ? 1.2 : inf.H; o++; }
    }
    trisArbres = 0;
    for (const m of arbresMesh) { m.count = m.userData.n; m.instanceMatrix.needsUpdate = true; trisArbres += m.count * m.userData.tri; }
    const at = aoGeo.attributes.aPos; at.clearUpdateRanges(); at.addUpdateRange(0, o * 4); at.needsUpdate = true;
    aoGeo.instanceCount = soleil.lengthSq() > 0.01 && !pose ? o : 0;
  }

  // ─── Les buissons : deux ou trois boîtes basses ; arrachés, il n'en reste rien ───
  // le dessus du feuillage plus clair (la glaise), les flancs sombres (la boue)
  const buissonsMesh = [];
  const buissonMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // Les buissons variés (`optsBuissons` ; null : ceux d'avant) : une forme par buisson (le hachage de sa position), un maillage par forme, refait quand la saison change ; la taille suit son `v`
  let optsB = optsBuissons, infosB = [], modeB = null, teintesB = 0;
  function preparerBuissons() {
    const T = terrain();
    buissonsMesh.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    buissonsMesh.length = 0; modeB = null;
    if (optsB) {
      const poids = BUISSONS_FORMES.reduce((a, F) => a + F.poids, 0);
      infosB = T.buissons.map(b => {
        let r = hash2(b.i, b.j, BUISSONS_TIRAGES.forme) * poids, f = 0;
        while (f < BUISSONS_FORMES.length - 1 && r >= BUISSONS_FORMES[f].poids) r -= BUISSONS_FORMES[f++].poids;
        return { f, rot: Math.floor(hash2(b.i, b.j, BUISSONS_TIRAGES.rotation) * 4), t: hash2(b.i, b.j, BUISSONS_TIRAGES.taille) };
      });
      BUISSONS_FORMES.forEach((F, f) => {
        const m = new THREE.InstancedMesh(new THREE.BufferGeometry(), buissonMat, Math.max(1, T.buissons.length));
        m.count = 0; m.frustumCulled = false; m.userData = { f }; buissonsMesh.push(m); scene.add(m);
      });
      return;
    }
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
    if (optsB) {
      const h = saison?.(), mode = forcee || (!h ? 'automne' : h.enneige ? 'neige' : h.saison === 'hiver' ? 'nu' : h.saison === 'ete' ? 'ete' : 'automne'), P = BUISSONS_SAISONS[mode] ?? BUISSONS_SAISONS.nu;
      if (mode !== modeB) {            // la saison a changé : les formes se refont dans ses couleurs
        modeB = mode; teintesB = P.dessus.length;
        for (const m of buissonsMesh) { m.geometry.dispose(); m.geometry = geometrieBuissonVarie(BUISSONS_FORMES[m.userData.f], P, 0); }
      }
      for (const m of buissonsMesh) m.count = 0;
      for (let k = 0; k < T.buissons.length; k++) {
        const b = T.buissons[k], inf = infosB[k];
        if (b.detruit || !dansLaVue(b.i + 0.5, b.j + 0.5, e, bornes)) continue;
        const m = buissonsMesh[inf.f], s = (0.85 + 0.2 * b.v) * (0.9 + 0.2 * inf.t), c = [1, 0, -1, 0][inf.rot], sn = [0, 1, 0, -1][inf.rot];
        m4.set(c * s, 0, sn * s, b.i + 0.5, 0, s, 0, surface(b.i + 0.5, b.j + 0.5), -sn * s, 0, c * s, b.j + 0.5, 0, 0, 0, 1);
        m.setMatrixAt(m.count++, m4);
      }
      for (const m of buissonsMesh) m.instanceMatrix.needsUpdate = true;
      return;
    }
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

  // ─── Les roseaux des marécages (v0.51.0) : de hautes touffes (1,3 à 2,2 m) de brins serrés, aux pointes plus claires, qui ondulent plus que l'herbe ; seulement de près et dans l'écran ───
  let roseaux = null;                  // { x, z, c } : une touffe par case de roseaux (`T.roseaux`), tirée une fois
  const ROSEAUX_MAX = 3000;
  const rPos = new Float32Array(ROSEAUX_MAX * 3);
  // le maillage n'est créé qu'au premier marécage vu : un objet de plus dans la scène tire des identifiants avec `Math.random` (three.js), et l'ordre de ces tirages fait l'empreinte du dessin (CLAUDE.md)
  let roseauGeo = null, roseauMat = null, roseauMesh = null;
  function creerRoseaux() {
    roseauGeo = new THREE.InstancedBufferGeometry();
    const p = [], h = [];
    for (const [x, l, ht] of [[-0.4, -0.15, 1.5], [-0.26, 0.1, 1.9], [-0.12, -0.08, 2.2], [0.02, 0.12, 1.7], [0.14, -0.1, 2.0], [0.27, 0.1, 1.4], [0.4, 0.16, 1.8]]) {
      p.push(x - 0.05, 0, 0, x + 0.05, 0, 0, x + l, ht, 0); h.push(0, 0, 1);
    }
    roseauGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    roseauGeo.setAttribute('aHaut', new THREE.Float32BufferAttribute(h, 1));
    roseauGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(rPos, 3).setUsage(THREE.DynamicDrawUsage));
    roseauGeo.instanceCount = 0;
    roseauMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uBas: { value: col('w') }, uHaut: { value: col('h') } },
      vertexShader: SH.herbeMat.v, fragmentShader: SH.herbeMat.f, side: THREE.DoubleSide,
    });
    roseauMesh = new THREE.Mesh(roseauGeo, roseauMat); roseauMesh.frustumCulled = false; roseauMesh.renderOrder = 1;
    scene.add(roseauMesh);
  }
  function preparerRoseaux() {
    const T = terrain(), xs = [], zs = [], cs = [];
    for (const c of T.roseaux || []) {
      const i = c % T.W, j = (c / T.W) | 0, hsh = ((i * 2246822519) ^ (j * 3266489917)) >>> 0;
      xs.push(i + ((hsh >>> 8) % 100) / 100); zs.push(j + ((hsh >>> 16) % 100) / 100); cs.push(c);
    }
    roseaux = { x: Float32Array.from(xs), z: Float32Array.from(zs), c: Int32Array.from(cs) };
  }
  function majRoseaux(x0, x1, z0, z1, e, masquee) {
    const T = terrain();
    if (masquee || !roseaux || !roseaux.x.length) { if (roseauMesh) roseauMesh.visible = false; return; }
    if (!roseauMesh) creerRoseaux();
    if (!vide()) roseauMesh.visible = true;
    let k = 0;
    const { x: X, z: Z, c: Cc } = roseaux, cp = camera.position, lim = (distance(vue.zoom) * 1.4) ** 2;
    for (let n = 0; n < X.length && k < ROSEAUX_MAX; n++) {
      const x = X[n], y = Z[n];
      if (x < x0 || x > x1 || y < z0 || y > z1 || T.diff[Cc[n]] < -1 || T.profond[Cc[n]] || (x - cp.x) ** 2 + (SOL_Y - cp.y) ** 2 + (y - cp.z) ** 2 > lim) continue;      // (un cratère profond les arrache)
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.05 * cw || cxp > 1.05 * cw || cyp < -1.2 * cw || cyp > 1.1 * cw) continue;
      rPos[k * 3] = x; rPos[k * 3 + 1] = surface(x, y); rPos[k * 3 + 2] = y;
      k++;
    }
    const a = roseauGeo.attributes.aPos; a.clearUpdateRanges(); a.addUpdateRange(0, k * 3); a.needsUpdate = true;
    roseauGeo.instanceCount = k;
  }

  return {
    preparer() { preparerArbres(); preparerBuissons(); preparerHerbe(); preparerRoseaux(); },      // une bataille est branchée
    majArbres, majBuissons, majHerbe, majRoseaux,
    setTemps(t) { herbeMat.uniforms.uT.value = t; if (roseauMat) roseauMat.uniforms.uT.value = t * 1.3; },                              // le vent
    get vuesHerbe() { return vuesHerbe; },
    get trianglesArbres() { return trisArbres; },                                // les triangles des arbres dessinés à cette image (pour les stats)
    get msArbres() { return msArbres; },                                         // le tri des arbres, ms par image (lissé)
    regler(o) { opts = o; if (terrain()) preparerArbres(); },
    reglerBuissons(o) { optsB = o; if (terrain()) preparerBuissons(); },        // les buissons variés (null : ceux d'avant), à chaud                    // les arbres variés (null : ceux d'avant), à chaud
    forcer(mode) { forcee = mode; },                                             // les feuilles d'une saison qui n'en est pas une (le printemps du labo)                                       // les touffes dessinées (pour les stats)
  };
}
