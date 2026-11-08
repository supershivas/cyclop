// Le coût du soldat articulé (js/rendu/soldat-articule.js, labo seulement), mesuré contre les soldats du jeu : mêmes hommes, même image de 640 × 400,
// Chromium sans carte graphique (rendu logiciel), chaque image attend la fin du dessin (lecture d'un pixel).
//
//   node scripts/mesure-soldat-articule.mjs                    → 2 000 hommes dans la vue, à 4, 8 et 16 pixels par mètre
//   node scripts/mesure-soldat-articule.mjs --n 1000 --zooms 8
//   node scripts/mesure-soldat-articule.mjs --n 1000 --zooms 8 --seul 1 --niveau moyen   (seulement l'équipe articulée du jeu, au niveau fin ou moyen : pour régler le nuanceur)
//
// Six dessins : la boîte du jeu (zoom 3), la silhouette allégée (4-6 px/m), l'équipée du jeu (dès 6 px/m), puis l'articulé tel quel (le modèle entier : les coiffes, barbes et accessoires
// absents d'un homme sont aplatis au sommet : ils coûtent leurs sommets, pas leurs pixels), l'articulé sans relief de faces (les aplats du jeu), et l'articulé à quatre faces par boîte (comme le jeu : sans le derrière).
// Les hommes sont rangés en grille serrée, tous dans la vue (comme `maj` de rendu/soldats.js, qui n'envoie que ceux qu'on voit), en marche.
import { servir, lancerChromium, options } from '../outils/navigateur.mjs';

