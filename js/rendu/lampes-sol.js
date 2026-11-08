// Les lanternes du jeu éclairent le sol, CACHÉES PAR LE RELIEF (session 3 du chantier lumière, « Éclairage : haut ») : la couche de lampes du labo lumière (`ajouterLampe` : une courbe douce de la distance, quelques échantillons de visibilité le long du segment
// lampe → case) sur le relief dessiné du jeu. Le parapet d'une tranchée cache sa lanterne à la plaine, le fond d'un cratère reste dans le noir. Les lanternes viennent de `temps.js` (celles qu'on voit, au plus 120 : `lanternesVues`).
// Une lanterne apparue ou disparue ajoute ou retire sa lumière ; rien n'est recalculé pour les autres. Le dessin seulement.
import { ajouterLampe } from '../lumiere/lampes.js?v=0.128.1';

export const LAMPES_SOL = { rayonM: 11, force: 0.6, parImage: 24, rangeesParImage: 60 };

export function creerLampesSol({ hauteur }) {            // `hauteur(x, z)` : le sol en mètres, dans le même repère que les lanternes
  let T = null, M = null, hf = null, acc = null, tex = null, pret = 0, actives = new Map(), sale = false;
  const attacher = terrain => { T = terrain; M = { W: T.W, H: T.H, cpm: 1, cell: 1 }; hf = new Float32Array(T.W * T.H); acc = new Float32Array(T.W * T.H); tex = new Uint8Array(T.W * T.H); pret = 0; actives = new Map(); sale = true; };
  const emballer = r => { for (let j = r.j0; j <= r.j1; j++) for (let i = r.i0; i <= r.i1; i++) { const k = j * M.W + i, v = acc[k]; tex[k] = v >= 1 ? 255 : v <= 0.003 ? 0 : (v * 255) | 0; } };
  // `lanternes` : [[x, y, z], …] ; rend vrai si la couche a changé
  function maj(lanternes) {
    if (!T) return false;
    for (let n = 0; n < LAMPES_SOL.rangeesParImage && pret < T.H; n++, pret++) for (let i = 0; i < T.W; i++) hf[pret * T.W + i] = hauteur(i + 0.5, pret + 0.5);       // le relief, rangée par rangée
    if (pret < T.H) return false;
    const voulues = new Map(); for (const l of lanternes) voulues.set(`${Math.round(l[0])},${Math.round(l[2])}`, l);
    let faits = 0, change = false;
    for (const [cle, l] of actives) if (!voulues.has(cle)) { emballer(ajouterLampe(M, hf, l, acc, -1)); actives.delete(cle); change = true; }
    for (const [cle, l] of voulues) {
      if (actives.has(cle)) continue; if (faits >= LAMPES_SOL.parImage) break;
      const lampe = { x: l[0], y: l[1], z: l[2], rayon: LAMPES_SOL.rayonM, force: LAMPES_SOL.force };
      emballer(ajouterLampe(M, hf, lampe, acc, 1)); actives.set(cle, lampe); faits++; change = true;
    }
    if (change) sale = true;
    return change;
  }
  return { attacher, maj, get tex() { return tex; }, get largeur() { return T ? T.W : 0; }, get hauteur() { return T ? T.H : 0; }, get actives() { return actives.size; } };
}
