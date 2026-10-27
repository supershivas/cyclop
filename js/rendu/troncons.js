// Ce que l'état des tronçons montre sur le terrain : les fanions (à la couleur de celui qui tient le tronçon, déchirés quand l'autre
// camp y est entré), le clignotement d'un ordre et la surbrillance de la visée, les ouvrages des tranchées (traverses, sacs de terre,
// fil de fer, bois). Le dessin seulement : tout se lit de l'état, rien n'en est sauvegardé.
import { PALETTE } from '../palette.js?v=0.95.0';
import { ligneY, demiLargeur } from '../tranchees.js?v=0.95.0';
import { TOITS } from '../data/nids.js?v=0.95.0';
import { primitives, ouvrageTroncon, niveauSelonZoom, couchesDe } from './tranchee-modeles.js?v=0.95.0';

// `THREE`, `scene`, `col` (une couleur de la palette), `surface(x, z)` (la hauteur du sol), `projeter()` (le centre de la vue et les pixels par mètre),
// `vue`, `zooms` viennent de creerRendu ; `bataille()`, `tAnim()` (le temps du dessin), `vide()` (rien n'est dessiné) et `survolTroncons()`
// (les tronçons que le survol allume) sont lus à chaque image, parce qu'ils changent. L'ordre d'ajout à la scène est celui d'avant la découpe.
export function creerTroncons({ THREE, scene, col, surface, projeter, vue, zooms, bataille, tAnim, vide, survolTroncons }) {
  const ventF = { force: 0, ang: 0 };       // le vent du moment (`setVent`), lu par les fanions
  // ─── Les fanions des tronçons (Jérôme, v0.9.2) : un fanion sur le parapet de chaque tronçon, à la couleur de celui qui
  // le tient. Déchiré quand l'autre camp y est entré ; quand le tronçon change de main, le nôtre descend, celui d'en
  // face monte. Rien n'est écrit : on lit la ligne, tronçon par tronçon, même de loin (un point de couleur). ───
  let fanP = null, fanF = null, fanEtat = [];
  const fanMat = new THREE.Matrix4(), fanQ = new THREE.Quaternion(), fanE = new THREE.Euler(), fanS = new THREE.Vector3(), fanV = new THREE.Vector3();
  const fanCol = { 0: new THREE.Color(PALETTE.n), 1: new THREE.Color(PALETTE.x) };
  // Un drapeau est accroché à son mât par son bord et ne tourne jamais autour de son centre : au calme il pend le long du mât ; plus le vent monte, plus il se lève à l'horizontale, dans le sens du vent (l'instance est tournée
  // vers l'aval), et une onde court du mât vers le bout (plus ample au bout, plus vite et plus serrée par grand vent) ; déchiré, il pend toujours et claque.
  const fanU = { uForce: { value: 0 }, uTV: { value: 0 } };
  function fanMatVent() {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uForce = fanU.uForce; sh.uniforms.uTV = fanU.uTV;
      sh.vertexShader = 'attribute vec3 aTaille; uniform float uForce; uniform float uTV;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
        float s = position.x;
        vec2 q = vec2(position.x * aTaille.x, (position.y - 1.0) * aTaille.y);
        float pend = max(1.0 - smoothstep(0.0, 0.4, uForce), aTaille.z);
        float d = pend * 1.2;
        q = vec2(q.x * cos(d) + q.y * sin(d), -q.x * sin(d) + q.y * cos(d));
        float ph = uTV * (2.5 + uForce * 10.0) - s * (4.0 + uForce * 4.0) + float(gl_InstanceID) * 1.7;
        q.y += sin(ph * 0.7 + 1.3) * s * (0.03 + uForce * 0.12);
        vec3 transformed = vec3(q.x, q.y, sin(ph) * s * (0.05 + uForce * 0.35 + aTaille.z * 0.2) * (1.0 - pend * 0.5));`);
    };
    m.customProgramCacheKey = () => 'drapeau-vent';
    return m;
  }
  function preparerFanions() {
    const B = bataille();
    for (const m of [fanP, fanF]) if (m) { scene.remove(m); m.dispose(); }
    fanP = fanF = null; fanEtat = [];
    const n = B.troncons?.length || 0;
    if (!n) return;
    // le mât (Jérôme, v0.95.0 : « les drapeaux sont encore mal accrochés à leur mât ») : deux rubans croisés à angle droit, quatre triangles : un seul ruban, vu de profil (le drapeau tourne avec le vent), disparaissait et le drapeau
    // flottait seul ; des boîtes coûteraient +3 000 triangles et +10 ms tout dézoomé
    const plan = new THREE.BufferGeometry();
    plan.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0, -0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, 0.5, -0.5]), 3));
    plan.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    fanP = new THREE.InstancedMesh(plan, new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.t), side: THREE.DoubleSide }), n);
    // le drapeau (Jérôme, v0.91.2 : « accrochés au mât et se déformer au vent ») : cinq bandes, le bord du mât en x = 0 et le haut du drapeau en y = 0 ; le nuanceur le plie (voir `fanMatVent`), en mètres, avec sa taille par instance (`aTaille` : largeur, hauteur, déchiré)
    const drap = new THREE.PlaneGeometry(1, 1, 5, 1).translate(0.5, 0.5, 0);
    drap.setAttribute('aTaille', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    fanF = new THREE.InstancedMesh(drap, fanMatVent(), n);
    for (const m of [fanP, fanF]) { m.frustumCulled = false; m.renderOrder = 2; scene.add(m); }
    B.troncons.forEach((tr, k) => {
      const L = B.lignes[tr.ligne], x = (tr.x0 + tr.x1) / 2, z = ligneY(L, x) + L.face * 1.2;
      fanEtat.push({ x, z, tient: B.etat.troncons[k], ancien: B.etat.troncons[k], t: 99 });   // t : depuis combien de temps il a changé de main
    });
  }
  // ─── Un ordre validé (Jérôme, v0.14.0) : les tronçons visés clignotent quelques secondes, trois traits fins le long de
  // la tranchée (au parapet, au milieu, au parados), os sur le sol, sans rien changer à la partie. ───
  const CLIGN_MAX = 3000, clX = new Float32Array(CLIGN_MAX * 3), clignotes = [];
  const clGeo = new THREE.BufferGeometry();
  clGeo.setAttribute('position', new THREE.BufferAttribute(clX, 3).setUsage(THREE.DynamicDrawUsage));
  clGeo.setDrawRange(0, 0);
  const clMat = new THREE.LineBasicMaterial({ color: col('o'), depthTest: false, depthWrite: false });
  const clignotants = new THREE.LineSegments(clGeo, clMat); clignotants.frustumCulled = false; clignotants.renderOrder = 7; scene.add(clignotants);
  function clignoter(troncons, duree = 3) { clignotes.push({ troncons: [...troncons], duree, t: duree }); while (clignotes.length > 6) clignotes.shift(); }
  // La surbrillance (v0.21.0) : ce que l'ordre en cours de visée occuperait, au curseur : les tronçons, ou l'emprise des régiments en terrain libre
  // (les mêmes traits que le clignotement, sans clignoter) ; { troncons: [], rects: [{ x, y, l, p }] }
  let surbrillance = { troncons: [], rects: [] };
  function majClignotants(dt) {
    const B = bataille();
    let v = 0;
    const troncon = t => {
      const tr = B.troncons[t], L = B.lignes[tr?.ligne];
      if (!L) return;
      for (const dz of [-1.4, 0, 1.4]) for (let x = tr.x0; x < tr.x1 && v + 2 <= CLIGN_MAX; x += 1.5) {
        for (const xx of [x, Math.min(tr.x1, x + 1.5)]) { const z = ligneY(L, xx) + dz; clX[v * 3] = xx; clX[v * 3 + 1] = surface(xx, z) + 0.15; clX[v * 3 + 2] = z; v++; }
      }
    };
    const seg = (xa, za, xb, zb) => {
      const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, zb - za) / 2));
      for (let k = 0; k < n && v + 2 <= CLIGN_MAX; k++) for (const t of [k / n, (k + 1) / n]) { const xx = xa + (xb - xa) * t, zz = za + (zb - za) * t; clX[v * 3] = xx; clX[v * 3 + 1] = surface(xx, zz) + 0.15; clX[v * 3 + 2] = zz; v++; }
    };
    for (let k = clignotes.length - 1; k >= 0; k--) {
      const f = clignotes[k];
      if ((f.t -= dt) <= 0) { clignotes.splice(k, 1); continue; }
      if (Math.floor((f.duree - f.t) * 4) % 2) continue;                       // quatre fois par seconde : allumé, éteint
      for (const t of f.troncons) troncon(t);
    }
    for (const t of surbrillance.troncons) troncon(t);
    for (const t of survolTroncons()) troncon(t);
    for (const r of surbrillance.rects) { const x0 = r.x - r.l / 2, x1 = r.x + r.l / 2, z0 = r.y - r.p / 2, z1 = r.y + r.p / 2; seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0); }
    clGeo.attributes.position.needsUpdate = true; clGeo.setDrawRange(0, v);
  }

  // ─── Les ouvrages des tranchées (Jérôme, v0.18.0) : des traverses en travers de la tranchée, des sacs de terre sur le parapet (à l'envers
  // quand le tronçon est pris : le parapet devient le parados), du fil de fer devant les premières lignes (coupé là où l'autre camp
  // est entré ou a pris), Le dessin seulement : rien n'en est sauvegardé,
  // tout se lit de l'état ; refait deux fois par seconde, et seulement ce qu'on voit, à partir de 3 pixels par mètre. ───
  // (les tampons grandissent à la demande, jusqu'à OUV_MAX boîtes : les niveaux de détail 2 et 3 des tranchées, v0.84.0, en veulent plus que les 8 000 d'avant)
  const OUV_MAX = 120000;
  let ouvCap = 8000 * 30, ouvPos = new Float32Array(ouvCap * 3), ouvCol = new Float32Array(ouvCap * 3);
  const ouvGeo = new THREE.BufferGeometry();
  ouvGeo.setAttribute('position', new THREE.BufferAttribute(ouvPos, 3).setUsage(THREE.DynamicDrawUsage));
  ouvGeo.setAttribute('color', new THREE.BufferAttribute(ouvCol, 3).setUsage(THREE.DynamicDrawUsage));
  ouvGeo.setDrawRange(0, 0);
  const ouvMesh = new THREE.Mesh(ouvGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); ouvMesh.frustumCulled = false; ouvMesh.renderOrder = 1; scene.add(ouvMesh);
  let filCap = 24000, filPos = new Float32Array(filCap * 3);
  const filGeo = new THREE.BufferGeometry();
  filGeo.setAttribute('position', new THREE.BufferAttribute(filPos, 3).setUsage(THREE.DynamicDrawUsage));
  filGeo.setDrawRange(0, 0);
  const filLignes = new THREE.LineSegments(filGeo, new THREE.LineBasicMaterial({ color: col('r') })); filLignes.frustumCulled = false; filLignes.renderOrder = 1; scene.add(filLignes);
  const cSacH = col('g'), cSacB = col('b'), cTravH = col('g'), cTravB = col('s'), cPorteH = col('g'), cPorteB = col('t');
  // le bois des tranchées (v0.80.0) : les planches (claires, `h` sur `g`) et les madriers (sombres, `g` sur `s`)
  const cPlancheH = col('h'), cPlancheB = col('g'), cMadrierH = col('g'), cMadrierB = col('s'), cSac2H = col('h'), cSac2B = col('b'), cFilH = col('r'), cFilB = col('g');
  // Les niveaux de détail des tranchées (Jérôme, v0.84.0 ; en jeu depuis la v0.88.1 : « mets le niveau selon le zoom dans le jeu ») : 'auto' (le défaut) : le niveau suit le zoom (niveauSelonZoom : 1, 2 puis 3) ; 1 à 3 un niveau fixe (labo) ; 0 le dessin d'avant la v0.88.1 (gardé au labo)
  let niveauReglage = 'auto', textureReglage = 3;       // textureReglage : de 0 (aplats) à 3 (joints, grain et usure), voir tranchee-modeles.js ; 3 : le jeu (v0.95.0, Jérôme : « retiens la texture joints, grain et usure dans le jeu »)
  // Au niveau 0 (le jeu) les tampons gardent leur taille d'avant (8 000 boîtes, 24 000 sommets de fil : ce qui dépasse n'est pas dessiné, comme avant) ; ils ne grandissent qu'aux niveaux 1 à 3
  let niveauCourant = 0;
  const grandir = (v, n) => {                                   // de la place pour n sommets de plus dans les tampons des ouvrages (on recopie ce qui est déjà écrit)
    if (v + n > (niveauCourant ? OUV_MAX * 30 : 8000 * 30)) return false;
    if (v + n <= ouvCap) return true;
    while (v + n > ouvCap) ouvCap *= 2;
    const P = new Float32Array(ouvCap * 3), C = new Float32Array(ouvCap * 3); P.set(ouvPos.subarray(0, v * 3)); C.set(ouvCol.subarray(0, v * 3));
    ouvPos = P; ouvCol = C;
    ouvGeo.setAttribute('position', new THREE.BufferAttribute(ouvPos, 3).setUsage(THREE.DynamicDrawUsage));
    ouvGeo.setAttribute('color', new THREE.BufferAttribute(ouvCol, 3).setUsage(THREE.DynamicDrawUsage));
    return true;
  };
  const grandirFil = (v, n) => {
    if (v + n > (niveauCourant ? 600000 : 24000)) return false;
    if (v + n <= filCap) return true;
    while (v + n > filCap) filCap *= 2;
    const P = new Float32Array(filCap * 3); P.set(filPos.subarray(0, v * 3)); filPos = P;
    filGeo.setAttribute('position', new THREE.BufferAttribute(filPos, 3).setUsage(THREE.DynamicDrawUsage));
    return true;
  };
  // les couleurs des niveaux de détail : des paires [dessus, flanc] de la palette, comme pour le bois et les sacs du jeu (aucune couleur nouvelle)
  // (créées au premier besoin : des couleurs de plus créées d'emblée décaleraient les identifiants de three, donc les 37 images de test/rendu.json)
  let KN = null;
  const couleursN = () => KN ??= { sac: [col('g'), col('b')], sac2: [col('h'), col('b')], sac3: [col('h'), col('s')], boue: [col('b'), col('s')], mousse: [col('v'), col('w')], planche2: [col('g'), col('b')], planche: [col('h'), col('g')], madrier: [col('g'), col('s')], terre: [col('g'), col('s')], fascine: [col('b'), col('s')], acier: [col('r'), col('s')], eau: [col('e'), col('e')], ombre: [col('t'), col('t')], lanterne: [col('o'), col('g')] };
  let ouvT = 0, niveauVu = null;
  let zoneVue = null, zoneBatie = null;                          // le sol que l'écran voit (rendu3d.js le donne à chaque image) ; celui qu'on a garni
  const MARGE_OUVRAGES = 20;                                     // m : on garnit un peu au-delà de ce que l'écran voit
  const nDessines = [];                                          // les tronçons dont les ouvrages sont dessinés à la dernière refonte (la mesure du premier plan)
  function majOuvrages(dt) {
    const B = bataille();
    ouvT -= dt;
    const { cx, cz, p } = projeter();
    const niveau = niveauReglage === 'auto' ? niveauSelonZoom(p) : niveauReglage, voir = !!B && B.etat.tranchees && p >= (niveau ? 2 : 3);
    ouvMesh.visible = filLignes.visible = voir;
    // le sol à garnir (v0.94.2, Jérôme : « les éléments au premier plan disparaissent ») : le rectangle de sol que l'écran voit (`zone`, donné par rendu3d.js : ses coins posés sur le sol, plus la marge du relief),
    // pas un rayon autour du centre de la vue : une caméra basse voit beaucoup plus loin que ce rayon dans l'axe de la vue (à 6 px/m, inclinée à 0,45 rad : 16 tronçons visibles sur 50 sans ouvrages) ;
    // on bâtit un peu au-delà (`MARGE_OUVRAGES`) et on refait dès que la vue en sort (sans attendre les 0,5 s : on ne voit plus la terre nue en déplaçant la caméra)
    const besoin = zoneVue, dedans = !besoin || (zoneBatie && besoin.x0 >= zoneBatie.x0 && besoin.x1 <= zoneBatie.x1 && besoin.z0 >= zoneBatie.z0 && besoin.z1 <= zoneBatie.z1);
    if (!voir || (ouvT > 0 && niveau === niveauVu && (dedans || ouvT > 0.35))) return;
    ouvT = 0.5; niveauVu = niveauCourant = niveau;
    const e = Math.hypot(vue.vw, vue.vh) / p + 30, et = B.etat;
    const zb = zoneBatie = besoin ? { x0: besoin.x0 - MARGE_OUVRAGES, x1: besoin.x1 + MARGE_OUVRAGES, z0: besoin.z0 - MARGE_OUVRAGES, z1: besoin.z1 + MARGE_OUVRAGES } : { x0: cx - e, x1: cx + e, z0: cz - e, z1: cz + e };
    let nv = 0, nf = 0;
    const sommet = (x, y, z, c) => { if (nv * 3 + 3 > ouvPos.length) return; ouvPos[nv * 3] = x; ouvPos[nv * 3 + 1] = y; ouvPos[nv * 3 + 2] = z; ouvCol[nv * 3] = c.r; ouvCol[nv * 3 + 1] = c.g; ouvCol[nv * 3 + 2] = c.b; nv++; };
    const quad = (a, b, c, d, k) => { sommet(...a, k); sommet(...b, k); sommet(...c, k); sommet(...a, k); sommet(...c, k); sommet(...d, k); };
    const boite = (x0, x1, y0, y1, z0, z1, haut, flanc) => {
      if (!grandir(nv, 30)) return;
      quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], haut);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], flanc);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], flanc);
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], flanc);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], flanc);
    };
    const trait = (x0, y0, z0, x1, y1, z1) => { if (!grandirFil(nf, 2)) return; filPos.set([x0, y0, z0, x1, y1, z1], nf * 3); nf += 2; };
    // Le bois d'un tronçon (Jérôme, v0.80.0 : « des madriers et des planches dans les tranchées, détruits au fur et à mesure afin de voir l'état des tranchées »).
    // L'état d'un bout de tranchée est sa profondeur (`T.diff`, rejouée par la sauvegarde : rien à garder) : creusée, tout est en place ; à moitié comblée, le bois est
    // brisé (planches courtes et de travers, madrier rompu) ; comblée, il ne reste que des éclats par terre, çà et là.
    const T = B.terrain, prof = B.profondeur;
    const hachage = (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); };
    const bois = (tr, L) => {
      for (let x = Math.floor(tr.x0) + 1; x < tr.x1 - 1; x += 2) {
        const xs = x + 1, zc = ligneY(L, xs), demi = demiLargeur(L, xs), ci = (Math.max(0, Math.min(T.H - 1, zc | 0))) * T.W + Math.max(0, Math.min(T.W - 1, xs | 0));
        const creux = -T.diff[ci], etat = creux >= prof - 1 ? 2 : creux >= prof * 0.4 ? 1 : 0, h0 = surface(xs, zc), haut = Math.min(1.3, prof * 0.25 * (etat === 2 ? 1 : 0.6));
        const j = hachage(xs, zc);
        if (etat === 0) {                        // comblée : un éclat par-ci par-là, une planche de travers sur la terre
          if (j < 0.3) { const z = zc + (j - 0.15) * 4; boite(xs - 0.8, xs + 0.7, h0 + 0.05, h0 + 0.1, z - 0.1, z + 0.12, cPlancheH, cPlancheB); }
          continue;
        }
        // le caillebotis : une planche en travers, tous les 2 m (brisée : une sur deux, plus courte)
        if (etat === 2 || j < 0.5) boite(xs - 0.4, xs + 0.4, h0 + 0.02, h0 + 0.09, zc - demi * (etat === 2 ? 0.95 : 0.5), zc + demi * (etat === 2 ? 0.95 : 0.3), cPlancheH, cPlancheB);
        // les planches contre les deux parois (brisées : d'un côté seulement, plus basses)
        for (const cote of [-1, 1]) {
          if (etat === 1 && (j < 0.5) === (cote > 0)) continue;
          const z = zc + cote * (demi + 0.05);
          boite(xs - 0.9, xs + 0.9, h0, h0 + haut * (etat === 2 ? 0.8 : 0.5 + 0.3 * j), z - 0.05, z + 0.05, cPlancheH, cPlancheB);
        }
        // les madriers : un montant de chaque côté tous les 4 m, et la lisse qui les relie en haut de la paroi
        if ((Math.floor(xs) % 4) < 2) for (const cote of [-1, 1]) {
          const z = zc + cote * (demi + 0.12);
          if (etat === 2) { boite(xs - 0.1, xs + 0.1, h0, h0 + prof * 0.25 + 0.15, z - 0.1, z + 0.1, cMadrierH, cMadrierB); boite(xs - 1.9, xs + 0.1, h0 + prof * 0.25 + 0.05, h0 + prof * 0.25 + 0.2, z - 0.1, z + 0.1, cMadrierH, cMadrierB); }
          else if (cote * (j - 0.5) > 0) boite(xs - 0.1, xs + 0.1, h0, h0 + prof * 0.25 * 0.5, z - 0.1, z + 0.1, cMadrierH, cMadrierB);       // un montant rompu
        }
      }
    };
    // L'état d'un bout de tranchée, lu de sa profondeur (comme pour le bois) : 2 intacte, 1 à moitié comblée, 0 comblée
    const etatDe = (L, x) => { const zc = ligneY(L, x), ci = (Math.max(0, Math.min(T.H - 1, zc | 0))) * T.W + Math.max(0, Math.min(T.W - 1, x | 0)), creux = -T.diff[ci]; return creux >= prof - 1 ? 2 : creux >= prof * 0.4 ? 1 : 0; };
    // Les sacs de sable (Jérôme, v0.82.0 : « revoir les sacs de sable et les barbelés ») : à 4 px/m et plus, des sacs un à un sur le parapet, en deux assises décalées d'un demi-sac, de deux tons,
    // de hauteurs un peu inégales ; là où les obus ont éboulé la tranchée, la deuxième assise manque, puis les sacs ne sont plus que quelques-uns à terre.
    const sacs = (tr, L, cote) => {
      for (let x = Math.floor(tr.x0); x < tr.x1 - 0.8; x += 0.9) {
        const xs = x + 0.45, zc = ligneY(L, xs), z = zc + cote, h = surface(xs, z), j = hachage(xs * 1.7, zc), etat = etatDe(L, xs);
        const haut = j < 0.5 ? cSacH : cSac2H;
        if (etat === 0) { if (j < 0.3) boite(xs - 0.4, xs + 0.4, h, h + 0.22, z + (j - 0.15) * 3 - 0.18, z + (j - 0.15) * 3 + 0.18, haut, cSacB); continue; }
        const a = 0.25 + 0.06 * j;
        boite(xs - 0.42, xs + 0.42, h, h + a, z - 0.22, z + 0.22, haut, cSacB);
        if (etat === 2 ? j > 0.08 : j > 0.6) boite(xs - 0.42 + 0.45, xs + 0.42 + 0.45, h + a, h + a + 0.24, z - 0.19, z + 0.19, j < 0.5 ? cSac2H : cSacH, cSacB);
      }
    };
    // Les barbelés : deux rangées de piquets (un piquet de bois tous les 3 m) reliées par trois fils et des fils en croix d'une rangée à l'autre ; coupés, il ne reste que des bouts à terre
    const barbeles = (tr, L, coupe) => {
      const f = L.face, rangs = [f * (L.amp + 6.5), f * (L.amp + 9)];
      for (let x = tr.x0, n = 0; x < tr.x1; x += 3, n++) {
        const xb = Math.min(tr.x1, x + 3), k = coupe ? 0.3 : 1;
        if (coupe && n % 3 !== 0) continue;
        const pts = rangs.map(dz => { const za = ligneY(L, x) + dz, zb = ligneY(L, xb) + dz; return [x, surface(x, za), za, xb, surface(xb, zb), zb]; });
        for (const [xa, ha, za, xb2, hb, zb] of pts) {
          for (const hh of [0.35, 0.75, 1.15]) trait(xa, ha + hh * k, za, xb2, hb + hh * k, zb);
          if (!coupe) boite(xa - 0.06, xa + 0.06, ha, ha + 1.3, za - 0.06, za + 0.06, cMadrierH, cMadrierB);
        }
        if (!coupe) {
          const [a, b] = pts;
          trait(a[0], a[1] + 1.15, a[2], b[3], b[4] + 0.35, b[5]); trait(a[3], a[4] + 1.15, a[5], b[0], b[1] + 0.35, b[2]);       // les fils en croix
          trait(a[0], a[1] + 0.35, a[2], b[3], b[4] + 1.15, b[5]); trait(a[3], a[4] + 0.35, a[5], b[0], b[1] + 1.15, b[2]);
        }
      }
    };
    // Les toits de bois (Jérôme, v0.82.0 : « certaines tranchées ont aussi des toits en bois ») : sur quelques tronçons des deux premières lignes (un hachage de leur numéro et de la graine), un abri
    // de 9 m couvert de planches en travers, posées à claire-voie (on voit encore dedans), sur deux lisses ; éboulé, les planches pendent, puis gisent à terre.
    const toit = (tr, L) => {
      const a = tr.x0 + TOITS.de, b = tr.x0 + TOITS.a;
      for (const cote of [-1, 1]) { const xs = (a + b) / 2, zc = ligneY(L, xs), z = zc + cote * (demiLargeur(L, xs) + 0.45), h = surface(xs, zc) + prof * 0.25 + 0.2; if (etatDe(L, xs) > 0) boite(a, b, h - 0.12, h, z - 0.1, z + 0.1, cMadrierH, cMadrierB); }
      for (let x = a; x < b; x += 0.8) {
        const xs = x + 0.28, zc = ligneY(L, xs), demi = demiLargeur(L, xs) + 0.55, h0 = surface(xs, zc), hr = h0 + prof * 0.25 + 0.2, j = hachage(xs, zc * 3.1), etat = etatDe(L, xs);
        if (etat === 2) boite(x, x + 0.56, hr, hr + 0.09, zc - demi, zc + demi, cPlancheH, cPlancheB);
        else if (etat === 1) { if (j > 0.45) boite(x, x + 0.56, hr - 0.9 * j, hr - 0.9 * j + 0.09, zc - demi * 0.5, zc + demi * 0.9, cPlancheH, cPlancheB); }
        else if (j < 0.4) boite(x, x + 0.56, h0 + 0.05, h0 + 0.12, zc - demi * 0.7 + j, zc + demi * 0.6, cPlancheH, cPlancheB);
      }
    };
    // le contexte des niveaux de détail : l'état d'un bout de tranchée (`etatDe`, plus bas) et un hachage, comme pour le bois
    const quadN = (a, b, c, d, k) => { if (grandir(nv, 6)) quad(a, b, c, d, k); };
    const { boite: boiteN, poutre } = primitives(quadN, couchesDe(couleursN()));
    let Lcourante = null;
    const gTr = { boite: boiteN, poutre, trait, surface, etat: x => etatDe(Lcourante, x), j: hachage, K: niveau ? couleursN() : null, prof, pris: false, coupe: false, texture: textureReglage, manque: (x, z) => trous.some(t => (x - t.x) ** 2 + (z - t.z) ** 2 < t.r * t.r) };
    nDessines.length = 0;
    B.troncons.forEach((tr, t) => {
      const L = B.lignes[tr.ligne], xm = (tr.x0 + tr.x1) / 2, zc = ligneY(L, xm);
      if (tr.x1 < zb.x0 || tr.x0 > zb.x1 || zc < zb.z0 - 4 || zc > zb.z1 + 4) return;       // (le tronçon, long de 25 m, touche le sol à garnir)
      nDessines.push(t);
      const pris = et.troncons[t] !== L.camp, f = L.face;
      Lcourante = L;
      if (niveau) {      // les niveaux de détail (v0.84.0) : tout le tronçon vient de tranchee-modeles.js ; le toit, lui, protège du tir : il reste celui du jeu
        gTr.pris = pris; gTr.coupe = pris || !!B.disputes[t];
        ouvrageTroncon(gTr, tr, L, niveau);
        if (p >= 4 && tr.toit) toit(tr, L);
        return;
      }
      // les traverses : deux par tronçon, en travers de la tranchée
      for (const x of [tr.x0 + 6, tr.x0 + 18]) { const z = ligneY(L, x), h = surface(x, z); boite(x - 0.25, x + 0.25, h, h + 1.2, z - 1.5, z + 1.5, cTravH, cTravB); }
      // le bois : un caillebotis au fond, des planches contre les parois, des madriers (montants et lisse) tous les 4 m ; il disparaît où les obus ont comblé la tranchée
      if (p >= 4) bois(tr, L);
      // les toits (quelques tronçons des deux premières lignes)
      if (p >= 4 && tr.toit) toit(tr, L);       // (quels tronçons ont un toit : la logique, `tr.toit` ; il protège du tir)
      // les sacs de sable : sur le parapet, du côté de l'ennemi ; à l'envers quand le tronçon est pris
      const cote = (pris ? -1 : 1) * f * (L.amp + 2.1);
      if (p >= 4) sacs(tr, L, cote);
      else for (let x = tr.x0; x < tr.x1; x += 2.5) { const xx = x + 1.2, z = ligneY(L, xx) + cote, h = surface(xx, z); boite(x, x + 2.3, h, h + 0.35, z - 0.25, z + 0.25, cSacH, cSacB); }
      // le fil de fer : devant les premières lignes ; coupé, il ne reste que des bouts, à terre
      if (L.rang === 0) {
        const coupe = pris || B.disputes[t];
        if (p >= 4) barbeles(tr, L, coupe);
        else {
          const dz = f * (L.amp + 7);
          for (let x = tr.x0, n = 0; x < tr.x1; x += 1.5, n++) {
            if (coupe && n % 5 > 1) continue;
            const xa = x, xb = Math.min(tr.x1, x + 1.5), za = ligneY(L, xa) + dz, zb = ligneY(L, xb) + dz, ha = surface(xa, za), hb = surface(xb, zb), k = coupe ? 0.3 : 1;
            trait(xa, ha + 0.45 * k, za, xb, hb + 0.45 * k, zb); trait(xa, ha + 0.9 * k, za, xb, hb + 0.9 * k, zb);
            if (n % 3 === 0 && !coupe) trait(xa, ha, za, xa, ha + 1, za);          // un piquet
          }
        }
      }
    });
    // Les nids de mitrailleuses (v0.83.0) : trois murs de sacs en U ouverts vers l'ennemi, la mitrailleuse (un fût, un bouclier, un trépied) ; détruit : des sacs éparpillés, noircis, un fût à terre
    for (const n of et.nids || []) {
      if (n.x < zb.x0 || n.x > zb.x1 || n.y < zb.z0 || n.y > zb.z1) continue;
      const f = n.face, h = surface(n.x, n.y);
      if (n.etat === 'detruit') {
        for (let q = 0; q < 9; q++) { const a = hachage(n.id * 3 + q, 5.1) * 6.28, r = 0.6 + hachage(q, n.id + 7.7) * 1.9, x = n.x + Math.cos(a) * r, z = n.y + Math.sin(a) * r, hh = surface(x, z); boite(x - 0.4, x + 0.4, hh, hh + 0.2, z - 0.2, z + 0.2, cMadrierB, cMadrierH); }
        boite(n.x - 0.9, n.x + 0.5, h + 0.05, h + 0.14, n.y - 0.1 * f, n.y + 0.15 * f, cMadrierH, cMadrierB);       // le fût à terre
        continue;
      }
      for (const [x0, x1, z0, z1] of [[n.x - 1.1, n.x + 1.1, n.y - f * 1.0 - 0.25, n.y - f * 1.0 + 0.25], [n.x - 1.1 - 0.25, n.x - 1.1 + 0.25, n.y - f * 1.0, n.y + f * 0.5], [n.x + 1.1 - 0.25, n.x + 1.1 + 0.25, n.y - f * 1.0, n.y + f * 0.5]]) {
        const za = Math.min(z0, z1), zb = Math.max(z0, z1);
        boite(x0, x1, h, h + 0.27, za, zb, cSacH, cSacB); boite(x0 + 0.1, x1 - 0.1, h + 0.27, h + 0.5, za + 0.05, zb - 0.05, cSac2H, cSacB);
      }
      boite(n.x - 0.05, n.x + 0.05, h + 0.55, h + 0.65, n.y + (f > 0 ? 0 : -1.2), n.y + (f > 0 ? 1.2 : 0), cMadrierB, cMadrierH);       // le fût
      boite(n.x - 0.35, n.x + 0.35, h + 0.45, h + 0.8, n.y + f * 0.15 - 0.05, n.y + f * 0.15 + 0.05, cMadrierH, cMadrierB);        // le bouclier
      boite(n.x - 0.12, n.x + 0.12, h, h + 0.5, n.y - 0.12, n.y + 0.12, cMadrierH, cMadrierB);                                   // le trépied
    }
    ouvGeo.attributes.position.needsUpdate = true; ouvGeo.attributes.color.needsUpdate = true; ouvGeo.setDrawRange(0, nv);
    filGeo.attributes.position.needsUpdate = true; filGeo.setDrawRange(0, nf);
  }

  function majFanions(dt) {
    const B = bataille();
    if (!fanP) return;
    const p = zooms[vue.zoom], taille = fanF.geometry.attributes.aTaille;
    fanU.uForce.value = ventF.force; fanU.uTV.value = tAnim();
    for (let k = 0; k < fanEtat.length; k++) {
      const f = fanEtat[k], tient = B.etat.troncons[k];
      if (tient !== f.tient) { f.ancien = f.tient; f.tient = tient; f.t = 0; }
      f.t += dt;
      const dechire = B.disputes[k] === 1 && f.t > 3;
      // monté : 0 (en bas) à 1 (en haut) ; le changement de main : l'ancien descend en 1,2 s, le nouveau monte en 2,5 s
      let monte = 1, camp = f.tient;
      if (f.t < 1.2) { camp = f.ancien; monte = 1 - f.t / 1.2; } else if (f.t < 3.7) monte = (f.t - 1.2) / 2.5;
      const y0 = surface(f.x, f.z);
      const gros = Math.max(1, 3 / Math.max(p, 1));              // de loin, un fanion doit encore faire un pixel
      // la hampe (3 m), puis le drapeau (1,3 × 0,8 m)
      fanS.set(0.12 * gros, 3, 0.12 * gros); fanV.set(f.x, y0 + 1.5, f.z);
      fanMat.compose(fanV, fanQ.identity(), fanS); fanP.setMatrixAt(k, fanMat);
      // le haut du drapeau est au haut du mât (3 m) quand il est monté, à 2,5 m plus bas quand il est amené ; il part de l'axe du mât et regarde dans le sens du vent (tournée de -cap)
      const w = (dechire ? 0.6 : 1.3) * gros, h = (dechire ? 0.5 : 0.8) * gros;
      fanE.set(0, -ventF.ang, 0); fanQ.setFromEuler(fanE);
      fanS.set(1, 1, 1); fanV.set(f.x, y0 + 3 - 0.08 - 2.5 * (1 - monte), f.z);
      fanMat.compose(fanV, fanQ, fanS); fanF.setMatrixAt(k, fanMat);
      taille.setXYZ(k, w, h, dechire ? 1 : 0);
      fanF.setColorAt(k, fanCol[camp]);
    }
    fanP.instanceMatrix.needsUpdate = fanF.instanceMatrix.needsUpdate = taille.needsUpdate = true;
    if (fanF.instanceColor) fanF.instanceColor.needsUpdate = true;
    fanP.visible = fanF.visible = !vide();
  }

  // ─── Les sacs de sable projetés par les obus (Jérôme, v0.95.0 : « les sacs de sable sont aussi projetés lors des bombardements ») : un obus qui tombe près d'une tranchée jette des sacs en l'air (des boîtes de 84 × 25 × 44 cm
  // qui retombent en tournant et restent à terre une vingtaine de secondes) et ceux du parapet, à moins de son rayon, ne sont plus dessinés (`trous`) : le dessin seulement, rien de l'état. Pas de `Math.random` : un hachage
  // de la position du coup et du numéro du sac (la même chute à chaque lancement, comme les images de test). ───
  const SACS_MAX = 192, sacsVol = [], trous = [];
  let sacMesh = null, sacCoups = 0;
  const SAC_PAR_CALIBRE = { '75': [5, 2.5, 6], '155': [9, 4, 9], '220': [14, 6, 12] };      // [sacs jetés, rayon où les sacs du parapet disparaissent (m), portée où l'on cherche une tranchée (m)]
  const grainSac = (a, b) => { const q = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return q - Math.floor(q); };
  function projeterSacs(x, z, cal) {
    const B = bataille(), C = SAC_PAR_CALIBRE[cal];
    if (!B || !C || !B.etat.tranchees) return;
    let L = null, d = C[2];
    for (const l of B.lignes) { const e = Math.abs(ligneY(l, x) - z); if (e < d) { d = e; L = l; } }
    if (!L) return;                                                // aucune tranchée à portée : pas de sacs
    trous.push({ x, z: ligneY(L, x) + L.face * 2, r: C[1] }); while (trous.length > 240) trous.shift();
    if (!sacMesh) {
      sacMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.84, 0.25, 0.44), new THREE.MeshBasicMaterial({ color: 0xffffff }), SACS_MAX);
      sacMesh.frustumCulled = false; sacMesh.renderOrder = 1; sacMesh.count = 0; scene.add(sacMesh);
    }
    const tons = [col('g'), col('h'), col('b')];
    for (let k = 0; k < C[0]; k++) {
      const g1 = grainSac(x + k * 1.7, z + sacCoups), g2 = grainSac(z * 3.1 + k, x * 1.3 + sacCoups), g3 = grainSac(k * 5.3 + sacCoups, x + z), g4 = grainSac(x * 0.7 + k, z * 0.9 + sacCoups * 2);
      const sx = x + (g1 - 0.5) * C[2], sz = ligneY(L, sx) + L.face * 2, dx = sx - x, dz = sz - z, dl = Math.hypot(dx, dz) || 1, v = 3 + g2 * (cal === '75' ? 3 : cal === '155' ? 5 : 7);
      sacsVol.push({ x: sx, y: surface(sx, sz) + 0.4, z: sz, vx: dx / dl * v + (g3 - 0.5) * 2, vy: 4 + g4 * (cal === '75' ? 5 : cal === '155' ? 8 : 11), vz: dz / dl * v + (g4 - 0.5) * 2, ax: g1 * 6, ay: g2 * 6, wx: (g3 - 0.5) * 12, wy: (g4 - 0.5) * 12, vol: true, repos: 0, ton: tons[(k + sacCoups) % 3] });
    }
    sacCoups++; ouvT = Math.min(ouvT, 0.1);                         // les ouvrages se refont tout de suite : les sacs jetés ne sont plus sur le parapet
    while (sacsVol.length > SACS_MAX) sacsVol.shift();
  }
  const sacM = new THREE.Matrix4(), sacQ = new THREE.Quaternion(), sacE = new THREE.Euler(), sacP = new THREE.Vector3(), sacS = new THREE.Vector3();
  function majSacs(dt) {
    if (!sacMesh) return;
    for (let k = sacsVol.length - 1; k >= 0; k--) {
      const s = sacsVol[k];
      if (s.vol) {
        s.vy -= 9.8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.ax += s.wx * dt; s.ay += s.wy * dt;
        const sol = surface(s.x, s.z) + 0.13;
        if (s.y <= sol && s.vy < 0) { s.y = sol; s.vol = false; s.ax = 0; s.vx = s.vy = s.vz = 0; }       // il se pose à plat
      } else if ((s.repos += dt) > 24) sacsVol.splice(k, 1);          // il reste à terre vingt-quatre secondes (la dernière : il rapetisse)
    }
    sacsVol.forEach((s, k) => {
      const e = s.vol ? 1 : Math.max(0, Math.min(1, (25 - s.repos)));
      sacE.set(s.ax, s.ay, 0); sacQ.setFromEuler(sacE); sacP.set(s.x, s.y, s.z); sacS.set(e, e, e);
      sacM.compose(sacP, sacQ, sacS); sacMesh.setMatrixAt(k, sacM); sacMesh.setColorAt(k, s.ton);
    });
    sacMesh.count = sacsVol.length; sacMesh.instanceMatrix.needsUpdate = true; if (sacMesh.instanceColor) sacMesh.instanceColor.needsUpdate = true;
    sacMesh.visible = !vide();
  }

  return {
    preparer: preparerFanions,                                   // une bataille est branchée : un fanion par tronçon
    maj(dt) { majFanions(dt); majClignotants(dt); majOuvrages(dt); majSacs(dt); },
    projeterSacs,                                                // un obus tombe en (x, z) : des sacs de sable sont jetés en l'air
    viderSacs() { sacsVol.length = 0; trous.length = 0; },       // une bataille est branchée : plus rien en l'air
    setVent(force, ang) { ventF.force = force; ventF.ang = ang; },   // les fanions suivent le vent
    clignoter,                                                   // un ordre validé : les tronçons visés clignotent
    zone(x0, x1, z0, z1) { zoneVue = { x0, x1, z0, z1 }; },        // le rectangle de sol que l'écran voit (avec ses marges)
    get texture() { return textureReglage; },
    set texture(v) { textureReglage = Math.max(0, Math.min(3, v | 0)); ouvT = 0; },          // la « texture » des ouvrages : 0 à 3 ; 3 dans le jeu
    get dessines() { return nDessines; },
    get niveau() { return niveauReglage; },
    set niveau(v) { niveauReglage = v === 'auto' ? 'auto' : Math.max(0, Math.min(3, v | 0)); ouvT = 0; },         // le niveau de détail des tranchées : 0 (le jeu), 1 à 3, 'auto' (selon le zoom)
    surligner(s) { surbrillance = s || { troncons: [], rects: [] }; },   // ce que l'ordre en cours de visée occuperait
  };
}
