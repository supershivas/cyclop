// Les objets posés d'un secteur (lot 3 de l'éditeur de carte) : des arbres, des buissons, des bois et des haies placés à la main, et des dégagements
// qui retirent ce que la graine avait planté. Logique pure. Mêmes coordonnées que `formes.js` (mètres du SECTEUR). Une liste d'objets :
//   degager : { o, x, y, r }          retire les arbres et buissons tirés de la graine à moins de r m ;
//   arbre, buisson : { o, x, y } ;    bois : { o, x, y, r } une tache d'arbres serrés (40 essais, comme les bois de la graine) ;
//   haie : { o, x, y, x2, y2 }        des buissons le long du segment, avec des trous.
// Les dégagements passent d'abord (ils ne touchent que ce que la graine a planté), puis les objets, dans l'ordre de la liste : sans hasard hors de `g`.
import { hash2 } from './lib/rng.js?v=0.90.0';
import { distanceForme } from './formes.js?v=0.90.0';

export const OBJETS = ['arbre', 'buisson', 'bois', 'haie', 'degager', 'lac', 'fleuve', 'pont', 'marecage'];       // (lac, fleuve, pont, marecage : eaux.js)

export function poserObjets({ arbres, buissons, W, H, ox, oy, g }, objets) {
  if (!objets || !objets.length) return;
  for (const O of objets) {
    if (O.o !== 'degager') continue;
    for (const liste of [arbres, buissons]) for (let k = liste.length - 1; k >= 0; k--) if (Math.hypot(liste[k].i + 0.5 - ox - O.x, liste[k].j + 0.5 - oy - O.y) < O.r) liste.splice(k, 1);
  }
  const dedans = (i, j, marge) => i >= marge && j >= marge && i < W - marge && j < H - marge;
  const arbre = (i, j) => { if (dedans(i, j, 2) && !arbres.some(t => t.i === i && t.j === j)) arbres.push({ i, j, v: Math.floor(hash2(i, j, g + 31) * 4), abattu: 0 }); };
  const buisson = (i, j) => { if (dedans(i, j, 2)) buissons.push({ i, j, v: Math.floor(hash2(i, j, g + 32) * 3), detruit: 0 }); };
  for (const O of objets) {
    const ci = Math.round(O.x + ox), cj = Math.round(O.y + oy);
    if (O.o === 'arbre') arbre(ci, cj);
    else if (O.o === 'buisson') buisson(ci, cj);
    else if (O.o === 'bois') {
      for (let k = 0; k < 40; k++) {
        const a = hash2(ci, cj * 2 + k, g + 33) * Math.PI * 2, d = Math.sqrt(hash2(ci * 2 + k, cj, g + 34)) * O.r;
        const i = Math.round(ci + Math.cos(a) * d), j = Math.round(cj + Math.sin(a) * d * 0.8);
        if (!arbres.some(t => Math.abs(t.i - i) + Math.abs(t.j - j) < 3)) arbre(i, j);
      }
    } else if (O.o === 'haie') {
      const dx = (O.x2 ?? O.x) - O.x, dy = (O.y2 ?? O.y) - O.y, long = Math.hypot(dx, dy);
      for (let s = 0; s <= long; s += 2 + Math.floor(hash2(ci, cj + Math.floor(s), g + 35) * 2)) {
        const i = Math.round(ox + O.x + dx * s / (long || 1)), j = Math.round(oy + O.y + dy * s / (long || 1));
        if (hash2(i, j, g + 11) >= 0.15) buisson(i, j);       // des trous dans la haie
      }
    }
  }
}
export { distanceForme as distanceObjet };
