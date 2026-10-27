/* Les nids de mitrailleuses (Jérôme, v0.83.0) : la logique, pure. Un nid vit dans `etat.nids` (sauvegardé) : { id, camp, troncon, x, y, face, pv, etat: 'actif' | 'detruit', tire }.
   Il est posé sur le parapet de la 1re ligne de son camp. Tant qu'il est actif, que son tronçon est à son camp et qu'un de ses hommes le sert, il tire en avant sur l'autre camp ;
   un obus l'abîme, à zéro il est détruit ; le génie (genie.js) ou, en face, la nuit, le refait. Les sapeurs le refont : `reparerNid`. */
import { NIDS } from './data/nids.js?v=0.94.2';
import { CALIBRES } from './data/calibres.js?v=0.94.2';
import { ligneY } from './tranchees.js?v=0.94.2';
import { hash2 } from './lib/rng.js?v=0.94.2';
import { GRILLE } from './army.js?v=0.94.2';

/* Les nids du départ : un par secteur de 100 m sur la 1re ligne de chaque camp, au milieu du 2e tronçon de chaque quart de la ligne. */
export function creerNids(B) {
  const nids = [];
  for (const L of B.lignes) {
    if (L.rang !== 0) continue;
    const ts = B.troncons.map((t, k) => [t, k]).filter(([t]) => B.lignes[t.ligne] === L).sort((a, b) => a[0].x0 - b[0].x0);
    const par = Math.max(1, Math.floor(ts.length / 4));
    for (let s = 0; s < 4; s++) {
      const e = ts[s * par + NIDS.tronconDuSecteur]; if (!e) continue;
      const [t, k] = e, x = (t.x0 + t.x1) / 2;
      nids.push({ id: nids.length, camp: L.camp, troncon: k, x, y: Math.round((ligneY(L, x) + L.face * (L.amp + 1.6)) * 10) / 10, face: L.face, pv: NIDS.pv, etat: 'actif', tire: 0 });
    }
  }
  return nids;
}

/* Un obus tombé en (x, y) : les nids à portée perdent des pv ; rend rien (les événements disent ceux qui tombent). */
export function degatsNids(B, x, y, cal) {
  const rayon = (CALIBRES[cal]?.rayon ?? 4) * NIDS.zone, base = NIDS.obus[cal] ?? 0;
  for (const n of B.etat.nids) {
    if (n.etat === 'detruit') continue;
    const d = Math.hypot(n.x - x, n.y - y);
    if (d >= rayon) continue;
    n.pv -= base * (1 - d / rayon);
    if (n.pv <= 0) { n.pv = 0; n.etat = 'detruit'; B.evenements.push({ type: 'nid-detruit', x: n.x, y: n.y, camp: n.camp, nid: n.id }); }
  }
}

/* Le nid refait (par le génie) */
export function reparerNid(B, id) {
  const n = B.etat.nids.find(k => k.id === id);
  if (!n || n.etat !== 'detruit') return false;
  n.pv = NIDS.pv; n.etat = 'actif'; n.tire = 0;
  B.evenements.push({ type: 'nid-repare', x: n.x, y: n.y, camp: n.camp, nid: n.id });
  return true;
}

/* Le nid détruit que vise (x, y) (à moins de 8 m), de `camp` : son numéro, ou -1 */
export function nidDetruitVise(B, camp, x, y) {
  let m = -1, d0 = 64;
  for (const n of B.etat.nids) { if (n.camp !== camp || n.etat !== 'detruit') continue; const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < d0) { d0 = d; m = n.id; } }
  return m;
}

/* Un pas de chaque nid. `ctx` : celui de `avancer` (frapper, tir…). */
export function avancerNids(B, ctx, rng) {
  const { etat, armee: A, R } = B, dt = ctx.dt, c2 = Math.cos(NIDS.demiCone);
  for (const n of etat.nids) {
    if (n.etat !== 'actif') continue;
    if (etat.troncons[n.troncon] !== n.camp) continue;                    // son tronçon est pris : plus personne pour le servir
    n.tire = (n.tire ?? 0) + dt;
    if (n.tire < NIDS.cadence) continue;
    // servi : un de ses hommes à moins de `equipage` m
    let servi = false;
    const g0x = Math.max(0, ((n.x - NIDS.equipage) / GRILLE) | 0), g1x = Math.min(A.gw - 1, ((n.x + NIDS.equipage) / GRILLE) | 0), g0y = Math.max(0, ((n.y - NIDS.equipage) / GRILLE) | 0), g1y = Math.min(A.gh - 1, ((n.y + NIDS.equipage) / GRILLE) | 0);
    for (let gy = g0y; gy <= g1y && !servi; gy++) for (let gx = g0x; gx <= g1x && !servi; gx++) {
      const c = gy * A.gw + gx;
      for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) { const i = A.sorted[s]; if (A.camp[i] === n.camp && !A.mort[i] && !A.blessure[i] && Math.hypot(A.x[i] - n.x, A.y[i] - n.y) <= NIDS.equipage) { servi = true; break; } }
    }
    if (!servi) continue;
    n.tire = 0;
    let vise = 0, tx = n.x, ty = n.y + n.face * 40;
    for (let i = 0; i < A.n; i++) {
      if (A.mort[i] || A.camp[i] === n.camp) continue;
      const dx = A.x[i] - n.x, dy = A.y[i] - n.y, d = Math.hypot(dx, dy);
      if (d >= NIDS.portee || d < 2 || dy * n.face / d < c2) continue;
      vise++; tx = A.x[i]; ty = A.y[i];
      if (rng() < NIDS.touche * (1.4 - d / NIDS.portee)) ctx.frapper(i, 'nid', NIDS.gravite);
      else A.peur[i] = Math.max(A.peur[i], NIDS.peur * (1 - d / NIDS.portee));
    }
    if (vise && B.tirs.length < 2000) { B.tirs.push(n.x, n.y, tx, ty, n.camp, -1); B.tirs.push(n.x, n.y, tx + 2, ty - 2, n.camp, -1); }
  }
  void R;
}
