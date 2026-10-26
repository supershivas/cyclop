// Le groupe « Arcade » du labo (Jérôme, v0.38.2) : cinq mécaniques de surprise, essayées avant d'en retenir une.
//
//  - les caisses de ravitaillement (un largage au hasard dans le no man's land ; le premier qui y arrive la prend) ;
//  - les obus ratés (1 obus sur 3 ne part pas : il gît, fume ou éclate plus tard) ;
//  - les sapes (une galerie sous le no man's land, une charge, un cratère) ;
//  - les gaz (un nuage qui dérive, ou qui coule dans les creux) ;
//  - les chars d'assaut (un losange lent qui précède l'infanterie, s'embourbe, se fait prendre sous un obus).
//
// Ce sont des maquettes : elles jouent sur le moteur du jeu (les vrais obus, les vrais cratères, les vrais morts), mais ce que la logique ne sait pas
// faire (une caisse, un nuage, un char, une galerie) est dessiné par-dessus et suivi ici, pas dans la bataille. Rien n'est sauvegardé, rien ne change
// dans le jeu. DESIGN.md : pas de loot, pas de gloire, le compteur de morts n'est pas une récompense ; les contenus de caisse sont des vivres et des outils,
// jamais une puissance qu'on gagne en tuant.
import { PALETTE } from './palette.js?v=0.76.0';
import { nouvelleBataille, avancer, ordonnerMarche, mourir, PAS } from './bataille.js?v=0.76.0';
import { compacter } from './army.js?v=0.76.0';
import { impact } from './terrain.js?v=0.76.0';
import { creerRendu } from './rendu3d.js?v=0.76.0';
import { loadThree } from './three-lib.js?v=0.76.0';
import { CALIBRES } from './data/calibres.js?v=0.76.0';
import { hash2 } from './lib/rng.js?v=0.76.0';

export const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
export const svgEl = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
export const bouton = (texte, f) => el('button', { className: 'essai', textContent: texte, onclick: f });
const mix = (a, b, u) => a + (b - a) * u;
let partie = 0;                                              // chaque lancement tire autre chose (hachage, pas le générateur de la bataille)

/* ─── La scène commune ───
   Le moteur du jeu sur un petit champ : notre régiment 1 (seul à rester, avec la sentinelle d'en face si l'on n'en veut pas d'autre), les
   obus à dispersion nulle (ils tombent où l'on vise), et par-dessus le canvas un SVG et un papier (les marques que la logique ne connaît pas).
   `pas(dt, ctx, ev)` à chaque pas de 1/30 s après celui de la bataille ; `image(dt, ctx)` à chaque image. Rend le nettoyage. */
