/* Les épaves (Jérôme, 1er novembre : « la carcasse reste sur le champ de bataille ; ses éléments sont dispersés en fonction de la chute, ailes et fuselage ne sont plus attachés à tous les coups ; il faut une impression de chaos ;
   les chars détruits ont des dégâts visibles (parties brûlées, chenilles détruites, éventrement), la destruction est différente pour chaque char »).
   La disposition d'une épave : de purs tirages d'un hachage de la graine (`hash2`, jamais `Math.random` : la même épave à chaque lancement, chez les deux joueurs), sans THREE ni état. Le dessin (rendu/epaves.js) la lit ;
   le labo (« Les épaves ») la montre douze fois de suite avec des graines différentes ; rien n'est sauvegardé, rien ne touche la partie. Repère de l'avion : l'avant à +x (le cap de la chute), la droite à +z, le haut à +y. */
import { hash2 } from './lib/rng.js?v=0.109.1';

export const EPAVES = {
  // les pièces d'un biplan et la chance de chacune de se détacher de la carcasse (le fuselage ne le fait jamais), avec au moins `auMoins` pièces libres
  avion: {
    auMoins: 3,
    libre: { queue: 0.6, moteur: 0.4, hautG: 0.7, hautD: 0.7, basG: 0.6, basD: 0.6, trainG: 0.75, trainD: 0.75 },
    brule: { fuselage: 0.4, queue: 0.3, hautG: 0.4, hautD: 0.4, basG: 0.3, basD: 0.3 },
    cote: 0.15,                       // la chance qu'une aile ou une roue aille de l'autre côté de l'axe
    portee: { hautG: [-3, 14], hautD: [-3, 14], basG: [-3, 12], basD: [-3, 12], queue: [-6, 8], moteur: [3, 18], trainG: [-2, 20], trainD: [-2, 20] },
    ecart: { hautG: [2.5, 11], hautD: [2.5, 11], basG: [2, 9], basD: [2, 9], queue: [0, 7], moteur: [0, 6], trainG: [1, 10], trainD: [1, 10] },
  },
  char: {
    chenille: { intacte: 0.3, cassee: 0.4, deroulee: 0.3 },
    eventre: { non: 0.3, flanc: 0.4, ventre: 0.3 },
    coupole: { place: 0.35, ouverte: 0.35, arrachee: 0.3 },
    canon: { droit: 0.35, plie: 0.4, arrache: 0.25 },
    brule: { non: 0.2, taches: 0.4, noirci: 0.4 },
  },
};

// Un tirage dans une liste de poids { nom: poids } : le nom
function parPoids(poids, u) {
  const total = Object.values(poids).reduce((a, b) => a + b, 0);
  let r = u * total;
  for (const [nom, p] of Object.entries(poids)) { if (r < p) return nom; r -= p; }
  return Object.keys(poids).pop();
}

/* La disposition d'un biplan écrasé : { pieces: { nom: { libre, brule, dx, dz, yaw, roulis, tangage, enfonce } }, fuselage }.
   Pour une pièce libre, (dx, dz) est son décalage par rapport au fuselage (m, l'avant à +x), yaw / roulis (autour de l'axe de l'avant) / tangage (nez en bas : positif) en rad,
   `enfonce` : de combien elle est enterrée (m). Une pièce qui n'est pas libre suit le fuselage (avec un petit gauchissement : `yaw`, `roulis`). */
