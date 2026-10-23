// Le génie militaire (Jérôme, v0.66.0 : « la réparation des ponts, une unité spécialisée comme les avions et les chars ») : une section de 20 hommes sans arme, 4 par camp,
// qu'on envoie refaire un pont coupé (bouton « Génie », touche 6, puis un clic sur l'ouvrage). Elle marche jusqu'à la rive ; le travail dure de 2 à 4 h de jeu selon le pont
// (`PONTS_HEURES`) avec 20 hommes, et va au prorata des hommes qui restent. Les chiffres sont des propositions, à mesurer.
export const GENIE = 'genie';
export const GENIE_DATA = {
  hommes: 20,         // la section au complet
  sections: 4,        // par camp ; une section qui a fini son travail rentre et peut repartir, une section anéantie est perdue
  recharge: 15,       // s entre deux départs
  vitesse: 1.6,       // m/s sur le terrain (des hommes chargés d'outils et de madriers)
  route: 4,           // m/s jusqu'à l'arrière de leur camp, sur la route
  rive: 1.5,          // m : à cette distance de la rive visée, ils commencent le travail
  zone: 0.8,          // × le rayon du calibre : la zone où un obus les touche
  obus: { '75': 0.5, '155': 0.8, '220': 1 },    // la part de la section couchée au centre du souffle
};
