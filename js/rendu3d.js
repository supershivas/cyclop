/* Le rendu, en three.js (profil pixel-3d-three de game-system). Il lit l'état
   de la bataille et ne le modifie jamais.

   - Caméra : une projection oblique, orthographique et très plongée. Le dessus
     des cases garde sa forme (un mètre = `ppm` pixels, un entier : le zoom va
     par facteurs entiers) ; une hauteur h remonte de K_H × h à l'écran ; seules
     les parois tournées vers le sud (vers nous) se voient.
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
     point de 2 × 2 pixels (la couleur du camp sur son ombre). */
import { loadThree } from './three-lib.js?v=0.1.1';
import { PALETTE, ORDRE, INDICE } from './palette.js?v=0.1.1';
import { OMBRE, couleursLigne } from './apparence.js?v=0.1.1';
import { MORCEAU, hauteurVueQ as hauteurQ, hauteurVueM as hauteurM, hauteurQ as hauteurLogQ } from './terrain.js?v=0.1.1';
import { horloge } from './bataille.js?v=0.1.1';
import { SOLDATS, TAILLES, POSES } from './data/soldats.js?v=0.1.1';

export const K_H = 0.5;                       // pixels d'écran remontés par mètre de hauteur, par pixel de sol
export const ZOOMS = [1, 2, 3, 4, 6, 8];      // pixels (logiques) par mètre
const PROF_MIN = -20, PROF_MAX = 220;
const POINTS_JUSQUA = 2;                      // zoom où un soldat n'est plus qu'un point
const PLAT_JUSQUA = 2;                        // zoom où le sol devient une seule image plate (une marche d'un quart y fait un demi-pixel)
const PLUIE = 1600, ECLATS = 900;
const SOCLE = -8;                             // m : le bas de la coupe du terrain (bord sud)

/* Options (variantes du labo, Jérôme v0.1.1) : sol 'cubes' (le jeu) ou 'facettes' ;
   soldats 'boites' (le jeu) ou 'sprites'. */
