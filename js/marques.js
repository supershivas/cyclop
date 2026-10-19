// Les marques d'un homme (Jérôme, v0.37.0) : ce qu'il a subi, fait, été, dit en faits sur sa fiche. Pure : elle lit la bataille `B`
// (l'état, la foule) et ne change rien, sans DOM, sans horloge, sans hasard ; aucun effet sur la partie. Le catalogue est dans
// `data/marques.js`, les seuils dans `reglages.js` (`marques`). Une marque se lit de l'état existant ou d'un bit posé là où l'événement
// a lieu (`A.marques`, `BIT` : bataille.js, army.js, nuit.js) ; les bits d'un homme qui quitte la foule sont gardés avec lui
// (`etat.corps[6]`, `tombes[6]`, `prisonniers[3]`, `evacues[7]`).
import { MARQUES, MARQUE } from './data/marques.js?v=0.37.1';
import { METEO } from './data/meteo.js?v=0.37.1';

// Les bits de `A.marques` (Uint32) : les événements comptés. 16-17 : nuits de travaux (0 à 3) ; 18-19 : secondes immobile pendant la déroute.
export const BIT = {
  bapteme: 1 << 0, souffle: 1 << 1, deterre: 1 << 2, aPied: 1 << 3, coup: 1 << 4, entrePremier: 1 << 5, tenuSeul: 1 << 6, repris: 1 << 7,
  cite: 1 << 8, tremble: 1 << 9, pasReflue: 1 << 10, rallie: 1 << 11, gradeAbattu: 1 << 12, brancard: 1 << 13, porteur: 1 << 14, soupe: 1 << 15,
};
export const TRAVAUX = { decalage: 16, masque: 3 << 16 };
export const IMMOBILE = { decalage: 18, masque: 3 << 18 };
// ce qui s'efface à l'aube (Jérôme, v0.37.0 : un statut dure une nuit) : « a tremblé », « n'a pas reflué », « rallié » et le compte d'immobilité
export const STATUTS = BIT.tremble | BIT.pasReflue | BIT.rallie | IMMOBILE.masque;
export const compteBits = (bits, { decalage, masque }) => (bits & masque) >>> decalage;

export function regimentDe(B, id) {
  let p = 0;
  for (const r of B.etat.regiments) { if (id < p + r.initial) return r; p += r.initial; }
  return null;
}
function indiceVivant(A, id) {
  for (let i = 0; i < A.n; i++) if (A.id[i] === id && !A.mort[i]) return i;
  return -1;
}

/* Où est un homme et ce qu'on a gardé de lui : { i (dans la foule, ou −1), genre, victimes, bits }. Vivant : la foule ; évacué qui n'est pas
   revenu : sa dernière entrée ; mort, inhumé, prisonnier : ce que son corps, sa tombe ou sa fiche de prisonnier a gardé. */
export function ouEst(B, id, indice) {
  const { etat, armee: A } = B, i = indice ?? indiceVivant(A, id);
  if (i >= 0) return { i, genre: 'vivant', victimes: A.victimes[i], bits: A.marques ? A.marques[i] : 0 };
  const ev = etat.evacues.filter(e => e[0] === id);
  const dernier = ev[ev.length - 1];
  if (dernier) return { i: -1, genre: 'evacue', victimes: dernier[6] ?? 0, bits: dernier[7] ?? 0 };
  const c = etat.corps.find(c => c[4] === id);
  if (c) return { i: -1, genre: 'mort', victimes: c[5] ?? 0, bits: c[6] ?? 0 };
  const t = etat.tombes.find(c => c[4] === id);
  if (t) return { i: -1, genre: 'inhume', victimes: t[5] ?? 0, bits: t[6] ?? 0 };
  const pr = etat.prisonniers.find(e => e[0] === id);
  if (pr) return { i: -1, genre: 'prisonnier', victimes: pr[2] ?? 0, bits: pr[3] ?? 0 };
  return { i: -1, genre: 'releve', victimes: 0, bits: 0 };
}

