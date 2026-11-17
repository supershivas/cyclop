// Le tir du joueur dans la vue d'un soldat (Jérôme, v0.147.0) : les nombres. Un fusil Lebel à verrou : un coup toutes les 1,6 s ; la balle suit le regard (le sens et la hauteur) et touche le premier homme d'en face
// que le rayon traverse, si le relief ne l'arrête pas ; la chance de toucher dit l'adresse du tireur, la distance, sa peur et ses bras fatigués.
export const TIR_JOUEUR = {
  periode: 1.6,        // s entre deux coups
  portee: 160,         // m : au-delà la balle ne touche plus
  oeil: 1.6,           // m : la hauteur de l'œil au-dessus de ses pieds (le départ du rayon)
  banquette: 0.6,      // m : dans une tranchée l'homme est monté sur la banquette de tir : son œil est plus haut d'autant (sans elle le parapet lui cache tout)
  haut: 1.7,           // m : la taille d'un homme debout (tapi par la peur : `tapi`)
  tapi: 1.0,
  rayon: 0.3,          // m : la demi-largeur d'un homme pour le rayon
  base: 0.85,          // la chance de toucher un homme dans le rayon, tout près, avec l'adresse moyenne
  perte: 0.55,         // la part de cette chance perdue à la portée maximale
  peur: 0.4,           // × la peur du tireur (0 à 1) ôtée de la chance
  fatigue: 0.3,        // × la fatigue des bras ôtée de la chance
  frayeur: 0.25,       // la peur que donne une balle qui rate, à l'homme visé
};
