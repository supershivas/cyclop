/* La bataille : l'état d'une partie et ses règles. Logique pure (aucun DOM,
   aucune horloge, aucun hasard hors de la graine) : même graine, mêmes ordres, même
   bataille. Se teste dans Node (test/).

   Un pas = PAS s de jeu. Ordre des choses dans un pas : la grille de la foule,
   les obus (le terrain se creuse, des hommes meurent), en face (ses ordres), la
   foule (marche et tir), le retrait des morts, l'eau (quelques rangées de la
   passe horaire), le résumé du terrain pour les champs (une bande).

   Le jour dure `jour.duree` s (6 h → 18 h). À 18 h vient la nuit : l'eau des
   douze heures de nuit se calcule en lot, et la bataille attend l'aube
   (aube()). Après le dernier jour : la fin.

   La sauvegarde (photo) garde la graine, la liste compacte des impacts, l'état
   de la foule et les petites couches de logique ; jamais le relief : il se
   rejoue depuis la graine et les impacts (rejouerTerrain). */
import { createRng } from './lib/rng.js?v=0.3.1';
import { creerTerrain, impact, hydroLignes } from './terrain.js?v=0.3.1';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, tuerDans, effrayer, reposer, compacter, photoArmee, restaurerArmee, b64, deB64, DENSITE } from './army.js?v=0.3.1';
import { calculerCouts, creerCacheChamps, dimensionsCouts, BLOC } from './champs.js?v=0.3.1';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.3.1';
import { METEO, TRANSITIONS, PREVISION_JUSTE } from './data/meteo.js?v=0.3.1';
import { SECTEURS } from './data/secteur.js?v=0.3.1';
import { REGIMENTS } from './data/lexique.js?v=0.3.1';

export const PAS = 1 / 30;                 // s de jeu par pas
export const NOUS = 0, EUX = 1;
const VERSION = 1;

const ticksParHeure = R => Math.max(1, Math.round(R.jour.duree / (R.jour.heureFin - R.jour.heureDebut) / PAS));
const ticksParJour = R => ticksParHeure(R) * (R.jour.heureFin - R.jour.heureDebut);
const PERIODE_COUTS = R => Math.max(1, Math.round(R.foule.champPeriode / PAS));

// ─── Création ────────────────────────────────────────────────────────────

function chaineMeteo(rng, jours, pluieAuMoins) {
  const chaine = ['sec'];
  for (let d = 1; d < jours; d++) {
    const tr = TRANSITIONS[chaine[d - 1]];
    chaine.push(rng.weighted(Object.entries(tr).map(([v, w]) => ({ v, w }))));
  }
  // le lot minimal doit voir venir la boue : des jours de pluie garantis (pas le premier)
  let manque = pluieAuMoins - chaine.filter(m => m === 'pluie').length;
  for (let d = 1; d < jours && manque > 0; d++) if (chaine[d] !== 'pluie') { chaine[d] = 'pluie'; manque--; }
  const previsions = chaine.map((m, d) => {
    const vrai = chaine[d + 1];
    if (!vrai) return null;
    return rng() < PREVISION_JUSTE ? vrai : rng.pick(Object.keys(METEO));
  });
  return { chaine, previsions };
}

