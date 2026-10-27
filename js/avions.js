/* Les avions de mitraillage (Jérôme, v0.55.0) : la logique, pure (aucun DOM ni horloge ; le hasard vient du générateur de la bataille, passé en paramètre).
   Un vol vit dans `etat.mitraillages` (sauvegardé) : la passe tracée (A → B), l'entrée et la sortie sur son prolongement, hors de la carte, l'heure du départ `t0`,
   les points de vie. Toute la trajectoire est une droite : la position et l'altitude se lisent à partir du temps (`positionDe`), le dessin n'a rien d'autre à demander.
   L'avion entre par le prolongement de la passe, vole à `croisiere` m, descend à `passe` m sur les `descente` m qui précèdent la bande, la balaie (ses balles tombent
   `avance` m devant lui, chaque homme de la bande n'est tiré qu'une fois), remonte, et sort. Au-dessus d'hommes qui tirent, il perd des points de vie (`exposition`) ;
   à zéro, il tombe, écrase ce qui est sous lui et laisse une épave jusqu'à l'aube. Les avions de chaque camp : `etat.avions[camp]`, les points de vie de chacun (0 : perdu). */
import { MITRAILLAGE as M } from './data/mitraillage.js?v=0.90.0';
import { METEO } from './data/meteo.js?v=0.90.0';
import { GRILLE, effrayer, toitFacteur } from './army.js?v=0.90.0';
import { hash2 } from './lib/rng.js?v=0.90.0';
import { modif, pvAvion } from './camp.js?v=0.90.0';
import { impact } from './terrain.js?v=0.90.0';
import { NOMS_CALIBRES } from './data/calibres.js?v=0.90.0';

const borne = (v, a, b) => v < a ? a : v > b ? b : v;
const lisse = f => { f = borne(f, 0, 1); return f * f * (3 - 2 * f); };
const arrondi = v => Math.round(v * 10) / 10;

/* Les avions d'un camp au départ : [pv, pv, pv] */
export const flotteDeDepart = () => [0, 1].map(() => Array.from({ length: M.flotte }, () => M.pv));

/* La passe qu'on trace : { x1, y1, x2, y2, L, ux, uy } ou { refus }. Sans second point : la passe par défaut, nord-sud, centrée sur (x, y), vers l'autre camp. */
export function ligneDe(camp, x, y, x2, y2, longueurMax = M.longueurMax) {
  if (x2 === undefined || y2 === undefined || x2 === null || y2 === null) {
    const s = camp === 0 ? 1 : -1;
    x2 = x; y2 = y - s * M.defaut / 2; y += s * M.defaut / 2;
  }
  x = arrondi(x); y = arrondi(y); x2 = arrondi(x2); y2 = arrondi(y2);
  let dx = x2 - x, dy = y2 - y, L = Math.hypot(dx, dy);
  if (L < M.longueurMin) return { refus: `Tracez une passe d'au moins ${M.longueurMin} m.` };
  if (L > longueurMax) { x2 = arrondi(x + dx * longueurMax / L); y2 = arrondi(y + dy * longueurMax / L); dx = x2 - x; dy = y2 - y; L = Math.hypot(dx, dy); }
  return { x1: x, y1: y, x2, y2, L, ux: dx / L, uy: dy / L };
}

/* Le vol qu'on obtiendrait : la passe, plus l'entrée et la sortie (le prolongement de la droite jusqu'à `sortie` m au-delà du bord du terrain) */
export function tracerVol(T, l) {
  const S = M.sortie;
  const hors = (px, py, sx, sy) => {
    let t = Infinity;
    if (sx > 1e-9) t = Math.min(t, (T.W + S - px) / sx); else if (sx < -1e-9) t = Math.min(t, (-S - px) / sx);
    if (sy > 1e-9) t = Math.min(t, (T.H + S - py) / sy); else if (sy < -1e-9) t = Math.min(t, (-S - py) / sy);
    return Math.max(0, t);
  };
  const a = hors(l.x1, l.y1, -l.ux, -l.uy), b = hors(l.x2, l.y2, l.ux, l.uy);
  return { ...l, ex: l.x1 - l.ux * a, ey: l.y1 - l.uy * a, fx: l.x2 + l.ux * b, fy: l.y2 + l.uy * b, sA: a, sB: a + l.L, total: a + l.L + b };
}

/* L'altitude à l'abscisse `s` du vol : de croisière à passe sur `descente` m avant la bande, passe sur la bande, puis la remontée */
export function altitudeA(v, s) {
  if (s < v.sA) return M.croisiere + (M.passe - M.croisiere) * lisse((s - (v.sA - M.descente)) / M.descente);
  if (s <= v.sB) return M.passe;
  return M.passe + (M.croisiere - M.passe) * lisse((s - v.sB) / M.remontee);
}

