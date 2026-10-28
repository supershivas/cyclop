/* Le fil de fer (Jérôme, v0.98.0), la logique : `etat.fil[t]` est la solidité du réseau du tronçon `t` (0 : coupé ; 0 aussi pour un tronçon qui n'en a pas : hors 1re ligne). Le dessin lit `filCoupe`. */
import { FIL } from './data/fil.js?v=0.98.2';
import { CALIBRES } from './data/calibres.js?v=0.98.2';
import { ligneY } from './tranchees.js?v=0.98.2';

/* Les réseaux du départ : un par tronçon de 1re ligne */
export const filDeDepart = B => B.troncons.map(tr => B.lignes[tr.ligne].rang === 0 ? FIL.pv : 0);

/* Où est le réseau d'un tronçon : le segment [x0, x1] à `decalage` devant l'axe, du côté de l'autre camp */
const devant = (B, tr) => { const L = B.lignes[tr.ligne]; return { L, dz: L.face * FIL.decalage }; };

/* Un obus de calibre `cal` tombe en (x, y) : il abîme les réseaux à portée */
export function degatsFil(B, x, y, cal) {
  const fil = B.etat.fil;
  if (!fil) return;
  const rayon = (CALIBRES[cal]?.rayon ?? 4) * FIL.zone, base = FIL.obus[cal] ?? 0;
  B.troncons.forEach((tr, t) => {
    if (!(fil[t] > 0) || x < tr.x0 - rayon || x > tr.x1 + rayon) return;
    const { L, dz } = devant(B, tr), xm = Math.min(tr.x1, Math.max(tr.x0, x)), d = Math.hypot(x - xm, y - (ligneY(L, xm) + dz));
    if (d >= rayon) return;
    fil[t] = Math.max(0, fil[t] - base * (1 - d / rayon));
  });
}

/* Le réseau du tronçon `t` est-il coupé ? (un tronçon sans réseau compte pour coupé : le dessin ne montre rien là de toute façon) */
export const filCoupe = (etat, t) => !(etat.fil?.[t] > 0);
