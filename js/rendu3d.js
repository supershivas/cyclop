/* Le rendu, en three.js (profil pixel-3d-three de game-system). Il lit l'état
   de la bataille et ne le modifie jamais.

   - Caméra : une vraie perspective, à angle étroit (`fov`, 30°), très plongée
     (`tangage`, 54°) : ce qui est loin paraît plus petit, on sent la profondeur
     (Jérôme, v0.3.0 : « les régiments lointains apparaissent plus petits »). Au
     point visé, un mètre = `ppm` pixels (le zoom va par facteurs entiers). On la
     tourne (`yaw`) et l'incline un peu, en douceur ; elle ne sort jamais du
     terrain (borner). Seules les parois tournées vers le sud, l'est et l'ouest
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
import { loadThree } from './three-lib.js?v=0.10.0';
import { PALETTE, ORDRE, INDICE } from './palette.js?v=0.10.0';
import { OMBRE, couleursLigne } from './apparence.js?v=0.10.0';
import { MORCEAU, hauteurVueQ as hauteurQ, hauteurVueM as hauteurM } from './terrain.js?v=0.10.0';
import { horloge } from './bataille.js?v=0.10.0';
import { ligneY } from './tranchees.js?v=0.10.0';

export const CAMERA = { yaw: 0.15, tangage: 0.95, fov: 30 };   // au départ : tournée de 9°, plongée de 54°, angle de 30°
// la caméra respire : un balancement très lent, 2° en 23 s (Jérôme, v0.3.1 : variante D du labo retenue)
// les effets du jeu (Jérôme, v0.8.0 : « tout ensemble ») : la gerbe de terre, l'onde, l'obus qui tombe, la fumée qui
// reste, le feu, les fusées éclairantes le soir, les corbeaux au-dessus des morts
export const EFFETS = { gerbe: true, onde: true, chute: true, derive: true, feu: true, fusees: true, corbeaux: true };
export const SOLDAT = 'silhouette';            // le style des soldats de près (Jérôme, v0.8.0 : la silhouette complète ; labo : boite, detail, fusil, silhouette, marche)
export const RESPIRATION = 0.035;
export const YAW_MAX = 0.6, TANGAGE_MIN = 0.7, TANGAGE_MAX = 1.35;
const SOL_Y = 3;                              // m : la hauteur moyenne du sol (le point visé, le sol à plat des zooms 1 et 2)
export const ZOOMS = [1, 2, 3, 4, 6, 8];      // pixels (logiques) par mètre
const POINTS_JUSQUA = 2;                      // zoom où un soldat n'est plus qu'un point
const PLAT_JUSQUA = 2;                        // zoom où le sol devient une seule image plate (une marche d'un quart y fait un demi-pixel)
const PLUIE = 1600, ECLATS = 2400;
 const E = 0.03;                               // m : le débord des faces (pas de fente vue de biais)
const HAUT = 8;                               // m : marge du bas de l'écran, où un sol en hauteur remonte (borner)
const SOCLE = -8;                             // m : le bas de la coupe du terrain (bord sud)

/* respiration : l'amplitude (rad) du lent balancement de la caméra (0 : immobile). */
export async function creerRendu(canvas, { budgetMs = 4, mesure = false, camera: camDepart = null, respiration = RESPIRATION, soldat: styleSoldat = SOLDAT, effets = EFFETS } = {}) {
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
    camera.near = D * 0.15; camera.far = D * (vue.libre ? 6 : 5);       // (au ras du sol, la vue porte plus loin ; au-delà, le ciel bas)
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

  let B = null, T = null, solPlat = null;
  const plat = () => ZOOMS[vue.zoom] <= PLAT_JUSQUA;
  let sol = null, solTex = null, solData = null, solIdx = null, solAttente = 0, morceaux = [], vuLigne = null, gelVu = null, coutRangees = 0;
  /* La texture du sol : une couleur par case (RVBA, déjà prise dans la palette),
     et en dessous, la couleur de la paroi de chaque case : une seule lecture de
     texture par pixel (mesuré : la lecture de l'indice puis de la palette coûtait
     un tiers du rendu logiciel). */
  const solMat = new THREE.ShaderMaterial({
    uniforms: { uSol: { value: null }, uTaille: { value: new THREE.Vector2(1, 1) }, uPlat: { value: 0 } },
    vertexShader: `
      attribute float aParoi; attribute vec2 aDecal;
      varying vec2 vUV;
      uniform vec2 uTaille;
      void main() {
        // une paroi prend la couleur de la case au-dessus d'elle (aDecal : vers elle), en plus sombre (la moitié basse de la texture)
        vec2 xz = position.xz + aDecal;
        vUV = vec2(xz.x / uTaille.x, (xz.y / uTaille.y + (aParoi > 0.5 ? 1.0 : 0.0)) * 0.5);
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uSol; uniform float uPlat;
      varying vec2 vUV;
      void main() {
        vec4 c = texture2D(uSol, vUV);
        // à plat (zooms 1 et 2), une marche d'un mètre devient une courbe de niveau : la couleur de sa paroi
        if (uPlat > 0.5 && c.a < 0.5) c = texture2D(uSol, vUV + vec2(0.0, 0.5));
        gl_FragColor = vec4(c.rgb, 1.0);
      }`,
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


  // ─── Les soldats ───
  // Une boîte de 0,5 × 1,7 × 0,35 m et son ombre ; de près (DETAIL_DES pixels par mètre), selon le style
  // (`soldat` de creerRendu, comparé au labo) : jambes, tête, casque, fusil, sac, et les jambes qui marchent.
  // Les parties : 0 la vareuse (la couleur du camp), 1 l'ombre, 2 le casque (l'os pour les choisis),
  // 3 les jambes (bandes molletières), 4 le fusil, 5 le sac, 6 le visage.
  let cap = 0, posArr = null, campArr = null, vitArr = null, soldatsInst = null, soldatsDetail = null, soldatsPoints = null, attrsI = null, attrsP = null;
  const DETAIL_DES = 6;                    // (à 4 pixels par mètre, un homme en fait 7 de haut : la silhouette ne s'y voyait pas, et coûtait 138 000 triangles pour 2 000 hommes)
  const soldatMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') },
      uJambes: { value: col('s') }, uFusil: { value: col('t') }, uSac: { value: col('g') }, uVisage: { value: col('h') }, uT: { value: 0 },
      uSol: solMat.uniforms.uSol, uTaille: solMat.uniforms.uTaille,
      uSoleil: { value: new THREE.Vector2(0.5, 0.6) } },
    vertexShader: `
      attribute vec3 aPos; attribute float aCamp; attribute float aPart; attribute float aJambe; attribute float aVit;
      uniform float uT; uniform vec2 uSoleil;
      varying float vCamp; varying float vPart; varying vec2 vXZ; varying float vLong;
      void main() {
        vCamp = aCamp; vPart = aPart; vLong = position.y;
        vec3 p = position;
        // l'ombre suit le soleil : elle part des pieds, longue le matin et le soir (uSoleil : son bout, par mètre de hauteur)
        if (aPart > 0.5 && aPart < 1.5) {
          vec2 d = length(uSoleil) > 0.05 ? normalize(uSoleil) : vec2(0.6, 0.8);
          vec2 xz = vec2(-d.y, d.x) * position.x + (position.y > 0.5 ? uSoleil * 1.7 + d * 0.1 : -d * 0.05);
          p = vec3(xz.x, 0.03, xz.y);
        }
        vXZ = (p + aPos).xz;
        // les jambes qui marchent : un balancement autour de la hanche (0,8 m), selon la vitesse
        if (aJambe != 0.0 && aVit > 0.15) {
          float a = sin(uT * 8.0 + aPos.x * 1.7 + aPos.z * 1.3) * 0.5 * min(1.0, aVit) * aJambe;
          float y = p.y - 0.8;
          p.z = p.z * cos(a) - y * sin(a);
          p.y = 0.8 + p.z * sin(a) + y * cos(a);
        }
        gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel;
      uniform vec3 uJambes; uniform vec3 uFusil; uniform vec3 uSac; uniform vec3 uVisage;
      uniform sampler2D uSol; uniform vec2 uTaille;
      varying float vCamp; varying float vPart; varying vec2 vXZ; varying float vLong;
      float bayer4(vec2 p) {
        vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0);
        float m = a.x * 2.0 + a.y * 3.0 - a.x * a.y * 4.0;
        float n = b.x * 2.0 + b.y * 3.0 - b.x * b.y * 4.0;
        return (m * 4.0 + n + 0.5) / 16.0;
      }
      void main() {
        float k = floor(vPart + 0.5);
        // l'ombre : le sol qu'elle couvre, un ton plus sombre (la couleur de ses parois), tramée de plus en plus
        // claire vers son bout (une ombre noire et pleine se lisait comme une tache)
        if (k == 1.0) {
          if (bayer4(floor(gl_FragCoord.xy)) > 0.95 - 0.6 * vLong) discard;
          gl_FragColor = vec4(texture2D(uSol, vec2(vXZ.x / uTaille.x, (vXZ.y / uTaille.y + 1.0) * 0.5)).rgb, 1.0);
          return;
        }
        bool sel = vCamp > 1.5;
        float camp = sel ? vCamp - 2.0 : vCamp;
        vec3 c = camp > 0.5 ? uEux : uNous;
        if (k == 1.0) c = uOmbre;
        else if (k == 2.0 && sel) c = uSel;           // le casque des choisis
        else if (k == 3.0) c = uJambes;
        else if (k == 4.0) c = uFusil;
        else if (k == 5.0) c = uSac;
        else if (k == 6.0) c = uVisage;
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  // les faces d'une boîte qu'on voit d'ici : le dessus, le sud, l'est et l'ouest (jamais le nord ni le dessous)
  function boiteVue(out, x0, x1, y0, y1, z0, z1, part, jambe = 0, dessusPart = part) {
    const q = (a, b, c, d, k) => { out.p.push(...a, ...b, ...c, ...a, ...c, ...d); for (let n = 0; n < 6; n++) { out.k.push(k); out.j.push(jambe); } };
    q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], dessusPart);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], part);
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], part);
    q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], part);
  }
  function geometrieSoldat(style) {
    const g = { p: [], k: [], j: [] };
    // l'ombre au sol vers le sud-est (la lumière vient du nord-ouest)
    // (y = 1 : le bout de l'ombre, déplacé par le shader selon le soleil)
    g.p.push(-0.22, 0, 0, 0.22, 0, 0, 0.22, 1, 0, -0.22, 0, 0, 0.22, 1, 0, -0.22, 1, 0); for (let n = 0; n < 6; n++) { g.k.push(1); g.j.push(0); }
    const membres = style === 'detail' || style === 'silhouette' || style === 'marche';
    if (!membres) boiteVue(g, -0.25, 0.25, 0, 1.7, -0.175, 0.175, 0, 0, 2);          // la boîte ; son dessus, le casque
    else {
      boiteVue(g, -0.2, -0.03, 0, 0.82, -0.09, 0.09, 3, 1);                          // les jambes
      boiteVue(g, 0.03, 0.2, 0, 0.82, -0.09, 0.09, 3, -1);
      boiteVue(g, -0.24, 0.24, 0.8, 1.42, -0.15, 0.15, 0);                           // la vareuse
      boiteVue(g, -0.1, 0.1, 1.4, 1.6, -0.1, 0.1, 6);                                // le visage
      boiteVue(g, -0.16, 0.16, 1.57, 1.7, -0.16, 0.16, 2);                           // le casque, plus large que la tête
    }
    if (style === 'fusil' || style === 'silhouette' || style === 'marche') boiteVue(g, 0.26, 0.31, 0.55, 1.95, -0.03, 0.03, 4);   // le fusil, à l'épaule
    if (style === 'silhouette' || style === 'marche') boiteVue(g, -0.19, 0.19, 0.95, 1.38, -0.32, -0.15, 5);                       // le sac, dans le dos
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute(g.k, 1));
    gi.setAttribute('aJambe', new THREE.Float32BufferAttribute(g.j, 1));
    gi.setAttribute('aPos', attrsI[0]); gi.setAttribute('aCamp', attrsI[1]); gi.setAttribute('aVit', attrsI[2]);
    gi.instanceCount = 0;
    return gi;
  }
  const pointMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') } },
    vertexShader: `
      attribute float aCamp; varying float vCamp;
      void main() { vCamp = aCamp; gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 1.2, 0.0), 1.0); gl_PointSize = 2.0; }`,
    fragmentShader: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel; varying float vCamp;
      void main() {
        if (gl_PointCoord.y > 0.5) { gl_FragColor = vec4(uOmbre, 1.0); return; }
        bool sel = vCamp > 1.5;
        float camp = sel ? vCamp - 2.0 : vCamp;
        gl_FragColor = vec4(sel ? uSel : (camp > 0.5 ? uEux : uNous), 1.0);
      }`,
  });
  function preparerSoldats(capacite) {
    if (soldatsInst) {
      scene.remove(soldatsInst, soldatsPoints); soldatsInst.geometry.dispose(); soldatsPoints.geometry.dispose();
      if (soldatsDetail) { scene.remove(soldatsDetail); soldatsDetail.geometry.dispose(); }
    }
    cap = capacite;
    posArr = new Float32Array(cap * 3); campArr = new Float32Array(cap); vitArr = new Float32Array(cap);
    attrsI = [new THREE.InstancedBufferAttribute(posArr, 3), new THREE.InstancedBufferAttribute(campArr, 1), new THREE.InstancedBufferAttribute(vitArr, 1)];
    attrsI.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    soldatsInst = new THREE.Mesh(geometrieSoldat('boite'), soldatMat); soldatsInst.frustumCulled = false; soldatsInst.renderOrder = 2;
    soldatsDetail = styleSoldat === 'boite' ? null : new THREE.Mesh(geometrieSoldat(styleSoldat), soldatMat);
    if (soldatsDetail) { soldatsDetail.frustumCulled = false; soldatsDetail.renderOrder = 2; scene.add(soldatsDetail); }
    const gp = new THREE.BufferGeometry();
    attrsP = [new THREE.BufferAttribute(posArr, 3), new THREE.BufferAttribute(campArr, 1)];
    attrsP.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gp.setAttribute('position', attrsP[0]); gp.setAttribute('aCamp', attrsP[1]);
    gp.setDrawRange(0, 0);
    soldatsPoints = new THREE.Points(gp, pointMat); soldatsPoints.frustumCulled = false; soldatsPoints.renderOrder = 2;
    scene.add(soldatsInst, soldatsPoints);
  }

  // ─── Les tombes (v0.10.0) : là où l'homme est tombé, un tertre de terre fraîche (glaise) et une croix de bois pâle,
  // toutes tournées vers le nord (on enterre en rangs, même au milieu du champ) ; au loin, un pixel. ───
  let capTombes = 0, tbPos = null, tombesInst = null, tombesPoints = null, attrsTI = null, attrsTP = null;
  const tombeMat = new THREE.ShaderMaterial({
    uniforms: { uTertre: { value: col('g') }, uFlanc: { value: col('s') }, uCroix: { value: col('r') } },
    vertexShader: `
      attribute vec3 aPos; attribute float aPart; varying float vPart;
      void main() { vPart = aPart; gl_Position = projectionMatrix * viewMatrix * vec4(position + aPos, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTertre; uniform vec3 uFlanc; uniform vec3 uCroix; varying float vPart;
      void main() { gl_FragColor = vec4(vPart > 1.5 ? uCroix : (vPart > 0.5 ? uFlanc : uTertre), 1.0); }`,
    side: THREE.DoubleSide,
  });
  const tombePointMat = new THREE.ShaderMaterial({
    uniforms: tombeMat.uniforms,
    vertexShader: `void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 0.3, 0.0), 1.0); gl_PointSize = 1.0; }`,
    fragmentShader: `uniform vec3 uTertre; void main() { gl_FragColor = vec4(uTertre, 1.0); }`,
  });
  function preparerTombes(capacite) {
    if (tombesInst) { scene.remove(tombesInst, tombesPoints); tombesInst.geometry.dispose(); tombesPoints.geometry.dispose(); }
    capTombes = capacite;
    tbPos = new Float32Array(capTombes * 3);
    const q = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
    // une boîte : [dessus, flancs]
    const boite = (x0, x1, y0, y1, z0, z1) => [
      q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]),
      [...q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]), ...q([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]),
       ...q([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]), ...q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0])],
    ];
    const pos = [], part = [];
    const mettre = (tris, k) => { pos.push(...tris); part.push(...new Array(tris.length / 3).fill(k)); };
    const [tD, tF] = boite(-0.35, 0.35, 0, 0.22, -0.85, 0.85);              // le tertre
    mettre(tD, 0); mettre(tF, 1);
    for (const b of [boite(-0.08, 0.08, 0, 1.2, -1.05, -0.9), boite(-0.36, 0.36, 0.8, 0.95, -1.05, -0.9)]) { mettre(b[0], 2); mettre(b[1], 2); }   // la croix, à la tête
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
    attrsTI = [new THREE.InstancedBufferAttribute(tbPos, 3)];
    attrsTI[0].setUsage(THREE.DynamicDrawUsage);
    gi.setAttribute('aPos', attrsTI[0]);
    gi.instanceCount = 0;
    tombesInst = new THREE.Mesh(gi, tombeMat); tombesInst.frustumCulled = false; tombesInst.renderOrder = 1;
    const gp = new THREE.BufferGeometry();
    attrsTP = [new THREE.BufferAttribute(tbPos, 3)];
    attrsTP[0].setUsage(THREE.DynamicDrawUsage);
    gp.setAttribute('position', attrsTP[0]);
    gp.setDrawRange(0, 0);
    tombesPoints = new THREE.Points(gp, tombePointMat); tombesPoints.frustumCulled = false; tombesPoints.renderOrder = 1;
    scene.add(tombesInst, tombesPoints);
  }

  // ─── Les corps : un homme couché (1,7 × 0,5 m, 0,3 de haut) ; au loin, un pixel.
  // La couleur de son camp le jour où il tombe, la glaise dès le lendemain. ───
  let capCorps = 0, cPos = null, cInfo = null, corpsInst = null, corpsPoints = null, attrsCI = null, attrsCP = null;
  const corpsMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uVieux: { value: col('g') }, uFlanc: { value: col('s') } },
    vertexShader: `
      attribute vec3 aPos; attribute vec2 aInfo; attribute float aPart;
      varying float vEtat; varying float vPart;
      void main() {
        vEtat = aInfo.x; vPart = aPart;
        float c = cos(aInfo.y), s = sin(aInfo.y);
        vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uVieux; uniform vec3 uFlanc;
      varying float vEtat; varying float vPart;
      void main() {
        vec3 c = vEtat > 1.5 ? uVieux : (vEtat > 0.5 ? uEux : uNous);
        gl_FragColor = vec4(vPart > 0.5 ? uFlanc : c, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const corpsPointMat = new THREE.ShaderMaterial({
    uniforms: corpsMat.uniforms,
    vertexShader: `
      attribute vec2 aInfo; varying float vEtat;
      void main() { vEtat = aInfo.x; gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 0.3, 0.0), 1.0); gl_PointSize = 1.0; }`,
    fragmentShader: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uVieux; varying float vEtat;
      void main() { gl_FragColor = vec4(vEtat > 1.5 ? uVieux : (vEtat > 0.5 ? uEux : uNous), 1.0); }`,
  });
  function preparerCorps(capacite) {
    if (corpsInst) { scene.remove(corpsInst, corpsPoints); corpsInst.geometry.dispose(); corpsPoints.geometry.dispose(); }
    capCorps = capacite;
    cPos = new Float32Array(capCorps * 3); cInfo = new Float32Array(capCorps * 2);
    const q = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
    const l = 0.85, w = 0.25, h = 0.3;
    const dessus = q([-l, h, -w], [-l, h, w], [l, h, w], [l, h, -w]);
    const flancs = [
      ...q([-l, 0, w], [l, 0, w], [l, h, w], [-l, h, w]), ...q([-l, 0, -w], [l, 0, -w], [l, h, -w], [-l, h, -w]),
      ...q([l, 0, -w], [l, 0, w], [l, h, w], [l, h, -w]), ...q([-l, 0, -w], [-l, 0, w], [-l, h, w], [-l, h, -w]),
    ];
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute([...dessus, ...flancs], 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute([...new Array(dessus.length / 3).fill(0), ...new Array(flancs.length / 3).fill(1)], 1));
    attrsCI = [new THREE.InstancedBufferAttribute(cPos, 3), new THREE.InstancedBufferAttribute(cInfo, 2)];
    attrsCI.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gi.setAttribute('aPos', attrsCI[0]); gi.setAttribute('aInfo', attrsCI[1]);
    gi.instanceCount = 0;
    corpsInst = new THREE.Mesh(gi, corpsMat); corpsInst.frustumCulled = false; corpsInst.renderOrder = 1;
    const gp = new THREE.BufferGeometry();
    attrsCP = [new THREE.BufferAttribute(cPos, 3), new THREE.BufferAttribute(cInfo, 2)];
    attrsCP.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gp.setAttribute('position', attrsCP[0]); gp.setAttribute('aInfo', attrsCP[1]);
    gp.setDrawRange(0, 0);
    corpsPoints = new THREE.Points(gp, corpsPointMat); corpsPoints.frustumCulled = false; corpsPoints.renderOrder = 1;
    scene.add(corpsInst, corpsPoints);
  }

  // ─── Les arbres : un tronc, quelques branches nues ; abattus, une souche ───
  const arbresMesh = [];
  function geometrieArbre(v, abattu, loin = false) {
    const parts = [];
    const boite = (w, h, d, x, y, z, rz = 0, rx = 0) => {
      const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
      g.translate(0, h / 2, 0); g.rotateZ(rz); g.rotateX(rx); g.translate(x, y, z);
      parts.push(g);
    };
    if (abattu) { boite(0.6, 1.1, 0.6, 0, 0, 0); boite(0.25, 1.6, 0.25, 0.1, 0.6, 0, 1.1); }
    else {
      const H = 6 + v;
      boite(0.55, H, 0.55, 0, 0, 0);
      // de loin (le sol à plat), le tronc seul : un arbre y fait quelques pixels (tout le champ : ~40 000 triangles de branches)
      for (let k = 0; k < (loin ? 0 : 4); k++) {
        const y = H * (0.45 + k * 0.13), s = k % 2 ? 1 : -1, l = 2.2 - k * 0.35;
        boite(0.22, l, 0.22, 0, y, 0, s * (0.7 + v * 0.1), (k - 1.5) * 0.3);
      }
    }
    const pos = parts.flatMap(g => [...g.attributes.position.array]);
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return out;
  }
  const arbreMat = new THREE.MeshBasicMaterial({ color: col('s'), side: THREE.DoubleSide });
  function preparerArbres() {
    arbresMesh.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    arbresMesh.length = 0;
    for (const loin of [false, true]) for (const abattu of [0, 1]) for (let v = 0; v < 4; v++) {
      const m = new THREE.InstancedMesh(geometrieArbre(v, abattu, loin), arbreMat, Math.max(1, T.arbres.length));
      m.count = 0; m.frustumCulled = false; m.userData = { abattu, v, loin };
      arbresMesh.push(m); scene.add(m);
    }
  }
  // un objet posé en (x, z) tombe-t-il dans l'écran (avec une marge pour sa hauteur) ?
  const dansLaVue = (x, z, e, b) => {
    if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return false;
    const cxp = e[0] * x + e[4] * SOL_Y + e[8] * z + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * z + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * z + e[15];
    return cxp > -1.15 * cw && cxp < 1.15 * cw && cyp > -1.3 * cw && cyp < 1.3 * cw;
  };
  // les arbres et les buissons : seulement ceux qu'on voit (tous, ils coûtaient des dizaines de milliers de triangles)
  function majArbres(e, b) {
    const m4 = new THREE.Matrix4();
    let o = 0;
    // de loin (le sol à plat, ou plus loin de la caméra que le point visé, de 30 %, et 160 m au moins), un arbre n'est qu'un tronc
    const cp = camera.position, lim = Math.max(160, distance(vue.zoom) * 1.3) ** 2;
    const loin = a => plat() || (a.i - cp.x) ** 2 + (SOL_Y - cp.y) ** 2 + (a.j - cp.z) ** 2 > lim;
    for (const m of arbresMesh) {
      let n = 0;
      for (const a of T.arbres) {
        if (a.abattu !== m.userData.abattu || a.v !== m.userData.v || loin(a) !== m.userData.loin || !dansLaVue(a.i + 0.5, a.j + 0.5, e, b)) continue;
        const y = plat() ? SOL_Y : surface(a.i + 0.5, a.j + 0.5);
        m4.makeTranslation(a.i + 0.5, y, a.j + 0.5);
        m.setMatrixAt(n++, m4);
        if (o < ARBRES_OMBRES && !m.userData.loin) { aoPos[o * 4] = a.i + 0.5; aoPos[o * 4 + 1] = y; aoPos[o * 4 + 2] = a.j + 0.5; aoPos[o * 4 + 3] = a.abattu ? 1.2 : 6 + a.v; o++; }
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    }
    const at = aoGeo.attributes.aPos; at.clearUpdateRanges(); at.addUpdateRange(0, o * 4); at.needsUpdate = true;
    aoGeo.instanceCount = soleil.lengthSq() > 0.01 && !plat() ? o : 0;     // (de loin, pas d'ombres d'arbres)
  }

  // ─── Les buissons : deux ou trois boîtes basses ; arrachés, il n'en reste rien ───
  // le dessus du feuillage plus clair (la glaise), les flancs sombres (la boue)
  const buissonsMesh = [];
  const buissonMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  function geometrieBuisson(v) {
    const parts = [];
    const boite = (w, h, d, x, z) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, h / 2, z); parts.push(g); };
    boite(1.3 + v * 0.25, 1 + v * 0.2, 1.1, 0, 0);
    boite(0.9, 0.7, 0.8, 0.9, 0.35 - v * 0.25);
    if (v > 0) boite(0.8, 0.6, 0.7, -0.85, -0.3);
    const pos = parts.flatMap(g => [...g.attributes.position.array]);
    const nor = parts.flatMap(g => [...g.attributes.normal.array]);
    const dessus = col('g'), flanc = col('b'), couleurs = [];
    for (let k = 0; k < nor.length; k += 3) { const c = nor[k + 1] > 0.5 ? dessus : flanc; couleurs.push(c.r, c.g, c.b); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 3));
    return out;
  }
  function preparerBuissons() {
    buissonsMesh.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    buissonsMesh.length = 0;
    for (let v = 0; v < 3; v++) {
      const m = new THREE.InstancedMesh(geometrieBuisson(v), buissonMat, Math.max(1, T.buissons.length));
      m.count = 0; m.frustumCulled = false; m.userData = { v };
      buissonsMesh.push(m); scene.add(m);
    }
  }
  function majBuissons(e, bornes) {
    // de loin (le sol à plat), un buisson ne fait que deux pixels : on ne les dessine pas (tout le champ : ~25 000 triangles)
    if (plat()) { for (const m of buissonsMesh) m.count = 0; return; }
    const m4 = new THREE.Matrix4();
    for (const m of buissonsMesh) {
      let n = 0;
      for (const b of T.buissons) {
        if (b.detruit || b.v !== m.userData.v || !dansLaVue(b.i + 0.5, b.j + 0.5, e, bornes)) continue;
        m4.makeTranslation(b.i + 0.5, plat() ? SOL_Y : surface(b.i + 0.5, b.j + 0.5), b.j + 0.5);
        m.setMatrixAt(n++, m4);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    }
  }

  // ─── L'herbe : des touffes de cinq brins (seulement de près), qui ondulent au vent ;
  // une touffe disparaît quand l'herbe de sa case meurt (obus, boue) ───
  let touffes = null;                 // { x, z, c } : les touffes possibles (tirées une fois, l'aspect seulement)
  const TOUFFES_MAX = 6000;
  const tPos = new Float32Array(TOUFFES_MAX * 3);
  const herbeGeo = new THREE.InstancedBufferGeometry();
  {
    const p = [], h = [];
    for (const [x, l, ht] of [[-0.34, -0.2, 0.5], [-0.15, -0.06, 0.75], [0.02, 0.04, 0.9], [0.2, 0.12, 0.7], [0.36, 0.22, 0.45]]) {
      p.push(x - 0.07, 0, 0, x + 0.07, 0, 0, x + l, ht, 0); h.push(0, 0, 1);
    }
    herbeGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    herbeGeo.setAttribute('aHaut', new THREE.Float32BufferAttribute(h, 1));
    herbeGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
    herbeGeo.instanceCount = 0;
  }
  const herbeMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uBas: { value: col('g') }, uHaut: { value: col('h') } },
    vertexShader: `
      attribute vec3 aPos; attribute float aHaut; uniform float uT; varying float vHaut;
      void main() {
        vHaut = aHaut;
        vec3 p = position;
        p.x += sin(uT * 1.6 + aPos.x * 0.37 + aPos.z * 0.21) * 0.07 * aHaut;        // le vent
        gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
      }`,
    fragmentShader: `uniform vec3 uBas; uniform vec3 uHaut; varying float vHaut;
      void main() { gl_FragColor = vec4(vHaut > 0.6 ? uHaut : uBas, 1.0); }`,
    side: THREE.DoubleSide,
  });
  const herbeMesh = new THREE.Mesh(herbeGeo, herbeMat); herbeMesh.frustumCulled = false; herbeMesh.renderOrder = 1;
  scene.add(herbeMesh);
  function preparerHerbe() {
    // une touffe pour ~10 m² d'herbe drue (moins pour l'herbe rare), placée par un hachage de la case
    const xs = [], zs = [], cs = [];
    for (let j = 0; j < T.H; j++) for (let i = 0; i < T.W; i++) {
      const c = j * T.W + i, d = T.herbe[c];
      if (!d) continue;
      const hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0;
      if ((hsh % 1000) / 1000 >= d * 0.035) continue;
      xs.push(i + ((hsh >>> 10) % 100) / 100); zs.push(j + ((hsh >>> 17) % 100) / 100); cs.push(c);
    }
    touffes = { x: Float32Array.from(xs), z: Float32Array.from(zs), c: Int32Array.from(cs) };
  }
  function majHerbe(x0, x1, z0, z1, e, aPlat) {
    if (aPlat || !touffes) { herbeMesh.visible = false; vuesHerbe = 0; return; }
    if (!vide) herbeMesh.visible = true;
    let k = 0;
    const { x: X, z: Z, c: Cc } = touffes;
    // (pas plus loin de la caméra que le point visé, de 25 % : au-delà, une touffe ne fait qu'un pixel ; au ras du sol,
    // sans cette limite, il y en avait 3 000 jusqu'à l'horizon)
    const cp = camera.position, lim = (distance(vue.zoom) * 1.25) ** 2;
    for (let n = 0; n < X.length && k < TOUFFES_MAX; n++) {
      const x = X[n], y = Z[n];
      if (x < x0 || x > x1 || y < z0 || y > z1 || !T.herbe[Cc[n]] || (x - cp.x) ** 2 + (SOL_Y - cp.y) ** 2 + (y - cp.z) ** 2 > lim) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.05 * cw || cxp > 1.05 * cw || cyp < -1.1 * cw || cyp > 1.1 * cw) continue;
      tPos[k * 3] = x; tPos[k * 3 + 1] = surface(x, y); tPos[k * 3 + 2] = y;
      k++;
    }
    const a = herbeGeo.attributes.aPos; a.clearUpdateRanges(); a.addUpdateRange(0, k * 3); a.needsUpdate = true;
    herbeGeo.instanceCount = k;
    vuesHerbe = k;
  }
  let vuesHerbe = 0;

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
    vertexShader: `attribute float aTon; attribute float aTaille; varying float vTon; uniform float uTaille;
      void main() { vTon = aTon; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = aTon < 0.0 ? 0.0 : max(1.0, floor(uTaille * aTaille + 0.5)); if (aTon < 0.0) gl_Position = vec4(2.0); }`,
    fragmentShader: `uniform sampler2D uPal; uniform float uNP; varying float vTon;
      void main() {
        float t = floor(vTon + 0.5);
        if (t > 50.0) { if (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) > 0.5) discard; t -= 100.0; }   // la fumée, tramée
        gl_FragColor = vec4(texture2D(uPal, vec2((t + 0.5) / uNP, 0.25)).rgb, 1.0);
      }`,
    depthTest: true, depthWrite: false,
  });
  const eclats = new THREE.Points(eclGeo, eclMat); eclats.frustumCulled = false; eclats.renderOrder = 3;
  scene.add(eclats);
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
    if (!effets.chute) return eclater(x, y, cal);
    // l'obus qui tombe : une traînée claire, du ciel au point de chute, puis l'explosion
    const h = T ? surface(x, y) : 0, chute = 0.25, v = 160;
    for (let k = 0; k < 7; k++) particule(3, x - 4 + k * 0.3, h + v * chute + k * 1.6, y, 16, -v, 0, chute, k ? 1 : 1.5);
    attente.push({ x, y, cal, t: chute });
  }
  function eclater(x, y, cal) {
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
    if (!effets.feu || !T) return;
    if (!arbresEtat || arbresEtat.length !== T.arbres.length) { arbresEtat = T.arbres.map(a => a.abattu); buissonsEtat = T.buissons.map(b => b.detruit); return; }
    T.arbres.forEach((a, k) => { if (a.abattu && !arbresEtat[k]) allumer(k, 1.2); arbresEtat[k] = a.abattu; });
    T.buissons.forEach((b, k) => { if (b.detruit && !buissonsEtat[k]) feux.push({ x: b.i + 0.5, z: b.j + 0.5, h: 0.5, fin: 10 + alea() * 15, t: 0, f: 0 }); buissonsEtat[k] = b.detruit; });
    while (feux.length > 60) feux.shift();
  }
  // un arbre prend feu (une fois) ; debout, il brûle par la couronne, plus longtemps
  const brules = new Set();
  function allumer(k, h) {
    if (brules.has(k)) return;
    brules.add(k);
    const a = T.arbres[k];
    feux.push({ x: a.i + 0.5, z: a.j + 0.5, h, fin: (h > 2 ? 35 : 25) + alea() * 25, t: 0, f: 0, arbre: k, prop: 1 + alea() });
  }
  function majFeux(dt) {
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
    vertexShader: `uniform float uT; void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = mod(floor(uT * 6.0 + position.x), 2.0) > 0.5 ? 3.0 : 2.0; }`,
    fragmentShader: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }`,
  });
  const corbeaux = new THREE.Points(crGeo, crMat); corbeaux.frustumCulled = false; corbeaux.renderOrder = 4; corbeaux.visible = false;
  scene.add(corbeaux);
  let nid = null, nidT = 0;
  function majCorbeaux(dt, t) {
    if (!effets.corbeaux || !B) { corbeaux.visible = false; return; }
    if ((nidT -= dt) <= 0) {
      nidT = 10;
      // au-dessus du corps le plus proche du centre de la vue (s'il y a des morts), sinon du centre
      let best = null, bd = 150 * 150;
      for (const c of B.etat.corps) { const d = (c[0] / 10 - vue.cx) ** 2 + (c[1] / 10 - vue.cz) ** 2; if (d < bd) { bd = d; best = c; } }
      nid = best ? { x: best[0] / 10, z: best[1] / 10 } : (effets.corbeaux === 'toujours' ? { x: vue.cx, z: vue.cz } : null);
    }
    if (!nid) { corbeaux.visible = false; return; }
    if (!vide) corbeaux.visible = true;
    const h0 = surface(nid.x, nid.z);
    for (let k = 0; k < CORBEAUX; k++) {
      const r = 8 + (k * 37 % 11), w = 0.35 + (k % 3) * 0.08, a = t * w * (k % 2 ? 1 : -1) + k * 2.1;
      crPos[k * 3] = nid.x + Math.cos(a) * r; crPos[k * 3 + 1] = h0 + 12 + (k % 4) * 2 + Math.sin(t * 1.3 + k) * 0.8; crPos[k * 3 + 2] = nid.z + Math.sin(a) * r * 0.8;
    }
    crGeo.attributes.position.needsUpdate = true;
    crMat.uniforms.uT.value = t;
  }

  function majEclats(dt) {
    for (let k = attente.length - 1; k >= 0; k--) if ((attente[k].t -= dt) <= 0) { const a = attente.splice(k, 1)[0]; eclater(a.x, a.y, a.cal); }
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
      eclTon[s] = so === 0 || so === 6 ? INDICE.o
        : so === 1 ? INDICE.b : so === 8 ? INDICE.s
        : so === 3 || so === 4 ? INDICE.r
        : so === 5 ? (alea() < 0.5 ? INDICE.o : INDICE.h)
        : 100 + (f < 0.3 ? INDICE.r : INDICE.g);
    }
    eclGeo.attributes.position.needsUpdate = true; eclGeo.attributes.aTon.needsUpdate = true; eclGeo.attributes.aTaille.needsUpdate = true;
  }

  // ─── La pluie : des traits qui tombent, autour du centre de la vue ───
  const plPos = new Float32Array(PLUIE * 3), plVit = new Float32Array(PLUIE);
  for (let k = 0; k < PLUIE; k++) { plPos[k * 3] = Math.random() * 400; plPos[k * 3 + 1] = Math.random() * 40; plPos[k * 3 + 2] = Math.random() * 300; plVit[k] = 18 + Math.random() * 10; }
  const plGeo = new THREE.BufferGeometry();
  plGeo.setAttribute('position', new THREE.BufferAttribute(plPos, 3));
  plGeo.setAttribute('aVit', new THREE.BufferAttribute(plVit, 1));
  const plMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector2() }, uE: { value: new THREE.Vector2(400, 300) }, uCol: { value: col('r') }, uTaille: { value: 1 } },
    vertexShader: `attribute float aVit; uniform float uT; uniform vec2 uC; uniform vec2 uE; uniform float uTaille;
      void main() {
        vec3 p = position;
        p.y = 30.0 - mod(uT * aVit + position.y, 40.0);
        p.x = uC.x - uE.x * 0.5 + mod(p.x - uC.x + uE.x * 0.5 - uT * 2.0, uE.x);
        p.z = uC.y - uE.y * 0.5 + mod(p.z - uC.y + uE.y * 0.5, uE.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        gl_PointSize = uTaille;
      }`,
    fragmentShader: `uniform vec3 uCol; void main() { if (gl_PointCoord.x > 0.5) discard; gl_FragColor = vec4(uCol, 1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const pluie = new THREE.Points(plGeo, plMat); pluie.frustumCulled = false; pluie.renderOrder = 4;
  scene.add(pluie);
  // le brouillard : une trame de brume (Bayer 4 × 4) qui s'épaissit vers le haut de l'écran (le lointain)
  const brumeMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col('r') }, uH: { value: 400 } },
    vertexShader: `void main() { gl_Position = vec4(position.xy, -1.0, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uH;
      float bayer(vec2 p) {
        vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0);
        float m = a.x * 2.0 + a.y * 3.0 - a.x * a.y * 4.0;      // 0 2 3 1
        float n = b.x * 2.0 + b.y * 3.0 - b.x * b.y * 4.0;
        return (m * 4.0 + n + 0.5) / 16.0;
      }
      void main() {
        float loin = gl_FragCoord.y / uH;                          // 0 en bas, 1 en haut
        if (bayer(floor(gl_FragCoord.xy)) > 0.2 * max(0.0, loin - 0.45) / 0.55) discard;
        gl_FragColor = vec4(uCol, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const brume = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), brumeMat); brume.frustumCulled = false; brume.renderOrder = 5;
  scene.add(brume);

  // ─── Le temps qui passe (Jérôme, v0.8.0) : le soleil (les ombres tournent et s'allongent), le soir et la nuit
  // (une trame de terre qui monte), les lumières (lanternes des tranchées, incendies, fusées) qui la trouent.
  // Rien hors de la palette : la nuit est une trame de la couleur la plus sombre. ───
  const soleil = soldatMat.uniforms.uSoleil.value;      // (partagé avec les ombres des arbres)
  // le bout de l'ombre d'un mètre de hauteur, selon l'heure (0 la nuit)
  function majSoleil(h) {
    if (h.phase !== 'jour') { soleil.set(0, 0); return; }
    const t = Math.max(0, Math.min(1, (h.heure + h.minute / 60 - 6) / 12));
    const elev = Math.max(0.1, 0.95 * Math.sin(Math.PI * t));               // rad : bas le matin et le soir
    const L = Math.min(3.5, 1 / Math.tan(elev));                            // (à 5, l'ombre d'un arbre traversait 45 m de champ)
    soleil.set(-Math.cos(Math.PI * t) * L, -Math.sin(Math.PI * t) * L);       // le soleil à l'est, au sud, à l'ouest : l'ombre à l'opposé
  }
  // l'obscurité : 0 le jour, la trame monte de 16 h à 18 h, épaisse la nuit, et se lève à l'aube
  function obscurite(h) {
    if (h.phase === 'nuit') return 0.74;
    const hf = h.heure + h.minute / 60;
    if (hf < 7) return 0.4 * (7 - hf);
    if (hf > 16) return Math.min(0.45, 0.45 * (hf - 16) / 2);
    return 0;
  }

  // les ombres des arbres : une bande tramée, du pied vers l'opposé du soleil, aussi longue que l'arbre est haut
  const ARBRES_OMBRES = 2000;
  const aoPos = new Float32Array(ARBRES_OMBRES * 4);
  const aoGeo = new THREE.InstancedBufferGeometry();
  aoGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.4, 0, 0, 0.4, 0, 0, 0.15, 1, 0, -0.4, 0, 0, 0.15, 1, 0, -0.15, 1, 0], 3));
  aoGeo.setAttribute('aPos', new THREE.InstancedBufferAttribute(aoPos, 4).setUsage(THREE.DynamicDrawUsage));
  aoGeo.instanceCount = 0;
  const aoMat = new THREE.ShaderMaterial({
    uniforms: { uSoleil: soldatMat.uniforms.uSoleil, uSol: solMat.uniforms.uSol, uTaille: solMat.uniforms.uTaille },
    vertexShader: `attribute vec4 aPos; uniform vec2 uSoleil; varying vec2 vXZ; varying float vLong;
      void main() {
        vec2 d = length(uSoleil) > 0.05 ? normalize(uSoleil) : vec2(0.6, 0.8);
        vec2 xz = vec2(-d.y, d.x) * position.x + (position.y > 0.5 ? uSoleil * aPos.w : vec2(0.0));
        vXZ = vec2(aPos.x + xz.x, aPos.z + xz.y); vLong = position.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(aPos.x + xz.x, aPos.y + 0.04, aPos.z + xz.y, 1.0);
      }`,
    // le sol un ton plus sombre, tramé : dense au pied, presque rien au bout (les branches nues laissent passer le jour)
    fragmentShader: `uniform sampler2D uSol; uniform vec2 uTaille; varying vec2 vXZ; varying float vLong;
      float bayer4(vec2 p) {
        vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0);
        float m = a.x * 2.0 + a.y * 3.0 - a.x * a.y * 4.0;
        float n = b.x * 2.0 + b.y * 3.0 - b.x * b.y * 4.0;
        return (m * 4.0 + n + 0.5) / 16.0;
      }
      void main() {
        if (bayer4(floor(gl_FragCoord.xy)) > 0.7 - 0.55 * vLong) discard;
        gl_FragColor = vec4(texture2D(uSol, vec2(vXZ.x / uTaille.x, (vXZ.y / uTaille.y + 1.0) * 0.5)).rgb, 1.0);
      }`,
    side: THREE.DoubleSide, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const arbresOmbres = new THREE.Mesh(aoGeo, aoMat); arbresOmbres.frustumCulled = false; arbresOmbres.renderOrder = 1;
  scene.add(arbresOmbres);

  // les lanternes : de petites lumières le long des tranchées tenues, le soir et la nuit
  const LANTERNES = 120;
  const lnPos = new Float32Array(LANTERNES * 3), lnGeo = new THREE.BufferGeometry();
  lnGeo.setAttribute('position', new THREE.BufferAttribute(lnPos, 3).setUsage(THREE.DynamicDrawUsage));
  lnGeo.setDrawRange(0, 0);
  const lnMat = new THREE.ShaderMaterial({
    uniforms: { uO: { value: col('o') }, uH: { value: col('h') }, uT: { value: 0 } },
    vertexShader: `uniform float uT; varying float vF; void main() { vF = sin(uT * 9.0 + position.x * 3.1 + position.z); gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = 2.0; }`,
    fragmentShader: `uniform vec3 uO; uniform vec3 uH; varying float vF; void main() { gl_FragColor = vec4(vF > -0.3 ? uO : uH, 1.0); }`,
    depthWrite: false,
  });
  const lanternes = new THREE.Points(lnGeo, lnMat); lanternes.frustumCulled = false; lanternes.renderOrder = 6;
  scene.add(lanternes);
  const lanternesVues = [];
  function majLanternes(nuit) {
    lanternesVues.length = 0;
    if (nuit < 0.12 || !B) { lnGeo.setDrawRange(0, 0); return; }
    for (const reg of B.etat.regiments) {
      const t = reg.ordre.trace;
      if (!t || !reg.effectif) continue;
      for (let x = t.x0 + 9; x < t.x1 && lanternesVues.length < LANTERNES; x += 26) {
        const z = ligneY(t, x) + 0.4 * t.face;
        lanternesVues.push([x, surface(x, z) + 0.9, z]);
      }
    }
    lanternesVues.forEach(([x, y, z], k) => { lnPos[k * 3] = x; lnPos[k * 3 + 1] = y; lnPos[k * 3 + 2] = z; });
    lnGeo.attributes.position.needsUpdate = true;
    lnGeo.setDrawRange(0, lanternesVues.length);
  }

  // la nuit : une trame de terre, trouée autour des lumières. Les lumières sont peintes une fois par image dans une
  // petite carte (un quart de la résolution, sur le processeur) : la trame n'y lit qu'une valeur par pixel. (Chercher
  // 32 lumières pour chaque pixel coûtait plus que tout le reste du dessin, en rendu logiciel.)
  const LUMIERES = 64, QUART = 4;
  let lumW = 1, lumH = 1, lumData = new Uint8Array(1), lumTex = null;
  function preparerLumieres() {
    const w = Math.max(1, Math.ceil(vue.vw / QUART)), h = Math.max(1, Math.ceil(vue.vh / QUART));
    if (lumTex && w === lumW && h === lumH) return;
    lumW = w; lumH = h; lumData = new Uint8Array(w * h);
    lumTex?.dispose();
    lumTex = new THREE.DataTexture(lumData, w, h, THREE.RedFormat, THREE.UnsignedByteType);
    lumTex.magFilter = lumTex.minFilter = THREE.LinearFilter; lumTex.generateMipmaps = false;
    nuitMat.uniforms.uLum.value = lumTex;
  }
  const nuitMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col('t') }, uD: { value: 0 }, uLum: { value: null }, uTaille: { value: new THREE.Vector2(640, 400) } },
    vertexShader: `void main() { gl_Position = vec4(position.xy, -1.0, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uD; uniform sampler2D uLum; uniform vec2 uTaille;
      float bayer(vec2 p) {
        vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0);
        float m = a.x * 2.0 + a.y * 3.0 - a.x * a.y * 4.0;
        float n = b.x * 2.0 + b.y * 3.0 - b.x * b.y * 4.0;
        return (m * 4.0 + n + 0.5) / 16.0;
      }
      void main() {
        float clair = texture2D(uLum, gl_FragCoord.xy / uTaille).r;
        if (bayer(floor(gl_FragCoord.xy)) > uD * (1.0 - clair)) discard;
        gl_FragColor = vec4(uCol, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const nuitPlan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nuitMat); nuitPlan.frustumCulled = false; nuitPlan.renderOrder = 5.5;
  scene.add(nuitPlan);
  const vEcran = new THREE.Vector3(), vBord = new THREE.Vector3();
  // une lumière (r mètres autour de x, y, z) peinte dans la carte des lumières
  function lumiere(x, y, z, r) {
    vEcran.set(x, y, z).project(camera); vBord.set(x + r, y, z).project(camera);
    if (vEcran.z > 1) return false;
    const px = (vEcran.x + 1) / 2 * lumW, py = (vEcran.y + 1) / 2 * lumH;
    const rp = Math.max(1, Math.hypot((vBord.x - vEcran.x) / 2 * lumW, (vBord.y - vEcran.y) / 2 * lumH));
    if (px < -rp || py < -rp || px > lumW + rp || py > lumH + rp) return false;
    const i0 = Math.max(0, Math.floor(px - rp)), i1 = Math.min(lumW - 1, Math.ceil(px + rp));
    const j0 = Math.max(0, Math.floor(py - rp)), j1 = Math.min(lumH - 1, Math.ceil(py + rp));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i + 0.5 - px, j + 0.5 - py) / rp;
      if (d >= 1) continue;
      const v = d < 0.35 ? 255 : Math.round(255 * (1 - (d - 0.35) / 0.65));
      if (v > lumData[j * lumW + i]) lumData[j * lumW + i] = v;
    }
    return true;
  }
  function majNuit(h) {
    const d = obscurite(h);
    nuitMat.uniforms.uD.value = d;
    if (!vide) nuitPlan.visible = d > 0;
    majLanternes(d);
    if (!d) return;
    preparerLumieres();
    nuitMat.uniforms.uTaille.value.set(vue.vw, vue.vh);
    lumData.fill(0);
    let n = 0;
    // les fusées (elles éclairent large), les incendies, les lanternes
    for (let s = 0; s < ECLATS && n < LUMIERES; s++) if (ecl.sorte[s] === 6 && ecl.age[s] < ecl.vie[s] && lumiere(ecl.x[s], ecl.y[s], ecl.z[s], 45)) n++;
    for (const f of feux) if (n < LUMIERES && lumiere(f.x, surface(f.x, f.z) + f.h, f.z, f.h > 2 ? 16 : 10)) n++;
    for (const [x, y, z] of lanternesVues) if (n < LUMIERES && lumiere(x, y, z, 7)) n++;
    lumTex.needsUpdate = true;
  }

  // ─── Brancher une bataille ───
  function attacher(bataille) {
    B = bataille; T = B.terrain;
    if (sol) { scene.remove(sol); sol.children.forEach(m => { m.userData.fin?.dispose(); m.userData.gros?.dispose(); }); solTex.dispose(); }
    solIdx = new Uint8Array(T.W * T.H);
    solData = new Uint8Array(T.W * T.H * 2 * 4);
    solTex = new THREE.DataTexture(solData, T.W, T.H * 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    solTex.magFilter = solTex.minFilter = THREE.NearestFilter; solTex.generateMipmaps = false;
    solMat.uniforms.uSol.value = solTex; solMat.uniforms.uTaille.value.set(T.W, T.H);
    vuLigne = new Uint32Array(T.H).fill(0xffffffff); gelVu = null;
    sol = new THREE.Group(); scene.add(sol);
    // le niveau de détail lointain : tout le champ en deux triangles, à plat
    if (solPlat) { scene.remove(solPlat); solPlat.geometry.dispose(); }
    const gp = new THREE.PlaneGeometry(T.W, T.H); gp.rotateX(-Math.PI / 2); gp.translate(T.W / 2, SOL_Y, T.H / 2);
    gp.setAttribute('aParoi', new THREE.Float32BufferAttribute(new Float32Array(gp.attributes.position.count), 1));
    gp.setAttribute('aDecal', new THREE.Float32BufferAttribute(new Float32Array(gp.attributes.position.count * 2), 2));
    solPlat = new THREE.Mesh(gp, solMat); solPlat.frustumCulled = false;
    scene.add(solPlat);
    morceaux = [];
    for (let my = 0; my < T.mh; my++) for (let mx = 0; mx < T.mw; mx++) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), solMat);
      m.userData = { mx, my, version: -1 };
      morceaux.push(m); sol.add(m);
    }
    // tout construire tout de suite (le premier écran doit être juste)
    for (const m of morceaux) refaire(m);
    majSol(true);
    preparerSoldats(B.armee.capacite);
    preparerCorps(Math.max(1024, B.etat.corps.length * 2));
    preparerTombes(Math.max(256, (B.etat.tombes?.length || 0) * 2));
    preparerArbres();
    preparerBuissons();
    preparerHerbe();
    feux.length = 0; brules.clear(); arbresEtat = null;   // (une autre bataille : ses arbres ne brûlent pas encore)
    vue.cx = T.W / 2; vue.cz = T.H * 0.62;
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
    m.userData.fin?.dispose(); m.userData.gros?.dispose();
    m.userData.fin = construireMorceau(mx, my);
    m.userData.gros = construireGros(mx, my);
    m.geometry = m.userData.fin;
    m.userData.version = versionAutour(mx, my);
  }
  /* Le niveau de détail lointain (la perspective montre beaucoup de sol au loin :
     après trois jours d'obus, 54 000 triangles au zoom 4) : un morceau loin de la
     caméra n'est plus que des facettes de LOIN m, sans parois ; les cubes restent
     de près. La couleur reste celle de chaque case (la texture). */
  const LOIN = 5;
  function construireGros(mx, my) {
    const i0 = mx * MORCEAU, j0 = my * MORCEAU, i1 = Math.min(T.W, i0 + MORCEAU), j1 = Math.min(T.H, j0 + MORCEAU);
    const coin = (ci, cj) => {
      let s2 = 0, n = 0;
      for (let dj = -1; dj <= 0; dj++) for (let di = -1; di <= 0; di++) {
        const i = Math.min(T.W - 1, Math.max(0, ci + di)), j = Math.min(T.H - 1, Math.max(0, cj + dj));
        s2 += hauteurQ(T, j * T.W + i); n++;
      }
      return s2 / n * 0.25;
    };
    const pos = [];
    for (let z = j0; z < j1; z += LOIN) for (let x = i0; x < i1; x += LOIN) {
      const x1 = Math.min(i1, x + LOIN), z1 = Math.min(j1, z + LOIN);
      const a = coin(x, z), b = coin(x1, z), c = coin(x1, z1), d = coin(x, z1);
      pos.push(x, a, z, x, d, z1, x1, c, z1, x, a, z, x1, c, z1, x1, b, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aParoi', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
    g.setAttribute('aDecal', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3((i0 + i1) / 2, 3, (j0 + j1) / 2), Math.hypot(i1 - i0, j1 - j0, 20) / 2);
    return g;
  }
  // chaque morceau : les cubes de près, les facettes au loin
  function choisirDetail() {
    const seuil = distance(vue.zoom) * 1.05, c = camera.position;      // (au-delà du point visé)
    for (const m of morceaux) {
      const { mx, my, fin, gros } = m.userData;
      if (!fin) continue;
      const d = Math.hypot((mx + 0.5) * MORCEAU - c.x, SOL_Y - c.y, (my + 0.5) * MORCEAU - c.z);
      const g = d > seuil ? gros : fin;
      if (m.geometry !== g) m.geometry = g;
    }
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
        const a = PAL_RGB[solIdx[c]], b = PAROI_RGB[solIdx[c]], o = c * 4;
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

  // ─── Le choix (les régiments choisis) ───
  let choisis = new Set();

  // ─── Les soldats : leurs positions dans les tampons ───
  function majSoldats() {
    const A = B.armee, n = A.n, p = ZOOMS[vue.zoom], aPlat = plat();
    // seulement ceux qu'on voit : le sol vu est un trapèze ; on garde ceux de son rectangle englobant
    const cs = coinsSol(vue.zoom, yawVu(), tangageVu());
    // (un coin de l'écran regarde le ciel : tout le terrain peut être vu, le vrai tri se fait à l'écran)
    const x0 = cs.ok ? vue.cx + cs.x0 - 6 : 0, x1 = cs.ok ? vue.cx + cs.x1 + 6 : T.W, z0 = cs.ok ? vue.cz + cs.z0 - 6 : 0, z1 = cs.ok ? vue.cz + cs.z1 + 12 : T.H;
    // puis le vrai test : projeté, il tombe dans l'écran (le trapèze n'est pas son rectangle)
    projeter();
    mVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = mVP.elements;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const x = A.x[i], y = A.y[i];
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.08 * cw || cxp > 1.08 * cw || cyp < -1.15 * cw || cyp > 1.15 * cw) continue;
      posArr[k * 3] = x; posArr[k * 3 + 1] = aPlat ? SOL_Y : surface(x, y); posArr[k * 3 + 2] = y;
      campArr[k] = A.camp[i] + (choisis.has(A.reg[i]) ? 2 : 0);
      vitArr[k] = Math.hypot(A.vx[i], A.vy[i]);
      k++;
    }
    const points = p <= POINTS_JUSQUA, detail = !points && soldatsDetail && p >= DETAIL_DES;
    if (!vide) { soldatsPoints.visible = points; soldatsInst.visible = !points && !detail; if (soldatsDetail) soldatsDetail.visible = !!detail; }
    if (soldatsDetail) soldatsDetail.geometry.instanceCount = k;
    for (const a of points ? attrsP : attrsI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    soldatsPoints.geometry.setDrawRange(0, k);
    soldatsInst.geometry.instanceCount = k;
    vus = k;
    majCorps(x0, x1, z0, z1, e, aPlat, points);
    majTombes(x0, x1, z0, z1, e, aPlat, points);
    majHerbe(x0, x1, z0, z1, e, aPlat);
    const bornes = [x0 - 6, x1 + 6, z0 - 6, z1 + 10];
    majArbres(e, bornes); majBuissons(e, bornes);
  }
  // les corps : ceux qu'on voit, comme les soldats (la liste ne fait que grandir)
  function majCorps(x0, x1, z0, z1, e, aPlat, points) {
    const C = B.etat.corps, jour = B.etat.jour;
    if (C.length > capCorps) preparerCorps(C.length * 2);
    let k = 0;
    for (const c of C) {
      const x = c[0] / 10, y = c[1] / 10;
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.08 * cw || cxp > 1.08 * cw || cyp < -1.15 * cw || cyp > 1.15 * cw) continue;
      cPos[k * 3] = x; cPos[k * 3 + 1] = aPlat ? SOL_Y : surface(x, y); cPos[k * 3 + 2] = y;
      cInfo[k * 2] = c[3] < jour ? 2 : c[2];
      cInfo[k * 2 + 1] = ((c[4] * 2654435761) >>> 0) % 628 / 100;     // couché dans un sens qui ne change pas
      k++;
    }
    if (!vide) { corpsPoints.visible = points; corpsInst.visible = !points; }
    for (const a of points ? attrsCP : attrsCI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    corpsPoints.geometry.setDrawRange(0, k);
    corpsInst.geometry.instanceCount = k;
  }
  function majTombes(x0, x1, z0, z1, e, aPlat, points) {
    const C = B.etat.tombes || [];
    if (C.length > capTombes) preparerTombes(C.length * 2);
    let k = 0;
    for (const c of C) {
      const x = c[0] / 10, y = c[1] / 10;
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      const cxp = e[0] * x + e[4] * SOL_Y + e[8] * y + e[12], cyp = e[1] * x + e[5] * SOL_Y + e[9] * y + e[13], cw = e[3] * x + e[7] * SOL_Y + e[11] * y + e[15];
      if (cxp < -1.08 * cw || cxp > 1.08 * cw || cyp < -1.15 * cw || cyp > 1.15 * cw) continue;
      tbPos[k * 3] = x; tbPos[k * 3 + 1] = aPlat ? SOL_Y : surface(x, y); tbPos[k * 3 + 2] = y;
      k++;
    }
    if (!vide) { tombesPoints.visible = points; tombesInst.visible = !points; }
    for (const a of points ? attrsTP : attrsTI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    tombesPoints.geometry.setDrawRange(0, k);
    tombesInst.geometry.instanceCount = k;
  }
  let vus = 0;

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
    for (let k = 0; k < 6; k++) {
      if (d.y > -1e-4) break;
      const t = (hy - o.y) / d.y;
      x = o.x + d.x * t; z = o.z + d.z * t;
      if (!T || plat()) break;
      hy = surface(x, z);
    }
    return [x, z];
  }
  // [x, y] du terrain (et une hauteur) → pixels CSS
  function versEcran(x, y, h = null) {
    if (h === null && T && plat()) h = SOL_Y;
    if (h === null && T) h = surface(x, y);
    v3.set(x, h ?? SOL_Y, y).project(camera);
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
    for (const e of evenements) if (e.type === 'impact') impactVu(e.x, e.y, e.cal);
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
    if (!vide) { sol.visible = !plat(); solPlat.visible = plat(); }
    solMat.uniforms.uPlat.value = plat() ? 1 : 0;
    if (!plat()) { majMorceaux(); projeter(); choisirDetail(); }
    herbeMat.uniforms.uT.value = tAnim; soldatMat.uniforms.uT.value = tAnim;
    const t1 = performance.now();
    majSoleil(horloge(B));
    majSoldats();
    tAnim += dt;
    majEclats(dt); majCorbeaux(dt, tAnim);
    const h = horloge(B);
    majNuit(h); lnMat.uniforms.uT.value = tAnim;
    if (!vide) { pluie.visible = h.meteo === 'pluie' && h.phase === 'jour'; brume.visible = h.meteo === 'brouillard'; }
    const { cx, cz, p } = projeter();
    plMat.uniforms.uT.value = tAnim; plMat.uniforms.uC.value.set(cx, cz);
    { const e = Math.hypot(vue.vw, vue.vh) / p + 40; plMat.uniforms.uE.value.set(e, e); }
    plMat.uniforms.uTaille.value = p >= 4 ? 2 : 1;
    brumeMat.uniforms.uH.value = vue.vh;
    eclMat.uniforms.uTaille.value = Math.max(1, Math.round(p / 2));
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
    set choisis(s) { choisis = s; },
    set vide(v) { vide = v; scene.children.forEach(o => { o.visible = !v; }); },
    zoomer(d, ancre = null) {
      const avant = ancre ? versTerrain(...ancre) : null;
      const z = Math.max(0, Math.min(ZOOMS.length - 1, vue.zoom + d));
      if (T && !tient(z, 0)) return;                 // plus loin, la vue sortirait du terrain
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
      vue.cible.yaw = Math.max(-YAW_MAX, Math.min(YAW_MAX, vue.cible.yaw + dYaw));
      vue.cible.tangage = Math.max(TANGAGE_MIN, Math.min(TANGAGE_MAX, vue.cible.tangage + dTangage));
    },
    // la caméra libre (l'écran titre, Jérôme v0.8.2) : n'importe quelle direction, jusqu'au ras du sol, sans bornes ;
    // le ciel prend la couleur de la brume (le ciel bas)
    cameraLibre(yaw, tangage) {
      vue.libre = true;
      vue.cible.yaw = vue.yaw = yaw; vue.cible.tangage = vue.tangage = tangage;
      renderer.setClearColor(new THREE.Color(PALETTE.r), 1);
    },
    placerCamera(yaw, tangage) {
      if (vue.libre) { vue.libre = false; renderer.setClearColor(new THREE.Color(PALETTE.t), 1); }
      vue.cible.yaw = vue.yaw = Math.max(-YAW_MAX, Math.min(YAW_MAX, yaw));
      vue.cible.tangage = vue.tangage = Math.max(TANGAGE_MIN, Math.min(TANGAGE_MAX, tangage));
    },
    get ppm() { return ZOOMS[vue.zoom]; },
    // une fumée qui dérive, posée en (x, z) (l'écran titre en épaissit le champ)
    fumer(x, z) { if (T) fumee(x + (alea() - 0.5) * 3, surface(x, z) + 0.5, z + (alea() - 0.5) * 3, 2, true); },
    get stats() {
      let tri = 0;
      for (const m of morceaux) tri += (m.geometry.attributes.position?.count || 0) / 3;
      return { ms: { sol: +perf.sol.toFixed(2), rendu: +perf.rendu.toFixed(2), renduFini: +perf.fini.toFixed(2) }, triangles: tri, trianglesDessines: renderer.info.render.triangles, soldatsVus: vus, touffesVues: vuesHerbe, appels: renderer.info.render.calls, rangees: coutRangees };
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
