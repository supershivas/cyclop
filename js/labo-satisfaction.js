// Le groupe « Satisfaction » du labo (Jérôme, v0.39.2) : ce que le joueur sent quand il agit. Trois sujets, cinq propositions chacun contre
// ce que le jeu fait aujourd'hui (la A) : le clic sur un bouton, un ordre d'un régiment sur un secteur, un coup d'obus.
// Le dessin seulement : rien ici ne modifie une partie ni le jeu. Pas de son (le jeu est muet, v0.1.0) : ce que le son ajouterait est dit dans les notes.
//  · les boutons : une maquette de papier de campagne, les mêmes boutons que la fenêtre d'ordres, les batteries et le temps ;
//  · les ordres et les obus : posés sur le moteur en direct (labo.js `moteur`), par-dessus le canvas (un SVG, un canvas 2D, quelques div) suivis
//    de la caméra (`versEcran`) ; l'ordre est un vrai `ordonnerMarche`, l'obus un vrai obus de la logique (dispersion nulle : il tombe où l'on clique).
import { PALETTE as P } from './palette.js?v=0.96.0';
import { ordonnerMarche, ordonnerBarrage } from './bataille.js?v=0.96.0';
import { CALIBRES } from './data/calibres.js?v=0.96.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const MONO = 'font:12px/1.3 ui-monospace,monospace;';
const reduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;   // les animations longues sont raccourcies (section 7)
const sortie = (t, debut, fin) => t < debut ? 1 : Math.max(0, 1 - (t - debut) / (fin - debut));                  // 1 puis 0 : le fondu de fin
const borne = (u, a = 0, b = 1) => Math.min(b, Math.max(a, u));
const ease = u => 1 - (1 - borne(u)) ** 3;
const ombre = `drop-shadow(1px 1px 0 ${P.t}) drop-shadow(-1px -1px 0 ${P.t})`;
const jouer = (e, keyframes, duree, opts = {}) => e.animate(keyframes, { duration: duree, easing: 'cubic-bezier(.2,.8,.3,1)', ...opts });
const points = pts => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

// ─── 1 · Le clic sur un bouton ───────────────────────────────────────────────

// Les boutons du jeu, par famille : ceux de la fenêtre d'ordres, les batteries, le temps
const BOUTONS = [
  ['Fenêtre d\'ordres', ['Marcher', 'Regagner sa tranchée', 'Fiche']],
  ['Batteries', ['75', '155', '220']],
  ['Temps', ['Arrêter', '×1', '×2', '×4']],
];

// B · le rebond : le bouton s'enfonce dès l'appui puis revient en dépassant un peu
const rebond = b => jouer(b, [{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: .25 }, { transform: 'scale(1.05)', offset: .65 }, { transform: 'scale(1)' }], 280);

// C · le tampon : une empreinte REÇU se plaque sur le bouton, penchée, et s'efface ; le bouton s'enfonce d'un cran
const tampon = b => {
  const m = el('i', `position:absolute;left:50%;top:50%;margin:-11px 0 0 -26px;width:52px;height:22px;box-sizing:border-box;display:grid;place-items:center;border:2px solid ${P.t};background:${P.o};color:${P.t};font:700 11px/1 ui-monospace,monospace;font-style:normal;letter-spacing:1px;pointer-events:none;transform:rotate(-8deg)`, 'REÇU');
  b.append(m);
  jouer(m, [{ transform: 'rotate(-8deg) scale(1.9)', opacity: 0 }, { transform: 'rotate(-8deg) scale(1)', opacity: 1, offset: .22 }, { transform: 'rotate(-8deg) scale(1)', opacity: 1, offset: .8 }, { transform: 'rotate(-8deg) scale(1)', opacity: 0 }], 1100, { easing: 'ease-out' }).onfinish = () => m.remove();
  jouer(b, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)', offset: .15 }, { transform: 'none' }], 160);
};

