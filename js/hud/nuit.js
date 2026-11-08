// Le papier de la nuit (Jérôme, v0.13.0) : un état (choix des corvées, puis le bilan de l'aube), jamais une boîte de
// dialogue : le champ reste là, on choisit des régiments (clic, cadre, T) et on leur donne une corvée, dite sur leur carte.
import { BATIMENTS } from '../data/batiments.js?v=0.128.1';
import { NOUS, aube, priseEnCours } from '../bataille.js?v=0.128.1';
import { METEO } from '../data/meteo.js?v=0.128.1';
import { CORVEES, CONTACT } from '../data/corvees.js?v=0.128.1';
import { EQUIPEMENT } from '../data/batiments.js?v=0.128.1';
import { campDe, niveauDe, renfortsDe } from '../camp.js?v=0.128.1';
import { refusCorvee, contactDe } from '../nuit.js?v=0.128.1';
import { palmares, tableau } from './medailles.js?v=0.128.1';
import { lireJournee } from '../donnees-jour.js?v=0.128.1';
import { tuilesDuSoir, liste } from './bilan.js?v=0.128.1';
import { tuilesDeLAube } from './aube.js?v=0.128.1';
import { pluriel, numeroDe } from './lecture.js?v=0.128.1';
import { lune, nomPhase, couvertureNuit, cielEnMots } from '../data/lune.js?v=0.128.1';

