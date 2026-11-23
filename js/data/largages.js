// Les largages : des caisses en parachute lâchées par un avion au-dessus du no man's land, et les objets qui en sortent (Jérôme, 23 nov., v0.161.0 au labo ;
// v0.162.0 en jeu : la règle est dans js/largages.js, le dessin dans js/rendu/largages.js). Le loot n'est plus refusé (DESIGN.md).
// Six raretés, sept catégories (Jérôme, 23 nov. : « on oublie tous les objets qui ne sont pas un boost d'un soldat, du régiment entier, des renforts, des
// bombardements, un boost d'avion, de char, ou des armes spéciales ; pas de moral, trop peu lisible »), trente-cinq objets. L'objet sorti de la caisse tourne sous
// une flèche de la couleur de sa rareté ; le premier homme qui l'atteint le prend. Il joue pour le camp qui l'a pris, et lui seul. `e` : ses paramètres (lus par
// la règle), `effet` : la phrase de la fiche, `court` : les mots du bandeau. Un objet de bombardement (`tirs`) va dans la musette : à deux, il ne compte qu'une
// fois ramené dans une tranchée de son camp (le butin : tué en route, son porteur le laisse tomber là, une nouvelle course s'ouvre).
//
// Le modèle de chaque objet est de la donnée : des boîtes, des cylindres et des cônes en mètres (la taille vraie), le dessous de l'objet à y = 0, y vers le
// haut, x vers la droite, z vers nous. Une couleur est une lettre de la palette (palette.js) ; `*` prend la couleur de la rareté (le liseré de l'objet).
//   B(largeur, hauteur, profondeur, x, y, z, couleur, rotation)   une boîte centrée en (x, y, z)
//   C(rayon, hauteur, x, y, z, couleur, rotation, pans)           un cylindre (debout ; la rotation le couche), 8 pans par défaut
//   K(rayon, hauteur, x, y, z, couleur, rotation, pans)           un cône, la pointe en haut
// `rotation` : [rx, ry, rz] en radians (ou rien).
import { RARETES_COULEURS, RARETES_BRILLANCE } from '../palette.js?v=0.163.0';

const B = (w, h, d, x, y, z, c, r) => ({ f: 'b', t: [w, h, d], p: [x, y, z], c, r });
const C = (rayon, h, x, y, z, c, r, n = 8) => ({ f: 'c', t: [rayon, h], p: [x, y, z], c, r, n });
const K = (rayon, h, x, y, z, c, r, n = 8) => ({ f: 'k', t: [rayon, h], p: [x, y, z], c, r, n });
const Q = Math.PI / 2;
const COUCHE_X = [0, 0, Q], COUCHE_Z = [Q, 0, 0];   // un cylindre couché le long de x, le long de z

// Les raretés, de la plus courante à la plus rare. `poids` : la chance qu'une caisse en sorte un (sur 100). 
export const RARETES = {
  commun:     { nom: 'Commun',     couleur: RARETES_COULEURS.commun,     poids: 50 },
  peuCommun:  { nom: 'Peu commun', couleur: RARETES_COULEURS.peuCommun,  poids: 25 },
  rare:       { nom: 'Rare',       couleur: RARETES_COULEURS.rare,       poids: 13 },
  epique:     { nom: 'Épique',     couleur: RARETES_COULEURS.epique,     poids: 7 },
  legendaire: { nom: 'Légendaire', couleur: RARETES_COULEURS.legendaire, poids: 4 },
  relique:    { nom: 'Mythique',   couleur: RARETES_COULEURS.relique,    poids: 1,  brillance: RARETES_BRILLANCE.relique },   // (l'id reste `relique` : des reliques de 14-18)
};
export const ORDRE_RARETES = Object.keys(RARETES);

// Le largage lui-même (les nombres d'une proposition, à mesurer)
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
  rayonCourse: 160,    // m : seuls courent ceux qui sont à moins de cette distance
  premier: [80, 140],  // s de jeu : le premier avion passe entre ces deux temps du jour (6 min de jeu font une journée)
  intervalle: [90, 150],   // s de jeu entre deux avions
  fin: 330,            // s : plus d'avion après ce temps du jour (la caisse doit toucher avant la nuit)
  musette: 3,          // objets à viser gardés par camp, au plus
  ia: [20, 45],        // s : l'IA d'en face vide sa musette à ce rythme
  carre: 8,            // m : un objet tombé hors du secteur est ramené dedans à cette marge
};

