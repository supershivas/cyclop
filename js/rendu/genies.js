// Les sections du génie dessinées (Jérôme, v0.66.1 : « un aspect plus humain, comme les autres soldats sans fusil ») : chaque homme de `B.etat.genies[].p` est une petite silhouette (jambes qui marchent,
// buste, tête, casque, un outil sur deux : pelle ou madrier) aux couleurs de son camp, tournée comme il va ; au travail il se penche et frappe. Le dessin seulement : tout vient de l'état de la bataille
// (les hommes marchent en bande et se répartissent seuls, voir genie.js). Fabrique `creerGenies({ THREE, scene, bataille, hauteur })`.
import { PALETTE } from '../palette.js?v=0.84.1';
import { GENIE_DATA } from '../data/genie.js?v=0.84.1';

const MAX = 4 * GENIE_DATA.sections * GENIE_DATA.hommes;      // les deux camps, toutes les sections en l'air
// les pièces : [couleur, taille, position locale (hanche en bas), tourne avec le buste ?, pivot de jambe ?]
const PIECES = [
  ['jambe', [0.2, 0.8, 0.22], [-0.13, 0, 0], false],
  ['jambe', [0.2, 0.8, 0.22], [0.13, 0, 0], false],
  ['vareuse', [0.5, 0.7, 0.3], [0, 1.1, 0], true],
  ['visage', [0.24, 0.24, 0.24], [0, 1.58, 0], true],
  ['casque', [0.3, 0.12, 0.3], [0, 1.78, 0], true],
  ['outil', [0.08, 0.08, 1.1], [0.32, 1.1, 0.25], true],
];

export function creerGenies({ THREE, scene, bataille, hauteur }) {
  const m = new THREE.Matrix4(), base = new THREE.Matrix4(), buste = new THREE.Matrix4(), tmp = new THREE.Matrix4(), c = new THREE.Color();
  let meshes = null, t = 0;      // (créées à la première section : une scène sans génie reste telle qu'elle était, au pixel près)
  const COUL = { jambe: PALETTE.s, visage: PALETTE.h, casque: PALETTE.g, outil: PALETTE.b };
  const cap = new Map();         // « section:homme » → son cap (lissé, gardé à l'arrêt)
  function vider() { if (meshes) for (const x of meshes) { x.count = 0; x.visible = false; } cap.clear(); }
  function maj(dt) {
    const B = bataille(); if (!B) return;
    const genies = B.etat.genies ?? [];
    if (!genies.length) { if (meshes?.[0].visible) vider(); return; }
    if (!meshes) {
      meshes = PIECES.map(([, taille]) => { const x = new THREE.InstancedMesh(new THREE.BoxGeometry(...taille), new THREE.MeshBasicMaterial(), MAX); x.frustumCulled = false; scene.add(x); return x; });
    }
    t += dt;
    let k = 0;
    for (const g of genies) {
      const travaille = g.etat === 'travaille';
      for (let i = 0; i < g.n && k < MAX; i++, k++) {
        const o = i * 4, x = g.p[o], y = g.p[o + 1], vx = g.p[o + 2], vy = g.p[o + 3], sp = Math.hypot(vx, vy), cle = g.id * 64 + i;
        let a = cap.get(cle) ?? (g.camp === 0 ? Math.PI : 0);
        if (sp > 0.15) { let d = Math.atan2(vx, vy) - a; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; a += d * Math.min(1, dt * 8); }
        else if (travaille) a += Math.sin(t * 0.7 + i) * 0.01;
        cap.set(cle, a);
        const marche = Math.min(1, sp), pas = Math.sin(t * 9 + i * 1.3) * 0.7 * marche, frappe = travaille && sp < 0.4 ? 0.35 + 0.35 * Math.sin(t * 3.5 + i * 2.1) : 0;
        base.makeRotationY(a).setPosition(x, hauteur(x, y) + Math.abs(Math.sin(t * 9 + i * 1.3)) * 0.04 * marche, y);
        buste.copy(base).multiply(tmp.makeTranslation(0, 0.8, 0)).multiply(tmp.makeRotationX(frappe + 0.08 * marche)).multiply(tmp.makeTranslation(0, -0.8, 0));
        PIECES.forEach(([nom, taille, pos, surBuste], p) => {
          if (nom === 'outil' && i % 2) { m.makeScale(0, 0, 0); meshes[p].setMatrixAt(k, m); return; }       // (un homme sur deux porte un outil)
          const sens = pos[0] < 0 ? 1 : -1;
          if (nom === 'jambe') m.copy(base).multiply(tmp.makeTranslation(pos[0], 0.8, 0)).multiply(tmp.makeRotationX(pas * sens)).multiply(tmp.makeTranslation(0, -taille[1] / 2, 0));
          else if (nom === 'outil') m.copy(buste).multiply(tmp.makeTranslation(pos[0], pos[1], pos[2] - 0.2)).multiply(tmp.makeRotationX(travaille ? -0.6 - frappe : -0.35));
          else m.copy(surBuste ? buste : base).multiply(tmp.makeTranslation(pos[0], pos[1], pos[2]));
          meshes[p].setMatrixAt(k, m);
          c.set(nom === 'vareuse' ? (g.camp === 0 ? PALETTE.n : PALETTE.x) : COUL[nom]); meshes[p].setColorAt(k, c);
        });
      }
    }
    for (const x of meshes) { x.count = k; x.visible = k > 0; x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; }
  }
  return { maj, vider };
}
