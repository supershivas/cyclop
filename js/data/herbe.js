// L'herbe dense (chantier terrain-végétation, lot 2 ; labo « L'herbe dense », v0.137.0) : au lieu d'une touffe pour ~10 m² d'herbe drue
// (l'herbe du jeu, `preparerHerbe` de rendu/vegetation.js), des touffes tirées case par case autour de la vue, de sept brins de hauteurs et
// d'inclinaisons différentes, tournées au hasard, vertes sur les plaques vertes (v, w) et sèches ailleurs (glaise, herbe morte), rousses en automne :
// les couleurs du sol, aucune de plus. Le dessin seulement (le hachage de la case, jamais le hasard de la bataille).
//   densite : touffes par case et par cran d'herbe (`T.herbe`, 0 à 3) ; max : le plafond de touffes dessinées ; ppmMin : rien en dessous
//   (une touffe y ferait moins d'un pixel) ; portee : pas plus loin de la caméra que le point visé × portee ; taille : la hauteur tirée [min, max]
export const HERBE_VARIANTES = [
  null,
  { nom: 'Plus dense', densite: 0.3, max: 12000, ppmMin: 4, portee: 1.25, taille: [0.7, 1.25] },
  { nom: 'Une prairie', densite: 0.75, max: 24000, ppmMin: 4, portee: 1.3, taille: [0.6, 1.5] },
];
export const HERBE_JEU = 0;
