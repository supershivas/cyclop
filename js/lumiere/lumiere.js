// La lumière du labo, sans raytracing : quatre calculs sur la grille de colonnes, tous locaux (une région de cases) ou globaux (la carte entière).
// Logique pure : elle remplit `L.tex`, une texture RGBA8 (une case = un texel) que le nuanceur lit :
//   R = visibilité du soleil (étape 1)   G = ouverture au ciel (étape 2)   B = lumière propagée (étape 4)   A = creux, pour les flaques (étape 7)
// Aucun chronomètre ici : mesures.js mesure autour de chaque appel.
import { MONDE, SOLEIL } from './config.js?v=0.114.0';

const NIVEAU_MAX = 240, PAS_QUART = MONDE.quartsParCube;

export function creerLumiere(M, q) {
  const L = {
    q, tex: new Uint8Array(M.n * 4), n: M.n,
    // état de chaque calcul : 'vide' (jamais fait ou périmé), 'frais'
    etat: { sol: 'vide', ao: 'vide', flood: 'vide', cavite: 'vide' },
    soleil: null,
    hf: new Float32Array(M.n),                       // la surface en mètres, lue par le nuanceur des soldats
  };
  L.tex.fill(255);
  return L;
}

// La hauteur en mètres d'un quart de cube de cette grille
const mq = M => M.cell / PAS_QUART;

// La direction du soleil pour une heure (pure, partagée avec le rendu). dir : vers le soleil, y vers le haut.
export function directionSoleil(heure, jourBataille = 1) {
  const u = (heure - SOLEIL.leverH) / (SOLEIL.coucherH - SOLEIL.leverH);
  if (u <= 0 || u >= 1) return { dir: [0, -1, 0], hauteur: -1, jour: false, u };
  const bas = SOLEIL.hauteurMinDeg, haut = SOLEIL.hauteurMaxDeg * (1 - 0.025 * (jourBataille - 1));
  const hauteur = (bas + (haut - bas) * Math.sin(Math.PI * u)) * Math.PI / 180;
  const az = (u * 2 - 1) * SOLEIL.azimutDeg * Math.PI / 180;     // −112° à gauche à l'aube, +112° à droite au couchant ; 0 = derrière la caméra (vers le sud, +z)
  return { dir: [Math.sin(az) * Math.cos(hauteur), Math.sin(hauteur), Math.cos(az) * Math.cos(hauteur)], hauteur, jour: true, u };
}

// ─── Étape 1 : la lumière directe — le soleil caché par le relief ────────────
// Pour chaque colonne, on remonte vers le soleil et l'on garde la pente de l'obstacle le plus haut ; l'ombre est douce (pénombre de ±`flou`).
// L'ombre est tronquée à `porteeOmbre` mètres : c'est ce qui rend le recalcul local possible (un chunk fait 16 m).
export function calculerSoleil(M, L, region, soleil, porteeM = 16) {
  const { W } = M, T = M.top, hf = L.hf, out = L.tex;
  L.soleil = soleil;
  const { i0, j0, i1, j1 } = region;
  if (!soleil.jour) { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) out[(j * W + i) * 4] = 0; return; }
  const tanS = Math.tan(soleil.hauteur), cpm = M.cpm;
  const dx = soleil.dir[0], dz = soleil.dir[2], norme = Math.hypot(dx, dz) || 1, ux = dx / norme, uz = dz / norme;
  const pas = [], maxK = porteeM * cpm;
  for (let k = 1; k <= maxK; k += 1 + Math.floor(k / 12)) pas.push(k);
  const m = mq(M), flou = 0.09;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const idx = j * W + i, h0 = T[idx] * m;
    let maxTan = -1;
    for (let s = 0; s < pas.length; s++) {
      const k = pas[s], x = Math.round(i + ux * k), z = Math.round(j + uz * k);
      if (x < 0 || z < 0 || x >= W || z >= M.H) break;
      const dh = T[z * W + x] * m - h0 - 0.03;
      if (dh > 0) { const t = dh / (k * M.cell); if (t > maxTan) maxTan = t; }
      if (maxTan > tanS + flou * 3) break;
    }
    const v = 0.5 + (tanS - maxTan) / (2 * flou);
    out[idx * 4] = Math.max(0, Math.min(1, v)) * 255;
  }
}

