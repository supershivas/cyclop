// Le ciel et la lumière du jour : tout vient de l'heure, du jour de bataille et de la météo, et de la palette du jeu (js/palette.js) mélangée en continu
// (aucune couleur nouvelle : le bleu du ciel est « l'eau qui reflète le ciel », le soleil bas tire sur l'orange d'alerte, la nuit sur la terre).
// Les couleurs sont rendues en LINÉAIRE : le nuanceur fait la lumière en linéaire et gamma-corrige à la fin.
import { PALETTE, ALERTES } from '../palette.js?v=0.128.1';
import { METEOS, SOLEIL, NUAGES, CIEL } from './config.js?v=0.128.1';
import { directionSoleil } from './lumiere.js?v=0.128.1';

export const lin = hex => [1, 3, 5].map(i => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const mul = (a, k) => a.map(v => v * k);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const COUL = Object.fromEntries(Object.entries(PALETTE).map(([k, h]) => [k, lin(h)]));
COUL.orange = lin(ALERTES.orange);

// Les matières du terrain, dans l'ordre de MAT (terrain.js) : herbe, glaise, terre, boue, sacs, tronc, buisson, toit
export const COULEURS_MATIERES = [COUL.h, COUL.g, mix(COUL.b, COUL.g, 0.25), mix(COUL.s, COUL.b, 0.4), mix(COUL.g, COUL.r, 0.45), mix(COUL.s, COUL.b, 0.55), COUL.w, mix(COUL.b, COUL.r, 0.3), mix(mix(COUL.e, COUL.s, 0.62), COUL.t, 0.2)];

// ─── Le ciel v2 : le MÊME modèle ici (pour l'éclairage du sol) et dans le nuanceur de rendu.js (pour le ciel qu'on voit) ───
// La couleur d'une direction `d` (unitaire, y vers le haut) : un dégradé selon l'épaisseur d'air traversée (masse d'air de Kasten-Young : 1 au zénith, ~36 à l'horizon), un reflet de
// diffusion avant (Henyey-Greenstein, g = 0,78) autour du soleil, un rougissement de l'horizon du côté du soleil quand il est bas. Les ancres sont les couleurs de la palette (zenith, horizon, soleil).
export const masseAir = cosz => { const c = Math.max(0, Math.min(1, cosz)); return 1 / (c + 0.15 * Math.pow(93.885 - Math.acos(c) * 180 / Math.PI, -1.253)); };
export const phaseMie = mu => { const g = CIEL.mieG; return (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * mu, 1.5)); };
export function couleurCiel(d, { skyZ, skyH, sunCol, sunDir, bas = 0, voile = 0 }) {
  const t = 1 - Math.exp(-masseAir(d[1]) * CIEL.masseAir), mu = d[0] * sunDir[0] + d[1] * sunDir[1] + d[2] * sunDir[2];
  const base = mix(skyZ, skyH, t).map(v => v * (0.88 + 0.24 * mu * mu));
  const mie = phaseMie(mu) * CIEL.mieForce * (0.35 + 0.65 * t) * (1 - 0.7 * voile);
  const rouge = Math.pow(Math.max(0, Math.min(1, mu * 0.5 + 0.5)), 3) * Math.pow(1 - Math.max(0, Math.min(1, d[1])), 3) * bas * CIEL.rougeurHorizon;
  return base.map((v, i) => v + sunCol[i] * (mie + rouge * 0.5));
}
// Les directions où l'on échantillonne le ciel pour son éclairage (hémisphère, poids = l'inclinaison par rapport à la verticale : un cosinus)
const DIRS_HEMI = [[0, 1, 0], ...[0, 1, 2, 3].flatMap(k => [[Math.cos(k * Math.PI / 2) * 0.57, 0.82, Math.sin(k * Math.PI / 2) * 0.57], [Math.cos(k * Math.PI / 2 + 0.785) * 0.94, 0.34, Math.sin(k * Math.PI / 2 + 0.785) * 0.94]])];
export function eclairementCiel(P) {
  let s = [0, 0, 0], w = 0;
  for (const d of DIRS_HEMI) { const c = couleurCiel(d, P); for (let i = 0; i < 3; i++) s[i] += c[i] * d[1]; w += d[1]; }
  return s.map(v => v / w);
}

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
  const sunCol = mul(jourCoul, intensite), hemi = eclairementCiel({ skyZ, skyH, sunCol, sunDir: s.dir, bas, voile });       // ce que le ciel lui-même donne à la terre : le sol et le ciel s'accordent
  const ambiance = mul(mix(mix(skyZ, skyH, 0.45), mix(hemi, COUL.r, 0.1), 0.65), 1);
  return {
    jour: s.jour, hauteur: s.hauteur, sunDir: s.dir, dir: s.dir,
    sunCol, sunI: intensite, bas, cirrus: Math.max(0, 0.95 - voile) * (1 - M.brouillard) * (1 - M.neige * 0.5),
    skyZ, skyH,
    skyAmb: mul(mix(ambiance, COUL.r, 0.3), 0.5 + 0.55 * voile), groundAmb: mul(mix(mix(COUL.g, skyH, 0.35), jourCoul, 0.18 * clair), 0.32),
    expo: 1.35, humidite: M.humidite, pluie: M.pluie, neige: M.neige, brouillard: M.brouillard, vent: M.vent, voile, nuit: 1 - clair,
    brumeCoul: mul(mix(skyH, COUL.r, 0.35 + 0.4 * M.brouillard), 0.1 + 0.9 * lum),
    nuageCoul: mul(mix(mul(mix(COUL.o, COUL.r, 0.35), 0.55), mul(COUL.r, 0.3), voile), 0.12 + 0.88 * lum),     // des nuages clairs par beau temps, gris et sombres sous la pluie
    luneDir: lune.jour ? lune.dir : [0, -1, 0], etoiles: Math.max(0, 1 - lum * 2.2) * (1 - voile),
    nuages: { couverture: voile, hauteurM: NUAGES.hauteurM },
  };
}
export const HEURE_LEVER = SOLEIL.leverH;
