// Le sujet « Les unités sur le champ : un seul signe » du labo (Jérôme, v0.140.0 : « les chars, les avions et les mitrailleuses ont une UI semblable (cercle avec barre de vie), les barres de
// sélection des régiments sont complètement différentes » ; « des cartes plus parlantes et plus légères », d'après une capture d'un jeu de stratégie : un écusson au-dessus de chaque unité, son
// pictogramme, une barre fine, et en bas une rangée de vignettes). Trois façons de donner le même signe à tout ce qu'on commande (régiment, char, poste, avion, génie), sur le champ ET dans la rangée
// du bas : l'écusson, le jeton, le fanion. Posé sur le moteur en direct, comme `labo-engins-ennemis.js` : un calque 2D qui ne lit que les positions (`versEcran`). Rien ici ne modifie le jeu ; la scène
// seule est truquée (des états de moral, des pertes, deux chars). Palette du jeu seulement : bleu horizon, kaki d'en face, os, terre, boue, brume, et les deux alertes de l'interface (ébranlé, déroute).
import { PALETTE as P, ALERTES } from './palette.js?v=0.149.2';
import { NIDS } from './data/nids.js?v=0.149.2';
import { dessinerEcusson, ideeDe } from './labo-ecussons-armes.js?v=0.149.2';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace';
// la scène truquée, par rang du régiment dans son camp : la part des hommes debout, des blessés, le moral, les chevrons
const FAUX = [
  { debout: 1, blesses: 0, moral: 'tient', chev: 1 }, { debout: 0.62, blesses: 0.14, moral: 'ebranle', chev: 2 }, { debout: 0.85, blesses: 0.05, moral: 'tient', chev: 0 },
  { debout: 0.3, blesses: 0.2, moral: 'deroute', chev: 3 }, { debout: 0.9, blesses: 0.04, moral: 'tient', chev: 1 }, { debout: 0.5, blesses: 0.1, moral: 'tient', chev: 2 },
];
const COULEUR_MORAL = { ebranle: ALERTES.orange, deroute: ALERTES.rouge };

// les pictogrammes : un dessin de 16 × 16 centré sur (0, 0), la même forme sur le champ et dans la rangée du bas
const PICTOS = {
  reg: new Path2D('M-6 2a6 6 0 0 1 12 0zM-8 2h16v2h-16z'),                                   // le casque : l'infanterie
  char: new Path2D('M-8 5l2-3h10l4 3zM-5 2v-4h8l2 4zM2-2h7v1.5h-7z'),                         // la coque, la casemate, le canon
  nid: new Path2D('M-7-2h11v2h-11zM4-3h3v4h-3zM-2 0l-3 6h1.5l2.5-5 2.5 5h1.5l-3-6z'),          // le canon sur son trépied
  avion: new Path2D('M-1-7h2v4h7v2.5h-7v4h3v2h-8v-2h3v-4h-7v-2.5h7z'),
  genie: new Path2D('M-1-7h2v8h-2zM-4 1h8v3l-4 3-4-3z'),                                      // la pelle
};

function monterScene(ctx) {
  const { B, rendu } = ctx, nids = B.etat.nids.filter(n => n.camp === 0).sort((a, b) => a.x - b.x);
  nids.forEach((n, i) => { n.pv = Math.round(NIDS.pv * [1, 0.5, 0.2, 0.8][i % 4]); });
  const mk = (id, camp, x, y, v) => ({ id, camp, modele: 'schneider', x, y, dx0: x, tx: x, ty: y, chemin: null, k: 0, pv: Math.round(40 * v), pvMax: 40, exp: 0.5, canonT: 0, cible: null, vise: null, etat: 'arrive', v: 0, hx: 0, hy: camp ? 1 : -1, cap: camp ? Math.PI / 2 : -Math.PI / 2 });
  const A = B.armee; let x = 0, y = 0, n = 0;
  for (let i = 0; i < A.n; i++) if (B.etat.regiments[A.reg[i]]?.camp === 0) { x += A.x[i]; y += A.y[i]; n++; }
  if (n) { x /= n; y /= n; B.etat.chars.push(mk(900, 0, x - 26, y - 14, 0.7), mk(901, 0, x + 30, y - 12, 0.35)); rendu.vue.cx = x; rendu.vue.cz = y - 18; }
}

