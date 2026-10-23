// Les jauges et le corps de la fiche (Jérôme, v0.35.0) : une barre par chose qu'un homme endure (la peur, les jambes, les bras,
// l'expérience), des repères aux seuils des mots de `identite.js` (la forme dit le niveau, pas seulement la longueur), et le corps
// entier avec la blessure. Des fonctions de DOM qui ne lisent que ce qu'on leur donne ; fiche.js et main.js s'en servent.
import { PARTIES } from '../identite.js?v=0.62.0';

export const CHEVRON = '<svg class="chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 7l5-5 5 5"/></svg>';
export const chevronsHtml = n => CHEVRON.repeat(n);

// les seuils des mots (identite.js) : la peur (inquiet, a peur, terrifié), la fatigue (lourd, épuisé), l'expérience (baptême, a vu le feu, aguerri)
export const REPERES = { peur: [0.25, 0.55, 0.85], fatigue: [0.4, 0.75], exp: [0.08, 0.25, 0.6], moral: [0.3, 0.6] };

const pct = v => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(0)}%`;
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* Une jauge : { nom, val (0 à 1), reperes, mot, html (à la place du mot) } → le HTML d'une rangée. `inverse` : la barre est pleine quand tout va
   bien (le moral, les vivres) ; sinon pleine quand ça va mal (la peur, la fatigue). Sans couleur d'alerte : un plein plus long, des repères. */
export function jauge({ nom, val, reperes = [], mot = '', html = '', titre = '' }) {
  return `<div class="jauge" title="${esc(titre || `${nom} : ${pct(val)}`)}"><span class="j-nom">${esc(nom)}</span>`
    + `<span class="j-piste" role="meter" aria-label="${esc(nom)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(val * 100)}"><i style="width:${pct(val)}"></i>${reperes.map(r => `<b style="left:${pct(r)}"></b>`).join('')}</span>`
    + `<span class="j-mot">${html || esc(mot)}</span></div>`;
}

// Le corps entier (viewBox 40 × 92) : la tête, le tronc, deux bras, deux jambes ; la partie blessée est pleine et barrée. Le côté
// (gauche ou droit) vient du numéro de l'homme, une fois pour toutes. `blessure` : 0 aucune, 1 bras, 2 jambe, 3 tête.
export function corps(blessure, id, { tombe = false } = {}) {
  const cote = (id >> 1) & 1;                  // 0 : le bras ou la jambe gauche (à droite sur le dessin, il nous fait face)
  const parties = {
    tete: '<circle cx="20" cy="9" r="7"/>',
    tronc: '<rect x="12" y="18" width="16" height="30" rx="2"/>',
    bras0: '<rect x="4" y="19" width="6" height="28" rx="2"/>', bras1: '<rect x="30" y="19" width="6" height="28" rx="2"/>',
    jambe0: '<rect x="12" y="50" width="7" height="38" rx="2"/>', jambe1: '<rect x="21" y="50" width="7" height="38" rx="2"/>',
  };
  const touche = blessure === 3 ? 'tete' : blessure === 1 ? `bras${cote}` : blessure === 2 ? `jambe${cote}` : '';
  const croix = { tete: [13, 2, 27, 16], [`bras${cote}`]: [cote ? 30 : 4, 24, cote ? 36 : 10, 42], [`jambe${cote}`]: [cote ? 21 : 12, 56, cote ? 28 : 19, 82] }[touche];
  const nom = blessure ? `blessé ${blessure === 3 ? 'à la tête' : `${blessure === 1 ? 'au bras' : 'à la jambe'} ${cote ? 'droit' : 'gauche'}`}` : 'indemne';
  return `<svg class="corps${tombe ? ' tombe' : ''}" viewBox="0 0 40 92" role="img" aria-label="${tombe ? 'tombé' : nom}">`
    + Object.entries(parties).map(([k, f]) => f.replace('/>', ` class="${k === touche ? 'touche' : ''}"/>`)).join('')
    + (croix ? `<path class="croix" d="M${croix[0]} ${croix[1]}L${croix[2]} ${croix[3]}M${croix[2]} ${croix[1]}L${croix[0]} ${croix[3]}"/>` : '')
    + '</svg>';
}
export { PARTIES };
