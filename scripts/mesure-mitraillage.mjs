// Mesure du mitraillage aérien (Jérôme, v0.55.0 → v0.58.0) : combien de points de vie un avion laisse selon la passe, et combien d'hommes il touche.
//   node scripts/mesure-mitraillage.mjs [soldats par camp, défaut 3000]
// Trois passes de nous vers eux, sur une bataille neuve (graine 7 et 11) : « droit » (de notre côté du no man's land jusqu'à leur première ligne, puis il sort au-dessus de leurs
// arrières), « en long » (le long de leur première ligne, 150 m : il entre par le flanc) et « en profondeur » (de leur première ligne vers leurs arrières, 150 m).
import { nouvelleBataille, avancer, ordonnerBarrage, zone } from '../js/bataille.js';
import { REGLAGES as R } from '../js/data/reglages.js';

const n = Number(process.argv[2] || 3000);
const ligne = (B, camp) => { const A = B.armee; let m = camp ? 1e9 : -1e9; for (let i = 0; i < A.n; i++) if (A.camp[i] === camp) m = camp ? Math.min(m, A.y[i]) : Math.max(m, A.y[i]); return m; };
for (const graine of [7, 11]) {
  const proto = nouvelleBataille(graine, R, { soldats: n }), Z = zone(proto), cx = (Z.x0 + Z.x1) / 2, yEux = ligne(proto, 1);
  const passes = {
    'droit (nord, 70 m, chez eux)': [cx, yEux + 40, cx, yEux - 30],
    'en long (150 m sur leur ligne)': [cx - 75, yEux + 3, cx + 75, yEux + 3],
    'en profondeur (110 m)': [cx, yEux, cx, Math.max(Z.y0 + 5, yEux - 110)],
  };
  for (const [nom, [x1, y1, x2, y2]] of Object.entries(passes)) {
    const B = nouvelleBataille(graine, R, { soldats: n });
    avancer(B);
    const avant = [B.etat.pertes[0] + B.etat.blesses[0], B.etat.pertes[1] + B.etat.blesses[1]];
    const r = ordonnerBarrage(B, 'avion', x1, y1, 0, x2, y2); if (!r.ok) { console.log(nom, r); continue; }
    const v = B.etat.mitraillages[0]; let pvMin = v.pv, etat = '';
    for (let k = 0; k < 2400 && B.etat.mitraillages.length; k++) { avancer(B); if (v.etat === 'epave') { etat = 'abattu'; break; } }
    const t = [B.etat.pertes[0] + B.etat.blesses[0] - avant[0], B.etat.pertes[1] + B.etat.blesses[1] - avant[1]];
    console.log(`graine ${graine} · ${nom.padEnd(32)} pv restants ${String(Math.round(B.etat.avions[0][0])).padStart(3)} ${etat.padEnd(7)} · touchés : eux ${t[1]}, nous ${t[0]}`);
  }
}
