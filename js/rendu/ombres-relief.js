// Les ombres du relief (labo « La lumière dans le relief ») : pour chaque case du terrain, « le soleil la voit-il ? ». Un relief d'au moins `seuilQ` quarts de mètre
// de plus qu'elle, vers le soleil, à une distance où son ombre arrive jusqu'à elle (même longueur d'ombre que celle des soldats : `soleil`, le bout de l'ombre
// d'un mètre de hauteur), la met à l'ombre. Le dessin seulement : tout se lit du terrain et du soleil, rien n'est sauvegardé, aucun tirage.
//
// Le masque (1 : à l'ombre) se calcule **à la demande, rangée par rangée** : quand le soleil a assez bougé ou que le terrain change, les rangées concernées sont
// seulement déclarées périmées (`versions[j]` monte) ; le rendu, qui sait quelles rangées sont à l'écran, demande `ligneA(j)` pour celles qu'il repeint.
// (Avant : un calcul complet de tout le champ puis la réécriture de toute la texture du sol d'un coup, ~250 ms de blocage à chaque échange.)
import { OMBRES_RELIEF as O } from '../data/soleil.js?v=0.72.0';

export function creerOmbresRelief({ hauteurQ }) {
  let T = null, W = 0, H = 0;
  let hq = null, hqVu = null, maxRang = null, maxQ = 0;          // la hauteur dessinée de chaque case (quarts), la version vue de chaque rangée, le maximum de chaque rangée
  let masque = null, versions = null, valide = null;             // le masque ; la version de chaque rangée ; le soleil (génération) pour lequel la rangée est calculée
  let courant = { x: 0, z: 0 }, generation = 1;                  // le soleil des rangées à jour, et son numéro
  let attente = O.delai;                                          // secondes depuis le dernier changement de soleil
  let changees = new Int32Array(1);                               // les colonnes de la dernière rangée calculée dont l'ombre a changé
  let msTotal = 0, rangeesCalculees = 0, changements = 0;        // mesure

  // combien de rangées voisines l'ombre d'un relief neuf atteint : sa portée (le plus haut relief du champ fait L fois sa hauteur d'ombre, `portee` au plus) projetée sur l'axe nord-sud
  function reach() {
    const n = Math.hypot(courant.x, courant.z);
    return n < 0.05 ? 0 : Math.ceil(Math.min(O.portee, Math.ceil(maxQ * 0.25 * n)) * Math.abs(courant.z) / n) + 1;
  }

  // la rangée j, comparée à ce qu'elle était : rend le nombre de cases dont l'ombre a changé (leurs colonnes sont dans `changees`)
  function calculer(j) {
    const n = Math.hypot(courant.x, courant.z);
    let nb = 0;
    if (n < 0.05) {
      for (let i = 0, c = j * W; i < W; i++, c++) if (masque[c]) { masque[c] = 0; changees[nb++] = i; }
      rangeesCalculees++; return nb;
    }
    const dx = -courant.x / n, dz = -courant.z / n, L = n;          // vers le soleil ; l'ombre fait L mètres par mètre de hauteur
    for (let i = 0; i < W; i++) {
      const c = j * W + i, h0 = hq[c];
      let ombre = 0;
      if (!T.profond[c]) {
        const K = Math.min(O.portee, Math.ceil((maxQ - h0) * 0.25 * L));      // au-delà, plus rien n'est assez haut
        for (let k = 1; k <= K; k++) {
          const x = i + 0.5 + dx * k, z = j + 0.5 + dz * k;
          if (x < 0 || z < 0 || x >= W || z >= H) break;
          const dh = hq[(z | 0) * W + (x | 0)] - h0;
          if (dh >= O.seuilQ && dh * 0.25 * L >= k) { ombre = 1; break; }
        }
      }
      if (masque[c] !== ombre) { masque[c] = ombre; changees[nb++] = i; }
    }
    rangeesCalculees++; return nb;
  }
  function lireHauteurs() {
    let change = false;
    const lues = [];
    for (let j = 0; j < H; j++) {
      if (hqVu[j] === T.versionLigne[j]) continue;
      let m = 0;
      for (let i = 0, c = j * W; i < W; i++, c++) { const q = hauteurQ(T, c); hq[c] = q; if (q > m) m = q; }
      hqVu[j] = T.versionLigne[j]; maxRang[j] = m; change = true; lues.push(j);
    }
    if (!change) return;
    maxQ = 0; for (let j = 0; j < H; j++) if (maxRang[j] > maxQ) maxQ = maxRang[j];
    const R = reach(), touchees = new Set();
    for (const j of lues) for (let d = -R; d <= R; d++) { const r = j + d; if (r >= 0 && r < H) touchees.add(r); }     // l'ombre d'un relief neuf atteint ses voisines
    for (const r of touchees) { valide[r] = 0; versions[r]++; }
  }
  function assezBouge(a, b) {
    const na = Math.hypot(a.x, a.z), nb = Math.hypot(b.x, b.z);
    if (na < 0.05 || nb < 0.05) return (na < 0.05) !== (nb < 0.05);
    if (Math.abs(na - nb) / Math.max(na, nb) > O.pasLongueur) return true;
    let d = Math.abs(Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)); if (d > Math.PI) d = 2 * Math.PI - d;
    return d > O.pasAngle;
  }
  function changerSoleil(s) {
    courant = { x: s.x, z: s.z }; generation++; attente = 0; changements++;
    valide.fill(0); for (let j = 0; j < H; j++) versions[j]++;
  }
  function attacher(terrain) {
    T = terrain; W = T.W; H = T.H;
    hq = new Int16Array(W * H); hqVu = new Uint32Array(H).fill(0xffffffff); maxRang = new Int16Array(H); maxQ = 0;
    changees = new Int32Array(W); masque = new Uint8Array(W * H); versions = new Uint32Array(H); valide = new Uint8Array(H);
    courant = { x: 0, z: 0 }; attente = O.delai;
  }

  // `actif` : l'option du rendu ; `soleil` : {x, z} (0 la nuit)
  function maj(actif, soleil, dt) {
    if (!T) return;
    const debut = performance.now();
    attente += dt;
    if (!actif) { if (courant.x !== 0 || courant.z !== 0) changerSoleil({ x: 0, z: 0 }); }
    else {
      lireHauteurs();
      if (attente >= O.delai && assezBouge(courant, soleil)) changerSoleil(soleil);
    }
    msTotal += performance.now() - debut;
  }
  // la rangée j du masque, à jour (calculée si besoin) : le rendu la lit juste après
  // rend le nombre de cases dont l'ombre a changé depuis la dernière fois que la rangée a été calculée (0 si elle était déjà à jour) ; leurs colonnes : `changees`
  function ligneA(j) {
    if (valide[j]) return 0;
    const debut = performance.now();
    const nb = calculer(j); valide[j] = 1;
    msTotal += performance.now() - debut;
    return nb;
  }

  return { attacher, maj, ligneA, get changees() { return changees; }, get masque() { return masque; }, get versions() { return versions; }, get calcule() { return courant; }, get mesure() { return { ms: msTotal, rangees: rangeesCalculees, changements }; } };
}
