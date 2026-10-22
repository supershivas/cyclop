// Le test de déterminisme (jeu à deux, lockstep) : la même graine et les mêmes ordres donnent-ils la même bataille, d'un moteur JavaScript à l'autre
// (Chrome, Firefox, Node) ? Module partagé par `determinisme.html` (à ouvrir dans chaque navigateur) et `outils/determinisme.mjs` (Node contre Chromium).
// Deux lectures : l'empreinte des fonctions mathématiques que la logique emploie (pour dire laquelle diverge), puis l'empreinte de l'état toutes les `pas` secondes.
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, photo, zone } from './bataille.js?v=0.53.0';
import { REGLAGES } from './data/reglages.js?v=0.53.0';

const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const tampon = new DataView(new ArrayBuffer(8));
const bits = x => { tampon.setFloat64(0, x); return tampon.getUint32(0).toString(16) + tampon.getUint32(4).toString(16); };

// Les fonctions que la logique emploie : sin, cos (bataille, nuit), hypot (partout), `**` fractionnaire (army.js : `** 1.5`) ; atan2, exp, log, pow, tan pour mémoire
export function empreinteMaths() {
  const F = {
    sin: x => Math.sin(x), cos: x => Math.cos(x), tan: x => Math.tan(x), atan2: x => Math.atan2(x, 1.3), exp: x => Math.exp(x / 1000), log: x => Math.log(x),
    pow: x => Math.pow(x, 1.5), 'puissance **': x => x ** 1.5, hypot: x => Math.hypot(x, x + 1.7), sqrt: x => Math.sqrt(x),
  };
  const out = {};
  for (const [nom, f] of Object.entries(F)) {
    let h = 2166136261;
    for (let k = 0; k < 20000; k++) h = fnv(h, bits(f(k * 0.0137 + 0.1)));
    out[nom] = h.toString(16);
  }
  return out;
}

/* Une bataille : la graine, les ordres du premier pas (une marche de chaque régiment, trois barrages), puis l'empreinte de l'état toutes les `pas` secondes. */
export function empreintesBataille({ graine = 7, secondes = 120, pas = 10, soldats = 200 } = {}) {
  const B = nouvelleBataille(graine, REGLAGES, { soldats, jours: 3 });
  const Z = zone(B);
  const nos = B.etat.regiments.filter(r => r.camp === 0).map(r => r.id);
  ordonnerMarche(B, nos.slice(0, 3), Z.x0 + 150, Z.y0 + 150);
  ordonnerBarrage(B, '155', Z.x0 + 200, Z.y0 + 120, 0);
  ordonnerBarrage(B, '75', Z.x0 + 120, Z.y0 + 180, 1);
  ordonnerBarrage(B, '220', Z.x0 + 280, Z.y0 + 170, 0);
  const points = [];
  for (let s = 1; s <= secondes * 30; s++) {
    avancer(B);
    if (s % (pas * 30) === 0) points.push([s / 30, fnv(2166136261, JSON.stringify(photo(B))).toString(16), B.armee.n, B.etat.pertes[0] + B.etat.pertes[1]]);
  }
  return points;
}
