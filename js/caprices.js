/* Les caprices du front (Jérôme, 23 nov., v0.163.0 : « un caprice par jour ») : la règle, pure. Chaque jour, un caprice (data/caprices.js) tombe à une heure
   tirée d'un hachage de la graine et du jour, tiré selon les poids des raretés des objets parachutés (data/largages.js) ; le camp qu'il touche aussi (hachage).
   Aucun tirage du générateur pour le calendrier ; les effets (obus au hasard, gaz) tirent dans le générateur de la bataille, comme toute la bataille.

   L'état : `etat.caprices` (sauvegardé) : { jour, prevu: { t, id, camp }, actif: { id, camp, t0, fin, ... }, soldats: [{ id, fin }] (les héros), histo: [[jour, id]] }.
   Branché dans `avancer` après les largages (`avancerCaprices`) : il pose aussi `ctx.cibles` (les héros chargent) et `ctx.boosts` (ils sont invincibles).
   Ce que la bataille lui prête : `ctx.obus`, `ctx.sortirChar`, `ctx.marcher` (bataille.js) ; `lacherCaisse` (largages.js). */
import { CAPRICES, CAPRICE, CAPRICES_JOUR as CJ } from './data/caprices.js?v=0.165.2';
import { RARETES, ORDRE_RARETES, OBJET } from './data/largages.js?v=0.165.2';
import { hash2 } from './lib/rng.js?v=0.165.2';
import { ligneY } from './tranchees.js?v=0.165.2';
import { vent } from './data/meteo.js?v=0.165.2';
import { lacherCaisse, milieu } from './largages.js?v=0.165.2';
import { ligneDe, tracerVol, positionDe } from './avions.js?v=0.165.2';
import { pvAvion } from './camp.js?v=0.165.2';

const NOUS = 0, EUX = 1, PAS = 1 / 30;
const r1 = v => Math.round(v * 10) / 10;

export const capricesDeDepart = () => ({ jour: 0, prevu: null, actif: null, soldats: [], histo: [] });

/* Le caprice du jour (graine, jour) : la rareté selon les poids, puis un caprice de la rareté ; sans caprice de cette rareté, le plus proche en dessous */
export function capriceDuJour(graine, jour) {
  const u = k => hash2(graine | 0, jour, 900 + k);
  const total = ORDRE_RARETES.reduce((s, k) => s + RARETES[k].poids, 0);
  let x = u(1) * total, r = 0;
  for (let k = 0; k < ORDRE_RARETES.length; k++) { if (x < RARETES[ORDRE_RARETES[k]].poids) { r = k; break; } x -= RARETES[ORDRE_RARETES[k]].poids; }
  for (; r >= 0; r--) { const l = CAPRICES.filter(c => c.rarete === ORDRE_RARETES[r]); if (l.length) return l[Math.min(l.length - 1, Math.floor(u(2) * l.length))]; }
  return CAPRICES[0];
}

// La première ligne d'un camp à l'abscisse x (sans tranchées : la moyenne des régiments du camp)
function premiere(B, camp, x, rang = 0) {
  const L = B.lignes?.find(l => l.camp === camp && l.rang === rang) ?? B.lignes?.find(l => l.camp === camp && l.rang === 0);
  if (L) return ligneY(L, x);
  const r = B.etat.regiments.filter(q => q.camp === camp && q.effectif > 0);
  return r.length ? r.reduce((s, q) => s + q.depart.y, 0) / r.length : B.terrain.H / 2;
}
const verrouille = (etat, reg) => reg?.verrou > etat.temps;
export { verrouille as regimentVerrouille };

/* Imposer le caprice du jour (les essais, le mode debug) : il tombe au pas suivant */
export function forcerCaprice(B, id, camp = 0) {
  const C = B.etat.caprices; if (!C) return;
  C.jour = B.etat.jour; C.prevu = { t: B.etat.temps, id, camp };
}

