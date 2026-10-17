// Les éclats (l'éclair, la terre jetée, la fumée : des points), les balles et les obus en vol, le feu qui gagne les arbres, les fusées éclairantes, les corbeaux,
// et « le feu se voit » (Jérôme, v0.9.2 : l'éclair à la bouche du fusil et le trait vers la cible de chaque tir de `B.tirs`, la pose des tireurs, le bond de ceux que
// le souffle jette). Une seule fabrique : tous tirent dans le même générateur de l'aspect (`alea`, une suite à graine : l'ordre des tirages fait l'image) et
// dans les mêmes tampons de particules. Le dessin seulement : jamais la logique, jamais la partie.
import * as SH from './shaders.js?v=0.23.0';
import { INDICE } from '../palette.js?v=0.23.0';
import { horloge } from '../bataille.js?v=0.23.0';

const ECLATS = 2400;
export const VOL = 0.6;       // la durée d'un bond (s)

// `THREE`, `scene`, `col`, `palTex` et `NP` (la texture de la palette, pour la couleur d'un éclat), `effets` (ceux que le jeu garde), `surface(x, z)`, `projeter()` et `vue`
// viennent de creerRendu ; `bataille()`, `terrain()` et `vide()` changent, donc ce sont des fonctions. L'ordre d'ajout à la scène est celui d'avant la découpe.
export function creerEclats({ THREE, scene, col, palTex, NP, effets, surface, projeter, vue, bataille, terrain, vide }) {
  // ─── Les éclats : l'éclair, la terre jetée, la fumée (des points) ; et les effets proposés au labo
  // (`effets` de creerRendu, éteints dans le jeu tant que Jérôme n'en a pas retenu) : la gerbe de terre,
  // l'onde au sol, l'obus qui tombe, la fumée qui dérive et reste, le feu, les fusées éclairantes, les corbeaux.
  // Sortes : 0 éclair, 1 terre, 2 fumée, 3 traînée de l'obus, 4 onde, 5 flamme, 6 fusée, 8 motte. ───
  const ecl = { x: new Float32Array(ECLATS), y: new Float32Array(ECLATS), z: new Float32Array(ECLATS), vx: new Float32Array(ECLATS), vy: new Float32Array(ECLATS), vz: new Float32Array(ECLATS), age: new Float32Array(ECLATS).fill(99), vie: new Float32Array(ECLATS), sorte: new Uint8Array(ECLATS), taille: new Float32Array(ECLATS).fill(1) };
  let eclTete = 0;
  const eclPos = new Float32Array(ECLATS * 3), eclTon = new Float32Array(ECLATS), eclTaille = new Float32Array(ECLATS).fill(1);
  const eclGeo = new THREE.BufferGeometry();
  eclGeo.setAttribute('position', new THREE.BufferAttribute(eclPos, 3).setUsage(THREE.DynamicDrawUsage));
  eclGeo.setAttribute('aTon', new THREE.BufferAttribute(eclTon, 1).setUsage(THREE.DynamicDrawUsage));
  eclGeo.setAttribute('aTaille', new THREE.BufferAttribute(eclTaille, 1).setUsage(THREE.DynamicDrawUsage));
  const eclMat = new THREE.ShaderMaterial({
    uniforms: { uPal: { value: palTex }, uNP: { value: NP }, uTaille: { value: 2 } },
    vertexShader: SH.eclMat.v,
    fragmentShader: SH.eclMat.f,
    depthTest: true, depthWrite: false, transparent: true,
  });
  const eclats = new THREE.Points(eclGeo, eclMat); eclats.frustumCulled = false; eclats.renderOrder = 3;
  scene.add(eclats);
  // Les balles et les obus en vol, à leur échelle (Jérôme, v0.12.1 : pas de gros pixel). Une balle est un trait d'un pixel
  // (un segment, jamais plus large qu'un pixel) de quelques mètres, le long de sa course ; un obus, une ogive de sa vraie taille
  // (le diamètre du calibre, quatre fois plus long), grossie deux fois pour qu'on la voie.
  const BALLES = 200, balX = new Float32Array(BALLES * 6), bal = { v: new Float32Array(BALLES * 3), age: new Float32Array(BALLES).fill(99), vie: new Float32Array(BALLES) };
  const balGeo = new THREE.BufferGeometry();
  balGeo.setAttribute('position', new THREE.BufferAttribute(balX, 3).setUsage(THREE.DynamicDrawUsage));
  const balles = new THREE.LineSegments(balGeo, new THREE.LineBasicMaterial({ color: col('o'), depthWrite: false }));
  balles.frustumCulled = false; balles.renderOrder = 3; scene.add(balles);
  let balTete = 0;
  const balPos = new Float32Array(BALLES * 3);       // la tête de chaque balle
  function balle(x, y, z, vx, vy, vz, vie) {
    const s = balTete; balTete = (balTete + 1) % BALLES;
    balPos[s * 3] = x; balPos[s * 3 + 1] = y; balPos[s * 3 + 2] = z;
    bal.v[s * 3] = vx; bal.v[s * 3 + 1] = vy; bal.v[s * 3 + 2] = vz; bal.age[s] = 0; bal.vie[s] = vie;
  }
  function majBalles(dt) {
    for (let s = 0; s < BALLES; s++) {
      const o = s * 6;
      if (bal.age[s] > bal.vie[s]) { balX[o] = balX[o + 1] = balX[o + 2] = balX[o + 3] = balX[o + 4] = balX[o + 5] = 0; continue; }
      bal.age[s] += dt;
      for (let a = 0; a < 3; a++) balPos[s * 3 + a] += bal.v[s * 3 + a] * dt;
      const vx = bal.v[s * 3], vz = bal.v[s * 3 + 2], d = Math.hypot(vx, vz) || 1;
      balX[o] = balPos[s * 3]; balX[o + 1] = balPos[s * 3 + 1]; balX[o + 2] = balPos[s * 3 + 2];
      balX[o + 3] = balX[o] - vx / d * 3; balX[o + 4] = balX[o + 1]; balX[o + 5] = balX[o + 2] - vz / d * 3;
    }
    balGeo.attributes.position.needsUpdate = true;
  }
  const OBUS_VUS = 16, obusLibres = [];
  const ogive = new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.5, 2.6], [0.38, 3.3], [0.18, 3.8], [0, 4]].map(([r, y]) => new THREE.Vector2(r, y)), 6);
  const obusMat = new THREE.MeshBasicMaterial({ color: col('r') });
  for (let k = 0; k < OBUS_VUS; k++) { const m = new THREE.Mesh(ogive, obusMat); m.visible = false; m.frustumCulled = false; m.renderOrder = 3; scene.add(m); obusLibres.push(m); }
  const VERS_LE_HAUT = new THREE.Vector3(0, 1, 0), dirObus = new THREE.Vector3();
  let graine = 1;
  const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };   // l'aspect seulement, jamais la logique
  function particule(sorte, x, y, z, vx, vy, vz, vie, taille = 1) {
    const s = eclTete; eclTete = (eclTete + 1) % ECLATS;
    ecl.x[s] = x; ecl.y[s] = y; ecl.z[s] = z; ecl.vx[s] = vx; ecl.vy[s] = vy; ecl.vz[s] = vz;
    ecl.age[s] = 0; ecl.vie[s] = vie; ecl.sorte[s] = sorte; ecl.taille[s] = taille;
  }
  const VENT = 1.3;                                 // m/s vers l'est : la fumée qui dérive
  function fumee(x, y, z, big, longue) {
    const a = alea() * Math.PI * 2, v = 1.5 * (0.4 + alea()) * big;
    particule(2, x, y, z, Math.cos(a) * v + (longue ? VENT : 0), longue ? 0.5 + alea() * 0.6 : 1.2 + alea(), Math.sin(a) * v * 0.7,
      longue ? 8 + alea() * 8 : 2.5 + alea() * 2, longue ? 2 + alea() * 1.5 : 1);
  }
  const attente = [];                               // les explosions qui attendent que l'obus touche le sol (l'obus qui tombe)
  function impactVu(x, y, cal) {
    const B = bataille(); const T = terrain();
    if (B) souffler(x, y, cal);
    if (!effets.chute) return eclater(x, y, cal);
    // l'obus qui tombe : une traînée claire, du ciel au point de chute, puis l'explosion
    const h = T ? surface(x, y) : 0, chute = 0.25, v = 160;
    for (let k = 1; k < 6; k++) particule(3, x - 4 + k * 0.3, h + v * chute + k * 1.4, y, 16, -v, 0, chute, 0.5);   // la traînée : des points d'un pixel
    const mesh = obusLibres.pop() || null;
    if (mesh) { const d = { '75': 0.075, '155': 0.155, '220': 0.22 }[cal] * 2; mesh.scale.setScalar(d); dirObus.set(16, -v, 0).normalize(); mesh.quaternion.setFromUnitVectors(VERS_LE_HAUT, dirObus); mesh.visible = true; }
    attente.push({ x, y, cal, t: chute, h, mesh });
  }
  function eclater(x, y, cal) {
    const T = terrain();
    const big = cal === '220' ? 3 : cal === '155' ? 2 : 1;
    const h = T ? surface(x, y) : 0;
    const n = 14 * big;
    for (let k = 0; k < n; k++) {
      const sorte = k < 3 * big ? 0 : k < 9 * big ? 1 : 2;           // éclair, terre, fumée
      const px = x + (alea() - 0.5) * big, pz = y + (alea() - 0.5) * big;
      if (sorte === 2) { fumee(px, h + 0.3, pz, big, effets.derive); continue; }
      const a = alea() * Math.PI * 2, v = (sorte === 1 ? 6 : 1.5) * (0.4 + alea()) * big;
      particule(sorte, px, h + 0.3, pz, Math.cos(a) * v, sorte === 1 ? 5 + alea() * 6 * big : 0, Math.sin(a) * v * 0.7, sorte === 0 ? 0.12 : 0.9, sorte === 0 && big > 1 ? 1.5 : 1);
    }
    if (effets.gerbe) {
      // la gerbe : une colonne de terre et de mottes, haute et serrée, qui retombe
      for (let k = 0; k < 34 * big; k++) {
        const a = alea() * Math.PI * 2, v = (0.6 + alea() * 1.6) * big;
        particule(k % 3 ? 1 : 8, x + (alea() - 0.5), h + 0.3, y + (alea() - 0.5), Math.cos(a) * v, 9 + alea() * 10 * Math.sqrt(big), Math.sin(a) * v, 1.6 + alea() * 0.8, k % 3 ? 1.5 : 2.5);
      }
    }
    if (effets.onde) {
      // l'onde : un anneau de poussière qui court au ras du sol
      const m = 18 + 10 * big;
      for (let k = 0; k < m; k++) { const a = (k / m) * Math.PI * 2; particule(4, x, h + 0.25, y, Math.cos(a) * 22 * Math.sqrt(big), 0, Math.sin(a) * 22 * Math.sqrt(big), 0.18 + 0.06 * big); }
    }
    if (effets.derive) for (let k = 0; k < 4 * big; k++) fumee(x + (alea() - 0.5) * 2 * big, h + 0.5, y + (alea() - 0.5) * 2 * big, big, true);
  }

  // le feu : un arbre abattu ou un buisson arraché brûle un moment (flammes et fumée)
  const feux = [];
  let arbresEtat = null, buissonsEtat = null;
  function guetterFeux() {
    const T = terrain();
    if (!effets.feu || !T) return;
    if (!arbresEtat || arbresEtat.length !== T.arbres.length) { arbresEtat = T.arbres.map(a => a.abattu); buissonsEtat = T.buissons.map(b => b.detruit); return; }
    T.arbres.forEach((a, k) => { if (a.abattu && !arbresEtat[k]) allumer(k, 1.2); arbresEtat[k] = a.abattu; });
    T.buissons.forEach((b, k) => { if (b.detruit && !buissonsEtat[k]) feux.push({ x: b.i + 0.5, z: b.j + 0.5, h: 0.5, fin: 10 + alea() * 15, t: 0, f: 0 }); buissonsEtat[k] = b.detruit; });
    while (feux.length > 60) feux.shift();
  }
  // un arbre prend feu (une fois) ; debout, il brûle par la couronne, plus longtemps
  const brules = new Set();
  function allumer(k, h) {
    const T = terrain();
    if (brules.has(k)) return;
    brules.add(k);
    const a = T.arbres[k];
    feux.push({ x: a.i + 0.5, z: a.j + 0.5, h, fin: (h > 2 ? 35 : 25) + alea() * 25, t: 0, f: 0, arbre: k, prop: 1 + alea() });
  }
  function majFeux(dt) {
    const T = terrain();
    for (let k = feux.length - 1; k >= 0; k--) {
      const f = feux[k];
      f.t += dt; f.f += dt;
      if (f.t > f.fin) { feux.splice(k, 1); continue; }
      // le feu gagne les arbres voisins (à moins de 9 m), de temps en temps : un bois brûle de proche en proche
      if (f.arbre !== undefined && (f.prop -= dt) < 0) {
        f.prop = 1.5 + alea() * 2;
        if (alea() < 0.35) {
          const voisins = [];
          T.arbres.forEach((a, n) => { if (!brules.has(n) && (a.i + 0.5 - f.x) ** 2 + (a.j + 0.5 - f.z) ** 2 < 81) voisins.push(n); });
          if (voisins.length) { const n = voisins[Math.floor(alea() * voisins.length)]; allumer(n, T.arbres[n].abattu ? 1.2 : 3 + alea() * 3); }
        }
      }
      const y = surface(f.x, f.z) + f.h;
      while (f.f > 0.05) {
        f.f -= 0.05;
        const large = f.h > 2 ? 2.4 : 0.8;          // une couronne qui brûle est plus large qu'une souche
        particule(5, f.x + (alea() - 0.5) * large, y + (alea() - 0.5) * (f.h > 2 ? 2 : 0), f.z + (alea() - 0.5) * large, (alea() - 0.5) * 0.4, 1.5 + alea() * 1.5, 0, 0.35 + alea() * 0.35, 1.5);
        if (alea() < 0.25) fumee(f.x, y + 1, f.z, 1, true);
      }
    }
  }
  // les fusées éclairantes : montent, s'ouvrent, descendent lentement sous leur parachute (le soir, ou toujours au labo)
  let prochaineFusee = 3;
  function majFusees(dt) {
    const B = bataille(); const T = terrain();
    if (!effets.fusees || !T) return;
    const h = horloge(B);
    if (effets.fusees !== 'toujours' && h.heure < 16) return;
    if ((prochaineFusee -= dt) > 0) return;
    prochaineFusee = 5 + alea() * 7;
    const x = vue.cx + (alea() - 0.5) * 80, z = vue.cz - 5 - alea() * 35;
    particule(6, x, surface(x, z) + 1, z, (alea() - 0.5) * 2, 22, 0, 14, 2.5);
  }
  // les corbeaux : quelques points noirs qui tournent au-dessus des morts (ou au-dessus du centre de la vue, au labo)
  const CORBEAUX = 9;
  const crPos = new Float32Array(CORBEAUX * 3), crGeo = new THREE.BufferGeometry();
  crGeo.setAttribute('position', new THREE.BufferAttribute(crPos, 3).setUsage(THREE.DynamicDrawUsage));
  const crMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col('t') }, uT: { value: 0 } },
    vertexShader: SH.crMat.v,
    fragmentShader: SH.crMat.f,
  });
  const corbeaux = new THREE.Points(crGeo, crMat); corbeaux.frustumCulled = false; corbeaux.renderOrder = 4; corbeaux.visible = false;
  scene.add(corbeaux);
  let nid = null, nidT = 0;
  function majCorbeaux(dt, t) {
    const B = bataille();
    if (!effets.corbeaux || !B) { corbeaux.visible = false; return; }
    if ((nidT -= dt) <= 0) {
      nidT = 10;
      // au-dessus du corps le plus proche du centre de la vue (s'il y a des morts), sinon du centre
      let best = null, bd = 150 * 150;
      for (const c of B.etat.corps) { const d = (c[0] / 10 - vue.cx) ** 2 + (c[1] / 10 - vue.cz) ** 2; if (d < bd) { bd = d; best = c; } }
      nid = best ? { x: best[0] / 10, z: best[1] / 10 } : (effets.corbeaux === 'toujours' ? { x: vue.cx, z: vue.cz } : null);
    }
    if (!nid) { corbeaux.visible = false; return; }
    if (!vide()) corbeaux.visible = true;
    const h0 = surface(nid.x, nid.z);
    for (let k = 0; k < CORBEAUX; k++) {
      const r = 8 + (k * 37 % 11), w = 0.35 + (k % 3) * 0.08, a = t * w * (k % 2 ? 1 : -1) + k * 2.1;
      crPos[k * 3] = nid.x + Math.cos(a) * r; crPos[k * 3 + 1] = h0 + 12 + (k % 4) * 2 + Math.sin(t * 1.3 + k) * 0.8; crPos[k * 3 + 2] = nid.z + Math.sin(a) * r * 0.8;
    }
    crGeo.attributes.position.needsUpdate = true;
    crMat.uniforms.uT.value = t;
  }

  // ─── Le feu se voit (Jérôme, v0.9.2) : un éclair à la bouche du fusil et un trait clair vers la cible, pour chaque
  // tir de la bataille (un éclair d'un pixel, et une balle : un trait fin). Le dessin seulement : la logique les range dans B.tirs, vidés ici.
  // On ne dessine que ceux qu'on voit, et pas plus de 160 par image (tout dézoomé, ce serait des milliers de points). ───
  // Chaque tireur épaule son fusil : la pose (tirVal, 1 puis qui retombe) et le cap vers sa cible, pour tous les tirs.
  let tirVal = new Float32Array(0), tirAng = new Float32Array(0);
  // Le souffle (Jérôme, v0.16.0) : la logique jette les survivants à l'opposé du point de chute ; le dessin les fait sauter, un
  // bond d'autant plus haut qu'ils étaient près (volT : le temps qui reste, volH : la hauteur du bond).
  let volT = new Float32Array(0), volH = new Float32Array(0);
  function reserverSoldats(n) {
    if (tirVal.length >= n) return;
    tirVal = new Float32Array(n * 2); tirAng = new Float32Array(n * 2); volT = new Float32Array(n * 2); volH = new Float32Array(n * 2);
  }
  function souffler(x, y, cal) {
    const B = bataille();
    const A = B.armee, n = A.n, zone = ({ '75': 4, '155': 7, '220': 10 }[cal] || 4) * (B.R.obus.souffleZone || 1.8);
    reserverSoldats(n);
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(A.x[i] - x, A.y[i] - y);
      if (d < zone) { volT[i] = VOL; volH[i] = 0.5 + 1.5 * (1 - d / zone); }
    }
  }
  function majTirs(dt) {
    const B = bataille();
    const L = B.tirs, n = B.armee.n;
    reserverSoldats(n);
    for (let i = 0; i < n; i++) { if (tirVal[i] > 0) tirVal[i] = Math.max(0, tirVal[i] - dt * 1.6); if (volT[i] > 0) volT[i] = Math.max(0, volT[i] - dt); }
    for (let k = 0; k < L.length; k += 6) { const i = L[k + 5]; if (i < tirVal.length) { tirVal[i] = 1; tirAng[i] = Math.atan2(L[k + 2] - L[k], L[k + 3] - L[k + 1]); } }
    if (!L.length) return;
    const { cx, cz, p } = projeter();
    const e = Math.hypot(vue.vw, vue.vh) / p + 20;
    const pas = Math.max(1, Math.floor(L.length / 6 / 160));
    for (let k = 0; k < L.length; k += 6 * pas) {
      const x = L[k], y = L[k + 1];
      if (Math.abs(x - cx) > e || Math.abs(y - cz) > e) continue;
      const tx = L[k + 2] + (alea() - 0.5) * 6, ty = L[k + 3] + (alea() - 0.5) * 6;
      const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const h = surface(x, y);
      particule(0, x + ux * 0.6, h + 1.3, y + uy * 0.6, 0, 0, 0, 0.07, 0.5);
      balle(x + ux * 1.5, h + 1.3, y + uy * 1.5, ux * 110, 0, uy * 110, 0.12 + alea() * 0.06);
    }
    L.length = 0;
  }

  function majEclats(dt) {
    const T = terrain();
    majBalles(dt);
    for (let k = attente.length - 1; k >= 0; k--) {
      const a = attente[k];
      if ((a.t -= dt) <= 0) { attente.splice(k, 1); if (a.mesh) { a.mesh.visible = false; obusLibres.push(a.mesh); } eclater(a.x, a.y, a.cal); }
      else if (a.mesh) a.mesh.position.set(a.x - 16 * a.t, a.h + 160 * a.t, a.y);
    }
    guetterFeux(); majFeux(dt); majFusees(dt);
    for (let s = 0; s < ECLATS; s++) {
      if (ecl.age[s] > ecl.vie[s]) { eclTon[s] = -1; continue; }
      ecl.age[s] += dt;
      const so = ecl.sorte[s], f = ecl.age[s] / ecl.vie[s];
      if (so === 1 || so === 8) ecl.vy[s] -= 18 * dt;
      if (so === 2) { ecl.vx[s] *= 0.97; ecl.vz[s] *= 0.97; if (effets.derive) ecl.vx[s] += (VENT - ecl.vx[s]) * dt * 0.5; }
      if (so === 6) {
        // la fusée : elle monte, freine, puis descend lentement sous son parachute ; une fumée derrière elle
        if (ecl.vy[s] > -1.2) ecl.vy[s] -= 14 * dt; else ecl.vy[s] = -1.2;
        if (alea() < dt * 6) particule(2, ecl.x[s], ecl.y[s], ecl.z[s], 0, 0.2, 0, 3, 1);
      }
      ecl.x[s] += ecl.vx[s] * dt; ecl.y[s] += ecl.vy[s] * dt; ecl.z[s] += ecl.vz[s] * dt;
      // la terre retombe au sol et s'y arrête
      if ((so === 1 || so === 8) && T && ecl.y[s] < surface(ecl.x[s], ecl.z[s])) ecl.age[s] = 99;
      eclPos[s * 3] = ecl.x[s]; eclPos[s * 3 + 1] = ecl.y[s]; eclPos[s * 3 + 2] = ecl.z[s];
      eclTaille[s] = so === 2 ? ecl.taille[s] * (1 + f * 0.8) : ecl.taille[s];
      eclTon[s] = so === 0 || so === 6 || so === 9 ? INDICE.o
        : so === 1 ? INDICE.b : so === 8 ? INDICE.s
        : so === 3 || so === 4 ? INDICE.r
        : so === 5 ? (alea() < 0.5 ? INDICE.o : INDICE.h)
        : 100 + (f < 0.3 ? INDICE.r : INDICE.g);
    }
    eclGeo.attributes.position.needsUpdate = true; eclGeo.attributes.aTon.needsUpdate = true; eclGeo.attributes.aTaille.needsUpdate = true;
  }

  return {
    ecl, feux, ECLATS,                                           // lus par temps.js : les fusées et les incendies éclairent la nuit
    impactVu, majTirs, majEclats, majCorbeaux,
    setTaille(n) { eclMat.uniforms.uTaille.value = n; },          // la taille d'un point d'éclat, selon le zoom
    reinitialiser() { feux.length = 0; brules.clear(); arbresEtat = null; },   // une autre bataille : ses arbres ne brûlent pas encore
    fumer(x, z) { const T = terrain(); if (T) fumee(x + (alea() - 0.5) * 3, surface(x, z) + 0.5, z + (alea() - 0.5) * 3, 2, true); },   // une colonne de fumée (l'écran titre)
    tirs() { return { tirVal, tirAng, volT, volH }; },           // la pose des tireurs et le bond des soufflés, lus par les soldats (réservés à chaque image : relire)
  };
}
