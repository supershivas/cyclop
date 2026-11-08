// Des animations toutes faites du soldat articulé, point de départ de l'atelier (logique pure) : on les charge, on les retouche image par image.
// Elles sont construites avec les poses du jeu (`poseDe`), le fusil placé comme un corps (`pointFusil`) et la cinématique inverse des bras (`ikBras` : les mains posées sur le fusil).
// Tout est pour un tireur DROITIER ; le gaucher en est le miroir (`miroirAnimation` de js/anim-edition.js : le jeu en jouera le miroir pour environ 10 % des hommes).
import { poseNeutre, poseDe, ikBras, pointFusil, animation, CARRURE_NEUTRE } from './pose-soldat.js?v=0.131.0';

// Le fusil à deux mains, « à la charge » : la crosse contre la hanche droite, le canon devant et un peu à gauche ; la main droite sur la poignée, la gauche sur le fût.
// (les valeurs viennent d'un balayage : un fusil plus horizontal ou plus avancé met la main gauche hors de portée du bras, 62 cm)
export const PORT_ARME = {
  crosse: [0.12, 0.95, 0.18],       // où la crosse (y = 0,55 m du fusil) se tient, dans le monde (avant d'y ajouter le buste penché)
  flexion: -0.7,                   // la pente du canon : vers l'avant et le haut
  lacet: 0.3,                      // le canon vers la gauche
  roulis: 0.5,                     // et incliné en travers de la poitrine
  mainDroite: 0.85,                // où se posent les mains le long du fusil (hauteur du modèle : 0,55 la crosse, 1,95 la bouche)
  mainGauche: 1.0,
};

// La pose donnée, avec le fusil à deux mains : le fusil se place pour que sa crosse soit où il faut (deux passes : le buste penché déplace un peu tout), puis les bras vont aux deux prises
export function porterArme(pose, car = CARRURE_NEUTRE, P = PORT_ARME) {
  let p = { ...poseNeutre(), ...pose, fusil: P.flexion, fusilLacet: P.lacet, fusilRoulis: P.roulis, fusilX: 0, fusilZ: 0, fusilH: 0 };
  for (let n = 0; n < 2; n++) {
    const b = pointFusil(p, car, 0.55);
    p = { ...p, fusilX: p.fusilX + (P.crosse[0] - b[0]) / car.epaules, fusilH: p.fusilH + (P.crosse[1] - b[1]), fusilZ: p.fusilZ + (P.crosse[2] - b[2]) };
  }
  return { ...p, ...ikBras(p, car, 'D', pointFusil(p, car, P.mainDroite)), ...ikBras(p, car, 'G', pointFusil(p, car, P.mainGauche)) };
}

// Les jambes plantées pour tirer : le pied gauche un peu devant, le genou légèrement plié
export const JAMBES_TIR = { hancheG: 0.22, genouG: 0.18, chevilleG: -0.05, hancheD: -0.12, genouD: 0.14, chevilleD: 0.04, buste: 0.1 };

export function marcheFusil({ periode = 0.8 } = {}) {
  const images = [0, 1, 2, 3].map(i => ({ t: i * periode / 4, pose: porterArme(poseDe({ vit: 1, phase: i * Math.PI / 2 })), courbe: 'doux' }));
  return animation('marche (fusil à deux mains)', images, { mode: 'boucle', duree: periode });
}

// Le tir d'une seconde, pieds plantés (le soldat n'avance pas) : le fusil se lève (0,2 s), le coup et son recul (0,26 s), la visée tenue (jusqu'à 0,8 s), puis le fusil revient à la charge
export function tir({ duree = 1 } = {}) {
  const jambes = JAMBES_TIR, port = porterArme({ ...poseNeutre(), ...jambes });
  const epaule = { ...poseDe({ tir: 1 }), ...jambes, buste: 0.16 };
  const recul = { ...epaule, fusil: epaule.fusil - 0.14, fusilZ: -0.05, fusilH: 0.03, buste: 0.21, epauleD: epaule.epauleD - 0.06, epauleG: epaule.epauleG - 0.04 };
  const k = (t, pose, courbe) => ({ t: t * duree, pose, courbe });
  return animation('tir (1 s, pieds plantés)', [
    k(0, port, 'sortie'), k(0.2, epaule, 'entreesortie'), k(0.26, recul, 'sortie'), k(0.42, epaule, 'doux'), k(0.8, epaule, 'entreesortie'), k(1, port, 'doux'),
  ], { mode: 'unefois', duree });
}

export function reposFusil() {
  return animation('repos (fusil à deux mains)', [{ t: 0, pose: porterArme(poseNeutre()), courbe: 'doux' }], { mode: 'boucle', duree: 1 });
}

// Le catalogue de l'atelier
export const MODELES = [
  { id: 'marche-fusil', nom: 'Marche, fusil à deux mains', creer: marcheFusil },
  { id: 'tir', nom: 'Tir de 1 s, pieds plantés', creer: tir },
  { id: 'repos-fusil', nom: 'Repos, fusil à deux mains', creer: reposFusil },
];
