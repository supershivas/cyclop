// Les largages et leurs objets, au labo (Jérôme, 23 nov. : « par instant, des avions passent au-dessus du no man's land et larguent des objets dans des
// caisses en parachute ; lorsqu'elles touchent le sol, un objet en sort ; chaque objet tourne sur lui-même avec une flèche au-dessus de lui de la couleur de
// sa rareté ; le premier joueur qui l'atteint le gagne »). Au labo seulement (sa décision) : rien n'est branché dans le jeu.
// Trois maquettes : la galerie des quarante objets (cliquer un objet donne sa fiche), un objet de près, et le largage (l'avion, la caisse sous son parachute,
// l'objet qui sort, les deux camps qui courent). Les objets et les nombres sont dans data/largages.js ; ce fichier ne fait que les dessiner.
import { PALETTE } from './palette.js?v=0.161.2';
import { loadThree } from './three-lib.js?v=0.161.2';
import { hash2 } from './lib/rng.js?v=0.161.2';
import { OBJETS, RARETES, ORDRE_RARETES, LARGAGE as L, tirerObjet } from './data/largages.js?v=0.161.2';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const bouton = (t, f) => el('button', { className: 'essai', textContent: t, onclick: f });
const FACTEUR = 2;

export function maquetteLargages(stage, mode = 'galerie') {
  let fini = false, nettoyer = () => {};
  stage.append(el('p', { textContent: 'Chargement des objets…' }));
  (async () => {
    const THREE = await loadThree();
    if (fini) return;
    stage.replaceChildren();
    nettoyer = monter(stage, THREE, mode);
  })().catch(e => { stage.replaceChildren(el('pre', { textContent: `Les objets n'ont pas pu se dessiner : ${e.message}` })); });
  return () => { fini = true; nettoyer(); };
}

// ── Les pièces communes ──

// Un objet en maillages, d'après son modèle (data/largages.js) : posé sur y = 0, centré en x et z, à `taille` mètres de sa plus grande dimension
// (null : sa taille vraie). Rend { groupe, vraie } (la plus grande dimension vraie, en mètres).
function construireObjet(THREE, O, taille, cache) {
  const brut = new THREE.Group();
  const coul = c => c === '*' ? RARETES[O.rarete].couleur : PALETTE[c];
  const brille = !!RARETES[O.rarete].brillance, brillants = [];
  for (const P of O.modele) {
    const g = P.f === 'b' ? cache.boite : P.f === 'c' ? cache.cylindre(P.n) : cache.cone(P.n);
    // le liseré d'un objet qui brille a sa matière à lui (sa couleur change à chaque image) ; les autres partagent celle du cache
    const mat = brille && P.c === '*' ? new THREE.MeshLambertMaterial({ color: new THREE.Color(coul('*')), flatShading: true }) : cache.matiere(coul(P.c));
    if (mat !== cache.matiere(coul(P.c))) brillants.push(mat);
    const m = new THREE.Mesh(g, mat);
    if (P.f === 'b') m.scale.set(...P.t); else m.scale.set(P.t[0], P.t[1], P.t[0]);
    m.position.set(...P.p);
    if (P.r) m.rotation.set(...P.r);
    brut.add(m);
  }
  const b = new THREE.Box3().setFromObject(brut), d = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const vraie = Math.max(d.x, d.y, d.z), k = taille ? taille / vraie : 1;
  brut.position.set(-c.x, -b.min.y, -c.z);
  const groupe = new THREE.Group(), echelle = new THREE.Group();
  echelle.scale.setScalar(k); echelle.add(brut); groupe.add(echelle);
  groupe.userData = { O, hauteur: d.y * k, vraie, brillants };
  return { groupe, vraie };
}

function cacheGeometries(THREE) {
  const cyl = new Map(), con = new Map(), mat = new Map();
  return {
    boite: new THREE.BoxGeometry(1, 1, 1),
    cylindre: n => { if (!cyl.has(n)) cyl.set(n, new THREE.CylinderGeometry(1, 1, 1, n)); return cyl.get(n); },
    cone: n => { if (!con.has(n)) con.set(n, new THREE.ConeGeometry(1, 1, n)); return con.get(n); },
    matiere: hex => { if (!mat.has(hex)) mat.set(hex, new THREE.MeshLambertMaterial({ color: new THREE.Color(hex), flatShading: true })); return mat.get(hex); },
    plat: hex => { const k = 'plat' + hex; if (!mat.has(k)) mat.set(k, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) })); return mat.get(k); },
    liberer() { this.boite.dispose(); for (const g of [...cyl.values(), ...con.values()]) g.dispose(); for (const m of mat.values()) m.dispose(); },
  };
}

