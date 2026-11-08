// Le sujet « Les données » du labo (Jérôme, 7 nov. : « refonte complète de la présentation des statistiques ; tout se conçoit et se valide au labo d'abord »).
// Deux choses : (1) la BIBLIOTHÈQUE GRAPHIQUE commune (barre d'effectifs, duel, petits histogrammes, jauge de moral, pictogrammes de faits), faite de la palette du jeu seulement
// (nous : bleu horizon, eux : vert kaki ; l'orange et le rouge d'alerte ne disent que le moral) ; (2) trois variantes du bilan du soir qui s'en servent.
// RÈGLE : la forme porte l'information, jamais la couleur seule (plein = debout, hachuré = blessés, contour = tombés ; ▲ ▼ ◆ ● pour les faits).
// Rien n'est dans le jeu. Les données ont la forme de `lireJournee` (js/donnees-jour.js, testée sur une vraie bataille) ; ici, trois journées d'exemple (une vraie bataille simulée coûte 8 s par jour).
import { PALETTE as P, ALERTES } from './palette.js?v=0.124.0';
import { faitsMarquants, MANQUE } from './donnees-jour.js?v=0.124.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.4 ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace;';
const NOM_CAMP = ['Nous', 'En face'], COUL = [P.n, P.x];
const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
let uid = 0;

