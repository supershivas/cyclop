// Les particules d'un obus : débris de terre (opaques, retombent au sol), fumée (monte et s'étale), poussière (courte). Logique pure, hasard à graine.
// Un tampon plat que le rendu envoie tel quel au GPU : 6 nombres par particule — x, y, z, taille (m), genre (0 débris, 1 fumée, 2 poussière), opacité.
import { createRng } from '../lib/rng.js?v=0.130.0';
import { ATMOSPHERE } from './config.js?v=0.130.0';

export const GENRE = { DEBRIS: 0, FUMEE: 1, POUSSIERE: 2 };
export function creerParticules(max = 7000, graine = 11) {
  return { max, n: 0, rng: createRng(graine), p: new Float32Array(max * 3), v: new Float32Array(max * 3), vie: new Float32Array(max), vie0: new Float32Array(max), taille: new Float32Array(max), genre: new Uint8Array(max), sortie: new Float32Array(max * 6) };
}
function ajouter(P, x, y, z, vx, vy, vz, vie, taille, genre) {
  const k = P.n < P.max ? P.n++ : Math.floor(P.rng() * P.max);        // plein : on écrase une au hasard
  P.p[3 * k] = x; P.p[3 * k + 1] = y; P.p[3 * k + 2] = z; P.v[3 * k] = vx; P.v[3 * k + 1] = vy; P.v[3 * k + 2] = vz;
  P.vie[k] = P.vie0[k] = vie; P.taille[k] = taille; P.genre[k] = genre;
}
// Un obus tombé en (x, z) à la hauteur y : `nbDebris` débris, de la fumée et de la poussière (seulement si `atmosphere` : étape 5)
export function explosion(P, x, y, z, { nbDebris = 40, atmosphere = true } = {}) {
  const r = P.rng;
  for (let k = 0; k < nbDebris; k++) { const a = r() * 6.283, v = 3 + r() * 9; ajouter(P, x, y + 0.4, z, Math.cos(a) * v * 0.55, 6 + r() * 11, Math.sin(a) * v * 0.55, 3 + r() * 2, 0.22 + r() * 0.3, GENRE.DEBRIS); }
  if (!atmosphere) return;
  const [d0, d1] = ATMOSPHERE.fumee.duree, [s0, s1] = ATMOSPHERE.fumee.taille;
  for (let k = 0; k < 14; k++) { const a = r() * 6.283, v = 0.4 + r() * 2.2; ajouter(P, x + (r() - 0.5) * 2, y + 0.5 + r() * 2, z + (r() - 0.5) * 2, Math.cos(a) * v, 1.1 + r() * 2.2, Math.sin(a) * v, d0 + r() * (d1 - d0), s0 + r() * (s1 - s0), GENRE.FUMEE); }
  for (let k = 0; k < 26; k++) { const a = r() * 6.283, v = 2 + r() * 6; ajouter(P, x, y + 0.6, z, Math.cos(a) * v, 0.6 + r() * 2.5, Math.sin(a) * v, 1.4 + r() * 1.6, 1.6 + r() * 2.4, GENRE.POUSSIERE); }
}
export function avancer(P, dt, hauteur, vent = [1.2, 0]) {
  const { p, v, vie, genre } = P;
  for (let k = 0; k < P.n; k++) {
    if (vie[k] <= 0) continue;
    vie[k] -= dt;
    if (genre[k] === GENRE.DEBRIS) {
      v[3 * k + 1] -= 18 * dt; p[3 * k] += v[3 * k] * dt; p[3 * k + 1] += v[3 * k + 1] * dt; p[3 * k + 2] += v[3 * k + 2] * dt;
      const h = hauteur(p[3 * k], p[3 * k + 2]); if (p[3 * k + 1] < h) { p[3 * k + 1] = h; v[3 * k] = v[3 * k + 1] = v[3 * k + 2] = 0; }
    } else {
      const f = Math.exp(-dt * (genre[k] === GENRE.FUMEE ? 0.5 : 1.3));
      v[3 * k] = v[3 * k] * f + vent[0] * dt * 0.4; v[3 * k + 1] *= f; v[3 * k + 2] = v[3 * k + 2] * f + vent[1] * dt * 0.4;
      p[3 * k] += v[3 * k] * dt; p[3 * k + 1] += v[3 * k + 1] * dt; p[3 * k + 2] += v[3 * k + 2] * dt;
    }
  }
}
// Le tampon à envoyer au GPU : les débris d'abord (opaques), puis la fumée et la poussière (transparentes). Rend { n, nd } : le total et le nombre de débris.
export function ecrire(P) {
  let n = 0; const o = P.sortie;
  const poser = k => {
    const u = P.vie[k] / P.vie0[k], g = P.genre[k];
    const taille = g === GENRE.DEBRIS ? P.taille[k] : P.taille[k] * (1.6 - 0.6 * u);                 // la fumée et la poussière s'étalent
    const alpha = g === GENRE.DEBRIS ? 1 : g === GENRE.FUMEE ? 0.5 * Math.min(1, u * 3) * Math.min(1, (1 - u) * 6 + 0.35) : 0.5 * u;
    o[n * 6] = P.p[3 * k]; o[n * 6 + 1] = P.p[3 * k + 1]; o[n * 6 + 2] = P.p[3 * k + 2]; o[n * 6 + 3] = taille; o[n * 6 + 4] = g; o[n * 6 + 5] = alpha; n++;
  };
  for (let k = 0; k < P.n; k++) if (P.vie[k] > 0 && P.genre[k] === GENRE.DEBRIS) poser(k);
  const nd = n;
  for (let k = 0; k < P.n; k++) if (P.vie[k] > 0 && P.genre[k] !== GENRE.DEBRIS) poser(k);
  return { n, nd };
}
