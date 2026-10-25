/* La foule des soldats : une copie divergente de js/swarm.js de « Pierre et
   les rats » (la nuée), pensée pour des milliers d'individus.

   Ce qui vient de la nuée :
   - une « structure de tableaux » typés (aucun objet par soldat, aucun
     ramasse-miettes), des boucles serrées ;
   - le voisinage par grille spatiale (cases de GRILLE m), reconstruite à chaque
     pas par tri par comptage : O(n) ;
   - le pilotage à la Reynolds (séparation, une errance légère) plus un but.

   Ce qui change :
   - le but n'est plus « Pierre » : chaque soldat a une place dans la formation
     de son régiment (un ordre = un point, un front, une largeur) ; loin de sa
     place, il suit le champ de coûts de l'ordre (champs.js), qui contourne la
     boue, l'eau et les marches de deux mètres ;
   - la vitesse dépend de la case : sec, humide, boue, eau (terrain.js), et de
     la marche à franchir (un mètre : très lent ; deux mètres : on escalade) ;
   - deux camps : la grille de densité (carrés de DENSITE m, par camp) sert au
     tir, par cône vers le front ; la victime est prise dans la grille fine ;
   - chaque soldat a un numéro (son nom en découle, identite.js), une fatigue
     des jambes et des bras, une blessure, une peur : les jambes lourdes ou
     blessées le ralentissent, un bras blessé le fait tirer moins, la terreur
     l'empêche de tirer ; une balle ou un obus blessent ou tuent ;
   - aucun hasard hors de la graine : il vient du générateur à graine de la bataille
     (rng.js), pour que la même graine rejoue la même bataille.

   Logique pure : aucun DOM. Le rendu lit les tableaux (rendu3d.js). */
import { hauteurQ, vitesseCase } from './terrain.js?v=0.71.0';
import { ligneY } from './tranchees.js?v=0.71.0';
import { caracteristiques } from './identite.js?v=0.71.0';

export const GRILLE = 2;           // m : cases de voisinage
export const DENSITE = 8;          // m : carrés de densité (tir)

export function creerArmee({ capacite, W, H }) {
  const f32 = () => new Float32Array(capacite);
  const gw = Math.ceil(W / GRILLE), gh = Math.ceil(H / GRILLE);
  const dw = Math.ceil(W / DENSITE), dh = Math.ceil(H / DENSITE);
  return {
    capacite, W, H, n: 0,
    x: f32(), y: f32(), vx: f32(), vy: f32(), rnd: f32(), tirT: f32(), coince: f32(),
    camp: new Uint8Array(capacite), reg: new Uint16Array(capacite), slot: new Uint16Array(capacite),
    mort: new Uint8Array(capacite),
    // qui il est et ce qu'il endure (0 à 1 ; blessure : 0 aucune, 1 bras, 2 jambe, 3 tête)
    // ses caractéristiques (identite.js : de 0 à 100) : l'adresse au tir, la force, l'endurance, le calme
    // (des nombres à virgule : elles évoluent par petits gains, `gagner` et `perdre`) ; `…0` : leur valeur au début de la bataille (la tendance de la fiche, le plafond de progression) ; `palier` : un bit par caractéristique qui vient de changer de mot (le carnet, jamais sauvegardé)
    adresse: f32(), force: f32(), endurance: f32(), calme: f32(),
    adresse0: new Uint8Array(capacite), force0: new Uint8Array(capacite), endurance0: new Uint8Array(capacite), calme0: new Uint8Array(capacite), palier: new Uint8Array(capacite),
    // le corps à corps de ce pas (jamais sauvegardé : refait à chaque pas) : 1 s'il se bat, et l'angle où est son adversaire (dessin)
    duel: new Uint8Array(capacite), duelAng: f32(),
    id: new Uint32Array(capacite), fatJ: f32(), fatB: f32(), peur: f32(), blessure: new Uint8Array(capacite), exp: f32(), victimes: new Uint16Array(capacite),
    // la grille de voisinage (tri par comptage)
    gw, gh, cellCount: new Int32Array(gw * gh), cellStart: new Int32Array(gw * gh + 1),
    sorted: new Int32Array(capacite), cellOf: new Int32Array(capacite),
    // la densité par camp
    dw, dh, dens: [new Uint16Array(dw * dh), new Uint16Array(dw * dh)],
  };
}

