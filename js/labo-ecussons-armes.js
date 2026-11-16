// La planche des écussons par arme (Jérôme, v0.140.1 : « j'aime l'écusson mais propose plusieurs idées d'écussons pour chaque corps d'armée »). Quatre idées par arme (infanterie, chars,
// mitrailleuses, avions, génie) : une forme d'écu et un dessin, montrés à leur taille sur le champ (26 px) et agrandis, intacts, entamés et ébranlés, choisis, et en vignette pour la rangée du bas.
// « Retenir » garde l'idée d'une arme (dans ce navigateur seulement) ; la variante A du sujet (l'écusson sur le champ) dessine alors celles qu'on a retenues. Rien n'est dans le jeu.
// Palette du jeu seulement : bleu horizon, kaki d'en face, os, terre, boue, glaise, et les deux alertes de l'interface. Les insignes historiques cités sont des points de départ, redessinés en quelques traits.
import { PALETTE as P, ALERTES } from './palette.js?v=0.140.1';

const MONO = 'ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace';
const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const poly = (g, pts) => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); };

// ─── les formes : un tracé dans un carré de −13 à 13 (la pointe en bas à 14) ───
const FORMES = {
  ecu: g => poly(g, [-13, -14, 13, -14, 13, 3, 0, 14, -13, 3]),
  blinde: g => poly(g, [-9, -14, 9, -14, 13, -10, 13, 6, 0, 14, -13, 6, -13, -10]),
  carre: g => poly(g, [-10, -13, 10, -13, 13, -10, 13, 10, 10, 13, -10, 13, -13, 10, -13, -10]),
  losange: g => poly(g, [0, -16, 15, 0, 0, 16, -15, 0]),
  rond: g => g.arc(0, 0, 13.5, 0, 2 * Math.PI),
  tour: g => poly(g, [-13, -14, -8, -14, -8, -10, -2.5, -10, -2.5, -14, 2.5, -14, 2.5, -10, 8, -10, 8, -14, 13, -14, 13, 3, 0, 14, -13, 3]),
  casque: g => { g.moveTo(-13, 1); g.arc(0, 1, 13, Math.PI, 0); g.lineTo(13, 4); g.lineTo(0, 14); g.lineTo(-13, 4); g.closePath(); g.rect(-2, -15, 4, 4); },
  aile: g => poly(g, [-9, -14, 9, -14, 9, 4, 0, 14, -9, 4]),
};
// ce qui se dessine derrière l'écu (les ailes de l'écu ailé) et dessus (les rivets du blindé)
const DERRIERE = { aile: g => { for (const s of [-1, 1]) { g.beginPath(); poly(g, [8 * s, -12, 22 * s, -15, 21 * s, -10, 18 * s, -9, 17 * s, -5, 13 * s, -4, 8 * s, 2]); g.fillStyle = P.o; g.fill(); g.lineWidth = 1.5; g.strokeStyle = P.t; g.stroke(); g.beginPath(); g.moveTo(10 * s, -9); g.lineTo(19 * s, -12); g.moveTo(10 * s, -5); g.lineTo(16 * s, -7); g.lineWidth = 1; g.stroke(); } } };
const DESSUS = { blinde: g => { g.fillStyle = P.t; for (const [x, y] of [[-9, -11], [9, -11], [-10, 4], [10, 4]]) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); } } };

