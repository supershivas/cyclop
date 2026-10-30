// Le moteur des maquettes du labo (scène du jeu en direct, caméra libre, outils SVG) : partagé par les chars, les tranchées et le camp.
// Les maquettes d'Arcade (caisses, obus ratés, sapes, gaz) sont archivées : docs/archives/labo-archive.md.
import { PALETTE } from './palette.js?v=0.99.1';
import { nouvelleBataille, avancer, ordonnerMarche, mourir, PAS } from './bataille.js?v=0.99.1';
import { compacter } from './army.js?v=0.99.1';
import { impact } from './terrain.js?v=0.99.1';
import { creerRendu } from './rendu3d.js?v=0.99.1';
import { loadThree } from './three-lib.js?v=0.99.1';
import { CALIBRES } from './data/calibres.js?v=0.99.1';
import { hash2 } from './lib/rng.js?v=0.99.1';

export const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
export const svgEl = (tag, attrs = {}) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
export const bouton = (texte, f) => el('button', { className: 'essai', textContent: texte, onclick: f });
let partie = 0;                                              // chaque lancement tire autre chose (hachage, pas le générateur de la bataille)

/* ─── La scène commune ───
   Le moteur du jeu sur un petit champ : notre régiment 1 (seul à rester, avec la sentinelle d'en face si l'on n'en veut pas d'autre), les
   obus à dispersion nulle (ils tombent où l'on vise), et par-dessus le canvas un SVG et un papier (les marques que la logique ne connaît pas).
   `pas(dt, ctx, ev)` à chaque pas de 1/30 s après celui de la bataille ; `image(dt, ctx)` à chaque image. Rend le nettoyage. */
export function scene(stage, R, o) {
  const { ennemi = false, bloc = true, yNous = 165, zoom = 2, cz = 130, crateres = [], pas = null, image = null, apres = null, avant = null, echelle = () => 1, libre = null, nuit = false, soir = null } = o;   // `libre` : { yaw, tangage } : la caméra libre du jeu (placerCamera), qu'on tourne, incline, zoome et déplace à la souris
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
    await avant?.(ctx);                                        // la maquette retouche le terrain ou l'armée avant que le moteur ne dessine le premier sol
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

export const texteSvg = (svg, x, y, s, taille = 12) => {
  const t = svgEl('text', { x, y, fill: PALETTE.o, 'font-size': taille, 'font-family': 'monospace', stroke: PALETTE.t, 'stroke-width': 3, 'paint-order': 'stroke', 'text-anchor': 'middle' });
  t.textContent = s; svg.append(t);
};