/* Le caprice en cours, lu par le dessin et l'écran : { id, camp, t0, fin, … } ou null */
export const capriceActif = etat => etat.caprices?.actif ?? null;
/* L'obscurité de l'éclipse (0 à `noir`), qui monte et descend en `entree` s ; lue par le dessin de la nuit (rendu/temps.js) */
export function obscuriteCaprice(etat) {
  const a = etat.caprices?.actif; if (!a || a.id !== 'eclipse') return 0;
  const C = CAPRICE.eclipse, t = etat.temps, f = Math.min(1, (t - a.t0) / C.entree, (a.fin - t) / C.entree);
  return Math.max(0, f) * C.noir;
}
/* Où est le zeppelin, où est le nuage de gaz (le dessin les lit) */
export function positionZeppelin(a, t) { return { x: a.x0 + a.dir * CAPRICE.zeppelin.vitesse * (t - a.t0), y: a.y, h: CAPRICE.zeppelin.altitude }; }
export function positionGaz(a, t) { const d = Math.min(t, a.fin) - a.t0; return { x: a.x0 + a.vx * d, y: a.y0 + a.vy * d, r: CAPRICE.gaz.rayon * Math.min(1, 0.35 + d / 8) }; }

/* Le caprice qui vient (pour l'annonce, v0.164.0) : { t, id, camp } ou null ; et le lieu où regarder, avant qu'il tombe (les mêmes hachages que `demarrer`)
   ou pendant (sa place du moment). Lecture seule. */
export const capricePrevu = etat => etat.phase === 'jour' && etat.caprices?.prevu && etat.caprices.jour === etat.jour ? etat.caprices.prevu : null;
export function lieuCaprice(B, zone, p = null) {
  const { etat } = B, a = p ? null : etat.caprices?.actif, t = etat.temps, xm = (zone.x0 + zone.x1) / 2;
  if (a) {
    if (a.id === 'zeppelin') { const z = positionZeppelin(a, t); return { x: Math.max(zone.x0, Math.min(zone.x1, z.x)), y: z.y }; }
    if (a.id === 'gaz') { const g = positionGaz(a, t); return { x: g.x, y: g.y }; }
    if (a.id === 'heros' && a.ids?.length) { const A = B.armee, i = indiceDe(A, a.ids[0]); if (i >= 0) return { x: A.x[i], y: A.y[i] }; }
    if (a.id === 'ordreAbsurde' && a.regs?.length) { const r = etat.regiments[a.regs[0]]; if (r) return { x: r.ordre.x, y: r.ordre.y }; }
    if (a.id === 'charsPerdus') { const c = etat.chars.filter(q => q.etat !== 'detruit').at(-1); if (c) return { x: c.x, y: c.y }; }
    if (a.id === 'as') { const v = etat.mitraillages.filter(q => q.as === a.t0 && q.etat !== 'rentre').at(-1); if (v) { const q = positionDe(v, t); return { x: Math.max(zone.x0, Math.min(zone.x1, q.x)), y: Math.max(zone.y0, Math.min(zone.y1, q.y)) }; } }
    if (a.x != null) return { x: a.x, y: a.y };
    return { x: xm, y: milieu(B, xm) };
  }
  if (!p) return null;
  const g = etat.graine | 0, u = k => hash2(g, etat.jour, 920 + k), xAu = k => r1(zone.x0 + 30 + u(k) * (zone.x1 - zone.x0 - 60));
  if (p.id === 'tirCourt') { const x = xAu(1); return { x, y: premiere(B, p.camp, x) }; }
  if (p.id === 'gaz') { const x = xAu(10); return { x, y: milieu(B, x) }; }
  if (p.id === 'zeppelin') return { x: xm, y: premiere(B, 1 - p.camp, xm) };
  if (p.id === 'mine') {
    const ts = B.troncons.map((tr, k) => [tr, k]).filter(([tr, k]) => B.lignes[tr.ligne].camp === p.camp && B.lignes[tr.ligne].rang === 0 && etat.troncons[k] === p.camp);
    if (ts.length) { const [tr] = ts[Math.floor(u(11) * ts.length)], x = (tr.x0 + tr.x1) / 2; return { x, y: ligneY(B.lignes[tr.ligne], x) }; }
  }
  if (p.id === 'as') return { x: xm, y: premiere(B, 1 - p.camp, xm) };
  return { x: xm, y: milieu(B, xm) };
}

