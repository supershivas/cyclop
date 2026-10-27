// Le camp et ses bâtiments (Jérôme, v0.84.0 : « les ordres sont donnés en cliquant sur ces bâtiments, et non plus avec les boutons latéraux » ; « les bâtiments sont dans le système d'améliorations »).
// PROPOSITION lue par le labo (sujet « Le camp »), RIEN N'EST DANS LE JEU : les nombres sont à mesurer (`docs/chantiers/camp-et-ameliorations.md`).
// Un bâtiment = une unité spéciale du jeu. Il porte ses ordres [nom, niveau où ils s'ouvrent] (ce qu'on lui demande en le choisissant) et trois niveaux ; aux niveaux 2 et 3, un choix entre deux améliorations
// (on n'a jamais de quoi tout prendre). `cout` : en points de dotation (voir DOTATION). Aucune récompense ne vient d'un homme abattu (DESIGN.md, « Ce que le jeu refuse »).
export const BATIMENTS = {
  artillerie: {
    nom: 'Le parc d\'artillerie', court: 'Artillerie', unite: 'les barrages de 75, 155 et 220', touches: '1 · 2 · 3',
    remplace: 'les boutons 75, 155 et 220',
    ordres: [['Barrage de 75', 1], ['Barrage de 155', 2], ['Barrage de 220', 3]],
    niveaux: [
      { nom: 'Batterie de 75', cout: 0, depart: true, effet: 'Quatre pièces de 75 : le barrage de 24 coups, recharge 40 s (comme aujourd\'hui).' },
      { nom: 'Groupe de 155', cout: 3, effet: 'Deux 155 sous leurs merlons : le barrage de 12 coups, recharge 70 s.',
        choix: [['Tir de réglage', 'La dispersion de tous les calibres −20 %.'], ['Caissons doublés', 'La recharge de tous les calibres −15 %.']] },
      { nom: 'Pièce de 220 sur affût', cout: 4, effet: 'Un 220 sur son affût à rails : le barrage de 6 coups, recharge 110 s.',
        choix: [['Salve longue', 'Le 220 tire 4 coups de plus.'], ['Tir de nuit réglé', 'Les obus tombés sur une tranchée tuent 15 % de plus à l\'aube (cadence de la nuit).']] },
    ],
  },
  aerodrome: {
    nom: 'L\'aérodrome', court: 'Aérodrome', unite: 'les avions de mitraillage', touches: '4',
    remplace: 'le bouton « Avion »',
    ordres: [['Passe de mitraillage (deux clics)', 1]],
    niveaux: [
      { nom: 'Terrain et un hangar', cout: 2, effet: 'Une bande d\'herbe, un hangar Bessonneau : 2 avions.' },
      { nom: 'Deux hangars', cout: 3, effet: 'Une troisième cellule : 3 avions (la flotte d\'aujourd\'hui), des fûts d\'essence, une tente de l\'escadrille.',
        choix: [['Passe longue', 'La passe de mitraillage est plus longue de 30 %.'], ['Blindage du siège', 'Un avion tient 40 % de plus avant d\'être abattu.']] },
      { nom: 'Escadrille', cout: 4, effet: 'Cinq cellules sous trois hangars, une baraque de contrôle, une manche à air : 4 avions.',
        choix: [['Mitrailleuses jumelées', 'Chaque passe touche 25 % de plus.'], ['Moteur de 180 ch', 'Il revient plus vite : recharge −20 s.']] },
    ],
  },
  chars: {
    nom: 'Le parc des chars', court: 'Chars', unite: 'les chars d\'assaut', touches: '5',
    remplace: 'le bouton « Char »',
    ordres: [['Sortir le char (puis l\'objectif)', 1]],
    niveaux: [
      { nom: 'Abri à char', cout: 3, effet: 'Une galerie couverte de terre d\'où le Schneider sort, qu\'on choisit pour avoir ses options. Un seul char, recharge 240 s.' },
      { nom: 'Deuxième abri', cout: 3, effet: 'Deux chars en parc à la fois ; un modèle de plus.',
        choix: [['Renault FT', 'Léger, rapide, il franchit mal : le char de la percée.'], ['Saint-Chamond', 'Lourd, un 75 long, il franchit mal les cratères.']] },
      { nom: 'Atelier de réparation', cout: 4, effet: 'Une grue, un rail : le char immobilisé dans un cratère est dépanné la nuit au lieu d\'être perdu ; trois abris.',
        choix: [['Mark IV allié', 'Le grand losange : il franchit les gros cratères.'], ['Blindage renforcé', 'Les chars encaissent 30 % d\'obus de plus.']] },
    ],
  },
  sapeurs: {
    nom: 'La maison des sapeurs', court: 'Sapeurs', unite: 'le génie : ponts et nids', touches: '6',
    remplace: 'le bouton « Génie »',
    ordres: [['Refaire un pont (clic sur l\'ouvrage)', 1], ['Refaire un nid (clic sur l\'ouvrage)', 2]],
    niveaux: [
      { nom: 'Baraque du génie', cout: 2, effet: 'Une baraque, des madriers, des gabions : 2 sections de 20 hommes.' },
      { nom: 'Chantier', cout: 2, effet: 'Un chevalet de montage et un parc de pontons : 4 sections (aujourd\'hui) ; les nids de mitrailleuse se refont.',
        choix: [['Madriers taillés', 'Le travail dure 25 % de moins.'], ['Voiturettes Decauville', 'Les sections marchent 25 % plus vite.']] },
      { nom: 'Forge et grue', cout: 3, effet: 'Une forge, une grue, un wagonnet : des sections de 30 hommes ; la nuit, ils bâtissent un camp plus vite (un chantier de moins d\'une nuit).',
        choix: [['Sections de 30', 'Chaque section compte 30 hommes (le travail va au prorata).'], ['Équipe de nuit', 'Un chantier du camp s\'achève en une nuit, quel que soit son niveau.']] },
    ],
  },
  caserne: {
    nom: 'La caserne des renforts', court: 'Caserne', unite: 'la relève et les régiments frais', touches: 'T (nuit)',
    remplace: 'la corvée « relève » des cartes de régiment',
    ordres: [['Relever un régiment (la nuit)', 1], ['Équiper un régiment', 2]],
    niveaux: [
      { nom: 'Baraquements', cout: 0, depart: true, effet: 'Deux baraques, des tentes : 2 régiments frais en réserve.' },
      { nom: 'Cantonnement', cout: 2, effet: 'Quatre baraques (la réserve d\'aujourd\'hui : 4 régiments), une cuisine roulante ; on y équipe un régiment de casques ou de grenades.',
        choix: [['Cuisine roulante', 'Les vivres durent quatre nuits au lieu de trois.'], ['Relève par camions', 'La relève monte d\'un coup, sans la marche de nuit.']] },
      { nom: 'Hôpital de campagne', cout: 3, effet: '6 régiments en réserve ; un poste de secours : les blessés évacués reviennent plus souvent (deux sur trois).',
        choix: [['Brancardiers', 'Les blessés légers regagnent l\'arrière 30 % plus vite.'], ['Dépôt d\'équipement', 'Deux équipements de plus à distribuer.']] },
    ],
  },
};
export const ORDRE_BATIMENTS = ['caserne', 'artillerie', 'sapeurs', 'chars', 'aerodrome'];

// L'équipement d'un régiment (la caserne, niveau 2) : ce qu'on donne aux hommes, jamais ce qu'ils ont abattu. Deux emplacements par régiment ; le matériel meurt avec le régiment.
export const EQUIPEMENTS = {
  casque:   { nom: 'Casques Adrian', emplacement: 'tête', effet: 'Les éclats tuent moins : la blessure à la tête devient plus rarement mortelle.' },
  grenades: { nom: 'Grenadiers', emplacement: 'arme', effet: 'Plus forts à la baïonnette et au corps à corps dans une tranchée prise.' },
  hotchkiss: { nom: 'Section de mitrailleuses', emplacement: 'arme', effet: 'Le tir du régiment porte plus loin.' },
  brancards: { nom: 'Brancardiers', emplacement: 'soin', effet: 'Ses blessés regagnent l\'arrière plus vite.' },
};

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
