// Lire la bataille en mots : qui est un homme, ce qu'il est devenu, ce que compte un régiment. Des fonctions
// qui prennent la bataille `B` et ne changent rien (aucun DOM) ; main.js et la fiche s'en servent.
import { NOUS } from '../bataille.js?v=0.29.0';
import { identite } from '../identite.js?v=0.29.0';

export const majuscule = s => s[0].toUpperCase() + s.slice(1);
export const nomDe = reg => reg?.nom ? `Régiment ${reg.nom}` : 'En face';

export function indiceDe(B, id) {
  const A = B.armee;
  for (let i = 0; i < A.n; i++) if (A.id[i] === id) return i;
  return -1;
}
// les numéros se suivent, régiment après régiment : le premier numéro d'un régiment
export function premierDe(B, regId) {
  let p = 0;
  for (const r of B.etat.regiments) { if (r.id === regId) return p; p += r.initial; }
  return p;
}
// qui est le soldat n° id (vivant ou mort) : son régiment, son identité
export function quiEst(B, id) {
  let p = 0;
  for (const r of B.etat.regiments) {
    if (id < p + r.initial) return { reg: r, qui: identite(B.etat.graine, r.camp, id, id - p, r.initial, B.etat.grades[id]?.[0] ?? -1) };
    p += r.initial;
  }
  return { reg: null, qui: identite(B.etat.graine, NOUS, id) };
}
// le soldat le plus proche du point, à moins de r mètres (les deux camps)
export function soldatSous(B, x, y, r) {
  const A = B.armee;
  let best = -1, bd = r * r;
  for (let i = 0; i < A.n; i++) {
    const d = (A.x[i] - x) ** 2 + (A.y[i] - y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
// le corps le plus proche du point, à moins de r mètres : le numéro de l'homme
export function corpsSous(B, x, y, r) {
  let best = -1, bd = r * r;
  for (const c of B.etat.corps) {
    const d = (c[0] / 10 - x) ** 2 + (c[1] / 10 - y) ** 2;
    if (d < bd) { bd = d; best = c[4]; }
  }
  return best;
}
// un homme qui n'est plus dans la foule : tombé (et peut-être inhumé), ou évacué
export function tombe(B, id) {
  const ev = B.etat.evacues.find(e => e[0] === id);
  if (ev) return `Évacué blessé le jour ${ev[1]}.`;
  const pr = B.etat.prisonniers?.find(e => e[0] === id);
  if (pr) return `Fait prisonnier la nuit du ${pr[1]}.`;
  const c = B.etat.corps.find(c => c[4] === id);
  if (c) return `Tombé le jour ${c[3]}.`;
  const t = B.etat.tombes.find(c => c[4] === id);
  if (t) return `Tombé le jour ${t[3]}, inhumé la nuit du ${t[5]}.`;
  const reg = quiEst(B, id).reg;
  return reg?.releve ? `Relevé avec son régiment, la nuit du ${reg.releve}.` : 'Mort.';
}
// ce que compte un régiment : vivants, blessés, morts
export const refuseAujourdhui = (B, reg) => reg.refus === B.etat.jour && 'Refuse de monter aujourd\'hui';
export function bilan(B, reg) {
  const A = B.armee;
  let blesses = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && A.blessure[i]) blesses++;
  const releves = reg.releves || 0, prisonniers = reg.prisonniers || 0, evacues = reg.initial - reg.effectif - reg.pertes - releves - prisonniers;
  return { vivants: reg.effectif, initial: reg.initial, blesses, morts: reg.pertes, evacues, releves, prisonniers };
}
export const enMots = b => b.releves
  ? `relevé : ${b.releves} hommes sur ${b.initial} en sont revenus · ${b.morts} morts`
  : `${b.vivants} hommes sur ${b.initial} · ${b.blesses} blessés · ${b.morts} morts${b.evacues ? ` · ${b.evacues} évacués` : ''}${b.prisonniers ? ` · ${b.prisonniers} prisonniers` : ''}`;

// le numéro d'ordre d'un régiment dans son camp : « 3 · Viride »
export const numeroDe = (B, r) => B.etat.regiments.filter(g => g.camp === r.camp).indexOf(r) + 1;
export const pluriel = (n, un, des) => `${n} ${n > 1 ? des : un}`;