/* Où est le vol au temps de jeu `temps` : { x, y, h, cap, pente (rad, + : il monte), etat } */
export function positionDe(v, temps) {
  const cap = Math.atan2(v.uy, v.ux);
  if (v.etat === 'epave') return { x: v.cx, y: v.cy, h: 0, cap, pente: 0, etat: 'epave' };
  if (v.etat === 'chute') {
    const tau = Math.min(temps, v.chute.ti) - v.chute.t, d = M.vitesse * M.chute.vitesse * tau;
    return { x: v.chute.x + v.ux * d, y: v.chute.y + v.uy * d, h: Math.max(0, v.chute.h - 0.5 * M.chute.gravite * tau * tau), cap, pente: -Math.atan2(M.chute.gravite * tau, M.vitesse * M.chute.vitesse), etat: 'chute' };
  }
  const s = borne((temps - v.t0) * M.vitesse, 0, v.total), h = altitudeA(v, s), dh = altitudeA(v, Math.min(v.total, s + 1)) - altitudeA(v, Math.max(0, s - 1));
  return { x: v.ex + v.ux * s, y: v.ey + v.uy * s, h, cap, pente: Math.atan2(dh / 2, 1), etat: 'vol', s };
}

/* Le balayage à ce temps : { actif, l (l'abscisse sur la bande où tombent ses balles), x, y } */
export function balayage(v, temps) {
  if (v.etat !== 'vol') return { actif: false };
  const s = (temps - v.t0) * M.vitesse, l = s + M.avance - v.sA;
  return { actif: l > 0 && l <= v.L, l, x: v.x1 + v.ux * l, y: v.y1 + v.uy * l };
}

// ─── Les ordres ──────────────────────────────────────────────────────────

const enVol = (etat, camp, k) => etat.mitraillages.some(v => v.camp === camp && v.k === k && v.etat === 'vol');
/* Le prochain avion à partir : le plus en forme de ceux qui sont au sol (-1 : aucun) */
function prochainAvion(etat, camp) {
  let meilleur = -1;
  etat.avions[camp].forEach((pv, k) => { if (pv > 0 && !enVol(etat, camp, k) && (meilleur < 0 || pv > etat.avions[camp][meilleur])) meilleur = k; });
  return meilleur;
}
/* Combien d'avions peuvent encore partir (au sol, en état) et combien existent (en vol compris) */
export const avionsPrets = (etat, camp) => etat.avions[camp].filter((pv, k) => pv > 0 && !enVol(etat, camp, k)).length;
export const avionsRestants = (etat, camp) => etat.avions[camp].filter(pv => pv > 0).length;

/* Le refus d'une passe, ou { ligne } : la météo, la flotte, la passe tracée */
export function refusAvion(B, camp, x, y, x2, y2) {
  const { etat } = B, meteo = etat.meteo[etat.jour - 1];
  if (M.cloue.includes(meteo)) return { refus: `Par ${METEO[meteo].nom}, les avions restent au sol.` };
  if (!avionsRestants(etat, camp)) return { refus: 'Plus un avion : l\'escadrille est détruite.' };
  if (prochainAvion(etat, camp) < 0) return { refus: 'Tous les avions sont en vol.' };
  const l = ligneDe(camp, x, y, x2, y2, M.longueurMax * modif(B.etat, camp, 'aerodrome.longueur'));
  return l.refus ? { refus: l.refus } : { ligne: l };
}

export function lancerAvion(B, camp, l) {
  const { etat } = B, k = prochainAvion(etat, camp);
  etat.mitraillages.push({
    id: etat.mitraillages.length ? etat.mitraillages[etat.mitraillages.length - 1].id + 1 : 0, camp, k, ...tracerVol(B.terrain, l),
    t0: etat.temps, pv: etat.avions[camp][k], etat: 'vol',
  });
  etat.avionsJour[etat.jour - 1][camp][0]++;
}

// ─── Les hommes sous l'avion ─────────────────────────────────────────────

/* Chaque homme de la grille dans le rectangle (x0, y0)-(x1, y1) */
function parmi(A, x0, y0, x1, y1, f) {
  const g0x = Math.max(0, Math.floor(x0 / GRILLE)), g1x = Math.min(A.gw - 1, Math.floor(x1 / GRILLE)), g0y = Math.max(0, Math.floor(y0 / GRILLE)), g1y = Math.min(A.gh - 1, Math.floor(y1 / GRILLE));
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
    const c = gy * A.gw + gx;
    for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) f(A.sorted[s]);
  }
}

