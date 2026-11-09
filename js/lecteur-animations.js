// Le lecteur d'animations (étape 2 de docs/chantiers/animations-vers-le-jeu.md) : pour un homme, la pose complète à l'instant t.
// Logique pure (aucun DOM, aucune horloge : le temps est un argument), testée dans Node ; le jeu ne l'appelle pas encore (le nuanceur lit la pose à l'étape 3).
//
// L'appelant décrit ce qui doit jouer par des COUCHES, de la plus basse à la plus haute :
//   { anim: nom, depart: instant de début (s), vitesse = 1, canaux: ['jambeG', …], cle? }   (`canaux` absent : tous ceux de CANAUX ; `cle` : l'identité de la source, par défaut anim@depart)
// Chaque canal prend la couche la plus haute qui le couvre. Un canal dont la source change (autre animation, ou même animation relancée : `depart` neuf)
// fond de la pose qu'il MONTRAIT vers la nouvelle en `fondu` secondes : un fondu interrompu repart de ce qui est à l'écran, la pose ne saute jamais.
// L'état d'un homme (`nouvelEtat()`) garde, par canal, la source, la pose montrée et l'instant du changement : il se jette avec l'homme, rien ne se sauvegarde.
import { CANAUX, NOMS_CHAMPS, COURBES } from './data/poses-soldat.js?v=0.131.0';
import { poseNeutre, modeDe, miroir } from './pose-soldat.js?v=0.131.0';
import { FONDU } from './data/lecteur-animations.js?v=0.131.0';

export const nouvelEtat = () => ({ canaux: {} });

const index = new WeakMap();         // tableau d'animations → { nom → animation } (un tableau publié ne change pas pendant la partie)
function parNom(animations) {
  let m = index.get(animations);
  if (!m) { m = new Map(animations.map(a => [a.nom, a])); index.set(animations, m); }
  return m;
}

// Le temps lu dans une animation par une couche (la vitesse de lecture le dilate)
const tempsDe = (couche, t) => (t - couche.depart) * (couche.vitesse ?? 1);

// Vrai quand une animation jouée une seule fois est arrivée au bout (l'homme qui tire « laisse finir » son tir, puis l'appelant retire la couche)
export function termine(animation, couche, t) { return tempsDe(couche, t) >= animation.duree; }

const lisse = k => k * k * (3 - 2 * k);

const NOMS_CANAUX = Object.keys(CANAUX), N = NOMS_CHAMPS.length;
const CANAL_IDX = NOMS_CANAUX.map(k => CANAUX[k].map(c => NOMS_CHAMPS.indexOf(c)));

// ─── le cœur, en tableaux (250 hommes par image dans le jeu : des objets à 25 champs coûtaient 1,1 à 1,4 ms, les tableaux bien moins) ───
// Une animation devient une table de poses PLEINES (25 nombres par image clé, dans l'ordre de NOMS_CHAMPS) ; `echantillonTab` fait exactement le calcul de `echantillon` (pose-soldat.js), à l'arrondi près.
const tables = new WeakMap();
function table(anim) {
  let T = tables.get(anim);
  if (!T) {
    const I = anim.images, neutre = poseNeutre(), p = new Float64Array(Math.max(1, I.length) * N);
    I.forEach((im, n) => NOMS_CHAMPS.forEach((c, j) => { p[n * N + j] = im.pose[c] ?? neutre[c]; }));
    NOMS_CHAMPS.forEach((c, j) => { if (!I.length) p[j] = neutre[c]; });
    T = { p, courbes: I.map(im => COURBES[im.courbe] ?? COURBES.doux) };
    tables.set(anim, T);
  }
  return T;
}
export function echantillonTab(anim, t, sortie = new Float64Array(N)) {
  const I = anim.images, { p, courbes } = table(anim), n = I.length;
  const copie = a => { for (let j = 0; j < N; j++) sortie[j] = p[a * N + j]; return sortie; };
  const seg = (a, b, largeur, dt) => {
    const k = largeur > 1e-9 ? Math.min(1, Math.max(0, dt / largeur)) : 1, w = courbes[a](k);
    for (let j = 0; j < N; j++) { const x = p[a * N + j]; sortie[j] = x + (p[b * N + j] - x) * w; }
    return sortie;
  };
  if (n <= 1) return copie(0);
  const D = Math.max(1e-6, anim.duree), mode = modeDe(anim), boucle = mode === 'boucle';
  if (boucle) t = ((t % D) + D) % D;
  else if (mode === 'allerretour') { const T2 = 2 * D; t = ((t % T2) + T2) % T2; if (t > D) t = T2 - t; }
  else t = Math.min(Math.max(t, 0), D);
  const dernier = I[n - 1];
  if (t <= I[0].t) return boucle ? seg(n - 1, 0, D - dernier.t, t + D - dernier.t) : copie(0);
  for (let i = 0; i < n - 1; i++) if (t < I[i + 1].t) return seg(i, i + 1, I[i + 1].t - I[i].t, t - I[i].t);
  return boucle ? seg(n - 1, 0, D - dernier.t, t - dernier.t) : copie(n - 1);
}

