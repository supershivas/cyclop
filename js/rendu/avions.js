// Les avions de mitraillage dessinés (Jérôme, v0.55.0) : un biplan en volumes, à l'échelle (le SPAD de 8 m pour nous, l'Albatros de 9 m pour eux), par vol de `B.etat.mitraillages`,
// posé à son altitude (avions.js : `positionDe`), cabré ou piqué selon sa pente, avec son ombre sur le sol. En tirant, ses traceurs tombent devant lui et la terre gicle le long de
// la bande ; touché, il fume, il tombe en vrille et laisse une épave qui fume. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit.
// Fabrique `creerAvions({ THREE, scene, bataille, hauteur, effets })` : la bataille change à chaque partie, on la lit à chaque image. `effets` : ceux de eclats.js.
import { atelier } from './engins.js?v=0.93.0';
import { AVIONS_JEU } from './avions-modeles.js?v=0.93.0';
import { positionDe, balayage } from '../avions.js?v=0.93.0';
import { MITRAILLAGE as M } from '../data/mitraillage.js?v=0.93.0';
import { PALETTE as P } from '../palette.js?v=0.93.0';

const MODELE = ['spad', 'albatros'];     // par camp : nous, en face
const SOL = 1.7;                          // m entre le centre du modèle et le bas de ses roues

export function creerAvions({ THREE, scene, bataille, hauteur, effets }) {
  let A = null, lumiere = null, ombreGeo = null, ombreMat = null;
  const modeles = new Map();              // id du vol → { pivot, modele, ombre, lPrec, fumee, rafale }
  let tAff = -1;                          // le temps de jeu dessiné : il rattrape celui de la bataille en douceur (les pas de 1/30 s ne saccadent pas)
  const lampe = () => {                   // une seule lumière pour la scène, partagée avec les chars et les ponts (`scene.userData.lumiere`)
    if (scene.userData.lumiere) { lumiere = scene.userData.lumiere; return; }
    lumiere = new THREE.Group();
    lumiere.add(new THREE.AmbientLight(0xffffff, 1.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
    scene.add(lumiere); scene.userData.lumiere = lumiere;
  };
  function vider() { for (const m of modeles.values()) { scene.remove(m.pivot); scene.remove(m.ombre); } modeles.clear(); tAff = -1; }
  function creer(v) {
    A ??= atelier(THREE);
    if (!ombreGeo) {
      ombreGeo = new THREE.CircleGeometry(1, 14); ombreGeo.rotateX(-Math.PI / 2);
      ombreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.t), transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    }
    const modele = AVIONS_JEU[MODELE[v.camp]](A), pivot = new THREE.Group(); pivot.add(modele.groupe); scene.add(pivot);
    const ombre = new THREE.Mesh(ombreGeo, ombreMat); ombre.renderOrder = 2; scene.add(ombre);
    const m = { pivot, modele, ombre, lPrec: null, fumee: 0, vrille: 0 }; modeles.set(v.id, m);
    return m;
  }
  function maj(dt, sombre = 0) {
    const B = bataille(); if (!B) return;
    const vols = B.etat.mitraillages ?? [];
    if (!vols.length) { if (modeles.size) vider(); return; }
    if (!lumiere) lampe();
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
    const temps = B.etat.temps, jour = B.etat.phase === 'jour';
    const avant = tAff;
    tAff = tAff < 0 || temps < tAff || temps - tAff > 0.5 ? temps : Math.min(temps, tAff + (temps - tAff) * Math.min(1, dt * 18));
    const avance = tAff > avant + 1e-6;       // le jeu va (la pause fige les traceurs)
    const vus = new Set();
    for (const v of vols) {
      vus.add(v.id);
      const m = modeles.get(v.id) ?? creer(v);
      const p = positionDe(v, tAff), sol = hauteur(p.x, p.y);
      m.pivot.visible = m.ombre.visible = jour;
      m.pivot.position.set(p.x, sol + p.h + SOL, p.y);
      m.pivot.rotation.set(0, -p.cap, 0);
      m.modele.groupe.rotation.set(0, 0, p.pente);
      if (p.etat === 'vol') m.modele.helice.rotation.x += dt * 70;
      if (p.etat === 'chute') { m.vrille += dt * 5; m.modele.groupe.rotation.x = m.vrille; m.modele.groupe.rotation.z = p.pente; }
      if (p.etat === 'epave') { m.modele.groupe.rotation.set(0.5, 0.15, -0.12); m.pivot.position.y = sol + 1.0; }
      // l'ombre : sur le sol, sous lui, plus large et plus pâle quand il est haut
      const haut = p.etat === 'epave' ? 0 : p.h;
      m.ombre.position.set(p.x + 0.5 + haut * 0.12, sol + 0.12, p.y + haut * 0.05);
      m.ombre.rotation.y = -p.cap;
      m.ombre.scale.set(m.modele.envergure * 0.5 * (1 + haut * 0.004), 1, m.modele.longueur * 0.5);
      if (!jour) continue;
      if (!avance && p.etat !== 'epave') continue;
      // touché, il fume ; abattu ou épave, plus noir
      if (p.etat === 'chute' || p.etat === 'epave' || (p.etat === 'vol' && v.pv < M.pv * 0.5)) {
        m.fumee -= dt;
        if (m.fumee <= 0) { m.fumee = p.etat === 'epave' ? 0.3 : 0.07; effets.fumeeAvion(p.x, sol + p.h + SOL, p.y, p.etat === 'vol' ? 1 : 2); }
      }
      // la rafale : ses traceurs tombent devant lui, la terre gicle le long de la bande
      const b = balayage(v, tAff);
      if (b.actif) {
        const bx = v.ux, by = v.uy, lat = [-2.2, 2.2], lPrec = m.lPrec ?? b.l - 0.5;
        const hb = hauteur(b.x, b.y);
        for (const dz of lat) {
          const tx = b.x - by * dz, ty = b.y + bx * dz;
          effets.mitraille(p.x + bx * 2 - by * dz * 0.8, sol + p.h + SOL - 0.3, p.y + by * 2 + bx * dz * 0.8, tx, hauteur(tx, ty) + 0.2, ty);
        }
        for (let l = lPrec; l < b.l; l += 1.2) for (const dz of lat) {
          const gx = v.x1 + bx * l - by * (dz + (((l * 7.3) % 1) - 0.5) * 2), gy = v.y1 + by * l + bx * (dz + (((l * 3.1) % 1) - 0.5) * 2);
          effets.gerbeSol(gx, hauteur(gx, gy), gy);
        }
        effets.douilles(p.x, sol + p.h + SOL - 0.6, p.y, b.l - lPrec);
        void hb;
        m.lPrec = b.l;
      } else m.lPrec = null;
    }
    for (const [id, m] of modeles) if (!vus.has(id)) { scene.remove(m.pivot); scene.remove(m.ombre); modeles.delete(id); }
  }
  return { maj, vider };
}
