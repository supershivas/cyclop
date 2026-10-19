// L'attrition d'une campagne entière (lot 3, v0.36.3) : trois batailles de suite, jouées sans les mains, le registre reporté de l'une à l'autre.
//   node scripts/mesure-campagne.mjs                       → campagne 11, un joueur qui tient ou qui attaque selon la mission
//   node scripts/mesure-campagne.mjs --campagnes 11,12,13  → plusieurs campagnes (la moyenne est en bas)
//   --assauts 2    → la mission « prendre » n'attaque que les 2 premiers jours (à partir du 2e), puis tient (défaut : tous les jours, le plancher)
//   --plan 2:forces=1.25,3:forces=0.9   → essayer un réglage de data/campagne.js (bataille:clé=valeur ; ia.offensive=… aussi) sans toucher au fichier
//   --releve non   → ne relève jamais ; --sans-ordres oui → aucun ordre (nos régiments restent dans leurs tranchées)
// Le joueur de la mesure : « tenir » = rien (les barrages de nos batteries seulement) ; « prendre » = chaque matin, 60 s de barrages sur la 1re ligne d'en face, puis
// tous nos régiments à l'assaut ; la nuit, il relève un régiment tombé sous 40 % de son effectif tant qu'il reste de la réserve. Le but n'est pas de bien jouer : c'est un plancher
// (un joueur attentif fait mieux) pour voir si la campagne est jouable : durée, effectifs, vétérans qui survivent, bataille où l'on s'effondre.
import { nouvelleBataille, avancer, aube, ordonnerMarche, ordonnerBarrage, zone, PAS } from '../js/bataille.js';
import { ligneY } from '../js/tranchees.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { nouvelleCampagne, suivante, cloturer } from '../js/campagne.js';
import { CAMPAGNE } from '../js/data/campagne.js';

const arg = (nom, defaut) => { const k = process.argv.indexOf(`--${nom}`); return k > 0 ? process.argv[k + 1] : defaut; };
const campagnes = arg('campagnes', '11').split(',').map(Number), releve = arg('releve', 'oui') !== 'non', sansOrdres = arg('sans-ordres', 'non') === 'oui';
const assauts = +arg('assauts', 99), plan = structuredClone(CAMPAGNE);
for (const kv of arg('plan', '').split(',').filter(Boolean)) {
  const [n, reste] = kv.split(':'), [chemin, v] = reste.split('='), cles = chemin.split('.');
  let o = plan.batailles[n - 1]; for (const k of cles.slice(0, -1)) o = o[k]; o[cles.at(-1)] = +v;
}
const NOUS = 0, EUX = 1, jeu = (nom, n, d) => `${nom} ${String(n).padStart(d)}`;

function matin(B, mission) {
  const e = B.etat;
  if (sansOrdres) return null;
  const L = B.lignes.find(l => l.camp === EUX && l.rang === 0), x = zone(B).x0 + 200;
  const ids = e.regiments.filter(r => r.camp === NOUS && r.effectif > 0).map(r => r.id);
  if (mission === 'prendre' && e.jour >= 2 && e.jour < 2 + assauts) return { L, x, ids, appui: Math.round(60 / PAS) };
  return null;
}
function jouer(B, mission) {
  const e = B.etat, t0 = Date.now();
  while (e.phase !== 'fin') {
    if (e.phase === 'nuit') {
      const choix = {};
      if (releve) for (const r of e.regiments) if (r.camp === NOUS && r.effectif > 0 && r.effectif < r.initial * 0.4 && !r.releve) choix[r.id] = 'releve';
      aube(B, choix);
      continue;
    }
    const plan = matin(B, mission);
    for (let k = 0; e.phase === 'jour'; k++) {
      if (plan && k < plan.appui + 1) {
        if (k % 30 === 0) for (const cal of ['220', '155', '75']) ordonnerBarrage(B, cal, plan.x + ((k / 30 | 0) % 5 - 2) * 20, ligneY(plan.L, plan.x), NOUS);
        if (k === plan.appui) ordonnerMarche(B, plan.ids, plan.x, ligneY(plan.L, plan.x), undefined, NOUS);
      }
      avancer(B);
    }
  }
  return (Date.now() - t0) / 1000;
}

const total = [];
for (const g of campagnes) {
  let c = nouvelleCampagne(g, plan);
  console.log(`\n══ Campagne ${g} ══`);
  while (c.statut === 'en cours') {
    const s = suivante(c, plan), B = nouvelleBataille(s.graine, R, s.opts), e = B.etat;
    const debut = B.armee.exp.subarray(0, B.armee.n);
    let vet = 0, nous = 0; for (let i = 0; i < B.armee.n; i++) if (B.armee.camp[i] === NOUS) { nous++; if (debut[i] >= 0.08) vet++; }
    const [nEux] = [B.etat.regiments.filter(r => r.camp === EUX).reduce((t, r) => t + r.initial, 0)];
    const dur = jouer(B, s.mission);
    c = cloturer(c, B);
    const b = c.batailles[c.batailles.length - 1], vivants = b.regiments.reduce((t, r) => t + r.survivants.length, 0), debout = b.regiments.filter(r => r.survivants.length).length;
    const aguerris = b.regiments.reduce((t, r) => t + r.survivants.filter(x => x[2] >= 0.08).length, 0);
    total.push({ g, n: b.n, jours: b.jours, reussie: b.issue?.reussie, nous, eux: nEux, vet, mortsN: b.pertes[0], mortsE: b.pertes[1], vivants, debout, aguerris, dur });
    console.log(`${jeu('bataille', b.n, 1)} ${b.secteur.padEnd(7)} ${s.mission.padEnd(7)} ${b.jours} j  nous ${nous} (dont ${vet} aguerris) contre ${nEux}  morts ${b.pertes[0]}/${b.pertes[1]}  ${b.issue?.reussie ? 'réussie' : 'MANQUÉE'} : ${b.issue?.texte}`);
    console.log(`   survivants ${vivants} dans ${debout} régiments (${aguerris} aguerris) ; par régiment : ${b.regiments.map(r => `${r.nom} ${r.survivants.length}`).join(', ')}  [${dur.toFixed(0)} s de calcul]`);
  }
  console.log(`   → campagne ${c.statut === 'terminee' ? 'terminée' : 'effondrée'} après ${c.batailles.length} bataille(s) ; prochain numéro ${c.prochainNumero}`);
}
console.log('\n── Moyennes sur les batailles ──');
for (const n of [1, 2, 3]) {
  const s = total.filter(t => t.n === n); if (!s.length) continue;
  const m = k => s.reduce((t, x) => t + x[k], 0) / s.length;
  console.log(`bataille ${n} (${s.length}) : ${m('jours').toFixed(1)} j, nous ${m('nous').toFixed(0)} (aguerris ${m('vet').toFixed(0)}) contre ${m('eux').toFixed(0)}, morts ${m('mortsN').toFixed(0)}/${m('mortsE').toFixed(0)}, survivants ${m('vivants').toFixed(0)} dans ${m('debout').toFixed(1)} régiments, réussie ${s.filter(x => x.reussie).length}/${s.length}, ${m('dur').toFixed(0)} s`);
}
