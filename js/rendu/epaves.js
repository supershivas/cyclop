// Les épaves dessinées (Jérôme, 1er novembre) : un biplan écrasé se disperse (le fuselage glisse, ses ailes, sa queue, son moteur et ses roues partent chacun de leur côté, à plat, sur la tranche ou sur le dos, un peu enterrés)
// et un char détruit gît abîmé de façon différente à chaque fois. La disposition vient de js/epaves.js (un hachage de la graine) ; ici on monte les volumes à partir des pièces (avions-modeles.js, engins.js), on les pose sur le
// sol (`poser`), et on rejoue la dispersion de l'instant où la carcasse touche le sol (`animer`). Le dessin seulement : rien de l'état, rien de la sauvegarde.
import { biplanPieces, AVIONS_OPTS } from './avions-modeles.js?v=0.111.0';
import { schneiderEpave } from './engins.js?v=0.111.0';
import { dispositionAvion, dispositionChar } from '../epaves.js?v=0.111.0';

const SOL_AVION = 1.7;           // m entre le centre du modèle et le bas de ses roues (le même que rendu/avions.js)

/* Un biplan écrasé. `modele` : 'spad' | 'albatros'. Le repère de la racine : l'avant (le cap de la chute) à +x, la droite à +z, le sol à y = 0 au point d'arrêt.
   Rend { racine, animer(u), poser(hauteur), pieces, D } : `poser(f)` règle chaque pièce sur le sol (`f(x, z)` : la hauteur du terrain en repère monde moins celle du point d'arrêt, la racine devant avoir sa place dans la scène),
   `animer(u)` met les pièces à l'instant u (0 : l'avion entier au moment où il touche, 1 : l'épave au repos). */
export function monterEpaveAvion(THREE, A, modele, graine) {
  const D = dispositionAvion(graine), brule = Object.entries(D.pieces).filter(([, p]) => p.brule).map(([n]) => n);
  const { pieces, longueur, envergure } = biplanPieces(A, AVIONS_OPTS[modele], brule);
  const racine = new THREE.Group(), items = [];
  const regler = (g, d) => { g.rotation.order = 'YZX'; g.rotation.set(d.roulis, d.yaw, -d.tangage); };
  const bas = (g, enfonce) => { g.updateMatrixWorld(true); return -new THREE.Box3().setFromObject(g).min.y - enfonce; };      // la hauteur qui pose son point le plus bas au sol, moins l'enfoncement
  // le fuselage : porte toutes les pièces qui tiennent encore
  const corps = new THREE.Group(); racine.add(corps); corps.add(pieces.fuselage);
  const f = D.pieces.fuselage;
  for (const [nom, pc] of Object.entries(pieces)) {
    if (nom === 'fuselage') continue;
    const d = D.pieces[nom];
    if (!d.libre) { pc.rotation.order = 'YZX'; pc.rotation.set(d.roulis, d.yaw, 0); corps.add(pc); }
  }
  regler(corps, f); corps.position.set(f.dx, 0, f.dz); corps.position.y = bas(corps, f.enfonce);
  items.push({ nom: 'fuselage', objet: corps, d: f, libre: false, depart: new THREE.Vector3(0, SOL_AVION, 0), cible: corps.position.clone(), base: corps.position.y, rot: [f.roulis, f.yaw, -f.tangage] });
  // les pièces libres : chacune dans son enveloppe, centrée sur elle-même, qui prend sa place et son attitude
  for (const [nom, pc] of Object.entries(pieces)) {
    const d = D.pieces[nom];
    if (nom === 'fuselage' || !d.libre) continue;
    const h = new THREE.Group(); racine.add(h); h.add(pc);
    const c = new THREE.Box3().setFromObject(h).getCenter(new THREE.Vector3());
    pc.position.sub(c);
    regler(h, d); h.position.set(d.dx, 0, d.dz); h.position.y = bas(h, d.enfonce);
    items.push({ nom, objet: h, d, libre: true, depart: c.clone(), cible: h.position.clone(), base: h.position.y, rot: [d.roulis, d.yaw, -d.tangage] });
  }
  const v = new THREE.Vector3();
  function poser(hauteur) {
    racine.updateWorldMatrix(true, false);
    for (const it of items) {
      v.set(it.cible.x, 0, it.cible.z).applyMatrix4(racine.matrixWorld);
      it.cible.y = it.base + hauteur(v.x, v.z);
    }
  }
  function animer(u) {
    u = Math.min(1, Math.max(0, u));
    const e = 1 - (1 - u) ** 2.4, arc = Math.sin(Math.PI * u);
    for (const it of items) {
      const o = it.objet, { depart: a, cible: c } = it, dist = Math.hypot(c.x - a.x, c.z - a.z), tour = (1 - e) * (it.libre ? 3.2 : 0.6) * (it.d.dz < 0 ? -1 : 1);
      o.position.set(a.x + (c.x - a.x) * e, a.y + (c.y - a.y) * e + arc * (it.libre ? 0.8 + dist * 0.12 : 0.4), a.z + (c.z - a.z) * e);
      o.rotation.set(it.rot[0] * e + tour, it.rot[1] * e + (it.libre ? tour * 0.4 : 0), it.rot[2] * e);
    }
  }
  animer(1);
  return { racine, animer, poser, items, D, longueur, envergure };
}

/* Un char détruit : le Schneider abîmé selon la graine. Rend { racine, poser(hauteur), D } ; `poser(f)` pose les débris (et la caisse) sur la hauteur du terrain. */
export function monterEpaveChar(THREE, A, graine) {
  const D = dispositionChar(graine), m = schneiderEpave(A, D), v = new THREE.Vector3();
  function poser(hauteur) {
    m.groupe.updateWorldMatrix(true, true);
    const y0 = new THREE.Vector3().setFromMatrixPosition(m.groupe.matrixWorld).y;
    for (const e of m.debris.children) { e.updateWorldMatrix(true, false); v.setFromMatrixPosition(e.matrixWorld); e.position.y = hauteur(v.x, v.z) - y0 + 0.02; }
  }
  return { racine: m.groupe, poser, D, longueur: m.longueur };
}
