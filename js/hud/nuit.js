// Le papier de la nuit (Jérôme, v0.13.0) : un état (choix des corvées, puis le bilan de l'aube), jamais une boîte de
// dialogue : le champ reste là, on choisit des régiments (clic, cadre, T) et on leur donne une corvée, dite sur leur carte.
import { BATIMENTS } from '../data/batiments.js?v=0.143.4';
import { NOUS, aube, priseEnCours } from '../bataille.js?v=0.143.4';
import { METEO } from '../data/meteo.js?v=0.143.4';
import { CORVEES, CONTACT } from '../data/corvees.js?v=0.143.4';
import { EQUIPEMENT } from '../data/batiments.js?v=0.143.4';
import { campDe, niveauDe, renfortsDe } from '../camp.js?v=0.143.4';
import { refusCorvee, contactDe } from '../nuit.js?v=0.143.4';
import { palmares } from './medailles.js?v=0.143.4';
import { lireJournee } from '../donnees-jour.js?v=0.143.4';
import { reinitIds } from './bilan.js?v=0.143.4';
import { el, ordres, tuilesJour, reste, medailles, puceReleve } from './papier-nuit.js?v=0.143.4';
import { tuilesDeLAube } from './aube.js?v=0.143.4';
import { numeroDe } from './lecture.js?v=0.143.4';
import { lune, nomPhase, couvertureNuit, cielEnMots } from '../data/lune.js?v=0.143.4';