// ─── Étape 2 : l'AO par voxel — l'ouverture de chaque colonne au ciel ────────
// Huit directions ; dans chacune, le sinus de l'angle de l'horizon (pente de l'obstacle le plus haut dans le rayon). 1 = grand ciel, 0.5 = fond de cratère.
// (L'autre moitié de l'AO, celle des arêtes de chaque cube, est cuite dans le maillage : rendu.js, `aoSommet`.)
const DIRS8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([x, y]) => { const n = Math.hypot(x, y); return [x, y, n]; });
export function calculerAO(M, L, region, rayonM = 6, nbDirs = 8) {
  const { W } = M, T = M.top, out = L.tex, m = mq(M), cpm = M.cpm, R = Math.round(rayonM * cpm);
  const ks = []; for (let k = 1; k <= R; k += k < 4 ? 1 : Math.ceil(k / 4)) ks.push(k);
  const dirs = nbDirs >= 8 ? DIRS8 : DIRS8.filter((_, d) => d % 2 === 0);
  const { i0, j0, i1, j1 } = region;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const idx = j * W + i, h0 = T[idx] * m;
    let occl = 0;
    for (let d = 0; d < dirs.length; d++) {
      const [dx, dy, nn] = dirs[d]; let maxTan = 0;
      for (let s = 0; s < ks.length; s++) {
        const k = ks[s], x = i + dx * k, z = j + dy * k;
        if (x < 0 || z < 0 || x >= W || z >= M.H) break;
        const t = (T[z * W + x] * m - h0) / (k * nn * M.cell);
        if (t > maxTan) maxTan = t;
      }
      occl += maxTan / Math.sqrt(1 + maxTan * maxTan);
    }
    out[idx * 4 + 1] = (1 - occl / dirs.length) * 255;
  }
}

// ─── Étape 4 : la lumière propagée — un flood fill façon Minecraft ────────────
// Une colonne à ciel ouvert vaut NIVEAU_MAX ; sous un toit, la lumière entre par les bouts et les trous et perd `perte` à chaque case.
// Deux colonnes se touchent seulement si l'air de l'une et de l'autre se recouvre d'au moins un cube (la terre d'un flanc de tranchée ne laisse rien passer).
// En local, les bords de la région sont lus dans la carte (les valeurs voisines, déjà justes) : on ne recalcule que `region`.
export function calculerFlood(M, L, region) {
  const { W, H } = M, sol = M.sol, toit = M.toit, out = L.tex;
  const perte = Math.max(1, Math.round(16 / M.cpm)), { i0, j0, i1, j1 } = region;
  const plafond = idx => toit[idx] ? toit[idx] - M.roofQ : 32767;
  const passe = (a, b) => Math.min(plafond(a), plafond(b)) - Math.max(sol[a], sol[b]) >= M.cubeQ;
  const file = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const idx = j * W + i; out[idx * 4 + 2] = toit[idx] ? 0 : NIVEAU_MAX; }
  const voisins = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const graine = (idx, i, j) => {      // la valeur que les voisins DEHORS de la région (ou les sources) donnent à une case couverte
    let v = out[idx * 4 + 2];
    for (const [dx, dy] of voisins) {
      const x = i + dx, z = j + dy; if (x < 0 || z < 0 || x >= W || z >= H) continue;
      const nb = z * W + x, dehors = x < i0 || x > i1 || z < j0 || z > j1;
      if (!passe(idx, nb)) continue;
      const c = (dehors ? out[nb * 4 + 2] : 0) - perte; if (c > v) v = c;
    }
    return v;
  };
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const idx = j * W + i;
    if (toit[idx]) { const v = graine(idx, i, j); out[idx * 4 + 2] = v; if (v > 0) file.push(idx); }
    else if ((i > 0 && toit[idx - 1]) || (i < W - 1 && toit[idx + 1]) || (j > 0 && toit[idx - W]) || (j < H - 1 && toit[idx + W])) file.push(idx);  // une case ouverte éclaire ses voisines couvertes
  }
  for (let q = 0; q < file.length; q++) {
    const idx = file[q], i = idx % W, j = (idx / W) | 0, v = out[idx * 4 + 2] - perte;
    if (v <= 0) continue;
    for (const [dx, dy] of voisins) {
      const x = i + dx, z = j + dy; if (x < i0 || x > i1 || z < j0 || z > j1) continue;
      const nb = z * W + x;
      if (out[nb * 4 + 2] < v && passe(idx, nb)) { out[nb * 4 + 2] = v; file.push(nb); }
    }
  }
}

// ─── Étape 7 : le creux — de quoi faire des flaques ─────────────────────────
// À quel point une colonne est plus basse que les cases à 3 m autour d'elle (0 = plat ou bosse, 255 = au moins 1,25 m plus bas).
export function calculerCavite(M, L, region) {
  const { W } = M, T = M.top, out = L.tex, m = mq(M), r = Math.round(3 * M.cpm);
  const { i0, j0, i1, j1 } = region;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const idx = j * W + i; let s = 0, n = 0;
    for (let d = 0; d < 8; d++) {
      const x = i + DIRS8[d][0] * r, z = j + DIRS8[d][1] * r; if (x < 0 || z < 0 || x >= W || z >= M.H) continue;
      s += T[z * W + x]; n++;
    }
    out[idx * 4 + 3] = n ? Math.max(0, Math.min(255, (s / n - T[idx]) * m / 1.25 * 255)) : 0;
  }
}

// La surface en mètres (le nuanceur des soldats la lit), pour une région
export function majHauteurs(M, L, region) {
  const m = mq(M), { i0, j0, i1, j1 } = region;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) L.hf[j * M.W + i] = M.top[j * M.W + i] * m;
}

export const regionTotale = M => ({ i0: 0, j0: 0, i1: M.W - 1, j1: M.H - 1 });
export const NIVEAU_FLOOD_MAX = NIVEAU_MAX;
