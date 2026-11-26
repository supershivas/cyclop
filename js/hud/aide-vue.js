/* La fenêtre des commandes des vues à la personne (Jérôme, 21 nov., v0.158.0) : discrète, en bas à gauche ; l'essentiel toujours, le reste à la touche H ; les bascules en marche sont marquées.
   Les commandes sont de la donnée (data/commandes-vue.js) ; le dessin seulement. */
import { COMMANDES_VUE, AIDE_VUE } from '../data/commandes-vue.js?v=0.170.4';

export function creerAideVue(el) {
  let mode = null, ouverte = false, ferme = 0, vus = new Set(), etatsVus = '';
  const kbd = t => `<kbd>${t}</kbd>`;
  function dessiner() {
    const C = COMMANDES_VUE[mode]; if (!C) return;
    el.innerHTML = `<p class="av-titre">${C.titre}</p>`
      + C.groupes.map(g => `<div class="av-g n${g.niveau}">${g.titre ? `<p class="av-st">${g.titre}</p>` : ''}<ul>${g.items.map(([t, quoi, b]) => `<li${b ? ` data-bascule="${b}"` : ''}><span class="av-k">${t.map(kbd).join('')}</span><span>${quoi}</span></li>`).join('')}</ul></div>`).join('')
      + `<p class="av-pied"><span class="av-k">${kbd('H')}</span><span class="av-plus">${ouverte ? 'moins' : 'toutes les commandes'}</span></p>`;
    el.classList.toggle('ouverte', ouverte); etatsVus = '';
  }
  return {
    montrer(m) {
      mode = m; el.toggleAttribute('hidden', !COMMANDES_VUE[m]);
      ouverte = true; vus.add(m); ferme = 0;      // toujours ouverte en entier (v0.167.0, Jérôme : « toujours les contrôles visibles ») ; H la replie
      dessiner();
    },
    cacher() { mode = null; el.toggleAttribute('hidden', true); },
    basculer() { if (!mode) return; ouverte = !ouverte; ferme = 0; dessiner(); },
    /* à chaque image : la fermeture d'elle-même après l'ouverture de la première entrée, les bascules en marche ({ nom: vrai }) */
    maj(etats = {}) {
      if (!mode) return;
      if (ferme && performance.now() > ferme) { ferme = 0; ouverte = false; dessiner(); }
      const cle = Object.keys(etats).filter(k => etats[k]).sort().join(',');
      if (cle === etatsVus) return; etatsVus = cle;
      for (const li of el.querySelectorAll('[data-bascule]')) li.classList.toggle('on', !!etats[li.dataset.bascule]);
    },
    get mode() { return mode; },
  };
}
