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
import { loadThree } from './three-lib.js?v=0.83.3';
import * as SH from './rendu/shaders.js?v=0.83.3';
import { creerSoldats } from './rendu/soldats.js?v=0.83.3';
import { creerChars } from './rendu/chars.js?v=0.83.3';
import { creerGenies } from './rendu/genies.js?v=0.83.3';
import { creerAvions } from './rendu/avions.js?v=0.83.3';
import { creerPonts } from './rendu/ponts.js?v=0.83.3';
import { creerCiel } from './rendu/ciel.js?v=0.83.3';
import { creerMeteo } from './rendu/meteo.js?v=0.83.3';
import { creerTroncons } from './rendu/troncons.js?v=0.83.3';
import { ARBRES_JEU } from './data/arbres.js?v=0.83.3';
import { creerVegetation } from './rendu/vegetation.js?v=0.83.3';
import { creerTemps } from './rendu/temps.js?v=0.83.3';
import { creerEclats } from './rendu/eclats.js?v=0.83.3';
import { creerOmbresRelief } from './rendu/ombres-relief.js?v=0.83.3';
import { OMBRES_RELIEF as OMB, NUAGES, NUAGES_VENT } from './data/soleil.js?v=0.83.3';
import { PALETTE, ORDRE, INDICE } from './palette.js?v=0.83.3';
import { OMBRE, couleursLigne } from './apparence.js?v=0.83.3';
import { MORCEAU, hauteurVueQ as hauteurQ, hauteurVueM as hauteurM } from './terrain.js?v=0.83.3';
import { horloge, secteurDuJeu, rangDe } from './bataille.js?v=0.83.3';
import { GRADES } from './data/grades.js?v=0.83.3';
import { profilFleuve } from './eaux.js?v=0.83.3';
import { ligneY } from './tranchees.js?v=0.83.3';

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
const MARGE_RELIEF = 30;                     // m : un sol en hauteur, au premier plan, touche le rayon plus près de la caméra que le niveau de la mer (soldats retirés à tort, v0.73.1)
const HAUT_MAX = 40;                         // m : la plus haute surface que le rayon du pointeur cherche (au-dessus, il passe)
const HAUT = 8;                               // m : marge du bas de l'écran, où un sol en hauteur remonte (borner)
const SOCLE = -8;                             // m : le bas de la coupe du terrain (bord sud)

