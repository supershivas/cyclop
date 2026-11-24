/* Les largages (Jérôme, 23 nov., v0.162.0 : « par instant, des avions passent au-dessus du no man's land et larguent des objets dans des caisses en parachute ;
   lorsqu'elles touchent le sol, un objet en sort ; le premier joueur qui l'atteint le gagne ») : la règle, pure (aucun DOM ni horloge ; le hasard vient du hachage
   de la graine et du générateur de la bataille passé en paramètre). Le contenu est dans data/largages.js, le dessin dans rendu/largages.js.

   L'état vit dans `etat.largages` (sauvegardé) :
   - `caisses` : chaque caisse lâchée ; `etat` 'chute' (dans l'air, puis au sol pendant l'ouverture), 'sol' (l'objet tourne, on peut le prendre), 'porte' (un homme
     ramène un objet de musette vers sa tranchée), 'pris' (fini) ; `coureurs` : les numéros des hommes qui courent vers elle ;
   - `musette` : par camp, les objets à viser ramenés (au plus `LARGAGE.musette`) ;
   - `soldats` : les boosts d'un homme { id, o, fin, coups } ; `drapeaux` : les drapeaux plantés ; `grenades` : celles des objets, en vol ; `avions` : par camp,
     { letal: le jour des balles incendiaires, bombes: celles qui restent pour le prochain vol } ;
   - le boost d'un régiment est sur le régiment (`reg.boost` : { o, fin, tir, vit, intrepide, pertes, tenace, aura }).
   Le calendrier ne tire rien du générateur : l'heure, l'endroit et l'objet viennent d'un hachage (graine, jour, numéro). */
import { OBJET, LARGAGE as L, tirerObjet, musetteObjet } from './data/largages.js?v=0.169.0';
import { CALIBRES } from './data/calibres.js?v=0.169.0';
import { hash2 } from './lib/rng.js?v=0.169.0';
import { ajouterSoldat, poserCaracs, effrayer, DENSITE, GRILLE, place } from './army.js?v=0.169.0';
import { ligneY } from './tranchees.js?v=0.169.0';
import { departCaracs } from './identite.js?v=0.169.0';
import { positionDe } from './avions.js?v=0.169.0';
import { pvAvion, sortieCaserne } from './camp.js?v=0.169.0';
import { NIDS } from './data/nids.js?v=0.169.0';

const NOUS = 0, EUX = 1;
const PAS_LARGAGE = 1 / 30;
const ID_RENFORT = 3000000;      // les hommes d'un objet ont des numéros à part (jamais ceux d'un régiment créé ensuite)

export function largagesDeDepart() {
  return { jour: 0, prochain: 0, n: 0, caisses: [], musette: [[], []], soldats: [], drapeaux: [], grenades: [], avions: [{ letal: 0, bombes: 0 }, { letal: 0, bombes: 0 }], ia: 0, renforts: 0 };
}

// ─── La chute (lue aussi par le dessin) ───

const G = 9.8;
export const dureeChute = () => L.chuteLibre + (L.altitude - 0.5 * G * L.chuteLibre ** 2) / L.descente;
/* Où est la caisse `c` au temps `t` : { x, y, h, phase: 'avion' | 'libre' | 'corolle' | 'sol', ts (s depuis l'ouverture de la corolle), ta (s depuis le sol) }.
   L'avion passe d'ouest en est (ou l'inverse, `dir`) et lâche la caisse un peu avant l'aplomb : elle garde sa vitesse le temps de la chute libre. */
export function positionCaisse(c, t) {
  const dt = t - c.t0, avance = L.vitesseAvion * 0.6 * L.chuteLibre;
  if (dt < 0) return { x: c.x - c.dir * avance, y: c.y, h: L.altitude, phase: 'avion', ts: -1, ta: -1 };
  if (dt < L.chuteLibre) { const f = dt / L.chuteLibre; return { x: c.x - c.dir * avance * (1 - f), y: c.y, h: L.altitude - 0.5 * G * dt * dt, phase: 'libre', ts: -1, ta: -1 }; }
  const ts = dt - L.chuteLibre, h0 = L.altitude - 0.5 * G * L.chuteLibre ** 2, h = Math.max(0, h0 - L.descente * ts);
  return { x: c.x, y: c.y, h, phase: h > 0 ? 'corolle' : 'sol', ts, ta: h > 0 ? -1 : dt - dureeChute() };
}
// Où est l'avion d'une caisse au temps t (le dessin) : il passe à l'aplomb de la caisse au temps du lâcher
export const avionDeCaisse = (c, t) => ({ x: c.x - c.dir * L.vitesseAvion * 0.6 * L.chuteLibre + c.dir * L.vitesseAvion * (t - c.t0), y: c.y + 4, h: L.altitude });

