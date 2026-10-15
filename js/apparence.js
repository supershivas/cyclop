/* L'apparence d'une case : l'indice de sa couleur dans la palette, d'après son
   état (sec, humide, boue, eau, glace) et ce que les obus en ont fait (creusé :
   plus sombre ; terre jetée : plus claire). Partagée par le rendu (la texture du sol), le labo et
   l'outil de lisibilité : ce qu'on y mesure est ce que le jeu affiche.
   Les faces verticales (les parois tournées vers nous) d'au moins un demi-mètre
   prennent le ton plus sombre (OMBRE) ; une marche d'un quart garde la couleur
   du dessus (sinon chaque courbe de niveau des bosses se lit comme un trou). */
import { INDICE, ORDRE } from './palette.js?v=0.10.0';
import { ETAT, etat, hauteurQ } from './terrain.js?v=0.10.0';

const I = INDICE;
// [terre jetée (plus claire), plat, creusé ou à l'ombre]
export const TONS = {
  [ETAT.SEC]: [I.h, I.h, I.g],
  [ETAT.HUMIDE]: [I.h, I.g, I.b],
  [ETAT.BOUE]: [I.g, I.b, I.s],
  [ETAT.EAU]: [I.e, I.e, I.e],
  [ETAT.GLACE]: [I.r, I.r, I.e],
};
// la paroi sous une case de cette couleur
export const OMBRE = { h: 'g', g: 'b', b: 's', s: 't', t: 't', e: 's', r: 'g', o: 'r', n: 'n', x: 'x' };

export function couleurCase(T, i, j, R, gel = false) {
  const c = j * T.W + i;
  const e = etat(T, c, R, gel);
  if (e === ETAT.EAU || e === ETAT.GLACE) {
    // des rides claires : l'eau se lit par sa forme, pas seulement par sa couleur
    return ((i * 3 + j * 7) % 11 === 0) ? I.r : TONS[e][1];
  }
  // des caillebotis : des planches en travers, claires et sombres
  if (T.caille[c]) return i % 2 ? I.h : I.g;
  // un cratère se lit d'un coup d'œil : le creux plus sombre, la lèvre de terre jetée plus claire
  // (les bosses, elles, se lisent par leurs parois : une trame de pente faisait du bruit partout)
  const d = T.diff[c];
  // l'herbe : des taches éparses (d'autant plus que l'herbe est drue), sur le sol plat, sec ou humide ;
  // éparses à dessein : un damier sur tout le sol faisait du bruit partout (v0.1.0)
  const hb = T.herbe ? T.herbe[c] : 0;
  if (hb && d === 0 && e <= ETAT.HUMIDE) {
    const hsh = ((i * 2654435761) ^ (j * 40503)) >>> 0;
    if (hsh % [0, 41, 19, 9][hb] === 0) return e === ETAT.SEC ? I.g : I.h;     // une tache seule, sans lèvre : un cratère a la sienne, plus claire
  }
  if (d >= 0) return TONS[e][d > 0 ? 0 : 1];
  // un trou : le creux un ton plus sombre ; plus profond, plus sombre encore (un mètre, puis deux et demi) ; et un ton
  // de plus au pied des parois (une case entourée de plus haut d'un mètre, sur trois côtés) : sans cela, un cratère
  // ou une tranchée se lisaient comme une tache, sans profondeur (Jérôme, v0.9.1)
  let k = (d <= -4 ? 1 : 0) + (d <= -10 ? 1 : 0);
  const h = hauteurQ(T, c) + 4;
  let hauts = 0;
  if (i > 0 && hauteurQ(T, c - 1) >= h) hauts++;
  if (i < T.W - 1 && hauteurQ(T, c + 1) >= h) hauts++;
  if (j > 0 && hauteurQ(T, c - T.W) >= h) hauts++;
  if (j < T.H - 1 && hauteurQ(T, c + T.W) >= h) hauts++;
  if (hauts >= 3) k++;
  return plusSombre(TONS[e][2], k);
}
// la couleur n tons plus sombre (la suite des parois : herbe morte → glaise → boue → boue sombre → terre)
const SOMBRE = ORDRE.map(l => INDICE[OMBRE[l]]);
function plusSombre(idx, n) { for (let k = 0; k < n; k++) idx = SOMBRE[idx]; return idx; }

// Toute une rangée, dans un tableau d'octets (la texture du sol)
export function couleursLigne(T, j, R, gel, out) {
  const o = j * T.W;
  for (let i = 0; i < T.W; i++) out[o + i] = couleurCase(T, i, j, R, gel);
}
