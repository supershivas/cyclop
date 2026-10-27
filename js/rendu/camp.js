// Le camp dessiné (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md) : un volume par bâtiment bâti de `B.etat.camp` (camp-modeles.js), posé dans la marge arrière, un échafaudage
// tant qu'un chantier dure, un liseré d'os autour du bâtiment choisi. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit ; et rien n'est dessiné hors de la partie bridée
// (`etat.camp.bride`), donc ni le labo, ni les tests, ni le jeu à deux n'ont de camp.
// Fabrique `creerCamp({ THREE, scene, bataille: () => B, hauteur })`.
import { atelier } from './engins.js?v=0.87.1';
import { BATIR, chantier } from './camp-modeles.js?v=0.87.1';
import { emprisesCamp } from '../camp.js?v=0.87.1';
import { PALETTE as P } from '../palette.js?v=0.87.1';

const LUEUR = 0.9;      // × la couleur de la matière (mesuré à l'œil sur la partie du premier matin : sans elle, la boue est noire)

export function creerCamp({ THREE, scene, bataille, hauteur }) {
  let A = null, lumiere = null, liseret = null, choisi = null;
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
    for (const e of emprisesCamp(B.etat)) {
      vus.add(e.cle);
      const c = B.etat.camp.batiments[e.cle], signature = `${c.niveau}|${c.chantier ? 1 : 0}`;
      let m = modeles.get(e.cle);
      if (!m || m.signature !== signature) {
        if (m) scene.remove(m.pivot);
        const pivot = new THREE.Group();
        if (c.niveau) pivot.add(BATIR[e.cle](A, c.niveau).g);
        if (c.chantier) pivot.add(chantier(A, e.w * (c.niveau ? 1.02 : 0.7), e.d * (c.niveau ? 1.02 : 0.7), c.niveau ? 5 : 4));
        pivot.traverse(o => { if (o.material?.emissive) matieres.add(o.material); });
        scene.add(pivot);
        m = { pivot, signature }; modeles.set(e.cle, m);
      }
      // posé sur le point le plus haut de l'emprise (les volumes sont plats : sur une pente, ils s'enterrent d'un côté plutôt que de flotter)
      let h = hauteur(e.x, e.y);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) h = Math.max(h, hauteur(e.x + sx * e.w / 2, e.y + sy * e.d / 2));
      m.pivot.position.set(e.x, h, e.y);
    }
    for (const [cle, m] of modeles) if (!vus.has(cle)) { scene.remove(m.pivot); modeles.delete(cle); }
    // sous la lumière commune (celle des chars et des ponts, faite pour des gris clairs), les volumes sombres de la palette (boue, glaise) tombent presque au noir : une lueur propre les relève, éteinte avec la nuit
    for (const mat of matieres) mat.emissive.copy(mat.color).multiplyScalar(LUEUR * (1 - Math.min(1, sombre)));
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
    // le liseré du choisi : un cadre d'os autour de l'emprise, vu à travers les volumes
    const e = choisi && emprisesCamp(B.etat).find(x => x.cle === choisi);
    if (!e) return sansLiseret();
    if (!liseret || liseret.userData.cle !== choisi) {
      sansLiseret();
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(e.w + 1.5, 0.4, e.d + 1.5));
      liseret = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(P.o), depthTest: false }));
      liseret.renderOrder = 10; liseret.userData.cle = choisi; scene.add(liseret);
    }
    liseret.position.copy(modeles.get(choisi)?.pivot.position ?? liseret.position);
  }
  return { maj, vider, choisir: cle => { choisi = cle; if (!cle) sansLiseret(); } };
}