// ─── Les effets en cours (lus par army.js, bataille.js, tir-joueur.js et le dessin) ───

/* Les boosts d'homme en cours, par numéro (null s'il n'y en a pas : army.js ne cherche rien) */
export function boostsDe(etat) {
  const S = etat.largages?.soldats;
  if (!S?.length) return null;
  const m = new Map();
  for (const s of S) m.set(s.id, { ...OBJET[s.o].e, ...(OBJET[s.o].e.soldat ?? {}), o: s.o });
  return m;
}
/* Les hommes qui courent vers une caisse : numéro → [x, y] (army.js : leur but, à la place de leur place) */
function ciblesDe(etat) {
  let m = null;
  for (const c of etat.largages.caisses) {
    if ((c.etat !== 'chute' && c.etat !== 'sol') || !c.coureurs.length) continue;
    m ??= new Map();
    for (const id of c.coureurs) m.set(id, [c.x, c.y]);
  }
  return m;
}

function indiceDe(A, id) { for (let k = 0; k < A.n; k++) if (A.id[k] === id) return k; return -1; }

// Le centre du carré le plus dense de `camp` à moins de `portee` m de (x, y) (le but d'une grenade, du tromblon) ; null s'il n'y a personne
function cibleDense(A, x, y, camp, portee) {
  const de = A.dens[camp], rB = Math.ceil(portee / DENSITE), bx = (x / DENSITE) | 0, by = (y / DENSITE) | 0;
  let best = -1, bn = 0, bx2 = 0, by2 = 0;
  for (let oy = -rB; oy <= rB; oy++) for (let ox = -rB; ox <= rB; ox++) {
    const xx = bx + ox, yy = by + oy; if (xx < 0 || yy < 0 || xx >= A.dw || yy >= A.dh) continue;
    const m = de[yy * A.dw + xx]; if (m <= bn) continue;
    const cx = (xx + 0.5) * DENSITE, cy = (yy + 0.5) * DENSITE;
    if (Math.hypot(cx - x, cy - y) > portee) continue;
    best = yy * A.dw + xx; bn = m; bx2 = cx; by2 = cy;
  }
  return best < 0 ? null : [bx2, by2];
}

// ─── Le calendrier : un avion de temps en temps, au-dessus du no man's land ───

// Le milieu du no man's land à l'abscisse x : entre nos premières lignes et les leurs (sans tranchées : entre les deux camps)
export function milieu(B, x) {
  const n = B.lignes?.find(l => l.camp === NOUS && l.rang === 0), e = B.lignes?.find(l => l.camp === EUX && l.rang === 0);
  if (n && e) return (ligneY(n, x) + ligneY(e, x)) / 2;
  const { etat } = B, ys = [NOUS, EUX].map(c => { const r = etat.regiments.filter(q => q.camp === c && q.effectif > 0); return r.length ? r.reduce((s, q) => s + q.depart.y, 0) / r.length : null; });
  return ys[0] != null && ys[1] != null ? (ys[0] + ys[1]) / 2 : B.terrain.H / 2;
}

function planifier(B, zone) {
  const { etat, R } = B, LG = etat.largages, g = etat.graine | 0, tj = etat.tickJour * PAS_LARGAGE;
  if (LG.jour !== etat.jour) {
    LG.jour = etat.jour;
    LG.prochain = etat.temps - tj + L.premier[0] + hash2(g, etat.jour, 501) * (L.premier[1] - L.premier[0]);
  }
  if (etat.temps < LG.prochain || tj > L.fin || tj + dureeChute() > R.jour.duree) return;
  const n = lacherCaisse(B, zone, etat.temps + 2.5);
  LG.prochain = etat.temps + L.intervalle[0] + hash2(g, n, 606) * (L.intervalle[1] - L.intervalle[0]);
}
/* La prochaine caisse du calendrier, pour l'annonce à l'écran (v0.164.0) : { t (le temps où l'avion lâche), x } ou null. Lecture seule : les mêmes hachages que
   `planifier` et `lacherCaisse`, rien n'est tiré. */
