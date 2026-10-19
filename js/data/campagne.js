// La campagne (Jérôme, cadrage v0.36.3) : trois batailles de suite, de plus en plus dures. Les nombres du rapport de forces
// (surnombre, offensive de l'IA) viennent aux lots suivants, après mesure ; ici l'ordre des secteurs et leurs missions.
export const CAMPAGNE = {
  longueur: 3,
  batailles: [
    { secteur: 'essai', mission: 'tenir' },     // les labours : le terrain est à nous
    { secteur: 'crete', mission: 'prendre' },   // la crête : ils la tiennent
    { secteur: 'marais', mission: 'tenir' },    // le marais : la boue, et ils sont plus nombreux
  ],
  regimentsMin: 4,                              // sous quatre régiments encore debout, la campagne finit (repli, pas de victoire claironnée)
};
