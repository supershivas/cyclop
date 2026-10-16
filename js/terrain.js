/* Le terrain : un champ de hauteurs sur une grille de cases de 1 m, quantifié
   au quart (25 cm). Logique pure : aucun DOM, aucun hasard hors des graines,
   aucune horloge. Se teste dans Node (test/terrain.test.mjs).

   - La hauteur d'une case = le sol généré depuis la graine (`base`, en quarts)
     + un octet de différence (`diff`) : ce que les obus ont creusé ou jeté.
     Le sol généré n'est jamais sauvegardé : la graine le refait.
   - Un obus creuse un motif (data/calibres.js) ; la dureté croît avec la
     profondeur sous le sol d'origine (0-1 m : 100 %, 1-3 m : 50 %, au-delà :
     25 %), et un plancher dur arrête tout à −6 m. La terre éjectée fait une
     lèvre autour du cratère.
   - L'eau : une nappe vers 2 à 3 m sous le sol lissé, la pluie, l'infiltration
     dans le sol (humidité 0..1), le ruissellement vers le voisin le plus bas,
     l'évaporation. Une heure de jeu = une passe sur toutes les rangées ; le
     jour, la passe avance de quelques rangées à chaque pas (aucun à-coup), la
     nuit elle se fait en lot.
   - Les versions (`versionLigne`, `versionMorceau`) disent au rendu ce qui a
     changé ; le terrain ne connaît pas le rendu. */
import { hash2 } from './lib/rng.js?v=0.20.0';
import { CALIBRES } from './data/calibres.js?v=0.20.0';

export const ETAT = { SEC: 0, HUMIDE: 1, BOUE: 2, EAU: 3, GLACE: 4 };
export const MORCEAU = 25;             // cases : le côté d'un morceau de maillage (mesuré, rendu logiciel : à 100, la moitié du champ restait dessinée au zoom 4 ; à 25, 6 500 triangles au lieu de 15 600 au zoom 8)

// Un bruit de valeurs lissé, déterministe (graine, échelle en cases)
function bruit(x, y, echelle, graine) {
  const fx = x / echelle, fy = y / echelle;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, graine), b = hash2(x0 + 1, y0, graine);
  const c = hash2(x0, y0 + 1, graine), d = hash2(x0 + 1, y0 + 1, graine);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;   // 0..1
}

/* Le terrain d'un secteur, depuis une graine. Les arbres sont tirés ici
   (positions), leur état (abattu) vient des impacts. */
