// Les largages : des caisses en parachute lâchées par un avion au-dessus du no man's land, et les objets qui en sortent (Jérôme, 23 nov., v0.161.0 ;
// au labo seulement, sujet « Les largages et leurs objets » de « À construire » ; rien n'est branché dans le jeu). Le loot n'est plus refusé (DESIGN.md).
// Six raretés, quarante objets d'époque. L'objet sorti de la caisse tourne sur lui-même, monte et descend un peu, une flèche de la couleur de sa rareté
// au-dessus ; le premier homme d'un camp qui l'atteint le gagne pour son régiment. `effet` dit ce qu'il ferait en jeu : une PROPOSITION, aucune règle ne le lit.
//
// Le modèle de chaque objet est de la donnée : des boîtes, des cylindres et des cônes en mètres (la taille vraie), le dessous de l'objet à y = 0, y vers le
// haut, x vers la droite, z vers nous. Une couleur est une lettre de la palette (palette.js) ; `*` prend la couleur de la rareté (le liseré de l'objet).
//   B(largeur, hauteur, profondeur, x, y, z, couleur, rotation)   une boîte centrée en (x, y, z)
//   C(rayon, hauteur, x, y, z, couleur, rotation, pans)           un cylindre (debout ; la rotation le couche), 8 pans par défaut
//   K(rayon, hauteur, x, y, z, couleur, rotation, pans)           un cône, la pointe en haut
// `rotation` : [rx, ry, rz] en radians (ou rien).
import { RARETES_COULEURS, RARETES_BRILLANCE } from '../palette.js?v=0.161.1';

const B = (w, h, d, x, y, z, c, r) => ({ f: 'b', t: [w, h, d], p: [x, y, z], c, r });
const C = (rayon, h, x, y, z, c, r, n = 8) => ({ f: 'c', t: [rayon, h], p: [x, y, z], c, r, n });
const K = (rayon, h, x, y, z, c, r, n = 8) => ({ f: 'k', t: [rayon, h], p: [x, y, z], c, r, n });
const Q = Math.PI / 2;
const COUCHE_X = [0, 0, Q], COUCHE_Z = [Q, 0, 0];   // un cylindre couché le long de x, le long de z

// Les raretés, de la plus courante à la plus rare. `poids` : la chance qu'une caisse en sorte un (sur 100). `objets` : combien il y en a.
export const RARETES = {
  commun:     { nom: 'Commun',     couleur: RARETES_COULEURS.commun,     poids: 50, objets: 10 },
  peuCommun:  { nom: 'Peu commun', couleur: RARETES_COULEURS.peuCommun,  poids: 25, objets: 9 },
  rare:       { nom: 'Rare',       couleur: RARETES_COULEURS.rare,       poids: 13, objets: 8 },
  epique:     { nom: 'Épique',     couleur: RARETES_COULEURS.epique,     poids: 7,  objets: 6 },
  legendaire: { nom: 'Légendaire', couleur: RARETES_COULEURS.legendaire, poids: 4,  objets: 4 },
  relique:    { nom: 'Mythique',   couleur: RARETES_COULEURS.relique,    poids: 1,  objets: 3, brillance: RARETES_BRILLANCE.relique },   // (l'id reste `relique` : des reliques de 14-18)
};
export const ORDRE_RARETES = Object.keys(RARETES);

// Le largage lui-même (le labo le joue ; les nombres d'une proposition)
export const LARGAGE = {
  altitude: 55,        // m : l'avion passe à cette hauteur au-dessus du no man's land
  vitesseAvion: 45,    // m/s
  chuteLibre: 1.2,     // s avant que le parachute ne s'ouvre
  descente: 5,         // m/s sous le parachute
  balancement: 0.18,   // rad : la caisse se balance sous la corolle
  ouverture: 0.8,      // s : le couvercle saute, l'objet monte
  hauteurObjet: 1.4,   // m : l'objet flotte à cette hauteur au-dessus du sol
  grossi: 2.5,         // l'objet est dessiné plus grand que nature, pour se lire de loin (une PROPOSITION)
  tour: 2.6,           // s pour un tour sur lui-même
  flottement: [0.12, 1.8],  // m d'amplitude, s de période : il monte et descend
  flecheAu: 1.1,       // m au-dessus de l'objet (grossi compris)
  prise: 1.5,          // m : le premier homme à cette distance le prend
  course: 3,           // s : les hommes partent quand la caisse n'est plus qu'à ce temps du sol (ils la voient descendre)
  coureurs: 5,         // hommes de chaque camp qui courent vers la caisse
};

