// Un objet haut dans l'écran : le pied hors de l'écran, la cime dedans (v0.94.2, « les éléments au premier plan disparaissent »).
import { dansLEcran, profondeurALEcran } from '../js/rendu/vue-ecran.js';

// une projection simple : x et y d'écran = x et y du monde / 10 (w = 1) ; l'écran va de −1 à 1, soit de −10 à 10 m ; la marge verticale est de 30 %
const e = new Float32Array(16); e[0] = 0.1; e[5] = 0.1; e[10] = 1; e[15] = 1;
group('vue — un objet haut');
test('un arbre bien dans l\'écran, ou bien dehors : même réponse pour le pied seul et pour le pied et le sommet', () => {
  assert.equal(dansLEcran(e, 0, 0, 0), true); assert.equal(dansLEcran(e, 0, 0, 0, 9), true);
  assert.equal(dansLEcran(e, 0, 30, 0), false); assert.equal(dansLEcran(e, 0, 30, 0, 9), false);
  assert.equal(dansLEcran(e, 50, 0, 0, 9, 3), false);
});
test('le pied sous l\'écran (au-delà de la marge de 30 %) mais la cime dedans : l\'arbre reste (le pied seul le retirait)', () => {
  const pied = -14;                                   // pied à −14 m : sous l'écran (−10) et sous la marge (−13)
  assert.equal(dansLEcran(e, 0, pied, 0), false, 'le pied seul : retiré');
  assert.equal(dansLEcran(e, 0, pied, 0, 9), true, 'avec sa hauteur : sa cime monte à −5 m, dans l\'écran');
  assert.equal(dansLEcran(e, 0, pied, 0, 0.5), false, 'une touffe de 50 cm : sa cime reste sous la marge');
});
test('le pied au-dessus de l\'écran : rien ne monte plus bas ; la cime au-dessus aussi', () => {
  assert.equal(dansLEcran(e, 0, 14, 0, 9), false);
});
test('la marge de côté suit le rayon : un arbre juste hors de l\'écran dont la couronne y entre reste', () => {
  assert.equal(dansLEcran(e, 14, 0, 0, 9, 0), false);
  assert.equal(dansLEcran(e, 14, 0, 0, 9, 5), true);
});

group('vue — un homme (v0.142.3)');
test('un homme dont les pieds sont sous l\'écran mais le buste dedans reste, et rend sa profondeur', () => {
  // l'écran va de −10 à 10 m ; la marge du pied seul est de 15 % (−11,5 m)
  assert.equal(profondeurALEcran(e, 0, 0, 0), 1, 'au milieu : la profondeur (w)');
  assert.equal(profondeurALEcran(e, 0, -12, 0, 0), -1, 'sans hauteur, le pied seul : retiré');
  assert.equal(profondeurALEcran(e, 0, -12, 0, 2.3), 1, 'avec sa hauteur, la tête à −9,7 m : gardé');
  assert.equal(profondeurALEcran(e, 0, -14, 0, 2.3, 0), -1, 'la tête à −11,7 m, sans marge : retiré');
});
test('un homme hors de l\'écran au-dessus ou de côté est retiré ; la marge de côté le garde s\'il y entre', () => {
  assert.equal(profondeurALEcran(e, 0, 12, 0), -1);
  assert.equal(profondeurALEcran(e, 11.5, 0, 0, 2.3, 0), -1);
  assert.equal(profondeurALEcran(e, 11.5, 0, 0, 2.3, 2), 1);
});
test('ce que gardait l\'ancienne règle (le pied à 8 % et 15 % de marge) reste gardé', () => {
  for (const [x, y] of [[10.7, 0], [-10.7, 11.4], [0, -11.4], [10.7, -11.4]]) assert.ok(profondeurALEcran(e, x, y, 0, 0, 0) > 0, `${x}, ${y}`);
});
test('derrière la caméra : retiré', () => {
  const f = new Float32Array(e); f[11] = 1; f[15] = 0;      // w = z
  assert.equal(profondeurALEcran(f, 0, -20, -1), -1);
});
test('strict : sans la marge du pied (le choix des articulés)', () => {
  assert.equal(profondeurALEcran(e, 0, -11, 0, 0.5, 0.3), 1, 'dans la marge du pied : gardé');
  assert.equal(profondeurALEcran(e, 0, -11, 0, 0.5, 0.3, true), -1, 'strict : hors de l\'écran');
  assert.equal(profondeurALEcran(e, 0, -11, 0, 2, 0.3, true), 1, 'strict, la tête dans l\'écran');
});
