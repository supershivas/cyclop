/* La nuit et ses corvées (Jérôme, v0.6.0) : une par régiment — le repos,
   réparer sa tranchée, inhumer les morts, évacuer les blessés. Logique pure
   (aucun DOM, aucun hasard hors du générateur de la bataille), testée dans Node.

   - Les travaux de terrain (réparer) sont notés dans
     `etat.travaux` ([jour, sorte, tronçons…]) : la sauvegarde les rejoue après
     l'eau de la nuit, comme les impacts (rejouerTerrain).
   - Ce que coûte une corvée : un régiment qui travaille se repose moins ;
     inhumer au-delà de nos lignes, c'est risquer d'y rester ; un blessé qu'on
     n'évacue pas peut mourir dans la nuit ; les corps laissés autour d'un
     régiment pèsent sur son moral au matin.
   - En face fait ses corvées aussi (`choixEnFace`).
   - (v0.11.0) Les abris profonds (`etat.abris` : un niveau par tronçon, une nuit
     de travail chacun) ; les vivres (`reg.vivres`, en nuits : sans eux, la nuit
     repose moins et le moral baisse).
   - (v0.38.3) Les caillebotis et le coup de main sont retirés : sept corvées.
   - (v0.39.0) La mêlée se joue dans la nuit (`meleeNuit`) : un tronçon où les deux camps sont face à face au soir est tranché à l'aube, et les
     régiments au contact (`contactDe`) ne reçoivent aucune corvée. */
import { toucher } from './terrain.js?v=0.71.1';
import { hash2 } from './lib/rng.js?v=0.71.1';
import { CORVEES } from './data/corvees.js?v=0.71.1';
import { REGIMENTS } from './data/lexique.js?v=0.71.1';
import { ajouterSoldat, poserCaracs, lireCaracs } from './army.js?v=0.71.1';
import { departCaracs } from './identite.js?v=0.71.1';

export const SORTES = ['reparer'];          // les travaux de terrain, par leur numéro dans etat.travaux
export const corvee = id => CORVEES.find(c => c.id === id);

// Les tronçons de la tranchée qu'un régiment tient (sa ligne, sous son tracé)
export function tronconsDe(B, reg) {
  const t = reg.ordre.trace;
  if (!t) return [];
  const out = [];
  B.troncons.forEach((tr, k) => {
    const L = B.lignes[tr.ligne];
    if (L.camp * 10 + L.rang === t.ligne && tr.x1 > t.x0 && tr.x0 < t.x1) out.push(k);
  });
  return out;
}

/* Un régiment est-il dans une tranchée de l'autre camp ? (sa tranchée d'ordre est une ligne de l'autre camp). Il est loin de l'arrière : cent
   trente mètres à découvert le séparent de ses boyaux (Jérôme, v0.22.0). */
export function chezLEnnemi(B, reg) {
  const t = reg.ordre.trace;
  const L = t && B.lignes.find(l => l.camp * 10 + l.rang === t.ligne);
  return !!L && L.camp !== reg.camp;
}
// Ce qui lui manque pour qu'on lui amène ou qu'on lui reprenne quelque chose : la tranchée toute à lui, et personne d'en face tout près
function isolement(B, reg) {
  if (!tronconsDe(B, reg).every(k => B.etat.troncons[k] === reg.camp)) return 'la tranchée n\'est pas toute à nous';
  const c = centreDe(B, reg);
  if (c) for (const r of B.etat.regiments) {
    if (r.camp === reg.camp || !r.effectif) continue;
    const e = centreDe(B, r);
    if (e && Math.hypot(e.x - c.x, e.y - c.y) < B.R.nuit.calme) return 'un régiment d\'en face est trop près';
  }
  return null;
}

/* La mêlée de nuit (Jérôme, v0.39.0) : les hommes de chaque camp dans chaque tronçon, tels que le jour les a laissés. Un tronçon où les deux camps sont
   présents au soir est une mêlée en cours : elle ne s'arrête pas avec le soleil. */
