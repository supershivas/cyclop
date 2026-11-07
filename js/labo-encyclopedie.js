// L'encyclopédie des règles au labo (Jérôme, v0.100.0 : « tous les termes utilisés sont définis, des captures de tous les éléments du jeu (unités, interfaces, mécaniques de jeu) »).
// Le texte vient de `js/data/encyclopedie.js` (qui lit les calibres, météos, corvées, bâtiments… dans leurs modules : rien n'est recopié) ; les captures viennent de `outils/encyclopedie.mjs`
// (assets/encyclopedie/*.png, listées dans index.json : une capture absente est dite « à faire », jamais une image cassée). Le labo montre, il ne modifie rien.
import { ENTREES, CATEGORIES, PAR_ID, trier, lexique } from './data/encyclopedie.js?v=0.118.0';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const DOSSIER = 'assets/encyclopedie';
let presentes = null;
async function captures() {
  if (presentes) return presentes;
  try { presentes = new Set((await (await fetch(`${DOSSIER}/index.json`, { cache: 'no-store' })).json()).captures); } catch { presentes = new Set(); }
  return presentes;
}
const CSS = `
.enc { font: 14px/1.45 system-ui, sans-serif; color: #222; }
.enc .barre { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 16px; position: sticky; top: 0; background: #f4f4f2; padding: 8px 0; z-index: 2; }
.enc input[type=search] { font: inherit; padding: 8px 12px; min-width: 260px; border: 1px solid #999; border-radius: 6px; }
.enc .puce { font: inherit; padding: 6px 12px; border: 1px solid #999; border-radius: 16px; background: #fff; cursor: pointer; }
.enc .puce[aria-pressed=true] { background: #222; color: #fff; border-color: #222; }
.enc .compte { color: #666; font-size: 12px; margin-left: auto; }
.enc h3 { margin: 24px 0 4px; font-size: 18px; }
.enc .cat-dit { color: #666; margin: 0 0 12px; }
.enc .fiches { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
.enc article { background: #fff; border: 1px solid #ccc; border-radius: 8px; padding: 12px 16px; display: grid; gap: 8px; align-content: start; }
.enc article:target, .enc article.vise { outline: 3px solid #b8860b; }
.enc article h4 { margin: 0; font-size: 16px; }
.enc article .cat { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #777; }
.enc article p { margin: 0; }
.enc article img { width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; image-rendering: auto; background: #16130f; }
.enc .a-faire { font-size: 12px; color: #999; border: 1px dashed #ccc; padding: 6px 8px; border-radius: 4px; }
.enc dl.faits { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; font-size: 13px; }
.enc dl.faits dt { color: #666; } .enc dl.faits dd { margin: 0; }
.enc .voir { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; color: #666; }
.enc .voir button { font: inherit; border: 0; background: #ece9df; border-radius: 10px; padding: 2px 8px; cursor: pointer; }
.enc table { border-collapse: collapse; width: 100%; }
.enc th, .enc td { text-align: left; vertical-align: top; padding: 6px 12px 6px 0; border-bottom: 1px solid #ddd; }
.enc td.terme { font-weight: 600; white-space: nowrap; } .enc td.cat { color: #777; white-space: nowrap; font-size: 12px; }
.enc .planche { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.enc figure { margin: 0; } .enc figure img { width: 100%; border: 1px solid #ddd; border-radius: 4px; background: #16130f; } .enc figcaption { font-size: 12px; color: #555; }
`;
function style() { if (!document.getElementById('enc-css')) document.head.append(el('style', { id: 'enc-css', textContent: CSS })); }
const sansAccent = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function fiche(e, la, aller) {
  const a = el('article', { id: `enc-${e.id}` });
  a.append(el('span', { className: 'cat', textContent: CATEGORIES.find(c => c.id === e.cat)?.nom ?? e.cat }), el('h4', { textContent: e.terme }), el('p', { textContent: e.def }));
  if (e.faits.length) a.append(el('dl', { className: 'faits' }, ...e.faits.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', { textContent: String(v) })])));
  if (e.capture) a.append(la.has(e.capture) ? el('img', { src: `${DOSSIER}/${e.capture}.png`, alt: `Capture : ${e.terme}`, loading: 'lazy' }) : el('div', { className: 'a-faire', textContent: `Capture « ${e.capture} » à faire (node outils/encyclopedie.mjs).` }));
  if (e.voir.length) a.append(el('div', { className: 'voir' }, 'Voir aussi :', ...e.voir.map(id => el('button', { type: 'button', textContent: PAR_ID[id]?.terme ?? id, onclick: () => aller(id) }))));
  return a;
}

// Les entrées : une recherche, des puces de catégorie, des fiches avec leur capture
async function entrees(stage) {
  style();
  const la = await captures(), racine = el('div', { className: 'enc' });
  let cat = '', q = '';
  const liste = el('div'), compte = el('span', { className: 'compte' });
  const champ = el('input', { type: 'search', placeholder: 'Un mot, une règle…', 'aria-label': 'Chercher dans l\'encyclopédie' });
  const puces = [{ id: '', nom: 'Tout' }, ...CATEGORIES].map(c => el('button', { type: 'button', className: 'puce', textContent: c.nom, onclick: () => { cat = c.id; dessiner(); } }));
  const aller = id => {
    cat = ''; q = ''; champ.value = ''; dessiner();
    const cible = liste.querySelector(`#enc-${CSS_ID(id)}`);
    if (cible) { cible.scrollIntoView({ behavior: 'smooth', block: 'center' }); cible.classList.add('vise'); setTimeout(() => cible.classList.remove('vise'), 2200); }
  };
  function dessiner() {
    puces.forEach((p, k) => p.setAttribute('aria-pressed', String((k === 0 ? '' : CATEGORIES[k - 1].id) === cat)));
    const n = sansAccent(q), garde = trier(ENTREES.filter(e => (!cat || e.cat === cat) && (!n || sansAccent(`${e.terme} ${e.def} ${e.faits.map(f => f.join(' ')).join(' ')}`).includes(n))));
    compte.textContent = `${garde.length} sur ${ENTREES.length}`;
    const blocs = [];
    for (const c of CATEGORIES) {
      const es = garde.filter(e => e.cat === c.id);
      if (!es.length) continue;
      blocs.push(el('h3', { textContent: c.nom }), el('p', { className: 'cat-dit', textContent: c.dit }), el('div', { className: 'fiches' }, ...es.map(e => fiche(e, la, aller))));
    }
    liste.replaceChildren(...(blocs.length ? blocs : [el('p', { textContent: 'Aucun mot ne correspond.' })]));
  }
  champ.addEventListener('input', () => { q = champ.value; dessiner(); });
  racine.append(el('div', { className: 'barre' }, champ, ...puces, compte), liste);
  stage.append(racine);
  dessiner();
}
const CSS_ID = id => id.replace(/[^\w-]/g, '_');

// Le lexique : tous les termes, de A à Z, sur une ligne chacun
function lexiqueAZ(stage) {
  style();
  const t = el('table', { className: 'enc' }, el('tr', {}, ...['Terme', 'Catégorie', 'Définition'].map(h => el('th', { textContent: h }))));
  for (const e of lexique()) t.append(el('tr', {}, el('td', { className: 'terme', textContent: e.terme }), el('td', { className: 'cat', textContent: CATEGORIES.find(c => c.id === e.cat)?.nom }), el('td', { textContent: e.def })));
  stage.append(el('div', { className: 'enc' }, el('p', { textContent: `${ENTREES.length} termes, de A à Z. Les définitions des calibres, météos, corvées, bâtiments, postures et difficultés sont lues dans les données du jeu.` }), t));
}

// La planche des captures : chaque image, avec les mots qu'elle illustre
async function planche(stage) {
  style();
  const la = await captures(), noms = [...new Set(ENTREES.map(e => e.capture).filter(Boolean))].sort();
  const racine = el('div', { className: 'enc' }), grille = el('div', { className: 'planche' });
  for (const n of noms) {
    const mots = ENTREES.filter(e => e.capture === n).map(e => e.terme).slice(0, 6).join(' · ');
    grille.append(el('figure', {}, la.has(n) ? el('img', { src: `${DOSSIER}/${n}.png`, alt: n, loading: 'lazy' }) : el('div', { className: 'a-faire', textContent: 'à faire' }), el('figcaption', { textContent: `${n} — ${mots}` })));
  }
  const manque = noms.filter(n => !la.has(n));
  racine.append(el('p', { textContent: `${noms.length - manque.length} captures sur ${noms.length}.${manque.length ? ` Manque : ${manque.join(', ')}.` : ''} Elles se refont par « node outils/encyclopedie.mjs ».` }), grille);
  stage.append(racine);
}

export { entrees, lexiqueAZ, planche };
