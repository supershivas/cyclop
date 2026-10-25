// La course du soleil et les ombres du relief (labo « La lumière dans le relief »). Du dessin seulement : rien de ceci n'entre dans la partie.
// Le jeu d'avant : un arc de 6 h à 18 h, du levant au couchant par le sud, 0,95 rad au plus haut, une ombre jamais plus longue que 3,5 fois la hauteur
// (à 5, l'ombre d'un arbre traversait 45 m de champ).
export const SOLEIL = { hauteurMax: 0.95, hauteurMin: 0.1, ombreMax: 3.5, depart: 6, fin: 18 };

// Le soleil de chaque saison (`hauteurMax`, rad) : bas l'hiver (ombres longues), haut l'été. Le lever et le coucher restent ceux de l'horloge du jeu (6 h, 18 h).
export const SOLEIL_SAISONS = { automne: 0.95, hiver: 0.5, ete: 1.2 };

// Les azimuts à essayer (rad, ajoutés à l'arc : le soleil tourne autour de la vue). La caméra du jeu regarde le nord, le soleil est au sud à midi : l'ombre part loin d'elle.
export const AZIMUTS = { sud: 0, 'sud-est': Math.PI / 4, 'vers la caméra': Math.PI / 2 };

// Les ombres du relief : un relief casse la lumière s'il fait au moins `seuilQ` quarts de mètre de plus que la case (0,5 m : un parapet, la lèvre d'un cratère, une paroi de tranchée) ;
// `portee` : mètres cherchés vers le soleil. Le soleil doit avoir bougé de `pasAngle` rad (ou de `pasLongueur` en part de l'ombre) pour qu'on recalcule, au plus toutes les `delai` s ; `budgetEcritureMs` : ms par image pour repeindre dans la texture du sol les rangées vues dont l'ombre a changé.
export const OMBRES_RELIEF = { seuilQ: 2, portee: 24, pasAngle: 0.035, pasLongueur: 0.06, delai: 3, budgetEcritureMs: 3 };
