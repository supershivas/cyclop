// Le journal du labo : ce qui a changé, version par version, et où le voir (la page d'accueil du labo, js/lib/labo-shell.js).
// Une entrée par version qui touche au labo, la plus récente en haut. `ref` : « sujet-Lettre » (la lettre est celle de la variante,
// A étant l'actuelle). À chaque changement du labo : une entrée ici, avec `depuis` sur les variantes ajoutées ou changées (labo.js).
export const JOURNAL = [
  { version: '0.32.0', date: '2026-10-18', items: [
    { genre: 'nouveau', texte: 'Projections : un obus sur un régiment en marche ; les hommes du souffle sont jetés puis tués ou blessés, ceux de l\'anneau sont ralentis puis repartent ensemble (trois propositions)', ref: 'projections-B' },
    { genre: 'nouveau', texte: 'Visée d\'un obus : le cercle du souffle posé sur le champ, quatre types, pour les trois calibres', ref: 'visee-B' },
  ] },
  { version: '0.31.2', date: '2026-10-18', items: [
    { genre: 'mis-a-jour', texte: 'La bande de météo est retenue et passe en jeu, de la largeur des boutons du haut ; l\'ancien billet en quatre lignes passe en « ancienne »', ref: 'barre-temps-A' },
  ] },
  { version: '0.31.1', date: '2026-10-18', items: [
    { genre: 'nouveau', texte: 'Une page d\'accueil : ce qui a changé, où le voir, ce qui reste à trancher', ref: 'accueil' },
    { genre: 'mis-a-jour', texte: 'L\'écran d\'aujourd\'hui (billet, pertes, carte, cartes de régiment, batteries, carnet) ; les papiers avec la montre passent en « ancienne »', ref: 'plaques-A' },
    { genre: 'nouveau', texte: 'La caméra libre, vers l\'horizon', ref: 'camera-A' },
    { genre: 'mis-a-jour', texte: 'Les notes du champ de bataille : silhouettes allégées au zoom 4, même relief à tous les zooms', ref: 'champ-A' },
    { genre: 'mis-a-jour', texte: 'La palette compte ses tons et dit le vert kaki clair d\'en face', ref: 'palette-A' },
    { genre: 'mis-a-jour', texte: 'Dans chaque sujet, la variante en jeu est maintenant la A (soldats, cadavres, nuit, sol vert, attaque d\'une tranchée)', ref: 'soldats-A' },
  ] },
  { version: '0.31.0', date: '2026-10-18', items: [
    { genre: 'nouveau', texte: 'La barre du temps : cinq mises en page d\'une frise de la bataille', ref: 'barre-temps-C' },
  ] },
  { version: '0.28.0', date: '2026-10-17', items: [
    { genre: 'mis-a-jour', texte: 'Le soldat équipé aux bras qui balancent est retenu', ref: 'soldats-A' },
    { genre: 'mis-a-jour', texte: 'Les morts sont les soldats couchés, en poses variées', ref: 'cadavres-A' },
  ] },
  { version: '0.27.0', date: '2026-10-17', items: [
    { genre: 'nouveau', texte: 'Le sujet « Cadavres », et le soldat équipé', ref: 'cadavres-C' },
    { genre: 'mis-a-jour', texte: 'Les effets : fusils qui fument, fumée d\'obus qui reste et noircit', ref: 'effets-A' },
  ] },
  { version: '0.18.0', date: '2026-10-16', items: [
    { genre: 'mis-a-jour', texte: 'Les ouvrages des tranchées (traverses, fil de fer, portes d\'abri) dans « Le tronçon se lit »', ref: 'assaut-B' },
  ] },
  { version: '0.10.0', date: '2026-10-15', items: [
    { genre: 'mis-a-jour', texte: 'Des papiers de campagne et le carnet de bord remplacent les plaques toutes pareilles', ref: 'plaques-D' },
  ] },
  { version: '0.9.3', date: '2026-10-15', items: [
    { genre: 'mis-a-jour', texte: 'La nuit sans trame (voile et halos) et le sol en plaques de vert sont retenus', ref: 'nuit-A' },
  ] },
  { version: '0.9.2', date: '2026-10-15', items: [
    { genre: 'mis-a-jour', texte: 'Le feu se voit, le tronçon se lit : retenus', ref: 'assaut-A' },
  ] },
  { version: '0.3.1', date: '2026-10-14', items: [
    { genre: 'nouveau', texte: 'La caméra qui respire', ref: 'camera-B' },
  ] },
];
