// La patrouille de nuit (Jérôme, 16 nov. : « une mission interlude où l'on déplace un petit groupe de soldats (30-50) d'un point A à un point B de nuit » ; prototype au labo, v0.142.0).
// Les chiffres sont des propositions, à éprouver au labo : rien ici n'est mesuré.
export const PATROUILLE = {
  hommes: 40,                 // la taille du groupe
  colonnes: 8,                // hommes par rang dans la formation
  ecart: 1.6,                 // m entre deux hommes
  vitesse: { debout: 1.3, couche: 0.35 },   // m/s du groupe ; un homme rattrape sa place jusqu'à 1,6 × plus vite
  arrivee: 7,                 // m : le centre du groupe à cette distance du but, la patrouille est arrivée
  but: 18,                    // m en deçà de leur première ligne (le but posé au labo : à portée de voix de leur fil)
};
// Les fusées éclairantes d'en face : un tir toutes les `intervalle` secondes, au-dessus du groupe à `ecart` m près ; elle éclaire de `allume` à `eteint` secondes après le tir,
// dans un rayon de `rayon` m (celui de la lumière qu'en dessine le rendu : `LUM_NUIT.fusee` de rendu3d.js)
export const FUSEES = { intervalle: [6, 14], premiere: 8, ecart: [40, 26], allume: 1.5, eteint: 12, rayon: 42 };
// Être vu : l'alerte du poste monte de `vitesse` par seconde quand tout le groupe est exposé (au prorata des hommes exposés), redescend de `oubli` par seconde ; à 1, le poste tire.
// L'exposition d'un homme : debout sous une fusée 1 (1,5 s'il marche), couché à découvert 0,08 (0,15 au premier essai : un joueur prudent perdait encore la moitié du groupe), couché dans un trou 0 ; debout au fond d'une tranchée (sol à `tranchee` m) 0 ;
// dans le noir, seulement à moins de `ecoute` m d'un poste : `bruit` s'il est debout. `creux` : la profondeur (m) d'un trou qui cache un homme couché.
// (v0.142.0, premier essai : `vitesse` 0,7 remplissait l'alerte en une seconde, avant qu'on ait pu se coucher ; à 0,25, trois secondes debout dans la lumière)
export const REPERAGE = { vitesse: 0.25, oubli: 0.12, debout: 1, marche: 1.5, couche: 0.08, trou: 0, ecoute: 28, bruit: 0.5, creux: -0.5, tranchee: -1.25 };
// Le feu du poste qui a vu : `duree` s'il tire, une rafale par seconde ; à chaque rafale, un homme exposé tombe avec la probabilité `touche` (debout, couché à découvert) ;
// après le feu, l'alerte retombe à `apres` ; un poste ne tire qu'à moins de `portee` m
// (premier essai : 0,3 debout, quatre rafales : la moitié du groupe tombait au premier feu)
export const FEU_PATROUILLE = { duree: 3, touche: { debout: 0.12, couche: 0.03 }, apres: 0.45, portee: 220 };
