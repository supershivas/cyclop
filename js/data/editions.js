// Les deux éditions du jeu, un seul code (Jérôme, 24 nov. ; ROADMAP.md, lot 0) : ce que chaque édition branche. Le choix se lit à UN seul
// endroit (main.js, au démarrage), jamais par des `if (itch)` semés dans les règles : un système qui diffère a son module, et l'édition dit lequel.
//   cle      : le préfixe de ses sauvegardes (localStorage) : une partie, des réglages et une vitrine par édition
//   soir     : ce qui s'ouvre le soir ('soiree' : les trois étapes de hud/soiree.js ; 'cartes' : le tirage de trois cartes, lot 1, pas construit)
//   campagne : 'fixe' (data/campagne.js : trois secteurs) ; 'arbre' (lot 5, pas construit)
//   deux     : le jeu à deux est offert sur l'écran titre
export const EDITIONS = {
  classique: { cle: 'cyclopeen', soir: 'soiree', campagne: 'fixe', deux: true },
  itch: { cle: 'cyclopeen-itch', soir: 'soiree', campagne: 'fixe', deux: false },
};
export const EDITION_DEFAUT = 'classique';
// l'édition demandée par l'adresse (?edition=itch), ou celle par défaut
export const editionDe = params => (EDITIONS[params.get('edition')] ? params.get('edition') : EDITION_DEFAUT);
