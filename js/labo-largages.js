// Les largages et leurs objets, au labo (en jeu depuis la v0.162.0 ; les modèles sont ceux du jeu : rendu/largages-modeles.js) (Jérôme, 23 nov. : « par instant, des avions passent au-dessus du no man's land et larguent des objets dans des
// caisses en parachute ; lorsqu'elles touchent le sol, un objet en sort ; chaque objet tourne sur lui-même avec une flèche au-dessus de lui de la couleur de
// sa rareté ; le premier joueur qui l'atteint le gagne »). Au labo seulement (sa décision) : rien n'est branché dans le jeu.
// Trois maquettes : la galerie des quarante objets (cliquer un objet donne sa fiche), un objet de près, et le largage (l'avion, la caisse sous son parachute,
// l'objet qui sort, les deux camps qui courent). Les objets et les nombres sont dans data/largages.js ; ce fichier ne fait que les dessiner.
import { PALETTE } from './palette.js?v=0.165.1';
import { loadThree } from './three-lib.js?v=0.165.1';
import { hash2 } from './lib/rng.js?v=0.165.1';
import { OBJETS, RARETES, ORDRE_RARETES, CATEGORIES, ORDRE_CATEGORIES, LARGAGE as L, tirerObjet } from './data/largages.js?v=0.165.1';
import { positionCaisse, avionDeCaisse, dureeChute } from './largages.js?v=0.165.1';
import { cacheModeles as cacheGeometries, construireObjet, fleche, anneau, briller, creerParachute, biplan, tourne, flotte } from './rendu/largages-modeles.js?v=0.165.1';

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

function fiche(O, vraie) {
  const R = RARETES[O.rarete];
  const pastille = el('span'); pastille.style.cssText = `display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:-2px;background:${R.couleur};border:1px solid ${PALETTE.t}`;
  const taille = vraie < 1 ? `${Math.round(vraie * 100)} cm` : `${vraie.toFixed(1).replace('.', ',')} m`;
  return el('div', { className: 'releve' }, pastille, el('b', { textContent: O.nom }), ` · ${R.nom} (${R.poids} caisses sur 100 pour sa rareté) · ${taille} en vrai`,
    ` · ${CATEGORIES[O.cat].nom}`, el('br'), O.effet, el('br'), `Le bandeau : ${O.court}`);
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
  if (mode === 'ouverture') return ouverture(stage, THREE);
  return galerie(stage, THREE);
}

