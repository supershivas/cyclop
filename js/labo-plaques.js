// Le sujet « Plaques et journal » du labo : des maquettes de l'interface posées sur le champ de bataille en direct (le moteur du jeu),
// pour décider de ce que sont les « fenêtres » : aujourd'hui, toutes la même plaque. Rien ici ne lit ni ne modifie le jeu : des
// données d'exemple, la palette du jeu (js/palette.js), aucune couleur de plus.
import { PALETTE as P } from './palette.js?v=0.98.0';
import { calqueBarre } from './labo-barre-temps.js?v=0.98.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const txt = (s, css = '') => el('span', css, s);
const MONO = 'font:13px/1.4 ui-monospace,monospace;';

// ce qu'on montre : une situation d'exemple
const S = {
  jour: 2, jours: 11, heure: '9 h 30', meteo: 'temps sec', demain: 'du brouillard', mission: 'Prendre leur première ligne', reserve: 4,
  morts: [15, 3], blesses: [6, 1],
  reg: { nom: 'Syzygie', effectif: 412, initial: 750, blesses: 31, morts: 18, moral: 'ébranlé', ordre: 'tient la 2e ligne', capitaine: 'Capitaine Lenoir' },
  regs: [{ nom: 'Syzygie', n: 412, humeur: 'ébranlé' }, { nom: 'Protogyne', n: 380, humeur: '' }],
  batteries: [['75', 'prête'], ['155', '12 s'], ['220', '41 s']],
  journal: [['9 h 02', 'Le 5e d\'en face prépare au 220, tronçon 3.'], ['9 h 12', 'Le 5e sort de ses tranchées.'], ['9 h 20', 'Tronçon 3 : plus qu\'un défenseur.'], ['9 h 21', 'Tronçon 3 perdu.']],
};

// ── l'actuelle : une seule plaque, partout ──
const plaque = (css, ...kids) => el('div', `position:absolute;padding:6px 10px;background:${P.t};color:${P.o};border:1px solid ${P.s};${MONO}${css}`, kids);
function actuelle(b) {
  b.append(
    plaque('left:8px;top:8px', el('div', '', `Jour ${S.jour} sur ${S.jours} · ${S.heure} · ${S.meteo}`), txt(`Demain : ${S.demain}`, `color:${P.g};display:block`), txt(`${S.mission} · réserve : ${S.reserve}`, `color:${P.g};display:block`)),
    plaque('right:8px;top:8px;width:230px', el('div', 'font-size:16px', S.reg.nom), txt(`Nos hommes · ${S.reg.capitaine}`, `color:${P.g};display:block`), el('div', '', `${S.reg.effectif} hommes, ${S.reg.blesses} blessés, ${S.reg.morts} morts`), txt(`Ébranlé · ${S.reg.ordre}`, `color:${P.g};display:block`)),
    plaque('left:8px;bottom:8px', el('div', '', `Nos morts ${S.morts[0]}`), el('div', '', `En face ${S.morts[1]}`), txt(`Blessés : ${S.blesses[0]} · ${S.blesses[1]}`, `color:${P.g};display:block`)),
    el('div', 'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:8px', S.batteries.map(([c, r]) => plaque('position:static;min-width:64px;text-align:center', el('div', 'font-size:16px', c), txt(r, `color:${P.g}`)))),
    plaque('right:8px;bottom:8px;max-width:34ch', S.regs.map(r => `${r.nom} ${r.n}${r.humeur ? ` (${r.humeur})` : ''}`).join(' · ')),
  );
}

