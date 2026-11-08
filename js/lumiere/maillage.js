// Le maillage d'un chunk : des colonnes de hauteur en cubes (un dessus, des flancs là où le voisin est plus bas) et, au-dessus des abris, un toit d'un cube.
// Logique pure (des tableaux de nombres) : rendu.js les téléverse tels quels. Un sommet = 8 nombres : x, y, z (mètres), ao, variation, normale (0..5), matière, « dessous » (1 sous un toit).
// L'AO des arêtes (étape 2) est cuite ici, façon Minecraft : un sommet sombrit selon les trois colonnes qui le touchent. `opts.ao` faux : tout vaut 1.
import { MONDE } from './config.js?v=0.129.0';
import { MAT } from './terrain.js?v=0.129.0';

export const FLOATS = 8;
const hache = (i, j) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;

function tampon(cap) { return { v: new Float32Array(cap * FLOATS), x: new Uint32Array(cap * 1.5 | 0), nv: 0, nx: 0 }; }
export function creerTampons(M) { const cols = M.chunk * M.chunk, cap = cols * 28; return { sol: tampon(cap), toit: tampon(cols * 24) }; }

function quad(T, a, b, c, d, nIdx, mat, under, aos, vr) {   // quatre sommets [x,y,z] dans l'ordre du pourtour
  const base = T.nv, v = T.v; let o = base * FLOATS;
  for (let k = 0; k < 4; k++) { const p = k === 0 ? a : k === 1 ? b : k === 2 ? c : d; v[o++] = p[0]; v[o++] = p[1]; v[o++] = p[2]; v[o++] = aos[k]; v[o++] = vr; v[o++] = nIdx; v[o++] = mat; v[o++] = under; }
  T.nv += 4;
  const flip = aos[0] + aos[2] < aos[1] + aos[3], x = T.x; let q = T.nx;
  if (flip) { x[q++] = base + 1; x[q++] = base + 2; x[q++] = base + 3; x[q++] = base + 3; x[q++] = base; x[q++] = base + 1; }
  else { x[q++] = base; x[q++] = base + 1; x[q++] = base + 2; x[q++] = base + 2; x[q++] = base + 3; x[q++] = base; }
  T.nx = q;
}