export function prochaineCaisse(B, zone) {
  const { etat, R } = B, LG = etat.largages;
  if (!LG || LG.jour !== etat.jour || etat.phase !== 'jour') return null;
  const debutJour = etat.temps - etat.tickJour * PAS_LARGAGE, tj = LG.prochain - debutJour;
  if (LG.prochain <= etat.temps || tj > L.fin || tj + dureeChute() > R.jour.duree) return null;
  const Z = zone, marge = 0.12 * (Z.x1 - Z.x0);
  return { t: LG.prochain + 2.5, x: Math.round((Z.x0 + marge + hash2(etat.graine | 0, LG.n, 601) * (Z.x1 - Z.x0 - 2 * marge)) * 10) / 10 };
}
/* Une caisse lâchée au temps `t0` (la pluie de caisses et l'as des caprices s'en servent aussi, caprices.js) : l'endroit et l'objet du hachage de son numéro,
   sauf `force` : { o (un objet imposé), rarete (une rareté imposée), x, y (le point de chute) }. Rend son numéro. */
export function lacherCaisse(B, zone, t0, force = {}) {
  const { etat } = B, LG = etat.largages, g = etat.graine | 0;
  const n = LG.n++, u = k => hash2(g, n, 600 + k);
  const Z = zone, marge = 0.12 * (Z.x1 - Z.x0);
  const x = force.x ?? Math.round((Z.x0 + marge + u(1) * (Z.x1 - Z.x0 - 2 * marge)) * 10) / 10;
  const y = force.y ?? Math.round((milieu(B, x) + (u(2) - 0.5) * 14) * 10) / 10;
  const O = force.o ? OBJET[force.o] : force.rarete ? tirerDe(force.rarete, u(4)) : tirerObjet(u(3), u(4));
  LG.caisses.push({ id: n, o: O.id, x, y, dir: u(5) < 0.5 ? 1 : -1, t0: Math.round(t0 * 30) / 30, etat: 'chute', porteur: -1, camp: -1, coureurs: [], px: x, py: y });
  B.evenements.push({ type: 'largage', caisse: n, o: O.id, x, y });
  return n;
}
const tirerDe = (rarete, v) => { const l = Object.values(OBJET).filter(o => o.rarete === rarete); return l[Math.min(l.length - 1, Math.floor(v * l.length))]; };

// Les coureurs : les `coureurs` hommes valides de chaque camp les plus proches, à moins de `rayonCourse` m (ni blessés, ni en déroute, ni à une mitrailleuse, ni pilotés)
function choisirCoureurs(B, c, ctx) {
  const { etat, armee: A } = B, r2 = L.rayonCourse ** 2, pilotes = new Set((B.pilotes ?? []).filter(Boolean).map(p => p.id));
  const parCamp = [[], []];
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i] || A.blessure[i] || pilotes.has(A.id[i]) || ctx.postes?.has?.(A.id[i])) continue;
    const reg = etat.regiments[A.reg[i]]; if (!reg || reg.deroute) continue;
    const d2 = (A.x[i] - c.x) ** 2 + (A.y[i] - c.y) ** 2; if (d2 > r2) continue;
    parCamp[A.camp[i]].push([d2, A.id[i]]);
  }
  c.coureurs = parCamp.flatMap(l => l.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, L.coureurs).map(e => e[1]));
}

// ─── Le pas : avant la foule (ce qui la mène) et après (qui a pris quoi) ───

/* Avant `pasArmee` : le calendrier, les boosts qui finissent, les hommes qui courent, les drapeaux, les armes des hommes boostés, les grenades, les bombes des avions,
   les chars rapides, et la musette d'en face (l'IA). Pose `ctx.boosts` et `ctx.cibles`. */