/* respiration : l'amplitude (rad) du lent balancement de la caméra (0 : immobile). */
export async function creerRendu(canvas, { budgetMs = 4, mesure = false, camera: camDepart = null, respiration = RESPIRATION, soldat: styleSoldat = SOLDAT, cadavre = 'poses', effets = EFFETS, bord = null, arbres = ARBRES_JEU, buissons = {}, grades = 'galons' } = {}) {       // (les buissons variés : en jeu depuis la v0.63.0 ; null : ceux d'avant, au labo ; `grades` : le képi et les galons en jeu depuis la v0.69.0, Jérôme ; null : tous pareils, au labo)

  // un mouvement réduit demandé par le système : la caméra ne bouge pas d'elle-même
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) respiration = 0;
  const THREE = await loadThree();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.localClippingEnabled = true;        // les ruines des ponts sont découpées par des plans (rendu/ponts.js)
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

  // Les ombres du relief (labo « La lumière dans le relief », éteintes dans le jeu) : une case que le soleil ne voit pas prend la couleur de sa paroi dans la texture du sol ; le soleil du labo : saisons, azimut
  let ombresRelief = false, ombresNuages = false, soleilReglage = null, ombreVu = null;
  const ombres = creerOmbresRelief({ hauteurQ });
  const soleilCase = { x: 0, z: 0 }, ecriture = { ms: 0, n: 0, rangees: 0, max: 0, maxOmbre: 0 };      // mesure : la réécriture de la texture du sol
  let B = null, T = null, faux = null, fauxU = null;
  // Le sol a le même relief à tous les zooms (Jérôme, v0.12.0) ; seuls les petits décors (arbres, buissons, herbe) s'effacent de loin
  const petit = () => ZOOMS[vue.zoom] <= POINTS_JUSQUA;
  let sol = null, solTex = null, solTexFin = null, solDataFin = null, solData = null, solIdx = null, solAttente = 0, morceaux = [], vuLigne = null, gelVu = null, coutRangees = 0;
  /* La texture du sol : une couleur par case (RVBA, déjà prise dans la palette),
     et en dessous, la couleur de la paroi de chaque case : une seule lecture de
     texture par pixel (mesuré : la lecture de l'indice puis de la palette coûtait
     un tiers du rendu logiciel). */
  const solMat = new THREE.ShaderMaterial({
    uniforms: { uSol: { value: null }, uTaille: { value: new THREE.Vector2(1, 1) }, uBord: { value: leBord ? leBord.fondu : 0 }, uBordCoul: { value: leBord ? col(leBord.ciel) : new THREE.Color(0) },
      uKaki: { value: new THREE.Color(0) }, uVert: { value: new THREE.Color(0) }, uGlaise: { value: new THREE.Color(0) }, uDissoudre: { value: 0 },
      uSuivre: { value: 0 }, uVersSoleil: { value: new THREE.Vector2(0, 1) },
      uNuage: { value: 0 }, uTemps: { value: 0 }, uVent: { value: new THREE.Vector2(NUAGES_VENT[0], NUAGES_VENT[1]) } },      // l'ombre des nuages (labo) : la part du sol couverte (0 : rien), l'horloge de l'image, le vent       // les parois qui suivent le soleil (labo) : 1 et la direction du soleil, vers lui      // (le bord qui se dissout dans le faux terrain : `faireFaux`)
    vertexShader: SH.solMat.v,
    fragmentShader: SH.solMat.f,
    side: THREE.DoubleSide,
  });
  const PAL_RGB = ORDRE.map(k => rgb(PALETTE[k]));
  const PAROI_RGB = ORDRE.map(k => rgb(PALETTE[OMBRE[k]]));

  // ─── Un morceau de sol : dessus fusionnés, parois sud ───
  // La finesse du sol (Jérôme, v0.52.2) : 1 = la case de 1 m ; 2 = des cubes de 0,5 m dont la hauteur suit la pente (la hauteur dessinée des quatre cases voisines, mêlée au centre du petit cube, arrondie au quart), sauf à un mur d'un mètre cinquante ou plus (tranchée, falaise) : le petit cube prend alors la hauteur de sa case, le bord reste net
  // Dans le jeu (Jérôme, v0.52.3), `finesseDes` : à partir de combien de pixels par mètre le sol passe au demi-mètre (null : le réglage fixe du labo) ; chaque morceau se souvient de la finesse où il a été fait (`userData.F`)
  // et ne se refait que s'il est dans la vue, les autres attendent qu'on les regarde
  let finesse = 1, finesseDes = null, finPerimee = false;
  function hauteurFine(I, J) {
    const x = (I + 0.5) / finesse, z = (J + 0.5) / finesse;
    const fx = x - 0.5, fz = z - 0.5, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const c = (a, b) => hauteurQ(T, Math.max(0, Math.min(T.H - 1, b)) * T.W + Math.max(0, Math.min(T.W - 1, a)));
    const h00 = c(i, j), h10 = c(i + 1, j), h01 = c(i, j + 1), h11 = c(i + 1, j + 1);
    if (Math.max(h00, h10, h01, h11) - Math.min(h00, h10, h01, h11) >= 6) return c(Math.floor(x), Math.floor(z));
    return Math.round((h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz);
  }
  function construireMorceau(mx, my) {
    const i0 = mx * MORCEAU, j0 = my * MORCEAU;
    const i1 = Math.min(T.W, i0 + MORCEAU), j1 = Math.min(T.H, j0 + MORCEAU);
    const F = finesse, w = (i1 - i0) * F, h = (j1 - j0) * F, W2 = T.W * F, H2 = T.H * F, D = 0.25;     // F : cases par mètre (1 : la case de 1 m ; 2 : des cubes de 0,5 m, Jérôme, v0.52.2) ; D : la paroi prend la couleur d'un quart de mètre dans la case au-dessus d'elle, quelle que soit la texture (une case entière ou quatre moitiés : un morceau fait à 1 m peut lire la texture fine)
    const i0s = i0 * F, j0s = j0 * F;
    const pos = [], paroi = [], decal = [], faces = [];
    // `face` : 8 le dessus ; 0 sud, 1 nord, 2 est, 3 ouest (+ 4 si la paroi fait un demi-mètre ou plus : elle peut être à l'ombre) ; le nuanceur du sol s'en sert quand les parois suivent le soleil (labo)
    const quad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, p, ox = 0, oz = 0, face = 8) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
      for (let k = 0; k < 6; k++) { paroi.push(p); decal.push(ox, oz); faces.push(face); }
    };
    // le dessus : rectangles de même hauteur
    const vu = new Uint8Array(w * h);
    let hq;
    if (F === 1) hq = (i, j) => hauteurQ(T, j * T.W + i);
    else {
      // la hauteur fine de tout le morceau et d'une bordure d'un cube, une seule fois (les rectangles et les parois la relisent cent fois)
      const gw = w + 2, grille = new Int16Array(gw * (h + 2));
      for (let j = 0; j < h + 2; j++) for (let i = 0; i < gw; i++) grille[j * gw + i] = hauteurFine(i0s + i - 1, j0s + j - 1);
      hq = (I, J) => grille[(J - j0s + 1) * gw + (I - i0s + 1)];
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (vu[j * w + i]) continue;
      const z = hq(i0s + i, j0s + j);
      let rw = 1;
      while (i + rw < w && !vu[j * w + i + rw] && hq(i0s + i + rw, j0s + j) === z) rw++;
      let rh = 1;
      grandir: while (j + rh < h) {
        for (let k = 0; k < rw; k++) if (vu[(j + rh) * w + i + k] || hq(i0s + i + k, j0s + j + rh) !== z) break grandir;
        rh++;
      }
      for (let jj = 0; jj < rh; jj++) for (let k = 0; k < rw; k++) vu[(j + jj) * w + i + k] = 1;
      const y = z * 0.25, x0 = (i0s + i) / F, x1 = x0 + rw / F, z0 = (j0s + j) / F, z1 = z0 + rh / F;
      // chaque face déborde de quelques centimètres : vue de biais, deux rectangles qui ne partagent pas
      // leurs sommets laissaient des fentes d'un pixel (le noir du fond)
      quad(x0 - E, y, z0 - E, x0 - E, y, z1 + E, x1 + E, y, z1 + E, x1 + E, y, z0 - E, 0);
    }
    // les parois tournées vers le sud : là où la case est plus haute que sa voisine du sud
    for (let j = 0; j < h; j++) {
      const J = j0s + j, dernier = J === H2 - 1;
      let i = 0;
      while (i < w) {
        const haut = hq(i0s + i, J), bas = dernier ? SOCLE * 4 : hq(i0s + i, J + 1);
        if (haut <= bas) { i++; continue; }
        let k = 1;
        while (i + k < w && hq(i0s + i + k, J) === haut && (dernier ? SOCLE * 4 : hq(i0s + i + k, J + 1)) === bas) k++;
        const x0 = (i0s + i) / F, x1 = x0 + k / F, z = (J + 1) / F, ya = haut * 0.25, yb = bas * 0.25;
        quad(x0 - E, yb - E, z, x1 + E, yb - E, z, x1 + E, ya + E, z, x0 - E, ya + E, z, haut - bas >= 2 ? 1 : 0, 0, -D, haut - bas >= 2 ? 4 : 0);
        i += k;
      }
    }
    // les parois tournées vers le nord (Jérôme, v0.47.1 : « les faces nord ont la teinte de l'eau ») : la caméra libre peut regarder vers le sud ; sans elles, on voyait à travers le sol le fond de la couleur du temps
    for (let j = 0; j < h; j++) {
      const J = j0s + j, premier = J === 0;
      let i = 0;
      while (i < w) {
        const haut = hq(i0s + i, J), bas = premier ? SOCLE * 4 : hq(i0s + i, J - 1);
        if (haut <= bas) { i++; continue; }
        let k = 1;
        while (i + k < w && hq(i0s + i + k, J) === haut && (premier ? SOCLE * 4 : hq(i0s + i + k, J - 1)) === bas) k++;
        const x0 = (i0s + i) / F, x1 = x0 + k / F, ya = haut * 0.25, yb = bas * 0.25, Z = J / F;
        quad(x1 + E, yb - E, Z, x0 - E, yb - E, Z, x0 - E, ya + E, Z, x1 + E, ya + E, Z, haut - bas >= 2 ? 1 : 0, 0, D, 1 + (haut - bas >= 2 ? 4 : 0));
        i += k;
      }
    }
    // les parois tournées vers l'est et l'ouest (vues quand la caméra tourne) ; les bords du champ descendent au socle.
    // L'ouest est éclairé (la lumière vient du nord-ouest) : il garde la couleur du dessus.
    for (let i = 0; i <= w; i++) {
      const I = i0s + i;
      if (I > W2 || (i === w && I !== W2)) continue;
      const hg = I === 0 ? SOCLE * 4 : null, hd = I === W2 ? SOCLE * 4 : null;
      let j = 0;
      while (j < h) {
        const J = j0s + j;
        const g = hg ?? hq(I - 1, J), d = hd ?? hq(I, J);
        if (g === d) { j++; continue; }
        let k = 1;
        while (j + k < h && (hg ?? hq(I - 1, J + k)) === g && (hd ?? hq(I, J + k)) === d) k++;
        const z0 = J / F, z1 = (J + k) / F, X = I / F, ya = Math.max(g, d) * 0.25, yb = Math.min(g, d) * 0.25;
        if (g > d) quad(X, yb - E, z0 - E, X, yb - E, z1 + E, X, ya + E, z1 + E, X, ya + E, z0 - E, g - d >= 2 ? 1 : 0, -D, 0, 2 + (g - d >= 2 ? 4 : 0));   // vers l'est
        else quad(X, yb - E, z1 + E, X, yb - E, z0 - E, X, ya + E, z0 - E, X, ya + E, z1 + E, 0, D, 0, 3 + (d - g >= 2 ? 4 : 0));                          // vers l'ouest
        j += k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aParoi', new THREE.Float32BufferAttribute(paroi, 1));
    g.setAttribute('aDecal', new THREE.Float32BufferAttribute(decal, 2));
    g.setAttribute('aFace', new THREE.Float32BufferAttribute(faces, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(i0 + w / 2, 3, j0 + h / 2), Math.hypot(w, h, 20) / 2);
    return g;
  }

  function reglerFinesse(n) {
    n = n === 2 ? 2 : 1;
    if (n === finesse) return;
    finesse = n;
    if (n === 1) solMat.uniforms.uSol.value = solTex;
    else { solAttente = 0; finPerimee = true; }       // (la texture fine n'a pas suivi pendant qu'on était au mètre : on la réécrit)
  }
  // la hauteur de la surface dessinée en (x, z) : là où l'on pose soldats et arbres
  function surface(x, z) {
    // sur un tablier, le dessus du tablier (v0.69.0 : `hauteurVueQ` ne le lit pas, le sol dessous reste de l'eau : les hommes, les chars, les arbres se posaient 1 m plus bas, dans la pierre, et un dos d'âne les cachait)
    const cp = Math.max(0, Math.min(T.H - 1, z | 0)) * T.W + Math.max(0, Math.min(T.W - 1, x | 0));
    if (T.pont[cp]) return T.pontH[cp] * 0.25;
    if (finesse === 2) return hauteurFine(Math.max(0, Math.min(T.W * 2 - 1, (x * 2) | 0)), Math.max(0, Math.min(T.H * 2 - 1, (z * 2) | 0))) * 0.25;      // le cube de 0,5 m dessiné sous ce point
    const i = Math.max(0, Math.min(T.W - 1, x | 0)), j = Math.max(0, Math.min(T.H - 1, z | 0));
    return hauteurM(T, j * T.W + i);
  }


  // La hauteur lissée entre les centres des cases voisines : un soldat qui passe d'une marche d'un demi-mètre à l'autre (le bord d'un
  // cratère) glisse au lieu de sauter, et ne scintille plus quand il se tient à cheval sur deux cases (Jérôme, v0.16.0).
  function surfaceLisse(x, z) {
    // (sol fin : entre les centres des cubes de 0,5 m, donc au plus un demi-cube d'écart avec ce qui est dessiné)
    const e = finesse === 2 ? 0.5 : 1, fx = x / e - 0.5, fz = z / e - 0.5, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const h = (a, b) => surface((a + 0.5) * e, (b + 0.5) * e);
    return (h(i, j) * (1 - tx) + h(i + 1, j) * tx) * (1 - tz) + (h(i, j + 1) * (1 - tx) + h(i + 1, j + 1) * tx) * tz;
  }

  const soldats = creerSoldats({
    THREE, scene, col, solUniforms: solMat.uniforms, styleSoldat, grades: grades ? GRADES[grades] : null, rangDe, cadavre, surface, surfaceLisse, solY: SOL_Y, POINTS_JUSQUA,
    bataille: () => B, vide: () => vide, tirs: () => eclats.tirs(),
  });

  const vegetation = creerVegetation({
    THREE, scene, col, camera, vue, solY: SOL_Y, distance, surface, petit,
    terrain: () => T, vide: () => vide, ombres: () => temps.ombres,
    ppm: () => ZOOMS[vue.zoom], saison: () => (B ? horloge(B) : null), arbres, buissons,     // (les arbres variés ; null : ceux d'avant, au labo)
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
  const ponts = creerPonts({ THREE, scene, bataille: () => B });
  let aretesPonts = false;
  const chars = creerChars({ THREE, scene, bataille: () => B, hauteur: (x, y) => surfaceLisse(x, y), fumer: (x, z) => eclats.fumer(x, z) });
  const genies = creerGenies({ THREE, scene, bataille: () => B, hauteur: (x, y) => surfaceLisse(x, y) });
  const avions = creerAvions({ THREE, scene, bataille: () => B, hauteur: (x, y) => surfaceLisse(x, y), effets: eclats });
  function attacher(bataille) {
    B = bataille; T = B.terrain;
    // l'herbe de l'automne est rousse (Jérôme, v0.59.4 : « plus orangée, marron ») : les deux verts du sol prennent des teintes de feuilles mortes, hors palette (exception déclarée dans CLAUDE.md) ; les autres saisons gardent les verts
    const roux = (B.etat.sol?.saison ?? 'automne') === 'automne', sombre = h => rgb(h).map(v => Math.round(v * 0.7));
    for (const [k, h] of [['v', '#a86a2c'], ['w', '#8a4c1e']]) { const i = ORDRE.indexOf(k); PAL_RGB[i] = rgb(roux ? h : PALETTE[k]); PAROI_RGB[i] = roux ? sombre(h) : rgb(PALETTE[OMBRE[k]]); }
    if (finesseDes !== null) { finesse = 1; finPerimee = false; }      // une autre bataille : tout se fait d'abord au mètre, `dessiner` choisit ensuite
    if (sol) { scene.remove(sol); sol.children.forEach(m => m.userData.fin?.dispose()); solTex.dispose(); solTexFin?.dispose(); solTexFin = null; solDataFin = null; }
    ombres.attacher(T); ombreVu = new Uint32Array(T.H);
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
    chars.vider(); ponts.vider(); avions.vider(); genies.vider();
    eclats.reinitialiser();   // (une autre bataille : ses arbres ne brûlent pas encore)
    vue.cx = T.W / 2; vue.cz = T.H * 0.62;
    faireFaux();
  }
  // le faux terrain au-delà du bord (le bord `faux` et `faux-noir`) : un plan immense posé juste sous le sol
  // Les fleuves qui touchent le bord du terrain (v0.47.1 ; v0.51.0 : ils suivent leur vrai tracé) : pour chaque bout, le point où l'axe du fleuve (son trait, plus son écart de méandre : `profilFleuve`) quitte le terrain,
  // sa direction à cet endroit, sa demi-largeur de là (elle varie : on prend celle du dernier mètre dans le terrain), puis une phase, une amplitude et un nombre, tirés du point (un hachage : la même graine donne les mêmes
  // méandres hors carte). Un bout resté dans le terrain, à moins de sa largeur du bord, est prolongé tout droit. Au plus quatre.
  function fleuvesSortants() {
    const out = [];
    if (!B || !T) return out;
    const S = secteurDuJeu(B.etat), m = B.etat.marges, W = T.W, H = T.H, dedans = (x, z) => x >= 0 && z >= 0 && x <= W && z <= H;
    for (const O of S.objets || []) {
      if (O.o !== 'fleuve' || !(O.r > 0)) continue;
      const F = { ...O, x2: O.x2 ?? O.x, y2: O.y2 ?? O.y }, P = profilFleuve(F), L = P.long || 1;
      const axe = s => { const t = s / L, o = P.off(s); return [F.x + (F.x2 - F.x) * t + o * P.nx + m.x, F.y + (F.y2 - F.y) * t + o * P.ny + m.y]; };
      for (let e = 0; e < 2 && out.length < 8; e++) {
        const sens = e ? -1 : 1, s0 = e ? L : 0;           // e = 0 : le début du trait, on avance de 0 vers L ; e = 1 : la fin, on recule
        let s = s0, [px, pz] = axe(s), ex, ez, dx, dz, demi;
        if (!dedans(px, pz)) {
          // le bout est hors du terrain : on rentre jusqu'au premier point dedans, le fleuve quitte le terrain juste avant
          let sIn = -1;
          for (let k = 0; k <= L; k += 1) { const [qx, qz] = axe(s0 + sens * k); if (dedans(qx, qz)) { sIn = s0 + sens * k; break; } }
          if (sIn < 0) continue;
          const [ix, iz] = axe(sIn), [jx, jz] = axe(sIn - sens * 1), d = Math.hypot(jx - ix, jz - iz) || 1;
          ex = ix; ez = iz; dx = (jx - ix) / d; dz = (jz - iz) / d; demi = P.demi(sIn);
        } else {
          const marge = O.r * 1.5 + 3;
          if (!(px < marge || pz < marge || px > W - marge || pz > H - marge)) continue;      // le bout reste au milieu du terrain : un fleuve qui finit
          const [qx, qz] = axe(s0 + sens * 4), d = Math.hypot(px - qx, pz - qz) || 1;
          dx = (px - qx) / d; dz = (pz - qz) / d; demi = P.demi(s0);
          let t = 0; for (let k = 0; k < 4000 && dedans(px + dx * t, pz + dz * t); k++) t += 0.5;
          ex = px + dx * t; ez = pz + dz * t;
        }
        const g = Math.sin(Math.round(ex) * 12.9898 + Math.round(ez) * 78.233) * 43758.5453, u1 = g - Math.floor(g), u2 = (g * 7.31) - Math.floor(g * 7.31);
        out.push(new THREE.Vector4(ex, ez, dx, dz), new THREE.Vector4(demi, u1 * 6.2832, 22 + 30 * u2, u2));
      }
    }
    return out.slice(0, 8);
  }
  // La hauteur du faux terrain : juste sous le sol, mais jamais au-dessus du point le plus bas du bord du champ (Jérôme, v0.66.4 : « une ligne noire dans le lac, au bord de la carte ») : le plan (à 2,85 m) passait
  // au-dessus du fond d'un lac qui touche le bord (1,5 m) ; entre le bord du champ et le plan, le regard passait sous lui et ne voyait que le fond noir : un trait, épais sur le lac. Il suit donc le bord le plus bas
  // (0,4 m de marge : le sol fin arrondit au quart de mètre) ; un bord plus haut ne cache que quelques mètres du plan, derrière lui.
  function hauteurFaux() {
    let bas = SOL_Y - 0.15;
    const W = T.W, H = T.H, lire = (i, j) => hauteurQ(T, j * W + i) * 0.25;
    for (let i = 0; i < W; i++) bas = Math.min(bas, lire(i, 0) - 0.4, lire(i, H - 1) - 0.4);
    for (let j = 0; j < H; j++) bas = Math.min(bas, lire(0, j) - 0.4, lire(W - 1, j) - 0.4);
    return bas;
  }
  function faireFaux() {
    if (faux) { scene.remove(faux); faux.geometry.dispose(); faux.material.dispose(); faux = null; }
    solMat.uniforms.uDissoudre.value = 0;
    if (!leBord?.faux || !T) return;
    // la saison au-delà du bord (v0.54.0) : l'hiver, un champ blanc où la terre perce ; l'été, une herbe jaunie sans verdure ; l'automne, le sol d'avant
    const saison = B?.etat.sol?.saison, [cKaki, cVert, cGlaise] = saison === 'hiver' ? ['r', 'o', 'h'] : saison === 'ete' ? ['h', 'h', 'g'] : ['h', saison === 'automne' || !saison ? '#a86a2c' : 'v', 'g'];
    const cc = k => k[0] === '#' ? new THREE.Color(k) : col(k);       // (l'herbe rousse de l'automne est hors palette : le faux terrain la prend aussi)
    const u = { uKaki: { value: cc(cKaki) }, uVert: { value: cc(cVert) }, uGlaise: { value: cc(cGlaise) }, uBrume: { value: col(leBord.brume || 'r') }, uCentre: { value: new THREE.Vector2(T.W / 2, T.H / 2) }, uDemi: { value: new THREE.Vector2(T.W / 2, T.H / 2) }, uPortee: { value: 500 } };
    fauxU = u; u.uSol = solMat.uniforms.uSol; u.uTaille = solMat.uniforms.uTaille;       // (le même sol : l'eau du bord continue dans le faux terrain)
    for (const k of ['uKaki', 'uVert', 'uGlaise']) solMat.uniforms[k].value.copy(u[k].value);
    solMat.uniforms.uDissoudre.value = 80;                 // m : la largeur sur laquelle le bord du champ se dissout
    u.uEau = { value: col('e') }; u.uClair = { value: col('r') };
    const riv = fleuvesSortants(); u.uNRiv = { value: riv.length / 2 }; u.uRiv = { value: Array.from({ length: 8 }, (_, k) => riv[k] || new THREE.Vector4()) };
    faux = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2).translate(T.W / 2, hauteurFaux(), T.H / 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: SH.fauxMat.v, fragmentShader: SH.fauxMat.f }));
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
    m.userData.F = finesse;
    m.geometry = m.userData.fin;
    m.userData.version = versionAutour(mx, my);
  }
  // une rangée de la texture du sol, de ses indices (`solIdx`) et de son ombre (`om`) : le dessus, puis la paroi
  function ecrireRangee(j, om) {
    const W = T.W, bas = W * T.H * 4;
    for (let i = 0, c = j * W; i < W; i++, c++) {
      const a = om[c] ? PAROI_RGB[solIdx[c]] : PAL_RGB[solIdx[c]], b = T.profond[c] ? a : PAROI_RGB[solIdx[c]], o = c * 4;      // la paroi d'une eau est de l'eau (v0.47.1) ; à l'ombre du relief, le dessus prend la couleur de la paroi
      const marche = j < T.H - 1 && hauteurQ(T, c) - hauteurQ(T, c + W) >= 4;     // l'alpha dit : une marche d'un mètre au sud
      solData[o] = a[0]; solData[o + 1] = a[1]; solData[o + 2] = a[2]; solData[o + 3] = marche ? 0 : 255;
      solData[bas + o] = b[0]; solData[bas + o + 1] = b[1]; solData[bas + o + 2] = b[2]; solData[bas + o + 3] = 255;
    }
  }
  // Les ombres du relief changent des rangées sans que la couleur du terrain change : on ne repeint que celles qu'on voit (les plus proches du centre d'abord), peu à la fois (le budget
  // de `OMBRES_RELIEF`), sans refaire les couleurs ; la texture n'est envoyée qu'un peu plus tard, comme celle de l'eau. Les rangées hors de la vue attendent qu'on les regarde.
  let solSale = false, solAttenteOmbre = 0, msParRangee = 0.3;
  function majOmbresSol(dt) {
    solAttenteOmbre -= dt;
    const omV = ombres.versions, [, , z0, z1] = zoneVue();
    const j0 = Math.max(0, Math.floor(z0)), j1 = Math.min(T.H - 1, Math.ceil(z1)), sales = [];
    for (let j = j0; j <= j1; j++) if (ombreVu[j] !== omV[j]) sales.push(j);
    if (sales.length && !finPerimee) {
      const t0 = performance.now(), cz = vue.cz;
      sales.sort((a, b) => Math.abs(a - cz) - Math.abs(b - cz));
      const lot = sales.slice(0, Math.max(4, Math.floor(OMB.budgetEcritureMs / msParRangee)));
      const fin = finesse === 2 && solTexFin, om = ombres.masque, W = T.W;
      let cases = 0;
      for (const j of lot) {
        const n = ombres.ligneA(j), ch = ombres.changees;      // seules les cases dont l'ombre a changé sont repeintes
        for (let k = 0; k < n; k++) {
          const i = ch[k], c = j * W + i, a = om[c] ? PAROI_RGB[solIdx[c]] : PAL_RGB[solIdx[c]], o = c * 4;
          solData[o] = a[0]; solData[o + 1] = a[1]; solData[o + 2] = a[2];
          if (fin) texelsFin(i, j, true);
        }
        cases += n; ombreVu[j] = omV[j];
      }
      if (cases) solSale = true;
      msParRangee += ((performance.now() - t0) / lot.length - msParRangee) * 0.3;
      { const d = performance.now() - t0; ecriture.ms += d; ecriture.n++; ecriture.rangees += lot.length; if (d > ecriture.maxOmbre) ecriture.maxOmbre = d; }
    }
    if (solSale && solAttenteOmbre <= 0) { solTex.needsUpdate = true; if (finesse === 2 && solTexFin) solTexFin.needsUpdate = true; solSale = false; solAttenteOmbre = 0.25; }
  }
  // la texture du sol : les rangées dont la couleur a changé
  function majSol(tout = false, dt = 0) {
    const h = horloge(B), gel = h.enneige ? 2 : h.gel ? 1 : 0;       // 2 : la neige blanchit le sol (apparence.js)
    if (gel !== gelVu) { tout = true; gelVu = gel; }
    const sv = soldats.soleilUniform.value; soleilCase.x = sv.x; soleilCase.z = sv.y;
    ombres.maj(ombresRelief, soleilCase, dt);
    const om = ombres.masque, omV = ombres.versions;
    if (!tout) majOmbresSol(dt);
    // l'eau change quelques rangées à chaque pas : on n'envoie la texture qu'un peu plus tard
    solAttente -= dt;
    if (!tout && solAttente > 0) return;
    solAttente = 0.25;
    const tEcr = performance.now();
    let n = 0;
    const changees = [];
    for (let j = 0; j < T.H; j++) {
      // une rangée dépend aussi de sa voisine du sud (la marche entre elles)
      if (!tout && vuLigne[j] === T.versionLigne[j] && (j === T.H - 1 || vuLigne[j + 1] === T.versionLigne[j + 1])) continue;
      couleursLigne(T, j, B.R, gel, solIdx);
      ombres.ligneA(j);
      ecrireRangee(j, om);
      vuLigne[j] = T.versionLigne[j]; ombreVu[j] = omV[j]; n++; changees.push(j);
    }
    if (n) solTex.needsUpdate = true;
    if (finesse === 2 && (n || !solTexFin || finPerimee)) { ecrireFin(changees, !solTexFin || finPerimee); finPerimee = false; }
    coutRangees = n;
    if (n) { const d = performance.now() - tEcr; ecriture.ms += d; ecriture.n++; ecriture.rangees += n; if (d > ecriture.max) ecriture.max = d; }
  }
  // les quatre texels fins d'une case (i, j), de la texture des indices `solIdx` et de l'ombre du relief ; `dessusSeul` : le dessus seulement (l'ombre a changé, pas la paroi)
  const hach = (a, b) => (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0;
  function texelsFin(i, j, dessusSeul) {
    const W = T.W, H = T.H, W2 = W * 2, bas = W2 * H * 2 * 4;
    const c = j * W + i, own = solIdx[c], hq = hauteurQ(T, c);
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      let k = own;
      if (!T.profond[c]) {
        const h = (hach(i * 2 + sx, j * 2 + sy) % 1000) / 1000;
        const ni = i + (sx ? 1 : -1), nj = j + (sy ? 1 : -1);
        if (h < 0.3 && ni >= 0 && ni < W) { const n = j * W + ni; if (!T.profond[n] && hauteurQ(T, n) === hq) k = solIdx[n]; }
        else if (h < 0.6 && nj >= 0 && nj < H) { const n = nj * W + i; if (!T.profond[n] && hauteurQ(T, n) === hq) k = solIdx[n]; }
      }
      const a = ombres.masque[c] ? PAROI_RGB[k] : PAL_RGB[k];
      const o = ((j * 2 + sy) * W2 + i * 2 + sx) * 4;
      solDataFin[o] = a[0]; solDataFin[o + 1] = a[1]; solDataFin[o + 2] = a[2]; solDataFin[o + 3] = 255;
      if (dessusSeul) continue;
      const b = T.profond[c] ? PAL_RGB[k] : PAROI_RGB[k];
      solDataFin[bas + o] = b[0]; solDataFin[bas + o + 1] = b[1]; solDataFin[bas + o + 2] = b[2]; solDataFin[bas + o + 3] = 255;
    }
  }
  // Les couleurs au demi-mètre (v0.52.2) : chaque case de 1 m donne quatre texels ; un petit cube du bord prend de temps en temps la couleur de la case voisine
  // (du même niveau, hors de l'eau profonde) : les taches d'herbe, de boue et les lèvres de cratère se découpent au demi-mètre. Un hachage de la position : aucun hasard.
  function ecrireFin(rangees, tout, envoyer = true) {
    const W = T.W, H = T.H, W2 = W * 2;
    if (!solTexFin) {
      solDataFin = new Uint8Array(W2 * H * 4 * 4);
      solTexFin = new THREE.DataTexture(solDataFin, W2, H * 4, THREE.RGBAFormat, THREE.UnsignedByteType);
      solTexFin.magFilter = solTexFin.minFilter = THREE.NearestFilter; solTexFin.generateMipmaps = false;
      tout = true;
    }
    solMat.uniforms.uSol.value = solTexFin;
    const ligne = j => { for (let i = 0; i < W; i++) texelsFin(i, j, false); };
    if (tout) { for (let j = 0; j < H; j++) ligne(j); }
    else { const vus = new Set(); for (const j of rangees) for (let d = -1; d <= 1; d++) { const r = j + d; if (r >= 0 && r < H && !vus.has(r)) { vus.add(r); ligne(r); } } }
    if (envoyer) solTexFin.needsUpdate = true;
  }
  // le rectangle de sol vu (mètres), avec sa marge ; sans coins (la caméra regarde l'horizon), 250 m autour du point visé
  function zoneVue() {
    const cs = coinsSol(vue.zoom, yawVu(), tangageVu());
    return cs.ok ? [vue.cx + cs.x0 - 30, vue.cx + cs.x1 + 30, vue.cz + cs.z0 - 30, vue.cz + cs.z1 + 40] : [vue.cx - 250, vue.cx + 250, vue.cz - 250, vue.cz + 250];
  }
  // refaire les morceaux changés, les plus proches du centre d'abord, dans le budget
  function majMorceaux() {
    const t0 = performance.now();
    // un morceau fait à une autre finesse ne se refait que dans la vue (marge de 30 m) : ceux d'ailleurs attendent qu'on les regarde
    let vu = null;
    const sales = morceaux.filter(m => {
      if (m.userData.version !== versionAutour(m.userData.mx, m.userData.my)) return true;
      if (m.userData.F === finesse) return false;
      vu ??= zoneVue();
      const x = m.userData.mx * MORCEAU, z = m.userData.my * MORCEAU;
      return x + MORCEAU > vu[0] && x < vu[1] && z + MORCEAU > vu[2] && z < vu[3];
    });
    if (!sales.length) return 0;
    const d = m => ((m.userData.mx + 0.5) * MORCEAU - vue.cx) ** 2 + ((m.userData.my + 0.5) * MORCEAU - vue.cz) ** 2;
    sales.sort((a, b) => d(a) - d(b));
    let n = 0;
    for (const m of sales) {
      refaire(m); n++;
      if (performance.now() - t0 > budgetMs) break;
    }
    morceauxFaits.n += n; morceauxFaits.ms += performance.now() - t0;
    return n;
  }

  const morceauxFaits = { n: 0, ms: 0 };       // les morceaux refaits depuis le début et le temps qu'ils ont coûté (stats)
  let survolTroncons = [];       // les tronçons que le survol allume (lus par troncons.js)

  // ─── Le choix (les régiments choisis) ───
  let choisis = new Set();

  // ─── Les soldats : leurs positions dans les tampons ───
  function majSoldats() {
    const p = ZOOMS[vue.zoom];
    // seulement ceux qu'on voit : le sol vu est un trapèze ; on garde ceux de son rectangle englobant
    const cs = coinsSol(vue.zoom, yawVu(), tangageVu());
    // (un coin de l'écran regarde le ciel : tout le terrain peut être vu, le vrai tri se fait à l'écran)
    // (le relief rapproche du rayon un sol en hauteur, vers la caméra, de quelque côté qu'elle soit : la marge du relief est de tous les côtés ; v0.76.1, la caméra tournée)
    const x0 = cs.ok ? vue.cx + cs.x0 - 6 - MARGE_RELIEF : 0, x1 = cs.ok ? vue.cx + cs.x1 + 6 + MARGE_RELIEF : T.W, z0 = cs.ok ? vue.cz + cs.z0 - 6 - MARGE_RELIEF : 0, z1 = cs.ok ? vue.cz + cs.z1 + 12 + MARGE_RELIEF : T.H;
    // puis le vrai test : projeté, il tombe dans l'écran (le trapèze n'est pas son rectangle)
    projeter();
    mVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = mVP.elements;
    soldats.maj({ x0, x1, z0, z1, e, p, choisis, vh: vue.vh });      // les soldats, leurs anneaux, les corps et les tombes
    vegetation.majHerbe(x0, x1, z0, z1, e, petit()); vegetation.majRoseaux(x0, x1, z0, z1, e, petit());
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
    if (d.y > -1e-4) return [-1e5, -1e5];                 // le rayon regarde le ciel : hors de tout secteur (les ordres le refusent)
    if (!T) { const t = (SOL_Y - o.y) / d.y; return [o.x + d.x * t, o.z + d.z * t]; }
    // le rayon descend jusqu'à la première surface qu'il croise : on marche le long du rayon puis on affine
    // (v0.73.1, Jérôme : « sur les collines et les montagnes on ne peut pas placer les cibles » : l'ancien point fixe, six lectures de la hauteur,
    // oscillait d'un versant à l'autre sur une pente raide et posait l'ordre loin du pointeur)
    const tHaut = (SOL_Y + HAUT_MAX - o.y) / d.y, tBas = (SOL_Y - 8 - o.y) / d.y;
    const sous = t => o.y + d.y * t <= surface(o.x + d.x * t, o.z + d.z * t);
    const pas = 0.5;                                      // (le rayon est unitaire : un demi-mètre le long de lui)
    let t = Math.max(0, tHaut), tPrec = t;
    while (t < tBas && !sous(t)) { tPrec = t; t += pas; }
    if (t >= tBas) t = tBas;
    for (let k = 0; k < 10; k++) { const m = (t + tPrec) / 2; if (sous(m)) t = m; else tPrec = m; }
    const x = o.x + d.x * t, z = o.z + d.z * t;
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
    for (const e of evenements) { if (e.type === 'impact') eclats.impactVu(e.x, e.y, e.cal); else if (e.type === 'avion-ecrase') eclats.ecraser(e.x, e.y); }
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
    if (finesseDes !== null) reglerFinesse(!vue.libre && ZOOMS[vue.zoom] >= finesseDes ? 2 : 1);      // le sol au demi-mètre de près (v0.52.3)
    majSol(false, dt);
    if (!vide) sol.visible = true;
    majMorceaux(); projeter();
    vegetation.setTemps(tAnim); soldats.setTemps(tAnim);
    const t1 = performance.now();
    const hj = horloge(B);
    temps.majSoleil(hj, soleilReglage);
    { const nu = ombresNuages ? NUAGES[hj.meteo] : null;             // l'ombre des nuages (labo) : le jour, par un temps à plaques
      solMat.uniforms.uNuage.value = nu?.taches && hj.phase === 'jour' ? 0.5 + (nu.taches - 0.5) * 0.55 : 0; solMat.uniforms.uTemps.value = tAnim; }
    { const sv = soldats.soleilUniform.value, n = Math.hypot(sv.x, sv.y);           // les parois selon le soleil (labo) ; la nuit (soleil nul), celles du jeu
      solMat.uniforms.uSuivre.value = soleilReglage?.parois && n > 0.05 ? 1 : 0; if (n > 0.05) solMat.uniforms.uVersSoleil.value.set(-sv.x / n, -sv.y / n); }
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
    chars.maj(dt, sombre || 0); genies.maj(dt); avions.maj(dt, sombre || 0); ponts.maj(sombre || 0, aretesPonts);
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
    hauteurDessinee: (x, y) => surface(x, y),       // la hauteur du cube dessiné sous ce point (les tests)
    hauteurSol: (x, y) => surfaceLisse(x, y),      // la hauteur où l'on pose un homme (m), pour viser son corps entier (v0.35.0)
    set choisis(s) { choisis = s; },
    // le style de la nuit : 'halos' (le jeu), 'doux', 'trame' (l'ancienne, gardée au labo)
    set styleNuit(m) { temps.setStyleNuit(m); },
    get finesse() { return finesse; },
    get ombresRelief() { return ombresRelief; },
    set ombresRelief(v) { ombresRelief = !!v; solAttente = 0; },      // les ombres du relief sur le sol (labo)
    get ombresNuages() { return ombresNuages; },
    set ombresNuages(v) { ombresNuages = !!v; },                    // l'ombre des nuages sur le sol (labo)
    get soleilReglage() { return soleilReglage; },
    set soleilReglage(r) { soleilReglage = r; },                           // { saisonnier, azimut } : la course du soleil à essayer (labo)
    // vérification (tests, labo) : sur les rangées à jour, le masque incrémental est celui qu'un calcul neuf donne, et la texture du sol le dit (le dessus d'une case à l'ombre : la couleur de sa paroi)
    verifierOmbres() {
      const neuf = creerOmbresRelief({ hauteurQ }); neuf.attacher(T); neuf.maj(true, ombres.calcule, 99);
      const W = T.W, omV = ombres.versions; let lignes = 0, ecartsMasque = 0, ecartsTexture = 0, ecartsFin = 0;
      for (let j = 0; j < T.H; j++) {
        if (ombreVu[j] !== omV[j] || vuLigne[j] !== T.versionLigne[j]) continue;
        lignes++; neuf.ligneA(j);
        for (let i = 0; i < W; i++) {
          const c = j * W + i, o = c * 4, a = ombres.masque[c] ? PAROI_RGB[solIdx[c]] : PAL_RGB[solIdx[c]];
          if (neuf.masque[c] !== ombres.masque[c]) ecartsMasque++;
          if (solData[o] !== a[0] || solData[o + 1] !== a[1] || solData[o + 2] !== a[2]) ecartsTexture++;
          if (finesse === 2 && solDataFin) { const W2 = W * 2, f = (j * 2 * W2 + i * 2) * 4; if (ombres.masque[c] && !T.profond[c] && solDataFin[f] === PAL_RGB[solIdx[c]][0] && solDataFin[f + 1] === PAL_RGB[solIdx[c]][1] && solDataFin[f + 2] === PAL_RGB[solIdx[c]][2] && PAL_RGB[solIdx[c]].some((v, k) => v !== PAROI_RGB[solIdx[c]][k])) ecartsFin++; }
        }
      }
      return { lignes, ecartsMasque, ecartsTexture, ecartsFin };
    },
    get ombresReliefEtat() { return { calcule: ombres.calcule, enCours: false, mesure: { ...ombres.mesure, ecriture: { ...ecriture } } }; },
    set finesse(n) { reglerFinesse(n); },      // le sol se refait morceau par morceau, dans la vue d'abord (majMorceaux) : v0.52.2
    get finesseDes() { return finesseDes; },
    set finesseDes(px) { finesseDes = px; },       // le jeu : le sol passe au demi-mètre à partir de ce nombre de pixels par mètre (v0.52.3)
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
    set aretesPonts(v) { aretesPonts = !!v; },       // le génie vise : les ponts coupés se montrent en arêtes (v0.67.0)
    survoler(reg, troncons) { soldats.survoler(reg); survolTroncons = troncons; },
    surligner(s) { troncons.surligner(s); },
    get legere() { return soldats.legere; }, set legere(v) { soldats.legere = v; },
    fumer(x, z) { eclats.fumer(x, z); },
    reglerBuissons(o) { vegetation.reglerBuissons(o); },        // les buissons variés (null : ceux d'avant) ; le labo
    reglerArbres(o) { vegetation.regler(o); },           // les arbres variés (null : ceux d'avant) ; le labo et la mesure
    set saisonArbres(m) { vegetation.forcer(m); },       // des feuilles d'une saison qui n'en est pas une (le printemps du labo)
    lancers(liste) { eclats.lancers(liste); },      // le labo : un homme jeté en l'air
    get stats() {
      let tri = 0;
      for (const m of morceaux) tri += (m.geometry.attributes.position?.count || 0) / 3;
      return { ms: { sol: +perf.sol.toFixed(2), rendu: +perf.rendu.toFixed(2), renduFini: +perf.fini.toFixed(2) }, triangles: tri, trianglesDessines: renderer.info.render.triangles, soldatsVus: soldats.vus, gradesVus: soldats.gradesVus, touffesVues: vegetation.vuesHerbe, trianglesArbres: vegetation.trianglesArbres, msArbres: +vegetation.msArbres.toFixed(3), appels: renderer.info.render.calls, rangees: coutRangees, morceauxRefaits: morceauxFaits.n, msMorceaux: +morceauxFaits.ms.toFixed(1) };
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
    if (!T) return;
    // la caméra libre de l'écran titre passe aussi par là (Jérôme, v0.60.1 : « elle passe encore sous le sol, interdire ») : ni sous le sol, ni hors du terrain
    if (vue.ciel || vue.libre) {
      // la caméra libre du jeu : le point visé reste sur le terrain, la caméra ne passe pas sous le sol (elle se relève au besoin)
      vue.cx = Math.max(0, Math.min(T.W, vue.cx)); vue.cz = Math.max(0, Math.min(T.H, vue.cz));
      const D = distance(vue.zoom);
      { const v = versCamera(yawVu(), vue.tangage), px = vue.cx + v[0] * D, pz = vue.cz + v[2] * D;      // la caméra reste au-dessus du terrain : au-delà de son bord, il n'y a que le vide
        vue.cx += Math.max(8, Math.min(T.W - 8, px)) - px; vue.cz += Math.max(8, Math.min(T.H - 8, pz)) - pz; }
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
