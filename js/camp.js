// Le camp : la règle, sans écran (Jérôme, v0.86.0 : lot 1 de `docs/chantiers/camp-et-ameliorations.md`). Logique pure : aucun DOM, aucune horloge, aucun hasard.
// L'état est `etat.camp` : la dotation de l'état-major, les rangs acquis de chaque onglet (`rangs`), ceux de ce soir (`achats`), le niveau dessiné de chaque bâtiment, les lignes d'en face déjà comptées.
// Lot 2 : les niveaux ouvrent les ordres (`refusOrdre`). Lot 3 (v0.88.0) : chaque niveau et chaque choix de palier change un chiffre (`modif`) ou un effectif (`effectifsDe`).
// La soirée (Jérôme, 18 nov., ROADMAP « Le soir, le moment des améliorations ») : la dotation tombe le soir (`dotationSoir`, +2 le soir depuis le troisième jet), on ne dépense que la nuit ;
// troisième jet (v0.150.0) : les arbres (le I donné, deux pistes de quatre rangs, data/ameliorations.js), l'achat au clic rendu jusqu'à l'aube, l'Infanterie pour tous nos régiments.
import { BATIMENTS, DOTATION, CAMP_PLAN, PIEDS } from './data/batiments.js?v=0.166.1';
import { ARBRES, ORDRE_ARBRES, PRIX, ROMAINS, IA_PLAN, nomRang } from './data/ameliorations.js?v=0.166.1';
import { RENFORTS } from './data/renforts.js?v=0.166.1';
import { MITRAILLAGE } from './data/mitraillage.js?v=0.166.1';
import { PARC } from './data/parc.js?v=0.166.1';

const NOUS = 0, EUX = 1;
/* L'état du camp de `camp` : `etat.camp` (le nôtre), `etat.campEux` (celui d'en face : v0.92.0) */
export const campDe = (etat, camp = NOUS) => camp === NOUS ? etat.camp : etat.campEux;

/* Les blessés évacués de `camp` que l'hôpital soigne encore : [{ id, jour, blessure, regiment, pret }] (pret : assez de nuits passées pour repartir) */
export function patients(etat, camp = NOUS, nuits = { 1: 1, 2: 2, 3: 3 }) {
  const out = [];
  for (const e of etat.evacues ?? []) {
    if (e.length < 6 || e[3] !== 0 || etat.regiments[e[4]]?.camp !== camp) continue;
    out.push({ id: e[0], jour: e[1], blessure: e[2], regiment: e[4], pret: etat.jour - e[1] >= (nuits[e[2]] ?? 1) });
  }
  return out;
}
/* Où repartent les guéris : un régiment de son camp encore debout, ou null (chacun au sien). Rend { ok } ou { refus } */
export function affecterGueris(etat, camp, reg) {
  if (etat.phase === 'fin') return { refus: 'La bataille est finie.' };
  if (reg !== null) {
    const r = etat.regiments[reg];
    if (!r || r.camp !== camp) return { refus: 'Ce régiment n\'est pas le vôtre.' };
    if (r.effectif <= 0) return { refus: `${r.nom} n'a plus d'hommes : les guéris n'y repartent pas.` };
  }
  (etat.affectation ??= [null, null])[camp] = reg;
  return { ok: true };
}

/* Les chars qui restent au parc de `camp` (null : sans limite) */
export const charsDispo = (etat, camp = NOUS) => etat.charsDispo?.[camp] ?? null;

// Le niveau qui ouvre chaque ordre de batterie (`ordonnerBarrage`) : [bâtiment, niveau]. Depuis la v0.98.0 tout est ouvert au niveau I (donné)
const OUVERTURE = { '75': ['artillerie', 1], '155': ['artillerie', 1], '220': ['artillerie', 1], avion: ['aerodrome', 1], char: ['chars', 1], genie: ['sapeurs', 1] };

/* Le bâtiment et le niveau qui ouvrent un ordre de batterie, ou null */
export const ouverture = cal => OUVERTURE[cal] ?? null;

