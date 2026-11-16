// Le camp dessiné (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md) : un volume par bâtiment bâti de `B.etat.camp` (camp-modeles.js), posé dans la marge arrière, un échafaudage
// tant qu'un chantier dure, un liseré d'os autour du bâtiment choisi. Le dessin seulement : tout vient de l'état de la bataille, rien n'y est écrit ; et rien n'est dessiné hors de la partie bridée
// (`etat.camp.bride`), donc ni le labo ni les tests n'ont de camp ; le jeu à deux en a un par joueur (v0.94.0). Les deux camps sont dessinés : celui d'en face est le nôtre tourné d'un demi-tour.
// Fabrique `creerCamp({ THREE, scene, bataille: () => B, hauteur })`.
import { atelier } from './engins.js?v=0.139.2';
import { BATIR, chantier, regler_creux, regler_camp, vie } from './camp-modeles.js?v=0.139.2';
import { emprisesCamp, emplacementCamp, sortieChars, placesChars, placeAvion, parcChars } from '../camp.js?v=0.139.2';
import { avionsAbimes } from '../genie.js?v=0.139.2';
import { PALETTE as P } from '../palette.js?v=0.139.2';
import { DRAPEAU_U } from './drapeau.js?v=0.139.2';
import { RONDE, pointRonde } from '../ronde.js?v=0.139.2';

const LUEUR = 0.9;      // × la couleur de la matière (mesuré à l'œil sur la partie du premier matin : sans elle, la boue est noire)

// Les pièces fixes d'un bâtiment fusionnées par matière (v0.134.2, Jérôme : un M3 à 83 i/s tout dézoomé, `?perf=1` : three.js 6,3 ms et 2 174 appels de
// dessin, dont ~1 250 pour les douze bâtiments des deux camps, faits de boîtes, de cylindres et de leurs arêtes posés un à un : jusqu'à 340 appels pour un seul).
// Une pièce se fusionne si ni elle ni ses parents n'ont de `userData` (drapeau, ronde, membres, avion ou char garé, soldat : ce qui bouge ou se cache) et si sa
// matière est ordinaire (pas de nuanceur retouché) ; ses sommets passent dans le repère du pivot. Mêmes triangles, mêmes matières : quelques appels par bâtiment.
// Un avion ou un char garé (`parque`, `parc` : il ne fait que se montrer ou se cacher) est fusionné à part, dans son propre groupe.
const CACHES = ['parque', 'parc'];
const seulementCache = o => { const k = Object.keys(o.userData); return k.length > 0 && k.every(c => CACHES.includes(c)); };
function fusionnerFixes(THREE, pivot, racine = pivot) {
  if (racine === pivot) {
    pivot.updateMatrixWorld(true);                       // (le pivot est neuf, à l'origine : `matrixWorld` est le repère du pivot)
    const sous = []; pivot.traverse(o => { if (o !== pivot && seulementCache(o)) sous.push(o); });
    for (const o of sous) fusionnerFixes(THREE, pivot, o);
  }
  const inverse = new THREE.Matrix4().copy(racine.matrixWorld).invert(), m = new THREE.Matrix4();
  const parMatiere = new Map(), retirer = [];
  const mobile = o => { for (let p = o; p && p !== racine; p = p.parent) if (Object.keys(p.userData).length) return true; return false; };
  const ordinaire = m => m && !Array.isArray(m) && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile && !m.userData.soldat;
  // (v0.135.1) on ne parcourt que `racine` : en parcourant tout le pivot, la fusion d'un avion garé avalait les hangars, la piste et la clôture de l'aérodrome, que l'on cachait avec lui quand il
  // décollait (Jérôme : « quand un avion décolle, l'aérodrome disparaît » ; de même le parc des chars le temps qu'un char sorte)
  racine.traverse(o => {
    if (!(o.isMesh || o.isLineSegments) || o.isInstancedMesh || !o.visible || mobile(o) || !ordinaire(o.material)) return;
    const cle = `${o.isMesh ? 'm' : 'l'}${o.material.id}|${o.renderOrder}`;
    if (!parMatiere.has(cle)) parMatiere.set(cle, { exemple: o, geos: [] });
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(m.multiplyMatrices(inverse, o.matrixWorld));
    parMatiere.get(cle).geos.push(g); retirer.push(o);
  });
  for (const o of retirer) o.parent.remove(o);
  for (const { exemple, geos } of parMatiere.values()) {
    const noms = exemple.isMesh ? ['position', 'normal'] : ['position'];
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const geo = new THREE.BufferGeometry();
    for (const nom of noms) {
      const a = new Float32Array(n * 3); let k = 0;
      for (const g of geos) { const s = g.attributes[nom]; if (s) a.set(s.array.subarray(0, s.count * 3), k); k += g.attributes.position.count * 3; }
      geo.setAttribute(nom, new THREE.BufferAttribute(a, 3));
    }
    for (const g of geos) g.dispose();
    const f = exemple.isMesh ? new THREE.Mesh(geo, exemple.material) : new THREE.LineSegments(geo, exemple.material);
    f.renderOrder = exemple.renderOrder;
    racine.add(f);
  }
}

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
      for (const c of B.etat.chars) if (c.camp === 0 && c.etat === 'detruit' && !B.etat.genies.some(g => g.char === c.id)) cibles.push([c.x, c.y, 8, 8]);      // les épaves de nos chars sur le champ : le génie les relève (v0.132.0)
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
        fusionnerFixes(THREE, pivot);
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
    // (v0.135.1) la lueur relève surtout les couleurs sombres : elle décroît avec la clarté de la matière (× (1 − luminance)) ; avant, elle s'ajoutait à toutes, et le bleu horizon, le kaki,
    // l'os et la toile des hangars passaient au blanc à midi (Jérôme : « les avions et les chars sont encore d'une autre couleur que leur armée »)
    for (const mat of matieres) { const c = mat.color, lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; mat.emissive.copy(c).multiplyScalar(LUEUR * (1 - lum) * (1 - Math.min(1, sombre))); }
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
