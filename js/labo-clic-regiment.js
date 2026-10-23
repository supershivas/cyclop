// Le sujet « Le clic sur un régiment » du labo (Jérôme, v0.32.2) : on clique le bouton d'un régiment, dans la rangée du bas ; la caméra glisse
// sur lui (0,6 s, le zoom et l'angle ne changent pas) et quelque chose dit « c'est celui-là » : sur la carte et sur le champ. Posé sur le moteur en direct,
// avec les vrais hommes qui marchent : cliquez une carte. Quatre animations ; la A est celle du jeu. Le dessin seulement : rien ici ne modifie une partie.
import { PALETTE as P } from './palette.js?v=0.62.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'font:12px/1.3 ui-monospace,monospace;';
const NOMS = ['Porphyre', 'Protogyne', 'Céruléen', 'Viride', 'Syzygie', 'Murmurati…', 'Hapax', 'Sinople'];
const ombre = `drop-shadow(1px 1px 0 ${P.t}) drop-shadow(-1px -1px 0 ${P.t})`;
const sortie = (t, debut, fin) => t < debut ? 1 : Math.max(0, 1 - (t - debut) / (fin - debut));   // 1 puis 0 : le fondu de fin

// le centre et l'emprise (en pixels) d'un régiment, de ses hommes
function lire(ctx, id) {
  const { B, rendu } = ctx, A = B.armee;
  let x = 0, y = 0, n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === id) {
    x += A.x[i]; y += A.y[i]; n++;
    const [sx, sy] = rendu.versEcran(A.x[i], A.y[i]);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  if (!n) return null;
  const [sx, sy] = rendu.versEcran(x / n, y / n);
  return { x: x / n, y: y / n, sx, sy, x0, x1, y0, y1 };
}

// A · le sonar : deux anneaux d'os se resserrent autour du régiment ; la carte s'enfonce d'un cran (celle du jeu)
function sonar(scene) {
  const an = [0, 1].map(() => el('i', `position:absolute;left:0;top:0;width:180px;height:180px;margin:-90px 0 0 -90px;box-sizing:border-box;border:2px solid ${P.o};border-radius:50%;filter:${ombre}`));
  scene.append(...an);
  return {
    duree: 1.2,
    carte: t => t < 0.32 ? `translate(${3 * Math.sin(t / 0.32 * Math.PI)}px,${3 * Math.sin(t / 0.32 * Math.PI)}px)` : '',
    maj(t, c) {
      an.forEach((a, k) => { const u = Math.max(0, Math.min(1, (t - k * 0.18) / 0.9)); a.style.opacity = u > 0 && u < 1 ? Math.min(1, u * 4) * (1 - u * 0.2) : 0; a.style.transform = `translate(${c.sx}px,${c.sy}px) scale(${1.6 - 1.35 * u})`; });
    },
  };
}

// B · les équerres : quatre coins d'os se referment sur l'emprise du régiment, la carte s'allume (inversée) un instant
function equerres(scene) {
  const coins = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, b]) => el('i', `position:absolute;left:0;top:0;width:16px;height:16px;border:0 solid ${P.o};border-${a > 0 ? 'left' : 'right'}-width:3px;border-${b > 0 ? 'top' : 'bottom'}-width:3px;filter:${ombre}`));
  scene.append(...coins);
  return {
    duree: 1.4,
    carte: t => t < 0.25 ? `translateY(-2px)` : '',
    carteInversee: t => t < 0.25,
    maj(t, c) {
      const u = 1 - (1 - Math.min(1, t / 0.5)) ** 3, w = Math.max(46, c.x1 - c.x0) / 2 + 12, h = Math.max(30, c.y1 - c.y0) / 2 + 12, k = 1 + 1.4 * (1 - u), o = sortie(t, 1, 1.4);
      coins.forEach((e, i) => { const a = i % 2 ? 1 : -1, b = i < 2 ? -1 : 1; e.style.opacity = o * Math.min(1, t * 6); e.style.transform = `translate(${c.sx + a * w * k - (a > 0 ? 16 : 0)}px,${(c.y0 + c.y1) / 2 + b * h * k - (b > 0 ? 16 : 0)}px)`; });
    },
  };
}

// C · le fanion : un pin numéroté, à la couleur de l'armée, tombe du ciel au-dessus du régiment et rebondit ; la carte se soulève et retombe
function fanion(scene, ctx, id) {
  const num = ctx.B.etat.regiments.filter(r => r.camp === 0).findIndex(r => r.id === id) + 1;
  const pin = el('div', `position:absolute;left:0;top:0;width:26px;height:26px;margin:-52px 0 0 -13px;display:grid;place-items:center;box-sizing:border-box;border:2px solid ${P.t};border-radius:50%;background:${P.n};color:${P.t};${MONO}font-size:14px`, String(num));
  pin.append(el('i', `position:absolute;left:5px;top:20px;border:7px solid transparent;border-top:12px solid ${P.n};border-bottom:0;filter:drop-shadow(0 1px 0 ${P.t})`));
  scene.append(pin);
  return {
    duree: 1.8,
    carte: t => `translateY(${t < 0.3 ? -8 * Math.sin(t / 0.3 * Math.PI) : 0}px)`,
    maj(t, c) {
      const d = t < 0.4 ? -160 * (1 - (t / 0.4) ** 2) : t < 0.6 ? -22 * Math.sin((t - 0.4) / 0.2 * Math.PI) : t < 0.75 ? -7 * Math.sin((t - 0.6) / 0.15 * Math.PI) : 0;
      pin.style.opacity = t < 0.05 ? t / 0.05 : sortie(t, 1.4, 1.8);
      pin.style.transform = `translate(${c.sx}px,${c.sy - Math.max(0, (c.y1 - c.y0) / 2) + d}px)`;
    },
  };
}

