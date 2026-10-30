// Le camp : la règle, sans écran (Jérôme, v0.86.0 : lot 1 de `docs/chantiers/camp-et-ameliorations.md`). Logique pure : aucun DOM, aucune horloge, aucun hasard.
// L'état est `etat.camp` : la dotation de l'état-major, le niveau de chaque bâtiment (et son chantier d'une nuit), les lignes d'en face déjà comptées.
// Lot 2 : les niveaux ouvrent les ordres (`refusOrdre`). Lot 3 (v0.88.0) : chaque niveau et chaque choix de palier change un chiffre (`modif`) ou un effectif (`effectifsDe`).
import { hash2 } from './lib/rng.js?v=0.99.1';
import { BATIMENTS, DOTATION, CAMP_PLAN, CAMP_IA, PIEDS, EQUIPEMENT, EQUIPEMENTS } from './data/batiments.js?v=0.99.1';
import { MITRAILLAGE } from './data/mitraillage.js?v=0.99.1';

const NOUS = 0, EUX = 1;
/* L'état du camp de `camp` : `etat.camp` (le nôtre), `etat.campEux` (celui d'en face : v0.92.0) */
export const campDe = (etat, camp = NOUS) => camp === NOUS ? etat.camp : etat.campEux;
export const NIVEAU_MAX = 3;

// Le niveau qui ouvre chaque ordre de batterie (`ordonnerBarrage`) : [bâtiment, niveau]
const OUVERTURE = { '75': ['artillerie', 1], '155': ['artillerie', 1], '220': ['artillerie', 1], avion: ['aerodrome', 1], char: ['chars', 1], genie: ['sapeurs', 1] };

/* Le bâtiment et le niveau qui ouvrent un ordre de batterie, ou null */
export const ouverture = cal => OUVERTURE[cal] ?? null;

/* L'état du camp au premier matin : tous les bâtiments au niveau 1 (donnés : les trois artilleries, l'avion, le char, le génie et la relève sont prêts, v0.98.0) ; les niveaux suivants s'achètent avec la dotation (0 au départ) */
export function campDeDepart({ bride = false, depart = null, mult = 1 } = {}) {
  const batiments = {};
  // `depart` : les niveaux et les choix d'une bataille précédente de la campagne ({ clé: { niveau, choix } }) ; ils ne descendent jamais sous ceux du départ
  for (const [cle, B] of Object.entries(BATIMENTS)) {
    const d = depart?.[cle], base = B.niveaux[0].depart ? 1 : 0;
    batiments[cle] = { niveau: Math.max(base, d?.niveau ?? 0), choix: d?.niveau > base ? [...(d.choix ?? [])] : [], chantier: null };
  }
  // `bride` : les niveaux améliorent les unités (v0.98.0 ; avant, ils ouvraient les ordres : les 155 et 220, l'avion, le char, le génie) : vrai dans la partie du joueur ; faux pour les tests, le labo et le jeu à deux, où rien n'est bridé
  return { dotation: DOTATION.depart, batiments, lignes: [], bride, mult };      // `mult` : le facteur de la dotation (la difficulté, pour en face)
}

export const niveauDe = (etat, cle, camp = NOUS) => campDe(etat, camp)?.batiments[cle]?.niveau ?? 0;
/* Le prix du niveau `vers` (1 à 3) */
export const coutDe = (cle, vers) => BATIMENTS[cle]?.niveaux[vers - 1]?.cout ?? 0;
/* Les choix pris aux paliers d'un bâtiment, par leur nom : la liste lue par les règles qui en dépendent (lot 3) */
export const choisis = (etat, cle, camp = NOUS) => (campDe(etat, camp)?.batiments[cle]?.choix ?? []).map((i, k) => i == null ? null : BATIMENTS[cle].niveaux[k + 1]?.choix?.[i]?.[0] ?? null).filter(Boolean);
/* Un chantier dure une nuit ; le niveau 3 en prend deux, sauf avec « Équipe de nuit » (maison des sapeurs, niveau 3) */
export const nuitsDe = (etat, vers, camp = NOUS) => vers >= 3 && !choisis(etat, 'sapeurs', camp).includes('Équipe de nuit') ? 2 : 1;