// ─── Les caractéristiques : le départ, la progression, la perte (v0.69.0) ───
export const CARACS = ['adresse', 'force', 'endurance', 'calme'];
/* Pose les quatre caractéristiques d'un homme (le départ d'une bataille : la valeur courante et celle d'où l'on compte la progression) ; `pack` : [adresse, force, endurance, calme] ou, d'un homme évacué
   puis revenu, huit nombres (les quatre courantes, puis les quatre du début de la bataille). */
export function poserCaracs(A, i, pack) {
  CARACS.forEach((k, q) => { A[k][i] = pack[q]; A[k + '0'][i] = Math.round(pack.length > 4 ? pack[4 + q] : pack[q]); });
}
// Les huit nombres d'un homme (pour le garder pendant qu'il est évacué ou relevé : `poserCaracs` les reprend)
export const lireCaracs = (A, i) => [...CARACS.map(k => Math.round(A[k][i] * 10) / 10), ...CARACS.map(k => A[k + '0'][i])];
const MOTS = [25, 42, 60, 78];                       // les seuils de `caracEnMots` (identite.js)
const palier = v => (v >= MOTS[0]) + (v >= MOTS[1]) + (v >= MOTS[2]) + (v >= MOTS[3]);
/* Il progresse en pratiquant : `pts` points, de moins en moins vite près de 100, jamais plus de `plafond` au-dessus de sa valeur du début de la bataille. Un passage de mot se garde dans `palier`. */
export function gagner(A, i, k, pts, P) {
  const v = A[k][i], haut = Math.min(100, A[k + '0'][i] + P.plafond);
  if (v >= haut) return;
  const w = Math.min(haut, v + pts * (1 - v / 100));
  A[k][i] = w;
  if (palier(w) !== palier(v)) A.palier[i] |= 1 << CARACS.indexOf(k);
}
// Il perd (une blessure, la terreur) : pas sous `plancher`
export function perdre(A, i, k, pts, P) {
  const v = A[k][i], w = Math.max(P.plancher, v - pts);
  A[k][i] = w;
  if (palier(w) !== palier(v)) A.palier[i] |= 1 << CARACS.indexOf(k);
}
// Ce qu'une blessure lui enlève pour de bon (1 bras, 2 jambe, 3 tête)
export function abimerCaracs(A, i, blessure, P) {
  const B = P.blessure;
  if (blessure === 1) { perdre(A, i, 'adresse', B.bras, P); perdre(A, i, 'force', B.bras, P); }
  else if (blessure === 2) perdre(A, i, 'endurance', B.jambe, P);
  else if (blessure === 3) { perdre(A, i, 'calme', B.tete, P); perdre(A, i, 'adresse', B.tete / 2, P); }
}

export function ajouterSoldat(A, x, y, camp, reg, slot, r, id = A.n) {
  if (A.n >= A.capacite) return -1;
  const i = A.n++;
  A.id[i] = id; poserCaracs(A, i, caracteristiques(id, camp)); A.duel[i] = 0; A.palier[i] = 0; A.fatJ[i] = 0; A.fatB[i] = 0; A.peur[i] = 0; A.blessure[i] = 0; A.exp[i] = 0; A.victimes[i] = 0;
  A.x[i] = x; A.y[i] = y; A.vx[i] = 0; A.vy[i] = 0;
  A.camp[i] = camp; A.reg[i] = reg; A.slot[i] = slot; A.mort[i] = 0;
  A.rnd[i] = r; A.tirT[i] = 1 + r * 4; A.coince[i] = 0;
  return i;
}

export function construireGrille(A) {
  const { n, x, y, gw, gh, cellCount, cellStart, sorted, cellOf, dw, dh, dens, camp } = A;
  cellCount.fill(0); dens[0].fill(0); dens[1].fill(0);
  for (let i = 0; i < n; i++) {
    const cx = Math.min(gw - 1, Math.max(0, (x[i] / GRILLE) | 0));
    const cy = Math.min(gh - 1, Math.max(0, (y[i] / GRILLE) | 0));
    const c = cy * gw + cx;
    cellOf[i] = c; cellCount[c]++;
    const dx = Math.min(dw - 1, (x[i] / DENSITE) | 0), dy = Math.min(dh - 1, (y[i] / DENSITE) | 0);
    dens[camp[i]][dy * dw + dx]++;
  }
  let s = 0;
  for (let c = 0; c < gw * gh; c++) { cellStart[c] = s; s += cellCount[c]; }
  cellStart[gw * gh] = s;
  cellCount.fill(0);
  for (let i = 0; i < n; i++) { const c = cellOf[i]; sorted[cellStart[c] + cellCount[c]++] = i; }
}

