// La nuit (Jérôme, v0.13.0) : un état (la soirée, puis le bilan de l'aube), jamais une boîte de dialogue : le champ reste là, on choisit des régiments (clic, cadre, T)
// et on leur donne une corvée. Depuis la v0.150.0 le soir est la soirée en trois étapes (hud/soiree.js) ; le papier `#nuit` ne garde que le bilan de l'aube.
import { NOUS, aube } from '../bataille.js?v=0.150.1';
import { CORVEES, CONTACT } from '../data/corvees.js?v=0.150.1';
import { renfortsDe } from '../camp.js?v=0.150.1';
import { ARBRES } from '../data/ameliorations.js?v=0.150.1';
import { creerSoiree } from './soiree.js?v=0.150.1';
import { refusCorvee, contactDe } from '../nuit.js?v=0.150.1';
import { lireJournee } from '../donnees-jour.js?v=0.150.1';
import { tuilesDeLAube } from './aube.js?v=0.150.1';

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
// le camp au matin : les achats du soir confirmés (seulement dans la partie bridée ; la dotation est tombée le soir)
const dotationDe = (B, d0, camp = 0) => {
  const d = d0?.camps?.[camp] ?? d0, K = camp === 0 ? B.etat.camp : B.etat.campEux;
  if (!d || !K?.bride) return null;
  const fin = (d.achetes ?? []).map(([o, p, k]) => `${ARBRES[o].court} : ${ARBRES[o].pistes[p].rangs[k].nom.toLowerCase()}.`);
  return { fin, payes: fin.length, caisse: K.dotation };
};
export function creerNuit({ $, bataille, choisis, choisir = () => {}, pauser, reprendre, sauvegarder, majHud, toast, dire, invalider, moi = () => NOUS, enReseau = () => false, surChoix = () => {}, surPret = () => {}, voir = () => {}, auRetour = () => {}, rang = () => {}, transfert = () => {} }) {
  let etat = null;                 // 'choix' | 'aube' | null
  // la loupe (v0.132.0) : le papier se range, la vue va au régiment ou à l'homme ; la nuit reste arrêtée, « Revenir au papier » ou Échap le rouvre
  function regarder(lien) { if (etat !== 'choix') return; $('soiree').hidden = true; $('nuit-retour').hidden = false; voir(lien); }
  function revenir() { if ($('nuit-retour').hidden) return false; $('nuit-retour').hidden = true; auRetour(); if (etat === 'choix') { $('soiree').hidden = false; soiree.rendre(); } else if (etat) $('nuit').hidden = false; return true; }
  $('nuit-retour').onclick = () => { revenir(); majHud(); };
  let corvees = {};                // la corvée de chacun de nos régiments cette nuit (id → corvée)
  let donnees = new Set();         // ceux à qui l'on a donné un ordre cette nuit (leur carte se grise ; les autres ont celle d'hier, ou le repos)
  const nosRegiments = B => B.etat.regiments.filter(r => r.camp === moi() && r.effectif);

  // la soirée (troisième jet, v0.150.0) : la journée, le camp, les régiments ; elle remplace le papier de la nuit, qui ne garde que le bilan de l'aube
  const soiree = creerSoiree({ $, bataille, moi, choisis, choisir, corvees: () => corvees, donnees: () => donnees, donner: (id, ids) => donner(id, ids), regarder, rang, transfert,
    reserve: () => renfortsDe(bataille().etat, moi()), passer: () => passer() });
  function montrer() {
    const B = bataille();
    pauser(); sauvegarder();
    const avant = B.etat.nuits.at(-1)?.choix || {};
    // la dernière corvée donnée, si elle est encore possible, sinon le repos
    const contact = contactDe(B);              // au contact de l'ennemi : il se bat toute la nuit, ce n'est pas un choix
    corvees = Object.fromEntries(nosRegiments(B).map(r => [r.id, contact.has(r.id) ? 'contact' : avant[r.id] && !refusCorvee(B, r, avant[r.id]) ? avant[r.id] : 'repos']));
    donnees = new Set();
    etat = 'choix';
    $('nuit').hidden = true; $('nuit-retour').hidden = true;
    soiree.montrer(); cleOrdres = '';
    invalider();
    majHud();
  }
  // refaire l'étape des régiments quand le choix change sur le champ (jamais à chaque image : un paquet ou un bouton refait sous le pointeur perdrait son glissement ou son clic)
  let cleOrdres = '';
  function majOrdres() {
    const B = bataille();
    if (etat !== 'choix' || !B || soiree.etape !== 2) return;
    const cle = [...choisis()].join(',');
    if (cle === cleOrdres) return;
    cleOrdres = cle;
    soiree.rendre();
  }
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
      surPret(); const b = $('soiree-action'); if (b) { b.disabled = true; b.textContent = 'En attente de l\'autre commandant…'; }
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
    soiree.fermer(); $('nuit').hidden = false;
    // le bilan en tuiles (Jérôme, 8 nov.) : ce que la nuit a fait, puis les effectifs au matin (`lireJournee` : le jour neuf est déjà ouvert, ses chiffres sont ceux du matin)
    const regs = B.etat.regiments;
    $('aube-bilan').replaceChildren(...tuilesDeLAube({ b: r.bilan[moi()], refus: (r.bilan[moi()].refus || []).map(id => regs[id].nom), dotation: dotationDe(B, r.dotation, moi()), matin: lireJournee(B, moi()) }));
    $('aube-bilan').hidden = false; $('aube').textContent = 'Le jour se lève';
    invalider();
  }
  function fermer() { etat = null; $('nuit').hidden = true; soiree.fermer(); $('nuit-retour').hidden = true; invalider(); }
  $('aube').onclick = () => { if (etat === 'choix') passer(); else { fermer(); reprendre(); } };

  return {
    montrer, donner, fermer, apresAube, revenir, maj: majOrdres, majCamp: () => soiree.majCamp(), majRegiments: () => soiree.majRegiments(), soiree,
    get etat() { return etat; },
    get corvees() { return corvees; },
    get donnees() { return donnees; },
  };
}