/* Pourquoi on ne peut pas bâtir ou améliorer `cle` jusqu'au niveau suivant, avec le choix `choix` (0 ou 1, exigé aux niveaux 2 et 3) : une phrase, ou null si c'est permis (conventions : un ordre impossible se refuse à voix haute) */
export function refusCamp(etat, cle, choix = null, camp = NOUS) {
  const B = BATIMENTS[cle], K = campDe(etat, camp), c = K?.batiments[cle];
  if (!B || !c) return 'Ce bâtiment n\'existe pas.';
  if (etat.phase === 'fin') return 'La bataille est finie.';
  if (c.chantier) return `${B.nom} est en chantier : il sera fini à l'aube.`;
  if (c.niveau >= NIVEAU_MAX) return `${B.nom} est déjà au niveau maximal.`;
  const vers = c.niveau + 1, N = B.niveaux[vers - 1], manque = N.cout - K.dotation;
  if (manque > 0) return `${manque} point${manque > 1 ? 's' : ''} de dotation manque${manque > 1 ? 'nt' : ''} pour ${N.nom.toLowerCase()} (${N.cout} points, ${K.dotation} en caisse).`;
  if (N.choix && !(choix === 0 || choix === 1)) return `Choisissez : ${N.choix[0][0].toLowerCase()} ou ${N.choix[1][0].toLowerCase()}.`;
  return null;
}

/* Ordonner le chantier : rend { ok, vers, nuits } ou { refus } ; la dotation est payée tout de suite, le niveau vient à l'aube */
export function ordonnerChantier(etat, cle, choix = null, camp = NOUS) {
  const refus = refusCamp(etat, cle, choix, camp);
  if (refus) return { refus };
  const K = campDe(etat, camp), c = K.batiments[cle], vers = c.niveau + 1, N = BATIMENTS[cle].niveaux[vers - 1];
  K.dotation -= N.cout;
  c.chantier = { vers, nuits: nuitsDe(etat, vers, camp), choix: N.choix ? choix : null };
  return { ok: true, vers, nuits: c.chantier.nuits };
}

/* Les tronçons que `camp` tient, par ligne de l'autre camp : { rang: [tenus, en tout] }, et le total de ses lignes [tenus, en tout] */
function lignes(B, camp) {
  const eux = {}, nos = [0, 0];
  B.troncons.forEach((tr, k) => {
    const L = B.lignes[tr.ligne], tenu = B.etat.troncons[k] === camp;
    if (L.camp === camp) { nos[1]++; if (tenu) nos[0]++; } else { const e = eux[L.rang] ??= [0, 0]; e[1]++; if (tenu) e[0]++; }
  });
  return { eux, nos };
}

