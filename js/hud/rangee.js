// La rangée de nos régiments et la fenêtre du régiment choisi (sorti de main.js, lot de dette du 24 nov.) : les vignettes, le défilement,
// le rabat au-dessus de la carte choisie. Les clics restent à main.js (ils changent la sélection). `creerRangee(ctx)` rend
// { maj, invalider, oublier, placerFenetre, defiler, avecClic }.
import { actionDe, moralEnMots, secteursDe } from '../bataille.js?v=0.170.7';
import { chevrons } from '../identite.js?v=0.170.7';
import { STANCES, STANCE_DEFAUT } from '../data/stances.js?v=0.170.7';
import { ecussonHtml, reglerEcusson } from './ecussons.js?v=0.170.7';
import { iconeCorvee } from './icones-nuit.js?v=0.170.7';
import { corveeDe, corveeCourte } from './nuit.js?v=0.170.7';
import { deplacable } from './deplacer.js?v=0.170.7';
import * as lecture from './lecture.js?v=0.170.7';

let $, R, bataille, moi, choisi, marche, formeOrdre, nuit, chevronsVus, reduit, rejouerRebond, decalageFenetre;
export function creerRangee(ctx) {
  ({ $, R, bataille, moi, choisis: choisi, modeMarche: marche, forme: formeOrdre, nuit, chevronsVus, reduit, rejouerRebond } = ctx);
  decalageFenetre = deplacable($('reg-ouvert'), { surDeplace: () => placerFenetre() });
  return {
    maj, placerFenetre,
    invalider: () => { regimentsVus = ''; },
    oublier: () => { regimentsVus = ''; fenetreVue = -1; },
    defiler: d => { regDebut = Math.max(0, regDebut + d); regimentsVus = ''; maj(); },
    avecClic: (id, f) => { clicCarte = id; f(); clicCarte = -1; },
  };
}
// La nuit, un régiment à qui l'on a donné un ordre (la carte se grise ; Jérôme, v0.38.3) : les autres ont encore celui d'hier, ou le repos
const donneeCetteNuit = r => nuit.etat === 'choix' && nuit.donnees.has(r.id);
const ordreEnMots = r => nuit.etat === 'choix' && nuit.corvees[r.id] ? `cette nuit : ${corveeDe(nuit.corvees[r.id]).toLowerCase()}` : actionDe(bataille(), r);

