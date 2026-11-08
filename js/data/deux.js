// Le jeu à deux : les réglages de la partie que l'hôte choisit avec le secteur (Jérôme, retours du 7 nov.) et le duel aux points.
// Les deux machines reçoivent les mêmes choix dans `init` (main.js) et créent la même bataille : rien ici ne dépend de la machine.
// Les nombres du duel sont des PROPOSITIONS, à régler d'après une partie scriptée (`test/bataille.test.mjs`, « duel »).

// Chaque réglage : { cle: { nom, desc, … la valeur } } ; le premier choix de `defaut` est celui d'un premier lancement.
export const DUREES_DEUX = {
  courte:  { nom: 'Courte',  jours: 3,    desc: 'Trois jours : une soirée.' },
  moyenne: { nom: 'Moyenne', jours: 6,    desc: 'Six jours.' },
  longue:  { nom: 'Longue',  jours: null, desc: 'La durée du secteur : 10 à 15 jours.' },
};
// Les régiments frais en réserve, par camp (la relève et les renforts) : `n` null = ceux du secteur
export const RENFORTS_DEUX = {
  aucun:   { nom: 'Aucun',   n: 0,    desc: 'Pas de relève : on se bat avec ce qu’on a.' },
  peu:     { nom: 'Peu',     n: 2,    desc: 'Deux régiments frais par camp.' },
  secteur: { nom: 'Normal',  n: null, desc: 'Ceux du secteur (quatre en général).' },
  beaucoup: { nom: 'Beaucoup', n: 6,  desc: 'Six régiments frais par camp.' },
};
// La dotation de l'état-major (de départ et de chaque aube), le même facteur pour les deux camps
export const DOTATIONS_DEUX = {
  faible:  { nom: 'Faible',  mult: 0.5, desc: 'Moitié moins de points pour améliorer le camp.' },
  normale: { nom: 'Normale', mult: 1,   desc: 'La dotation habituelle.' },
  large:   { nom: 'Large',   mult: 2,   desc: 'Deux fois plus de points : le camp monte vite.' },
};
// Les effectifs de chaque camp (les mêmes des deux côtés), en part de ceux du secteur
export const EFFECTIFS_DEUX = {
  petits:  { nom: 'Petits',  mult: 0.5, desc: 'Moitié moins d’hommes : des parties plus vives.' },
  normaux: { nom: 'Normaux', mult: 1,   desc: 'Ceux du secteur.' },
  grands:  { nom: 'Grands',  mult: 1.5, desc: 'Une fois et demie : la partie pèse sur les machines.' },
};
export const ANTICIPEE_DEUX = {
  oui: { nom: 'Oui', desc: 'Un camp qui prend assez d’avance aux points gagne avant le terme.' },
  non: { nom: 'Non', desc: 'La partie va jusqu’à son dernier soir.' },
};
export const DEFAUTS_DEUX = { duree: 'courte', renforts: 'secteur', dotation: 'normale', effectifs: 'normaux', anticipee: 'oui' };

// Ce que l'hôte envoie, validé par l'invité : des clés connues seulement
const TABLES = { duree: DUREES_DEUX, renforts: RENFORTS_DEUX, dotation: DOTATIONS_DEUX, effectifs: EFFECTIFS_DEUX, anticipee: ANTICIPEE_DEUX };
export function optionsDeuxValides(o) {
  if (!o || typeof o !== 'object') return false;
  return Object.entries(TABLES).every(([k, T]) => typeof o[k] === 'string' && Object.hasOwn(T, o[k]));
}
// Les clés (ou les défauts) → ce que `nouvelleBataille` lit
export function optionsDeuxEnBataille(o) {
  const c = { ...DEFAUTS_DEUX, ...(o ?? {}) };
  return {
    jours: DUREES_DEUX[c.duree].jours ?? undefined, reserves: RENFORTS_DEUX[c.renforts].n ?? undefined,
    dotationMult: DOTATIONS_DEUX[c.dotation].mult, effectifsMult: EFFECTIFS_DEUX[c.effectifs].mult, anticipee: c.anticipee === 'oui',
  };
}
export const resumeDeux = o => {
  const c = { ...DEFAUTS_DEUX, ...(o ?? {}) };
  return `${DUREES_DEUX[c.duree].nom.toLowerCase()} · renforts : ${RENFORTS_DEUX[c.renforts].nom.toLowerCase()} · dotation ${DOTATIONS_DEUX[c.dotation].nom.toLowerCase()} · effectifs ${EFFECTIFS_DEUX[c.effectifs].nom.toLowerCase()} · victoire anticipée : ${ANTICIPEE_DEUX[c.anticipee].nom.toLowerCase()}`;
};

// Le duel aux points (le jeu à deux n'a plus de mission tirée au hasard : les deux camps ont le même but)
export const DUEL = {
  prise: 10,            // points par soir pour qui tient TOUTES les tranchées d'en face (au prorata des tronçons tenus)
  pertesPour: 25,       // hommes d'en face tombés pour 1 point
  ecartParJour: 3,      // victoire anticipée : l'écart de points qui finit la bataille = ceci × le nombre de jours, au plus `ecartMax` (mesuré : scripts/mesure-duel.mjs ; à 5 par jour, des déroutes à 24 points d'écart sur 6 jours allaient jusqu'au terme)
  ecartMax: 20,         // (une longue bataille ne demande pas plus : l'écart reste atteignable en quelques soirs)
  effondrement: 0.4,    // un camp dont les lignes tombent sous cette part (ou sans plus un homme) perd aussitôt
};