/* L'aube d'un camp : ses chantiers avancent d'une nuit (le niveau vient à la dernière), puis sa dotation tombe (× `mult`). Rend { points, aube, tenue, lignes, finis: [clé, niveau] } */
function aubeDe(B, camp) {
  const { etat } = B, K = campDe(etat, camp), out = { points: 0, aube: DOTATION.aube, tenue: 0, lignes: 0, finis: [] };
  for (const [cle, c] of Object.entries(K.batiments)) {
    if (!c.chantier) continue;
    if (--c.chantier.nuits > 0) continue;
    c.niveau = c.chantier.vers;
    if (c.chantier.choix != null) c.choix[c.niveau - 2] = c.chantier.choix;
    if (K.bride) monter(etat, cle, c.niveau, c.chantier.choix, camp);      // les effectifs ne montent que dans la partie bridée
    c.chantier = null; out.finis.push([cle, c.niveau]);
  }
  const { eux, nos } = lignes(B, camp);
  if (nos[1] && nos[0] >= nos[1] * DOTATION.tenue.seuil) out.tenue = DOTATION.tenue.points;
  for (const [rang, [tenus, total]] of Object.entries(eux)) {
    if (total && tenus >= total * DOTATION.tenue.seuil && !K.lignes.includes(+rang)) { K.lignes.push(+rang); out.lignes += DOTATION.ligne; }
  }
  out.points = (out.aube + out.tenue + out.lignes) * (K.mult ?? 1);
  K.dotation += out.points;
  return out;
}
/* L'aube des deux camps : rend le détail du nôtre (le papier de la nuit) ; en face bâtit seul (`iaBatir`) sauf à deux (un joueur le commande) */
export function dotationAube(B) {
  const { etat } = B, out = aubeDe(B, NOUS);
  out.camps = [out];
  if (etat.campEux) { out.camps.push(aubeDe(B, EUX)); if (!etat.deux) iaBatir(B); }      // à deux, le détail de chaque camp : chaque joueur lit le sien
  return out;
}
/* En face bâtit : tant qu'elle a de quoi payer, le premier palier du plan (`CAMP_IA.plan`) qu'elle n'a pas atteint, le choix du palier tiré d'un hachage de la graine ; un palier trop cher attend l'aube suivante (elle ne passe pas au suivant : ses sous sont pour lui) */
function iaBatir(B) {
  const { etat } = B, K = etat.campEux;
  if (!K?.bride) return;
  for (let tour = 0; tour < 6; tour++) {
    const pas = CAMP_IA.plan.find(([cle, n]) => niveauDe(etat, cle, EUX) < n && !K.batiments[cle].chantier);      // (un bâtiment en chantier passe son tour : le suivant du plan se bâtit en même temps)
    if (!pas) return;
    const [cle] = pas, choix = hash2(etat.graine | 0, niveauDe(etat, cle, EUX), 91) < 0.5 ? 0 : 1;
    if (!ordonnerChantier(etat, cle, choix, EUX).ok) return;
  }
}

/* Pourquoi le camp ne donne pas cet ordre (`cal` : '75', '155', '220', 'avion', 'char', 'genie') : une phrase, ou null. Seulement dans la partie bridée, et pour nous */
export function refusOrdre(etat, camp, cal) {
  const K = campDe(etat, camp);
  if (!K?.bride || !OUVERTURE[cal]) return null;
  const [cle, n] = OUVERTURE[cal], B = BATIMENTS[cle], niveau = niveauDe(etat, cle, camp);
  if (niveau >= n) return null;
  if (K.batiments[cle].chantier) return `${B.nom} est en chantier : fini à l'aube.`;
  return niveau === 0 ? `${B.nom} n'est pas encore bâti.` : `${B.nom} : cet ordre s'ouvre au niveau ${n} (il est au niveau ${niveau}).`;
}
/* Le nid de mitrailleuse refait par le génie demande la maison des sapeurs au niveau 2 */
export function refusNid(etat, camp) {
  if (!campDe(etat, camp)?.bride || niveauDe(etat, 'sapeurs', camp) >= 2) return null;
  return 'Refaire un nid de mitrailleuse demande la maison des sapeurs au niveau 2.';
}

/* La place de `cle` dans le camp de `camp` : { cle, camp, x, y, w, d, rot } (le centre et l'emprise, en coordonnées du terrain : les marges sont ajoutées), bâtie ou non */
export function emplacementCamp(etat, cle, camp = NOUS) {
  const m = etat.marges ?? { x: 0, y: 0 }, [dx, dy] = CAMP_PLAN.ligne[cle];
  // le camp d'en face : le nôtre tourné d'un demi-tour autour du centre du secteur (au nord, ses bâtiments tournés vers le sud)
  const X = CAMP_PLAN.x + dx, Y = CAMP_PLAN.y + dy;
  return { cle, camp, x: m.x + (camp === NOUS ? X : CAMP_PLAN.largeur - X), y: m.y + (camp === NOUS ? Y : CAMP_PLAN.hauteur - Y), w: PIEDS[cle][0], d: PIEDS[cle][1], rot: camp === NOUS ? 0 : Math.PI };
}
/* Où est chaque bâtiment qui est bâti ou en chantier */
export function emprisesCamp(etat, camp = NOUS) {
  const K = campDe(etat, camp);
  return Object.keys(CAMP_PLAN.ligne).filter(cle => { const c = K?.batiments[cle]; return c && (c.niveau || c.chantier); }).map(cle => emplacementCamp(etat, cle, camp));
}