// ─── Les arbres (la soirée, troisième jet, Jérôme, 18 nov. : data/ameliorations.js) ───
// Chaque onglet (les six bâtiments et l'Infanterie) : le niveau I donné, puis deux pistes de quatre rangs (II à V). `K.rangs[onglet]` = [rangs acquis de la piste 0, de la piste 1] (0 à 4 :
// une piste s'achète dans l'ordre). On achète au clic, le soir, payé tout de suite ; ce qui a été acheté ce soir (`K.achats`) se rend d'un clic jusqu'à l'aube, qui le confirme (les effectifs
// montent alors : avions, chars, sections, régiments frais). `batiments[clé].niveau` (1 à 3) n'est plus qu'un dessin : la taille du bâtiment, les places du parc et de la piste.
const rangsVides = () => Object.fromEntries(ORDRE_ARBRES.map(o => [o, [0, 0]]));
/* L'état du camp au premier matin : tout est au niveau I ; `depart` : les rangs d'une bataille précédente de la campagne ({ onglet: [a, b] }) */
export function campDeDepart({ bride = false, depart = null, mult = 1 } = {}) {
  const rangs = rangsVides();
  for (const o of ORDRE_ARBRES) if (Array.isArray(depart?.[o])) rangs[o] = [0, 1].map(p => Math.max(0, Math.min(RANGS, depart[o][p] | 0)));
  const K = { dotation: DOTATION.depart, batiments: Object.fromEntries(Object.keys(BATIMENTS).map(cle => [cle, { niveau: 1 }])), rangs, achats: [], lignes: [], bride, mult, soir: null };
  for (const cle of Object.keys(BATIMENTS)) recaler(K, cle);
  return K;
}
const RANGS = 4;
/* Le niveau dessiné d'un bâtiment (1 à 3) : l'aérodrome et le parc suivent leurs engins (la piste qui en ajoute), les autres le nombre de rangs acquis */
function recaler(K, cle) {
  const r = K.rangs[cle] ?? [0, 0], t = r[0] + r[1];
  K.batiments[cle].niveau = cle === 'aerodrome' || cle === 'chars' ? 1 + (r[0] >= 1) + (r[0] >= 3) : 1 + (t >= 2) + (t >= 5);
}
export const niveauDe = (etat, cle, camp = NOUS) => campDe(etat, camp)?.batiments[cle]?.niveau ?? 0;
/* Les rangs acquis d'une piste ; le prix du rang `k` (0 = II … 3 = V) */
export const rangDe = (etat, o, p, camp = NOUS) => campDe(etat, camp)?.rangs?.[o]?.[p] ?? 0;
export const prixRang = k => PRIX[k] ?? Infinity;
const acquis = (K, [o, p, k]) => (K.rangs[o]?.[p] ?? 0) > k;
/* Ce qu'il manque pour le rang `k` de la piste : le rang d'avant, ou le rang de son lien ; null si tout est là */
function manque(K, o, p, k) {
  if (k > 0 && !acquis(K, [o, p, k - 1])) return [o, p, k - 1];
  const L = ARBRES[o].pistes[p].rangs[k]?.lien;
  return L && !acquis(K, L) ? L : null;
}
const dit = ([o, p, k]) => `« ${nomRang([o, p, k])} » (${ROMAINS[k]}, ${ARBRES[o].court})`;
/* Pourquoi on ne peut pas acheter le rang suivant de la piste `p` de `o` : une phrase, ou null (un ordre impossible se refuse à voix haute) */
export function refusRang(etat, o, p, camp = NOUS) {
  const K = campDe(etat, camp), A = ARBRES[o];
  if (!A || !A.pistes[p]) return 'Cette amélioration n\'existe pas.';
  if (!K?.bride) return 'Pas de camp dans cette partie.';
  if (etat.phase === 'fin') return 'La bataille est finie.';
  if (etat.phase === 'jour') return `On améliore le camp le soir : ${A.nom.replace(/^./, x => x.toLowerCase())} attend la nuit.`;
  const k = K.rangs[o][p];
  if (k >= RANGS) return `${A.pistes[p].nom} : la piste est au bout.`;
  const m = manque(K, o, p, k);
  if (m) return `${A.pistes[p].rangs[k].nom} demande d'abord ${dit(m)}.`;
  const prix = prixRang(k), caisse = K.dotation;
  if (prix > caisse) return `${prix - caisse} point${prix - caisse > 1 ? 's' : ''} de dotation manque${prix - caisse > 1 ? 'nt' : ''} pour ${A.pistes[p].rangs[k].nom.toLowerCase()} (${prix} points, ${caisse} à dépenser).`;
  return null;
}
/* Acheter le rang suivant : acquis et payé tout de suite ; rend { ok, k, cout } ou { refus } */
export function acheterRang(etat, o, p, camp = NOUS) {
  const refus = refusRang(etat, o, p, camp);
  if (refus) return { refus };
  const K = campDe(etat, camp), k = K.rangs[o][p];
  K.dotation -= prixRang(k); K.rangs[o][p]++; K.achats.push([o, p]);
  if (K.batiments[o]) recaler(K, o);
  return { ok: true, k, cout: prixRang(k) };
}
/* Le dernier rang de la piste a-t-il été acheté ce soir (seul lui se rend : la piste se défait par le haut) ? */
const deCeSoir = (K, o, p) => K.achats.some(([a, b]) => a === o && b === p);
export function refusRendre(etat, o, p, camp = NOUS) {
  const K = campDe(etat, camp);
  if (!K?.bride || !ARBRES[o]?.pistes[p]) return 'Cette amélioration n\'existe pas.';
  if (etat.phase !== 'nuit') return 'On ne rend un achat que la nuit, avant l\'aube.';
  if (!deCeSoir(K, o, p)) return 'Rien n\'a été acheté ce soir sur cette piste : l\'aube a confirmé le reste.';
  return null;
}
/* Rendre le dernier rang de la piste (acheté ce soir) : remboursé ; avec lui, ce qui, acheté ce soir, en dépendait (la suite d'un lien). Rend { ok, rendus: [[o, p, k]], points } ou { refus } */
export function rendreRang(etat, o, p, camp = NOUS) {
  const refus = refusRendre(etat, o, p, camp);
  if (refus) return { refus };
  const K = campDe(etat, camp), rendus = [];
  const un = (a, b) => { const k = --K.rangs[a][b]; K.dotation += prixRang(k); K.achats.splice(K.achats.findLastIndex(([x, y]) => x === a && y === b), 1); if (K.batiments[a]) recaler(K, a); rendus.push([a, b, k]); };
  un(o, p);
  for (let encore = true; encore;) {
    encore = false;
    for (const [a, b] of [...K.achats].reverse()) { const k = K.rangs[a][b] - 1; if (manque(K, a, b, k)) { un(a, b); encore = true; break; } }
  }
  return { ok: true, rendus, points: rendus.reduce((t, [, , k]) => t + prixRang(k), 0) };
}
/* « Annuler » : tout ce qui a été acheté ce soir est rendu. Rend { ok, rendus, points } ou { refus } */
export function annulerSoir(etat, camp = NOUS) {
  const K = campDe(etat, camp);
  if (etat.phase !== 'nuit') return { refus: 'On ne rend un achat que la nuit, avant l\'aube.' };
  if (!K?.achats?.length) return { refus: 'Rien n\'a été acheté ce soir.' };
  const rendus = []; let points = 0;
  while (K.achats.length) { const [o, p] = K.achats[K.achats.length - 1], r = rendreRang(etat, o, p, camp); rendus.push(...r.rendus); points += r.points; }
  return { ok: true, rendus, points };
}
/* Ce qui a été dépensé ce soir */
export const depenseSoir = (etat, camp = NOUS) => { const K = campDe(etat, camp), n = {}; let t = 0; for (const [o, p] of K?.achats ?? []) { const k = (K.rangs[o][p] - 1) - (n[`${o}${p}`] = (n[`${o}${p}`] ?? 0)); n[`${o}${p}`]++; t += prixRang(k); } return t; };
/* La caisse : ce qui reste à dépenser (tout est payé au clic) */
export const disponible = (etat, camp = NOUS) => campDe(etat, camp)?.dotation ?? 0;

