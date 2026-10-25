// La campagne (Jérôme, cadrage v0.36.3) : trois batailles de suite, de plus en plus dures (« la première, nous sommes en surnombre et le
// terrain est à nous, puis ça évolue »). `forces` : nos hommes pour un des leurs (1,3 : nous plus nombreux ; 0,77 : eux plus nombreux) ;
// `ia` : facteurs de la durée entre deux actions de l'IA d'en face (plus de 1 : plus calme ; moins de 1 : plus souvent).
// `jours` : la durée de chaque bataille (Jérôme, v0.36.3 : sept jours, environ deux heures la campagne ; la bataille 1 coûte 151 morts au lieu de 359 à quinze jours,
// la 2 en coûte à peu près autant, 886 contre 938 : mesuré, scripts/mesure-campagne.mjs). Le rapport de forces de la 2 reste la parité (la 1,25 ne sauve que ~85 hommes).
// Les autres nombres sont des PROPOSITIONS, à régler d'après la mesure.
// `saison` : imposée par l'étape (Jérôme, v0.53.0 : été, automne, hiver ; le joueur ne la change pas, elle l'emporte sur celle de la carte).
export const CAMPAGNE = {
  longueur: 3,
  batailles: [
    { secteur: 'essai', mission: 'tenir', forces: 1.3, jours: 7, saison: 'ete', ia: { barrage: 1.4, offensive: 1.4 } },        // les labours : le terrain est à nous
    { secteur: 'crete', forces: 1, jours: 7, saison: 'automne', ia: { barrage: 1, offensive: 1 } },            // la crête : ils la tiennent
    { secteur: 'marais', forces: 0.77, jours: 7, saison: 'hiver', ia: { barrage: 0.7, offensive: 0.7 } },      // le marais : la boue, et ils sont plus nombreux
  ],
  // la mission de la 2e et de la 3e dépend de l'issue de la précédente (Jérôme, v0.36.4) : une victoire ouvre l'offensive, une défaite oblige à tenir ; l'ordre des secteurs est fixe
  missionSelonIssue: { reussie: 'prendre', manquee: 'tenir' },
  regimentsMin: 4,                              // sous quatre régiments encore debout, la campagne finit (repli, pas de victoire claironnée)
  hommesMin: 20,                                // un régiment est « debout » à vingt survivants au moins (un cinquième de 94) : avec un seul homme, le nom n'est plus qu'un nom
};

// Les cartes d'origine de chaque bataille (ce que l'atelier remet quand on retire une carte de la campagne)
export const SECTEURS_ORIGINE = CAMPAGNE.batailles.map(b => b.secteur);

// Les mots de la fin (Jérôme, cadrage v0.36.3 : « le secteur suivant », pas de victoire claironnée ; DESIGN.md : le compteur de morts n'est jamais une récompense).
// Pas de total en tête, pas de mot de victoire : le détail seul, bataille par bataille, puis les noms.
export const TEXTES = {
  fin: { terminee: 'La campagne est finie.', effondree: 'Il ne reste plus de quoi tenir : la campagne est finie.' },
  issue: { reussie: 'tenue', manquee: 'manquée' },          // dite après le nom du secteur : « Les labours : tenue »
  tombes: 'Les tombés', jusquauBout: 'Ceux qui sont restés', retour: 'Écran titre',
  vide: 'Personne.',
};