function comptes(B) {
  const { terrain: T, armee: A } = B, n = B.etat.troncons.length, c = new Int32Array(n * 2);
  if (!n || !T.troncon) return c;
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    const t = T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)];
    if (t >= 0) c[t * 2 + A.camp[i]]++;
  }
  return c;
}
// Les régiments au contact de l'ennemi : un de leurs hommes est dans un tronçon disputé (la nuit seulement)
export function contactDe(B) {
  const regs = new Set();
  if (B.etat.phase !== 'nuit') return regs;
  const { terrain: T, armee: A } = B, c = comptes(B);
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    const t = T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)];
    if (t >= 0 && c[t * 2] && c[t * 2 + 1]) regs.add(A.reg[i]);
  }
  return regs;
}

// Un régiment peut-il faire cette corvée ? Rend la raison du refus, ou null.
export function refusCorvee(B, reg, id) {
  const c = corvee(id);
  if (!c) return 'Pas de telle corvée.';
  if (contactDe(B).has(reg.id)) return 'Au contact de l\'ennemi : il se bat toute la nuit.';
  if ((id === 'evacuer' || id === 'ravitailler') && chezLEnnemi(B, reg)) {
    const m = isolement(B, reg);
    if (m) return `Chez l'ennemi, ${id === 'evacuer' ? 'les blessés ne passent pas' : 'la soupe ne passe pas'} : ${m}.`;
  }
  if (c.tranchee && !tronconsDe(B, reg).length) return `${reg.nom || 'Ce régiment'} ne tient pas de tranchée.`;
  if (id === 'releve' && !(B.etat.reserves?.[reg.camp] > 0)) return 'Plus un régiment en réserve.';
  if (id === 'abri' && tronconsDe(B, reg).every(k => (B.etat.abris[k] || 0) >= B.R.nuit.abriMax)) return 'Ses abris sont aussi profonds qu\'on peut les creuser.';
  return null;
}

/* Un travail de terrain sur des tronçons : réparer (recreuser ce que les obus
   ont comblé). Rend le nombre de cases changées. */
export function travail(B, sorte, ks) {
  const T = B.terrain, prof = B.profondeur, W = T.W, set = new Set(ks);
  let n = 0;
  for (const k of ks) {
    const tr = B.troncons[k], L = B.lignes[tr.ligne];
    for (let j = Math.max(0, Math.floor(L.y0 - 8)); j < Math.min(T.H, Math.ceil(L.y0 + 8)); j++) {
      for (let i = Math.floor(tr.x0); i < Math.ceil(tr.x1); i++) {
        const c = j * W + i;
        if (!set.has(T.troncon[c])) continue;
        if (sorte === 'reparer' && T.diff[c] > -prof) { T.diff[c] = -prof; toucher(T, i, j); n++; }
      }
    }
  }
  if (sorte === 'reparer' && n) T.version++;
  return n;
}

// Les cases comblées de la tranchée d'un régiment (pour savoir s'il y a à réparer)
function combles(B, reg) {
  const T = B.terrain, prof = B.profondeur, ks = new Set(tronconsDe(B, reg));
  let n = 0;
  for (const k of ks) {
    const tr = B.troncons[k], L = B.lignes[tr.ligne];
    for (let j = Math.max(0, Math.floor(L.y0 - 8)); j < Math.min(T.H, Math.ceil(L.y0 + 8)); j++)
      for (let i = Math.floor(tr.x0); i < Math.ceil(tr.x1); i++) { const c = j * T.W + i; if (ks.has(T.troncon[c]) && T.diff[c] > -prof + 1) n++; }
  }
  return n;
}

// Le centre des hommes d'un régiment (null s'il n'en a plus)
function centreDe(B, reg) {
  const A = B.armee;
  let x = 0, y = 0, n = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && !A.mort[i]) { x += A.x[i]; y += A.y[i]; n++; }
  return n ? { x: x / n, y: y / n } : null;
}

