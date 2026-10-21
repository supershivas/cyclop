// Les chars d'assaut du jeu (Jérôme, v0.47.0 ; lot 2 de ROADMAP.md « Chars, mitraillage aérien »). Une batterie de plus : le bouton « Char » (touche 5), un clic sur l'objectif,
// et l'engin part de l'arrière de nos lignes en droite ligne. Les chiffres sont des propositions (maquette « Les chars » du labo), à mesurer.
export const CHAR = 'char';
export const CHARS = {
  schneider: {
    nom: 'Schneider CA 1',
    longueur: 6.0,
    vitesse: 1.0,        // m/s sur sol ferme (3,6 km/h)
    franchit: 6,         // quarts de mètre : la profondeur de cratère qu'il franchit (au-delà, il reste couché) ; la moitié le ralentit
    pv: 100,
    portee: 28,          // m : ses Hotchkiss couchent les hommes de l'autre camp dans ce rayon
    cadence: 1,          // s entre deux rafales
    touche: 0.12,        // chance qu'une rafale touche un homme à portée (× 1 près, 0,4 à portée), puis gravité de `frapper`
    gravite: 0.7,
    peur: 0.5,           // la peur des hommes à portée de ses mitrailleuses
  },
};
export const CHAR_PAR_DEFAUT = 'schneider';
export const CHAR_RECHARGE = 240;           // s : un seul à la fois, on ne le recommande qu'après quatre minutes
export const CHAR_DEPART = 20;              // m : on ne vise pas à moins de cette distance de son point de départ
// dégâts d'un obus tombé à sa portée : `base` × (1 − distance / (rayon du calibre × `zone`)) ; il est détruit à `pv`
export const CHAR_OBUS = { zone: 0.8, base: { '75': 30, '155': 70, '220': 120 } };
