// Le camp et ses bâtiments (Jérôme, v0.85.0 : « les ordres sont donnés en cliquant sur ces bâtiments, et non plus avec les boutons latéraux » ; « les bâtiments sont dans le système d'améliorations »).
// PROPOSITION lue par le labo (sujet « Le camp »), RIEN N'EST DANS LE JEU : les nombres sont à mesurer (`docs/chantiers/camp-et-ameliorations.md`).
// Un bâtiment = une unité spéciale du jeu. Il porte ses ordres [nom, niveau où ils s'ouvrent] (ce qu'on lui demande en le choisissant) et trois niveaux ; aux niveaux 2 et 3, un choix entre deux améliorations
// aux niveaux 2 et 3, un choix entre deux améliorations [nom, ce que le joueur lit, { modificateur: facteur }] (on n'a jamais de quoi tout prendre). Un niveau peut aussi donner `effets` (même forme), des `avions`, des `sections` ou des `reserves` en tout (js/camp.js, `modif` et `effectifsDe`). `cout` : en points de dotation (voir DOTATION). Aucune récompense ne vient d'un homme abattu (DESIGN.md, « Ce que le jeu refuse »).
export const BATIMENTS = {
  artillerie: {
    nom: 'Le parc d\'artillerie', court: 'Artillerie', unite: 'les barrages de 75, 155 et 220', touches: '1 · 2 · 3',
    remplace: 'les boutons 75, 155 et 220',
    ordres: [['Barrage de 75', 1], ['Barrage de 155', 2], ['Barrage de 220', 3]],
    niveaux: [
      { nom: 'Batterie de 75', cout: 0, depart: true, effet: 'Quatre pièces de 75 : le barrage de 24 coups, recharge 40 s (comme aujourd\'hui).' },
      { nom: 'Groupe de 155', cout: 3, effet: 'Deux 155 sous leurs merlons : le barrage de 12 coups, recharge 70 s.',
        choix: [['Tir de réglage', 'La dispersion de tous les calibres −20 %.', { 'artillerie.dispersion': 0.8 }], ['Caissons doublés', 'La recharge de tous les calibres −15 %.', { 'artillerie.recharge': 0.85 }]] },
      { nom: 'Pièce de 220 sur affût', cout: 4, effet: 'Un 220 sur son affût à rails : le barrage de 6 coups, recharge 110 s.',
        choix: [['Salve longue', 'Le 220 tire 10 coups au lieu de 6.', { 'artillerie.salve220': 10 / 6 }], ['Tube neuf', 'La recharge du 220 est plus courte d\'un quart.', { 'artillerie.recharge220': 0.75 }]] },
    ],
  },
  aerodrome: {
    nom: 'L\'aérodrome', court: 'Aérodrome', unite: 'les avions de mitraillage', touches: '4',
    remplace: 'le bouton « Avion »',
    ordres: [['Passe de mitraillage (deux clics)', 1]],
    niveaux: [
      { nom: 'Terrain et un hangar', cout: 2, effet: 'Une bande d\'herbe, un hangar Bessonneau : 2 avions.', avions: 2 },
      { nom: 'Deux hangars', cout: 3, effet: 'Une troisième cellule : 3 avions (la flotte d\'aujourd\'hui), des fûts d\'essence, une tente de l\'escadrille.', avions: 3,
        choix: [['Passe longue', 'La passe de mitraillage peut être plus longue de 30 %.', { 'aerodrome.longueur': 1.3 }], ['Blindage du siège', 'Un avion tient 40 % de points de vie de plus.', { 'aerodrome.pv': 1.4 }]] },
      { nom: 'Escadrille', cout: 4, effet: 'Cinq cellules sous trois hangars, une baraque de contrôle, une manche à air : 4 avions.', avions: 4,
        choix: [['Mitrailleuses jumelées', 'Chaque passe touche 25 % de plus.', { 'aerodrome.letal': 1.25 }], ['Moteur de 180 ch', 'Il revient plus vite : recharge de 70 s au lieu de 90.', { 'aerodrome.recharge': 0.78 }]] },
    ],
  },
  chars: {
    nom: 'Le parc des chars', court: 'Chars', unite: 'les chars d\'assaut', touches: '5',
    remplace: 'le bouton « Char »',
    ordres: [['Sortir le char (puis l\'objectif)', 1]],
    niveaux: [
      { nom: 'Abri à char', cout: 3, effet: 'Une galerie couverte de terre d\'où le Schneider sort, qu\'on choisit pour avoir ses options. Recharge 240 s.' },
      { nom: 'Deuxième abri', cout: 3, effet: 'Deux abris : on rappelle un char plus tôt (recharge 192 s au lieu de 240).', effets: { 'chars.recharge': 0.8 },
        choix: [['Chenilles larges', 'Il franchit des cratères plus profonds (+33 %).', { 'chars.franchit': 1.33 }], ['Canon à tir rapide', 'Son canon recharge 30 % plus vite.', { 'chars.canon': 0.7 }]] },
      { nom: 'Atelier de réparation', cout: 4, effet: 'Une grue, un rail, trois abris : recharge de 154 s.', effets: { 'chars.recharge': 0.8 },
        choix: [['Blindage renforcé', 'Il encaisse 30 % d\'obus de plus.', { 'chars.pv': 1.3 }], ['Moteur renforcé', 'Il roule 15 % plus vite.', { 'chars.vitesse': 1.15 }]] },
    ],
  },
  sapeurs: {
    nom: 'La maison des sapeurs', court: 'Sapeurs', unite: 'le génie : ponts et nids', touches: '6',
    remplace: 'le bouton « Génie »',
    ordres: [['Refaire un pont (clic sur l\'ouvrage)', 1], ['Refaire un nid (clic sur l\'ouvrage)', 2]],
    niveaux: [
      { nom: 'Baraque du génie', cout: 2, effet: 'Une baraque, des madriers, des gabions : 2 sections de 20 hommes.', sections: 2 },
      { nom: 'Chantier', cout: 2, effet: 'Un chevalet de montage et un parc de pontons : 4 sections (aujourd\'hui) ; les nids de mitrailleuse se refont.', sections: 4,
        choix: [['Madriers taillés', 'Le travail dure 25 % de moins.', { 'sapeurs.travail': 0.75 }], ['Voiturettes Decauville', 'Les sections marchent 25 % plus vite.', { 'sapeurs.vitesse': 1.25 }]] },
      { nom: 'Forge et grue', cout: 3, effet: 'Une forge, une grue, un wagonnet.',
        choix: [['Sections de 30', 'Chaque section compte 30 hommes : le travail va une fois et demie plus vite.', { 'sapeurs.hommes': 1.5 }], ['Équipe de nuit', 'Un chantier du camp s\'achève en une nuit, quel que soit son niveau.', {}]] },
    ],
  },
  caserne: {
    nom: 'La caserne des renforts', court: 'Caserne', unite: 'la relève et les régiments frais', touches: 'T (nuit)',
    remplace: 'la corvée « relève » des cartes de régiment',
    ordres: [['Relever un régiment (la nuit)', 1], ['Équiper un régiment (la nuit)', 2]],
    niveaux: [
      { nom: 'Baraquements', cout: 0, depart: true, effet: 'Deux baraques, des tentes : 2 régiments frais en réserve.', reserves: 2 },
      { nom: 'Cantonnement', cout: 2, effet: 'Quatre baraques, une cuisine roulante : 4 régiments en réserve (la réserve d\'aujourd\'hui) ; on y équipe un régiment, la nuit.', reserves: 4,
        choix: [['Poste de secours', 'Les blessés évacués reviennent plus souvent (deux sur trois au lieu d\'un sur deux).', { 'caserne.retour': 4 / 3 }], ['Cuisine roulante', 'Le ravitaillement donne des vivres pour quatre nuits au lieu de trois.', { 'caserne.vivres': 4 / 3 }]] },
      { nom: 'Hôpital de campagne', cout: 3, effet: 'Un poste de secours, six baraques : 6 régiments en réserve.', reserves: 6,
        choix: [['Réserve de plus', 'Un régiment frais de plus en réserve.', { '+reserves': 1 }], ['Cantine de campagne', 'Le ravitaillement donne des vivres pour cinq nuits.', { 'caserne.vivres': 1.25 }]] },
    ],
  },
};
export const ORDRE_BATIMENTS = ['caserne', 'artillerie', 'sapeurs', 'chars', 'aerodrome'];