export const corveeDe = id => [...CORVEES, CONTACT].find(c => c.id === id)?.nom || '';
export const corveeCourte = id => [...CORVEES, CONTACT].find(c => c.id === id)?.court || '';
const nomJour = n => (n === 1 ? '1er' : `${n}e`);
const tron = n => `${n} tronçon${n > 1 ? 's' : ''}`;
// les tronçons gagnés et perdus dans la journée, et ce qu'ils ont coûté se lit juste au-dessus
function enLignes([pris, perdus]) {
  if (!pris && !perdus) return 'Les lignes n\'ont pas bougé.';
  return [pris && `pris ${tron(pris)}`, perdus && `perdu ${tron(perdus)}`].filter(Boolean).join(', ').replace(/^./, c => c.toUpperCase()) + '.';
}
// `bataille()` : la bataille en cours ; `choisis()` : les régiments choisis ; `invalider()` : refaire la rangée des cartes ;
// `pauser()` / `reprendre()` : arrêter / relancer la boucle ; `dire(r)` : montrer un refus
// À deux sur le réseau (v0.30.0) : `moi()` est le camp qu'on joue, `enReseau()` dit si l'autre est un joueur ; ses choix et son « prêt » passent par `surChoix(régiment, corvée)` et `surPret()`
// (le lockstep les rend aux deux machines), et le bilan de l'aube vient de main.js (`apresAube`), quand les deux sont prêts.
// le camp au matin (v0.87.0) : les chantiers finis cette nuit et la dotation tombée (seulement dans la partie bridée)
const dotationDe = (B, d0, camp = 0) => {
  const d = d0?.camps?.[camp] ?? d0, K = camp === 0 ? B.etat.camp : B.etat.campEux;
  if (!d || !K?.bride) return null;
  const fin = d.finis.map(([cle, n]) => `${BATIMENTS[cle].nom} : niveau ${n}, ${BATIMENTS[cle].niveaux[n - 1].nom.toLowerCase()}.`);
  const parts = [`${d.aube} d'aube`, d.tenue ? `${d.tenue} pour des lignes tenues` : '', d.lignes ? `${d.lignes} pour une ligne d'en face prise` : ''].filter(Boolean);
  return { fin, points: d.points, parts: parts.join(', ').replace(/^./, c => c.toUpperCase()), caisse: K.dotation };
};
export function creerNuit({ $, bataille, choisis, choisir = () => {}, pauser, reprendre, sauvegarder, majHud, toast, dire, invalider, moi = () => NOUS, enReseau = () => false, surChoix = () => {}, surPret = () => {}, voir = () => {} }) {
  let etat = null;                 // 'choix' | 'aube' | null
  let journee = null;              // les chiffres du soir (`lireJournee`), lus une fois à l'ouverture du papier
  // la loupe (v0.132.0) : le papier se range, la vue va au régiment ou à l'homme ; la nuit reste arrêtée, « Revenir au papier » ou Échap le rouvre
  function regarder(lien) { if (etat !== 'choix') return; $('nuit').hidden = true; $('nuit-retour').hidden = false; voir(lien); }
  function revenir() { if ($('nuit-retour').hidden) return false; $('nuit-retour').hidden = true; if (etat) $('nuit').hidden = false; return true; }
  $('nuit-retour').onclick = () => { revenir(); majHud(); };
  let corvees = {};                // la corvée de chacun de nos régiments cette nuit (id → corvée)
  let donnees = new Set();         // ceux à qui l'on a donné un ordre cette nuit (leur carte se grise ; les autres ont celle d'hier, ou le repos)
  const nosRegiments = B => B.etat.regiments.filter(r => r.camp === moi() && r.effectif);

  let soir = null;                 // ce que le papier du soir montre et qui ne change pas pendant les choix : la journée en tuiles, le ciel, les médailles
  function montrer() {
    const B = bataille();
    pauser(); sauvegarder();
    const e = B.etat, j = e.jour, avant = e.nuits.at(-1)?.choix || {};
    $('nuit-titre').textContent = `Nuit du ${nomJour(j)} au ${nomJour(j + 1)} jour`;
    // le papier (Jérôme, 15 nov., v0.134.0 ; labo « Le papier de la nuit », variante A) : `lireJournee` ne lit que l'état
    const d = lireJournee(B, moi());
    journee = d;
    const reserve = e.mission ? renfortsDe(e, moi()) : null;
    $('nuit-releve').replaceChildren(...(reserve?.total ? [puceReleve(reserve)] : []));
    // la victoire anticipée (v0.77.0) : où l'on en est, pour qui doit prendre leur première ligne
    let prise = null;
    if (e.tranchees && e.mission === 'prendre' && moi() === NOUS) {
      const { tenus: [t, tot], jours } = priseEnCours(B);
      prise = { court: `Leur 1re ligne : ${t} sur ${tot}${jours ? ', encore un soir' : ''}`, long: jours ? `Leur première ligne est tenue (${t} tronçons sur ${tot}) : encore un soir et la bataille est gagnée.` : `Leur première ligne : ${t} tronçons sur ${tot} à nous ; il en faut 75 % pendant deux soirs de suite pour gagner avant le terme.` };
    }
    // le ciel de cette nuit (v0.40.0) : la phase de la lune et la couverture, les mêmes que celles que le dessin montre ; le temps de demain
    const mt = e.meteo[j - 1], L = lune(j, e.graine), demain = e.previsions[j - 1];
    const N = { d, lignes: e.tranchees ? enLignes(e.prises[j - 1]) : '', prise, avions: d.camps[0].avions,
      ciel: { p: L.p, phase: nomPhase(L.p), couv: cielEnMots(couvertureNuit(j, e.graine, mt)), demain, prevision: METEO[demain]?.prevision || 'on ne sait pas' } };
    const T = tuilesJour(N, { faits: 3 });
    soir = { fts: T.fts };
    $('nuit-jour').replaceChildren(el('h3', '', 'La journée'), el('div', 'pn-tuiles', T.morts, T.eff), T.lig, el('div', 'pn-reste', reste(N)),
      el('h4', 'pn-sous', 'Médailles du jour'), el('div', 'pn-meds-l', medailles(palmares(B, moi(), 'jour'), { plat: true, voir: regarder })));
    // la dernière corvée donnée, si elle est encore possible, sinon le repos
    const contact = contactDe(B);              // au contact de l'ennemi : il se bat toute la nuit, ce n'est pas un choix
    corvees = Object.fromEntries(nosRegiments(B).map(r => [r.id, contact.has(r.id) ? 'contact' : avant[r.id] && !refusCorvee(B, r, avant[r.id]) ? avant[r.id] : 'repos']));
    donnees = new Set();
    etat = 'choix';
    for (const id of ['nuit-ordres', 'nuit-jour', 'nuit-pied']) $(id).hidden = false;
    $('aube-bilan').hidden = true; $('aube').textContent = 'À l\'aube';
    $('nuit').classList.remove('aube'); $('nuit').hidden = false; $('nuit-retour').hidden = true;
    cleOrdres = ''; majOrdres();
    invalider();
    majHud();
  }
  // Les ordres (Jérôme, v0.132.0 : une rangée par régiment ; 15 nov., v0.134.0 : sur une ligne, ses corvées en icônes, le nom au survol) : la loupe, le nom (un clic le choisit, Maj : en ajouter),
  // son état (barre debout et blessés, moral, vivres, morts du jour), ses corvées ; une corvée va au régiment de sa rangée, et à tous les choisis s'il en est ; la rangée « Tous » la donne à tous.
  // Refaite seulement quand elle change (un bouton refait sous le pointeur perdrait son clic).
  let cleOrdres = '';
  function majOrdres() {
    const B = bataille();
    if (etat !== 'choix' || !B) return;
    const regs = nosRegiments(B), ch = [...choisis()].filter(i => B.etat.regiments[i]?.camp === moi() && B.etat.regiments[i].effectif);
    const cle = [B.etat.jour, regs.map(r => `${r.id}:${corvees[r.id]}:${donnees.has(r.id) ? 1 : 0}`).join(','), ch.join(',')].join('|');
    if (cle === cleOrdres) return;
    cleOrdres = cle;
    reinitIds(600);       // les motifs hachurés des barres repartent d'un point fixe (l'empreinte du HUD), loin de ceux de la journée
    const bride = campDe(B.etat, moi())?.bride && niveauDe(B.etat, 'caserne', moi()) >= EQUIPEMENT.niveauCaserne;
    const sortes = CORVEES.filter(c => !c.equipe || bride);
    const parId = new Map((journee?.camps[0].regiments ?? []).map(x => [x.id, x]));
    const lignes = regs.filter(r => parId.has(r.id)).map(r => ({ ...parId.get(r.id), numero: numeroDe(B, r), nom: r.nom, corvee: corvees[r.id], donne: donnees.has(r.id), choisi: ch.includes(r.id),
      refus: Object.fromEntries(sortes.map(c => [c.id, refusCorvee(B, r, c.id) || ''])) }));
    $('nuit-ordres').replaceChildren(ordres({ sortes, regs: lignes, d: journee }, { voir: regarder }), ...(soir?.fts ? [soir.fts] : []));
  }
  $('nuit-ordres').onclick = e => {
    const r = e.target.closest('button[data-reg]'), c = e.target.closest('button[data-corvee]');
    if (r) { r.blur(); return r.dataset.reg === 'tous' ? choisir('tous') : choisir(+r.dataset.reg, e.shiftKey); }
    if (c) {
      c.blur();
      const B = bataille(), pour = c.dataset.pour, ch = [...choisis()];
      const ids = pour === 'tous' ? nosRegiments(B).map(x => x.id) : ch.includes(+pour) ? ch : [+pour];
      donner(c.dataset.corvee, ids);
    }
  };
  // une corvée à des régiments (par défaut les choisis ; ceux qui la refusent le disent à voix haute)
  function donner(id, ids = [...choisis()]) {
    const B = bataille();
    const regs = ids.map(i => B.etat.regiments[i]).filter(r => r && r.camp === moi() && r.effectif);
    if (!regs.length) return toast('Choisissez d\'abord un régiment (clic, cadre, T pour tous).');
    const refus = [];
    for (const r of regs) { const m = refusCorvee(B, r, id); if (m) refus.push(`${r.nom} : ${m}`); else { corvees[r.id] = id; donnees.add(r.id); surChoix(r.id, id); } }
    if (refus.length) toast(refus[0]);
    invalider(); majHud();
  }
  function passer() {
    const B = bataille();
    if (B?.etat.phase !== 'nuit') return;
    if (enReseau()) {                       // à deux : on se déclare prêt, l'aube vient quand les deux le sont (main.js)
      surPret(); $('aube').disabled = true; $('aube').textContent = 'En attente de l\'autre commandant…';
      return;
    }
    const r = aube(B, corvees);
    if (!r.ok) return dire(r);
    apresAube(B, r);
  }
  // le bilan de l'aube (chez soi, ou chez les deux quand le lockstep l'a joué)
  function apresAube(B, r) {
    sauvegarder(); majHud();
    $('aube').disabled = false;
    etat = 'aube';
    $('nuit-titre').textContent = `L'aube du ${nomJour(B.etat.jour)} jour`;
    for (const id of ['nuit-ordres', 'nuit-jour', 'nuit-pied']) $(id).hidden = true;
    $('nuit').classList.add('aube');
    // le bilan en tuiles (Jérôme, 8 nov.) : ce que la nuit a fait, puis les effectifs au matin (`lireJournee` : le jour neuf est déjà ouvert, ses chiffres sont ceux du matin)
    const regs = B.etat.regiments;
    $('aube-bilan').replaceChildren(...tuilesDeLAube({ b: r.bilan[moi()], refus: (r.bilan[moi()].refus || []).map(id => regs[id].nom), dotation: dotationDe(B, r.dotation, moi()), matin: lireJournee(B, moi()) }));
    $('aube-bilan').hidden = false; $('aube').textContent = 'Le jour se lève';
    invalider();
  }
  function fermer() { etat = null; $('nuit').hidden = true; $('nuit-retour').hidden = true; invalider(); }
  $('aube').onclick = () => { if (etat === 'choix') passer(); else { fermer(); reprendre(); } };

  return {
    montrer, donner, fermer, apresAube, revenir, maj: majOrdres,
    get etat() { return etat; },
    get corvees() { return corvees; },
    get donnees() { return donnees; },
  };
}
