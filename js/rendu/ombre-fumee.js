// L'ombre de la fumée sur le sol (session 3 du chantier lumière, « Éclairage : haut »). Les bouffées de fumée (`eclats.js`, sortes 2 et 10 : des points) projettent chacune une tache douce, le long du soleil, sur une
// petite grille (une texture R8 qui suit la vue) : plus le panache est épais, plus l'ombre est dense (les taches s'ajoutent), et un panache mince ne fait qu'une ombre pâle.
// C'est le pendant, sans seconde cible d'image, de l'épaisseur cumulée du labo lumière (js/lumiere/rendu.js, `passeOmbre`). Le dessin seulement : aucun tirage, rien de sauvegardé.
export const OMBRE_FUMEE = { taille: 192, opacite: 0.16, rayonMin: 1.6, sortes: [2, 10], sol: 3 };

// `ecl` : les tableaux de eclats.js ; `soleil` : { dx, dy, dz } vers le soleil (dy > 0) ; `vue` : { x0, z0, cote } le carré de sol que la grille couvre (mètres) ; `grille` : Float32Array(taille²) mise à zéro ici ;
// `solY` : la hauteur du sol sous la fumée (la moyenne : une bouffée ne projette pas plus loin que cela). Rend le nombre de bouffées semées.
export function semerOmbres(ecl, n, soleil, vue, grille, solY = OMBRE_FUMEE.sol, O = OMBRE_FUMEE) {
  const N = O.taille, k = N / vue.cote; let semees = 0; grille.fill(0);
  if (!(soleil.dy > 0.05)) return 0;
  for (let s = 0; s < n; s++) {
    if (ecl.age[s] > ecl.vie[s] || !O.sortes.includes(ecl.sorte[s])) continue;
    const haut = ecl.y[s] - solY; if (haut < 0) continue;
    const t = haut / soleil.dy, px = ecl.x[s] - soleil.dx * t, pz = ecl.z[s] - soleil.dz * t;      // où le rayon du soleil, passant par la bouffée, touche le sol
    const r = Math.max(O.rayonMin, ecl.taille[s] * 0.9) * k, ci = (px - vue.x0) * k, cj = (pz - vue.z0) * k;
    if (ci < -r || cj < -r || ci > N + r || cj > N + r) continue;
    const f = ecl.age[s] / ecl.vie[s], a = O.opacite * Math.min(1, (1 - f) * 3) * Math.min(1, f * 8 + 0.3);      // elle naît vite, s'efface sur la fin de sa vie
    const i0 = Math.max(0, Math.floor(ci - r)), i1 = Math.min(N - 1, Math.ceil(ci + r)), j0 = Math.max(0, Math.floor(cj - r)), j1 = Math.min(N - 1, Math.ceil(cj + r));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i + 0.5 - ci, j + 0.5 - cj) / r; if (d >= 1) continue;
      grille[j * N + i] += a * (1 - d * d);
    }
    semees++;
  }
  return semees;
}
// la grille (somme de taches, 0..∞) en octets (1 − exp(−somme), l'épaisseur optique d'une fumée) pour la texture
export function emballerOmbres(grille, octets) { for (let i = 0; i < grille.length; i++) octets[i] = Math.round((1 - Math.exp(-grille[i] * 2.2)) * 255); }
