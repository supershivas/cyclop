// Le sujet « Les engins d'en face sur le champ » du labo (Jérôme, v0.115.0 : « la fenêtre de la mitrailleuse ennemie et du char ennemi est trop prégnante pour l'intérêt »).
// Les chars et les postes de mitrailleuse d'en face portent une étiquette (nom, pourcentage, barre) aussi grosse que celles des nôtres, qui ont des ordres à recevoir : trop pour un engin qu'on ne commande pas.
// Six façons de les rendre visibles et lisibles (opérationnel ou détruit, plus ou moins abîmé) sans qu'ils pèsent : trois « barres fines sans texte », trois « pastilles qui grandissent au survol »,
// et l'étiquette actuelle en référence. Posé sur le moteur en direct (les vrais hommes, le vrai sol), comme `labo-moral.js` : un calque 2D par-dessus qui lit seulement les positions (`versEcran`).
// Rien ici ne modifie le jeu ; la scène seule est truquée (quatre postes d'en face : intact, entamé, presque détruit, détruit ; quatre chars de même). Palette du jeu seulement : le kaki d'en face, l'os, la terre, la brume.
import { PALETTE as P } from './palette.js?v=0.118.0';
import { NIDS } from './data/nids.js?v=0.118.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = '11px ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace';
const VIES = [1, 0.55, 0.15, 0];           // intact, entamé, presque détruit, détruit (la scène les distribue aux quatre postes et aux quatre chars)

// ─── la scène : des engins d'en face dans le champ de la vue ───────────────────────────────────────────────────────────────────────────────
function monterScene(ctx) {
  const { B, rendu } = ctx, nids = B.etat.nids.filter(n => n.camp === 1).sort((a, b) => a.x - b.x);
  nids.forEach((n, i) => { const v = VIES[i % 4]; n.pv = Math.round(NIDS.pv * v); if (v === 0) { n.pv = 0; n.etat = 'detruit'; } });
  const mk = (id, x, y, v) => ({ id, camp: 1, modele: 'schneider', x, y, dx0: x, tx: x, ty: y, chemin: null, k: 0, pv: Math.round(40 * v), pvMax: 40, exp: 0, canonT: 0, cible: null, vise: null, etat: v === 0 ? 'detruit' : 'arrive', v: 0, hx: 0, hy: 1, cap: Math.PI / 2 });
  const ref = nids.slice(0, 4);
  ref.forEach((n, i) => B.etat.chars.push(mk(900 + i, n.x + 18, n.y - n.face * 16, VIES[(i + 1) % 4])));
  const m = ref.slice(0, 2);
  if (m.length) { rendu.vue.cx = m.reduce((s, n) => s + n.x, 0) / m.length + 8; rendu.vue.cz = m[0].y - m[0].face * 8; }
}

// ─── ce que le calque voit : chaque engin d'en face, sa place à l'écran, sa vie ───────────────────────────────────────────────────────────────
function engins(ctx, memoire) {
  const { B, rendu } = ctx, sortie = [];
  const poser = (cle, type, x, y, h, vie, detruit) => {
    const [sx, sy] = rendu.versEcran(x, y, rendu.hauteurSol(x, y) + h);
    if (sx < -1e4) return;
    const m = memoire.get(cle) ?? { surv: 0 }; memoire.set(cle, m);
    sortie.push({ cle, type, sx: Math.round(sx), sy: Math.round(sy), vie: Math.max(0, Math.min(1, vie)), detruit, m });
  };
  for (const c of B.etat.chars) if (c.camp === 1) poser(`c${c.id}`, 'char', c.x, c.y, 3.5, c.pv / (c.pvMax || 1), c.etat === 'detruit');
  for (const n of B.etat.nids) if (n.camp === 1) poser(`n${n.id}`, 'nid', n.x, n.y, 2.5, n.pv / NIDS.pv, n.etat === 'detruit');
  return sortie;
}
const NOM = { char: 'Char ennemi', nid: 'Mitrailleuse ennemie' };
const MOT = e => e.detruit ? 'détruit' : e.vie > 0.5 ? 'opérationnel' : 'abîmé';

