/* Les tranchées : quatre lignes par camp, parallèles au front, en créneaux (des
   baies de tir et des pare-éclats), reliées par des boyaux ; chaque ligne est
   coupée en tronçons, qu'on prend et qu'on perd. Logique pure (aucun DOM, aucun
   hasard hors de la graine), testée dans Node.

   - Elles sont creusées dans `diff` à la création du terrain, avant que les
     impacts ne soient rejoués : la sauvegarde n'en garde rien (la graine et le
     secteur les refont), et les obus les comblent comme le reste du sol (leur
     lèvre retombe dedans) : un tronçon bouleversé ne protège plus.
   - Le tracé d'une ligne est une fonction de x (`ligneY`) : les ordres
     d'occuper une tranchée s'en servent pour poser les hommes dedans.
   - Un tronçon protège du tir qui vient de devant (le parapet), beaucoup moins
     de celui qui vient de derrière (le parados) : pris, il sert à l'envers. */
import { hash2 } from './lib/rng.js?v=0.34.1';

// Un bruit de valeurs lissé à une dimension (0..1) : le tracé d'une tranchée creusée à la main, jamais deux fois pareil (v0.29.0)
const lisse = u => u * u * (3 - 2 * u);
function bruit1(x, longueur, graine) {
  const f = x / longueur, i = Math.floor(f), u = lisse(f - i);
  return hash2(i, 5, graine) * (1 - u) + hash2(i + 1, 5, graine) * u;
}
/* Le tracé d'une ligne : t = { y0, amp, phase } (mètres, coordonnées du terrain ; `baie` n'est plus lu). Depuis la v0.29.0 (Jérôme : « tranchées moins
   géométriques ») : trois ondulations de longueurs 70, 28 et 11 m, de ±3,2, ±1,8 et ±0,9 m (à l'échelle de `amp` / 1,5), tirées de la phase de la ligne : un
   tracé qui serpente, des coudes irréguliers, plus les créneaux en carré d'avant. Reste une fonction de x seule. */
export function ligneY(t, x) {
  const g = Math.round(t.phase * 1000), k = (t.amp || 1.5) / 1.5;
  return t.y0 + k * ((bruit1(x, 70, g) - 0.5) * 6.4 + (bruit1(x, 28, g + 1) - 0.5) * 3.6 + (bruit1(x, 11, g + 2) - 0.5) * 1.8);
}
/* La demi-largeur de la tranchée en x : 1 à 1,5 m (deux cases au moins) : tantôt étroite, tantôt une niche. */
export const demiLargeur = (t, x) => 1 + 0.5 * bruit1(x, 17, Math.round(t.phase * 1000) + 3);

/* Les lignes d'un secteur (coordonnées du terrain) : [{ camp, rang, y0, amp,
   baie, phase, face }] ; face : le côté de l'ennemi (−1 : vers le nord). */
export function lignesDu(S, ox, oy, graine) {
  const T = S.tranchees, out = [];
  for (const [camp, ys] of [[0, T.lignes.nous], [1, T.lignes.eux]]) {
    ys.forEach((y, rang) => out.push({
      camp, rang, y0: oy + y, amp: T.creneau, baie: T.baie,
      phase: hash2(camp, rang, (graine | 0) + 17) * 6.283, face: camp === 0 ? -1 : 1,
    }));
  }
  return out;
}

/* Creuse les tranchées dans le terrain. Rend { lignes, troncons } et pose
   T.troncon (Int16Array : le tronçon d'une case de ligne, −2 un boyau, −1 ailleurs).
   troncons : [{ camp, ligne, x0, x1, n }] (n : ses cases). */
export function creuserTranchees(T, S, ox, oy, graine) {
  const C = S.tranchees, W = T.W, H = T.H;
  const prof = C.profondeur, parapet = C.parapet;
  const lignes = lignesDu(S, ox, oy, graine);
  const troncon = new Int16Array(W * H).fill(-1);
  const troncons = [];
  const creuser = c => { if (T.diff[c] > -prof) T.diff[c] = -prof; T.herbe[c] = 0; };
  lignes.forEach((L, l) => {
    // les tronçons de la ligne, dans le secteur seulement (au-delà, la tranchée continue sans enjeu)
    const premier = troncons.length;
    for (let x = 0; x < S.largeur; x += C.troncon) troncons.push({ camp: L.camp, ligne: l, x0: ox + x, x1: ox + Math.min(S.largeur, x + C.troncon), n: 0 });
    for (let i = 0; i < W; i++) {
      // les cases de la colonne : autour du tracé, sur sa largeur du moment (deux cases au moins, et le tracé ne bouge que de 0,3 case par colonne : rien ne se coupe)
      const yc = ligneY(L, i + 0.5), hw = demiLargeur(L, i + 0.5);
      const j0 = Math.round(yc - hw), j1 = Math.max(j0 + 2, Math.round(yc + hw));
      const k = i >= ox && i < ox + S.largeur ? premier + Math.floor((i - ox) / C.troncon) : -1;
      for (let j = Math.max(0, j0); j < Math.min(H, j1); j++) {
        const c = j * W + i;
        creuser(c);
        if (k >= 0 && troncon[c] < 0) { troncon[c] = k; troncons[k].n++; }
      }
      // le parapet : la terre jetée du côté de l'ennemi
      const jp = L.face < 0 ? j0 - 1 : j1;
      if (jp >= 0 && jp < H && T.diff[jp * W + i] >= 0) T.diff[jp * W + i] = parapet;
    }
  });
  // les boyaux : de la première ligne à la dernière de chaque camp, en zigzag
  for (const camp of [0, 1]) {
    const ls = lignes.filter(L => L.camp === camp);
    const ya = Math.min(...ls.map(L => L.y0)) - 3, yb = Math.max(...ls.map(L => L.y0)) + 3;
    for (let k = 0; k < C.boyaux; k++) {
      const X = ox + (k + 0.5) * S.largeur / C.boyaux + (hash2(camp, k, (graine | 0) + 23) - 0.5) * S.largeur / C.boyaux * 0.5;
      for (let j = Math.max(0, Math.floor(ya)); j < Math.min(H, Math.ceil(yb)); j++) {
        // (un boyau qui serpente, plus le zigzag en carré d'avant la v0.29.0)
        const ph = hash2(camp, k, (graine | 0) + 29) * 6.283, xb = X + 3.2 * Math.sin(j / 11 + ph) + 1.4 * Math.sin(j / 4.3 + ph * 2);
        const i0 = Math.round(xb - 1), i1 = Math.max(i0 + 2, Math.round(xb + 1));
        for (let i = Math.max(0, i0); i < Math.min(W, i1); i++) { const c = j * W + i; creuser(c); if (troncon[c] === -1) troncon[c] = -2; }
      }
    }
  }
  T.troncon = troncon;
  T.version++;
  return { lignes, troncons };
}

/* La ligne la plus proche du point (x, y) si le point est dans une tranchée de
   ligne (à 3 m près), sinon null. */
export function ligneSous(lignes, x, y) {
  let best = null, bd = 3;
  for (const L of lignes) {
    const d = Math.abs(ligneY(L, x) - y);
    if (d < bd) { bd = d; best = L; }
  }
  return best;
}
