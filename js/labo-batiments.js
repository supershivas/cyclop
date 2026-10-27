// Le camp du labo (Jérôme, v0.84.0 : « propose dans le labo des bâtiments pour les unités spéciales : chars, aérodrome, maison des sapeurs, caserne des renforts, artillerie ; les ordres sont donnés en cliquant sur ces bâtiments »).
// Cinq bâtiments dessinés en volumes (`THREE`, 1 unité = 1 m, mêmes arêtes et mêmes couleurs que le reste du jeu), chacun en trois niveaux, puis le camp entier dans la marge arrière du terrain, qui grandit avec les jours.
// Rien n'est dans le jeu. Un clic sur un bâtiment ouvre son papier : ses ordres (ceux des boutons latéraux d'aujourd'hui), le niveau suivant et ce qu'il coûte. Les nombres sont dans `data/batiments.js`
// (des propositions, à mesurer) ; le raisonnement est dans `docs/chantiers/camp-et-ameliorations.md`. Caméra : glisser pour tourner, molette pour zoomer, un clic (sans glisser) choisit un bâtiment.
import { PALETTE as P } from './palette.js?v=0.85.0';
import { loadThree } from './three-lib.js?v=0.85.0';
import { el, bouton, maquette } from './labo-arcade.js?v=0.85.0';
import { atelier, schneider } from './rendu/engins.js?v=0.85.0';
import { BATIMENTS, ORDRE_BATIMENTS, PARCOURS_EXEMPLE, DOTATION } from './data/batiments.js?v=0.85.0';

// ─── Les pièces communes ───────────────────────────────────────────────────
const G = A => new A.THREE.Group();
const soldat = (A, g, x, z) => A.b(g, [0.5, 1.7, 0.35], P.n, [x, 0.85, z], [0, 0, 0], false);          // 0,5 × 1,7 × 0,35 m, comme dans le jeu
const rang = (A, g, x0, z0, n, pas = 0.9, long = 10) => { for (let k = 0; k < n; k++) soldat(A, g, x0 + (k % long) * pas, z0 + Math.floor(k / long) * 1.1); };
// une baraque à pignon : murs w × h × L, toit en deux pans
function baraque(A, g, [x, z], w, L, h, mur, toit, rot = 0) {
  const b = G(A);
  A.b(b, [w, h, L], mur, [0, h / 2, 0]);
  A.prisme(b, [[-w / 2 - 0.3, h], [w / 2 + 0.3, h], [0, h + w * 0.3]], L + 0.6, toit);
  A.b(b, [w * 0.35, h * 0.7, 0.1], P.t, [0, h * 0.35, L / 2 + 0.03], [0, 0, 0], false);                  // la porte
  b.position.set(x, 0, z); b.rotation.y = rot; g.add(b); return b;
}
const arche = (R, n = 12) => { const p = [[-R, 0]]; for (let k = 1; k < n; k++) { const a = Math.PI - k * Math.PI / n; p.push([R * Math.cos(a), R * 0.8 * Math.sin(a)]); } p.push([R, 0]); return p; };
function sol(A, g, w, d, c = P.b) { A.b(g, [w, 0.2, d], c, [0, 0.1, 0], [0, 0, 0], false); }