// L'équipement d'un régiment (Jérôme, v0.91.0 ; la caserne, niveau 2) : ce qu'on donne aux hommes, jamais ce qu'ils ont abattu. Il se donne la nuit, par une corvée (le régiment ne se repose pas : c'est son prix, avec `cout`
// point de dotation) ; deux emplacements par régiment, un seul de chaque ; il meurt avec le régiment (relevé, il part avec son matériel). `id` d'une corvée : `eq-` + la clé. Les facteurs sont des propositions, à mesurer.
export const EQUIPEMENT = { places: 2, cout: 1, niveauCaserne: 2 };
export const EQUIPEMENTS = {
  casque:    { nom: 'Casques Adrian', court: 'Casques', effet: 'Les éclats d\'obus tuent un cinquième de moins : ils blessent à la place.', obus: 0.8 },
  grenades:  { nom: 'Grenadiers', court: 'Grenades', effet: 'Plus forts à la baïonnette et au corps à corps : un quart de coups qui portent en plus.', melee: 1.25 },
  hotchkiss: { nom: 'Section de mitrailleuses', court: 'Hotchkiss', effet: 'Le tir du régiment porte 15 % plus loin.', portee: 1.15 },
  brancards: { nom: 'Brancardiers', court: 'Brancards', effet: 'Moitié moins de blessés meurent laissés au front, et un quart de plus reviennent guéris.', mortBlesse: 0.5, retour: 1.25 },
};
/* Ce qu'un régiment porte, en mots */
export const equipeEnMots = reg => (reg.equip ?? []).map(k => EQUIPEMENTS[k].nom.toLowerCase()).join(' et ');

