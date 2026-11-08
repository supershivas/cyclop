// Les fiches en tuiles (Jérôme, 8 nov. : « passe la fiche du régiment, des soldats, des chars et mitrailleuse en jeu » ; les tuiles du sujet « Les données : les fiches » du labo, retenues) :
// les graphiques que les quatre fiches se partagent (une jauge à repères, une caractéristique et son départ, une bande de munitions, deux valeurs partagées, l'effectif et le moral d'un régiment jour après jour)
// et `tuileDe(bloc)`, qui pose un bloc { titre, chiffre, unite, graphes: [[nom, svg, mot]], mot, chevrons } sur le papier. Comme le bilan du soir (`bilan.js`) : aucune couleur écrite ici, les variables du jeu,
// la forme porte l'information. Des fonctions de DOM qui ne lisent que ce qu'on leur donne : `fiche.js`, `chars.js` et `nids.js` lisent l'état.
import { chevronsHtml } from './barres.js?v=0.130.0';

const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null)); return e; };
const svgHtml = (cls, w, h, corps, nom) => `<svg class="bi ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${nom}" preserveAspectRatio="xMinYMid meet">${corps}</svg>`;
let uid = 200;
const borne = v => Math.max(0, Math.min(1, v));

/* Une jauge à repères aux seuils des mots : le plein est le niveau */
export function jauge(v, { reperes = [], larg = 200, haut = 10 } = {}) {
  return svgHtml('bi-jauge', larg, haut, `<rect class="bi-cadre" x="0.5" y="0.5" width="${larg - 1}" height="${haut - 1}"/><rect class="bi-niveau" x="1" y="1" width="${((larg - 2) * borne(v)).toFixed(1)}" height="${haut - 2}"/>`
    + reperes.map(r => `<line class="bi-repere" x1="${(larg * r).toFixed(1)}" x2="${(larg * r).toFixed(1)}" y1="0" y2="${haut}"/>`).join(''), `${Math.round(borne(v) * 100)} %`);
}
/* Une caractéristique sur 100 : le trait, une encoche à sa valeur de départ (le chemin fait se lit d'un coup d'œil) */
export function carac(v, base, { larg = 200, haut = 12 } = {}) {
  const x = larg * base / 100;
  return svgHtml('bi-jauge', larg, haut, `<rect class="bi-cadre" x="0.5" y="2.5" width="${larg - 1}" height="${haut - 5}"/><rect class="bi-niveau" x="1" y="3" width="${((larg - 2) * borne(v / 100)).toFixed(1)}" height="${haut - 6}"/>`
    + `<line class="bi-depart-o" x1="${x}" x2="${x}" y1="0" y2="${haut}"/><line class="bi-depart" x1="${x}" x2="${x}" y1="0" y2="${haut}"/>`, `${Math.round(v)} sur 100, départ ${Math.round(base)}`);
}
/* Une bande de cartouches (une case par dizaine) : la bande d'une mitrailleuse, les vivres, les tronçons pris */
export function bande(n, max, { larg = 200, haut = 12, pas = 10 } = {}) {
  const cases = Math.max(1, Math.ceil(max / pas)), w = larg / cases;
  return svgHtml('bi-bande', larg, haut, Array.from({ length: cases }, (_, k) => `<rect class="${k * pas < n ? 'bi-case-pleine' : 'bi-vide'}" x="${(k * w + 1).toFixed(1)}" y="1" width="${Math.max(1, w - 2).toFixed(1)}" height="${haut - 2}"/>`).join(''), `${n} sur ${max}`);
}
/* Deux valeurs sur une échelle commune : la première pleine, la seconde hachurée (les victimes du canon et des mitrailleuses) */
export function partage(a, b, { max = Math.max(1, a + b), larg = 200, haut = 12, camp = 'nous' } = {}) {
  const id = `bi-p${++uid}`, k = larg / max;
  return svgHtml('bi-barre', larg, haut, `<defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="bi-${camp}-fond" width="2" height="4"/></pattern></defs>`
    + `<rect class="bi-${camp}" x="0.5" y="1" width="${Math.max(0, a * k - 1).toFixed(1)}" height="${haut - 2}"/><rect class="bi-hachure" fill="url(#${id})" x="${(a * k + 0.5).toFixed(1)}" y="1" width="${Math.max(0, b * k - 1).toFixed(1)}" height="${haut - 2}"/>`, `${a} et ${b}`);
}
/* L'effectif (plein, ramené à son départ) et le moral (tirets) d'un régiment, soir après soir ; le dernier point (aujourd'hui) est cerclé */
export function fil(hist, initial, { larg = 220, haut = 64 } = {}) {
  if (hist.length < 2) return '';
  const y = v => 4 + (1 - borne(v)) * (haut - 8), x = k => 6 + k * (larg - 12) / (hist.length - 1), dernier = hist.length - 1;
  const ligne = (vals, cls) => `<polyline class="${cls}" points="${vals.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
  const eff = hist.map(h => h.vivants / initial);
  return svgHtml('bi-fil', larg, haut, `<line class="bi-base" x1="0" x2="${larg}" y1="${y(0.5)}" y2="${y(0.5)}"/>${ligne(eff, 'bi-fil-eff')}${ligne(hist.map(h => h.moral), 'bi-fil-moral')}`
    + hist.map((h, k) => `<circle class="${k === dernier ? 'bi-point-dernier' : 'bi-point'}" cx="${x(k).toFixed(1)}" cy="${y(eff[k]).toFixed(1)}" r="${k === dernier ? 4 : 2}"><title>Jour ${h.jour} : ${h.vivants} hommes, moral ${Math.round(h.moral * 100)} %</title></circle>`).join(''),
    `Effectif et moral, jour après jour`);
}

/* Un bloc sur le papier : le titre, le gros chiffre, des rangées « nom, graphique, mot », puis un mot ; `chevrons` : ceux de l'expérience */
export function tuileDe(b) {
  const t = el('section', 'tuile', el('h4', '', b.titre));
  if (b.chiffre != null) t.append(el('div', 'bi-chiffre bi-seul', el('b', '', String(b.chiffre)), el('span', '', b.unite || '')));
  for (const [nom, svg, mot] of b.graphes || []) {
    const l = el('div', `fiche-rang${nom ? '' : ' sans-nom'}`);
    if (nom) l.append(el('span', 'fiche-nom-g', nom));
    const g = el('div', 'bi-boite'); g.innerHTML = svg; l.append(g);
    if (mot) l.append(el('span', 'fiche-mot', mot));
    t.append(l);
  }
  if (b.chevrons != null || b.mot) { const m = el('p', 'discret bi-note'); if (b.chevrons != null) m.insertAdjacentHTML('beforeend', b.chevrons ? `<span class="fiche-chev">${chevronsHtml(b.chevrons)}</span> ` : 'novice · '); m.append(b.mot || ''); t.append(m); }
  if (b.aide) t.title = b.aide;
  return t;
}
export const tuilesDe = blocs => { uid = 200; return blocs.map(tuileDe); };
