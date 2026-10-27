// Le camp à l'écran (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md) : une rangée de cinq pastilles en bas à droite (là où étaient les boutons de batterie) et, pour le bâtiment
// choisi, son papier : ce qu'il est, ses ordres (les boutons de batterie y sont posés : ils gardent leur barre de charge, leur PRÊT et leur refus à voix haute) et son amélioration.
// Un clic sur le bâtiment dans le champ le choisit aussi (main.js). Lecture seule de l'état : les ordres passent par les fonctions que main.js donne.
import { BATIMENTS, ORDRE_BATIMENTS, EQUIPEMENT } from '../data/batiments.js?v=0.93.0';
import { refusCamp, niveauDe, NIVEAU_MAX } from '../camp.js?v=0.93.0';

// les boutons de batterie que chaque bâtiment porte (ils sont créés par main.js et rangés dans #batteries, caché, tant qu'aucun bâtiment ne les réclame)
export const ORDRES_DE = { artillerie: ['75', '155', '220'], aerodrome: ['avion'], chars: ['char'], sapeurs: ['genie'], caserne: [] };
const ICONES = {          // une silhouette par bâtiment (un trait, comme les boutons de batterie)
  artillerie: '<path d="M3 20h8l2-4h11l3 4h4v3H3z"/><path d="M12 14l17-6 2 3-17 6z"/>',
  aerodrome: '<path d="M13 2h4v7h13v4H17v6h5v4H8v-4h5v-6H0V9h13z"/>',
  chars: '<path d="M3 20l3-4h22l6 4z"/><path d="M8 16V9h16l4 7z"/><rect x="26" y="11" width="9" height="2.5"/>',
  sapeurs: '<path d="M2 20h30v4H2z"/><path d="M5 20V8h4v12zM25 20V8h4v12z"/><path d="M3 5h28v4H3z"/>',
  caserne: '<path d="M2 22V12l15-8 15 8v10z"/><path d="M13 22v-7h8v7z"/>',
};
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

