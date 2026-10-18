// Les pertes des deux armées, en feuille de situation : debout, blessés, tombés, et les croix au crayon.
import { effectifs, tronconsTenus, NOUS, EUX } from '../bataille.js?v=0.31.0';

// Une croix au crayon par mort (douze au plus, le reste en nombre)
export const croix = n => n <= 12 ? '✕'.repeat(n) : `${'✕'.repeat(12)} +${n - 12}`;

export function creerPertes({ $, moi = () => NOUS }) {
  let vues = '';
  return function majPertes(B) {
    const e = B.etat, eff = effectifs(B), bl = e.blesses, M = moi(), cle = `${eff}|${bl}|${e.pertes}|${M}`;
    if (cle !== vues) {
      vues = cle;
      [[M, 'pertes-nous', 'Nous'], [1 - M, 'pertes-eux', 'En face']].forEach(([c, id, nom]) => {
        const debout = Math.max(0, eff[c] - bl[c]), tombes = e.pertes[c], total = Math.max(1, debout + bl[c] + tombes), pc = n => `${(n / total * 100).toFixed(1)}%`;
        $(id).innerHTML = `<span class="nom">${nom}</span>
        <span class="barre"><i class="debout" style="width:${pc(debout)}"></i><i class="blesses" style="width:${pc(bl[c])}"></i><i class="tombes" style="width:${pc(tombes)}"></i></span>
        <span class="compte" title="${debout} debout · ${bl[c]} blessés · ${tombes} tombés">${debout} · ${bl[c]} bl. · ${tombes} t.</span>
        <span class="croix" aria-hidden="true">${croix(tombes)}</span>
        <span class="tr" title="Tronçons tenus"><b></b> tr.</span>`;
      });
    }
    const tr = e.tranchees ? tronconsTenus(B) : null;
    [[M, 'nous'], [1 - M, 'eux']].forEach(([c, k]) => { const t = document.querySelector(`#pertes-${k} .tr`); if (t) { t.hidden = !tr; if (tr) t.firstChild.textContent = tr[c]; } });
  };
}
