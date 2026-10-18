// Les sujets « Projections » et « Visée d'un obus » du labo : deux maquettes jouées sur le moteur du jeu (zoom proche).
//
// « Projections » : un obus tombe sur un régiment en marche. Ce qu'il doit se passer (Jérôme, v0.32.0) :
//  - les hommes dans le souffle sont jetés en l'air (à l'opposé du point de chute), puis tués ou blessés ;
//  - ceux qui sont hors du souffle, mais près, sont ralentis puis reprennent leur marche ; pas de vague : tous sont ralentis
//    au même instant, et repartent ensemble (le temps ne dépend pas de la distance, seule la force du coup en dépend).
// La variante A est le jeu tel qu'il est (la poussée de la v0.16.0, sans le bond retiré en v0.32.1, la projection des morts de la v0.24.0, aucun ralentissement) : un vrai
// obus de la logique. B à D sont des maquettes : le labo jette lui-même les hommes (`rendu.lancer`, `mourir` avec le point d'arrivée) et
// ralentit ceux de l'anneau en retenant leur pas (la logique du jeu ne sait pas ralentir). Rien n'est sauvegardé, rien ne change dans le jeu.
//
// « Visée d'un obus » : le cercle qui dit où l'obus tombera, sur le champ de bataille, pour chaque calibre. Un SVG posé sur la vue,
// dont chaque point du cercle est projeté sur le sol (`versEcran`) : le cercle suit le relief et la perspective.
import { PALETTE } from './palette.js?v=0.32.2';
import { nouvelleBataille, avancer, ordonnerMarche, mourir, PAS } from './bataille.js?v=0.32.2';
import { compacter } from './army.js?v=0.32.2';
import { impact } from './terrain.js?v=0.32.2';
import { creerRendu } from './rendu3d.js?v=0.32.2';
import { CALIBRES } from './data/calibres.js?v=0.32.2';
import { hash2 } from './lib/rng.js?v=0.32.2';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const CALS = ['75', '155', '220'];
const ZOOM_PROCHE = 7;                 // 16 pixels par mètre (ZOOMS[7]) : on voit chaque homme
const CHUTE = 0.25;                    // l'obus met ce temps à tomber (effets.chute, eclats.js) : la physique attend l'explosion
const ANNEAU = 1.8;                    // l'anneau du ralentissement va jusqu'à 1,8 rayon (souffleZone, reglages.js)

// ─── Les quatre façons de jeter les hommes et de ralentir les autres ───
// souffle : le rayon jeté, en rayons du calibre ; dist : de combien on est jeté (en rayons du souffle, du bord au centre) ;
// duree, haut : le vol, sa flèche en part de la distance ; arret / tenue / retour : le ralentissement (s), f : la vitesse gardée (du plus près au plus loin de l'anneau)
const MANIERES = {
  B: { souffle: 1, dist: [0.55, 1], duree: 0.9, haut: 0.25, f: [0.25, 0.75], arret: 0, tenue: 0.6, retour: 2.4, sonnes: false },
  C: { souffle: 1.15, dist: [0.7, 1.3], duree: 0.55, haut: 0.07, f: [0, 0.6], arret: 0.4, tenue: 0.4, retour: 1.2, sonnes: true },
  D: { souffle: 1, dist: [0.2, 0.45], duree: 1.25, haut: 0.9, f: [0.35, 0.8], arret: 0, tenue: 2.5, retour: 0.4, sonnes: false },
};

const lisse = u => u * u * (3 - 2 * u);
const mix = (a, b, u) => a + (b - a) * u;

/* La scène commune : le moteur du jeu, un régiment des nôtres qui marche vers le haut dans un champ sans ennemi, la caméra près et qui le suit.
   `tick(dt, ctx)` est appelé à chaque image. Rend le nettoyage. */