// ─── Les journées d'exemple : la même forme que `lireJournee`, tirées d'un petit générateur (déterministe) ───
function alea(g) { let s = g >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const NOMS = ['Porphyre', 'Protogyne', 'Céruléen', 'Viride', 'Syzygie', 'Murmuration', 'Hapax', 'Sinople'];
export const SCENARIOS = {
  calme: { titre: 'Secteur calme', jours: 10, jour: 3, graine: 11, dur: 0.35, prise: 0 },
  offensive: { titre: 'Grande offensive', jours: 12, jour: 6, graine: 5, dur: 1.15, prise: 2 },
  deroute: { titre: 'Une déroute', jours: 10, jour: 5, graine: 23, dur: 1.6, prise: 3, deroute: true },
};
export function journeeExemple(cle) {
  const S = SCENARIOS[cle], r = alea(S.graine), initial = 100;
  const camp = c => {
    const rude = c === 0 ? 1 : 0.8 + 0.2 * S.dur;
    const mortsParJour = Array.from({ length: S.jour }, (_, k) => Math.round((3 + r() * 7) * S.dur * rude * (1 + k * 0.12 * S.dur)));
    const regiments = NOMS.map((nom, k) => {
      const ini = 12 + (k % 2), mj = Math.round(r() * r() * 9 * S.dur * rude), morts = Math.min(ini - 3, mj + Math.round(r() * 3 * S.dur * (S.jour / 3)));
      const blesses = Math.min(ini - morts, Math.round(r() * 3 * S.dur)), evacues = Math.min(ini - morts - blesses, r() < 0.4 ? Math.round(r() * 2) : 0);
      const moral = S.deroute && c === 0 && (k === 2 || k === 5) ? 0.12 + r() * 0.1 : Math.max(0.3, 1 - morts / ini * 0.75 - r() * 0.1 * S.dur);
      return { numero: k + 1, nom: c === 0 ? nom : null, initial: ini, debout: ini - morts - blesses - evacues, blesses, morts, evacues, mortsJour: Math.min(morts, mj), moral, niveau: moral < 0.25 ? 'deroute' : moral < 0.5 ? 'ebranle' : 'tient' };
    });
    // l'historique des soirs (la forme de `etat.histo`) : chaque régiment glisse de son effectif de départ à celui d'aujourd'hui
    for (const x of regiments) {
      const fin = x.debout + x.blesses;
      x.historique = Array.from({ length: S.jour }, (_, k) => { const t = S.jour > 1 ? k / (S.jour - 1) : 1; return { jour: k + 1, vivants: Math.round(x.initial + (fin - x.initial) * t), blesses: k === S.jour - 1 ? x.blesses : Math.round(x.blesses * t * (0.6 + r() * 0.8)), morts: Math.round(x.morts * t), moral: k === S.jour - 1 ? x.moral : Math.min(1, 1 + (x.moral - 1) * t + (r() - 0.5) * 0.08) }; });
    }
    const sum = k => regiments.reduce((s, x) => s + x[k], 0);
    const effectifParJour = Array.from({ length: S.jour }, (_, k) => regiments.reduce((t, x) => t + x.historique[k].vivants, 0));
    const blessesParJour = Array.from({ length: S.jour }, (_, k) => Math.round((2 + r() * 5) * S.dur * rude));
    return {
      initial: sum('initial'), debout: sum('debout'), blesses: sum('blesses'), morts: sum('morts'), evacues: sum('evacues'), mortsJour: mortsParJour.at(-1), mortsParJour, effectifParJour, blessesParJour,
      prisParJour: Array.from({ length: S.jour }, (_, k) => (k >= S.jour - 2 ? (c === 0 ? Math.max(0, S.prise - 1 - (k % 2)) : S.prise - (k % 2)) : 0)), avions: { sorties: S.dur > 0.5 ? 3 : 1, perdus: S.dur > 1 && c === 0 ? 1 : 0, restent: 3 - (S.dur > 1 && c === 0 ? 1 : 0) }, regiments,
    };
  };
  return { jour: S.jour, jours: S.jours, camps: [camp(0), camp(1)], tronconsTenus: [16 - S.prise * 2, 16 + S.prise * 2], manque: MANQUE, exemple: true };
}

// ─── La bibliothèque graphique ───
export const GRAPHES = {
  // les hachures des blessés, une fois par page : un motif SVG à la couleur donnée
  defs: (id, couleur) => `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${P.t}"/><rect width="2" height="4" fill="${couleur}"/></pattern>`,
  // La barre d'effectifs : de gauche à droite, debout (plein), blessés (hachuré), tombés (contour), évacués (pointillé) ; sa longueur est l'effectif de départ (`echelle` : l'effectif qui remplit `larg`)
  barreEffectif(u, c, { larg = 220, haut = 14, echelle = u.initial, miroir = false } = {}) {
    const id = `h${++uid}`, k = larg / echelle, x0 = 0;
    let x = x0; const segs = [];
    const seg = (n, rempli, stroke, dash) => { const w = n * k; if (n > 0) segs.push(`<rect x="${miroir ? larg - x - w : x}" y="1" width="${w}" height="${haut - 2}" fill="${rempli}" stroke="${stroke}" stroke-width="1" ${dash ? 'stroke-dasharray="2 2"' : ''}/>`); x += w; };
    seg(u.debout, COUL[c], COUL[c]); seg(u.blesses, `url(#${id})`, COUL[c]); seg(u.evacues, 'none', COUL[c], true); seg(u.morts, 'none', P.g);
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="${u.debout} debout, ${u.blesses} blessés, ${u.evacues} évacués, ${u.morts} morts sur ${u.initial}" style="display:block;max-width:100%"><defs>${GRAPHES.defs(id, COUL[c])}</defs>${segs.join('')}</svg>`;
  },
  // Les morts de chaque journée, en petits bâtons (le dernier, celui d'aujourd'hui, plein ; les autres, creux) ; une ligne de base ; `max` commun pour comparer les deux camps
  bâtons(valeurs, c, { larg = 220, haut = 44, max = Math.max(1, ...valeurs), total = valeurs.length } = {}) {
    const w = larg / Math.max(total, 1), b = Math.min(14, w - 3);
    const bars = valeurs.map((v, k) => { const h = Math.max(v > 0 ? 2 : 0, v / max * (haut - 8)), dernier = k === valeurs.length - 1; return `<rect x="${(k * w + (w - b) / 2).toFixed(1)}" y="${(haut - 1 - h).toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}" fill="${dernier ? COUL[c] : 'none'}" stroke="${COUL[c]}"><title>Jour ${k + 1} : ${v}</title></rect>`; }).join('');
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="Morts par jour : ${valeurs.join(', ')}" style="display:block;max-width:100%">${bars}<line x1="0" x2="${larg}" y1="${haut - 0.5}" y2="${haut - 0.5}" stroke="${P.g}"/></svg>`;
  },
  // Une courbe (l'effectif debout jour après jour), avec ses points ; `jour` : le point d'aujourd'hui, cerclé
  courbe(valeurs, c, { larg = 460, haut = 90, max, min = 0, jour = valeurs.length } = {}) {
    max ??= Math.max(...valeurs); const dx = larg / Math.max(1, valeurs.length), y = v => 6 + (1 - (v - min) / Math.max(1, max - min)) * (haut - 14);
    const pts = valeurs.map((v, k) => [dx * (k + 0.5), y(v)]);
    return `<polyline points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${COUL[c]}" stroke-width="2"/>` + pts.map((p, k) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${k === jour - 1 ? 5 : 2.5}" fill="${k === jour - 1 ? P.t : COUL[c]}" stroke="${COUL[c]}" stroke-width="2"><title>Jour ${k + 1} : ${valeurs[k]}</title></circle>`).join('');
  },
  // La jauge de moral d'un régiment : un trait, deux repères (déroute, ébranlé), un curseur ; l'orange et le rouge ne confirment que le mot
  jaugeMoral(m, niveau, { larg = 90, haut = 10 } = {}) {
    const col = niveau === 'deroute' ? ALERTES.rouge : niveau === 'ebranle' ? ALERTES.orange : P.o;
    return `<svg viewBox="0 0 ${larg} ${haut}" width="${larg}" height="${haut}" role="img" aria-label="Moral ${Math.round(m * 100)} %" style="display:block"><rect x="0.5" y="2.5" width="${larg - 1}" height="${haut - 5}" fill="none" stroke="${P.g}"/><rect x="1" y="3" width="${(larg - 2) * m}" height="${haut - 6}" fill="${col}"/>` +
      [0.25, 0.5].map(r => `<line x1="${larg * r}" x2="${larg * r}" y1="0" y2="${haut}" stroke="${P.t}" stroke-width="2"/><line x1="${larg * r}" x2="${larg * r}" y1="0" y2="${haut}" stroke="${P.r}"/>`).join('') + '</svg>';
  },
  // Les tronçons : une case par tronçon, pleine pour qui le tient (les 16 de la bataille, nous à gauche)
  troncons(tenus, total = 32, { larg = 220 } = {}) {
    const w = larg / total;
    return `<svg viewBox="0 0 ${larg} 14" width="${larg}" height="14" role="img" aria-label="Tronçons tenus : nous ${tenus[0]}, en face ${tenus[1]}" style="display:block;max-width:100%">${Array.from({ length: total }, (_, k) => { const nous = k < tenus[0]; return `<rect x="${(k * w + 1).toFixed(1)}" y="1" width="${(w - 2).toFixed(1)}" height="12" fill="${nous ? P.n : k >= total - tenus[1] ? P.x : 'none'}" stroke="${P.g}"/>`; }).join('')}</svg>`;
  },
  // Le pictogramme d'un fait : la forme dit le genre (▼ perte, ▲ gain, ◆ alerte, ● calme)
  fait(genre) {
    const f = { perte: `<path d="M2 3h12L8 14z" fill="${P.o}"/>`, gain: `<path d="M2 13h12L8 2z" fill="${P.n}" stroke="${P.o}"/>`, alerte: `<path d="M8 1l7 7-7 7-7-7z" fill="none" stroke="${ALERTES.orange}" stroke-width="2"/><rect x="7" y="4" width="2" height="5" fill="${ALERTES.orange}"/><rect x="7" y="10.5" width="2" height="2" fill="${ALERTES.orange}"/>`, calme: `<circle cx="8" cy="8" r="5" fill="none" stroke="${P.r}" stroke-width="2"/>` }[genre];
    return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" style="flex:none">${f}</svg>`;
  },
};
const svgDansDiv = (css, html) => { const d = el('div', css); d.innerHTML = html; return d; };
const legende = () => el('p', `${MONO}margin:6px 0 0;color:${P.r};font-size:12px`, svgDansDiv('display:inline-block;vertical-align:middle', GRAPHES.barreEffectif({ debout: 4, blesses: 3, evacues: 2, morts: 3, initial: 12 }, 0, { larg: 120, haut: 12 })), '  plein : debout · hachuré : blessés · pointillé : évacués · contour gris : tombés');

// Le cadre commun : choisir l'exemple, l'afficher (la même mise en scène pour les trois variantes)
function cadre(stage, rendre, depart = 'offensive') {
  const zone = el('div', `${MONO}color:${P.o}`), barre = el('div', 'margin:0 0 12px;display:flex;gap:8px;flex-wrap:wrap');
  const papier = el('div', `${MONO}background:${P.s};border:1px solid ${P.b};padding:16px 20px;max-width:1040px;color:${P.o}`);
  const montrer = cle => { for (const b of barre.children) b.setAttribute('aria-pressed', String(b.dataset.cle === cle)); papier.replaceChildren(rendre(journeeExemple(cle))); };
  for (const [cle, S] of Object.entries(SCENARIOS)) {
    const b = el('button', `${MONO}height:36px;padding:0 14px;color:${P.o};background:${P.s};border:1px solid ${P.g};cursor:pointer`, `${S.titre} · jour ${S.jour}`);
    b.type = 'button'; b.dataset.cle = cle; b.onclick = () => montrer(cle); barre.append(b);
  }
  zone.append(barre, papier, el('p', `${MONO}margin:10px 0 0;color:${P.r};font-size:12px`, 'Journées d\'exemple (la forme de `lireJournee`, testée sur une vraie bataille). Manque dans l\'état : ' + MANQUE.map(m => m.charAt(0).toLowerCase() + m.slice(1)).join(' ; ') + '.'));
  stage.append(zone); montrer(depart);
  return zone;
}
const titre = (t, sous) => el('div', `margin:0 0 10px`, el('div', `font:28px/1.1 "Antonio","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase`, t), sous ? el('div', `color:${P.r};font-size:12px`, sous) : null);
const section = (t, ...k) => el('section', 'margin:0 0 16px', el('h4', `margin:0 0 6px;font-weight:normal;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:${P.r};border-bottom:1px solid ${P.b};padding-bottom:3px`, t), ...k);
const chiffre = (n, t, c, aide) => { const d = el('div', 'min-width:96px', el('div', `font:34px/1 "Antonio","Arial Narrow",sans-serif;color:${c ?? P.o}`, String(n)), el('div', `font-size:12px;color:${P.r}`, t)); if (aide) d.title = aide; return d; };
const faitsListe = d => el('ul', 'list-style:none;margin:0;padding:0;display:grid;gap:6px', ...faitsMarquants(d, 5).map(f => { const li = el('li', 'display:flex;gap:8px;align-items:center'); li.innerHTML = GRAPHES.fait(f.genre); li.append(el('span', 'flex:1;min-width:0', f.texte)); return li; }));
const regTableau = (d, c = 0) => {
  const t = el('div', 'display:grid;gap:5px'), col = 'display:grid;grid-template-columns:150px 220px 90px 56px;gap:12px;align-items:center';
  t.append(el('div', `${col};font-size:11px;color:${P.r};letter-spacing:.1em;text-transform:uppercase`, el('span', '', 'Régiment'), el('span', '', 'Effectif'), el('span', '', 'Moral'), el('span', 'text-align:right', 'Jour')));
  for (const r of d.camps[c].regiments) {
    const l = el('div', col), tag = r.niveau === 'deroute' ? ' !!' : r.niveau === 'ebranle' ? ' !' : '';
    l.append(el('span', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis', `${r.numero} · ${r.nom ?? 'En face'}${tag}`), svgDansDiv('', GRAPHES.barreEffectif(r, c, { larg: 220, echelle: 14 })), svgDansDiv('', GRAPHES.jaugeMoral(r.moral, r.niveau)), el('span', `color:${P.r};text-align:right`, r.mortsJour ? `−${r.mortsJour}` : '·'));
    t.append(l);
  }
  return t;
};

// ─── A : Le rapport : le duel en haut, ce qu'il faut retenir, les pertes des jours, puis les régiments ───
export function bilanRapport(stage) {
  return cadre(stage, d => {
    const [n, e] = d.camps, max = Math.max(...n.mortsParJour, ...e.mortsParJour), base = Math.max(n.initial, e.initial);
    const duel = el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0 0 16px');
    for (const c of [0, 1]) {
      const u = d.camps[c];
      duel.append(el('div', '', el('div', `color:${COUL[c]};letter-spacing:.14em;text-transform:uppercase;font-size:12px;margin:0 0 4px`, NOM_CAMP[c]),
        el('div', 'display:flex;gap:18px;margin:0 0 8px', chiffre(u.debout, 'debout'), chiffre(u.mortsJour, 'morts aujourd\'hui', P.o), chiffre(u.blesses, 'blessés')),
        svgDansDiv('', GRAPHES.barreEffectif(u, c, { larg: 420, haut: 16, echelle: base }))));
    }
    return el('div', '', titre(`Soir du ${d.jour}e jour`, `Bataille de ${d.jours} jours · exemple`), duel, legende(),
      el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0 0',
        section('À retenir', faitsListe(d)),
        section('Les morts, jour après jour', ...[0, 1].map(c => el('div', 'margin:0 0 6px', el('div', `font-size:11px;color:${COUL[c]}`, `${NOM_CAMP[c]} · ${d.camps[c].mortsParJour.reduce((a, b) => a + b, 0)} en tout`), svgDansDiv('', GRAPHES.bâtons(d.camps[c].mortsParJour, c, { larg: 420, max, total: d.jours }))))),
      ),
      section('Nos régiments', regTableau(d)), section('Les lignes', svgDansDiv('', GRAPHES.troncons(d.tronconsTenus, 32, { larg: 420 })), el('div', `color:${P.r};font-size:12px;margin-top:3px`, `Nous : ${d.tronconsTenus[0]} tronçons · en face : ${d.tronconsTenus[1]}`)));
  });
}

// ─── B : Le tableau de bord : des tuiles, chacune un chiffre et un graphique ───
export function bilanTuiles(stage) {
  return cadre(stage, d => {
    const [n, e] = d.camps, max = Math.max(...n.mortsParJour, ...e.mortsParJour);
    const tuile = (t, ...k) => el('div', `background:${P.t};border:1px solid ${P.b};padding:10px 12px;display:grid;gap:8px;align-content:start`, el('div', `letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:${P.r}`, t), ...k);
    const fait = faitsMarquants(d, 1)[0];
    const bandeau = el('div', `display:flex;gap:10px;align-items:center;background:${P.t};border-left:4px solid ${fait.genre === 'alerte' ? ALERTES.orange : P.g};padding:8px 12px;margin:0 0 12px`); bandeau.innerHTML = GRAPHES.fait(fait.genre); bandeau.append(el('span', '', fait.texte));
    return el('div', '', titre(`Soir du ${d.jour}e jour`, `Bataille de ${d.jours} jours · exemple`), bandeau,
      el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px',
        tuile('Effectifs', ...[0, 1].map(c => el('div', '', el('div', `color:${COUL[c]};font-size:12px`, `${NOM_CAMP[c]} · ${d.camps[c].debout} debout sur ${d.camps[c].initial}`), svgDansDiv('', GRAPHES.barreEffectif(d.camps[c], c, { larg: 280, haut: 14, echelle: Math.max(n.initial, e.initial) }))))),
        tuile('Pertes du jour', el('div', 'display:flex;gap:24px', chiffre(n.mortsJour, 'les nôtres', COUL[0]), chiffre(e.mortsJour, 'les leurs', COUL[1]), chiffre(n.blessesParJour.at(-1), 'blessés chez nous', COUL[0], 'Les nouvelles blessures d\'aujourd\'hui (lues dans l\'historique des soirs)')), svgDansDiv('', GRAPHES.bâtons(n.mortsParJour, 0, { larg: 280, haut: 40, max, total: d.jours })), svgDansDiv('', GRAPHES.bâtons(e.mortsParJour, 1, { larg: 280, haut: 40, max, total: d.jours }))),
        tuile('Les lignes', el('div', 'display:flex;gap:24px', chiffre(d.tronconsTenus[0], 'tenus par nous', COUL[0]), chiffre(d.tronconsTenus[1], 'tenus par eux', COUL[1])), svgDansDiv('', GRAPHES.troncons(d.tronconsTenus, 32, { larg: 280 })), el('div', `font-size:12px;color:${P.r}`, `Aujourd'hui : ${pl(n.prisParJour.at(-1), 'pris', 'pris')}, ${pl(e.prisParJour.at(-1), 'perdu', 'perdus')}`)),
        tuile('Le ciel', el('div', 'display:flex;gap:24px', chiffre(n.avions.sorties, 'sorties'), chiffre(n.avions.perdus, 'abattus'), chiffre(n.avions.restent, 'restent')), el('div', `font-size:12px;color:${P.r}`, n.avions.perdus ? 'Réparés cette nuit, hors les abattus.' : 'Tous rentrés.')),
        tuile('Le moral', ...n.regiments.map(r => { const l = el('div', 'display:grid;grid-template-columns:24px 1fr 90px;gap:8px;align-items:center'); l.append(el('b', 'font-weight:normal', String(r.numero)), svgDansDiv('', GRAPHES.barreEffectif(r, 0, { larg: 150, haut: 10, echelle: 14 })), svgDansDiv('', GRAPHES.jaugeMoral(r.moral, r.niveau))); return l; })),
        tuile('À retenir', faitsListe(d)),
      ), legende());
  });
}

// ─── C : La frise : la bataille jour après jour, le jour du bilan déplié dessous ───
export function bilanFrise(stage) {
  return cadre(stage, d => {
    const [n, e] = d.camps, total = d.jours, larg = 960, haut = 130;
    // les hommes vivants au soir de chaque jour : `etat.histo` (v0.120.0)
    const cumul = c => d.camps[c].effectifParJour;
    const base = Math.max(n.initial, e.initial), dx = larg / total;
    const marques = Array.from({ length: d.jour }, (_, k) => { const pris = n.prisParJour[k] || 0, perdu = e.prisParJour[k] || 0; return pris || perdu ? `<g transform="translate(${dx * (k + 0.5) - 8},${haut - 4})">${GRAPHES.fait(perdu ? 'gain' : 'perte')}</g>` : ''; }).join('');
    const grille = Array.from({ length: total }, (_, k) => `<text x="${dx * (k + 0.5)}" y="${haut + 22}" fill="${k === d.jour - 1 ? P.o : P.g}" font-size="11" text-anchor="middle" font-family="monospace">${k + 1}</text>`).join('');
    const svg = `<svg viewBox="0 0 ${larg} ${haut + 28}" width="100%" role="img" aria-label="Effectifs debout, jour après jour" style="display:block;max-width:${larg}px"><line x1="0" x2="${larg}" y1="${haut - 8}" y2="${haut - 8}" stroke="${P.g}"/><rect x="${dx * d.jour}" y="0" width="${dx * (total - d.jour)}" height="${haut}" fill="${P.t}" opacity=".55"/>${[e, n].map((u, i) => GRAPHES.courbe(cumul(1 - i), 1 - i, { larg, haut: haut - 12, max: base, min: base * 0.5, jour: d.jour })).join('')}${marques}${grille}</svg>`;
    return el('div', '', titre('La bataille, jour après jour', `Soir du ${d.jour}e jour sur ${d.jours} · exemple`),
      el('div', `display:flex;gap:18px;font-size:12px;margin:0 0 6px`, el('span', `color:${COUL[0]}`, '● Nous (debout)'), el('span', `color:${COUL[1]}`, '● En face (debout)'), el('span', `color:${P.r}`, '▲ tronçon pris · ▼ tronçon perdu · la partie sombre : les jours à venir')),
      svgDansDiv('', svg),
      el('div', 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:18px 0 0',
        section(`Le ${d.jour}e jour`, el('div', 'display:flex;gap:20px;margin:0 0 8px', chiffre(n.mortsJour, 'morts chez nous', COUL[0]), chiffre(e.mortsJour, 'morts en face', COUL[1]), chiffre(n.debout, 'debout')), faitsListe(d)),
        section('Nos régiments', regTableau(d))), legende());
  }, 'deroute');
}
