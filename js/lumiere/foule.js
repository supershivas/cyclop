// La foule : des milliers de soldats de quelques pixels, un simple va-et-vient (marche au hasard + vagues d'assaut), aucun gameplay.
// Logique pure et déterministe (un xorshift par soldat, semé par la graine) ; le coût ne dépend que du nombre de soldats, jamais de la lumière :
// la hauteur du sol sous chacun est lue par le nuanceur dans la texture des hauteurs, pas ici.
import { MONDE } from './config.js?v=0.116.0';

export function creerFoule(M, max = MONDE.foule.max, graine = MONDE.graine) {
  const F = {
    max, n: 0, t: 0, largeurM: M.largeurM, profondeurM: M.profondeurM,
    x: new Float32Array(max), z: new Float32Array(max),
    x0: new Float32Array(max), z0: new Float32Array(max), zc: new Float32Array(max),      // départ (leur tranchée) et but (le no man's land)
    camp: new Uint8Array(max), rang: new Uint8Array(max), graine: new Uint32Array(max),
    xy: new Float32Array(max * 2),                                                        // x, z entrelacés, tels que le tampon du GPU les lit
  };
  const nous = M.lignes.filter(l => l.camp === 0), eux = M.lignes.filter(l => l.camp === 1);
  let s = (graine * 2654435761) >>> 0 || 1;
  const alea = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < max; i++) {
    const camp = i & 1, lignes = camp ? eux : nous;
    const L = lignes[Math.min(lignes.length - 1, Math.floor(alea() ** 1.6 * lignes.length))];
    const x = 3 + alea() * (M.largeurM - 6), z = L.zAt(x) + (alea() - 0.5) * 1.4;
    F.camp[i] = camp; F.rang[i] = L.niveau; F.x0[i] = F.x[i] = x; F.z0[i] = F.z[i] = z;
    F.zc[i] = M.profondeurM * (camp ? 0.5 - 0.06 - alea() * 0.1 : 0.5 + 0.06 + alea() * 0.1);   // jusqu'au milieu du no man's land
    F.graine[i] = (alea() * 4294967295) >>> 0 || 1;
  }
  F.n = Math.min(max, MONDE.foule.defaut);
  return F;
}

export function regler(F, n) { F.n = Math.max(0, Math.min(F.max, n | 0)); }

// Une vague : tout le monde part de sa tranchée, avance vers le milieu, revient ; les lignes de l'arrière partent un peu après.
const vague = u => (u <= 0 || u >= 1) ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * 2 * u);
export function avancer(F, dt) {
  F.t += dt;
  const V = MONDE.foule.vague, n = F.n, x = F.x, z = F.z, xy = F.xy, g = F.graine, jit = 0.8 * dt, W = F.largeurM, H = F.profondeurM;
  for (let i = 0; i < n; i++) {
    let s = g[i];
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const a = s / 4294967296;
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    g[i] = s;
    const b = s / 4294967296;
    // la phase de ce camp : les deux camps ne partent pas ensemble
    const u = ((F.t + (F.camp[i] ? V.periodeS / 2 : 0) - F.rang[i] * V.retardParRangS) % V.periodeS) / V.avanceS;
    const cx = F.x0[i], cz = F.z0[i] + (F.zc[i] - F.z0[i]) * (u > 0 && u < 1 ? vague(u) : 0);
    // le soldat suit sa cible en tremblant (marche au hasard)
    x[i] += (cx - x[i]) * Math.min(1, 2 * dt) + (a - 0.5) * jit * 4;
    z[i] += (cz - z[i]) * Math.min(1, 2 * dt) + (b - 0.5) * jit * 4;
    if (x[i] < 1) x[i] = 1; else if (x[i] > W - 1) x[i] = W - 1;
    if (z[i] < 1) z[i] = 1; else if (z[i] > H - 1) z[i] = H - 1;
    xy[2 * i] = x[i]; xy[2 * i + 1] = z[i];
  }
}

// Les `n` soldats les plus proches d'un point (mètres) : ceux que l'on dessine avec le vrai modèle du jeu. Rend le nombre trouvé et remplit `sortie` (des indices, du plus proche au plus loin).
// Un rayon qui double jusqu'à trouver assez d'hommes, puis un tri des seuls candidats : le coût suit le nombre de soldats une fois (un passage), jamais le tri de toute la foule.
export function plusProches(F, cx, cz, n, sortie, d2 = new Float32Array(F.max)) {
  let R2 = 30 * 30, trouves = 0;
  for (;;) {
    trouves = 0;
    for (let i = 0; i < F.n; i++) { const dx = F.x[i] - cx, dz = F.z[i] - cz, d = dx * dx + dz * dz; if (d < R2 && trouves < sortie.length) { sortie[trouves++] = i; d2[i] = d; } }
    if (trouves >= n || R2 > 1e7) break;
    R2 *= 4;
  }
  const liste = Array.from(sortie.subarray(0, trouves)).sort((a, b) => d2[a] - d2[b] || a - b).slice(0, n);
  sortie.set(liste); return liste.length;
}
