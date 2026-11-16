// Les mottes de terre et le feu (Jérôme, v0.139.0 : « améliore le rendu des mottes de terre lors des explosions ainsi que le réalisme du feu »).
// Le dessin seulement : rien n'est sauvegardé, rien ne touche à la partie ; le hasard est celui de l'aspect (`alea` de rendu/eclats.js).

// Les mottes : de petits blocs de terre en volume, qui tournent en l'air, rebondissent une fois, restent un moment au sol puis s'y enfoncent.
// `terres` : les lettres des mottes (le dessus ; les flancs prennent la lettre d'ombre, OMBRE d'apparence.js) ; `taille` : [min, max] en m ;
// `ppmMin` : en dessous (tout dézoomé), une motte ne fait plus un pixel : les points d'avant ; `rebond` : la part de la vitesse gardée au rebond ;
// `reste` : [min, max] s au sol ; `enfonce` : s pour disparaître ; `max` : mottes à la fois par lettre ; `parCalibre` : les grosses mottes en plus par obus.
export const MOTTES = {
  terres: ['g', 'b', 's', 'h'], taille: [0.12, 0.42], ppmMin: 3, rebond: 0.28, reste: [3, 7], enfonce: 1.5, max: 160,
  parCalibre: { '75': 4, '155': 9, '220': 16 }, grossesTaille: [0.35, 0.8],
};

// Le feu (une exception de palette, Jérôme, v0.139.0, comme les feuilles d'automne) : des langues de flamme en lumière additive, du cœur presque blanc
// au rouge sombre selon leur chaleur (le centre et la jeunesse de la flamme), et des braises qui montent en zigzag.
// `couleurs` : du plus chaud au plus froid ; `vie` : [min, max] s d'une flamme ; `monte` : sa poussée (m/s²) ; `remous` : son balancement (m/s²) ;
// `braises` : la part des flammes qui lâchent une braise, leur vie, leur taille (m) ; `max` : particules à la fois.
export const FEU = {
  couleurs: { coeur: '#fff4c8', jaune: '#ffc53d', orange: '#ff7417', rouge: '#a8250c' },
  vie: [0.45, 0.95], monte: 4.5, remous: 3, freinage: 1.6,
  braises: { part: 0.12, vie: [1.5, 3], taille: 0.12 }, max: 1600, cadence: 0.022,
};
