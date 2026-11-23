// Les largages : des caisses en parachute lâchées par un avion au-dessus du no man's land, et les objets qui en sortent (Jérôme, 23 nov., v0.161.0 ;
// au labo seulement, sujet « Les largages et leurs objets » de « À construire » ; rien n'est branché dans le jeu). Le loot n'est plus refusé (DESIGN.md).
// Six raretés, quarante objets d'époque. L'objet sorti de la caisse tourne sur lui-même, monte et descend un peu, une flèche de la couleur de sa rareté
// au-dessus ; le premier homme d'un camp qui l'atteint le gagne pour son régiment. `effet` dit ce qu'il ferait en jeu : une PROPOSITION, aucune règle ne le lit. Chaque effet sert le camp qui prend l'objet, et lui seul (Jérôme, v0.161.2 : rien
// d'inutile, rien qui profite aux deux armées) ; pris par l'adversaire, il joue contre nous. L'artillerie va en échelle : une salve de 75 (commun), un 155 (peu commun),
// un 220 (épique), deux 220 ensemble (légendaire), quatre 220 en une fois (mythique).
//
// Le modèle de chaque objet est de la donnée : des boîtes, des cylindres et des cônes en mètres (la taille vraie), le dessous de l'objet à y = 0, y vers le
// haut, x vers la droite, z vers nous. Une couleur est une lettre de la palette (palette.js) ; `*` prend la couleur de la rareté (le liseré de l'objet).
//   B(largeur, hauteur, profondeur, x, y, z, couleur, rotation)   une boîte centrée en (x, y, z)
//   C(rayon, hauteur, x, y, z, couleur, rotation, pans)           un cylindre (debout ; la rotation le couche), 8 pans par défaut
//   K(rayon, hauteur, x, y, z, couleur, rotation, pans)           un cône, la pointe en haut
// `rotation` : [rx, ry, rz] en radians (ou rien).
import { RARETES_COULEURS, RARETES_BRILLANCE } from '../palette.js?v=0.161.2';

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
  { id: 'pinard', nom: 'Bidon de pinard', rarete: 'commun', effet: '+6 de moral au régiment.',
    modele: [C(0.09, 0.22, 0, 0.11, 0, 'b', null, 10), C(0.06, 0.03, 0, 0.235, 0, 'e'), C(0.025, 0.05, 0, 0.27, 0, 'g'), B(0.02, 0.18, 0.04, 0.09, 0.13, 0, 's')] },
  { id: 'cartouches', nom: 'Musette de cartouches', rarete: 'commun', effet: 'Le régiment tire 10 % plus vite pendant une heure.',
    modele: [B(0.3, 0.2, 0.12, 0, 0.1, 0, 'h'), B(0.31, 0.09, 0.13, 0, 0.17, 0.004, 'g'), B(0.04, 0.03, 0.01, 0, 0.13, 0.07, 'e'), B(0.03, 0.3, 0.02, 0.13, 0.25, 0, 'b', [0, 0, 0.5])] },
  { id: 'pansements', nom: 'Paquet de pansements', rarete: 'commun', effet: 'Trois blessés du régiment reviennent au rang.',
    modele: [B(0.16, 0.08, 0.11, 0, 0.04, 0, 'o'), B(0.04, 0.005, 0.1, 0, 0.083, 0, 'b'), B(0.1, 0.005, 0.035, 0, 0.083, 0, 'b')] },
  { id: 'cafe', nom: 'Bouthéon de café', rarete: 'commun', effet: 'La fatigue du régiment tombe comme après une nuit de repos.',
    modele: [C(0.1, 0.24, 0, 0.12, 0, 'e', null, 10), C(0.105, 0.03, 0, 0.255, 0, 's', null, 10), K(0.05, 0.04, 0, 0.29, 0, 'e', null, 8), B(0.015, 0.14, 0.015, 0.115, 0.15, 0, 'e'), B(0.2, 0.015, 0.015, 0, 0.32, 0, 'b')] },
  { id: 'tabac', nom: 'Paquet de tabac gris', rarete: 'commun', effet: 'La peur du régiment monte 30 % moins vite jusqu\'au soir.',
    modele: [B(0.12, 0.05, 0.08, 0, 0.025, 0, 'r'), B(0.12, 0.012, 0.081, 0, 0.03, 0, 'b'), B(0.03, 0.06, 0.008, 0.07, 0.03, 0.02, 'o', [0, 0, 0.4])] },
  { id: 'fuseeRouge', nom: 'Fusée rouge', rarete: 'commun', effet: 'Le signal du barrage : une salve de 75 (24 obus) où l\'on clique, sans attendre la batterie.',
    modele: [C(0.022, 0.16, -0.03, 0.08, 0, 'o', null, 8), C(0.023, 0.03, -0.03, 0.015, 0, 'h', null, 8), C(0.022, 0.16, 0.03, 0.08, 0.02, 'o', null, 8), C(0.023, 0.03, 0.03, 0.015, 0.02, 'h', null, 8), B(0.03, 0.006, 0.03, -0.03, 0.163, 0, 's'), B(0.03, 0.006, 0.03, 0.03, 0.163, 0.02, 's')] },
  { id: 'lettres', nom: 'Sac de lettres', rarete: 'commun', effet: 'Les nouvelles de l\'arrière : +4 de moral, et la peur redescend.',
    modele: [C(0.14, 0.3, 0, 0.15, 0, 'h', null, 7), K(0.14, 0.12, 0, 0.36, 0, 'h', null, 7), C(0.03, 0.03, 0, 0.36, 0, 'b'), B(0.1, 0.07, 0.005, 0.04, 0.15, 0.14, 'o', [0, 0, 0.2])] },
  { id: 'biscuits', nom: 'Biscuits de guerre', rarete: 'commun', effet: 'Une nuit de vivres en plus pour le régiment.',
    modele: [B(0.22, 0.04, 0.16, 0, 0.02, 0, 'g'), B(0.09, 0.02, 0.09, -0.05, 0.05, 0, 'h'), B(0.09, 0.02, 0.09, 0.05, 0.07, 0.01, 'h', [0, 0.3, 0])] },
  { id: 'essence', nom: 'Bidon d\'essence', rarete: 'commun', effet: 'Un de nos avions abîmés est réparé d\'un point et prêt à repartir.',
    modele: [B(0.32, 0.42, 0.15, 0, 0.21, 0, 'w'), B(0.3, 0.02, 0.152, 0, 0.3, 0, 's'), B(0.1, 0.04, 0.03, -0.06, 0.45, 0, 'w'), C(0.025, 0.05, 0.1, 0.44, 0, 'e', null, 6)] },

  // ── Peu communs : le matériel qui manque ──
  { id: 'citrons', nom: 'Caisse de grenades citrons', rarete: 'peuCommun', effet: 'Au corps à corps, le régiment tue 30 % de plus pendant une heure.',
    modele: [B(0.3, 0.12, 0.2, 0, 0.06, 0, 'g'), B(0.3, 0.02, 0.2, 0, 0.13, -0.12, 'g', [-0.9, 0, 0]),
      ...[-0.09, 0, 0.09].map(x => C(0.035, 0.07, x, 0.15, 0.02, 'v', null, 6)), B(0.02, 0.04, 0.02, 0.09, 0.2, 0.02, 'e')] },
  { id: 'cheddite', nom: 'Pétards de cheddite', rarete: 'peuCommun', effet: 'Font sauter leur fil de fer sur 30 m devant le régiment.',
    modele: [...[[-0.03, -0.03], [0.03, -0.03], [-0.03, 0.03], [0.03, 0.03]].map(([x, z]) => B(0.05, 0.28, 0.05, x, 0.14, z, 'g')), B(0.13, 0.03, 0.13, 0, 0.08, 0, 'b'), B(0.13, 0.03, 0.13, 0, 0.2, 0, 'b'), B(0.01, 0.15, 0.01, 0, 0.35, 0, 'o', [0, 0, 0.4])] },
  { id: 'periscope', nom: 'Périscope de tranchée', rarete: 'peuCommun', effet: 'À couvert, le régiment tire 15 % plus juste jusqu\'au soir.',
    modele: [B(0.06, 0.6, 0.06, 0, 0.3, 0, 'g'), B(0.06, 0.08, 0.1, 0, 0.62, 0.02, 'g'), B(0.04, 0.04, 0.005, 0, 0.62, 0.075, 'e'), B(0.04, 0.04, 0.005, 0, 0.06, 0.033, 'e')] },
  { id: 'cisailles', nom: 'Cisailles coupe-fil', rarete: 'peuCommun', effet: 'Le régiment passe les barbelés deux fois plus vite.',
    modele: [B(0.03, 0.32, 0.02, -0.04, 0.16, 0, 'b', [0, 0, -0.18]), B(0.03, 0.32, 0.02, 0.04, 0.16, 0, 'b', [0, 0, 0.18]), B(0.05, 0.1, 0.03, -0.008, 0.36, 0, 'e', [0, 0, 0.12]), B(0.05, 0.1, 0.03, 0.008, 0.36, 0.005, 'e', [0, 0, -0.12])] },
  { id: 'couverture', nom: 'Couverture roulée', rarete: 'peuCommun', effet: 'Cette nuit, le repos du régiment compte double : la fatigue et la peur tombent deux fois.',
    modele: [C(0.09, 0.5, 0, 0.09, 0, 'b', COUCHE_X, 8), C(0.091, 0.04, -0.15, 0.09, 0, 's', COUCHE_X, 8), C(0.091, 0.04, 0.15, 0.09, 0, 's', COUCHE_X, 8)] },
  { id: 'fuseeVerte', nom: 'Fusée verte', rarete: 'peuCommun', effet: 'L\'artillerie lourde répond : un barrage de 155 (12 obus) où l\'on clique.',
    modele: [C(0.03, 0.24, 0, 0.12, 0, 'v', null, 8), C(0.031, 0.04, 0, 0.02, 0, 'h', null, 8), K(0.03, 0.06, 0, 0.27, 0, 'w', null, 8), B(0.008, 0.3, 0.008, 0.05, 0.15, 0, 'g')] },
  { id: 'gnole', nom: 'Gourde de gnôle', rarete: 'peuCommun', effet: '+10 de moral, et la peur ne monte pas pendant une heure : de quoi sortir à l\'assaut.',
    modele: [C(0.1, 0.06, 0, 0.1, 0, 'e', COUCHE_Z, 12), C(0.101, 0.03, 0, 0.1, 0, 'b', COUCHE_Z, 12), C(0.02, 0.05, 0, 0.22, 0, 'g'), B(0.012, 0.25, 0.012, 0.1, 0.15, 0, 'b', [0, 0, 0.3])] },
  { id: 'fusees', nom: 'Pistolet lance-fusées', rarete: 'peuCommun', effet: 'La nuit, le régiment voit venir l\'ennemi : +25 % dans la mêlée de nuit.',
    modele: [B(0.05, 0.12, 0.04, 0, 0.06, 0, 'b', [0, 0, -0.25]), C(0.025, 0.22, 0.12, 0.13, 0, 'e', COUCHE_X, 8), B(0.04, 0.03, 0.04, 0.02, 0.13, 0, 'e'), C(0.02, 0.06, 0.12, 0.03, 0.06, '*', null, 6)] },
  { id: 'sifflet', nom: 'Sifflet d\'officier', rarete: 'peuCommun', effet: 'Un de nos régiments ébranlés se rallie sur-le-champ.',
    modele: [C(0.015, 0.08, 0, 0.015, 0, 'e', COUCHE_X, 8), C(0.022, 0.03, -0.035, 0.022, 0, 'e', COUCHE_Z, 8), B(0.005, 0.005, 0.12, 0.03, 0.015, -0.04, 'h', [0, 0.4, 0])] },

  // ── Rares : ce qu'on voit peu en première ligne ──
  { id: 'chauchat', nom: 'Fusil-mitrailleur Chauchat', rarete: 'rare', effet: 'Un tireur du régiment a le feu d\'une demi-mitrailleuse.',
    modele: [B(0.8, 0.06, 0.05, 0, 0.12, 0, 'b'), C(0.02, 0.35, 0.55, 0.13, 0, 'e', COUCHE_X, 6), B(0.2, 0.08, 0.04, -0.45, 0.09, 0, 'g', [0, 0, -0.15]), C(0.09, 0.025, 0.08, 0.05, 0, 'e', COUCHE_Z, 10), B(0.01, 0.12, 0.01, 0.5, 0.05, 0.03, 'e', [0, 0, 0.3]), B(0.01, 0.12, 0.01, 0.5, 0.05, -0.03, 'e', [0, 0, 0.3])] },
  { id: 'vb', nom: 'Tromblon Viven-Bessières', rarete: 'rare', effet: 'Une minute de grenades sur leur tranchée à 150 m (comme une salve de 75).',
    modele: [C(0.035, 0.18, 0, 0.09, 0, 'e', null, 8), C(0.04, 0.02, 0, 0.18, 0, 's', null, 8), C(0.018, 0.4, 0, -0.1, 0, 'b', null, 6), C(0.025, 0.06, 0, 0.21, 0, 'v', null, 6)] },
  { id: 'jumelles', nom: 'Jumelles de campagne', rarete: 'rare', effet: 'Nos barrages tombent 30 % plus près de leur but jusqu\'au soir.',
    modele: [C(0.03, 0.15, -0.04, 0.03, 0, 'b', COUCHE_Z, 8), C(0.03, 0.15, 0.04, 0.03, 0, 'b', COUCHE_Z, 8), C(0.034, 0.02, -0.04, 0.03, 0.08, 'e', COUCHE_Z, 8), C(0.034, 0.02, 0.04, 0.03, 0.08, 'e', COUCHE_Z, 8), B(0.05, 0.02, 0.04, 0, 0.05, -0.02, 'e')] },
  { id: 'depeche', nom: 'Fausse dépêche', rarete: 'rare', effet: 'Leur régiment le plus proche reçoit l\'ordre de reculer : il quitte sa tranchée pendant une heure.',
    modele: [B(0.3, 0.006, 0.21, 0, 0.003, 0, 'o'), B(0.2, 0.007, 0.004, 0, 0.004, -0.05, 'g'), B(0.22, 0.007, 0.004, 0, 0.004, -0.01, 'g'), B(0.16, 0.007, 0.004, -0.02, 0.004, 0.03, 'g'), B(0.29, 0.006, 0.2, 0.02, 0.009, 0.01, 'r', [0, 0.12, 0]), C(0.035, 0.012, 0.08, 0.016, 0.06, 'x', null, 10)] },
  { id: 'pigeons', nom: 'Panier de pigeons voyageurs', rarete: 'rare', effet: 'Nos barrages arrivent deux fois plus vite jusqu\'au soir.',
    modele: [B(0.3, 0.22, 0.22, 0, 0.11, 0, 'g'), B(0.26, 0.17, 0.005, 0, 0.12, 0.111, 's'), B(0.08, 0.07, 0.11, -0.05, 0.08, 0.06, 'r'), B(0.03, 0.04, 0.04, -0.01, 0.13, 0.1, 'r'), B(0.32, 0.03, 0.24, 0, 0.235, 0, 'b')] },
  { id: 'telephone', nom: 'Téléphone de campagne', rarete: 'rare', effet: 'Nos batteries se rechargent deux fois plus vite pendant une heure.',
    modele: [B(0.24, 0.15, 0.18, 0, 0.075, 0, 'b'), B(0.18, 0.03, 0.04, 0, 0.17, 0, 'e'), C(0.02, 0.03, -0.09, 0.17, 0, 'e', COUCHE_Z, 6), C(0.02, 0.03, 0.09, 0.17, 0, 'e', COUCHE_Z, 6), C(0.03, 0.01, 0.13, 0.08, 0, 'e', COUCHE_X, 6)] },
  { id: 'trousse', nom: 'Trousse de chirurgien', rarete: 'rare', effet: 'La moitié des blessés du régiment reviennent au rang ce soir.',
    modele: [B(0.36, 0.16, 0.14, 0, 0.08, 0, 's'), B(0.12, 0.04, 0.02, 0, 0.18, 0, 'b'), B(0.06, 0.012, 0.012, 0, 0.1, 0.072, 'o'), B(0.016, 0.06, 0.012, 0, 0.1, 0.072, 'o'), B(0.37, 0.02, 0.15, 0, 0.12, 0, 'g')] },
  { id: 'crapouillot', nom: 'Crapouillot de 58', rarete: 'rare', effet: 'Trois torpilles de 58 sur une tranchée d\'en face (comme trois 155), et leur fil de fer coupé.',
    modele: [B(0.5, 0.08, 0.35, 0, 0.04, 0, 'g'), C(0.06, 0.6, 0.02, 0.33, 0, 'e', [0, 0, -0.55], 8), C(0.07, 0.04, 0.17, 0.56, 0, 's', [0, 0, -0.55], 8), B(0.04, 0.2, 0.04, -0.1, 0.16, 0, 'e', [0, 0, 0.3])] },

  // ── Épiques : un tournant pour un régiment ──
  { id: 'hotchkiss', nom: 'Mitrailleuse Hotchkiss', rarete: 'epique', effet: 'Le régiment pose un nid de mitrailleuse où il se tient.',
    modele: [B(0.7, 0.1, 0.09, 0, 0.42, 0, 'b'), C(0.03, 0.45, 0.55, 0.43, 0, 'e', COUCHE_X, 8),
      ...[0.4, 0.46, 0.52, 0.58, 0.64].map(x => C(0.045, 0.025, x, 0.43, 0, 'h', COUCHE_X, 8)),
      B(0.03, 0.42, 0.03, 0.1, 0.18, 0.12, 'e', [0.4, 0, 0]), B(0.03, 0.42, 0.03, 0.1, 0.18, -0.12, 'e', [-0.4, 0, 0]), B(0.03, 0.45, 0.03, -0.2, 0.2, 0, 'e', [0, 0, 0.5]), B(0.2, 0.03, 0.1, -0.3, 0.48, 0, 'h')] },
  { id: 'lanceflammes', nom: 'Lance-flammes Schilt', rarete: 'epique', effet: 'Au contact, leurs hommes à 20 m paniquent (leur régiment part en déroute) et un tiers brûlent.',
    modele: [C(0.1, 0.55, -0.11, 0.3, 0, 'e', null, 8), C(0.1, 0.55, 0.11, 0.3, 0, 'e', null, 8), K(0.1, 0.05, -0.11, 0.6, 0, 'e'), K(0.1, 0.05, 0.11, 0.6, 0, 'e'), B(0.3, 0.04, 0.04, 0, 0.45, 0.1, 'b'),
      C(0.02, 0.6, 0.3, 0.2, 0.12, 's', [0, 0, -1.1], 6), K(0.03, 0.05, 0.55, 0.32, 0.12, '*', [0, 0, -1.1], 6)] },
  { id: 'casque', nom: 'Casque Adrian cabossé', rarete: 'epique', effet: 'Le régiment perd deux fois moins d\'hommes sous les obus aujourd\'hui.',
    modele: [C(0.15, 0.02, 0, 0.01, 0, 'n', null, 12), C(0.12, 0.1, 0, 0.07, 0, 'n', null, 12), K(0.12, 0.07, 0, 0.155, 0, 'n', null, 12), B(0.02, 0.04, 0.24, 0, 0.19, 0, 'n'), B(0.04, 0.03, 0.005, 0.05, 0.08, 0.12, '*'), B(0.05, 0.02, 0.06, -0.08, 0.12, 0.06, 's', [0, 0.4, 0.3])] },
  { id: 'drapeau', nom: 'Drapeau du régiment', rarete: 'epique', effet: 'Le régiment ne recule ni ne part en déroute de la journée.',
    modele: [C(0.015, 1.4, 0, 0.7, 0, 'g', null, 6), K(0.03, 0.08, 0, 1.44, 0, '*', null, 6), B(0.5, 0.35, 0.01, 0.26, 1.18, 0, 'n'), B(0.17, 0.35, 0.011, 0.43, 1.18, 0, 'o'), B(0.5, 0.04, 0.012, 0.26, 1.0, 0, '*')] },
  { id: 'plan', nom: 'Plan des lignes d\'en face', rarete: 'epique', effet: 'Leurs trois nids de mitrailleuse ou chars les plus proches reçoivent chacun un 155.',
    modele: [C(0.05, 0.5, 0, 0.05, 0, 'o', COUCHE_X, 8), C(0.051, 0.03, -0.1, 0.05, 0, 'x', COUCHE_X, 8), C(0.051, 0.03, 0.1, 0.05, 0, 'x', COUCHE_X, 8), C(0.035, 0.02, 0.15, 0.05, 0.05, '*', COUCHE_Z, 8)] },
  { id: 'obus220', nom: 'Caisse d\'obus de 220', rarete: 'epique', effet: 'Un barrage de 220 (6 obus), à commander quand on veut.',
    modele: [B(0.7, 0.18, 0.5, 0, 0.09, 0, 'g'), ...[-0.13, 0.13].map(x => C(0.11, 0.6, x, 0.29, -0.04, 'e', COUCHE_Z, 10)), ...[-0.13, 0.13].map(x => K(0.11, 0.2, x, 0.29, 0.36, 'h', [Q, 0, 0], 10)), ...[-0.13, 0.13].map(x => C(0.113, 0.04, x, 0.29, 0.12, '*', COUCHE_Z, 10))] },

  // ── Légendaires : ce qu'on raconte après ──
  { id: 'croix', nom: 'Croix de guerre', rarete: 'legendaire', effet: 'Tout le régiment passe un chevron d\'expérience.',
    modele: [B(0.04, 0.06, 0.005, 0, 0.17, 0, 'v'), ...[0.01, -0.01].map(x => B(0.006, 0.06, 0.006, x, 0.17, 0.001, 'w')), B(0.025, 0.11, 0.008, 0, 0.08, 0, '*'), B(0.11, 0.025, 0.008, 0, 0.08, 0, '*'), C(0.014, 0.012, 0, 0.08, 0.002, 'h', COUCHE_Z, 10), ...[[0, 0.135], [0, 0.025], [0.055, 0.08], [-0.055, 0.08]].map(([x, y]) => B(0.03, 0.012, 0.01, x, y, 0, '*', [0, 0, x ? Q : 0]))] },
  { id: 'fanion', nom: 'Fanion du général', rarete: 'legendaire', effet: 'Tous nos régiments en vue gagnent +15 de moral.',
    modele: [C(0.012, 1.1, 0, 0.55, 0, 's', null, 6), B(0.4, 0.26, 0.01, 0.21, 0.95, 0, '*'), B(0.4, 0.06, 0.011, 0.21, 0.95, 0, 'o'), K(0.04, 0.09, 0, 1.15, 0, 'h', null, 4), C(0.03, 0.03, 0, 0.015, 0, 'e')] },
  { id: 'tirLourd', nom: 'Ordre de tir lourd', rarete: 'legendaire', effet: 'Le bombardement léger : deux barrages de 220 ensemble (12 obus) où l\'on clique.',
    modele: [...[-0.13, 0.13].flatMap(x => [C(0.11, 0.6, x, 0.32, 0, 'e', null, 10), K(0.11, 0.22, x, 0.73, 0, 'h', null, 10), C(0.113, 0.05, x, 0.12, 0, '*', null, 10), C(0.113, 0.03, x, 0.5, 0, '*', null, 10), C(0.1, 0.02, x, 0.01, 0, 's', null, 10)]), B(0.3, 0.004, 0.2, 0, 0.004, 0.2, 'o', [0, 0.2, 0]), B(0.08, 0.005, 0.03, 0.03, 0.007, 0.22, '*', [0, 0.2, 0])] },
  { id: 'clairon', nom: 'Clairon de la relève', rarete: 'legendaire', effet: 'Toutes nos déroutes du secteur se rallient d\'un coup.',
    modele: [C(0.012, 0.35, 0, 0.05, 0, 'h', COUCHE_X, 6), K(0.07, 0.14, 0.24, 0.05, 0, 'h', [0, 0, -Q], 10), C(0.012, 0.25, -0.02, 0.09, 0, 'h', COUCHE_X, 6), C(0.04, 0.02, 0.1, 0.07, 0, 'h', COUCHE_X, 6), B(0.012, 0.012, 0.05, -0.18, 0.06, 0, '*'), B(0.2, 0.08, 0.008, 0.05, 0.0, 0.01, '*', [0, 0, 0.1])] },

  // ── Mythiques (des reliques) : une seule par bataille, au mieux ; elles brillent ──
  { id: 'vierge', nom: 'La Vierge penchée d\'Albert', rarete: 'relique', effet: 'Tant qu\'on la tient, notre secteur ne peut pas tomber.',
    modele: [B(0.3, 0.12, 0.3, 0, 0.06, 0, 'r'), C(0.03, 0.9, 0.12, 0.5, 0, 'e', [0, 0, -0.5], 6), K(0.12, 0.5, 0.3, 0.75, 0, '*', [0, 0, -1.2], 8), C(0.05, 0.08, 0.53, 0.83, 0, '*', [0, 0, -1.2], 8), C(0.06, 0.05, 0.35, 0.95, 0, 'h', [0, 0, -1.2], 8), B(0.12, 0.03, 0.03, 0.38, 0.72, 0.06, '*', [0, 0, -1.2])] },
  { id: 'taxi', nom: 'Un taxi de la Marne', rarete: 'relique', effet: 'Un régiment frais arrive à l\'instant, sans attendre la nuit.',
    modele: [B(1.6, 0.35, 0.7, 0, 0.45, 0, 'w'), B(0.7, 0.45, 0.68, -0.25, 0.85, 0, 's'), B(0.66, 0.3, 0.7, -0.25, 0.9, 0, 'e'), B(0.5, 0.25, 0.6, 0.55, 0.7, 0, 'w'),
      ...[[-0.5, 0.36], [-0.5, -0.36], [0.55, 0.36], [0.55, -0.36]].map(([x, z]) => C(0.22, 0.1, x, 0.22, z, 't', COUCHE_Z, 10)), C(0.06, 0.02, 0.81, 0.65, 0.2, '*', COUCHE_X, 8), C(0.06, 0.02, 0.81, 0.65, -0.2, '*', COUCHE_X, 8), B(0.12, 0.08, 0.06, -0.2, 1.11, 0, '*')] },
  { id: 'obus400', nom: 'L\'obus de 400 de Douaumont', rarete: 'relique', effet: 'Le bombardement mythique : quatre barrages de 220 en une fois, 24 obus en 10 s sur 40 m, et un cratère géant au centre.',
    modele: [C(0.2, 1.1, 0, 0.6, 0, 'e', null, 12), K(0.2, 0.45, 0, 1.375, 0, 'h', null, 12), C(0.205, 0.08, 0, 0.18, 0, '*', null, 12), C(0.205, 0.05, 0, 0.95, 0, '*', null, 12), C(0.19, 0.05, 0, 0.025, 0, 's', null, 12), K(0.03, 0.06, 0, 1.62, 0, 's', null, 6), B(0.42, 0.02, 0.42, 0, 0.01, 0, 'g', [0, 0.4, 0])] },
];

// Tirer un objet d'une caisse : la rareté selon `poids`, puis un objet de cette rareté ; `u` et `v` dans [0, 1) (le hasard de l'appelant)
export function tirerObjet(u, v) {
  const total = ORDRE_RARETES.reduce((s, k) => s + RARETES[k].poids, 0);
  let x = u * total, rarete = ORDRE_RARETES[0];
  for (const k of ORDRE_RARETES) { if (x < RARETES[k].poids) { rarete = k; break; } x -= RARETES[k].poids; }
  const choix = OBJETS.filter(o => o.rarete === rarete);
  return choix[Math.min(choix.length - 1, Math.floor(v * choix.length))];
}
