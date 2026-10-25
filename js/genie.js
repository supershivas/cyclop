/* Le génie militaire (Jérôme, v0.66.0) : la logique, pure. Une section vit dans `etat.genies` (sauvegardé) : { id, camp, pont, x, y, tx, ty, n, etat, travail, p }, où (x, y) est le centre de la section
   et `p` ses hommes à plat : [x, y, vx, vy] chacun (v0.66.1 : chacun marche pour lui, en bande qui suit le centre, puis se répartit en désordre sur la rive autour des ruines ; sans hasard).
   Elle naît hors du terrain derrière son camp, marche en droite ligne jusqu'à la rive du pont coupé (`pont` : l'indice dans `T.pontsListe`), puis le refait : `travail` va de 0 à 1,
   et gagne `n / hommes` fois plus vite que la section au complet (de 2 à 4 h de jeu avec 20 hommes : `PONTS_HEURES`). Un obus couche une part de ses hommes. `etat.sapeurs[camp]` :
   les sections au dépôt. Les ordres rendent { refus } comme les barrages. */
import { GENIE_DATA } from './data/genie.js?v=0.71.0';
import { CALIBRES } from './data/calibres.js?v=0.71.0';
import { CHAR_SORTIE } from './data/chars.js?v=0.71.0';
import { PONTS_HEURES } from './data/ponts.js?v=0.71.0';
import { routeChar } from './chars.js?v=0.71.0';
import { reconstruirePont } from './eaux.js?v=0.71.0';
import { toucher } from './terrain.js?v=0.71.0';
import { hash2 } from './lib/rng.js?v=0.71.0';

export const sectionsDeDepart = () => [GENIE_DATA.sections, GENIE_DATA.sections];

// le pont coupé que vise (x, y) : son indice, ou -1 (à moins de sa demi-largeur + 3 m de son trait)
// la rive de leur côté : le bout de l'ouvrage le plus proche de l'arrière de leur camp (nous au sud, en face au nord), dans le terrain
function rive(B, camp, P) {
  const { x: ox, y: oy } = B.etat.marges, nord = P.y < P.y2;
  return (camp === 0) === nord ? [P.x2 + ox, P.y2 + oy] : [P.x + ox, P.y + oy];
}
function pontVise(B, x, y) {
  const T = B.terrain, { x: ox, y: oy } = B.etat.marges;      // (les bouts d'un ouvrage sont dans le secteur : les marges s'ajoutent)
  let meilleur = -1, d0 = Infinity;
  T.pontsListe.forEach((P, k) => {
    if (!P.detruit) return;
    const ux = P.x2 - P.x, uy = P.y2 - P.y, l2 = ux * ux + uy * uy || 1, s = Math.max(0, Math.min(1, ((x - P.x - ox) * ux + (y - P.y - oy) * uy) / l2));
    const d = Math.hypot(x - ox - (P.x + ux * s), y - oy - (P.y + uy * s));
    if (d <= P.r + 3 && d < d0) { d0 = d; meilleur = k; }
  });
  return meilleur;
}

export function refusGenie(B, camp, x, y, ar) {
  const { etat, terrain: T } = B;
  if (!etat.sapeurs[camp]) return { refus: 'Plus une section du génie : elles travaillent déjà, ou sont anéanties.' };
  const k = pontVise(B, x, y);
  if (k < 0) return { refus: 'Visez un pont coupé.' };
  if (etat.genies.some(g => g.pont === k)) return { refus: 'Le génie y travaille déjà.' };
  // la route : celle d'un char (l'eau profonde et les trous qu'il ne passe pas, les ponts qui ne le portent pas), de l'arrière de leur camp à la rive ; sans route, l'ordre est refusé
  const [bx, by] = rive(B, camp, T.pontsListe[k]);
  if (ar !== undefined && !routeChar(B, bx, ar, bx, by)) return { refus: 'Aucun passage jusqu\'à ce pont : eau profonde ou trous.' };
  return { ok: true, pont: k };
}

