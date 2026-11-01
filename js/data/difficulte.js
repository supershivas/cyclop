// Les niveaux de difficulté d'une partie (Jérôme, v0.70.0). Ils ne changent que l'adversaire, jamais les règles :
// `forces` : nos hommes pour un des leurs (comme `forces` de data/campagne.js ; 1,3 : nous plus nombreux, 0,8 : eux plus nombreux) ;
// `ia` : facteurs de la durée entre deux actions d'en face (moins de 1 : plus souvent) ; `stance` : la posture qu'en face prend dans ses tranchées ('' : aucune).
// `dotation` (v0.92.0) : le facteur de la dotation du camp d'en face (la nôtre ne change jamais).
// « Front ordinaire » est la partie d'avant : rien ne change (test). Les nombres sont des PROPOSITIONS, à régler d'après `scripts/mesure-difficulte.mjs`.
export const DIFFICULTES = {
  calme:    { nom: 'Secteur calme',     desc: 'Nous sommes plus nombreux, en face tarde à répondre.',                       forces: 1.3, ia: { barrage: 1.4, offensive: 1.4 }, stance: '', dotation: 0.7, chars: false },
  ordinaire: { nom: 'Front ordinaire',  desc: 'À forces égales.',                                                           forces: 1,   ia: { barrage: 1,   offensive: 1 },   stance: '', dotation: 1, chars: false },
  offensive: { nom: 'Grande offensive', desc: 'En face est plus nombreux, répond vite, tient ses tranchées et lance ses chars.',             forces: 0.8, ia: { barrage: 0.7, offensive: 0.7 }, stance: 'retenu', dotation: 1.3, chars: true },
};
export const DIFFICULTE_DEFAUT = 'ordinaire';

// La durée d'une partie (Jérôme, retour du 1er nov. : « des durées plus courtes pour les nouvelles parties simples ») : `jours` null = la durée du secteur (10 à 15 jours, tirée de la graine) ; sinon le nombre de jours imposé.
// Ne change que la durée : la mission, l'adversaire et les règles sont les mêmes. Le dernier choix est gardé dans `prefs.duree`.
export const DUREES = {
  courte:  { nom: 'Courte',  jours: 3,    desc: 'Trois jours : une bataille pour une soirée.' },
  moyenne: { nom: 'Moyenne', jours: 6,    desc: 'Six jours.' },
  longue:  { nom: 'Longue',  jours: null, desc: 'La durée du secteur : 10 à 15 jours.' },
};
export const DUREE_DEFAUT = 'longue';
