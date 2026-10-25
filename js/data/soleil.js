// La course du soleil et les ombres du relief (labo « La lumière dans le relief »). Du dessin seulement : rien de ceci n'entre dans la partie.
// Le jeu d'avant : un arc de 6 h à 18 h, du levant au couchant par le sud, 0,95 rad au plus haut, une ombre jamais plus longue que 3,5 fois la hauteur
// (à 5, l'ombre d'un arbre traversait 45 m de champ).
export const SOLEIL = { hauteurMax: 0.95, hauteurMin: 0.1, ombreMax: 3.5, depart: 6, fin: 18 };

// Le soleil de chaque saison (`hauteurMax`, rad) : bas l'hiver (ombres longues), haut l'été. Le lever et le coucher restent ceux de l'horloge du jeu (6 h, 18 h).
export const SOLEIL_SAISONS = { automne: 0.95, hiver: 0.5, ete: 1.2 };

// Les azimuts à essayer (rad, ajoutés à l'arc : à midi l'ombre part vers le nord, loin de la caméra, qui regarde le nord ; chaque valeur la fait tourner d'autant, vers la droite de l'écran). `nord-ouest` :
// le soleil au nord-ouest à midi, la lumière du jeu d'avant (la paroi ouest éclairée, les autres sombres) ; `vers la caméra` : l'ombre vient vers nous à midi. (Corrigé : `vers la caméra` valait π/2, qui
// jette l'ombre vers la droite de l'écran, et `sud-est` π/4, vers le nord-est.)
export const AZIMUTS = { sud: 0, 'ombres à droite': Math.PI / 2, 'nord-ouest': 3 * Math.PI / 4, 'vers la caméra': Math.PI };

// Le soleil sur un côté du terrain (Jérôme : « le soleil doit toujours être sur un côté du terrain, le haut de l'écran n'est pas forcément le nord ; les ombres s'étirent plus ou moins vers la gauche ou vers la droite ») :
// la direction de l'ombre ne fait plus le tour de la vue, elle reste du même côté de l'écran, un peu tournée vers la caméra (les parois du sud restent à l'ombre) ; seule sa longueur suit l'heure (longue le matin et le soir,
// courte à midi : l'élévation de `SOLEIL`). `angle` : l'angle de l'ombre sous l'horizontale de l'écran à midi (rad, vers la caméra), `oscillation` : de combien il s'en écarte au lever et au coucher.
export const SOLEIL_COTE = { angle: 0.45, oscillation: 0.35 };
// les boutons du labo : le soleil à gauche (l'ombre vers la droite) ou à droite (l'ombre vers la gauche)
export const COTES = { 'Soleil à gauche': 'gauche', 'Soleil à droite': 'droite' };

// Les ombres du relief : un relief casse la lumière s'il fait au moins `seuilQ` quarts de mètre de plus que la case (0,5 m : un parapet, la lèvre d'un cratère, une paroi de tranchée) ;
// `portee` : mètres cherchés vers le soleil. Le soleil doit avoir bougé de `pasAngle` rad (ou de `pasLongueur` en part de l'ombre) pour qu'on recalcule, au plus toutes les `delai` s ; `budgetEcritureMs` : ms par image pour repeindre dans la texture du sol les rangées vues dont l'ombre a changé.
export const OMBRES_RELIEF = { seuilQ: 2, portee: 24, pasAngle: 0.035, pasLongueur: 0.06, delai: 3, budgetEcritureMs: 3 };