/* La place d'un soldat dans la formation de son régiment. o : l'ordre
   { x, y, fx, fy, cols, esp } (fx, fy : le front, vers l'ennemi). */
export function place(o, slot, out) {
  // dans une tranchée : le long de son tracé, sur o.trace.rangs rangs (le premier contre le parapet)
  const t = o.trace;
  if (t) {
    const col = Math.floor(slot / t.rangs), row = slot - col * t.rangs;
    const x = t.x0 + (col + 0.5) * (t.x1 - t.x0) / o.cols;
    out[0] = x; out[1] = ligneY(t, x) + (row - (t.rangs - 1) / 2) * 0.8 * -t.face;
    return out;
  }
  const col = slot % o.cols, row = (slot - col) / o.cols;
  const lx = (col - (o.cols - 1) / 2) * o.esp, ly = row * o.esp;
  out[0] = o.x - o.fy * lx - o.fx * ly;
  out[1] = o.y + o.fx * lx - o.fy * ly;
  return out;
}

/* Les places du commandement dans la formation (v0.68.0, « les grades se voient ») : le capitaine au milieu du premier rang (contre le parapet, en tranchée),
   les deux lieutenants au quart et aux trois quarts du même rang, l'adjudant derrière le capitaine ; `n` : l'effectif de la formation. Les gradés se retrouvent
   donc là où l'œil les cherche, au lieu du coin gauche du rang. [slot du rang 0, 1, 2, 3 (identite.js)] ; une formation trop petite en garde le moins possible. */
export function placesCommandement(o, n) {
  const cols = o.cols, rangs = o.trace ? o.trace.rangs : Math.ceil(n / cols);
  const at = (c, r) => Math.min(n - 1, o.trace ? c * rangs + r : r * cols + c);
  const m = Math.floor(cols / 2);
  return [at(m, 0), at(Math.round((cols - 1) / 4), 0), at(Math.round((cols - 1) * 3 / 4), 0), rangs > 1 ? at(m, 1) : at(Math.min(cols - 1, m + 1), 0)];
}

const pl = [0, 0];

/* Les nombres de la posture d'un régiment (`R.stance`, data/stances.js) ; un régiment sans posture tire à volonté. */
export const parametresStance = (R, id) => R.stance[id] ?? R.stance.volonte;
/* La chance de toucher d'un tir : la densité du carré visé, l'adresse acquise, la posture. */
export const chanceTir = (R, stance, densite, exp, adresse = 50) =>
  R.tir.precision * parametresStance(R, stance).precision * Math.min(1, densite / R.tir.densite) * (1 + R.experience.adresse * exp) * facteur(R.caracteristiques.adresse, adresse, 1);
/* L'effet d'une caractéristique (0 à 100) : 1 ± amplitude × (valeur − 50 %) ; `sens` −1 : plus il en a, moins ça pèse (la fatigue, la peur). */
export const facteur = (amplitude, valeur, sens) => 1 + sens * amplitude * (valeur / 100 - 0.5);

/* Un pas de la foule. ctx : { T, R, regiments, champDe(reg) → champ | null,
   rng, dt, gel, frapper(i, cause, gravite) }. frapper blesse ou tue (gravite :
   la chance d'être tué) ; les morts du pas sont marqués (A.mort) et retirés par
   compacter(). */
