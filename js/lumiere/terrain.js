// Le terrain en voxels du labo lumière : une grille de colonnes de hauteur (en quarts de cube), déjà façonnée
// (bosses, végétation, tranchées sur quelques niveaux par camp, abris couverts) et que les obus creusent.
// Logique pure (aucun DOM, aucune horloge, aucun hasard hors de la graine) : le futur jeu peut la reprendre telle quelle.
import { createRng } from '../lib/rng.js?v=0.127.2';
import { MONDE, MOTIF_OBUS } from './config.js?v=0.127.2';

export const MAT = { HERBE: 0, GLAISE: 1, TERRE: 2, BOUE: 3, SAC: 4, TRONC: 5, BUISSON: 6, TOIT: 7 };
const NIVEAU_BASE = 40;                // un sol à 10 m (en quarts de cube de 1 m : × cpm pour une grille plus fine) : les cratères et les tranchées ont de la place
// (toutes les hauteurs écrites ici en quarts valent pour des cubes de 1 m ; `k` = cpm les ramène à la grille : un mètre de haut est le même mètre à 1 ou 2 cases par mètre)

const hache = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lisse = t => t * t * (3 - 2 * t);
function bruit(x, y, s) {              // bruit de valeur lissé, x et y en unités de bruit
  const i = Math.floor(x), j = Math.floor(y), fx = lisse(x - i), fy = lisse(y - j);
  const a = hache(i, j, s), b = hache(i + 1, j, s), c = hache(i, j + 1, s), d = hache(i + 1, j + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

// Le monde. `cpm` : cases par mètre (1 ou 2) ; `largeurM`, `profondeurM` : sa taille en mètres.
export function creerMonde({ cpm = 1, graine = MONDE.graine, niveaux = MONDE.tranchees.niveaux, largeurM = MONDE.largeurM, profondeurM = MONDE.profondeurM } = {}) {
  const W = largeurM * cpm, H = profondeurM * cpm, n = W * H, ch = MONDE.chunkM * cpm, k = cpm, aire = largeurM * profondeurM / (256 * 160);
  const M = {
    W, H, n, cpm, largeurM, profondeurM, cell: 1 / cpm, chunk: ch, cw: Math.ceil(W / ch), chh: Math.ceil(H / ch), graine, niveaux,
    sol: new Int16Array(n), veg: new Uint8Array(n), toit: new Int16Array(n), mat: new Uint8Array(n),
    top: new Int16Array(n),            // la surface visible : le toit, sinon le sol + la végétation
    roofQ: 4 * k, cubeQ: 4 * k,       // un toit : 1 m d'épaisseur ; un cube de 1 m : le passage d'un homme sous un toit
    bordQ: (NIVEAU_BASE - 12) * k, bordM: (NIVEAU_BASE - 12) * k * (1 / cpm) / MONDE.quartsParCube,     // le niveau du faux terrain autour : la carte est un plateau qui se prolonge
    lignes: [],                        // les rangées de tranchées : { camp, niveau, z0, ... }
    abris: [], craters: [], obusTires: 0, quartsRetires: 0,
  };
  const rng = createRng(graine);
  // le relief : des ondulations lentes, quelques bosses
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = i / cpm, z = j / cpm;
    const r = bruit(x / 70, z / 55, graine) * 0.6 + bruit(x / 28, z / 24, graine + 1) * 0.3 + bruit(x / 11, z / 10, graine + 2) * 0.1;
    M.sol[j * W + i] = (NIVEAU_BASE + (r - 0.5) * 22) * k | 0;
    M.mat[j * W + i] = bruit(x / 9, z / 9, graine + 3) > 0.62 ? MAT.GLAISE : MAT.HERBE;
  }
  poserColline(M);
  tracerTranchees(M, rng);
  planterVegetation(M, rng);
  for (let i = 0; i < n; i++) M.top[i] = M.toit[i] || M.sol[i] + M.veg[i];
  // « déjà façonné » : des obus tombés avant (le no man's land et les abords des lignes)
  for (let q = 0, nObus = Math.round(MONDE.obusInitiaux * aire); q < nObus; q++) {
    const zone = rng();
    const zm = zone < 0.72 ? profondeurM * (0.36 + rng() * 0.28) : profondeurM * (0.1 + rng() * 0.8);
    impact(M, 6 + rng() * (largeurM - 12), zm, { reboucher: false });
  }
  M.craters.length = Math.min(M.craters.length, Math.round(400 * aire));
  M.obusTires = 0;
  return M;
}

// La colline (Jérôme : « sur le test, ajoute une colline ») : un mamelon au flanc raide et au sommet presque plat, dans le no man's land, que les tranchées coupent.
// Un plateau (jusqu'à 35 % du rayon) puis un flanc en cosinus : c'est là que l'ombre portée et l'AO se lisent le mieux.
function poserColline(M) {
  const C = MONDE.colline, cx = C.x * M.largeurM, cz = C.z * M.profondeurM, R = C.rayonM, h = C.hauteurM * 4 * M.cpm;     // hauteur en quarts de cube de cette grille
  M.colline = { x: cx, z: cz, rayonM: R, hauteurM: C.hauteurM };
  const i0 = Math.max(0, Math.floor((cx - R) * M.cpm)), i1 = Math.min(M.W - 1, Math.ceil((cx + R) * M.cpm)), j0 = Math.max(0, Math.floor((cz - R) * M.cpm)), j1 = Math.min(M.H - 1, Math.ceil((cz + R) * M.cpm));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = Math.hypot((i + 0.5) / M.cpm - cx, ((j + 0.5) / M.cpm - cz) * 1.15) / R;          // un peu allongée vers le nord-sud
    if (d >= 1) continue;
    const u = Math.min(1, Math.max(0, (d - 0.35) / 0.65));
    M.sol[j * M.W + i] += Math.round(h * (0.5 + 0.5 * Math.cos(Math.PI * u)));
  }
}