// ── La galerie : un rang par catégorie, du plus commun au plus rare de gauche à droite ──
function galerie(stage, THREE) {
  const cache = cacheGeometries(THREE), F = cadre(stage, THREE, { hauteur: 'min(70vh,600px)' });
  const carte = el('div', { className: 'releve', textContent: 'Cliquer un objet : sa fiche.' });
  stage.append(legendeRaretes(), carte);
  const PAS_X = 1.6, PAS_Z = 1.9, TAILLE = 0.85;
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.b) })); sol.rotation.x = -Math.PI / 2; F.scene.add(sol);
  const items = [];
  [...ORDRE_CATEGORIES].reverse().forEach((ck, rang) => {
    const liste = OBJETS.filter(o => o.cat === ck).sort((a, b) => ORDRE_RARETES.indexOf(a.rarete) - ORDRE_RARETES.indexOf(b.rarete)), z = 6 - rang * PAS_Z;
    const bande = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.s)); bande.scale.set(liste.length * PAS_X + 0.4, 0.04, 1.3); bande.position.set(0, 0.02, z); F.scene.add(bande);
    liste.forEach((O, i) => {
      const { groupe, vraie } = construireObjet(THREE, O, TAILLE, cache);
      const x = (i - (liste.length - 1) / 2) * PAS_X, col = RARETES[O.rarete].couleur;
      const f = fleche(THREE, cache, col, 0.7, !!RARETES[O.rarete].brillance), a = anneau(THREE, col, 0.55);
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
    F.camera.position.set(0, 9, 15.5); F.camera.lookAt(0, 0, 0.2);
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
  stage.append(el('p', {}, bouton('← Précédent', () => montrer(i - 1)), bouton('Suivant →', () => montrer(i + 1))),
    el('p', {}, ...ORDRE_RARETES.map(rk => bouton(RARETES[rk].nom, () => montrer(OBJETS.findIndex(o => o.rarete === rk))))),
    el('p', {}, ...ORDRE_CATEGORIES.map(ck => bouton(CATEGORIES[ck].nom, () => montrer(OBJETS.findIndex(o => o.cat === ck))))), carte);
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

// La caisse dessinée comme en jeu : l'avion, le parachute (ses quatre temps), l'objet ; `c` : { x, y, dir, t0 }, `t` le temps
function dessinCaisse(THREE, cache, scene) {
  const avion = biplan(THREE, cache), para = creerParachute(THREE, cache);
  scene.add(avion, para.groupe);
  return (c, t, auSol) => {
    const P = positionCaisse(c, t), ta = t - c.t0, D = dureeChute();
    avion.visible = ta > -6 && ta < 6;
    if (avion.visible) { const p = avionDeCaisse(c, t); avion.position.set(p.x, p.h + 1.5, p.y); avion.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); }
    para.groupe.visible = P.phase !== 'avion' && !(ta > D + 9);
    para.groupe.position.set(P.x, P.h, P.y);
    para.poser({ phase: auSol || P.phase === 'sol' ? 'sol' : P.phase, tl: ta, ts: P.ts, ta: Math.max(0, ta - D), balancement: L.balancement });
    return P;
  };
}

// ── L'ouverture du parachute, au ralenti : la caméra de près, le temps au quart, en boucle ──
function ouverture(stage, THREE) {
  const cache = cacheGeometries(THREE), F = cadre(stage, THREE, { fond: 'r' });
  let vitesse = 0.25, t = -1.5;
  const releve = el('p', { className: 'releve' });
  stage.append(el('p', {}, ...[[0.1, 'Au dixième'], [0.25, 'Au quart'], [1, 'Vitesse du jeu']].map(([v, n]) => bouton(n, () => { vitesse = v; }))), releve);
  const dessiner = dessinCaisse(THREE, cache, F.scene), c = { x: 0, y: 0, dir: 1, t0: 0 };
  F.image = dt => {
    t += dt * vitesse;
    if (typeof window.__tOuverture === 'number') t = window.__tOuverture;      // (les captures : un instant fixé)
    const D = dureeChute();
    if (t > L.chuteLibre + 4) t = -0.5;
    const P = dessiner(c, t, false);
    const phase = P.phase === 'libre' ? 'la chute libre, sac fermé' : P.phase === 'corolle' ? (P.ts < 0.35 ? 'l\'extraction : la voile sort en fuseau' : P.ts < 1.4 ? 'le gonflement : la coupole dépasse et revient, la caisse balance' : 'la descente : la coupole respire') : 'l\'avion';
    releve.textContent = `${t.toFixed(2).replace('.', ',')} s · ${phase} · (au sol à ${D.toFixed(1).replace('.', ',')} s)`;
    const y = Math.max(0, P.h) + 2.6;
    F.camera.position.set(P.x + 9, y + 2, 13); F.camera.lookAt(P.x, y, 0);
  };
  return () => { F.arreter(); cache.liberer(); };
}

// ── Le largage : l'avion passe, la caisse descend sous son parachute, l'objet sort ; cinq hommes de chaque camp courent ; le premier arrivé le prend ──
function largage(stage, THREE) {
  const cache = cacheGeometries(THREE), F = cadre(stage, THREE, { hauteur: 'min(66vh,560px)', fond: 'r' });
  F.camera.near = 1; F.camera.updateProjectionMatrix();     // (à 60 m, les plans du sol à quelques centimètres l'un de l'autre se battaient avec 5 cm)
  const papier = el('div', { className: 'releve' }), carte = el('div');
  let force = null;
  stage.append(el('p', {}, bouton('Au hasard', () => { force = null; relancer(); }), ...ORDRE_RARETES.map(rk => bouton(RARETES[rk].nom, () => { force = rk; relancer(); }))),
    el('p', {}, bouton('Rejouer', () => relancer())), papier, carte);
  const NOUS = 22, EUX = -22;
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), cache.matiere(PALETTE.b)); sol.rotation.x = -Math.PI / 2; F.scene.add(sol);
  const nml = new THREE.Mesh(new THREE.PlaneGeometry(160, 36), cache.matiere(PALETTE.g)); nml.rotation.x = -Math.PI / 2; nml.position.y = 0.03; F.scene.add(nml);
  for (const z of [NOUS, EUX]) { const t = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.t)); t.scale.set(160, 0.1, 2.4); t.position.set(0, 0.05, z); F.scene.add(t); }
  const hommes = [];
  for (const [camp, z0] of [[0, NOUS], [1, EUX]]) for (let k = 0; k < 16; k++) {
    const m = new THREE.Mesh(cache.boite, cache.matiere(PALETTE[camp ? 'x' : 'n'])); m.scale.set(0.5, 1.7, 0.35);
    const x = -30 + k * 4 + (hash2(k, camp, 9) - 0.5) * 2;
    m.position.set(x, 0.85, z0); F.scene.add(m);
    hommes.push({ m, camp, x0: x, z0 });
  }
  const dessiner = dessinCaisse(THREE, cache, F.scene);
  let S = null, n = 0, T = 0;
  function relancer() {
    n++;
    if (S) { F.scene.remove(S.support); S.anneau.geometry.dispose(); S.anneau.material.dispose(); }
    const O = force ? OBJETS.filter(o => o.rarete === force)[Math.floor(hash2(n, 1, 77) * RARETES[force].objets)] : tirerObjet(hash2(n, 2, 77), hash2(n, 3, 77));
    const { groupe, vraie } = construireObjet(THREE, O, null, cache), col = RARETES[O.rarete].couleur;
    groupe.scale.setScalar(L.grossi);
    const f = fleche(THREE, cache, col, 3.5, !!RARETES[O.rarete].brillance), a = anneau(THREE, col, 2.2), support = new THREE.Group();
    support.add(groupe, f, a); F.scene.add(support);
    const c = { x: (hash2(n, 4, 77) - 0.5) * 24, y: (hash2(n, 5, 77) - 0.5) * 14, dir: 1, t0: 3 };
    T = 0;
    S = { O, c, groupe, f, anneau: a, support, vraie, brille: briller(THREE, cache, groupe, f, a, 1.6), gagnant: null, tPris: 0, coureurs: [] };
    a.visible = f.visible = groupe.visible = false;
    for (const camp of [0, 1]) hommes.filter(H => H.camp === camp).sort((p, q) => Math.abs(p.x0 - c.x) - Math.abs(q.x0 - c.x)).slice(0, L.coureurs).forEach((H, k) => {
      S.coureurs.push({ H, v: 3 + 2 * hash2(n, 10 + k, camp), reaction: 0.5 + 2.5 * hash2(n, 20 + k, camp), x: H.x0, z: H.z0 });
    });
    for (const H of hommes) H.m.position.set(H.x0, 0.85, H.z0);
    papier.textContent = 'Un avion passe au-dessus du no man\'s land…';
    carte.replaceChildren(fiche(O, vraie));
  }
  relancer();
  const cible = new THREE.Vector3(0, 30, 0);
  F.image = dt => {
    T += dt;
    const c = S.c, D = dureeChute(), ta = T - c.t0 - D;
    const P = dessiner(c, T, ta >= 0);
    if (ta >= 0 && !S.gagnant) {
      const o = Math.min(1, ta / L.ouverture), y = 0.7 + (L.hauteurObjet - 0.7) * o + (o >= 1 ? flotte(ta) : 0);
      S.groupe.visible = S.f.visible = S.anneau.visible = true;
      S.support.position.set(c.x, 0, c.y);
      S.groupe.position.y = y; S.groupe.rotation.y = tourne(ta);
      S.f.position.y = y + S.groupe.userData.hauteur * L.grossi + L.flecheAu; S.f.rotation.y = -tourne(ta) * 0.5;
      if (!S.annonce) { S.annonce = true; papier.textContent = 'La caisse touche le sol : les deux camps courent.'; }
    }
    S.brille?.(T);
    const td = ta + L.course;
    for (const C of S.coureurs) {
      if (S.gagnant) { if (C !== S.gagnant) C.z += Math.sign(C.H.z0 - C.z) * Math.min(Math.abs(C.H.z0 - C.z), 2 * dt); }
      else if (td > C.reaction) {
        const dx = c.x - C.x, dz = c.y - C.z, d = Math.hypot(dx, dz), pas = Math.min(d, C.v * dt);
        if (d > 1e-6) { C.x += dx / d * pas; C.z += dz / d * pas; }
        if (ta >= L.ouverture && d - pas <= L.prise) { S.gagnant = C; S.tPris = T; }
      }
      C.H.m.position.set(C.x, 0.85 + (S.gagnant !== C && td > C.reaction ? Math.abs(Math.sin(T * 9 + C.reaction * 5)) * 0.12 : 0), C.z);
    }
    if (S.gagnant) {
      const p = Math.min(1, (T - S.tPris) / 0.5);
      if (p < 1) { S.groupe.scale.setScalar(L.grossi * (1 - p)); S.support.position.x = c.x + (S.gagnant.x - c.x) * p; S.support.position.z = c.y + (S.gagnant.z - c.y) * p; }
      S.groupe.visible = p < 1; S.f.visible = S.anneau.visible = false;
      papier.textContent = S.gagnant.H.camp === 0 ? `Un des nôtres prend « ${S.O.nom} » (${RARETES[S.O.rarete].nom.toLowerCase()}).` : `Un homme d'en face prend « ${S.O.nom} » (${RARETES[S.O.rarete].nom.toLowerCase()}) : il joue contre nous.`;
      if (T - S.tPris > 5) relancer();
    }
    const haut = (P.phase === 'avion' ? L.altitude : Math.max(0, P.h)) * 0.8;
    cible.x += (c.x - cible.x) * Math.min(1, dt * 1.5);
    cible.y += (haut - cible.y) * Math.min(1, dt * 2); cible.z = 0;
    F.camera.position.set(cible.x - 6, 30 + cible.y * 0.4, 60); F.camera.lookAt(cible);
  };
  return () => { F.arreter(); cache.liberer(); };
}