// D · l'onde : un disque de glaise part du point cliqué et remplit le bouton (le bouton garde son overflow caché)
const onde = (b, e) => {
  const r = b.getBoundingClientRect(), x = e ? e.clientX - r.left : r.width / 2, y = e ? e.clientY - r.top : r.height / 2;
  const d = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
  const o = el('i', `position:absolute;left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px;border-radius:50%;background:${P.g};pointer-events:none`);
  b.append(o);
  jouer(o, [{ transform: 'scale(0)', opacity: .55 }, { transform: 'scale(1)', opacity: 0 }], 460, { easing: 'ease-out' }).onfinish = () => o.remove();
};

// E · le cran : une touche de télégraphe : elle descend de 2 px, deux petits tremblements secs, puis remonte (sans adoucir : steps)
const cran = b => {
  const o = `0 3px 0 ${P.t}`, bas = `0 1px 0 ${P.t}`;
  jouer(b, [{ transform: 'translateY(0)', boxShadow: o }, { transform: 'translateY(2px)', boxShadow: bas, offset: .2 }, { transform: 'translate(1px,2px)', boxShadow: bas, offset: .4 }, { transform: 'translate(-1px,2px)', boxShadow: bas, offset: .55 }, { transform: 'translateY(0)', boxShadow: o }], 220, { easing: 'steps(1, start)' });
};

const EFFETS_BOUTON = { rebond, tampon, onde, cran };

// F · le maintien : un ordre qui compte se tient un quart de seconde (jauge au pied du bouton) ; lâché avant, rien ne part. Clavier : Espace ou Entrée tenus.
function maintien(b, dire, texte) {
  const jauge = el('i', `position:absolute;left:0;bottom:0;height:4px;width:100%;background:${P.t};transform:scaleX(0);transform-origin:left;pointer-events:none`);
  b.append(jauge);
  let anim = null;
  const debut = () => {
    if (anim) return;
    anim = jauge.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: reduit() ? 1 : 250, easing: 'linear' });
    anim.onfinish = () => { anim = null; jouer(b, [{ background: P.t, color: P.o }, { background: 'transparent', color: P.t }], 260, { easing: 'ease-out' }); dire(`${texte} — ordre confirmé`); };
    anim.oncancel = () => { anim = null; dire(`${texte} — lâché trop tôt, rien n'est parti`); };
  };
  const fin = () => anim?.cancel();
  b.addEventListener('pointerdown', e => { if (e.button === 0) debut(); });
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(t, fin);
  b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); debut(); } });
  b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') fin(); });
}

function bouton(texte, nom, dire) {
  const fx = EFFETS_BOUTON[nom];
  const b = el('button', `position:relative;height:32px;min-width:44px;padding:0 10px;font:inherit;font-size:12px;color:${P.t};background:transparent;border:1px solid ${P.g};cursor:pointer;touch-action:manipulation;${nom === 'cran' ? `box-shadow:0 3px 0 ${P.t};margin-bottom:3px;` : ''}${nom === 'onde' || nom === 'maintien' ? 'overflow:hidden;' : ''}`, texte);
  if (matchMedia('(hover: hover)').matches) {            // le survol ne porte aucune information (section 7) : il n'est ici qu'un confort, comme en jeu
    b.addEventListener('pointerenter', () => { b.style.background = P.g; b.style.color = P.o; });
    b.addEventListener('pointerleave', () => { b.style.background = 'transparent'; b.style.color = P.t; });
  }
  if (nom === 'maintien') { maintien(b, dire, texte); return b; }
  // l'effet part à l'appui (c'est là qu'on le sent), au clavier au clic ; le journal dit l'ordre au relâché
  if (fx) b.addEventListener('pointerdown', e => { if (e.button === 0 && !reduit()) fx(b, e); });
  b.addEventListener('click', e => { if (fx && e.detail === 0 && !reduit()) fx(b, null); dire(`${texte} — ordre reçu`); });
  return b;
}

