// Les corvées de la nuit : une par régiment (Jérôme, v0.6.0). La règle est dans
// js/nuit.js ; ici, ce qu'on en dit au joueur. `tranchee` : seulement pour un
// régiment qui tient une tranchée.
export const CORVEES = [
  { id: 'repos', nom: 'Repos', dit: 'la fatigue et la peur tombent, le moral remonte un peu plus' },
  { id: 'reparer', nom: 'Réparer la tranchée', dit: 'les tronçons que les obus ont comblés sont recreusés', tranchee: true },
  { id: 'caillebotis', nom: 'Poser des caillebotis', dit: 'dans sa tranchée, la boue ne retient plus', tranchee: true },
  { id: 'inhumer', nom: 'Inhumer les morts', dit: 'les corps autour de lui ; dangereux au-delà de nos lignes' },
  { id: 'evacuer', nom: 'Évacuer les blessés', dit: 'ils quittent le front, vivants ; un blessé laissé peut mourir dans la nuit' },
  { id: 'abri', nom: 'Creuser des abris', dit: 'sous sa tranchée, à six mètres : les obus y tuent moins (trois nuits pour les finir ; un 220 les crève)', tranchee: true },
  { id: 'ravitailler', nom: 'Ravitailler', dit: 'la soupe et le pain montent par les boyaux : des vivres pour trois nuits' },
  { id: 'coup', nom: 'Coup de main', dit: 'les plus aguerris vont chercher des prisonniers en face ; certains n\'en reviennent pas' },
  { id: 'releve', nom: 'La relève', dit: 'un régiment frais, pris dans la réserve, prend sa place à l\'aube ; celui-ci part au repos' },
];