// une blessure à la jambe est légère pour une part des hommes (`soldat.jambeLegere`) : un hachage de leur numéro, sans hasard ni état
export const legere = (id, part) => (Math.imul(id + 1, 2654435761) >>> 0) / 4294967296 < part;
export function pasArmee(A, ctx) {
  const { T, R, regiments, champDe, rng, dt, gel } = ctx;
  const { n, x, y, vx, vy, rnd, camp, reg, slot, mort, gw, gh, cellStart, sorted, cellOf, tirT, coince, fatJ, fatB, peur, blessure } = A;
  const Sd = R.soldat, M = R.melee, PG = R.progression;
  const F = R.foule, V = R.vitesse;
  const sep = F.separation, sep2 = sep * sep, maxN = F.voisins;
  const W = T.W, H = T.H;
  const champs = new Array(regiments.length);       // calculés à la demande (un régiment arrivé n'en a pas besoin)
  const k = Math.min(1, dt * 5);
  for (let i = 0; i < n; i++) {
    if (mort[i]) continue;
    const xi = x[i], yi = y[i];
    // ─ Voisins : séparation ─
    let sx = 0, sy = 0, seen = 0, ennemi = -1, ennemiD2 = M.portee * M.portee;       // (le corps à corps : l'ennemi le plus proche à portée de baïonnette)
    const c0 = cellOf[i], gcx = c0 % gw, gcy = (c0 - gcx) / gw;
    for (let oy = -1; oy <= 1 && seen < maxN; oy++) {
      const yy = gcy + oy; if (yy < 0 || yy >= gh) continue;
      for (let ox = -1; ox <= 1 && seen < maxN; ox++) {
        const xx = gcx + ox; if (xx < 0 || xx >= gw) continue;
        const c = yy * gw + xx;
        for (let s = cellStart[c], e = cellStart[c + 1]; s < e && seen < maxN; s++) {
          const j = sorted[s]; if (j === i) continue;
          const dx = xi - x[j], dy = yi - y[j], d2 = dx * dx + dy * dy;
          if (d2 < ennemiD2 && camp[j] !== camp[i] && !mort[j]) { ennemi = j; ennemiD2 = d2; }
          if (d2 > sep2) continue;
          seen++;
          const d = Math.sqrt(d2) || 0.01, f = (sep - d) / sep / d;
          sx += dx * f; sy += dy * f;
        }
      }
    }
    // ─ But : sa place, ou le champ de l'ordre quand elle est loin ─
    const r = regiments[reg[i]], o = r.ordre;
    // un blessé qui peut marcher (un bras, une jambe légère) quitte sa place et regagne l'arrière, droit devant lui (Jérôme, v0.35.0)
    const retrait = ctx.arriere && blessure[i] && blessure[i] <= 2 && (blessure[i] === 1 || legere(A.id[i], Sd.jambeLegere));
    if (retrait) { pl[0] = xi; pl[1] = camp[i] === 0 ? Math.max(yi, ctx.arriere[0]) : Math.min(yi, ctx.arriere[1]); }
    else place(o, slot[i], pl);
    const dx = pl[0] - xi, dy = pl[1] - yi, d = Math.hypot(dx, dy);
    let gx = 0, gy = 0, voulu = 1;
    let ch = null;
    if (!retrait && d > F.champ) { ch = champs[reg[i]]; if (ch === undefined) ch = champs[reg[i]] = champDe(r); }
    if (ch) {
      const b = ch.dirA(xi, yi);
      if (b) { gx = b[0]; gy = b[1]; } else { gx = dx / d; gy = dy / d; }
    } else if (d > 0.05) {
      gx = dx / d; gy = dy / d;
      voulu = Math.min(1, d / 2.5);           // il ralentit en arrivant
      if (d < 0.3) voulu = 0;
    } else voulu = 0;
    // ─ La case, la marche devant ─
    const ci = xi | 0, cj = yi | 0, cc = cj * W + ci;
    let terrain = vitesseCase(T, cc, R, gel);
    if (voulu > 0) {
      const ai = (xi + gx * 0.7) | 0, aj = (yi + gy * 0.7) | 0;
      if (ai >= 0 && aj >= 0 && ai < W && aj < H && (ai !== ci || aj !== cj)) {
        const dq = hauteurQ(T, aj * W + ai) - hauteurQ(T, cc);
        const adq = dq < 0 ? -dq : dq;
        if (dq >= V.mur) terrain *= coince[i] > 3 ? 0.08 : 0;      // deux mètres : on n'y monte qu'à force
        else if (adq >= 4) terrain *= V.pente2;
        else if (adq >= 2) terrain *= V.pente1;
      }
    }
    // les jambes lourdes ou blessées ralentissent
    const corps = (1 - Sd.effetFatigue * fatJ[i]) * (blessure[i] === 2 ? Sd.jambeBlessee : 1);
    const vmax = V.marche * (0.88 + rnd[i] * 0.24) * terrain * corps;
    // au corps à corps il garde sa place : il ne marche plus qu'un peu (sauf un blessé qui s'en va, ou une déroute) ; il fait face à son adversaire
    const duel = ennemi >= 0 && !retrait && !blessure[i] && !r.deroute;
    A.duel[i] = duel ? 1 : 0;
    if (duel) { gx *= M.arret; gy *= M.arret; A.duelAng[i] = Math.atan2(x[ennemi] - xi, y[ennemi] - yi); }
    let wx = gx * voulu * vmax + sx * 1.6, wy = gy * voulu * vmax + sy * 1.6;
    const wl = Math.hypot(wx, wy), lim = Math.max(vmax, 0.4);
    if (wl > lim) { wx *= lim / wl; wy *= lim / wl; }
    vx[i] += (wx - vx[i]) * k; vy[i] += (wy - vy[i]) * k;
    // ─ Déplacement, en glissant le long de ce qu'on ne franchit pas ─
    let nx = xi + vx[i] * dt, ny = yi + vy[i] * dt;
    if (nx < 0.1) nx = 0.1; else if (nx > W - 0.1) nx = W - 0.1;
    if (ny < 0.1) ny = 0.1; else if (ny > H - 0.1) ny = H - 0.1;
    const hi = hauteurQ(T, cc);
    const mur = (px, py) => {
      const c = (py | 0) * W + (px | 0);
      return c !== cc && ((hauteurQ(T, c) - hi >= V.mur && coince[i] <= 3) || (T.profond[c] === 1 && T.profond[cc] === 0));      // un mur, ou de l'eau profonde où l'on n'entre jamais (v0.43.0)
    };
    let bloque = false;
    if (mur(nx, yi)) { nx = xi; vx[i] = 0; bloque = true; }
    if (mur(nx, ny)) { ny = yi; vy[i] = 0; bloque = true; }
    x[i] = nx; y[i] = ny;
    coince[i] = bloque && voulu > 0 ? coince[i] + dt : Math.max(0, coince[i] - dt);
    // ─ La fatigue, la peur ─
    const marche = Math.hypot(nx - xi, ny - yi) / dt / V.marche;            // 0 à l'arrêt
    // l'effort compte au temps passé à marcher, pas au chemin fait : la boue, qui ralentit, fatigue d'autant plus
    if (marche > 0.1) {
      fatJ[i] = Math.min(1, fatJ[i] + Sd.fatigueMarche * dt * (terrain < V.humide ? Sd.fatigueBoue : 1) * facteur(R.caracteristiques.endurance, A.endurance[i], -1));
      if (fatJ[i] > 0.4) gagner(A, i, 'endurance', PG.marcheFatigue * dt, PG);               // marcher les jambes lourdes endurcit
    }
    else fatJ[i] = Math.max(0, fatJ[i] - Sd.reposJambes * dt);
    fatB[i] = Math.max(0, fatB[i] - Sd.reposBras * dt);
    peur[i] = Math.max(0, peur[i] - Sd.peurDecroit * dt);
    // le calme : il se forge sous le feu (de l'inquiétude à la terreur), il se perd dans la terreur et la déroute
    if (peur[i] >= Sd.terreur) perdre(A, i, 'calme', PG.terreur * dt, PG);
    else if (peur[i] > PG.seuilPeur) gagner(A, i, 'calme', PG.tient * dt, PG);
    if (r.deroute) perdre(A, i, 'calme', PG.deroute * dt, PG);
    // ─ Le tir (pas quand la terreur le tient) ─
    tirT[i] -= dt;
    if (duel) {
      // le corps à corps : un coup de baïonnette toutes les `periode` secondes ; la force du frappeur contre l'endurance de l'autre, les bras fatigués frappent moins
      if (tirT[i] <= 0) {
        tirT[i] = M.periode * (0.7 + 0.6 * rng());
        if (peur[i] < Sd.terreur) {
          const j = ennemi;
          const chance = M.touche * (0.55 + M.force * A.force[i] / 100) * (1.3 - M.endurance * A.endurance[j] / 100) * (1 - 0.4 * fatB[i]) * (1 + R.experience.adresse * A.exp[i]);
          fatB[i] = Math.min(1, fatB[i] + M.fatigue);
          A.exp[i] = Math.min(1, A.exp[i] + R.experience.tir);
          gagner(A, i, 'force', PG.coup, PG);
          if (rng() < chance) {
            gagner(A, i, 'force', PG.toucheCoup, PG);
            ctx.frapper(j, 'mêlée', M.mortel * (1.2 - 0.4 * A.endurance[j] / 100), null, i);
            if (A.mort[j]) gagner(A, i, 'force', PG.tue, PG);
          }
        }
      }
    } else if (tirT[i] <= 0) {
      const ebranle = r.moral !== undefined && r.moral < R.moral.ebranle;
      tirT[i] = R.tir.periode * (0.5 + rng()) * (blessure[i] === 1 ? Sd.brasBlesse : 1) * (ebranle ? R.moral.tirEbranle : 1) * parametresStance(R, r.stance).periode;
      // la terreur, ou la déroute : on ne tire plus
      // (sans ennemi à portée, il ne tire pas : ni fatigue ni expérience)
      if (!retrait && peur[i] < Sd.terreur && !r.deroute && tirer(A, i, o, ctx, r.stance)) {
        fatB[i] = Math.min(1, fatB[i] + Sd.fatigueTir);
        A.exp[i] = Math.min(1, A.exp[i] + R.experience.tir);
      }
    }
  }
}

