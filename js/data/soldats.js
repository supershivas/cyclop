/* Les soldats en sprites (variante du labo, pas encore dans le jeu) : une
   matrice de lettres par pose (modules/sprites.js), trois tailles selon le zoom.
   Lettres : '.' vide, 'c' la couleur du camp, 'k' le casque (la couleur du camp,
   ou l'os quand le régiment est choisi), toute autre lettre : la palette
   (t : le fusil et l'ombre au sol, au sud-est).

   La forme porte le camp, la couleur le confirme : nous, le casque à cimier ;
   en face, le casque qui descend sur les oreilles. Le bas du sprite est le pied
   du soldat. */
export const TAILLES = {
  petit: [3, 4],      // zooms où cette taille sert (pixels par mètre)
  moyen: [6],
  grand: [8],
};

const corps = {
  petit: { arret: ['ccc', 'cct', 'c.c', '.tt'], marche1: ['ccc', 'cct', 'c..', '.tt'], marche2: ['ccc', 'cct', '..c', '.tt'] },
  moyen: {
    arret: ['ccct', 'ccct', '.cc.', '.cc.', '.cc.', '..tt'],
    marche1: ['ccct', 'ccct', '.cc.', '.cc.', 'c..c', '..tt'],
    marche2: ['ccct', 'ccct', '.cc.', '.c.c', '.c..', '..tt'],
  },
  grand: {
    arret: ['.ccc.', 'cccct', 'cccct', '.ccct', '.ccc.', '.ccc.', '.c.c.', '.c.c.', '..ttt'],
    marche1: ['.ccc.', 'cccct', 'cccct', '.ccct', '.ccc.', '.ccc.', '.cc..', 'c..c.', '..ttt'],
    marche2: ['.ccc.', 'cccct', 'cccct', '.ccct', '.ccc.', '.ccc.', '..cc.', '.c..c', '..ttt'],
  },
};
const tetes = {
  nous: { petit: ['.k.', 'kkk'], moyen: ['.k..', 'kkk.', '.cc.'], grand: ['..k..', '.kkk.', 'kkkkk'] },
  eux: { petit: ['...', 'kkk'], moyen: ['....', 'kkk.', 'kck.'], grand: ['.....', '.kkk.', 'kkkkk', 'kccck'] },
};

// Les poses : SOLDATS[camp][taille][pose] = matrice de lettres
export const SOLDATS = {};
for (const camp of ['nous', 'eux']) {
  SOLDATS[camp] = {};
  for (const taille of Object.keys(corps)) {
    SOLDATS[camp][taille] = {};
    for (const [pose, rows] of Object.entries(corps[taille])) {
      const tete = tetes[camp][taille];
      // la tête d'en face (plus basse) remplace la première rangée du corps de la grande taille
      SOLDATS[camp][taille][pose] = camp === 'eux' && taille === 'grand' ? [...tete, ...rows.slice(1)] : [...tete, ...rows];
    }
  }
}
export const POSES = ['arret', 'marche1', 'marche2'];