export const OBJETS = [
  // ── Communs : l'ordinaire de la tranchée ──
  { id: 'singe', nom: 'Boîte de singe', rarete: 'commun', effet: 'Le régiment mange : +3 de moral.',
    modele: [C(0.05, 0.11, 0, 0.055, 0, 'e', null, 10), C(0.051, 0.06, 0, 0.055, 0, 'g', null, 10), C(0.04, 0.008, 0, 0.114, 0, 'r', null, 10)] },
  { id: 'pinard', nom: 'Bidon de pinard', rarete: 'commun', effet: '+5 de moral, mais le régiment tire un peu moins juste jusqu\'au soir.',
    modele: [C(0.09, 0.22, 0, 0.11, 0, 'b', null, 10), C(0.06, 0.03, 0, 0.235, 0, 'e'), C(0.025, 0.05, 0, 0.27, 0, 'g'), B(0.02, 0.18, 0.04, 0.09, 0.13, 0, 's')] },
  { id: 'cartouches', nom: 'Musette de cartouches', rarete: 'commun', effet: 'Le régiment tire 10 % plus vite pendant une heure.',
    modele: [B(0.3, 0.2, 0.12, 0, 0.1, 0, 'h'), B(0.31, 0.09, 0.13, 0, 0.17, 0.004, 'g'), B(0.04, 0.03, 0.01, 0, 0.13, 0.07, 'e'), B(0.03, 0.3, 0.02, 0.13, 0.25, 0, 'b', [0, 0, 0.5])] },
  { id: 'pansements', nom: 'Paquet de pansements', rarete: 'commun', effet: 'Trois blessés du régiment sont soignés.',
    modele: [B(0.16, 0.08, 0.11, 0, 0.04, 0, 'o'), B(0.04, 0.005, 0.1, 0, 0.083, 0, 'b'), B(0.1, 0.005, 0.035, 0, 0.083, 0, 'b')] },
  { id: 'pelle', nom: 'Pelle-bêche', rarete: 'commun', effet: 'Le régiment creuse 20 % plus vite la nuit qui vient.',
    modele: [B(0.04, 0.4, 0.04, 0, 0.32, 0, 'g'), B(0.12, 0.03, 0.03, 0, 0.53, 0, 'g'), B(0.17, 0.2, 0.02, 0, 0.1, 0, 'e'), K(0.085, 0.06, 0, -0.01, 0, 'e', [Math.PI, 0, 0], 4)] },
  { id: 'tabac', nom: 'Paquet de tabac gris', rarete: 'commun', effet: '+2 de moral, et la peur monte moins vite jusqu\'au soir.',
    modele: [B(0.12, 0.05, 0.08, 0, 0.025, 0, 'r'), B(0.12, 0.012, 0.081, 0, 0.03, 0, 'b'), B(0.03, 0.06, 0.008, 0.07, 0.03, 0.02, 'o', [0, 0, 0.4])] },
  { id: 'bougies', nom: 'Bougies et allumettes', rarete: 'commun', effet: 'La nuit, le régiment veille mieux : une alerte de plus.',
    modele: [C(0.02, 0.18, -0.03, 0.09, 0, 'o'), C(0.02, 0.15, 0.03, 0.075, 0.02, 'o'), B(0.07, 0.025, 0.05, 0.06, 0.0125, -0.05, 'g'), K(0.008, 0.02, -0.03, 0.19, 0, 'h', null, 4)] },
  { id: 'lettres', nom: 'Sac de lettres', rarete: 'commun', effet: 'Les nouvelles de l\'arrière : +4 de moral.',
    modele: [C(0.14, 0.3, 0, 0.15, 0, 'h', null, 7), K(0.14, 0.12, 0, 0.36, 0, 'h', null, 7), C(0.03, 0.03, 0, 0.36, 0, 'b'), B(0.1, 0.07, 0.005, 0.04, 0.15, 0.14, 'o', [0, 0, 0.2])] },
  { id: 'biscuits', nom: 'Biscuits de guerre', rarete: 'commun', effet: 'Le régiment mange : +2 de moral, la fatigue redescend.',
    modele: [B(0.22, 0.04, 0.16, 0, 0.02, 0, 'g'), B(0.09, 0.02, 0.09, -0.05, 0.05, 0, 'h'), B(0.09, 0.02, 0.09, 0.05, 0.07, 0.01, 'h', [0, 0.3, 0])] },
  { id: 'fil', nom: 'Rouleau de fil de fer', rarete: 'commun', effet: 'Dix mètres de barbelés en plus, posés la nuit qui vient.',
    modele: [C(0.16, 0.3, 0, 0.16, 0, 'r', COUCHE_X, 6), C(0.11, 0.31, 0, 0.16, 0, 's', COUCHE_X, 6), B(0.02, 0.4, 0.02, 0, 0.16, 0, 'g', [0, 0, Q])] },

  // ── Peu communs : le matériel qui manque ──
  { id: 'citrons', nom: 'Caisse de grenades citrons', rarete: 'peuCommun', effet: 'Le régiment lance une salve de grenades au corps à corps.',
    modele: [B(0.3, 0.12, 0.2, 0, 0.06, 0, 'g'), B(0.3, 0.02, 0.2, 0, 0.13, -0.12, 'g', [-0.9, 0, 0]),
      ...[-0.09, 0, 0.09].map(x => C(0.035, 0.07, x, 0.15, 0.02, 'v', null, 6)), B(0.02, 0.04, 0.02, 0.09, 0.2, 0.02, 'e')] },
  { id: 'masque', nom: 'Masque à gaz M2', rarete: 'peuCommun', effet: 'Le régiment ne craint pas le gaz pendant un jour.',
    modele: [B(0.2, 0.24, 0.07, 0, 0.12, 0, 'h'), C(0.035, 0.02, -0.05, 0.16, 0.04, 'e', COUCHE_Z), C(0.035, 0.02, 0.05, 0.16, 0.04, 'e', COUCHE_Z), K(0.05, 0.08, 0, 0.04, 0.06, 'g', [Q, 0, 0], 6), B(0.21, 0.015, 0.01, 0, 0.22, -0.03, 'b')] },
  { id: 'periscope', nom: 'Périscope de tranchée', rarete: 'peuCommun', effet: 'Le régiment voit à 50 m de plus sans se montrer.',
    modele: [B(0.06, 0.6, 0.06, 0, 0.3, 0, 'g'), B(0.06, 0.08, 0.1, 0, 0.62, 0.02, 'g'), B(0.04, 0.04, 0.005, 0, 0.62, 0.075, 'e'), B(0.04, 0.04, 0.005, 0, 0.06, 0.033, 'e')] },
  { id: 'cisailles', nom: 'Cisailles coupe-fil', rarete: 'peuCommun', effet: 'Le régiment passe les barbelés deux fois plus vite.',
    modele: [B(0.03, 0.32, 0.02, -0.04, 0.16, 0, 'b', [0, 0, -0.18]), B(0.03, 0.32, 0.02, 0.04, 0.16, 0, 'b', [0, 0, 0.18]), B(0.05, 0.1, 0.03, -0.008, 0.36, 0, 'e', [0, 0, 0.12]), B(0.05, 0.1, 0.03, 0.008, 0.36, 0.005, 'e', [0, 0, -0.12])] },
  { id: 'couverture', nom: 'Couverture roulée', rarete: 'peuCommun', effet: 'Le froid et la pluie ne pèsent plus sur le moral cette nuit.',
    modele: [C(0.09, 0.5, 0, 0.09, 0, 'b', COUCHE_X, 8), C(0.091, 0.04, -0.15, 0.09, 0, 's', COUCHE_X, 8), C(0.091, 0.04, 0.15, 0.09, 0, 's', COUCHE_X, 8)] },
  { id: 'lampe', nom: 'Lampe-tempête', rarete: 'peuCommun', effet: 'La nuit, les corvées du régiment vont plus vite.',
    modele: [C(0.07, 0.04, 0, 0.02, 0, 'e'), C(0.05, 0.12, 0, 0.1, 0, 'o', null, 8), K(0.07, 0.06, 0, 0.19, 0, 'e'), B(0.01, 0.08, 0.1, 0, 0.26, 0, 's'), B(0.012, 0.16, 0.012, 0.065, 0.1, 0, 'e'), B(0.012, 0.16, 0.012, -0.065, 0.1, 0, 'e')] },
  { id: 'gnole', nom: 'Gourde de gnôle', rarete: 'peuCommun', effet: 'Avant un assaut : +10 de moral pour l\'heure qui suit.',
    modele: [C(0.1, 0.06, 0, 0.1, 0, 'e', COUCHE_Z, 12), C(0.101, 0.03, 0, 0.1, 0, 'b', COUCHE_Z, 12), C(0.02, 0.05, 0, 0.22, 0, 'g'), B(0.012, 0.25, 0.012, 0.1, 0.15, 0, 'b', [0, 0, 0.3])] },
  { id: 'fusees', nom: 'Pistolet lance-fusées', rarete: 'peuCommun', effet: 'Une fusée éclaire 100 m de no man\'s land pendant une minute, la nuit.',
    modele: [B(0.05, 0.12, 0.04, 0, 0.06, 0, 'b', [0, 0, -0.25]), C(0.025, 0.22, 0.12, 0.13, 0, 'e', COUCHE_X, 8), B(0.04, 0.03, 0.04, 0.02, 0.13, 0, 'e'), C(0.02, 0.06, 0.12, 0.03, 0.06, '*', null, 6)] },
  { id: 'sifflet', nom: 'Sifflet d\'officier', rarete: 'peuCommun', effet: 'Le régiment répond aux ordres sans délai.',
    modele: [C(0.015, 0.08, 0, 0.015, 0, 'e', COUCHE_X, 8), C(0.022, 0.03, -0.035, 0.022, 0, 'e', COUCHE_Z, 8), B(0.005, 0.005, 0.12, 0.03, 0.015, -0.04, 'h', [0, 0.4, 0])] },

  // ── Rares : ce qu'on voit peu en première ligne ──
  { id: 'chauchat', nom: 'Fusil-mitrailleur Chauchat', rarete: 'rare', effet: 'Un tireur du régiment a le feu d\'une demi-mitrailleuse.',
    modele: [B(0.8, 0.06, 0.05, 0, 0.12, 0, 'b'), C(0.02, 0.35, 0.55, 0.13, 0, 'e', COUCHE_X, 6), B(0.2, 0.08, 0.04, -0.45, 0.09, 0, 'g', [0, 0, -0.15]), C(0.09, 0.025, 0.08, 0.05, 0, 'e', COUCHE_Z, 10), B(0.01, 0.12, 0.01, 0.5, 0.05, 0.03, 'e', [0, 0, 0.3]), B(0.01, 0.12, 0.01, 0.5, 0.05, -0.03, 'e', [0, 0, 0.3])] },
  { id: 'vb', nom: 'Tromblon Viven-Bessières', rarete: 'rare', effet: 'Le régiment lance des grenades à 150 m.',
    modele: [C(0.035, 0.18, 0, 0.09, 0, 'e', null, 8), C(0.04, 0.02, 0, 0.18, 0, 's', null, 8), C(0.018, 0.4, 0, -0.1, 0, 'b', null, 6), C(0.025, 0.06, 0, 0.21, 0, 'v', null, 6)] },
  { id: 'jumelles', nom: 'Jumelles de campagne', rarete: 'rare', effet: 'Les barrages du secteur tombent 30 % plus près de leur but.',
    modele: [C(0.03, 0.15, -0.04, 0.03, 0, 'b', COUCHE_Z, 8), C(0.03, 0.15, 0.04, 0.03, 0, 'b', COUCHE_Z, 8), C(0.034, 0.02, -0.04, 0.03, 0.08, 'e', COUCHE_Z, 8), C(0.034, 0.02, 0.04, 0.03, 0.08, 'e', COUCHE_Z, 8), B(0.05, 0.02, 0.04, 0, 0.05, -0.02, 'e')] },
  { id: 'carte', nom: 'Carte d\'état-major', rarete: 'rare', effet: 'Le brouillard se lève sur leur 2e ligne pour un jour.',
    modele: [B(0.42, 0.006, 0.3, 0, 0.003, 0, 'o'), B(0.42, 0.007, 0.004, 0, 0.004, 0.03, 'g'), B(0.004, 0.007, 0.3, 0.07, 0.004, 0, 'g'), B(0.25, 0.008, 0.006, -0.03, 0.005, -0.06, 'n', [0, 0.3, 0]), B(0.2, 0.008, 0.006, 0.02, 0.005, 0.09, 'x', [0, -0.2, 0])] },
  { id: 'pigeons', nom: 'Panier de pigeons voyageurs', rarete: 'rare', effet: 'Un barrage commandé arrive deux fois plus vite.',
    modele: [B(0.3, 0.22, 0.22, 0, 0.11, 0, 'g'), B(0.26, 0.17, 0.005, 0, 0.12, 0.111, 's'), B(0.08, 0.07, 0.11, -0.05, 0.08, 0.06, 'r'), B(0.03, 0.04, 0.04, -0.01, 0.13, 0.1, 'r'), B(0.32, 0.03, 0.24, 0, 0.235, 0, 'b')] },
  { id: 'telephone', nom: 'Téléphone de campagne', rarete: 'rare', effet: 'Le régiment reçoit les ordres même coupé de la 2e ligne.',
    modele: [B(0.24, 0.15, 0.18, 0, 0.075, 0, 'b'), B(0.18, 0.03, 0.04, 0, 0.17, 0, 'e'), C(0.02, 0.03, -0.09, 0.17, 0, 'e', COUCHE_Z, 6), C(0.02, 0.03, 0.09, 0.17, 0, 'e', COUCHE_Z, 6), C(0.03, 0.01, 0.13, 0.08, 0, 'e', COUCHE_X, 6)] },
  { id: 'trousse', nom: 'Trousse de chirurgien', rarete: 'rare', effet: 'La moitié des blessés du régiment reviennent au rang ce soir.',
    modele: [B(0.36, 0.16, 0.14, 0, 0.08, 0, 's'), B(0.12, 0.04, 0.02, 0, 0.18, 0, 'b'), B(0.06, 0.012, 0.012, 0, 0.1, 0.072, 'o'), B(0.016, 0.06, 0.012, 0, 0.1, 0.072, 'o'), B(0.37, 0.02, 0.15, 0, 0.12, 0, 'g')] },
  { id: 'crapouillot', nom: 'Crapouillot de 58', rarete: 'rare', effet: 'Le régiment détruit un tronçon de barbelés à 300 m.',
    modele: [B(0.5, 0.08, 0.35, 0, 0.04, 0, 'g'), C(0.06, 0.6, 0.02, 0.33, 0, 'e', [0, 0, -0.55], 8), C(0.07, 0.04, 0.17, 0.56, 0, 's', [0, 0, -0.55], 8), B(0.04, 0.2, 0.04, -0.1, 0.16, 0, 'e', [0, 0, 0.3])] },

  // ── Épiques : un tournant pour un régiment ──
  { id: 'hotchkiss', nom: 'Mitrailleuse Hotchkiss', rarete: 'epique', effet: 'Le régiment pose un nid de mitrailleuse où il se tient.',
    modele: [B(0.7, 0.1, 0.09, 0, 0.42, 0, 'b'), C(0.03, 0.45, 0.55, 0.43, 0, 'e', COUCHE_X, 8),
      ...[0.4, 0.46, 0.52, 0.58, 0.64].map(x => C(0.045, 0.025, x, 0.43, 0, 'h', COUCHE_X, 8)),
      B(0.03, 0.42, 0.03, 0.1, 0.18, 0.12, 'e', [0.4, 0, 0]), B(0.03, 0.42, 0.03, 0.1, 0.18, -0.12, 'e', [-0.4, 0, 0]), B(0.03, 0.45, 0.03, -0.2, 0.2, 0, 'e', [0, 0, 0.5]), B(0.2, 0.03, 0.1, -0.3, 0.48, 0, 'h')] },
  { id: 'lanceflammes', nom: 'Lance-flammes Schilt', rarete: 'epique', effet: 'Le régiment vide une tranchée d\'en face au contact.',
    modele: [C(0.1, 0.55, -0.11, 0.3, 0, 'e', null, 8), C(0.1, 0.55, 0.11, 0.3, 0, 'e', null, 8), K(0.1, 0.05, -0.11, 0.6, 0, 'e'), K(0.1, 0.05, 0.11, 0.6, 0, 'e'), B(0.3, 0.04, 0.04, 0, 0.45, 0.1, 'b'),
      C(0.02, 0.6, 0.3, 0.2, 0.12, 's', [0, 0, -1.1], 6), K(0.03, 0.05, 0.55, 0.32, 0.12, '*', [0, 0, -1.1], 6)] },
  { id: 'casque', nom: 'Casque Adrian cabossé', rarete: 'epique', effet: 'Celui qui le porte ne peut pas mourir aujourd\'hui (il peut être blessé).',
    modele: [C(0.15, 0.02, 0, 0.01, 0, 'n', null, 12), C(0.12, 0.1, 0, 0.07, 0, 'n', null, 12), K(0.12, 0.07, 0, 0.155, 0, 'n', null, 12), B(0.02, 0.04, 0.24, 0, 0.19, 0, 'n'), B(0.04, 0.03, 0.005, 0.05, 0.08, 0.12, '*'), B(0.05, 0.02, 0.06, -0.08, 0.12, 0.06, 's', [0, 0.4, 0.3])] },
  { id: 'drapeau', nom: 'Drapeau du régiment', rarete: 'epique', effet: 'Le régiment qui le plante ne recule plus de la journée.',
    modele: [C(0.015, 1.4, 0, 0.7, 0, 'g', null, 6), K(0.03, 0.08, 0, 1.44, 0, '*', null, 6), B(0.5, 0.35, 0.01, 0.26, 1.18, 0, 'n'), B(0.17, 0.35, 0.011, 0.43, 1.18, 0, 'o'), B(0.5, 0.04, 0.012, 0.26, 1.0, 0, '*')] },
  { id: 'plan', nom: 'Plan des lignes d\'en face', rarete: 'epique', effet: 'Leurs batteries apparaissent sur la carte : nos barrages peuvent les viser.',
    modele: [C(0.05, 0.5, 0, 0.05, 0, 'o', COUCHE_X, 8), C(0.051, 0.03, -0.1, 0.05, 0, 'x', COUCHE_X, 8), C(0.051, 0.03, 0.1, 0.05, 0, 'x', COUCHE_X, 8), C(0.035, 0.02, 0.15, 0.05, 0.05, '*', COUCHE_Z, 8)] },
  { id: 'obus155', nom: 'Caisse d\'obus de 155', rarete: 'epique', effet: 'Un barrage de 155 de plus, à commander quand on veut.',
    modele: [B(0.6, 0.2, 0.45, 0, 0.1, 0, 'g'), ...[-0.18, -0.06, 0.06, 0.18].map(x => C(0.055, 0.42, x, 0.25, 0, 'e', COUCHE_Z, 8)), ...[-0.18, -0.06, 0.06, 0.18].map(x => K(0.055, 0.12, x, 0.25, 0.27, 'h', [Q, 0, 0], 8))] },

  // ── Légendaires : ce qu'on raconte après ──
  { id: 'croix', nom: 'Croix de guerre', rarete: 'legendaire', effet: 'Tout le régiment passe un chevron d\'expérience.',
    modele: [B(0.04, 0.06, 0.005, 0, 0.17, 0, 'v'), ...[0.01, -0.01].map(x => B(0.006, 0.06, 0.006, x, 0.17, 0.001, 'w')), B(0.025, 0.11, 0.008, 0, 0.08, 0, '*'), B(0.11, 0.025, 0.008, 0, 0.08, 0, '*'), C(0.014, 0.012, 0, 0.08, 0.002, 'h', COUCHE_Z, 10), ...[[0, 0.135], [0, 0.025], [0.055, 0.08], [-0.055, 0.08]].map(([x, y]) => B(0.03, 0.012, 0.01, x, y, 0, '*', [0, 0, x ? Q : 0]))] },
  { id: 'fanion', nom: 'Fanion du général', rarete: 'legendaire', effet: 'Tous nos régiments en vue gagnent +15 de moral.',
    modele: [C(0.012, 1.1, 0, 0.55, 0, 's', null, 6), B(0.4, 0.26, 0.01, 0.21, 0.95, 0, '*'), B(0.4, 0.06, 0.011, 0.21, 0.95, 0, 'o'), K(0.04, 0.09, 0, 1.15, 0, 'h', null, 4), C(0.03, 0.03, 0, 0.015, 0, 'e')] },
  { id: 'montre', nom: 'Montre de gousset', rarete: 'legendaire', effet: 'L\'heure H est à nous : nos barrages tombent à la seconde voulue, sans délai.',
    modele: [C(0.05, 0.018, 0, 0.06, 0, '*', COUCHE_Z, 14), C(0.043, 0.02, 0, 0.06, 0, 'o', COUCHE_Z, 14), B(0.003, 0.03, 0.022, 0, 0.073, 0, 's'), B(0.02, 0.003, 0.022, 0.01, 0.06, 0, 's'), C(0.01, 0.02, 0, 0.12, 0, '*', null, 6), C(0.015, 0.006, 0, 0.14, 0, '*', COUCHE_Z, 8)] },
  { id: 'clairon', nom: 'Clairon de la relève', rarete: 'legendaire', effet: 'Les régiments en déroute du secteur se rallient d\'un coup.',
    modele: [C(0.012, 0.35, 0, 0.05, 0, 'h', COUCHE_X, 6), K(0.07, 0.14, 0.24, 0.05, 0, 'h', [0, 0, -Q], 10), C(0.012, 0.25, -0.02, 0.09, 0, 'h', COUCHE_X, 6), C(0.04, 0.02, 0.1, 0.07, 0, 'h', COUCHE_X, 6), B(0.012, 0.012, 0.05, -0.18, 0.06, 0, '*'), B(0.2, 0.08, 0.008, 0.05, 0.0, 0.01, '*', [0, 0, 0.1])] },

  // ── Mythiques (des reliques) : une seule par bataille, au mieux ; elles brillent ──
  { id: 'vierge', nom: 'La Vierge penchée d\'Albert', rarete: 'relique', effet: 'Tant qu\'on la tient, notre secteur ne peut pas tomber.',
    modele: [B(0.3, 0.12, 0.3, 0, 0.06, 0, 'r'), C(0.03, 0.9, 0.12, 0.5, 0, 'e', [0, 0, -0.5], 6), K(0.12, 0.5, 0.3, 0.75, 0, '*', [0, 0, -1.2], 8), C(0.05, 0.08, 0.53, 0.83, 0, '*', [0, 0, -1.2], 8), C(0.06, 0.05, 0.35, 0.95, 0, 'h', [0, 0, -1.2], 8), B(0.12, 0.03, 0.03, 0.38, 0.72, 0.06, '*', [0, 0, -1.2])] },
  { id: 'taxi', nom: 'Un taxi de la Marne', rarete: 'relique', effet: 'Un régiment frais arrive à l\'instant, sans attendre la nuit.',
    modele: [B(1.6, 0.35, 0.7, 0, 0.45, 0, 'w'), B(0.7, 0.45, 0.68, -0.25, 0.85, 0, 's'), B(0.66, 0.3, 0.7, -0.25, 0.9, 0, 'e'), B(0.5, 0.25, 0.6, 0.55, 0.7, 0, 'w'),
      ...[[-0.5, 0.36], [-0.5, -0.36], [0.55, 0.36], [0.55, -0.36]].map(([x, z]) => C(0.22, 0.1, x, 0.22, z, 't', COUCHE_Z, 10)), C(0.06, 0.02, 0.81, 0.65, 0.2, '*', COUCHE_X, 8), C(0.06, 0.02, 0.81, 0.65, -0.2, '*', COUCHE_X, 8), B(0.12, 0.08, 0.06, -0.2, 1.11, 0, '*')] },
  { id: 'ballon', nom: 'Le ballon de la trêve de Noël', rarete: 'relique', effet: 'Un jour sans tirs sur tout le front : les deux camps relèvent leurs blessés.',
    modele: [C(0.11, 0.22, 0, 0.11, 0, 'g', null, 10), K(0.11, 0.06, 0, 0.25, 0, 'g', null, 10), K(0.11, 0.06, 0, -0.03, 0, 'g', [Math.PI, 0, 0], 10), B(0.225, 0.02, 0.02, 0, 0.11, 0, 'b'), B(0.02, 0.02, 0.225, 0, 0.11, 0, 'b'), B(0.01, 0.05, 0.226, 0, 0.17, 0, '*')] },
];

// Tirer un objet d'une caisse : la rareté selon `poids`, puis un objet de cette rareté ; `u` et `v` dans [0, 1) (le hasard de l'appelant)
export function tirerObjet(u, v) {
  const total = ORDRE_RARETES.reduce((s, k) => s + RARETES[k].poids, 0);
  let x = u * total, rarete = ORDRE_RARETES[0];
  for (const k of ORDRE_RARETES) { if (x < RARETES[k].poids) { rarete = k; break; } x -= RARETES[k].poids; }
  const choix = OBJETS.filter(o => o.rarete === rarete);
  return choix[Math.min(choix.length - 1, Math.floor(v * choix.length))];
}
