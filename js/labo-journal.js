// Le journal du labo : ce qui a changé, version par version, et où le voir (la page d'accueil du labo, js/lib/labo-shell.js).
// Une entrée par version qui touche au labo, la plus récente en haut. `ref` : « sujet-Lettre » (la lettre est celle de la variante,
// A étant l'actuelle). À chaque changement du labo : une entrée ici, avec `depuis` sur les variantes ajoutées ou changées (labo.js).
export const JOURNAL = [
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
