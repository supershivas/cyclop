// Les ponts dessinés (Jérôme, v0.47.2) : un volume par ouvrage de `T.pontsListe` (le terrain de la bataille ; `rendu/ponts-modeles.js` : planches, arches, dos d'âne, chevalets, Warren, suspendu, cordes),
// posé au niveau de son tablier (`pontH`), tourné le long de son trait, long comme lui, large du double de sa demi-largeur. Le sol dessous reste de l'eau : l'eau passe sous le pont. Un ouvrage coupé par un obus
// (`detruit`) disparaît. Le dessin seulement : tout vient du terrain, rien n'y est écrit. Fabrique `creerPonts({ THREE, scene, bataille })`.
import { outils, OUVRAGES } from './ponts-modeles.js?v=0.52.6';
import { typePont } from '../data/ponts.js?v=0.52.6';

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
  function vider() { for (const g of vus.values()) scene.remove(g); vus.clear(); }
  function maj(sombre = 0) {
    const B = bataille(); if (!B) return;
    const T = B.terrain, liste = T.pontsListe;
    if (T !== terrain) { vider(); terrain = T; }
    if (!liste.length && !vus.size) return;
    O ??= outils(THREE);
    for (const [P, g] of vus) if (P.detruit) { scene.remove(g); vus.delete(P); }
    for (const P of liste) {
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
