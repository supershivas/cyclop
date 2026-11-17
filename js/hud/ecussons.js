// L'écusson d'une unité (Jérôme, v0.141.0 : « j'aime que chaque écusson ait sa propre forme » ; le choix arme par arme : `data/ecussons.js`). Un même signe pour tout ce qu'on commande,
// au-dessus de l'unité sur le champ (régiments, chars, postes, avions, génie) et dans la rangée du bas : la forme dit l'arme, la couleur dit le camp, la barre au-dessus dit les hommes
// (ou la coque, la cellule) : plein debout, hachuré blessés, vide tombés ; un liseré orange qui marche : ébranlé ; rouge haché : en déroute ; un halo d'os : choisi ; détruit : vidé et barré.
// Du SVG (le texte et les clics passent par le DOM : l'infobulle du jeu, `data-info`). Le dessin seulement : les valeurs viennent de main.js et des hud/*.
// Les couleurs : `--coeur` (le camp, posé par la classe `nous` ou `eux`), `--jeu-fond` (la terre : le trait et le dessin), `--jeu-encre` (l'os : le halo, les ailes).
import { ECUSSONS } from '../data/ecussons.js?v=0.148.0';

// les formes : un tracé de −15 à 15 (la pointe ou le bas à 14)
const FORMES = {
  banniere: 'M-12-14H12V14L0 7L-12 14Z',
  carre: 'M-10-13H10L13-10V10L10 13H-10L-13 10V-10Z',
  triangle: 'M0-16L15 12H-15Z',
  rondAile: 'M-12 0A12 12 0 1 0 12 0A12 12 0 1 0-12 0Z',
  ecuRond: 'M-13-14H13V1A13 13 0 0 1-13 1Z',
};
// ce qui se dessine derrière la forme : les ailes de la cocarde
const aile = s => `<path class="ec-aile" d="M${8 * s} -12L${22 * s} -15L${21 * s} -10L${18 * s} -9L${17 * s} -5L${13 * s} -4L${8 * s} 2Z"/><path class="ec-plume" d="M${10 * s} -9L${19 * s} -12M${10 * s} -5L${16 * s} -7"/>`;
const DERRIERE = { rondAile: aile(-1) + aile(1) };
// les dessins, centrés en (0, 0), de −10 à 10 ; `numero` est un texte, rempli à part
const DESSINS = {
  numero: '<text class="ec-num" x="0" y="0.5">0</text>',
  chenille: '<rect class="ec-trait" x="-10" y="-5" width="20" height="10" rx="5" stroke-width="2.6"/><path class="ec-trait" stroke-width="1.2" d="M-6-6.5v3M-3-6.5v3M0-6.5v3M3-6.5v3M6-6.5v3M-6 3.5v3M-3 3.5v3M0 3.5v3M3 3.5v3M6 3.5v3"/><circle cx="-5" r="1.8"/><circle r="1.8"/><circle cx="5" r="1.8"/>',
  trepied: '<path d="M-10-5h15v2.6h-15zM-3-7h7v6h-7zM4-6h3v4h-3z"/><path class="ec-trait" stroke-width="1.8" d="M0-1L-7 9M0-1V9M0-1L7 9"/>',
  hirondelle: '<path d="M0-2L-5-7L-11-6L-4 0L-2 2L-3 9L0 5L3 9L2 2L4 0L11-6L5-7Z"/>',
  // les deux outils se croisent en leur milieu (Jérôme, v0.141.0) : chacun est centré sur l'origine avant d'être tourné d'un huitième de tour
  pellePioche: '<g transform="rotate(45)"><path d="M-1-5.5h2V8.5h-2zM-3 8.5h6v1.8h-3zM-4-5.5H4V-9.5L0-12.5L-4-9.5Z"/></g>'
    + '<g transform="rotate(-45)"><path d="M-1-8.5h2v19h-2z"/><path d="M-9.5-6.5Q0-12.5 9.5-6.5L8.6-5Q0-10-8.6-5Z"/></g>',
};

/* Le HTML d'un écusson : `type` ('reg', 'char', 'nid', 'avion', 'genie'), `camp` ('nous' ou 'eux'), `barre` (false : sans la barre). La barre, les chevrons, le numéro, l'état se règlent
   ensuite par `regler` ; la taille vient du CSS (`.ecusson`, 26 px de large). */
export function ecussonHtml(type, camp = 'nous', { barre = true } = {}) {
  const E = ECUSSONS[type] ?? ECUSSONS.reg, [x, y, s] = E.ajust, d = FORMES[E.forme];
  return `<span class="ecusson ${type} ${camp}">${barre ? '<span class="ec-barre"><i class="debout"></i><i class="blesses"></i></span><span class="ec-chev"></span>' : ''}`
    + `<svg viewBox="-23 -17 46 32" aria-hidden="true">${DERRIERE[E.forme] ?? ''}<path class="ec-halo" d="${d}"/><path class="ec-forme" d="${d}"/><path class="ec-moral" d="${d}"/>`
    + `<g class="ec-dessin" transform="translate(${x} ${y}) scale(${s})">${DESSINS[E.dessin]}</g><path class="ec-croix" d="M-6-6L6 6M6-6L-6 6"/></svg></span>`;
}

/* Règle un écusson déjà posé (`racine` : l'élément `.ecusson` ou un parent) : debout et blessés (0 à 1), le numéro, le nombre de chevrons, l'état ('tient', 'ebranle', 'deroute'),
   choisi, détruit, vide (la bande à sec : la barre en pointillé). Ne touche au DOM que ce qui change. */
export function reglerEcusson(racine, { debout = 1, blesses = 0, num, chev, moral = 'tient', choisi = false, detruit = false, vide = false } = {}) {
  const e = racine.classList.contains('ecusson') ? racine : racine.querySelector('.ecusson');
  if (!e) return;
  const cle = `${debout.toFixed(3)}|${blesses.toFixed(3)}|${num}|${chev}|${moral}|${choisi}|${detruit}|${vide}`;
  if (e.dataset.cle === cle) return;
  e.dataset.cle = cle;
  const b = e.querySelector('.ec-barre');
  if (b) { b.firstChild.style.width = `${(Math.max(0, Math.min(1, debout)) * 100).toFixed(1)}%`; b.lastChild.style.width = `${(Math.max(0, Math.min(1, blesses)) * 100).toFixed(1)}%`; }
  const c = e.querySelector('.ec-chev'); if (c && chev !== undefined) c.textContent = '▲'.repeat(chev);
  const n = e.querySelector('.ec-num'); if (n && num !== undefined) n.textContent = String(num);
  e.classList.toggle('ebranle', moral === 'ebranle'); e.classList.toggle('deroute', moral === 'deroute');
  e.classList.toggle('choisi', !!choisi); e.classList.toggle('detruit', !!detruit); e.classList.toggle('vide', !!vide);
}
