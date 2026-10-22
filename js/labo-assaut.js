// Le sujet « Attaque d'une tranchée » du labo : une maquette jouée sur une frise du temps
// (js/lib/labo-timeline.js : on va d'une étape à l'autre). Elle MONTRE comment le monde
// pourrait dire, par lui-même, ce que la règle de `prises()` (bataille.js) fait en silence :
// un tronçon de 25 m change de main quand il n'y reste plus un défenseur et que l'attaquant
// y a au moins `prise` hommes. Aucun texte, aucun compteur : tout est dans la scène (les tirs,
// les corps, les traverses, le fanion, les fusées, les sacs retournés). Les nombres (12 défenseurs,
// 22 assaillants, prise à 3) sont ceux d'une situation plausible ; la scène est écrite à la main,
// une fonction pure du temps t : un assaut réel mettrait des minutes à venir.
import { PALETTE } from './palette.js?v=0.52.6';
import { hash2 } from './lib/rng.js?v=0.52.6';
import { mountTimeline } from './lib/labo-timeline.js?v=0.52.6';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

const L = 220, H = 108, K = 4.4;    // ce qu'on voit : 220 × 108 pixels, agrandis ×4,4 (le tronçon visé et ses voisins)
const WW = 320, DX = 50;            // le monde montré : 320 pixels de large, vus à partir de DX
const NB = 3, TW = WW / NB;          // trois tronçons de 25 m (4,2 pixels par mètre) ; on attaque celui du milieu
const CIBLE = 1, XC = TW * 1.5;     // son centre
const Y_TR = 86, Y_PAR = 75, Y_FACE = 10;   // pieds de nos hommes dans la tranchée, parapet, tranchée d'en face
const DUREE = 46;
const ETAPES = [
  { t: 0, nom: 'Calme' },
  { t: 6, nom: 'Préparation' },
  { t: 14, nom: 'Sortie' },
  { t: 22, nom: 'Contact' },
  { t: 28, nom: 'Dernier défenseur' },
  { t: 28.5, nom: 'Bascule' },
  { t: 34, nom: 'Tenu par en face' },
];

// ── la situation : qui tombe, quand ──
const ORDRE = [3, 8, 0, 10, 5, 7, 2, 11, 4, 9, 1, 6];                              // l'ordre dans lequel nos 12 hommes du tronçon tombent
const MORT = [7.2, 8.5, 10.0, 11.4, 12.8, 22.5, 23.5, 24.5, 25.5, 26.5, 27.3, 28.2];    // ... et à quel instant (cinq aux obus, sept au contact)
const OBUS = [6.2, 7.2, 8.5, 9.3, 10.0, 11.4, 12.8, 13.4];                          // les obus de 220 sur le tronçon (les cinq mortels sont les 2e, 3e, 5e, 6e, 7e)
const MORTELS = [1, 2, 4, 5, 6];
const TOMBENT = { 3: 16.4, 7: 17.6, 10: 18.9, 14: 19.7, 17: 20.6, 20: 21.4 };       // les assaillants abattus en traversant
const T_BASCULE = 28.5;

const xDef = k => TW + 8 + k * 8;                                                    // la place d'un défenseur dans sa tranchée
const rangMort = k => ORDRE.indexOf(k);
const vivant = (k, t) => t < MORT[rangMort(k)];
const obusX = i => MORTELS.includes(i) ? xDef(ORDRE[MORTELS.indexOf(i)]) : TW + 10 + hash2(i, 5, 4) * 86;

/* L'état des assaillants à l'instant t : [{ x, y, etat: 'attend' | 'court' | 'tombe' | 'couche' | 'tranchee', j }] */
function assaillants(t) {
  const out = [];
  let slot = 0;
  for (let j = 0; j < 22; j++) {
    const x0 = TW + 6 + ((j * 4.7) % 94), tj = 14 + (j % 7) * 0.35, aj = 22 + j * 0.2;
    const xs = TW + 8 + ((slot++ * 6.6) % 96), ys = Y_TR - 1;
    const tombe = TOMBENT[j];
    const pos = u => ({ x: x0 + (xs - x0) * u + Math.sin(u * 14 + j) * 1.6, y: Y_FACE + 4 + u * (ys - Y_FACE - 4) });
    if (t < tj) out.push({ j, x: x0, y: Y_FACE + 3 + (j % 3) * 2, etat: 'attend' });
    else if (tombe !== undefined) {
      const u = Math.min(1, (tombe - tj) / (aj - tj));
      if (t < tombe) { const p = pos(Math.min(1, (t - tj) / (aj - tj))); out.push({ j, ...p, etat: 'court' }); }
      else { const p = pos(u); out.push({ j, ...p, etat: t - tombe < 0.35 ? 'tombe' : 'couche', depuis: t - tombe }); }
    } else if (t < aj) { const p = pos((t - tj) / (aj - tj)); out.push({ j, ...p, etat: 'court' }); }
    else out.push({ j, x: xs, y: ys, etat: 'tranchee' });
  }
  return out;
}
const dansLaTranchee = (A, t) => A.filter(a => a.etat === 'tranchee').length;

