// Les nombres du lecteur d'animations (js/lecteur-animations.js).
// Fondu entre deux animations d'un même canal : sans lui, la pose saute au coup de feu (Jérôme, 8 nov. : « un fondu de ~0,2 s »).
export const FONDU = 0.2;

// Un homme qui tire en marchant (réponse A de docs/chantiers/animations-vers-le-jeu.md) : les bras et le fusil viennent de l'animation de tir ;
// les jambes ET le buste restent à la marche (Jérôme, 8 nov. : « buste de la marche »), donc le canal `corps` n'est pas dans la liste.
// À l'arrêt, le tir prend tous les canaux (pieds plantés).
export const CANAUX_TIR_EN_MARCHE = ['brasG', 'brasD', 'fusil'];