export const corveeDe = id => [...CORVEES, CONTACT].find(c => c.id === id)?.nom || '';
export const corveeCourte = id => [...CORVEES, CONTACT].find(c => c.id === id)?.court || '';
const nomJour = n => (n === 1 ? '1er' : `${n}e`);
const tron = n => `${n} tronçon${n > 1 ? 's' : ''}`;
// les tronçons gagnés et perdus dans la journée, et ce qu'ils ont coûté se lit juste au-dessus
function enLignes([pris, perdus]) {
  if (!pris && !perdus) return 'Les lignes n\'ont pas bougé.';
  return [pris && `pris ${tron(pris)}`, perdus && `perdu ${tron(perdus)}`].filter(Boolean).join(', ').replace(/^./, c => c.toUpperCase()) + '.';
}
// Le rapport du soir sur les avions (v0.59.0) : les sorties du jour, ceux qu'on a perdus, ce qui reste. Ni ce qu'ils ont touché (DESIGN.md : aucun compteur de ce qu'on a tué) ni les pv de chacun.
export function avionsEnMots(e, camp) {
  const [sorties, perdus] = e.avionsJour[e.jour - 1][camp], restent = e.avions[camp].filter(pv => pv > 0).length;
  const s = n => n > 1 ? 's' : '';
  const jour = sorties ? `${sorties} sortie${s(sorties)}${perdus ? `, ${perdus} avion${s(perdus)} abattu${s(perdus)}` : ', tous rentrés'}` : 'aucune sortie';
  return `Avions : ${jour}. ${restent ? `Il en reste ${restent}, réparés cette nuit.` : 'Plus un seul.'}`;
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
// « 2 sur 4 » : les régiments frais qui restent, sur tous ceux de la bataille (v0.116.0)
export const renfortsEnMots = (e, camp) => { const r = renfortsDe(e, camp); return `${r.restants} sur ${r.total}`; };
export function creerNuit({ $, bataille, choisis, choisir = () => {}, pauser, reprendre, sauvegarder, majHud, toast, dire, invalider, moi = () => NOUS, enReseau = () => false, surChoix = () => {}, surPret = () => {} }) {
  let etat = null;                 // 'choix' | 'aube' | null
  let corvees = {};                // la corvée de chacun de nos régiments cette nuit (id → corvée)
  let donnees = new Set();         // ceux à qui l'on a donné un ordre cette nuit (leur carte se grise ; les autres ont celle d'hier, ou le repos)
  const nosRegiments = B => B.etat.regiments.filter(r => r.camp === moi() && r.effectif);

  function montrer() {
    const B = bataille();
    pauser(); sauvegarder();
    const e = B.etat, j = e.jour, avant = e.nuits.at(-1)?.choix || {};
    $('nuit-titre').textContent = `Nuit du ${nomJour(j)} au ${nomJour(j + 1)} jour`;
    // le bilan en tuiles (colonne de gauche ; Jérôme, 8 nov. : le tableau de bord du labo) : à retenir, effectifs, morts du jour, lignes, ciel ; `lireJournee` ne lit que l'état
    const d = lireJournee(B, moi());
    const reserve = e.mission ? renfortsEnMots(e, moi()) : null;
    $('nuit-bilan').replaceChildren(...tuilesDuSoir(d, { reserve, avions: avionsEnMots(e, moi()) }));
    $('nuit-regiments').replaceChildren(liste(d));
    $('nuit-lignes').textContent = e.tranchees ? enLignes(e.prises[j - 1]) : '';
    // la victoire anticipée (v0.77.0) : où l'on en est, pour qui doit prendre leur première ligne
    if (e.tranchees && e.mission === 'prendre' && moi() === NOUS) {
      const { tenus: [t, tot], jours } = priseEnCours(bataille());
      $('nuit-lignes').textContent += jours ? ` Leur première ligne est tenue (${t} tronçons sur ${tot}) : encore un soir et la bataille est gagnée.` : ` Leur première ligne : ${t} tronçons sur ${tot} à nous ; il en faut 75 % pendant deux soirs de suite pour gagner avant le terme.`;
    }
    $('nuit-medailles-corps').replaceChildren(...tableau(palmares(B, moi(), 'jour')));
    $('nuit-demain').textContent = `Demain : ${METEO[e.previsions[j - 1]]?.prevision || '—'}.`;
    // le ciel de cette nuit (v0.40.0) : la phase de la lune et la couverture, les mêmes que celles que le dessin montre
    const mt = e.meteo[j - 1], L = lune(j, e.graine);
    $('nuit-ciel').textContent = `${nomPhase(L.p)}, ${cielEnMots(couvertureNuit(j, e.graine, mt))}.`;
    // la dernière corvée donnée, si elle est encore possible, sinon le repos
    const contact = contactDe(B);              // au contact de l'ennemi : il se bat toute la nuit, ce n'est pas un choix
    corvees = Object.fromEntries(nosRegiments(B).map(r => [r.id, contact.has(r.id) ? 'contact' : avant[r.id] && !refusCorvee(B, r, avant[r.id]) ? avant[r.id] : 'repos']));
    donnees = new Set();
    etat = 'choix';
    $('nuit-corps').hidden = false; $('aube-bilan').hidden = true; $('aube').textContent = 'À l\'aube';
    $('nuit').classList.remove('aube'); $('nuit').hidden = false;
    cleOrdres = ''; majOrdres();
    invalider();
    majHud();
  }
  // La colonne de droite (Jérôme, v0.100.0 : « ordres aux régiments ») : nos régiments, un clic les choisit (Maj : en ajouter), puis la corvée aux régiments choisis ; avant, les corvées
  // s'ouvraient au-dessus de la carte du dernier choisi. Refaite seulement quand elle change (un bouton refait sous le pointeur perdrait son clic).
  let cleOrdres = '';
  function majOrdres() {
    const B = bataille();
    if (etat !== 'choix' || !B) return;
    const regs = nosRegiments(B), ch = [...choisis()].filter(i => B.etat.regiments[i]?.camp === moi() && B.etat.regiments[i].effectif);
    const cle = [regs.map(r => `${r.id}:${corvees[r.id]}:${donnees.has(r.id) ? 1 : 0}`).join(','), ch.join(',')].join('|');
    if (cle === cleOrdres) return;
    cleOrdres = cle;
    const liste = document.createElement('div'); liste.className = 'nuit-regs';
    for (const r of regs) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.reg = r.id; b.className = `nuit-reg${ch.includes(r.id) ? ' choisi' : ''}${donnees.has(r.id) ? ' donne' : ''}`; b.setAttribute('aria-pressed', String(ch.includes(r.id)));
      b.append(Object.assign(document.createElement('b'), { textContent: numeroDe(B, r) }), Object.assign(document.createElement('span'), { className: 'nom', textContent: r.nom }), Object.assign(document.createElement('span'), { className: 'corvee', textContent: corveeCourte(corvees[r.id]) }));
      liste.append(b);
    }
    const tous = document.createElement('button'); tous.type = 'button'; tous.dataset.reg = 'tous'; tous.className = 'nuit-reg tous'; tous.textContent = 'Tous les régiments (T)';
    liste.append(tous);
    const bride = campDe(B.etat, moi())?.bride && niveauDe(B.etat, 'caserne', moi()) >= EQUIPEMENT.niveauCaserne;
    const actions = document.createElement('div'); actions.className = 'actions';
    for (const c of CORVEES.filter(c => !c.equipe || bride)) {
      const refus = ch.length && ch.every(i => refusCorvee(B, B.etat.regiments[i], c.id)) ? refusCorvee(B, B.etat.regiments[ch[0]], c.id) : '';
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.corvee = c.id; b.textContent = c.nom; b.className = `${ch.length && ch.every(i => corvees[i] === c.id) ? 'actif' : ''}${refus ? ' refus' : ''}`; b.setAttribute('aria-disabled', String(!!refus));
      b.title = refus || c.dit;
      actions.append(b);
    }
    $('nuit-ordres').replaceChildren(liste, actions);
    $('nuit-aide').hidden = ch.length > 0;
  }
  $('nuit-ordres').onclick = e => {
    const r = e.target.closest('button[data-reg]'), c = e.target.closest('button[data-corvee]');
    if (r) { r.blur(); return r.dataset.reg === 'tous' ? choisir('tous') : choisir(+r.dataset.reg, e.shiftKey); }
    if (c) { c.blur(); donner(c.dataset.corvee); }
  };
  // une corvée aux régiments choisis (ceux qui la refusent le disent à voix haute)
  function donner(id) {
    const B = bataille();
    const regs = [...choisis()].map(i => B.etat.regiments[i]).filter(r => r && r.camp === moi() && r.effectif);
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
    $('nuit-corps').hidden = true; $('nuit').classList.add('aube');
    // le bilan en tuiles (Jérôme, 8 nov.) : ce que la nuit a fait, puis les effectifs au matin (`lireJournee` : le jour neuf est déjà ouvert, ses chiffres sont ceux du matin)
    const regs = B.etat.regiments;
    $('aube-bilan').replaceChildren(...tuilesDeLAube({ b: r.bilan[moi()], refus: (r.bilan[moi()].refus || []).map(id => regs[id].nom), dotation: dotationDe(B, r.dotation, moi()), matin: lireJournee(B, moi()) }));
    $('aube-bilan').hidden = false; $('aube').textContent = 'Le jour se lève';
    invalider();
  }
  function fermer() { etat = null; $('nuit').hidden = true; invalider(); }
  $('aube').onclick = () => { if (etat === 'choix') passer(); else { fermer(); reprendre(); } };

  return {
    montrer, donner, fermer, apresAube, maj: majOrdres,
    get etat() { return etat; },
    get corvees() { return corvees; },
    get donnees() { return donnees; },
  };
}