function monter(stage, R, { tick, apres = null, marche = true, suivre = true, echelle = () => 1 }) {
  const R2 = typeof structuredClone === 'function' ? structuredClone(R) : R;
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(66vh,540px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  boite.append(canvas);
  stage.append(boite);
  let raf = 0, fini = false, rendu = null;
  (async () => {
    const B = nouvelleBataille(5, R2, { soldats: 640 });
    const A = B.armee, M = B.etat.marges;
    for (const r of B.etat.regiments) if (r.camp === 1) r.effectif = 0;          // pas d'ennemi : rien ne tire, rien ne tombe d'ailleurs
    for (let i = 0; i < A.n; i++) if (A.camp[i] === 1) A.mort[i] = 1;
    compacter(A);
    const reg = B.etat.regiments.filter(r => r.camp === 0)[2];
    const mien = [];
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) mien.push(i);
    // le régiment est posé en bloc au milieu du champ, tourné vers le haut, puis envoyé tout droit
    const X0 = M.x + 200, Y0 = M.y + 150, Y1 = M.y + 40;
    mien.forEach((i, k) => { A.x[i] = X0 - 13 + (k % 16) * 1.7; A.y[i] = Y0 + Math.floor(k / 16) * 1.8; A.vx[i] = 0; A.vy[i] = 0; });
    if (marche) ordonnerMarche(B, [reg.id], X0, Y1, 'ligne');
    rendu = await creerRendu(canvas, { mesure: true });
    if (fini) { rendu.detruire(); return; }
    rendu.redimensionner(); rendu.attacher(B);
    rendu.vue.zoom = ZOOM_PROCHE; rendu.vue.cx = X0; rendu.vue.cz = Y0 - 4;
    const ctx = { B, R: R2, rendu, boite, mien, idx: new Map(), reg, A, M, t: 0, centre: () => centre(A, ctx.mien) };
    // (le jeu retire les morts du tableau à chaque pas : les indices changent, les numéros (`id`) restent ; on se repère après chaque pas)
    ctx.reperer = () => { ctx.mien = []; ctx.idx.clear(); for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && !A.mort[i]) { ctx.mien.push(i); ctx.idx.set(A.id[i], i); } };
    ctx.reperer();
    let t = performance.now(), acc = 0;
    const boucle = now => {
      const dt = Math.min(0.1, (now - t) / 1000) * echelle(); t = now; ctx.t += dt;
      // la caméra suit le régiment, un peu devant lui
      const c = ctx.centre();
      if (c && suivre) { rendu.vue.cx += (c.x - rendu.vue.cx) * Math.min(1, dt * 3); rendu.vue.cz += (c.y - 4 - rendu.vue.cz) * Math.min(1, dt * 3); }
      acc += dt;
      let ev = [];
      for (let n = 0; acc >= PAS && n < 3; n++, acc -= PAS) { ev = ev.concat(tick.pas(PAS, ctx)); ctx.reperer(); }
      if (acc > 3 * PAS) acc = 0;
      rendu.dessiner(dt, ev);
      tick.image?.(dt, ctx);
      raf = requestAnimationFrame(boucle);
    };
    apres?.(ctx);
    raf = requestAnimationFrame(boucle);
  })();
  return () => { fini = true; cancelAnimationFrame(raf); rendu?.detruire(); };
}
function centre(A, ids) {
  let x = 0, y = 0, n = 0;
  for (const i of ids) if (!A.mort[i]) { x += A.x[i]; y += A.y[i]; n++; }
  return n ? { x: x / n, y: y / n, n } : null;
}

// ─── Un cercle posé sur le sol : chaque point est projeté à l'écran ───
function pointsCercle(rendu, x, y, r, n = 72) {
  const p = [];
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; p.push(rendu.versEcran(x + Math.cos(a) * r, y + Math.sin(a) * r)); }
  return p;
}
const chemin = p => 'M' + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';

