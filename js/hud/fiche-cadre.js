// La charpente commune des fiches (Jérôme, 20 nov., v0.153.0 : « les fiches, deuxième jet » du labo, passé en jeu ; la bande noire de la soirée) :
// une bande noire (l'écusson, le nom, qui il est, un tampon d'état, les icônes), quatre chiffres clés, deux colonnes (« Maintenant », « Son parcours »), un pied (le lien à gauche,
// UN bouton rouge à droite). Des fonctions de DOM sur des données : `fiche.js`, `chars.js`, `nids.js` et l'avion de main.js lisent l'état ; le CSS : « Les fiches » de css/style.css (`.fx`).
import { ecussonHtml, reglerEcusson } from './ecussons.js?v=0.161.2';
import { chevronsHtml } from './barres.js?v=0.161.2';

export const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null && k !== false && k !== '')); return e; };
const svg = (cls, h) => { const d = el('div', cls); d.innerHTML = h; return d; };
const info = (e, t) => { if (t) e.dataset.info = t; return e; };

/* L'écusson de la bande : `type` ('reg', 'char', 'nid', 'avion'), réglé comme sur le champ ({ debout, blesses, num, chev, moral, detruit }) ; refait seulement si le type change */
export function poserEcusson(hote, type, etat) {
  if (hote.dataset.type !== type) { hote.dataset.type = type; hote.innerHTML = ecussonHtml(type, 'nous'); }
  reglerEcusson(hote, etat);
}
/* Le tampon d'état (« Tient », « Ébranlé », « Tombé »…) ; `genre` : '' (encre), 'orange' (ébranlé), 'rouge' (déroute), 'sang' (tombé, détruit) */
export function poserTampon(t, mot, genre = '') {
  t.hidden = !mot; t.textContent = mot || ''; t.className = `fx-tampon${genre ? ` ${genre}` : ''}`;
}
/* Un chiffre clé : le chiffre, son unité, une petite barre (svg), le mot ; `aide` : l'infobulle */
export const cle = (chiffre, unite, mot, graphe = '', aide = '') => info(el('div', 'fx-cle', el('div', 'fx-cle-c', el('b', '', String(chiffre)), unite ? el('span', '', unite) : null), graphe ? svg('fx-cle-g', graphe) : null, el('small', '', mot)), aide);
/* Une rangée « nom · graphique · mot » */
export const rang = (nom, graphe, mot = '') => el('div', `fx-rang${nom ? '' : ' sans-nom'}`, nom ? el('span', 'fx-nom', nom) : null, svg('fx-g', graphe), el('span', 'fx-mot', mot));
/* Un bloc titré ; `aide` : l'infobulle */
export const bloc = (titre, kids, aide = '') => info(el('section', 'fx-bloc', el('h4', '', titre), ...kids), aide);
export const note = t => el('p', 'fx-note', t);
export const phrase = t => el('p', 'fx-ordre', t);
export const chevrons = n => n ? svg('fx-chev', chevronsHtml(n)) : null;
export const deux = (a, b) => el('div', 'fx-deux', a, b);
export const image = h => svg('fx-image', h);
