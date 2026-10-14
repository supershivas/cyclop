/* La foule des soldats : une copie divergente de js/swarm.js de « Pierre et
   les rats » (la nuée), pensée pour des milliers d'individus.

   Ce qui vient de la nuée :
   - une « structure de tableaux » typés (aucun objet par soldat, aucun
     ramasse-miettes), des boucles serrées ;
   - le voisinage par grille spatiale (cases de GRILLE m), reconstruite à chaque
     pas par tri par comptage : O(n) ;
   - le pilotage à la Reynolds (séparation, une errance légère) plus un but.

   Ce qui change :
   - le but n'est plus « Pierre » : chaque soldat a une place dans la formation
     de son régiment (un ordre = un point, un front, une largeur) ; loin de sa
     place, il suit le champ de coûts de l'ordre (champs.js), qui contourne la
     boue, l'eau et les marches de deux mètres ;
   - la vitesse dépend de la case : sec, humide, boue, eau (terrain.js), et de
     la marche à franchir (un mètre : très lent ; deux mètres : on escalade) ;
   - deux camps : la grille de densité (carrés de DENSITE m, par camp) sert au
     tir, par cône vers le front ; la victime est prise dans la grille fine ;
   - aucun hasard hors de la graine : il vient du générateur à graine de la bataille
     (rng.js), pour que la même graine rejoue la même bataille.

   Logique pure : aucun DOM. Le rendu lit les tableaux (rendu3d.js). */
import { hauteurQ, etat, vitesseEtat } from './terrain.js?v=0.1.1';

export const GRILLE = 2;           // m : cases de voisinage
export const DENSITE = 8;          // m : carrés de densité (tir)

export function creerArmee({ capacite, W, H }) {
  const f32 = () => new Float32Array(capacite);
  const gw = Math.ceil(W / GRILLE), gh = Math.ceil(H / GRILLE);
  const dw = Math.ceil(W / DENSITE), dh = Math.ceil(H / DENSITE);
  return {
    capacite, W, H, n: 0,
    x: f32(), y: f32(), vx: f32(), vy: f32(), rnd: f32(), tirT: f32(), coince: f32(),
    camp: new Uint8Array(capacite), reg: new Uint16Array(capacite), slot: new Uint16Array(capacite),
    mort: new Uint8Array(capacite),
    // la grille de voisinage (tri par comptage)
    gw, gh, cellCount: new Int32Array(gw * gh), cellStart: new Int32Array(gw * gh + 1),
    sorted: new Int32Array(capacite), cellOf: new Int32Array(capacite),
    // la densité par camp
    dw, dh, dens: [new Uint16Array(dw * dh), new Uint16Array(dw * dh)],
  };
}

export function ajouterSoldat(A, x, y, camp, reg, slot, r) {
  if (A.n >= A.capacite) return -1;
  const i = A.n++;
  A.x[i] = x; A.y[i] = y; A.vx[i] = 0; A.vy[i] = 0;
  A.camp[i] = camp; A.reg[i] = reg; A.slot[i] = slot; A.mort[i] = 0;
  A.rnd[i] = r; A.tirT[i] = 1 + r * 4; A.coince[i] = 0;
  return i;
}

export function construireGrille(A) {
  const { n, x, y, gw, gh, cellCount, cellStart, sorted, cellOf, dw, dh, dens, camp } = A;
  cellCount.fill(0); dens[0].fill(0); dens[1].fill(0);
  for (let i = 0; i < n; i++) {
    const cx = Math.min(gw - 1, Math.max(0, (x[i] / GRILLE) | 0));
    const cy = Math.min(gh - 1, Math.max(0, (y[i] / GRILLE) | 0));
    const c = cy * gw + cx;
    cellOf[i] = c; cellCount[c]++;
    const dx = Math.min(dw - 1, (x[i] / DENSITE) | 0), dy = Math.min(dh - 1, (y[i] / DENSITE) | 0);
    dens[camp[i]][dy * dw + dx]++;
  }
  let s = 0;
  for (let c = 0; c < gw * gh; c++) { cellStart[c] = s; s += cellCount[c]; }
  cellStart[gw * gh] = s;
  cellCount.fill(0);
  for (let i = 0; i < n; i++) { const c = cellOf[i]; sorted[cellStart[c] + cellCount[c]++] = i; }
}

/* La place d'un soldat dans la formation de son régiment. o : l'ordre
   { x, y, fx, fy, cols, esp } (fx, fy : le front, vers l'ennemi). */
export function place(o, slot, out) {
  const col = slot % o.cols, row = (slot - col) / o.cols;
  const lx = (col - (o.cols - 1) / 2) * o.esp, ly = row * o.esp;
  out[0] = o.x - o.fy * lx - o.fx * ly;
  out[1] = o.y + o.fx * lx - o.fy * ly;
  return out;
}

const pl = [0, 0];

/* Un pas de la foule. ctx : { T, R, regiments, champDe(reg) → champ | null,
   rng, dt, gel, tuer(i, cause) }. Les morts du pas sont marqués (A.mort) et
   retirés par compacter(). */
