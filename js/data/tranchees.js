// Les ouvrages d'une tranchée de ligne : où sont les échelles pour en sortir (Jérôme, v0.87.1 : « ajouter les échelles pour sortir des tranchées »). Les mètres sont comptés depuis
// le début de chaque tronçon (25 m) ; l'échelle est contre la paroi du parapet, du côté de l'ennemi. Une seule source : le dessin (rendu/tranchee-modeles.js) la lit, et la règle
// de sortie, si on la construit, lirait la même.
export const TRANCHEE_OUVRAGES = {
  echelles: [9, 21],        // m depuis x0 du tronçon : deux échelles par tronçon, à 12 m l'une de l'autre
};
