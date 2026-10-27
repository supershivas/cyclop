/* Les chars d'assaut (Jérôme, v0.47.0) : la logique, pure (aucun DOM ni horloge ; le hasard vient du générateur de la bataille, passé en paramètre).
   Un char vit dans `etat.chars` (sauvegardé) : { id, camp, modele, x, y, tx, ty, pv, etat, v }. Il part de l'arrière de son camp (`arriere`), marche en droite
   ligne vers (tx, ty) à la vitesse de son modèle, ralentie par un cratère (la moitié de ce qu'il franchit), arrêtée par un cratère plus profond ou par l'eau
   profonde (`enlise` : il reste là et tire) ; il tire sur l'autre camp à portée ; un obus tombé près de lui l'abîme (`degatsChars`), jusqu'à l'épave (`detruit`).
   Les tranchées se franchissent (elles font 1,5 m : son modèle les passe). Les ordres rendent { refus } comme les barrages. */
import { modif } from './camp.js?v=0.96.0';
import { CHARS, CHAR_PAR_DEFAUT, CHAR_RECHARGE, CHAR_DEPART, CHAR_OBUS, CHAR_ROUTE } from './data/chars.js?v=0.96.0';
import { CALIBRES } from './data/calibres.js?v=0.96.0';
import { effrayer, DENSITE } from './army.js?v=0.96.0';
import { zone as zoneDe } from './bataille.js?v=0.96.0';
import { detruirePont } from './eaux.js?v=0.96.0';
import { toucher } from './terrain.js?v=0.96.0';
import { PONTS_JEU, typePont } from './data/ponts.js?v=0.96.0';

/* La route d'un char (Jérôme, v0.59.3 : « ils doivent contourner les fleuves, passer par les ponts ») : une recherche sur une grille de `CHAR_ROUTE.maille` mètres, de (x0, y0) à (tx, ty), qui évite
   l'eau profonde, les cratères qu'il ne franchit pas, les ponts qui ne le portent pas, et se détourne des cratères à demi profonds. Rend les points à suivre (le dernier est le but), ou null
   (aucun passage). Ne lit que le terrain : le même chemin chez les deux joueurs. */