// La dotation de l'état-major : une seule monnaie, jamais des morts. Elle tombe à l'aube.
export const DOTATION = {
  depart: 3,            // points au premier matin
  aube: 1,              // à chaque aube
  tenue: { seuil: 0.75, points: 1 },       // en plus, si nos lignes sont tenues à 75 % au moins
  ligne: 2,             // la première fois qu'on prend une des lignes d'en face (au plus quatre fois)
};

// Un parcours pour montrer le camp qui grandit (labo seulement) : { jour, [bâtiment]: niveau } ; un chantier dure une nuit
export const PARCOURS_EXEMPLE = [
  { jour: 1, caserne: 1, artillerie: 1 },
  { jour: 2, sapeurs: 1 },
  { jour: 3, chars: 1 },
  { jour: 5, aerodrome: 1 },
  { jour: 6, artillerie: 2 },
  { jour: 8, chars: 2, caserne: 2 },
  { jour: 10, aerodrome: 2 },
  { jour: 12, sapeurs: 2, artillerie: 3 },
];

// Où est le camp (lot 2) : en coordonnées du secteur (0..400, 0..300 ; les marges s'ajoutent), à 80 m derrière notre 4e ligne (rangée 278), au milieu du front ; chaque bâtiment est centré
// sur [dx, dy] depuis ce point (la disposition « en ligne » du labo, retenue par Jérôme le 27 octobre). Les emprises (`PIED` de rendu/camp-modeles.js) ne se touchent pas.
export const CAMP_PLAN = {
  x: 200, y: 358, largeur: 400, hauteur: 300,      // le secteur (400 × 300) : le camp d'en face est celui-ci tourné d'un demi-tour autour de son centre
  ligne: { caserne: [-100, 0], artillerie: [-52, 0], sapeurs: [-14, 0], chars: [20, 0], aerodrome: [84, 0] },
};
// L'emprise de chaque bâtiment [largeur le long de x, profondeur le long de y], en m, à tout niveau (le dessin la garde : `rendu/camp-modeles.js`)
export const PIEDS = { artillerie: [34, 22], aerodrome: [84, 40], chars: [32, 30], sapeurs: [26, 22], caserne: [42, 28] };

// Le camp d'en face (Jérôme, v0.92.0 ; lot 5) : l'IA bâtit seule, à l'aube, avec la même dotation (× `dotation` de la difficulté : data/difficulte.js). Elle n'a besoin que de ce qu'elle emploie :
// l'artillerie (ses barrages : les calibres s'ouvrent aux niveaux) et la caserne (sa relève) ; les sapeurs pour refaire ses nids. Le plus bas niveau d'abord, l'artillerie avant la caserne ; le choix du palier vient d'un hachage de la graine.
export const CAMP_IA = { cibles: { artillerie: 3, caserne: 3, sapeurs: 2 }, ordre: ['artillerie', 'caserne', 'sapeurs'] };
