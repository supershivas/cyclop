// Le tir du joueur dans la vue d'un soldat (Jérôme, v0.147.0 ; la vraie visée, v0.151.0) : les nombres. Un fusil à verrou : un coup toutes les 1,6 s ; la balle part où est le guidon
// (le regard, plus le balancement de l'homme et la dispersion de l'arme) et touche le premier homme d'en face que le rayon traverse, à l'endroit qu'elle traverse (tête, tronc, bras, jambes).
// Plus de jet de dés pour toucher (Jérôme, 20 nov. : « le viseur décide ») : l'adresse, la peur, la fatigue des bras jouent sur le balancement.
export const TIR_JOUEUR = {
  periode: 1.6,        // s entre deux coups (le verrou)
  portee: 160,         // m : au-delà la balle ne touche plus
  oeil: 1.6,           // m : la hauteur de l'œil au-dessus de ses pieds (le départ du rayon)
  banquette: 0.6,      // m : dans une tranchée l'homme est monté sur la banquette de tir : son œil est plus haut d'autant (sans elle le parapet lui cache tout)
  haut: 1.7,           // m : la taille d'un homme debout (tapi par la peur : `tapi` ; accroupi ou couché par le joueur : `postures`)
  tapi: 1.0,
  rayon: 0.3,          // m : la demi-largeur d'un homme, bras compris
  frayeur: 0.25,       // la peur que donne une balle qui passe tout près (à moins de `frole` m) de l'homme d'en face
  frole: 1.5,
  // Les parties du corps, de bas en haut, en part de sa taille (un homme tapi est plus petit, les mêmes parts) ; `large` : la demi-largeur (m) ; `mortel` : la chance qu'un coup là tue (sinon il blesse)
  // `blessure` : la blessure laissée (1 bras, 2 jambe, 3 tête ; 0 : celle du hasard, comme un tir ordinaire). Au-delà de la largeur du tronc et sous les épaules : le bras.
  zones: [
    { nom: 'jambes', jusqua: 0.5, large: 0.18, mortel: 0.12, blessure: 2 },
    { nom: 'tronc', jusqua: 0.85, large: 0.2, mortel: 0.55, blessure: 0 },
    { nom: 'tete', jusqua: 1, large: 0.12, mortel: 0.95, blessure: 3 },
  ],
  bras: { large: 0.3, mortel: 0.05, blessure: 1 },
  // Le balancement du guidon (rad) : deux ondes lentes (le souffle, le cœur), tirées du numéro de l'homme et du temps de jeu (une fonction pure : l'écran et la simulation lisent la même).
  // Amplitude : `base` × (1 + peur × `peur` + fatigue des bras × `fatigue` + `bras` si le bras est blessé) × (`adresse0` − `adresse` × adresse/100), × `epaule` épaulé.
  balance: { base: 0.006, peur: 2.5, fatigue: 1.5, bras: 2, adresse0: 1.35, adresse: 0.7, epaule: 0.4, lent: 0.35, vif: 1.7, partVif: 0.3 },
  dispersion: 0.0008,  // rad : l'arme elle-même (± au plus), tirée de la graine au coup
  epaule: { fov: 35, marche: 0.4, entre: 0.25 },
  // Le corps de l'homme qu'on mène (v0.152.0, lot 2) : courir (Maj maintenue), s'accroupir (C), ramper (X), franchir un parapet (Espace)
  // course : la vitesse (×), la fatigue des jambes par seconde de course, l'essoufflement (0 à 1) qui monte en `monte` s et retombe en `retombe` s, le balancement de plus quand il est essoufflé (× (1 + balance × souffle))
  course: { vitesse: 1.7, fatigue: 0.02, monte: 3, retombe: 4, balance: 2.5 },
  // les postures (0 debout, 1 accroupi, 2 couché) : la hauteur de l'œil (m ; debout : `oeil`, plus la banquette), la taille qu'il offre aux balles (m), la marche (×), le balancement (×),
  // `abri` : la part des balles de la foule qui le manquent de plus, `obus` : la part des éclats qu'il évite de plus
  postures: [
    { oeil: 1.6, taille: 1.7, marche: 1, balance: 1, abri: 0, obus: 0 },
    { oeil: 1.0, taille: 1.0, marche: 0.5, balance: 0.75, abri: 0.35, obus: 0.2 },
    { oeil: 0.35, taille: 0.4, marche: 0.2, balance: 0.55, abri: 0.65, obus: 0.5 },
  ],
  // franchir : un rebord de `marche` à `max` quarts (0,5 à 2,5 m) à moins de `portee` m devant lui ; il se pose `pose` m au-delà du pied du rebord en `duree` s ; ses jambes s'y fatiguent d'autant
  saut: { marche: 2, max: 10, portee: 1.4, pose: 0.6, duree: 1.2, fatigue: 0.04 },     // épaulé (le bouton droit maintenu) : le champ (°), la marche (×), s pour épauler (l'écran seulement)
  // Les armes par camp : le Lebel (8 dans le tube, 1 dans la chambre, rechargé une cartouche à la fois), le Mauser (une lame de 5, d'un coup)
  armes: [
    { nom: 'Lebel', balles: 9, cartouche: 0.5, lame: 0 },
    { nom: 'Mauser', balles: 5, cartouche: 0, lame: 2.5 },
  ],
};