export function scene(stage, R, o) {
  const { ennemi = false, bloc = true, yNous = 165, zoom = 2, cz = 130, crateres = [], pas = null, image = null, apres = null, echelle = () => 1, libre = null, nuit = false, soir = null } = o;   // `libre` : { yaw, tangage } : la caméra libre du jeu (placerCamera), qu'on tourne, incline, zoome et déplace à la souris
  const R2 = structuredClone(R);
  R2.ia.barrage = R2.ia.offensive = 1e12;                    // l'IA d'en face se tait : la maquette décide de tout
  const dispersions = Object.entries(CALIBRES).map(([k, C]) => [k, C.dispersion]);
  for (const C of Object.values(CALIBRES)) C.dispersion = 0;
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(66vh,540px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  const svg = svgEl('svg'); svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible';
  const papier = el('div'); papier.style.cssText = `position:absolute;left:8px;top:8px;max-width:52%;padding:4px 8px;white-space:pre-line;background:${PALETTE.o};color:${PALETTE.t};border:1px solid ${PALETTE.s};font:12px/1.4 monospace;pointer-events:none`;
  boite.append(canvas, svg, papier); stage.append(boite);
  let raf = 0, fini = false, rendu = null;
  (async () => {
    const B = nouvelleBataille(5, R2, { soldats: 640 });
    // le soir (`soir` : une heure, 17,5 par exemple) : la logique tourne encore (les obus tombent), le voile et les lampes du soir sont ceux du jeu ; l'heure est figée à chaque pas
    if (soir) { const pj = R2.jour.duree / (R2.jour.heureFin - R2.jour.heureDebut) / PAS; B.etat.tickJour = Math.round(pj * (soir - R2.jour.heureDebut)); }
    const tick0 = B.etat.tickJour;
    const A = B.armee, M = B.etat.marges, X = M.x + 150;
    const garde = ennemi ? [9, 11] : [11];                   // 9 : la 1re ligne d'en face, à 125 m ; 11 : une sentinelle très loin, pour que la bataille ne finisse pas
    for (let i = 0; i < A.n; i++) if (A.camp[i] === 1 && !garde.includes(A.reg[i])) A.mort[i] = 1;
    for (const r of B.etat.regiments) if (r.camp === 1 && !garde.includes(r.id)) r.effectif = 0;
    compacter(A);
    const ctx = { B, A, M, X, R: R2, svg, papier, boite, evts: [], t: 0, nImp: 0, mien: [], eux: [], idx: new Map(), run: ++partie };
    ctx.reperer = () => {
      ctx.mien = []; ctx.eux = []; ctx.idx.clear();
      for (let i = 0; i < A.n; i++) if (!A.mort[i]) { if (A.reg[i] === 1) ctx.mien.push(i); else if (A.reg[i] === 9) ctx.eux.push(i); ctx.idx.set(A.id[i], i); }
    };
    ctx.reperer();
    if (bloc) ctx.mien.forEach((i, k) => { A.x[i] = X - 13 + (k % 16) * 1.7; A.y[i] = M.y + yNous + Math.floor(k / 16) * 1.8; A.vx[i] = 0; A.vy[i] = 0; });
    crateres.forEach(([dx, y, cal], k) => impact(B.terrain, X + dx, M.y + y, cal, R2, ctx.nImp++ + k * 0));
    ctx.centre = ids => { let x = 0, y = 0, n = 0; for (const i of ids) if (!A.mort[i]) { x += A.x[i]; y += A.y[i]; n++; } return n ? { x: x / n, y: y / n, n } : null; };
    // un obus de la logique (dispersion nulle), qui tombera dans `delai` secondes
    ctx.tirer = (cal, x, y, delai = 0) => B.etat.barrages.push({ camp: 1, cal, x, y, reste: 1, prochain: B.etat.temps + delai });
    ctx.dire = lignes => { papier.textContent = lignes.join('\n'); };
    rendu = await creerRendu(canvas, { mesure: true });
    if (fini) { rendu.detruire(); return; }
    rendu.redimensionner(); rendu.attacher(B);
    rendu.vue.zoom = zoom; rendu.vue.cx = X; rendu.vue.cz = M.y + cz;
    ctx.rendu = rendu;
    if (libre) {
      rendu.placerCamera(libre.yaw, libre.tangage);
      ctx.vue0 = { yaw: libre.yaw, tangage: libre.tangage, zoom, cx: X, cz: M.y + cz };
      let g = null;                                           // glisser tourne et incline, Maj ou le bouton droit déplace, la molette zoome (comme l'aperçu 3D de l'atelier)
      boite.addEventListener('contextmenu', e => e.preventDefault());
      boite.addEventListener('pointerdown', e => { g = { x: e.clientX, y: e.clientY, deplacer: e.button !== 0 || e.shiftKey }; boite.setPointerCapture(e.pointerId); });
      boite.addEventListener('pointermove', e => {
        if (!g) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y; g.x = e.clientX; g.y = e.clientY;
        if (g.deplacer) { ctx.suivre = false; const k = (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm; rendu.deplacerEcran(-dx * k, -dy * k); }
        else rendu.tourner(dx * 0.006, -dy * 0.004);
      });
      boite.addEventListener('pointerup', () => { g = null; });
      boite.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); rendu.zoomer(e.deltaY < 0 ? 1 : -1, [e.clientX - r.left, e.clientY - r.top]); }, { passive: false });
      boite.style.cursor = 'grab'; boite.style.touchAction = 'none';
    }
    // projection d'un point du sol (et d'une hauteur au-dessus), et des mètres en pixels à cet endroit
    ctx.proj = (x, y, h = 0) => rendu.versEcran(x, y, rendu.hauteurSol(x, y) + h);
    ctx.ppm = (x, y) => { const [a, b] = rendu.versEcran(x, y), [c, d] = rendu.versEcran(x + 1, y); return Math.hypot(c - a, d - b); };
    ctx.cercle = (x, y, r, attrs = {}, n = 40) => {
      const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; p.push(rendu.versEcran(x + Math.cos(a) * r, y + Math.sin(a) * r)); }
      svg.append(svgEl('path', { d: 'M' + p.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join('L') + 'Z', fill: 'none', ...attrs }));
    };
    await apres?.(ctx);
    let t = performance.now(), acc = 0;
    const boucle = now => {
      const dt = Math.min(0.1, (now - t) / 1000) * echelle(); t = now; ctx.t += dt;
      acc += dt;
      let ev = [];
      for (let n = 0; acc >= PAS && n < 3; n++, acc -= PAS) {
        ev = ev.concat(avancer(B), ctx.evts.splice(0));
        if (soir) B.etat.tickJour = tick0;
        ctx.reperer();
        pas?.(PAS, ctx, ev);
      }
      if (acc > 3 * PAS) acc = 0;
      if (ctx.suivre && ctx.cible) {                           // la caméra suit ce que la maquette désigne (`ctx.cible`) ; en l'air (`alt`), on recentre l'appareil à l'écran par petits pas (le jacobien sol → écran, au centre)
        const c = ctx.cible;
        if (!c.alt) { rendu.vue.cx = c.x; rendu.vue.cz = c.y; }
        else {
          const X0 = rendu.vue.cx, Z0 = rendu.vue.cz, h = rendu.hauteurSol(X0, Z0), [ox, oy] = rendu.versEcran(X0, Z0, h), [bx, by] = rendu.versEcran(X0 + 1, Z0, h), [qx, qy] = rendu.versEcran(X0, Z0 + 1, h);
          const [px, py] = rendu.versEcran(c.x, c.y, rendu.hauteurSol(c.x, c.y) + c.alt);
          const a = bx - ox, b = qx - ox, cc = by - oy, d = qy - oy, det = a * d - b * cc, ex = px - ox, ey = py - oy;
          if (Math.abs(det) > 1e-3) { rendu.vue.cx = X0 + 0.5 * (d * ex - b * ey) / det; rendu.vue.cz = Z0 + 0.5 * (-cc * ex + a * ey) / det; }
        }
      }
      rendu.dessiner(dt, ev);
      const cv = rendu.renderer.domElement;
      svg.setAttribute('width', cv.clientWidth); svg.setAttribute('height', cv.clientHeight); svg.replaceChildren();
      image?.(dt, ctx);
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
  })();
  return () => { fini = true; cancelAnimationFrame(raf); rendu?.detruire(); for (const [k, d] of dispersions) CALIBRES[k].dispersion = d; };
}

