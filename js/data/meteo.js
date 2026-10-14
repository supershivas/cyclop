// Le temps qu'il fait, un jour à la fois. La chaîne des jours est tirée au
// sort au début de la bataille (une chaîne de Markov) ; la prévision du
// lendemain est vague, et parfois fausse.
export const METEO = {
  sec: { nom: 'temps sec', pluie: 0, evaporation: 1, sechage: 1, gel: 0, prevision: 'sans doute du temps sec' },
  pluie: { nom: 'pluie', pluie: 1, evaporation: 0, sechage: 0, gel: 0, prevision: 'peut-être de la pluie' },
  brouillard: { nom: 'brouillard', pluie: 0, evaporation: 0.2, sechage: 0.2, gel: 0, prevision: 'du brouillard, dit-on' },
  gel: { nom: 'gel', pluie: 0, evaporation: 0, sechage: 0, gel: 1, prevision: 'un froid sec, peut-être' },
};
// poids des transitions : d'un jour au suivant
export const TRANSITIONS = {
  sec: { sec: 4, pluie: 3, brouillard: 2, gel: 1 },
  pluie: { pluie: 5, sec: 2, brouillard: 2, gel: 1 },
  brouillard: { brouillard: 2, pluie: 3, sec: 3, gel: 1 },
  gel: { gel: 3, sec: 3, brouillard: 2, pluie: 1 },
};
export const PREVISION_JUSTE = 0.7;   // la prévision dit vrai sept fois sur dix
