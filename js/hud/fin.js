// Le rapport de fin de bataille (sorti de main.js, lot de dette du 24 nov.) : l'issue et ses chiffres-clés, la bataille jour après jour,
// les médailles ; le mérite versé au Mémorial. `creerFin(ctx)` rend `montrer(B, MOI, aDeux)`.
import { MISSIONS, bordereau } from '../bataille.js?v=0.170.2';
import { lireBataille } from '../donnees-jour.js?v=0.170.2';
import { el as elDe, info as infoDe, graphe as grapheFin, frise as friseFin, legende as legendeFin, tableMed, tableDissous } from './papier-nuit.js?v=0.170.2';
import { palmares } from './medailles.js?v=0.170.2';

let $, DEBUG, prefs, store;
export function creerFin(ctx) {
  ({ $, DEBUG, prefs, store } = ctx);
  return { montrer };
}
function montrer(B, MOI, reseau) {
  // la fin (Jérôme, 15 nov., v0.134.0 ; labo « La fin de partie », variante A « Le rapport ») : l'issue et ses chiffres-clés, la bataille jour après jour et ses moments, les médailles
  const e = B.etat, F = lireBataille(B, MOI), [n, x] = F.camps, ok = !!e.issue?.reussie, mission = e.mission || 'tenir';
  $('fin-tampon').textContent = reseau ? (ok ? 'Bleu' : 'Kaki') : ok ? (mission === 'prendre' ? 'Pris' : 'Tenu') : 'Perdu';
  $('fin-issue').classList.toggle('reussie', reseau ? true : ok);
  $('fin-titre').textContent = reseau ? `${ok ? 'Le bleu' : 'Le kaki'} l'emporte` : ok ? (mission === 'prendre' ? 'Leur ligne est prise' : 'Le secteur est tenu') : (mission === 'prendre' ? 'Leur ligne a tenu' : 'Le secteur est perdu');
  $('fin-mission').textContent = `${e.jour} jour${e.jour > 1 ? 's' : ''} de bataille`;
  infoDe($('fin-mission'), `# La mission\n${e.issue?.texte || MISSIONS[mission] || ''}${e.issue?.secondaires ? `\nMissions secondaires : ${e.issue.secondaires.reussies.length} réussie(s), ${e.issue.secondaires.score} points` : ''}`);
  $('fin-nouvelle').hidden = !!reseau;
  // le bordereau de dotation (v0.99.3) : le mérite de la bataille, versé une fois au mémorial ; ses lignes au survol
  const bd = bordereau(B);
  if (bd.total && !DEBUG && !reseau && !e.memorialVerse) { e.memorialVerse = true; prefs.memorial = (prefs.memorial || 0) + bd.total; store.save('prefs', prefs); }
  const cle = (v, nom, cls, aide) => infoDe(elDe('div', `pn-cle ${cls}`, elDe('b', '', String(v)), elDe('span', '', nom)), aide);
  const tot = F.total, t = F.tenus.at(-1) ?? [0, 0];
  $('fin-cles').replaceChildren(
    cle(n.morts, 'morts chez nous', 'bi-t-nous', `# Nos morts\n${n.mortsParJour.map((v, k) => `Jour ${k + 1} : ${v}`).join(' · ')}`),
    cle(x.morts, 'en face', 'bi-t-eux', `# Leurs morts\n${x.mortsParJour.map((v, k) => `Jour ${k + 1} : ${v}`).join(' · ')}`),
    cle(n.debout, `debout sur ${n.initial}`, 'bi-t-nous', `# Nos hommes\n**${n.debout}** debout, ${n.blesses} blessés, ${n.evacues} évacués, ${n.morts} tombés, sur ${n.initial}\nEn face : ${x.debout} debout sur ${x.initial}`),
    ...(e.tranchees && tot ? [cle(`${t[0]}/${tot}`, 'tronçons à nous', 'bi-t-nous', `# Les lignes\n${t[0]} tronçons à nous, ${t[1]} à eux, au dernier soir`)] : []),
    ...(bd.total ? [cle(`+${bd.total}`, 'mérite', 'fin-merite', `# Le mérite\n${bd.lignes.map(([l, v]) => `${l} : **+${v}**`).join('\n')}`)] : []));
  $('fin-bataille').replaceChildren(elDe('h3', '', 'La bataille'), Object.assign(elDe('div', 'fin-g'), { innerHTML: grapheFin(F) }), friseFin(F), legendeFin());
  $('fin-medailles').replaceChildren(elDe('h3', '', 'Les médailles'), ...tableMed(palmares(B, MOI, 'total')), ...tableDissous(F));
  $('dialogue-fin').showModal();
}
