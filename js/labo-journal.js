// Le journal du labo : ce qui a changé, version par version, et où le voir (la page d'accueil du labo, js/lib/labo-shell.js).
// Une entrée par version qui touche au labo, la plus récente en haut. `ref` : « sujet-Lettre » (la lettre est celle de la variante,
// A étant l'actuelle). À chaque changement du labo : une entrée ici, avec `depuis` sur les variantes ajoutées ou changées (labo.js).
export const JOURNAL = [
  { version: '0.146.0', date: '2026-11-17', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : la chute et les poses des morts passent en jeu ; les couchés d\'avant deviennent l\'ancienne', ref: 'morts-A' },
  ] },
  { version: '0.145.2', date: '2026-11-17', items: [
    { genre: 'nouveau', texte: 'La mort et les morts : la chute d\'un homme tué (une seconde, du côté tiré de son numéro) et des morts dans des poses variées, le fusil lâché à côté ; à trancher', ref: 'morts-A' },
  ] },
  { version: '0.145.1', date: '2026-11-17', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : les épaules et les crânes arrondis passent en jeu ; les boîtes deviennent l\'ancienne', ref: 'formes-A' },
  ] },
  { version: '0.144.4', date: '2026-11-17', items: [
    { genre: 'nouveau', texte: 'Épaules et crânes (à trancher) : les épaules aux coins coupés, le crâne et les cheveux en dôme ; le coût dit', ref: 'formes-B' },
  ] },
  { version: '0.144.1', date: '2026-11-17', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : les gestes d\'attente passent en jeu (le froid et la pluie selon le temps, un guetteur sur dix en première ligne, les petits gestes pour un homme sur quatre)', ref: 'repos-E' },
  ] },
  { version: '0.143.5', date: '2026-11-17', items: [
    { genre: 'nouveau', texte: 'Les gestes d\'attente (à trancher) : par le froid, sous la pluie, le guetteur, les petits gestes (le casque, la main à la bouche)', ref: 'repos-E' },
  ] },
  { version: '0.143.4', date: '2026-11-17', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : le repos vivant et le dôme tourné à 8 pans passent en jeu ; la pose tenue et les anneaux deviennent les anciennes', ref: 'casques-A' },
  ] },
  { version: '0.143.3', date: '2026-11-17', items: [
    { genre: 'nouveau', texte: 'Au repos dans la tranchée (à trancher) : ils respirent, se balancent, passent d\'une jambe sur l\'autre, regardent autour d\'eux, rajustent leur prise', ref: 'repos-B' },
    { genre: 'nouveau', texte: 'Les casques de près (à trancher) : des anneaux plus fins, ou un vrai dôme tourné à 8 ou 16 pans, avec le coût de chacun', ref: 'casques-C' },
    { genre: 'mis-a-jour', texte: 'Le défilé des démarches : un bouton « Sous le feu : courbés »', ref: 'demarches-A' },
  ] },
  { version: '0.142.2', date: '2026-11-17', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : les démarches passent en jeu, de près et de loin (une allure par homme, le fusil à deux mains, l\'épaulement avant le coup, la crosse à l\'épaule) ; les démarches d\'avant deviennent l\'ancienne', ref: 'demarches-A' },
  ] },
  { version: '0.142.1', date: '2026-11-17', items: [
    { genre: 'nouveau', texte: 'Les démarches et le tir en marchant (à trancher) : une allure par homme (les épaules, les hanches, le poids sur une jambe, le fusil à deux mains), l\'épaulement avant le coup, la crosse à l\'épaule ; de près en défilé, et les silhouettes à 6 px/m', ref: 'demarches-B' },
  ] },
  { version: '0.141.1', date: '2026-11-16', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : les soldats tous différents passent en jeu, avec les hommes assis dans la tranchée ; « tous pareils » devient l\'ancienne', ref: 'variete-soldats-A' },
  ] },
  { version: '0.140.5', date: '2026-11-16', items: [
    { genre: 'nouveau', texte: 'Des soldats tous différents (à trancher) : le ton de l\'uniforme, le regard au repos, la place dans le rang, et des hommes assis dans la tranchée', ref: 'variete-soldats-C' },
  ] },
  { version: '0.139.2', date: '2026-11-16', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : la boue sur les hommes passe en jeu, légère au premier matin, plus forte de jour en jour, foncée par la pluie ; les uniformes propres deviennent l\'ancienne', ref: 'boue-soldats-A' },
  ] },
  { version: '0.139.1', date: '2026-11-16', items: [
    { genre: 'nouveau', texte: 'La boue sur les hommes (à trancher) : la couleur du sol gagne les uniformes par le bas, la pluie les fonce ; propre, légère, forte, sous la pluie', ref: 'boue-soldats-B' },
  ] },
  { version: '0.138.0', date: '2026-11-15', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme tranche : le grain du sol C (grain et bords déchiquetés) et les arbres D (essences, grappes de près, verts d\'été par essence) passent en jeu ; l\'herbe dense est abandonnée (trop chère sans carte graphique). Les trois sujets sortent du labo (docs/archives/labo-archive.md)', ref: 'atelier-terrain-A' },
  ] },
  { version: '0.137.0', date: '2026-11-15', items: [
    { genre: 'nouveau', texte: 'L\'herbe dense (à trancher) : des touffes tirées case par case, de sept brins variés, vertes ou sèches selon le sol ; plus dense, ou une prairie' },
    { genre: 'nouveau', texte: 'Des arbres réalistes (à trancher) : les essences du front (peuplier, saule têtard, chêne, hêtre, bouleau), leurs tons par saison, des couronnes en grappes, et des verts d\'été propres à chaque essence (hors palette, à admettre)' },
  ] },
  { version: '0.136.0', date: '2026-11-15', items: [
    { genre: 'nouveau', texte: 'Le grain du sol (à trancher) : des mottes, des fentes, des cailloux et des brins dans chaque case, avec les seules couleurs de la palette ; trois variantes (le grain, le grain et les bords déchiquetés, le grain gros)' },
  ] },
  { version: '0.135.0', date: '2026-11-15', items: [
    { genre: 'mis-a-jour', texte: 'L\'atelier de terrain a un vrai printemps (une saison du jeu) : la prairie, les feuilles neuves et les arbres en fleurs, son temps', ref: 'atelier-terrain-A' },
  ] },
  { version: '0.134.9', date: '2026-11-15', items: [
    { genre: 'nouveau', texte: 'L\'atelier de terrain : le rendu du jeu avec des curseurs pour l\'heure, la nuit, la saison, le temps qu\'il fait, l\'éclairage, le zoom et la caméra ; le temps qui passe et des obus', ref: 'atelier-terrain-A' },
  ] },
  { version: '0.134.0', date: '2026-11-15', items: [
    { genre: 'mis-a-jour', texte: 'Jérôme retient « Deux colonnes » pour le papier de la nuit et « Le rapport » pour la fin de partie : en jeu ; leurs morceaux viennent maintenant du jeu (hud/papier-nuit.js)', ref: 'papier-nuit-A' },
  ] },
  { version: '0.133.0', date: '2026-11-15', items: [
    { genre: 'nouveau', texte: 'Le papier de la nuit refait : quatre mises en page sans défilement (deux colonnes, les étages, le tableau croisé, le front), la décision d\'abord, un régiment par ligne et ses corvées en icônes ; la mesure du défilement à quatre tailles d\'écran sous chaque cadre', ref: 'papier-nuit-A' },
    { genre: 'nouveau', texte: 'La fin de partie : trois mises en page (le rapport, la frise, le registre des jours) avec la bataille entière, les moments clés jour après jour et des médailles nouvelles (le roc, l\'inébranlable, le fuyard, le survivant, le char et le poste les plus meurtriers, le génie)', ref: 'fin-partie-A' },
  ] },
  { version: '0.126.0', date: '2026-11-08', items: [
    { genre: 'mis-a-jour', texte: 'Le bilan de l\'aube passe en jeu en tuiles, dans le langage du tableau de bord (ce que la nuit a fait, les morts par cause, la dotation, les effectifs au matin)', ref: 'donnees-bilan-B' },
  ] },
  { version: '0.125.0', date: '2026-11-08', items: [
    { genre: 'mis-a-jour', texte: 'Les fiches en tuiles passent en jeu : le soldat, le régiment (avec son effectif et son moral soir après soir), le char et la mitrailleuse', ref: 'donnees-fiches-A' },
  ] },
  { version: '0.124.0', date: '2026-11-08', items: [
    { genre: 'mis-a-jour', texte: 'Le bilan du soir « tableau de bord » passe en jeu (papier de la nuit) : à retenir, effectifs, morts du jour, lignes, ciel, et nos régiments en graphiques', ref: 'donnees-bilan-B' },
  ] },
  { version: '0.121.0', date: '2026-11-08', items: [
    { genre: 'mis-a-jour', texte: 'Les données : Jérôme retient les tuiles pour les fiches et le tableau de bord pour le bilan du soir ; la fiche d\'un régiment trace son effectif et son moral soir après soir, et le bilan les blessés du jour, d\'après l\'historique que la partie garde désormais (sauvegarde 29)', ref: 'donnees-fiches-A' },
  ] },
  { version: '0.119.0', date: '2026-11-07', items: [
    { genre: 'nouveau', texte: 'Les données, les fiches : un soldat, un régiment, un char et une mitrailleuse dans le langage du tableau de bord (retenu), en trois mises en page à comparer : les tuiles, le profil, la compacte', ref: 'donnees-fiches-A' },
  ] },
  { version: '0.117.0', date: '2026-11-07', items: [
    { genre: 'nouveau', texte: 'Les données : trois bilans du soir (le rapport, le tableau de bord, la frise) faits d\'une bibliothèque graphique commune (barres d\'effectifs, bâtons des pertes, jauge de moral, tronçons, pictogrammes des faits), sur trois journées d\'exemple ; rien n\'est encore dans le jeu', ref: 'donnees-bilan-A' },
  ] },
  { version: '0.113.0', date: '2026-11-05', items: [
    { genre: 'mis-a-jour', texte: 'Labo lumière : les soldats du jeu à tous les niveaux de détail (boîte, silhouette, équipé, articulé), des lanternes dans les tranchées et des lampes sur certains soldats, une carte de 512 × 320 m et une colline' },
  ] },
  { version: '0.112.0', date: '2026-11-05', items: [
    { genre: 'mis-a-jour', texte: 'Labo lumière : les vrais soldats articulés du jeu de près, un faux terrain qui prolonge la carte jusqu\'à l\'horizon, des nuages (et leur ombre), des étoiles et la lune, cinq temps (brouillard et neige en plus) qui peuvent changer tout seuls' },
  ] },
  { version: '0.111.0', date: '2026-11-05', items: [
    { genre: 'nouveau', texte: 'Une page à part, « Labo lumière » (labo-lumiere.html, lien dans les réglages du jeu) : le futur jeu simulé avec un terrain en voxels, jusqu\'à 50 000 soldats et huit étapes de lumière (soleil et ombres, AO par voxel, recalcul local, lumière propagée, atmosphère, flash des obus, météo, AO écran), chacune activable seule, avec panneau de mesures et comparaison' },
  ] },
  { version: '0.105.2', date: '2026-11-02', items: [
    { genre: 'mis-a-jour', texte: 'La fabrique de soldats a deux poses de plus : le feu retenu (le fusil baissé en travers des hanches) et la mêlée (la fente, la baïonnette qui part par à-coups) ; elles sont aussi en jeu de près', ref: 'fabrique-A' },
  ] },
  { version: '0.105.1', date: '2026-11-01', items: [
    { genre: 'mis-a-jour', texte: 'La fabrique de soldats montre les deux niveaux de détail du jeu : le fin (24 pixels par mètre et plus) et l\'intermédiaire (12 à 16), avec le nombre de triangles de chacun', ref: 'fabrique-A' },
  ] },
  { version: '0.104.2', date: '2026-11-01', items: [
    { genre: 'nouveau', texte: 'La fabrique de soldats : un soldat articulé (genou, coude, mains, pieds), un visage, des cheveux, une barbe, des accessoires et une carrure différents pour chaque numéro, avec sa fiche (nom, grade, caractéristiques) ; zoom jusqu\'à 420 pixels par mètre', ref: 'fabrique-A' },
  ] },
  { version: '0.98.1', date: '2026-10-28', items: [
    { genre: 'nouveau', texte: 'Design system, deuxième jet (proposition) : les titres en condensé fin et haut, jamais coupés ; des marges plus grandes ; des boutons refusés qui se lisent impossibles', ref: 'ds-revision-A' },
  ] },
  { version: '0.98.0', date: '2026-10-28', items: [
    { genre: 'nouveau', texte: 'L\'onglet « Design system » : les fondations (typographie, espaces, couleurs de l\'interface), les boutons dans tous leurs états, les papiers, l\'infobulle et les dialogues, sur les vraies feuilles du jeu', ref: 'ds-fondations-A' },
    { genre: 'nouveau', texte: 'Quatre animations du gain d\'un point de dotation, quatre de la partie gagnée', ref: 'gain-point-A' },
    { genre: 'nouveau', texte: 'Quatre fiches de fin de journée, plus claires : toujours développées, centrées, avec les régiments qui gardent leur ordre', ref: 'fiche-jour-A' },
  ] },
  { version: '0.90.0', date: '2026-10-27', items: [
    { genre: 'mis-a-jour', texte: 'Les échelles des tranchées servent en jeu : au pied d\'une échelle la paroi ne ralentit plus la sortie ; elles sont dans les trois niveaux de détail', ref: 'tranchees-A' },
  ] },
  { version: '0.88.1', date: '2026-10-27', items: [
    { genre: 'mis-a-jour', texte: 'Les tranchées en trois niveaux de détail passent en jeu, le niveau suivant le zoom (A), avec des échelles pour sortir ; le dessin d\'avant est « ancien » (E)', ref: 'tranchees-A' },
  ] },
  { version: '0.85.0', date: '2026-10-27', items: [
    { genre: 'nouveau', texte: 'Le camp : cinq bâtiments en trois niveaux (parc d\'artillerie, aérodrome, parc des chars, maison des sapeurs, caserne des renforts) et le camp entier qui grandit au fil des jours ; un clic sur un bâtiment ouvre ses ordres et son amélioration', ref: 'camp-A' },
  ] },
  { version: '0.84.0', date: '2026-10-27', items: [
    { genre: 'nouveau', texte: 'Les tranchées en trois niveaux de détail (silhouette, ouvrage, détaillé) et selon le zoom, chacune intacte, légèrement détruite et complètement détruite côte à côte, avec leur coût (triangles, temps) ; rien n\'est encore dans le jeu', ref: 'tranchees-B' },
  ] },
  { version: '0.76.0', date: '2026-10-26', items: [
    { genre: 'nouveau', texte: 'Le son : chaque effet du jeu, l\'ambiance (vent, pluie, fusillade, moteurs, musique) et l\'espace (distance et côté), joués par le module du jeu', ref: 'son-A' },
  ] },
  { version: '0.67.2', date: '2026-10-25', items: [
    { genre: 'nouveau', texte: 'Le moral sur le champ : quatre façons de montrer qu\'un régiment est ébranlé ou en déroute sur le champ même (un liseré qui s\'effrite, un pennon, une trame, des chevrons de repli), sur le moteur en direct ; rien n\'est dans le jeu', ref: 'moral-terrain-A' },
  ] },
  { version: '0.52.1', date: '2026-10-22', items: [
    { genre: 'mis-a-jour', texte: 'Les maquettes du moteur montrent les soldats des deux armées tournés vers l\'ennemi (ils regardaient là où ils allaient, et au départ vers le sud) ; coût de cubes de sol plus petits mesuré (voir la feuille de route), rien de nouveau au labo' },
  ] },
  { version: '0.45.0', date: '2026-10-21', items: [
    { genre: 'mis-a-jour', texte: 'Les chars d\'assaut : cinq engins dessinés à l\'échelle en volumes (Mark IV, avec sa livrée allemande de Cambrai, Renault FT à tourelle tournante, Schneider CA 1, Saint-Chamond, A7V allemand), à la caméra libre (glisser, Maj, molette, « Suivre », trois crans de zoom en plus)', ref: 'chars-A' },
  ] },
  { version: '0.41.0', date: '2026-10-21', items: [
    { genre: 'mis-a-jour', texte: 'Un point vert, rouge ou orange devant chaque sujet et chaque groupe ; les propositions des sujets de satisfaction (v0.40.1) sont marquées « à trancher »', ref: 'accueil' },
  ] },
  { version: '0.38.2', date: '2026-10-20', items: [
    { genre: 'nouveau', texte: 'Les chars d\'assaut : un losange en volumes qui précède l\'infanterie, ou qui s\'enlise dans les cratères', ref: 'chars-A' },
  ] },
  { version: '0.31.1', date: '2026-10-18', items: [
    { genre: 'nouveau', texte: 'Une page d\'accueil : ce qui a changé, où le voir, ce qui reste à trancher', ref: 'accueil' },
    { genre: 'mis-a-jour', texte: 'Les notes du champ de bataille : silhouettes allégées au zoom 4, même relief à tous les zooms', ref: 'champ-A' },
    { genre: 'mis-a-jour', texte: 'La palette compte ses tons et dit le vert kaki clair d\'en face', ref: 'palette-A' },
  ] },
];
