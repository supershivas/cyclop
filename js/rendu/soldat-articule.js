// Le soldat articulé (au labo seulement : « la fabrique de soldats », et la mesure de son coût ; rien n'est dans le jeu).
// Un squelette de treize os (le tronc, la tête, deux fois bras / avant-bras, deux fois cuisse / mollet / pied, le fusil) que le nuanceur plie : le genou, le coude, la cheville
// bougent, les mains et les pieds suivent. Le visage est une grille de 6 × 6 cases que le nuanceur peint (yeux, sourcils, nez, bouche) ; la peau, les cheveux, la barbe, la coiffe, les accessoires
// et la carrure viennent de `aspect` (js/aspect-soldat.js), un homme par instance. Les couleurs sont celles de la palette, rien d'autre.
//
//  · `modeleArticule({ complet })` : la géométrie seule (aucun THREE : testée dans Node). Chaque boîte porte sa partie (sa couleur), son os et une condition de visibilité (`show`) lue par
//    le nuanceur : une coiffe, une barbe, un accessoire n'existe que pour l'homme qui le porte (les autres sont aplaties au sommet : elles coûtent encore leurs sommets, pas leurs pixels).
//  · `creerSoldatArticule(THREE, col)` : le matériau, et `instances` qui garnit les tampons d'un lot d'hommes.
// Le devant d'un homme est +z, le haut +y, sa gauche −x (comme les soldats du jeu : rendu/geometries.js).

// ─── la visibilité d'une boîte : un code `genre × 100 + valeur` ───
//  0 toujours ; 1 coiffe = v ; 2 cheveux = v, tête blessée (sans casque) ; 3 barbe = v ; 4 accessoire (bit v) ; 5 camp = v ; 6 blessure = v ; 7 cheveux ≠ chauve ;
//  10 officier (rang 0 à 2) ; 11 les autres ; 15 casque porté (pas de blessure à la tête) : v = camp, ou 2 pour les deux ;
//  17 / 18 : français / allemand de rang ≤ v (les galons des officiers) ; 20 / 21 : français / allemand sous-officier (rang 3 à v)
export function voir(code, a, camp, blessure = 0) {
  const genre = Math.floor(code / 100 + 1e-6), v = code - genre * 100, rang = a.rang ?? 6;
  switch (genre) {
    case 0: return true;
    case 1: return a.coiffe === v;
    case 2: return a.cheveux === v && blessure === 3;
    case 3: return a.barbe === v;
    case 4: return ((a.acc >> v) & 1) === 1;
    case 5: return camp === v;
    case 6: return blessure === v;
    case 7: return a.cheveux !== 0;
    case 10: return rang <= 2;
    case 11: return rang > 2;
    case 15: return blessure !== 3 && (v === 2 || camp === v);
    case 17: return camp === 0 && rang <= v;
    case 18: return camp === 1 && rang <= v;
    case 20: return camp === 0 && rang >= 3 && rang <= v;
    case 21: return camp === 1 && rang >= 3 && rang <= v;
    default: return true;
  }
}

// Les os (13 : les basques de la vareuse, qui suivent les cuisses à moitié)
export const OS = { tronc: 0, tete: 1, brasG: 2, avantBrasG: 3, brasD: 4, avantBrasD: 5, cuisseG: 6, molletG: 7, piedG: 8, cuisseD: 9, molletD: 10, piedD: 11, fusil: 12, basques: 13 };
// Les parties (la couleur) : voir le nuanceur
export const PARTIES = { vareuse: 0, casque: 2, pantalon: 0, bois: 4, toile: 5, peau: 6, cuir: 7, botte: 8, main: 9, cheveux: 10, metal: 12, trait: 14, os: 15, visage: 16, claire: 17 };

const { tronc, tete, brasG, avantBrasG, brasD, avantBrasD, cuisseG, molletG, piedG, cuisseD, molletD, piedD, fusil, basques } = OS;
const P = PARTIES;