/* Une nouvelle bataille. opts : { secteur: 'essai', soldats: par camp } */
export function nouvelleBataille(graine, R, opts = {}) {
  const idSecteur = opts.secteur || 'essai';
  const S = SECTEURS[idSecteur];
  const parCamp = opts.soldats || S.soldats;
  const rng = createRng(graine);
  const { chaine, previsions } = chaineMeteo(rng.fork('meteo'), S.jours, S.pluieAuMoins);
  const etat = {
    v: VERSION, graine, secteur: idSecteur, parCamp,
    jour: 1, tickJour: 0, ticks: 0, phase: 'jour',
    meteo: chaine, previsions,
    impacts: [],                        // [jour, tickJour, x×10, y×10, calibre] : de quoi rejouer le relief
    hydro: { passe: 0, ligne: 0 },
    couts: { bande: 0, version: 1 },
    marges: { ...S.marges },            // le terrain déborde du secteur (zone())
    regiments: [], pertes: [0, 0], pertesJour: [[0, 0]], blesses: [0, 0],
    batteries: Object.fromEntries(NOMS_CALIBRES.map(c => [c, 0])),   // s de jeu (depuis l'aube du jour 1) où la batterie est prête
    barrages: [],
    ia: { barrage: R.ia.barrage * 0.5, offensive: R.ia.offensive },
    temps: 0,                           // s de jeu écoulées, nuits non comptées
    rng: 0,
  };
  const B = monter(etat, R);
  // Les régiments, côte à côte sur leur ligne
  const nReg = S.regiments, largeurReg = S.largeur / nReg, Z = zone(B);
  for (const camp of [NOUS, EUX]) {
    const ligne = Z.y0 + (camp === NOUS ? S.ligne.nous : S.ligne.eux);
    const base = Math.floor(parCamp / nReg);
    for (let r = 0; r < nReg; r++) {
      const effectif = base + (r < parCamp - base * nReg ? 1 : 0);
      const reg = {
        id: etat.regiments.length, camp,
        nom: camp === NOUS ? REGIMENTS[r % REGIMENTS.length] : null,
        effectif, initial: effectif, pertes: 0,
        ordre: null, depart: null,
      };
      reg.ordre = formation(reg, Z.x0 + (r + 0.5) * largeurReg, ligne, largeurReg, R);
      reg.depart = { ...reg.ordre };
      etat.regiments.push(reg);
      for (let k = 0; k < effectif; k++) {
        const p = placeInitiale(reg.ordre, k);
        ajouterSoldat(B.armee, p[0] + (rng() - 0.5) * 0.8, p[1] + (rng() - 0.5) * 0.8, camp, reg.id, k, rng(), B.armee.n);
      }
    }
  }
  etat.rng = rng.state;
  calculerCouts(B.terrain, R, B.couts, false);
  B.coutsNeufs.set(B.couts);
  return B;
}

function placeInitiale(o, slot) {
  const col = slot % o.cols, row = (slot - col) / o.cols;
  const lx = (col - (o.cols - 1) / 2) * o.esp, ly = row * o.esp;
  return [o.x - o.fy * lx - o.fx * ly, o.y + o.fx * lx - o.fy * ly];
}

// L'ordre d'un régiment : un point, un front (vers l'ennemi), une largeur
function formation(reg, x, y, largeurMax, R) {
  const esp = R.foule.espacement;
  const n = Math.max(1, reg.effectif);
  const cols = Math.max(1, Math.min(Math.ceil(Math.sqrt(n * R.foule.largeur)), Math.floor(largeurMax / esp)));
  return { x, y, fx: 0, fy: reg.camp === NOUS ? -1 : 1, cols, esp };
}

/* Le secteur de bataille dans le terrain : { x0, y0, x1, y1 } (mètres). Autour,
   des marges sans régiments : les ordres n'y vont pas. */
export function zone(B) {
  const S = SECTEURS[B.etat.secteur], m = B.etat.marges;
  return { x0: m.x, y0: m.y, x1: m.x + S.largeur, y1: m.y + S.hauteur };
}

// L'état plus ce qui se refait (terrain, foule, champs)
function monter(etat, R) {
  const S = SECTEURS[etat.secteur], m = etat.marges;
  const W = S.largeur + 2 * m.x, H = S.hauteur + 2 * m.y;
  // autant d'arbres dans les marges, à surface égale
  const arbres = Math.round(S.arbres * W * H / (S.largeur * S.hauteur));
  const terrain = creerTerrain(etat.graine, { largeur: W, hauteur: H, ox: m.x, oy: m.y, arbres }, R);
  const armee = creerArmee({ capacite: etat.parCamp * 2 + 16, W, H });
  const { bw, bh } = dimensionsCouts(terrain);
  return {
    etat, R, terrain, armee,
    couts: new Uint8Array(bw * bh), coutsNeufs: new Uint8Array(bw * bh),
    champs: creerCacheChamps(terrain, R),
    evenements: [],
  };
}