// Les corvées d'en face : évacuer s'il a des blessés, réparer si sa tranchée est comblée, sinon le repos
export function choixEnFace(B) {
  const A = B.armee, out = {};
  for (const reg of B.etat.regiments) {
    if (reg.camp !== 1 || !reg.effectif) continue;
    let blesses = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && A.blessure[i]) blesses++;
    const n = B.R.nuit, h = hash2(reg.id, B.etat.jour, (B.etat.graine | 0) + 59);
    out[reg.id] = (reg.vivres ?? n.vivres) <= 1 ? 'ravitailler'
      : blesses >= 5 ? 'evacuer' : combles(B, reg) >= 10 ? 'reparer'
      : tronconsDe(B, reg).length && h > 0.75 && !refusCorvee(B, reg, 'abri') ? 'abri' : 'repos';
    if (refusCorvee(B, reg, out[reg.id])) out[reg.id] = 'repos';
  }
  // la relève : le régiment le plus éprouvé (moins de la moitié de ses hommes), un par nuit, tant qu'il en reste en réserve
  const eprouves = B.etat.regiments.filter(r => r.camp === 1 && r.effectif && r.effectif < r.initial * 0.5).sort((a, b) => a.effectif / a.initial - b.effectif / b.initial || a.id - b.id);
  if (eprouves.length && B.etat.reserves?.[1] > 0) out[eprouves[0].id] = 'releve';
  return out;
}
/* La mêlée se joue dans la nuit, avant les corvées. Chaque homme d'un tronçon disputé tombe avec la chance `nuit.meleeMort` × 2 × (leurs forces /
   toutes les forces) : à forces égales, `meleeMort` ; le plus faible y laisse bien plus que le plus fort. Puis la règle du jour (`prises` : au moins
   `prise` attaquants et `melee` fois les défenseurs) dit si le tronçon change de main ; sinon la mêlée est toujours là au matin. Sans tronçon disputé,
   aucun tirage : une nuit sans mêlée est celle d'avant au bit près. */
function meleeNuit(B, ctx, bilan) {
  const { etat, R, armee: A, terrain: T } = B, N = R.nuit, C = R.tranchee, { rng, mourir } = ctx;
  const compte = comptes(B);
  for (let t = 0; t < etat.troncons.length; t++) {
    if (!compte[t * 2] || !compte[t * 2 + 1]) continue;
    const dedans = [];
    for (let i = 0; i < A.n; i++) if (!A.mort[i] && T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] === t) dedans.push(i);
    for (const i of dedans) {
      const c = A.camp[i], siens = compte[t * 2 + c], leurs = compte[t * 2 + 1 - c];
      if (rng() < N.meleeMort * 2 * leurs / (siens + leurs)) { mourir(i, 'mêlée'); bilan[c].mortsMelee++; }
    }
    const tient = etat.troncons[t], autre = 1 - tient;
    let def = 0, att = 0;
    for (const i of dedans) if (!A.mort[i]) { if (A.camp[i] === tient) def++; else att++; }
    if (att < C.prise || (def && att < C.melee * def)) continue;
    // il change de main : les vainqueurs s'aguerrissent, leur régiment se reprend, ceux qui devaient le tenir le perdent
    etat.troncons[t] = autre; etat.melee[t] = 0;
    etat.prises[etat.jour - 1][autre]++;
    bilan[autre].prisNuit++; bilan[tient].perdusNuit++;
    const tr = B.troncons[t], L = B.lignes[tr.ligne], gagnants = new Set();
    for (const i of dedans) if (!A.mort[i] && A.camp[i] === autre) { A.exp[i] = Math.min(1, A.exp[i] + R.experience.prise); gagnants.add(A.reg[i]); }
    for (const reg of etat.regiments) {
      if (gagnants.has(reg.id)) reg.moral = Math.min(1, reg.moral + R.moral.prise);
      const o = reg.ordre.trace;
      if (reg.camp === tient && o && o.ligne === L.camp * 10 + L.rang && o.x1 > tr.x0 && o.x0 < tr.x1) reg.moral = Math.max(0, reg.moral - R.moral.perte);
    }
    B.evenements.push({ type: 'prise', camp: autre, troncon: t, x: (tr.x0 + tr.x1) / 2, y: L.y0 });
  }
}

/* Les corvées de la nuit. choix : { id du régiment : corvée } (nos régiments ;
   ceux d'en face choisissent seuls ; sans choix, le repos). ctx : { rng,
   mourir(i, cause, ou) }. Rend le bilan de la nuit pour chaque camp. */
