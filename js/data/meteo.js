// Le temps qu'il fait, un jour à la fois. La chaîne des jours est tirée au
// sort au début de la bataille (une chaîne de Markov) ; la prévision du
// lendemain est vague, et parfois fausse.
export const METEO = {
  sec: { nom: 'temps sec', pluie: 0, evaporation: 1, sechage: 1, gel: 0, prevision: 'sans doute du temps sec' },
  pluie: { nom: 'pluie', pluie: 1, evaporation: 0, sechage: 0, gel: 0, prevision: 'peut-être de la pluie' },
  brouillard: { nom: 'brouillard', pluie: 0, evaporation: 0.2, sechage: 0.2, gel: 0, prevision: 'du brouillard, dit-on' },
  gel: { nom: 'gel', pluie: 0, evaporation: 0, sechage: 0, gel: 1, prevision: 'un froid sec, peut-être' },
  // l'hiver et l'été (v0.51.0) : la neige tombe et blanchit le sol (il gèle : il porte, comme au gel) ; la canicule sèche tout (le sol boit, rien ne boue)
  neige: { nom: 'neige légère', pluie: 0, evaporation: 0, sechage: 0, gel: 1, neige: 1, prevision: 'un peu de neige, sans doute' },
  // les temps d'hiver (v0.54.0) : le sol est enneigé tout l'hiver (`horloge.enneige`) et il porte, quel que soit le temps du jour ; ils ne diffèrent que par le ciel, la neige qui tombe et le froid (`SAISONS.hiver.temperatures`)
  tempete: { nom: 'tempête de neige', pluie: 0, evaporation: 0, sechage: 0, gel: 1, neige: 1, tempete: 1, prevision: 'une tempête de neige, peut-être' },
  couvert: { nom: 'temps couvert', pluie: 0, evaporation: 0, sechage: 0, gel: 1, prevision: 'un ciel couvert, sans doute' },
  beau: { nom: 'beau temps', pluie: 0, evaporation: 0, sechage: 0, gel: 1, prevision: 'du beau temps, peut-être' },
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
  automne: { nom: 'automne', desc: 'Le temps d\u2019avant : de la pluie, du brouillard, du gel de temps en temps, et la boue qui vient.', transitions: TRANSITIONS, depart: 'sec', nappe: 0, humidite: 1 },
  hiver: {
    nom: 'hiver', desc: 'Un sol toujours sous la neige, qui porte comme au gel : tempête de neige, neige légère, gel, ciel couvert ou beau temps, et le froid qui va avec.', depart: 'gel', nappe: 0.3, humidite: 0.8, pluieAuMoins: 0,
    transitions: {
      gel: { gel: 3, neige: 2, couvert: 3, beau: 2, tempete: 1 },
      neige: { neige: 3, tempete: 2, gel: 2, couvert: 3, beau: 1 },
      tempete: { tempete: 2, neige: 4, couvert: 2, gel: 1 },
      couvert: { couvert: 3, neige: 3, gel: 2, beau: 2, tempete: 1 },
      beau: { beau: 3, gel: 3, couvert: 3, neige: 1 },
    },
    // la température du jour, en °C : [la plus basse, la plus haute] selon le temps (tirée de la graine et du jour : `temperature`)
    temperatures: { tempete: [-16, -9], neige: [-8, -2], gel: [-18, -8], couvert: [-6, 1], beau: [-12, 3] },
  },
  ete: {
    nom: 'été', desc: 'Du temps sec et des jours de forte chaleur, une pluie rare. Le sol boit : les trous ne se remplissent plus.', depart: 'canicule', nappe: 0.9, humidite: 0.35, pluieAuMoins: 0,
    transitions: {
      canicule: { canicule: 4, sec: 4, brouillard: 1, pluie: 1 },
      sec: { sec: 4, canicule: 3, brouillard: 1, pluie: 1 },
      brouillard: { brouillard: 1, sec: 4, canicule: 3, pluie: 1 },
      pluie: { pluie: 1, sec: 4, canicule: 3, brouillard: 1 },
    },
  },
};
export const SAISON_DEFAUT = 'automne';

// La température du jour (°C, entière) ou null (une saison sans température : l'été et l'automne attendent). Tirée de la graine et du jour par un hachage : rien n'est sauvegardé, aucun tirage du générateur.
export function temperature(saison, meteo, graine, jour) {
  const T = SAISONS[saison]?.temperatures?.[meteo];
  if (!T) return null;
  let h = (Math.imul(graine | 0, 374761393) + Math.imul(jour | 0, 668265263) + 0x9e3779b9) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return Math.round(T[0] + ((h >>> 0) / 4294967296) * (T[1] - T[0]));
}

// Le vent (Jérôme, v0.84.0 : « le vent réaliste, plus ou moins fort, qui influe sur les nuages, les arbres, la pluie… »). `force` : 0 (calme) à 1 (tempête), entre les bornes que le temps du jour permet ;
// `ang` : le cap vers où il souffle (rad, 0 = vers l'est, sens horaire vu de dessus : x = cos, z = sin), le plus souvent d'ouest en est, écarté de ±1 rad. Comme `temperature`, tout vient d'un hachage de la
// graine, du jour et du temps : aucun tirage du générateur de la bataille, rien n'est sauvegardé. La pluie et la tempête de neige poussent plus fort ; le brouillard, le gel et la canicule sont presque calmes.
export const VENT_FORCE = {
  sec: [0.1, 0.5], pluie: [0.3, 0.8], brouillard: [0, 0.18], gel: [0.05, 0.35], neige: [0.15, 0.5],
  tempete: [0.7, 1], couvert: [0.1, 0.5], beau: [0.05, 0.4], canicule: [0, 0.25],
};
export const VENT_CAPS = { depart: 0, ecart: 1 };        // le cap moyen (vers l'est) et l'écart possible, en rad
// les mots du vent selon sa force (seuils croissants)
export const VENT_KMH = 90;      // km/h d'un vent de force 1 : « calme » jusqu'à 11 km/h, « brise légère » 27, « vent modéré » 45, « vent fort » 63, la tempête au-delà (Beaufort, à peu près)
export const VENT_CAP_NOMS = ['est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest', 'nord', 'nord-est'];      // le cap `ang` (rad, 0 vers l'est, sens horaire vu de dessus) en huit points
export const capDuVent = ang => VENT_CAP_NOMS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
export const VENT_NOMS = [[0.12, 'calme'], [0.3, 'brise légère'], [0.5, 'vent modéré'], [0.7, 'vent fort'], [1.01, 'vent de tempête']];
export function vent(meteo, graine, jour) {
  const B = VENT_FORCE[meteo] || [0.1, 0.5];
  const h = (s) => { let x = (Math.imul(graine | 0, 374761393) + Math.imul(jour | 0, 668265263) + Math.imul(s, 1597334677) + 0x9e3779b9) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const force = B[0] + h(1) * (B[1] - B[0]);
  const ang = VENT_CAPS.depart + (h(2) * 2 - 1) * VENT_CAPS.ecart;
  const nom = VENT_NOMS.find(([max]) => force < max)[1];
  return { force, ang, nom, kmh: Math.round(force * VENT_KMH) };
}