/* Un tir (rend false s'il n'y avait personne à viser) : le carré le plus dense d'ennemis dans le cône du front, à portée ;
   la chance de toucher croît avec la densité et baisse si la cible est dans
   un creux. La victime est prise dans la grille fine. */
function tirer(A, i, o, ctx, stance) {
  const { R, rng, T, frapper } = ctx;
  const { dw, dh, dens } = A;
  const ennemi = 1 - A.camp[i], de = dens[ennemi];
  const P = R.tir, portee = P.portee * parametresStance(R, stance).portee, rB = Math.ceil(portee / DENSITE);
  const bx = (A.x[i] / DENSITE) | 0, by = (A.y[i] / DENSITE) | 0;
  const cosC = Math.cos(P.cone);
  let best = -1, bestN = 0;
  for (let oy = -rB; oy <= rB; oy++) {
    const yy = by + oy; if (yy < 0 || yy >= dh) continue;
    for (let ox = -rB; ox <= rB; ox++) {
      const xx = bx + ox; if (xx < 0 || xx >= dw) continue;
      const b = yy * dw + xx, m = de[b];
      if (m <= bestN) continue;
      const ddx = (xx + 0.5) * DENSITE - A.x[i], ddy = (yy + 0.5) * DENSITE - A.y[i], dd = Math.hypot(ddx, ddy) || 1;
      if (dd > portee) continue;
      if ((ddx * o.fx + ddy * o.fy) / dd < cosC) continue;
      best = b; bestN = m;
    }
  }
  if (best < 0) return false;
  if (ctx.tir) { const bxx = best % dw; ctx.tir(i, (bxx + 0.5) * DENSITE, ((best - bxx) / dw + 0.5) * DENSITE); }   // pour le dessin : un tir part (jamais l'état)
  const chance = chanceTir(R, stance, bestN, A.exp[i], A.adresse[i]);
  gagner(A, i, 'adresse', R.progression.tir, R.progression);
  if (rng() >= chance) return true;
  gagner(A, i, 'adresse', R.progression.toucheTir, R.progression);
  // la victime : un ennemi du carré, au hasard
  const xx = best % dw, yy = (best - xx) / dw;
  const k = DENSITE / GRILLE, cand = [];
  for (let fy = yy * k; fy < (yy + 1) * k && fy < A.gh; fy++) {
    for (let fx = xx * k; fx < (xx + 1) * k && fx < A.gw; fx++) {
      const c = fy * A.gw + fx;
      for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) {
        const j = A.sorted[s];
        if (A.camp[j] === ennemi && !A.mort[j]) cand.push(j);
      }
    }
  }
  if (!cand.length) return true;
  const v = cand[Math.floor(rng() * cand.length)];
  // une cible qui court est plus dure à toucher (un assaut qui traverse le no man's land, v0.17.0)
  const vit = Math.hypot(A.vx[v], A.vy[v]);
  if (vit > 0.3 && rng() < P.mouvement * Math.min(1, vit / R.vitesse.marche)) return true;
  // à l'abri dans un creux ? Dans une tranchée, le parapet protège du tir qui vient de devant, le parados
  // beaucoup moins de celui qui vient de derrière (une tranchée prise sert à l'envers)
  const cv = (A.y[v] | 0) * T.W + (A.x[v] | 0);
  if (T.diff[cv] <= -2) {
    const t = T.troncon ? T.troncon[cv] : -1;
    const abri = t < 0 ? P.abri : (A.y[i] - A.y[v]) * ctx.faces[t] > 0 ? R.tranchee.abriFace : R.tranchee.abriDos;
    if (rng() >= abri) return true;
  }
  frapper(v, 'tir', R.soldat.mortelTir, null, i);
  return true;
}

