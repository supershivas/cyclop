// Les pertes des deux armées (Jérôme, v0.33.0 ; variante B « Le duel » du sujet « La barre de vie » du labo) : comme un jeu de combat en un contre un, une barre
// de chaque côté d'un médaillon (le jour), nous à gauche, en face à droite ; la vie reste collée au centre, ce qui est perdu se vide vers le bord. Pas un chiffre
// à l'écran : ils viennent au survol de la barre (une infobulle : debout, blessés, tombés, régiments, tronçons tenus ; `data-info`, hud/infobulle.js). Dessous, les tronçons tenus : une graduation d'os par tronçon tenu, de
// terre par tronçon perdu, jamais la couleur d'un camp. Le dessin seulement.
import { effectifs, blessesActuels, tronconsTenus, horloge, NOUS } from '../bataille.js?v=0.77.1';

export function creerPertes({ $, moi = () => NOUS }) {
  let vues = '';
  return function majPertes(B) {
    const e = B.etat, eff = effectifs(B), bl = blessesActuels(B), M = moi(), tr = e.tranchees ? tronconsTenus(B) : null, h = horloge(B);
    const cle = `${eff}|${bl}|${e.pertes}|${M}|${tr}|${h.jour}/${h.jours}`;
    if (cle === vues) return;
    vues = cle;
    const moitie = e.troncons.length / 2;
    [[M, 'pertes-nous', 'Nous'], [1 - M, 'pertes-eux', 'En face']].forEach(([c, id, nom]) => {
      const debout = Math.max(0, eff[c] - bl[c]), tombes = e.pertes[c], total = Math.max(1, debout + bl[c] + tombes), pc = n => `${(n / total * 100).toFixed(2)}%`;
      const seg = (n, cls) => `<i class="${cls}" style="width:${pc(n)}"></i>`;
      const regs = e.regiments.filter(r => r.camp === c), vivants = regs.filter(r => r.effectif > 0).length;
      $(id).dataset.info = [`# ${nom}`, '## Les hommes', `Debout : **${debout}**`, `Blessés : **${bl[c]}**`, `Tombés : **${tombes}**`, '## Le front', `Régiments debout : **${vivants} sur ${regs.length}**`, ...(tr ? [`Tronçons tenus : **${tr[c]} sur ${moitie}**`] : [])].join('\n');
      const graduations = tr ? Array.from({ length: moitie }, (_, k) => `<i${k < tr[c] ? ' class="tenu"' : ''}></i>`).join('') : '';
      $(id).innerHTML = `<span class="nom">${nom}</span>
        <span class="vie" role="img" aria-label="${nom} : ${debout} debout, ${bl[c]} blessés, ${tombes} tombés">${seg(debout, 'debout')}${seg(bl[c], 'blesses')}${seg(tombes, 'tombes')}</span>
        ${tr ? `<span class="troncons">${graduations}</span>` : ''}`;
    });
    $('pertes-jour').innerHTML = `<b>J${h.jour}</b><span>${h.jours} jours</span>`;
    $('pertes-jour').dataset.info = `# Jour ${h.jour} sur ${h.jours}\n## La bataille\nIl reste **${h.jours - h.jour}** jour${h.jours - h.jour > 1 ? 's' : ''} après celui-ci`;
  };
}
