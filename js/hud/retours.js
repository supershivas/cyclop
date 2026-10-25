// Les retours du jeu sur le champ (Jérôme, v0.41.3 ; sujets « Un ordre sur un secteur » (B, le fanion, et D, la réponse des hommes) et « Le coup d'obus » (C, l'impact
// en trois temps) du labo) : le dessin seulement, par-dessus le moteur. Rien ici ne lit ni ne modifie la partie au-delà de lire `B.armee` pour placer le dessin ;
// aucun tirage du générateur de la bataille, rien de sauvegardé. Un SVG (le fanion et ses fils) et un canvas 2D (la poussière, l'impact), suivis de la caméra
// par `versEcran`. Fabrique `creerRetours({ $, rendu: () => rendu, bataille: () => B })` : le rendu et la bataille changent à chaque partie, on les lit à chaque appel.
import { PALETTE as P } from '../palette.js?v=0.69.0';
import { CALIBRES } from '../data/calibres.js?v=0.69.0';

const svgEl = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const borne = (u, a = 0, b = 1) => Math.min(b, Math.max(a, u));
const ease = u => 1 - (1 - borne(u)) ** 3;
const sortie = (t, debut, fin) => t < debut ? 1 : Math.max(0, 1 - (t - debut) / (fin - debut));
const ombre = `drop-shadow(1px 1px 0 ${P.t}) drop-shadow(-1px -1px 0 ${P.t})`;
const points = pts => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const MAX_IMPACTS = 24;                         // au plus autant d'impacts dessinés à la fois : un barrage en jette des dizaines

