// La pose d'un homme articulé du jeu, calculée côté processeur (étape 3 de docs/chantiers/animations-vers-le-jeu.md) : les 25 nombres de `NOMS_CHAMPS`, écrits dans la texture
// que lit le nuanceur de soldat-articule.js. Logique pure (aucun DOM, aucun THREE). C'est le calcul que le nuanceur faisait pour chaque sommet : `poseDe` (js/pose-soldat.js :
// la marche, le tir, l'accroupi, le feu retenu, la mêlée, le couché) plus ce qu'il ajoutait pour une blessure (le bras plié, le genou à terre, la tête penchée).
import { poseDe } from '../pose-soldat.js?v=0.131.0';
import { NOMS_CHAMPS, BLESSURE } from '../data/poses-soldat.js?v=0.131.0';

export const TEXELS = 7;                      // 7 texels RGBA = 28 flottants par homme (25 utilisés)
export const FLOTTANTS = TEXELS * 4;
const IDX = Object.fromEntries(NOMS_CHAMPS.map((c, i) => [c, i]));

// La phase de la marche : l'horloge de l'image et la position (la formule d'avant, qui écrivait aCap)
export const phaseDe = h => (h.temps ?? 0) * 8 + (h.x ?? 0) * 1.7 + (h.z ?? 0) * 1.3;

// h : { vit, tir, tapi, couche, blessure, rang, temps, x, z }, `tir` comme l'écrit soldats.js : −1 feu retenu, 0..1 l'épaule, de 2 à 3 la mêlée (2 + la poussée) ;
// `sph`, `cph` : le sinus et le cosinus de la phase (les mêmes nombres que `aCap`). Écrit dans `sortie` (Float32Array de FLOTTANTS) et la rend.
export function poseJeu(h, sph, cph, sortie = new Float32Array(FLOTTANTS)) {
  const pistolet = (h.rang ?? h.aspect?.rang ?? 6) < 2.5, tirR = h.tir ?? 0, blessure = h.blessure ?? 0;
  const melee = tirR > 1.5 && !pistolet, retenu = tirR < -0.5 && !pistolet;
  const vit = Math.max(h.vit ?? 0, 0);
  const genou = blessure > 1.5 && blessure < 2.5 && vit < 0.15;
  const P = poseDe({ vit, sinus: sph, cosinus: cph, tir: melee ? 0 : Math.min(1, Math.max(0, tirR)), tapi: h.tapi ?? 0, couche: h.couche ?? 0, retenu, melee, pouss: melee ? Math.min(1, Math.max(0, tirR - 2)) : 0, pistolet });
  if (genou) {            // le genou à terre : la jambe gauche fléchie devant, la droite repliée, le corps baissé et penché
    P.hancheG = BLESSURE.genou.hancheG; P.genouG = BLESSURE.genou.genouG; P.hancheD = BLESSURE.genou.hancheD; P.genouD = BLESSURE.genou.genouD;
    P.chevilleG = (P.genouG - P.hancheG) * BLESSURE.genou.cheville; P.chevilleD = (P.genouD - P.hancheD) * BLESSURE.genou.cheville;
    P.buste += BLESSURE.genou.lean; P.descente += BLESSURE.genou.descente; P.basques += BLESSURE.genou.basques;
  }
  if (blessure > 0.5 && blessure < 1.5) { P.epauleG = BLESSURE.bras.epaule; P.coudeG = BLESSURE.bras.coude; P.convG = BLESSURE.bras.conv; }       // le bras gauche serré contre le ventre
  if (blessure > 2.5) P.tete = BLESSURE.tete;                                                                                                      // la tête baissée
  for (let i = 0; i < FLOTTANTS; i++) sortie[i] = 0;
  for (const c of NOMS_CHAMPS) sortie[IDX[c]] = P[c];
  return sortie;
}
