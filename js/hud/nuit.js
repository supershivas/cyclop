// Le papier de la nuit (Jérôme, v0.13.0) : un état (choix des corvées, puis le bilan de l'aube), jamais une boîte de
// dialogue : le champ reste là, on choisit des régiments (clic, cadre, T) et on leur donne une corvée, dite sur leur carte.
import { BATIMENTS } from '../data/batiments.js?v=0.97.0';
import { NOUS, aube, priseEnCours } from '../bataille.js?v=0.97.0';
import { METEO } from '../data/meteo.js?v=0.97.0';
import { CORVEES, CONTACT } from '../data/corvees.js?v=0.97.0';
import { refusCorvee, contactDe } from '../nuit.js?v=0.97.0';
import { palmares, tableau } from './medailles.js?v=0.97.0';
import { pluriel } from './lecture.js?v=0.97.0';
import { lune, nomPhase, couvertureNuit, cielEnMots } from '../data/lune.js?v=0.97.0';

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
// le bilan de la nuit en quelques lignes (rien de ce qui n'a pas eu lieu)
function bilanEnMots(B, b) {
  const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
  const faits = [
    b.equipes && `${pl(b.equipes, 'régiment équipé', 'régiments équipés')}`,
    b.regroupes && `${pl(b.regroupes, 'égaré regroupé', 'égarés regroupés')}`,
    b.evacues && `${pl(b.evacues, 'blessé évacué', 'blessés évacués')}`,
    b.retours && `${pl(b.retours, 'blessé guéri revenu', 'blessés guéris revenus')} au front`,
    b.prisNuit && `${pl(b.prisNuit, 'tronçon pris', 'tronçons pris')} dans la mêlée`,
    b.perdusNuit && `${pl(b.perdusNuit, 'tronçon perdu', 'tronçons perdus')} dans la mêlée`,
    b.releves && `${pl(b.releves, 'régiment relevé', 'régiments relevés')}`,
    b.ravitailles && `${pl(b.ravitailles, 'régiment ravitaillé', 'régiments ravitaillés')}`,
  ].filter(Boolean);
  const morts = [
    b.mortsMelee && `${b.mortsMelee} au corps à corps`,
    b.mortsCorvee && `${b.mortsCorvee} aux corvées`,
    b.mortsBlesses && `${b.mortsBlesses} de leurs blessures`,
  ].filter(Boolean);
  const regs = B.etat.regiments;
  return [
    faits.length ? `Cette nuit : ${faits.join(', ')}.` : b.mortsMelee ? 'Une nuit de combat.' : 'Une nuit de repos.',
    morts.length ? `Morts dans la nuit : ${morts.join(', ')}.` : 'Personne n\'est mort cette nuit.',
    b.affames && `${pl(b.affames, 'régiment n\'a', 'régiments n\'ont')} plus de vivres : la faim.`,
    ...(b.refus || []).map(id => `${regs[id].nom} refuse de monter aujourd'hui : il tiendra sa tranchée, rien de plus.`),
  ].filter(Boolean);
}

