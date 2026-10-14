// Configuration de node outils/lisibilite.mjs (voir l'en-tête de l'outil).
// Critère du lot minimal : après trois jours, un cratère, la boue, l'eau et un
// soldat se distinguent. Les tuiles sont peintes par les MÊMES fonctions que le
// jeu (js/tuiles.js) : ce qu'on mesure ici est ce que le jeu affiche.
import { PALETTE } from './js/palette.js';
import { REGLAGES as R } from './js/data/reglages.js';
import { tuile as t, ETAT } from './js/tuiles.js';

const tuile = (e, o) => t(R, e, o);

export default {
  palette: PALETTE,
  paires: [
    // le texte du HUD et des menus
    { avant: 'o', fond: 't', role: 'texte', ou: 'HUD, menus' },
    { avant: 'g', fond: 't', role: 'signe', ou: 'libellés discrets du HUD' },
    { avant: 't', fond: 'o', role: 'texte', ou: 'boutons' },
    { avant: 'n', fond: 't', role: 'texte', ou: 'noms de nos régiments' },
    // les états du sol entre eux
    { avant: 'b', fond: 'h', role: 'signe', ou: 'boue sur sol sec' },
    { avant: 'e', fond: 'b', role: 'signe', ou: 'eau dans la boue' },
    { avant: 'e', fond: 's', role: 'signe', ou: 'eau dans un cratère boueux' },
    { avant: 'g', fond: 'b', seuil: 2, role: 'signe', ou: 'lèvre d\'un cratère dans la boue (la forme fait le reste)' },
    { avant: 's', fond: 'g', seuil: 2.5, role: 'signe', ou: 'paroi de cratère sur sol humide' },
    // un soldat : sa couleur sur un sol sombre, son ombre sur un sol clair
    { avant: 'n', fond: 'b', role: 'signe', ou: 'nous sur la boue' },
    { avant: 'x', fond: 'b', role: 'signe', ou: 'en face sur la boue' },
    { avant: 'n', fond: 's', role: 'signe', ou: 'nous dans un cratère boueux' },
    { avant: 'x', fond: 's', role: 'signe', ou: 'en face dans un cratère boueux' },
    { avant: 't', fond: 'h', role: 'signe', ou: 'ombre d\'un soldat sur sol sec' },
    { avant: 't', fond: 'g', role: 'signe', ou: 'ombre d\'un soldat sur sol humide' },
    { avant: 't', fond: 'e', role: 'signe', ou: 'ombre d\'un soldat dans l\'eau' },
    // les deux camps entre eux (en gris, ils ne se confondent pas)
    { avant: 'n', fond: 'x', seuil: 1.5, role: 'signe', ou: 'nous et en face côte à côte' },
  ],
  groupes: {
    sols: {
      sec: tuile(ETAT.SEC), humide: tuile(ETAT.HUMIDE), boue: tuile(ETAT.BOUE), eau: tuile(ETAT.EAU),
    },
    'trois jours': {
      'cratère sec': tuile(ETAT.SEC, { cratere: '155' }),
      'cratère boueux': tuile(ETAT.BOUE, { cratere: '155' }),
      boue: tuile(ETAT.BOUE),
      eau: tuile(ETAT.EAU),
      'soldat sur sol sec': tuile(ETAT.SEC, { soldat: 'n' }),
      'soldat dans la boue': tuile(ETAT.BOUE, { soldat: 'n' }),
      'soldat d\'en face dans la boue': tuile(ETAT.BOUE, { soldat: 'x' }),
    },
  },
  // le rendu agrandit l'image d'un facteur entier (rendu3d.js : facteur = hauteur / 400, arrondi)
  poses: [
    { ou: 'image du jeu, écran 1280 × 800', image: [640, 400], case: [1280, 800] },
    { ou: 'image du jeu, écran 1920 × 1080 (×3)', image: [640, 360], case: [1920, 1080] },
  ],
};
