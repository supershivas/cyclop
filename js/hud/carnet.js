// Le carnet de bord : les événements marquants, à l'heure où ils arrivent (la mémoire de la pause active).
// Quatre lignes à l'écran, la dernière surlignée ; il n'est pas sauvegardé.
import { horloge } from '../bataille.js?v=0.28.0';

export const deux = n => String(n).padStart(2, '0');

// `bataille()` : la bataille en cours (pour l'heure)
export function creerCarnet({ $, bataille }) {
  const journal = [];
  function maj() {
    const L = journal.slice(-4);
    $('carnet').hidden = !L.length;
    $('carnet-liste').replaceChildren(...L.map(([t, texte], k) => {
      const li = document.createElement('li');
      if (k === L.length - 1) li.className = 'recent';
      const b = document.createElement('b'); b.textContent = t;
      li.append(b, texte);
      return li;
    }));
  }
  return {
    noter(texte) {
      const h = horloge(bataille());
      journal.push([`${h.heure} h ${deux(h.minute)}`, texte]);
      if (journal.length > 40) journal.shift();
      maj();
    },
    vider() { journal.length = 0; maj(); },
    maj,
  };
}
