// Les renforts (Jérôme, lot D des retours du 30 octobre) : un régiment frais sort de la caserne à tout moment du jour et prend le premier secteur sans défenseur,
// ou, s'il n'y en a pas, contre-attaque le secteur perdu le plus proche ; les fuyards se retirent vers la caserne et, assez nombreux, y forment une unité le lendemain.
export const RENFORTS = {
  perdu: 0.5,            // un secteur est perdu quand plus de cette part de sa tranchée est tenue par l'ennemi
  seuilRallies: 30,      // hommes ralliés à la caserne qu'il faut, au moins, pour former une unité à l'aube
  moralRallies: 0.6,     // le moral d'une unité de ralliés (un régiment frais part à `moral.depart`)
  rayonCaserne: 30,      // m : un fuyard à cette distance du centre de la caserne y est rentré
  intervalle: 30,        // pas entre deux relevés des fuyards arrivés (1 s)
  espacementSortie: 0.8, // m entre deux hommes qui sortent de la caserne
  derriere: 12,          // m : sans caserne dessinée (partie non bridée), le régiment frais monte à cette distance derrière la place
};
