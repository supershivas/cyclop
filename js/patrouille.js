// La patrouille de nuit : la règle, sans écran (Jérôme, 16 nov. ; prototype au labo, v0.142.0 : sujet « La patrouille de nuit »). Logique pure : aucun DOM, aucune horloge (le temps
// vient de `dt`), aucun hasard hors de la graine (`hash2`). Un groupe d'une quarantaine d'hommes va d'un point à un autre à travers le no man's land ; en face, des fusées s'ouvrent
// au-dessus de lui ; un homme debout dans leur lumière se fait voir, couché dans un trou il ne se voit pas ; vu, le poste de mitrailleuse le plus proche tire.
// Les chiffres : data/patrouille.js. Le terrain et les postes sont passés par le labo (`monde`) : la règle ne connaît pas la bataille.
import { hash2 } from './lib/rng.js?v=0.149.3';
import { PATROUILLE, FUSEES, REPERAGE, FEU_PATROUILLE } from './data/patrouille.js?v=0.149.3';

const entre = ([a, b], h) => a + (b - a) * h;

/* Une patrouille : `hommes` = les indices de ses hommes dans l'armée (leur place de départ : `places`), `but` = { x, y }, `graine` */
export function creerPatrouille({ hommes, places, but, graine = 1 }) {
  const n = hommes.length;
  let cx = 0, cy = 0; for (const p of places) { cx += p.x; cy += p.y; } cx /= n; cy /= n;
  const C = PATROUILLE.colonnes, rangs = Math.ceil(n / C);
  return {
    graine, t: 0, couche: false, issue: null, alerte: 0, feu: null, nFusees: 0, prochaine: FUSEES.premiere,
    centre: { x: cx, y: cy }, dest: { x: but.x, y: but.y }, but: { x: but.x, y: but.y }, depart: { x: cx, y: cy },
    fusees: [],
    hommes: hommes.map((i, k) => ({ i, x: places[k].x, y: places[k].y, vx: 0, vy: 0, vivant: true,
      ox: (k % C - (C - 1) / 2) * PATROUILLE.ecart, oy: (Math.floor(k / C) - (rangs - 1) / 2) * PATROUILLE.ecart })),
  };
}

/* Les ordres : où aller (refusé à voix haute si la patrouille est finie), se coucher ou se relever */
export function allerA(P, x, y) {
  if (P.issue) return { refus: 'La patrouille est finie : recommencez.' };
  P.dest = { x, y }; return { ok: true };
}
export function coucher(P, oui = !P.couche) {
  if (P.issue) return { refus: 'La patrouille est finie : recommencez.' };
  P.couche = !!oui; return { ok: true };
}

export const vivants = P => P.hommes.filter(h => h.vivant).length;

/* Une fusée éclaire-t-elle (x, y) à l'instant de P ? */
function eclaire(P, x, y) {
  for (const f of P.fusees) { const a = P.t - f.t; if (a >= FUSEES.allume && a <= FUSEES.eteint && (f.x - x) ** 2 + (f.y - y) ** 2 <= FUSEES.rayon ** 2) return true; }
  return false;
}
/* L'exposition d'un homme : 0 (invisible) à 1,5 (debout, il marche, dans la lumière) ; `monde.creux(x, y, m)` : le sol est-il à moins de `m` mètres (négatif) à cet endroit */
function exposition(P, h, monde) {
  const lumiere = eclaire(P, h.x, h.y);
  if (P.couche) return lumiere ? (monde.creux(h.x, h.y, REPERAGE.creux) ? REPERAGE.trou : REPERAGE.couche) : 0;
  if (monde.creux(h.x, h.y, REPERAGE.tranchee)) return 0;      // debout au fond d'une tranchée : la tête sous le parapet
  const bouge = Math.hypot(h.vx, h.vy) > 0.2;
  if (lumiere) return bouge ? REPERAGE.marche : REPERAGE.debout;
  return monde.postes.some(p => (p.x - h.x) ** 2 + (p.y - h.y) ** 2 < REPERAGE.ecoute ** 2) ? REPERAGE.bruit : 0;
}

/* Un pas de `dt` secondes. `monde` : { creux(x, y, m), postes: [{ x, y }] (les postes d'en face encore debout) }. Rend les événements : { t: 'fusee', x, y }, { t: 'rafale', poste, k },
   { t: 'tombe', k, i } (k : le rang de l'homme dans la patrouille, i : son indice dans l'armée), { t: 'issue', issue } */
