// L'ouverture au ciel du terrain (session 2 du chantier `docs/chantiers/lumiere-vers-le-jeu.md`) : le calcul du labo lumière (`calculerAO`, huit horizons par case) sur le relief DESSINÉ du jeu.
// Le dessin seulement : tout se lit du terrain (`hauteurQ`, en quarts de mètre), rien n'est sauvegardé, aucun tirage. Une rangée dont `T.versionLigne` a bougé est refaite avec ses `rayon` voisines de chaque côté
// (l'AO d'une case lit jusqu'à `rayon` mètres autour d'elle), rangée par rangée dans un budget de millisecondes par image : comme `ombres-relief.js`, jamais de blocage de la boucle.
// `tex` (RGBA, une case = un texel, l'ouverture dans le canal G : 255 = ciel ouvert) est lu par le nuanceur du sol.
import { calculerAO } from '../lumiere/lumiere.js?v=0.114.0';

export const AO_SOL = { rayonM: 6, directions: 8, budgetMs: 2.5 };

export function creerAOSol({ hauteurQ, now = () => performance.now() }) {
  let T = null, M = null, L = null, vus = null, file = null, enFile = null;
  const R = AO_SOL.rayonM;
  const attacher = terrain => {
    T = terrain; const n = T.W * T.H;
    M = { W: T.W, H: T.H, n, top: new Int16Array(n), cell: 1, cpm: 1 };
    L = { tex: new Uint8Array(n * 4).fill(255) };
    vus = new Uint32Array(T.H).fill(0xffffffff); file = []; enFile = new Uint8Array(T.H);
  };
  const empiler = j => { if (j >= 0 && j < T.H && !enFile[j]) { enFile[j] = 1; file.push(j); } };
  // `budgetMs` : le temps accordé à cette image ; rend vrai si la texture a changé
  function maj(budgetMs = AO_SOL.budgetMs) {
    if (!T) return false;
    for (let j = 0; j < T.H; j++) {                                       // les rangées dont le relief a changé : les hauteurs relues, leurs voisines à refaire
      if (vus[j] === T.versionLigne[j]) continue;
      for (let i = 0, c = j * T.W; i < T.W; i++, c++) M.top[c] = hauteurQ(T, c);
      vus[j] = T.versionLigne[j];
      for (let d = -R; d <= R; d++) empiler(j + d);
    }
    if (!file.length) return false;
    file.sort((a, b) => a - b);
    const debut = now(); let fait = false;
    while (file.length && (now() - debut < budgetMs || !fait)) {
      const j = file.shift(); enFile[j] = 0;
      calculerAO(M, L, { i0: 0, i1: T.W - 1, j0: j, j1: j }, R, AO_SOL.directions); fait = true;
    }
    return fait;
  }
  return { attacher, maj, get tex() { return L ? L.tex : null; }, get restant() { return file ? file.length : 0; }, get largeur() { return T ? T.W : 0; }, get hauteur() { return T ? T.H : 0; } };
}