/* La place de tout le camp, bâti ou non (les cinq emplacements) : { x0, x1, y0, y1 } en coordonnées du terrain ; la caméra le cadre en entier (v0.96.0) */
export function etendueCamp(etat, camp = NOUS) {
  const m = etat.marges ?? { x: 0, y: 0 }, e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const [cle, [dx, dy]] of Object.entries(CAMP_PLAN.ligne)) {
    const X = CAMP_PLAN.x + dx, Y = CAMP_PLAN.y + dy, x = m.x + (camp === NOUS ? X : CAMP_PLAN.largeur - X), y = m.y + (camp === NOUS ? Y : CAMP_PLAN.hauteur - Y);
    e.x0 = Math.min(e.x0, x - PIEDS[cle][0] / 2); e.x1 = Math.max(e.x1, x + PIEDS[cle][0] / 2); e.y0 = Math.min(e.y0, y - PIEDS[cle][1] / 2); e.y1 = Math.max(e.y1, y + PIEDS[cle][1] / 2);
  }
  return e;
}
/* Le bâtiment sous un point du terrain (à `marge` m près), ou null */
export function batimentSous(etat, x, y, marge = 0, camp = NOUS) {
  return emprisesCamp(etat, camp).find(e => Math.abs(x - e.x) <= e.w / 2 + marge && Math.abs(y - e.y) <= e.d / 2 + marge)?.cle ?? null;
}

