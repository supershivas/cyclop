// Les modèles des largages (v0.162.0), partagés par le jeu (rendu/largages.js) et le labo (labo-largages.js) : l'objet d'après son modèle en données
// (data/largages.js), la flèche et l'anneau de sa rareté, la brillance du mythique, le parachute et sa caisse, le biplan qui largue. Le dessin seulement.
//
// Le parachute s'ouvre en quatre temps (Jérôme, 23 nov. : « améliore l'ouverture du parachute ») : (1) la chute libre, le sac fermé sur la caisse qui culbute ;
// (2) l'extraction, la voile sort en fuseau étroit et long, les suspentes se tendent ; (3) le gonflement, la coupole s'ouvre d'un coup, dépasse sa taille
// et revient (un ressort amorti), la caisse est freinée et balance fort ; (4) la descente, la coupole respire et le balancement s'éteint lentement.
// Au sol, la coupole se dégonfle, glisse sous le vent et s'aplatit. La voile est faite de huit fuseaux, os et brume en alternance, et d'une cheminée au sommet.
import { PALETTE } from '../palette.js?v=0.165.0';
import { RARETES, LARGAGE as L } from '../data/largages.js?v=0.165.0';

export function cacheModeles(THREE) {
  const cyl = new Map(), con = new Map(), mat = new Map();
  return {
    boite: new THREE.BoxGeometry(1, 1, 1),
    cylindre: n => { if (!cyl.has(n)) cyl.set(n, new THREE.CylinderGeometry(1, 1, 1, n)); return cyl.get(n); },
    cone: n => { if (!con.has(n)) con.set(n, new THREE.ConeGeometry(1, 1, n)); return con.get(n); },
    matiere: hex => { if (!mat.has(hex)) mat.set(hex, new THREE.MeshLambertMaterial({ color: new THREE.Color(hex), flatShading: true })); return mat.get(hex); },
    plat: hex => { const k = 'plat' + hex; if (!mat.has(k)) mat.set(k, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) })); return mat.get(k); },
    liberer() { this.boite.dispose(); for (const g of [...cyl.values(), ...con.values()]) g.dispose(); for (const m of mat.values()) m.dispose(); },
  };
}

/* Un objet d'après son modèle : posé sur y = 0, centré, à `taille` m de sa plus grande dimension (null : sa taille vraie) ; rend { groupe, vraie }.
   `groupe.userData` : { O, hauteur, vraie, brillants (les matières du liseré d'un objet qui brille) } */
export function construireObjet(THREE, O, taille, cache) {
  const brut = new THREE.Group();
  const coul = c => c === '*' ? RARETES[O.rarete].couleur : PALETTE[c];
  const brille = !!RARETES[O.rarete].brillance, brillants = [];
  for (const P of O.modele) {
    const g = P.f === 'b' ? cache.boite : P.f === 'c' ? cache.cylindre(P.n) : cache.cone(P.n);
    let mat = cache.matiere(coul(P.c));
    if (brille && P.c === '*') { mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(coul('*')), flatShading: true }); brillants.push(mat); }      // (sa couleur change à chaque image)
    const m = new THREE.Mesh(g, mat);
    if (P.f === 'b') m.scale.set(...P.t); else m.scale.set(P.t[0], P.t[1], P.t[0]);
    m.position.set(...P.p);
    if (P.r) m.rotation.set(...P.r);
    brut.add(m);
  }
  const b = new THREE.Box3().setFromObject(brut), d = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const vraie = Math.max(d.x, d.y, d.z), k = taille ? taille / vraie : 1;
  brut.position.set(-c.x, -b.min.y, -c.z);
  const groupe = new THREE.Group(), echelle = new THREE.Group();
  echelle.scale.setScalar(k); echelle.add(brut); groupe.add(echelle);
  groupe.userData = { O, hauteur: d.y * k, vraie, brillants };
  return { groupe, vraie };
}

