// Le sujet « Le papier de campagne » du labo (Jérôme, lot 4 de la campagne, v0.36.3) : ce que le joueur lit entre deux batailles. Il ne décide rien (« voir et valider ») : la règle de
// `reconstituer` a déjà versé les régiments dissous dans les autres et complété chacun de recrues ; le papier dit ce qui reste de la bataille qui finit, ce que sera chaque régiment
// (vétérans, recrues, expérience, qui le commande), d'où viennent les hommes ajoutés, et un seul geste : partir pour la suivante. Quatre façons de le dire, sur des données d'exemple
// qui passent par le vrai `passage` de campagne.js (un registre de dix régiments inspiré d'une bataille 1 jouée sans ordres, dont les deux derniers, décimés, sont mis à 8 et 11 hommes pour qu'une fusion se voie). Rien ici ne lit ni ne modifie une partie.
import { PALETTE as P } from './palette.js?v=0.98.3';
import { hash2 } from './lib/rng.js?v=0.98.3';
import { nouvelleCampagne, passage } from './campagne.js?v=0.98.3';
import { grade } from './identite.js?v=0.98.3';
import { SECTEURS } from './data/secteur.js?v=0.98.3';
import { MISSIONS } from './bataille.js?v=0.98.3';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.35 ui-monospace,monospace;';
const papier = (css, ...kids) => el('div', `background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};padding:12px 16px;${css}`, kids);
const discret = (...kids) => el('span', `color:${P.g}`, ...kids);
const sourd = (...kids) => el('span', `color:${P.r}`, ...kids);        // sur le fond noir de la maquette : la brume, pas la glaise (contraste)

// ─── les données d'exemple : le registre de la bataille 1, tel que le jeu le garde ───
const SURVIVANTS = [['Porphyre', 34, 2], ['Protogyne', 30, 0], ['Céruléen', 67, 3], ['Viride', 57, 1], ['Syzygie', 53, 0], ['Murmuration', 54, 4], ['Hapax', 62, 1], ['Sinople', 59, 0], ['Orpiment', 8, 0], ['Gneiss', 11, 1]];
function exemple() {
  let numero = 0;
  const regiments = SURVIVANTS.map(([nom, n, enRoute]) => ({
    nom, depart: 94, enRoute,
    survivants: Array.from({ length: n }, (_, k) => [numero++, grade(k + (nom.length % 4) * 2, 94), 0.04 + hash2(numero, 5, 11) * 0.5, Math.floor(hash2(numero, 7, 11) * 3)]),
  }));
  const c = { ...nouvelleCampagne(11), prochainNumero: 940, batailles: [{ n: 1, graine: 3, secteur: 'essai', mission: 'tenir', jours: 7, issue: { reussie: true, texte: 'Le secteur est tenu.' }, pertes: [151, 70], regiments }] };
  return passage(c);
}
const P1 = exemple();
const SUITE = `${SECTEURS[P1.secteur].nom} · ${P1.mission}`;

// ─── des morceaux communs ───
const chevrons = n => el('span', 'display:inline-flex;gap:2px;vertical-align:middle', ...Array.from({ length: 3 }, (_, k) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 12 8'); s.style.cssText = 'width:12px;height:8px;fill:none;stroke-width:2;stroke:' + (k < n ? P.t : P.g);
  s.innerHTML = '<polyline points="1,7 6,2 11,7"/>'; return s;
}));
// vétérans (plein), recrues (hachuré), tout sur la largeur d'un régiment complet
const barre = (r, { h = 8, fond = P.o, encre = P.t } = {}) => {
  const n = r.veterans + r.recrues;
  return el('span', `display:flex;height:${h}px;box-sizing:border-box;border:1px solid ${encre};background:${fond}`,
    el('i', `display:block;width:${r.veterans / n * 100}%;background:${encre}`),
    el('i', `display:block;width:${r.recrues / n * 100}%;background:repeating-linear-gradient(135deg,${encre} 0 2px,transparent 2px 4px)`));
};
// « le Viride », « l'Orpiment » ; `de` : « du Viride », « de l'Orpiment »
const voyelle = n => /^[AEIOUYÉ]/.test(n);
const le = (n, maj = false) => voyelle(n) ? `${maj ? 'L' : 'l'}'${n}` : `${maj ? 'Le' : 'le'} ${n}`;
const de = n => voyelle(n) ? `de l'${n}` : `du ${n}`;
const chef = r => !r.commandant ? 'recruté à neuf' : `${r.commandant.promu ? `${r.commandant.ancien} promu capitaine` : 'capitaine'} ${r.commandant.prenom} ${r.commandant.nom}`;
const bataille = p => `Bataille ${p.derniere.n} finie : ${SECTEURS[p.derniere.secteur].nom}, ${p.derniere.jours} jours. ${p.derniere.issue.texte}`;
const depart = (p, css = '', surNoir = false) => el('button', `${MONO}height:36px;padding:0 16px;color:${surNoir ? P.t : P.o};background:${surNoir ? P.o : P.t};border:2px solid ${P.o};cursor:pointer;${css}`, `Partir pour la bataille ${p.n} · ${SUITE} (Entrée)`);
const fusionsEnMots = p => p.fusions.map(f => `${f.hommes} ${f.hommes === 1 ? 'homme' : 'hommes'} ${de(f.de)} vers ${le(f.vers)}`);
const bilanHommes = p => `${p.regiments.reduce((t, r) => t + r.veterans, 0)} vétérans, ${p.regiments.reduce((t, r) => t + r.recrues, 0)} recrues`;