// un biplan : le nez à +x (rangé face au front par `face`)
function biplan(A, c = P.h) {
  const g = G(A);
  A.b(g, [5.6, 0.8, 0.7], c, [0, 1.1, 0]);
  A.b(g, [1.6, 0.08, 8.4], P.r, [0.4, 2.0, 0]); A.b(g, [1.6, 0.08, 8.4], P.r, [0.4, 0.75, 0]);
  for (const s of [-1, 1]) A.b(g, [0.06, 1.25, 0.06], P.s, [0.9, 1.4, s * 3.6], [0, 0, 0], false);
  A.b(g, [1.2, 0.06, 3], P.r, [-2.6, 1.3, 0]); A.b(g, [0.8, 0.9, 0.06], c, [-2.7, 1.75, 0]);
  A.cyl(g, 0.45, 0.1, P.s, [2.9, 1.1, 0], 'x', 8);
  for (const s of [-1, 1]) A.cyl(g, 0.35, 0.12, P.t, [0.8, 0.35, s * 0.9], 'z', 8);
  A.b(g, [0.05, 0.5, 1.8], P.s, [0.8, 0.6, 0], [0, 0, 0], false);
  return g;
}
// un canon : le tube à +x, relevé
function canon(A, cal) {
  const g = G(A);
  if (cal === '220') {
    A.b(g, [10, 0.5, 3.4], P.s, [0, 0.55, 0]);
    for (const s of [-1, 1]) A.b(g, [11, 0.12, 0.2], P.t, [0, 0.2, s * 1.4], [0, 0, 0], false);
    A.b(g, [3.4, 1.6, 2.4], P.g, [-0.5, 1.6, 0]);
    const t = G(A); t.position.set(0.4, 2.3, 0); t.rotation.z = 0.35; g.add(t);
    A.cyl(t, 0.26, 9, P.s, [4, 0, 0], 'x', 8); A.cyl(t, 0.36, 1.4, P.t, [-0.2, 0, 0], 'x', 8);
    return g;
  }
  const r = cal === '75' ? 0.55 : 0.8;
  for (const s of [-1, 1]) A.cyl(g, r, 0.14, P.t, [0, r, s * (r + 0.4)], 'z', 10);
  A.b(g, [0.2, 0.15, 2 * (r + 0.4)], P.s, [0, r, 0]);
  A.b(g, [cal === '75' ? 2.4 : 3.6, 0.18, 0.25], P.s, [-1.5, 0.25, 0], [0, 0, 0.12]);
  const t = G(A); t.position.set(0, r + 0.5, 0); t.rotation.z = 0.3; g.add(t);
  A.cyl(t, cal === '75' ? 0.1 : 0.17, cal === '75' ? 2.6 : 4.6, P.s, [cal === '75' ? 1 : 1.8, 0, 0], 'x', 8);
  A.b(g, [0.1, cal === '75' ? 1.0 : 1.4, 1.5], P.g, [0.5, r + 0.7, 0]);
  return g;
}
// un échafaudage autour d'une emprise : un chantier
function chantier(A, w, d, h = 4) {
  const g = G(A);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) A.b(g, [0.2, h, 0.2], P.g, [sx * w / 2, h / 2, sz * d / 2]);
  for (const y of [1.4, 2.8]) { for (const sz of [-1, 1]) A.b(g, [w, 0.12, 0.12], P.g, [0, y, sz * d / 2], [0, 0, 0], false); for (const sx of [-1, 1]) A.b(g, [0.12, 0.12, d], P.g, [sx * w / 2, y, 0], [0, 0, 0], false); }
  A.b(g, [w * 0.6, 0.3, d * 0.6], P.b, [0, 0.15, 0]);                   // le tas de planches
  return g;
}

