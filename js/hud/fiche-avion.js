// La fiche de l'avion choisi, en vol (sorti de main.js, lot de dette du 24 nov.) : sa cellule, son altitude, sa passe. `creerFicheAvion(ctx)`
// rend `maj(avionChoisi)`, qui dit si l'avion choisi est toujours en vol (sinon main.js l'oublie).
import { MITRAILLAGE } from '../data/mitraillage.js?v=0.170.7';
import { positionDe, balayage } from '../avions.js?v=0.170.7';
import { cle as cleF, bloc as blocF, phrase as phraseF, poserEcusson, poserTampon } from './fiche-cadre.js?v=0.170.7';
import { jauge as jaugeTuile } from './tuiles.js?v=0.170.7';

let $, bataille, moi, suivi, avionVu = '';
export function creerFicheAvion(ctx) {
  ({ $, bataille, moi, suivi } = ctx);
  return majAvionFiche;
}
// la fiche de l'avion choisi (v0.121.0) : sa cellule, son état ; elle se ferme quand l'avion rentre ou tombe
function majAvionFiche(avionChoisi) {
  const B = bataille(), MOI = moi(), leSuivi = suivi();
  const f = $('avion-fiche'), v = avionChoisi === null ? null : (B.etat.mitraillages ?? []).find(k => k.id === avionChoisi && k.camp === MOI && k.etat === 'vol');
  f.hidden = !v;
  if (!v) return avionChoisi === null;
  const vie = Math.max(0, Math.round(v.pv / MITRAILLAGE.pv * 100)), p = positionDe(v, B.etat.temps), tire = balayage(v, B.etat.temps).actif;
  const passe = balayage(v, B.etat.temps), fait = Math.max(0, Math.min(1, (passe.l ?? 0) / Math.max(1, v.L)));
  $('avion-fiche-titre').textContent = 'Avion de mitraillage';
  $('avion-fiche-qui').textContent = `Aérodrome · ${tire ? 'au-dessus de leurs lignes' : 'sur sa passe'}`;
  poserTampon($('avion-fiche-etat-court'), tire ? 'Mitraille' : 'En vol');
  poserEcusson($('avion-fiche-ec'), 'avion', { debout: vie / 100 });
  $('avion-fiche-ordre').textContent = tire ? 'Ses balles tombent sur la bande tracée.' : 'Il suit sa passe tracée, puis rentre à l\'aérodrome.';
  // la charpente des fiches (v0.153.0) : quatre chiffres, la passe en trait (le fait plein, le reste en tirets) ; refaite quand un chiffre change
  const sigA = `${v.id}:${vie}:${Math.round(p.h)}:${Math.round(fait * 20)}`;
  if (sigA !== avionVu) {
    avionVu = sigA;
    $('avion-fiche-cles').replaceChildren(cleF(vie, '%', 'cellule', jaugeTuile(vie / 100, { reperes: [0.25, 0.5], larg: 100, haut: 8 })), cleF(Math.round(p.h), 'm', 'd\'altitude'),
      cleF(Math.round(fait * 100), '%', 'de la passe faite', jaugeTuile(fait, { larg: 100, haut: 8 })), cleF(MITRAILLAGE.vitesse, 'm/s', 'de vitesse'));
    const x = 10 + fait * 240;
    $('avion-fiche-passe').innerHTML = `<svg class="fx-passe" viewBox="0 0 260 40" role="img" aria-label="La passe : ${Math.round(fait * 100)} %"><path class="fx-passe-t" d="M10 20H250"/><path class="fx-passe-f" d="M10 20H${x.toFixed(0)}"/><path class="fx-passe-a" d="M${x.toFixed(0)} 20l-8 -5v10z"/></svg>`;
    const sol = (B.etat.avions?.[MOI] ?? []).length;
    $('avion-fiche-tuiles').replaceChildren(blocF('L\'aérodrome', [phraseF(`${sol} ${sol > 1 ? 'avions' : 'avion'} encore au sol`)]));
  }
  const sv = leSuivi.actif && leSuivi.actif.genre === 'avion' && leSuivi.actif.id === v.id ? leSuivi.actif.mode : null;
  $('avion-fiche-vue').setAttribute('aria-pressed', sv === 'cinema'); $('avion-fiche-personne').setAttribute('aria-pressed', sv === 'personne');
  return true;
}
