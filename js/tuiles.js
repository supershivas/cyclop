/* Des tuiles d'essai : un petit terrain plat, dans un état donné, avec ou sans
   cratère ou soldat, peint par les MÊMES fonctions que le jeu (terrain.js,
   apparence.js). Lues par l'outil de lisibilité (lisibilite.config.mjs) et
   par le labo : ce qu'on y mesure est ce que le jeu affiche. Une tuile est une
   matrice de lettres de la palette (modules/sprites.js). */
import { ORDRE } from './palette.js?v=0.99.3';
import { creerTerrain, impact, ETAT } from './terrain.js?v=0.99.3';
import { couleurCase } from './apparence.js?v=0.99.3';

export { ETAT };
export const COTE = 9;

export function tuile(R, etatSol, { cratere = null, soldat = null, cote = COTE } = {}) {
  const T = creerTerrain(1, { largeur: cote, hauteur: cote, arbres: 0 }, R);
  T.base.fill(12); T.nappe.fill(-10);
  T.humid.fill({ [ETAT.SEC]: 0.1, [ETAT.HUMIDE]: 0.5, [ETAT.BOUE]: 0.9, [ETAT.EAU]: 0.9 }[etatSol]);
  if (etatSol === ETAT.EAU) T.eau.fill(0.3);
  if (cratere) impact(T, cote / 2, cote / 2, cratere, R);
  const rows = [];
  for (let j = 0; j < cote; j++) {
    let r = '';
    for (let i = 0; i < cote; i++) r += ORDRE[couleurCase(T, i, j, R)];
    rows.push(r);
  }
  // un soldat vu de près : le corps (la couleur de son camp) et son ombre (terre) au sud-est
  if (soldat) {
    const m = (cote - 1) / 2, put = (i, j, k) => { rows[j] = rows[j].slice(0, i) + k + rows[j].slice(i + 1); };
    put(m, m - 2, soldat); put(m, m - 1, soldat); put(m, m, soldat); put(m + 1, m + 1, 't');
  }
  return rows;
}