/* ─── « Projections » ─── */
export function maquetteProjections(stage, R, lettre) {
  const M = MANIERES[lettre] || null;                  // A : le jeu tel qu'il est
  let cal = '155', pendant = null, nImpacts = 0;
  const compte = el('p', { className: 'releve', textContent: '…' });
  const bilan = { jetes: 0, tues: 0, blesses: 0, ralentis: 0 };
  const haut = el('p', {});
  const bouton = (texte, f, cls = 'essai') => el('button', { className: cls, textContent: texte, onclick: f });
  const boutonsCal = CALS.map(c => bouton(`${c} mm`, () => { cal = c; majBoutons(); }));
  const majBoutons = () => boutonsCal.forEach((b, k) => { b.style.outline = CALS[k] === cal ? `2px solid ${PALETTE.o}` : ''; });
  majBoutons();
  const zones = el('label', {}, el('input', { type: 'checkbox', checked: true }), ' montrer les zones ');
  const ralenti = el('label', {}, el('input', { type: 'checkbox' }), ' ralenti ');
  haut.append(...boutonsCal, bouton('Tirer un obus', () => tirer()), bouton('Rejouer', () => rejouer()), zones, ralenti);
  stage.append(haut, compte);
  let dehors = null, svg = null, courant = null;
  const actifs = [];                                   // les vols : { i, t, dur, x0, y0, x1, y1, fin }
  let ralentis = null;                                 // le ralentissement en cours : { t, ids: [{ i, f }], ... }
  let zonesVues = null;                                // l'anneau montré après l'impact : { x, y, S, ext, t }

  function rejouer() { dehors?.(); stage.replaceChildren(haut, compte); bilan.jetes = bilan.tues = bilan.blesses = bilan.ralentis = 0; actifs.length = 0; ralentis = null; zonesVues = null; pendant = null; demarrer(); }
  function tirer() {
    if (!courant || pendant) return;
    const { B, A } = courant, c = centre(A, courant.mien);
    if (!c) return;
    const x = c.x, y = c.y - 4;                       // dans le tiers avant du régiment
    zonesVues = { x, y, ...rayons(cal), t: 6 };
    pendant = { x, y, cal, t: CHUTE, age: 0, avant: { pertes: B.etat.pertes[0], blesses: B.etat.blesses[0] } };
    if (!M) {                                          // A : le vrai obus de la logique (sans la dispersion, pour qu'il tombe où l'on vise)
      const C = CALIBRES[cal], disp = C.dispersion;
      C.dispersion = 0; pendant.restaure = () => { C.dispersion = disp; };
      B.etat.barrages.push({ camp: 1, cal, x, y, reste: 1, prochain: B.etat.temps });
    } else {
      courant.evts.push({ type: 'impact', x, y, cal });
    }
  }
  const rayons = c => { const r = CALIBRES[c].rayon, S = r * (M ? M.souffle : 1); return { S, ext: r * ANNEAU + (S - r) }; };
  // l'explosion : la physique des variantes B à D (A est faite par la logique du jeu)
  function exploser(ctx, p) {
    const { B, A, mien } = ctx, { S, ext } = rayons(p.cal), T = B.terrain, lim = { x0: 1, x1: T.W - 1, y0: 1, y1: T.H - 1 };
    impact(B.terrain, p.x, p.y, p.cal, B.R, nImpacts++);
    const proj = B.R.obus.projection; proj.duree = M.duree; proj.haut = M.haut;      // le vol des morts (majCorps) suit la manière
    const ralentisIds = [];
    for (const i of mien) {
      if (A.mort[i]) continue;
      const dx = A.x[i] - p.x, dy = A.y[i] - p.y, d = Math.hypot(dx, dy);
      if (d < S) {
        const u = 1 - d / S, ux = d > 0.05 ? dx / d : (A.id[i] & 1 ? 1 : -1), uy = d > 0.05 ? dy / d : 0;
        const m = mix(M.dist[0], M.dist[1], u) * S;
        const x1 = Math.max(lim.x0, Math.min(lim.x1, A.x[i] + ux * m)), y1 = Math.max(lim.y0, Math.min(lim.y1, A.y[i] + uy * m));
        bilan.jetes++;
        // le sort de chacun : plus il est près, plus il meurt (un hachage de son numéro : toujours le même)
        const h = hash2(A.id[i], 11, 7);
        if (h < 0.1 + 0.85 * u) { mourir(B, i, 'obus', [x1, y1]); bilan.tues++; }
        else {
          actifs.push({ id: A.id[i], t: 0, dur: M.duree, x0: A.x[i], y0: A.y[i], x1, y1, fin: 1 + Math.floor(hash2(A.id[i], 12, 7) * 3), long: m });
        }
      } else if (d < ext) {
        const u = (d - S) / (ext - S);              // 0 au bord du souffle, 1 au bord de l'anneau
        ralentisIds.push({ id: A.id[i], f: mix(M.f[0], M.f[1], u), arret: M.arret * (1 - u) });
      }
    }
    bilan.ralentis += ralentisIds.length;
    if (ralentisIds.length) ralentis = { t: 0, ids: ralentisIds };
  }
  // le pas : les vols, le ralentissement, et le jeu
  const tick = {
    pas(dt, ctx) {
      const { B, A, reg } = ctx;
      courant = ctx;
      if (!M) {
        const ev = avancer(B);
        if (pendant) {
          if (pendant.restaure && B.etat.barrages.length === 0) { pendant.restaure(); pendant.restaure = null; }
          bilan.tues = B.etat.pertes[0] - pendant.avant.pertes; bilan.blesses = B.etat.blesses[0] - pendant.avant.blesses;
          if ((pendant.age += dt) > 6) pendant = null;
        }
        reg.moral = 1; reg.deroute = false;
        return ev;
      }
      // B à D : on garde les positions d'avant le pas pour retenir ceux qu'on ralentit
      const px = new Map();
      if (ralentis) for (const r of ralentis.ids) { const i = ctx.idx.get(r.id); if (i !== undefined && !A.mort[i]) px.set(r.id, [A.x[i], A.y[i]]); }
      const ev = avancer(B).concat(ctx.evts.splice(0));
      ctx.reperer();
      for (const e of ev) if (e.type === 'impact' && pendant) pendant.vu = true;
      reg.moral = 1; reg.deroute = false;
      if (pendant && pendant.vu) { pendant.t -= dt; if (pendant.t <= 0) { exploser(ctx, pendant); pendant = null; } }
      // les vols : en ligne droite sur le sol (la hauteur est dessinée par `lancer`), puis tué... ou blessé
      const vols = [];
      for (let k = actifs.length - 1; k >= 0; k--) {
        const a = actifs[k], i = ctx.idx.get(a.id);
        if (i === undefined) { actifs.splice(k, 1); continue; }
        a.t += dt;
        const u = Math.min(1, a.t / a.dur);
        A.x[i] = mix(a.x0, a.x1, u); A.y[i] = mix(a.y0, a.y1, u); A.vx[i] = 0; A.vy[i] = 0;
        if (u >= 1) {
          A.blessure[i] = a.fin; B.etat.blesses[0]++; A.peur[i] = Math.max(A.peur[i], 0.9); bilan.blesses++;
          actifs.splice(k, 1);
        } else vols.push([i, a.dur, M.haut * a.long, a.dur - a.t]);
      }
      ctx.rendu.lancers(vols);                          // (les indices ont bougé : le dessin reprend tous les vols à chaque pas)
      // le ralentissement : le même instant pour tous (le temps ne dépend pas de la distance), la force dépend de la distance
      if (ralentis) {
        ralentis.t += dt;
        const t = ralentis.t, { tenue, retour } = M;
        let fini = true;
        for (const r of ralentis.ids) {
          const i = ctx.idx.get(r.id);
          if (i === undefined || actifs.some(a => a.id === r.id)) continue;
          const stop = r.arret;
          let f;
          if (t < stop) f = 0;
          else if (t < stop + tenue) f = r.f;
          else if (t < stop + tenue + retour) f = mix(r.f, 1, lisse((t - stop - tenue) / retour));
          else f = 1;
          if (f < 1) fini = false;
          if (M.sonnes && t < stop + 0.3) A.peur[i] = Math.max(A.peur[i], 0.6);      // sonnés, ils se tapissent un instant
          const p = px.get(r.id);
          if (p && f < 1) { A.x[i] = p[0] + (A.x[i] - p[0]) * f; A.y[i] = p[1] + (A.y[i] - p[1]) * f; A.vx[i] *= f; A.vy[i] *= f; }
        }
        if (fini) ralentis = null;
      }
      return ev;
    },
    image(dt, ctx) {
      dessinerZones(ctx, dt);
      compte.textContent = `Jetés : ${bilan.jetes} · tués : ${bilan.tues} · blessés : ${bilan.blesses} · ralentis : ${bilan.ralentis} · debout : ${(ctx.centre() || { n: 0 }).n}`;
    },
  };
  function dessinerZones(ctx, dt) {
    const { rendu, boite } = ctx;
    if (!svg) {
      svg = svgEl('svg'); svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible';
      boite.append(svg);
    }
    svg.setAttribute('width', rendu.renderer.domElement.clientWidth); svg.setAttribute('height', rendu.renderer.domElement.clientHeight);
    svg.replaceChildren();
    const montrer = zones.querySelector('input').checked;
    if (zonesVues) { zonesVues.t -= dt; if (zonesVues.t <= 0) zonesVues = null; }
    if (!montrer) return;
    const Z = zonesVues;
    if (!Z) return;
    const op = Math.min(1, Z.t / 1.5);
    const dessin = (r, dash) => svg.append(svgEl('path', { d: chemin(pointsCercle(rendu, Z.x, Z.y, r)), fill: 'none', stroke: PALETTE.o, 'stroke-width': 2, 'stroke-dasharray': dash || '', opacity: op * 0.85 }));
    dessin(Z.S);
    dessin(Z.ext, '4 5');
  }
  function demarrer() {
    dehors = monter(stage, R, {
      tick: { pas(dt, ctx) { return tick.pas(dt, ctx); }, image: (dt, ctx) => tick.image(dt, ctx) },
      echelle: () => ralenti.querySelector('input').checked ? 0.2 : 1,
      apres: ctx => { ctx.evts = []; courant = ctx; setTimeout(() => { if (!pendant) tirer(); }, 4000); },
    });
  }
  demarrer();
  return () => { dehors?.(); courant = null; };
}

