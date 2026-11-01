// Les chevrons et leurs bonus (Jérôme, lot E de la 1re série de playtests ; courbe mesurée avec scripts/mesure-xp.mjs : avec les anciens seuils 0,08 / 0,25 / 0,6, un
// régiment d'assaut avait ses trois chevrons dès le jour 2 et, en défense, tous au jour 8 ; Jérôme a retenu 0,2 / 0,5 / 0,85).
// `SEUILS` : l'expérience (0 à 1) d'un chevron, du 1er au 3e. Un régiment : la moyenne de ses hommes ; un char ou un poste de mitrailleuse : sa propre `exp`.
export const SEUILS = [0.2, 0.5, 0.85];
export const chevronsDe = exp => (exp >= SEUILS[0]) + (exp >= SEUILS[1]) + (exp >= SEUILS[2]);
// Le bonus passif de chaque chevron, par genre d'unité (Jérôme : « différent selon le type d'unité »). Le soldat seul n'a rien : son expérience calme déjà sa peur et assure son tir (`R.experience`).
export const BONUS = {
  regiment: { precision: 0.05, moral: 0.08 },     // par chevron : +5 % de chance de toucher ; ses pertes de moral (morts, blessés, tronçon perdu, peur) ×(1 − 8 %)
  char: { blindage: 0.12 },                        // par chevron : les obus ôtent 12 % de coque en moins
  nid: { cadence: 0.12 },                          // par chevron : 12 % de temps en moins entre deux rafales
  soldat: {},
};
// L'expérience d'un char ou d'un poste (0 à 1) : ce qu'il gagne à tirer et à toucher, et à passer une nuit au front
export const GAINS = {
  char: { rafale: 0.0004, touche: 0.004, obus: 0.01, nuit: 0.03 },
  nid: { rafale: 0.0006, touche: 0.006, nuit: 0.03 },
};
// Les mots de la fiche : le bonus d'un genre pour `nb` chevrons
export function bonusEnMots(genre, nb) {
  if (!nb) return 'aucun chevron : aucun bonus';
  const p = x => `${Math.round(x * nb * 100)} %`, B = BONUS[genre];
  if (genre === 'regiment') return `+${p(B.precision)} de précision, moral ${p(B.moral)} plus résistant`;
  if (genre === 'char') return `blindage : ${p(B.blindage)} de dégâts d'obus en moins`;
  if (genre === 'nid') return `cadence : ${p(B.cadence)} de temps en moins entre deux rafales`;
  return 'aucun bonus';
}
