// Les cartes du soir (Jérôme, 24-26 nov. ; ROADMAP, lot 1 ; docs/chantiers/cartes-wtf.md ; la maquette : sujet « Les cartes du soir » du labo).
// Le soir, trois familles tirées parmi six ; un paquet par famille, mat, brillant ou rose ; 3 à 5 cartes par paquet ; on en garde une, jusqu'à la fin.
// Une carte a l'une des six raretés des largages (RARETES de data/largages.js) ; tirée de nouveau, elle prend la rareté au-dessus (la rareté remplace
// les niveaux, Jérôme, 26 nov.). Une carte ne s'appuie que sur ce qui existe en jeu : un objet parachuté qui revient, un caprice qu'on déclenche
// (Jérôme, 24 nov.). La règle est dans js/cartes.js ; le dessin (l'étiquette, retenue le 26 nov.) au labo, pas encore en jeu.
//   r     : la description à chaque rareté ; `[[terme]]` s'explique au survol (GLOSSAIRE_CARTES), `[[terme|texte]]` montre le texte
//   image : ce que montrera l'image de la carte (une place vide pour l'instant)
// Les effets (ce que la carte fait en jeu) ne sont pas encore branchés : ils viendront rareté par rareté, famille par famille.

// Les six familles (Jérôme, 26 nov. : « six, trois tirées chaque soir »)
export const FAMILLES_CARTES = {
  musette:  { nom: 'La musette', icone: '✹', dit: 'des obus à viser' },
  largages: { nom: 'Les largages', icone: '⊕', dit: 'les caisses parachutées' },
  caprices: { nom: 'Les caprices', icone: '❖', dit: 'des caprices en poche' },
  hommes:   { nom: 'Les hommes', icone: 'R', dit: 'nos régiments' },
  engins:   { nom: 'Les engins', icone: 'C', dit: 'chars, avions, armes' },
  maudites: { nom: 'Les maudites', icone: '☠', dit: 'un gros bonus, un défaut' },
};
export const ORDRE_FAMILLES = Object.keys(FAMILLES_CARTES);

// Les paquets (Jérôme, 26 nov.) : leurs chances sur 100 ; le mat suit les chances des caisses, le brillant a au moins une carte rare,
// le rose a toujours une carte mythique
export const PAQUETS = {
  commun:   { nom: 'Paquet mat', poids: 70 },
  brillant: { nom: 'Paquet brillant', poids: 25, auMoins: 'rare' },
  rose:     { nom: 'Paquet rose', poids: 5, mythique: true },
};
export const SOIR_CARTES = {
  familles: 3,           // paquets proposés chaque soir
  cartes: [3, 5],        // cartes par paquet (au hasard, bornes comprises)
};

const R6 = (commun, peuCommun, rare, epique, legendaire, relique) => ({ commun, peuCommun, rare, epique, legendaire, relique });

