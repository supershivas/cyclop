// Le décor de l'écran titre (sorti de main.js, lot de dette du 24 nov.) : une bataille d'illustration, jamais sauvegardée.
// `creerDecor({ R, rendu })` rend { pas(dt), montrer() } ; `Math.random` est permis ici : rien de ce hasard n'entre dans une règle.
import { nouvelleBataille, avancer, ordonnerBarrage, PAS } from '../bataille.js?v=0.170.5';
import { NOMS_CALIBRES } from '../data/calibres.js?v=0.170.5';
import { SAISONS } from '../data/meteo.js?v=0.170.5';
import { hash2 } from '../lib/rng.js?v=0.170.5';

let R, rendu;
export function creerDecor(ctx) {
  ({ R, rendu } = ctx);
  return { pas: decorPas, montrer: montrerDecor };
}

/* Derrière l'écran titre, le moteur du jeu (Jérôme, v0.8.1) : une bataille de décor, jamais sauvegardée. Un
   no man's land labouré et gorgé de pluie, des morts, l'heure arrêtée au coucher du soleil (ombres longues, le
   soir qui tombe), des obus au loin et une fumée dense. La caméra au ras du sol, et une image différente à
   chaque lancement : la graine, le lieu, la direction, l'heure (Jérôme, v0.8.2). L'aspect seulement : le
   hasard d'ici n'entre dans aucune règle. */
let D = null, decorT = 0, decorObus = 0, decorVue = null;
function decor() {
  if (D) return D;
  const hasard = Math.random;
  // un champ neuf (ni cratères ni morts : les obus qui tombent le creusent peu à peu), la saison, le temps et l'heure tirés au hasard (Jérôme, v0.59.1)
  const saison = ['printemps', 'ete', 'automne', 'hiver'][Math.floor(hasard() * 4)], temps = Object.keys(SAISONS[saison].transitions);
  D = nouvelleBataille(Math.floor(hasard() * 100000), R, { soldats: 240, saison, largages: false, caprices: false });      // (une illustration : pas de caisse parachutée ; son heure figée ferait tomber un avion à chaque image)
  const m = D.etat.marges;
  // le lieu (dans le secteur), la direction (n'importe laquelle), la hauteur (quelques mètres), l'heure (de 7 h à 17 h 45)
  decorVue = {
    cx: m.x + 80 + hasard() * 240, cz: m.y + 70 + hasard() * 160,
    yaw: hasard() * Math.PI * 2, tangage: 0.045 + hasard() * 0.04,
    sens: hasard() < 0.5 ? -1 : 1, heure: 7 + hasard() * 10.75,
  };
  D.etat.meteo[0] = temps[Math.floor(hasard() * temps.length)];
  return D;
}
// l'heure du décor, arrêtée
const tickDecor = h => Math.round(R.jour.duree / PAS * (h - R.jour.heureDebut) / (R.jour.heureFin - R.jour.heureDebut));
function decorPas(dt) {
  const d = decor(), v = decorVue;
  decorT += dt;
  d.etat.tickJour = tickDecor(v.heure);
  // des obus, devant la caméra, au loin
  if ((decorObus -= dt) < 0) {
    decorObus = 0.6 + Math.random() * 1.4;
    const loin = 60 + Math.random() * 160, cote = (Math.random() - 0.5) * 140;
    const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
    ordonnerBarrage(d, NOMS_CALIBRES[Math.floor(Math.random() * 3)], rendu.vue.cx + fx * loin - fz * cote, rendu.vue.cz + fz * loin + fx * cote, 1);
  }
  const ev = avancer(d);
  // la fumée dense : des colonnes qui montent de quelques trous et dérivent avec le vent
  for (let k = 0; k < 10; k++) {
    if (Math.random() > 0.35) continue;
    rendu.fumer(v.cx - 140 + hash2(k, 11, 3) * 280, v.cz - 140 + hash2(k, 12, 3) * 280);
  }
  // la vue glisse lentement de côté, et revient
  const g = Math.sin(decorT * 0.03) * 40 * v.sens;
  rendu.vue.cx = v.cx + Math.cos(v.yaw) * g;
  rendu.vue.cz = v.cz - Math.sin(v.yaw) * g;
  return ev;
}
function montrerDecor() {
  decor();
  rendu.decor = true;                              // une illustration : aucun repère d'interface (la lettre du capitaine), et aucun son hors la musique (Jérôme, v0.100.0)
  rendu.survoler(-1, []); rendu.choisis = new Set();
  rendu.bord = null;                               // l'écran titre garde le ciel de brume
  rendu.attacher(D);
  rendu.vue.zoom = 4;
  rendu.cameraLibre(decorVue.yaw, decorVue.tangage);
  decorObus = 0.5;
}