// ─── Les ordres (le joueur) : ils rendent une raison quand ils sont refusés ──

/* Marcher : les régiments choisis prennent place côte à côte autour de (x, y). */
export function ordonnerMarche(B, ids, x, y) {
  const { etat, R } = B;
  const S = SECTEURS[etat.secteur];
  if (etat.phase !== 'jour') return { refus: 'La nuit, les ordres attendent l\'aube.' };
  const regs = ids.map(id => etat.regiments[id]).filter(r => r && r.camp === NOUS && r.effectif > 0);
  if (!regs.length) return { refus: 'Aucun régiment choisi.' };
  const Z = zone(B);
  if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return { refus: 'Hors du secteur.' };
  const largeurReg = S.largeur / S.regiments;
  regs.sort((a, b) => a.ordre.x - b.ordre.x);
  const largeurs = regs.map(r => formation(r, 0, 0, largeurReg, R).cols * R.foule.espacement + 6);
  const total = largeurs.reduce((s, w) => s + w, 0);
  let cx = Math.max(Z.x0 + total / 2, Math.min(Z.x1 - total / 2, x)) - total / 2;
  regs.forEach((r, k) => {
    r.ordre = formation(r, cx + largeurs[k] / 2, Math.max(Z.y0 + 4, Math.min(Z.y1 - 4, y)), largeurReg, R);
    cx += largeurs[k];
    reattribuer(B, r);
  });
  return { ok: true, regiments: regs.map(r => r.id) };
}

/* Les places de la nouvelle formation aux vivants du régiment, sans qu'ils se
   croisent : rangés de gauche à droite (le long du front) en colonnes, puis
   d'avant en arrière dans chaque colonne. Déterministe (à égalité, l'indice). */
function reattribuer(B, reg) {
  const A = B.armee, o = reg.ordre;
  const ids = [];
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) ids.push(i);
  const lat = i => -A.x[i] * o.fy + A.y[i] * o.fx;          // le long du front
  const prof = i => -(A.x[i] * o.fx + A.y[i] * o.fy);        // vers l'arrière
  ids.sort((a, b) => lat(a) - lat(b) || a - b);
  const rangs = Math.ceil(ids.length / o.cols);
  for (let c = 0; c * rangs < ids.length; c++) {
    const col = ids.slice(c * rangs, (c + 1) * rangs).sort((a, b) => prof(a) - prof(b) || a - b);
    col.forEach((i, r) => { A.slot[i] = r * o.cols + c; });
  }
}

/* Un barrage d'artillerie autour de (x, y). */
export function ordonnerBarrage(B, cal, x, y, camp = NOUS) {
  const { etat } = B;
  const S = SECTEURS[etat.secteur];
  const C = CALIBRES[cal];
  void S;
  if (!C) return { refus: `Pas de batterie de ${cal}.` };
  if (etat.phase !== 'jour') return { refus: 'La nuit, les ordres attendent l\'aube.' };
  const Z = zone(B);
  if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return { refus: 'Hors du secteur.' };
  if (camp === NOUS) {
    const reste = etat.batteries[cal] - etat.temps;
    if (reste > 0) return { refus: `La batterie de ${cal} recharge : encore ${Math.ceil(reste)} s.` };
    etat.batteries[cal] = etat.temps + C.recharge;
  }
  etat.barrages.push({ camp, cal, x, y, reste: C.salve, prochain: etat.temps + 1.5 });
  return { ok: true };
}

// ─── Un pas ──────────────────────────────────────────────────────────────

/* Avance d'un pas. Rend la liste des événements du pas (impacts, morts) pour
   le rendu et le HUD. */
