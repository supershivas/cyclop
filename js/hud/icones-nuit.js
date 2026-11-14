// Les pictogrammes du papier de la nuit (Jérôme, v0.132.0 : « ajouter une icône pour chaque ordre », les médailles « avec des icônes », « une petite icône loupe ») :
// des SVG de 16 × 16 tracés en `currentColor` (aucune couleur écrite : le bouton ou le papier la donne), et le bouton loupe.

const svg = corps => `<svg class="pic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${corps}</svg>`;

// une corvée de la nuit (son id dans data/corvees.js)
const CORVEES = {
  repos: '<path d="M11 2.5a5.5 5.5 0 1 0 2.5 9.5A4.5 4.5 0 0 1 11 2.5z"/>',                                      // la lune
  evacuer: '<path d="M2 6h12M2 10h12M4 6v4M12 6v4"/><path d="M8 2.5v2M7 3.5h2"/>',                               // le brancard et sa croix
  ravitailler: '<path d="M2.5 7h11l-1.5 6h-8z"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/>',                                // la gamelle
  releve: '<path d="M2 5h10l-2.5-2.5M14 11H4l2.5 2.5"/>',                                                          // deux flèches qui se croisent
  contact: '<path d="M3 3l10 10M13 3L3 13M2 5.5L5.5 2M10.5 14L14 10.5"/>',                                         // deux baïonnettes croisées
  'eq-casque': '<path d="M2 11h12M3.5 11a4.5 4.5 0 0 1 9 0M8 4V2.5"/>',                                           // le casque Adrian et sa crête
  'eq-grenades': '<circle cx="7" cy="10" r="4"/><path d="M7 6V4h3M10 4l2-1.5"/>',                                   // la grenade et sa cuiller
  'eq-hotchkiss': '<path d="M1.5 8h10M11.5 6.5h3v3h-3M4 8l-1.5 5M8 8l1.5 5"/>',                                     // le canon sur son trépied
  'eq-brancards': '<path d="M1.5 9h13M3 9v3M13 9v3M4 9V7h8v2"/>',                                                   // le brancard porté
};
export const iconeCorvee = id => svg(CORVEES[id] ?? '<circle cx="8" cy="8" r="2"/>');

// une médaille (la `cle` de palmares, hud/medailles.js)
const MEDAILLES = {
  meurtrier: '<circle cx="8" cy="8" r="5"/><path d="M8 1v4M8 11v4M1 8h4M11 8h4"/>',          // la mire
  conquerant: '<path d="M4 15V2M4 2.5h8l-2 3 2 3H4"/>',                                         // le fanion planté
  sacrifie: '<path d="M8 2v12M4.5 5.5h7"/>',                                                    // la croix de bois
  inutile: '<circle cx="8" cy="8" r="5" stroke-dasharray="2 2"/>',                              // un cercle vide
  aguerri: '<path d="M3 7l5-3.5L13 7M3 11.5l5-3.5 5 3.5"/>',                                    // deux chevrons
};
export const iconeMedaille = cle => svg(MEDAILLES[cle] ?? '<circle cx="8" cy="8" r="2"/>');

export const LOUPE = svg('<circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4.5 4.5"/>');
/* La loupe : un bouton carré de 44 px qui ne porte que l'icône (son nom en aria-label, lu par l'infobulle) */
export function boutonLoupe(nom, surClic) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'loupe'; b.innerHTML = LOUPE; b.setAttribute('aria-label', nom); b.dataset.info = nom;
  b.onclick = e => { e.stopPropagation(); b.blur(); surClic(); };
  return b;
}