// ── trois familles : l'instrument, les ordres, la fiche ──
function familles(b) {
  // l'instrument : un bandeau, sans cadre, en haut : ce qui est permanent et qu'on lit d'un coup d'œil
  b.append(el('div', `position:absolute;left:0;right:0;top:0;display:flex;gap:18px;align-items:center;padding:5px 12px;background:${P.t};color:${P.o};border-bottom:2px solid ${P.g};${MONO}`,
    el('b', 'font-weight:normal;letter-spacing:.1em;text-transform:uppercase', `Jour ${S.jour}/${S.jours}`), txt(S.heure), txt(S.meteo, `color:${P.r}`), txt(`demain ${S.demain}`, `color:${P.g}`),
    el('span', 'flex:1'), txt(`${S.mission} · réserve ${S.reserve}`, `color:${P.r}`), txt(`morts ${S.morts[0]} · ${S.morts[1]}`)));
  // les ordres : des cartes de régiment, avec un liseré, en bas à gauche
  const carte = r => el('div', `display:grid;grid-template-columns:4px 1fr;background:${P.t};color:${P.o};${MONO}min-width:190px`,
    el('i', `background:${P.n}`), el('div', 'padding:5px 9px', el('div', 'display:flex;justify-content:space-between;gap:14px', el('b', 'font-weight:normal;font-size:15px', r.nom), txt(String(r.n))),
      el('div', `height:5px;margin:4px 0;background:${P.s}`, el('div', `height:5px;width:${r.n / 750 * 100}%;background:${P.n}`)), txt(r.humeur || 'tient', `color:${P.r}`)));
  b.append(el('div', 'position:absolute;left:8px;bottom:8px;display:grid;gap:6px', S.regs.map(carte)));
  // les batteries : trois boutons, au centre
  b.append(el('div', 'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:6px', S.batteries.map(([c, r]) => el('div', `padding:4px 12px;text-align:center;border:1px solid ${P.g};background:${P.t};color:${r === 'prête' ? P.o : P.g};${MONO}`, el('div', 'font-size:16px', c), txt(r)))));
  // la fiche : un cadre plus lourd, un en-tête plein
  b.append(el('div', `position:absolute;right:8px;top:44px;width:236px;border:2px solid ${P.o};background:${P.t};color:${P.o};${MONO}`,
    el('div', `background:${P.o};color:${P.t};padding:3px 8px;letter-spacing:.12em;text-transform:uppercase`, 'Régiment'),
    el('div', 'padding:8px 10px;display:grid;gap:3px', el('div', 'font-size:17px', S.reg.nom), txt(S.reg.capitaine, `color:${P.r}`), txt(`${S.reg.effectif} hommes · ${S.reg.blesses} blessés · ${S.reg.morts} morts`), txt(`${S.reg.moral} · ${S.reg.ordre}`, `color:${P.r}`))));
}