/* Les tronçons que `camp` tient, par ligne de l'autre camp : { rang: [tenus, en tout] }, et le total de ses lignes [tenus, en tout] */
function lignes(B, camp) {
  const eux = {}, nos = [0, 0];
  B.troncons.forEach((tr, k) => {
    const L = B.lignes[tr.ligne], tenu = B.etat.troncons[k] === camp;
    if (L.camp === camp) { nos[1]++; if (tenu) nos[0]++; } else { const e = eux[L.rang] ??= [0, 0]; e[1]++; if (tenu) e[0]++; }
  });
  return { eux, nos };
}

/* Le décompte du soir d'un camp (× `mult`) : +1 le jour tenu, +1 nos lignes tenues à 75 %, +2 une ligne d'en face prise pour la première fois. Versé tout de suite. Rend { jour, points, base, tenue, lignes } */
function soirDe(B, camp) {
  const { etat } = B, K = campDe(etat, camp), out = { jour: etat.jour, points: 0, base: DOTATION.soir, tenue: 0, lignes: 0 };
  const { eux, nos } = lignes(B, camp);
  if (nos[1] && nos[0] >= nos[1] * DOTATION.tenue.seuil) out.tenue = DOTATION.tenue.points;
  for (const [rang, [tenus, total]] of Object.entries(eux)) {
    if (total && tenus >= total * DOTATION.tenue.seuil && !K.lignes.includes(+rang)) { K.lignes.push(+rang); out.lignes += DOTATION.ligne; }
  }
  out.points = (out.base + out.tenue + out.lignes) * (K.mult ?? 1);
  K.dotation += out.points;
  K.soir = { ...out };       // (une copie : `dotationSoir` ajoute `camps` au détail rendu, l’état ne doit pas boucler)
  return out;
}
/* Le soir (la fin d'un jour qui ouvre une nuit) : la dotation tombe pour les deux camps (Jérôme, 18 nov. : on voit ce qu'on a gagné au moment où l'on peut le dépenser) ; en face commande seule (`iaBatir`), sauf à deux. Rend le détail du nôtre, et `camps` */
export function dotationSoir(B) {
  const { etat } = B;
  if (!etat.camp) return null;
  const out = soirDe(B, NOUS);
  out.camps = [out];
  if (etat.campEux) { out.camps.push(soirDe(B, EUX)); if (!etat.deux) iaBatir(B); }
  return out;
}
/* L'aube d'un camp : les achats du soir sont confirmés (ils ne se rendent plus) et leurs effectifs montent. Rend les rangs confirmés [[o, p, k]] */
function confirmer(etat, camp) {
  const K = campDe(etat, camp), out = [];
  // les rangs achetés ce soir sur une piste sont les n derniers acquis (n : ses achats du soir)
  for (const o of ORDRE_ARBRES) for (const p of [0, 1]) { const n = K.achats.filter(([a, b]) => a === o && b === p).length; for (let k = K.rangs[o][p] - n; k < K.rangs[o][p]; k++) out.push([o, p, k]); }
  if (K.bride) for (const [o, p, k] of out) monterRang(etat, o, p, k, camp);
  K.achats = [];
  return out;
}
/* L'aube des deux camps : ce qui a été acheté le soir est confirmé. Rend le détail du nôtre ({ achetes, soir, caisse }) et `camps` (à deux, chaque joueur lit le sien) */
export function aubeCamps(B) {
  const { etat } = B;
  if (!etat.camp) return null;
  const de = camp => { const K = campDe(etat, camp); return { achetes: confirmer(etat, camp), soir: K.soir, caisse: K.dotation }; };
  const out = de(NOUS);
  out.camps = [out];
  if (etat.campEux) out.camps.push(de(EUX));
  return out;
}
/* En face achète le soir, comme nous : tant qu'il a de quoi payer, le premier rang de son plan (`IA_PLAN` : des pistes, rang par rang) qui n'est pas acquis et que rien ne bloque ;
   un rang trop cher attend le soir suivant (il ne passe pas au suivant : ses sous sont pour lui) */