// ce que le calque voit : tout ce qu'on commande (et les régiments d'en face), sa place à l'écran, son état
function unites(ctx, memoire) {
  const { B, rendu } = ctx, A = B.armee, sortie = [], rang = [0, 0];
  const poser = (cle, d) => { const m = memoire.get(cle) ?? { surv: 0 }; memoire.set(cle, m); sortie.push({ cle, m, ...d }); };
  for (const r of B.etat.regiments) {
    const k = rang[r.camp]++, f = FAUX[k % FAUX.length];
    let x = 0, y = 0, n = 0, haut = 1e9;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === r.id) { const [sx, sy] = rendu.versEcran(A.x[i], A.y[i], rendu.hauteurSol(A.x[i], A.y[i]) + 1.7); if (sx < -1e4) continue; x += sx; n++; haut = Math.min(haut, sy); y += sy; }
    if (!n) continue;
    poser(`r${r.id}`, { type: 'reg', camp: r.camp, sx: Math.round(x / n), sy: Math.round(haut) - 6, num: k + 1, nom: r.camp ? `Régiment ${k + 1} d'en face` : r.nom, choisi: r.camp === 0 && k === 0, ...f, moral: r.camp ? 'tient' : f.moral });
  }
  const pt = (x, y, h) => rendu.versEcran(x, y, rendu.hauteurSol(x, y) + h);
  for (const c of B.etat.chars) { const [sx, sy] = pt(c.x, c.y, 3.5); if (sx > -1e4) poser(`c${c.id}`, { type: 'char', camp: c.camp, sx: Math.round(sx), sy: Math.round(sy), debout: c.pv / c.pvMax, blesses: 0, moral: 'tient', chev: 1, nom: 'Char Schneider' }); }
  for (const n of B.etat.nids) if (n.camp === 0 && n.etat !== 'detruit') { const [sx, sy] = pt(n.x, n.y, 2.5); if (sx > -1e4) poser(`n${n.id}`, { type: 'nid', camp: 0, sx: Math.round(sx), sy: Math.round(sy), debout: n.pv / NIDS.pv, blesses: 0, moral: 'tient', chev: 0, nom: 'Mitrailleuse' }); }
  return sortie;
}