// Les catégories : ce que l'objet booste (l'icône de la fiche, du bandeau et de la vitrine dit la catégorie)
export const CATEGORIES = {
  soldat:       { nom: 'Le soldat', icone: 'S', dit: 'celui qui le prend' },
  regiment:     { nom: 'Le régiment', icone: 'R', dit: 'tout son régiment' },
  renfort:      { nom: 'Les renforts', icone: '+', dit: 'des hommes en plus' },
  bombardement: { nom: 'Les bombardements', icone: '✹', dit: 'dans la musette, à viser' },
  avion:        { nom: 'Les avions', icone: 'A', dit: 'nos avions' },
  char:         { nom: 'Les chars', icone: 'C', dit: 'nos chars' },
  arme:         { nom: 'Les armes spéciales', icone: '†', dit: 'une arme de plus' },
};
export const ORDRE_CATEGORIES = Object.keys(CATEGORIES);

// Le contenu : sept catégories, une rareté chacun. Les modèles sont en mètres (la taille vraie).
export const OBJETS = [
  // ── soldat ──
  { id: 'cartouches', nom: "Musette de cartouches", rarete: 'commun', cat: 'soldat', e: { duree: 60, tir: 3, infini: true },
    effet: "Celui qui la prend tire trois fois plus vite pendant une minute.", court: "Tir ×3 · 60 s",
    modele: [B(0.3, 0.2, 0.12, 0, 0.1, 0, 'h'), B(0.31, 0.09, 0.13, 0, 0.17, 0.004, 'g'), B(0.04, 0.03, 0.01, 0, 0.13, 0.07, 'e'), B(0.03, 0.3, 0.02, 0.13, 0.25, 0, 'b', [0, 0, 0.5])] },
  { id: 'brodequins', nom: "Brodequins de chasseur", rarete: 'peuCommun', cat: 'soldat', e: { duree: 90, vit: 2, frais: true },
    effet: "Il court deux fois plus vite pendant une minute et demie, sans se fatiguer.", court: "Vitesse ×2 · 90 s",
    modele: [B(0.12, 0.08, 0.3, -0.08, 0.04, 0, 'b'), B(0.11, 0.16, 0.12, -0.08, 0.13, -0.08, 'b'), B(0.12, 0.08, 0.3, 0.08, 0.04, 0.03, 'b'), B(0.11, 0.16, 0.12, 0.08, 0.13, -0.05, 'b'), B(0.13, 0.015, 0.31, -0.08, 0.005, 0, 's'), B(0.13, 0.015, 0.31, 0.08, 0.005, 0.03, 's'), B(0.112, 0.02, 0.122, -0.08, 0.2, -0.08, '*'), B(0.112, 0.02, 0.122, 0.08, 0.2, -0.05, '*')] },
  { id: 'lunette', nom: "Lebel à lunette", rarete: 'rare', cat: 'soldat', e: { duree: 240, coups: 20, sur: true, portee: 400 / 60 },
    effet: "Vingt balles qui tuent à coup sûr, jusqu'à 400 m.", court: "20 balles mortelles · 400 m",
    modele: [B(1.1, 0.05, 0.04, 0, 0.1, 0, 'g'), C(0.012, 0.5, 0.7, 0.12, 0, 'e', COUCHE_X, 6), B(0.25, 0.09, 0.04, -0.5, 0.07, 0, 'g', [0, 0, -0.1]), C(0.022, 0.3, 0.05, 0.18, 0, 's', COUCHE_X, 8), C(0.03, 0.04, 0.2, 0.18, 0, '*', COUCHE_X, 8), B(0.02, 0.05, 0.02, 0.05, 0.14, 0, 's')] },
  { id: 'chauchat', nom: "Chauchat sans enrayage", rarete: 'epique', cat: 'soldat', e: { duree: 60, tir: 8, infini: true, portee: 1.3 },
    effet: "Une mitrailleuse portative : il tire en rafales, même en marchant, pendant une minute.", court: "Rafales ×8 · 60 s",
    modele: [B(0.8, 0.06, 0.05, 0, 0.12, 0, 'b'), C(0.02, 0.35, 0.55, 0.13, 0, 'e', COUCHE_X, 6), B(0.2, 0.08, 0.04, -0.45, 0.09, 0, 'g', [0, 0, -0.15]), C(0.09, 0.025, 0.08, 0.05, 0, 'e', COUCHE_Z, 10), B(0.01, 0.12, 0.01, 0.5, 0.05, 0.03, 'e', [0, 0, 0.3]), B(0.01, 0.12, 0.01, 0.5, 0.05, -0.03, 'e', [0, 0, 0.3])] },
  { id: 'canonnier', nom: "Fusil du canonnier", rarete: 'legendaire', cat: 'soldat', e: { duree: 180, coups: 12, obus: '75', tir: 1.5, infini: true },
    effet: "Douze coups : chacun est un obus de 75 qui tombe là où va la balle.", court: "12 obus de 75",
    modele: [B(1.0, 0.06, 0.05, 0, 0.1, 0, 'g'), C(0.035, 0.45, 0.7, 0.12, 0, 'e', COUCHE_X, 8), K(0.035, 0.1, 0.98, 0.12, 0, 'h', [0, 0, -Q], 8), C(0.04, 0.05, 0.5, 0.12, 0, '*', COUCHE_X, 8), B(0.25, 0.09, 0.05, -0.45, 0.07, 0, 'g', [0, 0, -0.1])] },
  { id: 'revenant', nom: "Le Revenant", rarete: 'relique', cat: 'soldat', e: { duree: 60, invincible: true, tir: 8, vit: 2, sur: true, infini: true, frais: true, portee: 1.5 },
    effet: "Une minute d'invincibilité : il tire en rafales, court comme le vent, et ses balles tuent à coup sûr.", court: "Invincible · rafales · vitesse · 60 s",
    modele: [B(0.36, 0.42, 0.18, 0, 0.21, 0, 'e'), B(0.12, 0.32, 0.17, -0.22, 0.24, 0, 'e', [0, 0, 0.12]), B(0.12, 0.32, 0.17, 0.22, 0.24, 0, 'e', [0, 0, -0.12]), B(0.37, 0.04, 0.19, 0, 0.3, 0, '*'), B(0.04, 0.3, 0.19, 0, 0.21, 0.002, '*'), C(0.15, 0.02, 0, 0.44, 0, 's', null, 12), C(0.12, 0.1, 0, 0.5, 0, 's', null, 12), K(0.12, 0.07, 0, 0.585, 0, 's', null, 12), B(0.1, 0.03, 0.005, 0, 0.5, 0.122, '*')] },
  // ── regiment ──
  { id: 'caisseCartouches', nom: "Caisse de cartouches", rarete: 'peuCommun', cat: 'regiment', e: { duree: 120, tir: 1.5 },
    effet: "Tout le régiment tire une fois et demie plus vite pendant deux minutes.", court: "Régiment : tir ×1,5 · 2 min",
    modele: [B(0.5, 0.25, 0.32, 0, 0.125, 0, 'g'), B(0.52, 0.04, 0.34, 0, 0.27, 0, 'b'), ...[-0.15, -0.05, 0.05, 0.15].map(x => B(0.06, 0.1, 0.2, x, 0.33, 0, 'h')), B(0.12, 0.04, 0.005, 0, 0.14, 0.162, '*')] },
  { id: 'clairon', nom: "Clairon de la charge", rarete: 'rare', cat: 'regiment', e: { duree: 120, vit: 1.5, intrepide: true },
    effet: "Le régiment court une fois et demie plus vite et n'a plus peur pendant deux minutes.", court: "Régiment : vitesse ×1,5, sans peur · 2 min",
    modele: [C(0.012, 0.35, 0, 0.05, 0, 'h', COUCHE_X, 6), K(0.07, 0.14, 0.24, 0.05, 0, 'h', [0, 0, -Q], 10), C(0.012, 0.25, -0.02, 0.09, 0, 'h', COUCHE_X, 6), C(0.04, 0.02, 0.1, 0.07, 0, 'h', COUCHE_X, 6), B(0.012, 0.012, 0.05, -0.18, 0.06, 0, '*'), B(0.2, 0.08, 0.008, 0.05, 0.0, 0.01, '*', [0, 0, 0.1])] },
  { id: 'citrons', nom: "Caisse de grenades", rarete: 'epique', cat: 'regiment', e: { grenades: 3, portee: 30 },
    effet: "Chaque homme du régiment lance trois grenades sur l'ennemi à moins de 30 m.", court: "Régiment : 3 grenades par homme",
    modele: [B(0.3, 0.12, 0.2, 0, 0.06, 0, 'g'), B(0.3, 0.02, 0.2, 0, 0.13, -0.12, 'g', [-0.9, 0, 0]),
      ...[-0.09, 0, 0.09].map(x => C(0.035, 0.07, x, 0.15, 0.02, 'v', null, 6)), B(0.02, 0.04, 0.02, 0.09, 0.2, 0.02, 'e')] },
  { id: 'drapeau', nom: "Drapeau du régiment", rarete: 'legendaire', cat: 'regiment', e: { duree: 180, pertes: 0.25, tenace: true, tir: 1.5, aura: 50, gueris: true, drapeau: true },
    effet: "Planté où il est pris : pendant trois minutes, le régiment perd quatre fois moins d'hommes, ne déroute plus et tire une fois et demie plus vite ; nos régiments à 50 m aussi. À la fin, ses blessés se relèvent. Un homme d'en face qui l'atteint l'arrache.", court: "Drapeau planté · pertes ÷4, tir ×1,5, aura 50 m · 3 min",
    modele: [C(0.015, 1.4, 0, 0.7, 0, 'g', null, 6), K(0.03, 0.08, 0, 1.44, 0, '*', null, 6), B(0.5, 0.35, 0.01, 0.26, 1.18, 0, 'n'), B(0.17, 0.35, 0.011, 0.43, 1.18, 0, 'o'), B(0.5, 0.04, 0.012, 0.26, 1.0, 0, '*')] },
  // ── renfort ──
  { id: 'escouade', nom: "Escouade", rarete: 'commun', cat: 'renfort', e: { hommes: 5 },
    effet: "Cinq hommes rejoignent le régiment de celui qui l'a prise.", court: "+5 hommes",
    modele: [C(0.15, 0.02, 0, 0.01, 0, 'r', null, 12), C(0.12, 0.1, 0, 0.07, 0, 'r', null, 12), K(0.12, 0.07, 0, 0.155, 0, 'r', null, 12), B(0.02, 0.04, 0.24, 0, 0.19, 0, 'r'), B(0.04, 0.03, 0.005, 0.05, 0.08, 0.12, '*')] },
  { id: 'demiSection', nom: "Demi-section", rarete: 'peuCommun', cat: 'renfort', e: { hommes: 10 },
    effet: "Dix hommes rejoignent le régiment.", court: "+10 hommes",
    modele: [C(0.15, 0.02, 0, 0.01, 0, 'r', null, 12), C(0.12, 0.1, 0, 0.07, 0, 'r', null, 12), K(0.12, 0.07, 0, 0.155, 0, 'r', null, 12), B(0.02, 0.04, 0.24, 0, 0.19, 0, 'r'), B(0.04, 0.03, 0.005, 0.05, 0.08, 0.12, '*'), C(0.15, 0.02, 0.3, 0.01, 0.05, 'r', null, 12), C(0.12, 0.1, 0.3, 0.07, 0.05, 'r', null, 12), K(0.12, 0.07, 0.3, 0.155, 0.05, 'r', null, 12), B(0.02, 0.04, 0.24, 0.3, 0.19, 0.05, 'r'), B(0.04, 0.03, 0.005, 0.35, 0.08, 0.16999999999999998, '*')] },
  { id: 'section', nom: "Section", rarete: 'rare', cat: 'renfort', e: { hommes: 20 },
    effet: "Vingt hommes rejoignent le régiment.", court: "+20 hommes",
    modele: [C(0.15, 0.02, 0, 0.01, 0, 'r', null, 12), C(0.12, 0.1, 0, 0.07, 0, 'r', null, 12), K(0.12, 0.07, 0, 0.155, 0, 'r', null, 12), B(0.02, 0.04, 0.24, 0, 0.19, 0, 'r'), B(0.04, 0.03, 0.005, 0.05, 0.08, 0.12, '*'), C(0.15, 0.02, 0.3, 0.01, 0.05, 'r', null, 12), C(0.12, 0.1, 0.3, 0.07, 0.05, 'r', null, 12), K(0.12, 0.07, 0.3, 0.155, 0.05, 'r', null, 12), B(0.02, 0.04, 0.24, 0.3, 0.19, 0.05, 'r'), B(0.04, 0.03, 0.005, 0.35, 0.08, 0.16999999999999998, '*'), C(0.15, 0.02, 0.15, 0.21000000000000002, 0.02, 'r', null, 12), C(0.12, 0.1, 0.15, 0.27, 0.02, 'r', null, 12), K(0.12, 0.07, 0.15, 0.355, 0.02, 'r', null, 12), B(0.02, 0.04, 0.24, 0.15, 0.39, 0.02, 'r'), B(0.04, 0.03, 0.005, 0.2, 0.28, 0.13999999999999999, '*')] },
  { id: 'compagnie', nom: "Compagnie", rarete: 'epique', cat: 'renfort', e: { hommes: 40 },
    effet: "Quarante hommes rejoignent le régiment.", court: "+40 hommes",
    modele: [C(0.012, 0.9, -0.3, 0.45, 0, 'g', null, 6), B(0.3, 0.2, 0.01, -0.14, 0.78, 0, '*'), C(0.15, 0.02, 0, 0.01, 0, 'r', null, 12), C(0.12, 0.1, 0, 0.07, 0, 'r', null, 12), K(0.12, 0.07, 0, 0.155, 0, 'r', null, 12), B(0.02, 0.04, 0.24, 0, 0.19, 0, 'r'), B(0.04, 0.03, 0.005, 0.05, 0.08, 0.12, '*'), C(0.15, 0.02, 0.3, 0.01, 0.05, 'r', null, 12), C(0.12, 0.1, 0.3, 0.07, 0.05, 'r', null, 12), K(0.12, 0.07, 0.3, 0.155, 0.05, 'r', null, 12), B(0.02, 0.04, 0.24, 0.3, 0.19, 0.05, 'r'), B(0.04, 0.03, 0.005, 0.35, 0.08, 0.16999999999999998, '*'), C(0.15, 0.02, 0.15, 0.21000000000000002, 0.02, 'r', null, 12), C(0.12, 0.1, 0.15, 0.27, 0.02, 'r', null, 12), K(0.12, 0.07, 0.15, 0.355, 0.02, 'r', null, 12), B(0.02, 0.04, 0.24, 0.15, 0.39, 0.02, 'r'), B(0.04, 0.03, 0.005, 0.2, 0.28, 0.13999999999999999, '*')] },
  { id: 'releve', nom: "Ordre de relève", rarete: 'legendaire', cat: 'renfort', e: { regiments: 1 },
    effet: "Un régiment frais se déploie tout de suite, sans toucher à la réserve.", court: "Un régiment frais, tout de suite",
    modele: [B(0.32, 0.012, 0.22, 0, 0.006, 0, 'o'), B(0.32, 0.012, 0.22, 0.01, 0.016, 0.01, 'h', [0, 0.06, 0]), K(0.16, 0.06, 0.01, 0.025, -0.05, 'h', [Q, 0, 0], 4), C(0.04, 0.015, 0.01, 0.03, 0.03, '*', null, 10), B(0.2, 0.004, 0.004, -0.02, 0.024, 0.08, 'g')] },
  { id: 'taxi', nom: "Les taxis de la Marne", rarete: 'relique', cat: 'renfort', e: { regiments: 2 },
    effet: "Deux régiments frais se déploient tout de suite, sans toucher à la réserve.", court: "Deux régiments frais, tout de suite",
    modele: [B(1.6, 0.35, 0.7, 0, 0.45, 0, 'w'), B(0.7, 0.45, 0.68, -0.25, 0.85, 0, 's'), B(0.66, 0.3, 0.7, -0.25, 0.9, 0, 'e'), B(0.5, 0.25, 0.6, 0.55, 0.7, 0, 'w'),
      ...[[-0.5, 0.36], [-0.5, -0.36], [0.55, 0.36], [0.55, -0.36]].map(([x, z]) => C(0.22, 0.1, x, 0.22, z, 't', COUCHE_Z, 10)), C(0.06, 0.02, 0.81, 0.65, 0.2, '*', COUCHE_X, 8), C(0.06, 0.02, 0.81, 0.65, -0.2, '*', COUCHE_X, 8), B(0.12, 0.08, 0.06, -0.2, 1.11, 0, '*')] },
  // ── bombardement ──
  { id: 'fuseeRouge', nom: "Fusée rouge", rarete: 'commun', cat: 'bombardement', e: { tirs: [['75', 0, 0]] },
    effet: "Dans la musette : une salve de 75 (24 obus) où l'on clique.", court: "Salve de 75 · à viser",
    modele: [C(0.022, 0.16, -0.03, 0.08, 0, 'o', null, 8), C(0.023, 0.03, -0.03, 0.015, 0, 'h', null, 8), C(0.022, 0.16, 0.03, 0.08, 0.02, 'o', null, 8), C(0.023, 0.03, 0.03, 0.015, 0.02, 'h', null, 8), B(0.03, 0.006, 0.03, -0.03, 0.163, 0, 's'), B(0.03, 0.006, 0.03, 0.03, 0.163, 0.02, 's')] },
  { id: 'fuseeVerte', nom: "Fusée verte", rarete: 'peuCommun', cat: 'bombardement', e: { tirs: [['155', 0, 0]] },
    effet: "Dans la musette : un barrage de 155 (12 obus) où l'on clique.", court: "Barrage de 155 · à viser",
    modele: [C(0.03, 0.24, 0, 0.12, 0, 'v', null, 8), C(0.031, 0.04, 0, 0.02, 0, 'h', null, 8), K(0.03, 0.06, 0, 0.27, 0, 'w', null, 8), B(0.008, 0.3, 0.008, 0.05, 0.15, 0, 'g')] },
  { id: 'barrageRoulant', nom: "Barrage roulant", rarete: 'rare', cat: 'bombardement', e: { tirs: [['75', 0, 0], ['75', 30, 8], ['75', 60, 16]] },
    effet: "Dans la musette : trois salves de 75 qui avancent de 30 m en 30 m vers l'ennemi, toutes les 8 s.", court: "3 salves de 75 qui avancent · à viser",
    modele: [B(0.7, 0.05, 0.22, 0, 0.025, 0, 'g'), ...[-0.22, 0, 0.22].flatMap((x, k) => [C(0.05, 0.22, x, 0.16 + k * 0.03, 0, 'e', null, 8), K(0.05, 0.08, x, 0.31 + k * 0.03, 0, 'h', null, 8), C(0.052, 0.025, x, 0.08 + k * 0.03, 0, '*', null, 8)]), ...[0, 1].map(k => B(0.12, 0.012, 0.03, -0.11 + 0.22 * k, 0.06, 0.12, 'o', [0, 0, 0]))] },
  { id: 'obus220', nom: "Caisse d'obus de 220", rarete: 'epique', cat: 'bombardement', e: { tirs: [['220', 0, 0]] },
    effet: "Dans la musette : un barrage de 220 (6 obus) où l'on clique.", court: "Barrage de 220 · à viser",
    modele: [B(0.7, 0.18, 0.5, 0, 0.09, 0, 'g'), ...[-0.13, 0.13].map(x => C(0.11, 0.6, x, 0.29, -0.04, 'e', COUCHE_Z, 10)), ...[-0.13, 0.13].map(x => K(0.11, 0.2, x, 0.29, 0.36, 'h', [Q, 0, 0], 10)), ...[-0.13, 0.13].map(x => C(0.113, 0.04, x, 0.29, 0.12, '*', COUCHE_Z, 10))] },
  { id: 'tirLourd', nom: "Ordre de tir lourd", rarete: 'legendaire', cat: 'bombardement', e: { tirs: [['220', 0, 0], ['220', 0, 0.5]] },
    effet: "Dans la musette : le bombardement léger, deux barrages de 220 ensemble (12 obus).", court: "2 × 220 · à viser",
    modele: [...[-0.13, 0.13].flatMap(x => [C(0.11, 0.6, x, 0.32, 0, 'e', null, 10), K(0.11, 0.22, x, 0.73, 0, 'h', null, 10), C(0.113, 0.05, x, 0.12, 0, '*', null, 10), C(0.113, 0.03, x, 0.5, 0, '*', null, 10), C(0.1, 0.02, x, 0.01, 0, 's', null, 10)]), B(0.3, 0.004, 0.2, 0, 0.004, 0.2, 'o', [0, 0.2, 0]), B(0.08, 0.005, 0.03, 0.03, 0.007, 0.22, '*', [0, 0.2, 0])] },
  { id: 'obus400', nom: "L'obus de 400 de Douaumont", rarete: 'relique', cat: 'bombardement', e: { tirs: [['220', 0, 0], ['220', 0, 0.3], ['220', 0, 0.6], ['220', 0, 0.9]] },
    effet: "Dans la musette : le bombardement mythique, quatre barrages de 220 en une fois (24 obus).", court: "4 × 220 · à viser",
    modele: [C(0.2, 1.1, 0, 0.6, 0, 'e', null, 12), K(0.2, 0.45, 0, 1.375, 0, 'h', null, 12), C(0.205, 0.08, 0, 0.18, 0, '*', null, 12), C(0.205, 0.05, 0, 0.95, 0, '*', null, 12), C(0.19, 0.05, 0, 0.025, 0, 's', null, 12), K(0.03, 0.06, 0, 1.62, 0, 's', null, 6), B(0.42, 0.02, 0.42, 0, 0.01, 0, 'g', [0, 0.4, 0])] },
  // ── avion ──
  { id: 'essence', nom: "Bidon d'essence", rarete: 'commun', cat: 'avion', e: { repare: 1 },
    effet: "Un de nos avions abîmés ou perdus est remis en état.", court: "Un avion remis en état",
    modele: [B(0.32, 0.42, 0.15, 0, 0.21, 0, 'w'), B(0.3, 0.02, 0.152, 0, 0.3, 0, 's'), B(0.1, 0.04, 0.03, -0.06, 0.45, 0, 'w'), C(0.025, 0.05, 0.1, 0.44, 0, 'e', null, 6)] },
  { id: 'incendiaires', nom: "Balles incendiaires", rarete: 'rare', cat: 'avion', e: { letal: 2 },
    effet: "Jusqu'au soir, les mitrailleuses de nos avions tuent deux fois plus.", court: "Avions : mitrailleuses ×2 · jusqu'au soir",
    modele: [...Array.from({ length: 9 }, (_, k) => C(0.012, 0.09, -0.2 + k * 0.05, 0.05, 0, k % 3 === 0 ? '*' : 'h', null, 6)), ...Array.from({ length: 9 }, (_, k) => K(0.012, 0.03, -0.2 + k * 0.05, 0.11, 0, k % 3 === 0 ? '*' : 'e', null, 6)), B(0.46, 0.02, 0.05, 0, 0.02, 0, 'b')] },
  { id: 'aasen', nom: "Bombes Aasen", rarete: 'epique', cat: 'avion', e: { bombes: 4 },
    effet: "Au prochain vol de nos avions, quatre bombes (comme des 155) tombent sur son passage.", court: "Prochain vol : 4 bombes",
    modele: [...[-0.12, 0.12].flatMap(x => [C(0.07, 0.35, x, 0.25, 0, 'e', null, 8), K(0.07, 0.1, x, 0.47, 0, 'e', null, 8), K(0.07, 0.08, x, 0.04, 0, 's', [Math.PI, 0, 0], 8), B(0.16, 0.08, 0.01, x, 0.09, 0, 's'), B(0.01, 0.08, 0.16, x, 0.09, 0, 's'), C(0.072, 0.03, x, 0.38, 0, '*', null, 8)])] },
  { id: 'escadrille', nom: "L'escadrille", rarete: 'legendaire', cat: 'avion', e: { avions: 2, repare: 99 },
    effet: "Deux avions de plus pour la bataille, et toute la flotte remise en état.", court: "+2 avions, flotte réparée",
    modele: [B(0.7, 0.1, 0.1, 0, 0.3, 0, 's'), B(0.18, 0.02, 1.0, 0.1, 0.38, 0, 'r'), B(0.16, 0.02, 0.9, 0.12, 0.24, 0, 'r'), B(0.1, 0.015, 0.3, -0.32, 0.31, 0, 'r'), B(0.08, 0.14, 0.01, -0.32, 0.38, 0, 's'), B(0.02, 0.24, 0.02, 0.37, 0.3, 0, 'e'), B(0.02, 0.14, 0.02, 0.12, 0.31, 0.3, 's'), B(0.02, 0.14, 0.02, 0.12, 0.31, -0.3, 's'), B(0.12, 0.022, 0.12, 0.1, 0.39, 0.38, '*'), B(0.12, 0.022, 0.12, 0.1, 0.39, -0.38, '*'), C(0.1, 0.3, 0, 0.1, 0, 'g', null, 8)] },
  // ── char ──
  { id: 'outils', nom: "Caisse d'outils", rarete: 'commun', cat: 'char', e: { repare: true },
    effet: "Nos chars, sur le champ et au parc, sont réparés.", court: "Chars réparés",
    modele: [B(0.45, 0.18, 0.2, 0, 0.09, 0, 'b'), B(0.46, 0.03, 0.21, 0, 0.19, 0, 's'), B(0.2, 0.03, 0.03, 0, 0.24, 0, 'e'), B(0.03, 0.05, 0.03, -0.09, 0.215, 0, 'e'), B(0.03, 0.05, 0.03, 0.09, 0.215, 0, 'e'), B(0.3, 0.03, 0.04, 0.05, 0.22, 0.08, 'e', [0, 0.4, 0]), B(0.06, 0.05, 0.05, 0.19, 0.22, 0.14, 'e'), B(0.1, 0.03, 0.005, 0, 0.1, 0.101, '*')] },
  { id: 'blindage', nom: "Plaques de blindage", rarete: 'rare', cat: 'char', e: { blindage: 2 },
    effet: "Nos chars, sur le champ et au parc, ont deux fois plus de points de vie jusqu'à la fin de la bataille.", court: "Chars : blindage ×2",
    modele: [...[0, 1, 2].map(k => B(0.5, 0.025, 0.35, 0.02 * k, 0.0125 + k * 0.027, -0.02 * k, k === 2 ? 'e' : 's', [0, 0.08 * k, 0])), ...[[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]].map(([x, z]) => C(0.015, 0.01, x + 0.04, 0.086, z - 0.04, '*', null, 6))] },
  { id: 'moteur', nom: "Moteur gonflé", rarete: 'epique', cat: 'char', e: { duree: 180, vit: 2 },
    effet: "Nos chars sur le champ roulent deux fois plus vite pendant trois minutes.", court: "Chars : vitesse ×2 · 3 min",
    modele: [B(0.5, 0.25, 0.28, 0, 0.18, 0, 's'), ...[-0.18, -0.06, 0.06, 0.18].map(x => B(0.08, 0.12, 0.2, x, 0.36, 0, 'e')), C(0.06, 0.1, 0.3, 0.2, 0, 'e', COUCHE_X, 8), B(0.55, 0.05, 0.3, 0, 0.03, 0, 'b'), C(0.04, 0.3, 0, 0.45, 0.06, '*', COUCHE_X, 6)] },
  { id: 'ft', nom: "Un FT tout neuf", rarete: 'legendaire', cat: 'char', e: { neuf: true },
    effet: "Un char de plus sort tout de suite vers les lignes d'en face.", court: "Un char sort, tout de suite",
    modele: [B(1.4, 0.35, 0.7, 0, 0.45, 0, 'w'), B(1.5, 0.22, 0.2, 0, 0.18, 0.3, 's'), B(1.5, 0.22, 0.2, 0, 0.18, -0.3, 's'), C(0.26, 0.32, 0.05, 0.8, 0, 'w', null, 8), K(0.26, 0.12, 0.05, 1.02, 0, 'w', null, 8), C(0.04, 0.4, 0.3, 0.82, 0, 'e', COUCHE_X, 6), B(0.4, 0.12, 0.4, -0.85, 0.4, 0, 'w', [0, 0, 0.4]), B(0.5, 0.03, 0.71, 0, 0.63, 0, '*')] },
  // ── arme ──
  { id: 'cheddite', nom: "Pétards de cheddite", rarete: 'peuCommun', cat: 'arme', e: { fil: 30 },
    effet: "Le fil de fer d'en face saute sur 30 m de chaque côté de celui qui les prend.", court: "Leur fil saute sur 60 m",
    modele: [...[[-0.03, -0.03], [0.03, -0.03], [-0.03, 0.03], [0.03, 0.03]].map(([x, z]) => B(0.05, 0.28, 0.05, x, 0.14, z, 'g')), B(0.13, 0.03, 0.13, 0, 0.08, 0, 'b'), B(0.13, 0.03, 0.13, 0, 0.2, 0, 'b'), B(0.01, 0.15, 0.01, 0, 0.35, 0, 'o', [0, 0, 0.4])] },
  { id: 'lanceflammes', nom: "Lance-flammes Schilt", rarete: 'rare', cat: 'arme', e: { soldat: { duree: 30, flamme: 15 } },
    effet: "Pendant 30 s, il crache le feu à 15 m : ceux d'en face qui y sont brûlent ou fuient.", court: "Lance-flammes · 15 m · 30 s",
    modele: [C(0.1, 0.55, -0.11, 0.3, 0, 'e', null, 8), C(0.1, 0.55, 0.11, 0.3, 0, 'e', null, 8), K(0.1, 0.05, -0.11, 0.6, 0, 'e'), K(0.1, 0.05, 0.11, 0.6, 0, 'e'), B(0.3, 0.04, 0.04, 0, 0.45, 0.1, 'b'),
      C(0.02, 0.6, 0.3, 0.2, 0.12, 's', [0, 0, -1.1], 6), K(0.03, 0.05, 0.55, 0.32, 0.12, '*', [0, 0, -1.1], 6)] },
  { id: 'crapouillot', nom: "Crapouillot de 58", rarete: 'rare', cat: 'arme', e: { tirs: [['155', 0, 0, 3]], fil: 15 },
    effet: "Dans la musette : trois torpilles où l'on clique, et leur fil de fer coupé là.", court: "3 torpilles · à viser",
    modele: [B(0.5, 0.08, 0.35, 0, 0.04, 0, 'g'), C(0.06, 0.6, 0.02, 0.33, 0, 'e', [0, 0, -0.55], 8), C(0.07, 0.04, 0.17, 0.56, 0, 's', [0, 0, -0.55], 8), B(0.04, 0.2, 0.04, -0.1, 0.16, 0, 'e', [0, 0, 0.3])] },
  { id: 'hotchkiss', nom: "Mitrailleuse Hotchkiss", rarete: 'epique', cat: 'arme', e: { nid: true },
    effet: "Un nid de mitrailleuse est posé sur notre tranchée la plus proche de celui qui la prend.", court: "Un nid de mitrailleuse",
    modele: [B(0.7, 0.1, 0.09, 0, 0.42, 0, 'b'), C(0.03, 0.45, 0.55, 0.43, 0, 'e', COUCHE_X, 8),
      ...[0.4, 0.46, 0.52, 0.58, 0.64].map(x => C(0.045, 0.025, x, 0.43, 0, 'h', COUCHE_X, 8)),
      B(0.03, 0.42, 0.03, 0.1, 0.18, 0.12, 'e', [0.4, 0, 0]), B(0.03, 0.42, 0.03, 0.1, 0.18, -0.12, 'e', [-0.4, 0, 0]), B(0.03, 0.45, 0.03, -0.2, 0.2, 0, 'e', [0, 0, 0.5]), B(0.2, 0.03, 0.1, -0.3, 0.48, 0, 'h')] },
  { id: 'vb', nom: "Tromblon à tir rapide", rarete: 'legendaire', cat: 'arme', e: { soldat: { duree: 30, tromblon: 150 } },
    effet: "Pendant 30 s, il lance une grenade par seconde jusqu'à 150 m, sur le plus gros groupe d'en face.", court: "Grenades à 150 m · 30 s",
    modele: [C(0.035, 0.18, 0, 0.09, 0, 'e', null, 8), C(0.04, 0.02, 0, 0.18, 0, 's', null, 8), C(0.018, 0.4, 0, -0.1, 0, 'b', null, 6), C(0.025, 0.06, 0, 0.21, 0, 'v', null, 6)] },
];
for (const k of ORDRE_RARETES) RARETES[k].objets = OBJETS.filter(o => o.rarete === k).length;
export const OBJET = Object.fromEntries(OBJETS.map(o => [o.id, o]));
export const INDICE_OBJET = Object.fromEntries(OBJETS.map((o, k) => [o.id, k]));
export const musetteObjet = O => !!O.e.tirs;      // un objet à viser : il va dans la musette

// Tirer un objet d'une caisse : la rareté selon `poids`, puis un objet de cette rareté ; `u` et `v` dans [0, 1) (le hasard de l'appelant)
export function tirerObjet(u, v) {
  const total = ORDRE_RARETES.reduce((s, k) => s + RARETES[k].poids, 0);
  let x = u * total, rarete = ORDRE_RARETES[0];
  for (const k of ORDRE_RARETES) { if (x < RARETES[k].poids) { rarete = k; break; } x -= RARETES[k].poids; }
  const choix = OBJETS.filter(o => o.rarete === rarete);
  return choix[Math.min(choix.length - 1, Math.floor(v * choix.length))];
}
