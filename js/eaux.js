// Les eaux profondes d'un secteur (v0.43.0, l'atelier) : un lac (`{ o: 'lac', x, y, r }`, un disque) et un fleuve (`{ o: 'fleuve', x, y, x2, y2, r }`, un trait de demi-largeur r),
// mêmes coordonnées que `formes.js` (mètres du SECTEUR). Logique pure, sans hasard. Une eau est creusée d'un coup à plat (au niveau de sa rive la plus basse moins un mètre, au mètre près : le sol se
// dessine en marches d'un mètre) et marquée `profond` : on n'y passe pas (les champs de coûts la contournent, un homme qui s'y trouve la quitte à peine), sauf sur un pont (`ponts` : v0.44.0).
// Un fleuve suit le terrain : son niveau est celui de la rive la plus basse sur ±15 m de son cours, pas un niveau pour tout le cours.
import { distanceForme, extremite } from './formes.js?v=0.66.0';
import { hash2 } from './lib/rng.js?v=0.66.0';

export const EAUX = ['lac', 'fleuve'];
export const PONT_AU_MOINS = 4;          // quarts : le tablier est à 1 m au moins au-dessus de l'eau
const PAS_NIVEAU = 5, VOISINS = 3;       // m : un niveau par tranche de 5 m de cours ; on regarde 3 tranches de chaque côté

// Des rives qui ne sont pas au compas (Jérôme, v0.50.0 : « les rivages moins géométriques, la largeur des fleuves qui varie, pas géométrique non plus ») : un bruit lissé, sans hasard (il vient de la position de l'objet),
// bouge le bord d'un lac (±22 % du rayon, des lobes et des anses), élargit et resserre un fleuve (±35 % de sa demi-largeur, sur 35 m), le fait serpenter (jusqu'à 1,2 demi-largeur de chaque côté de son trait, sur 90 m)
// et ronge ses deux rives (±8 %, sur 6 m). Les nombres sont dans VARIATION.
export const VARIATION = { lac: 0.22, lacRive: 0.08, largeur: 0.35, rive: 0.08, meandre: 1.2, meandreMin: 4, echelleLargeur: 35, echelleMeandre: 90, echelleRive: 6 };
const lisse = u => u * u * (3 - 2 * u);
const graineDe = O => Math.floor(hash2(Math.round(O.x * 2), Math.round(O.y * 2), 77) * 1e6);
function bruit1(s, echelle, graine) { const f = s / echelle, i = Math.floor(f), t = lisse(f - i), a = hash2(i, 0, graine), b = hash2(i + 1, 0, graine); return (a + (b - a) * t) * 2 - 1; }      // −1..1
function bruit2(x, y, echelle, graine) {
  const fx = x / echelle, fy = y / echelle, x0 = Math.floor(fx), y0 = Math.floor(fy), sx = lisse(fx - x0), sy = lisse(fy - y0);
  const a = hash2(x0, y0, graine), b = hash2(x0 + 1, y0, graine), c = hash2(x0, y0 + 1, graine), d = hash2(x0 + 1, y0 + 1, graine);
  return ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy) * 2 - 1;
}
/* Le rayon d'un lac au point (px, py) : ses lobes (échelle du rayon) puis sa rive rongée */
const rayonLac = (O, px, py, g) => O.r * (1 + VARIATION.lac * bruit2(px, py, Math.max(8, O.r / 2.2), g) + VARIATION.lacRive * bruit2(px, py, 5, g + 1));
/* Le fleuve de l'objet : { long, off(s), demi(s) } le long de son trait (s en m depuis son début) ; off : de combien son axe s'écarte de son trait (sur sa gauche), demi : sa demi-largeur sans la rive rongée */
export function profilFleuve(O) {
  const g = graineDe(O), dx = O.x2 - O.x, dy = O.y2 - O.y, long = Math.hypot(dx, dy), A = Math.max(VARIATION.meandreMin, VARIATION.meandre * O.r);
  return {
    long, g, nx: long ? -dy / long : 0, ny: long ? dx / long : 1,
    off: s => A * bruit1(s, VARIATION.echelleMeandre, g + 3), demi: s => O.r * (1 + VARIATION.largeur * bruit1(s, VARIATION.echelleLargeur, g + 5)),
  };
}
/* Où est le fleuve (à peu près est-ouest) à la colonne x : sa rangée et sa demi-largeur (pour poser un pont d'une rive à l'autre) */
export function fleuveEn(O, x) {
  const P = profilFleuve(O), dx = O.x2 - O.x, s = Math.max(0, Math.min(P.long, dx ? (x - O.x) / dx * P.long : 0)), o = P.off(s), t = s / (P.long || 1);
  return { y: O.y + (O.y2 - O.y) * t + o * P.ny, demi: P.demi(s) * (1 + VARIATION.rive) };
}
/* Ce que couvre une eau, en mètres du secteur : { x0, x1, y0, y1 } (les contrôles s'en servent : l'eau ne doit pas toucher une tranchée) */
export function etendueEau(O) {
  if (O.o === 'lac') { const m = O.r * (1 + VARIATION.lac + VARIATION.lacRive); return { x0: O.x - m, x1: O.x + m, y0: O.y - m, y1: O.y + m }; }
  const P = profilFleuve(O), E = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (let s = 0; s <= P.long; s += 2) {
    const t = s / (P.long || 1), o = P.off(s), w = P.demi(s) * (1 + VARIATION.rive), cx = O.x + (O.x2 - O.x) * t + o * P.nx, cy = O.y + (O.y2 - O.y) * t + o * P.ny;
    E.x0 = Math.min(E.x0, cx - w); E.x1 = Math.max(E.x1, cx + w); E.y0 = Math.min(E.y0, cy - w); E.y1 = Math.max(E.y1, cy + w);
  }
  return E;
}