export function avantArmee(B, ctx, rng, zone) {
  const { etat, armee: A, R } = B, LG = etat.largages;
  if (!LG) return;
  planifier(B, zone);
  const t = etat.temps;
  // les boosts finis
  if (LG.soldats.length) LG.soldats = LG.soldats.filter(s => s.fin > t && (s.coups == null || s.coups > 0));
  for (const reg of etat.regiments) if (reg.boost && reg.boost.fin <= t) {
    if (reg.boost.gueris && !reg.boost.aura) guerir(B, reg);
    delete reg.boost;
  }
  for (const c of etat.chars) if (c.boostFin && c.boostFin <= t) { c.vit = c.vit0 ?? 1; delete c.boostFin; delete c.vit0; }
  // les drapeaux : arrachés par un homme d'en face à 2 m ; sinon leur aura (les régiments du camp à `aura` m du drapeau ont les mêmes effets)
  if (LG.drapeaux.length) {
    for (const d of LG.drapeaux) {
      if (d.fin <= t) { d.fin = 0; continue; }
      for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.camp[i] !== d.camp && (A.x[i] - d.x) ** 2 + (A.y[i] - d.y) ** 2 < 4) { d.fin = 0; B.evenements.push({ type: 'drapeau-arrache', camp: d.camp, x: d.x, y: d.y }); break; }
      if (!d.fin) { const reg = etat.regiments[d.reg]; if (reg?.boost?.drapeau) reg.boost.fin = t; continue; }
      const e = OBJET[d.o].e;
      if (e.aura && etat.tickJour % 30 === 0) {
        const n = new Float32Array(etat.regiments.length), sx = new Float32Array(n.length), sy = new Float32Array(n.length);
        for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.camp[i] === d.camp) { n[A.reg[i]]++; sx[A.reg[i]] += A.x[i]; sy[A.reg[i]] += A.y[i]; }
        for (const reg of etat.regiments) {
          if (reg.camp !== d.camp || reg.id === d.reg || !n[reg.id] || (reg.boost && !reg.boost.aura)) continue;
          if (Math.hypot(sx[reg.id] / n[reg.id] - d.x, sy[reg.id] / n[reg.id] - d.y) <= e.aura) reg.boost = { o: d.o, fin: Math.min(d.fin, t + 1.2), tir: e.tir, pertes: e.pertes, tenace: e.tenace, aura: true };
        }
      }
    }
    LG.drapeaux = LG.drapeaux.filter(d => d.fin > t);
  }
  // un régiment tenace (le drapeau) ne déroute pas : son moral ne descend pas sous le ralliement
  for (const reg of etat.regiments) if (reg.boost?.tenace) reg.moral = Math.max(reg.moral, R.moral.ralliement + 0.02);
  ctx.boosts = boostsDe(etat);
  ctx.cibles = ciblesDe(etat);
  ctx.boostTir = (i, b, tx, ty) => tirBooste(B, ctx, i, b, tx, ty);
  // les armes des hommes boostés : la flamme (deux fois par seconde) et le tromblon (une grenade par seconde)
  if (ctx.boosts) for (const s of LG.soldats) {
    const b = ctx.boosts.get(s.id); if (!b.flamme && !b.tromblon) continue;
    const per = b.flamme ? 15 : 30; if ((etat.tickJour + s.id) % per) continue;
    const i = indiceDe(A, s.id); if (i < 0 || A.mort[i]) continue;
    if (b.flamme) flamme(B, ctx, rng, i, b.flamme);
    else { const c = cibleDense(A, A.x[i], A.y[i], 1 - A.camp[i], b.tromblon); if (c) { LG.grenades.push({ x: Math.round((c[0] + (rng() - 0.5) * 6) * 10) / 10, y: Math.round((c[1] + (rng() - 0.5) * 6) * 10) / 10, t: t + 1.5, camp: A.camp[i] }); B.evenements.push({ type: 'tromblon', camp: A.camp[i], x: A.x[i], y: A.y[i], tx: c[0], ty: c[1] }); } }
  }
  // les grenades des objets dont la mèche a brûlé
  if (LG.grenades.length) {
    const reste = [];
    for (const g of LG.grenades) {
      if (g.t > t) { reste.push(g); continue; }
      ctx.cal = 'grenade'; ctx.tuerDans(g.x, g.y, 3.5, 1.2); ctx.cal = null;
      B.evenements.push({ type: 'impact', x: g.x, y: g.y, cal: '75', grenade: true });
    }
    LG.grenades = reste;
  }
  // les bombes Aasen : une toutes les 1,5 s sous chaque avion du camp au-dessus du secteur, jusqu'à épuisement
  for (const camp of [NOUS, EUX]) {
    const AV = LG.avions[camp]; if (!AV.bombes || etat.tickJour % 45) continue;
    for (const v of etat.mitraillages) {
      if (v.camp !== camp || v.etat !== 'vol' || AV.bombes <= 0) continue;
      const p = positionDe(v, t);
      if (p.piste || p.x < zone.x0 || p.x > zone.x1 || p.y < zone.y0 || p.y > zone.y1) continue;
      AV.bombes--; ctx.obus(Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, '155');
      B.evenements.push({ type: 'bombe', camp, x: p.x, y: p.y });
    }
  }
  // la musette d'en face : l'IA vise le plus gros groupe des nôtres (pas à deux : l'autre joueur vise lui-même)
  if (!etat.deux && LG.musette[EUX].length && t >= LG.ia) {
    LG.ia = t + L.ia[0] + rng() * (L.ia[1] - L.ia[0]);
    const d = A.dens[NOUS]; let best = -1, bn = 0;
    for (let b = 0; b < d.length; b++) if (d[b] > bn) { bn = d[b]; best = b; }
    if (best >= 0) { const bx = best % A.dw, by = (best - bx) / A.dw; utiliserObjet(B, EUX, 0, (bx + 0.5) * DENSITE, (by + 0.5) * DENSITE, zone); }
  }
}