export function avancer(B) {
  const { etat, R, terrain: T, armee: A } = B;
  B.evenements = [];
  if (etat.phase !== 'jour') return B.evenements;
  const rng = createRng(etat.graine); rng.setState(etat.rng);
  const gel = !!METEO[etat.meteo[etat.jour - 1]].gel;
  etat.tickJour++; etat.ticks++;
  etat.temps = Math.round(etat.temps / PAS + 1) * PAS;
  // touché : il meurt (chance : gravite, ou s'il était déjà blessé), sinon il est blessé (bras, jambe, tête)
  const morts = [];
  const frapper = (i, cause, gravite) => {
    if (A.mort[i]) return;
    if (A.blessure[i] || rng() < gravite) {
      A.mort[i] = 1;
      const reg = etat.regiments[A.reg[i]];
      reg.pertes++; reg.effectif--;
      etat.pertes[A.camp[i]]++;
      etat.pertesJour[etat.jour - 1][A.camp[i]]++;
      morts.push(i);
      B.evenements.push({ type: 'mort', camp: A.camp[i], cause, x: A.x[i], y: A.y[i], id: A.id[i] });
    } else {
      const r = rng();
      A.blessure[i] = r < 0.4 ? 1 : r < 0.8 ? 2 : 3;
      etat.blesses[A.camp[i]]++;
      B.evenements.push({ type: 'blesse', camp: A.camp[i], cause, id: A.id[i] });
    }
  };
  const ctx = { T, R, regiments: etat.regiments, rng, dt: PAS, gel, frapper, champDe: r => champDe(B, r) };

  construireGrille(A);
  // les obus
  for (const b of etat.barrages) {
    const C = CALIBRES[b.cal];
    while (b.reste > 0 && etat.temps >= b.prochain) {
      const gx = (rng() + rng() + rng() - 1.5) * C.dispersion, gy = (rng() + rng() + rng() - 1.5) * C.dispersion;
      const x = Math.round((b.x + gx) * 10) / 10, y = Math.round((b.y + gy) * 10) / 10;
      b.prochain += 1 / C.cadence * (0.7 + rng() * 0.6);
      b.reste--;
      tomber(B, x, y, b.cal, ctx, gel);
    }
  }
  etat.barrages = etat.barrages.filter(b => b.reste > 0);
  enFace(B, rng);
  pasArmee(A, ctx);
  // un homme qui tombe fait peur à ceux qui sont à côté
  for (const i of morts) effrayer(A, A.x[i], A.y[i], 4, R.soldat.peurMort);
  if (compacter(A)) for (const reg of etat.regiments) if (reg.effectif <= 0) reg.effectif = 0;

  // l'eau : la passe horaire avance de quelques rangées
  avancerEau(B, etat.tickJour);
  // le résumé du terrain pour les champs : une bande de carrés par pas
  const { bh } = dimensionsCouts(T);
  const P = PERIODE_COUTS(R), parPas = Math.ceil(bh / P);
  const b0 = etat.couts.bande, b1 = Math.min(bh, b0 + parPas);
  calculerCoutsBande(B, b0, b1, gel);
  etat.couts.bande = b1;
  if (b1 >= bh) { B.couts.set(B.coutsNeufs); etat.couts.version++; etat.couts.bande = 0; }

  etat.rng = rng.state;
  // la fin du jour
  if (etat.tickJour >= ticksParJour(R)) {
    for (let p = 0; p < 12; p++) hydroLignes(T, 0, T.H, METEO[etat.meteo[etat.jour - 1]], R);
    etat.phase = etat.jour >= etat.meteo.length ? 'fin' : 'nuit';
    B.evenements.push({ type: etat.phase });
  }
  return B.evenements;
}

function tomber(B, x, y, cal, ctx, gel) {
  const { etat, terrain: T, R } = B;
  const n = etat.impacts.length;
  etat.impacts.push([etat.jour, etat.tickJour, Math.round(x * 10), Math.round(y * 10), NOMS_CALIBRES.indexOf(cal)]);
  const { rayon } = impact(T, x, y, cal, R, n, gel);
  tuerDans(B.armee, x, y, rayon, ctx);
  B.evenements.push({ type: 'impact', x, y, cal });
}

