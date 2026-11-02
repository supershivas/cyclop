/* Les nids de mitrailleuses (Jérôme, v0.83.0) : la logique, pure. Un nid vit dans `etat.nids` (sauvegardé) : { id, camp, troncon, x, y, face, pv, etat: 'actif' | 'detruit', tire }.
   Il est posé sur le parapet de la 1re ligne de son camp. Tant qu'il est actif, que son tronçon est à son camp et qu'un de ses hommes le sert, il tire en avant sur l'autre camp ;
   un obus l'abîme, à zéro il est détruit ; le génie (genie.js) ou, en face, la nuit, le refait. Les sapeurs le refont : `reparerNid`. */
import { NIDS } from './data/nids.js?v=0.105.6';
import { CALIBRES } from './data/calibres.js?v=0.105.6';
import { ligneY } from './tranchees.js?v=0.105.6';
import { hash2 } from './lib/rng.js?v=0.105.6';
import { GRILLE } from './army.js?v=0.105.6';
import { BONUS, GAINS, chevronsDe } from './data/experience.js?v=0.105.6';
import { zone as zoneDe } from './bataille.js?v=0.105.6';

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
      nids.push({ id: nids.length, camp: L.camp, troncon: k, x, y: Math.round((ligneY(L, x) + L.face * (L.amp + 1.6)) * 10) / 10, face: L.face, pv: NIDS.pv, etat: 'actif', tire: 0, muni: NIDS.munitions, exp: 0, ax: 0, ay: L.face });
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
  n.pv = NIDS.pv; n.etat = 'actif'; n.tire = 0; n.muni = NIDS.munitions;
  B.evenements.push({ type: 'nid-repare', x: n.x, y: n.y, camp: n.camp, nid: n.id });
  return true;
}

/* Le nid détruit que vise (x, y) (à moins de 8 m), de `camp` : son numéro, ou -1 */
export function nidDetruitVise(B, camp, x, y) {
  let m = -1, d0 = 64;
  for (const n of B.etat.nids) { if (n.camp !== camp || n.etat !== 'detruit') continue; const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < d0) { d0 = d; m = n.id; } }
  return m;
}

/* Les ordres du poste (lot E) : tourner son cône vers (x, y). Rend '' si c'est possible, sinon la raison du refus. L'axe est un vecteur unitaire (ax, ay) : pas de trigonométrie dans l'état. */
export function refusOrienterNid(B, id, camp, x, y) {
  const n = B.etat.nids.find(k => k.id === id);
  if (!n || n.camp !== camp) return 'Ce poste de mitrailleuse n\'est plus à vous.';
  if (n.etat === 'detruit') return 'Ce poste est détruit : le génie doit le refaire.';
  if (B.etat.phase !== 'jour') return 'La nuit, les ordres attendent l\'aube.';
  const Z = zoneDe(B);
  if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return 'Hors du secteur.';
  const d = Math.hypot(x - n.x, y - n.y);
  if (d < 4) return 'Trop près du poste : visez plus loin.';
  if ((y - n.y) * n.face / d < Math.cos(NIDS.pivot * Math.PI / 180)) return `Trop de travers : le poste ne tourne que de ${NIDS.pivot}° de chaque côté de sa direction d'origine.`;
  return '';
}
export function orienterNid(B, id, camp, x, y) {
  const refus = refusOrienterNid(B, id, camp, x, y);
  if (refus) return { refus };
  const n = B.etat.nids.find(k => k.id === id), d = Math.hypot(x - n.x, y - n.y);
  n.ax = Math.round((x - n.x) / d * 1000) / 1000; n.ay = Math.round((y - n.y) / d * 1000) / 1000;
  return { ok: true };
}
/* L'aube : les postes tenus refont leur bande (les munitions) et passent une nuit de plus au front (l'expérience). */
export function aubeNids(B) {
  for (const n of B.etat.nids) {
    if (n.etat !== 'actif') continue;
    n.muni = NIDS.munitions;
    if (B.etat.troncons[n.troncon] === n.camp) n.exp = Math.min(1, (n.exp ?? 0) + GAINS.nid.nuit);
  }
}
/* Les chevrons d'un poste et sa cadence (le bonus, data/experience.js) */
export const chevronsNid = n => chevronsDe(n.exp ?? 0);
export const cadenceNid = n => NIDS.cadence * (1 - BONUS.nid.cadence * chevronsNid(n));

/* Un pas de chaque nid. `ctx` : celui de `avancer` (frapper, tir…). */
export function avancerNids(B, ctx, rng) {
  const { etat, armee: A, R } = B, dt = ctx.dt, c2 = Math.cos(NIDS.demiCone);
  for (const n of etat.nids) {
    if (n.etat !== 'actif') continue;
    if (etat.troncons[n.troncon] !== n.camp) { n.statut = 'pris'; continue; }  // son tronçon est pris : plus personne pour le servir
    n.tire = (n.tire ?? 0) + dt;
    if (n.tire < cadenceNid(n)) continue;
    if (n.muni <= 0) { n.statut = 'sec'; continue; }                      // la bande est vide jusqu'à l'aube
    // servi : un de ses hommes à moins de `equipage` m
    let servi = false;
    const g0x = Math.max(0, ((n.x - NIDS.equipage) / GRILLE) | 0), g1x = Math.min(A.gw - 1, ((n.x + NIDS.equipage) / GRILLE) | 0), g0y = Math.max(0, ((n.y - NIDS.equipage) / GRILLE) | 0), g1y = Math.min(A.gh - 1, ((n.y + NIDS.equipage) / GRILLE) | 0);
    for (let gy = g0y; gy <= g1y && !servi; gy++) for (let gx = g0x; gx <= g1x && !servi; gx++) {
      const c = gy * A.gw + gx;
      for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) { const i = A.sorted[s]; if (A.camp[i] === n.camp && !A.mort[i] && !A.blessure[i] && Math.hypot(A.x[i] - n.x, A.y[i] - n.y) <= NIDS.equipage) { servi = true; break; } }
    }
    if (!servi) { n.statut = 'seul'; continue; }                           // personne à moins de `equipage` m : le poste se tait (les hommes sont partis)
    n.tire = 0;
    let vise = 0, touches = 0, tx = n.x + n.ax * 40, ty = n.y + n.ay * 40;
    for (let i = 0; i < A.n; i++) {
      if (A.mort[i] || A.camp[i] === n.camp) continue;
      const dx = A.x[i] - n.x, dy = A.y[i] - n.y, d = Math.hypot(dx, dy);
      if (d >= NIDS.portee || d < 2 || (dx * n.ax + dy * n.ay) / d < c2) continue;
      vise++; tx = A.x[i]; ty = A.y[i];
      if (rng() < NIDS.touche * (1.4 - d / NIDS.portee)) { ctx.frapper(i, 'nid', NIDS.gravite); touches++; }
      else A.peur[i] = Math.max(A.peur[i], NIDS.peur * (1 - d / NIDS.portee));
    }
    n.statut = vise ? 'tire' : 'veille';                                  // 'veille' : servi, mais aucun ennemi dans son cône à portée
    if (vise) { n.derniere = etat.temps; n.muni--; n.exp = Math.min(1, (n.exp ?? 0) + GAINS.nid.rafale + GAINS.nid.touche * touches); }
    if (vise && B.tirs.length < 2000) { B.tirs.push(n.x, n.y, tx, ty, n.camp, -1); B.tirs.push(n.x, n.y, tx + 2, ty - 2, n.camp, -1); }
  }
  void R;
}
