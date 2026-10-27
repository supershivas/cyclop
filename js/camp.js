// Le camp : la règle, sans écran (Jérôme, v0.86.0 : lot 1 de `docs/chantiers/camp-et-ameliorations.md`). Logique pure : aucun DOM, aucune horloge, aucun hasard.
// L'état est `etat.camp` : la dotation de l'état-major, le niveau de chaque bâtiment (et son chantier d'une nuit), les lignes d'en face déjà comptées.
// Lot 2 : les niveaux ouvrent les ordres (`refusOrdre`). Lot 3 (v0.88.0) : chaque niveau et chaque choix de palier change un chiffre (`modif`) ou un effectif (`effectifsDe`).
import { BATIMENTS, DOTATION, CAMP_PLAN, PIEDS, EQUIPEMENT, EQUIPEMENTS } from './data/batiments.js?v=0.91.0';
import { MITRAILLAGE } from './data/mitraillage.js?v=0.91.0';

const NOUS = 0;
export const NIVEAU_MAX = 3;

// Le niveau qui ouvre chaque ordre de batterie (`ordonnerBarrage`) : [bâtiment, niveau]
const OUVERTURE = { '75': ['artillerie', 1], '155': ['artillerie', 2], '220': ['artillerie', 3], avion: ['aerodrome', 1], char: ['chars', 1], genie: ['sapeurs', 1] };

/* L'état du camp au premier matin : l'artillerie et la caserne au niveau 1 (donnés), le reste à bâtir */
export function campDeDepart({ bride = false } = {}) {
  const batiments = {};
  for (const [cle, B] of Object.entries(BATIMENTS)) batiments[cle] = { niveau: B.niveaux[0].depart ? 1 : 0, choix: [], chantier: null };
  // `bride` : les niveaux ouvrent les ordres (les 155 et 220, l'avion, le char, le génie) : vrai dans la partie du joueur ; faux pour les tests, le labo et le jeu à deux, où rien n'est bridé
  return { dotation: DOTATION.depart, batiments, lignes: [], bride };
}

export const niveauDe = (etat, cle) => etat.camp?.batiments[cle]?.niveau ?? 0;
/* Le prix du niveau `vers` (1 à 3) */
export const coutDe = (cle, vers) => BATIMENTS[cle]?.niveaux[vers - 1]?.cout ?? 0;
/* Les choix pris aux paliers d'un bâtiment, par leur nom : la liste lue par les règles qui en dépendent (lot 3) */
export const choisis = (etat, cle) => (etat.camp?.batiments[cle]?.choix ?? []).map((i, k) => i == null ? null : BATIMENTS[cle].niveaux[k + 1]?.choix?.[i]?.[0] ?? null).filter(Boolean);
/* Un chantier dure une nuit ; le niveau 3 en prend deux, sauf avec « Équipe de nuit » (maison des sapeurs, niveau 3) */
export const nuitsDe = (etat, vers) => vers >= 3 && !choisis(etat, 'sapeurs').includes('Équipe de nuit') ? 2 : 1;

/* Pourquoi on ne peut pas bâtir ou améliorer `cle` jusqu'au niveau suivant, avec le choix `choix` (0 ou 1, exigé aux niveaux 2 et 3) : une phrase, ou null si c'est permis (conventions : un ordre impossible se refuse à voix haute) */
export function refusCamp(etat, cle, choix = null) {
  const B = BATIMENTS[cle], c = etat.camp?.batiments[cle];
  if (!B || !c) return 'Ce bâtiment n\'existe pas.';
  if (etat.phase === 'fin') return 'La bataille est finie.';
  if (c.chantier) return `${B.nom} est en chantier : il sera fini à l'aube.`;
  if (c.niveau >= NIVEAU_MAX) return `${B.nom} est déjà au niveau maximal.`;
  const vers = c.niveau + 1, N = B.niveaux[vers - 1], manque = N.cout - etat.camp.dotation;
  if (manque > 0) return `${manque} point${manque > 1 ? 's' : ''} de dotation manque${manque > 1 ? 'nt' : ''} pour ${N.nom.toLowerCase()} (${N.cout} points, ${etat.camp.dotation} en caisse).`;
  if (N.choix && !(choix === 0 || choix === 1)) return `Choisissez : ${N.choix[0][0].toLowerCase()} ou ${N.choix[1][0].toLowerCase()}.`;
  return null;
}