/* La flèche : une hampe et une pointe à quatre pans tournée vers le bas, d'une couleur plate (elle se lit sur tous les sols). `k` : son échelle (1 = 0,55 m) */
export function fleche(THREE, cache, couleur, k = 1, propre = false) {
  const g = new THREE.Group(), m = propre ? new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur) }) : cache.plat(couleur);
  g.userData.matiere = m;
  const hampe = new THREE.Mesh(cache.boite, m); hampe.scale.set(0.09 * k, 0.28 * k, 0.09 * k); hampe.position.y = 0.36 * k;
  const pointe = new THREE.Mesh(cache.cone(4), m); pointe.scale.set(0.2 * k, 0.26 * k, 0.2 * k); pointe.rotation.x = Math.PI; pointe.position.y = 0.13 * k;
  g.add(hampe, pointe);
  return g;
}
/* L'anneau au sol, de la couleur de la rareté : il dit où est l'objet quand la flèche sort du cadre */
export function anneau(THREE, couleur, rayon) {
  const m = new THREE.Mesh(new THREE.RingGeometry(rayon * 0.82, rayon, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur), side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.04;
  return m;
}

// Le mouvement d'un objet tombé : un tour en `L.tour` s, un flottement de `L.flottement` (amplitude, période)
export const tourne = (t, phase = 0) => (t / L.tour + phase) * Math.PI * 2;
export const flotte = (t, phase = 0) => L.flottement[0] * Math.sin((t / L.flottement[1] + phase) * Math.PI * 2);

/* La brillance d'un objet qui brille (`brillance` de sa rareté : le mythique, rouge et rose) : la flèche, l'anneau et le liseré vont d'une couleur à l'autre et
   reviennent en 4 s, un éclat d'os les traverse toutes les 1,4 s, six paillettes d'os tournent autour de l'objet en clignant. Rend `(t) => void`, ou null. */
export function briller(THREE, cache, groupe, f, a, rayon) {
  const R = RARETES[groupe.userData.O.rarete];
  if (!R.brillance) return null;
  const cols = [...R.brillance, ...R.brillance.slice(1, -1).reverse()].map(h => new THREE.Color(h)), os = new THREE.Color(PALETTE.o), c = new THREE.Color();
  const mats = [f.userData.matiere, a.material, ...groupe.userData.brillants];
  const paillettes = new THREE.Group(), pm = cache.plat(PALETTE.o);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(cache.boite, pm); p.userData.i = i; paillettes.add(p); }
  groupe.parent.add(paillettes);
  return t => {
    const x = (t / 4) % 1 * cols.length, i = Math.floor(x), u = x - i, s = u * u * (3 - 2 * u);
    c.copy(cols[i]).lerp(cols[(i + 1) % cols.length], s);
    c.lerp(os, 0.65 * Math.max(0, Math.sin(t * Math.PI * 2 / 1.4)) ** 10);
    for (const m of mats) m.color.copy(c);
    const h = groupe.userData.hauteur * groupe.scale.x;
    paillettes.visible = groupe.visible;
    for (const p of paillettes.children) {
      const k = p.userData.i, ang = t * 1.3 + k * Math.PI / 3, clin = Math.max(0, Math.sin(t * 5 + k * 2.1)) ** 3;
      p.position.set(Math.cos(ang) * rayon, groupe.position.y + h * (0.2 + 0.6 * ((k * 0.37) % 1)) + 0.1 * Math.sin(t * 2 + k), Math.sin(ang) * rayon);
      p.scale.setScalar(rayon * 0.09 * clin + 1e-4); p.rotation.set(t * 3 + k, t * 2, 0);
    }
  };
}

/* La caisse et son parachute : un groupe dont l'origine est le dessous de la caisse. `poser(etat)` le règle à chaque image :
   { phase: 'avion' | 'libre' | 'corolle' | 'sol', tl (s de chute libre), ts (s depuis l'ouverture), ta (s depuis le sol), balancement (rad) }. */
