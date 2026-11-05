// Le carnet de bord : les événements marquants, à l'heure où ils arrivent (la mémoire de la pause active). Il n'est pas sauvegardé.
// Jérôme, v0.100.0 : (1) un clic sur le carnet en montre tout l'historique (défilant), un second le referme sur les quatre dernières lignes ; (2) les noms y sont cliquables
// (un régiment, un homme, un tronçon : `liens` d'une ligne, rendus à `surLien`, qui mène la vue ou ouvre la fiche) ; (3) un événement important (un assaut d'en face, un tronçon perdu ou pris)
// porte son pictogramme et clignote UNE fois à son arrivée (jamais en boucle ; coupé si le système demande un mouvement réduit) ; (4) il se replie sur son en-tête pour prendre moins de place.
import { horloge } from '../bataille.js?v=0.112.0';

export const deux = n => String(n).padStart(2, '0');
// les genres d'événement important : le pictogramme (dessiné comme les autres icônes du HUD) et le mot que lit un lecteur d'écran
export const GENRES = {
  assaut: { icone: '<path d="M4 20 20 4M14 4h6v6M4 4l7 7"/>', mot: 'Assaut' },         // deux traits qui se croisent, une pointe : en face sort de ses tranchées
  perte: { icone: '<path d="M6 21V4M6 5h12l-3 4 3 4H6"/>', mot: 'Perte' },             // un fanion
  gain: { icone: '<path d="M6 21V4M6 5h12l-3 4 3 4H6M10 8l2 2 3-3"/>', mot: 'Gain' },  // un fanion et un trait
};
const HISTORIQUE = 400;      // lignes gardées (avant : 40)

// `bataille()` : la bataille en cours (pour l'heure) ; `surLien(lien)` : un nom cliqué ; `replie` / `surReplie(oui)` : l'état replié, gardé par main.js dans les préférences
export function creerCarnet({ $, bataille, surLien = () => {}, replie = false, surReplie = () => {} }) {
  const journal = [];
  let tout = false, ferme = !!replie, vu = 0;      // `vu` : combien de lignes ont déjà été montrées (celles d'après clignotent)
  const racine = $('carnet');
  function ligne([t, texte, liens, genre], recent, neuve) {
    const li = document.createElement('li');
    if (recent) li.classList.add('recent');
    if (genre) {
      li.classList.add('grave', `grave-${genre}`);
      if (neuve) li.classList.add('clignote');
      const i = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      i.setAttribute('viewBox', '0 0 24 24'); i.setAttribute('aria-hidden', 'true'); i.classList.add('picto'); i.innerHTML = GENRES[genre].icone;
      const mot = document.createElement('span'); mot.className = 'sr'; mot.textContent = `${GENRES[genre].mot} : `;
      li.append(i, mot);
    }
    const b = document.createElement('b'); b.textContent = t;
    li.append(b);
    // les noms cliquables : chaque lien est cherché dans le texte (le premier en tête d'abord), le reste est du texte simple
    const trouves = (liens || []).map(l => ({ l, i: texte.indexOf(l.texte) })).filter(x => x.i >= 0 && x.l.texte).sort((a, c) => a.i - c.i);
    let pos = 0;
    for (const { l, i } of trouves) {
      if (i < pos) continue;
      if (i > pos) li.append(texte.slice(pos, i));
      const a = document.createElement('a'); a.href = '#'; a.className = 'carnet-lien'; a.textContent = l.texte;      // (un lien, pas un bouton : il coule dans la phrase)
      a.dataset.lien = JSON.stringify(l.cible);
      li.append(a); pos = i + l.texte.length;
    }
    li.append(texte.slice(pos));
    return li;
  }
  function maj() {
    const L = tout ? journal : journal.slice(-4), debut = journal.length - L.length;
    racine.hidden = !journal.length;
    racine.classList.toggle('replie', ferme); racine.classList.toggle('histoire', tout && !ferme);
    $('carnet-replier').setAttribute('aria-expanded', String(!ferme)); $('carnet-replier').setAttribute('aria-label', ferme ? 'Déplier le carnet de bord' : 'Replier le carnet de bord');
    $('carnet-histo').setAttribute('aria-expanded', String(tout));
    $('carnet-histo').dataset.info = tout ? 'Les quatre dernières lignes' : 'Tout l\'historique de la bataille';
    $('carnet-liste').replaceChildren(...L.map((e, k) => ligne(e, k === L.length - 1, debut + k >= vu)));
    vu = journal.length;
    if (tout) $('carnet-liste').scrollTop = $('carnet-liste').scrollHeight;
  }
  // un clic sur un nom mène quelque part ; ailleurs sur le papier, il ouvre ou referme l'historique ; la flèche le replie
  racine.addEventListener('click', e => {
    if (e.target.closest('#carnet-replier')) { ferme = !ferme; surReplie(ferme); return maj(); }
    const lien = e.target.closest('a.carnet-lien');
    if (lien) { e.preventDefault(); lien.blur(); try { surLien(JSON.parse(lien.dataset.lien)); } catch { /* un lien illisible ne fait rien */ } return; }
    if (ferme) { ferme = false; surReplie(false); return maj(); }
    tout = !tout; maj();
  });
  return {
    // `liens` : [{ texte, cible }] (le texte à rendre cliquable, ce que `surLien` reçoit) ; `genre` : 'assaut' | 'perte' | 'gain' (un événement important)
    noter(texte, { liens = [], genre = null } = {}) {
      const h = horloge(bataille());
      journal.push([`${h.heure} h ${deux(h.minute)}`, texte, liens, genre]);
      if (journal.length > HISTORIQUE) { journal.shift(); vu = Math.max(0, vu - 1); }
      maj();
    },
    vider() { journal.length = 0; vu = 0; tout = false; maj(); },
    maj,
  };
}