export function creerTerrain(graine, secteur, R) {
  // ox, oy : où commence le secteur de bataille dans le terrain (les marges autour) ; le bruit est pris
  // dans les coordonnées du secteur, pour que le relief de la bataille ne dépende pas des marges
  const W = secteur.largeur, H = secteur.hauteur, N = W * H, ox = secteur.ox || 0, oy = secteur.oy || 0;
  const base = new Int16Array(N), diff = new Int8Array(N);
  const nappe = new Float32Array(N);            // m (absolu) : le niveau de la nappe sous chaque case
  const eau = new Float32Array(N), humid = new Float32Array(N);
  const herbe = new Uint8Array(N);              // 0 à 3 : l'herbe (les obus la soufflent, la boue la tue)
  const g = graine | 0;
  const niveau = R.terrain.nappeMin + bruit(7, 3, 1, g + 99) * (R.terrain.nappeMax - R.terrain.nappeMin);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const c = j * W + i, x = i - ox, y = j - oy;
    const lent = bruit(x, y, 150, g + 1);                     // le relief lissé (la nappe le suit)
    const h = (lent - 0.5) * 2 * R.terrain.bosses * 0.6
      + (bruit(x, y, 46, g + 2) - 0.5) * 2 * R.terrain.bosses * 0.55
      + (bruit(x, y, 15, g + 3) - 0.5) * 2 * R.terrain.ondulation
      + 3;                                                    // m au-dessus du zéro du secteur
    base[c] = Math.round(h * 4);
    nappe[c] = (lent - 0.5) * 2 * R.terrain.bosses * 0.6 + 3 - niveau;
    humid[c] = R.hydro.humiditeDepart * (0.7 + 0.6 * bruit(x, y, 23, g + 4));
    // l'herbe : par plaques, plus drue dans les creux du relief lissé
    herbe[c] = Math.max(0, Math.min(3, Math.floor((bruit(x, y, 11, g + 6) * 0.8 + bruit(x, y, 37, g + 8) * 0.6 - lent * 0.3) * 4 - 1)));
  }
  // Quelques arbres, loin des bords
  const arbres = [];
  for (let k = 0; arbres.length < secteur.arbres && k < secteur.arbres * 40; k++) {
    const i = 6 + Math.floor(hash2(k, 1, g + 5) * (W - 12)), j = 6 + Math.floor(hash2(k, 2, g + 5) * (H - 12));
    // ils poussent par bosquets : on garde surtout ceux qui tombent près d'un autre
    if (arbres.length && hash2(k, 3, g + 5) < 0.7 && !arbres.some(a => Math.abs(a.i - i) + Math.abs(a.j - j) < 18)) continue;
    if (arbres.some(a => Math.abs(a.i - i) + Math.abs(a.j - j) < 3)) continue;
    arbres.push({ i, j, v: Math.floor(hash2(k, 4, g + 5) * 4), abattu: 0 });
  }
  // Des bois : quelques taches d'arbres serrés (le feu y court ; v0.8.0)
  for (let b = 0; b < (secteur.bois ?? 0); b++) {
    const ci = 20 + hash2(b, 1, g + 14) * (W - 40), cj = 20 + hash2(b, 2, g + 14) * (H - 40), r = 14 + hash2(b, 3, g + 14) * 14;
    for (let k = 0; k < 40; k++) {
      const a = hash2(b, k * 2, g + 15) * Math.PI * 2, d = Math.sqrt(hash2(b, k * 2 + 1, g + 15)) * r;
      const i = Math.round(ci + Math.cos(a) * d), j = Math.round(cj + Math.sin(a) * d * 0.8);
      if (i < 3 || j < 3 || i >= W - 3 || j >= H - 3 || arbres.some(t => Math.abs(t.i - i) + Math.abs(t.j - j) < 3)) continue;
      arbres.push({ i, j, v: Math.floor(hash2(i, j, g + 16) * 4), abattu: 0 });
    }
  }
  // Des buissons : en haies (quelques lignes de buissons serrés) et en bosquets épars
  const buissons = [];
  const nHaies = secteur.haies ?? 0;
  for (let h = 0; h < nHaies; h++) {
    const j0 = 10 + Math.floor(hash2(h, 1, g + 9) * (H - 20)), i0 = Math.floor(hash2(h, 2, g + 9) * W * 0.7);
    const long = 60 + Math.floor(hash2(h, 3, g + 9) * 140), pente = (hash2(h, 4, g + 9) - 0.5) * 0.3;
    for (let k = 0; k < long; k += 2 + Math.floor(hash2(h, k, g + 10) * 2)) {
      const i = i0 + k, j = Math.round(j0 + k * pente);
      if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2 || hash2(i, j, g + 11) < 0.15) continue;   // des trous dans la haie
      buissons.push({ i, j, v: Math.floor(hash2(i, j, g + 12) * 3), detruit: 0 });
    }
  }
  for (let k = 0; k < (secteur.buissons ?? 0); k++) {
    const i = 3 + Math.floor(hash2(k, 5, g + 13) * (W - 6)), j = 3 + Math.floor(hash2(k, 6, g + 13) * (H - 6));
    buissons.push({ i, j, v: Math.floor(hash2(k, 7, g + 13) * 3), detruit: 0 });
  }
  const mw = Math.ceil(W / MORCEAU), mh = Math.ceil(H / MORCEAU);
  return {
    W, H, base, diff, nappe, eau, humid, arbres, herbe, buissons,
    versionHerbe: 1,                            // l'herbe ou les buissons ont changé (rendu)
    caille: new Uint8Array(N),                  // 1 : des caillebotis posés (la nuit, une corvée)
    versionLigne: new Uint32Array(H),           // couleur d'une rangée changée (rendu)
    versionMorceau: new Uint32Array(mw * mh),   // hauteurs d'un morceau changées (rendu)
    mw, mh, version: 1,                         // version : relief changé (champs de coûts)
  };
}

export const hauteurQ = (T, c) => T.base[c] + T.diff[c];
/* La hauteur DESSINÉE : les bosses du sol généré en marches d'un mètre (des
   cubes), ce que les obus ont fait au quart près. Mesuré : au quart, les
   courbes de niveau des bosses coûtaient un triangle par case visible (rendu
   logiciel, 16 000 triangles au zoom 4) ; les cratères au demi-mètre près
   (après trois jours d'obus : 30 000 triangles au zoom 4 au quart près), la
   lèvre d'un quart n'est plus qu'une couleur. La logique garde le quart. */
export const hauteurVueQ = (T, c) => ((T.base[c] + 2) & ~3) + ((T.diff[c] / 2) | 0) * 2;
export const hauteurVueM = (T, c) => hauteurVueQ(T, c) * 0.25;
export const hauteurM = (T, c) => (T.base[c] + T.diff[c]) * 0.25;

