// Labo lumière : les nombres et les textes (section 12 : le contenu est de la donnée, la règle est du code).
// Tout ce qui se règle, se mesure ou se compare vit ici ; terrain.js, lumiere.js, foule.js et rendu.js ne connaissent aucun nom.

// Le monde : 256 × 160 m, des chunks de 16 m. Une « grille » est un nombre de cases par mètre : 1 (cube de 1 m) ou 2 (cube de 50 cm).
// Les hauteurs sont des entiers en quarts de cube : un cube entier = 4, un demi-cube = 2, un quart = 1.
export const MONDE = {
  largeurM: 512, profondeurM: 320, chunkM: 16,       // la carte par défaut (4 fois l'aire d'avant) ; `TAILLES` : les trois choix
  colline: { x: 0.74, z: 0.5, rayonM: 46, hauteurM: 16 },
  lac: { x: 0.27, z: 0.5, rayonM: 30, profondeurQ: 12 },      // un lac dans le no man's land, à l'ouest (fractions de la carte, mètres ; le fond est `profondeurQ` quarts sous le niveau moyen)     // une colline dans le no man's land (en fractions de la carte, en mètres)
  quartsParCube: 4,
  graine: 7,
  tranchees: { niveaux: 4, largeurM: 2.2, profondeurQ: 8, boyauM: 1.6, abrisParLigne: 2, abrisLongM: 11 },
  vegetation: { souches: 110, buissons: 160, bois: 6 },
  obusInitiaux: 230,
  foule: { max: 50000, defaut: 8000, flanage: { vitesse: 0.12, tauS: 1.6 }, vague: { periodeS: 26, avanceS: 8, retardParRangS: 1.4 } },
};

// Les tailles de carte au choix (réglages) ; au-delà de `COLONNES_MAX` colonnes, la grille revient à 1 case par mètre
export const TAILLES = { moyenne: { nom: 'Moyenne (256 × 160 m)', largeurM: 256, profondeurM: 160 }, grande: { nom: 'Grande (512 × 320 m)', largeurM: 512, profondeurM: 320 }, immense: { nom: 'Immense (768 × 480 m)', largeurM: 768, profondeurM: 480 } };
export const COLONNES_MAX = 700000;

// L'obus (Jérôme : un cube entier, quatre demi-cubes, quatre quarts de cube). Quarts retirés, sur une grille de 3 × 3 « super-cases ».
export const MOTIF_OBUS = [[1, 2, 1], [2, 4, 2], [1, 2, 1]];
export const BARRAGE = { obus: 60, dureeS: 3.0, rayonM: 26 };

// Les étapes de lumière. `budget` : au-delà, le panneau le dit en rouge (jamais masqué).
// chunkMs : le recalcul local après un obus (chunk touché + voisins) ; globalMs : le calcul de toute la carte (chargement, changement d'heure) ; gpuMs : le coût par image.
export const ETAPES = [
  { id: 1, cle: 'directe', nom: 'Lumière directe', desc: 'soleil bas, ombres portées du relief', budget: { chunkMs: 0.6, globalMs: 40, gpuMs: 0.4 } },
  { id: 2, cle: 'ao', nom: 'AO par voxel', desc: 'creux, tranchées, cratères plus sombres', budget: { chunkMs: 0.8, globalMs: 120, gpuMs: 0.2 } },
  { id: 3, cle: 'local', nom: 'Mise à jour locale', desc: 'un obus ne recalcule que son chunk et ses voisins', budget: { chunkMs: 2.0, globalMs: 0, gpuMs: 0 } },
  { id: 4, cle: 'propagee', nom: 'Lumière propagée', desc: 'flood fill : abris et tranchées couvertes sombres', budget: { chunkMs: 0.5, globalMs: 30, gpuMs: 0.1 } },
  { id: 5, cle: 'atmosphere', nom: 'Atmosphère', desc: 'brume au sol, fumée et poussière d\'obus', budget: { chunkMs: 0, globalMs: 0, gpuMs: 1.2 } },
  { id: 6, cle: 'flash', nom: 'Lumières temporaires', desc: 'flash des obus, lanternes des tranchées, lampes portées', budget: { chunkMs: 0, globalMs: 0, gpuMs: 0.6 } },
  { id: 7, cle: 'meteo', nom: 'Météo', desc: 'boue sombre et brillante, flaques, ciel du jour de bataille', budget: { chunkMs: 0.3, globalMs: 20, gpuMs: 0.5 } },
  { id: 8, cle: 'ssao', nom: 'AO écran', desc: 'contacts fins : corps, débris, rebords', budget: { chunkMs: 0, globalMs: 0, gpuMs: 2.0 } },
  { id: 9, cle: 'ombres', nom: 'Ombres portées', desc: 'carte d\'ombre : soldats, arbres, chars, avions ; la fumée projette une ombre qui s\'éclaircit', budget: { chunkMs: 0, globalMs: 0, gpuMs: 1.5 } },
];
export const BUDGET_IMAGE_MS = 16.7;       // 60 images par seconde
export const BUDGET_RECALCUL_CHUNK_MS = 2; // tout le recalcul local après un obus, étapes confondues