export function creerCampHud({ barre, papier, rangement, bouton, ameliorer, choisir, fermer }) {
  let cle = null, signature = '', dernier = null;
  const choixPris = {};      // le choix tenu pour chaque palier (clé + niveau visé) : 0, 1 ou rien
  const pastilles = new Map();
  const dotation = el('span', { className: 'camp-dotation', title: 'La dotation de l\'état-major : elle tombe à chaque aube (+1 ; +1 si nos lignes tiennent à 75 % ; +2 la première fois qu\'une ligne d\'en face est prise)' });
  barre.append(...ORDRE_BATIMENTS.map(k => {
    const b = el('button', { className: 'pastille', type: 'button' });
    b.dataset.cle = k;
    b.innerHTML = `<svg viewBox="0 0 36 26" aria-hidden="true">${ICONES[k]}</svg><b>${BATIMENTS[k].court}</b><i>0</i>`;
    b.onclick = () => choisir(cle === k ? null : k);
    pastilles.set(k, b); return b;
  }), dotation);

  // les boutons de batterie rentrent au dépôt (caché) quand le papier se ferme ou change de bâtiment
  const ranger = () => { for (const b of papier.querySelectorAll('.batterie')) rangement.append(b); };
  const ameliorerSans = () => { if (dernier) maj(dernier); };      // un choix qu'on vient de poser : le papier se redessine tout de suite
  function dessiner(B) {
    const e = B.etat, c = e.camp.batiments[cle], Bd = BATIMENTS[cle], niveau = c.niveau, N = Bd.niveaux;
    ranger(); papier.replaceChildren();
    const tete = el('div', { className: 'bat-tete' }, el('b', { textContent: `${Bd.nom}${niveau ? ` · niveau ${niveau}` : ' · à bâtir'}` }),
      el('button', { className: 'bat-ferme', type: 'button', textContent: '×', title: 'Fermer (Échap)', onclick: fermer }));
    const courant = niveau ? N[niveau - 1] : N[0];
    papier.append(tete, el('p', { className: 'discret', textContent: niveau ? `${courant.nom} : ${courant.effet}` : `À bâtir : ${courant.effet}` }));
    // ses ordres : les boutons de batterie, ou, pour la caserne, ce qu'elle fait
    const ordres = el('div', { className: 'bat-ordres' });
    for (const cal of ORDRES_DE[cle]) { const b = bouton(cal); if (b) ordres.append(b); }
    if (!ORDRES_DE[cle].length) ordres.append(el('p', { className: 'discret', textContent: `${e.reserves[0]} régiment${e.reserves[0] > 1 ? 's' : ''} frais en réserve : la relève se donne la nuit, depuis la carte du régiment à relever.${niveau >= EQUIPEMENT.niveauCaserne ? ` On y équipe aussi : casques, grenadiers, mitrailleuses ou brancardiers, un point chacun, par une corvée de la nuit (${EQUIPEMENT.places} pièces au plus par régiment).` : ''}` }));
    papier.append(ordres);
    // l'amélioration
    if (niveau >= NIVEAU_MAX) papier.append(el('p', { className: 'discret', textContent: 'Niveau maximal.' }));
    else if (c.chantier) papier.append(el('p', { className: 'bat-chantier', textContent: `Chantier : ${N[c.chantier.vers - 1].nom}, fini à l'aube${c.chantier.nuits > 1 ? ` (dans ${c.chantier.nuits} nuits)` : ''}.` }));
    else {
      const vers = niveau + 1, S = N[vers - 1];
      // un palier à choix (niveaux 2 et 3) : deux améliorations, une seule se prend ; le choix se garde tant que le bâtiment n'a pas changé de niveau
      if (S.choix) {
        const tenu = choixPris[`${cle}${vers}`] ?? null;
        papier.append(el('p', { className: 'discret', textContent: 'Une seule amélioration :' }),
          ...S.choix.map(([nom, effet], i) => el('button', { className: `bat-choix${tenu === i ? ' pris' : ''}`, type: 'button', textContent: `${tenu === i ? '● ' : '○ '}${nom} : ${effet}`, onclick: () => { choixPris[`${cle}${vers}`] = i; signature = ''; ameliorerSans(); } })));
      }
      const refus = refusCamp(e, cle, S.choix ? (choixPris[`${cle}${vers}`] ?? null) : null);
      const b = el('button', { className: `bat-ameliorer${refus ? ' muet' : ''}`, type: 'button', textContent: `${niveau ? 'Améliorer' : 'Bâtir'} : ${S.nom} (${S.cout} pt${S.cout > 1 ? 's' : ''})`, title: refus || S.effet, onclick: () => ameliorer(cle, S.choix ? (choixPris[`${cle}${vers}`] ?? null) : null) });
      b.setAttribute('aria-disabled', refus ? 'true' : 'false');
      papier.append(b);
    }
  }
  function maj(B) {
    dernier = B;
    const e = B.etat, camp = e.camp;
    if (!camp?.bride) { barre.hidden = true; papier.hidden = true; return; }
    barre.hidden = false;
    dotation.textContent = `Dotation ${camp.dotation}`;
    for (const [k, b] of pastilles) {
      const c = camp.batiments[k];
      b.classList.toggle('bati', c.niveau > 0); b.classList.toggle('chantier', !!c.chantier); b.classList.toggle('choisi', cle === k);
      b.setAttribute('aria-pressed', String(cle === k));
      b.querySelector('i').textContent = c.chantier ? '…' : c.niveau ? '★'.repeat(c.niveau) : '—';
      b.title = `${BATIMENTS[k].nom} : ${c.chantier ? 'en chantier' : c.niveau ? `niveau ${c.niveau}` : 'pas encore bâti'}`;
    }
    papier.hidden = !cle;
    if (!cle) { ranger(); signature = ''; return; }
    const c = camp.batiments[cle], s = [cle, c.niveau, c.chantier?.nuits ?? '', camp.dotation, e.reserves[0]].join('|');
    if (s !== signature) { signature = s; dessiner(B); }
  }
  return { maj, choisi: () => cle, choisirCle(k) { cle = k; signature = ''; if (!k) ranger(); } };
}
