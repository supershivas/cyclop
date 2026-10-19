/* La campagne : trois batailles reliées par des hommes nommés (Jérôme, cadrage v0.36.3 ; lot 2 : le registre). Logique pure (aucun DOM,
   aucune horloge, aucun hasard hors d'un hachage), testée dans Node. Le registre d'une campagne est une donnée à part, hors de l'état
   d'une bataille : il vit dans `cyclopeen:campagne` (js/lib/save.js) et ne garde que des nombres et des noms de régiments, jamais une
   identité à re-dériver : un homme est son numéro, son rang, son expérience et ses victimes ; son nom vient de `graineIdentite`.
   Il est écrit à la fin de chaque bataille, avant l'écran de fin (`cloturerDansLeStore`), et `cloturer` est idempotente : relire une
   partie arrêtée à la fin, ou clore deux fois, donne le même registre. Rien n'est reporté de la fatigue, de la peur ni du moral. */
import { hash2 } from './lib/rng.js?v=0.36.2';
import { NOUS, rangDe } from './bataille.js?v=0.36.2';
import { CAMPAGNE } from './data/campagne.js?v=0.36.2';

export const CLE = 'campagne';        // l'entrée de js/lib/save.js (cyclopeen:campagne)
export const VERSION_CAMPAGNE = 1;

// La graine de la n-ième bataille (terrain, météo, tirages) : un hachage de la graine d'identité, donc le même plan pour la même campagne.
const graineDe = (graineIdentite, n) => Math.floor(hash2(graineIdentite | 0, 100 + n, 17) * 100000);

/* Une campagne neuve. `graineIdentite` fait aussi son numéro : deux campagnes de même graine sont la même. */
export function nouvelleCampagne(graineIdentite, plan = CAMPAGNE) {
  return {
    id: graineIdentite, graineIdentite, longueur: plan.longueur, regimentsMin: plan.regimentsMin,
    batailles: [],            // une entrée par bataille close (voir `cloturer`)
    statut: 'en cours',       // 'en cours' | 'terminee' | 'effondree'
  };
}

/* La prochaine bataille à jouer : { n, graine, graineIdentite, secteur, mission, campagne }, prête pour `nouvelleBataille(graine, R,
   { secteur, mission, graineIdentite, campagne })`. Rien si la campagne est finie. */
export function suivante(c, plan = CAMPAGNE) {
  if (c.statut !== 'en cours') return null;
  const n = c.batailles.length + 1, P = plan.batailles[n - 1];
  if (!P) return null;
  return { n, graine: graineDe(c.graineIdentite, n), graineIdentite: c.graineIdentite, secteur: P.secteur, mission: P.mission, campagne: { id: c.id, n } };
}

/* Ceux de chez nous qui ont survécu à la bataille, par régiment : [[numéro, rang, expérience, victimes], …]. Les vivants (blessés compris :
   la blessure ne passe pas), les évacués qui n'ont pas encore fini de revenir et ceux d'un régiment relevé, qui ont quitté le front
   vivants. Ne comptent pas : les morts, les prisonniers, les évacués qui ne reviendront pas (« disparus du front »). */
function survivants(B) {
  const { etat, armee: A } = B;
  const out = new Map(etat.regiments.filter(r => r.camp === NOUS).map(r => [r.id, new Map()]));
  const ajouter = (reg, id, exp, victimes) => {
    const m = out.get(reg);
    if (m && !m.has(id)) m.set(id, [id, rangDe(B, id, reg), exp, victimes]);
  };
  for (let i = 0; i < A.n; i++) if (A.camp[i] === NOUS && !A.mort[i]) ajouter(A.reg[i], A.id[i], A.exp[i], A.victimes[i]);
  for (const e of etat.evacues) if (e.length >= 6 && e[3] === 0) ajouter(e[4], e[0], e[5], e[6] ?? 0);
  for (const e of etat.releves ?? []) ajouter(e[1], e[0], e[2], e[3]);
  return etat.regiments.filter(r => r.camp === NOUS).map(r => ({
    nom: r.nom, depart: r.initial, survivants: [...out.get(r.id).values()].sort((a, b) => a[0] - b[0]),
  }));
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
  };
  const debout = regiments.filter(r => r.survivants.length).length;
  const statut = debout < c.regimentsMin ? 'effondree' : ref.n >= c.longueur ? 'terminee' : 'en cours';
  return { ...c, batailles: [...c.batailles, entree], statut };
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