// D · le fil : un trait pointillé se déroule de la carte jusqu'au régiment, où un anneau bat ; la carte est soulignée d'un trait qui la traverse
function fil(scene, ctx, id, carte) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
  svg.innerHTML = `<line stroke="${P.t}" stroke-width="4" stroke-linecap="round"/><line stroke="${P.o}" stroke-width="2" stroke-dasharray="7 5" stroke-linecap="round"/><circle r="10" fill="none" stroke="${P.o}" stroke-width="2"/>`;
  scene.append(svg);
  const [ombreL, trait, rond] = svg.children;
  return {
    duree: 1.8,
    carte: t => '',
    soulignee: true,
    maj(t, c, ctx2) {
      const b = ctx2.boite.getBoundingClientRect(), r = carte.getBoundingClientRect(), x0 = r.left - b.left + r.width / 2, y0 = r.top - b.top;
      const u = 1 - (1 - Math.min(1, t / 0.5)) ** 3, x = x0 + (c.sx - x0) * u, y = y0 + (c.sy - y0) * u, o = sortie(t, 1.3, 1.8);
      for (const l of [ombreL, trait]) { l.setAttribute('x1', x0); l.setAttribute('y1', y0); l.setAttribute('x2', x); l.setAttribute('y2', y); l.style.opacity = o; }
      const pulse = Math.max(0, t - 0.5), k = (pulse % 0.5) / 0.5;
      rond.setAttribute('cx', c.sx); rond.setAttribute('cy', c.sy); rond.setAttribute('r', 6 + 20 * k); rond.style.opacity = t < 0.5 ? 0 : o * (1 - k);
    },
  };
}

const ANIMS = { sonar, equerres, fanion, fil };