// Une maquette = des boutons, une ligne de relevé, une scène ; « Rejouer » la refait entière.
export function maquette(stage, fabrique) {
  let dehors = null;
  const ui = { haut: el('p'), info: el('p', { className: 'releve', textContent: ' ' }), stage, rejouer: () => demarrer() };
  const demarrer = () => { dehors?.(); stage.replaceChildren(); ui.haut.replaceChildren(); stage.append(ui.haut, ui.info); dehors = fabrique(ui); };
  demarrer();
  return () => dehors?.();
}

// un cube posé sur le sol (SVG), de côté `w` pixels, centré en (sx, sy)
function cube(svg, sx, sy, w, pris = false) {
  const h = w * 0.8;
  svg.append(svgEl('rect', { x: sx - w / 2, y: sy - h, width: w, height: h, fill: PALETTE.g, stroke: PALETTE.t, 'stroke-width': 1.5 }));
  svg.append(svgEl('rect', { x: sx - w / 2, y: sy - h, width: w, height: h * 0.3, fill: PALETTE.h, stroke: PALETTE.t, 'stroke-width': 1.5 }));
  svg.append(svgEl('line', { x1: sx, y1: sy - h, x2: sx, y2: sy, stroke: PALETTE.t, 'stroke-width': 1.5 }));
  void pris;
}
export const texteSvg = (svg, x, y, s, taille = 12) => {
  const t = svgEl('text', { x, y, fill: PALETTE.o, 'font-size': taille, 'font-family': 'monospace', stroke: PALETTE.t, 'stroke-width': 3, 'paint-order': 'stroke', 'text-anchor': 'middle' });
  t.textContent = s; svg.append(t);
};

/* ═══ Les caisses de ravitaillement ═══ */
const CONTENUS = [
  ['Vivres', 'une nuit de vivres de plus pour le régiment'],
  ['Obus', 'la batterie de 155 est rechargée'],
  ['Cartouches', 'les bras tiennent plus longtemps au tir'],
  ['Pansements', 'les blessés du régiment reprennent leur place'],
  ['Fil de fer', 'un niveau de fil devant le tronçon visé'],
  ['Vin', 'le moral du régiment remonte'],
];
export function maquetteCaisses(stage, R, lettre) {
  const piegee = lettre === 'B';
  return maquette(stage, ui => {
    let caisse = null, n = 0, bilan = '', pris = false;
    const CHUTE = 9;                                          // s, sous le parachute
    ui.haut.append(bouton('Larguer une caisse', () => larguer()), bouton('Rejouer', ui.rejouer));
    let ctx0 = null;
    const larguer = () => {
      if (!ctx0 || (caisse && !pris)) return;
      const { M, X, B } = ctx0, k = ctx0.run * 31 + n++;
      const x = X + (hash2(k, 1, 5) - 0.5) * 36, y = M.y + 122 + hash2(k, 2, 5) * 8;
      caisse = { x, y, t0: ctx0.t, atterri: false, contenu: CONTENUS[Math.floor(hash2(k, 3, 5) * CONTENUS.length)], piege: piegee && hash2(k, 4, 5) < 0.34 };
      pris = false; bilan = '';
      ordonnerMarche(B, [1], x, y, 'bloc', 0); ordonnerMarche(B, [9], x, y, 'bloc', 1);      // les deux camps l'ont vue descendre
    };
    return scene(ui.stage, R, {
      ennemi: true, yNous: 168, zoom: 2, cz: 128,
      apres: ctx => { ctx0 = ctx; setTimeout(() => { if (!caisse) larguer(); }, 1500); },
      pas(dt, ctx) {
        if (!caisse || pris) return;
        const age = ctx.t - caisse.t0;
        if (!caisse.atterri && age > CHUTE) caisse.atterri = true;
        if (!caisse.atterri) return;
        // le premier qui arrive à moins de 5 m la prend
        const { A } = ctx;
        for (const [camp, ids] of [[0, ctx.mien], [1, ctx.eux]]) for (const i of ids) {
          if (Math.hypot(A.x[i] - caisse.x, A.y[i] - caisse.y) < 5) {
            pris = true;
            const nom = camp === 0 ? 'Nous' : 'En face';
            if (caisse.piege) { ctx.tirer('75', caisse.x, caisse.y, 0.1); ctx.tirer('75', caisse.x + 1.5, caisse.y, 0.3); bilan = `${nom} l'ouvre : piégée. Rien dedans.`; }
            else bilan = `${nom} la prend en ${(age - CHUTE).toFixed(0)} s après l'atterrissage : ${caisse.contenu[0]}, ${caisse.contenu[1]}.`;
            caisse.vue = ctx.t;
            return;
          }
        }
      },
      image(dt, ctx) {
        const { svg } = ctx;
        if (caisse && !(pris && ctx.t - caisse.vue > 2.5)) {
          const age = ctx.t - caisse.t0, { x, y } = caisse;
          const haut = pris ? 0 : Math.max(0, 1 - age / CHUTE) ** 1.2 * 80;
          const [sx, sy] = ctx.proj(x, y, haut), w = Math.max(10, ctx.ppm(x, y) * 2);
          if (!caisse.atterri) {
            // le parachute : une coupole d'os au-dessus de la caisse, des suspentes
            const [cx, cy] = ctx.proj(x, y, haut + 5), rx = w * 1.8, ry = w * 0.9;
            for (const dx of [-0.9, -0.3, 0.3, 0.9]) svg.append(svgEl('line', { x1: cx + dx * rx, y1: cy, x2: sx, y2: sy - w * 0.6, stroke: PALETTE.o, 'stroke-width': 1 }));
            svg.append(svgEl('path', { d: `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Q${cx} ${cy + ry * 0.5} ${cx - rx} ${cy}`, fill: PALETTE.o, stroke: PALETTE.t, 'stroke-width': 1.5 }));
            if (age > 2 && Math.floor(age * 2) % 2 === 0) ctx.rendu.fumer(x, y);               // une fumée signale l'endroit, aux deux camps
          }
          if (!pris) {
            cube(svg, sx, sy, w);
            if (piegee) texteSvg(svg, sx, sy - w * 1.25, '?', 14);
            if (caisse.atterri) ctx.cercle(x, y, 5, { stroke: PALETTE.o, 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0.6 + 0.4 * Math.sin(ctx.t * 6) });
          }
        }
        ctx.dire([
          caisse ? (pris ? bilan : caisse.atterri ? 'La caisse est au sol : les deux camps courent.' : `Une caisse descend : ${Math.max(0, CHUTE - (ctx.t - caisse.t0)).toFixed(0)} s.`) : 'Aucune caisse.',
          piegee ? 'Une sur trois est piégée.' : 'Le contenu se dit à qui la prend.',
        ]);
      },
    });
  });
}

