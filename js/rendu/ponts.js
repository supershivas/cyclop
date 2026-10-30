// Les ponts dessinés (Jérôme, v0.47.2) : un volume par ouvrage de `T.pontsListe` (le terrain de la bataille ; `rendu/ponts-modeles.js` : planches, arches, dos d'âne, chevalets, Warren, suspendu, cordes),
// posé au niveau de son tablier (`pontH`), tourné le long de son trait, long comme lui, large du double de sa demi-largeur. Le sol dessous reste de l'eau : l'eau passe sous le pont. Un ouvrage coupé par un obus
// (`detruit`) disparaît. Le dessin seulement : tout vient du terrain, rien n'y est écrit. Fabrique `creerPonts({ THREE, scene, bataille })`.
import { outils, OUVRAGES } from './ponts-modeles.js?v=0.99.1';
import { typePont } from '../data/ponts.js?v=0.99.1';
import { PALETTE } from '../palette.js?v=0.99.1';
import { hash2 } from '../lib/rng.js?v=0.99.1';

export function creerPonts({ THREE, scene, bataille }) {
  let O = null, lumiere = null, terrain = null;
  const vus = new Map();                    // ouvrage → son groupe
  const lampe = () => {                     // la lumière des volumes, partagée avec les chars (`scene.userData.lumiere`)
    if (scene.userData.lumiere) { lumiere = scene.userData.lumiere; return; }
    lumiere = new THREE.Group();
    lumiere.add(new THREE.AmbientLight(0xffffff, 1.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
    scene.add(lumiere); scene.userData.lumiere = lumiere;
  };
  const ruines = new Map();                 // ouvrage coupé → son groupe de ruines (v0.66.1)
  const fantomes = new Map();               // ouvrage coupé → ses arêtes (v0.67.0 : on les montre quand on vise avec le génie)
  const PIERRE = new Set(['arches', 'dosdane']);
  const dimensions = P => ({ H: Math.max(1, (P.pontH - P.eau) * 0.25), L: Math.max(8, P.long + 2), W: Math.max(2, P.r * 2) });
  /* Les ruines d'un ouvrage coupé (Jérôme, v0.67.0 : « il faut garder plus d'éléments non-détruits ») : le vrai ouvrage, dont on n'ôte que la partie du milieu (un plan de coupe de chaque côté d'une brèche
     de 26 à 46 % de la portée, décalée vers une rive) : les deux têtes de pont restent debout, tablier, piles, arches, parapets, avec quelques pièces en moins près de la brèche, des morceaux de tablier qui pendent
     et des planches à la dérive. Tout vient de l'ouvrage (hash de sa position) : le même dessin à chaque image et chez les deux joueurs. */
  function ruine(P) {
    const g = new THREE.Group(), type = typePont(P.type), { H, L, W } = dimensions(P), h = (a, b) => hash2(Math.round(P.x * 10) + a, Math.round(P.y * 10) + b, 7);
    const modele = OUVRAGES[type](O, { L, W, H }).g;
    const demi = L * (0.13 + 0.1 * h(1, 2)), centre = (h(3, 4) - 0.5) * L * 0.16;       // la brèche, en x local
    const axe = new THREE.Vector3(Math.cos(P.ang), 0, -Math.sin(P.ang)), o = new THREE.Vector3(P.mx, P.pontH * 0.25, P.mz);
    const plans = [new THREE.Plane().setFromNormalAndCoplanarPoint(axe, o.clone().addScaledVector(axe, centre + demi)),
      new THREE.Plane().setFromNormalAndCoplanarPoint(axe.clone().negate(), o.clone().addScaledVector(axe, centre - demi))];
    modele.updateMatrixWorld(true);
    const ote = [];
    modele.traverse(m => {
      if (!m.isMesh && !m.isLineSegments) return;
      const bb = new THREE.Box3().setFromObject(m), cx = (bb.min.x + bb.max.x) / 2;
      if (bb.max.x - bb.min.x < L * 0.35 && Math.abs(cx - centre) < demi + L * 0.08 && hash2(Math.round(cx * 10), Math.round((bb.min.y + bb.max.y) * 5), 5) > 0.45) { ote.push(m); return; }   // près de la brèche, des pièces manquent
      m.material = m.material.clone(); m.material.clippingPlanes = plans; m.material.clipIntersection = true;
    });
    for (const m of ote) m.parent.remove(m);
    g.add(modele);
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PIERRE.has(type) ? PALETTE.r : PALETTE.b) });
    const boite = (w, hh, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); };
    for (const bout of [-1, 1]) {                                    // le tablier qui pend au bord de la brèche
      const bord = centre + bout * demi, m = 1 + Math.floor(h(bout, 3) * 2);
      for (let q = 0; q < m; q++) {
        const long = 1.4 + h(q, bout + 11) * 1.8, pente = 0.35 + q * 0.3 + h(q, bout + 40) * 0.2, z = (h(q + 30, bout) - 0.5) * (W - 1);
        boite(long, 0.14, 0.8 + h(q + 50, bout) * 0.6, bord - bout * long * 0.45 + bout * 0.1, -0.1 - Math.sin(pente) * long * 0.45 - q * 0.3, z, 0, (h(q, bout + 60) - 0.5) * 0.4, bout * pente);
      }
    }
    for (let q = 0; q < 5; q++) boite(1.5 + h(q, 70) * 1.5, 0.08, 0.3, centre + (h(q, 71) - 0.5) * (2 * demi + 4), -H - 0.1, (h(q, 72) - 0.5) * (W + 6), 0, h(q, 73) * 3.1, 0);      // des planches à la dérive
    g.position.set(P.mx, P.pontH * 0.25, P.mz); g.rotation.y = P.ang;
    return g;
  }
  /* L'ouvrage tel qu'il était, en arêtes seulement : l'emplacement d'un pont coupé, pour le génie qui doit le refaire (Jérôme, v0.67.0). Visible à travers tout, d'un trait clair. */
  function fantome(P) {
    const { H, L, W } = dimensions(P), modele = OUVRAGES[typePont(P.type)](O, { L, W, H }).g, g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.o), transparent: true, opacity: 0.85, depthTest: false });
    modele.updateMatrixWorld(true);
    modele.traverse(m => {
      if (!m.isMesh) return;
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), mat); l.applyMatrix4(m.matrixWorld); l.renderOrder = 6; g.add(l);
    });
    g.position.set(P.mx, P.pontH * 0.25, P.mz); g.rotation.y = P.ang;
    return g;
  }
  function vider() { for (const g of vus.values()) scene.remove(g); vus.clear(); for (const g of ruines.values()) scene.remove(g); ruines.clear(); for (const g of fantomes.values()) scene.remove(g); fantomes.clear(); }
  function maj(sombre = 0, aretes = false) {
    const B = bataille(); if (!B) return;
    const T = B.terrain, liste = T.pontsListe;
    if (T !== terrain) { vider(); terrain = T; }
    if (!liste.length && !vus.size && !ruines.size && !fantomes.size) return;
    O ??= outils(THREE);
    for (const [P, g] of vus) if (P.detruit) { scene.remove(g); vus.delete(P); }
    for (const [P, g] of ruines) if (!P.detruit) { scene.remove(g); ruines.delete(P); }
    for (const P of liste) {
      if (P.detruit && !ruines.has(P)) { const g = ruine(P); scene.add(g); ruines.set(P, g); }
      if (P.detruit || vus.has(P)) continue;
      const H = Math.max(1, (P.pontH - P.eau) * 0.25), L = Math.max(8, P.long + 2), W = Math.max(2, P.r * 2);
      const modele = OUVRAGES[typePont(P.type)](O, { L, W, H }), g = new THREE.Group();
      g.add(modele.g); g.position.set(P.mx, P.pontH * 0.25, P.mz); g.rotation.y = P.ang;
      scene.add(g); vus.set(P, g);
    }
    for (const [P, g] of fantomes) if (!P.detruit) { scene.remove(g); fantomes.delete(P); }
    for (const P of liste) {                                         // les arêtes des ouvrages coupés, seulement quand le génie vise
      if (!P.detruit) continue;
      if (aretes && !fantomes.has(P)) { const g = fantome(P); scene.add(g); fantomes.set(P, g); }
      if (fantomes.has(P)) fantomes.get(P).visible = aretes;
    }
    if (!lumiere) lampe();
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
  }
  return { maj, vider };
}