export function avancerCaprices(B, ctx, rng, zone) {
  const { etat, R } = B, C = etat.caprices;
  if (!C) return;
  const t = etat.temps, tj = etat.tickJour * PAS, g = etat.graine | 0;
  // le calendrier : un caprice par jour
  if (C.jour !== etat.jour) {
    C.jour = etat.jour;
    const K = capriceDuJour(g, etat.jour);
    C.prevu = { t: t - tj + CJ.debut[0] + hash2(g, etat.jour, 911) * (CJ.debut[1] - CJ.debut[0]), id: K.id, camp: hash2(g, etat.jour, 913) < 0.5 ? NOUS : EUX };
  }
  if (C.prevu && !C.actif && t >= C.prevu.t) { const p = C.prevu; C.prevu = null; demarrer(B, ctx, rng, zone, p); }
  // les héros : invincibles, ils chargent la tranchée d'en face
  if (C.soldats.length) {
    C.soldats = C.soldats.filter(s => s.fin > t);
    const A = B.armee;
    for (const s of C.soldats) {
      (ctx.boosts ??= new Map()).set(s.id, { ...OBJET.revenant.e, o: 'revenant', caprice: true });
      const i = indiceDe(A, s.id); if (i < 0) continue;
      (ctx.cibles ??= new Map()).set(s.id, [A.x[i], premiere(B, 1 - A.camp[i], A.x[i]) + (A.camp[i] === NOUS ? 0.5 : -0.5)]);
    }
  }
  const a = C.actif; if (!a) return;
  const K = CAPRICE[a.id];
  if (a.id === 'obusPerdus' && etat.tickJour % Math.round(K.cadence / PAS) === 0) {
    const x = zone.x0 + 10 + rng() * (zone.x1 - zone.x0 - 20), y = zone.y0 + 10 + rng() * (zone.y1 - zone.y0 - 20);
    ctx.obus(r1(x), r1(y), K.cals[Math.floor(rng() * K.cals.length)]);
  }
  if (a.id === 'zeppelin') {
    const p = positionZeppelin(a, t);
    if (p.x >= zone.x0 && p.x <= zone.x1 && etat.tickJour % Math.round(K.bombe / PAS) === 0) {
      ctx.obus(r1(p.x + (rng() - 0.5) * 8), r1(p.y + (rng() - 0.5) * 14), K.cal);
      B.evenements.push({ type: 'bombe', camp: a.camp, x: p.x, y: p.y });
    }
    if ((a.dir > 0 && p.x > zone.x1 + 60) || (a.dir < 0 && p.x < zone.x0 - 60)) a.fin = t;
  }
  if (a.id === 'gaz' && etat.tickJour % 15 === 0) {
    const p = positionGaz(a, t), A = B.armee, r2 = p.r * p.r;
    for (let i = 0; i < A.n; i++) {
      if (A.mort[i]) continue;
      const dx = A.x[i] - p.x, dy = A.y[i] - p.y; if (dx * dx + dy * dy > r2) continue;
      A.peur[i] = 1;
      if (rng() < K.letal * 0.5) ctx.frapper(i, 'gaz', 0.4);
    }
  }
  if (a.id === 'as') {
    while (a.passes < K.passes && t >= a.t0 + a.passes * K.ecart) { passeAs(B, a, zone); a.passes++; }
    for (const v of etat.mitraillages) if (v.as === a.t0 && !v.recompense && (v.etat === 'chute' || v.etat === 'epave')) {
      v.recompense = true;
      const p = positionDe(v, t);
      if (etat.largages) lacherCaisse(B, zone, t + 0.5, { rarete: 'legendaire', x: r1(Math.max(zone.x0 + 5, Math.min(zone.x1 - 5, p.x))), y: r1(Math.max(zone.y0 + 5, Math.min(zone.y1 - 5, p.y))) });
      B.evenements.push({ type: 'as-abattu', camp: a.camp, x: p.x, y: p.y });
    }
  }
  if (a.id === 'ordreAbsurde') for (const id of a.regs) { const reg = etat.regiments[id]; if (reg && reg.effectif <= 0) reg.verrou = 0; }
  if (t >= a.fin) {
    if (a.id === 'ordreAbsurde') for (const id of a.regs) if (etat.regiments[id]) etat.regiments[id].verrou = 0;
    C.actif = null;
    B.evenements.push({ type: 'caprice-fin', id: a.id });
  }
}

