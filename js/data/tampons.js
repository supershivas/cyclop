// Les tampons de la vue d'un soldat (Jérôme, 20 nov., v0.154.0 : « on doit avoir quelques informations lorsqu'on joue en FPS : un toast avec tampon quand on tue un ennemi, quand on est blessé,
// autres idées bienvenues ») : le mot du tampon, la ligne dessous ; `genre` : '' (l'encre), 'sang' (on tue, on est blessé), 'alerte' (la peur, la déroute). Le code (hud/tampons-fps.js) ne connaît que les clés.
export const TAMPONS = {
  abattu: { mot: 'Abattu', genre: 'sang' },                  // la ligne : son nom, où la balle l'a pris, combien depuis qu'on le mène
  touche: { mot: 'Touché', genre: '' },                      // la ligne : son nom, où
  blesse: { mot: 'Blessé', genre: 'sang' },
  terrifie: { mot: 'Terrifié', genre: 'alerte', ligne: 'Il tremble : le guidon aussi' },
  camarade: { mot: 'Un camarade tombe', genre: '' },         // la ligne : son nom
  deroute: { mot: 'En déroute', genre: 'alerte' },           // la ligne : le régiment lâche pied
  promu: { mot: 'Promu', genre: '' },                        // la ligne : son grade
  pris: { mot: 'Tranchée prise', genre: '' },
  perdu: { mot: 'Tranchée perdue', genre: 'alerte' },
};
// les blessures de l'homme qu'on mène : où, et ce que ça change (army.js, tir-joueur.js : le bras épaule moins vite et tremble, la jambe ralentit)
export const BLESSURES_FPS = { 1: 'Au bras : il tremble en épaulant', 2: 'À la jambe : il marche mal', 3: 'À la tête : le monde tourne' };
// le rythme : combien de temps un tampon reste (s), combien de tampons attendent au plus, l'écart entre deux « camarade » (s), la distance où l'on voit tomber un camarade, prendre une tranchée (m)
export const RYTHME_TAMPONS = { duree: 1.8, file: 3, camarade: 6, voisin: 12, tranchee: 40 };
