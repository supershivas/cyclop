/* La nuit et ses corvées (Jérôme, v0.6.0) : une par régiment — le repos,
   réparer sa tranchée, y poser des caillebotis, inhumer les morts, évacuer les
   blessés. Logique pure (aucun DOM, aucun hasard hors du générateur de la
   bataille), testée dans Node.

   - Les travaux de terrain (réparer, caillebotis) sont notés dans
     `etat.travaux` ([jour, sorte, tronçons…]) : la sauvegarde les rejoue après
     l'eau de la nuit, comme les impacts (rejouerTerrain).
   - Ce que coûte une corvée : un régiment qui travaille se repose moins ;
     inhumer au-delà de nos lignes, c'est risquer d'y rester ; un blessé qu'on
     n'évacue pas peut mourir dans la nuit ; les corps laissés autour d'un
     régiment pèsent sur son moral au matin.
   - En face fait ses corvées aussi (`choixEnFace`).
   - (v0.11.0) Les abris profonds (`etat.abris` : un niveau par tronçon, une nuit
     de travail chacun) ; les vivres (`reg.vivres`, en nuits : sans eux, la nuit
     repose moins et le moral baisse) ; le coup de main (des volontaires ramènent
     des prisonniers de la tranchée d'en face, s'ils reviennent). */
import { toucher } from './terrain.js?v=0.12.1';
import { hash2 } from './lib/rng.js?v=0.12.1';
import { CORVEES } from './data/corvees.js?v=0.12.1';
import { REGIMENTS } from './data/lexique.js?v=0.12.1';
import { ajouterSoldat } from './army.js?v=0.12.1';

export const SORTES = ['reparer', 'caillebotis'];          // les travaux de terrain, par leur numéro dans etat.travaux
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

// Un régiment peut-il faire cette corvée ? Rend la raison du refus, ou null.
export function refusCorvee(B, reg, id) {
  const c = corvee(id);
  if (!c) return 'Pas de telle corvée.';
  if (c.tranchee && !tronconsDe(B, reg).length) return `${reg.nom || 'Ce régiment'} ne tient pas de tranchée.`;
  if (id === 'releve' && !(B.etat.reserves?.[reg.camp] > 0)) return 'Plus un régiment en réserve.';
  if (id === 'abri' && tronconsDe(B, reg).every(k => (B.etat.abris[k] || 0) >= B.R.nuit.abriMax)) return 'Ses abris sont aussi profonds qu\'on peut les creuser.';
  if (id === 'coup' && !cibleDuCoup(B, reg)) return 'Personne en face à portée d\'un coup de main.';
  return null;
}

/* Un travail de terrain sur des tronçons : réparer (recreuser ce que les obus
   ont comblé) ou poser des caillebotis. Rend le nombre de cases changées. */
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
        else if (sorte === 'caillebotis' && !T.caille[c]) { T.caille[c] = 1; toucher(T, i, j); n++; }
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
// La cible d'un coup de main : le régiment ennemi le plus proche, à portée
export function cibleDuCoup(B, reg) {
  const c = centreDe(B, reg);
  if (!c) return null;
  let best = null, bd = B.R.nuit.coupPortee;
  for (const r of B.etat.regiments) {
    if (r.camp === reg.camp || !r.effectif) continue;
    const e = centreDe(B, r);
    const d = e ? Math.hypot(e.x - c.x, e.y - c.y) : Infinity;
    if (d < bd) { bd = d; best = r; }
  }
  return best;
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
      : reg.moral >= 0.6 && h < 0.15 ? 'coup'
      : tronconsDe(B, reg).length && h > 0.75 && !refusCorvee(B, reg, 'abri') ? 'abri' : 'repos';
    if (refusCorvee(B, reg, out[reg.id])) out[reg.id] = 'repos';
  }
  // la relève : le régiment le plus éprouvé (moins de la moitié de ses hommes), un par nuit, tant qu'il en reste en réserve
  const eprouves = B.etat.regiments.filter(r => r.camp === 1 && r.effectif && r.effectif < r.initial * 0.5).sort((a, b) => a.effectif / a.initial - b.effectif / b.initial || a.id - b.id);
  if (eprouves.length && B.etat.reserves?.[1] > 0) out[eprouves[0].id] = 'releve';
  return out;
}
/* Les corvées de la nuit. choix : { id du régiment : corvée } (nos régiments ;
   ceux d'en face choisissent seuls ; sans choix, le repos). ctx : { rng,
   mourir(i, cause, ou) }. Rend le bilan de la nuit pour chaque camp. */