export function etat(T, c, R, gel = false) {
  const H = R.hydro;
  if (T.eau[c] > H.eau) return gel ? ETAT.GLACE : ETAT.EAU;
  const m = T.humid[c];
  if (gel) return ETAT.SEC;                     // le sol gelé porte
  return m > H.boue ? ETAT.BOUE : m > H.humide ? ETAT.HUMIDE : ETAT.SEC;
}
const VITESSE_ETAT = ['sec', 'humide', 'boue', 'eau', 'glace'];
export function vitesseEtat(e, R) { return R.vitesse[VITESSE_ETAT[e]]; }

export function toucher(T, i, j) {
  T.versionLigne[j]++;
  T.versionMorceau[Math.floor(j / MORCEAU) * T.mw + Math.floor(i / MORCEAU)]++;
}

/* Un obus tombe en (x, y) (mètres). Rend { rayon } : la distance où il tue
   (réduite dans la boue, où il s'enfouit). n : le numéro de l'impact (pour
   le hasard déterministe de la lèvre). */
export function impact(T, x, y, nomCal, R, n = 0, gel = false) {
  const cal = CALIBRES[nomCal];
  const i0 = Math.floor(x), j0 = Math.floor(y);
  if (i0 < 0 || j0 < 0 || i0 >= T.W || j0 >= T.H) return { rayon: 0 };
  const c0 = j0 * T.W + i0;
  const e0 = etat(T, c0, R, gel);
  const enfoui = e0 === ETAT.BOUE || e0 === ETAT.EAU ? R.obus.boue : 1;
  const k = cal.motif.length, r = (k - 1) / 2;
  const P = R.terrain.plancher, d1 = R.terrain.durete1, d2 = R.terrain.durete2;
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const i = i0 + di, j = j0 + dj;
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) continue;
    let u = cal.motif[dj + r][di + r];
    if (!u) continue;
    const c = j * T.W + i;
    // creuser quart par quart : la terre jetée (au-dessus du sol d'origine) part d'abord
    while (u > 0) {
      const prof = -T.diff[c];
      if (prof >= P) break;
      const cout = prof < d1 ? 1 : prof < d2 ? 2 : 4;
      if (u < cout) break;
      u -= cout;
      T.diff[c]--;
    }
    // l'eau d'un trou est chassée par l'explosion ; la boue reste
    T.eau[c] *= 0.3;
    toucher(T, i, j);
  }
  // La lèvre : l'anneau juste autour du motif, irrégulier
  const levre = Math.max(1, Math.round(cal.levre * enfoui));
  const ra = r + 1;
  for (let dj = -ra; dj <= ra; dj++) for (let di = -ra; di <= ra; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== ra) continue;
    const i = i0 + di, j = j0 + dj;
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) continue;
    const coin = Math.abs(di) === ra && Math.abs(dj) === ra;
    if (coin || hash2(i * 7 + n, j, 31) < 0.25) continue;
    const c = j * T.W + i;
    T.diff[c] = Math.min(R.terrain.levreMax, T.diff[c] + levre);
    toucher(T, i, j);
  }
  // L'herbe soufflée autour du point de chute, les buissons arrachés
  const rh = ra + 1;
  for (let dj = -rh; dj <= rh; dj++) for (let di = -rh; di <= rh; di++) {
    const i = i0 + di, j = j0 + dj;
    if (i < 0 || j < 0 || i >= T.W || j >= T.H || di * di + dj * dj > rh * rh) continue;
    if (T.herbe[j * T.W + i]) { T.herbe[j * T.W + i] = 0; toucher(T, i, j); }
  }
  for (const b of T.buissons) if (!b.detruit && (b.i + 0.5 - x) ** 2 + (b.j + 0.5 - y) ** 2 < (rh + 1) ** 2) b.detruit = 1;
  T.versionHerbe++;
  // Les arbres proches tombent
  for (const a of T.arbres) {
    if (!a.abattu && (a.i + 0.5 - x) ** 2 + (a.j + 0.5 - y) ** 2 < R.terrain.arbreRayon ** 2) { a.abattu = 1; toucher(T, a.i, a.j); }
  }
  T.version++;
  return { rayon: cal.rayon * enfoui };
}

/* Une heure d'eau sur les rangées [j0, j1[ : pluie, nappe, infiltration,
   ruissellement, évaporation. m : le temps du jour (data/meteo.js). */
