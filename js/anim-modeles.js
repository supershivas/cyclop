// Des animations toutes faites du soldat articulé, point de départ de l'atelier (logique pure) : on les charge, on les retouche image par image.
// Elles sont construites avec les poses du jeu (`poseDe`), le fusil placé comme un corps (`pointFusil`) et la cinématique inverse des bras (`ikBras` : les mains posées sur le fusil).
// Tout est pour un tireur DROITIER ; le gaucher en est le miroir (`miroirAnimation` de js/anim-edition.js : le jeu en jouera le miroir pour environ 10 % des hommes).
import { poseNeutre, poseDe, ikBras, pointFusil, animation, articulations, CARRURE_NEUTRE } from './pose-soldat.js?v=0.144.2';
import { ALLURES, TIR_EPAULE, GESTES } from './data/lecteur-animations.js?v=0.144.2';

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

// La pose donnée, avec le fusil à deux mains : le fusil se place pour que sa crosse soit où il faut (des passes : le buste penché déplace un peu tout), puis les bras vont aux deux prises
export function porterArme(pose, car = CARRURE_NEUTRE, P = PORT_ARME, passes = 2) {      // (`passes` : 8 pour le tir épaulé, dont le buste tourné ralentit la convergence ; 2 pour les modèles figés dans data/animations.js)
  let p = { ...poseNeutre(), ...pose, fusil: P.flexion, fusilLacet: P.lacet, fusilRoulis: P.roulis, fusilX: 0, fusilZ: 0, fusilH: 0 };
  for (let n = 0; n < passes; n++) {
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

// ─── Les démarches (v0.141.2) : une allure par numéro, tirée dans les plages d'ALLURES (data/lecteur-animations.js) ───
// Un nombre de 0 à 1, toujours le même pour (n, k) (un hachage : aucun hasard, la même allure pour les deux joueurs)
function hachage(n, k) {
  let x = Math.imul(n + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
const entre = ([a, b], u) => a + (b - a) * u;

// L'allure n° n : sa foulée, sa cadence, son buste, son rebond, sa façon de porter le fusil, la jambe qu'il préfère, et comment il se tient au repos
export function allure(n, A = ALLURES) {
  const u = k => hachage(n, k);
  return {
    periode: entre(A.periode, u(1)), foulee: entre(A.foulee, u(2)), genou: entre(A.genou, u(3)), genouAppui: entre(A.genouAppui, u(4)),
    asymetrie: A.asymetrie * (2 * u(5) - 1), buste: entre(A.buste, u(6)), tete: entre(A.tete, u(7)),
    rebond: entre(A.rebond, u(8)), appui: entre(A.appui, u(9)), roulis: entre(A.roulis, u(10)), torsion: entre(A.torsion, u(11)),
    port: { ...PORT_ARME, flexion: entre(A.port.flexion, u(12)), lacet: entre(A.port.lacet, u(13)), crosse: [PORT_ARME.crosse[0], entre(A.port.crosseY, u(14)), PORT_ARME.crosse[2]] },
    repos: { cote: u(15) < 0.5 ? -1 : 1, appui: entre(A.repos.appui, u(16)), hanche: entre(A.repos.hanche, u(17)), genou: entre(A.repos.genou, u(18)),
      roulis: A.repos.roulis * (0.5 + u(19)), torsion: A.repos.torsion * (2 * u(20) - 1) },
    vivant: { periode: entre(A.vivant.periode, u(21)), souffle: entre(A.vivant.souffle, u(22)), balance: entre(A.vivant.balance, u(23)), tete: entre(A.vivant.tete, u(24)), regard: entre(A.vivant.regard, u(25)), prise: entre(A.vivant.prise, u(26)) },
  };
}

// La foulée d'une allure, en `images` images clés : les jambes (la gauche passe quand cos φ > 0, la droite porte), le fusil à deux mains placé sur ce corps-là
// (`porterArme` : la crosse à la hanche droite, les mains aux deux prises), puis ce qui bouge tout le haut d'un bloc et laisse donc les mains sur le fusil :
// le rebond (bas quand les jambes sont écartées), le poids sur la jambe qui porte (appui, roulis), les épaules contre les hanches (torsion)
export function marcheAllure(a, nom, { images = ALLURES.images } = {}) {
  const I = [];
  for (let i = 0; i < images; i++) {
    const phi = 2 * Math.PI * i / images, sn = Math.sin(phi), cs = Math.cos(phi), p = { ...poseNeutre(), buste: a.buste, tete: a.tete };
    for (const [g, sg] of [['G', 1], ['D', -1]]) {
      const amp = a.foulee * (1 + sg * a.asymetrie), hip = sg * sn * amp, kn = a.genou * Math.max(0, sg * cs) + a.genouAppui * Math.max(0, -sg * cs) * Math.abs(sn);
      p['hanche' + g] = hip; p['genou' + g] = kn; p['cheville' + g] = (kn - hip) * 0.8;
    }
    const port = porterArme(p, CARRURE_NEUTRE, a.port);
    I.push({ t: i * a.periode / images, courbe: 'lineaire', pose: { ...port, descente: a.rebond * sn * sn, appui: a.appui * cs, roulis: -a.roulis * cs, torsion: -a.torsion * sn } });
  }
  return animation(nom, I, { mode: 'boucle', duree: a.periode });
}

// Le repos d'une allure : le poids sur une jambe (`cote` : −1 la gauche, 1 la droite), l'autre genou un peu plié, le fusil à deux mains
export function reposAllure(a, nom) {
  const r = a.repos, libre = r.cote > 0 ? 'G' : 'D', p = { ...poseNeutre(), buste: a.buste * 0.4, tete: a.tete * 0.5 };
  p['hanche' + libre] = r.hanche; p['genou' + libre] = r.genou; p['cheville' + libre] = (r.genou - r.hanche) * 0.8;
  const port = porterArme(p, CARRURE_NEUTRE, a.port);
  return animation(nom, [{ t: 0, courbe: 'doux', pose: { ...port, appui: r.cote * r.appui, roulis: -r.cote * r.roulis, torsion: r.torsion } }], { mode: 'boucle', duree: 1 });
}

// Le repos vivant d'une allure : une boucle où il respire, se balance, passe le poids d'une jambe sur l'autre, baisse et relève la tête, jette un coup d'œil de chaque côté et rajuste sa prise ;
// à chaque image, le fusil est replacé et les mains vont dessus (`porterArme`), puis le balancement, le poids et le coup d'œil s'ajoutent d'un bloc (les mains restent)
export function reposVivant(a, nom, { images = ALLURES.vivant.images } = {}) {
  const r = a.repos, V = a.vivant, T = 2 * Math.PI, I = [];
  for (let i = 0; i < images; i++) {
    const u = i / images, s = Math.max(-1, Math.min(1, 1.6 * Math.sin(T * u) * r.cote));      // le poids : sur la jambe droite quand s > 0
    const p = { ...poseNeutre(), buste: a.buste * 0.4 + V.souffle * Math.sin(T * 3 * u), tete: a.tete * 0.5 + V.tete * Math.sin(T * u + 2) };
    for (const [g, f] of [['G', Math.max(0, s)], ['D', Math.max(0, -s)]]) { p['hanche' + g] = r.hanche * f; p['genou' + g] = r.genou * f; p['cheville' + g] = (r.genou - r.hanche) * f * 0.8; }
    const port = porterArme(p, CARRURE_NEUTRE, { ...a.port, flexion: a.port.flexion + V.prise * Math.sin(T * 2 * u + 0.3), roulis: a.port.roulis + 0.7 * V.prise * Math.cos(T * 2 * u + 0.3) });
    I.push({ t: u * V.periode, courbe: 'lineaire', pose: { ...port, appui: s * r.appui + V.balance * Math.sin(T * 2 * u + 1), roulis: -s * r.roulis, torsion: r.torsion + V.regard * Math.sin(T * u + 0.7) ** 3 } });
  }
  return animation(nom, I, { mode: 'boucle', duree: V.periode });
}

// Un geste d'attente d'une allure (GESTES de data/lecteur-animations.js : 'froid', 'pluie', 'guetteur', 'gestes') : le repos vivant adouci, et le geste par-dessus ;
// le fusil replacé à chaque image (`porterArme`), puis la main gauche menée là où le geste la veut (`ikBras` : la poignée, le bord du casque, la bouche), le fusil restant dans la main droite
export function reposGeste(a, nom, geste) {
  const G = GESTES[geste], r = a.repos, V = a.vivant, k = G.vivant, T = 2 * Math.PI, I = [], car = CARRURE_NEUTRE;
  const fen = (u, [d0, d1]) => { const e = GESTES.rampe, x = Math.min((u - d0) / e, (d1 - u) / e); return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); };
  const plusFen = (u, L) => Math.min(1, L.reduce((m, f) => m + fen(u, f), 0));
  const mel = (x, y, w) => [x[0] + (y[0] - x[0]) * w, x[1] + (y[1] - x[1]) * w, x[2] + (y[2] - x[2]) * w];
  for (let i = 0; i < G.images; i++) {
    const u = i / G.images, t = u * G.duree, s = Math.max(-1, Math.min(1, 1.6 * Math.sin(T * u) * r.cote)) * k;
    const p = { ...poseNeutre(), buste: a.buste * 0.4 + k * V.souffle * Math.sin(T * 3 * u), tete: a.tete * 0.5 + k * V.tete * Math.sin(T * u + 2) };
    for (const [g, f] of [['G', Math.max(0, s)], ['D', Math.max(0, -s)]]) { p['hanche' + g] = r.hanche * f; p['genou' + g] = r.genou * f; p['cheville' + g] = (r.genou - r.hanche) * f * 0.8; }
    let torsion = r.torsion + k * V.regard * Math.sin(T * u + 0.7) ** 3, mainG = null;
    if (geste === 'froid') {
      p.tete += G.tete; p.buste += G.buste;
      const w = plusFen(u, G.pieds.fenetres), ph = Math.sin(T * G.pieds.frequence * t);
      for (const [g, sg] of [['G', 1], ['D', -1]]) { const l = w * Math.max(0, sg * ph); p['hanche' + g] += G.pieds.hanche * l; p['genou' + g] += G.pieds.genou * l; p['cheville' + g] = (p['genou' + g] - p['hanche' + g]) * 0.8; }
    } else if (geste === 'pluie') { p.tete += G.tete; p.buste += G.buste; }
    else if (geste === 'guetteur') {
      const h = fen(u, G.debout), th = G.baisse * (1 - h);
      p.hancheG = p.hancheD = th; p.genouG = p.genouD = 2 * th; p.chevilleG = p.chevilleD = th;
      p.descente = 0.82 * (1 - Math.cos(th)); p.buste = G.busteBas * (1 - h) + p.buste * h; p.tete = G.teteBas * (1 - h) + G.teteDebout * h;
      torsion = h * G.regard * Math.sin(T * 2.5 * (u - G.debout[0]) / (G.debout[1] - G.debout[0]));
    }
    const port = porterArme(p, car, a.port);
    if (geste === 'froid') {
      const w = plusFen(u, G.mains.fenetres), poignee = pointFusil(port, car, a.port.mainDroite);
      if (w > 0) mainG = mel(pointFusil(port, car, a.port.mainGauche), [poignee[0] - 0.07, poignee[1] + 0.03 + G.mains.ampleur * Math.sin(T * G.mains.frequence * t), poignee[2] + 0.07], w);
    } else if (geste === 'gestes') {
      const J = articulations(port, car), fut = pointFusil(port, car, a.port.mainGauche), wc = fen(u, G.casque), wb = fen(u, G.bouche);
      if (wc > 0) mainG = mel(fut, [J.crane.pos[0] - 0.12, J.crane.pos[1] - 0.05 + 0.015 * Math.sin(T * 3 * t), J.crane.pos[2] + 0.03], wc);
      else if (wb > 0) mainG = mel(fut, [J.tete.pos[0] - 0.02, J.tete.pos[1] + 0.07, J.tete.pos[2] + 0.13], wb);
    }
    const pose = mainG ? { ...port, ...ikBras(port, car, 'G', mainG) } : port;
    I.push({ t, courbe: 'lineaire', pose: { ...pose, appui: s * r.appui + k * V.balance * Math.sin(T * 2 * u + 1), roulis: -s * r.roulis, torsion } });
  }
  return animation(nom, I, { mode: 'boucle', duree: G.duree });
}

// Le tir épaulé (les démarches) : la crosse posée au creux de l'épaule (`porterArme` avec TIR_EPAULE : la crosse là, les mains sur le fusil), la tête baissée sur elle ;
// le fusil se lève en 0,2 s, le coup et son recul à 0,26 s (EPAULEMENT.avance : l'homme épaule avant son coup pour que le recul tombe avec l'éclair), la visée tenue, puis le fusil revient à la charge
export function tirEpaule({ duree = 1, nom = 'tir épaulé' } = {}) {
  const T = TIR_EPAULE, jambes = JAMBES_TIR, port = porterArme({ ...poseNeutre(), ...jambes });
  // la crosse là où est l'épaule droite une fois le buste penché et l'épaule gauche avancée ; le lacet défait la torsion (le canon reste droit devant)
  const viser = (buste, flexion, dz) => { const base = { ...poseNeutre(), ...jambes, buste, tete: T.tete, torsion: T.torsion }, ep = articulations(base).epauleD.pos;
    return porterArme(base, CARRURE_NEUTRE, { ...T, flexion, lacet: -T.torsion, crosse: [ep[0] + T.crosse[0], ep[1] + T.crosse[1], ep[2] + T.crosse[2] + dz] }, 8); };
  const epaule = viser(T.buste, T.flexion, 0), recul = viser(T.buste + T.reculBuste, T.flexion + T.reculFlexion, T.reculZ);
  const k = (t, pose, courbe) => ({ t: t * duree, pose, courbe });
  return animation(nom, [k(0, port, 'sortie'), k(0.2, epaule, 'entreesortie'), k(0.26, recul, 'sortie'), k(0.42, epaule, 'doux'), k(0.8, epaule, 'entreesortie'), k(1, port, 'doux')], { mode: 'unefois', duree });
}

// Les `nombre` allures : { animations (à ajouter à celles du jeu), marche: [noms], repos: [noms] } (le rang k d'un homme : son numéro modulo `nombre`)
export function allures(nombre = ALLURES.nombre, { vivant = false, geste = null } = {}) {      // (`geste` : un geste d'attente de GESTES à la place du repos, au labo)      // (`vivant` : le repos vivant, une boucle, au lieu de la pose tenue)
  const animations = [tirEpaule()], marche = [], repos = [];
  for (let n = 0; n < nombre; n++) {
    const a = allure(n), m = `marche · allure ${n + 1}`, r = `repos · allure ${n + 1}`;
    animations.push(marcheAllure(a, m), geste ? reposGeste(a, r, geste) : vivant ? reposVivant(a, r) : reposAllure(a, r)); marche.push(m); repos.push(r);
  }
  return { animations, marche, repos, tir: 'tir épaulé' };
}

// Le catalogue de l'atelier
export const MODELES = [
  { id: 'marche-fusil', nom: 'Marche, fusil à deux mains', creer: marcheFusil },
  { id: 'tir', nom: 'Tir de 1 s, pieds plantés', creer: tir },
  { id: 'repos-fusil', nom: 'Repos, fusil à deux mains', creer: reposFusil },
];
