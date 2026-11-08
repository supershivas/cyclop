// La caméra du labo lumière : orbitale, en perspective à angle étroit (30°, comme le jeu), qui ne passe jamais sous le sol. Maths pures (matrices de 16 nombres, colonnes d'abord, comme WebGL).
import { CAMERA } from './config.js?v=0.125.0';

export const mat4 = {
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  perspective(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  lookAt(e, c, up = [0, 1, 0]) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; const xl = Math.hypot(xx, xy, xz); xx /= xl; xy /= xl; xz /= xl;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  },
  inverse(m) {
    const inv = new Float32Array(16), a = m;
    inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    let det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12]; det = 1 / det;
    for (let i = 0; i < 16; i++) inv[i] *= det;
    return inv;
  },
};

export function creerCamera() {
  const P = CAMERA.presets.large;
  return { cible: [128, 0, 80], distance: P.distance, tangage: P.tangage, lacet: P.lacet, fov: CAMERA.fovDeg * Math.PI / 180, aspect: 1.6, sol: () => 0 };
}
// L'œil : sur une sphère autour de la cible ; jamais sous le sol (règle du jeu : `GARDE_SOL`)
export function oeil(C) {
  const c = Math.cos(C.tangage), e = [C.cible[0] + Math.sin(C.lacet) * c * C.distance, C.cible[1] + Math.sin(C.tangage) * C.distance, C.cible[2] + Math.cos(C.lacet) * c * C.distance];
  e[1] = Math.max(e[1], C.sol(e[0], e[2]) + 2);
  return e;
}
export function matrices(C) {
  const e = oeil(C), vue = mat4.lookAt(e, C.cible), proj = mat4.perspective(C.fov, C.aspect, CAMERA.proche, CAMERA.loin), vp = mat4.mul(proj, vue);
  return { oeil: e, vue, proj, vp, invVP: mat4.inverse(vp), invProj: mat4.inverse(proj) };
}
// Le rayon d'un point de l'écran (coordonnées normalisées −1..1) : origine et direction unitaire
export function rayon(C, nx, ny) {
  const m = matrices(C), p = new Float32Array([nx, ny, 1, 1]), w = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) w[r] += m.invVP[k * 4 + r] * p[k];
  const f = [w[0] / w[3], w[1] / w[3], w[2] / w[3]], d = [f[0] - m.oeil[0], f[1] - m.oeil[1], f[2] - m.oeil[2]], l = Math.hypot(...d);
  return { o: m.oeil, d: [d[0] / l, d[1] / l, d[2] / l] };
}
// Où le rayon touche le terrain (mètres) : pas de 0,5 m puis dichotomie. `hauteur(x, z)` en mètres.
export function toucherSol(r, hauteur, maxM = 900) {
  let t = 0, prev = 0;
  for (; t < maxM; t += 0.5) {
    const x = r.o[0] + r.d[0] * t, y = r.o[1] + r.d[1] * t, z = r.o[2] + r.d[2] * t;
    if (y <= hauteur(x, z)) {
      let a = prev, b = t;
      for (let k = 0; k < 14; k++) { const m = (a + b) / 2; (r.o[1] + r.d[1] * m <= hauteur(r.o[0] + r.d[0] * m, r.o[2] + r.d[2] * m)) ? (b = m) : (a = m); }
      return [r.o[0] + r.d[0] * b, 0, r.o[2] + r.d[2] * b];
    }
    prev = t;
  }
  return null;
}