// La liste des boîtes : [x0, x1, y0, y1, z0, z1, partie, os, show, dessus, devant, rotation autour de y, niveau]
// `niveau` (v0.105.1) : 0 les deux niveaux de détail ; 1 le niveau fin seulement (boutons, parements, pouces, galons, oreilles, anneaux octogonaux du casque, moustaches, pipe : moins d'un pixel de 12 à 16 px/m) ; 2 le niveau intermédiaire seulement (le casque simplifié)
export function boites() {
  const L = [];
  let niv = 0;
  const B = (x0, x1, y0, y1, z0, z1, part, os, show = 0, haut = part, avant = part, rot = 0) => L.push([x0, x1, y0, y1, z0, z1, part, os, show, haut, avant, rot, niv]);
  const x = (s, a, b) => s > 0 ? [a, b] : [-b, -a];
  const cote = f => { f(-1); f(1); };
  // ── le tronc : la vareuse descend sous le ceinturon (les basques à mi-cuisse), le pantalon est de la couleur de l'armée (français : bleu horizon ; allemand : feldgrau, veste et pantalon unis)
  B(-0.22, 0.22, 0.82, 0.97, -0.135, 0.135, P.pantalon, tronc);                      // le bassin
  B(-0.25, 0.25, 0.95, 1.42, -0.15, 0.15, P.vareuse, tronc);                          // la vareuse
  B(-0.258, 0.258, 0.62, 0.95, -0.168, 0.168, P.vareuse, basques);                    // ses basques, sous la ceinture
  B(-0.1, 0.1, 1.37, 1.42, -0.12, 0.13, P.vareuse, tronc);                             // le col droit (sous le menton)
  niv = 1; for (const y of [1.28, 1.16, 1.04]) B(-0.012, 0.012, y, y + 0.035, 0.15, 0.158, P.metal, tronc); niv = 0;      // les boutons
  B(-0.258, 0.258, 0.88, 0.97, -0.17, 0.17, P.cuir, tronc); niv = 1; B(-0.03, 0.03, 0.89, 0.96, 0.17, 0.182, P.metal, tronc); niv = 0;   // le ceinturon et sa boucle
  for (const c of [-0.17, -0.05, 0.07]) B(c, c + 0.1, 0.97, 1.1, 0.17, 0.22, P.cuir, tronc, 500);          // les trois cartouchières françaises
  for (const [a, b] of [[-0.23, -0.13], [-0.115, -0.015], [0.015, 0.115], [0.13, 0.23]]) B(a, b, 0.97, 1.09, 0.17, 0.21, P.cuir, tronc, 501);        // les quatre cartouchières allemandes
  B(-0.33, -0.25, 0.58, 0.88, -0.14, 0.0, P.toile, tronc);                              // la gourde, à la hanche
  B(0.26, 0.34, 0.62, 0.88, -0.12, 0.04, P.claire, tronc, 501);                          // le sac à pain allemand
  B(-0.19, 0.19, 0.95, 1.38, -0.32, -0.15, P.toile, tronc);                              // le sac
  B(-0.2, 0.2, 1.38, 1.47, -0.34, -0.2, P.toile, tronc);                                // la couverture roulée sur le sac
  // ── les officiers : un pistolet à l'étui, le baudrier (et pas de fusil : voir plus bas)
  B(0.24, 0.32, 0.68, 0.9, 0.0, 0.1, P.cuir, tronc, 1000); niv = 1; B(0.26, 0.3, 0.9, 0.96, 0.04, 0.09, P.bois, tronc, 1000); niv = 0;
  B(-0.258, 0.258, 1.02, 1.12, -0.17, 0.17, P.cuir, tronc, 1000);
  // ── les galons : français, des barrettes blanches sur les deux manches (officiers : trois, deux, une, larges ; sous-officiers : minces) ; allemands : des épaulettes (officiers), le galon au col (sous-officiers)
  niv = 1;
  for (const s of [-1, 1]) {
    const os = s < 0 ? avantBrasG : avantBrasD;
    for (const [n, y] of [[1, 0.9], [2, 0.96], [3, 1.02]]) B(...x(s, 0.253, 0.347), y, y + 0.04, -0.06, 0.06, P.os, os, 1700 + (3 - n));          // rang ≤ 2, ≤ 1, ≤ 0 : la 1re barrette pour les trois officiers
    for (const [n, y] of [[1, 0.9], [2, 0.95], [3, 1.0]]) B(...x(s, 0.253, 0.347), y, y + 0.018, -0.06, 0.06, P.os, os, 2000 + (n === 1 ? 5 : n === 2 ? 4 : 3));     // caporal : une, sergent : deux, adjudant : trois
    B(...x(s, 0.13, 0.28), 1.4, 1.44, -0.07, 0.07, P.os, tronc, 1802); B(...x(s, 0.13, 0.28), 1.43, 1.445, -0.075, 0.075, P.trait, tronc, 1802);         // l'épaulette allemande
    for (const [n, z] of [[1, 0.0], [2, 0.05], [3, -0.05]]) B(...x(s, 0.2, 0.225), 1.443, 1.455, z - 0.012, z + 0.012, P.metal, tronc, 1800 + (n === 1 ? 2 : n === 2 ? 1 : 0));       // ses étoiles
  }
  for (const [n, y] of [[1, 1.395], [2, 1.41]]) B(-0.1, 0.1, y, y + 0.012, 0.13, 0.166, P.os, tronc, 2100 + (n === 1 ? 5 : 4));                         // le galon de col : caporal ou sergent ; l'adjudant en a deux de plus
  B(-0.1, 0.1, 1.425, 1.437, 0.13, 0.166, P.os, tronc, 2103);
  niv = 0;
  // ── les bras
  cote(s => B(...x(s, 0.25, 0.35), 1.08, 1.4, -0.065, 0.065, P.vareuse, s < 0 ? brasG : brasD));
  cote(s => { const os = s < 0 ? avantBrasG : avantBrasD; B(...x(s, 0.255, 0.345), 0.8, 1.08, -0.055, 0.055, P.vareuse, os); niv = 1; B(...x(s, 0.25, 0.35), 0.8, 0.84, -0.06, 0.06, P.vareuse, os); niv = 0; B(...x(s, 0.26, 0.34), 0.72, 0.81, -0.05, 0.05, P.main, os); niv = 1; B(...x(s, 0.335, 0.35), 0.74, 0.8, -0.03, 0.03, P.main, os); niv = 0; });   // l'avant-bras, son parement, la main et le pouce
  // ── les jambes : le pantalon bleu (français : bandes molletières de la couleur des brodequins, de mi-tibia à la cheville) ; allemands : des bottes jusqu'aux genoux
  cote(s => B(...x(s, 0.03, 0.2), 0.5, 0.92, -0.1, 0.1, P.pantalon, s < 0 ? cuisseG : cuisseD));
  cote(s => { const os = s < 0 ? molletG : molletD;
    B(...x(s, 0.04, 0.19), 0.32, 0.52, -0.088, 0.088, P.pantalon, os, 500);                      // le bas du pantalon
    B(...x(s, 0.045, 0.196), 0.1, 0.33, -0.092, 0.092, P.botte, os, 500);                         // la bande molletière, de la couleur des chaussures
    B(...x(s, 0.035, 0.205), 0.1, 0.5, -0.097, 0.097, P.botte, os, 501);                          // la botte allemande, jusqu'au genou
    niv = 1; B(...x(s, 0.03, 0.21), 0.46, 0.5, -0.1, 0.1, P.botte, os, 501); niv = 0;               // son revers
  });
  cote(s => { const os = s < 0 ? piedG : piedD; B(...x(s, 0.02, 0.21), 0, 0.1, -0.1, 0.2, P.botte, os); niv = 1; B(...x(s, 0.02, 0.21), 0, 0.022, -0.1, 0.2, P.trait, os); B(...x(s, 0.03, 0.2), 0.1, 0.13, 0.0, 0.17, P.botte, os); niv = 0; });   // le brodequin, sa semelle, sa languette
  // ── la tête, le visage
  B(-0.04, 0.04, 1.4, 1.45, -0.04, 0.04, P.peau, tete);                                // le cou
  B(-0.1, 0.1, 1.42, 1.64, -0.1, 0.1, P.peau, tete, 0, P.peau, P.visage);              // la tête, son devant est le visage
  niv = 1; cote(s => B(...x(s, 0.1, 0.118), 1.5, 1.57, -0.025, 0.045, P.peau, tete)); niv = 0;   // les oreilles
  B(-0.106, 0.106, 1.5, 1.62, -0.106, 0.0, P.cheveux, tete, 700);                       // la nuque et les tempes (sous le casque)
  // les cheveux, seulement quand le casque est tombé (blessé à la tête)
  B(-0.103, 0.103, 1.62, 1.65, -0.103, 0.103, P.cheveux, tete, 201);                    // ras
  B(-0.105, 0.105, 1.62, 1.68, -0.105, 0.105, P.cheveux, tete, 202); B(-0.1, 0.1, 1.6, 1.64, 0.1, 0.11, P.cheveux, tete, 202);   // courts
  B(-0.11, 0.11, 1.62, 1.7, -0.11, 0.11, P.cheveux, tete, 203); B(-0.1, 0.1, 1.4, 1.62, -0.14, -0.1, P.cheveux, tete, 203);
  cote(s => B(...x(s, 0.1, 0.12), 1.45, 1.62, -0.1, 0.05, P.cheveux, tete, 203));        // longs
  B(-0.105, 0.105, 1.62, 1.68, -0.105, 0.105, P.cheveux, tete, 204); B(-0.105, 0.105, 1.56, 1.66, 0.1, 0.12, P.cheveux, tete, 204);      // frange
  // le casque Adrian (français) : une demi-sphère (quatre anneaux octogonaux qui se resserrent), le cimier, la visière, le couvre-nuque et la cocarde ; 26 cm de large, comme le vrai
  niv = 1; for (const [y0, y1, r] of [[1.57, 1.61, 0.13], [1.61, 1.65, 0.12], [1.65, 1.69, 0.1], [1.69, 1.72, 0.065]]) { B(-r, r, y0, y1, -r, r, P.casque, tete, 1500); B(-r, r, y0, y1, -r, r, P.casque, tete, 1500, P.casque, P.casque, Math.PI / 4); }
  niv = 2; for (const [y0, y1, r] of [[1.57, 1.62, 0.13], [1.62, 1.67, 0.11], [1.67, 1.72, 0.075]]) B(-r, r, y0, y1, -r, r, P.casque, tete, 1500);       // (intermédiaire : trois anneaux carrés)
  niv = 0;
  B(-0.01, 0.01, 1.7, 1.765, -0.12, 0.12, P.casque, tete, 1500);                         // le cimier, d'avant en arrière
  B(-0.115, 0.115, 1.585, 1.605, 0.12, 0.19, P.casque, tete, 1500);                      // la visière
  B(-0.11, 0.11, 1.575, 1.6, -0.17, -0.12, P.casque, tete, 1500);                        // le couvre-nuque
  niv = 1; B(-0.025, 0.025, 1.62, 1.665, 0.13, 0.142, P.metal, tete, 1500); niv = 0;                        // la cocarde, l'insigne de grenade
  // le Stahlhelm (allemand, M1916) : un dôme plus bas, la jupe tout autour, le long couvre-nuque, les protège-oreilles, la visière, les cornes d'aération
  niv = 1; for (const [y0, y1, r] of [[1.6, 1.64, 0.13], [1.64, 1.68, 0.115], [1.68, 1.71, 0.08]]) { B(-r, r, y0, y1, -r, r, P.casque, tete, 1501); B(-r, r, y0, y1, -r, r, P.casque, tete, 1501, P.casque, P.casque, Math.PI / 4); }
  niv = 2; for (const [y0, y1, r] of [[1.6, 1.66, 0.13], [1.66, 1.71, 0.09]]) B(-r, r, y0, y1, -r, r, P.casque, tete, 1501);
  niv = 0;
  B(-0.15, 0.15, 1.555, 1.6, -0.16, 0.145, P.casque, tete, 1501);                         // la jupe
  B(-0.14, 0.14, 1.5, 1.56, -0.23, -0.12, P.casque, tete, 1501);                          // le couvre-nuque, long
  cote(s => B(...x(s, 0.12, 0.16), 1.5, 1.58, -0.1, 0.08, P.casque, tete, 1501));         // les protège-oreilles
  B(-0.12, 0.12, 1.565, 1.6, 0.145, 0.2, P.casque, tete, 1501);                           // la visière
  niv = 1;
  cote(s => B(...x(s, 0.145, 0.168), 1.625, 1.65, -0.015, 0.015, P.metal, tete, 1501));   // les cornes d'aération
  B(-0.012, 0.012, 1.7, 1.725, -0.04, 0.04, P.metal, tete, 1501);                          // le support de la cocarde, au sommet
  cote(s => B(...x(s, 0.1, 0.108), 1.42, 1.58, 0.0, 0.03, P.cuir, tete, 1502)); B(-0.09, 0.09, 1.405, 1.425, 0.0, 0.1, P.cuir, tete, 1502);
  niv = 0;   // la jugulaire, sous le menton
  // les barbes (la bouche reste visible entre la moustache et le menton : sa ligne est à 1,46 m)
  niv = 1;
  B(-0.065, 0.065, 1.478, 1.5, 0.1, 0.122, P.cheveux, tete, 301);                        // la moustache
  B(-0.035, 0.035, 1.42, 1.455, 0.1, 0.122, P.cheveux, tete, 302);                       // le bouc
  niv = 0;
  B(-0.1, 0.1, 1.42, 1.456, 0.1, 0.124, P.cheveux, tete, 303);                            // la barbe pleine : le menton,
  cote(s => B(...x(s, 0.07, 0.1), 1.456, 1.52, 0.1, 0.122, P.cheveux, tete, 303));        // les joues,
  cote(s => B(...x(s, 0.1, 0.112), 1.43, 1.54, -0.02, 0.1, P.cheveux, tete, 303));        // les côtés,
  niv = 1;
  B(-0.065, 0.065, 1.478, 1.5, 0.1, 0.122, P.cheveux, tete, 303);                          // la moustache
  cote(s => B(...x(s, 0.1, 0.115), 1.46, 1.6, 0.0, 0.1, P.cheveux, tete, 304));           // les favoris,
  B(-0.065, 0.065, 1.478, 1.5, 0.1, 0.122, P.cheveux, tete, 304);                          // et la moustache
  niv = 0;
  // le fusil (les officiers n'en ont pas : le pistolet)
  B(0.37, 0.42, 0.55, 1.95, -0.03, 0.03, P.bois, fusil, 1100); B(0.385, 0.405, 1.95, 2.2, -0.012, 0.012, P.metal, fusil, 1100); B(0.36, 0.43, 1.0, 1.4, -0.018, 0.018, P.metal, fusil, 1100);
  // les accessoires (le numéro du bit : `ACCESSOIRES` de data/aspect-soldat.js)
  niv = 1; B(0.03, 0.06, 1.455, 1.475, 0.1, 0.2, P.bois, tete, 400); B(0.03, 0.07, 1.475, 1.54, 0.17, 0.21, P.bois, tete, 400); niv = 0;        // 0 la pipe
  B(0.26, 0.34, 0.72, 1.0, -0.1, 0.12, P.claire, tronc, 401);                              // 1 la musette
  B(0.08, 0.14, 0.7, 1.2, -0.36, -0.32, P.bois, tronc, 402); B(0.04, 0.18, 0.55, 0.75, -0.36, -0.32, P.metal, tronc, 402);     // 2 la pelle
  B(-0.12, 0.12, 1.0, 1.18, 0.17, 0.29, P.cuir, tronc, 403);                              // 3 les jumelles
  niv = 1; B(-0.095, 0.095, 1.527, 1.555, 0.1, 0.108, P.trait, tete, 404); cote(s => B(...x(s, 0.1, 0.108), 1.535, 1.55, -0.02, 0.1, P.trait, tete, 404)); niv = 0;   // 4 les lunettes
  B(-0.3, -0.2, 0.78, 0.98, 0.05, 0.2, P.cuir, tronc, 405);                                // 5 la sacoche
  B(-0.1, 0.1, 1.0, 1.22, 0.17, 0.28, P.toile, tronc, 406);                                // 6 le masque à gaz
  B(-0.27, -0.14, 1.3, 1.44, -0.19, 0.19, P.toile, tronc, 407);                            // 7 la couverture en bandoulière : sur l'épaule gauche, puis en biais jusqu'à la hanche droite
  for (const [x0, y0] of [[-0.16, 1.2], [-0.04, 1.1], [0.08, 1.0], [0.18, 0.92]]) { B(x0, x0 + 0.14, y0, y0 + 0.16, 0.15, 0.2, P.toile, tronc, 407); B(x0, x0 + 0.14, y0, y0 + 0.16, -0.2, -0.15, P.toile, tronc, 407); }
  niv = 1;
  B(0.04, 0.055, 1.458, 1.468, 0.1, 0.2, P.os, tete, 408);                                  // 8 la cigarette
  cote(s => B(...x(s, 0.14, 0.2), 0.7, 0.88, 0.17, 0.22, P.metal, tronc, 409));           // 9 les grenades
  niv = 0;
  B(-0.375, -0.245, 1.22, 1.34, -0.09, 0.09, P.os, brasG, 410);                              // 10 le brassard
  B(-0.11, 0.11, 1.38, 1.46, -0.11, 0.11, P.claire, tete, 411);                             // 11 le cache-nez
  // les pansements des blessés
  B(-0.375, -0.245, 1.1, 1.24, -0.085, 0.085, P.os, brasG, 601);
  B(-0.215, -0.015, 0.62, 0.78, -0.11, 0.11, P.os, cuisseG, 602);
  B(-0.112, 0.112, 1.55, 1.64, -0.112, 0.112, P.os, tete, 603);
  return L;
}

