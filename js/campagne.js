/* La campagne : trois batailles reliées par des hommes nommés (Jérôme, cadrage v0.36.3 ; lot 2 : le registre). Logique pure (aucun DOM,
   aucune horloge, aucun hasard hors d'un hachage), testée dans Node. Le registre d'une campagne est une donnée à part, hors de l'état
   d'une bataille : il vit dans `cyclopeen:campagne` (js/lib/save.js) et ne garde que des nombres et des noms de régiments, jamais une
   identité à re-dériver : un homme est son numéro, son rang, son expérience et ses victimes ; son nom vient de `graineIdentite`.
   Il est écrit à la fin de chaque bataille, avant l'écran de fin (`cloturerDansLeStore`), et `cloturer` est idempotente : relire une
   partie arrêtée à la fin, ou clore deux fois, donne le même registre. Rien n'est reporté de la fatigue, de la peur ni du moral. */
import { hash2 } from './lib/rng.js?v=0.83.2';
import { NOUS, rangDe, numeroCampagne } from './bataille.js?v=0.83.2';
import { SECTEURS } from './data/secteur.js?v=0.83.2';
import { identite, chevrons } from './identite.js?v=0.83.2';
import { lireCaracs } from './army.js?v=0.83.2';
import { CAMPAGNE, TEXTES } from './data/campagne.js?v=0.83.2';

export const CLE = 'campagne';        // l'entrée de js/lib/save.js (cyclopeen:campagne)
export const VERSION_CAMPAGNE = 1;

// La graine de la n-ième bataille (terrain, météo, tirages) : un hachage de la graine d'identité, donc le même plan pour la même campagne.
const graineDe = (graineIdentite, n) => Math.floor(hash2(graineIdentite | 0, 100 + n, 17) * 100000);

/* Une campagne neuve. `graineIdentite` fait aussi son numéro : deux campagnes de même graine sont la même. */
export function nouvelleCampagne(graineIdentite, plan = CAMPAGNE) {
  return {
    id: graineIdentite, graineIdentite, longueur: plan.longueur, regimentsMin: plan.regimentsMin, hommesMin: plan.hommesMin,
    batailles: [],            // une entrée par bataille close (voir `cloturer`)
    prochainNumero: 0,        // le prochain numéro de campagne à donner à une recrue (les numéros ne servent jamais deux fois)
    statut: 'en cours',       // 'en cours' | 'terminee' | 'effondree'
  };
}

/* Nos régiments pour la bataille suivante, au nombre de `nReg` : les plus fournis reprennent leur place, les autres versent leurs hommes
   (les plus aguerris d'abord) aux places vides du régiment le plus clairsemé ; ce qui ne tient pas nulle part est perdu. Ce « fusionner »
   automatique est celui du lot 3 ; le papier de réorganisation (lot 4) le remplacera par un choix. Déterministe : à égalité, l'ordre du registre. */
export function reconstituer(regiments, nReg, parRegiment, journal = null) {
  const ordre = regiments.map((r, i) => ({ r, i })).sort((a, b) => b.r.survivants.length - a.r.survivants.length || a.i - b.i);
  const gardes = ordre.slice(0, nReg).sort((a, b) => a.i - b.i).map(({ r }) => ({ nom: r.nom, survivants: [...r.survivants] }));
  const donneur = new Map(ordre.slice(nReg).flatMap(({ r }) => r.survivants.map(h => [h[0], r.nom])));       // d'où vient chacun (pour le journal)
  const reste = ordre.slice(nReg).flatMap(({ r }) => r.survivants).sort((a, b) => b[2] - a[2] || a[0] - b[0]);
  for (const h of reste) {
    let cible = null;
    for (const g of gardes) if (g.survivants.length < parRegiment && (!cible || g.survivants.length < cible.survivants.length)) cible = g;
    if (!cible) { if (journal) journal.perdus++; continue; }
    cible.survivants.push(h);
    if (journal) { const de = donneur.get(h[0]); const f = journal.fusions.find(x => x.de === de && x.vers === cible.nom); if (f) f.hommes++; else journal.fusions.push({ de, vers: cible.nom, hommes: 1 }); }
  }
  if (journal) journal.dissous = ordre.slice(nReg).map(({ r }) => r.nom);
  return gardes;
}

