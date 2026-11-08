// Le sujet « Les données : les fiches » du labo (Jérôme, 7 nov. : « revoir la présentation des statistiques de chaque catégorie d'unité : soldats, régiments, chars, mitrailleuses » ; le tableau de bord (B) du bilan du soir est retenu : une tuile = un titre, un chiffre, un graphique).
// Chaque fiche est une liste de BLOCS (`blocs…`) : { titre, chiffre?, graphe (HTML), mot? } ; trois mises en page les montrent : A les tuiles (larges), B le profil (une rangée par bloc), C la compacte (la largeur d'une fenêtre du jeu, 300 px).
// Mêmes règles que le bilan : palette seule, la forme porte l'information (plein / hachuré / contour), l'orange et le rouge ne confirment que le moral. Données d'exemple de la forme de l'état (`A.peur`, `c.tues`, `n.rafales`…) ; rien n'est dans le jeu.
import { PALETTE as P, ALERTES } from './palette.js?v=0.129.1';
import { GRAPHES } from './labo-donnees.js?v=0.129.1';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.4 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace;';
const html = (css, h) => { const d = el('div', css); d.innerHTML = h; return d; };
let uid = 0;
const pct = v => `${Math.round(v * 100)} %`;

// ─── Quelques graphiques de plus (les mêmes règles) ───
const G2 = {
  // une jauge horizontale : le plein est le niveau, des repères aux seuils des mots ; `alerte` : couleur d'alerte du niveau (le moral seulement)
  jauge(v, { reperes = [], larg = 200, haut = 10, couleur = P.o } = {}) {
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="${pct(v)}" style="display:block;max-width:100%"><rect x="0.5" y="0.5" width="${larg - 1}" height="${haut - 1}" fill="none" stroke="${P.g}"/><rect x="1" y="1" width="${Math.max(0, (larg - 2) * Math.min(1, v))}" height="${haut - 2}" fill="${couleur}"/>${reperes.map(r => `<line x1="${larg * r}" x2="${larg * r}" y1="0" y2="${haut}" stroke="${P.t}" stroke-width="2"/><line x1="${larg * r}" x2="${larg * r}" y1="0" y2="${haut}" stroke="${P.r}"/>`).join('')}</svg>`;
  },
  // une caractéristique : le trait, une encoche à sa valeur de départ, une flèche dit le chemin fait
  carac(v, base, { larg = 200, haut = 12, couleur = P.o } = {}) {
    const d = v - base;
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="${v} sur 100 (départ ${base})" style="display:block;max-width:100%"><rect x="0.5" y="2.5" width="${larg - 1}" height="${haut - 5}" fill="none" stroke="${P.g}"/><rect x="1" y="3" width="${(larg - 2) * v / 100}" height="${haut - 6}" fill="${couleur}"/><path d="M${larg * base / 100} 0v${haut}" stroke="${P.t}" stroke-width="3"/><path d="M${larg * base / 100} 0v${haut}" stroke="${P.n}" stroke-width="1.5"/>${Math.abs(d) >= 3 ? `<text x="${larg - 2}" y="${haut - 2}" fill="${P.o}" font-size="11" text-anchor="end" font-family="monospace">${d > 0 ? '↑' : '↓'}</text>` : ''}</svg>`;
  },
  // les chevrons : un par palier gagné (0 à 3)
  chevrons(n, couleur = P.o) { return `<svg viewBox="0 0 ${12 * 3} 12" width="${12 * 3}" height="12" role="img" aria-label="${n} chevron${n > 1 ? 's' : ''}">${[0, 1, 2].map(k => `<path d="M${k * 12 + 1} 9l5-6 5 6" fill="none" stroke="${k < n ? couleur : P.g}" stroke-width="2" ${k < n ? '' : 'stroke-dasharray="2 2"'}/>`).join('')}</svg>`; },
  // le corps : six parties ; la blessée est hachurée et barrée (la forme dit la blessure, pas la couleur)
  corps(partie, c = 0, { haut = 96 } = {}) {
    const id = `hc${++uid}`, col = [P.n, P.x][c];
    const pieces = { tete: '<rect x="16" y="2" width="12" height="12"/>', tronc: '<rect x="12" y="16" width="20" height="26"/>', bg: '<rect x="3" y="16" width="7" height="26"/>', bd: '<rect x="34" y="16" width="7" height="26"/>', jg: '<rect x="12" y="44" width="9" height="30"/>', jd: '<rect x="23" y="44" width="9" height="30"/>' };
    return `<svg viewBox="0 0 44 76" width="${haut * 44 / 76}" height="${haut}" role="img" aria-label="${partie ? `blessé : ${partie}` : 'indemne'}"><defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${P.t}"/><rect width="2" height="4" fill="${P.o}"/></pattern></defs>` +
      Object.entries(pieces).map(([k, r]) => r.replace('/>', ` fill="${k === partie ? `url(#${id})` : col}" stroke="${P.t}" stroke-width="1"/>`)).join('') + '</svg>';
  },
  // l'historique d'un régiment : l'effectif (plein, bleu) et le moral (tirets) soir après soir, le dernier point cerclé ; l'effectif est ramené à son départ, le moral à 0-1
  fil(hist, initial, { larg = 220, haut = 70, total = hist.length } = {}) {
    const dx = larg / Math.max(1, total - 1 || 1), y = v => 4 + (1 - v) * (haut - 8), x = k => total > 1 ? 6 + k * (larg - 12) / (total - 1) : larg / 2;
    const ligne = (vals, dash, c) => `<polyline points="${vals.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="2" ${dash ? 'stroke-dasharray="4 3"' : ''}/>`;
    const eff = hist.map(h => Math.min(1, h.vivants / initial)), mor = hist.map(h => h.moral), dernier = hist.length - 1;
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="Effectif et moral, jour après jour" style="display:block;max-width:100%"><line x1="0" x2="${larg}" y1="${y(0.5)}" y2="${y(0.5)}" stroke="${P.b}"/>${ligne(eff, false, P.n)}${ligne(mor, true, P.r)}` +
      hist.map((h, k) => `<circle cx="${x(k).toFixed(1)}" cy="${y(eff[k]).toFixed(1)}" r="${k === dernier ? 4.5 : 2}" fill="${k === dernier ? P.t : P.n}" stroke="${P.n}" stroke-width="2"><title>Jour ${h.jour} : ${h.vivants} hommes, moral ${Math.round(h.moral * 100)} %</title></circle>`).join('') + '</svg>';
  },
  // une valeur partagée en deux (victimes : canon / mitrailleuses) : un plein, un hachuré, sur une échelle commune
  partage(a, b, { max = a + b || 1, larg = 200, haut = 12, couleur = P.n } = {}) {
    const id = `hp${++uid}`, k = larg / max;
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="${a} et ${b}" style="display:block;max-width:100%"><defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${P.t}"/><rect width="2" height="4" fill="${couleur}"/></pattern></defs><rect x="0" y="1" width="${a * k}" height="${haut - 2}" fill="${couleur}"/><rect x="${a * k}" y="1" width="${b * k}" height="${haut - 2}" fill="url(#${id})" stroke="${couleur}"/></svg>`;
  },
  // la charge du canon : un plein qui monte ; PRÊT quand il est plein (un trait plus épais)
  charge(f, { larg = 200, haut = 12 } = {}) { return G2.jauge(f, { larg, haut, couleur: f >= 1 ? P.o : P.r }); },
  // une pile de cartouches : une case par tranche de 10 (la bande d'une mitrailleuse)
  bande(n, max, { larg = 200, haut = 12 } = {}) {
    const cases = Math.ceil(max / 10), w = larg / cases;
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="${n} munitions sur ${max}" style="display:block;max-width:100%">${Array.from({ length: cases }, (_, k) => `<rect x="${(k * w + 1).toFixed(1)}" y="1" width="${(w - 2).toFixed(1)}" height="${haut - 2}" fill="${k * 10 < n ? P.o : 'none'}" stroke="${P.g}"/>`).join('')}</svg>`;
  },
};

// ─── Les blocs de chaque fiche (la même donnée, trois mises en page) ───
const bloc = (titre, { chiffre, unite, graphes = [], mot, aide } = {}) => ({ titre, chiffre, unite, graphes, mot, aide });
const SOLDAT = { prenom: 'Lucien', nom: 'Marchal', grade: 'caporal', age: 24, regiment: 'Céruléen', numero: 3, peur: 0.46, fatJ: 0.62, fatB: 0.21, exp: 0.31, chevrons: 2, caracs: [58, 44, 63, 37], bases: [52, 47, 55, 50], victimes: 3, blesse: 'bg', depuis: 2, jour: 6, action: 'Se terre sous le feu', suivant: 'sergent' };
const CARAC_NOMS = ['Tir', 'Force', 'Endurance', 'Calme'];
const mots = { peur: v => v < 0.25 ? 'serein' : v < 0.5 ? 'tendu' : v < 0.75 ? 'effrayé' : 'terrorisé', fat: v => v < 0.25 ? 'frais' : v < 0.5 ? 'las' : v < 0.75 ? 'épuisé' : 'à bout', carac: v => v < 25 ? 'faible' : v < 45 ? 'médiocre' : v < 60 ? 'moyen' : v < 80 ? 'bon' : 'excellent' };
export function blocsSoldat(s = SOLDAT) {
  return [
    bloc('Ce qu\'il endure', { graphes: [['Peur', G2.jauge(s.peur, { reperes: [0.25, 0.5, 0.75] }), mots.peur(s.peur)], ['Jambes', G2.jauge(s.fatJ, { reperes: [0.25, 0.5, 0.75] }), mots.fat(s.fatJ)], ['Bras', G2.jauge(s.fatB, { reperes: [0.25, 0.5, 0.75] }), mots.fat(s.fatB)]] }),
    bloc('Ses caractéristiques', { graphes: CARAC_NOMS.map((n, q) => [n, G2.carac(s.caracs[q], s.bases[q]), `${s.caracs[q]} · ${mots.carac(s.caracs[q])}`]), aide: 'L\'encoche bleue : sa valeur au début de la bataille ; ↑ ↓ : trois points ou plus de chemin fait.' }),
    bloc('Son corps', { graphes: [['', G2.corps(s.blesse), s.blesse ? 'Blessé au bras gauche' : 'Indemne']] }),
    bloc('Au front', { chiffre: s.jour - s.depuis + 1, unite: 'jours', mot: `depuis le jour ${s.depuis}` }),
    bloc('A abattu', { chiffre: s.victimes, unite: s.victimes > 1 ? 'hommes' : 'homme', mot: s.suivant ? `Prochain grade : ${s.suivant}` : '' }),
    bloc('Expérience', { graphes: [['', G2.jauge(s.exp, { reperes: [0.08, 0.25, 0.6] }), '']], chiffre: null, mot: 'aguerri', chevrons: s.chevrons }),
  ];
}
const REG = { numero: 3, nom: 'Céruléen', initial: 94, debout: 58, blesses: 14, evacues: 6, morts: 16, mortsJour: 7, moral: 0.41, niveau: 'ebranle', vivres: 2, vivresMax: 4, peur: 0.52, fatJ: 0.48, fatB: 0.33, exp: 0.27, chevrons: 2, tues: 11, pris: 2, ordre: 'Tient B1' };
const histoREG = Array.from({ length: 6 }, (_, k) => ({ jour: k + 1, vivants: [94, 91, 84, 76, 68, 58 + 14][k], blesses: [0, 3, 6, 9, 11, 14][k], morts: [0, 2, 6, 10, 13, 16][k], moral: [1, 0.96, 0.82, 0.68, 0.55, 0.41][k] }));
REG.historique = histoREG;
export function blocsRegiment(r = REG) {
  const col = r.niveau === 'deroute' ? ALERTES.rouge : r.niveau === 'ebranle' ? ALERTES.orange : P.o;
  return [
    bloc('Effectifs', { chiffre: r.debout, unite: `debout sur ${r.initial}`, graphes: [['', GRAPHES.barreEffectif(r, 0, { larg: 200, haut: 14 }), '']], mot: `${r.blesses} blessés · ${r.evacues} évacués · ${r.morts} morts` }),
    bloc('Moral', { chiffre: pct(r.moral), mot: (r.niveau === 'deroute' ? 'En déroute' : r.niveau === 'ebranle' ? 'Ébranlé' : 'Tient') + ' · repères : déroute, ébranlé', graphes: [['', GRAPHES.jaugeMoral(r.moral, r.niveau, { larg: 200, haut: 12 }), '']], couleurChiffre: col }),
    bloc('Ses hommes (en moyenne)', { graphes: [['Peur', G2.jauge(r.peur, { reperes: [0.25, 0.5, 0.75] }), mots.peur(r.peur)], ['Jambes', G2.jauge(r.fatJ, { reperes: [0.25, 0.5, 0.75] }), mots.fat(r.fatJ)], ['Bras', G2.jauge(r.fatB, { reperes: [0.25, 0.5, 0.75] }), mots.fat(r.fatB)]] }),
    bloc('Au fil des jours', { graphes: [['', G2.fil(r.historique, r.initial), '']], mot: 'Effectif (plein) et moral (tirets), soir après soir : le dernier point est aujourd\'hui' }),
    bloc('Aujourd\'hui', { chiffre: r.mortsJour, unite: 'morts', mot: r.ordre }),
    bloc('Performances', { graphes: [['Abattus', G2.partage(r.tues, 0, { max: 30 }), String(r.tues)], ['Tronçons pris', G2.bande(r.pris * 10, 50), String(r.pris)]] }),
    bloc('Vivres', { chiffre: r.vivres, unite: r.vivres > 1 ? 'nuits' : 'nuit', graphes: [['', G2.bande(r.vivres * 10, r.vivresMax * 10), '']] }),
    bloc('Expérience', { graphes: [['', G2.jauge(r.exp, { reperes: [0.08, 0.25, 0.6] }), '']], chevrons: r.chevrons }),
  ];
}
const CHAR = { nom: 'Schneider CA 1', pv: 0.64, canon: 0.7, secondes: 9, etat: 'en marche', exp: 0.42, chevrons: 2, tues: 14, tuesCanon: 9, tuesMitr: 5, repar: 1, obus: 17, calibre: '75 mm', recharge: 30 };
export function blocsChar(c = CHAR) {
  return [
    bloc('Blindage', { chiffre: pct(c.pv), mot: c.repar ? `${c.repar} réparation${c.repar > 1 ? 's' : ''} du génie` : 'jamais réparé', graphes: [['', G2.jauge(c.pv, { reperes: [0.25, 0.5] }), '']] }),
    bloc(`Canon de ${c.calibre}`, { chiffre: c.canon >= 1 ? 'PRÊT' : `${c.secondes} s`, mot: `un obus tous les ${c.recharge} s`, graphes: [['', G2.charge(c.canon), '']] }),
    bloc('Victimes', { chiffre: c.tues, unite: 'hommes', graphes: [['', G2.partage(c.tuesCanon, c.tuesMitr, { max: Math.max(c.tues, 20) }), `canon ${c.tuesCanon} · mitrailleuses ${c.tuesMitr}`]] }),
    bloc('Obus tirés', { chiffre: c.obus, unite: 'obus', mot: c.obus ? `${(c.tuesCanon / c.obus).toFixed(1).replace('.', ',')} tué par obus` : '' }),
    bloc('Expérience', { graphes: [['', G2.jauge(c.exp, { reperes: [0.08, 0.25, 0.6] }), '']], chevrons: c.chevrons, mot: 'Chevrons : blindage et cadence en plus' }),
  ];
}
const NID = { pv: 0.8, muni: 120, munMax: 200, statut: 'tire', exp: 0.18, chevrons: 1, tues: 9, rafales: 31, cadence: 0.67, portee: 150 };
export function blocsNid(n = NID) {
  return [
    bloc('Le poste', { chiffre: pct(n.pv), mot: n.statut === 'tire' ? 'Tire' : 'Veille', graphes: [['', G2.jauge(n.pv, { reperes: [0.25, 0.5] }), '']] }),
    bloc('La bande', { chiffre: n.muni, unite: `sur ${n.munMax}`, mot: 'refaite à l\'aube', graphes: [['', G2.bande(n.muni, n.munMax), '']] }),
    bloc('Victimes', { chiffre: n.tues, unite: 'hommes', mot: `${n.rafales} rafales` , graphes: [['Tués par rafale', G2.partage(n.tues, 0, { max: 3 * 10, couleur: P.n }), (n.tues / n.rafales).toFixed(2).replace('.', ',')]] }),
    bloc('Expérience', { graphes: [['', G2.jauge(n.exp, { reperes: [0.08, 0.25, 0.6] }), '']], chevrons: n.chevrons, mot: `Une rafale toutes les ${n.cadence.toFixed(2).replace('.', ',')} s, à ${n.portee} m` }),
  ];
}
const FICHES = [
  { cle: 'soldat', titre: () => `${SOLDAT.prenom} ${SOLDAT.nom}`, sous: () => `${SOLDAT.grade}, ${SOLDAT.age} ans · ${SOLDAT.numero} · ${SOLDAT.regiment}`, ligne: () => SOLDAT.action, blocs: blocsSoldat, couleur: P.n },
  { cle: 'regiment', titre: () => `Régiment ${REG.nom}`, sous: () => `${REG.debout} hommes sur ${REG.initial} · ${REG.blesses} blessés · ${REG.morts} morts`, ligne: () => REG.ordre, blocs: blocsRegiment, couleur: P.n },
  { cle: 'char', titre: () => CHAR.nom, sous: () => 'Char d\'assaut · à nous', ligne: () => 'Marche vers son objectif : encore 120 m', blocs: blocsChar, couleur: P.n },
  { cle: 'nid', titre: () => 'Mitrailleuse', sous: () => 'Poste de la B1 · à nous', ligne: () => 'Tire à 150 m, une rafale toutes les 0,67 s', blocs: blocsNid, couleur: P.n },
];

// ─── Les trois mises en page ───
const lignesGraphe = (b, cols) => (b.graphes || []).map(([nom, svg, mot]) => el('div', `display:grid;grid-template-columns:${nom ? cols : mot ? '1fr auto' : '1fr'};gap:8px;align-items:center;min-height:20px`, el('span', `color:${P.r};font-size:12px`, nom), html('', svg), el('span', `font-size:12px;color:${P.o}`, mot)));
const chiffreDe = (b, taille = 34) => b.chiffre != null ? el('div', 'display:flex;align-items:baseline;gap:8px', el('span', `font:${taille}px/1 "Antonio","Arial Narrow",sans-serif;color:${b.couleurChiffre ?? P.o}`, String(b.chiffre)), el('span', `font-size:12px;color:${P.r}`, b.unite || '')) : null;
const chevronsDe = b => b.chevrons != null ? html('display:inline-block;vertical-align:middle', G2.chevrons(b.chevrons)) : null;
const entete = (F, large) => el('div', `margin:0 0 ${large ? 12 : 8}px;border-left:4px solid ${F.couleur};padding-left:10px`, el('div', `font:${large ? 28 : 22}px/1.1 "Antonio","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase`, F.titre()), el('div', `color:${P.r};font-size:12px`, F.sous()), el('div', `font-size:12px;margin-top:2px`, F.ligne()));
const papier = (css, ...k) => el('div', `${MONO}background:${P.s};border:1px solid ${P.b};padding:14px 16px;color:${P.o};${css}`, ...k);

// A : les tuiles (le langage du tableau de bord)
function ficheTuiles(F) {
  const tuile = b => el('div', `background:${P.t};border:1px solid ${P.b};padding:10px 12px;display:grid;gap:8px;align-content:start`, el('div', `letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:${P.r}`, b.titre),
    chiffreDe(b), ...lignesGraphe(b, '70px 1fr auto'), (b.mot || b.chevrons != null) ? el('div', `font-size:12px;color:${P.r}`, chevronsDe(b), b.chevrons != null && b.mot ? ' ' : '', b.mot || '') : null);
  return papier('max-width:1040px', entete(F, true), el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px', ...F.blocs().map(tuile)));
}
// B : le profil (une rangée par bloc : le titre à gauche, le graphique au milieu, le mot à droite)
function ficheProfil(F) {
  const rang = b => el('div', `display:grid;grid-template-columns:150px 1fr;gap:16px;padding:8px 0;border-top:1px solid ${P.b};align-items:start`, el('div', '', el('div', `letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:${P.r}`, b.titre), chiffreDe(b, 26)),
    el('div', 'display:grid;gap:5px', ...lignesGraphe(b, '90px minmax(160px,320px) 1fr'), (b.mot || b.chevrons != null) ? el('div', `font-size:12px;color:${P.r}`, chevronsDe(b), ' ', b.mot || '') : null));
  return papier('max-width:760px', entete(F, true), ...F.blocs().map(rang));
}
// C : la compacte (300 px, comme la fenêtre d'un régiment dans le jeu : un bloc, une ligne titre-chiffre, le graphique dessous)
function ficheCompacte(F) {
  const rang = b => el('div', `padding:6px 0;border-top:1px solid ${P.b};display:grid;gap:4px`, el('div', 'display:flex;justify-content:space-between;align-items:baseline;gap:8px', el('span', `letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:${P.r}`, b.titre), b.chiffre != null ? el('span', `font:20px/1 "Antonio","Arial Narrow",sans-serif;color:${b.couleurChiffre ?? P.o}`, `${b.chiffre}${b.unite ? ` ${b.unite}` : ''}`) : chevronsDe(b)),
    ...(b.graphes || []).map(([nom, svg, mot]) => el('div', 'display:grid;gap:2px', nom || mot ? el('div', `display:flex;justify-content:space-between;font-size:11px;color:${P.r}`, el('span', '', nom), el('span', `color:${P.o}`, mot)) : null, html('', svg.replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, m => m)))), b.mot ? el('div', `font-size:11px;color:${P.r}`, b.mot) : null);
  return papier('width:300px;padding:10px 12px', entete(F, false), ...F.blocs().map(rang));
}
function montrer(stage, rendu, note, large = true) {
  const g = el('div', `display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;${MONO}`);
  for (const F of FICHES) g.append(el('div', 'flex:1 1 ' + (large ? '100%' : '300px'), el('div', `${MONO}font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${P.r};margin:0 0 6px`, { soldat: 'Fiche d\'un soldat', regiment: 'Fiche d\'un régiment', char: 'Fiche d\'un char', nid: 'Fiche d\'une mitrailleuse' }[F.cle]), rendu(F)));
  stage.append(g, el('p', `${MONO}margin:10px 0 0;color:${P.r};font-size:12px`, note));
}
const NOTE = 'Données d\'exemple de la forme de l\'état (le soldat : peur, fatigue, caractéristiques et leur départ ; le char : `tues`, `tuesCanon`, `tuesMitr`, `repar`, `obus` ; la mitrailleuse : `tues`, `rafales`). Pas encore dans le jeu.';
export const fichesTuiles = stage => montrer(stage, ficheTuiles, NOTE);
export const fichesProfil = stage => montrer(stage, ficheProfil, NOTE);
export const fichesCompactes = stage => montrer(stage, ficheCompacte, NOTE, false);