function indiceDe(A, id) { for (let k = 0; k < A.n; k++) if (A.id[k] === id) return k; return -1; }

function demarrer(B, ctx, rng, zone, p) {
  const { etat } = B, C = etat.caprices, K = CAPRICE[p.id], t = etat.temps, g = etat.graine | 0, j = etat.jour, A = B.armee;
  const u = k => hash2(g, j, 920 + k);
  const a = { id: K.id, camp: p.camp, t0: t, fin: t + K.duree };
  const xAu = k => r1(zone.x0 + 30 + u(k) * (zone.x1 - zone.x0 - 60));
  C.histo.push([j, K.id]);
  if (K.id === 'tirCourt') {
    a.x = xAu(1); a.y = r1(premiere(B, p.camp, a.x));
    etat.barrages.push({ camp: p.camp, cal: K.cal, x: a.x, y: a.y, reste: K.obus, prochain: t + 1.5 });
  } else if (K.id === 'heros') {
    a.ids = [];
    for (const camp of [NOUS, EUX]) {
      const yl = x => premiere(B, camp, x), cand = [];
      for (let i = 0; i < A.n; i++) if (!A.mort[i] && !A.blessure[i] && A.camp[i] === camp && Math.abs(A.y[i] - yl(A.x[i])) < 4 && !etat.regiments[A.reg[i]]?.deroute) cand.push(A.id[i]);
      if (!cand.length) for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.camp[i] === camp) cand.push(A.id[i]);
      if (!cand.length) continue;
      cand.sort((x, y) => x - y);
      const id = cand[Math.floor(u(3 + camp) * cand.length)];
      C.soldats.push({ id, fin: t + K.duree }); a.ids.push(id);
    }
  } else if (K.id === 'charsPerdus') {
    a.chars = 0;
    for (const camp of [NOUS, EUX]) {
      const x = xAu(5 + camp), y = premiere(B, 1 - camp, x) + (camp === NOUS ? -6 : 6);
      if (ctx.sortirChar?.(camp, x, r1(y)).ok) a.chars++;
    }
  } else if (K.id === 'pluieCaisses') {
    if (etat.largages) for (let k = 0; k < K.n; k++) lacherCaisse(B, zone, t + 2.5 + k * K.ecart);
  } else if (K.id === 'ordreAbsurde') {
    a.regs = [];
    for (const camp of [NOUS, EUX]) {
      const regs = etat.regiments.filter(r => r.camp === camp && r.effectif > r.initial * 0.3 && !r.deroute).sort((x, y) => x.id - y.id);
      const debut = Math.floor(u(7 + camp) * regs.length);
      for (let k = 0; k < regs.length; k++) {
        const reg = regs[(debut + k) % regs.length], x = reg.ordre.trace ? (reg.ordre.trace.x0 + reg.ordre.trace.x1) / 2 : reg.ordre.x;
        if (ctx.marcher?.([reg.id], r1(x), r1(premiere(B, 1 - camp, x)), camp, true)?.ok) { reg.verrou = a.fin; a.regs.push(reg.id); break; }
      }
    }
  } else if (K.id === 'zeppelin') {
    a.dir = u(9) < 0.5 ? 1 : -1;
    a.y = r1(premiere(B, 1 - p.camp, (zone.x0 + zone.x1) / 2, 1) * 0.5 + premiere(B, 1 - p.camp, (zone.x0 + zone.x1) / 2, 0) * 0.5);
    a.x0 = a.dir > 0 ? zone.x0 - 80 : zone.x1 + 80;
    a.fin = t + (zone.x1 - zone.x0 + 160) / K.vitesse + 2;
  } else if (K.id === 'gaz') {
    const v = vent(etat.meteo[j - 1], g, j);
    a.x0 = xAu(10); a.y0 = r1(milieu(B, a.x0));
    a.vx = r1(Math.cos(v.ang) * Math.max(0.3, v.force) * K.derive); a.vy = r1(Math.sin(v.ang) * Math.max(0.3, v.force) * K.derive);
  } else if (K.id === 'mine') {
    const ts = B.troncons.map((tr, k) => [tr, k]).filter(([tr, k]) => B.lignes[tr.ligne].camp === p.camp && B.lignes[tr.ligne].rang === 0 && etat.troncons[k] === p.camp);
    if (ts.length) {
      const [tr, k] = ts[Math.floor(u(11) * ts.length)], x = (tr.x0 + tr.x1) / 2, y = ligneY(B.lignes[tr.ligne], x);
      a.x = r1(x); a.y = r1(y); a.troncon = k;
      for (let c = 0; c < K.coups; c++) { const ang = c / K.coups * Math.PI * 2; ctx.obus(r1(x + (c ? Math.cos(ang) * K.ecart : 0)), r1(y + (c ? Math.sin(ang) * K.ecart * 0.6 : 0)), K.cal); }
      if (etat.fil) for (const [tr2, k2] of B.troncons.map((q, n) => [q, n])) if (Math.abs((tr2.x0 + tr2.x1) / 2 - x) < 30) etat.fil[k2] = 0;
    } else { a.x = xAu(11); a.y = r1(premiere(B, p.camp, a.x)); for (let c = 0; c < K.coups; c++) ctx.obus(r1(a.x + (c - K.coups / 2) * 2), a.y, K.cal); }
  } else if (K.id === 'as') {
    a.passes = 0;
  } else if (K.id === 'eclipse') {
    etat.ia.barrage = Math.max(etat.ia.barrage, a.fin); etat.ia.offensive = Math.max(etat.ia.offensive, a.fin);
  } else if (K.id === 'seisme') {
    const ts = B.troncons;
    for (let c = 0; c < K.coups; c++) {
      if (!ts.length) { ctx.obus(xAu(20 + c), r1(zone.y0 + u(40 + c) * (zone.y1 - zone.y0)), K.cal); continue; }
      const tr = ts[Math.floor(u(20 + c) * ts.length)], x = tr.x0 + u(60 + c) * (tr.x1 - tr.x0);
      ctx.obus(r1(x), r1(ligneY(B.lignes[tr.ligne], x)), K.cal);
    }
  }
  C.actif = a;
  B.evenements.push({ type: 'caprice', id: K.id, camp: K.camp ? p.camp : -1, x: a.x ?? a.x0, y: a.y ?? a.y0 });
}

// Une passe de l'as : le long de la première ligne d'en face, d'un bord du secteur à l'autre ; six fois plus solide, hors de la flotte (k = −1)
function passeAs(B, a, zone) {
  const { etat } = B, K = CAPRICE.as, sens = a.passes % 2 ? -1 : 1, xm = (zone.x0 + zone.x1) / 2;
  const y = premiere(B, 1 - a.camp, xm) + (a.camp === NOUS ? -2 : 2);
  const l = ligneDe(a.camp, sens > 0 ? zone.x0 + 20 : zone.x1 - 20, y, sens > 0 ? zone.x1 - 20 : zone.x0 + 20, y, 1e5);
  if (l.refus) return;
  const vol = tracerVol(B.terrain, l), pv = pvAvion(etat, a.camp) * K.pv;
  etat.mitraillages.push({ id: etat.mitraillages.length ? etat.mitraillages[etat.mitraillages.length - 1].id + 1 : 0, camp: a.camp, k: -1, ...vol, t0: etat.temps, pv, etat: 'vol', as: a.t0 });
}
