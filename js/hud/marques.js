// Les marques sur la fiche (Jérôme, v0.37.0) : une rangée d'icônes sous le nom, des mentions de livret à l'encre sur le papier. La forme du cadre porte la
// famille (rond, arche, carré, écusson, losange, stèle, octogone : lisible en niveaux de gris) ; le texte vient au survol ET au focus (tabindex,
// aria-label : le survol seul irait contre les conventions, §7). Aucun emplacement vide, aucun « 12/31 » : seules les marques gagnées.
// Des fonctions de HTML qui ne lisent que ce qu'on leur donne (la liste de `marquesDe`) ; fiche.js s'en sert.
import { FAMILLES } from '../data/marques.js?v=0.37.2';
import { ICONES, SIGLES } from '../data/marques-icones.js?v=0.37.2';

const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// les cadres (viewBox 15 × 15) : chacun une silhouette, au trait
export const CADRES = {
  rond: '<circle cx="7.5" cy="7.5" r="6.5"/>',
  arche: '<path d="M1 14V7.5a6.5 6.5 0 0 1 13 0V14z"/>',
  carre: '<rect x="1" y="1" width="13" height="13"/>',
  chevron: '<path d="M1 1h13v8.5L7.5 14 1 9.5z"/>',
  losange: '<path d="M7.5 .5L14.5 7.5 7.5 14.5 .5 7.5z"/>',
  stele: '<path d="M2.5 14V4L7.5 .5 12.5 4v10z"/>',
  octogone: '<path d="M4.5 .5h6L14.5 4.5v6L10.5 14.5h-6L.5 10.5v-6z"/>',
};

// un pictogramme 9 × 9 : un carré par lettre (`t` l'encre, `s` un ton plus clair)
function pixels(matrice) {
  let out = '';
  matrice.forEach((ligne, y) => [...ligne].forEach((c, x) => { if (c !== '.') out += `<rect x="${x + 3}" y="${y + 3}" width="1" height="1"${c === 's' ? ' class="s"' : ''}/>`; }));
  return out;
}

/* Une marque : { id, nom, dit, famille } → l'élément de liste. `style` : 'pictos' (le dessin), 'sigles' (deux lettres : la variante du labo).
   `nb` : combien d'hommes la portent (la fenêtre du régiment : un petit nombre à côté de l'icône) ; `focus` : au clavier (la fiche), sinon seulement lue. */
export function marqueHtml(m, style = 'pictos', { nb = 0, focus = true } = {}) {
  const f = FAMILLES[m.famille];
  const dedans = style === 'sigles'
    ? `<text x="7.5" y="9.6" text-anchor="middle">${esc(SIGLES[m.id] ?? '')}</text>`
    : pixels(ICONES[m.id] ?? []);
  const hommes = nb ? ` (${nb} homme${nb > 1 ? 's' : ''})` : '', texte = `${m.nom} — ${m.dit}${hommes}`;
  return `<li class="marque cadre-${f.cadre}${nb ? ' compte' : ''}"${focus ? ' tabindex="0"' : ''} data-marque="${esc(m.id)}" aria-label="${esc(texte)}" data-nom="${esc(m.nom)}" data-dit="${esc(m.dit + hommes)}">`
    + `<svg viewBox="0 0 15 15" aria-hidden="true" focusable="false"><g class="cadre">${CADRES[f.cadre]}</g><g class="dessin">${dedans}</g></svg>${nb ? `<b class="nb" aria-hidden="true">${nb}</b>` : ''}</li>`;
}

/* La rangée : au plus `visibles` icônes (les plus récentes d'abord, c'est l'ordre de `marquesDe`), puis « +N » ; vide s'il n'y en a aucune. */
export function rangeeHtml(liste, visibles, style = 'pictos') {
  if (!liste.length) return '';
  const montrees = liste.slice(0, visibles), reste = liste.length - montrees.length;
  const noms = liste.slice(visibles).map(m => m.nom).join(', ');
  return montrees.map(m => marqueHtml(m, style)).join('')
    + (reste ? `<li class="marque-reste" tabindex="0" aria-label="${esc(`${reste} autre${reste > 1 ? 's' : ''} : ${noms}`)}" data-nom="${esc(`+${reste}`)}" data-dit="${esc(noms)}">+${reste}</li>` : '');
}

/* Les marques d'un régiment (v0.37.2) : celles que portent ses hommes, dans l'ordre du catalogue, chacune avec son nombre ; rien n'est classé. */
export const regimentHtml = (liste, { focus = true } = {}) => liste.map(m => marqueHtml(m, 'pictos', { nb: m.nb, focus })).join('');
