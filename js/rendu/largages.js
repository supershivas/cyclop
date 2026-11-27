// Les largages dessinés (v0.162.0) : l'avion qui passe, la caisse sous son parachute (qui s'ouvre en quatre temps, rendu/largages-modeles.js), l'objet qui sort et
// tourne sous la flèche de sa rareté, l'anneau au sol, la brillance du mythique ; le porteur qui ramène un objet de musette (l'objet au-dessus de sa tête) ;
// les drapeaux plantés ; un anneau sous chaque homme boosté. Le dessin seulement : tout vient de `B.etat.largages` (largages.js), rien n'y est écrit.
// Fabrique `creerLargages({ THREE, scene, bataille, hauteur })` ; tout est créé au premier largage (une scène sans largage reste telle qu'elle était, au pixel près :
// un objet three de plus décale les identifiants tirés de `Math.random`, voir docs/domaines/rendu.md). La lumière est celle des engins (`scene.userData.lumiere`).
import { PALETTE } from '../palette.js?v=0.170.7';
import { OBJET, RARETES, LARGAGE as L } from '../data/largages.js?v=0.170.7';
import { positionCaisse, avionDeCaisse, dureeChute } from '../largages.js?v=0.170.7';
import { cacheModeles, construireObjet, fleche, anneau, briller, creerParachute, biplan, tourne, flotte } from './largages-modeles.js?v=0.170.7';

