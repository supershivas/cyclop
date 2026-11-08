/* La ronde des gardes d'un bâtiment du camp (Jérôme, v0.130.0 : « les soldats qui montent la garde ont l'animation de marche générique et un chemin réaliste (une tour), surtout ne pas traverser de murs »).
   Logique pure, sans hasard ni horloge : un rectangle qui entoure l'emprise du bâtiment à `marge` mètres (les murs, les baraques, la clôture de l'aérodrome sont à l'intérieur de l'emprise ou à 2 m
   au plus de son bord), parcouru à vitesse constante. Les coordonnées sont celles du bâtiment (centre en 0, 0 ; l'avant à −z). */
export const RONDE = {
  marge: 2.4,              // m entre l'emprise et le chemin
  margeAerodrome: 3.4,     // m : la clôture de fil de fer de l'aérodrome déborde de 2 m de l'emprise
  vitesse: [1.0, 1.35],    // m/s : un pas de promenade, un peu différent d'un garde à l'autre
  foulee: 1.4,             // m : un cycle complet (pied gauche, pied droit) ; la phase des jambes suit la distance parcourue, donc les pieds ne glissent pas
  lisse: 0.9,              // m : le cap se lit entre deux points du chemin de part et d'autre : le virage aux coins est progressif
};

/* Le demi-côté du rectangle de la ronde d'un bâtiment de largeur `w` et de profondeur `d` */
export const demiRonde = (w, d, cle) => { const m = cle === 'aerodrome' ? RONDE.margeAerodrome : RONDE.marge; return [w / 2 + m, d / 2 + m]; };
export const longueurRonde = (hx, hz) => 4 * (hx + hz);

/* Le point du chemin à l'abscisse `s` (en mètres, qui boucle) : [x, z] */
export function pointRonde(hx, hz, s) {
  const L = longueurRonde(hx, hz), a = 2 * hx, b = 2 * hz;
  s = ((s % L) + L) % L;
  if (s < a) return [-hx + s, -hz];
  s -= a; if (s < b) return [hx, -hz + s];
  s -= b; if (s < a) return [hx - s, hz];
  s -= a; return [-hx, hz - s];
}