// A · le registre : un seul papier, une ligne par régiment, comme un registre de compagnie
function registre(boite) {
  const p = P1, ligne = r => el('div', 'display:grid;grid-template-columns:11ch 44px 120px 1fr;gap:12px;align-items:center;padding:3px 0;border-bottom:1px solid ' + P.g,
    el('b', 'font-weight:normal', r.nom), chevrons(r.chevrons), barre(r),
    el('span', '', chef(r), ' ', discret([r.fusionnes ? `· +${r.fusionnes} d'un autre régiment ` : '', r.enRoute ? `· ${r.enRoute} évacué${r.enRoute > 1 ? 's' : ''} de retour ` : ''].join(''))));
  boite.append(papier('max-width:min(860px,calc(100% - 16px));margin:16px auto;display:grid;gap:8px',
    el('div', `letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid ${P.g};padding-bottom:2px`, 'Entre deux batailles'),
    el('div', '', bataille(p)),
    el('div', '', discret(`Nos morts : ${p.derniere.pertes[0]}. Les leurs : ${p.derniere.pertes[1]}.`)),
    el('div', 'display:grid;gap:0', ...p.regiments.map(ligne)),
    p.fusions.length ? el('div', '', discret('Dissous : '), p.dissous.join(', '), discret(' — '), fusionsEnMots(p).join(' ; '), '.') : null,
    el('div', '', discret(`Au total ${bilanHommes(p)}. En face, ${p.forces[1]} hommes.`)),
    depart(p, 'justify-self:end')));
}

