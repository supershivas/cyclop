// Le camp : la règle, sans écran (Jérôme, v0.84.0 : lot 1 de `docs/chantiers/camp-et-ameliorations.md`). Logique pure : aucun DOM, aucune horloge, aucun hasard.
// L'état est `etat.camp` : la dotation de l'état-major, le niveau de chaque bâtiment (et son chantier d'une nuit), les lignes d'en face déjà comptées.
// Lot 1 : la dotation tombe à l'aube et les chantiers s'achèvent, mais AUCUN niveau ne bride encore un ordre (les batteries, l'avion, le char, le génie se donnent comme avant).
import { BATIMENTS, DOTATION } from './data/batiments.js?v=0.85.0';

const NOUS = 0;
export const NIVEAU_MAX = 3;

/* L'état du camp au premier matin : l'artillerie et la caserne au niveau 1 (donnés), le reste à bâtir */
export function campDeDepart() {
  const batiments = {};
  for (const [cle, B] of Object.entries(BATIMENTS)) batiments[cle] = { niveau: B.niveaux[0].depart ? 1 : 0, choix: [], chantier: null };
  return { dotation: DOTATION.depart, batiments, lignes: [] };
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
