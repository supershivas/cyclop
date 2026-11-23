// Les caprices dessinés (v0.163.0) : le zeppelin (une enveloppe de brume en fuseau, sa nacelle et ses empennages, une croix ou une cocarde de son camp) et la
// nappe de gaz (des bouffées translucides de vert kaki clair, la couleur d'en face, qui roulent au ras du sol et dérivent avec le vent). L'éclipse est dans
// rendu/temps.js (l'obscurité de la nuit), le tremblement de terre dans main.js (la secousse de la vue). Le dessin seulement : tout vient de `etat.caprices.actif`.
// Fabrique `creerCaprices({ THREE, scene, bataille, hauteur })` ; tout est créé au premier caprice qui se voit (une scène sans caprice reste la même au pixel).
import { PALETTE } from '../palette.js?v=0.165.0';
import { capriceActif, positionZeppelin, positionGaz } from '../caprices.js?v=0.165.0';

const BOUFFEES = 18;

export function creerCaprices({ THREE, scene, bataille, hauteur }) {
  let zep = null, gaz = null, lumiere = null;
  const lampe = () => { lumiere = scene.userData.lumiere ?? null; if (lumiere) return; lumiere = new THREE.Group(); lumiere.add(new THREE.AmbientLight(0xffffff, 1.6)); const s = new THREE.DirectionalLight(0xffffff, 1.7); s.position.set(-6, 12, 5); lumiere.add(s); scene.add(lumiere); scene.userData.lumiere = lumiere; };
  const mat = hex => new THREE.MeshLambertMaterial({ color: new THREE.Color(hex), flatShading: true });
  function faireZeppelin() {
    const g = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), mat(PALETTE.r)); env.scale.set(36, 7.5, 7.5); g.add(env);
    const bande = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 1.2, 16), mat(PALETTE.e)); bande.rotation.z = Math.PI / 2; bande.position.x = 10; g.add(bande);
    const nacelle = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 2.6), mat(PALETTE.s)); nacelle.position.set(4, -8.4, 0); g.add(nacelle);
    for (const [x, y, z, w, h, d] of [[-31, 0, 0, 7, 0.4, 16], [-31, 0, 0, 7, 16, 0.4]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(PALETTE.g)); f.position.set(x, y, z); g.add(f); }
    const marque = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 15.4), mat(PALETTE.s)); marque.position.set(-18, 0, 0); g.add(marque);
    g.userData.marque = marque;
    scene.add(g);
    return g;
  }
  function faireGaz() {
    const g = new THREE.Group(), geo = new THREE.SphereGeometry(1, 10, 6);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.x), transparent: true, opacity: 0.32, depthWrite: false });
    for (let k = 0; k < BOUFFEES; k++) { const b = new THREE.Mesh(geo, m); b.userData.k = k; g.add(b); }
    g.renderOrder = 4;
    scene.add(g);
    return g;
  }
  function vider() { if (zep) zep.visible = false; if (gaz) gaz.visible = false; }
  function maj(dt, sombre = 0, tAnim = 0) {
    const B = bataille(); if (!B) return;
    const a = capriceActif(B.etat), t = B.etat.temps;
    if (!a || (a.id !== 'zeppelin' && a.id !== 'gaz')) { vider(); return; }
    if (a.id === 'zeppelin') {
      zep ??= faireZeppelin(); if (!lumiere) lampe();
      const p = positionZeppelin(a, t);
      zep.visible = true;
      zep.position.set(p.x, hauteur(p.x, p.y) + p.h + Math.sin(tAnim * 0.6) * 0.8, p.y);
      zep.rotation.set(0, a.dir > 0 ? 0 : Math.PI, Math.sin(tAnim * 0.4) * 0.02);
      zep.userData.marque.material.color.set(a.camp === 0 ? PALETTE.n : PALETTE.x);
      if (gaz) gaz.visible = false;
      return;
    }
    gaz ??= faireGaz();
    const p = positionGaz(a, t), fade = Math.min(1, (a.fin - t) / 6, (t - a.t0) / 2 + 0.2);
    gaz.visible = true;
    gaz.children[0].material.opacity = 0.32 * Math.max(0, fade) * (1 - 0.5 * Math.min(1, sombre));
    for (const b of gaz.children) {
      const k = b.userData.k, ang = k * 2.4 + tAnim * 0.15 * (k % 2 ? 1 : -1), d = p.r * (0.15 + 0.75 * ((k * 0.618) % 1));
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d * 0.8, s = p.r * (0.28 + 0.18 * ((k * 0.37) % 1)) * (1 + 0.08 * Math.sin(tAnim * 0.9 + k));
      b.position.set(x, hauteur(x, y) + s * 0.25, y); b.scale.set(s, s * 0.42, s);
    }
    if (zep) zep.visible = false;
  }
  return { maj, vider };
}
