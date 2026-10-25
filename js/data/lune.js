// La lune et le ciel de nuit (Jérôme, v0.40.0 : « les phases de la lune de jour en jour, une nuit nuageuse, des étoiles filantes »). Tout se lit du jour, de la graine et
// du temps de la journée : aucune sauvegarde, aucun tirage du générateur de la bataille (un hachage graine-jour). Le dessin et l'obscurité de la nuit s'en servent ;
// la logique de la bataille n'en lit rien.
import { hash2 } from '../lib/rng.js?v=0.71.0';

export const CYCLE = 29.53;                    // jours d'une lunaison
// la part de lumière que le temps laisse passer (la pluie et le brouillard étouffent la lune)
export const CLARTE = { sec: 1, gel: 1, pluie: 0.25, brouillard: 0.45, neige: 0.8, canicule: 1, tempete: 0.15, couvert: 0.5, beau: 1 };
// la couverture de nuages de la nuit : le temps d'abord (une nuit de gel est claire), puis un écart de nuit en nuit
const COUVERTURE = { sec: 0.35, gel: 0.15, pluie: 0.8, brouillard: 0.6, neige: 0.7, canicule: 0.1, tempete: 0.95, couvert: 0.75, beau: 0.1 };

/* La lune de la nuit du jour donné : `p` (0 nouvelle, 0,25 premier quartier, 0,5 pleine, 0,75 dernier quartier), `eclairement` (0 à 1 : la part éclairée),
   et sa place dans le ciel (azimut, hauteur, en radians). Elle change de jour en jour d'un trentième de lunaison. */
export function lune(jour, graine = 0) {
  const p = ((hash2(graine | 0, 17, 5) + (jour - 1) / CYCLE) % 1 + 1) % 1;
  return {
    p,
    eclairement: (1 - Math.cos(2 * Math.PI * p)) / 2,
    az: 2 * Math.PI * ((hash2(graine | 0, 19, 7) + jour * 0.043) % 1),
    el: 0.15 + 0.07 * Math.sin(2 * Math.PI * p + 1),     // basse : la caméra du jeu, à son plus bas, ne voit que les 15 premiers degrés de ciel
  };
}
export function couvertureNuit(jour, graine = 0, meteo = 'sec') {
  const v = (COUVERTURE[meteo] ?? COUVERTURE.sec) + (hash2(graine | 0, jour, 23) - 0.5) * 0.4;
  return Math.max(0, Math.min(1, v));
}
// la lumière que la lune donne au champ cette nuit (0 à 1) : sa part éclairée, étouffée par le temps et les nuages
export function clairDeLune(jour, graine = 0, meteo = 'sec') {
  return lune(jour, graine).eclairement * (CLARTE[meteo] ?? 1) * (1 - 0.5 * couvertureNuit(jour, graine, meteo));
}
const PHASES = ['Nouvelle lune', 'Premier croissant', 'Premier quartier', 'Lune gibbeuse croissante', 'Pleine lune', 'Lune gibbeuse décroissante', 'Dernier quartier', 'Dernier croissant'];
export const nomPhase = p => PHASES[Math.round(p * 8) % 8];
export const cielEnMots = couv => couv < 0.25 ? 'ciel dégagé' : couv < 0.5 ? 'ciel voilé' : couv < 0.75 ? 'ciel nuageux' : 'ciel couvert';
