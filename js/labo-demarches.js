// Les démarches, au labo (Jérôme, 17 nov. : « des démarches plus réalistes : mouvement des épaules et des hanches, appui sur une jambe plus l'autre, fusil dans les deux mains ;
// chaque soldat a une démarche différente en fonction de sa graine » ; « des tirs avec épaulement depuis la marche »). Un défilé de profil : six soldats articulés traversent une
// plaine, dessinés par les maillages et la texture de poses du jeu (js/rendu/soldat-articule.js) et animés par son lecteur (js/rendu/animation-jeu.js) ; `allures` : les démarches
// de js/anim-modeles.js (une par homme, l'épaulement avant le coup, le buste qui vise) ou celles d'avant. « Feu en marchant » : chacun tire toutes les 2,5 à 4,5 s, sur une cible
// devant lui, un peu de côté. Le labo montre sans rien modifier : il n'y a pas de bataille.
import { PALETTE } from './palette.js?v=0.147.0';
import { loadThree } from './three-lib.js?v=0.147.0';
import { fabriquer } from './labo-fabrique.js?v=0.147.0';
import { creerEquipeArticulee } from './rendu/soldat-articule.js?v=0.147.0';
import { creerJeuAnimations } from './rendu/animation-jeu.js?v=0.147.0';
import { allures as genererAllures, poseMort, chute } from './anim-modeles.js?v=0.147.0';
import { echantillon, poseNeutre } from './pose-soldat.js?v=0.147.0';
import { ANIMATIONS } from './data/animations.js?v=0.147.0';
import { EPAULEMENT } from './data/lecteur-animations.js?v=0.147.0';
import { NOMS_CHAMPS } from './data/poses-soldat.js?v=0.147.0';
const tableau = p => Float32Array.from(NOMS_CHAMPS, c => p[c] ?? 0);      // la texture de poses lit un tableau dans l'ordre des champs

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const FACTEUR = 2, TAN15 = Math.tan(15 * Math.PI / 180), N = 6;
const IDS = [311, 4027, 1789, 9254, 12873, 640];          // six hommes (leur numéro fait leur visage et, avec les démarches, leur allure)
const u = (n, k) => (Math.imul(n * 977 + k + 1, 2654435761) >>> 0) / 4294967296;
const lisse01 = x => { const k = x < 0 ? 0 : x > 1 ? 1 : x; return k * k * (3 - 2 * k); };

// `repos` (Jérôme, 17 nov. : « des mouvements simples lorsque les soldats attendent dans les tranchées ») : six hommes alignés, immobiles, comme au parapet ; `vivant` : le repos vivant des allures
// `morts` (Jérôme, 17 nov. : « la mort et les morts ») : 'chute' six hommes debout tombent l'un après l'autre (`chute` de anim-modeles.js), restent à terre, se relèvent pour l'exemple ; 'champ' seize morts dans leur pose (`poseMort`) ;
// 'avant' : les seize couchés comme le squelette le faisait jusqu'ici (tous sur le dos, droits, le fusil le long du corps)
export function maquetteDemarches(stage, { allures = true, repos = false, vivant = false, geste = null, morts = null } = {}) {
  let fini = false, nettoyer = () => {};
  stage.append(el('p', { textContent: 'Chargement du défilé…' }));
  (async () => {
    const THREE = await loadThree();
    if (fini) return;
    stage.replaceChildren();
    nettoyer = monter(stage, THREE, allures, repos || !!morts, vivant, geste, morts);
  })().catch(e => { stage.replaceChildren(el('pre', { textContent: `Le défilé n'a pas pu démarrer : ${e.message}` })); });
  return () => { fini = true; nettoyer(); };
}

