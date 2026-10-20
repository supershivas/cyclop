// Les hommes : les soldats (une boîte et son ombre ; de près la silhouette, plus loin une silhouette allégée ; aux zooms 1 et 2 un point), les anneaux des
// régiments choisis ou survolés, les corps (un homme couché) et les tombes (un tertre et une croix). Tout est instancié et ne reçoit que ce qu'on voit.
// Le dessin seulement. Les formes viennent de geometries.js, le GLSL de shaders.js.
import * as SH from './shaders.js?v=0.38.3';
import { creerGeometries } from './geometries.js?v=0.38.3';

// `THREE`, `scene`, `col`, `solUniforms` (`uSol`, `uTaille` : la texture du sol, que l'ombre d'un soldat reprend), `styleSoldat` (le style de près, comparé au labo),
// `surface(x, z)` et `surfaceLisse(x, z)` (la hauteur du sol, lissée pour qui marche), `solY` (la hauteur moyenne du sol) et `POINTS_JUSQUA` (le zoom où un soldat n'est
// plus qu'un point) viennent de creerRendu ; `bataille()` et `vide()` changent ; `tirs()` rend la pose des tireurs et le bond des soufflés (eclats.js).
export function creerSoldats({ THREE, scene, col, solUniforms, styleSoldat, cadavre = 'planche', surface, surfaceLisse, solY: SOL_Y, POINTS_JUSQUA, bataille, vide, tirs }) {
  // ─── Les soldats ───
  // Une boîte de 0,5 × 1,7 × 0,35 m et son ombre ; de près (DETAIL_DES pixels par mètre), selon le style
  // (`soldat` de creerRendu, comparé au labo) : jambes, tête, casque, fusil, sac, et les jambes qui marchent.
  // Les parties : 0 la vareuse (la couleur du camp), 1 l'ombre, 2 le casque (l'os pour les choisis),
  // 3 les jambes (bandes molletières), 4 le fusil, 5 le sac, 6 le visage.
  const { geometrieSoldat: formeSoldat } = creerGeometries(THREE, col);
  const geometrieSoldat = style => formeSoldat(style, attrsI);
  let cap = 0, posArr = null, campArr = null, vitArr = null, tirArr = null, soldatsInst = null, soldatsDetail = null, soldatsLeger = null, soldatsPoints = null, attrsI = null, attrsP = null;
  const TAPI = 0.5;                        // la peur au-delà de laquelle un homme se tapit (le dessin seulement ; on ne tire plus à 0,85)
  const LEGER_DES = 4;                     // dès 4 pixels par mètre : la silhouette allégée (corps, tête, bras, fusil : ~50 triangles au lieu de ~74 ; Jérôme, v0.17.0)
  let legerActif = true;                   // (la mesure du coût l'éteint)
  const DETAIL_DES = 6;                    // (à 4 pixels par mètre, un homme en fait 7 de haut : la silhouette ne s'y voyait pas, et coûtait 138 000 triangles pour 2 000 hommes)
  const soldatMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') },
      uJambes: { value: col('s') }, uFusil: { value: col('t') }, uSac: { value: col('g') }, uVisage: { value: col('h') }, uCuir: { value: col('b') }, uBotte: { value: col('t') }, uT: { value: 0 },
      uBalance: { value: styleSoldat === 'equipe-marche' ? 1 : 0 },
      uSol: solUniforms.uSol, uTaille: solUniforms.uTaille,
      uSoleil: { value: new THREE.Vector2(0.5, 0.6) } },
    vertexShader: SH.soldatMat.v,
    fragmentShader: SH.soldatMat.f,
    side: THREE.DoubleSide, transparent: true,
  });
  const pointMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') } },
    vertexShader: SH.pointMat.v,
    fragmentShader: SH.pointMat.f,
  });
  // Le contour des régiments choisis (Jérôme, v0.21.0) : un anneau d'os, liseré de terre, au pied de chaque homme, à tous les zooms
  // (aux zooms 1 et 2, où un homme n'est qu'un point, c'est lui qui le montre) ; sous les soldats, sans test de profondeur.
  // Le survol (v0.21.1) : le régiment sous la souris (ou sous un bouton du HUD), tous ses hommes, d'un anneau à la couleur de son camp (celui des choisis est d'os).
  let anGeo = null, anneaux = null, survolReg = -1, survolTroncons = [];
  const anMat = new THREE.ShaderMaterial({
    uniforms: { uOs: { value: col('o') }, uTerre: { value: col('t') }, uNous: { value: col('n') }, uEux: { value: col('x') }, uTaille: { value: 6 } },
    vertexShader: SH.anMat.v,
    fragmentShader: SH.anMat.f,
    depthTest: false, depthWrite: false, transparent: true,
  });
  function preparerSoldats(capacite) {
    if (anneaux) { scene.remove(anneaux); anGeo.dispose(); }
    if (soldatsInst) {
      scene.remove(soldatsInst, soldatsPoints); soldatsInst.geometry.dispose(); soldatsPoints.geometry.dispose();
      if (soldatsDetail) { scene.remove(soldatsDetail); soldatsDetail.geometry.dispose(); }
      if (soldatsLeger) { scene.remove(soldatsLeger); soldatsLeger.geometry.dispose(); }
    }
    cap = capacite;
    posArr = new Float32Array(cap * 3); campArr = new Float32Array(cap); vitArr = new Float32Array(cap); tirArr = new Float32Array(cap * 2);
    attrsI = [new THREE.InstancedBufferAttribute(posArr, 3), new THREE.InstancedBufferAttribute(campArr, 1), new THREE.InstancedBufferAttribute(vitArr, 1), new THREE.InstancedBufferAttribute(tirArr, 2)];
    attrsI.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    soldatsInst = new THREE.Mesh(geometrieSoldat('boite'), soldatMat); soldatsInst.frustumCulled = false; soldatsInst.renderOrder = 2;
    soldatsDetail = styleSoldat === 'boite' ? null : new THREE.Mesh(geometrieSoldat(styleSoldat), soldatMat);
    if (soldatsDetail) { soldatsDetail.frustumCulled = false; soldatsDetail.renderOrder = 2; scene.add(soldatsDetail); }
    soldatsLeger = new THREE.Mesh(geometrieSoldat('legere'), soldatMat); soldatsLeger.frustumCulled = false; soldatsLeger.renderOrder = 2; scene.add(soldatsLeger);
    const gp = new THREE.BufferGeometry();
    attrsP = [new THREE.BufferAttribute(posArr, 3), new THREE.BufferAttribute(campArr, 1)];
    attrsP.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gp.setAttribute('position', attrsP[0]); gp.setAttribute('aCamp', attrsP[1]);
    gp.setDrawRange(0, 0);
    soldatsPoints = new THREE.Points(gp, pointMat); soldatsPoints.frustumCulled = false; soldatsPoints.renderOrder = 2;
    scene.add(soldatsInst, soldatsPoints);
    anGeo = new THREE.BufferGeometry(); anGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage)); anGeo.setDrawRange(0, 0);
    anGeo.setAttribute('aTon', new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
    anneaux = new THREE.Points(anGeo, anMat); anneaux.frustumCulled = false; anneaux.renderOrder = 1.5; anneaux.visible = false;
    scene.add(anneaux);
  }

  // ─── Les tombes (v0.11.0) : là où l'homme est tombé, un tertre de terre fraîche (glaise) et une croix de bois pâle,
  // toutes tournées vers le nord (on enterre en rangs, même au milieu du champ) ; au loin, un pixel. ───
  let capTombes = 0, tbPos = null, tombesInst = null, tombesPoints = null, attrsTI = null, attrsTP = null;
  const tombeMat = new THREE.ShaderMaterial({
    uniforms: { uTertre: { value: col('g') }, uFlanc: { value: col('s') }, uCroix: { value: col('r') } },
    vertexShader: SH.tombeMat.v,
    fragmentShader: SH.tombeMat.f,
    side: THREE.DoubleSide,
  });
  const tombePointMat = new THREE.ShaderMaterial({
    uniforms: tombeMat.uniforms,
    vertexShader: SH.tombePointMat.v,
    fragmentShader: SH.tombePointMat.f,
  });
  function preparerTombes(capacite) {
    if (tombesInst) { scene.remove(tombesInst, tombesPoints); tombesInst.geometry.dispose(); tombesPoints.geometry.dispose(); }
    capTombes = capacite;
    tbPos = new Float32Array(capTombes * 3);
    const q = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
    // une boîte : [dessus, flancs]
    const boite = (x0, x1, y0, y1, z0, z1) => [
      q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]),
      [...q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]), ...q([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]),
       ...q([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]), ...q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0])],
    ];
    const pos = [], part = [];
    const mettre = (tris, k) => { pos.push(...tris); part.push(...new Array(tris.length / 3).fill(k)); };
    const [tD, tF] = boite(-0.35, 0.35, 0, 0.22, -0.85, 0.85);              // le tertre
    mettre(tD, 0); mettre(tF, 1);
    for (const b of [boite(-0.08, 0.08, 0, 1.2, -1.05, -0.9), boite(-0.36, 0.36, 0.8, 0.95, -1.05, -0.9)]) { mettre(b[0], 2); mettre(b[1], 2); }   // la croix, à la tête
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
    attrsTI = [new THREE.InstancedBufferAttribute(tbPos, 3)];
    attrsTI[0].setUsage(THREE.DynamicDrawUsage);
    gi.setAttribute('aPos', attrsTI[0]);
    gi.instanceCount = 0;
    tombesInst = new THREE.Mesh(gi, tombeMat); tombesInst.frustumCulled = false; tombesInst.renderOrder = 1;
    const gp = new THREE.BufferGeometry();
    attrsTP = [new THREE.BufferAttribute(tbPos, 3)];
    attrsTP[0].setUsage(THREE.DynamicDrawUsage);
    gp.setAttribute('position', attrsTP[0]);
    gp.setDrawRange(0, 0);
    tombesPoints = new THREE.Points(gp, tombePointMat); tombesPoints.frustumCulled = false; tombesPoints.renderOrder = 1;
    scene.add(tombesInst, tombesPoints);
  }

  // ─── Les corps : un homme couché (1,7 × 0,5 m, 0,3 de haut) ; au loin, un pixel.
  // La couleur de son camp le jour où il tombe, la glaise dès le lendemain. ───
  // `cadavre` (le labo, v0.27.0) : 'planche' (la boîte couchée d'aujourd'hui) ; 'couche' (le soldat lui-même, couché sur le dos : de 4 pixels par mètre la silhouette allégée, dès 6 celle du style choisi) ;
  // 'poses' (de même, sur le dos, le ventre ou le côté, les membres écartés selon son numéro).
  let capCorps = 0, cPos = null, cInfo = null, cCamp = null, corpsInst = null, corpsLeger = null, corpsDetail = null, corpsPoints = null, attrsCI = null, attrsCP = null;
  const corpsMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uVieux: { value: col('g') }, uFlanc: { value: col('s') } },
    vertexShader: SH.corpsMat.v,
    fragmentShader: SH.corpsMat.f,
    side: THREE.DoubleSide,
  });
  const soldatCouche = cadavre === 'planche' ? null : new THREE.ShaderMaterial({
    uniforms: { uNous: soldatMat.uniforms.uNous, uEux: soldatMat.uniforms.uEux, uVieux: { value: col('g') }, uJambes: soldatMat.uniforms.uJambes, uFusil: soldatMat.uniforms.uFusil, uSac: soldatMat.uniforms.uSac,
      uVisage: soldatMat.uniforms.uVisage, uCuir: soldatMat.uniforms.uCuir, uBotte: soldatMat.uniforms.uBotte, uPoses: { value: cadavre === 'poses' ? 1 : 0 } },
    vertexShader: SH.corpsSoldatMat.v,
    fragmentShader: SH.corpsSoldatMat.f,
    side: THREE.DoubleSide,
  });
  const corpsPointMat = new THREE.ShaderMaterial({
    uniforms: corpsMat.uniforms,
    vertexShader: SH.corpsPointMat.v,
    fragmentShader: SH.corpsPointMat.f,
  });
  function preparerCorps(capacite) {
    if (corpsInst) { scene.remove(corpsInst, corpsPoints); corpsInst.geometry.dispose(); corpsPoints.geometry.dispose(); }
    if (corpsLeger) { scene.remove(corpsLeger, corpsDetail); corpsLeger.geometry.dispose(); corpsDetail.geometry.dispose(); corpsLeger = corpsDetail = null; }
    capCorps = capacite;
    cPos = new Float32Array(capCorps * 3); cInfo = new Float32Array(capCorps * 2); cCamp = new Float32Array(capCorps);
    const q = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
    const l = 0.85, w = 0.25, h = 0.3;
    const dessus = q([-l, h, -w], [-l, h, w], [l, h, w], [l, h, -w]);
    const flancs = [
      ...q([-l, 0, w], [l, 0, w], [l, h, w], [-l, h, w]), ...q([-l, 0, -w], [l, 0, -w], [l, h, -w], [-l, h, -w]),
      ...q([l, 0, -w], [l, 0, w], [l, h, w], [l, h, -w]), ...q([-l, 0, -w], [-l, 0, w], [-l, h, w], [-l, h, -w]),
    ];
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute([...dessus, ...flancs], 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute([...new Array(dessus.length / 3).fill(0), ...new Array(flancs.length / 3).fill(1)], 1));
    attrsCI = [new THREE.InstancedBufferAttribute(cPos, 3), new THREE.InstancedBufferAttribute(cInfo, 2)];
    attrsCI.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gi.setAttribute('aPos', attrsCI[0]); gi.setAttribute('aInfo', attrsCI[1]);
    gi.instanceCount = 0;
    corpsInst = new THREE.Mesh(gi, corpsMat); corpsInst.frustumCulled = false; corpsInst.renderOrder = 1;
    if (soldatCouche) {
      // le soldat couché : les mêmes boîtes que debout (`formeSoldat`), les attributs d'instance sont ceux du corps (position, camp, [état, angle])
      attrsCI.push(new THREE.InstancedBufferAttribute(cCamp, 1).setUsage(THREE.DynamicDrawUsage));
      const lie = style => { const g = formeSoldat(style, [attrsCI[0], attrsCI[2], attrsCI[1]]); g.setAttribute('aInfo', g.getAttribute('aVit')); g.deleteAttribute('aVit'); const m = new THREE.Mesh(g, soldatCouche); m.frustumCulled = false; m.renderOrder = 1; scene.add(m); return m; };
      corpsLeger = lie('legere'); corpsDetail = lie(styleSoldat === 'boite' ? 'silhouette' : styleSoldat);
    }
    const gp = new THREE.BufferGeometry();
    attrsCP = [new THREE.BufferAttribute(cPos, 3), new THREE.BufferAttribute(cInfo, 2)];
    attrsCP.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gp.setAttribute('position', attrsCP[0]); gp.setAttribute('aInfo', attrsCP[1]);
    gp.setDrawRange(0, 0);
    corpsPoints = new THREE.Points(gp, corpsPointMat); corpsPoints.frustumCulled = false; corpsPoints.renderOrder = 1;
    scene.add(corpsInst, corpsPoints);
  }

  // les corps : ceux qu'on voit, comme les soldats (la liste ne fait que grandir)
  function majCorps(x0, x1, z0, z1, e, points, p) {
    const B = bataille();
    const C = B.etat.corps, jour = B.etat.jour;
    if (C.length > capCorps) preparerCorps(C.length * 2);
    let k = 0;
    // (un mort d'obus vole de là où il est tombé jusqu'à son corps : `B.volants`, vieilli par la logique, v0.24.0)
    const P = B.R.obus.projection, vol = B.volants.length ? new Map(B.volants.map(v => [v[0], v])) : null;
    for (let ic = 0; ic < C.length; ic++) {
      const c = C[ic];
      let x = c[0] / 10, y = c[1] / 10, haut = 0;
      const v = vol && vol.get(ic);
      if (v) {
        const f = Math.min(1, v[3] / P.duree), d = Math.hypot(x - v[1], y - v[2]);
        x = v[1] + (x - v[1]) * f; y = v[2] + (y - v[2]) * f; haut = 4 * f * (1 - f) * d * P.haut;
      }
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.08 * cw || cxp > 1.08 * cw || cyp < -1.15 * cw || cyp > 1.15 * cw) continue;
      cPos[k * 3] = x; cPos[k * 3 + 1] = surface(x, y) + haut; cPos[k * 3 + 2] = y;
      cInfo[k * 2] = c[3] < jour ? 2 : c[2]; cCamp[k] = c[2];
      cInfo[k * 2 + 1] = ((c[4] * 2654435761) >>> 0) % 628 / 100;     // couché dans un sens qui ne change pas
      k++;
    }
    // (le soldat couché à partir de 4 pixels par mètre, la planche en deçà ; le même seuil que les soldats debout)
    const leger = !!corpsLeger && !points && p >= LEGER_DES && p < DETAIL_DES, detail = !!corpsDetail && !points && p >= DETAIL_DES;
    if (!vide()) { corpsPoints.visible = points; corpsInst.visible = !points && !leger && !detail; if (corpsLeger) { corpsLeger.visible = leger; corpsDetail.visible = detail; } }
    if (corpsLeger) { corpsLeger.geometry.instanceCount = k; corpsDetail.geometry.instanceCount = k; }
    for (const a of points ? attrsCP : attrsCI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    corpsPoints.geometry.setDrawRange(0, k);
    corpsInst.geometry.instanceCount = k;
  }
  function majTombes(x0, x1, z0, z1, e, points) {
    const B = bataille();
    const C = B.etat.tombes || [];
    if (C.length > capTombes) preparerTombes(C.length * 2);
    let k = 0;
    for (const c of C) {
      const x = c[0] / 10, y = c[1] / 10;
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.08 * cw || cxp > 1.08 * cw || cyp < -1.15 * cw || cyp > 1.15 * cw) continue;
      tbPos[k * 3] = x; tbPos[k * 3 + 1] = surface(x, y); tbPos[k * 3 + 2] = y;
      k++;
    }
    if (!vide()) { tombesPoints.visible = points; tombesInst.visible = !points; }
    for (const a of points ? attrsTP : attrsTI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    tombesPoints.geometry.setDrawRange(0, k);
    tombesInst.geometry.instanceCount = k;
  }
  // les positions dans les tampons : seulement ceux qu'on voit (`x0`…`z1` : le rectangle englobant du sol vu ; `e` : la matrice écran ; `p` : les pixels par mètre)
  function maj({ x0, x1, z0, z1, e, p, choisis }) {
    const B = bataille();
    const A = B.armee, n = A.n;
    let k = 0, ka = 0;
    const an = anGeo.attributes.position.array, anTon = anGeo.attributes.aTon.array;
    const { tirVal, tirAng, volT, volH, volD } = tirs(), regs = B.etat.regiments;
    for (let i = 0; i < n; i++) {
      const x = A.x[i], y = A.y[i];
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.08 * cw || cxp > 1.08 * cw || cyp < -1.15 * cw || cyp > 1.15 * cw) continue;
      posArr[k * 3] = x; posArr[k * 3 + 1] = surfaceLisse(x, y) + (i < volT.length && volT[i] > 0 ? volH[i] * Math.sin(Math.PI * (1 - volT[i] / volD[i])) : 0); posArr[k * 3 + 2] = y;
      const sel = choisis.has(A.reg[i]);
      campArr[k] = A.camp[i] + (sel ? 2 : 0);
      if (sel || A.reg[i] === survolReg) { an[ka * 3] = x; an[ka * 3 + 1] = posArr[k * 3 + 1]; an[ka * 3 + 2] = y; anTon[ka] = sel ? 0 : 1 + A.camp[i]; ka++; }
      vitArr[k] = A.peur[i] >= TAPI ? -1 : Math.hypot(A.vx[i], A.vy[i]);
      tirArr[k * 2] = i < tirVal.length && tirVal[i] > 0 ? tirVal[i] : regs[A.reg[i]]?.stance === 'retenu' ? -1 : 0;       // (-1 : le fusil baissé du feu retenu ; la pose de tir, quand il tire, passe devant)
      tirArr[k * 2 + 1] = i < tirVal.length ? tirAng[i] : 0;
      k++;
    }
    anGeo.setDrawRange(0, ka); anGeo.attributes.position.needsUpdate = true; anGeo.attributes.aTon.needsUpdate = true; anMat.uniforms.uTaille.value = Math.max(5, Math.round(p * 1.5));
    if (!vide()) anneaux.visible = ka > 0;
    const points = p <= POINTS_JUSQUA, detail = !points && soldatsDetail && p >= DETAIL_DES, leger = !points && !detail && legerActif && p >= LEGER_DES;
    if (!vide()) { soldatsPoints.visible = points; soldatsInst.visible = !points && !detail && !leger; if (soldatsDetail) soldatsDetail.visible = !!detail; soldatsLeger.visible = !!leger; }
    if (soldatsDetail) soldatsDetail.geometry.instanceCount = k;
    soldatsLeger.geometry.instanceCount = k;
    for (const a of points ? attrsP : attrsI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    soldatsPoints.geometry.setDrawRange(0, k);
    soldatsInst.geometry.instanceCount = k;
    vus = k;
    majCorps(x0, x1, z0, z1, e, points, p);
    majTombes(x0, x1, z0, z1, e, points);
  }
  let vus = 0;

  return {
    soleilUniform: soldatMat.uniforms.uSoleil,                    // le bout de l'ombre d'un mètre de hauteur (temps.js le règle, le nuanceur le lit)
    setTemps(t) { soldatMat.uniforms.uT.value = t; },             // les jambes qui marchent
    preparer(B) { preparerSoldats(B.armee.capacite); preparerCorps(Math.max(1024, B.etat.corps.length * 2)); preparerTombes(Math.max(256, (B.etat.tombes?.length || 0) * 2)); },
    maj,
    survoler(reg) { survolReg = reg; },                            // le régiment qu'un anneau à la couleur de son camp désigne
    get legere() { return legerActif; }, set legere(v) { legerActif = !!v; },     // la silhouette allégée (la mesure du coût l'éteint)
    get vus() { return vus; },                                    // les soldats dessinés (pour les stats)
  };
}