function iaBatir(B) {
  const { etat } = B, K = etat.campEux;
  if (!K?.bride) return;
  for (let tour = 0; tour < 12; tour++) {
    const pas = IA_PLAN.find(([o, p, k]) => K.rangs[o][p] === k && !manque(K, o, p, k));
    if (!pas || !acheterRang(etat, pas[0], pas[1], EUX).ok) return;
  }
}

/* Pourquoi le camp ne donne pas cet ordre (`cal` : '75', '155', '220', 'avion', 'char', 'genie') : une phrase, ou null. Seulement dans la partie bridée, et pour nous */
export function refusOrdre(etat, camp, cal) {
  const K = campDe(etat, camp);
  if (!K?.bride || !OUVERTURE[cal]) return null;
  const [cle, n] = OUVERTURE[cal], B = BATIMENTS[cle], niveau = niveauDe(etat, cle, camp);
  if (niveau >= n) return null;
  return niveau === 0 ? `${B.nom} n'est pas encore bâti.` : `${B.nom} : cet ordre s'ouvre au niveau ${n} (il est au niveau ${niveau}).`;
}
/* Le nid de mitrailleuse refait par le génie demande « Chantier » (maison des sapeurs, piste Sections, II) */
export function refusNid(etat, camp) {
  if (!campDe(etat, camp)?.bride || rangDe(etat, 'sapeurs', 0, camp) >= 1) return null;
  return `Refaire un nid de mitrailleuse demande ${dit(['sapeurs', 0, 0])}.`;
}

