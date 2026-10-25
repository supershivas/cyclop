// Les grades à l'écran (labo « Les grades se voient », v0.68.0) : de quel rang à quelle classe de dessin, et ce que chaque variante montre de chaque classe.
// Le dessin seulement : rien de ceci n'est sauvegardé, ne touche à la partie ni à la graine ; la classe d'un homme vient de son rang (`rangDe` de bataille.js :
// son rang de création, ou sa promotion), donc elle est la même pour les deux joueurs et suit les promotions et les pertes.

// Les rangs de identite.js (0 capitaine, 1 lieutenant, 2 sous-lieutenant, 3 adjudant, 4 sergent, 5 caporal, 6 et 7 soldat) en classes de dessin :
// 0 soldat, 1 caporal, 2 sergent (l'adjudant aussi), 3 lieutenant (le sous-lieutenant aussi), 4 capitaine. Quatre signes à reconnaître, pas sept.
export const CLASSE_DU_RANG = [4, 3, 3, 2, 2, 1, 0, 0];
export const CLASSES = ['soldat', 'caporal', 'sergent', 'lieutenant', 'capitaine'];

/* Les pièces d'une classe (noms de `PIECES` de rendu/geometries.js) :
   - `mat` un fanion de commandement à 3,5 m, deux bandes (os sur terre) qui se lisent sur le kaki comme sur le bleu : la silhouette qu'on voit de loin ;
   - `kepiSombre` le képi tout sombre, `kepiBande` le képi à calotte de la couleur du camp et bandeau sombre (plus large et plus haut que le casque, à sa place) ; `manteau` la capote longue, jusqu'aux mollets ;
   - `jumelles` (sur la poitrine, leur cordon sur les épaules), `carte` (l'étui de carte, à la hanche : il se voit de dos comme de face) ; `pistolet` (l'arme de poing à la place du fusil : la baïonnette, qui dépasse du rang, disparaît) ;
   - `lettreC` un C d'os sur fond de terre au-dessus de la tête du capitaine (Jérôme, v0.69.0 : « un petit C au-dessus du capitaine ») : il ne tourne pas avec l'homme ;
   - `galons2`, `galons3` aux manchettes ; `chevrons1`, `chevrons2` sur la manche gauche ; `brassard` ; `baudrier` en travers de la poitrine ; `epaulette1` (l'épaule gauche), `epaulettes` (les deux) :
   de loin, le dessus de la tête et des épaules est ce qu'on voit le mieux (la caméra plonge de 54°), et ceux qui marchent vers le nord nous tournent le dos : les signes de face ne se lisent que de près.
   `sansFusil` : la classe porte l'arme de poing, pas le fusil.
   `points` : le côté (pixels) d'un homme aux zooms 1 et 2, où chaque soldat est un point de 2 pixels.
   `echelle` : la taille du corps de la classe (1 : le soldat) ; une silhouette plus haute, jamais un soldat agrandi seul : les pièces comptent.
   Les signes sombres sont en terre (`t`) : sur le vert kaki clair d'en face comme sur le bleu horizon, c'est le contraste le plus net (l'os se perdait sur le kaki). */
export const GRADES = {
  // A : la silhouette d'abord. Le capitaine porte un fanion qui dépasse de la troupe ; les officiers n'ont plus de fusil ; la capote longue les élargit.
  fanion: {
    nom: 'Le fanion',
    classes: [
      {},
      { pieces: ['epaulette1', 'brassard'], points: 2 },
      { pieces: ['epaulettes', 'baudrier', 'chevrons2'], points: 2 },
      { pieces: ['kepiSombre', 'manteau', 'pistolet', 'galons2'], sansFusil: true, points: 3 },
      { pieces: ['kepiSombre', 'manteau', 'pistolet', 'galons3', 'mat'], sansFusil: true, points: 4, echelle: 1.06 },
    ],
  },
  // B : les accessoires de commandement. Jumelles et carte disent « celui qui regarde et qui ordonne » ; pas de mât, la troupe garde sa ligne.
  jumelles: {
    nom: 'Les jumelles et la carte',
    classes: [
      {},
      { pieces: ['epaulette1'], points: 2 },
      { pieces: ['epaulettes', 'chevrons1'], points: 2 },
      { pieces: ['kepiSombre', 'carte', 'pistolet', 'galons2'], sansFusil: true, points: 3 },
      { pieces: ['kepiSombre', 'manteau', 'jumelles', 'carte', 'pistolet', 'galons3'], sansFusil: true, points: 4, echelle: 1.04 },
    ],
  },
  // C : l'uniforme seul, sans accessoire : le képi, les galons, les épaulettes ; le capitaine est le seul à porter la capote longue. Le plus discret.
  galons: {
    nom: 'Le képi et les galons',
    classes: [
      {},
      { pieces: ['chevrons1'], points: 2 },
      { pieces: ['chevrons2', 'epaulettes'], points: 2 },
      { pieces: ['kepiBande', 'galons2', 'epaulettes', 'pistolet'], sansFusil: true, points: 3 },
      { pieces: ['kepiBande', 'galons3', 'epaulettes', 'manteau', 'pistolet', 'lettreC'], sansFusil: true, points: 4, echelle: 1.1 },
    ],
  },
};

export const classeDuRang = rang => CLASSE_DU_RANG[rang] ?? 0;
