// Les toits de bois et les nids de mitrailleuses des tranchées (Jérôme, v0.83.0 : « les toits protègent du tir » ; « ajouter les nids de mitrailleuses, que les sapeurs peuvent réparer »).
// Les nombres sont des propositions, calibrés sur la simulation d'assaut (docs/domaines/bataille.md).
// Un toit : sur `part` des tronçons des deux premières lignes (un hachage du numéro et de la graine), de `de` à `a` m depuis le début du tronçon ; un homme dessous
// reçoit les tirs de fusil (`tir`), les balles d'avion (`avion`) et les éclats d'obus (`obus`) multipliés par ces chances, tant que la tranchée n'est pas éboulée.
export const TOITS = { part: 0.25, de: 7, a: 16, tir: 0.3, avion: 0.5, obus: 0.75 };
// Un nid de mitrailleuse : un par secteur sur la 1re ligne de chaque camp, à `tronconDuSecteur` (le 2e tronçon du secteur). Il tire en avant (un cône de `demiCone` rad) sur les hommes de
// l'autre camp à `portee` m, une rafale par `cadence` s ; il faut au moins un de ses hommes à moins de `equipage` m (le tronçon tenu) pour le servir. Les obus l'abîment (`obus`
// : les pv ôtés au centre, de moins en moins jusqu'à `zone` × le rayon du calibre) ; à 0 pv il est détruit. Le génie le refait en `travail` heures de jeu (avec 20 hommes).
export const NIDS = {
  parSecteur: 1, tronconDuSecteur: 1, pv: 60,
  portee: 100, demiCone: 0.5, cadence: 1, touche: 0.0015, gravite: 0.7, peur: 0.2, equipage: 7,
  obus: { '75': 25, '155': 60, '220': 120 }, zone: 0.8,
  travail: 1,
  reparationEnFace: 0.5,       // en face, sans génie : la chance par nuit qu'un nid détruit soit refait
};