// La flèche au-dessus d'un objet : une hampe et une pointe à quatre pans tournée vers le bas, d'une couleur plate (la lumière ne la change pas : elle se lit
// sur tous les sols) ; et un anneau au sol de la même couleur, qui dit où est l'objet quand la flèche sort du cadre. `k` : son échelle (1 = 0,55 m de haut).
function fleche(THREE, cache, couleur, k = 1, propre = false) {
  const g = new THREE.Group(), m = propre ? new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur) }) : cache.plat(couleur);
  g.userData.matiere = m;
  const hampe = new THREE.Mesh(cache.boite, m); hampe.scale.set(0.09 * k, 0.28 * k, 0.09 * k); hampe.position.y = 0.36 * k;
  const pointe = new THREE.Mesh(cache.cone(4), m); pointe.scale.set(0.2 * k, 0.26 * k, 0.2 * k); pointe.rotation.x = Math.PI; pointe.position.y = 0.13 * k;
  g.add(hampe, pointe);
  return g;
}
function anneau(THREE, couleur, rayon) {
  const m = new THREE.Mesh(new THREE.RingGeometry(rayon * 0.82, rayon, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur), side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02;
  return m;
}

// La brillance d'un mythique (`brillance` de sa rareté) : la flèche, l'anneau et le liseré vont d'une couleur à l'autre (rouge, rose) et reviennent en 4 s,
// un éclat d'os les traverse toutes les 1,4 s, et six paillettes d'os tournent autour de l'objet en clignant. Rend une fonction `(t) => void`, ou rien.
function briller(THREE, cache, groupe, f, a, rayon) {
  const R = RARETES[groupe.userData.O.rarete];
  if (!R.brillance) return null;
  // aller et retour (avec trois couleurs, rouge, rose, cyan, le fondu direct du cyan au rouge passait par un gris)
  const cols = [...R.brillance, ...R.brillance.slice(1, -1).reverse()].map(h => new THREE.Color(h)), os = new THREE.Color(PALETTE.o), c = new THREE.Color();
  const mats = [f.userData.matiere, a.material, ...groupe.userData.brillants];
  const paillettes = new THREE.Group(), pm = cache.plat(PALETTE.o);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(cache.boite, pm); p.userData.i = i; paillettes.add(p); }
  groupe.parent.add(paillettes);
  return t => {
    const x = (t / 4) % 1 * cols.length, i = Math.floor(x), u = x - i, s = u * u * (3 - 2 * u);
    c.copy(cols[i]).lerp(cols[(i + 1) % cols.length], s);
    const eclat = Math.max(0, Math.sin(t * Math.PI * 2 / 1.4)) ** 10;
    c.lerp(os, 0.65 * eclat);
    for (const m of mats) m.color.copy(c);
    const h = groupe.userData.hauteur * groupe.scale.x;
    paillettes.visible = groupe.visible;
    for (const p of paillettes.children) {
      const k = p.userData.i, ang = t * 1.3 + k * Math.PI / 3, clin = Math.max(0, Math.sin(t * 5 + k * 2.1)) ** 3;
      p.position.set(Math.cos(ang) * rayon, groupe.position.y + h * (0.2 + 0.6 * ((k * 0.37) % 1)) + 0.1 * Math.sin(t * 2 + k), Math.sin(ang) * rayon);
      p.scale.setScalar(rayon * 0.09 * clin + 1e-4); p.rotation.set(t * 3 + k, t * 2, 0);
    }
  };
}

// Le mouvement d'un objet tombé : un tour en `L.tour` secondes, un flottement de `L.flottement` (amplitude, période), chacun à sa phase
const tourne = (t, phase) => (t / L.tour + phase) * Math.PI * 2;
const flotte = (t, phase) => L.flottement[0] * Math.sin((t / L.flottement[1] + phase) * Math.PI * 2);

