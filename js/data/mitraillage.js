// Le mitraillage aérien (Jérôme, v0.46.0 ; maquette « Les avions », variante retenue du labo) : une batterie de plus, sur le chemin des barrages
// (touche 4, deux clics sur le sol : le début et la fin de la passe, v0.56.0). Un avion vole en ligne sur la bande visée : `largeur` m de large, de A à B.
// Il vient de hors de la carte, vole à `croisiere` m et descend à `passe` m avant la bande, qu'il balaie au fil de son vol (v0.55.0).
// Les nombres sont des propositions, mesurés par scripts/mesure-mitraillage.mjs.
export const AVION = 'avion';
export const MITRAILLAGE = {
  largeur: 12,
  longueurMin: 30, longueurMax: 150,   // m : la passe qu'on trace (le second clic est ramené à `longueurMax`)
  defaut: 60,                          // m : la passe d'un ordre sans second point (le mode debug, l'ancienne bande nord-sud)
  croisiere: 55, passe: 12,            // m d'altitude : en route, puis en train de tirer (v0.55.0 : « stable, puis il descend à l'approche des lignes adverses »)
  descente: 140,                       // m avant la bande où il commence à descendre
  remontee: 70,                        // m après la bande où il reprend de la hauteur
  avance: 22,                          // m : ses balles tombent devant lui (il tire en piqué), pas sous lui
  recharge: 90,                        // s : plus long que les obus (40, 70, 110 pour un barrage de 6 à 24 coups)
  vitesse: 40,                         // m/s : il entre par le bord du terrain (à `sortie` m au-delà) sur le prolongement de la passe, et sort de même
  sortie: 60,                          // m au-delà du bord où il naît et où il disparaît
  letal: 0.7,                          // chance de toucher un homme debout dans la bande (0,35 avant la v0.73.1 : Jérôme, « plus meurtrier »)
  gravite: 0.75,                       // chance qu'un touché meure (sinon blessé) (0,5 avant la v0.73.1)
  labour: { calibre: '75', parCreux: 12 },   // m² de bande par creux de 75 que ses balles laissent (v0.73.1)
  peur: 0.6,                           // la peur des hommes de la bande qui ne sont pas touchés
  rayonPeur: 16,                       // les voisins de la bande sont effrayés aussi, moins
  peurVoisins: 0.05,                   // par pas, au point où tombent ses balles
  // Les dégâts reçus (v0.57.0) : l'avion a des points de vie ; chaque seconde passée au-dessus d'hommes qui tirent en l'air lui en coûte
  pv: 100,
  flotte: 3,                           // avions par camp
  exposition: { rayon: 30, parHomme: 0.06, plafond: 45, bas: 0.3, retenu: 0.5, bas_retenu: 20 },   // pv/s ; `bas` : la part qu'il prend en croisière (1 à `passe`) ; `retenu` : la part du feu retenu, seulement sous `bas_retenu` m
  reparation: 60,                      // pv rendus à chaque avion qui rentre, par nuit
  chute: { vitesse: 0.8, gravite: 14, rayon: 5, letal: 0.7 },   // abattu : il glisse (× sa vitesse), tombe, et écrase ceux du point de chute
  cloue: ['brouillard', 'tempete'],    // les météos où l'on ne vole pas
};
