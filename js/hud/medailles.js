// Les médailles (Jérôme, v0.73.1 : « un tableau des médailles à la fin de chaque journée, de chaque partie : le régiment le plus meurtrier, qui a pris le plus de secteurs, le plus inutile… idem pour les soldats »).
// Lecture seule de l'état : `tues` et `pris` de chaque régiment (bataille.js : un coup de fusil ou de baïonnette qui tue, un tronçon pris), `debut` (leur valeur au matin) ;
// pour un homme, `victimes` (déjà sur la fiche) et `etat.victDebut` (id → victimes au matin). Les morts ne figurent pas parmi les hommes (leur fiche s'est effacée avec eux).
import { quiEst, nomDe, auFront } from './lecture.js?v=0.146.2';
import { CHARS } from '../data/chars.js?v=0.146.2';
import { nomTroncon } from '../bataille.js?v=0.146.2';

const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
const meilleur = (liste, f) => liste.reduce((m, x) => (f(x) > (m ? f(m) : -Infinity) ? x : m), null);

/* Les médailles de `camp` : portee 'jour' (depuis le matin) ou 'total'. Rend { regiments: [{ titre, cle, nom, detail, reg }], soldats: [{ …, soldat }], engins: [...] (la bataille entière seulement) } ;
   le dessin : `medailles` et `tableMed` de papier-nuit.js (v0.134.0 : des puces le soir, un tableau à la fin) */
