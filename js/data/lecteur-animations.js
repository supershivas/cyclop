// Les nombres du lecteur d'animations (js/lecteur-animations.js).
// Fondu entre deux animations d'un même canal : sans lui, la pose saute au coup de feu (Jérôme, 8 nov. : « un fondu de ~0,2 s »).
export const FONDU = 0.2;

// Un homme qui tire en marchant (réponse A de docs/chantiers/animations-vers-le-jeu.md) : les bras et le fusil viennent de l'animation de tir ;
// les jambes ET le buste restent à la marche (Jérôme, 8 nov. : « buste de la marche »), donc le canal `corps` n'est pas dans la liste.
// À l'arrêt, le tir prend tous les canaux (pieds plantés).
export const CANAUX_TIR_EN_MARCHE = ['brasG', 'brasD', 'fusil', 'epaules'];       // (les épaules aussi, v0.141.2 : le buste cesse de tourner avec les pas pendant qu'il vise)

// Qui joue quoi dans le jeu (étape 4 : js/rendu/animation-jeu.js). Les noms sont ceux de js/data/animations.js.
export const ANIM_JEU = { marche: 'marche (fusil à deux mains)', repos: 'repos (fusil à deux mains)', tir: 'tir (1 s, pieds plantés)' };
export const MARCHE_JEU = {
  seuil: 0.05,       // m/s au-dessus duquel l'homme marche (en dessous : le repos ; évite que le bruit de la vitesse alterne marche et repos)
  reference: 1,      // m/s où la marche se lit à vitesse normale (0,8 s la foulée, comme la phase 8 rad/s d'avant)
  lectureMin: 0.5, lectureMax: 1.6,       // bornes de la vitesse de lecture (un homme lent ne fige pas, un homme qui court ne bat pas des ailes)
  // (v0.142.3, Jérôme : « après un bombardement, les soldats avancent sur les genoux ») l'homme qui a peur et se déplace court courbé : le buste penché, la tête relevée pour voir devant ;
  // accroupi seulement quand il ne bouge pas (avant, il glissait accroupi, les jambes immobiles)
  courbe: { vitesse: 0.3, buste: 0.5, tete: -0.3 },
  saut: 0.3,         // une montée de `tirVal` d'au moins cela d'une image à l'autre est un nouveau coup de feu (la retombée ne fait que 0,03 par image)
};