// Nos régiments (Jérôme, v0.20.0 ; docs/ui-cible.md) : une rangée de cartes compactes (numéro et nom, chevrons d'expérience, la barre
// debout / blessés / tombés : plein, hachuré, vide) ; la carte choisie s'ouvre vers le haut (l'ordre en mots, les actions) sans pousser
// les autres. Plusieurs régiments choisis : s'ouvre celui qu'on a choisi en dernier. Trop étroit : des flèches font défiler la rangée.
let regimentsVus = '', regDebut = 0, regActifVu = -1, clicCarte = -1, fenetreVue = -1;
const CARTE_L = 60, CARTE_ECART = 8, CARTE_MIN = 56;      // v0.141.0 : des vignettes (avant : 112, 88)      // (v0.65.0 : les cartes s'étirent de CARTE_MIN à 120 px ; si tous les régiments tiennent sur une ligne, pas de flèches)
function maj() {
  const B = bataille(), MOI = moi(), choisis = choisi(), modeMarche = marche(), forme = formeOrdre();
  const e = B.etat, A = B.armee, regs = e.regiments.filter(r => r.camp === MOI && r.effectif);
  const bl = new Int32Array(e.regiments.length), ex = new Float32Array(e.regiments.length), vivants = new Int32Array(e.regiments.length);
  for (let i = 0; i < A.n; i++) if (A.camp[i] === MOI) { const g = A.reg[i]; vivants[g]++; ex[g] += A.exp[i]; if (A.blessure[i]) bl[g]++; }
  const largeur = $('regiments').clientWidth, tient = largeur >= regs.length * CARTE_MIN + (regs.length - 1) * CARTE_ECART;
  const place = Math.max(0, largeur - 2 * 40), visibles = tient ? regs.length : place ? Math.max(1, Math.min(regs.length, Math.floor((place + CARTE_ECART) / (CARTE_L + CARTE_ECART)))) : regs.length;
  const actif = [...choisis].reverse().map(id => e.regiments[id]).find(r => r && r.camp === MOI && r.effectif) || null;
  const ia = actif ? regs.indexOf(actif) : -1;
  if (ia >= 0 && ia !== regActifVu && (ia < regDebut || ia >= regDebut + visibles)) regDebut = Math.min(Math.max(0, regs.length - visibles), Math.max(0, ia - Math.floor(visibles / 2)));
  regActifVu = ia;
  regDebut = Math.max(0, Math.min(regDebut, regs.length - visibles));
  const cle = regs.map(r => `${r.id}:${r.effectif}:${r.pertes}:${bl[r.id]}:${lecture.statutOrdre(B, r)}:${chevrons(ex[r.id] / Math.max(1, vivants[r.id]))}.${Math.round(ex[r.id] / Math.max(1, vivants[r.id]) * 20)}:${r.deroute ? 1 : 0}:${r.stance}:${moralEnMots(r, R)}:${choisis.has(r.id) ? 1 : 0}:${nuit.etat === 'choix' ? nuit.corvees[r.id] : ''}:${donneeCetteNuit(r) ? 1 : 0}`).join('|')
    + `#${regDebut}/${visibles}#${actif ? `${actif.id}:${ordreEnMots(actif)}:${choisis.size}:${modeMarche}:${forme}:${e.phase}` : ''}`;
  if (cle === regimentsVus) return;
  regimentsVus = cle;
  const pc = (n, r) => `${(n / r.initial * 100).toFixed(1)}%`;
  const cartes = regs.slice(regDebut, regDebut + visibles).map(r => {
    const bles = bl[r.id], debout = Math.max(0, r.effectif - bles), moy = ex[r.id] / Math.max(1, vivants[r.id]), nb = chevrons(moy), humeur = moralEnMots(r, R);
    const gagne = nb > (chevronsVus.get(r.id) ?? nb) && !matchMedia('(prefers-reduced-motion: reduce)').matches;       // un chevron de plus depuis la dernière fois (lot E) : il saute
    chevronsVus.set(r.id, nb);
    const b = document.createElement('button');
    const niv = lecture.niveauMoral(r, R);
    b.className = `reg-carte${choisis.has(r.id) ? ' choisi' : ''}${niv !== 'tient' ? ` ${niv === 'deroute' ? 'deroute' : 'ebranle'}` : ''}${donneeCetteNuit(r) ? ' donne' : ''}${r.id === clicCarte ? ' clic' : ''}`; b.dataset.id = r.id;
    b.setAttribute('aria-pressed', String(choisis.has(r.id)));
    b.setAttribute('aria-label', `${lecture.numeroDe(B, r)} · ${r.nom} : ${debout} debout, ${bles} blessés, ${r.pertes} tombés, ${'chevron '.repeat(nb).trim() || 'aucun chevron'}${humeur.startsWith('tient') ? '' : `, ${humeur}`}${r.stance !== STANCE_DEFAUT ? `, ${STANCES[r.stance].court}` : ''}${donneeCetteNuit(r) ? `, ordre donné : ${corveeDe(nuit.corvees[r.id]).toLowerCase()}` : ''}`);
    // v0.141.0 (Jérôme : « des cartes plus parlantes et plus légères ») : la carte est une vignette, l'écusson du régiment (sa bannière, son numéro, sa barre, ses chevrons, son moral) ;
    // dessous, sa posture ou, la nuit, l'icône de sa corvée ; le « ! » reste hors du flux ; le nom, le statut et les chiffres sont dans l'infobulle et dans la fenêtre du régiment choisi
    const statut = niv === 'deroute' ? 'En déroute' : niv === 'ebranle' ? 'Ébranlé' : nuit.etat === 'choix' ? corveeCourte(nuit.corvees[r.id]) : lecture.statutOrdre(B, r);
    const bas = nuit.etat === 'choix' && nuit.corvees[r.id] ? `<span class="corvee" aria-hidden="true">${iconeCorvee(nuit.corvees[r.id])}</span>` : r.stance !== STANCE_DEFAUT ? `<span class="posture">${STANCES[r.stance].court}</span>` : '<span></span>';
    b.classList.add('vignette'); if (gagne) b.classList.add('gagne');
    b.innerHTML = `${ecussonHtml('reg', 'nous')}${niv === 'tient' ? '' : `<i class="alerte" aria-hidden="true">${niv === 'deroute' ? '!!' : '!'}</i>`}${bas}`;
    reglerEcusson(b, { debout: debout / r.initial, blesses: bles / r.initial, num: lecture.numeroDe(B, r), chev: nb, moral: niv === 'deroute' || niv === 'ebranle' ? niv : 'tient', choisi: false });
    b.dataset.info = `# ${lecture.numeroDe(B, r)} · ${r.nom}\n## ${statut}\nDebout | **${debout}**\nBlessés | **${bles}**\nTombés | ${r.pertes}\nExpérience | ${nb ? '▲'.repeat(nb) : 'aucun chevron'} (${Math.round(moy * 100)} %)${r.stance !== STANCE_DEFAUT ? `\nPosture | ${STANCES[r.stance].court}` : ''}`;
    return b;
  });
  $('reg-rang').replaceChildren(...cartes);
  $('reg-prec').hidden = regDebut <= 0; $('reg-suiv').hidden = regDebut + visibles >= regs.length;
  const pan = $('reg-ouvert');
  if (!actif || ia < regDebut || ia >= regDebut + visibles) { pan.hidden = true; fenetreVue = -1; return; }
  const bles = bl[actif.id], debout = Math.max(0, actif.effectif - bles), humeur = moralEnMots(actif, R), tampon = humeur.startsWith('tient') ? '' : humeur, jour = e.phase === 'jour' && !nuit.etat;
  pan.dataset.id = actif.id;
  pan.innerHTML = `<div class="tete"><b>${lecture.numeroDe(B, actif)} · ${actif.nom}</b><span>${secteursDe(B, actif)}</span><button type="button" class="aide" data-act="fiche" aria-label="Fiche du régiment" data-info="# Fiche du régiment&#10;Les hommes, le moral, les vivres, l'équipement.">?</button></div>
    <div class="compte">${debout} debout · ${bles} blessés · ${actif.pertes} tombés</div>
    <div class="ordre">${ordreEnMots(actif)}</div>${tampon ? `<span class="tampon">${tampon}</span>` : ''}
    ${choisis.size > 1 ? `<p class="discret">+ ${choisis.size - 1} autre${choisis.size > 2 ? 's' : ''} choisi${choisis.size > 2 ? 's' : ''}</p>` : ''}`;
  pan.hidden = false;
  rejouerRebond();
  // le rabat se relève quand on change de régiment (v0.34.6)
  if (fenetreVue !== actif.id && !reduit()) pan.animate([{ transform: 'perspective(500px) rotateX(88deg)', opacity: .4 }, { transform: 'perspective(500px) rotateX(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)' });
  if (fenetreVue !== actif.id) { decalageFenetre.x = 0; decalageFenetre.y = 0; }         // (une autre fenêtre revient à sa place, sur sa carte)
  fenetreVue = actif.id;
  placerFenetre();
}
// La fenêtre d'un régiment et la fiche d'un homme se déplacent à la main (Jérôme, v0.108.0) ; celle du régiment suit sa carte, plus le décalage, qu'un autre régiment remet à zéro
function placerFenetre() {
  const B = bataille();
  const pan = $('reg-ouvert');
  if (pan.hidden || !B) return;
  const carte = [...$('reg-rang').children].find(c => +c.dataset.id === +pan.dataset.id);
  if (!carte) { pan.hidden = true; return; }
  const r = carte.getBoundingClientRect(), w = pan.offsetWidth, h = pan.offsetHeight;
  pan.style.translate = `${Math.round(Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8))) + decalageFenetre.x}px ${Math.round(r.top - h - 8) + decalageFenetre.y}px`;
}