/* Le plan du camp d'un secteur (v0.110.0, les cartes plus grandes) : le milieu du front, à `CAMP_PLAN.derriere` m derrière le bord sud du secteur (33 m : 333 pour 300). `etat.dim` dit la taille du secteur ;
   sans elle (une partie d'avant), le secteur de 400 × 300 d'origine : le même plan qu'avant. */
const planDe = etat => { const L = etat.dim?.largeur ?? CAMP_PLAN.largeur, H = etat.dim?.hauteur ?? CAMP_PLAN.hauteur; return { x: L / 2, y: H + (CAMP_PLAN.y - CAMP_PLAN.hauteur), largeur: L, hauteur: H }; };

/* La place de `cle` dans le camp de `camp` : { cle, camp, x, y, w, d, rot } (le centre et l'emprise, en coordonnées du terrain : les marges sont ajoutées), bâtie ou non */
export function emplacementCamp(etat, cle, camp = NOUS) {
  const m = etat.marges ?? { x: 0, y: 0 }, [dx, dy] = CAMP_PLAN.ligne[cle];
  // le camp d'en face : le nôtre tourné d'un demi-tour autour du centre du secteur (au nord, ses bâtiments tournés vers le sud)
  const P = planDe(etat), X = P.x + dx, Y = P.y + dy;
  return { cle, camp, x: m.x + (camp === NOUS ? X : P.largeur - X), y: m.y + (camp === NOUS ? Y : P.hauteur - Y), w: PIEDS[cle][0], d: PIEDS[cle][1], rot: camp === NOUS ? 0 : Math.PI };
}
/* Les terrains des bâtiments des deux camps, tous les emplacements bâtis ou non, élargis de `DEGAGE_BASE` m de chaque côté : { x0, x1, y0, y1 }[] en coordonnées du terrain.
   Pure (sans état de partie : seulement les dimensions du secteur et ses marges) : le sol s'en sert pour n'y planter aucun arbre (Jérôme, v0.128.0 : un char sorti du parc restait bloqué par un arbre). */