export function creerParachute(THREE, cache) {
  const racine = new THREE.Group(), pendule = new THREE.Group();      // la caisse pend sous la coupole : le pendule tourne autour du point d'attache
  racine.add(pendule);
  // la caisse
  const caisse = new THREE.Group();
  const boite = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.g)); boite.scale.set(0.9, 0.7, 0.7); boite.position.y = 0.35;
  const couvercle = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.h)); couvercle.scale.set(0.95, 0.1, 0.75); couvercle.position.y = 0.75;
  const sangle = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.b)); sangle.scale.set(0.12, 0.72, 0.72); sangle.position.y = 0.36;
  const sac = new THREE.Mesh(cache.boite, cache.matiere(PALETTE.r)); sac.scale.set(0.5, 0.22, 0.4); sac.position.y = 0.91;      // le sac du parachute, fermé
  caisse.add(boite, couvercle, sangle, sac);
  // la voile : huit fuseaux d'une demi-sphère, os et brume en alternance, une cheminée au sommet ; puis les suspentes
  const voile = new THREE.Group(), RV = 2.6, N = 8;
  for (let k = 0; k < N; k++) {
    const g = new THREE.SphereGeometry(RV, 2, 4, k * 2 * Math.PI / N, 2 * Math.PI / N, 0.16, Math.PI / 2 - 0.16);
    voile.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: new THREE.Color(k % 2 ? PALETTE.r : PALETTE.o), flatShading: true, side: THREE.DoubleSide })));
  }
  const pos = new Float32Array(N * 6), lignes = new THREE.BufferGeometry(); lignes.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const suspentes = new THREE.LineSegments(lignes, new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.g) }));
  suspentes.frustumCulled = false;
  pendule.add(caisse, voile, suspentes);
  const HAUT = 4.4;      // m : la coupole ouverte au-dessus du haut de la caisse
  const ressort = t => 1 + 0.22 * Math.exp(-4.5 * t) * Math.sin(11 * t + 0.3) - Math.exp(-7 * t) * 0.9;      // le gonflement : la coupole dépasse sa taille et revient
  function poser(E) {
    let ouvre = 0, long = 1, rayon = 1, hauteurVoile = 0.55, attache = 1, angle = 0, souffle = 0;
    sac.visible = E.phase === 'avion' || E.phase === 'libre';
    voile.visible = suspentes.visible = !sac.visible && !(E.phase === 'sol' && E.ta > 6);
    caisse.rotation.set(0, 0, 0);
    if (E.phase === 'libre') { caisse.rotation.set(Math.sin(E.tl * 5) * 0.4, 0, E.tl * 1.8); pendule.rotation.set(0, 0, 0); return; }
    if (E.phase === 'corolle') {
      const ts = E.ts;
      if (ts < 0.35) { ouvre = ts / 0.35; long = 0.6 + 1.6 * ouvre; rayon = 0.12; hauteurVoile = 0.55 * long; attache = 0.25 + 0.75 * ouvre; }      // l'extraction : un fuseau qui s'allonge
      else { const t = ts - 0.35; rayon = Math.max(0.12, ressort(t)); long = 1 + 1.2 * Math.exp(-6 * t); hauteurVoile = 0.55 * long * (1 + 0.15 * Math.exp(-3 * t) * Math.sin(9 * t)); souffle = 0.03 * Math.sin(ts * 2.3); }
      // le balancement : fort au choc de l'ouverture, qui s'éteint en descendant
      const choc = ts < 0.35 ? 0 : 1 + 2.2 * Math.exp(-(ts - 0.35) * 0.9);
      angle = E.balancement * choc * Math.sin(ts * 1.7);
    }
    if (E.phase === 'sol') {      // la coupole se dégonfle, glisse sous le vent, s'aplatit
      const k = Math.min(1, E.ta / 2.2);
      rayon = 1 + 0.3 * k; hauteurVoile = 0.55 * (1 - 0.85 * k); attache = 1;
      voile.position.set(2.4 * k, HAUT * (1 - k) + 0.1 * k, 0); voile.rotation.set(0, 0, -1.2 * k);
      voile.scale.set(rayon, hauteurVoile / 0.55 * 0.55, rayon);
      pendule.rotation.set(0, 0, 0);
      suspentes.visible = E.ta < 1.2;
      // le couvercle saute
      const o = Math.min(1, E.ta / L.ouverture);
      couvercle.position.set(0.6 * o, 0.75 + 2.8 * o * (1 - o), 0); couvercle.rotation.z = -1.8 * o;
      majSuspentes(voile.position.y + 0.1, 1, rayon);
      return;
    }
    couvercle.position.set(0, 0.75, 0); couvercle.rotation.z = 0;
    voile.position.set(0, 0.8 + HAUT * attache, 0); voile.rotation.set(0, 0, 0);
    voile.scale.set(rayon * (1 + souffle), hauteurVoile, rayon * (1 + souffle));
    pendule.rotation.set(0, 0, angle);
    majSuspentes(voile.position.y, rayon * (1 + souffle), rayon);
  }
  // les suspentes : du bord de la coupole au haut de la caisse
  function majSuspentes(yBord, r, _r) {
    for (let k = 0; k < N; k++) {
      const a = k * 2 * Math.PI / N, o = k * 6;
      pos[o] = voile.position.x + Math.cos(a) * RV * r * 0.95; pos[o + 1] = yBord + 0.05; pos[o + 2] = Math.sin(a) * RV * r * 0.95;
      pos[o + 3] = Math.cos(a) * 0.3; pos[o + 4] = 0.8; pos[o + 5] = Math.sin(a) * 0.3;
    }
    lignes.attributes.position.needsUpdate = true;
  }
  return { groupe: racine, poser, caisse };
}

/* Le biplan qui largue : un fuseau sombre, deux ailes de brume, la dérive ; tourné vers +x */
export function biplan(THREE, cache) {
  const g = new THREE.Group();
  for (const [w, h, d, x, y, z, c] of [[7, 0.9, 0.9, 0, 0, 0, 's'], [1.6, 0.12, 9, 0.8, 0.7, 0, 'r'], [1.5, 0.12, 8, 0.9, -0.5, 0, 'r'], [0.9, 0.1, 3, -3.2, 0.1, 0, 'r'], [0.8, 1.2, 0.1, -3.2, 0.7, 0, 's'], [0.2, 2.2, 0.2, 3.6, 0, 0, 'e']]) {
    const m = new THREE.Mesh(cache.boite, cache.matiere(PALETTE[c])); m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m);
  }
  return g;
}