/* Les séjours d'un homme au front : [[premier jour, dernier jour]…]. Il arrive avec son régiment (le jour 1, ou `arrive` pour une relève) ;
   une évacuation clôt le séjour à la nuit où il part, un retour en ouvre un le lendemain de la nuit du retour ; la mort, la capture ou la
   relève clôturent le dernier. Un séjour qui dure encore n'a pas de fin (`null`). */
export function sejours(B, id, reg = regimentDe(B, id), ou = ouEst(B, id), evs = null) {
  const { etat } = B, out = [];
  if (!reg) return out;
  let debut = reg.arrive ?? 1, ferme = false;
  for (const e of (evs ?? etat.evacues.filter(e => e[0] === id)).slice().sort((a, b) => a[1] - b[1])) {
    out.push([debut, e[1]]);
    if (e[3] > 0) debut = e[3] + 1; else { ferme = true; break; }
  }
  if (ferme) return out;
  let fin = null;
  if (ou.genre === 'mort' || ou.genre === 'inhume') fin = (etat.corps.find(c => c[4] === id) ?? etat.tombes.find(c => c[4] === id))[3];
  else if (ou.genre === 'prisonnier') fin = etat.prisonniers.find(e => e[0] === id)[1];
  else if (ou.genre === 'releve') fin = reg.releve ?? etat.jour;
  out.push([debut, fin]);
  return out;
}
// le dernier jour fini de la bataille (le jour en cours ne compte pas tant qu'il dure)
export const dernierJourFini = B => B.etat.phase === 'jour' ? B.etat.jour - 1 : B.etat.jour;
const jours = (B, [d, f]) => { const fin = f ?? dernierJourFini(B), out = []; for (let j = d; j <= fin; j++) out.push(j); return out; };
// les nuits connues d'un séjour : { jour, choix } pour d ≤ nuit < fin (la nuit du départ n'est pas la sienne)
const nuitsDe = (B, [d, f]) => B.etat.nuits.filter(n => n.jour >= d && (f === null || n.jour < f));

/* Les marques de l'homme n° id : [{ n, id, famille, nom, dit, jour }], les plus récentes d'abord (`jour` : le jour où il l'a gagnée ; celles
   qui n'ont pas de date, après, dans l'ordre du catalogue). Une par palier pour le fusil : la plus haute. */