// Les tranchées : `niveaux` lignes par camp. Notre camp au sud (z grand, en bas de l'écran), en face au nord ; le no man's land au milieu.
function tracerTranchees(M, rng) {
  const { cpm, W, H } = M, T = MONDE.tranchees, k = cpm, L0 = M.largeurM / 256;
  const lignesZ = [];
  for (let k = 0; k < M.niveaux; k++) {
    lignesZ.push({ camp: 0, niveau: k, f: 0.63 + k * (0.3 / M.niveaux) });      // nous : du plus avancé au plus reculé
    lignesZ.push({ camp: 1, niveau: k, f: 0.37 - k * (0.3 / M.niveaux) });
  }
  const ph = (k, camp) => rng() * 6.28 + k * 1.7 + camp;
  for (const L of lignesZ) {
    L.phase = ph(L.niveau, L.camp); L.amp = 2.5 + rng() * 3; L.long = 38 + rng() * 25; L.zm = L.f * M.profondeurM;
    L.zAt = xm => L.zm + Math.sin(xm / L.long * 6.28 + L.phase) * L.amp;
    M.lignes.push(L);
  }
  const demi = T.largeurM / 2;
  for (const L of lignesZ) {
    // des abris couverts, sur les lignes arrière surtout
    const abris = [];
    if (L.niveau >= 1) for (let a = 0, na = Math.round(T.abrisParLigne * L0); a < na; a++) abris.push({ x0: 24 + rng() * (M.largeurM - 24 - T.abrisLongM - 24) });
    L.abris = abris;
    for (let i = 0; i < W; i++) {
      const xm = i / cpm, zc = L.zAt(xm), j0 = Math.floor((zc - demi - 1.5) * cpm), j1 = Math.ceil((zc + demi + 1.5) * cpm);
      const ab = abris.find(a => xm >= a.x0 && xm < a.x0 + T.abrisLongM);
      for (let j = Math.max(0, j0); j <= Math.min(H - 1, j1); j++) {
        const dz = j / cpm + 0.5 / cpm - zc, idx = j * W + i;
        if (Math.abs(dz) <= demi) {
          const ref = M.sol[idx];
          M.sol[idx] = ref - (ab ? T.profondeurQ + 4 : T.profondeurQ) * k;
          M.mat[idx] = MAT.TERRE;
          if (ab) M.toit[idx] = ref;
        } else if (Math.abs(dz) <= demi + 0.9 && (L.camp === 0 ? dz < 0 : dz > 0)) {
          M.sol[idx] += 4 * k; M.mat[idx] = MAT.SAC;          // le parapet, côté ennemi
        }
      }
    }
    for (const a of abris) M.abris.push({ x: a.x0 + T.abrisLongM / 2, z: L.zAt(a.x0 + T.abrisLongM / 2), camp: L.camp, niveau: L.niveau });
  }
  // des boyaux entre les niveaux d'un camp
  for (const camp of [0, 1]) {
    const L = lignesZ.filter(l => l.camp === camp).sort((a, b) => (camp === 0 ? a.f - b.f : b.f - a.f));
    const nb = Math.max(3, Math.round(3 * L0));                                         // des boyaux : de plus en plus sur une carte plus large
    for (let q = 0; q + 1 < L.length; q++) for (let b = 0; b < nb; b++) {
      const x0 = 36 + (b + rng() * 0.55) * (M.largeurM - 72) / nb;
      for (let t = 0; t <= 1; t += 0.5 / (Math.abs(L[q + 1].zm - L[q].zm) * cpm)) {
        const xm = x0 + Math.sin(t * 6.28 + b) * 1.6, zm = L[q].zAt(xm) + (L[q + 1].zAt(xm) - L[q].zAt(xm)) * t;
        const ci = Math.round(xm * cpm), cj = Math.round(zm * cpm), r = Math.ceil(T.boyauM / 2 * cpm);
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W || j >= H) continue;
          const idx = j * W + i; if (M.toit[idx]) continue;
          if (M.mat[idx] !== MAT.TERRE && M.mat[idx] !== MAT.SAC) { M.sol[idx] = Math.min(M.sol[idx], Math.max(8 * k, M.sol[idx] - 6 * k)); M.mat[idx] = MAT.TERRE; }
          else if (M.mat[idx] === MAT.SAC) { M.sol[idx] -= 4 * k; M.mat[idx] = MAT.TERRE; }
        }
      }
    }
  }
}

