// Les eaux profondes d'un secteur (v0.43.0, l'atelier) : un lac (`{ o: 'lac', x, y, r }`, un disque) et un fleuve (`{ o: 'fleuve', x, y, x2, y2, r }`, un trait de demi-largeur r),
// mêmes coordonnées que `formes.js` (mètres du SECTEUR). Logique pure, sans hasard. Une eau est creusée d'un coup à plat (au niveau de sa rive la plus basse moins un mètre, au mètre près : le sol se
// dessine en marches d'un mètre) et marquée `profond` : on n'y passe pas (les champs de coûts la contournent, un homme qui s'y trouve la quitte à peine), sauf sur un pont (`ponts` : v0.44.0).
// Un fleuve suit le terrain : son niveau est celui de la rive la plus basse sur ±15 m de son cours, pas un niveau pour tout le cours.
import { distanceForme, extremite } from './formes.js?v=0.46.0';

export const EAUX = ['lac', 'fleuve'];
export const PONT_AU_MOINS = 4;          // quarts : le tablier est à 1 m au moins au-dessus de l'eau
const PAS_NIVEAU = 5, VOISINS = 3;       // m : un niveau par tranche de 5 m de cours ; on regarde 3 tranches de chaque côté

export function poserEaux(base, profond, { W, H, ox, oy }, objets) {
  for (const O of objets || []) {
    if (!EAUX.includes(O.o) || !(O.r > 0)) continue;
    const F = O.o === 'lac' ? { x: O.x, y: O.y } : { x: O.x, y: O.y, x2: O.x2, y2: O.y2 }, [x2, y2] = extremite(F), r = O.r;
    const long = Math.hypot(x2 - F.x, y2 - F.y);
    const i0 = Math.max(0, Math.floor(Math.min(F.x, x2) + ox - r)), i1 = Math.min(W - 1, Math.ceil(Math.max(F.x, x2) + ox + r));
    const j0 = Math.max(0, Math.floor(Math.min(F.y, y2) + oy - r)), j1 = Math.min(H - 1, Math.ceil(Math.max(F.y, y2) + oy + r));
    const cases = [], tranches = Math.floor(long / PAS_NIVEAU) + 1, bas = new Array(tranches).fill(Infinity);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = i + 0.5 - ox, py = j + 0.5 - oy;
      if (distanceForme(F, px, py) >= r) continue;
      const c = j * W + i, s = long ? Math.max(0, Math.min(long, ((px - F.x) * (x2 - F.x) + (py - F.y) * (y2 - F.y)) / long)) : 0, t = Math.min(tranches - 1, Math.floor(s / PAS_NIVEAU));
      cases.push([c, t]); if (base[c] < bas[t]) bas[t] = base[c];
    }
    const niveau = bas.map((_, t) => { let m = Infinity; for (let k = Math.max(0, t - VOISINS); k <= Math.min(tranches - 1, t + VOISINS); k++) m = Math.min(m, bas[k]); return (Math.floor(m / 4) - 1) * 4; });
    for (const [c, t] of cases) { base[c] = niveau[t]; profond[c] = 1; }
  }
}
// Ce que touche l'eau : retirer arbres et buissons dans l'eau
export function viderLesEaux(liste, profond, W) { for (let k = liste.length - 1; k >= 0; k--) if (profond[liste[k].j * W + liste[k].i]) liste.splice(k, 1); }

/* Les ponts (v0.44.0) : `{ o: 'pont', x, y, x2, y2, r }`, un tablier de demi-largeur r le long du trait, posé sur l'eau profonde seulement (ailleurs, rien ne change). Chaque case d'eau du tablier cesse
   d'être profonde et monte, de la hauteur de la rive du premier bout à celle du second (au moins 1 m au-dessus de l'eau) ; `pont` la marque (la couleur, le sec), `ponts` garde le niveau de l'eau dessous
   pour que le pont puisse tomber (`detruirePont`, appelé par les obus). Passent après tous les lacs et fleuves, quel que soit leur ordre dans la liste. */
export function poserPonts(base, profond, pont, ponts, { W, H, ox, oy }, objets) {
  for (const O of objets || []) {
    if (O.o !== 'pont' || !(O.r > 0)) continue;
    const F = { x: O.x, y: O.y, x2: O.x2, y2: O.y2 }, [x2, y2] = extremite(F), r = O.r, long = Math.hypot(x2 - F.x, y2 - F.y);
    const haut = (px, py) => { const i = Math.max(0, Math.min(W - 1, Math.round(px + ox - 0.5))), j = Math.max(0, Math.min(H - 1, Math.round(py + oy - 0.5))), c = j * W + i; return profond[c] ? base[c] + PONT_AU_MOINS : base[c]; };
    const hA = haut(F.x, F.y), hB = haut(x2, y2);
    const i0 = Math.max(0, Math.floor(Math.min(F.x, x2) + ox - r)), i1 = Math.min(W - 1, Math.ceil(Math.max(F.x, x2) + ox + r));
    const j0 = Math.max(0, Math.floor(Math.min(F.y, y2) + oy - r)), j1 = Math.min(H - 1, Math.ceil(Math.max(F.y, y2) + oy + r));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = j * W + i, px = i + 0.5 - ox, py = j + 0.5 - oy;
      if (!profond[c] || distanceForme(F, px, py) >= r) continue;
      const u = long ? Math.max(0, Math.min(1, ((px - F.x) * (x2 - F.x) + (py - F.y) * (y2 - F.y)) / (long * long))) : 0;
      ponts.set(c, base[c]);
      base[c] = Math.max(base[c] + PONT_AU_MOINS, Math.round(hA + (hB - hA) * u));
      profond[c] = 0; pont[c] = 1;
    }
  }
}
// Un obus tombé sur le tablier le coupe : les cases du pont à moins de `rayon` cases (en carré) du point de chute tombent à l'eau
export function detruirePont(T, i0, j0, rayon) {
  if (!T.ponts.size) return false;
  let tombe = false;
  for (let j = Math.max(0, j0 - rayon); j <= Math.min(T.H - 1, j0 + rayon); j++) for (let i = Math.max(0, i0 - rayon); i <= Math.min(T.W - 1, i0 + rayon); i++) {
    const c = j * T.W + i;
    if (!T.pont[c]) continue;
    T.base[c] = T.ponts.get(c); T.diff[c] = 0; T.profond[c] = 1; T.pont[c] = 0; T.ponts.delete(c); tombe = true;
  }
  return tombe;
}
