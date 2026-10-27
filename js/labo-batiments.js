// Le camp du labo (Jérôme, v0.85.0 : « propose dans le labo des bâtiments pour les unités spéciales : chars, aérodrome, maison des sapeurs, caserne des renforts, artillerie ; les ordres sont donnés en cliquant sur ces bâtiments »).
// Cinq bâtiments dessinés en volumes (`THREE`, 1 unité = 1 m, mêmes arêtes et mêmes couleurs que le reste du jeu), chacun en trois niveaux, puis le camp entier dans la marge arrière du terrain, qui grandit avec les jours.
// Rien n'est dans le jeu. Un clic sur un bâtiment ouvre son papier : ses ordres (ceux des boutons latéraux d'aujourd'hui), le niveau suivant et ce qu'il coûte. Les nombres sont dans `data/batiments.js`
// (des propositions, à mesurer) ; le raisonnement est dans `docs/chantiers/camp-et-ameliorations.md`. Caméra : glisser pour tourner, molette pour zoomer, un clic (sans glisser) choisit un bâtiment.
import { PALETTE as P } from './palette.js?v=0.96.1';
import { loadThree } from './three-lib.js?v=0.96.1';
import { el, bouton, maquette } from './labo-arcade.js?v=0.96.1';
import { atelier } from './rendu/engins.js?v=0.96.1';
import { BATIR, PIED, G, soldat, chantier } from './rendu/camp-modeles.js?v=0.96.1';
import { BATIMENTS, ORDRE_BATIMENTS, PARCOURS_EXEMPLE, DOTATION, CAMP_PLAN } from './data/batiments.js?v=0.96.1';

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
  ligne: CAMP_PLAN.ligne,
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
