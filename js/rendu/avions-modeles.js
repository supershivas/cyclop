// Les biplans en volumes (Jérôme, v0.55.0), sortis du labo (`labo-avions.js`, qui les reprend d'ici) pour que la bataille les dessine à l'échelle : 1 unité = 1 m, l'avant à +x,
// le haut à +y, la droite à +z. Dessin seulement. Le SPAD XIII français (8,1 m d'envergure) pour nous, l'Albatros D.V allemand (9 m) pour eux ; leurs marques sont celles de la palette
// (la cocarde française n'a pas son rond rouge hors du labo : aucune autre couleur dans le jeu).
import { PALETTE as P } from '../palette.js?v=0.73.0';

export function cocardeFr(A, g, x, y, z, r, axe, centre = P.n) { A.cyl(g, r, 0.025, P.n, [x, y, z], axe, 10); A.cyl(g, r * 0.66, 0.03, P.o, [x, y, z], axe, 10); A.cyl(g, r * 0.33, 0.035, centre, [x, y, z], axe, 10); }
export function croixPlate(A, g, x, y, z, t) {
  A.b(g, [t * 1.2, 0.03, t * 1.2], P.t, [x, y, z]); A.b(g, [t * 1.1, 0.04, t * 0.32], P.o, [x, y, z], [0, 0, 0], false); A.b(g, [t * 0.32, 0.04, t * 1.1], P.o, [x, y, z], [0, 0, 0], false);
}
export function biplan(A, o) {
  const { THREE } = A, g = new THREE.Group();
  const { centre = P.n, L = 6.3, env = 8.1, corde = 1.45, ecart = 1.35, cc = P.w, ca = P.h, triplan = false, de = false, rotatif = false, deuxPlaces = false, couleurMoteur = P.r } = o;
  // le fuselage : un profil plein, plus haut au moteur
  A.prisme(g, [[-L * 0.5, 0.05], [-L * 0.15, 0.4], [L * 0.2, 0.5], [L * 0.5, 0.45], [L * 0.5, -0.4], [L * 0.2, -0.5], [-L * 0.1, -0.35]], 0.62, cc);
  // le moteur : un capot rond (rotatif) ou long (en ligne), et l'hélice qui tourne
  const helice = new THREE.Group(); helice.position.set(L * 0.5 + (rotatif ? 0.42 : 0.1), 0, 0); g.add(helice);
  A.cyl(g, rotatif ? 0.52 : 0.3, rotatif ? 0.5 : 0.8, couleurMoteur, [L * 0.5 + (rotatif ? 0.2 : -0.1), 0, 0], 'x', 12);
  A.b(helice, [0.05, 2.2, 0.15], P.b, [0, 0, 0]); A.b(helice, [0.05, 0.15, 2.2], P.b, [0, 0, 0], [0, 0, 0], false);
  // les ailes
  const x0 = L * 0.08, yb = -0.5, yh = yb + ecart;
  const aile = (y, w, c) => { A.b(g, [corde, 0.07, w], c, [x0, y, 0]); };
  aile(yb, env * 0.88, ca); aile(yh, env, ca);
  if (triplan) { aile(yb + ecart * 0.5, env * 0.95, ca); }
  for (const s of [1, -1]) {
    for (const dx of [-corde * 0.32, corde * 0.32]) A.b(g, [0.05, ecart + 0.08, 0.05], P.s, [x0 + dx, yb + ecart / 2, s * env * 0.3]);            // les mâts
    A.b(g, [0.04, 0.9, 0.04], P.s, [x0 + 0.1, 0.1, s * 0.3], [s * 0.4, 0, 0.0]);                                                               // la cabane
    A.b(g, [0.5, 0.04, 1.0], ca, [x0, yh - 0.1, s * 0.0], [0, 0, 0], false);
  }
  // la queue
  A.b(g, [1.0, 0.05, 2.6], ca, [-L * 0.5 + 0.2, 0.15, 0]);
  A.prisme(g, [[0, 0], [1.0, 0], [0.55, 0.95], [0.1, 0.95]], 0.07, ca, [-L * 0.5 - 0.15, 0.15, 0]);
  // le train
  for (const s of [1, -1]) { A.b(g, [0.06, 0.9, 0.06], P.s, [L * 0.12, -0.95, s * 0.55], [s * 0.2, 0, 0]); A.cyl(g, 0.33, 0.12, P.t, [L * 0.12, -1.38, s * 0.75], 'z', 10); }
  A.b(g, [0.06, 0.06, 1.6], P.s, [L * 0.12, -1.38, 0]); A.b(g, [0.5, 0.05, 0.08], P.s, [-L * 0.5 - 0.1, -0.1, 0]);
  // les mitrailleuses, le poste de pilotage, l'observateur
  for (const s of [1, -1]) { A.b(g, [0.3, 0.1, 0.1], P.t, [L * 0.38, 0.55, s * 0.12]); A.cyl(g, 0.025, 0.6, P.t, [L * 0.38 + 0.4, 0.55, s * 0.12], 'x', 5); }
  A.b(g, [0.45, 0.1, 0.4], P.t, [L * 0.0, 0.5, 0]);
  if (deuxPlaces) { A.b(g, [0.5, 0.1, 0.4], P.t, [-L * 0.2, 0.42, 0]); A.cyl(g, 0.28, 0.06, P.s, [-L * 0.2, 0.55, 0], 'y', 8); A.cyl(g, 0.025, 0.7, P.t, [-L * 0.2 - 0.3, 0.6, 0], 'x', 5); }
  // les marques nationales
  for (const s of [1, -1]) {
    if (de) { A.croix(g, [-L * 0.3, 0.1, s * 0.32], 0.55); croixPlate(A, g, x0, yh + 0.06, s * env * 0.3, 0.85); }
    else { cocardeFr(A, g, -L * 0.3, 0.1, s * 0.32, 0.26, 'z', centre); cocardeFr(A, g, x0, yh + 0.06, s * env * 0.3, 0.52, 'y', centre); }
  }
  return { groupe: g, helice, longueur: L, envergure: env };
}

export const AVIONS_JEU = {
  // aux couleurs de leur camp (le bleu horizon pour nous, le vert kaki clair en face : on les lit de haut, sur n'importe quel sol)
  spad: A => biplan(A, { L: 6.3, env: 8.1, corde: 1.4, ecart: 1.3, cc: P.n, ca: P.o }),
  albatros: A => biplan(A, { L: 7.3, env: 9.0, corde: 1.4, ecart: 1.35, cc: P.x, ca: P.r, de: true }),
};