// La géométrie : quatre faces par boîte (dessus, devant, est, ouest, comme les soldats du jeu : DoubleSide cache le reste), ou cinq (`complet` : le derrière aussi, pour la fabrique qu'on fait tourner)
// `filtre(boite)` : ne garder que certaines boîtes (un maillage par option : le corps seul, puis chaque coiffe, barbe ou accessoire dans son propre maillage, qui ne porte que ceux qui l'ont)
// `niveau` : 'fin' (défaut : les boîtes de niveau 0 et 1) ou 'moyen' (0 et 2 : le niveau intermédiaire, de 12 à 16 px/m)
export function modeleArticule({ complet = false, filtre = null, niveau = 'fin' } = {}) {
  const pos = [], part = [], os = [], show = [], nor = [];
  let nBoites = 0;
  for (const [x0, x1, y0, y1, z0, z1, p, o, s, haut, avant, rot] of boites().filter(b => (niveau === 'moyen' ? b[12] !== 1 : b[12] !== 2) && (!filtre || filtre(b)))) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, c = Math.cos(rot || 0), sn = Math.sin(rot || 0);
    const r = v => rot ? [cx + (v[0] - cx) * c + (v[2] - cz) * sn, v[1], cz - (v[0] - cx) * sn + (v[2] - cz) * c] : v;      // une boîte tournée de 45° autour de y : les anneaux octogonaux des casques
    // la normale de la face (tournée avec la boîte) : l'éclairage de relief se calcule par sommet, face par face (les dérivées de l'écran faisaient du bruit à 40 pixels de haut)
    const q = (a, b, cc, d, k, nx, ny, nz) => { pos.push(...r(a), ...r(b), ...r(cc), ...r(a), ...r(cc), ...r(d)); const mx = nx * c + nz * sn, mz = -nx * sn + nz * c; for (let n = 0; n < 6; n++) { part.push(k); os.push(o); show.push(s); nor.push(mx, ny, mz); } };
    q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], haut, 0, 1, 0);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], avant, 0, 0, 1);
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], p, 1, 0, 0);
    q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], p, -1, 0, 0);
    if (complet) q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], p, 0, 0, -1);
    nBoites++;
  }
  return { position: new Float32Array(pos), part: new Float32Array(part), os: new Float32Array(os), show: new Float32Array(show), nor: new Float32Array(nor), triangles: pos.length / 9, boites: nBoites };
}

