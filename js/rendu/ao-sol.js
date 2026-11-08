// La lumière du labo lumière sur le relief DESSINÉ du jeu (session 2 du chantier `docs/chantiers/lumiere-vers-le-jeu.md`) : l'ouverture au ciel (`calculerAO`, huit horizons par case, canal G)
// et le soleil (`calculerSoleil`, la pente de l'obstacle le plus haut vers lui : une ombre DOUCE, canal R). Le dessin seulement : tout se lit du terrain (`hauteurQ`, en quarts de mètre) et du soleil du jeu
// (`soleil` : le bout de l'ombre d'un mètre de hauteur), rien n'est sauvegardé, aucun tirage.
// Une rangée dont `T.versionLigne` a bougé est refaite avec ses voisines (l'AO lit `rayonM` autour d'une case, le soleil `porteeM` vers lui), rangée par rangée dans un budget de millisecondes par image, comme
// `ombres-relief.js` : jamais de blocage de la boucle. Un soleil qui a assez bougé périme toutes les rangées du soleil. `tex` (RGBA, une case = un texel) est lu par le nuanceur du sol.
import { calculerAO, calculerSoleil, calculerFlood, calculerCavite } from '../lumiere/lumiere.js?v=0.128.1';
import { OMBRES_RELIEF as O } from '../data/soleil.js?v=0.128.1';

export const AO_SOL = { rayonM: 6, directions: 8, budgetMs: 2.5 };
// Les abris (les toits de bois, `T.toit` : 1 sur les cases couvertes) : la lumière propagée du labo (`calculerFlood`, canal B) : le jour entre par les bouts et perd 1/15 par mètre.
// Le plafond d'une case couverte est à `HAUT_ABRI_Q` quarts au-dessus du fond de la tranchée (2 m : à hauteur d'homme) ; un parapet (le fond plus haut de 2 m ou plus) ne laisse rien passer.
export const ABRIS = { hautQ: 8, epaisseurQ: 2, cubeQ: 4, margeM: 20 };

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
  let T = null, M = null, L = null, vus = null, file = null, besoin = null, soleil = null, soleilCalcule = null, aoFait = false, solFait = false, abriFait = false, cavFait = false, regions = [], couverts = null;
  const R = AO_SOL.rayonM, P = O.portee, AO = 1, SOL = 2, CAV = 8, CAV_RAYON = 3;      // la cavité lit les cases à 3 m
  const attacher = terrain => {
    T = terrain; const n = T.W * T.H;
    M = { W: T.W, H: T.H, n, top: new Int16Array(n), toit: new Int16Array(n), cell: 1, cpm: 1, roofQ: ABRIS.epaisseurQ, cubeQ: ABRIS.cubeQ };
    M.sol = M.top;
    L = { tex: new Uint8Array(n * 4).fill(255) };
    vus = new Uint32Array(T.H).fill(0xffffffff); file = []; besoin = new Uint8Array(T.H); soleilCalcule = null; aoFait = false; solFait = false; soleil = null; abriFait = false; cavFait = false; regions = [];
    couverts = new Uint16Array(T.H); if (T.toit) for (let c = 0; c < n; c++) if (T.toit[c]) couverts[(c / T.W) | 0]++;
  };
  // les régions (bandes de rangées pleine largeur) à refaire autour des rangées couvertes : fusionnées, avec la marge où la lumière porte
  const bandesAbris = (j0, j1) => {
    const o = []; let d = -1, f = -1;
    for (let j = Math.max(0, j0); j <= Math.min(T.H - 1, j1); j++) if (couverts[j]) { const a = Math.max(0, j - ABRIS.margeM), b = Math.min(T.H - 1, j + ABRIS.margeM); if (d >= 0 && a <= f + 1) f = b; else { if (d >= 0) o.push({ i0: 0, i1: T.W - 1, j0: d, j1: f }); d = a; f = b; } }
    if (d >= 0) o.push({ i0: 0, i1: T.W - 1, j0: d, j1: f });
    return o;
  };
  const empiler = (j, quoi) => { if (j >= 0 && j < T.H) { if (!besoin[j]) file.push(j); besoin[j] |= quoi; } };
  // `veutAO`, `veutSoleil` : ce que le rendu utilise ; `s` : { x, z } le soleil du jeu. Rend vrai si la texture a changé.
  function maj(veutAO, veutSoleil, s, budgetMs = AO_SOL.budgetMs, veutAbris = false, veutFlaques = false) {
    if (!T) return false;
    const quoi = (veutAO ? AO : 0) | (veutSoleil ? SOL : 0) | (veutAbris ? 4 : 0) | (veutFlaques ? CAV : 0);
    if (!quoi) return false;
    for (let j = 0; j < T.H; j++) {                                       // les rangées dont le relief a changé : les hauteurs relues, leurs voisines à refaire
      if (vus[j] === T.versionLigne[j]) continue;
      for (let i = 0, c = j * T.W; i < T.W; i++, c++) { const q = hauteurQ(T, c); M.top[c] = q; M.toit[c] = T.toit && T.toit[c] ? q + ABRIS.hautQ + ABRIS.epaisseurQ : 0; }
      vus[j] = T.versionLigne[j];
      if (aoFait && veutAO) for (let d = -R; d <= R; d++) empiler(j + d, AO);
      if (solFait && veutSoleil) for (let d = -P; d <= P; d++) empiler(j + d, SOL);
      if (cavFait && veutFlaques) for (let d = -CAV_RAYON; d <= CAV_RAYON; d++) empiler(j + d, CAV);
      if (abriFait && veutAbris) for (const r of bandesAbris(j - 2, j + 2)) regions.push(r);
    }
    if (veutAO && !aoFait) { aoFait = true; for (let j = 0; j < T.H; j++) empiler(j, AO); }              // la première fois : tout
    if (veutFlaques && !cavFait) { cavFait = true; for (let j = 0; j < T.H; j++) empiler(j, CAV); }
    if (veutSoleil && !solFait) { solFait = true; soleil = null; for (let j = 0; j < T.H; j++) empiler(j, SOL); }
    if (veutSoleil) {
      if (assezBouge(soleil, s) ) { soleil = { x: s.x, z: s.z }; soleilCalcule = soleilDuJeu(s.x, s.z); for (let j = 0; j < T.H; j++) empiler(j, SOL); }
    }
    if (veutAbris && !abriFait) { abriFait = true; regions.push(...bandesAbris(0, T.H - 1)); }
    if (!file.length && !regions.length) return false;
    file.sort((a, b) => a - b);
    const debut = now(); let fait = false;
    while ((file.length || regions.length) && (now() - debut < budgetMs || !fait)) {
      if (regions.length) { calculerFlood(M, L, regions.shift()); fait = true; continue; }
      const j = file.shift(), b = besoin[j]; besoin[j] = 0;
      const reg = { i0: 0, i1: T.W - 1, j0: j, j1: j };
      if ((b & AO) && veutAO) calculerAO(M, L, reg, R, AO_SOL.directions);
      if ((b & CAV) && veutFlaques) calculerCavite(M, L, reg);
      if ((b & SOL) && veutSoleil && soleilCalcule) calculerSoleil(M, L, reg, soleilCalcule, P);
      fait = true;
    }
    return fait;
  }
  return { attacher, maj, get tex() { return L ? L.tex : null; }, get restant() { return file ? file.length + regions.length : 0; }, get largeur() { return T ? T.W : 0; }, get hauteur() { return T ? T.H : 0; }, get soleilCalcule() { return soleilCalcule; } };
}
