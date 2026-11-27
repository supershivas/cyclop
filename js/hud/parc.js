// Le parc de nos engins, lu sur le champ (sorti de main.js, lot de dette du 24 nov.) : les avions au sol, les chars du parc, les sections du
// génie au dépôt, leurs pastilles et ce qu'un clic en fait. `creerParc(ctx)` rend { enginSous, enginsParc, parcSous }.
import { placeAvion, placesChars, placesGenie, parcChars, campDe } from '../camp.js?v=0.170.7';
import { avionsAbimes, codeAvion, codeChar, reparationFaite } from '../genie.js?v=0.170.7';
import { PARC } from '../data/parc.js?v=0.170.7';
import { AVION, MITRAILLAGE } from '../data/mitraillage.js?v=0.170.7';
import { CHAR } from '../data/chars.js?v=0.170.7';
import { GENIE, GENIE_DATA } from '../data/genie.js?v=0.170.7';

let bataille, moi;
export function creerParc(ctx) {
  ({ bataille, moi } = ctx);
  return { enginSous, enginsParc, parcSous };
}
// Le génie répare à la base (v0.130.0) : un avion de l'escadrille au sol ou un char rentré au parc. Ils sont dans la marge arrière, hors du secteur d'ordres : l'ordre les désigne par un code (genie.js) et
// non par des coordonnées. `enginSous` : l'engin abîmé du parc sous un point du terrain (un clic), ou null.
function enginSous(x, y) {
  const B = bataille(), MOI = moi();
  if (!campDe(B.etat, MOI)?.bride) return null;
  const r2 = PARC.portee ** 2, pres = p => (p.x - x) ** 2 + (p.y - y) ** 2 <= r2;
  for (const k of avionsAbimes(B.etat, MOI)) if (pres(placeAvion(B.etat, MOI, k))) return codeAvion(k);
  for (const p of placesChars(B.etat, MOI)) { const r = p.id !== null && parcChars(B.etat, MOI).find(q => q.id === p.id); if (r && r.pv < r.pvMax && r.pv > 0 && pres(p)) return codeChar(p.id); }
  return null;
}
// Choisir un engin là où il attend (Jérôme, v0.140.0 : « sélectionner un char directement depuis le camp des chars et l'envoyer sans passer par le bouton, idem pour un avion, idem pour le génie,
// un petit régiment visible »). Chaque avion au sol, chaque char du parc et chaque section du génie au dépôt a sa pastille et se clique sur le champ : le clic arme son ordre comme le ferait son
// bouton (`viser` : mêmes refus à voix haute), le clic suivant sur le terrain l'envoie. Un engin abîmé qu'on peut réparer aujourd'hui : le clic envoie le génie, comme depuis la v0.130.0.
function enginsParc() {
  const B = bataille(), MOI = moi();
  const out = [];
  if (!B || !campDe(B.etat, MOI)?.bride || B.etat.phase !== 'jour') return out;
  const E = B.etat, repar = !reparationFaite(E, MOI) && E.sapeurs[MOI] > 0, abimes = new Set(avionsAbimes(E, MOI));
  (E.avions?.[MOI] ?? []).forEach((pv, k) => {
    if (!(pv > 0) || k >= PARC.avions.length || (E.mitraillages ?? []).some(v => v.camp === MOI && v.k === k && v.etat === 'vol')) return;
    const p = placeAvion(E, MOI, k), ab = abimes.has(k);
    out.push({ cle: `pa${k}`, type: 'avion', cal: AVION, x: p.x, y: p.y, h: 3.5, vie: pv / MITRAILLAGE.pv, code: ab ? codeAvion(k) : null, emprise: [10, 9],
      info: `# Avion au sol\n## ${ab ? 'abîmé' : 'prêt'}\nCellule : **${Math.round(pv / MITRAILLAGE.pv * 100)} %**\n${ab && repar ? 'Un clic : le génie le remet en état.' : 'Un clic : il décolle, vous prenez les commandes en l\'air.\nMaj+clic : il est choisi, puis deux clics sur le champ : sa passe.'}` });
  });
  placesChars(E, MOI).forEach((p, i) => {
    const r = p.id !== null ? parcChars(E, MOI).find(q => q.id === p.id) : null, vie = r ? Math.max(0, r.pv / r.pvMax) : 1, ab = !!r && r.pv < r.pvMax && r.pv > 0;
    out.push({ cle: `pc${i}`, type: 'char', cal: CHAR, x: p.x, y: p.y, h: 4, vie, code: ab ? codeChar(p.id) : null, emprise: [8, 6], premier: i === 0,
      info: `# Char au parc\n## ${ab ? 'abîmé' : 'prêt'}\nCoque : **${Math.round(vie * 100)} %**\n${ab && repar ? 'Un clic : le génie le remet en état.' : 'Un clic : il sort, vous êtes à bord.\nMaj+clic : il est choisi, puis un clic sur le champ : son objectif. Les chars sortent dans l\'ordre des places.'}` });
  });
  placesGenie(E, MOI).forEach((p, i) => out.push({ cle: `pg${i}`, type: 'genie', cal: GENIE, x: p.x, y: p.y, h: 3, vie: 1, code: null, emprise: [6, 5],
    info: `# Section du génie\n## au dépôt\n${GENIE_DATA.hommes} hommes sans arme.\nUn clic : elle est choisie. Puis un clic sur un pont coupé, un nid détruit, l'épave d'un char ou un engin abîmé du parc.` }));
  return out;
}
function parcSous(x, y) {
  let m = null, md = PARC.portee ** 2;
  for (const e of enginsParc()) { const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d <= md) { md = d; m = e; } }
  return m;
}
