/* L'apparence d'une case : l'indice de sa couleur dans la palette, d'après son
   état (sec, humide, boue, eau, glace) et ce que les obus en ont fait (creusé :
   plus sombre ; terre jetée : plus claire). Partagée par le rendu (la texture du sol), le labo et
   l'outil de lisibilité : ce qu'on y mesure est ce que le jeu affiche.
   Les faces verticales (les parois tournées vers nous) d'au moins un demi-mètre
   prennent le ton plus sombre (OMBRE) ; une marche d'un quart garde la couleur
   du dessus (sinon chaque courbe de niveau des bosses se lit comme un trou). */
import { INDICE } from './palette.js?v=0.10.0';
import { ETAT, etat } from './terrain.js?v=0.10.0';

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
export const OMBRE = { h: 'g', g: 'b', b: 's', s: 't', t: 't', e: 's', r: 'g', o: 'r', n: 'n', x: 'x', v: 'w', w: 's' };

/* Le sol vert (le labo compare, Jérôme v0.9.3) : 0 aucun vert (la v0.9.2), 1 « taches » (l'herbe éparse est verte au lieu de glaise),
   2 « nuances » (de grandes plaques d'une dizaine de mètres, vertes dans le sec et l'humide), 3 « prairie » (le plus du sec est vert, le brun
   n'est plus que des plaques). Le dessin seulement : le terrain ne change pas. */
const VERDURE_DEFAUT = 2;                  // le jeu : des plaques de vert discrètes (Jérôme, v0.9.3)
let VERDURE = VERDURE_DEFAUT;
export const reglerVerdure = (m = VERDURE_DEFAUT) => { VERDURE = m; };
const bruit = (i, j, k) => (((Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791)) >>> 0) % 1000) / 1000;
// un bruit doux (valeur interpolée) : des plaques aux bords arrondis, pas des carrés ; échelle en mètres
const lisse = (x, y, echelle, k) => {
  const u = x / echelle, v = y / echelle, i = Math.floor(u), j = Math.floor(v);
  const fu = u - i, fv = v - j, a = fu * fu * (3 - 2 * fu), b = fv * fv * (3 - 2 * fv);
  return (bruit(i, j, k) * (1 - a) + bruit(i + 1, j, k) * a) * (1 - b) + (bruit(i, j + 1, k) * (1 - a) + bruit(i + 1, j + 1, k) * a) * b;
};

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
    if (hsh % [0, 41, 19, 9][hb] === 0) return VERDURE ? (e === ETAT.SEC ? I.v : I.w) : e === ETAT.SEC ? I.g : I.h;     // une tache seule, sans lèvre : un cratère a la sienne, plus claire
  }
  if (VERDURE >= 2 && d === 0 && e <= ETAT.HUMIDE) {
    // des plaques d'une dizaine de mètres aux bords arrondis : le même sol, plus ou moins verdi ; le bord d'une plaque est irrégulier d'une case à l'autre
    const n = lisse(i, j, 14, 5) * 0.75 + lisse(i, j, 5, 7) * 0.25 + (bruit(i, j, 9) - 0.5) * 0.08, seuil = VERDURE === 3 ? 0.58 : 0.4;
    if (n < seuil) return e === ETAT.SEC ? (n < seuil * 0.4 ? I.w : I.v) : I.w;
  }
  return TONS[e][d > 0 ? 0 : d < 0 ? 2 : 1];
}

// Toute une rangée, dans un tableau d'octets (la texture du sol)
export function couleursLigne(T, j, R, gel, out) {
  const o = j * T.W;
  for (let i = 0; i < T.W; i++) out[o + i] = couleurCase(T, i, j, R, gel);
}
