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
  portee: 80,  demiCone: 0.5, cadence: 1, touche: 0.0015, gravite: 0.7, peur: 0.2, equipage: 7, recrute: 20,      // m : d'où vient l'homme qu'on poste (le plus proche du fond de la tranchée au droit du nid ; v0.144.1) ;
  obus: { '75': 25, '155': 60, '220': 120 }, zone: 0.8,
  travail: 1,
  munitions: 400,              // rafales dans la bande (Jérôme, lot E : la barre de munitions) ; une rafale n'en use qu'une quand elle a un homme d'en face dans son cône ; rechargées à l'aube
  pivot: 70,                   // degrés : de combien le poste tourne, de chaque côté de sa direction d'origine (Jérôme, lot E : « on règle la direction du cône »)
  etiquette: { munBas: 0.25, apresRafale: 8 },   // (Jérôme, retour du 1er nov.) l'étiquette d'un poste (vie, bande) n'est sur le champ que s'il est choisi, abîmé, presque à sec, ou s'il a tiré depuis `apresRafale` s de jeu
  // La mitrailleuse à la main (Jérôme, 24 nov., v0.168.0 : « on contrôle le tir ») : elle ne tire que tant qu'on tient le bouton, dans le regard ; une rafale tous les `periode` s
  // sur les hommes d'en face à moins de `cone` rad du regard (la chance : `touche` × (1,4 − distance / portée)) ; la bande perd une rafale par `parBande` rafales à la main (le même débit
  // qu'en tirant seul : une par seconde) ; le regard tourne au plus de `pivot` degrés de chaque côté de sa direction d'origine, comme le cône
  main: { periode: 0.2, cone: 0.09, touche: 0.05, parBande: 5,
    // v0.169.0 (Jérôme, 24 nov. : « elle peut tirer dans toutes les directions (haut et bas), limitée seulement par son cône ; ses tirs font des petits trous dans le sol et déchiquètent les arbres,
    // qui finissent par tomber ») : la bouche à `bouche` m au-dessus du sol du poste (la hauteur de l'œil de la vue : le viseur et la gerbe vont au même point) ; la gerbe suit le regard en hauteur (`el`) et s'arrête au premier relief, au premier arbre (son tronc
    // jusqu'à `tronc` m de haut, à `large` m de part et d'autre ; la couronne jusqu'à `cime` m, à `couronne` m), sinon à la portée ; au sol elle laisse `trous` trous d'un quart par rafale
    // (en moyenne) ; un arbre tombe à `arbre` rafales reçues (~3 s de feu) ; un homme n'est touché que si la gerbe passe à hauteur de son corps (`taille` m)
    bouche: 1.9, tronc: 2.5, large: 0.4, cime: 8, couronne: 1.6, trous: 0.7, arbre: 15, taille: 1.7 },
  armes: ['Hotchkiss', 'MG 08'],     // le nom de l'arme de chaque camp, dans le tableau de bord de la vue à la personne (v0.167.0)
  reparationEnFace: 0.5,       // en face, sans génie : la chance par nuit qu'un nid détruit soit refait
};