// Les triangles qu'un homme dessine vraiment (les autres sont aplatis par le nuanceur : ils coûtent leurs sommets, pas leurs pixels)
export function trianglesVisibles(a, camp, blessure = 0, { complet = false, niveau = 'fin' } = {}) {
  let n = 0;
  for (const b of boites()) if ((niveau === 'moyen' ? b[12] !== 1 : b[12] !== 2) && voir(b[8], a, camp, blessure)) n += complet ? 10 : 8;
  return n;
}

// ─── le nuanceur ───
export const VERT = `
  attribute float aPart; attribute float aOs; attribute float aShow; attribute vec3 aNor;
  attribute vec3 aPos; attribute float aCamp; attribute float aWound; attribute float aCap; attribute float aGrade;
  attribute vec4 aPose; attribute vec4 aBody; attribute vec4 aLook; attribute vec4 aLook2;
  uniform float uT; uniform float uShade;
  varying float vPart; varying float vCamp; varying vec2 vFace; varying float vShade; varying vec4 vLook; varying vec4 vLook2;
  float sl, st, wd, vt;
  bool voir(float code) {
    float genre = floor(code / 100.0 + 0.001), v = code - genre * 100.0;
    float coiffe = aLook.x, cheveux = aLook.y, barbe = aLook.w, rang = aGrade;
    float camp = aCamp > 1.5 ? aCamp - 2.0 : aCamp;
    if (genre < 0.5) return true;
    if (genre < 1.5) return abs(coiffe - v) < 0.5;
    if (genre < 2.5) return abs(cheveux - v) < 0.5 && abs(aWound - 3.0) < 0.5;
    if (genre < 3.5) return abs(barbe - v) < 0.5;
    if (genre < 4.5) return mod(floor(aLook2.x / exp2(v) + 0.001), 2.0) > 0.5;
    if (genre < 5.5) return abs(camp - v) < 0.5;
    if (genre < 6.5) return abs(aWound - v) < 0.5;
    if (genre < 7.5) return cheveux > 0.5;
    if (genre < 10.5) return rang < 2.5;
    if (genre < 11.5) return rang > 2.5;
    if (genre < 15.5) return abs(aWound - 3.0) > 0.5 && (v > 1.5 || abs(camp - v) < 0.5);
    if (genre < 16.5) return false;
    if (genre < 17.5) return camp < 0.5 && rang < v + 0.5;
    if (genre < 18.5) return camp > 0.5 && rang < v + 0.5;
    if (genre < 19.5) return false;
    if (genre < 20.5) return camp < 0.5 && rang > 2.5 && rang < v + 0.5;
    return camp > 0.5 && rang > 2.5 && rang < v + 0.5;
  }
  vec3 mp(vec3 p, float xs, float zs) { float y = p.y <= 0.9 ? p.y * sl : 0.9 * sl + (p.y - 0.9) * st; return vec3(p.x * xs, y, p.z * zs); }
  vec3 rx(vec3 p, vec3 pv, float a) { vec3 d = p - pv; float c = cos(a), s = sin(a); return pv + vec3(d.x, d.y * c + d.z * s, d.z * c - d.y * s); }
  vec3 ry(vec3 p, vec3 pv, float a) { vec3 d = p - pv; float c = cos(a), s = sin(a); return pv + vec3(d.x * c + d.z * s, d.y, d.z * c - d.x * s); }
  void main() {
    float b = floor(aOs + 0.5);
    vPart = aPart; vCamp = aCamp; vLook = aLook; vLook2 = aLook2;
    vFace = vec2((position.x + 0.1) / 0.2, (position.y - 1.42) / 0.22);
    // la carrure : la hauteur (jambes et tronc ne grandissent pas pareil), la largeur des épaules, le ventre, la tête
    sl = aBody.x * aBody.z; st = aBody.x * (1.0 + (1.0 - aBody.z) * 0.6); wd = aBody.y; vt = aLook2.w;
    bool jambeOs = b > 5.5 && b < 11.5;
    float xs = b > 0.5 && b < 1.5 ? 1.0 : (jambeOs ? sqrt(wd) : wd);
    float zs = (b < 0.5 || b > 12.5) ? vt : 1.0;
    vec3 p0 = position;
    if (b > 0.5 && b < 1.5) p0 = vec3(0.0, 1.42, 0.0) + (p0 - vec3(0.0, 1.42, 0.0)) * aBody.w;
    vec3 p = mp(p0, xs, zs);
    // la pose : la vitesse (aPose.x), le tir (aPose.y), l'accroupi (aPose.z), couché (aPose.w) ; la blessure (aWound : 1 bras, 2 jambe, 3 tête)
    float vit = max(aPose.x, 0.0), v = min(1.0, vit), tir = aPose.y, tapi = aPose.z, couche = aPose.w;
    float ph = uT * 8.0 + aPos.x * 1.7 + aPos.z * 1.3;
    bool genou = aWound > 1.5 && aWound < 2.5 && vit < 0.15;
    float lean = 0.07 * v + 0.12 * tir + 0.55 * tapi + (genou ? 0.35 : 0.0);
    vec3 hanche = mp(vec3(0.0, 0.9, 0.0), 1.0, 1.0);
    bool gauche = (b > 1.5 && b < 3.5) || (b > 5.5 && b < 8.5);
    if (jambeOs) {
      float cote = gauche ? -1.0 : 1.0;
      float pj = ph + (gauche ? 0.0 : 3.14159);
      float hip = sin(pj) * 0.55 * v, kn = 0.9 * v * max(0.0, cos(pj));
      hip += tapi * 1.05; kn += tapi * 1.9;
      if (couche > 0.5) { hip = gauche ? 0.3 : 0.0; kn = gauche ? 0.7 : 0.1; }
      if (genou) { hip = gauche ? 0.2 : 1.3; kn = gauche ? 2.0 : 1.5; }
      vec3 hp = mp(vec3(cote * 0.11, 0.9, 0.0), sqrt(wd), 1.0), kp = mp(vec3(cote * 0.11, 0.5, 0.0), sqrt(wd), 1.0), ap = mp(vec3(cote * 0.11, 0.08, 0.0), sqrt(wd), 1.0);
      if ((b > 7.5 && b < 8.5) || b > 10.5) p = rx(p, ap, (kn - hip) * 0.8);
      if ((b > 6.5 && b < 8.5) || b > 9.5) p = rx(p, kp, -kn);
      p = rx(p, hp, hip);
    }
    bool brasOs = b > 1.5 && b < 5.5;
    if (brasOs) {
      float cote = gauche ? -1.0 : 1.0;
      float pb = ph + (gauche ? 3.14159 : 0.0);
      float sh = sin(pb) * 0.5 * v, el = 0.25 + 0.35 * v * max(0.0, sin(pb)), conv = 0.0;
      bool pistolet = aGrade < 2.5;
      sh = mix(sh, pistolet ? (gauche ? 0.25 : 1.2) : 1.35, tir); el = mix(el, pistolet ? (gauche ? 0.5 : 0.4) : (gauche ? 0.35 : 0.7), tir); conv = tir * (pistolet ? (gauche ? 0.0 : -0.15) : (gauche ? 0.6 : -0.5));
      sh = mix(sh, 0.7, tapi); el = mix(el, 1.5, tapi);
      if (couche > 0.5) { sh = 0.0; el = 0.1; }
      if (aWound > 0.5 && aWound < 1.5 && gauche) { sh = 0.5; el = 1.9; conv = 0.6; }
      vec3 sp = mp(vec3(cote * 0.30, 1.38, 0.0), wd, 1.0), ep = mp(vec3(cote * 0.30, 1.08, 0.0), wd, 1.0);
      if ((b > 2.5 && b < 3.5) || b > 4.5) p = rx(p, ep, el);
      p = rx(p, sp, sh);
      p = ry(p, sp, conv);
    }
    // le fusil : en bandoulière, ou à l'épaule quand il tire
    if (b > 11.5 && b < 12.5) { p.x -= 0.28 * tir * wd; p = rx(p, mp(vec3(0.0, 1.3, 0.0), 1.0, 1.0), -1.45 * tir); }
    // les basques de la vareuse : elles suivent les cuisses à moitié quand l'homme s'accroupit ou s'agenouille
    if (b > 12.5) p = rx(p, hanche, 0.75 * tapi + (genou ? 0.4 : 0.0));
    // la tête penchée (blessure à la tête)
    if (b > 0.5 && b < 1.5 && aWound > 2.5) p = rx(p, mp(vec3(0.0, 1.42, 0.0), 1.0, 1.0), 0.45);
    // le buste penché autour de la hanche (le tronc, la tête, les bras, le fusil, les basques)
    bool haut = b < 5.5 || b > 11.5;
    if (haut) p = rx(p, hanche, lean);
    p.y -= 0.44 * tapi + (genou ? 0.42 : 0.0);
    // couché sur le dos, la tête vers l'arrière
    if (couche > 0.5) { p = rx(p, vec3(0.0), 1.5708); p.y += 0.16; }
    // le cap
    float c = cos(aCap), s = sin(aCap);
    p.xz = vec2(p.x * c + p.z * s, -p.x * s + p.z * c);
    if (!voir(aShow)) p = vec3(0.0);
    // l'éclairage de relief (au labo et pour les hommes articulés, uShade : 0 redonne les aplats) : le dessus plus clair, les côtés plus sombres, d'après la normale de la face tournée par le cap
    vec3 nw = vec3(aNor.x * c + aNor.z * s, aNor.y, -aNor.x * s + aNor.z * c);
    vShade = mix(1.0, 0.58 + 0.42 * max(dot(nw, normalize(vec3(-0.35, 0.8, 0.5))), 0.0), uShade);
    gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
  }`;