// ─── des gestes de dessin ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function boite(g, x, y, w, h) { g.fillStyle = P.t; g.fillRect(x - 1, y - 1, w + 2, h + 2); }
function barre(g, x, y, w, h, f, couleur = P.x) {          // un liseré de terre, un fond sombre, la vie en kaki
  boite(g, x, y, w, h); g.fillStyle = P.s; g.fillRect(x, y, w, h); g.fillStyle = couleur; g.fillRect(x, y, Math.round(w * f), h);
}
function croix(g, cx, cy, r, couleur) {
  g.strokeStyle = P.t; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.stroke();
  g.strokeStyle = couleur; g.lineWidth = 1.5; g.stroke();
}
function texte(g, s, x, y, couleur = P.t, align = 'left') { g.font = MONO; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = couleur; g.fillText(s, x, y); }

// ─── les variantes ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 0 · l'étiquette d'aujourd'hui (référence) : un papier d'os, le nom et le pourcentage, une barre, un liseré kaki
function actuelle(g, e) {
  const s = e.detruit ? `${NOM[e.type]} · DÉTRUIT${e.type === 'nid' ? 'E' : ''}` : `${NOM[e.type]} · ${Math.round(e.vie * 100)} %`;
  g.font = MONO; const w = Math.ceil(g.measureText(s).width) + 12, h = 30, x = e.sx - w / 2, y = e.sy - h;
  g.fillStyle = P.t; g.fillRect(x + 2, y + 2, w, h);
  g.fillStyle = e.detruit ? P.t : P.o; g.fillRect(x, y, w, h);
  g.fillStyle = P.x; g.fillRect(x, y, w, 3);
  texte(g, s, x + 6, y + 15, e.detruit ? P.r : P.t);
  barre(g, x + 6, y + 20, w - 12, 5, e.vie, P.x);
}

// 1A · la barre nue : trois pixels de haut, sans texte ; détruit, elle disparaît (l'épave parle seule)
function barreNue(g, e) {
  if (e.detruit) return;
  const w = e.type === 'char' ? 34 : 22;
  barre(g, e.sx - w / 2, e.sy - 5, w, 3, e.vie);
}
// 1B · la barre à crans : quatre segments, plus large pour un char que pour un poste ; détruit, quatre crans vides (la trace de ce qui était)
function barreCrans(g, e) {
  const n = 4, seg = e.type === 'char' ? 9 : 6, ecart = 2, w = n * seg + (n - 1) * ecart, x0 = e.sx - w / 2, y = e.sy - 6;
  const plein = e.detruit ? 0 : Math.ceil(e.vie * n - 0.001);
  for (let k = 0; k < n; k++) {
    const x = x0 + k * (seg + ecart);
    boite(g, x, y, seg, 4); g.fillStyle = k < plein ? P.x : P.s; g.fillRect(x, y, seg, 4);
    if (e.detruit) { g.fillStyle = P.t; g.fillRect(x + 1, y + 1, seg - 2, 2); }
  }
}
// 1C · la barre qui n'apparaît qu'abîmé : intact, rien ; entamé, la barre se montre ; détruit, rien (on voit l'épave)
function barreSiEntame(g, e) {
  if (e.detruit || e.vie > 0.995) return;
  const w = e.type === 'char' ? 34 : 22;
  barre(g, e.sx - w / 2, e.sy - 5, w, 3, e.vie);
  if (e.vie < 0.3) { g.fillStyle = P.t; g.fillRect(e.sx - w / 2 - 1, e.sy - 8, w + 2, 1); }      // presque détruit : un trait de terre au-dessus, sobrement
}