// ─── Ce que les niveaux et les choix changent (lot 3) ───
/* Le facteur d'un modificateur (`'artillerie.recharge'`, `'chars.pv'`…) pour `camp` : le produit des `effets` des niveaux atteints du bâtiment qui le porte (le préfixe) et du choix pris à chaque palier. 1 hors de la partie bridée (le camp d'en face compte depuis la v0.92.0). */
export function modif(etat, camp, cle) {
  const K = campDe(etat, camp);
  if (!K?.bride) return 1;
  const bat = cle.split('.')[0], c = K.batiments[bat];
  if (!c?.niveau) return 1;
  let f = 1;
  BATIMENTS[bat].niveaux.slice(0, c.niveau).forEach((N, k) => {
    if (N.effets?.[cle]) f *= N.effets[cle];
    const i = k >= 1 ? c.choix[k - 1] : null;
    if (i != null && N.choix?.[i]?.[2]?.[cle]) f *= N.choix[i][2][cle];
  });
  return f;
}
/* Le facteur de recharge d'une batterie (`cal` : '75', '155', '220', 'avion', 'char', 'genie') */
export function rechargeDe(etat, camp, cal) {
  if (cal === 'avion') return modif(etat, camp, 'aerodrome.recharge');
  if (cal === 'char') return modif(etat, camp, 'chars.recharge');
  if (cal === 'genie') return 1;
  return modif(etat, camp, 'artillerie.recharge') * (cal === '220' ? modif(etat, camp, 'artillerie.recharge220') : 1);
}
/* Les effectifs du départ de la partie bridée : ceux des bâtiments de départ (2 régiments en réserve à la caserne), puis ce que les niveaux déjà atteints (une campagne les reporte : `campDeDepart({ depart })`) ajoutent ; les avions et les sections du génie viennent avec leur bâtiment */
export function appliquerDepart(etat, camp = NOUS) {
  etat.reserves[camp] = 0;
  etat.sapeurs[camp] = 0;
  etat.avions[camp] = [];
  const K = campDe(etat, camp);
  for (const [cle, c] of Object.entries(K.batiments)) {
    for (let n = 1; n <= c.niveau; n++) monter(etat, cle, n, n >= 2 ? c.choix[n - 2] ?? null : null, camp);
  }
}
/* Un bâtiment atteint `niveau` (avec le choix `choix` du palier) : ses effectifs montent d'autant, sauf ce que la partie a déjà perdu (les sections parties au travail, les avions abattus restent perdus) */
function monter(etat, cle, niveau, choix, camp = NOUS) {
  const avant = niveau > 1 ? BATIMENTS[cle].niveaux[niveau - 2] : null, N = BATIMENTS[cle].niveaux[niveau - 1];
  const plus = champ => N[champ] != null ? N[champ] - (avant?.[champ] ?? 0) : 0;
  if (cle === 'caserne') etat.reserves[camp] += plus('reserves');
  if (cle === 'sapeurs') etat.sapeurs[camp] += plus('sections');
  const eff = choix != null ? N.choix?.[choix]?.[2] : null;
  if (eff?.['+reserves']) etat.reserves[camp] += eff['+reserves'];
  if (cle === 'aerodrome') {
    if (eff?.['aerodrome.pv']) etat.avions[camp] = etat.avions[camp].map(pv => pv > 0 ? Math.round(pv * eff['aerodrome.pv']) : 0);      // le blindage : les avions d'avant en profitent
    for (let k = 0; k < plus('avions'); k++) etat.avions[camp].push(pvAvion(etat, camp));
  }
}
/* Les points de vie d'un avion neuf ou réparé, au plus : ceux de la flotte, plus le blindage choisi */
export const pvAvion = (etat, camp) => Math.round(MITRAILLAGE.pv * modif(etat, camp, 'aerodrome.pv'));

// ─── L'équipement des régiments (lot 4) : la corvée de nuit `eq-…` (nuit.js) ───
/* Pourquoi on ne peut pas donner cette pièce (`cle` : une clé de EQUIPEMENTS) à ce régiment : une phrase, ou null */
export function refusEquiper(B, reg, cle) {
  const { etat } = B, c = campDe(etat, reg.camp);
  if (!EQUIPEMENTS[cle]) return 'Pas de telle pièce d\'équipement.';
  if (!c?.bride) return 'Pas de caserne dans cette partie.';
  if (niveauDe(etat, 'caserne', reg.camp) < EQUIPEMENT.niveauCaserne) return `Équiper un régiment demande la caserne au niveau ${EQUIPEMENT.niveauCaserne}.`;
  if (reg.equip?.includes(cle)) return `${reg.nom} a déjà ${EQUIPEMENTS[cle].court.toLowerCase()}.`;
  if ((reg.equip?.length ?? 0) >= EQUIPEMENT.places) return `${reg.nom} porte déjà tout ce qu'il peut : ${EQUIPEMENT.places} pièces.`;
  if (c.dotation < EQUIPEMENT.cout) return `Il manque ${EQUIPEMENT.cout - c.dotation} point de dotation pour ${EQUIPEMENTS[cle].court.toLowerCase()}.`;
  return null;
}
/* Donner la pièce, la nuit : paie un point et la note sur le régiment ; rend faux (sans rien changer) si la caisse s'est vidée depuis l'ordre */
export function equiper(B, reg, cle) {
  if (refusEquiper(B, reg, cle)) return false;
  campDe(B.etat, reg.camp).dotation -= EQUIPEMENT.cout;
  (reg.equip ??= []).push(cle);
  return true;
}
/* Le facteur d'une pièce pour un régiment (1 s'il ne la porte pas) */
export const facteurEquip = (reg, cle, champ) => reg?.equip?.includes(cle) ? EQUIPEMENTS[cle][champ] : 1;
