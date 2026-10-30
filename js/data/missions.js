/* Les missions secondaires (Jérôme, v0.99.0) : `secondairesParPartie` tirées à la graine au début de la bataille.
   Réussie = rapporte `points` au bilan ; peut échouer en cours (`echec`), alors c'est dit à voix haute.
   type : pertesMax (nos pertes ≤ cible), ennemiMin (leurs pertes ≥ cible), reserve (relève ≤ cible régiments),
   releve (relever au moins cible régiments), tenue (nos lignes ≥ lignesMin sur tous les soirs). Cibles à mesurer par régiment. */
export const MISSIONS_SECONDAIRES = {
  secondairesParPartie: 2,
  pointsMission: 100,   // le bordereau de fin : la mission principale réussie rapporte autant de points de dotation
  lignesMin: 0.9,
  catalogue: [
    { id: 'sobre', type: 'pertesMax', cible: 400, points: 30, texte: 'Perdre moins de {cible} hommes.' },
    { id: 'econome', type: 'pertesMax', cible: 250, points: 50, texte: 'Perdre moins de {cible} hommes (sobre).' },
    { id: 'saigner', type: 'ennemiMin', cible: 500, points: 30, texte: 'Faire perdre {cible} hommes à l\'ennemi.' },
    { id: 'reserve', type: 'reserve', cible: 0, points: 40, texte: 'Garder la réserve intacte : aucune relève.' },
    { id: 'releve', type: 'releve', cible: 2, points: 20, texte: 'Relever {cible} régiments.' },
    { id: 'lignes', type: 'tenue', cible: 0, points: 40, texte: 'Ne jamais laisser nos lignes sous 90 % à la fin d\'un jour.' },
  ],
};
