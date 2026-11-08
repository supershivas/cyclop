// Le camp dessiné (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md) : un volume par bâtiment bâti de `B.etat.camp` (camp-modeles.js), posé dans la marge arrière, un échafaudage
// tant qu'un chantier dure, un liseré d'os autour du bâtiment choisi. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit ; et rien n'est dessiné hors de la partie bridée
// (`etat.camp.bride`), donc ni le labo ni les tests n'ont de camp ; le jeu à deux en a un par joueur (v0.94.0). Les deux camps sont dessinés : celui d'en face est le nôtre tourné d'un demi-tour.
// Fabrique `creerCamp({ THREE, scene, bataille: () => B, hauteur })`.
import { atelier } from './engins.js?v=0.131.0';
import { BATIR, chantier, regler_creux, regler_camp, vie } from './camp-modeles.js?v=0.131.0';
import { emprisesCamp, emplacementCamp, sortieChars, placesChars, placeAvion, parcChars } from '../camp.js?v=0.131.0';
import { avionsAbimes } from '../genie.js?v=0.131.0';
import { PALETTE as P } from '../palette.js?v=0.131.0';
import { DRAPEAU_U } from './drapeau.js?v=0.131.0';
import { RONDE, pointRonde } from '../ronde.js?v=0.131.0';

const LUEUR = 0.9;      // × la couleur de la matière (mesuré à l'œil sur la partie du premier matin : sans elle, la boue est noire)

export function creerCamp({ THREE, scene, bataille, hauteur }) {
  let A = null, lumiere = null, liseret = null, choisi = null, choisiCamp = 0;
  const vent = { force: 0, ang: 0 };      // le vent du moment (`setVent`) : les drapeaux le suivent comme ceux du front
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
    for (const l of anneaux) scene.remove(l);
    anneaux.length = 0;
    for (const m of modeles.values()) scene.remove(m.pivot);
    modeles.clear();
    if (liseret) { scene.remove(liseret); liseret = null; }
  }
  const sansLiseret = () => { if (liseret) { scene.remove(liseret); liseret = null; } };
  const anneaux = [];                     // les liserés des engins abîmés qu'on peut réparer (v0.130.0)
  function surligner(B, t, montrer) {
    const cibles = [];
    if (montrer && B.etat.camp?.bride) {
      for (const k of avionsAbimes(B.etat, 0)) { const p = placeAvion(B.etat, 0, k); cibles.push([p.x, p.y, 10, 9]); }
      for (const p of placesChars(B.etat, 0)) { const r = p.id !== null && parcChars(B.etat, 0).find(q => q.id === p.id); if (r && r.pv < r.pvMax && r.pv > 0) cibles.push([p.x, p.y, 8, 6]); }
    }
    while (anneaux.length < cibles.length) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.4, 1)), new THREE.LineBasicMaterial({ color: new THREE.Color(P.o), depthTest: false }));
      l.renderOrder = 10; scene.add(l); anneaux.push(l);
    }
    anneaux.forEach((l, i) => {
      const c = cibles[i]; l.visible = !!c; if (!c) return;
      const pulse = 1 + 0.06 * Math.sin(t * 5);
      l.scale.set(c[2] * pulse, 1, c[3] * pulse); l.position.set(c[0], hauteur(c[0], c[1]) + 0.3, c[1]);
    });
  }
  function maj(sombre = 0, t = 0, surligne = false) {
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
        regler_creux(creux); regler_camp(e.camp);
        if (c.niveau) { pivot.add(BATIR[e.cle](A, c.niveau).g); pivot.add(vie(A, e.w, e.d, c.niveau, e.camp === 0 ? P.n : P.x, e.x * 0.01 + e.y * 0.003, e.cle)); }
        if (c.chantier) pivot.add(chantier(A, e.w * (c.niveau ? 1.02 : 0.7), e.d * (c.niveau ? 1.02 : 0.7), c.niveau ? 5 : 4));
        pivot.traverse(o => { if (o.material?.emissive && !o.userData.soldat) matieres.add(o.material); });
        scene.add(pivot);
        m = { pivot, signature }; modeles.set(id, m);
      }
      // posé sur le point le plus haut de l'emprise (plat : le socle descend jusqu'au plus bas)
      m.pivot.position.set(e.x, (h + bas) / 2, e.y); m.pivot.rotation.y = e.rot;
      // seuls les engins vraiment là sont dessinés (v0.130.0) : un avion de la flotte au sol et en vie à sa cellule, un char du stock du parc à sa place ; ceux qui sont partis, abattus ou détruits n'y sont plus
      if (e.cle === 'aerodrome') {
        const E = B.etat, pv = E.avions?.[e.camp] ?? [];
        m.pivot.traverse(o => { if (o.userData.parque !== undefined) o.visible = pv[o.userData.parque] > 0 && !E.mitraillages.some(v => v.camp === e.camp && v.k === o.userData.parque && v.etat === 'vol'); });
      } else if (e.cle === 'chars') {
        const E = B.etat, P = sortieChars(E, e.camp), n = placesChars(E, e.camp).length;
        const sorti = !P || E.chars.some(c => c.camp === e.camp && c.etat !== 'detruit' && Math.hypot(c.x - P.x, c.y - P.y) < 14);      // un char qui sort masque la 1re place le temps de quitter le parc
        m.pivot.traverse(o => { if (o.userData.parc !== undefined) o.visible = o.userData.parc < n && !(o.userData.parc === 0 && sorti); });
      }
    }
    surligner(B, t, surligne);
    // la vie : les drapeaux suivent le vent comme ceux du front, les gardes font leur ronde (le temps du dessin : figés par la pause)
    DRAPEAU_U.uForce.value = vent.force; DRAPEAU_U.uTV.value = t;
    for (const m of modeles.values()) {
      const R = m.pivot.rotation.y, co = Math.cos(R), si = Math.sin(R), px = m.pivot.position.x, py = m.pivot.position.y, pz = m.pivot.position.z;
      m.pivot.traverse(o => {
        const Q = o.userData.ronde;
        if (o.userData.drapeauVent) o.rotation.y = -vent.ang - R;      // tourné vers l'aval, quel que soit le demi-tour du camp d'en face
        else if (Q) {
          const s = Q.s0 + Q.sens * Q.v * t, [x, z] = pointRonde(Q.hx, Q.hz, s), [x2, z2] = pointRonde(Q.hx, Q.hz, s + Q.sens * RONDE.lisse), [x1, z1] = pointRonde(Q.hx, Q.hz, s - Q.sens * RONDE.lisse);
          const cycle = (s - Q.s0) * Q.sens / RONDE.foulee * Math.PI * 2, osc = Math.sin(cycle);      // la phase suit la distance parcourue : les pieds ne glissent pas
          o.position.x = x; o.position.z = z; o.rotation.y = Math.atan2(x2 - x1, z2 - z1);
          o.position.y = hauteur(px + x * co + z * si, pz - x * si + z * co) - py + Math.abs(osc) * 0.035;      // sur le sol de là où il passe (hors du socle plat)
          const M = o.userData.membres;
          M.jambeG.rotation.x = osc * 0.6; M.jambeD.rotation.x = -osc * 0.6; M.brasG.rotation.x = -osc * 0.45; M.brasD.rotation.x = osc * 0.45;
        }
      });
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
  return { maj, vider, setVent(force, ang) { vent.force = force; vent.ang = ang; }, choisir: (cle, camp = 0) => { choisi = cle; choisiCamp = camp; if (!cle) sansLiseret(); } };
}