function coutCase(T, c, M, cr) {
  if (T.profond[c]) return Infinity;
  if (T.pont[c] && !PONTS_JEU[typePont(T.pontsListe[T.pont[c] - 1].type)].char) return Infinity;
  const prof = T.troncon && T.troncon[c] >= 0 ? 0 : -T.diff[c];
  return prof >= M.franchit ? Infinity : prof >= M.franchit / 2 ? cr : 1;
}
export function routeChar(B, x0, y0, tx, ty, modele = CHAR_PAR_DEFAUT, franchit = null) {
  const T = B.terrain, M = franchit ? { ...CHARS[modele], franchit } : CHARS[modele], m = CHAR_ROUTE.maille, W = Math.ceil(T.W / m), H = Math.ceil(T.H / m), N = W * H;
  const noeud = (x, y) => Math.max(0, Math.min(H - 1, Math.floor(y / m))) * W + Math.max(0, Math.min(W - 1, Math.floor(x / m)));
  const caseCout = (x, y) => { const i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < T.W && j < T.H ? coutCase(T, j * T.W + i, M, CHAR_ROUTE.cratere) : Infinity; };
  // un point est libre s'il l'est avec `marge` mètres de chaque côté (le char fait deux mètres de large et vire sur plusieurs mètres : le bord d'un trou ou de l'eau l'arrêterait)
  const marge = CHAR_ROUTE.marge, large = (x, y) => Math.max(caseCout(x, y), caseCout(x + marge, y), caseCout(x - marge, y), caseCout(x, y + marge), caseCout(x, y - marge));
  const libre = (x, y) => large(x, y) < Infinity;
  const cout = new Float64Array(N);
  for (let k = 0; k < N; k++) cout[k] = large((k % W) * m + m / 2, Math.floor(k / W) * m + m / 2);
  const dep = noeud(x0, y0), but = noeud(tx, ty);
  cout[dep] = 1; cout[but] = Math.min(cout[but], CHAR_ROUTE.cratere);
  if (!isFinite(cout[but])) return null;
  const dist = new Float64Array(N).fill(Infinity), pere = new Int32Array(N).fill(-1), tas = [];
  const pousser = (k, d) => { tas.push([d, k]); let i = tas.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (tas[p][0] <= tas[i][0]) break; [tas[p], tas[i]] = [tas[i], tas[p]]; i = p; } };
  const tirer = () => { const t = tas[0], d = tas.pop(); if (tas.length) { tas[0] = d; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, q = i; if (l < tas.length && tas[l][0] < tas[q][0]) q = l; if (r < tas.length && tas[r][0] < tas[q][0]) q = r; if (q === i) break; [tas[q], tas[i]] = [tas[i], tas[q]]; i = q; } } return t; };
  dist[dep] = 0; pousser(dep, 0);
  const cibleX = (but % W) * m + m / 2, cibleY = Math.floor(but / W) * m + m / 2;
  while (tas.length) {
    const [d, k] = tirer();
    if (d > dist[k]) continue;
    if (k === but) break;
    const kx = k % W, ky = (k / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = kx + dx, ny = ky + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (!isFinite(cout[n])) continue;
      if (dx && dy && (!isFinite(cout[ky * W + nx]) || !isFinite(cout[ny * W + kx]))) continue;      // pas de coin coupé à travers l'eau
      const nd = d + (dx && dy ? 1.4142 : 1) * cout[n];
      if (nd < dist[n]) { dist[n] = nd; pere[n] = k; pousser(n, nd); }
    }
  }
  if (!isFinite(dist[but])) return null;
  const pts = [];
  for (let k = but; k >= 0; k = pere[k]) pts.push([(k % W) * m + m / 2, Math.floor(k / W) * m + m / 2]);
  pts.reverse(); pts[0] = [x0, y0]; pts[pts.length - 1] = [tx, ty];
  // on raccourcit : d'un point, on saute à l'avant-dernier qu'on voit en ligne droite
  const droit = (a, b) => { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let q = 1; q < n; q++) if (!libre(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n)) return false; return true; };
  const sortie = [];
  for (let i = 0; i < pts.length - 1;) { let j = pts.length - 1; while (j > i + 1 && !droit(pts[i], pts[j])) j--; sortie.push(pts[j]); i = j; }
  return sortie;
}

/* Peut-on lancer un char de (camp) vers (x, y) ? `depart` : { x, y } d'où il partirait. */
export function refusChar(B, depart, x, y, camp = 0) {
  if (!depart) return 'Pas de route pour un char ici.';
  if (Math.hypot(x - depart.x, y - (depart.ar ?? depart.y)) < CHAR_DEPART) return `Trop près de ses lignes : visez à plus de ${CHAR_DEPART} m.`;
  if (depart.ar !== undefined && !routeChar(B, depart.x, depart.ar, x, y, undefined, CHARS[CHAR_PAR_DEFAUT].franchit * modif(B.etat, camp, 'chars.franchit'))) return 'Aucun passage pour un char jusque-là : eau, cratères ou pont trop faible.';
  return '';
}

