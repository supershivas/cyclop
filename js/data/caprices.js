// Les caprices du front (Jérôme, 23 nov., v0.163.0 : « des modificateurs du jeu aléatoires pour ajouter un peu de chaos et d'inattendu » ; « un caprice par jour,
// avec la vitrine » ; l'orage, la tranchée inondée et le cessez-le-feu, « peu clairs ou peu visibles », remplacés par les deux héros, les chars perdus et le zeppelin).
// Chaque jour, un caprice tombe à une heure tirée de la graine ; il touche le front entier ou un camp tiré au hasard : il ne favorise personne d'avance.
// La règle est dans js/caprices.js, le dessin dans js/rendu/caprices.js. Les raretés sont celles des objets parachutés (data/largages.js : poids et couleurs).
// Les durées sont en secondes de jeu (une journée de 12 h fait 360 s : une heure, 30 s). `court` : les mots du bandeau ; `effet` : la phrase de la vitrine.

export const CAPRICES_JOUR = {
  debut: [50, 250],      // s du jour : le caprice tombe entre ces deux temps (avant la nuit, avec le temps de se jouer)
  annonce: 12,           // s : l'annonce à l'écran avant qu'il ne tombe (v0.164.0)
};

export const CAPRICES = [
  { id: 'tirCourt', nom: 'Le tir trop court', rarete: 'commun', icone: '↧', camp: true,
    court: 'Une batterie règle mal son tir : un barrage sur ses propres lignes',
    effet: 'Une batterie d\'un camp tiré au hasard règle mal son tir : un barrage de 155 tombe sur sa propre première ligne.',
    cal: '155', obus: 12, duree: 10 },
  { id: 'obusPerdus', nom: 'Les obus perdus', rarete: 'commun', icone: '✹',
    court: 'Le secteur voisin tire à l\'aveugle : des obus partout pendant une heure',
    effet: 'L\'artillerie du secteur voisin tire à l\'aveugle : pendant une heure, des 75 et des 155 tombent au hasard sur tout le champ, nos lignes comme les leurs.',
    duree: 30, cadence: 1.1, cals: ['75', '75', '155'] },
  { id: 'heros', nom: 'Les deux héros', rarete: 'commun', icone: '★',
    court: 'Un homme de chaque camp, invincible, charge seul la tranchée d\'en face',
    effet: 'Un homme de chaque camp, tiré au hasard en première ligne, devient invincible pendant trois heures et charge seul la tranchée d\'en face, en tirant des balles qui tuent à coup sûr.',
    duree: 90 },
  { id: 'charsPerdus', nom: 'Les chars perdus', rarete: 'peuCommun', icone: '▣',
    court: 'Un char de chaque camp sort tout seul et fonce sur les lignes d\'en face',
    effet: 'Un char de chaque camp sort tout seul de son parc, sans ordre, et fonce droit sur la première ligne d\'en face.',
    duree: 8 },
  { id: 'pluieCaisses', nom: 'La pluie de caisses', rarete: 'peuCommun', icone: '☂',
    court: 'Cinq avions larguent à la suite : cinq caisses, cinq courses',
    effet: 'Cinq avions passent à la suite et larguent chacun une caisse : cinq courses en même temps sur tout le front.',
    n: 5, ecart: 5, duree: 30 },
  { id: 'ordreAbsurde', nom: 'L\'ordre absurde', rarete: 'rare', icone: '!',
    court: 'Un régiment de chaque camp sort à l\'assaut ; impossible de l\'arrêter pendant 2 h',
    effet: 'L\'état-major ordonne à un régiment de chaque camp de sortir à l\'assaut de la tranchée d\'en face, tout de suite ; pendant deux heures, on ne peut ni l\'arrêter ni lui donner un autre ordre.',
    duree: 60 },
  { id: 'zeppelin', nom: 'Le zeppelin', rarete: 'rare', icone: '⬬', camp: true,
    court: 'Un dirigeable traverse lentement le front et bombarde les lignes d\'en face',
    effet: 'Un dirigeable d\'un camp tiré au hasard traverse lentement le front, bas, et lâche ses bombes, comme des 155, sur les tranchées d\'en face.',
    altitude: 45, vitesse: 8, bombe: 3.2, cal: '155', duree: 0 },      // (45 m : plus haut, il sort de l'image de la caméra du jeu)
  { id: 'gaz', nom: 'La nappe de gaz', rarete: 'epique', icone: '☁',
    court: 'Un nuage de chlore dérive avec le vent : on s\'en écarte ou on tombe',
    effet: 'Un nuage de chlore part du no man\'s land et dérive avec le vent pendant deux heures : ceux qui sont dedans, d\'un camp comme de l\'autre, ne tirent plus, fuient ou tombent. Il faut déplacer ses régiments hors de sa route.',
    duree: 60, rayon: 22, derive: 3, letal: 0.05 },
  { id: 'mine', nom: 'La mine', rarete: 'epique', icone: '◉', camp: true,
    court: 'Une mine saute sous une tranchée : un cratère géant, une brèche à prendre',
    effet: 'Des sapeurs avaient creusé sous une tranchée d\'un camp tiré au hasard : elle saute. Un cratère géant, un tronçon rasé, une brèche à prendre ou à boucher en courant.',
    cal: '220', coups: 6, ecart: 4, duree: 6 },
  { id: 'as', nom: 'L\'as', rarete: 'legendaire', icone: '✈', camp: true,
    court: 'Un as, presque invincible, mitraille trois fois les lignes d\'en face ; abattu, il laisse une caisse légendaire',
    effet: 'Un as d\'un camp tiré au hasard passe trois fois au-dessus des lignes d\'en face en mitraillant ; son avion est six fois plus solide qu\'un autre. Abattu, il tombe avec une caisse légendaire.',
    passes: 3, ecart: 22, pv: 6, duree: 80 },
  { id: 'eclipse', nom: 'L\'éclipse', rarete: 'relique', icone: '◐',
    court: 'La nuit tombe en plein jour : fusées, lanternes, incendies ; l\'IA s\'arrête',
    effet: 'Comme celle d\'août 1914 : la nuit tombe en plein jour pendant une heure et demie. Les fusées, les lanternes et les incendies éclairent le champ ; ceux d\'en face s\'arrêtent, le temps que le soleil revienne.',
    duree: 45, entree: 6, noir: 0.85 },
  { id: 'seisme', nom: 'Le tremblement de terre', rarete: 'relique', icone: '≋',
    court: 'Le front tremble : des tranchées s\'effondrent partout',
    effet: 'Le front entier tremble : des tranchées des deux camps s\'effondrent au hasard, des hommes sont ensevelis, le terrain n\'est plus le même.',
    coups: 26, cal: '75', duree: 5 },
];
export const CAPRICE = Object.fromEntries(CAPRICES.map(c => [c.id, c]));
