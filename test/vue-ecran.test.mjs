// Un objet haut dans l'écran : le pied hors de l'écran, la cime dedans (v0.94.2, « les éléments au premier plan disparaissent »).
import { dansLEcran } from '../js/rendu/vue-ecran.js';

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