/* La prochaine bataille à jouer : { n, graine, graineIdentite, secteur, mission, campagne, opts }, où `opts` se donne tel quel à
   `nouvelleBataille(graine, R, opts)` (avec `jours`, `soldats` s'il faut). Rien si la campagne est finie. */
export function suivante(c, plan = CAMPAGNE) {
  if (c.statut !== 'en cours') return null;
  const n = c.batailles.length + 1, P = plan.batailles[n - 1];
  if (!P) return null;
  const S = SECTEURS[P.secteur], graine = graineDe(c.graineIdentite, n), campagne = { id: c.id, n };
  const derniere = c.batailles[n - 2];
  const mission = P.mission ?? (derniere?.issue?.reussie ? plan.missionSelonIssue.reussie : plan.missionSelonIssue.manquee);   // (la 1re est donnée ; les autres suivent l'issue de la précédente)
  const troupes = derniere ? { regiments: reconstituer(derniere.regiments, S.regiments, Math.floor(S.soldats / S.regiments)), prochainNumero: c.prochainNumero } : null;
  const opts = {
    secteur: P.secteur, mission, graineIdentite: c.graineIdentite, campagne, troupes,
    soldatsEux: Math.round(S.soldats / (P.forces ?? 1)), iaRythme: P.ia ?? null,
  };
  if (P.saison) opts.saison = P.saison;                   // imposée par l'étape, dès la génération du terrain
  if (P.jours) opts.jours = P.jours;                      // sinon la durée du secteur (10 à 15 jours, tirée de la graine)
  return { n, graine, graineIdentite: c.graineIdentite, secteur: P.secteur, mission, campagne, opts };
}

/* Ceux de chez nous qui ont survécu à la bataille, par régiment : [[numéro, rang, expérience, victimes], …]. Les vivants (blessés compris :
   la blessure ne passe pas), les évacués qui n'ont pas encore fini de revenir et ceux d'un régiment relevé, qui ont quitté le front
   vivants. Ne comptent pas : les morts, les évacués qui ne reviendront pas (« disparus du front »). */
function survivants(B) {
  const { etat, armee: A } = B;
  const out = new Map(etat.regiments.filter(r => r.camp === NOUS).map(r => [r.id, new Map()]));
  const ajouter = (reg, id, exp, victimes, carac) => {            // id : le numéro de bataille ; le registre garde le numéro de campagne
    const m = out.get(reg), numero = numeroCampagne(etat, id);
    if (m && !m.has(numero)) m.set(numero, [numero, rangDe(B, id, reg), exp, victimes, carac]);
  };
  for (let i = 0; i < A.n; i++) if (A.camp[i] === NOUS && !A.mort[i]) ajouter(A.reg[i], A.id[i], A.exp[i], A.victimes[i], lireCaracs(A, i).slice(0, 4));
  const enRoute = new Map();                                // par régiment : combien reviennent encore du poste de secours
  for (const e of etat.evacues) if (e.length >= 6 && e[3] === 0) { ajouter(e[4], e[0], e[5], e[6] ?? 0, e[7]?.slice(0, 4)); enRoute.set(e[4], (enRoute.get(e[4]) ?? 0) + 1); }
  for (const e of etat.releves ?? []) ajouter(e[1], e[0], e[2], e[3], e[4]);
  return etat.regiments.filter(r => r.camp === NOUS).map(r => ({
    nom: r.nom, depart: r.initial, enRoute: enRoute.get(r.id) ?? 0, survivants: [...out.get(r.id).values()].sort((a, b) => a[0] - b[0]),
  }));
}

