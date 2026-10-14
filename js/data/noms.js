// Les noms et les grades des soldats : prénoms et noms courants de leur
// génération (nés vers 1875-1898), grades de l'infanterie de chaque camp. Chaque soldat tire les siens de la graine de la bataille et de son
// numéro (identite.js) : il garde le même nom d'une partie relue à l'autre.
export const NOMS = {
  nous: {
    prenoms: ['Louis', 'Jean', 'Pierre', 'Marcel', 'Henri', 'Joseph', 'Émile', 'Eugène', 'Lucien', 'André',
      'Georges', 'Albert', 'Paul', 'René', 'Gaston', 'Léon', 'Maurice', 'Camille', 'Fernand', 'Raymond',
      'Auguste', 'Jules', 'Victor', 'Alphonse', 'Ernest', 'Marius', 'Octave', 'Édouard', 'Clément', 'Firmin',
      'Désiré', 'Aristide', 'Honoré', 'Achille', 'Félix', 'Baptiste'],
    noms: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
      'Simon', 'Laurent', 'Lefebvre', 'Michel', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel',
      'Girard', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Legrand', 'Garnier', 'Faure', 'Rousseau',
      'Blanc', 'Guérin', 'Henry', 'Roussel', 'Perrin', 'Morin', 'Mathieu', 'Clément', 'Gauthier', 'Fontaine',
      'Chevalier', 'Robin', 'Masson', 'Lemoine', 'Picard', 'Lacroix', 'Brun', 'Caron', 'Barbier', 'Arnaud'],
    // du premier au dernier : la hiérarchie d'un régiment (identite.js)
    grades: ['capitaine', 'lieutenant', 'sous-lieutenant', 'adjudant', 'sergent', 'caporal', 'soldat de 1re classe', 'soldat de 2e classe'],
  },
  eux: {
    prenoms: ['Karl', 'Wilhelm', 'Friedrich', 'Heinrich', 'Hermann', 'Otto', 'Paul', 'Walter', 'Ernst', 'Kurt',
      'Hans', 'Fritz', 'Max', 'Richard', 'Willi', 'Georg', 'Johann', 'Franz', 'Josef', 'August', 'Emil',
      'Gustav', 'Erich', 'Alfred', 'Rudolf', 'Bruno', 'Albert', 'Ludwig', 'Anton', 'Konrad'],
    noms: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
      'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
      'Braun', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Meier', 'Lehmann', 'Vogel', 'Frank',
      'Berger', 'Kaiser', 'Fuchs', 'Peters', 'Scholz', 'Möller', 'Keller', 'Huber', 'Winkler', 'Lorenz'],
    grades: ['Hauptmann', 'Oberleutnant', 'Leutnant', 'Feldwebel', 'Unteroffizier', 'Gefreiter', 'Musketier', 'Musketier'],
  },
};