/* Ce que coûte à un avion de `camp`, en pv par seconde, d'être en (x, y) à l'altitude h : les hommes d'en face, debout, qui tirent en l'air (le feu retenu : seulement quand il est très bas) */
export function degatsParSeconde(B, camp, x, y, h) {
  const { etat, armee: A } = B, E = M.exposition, r2 = E.rayon * E.rayon;
  let n = 0;
  parmi(A, x - E.rayon, y - E.rayon, x + E.rayon, y + E.rayon, i => {
    if (A.camp[i] === camp || A.mort[i] || A.blessure[i]) return;
    const dx = A.x[i] - x, dy = A.y[i] - y;
    if (dx * dx + dy * dy > r2) return;
    n += etat.regiments[A.reg[i]].stance === 'retenu' ? (h < E.bas_retenu ? E.retenu : 0) : 1;
  });
  return Math.min(E.plafond, n * E.parHomme) * (E.bas + (1 - E.bas) * (1 - borne((h - M.passe) / (M.croisiere - M.passe), 0, 1)));
}

/* L'aperçu d'une passe avant l'ordre (le dessin de la visée) : le vol, les hommes de la bande (les nôtres, ceux d'en face) et les pv qu'il y laisserait.
   Le tir se lit sur la grille du dernier pas. */
export function apercuVol(B, camp, l) {
  const v = tracerVol(B.terrain, l), A = B.armee, hw = M.largeur / 2, pas = 6;
  let pertes = 0;
  for (let s = 0; s < v.total; s += pas) {
    const p = positionDe({ ...v, etat: 'vol', t0: 0 }, s / M.vitesse);
    pertes += degatsParSeconde(B, camp, p.x, p.y, p.h) * pas / M.vitesse;
  }
  const n = [0, 0];
  parmi(A, Math.min(l.x1, l.x2) - hw, Math.min(l.y1, l.y2) - hw, Math.max(l.x1, l.x2) + hw, Math.max(l.y1, l.y2) + hw, i => {
    if (A.mort[i]) return;
    const dx = A.x[i] - l.x1, dy = A.y[i] - l.y1, d = dx * l.ux + dy * l.uy;
    if (d >= 0 && d <= l.L && Math.abs(dx * l.uy - dy * l.ux) <= hw) n[A.camp[i]]++;
  });
  return { vol: v, pertes: Math.min(M.pv, pertes), nous: n[0], eux: n[1] };
}

// ─── Un pas ──────────────────────────────────────────────────────────────

/* Les balles tombées sur la bande entre les abscisses lo et hi : chaque homme n'est tiré qu'une fois (les fenêtres se suivent sans se recouvrir) */
function balayer(B, v, lo, hi, ctx, rng) {
  const { armee: A, terrain: T, R } = B, hw = M.largeur / 2;
  const ax = v.x1 + v.ux * lo, ay = v.y1 + v.uy * lo, bx = v.x1 + v.ux * hi, by = v.y1 + v.uy * hi;
  parmi(A, Math.min(ax, bx) - hw, Math.min(ay, by) - hw, Math.max(ax, bx) + hw, Math.max(ay, by) + hw, i => {
    if (A.mort[i]) return;
    const dx = A.x[i] - v.x1, dy = A.y[i] - v.y1, l = dx * v.ux + dy * v.uy;
    if (l <= lo || l > hi || Math.abs(dx * v.uy - dy * v.ux) > hw) return;
    let p = M.letal * modif(B.etat, v.camp, 'aerodrome.letal');      // les mitrailleuses jumelées (v0.88.0)
    const ci = (A.y[i] | 0) * T.W + (A.x[i] | 0);
    if (T.diff[ci] <= -2) p *= R.obus.abri;
    p *= toitFacteur(T, ci, 'avion');
    if (rng() < p) ctx.frapper(i, 'avion', M.gravite);
    else A.peur[i] = Math.max(A.peur[i], M.peur);
  });
  effrayer(A, (ax + bx) / 2, (ay + by) / 2, M.rayonPeur + hw, M.peurVoisins, R.experience, R.caracteristiques.calme);
  labourer(B, v, lo, hi, ctx);
}

/* Les balles labourent la bande (v0.73.1, Jérôme : « l'avion doit plus labourer le sol ») : de petits creux au hasard sur la fenêtre qui vient de tomber, du relief seulement
   (un 75 sans souffle : ni mort, ni peur ; l'impact est écrit comme ceux des obus, donc la sauvegarde le rejoue) */
