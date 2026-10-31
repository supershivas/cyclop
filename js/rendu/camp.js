// Le camp dessiné (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md) : un volume par bâtiment bâti de `B.etat.camp` (camp-modeles.js), posé dans la marge arrière, un échafaudage
// tant qu'un chantier dure, un liseré d'os autour du bâtiment choisi. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit ; et rien n'est dessiné hors de la partie bridée
// (`etat.camp.bride`), donc ni le labo ni les tests n'ont de camp ; le jeu à deux en a un par joueur (v0.94.0). Les deux camps sont dessinés : celui d'en face est le nôtre tourné d'un demi-tour.
// Fabrique `creerCamp({ THREE, scene, bataille: () => B, hauteur })`.
import { atelier } from './engins.js?v=0.99.7';
import { BATIR, chantier, regler_creux } from './camp-modeles.js?v=0.99.7';
import { emprisesCamp, emplacementCamp } from '../camp.js?v=0.99.7';
import { PALETTE as P } from '../palette.js?v=0.99.7';

const LUEUR = 0.9;      // × la couleur de la matière (mesuré à l'œil sur la partie du premier matin : sans elle, la boue est noire)

export function creerCamp({ THREE, scene, bataille, hauteur }) {
  let A = null, lumiere = null, liseret = null, choisi = null, choisiCamp = 0;
  const matieres = new Set();             // les matières des volumes du camp : une lueur propre les relève (voir `maj`)
  const modeles = new Map();              // clé du bâtiment → { pivot, signature }
  const lampe = () => {                   // la lumière des volumes, partagée avec les chars et les ponts (`scene.userData.lumiere`)
    if (scene.userData.lumiere) { lumiere = scene.userData.lumiere; return; }
    lumiere = new THREE.Group();
    lumiere.add(new THREE.AmbientLight(0xffffff, 1.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
    scene.add(lumiere); scene.userData.lumiere = lumiere;
  };
  function vider() {
    for (const m of modeles.values()) scene.remove(m.pivot);
    modeles.clear();
    if (liseret) { scene.remove(liseret); liseret = null; }
  }
  const sansLiseret = () => { if (liseret) { scene.remove(liseret); liseret = null; } };
  function maj(sombre = 0) {
    const B = bataille();
    if (!B || !B.etat.camp?.bride) { if (modeles.size) vider(); return; }
    A ??= atelier(THREE);
    if (!lumiere) lampe();
    const vus = new Set();
    // les deux camps (v0.92.0) : le nôtre au sud, celui d'en face au nord, tourné d'un demi-tour ; seul le nôtre se choisit
    for (const e of [...emprisesCamp(B.etat, 0), ...emprisesCamp(B.etat, 1)]) {
      const id = `${e.camp}:${e.cle}`; vus.add(id);
      // la plus haute et la plus basse hauteur de l'emprise, relevées sur une grille de 4 m : le socle est plat et couvre tout le relief (v0.99.5)
      let h = -Infinity, bas = Infinity;
      for (let dx = -e.w / 2; dx <= e.w / 2 + 0.01; dx += 4) for (let dz = -e.d / 2; dz <= e.d / 2 + 0.01; dz += 4) { const v = hauteur(e.x + dx, e.y + dz); h = Math.max(h, v); bas = Math.min(bas, v); }
      const creux = Math.ceil((h - bas) * 4) / 4 + 0.5;
      const c = (e.camp === 0 ? B.etat.camp : B.etat.campEux).batiments[e.cle], signature = `${c.niveau}|${c.chantier ? 1 : 0}|${creux}`;
      let m = modeles.get(id);
      if (!m || m.signature !== signature) {
        if (m) scene.remove(m.pivot);
        const pivot = new THREE.Group();
        regler_creux(creux);
        if (c.niveau) pivot.add(BATIR[e.cle](A, c.niveau).g);
        if (c.chantier) pivot.add(chantier(A, e.w * (c.niveau ? 1.02 : 0.7), e.d * (c.niveau ? 1.02 : 0.7), c.niveau ? 5 : 4));
        pivot.traverse(o => { if (o.material?.emissive) matieres.add(o.material); });
        scene.add(pivot);
        m = { pivot, signature }; modeles.set(id, m);
      }
      // posé sur le point le plus haut de l'emprise (plat : le socle descend jusqu'au plus bas)
      m.pivot.position.set(e.x, h, e.y); m.pivot.rotation.y = e.rot;
    }
    for (const [id, m] of modeles) if (!vus.has(id)) { scene.remove(m.pivot); modeles.delete(id); }
    // sous la lumière commune (celle des chars et des ponts, faite pour des gris clairs), les volumes sombres de la palette (boue, glaise) tombent presque au noir : une lueur propre les relève, éteinte avec la nuit
    for (const mat of matieres) mat.emissive.copy(mat.color).multiplyScalar(LUEUR * (1 - Math.min(1, sombre)));
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
    // le liseré du choisi : un cadre d'os autour de l'emprise, vu à travers les volumes
    const e = choisi && emplacementCamp(B.etat, choisi, choisiCamp);
    if (!e) return sansLiseret();
    if (!liseret || liseret.userData.cle !== `${choisiCamp}:${choisi}`) {
      sansLiseret();
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(e.w + 1.5, 0.4, e.d + 1.5));
      liseret = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(P.o), depthTest: false }));
      liseret.renderOrder = 10; liseret.userData.cle = `${choisiCamp}:${choisi}`; scene.add(liseret);
    }
    liseret.position.copy({ x: e.x, y: hauteur(e.x, e.y), z: e.y });
  }
  return { maj, vider, choisir: (cle, camp = 0) => { choisi = cle; choisiCamp = camp; if (!cle) sansLiseret(); } };
}
