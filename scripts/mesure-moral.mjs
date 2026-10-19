// Le léger effet des marques sur le moral (v0.37.1) : `marques.moral` multiplie le retour du moral d'un régiment par 1 + moral × aguerri
// (`reg.aguerri` : la part, 0 à 1, de marques de survie et de temps que portent ses hommes, calculée à l'aube).
//   node scripts/mesure-moral.mjs                               → graines 3, 5, 7, 8, 9, 11 ; 4 jours ; coefficients 0, 0.2, 0.4
//   node scripts/mesure-moral.mjs --graines 3,7 --jours 3 --coef 0,0.3
//   --sans-ia   → en face ne joue pas (sinon : barrages et assauts)
// Chaque matin : un appui d'artillerie de 60 s sur la 1re ligne d'en face, puis l'assaut de tous nos régiments ; chaque nuit : le repos.
// Pour chaque coefficient, la moyenne (et l'écart-type de la moyenne) sur les graines : déroutes chez nous et en face, nos morts, leurs morts,
// le moral moyen de nos régiments à la fin, les refus d'un jour chez nous, le temps passé en déroute (en secondes de jeu, tous régiments).
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, zone, PAS } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { REGLAGES } from '../js/data/reglages.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const graines = arg('graines', '3,5,7,8,9,11').split(',').map(Number), jours = +arg('jours', 4), coefs = arg('coef', '0,0.2,0.4').split(',').map(Number);
const ia = !process.argv.includes('--sans-ia');

function essai(graine, coef) {
  const R = structuredClone(REGLAGES); R.marques.moral = coef;
  const B = nouvelleBataille(graine, R, { deux: !ia });
  const ids = B.etat.regiments.filter(r => r.camp === 0).map(r => r.id);
  const Z = zone(B), x = Z.x0 + 200, L = B.lignes.find(l => l.camp === 1 && l.rang === 0);
  const m = { derNous: 0, derEux: 0, refus: 0, secDer: 0, aguerri: 0 };
  for (let j = 0; j < jours && B.etat.phase !== 'fin'; j++) {
    for (let k = 0; B.etat.phase === 'jour'; k++) {
      if (k === Math.round(60 / PAS)) ordonnerMarche(B, ids, x, ligneY(L, x));
      if (k < Math.round(60 / PAS) + 2400) for (const cal of ['220', '155', '75']) ordonnerBarrage(B, cal, x + ((k / 30 | 0) % 5 - 2) * 20, ligneY(L, x), 0);
      for (const e of avancer(B)) if (e.type === 'deroute') m[e.camp ? 'derEux' : 'derNous']++;
      if (k % 30 === 0) for (const r of B.etat.regiments) if (r.camp === 0 && r.deroute && r.effectif) m.secDer++;
    }
    if (B.etat.phase === 'nuit') { const r = aube(B, {}); m.refus += (r.bilan?.[0]?.refus ?? []).length; }
  }
  const nos = B.etat.regiments.filter(r => r.camp === 0 && r.effectif);
  return { ...m, morts: B.etat.pertes[0], leurs: B.etat.pertes[1], moral: nos.reduce((s, r) => s + r.moral, 0) / Math.max(1, nos.length), aguerri: nos.reduce((s, r) => s + (r.aguerri ?? 0), 0) / Math.max(1, nos.length) };
}
const stat = v => { const n = v.length, mu = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(1, n - 1)); return [mu, sd / Math.sqrt(n)]; };
const fmt = ([mu, se], d = 1) => `${mu.toFixed(d)} ± ${se.toFixed(d)}`;
const res = {};
for (const c of coefs) { res[c] = []; for (const g of graines) { res[c].push(essai(g, c)); process.stderr.write(`coef ${c} graine ${g} fait\n`); } }
console.log(`\n── ${jours} jours, ${graines.length} graines${ia ? ', IA' : ''} ──`);
console.log('coef   déroutes nous   déroutes eux   s en déroute   refus      nos morts       leurs morts     moral fin       aguerri');
for (const c of coefs) {
  const r = res[c], k = key => stat(r.map(x => x[key]));
  console.log(`${String(c).padEnd(6)} ${fmt(k('derNous')).padEnd(15)} ${fmt(k('derEux')).padEnd(14)} ${fmt(k('secDer'), 0).padEnd(14)} ${fmt(k('refus')).padEnd(10)} ${fmt(k('morts'), 0).padEnd(15)} ${fmt(k('leurs'), 0).padEnd(15)} ${fmt(k('moral'), 3).padEnd(15)} ${fmt(k('aguerri'), 3)}`);
}