export const CARTES = {
  // ─── La musette ───
  depot: { famille: 'musette', nom: 'Le dépôt', image: "une caisse d'obus de 75, couvercle ouvert", r: R6(
    'Chaque matin, une [[salve de 75]] dans la [[musette]]',
    'Chaque matin, deux [[salve de 75|salves de 75]] dans la [[musette]]',
    'Chaque matin, un [[barrage de 155]] dans la [[musette]]',
    'Chaque matin, un [[barrage de 220]] dans la [[musette]]',
    'Le matin et à midi, un [[barrage de 155]] dans la [[musette]]',
    'Le matin et à midi, un [[barrage de 220]] dans la [[musette]]') },
  roulant: { famille: 'musette', nom: 'Le barrage roulant', image: "une ligne d'explosions qui avance sur le no man's land", r: R6(
    'Chaque midi, un [[barrage roulant]] de trois salves',
    'Chaque midi, un [[barrage roulant]] de quatre salves',
    'Chaque midi, un [[barrage roulant]] de cinq salves',
    'Chaque midi, un [[barrage roulant]] de cinq salves de 155',
    'Le matin et à midi, un [[barrage roulant]] de cinq salves',
    'Le matin et à midi, un [[barrage roulant]] de cinq salves de 155') },
  quatreCents: { famille: 'musette', nom: 'Le 400 de Douaumont', image: "l'obus de 400 debout, plus grand qu'un homme", r: R6(
    'Une fois par partie, un [[barrage de 220]] dans la [[musette]]',
    'Une fois par partie, deux barrages de 220 au même endroit',
    'Une fois par partie, trois barrages de 220 au même endroit',
    'Une fois par partie, l\'[[obus de 400]]',
    'Deux fois par partie, l\'[[obus de 400]]',
    'Trois fois par partie, l\'[[obus de 400]]') },
  musetteProfonde: { famille: 'musette', nom: 'La musette profonde', image: "une musette de toile qui déborde", r: R6(
    'La [[musette]] garde 4 objets (touche 0)',
    'La [[musette]] garde 4 objets ; chaque matin, une [[salve de 75]]',
    'La [[musette]] garde 5 objets (touches 0 et tiret)',
    'La [[musette]] garde 5 objets ; chaque matin, une [[salve de 75]]',
    'La [[musette]] garde 5 objets ; chaque matin, un [[barrage de 155]]',
    'La [[musette]] garde 5 objets ; chaque matin, un [[barrage de 220]]') },
  // ─── Les largages ───
  coureurs: { famille: 'largages', nom: 'Les coureurs', image: "des brodequins de chasseur, lacets défaits", r: R6(
    'Quand une [[caisse]] descend, nos [[coureurs]] courent une fois et demie plus vite',
    'Quand une [[caisse]] descend, nos [[coureurs]] courent deux fois plus vite',
    'Nos [[coureurs]] courent deux fois plus vite, et ils sont 8 au lieu de 5',
    'Nos [[coureurs]] courent deux fois plus vite, et ils sont 10',
    'Nos 10 [[coureurs]] courent deux fois plus vite et partent de 240 m',
    'Nos 10 [[coureurs]] courent deux fois plus vite et partent de 320 m') },
  piloteAmi: { famille: 'largages', nom: 'Le pilote ami', image: "un biplan qui bat des ailes au-dessus de nos lignes", r: R6(
    'Un jour sur deux, un [[avion de largage]] de plus ; sa [[caisse]] tombe de notre côté',
    'Chaque jour, un [[avion de largage]] de plus ; sa [[caisse]] tombe de notre côté',
    'Chaque jour, un [[avion de largage]] de plus ; sa [[caisse]] est au moins peu commune',
    'Chaque jour, deux [[avion de largage|avions de largage]] de plus ; leurs [[caisse|caisses]] tombent de notre côté',
    'Chaque jour, deux avions de plus ; leurs [[caisse|caisses]] sont au moins rares',
    'Chaque jour, trois avions de plus ; leurs [[caisse|caisses]] sont au moins épiques') },
  bonneEtoile: { famille: 'largages', nom: 'La bonne étoile', image: "une étoile filante au-dessus du no man's land", r: R6(
    'Chaque jour, une [[caisse]] tombe de notre côté',
    'Chaque jour, une [[caisse]] tombe de notre côté ; son objet monte d\'une [[rareté]]',
    'Chaque jour, deux [[caisse|caisses]] tombent de notre côté ; leurs objets montent d\'une [[rareté]]',
    'Toutes les [[caisse|caisses]] tombent de notre côté',
    'Toutes les [[caisse|caisses]] tombent de notre côté ; leurs objets montent d\'une [[rareté]]',
    'Toutes les [[caisse|caisses]] tombent de notre côté ; leurs objets montent de deux [[rareté|raretés]]') },
  // ─── Les caprices en poche (dans la musette, déclenchés quand on veut) ───
  heros: { famille: 'caprices', nom: 'Les héros', image: "un poilu seul qui court vers les barbelés", r: R6(
    'Un matin sur deux, un de nos hommes de [[première ligne]] devient [[invincible]] 1 h et charge seul',
    'Chaque matin, un de nos hommes de [[première ligne]] devient [[invincible]] 1 h et charge seul',
    'Chaque matin, un de nos hommes de [[première ligne]] devient [[invincible]] 3 h et charge seul',
    'Chaque matin, deux de nos hommes deviennent [[invincible|invincibles]] 3 h et chargent',
    'Chaque matin, trois de nos hommes deviennent [[invincible|invincibles]] 3 h et chargent',
    'Le matin et à midi, trois de nos hommes deviennent [[invincible|invincibles]] 3 h et chargent') },
  zeppelin: { famille: 'caprices', nom: 'Notre zeppelin', image: "un dirigeable bas, dans la brume", r: R6(
    'Une fois par partie, quand on veut : notre [[zeppelin]] traverse leurs lignes',
    'Deux fois par partie, notre [[zeppelin]] traverse leurs lignes',
    'Un jour sur deux, notre [[zeppelin]] dans la [[musette]]',
    'Chaque jour, notre [[zeppelin]] dans la [[musette]]',
    'Chaque jour, notre [[zeppelin]], plus lent : deux fois plus de bombes',
    'Deux fois par jour, notre [[zeppelin]], plus lent : deux fois plus de bombes') },
  as: { famille: 'caprices', nom: 'Notre as', image: "un avion d'as, la cocarde sur le flanc", r: R6(
    'Une fois par partie, quand on veut : notre [[as]] mitraille leurs lignes',
    'Deux fois par partie, notre [[as]] mitraille leurs lignes',
    'Un jour sur deux, notre [[as]] dans la [[musette]]',
    'Chaque jour, notre [[as]] dans la [[musette]]',
    'Chaque jour, notre [[as]], six passages au lieu de trois',
    'Deux fois par jour, notre [[as]], six passages') },
  mine: { famille: 'caprices', nom: 'La mine', image: "des sapeurs dans une galerie étayée", r: R6(
    'Une fois par partie, on choisit une de leurs tranchées : elle saute',
    'Deux fois par partie, une de leurs tranchées saute',
    'Trois fois par partie, une de leurs tranchées saute',
    'Tous les trois jours, une mine dans la [[musette]]',
    'Tous les deux jours, une mine dans la [[musette]]',
    'Chaque jour, une mine dans la [[musette]]') },
  // ─── Les hommes ───
  renforts: { famille: 'hommes', nom: 'Les renforts du soir', image: "des hommes qui montent en ligne, le barda sur le dos", r: R6(
    'Chaque soir, une [[demi-section]] (10 hommes) rejoint notre régiment le plus éprouvé',
    'Chaque soir, 15 hommes rejoignent notre régiment le plus éprouvé',
    'Chaque soir, une section (20 hommes) rejoint notre régiment le plus éprouvé',
    'Chaque soir, 30 hommes rejoignent notre régiment le plus éprouvé',
    'Chaque soir, une compagnie (40 hommes) rejoint notre régiment le plus éprouvé',
    'Chaque soir, une compagnie rejoint chacun de nos deux régiments les plus éprouvés') },
  clairon: { famille: 'hommes', nom: 'Le clairon', image: "le clairon de la charge, son fanion", r: R6(
    'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]] pendant 1 h',
    'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]] pendant 2 h',
    'Chaque matin, le premier régiment qui reçoit un ordre a le [[clairon]] pendant 4 h',
    'Chaque matin, les deux premiers régiments ont le [[clairon]] pendant 4 h',
    'Chaque matin, les trois premiers régiments ont le [[clairon]] pendant 4 h',
    'Toute la journée, tous nos régiments ont le [[clairon]]') },
  flammes: { famille: 'hommes', nom: 'Le lance-flammes', image: "le lance-flammes Schilt, ses deux réservoirs", r: R6(
    'Au [[premier assaut du jour]], un homme reçoit un [[lance-flammes]] pendant 1 h',
    'Au [[premier assaut du jour]], un homme reçoit un [[lance-flammes]] pendant 2 h',
    'Au [[premier assaut du jour]], deux hommes reçoivent un [[lance-flammes]]',
    'Au [[premier assaut du jour]], trois hommes reçoivent un [[lance-flammes]]',
    'Aux deux premiers assauts du jour, deux hommes reçoivent un [[lance-flammes]]',
    'À chaque assaut, trois hommes reçoivent un [[lance-flammes]]') },
  grenadiers: { famille: 'hommes', nom: 'Les grenadiers', image: "une caisse de grenades citrons", r: R6(
    'Au [[premier assaut du jour]], chaque homme du régiment lance une grenade',
    'Au [[premier assaut du jour]], chaque homme du régiment lance deux grenades',
    'Au [[premier assaut du jour]], chaque homme du régiment lance trois grenades',
    'Aux deux premiers assauts du jour, chaque homme lance trois grenades',
    'À chaque assaut, chaque homme du régiment lance trois grenades',
    'À chaque assaut, chaque homme lance trois grenades, jusqu\'à 45 m') },
  // ─── Les engins ───
  cheddite: { famille: 'engins', nom: 'La cheddite', image: "des pétards de cheddite glissés sous les barbelés", r: R6(
    'Chaque matin, leur [[fil de fer]] saute sur 60 m devant notre régiment le plus avancé',
    'Chaque matin, leur [[fil de fer]] saute sur 90 m devant notre régiment le plus avancé',
    'Chaque matin, leur [[fil de fer]] saute sur 120 m devant notre régiment le plus avancé',
    'Chaque matin, leur [[fil de fer]] saute sur 180 m devant notre régiment le plus avancé',
    'Chaque matin, leur [[fil de fer]] saute devant nos deux régiments les plus avancés',
    'Chaque matin, leur [[fil de fer]] saute devant toute notre [[première ligne]]') },
  mecano: { famille: 'engins', nom: 'Le mécanicien', image: "une caisse d'outils devant un char FT", r: R6(
    'Chaque matin, un de nos [[chars]] est réparé',
    'Chaque matin, deux de nos [[chars]] sont réparés',
    'Chaque matin, tous nos [[chars]] sont réparés',
    'Le matin et à midi, tous nos [[chars]] sont réparés',
    'Chaque matin, tous nos [[chars]] sont réparés, et un char détruit revient au parc',
    'Le matin et à midi, tous nos [[chars]] sont réparés, et un char détruit revient au parc') },
  aasen: { famille: 'engins', nom: 'Les bombes Aasen', image: "une bombe Aasen à ailettes", r: R6(
    'À chaque vol de nos avions, deux [[bombes Aasen]]',
    'À chaque vol de nos avions, trois [[bombes Aasen]]',
    'À chaque vol de nos avions, quatre [[bombes Aasen]]',
    'À chaque vol de nos avions, six [[bombes Aasen]]',
    'À chaque vol de nos avions, huit [[bombes Aasen]]',
    'À chaque vol de nos avions, douze [[bombes Aasen]]') },
  blindage: { famille: 'engins', nom: 'Le blindage', image: "des plaques de blindage rivetées", r: R6(
    'Nos [[chars]] ont une fois et demie plus de points de vie',
    'Nos [[chars]] ont deux fois plus de points de vie',
    'Nos [[chars]] ont deux fois plus de points de vie ; un char détruit revient au parc chaque soir',
    'Nos [[chars]] ont trois fois plus de points de vie',
    'Nos [[chars]] ont trois fois plus de points de vie ; un char détruit revient au parc chaque soir',
    'Nos [[chars]] ont quatre fois plus de points de vie ; tous nos chars détruits reviennent chaque soir') },
  // ─── Les maudites : un gros bonus, un défaut visible ───
  artilleursIvres: { famille: 'maudites', nom: 'Les artilleurs ivres', image: "une batterie de 155 et des bouteilles vides", r: R6(
    'Chaque matin, deux [[barrage de 155|barrages de 155]] dans la [[musette]] ; mais chaque jour, un [[tir trop court]] sur nos lignes',
    'Chaque matin, deux [[barrage de 155|barrages de 155]] et une [[salve de 75]] ; mais chaque jour, un [[tir trop court]]',
    'Chaque matin, trois [[barrage de 155|barrages de 155]] ; mais chaque jour, un [[tir trop court]] sur nos lignes',
    'Chaque matin, deux [[barrage de 220|barrages de 220]] ; mais chaque jour, un [[tir trop court]] sur nos lignes',
    'Chaque matin, trois [[barrage de 220|barrages de 220]] ; mais chaque jour, un [[tir trop court]] sur nos lignes',
    'Chaque matin, trois [[barrage de 220|barrages de 220]] ; le [[tir trop court]] tombe sur nous une fois sur deux, sur eux sinon') },
  ventQuiTourne: { famille: 'maudites', nom: 'Le vent qui tourne', image: "une manche à air qui claque", r: R6(
    'Une fois par partie, on lâche la [[nappe de gaz]] depuis nos lignes ; mais le vent est tiré au hasard',
    'Un jour sur deux, la [[nappe de gaz]] dans la [[musette]] ; le vent est tiré au hasard',
    'Chaque jour, la [[nappe de gaz]] dans la [[musette]] ; le vent est tiré au hasard',
    'Chaque jour, une [[nappe de gaz]] plus large ; le vent est tiré au hasard',
    'Deux fois par jour, la [[nappe de gaz]] ; le vent est tiré au hasard',
    'Deux fois par jour, la [[nappe de gaz]] ; on voit d\'où vient le vent avant de la lâcher') },
  chargeFolle: { famille: 'maudites', nom: 'Le général à cheval', image: "un général à cheval, la canne levée", r: R6(
    'Nos régiments sont [[sans peur]] le matin ; mais chaque jour, l\'un d\'eux reçoit un [[ordre absurde]]',
    'Nos régiments sont [[sans peur]] jusqu\'à midi ; mais chaque jour, un [[ordre absurde]]',
    'Nos régiments sont [[sans peur]] toute la journée ; mais chaque jour, un [[ordre absurde]]',
    'Nos régiments sont [[sans peur]] ; le régiment de l\'[[ordre absurde]] a le [[clairon]]',
    'Nos régiments sont [[sans peur]] ; le régiment de l\'[[ordre absurde]] a le [[clairon]] et ses [[lance-flammes]]',
    'Nos régiments sont [[sans peur]] ; l\'[[ordre absurde]] ne vient plus qu\'un jour sur deux') },
  charsFous: { famille: 'maudites', nom: 'Les chars fous', image: "un char FT qui fonce dans la fumée", r: R6(
    'Un matin sur deux, un [[chars|char]] neuf de plus ; mais il sort tout seul et fonce sans ordre',
    'Chaque matin, un [[chars|char]] neuf de plus ; mais il fonce sans ordre',
    'Chaque matin, un [[chars|char]] neuf et blindé de plus ; mais il fonce sans ordre',
    'Chaque matin, deux [[chars]] neufs de plus ; mais ils foncent sans ordre',
    'Chaque matin, deux [[chars]] neufs et blindés de plus ; mais ils foncent sans ordre',
    'Chaque matin, trois [[chars]] neufs et blindés de plus ; mais ils foncent sans ordre') },
};
for (const [id, C] of Object.entries(CARTES)) C.id = id;

