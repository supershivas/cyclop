// La lumière du labo lumière sur le relief DESSINÉ du jeu (session 2 du chantier `docs/chantiers/lumiere-vers-le-jeu.md`) : l'ouverture au ciel (`calculerAO`, huit horizons par case, canal G)
// et le soleil (`calculerSoleil`, la pente de l'obstacle le plus haut vers lui : une ombre DOUCE, canal R). Le dessin seulement : tout se lit du terrain (`hauteurQ`, en quarts de mètre) et du soleil du jeu
// (`soleil` : le bout de l'ombre d'un mètre de hauteur), rien n'est sauvegardé, aucun tirage.
// Une rangée dont `T.versionLigne` a bougé est refaite avec ses voisines (l'AO lit `rayonM` autour d'une case, le soleil `porteeM` vers lui), rangée par rangée dans un budget de millisecondes par image, comme
// `ombres-relief.js` : jamais de blocage de la boucle. Un soleil qui a assez bougé périme toutes les rangées du soleil. `tex` (RGBA, une case = un texel) est lu par le nuanceur du sol.
import { calculerAO, calculerSoleil } from '../lumiere/lumiere.js?v=0.114.0';
import { OMBRES_RELIEF as O } from '../data/soleil.js?v=0.114.0';

export const AO_SOL = { rayonM: 6, directions: 8, budgetMs: 2.5 };

// Le soleil du jeu (le bout de l'ombre `x, z` par mètre de hauteur) dans la forme du labo : la direction vers lui et sa hauteur ; null s'il n'y a pas de soleil (la nuit, le ciel couvert)
export function soleilDuJeu(x, z) {
  const n = Math.hypot(x, z); if (n < 0.05) return null;
  const h = Math.atan(1 / n), c = Math.cos(h);
  return { dir: [-x / n * c, Math.sin(h), -z / n * c], hauteur: h, jour: true };
}
// A-t-il assez bougé pour tout refaire ? (les seuils des ombres de relief du jeu : 2° environ, 6 % de longueur)
export function assezBouge(a, b) {
  if (!a || !b) return a !== b;
  const na = Math.hypot(a.x, a.z), nb = Math.hypot(b.x, b.z);
  if (Math.abs(na - nb) / Math.max(na, nb) > O.pasLongueur) return true;
  let d = Math.abs(Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)); if (d > Math.PI) d = 2 * Math.PI - d;
  return d > O.pasAngle;
}

export function creerAOSol({ hauteurQ, now = () => performance.now() }) {
  let T = null, M = null, L = null, vus = null, file = null, besoin = null, soleil = null, soleilCalcule = null, aoFait = false, solFait = false;
  const R = AO_SOL.rayonM, P = O.portee, AO = 1, SOL = 2;
  const attacher = terrain => {
    T = terrain; const n = T.W * T.H;
    M = { W: T.W, H: T.H, n, top: new Int16Array(n), cell: 1, cpm: 1 };
    L = { tex: new Uint8Array(n * 4).fill(255) };
    vus = new Uint32Array(T.H).fill(0xffffffff); file = []; besoin = new Uint8Array(T.H); soleilCalcule = null; aoFait = false; solFait = false; soleil = null;
  };
  const empiler = (j, quoi) => { if (j >= 0 && j < T.H) { if (!besoin[j]) file.push(j); besoin[j] |= quoi; } };
  // `veutAO`, `veutSoleil` : ce que le rendu utilise ; `s` : { x, z } le soleil du jeu. Rend vrai si la texture a changé.
  function maj(veutAO, veutSoleil, s, budgetMs = AO_SOL.budgetMs) {
    if (!T) return false;
    const quoi = (veutAO ? AO : 0) | (veutSoleil ? SOL : 0);
    if (!quoi) return false;
    for (let j = 0; j < T.H; j++) {                                       // les rangées dont le relief a changé : les hauteurs relues, leurs voisines à refaire
      if (vus[j] === T.versionLigne[j]) continue;
      for (let i = 0, c = j * T.W; i < T.W; i++, c++) M.top[c] = hauteurQ(T, c);
      vus[j] = T.versionLigne[j];
      if (aoFait && veutAO) for (let d = -R; d <= R; d++) empiler(j + d, AO);
      if (solFait && veutSoleil) for (let d = -P; d <= P; d++) empiler(j + d, SOL);
    }
    if (veutAO && !aoFait) { aoFait = true; for (let j = 0; j < T.H; j++) empiler(j, AO); }              // la première fois : tout
    if (veutSoleil && !solFait) { solFait = true; soleil = null; for (let j = 0; j < T.H; j++) empiler(j, SOL); }
    if (veutSoleil) {
      if (assezBouge(soleil, s) ) { soleil = { x: s.x, z: s.z }; soleilCalcule = soleilDuJeu(s.x, s.z); for (let j = 0; j < T.H; j++) empiler(j, SOL); }
    }
    if (!file.length) return false;
    file.sort((a, b) => a - b);
    const debut = now(); let fait = false;
    while (file.length && (now() - debut < budgetMs || !fait)) {
      const j = file.shift(), b = besoin[j]; besoin[j] = 0;
      const reg = { i0: 0, i1: T.W - 1, j0: j, j1: j };
      if ((b & AO) && veutAO) calculerAO(M, L, reg, R, AO_SOL.directions);
      if ((b & SOL) && veutSoleil && soleilCalcule) calculerSoleil(M, L, reg, soleilCalcule, P);
      fait = true;
    }
    return fait;
  }
  return { attacher, maj, get tex() { return L ? L.tex : null; }, get restant() { return file ? file.length : 0; }, get largeur() { return T ? T.W : 0; }, get hauteur() { return T ? T.H : 0; }, get soleilCalcule() { return soleilCalcule; } };
}
