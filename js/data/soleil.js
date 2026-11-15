// La course du soleil et les ombres du relief (labo « La lumière dans le relief »). Du dessin seulement : rien de ceci n'entre dans la partie.
// Le jeu d'avant : un arc de 6 h à 18 h, du levant au couchant par le sud, 0,95 rad au plus haut, une ombre jamais plus longue que 3,5 fois la hauteur
// (à 5, l'ombre d'un arbre traversait 45 m de champ).
export const SOLEIL = { hauteurMax: 0.95, hauteurMin: 0.1, ombreMax: 3.5, depart: 6, fin: 18 };

// Le soleil de chaque saison (`hauteurMax`, rad) : bas l'hiver (ombres longues), haut l'été. Le lever et le coucher restent ceux de l'horloge du jeu (6 h, 18 h).
export const SOLEIL_SAISONS = { automne: 0.95, hiver: 0.5, ete: 1.2, printemps: 1.05 };

// Les azimuts à essayer (rad, ajoutés à l'arc : à midi l'ombre part vers le nord, loin de la caméra, qui regarde le nord ; chaque valeur la fait tourner d'autant, vers la droite de l'écran). `nord-ouest` :
// le soleil au nord-ouest à midi, la lumière du jeu d'avant (la paroi ouest éclairée, les autres sombres) ; `vers la caméra` : l'ombre vient vers nous à midi. (Corrigé : `vers la caméra` valait π/2, qui
// jette l'ombre vers la droite de l'écran, et `sud-est` π/4, vers le nord-est.)
export const AZIMUTS = { sud: 0, 'ombres à droite': Math.PI / 2, 'nord-ouest': 3 * Math.PI / 4, 'vers la caméra': Math.PI };

// Le soleil sur un côté du terrain (Jérôme : « le soleil doit toujours être sur un côté du terrain, le haut de l'écran n'est pas forcément le nord ; les ombres s'étirent plus ou moins vers la gauche ou vers la droite ») :
// la direction de l'ombre ne fait plus le tour de la vue, elle reste du même côté de l'écran, un peu tournée vers la caméra (les parois du sud restent à l'ombre) ; seule sa longueur suit l'heure (longue le matin et le soir,
// courte à midi : l'élévation de `SOLEIL`). `angle` : l'angle de l'ombre sous l'horizontale de l'écran à midi (rad, vers la caméra), `oscillation` : de combien il s'en écarte au lever et au coucher.
export const SOLEIL_COTE = { angle: 0.45, oscillation: 0.35 };
// les boutons du labo : le soleil à gauche (l'ombre vers la droite) ou à droite (l'ombre vers la gauche)
// (Jérôme, v0.66.3 : « le soleil change de place mais pas besoin de déplacement réaliste, il se lève et se couche ») : `lever-gauche` : l'ombre part vers la droite au lever, vient vers la caméra à midi (courte),
// part vers la gauche au coucher ; `lever-droite` : l'inverse. `marge` : l'angle de l'ombre au lever et au coucher sous l'horizontale de l'écran (rad, vers la caméra : jamais tout à fait de côté).
export const COTES = { 'Soleil à gauche': 'gauche', 'Soleil à droite': 'droite', 'Se lève à gauche': 'lever-gauche', 'Se lève à droite': 'lever-droite' };
export const SOLEIL_LEVER = { marge: 0.25 };

// Le soleil du jeu (Jérôme, v0.67.3 : « active les ombres et les nuages dans le jeu », après la journée en dix secondes du labo) : il se lève à gauche et se couche à droite, l'ombre passe par la caméra à midi, sa
// longueur suit l'élévation de la saison, un temps couvert efface les ombres ; les ombres du relief et les ombres de nuages sont allumées (`rendu.ombresRelief`, `rendu.ombresNuages`, réglés par main.js).
// Les parois ne suivent pas le soleil dans le jeu (`parois: false` : la règle d'avant, sud, nord et est sombres) : pas encore décidé. Le labo garde ses réglages à lui (tout éteint au départ).
export const SOLEIL_JEU = { cote: 'lever-gauche', saisonnier: true, meteo: true, parois: false };

// Les nuages selon le temps (Jérôme, 15 nov., v0.134.6 : « des nuages différents selon le temps : absents, rares, présents, très nuageux… et leur ombre au sol qui suit leur nombre ») :
// `ciel` est LA part du ciel couverte (0 à 1), lue par le ciel (rendu/ciel.js) ET par les ombres de nuages au sol (rendu3d.js) : il n'y a qu'un chiffre par temps.
// De 0 (forte chaleur : pas un nuage) à 0,1 (beau temps : quelques-uns), 0,25 (gel), 0,5 (temps sec : un ciel à moitié pris), jusqu'au ciel plein.
// Les ombres au sol : des plaques de la couleur de paroi de chaque case, par blocs de 2 m qui dérivent avec le vent (`NUAGES_VENT`, m/s), sur la même part du sol que le ciel.
// Un temps couvert (`couvert`) n'a ni plaques ni ombres du soleil : la lumière est la même partout, l'ombre d'un homme ou d'un parapet s'efface.
export const NUAGES = {
  canicule: { ciel: 0 }, beau: { ciel: 0.1 }, gel: { ciel: 0.25 }, sec: { ciel: 0.5 },
  brouillard: { ciel: 0.7, couvert: true }, neige: { ciel: 0.9, couvert: true }, couvert: { ciel: 0.95, couvert: true }, pluie: { ciel: 1, couvert: true }, tempete: { ciel: 1, couvert: true },
};
export const NUAGES_VENT = [10, 3];


// Les ombres du relief : un relief casse la lumière s'il fait au moins `seuilQ` quarts de mètre de plus que la case (0,5 m : un parapet, la lèvre d'un cratère, une paroi de tranchée) ;
// `portee` : mètres cherchés vers le soleil. Le soleil doit avoir bougé de `pasAngle` rad (ou de `pasLongueur` en part de l'ombre) pour qu'on recalcule, au plus toutes les `delai` s ; `budgetEcritureMs` : ms par image pour repeindre dans la texture du sol les rangées vues dont l'ombre a changé.
export const OMBRES_RELIEF = { seuilQ: 2, portee: 24, pasAngle: 0.035, pasLongueur: 0.06, delai: 3, budgetEcritureMs: 3 };