export function terrainsDeBase(dim, marges, degage = CAMP_PLAN.degage) {
  const etat = { dim, marges }, out = [];
  for (const camp of [NOUS, EUX]) for (const cle of Object.keys(CAMP_PLAN.ligne)) {
    const e = emplacementCamp(etat, cle, camp);      // (tournés d'un demi-tour, les rectangles restent alignés sur les axes)
    out.push({ x0: e.x - e.w / 2 - degage, x1: e.x + e.w / 2 + degage, y0: e.y - e.d / 2 - degage, y1: e.y + e.d / 2 + degage });
  }
  return out;
}
/* Où sortent les hommes de la caserne de `camp` (lot D) : { x, y } devant sa façade (vers l'ennemi), `sens` (-1 chez nous : les y décroissent), `w` sa largeur, `cx, cy` son centre ; null sans caserne dessinée (partie non bridée, caserne pas bâtie) */
export function sortieCaserne(etat, camp = NOUS) {
  if (!campDe(etat, camp)?.bride || !niveauDe(etat, 'caserne', camp)) return null;
  const e = emplacementCamp(etat, 'caserne', camp), sens = camp === NOUS ? -1 : 1;
  return { x: e.x, y: e.y + sens * (e.d / 2 + 2), sens, w: e.w, cx: e.x, cy: e.y };
}
/* Où marchent les blessés de `camp` (v0.116.0) : devant la façade de l'hôpital, { x, y, cx, cy } ; null sans hôpital dessiné (partie non bridée, hôpital pas bâti) : ils vont alors à l'arrière comme avant */
export function entreeHopital(etat, camp = NOUS) {
  if (!campDe(etat, camp)?.bride || !niveauDe(etat, 'hopital', camp)) return null;
  const e = emplacementCamp(etat, 'hopital', camp), sens = camp === NOUS ? -1 : 1;
  return { x: e.x, y: e.y + sens * (e.d / 2 + 2), cx: e.x, cy: e.y };
}
/* Les régiments frais de `camp` (v0.116.0) : { restants, pris, total } ; `pris` = ceux que la relève ou un déploiement ont déjà engagés (les ralliés n'en font pas partie : ils ne viennent pas de la réserve). Aucun régiment ne s'ajoute chaque jour : le total ne bouge que si la caserne monte. */
export function renfortsDe(etat, camp = NOUS) {
  const reserve = etat.reserves?.[camp] ?? 0, pris = etat.reservesPrises?.[camp] ?? 0, plafond = RENFORTS.plafond + plusDe(etat, camp, 'caserne', '+reserves');      // (chaque régiment frais d'un rang de la caserne relève aussi le plafond : troisième jet)
  return { restants: Math.max(0, Math.min(reserve, plafond - pris)), pris, total: Math.min(reserve + pris, plafond), plafond };
}
/* Où sort un char du parc de `camp` (v0.99.8 : « le char part du parc des chars ») : la place du Schneider que le parc montre, devant sa galerie ; null sans parc dessiné (partie non bridée, parc pas bâti) */
export function sortieChars(etat, camp = NOUS) {
  const n = niveauDe(etat, 'chars', camp);
  if (!campDe(etat, camp)?.bride || !n) return null;
  const e = emplacementCamp(etat, 'chars', camp), s = camp === NOUS ? 1 : -1;
  return { x: e.x + s * [0, 0, 4.8, 9.6][n], y: e.y - s * 10 };
}
// ─── Les engins du parc (v0.130.0) ───
/* Un point local d'un bâtiment (x, z) en coordonnées du terrain : le camp d'en face est tourné d'un demi-tour */
const monde = (e, x, z) => ({ x: e.x + (e.rot ? -x : x), y: e.y + (e.rot ? -z : z) });
/* Les chars rentrés au parc de `camp` : [{ id, pv, pvMax, exp, tues, tuesCanon, tuesMitr, obus, repar }] (un char qui revient du champ garde ses dégâts et son expérience) ; les autres du stock sont neufs */
export const parcChars = (etat, camp = NOUS) => (etat.parcChars ??= [[], []])[camp];
/* Les places des chars du parc de `camp` : { x, y, id } par place occupée (neufs d'abord, puis les rentrés : `id` = le numéro du char rentré, sinon null) ; vide sans parc dessiné */
export function placesChars(etat, camp = NOUS) {
  const n = niveauDe(etat, 'chars', camp), stock = charsDispo(etat, camp);
  if (!campDe(etat, camp)?.bride || !n || !stock) return [];
  const e = emplacementCamp(etat, 'chars', camp), rentres = parcChars(etat, camp), neufs = Math.max(0, stock - rentres.length), out = [];
  for (let k = 0; k < Math.min(stock, PARC.chars.capacite[n]); k++) {
    const p = monde(e, PARC.chars.depart[n] - PARC.chars.pas * k, PARC.chars.z);
    out.push({ ...p, id: k >= neufs ? rentres[k - neufs]?.id ?? null : null });
  }
  return out;
}
/* La place de l'avion `k` de `camp` sur la piste (sa cellule) */
export function placeAvion(etat, camp, k) {
  const q = PARC.avions[k] ?? PARC.avions[0];
  return monde(emplacementCamp(etat, 'aerodrome', camp), q[0], q[1]);
}
/* Les sections du génie qui attendent au dépôt de `camp` (Jérôme, v0.140.0 : « le génie serait un petit régiment visible ») : le centre de chaque section, en rang devant la maison des sapeurs,
   hors de son emprise (un clic sur elles n'ouvre pas la fenêtre du bâtiment) ; vide sans camp dessiné. `PARC.genie` : le recul devant la façade, le pas entre deux sections */