export function pasPatrouille(P, dt, monde) {
  const ev = [];
  if (P.issue) return ev;
  P.t += dt;
  // le groupe marche (ou rampe) vers sa destination ; chaque homme rejoint sa place dans la formation
  const v = P.couche ? PATROUILLE.vitesse.couche : PATROUILLE.vitesse.debout;
  const dx = P.dest.x - P.centre.x, dy = P.dest.y - P.centre.y, d = Math.hypot(dx, dy);
  if (d > 0.3) { const s = Math.min(d, v * dt) / d; P.centre.x += dx * s; P.centre.y += dy * s; }
  for (const h of P.hommes) {
    if (!h.vivant) { h.vx = h.vy = 0; continue; }
    const tx = P.centre.x + h.ox, ty = P.centre.y + h.oy, ex = tx - h.x, ey = ty - h.y, e = Math.hypot(ex, ey), m = Math.min(e, v * 1.6 * dt);
    h.vx = e > 0.05 ? ex / e * m / dt : 0; h.vy = e > 0.05 ? ey / e * m / dt : 0;
    if (e > 0.05) { h.x += ex / e * m; h.y += ey / e * m; }
  }
  // les fusées d'en face : au-dessus du groupe, à quelques dizaines de mètres près
  if ((P.prochaine -= dt) <= 0) {
    const k = P.nFusees++, x = P.centre.x + (hash2(k, 1, P.graine) - 0.5) * 2 * FUSEES.ecart[0], y = P.centre.y + (hash2(k, 2, P.graine) - 0.5) * 2 * FUSEES.ecart[1];
    P.fusees.push({ x, y, t: P.t }); ev.push({ t: 'fusee', x, y });
    P.prochaine = entre(FUSEES.intervalle, hash2(k, 3, P.graine));
  }
  P.fusees = P.fusees.filter(f => P.t - f.t <= FUSEES.eteint);
  // être vu : l'alerte monte avec la part du groupe exposée, redescend dans le noir
  const vifs = P.hommes.filter(h => h.vivant);
  if (!P.feu) {
    let expo = 0; for (const h of vifs) expo += exposition(P, h, monde);
    expo /= Math.max(1, vifs.length);
    P.alerte = Math.max(0, Math.min(1, P.alerte + (expo > 0 ? expo * REPERAGE.vitesse : -REPERAGE.oubli) * dt));
    if (P.alerte >= 1) {
      // le poste le plus proche du groupe, s'il est à portée, ouvre le feu
      let poste = -1, md = FEU_PATROUILLE.portee ** 2;
      monde.postes.forEach((p, k) => { const q = (p.x - P.centre.x) ** 2 + (p.y - P.centre.y) ** 2; if (q < md) { md = q; poste = k; } });
      if (poste >= 0) P.feu = { poste, t: 0, rafales: 0 };
      else P.alerte = FEU_PATROUILLE.apres;
    }
  }
  // le feu : une rafale par seconde ; chaque homme exposé tombe avec la probabilité de sa posture (dans un trou, couché : rien)
  if (P.feu) {
    P.feu.t += dt;
    while (P.feu.rafales < Math.floor(P.feu.t) && P.feu.rafales < FEU_PATROUILLE.duree) {
      const r = P.feu.rafales++;
      vifs.forEach(h => {
        const k = P.hommes.indexOf(h), e = exposition(P, h, monde) || (P.couche ? 0 : REPERAGE.bruit);
        if (!e) return;
        if (hash2(k, 1000 + r + P.nFusees * 7, P.graine) < (P.couche ? FEU_PATROUILLE.touche.couche : FEU_PATROUILLE.touche.debout)) { h.vivant = false; ev.push({ t: 'tombe', k, i: h.i }); }
      });
      ev.push({ t: 'rafale', poste: P.feu.poste, x: P.centre.x, y: P.centre.y });
    }
    if (P.feu.t >= FEU_PATROUILLE.duree) { P.feu = null; P.alerte = FEU_PATROUILLE.apres; }
  }
  // la fin : arrivés, ou plus personne
  if (!vivants(P)) { P.issue = 'perdue'; ev.push({ t: 'issue', issue: P.issue }); }
  else if (Math.hypot(P.but.x - P.centre.x, P.but.y - P.centre.y) <= PATROUILLE.arrivee) { P.issue = 'arrivee'; ev.push({ t: 'issue', issue: P.issue }); }
  return ev;
}
