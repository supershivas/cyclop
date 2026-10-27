// Le camp à l'écran (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md) : une rangée de cinq pastilles en bas à droite et, pour le bâtiment choisi, une fenêtre posée au-dessus de lui
// (v0.96.0 : « les options apparaissent au-dessus de chaque bâtiment au clic ; simplifier au maximum ») sur le modèle de la fenêtre d'un régiment (`.reg-ouvert` : le titre et son niveau, une ligne
// de ce qu'il fait, des boutons de même largeur). Les ordres (un bouton par batterie : son nom et son état, PRÊT, les secondes, « Niv. 2 ») et l'amélioration : un seul clic, le choix du palier EST le bouton
// (« Tir de réglage · 3 pts »). Le texte long est dans l'infobulle. Un clic sur le bâtiment dans le champ le choisit aussi (main.js). Lecture seule de l'état : les ordres passent par les fonctions que main.js donne.
import { BATIMENTS, ORDRE_BATIMENTS, EQUIPEMENT } from '../data/batiments.js?v=0.96.1';
import { refusCamp, niveauDe, campDe, NIVEAU_MAX } from '../camp.js?v=0.96.1';

// les ordres de batterie que chaque bâtiment porte, et leur nom court sur le bouton
export const ORDRES_DE = { artillerie: ['75', '155', '220'], aerodrome: ['avion'], chars: ['char'], sapeurs: ['genie'], caserne: [] };
const ICONES = {          // une silhouette par bâtiment (un trait, comme les boutons de batterie)
  artillerie: '<path d="M3 20h8l2-4h11l3 4h4v3H3z"/><path d="M12 14l17-6 2 3-17 6z"/>',
  aerodrome: '<path d="M13 2h4v7h13v4H17v6h5v4H8v-4h5v-6H0V9h13z"/>',
  chars: '<path d="M3 20l3-4h22l6 4z"/><path d="M8 16V9h16l4 7z"/><rect x="26" y="11" width="9" height="2.5"/>',
  sapeurs: '<path d="M2 20h30v4H2z"/><path d="M5 20V8h4v12zM25 20V8h4v12z"/><path d="M3 5h28v4H3z"/>',
  caserne: '<path d="M2 22V12l15-8 15 8v10z"/><path d="M13 22v-7h8v7z"/>',
};
const NOM_ORDRE = { '75': '75', '155': '155', '220': '220', avion: 'Avion', char: 'Char', genie: 'Génie' };
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// `etatOrdre(cal)` : { texte, titre, muet, vise } (main.js : la recharge, la flotte, le niveau qui manque) ; `ordre(cal)` : viser ; `ameliorer(cle, choix)` : l'ordre de chantier (il dit son refus lui-même)
export function creerCampHud({ moi = () => 0, barre, papier, etatOrdre, ordre, ameliorer, choisir }) {
  let cle = null, signature = '';
  const pastilles = new Map(), boutonsOrdre = new Map();
  const dotation = el('span', { className: 'camp-dotation', title: 'La dotation de l\'état-major : elle tombe à chaque aube (+1 ; +1 si nos lignes tiennent à 75 % ; +2 la première fois qu\'une ligne d\'en face est prise)' });
  barre.append(...ORDRE_BATIMENTS.map(k => {
    const b = el('button', { className: 'pastille', type: 'button' });
    b.dataset.cle = k;
    b.innerHTML = `<svg viewBox="0 0 36 26" aria-hidden="true">${ICONES[k]}</svg><b>${BATIMENTS[k].court}</b><i>0</i>`;
    b.onclick = () => choisir(cle === k ? null : k);
    pastilles.set(k, b); return b;
  }), dotation);

  const pts = n => `${n} pt${n > 1 ? 's' : ''}`;
  // la fenêtre : refaite quand le bâtiment, son niveau, son chantier ou la caisse changent ; les boutons d'ordre, eux, se mettent à jour sur place (`majOrdres`, tous les 0,25 s) pour garder le survol et le clic
  function dessiner(B) {
    const e = B.etat, c = campDe(e, moi()).batiments[cle], Bd = BATIMENTS[cle], niveau = c.niveau, N = Bd.niveaux;
    papier.replaceChildren(); boutonsOrdre.clear();
    papier.append(el('div', { className: 'tete' }, el('b', { textContent: Bd.nom }), el('span', { textContent: niveau ? `niveau ${niveau}` : 'à bâtir' })));
    const dit = c.chantier ? `Chantier : ${N[c.chantier.vers - 1].nom}, fini à l'aube${c.chantier.nuits > 1 ? ` (dans ${c.chantier.nuits} nuits)` : ''}.`
      : ORDRES_DE[cle].length ? N[Math.max(0, niveau - 1)].effet
      : `${e.reserves[moi()]} régiment${e.reserves[moi()] > 1 ? 's' : ''} frais en réserve. La relève${niveau >= EQUIPEMENT.niveauCaserne ? ' et l\'équipement se donnent' : ' se donne'} la nuit, depuis la carte du régiment.`;
    papier.append(el('div', { className: 'compte', textContent: dit }));
    // ses ordres : un bouton par batterie
    if (ORDRES_DE[cle].length) {
      const ordres = el('div', { className: 'actions' }); ordres.style.setProperty('--cols', ORDRES_DE[cle].length);
      for (const cal of ORDRES_DE[cle]) {
        const b = el('button', { type: 'button', onclick: () => ordre(cal) }); b.dataset.cal = cal;
        boutonsOrdre.set(cal, b); ordres.append(b);
      }
      papier.append(ordres);
    }
    // l'amélioration : un clic. Au niveau 1, « Bâtir » ; au palier à choix (2 et 3), deux boutons, un par amélioration ; rien au niveau maximal ni pendant un chantier
    if (niveau < NIVEAU_MAX && !c.chantier) {
      const vers = niveau + 1, S = N[vers - 1], options = S.choix ? S.choix.map(([nom, effet], i) => ({ nom, effet, i })) : [{ nom: niveau ? 'Améliorer' : 'Bâtir', effet: S.effet, i: null }];
      const ligne = el('div', { className: 'actions' }); ligne.style.setProperty('--cols', options.length);
      for (const o of options) {
        const refus = refusCamp(e, cle, o.i, moi());
        const b = el('button', { type: 'button', className: refus ? 'refus' : '', textContent: `${o.nom} · ${pts(S.cout)}`, title: `${S.nom} : ${o.effet}${refus ? ` (${refus})` : ''}`, onclick: () => ameliorer(cle, o.i) });
        b.setAttribute('aria-disabled', refus ? 'true' : 'false');
        ligne.append(b);
      }
      papier.append(ligne);
    }
    majOrdres(B);
  }
  function majOrdres() {
    for (const [cal, b] of boutonsOrdre) {
      const s = etatOrdre(cal), t = `${NOM_ORDRE[cal]} · ${s.texte}`;
      if (b.textContent !== t) b.textContent = t;
      b.title = s.titre ?? ''; b.classList.toggle('actif', !!s.vise); b.classList.toggle('refus', !!s.muet && !s.vise); b.setAttribute('aria-disabled', s.muet && !s.vise ? 'true' : 'false');
    }
  }
  function maj(B) {
    const e = B.etat, camp = campDe(e, moi());
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
    if (!cle) { signature = ''; return; }
    const c = camp.batiments[cle], s = [cle, c.niveau, c.chantier?.nuits ?? '', camp.dotation, e.reserves[moi()]].join('|');
    if (s !== signature) { signature = s; dessiner(B); } else majOrdres();
  }
  return { maj, choisi: () => cle, choisirCle(k) { cle = k; signature = ''; } };
}
