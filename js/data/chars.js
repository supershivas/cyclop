// Les chars d'assaut du jeu (Jérôme, v0.47.0 ; lot 2 de ROADMAP.md « Chars, mitraillage aérien »). Une batterie de plus : le bouton « Char » (touche 5), un clic sur l'objectif,
// et l'engin part de l'arrière de nos lignes en droite ligne. Les chiffres sont des propositions (maquette « Les chars » du labo), à mesurer.
export const CHAR = 'char';
export const CHARS = {
  schneider: {
    nom: 'Schneider CA 1',
    longueur: 6.0,
    vitesse: 3.0,        // m/s sur sol ferme (10,8 km/h : plus que le pas de l'infanterie, 1,9, pour qu'il la devance ; Jérôme, v0.78.0 « plus rapides » ; 2 m/s depuis la v0.60.0, 1 m/s avant)
    franchit: 6,         // quarts de mètre : la profondeur de cratère qu'il franchit (au-delà, il reste couché) ; la moitié le ralentit
    pv: 100,
    portee: 28,          // m : ses Hotchkiss couchent les hommes de l'autre camp dans ce rayon
    cadence: 1,          // s entre deux rafales
    touche: 0.12,        // chance qu'une rafale touche un homme à portée (× 1 près, 0,4 à portée), puis gravité de `frapper`
    gravite: 0.7,
    peur: 0.5,           // la peur des hommes à portée de ses mitrailleuses
    route: 8,            // m/s tant qu'il n'a pas rejoint l'arrière de son camp (il arrive de hors de la carte, sur la route)
    // son canon (Jérôme, v0.81.0 : « même si ce n'est pas réaliste, les chars lancent des obus, avec une barre qui charge et une cible, lors de leur déplacement ») : un obus de `calibre`
    // tombé sur la cible, tous les `recharge` s, en roulant ; la cible est celle qu'on lui désigne (`cible`), sinon le carré d'ennemis le plus dense à portée
    canon: { calibre: '75', portee: 90, minimum: 14, recharge: 7, dispersion: 3 },
  },
};
export const CHAR_PAR_DEFAUT = 'schneider';
export const CHAR_RECHARGE = 240;           // s : un seul à la fois, on ne le recommande qu'après quatre minutes
export const CHAR_SORTIE = 14;              // m : il naît à cette distance au-delà du bord du terrain, et se voit y entrer (Jérôme, v0.48.1)
export const CHAR_DEPART = 20;             // m : on ne vise pas à moins de cette distance de son point de départ
// dégâts d'un obus tombé à sa portée : `base` × (1 − distance / (rayon du calibre × `zone`)) ; il est détruit à `pv`
export const CHAR_OBUS = { zone: 0.8, base: { '75': 30, '155': 70, '220': 120 } };
// la route du char (Jérôme, v0.59.3 : il contourne les fleuves et passe par les ponts qui le portent) et sa conduite
export const CHAR_ROUTE = {
  maille: 2,            // m : la grille de la recherche de chemin
  marge: 1.5,           // m : le dégagement exigé de chaque côté du chemin (eau, trou, pont trop faible)
  cratere: 4,           // coût d'une case à demi profonde (1 : le plat) : il la contourne s'il peut
  arrivee: 2.5,         // m : à cette distance d'un point de son chemin, il vise le suivant
  virage: 0.9,          // rad/s : sa vitesse de rotation
  accel: 3.2,           // m/s² : démarrage et freinage sur le champ (2,4 avant la v0.78.0 : le char atteint maintenant sa vitesse en une seconde)
  accelRoute: 6,        // m/s² : sur la route
};