/* ─── « Visée d'un obus » ─── */
const TYPES = {
  A: 'cibles', B: 'trait', C: 'tirets', D: 'bord',        // E : l'ancien carré du jeu (aucun cercle)
};
export function maquetteVisee(stage, R, lettre) {
  const type = TYPES[lettre] || null;                 // E : l'ancien carré du jeu (un curseur en croix, puis un petit carré)
  let cal = '155', souris = null;
  const haut = el('p', {});
  const boutonsCal = CALS.map(c => el('button', { className: 'essai', textContent: `${c} mm`, onclick: () => { cal = c; maj(); } }));
  const maj = () => boutonsCal.forEach((b, k) => { b.style.outline = CALS[k] === cal ? `2px solid ${PALETTE.o}` : ''; });
  maj();
  haut.append(...boutonsCal, ' le calibre qui suit le pointeur');
  stage.append(haut);
  let svg = null, t = 0;
  const FIXES = [['75', -19], ['155', -5], ['220', 14]];
  const dehors = monter(stage, R, {
    tick: {
      pas() { return []; },
      image(dt, ctx) {
        t += dt;
        const { rendu, boite } = ctx;
        const cv = rendu.renderer.domElement;
        if (!svg) {
          svg = svgEl('svg'); svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible';
          boite.append(svg);
          boite.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); souris = [e.clientX - r.left, e.clientY - r.top]; });
          boite.addEventListener('pointerleave', () => { souris = null; });
          boite.style.cursor = 'crosshair';
        }
        svg.setAttribute('width', cv.clientWidth); svg.setAttribute('height', cv.clientHeight);
        svg.replaceChildren();
        const c = ctx.centre(), cx = rendu.vue.cx, cz = rendu.vue.cz;
        void c;
        for (const [k, dx] of FIXES) cercle(svg, rendu, cx + dx, cz, k, type, t);
        if (souris) { const [x, y] = rendu.versTerrain(souris[0], souris[1]); if (x > -1e4) cercle(svg, rendu, x, y, cal, type, t, true); }
      },
    },
    apres: ctx => { const c = ctx.centre(); ctx.rendu.vue.cx = c.x; ctx.rendu.vue.cz = c.y; },
    marche: false, suivre: false,
  });
  return dehors;
}

