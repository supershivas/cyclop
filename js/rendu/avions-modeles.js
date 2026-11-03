// Les biplans en volumes (Jérôme, v0.55.0), sortis du labo (`labo-avions.js`, qui les reprend d'ici) pour que la bataille les dessine à l'échelle : 1 unité = 1 m, l'avant à +x,
// le haut à +y, la droite à +z. Dessin seulement. Le SPAD XIII français (8,1 m d'envergure) pour nous, l'Albatros D.V allemand (9 m) pour eux ; leurs marques sont celles de la palette
// (la cocarde française n'a pas son rond rouge hors du labo : aucune autre couleur dans le jeu).
import { PALETTE as P } from '../palette.js?v=0.111.0';

export function cocardeFr(A, g, x, y, z, r, axe, centre = P.n) { A.cyl(g, r, 0.025, P.n, [x, y, z], axe, 10); A.cyl(g, r * 0.66, 0.03, P.o, [x, y, z], axe, 10); A.cyl(g, r * 0.33, 0.035, centre, [x, y, z], axe, 10); }
export function croixPlate(A, g, x, y, z, t) {
  A.b(g, [t * 1.2, 0.03, t * 1.2], P.t, [x, y, z]); A.b(g, [t * 1.1, 0.04, t * 0.32], P.o, [x, y, z], [0, 0, 0], false); A.b(g, [t * 0.32, 0.04, t * 1.1], P.o, [x, y, z], [0, 0, 0], false);
}
// Un biplan en pièces (Jérôme, 1er novembre : l'épave se disperse, ses ailes, sa queue, son moteur et ses roues ne tiennent plus au fuselage) : chaque pièce est un groupe posé à son point d'attache (`position`), ses boîtes
// dessinées relativement à lui ; les assembler toutes au fuselage redonne l'avion entier (`biplan`). `brule` : les pièces de toile carbonisées (une liste de noms) ; leur ossature de bois ne change pas.
// Pièces : fuselage, queue, moteur (capot et hélice), hautG, hautD (l'aile haute, ses mâts et sa cocarde), basG, basD, trainG, trainD (la jambe et la roue). G : le côté −z, D : le côté +z.
export function biplanPieces(A, o, brule = []) {
  const { THREE } = A;
  const { centre = P.n, L = 6.3, env = 8.1, corde = 1.45, ecart = 1.35, cc = P.w, ca = P.h, de = false, rotatif = false, deuxPlaces = false, couleurMoteur = P.r } = o;
  const noir = nom => brule.includes(nom), toile = (nom, c) => noir(nom) ? P.s : c;
  const piece = (nom, pos) => { const g = new THREE.Group(); g.position.set(...pos); g.userData.nom = nom; return g; };
  const rel = (g, [x, y, z]) => [x - g.position.x, y - g.position.y, z - g.position.z];
  const b = (g, taille, c, pos, rot, bord) => A.b(g, taille, c, rel(g, pos), rot, bord);
  const rA = { b: (g, t, c, pos, rot, bo) => A.b(g, t, c, rel(g, pos), rot, bo), cyl: (g, r, len, c, pos, axe, seg, r2) => A.cyl(g, r, len, c, rel(g, pos), axe, seg, r2) };      // (les marques, posées en repère de l'avion)
  const x0 = L * 0.08, yb = -0.5, yh = yb + ecart, out = {};
  // le fuselage : un profil plein, plus haut au moteur ; le poste de pilotage, les mitrailleuses, l'observateur, les marques
  const fu = out.fuselage = piece('fuselage', [0, 0, 0]);
  A.prisme(fu, [[-L * 0.5, 0.05], [-L * 0.15, 0.4], [L * 0.2, 0.5], [L * 0.5, 0.45], [L * 0.5, -0.4], [L * 0.2, -0.5], [-L * 0.1, -0.35]], 0.62, toile('fuselage', cc));
  for (const s of [1, -1]) {
    A.b(fu, [0.04, 0.9, 0.04], P.s, [x0 + 0.1, 0.1, s * 0.3], [s * 0.4, 0, 0.0]);                                                              // la cabane
    A.b(fu, [0.5, 0.04, 1.0], toile('fuselage', ca), [x0, yh - 0.1, 0], [0, 0, 0], false);
    A.b(fu, [0.3, 0.1, 0.1], P.t, [L * 0.38, 0.55, s * 0.12]); A.cyl(fu, 0.025, 0.6, P.t, [L * 0.38 + 0.4, 0.55, s * 0.12], 'x', 5);
    if (de) A.croix(fu, [-L * 0.3, 0.1, s * 0.32], 0.55); else cocardeFr(A, fu, -L * 0.3, 0.1, s * 0.32, 0.26, 'z', centre);
  }
  A.b(fu, [0.06, 0.06, 1.6], P.s, [L * 0.12, -1.38, 0]);                                                                                       // l'essieu
  A.b(fu, [0.45, 0.1, 0.4], P.t, [L * 0.0, 0.5, 0]);
  if (deuxPlaces) { A.b(fu, [0.5, 0.1, 0.4], P.t, [-L * 0.2, 0.42, 0]); A.cyl(fu, 0.28, 0.06, P.s, [-L * 0.2, 0.55, 0], 'y', 8); A.cyl(fu, 0.025, 0.7, P.t, [-L * 0.2 - 0.3, 0.6, 0], 'x', 5); }
  // le moteur : un capot rond (rotatif) ou long (en ligne), et l'hélice qui tourne
  const mo = out.moteur = piece('moteur', [L * 0.5, 0, 0]);
  const helice = new THREE.Group(); helice.position.set(rotatif ? 0.42 : 0.1, 0, 0); mo.add(helice);
  A.cyl(mo, rotatif ? 0.52 : 0.3, rotatif ? 0.5 : 0.8, couleurMoteur, [rotatif ? 0.2 : -0.1, 0, 0], 'x', 12);
  A.b(helice, [0.05, 2.2, 0.15], P.b, [0, 0, 0]); A.b(helice, [0.05, 0.15, 2.2], P.b, [0, 0, 0], [0, 0, 0], false);
  // la queue : le plan fixe, la dérive, la béquille
  const qu = out.queue = piece('queue', [-L * 0.5, 0.15, 0]);
  b(qu, [1.0, 0.05, 2.6], toile('queue', ca), [-L * 0.5 + 0.2, 0.15, 0]);
  A.prisme(qu, [[0, 0], [1.0, 0], [0.55, 0.95], [0.1, 0.95]], 0.07, toile('queue', ca), [-0.15, 0, 0]);
  b(qu, [0.5, 0.05, 0.08], P.s, [-L * 0.5 - 0.1, -0.1, 0]);
  // les ailes : deux moitiés de chaque plan, l'aile haute porte ses mâts
  for (const s of [1, -1]) {
    const cote = s < 0 ? 'G' : 'D', ah = out['haut' + cote] = piece('haut' + cote, [x0, yh, s * env / 4]), ab = out['bas' + cote] = piece('bas' + cote, [x0, yb, s * env * 0.22]);
    b(ah, [corde, 0.07, env / 2], toile('haut' + cote, ca), [x0, yh, s * env / 4]);
    for (const dx of [-corde * 0.32, corde * 0.32]) b(ah, [0.05, ecart + 0.08, 0.05], P.s, [x0 + dx, yb + ecart / 2, s * env * 0.3]);
    if (de) croixPlate(rA, ah, x0, yh + 0.06, s * env * 0.3, 0.85); else cocardeFr(rA, ah, x0, yh + 0.06, s * env * 0.3, 0.52, 'y', centre);
    b(ab, [corde, 0.07, env * 0.88 / 2], toile('bas' + cote, ca), [x0, yb, s * env * 0.22]);
    // le train : la jambe et la roue
    const tr = out['train' + cote] = piece('train' + cote, [L * 0.12, -0.5, s * 0.6]);
    b(tr, [0.06, 0.9, 0.06], P.s, [L * 0.12, -0.95, s * 0.55], [s * 0.2, 0, 0]); A.cyl(tr, 0.33, 0.12, P.t, rel(tr, [L * 0.12, -1.38, s * 0.75]), 'z', 10);
  }
  return { pieces: out, helice, longueur: L, envergure: env };
}
export function biplan(A, o) {
  const { THREE } = A, g = new THREE.Group(), { pieces, helice, longueur, envergure } = biplanPieces(A, o);
  for (const p of Object.values(pieces)) g.add(p);
  return { groupe: g, helice, longueur, envergure };
}

// aux couleurs de leur camp (le bleu horizon pour nous, le vert kaki clair en face : on les lit de haut, sur n'importe quel sol)
export const AVIONS_OPTS = {
  spad: { L: 6.3, env: 8.1, corde: 1.4, ecart: 1.3, cc: P.n, ca: P.o },
  albatros: { L: 7.3, env: 9.0, corde: 1.4, ecart: 1.35, cc: P.x, ca: P.r, de: true },
};
export const AVIONS_JEU = { spad: A => biplan(A, AVIONS_OPTS.spad), albatros: A => biplan(A, AVIONS_OPTS.albatros) };
