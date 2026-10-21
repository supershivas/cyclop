// Le mitraillage aérien (Jérôme, v0.46.0 ; maquette « Les avions », variante retenue du labo) : une batterie de plus, sur le chemin des barrages
// (touche 4, clic sur le sol). Un avion passe en ligne sur la zone visée : une bande de `largeur` m sur `longueur` m, le long de l'axe nord-sud
// (perpendiculaire au front), à `hauteur` m du sol (le dessin). Chaque homme de la bande est touché avec la chance `letal` (abri des creux et
// tranchées en plus), les autres sont effrayés. Les nombres sont des propositions, mesurés par scripts/mesure-mitraillage.mjs.
export const AVION = 'avion';
export const MITRAILLAGE = {
  largeur: 12, longueur: 60, hauteur: 10,
  recharge: 90,          // s : plus long que les obus (40, 70, 110 pour un barrage de 6 à 24 coups)
  delai: 3,              // s entre l'ordre et le passage, au moins (l'avion vient de loin : voir `vitesse`)
  vitesse: 45,           // m/s : il entre par le bord du terrain (à `sortie` m au-delà) et traverse la carte du sud au nord (nous) ou du nord au sud (eux), Jérôme, v0.48.1
  sortie: 60,            // m au-delà du bord où il naît et où il disparaît
  letal: 0.35,           // chance de toucher un homme debout dans la bande
  gravite: 0.5,          // chance qu'un touché meure (sinon blessé), comme un obus au bord de son rayon
  peur: 0.6,             // la peur des hommes de la bande qui ne sont pas touchés
  rayonPeur: 16,         // les voisins de la bande sont effrayés aussi, moins
};
