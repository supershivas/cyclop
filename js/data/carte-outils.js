// Les outils de l'éditeur de carte et les champs que chacun règle, avec un NOM et une DESCRIPTION pour chaque chiffre (l'atelier les affiche tels quels : Jérôme, « je ne comprends pas
// les chiffres de l'éditeur »). `genre` : le type de la forme (`f` d'une retouche de relief, `o` d'un objet) ; `segment` : posée d'un point à un autre ; `champs` : ce qui se règle.
// `icone` : un tracé de 24 × 24 (au trait). Contenu en données (conventions, section 12) : ajouter un outil n'ajoute aucune ligne de code à l'éditeur.
export const GROUPES_OUTILS = [
  { id: 'edition', titre: 'Édition' },
  { id: 'relief', titre: 'Relief' },
  { id: 'objets', titre: 'Végétation' },
];

export const OUTILS = {
  selection: { groupe: 'edition', nom: 'Sélectionner', icone: 'M6 3l12 7-5.5 1.5L10 17z M12.5 11.5L17 18',
    aide: 'Cliquez sur une retouche ou un objet pour le choisir. Glissez son centre pour le déplacer, ou une poignée pour le redimensionner. La touche Suppr le retire.' },
  gomme: { groupe: 'edition', nom: 'Gomme', icone: 'M4 15l8-9 8 8-5 5H8z M9 10l8 8',
    aide: 'Un clic retire la retouche ou l’objet le plus proche.' },
  bosse: { groupe: 'relief', nom: 'Bosse', genre: 'bosse', type: 'relief', champs: ['r', 'h'], icone: 'M2 19c3 0 4-12 10-12s7 12 10 12',
    aide: 'Un clic pose une bosse : le sol monte, le plus haut au centre, jusqu’à la limite du rayon.' },
  creux: { groupe: 'relief', nom: 'Creux', genre: 'creux', type: 'relief', champs: ['r', 'h'], icone: 'M2 7c3 0 4 12 10 12s7-12 10-12',
    aide: 'Un clic creuse le sol, le plus profond au centre. Sous le niveau de l’eau souterraine, le creux se remplit.' },
  crete: { groupe: 'relief', nom: 'Crête', genre: 'crete', type: 'relief', segment: true, champs: ['r', 'h'], icone: 'M2 19l6-10 4 5 3-8 7 13',
    aide: 'Glissez d’un point à un autre : une crête longue, le long du trait, plus haute au milieu de sa largeur.' },
  plateau: { groupe: 'relief', nom: 'Plateau', genre: 'plateau', type: 'relief', champs: ['r', 'h'], icone: 'M2 19h5l3-9h4l3 9h5',
    aide: 'Un clic aplanit le sol à un niveau choisi, sur un disque : le sol rejoint doucement le terrain autour.' },
  arbre: { groupe: 'objets', nom: 'Arbre', genre: 'arbre', type: 'objet', champs: [], icone: 'M12 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10z M12 13v8',
    aide: 'Un clic plante un arbre à cet endroit.' },
  buisson: { groupe: 'objets', nom: 'Buisson', genre: 'buisson', type: 'objet', champs: [], icone: 'M3 19a4 4 0 0 1 4-8 4 4 0 0 1 5-3 4 4 0 0 1 5 3 4 4 0 0 1 4 8z',
    aide: 'Un clic plante un buisson à cet endroit.' },
  bois: { groupe: 'objets', nom: 'Bois', genre: 'bois', type: 'objet', champs: ['r'], icone: 'M6 9a3 3 0 1 1 0 .1z M16 8a3 3 0 1 1 0 .1z M11 16a3 3 0 1 1 0 .1z M6 12v3 M16 11v3 M11 19v2',
    aide: 'Un clic plante un bois : une quarantaine d’arbres serrés, répartis dans le rayon.' },
  haie: { groupe: 'objets', nom: 'Haie', genre: 'haie', type: 'objet', segment: true, champs: [], icone: 'M2 17c3-6 5-6 8 0s5 6 8 0 3-3 4-3',
    aide: 'Glissez d’un point à un autre : une haie de buissons le long du trait, avec quelques trous.' },
  degager: { groupe: 'objets', nom: 'Dégager', genre: 'degager', type: 'objet', champs: ['r'], icone: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 8l8 8 M16 8l-8 8',
    aide: 'Un clic retire les arbres et les buissons que le hasard avait plantés, jusqu’au rayon. Ce que vous avez posé reste (la gomme le retire).' },
};

// Les champs d'une forme. `nom` et `desc` peuvent changer avec le genre (`parGenre`). Les positions sont en mètres, dans le repère du secteur :
// 0 à l'ouest et en haut (côté ennemi) ; négatif = dans la marge, au-delà du secteur.
export const CHAMPS = {
  x: { nom: 'Position est-ouest', unite: 'm', min: -220, max: 620, pas: 0.5, desc: 'Distance depuis le bord ouest du secteur : 0 à l’ouest, 400 à l’est. Négatif : dans la marge à l’ouest.' },
  y: { nom: 'Position nord-sud', unite: 'm', min: -170, max: 470, pas: 0.5, desc: 'Distance depuis le haut du secteur (côté ennemi) : 0 en haut, 300 en bas, côté nous. Négatif : dans la marge au nord.' },
  x2: { nom: 'Fin : est-ouest', unite: 'm', min: -220, max: 620, pas: 0.5, desc: 'Position est-ouest de l’autre bout du trait, même repère.' },
  y2: { nom: 'Fin : nord-sud', unite: 'm', min: -170, max: 470, pas: 0.5, desc: 'Position nord-sud de l’autre bout du trait, même repère.' },
  r: { nom: 'Rayon', unite: 'm', min: 3, max: 80, pas: 1, desc: 'Jusqu’où la forme s’étend depuis son centre, en mètres. Au-delà, rien ne change.',
    parGenre: {
      crete: { nom: 'Demi-largeur', desc: 'Largeur de la crête de chaque côté du trait, en mètres.' },
      plateau: { nom: 'Rayon', desc: 'Taille du plateau : plat jusqu’à 60 % du rayon, puis le sol rejoint doucement le terrain alentour.' },
      bois: { nom: 'Rayon du bois', desc: 'Les arbres du bois sont répartis dans ce rayon, en mètres.' },
      degager: { nom: 'Rayon du dégagement', desc: 'Tout arbre et tout buisson tiré par le hasard à moins de ce rayon est retiré. Ce que vous avez posé reste.' },
    } },
  h: { nom: 'Hauteur', unite: 'm', min: 0.5, max: 12, pas: 0.5, desc: 'De combien le sol monte au centre, en mètres.',
    parGenre: {
      creux: { nom: 'Profondeur', desc: 'De combien le sol descend au centre, en mètres. Sous le niveau de l’eau souterraine, le creux se remplit.' },
      crete: { nom: 'Hauteur de la crête', desc: 'De combien la crête domine le sol alentour, en mètres.' },
      plateau: { nom: 'Niveau du plateau', unite: 'm', min: 0, max: 15, desc: 'Hauteur du sol aplani, en mètres au-dessus du zéro du secteur : 3 m est le niveau moyen du terrain. Au survol, la carte donne la hauteur de chaque point.' },
    } },
};
export const champ = (nom, genre) => { const c = CHAMPS[nom]; return { ...c, ...(c.parGenre?.[genre] || {}) }; };

// Ce que dit la carte d'une case survolée (en mots : herbe 0 à 3)
export const HERBE = ['nulle', 'rare', 'drue', 'très drue'];
export const SOLS = ['sec', 'humide', 'boue', 'eau', 'glace'];
