// Le duel du jeu à deux, mesuré (v0.115.0) : les seuils de data/deux.js (DUEL) d'après des joueurs-planchers.
//   node scripts/mesure-duel.mjs                              → graines 3,7, 400 hommes par camp, 3 et 6 jours
//   node scripts/mesure-duel.mjs --graines 3,7,11 --soldats 750 --jours 3,6,10
// Chaque camp suit un plan : « passif » (aucun ordre) ou « assautN » (au matin du jour N : barrages puis tous les régiments à l'assaut de la 1re ligne d'en face).
// Rend, par durée et par couple de plans : le score au soir de chaque jour (bleu–kaki), le jour et la cause de la fin (terme, avance, effondrement), le gagnant.
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, zone, scoreDuel } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { DUEL } from '../js/data/deux.js';
import { optionsDeuxEnBataille, DEFAUTS_DEUX } from '../js/data/deux.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const graines = arg('graines', '3,7').split(',').map(Number), soldats = +arg('soldats', 400), durees = arg('jours', '3,6').split(',').map(Number);
const PLANS = [['passif', 'passif'], ['assaut2', 'passif'], ['assaut2', 'assaut2'], ['assaut2', 'assaut3'], ['assaut3', 'assaut2']];

function assaut(B, camp) {
  const ligne = B.lignes.find(l => l.camp === 1 - camp && l.rang === 0); if (!ligne) return;
  const x = zone(B).x0 + 200, y = ligneY(ligne, x);
  for (const c of ['220', '155', '75']) ordonnerBarrage(B, c, x, y, camp);
  ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === camp && r.effectif > 0).map(r => r.id), x, y, undefined, camp);
}
function partie(graine, jours, plans) {
  const B = nouvelleBataille(graine, R, { soldats, secteur: 'essai', deux: true, camp: true, ...optionsDeuxEnBataille({ ...DEFAUTS_DEUX }), jours });
  const e = B.etat, soirs = [], fait = [false, false];
  while (e.phase !== 'fin') {
    if (e.phase === 'nuit') { const s = scoreDuel(B); soirs.push(s.join('–')); aube(B, {}); continue; }
    if (e.tickJour === 0) plans.forEach((p, camp) => { if (p === `assaut${e.jour}` && !fait[camp]) { fait[camp] = true; assaut(B, camp); } });
    avancer(B);
  }
  const [a, b] = scoreDuel(B), terme = e.jour >= e.meteo.length;
  const cause = /avance/.test(e.issue.texte) ? 'avance' : /tombé/.test(e.issue.texte) ? 'effondrement' : 'terme';
  return { soirs, final: `${a}–${b}`, jour: e.jour, cause, gagnant: e.issue.nul ? 'nul' : e.issue.gagnant === 0 ? 'bleu' : 'kaki', pertes: e.pertes.join('/'), terme };
}
console.log(`DUEL : prise ${DUEL.prise}, 1 point par ${DUEL.pertesPour} hommes, avance ${DUEL.ecartParJour} × jours, effondrement ${DUEL.effondrement} ; ${soldats} hommes par camp\n`);
for (const jours of durees) {
  console.log(`== ${jours} jours : avance qui finit la bataille = ${DUEL.ecartParJour * jours} points`);
  for (const plans of PLANS) {
    const rs = graines.map(g => partie(g, jours, plans));
    console.log(`  ${plans.join(' / ').padEnd(18)} ${rs.map(r => `[g${graines[rs.indexOf(r)]}] soirs ${r.soirs.join(' ') || '-'} → ${r.final} j${r.jour} ${r.cause} ${r.gagnant} (morts ${r.pertes})`).join('\n' + ' '.repeat(21))}`);
  }
}
