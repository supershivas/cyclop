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
  // La balle (v0.158.0, lot 6) : elle tombe (`g`, à `vitesse` m/s : 26 cm à 160 m) ; la hausse la fait passer sur la ligne de visée à `hausse` m (au-dessus avant, dessous après) ;
  // un arbre debout l'arrête (son tronc : `rayon` m de part et d'autre, jusqu'à `haut` m), un char aussi (`char`) ; un homme de chez nous est touché comme un autre, son régiment perd `ami.moral` de moral
  balle: { vitesse: 700, g: 9.81, hausse: 200 },
  arbre: { rayon: 0.35, haut: 6 },
  char: { rayon: 1.6, haut: 2.4 },
  ami: { moral: 0.02 },
  // La grenade (G, v0.158.0) : `nombre` par homme qu'on mène ; lancée à `vitesse` m/s, `angle` rad au-dessus du regard (borné de `min` à `max` rad), elle tombe à v² sin 2θ / g (au plus `loin` m) ;
  // elle éclate `meche` s après le lancer : un souffle de `rayon` m, `letal` × la chance d'un obus (les éclats ne choisissent pas leur camp)
  grenade: { nombre: 2, vitesse: 14, angle: 0.35, min: 0.1, max: 1.2, loin: 22, meche: 4, rayon: 5, letal: 0.9 },
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
  saut: { marche: 2, max: 10, portee: 1.4, pose: 0.6, duree: 1.2, fatigue: 0.04 },
  // Le corps à corps de l'homme qu'on mène (v0.154.0, lot 3) : F (ou le clic, un ennemi à moins de `pres` m devant lui) frappe dans un cône de `cone` rad (demi-angle) jusqu'à `portee` m,
  // un coup toutes les `periode` s ; la chance : `touche` × la force contre l'endurance (comme la mêlée de la foule : reglages.js) × les bras fatigués × la justesse (`centre` au milieu du cône, `bord` au bord) ;
  // en courant (la charge) × `charge` ; sans cartouche, la crosse (moins mortelle : `crosse`, elle laisse une blessure à la tête) ; la parade (le bouton droit, un ennemi tout près) : les coups de l'adversaire × `parade`
  melee: { pres: 2, portee: 1.8, cone: 0.44, periode: 0.9, touche: 0.5, centre: 1.3, bord: 0.7, charge: 1.4, crosse: 0.15, parade: 0.5 },
  // « À moi ! » (V maintenue) : les hommes de son régiment à moins de `rayon` m le rejoignent (à `pres` m de lui, chacun de son côté)
  amoi: { rayon: 25, pres: 2.5 },     // épaulé (le bouton droit maintenu) : le champ (°), la marche (×), s pour épauler (l'écran seulement)
  // Les armes par camp : le Lebel (8 dans le tube, 1 dans la chambre, rechargé une cartouche à la fois), le Mauser (une lame de 5, d'un coup)
  armes: [
    { nom: 'Lebel', balles: 9, cartouche: 0.5, lame: 0 },
    { nom: 'Mauser', balles: 5, cartouche: 0, lame: 2.5 },
  ],
};