/* ═══ Les obus ratés ═══ */
export function maquetteRates(stage, R, lettre) {
  // A : il gît, un cercle dit où ne pas marcher ; B : il fume, pas de cercle ; C : il éclate de lui-même, plus tard
  return maquette(stage, ui => {
    let ctx0 = null, nSalve = 0;
    const duds = [];
    const bilan = { rates: 0, ecrases: 0, desamorces: 0, retardes: 0 };
    const salve = () => {
      if (!ctx0) return;
      const { M, X, A } = ctx0, c = ctx0.centre(ctx0.mien), s = ctx0.run * 17 + nSalve++;
      for (let k = 0; k < 6; k++) {
        const x = X + (hash2(s, k, 1) - 0.5) * 30, y = (c ? c.y : M.y + 130) - 8 - hash2(s, k, 2) * 14, delai = 0.8 + k * 0.45;
        if (hash2(s, k, 3) < 0.4) duds.push({ x, y, pose: ctx0.t + delai + 0.25, boum: lettre === 'C' ? ctx0.t + delai + 14 + hash2(s, k, 4) * 20 : Infinity, fume: 0 });
        else ctx0.tirer('155', x, y, delai);
      }
      void A;
    };
    ui.haut.append(bouton('Une salve de 6 obus de 155', salve), bouton('Désamorcer (la nuit)', () => { if (!ctx0) return; bilan.desamorces += duds.length; for (const d of duds) ctx0.rendu.fumer(d.x, d.y); duds.length = 0; }), bouton('Rejouer', ui.rejouer));
    return scene(ui.stage, R, {
      yNous: 170, zoom: 3, cz: 136,
      apres: ctx => { ctx0 = ctx; ordonnerMarche(ctx.B, [1], ctx.X, ctx.M.y + 96, 'bloc'); setTimeout(salve, 1200); },
      pas(dt, ctx) {
        const { A } = ctx;
        for (let k = duds.length - 1; k >= 0; k--) {
          const d = duds[k];
          if (ctx.t < d.pose) continue;
          let saute = ctx.t >= d.boum && (bilan.retardes++, true);
          if (!saute) for (const i of ctx.mien) if (Math.abs(A.x[i] - d.x) < 1.3 && Math.abs(A.y[i] - d.y) < 1.3 && hash2(A.id[i], Math.floor(ctx.t * 3), ctx.run) < 0.05) { saute = true; bilan.ecrases++; break; }
          if (saute) { ctx.tirer('155', d.x, d.y, 0); duds.splice(k, 1); }
        }
      },
      image(dt, ctx) {
        const { svg } = ctx;
        for (const d of duds) {
          if (ctx.t < d.pose) continue;
          const [x1, y1] = ctx.proj(d.x - 0.9, d.y, 0.2), [x2, y2] = ctx.proj(d.x + 0.9, d.y + 0.4, 0.2), e = Math.max(5, ctx.ppm(d.x, d.y) * 0.7);
          svg.append(svgEl('line', { x1, y1, x2, y2, stroke: PALETTE.t, 'stroke-width': e + 2, 'stroke-linecap': 'round' }));
          svg.append(svgEl('line', { x1, y1, x2, y2, stroke: PALETTE.o, 'stroke-width': e, 'stroke-linecap': 'round' }));
          if (lettre === 'A') ctx.cercle(d.x, d.y, 3.5, { stroke: PALETTE.o, 'stroke-width': 2, 'stroke-dasharray': '4 4', opacity: 0.55 + 0.4 * Math.sin(ctx.t * 5) });
          if (lettre === 'B' && ctx.t > d.fume) { d.fume = ctx.t + 1.4; ctx.rendu.fumer(d.x, d.y); }
          if (lettre === 'C' && d.boum - ctx.t < 1.5) ctx.cercle(d.x, d.y, 1 + (1.5 - (d.boum - ctx.t)) * 2, { stroke: PALETTE.o, 'stroke-width': 2, opacity: 0.5 + 0.5 * Math.sin(ctx.t * 24) });   // le tic-tac
        }
        ctx.dire([
          `Obus ratés au sol : ${duds.filter(d => ctx.t >= d.pose).length}`,
          `Éclatés sous des pieds : ${bilan.ecrases}${lettre === 'C' ? ` · à retardement : ${bilan.retardes}` : ''}`,
          `Désamorcés : ${bilan.desamorces}`,
        ]);
      },
    });
  });
}

