// Nos chars sur le champ et leur fiche (Jérôme, v0.81.0 : « les chars lancent des obus, avec une barre qui charge et une cible, lors de leur déplacement ; on peut leur donner d'autres ordres à la volée »).
// Sur le champ : au-dessus de chaque char à nous, une petite étiquette (sa barre de canon qui se remplit, puis PRÊT ; ses points de vie) ; de lui à sa cible, une ligne pointillée et une croix
// (de la cible qu'on lui a donnée : trait plein ; du carré d'ennemis qu'il a choisi : pointillé). Un clic sur l'étiquette le choisit. La fiche (`#char-fiche`) du char choisi : ses barres,
// « Marcher » / « Cible » (le prochain clic sur le sol), « Arrêt », « Tir libre », « Fermer ». Le dessin et les boutons seulement : les ordres partent par `surOrdre(ordre)` (main.js).
import { CHARS } from '../data/chars.js?v=0.158.0';
import { NOUS } from '../bataille.js?v=0.158.0';
import { chevronsDe, bonusEnMots } from '../data/experience.js?v=0.158.0';
import { jauge as jaugeT, partage, bande } from './tuiles.js?v=0.158.0';
import { el, cle, rang, bloc, chevrons as chevronsF, poserEcusson, poserTampon } from './fiche-cadre.js?v=0.158.0';
import { reinitIds } from './bilan.js?v=0.158.0';
import { REPERES } from './barres.js?v=0.158.0';

