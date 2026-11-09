// Les nombres du lecteur d'animations (js/lecteur-animations.js).
// Fondu entre deux animations d'un même canal : sans lui, la pose saute au coup de feu (Jérôme, 8 nov. : « un fondu de ~0,2 s »).
export const FONDU = 0.2;

// Un homme qui tire en marchant (réponse A de docs/chantiers/animations-vers-le-jeu.md) : les bras et le fusil viennent de l'animation de tir ;
// les jambes ET le buste restent à la marche (Jérôme, 8 nov. : « buste de la marche »), donc le canal `corps` n'est pas dans la liste.
// À l'arrêt, le tir prend tous les canaux (pieds plantés).
export const CANAUX_TIR_EN_MARCHE = ['brasG', 'brasD', 'fusil'];

// Qui joue quoi dans le jeu (étape 4 : js/rendu/animation-jeu.js). Les noms sont ceux de js/data/animations.js.
export const ANIM_JEU = { marche: 'marche (fusil à deux mains)', repos: 'repos (fusil à deux mains)', tir: 'tir (1 s, pieds plantés)' };
export const MARCHE_JEU = {
  seuil: 0.05,       // m/s au-dessus duquel l'homme marche (en dessous : le repos ; évite que le bruit de la vitesse alterne marche et repos)
  reference: 1,      // m/s où la marche se lit à vitesse normale (0,8 s la foulée, comme la phase 8 rad/s d'avant)
  lectureMin: 0.5, lectureMax: 1.6,       // bornes de la vitesse de lecture (un homme lent ne fige pas, un homme qui court ne bat pas des ailes)
  saut: 0.3,         // une montée de `tirVal` d'au moins cela d'une image à l'autre est un nouveau coup de feu (la retombée ne fait que 0,03 par image)
};
