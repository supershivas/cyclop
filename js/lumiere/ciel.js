// Le ciel et la lumière du jour : tout vient de l'heure, du jour de bataille et de la météo, et de la palette du jeu (js/palette.js) mélangée en continu
// (aucune couleur nouvelle : le bleu du ciel est « l'eau qui reflète le ciel », le soleil bas tire sur l'orange d'alerte, la nuit sur la terre).
// Les couleurs sont rendues en LINÉAIRE : le nuanceur fait la lumière en linéaire et gamma-corrige à la fin.
import { PALETTE, ALERTES } from '../palette.js?v=0.111.0';
import { METEOS, SOLEIL } from './config.js?v=0.111.0';
import { directionSoleil } from './lumiere.js?v=0.111.0';

export const lin = hex => [1, 3, 5].map(i => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const mul = (a, k) => a.map(v => v * k);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const COUL = Object.fromEntries(Object.entries(PALETTE).map(([k, h]) => [k, lin(h)]));
COUL.orange = lin(ALERTES.orange);

// Les matières du terrain, dans l'ordre de MAT (terrain.js) : herbe, glaise, terre, boue, sacs, tronc, buisson, toit
export const COULEURS_MATIERES = [COUL.h, COUL.g, mix(COUL.b, COUL.g, 0.25), mix(COUL.s, COUL.b, 0.4), mix(COUL.g, COUL.r, 0.45), mix(COUL.s, COUL.b, 0.55), COUL.w, mix(COUL.b, COUL.r, 0.3)];

export function ciel({ heure = 8, jour = 1, meteo = 'sec' } = {}) {
  const M = METEOS[meteo] || METEOS.sec, s = directionSoleil(heure, jour);
  const sinH = Math.max(0, s.dir[1]), bas = 1 - sm(0, 0.5, sinH);                        // 1 : le soleil rase l'horizon
  const voile = Math.min(0.95, M.voile + 0.035 * (jour - 1));                             // le ciel se couvre à mesure que la bataille dure
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
    expo: 1.35, humidite: M.humidite, pluie: M.pluie, voile, nuit: 1 - clair,
    brumeCoul: mul(mix(skyH, COUL.r, 0.35), 0.1 + 0.9 * lum),
  };
}
export const HEURE_LEVER = SOLEIL.leverH;
