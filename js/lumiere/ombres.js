// La carte d'ombre (étape 9) : le cadrage. Une projection ORTHOGONALE le long du soleil, sur le rectangle de sol que la caméra voit.
// Logique pure (des matrices de 16 nombres, colonnes d'abord, comme WebGL) : rendu.js dessine dedans, les nuanceurs la relisent par `uLVP`.
// Pourquoi un cadrage sur le SOL vu : un objet qui projette (un homme, un arbre, un char, un avion) et l'endroit où tombe son ombre ont les mêmes coordonnées dans le plan de la lumière ;
// il suffit donc de couvrir ce que l'on voit, plus de la profondeur du côté du soleil pour les hauts objets. Le cadre est stabilisé (étendue en progression géométrique, centre collé aux texels) :
// sans cela l'ombre « nage » à chaque mouvement de la vue, et l'on prend cela pour du clignotement.
import { OMBRES } from './config.js?v=0.115.0';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norme = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Le repère de la lumière : `l` vers le soleil, `r` à droite, `u` en haut (dans le plan de la lumière)
export function reperLumiere(sunDir) {
  const l = norme(sunDir), r = norme(cross([0, 1, 0], l)), u = cross(l, r);
  return { l, r, u };
}

// Où le rayon de l'écran (x, y normalisés) touche le plan y = `plan`, à `maxM` au plus de l'œil ; invVP : l'inverse de la matrice de la caméra
function pointSol(invVP, oeil, nx, ny, plan, maxM) {
  const p = [0, 0, 0, 0], v = [nx, ny, 1, 1];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) p[r] += invVP[k * 4 + r] * v[k];
  const f = [p[0] / p[3], p[1] / p[3], p[2] / p[3]], d = norme([f[0] - oeil[0], f[1] - oeil[1], f[2] - oeil[2]]);
  let t = d[1] < -1e-3 ? (plan - oeil[1]) / d[1] : maxM;
  if (!(t > 0) || t > maxM) t = maxM;
  return [oeil[0] + d[0] * t, plan, oeil[2] + d[2] * t];
}

// Le cadrage d'une image. cam : { oeil, invVP } (camera.js `matrices`) ; sunDir : vers le soleil ; taille : texels par côté ; monde : { largeurM, profondeurM } ;
// sol : { bas, haut } hauteurs extrêmes du terrain (m) ; distanceM : la distance de la caméra à son point visé (jusqu'où l'on cherche le sol).
// Rend { vp, vue, etendue: [w, h], texelM, profondeurM, l, r, u, centre, d0 (le décalage de profondeur) } ou null si le soleil est trop bas ou couché.
export function cadrerOmbre({ cam, sunDir, taille, monde, sol = { bas: 0, haut: 16 }, distanceM = 200, hautCasteurM = OMBRES.hautCasteurM }) {
  if (!(sunDir[1] > Math.sin(OMBRES.soleilMinRad))) return null;
  const { l, r, u } = reperLumiere(sunDir), maxM = Math.min(OMBRES.maxEtendueM, distanceM * 3.2 + 80), marge = 6;
  const pts = [];
  for (const plan of [sol.bas, sol.haut]) for (const [nx, ny] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = pointSol(cam.invVP, cam.oeil, nx, ny, plan, maxM);
    p[0] = Math.max(-marge, Math.min(monde.largeurM + marge, p[0])); p[2] = Math.max(-marge, Math.min(monde.profondeurM + marge, p[2]));      // la carte seulement : au-delà, le faux terrain ne reçoit rien
    pts.push(p);
  }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, s0 = 1e9, s1 = -1e9;
  for (const p of pts) { const a = dot(p, r), b = dot(p, u), s = dot(p, l); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); s0 = Math.min(s0, s); s1 = Math.max(s1, s); }
  // l'étendue en progression géométrique (le cadre ne bouge pas à chaque pixel de la vue), le centre collé aux texels
  const pas = OMBRES.pas, quant = e => Math.pow(pas, Math.ceil(Math.log(Math.max(e, 8)) / Math.log(pas)));
  const w = quant((x1 - x0) * 1.04 + 2), h = quant((y1 - y0) * 1.04 + 2), tw = w / taille, th = h / taille;
  const cx = Math.round((x0 + x1) / 2 / tw) * tw, cy = Math.round((y0 + y1) / 2 / th) * th;
  // la profondeur : du plus haut objet qui peut projeter (le long du rayon de lumière) au plus bas du sol, mesurée vers l'arrière du soleil
  const haut = Math.min(900, hautCasteurM / Math.max(sunDir[1], 0.05)), sMax = s1 + haut, sMin = s0 - 12 - (sol.haut - sol.bas), prof = sMax - sMin;
  const vue = new Float32Array([r[0], u[0], l[0], 0, r[1], u[1], l[1], 0, r[2], u[2], l[2], 0, 0, 0, -sMax, 1]);          // x, y du plan de la lumière ; z = (s − sMax) ≤ 0 : devant l'œil, vers l'arrière du soleil
  // l'orthogonale : x, y dans [−1, 1] sur le cadre, z dans [−1, 1] sur la profondeur
  const P = new Float32Array(16);
  P[0] = 2 / w; P[5] = 2 / h; P[10] = -2 / prof; P[12] = -2 * cx / w; P[13] = -2 * cy / h; P[14] = -1; P[15] = 1;
  const vp = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) { let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + rr] * vue[c * 4 + k]; vp[c * 4 + rr] = s; }
  return { vp, vue, proj: P, etendue: [w, h], texelM: Math.max(tw, th), profondeurM: prof, l, r, u, centre: [cx, cy], taille, sMax };
}

// Où un point du monde tombe dans la carte : { u, v } dans [0, 1] et la profondeur normalisée z dans [0, 1] (0 : le plus près du soleil) ; la même opération que le nuanceur
export function versOmbre(C, p) {
  const m = C.vp, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  return { u: x * 0.5 + 0.5, v: y * 0.5 + 0.5, z: z * 0.5 + 0.5 };
}

// Un rectangle de sol (chunk) touche-t-il la carte ? Ses quatre coins, au sol et à la hauteur `hautM`, projetés ; faux si tous sortent du même côté
export function rectDansOmbre(C, x0, z0, x1, z1, hautM, marge = 0.04) {
  let g = true, d = true, b = true, h = true, n = 0;
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) for (const y of [0, hautM]) {
    const p = versOmbre(C, [x, y, z]); n++;
    if (p.u > -marge) g = false; if (p.u < 1 + marge) d = false; if (p.v > -marge) b = false; if (p.v < 1 + marge) h = false;
  }
  return n > 0 && !(g || d || b || h);
}
