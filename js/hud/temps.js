// La barre du temps (Jérôme, v0.31.2 ; variante D du sujet « La barre du temps » du labo) : une frise de la bataille entière, sous les boutons de
// vitesse et de la même largeur qu'eux. Dessus, la météo de chaque jour (la couleur de son temps ; demain hachuré : c'est une prévision) ; dessous,
// la nuit : chaque jour est un jour (clair) puis sa nuit (sombre), les jours d'avant un ton plus bas ; un trait bleu dit où l'on est, et un drapeau
// qui le suit dit le jour et l'heure ; tout en bas, les seuls changements de météo, en pictogrammes. Le joueur ne connaît pas la météo des jours à
// venir (la logique la tire d'avance) : seuls les jours passés et le jour même sont lus dans l'état, demain est la prévision (juste 7 fois sur 10).
// Le dessin seulement : rien n'est sauvegardé.
import { PALETTE } from '../palette.js?v=0.38.0';
import { METEO } from '../data/meteo.js?v=0.38.0';
import { ICONES_METEO } from './meteo-icones.js?v=0.38.0';
import { horloge } from '../bataille.js?v=0.38.0';

const FOND = { sec: PALETTE.h, pluie: PALETTE.e, brouillard: PALETTE.r, gel: PALETTE.o };
const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids); return e; };

// `$` : l'accès par id ; `bataille()` : la bataille en cours
export function creerBarreTemps({ $, bataille }) {
  let jours = 0, cases = [], icones = [], vue = '';
  const racine = () => $('frise');

  function construire(n) {
    jours = n; vue = '';
    const f = racine();
    const drapeau = el('div', 'frise-drapeau'), meteo = el('div', 'frise-meteo'), nuit = el('div', 'frise-nuit'), chg = el('div', 'frise-chg');
    cases = []; icones = [];
    for (let k = 0; k < n; k++) {
      const c = el('i'); meteo.append(c);
      nuit.append(el('i'));
      const g = el('span', 'frise-icone'); g.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"></svg>';
      chg.append(g); icones.push(g);
      cases.push(c);
    }
    f.replaceChildren(drapeau, meteo, nuit, el('i', 'frise-repere'), chg);
    f.style.setProperty('--jours', n);
  }

  return function majBarreTemps(B) {
    const h = horloge(B), e = B.etat;
    if (h.jours !== jours) construire(h.jours);
    const nuit = e.phase === 'nuit' || e.phase === 'fin';
    // où l'on est : de 0 à 1 le long des jours (12 h de jour, de 6 h à 18 h, puis 12 h de nuit)
    const heure = nuit ? 24 : h.heure + h.minute / 60 - 6;
    const ici = (h.jour - 1 + Math.min(heure, 24) / 24) / h.jours;
    const mot = `J${h.jour}/${h.jours} · ${nuit ? 'nuit' : `${h.heure} h ${String(h.minute).padStart(2, '0')}`} · ${METEO[h.meteo].nom}`;
    const cle = `${h.jour}|${h.meteo}|${h.prevision}|${mot}|${nuit}`;
    const f = racine();
    f.style.setProperty('--ici', ici);
    if (cle === vue) { placerDrapeau(f); return; }
    vue = cle;
    f.querySelector('.frise-drapeau').textContent = mot;
    f.setAttribute('aria-label', `${mot}. ${h.prevision ? `Demain : ${METEO[h.prevision].prevision}.` : 'Dernier jour.'}`);
    let avant = null;
    for (let k = 0; k < h.jours; k++) {
      const sur = k < h.jour, prevu = k === h.jour && !!h.prevision;
      const m = sur ? e.meteo[k] : prevu ? h.prevision : null;
      const c = cases[k];
      c.style.background = m ? FOND[m] : '';
      c.className = prevu ? 'prevu' : '';
      f.querySelector('.frise-nuit').children[k].className = k < h.jour - 1 ? 'passe' : '';
      const g = icones[k], change = m && m !== avant;
      g.hidden = !change;
      if (change) { g.firstChild.innerHTML = ICONES_METEO[m]; g.classList.toggle('prevu', prevu); g.title = prevu ? `Demain : ${METEO[m].prevision}` : METEO[m].nom; }
      avant = m || avant;
    }
    placerDrapeau(f);
  };

  // le drapeau suit le trait, sans sortir de la barre
  function placerDrapeau(f) {
    const d = f.querySelector('.frise-drapeau'), L = f.clientWidth, w = d.offsetWidth;
    if (!L) return;
    const x = parseFloat(f.style.getPropertyValue('--ici')) * L;
    d.style.left = `${Math.round(Math.max(0, Math.min(x - w / 2, L - w)))}px`;
  }
}
