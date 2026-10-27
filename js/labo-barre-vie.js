// Le sujet « La barre de vie » du labo (Jérôme, v0.32.2) : ce que disent les pertes des deux armées, en haut au centre. Aujourd'hui, un papier
// à deux lignes de chiffres ; ici, des barres de vie de chaque côté, comme un jeu de combat en un contre un : nous à gauche, en face à
// droite, la vie qui reste collée au centre, ce qui est perdu qui se vide vers le bord. Pas un chiffre à l'écran : ils ne viennent qu'au
// survol d'un segment de la barre. Dessous, la barre des tronçons tenus, plus petite, en couleurs neutres (os et terre : elle ne prend
// parti pour personne). Posées sur le champ en direct ; rien ici ne lit ni ne modifie le jeu : des données d'exemple, la palette du jeu.
import { PALETTE as P } from './palette.js?v=0.91.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:12px/1.3 ui-monospace,monospace;';

// une situation d'exemple : 750 hommes par camp, huit régiments de ~94, 64 tronçons chacun
const TOTAL = 750, TR = 64;
const CAMPS = {
  nous: { nom: 'Nous', couleur: P.n, debout: 412, blesses: 90, tombes: 248, tr: 41, regs: [[70, 9, 15], [55, 12, 27], [38, 15, 41], [81, 6, 7], [60, 10, 24], [22, 8, 64], [66, 11, 17], [20, 19, 55]] },
  eux: { nom: 'En face', couleur: P.x, debout: 520, blesses: 80, tombes: 150, tr: 23, regs: [[80, 4, 10], [74, 8, 12], [60, 10, 24], [70, 9, 15], [66, 7, 21], [48, 14, 32], [63, 9, 22], [59, 11, 24]] },
};
const NOMS = ['Porphyre', 'Protogyne', 'Céruléen', 'Viride', 'Syzygie', 'Murmurati…', 'Hapax', 'Sinople'];

// l'infobulle : un seul élément pour toute la maquette, qui suit la souris
function infobulle(boite) {
  const t = el('div', `position:absolute;display:none;z-index:5;padding:3px 7px;background:${P.o};color:${P.t};${MONO}box-shadow:2px 2px 0 ${P.t};pointer-events:none;white-space:nowrap`);
  boite.append(t);
  return e => {
    e.onmouseenter = ev => { t.textContent = e.dataset.tip; t.style.display = 'block'; };
    e.onmousemove = ev => { const r = boite.getBoundingClientRect(); t.style.left = `${ev.clientX - r.left + 12}px`; t.style.top = `${ev.clientY - r.top + 14}px`; };
    e.onmouseleave = () => { t.style.display = 'none'; };
    return e;
  };
}

// une barre de vie : debout (la couleur du camp), blessés (hachuré), tombés (vide). Côté « nous » la vie est collée à droite (le centre), en face à gauche.
function vie(tip, c, { h = 18, cote, fond = P.t, bord = P.t, pente = 0 } = {}) {
  const sens = cote === 'nous' ? 'row-reverse' : 'row';
  const b = el('div', `display:flex;flex-direction:${sens};height:${h}px;box-sizing:border-box;border:2px solid ${bord};background:${fond};${pente ? `transform:skewX(${pente}deg);` : ''}`);
  const seg = (n, css, mot) => { const s = el('i', `display:block;height:100%;width:${(n / TOTAL * 100).toFixed(2)}%;${css}`); s.dataset.tip = `${n} ${mot}`; return tip(s); };
  b.append(
    seg(c.debout, `background:${c.couleur}`, 'debout'),
    seg(c.blesses, `background:repeating-linear-gradient(135deg,${c.couleur} 0 2px,${fond} 2px 4px)`, 'blessés'),
    seg(c.tombes, `background:${P.s}`, 'tombés'),
  );
  return b;
}

// la barre des tronçons : 64 graduations, os ceux qu'on tient, terre ceux qu'on a perdus (jamais la couleur d'un camp) ; groupes de 16 si `groupes`
function troncons(tip, c, { h = 6, groupes = false, cote } = {}) {
  const b = el('div', `display:flex;flex-direction:${cote === 'nous' ? 'row-reverse' : 'row'};gap:1px;height:${h}px;`);
  for (let k = 0; k < TR; k++) {
    const i = el('i', `flex:1;display:block;background:${k < c.tr ? P.o : P.s};${groupes && k % 16 === 15 && k < TR - 1 ? 'margin-right:3px' : ''}`);
    if (cote === 'nous' && groupes && k % 16 === 15 && k < TR - 1) i.style.cssText = i.style.cssText.replace('margin-right:3px', 'margin-left:3px');
    b.append(i);
  }
  b.dataset.tip = `${c.tr} tronçons tenus sur ${TR}`;
  return tip(b);
}

const nomCamp = (c, css = '') => el('span', `${MONO}text-transform:uppercase;letter-spacing:.12em;color:${c.couleur};${css}`, c.nom);
const sur = (css, ...kids) => el('div', `position:absolute;${css}`, kids);
const papier = (css, ...kids) => el('div', `background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};${css}`, kids);

// A · l'actuelle : un papier à deux lignes de chiffres
function actuelle(b) {
  const l = c => el('div', 'display:grid;grid-template-columns:8ch 16ch auto auto;gap:0 8px;align-items:center',
    el('span', 'font-size:14px', c.nom), el('span', `display:flex;height:8px;background:${P.g}`, el('i', `width:${c.debout / TOTAL * 100}%;background:${c.couleur}`), el('i', `width:${c.blesses / TOTAL * 100}%;background:${P.g}`)),
    el('span', `color:${P.g}`, `${c.debout} · ${c.blesses} bl. · ${c.tombes} t.`), el('b', `color:${P.g}`, `${c.tr} tr.`));
  b.append(sur('left:50%;top:8px;transform:translateX(-50%)', papier('padding:4px 8px;display:grid;gap:2px', l(CAMPS.nous), l(CAMPS.eux))));
}

