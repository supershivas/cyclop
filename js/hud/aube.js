// Le bilan de l'aube en tuiles (Jérôme, 8 nov. : « passe le bilan de l'aube en jeu » ; le même langage que le bilan du soir et les fiches : `bilan.js`, `tuiles.js`) : ce que la nuit a fait, en six tuiles
// (les faits avec leur pictogramme, les morts par cause, les soins, les régiments, l'état-major, les effectifs au matin) au lieu de paragraphes. « Rien de ce qui n'a pas eu lieu » : une tuile sans rien à dire n'existe pas.
// Des fonctions de DOM qui ne lisent que ce qu'on leur donne : `nuit.js` rassemble les données (`b` : le bilan de la nuit du camp ; `refus` : les noms des régiments qui refusent ; `dotation` ; `matin` : `lireJournee`).
import { fait, barreEffectif, reinitIds } from './bilan.js?v=0.128.0';
import { jauge, tuileDe } from './tuiles.js?v=0.128.0';

const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null)); return e; };
const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
const tuile = (titre, ...k) => el('section', 'tuile', el('h4', '', titre), ...k);
const chiffres = (liste) => el('div', 'bi-chiffres', ...liste.map(([n, nom, aide]) => { const d = el('div', 'bi-chiffre', el('b', '', String(n)), el('span', '', nom)); if (aide) d.title = aide; return d; }));

/* Les faits de la nuit, le plus important d'abord : [{ genre, texte }] (jamais vide : « Une nuit de repos ») */
export function faitsDeLaNuit(b, refus = []) {
  const f = [];
  if (b.prisNuit) f.push({ genre: 'gain', texte: `${pl(b.prisNuit, 'tronçon pris', 'tronçons pris')} dans la mêlée` });
  if (b.perdusNuit) f.push({ genre: 'perte', texte: `${pl(b.perdusNuit, 'tronçon perdu', 'tronçons perdus')} dans la mêlée` });
  for (const nom of refus) f.push({ genre: 'alerte', texte: `${nom} refuse de monter aujourd'hui : il tiendra sa tranchée, rien de plus` });
  if (b.affames) f.push({ genre: 'alerte', texte: `${pl(b.affames, 'régiment n\'a', 'régiments n\'ont')} plus de vivres : la faim` });
  if (!f.length) f.push({ genre: 'calme', texte: b.mortsMelee ? 'Une nuit de combat' : 'Une nuit de repos' });
  return f;
}

/* Les tuiles de l'aube. `d` : { b, refus: [noms], dotation: { fin: [lignes], points, parts, caisse } ou null, matin (lireJournee) } */
export function tuilesDeLAube({ b, refus = [], dotation = null, matin = null }) {
  reinitIds();
  const out = [];
  out.push(tuile('Cette nuit', el('ul', 'bi-faits', ...faitsDeLaNuit(b, refus).map(f => { const li = el('li', ''); li.innerHTML = fait(f.genre); li.append(el('span', '', f.texte)); return li; }))));
  const causes = [['Mêlée', b.mortsMelee || 0, 'au corps à corps'], ['Corvées', b.mortsCorvee || 0, 'aux corvées'], ['Blessures', b.mortsBlesses || 0, 'de leurs blessures']], total = causes.reduce((s, c) => s + c[1], 0);
  out.push(tuileDe({ titre: 'Morts dans la nuit', chiffre: total, unite: total > 1 ? 'hommes' : 'homme', graphes: causes.filter(c => c[1]).map(([nom, n]) => [nom, jauge(n / total), String(n)]), mot: total ? '' : 'Personne n\'est mort cette nuit.' }));
  const soins = [[b.evacues, 'évacués', 'Les blessés partis à l\'hôpital'], [b.retours, 'guéris revenus', 'Les blessés guéris revenus au front'], [b.regroupes, 'regroupés', 'Les égarés rejoints à leur régiment']].filter(x => x[0]);
  if (soins.length) out.push(tuile('Les blessés et les égarés', chiffres(soins)));
  const regs = [[b.releves, b.releves > 1 ? 'relevés' : 'relevé'], [b.ravitailles, b.ravitailles > 1 ? 'ravitaillés' : 'ravitaillé'], [b.equipes, b.equipes > 1 ? 'équipés' : 'équipé'], [b.transferes, b.transferes > 1 ? 'soldats changés de régiment' : 'soldat changé de régiment']].filter(x => x[0]);
  if (regs.length) out.push(tuile('Les régiments', chiffres(regs)));
  if (dotation) out.push(tuile('L\'état-major', el('div', 'bi-seul bi-chiffre', el('b', '', `+${dotation.points}`), el('span', '', dotation.points > 1 ? 'points' : 'point')), el('p', 'discret bi-note', `${dotation.parts} ; ${dotation.caisse} en caisse.`), ...dotation.fin.map(t => el('p', '', t))));
  if (matin) {
    const u = matin.camps[0];
    out.push(tuile('Au matin', el('div', 'bi-seul bi-chiffre', el('b', '', String(u.debout)), el('span', '', `debout sur ${u.initial}`)), el('div', 'bi-boite', Object.assign(el('div'), { innerHTML: barreEffectif(u, 0) })), el('p', 'discret bi-note', `Blessés ${u.blesses} · évacués ${u.evacues} · tombés ${u.morts}`)));
  }
  return out;
}
