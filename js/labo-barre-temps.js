// Le sujet « La barre du temps » du labo : cinq mises en page de ce que dit le billet du haut à gauche (le jour, l'heure, la météo), posées
// sur le champ en direct, sous les boutons de vitesse. Une frise de la bataille entière : chaque jour est un jour (clair) puis sa nuit
// (sombre), un repère dit où l'on est, et dessous les changements de météo. La météo des jours à venir ne se montre pas (le jeu ne la
// connaît qu'à moitié) : le jour même est sûr, demain est une prévision (au trait, juste sept fois sur dix), le reste est vide.
// Rien ici ne lit ni ne modifie le jeu : des données d'exemple, la palette du jeu (js/palette.js), aucune couleur de plus.
import { PALETTE as P } from './palette.js?v=0.59.0';
import { ICONES_METEO } from './hud/meteo-icones.js?v=0.59.0';
import { METEO } from './data/meteo.js?v=0.59.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:13px/1.4 ui-monospace,monospace;';
const PAPIER = `background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};`;

// une situation d'exemple : jour 2 sur 11, 9 h 30 ; la chaîne des jours (la vraie, que le joueur ne connaît pas encore)
const S = { jour: 2, jours: 11, heure: 9, minute: 30, meteo: ['sec', 'sec', 'brouillard', 'pluie', 'pluie', 'sec', 'sec', 'gel', 'gel', 'pluie', 'sec'], previsionJuste: true };
const hh = `${S.heure} h ${String(S.minute).padStart(2, '0')}`;
const fond = { sec: P.h, pluie: P.e, brouillard: P.r, gel: P.o };
// ce que le joueur sait du jour k (0-based) : 'sur' (passé et présent), 'prevu' (demain), null (rien)
const savoir = k => k <= S.jour - 1 ? 'sur' : k === S.jour ? 'prevu' : null;
// le jour qui change la météo : on ne montre que les changements (le premier jour compte)
const change = k => savoir(k) && (k === 0 || S.meteo[k] !== S.meteo[k - 1]);
// où l'on est, de 0 à 1 le long des jours (chaque jour : 12 h de jour, 12 h de nuit ; le jour commence à 6 h)
const ici = (S.jour - 1 + (S.heure + S.minute / 60 - 6) / 24) / S.jours;

const icone = (m, taille = 16, couleur = P.t, pointille = false) => {
  const e = el('span', `display:inline-block;width:${taille}px;height:${taille}px;vertical-align:middle;flex:none`);
  e.innerHTML = `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${pointille ? 'stroke-dasharray="2.5 3"' : ''}>${ICONES_METEO[m]}</svg>`;
  e.title = METEO[m].nom;
  return e;
};
// la frise : jour clair, nuit sombre, jours finis un ton plus bas (les jours d'avant ne comptent plus qu'en mémoire)
function frise(l, h, { fini = true } = {}) {
  const f = el('div', `position:relative;width:${l}px;height:${h}px;background:${P.t};outline:1px solid ${P.t}`);
  for (let k = 0; k < S.jours; k++) {
    const x = k / S.jours * l, w = l / S.jours;
    f.append(el('i', `position:absolute;left:${x}px;top:0;width:${w / 2}px;height:100%;background:${fini && k < S.jour - 1 ? P.g : P.o}`));
  }
  f.append(el('i', `position:absolute;left:${ici * l - 1}px;top:-3px;width:2px;height:${h + 6}px;background:${P.n};outline:1px solid ${P.t}`));
  return f;
}
const repere = (l, h) => { const r = el('div', `position:absolute;left:${ici * l - 4}px;top:${h}px;width:0;height:0;border:4px solid transparent;border-bottom:5px solid ${P.t};border-top:0`); return r; };
const grise = (etat) => etat === 'prevu';
const ligneTexte = (css = '') => el('div', css, `Jour ${S.jour} sur ${S.jours} · ${hh} · ${METEO[S.meteo[S.jour - 1]].nom}`);

// le contexte : les boutons de menu et de vitesse (maquette, comme dans le jeu), sous lesquels vient la barre
function contexte(b) {
  const bouton = (t, w = 44) => el('div', `width:${w}px;height:44px;display:grid;place-items:center;background:${P.t};color:${P.o};${MONO}`, t);
  const vit = el('div', `display:flex;gap:3px;padding:3px;height:44px;box-sizing:border-box;${PAPIER}`, ['II', '×1', '×2', '×4'].map((t, k) => el('div', `width:36px;display:grid;place-items:center;${k === 1 ? `background:${P.t};color:${P.o}` : ''}`, t)));
  b.append(el('div', 'position:absolute;left:8px;top:8px;display:flex;gap:8px;align-items:flex-start', bouton('II'), bouton('⚙'), vit));
}
const poser = (b, css, ...kids) => { const e = el('div', `position:absolute;left:8px;top:60px;${css}`, kids); b.append(e); return e; };

// A · l'actuelle : quatre lignes de texte, aucune frise
function actuelle(b) {
  contexte(b);
  poser(b, `${PAPIER}padding:6px 10px;max-width:40ch`, ligneTexte(), el('div', `color:${P.g}`, 'Demain : du brouillard, dit-on'), el('div', `color:${P.g}`, 'Prendre leur première ligne · réserve : 4'), el('div', `color:${P.g}`, 'Sol sec ▬▬ 100 %'));
}