// ── des papiers de campagne : la feuille de situation, la montre, les obus ──
function papiers(b, avecCarnet = false) {
  // la montre de gousset : l'heure et la météo
  const h = 9.5, ang = (h % 12) / 12 * 360, angM = (h % 1) * 360;
  const montre = el('div', 'position:absolute;left:12px;top:12px;display:flex;gap:10px;align-items:center');
  montre.innerHTML = `<svg width="64" height="64" viewBox="0 0 64 64" style="shape-rendering:crispEdges"><circle cx="32" cy="32" r="29" fill="${P.o}" stroke="${P.t}" stroke-width="3"/><circle cx="32" cy="32" r="29" fill="none" stroke="${P.g}" stroke-width="1"/>
    ${[...Array(12)].map((_, k) => `<line x1="32" y1="6" x2="32" y2="${k % 3 ? 9 : 12}" stroke="${P.t}" stroke-width="2" transform="rotate(${k * 30} 32 32)"/>`).join('')}
    <line x1="32" y1="32" x2="32" y2="15" stroke="${P.t}" stroke-width="2" transform="rotate(${angM} 32 32)"/><line x1="32" y1="32" x2="32" y2="21" stroke="${P.t}" stroke-width="4" transform="rotate(${ang} 32 32)"/>
    <rect x="29" y="-2" width="6" height="6" fill="${P.g}"/></svg>`;
  montre.append(el('div', `padding:3px 8px;background:${P.o};color:${P.t};${MONO}`, el('div', '', `Jour ${S.jour} sur ${S.jours}`), txt(`${S.meteo} ; demain ${S.demain}`, `color:${P.g};display:block`)));
  b.append(montre);

  // la feuille de situation du régiment choisi : du papier, des lignes, un tampon, une barre de comptage
  const regl = (css = '') => `border-bottom:1px solid ${P.r};padding:2px 0;${css}`;
  const barre = (n, c) => el('i', `display:inline-block;width:${n}px;height:8px;background:${c}`);
  const feuille = el('div', `position:absolute;right:12px;top:12px;width:250px;padding:10px 12px;background:${P.o};color:${P.t};${MONO}transform:rotate(1.2deg);box-shadow:3px 3px 0 ${P.t}`,
    el('div', `${regl()};font-size:16px;display:flex;justify-content:space-between`, el('b', 'font-weight:normal', S.reg.nom), txt('SITUATION', `color:${P.g};letter-spacing:.1em`)),
    el('div', regl(), `${S.reg.capitaine}`),
    el('div', regl('display:flex;gap:2px;align-items:center'), barre(S.reg.effectif / 4, P.n), barre(S.reg.blesses, P.h), barre(S.reg.morts * 1.5, P.t)),
    el('div', regl(`color:${P.g}`), `${S.reg.effectif} debout · ${S.reg.blesses} blessés · ${S.reg.morts} tombés`),
    el('div', regl(), `Ordre : ${S.reg.ordre}`),
    el('div', `margin-top:8px;display:inline-block;border:2px solid ${P.x};color:${P.x};padding:1px 8px;transform:rotate(-6deg);letter-spacing:.14em;text-transform:uppercase`, S.reg.moral));
  b.append(feuille);

  // le râtelier d'obus : un obus debout est prêt ; couché, il se recharge (le temps restant, au crayon)
  const obus = (cal, reste) => {
    const hh = { 75: 34, 155: 46, 220: 58 }[cal], w = { 75: 12, 155: 17, 220: 22 }[cal], prete = reste === 'prête';
    const e = el('div', `display:grid;justify-items:center;gap:2px;color:${P.o};${MONO}`);
    e.innerHTML = `<svg width="${prete ? w + 4 : hh + 4}" height="${prete ? hh + 6 : w + 6}" viewBox="0 0 ${prete ? w + 4 : hh + 4} ${prete ? hh + 6 : w + 6}">
      <g ${prete ? '' : `transform="translate(0 ${w + 6}) rotate(-90)"`}><path d="M${2} ${hh + 4} V${hh * 0.45} Q${2 + w / 2} 0 ${2 + w} ${hh * 0.45} V${hh + 4} Z" fill="${prete ? P.h : P.g}" stroke="${P.t}" stroke-width="2"/>
      <rect x="2" y="${hh - 4}" width="${w}" height="3" fill="${P.t}"/></g></svg>
      <span>${cal}</span><span style="color:${prete ? P.o : P.g}">${prete ? 'prête' : reste}</span>`;
    return e;
  };
  b.append(el('div', `position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:18px;align-items:flex-end;padding:6px 16px 4px;background:${P.t};border-top:3px solid ${P.g}`, S.batteries.map(([c, r]) => obus(c, r))));

  // les morts : au crayon, des croix (une par mort, par cinq), sur un coin de carnet
  const crois = n => '✕'.repeat(Math.min(n, 15));
  b.append(el('div', `position:absolute;left:12px;bottom:12px;padding:6px 10px;background:${P.o};color:${P.t};${MONO}transform:rotate(-1deg);box-shadow:3px 3px 0 ${P.t}`,
    el('div', `color:${P.g}`, 'Nos morts'), el('div', 'letter-spacing:.2em', crois(S.morts[0])), el('div', `color:${P.g};margin-top:3px`, 'En face'), el('div', `letter-spacing:.2em;color:${P.x}`, crois(S.morts[1]))));

  if (avecCarnet) {
    b.append(el('div', `position:absolute;right:12px;bottom:12px;width:270px;padding:8px 10px;background:${P.o};color:${P.t};${MONO}font-size:12px;box-shadow:3px 3px 0 ${P.t};transform:rotate(-.8deg)`,
      el('div', `${regl()};letter-spacing:.14em;text-transform:uppercase`, 'Carnet de bord'),
      S.journal.map(([t, l], k) => el('div', regl(k === S.journal.length - 1 ? `background:${P.h}` : ''), el('b', 'font-weight:normal;color:' + P.g, t + '  '), l))));
  }
}

