// Les sources de lumière du labo : des lanternes accrochées dans les tranchées et les abris, des lampes que portent certains soldats.
// Pas de raytracing : chaque lampe éclaire les colonnes de son rayon (une courbe douce de la distance), cachée par le relief (quelques échantillons de visibilité le long du segment lampe → colonne).
// Le résultat est une couche de la grille (un octet par colonne) que le nuanceur lit comme la texture de lumière du soleil : un homme, un flanc de tranchée, le sol y prennent la même lueur.
// Logique pure (aucun DOM, aucune horloge) ; mesures.js chronomètre autour.
import { LAMPES } from './config.js?v=0.125.0';

// Les lanternes fixes : le long de chaque ligne de tranchée, et une par abri couvert (plus basse, plus forte : on la voit par les toits transparents)
export function lanternesDeTranchees(M, hf) {
  const out = [], T = LAMPES.tranchees;
  for (const L of M.lignes) {
    const decal = (L.niveau * 5.3 + L.camp * 2.1) % T.pasM;
    for (let x = 6 + decal; x < M.largeurM - 6; x += T.pasM) {
      if (L.abris.some(a => x > a.x0 && x < a.x0 + 11)) continue;                       // sous un toit : la lanterne de l'abri
      const z = L.zAt(x), y = sol(M, hf, x, z) + T.hauteurM;
      out.push({ x, z, y, force: T.force, rayon: T.rayonM, fixe: true });
    }
    for (const a of L.abris) { const x = a.x0 + 5.5, z = L.zAt(x); out.push({ x, z, y: sol(M, hf, x, z) + T.abri.hauteurM, force: T.abri.force, rayon: T.abri.rayonM, fixe: true }); }
  }
  return out;
}
const sol = (M, hf, x, z) => { const i = Math.min(M.W - 1, Math.max(0, Math.floor(x * M.cpm))), j = Math.min(M.H - 1, Math.max(0, Math.floor(z * M.cpm))); return M.sol[j * M.W + i] * M.cell / 4; };

// Ajoute (signe +1) ou retire (signe −1) la lumière d'une lampe dans `acc` (un Float32Array par colonne) ; rend le rectangle de colonnes touché
export function ajouterLampe(M, hf, lampe, acc, signe = 1) {
  const { W, H, cpm, cell } = M, r = lampe.rayon, R = Math.ceil(r * cpm) + 1, ci = Math.floor(lampe.x * cpm), cj = Math.floor(lampe.z * cpm);
  const i0 = Math.max(0, ci - R), i1 = Math.min(W - 1, ci + R), j0 = Math.max(0, cj - R), j1 = Math.min(H - 1, cj + R);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = (i + 0.5) * cell - lampe.x, dz = (j + 0.5) * cell - lampe.z, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    const idx = j * W + i, h = hf[idx];
    // visibilité : le segment de la lampe à la surface de la colonne passe-t-il sous le relief ?
    let vis = 1;
    const d = Math.sqrt(d2), n = Math.min(7, 1 + Math.floor(d / 1.6));
    for (let s = 1; s <= n; s++) {
      const t = s / (n + 1), x = lampe.x + dx * t, z = lampe.z + dz * t, y = lampe.y + (h + 0.15 - lampe.y) * t;
      const ii = Math.floor(x * cpm), jj = Math.floor(z * cpm);
      if (hf[jj * W + ii] > y + 0.05) { vis = 0; break; }
    }
    if (!vis) continue;
    const u = 1 - d2 / (r * r);
    acc[idx] += signe * lampe.force * u * u;
  }
  return { i0, j0, i1, j1 };
}

// Les lampes que portent certains soldats : un homme sur `un_sur`, parmi ceux qui sont près du point visé (au plus `max`)
export function lampesDeSoldats(F, hf, M, cx, cz) {
  const S = LAMPES.soldats, out = [], R2 = S.rayonActifM * S.rayonActifM;
  for (let i = 0; i < F.n && out.length < S.max; i += S.un_sur) {
    const dx = F.x[i] - cx, dz = F.z[i] - cz; if (dx * dx + dz * dz > R2) continue;
    const ii = Math.min(M.W - 1, Math.floor(F.x[i] * M.cpm)), jj = Math.min(M.H - 1, Math.floor(F.z[i] * M.cpm));
    out.push({ x: F.x[i], z: F.z[i], y: hf[jj * M.W + ii] + S.hauteurM, force: S.force, rayon: S.rayonM, id: i });
  }
  return out;
}