export async function creerRendu(canvas, { budgetMs = 4, mesure = false, sol: modeSol = 'cubes', soldats: modeSoldats = 'boites' } = {}) {
  const FACETTES = modeSol === 'facettes', SPRITES = modeSoldats === 'sprites';
  const THREE = await loadThree();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(PALETTE.t), 1);
  const gl = renderer.getContext();
  const scene = new THREE.Scene();

  // ─── La caméra oblique ───
  const camera = new THREE.Camera();
  camera.matrixAutoUpdate = false;
  const vue = { cx: 200, cz: 150, zoom: 2, vw: 320, vh: 200, facteur: 2 };
  function projeter() {
    const p = ZOOMS[vue.zoom];
    // le centre posé sur la grille de pixels : les bords des cases tombent sur des pixels entiers
    const cx = Math.round(vue.cx * p) / p, cz = Math.round(vue.cz * p) / p;
    const a = 2 * p / vue.vw, b = 2 * p / vue.vh, Rg = PROF_MAX - PROF_MIN;
    camera.projectionMatrix.set(
      a, 0, 0, -cx * a,
      0, b * K_H, -b, cz * b,
      0, -2 / Rg, -2 * K_H / Rg, 1 + 2 * PROF_MIN / Rg,
      0, 0, 0, 1,
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    return { cx, cz, p };
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
      attribute float aParoi;
      varying vec2 vUV;
      uniform vec2 uTaille;
      void main() {
        // une paroi prend la couleur de la case au-dessus d'elle (au nord), en plus sombre (la moitié basse de la texture)
        vec2 xz = vec2(position.x, position.z - (aParoi > 0.1 ? 0.5 : 0.0));
        vUV = vec2(xz.x / uTaille.x, (xz.y / uTaille.y + (aParoi > 0.5 ? 1.0 : 0.0)) * 0.5);
        gl_Position = projectionMatrix * vec4(position, 1.0);
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
    const pos = [], paroi = [];
    const quad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, p) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
      for (let k = 0; k < 6; k++) paroi.push(p);
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
      quad(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0, 0);
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
        quad(x0, yb, z, x1, yb, z, x1, ya, z, x0, ya, z, haut - bas >= 2 ? 1 : 0.25);
        i += k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aParoi', new THREE.Float32BufferAttribute(paroi, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(i0 + w / 2, 3, j0 + h / 2), Math.hypot(w, h, 20) / 2);
    return g;
  }

  /* ─── Le sol à facettes (variante) : un sommet à chaque coin de case, à la
     hauteur moyenne des quatre cases qui le touchent (la hauteur logique, au
     quart). Par carrés de FIN cases : fins (un quadrilatère par case) là où les
     obus ont creusé, grossiers ailleurs (un seul quadrilatère) ; le bord d'un
     carré fin qui touche un carré grossier suit la droite de celui-ci (pas de
     fente). Chaque facette prend la couleur de sa case, ou celle de la paroi
     si elle tourne le dos à la lumière (nord-ouest) : tout reste dans la palette. ─── */
  const FIN = 5;
  const solFacMat = new THREE.ShaderMaterial({
    uniforms: { uSol: { value: null }, uTaille: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `
      attribute float aParoi;
      varying vec3 vW; varying float vParoi;
      void main() { vW = position; vParoi = aParoi; gl_Position = projectionMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uSol; uniform vec2 uTaille;
      varying vec3 vW; varying float vParoi;
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (n.y < 0.0) n = -n;
        float d = dot(n, normalize(vec3(-0.35, 0.85, -0.4)));
        // à l'ombre sur une pente tournée vers le sud ; tramé (accroché au monde) dans l'entre-deux : une bosse de 8° se lit
        bool ombre = vParoi > 0.5 || d < 0.7 || (d < 0.8 && mod(floor(vW.x * 2.0) + floor(vW.z * 2.0), 2.0) > 0.5);
        vec2 cell = clamp(floor(vW.xz - (vParoi > 0.5 ? vec2(0.0, 0.5) : vec2(0.0))), vec2(0.0), uTaille - 1.0);
        vec2 uv = vec2((cell.x + 0.5) / uTaille.x, ((cell.y + 0.5) / uTaille.y + (ombre ? 1.0 : 0.0)) * 0.5);
        gl_FragColor = vec4(texture2D(uSol, uv).rgb, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  // la hauteur d'un coin (ci, cj), en mètres : la moyenne des cases qui le touchent
  function coin(ci, cj) {
    let s = 0, n = 0;
    for (let dj = -1; dj <= 0; dj++) for (let di = -1; di <= 0; di++) {
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= T.W || j >= T.H) continue;
      s += hauteurLogQ(T, j * T.W + i); n++;
    }
    return s / n * 0.25;
  }
  // un carré de FIN cases est fin si un obus y a touché une case
  function fin(bx, by) {
    if (bx < 0 || by < 0 || bx * FIN >= T.W || by * FIN >= T.H) return true;   // hors du champ : rien à raccorder
    for (let j = by * FIN; j < Math.min(T.H, (by + 1) * FIN); j++) for (let i = bx * FIN; i < Math.min(T.W, (bx + 1) * FIN); i++) if (T.diff[j * T.W + i]) return true;
    return false;
  }
  // la hauteur d'un sommet de carré fin, raccordée aux carrés grossiers voisins
  function sommet(ci, cj) {
    const bx = Math.floor(ci / FIN), by = Math.floor(cj / FIN), ox = ci - bx * FIN, oy = cj - by * FIN;
    if (ox === 0 && oy !== 0 && !fin(bx - 1, by)) { const a = coin(ci, by * FIN), b = coin(ci, by * FIN + FIN); return a + (b - a) * oy / FIN; }
    if (oy === 0 && ox !== 0 && !fin(bx, by - 1)) { const a = coin(bx * FIN, cj), b = coin(bx * FIN + FIN, cj); return a + (b - a) * ox / FIN; }
    return coin(ci, cj);
  }
  function construireFacettes(mx, my) {
    const i0 = mx * MORCEAU, j0 = my * MORCEAU, i1 = Math.min(T.W, i0 + MORCEAU), j1 = Math.min(T.H, j0 + MORCEAU);
    const pos = [], paroi = [];
    const quad = (x0, z0, x1, z1, h00, h10, h11, h01) => {
      pos.push(x0, h00, z0, x0, h01, z1, x1, h11, z1, x0, h00, z0, x1, h11, z1, x1, h10, z0);
      for (let k = 0; k < 6; k++) paroi.push(0);
    };
    for (let by = j0 / FIN; by < j1 / FIN; by++) for (let bx = i0 / FIN; bx < i1 / FIN; bx++) {
      const X0 = bx * FIN, Z0 = by * FIN, X1 = Math.min(T.W, X0 + FIN), Z1 = Math.min(T.H, Z0 + FIN);
      if (!fin(bx, by)) { quad(X0, Z0, X1, Z1, coin(X0, Z0), coin(X1, Z0), coin(X1, Z1), coin(X0, Z1)); continue; }
      // dans un carré fin, ses bords droit et bas sont raccordés par les carrés voisins (sommet() regarde à gauche et en haut)
      const h = (ci, cj) => {
        const ox = ci - X0, oy = cj - Z0;
        if (ox === FIN && oy % FIN && !fin(bx + 1, by)) { const a = coin(ci, Z0), b = coin(ci, Z0 + FIN); return a + (b - a) * oy / FIN; }
        if (oy === FIN && ox % FIN && !fin(bx, by + 1)) { const a = coin(X0, cj), b = coin(X0 + FIN, cj); return a + (b - a) * ox / FIN; }
        return sommet(ci, cj);
      };
      for (let j = Z0; j < Z1; j++) for (let i = X0; i < X1; i++) quad(i, j, i + 1, j + 1, h(i, j), h(i + 1, j), h(i + 1, j + 1), h(i, j + 1));
    }
    // la coupe au bord sud du champ
    if (j1 === T.H) for (let i = i0; i < i1; i++) {
      const a = coin(i, T.H), b = coin(i + 1, T.H);
      pos.push(i, SOCLE, T.H, i + 1, SOCLE, T.H, i + 1, b, T.H, i, SOCLE, T.H, i + 1, b, T.H, i, a, T.H);
      for (let k = 0; k < 6; k++) paroi.push(1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aParoi', new THREE.Float32BufferAttribute(paroi, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3((i0 + i1) / 2, 3, (j0 + j1) / 2), Math.hypot(i1 - i0, j1 - j0, 20) / 2);
    return g;
  }
  // la hauteur de la surface dessinée en (x, z) : là où l'on pose soldats et arbres
  function surface(x, z) {
    const i = Math.max(0, Math.min(T.W - 1, x | 0)), j = Math.max(0, Math.min(T.H - 1, z | 0));
    if (!FACETTES) return hauteurM(T, j * T.W + i);
    const bx = Math.floor(i / FIN), by = Math.floor(j / FIN);
    let x0, z0, d, a, b, c, e;
    if (fin(bx, by)) { x0 = i; z0 = j; d = 1; a = sommet(i, j); b = sommet(i + 1, j); c = sommet(i, j + 1); e = sommet(i + 1, j + 1); }
    else { x0 = bx * FIN; z0 = by * FIN; d = FIN; a = coin(x0, z0); b = coin(x0 + d, z0); c = coin(x0, z0 + d); e = coin(x0 + d, z0 + d); }
    const u = Math.max(0, Math.min(1, (x - x0) / d)), v = Math.max(0, Math.min(1, (z - z0) / d));
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + e * u) * v;
  }

  // ─── Les soldats ───
  let cap = 0, posArr = null, campArr = null, soldatsInst = null, soldatsPoints = null, attrsI = null, attrsP = null;
  const soldatMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') } },
    vertexShader: `
      attribute vec3 aPos; attribute float aCamp; attribute float aPart;
      varying float vCamp; varying float vPart; varying float vHaut;
      void main() {
        vCamp = aCamp; vPart = aPart; vHaut = position.y;
        gl_Position = projectionMatrix * vec4(position + aPos, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel;
      varying float vCamp; varying float vPart; varying float vHaut;
      void main() {
        if (vPart > 0.5) { gl_FragColor = vec4(uOmbre, 1.0); return; }
        bool sel = vCamp > 1.5;
        float camp = sel ? vCamp - 2.0 : vCamp;
        vec3 c = camp > 0.5 ? uEux : uNous;
        if (sel && vHaut > 1.45) c = uSel;            // le casque des choisis
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const pointMat = new THREE.ShaderMaterial({
    uniforms: { uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') } },
    vertexShader: `
      attribute float aCamp; varying float vCamp;
      void main() { vCamp = aCamp; gl_Position = projectionMatrix * vec4(position + vec3(0.0, 1.2, 0.0), 1.0); gl_PointSize = 2.0; }`,
    fragmentShader: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel; varying float vCamp;
      void main() {
        if (gl_PointCoord.y > 0.5) { gl_FragColor = vec4(uOmbre, 1.0); return; }
        bool sel = vCamp > 1.5;
        float camp = sel ? vCamp - 2.0 : vCamp;
        gl_FragColor = vec4(sel ? uSel : (camp > 0.5 ? uEux : uNous), 1.0);
      }`,
  });
  /* ─── Les soldats en sprites (variante) : un quadrilatère par soldat, de la
     taille exacte du sprite en pixels de l'image, posé par son pied sur le sol
     (le pied tombe sur un pixel entier : rien ne bave). L'atlas : un octet par
     pixel (0 vide, la palette 1..N, 200 la couleur du camp, 201 le casque). ─── */
  const atlas = (() => {
    const rects = {}, liste = [];
    let x = 0, H = 0;
    for (const camp of ['nous', 'eux']) for (const taille of Object.keys(TAILLES)) for (const pose of POSES) {
      const rows = SOLDATS[camp][taille][pose];
      liste.push([`${camp}:${taille}:${pose}`, rows, x]);
      x += rows[0].length + 1; H = Math.max(H, rows.length);
    }
    const W = x, data = new Uint8Array(W * H);
    for (const [cle, rows, x0] of liste) {
      rows.forEach((r, j) => [...r].forEach((ch, i) => {
        data[j * W + x0 + i] = ch === '.' ? 0 : ch === 'c' ? 200 : ch === 'k' ? 201 : INDICE[ch] + 1;
      }));
      rects[cle] = [x0, 0, rows[0].length, rows.length];
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.unpackAlignment = 1; tex.needsUpdate = true;
    return { tex, rects, W, H };
  })();
  const tailleDuZoom = p => Object.keys(TAILLES).find(t => TAILLES[t].includes(p)) || 'grand';
  const spriteMat = new THREE.ShaderMaterial({
    uniforms: { uAtlas: { value: atlas.tex }, uAtlasT: { value: new THREE.Vector2(atlas.W, atlas.H) }, uVue: { value: new THREE.Vector2(1, 1) },
      uPal: { value: palTex }, uNP: { value: NP }, uNous: { value: col('n') }, uEux: { value: col('x') }, uSel: { value: col('o') } },
    vertexShader: `
      attribute vec3 aPos; attribute float aCamp; attribute vec4 aRect;
      uniform vec2 uVue;
      varying vec2 vTex; varying float vCamp;
      void main() {
        vec4 c = projectionMatrix * vec4(aPos, 1.0);
        vec2 pied = floor((c.xy * 0.5 + 0.5) * uVue);
        vec2 p = pied + vec2(-floor(aRect.z * 0.5), 0.0) + position.xy * aRect.zw;
        gl_Position = vec4(p / uVue * 2.0 - 1.0, c.z, 1.0);
        vTex = vec2(aRect.x + position.x * aRect.z, aRect.y + (1.0 - position.y) * aRect.w);
        vCamp = aCamp;
      }`,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec2 uAtlasT; uniform sampler2D uPal; uniform float uNP;
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uSel;
      varying vec2 vTex; varying float vCamp;
      void main() {
        float v = floor(texture2D(uAtlas, (floor(vTex) + 0.5) / uAtlasT).r * 255.0 + 0.5);
        if (v < 0.5) discard;
        bool sel = vCamp > 1.5;
        vec3 camp = (sel ? vCamp - 2.0 : vCamp) > 0.5 ? uEux : uNous;
        vec3 c = v > 199.5 ? ((v > 200.5 && sel) ? uSel : camp) : texture2D(uPal, vec2((v - 0.5) / uNP, 0.25)).rgb;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  let rectArr = null, attrR = null, soldatsSprites = null;

  function preparerSoldats(capacite) {
    if (soldatsSprites) { scene.remove(soldatsSprites); soldatsSprites.geometry.dispose(); soldatsSprites = null; }
    if (soldatsInst) { scene.remove(soldatsInst, soldatsPoints); soldatsInst.geometry.dispose(); soldatsPoints.geometry.dispose(); }
    cap = capacite;
    posArr = new Float32Array(cap * 3); campArr = new Float32Array(cap);
    // un soldat de 0,5 × 1,7 × 0,35 m : dans cette vue, seuls le dessus et la face sud se voient
    // (deux quadrilatères, pas une boîte) ; et son ombre au sol vers le sud-est (la lumière vient du nord-ouest)
    const q = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
    const w = 0.25, dz = 0.175, H = 1.7;
    const corps = [
      ...q([-w, H, -dz], [-w, H, dz], [w, H, dz], [w, H, -dz]),        // le dessus (casque)
      ...q([-w, 0, dz], [w, 0, dz], [w, H, dz], [-w, H, dz]),          // la face sud
    ];
    const ombre = q([-0.05, 0.02, 0], [-0.05, 0.02, 0.6], [0.65, 0.02, 0.6], [0.65, 0.02, 0]);
    const p = [...ombre, ...corps];
    const part = [...new Array(ombre.length / 3).fill(1), ...new Array(corps.length / 3).fill(0)];
    const gi = new THREE.InstancedBufferGeometry();
    gi.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    gi.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
    attrsI = [new THREE.InstancedBufferAttribute(posArr, 3), new THREE.InstancedBufferAttribute(campArr, 1)];
    attrsI.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gi.setAttribute('aPos', attrsI[0]); gi.setAttribute('aCamp', attrsI[1]);
    gi.instanceCount = 0;
    soldatsInst = new THREE.Mesh(gi, soldatMat); soldatsInst.frustumCulled = false; soldatsInst.renderOrder = 2;
    const gp = new THREE.BufferGeometry();
    attrsP = [new THREE.BufferAttribute(posArr, 3), new THREE.BufferAttribute(campArr, 1)];
    attrsP.forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    gp.setAttribute('position', attrsP[0]); gp.setAttribute('aCamp', attrsP[1]);
    gp.setDrawRange(0, 0);
    soldatsPoints = new THREE.Points(gp, pointMat); soldatsPoints.frustumCulled = false; soldatsPoints.renderOrder = 2;
    scene.add(soldatsInst, soldatsPoints);
    if (SPRITES) {
      rectArr = new Float32Array(cap * 4);
      const gs = new THREE.InstancedBufferGeometry();
      gs.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0], 3));
      attrR = new THREE.InstancedBufferAttribute(rectArr, 4); attrR.setUsage(THREE.DynamicDrawUsage);
      gs.setAttribute('aPos', attrsI[0]); gs.setAttribute('aCamp', attrsI[1]); gs.setAttribute('aRect', attrR);
      gs.instanceCount = 0;
      soldatsSprites = new THREE.Mesh(gs, spriteMat); soldatsSprites.frustumCulled = false; soldatsSprites.renderOrder = 2;
      scene.add(soldatsSprites);
    }
  }

  // ─── Les arbres : un tronc, quelques branches nues ; abattus, une souche ───
  const arbresMesh = [];
  function geometrieArbre(v, abattu) {
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
      for (let k = 0; k < 4; k++) {
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
    for (const abattu of [0, 1]) for (let v = 0; v < 4; v++) {
      const m = new THREE.InstancedMesh(geometrieArbre(v, abattu), arbreMat, Math.max(1, T.arbres.length));
      m.count = 0; m.frustumCulled = false; m.userData = { abattu, v };
      arbresMesh.push(m); scene.add(m);
    }
  }
  let arbresVus = '';
  function majArbres() {
    const cle = T.arbres.map(a => a.abattu).join('') + plat();
    if (cle === arbresVus) return;
    arbresVus = cle;
    const m4 = new THREE.Matrix4();
    for (const m of arbresMesh) {
      let n = 0;
      for (const a of T.arbres) {
        if (a.abattu !== m.userData.abattu || a.v !== m.userData.v) continue;
        m4.makeTranslation(a.i + 0.5, plat() ? 0 : surface(a.i + 0.5, a.j + 0.5), a.j + 0.5);
        m.setMatrixAt(n++, m4);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    }
  }

  // ─── Les éclats : l'éclair, la terre jetée, la fumée (des points) ───
  const ecl = { x: new Float32Array(ECLATS), y: new Float32Array(ECLATS), z: new Float32Array(ECLATS), vx: new Float32Array(ECLATS), vy: new Float32Array(ECLATS), vz: new Float32Array(ECLATS), age: new Float32Array(ECLATS).fill(99), vie: new Float32Array(ECLATS), sorte: new Uint8Array(ECLATS) };
  let eclTete = 0;
  const eclPos = new Float32Array(ECLATS * 3), eclTon = new Float32Array(ECLATS);
  const eclGeo = new THREE.BufferGeometry();
  eclGeo.setAttribute('position', new THREE.BufferAttribute(eclPos, 3).setUsage(THREE.DynamicDrawUsage));
  eclGeo.setAttribute('aTon', new THREE.BufferAttribute(eclTon, 1).setUsage(THREE.DynamicDrawUsage));
  const eclMat = new THREE.ShaderMaterial({
    uniforms: { uPal: { value: palTex }, uNP: { value: NP }, uTaille: { value: 2 } },
    vertexShader: `attribute float aTon; varying float vTon; uniform float uTaille;
      void main() { vTon = aTon; gl_Position = projectionMatrix * vec4(position, 1.0); gl_PointSize = aTon < 0.0 ? 0.0 : uTaille; if (aTon < 0.0) gl_Position = vec4(2.0); }`,
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
  function eclater(x, y, cal) {
    const big = cal === '220' ? 3 : cal === '155' ? 2 : 1;
    const h = T ? surface(x, y) : 0;
    const n = 14 * big;
    for (let k = 0; k < n; k++) {
      const s = eclTete; eclTete = (eclTete + 1) % ECLATS;
      const sorte = k < 3 * big ? 0 : k < 9 * big ? 1 : 2;           // éclair, terre, fumée
      const a = alea() * Math.PI * 2, v = (sorte === 1 ? 6 : 1.5) * (0.4 + alea()) * big;
      ecl.x[s] = x + (alea() - 0.5) * big; ecl.z[s] = y + (alea() - 0.5) * big; ecl.y[s] = h + 0.3;
      ecl.vx[s] = Math.cos(a) * v; ecl.vz[s] = Math.sin(a) * v * 0.7; ecl.vy[s] = sorte === 1 ? 5 + alea() * 6 * big : sorte === 2 ? 1.2 + alea() : 0;
      ecl.age[s] = 0; ecl.vie[s] = sorte === 0 ? 0.12 : sorte === 1 ? 0.9 : 2.5 + alea() * 2; ecl.sorte[s] = sorte;
    }
  }
  function majEclats(dt) {
    for (let s = 0; s < ECLATS; s++) {
      if (ecl.age[s] > ecl.vie[s]) { eclTon[s] = -1; continue; }
      ecl.age[s] += dt;
      if (ecl.sorte[s] === 1) ecl.vy[s] -= 18 * dt;
      if (ecl.sorte[s] === 2) { ecl.vx[s] *= 0.97; ecl.vz[s] *= 0.97; }
      ecl.x[s] += ecl.vx[s] * dt; ecl.y[s] += ecl.vy[s] * dt; ecl.z[s] += ecl.vz[s] * dt;
      eclPos[s * 3] = ecl.x[s]; eclPos[s * 3 + 1] = ecl.y[s]; eclPos[s * 3 + 2] = ecl.z[s];
      eclTon[s] = ecl.sorte[s] === 0 ? INDICE.o : ecl.sorte[s] === 1 ? INDICE.b : 100 + (ecl.age[s] / ecl.vie[s] < 0.3 ? INDICE.r : INDICE.g);
    }
    eclGeo.attributes.position.needsUpdate = true; eclGeo.attributes.aTon.needsUpdate = true;
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
        gl_Position = projectionMatrix * vec4(p, 1.0);
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

  // ─── Brancher une bataille ───
  function attacher(bataille) {
    B = bataille; T = B.terrain;
    if (sol) { scene.remove(sol); sol.children.forEach(m => m.geometry.dispose()); solTex.dispose(); }
    solIdx = new Uint8Array(T.W * T.H);
    solData = new Uint8Array(T.W * T.H * 2 * 4);
    solTex = new THREE.DataTexture(solData, T.W, T.H * 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    solTex.magFilter = solTex.minFilter = THREE.NearestFilter; solTex.generateMipmaps = false;
    solMat.uniforms.uSol.value = solTex; solMat.uniforms.uTaille.value.set(T.W, T.H);
    solFacMat.uniforms.uSol.value = solTex; solFacMat.uniforms.uTaille.value.set(T.W, T.H);
    vuLigne = new Uint32Array(T.H).fill(0xffffffff); gelVu = null;
    sol = new THREE.Group(); scene.add(sol);
    // le niveau de détail lointain : tout le champ en deux triangles, à plat
    if (solPlat) { scene.remove(solPlat); solPlat.geometry.dispose(); }
    const gp = new THREE.PlaneGeometry(T.W, T.H); gp.rotateX(-Math.PI / 2); gp.translate(T.W / 2, 0, T.H / 2);
    gp.setAttribute('aParoi', new THREE.Float32BufferAttribute(new Float32Array(gp.attributes.position.count), 1));
    solPlat = new THREE.Mesh(gp, solMat); solPlat.frustumCulled = false;
    scene.add(solPlat);
    morceaux = [];
    for (let my = 0; my < T.mh; my++) for (let mx = 0; mx < T.mw; mx++) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), FACETTES ? solFacMat : solMat);
      m.userData = { mx, my, version: -1 };
      morceaux.push(m); sol.add(m);
    }
    // tout construire tout de suite (le premier écran doit être juste)
    for (const m of morceaux) refaire(m);
    majSol(true);
    preparerSoldats(B.armee.capacite);
    preparerArbres(); arbresVus = '';
    vue.cx = T.W / 2; vue.cz = T.H * 0.62;
  }
  // un morceau dépend aussi de ses voisins (la paroi au sud, le raccord des facettes) : leurs versions comptent
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
    m.geometry.dispose();
    m.geometry = FACETTES ? construireFacettes(mx, my) : construireMorceau(mx, my);
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
      couleursLigne(T, j, B.R, gel, solIdx, !FACETTES);
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
    const A = B.armee, n = A.n, p = ZOOMS[vue.zoom], aPlat = plat(), taille = tailleDuZoom(p);
    // seulement ceux qu'on voit (avec une marge pour la hauteur et l'ombre)
    const mx = vue.vw / 2 / p + 2, x0 = vue.cx - mx, x1 = vue.cx + mx;
    const z0 = vue.cz - vue.vh / 2 / p - 2, z1 = vue.cz + vue.vh / 2 / p + 8;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const x = A.x[i], y = A.y[i];
      if (x < x0 || x > x1 || y < z0 || y > z1) continue;
      posArr[k * 3] = x; posArr[k * 3 + 1] = aPlat ? 0 : surface(x, y); posArr[k * 3 + 2] = y;
      campArr[k] = A.camp[i] + (choisis.has(A.reg[i]) ? 2 : 0);
      if (rectArr) {
        // la pose : à l'arrêt, ou l'un des deux pas (selon le chemin parcouru)
        const marche = A.vx[i] * A.vx[i] + A.vy[i] * A.vy[i] > 0.06;
        const pose = marche ? (((x + y) * 1.6) & 1 ? 'marche2' : 'marche1') : 'arret';
        const r = atlas.rects[`${A.camp[i] ? 'eux' : 'nous'}:${taille}:${pose}`];
        rectArr[k * 4] = r[0]; rectArr[k * 4 + 1] = r[1]; rectArr[k * 4 + 2] = r[2]; rectArr[k * 4 + 3] = r[3];
      }
      k++;
    }
    const points = p <= POINTS_JUSQUA;
    if (!vide) { soldatsPoints.visible = points; soldatsInst.visible = !points && !SPRITES; if (soldatsSprites) soldatsSprites.visible = !points; }
    for (const a of points ? attrsP : SPRITES ? [...attrsI, attrR] : attrsI) { a.clearUpdateRanges(); a.addUpdateRange(0, k * a.itemSize); a.needsUpdate = true; }
    if (soldatsSprites) soldatsSprites.geometry.instanceCount = k;
    soldatsPoints.geometry.setDrawRange(0, k);
    soldatsInst.geometry.instanceCount = k;
    vus = k;
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
  }

  // ─── Coordonnées ───
  // pixels CSS dans le canvas → [x, y] du terrain (mètres), en tenant compte du relief
  function versTerrain(px, py) {
    const dpr = window.devicePixelRatio || 1, p = ZOOMS[vue.zoom];
    const sx = px * dpr / vue.facteur - vue.vw / 2, sy = py * dpr / vue.facteur - vue.vh / 2;
    const x = vue.cx + sx / p;
    let z = vue.cz + sy / p;
    if (T) for (let k = 0; k < 4; k++) {
      z = vue.cz + sy / p + (plat() ? 0 : K_H * surface(x, z));
    }
    return [x, z];
  }
  // [x, y] du terrain (et une hauteur) → pixels CSS
  function versEcran(x, y, h = null) {
    const dpr = window.devicePixelRatio || 1, p = ZOOMS[vue.zoom];
    if (h === null && T && plat()) h = 0;
    if (h === null && T) h = surface(x, y);
    const sx = (x - vue.cx) * p + vue.vw / 2, sy = ((y - vue.cz) - K_H * (h || 0)) * p + vue.vh / 2;
    return [sx * vue.facteur / dpr, sy * vue.facteur / dpr];
  }

  // ─── Une image ───
  const perf = { rendu: 0, fini: 0, sol: 0, n: 0 };
  const unPixel = new Uint8Array(4);
  let tAnim = 0, vide = false;            // vide : rien n'est dessiné (mesure du prix de l'attente)
  function dessiner(dt, evenements = []) {
    if (!B) return;
    const t0 = performance.now();
    for (const e of evenements) if (e.type === 'impact') eclater(e.x, e.y, e.cal);
    majSol(false, dt);
    if (!vide) { sol.visible = !plat(); solPlat.visible = plat(); }
    solMat.uniforms.uPlat.value = plat() ? 1 : 0;
    if (!plat()) majMorceaux();
    majArbres();
    const t1 = performance.now();
    majSoldats();
    tAnim += dt;
    majEclats(dt);
    const h = horloge(B);
    if (!vide) { pluie.visible = h.meteo === 'pluie' && h.phase === 'jour'; brume.visible = h.meteo === 'brouillard'; }
    const { cx, cz, p } = projeter();
    plMat.uniforms.uT.value = tAnim; plMat.uniforms.uC.value.set(cx, cz);
    plMat.uniforms.uE.value.set(vue.vw / p + 20, vue.vh / p + 40);
    plMat.uniforms.uTaille.value = p >= 4 ? 2 : 1;
    brumeMat.uniforms.uH.value = vue.vh;
    spriteMat.uniforms.uVue.value.set(vue.vw, vue.vh);
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
      vue.zoom = Math.max(0, Math.min(ZOOMS.length - 1, vue.zoom + d));
      if (avant) {
        const apres = versTerrain(...ancre);
        vue.cx += avant[0] - apres[0]; vue.cz += avant[1] - apres[1];
      }
      borner();
    },
    deplacer(dx, dz) { vue.cx += dx; vue.cz += dz; borner(); },
    get ppm() { return ZOOMS[vue.zoom]; },
    get stats() {
      let tri = 0;
      for (const m of morceaux) tri += (m.geometry.attributes.position?.count || 0) / 3;
      return { ms: { sol: +perf.sol.toFixed(2), rendu: +perf.rendu.toFixed(2), renduFini: +perf.fini.toFixed(2) }, triangles: tri, trianglesDessines: renderer.info.render.triangles, soldatsVus: vus, appels: renderer.info.render.calls, rangees: coutRangees };
    },
    detruire() { renderer.dispose(); },
  };
  function borner() {
    if (!T) return;
    vue.cx = Math.max(0, Math.min(T.W, vue.cx));
    vue.cz = Math.max(0, Math.min(T.H, vue.cz));
  }
}
