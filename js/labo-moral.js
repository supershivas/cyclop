// Le sujet « Le moral sur le champ » du labo (v0.67.2) : l'état moral d'un régiment (tient, ébranlé, en déroute) se lit aujourd'hui sur l'étiquette et la carte du bas, pas sur les hommes
// (docs/chantiers/langage-visuel-inventaire.md). Quatre façons de le poser sur le champ lui-même, sans couleur de plus que les deux d'alerte de l'interface (ALERTES) : la forme et le mouvement
// portent l'information, la couleur la confirme. Posé sur le moteur en direct, avec les vrais hommes : un calque 2D par-dessus, qui lit seulement les positions (`versEcran`). Le dessin
// seulement : rien ici ne modifie une partie. Les huit régiments de notre camp prennent tour à tour tient, ébranlé, en déroute (1 tient, 2 ébranlé, 3 en déroute, 4 tient…).
import { PALETTE as P, ALERTES } from './palette.js?v=0.83.1';

const ETATS = ['tient', 'ebranle', 'deroute'];
const ETAT_DE = i => ETATS[[0, 1, 2, 0, 1, 2, 0, 1][i % 8]];
const COULEUR = { tient: P.n, ebranle: ALERTES.orange, deroute: ALERTES.rouge };
const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:12px/1.3 ui-monospace,monospace;';
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// le centre et l'emprise (en pixels) des hommes d'un régiment
function emprise(ctx, id) {
  const { B, rendu } = ctx, A = B.armee;
  let x = 0, y = 0, n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === id) {
    const [sx, sy] = rendu.versEcran(A.x[i], A.y[i]);
    if (sx < -1e4) continue;
    x += sx; y += sy; n++; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return n ? { cx: x / n, cy: y / n, x0, x1, y0, y1 } : null;
}

// un trait lisible sur tous les sols : un liseré de terre sous la couleur
function trace(g, tracer, couleur, largeur) {
  g.lineJoin = 'round'; g.lineCap = 'butt';
  g.strokeStyle = P.t; g.lineWidth = largeur + 2; tracer(); g.stroke();
  g.strokeStyle = couleur; g.lineWidth = largeur; tracer(); g.stroke();
}

// A · le liseré qui s'effrite : un cadre autour des hommes. Ébranlé : tirets qui marchent, oranges. En déroute : des bouts de cadre qui se détachent et vacillent, rouges. Tient : rien.
function lisere(g, c, etat, t, id) {
  if (etat === 'tient') return;
  const x0 = c.x0 - 8, y0 = c.y0 - 8, w = c.x1 - c.x0 + 16, h = c.y1 - c.y0 + 16;
  if (etat === 'ebranle') {
    g.setLineDash([7, 5]); g.lineDashOffset = -t * 10;
    trace(g, () => { g.beginPath(); g.rect(x0, y0, w, h); }, COULEUR.ebranle, 2);
    g.setLineDash([]);
    return;
  }
  // déroute : le cadre en morceaux de 10 à 22 px, chacun tremble et s'éteint à son tour
  const cotes = [[x0, y0, x0 + w, y0], [x0 + w, y0, x0 + w, y0 + h], [x0 + w, y0 + h, x0, y0 + h], [x0, y0 + h, x0, y0]];
  cotes.forEach(([ax, ay, bx, by], k) => {
    const L = Math.hypot(bx - ax, by - ay); let s = 0, j = 0;
    while (s < L) {
      const len = 10 + 12 * hash(id * 7 + k, j), u0 = s / L, u1 = Math.min(1, (s + len) / L);
      if (hash(id * 3 + k + Math.floor(t * 2.5), j) > 0.35) {
        const dx = (hash(j, k + Math.floor(t * 8)) - 0.5) * 5, dy = (hash(k, j + Math.floor(t * 8)) - 0.5) * 5;
        trace(g, () => { g.beginPath(); g.moveTo(ax + (bx - ax) * u0 + dx, ay + (by - ay) * u0 + dy); g.lineTo(ax + (bx - ax) * u1 + dx, ay + (by - ay) * u1 + dy); }, COULEUR.deroute, 2);
      }
      s += len + 6 + 8 * hash(j, k);
    }
  });
}