function fiche(O, vraie) {
  const R = RARETES[O.rarete];
  const pastille = el('span'); pastille.style.cssText = `display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:-2px;background:${R.couleur};border:1px solid ${PALETTE.t}`;
  const taille = vraie < 1 ? `${Math.round(vraie * 100)} cm` : `${vraie.toFixed(1).replace('.', ',')} m`;
  return el('div', { className: 'releve' }, pastille, el('b', { textContent: O.nom }), ` · ${R.nom} (${R.poids} caisses sur 100 pour sa rareté) · ${taille} en vrai`,
    el('br'), `En jeu (proposition) : ${O.effet}`);
}

function legendeRaretes() {
  return el('p', { className: 'releve' }, ...ORDRE_RARETES.map(k => {
    const R = RARETES[k], s = el('span'); s.style.cssText = `display:inline-block;margin:0 12px 4px 0;white-space:nowrap`;
    const p = el('span'); p.style.cssText = `display:inline-block;width:12px;height:12px;margin-right:5px;vertical-align:-1px;background:${R.couleur};border:1px solid ${PALETTE.t}`;
    s.append(p, `${R.nom} · ${R.objets} objets · ${R.poids} %`); return s;
  }));
}

// Le cadre commun : un canvas en pixels doublés, sans lissage, la caméra du jeu (30°) ; `image(dt, temps, camera)` à chaque image
function cadre(stage, THREE, { hauteur = 'min(62vh,520px)', fond = 's' } = {}) {
  const boite = el('div'); boite.style.cssText = `position:relative;width:100%;height:${hauteur};overflow:hidden`;
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated';
  boite.append(canvas); stage.append(boite);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PALETTE[fond]);
  scene.add(new THREE.HemisphereLight(new THREE.Color(PALETTE.o), new THREE.Color(PALETTE.b), 1.1));
  const soleil = new THREE.DirectionalLight(new THREE.Color(PALETTE.o), 1.6); soleil.position.set(-4, 7, 5); scene.add(soleil);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 600);
  let w = 0, h = 0, raf = 0, avant = performance.now(), temps = 0, image = () => {};
  function taille() {
    const r = boite.getBoundingClientRect(), nw = Math.max(80, Math.round(r.width / FACTEUR)), nh = Math.max(80, Math.round(r.height / FACTEUR));
    if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
  function boucle(now) {
    raf = requestAnimationFrame(boucle);
    const dt = Math.max(0, Math.min(0.1, (now - avant) / 1000)); avant = now; temps += dt;   // (le premier `now` de requestAnimationFrame peut précéder `avant` : un temps négatif)
    taille(); image(dt, temps); renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(boucle);
  return {
    boite, canvas, scene, camera, renderer, set image(f) { image = f; },
    // le rayon de la souris, pour choisir un objet
    viser(e, objets) {
      const r = canvas.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(v, camera);
      const hit = ray.intersectObjects(objets, true)[0];
      if (!hit) return null;
      let o = hit.object; while (o && !o.userData.O) o = o.parent; return o;
    },
    arreter() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}

function monter(stage, THREE, mode) {
  if (mode === 'pres') return objetDePres(stage, THREE);
  if (mode === 'largage') return largage(stage, THREE);
  return galerie(stage, THREE);
}

// ── La galerie : les quarante objets en six rangs, du mythique (devant, la plus grande à l'écran) au commun (au fond) ──
function galerie(stage, THREE) {
  const cache = cacheGeometries(THREE), F = cadre(stage, THREE, { hauteur: 'min(70vh,600px)' });
  const carte = el('div', { className: 'releve', textContent: 'Cliquer un objet : sa fiche.' });
  stage.append(legendeRaretes(), carte);
  const PAS_X = 1.55, PAS_Z = 2.1, TAILLE = 0.85;
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.b) })); sol.rotation.x = -Math.PI / 2; F.scene.add(sol);
  const items = [];
  [...ORDRE_RARETES].reverse().forEach((rk, rang) => {
    const liste = OBJETS.filter(o => o.rarete === rk), z = 5 - rang * PAS_Z;
    const bande = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.s)); bande.scale.set(liste.length * PAS_X + 0.4, 0.04, 1.3); bande.position.set(0, 0.02, z); F.scene.add(bande);
    liste.forEach((O, i) => {
      const { groupe, vraie } = construireObjet(THREE, O, TAILLE, cache);
      const x = (i - (liste.length - 1) / 2) * PAS_X;
      const f = fleche(THREE, cache, RARETES[rk].couleur, 0.7, !!RARETES[rk].brillance);
      const a = anneau(THREE, RARETES[rk].couleur, 0.55);
      const support = new THREE.Group(); support.position.set(x, 0, z); support.add(groupe, f, a);
      F.scene.add(support);
      items.push({ O, groupe, f, vraie, phase: hash2(i, rang, 7), base: 0.25, brille: briller(THREE, cache, groupe, f, a, 0.6) });
    });
  });
  let choisi = null;
  F.canvas.addEventListener('click', e => {
    const g = F.viser(e, items.map(it => it.groupe));
    choisi = g ? items.find(it => it.groupe === g) : null;
    carte.replaceChildren(choisi ? fiche(choisi.O, choisi.vraie) : 'Cliquer un objet : sa fiche.');
  });
  F.canvas.style.cursor = 'pointer';
  F.image = (dt, t) => {
    for (const it of items) {
      const k = it === choisi ? 1.35 : 1, y = it.base + flotte(t, it.phase);
      it.groupe.scale.setScalar(k + (it.groupe.scale.x - k) * Math.exp(-dt * 10));
      it.groupe.rotation.y = tourne(t, it.phase); it.groupe.position.y = y;
      it.f.position.y = y + it.groupe.userData.hauteur * it.groupe.scale.x + 0.25; it.f.rotation.y = -tourne(t, 0) * 0.5;
      it.brille?.(t);
    }
    F.camera.position.set(0, 8.5, 14.5); F.camera.lookAt(0, 0, -0.6);
  };
  return () => { F.arreter(); cache.liberer(); };
}

