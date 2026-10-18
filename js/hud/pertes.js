// Les pertes des deux armées, en feuille de situation : debout, blessés, tombés, et les croix au crayon.
import { effectifs, tronconsTenus, NOUS, EUX } from '../bataille.js?v=0.29.0';

// Une croix au crayon par mort (douze au plus, le reste en nombre)
export const croix = n => n <= 12 ? '✕'.repeat(n) : `${'✕'.repeat(12)} +${n - 12}`;

export function creerPertes({ $ }) {
  let vues = '';
  return function majPertes(B) {
    const e = B.etat, eff = effectifs(B), bl = e.blesses, cle = `${eff}|${bl}|${e.pertes}`;
    if (cle !== vues) {
      vues = cle;
      [[NOUS, 'pertes-nous', 'Nous'], [EUX, 'pertes-eux', 'En face']].forEach(([c, id, nom]) => {
        const debout = Math.max(0, eff[c] - bl[c]), tombes = e.pertes[c], total = Math.max(1, debout + bl[c] + tombes), pc = n => `${(n / total * 100).toFixed(1)}%`;
        $(id).innerHTML = `<div class="tete">${nom}<span>${debout + bl[c]} en vie</span></div>
        <div class="barre"><i class="debout" style="width:${pc(debout)}"></i><i class="blesses" style="width:${pc(bl[c])}"></i><i class="tombes" style="width:${pc(tombes)}"></i></div>
        <div class="compte">${debout} debout · ${bl[c]} blessés · ${tombes} tombés</div>
        <p class="croix" aria-hidden="true">${croix(tombes)}</p>`;
      });
    }
    $('lignes').hidden = !e.tranchees;
    if (e.tranchees) { const [a, b] = tronconsTenus(B); $('troncons-nous').textContent = a; $('troncons-eux').textContent = b; }
  };
}