export function poserEaux(base, profond, { W, H, ox, oy }, objets) {
  for (const O of objets || []) {
    if (!EAUX.includes(O.o) || !(O.r > 0)) continue;
    const lac = O.o === 'lac', E = etendueEau(lac ? O : { ...O, x2: O.x2 ?? O.x, y2: O.y2 ?? O.y });
    const F = lac ? { x: O.x, y: O.y } : { x: O.x, y: O.y, x2: O.x2, y2: O.y2 }, [x2, y2] = extremite(F);
    const long = Math.hypot(x2 - F.x, y2 - F.y), g = graineDe(O), P = lac ? null : profilFleuve({ ...O, x2: O.x2 ?? O.x, y2: O.y2 ?? O.y });
    const i0 = Math.max(0, Math.floor(E.x0 + ox)), i1 = Math.min(W - 1, Math.ceil(E.x1 + ox)), j0 = Math.max(0, Math.floor(E.y0 + oy)), j1 = Math.min(H - 1, Math.ceil(E.y1 + oy));
    const cases = [], tranches = Math.floor(long / PAS_NIVEAU) + 1, bas = new Array(tranches).fill(Infinity);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = i + 0.5 - ox, py = j + 0.5 - oy;
      let s;
      if (lac) { if (distanceForme(F, px, py) >= rayonLac(O, px, py, g)) continue; s = 0; }
      else {
        const along = long ? ((px - F.x) * (x2 - F.x) + (py - F.y) * (y2 - F.y)) / long : 0, sc = Math.max(0, Math.min(long, along));
        const lateral = long ? ((px - F.x) * P.nx + (py - F.y) * P.ny) : Math.hypot(px - F.x, py - F.y);
        const w = P.demi(sc) * (1 + VARIATION.rive * bruit2(px, py, VARIATION.echelleRive, g + 7)), d = Math.hypot(along - sc, lateral - P.off(sc));
        if (d >= w) continue;
        s = sc;
      }
      const c = j * W + i, t = Math.min(tranches - 1, Math.floor(s / PAS_NIVEAU));
      cases.push([c, t]); if (base[c] < bas[t]) bas[t] = base[c];
    }
    const niveau = bas.map((_, t) => { let m = Infinity; for (let k = Math.max(0, t - VOISINS); k <= Math.min(tranches - 1, t + VOISINS); k++) m = Math.min(m, bas[k]); return (Math.floor(m / 4) - 1) * 4; });
    for (const [c, t] of cases) { base[c] = niveau[t]; profond[c] = 1; }
  }
}
/* Les marécages (v0.50.0 ; `{ o: 'marecage', x, y, r }`) : pas d'eau profonde, un sol détrempé. Dans le contour d'un disque aux bords rongés (±35 % du rayon), la nappe monte au-dessus du sol, par plaques (un bruit de 5 m) : là
   l'eau stagne en flaques peu profondes (de l'eau où l'on marche très lentement), ailleurs de la boue ; plus on va vers le cœur, plus c'est mouillé. La nappe tient l'eau en place (`hydroLignes` : `manque`), la pluie la fait déborder un peu.
   Sans hasard (le bruit vient de la position de l'objet). L'herbe n'y pousse pas. Passe après les eaux profondes (qu'il ne remplace pas) et laisse les tabliers de ponts à sec. */
export function poserMarecages(base, nappe, eau, humid, herbe, profond, pont, { W, H, ox, oy }, objets, roseaux = []) {
  for (const O of objets || []) {
    if (O.o !== 'marecage' || !(O.r > 0)) continue;
    const g = graineDe(O) + 91, m = O.r * 1.45;
    for (let j = Math.max(0, Math.floor(O.y + oy - m)); j <= Math.min(H - 1, Math.ceil(O.y + oy + m)); j++) for (let i = Math.max(0, Math.floor(O.x + ox - m)); i <= Math.min(W - 1, Math.ceil(O.x + ox + m)); i++) {
      const c = j * W + i, px = i + 0.5 - ox, py = j + 0.5 - oy;
      if (profond[c] || pont[c]) continue;
      const reff = O.r * (1 + 0.35 * bruit2(px, py, Math.max(6, O.r / 2), g) + 0.1 * bruit2(px, py, 4, g + 1)), u = 1 - Math.hypot(px - O.x, py - O.y) / reff;
      if (u <= 0) continue;
      const mouille = Math.min(1, u * 2.5), plaque = base[c] / 4 + mouille * (bruit2(px, py, 5, g + 2) * 0.35 + 0.12);
      nappe[c] = Math.max(nappe[c], plaque);
      const prof = nappe[c] - base[c] / 4;
      if (prof > 0) { eau[c] = Math.max(eau[c], prof); herbe[c] = 0; }
      humid[c] = Math.max(humid[c], 0.6 + 0.4 * mouille);
      if (u > 0.12 && hash2(i, j, g + 9) < 0.08 + 0.42 * mouille) roseaux.push(c);       // des roseaux : dans l'eau peu profonde et la boue, plus drus vers le cœur (le dessin les lit : `rendu/vegetation.js`)
    }
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
// Le génie a refait un ouvrage coupé (v0.66.0) : le tablier revient tel qu'avant, l'eau dessous cesse d'être profonde
export function reconstruirePont(T, P) {
  if (!P.detruit) return false;
  const n = T.pontsListe.indexOf(P) + 1;
  P.detruit = false;
  for (const c of P.cases) { T.pont[c] = n; T.pontH[c] = P.pontH; }
  for (const c of P.enEau) { T.profond[c] = 0; T.pontEau[c] = 1; }
  T.versionPonts++;
  return true;
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