// B · le pennon : un mât planté au milieu des hommes. Il tient droit, déployé (bleu) ; ébranlé, il penche et la toile pend à mi-mât (orange) ; en déroute, il est à terre, la toile déchirée (rouge).
function pennon(g, c, etat, t) {
  const mat = 30, bx = c.cx, by = c.y0 - 4, ang = etat === 'tient' ? 0 : etat === 'ebranle' ? 0.35 : 1.35;
  const hx = bx + Math.sin(ang) * mat, hy = by - Math.cos(ang) * mat;
  trace(g, () => { g.beginPath(); g.moveTo(bx, by); g.lineTo(hx, hy); }, P.o, 2);
  const onde = k => Math.sin(t * 5 + k * 1.3) * (etat === 'tient' ? 2 : 1);
  const haut = etat === 'ebranle' ? 0.5 : 0;                      // la toile glisse vers le bas du mât
  const px = u => bx + (hx - bx) * u, py = u => by + (hy - by) * u;
  const ox = px(1 - haut), oy = py(1 - haut), sens = Math.cos(ang) >= 0 ? 1 : -1;
  g.beginPath();
  if (etat === 'deroute') {
    // la toile est une bande en lambeaux le long du sol
    g.moveTo(ox, oy); g.lineTo(ox + 14, oy + 3 + onde(0) * 0.3); g.lineTo(ox + 9, oy + 7); g.lineTo(ox + 18, oy + 9 + onde(1) * 0.3); g.lineTo(ox + 6, oy + 11); g.lineTo(ox, oy + 9); g.closePath();
  } else {
    const L = etat === 'tient' ? 18 : 14, H = 11;
    g.moveTo(ox, oy); g.lineTo(ox + sens * L * 0.5, oy + onde(0)); g.lineTo(ox + sens * L, oy + onde(1) + (etat === 'ebranle' ? 3 : 0)); g.lineTo(ox + sens * L, oy + H + onde(2)); g.lineTo(ox + sens * L * 0.5, oy + H + onde(3)); g.lineTo(ox, oy + H); g.closePath();
  }
  g.fillStyle = COULEUR[etat]; g.fill(); g.strokeStyle = P.t; g.lineWidth = 1; g.stroke();
}

// C · la trame : une hachure en biais, sur toute l'emprise, qui se resserre quand le régiment fléchit (comme la barre hachurée de la carte). Ébranlé : hachures espacées, oranges. En déroute : serrées, rouges, plus sombres.
function trame(g, c, etat, t) {
  if (etat === 'tient') return;
  const x0 = c.x0 - 8, y0 = c.y0 - 8, w = c.x1 - c.x0 + 16, h = c.y1 - c.y0 + 16, pas = etat === 'ebranle' ? 9 : 4;
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.globalAlpha = etat === 'ebranle' ? 0.55 : 0.75;
  const decal = (t * 6) % pas;
  trace(g, () => { g.beginPath(); for (let k = -h; k < w + h; k += pas) { g.moveTo(x0 + k + decal, y0 + h); g.lineTo(x0 + k + decal + h, y0); } }, COULEUR[etat], etat === 'ebranle' ? 1 : 1.5);
  g.restore();
  g.setLineDash(etat === 'ebranle' ? [] : [4, 3]); trace(g, () => { g.beginPath(); g.rect(x0, y0, w, h); }, COULEUR[etat], 1); g.setLineDash([]);
}

// D · les chevrons de repli : l'action plutôt que l'état. Ébranlé : un chevron qui pulse vers l'arrière (le sud, vers le bas de l'écran), orange. En déroute : trois chevrons rouges qui coulent vers l'arrière.
function chevrons(g, c, etat, t) {
  if (etat === 'tient') return;
  const n = etat === 'ebranle' ? 1 : 3, haut = etat === 'ebranle' ? 0 : 36;
  for (let k = 0; k < n; k++) {
    const u = etat === 'ebranle' ? 0 : ((t * 0.9 + k / n) % 1), dy = etat === 'ebranle' ? 0 : u * haut, a = etat === 'ebranle' ? 0.5 + 0.5 * Math.sin(t * 4) : Math.sin(u * Math.PI);
    g.globalAlpha = Math.max(0, a);
    const x = c.cx, y = c.y1 + 10 + dy;
    trace(g, () => { g.beginPath(); g.moveTo(x - 9, y - 4); g.lineTo(x, y + 4); g.lineTo(x + 9, y - 4); }, COULEUR[etat], 3);
  }
  g.globalAlpha = 1;
}

const DESSINS = { lisere, pennon, trame, chevrons };

export function calqueMoral(nom) {
  return (boite, ctx) => {
    const cv = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none');
    const aide = el('div', `position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:3px 8px;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};pointer-events:none;white-space:nowrap`,
      'Régiments 1 et 4 : tient · 2 et 5 : ébranlé · 3 et 6 : en déroute');
    boite.append(cv, aide);
    const reduit = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, partie = true;
    function boucle(now) {
      const t = reduit ? 0 : now / 1000;
      if (ctx.rendu && ctx.B) {
        const r = boite.getBoundingClientRect();
        if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
        const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
        const regs = ctx.B.etat.regiments.filter(x => x.camp === 0);
        regs.forEach((reg, i) => {
          const c = emprise(ctx, reg.id); if (!c) return;
          g.save(); DESSINS[nom](g, c, ETAT_DE(i), t, reg.id); g.restore();
        });
      }
      if (partie) raf = requestAnimationFrame(boucle);
    }
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); };
  };
}