// 2A · la pastille forme : un carré (char) ou un losange (poste) ; pleine, à demi, ou creuse et barrée ; au survol elle s'ouvre en une capsule (barre + mot)
function forme(g, cx, cy, type, r) {
  g.beginPath();
  if (type === 'char') g.rect(cx - r, cy - r, 2 * r, 2 * r); else { g.moveTo(cx, cy - r - 1); g.lineTo(cx + r + 1, cy); g.lineTo(cx, cy + r + 1); g.lineTo(cx - r - 1, cy); g.closePath(); }
}
function pastilleForme(g, e) {
  const cx = e.sx, cy = e.sy - 7, r = 4 + e.m.surv * 1;
  g.fillStyle = P.t; forme(g, cx, cy, e.type, r + 1.5); g.fill();
  g.fillStyle = e.detruit ? P.t : P.x; forme(g, cx, cy, e.type, r); g.fill();
  if (e.detruit) { g.strokeStyle = P.r; g.lineWidth = 1; forme(g, cx, cy, e.type, r); g.stroke(); croix(g, cx, cy, 2.5, P.r); }
  else if (e.vie <= 0.5) { g.save(); forme(g, cx, cy, e.type, r); g.clip(); g.fillStyle = P.t; g.fillRect(cx - r - 2, cy - r - 2, 2 * r + 4, (r + 2) * (1 - e.vie * 2 + 0.2)); g.restore(); }
  if (e.m.surv > 0.02) {                        // la capsule qui sort à droite
    const w = Math.round(78 * e.m.surv), x = cx + r + 6, y = cy - 8;
    g.save(); g.beginPath(); g.rect(x - 2, y - 2, w + 2, 20); g.clip();
    g.fillStyle = P.t; g.fillRect(x - 1, y - 1, 80, 20); g.fillStyle = P.o; g.fillRect(x, y, 78, 18);
    texte(g, e.detruit ? 'détruit' : `${NOM[e.type].split(' ')[0] === 'Char' ? 'Char' : 'Poste'} ${Math.round(e.vie * 100)} %`, x + 4, y + 9, P.t);
    if (!e.detruit) barre(g, x + 4, y + 12, 70, 3, e.vie);
    g.restore();
  }
}
// 2B · la pastille jauge : un rond kaki ceint d'un arc qui se vide avec la vie ; détruit, un anneau pointillé barré ; au survol elle grossit et dit son nom dessous
function pastilleJauge(g, e) {
  const cx = e.sx, cy = e.sy - 8, r = 4 + e.m.surv * 3, R = r + 3;
  g.lineWidth = 3; g.strokeStyle = P.t; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  if (e.detruit) {
    g.setLineDash([2, 2]); g.lineWidth = 1.5; g.strokeStyle = P.r; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    croix(g, cx, cy, 2.5, P.r);
  } else {
    g.fillStyle = P.t; g.beginPath(); g.arc(cx, cy, r + 1, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.x; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 2; g.strokeStyle = P.x; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e.vie); g.stroke();
    if (e.type === 'nid') { g.fillStyle = P.t; g.fillRect(cx - 1, cy - r + 2, 2, 2 * r - 4); }       // un trait : le poste (le char est plein)
  }
  if (e.m.surv > 0.3) {
    const s = e.detruit ? `${NOM[e.type]} · détruit` : `${NOM[e.type]} · ${Math.round(e.vie * 100)} %`;
    g.globalAlpha = Math.min(1, (e.m.surv - 0.3) / 0.5); g.font = MONO; const w = Math.ceil(g.measureText(s).width) + 10;
    g.fillStyle = P.t; g.fillRect(cx - w / 2 + 1, cy + R + 4, w, 17); g.fillStyle = P.o; g.fillRect(cx - w / 2, cy + R + 3, w, 17);
    texte(g, s, cx, cy + R + 15, P.t, 'center'); g.globalAlpha = 1;
  }
}
// 2C · la pastille et l'infobulle du jeu : un petit repère de 8 px (carré ou losange), plein ou creux ; au survol, rien d'autre que l'infobulle du jeu (titre, deux lignes)
function pastilleInfobulle(g, e) {
  const cx = e.sx, cy = e.sy - 6, r = 3;
  g.fillStyle = P.t; forme(g, cx, cy, e.type, r + 1.5); g.fill();
  if (e.detruit) { g.fillStyle = P.s; forme(g, cx, cy, e.type, r); g.fill(); g.strokeStyle = P.r; g.lineWidth = 1; forme(g, cx, cy, e.type, r); g.stroke(); }
  else { g.fillStyle = P.x; forme(g, cx, cy, e.type, r); g.fill(); }
  if (e.m.surv > 0.4) {
    const l = [NOM[e.type], `${MOT(e)}${e.detruit ? '' : `, ${Math.round(e.vie * 100)} % de vie`}`, e.type === 'char' ? 'Canon et mitrailleuses' : 'Cône de tir devant lui'];
    g.font = `bold ${MONO}`; const w = Math.max(...l.map((s, i) => { g.font = i ? MONO : `bold ${MONO}`; return Math.ceil(g.measureText(s).width); })) + 14, h = 50, x = cx - w / 2, y = cy - 12 - h;
    g.globalAlpha = Math.min(1, (e.m.surv - 0.4) / 0.4);
    g.fillStyle = P.t; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = P.s; g.fillRect(x, y, w, h);
    g.font = `bold ${MONO}`; g.textAlign = 'left'; g.fillStyle = P.o; g.fillText(l[0], x + 7, y + 16);
    g.font = MONO; g.fillStyle = P.r; g.fillText(l[1], x + 7, y + 31); g.fillText(l[2], x + 7, y + 44);
    g.globalAlpha = 1;
  }
}