function avancerEau(B, tickJour) {
  const { etat, R, terrain: T } = B;
  const tph = ticksParHeure(R), m = METEO[etat.meteo[etat.jour - 1]];
  const passe = Math.floor(tickJour / tph), ligne = Math.floor((tickJour % tph) * T.H / tph);
  while (etat.hydro.passe < passe) {
    hydroLignes(T, etat.hydro.ligne, T.H, m, R);
    etat.hydro.passe++; etat.hydro.ligne = 0;
  }
  if (ligne > etat.hydro.ligne) { hydroLignes(T, etat.hydro.ligne, ligne, m, R); etat.hydro.ligne = ligne; }
}

function calculerCoutsBande(B, b0, b1, gel) {
  if (b1 <= b0) return;
  const { terrain: T, R } = B;
  // calculerCouts travaille sur tout le terrain : on lui passe une vue des rangées de la bande
  const { bw } = dimensionsCouts(T);
  const H = Math.min(T.H, b1 * BLOC) - b0 * BLOC;
  const vue = { ...T, H, base: T.base.subarray(b0 * BLOC * T.W), diff: T.diff.subarray(b0 * BLOC * T.W), eau: T.eau.subarray(b0 * BLOC * T.W), humid: T.humid.subarray(b0 * BLOC * T.W) };
  calculerCouts(vue, R, B.coutsNeufs.subarray(b0 * bw, b1 * bw), gel);
}

// Le champ de l'ordre d'un régiment (ou null : tout près, pas besoin)
function champDe(B, reg) {
  if (!reg.effectif) return null;
  return B.champs.champ(B.couts, B.etat.couts.version, reg.ordre.x, reg.ordre.y);
}

// ─── En face : des barrages sur nos hommes les plus serrés, et des avances ──
function enFace(B, rng) {
  const { etat, R, armee: A } = B;
  const S = SECTEURS[etat.secteur];
  if (etat.temps >= etat.ia.barrage) {
    etat.ia.barrage = etat.temps + R.ia.barrage * (0.6 + rng() * 0.8);
    const d = A.dens[NOUS];
    let best = -1, bn = 0;
    for (let b = 0; b < d.length; b++) if (d[b] > bn) { bn = d[b]; best = b; }
    if (best >= 0) {
      const bx = best % A.dw, by = (best - bx) / A.dw;
      const cal = rng.weighted([{ v: '75', w: 6 }, { v: '155', w: 3 }, { v: '220', w: 1 }]);
      ordonnerBarrage(B, cal, (bx + 0.5) * DENSITE + (rng() - 0.5) * 20, (by + 0.5) * DENSITE + (rng() - 0.5) * 20, EUX);
    }
  }
  if (etat.temps >= etat.ia.offensive) {
    etat.ia.offensive = etat.temps + R.ia.offensive * (0.7 + rng() * 0.6);
    const leurs = etat.regiments.filter(r => r.camp === EUX && r.effectif > r.initial * 0.4);
    if (leurs.length) {
      const reg = rng.pick(leurs);
      reg.ordre = { ...reg.ordre, y: Math.min(zone(B).y0 + S.ligne.nous - 40, reg.ordre.y + R.ia.avance) };
      reattribuer(B, reg);
    }
  }
  // un régiment d'en face trop éprouvé retourne à son départ
  for (const reg of etat.regiments) {
    if (reg.camp === EUX && reg.effectif && reg.effectif < reg.initial * 0.4 && reg.ordre.y !== reg.depart.y) {
      reg.ordre = { ...reg.depart }; reattribuer(B, reg);
    }
  }
}

/* L'aube : le jour suivant commence. */
export function aube(B) {
  const { etat } = B;
  if (etat.phase !== 'nuit') return { refus: 'Ce n\'est pas la nuit.' };
  etat.jour++; etat.tickJour = 0; etat.phase = 'jour';
  etat.hydro = { passe: 0, ligne: 0 };
  etat.pertesJour.push([0, 0]);
  reposer(B.armee, B.R);
  return { ok: true };
}

