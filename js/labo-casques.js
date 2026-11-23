// Les casques de près, au labo (Jérôme, 17 nov. : « les casques ne peuvent-ils pas avoir un rendu plus réaliste de près ? plus rond ? qu'est-ce que cela coûterait ? »).
// Quatre hommes, deux de chaque camp, au niveau de détail fin du jeu (24 px/m et plus), la caméra tourne lentement autour d'eux ; un style de casque par variante
// (`STYLES_CASQUE` de js/rendu/soldat-articule.js : les anneaux de boîtes d'aujourd'hui, des anneaux à douze pans, un profil tourné à 8 ou 16 pans). Le relevé dit ce que coûte
// le casque, l'homme, et 250 hommes (le plafond des articulés), comparés aux anneaux d'avant. Le style revient à celui du jeu (`CASQUE_JEU`) dès les maillages faits.
import { PALETTE } from './palette.js?v=0.165.2';
import { loadThree } from './three-lib.js?v=0.165.2';
import { fabriquer } from './labo-fabrique.js?v=0.165.2';
import { creerEquipeArticulee, reglerCasques, reglerArrondi, boites, trianglesVisibles } from './rendu/soldat-articule.js?v=0.165.2';
import { ARTICULE } from './data/aspect-soldat.js?v=0.165.2';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const FACTEUR = 2, TAN15 = Math.tan(15 * Math.PI / 180);
const HOMMES = [[311, 0, -0.9], [4027, 1, -0.3], [1789, 0, 0.3], [9254, 1, 0.9]];      // [numéro, camp, place en x]

// `arrondi` (Jérôme, 17 nov. : « arrondir les épaules, les crânes ») : le style du jeu, les épaules et les crânes arrondis ou non ; deux des quatre hommes sont blessés à la tête (sans casque : le crâne, les cheveux), comparés à la même scène sans arrondi
export function maquetteCasques(stage, { style = 'anneaux', arrondi = undefined } = {}) {
  let fini = false, nettoyer = () => {};
  stage.append(el('p', { textContent: 'Chargement des casques…' }));
  (async () => {
    const THREE = await loadThree();
    if (fini) return;
    stage.replaceChildren();
    nettoyer = monter(stage, THREE, style, arrondi);
  })().catch(e => { stage.replaceChildren(el('pre', { textContent: `Les casques n'ont pas pu se dessiner : ${e.message}` })); });
  return () => { fini = true; nettoyer(); reglerCasques(); reglerArrondi(); };
}

function monter(stage, THREE, style, arrondi) {
  const formes = arrondi !== undefined;
  const col = l => new THREE.Color(PALETTE[l]);
  const S = { ppm: 64, auto: true, yaw: 0.6, tangage: 0.35 };
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(62vh,520px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated';
  boite.append(canvas);
  const legende = el('p', { className: 'releve' });
  const bouton = (t, f) => el('button', { className: 'essai', textContent: t, onclick: f });
  stage.append(boite, legende,
    el('p', {}, ...[24, 32, 64, 120].map(z => bouton(`${z} px/m`, () => { S.ppm = z; }))),
    el('p', {}, bouton('Tourner', () => { S.auto = true; }), bouton('Arrêter', () => { S.auto = false; }),
      bouton('De face', () => { S.auto = false; S.yaw = 0; S.tangage = 0.2; }), bouton('De trois quarts', () => { S.auto = false; S.yaw = 0.75; S.tangage = 0.3; }), bouton('De dos', () => { S.auto = false; S.yaw = Math.PI; S.tangage = 0.3; }), bouton('Vue du jeu', () => { S.auto = false; S.yaw = 0.15; S.tangage = 0.95; })));

  reglerCasques(style); if (formes) reglerArrondi(arrondi);
  // ce que coûte ce style : le casque de chaque camp, l'homme entier (les triangles dessinés), et 250 hommes
  const casque = camp => boites().filter(b => b[8] === 1500 + camp && b[12] !== 2).reduce((n, b) => n + (b[13] ? 2 * b[13].n * (b[13].profil.length - 1) : 8), 0);
  const hommes = HOMMES.map(([id, camp, x], i) => ({ id, camp, x, aspect: fabriquer(id, camp).aspect, blessure: formes && i % 2 ? 3 : 0 }));
  const compte = () => Math.round(hommes.reduce((n, H) => n + trianglesVisibles(H.aspect, H.camp, H.blessure), 0) / hommes.length);
  const parHomme = compte();
  if (formes) reglerArrondi(false); else reglerCasques('anneaux');
  const reference = compte();
  reglerCasques(style); if (formes) reglerArrondi(arrondi);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = col('s');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 100);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: col('b') })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.add(sol);
  const E = creerEquipeArticulee(THREE, col, { capacite: HOMMES.length, ombrage: ARTICULE.ombrage ?? 0.5, niveau: 'fin', texturePoses: true });
  for (const m of E.meshes) scene.add(m);
  const cA = casque(0), cS = casque(1);
  reglerCasques(); reglerArrondi();      // (les maillages sont faits : le reste du labo retrouve les formes du jeu)
  const h = { x: 0, y: 0, z: 0, camp: 0, vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, cap: 0, temps: 0, aspect: null, pose: null };
  let dernierT = performance.now(), temps = 0, raf = 0, w = 0, ht = 0;
  function taille() {
    const r = boite.getBoundingClientRect(); const nw = Math.max(80, Math.round(r.width / FACTEUR)), nh = Math.max(80, Math.round(r.height / FACTEUR));
    if (nw !== w || nh !== ht) { w = nw; ht = nh; renderer.setSize(w, ht, false); camera.aspect = w / ht; camera.updateProjectionMatrix(); }
  }
  function image(now) {
    raf = requestAnimationFrame(image);
    const dt = Math.min(0.1, (now - dernierT) / 1000); dernierT = now; temps += dt;
    taille();
    if (S.auto) S.yaw += dt * 0.4;
    E.debut();
    for (const H of hommes) { Object.assign(h, { x: H.x, camp: H.camp, aspect: H.aspect, temps, cap: 0, blessure: H.blessure }); E.ajouter(h); }
    E.fin();
    // la caméra du jeu, 30° de champ, à la distance où 1 m = ppm pixels ; elle vise les casques
    const cible = new THREE.Vector3(0, 1.62, 0), d = ht / (2 * S.ppm * TAN15);
    camera.position.set(cible.x + d * Math.sin(S.yaw) * Math.cos(S.tangage), cible.y + d * Math.sin(S.tangage), cible.z + d * Math.cos(S.yaw) * Math.cos(S.tangage));
    camera.lookAt(cible); camera.near = Math.max(0.02, d * 0.1); camera.far = d + 30; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const ecart = parHomme - reference;
    legende.textContent = `${S.ppm} px/m · ${formes ? (arrondi ? 'épaules et crânes arrondis' : 'épaules et crânes en boîtes') + ' · ' : ''}casque : Adrian ${cA} triangles, Stahlhelm ${cS} · un homme ${parHomme} triangles (${ecart >= 0 ? '+' : ''}${ecart}, ${ecart >= 0 ? '+' : ''}${Math.round(100 * ecart / reference)} %) · 250 hommes ${ecart >= 0 ? '+' : ''}${(250 * ecart).toLocaleString('fr-FR')} triangles · image ${w}×${ht} ×${FACTEUR}`;
  }
  raf = requestAnimationFrame(image);
  return () => { cancelAnimationFrame(raf); E.dispose(); renderer.dispose(); };
}
