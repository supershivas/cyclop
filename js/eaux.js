// Les eaux profondes d'un secteur (v0.43.0, l'atelier) : un lac (`{ o: 'lac', x, y, r }`, un disque) et un fleuve (`{ o: 'fleuve', x, y, x2, y2, r }`, un trait de demi-largeur r),
// mêmes coordonnées que `formes.js` (mètres du SECTEUR). Logique pure, sans hasard. Une eau est creusée d'un coup à plat (au niveau de sa rive la plus basse moins un mètre, au mètre près : le sol se
// dessine en marches d'un mètre) et marquée `profond` : on n'y passe pas (les champs de coûts la contournent, un homme qui s'y trouve la quitte à peine), sauf sur un pont (`ponts` : v0.44.0).
// Un fleuve suit le terrain : son niveau est celui de la rive la plus basse sur ±15 m de son cours, pas un niveau pour tout le cours.
import { distanceForme, extremite } from './formes.js?v=0.48.1';

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

/* Les ponts (v0.44.0 ; v0.47.2 : des ouvrages au-dessus de l'eau) : `{ o: 'pont', x, y, x2, y2, r, type }`, un tablier de demi-largeur r le long du trait, posé sur l'eau profonde seulement (ailleurs, rien ne change) ;
   `type` : un des ponts de `data/ponts.js` (`planches` par défaut). Le sol ne change PAS (l'eau passe dessous : la case reste au niveau de l'eau, dessinée en eau) ; chaque case sous le tablier, d'eau ou de rive,
   est marquée `pont` (le numéro de l'ouvrage + 1) avec sa hauteur de tablier `pontH` (en quarts : la rive la plus haute des deux bouts, au moins 1 m au-dessus de l'eau) : `hauteurQ` la lit, donc on y marche
   à plat, l'eau n'est plus profonde (`profond` = 0) et les champs de coûts y passent. `pontEau` dit quelles cases étaient de l'eau. `T.pontsListe` garde chaque ouvrage (son dessin le lit) ; un obus le coupe
   en entier (`detruirePont`) : ses cases d'eau redeviennent profondes, l'ouvrage est `detruit`. Passent après tous les lacs et fleuves, quel que soit leur ordre dans la liste. */
export function poserPonts(base, profond, T, { W, H, ox, oy }, objets) {
  for (const O of objets || []) {
    if (O.o !== 'pont' || !(O.r > 0)) continue;
    const F = { x: O.x, y: O.y, x2: O.x2, y2: O.y2 }, [x2, y2] = extremite(F), r = O.r, long = Math.hypot(x2 - F.x, y2 - F.y);
    // la rive d'un bout : sa case la plus haute (hors de l'eau) à moins de r + 3 m du bout ; le tablier en part (v0.45.1)
    const haut = (px, py) => {
      let m = -Infinity, rayon = r + 3;
      for (let j = Math.max(0, Math.floor(py + oy - rayon)); j <= Math.min(H - 1, Math.ceil(py + oy + rayon)); j++) for (let i = Math.max(0, Math.floor(px + ox - rayon)); i <= Math.min(W - 1, Math.ceil(px + ox + rayon)); i++) {
        const c = j * W + i; if (!profond[c] && !T.pont[c] && Math.hypot(i + 0.5 - ox - px, j + 0.5 - oy - py) <= rayon && base[c] > m) m = base[c];
      }
      if (m > -Infinity) return m;
      const i = Math.max(0, Math.min(W - 1, Math.round(px + ox - 0.5))), j = Math.max(0, Math.min(H - 1, Math.round(py + oy - 0.5))), c = j * W + i; return profond[c] ? base[c] + PONT_AU_MOINS : base[c];
    };
    const i0 = Math.max(0, Math.floor(Math.min(F.x, x2) + ox - r)), i1 = Math.min(W - 1, Math.ceil(Math.max(F.x, x2) + ox + r));
    const j0 = Math.max(0, Math.floor(Math.min(F.y, y2) + oy - r)), j1 = Math.min(H - 1, Math.ceil(Math.max(F.y, y2) + oy + r));
    const cases = []; let eau = Infinity, aEau = false;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = j * W + i;
      if (distanceForme(F, i + 0.5 - ox, j + 0.5 - oy) >= r || T.pont[c]) continue;
      cases.push(c); if (profond[c]) { aEau = true; if (base[c] < eau) eau = base[c]; }
    }
    if (!aEau) continue;                                         // sans eau dessous, rien ne se pose
    const dx = x2 - F.x, dz = y2 - F.y;
    const pont = { type: O.type, x: F.x, y: F.y, x2, y2, r, long, mx: (F.x + x2) / 2 + ox, mz: (F.y + y2) / 2 + oy, ang: -Math.atan2(dz, dx), pontH: Math.max(haut(F.x, F.y), haut(x2, y2), eau + PONT_AU_MOINS), eau, cases, enEau: [], detruit: false };
    T.pontsListe.push(pont);
    const n = T.pontsListe.length;
    for (const c of cases) { T.pont[c] = n; T.pontH[c] = pont.pontH; if (profond[c]) { T.pontEau[c] = 1; pont.enEau.push(c); profond[c] = 0; } }
  }
}
// Un obus tombé sur le tablier (à moins de `rayon` cases du point de chute) coupe l'ouvrage entier : ses cases d'eau redeviennent profondes, plus personne n'y marche ; rend les ouvrages coupés
export function detruirePont(T, i0, j0, rayon) {
  if (!T.pontsListe.length) return [];
  const coupes = new Set();
  for (let j = Math.max(0, j0 - rayon); j <= Math.min(T.H - 1, j0 + rayon); j++) for (let i = Math.max(0, i0 - rayon); i <= Math.min(T.W - 1, i0 + rayon); i++) {
    const n = T.pont[j * T.W + i]; if (n) coupes.add(n);
  }
  const out = [];
  for (const n of coupes) {
    const P = T.pontsListe[n - 1]; if (P.detruit) continue;
    P.detruit = true; out.push(P);
    for (const c of P.cases) { T.pont[c] = 0; T.pontH[c] = 0; }
    for (const c of P.enEau) { T.profond[c] = 1; T.pontEau[c] = 0; }
  }
  if (out.length) T.versionPonts++;
  return out;
}