// ── le dessin ──
function dessiner(g, t, o) {
  const R = (x, y, w, h, c) => { g.fillStyle = PALETTE[c]; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const D = (x, y, w, h, c) => {                                    // une trame (un pixel sur deux) : un voile
    g.fillStyle = PALETTE[c];
    for (let j = 0; j < h; j++) for (let i = (j + Math.round(y)) & 1; i < w; i += 2) g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
  };
  const halo = (cx, cy, r, c) => { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); D(cx - w, cy + dy, 2 * w, 1, c); } };
  const A = assaillants(t), pris = t >= T_BASCULE;
  const defenseurs = ORDRE.map((_, k) => vivant(k, t)).filter(Boolean).length;

  // le sol : le no man's land labouré, nos arrières
  g.setTransform(1, 0, 0, 1, -DX, 0);
  R(0, 0, WW, H, 'b');
  R(0, 14, WW, 56, 's');
  for (let i = 0; i < 60; i++) { const x = hash2(i, 1, 4) * WW, y = 14 + hash2(i, 2, 4) * 92; R(x, y, 4, 2, i % 3 ? 't' : 'g'); if (i % 3 === 0) R(x - 1, y - 1, 6, 1, 'g'); }
  // la tranchée d'en face (au loin) et la nôtre
  R(0, Y_FACE - 3, WW, 8, 't'); R(0, Y_FACE + 5, WW, 2, 'x');
  R(0, Y_TR - 9, WW, 12, 't');
  // le parapet : des sacs (le dessus plus clair), bouleversé là où les obus sont tombés
  const dega = x => OBUS.some((ts, i) => t >= ts && Math.abs(x - obusX(i)) < 6);
  const retourne = o.marques && pris;
  for (let x = 0; x < WW; x += 6) {
    const casse = dega(x + 3);
    R(x, Y_PAR + (casse ? 3 : 0), 6, casse ? 2 : 4, casse ? 'g' : (x / 6) & 1 ? 'g' : 'h');
    if (!casse) R(x, Y_PAR + 3, 6, 1, 'b');
    if (casse) { R(x + 1, Y_PAR + 2, 2, 1, 't'); R(x + 3, Y_PAR + 4, 2, 1, 's'); }
  }
  // en face, à la longue, quelques hommes qui attendent leur heure
  // le parados, derrière : retourné par ceux qui ont pris le tronçon (il sert maintenant à l'envers)
  for (let x = 0; x < WW; x += 6) R(x, Y_TR + 3, 6, 2, 'b');
  if (retourne) {
    const fin = Math.min(1, (t - 30) / 4);
    for (let x = TW; x < TW * 2; x += 6) if ((x - TW) / TW < fin) { R(x, Y_TR + 2, 6, 3, 'x'); R(x, Y_TR + 2, 6, 1, 'r'); }
  }
  // les traverses : des blocs de terre qui coupent la tranchée en tronçons, une marque du monde
  if (o.marques) for (let i = 0; i <= NB; i++) { const x = i * TW; R(x - 2, Y_TR - 9, 4, 12, 's'); R(x - 2, Y_TR - 9, 4, 1, 'g'); }
  // le fil de fer, coupé là où ils sont passés
  const coupe = t >= 17.5 ? [XC - 14, XC + 14] : null;
  if (o.marques) for (let x = 0; x < WW; x += 3) {
    if (coupe && x > coupe[0] && x < coupe[1]) { if (x % 9 === 0) R(x, 52, 1, 4, 't'); continue; }
    R(x, 50 + ((x / 3) & 1) * 2, 2, 1, 'r');
    if (x % 18 === 0) R(x, 48, 1, 7, 't');
  }

  // les obus de 220 sur le tronçon : l'éclair, la gerbe, la fumée qui monte et dérive, le cratère
  OBUS.forEach((ts, i) => {
    if (t < ts) return;
    const ex = obusX(i), ey = Y_TR - 3, u = t - ts;
    R(ex - 4, ey + 1, 8, 3, 't'); R(ex - 5, ey, 10, 1, 'g');
    if (u < 0.18) { R(ex - 7, ey - 6, 14, 10, 'o'); R(ex - 4, ey - 18, 8, 14, 'r'); }
    else if (u < 0.9) for (let n = 0; n < 7; n++) R(ex + (hash2(i, n, 7) - 0.5) * 22 * u, ey - 6 - u * 24 * (0.5 + hash2(i, n, 8)), 2, 2, 'g');
    if (u > 0.1 && u < 5) { const hh = Math.min(30, u * 16), ww = 6 + u * 3; D(ex + u * 3 - ww / 2, ey - hh, ww, hh, 'r'); if (u > 1.5) D(ex + u * 3.5 - ww / 2, ey - hh - 2, ww, hh * 0.4, 'e'); }
  });

  // les corps : ceux qui sont tombés restent là
  const couche = (x, y, c) => { R(x - 3, y - 2, 6, 2, c); R(x - 3, y - 1, 6, 1, 't'); R(x + 3, y - 2, 2, 2, 'o'); };
  for (let k = 0; k < 12; k++) if (!vivant(k, t)) couche(xDef(k) + 2, Y_TR + 1, 'n');
  for (const a of A) if (a.etat === 'couche') couche(a.x, a.y, 'x');

  // un homme debout ou accroupi : (x, y) ses pieds ; dir -1 : face au nord (nos hommes), +1 : face au sud
  const homme = (x, y, c, pose, dir, tire) => {
    R(x - 1, y, 4, 1, 't');
    if (pose === 'accroupi') { R(x - 2, y - 4, 4, 3, c); R(x - 1, y - 6, 2, 2, 'o'); R(x - 2, y - 7, 4, 1, c); if (o.feu) R(x + 2, y - 5, 1, 4, 't'); return; }
    if (pose === 'tombe') { R(x - 3, y - 5, 6, 2, c); R(x + 3, y - 4, 2, 2, 'o'); R(x - 2, y - 3, 2, 3, 't'); return; }
    R(x - 2, y - 3, 1, 3, 't'); R(x + 1, y - 3, 1, 3, 't');
    R(x - 2, y - 6, 4, 3, c); R(x - 1, y - 8, 2, 2, 'o'); R(x - 2, y - 9, 4, 1, c);
    if (o.feu) {
      if (dir < 0) { R(x + 2, y - 10, 1, 7, 't'); if (tire) R(x + 1, y - 14, 3, 3, 'o'); }
      else { R(x - 3, y - 6, 1, 7, 't'); if (tire) R(x - 4, y + 1, 3, 3, 'o'); }
    }
  };

  // nos hommes dans la tranchée : au tronçon visé, les 12 ; aux voisins, 12 aussi
  const tirs = [];
  for (let n = 0; n < NB; n++) for (let k = 0; k < 12; k++) {
    const cible = n === CIBLE, x = n * TW + 8 + k * 8, kk = k;
    if (cible && !vivant(kk, t)) continue;
    if (!cible && t < 0) continue;
    const peur = o.feu && t >= 6.2 && t < 14.5 && cible;                          // sous les obus, on se tapit : on ne tire plus
    const aTire = o.feu && t >= 15 && ((t * 2.5 + k * 0.37) % 1) < 0.2 && !peur;
    homme(x + 2, Y_TR + 1, 'n', peur ? 'accroupi' : 'debout', -1, aTire);
    if (aTire) tirs.push({ x: x + 5, y: Y_TR - 13, k: n * 12 + k });
  }
  // les assaillants : ils attendent, courent, tombent
  for (const a of A) {
    if (a.etat === 'couche') continue;
    if (a.etat === 'tombe') { homme(a.x, a.y, 'x', 'tombe', 1, false); if (o.feu) D(a.x - 5, a.y - 10, 10, 6, 'r'); continue; }
    const tire = o.feu && a.etat !== 'attend' && t >= 17 && ((t * 2 + a.j * 0.5) % 1) < 0.14;
    homme(a.x, a.y, 'x', a.etat === 'attend' ? 'accroupi' : 'debout', 1, tire);
  }
  // les traceurs : des nôtres vers les assaillants les plus proches, des leurs vers nous
  if (o.feu) {
    for (const f of tirs) {
      const cibles = A.filter(a => a.etat === 'court');
      if (!cibles.length) continue;
      const c = cibles[f.k % cibles.length], p = (t * 5 + f.k * 0.31) % 1;
      R(f.x + (c.x - f.x) * p, f.y + (c.y - 8 - f.y) * p, 2, 1, 'o');
    }
    for (const a of A) if (a.etat === 'court' && t >= 17 && ((t * 2 + a.j * 0.5) % 1) < 0.14) {
      const p = ((t * 2 + a.j * 0.5) % 1) / 0.14; R(a.x - 4 + (xDef(a.j % 12) - a.x) * p * 0.5, a.y + 2 + (Y_TR - 9 - a.y) * p * 0.5, 2, 1, 'o');
    }
  }

  // le fanion du tronçon : le nôtre flotte ; déchiré par la bataille, amené, puis celui d'en face hissé
  if (o.marques) {
    const vent = Math.round(Math.sin(t * 5) * 1);
    R(XC, Y_PAR - 22, 1, 24, 't');                                                  // la hampe
    if (t < 14) { R(XC + 1, Y_PAR - 22, 10, 6, 'n'); R(XC + 11 + vent, Y_PAR - 21, 2, 4, 'n'); }
    else if (t < T_BASCULE) { R(XC + 1, Y_PAR - 22, 6, 4, 'n'); R(XC + 7, Y_PAR - 20 + vent, 2, 2, 'n'); }   // déchiré
    else {
      const bas = Math.min(1, (t - T_BASCULE) / 1.2), haut = Math.min(1, Math.max(0, (t - 30) / 2.5));
      if (bas < 1) R(XC + 1, Y_PAR - 22 + bas * 16, 6, 4, 'n');                    // le nôtre descend
      if (haut > 0) { R(XC + 1, Y_PAR - 4 - haut * 18, 10, 6, 'x'); R(XC + 1, Y_PAR - 4 - haut * 18, 10, 1, 'r'); }   // le leur monte
    }
    // à chaque bout du tronçon, une marque d'appartenance : un pieu à fanion
    for (const x of [TW + 3, 2 * TW - 5]) { R(x, Y_PAR - 8, 1, 10, 't'); R(x + 1, Y_PAR - 8, 4, 3, pris && CIBLE ? 'x' : 'n'); }
    if (pris) for (const x of [TW + 3, 2 * TW - 5]) R(x + 1, Y_PAR - 8, 4, 3, 'x');
  }

  // les fusées : un appel au secours, un dernier recours, le signal de ceux qui ont pris le tronçon
  if (o.fusees) {
    const fusee = (t0, x0, couleur, dx = 0, dur = 7) => {
      const u = t - t0; if (u < 0 || u > dur) return;
      const hautY = 24, montee = 1.0;
      const y = u < montee ? Y_PAR - (Y_PAR - hautY) * (u / montee) : hautY + (u - montee) * 2.4;
      const x = x0 + dx + u * 2.5;
      if (u < montee) D(x - 1, y, 2, Y_PAR - y, 'r');                              // la traînée
      else {
        halo(x, y, 14, 'r'); halo(x, y, 7, couleur === 'x' ? 'r' : 'o');                // le halo sur le champ
        R(x - 2, y - 2, 5, 5, couleur); R(x - 1, y - 4, 3, 9, couleur); R(x - 4, y - 1, 9, 3, couleur);
        D(x - 2, y + 4, 5, (u - montee) * 5, 'r');                                  // la fumée du parachute
      }
    };
    fusee(15, XC, 'o');                                                              // l'appel, quand la sortie commence
    fusee(27.3, XC - 12, 'o', 0, 6); fusee(27.4, XC + 12, 'o', 0, 6);                // le dernier homme : deux fusées
    fusee(29.2, XC, 'x', 0, 8);                                                      // ceux d'en face signalent le tronçon pris
  }
  return { defenseurs, dansLaTranchee: dansLaTranchee(A, t), pris };
}