// ── l'écran d'aujourd'hui (v0.31) : le billet sous les boutons du temps, les pertes au centre, la carte, les cartes de régiment, les batteries, le carnet ──
function aujourdhui(b) {
  calqueBarre('bande')(b);      // les boutons du temps et la barre du temps (le billet), telle qu'elle est en jeu
  const papier = (css, ...kids) => el('div', `position:absolute;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};${css}`, ...kids);
  // les pertes : une ligne par camp (nom, barre, debout · blessés · tombés)
  const ligne = (nom, c, n) => el('div', 'display:flex;gap:10px;align-items:center', el('span', 'width:64px', nom), el('i', `display:block;width:130px;height:8px;background:${P.s}`, el('i', `display:block;height:8px;width:${n / 750 * 100}%;background:${c}`)), txt(`${n} · ${S.blesses[0]} bl. · ${S.morts[0]} t.`));
  b.append(papier('left:50%;top:8px;transform:translateX(-50%);padding:6px 10px', ligne('Nous', P.n, 712), ligne('En face', P.x, 730)));
  // la carte : quatre secteurs, quatre lignes de chaque camp, les régiments en cercles
  const case_ = c => el('i', `display:block;height:10px;background:${c};border:1px solid ${P.t}`);
  const grille = c => el('div', 'display:grid;grid-template-columns:repeat(4,1fr);gap:2px', Array.from({ length: 8 }, () => case_(c)));
  b.append(papier('right:8px;top:8px;width:240px;padding:6px 8px', el('div', `letter-spacing:.1em;text-transform:uppercase;color:${P.g}`, 'Le secteur · en face au nord'), grille(P.x), el('div', `height:14px;text-align:center;color:${P.g};font-size:11px`, '135 m'), grille(P.n)));
  // le carnet de bord, au-dessus des cartes
  const regl = (css = '') => `border-bottom:1px solid ${P.r};padding:2px 0;${css}`;
  b.append(papier('left:8px;bottom:84px;width:236px;padding:8px 10px;font-size:12px', el('div', `${regl()};letter-spacing:.14em;text-transform:uppercase`, 'Carnet de bord'),
    S.journal.map(([t, l], k) => el('div', regl(k === S.journal.length - 1 ? `background:${P.h}` : ''), el('b', `font-weight:normal;color:${P.g}`, t + '  '), l))));
  // la rangée des régiments : numéro et nom, chevrons, barre ; la carte choisie s'ouvre vers le haut
  const carte = (n, nom, choisi) => el('div', `width:112px;padding:4px 7px;background:${P.t};color:${P.o};${MONO}border-top:3px solid ${choisi ? P.n : P.s}`,
    el('div', '', `${n} · ${nom}`), txt('^^^', `color:${P.g};display:block;line-height:1`), el('div', `height:6px;margin-top:3px;background:${P.s}`, el('div', `height:6px;width:${choisi ? 70 : 92}%;background:${P.n}`)));
  b.append(el('div', 'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:8px', carte(2, 'Protogyne', true), carte(3, 'Céruléen'), carte(4, 'Viride'), carte(5, 'Syzygie')));
  b.append(papier(`left:50%;bottom:76px;margin-left:-210px;width:260px;padding:8px 10px`, el('div', `${regl()};font-size:15px`, `2 · ${S.reg.nom}`),
    el('div', regl(`color:${P.g}`), `${S.reg.effectif} debout · ${S.reg.blesses} blessés · ${S.reg.morts} tombés`), el('div', regl(), `${S.reg.ordre}`),
    el('div', 'display:flex;gap:4px;margin-top:6px', ['Bloc', 'Ligne', 'Par deux', 'Colonne'].map((t, k) => el('span', `padding:3px 6px;border:1px solid ${P.t};${k === 0 ? `background:${P.t};color:${P.o}` : ''}`, t))),
    el('div', `margin-top:8px;display:inline-block;border:2px solid ${P.t};padding:1px 8px;transform:rotate(-6deg);letter-spacing:.14em;text-transform:uppercase`, S.reg.moral)));
  // les batteries : l'obus debout, le calibre, une jauge de recharge
  const batterie = ([c, r], k) => el('div', `width:84px;padding:4px 8px;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t}`, el('div', 'display:flex;justify-content:space-between', el('b', 'font-weight:normal;font-size:16px', c), txt(String(k + 1), `color:${P.g}`)),
    txt(r, `color:${P.g};display:block`), el('div', `height:4px;background:${P.s}`, el('div', `height:4px;width:${r === 'prête' ? 100 : 40}%;background:${P.t}`)));
  b.append(el('div', 'position:absolute;right:8px;bottom:8px;display:flex;gap:6px', S.batteries.map(batterie)));
}

const VARIANTES = { aujourdhui, actuelle, familles, papiers: b => papiers(b), carnet: b => papiers(b, true) };
export const calquePlaques = v => VARIANTES[v];