export function corvees(B, choix, ctx) {
  const { etat, R, armee: A } = B;
  const N = R.nuit, { rng, mourir } = ctx;
  const tous = etat.deux ? { ...choix } : { ...choixEnFace(B), ...choix };      // (à deux, chaque joueur choisit pour ses régiments ; sans choix, le repos)
  const bilan = [0, 1].map(() => ({ inhumes: 0, evacues: 0, repares: 0, abris: 0, ravitailles: 0, mortsCorvee: 0, mortsBlesses: 0, affames: 0, retours: 0, mortsMelee: 0, prisNuit: 0, perdusNuit: 0 }));
  const faite = {}, releves = [];
  const contact = contactDe(B);                    // (avant la mêlée : ceux qui se battent cette nuit)
  meleeNuit(B, ctx, bilan);
  // le centre de chaque régiment (là où sont ses hommes)
  const centres = etat.regiments.map(() => ({ x: 0, y: 0, n: 0 }));
  for (let i = 0; i < A.n; i++) { const c = centres[A.reg[i]]; c.x += A.x[i]; c.y += A.y[i]; c.n++; }
  for (const c of centres) if (c.n) { c.x /= c.n; c.y /= c.n; }
  const premiere = camp => B.lignes.find(L => L.camp === camp && L.rang === 0);

  for (const reg of etat.regiments) {
    if (!reg.effectif) continue;
    let id = tous[reg.id] || 'repos';
    if (contact.has(reg.id)) id = 'contact';        // au contact : ni corvée ni vrai repos
    else if (refusCorvee(B, reg, id)) id = 'repos';
    faite[reg.id] = id;
    const b = bilan[reg.camp], ctr = centres[reg.id];
    if (id === 'reparer') {
      const ks = tronconsDe(B, reg);
      if (travail(B, id, ks)) {
        etat.travaux.push([etat.jour, SORTES.indexOf(id), ...ks]);
        b.repares += ks.length;
      }
    } else if (id === 'inhumer') {
      // les corps les plus proches, autant que les hommes en peuvent porter
      const r2 = N.rayonInhumer ** 2, L1 = premiere(reg.camp);
      const proches = [];
      etat.corps.forEach((c, k) => { const d = (c[0] / 10 - ctr.x) ** 2 + (c[1] / 10 - ctr.y) ** 2; if (d < r2) proches.push([d, k]); });
      proches.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const pris = new Set(proches.slice(0, Math.floor(reg.effectif * N.inhumerParHomme)).map(p => p[1]));
      const dehors = [];
      etat.corps = etat.corps.filter((c, k) => {
        if (!pris.has(k)) return true;
        etat.tombes.push([...c, etat.jour]);
        if (L1 && (c[1] / 10 - L1.y0) * L1.face > 3) dehors.push(c);
        return false;
      });
      b.inhumes += pris.size;
      // au-delà de nos lignes, on y reste parfois
      if (dehors.length) {
        const p = N.risqueDehors * Math.min(1, dehors.length / 10);
        for (let i = 0; i < A.n; i++) {
          if (A.reg[i] !== reg.id || A.mort[i] || rng() >= p) continue;
          const c = dehors[Math.floor(rng() * dehors.length)];
          mourir(i, 'corvée', [c[0] / 10, c[1] / 10]); b.mortsCorvee++;
        }
      }
    } else if (id === 'abri') {
      // un niveau de plus sous chacun de ses tronçons (on creuse sous le parapet, à six ou huit mètres)
      for (const k of tronconsDe(B, reg)) if ((etat.abris[k] || 0) < N.abriMax) { etat.abris[k] = (etat.abris[k] || 0) + 1; b.abris++; }
    } else if (id === 'ravitailler') {
      // la soupe et le pain montent par les boyaux ; on y laisse parfois un homme
      for (let i = 0; i < A.n; i++) {
        if (A.reg[i] !== reg.id || A.mort[i] || rng() >= N.risqueBoyau) continue;
        mourir(i, 'corvée'); b.mortsCorvee++;
      }
      reg.vivres = N.vivres + 1;      // la nuit qui vient en mange une
      b.ravitailles++;
    } else if (id === 'releve') {
      // il quitte le front (blessés compris) ; son remplaçant entre à l'aube, après les autres corvées
      for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && !A.mort[i]) { etat.releves.push([A.id[i], reg.id, A.exp[i], A.victimes[i], lireCaracs(A, i).slice(0, 4)]); A.mort[i] = 1; }
      reg.releve = etat.jour; reg.releves = reg.effectif; reg.effectif = 0;
      etat.reserves[reg.camp]--;
      releves.push(reg); b.releves = (b.releves || 0) + 1;
    } else if (id === 'evacuer') {
      for (let i = 0; i < A.n; i++) {
        if (A.reg[i] !== reg.id || A.mort[i] || !A.blessure[i]) continue;
        if (rng() < N.risqueBoyau) { mourir(i, 'corvée'); b.mortsCorvee++; continue; }
        A.mort[i] = 1; reg.effectif--;                 // il quitte le front, vivant
        // [numéro, jour, blessure, nuit du retour (0 : pas encore, -1 : ne reviendra pas), régiment, expérience, victimes]
        etat.evacues.push([A.id[i], etat.jour, A.blessure[i], 0, reg.id, Math.round(A.exp[i] * 100) / 100, A.victimes[i], lireCaracs(A, i)]); b.evacues++;
      }
      reg.moral = Math.min(1, reg.moral + N.moralEvacuer);
    }
  }
  // les blessés laissés au front : certains ne passent pas la nuit
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i] || !A.blessure[i]) continue;
    if (rng() < N.mortBlesse * (A.blessure[i] === 3 ? 2 : 1)) { mourir(i, 'blessure'); bilan[A.camp[i]].mortsBlesses++; }
  }
  // les vivres : une nuit de moins ; qui n'en a plus a faim
  const faim = new Set();
  for (const reg of etat.regiments) {
    if (!reg.effectif) continue;
    reg.vivres = Math.max(0, (reg.vivres ?? N.vivres) - 1);
    if (!reg.vivres) { faim.add(reg.id); bilan[reg.camp].affames++; }
  }
  // le repos : moins pour ceux qui ont travaillé, et pour ceux qui ont faim
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    const repos = faite[A.reg[i]] === 'repos';
    const k = 1 - R.soldat.nuitRepos * (repos ? 1 : N.reposTravail) * (faim.has(A.reg[i]) ? N.faimRepos : 1);
    A.fatJ[i] *= k; A.fatB[i] *= k; A.peur[i] *= repos ? 0.5 : 0.7;
    A.exp[i] = Math.min(1, A.exp[i] + R.experience.nuit);
  }
  // le moral : la nuit en rend une part (le repos un peu plus), jamais tout ; les corps laissés autour pèsent
  const r2 = N.rayonCorps ** 2;
  for (const reg of etat.regiments) {
    if (!reg.effectif) continue;
    const plafond = 1 - R.moral.cicatrice * reg.pertes / reg.initial;
    const part = R.moral.nuit + (faite[reg.id] === 'repos' ? N.moralRepos : 0);
    if (reg.moral < plafond) reg.moral += (plafond - reg.moral) * part;
    const ctr = centres[reg.id];
    let n = 0;
    for (const c of etat.corps) if ((c[0] / 10 - ctr.x) ** 2 + (c[1] / 10 - ctr.y) ** 2 < r2) n++;
    reg.moral = Math.max(0, reg.moral - Math.min(N.moralCorpsMax, n * N.moralCorps) - (faim.has(reg.id) ? N.faimMoral : 0));
  }
  // la relève entre : un régiment frais à la place de chaque régiment relevé, qui arrive de l'arrière
  for (const vieux of releves) relever(B, vieux, rng);
  retours(B, rng, bilan);
  etat.nuits.push({ jour: etat.jour, choix: faite, bilan });
  return bilan;
}

