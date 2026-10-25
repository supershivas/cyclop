// Les ombres du relief (labo « La lumière dans le relief ») : pour chaque case du terrain, « le soleil la voit-il ? ». Un relief d'au moins `seuilQ` quarts de mètre
// de plus qu'elle, vers le soleil, à une distance où son ombre arrive jusqu'à elle (même longueur d'ombre que celle des soldats : `soleil`, le bout de l'ombre
// d'un mètre de hauteur), la met à l'ombre. Le dessin seulement : tout se lit du terrain et du soleil, rien n'est sauvegardé, aucun tirage.
//
// Le masque (1 : à l'ombre) est refait par rangées, dans un budget de ms par image :
//  - quand le soleil a assez bougé : une seconde mémoire est calculée en entier, puis échangée d'un coup (pas de balayage visible à l'écran) ;
//  - quand le terrain change (un obus) : seules les rangées touchées, et celles que l'ombre atteint, sont refaites sur place.
// `versions[j]` monte quand la rangée j du masque a changé : le rendu y relit ce qu'il doit repeindre dans la texture du sol.
import { OMBRES_RELIEF as O } from '../data/soleil.js?v=0.66.3';

export function creerOmbresRelief({ hauteurQ }) {
  let T = null, W = 0, H = 0;
  let hq = null, hqVu = null, maxRang = null, maxQ = 0;          // la hauteur dessinée de chaque case (quarts), la version vue de chaque rangée, le maximum de chaque rangée
  let masque = null, suivant = null, versions = null;
  let courant = { x: 0, z: 0 };                                   // le soleil du masque en place
  let visee = null, ligneVisee = 0;                               // le soleil du calcul complet en cours, et sa prochaine rangée
  let attente = 0, sales = new Set(), apres = new Set();         // rangées à refaire sur place ; celles qui changent pendant un calcul complet (refaites après l'échange)

  const rangees = Math.ceil(O.portee);                            // une rangée est atteinte par des reliefs à `portee` rangées au plus

  function ligne(j, sol, sortie) {
    const n = Math.hypot(sol.x, sol.z);
    if (n < 0.05) { sortie.fill(0, j * W, (j + 1) * W); return; }
    const dx = -sol.x / n, dz = -sol.z / n, L = n;                  // vers le soleil ; l'ombre fait L mètres par mètre de hauteur
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
      sortie[j * W + i] = ombre;
    }
  }
  function ligneChangee(j) {
    // refaite sur place : y a-t-il eu un changement ?
    const avant = masque.slice(j * W, (j + 1) * W);
    ligne(j, courant, masque);
    for (let i = 0; i < W; i++) if (masque[j * W + i] !== avant[i]) { versions[j]++; return; }
  }
  function lireHauteurs() {
    for (let j = 0; j < H; j++) {
      if (hqVu[j] === T.versionLigne[j]) continue;
      let m = 0;
      for (let i = 0, c = j * W; i < W; i++, c++) { const q = hauteurQ(T, c); hq[c] = q; if (q > m) m = q; }
      hqVu[j] = T.versionLigne[j]; maxRang[j] = m;
      for (let d = -rangees; d <= rangees; d++) { const r = j + d; if (r >= 0 && r < H) { sales.add(r); if (visee) apres.add(r); } }
    }
    maxQ = 0; for (let j = 0; j < H; j++) if (maxRang[j] > maxQ) maxQ = maxRang[j];
  }
  function assezBouge(a, b) {
    const na = Math.hypot(a.x, a.z), nb = Math.hypot(b.x, b.z);
    if (na < 0.05 || nb < 0.05) return (na < 0.05) !== (nb < 0.05);
    if (Math.abs(na - nb) / Math.max(na, nb) > O.pasLongueur) return true;
    let d = Math.abs(Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)); if (d > Math.PI) d = 2 * Math.PI - d;
    return d > O.pasAngle;
  }
  function attacher(terrain) {
    T = terrain; W = T.W; H = T.H;
    hq = new Int16Array(W * H); hqVu = new Uint32Array(H).fill(0xffffffff); maxRang = new Int16Array(H);
    masque = new Uint8Array(W * H); suivant = new Uint8Array(W * H); versions = new Uint32Array(H);
    courant = { x: 0, z: 0 }; visee = null; sales = new Set(); apres = new Set(); attente = 0;
  }

  // `actif` : l'option du rendu ; `soleil` : {x, z} (0 la nuit) ; rend vrai si une rangée du masque a changé
  function maj(actif, soleil, dt) {
    if (!T) return false;
    if (!actif) {
      if (courant.x === 0 && courant.z === 0) return false;
      masque.fill(0); courant = { x: 0, z: 0 }; visee = null; for (let j = 0; j < H; j++) versions[j]++;
      return true;
    }
    const t0 = performance.now();
    let change = false;
    attente += dt;
    lireHauteurs();
    // le soleil a bougé : un calcul complet, rangée après rangée, dans une seconde mémoire
    if (!visee && attente >= O.delai && assezBouge(courant, soleil)) { visee = { x: soleil.x, z: soleil.z }; ligneVisee = 0; apres = new Set(); }
    if (visee) {
      while (ligneVisee < H && performance.now() - t0 < O.budgetMs) ligne(ligneVisee++, visee, suivant);
      if (ligneVisee >= H) {
        [masque, suivant] = [suivant, masque];
        courant = visee; visee = null; attente = 0;
        for (let j = 0; j < H; j++) versions[j]++;
        sales = apres; apres = new Set();
        change = true;
      }
      return change;
    }
    // le terrain a changé : les rangées touchées, sur place
    for (const j of sales) {
      if (performance.now() - t0 >= O.budgetMs) break;
      sales.delete(j); ligneChangee(j); change = true;
    }
    return change;
  }
  return { attacher, maj, get masque() { return masque; }, get versions() { return versions; }, get calcule() { return courant; }, get enCours() { return !!visee || sales.size > 0; } };
}