// Les normales : 0 haut, 1 bas, 2 +x, 3 −x, 4 +z, 5 −z
export function construireChunk(M, cx, cy, { ao = true } = {}, B = creerTampons(M)) {
  const { W, H, chunk, cell, top, sol, toit, veg, mat } = M, mq = cell / MONDE.quartsParCube;
  const i0 = cx * chunk, j0 = cy * chunk, i1 = Math.min(W, i0 + chunk), j1 = Math.min(H, j0 + chunk);
  B.sol.nv = B.sol.nx = B.toit.nv = B.toit.nx = 0;
  const T = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? -1 : top[j * W + i];
  const tq = (i, j, ref) => { const t = T(i, j); return t < 0 ? ref : t; };       // hors carte : comme la colonne (pas de mur)
  const occ = (n, ref) => clamp01((n - ref) / (8 * M.cpm));
  const coin = (i, j, sx, sz, ref) => {                                           // l'AO du sommet (i + (sx>0), j + (sz>0)) du dessus de (i, j)
    if (!ao) return 1;
    const oa = occ(tq(i + sx, j, ref), ref), ob = occ(tq(i, j + sz, ref), ref), od = occ(tq(i + sx, j + sz, ref), ref);
    const v = oa + ob + (oa > 0.01 && ob > 0.01 ? Math.max(oa, ob) : od);
    return 1 - 0.28 * Math.min(v, 2.2);
  };
  const fond = ao ? 0.6 : 1;
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const idx = j * W + i, tt = top[idx], r = toit[idx], vr = hache(i, j);
    const x0 = i * cell, x1 = x0 + cell, z0 = j * cell, z1 = z0 + cell;
    const sg = r ? sol[idx] : tt;                                                // la surface du sol (sous le toit, le plancher de l'abri)
    const topMat = r ? MAT.TOIT : veg[idx] ? (veg[idx] >= 12 * M.cpm ? MAT.TRONC : MAT.BUISSON) : mat[idx];
    // le dessus : visible (toit, sol, végétation) — le plancher d'un abri est dessous
    const ys = tt * mq;
    quad(B.sol, [x0, ys, z0], [x1, ys, z0], [x1, ys, z1], [x0, ys, z1], 0, r ? MAT.TOIT : topMat, 0, [coin(i, j, -1, -1, tt), coin(i, j, 1, -1, tt), coin(i, j, 1, 1, tt), coin(i, j, -1, 1, tt)], vr);
    if (r) {                                                                       // le toit va dans le maillage du sol à l'origine ; on le déplace dans celui du toit
      B.sol.nv -= 4; B.sol.nx -= 6;
      const yb = (r - M.roofQ) * mq, yt = r * mq, yf = sol[idx] * mq;
      quad(B.toit, [x0, yt, z0], [x1, yt, z0], [x1, yt, z1], [x0, yt, z1], 0, MAT.TOIT, 0, [coin(i, j, -1, -1, r), coin(i, j, 1, -1, r), coin(i, j, 1, 1, r), coin(i, j, -1, 1, r)], vr);
      quad(B.toit, [x0, yb, z1], [x1, yb, z1], [x1, yb, z0], [x0, yb, z0], 1, MAT.TOIT, 1, [0.55, 0.55, 0.55, 0.55], vr);
      quad(B.sol, [x0, yf, z0], [x1, yf, z0], [x1, yf, z1], [x0, yf, z1], 0, mat[idx], 1, [0.8, 0.8, 0.8, 0.8], vr);
    }
    // les flancs : de ce côté, la colonne est plus haute que sa voisine
    for (let d = 0; d < 4; d++) {
      const ni = i + (d === 0 ? 1 : d === 1 ? -1 : 0), nj = j + (d === 2 ? 1 : d === 3 ? -1 : 0);
      const dehors = ni < 0 || nj < 0 || ni >= W || nj >= H;          // au bord de la carte : un flanc jusqu'au faux terrain qui l'entoure
      const nidx = dehors ? 0 : nj * W + ni, nRoof = dehors ? 0 : toit[nidx], nSol = dehors ? M.bordQ : nRoof ? sol[nidx] : top[nidx];
      const sousToit = (r || nRoof) ? 1 : 0;
      // le mur de terre : du sol voisin au sol de cette colonne
      if (sg > nSol) {
        const ya = nSol * mq, yb = sg * mq, nn = d === 0 ? 2 : d === 1 ? 3 : d === 2 ? 4 : 5;
        const m2 = r ? mat[idx] : veg[idx] ? (veg[idx] >= 12 * M.cpm ? MAT.TRONC : MAT.BUISSON) : mat[idx];
        const hb = fond + (1 - fond) * clamp01((sg - nSol) / 8) * 0, top1 = 1;
        let a, b, c, e;
        if (d === 0) { a = [x1, ya, z1]; b = [x1, ya, z0]; c = [x1, yb, z0]; e = [x1, yb, z1]; }
        else if (d === 1) { a = [x0, ya, z0]; b = [x0, ya, z1]; c = [x0, yb, z1]; e = [x0, yb, z0]; }
        else if (d === 2) { a = [x0, ya, z1]; b = [x1, ya, z1]; c = [x1, yb, z1]; e = [x0, yb, z1]; }
        else { a = [x1, ya, z0]; b = [x0, ya, z0]; c = [x0, yb, z0]; e = [x1, yb, z0]; }
        quad(B.sol, a, b, c, e, nn, m2, sousToit, [hb, hb, top1, top1], vr);
      }
      // le flanc d'un toit : visible là où la voisine est plus basse que lui
      if (r && !dehors && nRoof !== r) {
        const nt = top[nidx];
        if (nt < r) {
          const ya = Math.max(r - M.roofQ, nt) * mq, yb = r * mq, nn = d === 0 ? 2 : d === 1 ? 3 : d === 2 ? 4 : 5;
          let a, b, c, e;
          if (d === 0) { a = [x1, ya, z1]; b = [x1, ya, z0]; c = [x1, yb, z0]; e = [x1, yb, z1]; }
          else if (d === 1) { a = [x0, ya, z0]; b = [x0, ya, z1]; c = [x0, yb, z1]; e = [x0, yb, z0]; }
          else if (d === 2) { a = [x0, ya, z1]; b = [x1, ya, z1]; c = [x1, yb, z1]; e = [x0, yb, z1]; }
          else { a = [x1, ya, z0]; b = [x0, ya, z0]; c = [x0, yb, z0]; e = [x1, yb, z0]; }
          quad(B.toit, a, b, c, e, nn, MAT.TOIT, 0, [0.8, 0.8, 1, 1], vr);
        }
      }
    }
  }
  return B;
}