export function palmares(B, camp, portee = 'jour') {
  const { etat, armee: A } = B, jour = portee === 'jour';
  const regs = etat.regiments.filter(r => r.camp === camp).map(r => ({
    r, tues: (r.tues || 0) - (jour ? r.debut?.tues || 0 : 0), pris: (r.pris || 0) - (jour ? r.debut?.pris || 0 : 0), pertes: r.pertes - (jour ? r.debut?.pertes || 0 : 0),
  }));
  const regiments = [];
  const donne = (titre, x, detail, cle) => { if (x) regiments.push({ titre, cle, nom: nomDe(x.r), detail, reg: x.r.id }); return x; };
  const meur = meilleur(regs, x => x.tues), conq = meilleur(regs, x => x.pris), sacr = meilleur(regs, x => x.pertes);
  donne('Le plus meurtrier', meur?.tues > 0 && meur, `${pl(meur?.tues, 'homme abattu', 'hommes abattus')}`, 'meurtrier');
  donne('Le conquérant', conq?.pris > 0 && conq, `${pl(conq?.pris, 'tronçon pris', 'tronçons pris')}`, 'conquerant');
  donne('Le plus sacrifié', sacr?.pertes > 0 && sacr, `${pl(sacr?.pertes, 'mort', 'morts')}`, 'sacrifie');
  // le plus inutile : ni abattu ni pris grand-chose ; à égalité, celui qui a le plus d'hommes (il en fallait moins)
  if (regs.length >= 3) {
    const bas = Math.min(...regs.map(x => x.tues + 5 * x.pris)), inutile = regs.filter(x => x.tues + 5 * x.pris === bas && x !== meur && x !== conq).sort((a, b) => b.r.initial - a.r.initial)[0];
    donne('Le plus inutile', inutile, inutile && (inutile.tues + inutile.pris ? `${pl(inutile.tues, 'homme abattu', 'hommes abattus')}, ${pl(inutile.pris, 'tronçon', 'tronçons')}` : 'rien abattu, rien pris'), 'inutile');
  }
  // les hommes encore debout
  const debut = etat.victDebut || {}, vivants = [];
  for (let i = 0; i < A.n; i++) if (A.camp[i] === camp && !A.mort[i]) vivants.push({ i, id: A.id[i], v: A.victimes[i] - (jour ? debut[A.id[i]] || 0 : 0) });
  const soldats = [];
  const homme = (titre, x, detail, cle) => {
    if (!x) return;
    const { reg, qui } = quiEst(B, x.id);
    soldats.push({ titre, cle, nom: `${qui.prenom} ${qui.nom}`, detail: `${qui.grade}${reg?.nom ? `, ${reg.nom}` : ''} · ${detail}`, soldat: x.id });
  };
  const tireur = meilleur(vivants, x => x.v);
  homme('Le plus meurtrier', tireur?.v > 0 && tireur, pl(tireur?.v, 'homme abattu', 'hommes abattus'), 'meurtrier');
  const ancien = meilleur(vivants, x => A.exp[x.i]);
  if (ancien && A.exp[ancien.i] > 0.08 && ancien !== tireur) homme('Le plus aguerri', ancien, 'a tout vu du feu', 'aguerri');
  const bleus = vivants.filter(x => x.v === 0 && x !== ancien);
  const inutile = meilleur(bleus, x => (etat.jour - auFront(B, x.id)) * 1000 - A.adresse[x.i]);   // le plus ancien au front, le plus mauvais tireur
  if (inutile && vivants.length >= 3) homme('Le plus inutile', inutile, `rien abattu${etat.jour > 1 ? ` en ${pl(etat.jour, 'jour', 'jours')} de front` : ''}`, 'inutile');
  // la bataille entière (Jérôme, 15 nov., v0.134.0 : « un tableau de médailles encore plus fourni ») : le roc, l'inébranlable, le fuyard ; le survivant ; le char, le poste, le génie
  const engins = [];
  if (!jour) {
    const sansDeroute = regs.filter(x => !x.r.deroutes && x.pertes > 0 && x !== sacr), roc = meilleur(sansDeroute, x => x.pertes);
    donne('Le roc', roc, `${pl(roc?.pertes, 'mort', 'morts')}, jamais en déroute`, 'roc');
    // le moral moyen de ses soirs (l'historique, `etat.histo`, et ce soir)
    const H = etat.histo || [], moyen = x => { const v = [...H.map(h => h.regs[x.r.id]?.[3]).filter(m => m != null).map(m => m / 100), x.r.moral]; return v.reduce((a, b) => a + b, 0) / v.length; };
    const ineb = H.length ? meilleur(regs.filter(x => x.r.effectif), moyen) : null;
    donne('L\'inébranlable', ineb, `moral moyen ${Math.round(moyen(ineb ?? regs[0]) * 100)} %`, 'inebranlable');
    const fuy = meilleur(regs, x => x.r.deroutes || 0);
    donne('Le fuyard', fuy?.r.deroutes > 0 && fuy, pl(fuy?.r.deroutes, 'déroute', 'déroutes'), 'fuyard');
    const surv = meilleur(vivants.filter(x => x !== tireur && x !== ancien), x => (etat.jour - auFront(B, x.id)) * 1000 + A.exp[x.i]);      // (à égalité de jours : le plus éprouvé, qui n'est ni le tireur ni l'aguerri)
    if (surv && etat.jour > 1) homme('Le survivant', surv, `${pl(etat.jour - auFront(B, surv.id) + 1, 'jour', 'jours')} au front`, 'survivant');
    // les engins : le char (au champ ou rentré au parc) et le poste qui ont le plus tué, le génie
    const chars = new Map();
    for (const c of [...(etat.chars || []), ...(etat.parcChars?.[camp] || [])]) if ((c.camp ?? camp) === camp && (c.tues ?? 0) > (chars.get(c.id)?.tues ?? -1)) chars.set(c.id, { ...c, modele: c.modele ?? chars.get(c.id)?.modele });
    const ch = meilleur([...chars.values()], c => c.tues ?? 0);
    if (ch?.tues > 0) engins.push({ titre: 'Le char le plus meurtrier', cle: 'char', nom: `${CHARS[ch.modele]?.nom ?? 'Char'} n° ${ch.id + 1}`, detail: pl(ch.tues, 'homme abattu', 'hommes abattus') });
    const nid = meilleur((etat.nids || []).filter(n => n.camp === camp), n => n.tues ?? 0);
    if (nid?.tues > 0) engins.push({ titre: 'Le poste le plus meurtrier', cle: 'poste', nom: `Poste, ${nomTroncon(B, nid.troncon)}`, detail: pl(nid.tues, 'homme abattu', 'hommes abattus') });
    const genie = (etat.moments || []).reduce((s, m) => s + (m.genie?.[camp] ?? 0), 0);
    if (genie) engins.push({ titre: 'Le génie', cle: 'genie', nom: 'Les sapeurs', detail: pl(genie, 'ouvrage refait ou engin réparé', 'ouvrages refaits ou engins réparés') });
  }
  return { regiments, soldats, engins };
}
