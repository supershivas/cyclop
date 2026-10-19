// Le sujet « Les marques » du labo (Jérôme, v0.37.0) : les mentions de livret d'un homme, en icônes à l'encre sur le papier de la fiche. Deux variantes
// d'icônes, dans les mêmes cadres (la forme du cadre est la famille) : les pictogrammes (9 × 9 cases, js/data/marques-icones.js) ou des sigles de deux
// lettres. Rien ici ne lit ni ne modifie le jeu : le catalogue est celui du jeu (js/data/marques.js), la rangée est celle de la fiche (hud/marques.js).
import { PALETTE as P } from './palette.js?v=0.36.2';
import { MARQUES, FAMILLES } from './data/marques.js?v=0.36.2';
import { marqueHtml, rangeeHtml } from './hud/marques.js?v=0.36.2';

// les règles de css/style.css (« Les marques d'un homme »), pour une page qui ne charge pas la feuille du jeu
const CSS = `
.lm { --jeu-fond: ${P.t}; --jeu-encre: ${P.o}; --jeu-accent: ${P.g}; --marque: 30px; font: 14px/1.4 ui-monospace, monospace; color: ${P.t}; }
.lm .papier { background: ${P.o}; color: ${P.t}; padding: 8px 12px; width: min(40ch, 100%); box-shadow: 3px 3px 0 ${P.t}; margin: 0 0 16px; position: relative; }
.lm h2 { margin: 0 0 2px; font-size: 16px; font-weight: normal; letter-spacing: .08em; }
.lm .discret { color: ${P.g}; margin: 0; }
.lm ul.marques { list-style: none; display: flex; flex-wrap: wrap; gap: 4px; padding: 0; margin: 8px 0 0; position: relative; }
.lm .marque, .lm .marque-reste { box-sizing: border-box; height: var(--marque); min-width: var(--marque); display: flex; align-items: center; justify-content: center; color: ${P.t}; outline-offset: 2px; }
.lm .marque svg { display: block; width: var(--marque); height: var(--marque); }
.lm .marque .cadre { fill: none; stroke: ${P.t}; stroke-width: 1; vector-effect: non-scaling-stroke; }
.lm .marque .dessin rect { fill: ${P.t}; } .lm .marque .dessin rect.s { fill: ${P.g}; }
.lm .marque .dessin text { fill: ${P.t}; font: 700 5px ui-monospace, monospace; stroke: none; }
.lm .marque-reste { padding: 0 4px; font-size: 12px; border: 1px solid ${P.t}; }
.lm .marque:focus-visible, .lm .marque-reste:focus-visible { outline: 2px solid ${P.t}; }
.lm .marque:hover::after, .lm .marque:focus-visible::after, .lm .marque-reste:hover::after, .lm .marque-reste:focus-visible::after {
  content: attr(data-nom) "\\A" attr(data-dit); white-space: pre-line; position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 2;
  padding: 4px 8px; background: ${P.t}; color: ${P.o}; font-size: 12px; line-height: 1.3; box-shadow: 3px 3px 0 ${P.t}; }
.lm table { border-collapse: collapse; } .lm td { padding: 4px 12px 4px 0; vertical-align: middle; } .lm th { text-align: left; font-weight: normal; color: ${P.g}; padding: 12px 0 4px; letter-spacing: .08em; }
.lm .petit .marque { --marque: 15px; }
`;
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const liste = html => `<ul class="marques" style="margin:0;display:inline-flex">${html}</ul>`;

export function maquetteMarques(style) {
  const boite = el('div', { className: 'lm' });
  boite.append(el('style', { textContent: CSS }));
  // la fiche d'un vétéran : huit marques, six montrées, puis « +2 » (les plus récentes d'abord)
  const vieux = ['pluies', 'regiment', 'circonstance', 'fusil-5', 'jambe', 'gel', 'premier-jour', 'cinq-jours'].map(id => MARQUES.find(m => m.id === id));
  const fiche = el('section', { className: 'papier' });
  fiche.innerHTML = `<h2>Émile Brossard</h2><p class="discret">Sergent, 31 ans</p><ul class="marques" aria-label="Marques">${rangeeHtml(vieux, 6, style)}</ul>`;
  boite.append(fiche, el('p', { className: 'discret', textContent: 'Passez la souris sur une icône, ou tabulez : le texte vient au survol et au focus. Six icônes au plus, puis « +N ».' }));
  // le catalogue, par famille
  const t = el('table');
  for (const [fam, F] of Object.entries(FAMILLES)) {
    t.append(el('tr', {}, el('th', { colSpan: 4, textContent: `${F.nom} · cadre ${F.cadre}` })));
    for (const m of MARQUES.filter(m => m.famille === fam)) {
      const tr = el('tr');
      tr.append(el('td', { innerHTML: liste(marqueHtml(m, style)) }), el('td', { className: 'petit', innerHTML: liste(marqueHtml(m, style)) }), el('td', { textContent: m.nom }), el('td', { textContent: m.dit, style: `color:${P.g}` }));
      t.append(tr);
    }
  }
  boite.append(t);
  return boite;
}