// Les niveaux de qualité. `etapes` : ce qui est actif au départ ; `cpm` : cases par mètre ; `rayonAO`, `porteeOmbre` en mètres.
export const QUALITES = {
  bas: { nom: 'Bas', etapes: [1, 2, 3], cpm: 1, rayonAO: 4, porteeOmbre: 12, directionsAO: 8, brume: 'simple', ssaoEchantillons: 0, debris: 24, ombreTaille: 0 },
  moyen: { nom: 'Moyen', etapes: [1, 2, 3, 4, 5, 6, 9], cpm: 1, rayonAO: 6, porteeOmbre: 16, directionsAO: 8, brume: 'complete', ssaoEchantillons: 0, debris: 48, ombreTaille: 1024 },
  haut: { nom: 'Haut', etapes: [1, 2, 3, 4, 5, 6, 7, 8, 9], cpm: 2, rayonAO: 8, porteeOmbre: 16, directionsAO: 8, brume: 'complete', ssaoEchantillons: 12, debris: 90, ombreTaille: 2048 },
};

// Résolution de l'image : celle du jeu (≈ 400 pixels de haut, agrandie sans lissage), ou plus fine.
export const RESOLUTIONS = {
  jeu: { nom: 'Jeu (≈ 400 px de haut)', hauteur: 400 },
  fine: { nom: 'Fine (≈ 800 px)', hauteur: 800 },
  native: { nom: 'Native', hauteur: 0 },
};

// Une météo = des nombres de 0 à 1 que l'on peut mélanger en continu (la météo évolue : `melangerMeteo` de ciel.js) :
// humidite (boue et flaques), pluie, neige, brouillard, voile (la couverture des nuages), soleil (ce qui passe des rayons), vent (m/s)
export const METEOS = {
  sec: { nom: 'Sec', humidite: 0, pluie: 0, neige: 0, brouillard: 0, voile: 0.3, soleil: 1.0, vent: 2 },
  pluie: { nom: 'Pluie', humidite: 0.6, pluie: 1, neige: 0, brouillard: 0.15, voile: 0.8, soleil: 0.3, vent: 6 },
  boue: { nom: 'Boue', humidite: 1, pluie: 0.2, neige: 0, brouillard: 0.1, voile: 0.5, soleil: 0.6, vent: 3 },
  brouillard: { nom: 'Brouillard', humidite: 0.35, pluie: 0, neige: 0, brouillard: 1, voile: 0.7, soleil: 0.35, vent: 0.5 },
  neige: { nom: 'Neige', humidite: 0.1, pluie: 0, neige: 1, brouillard: 0.18, voile: 0.85, soleil: 0.3, vent: 4 },
};
// La météo qui évolue : tous les `tenueS` secondes de jeu, le temps vers lequel elle glisse change (hasard à graine) ; `vitesse` : la part de l'écart rattrapée par seconde
export const METEO_AUTO = { tenueS: [22, 40], vitesse: 0.12, suite: { sec: ['sec', 'boue', 'brouillard', 'pluie'], boue: ['sec', 'pluie', 'brouillard'], pluie: ['boue', 'pluie', 'neige', 'brouillard'], brouillard: ['sec', 'boue', 'pluie'], neige: ['neige', 'brouillard', 'sec'] } };
// Les nuages : un champ de bruit sur un plan à `hauteurM` ; la même fonction fait le ciel et les ombres au sol (le nuage et son ombre s'accordent)
export const NUAGES = { hauteurM: 420, echelleM: 140, derive: 0.9 };
// Le faux terrain autour de la carte : un sol qui se prolonge jusqu'à l'horizon (calculé à l'écran, sans maillage)
export const HORS_CARTE = { echelleM: 38, relief: 0.8, fonduM: 1800 };
// Les vrais soldats du jeu, avec l'échelle de détail du jeu lui-même (rendu/soldats.js) : le point (le jeu aux zooms 1 et 2), la boîte, la silhouette allégée (dès 4 px/m), le soldat équipé
// (dès 6) et l'articulé, un squelette et un visage (dès 12 : les `maxArticule` plus proches ; le modèle fin dès 24). Les seuils sont en pixels par mètre à l'endroit de chaque homme.
export const SOLDATS_REELS = { pxmBoite: 2.5, pxmLegere: 4, pxmEquipe: 6, pxmArticule: 12, pxmFin: 24, maxArticule: 250, maxEquipe: 4000, maxLegere: 14000,
  hysteresis: { bas: 0.88, haut: 1.12, priorite: 0.85 },        // un homme garde son niveau de détail tant que ses pixels par mètre restent à 12 % du seuil (et il passe avant les autres pour une place : plus de va-et-vient)
  marche: { demarre: 0.6, arrete: 0.3 } };                      // un homme se met à marcher au-dessus de 0,6 m/s et s'arrête au-dessous de 0,3 m/s (le flânage de la foule reste loin dessous)

