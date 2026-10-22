/* La forme d'un cratère, variantes du labo (v0.52.4). Logique pure : aucun DOM,
   aucune horloge, aucun hasard hors de `hash2` et du numéro `n` de l'impact.
   `impact()` de terrain.js l'appelle avec `FORME_JEU` (v0.52.5) ; `null` donne
   l'ancien motif carré du calibre.

   Une forme = des drapeaux : `rond` (un disque au lieu de la matrice, pris au
   point exact de l'obus), `ovale` (le disque étiré et tourné, même aire),
   `levre` (la terre jetée plus large, plus épaisse d'un côté, sans coin) et
   `eclats` (de petits creux et monticules autour). Même logique de jeu :
   mêmes profondeur au centre (donc `plancher` et dureté, appliqués par
   `impact`), à peu près le même volume creusé, mêmes `rayon` et `letal`. */
import { hash2 } from './lib/rng.js?v=0.59.0';
import { CALIBRES } from './data/calibres.js?v=0.59.0';

export const FORMES = {
  actuel: null,
  rond: { rond: true },
  levre: { levre: true },
  eclats: { eclats: true },
  ovale: { rond: true, ovale: true },
  tout: { rond: true, levre: true, eclats: true },
};

// la forme du jeu (Jérôme, v0.52.5 : « rond, lèvre jetée et éclats ») ; `null` reste l'ancien motif carré, pour le labo et les tests
export const FORME_JEU = FORMES.tout;

const ETIRE = 1.25;                         // l'ovale : grand axe = rayon × 1,25, petit = rayon / 1,25 (même aire)
const AMPLITUDE = [0.9, 1];                 // la profondeur d'un impact varie un peu avec n, sans jamais dépasser le motif

const volume = m => m.reduce((s, l) => s + l.reduce((a, v) => a + v, 0), 0);
const profondeur = m => Math.max(...m.map(l => Math.max(...l)));

// profondeur (quarts) au centre du disque, rayon (m) du bord : le rayon qui rend, une fois arrondi case par case,
// le volume de la matrice du calibre (cherché une fois, par dichotomie sur une grille centrée)
const profils = {};
function profil(nom, ovale) {
  const cle = nom + (ovale ? 'o' : '');
  if (profils[cle]) return profils[cle];
  const m = CALIBRES[nom].motif, V = volume(m) / ((AMPLITUDE[0] + AMPLITUDE[1]) / 2), p0 = profondeur(m);   // (le volume de la matrice, avant l'amplitude moyenne)
  const e = ovale ? ETIRE : 1;
  const somme = Rd => {
    let s = 0;
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) s += Math.round(p0 * Math.max(0, 1 - ((i / (Rd * e)) ** 2 + (j / (Rd / e)) ** 2)));
    return s;
  };
  let lo = 0.5, hi = 8;
  for (let k = 0; k < 24; k++) { const mi = (lo + hi) / 2; if (somme(mi) < V) lo = mi; else hi = mi; }
  return (profils[cle] = { p0, Rd: (lo + hi) / 2, demi: Math.ceil((lo + hi) / 2 * e + 0.5) });
}

/* Le creux d'un obus rond ou ovale tombé en (x, y) : { r, u } avec u[(dj + r) · (2r + 1) + di + r] = quarts à creuser
   sur la case (i0 + di, j0 + dj), échantillonnée en quatre points (le demi-mètre) pour que le bord du disque ne soit
   pas en marches d'un mètre. */
const creux = { r: 0, u: new Int8Array(17 * 17) };
export function creuxRond(nom, x, y, n, ovale) {
  const { p0, Rd, demi } = profil(nom, ovale);
  const g = AMPLITUDE[0] + (AMPLITUDE[1] - AMPLITUDE[0]) * hash2(n, 7, 41);
  const A = ovale ? Rd * ETIRE : Rd, B = ovale ? Rd / ETIRE : Rd;
  const ang = ovale ? hash2(n, 8, 43) * Math.PI : 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const i0 = Math.floor(x), j0 = Math.floor(y), L = 2 * demi + 1;
  creux.r = demi;
  for (let dj = -demi; dj <= demi; dj++) for (let di = -demi; di <= demi; di++) {
    let s = 0;
    for (let q = 0; q < 4; q++) {
      const px = i0 + di + 0.25 + (q & 1) * 0.5 - x, py = j0 + dj + 0.25 + (q >> 1) * 0.5 - y;
      const a = px * ca + py * sa, b = -px * sa + py * ca;
      s += Math.max(0, 1 - (a / A) ** 2 - (b / B) ** 2);
    }
    creux.u[(dj + demi) * L + di + demi] = Math.round(p0 * g * s / 4);
  }
  return creux;
}