// `bataille()` : la bataille en cours ; `choisis()` : les régiments choisis ; `invalider()` : refaire la rangée des cartes ;
// `pauser()` / `reprendre()` : arrêter / relancer la boucle ; `dire(r)` : montrer un refus
// À deux sur le réseau (v0.30.0) : `moi()` est le camp qu'on joue, `enReseau()` dit si l'autre est un joueur ; ses choix et son « prêt » passent par `surChoix(régiment, corvée)` et `surPret()`
// (le lockstep les rend aux deux machines), et le bilan de l'aube vient de main.js (`apresAube`), quand les deux sont prêts.
// le camp au matin (v0.87.0) : les chantiers finis cette nuit et la dotation tombée (seulement dans la partie bridée)
const campEnMots = (B, d0, camp = 0) => {
  const d = d0?.camps?.[camp] ?? d0, K = camp === 0 ? B.etat.camp : B.etat.campEux;
  if (!d || !K?.bride) return [];
  const fin = d.finis.map(([cle, n]) => `${BATIMENTS[cle].nom} : niveau ${n}, ${BATIMENTS[cle].niveaux[n - 1].nom.toLowerCase()}.`);
  const parts = [`${d.aube} d'aube`, d.tenue ? `${d.tenue} pour des lignes tenues` : '', d.lignes ? `${d.lignes} pour une ligne d'en face prise` : ''].filter(Boolean);
  return [...fin, `Dotation de l'état-major : +${d.points} (${parts.join(', ')}) ; ${K.dotation} en caisse.`];
};
export function creerNuit({ $, bataille, choisis, pauser, reprendre, sauvegarder, majHud, toast, dire, invalider, moi = () => NOUS, enReseau = () => false, surChoix = () => {}, surPret = () => {} }) {
  let etat = null;                 // 'choix' | 'aube' | null
  let corvees = {};                // la corvée de chacun de nos régiments cette nuit (id → corvée)
  let donnees = new Set();         // ceux à qui l'on a donné un ordre cette nuit (leur carte se grise ; les autres ont celle d'hier, ou le repos)
  const nosRegiments = B => B.etat.regiments.filter(r => r.camp === moi() && r.effectif);

  function montrer() {
    const B = bataille();
    pauser(); sauvegarder();
    const e = B.etat, j = e.jour, [nous, eux] = e.pertesJour[j - 1], avant = e.nuits.at(-1)?.choix || {};
    $('nuit-titre').textContent = `Nuit du ${nomJour(j)} au ${nomJour(j + 1)} jour`;
    $('nuit-pertes').textContent = moi() === NOUS ? `Morts du jour : ${nous} des nôtres, ${eux} en face.` : `Morts du jour : ${eux} des nôtres, ${nous} en face.`;
    $('nuit-lignes').textContent = e.tranchees ? enLignes(e.prises[j - 1]) : '';
    // la victoire anticipée (v0.77.0) : où l'on en est, pour qui doit prendre leur première ligne
    if (e.tranchees && e.mission === 'prendre' && moi() === NOUS) {
      const { tenus: [t, tot], jours } = priseEnCours(bataille());
      $('nuit-lignes').textContent += jours ? ` Leur première ligne est tenue (${t} tronçons sur ${tot}) : encore un soir et la bataille est gagnée.` : ` Leur première ligne : ${t} tronçons sur ${tot} à nous ; il en faut 75 % pendant deux soirs de suite pour gagner avant le terme.`;
    }
    $('nuit-medailles-corps').replaceChildren(...tableau(palmares(B, moi(), 'jour')));
    $('nuit-avions').textContent = avionsEnMots(e, moi());
    $('nuit-demain').textContent = `Demain : ${METEO[e.previsions[j - 1]]?.prevision || '—'}.`;
    // le ciel de cette nuit (v0.40.0) : la phase de la lune et la couverture, les mêmes que celles que le dessin montre
    const mt = e.meteo[j - 1], L = lune(j, e.graine);
    $('nuit-ciel').textContent = `${nomPhase(L.p)}, ${cielEnMots(couvertureNuit(j, e.graine, mt))}.`;
    $('nuit-reserves').textContent = e.mission ? `En réserve : ${pluriel(e.reserves[moi()], 'régiment frais', 'régiments frais')}.` : '';
    // la dernière corvée donnée, si elle est encore possible, sinon le repos
    const contact = contactDe(B);              // au contact de l'ennemi : il se bat toute la nuit, ce n'est pas un choix
    corvees = Object.fromEntries(nosRegiments(B).map(r => [r.id, contact.has(r.id) ? 'contact' : avant[r.id] && !refusCorvee(B, r, avant[r.id]) ? avant[r.id] : 'repos']));
    donnees = new Set();
    etat = 'choix';
    $('nuit-corps').hidden = false; $('aube-bilan').hidden = true; $('aube').textContent = 'À l\'aube';
    $('nuit').hidden = false;
    invalider();
    majHud();
  }
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
    $('nuit-corps').hidden = true;
    $('aube-bilan').replaceChildren(...[...bilanEnMots(B, r.bilan[moi()]), ...campEnMots(B, r.dotation, moi())].map(t => Object.assign(document.createElement('p'), { textContent: t })));
    $('aube-bilan').hidden = false; $('aube').textContent = 'Le jour se lève';
    invalider();
  }
  function fermer() { etat = null; $('nuit').hidden = true; invalider(); }
  $('aube').onclick = () => { if (etat === 'choix') passer(); else { fermer(); reprendre(); } };

  return {
    montrer, donner, fermer, apresAube,
    get etat() { return etat; },
    get corvees() { return corvees; },
    get donnees() { return donnees; },
  };
}