// B · les cartes en rangée : les cartes de régiment du jeu, au bas de l'écran ; les dissous restent à gauche, barrés, avec la flèche vers qui a reçu leurs hommes
function cartes(boite) {
  const p = P1, carte = r => el('div', `width:124px;display:grid;gap:3px;padding:4px 8px 8px;background:${P.o};color:${P.t};border-top:3px solid ${P.n};box-shadow:3px 3px 0 ${P.t};${MONO}font-size:12px`,
    el('div', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis', r.nom), chevrons(r.chevrons), barre(r),
    el('div', '', `${r.veterans} + ${r.recrues}`), el('div', `color:${P.g};min-height:2.7em`, r.fusionnes ? `← ${r.fusionnes} d'ailleurs` : '', r.fusionnes && r.enRoute ? el('br') : null, r.enRoute ? `${r.enRoute} de retour` : '', r.neuf ? 'recruté à neuf' : ''));
  const dissous = n => el('div', `width:124px;padding:4px 8px;border:2px dashed ${P.r};color:${P.r};${MONO}font-size:12px;text-decoration:line-through`, n);
  boite.append(el('div', 'display:grid;gap:16px;max-width:min(1100px,calc(100% - 16px));margin:16px auto',
    papier('display:grid;gap:4px', el('b', 'font-weight:normal', bataille(p)), discret(`${p.derniere.pertes[0]} des nôtres sont tombés, ${p.derniere.pertes[1]} en face. ${bilanHommes(p)} pour la suite.`)),
    el('div', 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start', ...p.regiments.map(carte)),
    p.dissous.length ? el('div', 'display:grid;gap:6px', discret('Dissous, leurs hommes ont rejoint les autres :'), el('div', 'display:flex;flex-wrap:wrap;gap:8px', ...p.dissous.map(dissous)), sourd(fusionsEnMots(p).join(' ; ') + '.')) : null,
    depart(p, 'justify-self:start', true)));
}

// C · la lettre : de l'état-major, en phrases ; pas un tableau, une lecture. Chaque régiment est une phrase, les fusions un paragraphe, aucun chiffre en gras
function lettre(boite) {
  const p = P1, phrase = r => r.neuf ? `${le(r.nom, true)} n'a plus un homme : on le recompose de ${r.recrues} recrues.`
    : `${le(r.nom, true)} garde ${r.veterans} hommes${r.chevrons ? ', des aguerris' : ''}${r.recrues ? `, ${r.recrues} recrues les rejoignent` : ''}${r.enRoute ? `, ${r.enRoute} évacué${r.enRoute > 1 ? 's reviennent' : ' revient'}` : ''}. ${r.commandant ? `Il sera commandé par ${r.commandant.promu ? `le ${r.commandant.ancien} ` : 'le capitaine '}${r.commandant.prenom} ${r.commandant.nom}.` : ''}`;
  boite.append(papier('max-width:min(62ch,calc(100% - 16px));margin:16px auto;display:grid;gap:12px;line-height:1.5;padding:24px 32px',
    el('div', `color:${P.g}`, `Après la bataille ${p.derniere.n}`),
    el('p', 'margin:0', `${p.derniere.issue.texte} ${p.derniere.jours} jours, ${p.derniere.pertes[0]} des nôtres sont tombés, ${p.derniere.pertes[1]} en face.`),
    p.dissous.length ? el('p', 'margin:0', `${p.dissous.length === 1 ? 'Un régiment est dissous' : `${p.dissous.length} régiments sont dissous`} : ${p.dissous.join(' et ')}. ${fusionsEnMots(p).join(' ; ')}.`) : null,
    ...p.regiments.map(r => el('p', 'margin:0', phrase(r))),
    el('p', 'margin:0', `On vous envoie à ${SECTEURS[P1.secteur].nom.toLowerCase()} : ${MISSIONS[p.mission].replace(/^./, c => c.toLowerCase())}`),
    depart(p, 'justify-self:start')));
}

// D · sur la carte : les régiments aux places qu'ils prendront (deux lignes de quatre), les dissous en dessous, une flèche vers qui a reçu leurs hommes ; un papier à côté dit celui qu'on survole
function surLaCarte(boite) {
  const p = P1, W = 640, H = 300, pos = (k) => [70 + (k % 4) * 160, 70 + Math.floor(k / 4) * 90];
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.cssText = `width:100%;max-width:${W}px;background:${P.s};outline:2px solid ${P.t}`;
  const n = (nom, attrs, texte) => { const e = document.createElementNS(NS, nom); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (texte) e.textContent = texte; return e; };
  const fiche = papier('min-width:26ch;display:grid;gap:4px;align-content:start', el('b', 'font-weight:normal', 'Survolez un régiment'));
  const montrer = r => { fiche.replaceChildren(el('b', 'font-weight:normal', r.nom), chevrons(r.chevrons), barre(r), el('div', '', `${r.veterans} vétérans, ${r.recrues} recrues`), el('div', '', chef(r)), r.fusionnes ? discret(`+${r.fusionnes} d'un régiment dissous`) : null, r.enRoute ? discret(`${r.enRoute} évacués de retour`) : null); };
  const place = new Map(), dissousPos = new Map(p.dissous.map((d, i) => [d, [110 + i * 120, 255]]));
  p.regiments.forEach((r, k) => place.set(r.nom, pos(k)));
  svg.append(n('text', { x: 12, y: 20, fill: P.r, 'font-size': 12, 'font-family': 'monospace' }, 'Leurs lignes'), n('line', { x1: 0, x2: W, y1: 28, y2: 28, stroke: P.x, 'stroke-dasharray': '4 4' }));
  for (const f of p.fusions) { const a = dissousPos.get(f.de), b = place.get(f.vers); if (a && b) svg.append(n('line', { x1: a[0], y1: a[1] - 14, x2: b[0], y2: b[1] + 16, stroke: P.o, 'stroke-width': Math.min(5, 1 + f.hommes / 3), 'stroke-dasharray': '3 3', opacity: 0.8 })); }
  for (const [d, [x, y]] of dissousPos) { svg.append(n('circle', { cx: x, cy: y, r: 14, fill: 'none', stroke: P.r, 'stroke-dasharray': '3 3' }), n('text', { x, y: y + 30, fill: P.r, 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'monospace' }, d)); }
  p.regiments.forEach((r, k) => {
    const [x, y] = pos(k), g = n('g', { style: 'cursor:pointer' });
    g.append(n('circle', { cx: x, cy: y, r: 18, fill: P.n, stroke: P.t, 'stroke-width': 3 }), n('text', { x, y: y + 5, fill: P.t, 'font-size': 14, 'text-anchor': 'middle', 'font-family': 'monospace' }, String(k + 1)),
      n('text', { x, y: y + 34, fill: P.o, 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'monospace' }, r.nom));
    g.append(n('path', { d: `M${x - 18} ${y + 2} A18 18 0 0 1 ${x + 18} ${y + 2}`, fill: 'none', stroke: P.o, 'stroke-width': 2, opacity: r.chevrons / 3 }));
    g.onmouseenter = () => montrer(r); g.onclick = () => montrer(r);
    svg.append(g);
  });
  boite.append(el('div', 'display:grid;gap:12px;max-width:min(1000px,calc(100% - 16px));margin:16px auto',
    papier('', bataille(p)), el('div', 'display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start', svg, fiche), el('div', '', sourd(fusionsEnMots(p).join(' ; ') + '.')), depart(p, 'justify-self:start', true)));
}

export function maquetteCampagne(stage, nom) {
  const f = { registre, cartes, lettre, surLaCarte }[nom];
  const boite = el('div', `position:relative;width:100%;min-height:min(70vh,560px);background:${P.t};overflow:auto;padding:8px 0`);
  f(boite);
  stage.append(boite, el('p', `${MONO}color:${P.g}`, 'Données d\'exemple, passées par le vrai `passage` de campagne.js : dix régiments inspirés d\'une première bataille jouée sans ordres, les deux derniers décimés (8 et 11 hommes) pour qu\'une fusion se voie. Rien n\'est branché au jeu.'));
}