// ─── Les cinq bâtiments ────────────────────────────────────────────────────
// Chacun rend { g, w, d } : le groupe, centré sur son emprise (w le long de x, d le long de z) ; l'avant (le front) est à −z. Un `niveau` de 1 à 3.
const BATIR = {
  artillerie(A, n) {
    const g = G(A); sol(A, g, 34, 22);
    A.b(g, [34, 1.1, 1.2], P.g, [0, 0.75, 10]); for (const s of [-1, 1]) A.b(g, [1.2, 1.1, 20], P.g, [s * 16.4, 0.75, 0]);       // le merlon de sacs
    const poser = (cal, x, z) => { const c = canon(A, cal); c.position.set(x, 0, z); c.rotation.y = Math.PI / 2; g.add(c); };
    for (const x of [-12, -4, 4, 12]) poser('75', x, 5);
    if (n >= 2) for (const x of [-9, 9]) poser('155', x, -2);
    if (n >= 3) poser('220', 0, -7);
    for (const [x, z] of [[-14.5, 9], [14.5, 9], ...(n >= 2 ? [[-14.5, 3]] : []), ...(n >= 3 ? [[14.5, 3]] : [])]) for (let k = 0; k < 3; k++) A.b(g, [1.2, 0.6, 0.8], P.t, [x, 0.5 + (k % 2) * 0.6, z - 0.4 + k * 0.4], [0, 0, 0], false);
    if (n >= 2) baraque(A, g, [-12, 8.2], 3, 5, 1.8, P.s, P.b, Math.PI / 2);                  // l'abri des servants
    return { g, w: 34, d: 22 };
  },
  aerodrome(A, n) {
    const g = G(A); sol(A, g, 84, 40, P.h);
    A.b(g, [80, 0.1, 14], P.v, [0, 0.22, 4], [0, 0, 0], false);                           // la bande d'herbe fauchée
    const hangars = [-32, -19, -6].slice(0, n);
    for (const x of hangars) { A.prisme(g, arche(5), 14, P.r, [x, 0, -16]); A.b(g, [8, 3.4, 0.1], P.t, [x, 1.7, -8.97], [0, 0, 0], false); }
    const avions = [[-32, -5, 0], [20, 4, 0.1], ...(n >= 2 ? [[-19, -5, 0]] : []), ...(n >= 3 ? [[-6, -5, 0], [34, 4, -0.1]] : [])];
    for (const [x, z, r] of avions.slice(0, [0, 2, 3, 5][n])) { const a = biplan(A); a.position.set(x, 0, z); a.rotation.y = Math.PI / 2 + r; g.add(a); }
    if (n >= 2) { for (let k = 0; k < 4; k++) A.cyl(g, 0.3, 0.9, P.b, [12 + (k % 2) * 0.8, 0.55, -14 + Math.floor(k / 2) * 0.8], 'y', 8); baraque(A, g, [24, -16], 4, 6, 2, P.r, P.b); }
    if (n >= 3) { baraque(A, g, [36, -14], 4, 6, 3.4, P.g, P.s); A.b(g, [1.4, 0.4, 1.4], P.t, [36, 4.2, -14]); }
    A.cyl(g, 0.08, 7, P.s, [40, 3.5, -2], 'y', 6); A.cyl(g, 0.6, 2.6, P.o, [38.8, 6.6, -2], 'x', 8, 0.15);        // la manche à air
    return { g, w: 84, d: 40 };
  },
  chars(A, n) {
    const g = G(A); sol(A, g, 32, 30);
    const baies = n === 1 ? [0] : n === 2 ? [-4.8, 4.8] : [-9.6, 0, 9.6];
    for (const x of baies) {
      A.prisme(g, [[-5.2, 0], [-3.6, 3.6], [3.6, 3.6], [5.2, 0]], 12, P.g, [x, 0, 3]);          // le tertre qui couvre la galerie
      A.b(g, [6, 3.1, 0.3], P.t, [x, 1.55, -3.1], [0, 0, 0], false);                         // la porte de la galerie
      for (const s of [-1, 1]) A.b(g, [0.4, 3.3, 0.5], P.b, [x + s * 3.2, 1.65, -3.2]);        // ses poteaux
      A.b(g, [7, 0.4, 0.5], P.b, [x, 3.3, -3.2]);
    }
    const c = schneider(A).groupe; c.position.set(baies[baies.length - 1], 0, -10); c.rotation.y = Math.PI / 2; g.add(c);
    if (n >= 3) {
      for (const s of [-1, 1]) A.b(g, [0.2, 0.15, 28], P.t, [s * 0.75 - 12.6, 0.25, 0], [0, 0, 0], false);                        // la voie de service
      A.b(g, [14, 3.4, 5], P.s, [-1, 1.7, 12.4]); A.prisme(g, [[-7.3, 3.4], [7.3, 3.4], [0, 4.6]], 5.6, P.b, [-1, 0, 12.4]);        // l'atelier
      A.cyl(g, 0.12, 2.2, P.t, [5, 5.6, 12.4], 'y', 6);
      A.b(g, [0.5, 8, 0.5], P.g, [10, 4, 9]); A.b(g, [7, 0.4, 0.4], P.g, [6.6, 8, 9]); A.b(g, [0.1, 3.6, 0.1], P.t, [3.5, 6.2, 9], [0, 0, 0], false);  // la grue
      A.cyl(g, 1, 3.6, P.s, [13.5, 1.1, 10], 'x', 8);                                                                                 // la citerne
    }
    return { g, w: 32, d: 30 };
  },
  sapeurs(A, n) {
    const g = G(A); sol(A, g, 26, 22);
    baraque(A, g, [-6, -4], 5, 9, 2.6, P.g, P.s, Math.PI / 2);
    for (let l = 0; l < 4; l++) A.b(g, [6, 0.25, 1.4], P.g, [-8, 0.35 + l * 0.27, 6], [0, 0, 0], false);           // les madriers
    for (let k = 0; k < 8; k++) A.cyl(g, 0.5, 1, P.h, [1 + k * 1.1, 0.7, 6.5 + (k % 2) * 0.4], 'y', 8);          // les gabions
    if (n >= 2) {
      for (const [x, z] of [[8, -6], [8, -2.5]]) { A.prisme(g, [[-2.6, 0.6], [2.6, 0.6], [2.2, 0], [-2.2, 0]], 1.2, P.b, [x, 0.3, z]); A.b(g, [4, 0.1, 0.8], P.g, [x, 0.7, z], [0, 0, 0], false); }  // les pontons
      for (const x of [4, 7]) { A.b(g, [0.18, 3.2, 0.18], P.g, [x, 1.6, -1.2], [0.3, 0, 0], false); A.b(g, [0.18, 3.2, 0.18], P.g, [x, 1.6, 1.2], [-0.3, 0, 0], false); }          // les chevalets
      rang(A, g, -10, 2, 10);
    }
    if (n >= 3) {
      baraque(A, g, [-8, 9], 4, 5, 2.4, P.s, P.b); A.cyl(g, 0.2, 2.2, P.t, [-8, 4.2, 9], 'y', 6);               // la forge
      A.b(g, [0.4, 6, 0.4], P.g, [10, 3, 8]); A.b(g, [5, 0.3, 0.3], P.g, [7.8, 6, 8]);                              // la grue
      for (const s of [-1, 1]) A.b(g, [10, 0.1, 0.12], P.t, [3, 0.25, 3 + s * 0.45], [0, 0, 0], false);
      A.b(g, [2.2, 0.7, 1.2], P.s, [3, 0.7, 3]); rang(A, g, -10, 3.4, 10);
    }
    return { g, w: 26, d: 22 };
  },
  caserne(A, n) {
    const g = G(A); sol(A, g, 42, 28);
    const places = [[-3.5, -8], [3.5, -8], [-10.5, -8], [10.5, -8], [-3.5, 8], [3.5, 8]];
    const nb = [0, 2, 4, 6][n];
    places.slice(0, nb).forEach(([x, z], k) => { const b = baraque(A, g, [x, z], 5, 14, 2.6, k === 5 && n >= 3 ? P.o : P.g, P.s, 0); void b; });
    if (n >= 3) { A.b(g, [1.6, 0.25, 0.25], P.o, [3.5, 4.6, 8], [0, 0, 0], false); A.b(g, [0.25, 1.6, 0.25], P.o, [3.5, 4.6, 8], [0, 0, 0], false); }          // la croix du poste de secours
    for (let k = 0; k < (n >= 2 ? 4 : 2); k++) A.prisme(g, [[-1.6, 0], [1.6, 0], [0, 2.2]], 3, P.r, [-17 + (k % 2) * 4, 0, -6 + Math.floor(k / 2) * 5]);          // les tentes
    if (n >= 2) { A.b(g, [3, 1.8, 2], P.s, [17, 0.9, 0]); A.cyl(g, 0.2, 2, P.t, [17.8, 2.6, 0.5], 'y', 6); }          // la cuisine roulante
    A.cyl(g, 0.08, 8, P.o, [0, 4, 0], 'y', 6); A.b(g, [2, 1.2, 0.05], P.n, [1.1, 7.3, 0], [0, 0, 0], false);          // le mât et son fanion
    rang(A, g, -4, -1, n >= 3 ? 36 : n >= 2 ? 24 : 12, 0.9, 12);
    return { g, w: 42, d: 28 };
  },
};
const PIED = { artillerie: [34, 22], aerodrome: [84, 40], chars: [32, 30], sapeurs: [26, 22], caserne: [42, 28] };