/* `pre` (facultatif, pour en lire beaucoup d'un coup) : { i : l'indice de l'homme vivant, evs : Map numéro → ses évacuations, debout : hommes debout de chaque régiment }. */
export function marquesDe(B, id, pre = {}) {
  const { etat, R } = B, M = R.marques, A = B.armee;
  const reg = regimentDe(B, id);
  if (!reg) return [];
  const ou = ouEst(B, id, pre.i), vivant = ou.genre === 'vivant', evs = pre.evs ? (pre.evs.get(id) ?? []) : null;
  const trouvees = new Map();         // n → jour (ou null)
  const donne = (n, jour = null) => { if (!trouvees.has(n)) trouvees.set(n, jour); };
  const sj = sejours(B, id, reg, ou, evs), bits = ou.bits & ~(vivant ? 0 : STATUTS);
  const evRevenus = (evs ?? etat.evacues.filter(e => e[0] === id)).filter(e => e[3] > 0).sort((a, b) => a[3] - b[3]);

  // les blessures dont il est revenu (4 à 6), deux fois revenu (7)
  for (const e of evRevenus) donne(e[2] === 1 ? 4 : e[2] === 2 ? 5 : 6, e[3]);
  if (evRevenus.length >= 2) donne(7, evRevenus[1][3]);

  // le temps (9 à 13) : les séjours, la météo, les nuits
  if (sj.length && sj[0][0] === 1) donne(9, 1);
  let pluies = 0, nuitsGel = 0;
  for (const s of sj) {
    for (const j of jours(B, s)) {
      if (etat.meteo[j - 1] === 'pluie' && ++pluies === M.pluies) donne(11, j);
    }
    let serie = 0;
    const nuits = new Map(nuitsDe(B, s).map(n => [n.jour, n]));
    for (const j of jours(B, s)) {
      if (++serie >= M.cinqJours) donne(10, j);
      const n = nuits.get(j);
      if (n && n.choix[reg.id] === 'repos') serie = 0;
    }
    for (const n of nuitsDe(B, s)) if (METEO[etat.meteo[n.jour - 1]]?.gel && ++nuitsGel === 1) donne(12, n.jour);
  }
  if (vivant && etat.phase === 'fin') donne(13, etat.jour);

  // le commandement (22, 23)
  const g = etat.grades[id];
  if (g) { donne(22, g[1]); if (g[0] === 0) donne(23, g[1]); }

  // les statuts d'un régiment (28, 29) : seulement tant qu'ils durent (« après une nuit »)
  if (vivant && reg) {
    if (reg.refus === etat.jour) donne(28, etat.jour);
    if (reg.initial > M.derniers) {
      let debout = pre.debout?.[reg.id];
      if (debout === undefined) { debout = 0; for (let k = 0; k < A.n; k++) if (A.reg[k] === reg.id && !A.mort[k] && !A.blessure[k]) debout++; }
      if (debout <= M.derniers) donne(29, etat.jour);
    }
  }

  // la fin (30, 31)
  const t = etat.tombes.find(c => c[4] === id);
  if (t) donne(30, t[7]);
  const c = etat.corps.find(c => c[4] === id);
  if (c && etat.nuits.filter(n => n.jour >= c[3]).length >= M.entonnoir) donne(31, c[3] + M.entonnoir);

  // le fusil (32 à 34) : le palier le plus haut seulement
  for (let k = M.fusil.length - 1; k >= 0; k--) if (ou.victimes >= M.fusil[k]) { donne(32 + k); break; }

  // les événements comptés (bits posés là où ils ont lieu)
  const parBit = [[1, BIT.bapteme], [2, BIT.souffle], [3, BIT.deterre], [8, BIT.aPied], [18, BIT.coup], [19, BIT.entrePremier], [20, BIT.tenuSeul], [21, BIT.repris],
    [24, BIT.cite], [25, BIT.tremble], [26, BIT.pasReflue], [27, BIT.rallie], [35, BIT.gradeAbattu], [15, BIT.brancard], [16, BIT.porteur], [17, BIT.soupe]];
  for (const [n, b] of parBit) if (bits & b) donne(n);
  if (compteBits(bits, TRAVAUX) >= M.travaux) donne(14);

  const out = [...trouvees].map(([n, jour]) => ({ ...MARQUES[n - 1], jour }));
  out.sort((a, b) => (b.jour ?? -1) - (a.jour ?? -1) || a.n - b.n);
  return out;
}

/* Ce qu'un homme a vécu qui aguerrit (Jérôme, v0.37.1 : un léger effet sur le moral) : les marques de survie et de temps seulement, 4 à 7 et 9 à 12 ;
   ni le fusil (DESIGN.md : le compteur de morts n'est jamais une récompense), ni les statuts (28 vient du moral), ni le commandement. */
export const SURVIE = new Set([4, 5, 6, 7, 9, 10, 11, 12]);

/* L'aguerrissement de chaque régiment, de 0 à 1 : la moyenne, sur ses hommes vivants, de min(1, marques de survie / `aguerri`). Lu de l'état, sans hasard ;
   `aube` le range dans `reg.aguerri` (sauvegardé), `moral` le lit. Un seul passage sur la foule (pas un `marquesDe` par homme qui la reparcourt). */
export function aguerrissement(B) {
  const { etat, R, armee: A } = B, n = etat.regiments.length;
  const evs = new Map(); for (const e of etat.evacues) { const l = evs.get(e[0]); if (l) l.push(e); else evs.set(e[0], [e]); }
  const debout = new Int32Array(n); for (let i = 0; i < A.n; i++) if (!A.mort[i] && !A.blessure[i]) debout[A.reg[i]]++;
  const somme = new Float64Array(n), nb = new Int32Array(n), pre = { evs, debout, i: 0 };
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    pre.i = i;
    let k = 0; for (const m of marquesDe(B, A.id[i], pre)) if (SURVIE.has(m.n)) k++;
    somme[A.reg[i]] += Math.min(1, k / R.marques.aguerri); nb[A.reg[i]]++;
  }
  return Array.from(somme, (v, r) => nb[r] ? v / nb[r] : 0);
}
export { MARQUES, MARQUE };