export function pasArmee(A, ctx) {
  const { T, R, regiments, champDe, rng, dt, gel, tuer } = ctx;
  const { n, x, y, vx, vy, rnd, camp, reg, slot, mort, gw, gh, cellStart, sorted, cellOf, tirT, coince } = A;
  const F = R.foule, V = R.vitesse;
  const sep = F.separation, sep2 = sep * sep, maxN = F.voisins;
  const W = T.W, H = T.H;
  const champs = new Array(regiments.length);       // calculés à la demande (un régiment arrivé n'en a pas besoin)
  const k = Math.min(1, dt * 5);
  for (let i = 0; i < n; i++) {
    if (mort[i]) continue;
    const xi = x[i], yi = y[i];
    // ─ Voisins : séparation ─
    let sx = 0, sy = 0, seen = 0;
    const c0 = cellOf[i], gcx = c0 % gw, gcy = (c0 - gcx) / gw;
    for (let oy = -1; oy <= 1 && seen < maxN; oy++) {
      const yy = gcy + oy; if (yy < 0 || yy >= gh) continue;
      for (let ox = -1; ox <= 1 && seen < maxN; ox++) {
        const xx = gcx + ox; if (xx < 0 || xx >= gw) continue;
        const c = yy * gw + xx;
        for (let s = cellStart[c], e = cellStart[c + 1]; s < e && seen < maxN; s++) {
          const j = sorted[s]; if (j === i) continue;
          const dx = xi - x[j], dy = yi - y[j], d2 = dx * dx + dy * dy;
          if (d2 > sep2) continue;
          seen++;
          const d = Math.sqrt(d2) || 0.01, f = (sep - d) / sep / d;
          sx += dx * f; sy += dy * f;
        }
      }
    }
    // ─ But : sa place, ou le champ de l'ordre quand elle est loin ─
    const r = regiments[reg[i]], o = r.ordre;
    place(o, slot[i], pl);
    const dx = pl[0] - xi, dy = pl[1] - yi, d = Math.hypot(dx, dy);
    let gx = 0, gy = 0, voulu = 1;
    let ch = null;
    if (d > F.champ) { ch = champs[reg[i]]; if (ch === undefined) ch = champs[reg[i]] = champDe(r); }
    if (ch) {
      const b = ch.dirA(xi, yi);
      if (b) { gx = b[0]; gy = b[1]; } else { gx = dx / d; gy = dy / d; }
    } else if (d > 0.05) {
      gx = dx / d; gy = dy / d;
      voulu = Math.min(1, d / 2.5);           // il ralentit en arrivant
      if (d < 0.3) voulu = 0;
    } else voulu = 0;
    // ─ La case, la marche devant ─
    const ci = xi | 0, cj = yi | 0, cc = cj * W + ci;
    let terrain = vitesseEtat(etat(T, cc, R, gel), R);
    if (voulu > 0) {
      const ai = (xi + gx * 0.7) | 0, aj = (yi + gy * 0.7) | 0;
      if (ai >= 0 && aj >= 0 && ai < W && aj < H && (ai !== ci || aj !== cj)) {
        const dq = hauteurQ(T, aj * W + ai) - hauteurQ(T, cc);
        const adq = dq < 0 ? -dq : dq;
        if (dq >= V.mur) terrain *= coince[i] > 3 ? 0.08 : 0;      // deux mètres : on n'y monte qu'à force
        else if (adq >= 4) terrain *= V.pente2;
        else if (adq >= 2) terrain *= V.pente1;
      }
    }
    const vmax = V.marche * (0.88 + rnd[i] * 0.24) * terrain;
    let wx = gx * voulu * vmax + sx * 1.6, wy = gy * voulu * vmax + sy * 1.6;
    const wl = Math.hypot(wx, wy), lim = Math.max(vmax, 0.4);
    if (wl > lim) { wx *= lim / wl; wy *= lim / wl; }
    vx[i] += (wx - vx[i]) * k; vy[i] += (wy - vy[i]) * k;
    // ─ Déplacement, en glissant le long de ce qu'on ne franchit pas ─
    let nx = xi + vx[i] * dt, ny = yi + vy[i] * dt;
    if (nx < 0.1) nx = 0.1; else if (nx > W - 0.1) nx = W - 0.1;
    if (ny < 0.1) ny = 0.1; else if (ny > H - 0.1) ny = H - 0.1;
    const hi = hauteurQ(T, cc);
    const mur = (px, py) => {
      const c = (py | 0) * W + (px | 0);
      return c !== cc && hauteurQ(T, c) - hi >= V.mur && coince[i] <= 3;
    };
    let bloque = false;
    if (mur(nx, yi)) { nx = xi; vx[i] = 0; bloque = true; }
    if (mur(nx, ny)) { ny = yi; vy[i] = 0; bloque = true; }
    x[i] = nx; y[i] = ny;
    coince[i] = bloque && voulu > 0 ? coince[i] + dt : Math.max(0, coince[i] - dt);
    // ─ Le tir ─
    tirT[i] -= dt;
    if (tirT[i] <= 0) {
      tirT[i] = R.tir.periode * (0.5 + rng());
      tirer(A, i, o, ctx);
    }
  }
}