// Un cercle de visée, du rayon du calibre (le souffle : CALIBRES[cal].rayon), de quatre types ; E (l'ancien carré) n'en dessine pas.
function cercle(svg, rendu, x, y, cal, type, t, suit = false) {
  const r = CALIBRES[cal].rayon, [sx, sy] = rendu.versEcran(x, y);
  const trace = (attrs, rr = r) => svg.append(svgEl('path', { d: chemin(pointsCercle(rendu, x, y, rr)), fill: 'none', ...attrs }));
  const ombre = { stroke: PALETTE.t, 'stroke-width': 4, opacity: 0.55 };
  if (!type) {                                         // le jeu : le carré du repère, au point visé (rien ne dit le rayon)
    svg.append(svgEl('rect', { x: sx - 6, y: sy - 6, width: 13, height: 13, fill: 'none', stroke: PALETTE.o, 'stroke-width': 2 }));
    return;
  }
  const pt = (rx, ry, attrs) => { const [px, py] = rendu.versEcran(rx, ry); svg.append(svgEl('circle', { cx: px, cy: py, r: 2, fill: PALETTE.o, ...attrs })); };
  if (type === 'trait') {
    trace(ombre); trace({ stroke: PALETTE.o, 'stroke-width': 2 });
    pt(x, y, {});
  } else if (type === 'tirets') {
    const dash = '9 7', off = -t * 14;                  // les tirets tournent, doucement
    trace(ombre); trace({ stroke: PALETTE.o, 'stroke-width': 2, 'stroke-dasharray': dash, 'stroke-dashoffset': off });
    pt(x, y, {});
  } else if (type === 'cibles') {
    // l'étendue du danger : le souffle, et deux anneaux plus serrés où l'on tue plus souvent (le fond s'assombrit vers le centre)
    svg.append(svgEl('path', { d: chemin(pointsCercle(rendu, x, y, r)), fill: PALETTE.t, 'fill-opacity': 0.3, stroke: PALETTE.o, 'stroke-width': 2 }));
    trace({ stroke: PALETTE.o, 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }, r * 0.66);
    trace({ stroke: PALETTE.o, 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }, r * 0.33);
    pt(x, y, {});
  } else if (type === 'bord') {
    trace(ombre); trace({ stroke: PALETTE.o, 'stroke-width': 1.5 });
    for (let k = 0; k < 4; k++) {                       // quatre repères au bord, vers l'extérieur, et le rayon en mètres
      const a = k * Math.PI / 2, [x1, y1] = rendu.versEcran(x + Math.cos(a) * r, y + Math.sin(a) * r), [x2, y2] = rendu.versEcran(x + Math.cos(a) * (r + 1.6), y + Math.sin(a) * (r + 1.6));
      svg.append(svgEl('line', { x1, y1, x2, y2, stroke: PALETTE.o, 'stroke-width': 2 }));
    }
    const [tx0, ty] = rendu.versEcran(x, y + r + 2.4), tx = tx0 - 12;
    const lab = svgEl('text', { x: tx, y: ty + 4, fill: PALETTE.o, 'font-size': 13, 'font-family': 'monospace', stroke: PALETTE.t, 'stroke-width': 3, 'paint-order': 'stroke' });
    lab.textContent = `${r} m`; svg.append(lab);
    svg.append(svgEl('line', { x1: sx - 5, y1: sy, x2: sx + 5, y2: sy, stroke: PALETTE.o, 'stroke-width': 2 }), svgEl('line', { x1: sx, y1: sy - 5, x2: sx, y2: sy + 5, stroke: PALETTE.o, 'stroke-width': 2 }));
  }
  void suit;
}