function labourer(B, v, lo, hi, ctx) {
  const { etat, terrain: T, R } = B, hw = M.largeur / 2;
  const n = Math.round((hi - lo) * M.largeur / M.labour.parCreux);
  for (let q = 0; q < n; q++) {
    const k = etat.impacts.length, l = lo + hash2(k, q, B.etat.graine) * (hi - lo), w = (hash2(k, q, B.etat.graine + 1) * 2 - 1) * hw;      // (un hachage, pas le générateur : le fil des tirages de la bataille ne bouge pas)
    const x = arrondi(v.x1 + v.ux * l - v.uy * w), y = arrondi(v.y1 + v.uy * l + v.ux * w);
    if (x < 0 || y < 0 || x >= T.W || y >= T.H) continue;
    etat.impacts.push([etat.jour, etat.tickJour, Math.round(x * 10), Math.round(y * 10), NOMS_CALIBRES.indexOf(M.labour.calibre)]);
    impact(T, x, y, M.labour.calibre, R, etat.impacts.length - 1, ctx.gel);
  }
}

function abattre(B, v, p) {
  const { etat } = B;
  v.pv = 0; v.etat = 'chute'; etat.avions[v.camp][v.k] = 0; etat.avionsJour[etat.jour - 1][v.camp][1]++;
  const ti = etat.temps + Math.sqrt(2 * p.h / M.chute.gravite), d = M.vitesse * M.chute.vitesse * (ti - etat.temps);
  v.chute = { t: etat.temps, x: p.x, y: p.y, h: p.h, ti };
  v.cx = arrondi(p.x + v.ux * d); v.cy = arrondi(p.y + v.uy * d);
  B.evenements.push({ type: 'avion-abattu', camp: v.camp, x: p.x, y: p.y, h: p.h });
}

function ecraser(B, v, ctx, rng) {
  const { armee: A } = B, C = M.chute, r2 = C.rayon * C.rayon;
  v.etat = 'epave';
  parmi(A, v.cx - C.rayon, v.cy - C.rayon, v.cx + C.rayon, v.cy + C.rayon, i => {
    if (A.mort[i]) return;
    const dx = A.x[i] - v.cx, dy = A.y[i] - v.cy;
    if (dx * dx + dy * dy <= r2 && rng() < C.letal) ctx.frapper(i, 'avion', 0.8);
  });
  effrayer(A, v.cx, v.cy, C.rayon * 3, B.R.soldat.peurObus, B.R.experience, B.R.caracteristiques.calme);
  B.evenements.push({ type: 'avion-ecrase', camp: v.camp, x: v.cx, y: v.cy });
}

/* Un pas de chaque vol. `ctx` : celui de `avancer` (frapper, abri…). Doit venir après la construction de la grille. */
export function avancerAvions(B, ctx, rng) {
  const { etat } = B, dt = ctx.dt;
  for (const v of etat.mitraillages) {
    if (v.etat === 'epave') continue;
    if (v.etat === 'chute') { if (etat.temps >= v.chute.ti - 1e-9) ecraser(B, v, ctx, rng); continue; }
    const s = (etat.temps - v.t0) * M.vitesse;
    if (s >= v.total) { v.etat = 'rentre'; etat.avions[v.camp][v.k] = v.pv; B.evenements.push({ type: 'avion-rentre', camp: v.camp, pv: v.pv }); continue; }
    const p = positionDe(v, etat.temps);
    // la bande : les balles qui tombent devant lui
    const lo = borne(s - M.vitesse * dt + M.avance - v.sA, 0, v.L), hi = borne(s + M.avance - v.sA, 0, v.L);
    if (hi > lo) balayer(B, v, lo, hi, ctx, rng);
    // les hommes d'en face qui lui tirent dessus
    const mal = degatsParSeconde(B, v.camp, p.x, p.y, p.h) * dt;
    if (mal > 0) { v.pv = Math.max(0, v.pv - mal); if (v.pv <= 0) abattre(B, v, p); }
  }
  if (etat.mitraillages.some(v => v.etat === 'rentre')) etat.mitraillages = etat.mitraillages.filter(v => v.etat !== 'rentre');
}

/* L'aube : les avions reviennent au sol (ceux qui étaient en l'air, les épaves s'effacent) et chacun est réparé de `reparation` pv */
export function reparerAvions(etat) {
  for (const v of etat.mitraillages) if (v.etat === 'vol') etat.avions[v.camp][v.k] = v.pv;
  etat.mitraillages = [];
  etat.avions.forEach((flotte, camp) => { for (let k = 0; k < flotte.length; k++) if (flotte[k] > 0) flotte[k] = Math.min(pvAvion(etat, camp), flotte[k] + M.reparation); });
}
