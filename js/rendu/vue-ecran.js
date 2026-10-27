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