const o = options(process.argv.slice(2), { n: '2000', zooms: '4,8,16', images: '14', seul: '', niveau: 'fin', frag: '', vert: '', cote: '' });
const srv = await servir('.');
const nav = await lancerChromium();
const page = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(e.message));
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(`${srv.base}labo.html`);
await page.waitForTimeout(800);
const resultats = await page.evaluate(async ({ N, zooms, images, seul, niveau, frag, vert, cote }) => {
  const { loadThree } = await import('/js/three-lib.js');
  const THREE = await loadThree();
  const { PALETTE } = await import('/js/palette.js');
  const { creerGeometries } = await import('/js/rendu/geometries.js');
  const SH = await import('/js/rendu/shaders.js');
  const { creerSoldatArticule } = await import('/js/rendu/soldat-articule.js');
  const { aspect } = await import('/js/aspect-soldat.js');
  const col = l => new THREE.Color(PALETTE[l]);
  const W = 640, H = 400;
  const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;z-index:9999';
  document.body.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const gl = renderer.getContext(), px = new Uint8Array(4);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 4000);
  const fond = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({ color: col('h') })); fond.rotation.x = -Math.PI / 2; 
  const sorties = [];
  const grille = (n, ppm) => {                                            // n hommes serrés dans la vue : de quoi tenir à ce zoom (640 / ppm mètres de large)
    const larg = W / ppm * 0.8, haut = H / ppm * 0.8 / Math.sin(0.95);
    const pas = Math.max(0.9, Math.min(3, Math.sqrt(larg * haut / n)));
    const cols = Math.max(1, Math.floor(larg / pas));
    return Array.from({ length: n }, (_, i) => [(i % cols - cols / 2) * pas, (Math.floor(i / cols) - Math.floor(n / cols) / 2) * pas]);
  };
  for (const zoom of zooms) {
    const pts = grille(N, zoom), hommes = pts.map((_, i) => ({ id: i * 7 + 1, camp: i % 2, a: null }));
    for (const hmm of hommes) hmm.a = aspect(hmm.id, hmm.camp, 7, 6, 25);
    const d = H / (2 * zoom * Math.tan(15 * Math.PI / 180));
    camera.position.set(0, d * Math.sin(0.95), d * Math.cos(0.95)); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    const mesurer = (nom, mesh, trianglesParHomme) => {
      const sc = new THREE.Scene(); sc.background = col('s'); sc.add(fond, mesh);
      for (let i = 0; i < 3; i++) { renderer.render(sc, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      const ts = [];
      for (let i = 0; i < images; i++) { const t0 = performance.now(); renderer.render(sc, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b);
      sorties.push({ zoom, nom, ms: +ts[Math.floor(ts.length / 2)].toFixed(1), triangles: renderer.info.render.triangles, parHomme: trianglesParHomme });
      sc.remove(mesh);
    };
    // les soldats du jeu : mêmes tampons d'instance que `creerSoldats` (position, camp, vitesse, tir, classe, taille et largeur, blessure)
    const P = { pos: new Float32Array(N * 3), camp: new Float32Array(N), vit: new Float32Array(N).fill(1.4), tir: new Float32Array(N * 2), classe: new Float32Array(N), va: new Float32Array(N * 2).fill(1), bl: new Float32Array(N) };
    pts.forEach(([x, z], i) => { P.pos.set([x, 0, z], i * 3); P.camp[i] = i % 2; });
    const attrs = [new THREE.InstancedBufferAttribute(P.pos, 3), new THREE.InstancedBufferAttribute(P.camp, 1), new THREE.InstancedBufferAttribute(P.vit, 1), new THREE.InstancedBufferAttribute(P.tir, 2), new THREE.InstancedBufferAttribute(P.classe, 1), new THREE.InstancedBufferAttribute(P.va, 2), new THREE.InstancedBufferAttribute(P.bl, 1)];
    const tex = new THREE.DataTexture(new Uint8Array([70, 66, 50, 255]), 1, 1); tex.needsUpdate = true;
    const mat = new THREE.ShaderMaterial({ uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') }, uJambes: { value: col('s') }, uFusil: { value: col('t') }, uSac: { value: col('g') }, uVisage: { value: col('h') }, uCuir: { value: col('b') }, uBotte: { value: col('t') }, uT: { value: 1.3 }, uBalance: { value: 1 }, uEch: { value: new THREE.Vector2(1, 1) }, uSol: { value: tex }, uTaille: { value: new THREE.Vector2(400, 300) }, uSoleil: { value: new THREE.Vector2(0.5, 0.6) } }, vertexShader: SH.soldatMat.v, fragmentShader: SH.soldatMat.f, side: THREE.DoubleSide, transparent: true });
    const G = creerGeometries(THREE, col);
    for (const [nom, style] of seul ? [] : [['jeu : la boîte', 'boite'], ['jeu : silhouette allégée', 'legere'], ['jeu : l\'équipée', 'equipe-marche']]) {
      const g = G.geometrieSoldat(style, attrs, null); g.instanceCount = N;
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
      mesurer(nom, m, g.getAttribute('position').count / 3);
    }
    // un maillage par option : le corps seul (tous les hommes), puis chaque coiffe, barbe, accessoire dans son maillage, qui ne porte que les hommes qui l'ont (comme les pansements et les grades du jeu)
    {
      const { boites, voir } = await import('/js/rendu/soldat-articule.js');
      const codes = [...new Set(boites().map(b => b[8]))].sort((a, b) => a - b);
      const sc = new THREE.Scene(); sc.background = col('s'); sc.add(fond);
      const lots = []; let tris = 0, dessines = 0;
      for (const code of codes) {
        const S = creerSoldatArticule(THREE, col, { complet: cote === 'front', ombrage: 0, filtre: b => b[8] === code, niveau });
        if (cote === 'front') S.materiel.side = THREE.FrontSide;       // diagnostic : des boîtes fermées (cinq faces) et l'élimination des faces arrière
        const qui = hommes.map((h, i) => [h, i]).filter(([h]) => voir(code, h.a, h.camp, 0));
        if (!qui.length || !S.modele.triangles) continue;
        if (frag === '0') { S.materiel.fragmentShader = 'void main() { gl_FragColor = vec4(0.5, 0.6, 0.7, 1.0); }'; S.materiel.needsUpdate = true; }       // diagnostic : un nuanceur de pixels vide (le coût des sommets seul)
        if (vert === '0') { S.materiel.vertexShader = 'attribute float aPart; attribute float aOs; attribute float aShow; attribute vec3 aNor; attribute vec3 aPos; attribute float aCamp; attribute float aWound; attribute vec4 aCap; attribute float aGrade; attribute vec4 aPose; attribute vec4 aBody; attribute vec4 aLook; attribute vec4 aLook2; varying float vPart; varying float vCamp; varying vec2 vFace; varying float vShade; varying vec4 vLook; varying vec4 vLook2; void main() { vPart = aPart; vCamp = aCamp; vFace = vec2(0.0); vShade = 1.0; vLook = aLook; vLook2 = aLook2; gl_Position = projectionMatrix * viewMatrix * vec4(position + aPos + (aCap.x + aPose.x + aBody.x + aGrade + aWound + aOs + aShow + aNor.x) * 0.0, 1.0); }'; S.materiel.needsUpdate = true; }       // diagnostic : des sommets sans pose
        const lot = S.instances(qui.length);
        qui.forEach(([h, i], k) => lot.ecrire(k, { x: pts[i][0], z: pts[i][1], camp: h.camp, vit: 1.4, temps: 1.3, aspect: h.a }));
        lot.envoyer(qui.length); sc.add(lot.mesh); lots.push([lot, S]); dessines += qui.length * S.modele.triangles / 1;
      }
      for (let i = 0; i < 3; i++) { renderer.render(sc, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      const ts = [];
      for (let i = 0; i < images; i++) { const t0 = performance.now(); renderer.render(sc, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b);
      sorties.push({ zoom, nom: `articulé : ${lots.length} maillages`, ms: +ts[Math.floor(ts.length / 2)].toFixed(1), triangles: renderer.info.render.triangles, parHomme: dessines / N, appels: renderer.info.render.calls });
      for (const [lot, S] of lots) { sc.remove(lot.mesh); lot.geometrie.dispose(); S.materiel.dispose(); }
    }
    for (const [nom, complet, ombrage] of seul ? [] : [['articulé (relief des faces)', true, 0.5], ['articulé (aplats du jeu)', true, 0], ['articulé (quatre faces)', false, 0]]) {
      const S = creerSoldatArticule(THREE, col, { complet, ombrage }), lot = S.instances(N);
      hommes.forEach((hmm, i) => lot.ecrire(i, { x: pts[i][0], z: pts[i][1], camp: hmm.camp, vit: 1.4, temps: 1.3, aspect: hmm.a })); lot.envoyer(N);
     
      mesurer(nom, lot.mesh, S.modele.triangles);
      lot.geometrie.dispose(); S.materiel.dispose();
    }
  }
  return sorties;
}, { N: +o.n, zooms: o.zooms.split(',').map(Number), images: +o.images, seul: !!o.seul, niveau: o.niveau, frag: o.frag, vert: o.vert, cote: o.cote });
let zoom = 0;
for (const r of resultats) {
  if (r.zoom !== zoom) { zoom = r.zoom; console.log(`\n${o.n} hommes dans la vue, ${zoom} pixels par mètre (image 640 × 400) :`); }
  console.log(`  ${r.nom.padEnd(30)} ${String(r.ms).padStart(7)} ms   ${String(r.triangles).padStart(9)} triangles   (${Math.round(r.parHomme)} par homme${r.appels ? `, ${r.appels} appels` : ''})`);
}
if (erreurs.length) console.log('\nERREURS :\n' + erreurs.join('\n'));
await nav.close(); await srv.close();