// Les démarches (Jérôme, 17 nov. : « des démarches plus réalistes : mouvement des épaules et des hanches, appui sur une jambe plus l'autre, fusil dans les deux mains ;
// chaque soldat a une démarche différente en fonction de sa graine ») : `nombre` allures générées au départ (js/anim-modeles.js, `allures`), chacune tirée de son rang
// dans les plages ci-dessous ; un homme prend celle de son numéro, et une cadence à lui (± `cadence` sur la vitesse de lecture). Toutes les valeurs sont des angles (rad)
// ou des mètres, comme les champs d'une pose (data/poses-soldat.js). `images` : les images clés d'une foulée (interpolées en ligne droite : des courbes « douces »
// arrêteraient la jambe à chaque image).
export const ALLURES = {
  nombre: 24, images: 12, cadence: 0.08,
  periode: [0.74, 0.94],        // s, une foulée (deux pas)
  foulee: [0.42, 0.62],         // l'amplitude de la hanche
  genou: [0.75, 1.05],          // la flexion du genou qui passe
  genouAppui: [0.04, 0.14],     // le genou d'appui, à peine plié quand le pied se pose
  asymetrie: 0.08,              // ± : une jambe fait un plus grand pas que l'autre (il préfère une jambe)
  buste: [0.03, 0.15],          // penché en avant (droit ou courbé sous le feu)
  tete: [-0.02, 0.12],          // la tête baissée
  rebond: [0.012, 0.03],        // le corps descend quand les jambes sont écartées, remonte quand il passe sur une jambe
  appui: [0.015, 0.04],         // le corps glisse au-dessus de la jambe qui porte
  roulis: [0.015, 0.05],        // le buste penche du même côté
  torsion: [0.04, 0.12],        // les épaules tournent contre les hanches (l'épaule droite avance avec la jambe gauche)
  // le fusil à deux mains : la pente, le lacet et la hauteur de la crosse autour de PORT_ARME (js/anim-modeles.js) ; des plages étroites, la main gauche doit rester sur le fût
  port: { flexion: [-0.76, -0.64], lacet: [0.25, 0.35], crosseY: [0.93, 0.98] },
  // au repos, le poids sur une jambe : la hanche qui glisse vers elle, l'autre genou un peu plié, les épaules qui compensent
  repos: { appui: [0.015, 0.045], hanche: [0.05, 0.15], genou: [0.12, 0.3], roulis: 0.02, torsion: 0.05 },
  // le repos vivant (Jérôme, 17 nov. : « des mouvements simples lorsque les soldats attendent dans les tranchées : balancement du corps, de la tête, des mains qui tiennent les fusils ») :
  // une boucle de `periode` secondes, à phase propre à chaque homme, en `images` images ; il respire (`souffle` : le buste, trois fois par boucle), se balance (`balance`, m), passe le poids
  // d'une jambe sur l'autre (une fois par boucle), baisse et relève la tête (`tete`), jette un coup d'œil d'un côté puis de l'autre (`regard` : le buste tourne, la tête avec), rajuste sa prise
  // (`prise` : la pente et le roulis du fusil, les mains le suivent) ; les amplitudes sont tirées dans ces plages pour chaque allure
  vivant: { periode: [6, 9], images: 16, souffle: [0.012, 0.025], balance: [0.006, 0.016], tete: [0.04, 0.12], regard: [0.1, 0.3], prise: [0.03, 0.09] },
};

// L'épaulement (Jérôme, 17 nov. : « des tirs avec épaulement depuis la marche ») : l'homme lève son fusil AVANT le coup (le compte à rebours de l'armée, `tirT`, se lit),
// pour que le recul de l'animation de tir (à `avance` secondes de son début) tombe avec l'éclair ; seulement s'il a tiré depuis moins de `engage` secondes (il est au feu).
// En marchant, il garde son cap de marche si sa cible est à moins de `vise` rad de lui (le buste tourne vers elle : la torsion) ; les silhouettes, qui n'ont pas de torsion,
// à moins de `viseSilhouette`. Les silhouettes : le fusil levé `tenue` secondes après le coup, puis baissé en `baisse` secondes.
// Le tir épaulé : l'épaule gauche avancée (`torsion` : de face, la main gauche n'atteignait pas le fût, 30 cm trop court), la crosse au creux de l'épaule droite (`crosse` : l'écart à l'épaule, en mètres),
// la pente du fusil (presque horizontale, le canon droit devant : le lacet défait la torsion), où se posent les mains le long du fusil (hauteur du modèle : 0,55 la crosse, 1,95 la bouche) ; `tete` : baissée sur la crosse ;
// le recul : le canon qui monte, la crosse qui recule, le buste qui part en arrière. Trouvé par un balayage : les deux mains à moins d'un millimètre du fusil (refait en v0.142.3, le buste penché enfin en avant).
// (La pose de tir d'avant faisait pivoter le fusil à 1,30 m de son pied : la crosse passait 75 cm derrière le dos, ce qui se voit de profil.)
export const TIR_EPAULE = { torsion: 0.25, crosse: [-0.13, -0.02, 0.1], flexion: -1.42, roulis: 0, mainDroite: 0.8, mainGauche: 0.95, tete: 0.14, buste: 0.12, reculFlexion: 0.12, reculZ: -0.04, reculBuste: -0.05 };
export const EPAULEMENT = { avance: 0.26, engage: 20, vise: 0.9, viseSilhouette: 0.5, tenue: 0.45, baisse: 0.3 };