const FORMES = {
  actuelle: { hud: true },
  feu: { feu: true },
  marques: { marques: true },
  fusees: { fusees: true },
  tout: { feu: true, marques: true, fusees: true },
};

export function maquetteAssaut(stage, variante) {
  const o = FORMES[variante];
  const boite = el('div'); boite.style.cssText = `position:relative;width:${L * K}px;max-width:100%;aspect-ratio:${L}/${H};background:${PALETTE.t};overflow:hidden`;
  const canvas = el('canvas', { width: L, height: H }); canvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;display:block';
  boite.append(canvas);
  const g = canvas.getContext('2d');
  let hud = null;
  if (o.hud) {
    hud = el('div'); hud.style.cssText = `position:absolute;left:8px;top:8px;padding:4px 8px;background:${PALETTE.t};border:1px solid ${PALETTE.s};color:${PALETTE.o};font:13px ui-monospace,monospace`;
    boite.append(hud);
  }
  stage.append(boite);
  const tl = mountTimeline(stage, {
    duree: DUREE, etapes: ETAPES,
    onTime: t => {
      const s = dessiner(g, t, o);
      if (hud) hud.textContent = `Tronçons : ${s.pris ? 11 : 12} · ${s.pris ? 12 : 11}`;
    },
  });
  return () => tl.detruire();
}