export const FRAG = `
  uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel; uniform vec3 uJambes; uniform vec3 uBois; uniform vec3 uToile; uniform vec3 uCuir; uniform vec3 uBotte; uniform vec3 uMetal; uniform vec3 uTrait;
  uniform vec3 uPeau[3]; uniform vec3 uMarque[3]; uniform vec3 uCh[5];
  varying float vPart; varying float vCamp; varying vec2 vFace; varying float vShade; varying vec4 vLook; varying vec4 vLook2;
  // le visage : une grille de 12 × 12 cases (1,7 cm chacune) ; yeux (le blanc et la pupille), paupières, sourcils, nez, bouche, rides (vLook2.z : yeux + 3 nez + 9 bouche + 27 sourcils + 81 rides)
  bool dans(int iu, int a, int b) { return iu >= a && iu <= b; }
  vec3 visage(vec3 peau, vec3 marque, vec3 cheveux) {
    float t = vLook2.z;
    float yeux = mod(t, 3.0), nez = mod(floor(t / 3.0), 3.0), bouche = mod(floor(t / 9.0), 3.0), sourcils = mod(floor(t / 27.0), 3.0), rides = floor(t / 81.0);
    int iu = int(floor(clamp(vFace.x, 0.0, 0.999) * 12.0)), iv = int(floor(clamp(vFace.y, 0.0, 0.999) * 12.0));
    int a = (yeux > 0.5 && yeux < 1.5) ? 3 : 2;           // la case extérieure de l'œil gauche ; l'œil droit lui répond : jamais collés (au moins deux cases entre eux)
    int er = yeux > 1.5 ? 7 : 6;                          // la rangée des yeux (au milieu de la tête)
    vec3 c = peau;
    bool ogauche = dans(iu, a, a + 1), odroit = dans(iu, 10 - a, 11 - a);
    bool oeil = ogauche || odroit;
    if (vLook.y > 0.5 && iv >= 11) c = cheveux;                                  // la racine des cheveux, sous le casque
    // les rides : le pli du nez à la bouche, les pattes d'oie, le front
    if (rides > 0.5) {
      if ((iu == 2 || iu == 9) && iv >= 2 && iv <= 4) c = marque;
      if (iv == er && (iu == a - 1 || iu == 12 - a)) c = marque;
    }
    if (rides > 1.5 && iv == 10 && dans(iu, 3, 8) && mod(float(iu), 2.0) < 0.5) c = marque;
    // la paupière et l'œil : le blanc, la pupille du côté du nez
    if (iv == er + 1 && oeil) c = marque;
    if (iv == er && oeil) c = (iu == a + 1 || iu == 10 - a) ? uOmbre : (vLook2.y < 0.5 ? uMetal : uSel);          // le blanc de l'œil : brume sur la peau pâle, os sur les autres
    // les sourcils : fins (une rangée) ou épais (deux)
    bool sg = dans(iu, a - 1, a + 2), sd = dans(iu, 9 - a, 12 - a);
    if (sourcils > 0.5 && (sg || sd) && (iv == er + 2 || (sourcils > 1.5 && iv == er + 3))) c = cheveux;
    // le nez : les narines, l'arête dans l'ombre, les ailes, la base large
    if (iv == er - 2 && dans(iu, 5, 6)) c = marque;
    if (nez > 0.5 && iu == 5 && iv == er - 1) c = marque;
    if (nez > 0.5 && iv == er - 2 && (iu == 4 || iu == 7)) c = marque;
    if (nez > 1.5 && iv == er - 3 && dans(iu, 4, 7)) c = marque;
    // la bouche : le pli, la lèvre inférieure, les commissures
    bool large = bouche > 1.5;
    bool pli = (bouche < 0.5) ? dans(iu, 4, 7) : dans(iu, 3, 8);
    if (iv == 2 && pli) c = uTrait;
    if (bouche > 0.5 && iv == 1 && (large ? dans(iu, 3, 8) : dans(iu, 4, 7))) c = marque;
    if (large && iv == 3 && (iu == 3 || iu == 8)) c = marque;
    return c;
  }
  void main() {
    float k = floor(vPart + 0.5);
    bool sel = vCamp > 1.5;
    float camp = sel ? vCamp - 2.0 : vCamp;
    vec3 camps = camp > 0.5 ? uEux : uNous;
    vec3 peau = uPeau[int(vLook2.y + 0.5)], marque = uMarque[int(vLook2.y + 0.5)], cheveux = uCh[int(vLook.z + 0.5)];
    vec3 c = camps;
    if (k == 2.0) c = sel ? uSel : camps;
    else if (k == 4.0) c = uBois;
    else if (k == 5.0) c = uToile;
    else if (k == 6.0 || k == 9.0) c = peau;
    else if (k == 7.0) c = uCuir;
    else if (k == 8.0) c = camp > 0.5 ? uBotte : uCuir;           // les brodequins français sont bruns, les bottes allemandes noires
    else if (k == 10.0) c = cheveux;
    else if (k == 12.0) c = uMetal;
    else if (k == 14.0) c = uTrait;
    else if (k == 15.0) c = uSel;
    else if (k == 17.0) c = uMetal;
    else if (k == 16.0) c = gl_FrontFacing ? visage(peau, marque, cheveux) : cheveux;
    gl_FragColor = vec4(c * vShade, 1.0);
  }`;

