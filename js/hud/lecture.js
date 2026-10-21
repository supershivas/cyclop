// Lire la bataille en mots : qui est un homme, ce qu'il est devenu, ce que compte un régiment. Des fonctions
// qui prennent la bataille `B` et ne changent rien (aucun DOM) ; main.js et la fiche s'en servent.
import { NOUS, arriereDe, numeroCampagne, moralEnMots, actionDe } from '../bataille.js?v=0.52.0';
import { legere } from '../army.js?v=0.52.0';
import { identite, prochainGrade } from '../identite.js?v=0.52.0';

export const majuscule = s => s[0].toUpperCase() + s.slice(1);
// Le moral d'un régiment en trois niveaux, pour l'interface (v0.41.3) : « tient » (tient, tient bon), « ebranle » (ébranlé, au bord de la déroute), « deroute »
// Le statut d'un régiment qui tient son moral (Jérôme, v0.47.2 : un régiment à qui l'on ordonne de marcher n'a plus le statut « Tient ») : « Attaque » (il va vers une tranchée d'en face ou l'attaque),
// « En marche » (vers une tranchée à nous), « En mouvement » (en terrain libre, ses hommes marchent : 0,35 m/s en moyenne), sinon « Tient ». Le moral prime : l'appelant garde « Ébranlé » et « En déroute ».
export function statutOrdre(B, reg) {
  if (!reg.effectif || reg.deroute) return 'Tient';
  const a = actionDe(B, reg);
  if (a.startsWith('attaque') || a.startsWith('marche à l\'attaque')) return 'Attaque';
  if (a.startsWith('marche')) return 'En marche';
  if (a.startsWith('en terrain libre')) {
    const A = B.armee; let n = 0, v = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) { n++; v += Math.hypot(A.vx[i], A.vy[i]); }
    if (n && v / n > 0.35) return 'En mouvement';
  }
  return 'Tient';
}
export function niveauMoral(reg, R) {
  const m = moralEnMots(reg, R);
  return m === 'en déroute' ? 'deroute' : m.startsWith('tient') ? 'tient' : 'ebranle';
}
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
  const graineDe = camp => camp === NOUS ? B.etat.graineIdentite : B.etat.graine;   // en face : d'autres hommes à chaque bataille
  let p = 0;
  for (const r of B.etat.regiments) {
    if (id < p + r.initial) return { reg: r, qui: identite(graineDe(r.camp), r.camp, r.camp === NOUS ? numeroCampagne(B.etat, id) : id, id - p, r.initial, B.etat.grades[id]?.[0] ?? -1) };
    p += r.initial;
  }
  return { reg: null, qui: identite(graineDe(NOUS), NOUS, numeroCampagne(B.etat, id)) };
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
  const releves = reg.releves || 0, evacues = reg.initial - reg.effectif - reg.pertes - releves;
  return { vivants: reg.effectif, initial: reg.initial, blesses, morts: reg.pertes, evacues, releves };
}
export const enMots = b => b.releves
  ? `relevé : ${b.releves} hommes sur ${b.initial} en sont revenus · ${b.morts} morts`
  : `${b.vivants} hommes sur ${b.initial} · ${b.blesses} blessés · ${b.morts} morts${b.evacues ? ` · ${b.evacues} évacués` : ''}`;

// le numéro d'ordre d'un régiment dans son camp : « 3 · Viride »
export const numeroDe = (B, r) => B.etat.regiments.filter(g => g.camp === r.camp).indexOf(r) + 1;
export const pluriel = (n, un, des) => `${n} ${n > 1 ? des : un}`;

// Ce que fait un homme (v0.35.0), dit de son état : en déroute, blessé qui regagne l'arrière ou reste à terre, tapi, en marche, à sa place
export function actionEnMots(B, i) {
  const A = B.armee, R = B.R, reg = B.etat.regiments[A.reg[i]], b = A.blessure[i];
  if (B.etat.phase !== 'jour') return 'au repos';
  if (reg?.deroute) return 'en déroute';
  if (b) {
    if (b === 1 || (b === 2 && legere(A.id[i], R.soldat.jambeLegere))) {
      const ar = arriereDe(B);
      return !ar || Math.abs(A.y[i] - ar[A.camp[i]]) < 1.5 ? 'à l\'arrière, blessé' : 'regagne l\'arrière, blessé';
    }
    return 'reste à terre, blessé';
  }
  if (A.peur[i] >= R.soldat.terreur) return 'tapi, terrifié';
  if (Math.hypot(A.vx[i], A.vy[i]) > 0.5) return 'marche';
  return 'tient sa place';
}
// depuis quand un homme est au front : le jour 1, ou la nuit de son retour s'il était évacué (v0.35.0)
export function auFront(B, id) {
  const ev = B.etat.evacues.find(e => e[0] === id && e[3] > 0);
  return ev ? ev[3] : 1;
}
// les moyennes d'un régiment : la peur, la fatigue des jambes et des bras, l'expérience de ses hommes (v0.35.0)
export function moyennes(B, regId) {
  const A = B.armee;
  let n = 0, peur = 0, fatJ = 0, fatB = 0, exp = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === regId) { n++; peur += A.peur[i]; fatJ += A.fatJ[i]; fatB += A.fatB[i]; exp += A.exp[i]; }
  return n ? { n, peur: peur / n, fatJ: fatJ / n, fatB: fatB / n, exp: exp / n } : { n: 0, peur: 0, fatJ: 0, fatB: 0, exp: 0 };
}
export { prochainGrade };
