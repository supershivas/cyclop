// Le temps qu'il fait, un jour à la fois. La chaîne des jours est tirée au
// sort au début de la bataille (une chaîne de Markov) ; la prévision du
// lendemain est vague, et parfois fausse.
export const METEO = {
  sec: { nom: 'temps sec', pluie: 0, evaporation: 1, sechage: 1, gel: 0, prevision: 'sans doute du temps sec' },
  pluie: { nom: 'pluie', pluie: 1, evaporation: 0, sechage: 0, gel: 0, prevision: 'peut-être de la pluie' },
  brouillard: { nom: 'brouillard', pluie: 0, evaporation: 0.2, sechage: 0.2, gel: 0, prevision: 'du brouillard, dit-on' },
  gel: { nom: 'gel', pluie: 0, evaporation: 0, sechage: 0, gel: 1, prevision: 'un froid sec, peut-être' },
  // l'hiver et l'été (v0.51.0) : la neige tombe et blanchit le sol (il gèle : il porte, comme au gel) ; la canicule sèche tout (le sol boit, rien ne boue)
  neige: { nom: 'neige', pluie: 0, evaporation: 0, sechage: 0, gel: 1, neige: 1, prevision: 'de la neige, sans doute' },
  canicule: { nom: 'forte chaleur', pluie: 0, evaporation: 3, sechage: 3, gel: 0, chaud: 1, prevision: 'une chaleur sèche' },
};
// poids des transitions : d'un jour au suivant
export const TRANSITIONS = {
  sec: { sec: 4, pluie: 3, brouillard: 2, gel: 1 },
  pluie: { pluie: 5, sec: 2, brouillard: 2, gel: 1 },
  brouillard: { brouillard: 2, pluie: 3, sec: 3, gel: 1 },
  gel: { gel: 3, sec: 3, brouillard: 2, pluie: 1 },
};
export const PREVISION_JUSTE = 0.7;   // la prévision dit vrai sept fois sur dix

// Les saisons (v0.51.0) : ce qui change d'une carte à l'autre. `automne` est le temps d'avant (TRANSITIONS ci-dessus, la boue qui vient) ; `hiver` : de la neige, du gel, du brouillard, pas de pluie ;
// `ete` : du sec, des jours de forte chaleur, des orages rares. `depart` : le temps du premier jour. `nappe` : m de plus sous le sol (un sol qui boit : les trous ne se remplissent plus), `humidite` : le facteur
// de l'humidité de départ du sol. `pluieAuMoins` : le nombre de jours de pluie garantis (la boue doit venir : seulement en automne).
export const SAISONS = {
  automne: { nom: 'automne', transitions: TRANSITIONS, depart: 'sec', nappe: 0, humidite: 1 },
  hiver: {
    nom: 'hiver', depart: 'gel', nappe: 0.3, humidite: 0.8, pluieAuMoins: 0,
    transitions: {
      gel: { gel: 4, neige: 3, brouillard: 2, sec: 1 },
      neige: { neige: 4, gel: 3, brouillard: 2, sec: 1 },
      brouillard: { brouillard: 2, gel: 3, neige: 3, sec: 1 },
      sec: { sec: 2, gel: 3, neige: 2, brouillard: 2 },
    },
  },
  ete: {
    nom: 'été', depart: 'canicule', nappe: 0.9, humidite: 0.35, pluieAuMoins: 0,
    transitions: {
      canicule: { canicule: 4, sec: 4, brouillard: 1, pluie: 1 },
      sec: { sec: 4, canicule: 3, brouillard: 1, pluie: 1 },
      brouillard: { brouillard: 1, sec: 4, canicule: 3, pluie: 1 },
      pluie: { pluie: 1, sec: 4, canicule: 3, brouillard: 1 },
    },
  },
};
export const SAISON_DEFAUT = 'automne';