export function lancerChar(B, camp, depart, x, y, modele = CHAR_PAR_DEFAUT) {
  const { etat } = B;
  // `ar` : la rangée de l'arrière de son camp, où la route finit ; `chemin` : les points qu'il suit ensuite (`routeChar`), `k` celui qu'il vise
  const franchit = CHARS[modele].franchit * modif(etat, camp, 'chars.franchit'), pv = Math.round(CHARS[modele].pv * modif(etat, camp, 'chars.pv'));     // le parc des chars (v0.88.0)
  const chemin = depart.ar !== undefined ? routeChar(B, depart.x, depart.ar, x, y, modele, franchit) : null;
  const ex = chemin ? 0 : x - depart.x, ey = chemin ? depart.ar - depart.y : y - depart.y, en = Math.hypot(ex, ey) || 1, hx = ex / en, hy = ey / en;
  etat.chars.push({ id: etat.chars.length ? etat.chars[etat.chars.length - 1].id + 1 : 0, camp, modele, x: depart.x, y: depart.y, ar: depart.ar, dx0: depart.x, tx: x, ty: y, chemin, k: 0, pv, pvMax: pv, franchit, vit: modif(etat, camp, 'chars.vitesse'), canonMod: modif(etat, camp, 'chars.canon'), canonT: etat.temps, cible: null, vise: null, etat: 'avance', v: 0, hx, hy, cap: Math.atan2(hy, hx) });
}
export const RECHARGE_CHAR = CHAR_RECHARGE;


/* Où tirerait ce char : la cible qu'on lui a donnée si elle est à portée, sinon le carré de 8 m le plus chargé d'ennemis (à portée, au-delà de `minimum` : pas sur soi). Rend [x, y] ou null. */
function viser(B, c, G) {
  const A = B.armee, p2 = G.portee * G.portee, m2 = G.minimum * G.minimum;
  if (c.cible) { const d2 = (c.cible[0] - c.x) ** 2 + (c.cible[1] - c.y) ** 2; if (d2 <= p2 && d2 >= m2) return c.cible; }
  const de = A.dens[1 - c.camp], r = Math.ceil(G.portee / DENSITE), bx = (c.x / DENSITE) | 0, by = (c.y / DENSITE) | 0;
  let meilleur = null, ms = 0;
  for (let oy = -r; oy <= r; oy++) {
    const yy = by + oy; if (yy < 0 || yy >= A.dh) continue;
    for (let ox = -r; ox <= r; ox++) {
      const xx = bx + ox; if (xx < 0 || xx >= A.dw) continue;
      const n = de[yy * A.dw + xx]; if (!n) continue;
      const x = (xx + 0.5) * DENSITE, y = (yy + 0.5) * DENSITE, d2 = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d2 > p2 || d2 < m2) continue;
      const score = n - Math.sqrt(d2) * 0.02;
      if (score > ms) { ms = score; meilleur = [x, y]; }
    }
  }
  return meilleur;
}

/* Un ordre donné à la volée à un de nos chars (Jérôme, v0.81.0) : `marche` (une nouvelle destination, la route recalculée d'où il est), `arret` (il s'arrête, il tire encore), `cible` (le point que son canon vise,
   tant qu'il est à portée) et `libre` (il choisit lui-même). Rend '' si l'ordre est possible, sinon la raison du refus. */
export function refusOrdreChar(B, id, ordre, x, y, camp) {
  const c = B.etat.chars.find(k => k.id === id);
  if (!c || c.camp !== camp) return 'Ce char n\'est plus à vous.';
  if (c.etat === 'detruit') return 'Ce char est détruit.';
  if (B.etat.phase !== 'jour') return 'La nuit, les ordres attendent l\'aube.';
  if (ordre === 'marche') {
    if (c.etat === 'enlise') return 'Ce char est enlisé : il ne repart pas.';
    const Z = zoneDe(B);
    if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return 'Hors du secteur.';
    const roule = c.ar !== undefined && (c.camp === 0 ? c.y > c.ar : c.y < c.ar);
    if (!(roule ? routeChar(B, c.dx0, c.ar, x, y, c.modele) : routeChar(B, c.x, c.y, x, y, c.modele))) return 'Aucun passage pour un char jusque-là : eau, cratères ou pont trop faible.';
  } else if (ordre === 'cible') {
    const Z = zoneDe(B);
    if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return 'Hors du secteur.';
  } else if (ordre !== 'arret' && ordre !== 'libre') return 'Pas de tel ordre.';
  return '';
}
export function ordonnerChar(B, id, ordre, x, y, camp) {
  const refus = refusOrdreChar(B, id, ordre, x, y, camp);
  if (refus) return { refus };
  const c = B.etat.chars.find(k => k.id === id);
  if (ordre === 'marche') {
    const roule = c.ar !== undefined && (c.camp === 0 ? c.y > c.ar : c.y < c.ar);
    c.chemin = roule ? routeChar(B, c.dx0, c.ar, x, y, c.modele) : routeChar(B, c.x, c.y, x, y, c.modele);
    c.tx = x; c.ty = y; c.k = 0; c.etat = 'avance';
  } else if (ordre === 'arret') { c.tx = c.x; c.ty = c.y; c.etat = 'arrive'; c.chemin = null; }
  else if (ordre === 'cible') c.cible = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  else if (ordre === 'libre') c.cible = null;
  return { ok: true };
}

