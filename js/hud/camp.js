// Le camp à l'écran (Jérôme, v0.87.0 ; lot 2 de docs/chantiers/camp-et-ameliorations.md). Les ordres de batterie ont leurs boutons permanents en bas à droite (main.js, `#batteries` : v0.97.0, « idem pour avion, chars et
// sapeurs ») ; ici, la fenêtre d'un bâtiment, posée au-dessus de lui quand on le choisit (v0.96.0 : « les options apparaissent au-dessus de chaque bâtiment au clic ; simplifier au maximum »), sur le modèle de la
// fenêtre d'un régiment (`.reg-ouvert` : le titre et son niveau, une ligne de ce qu'il fait, des boutons de même largeur), et le bouton « Le camp » (la dotation, et la touche B). L'amélioration tient en un clic : le
// choix du palier EST le bouton (« Tir de réglage · 3 pts »). Le texte long est dans l'infobulle. Lecture seule de l'état : les ordres passent par les fonctions que main.js donne.
import { BATIMENTS, EQUIPEMENT } from '../data/batiments.js?v=0.99.3';
import { refusCamp, campDe, NIVEAU_MAX } from '../camp.js?v=0.99.3';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

// `bouton` : le bouton « Le camp » ; `aller()` : la caméra au camp (la touche B) ; `ameliorer(cle, choix)` : l'ordre de chantier (il dit son refus lui-même)
export function creerCampHud({ moi = () => 0, bouton, papier, aller, ameliorer }) {
  let cle = null, signature = '';
  bouton.onclick = () => aller();
  const pts = n => `${n} pt${n > 1 ? 's' : ''}`;
  // la fenêtre : refaite quand le bâtiment, son niveau, son chantier ou la caisse changent
  function dessiner(B) {
    const e = B.etat, c = campDe(e, moi()).batiments[cle], Bd = BATIMENTS[cle], niveau = c.niveau, N = Bd.niveaux;
    papier.replaceChildren();
    papier.append(el('div', { className: 'tete' }, el('b', { textContent: Bd.nom }), el('span', { textContent: niveau ? `niveau ${niveau}` : 'à bâtir' })));
    const dit = c.chantier ? `Chantier : ${N[c.chantier.vers - 1].nom}, fini à l'aube${c.chantier.nuits > 1 ? ` (dans ${c.chantier.nuits} nuits)` : ''}.`
      : cle !== 'caserne' ? N[Math.max(0, niveau - 1)].effet
      : `${e.reserves[moi()]} régiment${e.reserves[moi()] > 1 ? 's' : ''} frais en réserve. La relève${niveau >= EQUIPEMENT.niveauCaserne ? " et l'équipement se donnent" : ' se donne'} la nuit, depuis la carte du régiment.`;
    papier.append(el('div', { className: 'compte', textContent: dit }));
    // l'amélioration : un clic. Au niveau 1, « Bâtir » ; au palier à choix (2 et 3), deux boutons, un par amélioration ; rien au niveau maximal ni pendant un chantier
    if (niveau < NIVEAU_MAX && !c.chantier) {
      const vers = niveau + 1, S = N[vers - 1], options = S.choix ? S.choix.map(([nom, effet], i) => ({ nom, effet, i })) : [{ nom: niveau ? 'Améliorer' : 'Bâtir', effet: S.effet, i: null }];
      const ligne = el('div', { className: 'actions' }); ligne.style.setProperty('--cols', options.length);
      for (const o of options) {
        const refus = refusCamp(e, cle, o.i, moi());
        const b = el('button', { type: 'button', className: refus ? 'refus' : '', textContent: `${o.nom} · ${pts(S.cout)}`, onclick: () => ameliorer(cle, o.i) });
        b.dataset.info = `# ${o.nom}\n## ${S.nom} · niveau ${niveau + 1} · ${pts(S.cout)}\n${o.effet}${refus ? `\n**${refus}**` : ''}`;
        b.setAttribute('aria-disabled', refus ? 'true' : 'false');
        ligne.append(b);
      }
      papier.append(ligne);
    }
  }
  function maj(B) {
    const e = B.etat, camp = campDe(e, moi());
    if (!camp?.bride) { bouton.hidden = true; papier.hidden = true; return; }
    bouton.hidden = false;
    const enChantier = Object.values(camp.batiments).filter(c => c.chantier).length;
    bouton.textContent = `Le camp · ${pts(camp.dotation)}${enChantier ? ` · ${enChantier} chantier${enChantier > 1 ? 's' : ''}` : ''}`;
    bouton.title = `# Le camp (B)\nLa caméra y va. Un bâtiment se choisit d'un clic sur lui : on y dépense la dotation.\n## La dotation (${pts(camp.dotation)})\nElle tombe à l'aube : **+1** ; **+1** si nos lignes tiennent à 75 % ; **+2** la première fois qu'une ligne d'en face est prise.`;
    papier.hidden = !cle;
    if (!cle) { signature = ''; return; }
    const c = camp.batiments[cle], s = [cle, c.niveau, c.chantier?.nuits ?? '', camp.dotation, e.reserves[moi()]].join('|');
    if (s !== signature) { signature = s; dessiner(B); }
  }
  return { maj, choisi: () => cle, choisirCle(k) { cle = k; signature = ''; } };
}
