// Le journal du labo : ce qui a changé, version par version, et où le voir (la page d'accueil du labo, js/lib/labo-shell.js).
// Une entrée par version qui touche au labo, la plus récente en haut. `ref` : « sujet-Lettre » (la lettre est celle de la variante,
// A étant l'actuelle). À chaque changement du labo : une entrée ici, avec `depuis` sur les variantes ajoutées ou changées (labo.js).
export const JOURNAL = [
  { version: '0.41.1', date: '2026-10-21', items: [
    { genre: 'mis-a-jour', texte: 'Le nom d\'un régiment : « Le cartouche » est retenu et passe en jeu (A), avec un carré orange quand le régiment est ébranlé et rouge quand il est en déroute ; la ligne d\'avant passe en « ancienne »', ref: 'nom-regiment-A' },
    { genre: 'mis-a-jour', texte: 'Les toasts : « Sous le duel » est retenu et passe en jeu (A), un liseré et un petit mot par genre (information, ordre refusé, attention)', ref: 'toasts-A' },
    { genre: 'mis-a-jour', texte: 'La carte d\'ordre : « Fond hachuré » est retenu et passe en jeu (A) : hauteur fixe, barre toujours au même endroit, « ! » orange ou « !! » rouge hors du flux, hachures plus légères quand le régiment ébranlé est choisi', ref: 'carte-ordre-A' },
    { genre: 'mis-a-jour', texte: 'Le clic sur un bouton : « Le rebond » est retenu et passe en jeu (A) ; Un ordre sur un secteur : « Le fanion et la réponse des hommes » est une nouvelle variante A, en jeu ; Le coup d\'obus : « L\'impact en trois temps » est retenu et passe en jeu (A)', ref: 'clic-bouton-A' },
  ] },
  { version: '0.41.0', date: '2026-10-21', items: [
    { genre: 'nouveau', texte: 'Le nom d\'un régiment sur le champ : quatre propositions (trois étages, le cartouche, la pastille, le fanion) contre la ligne d\'aujourd\'hui, avec le nom en h1, le statut en h2 et une vraie cible de clic', ref: 'nom-regiment-C' },
    { genre: 'nouveau', texte: 'Les toasts : sous le duel, la pile du bord, dans le carnet de bord, à l\'objet, contre la languette qui recouvre la rangée des cartes', ref: 'toasts-A' },
    { genre: 'nouveau', texte: 'La carte d\'ordre de la rangée : quatre cartes à hauteur fixe (barre toujours au même endroit, « ! » hors du flux, un fond différent pour un régiment ébranlé) contre la carte d\'aujourd\'hui', ref: 'carte-ordre-C' },
    { genre: 'mis-a-jour', texte: 'Un point vert, rouge ou orange devant chaque sujet et chaque groupe ; les propositions des sujets de satisfaction (v0.40.1) sont marquées « à trancher »', ref: 'accueil' },
  ] },
  { version: '0.40.1', date: '2026-10-20', items: [
    { genre: 'nouveau', texte: 'Le clic sur un bouton : cinq façons de le sentir (le rebond, le tampon, l\'onde, le cran, le maintien), contre le bouton sans retour d\'aujourd\'hui', ref: 'clic-bouton-C' },
    { genre: 'nouveau', texte: 'Un ordre sur un secteur : cinq retours quand un régiment reçoit son ordre (le fanion planté, l\'onde du secteur, la réponse des hommes, la bannière, le réticule), sur le vrai moteur', ref: 'ordre-secteur-C' },
    { genre: 'nouveau', texte: 'Le coup d\'obus : cinq façons de le sentir (la trajectoire, l\'impact en trois temps, l\'onde de choc qui fait trembler le champ, la terre qui retombe, le gel d\'image), pour les trois calibres', ref: 'coup-obus-B' },
  ] },
  { version: '0.38.2', date: '2026-10-20', items: [
    { genre: 'nouveau', texte: 'Les caisses de ravitaillement : une caisse descend sous un parachute, les deux camps courent vers elle (une version piégée)', ref: 'caisses-A' },
    { genre: 'nouveau', texte: 'Les obus ratés : un obus sur trois ne part pas ; il gît (avec un cercle), il fume, ou il éclate plus tard', ref: 'obus-rates-A' },
    { genre: 'nouveau', texte: 'Les sapes et les mines : une galerie sous le no man\'s land, entendue ou non, une charge de neuf 220, et un cratère qui se remplit sous la pluie', ref: 'sapes-A' },
    { genre: 'nouveau', texte: 'Les gaz : un nuage qui dérive avec le vent, ou qui coule dans les creux ; les masques', ref: 'gaz-A' },
    { genre: 'nouveau', texte: 'Les chars d\'assaut : un losange en volumes qui précède l\'infanterie, ou qui s\'enlise dans les cratères', ref: 'chars-A' },
  ] },
  { version: '0.36.4', date: '2026-10-19', items: [
    { genre: 'mis-a-jour', texte: 'Le papier de campagne « Le registre » est retenu et passe en jeu (A), posé sur le champ à la fin de chaque bataille de campagne ; les cartes en rangée, la lettre et sur la carte restent au labo, non retenues', ref: 'campagne-A' },
  ] },
  { version: '0.36.3', date: '2026-10-19', items: [
    { genre: 'nouveau', texte: 'Le papier de campagne : quatre façons de dire, entre deux batailles, ce qui reste de la bataille finie, ce que sera chaque régiment (vétérans, recrues, qui le commande) et où sont passés les hommes des régiments dissous (le registre, les cartes en rangée, la lettre, sur la carte)', ref: 'campagne-A' },
  ] },
  { version: '0.34.6', date: '2026-10-18', items: [
    { genre: 'mis-a-jour', texte: 'La fenêtre d\'ordres « Le rabat » est retenue : posée au-dessus de la carte du régiment, elle se relève d\'un coup ; « Au régiment » passe en « ancienne »', ref: 'fenetre-ordres-A' },
  ] },
  { version: '0.34.1', date: '2026-10-18', items: [
    { genre: 'mis-a-jour', texte: 'La fenêtre d\'ordres se pose juste au-dessus de la boîte du nom du régiment, au plus près de lui', ref: 'fenetre-ordres-A' },
  ] },
  { version: '0.34.0', date: '2026-10-18', items: [
    { genre: 'mis-a-jour', texte: 'La fenêtre d\'ordres « Au régiment » est retenue et passe en jeu (A) ; elle apparaissait d\'un coup au-dessus de la carte (ancienne)', ref: 'fenetre-ordres-A' },
  ] },
  { version: '0.33.0', date: '2026-10-18', items: [
    { genre: 'mis-a-jour', texte: 'La barre de vie « Le duel », les équerres au clic sur un régiment et le faux terrain dans la nuit sont retenus et passent en jeu (A) ; les anciens (papier des pertes, sonar, bord coupé net) passent en « ancienne »', ref: 'barre-vie-A' },
    { genre: 'nouveau', texte: 'La fenêtre d\'ordres : cinq façons de l\'ouvrir quand on clique un régiment (tiroir, rabat, une seule feuille, au régiment, ligne à ligne)', ref: 'fenetre-ordres-B' },
  ] },
  { version: '0.32.3', date: '2026-10-18', items: [
    { genre: 'mis-a-jour', texte: 'La visée d\'un obus « cibles concentriques » est retenue et passe en jeu ; l\'ancien carré est en « ancienne »', ref: 'visee-A' },
    { genre: 'mis-a-jour', texte: 'Projections : le jeu ne fait plus sauter les survivants du souffle (soit projetés, soit ralentis, jamais de saut)', ref: 'projections-A' },
  ] },
  { version: '0.32.2', date: '2026-10-18', items: [
    { genre: 'nouveau', texte: 'La barre de vie : quatre façons de dire les pertes comme un jeu de combat, une barre de chaque côté, sans chiffre (au survol d\'un segment), et la barre des tronçons tenus dessous', ref: 'barre-vie-A' },
    { genre: 'nouveau', texte: 'Le clic sur un régiment : quatre animations ; le sonar est en jeu, avec la caméra qui glisse sur le régiment', ref: 'clic-regiment-A' },
    { genre: 'nouveau', texte: 'Le bord de la carte : cinq façons d\'éviter le terrain coupé net (brouillard noir, brume, faux terrain, faux terrain dans la nuit, papier)', ref: 'bord-carte-A' },
  ] },
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