// La fenêtre d'ordres (sujet « La fenêtre d'ordres ») : le papier du jeu (le régiment, ce qu'il fait, les formes, les actions) et sa façon d'apparaître
const papierOrdres = (num, nom) => {
  const bouton = (t, actif = false) => el('span', `display:inline-block;height:28px;line-height:28px;padding:0 8px;border:1px solid ${actif ? P.t : P.g};${actif ? `background:${P.t};color:${P.o}` : ''}`, t);
  const p = el('div', `position:absolute;width:290px;box-sizing:border-box;padding:6px 10px 10px;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};pointer-events:auto`);
  const lignes = [
    el('div', `display:flex;justify-content:space-between;border-bottom:1px solid ${P.g};padding-bottom:2px;font-size:15px`, el('b', 'font-weight:normal', `${num} · ${nom}`), el('span', `color:${P.g};font-size:12px`, 'D')),
    el('div', `color:${P.g};margin-top:3px`, '94 debout · 0 blessés · 0 tombés'),
    el('div', `color:${P.g}`, 'tient D1'),
    el('div', 'display:flex;gap:4px;margin-top:5px', bouton('Bloc', true), bouton('Ligne'), bouton('Par deux'), bouton('Colonne')),
    el('div', 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap', bouton('Marcher'), bouton('Regagner sa tranchée'), bouton('Fiche')),
  ];
  p.append(...lignes);
  return { p, lignes };
};
const jouer = (e, keyframes, duree, opts = {}) => e.animate(keyframes, { duration: duree, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards', ...opts });

export function calqueClic(nom, fen = null) {
  return (boite, ctx) => {
    const fabrique = ANIMS[nom];
    const scene = el('div', 'position:absolute;inset:0;pointer-events:none;overflow:hidden');
    const rang = el('div', 'position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:8px;max-width:calc(100% - 16px)');
    const cartes = NOMS.map((n, i) => {
      const b = el('button', `flex:none;display:grid;gap:3px;align-content:start;width:96px;padding:4px 6px 6px;text-align:left;cursor:pointer;border:0;border-top:3px solid ${P.n};background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};position:relative`,
        el('span', 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis', el('b', 'font-weight:normal;font-size:16px', String(i + 1)), ` ${n}`),
        el('span', `letter-spacing:2px;color:${P.g};font-size:10px;line-height:8px`, '^^^'),
        el('span', `display:block;height:8px;border:1px solid currentColor;background:linear-gradient(90deg,currentColor 0 ${60 + (i * 9) % 40}%,transparent 0)`));
      b.onclick = () => choisir(i);
      return b;
    });
    rang.append(...cartes);
    const aide = el('div', `position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:3px 8px;background:${P.o};color:${P.t};${MONO}box-shadow:3px 3px 0 ${P.t};pointer-events:none`, 'Cliquez la carte d\'un régiment');
    boite.append(scene, aide, rang);

    let choisi = -1, centrage = null, anim = null, raf = 0, t = 0, dernier = performance.now(), partie = true, fenetre = null;
    function choisir(i) {
      const regs = ctx.B?.etat.regiments.filter(r => r.camp === 0);
      if (!regs?.[i]) return;
      choisi = i; aide.style.display = 'none';
      cartes.forEach((c, k) => { c.style.transform = ''; c.style.background = k === i ? P.t : P.o; c.style.color = k === i ? P.o : P.t; c.style.outline = k === i ? `2px solid ${P.o}` : 'none'; c.style.outlineOffset = '-5px'; });
      const c = lire(ctx, regs[i].id);
      if (!c) return;
      centrage = { x0: ctx.rendu.vue.cx, z0: ctx.rendu.vue.cz, x1: c.x, z1: c.y, t: 0 };
      scene.replaceChildren();
      anim = { ...fabrique(scene, ctx, regs[i].id, cartes[i]), id: regs[i].id, i, t: 0 };
      if (fen) ouvrir(i, regs[i].id);
    }
    // la fenêtre d'ordres au-dessus de la carte choisie (ou, pour « bulle », près des hommes) ; chaque variante a sa façon d'apparaître
    function ouvrir(i, id) {
      fenetre?.p.remove();
      const { p, lignes } = papierOrdres(i + 1, NOMS[i]);
      fenetre = { p, id, i, fen };
      cartes.forEach(c => { c.style.borderTopColor = P.n; });
      boite.append(p);
      const b = boite.getBoundingClientRect(), r = cartes[i].getBoundingClientRect();
      const gauche = Math.max(8, Math.min(r.left - b.left + r.width / 2 - 145, b.width - 298));
      p.style.left = `${gauche}px`; p.style.bottom = `${b.bottom - r.top + (fen === 'feuille' ? 0 : 8)}px`;
      if (fen === 'feuille') { cartes[i].style.background = P.o; cartes[i].style.color = P.t; cartes[i].style.outline = 'none'; cartes[i].style.boxShadow = 'none'; cartes[i].style.borderTopColor = P.o; p.style.boxShadow = `3px 0 0 ${P.t}`; }
      if (fen === 'tiroir') { p.style.transformOrigin = 'bottom center'; jouer(p, [{ transform: 'scaleY(.05)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], 260); }
      else if (fen === 'rabat') { p.style.transformOrigin = 'bottom center'; jouer(p, [{ transform: 'perspective(500px) rotateX(88deg)', opacity: .4 }, { transform: 'perspective(500px) rotateX(0)', opacity: 1 }], 340); }
      else if (fen === 'feuille') { jouer(p, [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 320); }
      else if (fen === 'bulle') { p.style.transformOrigin = 'bottom center'; jouer(p, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], 380, { easing: 'ease-out' });
        const pointe = el('i', `position:absolute;left:50%;bottom:-10px;margin-left:-8px;border:8px solid transparent;border-top:10px solid ${P.o};border-bottom:0`); p.append(pointe); }
      else if (fen === 'lignes') lignes.forEach((l, k) => jouer(l, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], 200, { delay: 60 + k * 90 }));
    }
    function boucle(now) {
      const dt = Math.min(0.1, (now - dernier) / 1000); dernier = now;
      if (ctx.rendu && ctx.B) {
        if (centrage) {
          centrage.t = Math.min(1, centrage.t + dt / 0.6);
          const k = 1 - (1 - centrage.t) ** 3;
          ctx.rendu.vue.cx = centrage.x0 + (centrage.x1 - centrage.x0) * k; ctx.rendu.vue.cz = centrage.z0 + (centrage.z1 - centrage.z0) * k;
          ctx.rendu.deplacer(0, 0);
          if (centrage.t >= 1) centrage = null;
        }
        if (anim) {
          anim.t += dt;
          const carte = cartes[anim.i], c = lire(ctx, anim.id);
          if (anim.t > anim.duree || !c) { scene.replaceChildren(); carte.style.transform = ''; if (fen !== 'feuille') { carte.style.background = P.t; carte.style.color = P.o; } anim = null; }
          else {
            carte.style.transform = anim.carte(anim.t);
            if (anim.carteInversee && fen !== 'feuille') { const inv = anim.carteInversee(anim.t); carte.style.background = inv ? P.o : P.t; carte.style.color = inv ? P.t : P.o; }
            anim.maj(anim.t, c, { boite });
          }
        }
        if (fenetre?.fen === 'bulle') {
          const c = lire(ctx, fenetre.id), w = 290, h = fenetre.p.offsetHeight, bw = boite.clientWidth;
          if (c) { fenetre.p.style.bottom = 'auto'; fenetre.p.style.left = `${Math.max(8, Math.min(c.sx - w / 2, bw - w - 8))}px`; fenetre.p.style.top = `${Math.max(8, c.y0 - h - 36)}px`; }
        }
      }
      if (partie) raf = requestAnimationFrame(boucle);
    }
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); };
  };
}
