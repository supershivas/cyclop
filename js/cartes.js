/* Les cartes du soir (Jérôme, 24-26 nov. ; ROADMAP, lot 1 ; docs/chantiers/cartes-wtf.md) : la règle, pure (aucun DOM, aucune horloge ; le hasard vient
   d'un hachage de la graine et du soir : aucun tirage du générateur de la bataille).

   Le soir : trois familles tirées parmi six (data/cartes.js) ; un paquet par famille, mat, brillant ou rose (70 / 25 / 5 sur 100) ; 3 à 5 cartes par paquet.
   Les raretés : un paquet mat suit les chances des caisses (50 / 25 / 13 / 7 / 4 / 1) ; un brillant a au moins une carte rare ; un rose a toujours une carte
   mythique. Une carte déjà tenue revient à la rareté au-dessus de la sienne (la rareté remplace les niveaux, Jérôme, 26 nov.) ; une carte tenue mythique n'est
   plus proposée : une autre carte de la famille prend sa place. On ouvre un paquet, on garde une de ses cartes ; les autres paquets sont perdus.

   L'état vit dans `etat.cartes` (sauvegardé avec la bataille) :
   - `tenues` : id → rareté (la plus haute) ; `histo` : [soir, id, rareté] de chaque carte gardée ;
   - `offre` : le tirage du soir en cours { soir, paquets: [{ famille, rarete, cartes: [[id, rareté]] }], ouvert: indice | -1 }, ou null.
   Les effets en jeu ne sont pas encore branchés (ils viendront famille par famille). */
import { CARTES, FAMILLES_CARTES, ORDRE_FAMILLES, PAQUETS, SOIR_CARTES } from './data/cartes.js?v=0.170.6';
import { RARETES, ORDRE_RARETES } from './data/largages.js?v=0.170.6';
import { hash2 } from './lib/rng.js?v=0.170.6';

const MYTHIQUE = 'relique', RANG = Object.fromEntries(ORDRE_RARETES.map((r, k) => [r, k]));
const SEL = 1700;      // le sel du hachage des cartes (les largages et les caprices ont le leur)

export const cartesDeDepart = () => ({ tenues: {}, histo: [], offre: null });

// Un tirage pondéré : `u` dans [0, 1[, `poids` : [[clé, poids]] → la clé
function pondere(u, poids) {
  const total = poids.reduce((s, [, p]) => s + p, 0);
  let x = u * total;
  for (const [k, p] of poids) { if (x < p) return k; x -= p; }
  return poids[poids.length - 1][0];
}
const rareteCaisse = u => pondere(u, ORDRE_RARETES.map(r => [r, RARETES[r].poids]));
const monter = (r, n = 1) => ORDRE_RARETES[Math.min(ORDRE_RARETES.length - 1, RANG[r] + n)];
const auMoins = (r, min) => (RANG[r] >= RANG[min] ? r : min);

// Les cartes qu'une famille peut encore proposer (une carte tenue mythique ne revient plus)
export const cartesProposables = (famille, tenues) => Object.values(CARTES).filter(C => C.famille === famille && tenues[C.id] !== MYTHIQUE);

// La rareté sous laquelle une carte se montre : celle du tirage, ou la rareté au-dessus de celle qu'on tient si elle est plus haute
export const rareteProposee = (id, tiree, tenues) => (tenues[id] ? auMoins(tiree, monter(tenues[id])) : tiree);

/* Le tirage d'un soir : (graine, soir, tenues) → { soir, paquets, ouvert: -1 }. Pur : le même soir de la même graine donne le même tirage. */
export function tirerOffre(graine, soir, tenues = {}) {
  const u = k => hash2(graine | 0, soir, SEL + k);
  // les familles qui ont encore des cartes, trois tirées sans remise
  const libres = ORDRE_FAMILLES.filter(f => cartesProposables(f, tenues).length);
  const familles = [];
  for (let k = 0; k < SOIR_CARTES.familles && libres.length; k++) familles.push(libres.splice(Math.floor(u(k) * libres.length), 1)[0]);
  const paquets = familles.map((famille, p) => {
    const v = k => u(100 + p * 40 + k), liste = cartesProposables(famille, tenues);
    const rarete = pondere(v(0), Object.entries(PAQUETS).map(([k, P]) => [k, P.poids]));
    const [a, b] = SOIR_CARTES.cartes, n = a + Math.floor(v(1) * (b - a + 1));
    const cartes = [];
    for (let c = 0; c < n; c++) {
      const C = liste[Math.floor(v(2 + c * 2) * liste.length)];
      cartes.push([C.id, rareteCaisse(v(3 + c * 2))]);
    }
    const P = PAQUETS[rarete];
    // le brillant : au moins une carte rare ; le rose : une carte mythique (la dernière du paquet, la plus rare sort en dernier)
    if (P.auMoins && !cartes.some(([, r]) => RANG[r] >= RANG[P.auMoins])) cartes[cartes.length - 1][1] = P.auMoins;
    if (P.mythique && !cartes.some(([, r]) => r === MYTHIQUE)) cartes[cartes.length - 1][1] = MYTHIQUE;
    for (const c of cartes) c[1] = rareteProposee(c[0], c[1], tenues);
    return { famille, rarete, cartes };
  });
  return { soir, paquets, ouvert: -1 };
}

/* Le soir : l'offre du soir (tirée une fois ; relue telle quelle si elle est déjà là) */
export function offrirCartes(etat, soir = etat.jour) {
  const K = etat.cartes;
  if (!K) return { refus: 'Pas de cartes dans cette partie.' };
  if (K.offre && K.offre.soir === soir) return { ok: true, offre: K.offre };
  K.offre = tirerOffre(etat.graine, soir, K.tenues);
  return { ok: true, offre: K.offre };
}

/* On ouvre le paquet `p` (les autres sont perdus) */
export function ouvrirPaquet(etat, p) {
  const O = etat.cartes?.offre;
  if (!O) return { refus: 'Aucun paquet à ouvrir ce soir.' };
  if (O.ouvert >= 0) return { refus: 'Un paquet est déjà ouvert ce soir.' };
  if (!O.paquets[p]) return { refus: 'Ce paquet n\'existe pas.' };
  O.ouvert = p;
  return { ok: true, paquet: O.paquets[p] };
}

/* On garde la carte `c` du paquet ouvert : elle est tenue jusqu'à la fin, à sa rareté (ou plus haut si on la tenait déjà plus haut) */
export function garderCarte(etat, c) {
  const K = etat.cartes, O = K?.offre;
  if (!O) return { refus: 'Aucune carte à garder ce soir.' };
  if (O.ouvert < 0) return { refus: 'Ouvrez d\'abord un paquet.' };
  const carte = O.paquets[O.ouvert].cartes[c];
  if (!carte) return { refus: 'Cette carte n\'est pas dans le paquet.' };
  const [id, r] = carte, avant = K.tenues[id];
  K.tenues[id] = avant && RANG[avant] > RANG[r] ? avant : r;
  K.histo.push([O.soir, id, K.tenues[id]]);
  K.offre = null;
  return { ok: true, id, rarete: K.tenues[id], monte: !!avant };
}

// Lecture : la rareté d'une carte tenue (ou null), la famille d'une carte
export const rareteTenue = (etat, id) => etat.cartes?.tenues[id] ?? null;
export const familleDe = id => FAMILLES_CARTES[CARTES[id]?.famille] ?? null;
