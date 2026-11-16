// Les écussons des unités (Jérôme, v0.141.0 ; choisis au labo, sujet « Les unités : un seul signe », planche D) : chaque arme a sa propre forme et son dessin.
// Infanterie : la bannière à queue d'aronde, le numéro du régiment dedans ; chars : le carré aux coins coupés, un maillon de chenille ; mitrailleuses : le triangle (la pointe dit
// le feu), l'arme sur son trépied ; avions : la cocarde ailée, une hirondelle ; génie : l'écu à bas rond, la pelle et la pioche croisées en leur milieu.
// `ajust` : où et à quelle échelle le dessin se pose dans la forme ([x, y, échelle] ; une pointe en haut pousse le dessin vers le bas). Le dessin des formes : hud/ecussons.js.
export const ECUSSONS = {
  reg: { forme: 'banniere', dessin: 'numero', ajust: [0, -2.5, 0.92], nom: 'Régiment' },
  char: { forme: 'carre', dessin: 'chenille', ajust: [0, -1, 1], nom: 'Char' },
  nid: { forme: 'triangle', dessin: 'trepied', ajust: [0, 4, 0.66], nom: 'Mitrailleuse' },
  avion: { forme: 'rondAile', dessin: 'hirondelle', ajust: [0, 0, 0.8], nom: 'Avion' },
  genie: { forme: 'ecuRond', dessin: 'pellePioche', ajust: [0, -1, 1], nom: 'Génie' },
};