// ─── des gestes de dessin ───
const camp = e => e.camp ? P.x : P.n;
function barre(g, x, y, w, h, e) {                   // la même barre pour tous : debout plein, blessés hachurés, tombés vides ; un liseré de terre
  g.fillStyle = P.t; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = P.s; g.fillRect(x, y, w, h);
  const d = Math.round(w * e.debout), b = Math.round(w * e.blesses);
  g.fillStyle = camp(e); g.fillRect(x, y, d, h);
  for (let k = 0; k < b; k += 2) g.fillRect(x + d + k, y, 1, h);
}
function chevrons(g, x, y, n) { g.fillStyle = P.o; g.strokeStyle = P.t; g.lineWidth = 1; for (let k = 0; k < n; k++) { g.beginPath(); g.moveTo(x + k * 6, y + 4); g.lineTo(x + 2.5 + k * 6, y); g.lineTo(x + 5 + k * 6, y + 4); g.closePath(); g.fill(); g.stroke(); } }
function picto(g, type, cx, cy, k, couleur) { g.save(); g.translate(cx, cy); g.scale(k, k); g.fillStyle = couleur; g.fill(PICTOS[type]); g.restore(); }
function numero(g, n, cx, cy, taille, couleur) { g.font = `bold ${taille}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = couleur; g.fillText(String(n), cx, cy + 1); }
function etiquette(g, e, y) {                        // au survol : le nom et l'effectif, sous le signe
  if (e.m.surv < 0.5) return;
  const s = `${e.nom} · ${Math.round(e.debout * 100)} %`; g.font = `11px ${MONO}`; const w = Math.ceil(g.measureText(s).width) + 10;
  g.fillStyle = P.t; g.fillRect(e.sx - w / 2 + 2, y + 2, w, 16); g.fillStyle = P.o; g.fillRect(e.sx - w / 2, y, w, 16);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = P.t; g.fillText(s, e.sx, y + 9);
}
const alerte = (g, e, t) => { const c = COULEUR_MORAL[e.moral]; if (!c) return false; g.strokeStyle = c; g.lineWidth = 2; g.setLineDash(e.moral === 'deroute' ? [3, 3] : [6, 3]); g.lineDashOffset = -t * 10; return true; };

// A · l'écusson : un bouclier à la couleur du camp, le dessin de l'arme, la barre fine au-dessus, les chevrons à droite de la barre ; un régiment porte son numéro (v0.140.1 : la forme et le dessin
// de chaque arme sont ceux retenus dans la planche, variante D : `labo-ecussons-armes.js`)
function ecusson(g, e, t, s = 1) {
  dessinerEcusson(g, { ...e, idee: ideeDe(e.type), x: e.sx, y: e.sy, k: s * (1 + 0.25 * e.m.surv), t });
  etiquette(g, e, e.sy + 4);
}
// B · le jeton : le rond des engins d'aujourd'hui (cœur à la couleur du camp, arc de vie autour) étendu aux régiments : le numéro au cœur ; un engin garde son pictogramme
function jeton(g, e, t, s = 1) {
  const k = s * (1 + 0.3 * e.m.surv), r = 11 * k, cx = e.sx, cy = e.sy - r - 2;
  g.beginPath(); g.arc(cx, cy, r + 3, 0, 7); g.fillStyle = e.choisi ? P.o : P.t; g.fill();
  g.beginPath(); g.arc(cx, cy, r - 3.5, 0, 7); g.fillStyle = camp(e); g.fill();
  g.lineWidth = 3; g.strokeStyle = P.s; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.strokeStyle = camp(e); g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * e.debout); g.stroke();
  if (e.blesses) { g.setLineDash([1.5, 1.5]); g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2 + 2 * Math.PI * e.debout, -Math.PI / 2 + 2 * Math.PI * (e.debout + e.blesses)); g.stroke(); g.setLineDash([]); }
  if (alerte(g, e, t)) { g.beginPath(); g.arc(cx, cy, r + 3.5, 0, 7); g.stroke(); g.setLineDash([]); }
  if (e.num) numero(g, e.num, cx, cy, 11 * k, P.t); else picto(g, e.type, cx, cy, k * 0.7, P.t);
  chevrons(g, cx - e.chev * 3, cy - r - 9, e.chev);
  etiquette(g, e, e.sy + 4);
}
// C · le fanion : un mât planté au-dessus de l'unité, dont la hampe est la barre (elle se vide de haut en bas), la toile à la couleur du camp porte le numéro ou le pictogramme ; en déroute, la toile pend
function fanion(g, e, t, s = 1) {
  const k = s * (1 + 0.25 * e.m.surv), H = 30 * k, w = 20 * k, h = 15 * k, x = e.sx, y = e.sy - H;
  g.fillStyle = P.t; g.fillRect(x - 2, y - 1, 5, H + 2); g.fillStyle = P.s; g.fillRect(x - 1, y, 3, H);
  const d = Math.round(H * e.debout), b = Math.round(H * e.blesses);
  g.fillStyle = camp(e); g.fillRect(x - 1, y + H - d, 3, d); for (let j = 0; j < b; j += 2) g.fillRect(x - 1, y + H - d - j - 1, 3, 1);
  const pend = e.moral === 'deroute' ? 0.45 : e.moral === 'ebranle' ? 0.2 : 0;
  const toile = () => { g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 2 + w, y + h * pend); g.lineTo(x + 2 + w * 0.8, y + h / 2 + h * pend); g.lineTo(x + 2 + w, y + h + h * pend); g.lineTo(x + 2, y + h); g.closePath(); };
  if (e.choisi) { g.lineWidth = 7; g.strokeStyle = P.t; toile(); g.stroke(); g.lineWidth = 4; g.strokeStyle = P.o; g.stroke(); }
  g.lineWidth = 3; g.strokeStyle = P.t; toile(); g.stroke(); g.fillStyle = camp(e); g.fill();
  if (alerte(g, e, t)) { toile(); g.stroke(); g.setLineDash([]); }
  if (e.num) numero(g, e.num, x + 2 + w * 0.4, y + h / 2 + h * pend / 2, 11 * k, P.t); else picto(g, e.type, x + 2 + w * 0.4, y + h / 2, k * 0.65, P.t);
  chevrons(g, x + 4, y - 7, e.chev);
  etiquette(g, e, e.sy + 4);
}
const DESSINS = { ecusson, jeton, fanion };
const AIDES = {
  ecusson: 'Un bouclier par unité : sa couleur dit le camp, son dessin dit l\'arme, sa barre dit ses hommes.',
  jeton: 'Le rond des engins d\'aujourd\'hui, étendu aux régiments : l\'arc est la barre.',
  fanion: 'Un fanion planté : la hampe est la barre, la toile pend quand le régiment fléchit.',
};

// la rangée du bas : une vignette par unité à nous, le même signe que sur le champ, sa barre, rien à lire (le nom vient au survol) ; en face de la carte d'aujourd'hui (118 × 76 px, trois lignes de texte)
function rangee(g, nom, liste, W, H, t, souris) {
  const L = 46, HAUT = 54, ecart = 6, x0 = 12, y0 = H - HAUT - 12;
  const miens = liste.filter(e => e.camp === 0).sort((a, b) => (a.type === 'reg' ? 0 : 1) - (b.type === 'reg' ? 0 : 1) || (a.num ?? 0) - (b.num ?? 0));
  let surv = null;
  miens.forEach((e, i) => {
    const x = x0 + i * (L + ecart); if (x + L > W - 12) return;
    const dessus = souris && souris.x >= x && souris.x <= x + L && souris.y >= y0 && souris.y <= y0 + HAUT; if (dessus) surv = e;
    g.fillStyle = P.t; g.fillRect(x + 3, y0 + 3, L, HAUT); g.fillStyle = e.choisi ? P.t : dessus ? P.g : P.o; g.fillRect(x, y0, L, HAUT);
    g.fillStyle = camp(e); g.fillRect(x, y0, L, 3);
    DESSINS[nom](g, { ...e, sx: x + (nom === 'fanion' ? L / 2 - 9 : L / 2 - (e.num && nom === 'ecusson' ? 3 : 0)), sy: y0 + HAUT - (nom === 'jeton' ? 8 : 6), choisi: false, m: { surv: 0 } }, t, 1);
  });
  return surv;
}

// le calque : même contrat que `calqueEnnemis` (boîte, ctx) → arrêt
export function calqueEcussons(nom) {
  return (boiteDom, ctx) => {
    const cv = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none');
    const aide = el('div', `position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:3px 8px;background:${P.o};color:${P.t};font:11px ${MONO};box-shadow:3px 3px 0 ${P.t};pointer-events:none;white-space:nowrap`, `${AIDES[nom]} Passez la souris sur un signe.`);
    boiteDom.append(cv, aide);
    const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const memoire = new Map(); let souris = null, pret = false, raf = 0, partie = true, avant = 0;
    const bouge = ev => { const r = boiteDom.getBoundingClientRect(); souris = { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    const quitte = () => { souris = null; };
    boiteDom.addEventListener('pointermove', bouge); boiteDom.addEventListener('pointerleave', quitte);
    function boucle(now) {
      const dt = Math.min(0.1, (now - avant) / 1000), t = reduit ? 0 : now / 1000; avant = now;
      if (ctx.rendu && ctx.B) {
        if (!pret) { monterScene(ctx); pret = true; }
        const r = boiteDom.getBoundingClientRect();
        if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
        const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
        const liste = unites(ctx, memoire);
        let proche = null, d0 = 26;
        if (souris) for (const e of liste) { const d = Math.hypot(souris.x - e.sx, souris.y - (e.sy - 14)); if (d < d0) { d0 = d; proche = e; } }
        const duBas = rangee(g, nom, liste, cv.width, cv.height, t, souris);       // la vignette survolée allume aussi son unité sur le champ
        for (const e of liste) { const but = e === proche || e === duBas ? 1 : 0; e.m.surv += (but - e.m.surv) * (reduit ? 1 : Math.min(1, dt * 12)); if (Math.abs(but - e.m.surv) < 0.01) e.m.surv = but; }
        for (const e of liste.sort((a, b) => a.sy - b.sy)) { g.save(); DESSINS[nom](g, e, t); g.restore(); }
      }
      if (partie) raf = requestAnimationFrame(boucle);
    }
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); boiteDom.removeEventListener('pointermove', bouge); boiteDom.removeEventListener('pointerleave', quitte); };
  };
}