// La couche : `stat` (les lanternes, refaites par région quand le relief change) et `dyn` (les lampes portées, refaites à chaque mise à jour) ; l'octet = min(1, somme) × 255
export function creerLampes(M) { return { stat: new Float32Array(M.n), dyn: new Float32Array(M.n), tex: new Uint8Array(M.n), fixes: [], dernieres: [] }; }
export function emballer(A, region) {
  for (let j = region.j0; j <= region.j1; j++) for (let i = region.i0; i <= region.i1; i++) { const k = j * A.largeur + i; const v = A.stat[k] + A.dyn[k]; A.tex[k] = v >= 1 ? 255 : v <= 0.002 ? 0 : (v * 255) | 0; }
}
export function poserFixes(M, hf, A) {
  A.largeur = M.W; A.fixes = lanternesDeTranchees(M, hf); A.stat.fill(0);
  for (const l of A.fixes) ajouterLampe(M, hf, l, A.stat);
  emballer(A, { i0: 0, j0: 0, i1: M.W - 1, j1: M.H - 1 });
}
// Le relief a changé dans `region` : les lanternes qui l'atteignent sont refaites (leur zone entière, pour que le retrait soit exact)
export function refaireFixes(M, hf, A, region) {
  const zone = { i0: M.W, j0: M.H, i1: -1, j1: -1 };
  for (const l of A.fixes) {
    const R = Math.ceil(l.rayon * M.cpm) + 1, ci = Math.floor(l.x * M.cpm), cj = Math.floor(l.z * M.cpm);
    if (ci + R < region.i0 || ci - R > region.i1 || cj + R < region.j0 || cj - R > region.j1) continue;
    for (let j = Math.max(0, cj - R); j <= Math.min(M.H - 1, cj + R); j++) for (let i = Math.max(0, ci - R); i <= Math.min(M.W - 1, ci + R); i++) A.stat[j * M.W + i] = 0;
    zone.i0 = Math.min(zone.i0, ci - R); zone.j0 = Math.min(zone.j0, cj - R); zone.i1 = Math.max(zone.i1, ci + R); zone.j1 = Math.max(zone.j1, cj + R);
  }
  if (zone.i1 < 0) return null;
  const z = { i0: Math.max(0, zone.i0), j0: Math.max(0, zone.j0), i1: Math.min(M.W - 1, zone.i1), j1: Math.min(M.H - 1, zone.j1) };
  for (const l of A.fixes) { const R = Math.ceil(l.rayon * M.cpm) + 1, ci = Math.floor(l.x * M.cpm), cj = Math.floor(l.z * M.cpm); if (ci + R < z.i0 || ci - R > z.i1 || cj + R < z.j0 || cj - R > z.j1) continue; ajouterLampe(M, hf, l, A.stat); }
  emballer(A, z); return z;
}
// Les lampes portées ont bougé : on retire les anciennes, on pose les nouvelles ; rend le rectangle à renvoyer au GPU (ou null)
export function majMobiles(M, hf, A, lampes) {
  const zone = { i0: M.W, j0: M.H, i1: -1, j1: -1 }, ext = r => { zone.i0 = Math.min(zone.i0, r.i0); zone.j0 = Math.min(zone.j0, r.j0); zone.i1 = Math.max(zone.i1, r.i1); zone.j1 = Math.max(zone.j1, r.j1); };
  for (const l of A.dernieres) { const R = Math.ceil(l.rayon * M.cpm) + 1, ci = Math.floor(l.x * M.cpm), cj = Math.floor(l.z * M.cpm), r = { i0: Math.max(0, ci - R), j0: Math.max(0, cj - R), i1: Math.min(M.W - 1, ci + R), j1: Math.min(M.H - 1, cj + R) }; for (let j = r.j0; j <= r.j1; j++) A.dyn.fill(0, j * M.W + r.i0, j * M.W + r.i1 + 1); ext(r); }
  for (const l of lampes) ext(ajouterLampe(M, hf, l, A.dyn));
  A.dernieres = lampes;
  if (zone.i1 < 0) return null;
  emballer(A, zone); return zone;
}