/* Nos morts de la bataille, du premier au dernier : [numéro de campagne, jour, nom du régiment]. Le régiment se retrouve comme `quiEst` : les numéros de bataille sont
   contigus, régiment après régiment. */
function tombes(B) {
  const { etat } = B, bornes = []; let p = 0;
  for (const r of etat.regiments) { bornes.push([p += r.initial, r]); }
  return etat.corps.filter(m => m[2] === NOUS).map(m => [numeroCampagne(etat, m[4]), m[3], bornes.find(([fin]) => m[4] < fin)?.[1].nom ?? null]);
}

/* Clôt la bataille n de la campagne : rend la campagne avec cette bataille au registre, et son nouveau statut. Idempotente (même
   bataille déjà au registre : la campagne est rendue telle quelle). Une bataille qui n'est pas finie, ou d'une autre campagne, est
   une erreur de programmation, pas un ordre du joueur. */
export function cloturer(c, B) {
  const { etat } = B, ref = etat.campagne;
  if (!ref || ref.id !== c.id) throw new Error('cloturer : cette bataille n\'est pas de cette campagne');
  if (etat.phase !== 'fin') throw new Error('cloturer : la bataille n\'est pas finie');
  if (c.batailles[ref.n - 1]) return c;
  if (c.batailles.length !== ref.n - 1) throw new Error(`cloturer : la bataille ${ref.n} ne suit pas la ${c.batailles.length}e`);
  const regiments = survivants(B);
  const entree = {
    n: ref.n, graine: etat.graine, secteur: etat.secteur, mission: etat.mission, jours: etat.jour,
    issue: etat.issue ? { reussie: etat.issue.reussie, texte: etat.issue.texte } : null,
    pertes: [...etat.pertes], regiments,
    tombes: tombes(B),                         // nos morts : [numéro de campagne, jour, régiment] (les noms se refont de la graine d'identité : `memorial`)
  };
  const debout = regiments.filter(r => r.survivants.length >= (c.hommesMin ?? 1)).length;
  // le compteur de campagne passe devant tous les numéros que nos hommes ont portés dans cette bataille (vivants ou morts)
  let prochainNumero = c.prochainNumero ?? 0, p = 0;
  for (const r of etat.regiments) { if (r.camp === NOUS) for (let id = p; id < p + r.initial; id++) prochainNumero = Math.max(prochainNumero, numeroCampagne(etat, id) + 1); p += r.initial; }
  const statut = debout < c.regimentsMin ? 'effondree' : ref.n >= c.longueur ? 'terminee' : 'en cours';
  return { ...c, batailles: [...c.batailles, entree], statut, prochainNumero };
}

/* Le chemin du jeu : à la fin d'une bataille de campagne, lit le registre, clôt, écrit. `store` est celui de js/lib/save.js. Rend la
   campagne écrite, ou null si la bataille n'est pas de campagne. */
export function cloturerDansLeStore(store, B) {
  const ref = B.etat.campagne;
  if (!ref) return null;
  const c = store.load(CLE);
  if (!c || c.id !== ref.id) return null;
  const suite = cloturer(c, B);
  if (suite !== c) store.save(CLE, suite);
  return suite;
}

/* Ce que le papier de campagne montre entre deux batailles (lot 4 : « voir et valider », Jérôme) : la bataille qui vient de finir, puis,
   pour la suivante, chaque régiment tel que la reconstitution le fera (vétérans, recrues, expérience, qui le commande), les fusions
   (de qui vers qui), les régiments dissous et ce qui ne tient nulle part. Aucune décision à prendre : la règle de `reconstituer` s'applique,
   le joueur lit et lance. Rien si la campagne est finie. */