const DESSINS = { actuelle, barreNue, barreCrans, barreSiEntame, pastilleForme, pastilleJauge, pastilleInfobulle };
const AIDES = {
  actuelle: 'Référence : l\'étiquette d\'aujourd\'hui. Elle prend la place de l\'engin.',
  barreNue: 'Une barre de 3 px, sans texte. Détruit : plus rien. Survol : rien de plus.',
  barreCrans: 'Quatre crans. Détruit : quatre crans creux. Survol : rien de plus.',
  barreSiEntame: 'Rien tant que l\'engin est intact ; la barre vient avec les dégâts.',
  pastilleForme: 'Carré = char, losange = poste. Plein, à demi, creux barré. Survol : une capsule.',
  pastilleJauge: 'Un rond ceint d\'un arc de vie. Survol : il grossit et dit son nom.',
  pastilleInfobulle: 'Un repère de 8 px, rien d\'autre. Survol : l\'infobulle du jeu.',
};

// ─── le calque : même contrat que `calqueMoral` (boîte, ctx) → arrêt ──────────────────────────────────────────────────────────────────────
export function calqueEnnemis(nom) {
  return (boiteDom, ctx) => {
    const cv = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none');
    const aide = el('div', `position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:3px 8px;background:${P.o};color:${P.t};font:${MONO};box-shadow:3px 3px 0 ${P.t};pointer-events:none;white-space:nowrap`,
      `${AIDES[nom]}${nom === 'actuelle' ? '' : ' · Passez la souris sur un engin.'}`);
    boiteDom.append(cv, aide);
    const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const memoire = new Map(); let souris = null, pret = false, raf = 0, partie = true, avant = 0;
    const bouge = ev => { const r = boiteDom.getBoundingClientRect(); souris = { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    const quitte = () => { souris = null; };
    boiteDom.addEventListener('pointermove', bouge); boiteDom.addEventListener('pointerleave', quitte);
    function boucle(now) {
      const dt = Math.min(0.1, (now - avant) / 1000); avant = now;
      if (ctx.rendu && ctx.B) {
        if (!pret) { monterScene(ctx); pret = true; }
        const r = boiteDom.getBoundingClientRect();
        if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
        const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
        const liste = engins(ctx, memoire);
        // le survol : l'engin dont le repère ou le corps est le plus proche du pointeur (à 24 px au plus)
        let proche = null, d0 = 24;
        if (souris && nom !== 'actuelle') for (const e of liste) { const d = Math.hypot(souris.x - e.sx, souris.y - (e.sy + 6)); if (d < d0) { d0 = d; proche = e; } }
        for (const e of liste) {
          const but = e === proche ? 1 : 0, vit = reduit ? 1 : Math.min(1, dt * 12);
          e.m.surv += (but - e.m.surv) * vit; if (Math.abs(but - e.m.surv) < 0.01) e.m.surv = but;
        }
        // les plus hauts à l'écran d'abord : une étiquette plus bas passe devant
        for (const e of liste.sort((a, b) => a.sy - b.sy)) { g.save(); DESSINS[nom](g, e); g.restore(); }
      }
      if (partie) raf = requestAnimationFrame(boucle);
    }
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); boiteDom.removeEventListener('pointermove', bouge); boiteDom.removeEventListener('pointerleave', quitte); };
  };
}