/* Après `pasArmee` : les caisses qui touchent, les coureurs, la prise, le porteur qui ramène l'objet (ou qui tombe en route). */
export function apresArmee(B, ctx, rng, zone) {
  const { etat, armee: A } = B, LG = etat.largages;
  if (!LG || !LG.caisses.length) return;
  const t = etat.temps, D = dureeChute();
  for (const c of LG.caisses) {
    if (c.etat === 'pris') continue;
    if (c.etat === 'chute') {
      if (t >= c.t0 + D - L.course && !c.coureurs.length) choisirCoureurs(B, c, ctx);
      if (t >= c.t0 + D + L.ouverture) { c.etat = 'sol'; B.evenements.push({ type: 'caisse-sol', caisse: c.id, o: c.o, x: c.x, y: c.y }); }
      continue;
    }
    if (c.etat === 'sol') {
      if (!c.coureurs.length) choisirCoureurs(B, c, ctx);
      const i = preneur(A, c);
      if (i >= 0) prendre(B, ctx, c, i, zone);
      continue;
    }
    if (c.etat === 'porte') {
      const i = indiceDe(A, c.porteur);
      if (i < 0 || A.mort[i]) {      // il est tombé : l'objet reste là où il est mort ; une nouvelle course s'ouvre
        c.etat = 'sol'; c.x = c.px; c.y = c.py; c.coureurs = []; c.porteur = -1;
        B.evenements.push({ type: 'objet-perdu', camp: c.camp, o: c.o, x: c.x, y: c.y });
        c.camp = -1;
        continue;
      }
      c.px = Math.round(A.x[i] * 10) / 10; c.py = Math.round(A.y[i] * 10) / 10;
      if (chezLui(B, A, i) && LG.musette[c.camp].length < L.musette) {
        LG.musette[c.camp].push(c.o); c.etat = 'pris';
        B.evenements.push({ type: 'objet-livre', camp: c.camp, o: c.o, id: c.porteur });
      }
    }
  }
  if (LG.caisses.length > 12) LG.caisses = LG.caisses.filter(c => c.etat !== 'pris' || c.id >= LG.n - 4);      // (les dernières restent : le dessin finit leur animation)
}

// Le premier homme à `prise` m de l'objet (le plus proche ; à égalité, le premier de la foule)
function preneur(A, c) {
  const r2 = L.prise * L.prise, g = Math.ceil(L.prise / GRILLE) + 1, gx = (c.x / GRILLE) | 0, gy = (c.y / GRILLE) | 0;
  let best = -1, bd = r2;
  for (let oy = -g; oy <= g; oy++) for (let ox = -g; ox <= g; ox++) {
    const xx = gx + ox, yy = gy + oy; if (xx < 0 || yy < 0 || xx >= A.gw || yy >= A.gh) continue;
    const cell = yy * A.gw + xx;
    for (let s = A.cellStart[cell], e = A.cellStart[cell + 1]; s < e; s++) {
      const i = A.sorted[s]; if (i >= A.n || A.mort[i]) continue;
      const d2 = (A.x[i] - c.x) ** 2 + (A.y[i] - c.y) ** 2;
      if (d2 < bd || (d2 === bd && i < best)) { bd = d2; best = i; }
    }
  }
  return best;
}
// Il est rentré : dans une tranchée que tient son camp, ou (sans tranchées) à 3 m de sa place
function chezLui(B, A, i) {
  const T = B.terrain, c = (A.y[i] | 0) * T.W + (A.x[i] | 0), t = T.troncon?.[c] ?? -1;
  if (t >= 0 && T.diff[c] <= -2) return B.etat.troncons[t] === A.camp[i];
  if (B.etat.tranchees) return false;
  const reg = B.etat.regiments[A.reg[i]], p = [0, 0]; place(reg.ordre, A.slot[i], p);
  return Math.hypot(p[0] - A.x[i], p[1] - A.y[i]) < 3;
}