// ─── Le visionneur : une scène THREE, une caméra qu'on tourne, un clic qui choisit ───
function visionneur(boite, THREE, o) {
  const A = atelier(THREE);
  const rendu = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  rendu.setClearColor(new THREE.Color(P.e)); rendu.domElement.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;touch-action:none';
  boite.append(rendu.domElement);
  const scene = new THREE.Scene(), racine = new THREE.Group(); scene.add(racine);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6)); const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-60, 120, 50); scene.add(soleil);
  const terre = new THREE.Mesh(new THREE.BoxGeometry(900, 1, 700), new THREE.MeshLambertMaterial({ color: new THREE.Color(P.g) })); terre.position.y = -0.55; scene.add(terre);
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 3000);
  const v = { yaw: o.yaw ?? 0.35, tangage: o.tangage ?? 0.7, dist: o.dist, cx: o.cx ?? 0, cz: o.cz ?? 0 };
  let surligne = null, mort = false, raf = 0;
  const placer = () => {
    const w = boite.clientWidth || 640, h = boite.clientHeight || 400, f = Math.max(1, Math.round(h / 400));
    rendu.setSize(Math.ceil(w / f), Math.ceil(h / f), false); cam.aspect = w / h; cam.updateProjectionMatrix();
    cam.position.set(v.cx + v.dist * Math.sin(v.yaw) * Math.cos(v.tangage), v.dist * Math.sin(v.tangage), v.cz + v.dist * Math.cos(v.yaw) * Math.cos(v.tangage));
    cam.lookAt(v.cx, 2, v.cz);
  };
  const boucle = () => { if (mort) return; placer(); o.image?.(); rendu.render(scene, cam); raf = requestAnimationFrame(boucle); };
  raf = requestAnimationFrame(boucle);
  // glisser = tourner ; un clic qui ne bouge pas = choisir
  let bas = null;
  const cv = rendu.domElement;
  cv.onpointerdown = e => { bas = { x: e.clientX, y: e.clientY, yaw: v.yaw, t: v.tangage, bouge: false }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!bas) return; const dx = e.clientX - bas.x, dy = e.clientY - bas.y; if (Math.hypot(dx, dy) > 4) bas.bouge = true; if (bas.bouge) { v.yaw = bas.yaw - dx * 0.006; v.tangage = Math.max(0.15, Math.min(1.35, bas.t + dy * 0.004)); } };
  cv.onpointerup = e => {
    const clic = bas && !bas.bouge; bas = null;
    if (!clic || !o.choisir) return;
    const r = cv.getBoundingClientRect(), rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), cam);
    const hit = rc.intersectObjects(racine.children, true)[0];
    let n = hit?.object; while (n && !n.userData.cle) n = n.parent;
    o.choisir(n?.userData.cle ?? null, n ?? null);
  };
  cv.onwheel = e => { e.preventDefault(); v.dist = Math.max(o.min ?? 25, Math.min(o.max ?? 700, v.dist * (e.deltaY > 0 ? 1.12 : 0.89))); };
  return {
    A, racine, v,
    zoomer: k => { v.dist = Math.max(o.min ?? 25, Math.min(o.max ?? 700, v.dist * (k > 0 ? 0.8 : 1.25))); },
    surligner(n) {
      if (surligne) { scene.remove(surligne); surligne = null; }
      if (n) { surligne = new THREE.Box3Helper(new THREE.Box3().setFromObject(n), new THREE.Color(P.o)); scene.add(surligne); }
    },
    detruire() { mort = true; cancelAnimationFrame(raf); rendu.dispose(); cv.remove(); },
  };
}