/* Ordonner le chantier : rend { ok, vers, nuits } ou { refus } ; la dotation est payée tout de suite, le niveau vient à l'aube */
export function ordonnerChantier(etat, cle, choix = null) {
  const refus = refusCamp(etat, cle, choix);
  if (refus) return { refus };
  const c = etat.camp.batiments[cle], vers = c.niveau + 1, N = BATIMENTS[cle].niveaux[vers - 1];
  etat.camp.dotation -= N.cout;
  c.chantier = { vers, nuits: nuitsDe(etat, vers), choix: N.choix ? choix : null };
  return { ok: true, vers, nuits: c.chantier.nuits };
}

/* Les tronçons que nous tenons, par ligne d'en face : { rang: [tenus, en tout] } et le total de nos lignes [tenus, en tout] */
function lignes(B) {
  const eux = {}, nos = [0, 0];
  B.troncons.forEach((tr, k) => {
    const L = B.lignes[tr.ligne], tenu = B.etat.troncons[k] === NOUS;
    if (L.camp === NOUS) { nos[1]++; if (tenu) nos[0]++; } else { const e = eux[L.rang] ??= [0, 0]; e[1]++; if (tenu) e[0]++; }
  });
  return { eux, nos };
}

/* L'aube : les chantiers avancent d'une nuit (le niveau vient à la dernière), puis la dotation tombe.
   Rend le détail pour le papier de la nuit : { points, aube, tenue, lignes, finis: [clé, niveau] } */
export function dotationAube(B) {
  const { etat } = B, camp = etat.camp, out = { points: 0, aube: DOTATION.aube, tenue: 0, lignes: 0, finis: [] };
  for (const [cle, c] of Object.entries(camp.batiments)) {
    if (!c.chantier) continue;
    if (--c.chantier.nuits > 0) continue;
    c.niveau = c.chantier.vers;
    if (c.chantier.choix != null) c.choix[c.niveau - 2] = c.chantier.choix;
    if (camp.bride) monter(etat, cle, c.niveau, c.chantier.choix);      // les effectifs ne montent que dans la partie bridée
    c.chantier = null; out.finis.push([cle, c.niveau]);
  }
  const { eux, nos } = lignes(B);
  if (nos[1] && nos[0] >= nos[1] * DOTATION.tenue.seuil) out.tenue = DOTATION.tenue.points;
  for (const [rang, [tenus, total]] of Object.entries(eux)) {
    if (total && tenus >= total * DOTATION.tenue.seuil && !camp.lignes.includes(+rang)) { camp.lignes.push(+rang); out.lignes += DOTATION.ligne; }
  }
  out.points = out.aube + out.tenue + out.lignes;
  camp.dotation += out.points;
  return out;
}

/* Pourquoi le camp ne donne pas cet ordre (`cal` : '75', '155', '220', 'avion', 'char', 'genie') : une phrase, ou null. Seulement dans la partie bridée, et pour nous */
export function refusOrdre(etat, camp, cal) {
  if (camp !== NOUS || !etat.camp?.bride || !OUVERTURE[cal]) return null;
  const [cle, n] = OUVERTURE[cal], B = BATIMENTS[cle], niveau = niveauDe(etat, cle);
  if (niveau >= n) return null;
  if (etat.camp.batiments[cle].chantier) return `${B.nom} est en chantier : fini à l'aube.`;
  return niveau === 0 ? `${B.nom} n'est pas encore bâti.` : `${B.nom} : cet ordre s'ouvre au niveau ${n} (il est au niveau ${niveau}).`;
}
/* Le nid de mitrailleuse refait par le génie demande la maison des sapeurs au niveau 2 */
export function refusNid(etat, camp) {
  if (camp !== NOUS || !etat.camp?.bride || niveauDe(etat, 'sapeurs') >= 2) return null;
  return 'Refaire un nid de mitrailleuse demande la maison des sapeurs au niveau 2.';
}

/* Où est chaque bâtiment : { cle, x, y, w, d } (le centre et l'emprise, en coordonnées du terrain : les marges sont ajoutées) ; seulement ceux qui sont bâtis ou en chantier */
export function emprisesCamp(etat) {
  const m = etat.marges ?? { x: 0, y: 0 }, out = [];
  for (const [cle, [dx, dy]] of Object.entries(CAMP_PLAN.ligne)) {
    const c = etat.camp?.batiments[cle];
    if (c && (c.niveau || c.chantier)) out.push({ cle, x: m.x + CAMP_PLAN.x + dx, y: m.y + CAMP_PLAN.y + dy, w: PIEDS[cle][0], d: PIEDS[cle][1] });
  }
  return out;
}
/* Le bâtiment sous un point du terrain (à `marge` m près), ou null */
export function batimentSous(etat, x, y, marge = 0) {
  return emprisesCamp(etat).find(e => Math.abs(x - e.x) <= e.w / 2 + marge && Math.abs(y - e.y) <= e.d / 2 + marge)?.cle ?? null;
}

