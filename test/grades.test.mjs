// Les grades à l'écran (v0.68.0) : de quel rang à quelle classe de dessin, les variantes bien formées, la place du commandement (proposée, pas encore dans le jeu).
import { nouvelleBataille, rangDe } from '../js/bataille.js';
import { placesCommandement } from '../js/army.js';
import { grade } from '../js/identite.js';
import { CLASSE_DU_RANG, CLASSES, GRADES, classeDuRang } from '../js/data/grades.js';
import { REGLAGES as R } from '../js/data/reglages.js';
import { NOMS } from '../js/data/noms.js';

const petite = (graine = 3) => nouvelleBataille(graine, R, { soldats: 200, jours: 3 });

group('grades');
test('chaque rang a sa classe, du capitaine (4) au soldat (0), dans les deux camps', () => {
  for (const camp of ['nous', 'eux']) assert.equal(NOMS[camp].grades.length, CLASSE_DU_RANG.length, 'un rang de grade par entrée de la table');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(classeDuRang), [4, 3, 3, 2, 2, 1, 0, 0]);
  assert.equal(CLASSES.length, 5);
  assert.equal(classeDuRang(99), 0, 'un rang inconnu est un soldat');
});
test('un régiment a un capitaine, deux lieutenants et des gradés en dessous, sans en inventer', () => {
  for (const n of [40, 125, 250]) {
    const classes = Array.from({ length: n }, (_, k) => classeDuRang(grade(k, n)));
    const nb = c => classes.filter(x => x === c).length;
    assert.equal(nb(4), 1); assert.equal(nb(3), 2); assert.ok(nb(2) >= 1 && nb(1) >= 1);
    assert.ok(classes.filter(x => x > 0).length <= n * 0.35, 'plus de deux hommes sur trois sont des soldats : la troupe reste la troupe');
  }
});
test('les variantes sont bien formées : cinq classes, des pièces qui existent, le soldat sans rien', () => {
  const pieces = new Set(['mat', 'kepiSombre', 'kepiBande', 'manteau', 'jumelles', 'carte', 'pistolet', 'galons2', 'galons3', 'chevrons1', 'chevrons2', 'brassard', 'baudrier', 'epaulette1', 'epaulettes']);
  for (const [cle, V] of Object.entries(GRADES)) {
    assert.equal(V.classes.length, 5, cle);
    assert.deepEqual(V.classes[0], {}, `${cle} : le soldat est la référence`);
    for (const c of V.classes) for (const p of c.pieces ?? []) assert.ok(pieces.has(p), `${cle} : la pièce ${p} existe`);
    const tailles = V.classes.map(c => c.points ?? 2);
    assert.ok(tailles.every((t, k) => k === 0 || t >= tailles[k - 1]), `${cle} : plus le grade est haut, plus le point est grand`);
    assert.ok(V.classes[4].pieces.length > V.classes[3].pieces.length - 1 && V.classes[4].pieces.length > 0, `${cle} : le capitaine porte plus que le lieutenant`);
    assert.ok(V.classes.every(c => (c.echelle ?? 1) < 1.15), `${cle} : jamais un soldat simplement agrandi`);
  }
});
test('le commandement : le capitaine au milieu du premier rang, les lieutenants à ses côtés, l\'adjudant derrière lui, des places toutes différentes', () => {
  for (const [cols, n] of [[14, 70], [25, 125], [9, 40]]) {
    const o = { cols }, [c, l1, l2, adj] = placesCommandement(o, n), col = s => s % cols, rang = s => Math.floor(s / cols);
    assert.equal(rang(c), 0); assert.equal(col(c), Math.floor(cols / 2));
    assert.ok(rang(l1) === 0 && rang(l2) === 0 && col(l1) < col(c) && col(c) < col(l2));
    assert.deepEqual([rang(adj), col(adj)], [1, col(c)]);
    assert.equal(new Set([c, l1, l2, adj]).size, 4);
  }
  // en tranchée : le long du tracé, les rangs sont les colonnes de profondeur
  const t = { cols: 10, trace: { rangs: 2 } }, [c, , , adj] = placesCommandement(t, 20);
  assert.deepEqual([Math.floor(c / 2), c % 2, adj % 2], [5, 0, 1]);
});
test('la partie ne change pas : le capitaine et les lieutenants sont toujours aux premières places (le commandement au milieu du rang est une proposition à part)', () => {
  const B = petite(), A = B.armee;
  for (const reg of B.etat.regiments) {
    const k = i => A.slot[i], premiers = [];
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && rangDe(B, A.id[i], reg.id) <= 2) premiers.push(k(i));
    assert.deepEqual(premiers.sort((a, b) => a - b), [0, 1, 2], `régiment ${reg.id}`);
  }
});