export function placesGenie(etat, camp = NOUS) {
  const n = niveauDe(etat, 'sapeurs', camp), dep = etat.sapeurs?.[camp] ?? 0;
  if (!campDe(etat, camp)?.bride || !n || !dep) return [];
  const e = emplacementCamp(etat, 'sapeurs', camp), out = [];
  for (let k = 0; k < dep; k++) out.push(monde(e, (k - (dep - 1) / 2) * PARC.genie.pas, -(e.d / 2 + PARC.genie.recul)));
  return out;
}
/* Le char à prendre au parc pour une sortie : un char neuf s'il en reste, sinon le rentré le mieux portant qui n'est pas sous le génie (`enReparation(id)`) ; { neuf: true }, { rentre } ou null */
export function prochainDuParc(etat, camp, enReparation = () => false) {
  const rentres = parcChars(etat, camp), neufs = (charsDispo(etat, camp) ?? 0) - rentres.length;
  if (neufs > 0) return { neuf: true };
  let m = null; for (const r of rentres) if (!enReparation(r.id) && (!m || r.pv > m.pv)) m = r;
  return m ? { rentre: m } : null;
}

/* Où est chaque bâtiment (tous sont bâtis : le niveau I est donné) */
export function emprisesCamp(etat, camp = NOUS) {
  const K = campDe(etat, camp);
  return Object.keys(CAMP_PLAN.ligne).filter(cle => K?.batiments[cle]?.niveau).map(cle => emplacementCamp(etat, cle, camp));
}

/* La place de tout le camp, bâti ou non (les cinq emplacements) : { x0, x1, y0, y1 } en coordonnées du terrain ; la caméra le cadre en entier (v0.96.0) */
export function etendueCamp(etat, camp = NOUS) {
  const m = etat.marges ?? { x: 0, y: 0 }, e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const [cle, [dx, dy]] of Object.entries(CAMP_PLAN.ligne)) {
    const P = planDe(etat), X = P.x + dx, Y = P.y + dy, x = m.x + (camp === NOUS ? X : P.largeur - X), y = m.y + (camp === NOUS ? Y : P.hauteur - Y);
    e.x0 = Math.min(e.x0, x - PIEDS[cle][0] / 2); e.x1 = Math.max(e.x1, x + PIEDS[cle][0] / 2); e.y0 = Math.min(e.y0, y - PIEDS[cle][1] / 2); e.y1 = Math.max(e.y1, y + PIEDS[cle][1] / 2);
  }
  return e;
}
/* Le bâtiment sous un point du terrain (à `marge` m près), ou null */
export function batimentSous(etat, x, y, marge = 0, camp = NOUS) {
  return emprisesCamp(etat, camp).find(e => Math.abs(x - e.x) <= e.w / 2 + marge && Math.abs(y - e.y) <= e.d / 2 + marge)?.cle ?? null;
}

// ─── Ce que les rangs changent ───
/* Le facteur d'un modificateur (`'artillerie.recharge'`, `'infanterie.obus'`…) pour `camp` : le produit des `effets` des rangs acquis de l'onglet qui le porte (le préfixe).
   1 hors de la partie bridée (le camp d'en face compte depuis la v0.92.0). Les clés `+…` (des effectifs) ne sont pas des facteurs. */
