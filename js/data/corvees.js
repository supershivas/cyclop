// Les corvées de la nuit : une par régiment (Jérôme, v0.6.0). La règle est dans
// js/nuit.js ; ici, ce qu'on en dit au joueur. `tranchee` : seulement pour un
// régiment qui tient une tranchée. `court` : le mot sous le nom du régiment (la carte, la nuit).
// Sept corvées (Jérôme, v0.38.3 : « il y en a trop ») : les caillebotis et le coup de main sont retirés (docs/archives/corvees-retirees.md).
export const CORVEES = [
  { id: 'repos', court: 'Repos', nom: 'Repos', dit: 'la fatigue et la peur tombent, le moral remonte un peu plus' },
  { id: 'reparer', court: 'Réparer', nom: 'Réparer la tranchée', dit: 'les tronçons que les obus ont comblés sont recreusés', tranchee: true },
  { id: 'inhumer', court: 'Inhumer', nom: 'Inhumer les morts', dit: 'les corps autour de lui ; dangereux au-delà de nos lignes' },
  { id: 'evacuer', court: 'Évacuer', nom: 'Évacuer les blessés', dit: 'ils quittent le front, vivants ; un blessé laissé peut mourir dans la nuit' },
  { id: 'abri', court: 'Abris', nom: 'Creuser des abris', dit: 'sous sa tranchée, à six mètres : les obus y tuent moins (trois nuits pour les finir ; un 220 les crève)', tranchee: true },
  { id: 'ravitailler', court: 'Vivres', nom: 'Ravitailler', dit: 'la soupe et le pain montent par les boyaux : des vivres pour trois nuits' },
  { id: 'releve', court: 'Relève', nom: 'La relève', dit: 'un régiment frais, pris dans la réserve, prend sa place à l\'aube ; celui-ci part au repos' },
];
// Ce n'est pas un choix (Jérôme, v0.39.0) : un régiment au contact de l'ennemi au soir se bat toute la nuit, sans corvée ni vrai repos.
export const CONTACT = { id: 'contact', court: 'Au contact', nom: 'Au contact de l\'ennemi', dit: 'il tient sa place toute la nuit et ne se repose pas' };
