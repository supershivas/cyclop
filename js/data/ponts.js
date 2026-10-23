// Les ponts du jeu (Jérôme, v0.47.2 : « les ponts B C D E F G K sont à conserver en jeu, certains permettent le passage des chars, on choisit leur type dans l'éditeur ») :
// sept ouvrages choisis au labo (sujet « Les ponts »). `char` : porte un char d'assaut (13,5 t pour le Schneider) ; sinon, un char qui s'y engage fait tomber le pont et s'enlise.
// Les nombres de portance sont des propositions : pierre, métal et chevalets du génie portent un char ; une passerelle, un câble ou des cordes non. Le dessin est `rendu/ponts-modeles.js`.
export const PONTS_JEU = {
  planches: { nom: 'Passerelle de planches', char: false, desc: 'Des planches sur des piles de bois, un garde-corps de cordes : posée en quelques heures. Elle porte des hommes, pas un char.' },
  arches: { nom: 'Pont de pierre à trois arches', char: true, desc: 'Trois arches en plein cintre, des parapets : l\'ouvrage qui dure. Porte un char.' },
  dosdane: { nom: 'Dos d\'âne', char: true, desc: 'Une seule arche de pierre, le tablier monte au milieu. Porte un char.' },
  chevalets: { nom: 'Chevalets de bois', char: true, desc: 'Le pont du génie : des portiques de poteaux contreventés, un tablier plat. Porte un char.' },
  warren: { nom: 'Poutre Warren', char: true, desc: 'Une poutre métallique à treillis, rien dans l\'eau. Porte un char.' },
  suspendu: { nom: 'Pont suspendu', char: false, desc: 'Deux pylônes, des câbles, un tablier léger. Porte des hommes, pas un char.' },
  cordes: { nom: 'Passerelle de cordes', char: false, desc: 'Des cordes et des planches qui s\'affaissent : un homme de front. Ne porte pas un char.' },
};
export const PONT_DEFAUT = 'planches';
export const typePont = id => PONTS_JEU[id] ? id : PONT_DEFAUT;
// Les heures de travail du génie pour refaire un ouvrage coupé, avec la section au complet (20 hommes ; Jérôme, v0.66.0 : de 2 à 4 h selon le type) ; des propositions
export const PONTS_HEURES = { planches: 2, cordes: 2, chevalets: 2.5, suspendu: 3, dosdane: 3.5, warren: 3.5, arches: 4 };
