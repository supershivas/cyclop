/* Qui est ce soldat : un nom, un âge, un grade, tirés d'une graine d'identité
   (celle de la bataille, ou celle de la campagne pour nos hommes ; voir
   `nouvelleBataille`) et de son numéro : il garde les mêmes d'une partie relue à l'autre.
   Et ce qu'il endure : la fatigue (jambes, bras), une blessure, la peur, dits en
   mots. Logique pure (aucun DOM), testée dans Node. */
import { hash2 } from './lib/rng.js?v=0.52.6';
import { NOMS } from './data/noms.js?v=0.52.6';

export const PARTIES = ['', 'bras', 'jambe', 'tête'];

/* id : le numéro du soldat ; k : son rang de création dans son régiment, n :
   l'effectif de départ du régiment. Le grade suit la hiérarchie d'un régiment :
   un capitaine, deux lieutenants, un adjudant, un sergent pour douze hommes, un
   caporal pour six, puis les soldats (un sur quatre de 1re classe). */
export function grade(k, n) {
  if (k === 0) return 0;
  if (k <= 2) return k;
  if (k === 3) return 3;
  if (k < 4 + Math.round(n / 12)) return 4;
  if (k < 4 + Math.round(n / 12) + Math.round(n / 6)) return 5;
  return 6;
}
export function identite(graine, camp, id, k = 99, n = 125, promu = -1) {
  const L = NOMS[camp ? 'eux' : 'nous'];
  const h = q => hash2(id, q, (graine | 0) + camp * 7919);
  const prenom = L.prenoms[Math.floor(h(1) * L.prenoms.length)];
  const nom = L.noms[Math.floor(h(2) * L.noms.length)];
  let g = promu >= 0 ? promu : grade(k, n);      // promu : le rang qu'on lui a donné (un gradé tombé)
  if (g === 6 && h(6) >= 0.25) g = 7;                         // 2e classe
  // l'âge : surtout entre 20 et 30 ans, les réservistes jusqu'à 42 ; les officiers plus vieux
  const age = g <= 3 ? 26 + Math.floor(h(3) * 18) : 19 + Math.floor(h(3) * h(4) * 23 + h(5) * 4);
  return { prenom, nom, age, grade: L.grades[g], rang: g };
}

// Ce qu'il a vu du feu, en quelques mots (ou rien, s'il n'a encore rien vu)
// Les chevrons d'un régiment (0 à 3) selon l'expérience moyenne de ses hommes : les mêmes seuils que les mots (v0.20.0)
export const chevrons = exp => exp >= 0.6 ? 3 : exp >= 0.25 ? 2 : exp >= 0.08 ? 1 : 0;
export function experienceEnMots(exp) {
  return exp >= 0.6 ? 'aguerri' : exp >= 0.25 ? 'a vu le feu' : exp >= 0.08 ? 'a reçu le baptême du feu' : '';
}

// L'état d'un soldat en quelques mots : [« blessé au bras », « jambes lourdes », « a peur »…]
export function etatEnMots(fatJ, fatB, peur, blessure) {
  const mots = [];
  if (blessure) mots.push(blessure === 3 ? 'blessé à la tête' : `blessé ${blessure === 1 ? 'au bras' : 'à la jambe'}`);
  if (fatJ > 0.75) mots.push('jambes épuisées'); else if (fatJ > 0.4) mots.push('jambes lourdes');
  if (fatB > 0.75) mots.push('bras morts de fatigue'); else if (fatB > 0.4) mots.push('bras las');
  if (peur > 0.85) mots.push('terrifié'); else if (peur > 0.55) mots.push('a peur'); else if (peur > 0.25) mots.push('inquiet');
  return mots.length ? mots : ['reposé, calme'];
}

// Le prochain grade d'un homme (v0.35.0) : celui du rang juste au-dessus, pris quand un supérieur tombe (`promouvoir` de bataille.js). Rien
// pour un capitaine ; un soldat de 2e classe n'a qu'une classe à gagner chez nous (en face, les deux sont des Musketier).
export function prochainGrade(camp, rang) {
  if (rang <= 0) return '';
  const G = NOMS[camp ? 'eux' : 'nous'].grades, suivant = G[rang - 1];
  return suivant === G[rang] ? '' : suivant;
}

// Les mots des jauges de la fiche (v0.35.0), aux mêmes seuils que `etatEnMots`
export const peurEnMots = p => p > 0.85 ? 'terrifié' : p > 0.55 ? 'a peur' : p > 0.25 ? 'inquiet' : 'calme';
export const fatigueEnMots = f => f > 0.75 ? 'épuisé' : f > 0.4 ? 'lourd' : 'frais';