const REDUIT = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const chevronsTexte = n => '▲'.repeat(n);
export function creerCharsHud({ $, bataille, moi = () => NOUS, versEcran, hauteurSol, choisir, surBouton, pastilles }) {
  const svg = $('chars-cibles');
  let signature = '', tuilesVues = '';
  const fraction = (B, c) => Math.max(0, Math.min(1, (B.etat.temps - (c.canonT ?? 0)) / CHARS[c.modele].canon.recharge));
  const secondes = (B, c) => Math.max(0, Math.ceil(CHARS[c.modele].canon.recharge - (B.etat.temps - (c.canonT ?? 0))));
  $('char-fiche').onclick = e => { const b = e.target.closest('[data-char]'); if (b) surBouton(b.dataset.char); };

  // appelé à chaque image : les étiquettes, les cibles, la fiche du char choisi
  function maj(choisi, mode, suivi = null) {
    const B = bataille();
    if (!B) return;
    const M = moi(), vivants = B.etat.chars.filter(c => c.camp === M && c.etat !== 'detruit');
    // les pastilles (v0.120.0 : une par char des deux camps, `hud/pastilles.js`) ; l'infobulle dit tout
    for (const c of B.etat.chars) {
      const mien = c.camp === M, detruit = c.etat === 'detruit', G = CHARS[c.modele].canon, vie = Math.max(0, c.pv / (c.pvMax ?? CHARS[c.modele].pv));
      const [sx, sy] = versEcran(c.x, c.y, hauteurSol(c.x, c.y) + 3.5), etat = detruit ? 'détruit' : c.etat === 'enlise' ? 'enlisé' : c.etat === 'arrive' ? 'à l\'arrêt' : 'en marche';
      const f = fraction(B, c), nb = chevronsDe(c.exp ?? 0);
      const lignes = [`# ${mien ? CHARS[c.modele].nom : 'Char ennemi'}`, `## ${etat}`, `Coque : **${Math.round(vie * 100)} %** (${Math.max(0, Math.round(c.pv))} / ${c.pvMax ?? CHARS[c.modele].pv})`];
      if (!detruit) lignes.push(`Canon de ${G.calibre} : ${f >= 1 ? (c.vise ? 'PRÊT' : 'chargé') : `${secondes(B, c)} s`}, portée ${G.portee} m`);
      if (mien) {
        if (!detruit) lignes.push(`Expérience : ${nb ? chevronsTexte(nb) : 'novice'} (${Math.round((c.exp ?? 0) * 100)} %) · ${bonusEnMots('char', nb)}`);
        lignes.push(`Victimes : **${c.tues ?? 0}** (canon ${c.tuesCanon ?? 0}, mitrailleuses ${c.tuesMitr ?? 0}) · réparations : ${c.repar ?? 0} · obus tirés : ${c.obus ?? 0}`, detruit ? 'Un char détruit ne se répare pas.' : 'Un clic : le choisir et lui donner des ordres.');
      }
      pastilles.poser(`c${c.id}`, { type: 'char', camp: mien ? 'nous' : 'eux', sx, sy, vie, detruit, choisi: mien && choisi === c.id, info: lignes.join('\n'), chevrons: mien ? nb : undefined, onclick: mien && !detruit ? () => choisir(c.id) : null });
    }
    // les cibles : un SVG de la taille de l'écran
    const cv = $('canvas'), w = cv.clientWidth, h = cv.clientHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    const parts = [];
    for (const c of vivants) {
      if (!c.vise) continue;
      const [x1, y1] = versEcran(c.x, c.y, hauteurSol(c.x, c.y) + 1.5), [x2, y2] = versEcran(c.vise[0], c.vise[1]);
      if (x1 < -1e4 || x2 < -1e4) continue;
      const manuel = c.cible && c.vise === c.cible, cl = `${manuel ? 'manuelle' : 'auto'}${choisi === c.id ? ' choisie' : ''}`;
      parts.push(`<g class="${cl}"><line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"/><path d="M${(x2 - 7).toFixed(0)} ${y2.toFixed(0)}h14M${x2.toFixed(0)} ${(y2 - 7).toFixed(0)}v14"/><circle cx="${x2.toFixed(0)}" cy="${y2.toFixed(0)}" r="5"/></g>`);
    }
    // la cible donnée mais hors de portée : une croix seule, sur le sol
    for (const c of vivants) if (c.cible && c.vise !== c.cible) { const [x2, y2] = versEcran(c.cible[0], c.cible[1]); if (x2 > -1e4) parts.push(`<g class="manuelle loin"><path d="M${(x2 - 7).toFixed(0)} ${y2.toFixed(0)}h14M${x2.toFixed(0)} ${(y2 - 7).toFixed(0)}v14"/></g>`); }
    const sig = parts.join('');
    if (sig !== signature) { signature = sig; svg.innerHTML = sig; }
    // la fiche
    const c = vivants.find(k => k.id === choisi), fiche = $('char-fiche');
    fiche.hidden = !c;
    if (!c) return;
    const f = fraction(B, c), G = CHARS[c.modele].canon, vie = Math.max(0, Math.round(c.pv / (c.pvMax ?? CHARS[c.modele].pv) * 100));
    const roule = c.etat === 'avance' && c.ar !== undefined && (c.camp === 0 ? c.y > c.ar : c.y < c.ar), reste = Math.round(Math.hypot(c.tx - c.x, c.ty - c.y));
    const nbc = chevronsDe(c.exp ?? 0), nTues = c.tues ?? 0, attente = f >= 1 && !c.vise, canonMot = attente ? 'chargé' : f >= 1 ? 'PRÊT' : `${secondes(B, c)} s`;
    $('char-fiche-titre').textContent = CHARS[c.modele].nom;
    $('char-fiche-qui').textContent = `Char d'assaut · au front depuis le ${c.jour === 1 ? '1er' : `${c.jour ?? '?'}e`} jour`;
    poserTampon($('char-fiche-etat-court'), c.etat === 'enlise' ? 'Enlisé' : c.etat === 'arrive' ? 'À l\'arrêt' : roule ? 'Sort du parc' : 'En marche', c.etat === 'enlise' ? 'orange' : '');
    poserEcusson($('char-fiche-ec'), 'char', { debout: vie / 100, chev: nbc });
    // l'ordre en cours : où il va, ce que son canon vise (v0.99.10 ; la fiche d'avant ne le disait pas)
    $('char-fiche-ordre').textContent = c.etat === 'enlise' ? 'Enlisé dans un trou ou dans l\'eau : il ne repart pas, il tire encore.'
      : c.etat === 'arrive' ? 'À l\'arrêt : il tient sa position et tire.'
      : roule ? `Roule vers l'arrière de nos lignes, puis vers son objectif (${reste} m).`
      : `Marche vers son objectif : encore ${reste} m.`;
    { const sv = suivi && suivi.genre === 'char' && suivi.id === c.id ? suivi.mode : null; $('char-fiche-vue').setAttribute('aria-pressed', sv === 'cinema'); $('char-fiche-personne').setAttribute('aria-pressed', sv === 'personne'); }
    // ses chiffres (la charpente des fiches, v0.153.0) : la coque, le canon, ses victimes, ses obus ; son parcours : les victimes par arme, l'expérience ; refaits quand une valeur change (le canon : chaque seconde)
    const sigFiche = [c.id, vie, canonMot, c.vise ? (c.cible && c.vise === c.cible ? 1 : 2) : 0, Math.round((c.exp ?? 0) * 100), nTues, c.tuesCanon ?? 0, c.tuesMitr ?? 0, c.repar ?? 0, c.obus ?? 0].join(':');
    if (sigFiche !== tuilesVues) {
      tuilesVues = sigFiche; reinitIds();
      const tc = c.tuesCanon ?? 0, tm = c.tuesMitr ?? 0, max = Math.max(1, tc, tm);
      $('char-fiche-cles').replaceChildren(
        cle(vie, '%', `coque · ${c.repar ? `${c.repar} réparation${c.repar > 1 ? 's' : ''}` : 'jamais réparé'}`, jaugeT(vie / 100, { reperes: [0.25, 0.5], larg: 100, haut: 8 })),
        cle(canonMot, '', `canon de ${G.calibre} · ${c.vise ? (c.cible && c.vise === c.cible ? 'la cible donnée' : 'le carré le plus chargé') : 'rien à portée'}`, jaugeT(f, { larg: 100, haut: 8 }), `# Canon de ${G.calibre}\nUn obus | tous les ${G.recharge} s\nPortée | ${G.portee} m`),
        cle(nTues, nTues > 1 ? 'hommes' : 'homme', nTues ? `tués · ${tc} au canon, ${tm} aux mitr.` : 'aucune victime encore', nTues ? partage(tc, tm, { max: nTues, larg: 100, haut: 8 }) : ''),
        cle(c.obus ?? 0, 'obus', 'tirés'));
      $('char-fiche-tuiles').replaceChildren(
        bloc('Victimes', [rang('Canon', partage(tc, 0, { max, larg: 140 }), String(tc)), rang('Mitr.', partage(0, tm, { max, larg: 140 }), String(tm))], '# Victimes\nLes hommes qu\'il a abattus | du canon, des mitrailleuses'),
        bloc('Expérience', [rang('', jaugeT(c.exp ?? 0, { reperes: REPERES.exp }), ''), el('p', 'fx-note', chevronsF(nbc), ` ${nbc ? bonusEnMots('char', nbc) : 'novice · aucun bonus'}`)]));
    }
    const ab = c.pv < (c.pvMax ?? c.pv), rep = $('char-fiche-reparer');      // v0.130.0 : le génie répare à la base ; ce bouton ramène le char au parc
    if (rep) {
      const g = B.etat.genies.some(k => k.char === c.id || k.parc === c.id), imp = g || c.etat === 'enlise' || !B.etat.camp?.bride;
      rep.textContent = c.rentre ? 'Il rentre au parc…' : 'Rentrer au parc';
      rep.setAttribute('aria-disabled', imp || c.rentre ? 'true' : 'false');
      rep.dataset.info = `# Rentrer au parc\nLe char regagne le parc à chars : il y reste avec ses dégâts, le génie peut l'y réparer (un clic sur lui, ou « Réparer » dans la fenêtre du parc), puis il ressort sur un ordre de la batterie Char. ${c.etat === 'enlise' ? '**Enlisé : il ne repart pas.**' : !ab ? 'Il n\'est pas abîmé, mais peut rentrer quand même.' : ''}`;
    }
    for (const b of fiche.querySelectorAll('.fx-o[data-char]')) b.setAttribute('aria-pressed', String(b.dataset.char === mode));
  }
  function oublier() { signature = ''; svg.innerHTML = ''; }
  return { maj, oublier };
}
