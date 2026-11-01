// Le rythme des chevrons, mesuré (lot E2) : une bataille entière, l'expérience moyenne de chaque régiment et ses chevrons, chaque soir.
//   node scripts/mesure-xp.mjs [--graines 3,7] [--soldats 400] [--jours 10] [--joueur tenir|prendre]
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, zone } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { chevrons } from '../js/identite.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const graines = arg('graines', '3,7').split(',').map(Number), soldats = +arg('soldats', 400), jours = +arg('jours', 10), joueur = arg('joueur', 'prendre');
for (const g of graines) {
  const B = nouvelleBataille(g, R, { soldats, jours, secteur: 'essai', mission: joueur === 'prendre' ? 'prendre' : 'tenir' }), e = B.etat, A = B.armee;
  const bilan = () => {
    const regs = e.regiments.filter(r => r.camp === 0 && r.effectif > 0);
    const m = regs.map(r => { let s = 0, n = 0; for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.reg[i] === r.id) { s += A.exp[i]; n++; } return n ? s / n : 0; });
    return `jour ${String(e.jour).padStart(2)} · exp moyenne par régiment ${m.map(x => x.toFixed(2)).join(' ')} · chevrons ${m.map(chevrons).join('')}`;
  };
  let derniere = e.jour, assaut = false;
  console.log(`graine ${g}`);
  while (e.phase !== 'fin') {
    if (e.phase === 'nuit') { console.log(bilan()); aube(B, {}); continue; }
    if (joueur === 'prendre' && e.jour >= 2 && !assaut) {
      assaut = true;
      const L = B.lignes.find(l => l.camp === 1 && l.rang === 0), x = zone(B).x0 + 200;
      for (const c of ['220', '155', '75']) ordonnerBarrage(B, c, x, ligneY(L, x), 0);
      ordonnerMarche(B, e.regiments.filter(r => r.camp === 0 && r.effectif > 0).map(r => r.id), x, ligneY(L, x));
    }
    if (e.jour > 2) assaut = true;
    avancer(B); derniere = e.jour;
  }
  console.log(bilan() + ' (fin)');
}