/* Les blessés évacués qui reviennent (Jérôme, v0.18.0) : une chance sur deux (`nuit.retourChance`), après autant de nuits que la
   blessure en demande (`nuit.retourNuits` : un bras 1, une jambe 2, la tête 3). Ils reprennent leur place (même numéro, même
   expérience) dans leur régiment, par l'arrière, comme la relève ; un régiment relevé ou disparu ne les reprend pas. Le tirage
   vient d'un hachage (graine, numéro, jour) : il ne dépend pas de l'ordre des corvées. */
function retours(B, rng, bilan) {
  const { etat, R, armee: A } = B, N = R.nuit;
  for (const e of etat.evacues) {
    if (e.length < 6 || e[3] !== 0) continue;                     // (avant la v0.18.0 : ni blessure ni régiment, ils ne reviennent pas)
    if (etat.jour - e[1] < (N.retourNuits[e[2]] ?? 1)) continue;
    const reg = etat.regiments[e[4]];
    if (hash2(etat.graine | 0, e[0], 97 + e[1]) >= N.retourChance || !reg || reg.effectif <= 0) { e[3] = -1; continue; }
    // il remonte par les boyaux : à 12 m derrière la place de son régiment
    const t = reg.ordre.trace, x0 = t ? t.x0 : reg.ordre.x - 40, x1 = t ? t.x1 : reg.ordre.x + 40;
    let slot = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) slot = Math.max(slot, A.slot[i] + 1);
    const derriere = reg.ordre.y + (reg.camp === 0 ? 12 : -12);
    const i = ajouterSoldat(A, x0 + rng() * (x1 - x0), Math.max(1, Math.min(B.terrain.H - 2, derriere + (rng() - 0.5) * 6)), reg.camp, reg.id, slot, rng(), e[0]);
    if (i < 0) continue;
    A.exp[i] = e[5]; A.victimes[i] = e[6] ?? 0;
    if (e[7]) poserCaracs(A, i, e[7]);                           // il revient avec ce qu'il avait appris (ses caractéristiques de l'évacuation)
    reg.effectif++; e[3] = etat.jour; bilan[reg.camp].retours++;
  }
}