/* Un obus tombe : chaque soldat dans le rayon est touché avec une chance qui
   baisse avec la distance, et encore dans un creux ; touché près du centre, il
   meurt plus souvent qu'il n'est blessé. Jusqu'à trois fois le rayon, les
   vivants ont peur. */
export function tuerDans(A, x0, y0, rayon, ctx, letal = 1) {
  const { R, rng, T, frapper } = ctx;
  if (rayon <= 0) return;
  effrayer(A, x0, y0, rayon * 3, R.soldat.peurObus, R.experience, R.caracteristiques.calme);
  const g0x = Math.max(0, ((x0 - rayon) / GRILLE) | 0), g1x = Math.min(A.gw - 1, ((x0 + rayon) / GRILLE) | 0);
  const g0y = Math.max(0, ((y0 - rayon) / GRILLE) | 0), g1y = Math.min(A.gh - 1, ((y0 + rayon) / GRILLE) | 0);
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
    const c = gy * A.gw + gx;
    for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) {
      const i = A.sorted[s];
      if (A.mort[i]) continue;
      const d = Math.hypot(A.x[i] - x0, A.y[i] - y0);
      if (d >= rayon) continue;
      let p = Math.min(0.95, 0.7 * letal * (1 - d / rayon) ** 1.5);
      const ci = (A.y[i] | 0) * T.W + (A.x[i] | 0);
      if (T.diff[ci] <= -2) p *= R.obus.abri;
      if (ctx.abri) p *= ctx.abri(ci);
      if (rng() < p) frapper(i, 'obus', 0.5 + 0.5 * (1 - d / rayon), { x0, y0, d, rayon });
    }
  }
  // le souffle : les survivants, plus loin que les morts (jusqu'à `souffleZone` rayons), sont jetés à l'opposé du point de chute ;
  // une vitesse qui retombe d'elle-même (la marche la reprend), un pas dans le même ordre pour tous : même partie, même résultat
  const zone = rayon * R.obus.souffleZone, vs = R.obus.souffle;
  const z0x = Math.max(0, ((x0 - zone) / GRILLE) | 0), z1x = Math.min(A.gw - 1, ((x0 + zone) / GRILLE) | 0);
  const z0y = Math.max(0, ((y0 - zone) / GRILLE) | 0), z1y = Math.min(A.gh - 1, ((y0 + zone) / GRILLE) | 0);
  for (let gy = z0y; gy <= z1y; gy++) for (let gx = z0x; gx <= z1x; gx++) {
    const c = gy * A.gw + gx;
    for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) {
      const i = A.sorted[s];
      if (A.mort[i]) continue;
      const dx = A.x[i] - x0, dy = A.y[i] - y0, d = Math.hypot(dx, dy);
      if (d >= zone) continue;
      const u = (1 - d / zone) * vs;
      A.vx[i] += (d > 0.05 ? dx / d : 1) * u; A.vy[i] += (d > 0.05 ? dy / d : 0) * u;
    }
  }
}

