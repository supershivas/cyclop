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
import { hash2 } from './lib/rng.js?v=0.12.1';

/* Le tracé d'une ligne : t = { y0, amp, baie, phase } (mètres, coordonnées du
   terrain). Les baies alternent d'un côté et de l'autre (les créneaux), et la
   ligne ondule doucement (creusée à la main, en suivant le terrain). */
export function ligneY(t, x) {
  const b = Math.floor(x / t.baie);
  return t.y0 + ((b & 1) ? t.amp : -t.amp) + 2.5 * Math.sin(x / 41 + t.phase);
}

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
      // la case de la colonne et le pas avec la colonne d'avant (un pare-éclats) : tout est creusé
      const a = ligneY(L, i + 0.5), b = ligneY(L, i - 0.5);
      const j0 = Math.round(Math.min(a, b) - 1), j1 = Math.round(Math.max(a, b) + 1);
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
        const xb = X + ((Math.floor(j / 6) & 1) ? 1.5 : -1.5), xp = X + ((Math.floor((j - 1) / 6) & 1) ? 1.5 : -1.5);
        const i0 = Math.round(Math.min(xb, xp) - 1), i1 = Math.round(Math.max(xb, xp) + 1);
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