function prendre(B, ctx, c, i, zone) {
  const { etat, armee: A } = B, O = OBJET[c.o], camp = A.camp[i];
  c.camp = camp; c.coureurs = [];
  B.evenements.push({ type: 'objet', camp, o: c.o, id: A.id[i], reg: A.reg[i], x: c.x, y: c.y, musette: musetteObjet(O) });
  if (musetteObjet(O)) { c.etat = 'porte'; c.porteur = A.id[i]; c.px = c.x; c.py = c.y; return; }
  c.etat = 'pris';
  appliquer(B, ctx, O, camp, i, zone);
}

// ─── Les effets ───

function appliquer(B, ctx, O, camp, i, zone) {
  const { etat, armee: A } = B, LG = etat.largages, e = O.e, t = etat.temps, reg = etat.regiments[A.reg[i]];
  if (O.cat === 'soldat' || e.soldat) {
    const d = e.soldat?.duree ?? e.duree;
    LG.soldats = LG.soldats.filter(s => s.id !== A.id[i]);
    LG.soldats.push({ id: A.id[i], o: O.id, fin: t + d, coups: e.coups ?? null });
    if (e.frais) A.fatJ[i] = 0;
    return;
  }
  if (O.cat === 'regiment') {
    if (e.grenades) return grenadesDuRegiment(B, ctx, reg, e);
    reg.boost = { o: O.id, fin: t + e.duree, tir: e.tir, vit: e.vit, intrepide: e.intrepide, pertes: e.pertes, tenace: e.tenace, gueris: e.gueris, drapeau: e.drapeau };
    if (e.drapeau) LG.drapeaux.push({ camp, reg: reg.id, o: O.id, x: Math.round(A.x[i] * 10) / 10, y: Math.round(A.y[i] * 10) / 10, fin: t + e.duree });
    return;
  }
  if (O.cat === 'renfort') {
    if (e.hommes) return ajouterHommes(B, reg, e.hommes, ctx.rng);
    for (let k = 0; k < e.regiments; k++) { const r = ctx.deployerObjet(camp); if (!r.ok) { ajouterHommes(B, reg, 40, ctx.rng); B.evenements.push({ type: 'objet-repli', camp, o: O.id, refus: r.refus }); } }
    return;
  }
  if (O.cat === 'avion') {
    const AV = LG.avions[camp], fl = etat.avions[camp], pv = pvAvion(etat, camp);
    if (e.avions) for (let k = 0; k < e.avions; k++) fl.push(pv);
    if (e.repare) { let n = e.repare; for (let k = 0; k < fl.length && n > 0; k++) if (fl[k] < pv && !etat.mitraillages.some(v => v.camp === camp && v.k === k && v.etat !== 'epave')) { fl[k] = pv; n--; } }
    if (e.letal) AV.letal = etat.jour;
    if (e.bombes) AV.bombes += e.bombes;
    return;
  }
  if (O.cat === 'char') {
    const parc = etat.parcChars[camp];
    if (e.repare) { for (const c of etat.chars) if (c.camp === camp && c.etat !== 'detruit') c.pv = c.pvMax ?? c.pv; for (const p of parc) p.pv = p.pvMax ?? p.pv; }
    if (e.blindage) { for (const c of etat.chars) if (c.camp === camp && c.etat !== 'detruit') { c.pv *= e.blindage; c.pvMax = (c.pvMax ?? c.pv) * e.blindage; } for (const p of parc) { p.pv *= e.blindage; p.pvMax = (p.pvMax ?? p.pv) * e.blindage; } }
    if (e.vit) for (const c of etat.chars) if (c.camp === camp && c.etat !== 'detruit' && c.etat !== 'rentre') { if (!c.boostFin) c.vit0 = c.vit ?? 1; c.vit = (c.vit0 ?? 1) * e.vit; c.boostFin = t + e.duree; }
    if (e.neuf) { const y = milieu(B, A.x[i]) + (camp === NOUS ? -60 : 60), r = ctx.sortirChar(camp, A.x[i], y); if (!r.ok) { if (etat.charsDispo[camp] != null) etat.charsDispo[camp]++; B.evenements.push({ type: 'objet-repli', camp, o: O.id, refus: r.refus }); } }
    return;
  }
  if (O.cat === 'arme') {
    if (e.fil) couperFil(B, A.x[i], e.fil, camp, null);
    if (e.nid) poserNid(B, camp, A.x[i], A.y[i]);
  }
}