const cibles = Array.from({ length: 8 }, () => new Float64Array(N)), faite = new Uint8Array(8);       // une pose cible par couche, le temps d'un appel

// La pose de l'homme à l'instant t, dans `etat.pose` (Float64Array de 25, dans l'ordre de NOMS_CHAMPS), réécrite à chaque appel : copie-la pour la garder. Refuse à voix haute une animation inconnue.
export function etatAnimationTab(etat, couches, t, { animations, fondu = FONDU } = {}) {
  const noms = parNom(animations), src = etat.src ??= new Int8Array(NOMS_CANAUX.length), pose = etat.pose ??= new Float64Array(N);
  if (couches.length > cibles.length) throw new Error(`Trop de couches : ${couches.length}.`);
  src.fill(-1); faite.fill(0);
  for (let n = 0; n < couches.length; n++) {
    const couche = couches[n];
    if (!noms.has(couche.anim)) throw new Error(`Animation inconnue : « ${couche.anim} ».`);
    if (couche.canaux) for (const canal of couche.canaux) {
      const m = NOMS_CANAUX.indexOf(canal);
      if (m < 0) throw new Error(`Canal inconnu : « ${canal} ».`);
      src[m] = n;
    } else src.fill(n);
  }
  for (let m = 0; m < NOMS_CANAUX.length; m++) {
    const canal = NOMS_CANAUX[m], n = src[m], idx = CANAL_IDX[m];
    if (n < 0) throw new Error(`Aucune couche ne joue le canal « ${canal} ».`);
    const couche = couches[n];
    if (!faite[n]) { echantillonTab(noms.get(couche.anim), tempsDe(couche, t), cibles[n]); faite[n] = 1; }
    const cible = cibles[n], cle = couche.cle ?? `${couche.anim}@${couche.depart}`;
    let e = etat.canaux[canal];
    if (!e) e = etat.canaux[canal] = { cle, fond: false, de: null, t0: t };
    else if (e.cle !== cle) {       // la source change : on fond depuis ce qui est à l'écran (`pose`, pas encore réécrite)
      e.de ??= new Float64Array(N);
      for (const j of idx) e.de[j] = pose[j];
      e.fond = true; e.t0 = t; e.cle = cle;
    }
    let k = 1;
    if (e.fond) { if (fondu > 0) { k = (t - e.t0) / fondu; k = lisse(k < 0 ? 0 : k > 1 ? 1 : k); } if (k >= 1) e.fond = false; }
    if (e.fond) for (const j of idx) pose[j] = e.de[j] + (cible[j] - e.de[j]) * k;
    else for (const j of idx) pose[j] = cible[j];
  }
  return pose;
}

// La même pose en objet { champ: valeur } (25 champs), pour l'atelier et les tests. `gaucher` : le miroir, appliqué en sortie (l'état garde les poses de droitier, le même homme reste gaucher d'une image à l'autre).
export function etatAnimation(etat, couches, t, { animations, fondu = FONDU, gaucher = false } = {}) {
  const P = etatAnimationTab(etat, couches, t, { animations, fondu }), pose = {};
  for (let j = 0; j < N; j++) pose[NOMS_CHAMPS[j]] = P[j];
  return gaucher ? miroir(pose) : pose;
}