/* La peur gagne les vivants autour de (x0, y0), d'autant plus qu'ils sont près,
   et moins ceux qui ont l'habitude ; ceux qui en réchappent prennent de
   l'expérience (Ex : R.experience, ou rien). */
export function effrayer(A, x0, y0, rayon, quantite, Ex = null, cal = 0) {
  const g0x = Math.max(0, ((x0 - rayon) / GRILLE) | 0), g1x = Math.min(A.gw - 1, ((x0 + rayon) / GRILLE) | 0);
  const g0y = Math.max(0, ((y0 - rayon) / GRILLE) | 0), g1y = Math.min(A.gh - 1, ((y0 + rayon) / GRILLE) | 0);
  for (let gy = g0y; gy <= g1y; gy++) for (let gx = g0x; gx <= g1x; gx++) {
    const c = gy * A.gw + gx;
    for (let s = A.cellStart[c], e = A.cellStart[c + 1]; s < e; s++) {
      const i = A.sorted[s];
      if (A.mort[i]) continue;
      const d = Math.hypot(A.x[i] - x0, A.y[i] - y0);
      if (d >= rayon) continue;
      const pres = 1 - d / rayon;
      A.peur[i] = Math.min(1, A.peur[i] + quantite * pres * (Ex ? 1 - Ex.calme * A.exp[i] : 1) * (cal ? facteur(cal, A.calme[i], -1) : 1));
      if (Ex) A.exp[i] = Math.min(1, A.exp[i] + Ex.feu * pres);
    }
  }
}