// La bulle de chaque terme et la description de son image (docs/chantiers/cartes-wtf.md, « Le glossaire du survol »)
export const GLOSSAIRE_CARTES = {
  'musette': ['Ce que vous gardez pour plus tard : 3 objets au plus, lancés avec les touches 7, 8, 9 puis un clic sur le terrain', 'les trois emplacements de la musette au-dessus du râtelier'],
  'salve de 75': ['24 petits obus en quelques secondes, là où l\'on clique ; tue les hommes à découvert, abîme peu les tranchées', 'zoom 4 : une salve sur des hommes à découvert'],
  'barrage de 155': ['12 obus moyens ; creuse le sol, abîme les tranchées', 'zoom 4 : des cratères moyens dans le parapet'],
  'barrage de 220': ['6 gros obus ; chacun crève une tranchée et laisse un cratère', 'zoom 4 : une tranchée coupée par un grand cratère'],
  'barrage roulant': ['Des salves de 75 qui avancent de 30 m toutes les 8 s ; une troupe qui marche juste derrière arrive sur des tranchées sonnées', 'zoom 2 : trois lignes d\'explosions, un régiment derrière'],
  'obus de 400': ['L\'obus mythique : quatre barrages de 220 au même endroit', 'zoom 2 : un trou béant au milieu des lignes'],
  'caisse': ['Un avion la largue au-dessus du no man\'s land ; le premier homme, d\'un camp ou de l\'autre, qui l\'atteint prend l\'objet', 'zoom 8 : une caisse sous son parachute'],
  'coureurs': ['Les 5 hommes de chaque camp, à moins de 160 m, qui courent vers une caisse qui descend', 'zoom 4 : des hommes qui courent vers une caisse'],
  'avion de largage': ['L\'avion qui lâche les caisses : un toutes les 3 à 5 heures du jour', 'zoom 4 : l\'avion, la caisse qui se détache'],
  'rareté': ['Commun, peu commun, rare, épique, légendaire, mythique : la couleur de la flèche au-dessus de l\'objet', 'planche : les six flèches de rareté'],
  'première ligne': ['La tranchée la plus proche de l\'ennemi', 'zoom 2 : notre tranchée la plus avancée, entourée'],
  'invincible': ['Les balles et les obus ne le blessent pas', 'zoom 8 : un héros qui court sous les balles'],
  'zeppelin': ['Un dirigeable lent et bas qui traverse le front en lâchant ses bombes (comme des 155) ; on peut l\'abattre', 'zoom 4 : le zeppelin au-dessus des tranchées'],
  'as': ['Un pilote d\'élite : trois passages de mitrailleuse, un avion six fois plus solide', 'zoom 4 : l\'avion de l\'as en rase-mottes'],
  'demi-section': ['Dix hommes ; une section en fait vingt, une compagnie quarante', 'planche : 10, 20, 40 silhouettes en rang'],
  'clairon': ['Le régiment court une fois et demie plus vite et n\'a plus peur', 'zoom 4 : un régiment qui charge, l\'icône du clairon'],
  'sans peur': ['Le régiment ne recule jamais sous le feu et ne part pas en déroute', 'la barre de moral d\'un régiment, verrouillée'],
  'premier assaut du jour': ['Le premier régiment envoyé, ce jour-là, au-delà de notre première ligne', 'schéma : la flèche d\'un régiment qui franchit notre ligne'],
  'lance-flammes': ['Le lance-flammes Schilt, l\'arme française de 1915 : un jet de feu à 15 m ; ceux d\'en face brûlent ou fuient', 'zoom 8 : un homme qui crache le feu dans une tranchée'],
  'fil de fer': ['Les barbelés devant leurs tranchées : un homme qui les traverse va au pas, à découvert', 'zoom 8 : les barbelés, une brèche ouverte'],
  'chars': ['Nos chars FT : on les envoie depuis le parc vers leurs lignes ; ils tirent au canon', 'zoom 8 : un char FT qui avance'],
  'bombes Aasen': ['Des bombes à main lâchées par nos aviateurs (comme des obus de 155)', 'zoom 4 : un avion qui lâche ses bombes'],
  'tir trop court': ['Notre artillerie se trompe de réglage : un barrage tombe sur nos propres hommes', 'zoom 4 : un barrage sur notre propre tranchée'],
  'nappe de gaz': ['Un nuage de chlore qui dérive avec le vent 2 h ; ceux qui sont dedans ne tirent plus, fuient ou tombent', 'zoom 2 : le nuage de gaz qui dérive'],
  'ordre absurde': ['L\'état-major envoie un régiment à l\'assaut, tout de suite ; pendant 2 h, on ne peut plus lui donner d\'ordre', 'zoom 4 : un régiment qui sort seul'],
};