// ─── Ce que les niveaux et les choix changent (lot 3) ───
/* Le facteur d'un modificateur (`'artillerie.recharge'`, `'chars.pv'`…) pour `camp` : le produit des `effets` des niveaux atteints du bâtiment qui le porte (le préfixe) et du choix pris à chaque palier. 1 hors de la partie bridée et pour en face : rien ne change chez eux. */
export function modif(etat, camp, cle) {
  if (camp !== NOUS || !etat.camp?.bride) return 1;
  const bat = cle.split('.')[0], c = etat.camp.batiments[bat];
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
const effectifDe = (cle, niveau, champ) => BATIMENTS[cle].niveaux[niveau - 1]?.[champ];
/* Les effectifs du départ de la partie bridée : ceux des bâtiments de départ (2 régiments en réserve à la caserne) ; les avions et les sections du génie viennent avec leur bâtiment */
export function appliquerDepart(etat) {
  etat.reserves[NOUS] = effectifDe('caserne', 1, 'reserves');
  etat.sapeurs[NOUS] = 0;
  etat.avions[NOUS] = [];
}
/* Un bâtiment atteint `niveau` (avec le choix `choix` du palier) : ses effectifs montent d'autant, sauf ce que la partie a déjà perdu (les sections parties au travail, les avions abattus restent perdus) */
function monter(etat, cle, niveau, choix) {
  const avant = niveau > 1 ? BATIMENTS[cle].niveaux[niveau - 2] : null, N = BATIMENTS[cle].niveaux[niveau - 1];
  const plus = champ => N[champ] != null ? N[champ] - (avant?.[champ] ?? 0) : 0;
  if (cle === 'caserne') etat.reserves[NOUS] += plus('reserves');
  if (cle === 'sapeurs') etat.sapeurs[NOUS] += plus('sections');
  const eff = choix != null ? N.choix?.[choix]?.[2] : null;
  if (eff?.['+reserves']) etat.reserves[NOUS] += eff['+reserves'];
  if (cle === 'aerodrome') {
    if (eff?.['aerodrome.pv']) etat.avions[NOUS] = etat.avions[NOUS].map(pv => pv > 0 ? Math.round(pv * eff['aerodrome.pv']) : 0);      // le blindage : les avions d'avant en profitent
    for (let k = 0; k < plus('avions'); k++) etat.avions[NOUS].push(pvAvion(etat, NOUS));
  }
}
/* Les points de vie d'un avion neuf ou réparé, au plus : ceux de la flotte, plus le blindage choisi */
export const pvAvion = (etat, camp) => Math.round(MITRAILLAGE.pv * modif(etat, camp, 'aerodrome.pv'));

// ─── L'équipement des régiments (lot 4) : la corvée de nuit `eq-…` (nuit.js) ───
/* Pourquoi on ne peut pas donner cette pièce (`cle` : une clé de EQUIPEMENTS) à ce régiment : une phrase, ou null */
export function refusEquiper(B, reg, cle) {
  const { etat } = B, c = etat.camp;
  if (!EQUIPEMENTS[cle]) return 'Pas de telle pièce d\'équipement.';
  if (reg.camp !== NOUS || !c?.bride) return 'Seule la caserne de notre camp équipe un régiment.';
  if (niveauDe(etat, 'caserne') < EQUIPEMENT.niveauCaserne) return `Équiper un régiment demande la caserne au niveau ${EQUIPEMENT.niveauCaserne}.`;
  if (reg.equip?.includes(cle)) return `${reg.nom} a déjà ${EQUIPEMENTS[cle].court.toLowerCase()}.`;
  if ((reg.equip?.length ?? 0) >= EQUIPEMENT.places) return `${reg.nom} porte déjà tout ce qu'il peut : ${EQUIPEMENT.places} pièces.`;
  if (c.dotation < EQUIPEMENT.cout) return `Il manque ${EQUIPEMENT.cout - c.dotation} point de dotation pour ${EQUIPEMENTS[cle].court.toLowerCase()}.`;
  return null;
}
/* Donner la pièce, la nuit : paie un point et la note sur le régiment ; rend faux (sans rien changer) si la caisse s'est vidée depuis l'ordre */
export function equiper(B, reg, cle) {
  if (refusEquiper(B, reg, cle)) return false;
  B.etat.camp.dotation -= EQUIPEMENT.cout;
  (reg.equip ??= []).push(cle);
  return true;
}
/* Le facteur d'une pièce pour un régiment (1 s'il ne la porte pas) */
export const facteurEquip = (reg, cle, champ) => reg?.equip?.includes(cle) ? EQUIPEMENTS[cle][champ] : 1;
