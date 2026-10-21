/* Le rendu, en three.js (profil pixel-3d-three de game-system). Il lit l'état
   de la bataille et ne le modifie jamais.

   - Caméra : une vraie perspective, à angle étroit (`fov`, 30°), très plongée
     (`tangage`, 54°) : ce qui est loin paraît plus petit, on sent la profondeur
     (Jérôme, v0.3.0 : « les régiments lointains apparaissent plus petits »). Au
     point visé, un mètre = `ppm` pixels (le zoom va par facteurs entiers). On la
     tourne (`yaw`) et l'incline un peu, en douceur ; elle ne sort jamais du
     terrain (borner). Seules les parois tournées vers le sud, le nord, l'est et l'ouest
     peuvent se voir.
   - L'image est calculée en basse résolution puis agrandie d'un facteur entier
     sans lissage (`image-rendering: pixelated`).
   - Palette exacte : la gestion des couleurs de three.js est coupée (three-lib.js),
     les couleurs passent par une texture d'indices (une case = un octet, la
     couleur de apparence.js) lue par le shader dans la palette (10 × 2 : la
     couleur, et celle de la paroi).
   - Le sol : des morceaux de MORCEAU × MORCEAU cases ; le dessus fusionné en
     rectangles de même hauteur, les parois sud fusionnées le long des rangées.
     Un morceau dont le relief a changé est refait, les plus proches du centre
     d'abord, avec un budget de quelques ms par image (la technique paintSome
     de Pierre).
   - Les soldats : instanciés (une boîte et son ombre) ; au zoom 1 et 2, un
     point de 2 × 2 pixels (la couleur du camp sur son ombre).
   - Les corps : un homme couché (instancié) ; au zoom 1 et 2, un pixel. */
import { loadThree } from './three-lib.js?v=0.45.1';
import * as SH from './rendu/shaders.js?v=0.45.1';
import { creerSoldats } from './rendu/soldats.js?v=0.45.1';
import { creerCiel } from './rendu/ciel.js?v=0.45.1';
import { creerMeteo } from './rendu/meteo.js?v=0.45.1';
import { creerTroncons } from './rendu/troncons.js?v=0.45.1';
import { creerVegetation } from './rendu/vegetation.js?v=0.45.1';
import { creerTemps } from './rendu/temps.js?v=0.45.1';
import { creerEclats } from './rendu/eclats.js?v=0.45.1';
import { PALETTE, ORDRE, INDICE } from './palette.js?v=0.45.1';
import { OMBRE, couleursLigne } from './apparence.js?v=0.45.1';
import { MORCEAU, hauteurVueQ as hauteurQ, hauteurVueM as hauteurM } from './terrain.js?v=0.45.1';
import { horloge, secteurDuJeu } from './bataille.js?v=0.45.1';
import { ligneY } from './tranchees.js?v=0.45.1';

export const CAMERA = { yaw: 0.15, tangage: 0.95, fov: 30 };   // au départ : tournée de 9°, plongée de 54°, angle de 30°
// la caméra respire : un balancement très lent, 2° en 23 s (Jérôme, v0.3.1 : variante D du labo retenue)
// les effets du jeu (Jérôme, v0.8.0 : « tout ensemble ») : la gerbe de terre, l'onde, l'obus qui tombe, la fumée qui
// reste, le feu, les fusées éclairantes le soir, les corbeaux au-dessus des morts
export const EFFETS = { gerbe: true, onde: true, chute: true, derive: true, feu: true, fusees: true, corbeaux: true };
export const SOLDAT = 'equipe-marche';            // le style des soldats de près (Jérôme, v0.8.0 : la silhouette complète ; labo : boite, detail, fusil, silhouette, marche)
export const RESPIRATION = 0.035;
export const YAW_MAX = 0.6, TANGAGE_MIN = 0.7, TANGAGE_MAX = 1.35;
const TG_CIEL_MIN = 0.02, TG_CIEL_MAX = 1.55;     // la caméra libre : de l'horizon presque au zénith (le sol la relève : `borner`)
const GARDE_SOL = 1.5;                            // m : la caméra libre ne passe jamais plus bas que le sol, moins cette garde
const SOL_Y = 3;                              // m : la hauteur moyenne du sol (le point visé)
export const ZOOMS = [1, 2, 3, 4, 6, 8, 12, 16];   // pixels (logiques) par mètre (12 et 16 : tout près des hommes, Jérôme v0.9.3)
const POINTS_JUSQUA = 2;                      // zoom où un soldat n'est plus qu'un point
 const E = 0.03;                               // m : le débord des faces (pas de fente vue de biais)
const HAUT = 8;                               // m : marge du bas de l'écran, où un sol en hauteur remonte (borner)
const SOCLE = -8;                             // m : le bas de la coupe du terrain (bord sud)

