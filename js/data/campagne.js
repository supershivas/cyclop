// La campagne (Jérôme, cadrage v0.36.3) : trois batailles de suite, de plus en plus dures (« la première, nous sommes en surnombre et le
// terrain est à nous, puis ça évolue »). `forces` : nos hommes pour un des leurs (1,3 : nous plus nombreux ; 0,77 : eux plus nombreux) ;
// `ia` : facteurs de la durée entre deux actions de l'IA d'en face (plus de 1 : plus calme ; moins de 1 : plus souvent).
// PROPOSITIONS, pas encore mesurées sur une campagne entière (scripts/mesure-campagne.mjs) : les régler d'après la mesure.
export const CAMPAGNE = {
  longueur: 3,
  batailles: [
    { secteur: 'essai', mission: 'tenir', forces: 1.3, ia: { barrage: 1.4, offensive: 1.4 } },        // les labours : le terrain est à nous
    { secteur: 'crete', mission: 'prendre', forces: 1, ia: { barrage: 1, offensive: 1 } },            // la crête : ils la tiennent
    { secteur: 'marais', mission: 'tenir', forces: 0.77, ia: { barrage: 0.7, offensive: 0.7 } },      // le marais : la boue, et ils sont plus nombreux
  ],
  regimentsMin: 4,                              // sous quatre régiments encore debout, la campagne finit (repli, pas de victoire claironnée)
};