export function modif(etat, camp, cle) {
  const K = campDe(etat, camp);
  if (!K?.bride) return 1;
  const o = cle.split('.')[0], A = ARBRES[o], r = K.rangs?.[o];
  if (!A || !r) return 1;
  let f = 1;
  A.pistes.forEach((P, p) => { for (let k = 0; k < r[p]; k++) { const v = P.rangs[k].effets[cle]; if (v != null) f *= v; } });
  return f;
}
/* La somme des effets `+…` des rangs acquis d'un onglet (`'+avions'`…) */
export const plusDe = (etat, camp, o, cle) => { const K = campDe(etat, camp), r = K?.rangs?.[o]; if (!r) return 0; let n = 0; ARBRES[o].pistes.forEach((P, p) => { for (let k = 0; k < r[p]; k++) n += P.rangs[k].effets[cle] ?? 0; }); return n; };
/* Le facteur de recharge d'une batterie (`cal` : '75', '155', '220', 'avion', 'char', 'genie') */
export function rechargeDe(etat, camp, cal) {
  if (cal === 'avion') return modif(etat, camp, 'aerodrome.recharge');
  if (cal === 'char') return modif(etat, camp, 'chars.recharge');
  if (cal === 'genie') return 1;
  return modif(etat, camp, 'artillerie.recharge') * (cal === '220' ? modif(etat, camp, 'artillerie.recharge220') : 1);
}
/* Les effectifs du départ de la partie bridée : ceux du niveau I (data/batiments.js : 2 régiments frais, 2 sections, 2 chars, 3 avions), puis ce que les rangs déjà acquis (une campagne les reporte) ajoutent */
export function appliquerDepart(etat, camp = NOUS) {
  const I = cle => BATIMENTS[cle].niveaux[0];
  etat.reserves[camp] = I('caserne').reserves ?? 0;
  etat.sapeurs[camp] = I('sapeurs').sections ?? 0;
  (etat.charsDispo ??= [null, null])[camp] = I('chars').chars ?? 0;      // les chars du parc : un stock par bataille (v0.99.10) ; `null` : pas de limite (partie non bridée)
  etat.avions[camp] = [];
  const K = campDe(etat, camp);
  for (let k = 0; k < (I('aerodrome').avions ?? 0); k++) etat.avions[camp].push(pvAvion(etat, camp));
  for (const o of ORDRE_ARBRES) for (const p of [0, 1]) for (let k = 0; k < K.rangs[o][p]; k++) monterRang(etat, o, p, k, camp, true);
}
/* Un rang est confirmé (l'aube qui suit son achat) : ses effectifs montent ; ce que la partie a perdu reste perdu (les avions abattus, les sections anéanties). `depart` : les avions sont déjà à leurs points de vie */
function monterRang(etat, o, p, k, camp, depart = false) {
  const e = ARBRES[o].pistes[p].rangs[k].effets;
  if (e['+reserves']) etat.reserves[camp] += e['+reserves'];
  if (e['+sections']) etat.sapeurs[camp] += e['+sections'];
  if (e['+chars']) etat.charsDispo[camp] += e['+chars'];
  if (e['aerodrome.pv'] && !depart) etat.avions[camp] = etat.avions[camp].map(pv => pv > 0 ? Math.round(pv * e['aerodrome.pv']) : 0);      // le blindage : les avions d'avant en profitent
  for (let n = 0; n < (e['+avions'] ?? 0); n++) etat.avions[camp].push(pvAvion(etat, camp));
}
/* Les points de vie d'un avion neuf ou réparé, au plus : ceux de la flotte, plus le blindage choisi */
export const pvAvion = (etat, camp) => Math.round(MITRAILLAGE.pv * modif(etat, camp, 'aerodrome.pv'));

// ─── L'infanterie (la soirée, troisième jet) : l'onglet « Infanterie » vaut pour tous les régiments du camp (Jérôme, 18 nov.) ; la corvée d'équipement de la v0.91.0 n'existe plus ───
/* Le facteur d'infanterie `cle` ('obus', 'melee', 'portee', 'mortBlesse', 'retour', 'tranchee', 'tir') pour les régiments de `camp` */
export const infanterie = (etat, camp, cle) => modif(etat, camp, `infanterie.${cle}`);
