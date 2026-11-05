// Labo lumière : les nombres et les textes (section 12 : le contenu est de la donnée, la règle est du code).
// Tout ce qui se règle, se mesure ou se compare vit ici ; terrain.js, lumiere.js, foule.js et rendu.js ne connaissent aucun nom.

// Le monde : 256 × 160 m, des chunks de 16 m. Une « grille » est un nombre de cases par mètre : 1 (cube de 1 m) ou 2 (cube de 50 cm).
// Les hauteurs sont des entiers en quarts de cube : un cube entier = 4, un demi-cube = 2, un quart = 1.
export const MONDE = {
  largeurM: 256, profondeurM: 160, chunkM: 16,
  quartsParCube: 4,
  graine: 7,
  tranchees: { niveaux: 4, largeurM: 2.2, profondeurQ: 8, boyauM: 1.6, abrisParLigne: 2, abrisLongM: 11 },
  vegetation: { souches: 110, buissons: 160, bois: 6 },
  obusInitiaux: 230,
  foule: { max: 50000, defaut: 8000, vague: { periodeS: 26, avanceS: 8, retardParRangS: 1.4 } },
};

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
  { id: 6, cle: 'flash', nom: 'Lumières temporaires', desc: 'le flash d\'un obus éclaire le terrain autour', budget: { chunkMs: 0, globalMs: 0, gpuMs: 0.6 } },
  { id: 7, cle: 'meteo', nom: 'Météo', desc: 'boue sombre et brillante, flaques, ciel du jour de bataille', budget: { chunkMs: 0.3, globalMs: 20, gpuMs: 0.5 } },
  { id: 8, cle: 'ssao', nom: 'AO écran', desc: 'contacts fins : corps, débris, rebords', budget: { chunkMs: 0, globalMs: 0, gpuMs: 2.0 } },
];
export const BUDGET_IMAGE_MS = 16.7;       // 60 images par seconde
export const BUDGET_RECALCUL_CHUNK_MS = 2; // tout le recalcul local après un obus, étapes confondues

// Les niveaux de qualité. `etapes` : ce qui est actif au départ ; `cpm` : cases par mètre ; `rayonAO`, `porteeOmbre` en mètres.
export const QUALITES = {
  bas: { nom: 'Bas', etapes: [1, 2, 3], cpm: 1, rayonAO: 4, porteeOmbre: 12, directionsAO: 8, brume: 'simple', ssaoEchantillons: 0, debris: 24 },
  moyen: { nom: 'Moyen', etapes: [1, 2, 3, 4, 5, 6], cpm: 1, rayonAO: 6, porteeOmbre: 16, directionsAO: 8, brume: 'complete', ssaoEchantillons: 0, debris: 48 },
  haut: { nom: 'Haut', etapes: [1, 2, 3, 4, 5, 6, 7, 8], cpm: 2, rayonAO: 8, porteeOmbre: 16, directionsAO: 8, brume: 'complete', ssaoEchantillons: 12, debris: 90 },
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
// Les vrais soldats du jeu (js/rendu/soldat-articule.js) : les `max` hommes les plus proches du point visé, dès `pxmMoyen` pixels par mètre ; le modèle fin dès `pxmFin`
export const SOLDATS_REELS = { max: 150, pxmMoyen: 9, pxmFin: 20 };

// Le ciel et le soleil : ils ne tirent leurs couleurs que de la palette du jeu (js/palette.js), mélangées en continu.
export const SOLEIL = {
  leverH: 5.5, coucherH: 19.5, hauteurMaxDeg: 34, hauteurMinDeg: 4,
  azimutDeg: 112,           // le soleil se lève à gauche et se couche à droite (Jérôme, v0.68.1) ; 0 = derrière la caméra
  joursMax: 10,
};

export const CAMERA = {
  fovDeg: 30, proche: 1, loin: 1400,
  presets: {
    large: { nom: 'Vue large', distance: 330, tangage: 0.95, lacet: 0.15 },
    tranchee: { nom: 'Vue tranchée', distance: 46, tangage: 0.72, lacet: -0.45 },
    cratere: { nom: 'Vue cratère', distance: 19, tangage: 0.82, lacet: 0.3 },
  },
};

export const ATMOSPHERE = {
  fondu: { simple: 0.0016, complete: 0.0022 },     // le fondu avec la distance (toujours là)
  brumeSol: { densite: 0.045, chute: 0.16 },        // la brume au sol (étape 5) : densité, décroissance avec la hauteur
  fumee: { duree: [6, 11], taille: [2.2, 4.6] },
};

export const FLASH = { dureeS: 0.75, rayonM: 34, intensite: 3.2, max: 8 };
