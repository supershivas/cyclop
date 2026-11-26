// Le récit de la bataille dans le carnet (sorti de main.js, lot de dette du 24 nov.) : chaque événement de la simulation devient une ligne,
// avec ses liens cliquables (un régiment, un tronçon, un homme). `creerRecit(ctx)` rend { raconter, lienReg, lienTronc, lienHomme }.
import { nomTroncon } from '../bataille.js?v=0.170.1';
import * as lecture from './lecture.js?v=0.170.1';

let bataille, moi, noter, largages, surSeisme;
export function creerRecit(ctx) {
  ({ bataille, moi, noter, largages, surSeisme } = ctx);
  return { raconter, lienReg, lienTronc, lienHomme };
}
// les noms du carnet qu'on peut cliquer (Jérôme, v0.100.0) : un régiment, un tronçon, un homme
const lienReg = r => ({ texte: r.nom, cible: { reg: r.id } });
const lienTronc = t => ({ texte: nomTroncon(bataille(), t), cible: { troncon: t } });
const lienHomme = id => { const { qui } = lecture.quiEst(bataille(), id); return { texte: `${qui.prenom} ${qui.nom}`, cible: { soldat: id } }; };
function raconter(ev) {
  const B = bataille(), MOI = moi();
    for (const p of ev) if (p.type === 'caprice' && p.id === 'seisme') surSeisme();
    if (ev.length) for (const [t, genre] of largages().evenements(ev)) noter(t, genre ? { genre } : {});      // les largages (v0.162.0) : le bandeau, le carnet, les découvertes
    for (const p of ev) {
      const reg = p.reg !== undefined ? B.etat.regiments[p.reg] : null;
      if (p.type === 'pont-coupe') noter(`Les obus coupent ${p.nom ? `le ${p.nom}` : 'un pont'} : il tombe à l'eau.`);
      else if (p.type === 'pont-noyes') noter(`${p.nom ?? 'Un pont'} tombe avec des hommes dessus : ${p.noyes} noyé(s), ${p.sauves} sur la rive.`);
      else if (p.type === 'marche-barree' && p.camp === MOI) noter(`${lecture.nomDe(B.etat.regiments[p.reg])} : plus de passage, le régiment s'arrête.`, { liens: [lienReg(reg)] });
      else if (p.type === 'nid-detruit') noter(p.camp === MOI ? `Un de nos nids de mitrailleuse est détruit (${nomTroncon(B, B.etat.nids[p.nid].troncon)}).` : 'Un nid de mitrailleuse d\'en face est détruit.', { liens: p.camp === MOI ? [lienTronc(B.etat.nids[p.nid].troncon)] : [] });
      else if (p.type === 'nid-repare' && p.camp === MOI) noter(`Le génie a refait un nid de mitrailleuse (${nomTroncon(B, B.etat.nids[p.nid].troncon)}).`, { liens: [lienTronc(B.etat.nids[p.nid].troncon)] });
      else if (p.type === 'char-repare' && p.camp === MOI) noter('Le génie a remis un char en état de marche.');
      else if (p.type === 'char-releve' && p.camp === MOI) noter('Le génie a relevé l\'épave d\'un char : il repart, à moitié de sa solidité.');
      else if (p.type === 'char-rentre' && p.camp === MOI) noter('Un char est rentré au parc : le génie peut l\'y réparer.');
      else if (p.type === 'avion-repare' && p.camp === MOI) noter('Le génie a remis un avion en état de vol.');
      else if (p.type === 'pont-rompu') noter('Un pont cède sous le poids d\'un char : char et pont à l\'eau.');
      else if (p.type === 'prise') noter(`${p.camp === MOI ? 'Pris' : 'Perdu'} : ${nomTroncon(B, p.troncon)}.`, { liens: [lienTronc(p.troncon)], genre: p.camp === MOI ? 'gain' : 'perte' });
      else if (p.type === 'dispute') noter(`Ceux d'en face sont dans ${nomTroncon(B, p.troncon)}.`, { liens: [lienTronc(p.troncon)], genre: 'perte' });
      else if (p.type === 'preparation') noter(`En face prépare au 220 sur ${nomTroncon(B, p.troncon)}.`, { liens: [lienTronc(p.troncon)], genre: 'assaut' });
      else if (p.type === 'poursuite') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} poursuit sur notre ligne suivante.`, { liens: reg.nom ? [lienReg(reg)] : [], genre: 'assaut' });
      else if (p.type === 'assaut') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} sort de ses tranchées${p.troncon >= 0 ? ` : ${nomTroncon(B, p.troncon)}` : ''}.`, { liens: [...(reg.nom ? [lienReg(reg)] : []), ...(p.troncon >= 0 ? [lienTronc(p.troncon)] : [])], genre: 'assaut' });
      else if (p.camp !== MOI) continue;
      else if (p.type === 'deroute') noter(`${reg.nom} est en déroute.`, { liens: [lienReg(reg)], genre: 'perte' });
      else if (p.type === 'renfort' && p.camp === MOI) noter(`${reg.nom} sort de la caserne : ${p.mode === 'contre' ? 'contre-attaque' : 'il prend'} ${p.ou}.`, { liens: [lienReg(reg)] });
      else if (p.type === 'ralliees' && p.camp === MOI) noter(`${p.n} fuyards ralliés attendent à la caserne.`);
      else if (p.type === 'ralliement') noter(`${reg.nom} se rallie.`, { liens: [lienReg(reg)] });
      else if (p.type === 'palier') { const { qui } = lecture.quiEst(B, p.id); noter(`${qui.prenom} ${qui.nom} est devenu ${['excellent tireur', 'redoutable au corps à corps', 'infatigable', 'imperturbable'][p.carac]}.`, { liens: [lienHomme(p.id)] }); }
      else if (p.type === 'promu' && p.rang === 0) { const { qui } = lecture.quiEst(B, p.id); noter(`${qui.prenom} ${qui.nom} commande ${reg.nom}.`, { liens: [lienHomme(p.id), lienReg(reg)] }); }
    }
}