// ─── Le papier d'un bâtiment : ce que le clic ouvre ───
function papier(cle, niveau, enChantier) {
  const B = BATIMENTS[cle], N = B.niveaux, nv = N[niveau - 1], suivant = N[niveau];
  const p = el('div'); p.style.cssText = `padding:8px 10px;background:${P.o};color:${P.t};border:1px solid ${P.s};box-shadow:2px 2px 0 ${P.t};font:12px/1.4 monospace;width:min(300px,46%)`;
  const ligne = (t, gras) => { const d = el('div', { textContent: t }); if (gras) d.style.fontWeight = 'bold'; return d; };
  p.append(ligne(`${B.nom} · niveau ${niveau}${enChantier ? ' (agrandissement en cours : fini à l\'aube)' : ''}`, true), ligne(`${nv.nom} : ${nv.effet}`));
  p.append(ligne(`Ordres (touche ${B.touches}) :`, true));
  const ordres = el('div'); ordres.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:3px 0 6px';
  for (const [o, nvOuvre] of B.ordres) {
    const ok = nvOuvre <= niveau;
    const b = el('button', { textContent: ok ? o : `${o} (niveau ${nvOuvre})`, type: 'button' });
    b.style.cssText = `font:inherit;padding:2px 6px;border:1px solid ${P.t};background:${ok ? P.h : P.r};color:${P.t};opacity:${ok ? 1 : 0.55}`;
    ordres.append(b);
  }
  p.append(ordres);
  if (suivant) {
    p.append(ligne(`Améliorer : ${suivant.nom} (${suivant.cout} pts de dotation)`, true), ligne(suivant.effet));
    if (suivant.choix) for (const [nom, effet] of suivant.choix) p.append(ligne(`  ○ ${nom} : ${effet}`));
  } else p.append(ligne('Niveau maximal.', true));
  return p;
}