// ── Un objet de près : un seul, grand, qui tourne ; on passe de l'un à l'autre ──
function objetDePres(stage, THREE) {
  const cache = cacheGeometries(THREE), F = cadre(stage, THREE);
  const carte = el('div');
  let i = 0, courant = null;
  const sol = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.b) })); sol.rotation.x = -Math.PI / 2; F.scene.add(sol);
  function montrer(k) {
    i = (k + OBJETS.length) % OBJETS.length;
    if (courant) { F.scene.remove(courant.support); courant.anneau.geometry.dispose(); courant.anneau.material.dispose(); }
    const O = OBJETS[i], { groupe, vraie } = construireObjet(THREE, O, 1, cache), c = RARETES[O.rarete].couleur;
    const f = fleche(THREE, cache, c, 0.9, !!RARETES[O.rarete].brillance), a = anneau(THREE, c, 0.9), support = new THREE.Group();
    support.add(groupe, f, a); F.scene.add(support);
    courant = { O, groupe, f, anneau: a, support, brille: briller(THREE, cache, groupe, f, a, 0.85) };
    carte.replaceChildren(fiche(O, vraie), el('p', { className: 'releve', textContent: `${i + 1} / ${OBJETS.length}` }));
  }
  const parRarete = ORDRE_RARETES.map(rk => bouton(RARETES[rk].nom, () => montrer(OBJETS.findIndex(o => o.rarete === rk))));
  stage.append(el('p', {}, bouton('← Précédent', () => montrer(i - 1)), bouton('Suivant →', () => montrer(i + 1))), el('p', {}, ...parRarete), carte);
  montrer(0);
  F.image = (dt, t) => {
    const y = 0.35 + flotte(t, 0);
    courant.groupe.rotation.y = tourne(t, 0); courant.groupe.position.y = y;
    courant.f.position.y = y + courant.groupe.userData.hauteur + 0.25; courant.f.rotation.y = -tourne(t, 0) * 0.5;
    courant.brille?.(t);
    F.camera.position.set(0, 2.2, 4.6); F.camera.lookAt(0, 0.75, 0);
  };
  return () => { F.arreter(); cache.liberer(); };
}