/* Un tir : le carré le plus dense d'ennemis dans le cône du front, à portée ;
   la chance de toucher croît avec la densité et baisse si la cible est dans
   un creux. La victime est prise dans la grille fine. */
function tirer(A, i, o, ctx) {
  const { R, rng, T, tuer } = ctx;
  const { dw, dh, dens } = A;
  const ennemi = 1 - A.camp[i], de = dens[ennemi];
  const P = R.tir, rB = Math.ceil(P.portee / DENSITE);
  const bx = (A.x[i] / DENSITE) | 0, by = (A.y[i] / DENSITE) | 0;
  const cosC = Math.cos(P.cone);
  let best = -1, bestN = 0;
  for (let oy = -rB; oy <= rB; oy++) {
    const yy = by + oy; if (yy < 0 || yy >= dh) continue;
    for (let ox = -rB; ox <= rB; ox++) {
      const xx = bx + ox; if (xx < 0 || xx >= dw) continue;
      const b = yy * dw + xx, m = de[b];
      if (m <= bestN) continue;
      const ddx = (xx + 0.5) * DENSITE - A.x[i], ddy = (yy + 0.5) * DENSITE - A.y[i], dd = Math.hypot(ddx, ddy) || 1;
      if (dd > P.portee) continue;
      if ((ddx * o.fx + ddy * o.fy) / dd < cosC) continue;
      best = b; bestN = m;
    }
  }
  if (best < 0) return;
  const chance = P.precision * Math.min(1, bestN / P.densite);
  if (rng() >= chance) return;
  // la victime : un ennemi du carré, au hasard
  const xx = best % dw, yy = (best - xx) / dw;
  const k = DENSITE / GRILLE, cand = [];
  for (let fy = yy * k; fy < (yy + 1) * k && fy < A.gh; fy++) {
    for (let fx = xx * k; fx < (xx + 1) * k && fx < A.gw; fx++) {
      const c = fy * A.gw + fx;
      for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) {
        const j = A.sorted[s];
        if (A.camp[j] === ennemi && !A.mort[j]) cand.push(j);
      }
    }
  }
  if (!cand.length) return;
  const v = cand[Math.floor(rng() * cand.length)];
  // à l'abri dans un creux ?
  const cv = (A.y[v] | 0) * T.W + (A.x[v] | 0);
  if (T.diff[cv] <= -2 && rng() >= P.abri) return;
  tuer(v, 'tir');
}

/* Un obus tombe : chaque soldat dans le rayon meurt avec une chance qui baisse
   avec la distance, et encore dans un creux. */
export function tuerDans(A, x0, y0, rayon, ctx) {
  const { R, rng, T, tuer } = ctx;
  if (rayon <= 0) return;
  const g0x = Math.max(0, ((x0 - rayon) / GRILLE) | 0), g1x = Math.min(A.gw - 1, ((x0 + rayon) / GRILLE) | 0);
  const g0y = Math.max(0, ((y0 - rayon) / GRILLE) | 0), g1y = Math.min(A.gh - 1, ((y0 + rayon) / GRILLE) | 0);
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
    const c = gy * A.gw + gx;
    for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) {
      const i = A.sorted[s];
      if (A.mort[i]) continue;
      const d = Math.hypot(A.x[i] - x0, A.y[i] - y0);
      if (d >= rayon) continue;
      let p = 0.7 * (1 - d / rayon) ** 1.5;
      const ci = (A.y[i] | 0) * T.W + (A.x[i] | 0);
      if (T.diff[ci] <= -2) p *= R.obus.abri;
      if (rng() < p) tuer(i, 'obus');
    }
  }
}

// Retire les morts (on garde l'ordre des vivants : la même partie, rejouée, garde les mêmes indices)
export function compacter(A) {
  let w = 0;
  const keys = ['x', 'y', 'vx', 'vy', 'rnd', 'tirT', 'coince', 'camp', 'reg', 'slot'];
  for (let r = 0; r < A.n; r++) {
    if (A.mort[r]) continue;
    if (w !== r) for (const k of keys) A[k][w] = A[k][r];
    A.mort[w] = 0;
    w++;
  }
  const morts = A.n - w;
  A.mort.fill(0, w, A.n);
  A.n = w;
  return morts;
}

// ─── Sauvegarde : les tableaux, exacts (base64 des octets) ───
const CHAMPS = { x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array, rnd: Float32Array, tirT: Float32Array, coince: Float32Array, camp: Uint8Array, reg: Uint16Array, slot: Uint16Array };
function b64(typed) {
  const u8 = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function deB64(s, Type) {
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Type(u8.buffer);
}
export function photoArmee(A) {
  const out = { n: A.n };
  for (const [k] of Object.entries(CHAMPS)) out[k] = b64(A[k].subarray(0, A.n));
  return out;
}
export function restaurerArmee(A, p) {
  A.n = p.n;
  for (const [k, Type] of Object.entries(CHAMPS)) A[k].set(deB64(p[k], Type));
  A.mort.fill(0);
}
export { b64, deB64 };