/* ═══ Les sapes ═══ */
export function maquetteSapes(stage, R, lettre) {
  // A : la galerie se voit, on entend creuser, et l'autre camp peut nous entendre ; B : un fourneau, rien d'autre ; C : A, puis la pluie remplit le cratère
  const galerie = lettre !== 'B', pluie = lettre === 'C';
  return maquette(stage, ui => {
    let ctx0 = null, etat = 'repos', prog = 0, t1 = 0, cible = null, bruit = 0, heure = 0, bilan = '';
    const VITESSE = 6;                                         // m/s dans la maquette (la vraie sape : un mètre à l'heure)
    ui.haut.append(
      bouton('Creuser', () => { if (etat === 'repos' && ctx0) { etat = 'creuse'; bilan = ''; } }),
      bouton('Faire sauter', () => { if (etat === 'creuse' || etat === 'pret') sauter(); }),
      bouton('Rejouer', ui.rejouer));
    const tete = () => ({ x: cible.x, y: cible.y0 - prog });  // la tête de galerie remonte de notre ligne vers la leur
    const sauter = () => {
      const p = tete();
      for (let k = 0; k < 9; k++) ctx0.tirer('220', p.x + (k % 3 - 1) * 5, p.y + (Math.floor(k / 3) - 1) * 5, k * 0.1);      // neuf 220 en carré de cinq mètres : le cratère d'une mine, bien plus large qu'un obus
      for (let k = 0; k < 3; k++) setTimeout(() => ctx0.rendu.fumer(p.x, p.y), 300 + k * 350);
      etat = 'saute'; t1 = ctx0.t; heure = 0;
      bilan = prog < cible.long - 6 ? `Sautée trop tôt, à ${prog.toFixed(0)} m sur ${cible.long.toFixed(0)} : le cratère est dans le no man's land.` : 'Sous leur tranchée.';
    };
    return scene(ui.stage, R, {
      ennemi: true, bloc: false, zoom: 1, cz: 150,
      apres: ctx => {
        ctx0 = ctx;
        const e = ctx.centre(ctx.eux), n = ctx.centre(ctx.mien);
        cible = { x: ctx.X, y0: n.y - 8, y1: e.y + 6, long: n.y - 8 - (e.y + 6) };
      },
      pas(dt, ctx) {
        if (etat === 'creuse') {
          prog = Math.min(cible.long, prog + VITESSE * dt);
          if (galerie) {
            // plus on approche, plus ils entendent : au bout, un camouflet détruit la galerie
            const reste = cible.long - prog;
            bruit = Math.max(0, 1 - reste / 60);
            if (reste < 60 && hash2(Math.floor(ctx.t * 30), ctx.run, 9) < 0.0009 * (1 + bruit * 3)) {
              const p = tete(); ctx.tirer('155', p.x, p.y, 0); etat = 'perdue'; bilan = 'Entendue : un camouflet a crevé la galerie.';
            }
          }
          if (prog >= cible.long) etat = 'pret';
        }
        if (etat === 'saute' && pluie && ctx.t - t1 > 3 && heure < 100) {
          // la nappe remonte dans le trou : l'eau (celle du jeu, `T.eau`, en mètres) monte jusqu'à un mètre sous le sol d'origine, un peu à chaque pas
          heure++; const p = tete(), T = ctx.B.terrain, i0 = Math.max(0, Math.floor(p.x - 18)), i1 = Math.min(T.W, Math.floor(p.x + 18)), j0 = Math.max(0, Math.floor(p.y - 18)), j1 = Math.min(T.H, Math.floor(p.y + 18));
          for (let j = j0; j < j1; j++) {
            for (let i = i0; i < i1; i++) { const c = j * T.W + i; if (T.diff[c] <= -4) T.eau[c] = Math.min((-T.diff[c] * 0.25 - 1) , T.eau[c] + 0.06); }
            T.versionLigne[j]++; if (j > 0) T.versionLigne[j - 1]++; if (j < T.H - 1) T.versionLigne[j + 1]++;
          }
        }
      },
      image(dt, ctx) {
        const { svg } = ctx;
        if (cible && (etat === 'creuse' || etat === 'pret' || etat === 'perdue')) {
          const p = tete();
          if (galerie) {
            const [a, b] = ctx.proj(cible.x, cible.y0), [c, d] = ctx.proj(p.x, p.y);
            svg.append(svgEl('line', { x1: a, y1: b, x2: c, y2: d, stroke: PALETTE.t, 'stroke-width': 6, opacity: 0.5 }));
            svg.append(svgEl('line', { x1: a, y1: b, x2: c, y2: d, stroke: PALETTE.o, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'stroke-dashoffset': -ctx.t * 12 }));
            if (etat === 'creuse') for (const k of [0, 1, 2]) ctx.cercle(p.x, p.y, 3 + ((ctx.t * 5 + k * 3) % 9) * (1 + bruit * 2), { stroke: PALETTE.o, 'stroke-width': 1.5, opacity: Math.max(0, 0.7 - ((ctx.t * 5 + k * 3) % 9) / 12) });   // le bruit
          } else {
            const [c, d] = ctx.proj(p.x, p.y);
            svg.append(svgEl('circle', { cx: c, cy: d, r: 4, fill: PALETTE.o, stroke: PALETTE.t, 'stroke-width': 2 }));
          }
        }
        const lignes = [{ repos: 'Prêts à creuser.', creuse: `On creuse : ${prog.toFixed(0)} m sur ${cible?.long.toFixed(0)} m${galerie ? ` · bruit ${Math.round(bruit * 100)} %` : ''}`, pret: 'Fourneau prêt sous leur tranchée.', saute: bilan, perdue: bilan }[etat]];
        if (etat === 'saute') lignes.push(`Pertes en face : ${ctx.B.etat.pertes[1]}.`);
        if (etat === 'saute' && pluie) lignes.push(`La nappe remonte : le cratère est plein à ${Math.min(100, heure)} %.`);
        ctx.dire(lignes.filter(Boolean));
      },
    });
  });
}