// Les blessés d'un régiment se relèvent (le drapeau, à la fin)
function guerir(B, reg) {
  const A = B.armee;
  for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.reg[i] === reg.id && A.blessure[i]) A.blessure[i] = 0;
}

/* Des hommes en plus pour un régiment : ils sortent de la caserne (ou arrivent par l'arrière, 12 m derrière sa place) et rejoignent les rangs */
function ajouterHommes(B, reg, n, rng) {
  const { etat, armee: A } = B, LG = etat.largages, S = sortieCaserne(etat, reg.camp);
  let slot = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) slot = Math.max(slot, A.slot[i] + 1);
  const t = reg.ordre.trace, x0 = S ? S.x - S.w / 2 + 1 : t ? t.x0 : reg.ordre.x - 20, x1 = S ? S.x + S.w / 2 - 1 : t ? t.x1 : reg.ordre.x + 20;
  const y = S ? S.y : reg.ordre.y + (reg.camp === NOUS ? 12 : -12);
  for (let k = 0; k < n; k++) {
    const id = ID_RENFORT + LG.renforts++;
    const i = ajouterSoldat(A, x0 + rng() * (x1 - x0), Math.max(1, Math.min(B.terrain.H - 2, y + (rng() - 0.5) * 4)), reg.camp, reg.id, slot + k, rng(), id);
    if (i < 0) break;
    poserCaracs(A, i, departCaracs(etat.graine, reg.camp, id, k, n, reg.id));
    if (etat.numeros && reg.camp === NOUS) etat.numeros[id] = etat.prochainNumero++;
    reg.effectif++;
  }
  B.evenements.push({ type: 'renfort-objet', camp: reg.camp, reg: reg.id, n });
}

// Chaque homme du régiment qui a l'ennemi à moins de `portee` m lance ses grenades sur le plus gros groupe à sa portée, une toutes les 0,7 s
function grenadesDuRegiment(B, ctx, reg, e) {
  const { etat, armee: A } = B, LG = etat.largages, t = etat.temps;
  let n = 0;
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i] || A.reg[i] !== reg.id || A.blessure[i] === 1) continue;
    const c = cibleDense(A, A.x[i], A.y[i], 1 - reg.camp, e.portee); if (!c) continue;
    for (let k = 0; k < e.grenades; k++) LG.grenades.push({ x: Math.round((c[0] + (ctx.rng() - 0.5) * 8) * 10) / 10, y: Math.round((c[1] + (ctx.rng() - 0.5) * 8) * 10) / 10, t: t + 1.5 + k * 0.7 + (n % 10) * 0.07, camp: reg.camp });
    n++;
  }
  B.evenements.push({ type: 'grenades-objet', camp: reg.camp, reg: reg.id, n: n * e.grenades });
}

// La flamme : les hommes d'en face à moins de `portee` m, devant lui (vers le plus gros groupe), brûlent (une chance sur trois) ou fuient
function flamme(B, ctx, rng, i, portee) {
  const A = B.armee, c = cibleDense(A, A.x[i], A.y[i], 1 - A.camp[i], portee); if (!c) return;
  const ux = c[0] - A.x[i], uy = c[1] - A.y[i], ul = Math.hypot(ux, uy) || 1;
  for (let j = 0; j < A.n; j++) {
    if (A.mort[j] || A.camp[j] === A.camp[i]) continue;
    const dx = A.x[j] - A.x[i], dy = A.y[j] - A.y[i], d = Math.hypot(dx, dy);
    if (d > portee || (dx * ux + dy * uy) / (d * ul || 1) < 0.7) continue;
    if (rng() < 0.33) ctx.frapper(j, 'feu', 0.8, null, i); else A.peur[j] = 1;
  }
  B.evenements.push({ type: 'flamme', camp: A.camp[i], x: A.x[i], y: A.y[i], tx: A.x[i] + ux / ul * portee, ty: A.y[i] + uy / ul * portee });
}

