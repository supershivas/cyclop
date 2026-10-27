// La mesure du camp (Jérôme, v0.92.0 ; docs/chantiers/camp-et-ameliorations.md) : une bataille entière sans ordre du joueur, sur quelques graines, avec et sans le camp bridé :
// la dotation versée à chaque camp, les niveaux atteints par en face, les obus qu'elle a tirés par calibre et nos pertes. Les nombres de data/batiments.js se règlent d'après elle.
//   node scripts/mesure-camp.mjs [--graines 3,7,8] [--soldats 300] [--jours 11]
import { nouvelleBataille, avancer, aube } from '../js/bataille.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { NOMS_CALIBRES } from '../js/data/calibres.js';

const arg = (nom, defaut) => { const i = process.argv.indexOf(`--${nom}`); return i >= 0 ? process.argv[i + 1] : defaut; };
const graines = arg('graines', '3,7,8').split(',').map(Number), soldats = +arg('soldats', 300), jours = +arg('jours', 11);
function jouer(graine, camp, difficulte) {
  const B = nouvelleBataille(graine, R, { soldats, jours, camp, difficulte }), e = B.etat;
  const verses = [0, 0];
  while (e.phase !== 'fin') {
    while (e.phase === 'jour') avancer(B);
    if (e.phase !== 'nuit') break;
    const avant = [e.camp.dotation, e.campEux?.dotation ?? 0];
    const r = aube(B);
    if (camp) { verses[0] += r.dotation.points; verses[1] += (e.campEux.dotation - avant[1]); }
  }
  const tires = Object.fromEntries(NOMS_CALIBRES.map((c, k) => [c, e.impacts.filter(i => i[4] === k).length]));
  return { jours: e.jour, pertes: [...e.pertes], tires, verses, eux: camp ? Object.fromEntries(Object.entries(e.campEux.batiments).map(([k, c]) => [k, c.niveau])) : null, nous: e.camp.bride ? Object.fromEntries(Object.entries(e.camp.batiments).map(([k, c]) => [k, c.niveau])) : null };
}
for (const d of ['calme', 'ordinaire', 'offensive']) {
  console.log(`\n── ${d} ──`);
  for (const g of graines) {
    const sans = jouer(g, false, d), avec = jouer(g, true, d);
    console.log(`graine ${g} · sans camp : pertes ${sans.pertes} obus ${JSON.stringify(sans.tires)}`);
    console.log(`          avec camp : pertes ${avec.pertes} obus ${JSON.stringify(avec.tires)} · dotation versée nous ${avec.verses[0]} / eux ${avec.verses[1].toFixed(1)} · niveaux eux ${JSON.stringify(avec.eux)} (nous, sans ordre : ${JSON.stringify(avec.nous)})`);
  }
}
