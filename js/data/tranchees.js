// Les ouvrages d'une tranchée de ligne : où sont les échelles pour en sortir (Jérôme, v0.88.1 : « ajouter les échelles pour sortir des tranchées »). Les mètres sont comptés depuis
// le début de chaque tronçon (25 m) ; l'échelle est contre la paroi du parapet, du côté de l'ennemi. Une seule source : le dessin (rendu/tranchee-modeles.js) la lit, et la règle
// de sortie, si on la construit, lirait la même.
export const TRANCHEE_OUVRAGES = {
  echelles: [9, 21],        // m depuis x0 du tronçon : deux échelles par tronçon, à 12 m l'une de l'autre
  // la règle de sortie (Jérôme, v0.89.0 : « une règle : on sort vite à l'échelle ») : une carte d'octets `T.echelle`, refaite avec les tranchées (rien dans la sauvegarde)
  echelle: {
    coeur: 1,               // colonnes de chaque côté de l'échelle : au pied d'une échelle, sur 3 m de large, on monte et on descend sans que la paroi ralentisse
  },
};