/* La terre jetée : le volume de la lèvre carrée d'avant (levre quarts sur les trois quarts des 8 · (r + 1) − 4 cases
   de l'anneau), répartie en anneau rond autour du bord (de 0 à 2,2 m), plus épaisse du côté choisi par n
   (0,35 à 1 selon l'angle ; `cote0` faux : le même partout), avec des interruptions, sans coin. `rim` : le rayon moyen du creux (m), `etire` et `ang`
   la forme du bord. Chaque case reçoit sa part arrondie par un hachage : le total reste le même en moyenne. */
export function levreJetee(T, x, y, nom, levre, rim, etire, ang, n, R, toucher, cote0 = true) {
  const cal = CALIBRES[nom], r = (cal.motif.length - 1) / 2;
  const volumeAvant = levre * 0.75 * (8 * (r + 1) - 4);
  const lim = Math.ceil(rim * etire + 3), i0 = Math.floor(x), j0 = Math.floor(y);
  const cote = hash2(n, 3, 53) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
  const poids = [];
  let total = 0;
  for (let dj = -lim; dj <= lim; dj++) for (let di = -lim; di <= lim; di++) {
    const i = i0 + di, j = j0 + dj;
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) continue;
    const px = i + 0.5 - x, py = j + 0.5 - y;
    const a = px * ca + py * sa, b = -px * sa + py * ca;
    const rho = Math.sqrt((a / (rim * etire)) ** 2 + (b / (rim / etire)) ** 2);
    const dm = (rho - 1) * rim;                      // m au-delà du bord
    if (dm < -0.3 || dm > 2.2) continue;
    if (hash2(i * 7 + n, j, 31) < 0.3) continue;     // des interruptions
    const w = Math.exp(-(((dm - 0.7) / 0.8) ** 2)) * (cote0 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(Math.atan2(py, px) - cote)) : 1);
    poids.push(i, j, w); total += w;
  }
  if (!total) return;
  for (let k = 0; k < poids.length; k += 3) {
    const i = poids[k], j = poids[k + 1], c = j * T.W + i;
    const q = Math.floor(volumeAvant * poids[k + 2] / total + hash2(i + n * 3, j, 57));
    if (!q) continue;
    T.diff[c] = Math.min(R.terrain.levreMax, T.diff[c] + q);
    toucher(T, i, j);
  }
}

/* Des éclats : de petits creux (−1 quart) et monticules (+1 quart) sur deux à trois anneaux autour de la lèvre, en nombre
   croissant avec le calibre (`eclats` de data/calibres.js). */
export function eclatsAutour(T, x, y, nom, rim, n, R, toucher) {
  const nb = CALIBRES[nom].eclats ?? 0, P = R.terrain.plancher;
  for (let k = 0; k < nb; k++) {
    const a = hash2(n, k, 61) * Math.PI * 2, d = rim + 1.8 + hash2(n, k + 40, 61) * 2.2;
    const i = Math.floor(x + Math.cos(a) * d), j = Math.floor(y + Math.sin(a) * d);
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) continue;
    const c = j * T.W + i;
    if (hash2(n, k + 80, 61) < 0.5) { if (-T.diff[c] < P) T.diff[c]--; else continue; }
    else T.diff[c] = Math.min(R.terrain.levreMax, T.diff[c] + 1);
    toucher(T, i, j);
  }
}

// le rayon moyen du creux (m) et sa forme : pour la lèvre et les éclats
export function bordDuCreux(nom, forme, n) {
  if (!forme.rond) return { rim: CALIBRES[nom].motif.length / 2, etire: 1, ang: 0 };
  const { Rd } = profil(nom, forme.ovale);
  return { rim: Rd, etire: forme.ovale ? ETIRE : 1, ang: forme.ovale ? hash2(n, 8, 43) * Math.PI : 0 };
}
