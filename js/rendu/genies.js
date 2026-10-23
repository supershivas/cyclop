// Les sections du génie dessinées (Jérôme, v0.66.0) : 20 petites boîtes par section de `B.etat.genies` (autant que d'hommes qui restent), en grille de 5 sur 4, aux couleurs du camp,
// qui avancent en colonne puis se penchent sur la rive quand elles travaillent. Le dessin seulement : tout vient de l'état de la bataille. Fabrique `creerGenies({ THREE, scene, bataille, hauteur })`.
import { PALETTE } from '../palette.js?v=0.66.0';
import { GENIE_DATA } from '../data/genie.js?v=0.66.0';

const MAX = 4 * GENIE_DATA.sections * GENIE_DATA.hommes;      // les deux camps, toutes les sections en l'air

export function creerGenies({ THREE, scene, bataille, hauteur }) {
  const couleur = new THREE.Color(), m = new THREE.Matrix4();
  let maille = null, t = 0;      // (créée à la première section : une scène sans génie reste telle qu'elle était, au pixel près)
  function vider() { if (maille) { maille.count = 0; maille.visible = false; } }
  function maj(dt) {
    const B = bataille(); if (!B) return;
    const genies = B.etat.genies ?? [];
    if (!genies.length) { if (maille?.visible) vider(); return; }
    if (!maille) { maille = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.5, 0.35), new THREE.MeshBasicMaterial(), MAX); maille.frustumCulled = false; scene.add(maille); }
    t += dt;
    let k = 0;
    for (const g of genies) for (let i = 0; i < g.n && k < MAX; i++, k++) {
      const col = i % 5, rang = (i / 5) | 0, au = g.etat === 'travaille';
      const x = g.x + (col - 2) * 0.9, y = g.y + (g.camp === 0 ? 1 : -1) * rang * 0.9 + (au ? 0 : 0);
      const penche = au ? Math.max(0, Math.sin(t * 3 + i * 1.7)) * 0.35 : 0;      // il frappe, se baisse, se relève
      m.makeRotationX(g.camp === 0 ? -penche : penche).setPosition(x, hauteur(x, y) + 0.75 - penche * 0.5, y);
      maille.setMatrixAt(k, m); maille.setColorAt(k, couleur.set(g.camp === 0 ? PALETTE.n : PALETTE.x));
    }
    maille.count = k; maille.visible = k > 0; maille.instanceMatrix.needsUpdate = true;
    if (maille.instanceColor) maille.instanceColor.needsUpdate = true;
  }
  return { maj, vider };
}
