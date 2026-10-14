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
   - En face fait ses corvées aussi (`choixEnFace`). */
import { toucher } from './terrain.js?v=0.8.0';
import { CORVEES } from './data/corvees.js?v=0.8.0';

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

// Les corvées d'en face : évacuer s'il a des blessés, réparer si sa tranchée est comblée, sinon le repos
export function choixEnFace(B) {
  const A = B.armee, out = {};
  for (const reg of B.etat.regiments) {
    if (reg.camp !== 1 || !reg.effectif) continue;
    let blesses = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && A.blessure[i]) blesses++;
    out[reg.id] = blesses >= 5 ? 'evacuer' : combles(B, reg) >= 10 ? 'reparer' : 'repos';
  }
  return out;
}

/* Les corvées de la nuit. choix : { id du régiment : corvée } (nos régiments ;
   ceux d'en face choisissent seuls ; sans choix, le repos). ctx : { rng,
   mourir(i, cause, ou) }. Rend le bilan de la nuit pour chaque camp. */
export function corvees(B, choix, ctx) {
  const { etat, R, armee: A } = B;
  const N = R.nuit, { rng, mourir } = ctx;
  const tous = { ...choixEnFace(B), ...choix };
  const bilan = [0, 1].map(() => ({ inhumes: 0, evacues: 0, repares: 0, caillebotis: 0, mortsCorvee: 0, mortsBlesses: 0 }));
  const faite = {};
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
  // le repos : moins pour ceux qui ont travaillé
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    const repos = faite[A.reg[i]] === 'repos';
    const k = 1 - R.soldat.nuitRepos * (repos ? 1 : N.reposTravail);
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
    reg.moral = Math.max(0, reg.moral - Math.min(N.moralCorpsMax, n * N.moralCorps));
  }
  etat.nuits.push({ jour: etat.jour, choix: faite, bilan });
  return bilan;
}

// La sauvegarde : rejoue les travaux de terrain de la nuit du jour donné
export function rejouerTravaux(B, jour) {
  for (const t of B.etat.travaux) if (t[0] === jour) travail(B, SORTES[t[1]], t.slice(2));
}