/* respiration : l'amplitude (rad) du lent balancement de la caméra (0 : immobile). */
export async function creerRendu(canvas, { budgetMs = 4, mesure = false, camera: camDepart = null, respiration = RESPIRATION, soldat: styleSoldat = SOLDAT, cadavre = 'poses', effets = EFFETS, bord = null } = {}) {
  // un mouvement réduit demandé par le système : la caméra ne bouge pas d'elle-même
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) respiration = 0;
  const THREE = await loadThree();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(PALETTE.t), 1);
  const gl = renderer.getContext();
  const scene = new THREE.Scene();

  // ─── La caméra : une perspective à angle étroit ───
  const depart = { ...CAMERA, ...(camDepart || {}) };
  const camera = new THREE.PerspectiveCamera(depart.fov, 1, 1, 1000);
  // yaw, tangage : la caméra vue ; cible : là où elle va (elle y glisse en douceur)
  const vue = { cx: 200, cz: 150, zoom: 2, vw: 320, vh: 200, facteur: 2, fov: depart.fov, yaw: depart.yaw, tangage: depart.tangage, cible: { yaw: depart.yaw, tangage: depart.tangage } };
  // le souffle de la caméra (respiration) s'ajoute à l'angle choisi : yawVu, tangageVu servent au dessin et aux conversions
  const souffle = { t: 0, yaw: 0, tangage: 0 };
  const yawVu = () => vue.yaw + souffle.yaw, tangageVu = () => vue.tangage + souffle.tangage;
  // la distance de la caméra au point visé : un mètre là-bas = ppm pixels
  const distance = zoom => (vue.vh / 2) / (Math.tan(vue.fov * Math.PI / 360) * ZOOMS[zoom]);
  // d'où regarde la caméra, par rapport au point visé (au sud quand yaw = 0, en hauteur)
  const versCamera = (yaw, tg) => [Math.sin(yaw) * Math.cos(tg), Math.sin(tg), Math.cos(yaw) * Math.cos(tg)];
  function projeter() {
    const p = ZOOMS[vue.zoom], D = distance(vue.zoom), o = versCamera(yawVu(), tangageVu());
    camera.fov = vue.fov; camera.aspect = vue.vw / vue.vh;
    camera.near = vue.ciel ? 0.5 : D * 0.15;      // (la caméra libre rase le sol : un plan proche à 14 m coupait le sol du bas de l'écran)
    camera.far = D * (vue.libre || vue.ciel ? 6 : 5);       // (au ras du sol, la vue porte plus loin ; au-delà, le ciel bas)  v0.36.8 : cette ligne était restée dans le commentaire de la précédente, le plan lointain restait à 1 000 m et coupait le fond du champ, vue basse et dézoomée
    camera.updateProjectionMatrix();
    camera.position.set(vue.cx + o[0] * D, SOL_Y + o[1] * D, vue.cz + o[2] * D);
    camera.lookAt(vue.cx, SOL_Y, vue.cz);
    camera.updateMatrixWorld();
    return { cx: vue.cx, cz: vue.cz, p };
  }

  // ─── La palette : 10 × 2 (la couleur, la couleur de la paroi) ───
  const NP = ORDRE.length;
  const palData = new Uint8Array(NP * 2 * 4);
  const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  ORDRE.forEach((k, i) => {
    palData.set([...rgb(PALETTE[k]), 255], i * 4);
    palData.set([...rgb(PALETTE[OMBRE[k]]), 255], (NP + i) * 4);
  });
  const palTex = new THREE.DataTexture(palData, NP, 2, THREE.RGBAFormat, THREE.UnsignedByteType);
  palTex.magFilter = palTex.minFilter = THREE.NearestFilter; palTex.generateMipmaps = false; palTex.needsUpdate = true;
  const col = k => new THREE.Color(PALETTE[k]);
  // Le bord du terrain (v0.32.0, labo « Le bord de la carte ») : coupé net sur le ciel de brume (null, le jeu), ou se fondant dans une couleur
  // (`ciel` : la couleur du fond, `fondu` : mètres), ou prolongé par un faux terrain qui se perd dans la brume (`faux`)
  const BORDS = { noir: { ciel: 't', fondu: 60 }, brume: { ciel: 'r', fondu: 100 }, papier: { ciel: 'o', fondu: 45 }, faux: { ciel: 'r', fondu: 0, faux: 1 }, 'faux-noir': { ciel: 't', fondu: 0, faux: 1, brume: 't' },
    'faux-ciel': { ciel: 'r', fondu: 0, faux: 1, meteo: 1 } };   // (le jeu, v0.36.7 : le ciel et le bout du champ prennent la couleur du temps qu'il fait, `cielDeMeteo`)
  let leBord = BORDS[bord] || null;
  const cielCoul = () => col(leBord ? leBord.ciel : 'r');
  const cielMeteo = new THREE.Color();

  let B = null, T = null, faux = null, fauxU = null;
  // Le sol a le même relief à tous les zooms (Jérôme, v0.12.0) ; seuls les petits décors (arbres, buissons, herbe) s'effacent de loin
  const petit = () => ZOOMS[vue.zoom] <= POINTS_JUSQUA;
  let sol = null, solTex = null, solData = null, solIdx = null, solAttente = 0, morceaux = [], vuLigne = null, gelVu = null, coutRangees = 0;
  /* La texture du sol : une couleur par case (RVBA, déjà prise dans la palette),
     et en dessous, la couleur de la paroi de chaque case : une seule lecture de
     texture par pixel (mesuré : la lecture de l'indice puis de la palette coûtait
     un tiers du rendu logiciel). */
  const solMat = new THREE.ShaderMaterial({
    uniforms: { uSol: { value: null }, uTaille: { value: new THREE.Vector2(1, 1) }, uBord: { value: leBord ? leBord.fondu : 0 }, uBordCoul: { value: leBord ? col(leBord.ciel) : new THREE.Color(0) } },
    vertexShader: SH.solMat.v,
    fragmentShader: SH.solMat.f,
    side: THREE.DoubleSide,
  });
  const PAL_RGB = ORDRE.map(k => rgb(PALETTE[k]));
  const PAROI_RGB = ORDRE.map(k => rgb(PALETTE[OMBRE[k]]));

  // ─── Un morceau de sol : dessus fusionnés, parois sud ───
  function construireMorceau(mx, my) {
    const i0 = mx * MORCEAU, j0 = my * MORCEAU;
    const i1 = Math.min(T.W, i0 + MORCEAU), j1 = Math.min(T.H, j0 + MORCEAU);
    const w = i1 - i0, h = j1 - j0;
    const pos = [], paroi = [], decal = [];
    const quad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, p, ox = 0, oz = 0) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
      for (let k = 0; k < 6; k++) { paroi.push(p); decal.push(ox, oz); }
    };
    // le dessus : rectangles de même hauteur
    const vu = new Uint8Array(w * h);
    const hq = (i, j) => hauteurQ(T, j * T.W + i);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (vu[j * w + i]) continue;
      const z = hq(i0 + i, j0 + j);
      let rw = 1;
      while (i + rw < w && !vu[j * w + i + rw] && hq(i0 + i + rw, j0 + j) === z) rw++;
      let rh = 1;
      grandir: while (j + rh < h) {
        for (let k = 0; k < rw; k++) if (vu[(j + rh) * w + i + k] || hq(i0 + i + k, j0 + j + rh) !== z) break grandir;
        rh++;
      }
      for (let jj = 0; jj < rh; jj++) for (let k = 0; k < rw; k++) vu[(j + jj) * w + i + k] = 1;
      const y = z * 0.25, x0 = i0 + i, x1 = x0 + rw, z0 = j0 + j, z1 = z0 + rh;
      // chaque face déborde de quelques centimètres : vue de biais, deux rectangles qui ne partagent pas
      // leurs sommets laissaient des fentes d'un pixel (le noir du fond)
      quad(x0 - E, y, z0 - E, x0 - E, y, z1 + E, x1 + E, y, z1 + E, x1 + E, y, z0 - E, 0);
    }
    // les parois tournées vers le sud : là où la case est plus haute que sa voisine du sud
    for (let j = 0; j < h; j++) {
      const J = j0 + j, dernier = J === T.H - 1;
      let i = 0;
      while (i < w) {
        const haut = hq(i0 + i, J), bas = dernier ? SOCLE * 4 : hq(i0 + i, J + 1);
        if (haut <= bas) { i++; continue; }
        let k = 1;
        while (i + k < w && hq(i0 + i + k, J) === haut && (dernier ? SOCLE * 4 : hq(i0 + i + k, J + 1)) === bas) k++;
        const x0 = i0 + i, x1 = x0 + k, z = J + 1, ya = haut * 0.25, yb = bas * 0.25;
        quad(x0 - E, yb - E, z, x1 + E, yb - E, z, x1 + E, ya + E, z, x0 - E, ya + E, z, haut - bas >= 2 ? 1 : 0, 0, -0.5);
        i += k;
      }
    }
    // les parois tournées vers le nord (Jérôme, v0.45.1 : « les faces nord ont la teinte de l'eau ») : la caméra libre peut regarder vers le sud ; sans elles, on voyait à travers le sol le fond de la couleur du temps
    for (let j = 0; j < h; j++) {
      const J = j0 + j, premier = J === 0;
      let i = 0;
      while (i < w) {
        const haut = hq(i0 + i, J), bas = premier ? SOCLE * 4 : hq(i0 + i, J - 1);
        if (haut <= bas) { i++; continue; }
        let k = 1;
        while (i + k < w && hq(i0 + i + k, J) === haut && (premier ? SOCLE * 4 : hq(i0 + i + k, J - 1)) === bas) k++;
        const x0 = i0 + i, x1 = x0 + k, ya = haut * 0.25, yb = bas * 0.25;
        quad(x1 + E, yb - E, J, x0 - E, yb - E, J, x0 - E, ya + E, J, x1 + E, ya + E, J, haut - bas >= 2 ? 1 : 0, 0, 0.5);
        i += k;
      }
    }
    // les parois tournées vers l'est et l'ouest (vues quand la caméra tourne) ; les bords du champ descendent au socle.
    // L'ouest est éclairé (la lumière vient du nord-ouest) : il garde la couleur du dessus.
    for (let i = 0; i <= w; i++) {
      const I = i0 + i;
      if (I > T.W || (i === w && I !== T.W)) continue;
      const hg = I === 0 ? SOCLE * 4 : null, hd = I === T.W ? SOCLE * 4 : null;
      let j = 0;
      while (j < h) {
        const J = j0 + j;
        const g = hg ?? hq(I - 1, J), d = hd ?? hq(I, J);
        if (g === d) { j++; continue; }
        let k = 1;
        while (j + k < h && (hg ?? hq(I - 1, J + k)) === g && (hd ?? hq(I, J + k)) === d) k++;
        const z0 = J, z1 = J + k, ya = Math.max(g, d) * 0.25, yb = Math.min(g, d) * 0.25;
        if (g > d) quad(I, yb - E, z0 - E, I, yb - E, z1 + E, I, ya + E, z1 + E, I, ya + E, z0 - E, g - d >= 2 ? 1 : 0, -0.5, 0);   // vers l'est
        else quad(I, yb - E, z1 + E, I, yb - E, z0 - E, I, ya + E, z0 - E, I, ya + E, z1 + E, 0, 0.5, 0);                          // vers l'ouest
        j += k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aParoi', new THREE.Float32BufferAttribute(paroi, 1));
    g.setAttribute('aDecal', new THREE.Float32BufferAttribute(decal, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(i0 + w / 2, 3, j0 + h / 2), Math.hypot(w, h, 20) / 2);
    return g;
  }

  // la hauteur de la surface dessinée en (x, z) : là où l'on pose soldats et arbres
  function surface(x, z) {
    const i = Math.max(0, Math.min(T.W - 1, x | 0)), j = Math.max(0, Math.min(T.H - 1, z | 0));
    return hauteurM(T, j * T.W + i);
  }


  // La hauteur lissée entre les centres des cases voisines : un soldat qui passe d'une marche d'un demi-mètre à l'autre (le bord d'un
  // cratère) glisse au lieu de sauter, et ne scintille plus quand il se tient à cheval sur deux cases (Jérôme, v0.16.0).
  function surfaceLisse(x, z) {
    const fx = x - 0.5, fz = z - 0.5, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const h = (a, b) => surface(a + 0.5, b + 0.5);
    return (h(i, j) * (1 - tx) + h(i + 1, j) * tx) * (1 - tz) + (h(i, j + 1) * (1 - tx) + h(i + 1, j + 1) * tx) * tz;
  }

  const soldats = creerSoldats({
    THREE, scene, col, solUniforms: solMat.uniforms, styleSoldat, cadavre, surface, surfaceLisse, solY: SOL_Y, POINTS_JUSQUA,
    bataille: () => B, vide: () => vide, tirs: () => eclats.tirs(),
  });

  const vegetation = creerVegetation({
    THREE, scene, col, camera, vue, solY: SOL_Y, distance, surface, petit,
    terrain: () => T, vide: () => vide, ombres: () => temps.ombres,
  });

  const eclats = creerEclats({
    THREE, scene, col, palTex, NP, effets, surface, projeter, vue,
    bataille: () => B, terrain: () => T, vide: () => vide,
  });

  const ciel = creerCiel({ THREE, scene, col, camera });
  const meteo = creerMeteo({ THREE, scene, col });

  const temps = creerTemps({
    THREE, scene, col, camera, vue, surface, bataille: () => B, vide: () => vide,
    soleilUniform: soldats.soleilUniform, solUniforms: solMat.uniforms, ecl: eclats.ecl, feux: eclats.feux, ECLATS: eclats.ECLATS,
  });

  const troncons = creerTroncons({
    THREE, scene, col, surface, projeter, vue, zooms: ZOOMS, bataille: () => B,
    tAnim: () => tAnim, vide: () => vide, survolTroncons: () => survolTroncons,
  });

  // ─── Brancher une bataille ───
  function attacher(bataille) {
    B = bataille; T = B.terrain;
    if (sol) { scene.remove(sol); sol.children.forEach(m => m.userData.fin?.dispose()); solTex.dispose(); }
    solIdx = new Uint8Array(T.W * T.H);
    solData = new Uint8Array(T.W * T.H * 2 * 4);
    solTex = new THREE.DataTexture(solData, T.W, T.H * 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    solTex.magFilter = solTex.minFilter = THREE.NearestFilter; solTex.generateMipmaps = false;
    solMat.uniforms.uSol.value = solTex; solMat.uniforms.uTaille.value.set(T.W, T.H);
    vuLigne = new Uint32Array(T.H).fill(0xffffffff); gelVu = null;
    sol = new THREE.Group(); scene.add(sol);
    morceaux = [];
    for (let my = 0; my < T.mh; my++) for (let mx = 0; mx < T.mw; mx++) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), solMat);
      m.userData = { mx, my, version: -1 };
      morceaux.push(m); sol.add(m);
    }
    // tout construire tout de suite (le premier écran doit être juste)
    for (const m of morceaux) refaire(m);
    majSol(true);
    soldats.preparer(B);
    vegetation.preparer();
    troncons.preparer();
    eclats.reinitialiser();   // (une autre bataille : ses arbres ne brûlent pas encore)
    vue.cx = T.W / 2; vue.cz = T.H * 0.62;
    faireFaux();
  }
  // le faux terrain au-delà du bord (le bord `faux` et `faux-noir`) : un plan immense posé juste sous le sol
  // Les fleuves de l'atelier qui touchent le bord du terrain (v0.45.1) : pour chaque bout à moins de sa largeur (+ 3 m) du bord, le point où il sort et sa direction, puis sa demi-largeur,
  // une phase, une amplitude et un nombre, tirés du bout (un hachage : la même graine donne les mêmes méandres). Au plus quatre.
  function fleuvesSortants() {
    const out = [];
    if (!B || !T) return out;
    const S = secteurDuJeu(B.etat), m = B.etat.marges, W = T.W, H = T.H;
    for (const O of S.objets || []) {
      if (O.o !== 'fleuve' || !(O.r > 0)) continue;
      const P = [[O.x + m.x, O.y + m.y], [(O.x2 ?? O.x) + m.x, (O.y2 ?? O.y) + m.y]];
      for (let e = 0; e < 2 && out.length < 8; e++) {
        const [px, pz] = P[e], [qx, qz] = P[1 - e], L = Math.hypot(px - qx, pz - qz) || 1, dx = (px - qx) / L, dz = (pz - qz) / L;
        const marge = O.r + 3, dehors = px < marge || pz < marge || px > W - marge || pz > H - marge;
        if (!dehors) continue;
        // le point où la droite sort du terrain : sur le trait Q → P s'il dépasse le bord, sinon en prolongeant au-delà de P
        let ex, ez, t = 0;
        if (px < 0 || pz < 0 || px > W || pz > H) {
          let t0 = 0, t1 = 1;
          for (const [a0, a1, lim] of [[qx, px, W], [qz, pz, H]]) {
            const dd = a1 - a0;
            if (Math.abs(dd) < 1e-9) continue;
            let ta = (0 - a0) / dd, tb = (lim - a0) / dd; if (ta > tb) [ta, tb] = [tb, ta];
            t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
          }
          if (t1 < t0 || t1 >= 1) continue;
          ex = qx + (px - qx) * t1; ez = qz + (pz - qz) * t1;
        } else {
          for (let k = 0; k < 4000 && px + dx * t > 0 && px + dx * t < W && pz + dz * t > 0 && pz + dz * t < H; k++) t += 0.5;
          ex = px + dx * t; ez = pz + dz * t;
        }
        const g = Math.sin(Math.round(ex) * 12.9898 + Math.round(ez) * 78.233) * 43758.5453, u1 = g - Math.floor(g), u2 = (g * 7.31) - Math.floor(g * 7.31);
        out.push(new THREE.Vector4(ex, ez, dx, dz), new THREE.Vector4(O.r, u1 * 6.2832, 22 + 30 * u2, u2));
      }
    }
    return out.slice(0, 8);
  }
  function faireFaux() {
    if (faux) { scene.remove(faux); faux.geometry.dispose(); faux.material.dispose(); faux = null; }
    if (!leBord?.faux || !T) return;
    const u = { uKaki: { value: col('h') }, uVert: { value: col('v') }, uGlaise: { value: col('g') }, uBrume: { value: col(leBord.brume || 'r') }, uCentre: { value: new THREE.Vector2(T.W / 2, T.H / 2) }, uDemi: { value: new THREE.Vector2(T.W / 2, T.H / 2) }, uPortee: { value: 500 } };
    fauxU = u;
    u.uEau = { value: col('e') }; u.uClair = { value: col('r') };
    const riv = fleuvesSortants(); u.uNRiv = { value: riv.length / 2 }; u.uRiv = { value: Array.from({ length: 8 }, (_, k) => riv[k] || new THREE.Vector4()) };
    faux = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2).translate(T.W / 2, SOL_Y - 0.15, T.H / 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: SH.fauxMat.v, fragmentShader: SH.fauxMat.f }));
    faux.frustumCulled = false; scene.add(faux);
  }
  // un morceau dépend aussi de ses voisins (les parois au sud, à l'est, à l'ouest) : leurs versions comptent
  function versionAutour(mx, my) {
    let v = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = mx + dx, y = my + dy;
      if (x >= 0 && y >= 0 && x < T.mw && y < T.mh) v += T.versionMorceau[y * T.mw + x] * (dx * 3 + dy * 7 + 11);
    }
    return v;
  }
  function refaire(m) {
    const { mx, my } = m.userData;
    m.userData.fin?.dispose();
    m.userData.fin = construireMorceau(mx, my);
    m.geometry = m.userData.fin;
    m.userData.version = versionAutour(mx, my);
  }
  // la texture du sol : les rangées dont la couleur a changé
  function majSol(tout = false, dt = 0) {
    const h = horloge(B), gel = h.gel;
    if (gel !== gelVu) { tout = true; gelVu = gel; }
    // l'eau change quelques rangées à chaque pas : on n'envoie la texture qu'un peu plus tard
    solAttente -= dt;
    if (!tout && solAttente > 0) return;
    solAttente = 0.25;
    let n = 0;
    const W = T.W, bas = W * T.H * 4;
    for (let j = 0; j < T.H; j++) {
      // une rangée dépend aussi de sa voisine du sud (la marche entre elles)
      if (!tout && vuLigne[j] === T.versionLigne[j] && (j === T.H - 1 || vuLigne[j + 1] === T.versionLigne[j + 1])) continue;
      couleursLigne(T, j, B.R, gel, solIdx);
      for (let i = 0, c = j * W; i < W; i++, c++) {
        const a = PAL_RGB[solIdx[c]], b = T.profond[c] ? a : PAROI_RGB[solIdx[c]], o = c * 4;      // la paroi d'une eau est de l'eau (v0.45.1)
        const marche = j < T.H - 1 && hauteurQ(T, c) - hauteurQ(T, c + W) >= 4;     // l'alpha dit : une marche d'un mètre au sud
        solData[o] = a[0]; solData[o + 1] = a[1]; solData[o + 2] = a[2]; solData[o + 3] = marche ? 0 : 255;
        solData[bas + o] = b[0]; solData[bas + o + 1] = b[1]; solData[bas + o + 2] = b[2]; solData[bas + o + 3] = 255;
      }
      vuLigne[j] = T.versionLigne[j]; n++;
    }
    if (n) solTex.needsUpdate = true;
    coutRangees = n;
  }
  // refaire les morceaux changés, les plus proches du centre d'abord, dans le budget
  function majMorceaux() {
    const t0 = performance.now();
    const sales = morceaux.filter(m => m.userData.version !== versionAutour(m.userData.mx, m.userData.my));
    if (!sales.length) return 0;
    const d = m => ((m.userData.mx + 0.5) * MORCEAU - vue.cx) ** 2 + ((m.userData.my + 0.5) * MORCEAU - vue.cz) ** 2;
    sales.sort((a, b) => d(a) - d(b));
    let n = 0;
    for (const m of sales) {
      refaire(m); n++;
      if (performance.now() - t0 > budgetMs) break;
    }
    return n;
  }

  let survolTroncons = [];       // les tronçons que le survol allume (lus par troncons.js)

  // ─── Le choix (les régiments choisis) ───
  let choisis = new Set();

  // ─── Les soldats : leurs positions dans les tampons ───
  function majSoldats() {
    const p = ZOOMS[vue.zoom];
    // seulement ceux qu'on voit : le sol vu est un trapèze ; on garde ceux de son rectangle englobant
    const cs = coinsSol(vue.zoom, yawVu(), tangageVu());
    // (un coin de l'écran regarde le ciel : tout le terrain peut être vu, le vrai tri se fait à l'écran)
    const x0 = cs.ok ? vue.cx + cs.x0 - 6 : 0, x1 = cs.ok ? vue.cx + cs.x1 + 6 : T.W, z0 = cs.ok ? vue.cz + cs.z0 - 6 : 0, z1 = cs.ok ? vue.cz + cs.z1 + 12 : T.H;
    // puis le vrai test : projeté, il tombe dans l'écran (le trapèze n'est pas son rectangle)
    projeter();
    mVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = mVP.elements;
    soldats.maj({ x0, x1, z0, z1, e, p, choisis });      // les soldats, leurs anneaux, les corps et les tombes
    vegetation.majHerbe(x0, x1, z0, z1, e, petit());
    const bornes = [x0 - 6, x1 + 6, z0 - 6, z1 + 10];
    vegetation.majArbres(e, bornes); vegetation.majBuissons(e, bornes);
  }

  // ─── Taille de l'écran ───
  function redimensionner() {
    const dpr = window.devicePixelRatio || 1;
    const hote = canvas.parentElement;
    const dw = Math.floor(hote.clientWidth * dpr), dh = Math.floor(hote.clientHeight * dpr);
    vue.facteur = Math.max(1, Math.round(dh / 400));
    vue.vw = Math.max(2, Math.floor(dw / vue.facteur / 2) * 2);      // jamais plus large que l'écran (sinon il est amputé)
    vue.vh = Math.max(2, Math.floor(dh / vue.facteur / 2) * 2);
    renderer.setSize(vue.vw, vue.vh, false);
    canvas.style.width = (vue.vw * vue.facteur / dpr) + 'px';
    canvas.style.height = (vue.vh * vue.facteur / dpr) + 'px';
    borner();
  }

  // ─── Coordonnées ───
  // pixels CSS dans le canvas → [x, y] du terrain (mètres), en tenant compte du relief
  const mVP = new THREE.Matrix4();
  const rayon = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3();
  function versTerrain(px, py) {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    ndc.set(px / w * 2 - 1, -(py / h) * 2 + 1);
    rayon.setFromCamera(ndc, camera);
    const o = rayon.ray.origin, d = rayon.ray.direction;
    // le sol à la hauteur où le rayon le touche (quelques allers-retours sur le relief)
    let hy = SOL_Y, x = vue.cx, z = vue.cz;
    if (d.y > -1e-4) return [-1e5, -1e5];                 // le rayon regarde le ciel : hors de tout secteur (les ordres le refusent)
    for (let k = 0; k < 6; k++) {
      if (d.y > -1e-4) break;
      const t = (hy - o.y) / d.y;
      x = o.x + d.x * t; z = o.z + d.z * t;
      if (!T) break;
      hy = surface(x, z);
    }
    return [x, z];
  }
  // [x, y] du terrain (et une hauteur) → pixels CSS
  function versEcran(x, y, h = null) {
    if (h === null && T) h = surface(x, y);
    v3.set(x, h ?? SOL_Y, y);
    if (v3.clone().applyMatrix4(camera.matrixWorldInverse).z >= 0) return [-1e5, -1e5];     // derrière la caméra (elle tourne librement)
    v3.project(camera);
    const w = canvas.clientWidth || 1, hh = canvas.clientHeight || 1;
    return [(v3.x + 1) / 2 * w, (1 - v3.y) / 2 * hh];
  }

  // ─── Une image ───
  const perf = { rendu: 0, fini: 0, sol: 0, n: 0 };
  const unPixel = new Uint8Array(4);
  let tAnim = 0, vide = false;            // vide : rien n'est dessiné (mesure du prix de l'attente)
  function dessiner(dt, evenements = []) {
    if (!B) return;
    const t0 = performance.now();
    for (const e of evenements) if (e.type === 'impact') eclats.impactVu(e.x, e.y, e.cal);
    eclats.majTirs(dt);
    // la caméra glisse vers sa cible : un mouvement doux plutôt qu'un saut
    const lisse = 1 - Math.exp(-dt * 7);
    vue.yaw += (vue.cible.yaw - vue.yaw) * lisse; vue.tangage += (vue.cible.tangage - vue.tangage) * lisse;
    if (respiration) {
      // un balancement très lent, comme une respiration (deux périodes qui ne tombent jamais juste ensemble)
      souffle.t += dt;
      souffle.yaw = respiration * Math.sin(souffle.t * 2 * Math.PI / 23);
      souffle.tangage = respiration * 0.6 * Math.sin(souffle.t * 2 * Math.PI / 31 + 1);
    }
    borner();
    majSol(false, dt);
    if (!vide) sol.visible = true;
    majMorceaux(); projeter();
    vegetation.setTemps(tAnim); soldats.setTemps(tAnim);
    const t1 = performance.now();
    temps.majSoleil(horloge(B));
    majSoldats();
    tAnim += dt;
    eclats.majEclats(dt); eclats.majCorbeaux(dt, tAnim); troncons.maj(dt);
    const h = horloge(B);
    ciel.montrer(!!leBord?.meteo && !vide);
    if (leBord?.meteo && !vide) {
      const c = ciel.horizon(h.meteo, cielMeteo);
      ciel.maj(h.meteo, tAnim);
      renderer.setClearColor(c, 1); solMat.uniforms.uBordCoul.value.copy(c); fauxU?.uBrume.value.copy(c);
    }
    const sombre = temps.majNuit(h); temps.setTemps(tAnim);
    ciel.nuit(sombre || 0, tAnim, h.jour, B.etat.graine, h.meteo);       // les étoiles, la lune et les nuages de la nuit (v0.40.0)
    meteo.afficher(h, vide);
    const { cx, cz, p } = projeter();
    meteo.maj(tAnim, cx, cz, p, vue);
    eclats.setTaille(Math.max(1, Math.round(p / 2)));
    renderer.render(scene, camera);
    const t2 = performance.now();
    // gl.finish() n'attend pas le rendu logiciel de Chromium : lire un pixel, si (mesure honnête)
    if (mesure) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, unPixel);
    const t3 = performance.now();
    perf.sol += (t1 - t0 - perf.sol) * 0.05;
    perf.rendu += (t2 - t1 - perf.rendu) * 0.05;
    perf.fini += (t3 - t1 - perf.fini) * 0.05;
    perf.n++;
  }

  return {
    attacher, dessiner, redimensionner, versTerrain, versEcran, vue, renderer, scene,
    hauteurSol: (x, y) => surfaceLisse(x, y),      // la hauteur où l'on pose un homme (m), pour viser son corps entier (v0.35.0)
    set choisis(s) { choisis = s; },
    // le style de la nuit : 'halos' (le jeu), 'doux', 'trame' (l'ancienne, gardée au labo)
    set styleNuit(m) { temps.setStyleNuit(m); },
    set vide(v) { vide = v; scene.children.forEach(o => { o.visible = !v; }); },
    zoomer(d, ancre = null) {
      const avant = ancre ? versTerrain(...ancre) : null;
      const z = Math.max(0, Math.min(ZOOMS.length - 1, vue.zoom + d));
      if (T && !vue.ciel && !tient(z, 0)) return;                 // plus loin, la vue sortirait du terrain (la caméra libre : rien ne la borne que le sol)
      vue.zoom = z;
      if (avant) {
        const apres = versTerrain(...ancre);
        vue.cx += avant[0] - apres[0]; vue.cz += avant[1] - apres[1];
      }
      borner();
    },
    deplacer(dx, dz) { vue.cx += dx; vue.cz += dz; borner(); },
    // déplacer selon l'écran (droite, bas), en mètres
    deplacerEcran(sx, sy) {
      const c = Math.cos(vue.yaw), s = Math.sin(vue.yaw);
      vue.cx += c * sx + s * sy; vue.cz += -s * sx + c * sy; borner();
    },
    // tourner (rad) et incliner (k) la caméra, dans ses bornes
    tourner(dYaw, dTangage = 0) {
      if (vue.ciel) { vue.cible.yaw += dYaw; vue.cible.tangage = Math.max(TG_CIEL_MIN, Math.min(TG_CIEL_MAX, vue.cible.tangage + dTangage)); return; }     // libre : n'importe quelle direction, de l'horizon au zénith
      vue.cible.yaw = Math.max(-YAW_MAX, Math.min(YAW_MAX, vue.cible.yaw + dYaw));
      vue.cible.tangage = Math.max(TANGAGE_MIN, Math.min(TANGAGE_MAX, vue.cible.tangage + dTangage));
    },
    // la caméra libre (l'écran titre, Jérôme v0.8.2) : n'importe quelle direction, jusqu'au ras du sol, sans bornes ;
    // le ciel prend la couleur de la brume (le ciel bas)
    cameraLibre(yaw, tangage) {
      vue.libre = true; vue.ciel = false;
      vue.cible.yaw = vue.yaw = yaw; vue.cible.tangage = vue.tangage = tangage;
      renderer.setClearColor(cielCoul(), 1);
    },
    placerCamera(yaw, tangage) {
      // (la caméra du jeu est libre depuis la v0.28.0 : le ciel est de la couleur de la brume, comme à l'écran titre)
      vue.libre = false; vue.ciel = true; renderer.setClearColor(cielCoul(), 1);
      vue.cible.yaw = vue.yaw = yaw;
      vue.cible.tangage = vue.tangage = Math.max(TG_CIEL_MIN, Math.min(TG_CIEL_MAX, tangage));
    },
    // le bord du terrain, changeable en route (le jeu : `faux-noir` ; l'écran titre : null)
    get bord() { return bord; },
    set bord(nom) {
      bord = nom; leBord = BORDS[nom] || null;
      solMat.uniforms.uBord.value = leBord ? leBord.fondu : 0; solMat.uniforms.uBordCoul.value = col(leBord ? leBord.ciel : 't');
      faireFaux();
      if (vue.ciel || vue.libre) renderer.setClearColor(cielCoul(), 1);
    },
    get ppm() { return ZOOMS[vue.zoom]; },
    // une fumée qui dérive, posée en (x, z) (l'écran titre en épaissit le champ)
    clignoter: troncons.clignoter,
    survoler(reg, troncons) { soldats.survoler(reg); survolTroncons = troncons; },
    surligner(s) { troncons.surligner(s); },
    get legere() { return soldats.legere; }, set legere(v) { soldats.legere = v; },
    fumer(x, z) { eclats.fumer(x, z); },
    lancers(liste) { eclats.lancers(liste); },      // le labo : un homme jeté en l'air
    get stats() {
      let tri = 0;
      for (const m of morceaux) tri += (m.geometry.attributes.position?.count || 0) / 3;
      return { ms: { sol: +perf.sol.toFixed(2), rendu: +perf.rendu.toFixed(2), renduFini: +perf.fini.toFixed(2) }, triangles: tri, trianglesDessines: renderer.info.render.triangles, soldatsVus: soldats.vus, touffesVues: vegetation.vuesHerbe, appels: renderer.info.render.calls, rangees: coutRangees };
    },
    detruire() { renderer.dispose(); },
  };
  /* La vue ne sort jamais du terrain (Jérôme, v0.3.0). coinsSol : où les quatre
     coins de l'écran touchent le sol (à SOL_Y), par rapport au point visé ; ça ne
     dépend que du zoom et des angles. HAUT : la marge du bas, où un sol en
     hauteur remonte. */
  function coinsSol(zoom, yaw, tg) {
    const D = distance(zoom), o = versCamera(yaw, tg);
    const f = [-o[0], -o[1], -o[2]];                                   // vers le point visé
    let r = [f[2], 0, -f[0]]; const lr = Math.hypot(r[0], r[2]) || 1; r = [r[0] / lr, 0, r[2] / lr];   // à droite (horizontal)
    // f × r donnerait le bas : u, le haut de l'écran
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const ty = Math.tan(vue.fov * Math.PI / 360), tx = ty * vue.vw / vue.vh;
    const out = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, ok: true };
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const d = [f[0] + r[0] * a * tx + u[0] * b * ty, f[1] + r[1] * a * tx + u[1] * b * ty, f[2] + r[2] * a * tx + u[2] * b * ty];
      if (d[1] >= -1e-3) { out.ok = false; continue; }                // ce coin regarde au-dessus de l'horizon
      const t = -o[1] * D / d[1], x = o[0] * D + d[0] * t, z = o[2] * D + d[2] * t;
      out.x0 = Math.min(out.x0, x); out.x1 = Math.max(out.x1, x); out.z0 = Math.min(out.z0, z); out.z1 = Math.max(out.z1, z);
    }
    return out;
  }
  function tient(zoom, yaw) {
    const c = coinsSol(zoom, yaw, tangageVu());
    return c.ok && c.x1 - c.x0 <= T.W && c.z1 - c.z0 + HAUT <= T.H;
  }
  function borner() {
    if (!T || vue.libre) return;              // la caméra libre (l'écran titre) n'a pas de bornes
    if (vue.ciel) {
      // la caméra libre du jeu : le point visé reste sur le terrain, la caméra ne passe pas sous le sol (elle se relève au besoin)
      vue.cx = Math.max(0, Math.min(T.W, vue.cx)); vue.cz = Math.max(0, Math.min(T.H, vue.cz));
      const D = distance(vue.zoom);
      for (const cle of ['cible', 'vue']) {
        const o = cle === 'cible' ? vue.cible : vue;
        let tg = Math.max(TG_CIEL_MIN, Math.min(TG_CIEL_MAX, o.tangage));
        const yaw = cle === 'cible' ? vue.cible.yaw : yawVu();
        for (let k = 0; k < 5; k++) {
          const v = versCamera(yaw, tg), h = surface(vue.cx + v[0] * D, vue.cz + v[2] * D) + GARDE_SOL;
          const need = Math.asin(Math.max(-1, Math.min(1, (h - SOL_Y) / D)));
          if (need <= tg) break;
          tg = Math.min(TG_CIEL_MAX, need);
        }
        o.tangage = tg;
      }
      return;
    }
    // trop loin pour cet écran, même de face : on se rapproche
    while (vue.zoom < ZOOMS.length - 1 && !tient(vue.zoom, 0)) vue.zoom++;
    // trop tourné pour ce zoom : l'angle se réduit (le plus grand qui tient)
    const ymax = yaw => { let lo = 0, hi = Math.abs(yaw); if (tient(vue.zoom, hi)) return hi; for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (tient(vue.zoom, m)) lo = m; else hi = m; } return lo; };
    const lim = ymax(Math.max(Math.abs(vue.cible.yaw), Math.abs(yawVu())) + 1e-9);
    vue.cible.yaw = Math.sign(vue.cible.yaw) * Math.min(Math.abs(vue.cible.yaw), lim);
    vue.yaw = Math.sign(vue.yaw) * Math.min(Math.abs(vue.yaw), Math.max(0, lim - Math.abs(souffle.yaw)));
    const c = coinsSol(vue.zoom, yawVu(), tangageVu());
    if (!c.ok) return;
    vue.cx = Math.max(-c.x0, Math.min(T.W - c.x1, vue.cx));
    vue.cz = Math.max(-c.z0, Math.min(T.H - HAUT - c.z1, vue.cz));
  }
}
