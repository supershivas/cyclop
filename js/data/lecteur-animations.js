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
