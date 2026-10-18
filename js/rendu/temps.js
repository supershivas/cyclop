// Le temps qui passe (Jérôme, v0.8.0) : le soleil (les ombres des soldats et des arbres tournent et s'allongent), le soir et la nuit (un voile de
// terre qui monte), les lumières (lanternes des tranchées, incendies, fusées) qui le trouent. Rien hors de la palette, sauf les fondus du voile
// (CLAUDE.md, palette). Le dessin seulement : tout se lit de l'heure (`horloge`) et de l'état.
import * as SH from './shaders.js?v=0.34.1';
import { ligneY } from '../tranchees.js?v=0.34.1';

// `THREE`, `scene`, `col`, `camera`, `vue`, `surface(x, z)` viennent de creerRendu ; `soleilUniform` (le bout de l'ombre d'un mètre de hauteur, lu aussi par le nuanceur
// des soldats) et `solUniforms` (`uSol`, `uTaille` : la texture du sol, que l'ombre d'un arbre reprend) sont les uniformes partagés ; `ecl` (les éclats : les fusées) et
// `feux` (les incendies) sont lus pour les éclairer ; `bataille()` et `vide()` changent, donc ce sont des fonctions. L'ordre d'ajout à la scène est celui d'avant la découpe.
export function creerTemps({ THREE, scene, col, camera, vue, surface, bataille, vide, soleilUniform, solUniforms, ecl, feux, ECLATS }) {
  // ─── Le temps qui passe (Jérôme, v0.8.0) : le soleil (les ombres tournent et s'allongent), le soir et la nuit
  // (une trame de terre qui monte), les lumières (lanternes des tranchées, incendies, fusées) qui la trouent.
  // Rien hors de la palette : la nuit est une trame de la couleur la plus sombre. ───
  const soleil = soleilUniform.value;      // (partagé avec les ombres des arbres)
  // le bout de l'ombre d'un mètre de hauteur, selon l'heure (0 la nuit)
  function majSoleil(h) {
    if (h.phase !== 'jour') { soleil.set(0, 0); return; }
    const t = Math.max(0, Math.min(1, (h.heure + h.minute / 60 - 6) / 12));
    const elev = Math.max(0.1, 0.95 * Math.sin(Math.PI * t));               // rad : bas le matin et le soir
    const L = Math.min(3.5, 1 / Math.tan(elev));                            // (à 5, l'ombre d'un arbre traversait 45 m de champ)
    soleil.set(-Math.cos(Math.PI * t) * L, -Math.sin(Math.PI * t) * L);       // le soleil à l'est, au sud, à l'ouest : l'ombre à l'opposé
  }
  // l'obscurité : 0 le jour, la trame monte de 16 h à 18 h, épaisse la nuit, et se lève à l'aube
  function obscurite(h) {
    if (h.phase === 'nuit') return 0.74;
    const hf = h.heure + h.minute / 60;
    if (hf < 7) return 0.4 * (7 - hf);
    if (hf > 16) return Math.min(0.45, 0.45 * (hf - 16) / 2);
    return 0;
  }

  // les ombres des arbres : une bande tramée, du pied vers l'opposé du soleil, aussi longue que l'arbre est haut
  const ARBRES_OMBRES = 2000;
  const aoPos = new Float32Array(ARBRES_OMBRES * 4);
  const aoGeo = new THREE.InstancedBufferGeometry();
  aoGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.4, 0, 0, 0.4, 0, 0, 0.15, 1, 0, -0.4, 0, 0, 0.15, 1, 0, -0.15, 1, 0], 3));
  aoGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(aoPos, 4).setUsage(THREE.DynamicDrawUsage));
  aoGeo.instanceCount = 0;
  const aoMat = new THREE.ShaderMaterial({
    uniforms: { uSoleil: soleilUniform, uSol: solUniforms.uSol, uTaille: solUniforms.uTaille },
    vertexShader: SH.aoMat.v,
    // le sol un ton plus sombre, fondu : dense au pied, presque rien au bout (les branches nues laissent passer le jour)
    fragmentShader: SH.aoMat.f,
    side: THREE.DoubleSide, depthWrite: false, transparent: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const arbresOmbres = new THREE.Mesh(aoGeo, aoMat); arbresOmbres.frustumCulled = false; arbresOmbres.renderOrder = 1;
  scene.add(arbresOmbres);

  // les lanternes : de petites lumières le long des tranchées tenues, le soir et la nuit
  const LANTERNES = 120;
  const lnPos = new Float32Array(LANTERNES * 3), lnGeo = new THREE.BufferGeometry();
  lnGeo.setAttribute('position', new THREE.BufferAttribute(lnPos, 3).setUsage(THREE.DynamicDrawUsage));
  lnGeo.setDrawRange(0, 0);
  const lnMat = new THREE.ShaderMaterial({
    uniforms: { uO: { value: col('o') }, uH: { value: col('h') }, uT: { value: 0 } },
    vertexShader: SH.lnMat.v,
    fragmentShader: SH.lnMat.f,
    depthWrite: false,
  });
  const lanternes = new THREE.Points(lnGeo, lnMat); lanternes.frustumCulled = false; lanternes.renderOrder = 6;
  scene.add(lanternes);
  const lanternesVues = [];
  function majLanternes(nuit) {
    const B = bataille();
    lanternesVues.length = 0;
    if (nuit < 0.12 || !B) { lnGeo.setDrawRange(0, 0); return; }
    for (const reg of B.etat.regiments) {
      const t = reg.ordre.trace;
      if (!t || !reg.effectif) continue;
      for (let x = t.x0 + 9; x < t.x1 && lanternesVues.length < LANTERNES; x += 26) {
        const z = ligneY(t, x) + 0.4 * t.face;
        lanternesVues.push([x, surface(x, z) + 0.9, z]);
      }
    }
    lanternesVues.forEach(([x, y, z], k) => { lnPos[k * 3] = x; lnPos[k * 3 + 1] = y; lnPos[k * 3 + 2] = z; });
    lnGeo.attributes.position.needsUpdate = true;
    lnGeo.setDrawRange(0, lanternesVues.length);
  }

  // la nuit : une trame de terre, trouée autour des lumières. Les lumières sont peintes une fois par image dans une
  // petite carte (un quart de la résolution, sur le processeur) : la trame n'y lit qu'une valeur par pixel. (Chercher
  // 32 lumières pour chaque pixel coûtait plus que tout le reste du dessin, en rendu logiciel.)
  const LUMIERES = 64, QUART = 4;
  let lumW = 1, lumH = 1, lumData = new Uint8Array(1), lumTex = null;
  function preparerLumieres() {
    const w = Math.max(1, Math.ceil(vue.vw / QUART)), h = Math.max(1, Math.ceil(vue.vh / QUART));
    if (lumTex && w === lumW && h === lumH) return;
    lumW = w; lumH = h; lumData = new Uint8Array(w * h);
    lumTex?.dispose();
    lumTex = new THREE.DataTexture(lumData, w, h, THREE.RedFormat, THREE.UnsignedByteType);
    lumTex.magFilter = lumTex.minFilter = THREE.LinearFilter; lumTex.generateMipmaps = false;
    nuitMat.uniforms.uLum.value = lumTex;
  }
  // Le style de la nuit (le labo a comparé ; Jérôme a retenu « voile et halos », v0.9.3) : 0 la trame (celle de la v0.8 : un pixel sur deux de la couleur la plus sombre,
  // aucune couleur de plus), 1 « doux » (la même terre, mais en voile continu : le noir monte sans trame, les lumières le percent
  // en dégradé : des couleurs qui n'existent pas dans la palette), 2 « halos » (comme doux, et la lumière peint en plus une lueur
  // chaude : os et herbe sèche).
  const nuitMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col('t') }, uLueur: { value: col('o') }, uD: { value: 0 }, uMode: { value: 2 }, uLum: { value: null }, uTaille: { value: new THREE.Vector2(640, 400) } },
    vertexShader: SH.nuitMat.v,
    fragmentShader: SH.nuitMat.f,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const nuitPlan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nuitMat); nuitPlan.frustumCulled = false; nuitPlan.renderOrder = 5.5;
  scene.add(nuitPlan);
  const vEcran = new THREE.Vector3(), vBord = new THREE.Vector3();
  // une lumière (r mètres autour de x, y, z) peinte dans la carte des lumières
  function lumiere(x, y, z, r) {
    vEcran.set(x, y, z).project(camera); vBord.set(x + r, y, z).project(camera);
    if (vEcran.z > 1) return false;
    const px = (vEcran.x + 1) / 2 * lumW, py = (vEcran.y + 1) / 2 * lumH;
    const rp = Math.max(1, Math.hypot((vBord.x - vEcran.x) / 2 * lumW, (vBord.y - vEcran.y) / 2 * lumH));
    if (px < -rp || py < -rp || px > lumW + rp || py > lumH + rp) return false;
    const i0 = Math.max(0, Math.floor(px - rp)), i1 = Math.min(lumW - 1, Math.ceil(px + rp));
    const j0 = Math.max(0, Math.floor(py - rp)), j1 = Math.min(lumH - 1, Math.ceil(py + rp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i + 0.5 - px, j + 0.5 - py) / rp;
      if (d >= 1) continue;
      const v = d < 0.35 ? 255 : Math.round(255 * (1 - (d - 0.35) / 0.65));
      if (v > lumData[j * lumW + i]) lumData[j * lumW + i] = v;
    }
    return true;
  }
  function majNuit(h) {
    const d = obscurite(h);
    nuitMat.uniforms.uD.value = d;
    if (!vide()) nuitPlan.visible = d > 0;
    majLanternes(d);
    if (!d) return;
    preparerLumieres();
    nuitMat.uniforms.uTaille.value.set(vue.vw, vue.vh);
    lumData.fill(0);
    let n = 0;
    // les fusées (elles éclairent large), les incendies, les lanternes
    for (let s = 0; s < ECLATS && n < LUMIERES; s++) if (ecl.sorte[s] === 6 && ecl.age[s] < ecl.vie[s] && lumiere(ecl.x[s], ecl.y[s], ecl.z[s], 45)) n++;
    for (const f of feux) if (n < LUMIERES && lumiere(f.x, surface(f.x, f.z) + f.h, f.z, f.h > 2 ? 16 : 10)) n++;
    for (const [x, y, z] of lanternesVues) if (n < LUMIERES && lumiere(x, y, z, 7)) n++;
    lumTex.needsUpdate = true;
  }

  return {
    majSoleil, majNuit,
    setTemps(t) { lnMat.uniforms.uT.value = t; },                      // le scintillement des lanternes
    // 0 la trame, 1 le voile continu (« doux »), 2 le voile et ses halos (retenu, v0.9.3) : le labo les compare
    setStyleNuit(m) { const k = { trame: 0, doux: 1, halos: 2 }[m] ?? 0; nuitMat.uniforms.uMode.value = k; nuitMat.transparent = k > 0; nuitMat.needsUpdate = true; },
    // le tampon des ombres d'arbres : la végétation le remplit (les arbres qu'on voit), le soleil dit où elles tombent
    get ombres() { return { ARBRES_OMBRES, aoPos, aoGeo, soleil }; },
  };
}