// La nuit repose : la fatigue et la peur retombent
export function reposer(A, R) {
  const k = 1 - R.soldat.nuitRepos;
  for (let i = 0; i < A.n; i++) { if (A.fatJ[i] > 0.4) gagner(A, i, 'endurance', R.progression.nuit, R.progression); A.fatJ[i] *= k; A.fatB[i] *= k; A.peur[i] *= 0.5; A.exp[i] = Math.min(1, A.exp[i] + R.experience.nuit); }
}

// Retire les morts (on garde l'ordre des vivants : la même partie, rejouée, garde les mêmes indices)
export function compacter(A) {
  let w = 0;
  const keys = ['x', 'y', 'vx', 'vy', 'rnd', 'tirT', 'coince', 'camp', 'reg', 'slot', 'id', 'fatJ', 'fatB', 'peur', 'blessure', 'exp', 'victimes', 'adresse', 'force', 'endurance', 'calme', 'adresse0', 'force0', 'endurance0', 'calme0', 'palier', 'duel', 'duelAng'];
  for (let r = 0; r < A.n; r++) {
    if (A.mort[r]) continue;
    if (w !== r) for (const k of keys) A[k][w] = A[k][r];
    A.mort[w] = 0;
    w++;
  }
  const morts = A.n - w;
  A.mort.fill(0, w, A.n);
  A.n = w;
  return morts;
}

// ─── Sauvegarde : les tableaux, exacts (base64 des octets) ───
const CHAMPS = { x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array, rnd: Float32Array, tirT: Float32Array, coince: Float32Array, camp: Uint8Array, reg: Uint16Array, slot: Uint16Array,
  id: Uint32Array, fatJ: Float32Array, fatB: Float32Array, peur: Float32Array, blessure: Uint8Array, exp: Float32Array, victimes: Uint16Array,
  adresse: Float32Array, force: Float32Array, endurance: Float32Array, calme: Float32Array, adresse0: Uint8Array, force0: Uint8Array, endurance0: Uint8Array, calme0: Uint8Array };
function b64(typed) {
  const u8 = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function deB64(s, Type) {
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Type(u8.buffer);
}
export function photoArmee(A) {
  const out = { n: A.n };
  for (const [k] of Object.entries(CHAMPS)) out[k] = b64(A[k].subarray(0, A.n));
  return out;
}
export function restaurerArmee(A, p) {
  A.n = p.n;
  for (const [k, Type] of Object.entries(CHAMPS)) {
    if (p[k] !== undefined) A[k].set(deB64(p[k], Type));
    else if (k === 'id') for (let i = 0; i < A.n; i++) A.id[i] = i;     // une sauvegarde d'avant les numéros (v0.2)
    else A[k].fill(0, 0, A.n);
  }
  A.mort.fill(0);
}
export { b64, deB64 };
