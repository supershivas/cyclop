// Le lecteur d'animations (étape 2 de docs/chantiers/animations-vers-le-jeu.md) : pour un homme, la pose complète à l'instant t.
// Logique pure (aucun DOM, aucune horloge : le temps est un argument), testée dans Node ; le jeu ne l'appelle pas encore (le nuanceur lit la pose à l'étape 3).
//
// L'appelant décrit ce qui doit jouer par des COUCHES, de la plus basse à la plus haute :
//   { anim: nom, depart: instant de début (s), vitesse = 1, canaux: ['jambeG', …] }   (`canaux` absent : tous ceux de CANAUX)
// Chaque canal prend la couche la plus haute qui le couvre. Un canal dont la source change (autre animation, ou même animation relancée : `depart` neuf)
// fond de la pose qu'il MONTRAIT vers la nouvelle en `fondu` secondes : un fondu interrompu repart de ce qui est à l'écran, la pose ne saute jamais.
// L'état d'un homme (`nouvelEtat()`) garde, par canal, la source, la pose montrée et l'instant du changement : il se jette avec l'homme, rien ne se sauvegarde.
import { CANAUX } from './data/poses-soldat.js?v=0.131.0';
import { echantillon, miroir } from './pose-soldat.js?v=0.131.0';
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

// La pose de l'homme à l'instant t (25 champs). Refuse à voix haute une animation inconnue.
// `gaucher` : le miroir, appliqué en sortie (l'état garde les poses de droitier, le même homme reste gaucher d'une image à l'autre).
export function etatAnimation(etat, couches, t, { animations, fondu = FONDU, gaucher = false } = {}) {
  const noms = parNom(animations), source = {}, echantillons = new Map();
  for (const couche of couches) {
    if (!noms.has(couche.anim)) throw new Error(`Animation inconnue : « ${couche.anim} ».`);
    for (const canal of couche.canaux ?? Object.keys(CANAUX)) {
      if (!CANAUX[canal]) throw new Error(`Canal inconnu : « ${canal} ».`);
      source[canal] = couche;
    }
  }
  const pose = {};
  for (const canal of Object.keys(CANAUX)) {
    const couche = source[canal];
    if (!couche) throw new Error(`Aucune couche ne joue le canal « ${canal} ».`);
    let cible = echantillons.get(couche);
    if (!cible) echantillons.set(couche, cible = echantillon(noms.get(couche.anim), tempsDe(couche, t)));
    const cle = `${couche.anim}@${couche.depart}`;
    let e = etat.canaux[canal];
    if (!e) e = etat.canaux[canal] = { cle, de: null, t0: t, montre: null };
    else if (e.cle !== cle) { e.de = e.montre; e.t0 = t; e.cle = cle; }
    const k = e.de && fondu > 0 ? lisse(Math.min(1, Math.max(0, (t - e.t0) / fondu))) : 1;
    if (k >= 1) e.de = null;
    const montre = {};
    for (const c of CANAUX[canal]) montre[c] = e.de ? e.de[c] + (cible[c] - e.de[c]) * k : cible[c];
    e.montre = montre;
    Object.assign(pose, montre);
  }
  return gaucher ? miroir(pose) : pose;
}