// Les gestes d'attente (Jérôme, 17 nov. : « selon le temps », « le guetteur », « les petits gestes » ; au labo) : des boucles de repos, une par allure (js/anim-modeles.js, `reposGeste`), sur le repos vivant
// adouci (`vivant` : la part de ses amplitudes). Les fenêtres sont des fractions de la boucle (début, fin) ; `rampe` : la part de boucle pour entrer et sortir d'un geste.
// · froid : il tape des pieds par salves (`pieds` : la cadence en Hz, la hanche et le genou levés), se frotte les mains (`mains` : la main gauche quitte le fût pour la poignée, va et vient), la tête rentrée ;
// · pluie : la tête baissée, le dos rond ; · guetteur : il se redresse pour regarder au loin (`regard` : le balayage), puis se baisse à l'abri (`baisse` : les genoux pliés, rad) ;
// · gestes : il rajuste son casque de la main gauche, puis la porte à sa bouche (souffler dans ses doigts, tirer sur sa cigarette).
export const GESTES = {
  rampe: 0.05,
  // qui joue quoi dans le jeu (Jérôme, v0.144.1 : « je retiens ta proposition ») : un guetteur sur dix d'une tranchée de première ligne, le froid et la pluie selon le temps du jour, les petits gestes
  // pour un homme sur quatre (dans cet ordre ; les autres : le repos vivant) ; chaque geste est généré au premier besoin pour `allures` allures (froid : ~70 ms une fois)
  jeu: { guetteur: 0.1, gestes: 0.25, allures: 8, temps: { gel: 'froid', neige: 'froid', tempete: 'froid', pluie: 'pluie' } },
  froid: { duree: 8, images: 64, vivant: 0.5, tete: 0.25, buste: 0.12, pieds: { frequence: 1.5, hanche: 0.32, genou: 0.62, fenetres: [[0.06, 0.36], [0.58, 0.84]] }, mains: { frequence: 2.5, ampleur: 0.035, fenetres: [[0.38, 0.56], [0.86, 0.99]] } },
  pluie: { duree: 7, images: 16, vivant: 0.6, tete: 0.4, buste: 0.2 },
  guetteur: { duree: 9, images: 36, vivant: 0.3, debout: [0.04, 0.46], regard: 0.45, baisse: 0.75, teteDebout: -0.22, teteBas: 0.15, busteBas: 0.25 },
  gestes: { duree: 10, images: 40, vivant: 0.6, casque: [0.12, 0.32], bouche: [0.55, 0.78] },
};

// La mort (Jérôme, 17 nov. : « la mort et les morts » ; au labo) : la pose d'un mort, tirée de son numéro (js/anim-modeles.js, `poseMort`), et sa chute (`chute`).
// `cotes` : la part des morts sur le dos, le ventre, le flanc gauche, le flanc droit ; `bras` : la part des bras le long du corps, écartés, au-dessus de la tête (le reste) ; les jambes selon le côté
// (sur le dos le genou levé, le pied à plat ; sur le ventre le genou peu plié : sinon le pied se dresse) ; `haut` : aucune main ni aucun pied plus haut (m) ; `tenu` : la part qui serrent encore leur fusil, les autres l'ont lâché à côté d'eux (`fusilCote` : à quelle distance, en largeurs d'épaules ; sur le flanc, `fusilSol` le descend au sol) ;
// `essais` : les tirages refaits quand une main, un pied ou la tête passerait sous le sol. La chute : `duree` s ; les genoux cèdent (`genoux`, `descente`), le corps bascule et accélère.
export const MORTS = {
  cotes: [0.4, 0.3, 0.15, 0.15],
  bras: [0.4, 0.4],
  jambes: { dos: { hanche: [0, 0.5] }, ventre: { hanche: [-0.15, 0.15], genou: [0, 0.5] }, flanc: { hanche: [0, 1.1], genou: [0.2, 1.5] } },
  tete: 0.55, torsion: 0.45, buste: 0.2, ecarte: [1.25, 1.65], haut: 0.4,
  tenu: 0.25, fusilCote: [0.7, 1.3], fusilAngle: 0.5, fusilSol: 0.21,
  essais: 8,
  chute: { duree: 1.0, genoux: 0.9, descente: 0.12 },
};