// L'ombre au sol (le jeu seulement) : un quadrilatère par homme, comme celle des soldats du jeu : la couleur du sol un ton plus sombre (la texture `uSol`), fondue vers son bout, qui suit le soleil (`uSoleil`)
export const OMBRE_VERT = `
  attribute vec3 aPos; attribute vec4 aBody;
  uniform vec2 uSoleil;
  varying vec2 vXZ; varying float vLong;
  void main() {
    vec2 d = length(uSoleil) > 0.05 ? normalize(uSoleil) : vec2(0.6, 0.8);
    vec2 xz = vec2(-d.y, d.x) * position.x * aBody.y + (position.y > 0.5 ? uSoleil * 1.7 + d * 0.1 : -d * 0.05);
    vXZ = xz + aPos.xz; vLong = position.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(xz.x + aPos.x, aPos.y + 0.03, xz.y + aPos.z, 1.0);
  }`;
export const OMBRE_FRAG = `
  uniform sampler2D uSol; uniform vec2 uTaille;
  varying vec2 vXZ; varying float vLong;
  void main() { gl_FragColor = vec4(texture2D(uSol, vec2(vXZ.x / uTaille.x, (vXZ.y / uTaille.y + 1.0) * 0.5)).rgb, 0.95 - 0.6 * vLong); }`;

