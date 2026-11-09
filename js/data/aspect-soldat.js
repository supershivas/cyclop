// L'aspect d'un soldat : les listes dont `aspect` (js/aspect-soldat.js) tire un homme. Des données, pas du code : ajouter une coiffure, une barbe
// ou un accessoire, c'est une ligne ici (et ses boîtes dans rendu/soldat-articule.js). Le dessin seulement : rien n'est sauvegardé,
// l'aspect se retrouve du numéro de l'homme, de son camp et de la graine d'identité (comme son nom).
// Les couleurs sont des lettres de la palette (palette.js) : aucun ton nouveau, pas même pour la peau (Jérôme, v0.102.x : la palette reste fermée).

// La coiffe (Jérôme, 1er nov. : « le soldat doit toujours avoir un casque, sauf blessé ») : le casque de l'armée, Adrian chez nous, Stahlhelm en face. Un homme blessé à la tête l'a perdu (ses cheveux se voient, un bandeau).
export const COIFFES = [{ nom: 'casque Adrian', nomEux: 'Stahlhelm', poids: [1, 1] }];
// Les cheveux (visibles sous le casque par la nuque et les tempes, entiers quand le casque est tombé). 0 : chauve.
export const CHEVEUX = [
  { nom: 'chauve', poids: 0.07 },
  { nom: 'ras', poids: 0.3 },
  { nom: 'courts', poids: 0.36 },
  { nom: 'longs', poids: 0.12 },
  { nom: 'frange', poids: 0.15 },
];
// Les couleurs de cheveux (lettres de la palette) : noir, brun, châtain, blond, gris (l'âge y pousse)
export const COULEURS_CHEVEUX = ['t', 's', 'b', 'g', 'r'];
export const NOMS_COULEURS_CHEVEUX = ['noirs', 'bruns', 'châtains', 'blonds', 'gris'];
export const BARBES = [
  { nom: 'rasé', poids: 0.28 },
  { nom: 'moustache', poids: 0.36 },        // le poilu à moustache
  { nom: 'bouc', poids: 0.1 },
  { nom: 'barbe pleine', poids: 0.12 },
  { nom: 'favoris', poids: 0.14 },
];
// La peau : trois tons de la palette (os, brume, glaise), du plus pâle au plus hâlé ; l'herbe morte, trop verte, faisait des visages de noyés (le teint suit un peu le grade : les officiers vivent moins dehors)
export const PEAUX = [{ nom: 'pâle', lettre: 'o' }, { nom: 'claire', lettre: 'r' }, { nom: 'hâlée', lettre: 'g' }];
// Les traits du visage : trois formes chacun (la grille de 6 × 6 cases du nuanceur)
export const YEUX = ['écartés', 'rapprochés', 'hauts'];       // (jamais collés : au moins deux cases entre les yeux)
export const NEZ = ['petit', 'moyen', 'fort'];
export const BOUCHES = ['fine', 'moyenne', 'large'];
export const SOURCILS = ['absents', 'fins', 'épais'];

// Les accessoires : un bit chacun. `camp` : 0 nous, 1 en face, null les deux ; `p` : la chance de base ; `rang` : la chance par rang d'identité (0 capitaine … 7 soldat de 2e classe) en
// plus ou en moins ; `sans` : les rangs qui ne le portent jamais (le capitaine n'a pas de pelle).
// (Le ceinturon, les cartouchières, la gourde et le sac sont ceux de tous : ils ne sont pas dans la liste.)
export const ACCESSOIRES = [
  { id: 'pipe', nom: 'une pipe', camp: null, p: 0.07, age: 0.004 },
  { id: 'musette', nom: 'une musette', camp: null, p: 0.22 },
  { id: 'pelle', nom: 'une pelle-bêche', camp: null, p: 0.14, sans: [0, 1, 2] },
  { id: 'jumelles', nom: 'des jumelles', camp: null, p: 0, rang: [0.7, 0.5, 0.4, 0.15, 0.05, 0, 0, 0] },
  { id: 'lunettes', nom: 'des lunettes', camp: null, p: 0.05, age: 0.003 },
  { id: 'sacoche', nom: 'une sacoche de cartes', camp: null, p: 0, rang: [0.5, 0.4, 0.35, 0.2, 0.05, 0, 0, 0] },
  { id: 'masque', nom: 'un masque à gaz', camp: null, p: 0.12 },
  { id: 'couverture', nom: 'une couverture en bandoulière', camp: null, p: 0.3 },
  { id: 'cigarette', nom: 'une cigarette', camp: null, p: 0.06 },
  { id: 'grenades', nom: 'des grenades à la ceinture', camp: null, p: 0.1, sans: [0, 1, 2] },
  { id: 'brassard', nom: 'un brassard', camp: null, p: 0.015, rang: [0.3, 0.3, 0.3, 0.1, 0.08, 0.04, 0, 0] },
  { id: 'cache-nez', nom: 'un cache-nez', camp: null, p: 0.05 },
];

// La carrure : des multiplicateurs autour de 1 (la taille de référence de 1,7 m ; ±7 % en hauteur et ±14 % en largeur depuis la v0.69.0). `force`, `endurance` (0 à 100) et l'âge y poussent.
export const CARRURE = {
  taille: { ecart: 0.07 },           // hauteur totale
  epaules: { ecart: 0.12, force: 0.1 },   // largeur du tronc et des bras (+ jusqu'à 10 % pour les plus forts)
  jambes: { ecart: 0.06 },           // part des jambes dans la hauteur
  tete: { ecart: 0.07 },
  ventre: { ecart: 0.08, age: 0.05 },     // le ventre : l'âge l'arrondit
};

// Les soldats articulés en jeu (Jérôme, v0.105.0 : « j'aime le rendu, on continue »), seulement de près : dès `des` pixels par mètre, et au plus `max` hommes, les plus proches du centre de la vue
// (le coût mesuré, rendu logiciel : environ trois fois celui du soldat équipé du jeu : `docs/domaines/rendu.md`) ; `fin` : dès ce zoom le niveau fin, avant lui l'intermédiaire (v0.105.1) ; les autres gardent le soldat équipé. `ombrage` : le relief des faces (0 : les aplats),
// un mélange continu du ton de la palette (comme les fondus : voir la palette), qui fait lire les membres.
export const ARTICULE = { des: 12, fin: 24, max: 250, ombrage: 0.5, texture: true, animations: true };      // `texture` : la pose des 250 hommes écrite côté processeur dans une texture, lue par le nuanceur (v0.132 ; false : le nuanceur la calcule) ; `animations` : la marche, le repos et le tir viennent du lecteur d'animations plutôt que du calcul d'avant (étape 4 ; false : l'ancien calcul, pour comparer)