// ─── Un bâtiment seul, à ses trois niveaux ───
export function maquetteBatiment(stage, cle) {
  let arret = () => {};
  const nettoyer = maquette(stage, ui => {
    let niveau = 1, etat = null, mort = false;
    const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(66vh,540px);overflow:hidden'; stage.append(boite);
    const zone = el('div'); zone.style.cssText = 'position:absolute;right:8px;top:8px;z-index:2;display:flex;justify-content:flex-end;pointer-events:none'; boite.append(zone);
    const refaire = () => {
      if (!etat) return;
      etat.racine.clear();
      const A = etat.A, { g, w, d } = BATIR[cle](A, niveau); g.userData.cle = cle; etat.racine.add(g);
      const echelle = G(A); echelle.userData.cle = null; for (let k = 0; k < 4; k++) soldat(A, echelle, -w / 2 - 3 + k * 0.8, d / 2 + 3); etat.racine.add(echelle);
      const m = BATIMENTS[cle].niveaux[niveau - 1];
      ui.info.textContent = `${BATIMENTS[cle].nom} · niveau ${niveau} · ${m.nom} · ${w} × ${d} m (quatre soldats pour l'échelle) · ${m.cout ? m.cout + ' pts de dotation' : 'donné au départ'}`;
      zone.replaceChildren(papier(cle, niveau, false)); zone.firstChild.style.pointerEvents = 'auto';
    };
    for (const n of [1, 2, 3]) ui.haut.append(bouton(`Niveau ${n}`, () => { niveau = n; refaire(); }));
    ui.haut.append(bouton('Zoom −', () => etat?.zoomer(-1)), bouton('Zoom +', () => etat?.zoomer(1)));
    (async () => {
      const THREE = await loadThree(); if (mort) return;
      const [w, d] = PIED[cle];
      etat = visionneur(boite, THREE, { dist: Math.max(w, d) * 2.6, yaw: Math.PI - 0.55, tangage: 0.55, min: 12, max: 260 });
      refaire();
    })();
    arret = () => { mort = true; etat?.detruire(); };
    return arret;
  });
  return () => { nettoyer(); arret(); };
}