// ─── three.js : le matériau et les instances ───
// `col(lettre)` : une couleur de la palette (celle de creerRendu ou de la fabrique) ; `partages` : des uniformes du jeu à partager (`uT` : l'horloge de l'image, `uSoleil`, `uSol`, `uTaille`) ;
// `ombreSeule` : le maillage des ombres au sol (le jeu), et rien d'autre
export function creerSoldatArticule(THREE, col, { complet = false, ombrage = 0, filtre = null, partages = {}, ombreSeule = false, niveau = 'fin' } = {}) {
  const M = ombreSeule ? ombreEtModele(THREE) : modeleArticule({ complet, filtre, niveau });
  const materiel = ombreSeule
    ? new THREE.ShaderMaterial({ uniforms: { uSoleil: partages.uSoleil ?? { value: new THREE.Vector2(0.5, 0.6) }, uSol: partages.uSol ?? { value: new THREE.DataTexture(new Uint8Array([70, 66, 50, 255]), 1, 1) }, uTaille: partages.uTaille ?? { value: new THREE.Vector2(400, 300) } },
      vertexShader: OMBRE_VERT, fragmentShader: OMBRE_FRAG, side: THREE.DoubleSide, transparent: true })
    : new THREE.ShaderMaterial({
      uniforms: {
        uNous: { value: col('n') }, uEux: { value: col('x') }, uOmbre: { value: col('t') }, uSel: { value: col('o') }, uJambes: { value: col('s') }, uBois: { value: col('t') }, uToile: { value: col('g') },
        uCuir: { value: col('b') }, uBotte: { value: col('t') }, uMetal: { value: col('r') }, uTrait: { value: col('s') },
        uPeau: { value: ['o', 'r', 'g'].map(col) }, uMarque: { value: ['g', 'g', 'b'].map(col) }, uCh: { value: ['t', 's', 'b', 'g', 'r'].map(col) },
        uShade: { value: ombrage }, uT: partages.uT ?? { value: 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    });
  if (ombreSeule && !partages.uSol) materiel.uniforms.uSol.value.needsUpdate = true;
  // un lot de `n` hommes : les tampons d'instance et l'écriture d'un homme
  function instances(n) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(M.position, 3));
    if (!ombreSeule) {
      g.setAttribute('aPart', new THREE.BufferAttribute(M.part, 1));
      g.setAttribute('aOs', new THREE.BufferAttribute(M.os, 1));
      g.setAttribute('aShow', new THREE.BufferAttribute(M.show, 1));
      g.setAttribute('aNor', new THREE.BufferAttribute(M.nor, 3));
    }
    const T = { pos: new Float32Array(n * 3), camp: new Float32Array(n), blessure: new Float32Array(n), cap: new Float32Array(n), grade: new Float32Array(n), pose: new Float32Array(n * 4), corps: new Float32Array(n * 4), aspect: new Float32Array(n * 4), aspect2: new Float32Array(n * 4) };
    const A = (nom, arr, k) => { const a = new THREE.InstancedBufferAttribute(arr, k).setUsage(THREE.DynamicDrawUsage); g.setAttribute(nom, a); return a; };
    const attrs = ombreSeule ? [A('aPos', T.pos, 3), A('aBody', T.corps, 4)]
      : [A('aPos', T.pos, 3), A('aCamp', T.camp, 1), A('aWound', T.blessure, 1), A('aCap', T.cap, 1), A('aGrade', T.grade, 1), A('aPose', T.pose, 4), A('aBody', T.corps, 4), A('aLook', T.aspect, 4), A('aLook2', T.aspect2, 4)];
    g.instanceCount = n;
    const mesh = new THREE.Mesh(g, materiel); mesh.frustumCulled = false;
    // h : { x, y, z, camp, vit, tir, tapi, couche, blessure, cap, aspect } (`aspect` : l'objet de js/aspect-soldat.js)
    function ecrire(i, h) {
      const a = h.aspect, c = a.carrure, t = a.traits;
      T.pos[i * 3] = h.x ?? 0; T.pos[i * 3 + 1] = h.y ?? 0; T.pos[i * 3 + 2] = h.z ?? 0;
      T.corps[i * 4] = c.taille; T.corps[i * 4 + 1] = c.epaules; T.corps[i * 4 + 2] = c.jambes; T.corps[i * 4 + 3] = c.tete;
      if (ombreSeule) return;
      T.camp[i] = h.camp ?? 0; T.blessure[i] = h.blessure ?? 0; T.cap[i] = h.cap ?? 0; T.grade[i] = a.rang ?? 6;
      T.pose[i * 4] = h.vit ?? 0; T.pose[i * 4 + 1] = h.tir ?? 0; T.pose[i * 4 + 2] = h.tapi ?? 0; T.pose[i * 4 + 3] = h.couche ?? 0;
      T.aspect[i * 4] = a.coiffe; T.aspect[i * 4 + 1] = a.cheveux; T.aspect[i * 4 + 2] = a.couleur; T.aspect[i * 4 + 3] = a.barbe;
      T.aspect2[i * 4] = a.acc; T.aspect2[i * 4 + 1] = a.peau; T.aspect2[i * 4 + 2] = t.yeux + 3 * t.nez + 9 * t.bouche + 27 * t.sourcils + 81 * (t.rides || 0); T.aspect2[i * 4 + 3] = c.ventre;
    }
    // envoyer au processeur graphique les `k` premiers hommes seulement
    function envoyer(k) { g.instanceCount = k; for (const at of attrs) { at.clearUpdateRanges(); at.addUpdateRange(0, k * at.itemSize); at.needsUpdate = true; } }
    return { geometrie: g, mesh, ecrire, envoyer, attrs };
  }
  return { materiel, instances, modele: M };
}
// le quadrilatère de l'ombre : 0,44 m de large, y = 1 : le bout (le nuanceur le pose selon le soleil)
function ombreEtModele() {
  const p = [-0.22, 0, 0, 0.22, 0, 0, 0.22, 1, 0, -0.22, 0, 0, 0.22, 1, 0, -0.22, 1, 0];
  return { position: new Float32Array(p), triangles: 2, boites: 0 };
}

