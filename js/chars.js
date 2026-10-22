/* Les chars d'assaut (Jérôme, v0.47.0) : la logique, pure (aucun DOM ni horloge ; le hasard vient du générateur de la bataille, passé en paramètre).
   Un char vit dans `etat.chars` (sauvegardé) : { id, camp, modele, x, y, tx, ty, pv, etat, v }. Il part de l'arrière de son camp (`arriere`), marche en droite
   ligne vers (tx, ty) à la vitesse de son modèle, ralentie par un cratère (la moitié de ce qu'il franchit), arrêtée par un cratère plus profond ou par l'eau
   profonde (`enlise` : il reste là et tire) ; il tire sur l'autre camp à portée ; un obus tombé près de lui l'abîme (`degatsChars`), jusqu'à l'épave (`detruit`).
   Les tranchées se franchissent (elles font 1,5 m : son modèle les passe). Les ordres rendent { refus } comme les barrages. */
import { CHARS, CHAR_PAR_DEFAUT, CHAR_RECHARGE, CHAR_DEPART, CHAR_OBUS } from './data/chars.js?v=0.53.0';
import { CALIBRES } from './data/calibres.js?v=0.53.0';
import { effrayer } from './army.js?v=0.53.0';
import { detruirePont } from './eaux.js?v=0.53.0';
import { toucher } from './terrain.js?v=0.53.0';
import { PONTS_JEU, typePont } from './data/ponts.js?v=0.53.0';

/* Peut-on lancer un char de (camp) vers (x, y) ? `depart` : { x, y } d'où il partirait. */
export function refusChar(etat, depart, x, y) {
  if (!depart) return 'Pas de route pour un char ici.';
  if (Math.hypot(x - depart.x, y - (depart.ar ?? depart.y)) < CHAR_DEPART) return `Trop près de ses lignes : visez à plus de ${CHAR_DEPART} m.`;
  return '';
}

export function lancerChar(B, camp, depart, x, y, modele = CHAR_PAR_DEFAUT) {
  const { etat } = B;
  // `ar` : la rangée de l'arrière de son camp, où la route finit et où il se met en ligne droite à sa vitesse de char
  etat.chars.push({ id: etat.chars.length ? etat.chars[etat.chars.length - 1].id + 1 : 0, camp, modele, x: depart.x, y: depart.y, ar: depart.ar, tx: x, ty: y, pv: CHARS[modele].pv, etat: 'avance', v: 0, cap: Math.atan2(y - depart.y, x - depart.x) });
}
export const RECHARGE_CHAR = CHAR_RECHARGE;

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
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { c.etat = 'arrive'; c.v = 0; B.evenements.push({ type: 'char-arrive', x: c.x, y: c.y, camp: c.camp }); }
      else {
        const ux = dx / d, uy = dy / d, cx = Math.floor(c.x + ux * 3), cy = Math.floor(c.y + uy * 3);
        const ici = cx >= 0 && cy >= 0 && cx < T.W && cy < T.H ? cy * T.W + cx : -1;
        const prof = ici >= 0 && !(T.troncon && T.troncon[ici] >= 0) ? -T.diff[ici] : 0;
        const profond = ici >= 0 && T.profond && T.profond[ici];
        const route = c.ar !== undefined && (c.camp === 0 ? c.y > c.ar : c.y < c.ar), f = route ? 1 : profond || prof >= M.franchit ? 0 : prof >= M.franchit / 2 ? 0.35 : 1;
        if (f === 0) { c.etat = 'enlise'; c.v = 0; B.evenements.push({ type: 'char-enlise', x: c.x, y: c.y, camp: c.camp }); }
        else {
          const surRoute = c.ar !== undefined && (c.camp === 0 ? c.y > c.ar : c.y < c.ar);
          c.v = surRoute ? M.route : M.vitesse * f; c.x += ux * c.v * dt; c.y += uy * c.v * dt; c.cap = Math.atan2(uy, ux);
        }
      }
    } else c.v = 0;
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
      effrayer(A, c.x, c.y, M.portee * 1.4, 0.02, R.experience);
    }
  }
}
