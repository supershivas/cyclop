// Le ciel et la lumière du jour : tout vient de l'heure, du jour de bataille et de la météo, et de la palette du jeu (js/palette.js) mélangée en continu
// (aucune couleur nouvelle : le bleu du ciel est « l'eau qui reflète le ciel », le soleil bas tire sur l'orange d'alerte, la nuit sur la terre).
// Les couleurs sont rendues en LINÉAIRE : le nuanceur fait la lumière en linéaire et gamma-corrige à la fin.
import { PALETTE, ALERTES } from '../palette.js?v=0.114.1';
import { METEOS, SOLEIL, NUAGES } from './config.js?v=0.114.1';
import { directionSoleil } from './lumiere.js?v=0.114.1';

export const lin = hex => [1, 3, 5].map(i => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const mul = (a, k) => a.map(v => v * k);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const COUL = Object.fromEntries(Object.entries(PALETTE).map(([k, h]) => [k, lin(h)]));
COUL.orange = lin(ALERTES.orange);

// Les matières du terrain, dans l'ordre de MAT (terrain.js) : herbe, glaise, terre, boue, sacs, tronc, buisson, toit
export const COULEURS_MATIERES = [COUL.h, COUL.g, mix(COUL.b, COUL.g, 0.25), mix(COUL.s, COUL.b, 0.4), mix(COUL.g, COUL.r, 0.45), mix(COUL.s, COUL.b, 0.55), COUL.w, mix(COUL.b, COUL.r, 0.3)];

// Mélange deux météos (nombres de 0 à 1) : t = 0 donne a, t = 1 donne b. Une météo est un nom de METEOS ou un objet de mêmes champs.
export const meteoDe = m => (typeof m === 'string' ? METEOS[m] : m) || METEOS.sec;
export function melangerMeteo(a, b, t) {
  a = meteoDe(a); b = meteoDe(b); const o = {};
  for (const k of ['humidite', 'pluie', 'neige', 'brouillard', 'voile', 'soleil', 'vent']) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}
// `heure` en heures, `jour` de bataille (1 à 10), `meteo` : un nom ou un objet (voir METEOS). La lune est à l'opposé du soleil.
export function ciel({ heure = 8, jour = 1, meteo = 'sec' } = {}) {
  const M = meteoDe(meteo), s = directionSoleil(heure, jour), lune = directionSoleil((heure + 12) % 24, 1);
  const sinH = Math.max(0, s.dir[1]), bas = 1 - sm(0, 0.5, sinH);                        // 1 : le soleil rase l'horizon
  const voile = Math.min(0.97, M.voile + 0.03 * (jour - 1));                             // le ciel se couvre à mesure que la bataille dure
  const clair = s.jour ? sm(-0.02, 0.22, s.dir[1]) : 0;
  const jourCoul = mix(mix(COUL.o, COUL.orange, bas * 0.75), COUL.r, voile * 0.6);
  const intensite = clair * 2.7 * M.soleil * (1 - 0.03 * (jour - 1));
  const nuit = mix(COUL.t, mix(COUL.e, COUL.t, 0.7), 0.5);
  const zJour = mix(mix(COUL.e, COUL.n, 0.12), mix(COUL.r, COUL.g, 0.25), voile), hJour = mix(mix(COUL.r, COUL.orange, bas * 0.45 * (1 - voile)), COUL.r, voile * 0.5);
  const lum = 0.15 + 0.85 * Math.max(clair, 0.35 * (1 - clair) * (s.hauteur > -0.12 ? 1 : 0));   // le crépuscule garde un peu de ciel
  const skyZ = mix(mul(nuit, 0.35), mul(zJour, 0.9), lum), skyH = mix(mul(nuit, 0.7), mul(hJour, 1.05), lum);
  return {
    jour: s.jour, hauteur: s.hauteur, sunDir: s.dir, dir: s.dir,
    sunCol: mul(jourCoul, intensite), sunI: intensite,
    skyZ, skyH,
    skyAmb: mul(mix(mix(skyZ, skyH, 0.45), COUL.r, 0.3), 0.5 + 0.55 * voile), groundAmb: mul(mix(COUL.g, skyH, 0.35), 0.32),
    expo: 1.35, humidite: M.humidite, pluie: M.pluie, neige: M.neige, brouillard: M.brouillard, vent: M.vent, voile, nuit: 1 - clair,
    brumeCoul: mul(mix(skyH, COUL.r, 0.35 + 0.4 * M.brouillard), 0.1 + 0.9 * lum),
    nuageCoul: mul(mix(mul(mix(COUL.o, COUL.r, 0.35), 0.55), mul(COUL.r, 0.3), voile), 0.12 + 0.88 * lum),     // des nuages clairs par beau temps, gris et sombres sous la pluie
    luneDir: lune.jour ? lune.dir : [0, -1, 0], etoiles: Math.max(0, 1 - lum * 2.2) * (1 - voile),
    nuages: { couverture: voile, hauteurM: NUAGES.hauteurM },
  };
}
export const HEURE_LEVER = SOLEIL.leverH;