/* ═══ Les gaz ═══ */
export function maquetteGaz(stage, R, lettre) {
  // A : un mur qui dérive avec le vent ; B : plus lourd que l'air, il coule dans les creux (tranchées, cratères)
  const creux = lettre === 'B';
  return maquette(stage, ui => {
    let ctx0 = null, nuage = null, masques = false, rapide = null;
    const dose = new Map();
    const bilan = { toussent: 0, blesses: 0, morts: 0 };
    ui.haut.append(
      bouton('Lâcher le nuage', () => { if (ctx0 && !nuage) nuage = { y: ctx0.M.y + 118, t0: ctx0.t }; }),
      bouton('Masques', () => { masques = !masques; }),
      bouton('Reculer d\'une ligne', () => { if (ctx0) ordonnerMarche(ctx0.B, [1], ctx0.X, ctx0.M.y + 238, 'bloc'); }),
      bouton('Rejouer', ui.rejouer));
    rapide = el('label', {}, el('input', { type: 'checkbox' }), ' ×3 ');
    ui.haut.append(rapide);
    const VENT = 3, PROFONDEUR = 24, LARGEUR = 70;              // m/s vers le sud ; épaisseur et demi-largeur du nuage
    let creuses = [];                                           // les cases basses (tranchées, cratères) sous le nuage, relevées au départ
    const basse = (T, x, y) => T.diff[(y | 0) * T.W + (x | 0)] <= -2;
    return scene(ui.stage, R, {
      bloc: false, zoom: 2, cz: 178,
      crateres: [[-30, 188, '155'], [-12, 198, '155'], [14, 190, '155'], [30, 202, '155'], [0, 176, '220'], [-44, 176, '155'], [42, 182, '155']],
      echelle: () => rapide.querySelector('input').checked ? 3 : 1,
      apres: ctx => {
        ctx0 = ctx;
        const T = ctx.B.terrain;
        for (let j = ctx.M.y + 110; j < ctx.M.y + 250; j++) for (let i = ctx.X - LARGEUR; i < ctx.X + LARGEUR; i++) if (T.diff[j * T.W + i] <= -2) creuses.push([i + 0.5, j + 0.5]);
      },
      pas(dt, ctx) {
        if (!nuage) return;
        nuage.y = ctx.M.y + 118 + (ctx.t - nuage.t0) * VENT;
        const { A, B } = ctx, T = B.terrain;
        for (const i of ctx.mien) {
          if (Math.abs(A.x[i] - ctx.X) > LARGEUR || A.y[i] > nuage.y || A.y[i] < nuage.y - PROFONDEUR) continue;
          const bas = basse(T, A.x[i], A.y[i]);
          const f = (creux ? (bas ? 2.6 : 0.15) : 1) * (masques ? 0.2 : 1);
          const d = (dose.get(A.id[i]) || 0) + f * dt;
          dose.set(A.id[i], d);
          if (d > 1.5) { if (!A.blessure[i] && d < 1.5 + 2 * dt * f) bilan.toussent++; A.peur[i] = Math.max(A.peur[i], 0.55); }
          if (d > 7 && !A.blessure[i]) { A.blessure[i] = 1; B.etat.blesses[0]++; bilan.blesses++; }
          if (d > 14) { mourir(B, i, 'gaz'); bilan.morts++; }
        }
        if (nuage.y - PROFONDEUR > ctx.M.y + 270) nuage = null;
      },
      image(dt, ctx) {
        const { svg, B } = ctx, T = B.terrain;
        if (nuage) {
          if (!creux) {
            for (let k = 0; k < 70; k++) {
              const x = ctx.X + (hash2(k, 1, 6) - 0.5) * 2 * LARGEUR + Math.sin(ctx.t * 0.7 + k) * 2, y = nuage.y - hash2(k, 2, 6) * PROFONDEUR, r = 6 + hash2(k, 3, 6) * 6;
              ctx.cercle(x, y, r, { fill: PALETTE.v, 'fill-opacity': 0.34, stroke: 'none' }, 18);
            }
          } else {
            const dedans = creuses.filter(([x, y]) => y < nuage.y && y > nuage.y - PROFONDEUR), pas = Math.max(1, Math.ceil(dedans.length / 500));
            for (let k = 0; k < dedans.length; k += pas) {
              const [x, y] = dedans[k], [sx, sy] = ctx.proj(x, y, 0.3), r = Math.max(2.5, ctx.ppm(x, y) * 1.6);
              svg.append(svgEl('circle', { cx: sx, cy: sy, r, fill: PALETTE.v, 'fill-opacity': 0.5 }));
            }
            for (let k = 0; k < 24; k++) ctx.cercle(ctx.X + (hash2(k, 1, 6) - 0.5) * 2 * LARGEUR, nuage.y - hash2(k, 2, 6) * PROFONDEUR, 9, { fill: PALETTE.v, 'fill-opacity': 0.05, stroke: 'none' }, 14);       // une brume à peine, au-dessus
          }
        }
        // le vent : une flèche d'os en haut à droite
        const w = ctx.rendu.renderer.domElement.clientWidth;
        svg.append(svgEl('path', { d: `M${w - 90} 30 L${w - 50} 30 M${w - 58} 24 L${w - 48} 30 L${w - 58} 36`, stroke: PALETTE.o, 'stroke-width': 2, fill: 'none', transform: `rotate(90 ${w - 70} 30)` }));
        texteSvg(svg, w - 70, 70, 'vent', 11);
        ctx.dire([
          nuage ? `Le nuage avance : à ${Math.max(0, ctx.M.y + 214 - nuage.y).toFixed(0)} m de notre ligne.` : (bilan.toussent + bilan.morts ? 'Le nuage est passé.' : 'Un nuage attend, de l\'autre côté.'),
          `Masques : ${masques ? 'mis (on voit mal, on tire moins bien)' : 'dans les sacs'}`,
          `Toussent : ${bilan.toussent} · blessés : ${bilan.blesses} · tombés : ${bilan.morts}`,
        ]);
      },
    });
  });
}

