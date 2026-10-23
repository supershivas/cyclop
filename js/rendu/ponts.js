// Les ponts dessinés (Jérôme, v0.47.2) : un volume par ouvrage de `T.pontsListe` (le terrain de la bataille ; `rendu/ponts-modeles.js` : planches, arches, dos d'âne, chevalets, Warren, suspendu, cordes),
// posé au niveau de son tablier (`pontH`), tourné le long de son trait, long comme lui, large du double de sa demi-largeur. Le sol dessous reste de l'eau : l'eau passe sous le pont. Un ouvrage coupé par un obus
// (`detruit`) disparaît. Le dessin seulement : tout vient du terrain, rien n'y est écrit. Fabrique `creerPonts({ THREE, scene, bataille })`.
import { outils, OUVRAGES } from './ponts-modeles.js?v=0.66.1';
import { typePont } from '../data/ponts.js?v=0.66.1';
import { PALETTE } from '../palette.js?v=0.66.1';
import { hash2 } from '../lib/rng.js?v=0.66.1';

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
  const PIERRE = new Set(['arches', 'dosdane']), METAL = new Set(['warren', 'suspendu']);
  /* Les ruines d'un ouvrage coupé : les piles cassées (hautes près des rives, rases au milieu, certaines manquent), des morceaux de tablier qui pendent de chaque rive vers l'eau,
     des planches à la dérive. Tout vient de l'ouvrage (hash de sa position) : le même dessin à chaque image et chez les deux joueurs. */
  function ruine(P) {
    const g = new THREE.Group(), type = typePont(P.type), L = Math.max(8, P.long + 2), W = Math.max(2, P.r * 2), h = (a, b) => hash2(Math.round(P.x * 10) + a, Math.round(P.y * 10) + b, 7);
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PIERRE.has(type) ? PALETTE.r : METAL.has(type) ? PALETTE.s : PALETTE.b) });
    const sombre = new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.s) });
    const H = Math.max(1, (P.pontH - P.eau) * 0.25), pierre = PIERRE.has(type);
    const boite = (mt, w, hh, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mt); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); };
    const pas = pierre ? 4 : 2.5, n = Math.max(2, Math.round(L / pas));
    for (let i = 0; i <= n; i++) for (const cote of [-1, 1]) {
      const u = i / n, bord = Math.abs(u - 0.5) * 2;                 // 1 aux rives, 0 au milieu
      if (h(i, cote) < 0.08 + 0.3 * (1 - bord)) continue;           // au milieu, beaucoup ont disparu
      const haut = 0.7 + (H + 0.8) * bord * (0.5 + 0.5 * h(i + 20, cote)), x = (u - 0.5) * L, z = cote * (W / 2 - 0.25);
      boite(i % 2 ? mat : sombre, pierre ? 1.1 : 0.5, haut, pierre ? 1.1 : 0.5, x, haut / 2 - 0.5, z, (h(i, cote + 5) - 0.5) * 0.15, 0, (h(i + 9, cote) - 0.5) * 0.25);
    }
    for (const bout of [-1, 1]) {                                    // le tablier qui pend de chaque rive
      const m = 1 + Math.floor(h(bout, 3) * 3);
      for (let q = 0; q < m + 2; q++) {
        const long = 1.8 + h(q, bout + 11) * 2.4, depart = bout * (L / 2 - 0.3 - q * 1.7), z = (h(q + 30, bout) - 0.5) * (W - 1), pente = 0.25 + q * 0.28 + h(q, bout + 40) * 0.2;
        boite(mat, long, 0.12, 0.8 + h(q + 50, bout) * 0.6, depart - bout * long * 0.45, H - 0.15 - Math.sin(pente) * long * 0.45, z, 0, (h(q, bout + 60) - 0.5) * 0.4, bout * pente);
      }
    }
    for (let q = 0; q < 6; q++) boite(mat, 1.5 + h(q, 70) * 1.5, 0.08, 0.3, (h(q, 71) - 0.5) * L, -0.45, (h(q, 72) - 0.5) * (W + 6), 0, h(q, 73) * 3.1, 0);      // des planches à la dérive
    g.position.set(P.mx, P.eau * 0.25 - 0.1, P.mz); g.rotation.y = P.ang;
    return g;
  }
  function vider() { for (const g of vus.values()) scene.remove(g); vus.clear(); for (const g of ruines.values()) scene.remove(g); ruines.clear(); }
  function maj(sombre = 0) {
    const B = bataille(); if (!B) return;
    const T = B.terrain, liste = T.pontsListe;
    if (T !== terrain) { vider(); terrain = T; }
    if (!liste.length && !vus.size && !ruines.size) return;
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
    if (!lumiere) lampe();
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
  }
  return { maj, vider };
}