// La végétation : des souches brisées (surtout dans le no man's land), des buissons, quelques bois épargnés à l'arrière.
function planterVegetation(M, rng) {
  const { W, H, cpm } = M, V = MONDE.vegetation, aire = M.largeurM * M.profondeurM / (256 * 160), k = cpm;
  const libre = idx => !M.toit[idx] && M.mat[idx] !== MAT.TERRE && M.mat[idx] !== MAT.SAC;
  const poser = (xm, zm, haut, mat) => {
    const i = Math.round(xm * cpm), j = Math.round(zm * cpm); if (i < 1 || j < 1 || i >= W - 1 || j >= H - 1) return;
    const idx = j * W + i; if (!libre(idx)) return;
    M.veg[idx] = haut; M.mat[idx] = mat;
  };
  for (let q = 0, n = Math.round(V.souches * aire); q < n; q++) poser(4 + rng() * (M.largeurM - 8), M.profondeurM * (0.3 + rng() * 0.4), (10 + Math.floor(rng() * 16)) * k, MAT.TRONC);
  for (let q = 0, n = Math.round(V.buissons * aire); q < n; q++) poser(4 + rng() * (M.largeurM - 8), M.profondeurM * (0.03 + rng() * 0.94), (3 + Math.floor(rng() * 3)) * k, MAT.BUISSON);
  for (let b = 0, nb = Math.round(V.bois * aire); b < nb; b++) {
    const cx = 20 + rng() * (M.largeurM - 40), cz = rng() < 0.5 ? M.profondeurM * (0.02 + rng() * 0.08) : M.profondeurM * (0.9 + rng() * 0.08);
    for (let q = 0; q < 40; q++) {
      const a = rng() * 6.28, d = rng() * 12;
      poser(cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.7, (rng() < 0.7 ? 26 + Math.floor(rng() * 12) : 5) * k, rng() < 0.7 ? MAT.TRONC : MAT.BUISSON);
    }
  }
}

