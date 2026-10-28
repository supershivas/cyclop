// Le fil de fer devant la 1re ligne (Jérôme, v0.98.0 : « les barbelés se détruisent aux bombardements ») : chaque tronçon de 1re ligne a un réseau, qui tient `pv` ; un obus qui tombe près du réseau l'abîme
// (plus fort au centre, nul au bord de `zone` × le rayon du calibre), à zéro il est coupé. Les nombres sont des propositions, à mesurer. Aucun fil ne se refait : c'est la bataille qui l'use.
export const FIL = {
  pv: 100,
  obus: { '75': 30, '155': 70, '220': 120 },
  zone: 1.1,
  decalage: 7.5,       // m devant l'axe de la tranchée (le dessin : `L.amp` + 6,5 à 9)
};