export function corvees(B, choix, ctx) {
  const { etat, R, armee: A } = B;
  const N = R.nuit, { rng, mourir } = ctx;
  const tous = { ...choixEnFace(B), ...choix };
  const bilan = [0, 1].map(() => ({ inhumes: 0, evacues: 0, repares: 0, caillebotis: 0, abris: 0, ravitailles: 0, coups: 0, prisonniers: 0, pris: 0, mortsCorvee: 0, mortsBlesses: 0, affames: 0 }));
  const faite = {}, releves = [];
  // le centre de chaque régiment (là où sont ses hommes)
  const centres = etat.regiments.map(() => ({ x: 0, y: 0, n: 0 }));
  for (let i = 0; i < A.n; i++) { const c = centres[A.reg[i]]; c.x += A.x[i]; c.y += A.y[i]; c.n++; }
  for (const c of centres) if (c.n) { c.x /= c.n; c.y /= c.n; }
  const premiere = camp => B.lignes.find(L => L.camp === camp && L.rang === 0);

  for (const reg of etat.regiments) {
    if (!reg.effectif) continue;
    let id = tous[reg.id] || 'repos';
    if (refusCorvee(B, reg, id)) id = 'repos';
    faite[reg.id] = id;
    const b = bilan[reg.camp], ctr = centres[reg.id];
    if (id === 'reparer' || id === 'caillebotis') {
      const ks = tronconsDe(B, reg);
      if (travail(B, id, ks)) {
        etat.travaux.push([etat.jour, SORTES.indexOf(id), ...ks]);
        b[id === 'reparer' ? 'repares' : 'caillebotis'] += ks.length;
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
    } else if (id === 'coup') {
      coupDeMain(B, reg, ctx, bilan);
    } else if (id === 'releve') {
      // il quitte le front (blessés compris) ; son remplaçant entre à l'aube, après les autres corvées
      for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && !A.mort[i]) A.mort[i] = 1;
      reg.releve = etat.jour; reg.releves = reg.effectif; reg.effectif = 0;
      etat.reserves[reg.camp]--;
      releves.push(reg); b.releves = (b.releves || 0) + 1;
    } else if (id === 'evacuer') {
      for (let i = 0; i < A.n; i++) {
        if (A.reg[i] !== reg.id || A.mort[i] || !A.blessure[i]) continue;
        if (rng() < N.risqueBoyau) { mourir(i, 'corvée'); b.mortsCorvee++; continue; }
        A.mort[i] = 1; reg.effectif--;                 // il quitte le front, vivant
        etat.evacues.push([A.id[i], etat.jour]); b.evacues++;
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
  etat.nuits.push({ jour: etat.jour, choix: faite, bilan });
  return bilan;
}

/* Un coup de main : les volontaires (les plus aguerris, valides) vont dans la
   tranchée d'en face ; certains y restent, les autres ramènent des prisonniers.
   L'expérience les garde en vie et fait la prise ; un régiment d'en face au moral
   haut veille mieux. */
function coupDeMain(B, reg, ctx, bilan) {
  const { etat, R, armee: A } = B;
  const N = R.nuit, { rng, mourir, capturer } = ctx;
  const cible = cibleDuCoup(B, reg);
  if (!cible) return;
  const vol = [];
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && !A.mort[i] && !A.blessure[i]) vol.push(i);
  vol.sort((a, b) => A.exp[b] - A.exp[a] || a - b);
  vol.length = Math.min(vol.length, N.coupHommes, Math.ceil(reg.effectif / 5));
  if (!vol.length) return;
  const ou = centreDe(B, cible), veille = 0.5 + cible.moral;
  let prise = 0, exp = 0;
  for (const i of vol) {
    exp += A.exp[i];
    if (rng() < N.coupMort * (1 - 0.5 * A.exp[i]) * veille) { mourir(i, 'corvée', [ou.x + (rng() - 0.5) * 10, ou.y + (rng() - 0.5) * 4]); bilan[reg.camp].mortsCorvee++; continue; }
    A.exp[i] = Math.min(1, A.exp[i] + N.coupExp);
    prise += N.coupPrise * (1 + A.exp[i]) / veille;
  }
  let n = Math.floor(prise + rng());
  // les prisonniers : ceux d'en face les plus près de la tranchée qu'on visite (à son centre)
  const proies = [];
  for (let i = 0; i < A.n; i++) if (A.reg[i] === cible.id && !A.mort[i]) proies.push([Math.hypot(A.x[i] - ou.x, A.y[i] - ou.y), i]);
  proies.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  n = Math.min(n, proies.length);
  for (let k = 0; k < n; k++) capturer(proies[k][1]);
  bilan[reg.camp].coups++; bilan[reg.camp].prisonniers += n; bilan[cible.camp].pris += n;
  if (n) {
    reg.moral = Math.min(1, reg.moral + N.coupMoral);
    cible.moral = Math.max(0, cible.moral - N.coupMoral);
  }
}

/* Un régiment frais (la réserve) prend la place d'un régiment relevé : même ordre
   (sa tranchée), des hommes neufs qui arrivent par l'arrière. Ses numéros suivent
   ceux de tous les régiments déjà là (les noms et les grades en découlent). */
function relever(B, vieux, rng) {
  const { etat, R, armee: A } = B;
  const n = etat.parRegiment || vieux.initial;
  let premier = 0;
  for (const r of etat.regiments) premier += r.initial;
  const deNous = etat.regiments.filter(r => r.camp === 0).length;
  const reg = {
    id: etat.regiments.length, camp: vieux.camp,
    nom: vieux.camp === 0 ? REGIMENTS[deNous % REGIMENTS.length] : null,
    effectif: n, initial: n, pertes: 0, moral: R.moral.depart, deroute: false, vivres: R.nuit.vivres,
    ordre: structuredClone(vieux.ordre), depart: structuredClone(vieux.depart), arrive: etat.jour + 1,
  };
  etat.regiments.push(reg);
  // ils montent par les boyaux : à 12 m derrière la place qu'ils prennent (chez nous l'ennemi est au nord, l'arrière
  // au sud, les y plus grands ; en face, l'inverse). De 40 m derrière la dernière ligne, il leur fallait des minutes.
  const derriere = reg.ordre.y + (reg.camp === 0 ? 12 : -12);
  const t = reg.ordre.trace, x0 = t ? t.x0 : reg.ordre.x - 40, x1 = t ? t.x1 : reg.ordre.x + 40;
  for (let k = 0; k < n; k++) {
    const x = x0 + (k + 0.5) * (x1 - x0) / n;
    ajouterSoldat(A, x + (rng() - 0.5) * 2, Math.max(1, Math.min(B.terrain.H - 2, derriere + (rng() - 0.5) * 6)), reg.camp, reg.id, k, rng(), premier + k);
  }
}

// La sauvegarde : rejoue les travaux de terrain de la nuit du jour donné
export function rejouerTravaux(B, jour) {
  for (const t of B.etat.travaux) if (t[0] === jour) travail(B, SORTES[t[1]], t.slice(2));
}