/* Un obus tombé en (x, y) : les chars à portée prennent des dégâts. Rend les chars détruits à ce coup (pour le dessin). */
export function degatsChars(B, x, y, cal) {
  const rayon = (CALIBRES[cal]?.rayon ?? 4) * CHAR_OBUS.zone, base = CHAR_OBUS.base[cal] ?? 0;
  for (const c of B.etat.chars) {
    if (c.etat === 'detruit') continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d >= rayon) continue;
    c.pv -= base * (1 - d / rayon);
    if (c.pv <= 0) { c.pv = 0; c.etat = 'detruit'; c.v = 0; B.evenements.push({ type: 'char-detruit', x: c.x, y: c.y, camp: c.camp }); }
  }
}

/* Un pas de chaque char : il avance, il tire. `ctx` : celui de `avancer` (frapper, regiments, R…). */
export function avancerChars(B, ctx, rng) {
  const { etat, terrain: T, armee: A, R } = B, dt = ctx.dt;
  for (const c of etat.chars) {
    if (c.etat === 'detruit') continue;
    const M = CHARS[c.modele];
    // un pont qui ne porte pas un char (une passerelle, un câble, des cordes : `data/ponts.js`) cède sous lui : l'ouvrage tombe, le char s'enlise dans l'eau (v0.47.2)
    const sous = c.x >= 0 && c.y >= 0 && c.x < T.W && c.y < T.H ? T.pont[Math.floor(c.y) * T.W + Math.floor(c.x)] : 0;
    if (sous && c.etat === 'avance' && !PONTS_JEU[typePont(T.pontsListe[sous - 1].type)].char) {
      etat.pontsRompus.push([sous - 1, etat.jour, etat.tickJour]);
      for (const P of detruirePont(T, Math.floor(c.x), Math.floor(c.y), 0)) { for (const k of P.cases) toucher(T, k % T.W, (k / T.W) | 0); B.evenements.push({ type: 'pont-rompu', x: c.x, y: c.y, camp: c.camp }); }
      c.etat = 'enlise'; c.v = 0;
    }
    if (c.etat === 'avance') {
      const route = c.ar !== undefined && (c.camp === 0 ? c.y > c.ar : c.y < c.ar), d = Math.hypot(c.tx - c.x, c.ty - c.y);
      if (d < 1.5) { c.etat = 'arrive'; c.v = 0; B.evenements.push({ type: 'char-arrive', x: c.x, y: c.y, camp: c.camp }); }
      else {
        // la cible du moment : sur la route, le bout de la route ; ensuite le point suivant de son chemin (en droite ligne s'il n'en a pas)
        let vx = c.tx, vy = c.ty;
        if (c.chemin?.length) {
          if (route) { vx = c.dx0; vy = c.ar; }
          else { while (c.k < c.chemin.length - 1 && Math.hypot(c.chemin[c.k][0] - c.x, c.chemin[c.k][1] - c.y) < CHAR_ROUTE.arrivee) c.k++; [vx, vy] = c.chemin[c.k]; }
        }
        // il tourne en douceur (pas de demi-tour sur place) : son cap est un vecteur unitaire (hx, hy) qui se rapproche de la direction voulue, sans trigonométrie (déterminisme : voir ROADMAP « Déterminisme »)
        const wd = Math.hypot(vx - c.x, vy - c.y) || 1, wx = (vx - c.x) / wd, wy = (vy - c.y) / wd, k = Math.min(1, CHAR_ROUTE.virage * 1.5 * dt);
        let hx = c.hx + (wx - c.hx) * k, hy = c.hy + (wy - c.hy) * k, hn = Math.hypot(hx, hy);
        if (hn < 0.2) { hx = -c.hy; hy = c.hx; hn = 1; }       // juste en face : il se met de côté plutôt que de rester collé
        c.hx = hx / hn; c.hy = hy / hn; c.cap = Math.atan2(c.hy, c.hx);       // (le cap en angle ne sert qu'au dessin)
        const ux = c.hx, uy = c.hy, cx = Math.floor(c.x + ux * 3), cy = Math.floor(c.y + uy * 3);
        const ici = cx >= 0 && cy >= 0 && cx < T.W && cy < T.H ? cy * T.W + cx : -1;
        const prof = ici >= 0 && !(T.troncon && T.troncon[ici] >= 0) ? -T.diff[ici] : 0;
        const profond = ici >= 0 && T.profond && T.profond[ici];
        const f = route ? 1 : profond || prof >= (c.franchit ?? M.franchit) ? 0 : prof >= (c.franchit ?? M.franchit) / 2 ? 0.35 : 1;
        if (f === 0) { c.etat = 'enlise'; c.v = 0; B.evenements.push({ type: 'char-enlise', x: c.x, y: c.y, camp: c.camp }); }
        else {
          // il accélère et freine (un char ne démarre pas à pleine vitesse)
          const cible = route ? M.route : M.vitesse * f * (c.vit ?? 1), a = (route ? CHAR_ROUTE.accelRoute : CHAR_ROUTE.accel) * dt;
          c.v += Math.max(-a, Math.min(a, cible - c.v));
          c.x += ux * c.v * dt; c.y += uy * c.v * dt;
        }
      }
    } else c.v = 0;

    // son canon : un obus tous les `recharge` s sur sa cible (en roulant), sans viser plus près que `minimum`
    const G = M.canon;
    c.vise = viser(B, c, G);
    if (G && etat.temps - (c.canonT ?? 0) >= G.recharge * (c.canonMod ?? 1) && c.vise) {
      c.canonT = etat.temps;
      const [tx, ty] = c.vise, a = rng() * 6.2832, d = G.dispersion * Math.sqrt(rng());
      B.evenements.push({ type: 'char-tir', id: c.id, camp: c.camp, x: c.x, y: c.y, tx, ty });
      ctx.obus(Math.round((tx + Math.cos(a) * d) * 10) / 10, Math.round((ty + Math.sin(a) * d) * 10) / 10, G.calibre);
    }
    // ses mitrailleuses : une rafale par `cadence`, sur les hommes de l'autre camp à portée (plus la rafale est proche, plus elle touche)
    c.tire = (c.tire ?? 0) + dt;
    if (c.tire >= M.cadence) {
      c.tire = 0;
      for (let i = 0; i < A.n; i++) {
        if (A.mort[i] || A.camp[i] === c.camp) continue;
        const d = Math.hypot(A.x[i] - c.x, A.y[i] - c.y);
        if (d >= M.portee) continue;
        if (rng() < M.touche * (1.4 - d / M.portee)) ctx.frapper(i, 'char', M.gravite);
        else A.peur[i] = Math.max(A.peur[i], M.peur * (1 - d / M.portee));
      }
      effrayer(A, c.x, c.y, M.portee * 1.4, 0.02, R.experience, R.caracteristiques.calme);
    }
  }
}
