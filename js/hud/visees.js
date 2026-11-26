// Les visées dessinées sur le champ (sorti de main.js, lot de dette du 24 nov.) : le cercle d'un obus, la passe d'un avion, la route d'un char.
// Du dessin seul (un SVG en texte), à partir de la bataille et du point visé ; `creerVisees({ $, rendu })` rend { obus, avion, char }.
import { arriereDe } from '../bataille.js?v=0.170.3';
import { ligneDe, apercuVol } from '../avions.js?v=0.170.3';
import { routeChar } from '../chars.js?v=0.170.3';
import { MITRAILLAGE } from '../data/mitraillage.js?v=0.170.3';
import { CHARS, CHAR_PAR_DEFAUT } from '../data/chars.js?v=0.170.3';
import { modif } from '../camp.js?v=0.170.3';

let $, rendu;
export function creerVisees(ctx) {
  ({ $, rendu } = ctx);
  return { obus, avion, char };
}
// Le cercle d'un obus à (x, y), de rayon r : le souffle en zone assombrie, deux anneaux à deux tiers et à un tiers (plus près du centre, plus on tue), un point
function obus(x, y, r) {
  const contour = rr => { let d = ''; for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, [px, py] = rendu.versEcran(x + Math.cos(a) * rr, y + Math.sin(a) * rr); d += `${k ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`; } return d + 'Z'; };
  const [cx, cy] = rendu.versEcran(x, y);
  return `<path class="ombre" d="${contour(r)}"/><path class="zone" d="${contour(r)}"/><path class="anneau" d="${contour(r * 0.66)}"/><path class="anneau" d="${contour(r * 0.33)}"/><circle class="pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2"/>`;
}
// La passe d'un avion (Jérôme, v0.56.0) : avant le premier clic, un point ; ensuite la bande de A au curseur posée sur le sol, la route de l'avion (son entrée et sa sortie, hors de la carte)
// en pointillé, une flèche au bout, et ce qu'elle coûte : les hommes de la bande (ennemis, les nôtres) et les points de vie que l'avion y laisserait
let apercuAvion = { cle: '', quand: 0, val: null };
const apercuDe = (B, MOI, l) => {
  const cle = `${l.x1},${l.y1},${l.x2},${l.y2}`, t = performance.now();
  if (!apercuAvion.val || t - apercuAvion.quand > 700 || (apercuAvion.cle !== cle && t - apercuAvion.quand > 100)) apercuAvion = { cle, quand: t, val: apercuVol(B, MOI, l) };
  return apercuAvion.val;
};
function avion(B, MOI, departAvion, x, y) {
  const E = (px, py) => rendu.versEcran(px, py), F = ([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`;
  const note = (px, py, t) => { const g = px > innerWidth - 330; return `<text x="${(px + (g ? -12 : 12)).toFixed(1)}" y="${(py - 10).toFixed(1)}"${g ? ' text-anchor="end"' : ''}>${t}</text>`; };
  const svg = $('visee');
  if (!departAvion) { const [cx, cy] = E(x, y); return `<circle class="pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3"/>${note(cx, cy, 'Début de la passe')}`; }
  const l = ligneDe(MOI, departAvion.x, departAvion.y, x, y, MITRAILLAGE.longueurMax * modif(B.etat, MOI, 'aerodrome.longueur')), [ax, ay] = E(departAvion.x, departAvion.y), [cx, cy] = E(x, y);
  if (l.refus) { svg.classList.add('refus'); return `<path class="anneau" d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${cx.toFixed(1)} ${cy.toFixed(1)}"/><circle class="pt" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3"/>${note(cx, cy, l.refus)}`; }
  const hw = MITRAILLAGE.largeur / 2, nx = -l.uy * hw, ny = l.ux * hw, ap = apercuDe(B, MOI, l);
  const bande = 'M' + [[l.x1 + nx, l.y1 + ny], [l.x2 + nx, l.y2 + ny], [l.x2 - nx, l.y2 - ny], [l.x1 - nx, l.y1 - ny]].map(([px, py]) => F(E(px, py))).join('L') + 'Z';
  const route = `M${F(E(ap.vol.ex, ap.vol.ey))}L${F(E(ap.vol.fx, ap.vol.fy))}`;
  const [bx, by] = E(l.x2, l.y2), [tx, ty] = E(l.x2 - l.ux * 6 + nx, l.y2 - l.uy * 6 + ny), [ux, uy] = E(l.x2 - l.ux * 6 - nx, l.y2 - l.uy * 6 - ny);
  const dit = `${ap.eux} d'en face · ${ap.nous} des nôtres · avion −${Math.round(ap.pertes)} pv`;
  return `<path class="route" d="${route}"/><path class="ombre" d="${bande}"/><path class="zone" d="${bande}"/><path class="pointe" d="M${tx.toFixed(1)} ${ty.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}L${ux.toFixed(1)} ${uy.toFixed(1)}"/><circle class="pt" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3"/>${note(cx, cy, dit)}`;
}
// La route d'un char (v0.47.0 ; v0.59.3 : son vrai chemin, détour par les ponts compris, et l'engin à son point de départ, derrière notre dernière ligne) : un trait pointillé de ce départ à l'objectif
// où l'engin se pose ; la recherche coûte ~50 ms : on la refait quand le point visé change de 2 m, et pas plus d'une fois tous les 120 ms
let routeVisee = { cle: '', pts: null, t: 0 };
// (v0.164.0) `dep` : un char déjà sur le champ, choisi (sa fiche) : le chemin part de lui, pas de l'arrière de nos lignes (Jérôme : « je n'ai plus la visualisation du chemin »)
function char(B, MOI, x, y, dep = null) {
  const a = dep ? null : arriereDe(B), x0 = dep ? dep[0] : x, y0 = dep ? dep[1] : a ? a[MOI] : y, cle = `${dep ? `${Math.round(x0)},${Math.round(y0)}:` : ''}${Math.round(x / 2)},${Math.round(y / 2)},${Math.floor(B.etat.temps / 4)}`, t = performance.now();
  if (routeVisee.cle !== cle && t - routeVisee.t > 120) routeVisee = { cle, pts: dep || a ? routeChar(B, x0, y0, x, y) : null, t };
  const pts = [[x0, y0], ...(routeVisee.pts ?? [[x, y]])], E = (px, py) => rendu.versEcran(px, py).map(v => v.toFixed(1)).join(' ');
  // l'engin vu de dessus (6 m sur 2,1) posé en (cx, cy), le nez dans la direction (ux, uy)
  const L = CHARS[CHAR_PAR_DEFAUT].longueur / 2, Lg = 1.05, boite = (cx, cy, ux, uy) => {
    const c = (u, v) => E(cx + ux * u - uy * v, cy + uy * u + ux * v);
    return `M${c(-L, -Lg)}L${c(L - 0.7, -Lg)}L${c(L, 0)}L${c(L - 0.7, Lg)}L${c(-L, Lg)}Z`;
  };
  const dir = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / d, (q[1] - p[1]) / d]; };
  const [ux, uy] = dir(pts[0], pts[1] ?? pts[0]), [vx, vy] = dir(pts[Math.max(0, pts.length - 2)], pts[pts.length - 1]);
  const depart = boite(pts[0][0], pts[0][1], ux, uy), arrivee = boite(x, y, vx, vy), route = 'M' + pts.map(([px, py]) => E(px, py)).join('L');
  const [cx, cy] = rendu.versEcran(x, y);
  return `<path class="anneau" d="${route}"/><path class="ombre" d="${depart}"/><path class="zone" d="${depart}"/><path class="ombre" d="${arrivee}"/><path class="zone" d="${arrivee}"/><circle class="pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2"/>`;
}
