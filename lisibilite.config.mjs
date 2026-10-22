// Configuration de node outils/lisibilite.mjs (voir l'en-tête de l'outil).
// Critère du lot minimal : après trois jours, un cratère, la boue, l'eau et un
// soldat se distinguent. Les tuiles sont peintes par les MÊMES fonctions que le
// jeu (js/tuiles.js) : ce qu'on mesure ici est ce que le jeu affiche.
import { PALETTE as BASE, ALERTES } from './js/palette.js';
// (les deux couleurs d'alerte de l'interface, `a` orange et `d` rouge, ne sont pas dans la palette du terrain : on les ajoute pour la mesure)
const PALETTE = { ...BASE, a: ALERTES.orange, d: ALERTES.rouge };
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
    // l'état moral d'un régiment : le carré du nom et le « ! » de la carte
    { avant: 'a', fond: 't', role: 'signe', ou: 'ébranlé (orange) sur la terre' },
    { avant: 'd', fond: 't', role: 'signe', ou: 'en déroute (rouge) sur la terre' },
    { avant: 'a', fond: 'b', role: 'signe', ou: 'ébranlé sur le fond hachuré des cartes' },
    { avant: 'd', fond: 'b', seuil: 3, role: 'signe', ou: 'en déroute sur le fond hachuré des cartes' },
    { avant: 'a', fond: 'x', seuil: 1.4, role: 'signe', ou: 'ébranlé et en face côte à côte' },
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
    // les verts proposés au labo (sujet « Le sol vert », pas encore dans le jeu) : un soldat s'y lit-il ?
    { avant: 'n', fond: 'v', seuil: 2, role: 'signe', ou: 'nous sur le vert mousse' },
    { avant: 'x', fond: 'w', seuil: 1.5, role: 'signe', ou: 'en face sur le vert sombre' },
    { avant: 't', fond: 'v', role: 'signe', ou: 'ombre d\'un soldat sur le vert mousse' },
    // les feuilles proposées au labo (sujet « Des arbres plus variés », pas encore dans le jeu) : un arbre se lit-il sur le sol ? Le dessus d'une touffe peut avoir la couleur du sol
    // (herbe morte sur herbe morte) : ce sont ses flancs sombres et son ombre qui le dessinent ; les seuils sont ceux de ce qu'on a mesuré, pas du confort
    { avant: 'v', fond: 'h', seuil: 1.1, role: 'signe', ou: 'dessus de feuilles d\'été sur herbe morte' },
    { avant: 'w', fond: 'h', seuil: 1.2, role: 'signe', ou: 'dessus sombre des feuilles d\'été sur herbe morte' },
    { avant: 'w', fond: 'v', seuil: 1.1, role: 'signe', ou: 'flanc des feuilles d\'été sur le vert mousse' },
    { avant: 'h', fond: 'g', seuil: 1.1, role: 'signe', ou: 'dessus de feuilles d\'automne sur sol humide' },
    { avant: 'b', fond: 'h', role: 'signe', ou: 'flanc des feuilles d\'automne sur herbe morte' },
    { avant: 'g', fond: 'h', seuil: 1.1, role: 'signe', ou: 'dessus de feuilles d\'automne en glaise sur herbe morte' },
    { avant: 's', fond: 'o', role: 'signe', ou: 'tronc sur la neige' },
    { avant: 'o', fond: 's', role: 'signe', ou: 'neige sur une branche' },
    { avant: 'r', fond: 's', role: 'signe', ou: 'flanc de neige sur une branche' },
    // les deux camps entre eux (en gris, ils ne se confondent pas)
    { avant: 'n', fond: 'x', seuil: 1.4, role: 'signe', ou: 'nous et en face côte à côte' },
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