export const indice = (M, i, j) => j * M.W + i;
export const hauteurQ = (M, xm, zm) => {      // la surface sous un point (mètres), 0 hors carte
  const i = Math.floor(xm * M.cpm), j = Math.floor(zm * M.cpm);
  return i < 0 || j < 0 || i >= M.W || j >= M.H ? 0 : M.top[j * M.W + i];
};
export const metresDeQuarts = (M, q) => q * M.cell / MONDE.quartsParCube;       // un quart = cell/4 mètre

// Un obus : le centre perd un cube entier (4 quarts), les 4 voisins un demi-cube (2), les 4 coins un quart (1).
// Le motif est celui de 3 × 3 « super-cases » de `cpm` cases : à 2 cases par mètre, le cratère garde la même taille en mètres (profondeur × cpm quarts).
// Rend { i0, j0, i1, j1 } (les cases touchées, bornes comprises) ou null hors carte.
export function impact(M, xm, zm, { reboucher = true } = {}) {
  const s = M.cpm, ci = Math.floor(xm), cj = Math.floor(zm);       // super-case visée
  const i0 = (ci - 1) * s, j0 = (cj - 1) * s, i1 = (ci + 2) * s - 1, j1 = (cj + 2) * s - 1;
  if (i1 < 0 || j1 < 0 || i0 >= M.W || j0 >= M.H) return null;
  let retire = 0;
  for (let b = 0; b < 3; b++) for (let a = 0; a < 3; a++) {
    const d = MOTIF_OBUS[b][a] * s;
    for (let dj = 0; dj < s; dj++) for (let di = 0; di < s; di++) {
      const i = i0 + a * s + di, j = j0 + b * s + dj;
      if (i < 0 || j < 0 || i >= M.W || j >= M.H) continue;
      const idx = j * M.W + i;
      M.toit[idx] = 0; M.veg[idx] = 0;
      const nv = Math.max(2, M.sol[idx] - d);
      retire += M.sol[idx] - nv; M.sol[idx] = nv;
      M.mat[idx] = M.mat[idx] === MAT.SAC || reboucher && a === 1 && b === 1 ? MAT.BOUE : MAT.TERRE;
      M.top[idx] = nv;
    }
  }
  M.obusTires++; M.quartsRetires += retire;
  M.craters.push({ x: xm, z: zm });
  return { i0: Math.max(0, i0), j0: Math.max(0, j0), i1: Math.min(M.W - 1, i1), j1: Math.min(M.H - 1, j1), retire };
}

// Les chunks qui recouvrent un rectangle de cases, agrandi de `marge` chunks (le recalcul local de la lumière : le chunk touché et ses voisins).
export function chunksDe(M, r, marge = 0) {
  return {
    c0: Math.max(0, Math.floor(r.i0 / M.chunk) - marge), c1: Math.min(M.cw - 1, Math.floor(r.i1 / M.chunk) + marge),
    r0: Math.max(0, Math.floor(r.j0 / M.chunk) - marge), r1: Math.min(M.chh - 1, Math.floor(r.j1 / M.chunk) + marge),
  };
}
export const rectDeChunks = (M, c) => ({ i0: c.c0 * M.chunk, j0: c.r0 * M.chunk, i1: Math.min(M.W, (c.c1 + 1) * M.chunk) - 1, j1: Math.min(M.H, (c.r1 + 1) * M.chunk) - 1 });
