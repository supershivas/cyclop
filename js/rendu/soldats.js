// Les hommes : les soldats (une boîte et son ombre ; de près la silhouette, plus loin une silhouette allégée ; aux zooms 1 et 2 un point), les anneaux des
// régiments choisis ou survolés, les corps (un homme couché) et les tombes (un tertre et une croix). Tout est instancié et ne reçoit que ce qu'on voit.
// Le dessin seulement. Les formes viennent de geometries.js, le GLSL de shaders.js.
import * as SH from './shaders.js?v=0.144.0';
import { creerGeometries } from './geometries.js?v=0.144.0';
import { classeDuRang } from '../data/grades.js?v=0.144.0';
import { creerEquipeArticulee } from './soldat-articule.js?v=0.144.0';
import { creerJeuAnimations } from './animation-jeu.js?v=0.144.0';
import { allures } from '../anim-modeles.js?v=0.144.0';
import { ANIMATIONS } from '../data/animations.js?v=0.144.0';
import { EPAULEMENT, MARCHE_JEU } from '../data/lecteur-animations.js?v=0.144.0';
import { SANG } from '../data/aspect-soldat.js?v=0.144.0';
import { ligneY } from '../tranchees.js?v=0.144.0';
import { profondeurALEcran } from './vue-ecran.js?v=0.144.0';

