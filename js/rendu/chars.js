// Les chars d'assaut dessinés (Jérôme, v0.47.0) : un volume par char de `B.etat.chars` (engins.js : le Schneider), posé sur le sol, incliné selon la pente sous lui,
// tourné vers sa route ; les chenilles défilent quand il avance, une épave fume. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit.
// Fabrique `creerChars({ THREE, scene, bataille: () => B, hauteur, fumer })` : la bataille change à chaque partie, on la lit à chaque image.
import { atelier, schneider } from './engins.js?v=0.74.0';

const FABRIQUES = { schneider };

export function creerChars({ THREE, scene, bataille, hauteur, fumer }) {
  let A = null, lumiere = null;
  const modeles = new Map();              // id du char → { pivot, modele, fumee }
  const lampe = () => {                   // les volumes sont éclairés (une lumière ambiante et un soleil bas) ; une seule pour la scène, partagée avec les ponts (`scene.userData.lumiere`)
    if (scene.userData.lumiere) { lumiere = scene.userData.lumiere; return; }
    lumiere = new THREE.Group();
    lumiere.add(new THREE.AmbientLight(0xffffff, 1.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
    scene.add(lumiere); scene.userData.lumiere = lumiere;
  };
  function vider() { for (const m of modeles.values()) scene.remove(m.pivot); modeles.clear(); }
  function maj(dt, sombre = 0) {
    const B = bataille(); if (!B) return;
    const chars = B.etat.chars ?? [];
    if (!chars.length) { if (modeles.size) vider(); return; }
    A ??= atelier(THREE);
    if (!lumiere) lampe();
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
    const vus = new Set();
    for (const c of chars) {
      vus.add(c.id);
      let m = modeles.get(c.id);
      if (!m) {
        const modele = FABRIQUES[c.modele](A), pivot = new THREE.Group(); pivot.add(modele.groupe); scene.add(pivot);
        m = { pivot, modele, fumee: 0 }; modeles.set(c.id, m);
      }
      const L = m.modele.longueur, cap = c.cap ?? (c.camp === 0 ? -Math.PI / 2 : Math.PI / 2);
      const hF = hauteur(c.x + Math.cos(cap) * L / 3, c.y + Math.sin(cap) * L / 3), hB = hauteur(c.x - Math.cos(cap) * L / 3, c.y - Math.sin(cap) * L / 3);
      m.pivot.position.set(c.x, (hF + hB) / 2 + 0.05, c.y);
      m.pivot.rotation.set(0, -cap, 0);
      // plus vivant (Jérôme, v0.59.3) : il tangue au démarrage et au freinage, la coque tremble et roule sur ses chenilles ; le dessin seulement
      const vit = c.etat === 'avance' ? c.v : 0, acc = dt > 0 ? (vit - (m.vp ?? vit)) / dt : 0;
      m.vp = vit; m.t = (m.t ?? 0) + dt; m.lean = (m.lean ?? 0) + (Math.max(-0.05, Math.min(0.05, -acc * 0.05)) - (m.lean ?? 0)) * Math.min(1, dt * 5);
      const k = Math.min(1, vit);
      m.pivot.position.y += Math.sin(m.t * 11) * 0.03 * k;
      m.modele.groupe.rotation.z = Math.atan2(hF - hB, 2 * L / 3) + m.lean;
      m.modele.groupe.rotation.x = Math.sin(m.t * 7) * 0.018 * k;
      m.modele.maj(dt, vit);
      if (c.etat === 'detruit') { m.fumee -= dt; if (m.fumee <= 0) { m.fumee = 0.25; fumer(c.x, c.y); } }
    }
    for (const [id, m] of modeles) if (!vus.has(id)) { scene.remove(m.pivot); modeles.delete(id); }
  }
  return { maj, vider };
}
