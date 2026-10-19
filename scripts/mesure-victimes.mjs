// Les seuils de « Un / Cinq / Dix à son compte » (v0.37.0) : combien d'hommes un soldat abat-il au fusil dans une bataille ?
//   node scripts/mesure-victimes.mjs                       → graines 3, 7, 8 ; assaut contre la 1re ligne (on attaque), puis assaut d'en face (on tient)
//   node scripts/mesure-victimes.mjs --pas 32400 --ia on   → un jour entier (32 400 pas), l'IA d'en face joue
//   --jours 3    → plusieurs jours (nuits passées sans corvée) : l'assaut est renouvelé chaque matin, l'IA d'en face joue
//   --appui 60   → 60 s de barrages d'abord (sans lui, l'assaut n'atteint jamais la tranchée en 300 s)
// Pour chaque camp : la distribution des victimes par homme (vivants, tombés, évacués, prisonniers, tous comptés), à ≥ 1, 2, 3, 4, 5 et 10.
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, zone, PAS } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { REGLAGES } from '../js/data/reglages.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const graines = arg('graines', '3,7,8').split(',').map(Number), pas = +arg('pas', 9000), appui = +arg('appui', 60), jours = +arg('jours', 0), ia = arg('ia', 'off') === 'on' || jours > 0;
const R = structuredClone(REGLAGES);

// les victimes de chaque homme qui a existé : { numéro → [camp, victimes] }
function victimesDe(B) {
  const A = B.armee, e = B.etat, tout = new Map();
  const regiment = id => { let p = 0; for (const r of e.regiments) { if (id < p + r.initial) return r.camp; p += r.initial; } return 0; };
  for (const c of e.corps) tout.set(c[4], [c[2], c[5] ?? 0]);
  for (const c of e.tombes) tout.set(c[4], [c[2], c[5] ?? 0]);
  for (const p of e.prisonniers) tout.set(p[0], [regiment(p[0]), p[2] ?? 0]);
  for (const v of e.evacues) tout.set(v[0], [regiment(v[0]), v[6] ?? 0]);
  for (let i = 0; i < A.n; i++) tout.set(A.id[i], [A.camp[i], A.victimes[i]]);
  return tout;
}
function essai(graine, role) {
  const B = nouvelleBataille(graine, R, { deux: !ia });
  const A = role === 'attaque' ? 0 : 1, D = 1 - A;
  const ids = c => B.etat.regiments.filter(r => r.camp === c).map(r => r.id);
  const Z = zone(B), x = Z.x0 + 200, L = B.lignes.find(l => l.camp === D && l.rang === 0);
  const partir = () => ordonnerMarche(B, ids(A), x, ligneY(L, x), undefined, A);
  if (jours) {            // chaque matin : l'appui d'artillerie puis l'assaut ; chaque nuit : le repos
    for (let j = 0; j < jours && B.etat.phase !== 'fin'; j++) {
      for (let k = 0; B.etat.phase === 'jour'; k++) {
        if (k === Math.round(appui / PAS)) partir();
        if (k < Math.round(appui / PAS) + 2400) for (const cal of ['220', '155', '75']) ordonnerBarrage(B, cal, x + ((k / 30 | 0) % 5 - 2) * 20, ligneY(L, x), A);
        avancer(B);
      }
      if (B.etat.phase === 'nuit') aube(B, {});
    }
    return victimesDe(B);
  }
  if (!appui) partir();
  for (let k = 0; k < pas; k++) {
    if (appui && k === Math.round(appui / PAS)) partir();
    if (appui && k < Math.round(appui / PAS) + 2400) for (const cal of ['220', '155', '75']) ordonnerBarrage(B, cal, x + ((k / 30 | 0) % 5 - 2) * 20, ligneY(L, x), A);
    avancer(B);
  }
  return victimesDe(B);
}
for (const role of ['attaque', 'defense']) {
  console.log(`\n── ${role === 'attaque' ? 'On attaque la 1re ligne d\'en face' : 'On tient contre l\'assaut'} (${jours ? `${jours} jours` : `${pas} pas`}, appui ${appui} s${ia ? ', IA' : ''}) ──`);
  console.log('graine  camp   hommes  tireurs(≥1)  ≥2  ≥3  ≥4  ≥5  ≥10  max   total   part des tireurs qui font ≥5');
  for (const g of graines) {
    const tout = essai(g, role);
    for (const camp of [0, 1]) {
      const v = [...tout.values()].filter(([c]) => c === camp).map(([, n]) => n), n = v.length;
      const ge = k => v.filter(x => x >= k).length, tir = ge(1), total = v.reduce((s, x) => s + x, 0);
      console.log(`${String(g).padEnd(7)} ${(camp ? 'EUX' : 'NOUS').padEnd(5)} ${String(n).padStart(7)} ${String(tir).padStart(12)} ${String(ge(2)).padStart(3)} ${String(ge(3)).padStart(3)} ${String(ge(4)).padStart(3)} ${String(ge(5)).padStart(3)} ${String(ge(10)).padStart(4)} ${String(Math.max(0, ...v)).padStart(4)} ${String(total).padStart(6)}   ${(tir ? ge(5) / tir * 100 : 0).toFixed(0)} %`);
    }
  }
}