// Les hommes d'un lot, le jeu : un maillage par option (le corps seul pour tous, puis chaque casque, barbe, accessoire, galon dans le sien, avec les seuls hommes qui l'ont : le schéma des pansements
// et des grades) et un maillage d'ombres. `capacite` : le nombre d'hommes au plus ; `ajouter(h)` écrit un homme (le même objet que `ecrire`), `fin()` envoie les tampons.
export function creerEquipeArticulee(THREE, col, { capacite, ombrage = 0, partages = {}, niveau = 'fin' }) {
  const codes = [...new Set(boites().map(b => b[8]))].sort((a, b) => a - b);
  const groupes = [];
  for (const code of codes) {
    const S = creerSoldatArticule(THREE, col, { ombrage, filtre: b => b[8] === code, partages, niveau });
    if (!S.modele.triangles) continue;
    const lot = S.instances(capacite); lot.mesh.renderOrder = 2; lot.envoyer(0);
    groupes.push({ code, S, lot, n: 0 });
  }
  const O = creerSoldatArticule(THREE, col, { ombreSeule: true, partages });
  const ombres = O.instances(capacite); ombres.mesh.renderOrder = 1.9; ombres.envoyer(0);
  let nO = 0;
  const meshes = [ombres.mesh, ...groupes.map(g => g.lot.mesh)];
  return {
    meshes,
    debut() { nO = 0; for (const g of groupes) g.n = 0; },
    ajouter(h) {
      if (nO >= capacite) return false;
      ombres.ecrire(nO++, h);
      const camp = (h.camp ?? 0) & 1;
      for (const g of groupes) if (g.n < capacite && voir(g.code, h.aspect, camp, h.blessure ?? 0)) g.lot.ecrire(g.n++, h);
      return true;
    },
    fin() { ombres.envoyer(nO); for (const g of groupes) g.lot.envoyer(g.n); return nO; },
    get compte() { return nO; },
    get appels() { return groupes.length + 1; },
    dispose() { for (const m of meshes) m.geometry.dispose(); for (const g of groupes) g.S.materiel.dispose(); O.materiel.dispose(); },
  };
}