export function lancerGenie(B, camp, pont, ar) {
  const { etat, terrain: T } = B, P = T.pontsListe[pont], bout = rive(B, camp, P), chemin = ar !== undefined ? routeChar(B, bout[0], ar, bout[0], bout[1]) : null;
  etat.sapeurs[camp]--;
  etat.genies.push({ id: etat.genies.length ? etat.genies[etat.genies.length - 1].id + 1 : 0, camp, pont, x: bout[0], y: camp === 0 ? T.H + CHAR_SORTIE : -CHAR_SORTIE, tx: bout[0], ty: bout[1], dx0: bout[0], ar, chemin, k: 0, hx: 0, hy: camp === 0 ? -1 : 1, n: GENIE_DATA.hommes, etat: 'marche', travail: 0, p: [] });
  const g = etat.genies[etat.genies.length - 1], hy = camp === 0 ? -1 : 1;      // (ils partent vers le nord ou le sud)
  for (let i = 0; i < g.n; i++) { const [ox, oy] = rang(g, i, 0, hy); g.p.push(g.x + ox, g.y + oy, 0, 0); }
}

// la place d'un homme dans la bande en marche : une grille lâche de 5 derrière le centre (le cap (hx, hy) est unitaire), avec un peu de désordre
function rang(g, i, hx, hy) {
  const c = ((i % 5) - 2) * 1.1 + (hash2(g.id, i, 1) - 0.5) * 0.9, r = ((i / 5) | 0) * 1.1 + 0.5 + (hash2(g.id, i, 2) - 0.5) * 0.9;
  return [-hy * c - hx * r, hx * c - hy * r];
}
// sa place au travail : sur la rive de leur camp, autour du bout de l'ouvrage, étalés le long de l'eau de part et d'autre
function poste(B, g, i) {
  const P = B.terrain.pontsListe[g.pont], { x: ox, y: oy } = B.etat.marges, ux = P.x2 - P.x, uy = P.y2 - P.y, l = Math.hypot(ux, uy) || 1;
  const s = Math.sign((g.tx - ox - (P.x + P.x2) / 2) * ux + (g.ty - oy - (P.y + P.y2) / 2) * uy) || 1, ax = ux / l * s, ay = uy / l * s;      // vers l'intérieur de la rive
  const lat = (hash2(g.id, i, 3) * 2 - 1) * (P.r + 4), recul = 0.8 + hash2(g.id, i, 4) * 3.2;
  return [g.tx + ax * recul - ay * lat, g.ty + ay * recul + ax * lat];
}

/* Un obus tombé en (x, y) : les hommes du génie dans son souffle tombent (à moins de `part` × le rayon de la zone). */
export function degatsGenies(B, x, y, cal) {
  const rayon = (CALIBRES[cal]?.rayon ?? 4) * GENIE_DATA.zone * (GENIE_DATA.obus[cal] ?? 0);
  for (const g of B.etat.genies) {
    if (g.n <= 0) continue;
    const p = [];
    for (let i = 0; i < g.n; i++) if (Math.hypot(g.p[i * 4] - x, g.p[i * 4 + 1] - y) >= rayon) p.push(g.p[i * 4], g.p[i * 4 + 1], g.p[i * 4 + 2], g.p[i * 4 + 3]);
    g.p = p; g.n = p.length / 4;
    if (!g.n) { g.etat = 'detruit'; B.evenements.push({ type: 'genie-detruit', x: g.x, y: g.y, camp: g.camp }); }
  }
}