export function maquetteBoutons(stage, nom) {
  const racine = el('div', `display:grid;gap:12px;max-width:560px;padding:18px;background:${P.s};box-shadow:inset 0 0 0 1px ${P.t}`);
  const papier = el('div', `display:grid;gap:10px;padding:12px 14px 14px;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t}`);
  const journal = el('p', `margin:0;min-height:18px;color:${P.o};${MONO}`, nom === 'maintien' ? 'Tenez un bouton un quart de seconde.' : 'Cliquez un bouton.');
  let n = 0;
  const dire = t => { journal.textContent = `${++n} · ${t}`; };
  for (const [titre, noms] of BOUTONS) {
    papier.append(
      el('div', `color:${P.g};border-bottom:1px solid ${P.g};padding-bottom:2px`, titre),
      el('div', 'display:flex;gap:6px;flex-wrap:wrap', ...noms.map(t => bouton(t, nom, dire))));
  }
  racine.append(papier, journal);
  stage.append(racine);
  return () => {};
}

// ─── Les couches par-dessus le moteur, et leur gestionnaire ──────────────────

function couches(boite) {
  const scene = el('div', 'position:absolute;inset:0;pointer-events:none;overflow:hidden');
  const svg = svgEl('svg'); svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
  const cv = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%');
  scene.append(svg, cv);
  boite.append(scene);
  return { scene, svg, cv };
}

// un effet : { duree, maj(t, g), fin?(), fini?() } ; `fini` (facultatif) l'arrête avant sa durée
function gestionnaire(L) {
  const liste = [];
  return {
    ajouter(fx) { fx.t = 0; liste.push(fx); },
    maj(dt) {
      const w = L.cv.clientWidth, h = L.cv.clientHeight;
      if (L.cv.width !== w || L.cv.height !== h) { L.cv.width = w; L.cv.height = h; }
      const g = L.cv.getContext('2d');
      g.clearRect(0, 0, w, h);
      for (let i = liste.length - 1; i >= 0; i--) {
        const fx = liste[i]; fx.t += dt;
        if (fx.t > fx.duree || fx.fini?.()) { fx.fin?.(); liste.splice(i, 1); } else fx.maj(fx.t, g);
      }
      g.globalAlpha = 1;
    },
    vider() { for (const fx of liste) fx.fin?.(); liste.length = 0; },
  };
}

const aideEn = (boite, texte) => {
  const a = el('div', `position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:3px 8px;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};pointer-events:none;white-space:nowrap`, texte);
  boite.append(a);
  return a;
};

// un cercle du sol (rayon en mètres) projeté : une ellipse en perspective
const anneau = (S, x, y, r, n = 28) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return S(x + Math.cos(a) * r, y + Math.sin(a) * r); });
const rayonPx = (S, x, y, r) => Math.abs(S(x + r, y)[0] - S(x, y)[0]);

function centroide(ctx, id) {
  const A = ctx.B.armee; let x = 0, y = 0, n = 0, y0 = 1e9;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === id) { x += A.x[i]; y += A.y[i]; n++; y0 = Math.min(y0, ctx.rendu.versEcran(A.x[i], A.y[i])[1]); }
  if (!n) return null;
  const [sx, sy] = ctx.rendu.versEcran(x / n, y / n);
  return { x: x / n, y: y / n, sx, sy, y0 };
}

// ─── 2 · Un ordre d'un régiment sur un secteur ───────────────────────────────

// B · le fanion planté : un fanion tombe au point cliqué et se plante en rebondissant, la toile se déploie ; un fil pointillé court de chaque régiment au fanion
function fanion(c) {
  const { ctx, L, S, ids, x, y } = c;
  const g = svgEl('g'); L.svg.append(g);
  const fils = ids.map(() => ({ o: svgEl('line', { stroke: P.t, 'stroke-width': 4, 'stroke-linecap': 'round' }), l: svgEl('line', { stroke: P.o, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }) }));
  g.append(...fils.flatMap(f => [f.o, f.l]));
  const toile = el('i', `position:absolute;left:2px;top:-34px;width:0;height:0;border-left:20px solid ${P.n};border-top:9px solid transparent;border-bottom:9px solid transparent;transform-origin:left center`);
  const mat = el('div', `position:absolute;left:0;top:0;width:0;height:0;filter:${ombre}`, el('i', `position:absolute;left:-1px;top:-34px;width:3px;height:34px;background:${P.o}`), toile);
  L.scene.append(mat);
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
        const m = centroide(ctx, id); if (!m) return;
        const x1 = m.sx + (sx - m.sx) * u, y1 = m.sy + (sy - m.sy) * u;
        for (const e of [fils[k].o, fils[k].l]) { e.setAttribute('x1', m.sx); e.setAttribute('y1', m.sy); e.setAttribute('x2', x1); e.setAttribute('y2', y1); e.style.opacity = o; }
        fils[k].l.style.strokeDashoffset = -t * 30;
      });
    },
    fin() { g.remove(); mat.remove(); },
  };
}

