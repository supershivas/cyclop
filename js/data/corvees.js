// Les corvées de la nuit : une par régiment (Jérôme, v0.6.0). La règle est dans
// js/nuit.js ; ici, ce qu'on en dit au joueur. `tranchee` : seulement pour un
// régiment qui tient une tranchée. `court` : le mot sous le nom du régiment (la carte, la nuit). `lignes` : son infobulle en tableau (libellé, valeur ; 18 nov. : jamais de bloc de texte).
// Quatre corvées (Jérôme, v0.38.3 : « il y en a trop » ; v0.77.1 : réparer, inhumer et les abris, « inutiles », sont retirés aussi) : docs/archives/corvees-retirees.md.
export const CORVEES = [
  { id: 'repos', court: 'Repos', nom: 'Repos', dit: 'la fatigue et la peur tombent, le moral remonte un peu plus',
    lignes: [['Fatigue', '**tombe**'], ['Peur', '**tombe**'], ['Moral', 'remonte **plus**']] },
  { id: 'evacuer', court: 'Évacuer', nom: 'Évacuer les blessés', dit: 'ils quittent le front, vivants ; un blessé laissé peut mourir dans la nuit',
    lignes: [['Blessés', '**quittent le front**, vivants'], ['Sans elle', 'un blessé peut mourir la nuit']] },
  { id: 'ravitailler', court: 'Vivres', nom: 'Ravitailler', dit: 'la soupe et le pain montent par les boyaux : des vivres pour trois nuits',
    lignes: [['Vivres', '**3** nuits'], ['Par', 'les boyaux']] },
  { id: 'releve', court: 'Relève', nom: 'Relève', dit: 'un régiment frais, pris dans la réserve (il n\'y en a pas d\'autre : un de moins pour la suite), prend sa place à l\'aube ; celui-ci part au repos',
    lignes: [['À l\'aube', '**un régiment frais** prend sa place'], ['Réserve', '**−1** régiment frais'], ['Celui-ci', 'part au repos']] },
  // l'équipement (Jérôme, v0.91.0) : la caserne au niveau 2 ; une corvée par pièce (`eq-` + sa clé dans EQUIPEMENTS de data/batiments.js), un point de dotation ; le régiment ne se repose pas
  { id: 'eq-casque', court: 'Casques', nom: 'Casques Adrian', dit: 'on lui distribue des casques : les éclats d\'obus tuent moins (1 point de dotation, et il ne se repose pas)', equipe: true,
    lignes: [['Éclats d\'obus', '**−20 %** de tués'], ['Coût', '**1** point'], ['Repos', 'aucun']] },
  { id: 'eq-grenades', court: 'Grenades', nom: 'Grenadiers', dit: 'une section de grenadiers : plus forts au corps à corps (1 point de dotation, et il ne se repose pas)', equipe: true,
    lignes: [['Corps à corps', '**+25 %** de coups'], ['Coût', '**1** point'], ['Repos', 'aucun']] },
  { id: 'eq-hotchkiss', court: 'Hotchkiss', nom: 'Mitrailleuses', dit: 'une section de Hotchkiss : son tir porte plus loin (1 point de dotation, et il ne se repose pas)', equipe: true,
    lignes: [['Portée du tir', '**+15 %**'], ['Coût', '**1** point'], ['Repos', 'aucun']] },
  { id: 'eq-brancards', court: 'Brancards', nom: 'Brancardiers', dit: 'des brancardiers : moins de blessés meurent au front, plus reviennent (1 point de dotation, et il ne se repose pas)', equipe: true,
    lignes: [['Blessés morts', '**−50 %**'], ['Guéris', '**+25 %**'], ['Coût', '**1** point'], ['Repos', 'aucun']] },
];
// Ce n'est pas un choix (Jérôme, v0.39.0) : un régiment au contact de l'ennemi au soir se bat toute la nuit, sans corvée ni vrai repos.
export const CONTACT = { id: 'contact', court: 'Au contact', nom: 'Au contact de l\'ennemi', dit: 'il tient sa place toute la nuit et ne se repose pas',
  lignes: [['Cette nuit', '**il se bat**'], ['Repos', 'aucun']] };