// ─── Le camp entier, qui grandit avec les jours ───
// `disposition` : 'ligne' (le long de la route, derrière les tranchées) ou 'cour' (autour d'une cour, l'aérodrome au fond).
const DISPOSITIONS = {
  ligne: { caserne: [-100, 0], artillerie: [-52, 0], sapeurs: [-14, 0], chars: [20, 0], aerodrome: [80, 0] },
  cour: { caserne: [0, 34], artillerie: [-62, -6], sapeurs: [-50, 44], chars: [62, -6], aerodrome: [0, 100] },
};
export function etatDuCamp(jour) {
  const niveaux = {}, chantier = {};
  for (const ev of PARCOURS_EXEMPLE) {
    if (ev.jour > jour) break;
    for (const [k, nv] of Object.entries(ev)) { if (k === 'jour') continue; if (ev.jour === jour && ev.jour > 1) chantier[k] = nv; else niveaux[k] = nv; }
  }
  return { niveaux, chantier };
}
export function maquetteCamp(stage, disposition) {
  let arret = () => {};
  const nettoyer = maquette(stage, ui => {
    let jour = 12, etat = null, mort = false, choisi = null;
    const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(66vh,540px);overflow:hidden'; stage.append(boite);
    const zone = el('div'); zone.style.cssText = 'position:absolute;right:8px;top:8px;z-index:2;display:flex;justify-content:flex-end;pointer-events:none'; boite.append(zone);
    const jourBouton = el('span', { textContent: '', className: 'releve' });
    const refaire = () => {
      if (!etat) return;
      etat.racine.clear(); etat.groupes = {};
      const A = etat.A, pos = DISPOSITIONS[disposition];
      const route = G(A); A.b(route, [260, 0.12, 5], P.b, [0, 0.07, 0], [0, 0, 0], false); route.userData.cle = null; etat.racine.add(route);
      for (let z = -1; z <= 0; z++) A.b(etat.racine, [300, 1.4, 3], P.s, [0, 0.7, -78 + z * 10], [0, 0, 0], false);          // la quatrième ligne, devant
      const { niveaux, chantier: ch } = etatDuCamp(jour);
      let fait = 0;
      for (const cle of ORDRE_BATIMENTS) {
        const [x, z] = pos[cle], n = niveaux[cle] || 0, vers = ch[cle];
        const g = G(A); g.position.set(x, 0, z); g.userData.cle = cle; g.userData.niveau = n; g.userData.chantier = !!vers;
        if (n) { g.add(BATIR[cle](A, n).g); fait++; }
        if (vers) { const [w, d] = PIED[cle]; const c = chantier(A, w * (n ? 1.02 : 0.7), d * (n ? 1.02 : 0.7), n ? 5 : 4); g.add(c); g.userData.niveau = n; }
        if (!n && !vers) continue;
        etat.racine.add(g); etat.groupes[cle] = g;
      }
      let pts = DOTATION.depart + (jour - 1) * DOTATION.aube; // la dotation approximative du parcours d'exemple, sans les jalons
      ui.info.textContent = `Jour ${jour} sur 12 · ${fait} bâtiment${fait > 1 ? 's' : ''} debout, ${Object.keys(ch).length} chantier${Object.keys(ch).length > 1 ? 's' : ''} · dotation versée jusqu'ici : ${pts} points (+ jalons) · derrière la 4e ligne, dans la marge arrière du terrain actuel`;
      jourBouton.textContent = `Jour ${jour}`;
      etat.surligner(choisi && etat.groupes[choisi] ? etat.groupes[choisi] : null);
      zone.replaceChildren();
      if (choisi && etat.groupes[choisi]) { const g = etat.groupes[choisi]; zone.append(papier(choisi, g.userData.niveau || 1, g.userData.chantier)); }
      else zone.append(Object.assign(el('div', { textContent: 'Cliquez un bâtiment : ses ordres, son niveau, son prix.' }), { style: `padding:6px 10px;background:${P.o};color:${P.t};border:1px solid ${P.s};font:12px monospace` }));
    };
    const aller = j => { jour = Math.max(1, Math.min(12, j)); refaire(); };
    ui.haut.append(bouton('◀ Jour', () => aller(jour - 1)), jourBouton, bouton('Jour ▶', () => aller(jour + 1)), bouton('Jour 1', () => aller(1)), bouton('Jour 6', () => aller(6)), bouton('Jour 12', () => aller(12)),
      bouton('Zoom −', () => etat?.zoomer(-1)), bouton('Zoom +', () => etat?.zoomer(1)), bouton('De dessus', () => { if (etat) { etat.v.tangage = 1.3; etat.v.yaw = 0; } }), bouton('Trois quarts', () => { if (etat) { etat.v.tangage = 0.7; etat.v.yaw = 0.35; } }));
    (async () => {
      const THREE = await loadThree(); if (mort) return;
      etat = visionneur(boite, THREE, {
        dist: disposition === 'ligne' ? 200 : 260, cz: disposition === 'ligne' ? 0 : 40, yaw: 0.2, tangage: 0.75, min: 40, max: 700,
        choisir(cle) { choisi = cle && etat.groupes[cle] ? cle : null; refaire(); },
      });
      refaire();
    })();
    arret = () => { mort = true; etat?.detruire(); };
    return arret;
  });
  return () => { nettoyer(); arret(); };
}