export function passage(c, plan = CAMPAGNE) {
  const s = suivante(c, plan), derniere = c.batailles.at(-1);
  if (!s || !derniere) return null;
  const S = SECTEURS[s.secteur], parRegiment = Math.floor(S.soldats / S.regiments), effectif = r => parRegiment + (r < S.soldats - parRegiment * S.regiments ? 1 : 0);   // (les premiers régiments ont un homme de plus)
  const journal = { fusions: [], dissous: [], perdus: 0 };
  const troupes = reconstituer(derniere.regiments, S.regiments, parRegiment, journal);
  const enRoute = new Map(derniere.regiments.map(r => [r.nom, r.enRoute ?? 0]));
  const recus = new Map();
  for (const f of journal.fusions) recus.set(f.vers, (recus.get(f.vers) ?? 0) + f.hommes);
  const regiments = troupes.map((t, r) => {
    const plein = effectif(r), vieux = [...t.survivants].sort((a, b) => a[1] - b[1] || b[2] - a[2] || a[0] - b[0]).slice(0, plein), chef = vieux[0];
    const exp = vieux.reduce((x, h) => x + h[2], 0) / plein;
    return {
      nom: t.nom, veterans: vieux.length, recrues: plein - vieux.length, exp, chevrons: chevrons(exp),
      enRoute: enRoute.get(t.nom) ?? 0, fusionnes: recus.get(t.nom) ?? 0, neuf: vieux.length === 0,
      commandant: chef ? { ...(({ prenom, nom, age }) => ({ prenom, nom, age }))(identite(c.graineIdentite, NOUS, chef[0], 0, parRegiment)), ancien: identite(c.graineIdentite, NOUS, chef[0], 99, parRegiment, chef[1]).grade, promu: chef[1] > 0, numero: chef[0] } : null,
    };
  });
  return {
    n: s.n, secteur: s.secteur, mission: s.mission, jours: s.opts.jours ?? null, forces: [S.soldats, s.opts.soldatsEux],
    derniere: { n: derniere.n, secteur: derniere.secteur, jours: derniere.jours, issue: derniere.issue, pertes: derniere.pertes },
    regiments, fusions: journal.fusions, dissous: journal.dissous, perdus: journal.perdus, parRegiment,
  };
}

/* La fin de la campagne, en faits (lot 6 : sans fanfare) : bataille par bataille ce qu'elle a coûté, les noms de ceux qui sont tombés et de ceux qui sont restés. Les noms
   sont tirés de la graine d'identité de la campagne, comme dans la bataille : ce sont des chaînes ici, qu'un Mémorial gardera telles quelles. Rien n'est compté en tête : aucun
   total, aucun classement. */
export function bilan(c) {
  const nom = numero => { const q = identite(c.graineIdentite, NOUS, numero); return { prenom: q.prenom, nom: q.nom }; };
  const batailles = c.batailles.map(b => ({
    n: b.n, secteur: b.secteur, jours: b.jours, issue: b.issue, tombes: b.tombes.length,
    survivants: b.regiments.reduce((t, r) => t + r.survivants.length, 0),
  }));
  const tombesNoms = c.batailles.flatMap(b => b.tombes.map(([numero, jour, regiment]) => ({ ...nom(numero), numero, regiment, jour, bataille: b.n, secteur: b.secteur })));
  // restés : les survivants de la dernière bataille qui l'étaient de toutes les autres (ils y étaient donc depuis le début)
  const dernier = c.batailles.at(-1), vus = c.batailles.slice(0, -1).map(b => new Set(b.regiments.flatMap(r => r.survivants.map(s => s[0]))));
  const restes = dernier ? dernier.regiments.flatMap(r => r.survivants.filter(s => vus.every(v => v.has(s[0]))).map(s => ({ ...nom(s[0]), numero: s[0], regiment: r.nom, grade: identite(c.graineIdentite, NOUS, s[0], 99, 125, s[1]).grade }))) : [];
  return { statut: c.statut, texte: TEXTES.fin[c.statut === 'terminee' ? 'terminee' : 'effondree'], batailles, tombes: tombesNoms, restes };
}