function monter(stage, THREE, avecAllures, repos = false, vivant = false, geste = null, morts = null) {
  const col = l => new THREE.Color(PALETTE[l]);
  const S = morts ? { ppm: 24, feu: false, yaw: 0.75, tangage: 0.55, peur: false } : repos ? { ppm: 32, feu: false, yaw: 0.75, tangage: 0.3, peur: false } : { ppm: 24, feu: true, yaw: 0, tangage: 0.22, peur: false };
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(62vh,520px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated';
  boite.append(canvas);
  const legende = el('p', { className: 'releve' });
  const bouton = (t, f) => el('button', { className: 'essai', textContent: t, onclick: f });
  stage.append(boite, legende,
    el('p', {}, ...[12, 16, 24, 32].map(z => bouton(`${z} px/m`, () => { S.ppm = z; }))),
    el('p', {}, bouton('Feu en marchant', () => { S.feu = true; }), bouton('Sans tirer', () => { S.feu = false; }), bouton('Sous le feu : courbés', () => { S.peur = !S.peur; }),
      bouton('De profil', () => { S.yaw = 0; S.tangage = 0.22; }), bouton('De trois quarts', () => { S.yaw = 0.6; S.tangage = 0.45; }), bouton('Vue du jeu', () => { S.yaw = 0.15; S.tangage = 0.95; })));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = col('s');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 300);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ color: col('b') })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.add(sol);
  const NN = morts && morts !== 'chute' ? 16 : N;
  const equipes = { fin: creerEquipeArticulee(THREE, col, { capacite: NN, ombrage: 0.5, niveau: 'fin', texturePoses: true }), moyen: creerEquipeArticulee(THREE, col, { capacite: NN, ombrage: 0.5, niveau: 'moyen', texturePoses: true }) };
  for (const E of Object.values(equipes)) for (const m of E.meshes) scene.add(m);
  const A = avecAllures ? genererAllures(undefined, { vivant, geste }) : null;
  const lecteur = creerJeuAnimations(A ? { animations: [...ANIMATIONS, ...A.animations], allures: A } : {});

  // les hommes : leur aspect (celui du jeu), leur vitesse, leur place dans la colonne, leur compte à rebours de tir
  // les morts : un champ de 4 × 4 (chacun sa pose, tirée de son numéro), ou six hommes qui tombent tour à tour (une chute toutes les 0,8 s, à terre 4 s, debout 2 s)
  const CYCLE = 6 + 0.8 * N, champ = morts && morts !== 'chute' ? Array.from({ length: 16 }, (_, i) => 1000 + 37 * i) : null;
  const chutes = morts === 'chute' ? IDS.map(id => chute(id)) : null;
  const poses = champ ? champ.map(id => tableau(morts === 'avant' ? { ...poseNeutre(), couche: 1 } : poseMort(id))) : null;
  const hommes = (champ ?? IDS).map((id, i) => champ ? ({ id, aspect: fabriquer(id, i % 3 ? 0 : 1).aspect, camp: i % 3 ? 0 : 1, vit: 0, x: -4.5 + 3 * (i % 4) + 0.6 * u(id, 3), z: -4.5 + 3 * Math.floor(i / 4) + 0.6 * u(id, 4), cap: 6.28 * u(id, 5), tirT: 9, tv: 0 }) : ({ id, aspect: fabriquer(id, 0).aspect, vit: 1.0 + 0.4 * u(id, 1), x: morts ? -6 + 2.4 * i : repos ? -3 + 1.2 * i : -10 + 3.6 * i, z: repos ? 0 : -0.9 * (i % 2), tirT: 1 + 3 * u(id, 2), tv: 0 }));
  const h = { x: 0, y: 0, z: 0, camp: 0, vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, cap: Math.PI / 2, temps: 0, aspect: null, coup: 0, avant: Infinity, vise: 0, pose: null };
  let dernierT = performance.now(), temps = 0, raf = 0, w = 0, ht = 0;
  function taille() {
    const r = boite.getBoundingClientRect(); const nw = Math.max(80, Math.round(r.width / FACTEUR)), nh = Math.max(80, Math.round(r.height / FACTEUR));
    if (nw !== w || nh !== ht) { w = nw; ht = nh; renderer.setSize(w, ht, false); camera.aspect = w / ht; camera.updateProjectionMatrix(); }
  }
  function image(now) {
    raf = requestAnimationFrame(image);
    const dt = Math.min(0.1, (now - dernierT) / 1000); dernierT = now; temps += dt;
    taille();
    const demi = w / S.ppm / 2 + 2;       // ils traversent l'image et reviennent par l'autre bord
    const E = S.ppm >= 24 ? equipes.fin : equipes.moyen;
    for (const k of Object.keys(equipes)) for (const m of equipes[k].meshes) m.visible = equipes[k] === E;
    E.debut(); lecteur.debut();
    for (const H of hommes) {
      if (!repos) { H.x += H.vit * (S.peur ? 1.6 : 1) * dt; if (H.x > demi) H.x -= 2 * demi; }
      // le tir : un coup toutes les 2,5 à 4,5 s ; `tv` (le `tirVal` du jeu) vaut 1 au coup et perd 1,6 par seconde
      H.tv = Math.max(0, H.tv - 1.6 * dt);
      if (S.feu) { H.tirT -= dt; if (H.tirT <= 0) { H.tv = 1; H.tirT = 2.5 + 2 * u(H.id, Math.floor(temps)); } } else H.tirT = 3;
      const vise = S.feu ? 0.5 : 0;       // sa cible : devant lui, un peu loin de nous (sous le seuil d'EPAULEMENT.vise : il garde son cap de marche)
      Object.assign(h, { x: H.x, z: H.z, vit: repos ? 0 : H.vit * (S.peur ? 1.6 : 1), courbe: S.peur ? 1 : 0, aspect: H.aspect, temps, coup: H.tv, avant: S.feu ? H.tirT : Infinity, vise: H.tv > 0 || H.tirT < EPAULEMENT.avance ? vise : 0,
        tir: A ? Math.max(H.tv > 0 ? 1 - lisse01(((1 - H.tv) / 1.6 - EPAULEMENT.tenue) / EPAULEMENT.baisse) : 0, S.feu && H.tirT < EPAULEMENT.avance ? lisse01(1 - H.tirT / EPAULEMENT.avance) : 0) : Math.min(1, H.tv * 2.5),
        cap: repos ? 0 : !A && H.tv > 0 ? Math.PI / 2 + vise : Math.PI / 2 });      // (sans les démarches : il se tourne tout entier vers sa cible, comme le jeu d'avant)
      h.pose = lecteur.pose(H.id, h, temps);
      if (poses) { h.pose = poses[hommes.indexOf(H)]; h.cap = H.cap; h.camp = H.camp; h.vit = 0; h.tir = 0; h.vise = 0; }
      else h.camp = 0;
      if (chutes) { const i = hommes.indexOf(H), t = (temps + CYCLE - 0.8 * i) % CYCLE - 2; if (t > 0) h.pose = tableau(echantillon(chutes[i], t)); }
      E.ajouter(h);
    }
    E.fin(); lecteur.fin();
    // la caméra du jeu : un champ de 30°, placée pour que 1 m = ppm pixels de l'image ; de profil, elle regarde la colonne de côté
    const cible = new THREE.Vector3(0, morts ? 0.3 : 0.9, morts ? 0 : -0.45), d = ht / (2 * S.ppm * TAN15);
    camera.position.set(cible.x + d * Math.sin(S.yaw) * Math.cos(S.tangage), cible.y + d * Math.sin(S.tangage), cible.z + d * Math.cos(S.yaw) * Math.cos(S.tangage));
    camera.lookAt(cible); camera.near = Math.max(0.02, d * 0.1); camera.far = d + 60; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    legende.textContent = morts ? `${S.ppm} px/m · ${morts === 'chute' ? 'la chute : six hommes tombent tour à tour' : morts === 'avant' ? 'seize morts couchés comme avant' : 'seize morts, chacun sa pose'} · image ${w}×${ht} ×${FACTEUR}` : `${S.ppm} px/m · ${repos ? (geste ? `au repos : ${geste}` : vivant ? 'au repos, vivants' : 'au repos, la pose tenue') : avecAllures ? 'une allure par homme, épaulement avant le coup' : 'les démarches d\'avant'} · ${S.feu ? 'feu en marchant' : 'sans tirer'}${S.peur ? ' · sous le feu, courbés' : ''} · image ${w}×${ht} ×${FACTEUR}`;
  }
  raf = requestAnimationFrame(image);
  return () => { cancelAnimationFrame(raf); for (const E of Object.values(equipes)) E.dispose(); renderer.dispose(); };
}
