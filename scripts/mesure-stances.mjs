// L'équilibre des postures (v0.36.0) : un assaut d'infanterie contre une tranchée tenue, chaque posture contre chaque autre.
//   node scripts/mesure-stances.mjs                          → graines 3, 7, 8, 9 000 pas (5 minutes de jeu), sans IA ni artillerie
//   node scripts/mesure-stances.mjs --graines 3 --pas 10800  → une graine, un jour entier
//   --cas volonte-retenu,retenu-retenu   → seulement ces couples (attaquant-défenseur) ; --role defense → un seul rôle
//   --appui 90   → l'artillerie de l'attaquant pilonne la ligne visée pendant 90 s, puis l'assaut part (sans appui, l'assaut ne parvient jamais à la tranchée en 300 s)
//   --ia on|off  → l'IA d'en face joue (barrages, assauts) avec ou sans la posture `ia.stance` ('retenu') : on l'attaque à volonté, sa posture n'est pas touchée (rôle « attaque », volonté-volonté)
//   --regle retenu.precision=1.3,tir.plancher=0.1   → essayer un réglage sans toucher au fichier
// Deux rôles : on attaque la 1re ligne d'en face (elle tient, avec sa posture), ou on la tient contre l'assaut d'en face (les nôtres, avec la leur).
// Pour chaque cas : les morts et blessés de l'attaquant et du défenseur, les tronçons de la ligne attaquée perdus, la date de la 1re prise.
// Lecture : une posture domine si, à posture adverse égale, elle fait mieux sur les trois graines et dans les deux rôles ; la règle du lot est écrite dans le ROADMAP.
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerStance, ordonnerBarrage, zone, PAS } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { STANCES } from '../js/data/stances.js';
import { REGLAGES } from '../js/data/reglages.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const graines = arg('graines', '3,7,8').split(',').map(Number), pas = +arg('pas', 9000);
const postures = Object.keys(STANCES), roles = arg('role', 'attaque,defense').split(',');
const ia = arg('ia', ''), appui = +arg('appui', 0), cas = arg('cas', '').split(',').filter(Boolean), garde = (a, d) => !cas.length || cas.includes(`${a}-${d}`);
const R = structuredClone(REGLAGES);
for (const kv of (arg('regle', '') || '').split(',').filter(Boolean)) {      // --regle retenu.precision=1.3,retenu.periode=1.2 : essayer un réglage sans toucher au fichier
  const [chemin, v] = kv.split('='), [id, cle] = chemin.split('.');
  (R.stance[id] ?? R[id])[cle] = +v;      // une posture (retenu.precision) ou un réglage (tir.plancher, tir.contact=0)
}

if (ia) R.ia.stance = ia === 'on' ? 'retenu' : '';
function essai(graine, attaquant, defenseur, role) {
  const B = nouvelleBataille(graine, R, { deux: !ia });            // (deux : l'IA d'en face se tait ; avec --ia, elle joue)
  const A = role === 'attaque' ? 0 : 1, D = 1 - A;
  const ids = c => B.etat.regiments.filter(r => r.camp === c).map(r => r.id);
  const Z = zone(B), x = Z.x0 + 200;
  const L = B.lignes.find(l => l.camp === D && l.rang === 0);
  const partir = () => { ordonnerMarche(B, ids(A), x, ligneY(L, x), undefined, A); ordonnerStance(B, ids(A), attaquant, A); };     // (la marche remet à volonté : la posture vient après)
  if (!appui) partir();
  if (!ia) ordonnerStance(B, ids(D), defenseur, D);
  let prise = null, melee = 0;
  for (let k = 0; k < pas; k++) {
    if (appui && k === Math.round(appui / PAS)) partir();
    if (appui && k < Math.round(appui / PAS) + 2400) for (const cal of ['220', '155', '75']) ordonnerBarrage(B, cal, x + ((k / 30 | 0) % 5 - 2) * 20, ligneY(L, x), A);     // (refusé tant que la batterie recharge)
    const ev = avancer(B);
    if (prise === null && ev.some(e => e.type === 'prise' && e.camp === A)) prise = k * PAS;
    if (k % 30 === 0 && B.etat.melee.some(m => m > 0)) melee++;
  }
  const e = B.etat, ligne = B.lignes.indexOf(L);
  const tenus = B.troncons.reduce((s, tr, k) => s + (tr.ligne === ligne && e.troncons[k] === D ? 1 : 0), 0), tous = B.troncons.filter(tr => tr.ligne === ligne).length;
  return { mortsA: e.pertes[A], mortsD: e.pertes[D], blessesA: e.blesses[A], blessesD: e.blesses[D], perdus: tous - tenus, tous, prise, melee };
}

const lignes = [];
for (const role of roles) {
  console.log(`\n── ${role === 'attaque' ? 'On attaque la 1re ligne d\'en face' : 'On tient notre 1re ligne contre l\'assaut'} (${pas} pas) ──`);
  console.log('graine  attaquant      défenseur      morts A  morts D  rapport  blessés A/D  tronçons perdus  1re prise (s)  mêlées (s)');
  for (const g of graines) for (const a of postures) for (const d of postures) {
    if (!garde(a, d)) continue;
    const r = essai(g, a, d, role);
    lignes.push({ role, g, a, d, ...r });
    console.log(`${String(g).padEnd(7)} ${STANCES[a].nom.padEnd(14)} ${STANCES[d].nom.padEnd(14)} ${String(r.mortsA).padStart(7)} ${String(r.mortsD).padStart(8)} ${(r.mortsD / Math.max(1, r.mortsA)).toFixed(2).padStart(8)}  ${String(r.blessesA).padStart(5)}/${String(r.blessesD).padEnd(5)}  ${`${r.perdus}/${r.tous}`.padStart(14)}  ${r.prise === null ? '—'.padStart(13) : r.prise.toFixed(0).padStart(13)}  ${String(r.melee).padStart(9)}`);
  }
}
// moyenne sur les graines : rapport = morts du défenseur par mort de l'attaquant (plus haut : l'attaquant s'en tire mieux)
console.log('\n── Moyennes sur les graines ──');
for (const role of roles) for (const a of postures) for (const d of postures) {
  const s = lignes.filter(l => l.role === role && l.a === a && l.d === d);
  if (!s.length) continue;
  const m = k => s.reduce((t, l) => t + l[k], 0) / s.length;
  console.log(`${role.padEnd(8)} A ${a.padEnd(8)} D ${d.padEnd(8)} morts A ${m('mortsA').toFixed(0).padStart(4)}  morts D ${m('mortsD').toFixed(0).padStart(4)}  tronçons perdus ${m('perdus').toFixed(1)}/${s[0].tous}`);
}
