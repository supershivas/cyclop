// Les pertes des deux armées (Jérôme, v0.33.0 ; variante B « Le duel » du sujet « La barre de vie » du labo) : comme un jeu de combat en un contre un, une barre
// de chaque côté d'un médaillon (le jour), nous à gauche, en face à droite ; la vie reste collée au centre, ce qui est perdu se vide vers le bord. Pas un chiffre
// à l'écran : ils viennent au survol d'un segment (debout, blessés hachurés, tombés). Dessous, les tronçons tenus : une graduation d'os par tronçon tenu, de
// terre par tronçon perdu, jamais la couleur d'un camp. Le dessin seulement.
import { effectifs, tronconsTenus, horloge, NOUS } from '../bataille.js?v=0.38.3';

export function creerPertes({ $, moi = () => NOUS }) {
  let vues = '';
  return function majPertes(B) {
    const e = B.etat, eff = effectifs(B), bl = e.blesses, M = moi(), tr = e.tranchees ? tronconsTenus(B) : null, h = horloge(B);
    const cle = `${eff}|${bl}|${e.pertes}|${M}|${tr}|${h.jour}/${h.jours}`;
    if (cle === vues) return;
    vues = cle;
    const moitie = e.troncons.length / 2;
    [[M, 'pertes-nous', 'Nous'], [1 - M, 'pertes-eux', 'En face']].forEach(([c, id, nom]) => {
      const debout = Math.max(0, eff[c] - bl[c]), tombes = e.pertes[c], total = Math.max(1, debout + bl[c] + tombes), pc = n => `${(n / total * 100).toFixed(2)}%`;
      const seg = (n, cls, mot) => `<i class="${cls}" style="width:${pc(n)}"${n ? ` data-tip="${n} ${mot}"` : ''}></i>`;
      const graduations = tr ? Array.from({ length: moitie }, (_, k) => `<i${k < tr[c] ? ' class="tenu"' : ''}></i>`).join('') : '';
      $(id).innerHTML = `<span class="nom">${nom}</span>
        <span class="vie" role="img" aria-label="${nom} : ${debout} debout, ${bl[c]} blessés, ${tombes} tombés">${seg(debout, 'debout', 'debout')}${seg(bl[c], 'blesses', 'blessés')}${seg(tombes, 'tombes', 'tombés')}</span>
        ${tr ? `<span class="troncons" data-tip="${tr[c]} tronçons tenus">${graduations}</span>` : ''}`;
    });
    $('pertes-jour').innerHTML = `<b>J${h.jour}</b><span>${h.jours} jours</span>`;
  };
}