// ─── les dessins : centrés en (0, 0), de −10 à 10, à la terre (le fond est la couleur du camp) ───
const rot = (g, a, f) => { g.save(); g.rotate(a); f(); g.restore(); };
const D = {
  casque: g => { g.beginPath(); g.arc(0, 3, 7.5, Math.PI, 0); g.rect(-10, 3, 20, 2.5); g.rect(-1, -6.5, 2, 3); g.fill(); },
  grenade: g => { g.beginPath(); g.arc(0, 4, 5.5, 0, 7); g.fill(); g.beginPath(); poly(g, [-5, 0, -4, -8, -1.5, -1]); poly(g, [-1.5, -1, 0, -11, 1.5, -1]); poly(g, [1.5, -1, 4, -8, 5, 0]); g.fill(); },
  fusil: g => rot(g, -0.75, () => { g.fillRect(-1, -6, 2, 14); g.fillRect(-2, 6, 4, 6); g.beginPath(); poly(g, [-0.7, -6, 0.7, -6, 0, -14]); g.fill(); g.fillRect(-2.5, 1, 5, 1.5); }),
  numero: (g, e) => { g.font = `bold 15px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(e.num ?? 1), 0, -1); },
  charProfil: g => { g.beginPath(); poly(g, [-11, 5, -8, -1, 8, -1, 11, 5]); g.rect(-5, -5.5, 8, 4.5); g.rect(3, -4.5, 7, 1.6); g.fill(); g.fillStyle = P.o; for (let x = -7; x <= 7; x += 3.5) { g.beginPath(); g.arc(x, 3, 1, 0, 7); g.fill(); } },
  armet: g => {
    for (const a of [-0.65, 0.65]) rot(g, a, () => { g.fillRect(-1.4, -12, 2.8, 22); g.fillRect(-2.2, -12, 4.4, 2.5); });
    g.beginPath(); g.arc(0, -1, 6.5, Math.PI, 0); g.rect(-6.5, -1, 13, 7); g.fill();
    g.fillStyle = P.o; g.fillRect(-4.5, 1, 9, 1.2); g.fillRect(-4.5, 3.2, 9, 1.2);
  },
  chenille: g => { g.lineWidth = 2.6; g.beginPath(); g.roundRect(-10, -5, 20, 10, 5); g.stroke(); g.lineWidth = 1.2; for (let x = -6; x <= 6; x += 3) { g.beginPath(); g.moveTo(x, -6.5); g.lineTo(x, -3.5); g.moveTo(x, 3.5); g.lineTo(x, 6.5); g.stroke(); } for (const x of [-5, 0, 5]) { g.beginPath(); g.arc(x, 0, 1.8, 0, 7); g.fill(); } },
  charFace: g => { g.beginPath(); poly(g, [-9, 6, -7, -2, 7, -2, 9, 6]); g.rect(-4, -7, 8, 5); g.fill(); g.fillStyle = P.o; g.beginPath(); g.arc(0, -4.5, 1.6, 0, 7); g.fill(); g.fillRect(-7, 2, 3, 2); g.fillRect(4, 2, 3, 2); },
  trepied: g => { g.fillRect(-10, -5, 15, 2.6); g.fillRect(-3, -7, 7, 6); g.fillRect(4, -6, 3, 4); g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, -1); g.lineTo(-7, 9); g.moveTo(0, -1); g.lineTo(0, 9); g.moveTo(0, -1); g.lineTo(7, 9); g.stroke(); },
  eventail: g => { g.beginPath(); g.moveTo(0, 9); g.arc(0, 9, 18, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); g.closePath(); g.fill(); g.strokeStyle = P.o; g.lineWidth = 1; for (const r of [8, 13]) { g.beginPath(); g.arc(0, 9, r, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45); g.stroke(); } },
  bande: g => { g.fillRect(-11, 3, 22, 2); for (let k = -2; k <= 2; k++) rot(g, k * 0.12, () => { g.fillRect(k * 4.4 - 1.3, -4, 2.6, 7); g.beginPath(); poly(g, [k * 4.4 - 1.3, -4, k * 4.4 + 1.3, -4, k * 4.4, -8]); g.fill(); }); },
  avionDessus: g => { g.fillRect(-1.6, -9, 3.2, 17); g.fillRect(-11, -4, 22, 4); g.fillRect(-4.5, 6, 9, 2.5); },
  helice: g => { for (const a of [0.5, 0.5 + Math.PI]) rot(g, a, () => { g.beginPath(); g.ellipse(0, -5.5, 2.2, 5.5, 0, 0, 7); g.fill(); }); g.beginPath(); g.arc(0, 0, 2.4, 0, 7); g.fill(); },
  cocarde: g => { g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.fillStyle = P.o; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.fillStyle = P.t; g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill(); },
  hirondelle: g => { g.beginPath(); poly(g, [0, -2, -5, -7, -11, -6, -4, 0, -2, 2, -3, 9, 0, 5, 3, 9, 2, 2, 4, 0, 11, -6, 5, -7]); g.fill(); },
  pelle: g => { g.fillRect(-1, -11, 2, 11); g.fillRect(-3, -12, 6, 2); g.beginPath(); poly(g, [-5, 0, 5, 0, 5, 6, 0, 10, -5, 6]); g.fill(); },
  pellePioche: g => {
    rot(g, 0.65, () => { g.fillRect(-1, -11, 2, 12); g.beginPath(); poly(g, [-4, 1, 4, 1, 4, 6, 0, 9, -4, 6]); g.fill(); });
    rot(g, -0.65, () => { g.fillRect(-1, -9, 2, 20); g.beginPath(); g.moveTo(-9, -6); g.quadraticCurveTo(0, -12, 9, -6); g.lineTo(8, -5); g.quadraticCurveTo(0, -9, -8, -5); g.closePath(); g.fill(); });
  },
  cuirasse: g => { g.beginPath(); poly(g, [-7, -1, -4, -3, 4, -3, 7, -1, 6, 10, -6, 10]); g.fill(); g.beginPath(); g.arc(0, -6, 4, Math.PI, 0); g.rect(-6, -6, 12, 1.6); g.rect(-0.6, -11.5, 1.2, 2); g.fill(); g.fillStyle = P.o; g.fillRect(-0.5, 0, 1, 8); },
  pont: g => { g.fillRect(-11, -3, 22, 2.6); g.lineWidth = 2.2; g.beginPath(); g.arc(0, 8, 8, Math.PI, 0); g.stroke(); g.fillRect(-11, -1, 2.4, 10); g.fillRect(8.6, -1, 2.4, 10); },
};

// ─── les idées, par arme : une forme et un dessin ───
export const ARMES = [
  { type: 'reg', nom: 'L\'infanterie (les régiments)', idees: [
    { nom: 'Le casque', forme: 'ecu', dessin: 'casque', note: 'Le casque Adrian : ce que l\'on voit d\'abord d\'un homme. Le numéro dans l\'onglet.' },
    { nom: 'La grenade', forme: 'ecu', dessin: 'grenade', note: 'La grenade à flamme des collets : un insigne plus qu\'une silhouette.' },
    { nom: 'Le numéro', forme: 'ecu', dessin: 'numero', note: 'Le régiment, c\'est son numéro : le chiffre en grand, rien d\'autre. Le plus lisible pour les donner les uns après les autres.' },
    { nom: 'L\'écu-casque', forme: 'casque', dessin: 'numero', note: 'La forme dit l\'arme (un casque), le dedans dit le régiment. Se distingue des engins par la seule forme, de loin.' },
  ] },
  { type: 'char', nom: 'Les chars', idees: [
    { nom: 'Le profil', forme: 'ecu', dessin: 'charProfil', note: 'La silhouette du Schneider de profil, sur le même écu que tous.' },
    { nom: 'L\'armet', forme: 'blinde', dessin: 'armet', note: 'Le heaume sur deux canons croisés : l\'insigne de l\'Artillerie spéciale, la première arme des chars. Écu blindé et riveté.' },
    { nom: 'La chenille', forme: 'carre', dessin: 'chenille', note: 'Un maillon de chenille sur un écu carré : la forme seule dit « engin ».' },
    { nom: 'De face', forme: 'blinde', dessin: 'charFace', note: 'Le char vu de face, la bouche du canon : plus massif, moins lisible petit.' },
  ] },
  { type: 'nid', nom: 'Les mitrailleuses', idees: [
    { nom: 'Le trépied', forme: 'ecu', dessin: 'trepied', note: 'L\'arme sur son trépied, sur le même écu que tous.' },
    { nom: 'Le losange', forme: 'losange', dessin: 'trepied', note: 'Un poste est une place fixe : le losange le dit, comme sur une carte d\'état-major.' },
    { nom: 'L\'éventail', forme: 'ecu', dessin: 'eventail', note: 'Le cône de tir, ce que le poste fait au terrain : le même dessin que sa visée.' },
    { nom: 'La bande', forme: 'ecu', dessin: 'bande', note: 'La bande de cartouches : l\'arme qui mange des munitions (la barre dit la bande).' },
  ] },
  { type: 'avion', nom: 'Les avions', idees: [
    { nom: 'Vu de dessus', forme: 'ecu', dessin: 'avionDessus', note: 'La silhouette vue du ciel, comme la caméra le voit.' },
    { nom: 'L\'écu ailé', forme: 'aile', dessin: 'helice', note: 'Les ailes autour de l\'écu, l\'hélice dedans : l\'insigne des aviateurs, lisible de loin par la seule forme.' },
    { nom: 'La cocarde', forme: 'rond', dessin: 'cocarde', note: 'La cocarde des ailes, en trois anneaux de la palette (pas de bleu-blanc-rouge).' },
    { nom: 'L\'hirondelle', forme: 'ecu', dessin: 'hirondelle', note: 'Un oiseau stylisé, comme sur les fuselages des escadrilles.' },
  ] },
  { type: 'genie', nom: 'Le génie', idees: [
    { nom: 'La pelle', forme: 'ecu', dessin: 'pelle', note: 'L\'outil de chaque sapeur, sur le même écu que tous.' },
    { nom: 'Pelle et pioche', forme: 'ecu', dessin: 'pellePioche', note: 'Les deux outils croisés : l\'emblème des travaux.' },
    { nom: 'Cuirasse et pot-en-tête', forme: 'ecu', dessin: 'cuirasse', note: 'L\'insigne historique du génie français : la cuirasse et le casque des sapeurs de siège.' },
    { nom: 'La tour', forme: 'tour', dessin: 'pont', note: 'Un écu crénelé (le génie bâtit), le pont dedans (ce qu\'il refait le plus souvent).' },
  ] },
];

// ─── les idées retenues (ce navigateur seulement : le labo n'écrit rien ailleurs) ───
const CLE = 'cyclopeen:labo-ecussons';
let retenues = {};
try { retenues = JSON.parse(localStorage.getItem(CLE) ?? '{}') ?? {}; } catch { retenues = {}; }
export const ideeDe = type => { const A = ARMES.find(a => a.type === type); return A?.idees[retenues[type] ?? 0] ?? ARMES[0].idees[0]; };
function retenir(type, k) { retenues[type] = k; try { localStorage.setItem(CLE, JSON.stringify(retenues)); } catch { /* sans stockage, le choix vaut pour la page */ } }

// ─── le dessin d'un écusson, la pointe en (x, y) ───
// e : { idee, x, y, k (l'échelle : 1 = 26 px de large), camp (0 nous, 1 en face), debout, blesses, moral, chev, num, choisi, t, barre (false : sans barre) }
const COULEUR_MORAL = { ebranle: ALERTES.orange, deroute: ALERTES.rouge };
export function dessinerEcusson(g, e) {
  const { idee, x, y, k = 1 } = e, cy = y - 14 * k, couleur = e.camp ? P.x : P.n, forme = FORMES[idee.forme];
  g.save(); g.translate(x, cy); g.scale(k, k);
  DERRIERE[idee.forme]?.(g);
  const trace = () => { g.beginPath(); forme(g); };
  if (e.choisi) { trace(); g.lineWidth = 7 / k; g.strokeStyle = P.t; g.stroke(); g.lineWidth = 4 / k; g.strokeStyle = P.o; g.stroke(); }
  trace(); g.lineWidth = 3 / k; g.strokeStyle = P.t; g.stroke(); g.fillStyle = couleur; g.fill();
  const alerte = COULEUR_MORAL[e.moral];
  if (alerte) { trace(); g.strokeStyle = alerte; g.lineWidth = 2 / k; g.setLineDash(e.moral === 'deroute' ? [3 / k, 3 / k] : [6 / k, 3 / k]); g.lineDashOffset = -(e.t ?? 0) * 10 / k; g.stroke(); g.setLineDash([]); }
  DESSUS[idee.forme]?.(g);
  g.fillStyle = P.t; g.strokeStyle = P.t; g.save(); g.translate(0, idee.forme === 'losange' || idee.forme === 'rond' ? 0 : -1); D[idee.dessin](g, e); g.restore();
  g.restore();
  // le numéro dans un onglet, si le dessin ne le porte pas déjà
  if (e.num && idee.dessin !== 'numero') {
    const ox = x + 10 * k, oy = cy - 18 * k, c = 12 * k;
    g.fillStyle = P.t; g.fillRect(ox - 1, oy - 1, c + 2, c + 2); g.fillStyle = P.o; g.fillRect(ox, oy, c, c);
    g.font = `bold ${Math.round(10 * k)}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = P.t; g.fillText(String(e.num), ox + c / 2, oy + c / 2 + 1);
  }
  if (e.barre === false) return;
  // la barre au-dessus, la même pour tous : debout plein, blessés hachurés, tombés vides ; les chevrons à sa droite
  const w = Math.round(26 * k), bx = Math.round(x - w / 2), by = Math.round(cy - 14 * k - (idee.forme === 'losange' ? 10 : 8) * Math.max(1, k * 0.8) - (idee.forme === 'aile' ? 4 * k : 0));
  const h = Math.max(3, Math.round(3 * k * 0.8));
  g.fillStyle = P.t; g.fillRect(bx - 1, by - 1, w + 2, h + 2); g.fillStyle = P.s; g.fillRect(bx, by, w, h);
  const d = Math.round(w * (e.debout ?? 1)), b = Math.round(w * (e.blesses ?? 0));
  g.fillStyle = couleur; g.fillRect(bx, by, d, h); for (let j = 0; j < b; j += 2) g.fillRect(bx + d + j, by, 1, h);
  g.fillStyle = P.o; g.strokeStyle = P.t; g.lineWidth = 1;
  for (let j = 0; j < (e.chev ?? 0); j++) { const cx = bx + w + 3 + j * 6; g.beginPath(); g.moveTo(cx, by + 4); g.lineTo(cx + 2.5, by); g.lineTo(cx + 5, by + 4); g.closePath(); g.fill(); g.stroke(); }
}