// C · l'onde du secteur : trois anneaux partent du point cliqué sur le sol, et l'emprise de l'ordre se dessine en pointillés qui défilent
function ondes(c) {
  const { L, S, x, y } = c;
  const g = svgEl('g'); g.style.filter = ombre;
  const cadre = svgEl('polygon', { fill: 'none', stroke: P.o, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'stroke-linejoin': 'round' });
  const rings = [0, 1, 2].map(() => svgEl('polygon', { fill: 'none', stroke: P.o, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  g.append(cadre, ...rings); L.svg.append(g);
  return {
    duree: 2.2,
    maj(t) {
      rings.forEach((p, i) => { const u = borne((t - i * 0.2) / 0.9); p.setAttribute('points', points(anneau(S, x, y, 2 + 24 * ease(u)))); p.style.opacity = u > 0 && u < 1 ? (1 - u) * 0.9 : 0; });
      cadre.setAttribute('points', points([[-23, -9], [23, -9], [23, 9], [-23, 9]].map(([a, b]) => S(x + a, y + b))));   // l'emprise est indicative : 46 m sur 18 m
      cadre.style.strokeDashoffset = -t * 40;
      cadre.style.opacity = Math.min(1, t * 6) * sortie(t, 1.6, 2.2);
    },
    fin() { g.remove(); },
  };
}

// D · la réponse des hommes : chacun lève un petit « ! » puis lance un nuage de poussière à ses pieds, du plus près du secteur au plus loin
function reponse(c) {
  const { ctx, S, ids, x, y } = c, A = ctx.B.armee;
  const liste = [];
  for (let i = 0; i < A.n; i++) if (ids.includes(A.reg[i])) liste.push(i);
  liste.sort((a, b) => Math.hypot(A.x[a] - x, A.y[a] - y) - Math.hypot(A.x[b] - x, A.y[b] - y));
  const n = liste.length || 1;
  return {
    duree: 1.0,
    maj(t, g) {
      liste.forEach((i, k) => {
        if (i >= A.n || !ids.includes(A.reg[i])) return;               // la logique a compacté : on laisse tomber cet homme
        const a = t - (0.02 + 0.45 * k / n); if (a < 0 || a > 0.4) return;
        const [px, py] = S(A.x[i], A.y[i]), u = a / 0.4;
        g.globalAlpha = 1 - u; g.strokeStyle = P.r; g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(px, py, 2 + 9 * u, 1 + 4 * u, 0, 0, Math.PI * 2); g.stroke();
        if (a < 0.14) { g.fillStyle = P.o; g.globalAlpha = 1; g.fillRect(px - 1, py - 13, 2, 5); g.fillRect(px - 1, py - 6, 2, 2); }
      });
    },
  };
}

// E · la bannière : la bannière de chaque régiment se déploie au-dessus de ses hommes, flotte un instant, puis se replie
function banniere(c) {
  const { ctx, L, ids } = c;
  const camp = ctx.B.etat.regiments.filter(r => r.camp === 0);
  const liste = ids.map(id => {
    const toile = el('div', `position:absolute;left:3px;top:-46px;width:50px;height:30px;box-sizing:border-box;border:2px solid ${P.t};background:${P.n};color:${P.t};${MONO}font-size:16px;display:grid;place-items:center;transform-origin:left center`, String(camp.findIndex(r => r.id === id) + 1));
    const w = el('div', `position:absolute;left:0;top:0;width:0;height:0;filter:${ombre}`, el('div', `position:absolute;left:0;top:-46px;width:3px;height:46px;background:${P.o}`), toile);
    L.scene.append(w);
    return { id, w, toile };
  });
  return {
    duree: 2.1,
    maj(t) {
      for (const b of liste) {
        const m = centroide(ctx, b.id); if (!m) continue;
        const u = ease(t / 0.35);
        b.w.style.transform = `translate(${m.sx}px,${m.y0 - 6}px)`;
        b.w.style.opacity = sortie(t, 1.6, 2.1);
        b.toile.style.transform = `scaleX(${u}) skewY(${Math.sin(t * 7) * 3 * u}deg)`;
      }
    },
    fin() { liste.forEach(b => b.w.remove()); },
  };
}

// F · le réticule : quatre coins d'os se referment sur l'emprise de l'ordre, une croix se pose au milieu en tournant d'un quart
function reticule(c) {
  const { L, S, x, y } = c;
  const coins = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => el('i', `position:absolute;left:0;top:0;width:16px;height:16px;border:0 solid ${P.o};border-${a < 0 ? 'left' : 'right'}-width:3px;border-${b < 0 ? 'top' : 'bottom'}-width:3px;filter:${ombre}`));
  const croix = el('div', `position:absolute;left:0;top:0;width:0;height:0;filter:${ombre}`, el('i', `position:absolute;left:-7px;top:-1px;width:14px;height:2px;background:${P.o}`), el('i', `position:absolute;left:-1px;top:-7px;width:2px;height:14px;background:${P.o}`));
  L.scene.append(...coins, croix);
  return {
    duree: 1.5,
    maj(t) {
      const q = [[-23, -9], [23, -9], [23, 9], [-23, 9]].map(([a, b]) => S(x + a, y + b));
      const x0 = Math.min(...q.map(p => p[0])), x1 = Math.max(...q.map(p => p[0])), y0 = Math.min(...q.map(p => p[1])), y1 = Math.max(...q.map(p => p[1]));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, u = ease(t / 0.35), k = 1 + 1.6 * (1 - u), o = sortie(t, 1.0, 1.4);
      coins.forEach((e, i) => { const a = i % 2 ? 1 : -1, b = i < 2 ? -1 : 1; e.style.opacity = o * Math.min(1, t * 8); e.style.transform = `translate(${cx + a * (x1 - x0) / 2 * k - (a > 0 ? 16 : 0)}px,${cy + b * (y1 - y0) / 2 * k - (b > 0 ? 16 : 0)}px)`; });
      croix.style.opacity = o * ease((t - 0.2) / 0.2);
      croix.style.transform = `translate(${cx}px,${cy}px) rotate(${45 * (1 - ease((t - 0.2) / 0.3))}deg)`;
    },
    fin() { coins.forEach(e => e.remove()); croix.remove(); },
  };
}

const ORDRES = { fanion, ondes, reponse, banniere, reticule, combine: c => [fanion(c), reponse(c)] };   // `combine` : ce que le jeu fait depuis la v0.41.3 (le fanion et la réponse des hommes ensemble)

export function calqueOrdre(nom) {
  return (boite, ctx) => {
    const canvasMoteur = boite.querySelector('canvas');
    const L = couches(boite), G = gestionnaire(L);
    const aide = aideEn(boite, 'Cliquez un secteur : les régiments 1 et 2 y marchent');
    const k = reduit() ? 2.5 : 1;
    let raf = 0, partie = true, dernier = performance.now(), refus = 0;
    const S = (x, y) => ctx.rendu.versEcran(x, y);
    const surClic = e => {
      if (e.button !== 0 || !ctx.rendu || !ctx.B || e.target.closest?.('button')) return;
      const cr = canvasMoteur.getBoundingClientRect();
      const [x, y] = ctx.rendu.versTerrain(e.clientX - cr.left, e.clientY - cr.top);
      if (x < -1e4) return;
      const ids = ctx.B.etat.regiments.filter(r => r.camp === 0).slice(0, 2).map(r => r.id);
      const res = ordonnerMarche(ctx.B, ids, x, y);                  // l'ordre est vrai : les hommes marchent
      if (!res.ok) { aide.textContent = res.refus || 'Ordre refusé.'; refus = 2.5; return; }   // un ordre impossible se refuse à voix haute (section 12)
      aide.textContent = 'Cliquez un autre secteur'; refus = 0;
      const fabrique = ORDRES[nom];
      if (fabrique) for (const fx of [].concat(fabrique({ ctx, L, S, ids, x, y }))) G.ajouter(fx);
    };
    boite.addEventListener('pointerdown', surClic);
    const boucle = now => {
      const dt = Math.min(0.1, (now - dernier) / 1000); dernier = now;
      if (ctx.rendu && ctx.B) G.maj(dt * k);
      if (refus > 0 && (refus -= dt) <= 0) aide.textContent = 'Cliquez un secteur : les régiments 1 et 2 y marchent';
      if (partie) raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); boite.removeEventListener('pointerdown', surClic); G.vider(); };
  };
}

// ─── 3 · Un coup d'obus ──────────────────────────────────────────────────────

const VOL = 1.3;                                                    // secondes de jeu entre l'ordre et la chute
const SECOUSSE = { 75: 1.5, 155: 3.5, 220: 7 };                     // pixels de l'écran, au départ
const GEL = { 75: 0, 155: 0.05, 220: 0.09 };                        // secondes d'image figée
const TERRE = { 75: 14, 155: 26, 220: 44 };                         // éclats de terre qui retombent

// B · la trajectoire : un trait d'os suit l'obus du ciel jusqu'au sol, et son ombre grandit sur la cible
function trajectoire(c) {
  const { ctx, L, S, p } = c;
  const g = svgEl('g');
  const sol = svgEl('ellipse', { fill: P.t });
  const trace = svgEl('path', { fill: 'none', stroke: P.o, 'stroke-width': 2, 'stroke-linecap': 'round' });
  const noir = svgEl('path', { fill: 'none', stroke: P.t, 'stroke-width': 4, 'stroke-linecap': 'round' });
  const tete = svgEl('circle', { r: 3.5, fill: P.o, stroke: P.t, 'stroke-width': 1.5 });
  g.append(sol, noir, trace, tete); L.svg.append(g);
  return {
    duree: 5,
    fini: () => !c.pendants.includes(p),
    maj() {
      const u = borne((ctx.B.etat.temps - p.t0) / VOL), [sx, sy] = S(p.x, p.y);
      const P0 = [sx + 150, sy - 460], C1 = [sx + 70, sy - 560];
      const pt = w => { const a = (1 - w) ** 2, b = 2 * (1 - w) * w, d = w * w; return [a * P0[0] + b * C1[0] + d * sx, a * P0[1] + b * C1[1] + d * sy]; };
      const debut = Math.max(0, u - 0.35), echant = Array.from({ length: 14 }, (_, i) => pt(debut + (u - debut) * i / 13));
      const d = 'M' + echant.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L');
      trace.setAttribute('d', d); noir.setAttribute('d', d);
      const h = pt(u); tete.setAttribute('cx', h[0]); tete.setAttribute('cy', h[1]);
      const r = rayonPx(S, p.x, p.y, CALIBRES[p.cal].rayon) * (0.25 + 0.75 * u);
      sol.setAttribute('cx', sx); sol.setAttribute('cy', sy); sol.setAttribute('rx', r); sol.setAttribute('ry', r * 0.45); sol.style.opacity = 0.1 + 0.4 * u;
    },
    fin() { g.remove(); },
  };
}

// C · l'impact en trois temps : un éclair blanc d'un instant, puis un anneau de poussière qui s'élargit (la gerbe et la fumée sont celles du jeu)
function troisTemps(c) {
  const { L, S, x, y, cal } = c, Rm = CALIBRES[cal].rayon;
  const eclair = svgEl('ellipse', { fill: P.o });
  const bague = svgEl('polygon', { fill: 'none', stroke: P.r, 'stroke-linejoin': 'round' });
  L.svg.append(eclair, bague);
  return {
    duree: 0.7,
    maj(t) {
      const [sx, sy] = S(x, y), r = rayonPx(S, x, y, Rm);
      eclair.setAttribute('cx', sx); eclair.setAttribute('cy', sy); eclair.setAttribute('rx', r * 0.7); eclair.setAttribute('ry', r * 0.4);
      eclair.style.opacity = t < 0.08 ? 1 - t / 0.08 : 0;
      const u = borne((t - 0.04) / 0.55);
      bague.setAttribute('points', points(anneau(S, x, y, Rm * (0.3 + 0.9 * ease(u)))));
      bague.setAttribute('stroke-width', 1 + 2 * (1 - u)); bague.style.opacity = (1 - u) * 0.9;
    },
    fin() { eclair.remove(); bague.remove(); },
  };
}

// D · l'onde de choc : un anneau de pression court sur le sol jusqu'à trois fois le rayon, et le champ tremble (plus fort avec le calibre)
function ondeChoc(c) {
  const { L, S, x, y, cal } = c, Rm = CALIBRES[cal].rayon;
  const o = svgEl('polygon', { fill: 'none', stroke: P.o, 'stroke-width': 2, 'stroke-linejoin': 'round' }); o.style.filter = ombre;
  L.svg.append(o);
  c.secouer(SECOUSSE[cal]);
  return {
    duree: 0.8,
    maj(t) { const u = t / 0.8; o.setAttribute('points', points(anneau(S, x, y, Rm * (0.4 + 2.6 * ease(u))))); o.style.opacity = (1 - u) * 0.8; },
    fin() { o.remove(); },
  };
}

// E · la terre qui retombe : des éclats (de la couleur du sol) partent en l'air et retombent autour du cratère
function terre(c) {
  const { S, x, y, cal } = c, n = TERRE[cal], fort = cal === '220' ? 1.4 : cal === '155' ? 1.15 : 1, couleurs = [P.b, P.g, P.s, P.h];
  const eclats = Array.from({ length: n }, () => {
    const a = (Math.random() - 0.5) * 1.8, v = (140 + Math.random() * 160) * fort;
    return { vx: Math.sin(a) * v, vy: -Math.cos(a) * v, sol: Math.random() * 6 - 3, ox: (Math.random() - 0.5) * 8, taille: 2 + Math.floor(Math.random() * 3), couleur: couleurs[Math.floor(Math.random() * 4)] };
  });
  return {
    duree: 1.4,
    maj(t, g) {
      const [sx, sy] = S(x, y);
      g.globalAlpha = t < 0.9 ? 1 : 1 - (t - 0.9) / 0.5;
      for (const e of eclats) {
        const py = Math.min(e.sol, e.vy * t + 0.5 * 560 * t * t);
        g.fillStyle = e.couleur; g.fillRect(Math.round(sx + e.ox + e.vx * t), Math.round(sy + py), e.taille, e.taille);
      }
    },
  };
}

// F · le gel d'image : sur les gros calibres, l'image se fige une fraction de seconde au moment du choc, sous un voile d'os qui s'éteint (rien sur le 75)
function gel(c) {
  const { L, cal } = c;
  c.figer(GEL[cal]);
  const voile = el('div', `position:absolute;inset:0;background:${P.o}`);
  L.scene.append(voile);
  return { duree: 0.12, maj(t) { voile.style.opacity = cal === '75' ? 0 : 0.3 * (1 - t / 0.12); }, fin() { voile.remove(); } };
}

const COUPS = { trajectoire: null, troisTemps, ondeChoc, terre, gel };

export function calqueObus(nom) {
  return (boite, ctx) => {
    const canvasMoteur = boite.querySelector('canvas');
    const L = couches(boite), G = gestionnaire(L);
    // le labo tire des obus à dispersion nulle : ils tombent où l'on clique (CALIBRES est partagé : on le rend au nettoyage)
    const dispersions = Object.entries(CALIBRES).map(([cal, C]) => [cal, C.dispersion]);
    for (const C of Object.values(CALIBRES)) C.dispersion = 0;
    let cal = '155', raf = 0, partie = true, dernier = performance.now(), secousse = 0, figee = 0, rendu0 = null, orig = null;
    const pendants = [];
    const k = reduit() ? 2.5 : 1;
    const S = (x, y) => ctx.rendu.versEcran(x, y);
    const aide = aideEn(boite, 'Cliquez le champ : un obus y tombe');
    // le choix du calibre
    const barre = el('div', 'position:absolute;left:8px;top:8px;display:flex;gap:6px');
    const boutons = ['75', '155', '220'].map(c => {
      const b = el('button', `height:32px;min-width:44px;padding:0 10px;${MONO}cursor:pointer;border:1px solid ${P.g};box-shadow:3px 3px 0 ${P.t}`, c);
      b.onclick = () => { cal = c; peindre(); };
      return b;
    });
    const peindre = () => boutons.forEach(b => { const on = b.textContent === cal; b.style.background = on ? P.t : P.o; b.style.color = on ? P.o : P.t; });
    peindre(); barre.append(...boutons); boite.append(barre);

    const surImpact = e => {
      const i = pendants.findIndex(p => p.cal === e.cal && Math.abs(p.x - e.x) < 0.2 && Math.abs(p.y - e.y) < 0.2);
      if (i < 0) return;                                              // un obus d'en face : pas d'effet de maquette
      const [p] = pendants.splice(i, 1), fabrique = COUPS[nom];
      if (fabrique) G.ajouter(fabrique({ ctx, L, S, x: p.x, y: p.y, cal: p.cal, secouer: a => { if (!reduit()) secousse = Math.max(secousse, a); }, figer: s => { if (!reduit()) figee = Math.max(figee, s); } }));
    };
    // le rendu : on écoute ses événements d'impact, et le gel d'image saute le dessin (la logique continue)
    const accrocher = () => {
      if (rendu0 === ctx.rendu) return;
      rendu0 = ctx.rendu; orig = rendu0.dessiner;
      rendu0.dessiner = (dt, ev = []) => {
        for (const e of ev) if (e.type === 'impact') surImpact(e);
        if (figee > 0 && !ev.length) { figee -= dt; return undefined; }
        return orig.call(rendu0, dt, ev);
      };
    };
    const surClic = e => {
      if (e.button !== 0 || !ctx.rendu || !ctx.B || e.target.closest?.('button')) return;
      const cr = canvasMoteur.getBoundingClientRect();
      const [x, y] = ctx.rendu.versTerrain(e.clientX - cr.left, e.clientY - cr.top);
      if (x < -1e4) return;
      const B = ctx.B;
      B.etat.batteries[cal] = 0;                                      // la maquette ne recharge pas
      const res = ordonnerBarrage(B, cal, x, y);
      if (!res.ok) { aide.textContent = res.refus || 'Pas de tir.'; return; }
      aide.textContent = 'Cliquez le champ : un obus y tombe';
      const b = B.etat.barrages[B.etat.barrages.length - 1];
      b.reste = 1; b.prochain = B.etat.temps + VOL;                   // un seul obus, qui tombe dans VOL secondes de jeu
      const p = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, cal, t0: B.etat.temps };
      pendants.push(p);
      if (nom === 'trajectoire') G.ajouter(trajectoire({ ctx, L, S, p, pendants }));
    };
    boite.addEventListener('pointerdown', surClic);
    const boucle = now => {
      const dt = Math.min(0.1, (now - dernier) / 1000); dernier = now;
      if (ctx.rendu && ctx.B) {
        accrocher();
        G.maj(dt * k);
        if (secousse > 0.1) { canvasMoteur.style.transform = `translate(${(Math.random() * 2 - 1) * secousse}px,${(Math.random() * 2 - 1) * secousse}px)`; secousse *= Math.exp(-dt * 9); }
        else if (secousse > 0) { secousse = 0; canvasMoteur.style.transform = ''; }
      }
      if (partie) raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => {
      partie = false; cancelAnimationFrame(raf); boite.removeEventListener('pointerdown', surClic); G.vider();
      if (rendu0 && orig) rendu0.dessiner = orig;
      canvasMoteur.style.transform = '';
      for (const [c, d] of dispersions) CALIBRES[c].dispersion = d;
    };
  };
}