/* ═══ Les chars d'assaut ═══ */
export function maquetteChars(stage, R, lettre) {
  // A : le losange avance tout droit, l'infanterie à son abri ; B : il avance dans un champ de cratères, ralentit, s'enlise (la chance, pas le joueur)
  const enlisable = lettre === 'B';
  return maquette(stage, ui => {
    let ctx0 = null, char = null, THREE = null, groupe = null, nBalles = 0, ordreT = 0, bilan = '';
    ui.haut.append(
      bouton('Tirer un 155 sur le char', () => { if (ctx0 && char && char.etat !== 'detruit') ctx0.tirer('155', char.x, char.y - 1.5, 1.2); }),
      bouton('Rejouer', ui.rejouer));
    const construire = THREE => {
      const g = new THREE.Group(), tons = { chenille: PALETTE.g, coque: PALETTE.r, toit: PALETTE.o };
      const mat = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c) });
      const trait = geo => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.t) }));
      const ajouter = (geo, couleur, x, y, z) => { const m = new THREE.Mesh(geo, mat(couleur)); m.position.set(x, y, z); const l = trait(geo); l.position.copy(m.position); g.add(m, l); };
      // le losange du Mark IV : une chenille qui entoure la coque, vue de profil ; deux chenilles, une coque, une cabine
      const profil = new THREE.Shape();
      profil.moveTo(-5.2, 0.5); profil.lineTo(-2.7, 3.5); profil.lineTo(2.7, 3.5); profil.lineTo(5.2, 0.5); profil.lineTo(3.2, 0); profil.lineTo(-3.2, 0); profil.closePath();
      const geoCh = new THREE.ExtrudeGeometry(profil, { depth: 0.9, bevelEnabled: false });
      geoCh.translate(0, 0, -0.45);
      ajouter(geoCh, tons.chenille, 0, 0, -1.7); ajouter(geoCh, tons.chenille, 0, 0, 1.7);
      ajouter(new THREE.BoxGeometry(7.6, 2.4, 2.6), tons.coque, 0, 1.9, 0);
      ajouter(new THREE.BoxGeometry(2.8, 1.0, 1.9), tons.toit, 0.3, 3.55, 0);
      ajouter(new THREE.BoxGeometry(2.0, 0.5, 0.5), tons.chenille, -4.4, 2.2, 1.6);       // le canon de côté (sponson)
      ajouter(new THREE.BoxGeometry(2.0, 0.5, 0.5), tons.chenille, -4.4, 2.2, -1.6);
      g.rotation.order = 'YXZ';
      const racine = new THREE.Group(); g.rotation.y = -Math.PI / 2; g.scale.setScalar(1.5); racine.add(g);
      return racine;
    };
    return scene(ui.stage, R, {
      ennemi: true, yNous: 178, zoom: 3, cz: 138,
      crateres: enlisable ? [[1, 150, '155'], [-2, 138, '220'], [2, 126, '155'], [-1, 112, '220']] : [],
      apres: async ctx => {
        ctx0 = ctx;
        THREE = await loadThree();
        groupe = construire(THREE); ctx.rendu.scene.add(groupe);
        char = { x: ctx.X, y: ctx.M.y + 166, v: 0, etat: 'avance', pv: 1 };
      },
      pas(dt, ctx, ev) {
        if (!char) return;
        const { A, B } = ctx, T = B.terrain;
        for (const e of ev) if (e.type === 'impact' && char.etat !== 'detruit' && Math.hypot(e.x - char.x, e.y - char.y) < 5) { char.etat = 'detruit'; bilan = 'Touché par un obus : le char brûle.'; }
        if (char.etat === 'avance') {
          const cell = (char.y - 3 | 0) * T.W + (char.x | 0), prof = -T.diff[cell];
          let f = prof >= 6 ? 0 : prof >= 3 ? 0.35 : 1;       // un cratère de plus d'un mètre et demi : ventre à terre ; moins : on le franchit lentement
          if (!enlisable) f = 1;
          if (f === 0) { char.etat = 'enlise'; bilan = 'Ventre à terre dans un cratère : il ne bouge plus.'; }
          char.v = 0.9 * f;
          char.y -= char.v * dt;
          if (char.y < ctx.M.y + 100) { char.etat = 'arrive'; bilan = 'Il a atteint leur tranchée.'; }
        }
        if (char.etat === 'detruit' && hash2(Math.floor(ctx.t * 4), ctx.run, 3) < 0.25) ctx.rendu.fumer(char.x, char.y);
        // l'infanterie suit à douze mètres (un ordre toutes les deux secondes), à son abri tant qu'il avance
        if (ctx.t - ordreT > 2 && char.etat !== 'detruit') { ordreT = ctx.t; ordonnerMarche(B, [1], char.x, Math.min(char.y + 12, ctx.M.y + 190), 'ligne'); }
        let abrites = 0;
        for (const i of ctx.mien) if (Math.abs(A.x[i] - char.x) < 6 && A.y[i] > char.y && A.y[i] < char.y + 14) { A.peur[i] *= 0.92; abrites++; }
        char.abrites = abrites;
      },
      image(dt, ctx) {
        const { svg, rendu } = ctx;
        if (!char || !groupe) return;
        const hF = rendu.hauteurSol(char.x, char.y - 4), hB = rendu.hauteurSol(char.x, char.y + 4);
        groupe.position.set(char.x, (hF + hB) / 2 + 0.1, char.y);
        groupe.rotation.x = Math.atan2(hF - hB, 8);
        // des balles qui ricochent : de petits traits d'os sur la coque, tant qu'en face a des hommes à portée
        if (char.etat === 'avance' || char.etat === 'enlise') {
          const portee = ctx.eux.some(i => Math.hypot(ctx.A.x[i] - char.x, ctx.A.y[i] - char.y) < 70);
          if (portee) for (let k = 0; k < 3; k++) {
            const u = hash2(nBalles++, ctx.run, 7), [sx, sy] = ctx.proj(char.x + (u - 0.5) * 3, char.y - 4 + hash2(nBalles, 2, 7) * 3, 2.5), l = 4 + hash2(nBalles, 3, 7) * 6;
            svg.append(svgEl('line', { x1: sx, y1: sy, x2: sx + (u - 0.5) * l * 2, y2: sy - l, stroke: PALETTE.o, 'stroke-width': 2 }));
          }
        }
        ctx.dire([
          { avance: `Il avance : ${(char.v * 3.6).toFixed(1)} km/h.`, enlise: bilan, detruit: bilan, arrive: bilan }[char.etat],
          `Hommes à son abri : ${char.abrites || 0} sur ${ctx.mien.length}`,
          enlisable ? 'Des cratères sur sa route : le hasard décide.' : 'Sa route est dégagée.',
        ]);
        void mix;
      },
    });
  });
}