// B · la frise continue : le jour sur une ligne, une frise de la bataille dessous, les changements de météo sous la frise
function continue_(b) {
  contexte(b);
  const L = 288, p = poser(b, `${PAPIER}padding:6px 10px 6px`, ligneTexte('margin-bottom:6px'));
  const z = el('div', `position:relative;width:${L}px;height:10px`, frise(L, 10), repere(L, 14));
  const m = el('div', `position:relative;width:${L}px;height:22px;margin-top:10px`);
  for (let k = 0; k < S.jours; k++) if (change(k)) { const g = icone(S.meteo[k], 18, P.t, grise(savoir(k))); g.style.cssText += `;position:absolute;left:${k / S.jours * L}px;top:0`; m.append(g); }
  p.append(z, m, el('div', `color:${P.g};font-size:12px`, 'Prendre leur première ligne · réserve : 4'));
}

// C · les jours en cases : une case par jour, la case du jour s'ouvre sur ses heures ; la météo ne se dit qu'au changement
function cases(b) {
  contexte(b);
  const p = poser(b, `${PAPIER}padding:6px 8px`, ligneTexte('margin-bottom:6px'));
  const rang = el('div', 'display:flex;gap:2px;align-items:stretch');
  for (let k = 0; k < S.jours; k++) {
    const ouvert = k === S.jour - 1, pass = k < S.jour - 1;
    const c = el('div', `display:grid;gap:2px;justify-items:center;width:${ouvert ? 90 : 20}px;color:${pass ? P.g : P.t}`);
    const j = el('div', `position:relative;display:flex;width:100%;height:14px;outline:1px solid ${P.t};background:${P.t}`, el('i', `flex:1;background:${pass ? P.g : P.o}`), el('i', `flex:1;background:${P.t}`));
    if (ouvert) j.append(el('i', `position:absolute;left:${(S.heure + S.minute / 60 - 6) / 24 * 100 - 1}%;top:-3px;width:2px;height:20px;background:${P.n};outline:1px solid ${P.t}`));
    c.append(el('span', 'font-size:10px;line-height:1', `${k + 1}`), j, change(k) ? icone(S.meteo[k], 14, pass ? P.g : P.t, grise(savoir(k))) : el('span', 'height:14px;line-height:14px;color:' + P.g, savoir(k) ? '·' : ''));
    rang.append(c);
  }
  p.append(rang, el('div', `color:${P.g};font-size:12px;margin-top:4px`, 'Prendre leur première ligne · réserve : 4'));
}

// D · la bande météo : la frise est elle-même colorée par le temps de chaque jour ; la nuit est une barre sombre dessous ; le texte suit le repère
function bande(b) {
  contexte(b);
  const L = 247, p = poser(b, `${PAPIER}padding:6px 8px 8px;width:263px;box-sizing:border-box`);
  const haut = el('div', `position:relative;width:${L}px;height:20px;margin-bottom:2px`);
  haut.append(el('div', `position:absolute;left:${Math.min(Math.max(ici * L - 56, 0), L - 112)}px;top:0;width:112px;text-align:center;white-space:nowrap`, `J${S.jour}/${S.jours} · ${hh}`));
  const meteo = el('div', `position:relative;display:flex;width:${L}px;height:16px;outline:1px solid ${P.t}`);
  for (let k = 0; k < S.jours; k++) {
    const s = savoir(k), m = S.meteo[k];
    meteo.append(el('i', `flex:1;display:block;background:${s ? fond[m] : P.o};${s === 'prevu' ? `background-image:repeating-linear-gradient(135deg,${P.o} 0 3px,transparent 3px 6px);background-color:${fond[m]}` : ''};${k ? `border-left:1px solid ${P.t}` : ''}`));
  }
  const nuit = el('div', `position:relative;width:${L}px;height:6px;margin-top:2px;background:${P.t}`);
  for (let k = 0; k < S.jours; k++) nuit.append(el('i', `position:absolute;left:${k / S.jours * L}px;top:0;width:${L / S.jours / 2}px;height:100%;background:${k < S.jour - 1 ? P.g : P.o}`));
  nuit.append(el('i', `position:absolute;left:${ici * L - 1}px;top:-24px;width:2px;height:${24 + 6 + 2}px;background:${P.n};outline:1px solid ${P.t}`));
  const ch = el('div', `position:relative;width:${L}px;height:20px;margin-top:3px`);
  for (let k = 0; k < S.jours; k++) if (change(k)) { const g = icone(S.meteo[k], 16, P.t, grise(savoir(k))); g.style.cssText += `;position:absolute;left:${k / S.jours * L + 1}px;top:0`; ch.append(g); }
  p.append(haut, meteo, nuit, ch, el('div', `color:${P.g};font-size:12px;margin-top:2px`, 'Prendre leur première ligne · réserve : 4'), el('div', `color:${P.g};font-size:12px`, 'Sol sec ▬▬ 100 %'));
}

// E · une seule ligne : le jour et l'heure à côté des boutons de vitesse, une règle de deux pixels dessous ; presque rien à l'écran
function ligne(b) {
  contexte(b);
  const L = 228, e = el('div', `position:absolute;left:268px;top:8px;height:44px;box-sizing:border-box;padding:5px 10px 0;${PAPIER}`);
  const t = el('div', 'display:flex;gap:8px;align-items:center;white-space:nowrap', `J${S.jour}/${S.jours} · ${hh}`, icone(S.meteo[S.jour - 1], 16), el('span', `color:${P.g}`, '→'), icone('brouillard', 16, P.t, true));
  const r = el('div', `position:relative;width:${L}px;height:6px;margin-top:5px`, frise(L, 5), repere(L, 5));
  r.firstChild.style.outline = 'none';
  e.append(t, r);
  b.append(e);
}

const VARIANTES = { actuelle, continue: continue_, cases, bande, ligne };
export const calqueBarre = v => VARIANTES[v];