export function dispositionAvion(graine) {
  const E = EPAVES.avion;
  let n = 0;
  const r = () => hash2(graine, n++, 6203), entre = (a, b) => a + (b - a) * r(), signe = () => r() < 0.5 ? -1 : 1;
  const pose = (type) => {                                       // l'attitude d'une pièce à terre : à plat, sur la tranche, ou sur le dos
    const u = r();
    if (type === 'poids') return u < 0.45 ? entre(-0.3, 0.3) : u < 0.85 ? signe() * entre(1.1, 1.55) : Math.PI + entre(-0.25, 0.25);
    return u < 0.6 ? entre(-0.2, 0.2) : u < 0.85 ? signe() * entre(1.2, 1.6) : Math.PI + entre(-0.2, 0.2);
  };
  const pieces = {};
  // le fuselage : glisse devant, de travers, sur le flanc ou à plat, le nez plus ou moins planté
  const fu = r();
  pieces.fuselage = {
    libre: false, brule: r() < E.brule.fuselage, dx: entre(0, 4), dz: entre(-1.3, 1.3), yaw: entre(-0.7, 0.7),
    roulis: fu < 0.45 ? entre(-0.25, 0.25) : fu < 0.85 ? signe() * entre(1.1, 1.5) : Math.PI + entre(-0.2, 0.2),
    tangage: entre(0.05, 0.5), enfonce: entre(0, 0.7),
  };
  for (const nom of Object.keys(E.libre)) {
    const cote = nom.endsWith('G') ? -1 : nom.endsWith('D') ? 1 : signe();
    const libre = r() < E.libre[nom], [a, b] = E.portee[nom], [c, d] = E.ecart[nom];
    const dz = (r() < E.cote ? -cote : cote) * entre(c, d);
    pieces[nom] = {
      libre, brule: r() < (E.brule[nom] ?? 0.25), dx: entre(a, b), dz, yaw: entre(-1.4, 1.4), roulis: pose(nom === 'moteur' ? 'poids' : 'plat'),
      tangage: entre(-0.3, 0.3), enfonce: nom === 'moteur' ? entre(0.2, 0.6) : entre(0, 0.35),
    };
    if (!libre) { pieces[nom].yaw = entre(-0.12, 0.12); pieces[nom].roulis = entre(-0.15, 0.15); }       // une aile qui tient encore est tordue
  }
  // au moins `auMoins` pièces libres : on détache les plus fragiles (celles qui ont tiré la plus haute chance)
  const noms = Object.keys(E.libre);
  while (noms.filter(k => pieces[k].libre).length < E.auMoins) {
    const k = noms.filter(x => !pieces[x].libre).sort((p, q) => E.libre[q] - E.libre[p])[0];
    const [a, b] = E.portee[k], [c, d] = E.ecart[k], cote = k.endsWith('G') ? -1 : k.endsWith('D') ? 1 : signe();
    Object.assign(pieces[k], { libre: true, dx: entre(a, b), dz: cote * entre(c, d), yaw: entre(-1.4, 1.4), roulis: pose('plat') });
  }
  return { graine, pieces };
}

/* La disposition d'un char détruit : chaque côté de chenille (`chenilles[0]` : la gauche, `[1]` : la droite) intacte, cassée (la moitié arrière pend) ou déroulée à terre ; la caisse éventrée par le flanc (`cote` : -1 gauche, 1 droite)
   ou par le ventre ; la coupole en place, ouverte ou arrachée (et gisant plus loin) ; le canon droit, plié ou arraché ; le feu (rien, des taches, tout noirci) ; l'assiette (roulis, tangage, enfoncement) et des débris. */
export function dispositionChar(graine) {
  const E = EPAVES.char;
  let n = 0;
  const r = () => hash2(graine, n++, 6311), entre = (a, b) => a + (b - a) * r(), signe = () => r() < 0.5 ? -1 : 1;
  const chenilles = [parPoids(E.chenille, r()), parPoids(E.chenille, r())];
  if (chenilles[0] === 'intacte' && chenilles[1] === 'intacte' && r() < 0.7) chenilles[signe() < 0 ? 0 : 1] = r() < 0.5 ? 'cassee' : 'deroulee';       // au moins une chenille souffre, le plus souvent
  const eventre = parPoids(E.eventre, r()), cote = signe();
  const coupole = parPoids(E.coupole, r()), canon = parPoids(E.canon, r()), brule = parPoids(E.brule, r());
  const debris = [];
  const nb = 4 + Math.floor(r() * 5);
  for (let k = 0; k < nb; k++) {
    const type = ['plaque', 'plaque', 'maillon', 'poutre', 'roue'][Math.floor(r() * 5)];
    const a = r() * 2 * Math.PI, d = entre(2.5, 9);
    debris.push({ type, dx: Math.cos(a) * d, dz: Math.sin(a) * d, yaw: entre(0, Math.PI * 2), roulis: r() < 0.3 ? entre(-1.4, 1.4) : entre(-0.2, 0.2), taille: entre(0.6, 1.5) });
  }
  return {
    graine, chenilles, eventre, cote, coupole, canon, brule, debris,
    roulis: signe() * entre(0, chenilles.some(c => c !== 'intacte') ? 0.34 : 0.18), tangage: entre(-0.14, 0.14), enfonce: entre(0, 0.3),
    arrachee: coupole === 'arrachee' ? { dx: signe() * entre(3, 8), dz: signe() * entre(3, 8) } : null,           // où gît la coupole
    canonAbattu: canon === 'arrache' ? { dx: entre(-7, 7), dz: entre(3, 8) * signe() } : null,
  };
}