// ─── la planche ───
// un bout de champ : de la boue, des mottes de terre, quelques touffes de glaise (tirés d'un hachage : la même planche à chaque fois)
function champ(g, w, h, graine = 1) {
  g.fillStyle = P.s; g.fillRect(0, 0, w, h);
  let s = graine * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < w * h / 90; i++) { g.fillStyle = r() < 0.6 ? P.t : r() < 0.5 ? P.b : P.g; g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2 + Math.floor(r() * 3), 2); }
}
// une carte d'idée : à gauche agrandie, au milieu à la taille du champ (intacte, entamée et ébranlée, choisie, en face), à droite la vignette de la rangée du bas
function carteIdee(A, idee, k, majTout) {
  const cv = el('canvas', 'display:block;width:100%;max-width:360px;image-rendering:auto'); cv.width = 360; cv.height = 128;
  const g = cv.getContext('2d');
  champ(g, 268, 128, k + A.type.length);
  const base = { idee, num: A.type === 'reg' ? 3 : undefined, chev: 1, debout: 1, blesses: 0 };      // (seul un régiment a un numéro)
  dessinerEcusson(g, { ...base, x: 62, y: 116, k: idee.forme === 'aile' ? 2.1 : 2.6, chev: 2, debout: 0.8, blesses: 0.1 });
  dessinerEcusson(g, { ...base, x: 128, y: 58, k: 1 });
  dessinerEcusson(g, { ...base, x: 186, y: 58, k: 1, debout: 0.45, blesses: 0.2, moral: A.type === 'reg' ? 'ebranle' : undefined, chev: 0 });
  dessinerEcusson(g, { ...base, x: 128, y: 116, k: 1, choisi: true });
  dessinerEcusson(g, { ...base, x: 186, y: 116, k: 1, camp: 1, num: A.type === 'reg' ? 3 : undefined, chev: 0, debout: 0.7 });
  // la vignette : 46 × 54, sur l'os, le liseré du camp en haut
  const vx = 290, vy = 36;
  g.fillStyle = P.t; g.fillRect(vx + 3, vy + 3, 46, 54); g.fillStyle = P.o; g.fillRect(vx, vy, 46, 54); g.fillStyle = P.n; g.fillRect(vx, vy, 46, 3);
  dessinerEcusson(g, { ...base, x: vx + 21, y: vy + 49, k: 1.05, chev: 2, debout: 0.8, blesses: 0.1 });
  g.font = `10px ${MONO}`; g.fillStyle = P.r; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('×2,6', 4, 12); g.fillText('au champ', 112, 12); g.fillText('en bas', vx, vy - 6);
  const choisi = (retenues[A.type] ?? 0) === k;
  const bouton = el('button', ''); bouton.className = 'essai'; bouton.textContent = choisi ? 'Retenu' : 'Retenir'; bouton.setAttribute('aria-pressed', String(choisi));
  bouton.onclick = () => { retenir(A.type, k); majTout(); };
  return el('figure', `margin:0;padding:8px;background:${choisi ? P.o : '#fff'};border:${choisi ? `2px solid ${P.t}` : '1px solid rgba(0,0,0,.15)'};border-radius:6px`,
    cv, el('figcaption', `font:13px/1.4 ${MONO};margin:6px 0`, el('b', '', `${k + 1} · ${idee.nom}`), el('br'), el('span', 'opacity:.8', idee.note)), bouton);
}
// l'ensemble retenu : un bout de front (nos régiments et ceux d'en face, un char, un poste, un avion en l'air, une section du génie), puis la rangée du bas
function ensemble(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height; champ(g, W, H, 7);
  g.fillStyle = P.b; g.fillRect(0, 60, W, 3); g.fillRect(0, 150, W, 3);       // deux tranchées, pour situer
  const de = t => ideeDe(t);
  [[60, 'tient', 1, 0], [150, 'ebranle', 2, 0.15], [240, 'tient', 3, 0.05], [330, 'deroute', 4, 0.2]].forEach(([x, moral, num, bl], i) =>
    dessinerEcusson(g, { idee: de('reg'), x, y: 140, num, moral, debout: 1 - bl * 3, blesses: bl, chev: i % 3, choisi: i === 0 }));
  [[90, 1], [200, 2], [300, 3]].forEach(([x, num]) => dessinerEcusson(g, { idee: de('reg'), x, y: 52, num, camp: 1, debout: 0.8 }));
  dessinerEcusson(g, { idee: de('char'), x: 420, y: 120, chev: 1, debout: 0.7 });
  dessinerEcusson(g, { idee: de('nid'), x: 480, y: 150, debout: 0.9 });
  dessinerEcusson(g, { idee: de('avion'), x: 560, y: 90, debout: 0.6, chev: 2 });
  dessinerEcusson(g, { idee: de('genie'), x: 630, y: 175, debout: 1 });
  dessinerEcusson(g, { idee: de('char'), x: 520, y: 40, camp: 1, debout: 0.5 });
  // la rangée du bas
  const L = 46, Hv = 54, y0 = H - Hv - 10;
  const items = [1, 2, 3, 4].map(n => ({ t: 'reg', num: n })).concat(['char', 'nid', 'avion', 'genie'].map(t => ({ t })));
  items.forEach((it, i) => {
    const x = 10 + i * (L + 6);
    g.fillStyle = P.t; g.fillRect(x + 3, y0 + 3, L, Hv); g.fillStyle = i === 0 ? P.t : P.o; g.fillRect(x, y0, L, Hv); g.fillStyle = P.n; g.fillRect(x, y0, L, 3);
    dessinerEcusson(g, { idee: de(it.t), x: x + 21, y: y0 + Hv - 5, k: 1.05, num: it.num, debout: 1 - i * 0.07, chev: i % 3 });
  });
}

export function plancheEcussons(stage) {
  const tete = el('p', `font:13px/1.5 ${MONO};max-width:760px`, 'Quatre idées par arme. Chaque carte montre l\'écusson agrandi (×2,6), puis à sa taille sur le champ : intact, entamé (ébranlé pour un régiment), choisi, en face ; à droite, la vignette de la rangée du bas. « Retenir » garde une idée par arme dans ce navigateur : l\'ensemble en bas de page et la variante A (sur le champ) les dessinent.');
  const corps = el('div');
  const vue = el('canvas', 'display:block;width:100%;max-width:700px;margin-top:8px;border:1px solid rgba(0,0,0,.15)'); vue.width = 700; vue.height = 260;
  function majTout() {
    corps.replaceChildren(...ARMES.map(A => el('section', 'margin:18px 0',
      el('h3', `font:600 15px ${MONO};margin:0 0 8px`, A.nom),
      el('div', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px', ...A.idees.map((idee, k) => carteIdee(A, idee, k, majTout))))));
    ensemble(vue);
  }
  majTout();
  stage.append(tete, corps, el('h3', `font:600 15px ${MONO};margin:24px 0 0`, 'L\'ensemble retenu'), vue);
}
