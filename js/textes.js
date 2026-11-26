// Les textes affichés, par langue (ROADMAP.md, lot 0) : `t('cle', { nom })` rend le texte de la langue choisie, ou le français s'il y
// manque, ou la clé elle-même (un texte oublié se voit à l'écran). Une langue est un fichier de data/textes/ ; seul le français existe.
import { TEXTES as FR } from './data/textes/fr.js?v=0.170.2';

const LANGUES = { fr: FR };
export const LANGUE_DEFAUT = 'fr';
let langue = LANGUE_DEFAUT;

export const langues = () => Object.keys(LANGUES);
// la langue du navigateur si le jeu la parle (« en-GB » → « en »), sinon le français
export const langueDe = (navigateur = '') => { const l = String(navigateur).slice(0, 2).toLowerCase(); return LANGUES[l] ? l : LANGUE_DEFAUT; };
export function choisirLangue(l) { langue = LANGUES[l] ? l : LANGUE_DEFAUT; return langue; }
export const langueChoisie = () => langue;
export function t(cle, vars) {
  const s = LANGUES[langue][cle] ?? FR[cle] ?? cle;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