export function creerLargages({ THREE, scene, bataille, hauteur }) {
  let cache = null, lumiere = null;
  const vues = new Map();        // id de caisse → ce qui la dessine
  const halos = [], drapeaux = [];
  let racine = null;
  const lampe = () => {
    if (scene.userData.lumiere) { lumiere = scene.userData.lumiere; return; }
    lumiere = new THREE.Group();
    lumiere.add(new THREE.AmbientLight(0xffffff, 1.6));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.7); soleil.position.set(-6, 12, 5); lumiere.add(soleil);
    scene.add(lumiere); scene.userData.lumiere = lumiere;
  };
  function vider() {
    for (const v of vues.values()) racine.remove(v.groupe);
    vues.clear();
    for (const h of halos) h.visible = false;
    for (const d of drapeaux) d.visible = false;
  }
  function vueDe(c) {
    let v = vues.get(c.id);
    if (v && v.o !== c.o) { racine.remove(v.groupe); vues.delete(c.id); v = null; }
    if (v) return v;
    const O = OBJET[c.o], col = RARETES[O.rarete].couleur, groupe = new THREE.Group();
    const avion = biplan(THREE, cache); avion.visible = false;
    const para = creerParachute(THREE, cache);
    const { groupe: objet } = construireObjet(THREE, O, null, cache);
    objet.scale.setScalar(L.grossi);
    const support = new THREE.Group(), f = fleche(THREE, cache, col, 2.2, !!RARETES[O.rarete].brillance), a = anneau(THREE, col, 1.6);
    support.add(objet, f, a);
    groupe.add(avion, para.groupe, support);
    racine.add(groupe);
    v = { o: c.o, groupe, avion, para, objet, f, a, support, brille: briller(THREE, cache, objet, f, a, 1.4), vu: 0 };
    vues.set(c.id, v);
    return v;
  }
  function maj(dt, sombre = 0, tAnim = 0) {
    const B = bataille(); if (!B) return;
    const LG = B.etat.largages;
    if (!LG || (!LG.caisses.length && !LG.drapeaux.length && !LG.soldats.length)) { if (racine && vues.size) vider(); if (racine) racine.visible = false; return; }
    if (!racine) { cache = cacheModeles(THREE); racine = new THREE.Group(); scene.add(racine); }
    if (!lumiere) lampe();
    racine.visible = true;
    for (const l of lumiere.children) if (l.isLight) l.intensity = (l.isAmbientLight ? 1.6 : 1.7) * (1 - 0.75 * Math.min(1, sombre));
    const t = B.etat.temps, D = dureeChute(), actives = new Set();
    for (const c of LG.caisses) {
      if (c.etat === 'pris' && t - c.t0 > D + 12) continue;
      actives.add(c.id);
      const v = vueDe(c), P = positionCaisse(c, t), sol = hauteur(c.x, c.y);
      // l'avion : quelques secondes avant et après le lâcher
      const ta = t - c.t0;
      v.avion.visible = ta > -6 && ta < 6;
      if (v.avion.visible) { const p = avionDeCaisse(c, t); v.avion.position.set(p.x, sol + p.h + 1.5, p.y); v.avion.rotation.set(0, c.dir > 0 ? 0 : Math.PI, Math.sin(tAnim * 1.3) * 0.05); }
      // la caisse et son parachute
      const auSol = c.etat === 'sol' || c.etat === 'porte' || c.etat === 'pris' || P.phase === 'sol';
      v.para.groupe.visible = P.phase !== 'avion' && !(auSol && ta > D + 9);
      v.para.groupe.position.set(P.x, sol + P.h, P.y);
      v.para.poser({ phase: auSol ? 'sol' : P.phase, tl: ta, ts: P.ts, ta: Math.max(0, ta - D), balancement: L.balancement });
      // l'objet : il sort de la caisse ouverte, tourne et flotte ; porté, il suit son porteur au-dessus de sa tête, plus petit ; pris, il disparaît
      const ouverture = Math.min(1, Math.max(0, (ta - D) / L.ouverture));
      if (c.etat === 'porte') {
        v.support.visible = v.objet.visible = true; v.f.visible = true; v.a.visible = false;
        v.support.position.set(c.px, hauteur(c.px, c.py), c.py);
        v.objet.scale.setScalar(L.grossi * 0.45); v.objet.position.y = 2.4 + flotte(tAnim) * 0.5; v.objet.rotation.y = tourne(tAnim);
        v.f.position.y = 2.4 + v.objet.userData.hauteur * L.grossi * 0.45 + 0.4; v.f.scale.setScalar(0.5); v.f.rotation.y = -tourne(tAnim) * 0.5;
      } else if (c.etat === 'sol' || (c.etat === 'chute' && P.phase === 'sol')) {
        v.support.visible = v.objet.visible = v.f.visible = v.a.visible = ouverture > 0;
        v.support.position.set(c.x, hauteur(c.x, c.y), c.y);
        const y = 0.7 + (L.hauteurObjet - 0.7) * ouverture + (ouverture >= 1 ? flotte(tAnim, c.id * 0.37) : 0);
        v.objet.scale.setScalar(L.grossi); v.objet.position.y = y; v.objet.rotation.y = tourne(tAnim, c.id * 0.37);
        v.f.scale.setScalar(1); v.f.position.y = y + v.objet.userData.hauteur * L.grossi + L.flecheAu + 0.15 * Math.sin(tAnim * 3); v.f.rotation.y = -tourne(tAnim) * 0.5;
      } else v.support.visible = false;
      v.brille?.(tAnim);
    }
    for (const [id, v] of vues) if (!actives.has(id)) { racine.remove(v.groupe); vues.delete(id); }
    // les drapeaux plantés : un mât, le drapeau aux couleurs du camp qui flotte, un liseré de la rareté
    let k = 0;
    for (const d of LG.drapeaux) {
      let g = drapeaux[k];
      if (!g) {
        g = new THREE.Group();
        const mat = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.g)); mat.scale.set(0.08, 4, 0.08); mat.position.y = 2;
        const toile = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.o)); toile.scale.set(1.6, 1, 0.04); toile.position.set(0.82, 3.4, 0); toile.name = 'toile';
        const lis = new THREE.Mesh(cache.boite, cache.plat(RARETES.legendaire.couleur)); lis.scale.set(1.62, 0.14, 0.05); lis.position.set(0.82, 2.86, 0); lis.name = 'lis';
        g.add(mat, toile, lis); racine.add(g); drapeaux.push(g);
      }
      g.visible = true;
      g.position.set(d.x, hauteur(d.x, d.y), d.y);
      const toile = g.getObjectByName('toile'); toile.material = cache.matiere(d.camp === 0 ? PALETTE.n : PALETTE.x);
      toile.rotation.y = Math.sin(tAnim * 2.2 + k) * 0.25; g.rotation.y = 0.4;
      k++;
    }
    for (; k < drapeaux.length; k++) drapeaux[k].visible = false;
    // un anneau de la couleur de l'objet sous chaque homme boosté
    const A = B.armee;
    let h = 0;
    if (LG.soldats.length) {
      const ids = new Map(LG.soldats.map(s => [s.id, s]));
      for (let i = 0; i < A.n && h < 32; i++) {
        const s = ids.get(A.id[i]); if (!s || A.mort[i]) continue;
        let r = halos[h];
        if (!r) { r = anneau(THREE, '#ffffff', 0.9); racine.add(r); halos.push(r); }
        r.material.color.set(RARETES[OBJET[s.o].rarete].couleur);
        r.visible = true; r.position.set(A.x[i], hauteur(A.x[i], A.y[i]) + 0.05, A.y[i]); r.rotation.z = tAnim * 2; r.scale.setScalar(1 + 0.1 * Math.sin(tAnim * 6));
        h++;
      }
    }
    for (; h < halos.length; h++) halos[h].visible = false;
  }
  return { maj, vider, casteurs: () => racine ? [racine] : [] };
}