// ─── Lecture ─────────────────────────────────────────────────────────────

export function horloge(B) {
  const { etat, R } = B;
  const f = etat.tickJour / ticksParJour(R);
  const h = R.jour.heureDebut + f * (R.jour.heureFin - R.jour.heureDebut);
  return {
    jour: etat.jour, jours: etat.meteo.length, phase: etat.phase,
    heure: Math.floor(h), minute: Math.floor((h % 1) * 60),
    meteo: etat.meteo[etat.jour - 1], prevision: etat.previsions[etat.jour - 1],
    gel: !!METEO[etat.meteo[etat.jour - 1]].gel,
  };
}
export const effectifs = B => [NOUS, EUX].map(c => B.etat.regiments.filter(r => r.camp === c).reduce((s, r) => s + r.effectif, 0));

// ─── Sauvegarde ──────────────────────────────────────────────────────────

export function photo(B) {
  return {
    ...structuredClone(B.etat),
    armee: photoArmee(B.armee),
    coutsActuels: b64(B.couts), coutsNeufs: b64(B.coutsNeufs),
  };
}

export function restaurer(p, R) {
  const { armee, coutsActuels, coutsNeufs, ...reste } = structuredClone(p);
  const etat = reste;
  // une sauvegarde d'avant les marges (v0.2) : tout glisse de la largeur des marges
  const avantMarges = !etat.marges;
  if (avantMarges) {
    const m = etat.marges = { ...SECTEURS[etat.secteur].marges };
    for (const imp of etat.impacts) { imp[2] += m.x * 10; imp[3] += m.y * 10; }
    for (const r of etat.regiments) for (const o of [r.ordre, r.depart]) { o.x += m.x; o.y += m.y; }
    for (const b of etat.barrages) { b.x += m.x; b.y += m.y; }
    etat.couts = { bande: 0, version: (etat.couts?.version || 1) + 1 };
  }
  etat.blesses ??= [0, 0];
  const B = monter(etat, R);
  rejouerTerrain(B);
  restaurerArmee(B.armee, armee);
  if (avantMarges) {
    for (let i = 0; i < B.armee.n; i++) { B.armee.x[i] += etat.marges.x; B.armee.y[i] += etat.marges.y; }
    calculerCouts(B.terrain, R, B.couts, false);
    B.coutsNeufs.set(B.couts);
  } else {
    B.couts.set(deB64(coutsActuels, Uint8Array));
    B.coutsNeufs.set(deB64(coutsNeufs, Uint8Array));
  }
  return B;
}

/* Refait le relief, l'eau et les arbres depuis la graine et les impacts, pas
   à pas, dans le même ordre que la partie : impacts du pas, puis l'eau ; la
   nuit en lot. */
export function rejouerTerrain(B) {
  const { etat, R, terrain: T } = B;
  const tpj = ticksParJour(R);
  let k = 0;
  const imp = etat.impacts;
  for (let jour = 1; jour <= etat.jour; jour++) {
    const fin = jour < etat.jour ? tpj : etat.tickJour;
    const m = METEO[etat.meteo[jour - 1]];
    const sauve = { jour: etat.jour, hydro: etat.hydro };
    etat.jour = jour; etat.hydro = { passe: 0, ligne: 0 };
    for (let t = 1; t <= fin; t++) {
      while (k < imp.length && imp[k][0] === jour && imp[k][1] === t) {
        const [, , x10, y10, ci] = imp[k];
        impact(T, x10 / 10, y10 / 10, NOMS_CALIBRES[ci], R, k, !!m.gel);
        k++;
      }
      avancerEau(B, t);
    }
    etat.jour = sauve.jour; etat.hydro = sauve.hydro;
    if (jour < etat.jour || etat.phase !== 'jour') for (let p = 0; p < 12; p++) hydroLignes(T, 0, T.H, m, R);
  }
}

export { DENSITE };
