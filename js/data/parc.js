// Les engins du parc et de l'aérodrome (Jérôme, v0.130.0 : « les avions et les chars vraiment disponibles sont visibles, plus de faux engins de décor »). Les places sont celles du modèle (`BATIR` de rendu/camp-modeles.js)
// et de la logique (`placesAvions`, `placesChars` de camp.js) : une seule source. Coordonnées locales du bâtiment (centre en 0, 0 ; l'avant à −z), tournées d'un demi-tour chez l'adversaire.
export const PARC = {
  avions: [[-32, -5, 0], [20, 4, 0.1], [-19, -5, 0], [-6, -5, 0], [34, 4, -0.1]],      // [x, z, cap] de la cellule k de l'escadrille (3, 4 ou 5 selon le niveau de l'aérodrome)
  capaciteAvions: [0, 3, 4, 5],                                                        // par niveau (comme `avions` de BATIMENTS.aerodrome.niveaux)
  chars: { z: -10, pas: 6.4, depart: [0, 0, 4.8, 9.6], capacite: [0, 2, 3, 4] },       // la 1re place (la plus près de la sortie) puis une place tous les `pas` m ; par niveau (comme `chars`)
  portee: 6,                                                                           // m : un clic à cette distance d'un engin du parc le désigne
};
