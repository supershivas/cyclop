// Le papier de campagne (Jérôme, v0.36.4 ; variante A « Le registre » du sujet « Le papier de campagne » du labo) : entre deux batailles, un papier posé sur le champ
// (jamais une boîte de dialogue, comme celui de la nuit). Il ne décide rien : il dit ce que `passage` de campagne.js a calculé (la bataille qui finit, chaque régiment tel
// que la reconstitution le fera, les fusions) et un seul geste, partir pour la suivante (Entrée : le bouton prend le focus). Il ne lit ni ne modifie la partie.
import { MISSIONS } from '../bataille.js?v=0.67.2';
import { SECTEURS } from '../data/secteur.js?v=0.67.2';
import { chevronsHtml } from './barres.js?v=0.67.2';
import { pluriel } from './lecture.js?v=0.67.2';
import { TEXTES } from '../data/campagne.js?v=0.67.2';

const el = (tag, classe, ...kids) => { const e = document.createElement(tag); if (classe) e.className = classe; e.append(...kids.filter(k => k != null && k !== false)); return e; };
const voyelle = n => /^[AEIOUYÉ]/.test(n);
const le = n => (voyelle(n) ? `l'${n}` : `le ${n}`);
const de = n => (voyelle(n) ? `de l'${n}` : `du ${n}`);
const hommes = n => `${n} ${n === 1 ? 'homme' : 'hommes'}`;
const chef = r => !r.commandant ? 'recruté à neuf' : `${r.commandant.promu ? `${r.commandant.ancien} promu capitaine` : 'capitaine'} ${r.commandant.prenom} ${r.commandant.nom}`;
const notes = r => [r.fusionnes && `+${r.fusionnes} d'un autre régiment`, r.enRoute && `${r.enRoute} ${r.enRoute > 1 ? 'évacués' : 'évacué'} de retour`].filter(Boolean).join(' · ');

export function creerCampagne({ $ }) {
  const racine = $('campagne');
  function ligne(r) {
    const n = r.veterans + r.recrues, barre = el('span', 'barre'), debout = el('i', 'debout'), neuf = el('i', 'neuf');
    debout.style.width = `${r.veterans / n * 100}%`; neuf.style.width = `${r.recrues / n * 100}%`; barre.append(debout, neuf);
    const chev = el('span', 'chevrons'); chev.innerHTML = chevronsHtml(r.chevrons);
    const l = el('div', 'ligne', el('b', '', r.nom), chev, barre, el('span', '', chef(r), ' ', el('span', 'discret', notes(r) && `· ${notes(r)}`)));
    l.setAttribute('aria-label', `${r.nom} : ${hommes(r.veterans)} gardés, ${pluriel(r.recrues, 'recrue', 'recrues')}, ${chef(r)}`);
    return l;
  }
  /* Montre le papier de `p` (`passage`) ; `partir` est appelé au geste du joueur. */
  function montrer(p, partir) {
    const secteur = SECTEURS[p.secteur].nom, d = p.derniere;
    const vet = p.regiments.reduce((t, r) => t + r.veterans, 0), rec = p.regiments.reduce((t, r) => t + r.recrues, 0);
    const bouton = el('button', 'bouton', `Partir pour la bataille ${p.n} · ${secteur}`, el('span', 'discret', ' (Entrée)'));
    bouton.onclick = () => { cacher(); partir(); };
    racine.replaceChildren(...[
      el('h2', '', 'Entre deux batailles'),
      el('p', '', `Bataille ${d.n} finie : ${SECTEURS[d.secteur].nom}, ${pluriel(d.jours, 'jour', 'jours')}. ${d.issue?.texte ?? ''}`),
      el('p', 'discret', `Nos morts : ${d.pertes[0]}. Les leurs : ${d.pertes[1]}.`),
      el('div', 'registre', ...p.regiments.map(ligne)),
      p.fusions.length ? el('p', '', el('span', 'discret', 'Dissous : '), p.dissous.join(', '), el('span', 'discret', ' — '), p.fusions.map(f => `${hommes(f.hommes)} ${de(f.de)} vers ${le(f.vers)}`).join(' ; '), '.') : null,
      p.perdus ? el('p', 'discret', `${hommes(p.perdus)} sans place : ils quittent la campagne.`) : null,
      el('p', 'discret', `Au total ${pluriel(vet, 'vétéran', 'vétérans')}, ${pluriel(rec, 'recrue', 'recrues')}. En face, ${p.forces[1]} hommes.`),
      el('p', '', `Mission : ${MISSIONS[p.mission].replace(/^./, c => c.toLowerCase())}`),
      bouton].filter(Boolean));
    racine.hidden = false;
    bouton.focus();
  }
  /* La fin de la campagne (lot 6, sans fanfare) : `b` est le `bilan` de campagne.js. Une ligne par bataille, puis deux listes de noms, repliées (rien n'est mis en tête :
     DESIGN.md, ni victoire claironnée ni compteur de morts en récompense) ; un seul geste, l'écran titre. */
  function montrerFin(b, retour) {
    const liste = (titre, noms, ligne) => {
      const d = el('details', 'noms', el('summary', '', `${titre} (${noms.length})`));
      d.append(noms.length ? el('ul', '', ...noms.map(n => el('li', '', ligne(n)))) : el('p', 'discret', TEXTES.vide));
      return d;
    };
    const bouton = el('button', 'bouton', TEXTES.retour);
    bouton.onclick = () => { cacher(); retour(); };
    racine.replaceChildren(
      el('h2', '', b.texte),
      el('div', 'registre', ...b.batailles.map(x => el('p', 'ligne-bataille', `Bataille ${x.n} · ${SECTEURS[x.secteur].nom} · ${pluriel(x.jours, 'jour', 'jours')} : ${x.issue?.reussie ? TEXTES.issue.reussie : TEXTES.issue.manquee}`, el('span', 'discret', ` · ${pluriel(x.tombes, 'tombé', 'tombés')}`)))),
      liste(TEXTES.tombes, b.tombes, n => `${n.prenom} ${n.nom}, ${n.regiment ?? 'sans régiment'}, ${n.jour === 1 ? '1er' : `${n.jour}e`} jour de la bataille ${n.bataille}`),
      liste(TEXTES.jusquauBout, b.restes, n => `${n.prenom} ${n.nom}, ${n.grade}, ${n.regiment}`),
      bouton);
    racine.hidden = false;
    bouton.focus();
  }
  function cacher() { racine.hidden = true; racine.replaceChildren(); }
  return { montrer, montrerFin, cacher, get ouvert() { return !racine.hidden; } };
}