// Le ciel et le soleil : ils ne tirent leurs couleurs que de la palette du jeu (js/palette.js), mélangées en continu.
export const SOLEIL = {
  leverH: 5.5, coucherH: 19.5, hauteurMaxDeg: 34, hauteurMinDeg: 4,
  azimutDeg: 112,           // le soleil se lève à gauche et se couche à droite (Jérôme, v0.68.1) ; 0 = derrière la caméra
  joursMax: 10,
};

export const CAMERA = {
  fovDeg: 30, proche: 1, loin: 3500,
  presets: {
    large: { nom: 'Vue large', distance: 330, tangage: 0.95, lacet: 0.15 },
    tranchee: { nom: 'Vue tranchée', distance: 46, tangage: 0.72, lacet: -0.45 },
    cratere: { nom: 'Vue cratère', distance: 19, tangage: 0.82, lacet: 0.3 },
    colline: { nom: 'Vue colline', distance: 150, tangage: 0.55, lacet: -0.55 },
    lac: { nom: 'Vue lac', distance: 75, tangage: 0.22, lacet: 0.35 },
    engins: { nom: 'Vue engins', distance: 70, tangage: 0.6, lacet: 0.5 },
  },
};

export const ATMOSPHERE = {
  fondu: { simple: 0.0016, complete: 0.0022 },     // le fondu avec la distance (toujours là)
  brumeSol: { densite: 0.045, chute: 0.16 },        // la brume au sol (étape 5) : densité, décroissance avec la hauteur
  fumee: { duree: [6, 11], taille: [2.2, 4.6] },
};

// Les sources de lumière fixes et portées : des lanternes accrochées dans les tranchées (et dans les abris), des lampes que portent certains soldats.
// `pasM` : une lanterne tous les tant de mètres le long de chaque ligne ; `force` 1 = un éclairage plein à bout portant ; la lumière est cachée par le relief (une lanterne de tranchée n'éclaire pas la plaine derrière le parapet).
export const LAMPES = {
  tranchees: { pasM: 17, force: 1.25, rayonM: 12, hauteurM: 1.9, abri: { hauteurM: 1.1, force: 1.5, rayonM: 9 } },
  soldats: { un_sur: 41, max: 48, rayonActifM: 110, force: 0.9, rayonM: 8, hauteurM: 1.4 },
  couleur: [1.0, 0.62, 0.28],       // une flamme : l'os qui tire sur l'orange d'alerte (ciel.js la recalcule de la palette)
};
export const FLASH = { dureeS: 0.75, rayonM: 34, intensite: 3.2, max: 8 };

// La carte d'ombre (étape 9) : une projection orthogonale le long du soleil sur le rectangle de sol vu. `hautCasteurM` : la hauteur des plus hauts objets qui projettent (un avion) ;
// `pas` : l'étendue de la carte ne prend que des valeurs en progression géométrique (le cadre ne « nage » pas quand on bouge la vue) ; `biaisTexels` : décalage le long de la normale, en texels ;
// `extinctionFumee` : l'épaisseur optique d'une bouffée de fumée à plein (plus c'est grand, plus l'ombre est noire) ; `soleilMinRad` : au-dessous, pas de carte (le soleil rase, les ombres seraient infinies).
export const OMBRES = { hautCasteurM: 60, pas: 1.12, biaisTexels: 1.6, extinctionFumee: 2.2, soleilMinRad: 0.05, maxEtendueM: 1400, couleurMinimale: 0 };

// Les engins (chars et biplans) du labo : de quoi projeter des ombres sans reprendre les modèles du jeu (ils viennent à la session 3). Nombres : combien, vitesse (m/s), altitude (m), rayon du cercle (m).
export const ENGINS = { chars: 5, avions: 4, vitesseChar: 1.3, vitesseAvion: 24, altitudeAvion: [26, 52], rayonCercle: [70, 150] };

// Le ciel v2 : un dégradé « physique » (l'épaisseur d'air traversée donne le zénith, l'horizon et le rougissement), un soleil avec sa lueur (diffusion avant de Mie), deux couches de nuages éclairés.
// Aucune couleur nouvelle : les ancres sont celles de la palette (ciel.js), seule la FORME du ciel est calculée.
export const CIEL = { masseAir: 0.13, mieG: 0.78, mieForce: 0.32, lueurSoleil: 0.55, disqueSoleil: [0.9996, 0.99985], rougeurHorizon: 0.62, cirrusHauteurM: 1500, cirrusEchelleM: 520, cirrusForce: 0.55, eclairageNuage: 52 };
// Le travail de l'AO de toute la carte, réparti sur plusieurs images (étape 2) : millisecondes par image, puis rangées de colonnes par pas ; le maillage (AO des arêtes) suit, quelques chunks par image.
export const REPARTITION = { msParImage: 3, rangeesDepart: 2, chunksMax: 2 };
// Le banc de mesure : des lots d'images dont la durée dépasse `fenetreMs` (et 40 fois la résolution de l'horloge : Firefox arrondit à 1 ms, ou à 100 ms avec la protection de la vie privée), pris par la médiane.
export const BANC = { fenetreMs: 60, lots: 5, lotsLents: 3, imagesMax: 400, lentMs: 120 };