// B · le duel : deux barres collées à un médaillon central (le jour), la vie au centre ; dessous, les tronçons, tout petits
function duel(b) {
  const tip = infobulle(b);
  const cote = k => el('div', 'display:grid;gap:3px;flex:1;min-width:0', nomCamp(CAMPS[k], `text-align:${k === 'nous' ? 'left' : 'right'}`), vie(tip, CAMPS[k], { cote: k, h: 20 }), troncons(tip, CAMPS[k], { cote: k, h: 5 }));
  b.append(sur('left:50%;top:8px;transform:translateX(-50%);width:min(760px,calc(100% - 16px));display:flex;gap:8px;align-items:flex-start',
    cote('nous'), papier('flex:none;padding:3px 10px;margin-top:14px;text-align:center;border:2px solid ' + P.t, el('div', 'font-size:16px', 'J2'), el('div', `color:${P.g}`, '9 h 30')), cote('eux')));
}

// C · les biseaux : des barres penchées, épaisses, le nom du camp collé au bord extérieur ; les tronçons en quatre groupes (un par secteur, A à D)
function biseaux(b) {
  const tip = infobulle(b);
  const cote = k => {
    const c = CAMPS[k], g = k === 'nous';
    return el('div', `display:grid;gap:3px;flex:1;min-width:0;justify-items:${g ? 'start' : 'end'}`,
      el('div', `width:100%;padding:0 6px`, vie(tip, c, { cote: k, h: 26, pente: g ? -22 : 22, bord: P.o })),
      el('div', `width:calc(100% - 22px);padding:0 11px`, troncons(tip, c, { cote: k, h: 4, groupes: true })),
      nomCamp(c, 'padding:0 8px'));
  };
  b.append(sur('left:50%;top:8px;transform:translateX(-50%);width:min(760px,calc(100% - 16px));display:flex;gap:2px;align-items:flex-start',
    cote('nous'), el('div', `flex:none;width:46px;height:46px;margin-top:-2px;display:grid;place-items:center;background:${P.o};color:${P.t};${MONO}transform:rotate(45deg);box-shadow:3px 3px 0 ${P.t}`, el('span', 'transform:rotate(-45deg);font-size:13px', '2/11')), cote('eux')));
}

// D · le fil du haut : des barres collées au bord de l'écran, de la largeur de chaque moitié ; presque rien, le champ reste grand
function fil(b) {
  const tip = infobulle(b);
  const cote = k => el('div', 'display:grid;gap:2px;flex:1;min-width:0', vie(tip, CAMPS[k], { cote: k, h: 10, bord: P.t }), troncons(tip, CAMPS[k], { cote: k, h: 3 }));
  b.append(sur('left:0;right:0;top:0;display:flex;gap:0', cote('nous'), cote('eux')),
    sur('left:0;top:22px', nomCamp(CAMPS.nous, 'padding:1px 6px;background:' + P.t)), sur('right:0;top:22px', nomCamp(CAMPS.eux, 'padding:1px 6px;background:' + P.t)),
    sur('left:50%;top:0;transform:translateX(-50%)', papier('padding:1px 12px 2px;box-shadow:none;border:2px solid ' + P.t + ';border-top:0', 'Jour 2 · 9 h 30')));
}

// E · un segment par régiment : chaque barre est faite de huit segments (les huit régiments d'un camp), chacun plein selon ses hommes debout ; au survol, le régiment
function segmentee(b) {
  const tip = infobulle(b);
  const vieRegs = k => {
    const c = CAMPS[k], g = k === 'nous', ligne = el('div', `display:flex;flex-direction:${g ? 'row-reverse' : 'row'};gap:3px;height:22px`);
    c.regs.forEach(([debout, blesses, tombes], i) => {
      const s = el('div', `position:relative;flex:1;display:flex;flex-direction:${g ? 'row-reverse' : 'row'};background:${P.s};outline:2px solid ${P.t};overflow:hidden`);
      s.dataset.tip = `${i + 1} · ${NOMS[i]} : ${debout} debout · ${blesses} blessés · ${tombes} tombés`;
      const n = debout + blesses + tombes;
      s.append(el('i', `display:block;width:${debout / n * 100}%;background:${c.couleur}`), el('i', `display:block;width:${blesses / n * 100}%;background:repeating-linear-gradient(135deg,${c.couleur} 0 2px,${P.s} 2px 4px)`));
      s.append(el('b', `position:absolute;${g ? 'right' : 'left'}:3px;top:1px;font-weight:normal;font-size:10px;color:${P.t}`, String(i + 1)));
      ligne.append(tip(s));
    });
    return el('div', 'display:grid;gap:3px;flex:1;min-width:0', nomCamp(c, `text-align:${g ? 'left' : 'right'}`), ligne, troncons(tip, c, { cote: k, h: 4, groupes: true }));
  };
  b.append(sur('left:50%;top:8px;transform:translateX(-50%);width:min(760px,calc(100% - 16px));display:flex;gap:10px;align-items:flex-start',
    vieRegs('nous'), papier('flex:none;padding:3px 8px;margin-top:14px', 'J2'), vieRegs('eux')));
}

export function calqueBarreVie(nom) {
  const f = { actuelle, duel, biseaux, fil, segmentee }[nom];
  return boite => f(boite);
}