// `THREE`, `scene`, `col`, `solUniforms` (`uSol`, `uTaille` : la texture du sol, que l'ombre d'un soldat reprend), `styleSoldat` (le style de près, comparé au labo),
// `grades` (v0.68.0 : une variante de `GRADES`, data/grades.js, ou null : tous pareils) et `rangDe(B, id, reg)` (le rang d'un homme, bataille.js) ; `surface(x, z)` et `surfaceLisse(x, z)` (la hauteur du sol, lissée pour qui marche), `solY` (la hauteur moyenne du sol) et `POINTS_JUSQUA` (le zoom où un soldat n'est
// plus qu'un point) viennent de creerRendu ; `bataille()` et `vide()` changent ; `tirs()` rend la pose des tireurs et le bond des soufflés (eclats.js).
export function creerSoldats({ THREE, scene, col, solUniforms, styleSoldat, grades = null, rangDe = null, cadavre = 'planche', surface, surfaceLisse, solY: SOL_Y, POINTS_JUSQUA, bataille, vide, tirs }) {
  // ─── Les soldats ───
  // Une boîte de 0,5 × 1,7 × 0,35 m et son ombre ; de près (DETAIL_DES pixels par mètre), selon le style
  // (`soldat` de creerRendu, comparé au labo) : jambes, tête, casque, fusil, sac, et les jambes qui marchent.
  // Les parties : 0 la vareuse (la couleur du camp), 1 l'ombre, 2 le casque (l'os pour les choisis),
  // 3 les jambes (bandes molletières), 4 le fusil, 5 le sac, 6 le visage.
  const { geometrieSoldat: formeSoldat } = creerGeometries(THREE, col);
  const geometrieSoldat = style => formeSoldat(style, attrsI, grades);
  const { geometrieGrades: formeGrades, geometrieBandages: formeBandages } = creerGeometries(THREE, col);
  // (labo) la variété des soldats (`setVariete`, null : tous pareils) : { ton, cap, rang, assis, calme } ; tout vient du numéro de l'homme, le dessin seulement
  let variete = null;
  const hach = (a, m) => (Math.imul(a, m) >>> 0) / 4294967296;
  const TIR_T = new Float32Array(1 << 16).fill(-1e9), FOSSE = new Int8Array(1 << 16), FX = new Float32Array(1 << 16).fill(1e9), FY = new Float32Array(1 << 16);       // son dernier coup de feu (l'horloge du dessin) ; est-il dans une tranchée (relu quand il a bougé de 0,5 m)
  const dansTranchee = (id, x, y, lignes) => {
    if (Math.abs(FX[id] - x) + Math.abs(FY[id] - y) > 0.5) { FX[id] = x; FY[id] = y; let d = 9; for (const L of lignes) { const e = Math.abs(ligneY(L, x) - y); if (e < d) d = e; } FOSSE[id] = d < 1.1 ? 1 : 0; }
    return FOSSE[id] === 1;
  };
  const SANGS = new Float32Array(1 << 16); let tSang = 0;      // (v0.140.2) le sang de chaque homme (par numéro, 0 à 1) : il monte tant qu'il se bat au corps à corps et reste ; le dessin seulement, rien de sauvegardé
  const ART_AVANT = new Uint8Array(1 << 16);                  // 1 pour un homme articulé à l'image d'avant (par numéro) : `garde` (v0.143.1)
  const CAPS = new Float32Array(1 << 16);                    // le cap de chaque homme (par numéro : les indices bougent quand les morts sont retirés) : l'angle de son regard (NaN : pas encore vu, il part tourné vers l'ennemi)
  // Les gradés (v0.68.0) : leurs pièces (képi, fanion, galons…) sont des maillages à part, un par classe (une instance par gradé de cette classe seulement : un homme sur quatre
  // en tout, et chaque instance ne porte que les pièces de sa classe), avec les mêmes attributs que le corps ; le corps, lui, ne change que par la classe (la taille) et le fusil que
  // les officiers n'ont plus. Rien d'autre à dessiner pour un soldat ordinaire. Aux zooms 1 et 2, un seul tampon de points de tous les gradés.
  const PART_CLASSE = [0, 0.2, 0.12, 0.05, 0.03];                                   // la part de la capacité de l'armée que chaque classe peut prendre (le caporal pour six hommes, le sergent pour douze…)
  let BL = null, blessArr = null, varArr = null, GR = null, gpPos = null, gpCamp = null, gpTaille = null, attrsGP = null, gPoints = null, classeArr = null, capGP = 0;
  // Les soldats articulés (Jérôme, v0.105.0 ; labo « Fabrique de soldats ») : de près (`articule.des` pixels par mètre) les `articule.max` hommes les plus proches de la caméra (v0.143.1 ; du centre de la vue avant) prennent le squelette, le visage, le casque
  // et les galons de `aspect` (js/aspect-soldat.js) ; ils quittent les tampons des soldats équipés (et des gradés, des pansements) : un homme n'est dessiné qu'une fois. Créés au premier besoin (un objet de plus
  // décale les tirages d'identifiants de three, donc les images de référence). `aspectDe(B, id, camp)` : l'aspect d'un homme (main.js : son numéro de campagne, la graine d'identité, son âge et son rang) ; gardé par numéro.
  let artCfg = null, aspectDe = null, EQ = null, EQs = { moyen: null, fin: null }, artSel = null, candI = null, candD = null, artVus = 0, animJeu = null, listeAnim = null;
  // (v0.141.2) les démarches : une allure par homme (js/anim-modeles.js, générées une fois, au premier besoin), l'épaulement avant le coup, le buste qui vise ; `uDemarche` pour les silhouettes
  let demarches = false, lesAllures = null, reposVivant = false;      // (`reposVivant` : le repos vivant des allures, labo)
  const refaireAnim = () => {
    if (demarches) lesAllures ??= allures(undefined, { vivant: reposVivant });
    const liste = demarches ? [...(listeAnim ?? ANIMATIONS), ...lesAllures.animations] : listeAnim;
    animJeu = artCfg && artCfg.texture !== false && artCfg.animations !== false ? creerJeuAnimations({ ...(liste ? { animations: liste } : {}), ...(demarches ? { allures: lesAllures } : {}) }) : null;
  };
  const lisse01 = x => { const k = x < 0 ? 0 : x > 1 ? 1 : x; return k * k * (3 - 2 * k); };
  let couches = null;      // les hommes couchés, par indice de l'armée (v0.142.0 ; `rendu.couches`)
  const aspects = new Map(), hArt = { x: 0, y: 0, z: 0, camp: 0, vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, cap: 0, temps: 0, aspect: null, coup: 0, pose: null };
  let cap = 0, posArr = null, campArr = null, vitArr = null, tirArr = null, soldatsInst = null, soldatsDetail = null, soldatsLeger = null, soldatsPoints = null, attrsI = null, attrsP = null;
  const VARIATION = { taille: 0.07, largeur: 0.14 };      // la taille (±7 %) et la largeur (±14 %) d'un homme autour de la boîte de référence : le dessin seulement (Jérôme, v0.69.0)
  const COURBE = 100;                      // (v0.142.3) la vitesse dessinée d'un homme qui court courbé : COURBE + sa vitesse (aVit du nuanceur)
  const TAPI = 0.5;                        // la peur au-delà de laquelle un homme se tapit (le dessin seulement ; on ne tire plus à 0,85)
  const LEGER_DES = 4;                     // dès 4 pixels par mètre : la silhouette allégée (corps, tête, bras, fusil : ~50 triangles au lieu de ~74 ; Jérôme, v0.17.0)
  let legerActif = true;                   // (la mesure du coût l'éteint)
  const DETAIL_DES = 6;                    // (à 4 pixels par mètre, un homme en fait 7 de haut : la silhouette ne s'y voyait pas, et coûtait 138 000 triangles pour 2 000 hommes)
  const soldatMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') },
      uJambes: { value: col('s') }, uFusil: { value: col('t') }, uSac: { value: col('g') }, uVisage: { value: col('h') }, uCuir: { value: col('b') }, uBotte: { value: col('t') }, uT: { value: 0 },
      uBalance: { value: styleSoldat === 'equipe-marche' ? 1 : 0 },
      uEch: { value: new THREE.Vector2(grades?.classes[3].echelle ?? 1, grades?.classes[4].echelle ?? 1) },
      uSansOmbre: { value: 0 },
      uSol: solUniforms.uSol, uTaille: solUniforms.uTaille,
      uAO: solUniforms.uAO, uAOon: solUniforms.uAOon, uSunOn: solUniforms.uSunOn, uAbriOn: solUniforms.uAbriOn,      // la lumière du sol lue à la place de l'homme (session 2 : éteinte)
      uBoue: solUniforms.uBoue ?? { value: 0 }, uMouille: solUniforms.uMouille ?? { value: 0 },
      uDemarche: { value: 0 }, uVarTon: { value: 0 }, uSang: { value: 0 }, uSangCell: { value: SANG.cellule }, uSangCoul: { value: new THREE.Color(SANG.couleur) },      // le sang (éteint tant que `setSang` ne l'allume pas)      // la boue sur les hommes (labo : éteinte)
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
  // (créé au premier besoin : un objet de plus change les tirages d'identifiants de three, donc les images de référence ; voir le piège des feuilles dans docs/domaines/rendu.md)
  let pointGradeMat = null, lettreMat = null, lettres = null, lcPos = null, lcPhase = null, lcN = 0;       // les lettres des capitaines (v0.71.1) : un point d'écran chacune
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
    if (BL) { scene.remove(BL.leger, BL.detail); BL.leger.geometry.dispose(); BL.detail.geometry.dispose(); BL = null; }
    if (GR) { for (const c of GR) if (c) { scene.remove(c.inst, c.leger, c.detail); for (const m of [c.inst, c.leger, c.detail]) m.geometry.dispose(); } scene.remove(gPoints); gPoints.geometry.dispose(); GR = gPoints = null; }
    if (lettres) { scene.remove(lettres); lettres.geometry.dispose(); lettres = null; }
    for (const k of ['moyen', 'fin']) if (EQs[k]) { for (const m of EQs[k].meshes) scene.remove(m); EQs[k].dispose(); EQs[k] = null; }
    EQ = null;
    aspects.clear(); if (animJeu) animJeu.vider(); artSel = new Uint8Array(capacite); candI = new Int32Array(capacite); candD = new Float32Array(capacite);
    cap = capacite;
    posArr = new Float32Array(cap * 3); campArr = new Float32Array(cap); vitArr = new Float32Array(cap); tirArr = new Float32Array(cap * 2);
    attrsI = [new THREE.InstancedBufferAttribute(posArr, 3), new THREE.InstancedBufferAttribute(campArr, 1), new THREE.InstancedBufferAttribute(vitArr, 1), new THREE.InstancedBufferAttribute(tirArr, 2)];
    classeArr = new Float32Array(cap); varArr = new Float32Array(cap * 2).fill(1);
    blessArr = new Float32Array(cap);
    attrsI.push(new THREE.InstancedBufferAttribute(classeArr, 1), new THREE.InstancedBufferAttribute(varArr, 2), new THREE.InstancedBufferAttribute(blessArr, 1));       // (la classe du grade, puis la taille et la largeur de chacun : v0.69.0)
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
    // les blessés (v0.72.0) : leurs pansements, un maillage à part qui ne porte qu'eux (jamais plus d'un homme sur sept : la marge est large)
    { const n = Math.ceil(cap / 7) + 64;
      BL = { n, k: 0, pos: new Float32Array(n * 3), camp: new Float32Array(n), vit: new Float32Array(n), tir: new Float32Array(n * 2), va: new Float32Array(n * 2).fill(1), bl: new Float32Array(n) };
      BL.attrs = [new THREE.InstancedBufferAttribute(BL.pos, 3), new THREE.InstancedBufferAttribute(BL.camp, 1), new THREE.InstancedBufferAttribute(BL.vit, 1), new THREE.InstancedBufferAttribute(BL.tir, 2), new THREE.InstancedBufferAttribute(BL.va, 2), new THREE.InstancedBufferAttribute(BL.bl, 1)];
      BL.attrs.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
      const mesh = style => { const m = new THREE.Mesh(formeBandages(style, BL.attrs), soldatMat); m.frustumCulled = false; m.renderOrder = 2.2; scene.add(m); return m; };
      BL.leger = mesh('legere'); BL.detail = mesh('detail'); }
    if (grades) {
      if (grades.classes.some(c => c.etiquette)) {
        lettreMat ??= new THREE.ShaderMaterial({ uniforms: { uT: soldatMat.uniforms.uT, uEchelle: { value: 1 }, uHaut: { value: 400 }, uAmplitude: { value: 1.5 }, uOs: { value: col('o') }, uTerre: { value: col('t') } },
          vertexShader: SH.lettreMat.v, fragmentShader: SH.lettreMat.f, depthTest: false, depthWrite: false, transparent: true });
        lcPos = new Float32Array(64 * 3); lcPhase = new Float32Array(64);
        const gl = new THREE.BufferGeometry();
        gl.setAttribute('position', new THREE.BufferAttribute(lcPos, 3).setUsage(THREE.DynamicDrawUsage)); gl.setAttribute('aPhase', new THREE.BufferAttribute(lcPhase, 1).setUsage(THREE.DynamicDrawUsage));
        gl.setDrawRange(0, 0);
        lettres = new THREE.Points(gl, lettreMat); lettres.frustumCulled = false; lettres.renderOrder = 6; scene.add(lettres);
      }
      pointGradeMat ??= new THREE.ShaderMaterial({ uniforms: pointMat.uniforms, vertexShader: SH.pointGradeMat.v, fragmentShader: SH.pointGradeMat.f });
      GR = [null];
      for (let c = 1; c <= 4; c++) {
        const n = Math.ceil(cap * PART_CLASSE[c]) + 64, G = { n, k: 0, pos: new Float32Array(n * 3), camp: new Float32Array(n), vit: new Float32Array(n), tir: new Float32Array(n * 2), cl: new Float32Array(n).fill(c), va: new Float32Array(n * 2).fill(1), bl: new Float32Array(n) };
        G.attrs = [new THREE.InstancedBufferAttribute(G.pos, 3), new THREE.InstancedBufferAttribute(G.camp, 1), new THREE.InstancedBufferAttribute(G.vit, 1), new THREE.InstancedBufferAttribute(G.tir, 2), new THREE.InstancedBufferAttribute(G.cl, 1), new THREE.InstancedBufferAttribute(G.va, 2), new THREE.InstancedBufferAttribute(G.bl, 1)];
        G.attrs.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
        const mesh = style => { const m = new THREE.Mesh(formeGrades(style, grades, G.attrs, c), soldatMat); m.frustumCulled = false; m.renderOrder = 2.1; scene.add(m); return m; };
        G.inst = mesh('boite'); G.leger = mesh('legere'); G.detail = mesh(styleSoldat === 'boite' ? 'silhouette' : styleSoldat);
        GR.push(G);
      }
      capGP = Math.ceil(cap * 0.4) + 64;
      gpPos = new Float32Array(capGP * 3); gpCamp = new Float32Array(capGP); gpTaille = new Float32Array(capGP);
      attrsGP = [new THREE.BufferAttribute(gpPos, 3), new THREE.BufferAttribute(gpCamp, 1), new THREE.BufferAttribute(gpTaille, 1)];
      attrsGP.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', attrsGP[0]); gg.setAttribute('aCamp', attrsGP[1]); gg.setAttribute('aTaille', attrsGP[2]);
      gg.setDrawRange(0, 0);
      gPoints = new THREE.Points(gg, pointGradeMat); gPoints.frustumCulled = false; gPoints.renderOrder = 2.1; scene.add(gPoints);
    }
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
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uVieux: { value: col('g') }, uFlanc: { value: col('s') }, uVarTon: soldatMat.uniforms.uVarTon,
      uSol: solUniforms.uSol, uTaille: solUniforms.uTaille, uBoue: soldatMat.uniforms.uBoue, uMouille: soldatMat.uniforms.uMouille, uAO: solUniforms.uAO, uAOon: solUniforms.uAOon, uSunOn: solUniforms.uSunOn, uAbriOn: solUniforms.uAbriOn },      // (v0.140.3) la boue et la lumière du sol : un mort garde l'aspect du vivant
    vertexShader: SH.corpsMat.v,
    fragmentShader: SH.corpsMat.f,
    side: THREE.DoubleSide,
  });
  const soldatCouche = cadavre === 'planche' ? null : new THREE.ShaderMaterial({
    uniforms: { uNous: soldatMat.uniforms.uNous, uEux: soldatMat.uniforms.uEux, uVieux: { value: col('g') }, uJambes: soldatMat.uniforms.uJambes, uFusil: soldatMat.uniforms.uFusil, uSac: soldatMat.uniforms.uSac,
      uVisage: soldatMat.uniforms.uVisage, uCuir: soldatMat.uniforms.uCuir, uBotte: soldatMat.uniforms.uBotte, uSang: soldatMat.uniforms.uSang, uSangCell: soldatMat.uniforms.uSangCell, uSangCoul: soldatMat.uniforms.uSangCoul, uVarTon: soldatMat.uniforms.uVarTon, uSol: solUniforms.uSol, uTaille: solUniforms.uTaille, uBoue: soldatMat.uniforms.uBoue, uMouille: soldatMat.uniforms.uMouille, uAO: solUniforms.uAO, uAOon: solUniforms.uAOon, uSunOn: solUniforms.uSunOn, uAbriOn: solUniforms.uAbriOn, uPoses: { value: cadavre === 'poses' ? 1 : 0 } },
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
      if (variete) { const iv = c[4] & 0xffff; x += variete.rang * (hach(iv + 31, 2246822519) * 2 - 1); y += variete.rang * (hach(iv + 113, 3266489917) * 2 - 1); }
      const v = vol && vol.get(ic);
      if (v) {
        const f = Math.min(1, v[3] / P.duree), d = Math.hypot(x - v[1], y - v[2]);
        x = v[1] + (x - v[1]) * f; y = v[2] + (y - v[2]) * f; haut = 4 * f * (1 - f) * d * P.haut;
      }
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const hs = surface(x, y) + haut;
      if (profondeurALEcran(e, x, hs, y, 0.6) < 0) continue;      // couché : 60 cm de haut au plus (v0.143.1 : plus le pied seul)
      cPos[k * 3] = x; cPos[k * 3 + 1] = hs; cPos[k * 3 + 2] = y;
      { // le mort garde le ton et la place qu'il avait vivant : le même nombre que le vivant (sa largeur et sa taille, soldatMat), rangé dans l'état (+ 0,4 × le nombre)
        const iv = c[4] & 0xffff, lg = Math.fround(1 + VARIATION.largeur * (2 * hach(iv + 1, 2654435761) - 1)), ta = Math.fround(1 + VARIATION.taille * (2 * hach(iv + 977, 1597334677) - 1)), g = lg * 71.3 + ta * 37.7;
        cInfo[k * 2] = (c[3] < jour ? 2 : c[2]) + 0.4 * Math.min(0.999, g - Math.floor(g)); cCamp[k] = c[2]; }
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
      const hs = surface(x, y);
      if (profondeurALEcran(e, x, hs, y, 1.2) < 0) continue;      // la croix : 1,2 m (v0.143.1)
      tbPos[k * 3] = x; tbPos[k * 3 + 1] = hs; tbPos[k * 3 + 2] = y;
      k++;
    }
    if (!vide()) { tombesPoints.visible = points; tombesInst.visible = !points; }
    for (const a of points ? attrsTP : attrsTI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    tombesPoints.geometry.setDrawRange(0, k);
    tombesInst.geometry.instanceCount = k;
  }
  let cache = -1;      // le numéro de l'homme qu'on ne dessine pas (v0.144.0 : la vue d'un soldat)
  // les positions dans les tampons : seulement ceux qu'on voit (`x0`…`z1` : le rectangle englobant du sol vu ; `e` : la matrice écran ; `p` : les pixels par mètre)
  function maj({ x0, x1, z0, z1, e, p, choisis, vh = 400, pos = null }) {
    const B = bataille();
    const A = B.armee, n = A.n;
    // (les positions dessinées : interpolées entre deux pas de la simulation, qui n'en fait que 30 par seconde, quand main.js les donne ; v0.134.1)
    const AX = pos && pos.x.length >= n ? pos.x : A.x, AY = pos && pos.y.length >= n ? pos.y : A.y;
    let k = 0, ka = 0, kg = 0;
    BL.k = 0;
    lcN = 0;
    if (grades) for (let c = 1; c <= 4; c++) GR[c].k = 0;
    const an = anGeo.attributes.position.array, anTon = anGeo.attributes.aTon.array;
    const { tirVal, tirAng, volT, volH, volD } = tirs(), regs = B.etat.regiments, tAnim = soldatMat.uniforms.uT.value;
    // (v0.140.2) le sang du corps à corps : il monte pour tous ceux qui se battent, vus ou non (l'horloge du dessin : figée à la pause), et reste
    { const dSang = Math.max(0, Math.min(0.1, tAnim - tSang)) * SANG.parSeconde; tSang = tAnim;
      if (dSang > 0) for (let i = 0; i < n; i++) if (A.duel[i]) { const id = A.id[i] & 0xffff; if (SANGS[id] < 1) SANGS[id] = Math.min(1, SANGS[id] + dSang); }
      soldatMat.uniforms.uSangCell.value = Math.max(SANG.cellule, 1.3 / p); }      // une tache fait au moins un peu plus d'un pixel : plus fine, elle scintille quand l'homme marche
    // les hommes articulés : de près, les plus proches DE LA CAMÉRA parmi ceux qu'on voit (le même test et la même place que plus bas). Jusqu'à la v0.142.2, les plus proches
    // du centre du rectangle de sol vu (`x0`…`z1`) : avec sa marge du relief (30 à 400 m de tous les côtés) et une caméra inclinée, ce centre partait au fond de la vue, et quand
    // plus de `max` hommes étaient en vue le premier plan passait au dessin simple (Jérôme, v0.143.1 : « le premier plan ne doit pas subitement devenir low rez »).
    // `garde` : un homme déjà articulé ne cède sa place qu'à un homme nettement plus proche (sa distance comptée × `garde`), pour que la limite ne papillote pas quand la caméra bouge.
    const arti = !!(artCfg && aspectDe && rangDe && p >= artCfg.des);
    if (arti) {
      artSel.fill(0, 0, n);
      const garde = artCfg.garde ?? 1;
      let nc = 0;
      for (let i = 0; i < n; i++) {
        if (A.id[i] === cache) continue;
        let x = AX[i], y = AY[i];
        const iv = A.id[i] & 0xffff;
        if (variete) { x += variete.rang * (hach(iv + 31, 2246822519) * 2 - 1); y += variete.rang * (hach(iv + 113, 3266489917) * 2 - 1); }
        if (x < x0 || x > x1 || y < z0 || y > z1) continue;
        const d = profondeurALEcran(e, x, surfaceLisse(x, y), y, 2, 0.3, true);      // vraiment dans l'écran (30 cm de marge) : un homme hors de l'écran ne prend pas une place du détail
        if (d < 0) continue;
        candI[nc] = i; candD[nc++] = ART_AVANT[iv] ? d * garde : d;
      }
      const seuil = nc > artCfg.max ? candD.slice(0, nc).sort()[artCfg.max - 1] : Infinity;
      let nArt = 0;
      ART_AVANT.fill(0);
      for (let c = 0; c < nc && nArt < artCfg.max; c++) if (candD[c] <= seuil) { artSel[candI[c]] = 1; ART_AVANT[A.id[candI[c]] & 0xffff] = 1; nArt++; }
      // deux niveaux de détail (v0.105.1) : dès `fin` px/m le fin (le visage se lit, les galons, les boutons), de `des` à là l'intermédiaire (un casque simplifié, ni boutons, ni pouces, ni galons : moins d'un pixel)
      const niv = p >= (artCfg.fin ?? 24) ? 'fin' : 'moyen';
      if (nArt && !EQs[niv]) {
        EQs[niv] = creerEquipeArticulee(THREE, col, { capacite: artCfg.max + 8, ombrage: artCfg.ombrage ?? 0, niveau: niv, texturePoses: artCfg.texture !== false,
          partages: { uSoleil: soldatMat.uniforms.uSoleil, uSol: solUniforms.uSol, uTaille: solUniforms.uTaille, uAO: solUniforms.uAO, uAOon: solUniforms.uAOon, uSunOn: solUniforms.uSunOn, uAbriOn: solUniforms.uAbriOn, uBoue: soldatMat.uniforms.uBoue, uMouille: soldatMat.uniforms.uMouille, uSang: soldatMat.uniforms.uSang, uSangCell: soldatMat.uniforms.uSangCell, uSangCoul: soldatMat.uniforms.uSangCoul, uVarTon: soldatMat.uniforms.uVarTon } });
        for (const m of EQs[niv].meshes) scene.add(m);
      }
      EQ = EQs[niv];
      if (EQ) EQ.debut();
      if (animJeu) animJeu.debut();
    }
    for (let i = 0; i < n; i++) {
      if (A.id[i] === cache) continue;      // l'homme que le joueur pilote : l'œil est dedans (v0.144.0)
      let x = AX[i], y = AY[i];
      if (variete) { const iv = A.id[i] & 0xffff; x += variete.rang * (hach(iv + 31, 2246822519) * 2 - 1); y += variete.rang * (hach(iv + 113, 3266489917) * 2 - 1); }      // sa place dans le rang : un écart fixe, tiré de son numéro
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      // à sa vraie hauteur : sur une colline du premier plan, l'homme monte à l'écran, et le tester au niveau de la mer le retirait (v0.73.1)
      const hs = surfaceLisse(x, y);
      if (profondeurALEcran(e, x, hs, y) < 0) continue;      // des pieds à la tête, pas le pied seul (v0.143.1)
      posArr[k * 3] = x; posArr[k * 3 + 1] = hs + (i < volT.length && volT[i] > 0 ? volH[i] * Math.sin(Math.PI * (1 - volT[i] / volD[i])) : 0); posArr[k * 3 + 2] = y;
      const art = arti && artSel[i] === 1;
      const sel = choisis.has(A.reg[i]);
      campArr[k] = A.camp[i] + (sel ? 2 : 0);
      if (sel || A.reg[i] === survolReg) { an[ka * 3] = x; an[ka * 3 + 1] = posArr[k * 3 + 1]; an[ka * 3 + 2] = y; anTon[ka] = sel ? 0 : 1 + A.camp[i]; ka++; }
      // la peur : accroupi s'il ne bouge pas (−1) ; s'il se déplace, il court courbé (COURBE + sa vitesse : le nuanceur penche le buste, les jambes marchent ; v0.142.3, avant il glissait accroupi)
      { const vv = Math.hypot(A.vx[i], A.vy[i]); vitArr[k] = A.peur[i] < TAPI ? vv : vv > MARCHE_JEU.courbe.vitesse ? COURBE + vv : -1; }
      tirArr[k * 2] = i < tirVal.length && tirVal[i] > 0 ? tirVal[i] : regs[A.reg[i]]?.stance === 'retenu' ? -1 : 0;       // (-1 : le fusil baissé du feu retenu ; la pose de tir, quand il tire, passe devant)
      // son cap : vers sa cible quand il tire ; sinon le sens où il marche (lissé) ; à l'arrêt, il se tourne vers l'ennemi (nous : π, vers le nord ; en face : 0) ; au départ, déjà tourné vers lui (Jérôme, v0.52.2)
      const id = A.id[i] & 0xffff, vx = A.vx[i], vz = A.vy[i], ennemi = A.camp[i] === 0 ? Math.PI : 0;
      if (Number.isNaN(CAPS[id])) CAPS[id] = ennemi;
      const marche = vx * vx + vz * vz > 0.09;
      // (variété) assis, le dos au parapet : un homme au repos dans une tranchée, sans peur ni blessure, qui n'a pas tiré depuis `calme` secondes ; il se relève pour tirer, marcher, se battre
      let assis = false;
      if (variete) {
        if (i < tirVal.length && tirVal[i] > 0) TIR_T[id] = tAnim;
        assis = vitArr[k] >= 0 && vitArr[k] < 0.05 && !A.duel[i] && !A.blessure[i] && hach(id + 211, 2654435761) < variete.assis && Math.abs(tAnim - TIR_T[id]) > variete.calme && dansTranchee(id, AX[i], AY[i], B.lignes);
        if (assis) vitArr[k] = -2;
      }
      const repos = assis ? ennemi + Math.PI : ennemi + (variete ? variete.cap * (hach(id + 57, 1597334677) * 2 - 1) : 0);       // à l'arrêt : vers l'ennemi, à un écart près ; assis, il lui tourne le dos
      let d = (marche ? Math.atan2(vx, vz) : repos) - CAPS[id]; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      CAPS[id] += d * (marche ? 0.3 : 0.1);
      tirArr[k * 2 + 1] = i < tirVal.length && tirVal[i] > 0 ? tirAng[i] : CAPS[id];
      // (les démarches) l'épaulement : il lève le fusil AVANT son coup (le compte à rebours de l'armée, `tirT`, s'il est au feu), le tient `tenue` s, le baisse ; en marchant il garde son cap de marche
      // si sa cible est assez près de lui (les articulés tournent le buste vers elle : `vise`) ; le dessin seulement, `tirT` n'est que lu
      const tv = i < tirVal.length ? tirVal[i] : 0;
      let avant = Infinity, vise = 0;
      if (demarches && !A.duel[i] && tirArr[k * 2] >= 0) {
        if (tv > 0) TIR_T[id] = tAnim;
        if (tAnim - TIR_T[id] < EPAULEMENT.engage && tAnim >= TIR_T[id]) avant = A.tirT[i];
        if (marche && tv > 0) { let dv = tirAng[i] - CAPS[id]; dv -= Math.round(dv / (2 * Math.PI)) * 2 * Math.PI; if (Math.abs(dv) <= EPAULEMENT.vise) vise = dv; if (Math.abs(dv) <= EPAULEMENT.viseSilhouette) tirArr[k * 2 + 1] = CAPS[id]; }
        let w = tv > 0 ? 1 - lisse01(((1 - tv) / 1.6 - EPAULEMENT.tenue) / EPAULEMENT.baisse) : 0;      // (`tirVal` vaut 1 au coup et perd 1,6 par seconde : eclats.js)
        if (avant < EPAULEMENT.avance) w = Math.max(w, lisse01(1 - avant / EPAULEMENT.avance));
        tirArr[k * 2] = w / 2.5;
      }
      // au corps à corps (army.js, `duel`) : face à son adversaire, la baïonnette part par à-coups (une phase par homme : les deux ne frappent pas ensemble) ; le dessin seulement
      if (A.duel[i]) { const ph = Math.sin(tAnim * 4.6 + id * 1.7); tirArr[k * 2] = -2 - (ph > 0 ? ph * ph : 0); tirArr[k * 2 + 1] = A.duelAng[i]; }
      // sa taille et sa largeur : un hachage de son numéro (le dessin seulement, rien de sauvegardé), de ±7 % en hauteur et ±14 % en largeur ; même numéro, même homme
      const hu = (Math.imul((A.id[i] & 0xffff) + 1, 2654435761) >>> 0) / 4294967296, hv = (Math.imul((A.id[i] & 0xffff) + 977, 1597334677) >>> 0) / 4294967296;
      const nSang = Math.round(SANGS[id] * 4);       // son niveau de sang, 0 à 4
      blessArr[k] = A.blessure[i] + 0.1 * nSang;      // sa blessure : la pose et le pansement (v0.72.0) ; + 0,1 × le niveau de sang (les tests du nuanceur tolèrent ±0,5)
      varArr[k * 2] = 1 + VARIATION.largeur * (2 * hu - 1); varArr[k * 2 + 1] = 1 + VARIATION.taille * (2 * hv - 1);
      if (A.blessure[i] && !art && BL.k < BL.n) {
        const q = BL.k++;
        BL.pos[q * 3] = x; BL.pos[q * 3 + 1] = posArr[k * 3 + 1]; BL.pos[q * 3 + 2] = y; BL.camp[q] = campArr[k]; BL.vit[q] = vitArr[k]; BL.tir[q * 2] = tirArr[k * 2]; BL.tir[q * 2 + 1] = tirArr[k * 2 + 1];
        BL.bl[q] = A.blessure[i]; BL.va[q * 2] = varArr[k * 2]; BL.va[q * 2 + 1] = varArr[k * 2 + 1];
      }
      if (grades) {
        // la classe de son rang (celui de sa création ou de sa promotion : un mort retiré de l'armée ne laisse rien ; un promu change de dessin à l'image suivante)
        const classe = classeDuRang(rangDe(B, A.id[i], A.reg[i]));
        classeArr[k] = classe;
        // la lettre du capitaine : un point d'écran juste au-dessus de sa tête (sa taille et sa taille de classe comprises)
        if (lettres && grades.classes[classe]?.etiquette && lcN < 64) {
          lcPos[lcN * 3] = x; lcPos[lcN * 3 + 1] = posArr[k * 3 + 1] + 1.85 * (grades.classes[classe].echelle ?? 1) * varArr[k * 2 + 1]; lcPos[lcN * 3 + 2] = y;
          lcPhase[lcN] = (A.id[i] & 0xff) * 0.7;
          lcN++;
        }
        const G = classe > 0 && !art ? GR[classe] : null;
        if (G && G.k < G.n && kg < capGP) {
          const q = G.k++;
          G.pos[q * 3] = x; G.pos[q * 3 + 1] = posArr[k * 3 + 1]; G.pos[q * 3 + 2] = y;
          G.camp[q] = campArr[k]; G.va[q * 2] = varArr[k * 2]; G.va[q * 2 + 1] = varArr[k * 2 + 1]; G.bl[q] = blessArr[k]; G.vit[q] = vitArr[k]; G.tir[q * 2] = tirArr[k * 2]; G.tir[q * 2 + 1] = tirArr[k * 2 + 1];
          gpPos[kg * 3] = x; gpPos[kg * 3 + 1] = posArr[k * 3 + 1]; gpPos[kg * 3 + 2] = y; gpCamp[kg] = campArr[k]; gpTaille[kg] = grades.classes[classe].points ?? 2;
          kg++;
        }
      }
      // un homme articulé : écrit dans ses maillages, il ne prend pas de place dans les tampons des autres (l'emplacement k sert au suivant)
      if (art) {
        const rg = rangDe(B, A.id[i], A.reg[i]);
        let c = aspects.get(A.id[i]);
        if (!c || c.rang !== rg) { c = { rang: rg, a: aspectDe(B, A.id[i], A.camp[i]) }; aspects.set(A.id[i], c); }
        const v = vitArr[k], tx = tirArr[k * 2];
        hArt.x = posArr[k * 3]; hArt.y = posArr[k * 3 + 1]; hArt.z = posArr[k * 3 + 2]; hArt.camp = campArr[k];
        hArt.vit = v < 0 ? 0 : v > COURBE * 0.5 ? v - COURBE : v; hArt.tapi = v < 0 ? 1 : 0; hArt.courbe = v > COURBE * 0.5 ? 1 : 0;
        hArt.couche = couches && couches[i] ? 1 : 0;       // (v0.142.0) couché : la patrouille du labo ; le jeu n'en pose pas encore
        hArt.tir = tx > 0 ? Math.min(1, tx * 2.5) : tx <= -2 ? -tx : tx < -0.5 ? -1 : 0;       // (−1 le feu retenu : le fusil baissé ; de 2 à 3 la mêlée : 2 + la poussée, tourné vers l'adversaire : `aTir` du soldat équipé)
        hArt.cap = demarches && vise ? CAPS[id] : tirArr[k * 2 + 1]; hArt.vise = demarches ? vise : 0; hArt.avant = avant; hArt.blessure = A.blessure[i]; hArt.sang = nSang; hArt.aspect = c.a; hArt.temps = tAnim;
        hArt.coup = demarches ? tv : tx > 0 ? tx : 0; hArt.pose = animJeu ? animJeu.pose(A.id[i], hArt, tAnim) : null;       // la marche, le repos et le tir viennent du lecteur d'animations (null : poseJeu)
        EQ.ajouter(hArt);
        continue;
      }
      k++;
    }
    // les maillages des hommes articulés : seulement de près, seulement s'il y en a
    artVus = arti && EQ ? EQ.fin() : 0;
    if (animJeu) animJeu.fin();
    if (!vide()) for (const k of ['moyen', 'fin']) if (EQs[k]) for (const m of EQs[k].meshes) m.visible = artVus > 0 && EQs[k] === EQ;
    anGeo.setDrawRange(0, ka); anGeo.attributes.position.needsUpdate = true; anGeo.attributes.aTon.needsUpdate = true; anMat.uniforms.uTaille.value = Math.max(5, Math.round(p * 1.5));
    if (!vide()) anneaux.visible = ka > 0;
    const points = p <= POINTS_JUSQUA, detail = !points && soldatsDetail && p >= DETAIL_DES, leger = !points && !detail && legerActif && p >= LEGER_DES;
    if (!vide()) { soldatsPoints.visible = points; soldatsInst.visible = !points && !detail && !leger; if (soldatsDetail) soldatsDetail.visible = !!detail; soldatsLeger.visible = !!leger; }
    if (soldatsDetail) soldatsDetail.geometry.instanceCount = k;
    soldatsLeger.geometry.instanceCount = k;
    for (const a of points ? attrsP : attrsI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    soldatsPoints.geometry.setDrawRange(0, k);
    soldatsInst.geometry.instanceCount = k;
    // les pansements : seulement aux zooms où l'on voit les membres
    for (const [m, voulu] of [[BL.leger, !!leger], [BL.detail, !!detail]]) {
      if (!vide()) m.visible = voulu && BL.k > 0;
      m.geometry.instanceCount = BL.k;
    }
    if (BL.k && (leger || detail)) for (const a of BL.attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, BL.k * a.itemSize); a.needsUpdate = true; }
    if (grades) {
      for (let c = 1; c <= 4; c++) {
        const G = GR[c];
        if (!vide()) { G.inst.visible = !points && !detail && !leger; G.leger.visible = !!leger; G.detail.visible = !!detail; }
        for (const m of [G.inst, G.leger, G.detail]) m.geometry.instanceCount = G.k;
        if (!points) for (const a of G.attrs) { a.clearUpdateRanges(); a.addUpdateRange(0, G.k * a.itemSize); a.needsUpdate = true; }
      }
      if (!vide()) gPoints.visible = points;
      if (points) for (const a of attrsGP) { a.clearUpdateRanges(); a.addUpdateRange(0, kg * a.itemSize); a.needsUpdate = true; }
      gPoints.geometry.setDrawRange(0, kg);
      gradesVus = kg;
      if (lettres) {
        // une case de la lettre = 1 pixel de l'image à 4 pixels par mètre et moins, 2 à 8 et plus : elle reste lisible sans écraser un homme
        lettreMat.uniforms.uEchelle.value = p >= 8 ? 2 : 1; lettreMat.uniforms.uHaut.value = vh;
        const att = lettres.geometry.attributes; att.position.needsUpdate = true; att.aPhase.needsUpdate = true; lettres.geometry.setDrawRange(0, lcN);
        if (!vide()) lettres.visible = lcN > 0 && !sansInterface;
      }
    }
    vus = k;
    majCorps(x0, x1, z0, z1, e, points, p);
    majTombes(x0, x1, z0, z1, e, points);
  }
  let vus = 0, gradesVus = 0, sansInterface = false;

  return {
    set couches(v) { couches = v; },
    casteurs() { return [soldatsInst, soldatsDetail, soldatsLeger, ...Object.values(EQs).flatMap(E => (E ? E.meshes.slice(1) : []))].filter(Boolean); },      // (le premier maillage d'une équipe articulée est son ombre au sol : il ne projette pas)      // les maillages qui projettent dans la carte d'ombre (session 3 : les hommes en boîtes, silhouettes et équipés)
    sansOmbre(v) { soldatMat.uniforms.uSansOmbre.value = v ? 1 : 0; for (const E of Object.values(EQs)) if (E && v) E.meshes[0].visible = false; },                       // la carte d'ombre remplace l'ombre au sol en quadrilatère
    soleilUniform: soldatMat.uniforms.uSoleil,                    // le bout de l'ombre d'un mètre de hauteur (temps.js le règle, le nuanceur le lit)
    setTemps(t) { soldatMat.uniforms.uT.value = t; },
    setReposVivant(v) { if (reposVivant !== !!v) { reposVivant = !!v; lesAllures = null; refaireAnim(); } },      // le repos vivant (labo ; false : la pose tenue)
    setDemarches(v) { demarches = !!v; soldatMat.uniforms.uDemarche.value = demarches ? 1 : 0; refaireAnim(); },      // les démarches (labo ; false : celles d'avant)
    setVariete(v) { variete = v || null; soldatMat.uniforms.uVarTon.value = v ? v.ton : 0; FX.fill(1e9); },      // la variété des soldats (null : tous pareils)
    setSang(v) { soldatMat.uniforms.uSang.value = Math.max(0, Math.min(1, +v || 0)); },      // la force des taches de sang (0 : aucune)             // les jambes qui marchent
    preparer(B) { CAPS.fill(NaN); SANGS.fill(0); tSang = 0; TIR_T.fill(-1e9); FX.fill(1e9); preparerSoldats(B.armee.capacite); preparerCorps(Math.max(1024, B.etat.corps.length * 2)); preparerTombes(Math.max(256, (B.etat.tombes?.length || 0) * 2)); },
    maj,
    cacher(id) { cache = id; },                                   // l'homme qu'on ne dessine pas (le numéro de l'armée, −1 : aucun)
    survoler(reg) { survolReg = reg; },                            // le régiment qu'un anneau à la couleur de son camp désigne
    get legere() { return legerActif; }, set legere(v) { legerActif = !!v; },     // la silhouette allégée (la mesure du coût l'éteint)
    get sansInterface() { return sansInterface; }, set sansInterface(v) { sansInterface = !!v; },      // le décor de l'écran titre : aucune lettre de capitaine, rien qui soit de l'interface (Jérôme, v0.100.0)
    get articule() { return artCfg; }, set articule(v) { artCfg = v; refaireAnim(); }, set animations(v) { listeAnim = v; refaireAnim(); },       // `animations` : la liste que joue le lecteur (main.js : celles d'origine remplacées par les publiées)
                // { des, max, ombrage } ou null : les soldats articulés de près
    set aspectDe(f) { aspectDe = f; },
    get articulesVus() { return artVus; },
    get articulesSel() { return artSel; },                         // (lecture seule, les sondes) 1 pour un homme articulé, par indice de l'armée
    get gradesVus() { return gradesVus; },                          // les gradés dessinés (pour les stats et le labo)
    get vus() { return vus; },                                    // les soldats dessinés (pour les stats)
  };
}
