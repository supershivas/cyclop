// Un objet haut tombe-t-il dans l'écran ? (v0.94.2, Jérôme : « les éléments au premier plan disparaissent ») : logique pure, sans THREE, testée dans Node.
// `e` : la matrice vue-projection de la caméra (les 16 nombres, par colonnes, comme `Matrix4.elements`). L'objet est posé en (x, z), son pied à la hauteur `hs`, son sommet à `hs + h`, et il a un rayon `r` (m).
// Son pied ET son sommet comptent : un arbre dont le pied est sorti par le bas de l'écran garde sa cime à l'écran (à 16 px/m, un arbre de 9 m monte de 85 à 110 pixels ; l'ancienne règle, le pied seul
// avec 30 % de marge, soit ~60 pixels, le retirait d'un coup). La marge de côté suit son rayon. Sans hauteur (`h` = 0) : l'ancienne règle du pied seul.
export function dansLEcran(e, x, hs, z, h = 0, r = 0) {
  const cw = e[3] * x + e[7] * hs + e[11] * z + e[15], cxp = e[0] * x + e[4] * hs + e[8] * z + e[12], cyp = e[1] * x + e[5] * hs + e[9] * z + e[13];
  const rx = r * Math.hypot(e[0], e[8]);
  if (!h) return cxp > -1.15 * cw - rx && cxp < 1.15 * cw + rx && cyp > -1.3 * cw && cyp < 1.3 * cw;
  const ht = hs + h, cwt = e[3] * x + e[7] * ht + e[11] * z + e[15], cxt = e[0] * x + e[4] * ht + e[8] * z + e[12], cyt = e[1] * x + e[5] * ht + e[9] * z + e[13];
  const rxt = r * Math.hypot(e[0], e[8]);
  if (!((cxp > -1.15 * cw - rx && cxp < 1.15 * cw + rx) || (cxt > -1.15 * cwt - rxt && cxt < 1.15 * cwt + rxt))) return false;
  return !((cyp < -1.3 * cw && cyt < -1.3 * cwt) || (cyp > 1.3 * cw && cyt > 1.3 * cwt));      // le segment pied-sommet touche la bande de l'écran
}

// Un homme dans l'écran (v0.143.1, Jérôme : « tous les soldats présents à l'écran doivent être visibles, pas de pop-up au premier plan ») : le pied seul ne suffit pas.
// De près, au bas de l'écran, un homme fait 20 à 30 % de la hauteur de l'écran : ses pieds en sortaient (la marge de 15 %) alors que son buste et sa tête y étaient encore,
// et il surgissait d'un coup quand la caméra bougeait. Il compte maintenant des pieds à `h` m au-dessus (le fusil levé, la lettre du capitaine), avec `r` m de marge de côté
// (le fusil, la baïonnette, l'écart dans le rang) ; l'ancienne règle du pied (8 % de côté, 15 % en hauteur) garde tout ce qu'elle gardait (les images de loin ne changent pas).
// Rend la profondeur du pied (le `w` de la projection : la distance à la caméra le long de la vue) si une partie de l'homme est dans l'écran, sinon −1.
// `strict` : sans l'ancienne marge du pied, seulement `r` m autour de l'écran (le choix des hommes articulés : un homme juste sous le bas de l'écran est le plus proche
// de la caméra, et sans cela il prenait une des places du détail sans qu'on le voie).
export const HOMME_ECRAN = { haut: 2.3, cote: 1 };
export function profondeurALEcran(e, x, hs, z, h = HOMME_ECRAN.haut, r = HOMME_ECRAN.cote, strict = false) {
  const cw = e[3] * x + e[7] * hs + e[11] * z + e[15], cxp = e[0] * x + e[4] * hs + e[8] * z + e[12], cyp = e[1] * x + e[5] * hs + e[9] * z + e[13];
  if (!strict && cxp >= -1.08 * cw && cxp <= 1.08 * cw && cyp >= -1.15 * cw && cyp <= 1.15 * cw) return cw;
  const ht = hs + h, cwt = e[3] * x + e[7] * ht + e[11] * z + e[15];
  if (cw <= 0 || cwt <= 0) return -1;      // derrière la caméra
  const cxt = e[0] * x + e[4] * ht + e[8] * z + e[12], cyt = e[1] * x + e[5] * ht + e[9] * z + e[13];
  const rx = r * Math.hypot(e[0], e[8]), ry = r * Math.hypot(e[1], e[5], e[9]);
  if (!((cxp > -cw - rx && cxp < cw + rx) || (cxt > -cwt - rx && cxt < cwt + rx))) return -1;
  if ((cyp < -cw - ry && cyt < -cwt - ry) || (cyp > cw + ry && cyt > cwt + ry)) return -1;      // le segment pied-tête ne touche pas la bande de l'écran
  return cw;
}