/* Les hommes d'une section : chacun vise sa place (dans la bande qui suit le centre, ou son poste sur la rive) et s'écarte de ses voisins ; jamais dans l'eau profonde. */
function bande(B, g, dt) {
  const T = B.terrain, p = g.p, n = p.length / 4, travaille = g.etat === 'travaille', hx = g.hx, hy = g.hy;
  const route = g.etat === 'marche' && g.ar !== undefined && (g.camp === 0 ? g.y > g.ar : g.y < g.ar), vmax = (route ? GENIE_DATA.route : GENIE_DATA.vitesse) * 1.25, k = Math.min(1, dt * 3);
  let ecart = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let bx, by;
    if (travaille) [bx, by] = poste(B, g, i); else { const [rx, ry] = rang(g, i, hx, hy); bx = g.x + rx; by = g.y + ry; }
    const sx = bx - p[o], sy = by - p[o + 1], sd = Math.hypot(sx, sy), arret = travaille && sd < 0.6;
    ecart += sd;
    let wx = arret ? 0 : sx / (sd || 1) * Math.min(vmax, sd * 1.5), wy = arret ? 0 : sy / (sd || 1) * Math.min(vmax, sd * 1.5);
    for (let j = 0; j < n; j++) {                  // il s'écarte de ceux qui le touchent
      if (j === i) continue;
      const dx = p[o] - p[j * 4], dy = p[o + 1] - p[j * 4 + 1], dd = Math.hypot(dx, dy);
      if (dd < 0.9) { const f = (0.9 - dd) / 0.9 * 1.2; wx += (dd ? dx / dd : i < j ? 1 : -1) * f; wy += (dd ? dy / dd : 0) * f; }
    }
    p[o + 2] += (wx - p[o + 2]) * k; p[o + 3] += (wy - p[o + 3]) * k;
    const nx = p[o] + p[o + 2] * dt, ny = p[o + 1] + p[o + 3] * dt, c = Math.floor(ny) * T.W + Math.floor(nx);
    const route = g.ar !== undefined && (g.camp === 0 ? p[o + 1] > g.ar : p[o + 1] < g.ar);      // (sur la route derrière leur camp, le terrain ne compte pas : comme pour les chars)
    if (!route && nx >= 0 && ny >= 0 && nx < T.W && ny < T.H && T.profond[c]) { p[o + 2] = 0; p[o + 3] = 0; } else { p[o] = nx; p[o + 1] = ny; }
  }
  g.lag = n ? ecart / n : 0;      // l'écart moyen à leur place : le centre attend si la bande s'étire
}

/* Un pas de chaque section. `ctx` : celui de `avancer`. */
export function avancerGenies(B, ctx) {
  const { etat, terrain: T, R } = B, dt = ctx.dt, secParHeure = R.jour.duree / (R.jour.heureFin - R.jour.heureDebut);
  for (const g of etat.genies) {
    if (g.etat === 'detruit') continue;
    const P = T.pontsListe[g.pont];
    if (!P.detruit) { g.etat = 'fini'; continue; }        // l'autre camp l'a déjà refait
    bande(B, g, dt);
    if (g.etat === 'marche') {
      // le centre attend ceux qui traînent (la bande ne s'étire pas) ; il suit le chemin d'un char, après la route jusqu'à l'arrière de son camp
      const trainent = g.lag ?? 0;
      const d = Math.hypot(g.tx - g.x, g.ty - g.y);
      if (d < GENIE_DATA.rive && trainent < 2) { g.etat = 'travaille'; B.evenements.push({ type: 'genie-arrive', x: g.x, y: g.y, camp: g.camp }); continue; }
      const route = g.ar !== undefined && (g.camp === 0 ? g.y > g.ar : g.y < g.ar);
      let vx = g.tx, vy = g.ty;
      if (g.chemin?.length) {
        if (route) { vx = g.dx0; vy = g.ar; }
        else { while (g.k < g.chemin.length - 1 && Math.hypot(g.chemin[g.k][0] - g.x, g.chemin[g.k][1] - g.y) < 2.5) g.k++; [vx, vy] = g.chemin[g.k]; }
      }
      const wd = Math.hypot(vx - g.x, vy - g.y) || 1e-9, v = (route ? GENIE_DATA.route : GENIE_DATA.vitesse) * dt * (trainent > 2.5 ? 0.3 : 1);
      g.hx = (vx - g.x) / wd; g.hy = (vy - g.y) / wd;
      g.x += g.hx * Math.min(v, wd); g.y += g.hy * Math.min(v, wd);
    } else {
      g.travail += (g.n / GENIE_DATA.hommes) * dt / ((PONTS_HEURES[P.type] ?? 3) * secParHeure);
      if (g.travail >= 1) {
        reconstruirePont(T, P);
        for (const k of P.cases) toucher(T, k % T.W, (k / T.W) | 0);
        etat.pontsRepares.push([g.pont, etat.jour, etat.tickJour]);
        B.evenements.push({ type: 'pont-repare', x: g.tx, y: g.ty, camp: g.camp });
        g.etat = 'fini';
      }
    }
  }
  if (etat.genies.some(g => g.etat === 'fini' || g.etat === 'detruit')) {
    for (const g of etat.genies) if (g.etat === 'fini') etat.sapeurs[g.camp]++;      // la section rentre au dépôt, ce qu'il en reste en tout cas
    etat.genies = etat.genies.filter(g => g.etat !== 'fini' && g.etat !== 'detruit');
  }
}