export function creerRetours({ $, rendu: lireRendu, bataille: lireBataille }) {
  const couche = $('retours'), svg = svgEl('svg'), cv = document.createElement('canvas');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
  couche.append(svg, cv);
  const reduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = (x, y) => lireRendu().versEcran(x, y);
  const liste = [];
  const couleur = nom => getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || P.n;

  // le centre des hommes d'un régiment, à l'écran
  function centroide(id) {
    const A = lireBataille().armee; let x = 0, y = 0, n = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === id) { x += A.x[i]; y += A.y[i]; n++; }
    if (!n) return null;
    const [sx, sy] = S(x / n, y / n);
    return { sx, sy };
  }

  // B · le fanion planté : il tombe au point cliqué et se plante en rebondissant, la toile se déploie ; un fil pointillé court de chaque régiment au fanion
  function fanion(ids, x, y) {
    const g = svgEl('g'); svg.append(g);
    const fils = ids.map(() => ({ o: svgEl('line', { stroke: P.t, 'stroke-width': 4, 'stroke-linecap': 'round' }), l: svgEl('line', { stroke: P.o, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }) }));
    g.append(...fils.flatMap(f => [f.o, f.l]));
    const toile = document.createElement('i');
    toile.style.cssText = `position:absolute;left:2px;top:-34px;width:0;height:0;border-left:20px solid ${couleur('--jeu-nous')};border-top:9px solid transparent;border-bottom:9px solid transparent;transform-origin:left center`;
    const hampe = document.createElement('i');
    hampe.style.cssText = `position:absolute;left:-1px;top:-34px;width:3px;height:34px;background:${P.o}`;
    const mat = document.createElement('div');
    mat.style.cssText = `position:absolute;left:0;top:0;width:0;height:0;filter:${ombre}`;
    mat.append(hampe, toile); couche.append(mat);
    return {
      duree: 2.6,
      maj(t) {
        const [sx, sy] = S(x, y);
        const chute = t < 0.3 ? -150 * (1 - (t / 0.3) ** 2) : t < 0.46 ? -16 * Math.sin((t - 0.3) / 0.16 * Math.PI) : t < 0.58 ? -5 * Math.sin((t - 0.46) / 0.12 * Math.PI) : 0;
        mat.style.transform = `translate(${sx}px,${sy + chute}px)`;
        mat.style.opacity = t < 0.05 ? t / 0.05 : sortie(t, 2.2, 2.6);
        toile.style.transform = `scaleX(${ease((t - 0.3) / 0.25)})`;
        const u = ease(t / 0.5), o = sortie(t, 0.9, 1.3);
        ids.forEach((id, k) => {
          const m = centroide(id); if (!m) return;
          const x1 = m.sx + (sx - m.sx) * u, y1 = m.sy + (sy - m.sy) * u;
          for (const e of [fils[k].o, fils[k].l]) { e.setAttribute('x1', m.sx); e.setAttribute('y1', m.sy); e.setAttribute('x2', x1); e.setAttribute('y2', y1); e.style.opacity = o; }
          fils[k].l.style.strokeDashoffset = -t * 30;
        });
      },
      fin() { g.remove(); mat.remove(); },
    };
  }

  // D · la réponse des hommes : chacun lève un petit « ! » puis lance un nuage de poussière à ses pieds, du plus près du secteur au plus loin
  function reponse(ids, x, y) {
    const A = lireBataille().armee, hommes = [];
    for (let i = 0; i < A.n; i++) if (ids.includes(A.reg[i])) hommes.push(A.id[i]);
    const pos = new Map(); for (let i = 0; i < A.n; i++) if (ids.includes(A.reg[i])) pos.set(A.id[i], i);
    hommes.sort((a, b) => Math.hypot(A.x[pos.get(a)] - x, A.y[pos.get(a)] - y) - Math.hypot(A.x[pos.get(b)] - x, A.y[pos.get(b)] - y));
    const n = hommes.length || 1;
    // l'indice d'un homme change quand la logique retire un mort (`compacter`) : on le retrouve par son numéro
    const indices = new Map(); const lire = () => { indices.clear(); const A2 = lireBataille().armee; for (let i = 0; i < A2.n; i++) indices.set(A2.id[i], i); return A2; };
    return {
      duree: 1.0,
      maj(t, g) {
        const A2 = lire();
        hommes.forEach((id, k) => {
          const i = indices.get(id); if (i === undefined) return;
          const a = t - (0.02 + 0.45 * k / n); if (a < 0 || a > 0.4) return;
          const [px, py] = S(A2.x[i], A2.y[i]), u = a / 0.4;
          g.globalAlpha = 1 - u; g.strokeStyle = P.r; g.lineWidth = 1.5;
          g.beginPath(); g.ellipse(px, py, 2 + 9 * u, 1 + 4 * u, 0, 0, Math.PI * 2); g.stroke();
          if (a < 0.14) { g.fillStyle = P.o; g.globalAlpha = 1; g.fillRect(px - 1, py - 13, 2, 5); g.fillRect(px - 1, py - 6, 2, 2); }
        });
      },
    };
  }

  // C · l'impact en trois temps : un éclair d'os d'un instant, puis un anneau de poussière qui s'élargit (la gerbe et la fumée sont celles du moteur)
  function troisTemps(x, y, cal) {
    const Rm = CALIBRES[cal]?.rayon ?? 10;
    return {
      duree: 0.7, impact: true,
      maj(t, g) {
        const [sx, sy] = S(x, y), [ex] = S(x + Rm, y), r = Math.abs(ex - sx);
        if (t < 0.08) { g.globalAlpha = 1 - t / 0.08; g.fillStyle = P.o; g.beginPath(); g.ellipse(sx, sy, r * 0.7, r * 0.4, 0, 0, Math.PI * 2); g.fill(); }
        const u = borne((t - 0.04) / 0.55), rr = Rm * (0.3 + 0.9 * ease(u));
        g.globalAlpha = (1 - u) * 0.9; g.strokeStyle = P.r; g.lineWidth = 1 + 2 * (1 - u); g.lineJoin = 'round';
        g.beginPath();
        for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, [px, py] = S(x + Math.cos(a) * rr, y + Math.sin(a) * rr); if (k) g.lineTo(px, py); else g.moveTo(px, py); }
        g.closePath(); g.stroke();
      },
    };
  }

  const ajouter = fx => { fx.t = 0; liste.push(fx); };
  return {
    // un ordre de marche en terrain libre (la tranchée a déjà son clignotement) : le fanion, puis la réponse des hommes
    ordre(ids, x, y) {
      if (!lireRendu() || !lireBataille() || !ids.length) return;
      ajouter(fanion(ids, x, y)); ajouter(reponse(ids, x, y));
    },
    // les événements de la bataille de cette image : un impact dessiné par obus, hors de l'écran ou au-delà du plafond : rien
    evenements(ev) {
      const R = lireRendu(); if (!R || !ev.length) return;
      for (const e of ev) {
        if (e.type !== 'impact' || liste.filter(f => f.impact).length >= MAX_IMPACTS) continue;
        const [sx, sy] = R.versEcran(e.x, e.y);
        if (sx < -50 || sy < -50 || sx > couche.clientWidth + 50 || sy > couche.clientHeight + 50) continue;
        ajouter(troisTemps(e.x, e.y, e.cal));
      }
    },
    maj(dt) {
      if (!liste.length) { if (cv.width) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); } return; }
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const g = cv.getContext('2d');
      g.clearRect(0, 0, w, h);
      const k = reduit() ? 2.5 : 1;
      for (let i = liste.length - 1; i >= 0; i--) {
        const fx = liste[i]; fx.t += dt * k;
        if (fx.t > fx.duree) { fx.fin?.(); liste.splice(i, 1); } else fx.maj(fx.t, g);
      }
      g.globalAlpha = 1;
    },
    // une nouvelle partie : plus rien en cours
    vider() { for (const fx of liste) fx.fin?.(); liste.length = 0; svg.replaceChildren(); },
  };
}