// ── Le largage : l'avion passe, la caisse descend sous son parachute, l'objet sort ; cinq hommes de chaque camp courent ; le premier arrivé le prend ──
function largage(stage, THREE) {
  const cache = cacheGeometries(THREE), F = cadre(stage, THREE, { hauteur: 'min(66vh,560px)', fond: 'r' });
  const papier = el('div', { className: 'releve' }), carte = el('div');
  F.camera.near = 1; F.camera.updateProjectionMatrix();     // (à 60 m, les plans du sol à quelques centimètres l'un de l'autre se battaient avec 5 cm)
  let force = null;                                           // null : la rareté au hasard (les poids de data/largages.js) ; sinon une rareté imposée
  stage.append(el('p', {}, bouton('Au hasard', () => { force = null; relancer(); }), ...ORDRE_RARETES.map(rk => bouton(RARETES[rk].nom, () => { force = rk; relancer(); }))),
    el('p', {}, bouton('Rejouer', () => relancer())), papier, carte);

  // le champ : la boue, le no man's land plus clair, nos tranchées devant (z > 0), les leurs au fond
  const NOUS = 22, EUX = -22;
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), cache.matiere(PALETTE.b)); sol.rotation.x = -Math.PI / 2; F.scene.add(sol);
  const nml = new THREE.Mesh(new THREE.PlaneGeometry(160, 36), cache.matiere(PALETTE.g)); nml.rotation.x = -Math.PI / 2; nml.position.y = 0.03; F.scene.add(nml);
  for (const z of [NOUS, EUX]) { const t = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.t)); t.scale.set(160, 0.1, 2.4); t.position.set(0, 0.05, z); F.scene.add(t); }
  for (let k = 0; k < 14; k++) {                              // quelques trous d'obus
    const c = new THREE.Mesh(new THREE.CircleGeometry(1 + 2 * hash2(k, 1, 3), 8), cache.matiere(PALETTE.s)); c.rotation.x = -Math.PI / 2;
    c.position.set((hash2(k, 2, 3) - 0.5) * 70, 0.06, (hash2(k, 3, 3) - 0.5) * 30); F.scene.add(c);
  }
  // les hommes : des boîtes de 0,5 × 1,7 × 0,35 m, comme dans le jeu ; ceux qui ne courent pas restent dans la tranchée
  const hommes = [];
  for (const [camp, z0] of [[0, NOUS], [1, EUX]]) for (let k = 0; k < 16; k++) {
    const m = new THREE.Mesh(cache.boite, cache.matiere(PALETTE[camp ? 'x' : 'n'])); m.scale.set(0.5, 1.7, 0.35);
    const x = -30 + k * 4 + (hash2(k, camp, 9) - 0.5) * 2;
    m.position.set(x, 0.85, z0); F.scene.add(m);
    hommes.push({ m, camp, x0: x, z0 });
  }
  // l'avion : un biplan de boîtes (le fuselage sombre, les ailes de brume)
  const avion = new THREE.Group();
  for (const [w, h, d, x, y, z, c] of [[7, 0.9, 0.9, 0, 0, 0, 's'], [1.6, 0.12, 9, 0.8, 0.7, 0, 'r'], [1.5, 0.12, 8, 0.9, -0.5, 0, 'r'], [0.9, 0.1, 3, -3.2, 0.1, 0, 'r'], [0.8, 1.2, 0.1, -3.2, 0.7, 0, 's'], [0.2, 2.2, 0.2, 3.6, 0, 0, 'e']]) {
    const m = new THREE.Mesh(cache.boite, cache.matiere(PALETTE[c])); m.scale.set(w, h, d); m.position.set(x, y, z); avion.add(m);
  }
  F.scene.add(avion);
  // la caisse sous sa corolle (une demi-sphère d'os à huit pans) et ses quatre suspentes
  const caisse = new THREE.Group(), boiteCaisse = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.g)); boiteCaisse.scale.set(0.9, 0.7, 0.7); boiteCaisse.position.y = 0.35;
  const couvercle = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.h)); couvercle.scale.set(0.95, 0.1, 0.75); couvercle.position.y = 0.75;
  const sangle = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.b)); sangle.scale.set(0.12, 0.72, 0.72); sangle.position.y = 0.36;
  caisse.add(boiteCaisse, couvercle, sangle); F.scene.add(caisse);
  const corolle = new THREE.Group(), toile = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.o), flatShading: true, side: THREE.DoubleSide }));
  toile.scale.y = 0.55; toile.position.y = 4.2; corolle.add(toile);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const s = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.r)); s.scale.set(0.03, 4.3, 0.03);
    s.position.set(sx * 1.2, 2.5, sz * 1.2); s.rotation.set(sz * 0.42, 0, -sx * 0.42); corolle.add(s);
  }
  F.scene.add(corolle);

  let S = null, ancien = null, n = 0;
  function relancer() {
    n++;
    if (S) { F.scene.remove(S.support); S.anneau.geometry.dispose(); S.anneau.material.dispose(); }
    const O = force ? OBJETS.filter(o => o.rarete === force)[Math.floor(hash2(n, 1, 77) * RARETES[force].objets)] : tirerObjet(hash2(n, 2, 77), hash2(n, 3, 77));
    const { groupe, vraie } = construireObjet(THREE, O, null, cache), c = RARETES[O.rarete].couleur;
    groupe.scale.setScalar(L.grossi);
    const f = fleche(THREE, cache, c, 3.5, !!RARETES[O.rarete].brillance), a = anneau(THREE, c, 2.2), support = new THREE.Group();
    support.add(groupe, f, a); F.scene.add(support);
    const brille = briller(THREE, cache, groupe, f, a, 1.6);
    const x = (hash2(n, 4, 77) - 0.5) * 24, z = (hash2(n, 5, 77) - 0.5) * 14;   // où tombe la caisse
    const xLache = x - L.vitesseAvion * 0.6 * L.chuteLibre;      // l'avion lâche un peu avant : la caisse garde sa vitesse le temps de la chute libre
    const hauteurChute = L.altitude - 0.5 * 9.8 * L.chuteLibre ** 2, tSol = L.chuteLibre + hauteurChute / L.descente;
    const tAvion = (xLache + 90) / L.vitesseAvion;              // l'avion part de x = -90
    S = { O, groupe, f, anneau: a, support, vraie, brille, x, z, xLache, tAvion, tSol: tAvion + tSol, t: 0, gagnant: null, tPris: 0, coureurs: [] };
    a.visible = false; f.visible = false; groupe.visible = false;
    // les coureurs : les cinq hommes de chaque camp les plus proches, une vitesse et un temps de réaction à chacun
    for (const camp of [0, 1]) {
      hommes.filter(H => H.camp === camp).sort((p, q) => Math.abs(p.x0 - x) - Math.abs(q.x0 - x)).slice(0, L.coureurs).forEach((H, k) => {
        S.coureurs.push({ H, v: 3 + 2 * hash2(n, 10 + k, camp), reaction: 0.5 + 2.5 * hash2(n, 20 + k, camp), x: H.x0, z: H.z0 });
      });
    }
    for (const H of hommes) H.m.position.set(H.x0, 0.85, H.z0);
    papier.textContent = 'Un avion passe au-dessus du no man\'s land…';
    carte.replaceChildren(fiche(O, vraie));
    ancien = null;
  }
  relancer();

  const cible = new THREE.Vector3(0, 6, 0);
  F.image = (dt, t) => {
    S.t += dt; const T = S.t;
    // l'avion : il traverse à son altitude, d'un bord à l'autre
    avion.position.set(-90 + L.vitesseAvion * T, L.altitude, S.z - 4);
    avion.visible = avion.position.x < 120;
    // la caisse : avant le lâcher, sous l'avion ; puis la chute libre ; puis la descente sous la corolle ; puis au sol
    const tc = T - S.tAvion;
    let cy, cx = S.x;
    if (tc < 0) { caisse.visible = corolle.visible = false; cy = L.altitude; }
    else {
      caisse.visible = true;
      if (tc < L.chuteLibre) { cy = L.altitude - 0.5 * 9.8 * tc * tc; cx = S.xLache + L.vitesseAvion * 0.6 * tc; corolle.visible = false; }
      else {
        const ts = tc - L.chuteLibre, h0 = L.altitude - 0.5 * 9.8 * L.chuteLibre ** 2;
        cy = Math.max(0, h0 - L.descente * ts);
        corolle.visible = true;
        const ouvert = Math.min(1, ts / 0.6);
        toile.scale.set(0.2 + 0.8 * ouvert, 0.55 * (0.4 + 0.6 * ouvert), 0.2 + 0.8 * ouvert);
        const sway = cy > 0 ? L.balancement * Math.sin(ts * 1.7) : 0;
        caisse.rotation.z = corolle.rotation.z = sway;
      }
      caisse.position.set(cx, cy, S.z);
      corolle.position.set(cx, cy, S.z);
    }
    // au sol : la corolle s'affaisse et tombe sur le côté, le couvercle saute, l'objet monte et se met à tourner
    const ta = T - S.tSol;
    if (ta >= 0) {
      if (!ancien) { ancien = true; papier.textContent = 'La caisse touche le sol : les deux camps courent.'; }
      const k = Math.min(1, ta / 2.2);
      corolle.rotation.z = -1.3 * k; corolle.position.y = -0.3 * k; corolle.position.x = S.x + 2.4 * k;
      toile.scale.y = 0.55 * (1 - 0.8 * k);
      corolle.visible = ta < 6;
      const o = Math.min(1, ta / L.ouverture);
      couvercle.position.set(0.6 * o, 0.75 + 1.4 * o * (1 - o) * 2, 0); couvercle.rotation.z = -1.8 * o;
      if (!S.gagnant) {
        const y = 0.7 + (L.hauteurObjet - 0.7) * o + (o >= 1 ? flotte(ta, 0) : 0);
        S.groupe.visible = S.f.visible = S.anneau.visible = true;
        S.support.position.set(S.x, 0, S.z);
        S.groupe.position.y = y; S.groupe.rotation.y = tourne(ta, 0);
        S.f.position.y = y + S.groupe.userData.hauteur * L.grossi + L.flecheAu; S.f.rotation.y = -tourne(ta, 0) * 0.5;
      }
    } else { couvercle.position.set(0, 0.75, 0); couvercle.rotation.z = 0; corolle.position.x = cx; }
    S.brille?.(T);
    // les coureurs partent quand la caisse n'est plus qu'à `L.course` secondes du sol (chacun après son temps de réaction) ; le premier à `L.prise` mètres prend l'objet
    const td = T - (S.tSol - L.course);
    for (const C of S.coureurs) {
      if (S.gagnant) { if (C !== S.gagnant) { C.z += Math.sign(C.H.z0 - C.z) * Math.min(Math.abs(C.H.z0 - C.z), 2 * dt); } }
      else if (td > C.reaction) {
        const dx = S.x - C.x, dz = S.z - C.z, d = Math.hypot(dx, dz);
        const pas = Math.min(d, C.v * dt); if (d > 1e-6) { C.x += dx / d * pas; C.z += dz / d * pas; }
        if (ta >= L.ouverture && d - pas <= L.prise) { S.gagnant = C; S.tPris = T; }
      }
      C.H.m.position.set(C.x, 0.85 + (S.gagnant !== C && td > C.reaction ? Math.abs(Math.sin(T * 9 + C.reaction * 5)) * 0.12 : 0), C.z);
    }
    if (S.gagnant) {
      const p = Math.min(1, (T - S.tPris) / 0.5);
      if (p < 1) { S.groupe.scale.setScalar(L.grossi * (1 - p)); S.groupe.position.y += (1.7 - S.groupe.position.y) * p; S.support.position.x = S.x + (S.gagnant.x - S.x) * p; S.support.position.z = S.z + (S.gagnant.z - S.z) * p; }
      S.groupe.visible = p < 1; S.f.visible = S.anneau.visible = false;
      papier.textContent = S.gagnant.H.camp === 0 ? `Un des nôtres prend « ${S.O.nom} » (${RARETES[S.O.rarete].nom.toLowerCase()}).` : `Un homme d'en face prend « ${S.O.nom} » (${RARETES[S.O.rarete].nom.toLowerCase()}) : il est perdu pour nous.`;
      if (T - S.tPris > 5) relancer();
    }
    // la caméra : derrière nos lignes ; elle suit la caisse en hauteur, puis redescend sur le champ (les deux tranchées) quand elle touche le sol
    const haut = (tc < 0 ? L.altitude : cy) * 0.8;
    cible.x += ((tc < 0 ? avion.position.x * 0.35 : S.x) - cible.x) * Math.min(1, dt * 1.5);
    cible.y += (haut - cible.y) * Math.min(1, dt * 2); cible.z = 0;
    F.camera.position.set(cible.x - 6, 30 + cible.y * 0.4, 60); F.camera.lookAt(cible);
  };
  return () => { F.arreter(); cache.liberer(); };
}
