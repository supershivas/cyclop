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
  // la fin de partie (refonte du papier de la nuit et de la fin, Jérôme, 15 nov.)
  roc: '<path d="M2 14l3-7 3 2 2-5 4 10z"/>',                                                    // le rocher : le plus éprouvé, jamais en déroute
  inebranlable: '<path d="M8 1.5l5 2v4c0 3.5-2.2 5.8-5 7-2.8-1.2-5-3.5-5-7v-4z"/>',               // l'écu : le moral le plus haut
  fuyard: '<path d="M3 8h9M9 4.5L12.5 8 9 11.5M3 4v8"/>',                                       // la flèche du repli
  patrie: '<path d="M8 1.5v8M5 4.5h6"/><path d="M2.5 14c2-2.5 9-2.5 11 0"/>',                 // la croix sur son tertre : le soldat tombé
  survivant: '<path d="M8 1.5v13M3 6.5h10"/><circle cx="8" cy="6.5" r="2.5"/>',                  // la croix cerclée : le plus de jours au front
  char: '<path d="M1.5 11h13l-1.5 3h-10zM3.5 11V7.5h7V11M10.5 8.5h4"/>',                        // le char et son canon
  poste: '<path d="M2 12h12M5 12l3-5 3 5M8 7V4.5h5"/>',                                          // la mitrailleuse sur son affût
  genie: '<path d="M2 12h12M3.5 12V8h9v4M2 8l6-4 6 4"/>',                                       // le pont refait
};
// un moment de la bataille (la frise de la fin de partie) et le ciel du soir (le papier de la nuit)
const MOMENTS = {
  dissous: '<path d="M4 2v12M4 2.5h8l-2 3 2 3H4M2.5 13.5l11-11"/>',                               // le fanion barré : un régiment dissous
  pris: '<path d="M4 15V2M4 2.5h8l-2 3 2 3H4"/>',                                               // le fanion planté
  perdu: '<path d="M4 15V8M4 8l7-5M7.5 9.5l5 2.5"/>',                                           // le fanion brisé
  deroute: '<path d="M2 8h8M7 4.5L10.5 8 7 11.5M12 3v10"/>',                                    // le repli
  assaut: CORVEES.contact,                                                                      // les baïonnettes croisées
  char: '<path d="M1.5 11h13l-1.5 3h-10zM3.5 11V7.5h7V11M10.5 8.5h4"/>',
  avion: '<path d="M8 1.5v13M2 7h12M5.5 13.5h5"/>',                                             // l'avion vu d'en dessous
  pont: '<path d="M1.5 6h4.5l1 3M9 9l1-3h4.5M3 6v6M13 6v6"/>',                                  // le pont coupé
  poste: '<path d="M2 12h12M5 12l3-5 3 5M8 7V4.5h5"/>',
  pire: '<path d="M8 2v12M4.5 5.5h7"/><path d="M3 14h10"/>',                                    // la croix sur sa butte : la journée la plus meurtrière
  pluie: '<path d="M4 8a3 3 0 0 1 5.5-2 2.5 2.5 0 0 1 3 3.5H4z"/><path d="M5 11.5l-1 2M8 11.5l-1 2M11 11.5l-1 2"/>',
  sec: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  couvert: '<path d="M3 11a3 3 0 0 1 1.5-5.6A3.5 3.5 0 0 1 11 5a3 3 0 0 1 2 6z"/>',
  brouillard: '<path d="M2 5h12M3 8h10M2 11h12"/>',
  neige: '<path d="M8 2v12M3 5l10 6M13 5L3 11"/>',
  gel: '<path d="M8 2v12M3 5l10 6M13 5L3 11"/>',
};
MOMENTS.beau = MOMENTS.sec; MOMENTS.canicule = MOMENTS.sec; MOMENTS.tempete = MOMENTS.pluie;
export const iconeMoment = cle => svg(MOMENTS[cle] ?? '<circle cx="8" cy="8" r="2"/>');
/* La lune de la nuit : `p` (0 nouvelle, 0,5 pleine), sa part claire pleine, le reste en contour */
export function iconeLune(p) {
  const e = (1 - Math.cos(2 * Math.PI * p)) / 2, croissant = p < 0.5, rx = Math.abs(1 - 2 * e) * 5.5, tourne = e > 0.5 ? 1 : 0;
  const clair = e < 0.02 ? '' : `<path fill="currentColor" stroke="none" transform="${croissant ? '' : 'translate(16 0) scale(-1 1)'}" d="M8 2.5a5.5 5.5 0 0 1 0 11a${Math.max(0.01, rx).toFixed(2)} 5.5 0 0 ${tourne} 0 -11z"/>`;
  return svg(`<circle cx="8" cy="8" r="5.5"/>${clair}`);
}
export const iconeMedaille = cle => svg(MEDAILLES[cle] ?? '<circle cx="8" cy="8" r="2"/>');

export const LOUPE = svg('<circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4.5 4.5"/>');
/* La loupe : un bouton carré de 44 px qui ne porte que l'icône (son nom en aria-label, lu par l'infobulle) */
export function boutonLoupe(nom, surClic) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'loupe'; b.innerHTML = LOUPE; b.setAttribute('aria-label', nom); b.dataset.info = nom;
  b.onclick = e => { e.stopPropagation(); b.blur(); surClic(); };
  return b;
}