// Le tir d'un homme boosté (army.js et tir-joueur.js l'appellent) : un obus là où va la balle, ou une balle qui tue à coup sûr ; les coups se comptent
function tirBooste(B, ctx, i, b, tx, ty) {
  const LG = B.etat.largages, s = LG.soldats.find(q => q.id === B.armee.id[i]);
  if (s && s.coups != null) s.coups--;
  if (b.obus && tx !== undefined) ctx.obus(Math.round(tx * 10) / 10, Math.round(ty * 10) / 10, b.obus);
}

// Le fil d'en face coupé sur `demi` m de chaque côté de x (`y` : seulement les tronçons à moins de 30 m de y ; null : la première ligne d'en face)
function couperFil(B, x, demi, camp, y) {
  const { etat } = B;
  if (!etat.fil) return;
  B.troncons.forEach((tr, k) => {
    const Lg = B.lignes[tr.ligne];
    if (Lg.camp === camp || tr.x1 < x - demi || tr.x0 > x + demi) return;
    if (y == null ? Lg.rang !== 0 : Math.abs(ligneY(Lg, (tr.x0 + tr.x1) / 2) - y) > 30) return;
    etat.fil[k] = 0;
  });
  B.evenements.push({ type: 'fil-coupe', camp, x });
}

// Un nid de mitrailleuse neuf sur la tranchée tenue par `camp` la plus proche de (x, y)
function poserNid(B, camp, x, y) {
  const { etat } = B;
  let best = -1, bd = Infinity;
  B.troncons.forEach((tr, k) => {
    const Lg = B.lignes[tr.ligne];
    if (Lg.camp !== camp || etat.troncons[k] !== camp || etat.nids.some(n => n.troncon === k)) return;
    const cx = Math.max(tr.x0, Math.min(tr.x1, x)), d = Math.hypot(cx - x, ligneY(Lg, cx) - y);
    if (d < bd) { bd = d; best = k; }
  });
  if (best < 0) { B.evenements.push({ type: 'objet-repli', camp, o: 'hotchkiss', refus: 'Aucune de nos tranchées sans nid où la poser.' }); return; }
  const tr = B.troncons[best], Lg = B.lignes[tr.ligne], nx = Math.round(Math.max(tr.x0 + 1, Math.min(tr.x1 - 1, x)) * 10) / 10;
  etat.nids.push({ id: etat.nids.length ? Math.max(...etat.nids.map(n => n.id)) + 1 : 0, camp, troncon: best, x: nx, y: Math.round((ligneY(Lg, nx) + Lg.face * (Lg.amp + 1.6)) * 10) / 10, face: Lg.face, pv: NIDS.pv, etat: 'actif', tire: 0, muni: NIDS.munitions, exp: 0, tues: 0, rafales: 0, servi: -1, servant: -1, tuesReg: {}, ax: 0, ay: Lg.face });
  B.evenements.push({ type: 'nid-objet', camp, x: nx });
}

// ─── La musette : les objets à viser ───

/* Peut-on utiliser l'objet `k` de la musette de `camp` en (x, y) ? { ok, o } ou { refus } (dit à voix haute) */
export function peutUtiliserObjet(B, camp, k, x, y, zone) {
  const { etat } = B, LG = etat.largages;
  if (!LG) return { refus: 'Pas de largages dans cette bataille.' };
  if (etat.phase !== 'jour') return { refus: 'La nuit, la musette attend l\'aube.' };
  const o = LG.musette[camp][k];
  if (!o) return { refus: 'Rien à cet emplacement de la musette.' };
  if (!(x >= zone.x0 && x < zone.x1 && y >= zone.y0 && y < zone.y1)) return { refus: 'Hors du secteur.' };
  return { ok: true, o };
}
export function utiliserObjet(B, camp, k, x, y, zone) {
  const p = peutUtiliserObjet(B, camp, k, x, y, zone);
  if (!p.ok) return p;
  const { etat } = B, O = OBJET[p.o], sens = camp === NOUS ? -1 : 1;
  etat.largages.musette[camp].splice(k, 1);
  for (const [cal, avance, delai, reste] of O.e.tirs) {
    etat.barrages.push({ camp, cal, x: Math.round(x * 10) / 10, y: Math.round((y + sens * avance) * 10) / 10, reste: reste ?? Math.round(CALIBRES[cal].salve), prochain: etat.temps + 1.5 + delai });
  }
  if (O.e.fil) couperFil(B, x, O.e.fil, camp, y);
  B.evenements.push({ type: 'objet-utilise', camp, o: O.id, x, y });
  return { ok: true, o: O.id };
}