export function hydroLignes(T, j0, j1, m, R) {
  const { W, H, eau, humid, nappe } = T;
  const Hy = R.hydro;
  j1 = Math.min(H, j1);
  const pluie = Hy.pluie * m.pluie, evap = Hy.evaporation * m.evaporation, sechage = Hy.sechage * m.sechage;
  let herbeMorte = false;
  for (let j = j0; j < j1; j++) {
    const o = j * W;
    for (let i = 0; i < W; i++) {
      const c = o + i;
      let w = eau[c] + pluie;
      if (!m.gel) {
        // la nappe remonte dans ce qui est creusé sous son niveau, et mouille le sol juste au-dessus
        const manque = nappe[c] - hauteurM(T, c);
        if (manque > w) w += (manque - w) * Hy.remontee;
        const plancher = 1 + manque / Hy.capillarite;
        if (humid[c] < plancher) humid[c] += (Math.min(1, plancher) - humid[c]) * Hy.remontee;
        // le sol boit, d'autant moins qu'il est déjà plein
        const boit = Math.min(w, Hy.infiltration * (1 - humid[c]));
        w -= boit;
        humid[c] = Math.min(1, humid[c] + boit / Hy.reserve);
        w = Math.max(0, w - evap - (manque < 0 ? Hy.drainage * humid[c] : 0));
        humid[c] = Math.max(0, humid[c] - sechage);
        // le sol gorgé d'eau reste boueux tant que l'eau stagne
        if (w > Hy.eau) humid[c] = Math.min(1, humid[c] + 0.05);
        // la boue et l'eau tuent l'herbe, une touffe par heure
        if (T.herbe[c] && (humid[c] > Hy.boue || w > Hy.eau)) { T.herbe[c]--; herbeMorte = true; }
      }
      eau[c] = w;
    }
    // l'humidité du sol glisse vers la case voisine la plus basse : les creux boivent
    if (!m.gel) {
      for (let i = 0; i < W; i++) {
        const c = o + i, h = hauteurQ(T, c);
        let best = -1, bh = h;
        if (i > 0 && hauteurQ(T, c - 1) < bh) { bh = hauteurQ(T, c - 1); best = c - 1; }
        if (i < W - 1 && hauteurQ(T, c + 1) < bh) { bh = hauteurQ(T, c + 1); best = c + 1; }
        if (j > 0 && hauteurQ(T, c - W) < bh) { bh = hauteurQ(T, c - W); best = c - W; }
        if (j < H - 1 && hauteurQ(T, c + W) < bh) { bh = hauteurQ(T, c + W); best = c + W; }
        // seulement vers une marche d'un demi-mètre au moins (un trou) : sur les courbes de niveau des
        // bosses (un quart), chaque bord séchait et dessinait une ligne claire
        if (best < 0 || h - bh < 2) continue;
        const q = Math.min(1 - humid[best], humid[c] * Hy.glissement * Math.min(1, (h - bh) / 4));
        humid[c] -= q; humid[best] += q;
      }
    }
    // l'eau coule vers le voisin le plus bas (4 voisins), quelques passes
    if (!m.gel) {
      for (let p = 0; p < Hy.passes; p++) {
        for (let i = 0; i < W; i++) {
          const c = o + i, w = eau[c];
          if (w <= 0.0005) continue;
          const s = hauteurM(T, c) + w;
          let best = -1, bs = s;
          if (i > 0) { const v = hauteurM(T, c - 1) + eau[c - 1]; if (v < bs) { bs = v; best = c - 1; } }
          if (i < W - 1) { const v = hauteurM(T, c + 1) + eau[c + 1]; if (v < bs) { bs = v; best = c + 1; } }
          if (j > 0) { const v = hauteurM(T, c - W) + eau[c - W]; if (v < bs) { bs = v; best = c - W; } }
          if (j < H - 1) { const v = hauteurM(T, c + W) + eau[c + W]; if (v < bs) { bs = v; best = c + W; } }
          if (best < 0) continue;
          const q = Math.min(w, (s - bs) * Hy.ruissellement);
          eau[c] -= q; eau[best] += q;
        }
      }
    }
    T.versionLigne[j]++;
    if (j > 0) T.versionLigne[j - 1]++;
    if (j < H - 1) T.versionLigne[j + 1]++;
  }
  if (herbeMorte) T.versionHerbe++;
}

// La part du terrain dans chaque état (bilan, tests, labo)
export function bilanEtats(T, R, gel = false) {
  const n = [0, 0, 0, 0, 0];
  for (let c = 0; c < T.W * T.H; c++) n[etat(T, c, R, gel)]++;
  return n;
}
