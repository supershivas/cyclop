// Les niveaux de difficulté, mesurés (v0.70.0) : chaque niveau, mêmes graines, un joueur-plancher (pas un bon joueur).
//   node scripts/mesure-difficulte.mjs                     → graines 3,7,11, 400 hommes par camp, 5 jours
//   node scripts/mesure-difficulte.mjs --graines 3,7 --soldats 750 --jours 7
//   --joueur tenir|prendre   → « tenir » : aucun ordre ; « prendre » : au 2e matin, 60 s de barrages sur la 1re ligne d'en face puis tous nos régiments à l'assaut
// Rend, par niveau : nos morts, leurs morts, l'issue de la mission (moyennes), le jour où elle est jugée.
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, zone, PAS } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { DIFFICULTES } from '../js/data/difficulte.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const graines = arg('graines', '3,7,11').split(',').map(Number), soldats = +arg('soldats', 400), jours = +arg('jours', 5), joueur = arg('joueur', 'tenir');

function partie(graine, difficulte) {
  const mission = joueur === 'prendre' ? 'prendre' : 'tenir';
  const B = nouvelleBataille(graine, R, { soldats, jours, difficulte, secteur: 'essai', mission });
  const e = B.etat; let assaut = false;
  while (e.phase !== 'fin') {
    if (e.phase === 'nuit') { aube(B, {}); continue; }
    if (joueur === 'prendre' && e.jour >= 2 && !assaut) {
      assaut = true;
      const L = B.lignes.find(l => l.camp === 1 && l.rang === 0), x = zone(B).x0 + 200;
      for (const c of ['220', '155', '75']) ordonnerBarrage(B, c, x, ligneY(L, x), 0);
      ordonnerMarche(B, e.regiments.filter(r => r.camp === 0 && r.effectif > 0).map(r => r.id), x, ligneY(L, x));
    }
    if (e.jour > 2) assaut = true;
    avancer(B);
  }
  return { nous: e.pertes[0], eux: e.pertes[1], issue: e.issue?.reussie, jour: e.jour };
}
for (const [id, D] of Object.entries(DIFFICULTES)) {
  const t0 = Date.now(), r = graines.map(g => partie(g, id));
  const m = k => (r.reduce((s, x) => s + x[k], 0) / r.length).toFixed(0);
  console.log(`${D.nom.padEnd(18)} nos morts ${m('nous').padStart(4)}  leurs morts ${m('eux').padStart(4)}  issues ${r.map(x => x.issue === null ? '-' : x.issue ? 'oui' : 'non').join(',')}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
