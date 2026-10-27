/* Les champs de coûts : comment un régiment rejoint son ordre en contournant
   la boue, l'eau et les marches qu'on ne monte pas.

   - Le terrain est résumé en carrés de BLOC m : un coût de traversée par carré
     (`couts`, un octet ; 0 = infranchissable). Ce résumé fait partie de l'état
     de la bataille (il est sauvegardé) et n'est refait qu'à des pas fixes
     (toutes les `foule.champPeriode` s) : un champ ne dépend donc que de l'état,
     jamais du moment où le cache l'a calculé. La même partie, relue, suit les
     mêmes champs.
   - Un champ = les distances de chaque carré jusqu'au carré visé (algorithme
     de Dial : des files par coût entier), puis une direction par carré.
   - Les champs sont gardés en cache (au plus `foule.champsMax`), par carré visé
     et version des coûts. */
import { hauteurQ, vitesseCase } from './terrain.js?v=0.88.1';

export const BLOC = 4;   // m
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const NORM = DIRS.map(([a, b]) => [a / Math.hypot(a, b), b / Math.hypot(a, b)]);

export function dimensionsCouts(T) { return { bw: Math.ceil(T.W / BLOC), bh: Math.ceil(T.H / BLOC) }; }

// Le résumé du terrain, en place dans `couts` (Uint8Array bw × bh)
export function calculerCouts(T, R, couts, gel = false) {
  const { bw, bh } = dimensionsCouts(T);
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let lent = 0, n = 0, hmin = 1e9, hmax = -1e9, creux = 0, prof = 0, pont = 0;
    for (let j = by * BLOC; j < Math.min(T.H, (by + 1) * BLOC); j++) {
      for (let i = bx * BLOC; i < Math.min(T.W, (bx + 1) * BLOC); i++) {
        const c = j * T.W + i, h = hauteurQ(T, c);
        lent += 1 / vitesseCase(T, c, R, gel); n++; if (T.profond[c]) prof++; else if (T.pont[c]) pont++;
        if (T.troncon && T.troncon[c] !== -1 && T.diff[c] <= -2) creux++;       // une tranchée ou un boyau encore creusés : un abri
        if (!T.profond[c]) { if (h < hmin) hmin = h; if (h > hmax) hmax = h; }       // (le fond d'une eau profonde ne fait pas un mur : une rive ou un tablier au bord de l'eau reste praticable)
      }
    }
    // un carré où l'on descend de plus de deux mètres est un trou dont on ne sort pas
    const relief = hmax - hmin;
    // à l'abri (Jérôme, v0.21.4) : un carré où une tranchée passe coûte moins qu'un carré à découvert, même plus long à suivre ; ses
    // parois ne comptent plus comme du relief (on y descend pour s'y mettre à couvert)
    const abrite = creux / n >= R.foule.abriPart;
    let cout = abrite ? Math.round(10 * lent / n * R.foule.abri) : Math.round(10 * lent / n + (relief >= 4 ? 8 : relief >= 2 ? 3 : 0));
    if (relief >= R.vitesse.mur * 1.5 || (prof * 2 >= n && !pont)) cout = 0;                  // un trou dont on ne sort pas ; de l'eau profonde (la moitié du carré au moins : v0.43.0)
    else if (cout < 1) cout = 1;
    couts[by * bw + bx] = Math.max(0, Math.min(255, cout));
  }
}

export function creerCacheChamps(T, R) {
  const { bw, bh } = dimensionsCouts(T);
  const cache = new Map();
  const dist = new Int32Array(bw * bh);
  let buckets = [];

  function calculer(couts, cible) {
    dist.fill(-1);
    const done = new Uint8Array(bw * bh);
    buckets = [[cible]];
    dist[cible] = 0;
    for (let d = 0; d < buckets.length; d++) {
      const q = buckets[d];
      if (!q) continue;
      for (let k = 0; k < q.length; k++) {
        const c = q[k];
        if (done[c] || dist[c] !== d) continue;
        done[c] = 1;
        const cx = c % bw, cy = (c - cx) / bw;
        for (let m = 0; m < 8; m++) {
          const nx = cx + DIRS[m][0], ny = cy + DIRS[m][1];
          if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
          const nc = ny * bw + nx, w = couts[nc];
          if (!w) continue;
          const nd = d + (m < 4 ? w : Math.round(w * 1.414));
          if (dist[nc] >= 0 && dist[nc] <= nd) continue;
          dist[nc] = nd;
          (buckets[nd] || (buckets[nd] = [])).push(nc);
        }
      }
    }
    // une direction par carré : vers le voisin le plus proche du but
    const dir = new Int8Array(bw * bh).fill(-1);
    for (let c = 0; c < bw * bh; c++) {
      const d = dist[c];
      if (d <= 0) continue;
      const cx = c % bw, cy = (c - cx) / bw;
      let best = -1, bd = d;
      for (let m = 0; m < 8; m++) {
        const nx = cx + DIRS[m][0], ny = cy + DIRS[m][1];
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
        const nd = dist[ny * bw + nx];
        if (nd >= 0 && nd < bd) { bd = nd; best = m; }
      }
      dir[c] = best;
    }
    return dir;
  }

  /* Le champ vers le point (x, y), pour les coûts de version v. */
  function champ(couts, v, x, y) {
    const bx = Math.max(0, Math.min(bw - 1, (x / BLOC) | 0)), by = Math.max(0, Math.min(bh - 1, (y / BLOC) | 0));
    const cible = by * bw + bx, cle = `${cible}:${v}`;
    let ch = cache.get(cle);
    if (ch) { cache.delete(cle); cache.set(cle, ch); return ch; }   // le plus récent à la fin
    const dir = calculer(couts, cible);
    ch = {
      dir,
      // le chemin que suivrait un régiment parti de (px, py) : les centres des carrés, de proche en proche, jusqu'au but (`atteint`) ou le bout du champ (aucun passage)
      chemin(px, py) {
        const pts = [[px, py]];
        let c = Math.max(0, Math.min(bh - 1, (py / BLOC) | 0)) * bw + Math.max(0, Math.min(bw - 1, (px / BLOC) | 0));
        for (let n = 0, borne = 2 * (bw + bh); n < borne; n++) {
          const m = dir[c];
          if (m < 0) break;
          const cx = c % bw + DIRS[m][0], cy = ((c / bw) | 0) + DIRS[m][1];
          c = cy * bw + cx; pts.push([(cx + 0.5) * BLOC, (cy + 0.5) * BLOC]);
        }
        return { pts, atteint: c === cible };
      },
      // la direction à suivre depuis (x, y), ou null (le but, ou aucun chemin)
      dirA(px, py) {
        const m = dir[((py / BLOC) | 0) * bw + ((px / BLOC) | 0)];
        return m >= 0 ? NORM[m] : null;
      },
    };
    cache.set(cle, ch);
    while (cache.size > R.foule.champsMax) cache.delete(cache.keys().next().value);
    return ch;
  }
  return { champ, get taille() { return cache.size; }, vider() { cache.clear(); } };
}