/* Un régiment frais (la réserve) prend la place d'un régiment relevé : même ordre
   (sa tranchée), des hommes neufs qui arrivent par l'arrière. Ses numéros suivent
   ceux de tous les régiments déjà là (les noms et les grades en découlent). */
function relever(B, vieux, rng) {
  const { etat, R, armee: A } = B;
  const n = (vieux.camp === 0 ? etat.parRegiment : etat.parRegimentEux ?? etat.parRegiment) || vieux.initial;
  let premier = 0;
  for (const r of etat.regiments) premier += r.initial;
  const deNous = etat.regiments.filter(r => r.camp === 0).length;
  const reg = {
    id: etat.regiments.length, camp: vieux.camp,
    nom: vieux.camp === 0 ? (REGIMENTS.find(n => !etat.regiments.some(r => r.nom === n)) ?? REGIMENTS[deNous % REGIMENTS.length]) : null,   // le premier nom du lexique encore libre (en campagne, les noms de départ ne sont plus les huit premiers)
    effectif: n, initial: n, pertes: 0, moral: R.moral.depart, deroute: false, vivres: R.nuit.vivres, stance: 'volonte',
    ordre: structuredClone(vieux.ordre), depart: structuredClone(vieux.depart), arrive: etat.jour + 1,
  };
  etat.regiments.push(reg);
  // ils montent par les boyaux : à 12 m derrière la place qu'ils prennent (chez nous l'ennemi est au nord, l'arrière
  // au sud, les y plus grands ; en face, l'inverse). De 40 m derrière la dernière ligne, il leur fallait des minutes.
  const derriere = reg.ordre.y + (reg.camp === 0 ? 12 : -12);
  const t = reg.ordre.trace, x0 = t ? t.x0 : reg.ordre.x - 40, x1 = t ? t.x1 : reg.ordre.x + 40;
  for (let k = 0; k < n; k++) {
    const x = x0 + (k + 0.5) * (x1 - x0) / n;
    const i = ajouterSoldat(A, x + (rng() - 0.5) * 2, Math.max(1, Math.min(B.terrain.H - 2, derriere + (rng() - 0.5) * 6)), reg.camp, reg.id, k, rng(), premier + k);
    if (etat.numeros && reg.camp === 0) etat.numeros[premier + k] = etat.prochainNumero++;     // (campagne : un numéro neuf, jamais celui d'un vétéran)
    if (i >= 0) poserCaracs(A, i, departCaracs(etat.graine, reg.camp, premier + k, k, n, reg.id));
  }
}

// La sauvegarde : rejoue les travaux de terrain de la nuit du jour donné
export function rejouerTravaux(B, jour) {
  for (const t of B.etat.travaux) if (t[0] === jour) travail(B, SORTES[t[1]], t.slice(2));
}
