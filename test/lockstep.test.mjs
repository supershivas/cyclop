// Le jeu à deux : deux machines, les mêmes ordres aux mêmes cadres, la même bataille (lockstep.js, sur un réseau factice qui retarde et mélange les arrivées entre cadres).
import { nouvelleBataille, ordonnerMarche, ordonnerBarrage, ordonnerStance, photo, restaurer, zone } from '../js/bataille.js';
import { creerLockstep, empreinteEtat } from '../js/reseau/lockstep.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('jeu à deux');

// Un ordre : ce que fait chaque machine, la même fonction (main.js la fournit au jeu)
function executer(c, camp, B, etat) {
  if (c.t === 'marche') ordonnerMarche(B, c.ids, c.x, c.y, c.forme, camp);
  else if (c.t === 'barrage') ordonnerBarrage(B, c.cal, c.x, c.y, camp);
  else if (c.t === 'stance') ordonnerStance(B, c.ids, c.stance, camp);
  else if (c.t === 'pause') etat.pause = c.v ?? !etat.pause;
}
function deuxMachines({ latence = 0, graine = 7 } = {}) {
  const faire = () => nouvelleBataille(graine, R, { soldats: 200, jours: 3, deux: true });
  const Bs = [faire(), faire()], files = [[], []], ls = [];
  // le réseau factice : un message part au cadre `t` et arrive `latence` tours plus tard
  let tour = 0;
  const ecarts = [];
  for (const moi of [0, 1]) ls.push(creerLockstep({ B: Bs[moi], moi, delai: 6, periode: 30, executer,
    envoyer: msg => files[1 - moi].push({ arrive: tour + latence, msg }), surEcart: (f, a, b) => ecarts.push([f, a, b]) }));
  const pomper = () => { tour++; for (const moi of [0, 1]) { const f = files[moi]; while (f.length && f[0].arrive <= tour) ls[moi].recevoir(f.shift().msg); } };
  return { Bs, ls, ecarts, pomper };
}
test('les deux machines calculent la même bataille, avec des ordres des deux joueurs et du retard sur le réseau', () => {
  for (const latence of [0, 3, 11]) {
    const { Bs, ls, ecarts, pomper } = deuxMachines({ latence });
    const Z = zone(Bs[0]);
    const nos = Bs[0].etat.regiments.filter(r => r.camp === 0).map(r => r.id), eux = Bs[0].etat.regiments.filter(r => r.camp === 1).map(r => r.id);
    let jouees = 0;
    for (let k = 0; k < 20000 && jouees < 900; k++) {
      pomper();
      // des ordres tirés ici, donnés des deux côtés à des cadres différents
      if (ls[0].cadre === 60 && !ls[0].fait1) { ls[0].fait1 = 1; ls[0].commander({ t: 'marche', ids: nos.slice(0, 2), x: Z.x0 + 150, y: Z.y0 + 150, forme: 'ligne' }); }
      if (ls[1].cadre === 75 && !ls[1].fait1) { ls[1].fait1 = 1; ls[1].commander({ t: 'barrage', cal: '155', x: Z.x0 + 150, y: Z.y0 + 200 }); ls[1].commander({ t: 'marche', ids: eux.slice(0, 2), x: Z.x0 + 250, y: Z.y0 + 120, forme: 'colonne' }); }
      if (ls[0].cadre === 90 && !ls[0].faitS) { ls[0].faitS = 1; ls[0].commander({ t: 'stance', ids: nos.slice(0, 3), stance: 'retenu' }); }
      if (ls[1].cadre === 100 && !ls[1].faitS) { ls[1].faitS = 1; ls[1].commander({ t: 'stance', ids: eux.slice(2, 4), stance: 'retenu' }); }
      if (ls[0].cadre === 200 && !ls[0].faitT) { ls[0].faitT = 1; ls[0].commander({ t: 'stance', ids: nos.slice(0, 1), stance: 'volonte' }); }
      if (ls[0].cadre === 300 && !ls[0].fait2) { ls[0].fait2 = 1; ls[0].commander({ t: 'barrage', cal: '75', x: Z.x0 + 250, y: Z.y0 + 120 }); }
      for (const l of ls) l.cadre_();
      jouees = Math.min(ls[0].cadre, ls[1].cadre);
    }
    assert.ok(jouees >= 900, `latence ${latence} : ${jouees} cadres`);
    // (les deux ont pu jouer un ou deux cadres de plus que l'autre : on compare au même cadre en rattrapant)
    while (ls[0].cadre < ls[1].cadre) { pomper(); ls[0].cadre_(); }
    while (ls[1].cadre < ls[0].cadre) { pomper(); ls[1].cadre_(); }
    assert.deepEqual(ecarts, [], 'aucune désynchronisation vue');
    assert.equal(empreinteEtat(Bs[0]), empreinteEtat(Bs[1]), `latence ${latence} : même état`);
    assert.equal(JSON.stringify(photo(Bs[0]).regiments), JSON.stringify(photo(Bs[1]).regiments));
    const st = Bs[0].etat.regiments.map(r => r.stance);
    assert.deepEqual([st[nos[0]], st[nos[1]], st[eux[2]]], ['volonte', 'retenu', 'retenu'], 'les postures ont été prises, chez les deux');
    assert.ok(Bs[0].etat.pertes[0] + Bs[0].etat.pertes[1] > 0 || Bs[0].etat.impacts.length > 0, 'il s\'est passé quelque chose');
  }
});
test('un ordre qui change une machine seulement est vu comme une désynchronisation', () => {
  const { Bs, ls, ecarts, pomper } = deuxMachines({ latence: 2 });
  const Z = zone(Bs[0]);
  for (let k = 0; k < 4000 && ls[0].cadre < 200; k++) {
    pomper();
    if (ls[0].cadre === 40 && !ls[0].fait) { ls[0].fait = 1; ordonnerBarrage(Bs[0], '220', Z.x0 + 100, Z.y0 + 220, 0); }     // (un ordre donné en douce, hors du lockstep)
    for (const l of ls) l.cadre_();
  }
  assert.ok(ecarts.length > 0, 'l\'écart est vu');
});
test('la posture est dans l\'empreinte : un changement fait chez une machine seulement est vu', () => {
  const a = nouvelleBataille(7, R, { soldats: 200, jours: 3, deux: true }), b = nouvelleBataille(7, R, { soldats: 200, jours: 3, deux: true });
  assert.equal(empreinteEtat(a), empreinteEtat(b));
  ordonnerStance(a, [0], 'retenu');
  assert.notEqual(empreinteEtat(a), empreinteEtat(b));
  ordonnerStance(a, [0], 'volonte');
  assert.equal(empreinteEtat(a), empreinteEtat(b));
  const { Bs, ls, ecarts, pomper } = deuxMachines({ latence: 2 });
  for (let k = 0; k < 4000 && ls[0].cadre < 200; k++) {
    pomper();
    if (ls[0].cadre === 40 && !ls[0].fait) { ls[0].fait = 1; ordonnerStance(Bs[0], [1], 'retenu', 0); }     // (en douce, hors du lockstep)
    for (const l of ls) l.cadre_();
  }
  assert.ok(ecarts.length > 0, 'l\'écart est vu');
});

group('jeu à deux — reprendre une partie (v0.60.0)');
test('un point de reprise écrit au même cadre chez les deux, relu chez les deux, donne la même partie qu\'avant la coupure', () => {
  const points = [[], []];
  const faire = () => nouvelleBataille(7, R, { soldats: 200, jours: 3, deux: true });
  const monter = (Bs, avec) => {
    const files = [[], []], ls = [0, 1].map(moi => creerLockstep({ B: Bs[moi], moi, delai: 6, periode: 30, sauve: 4, executer, envoyer: msg => files[1 - moi].push(msg), surEcart: () => assert.fail('écart'), surPoint: avec ? h => points[moi].push({ id: h, photo: photo(Bs[moi]) }) : () => {} }));
    return { ls, pomper() { for (const moi of [0, 1]) while (files[moi].length) ls[moi].recevoir(files[moi].shift()); } };
  };
  let M = monter([faire(), faire()], true);
  for (let k = 0; k < 40000 && points[0].length < 2; k++) { M.pomper(); M.ls[0].cadre_(); M.ls[1].cadre_(); }
  assert.ok(points[0].length >= 2 && points[1].length >= 2, 'deux points chez chacun');
  assert.deepEqual(points[0].map(p => p.id), points[1].map(p => p.id), 'les mêmes noms chez les deux');
  // la coupure : chacun relit le dernier point, et les deux repartent d'un cadre 0
  const p = points[0][1], Bs = [restaurer(p.photo, R), restaurer(points[1][1].photo, R)];
  assert.equal(empreinteEtat(Bs[0]), p.id); assert.equal(empreinteEtat(Bs[1]), p.id);
  M = monter(Bs, false);
  for (let k = 0; k < 4000; k++) { M.pomper(); M.ls[0].cadre_(); M.ls[1].cadre_(); }
  assert.equal(empreinteEtat(Bs[0]), empreinteEtat(Bs[1]), 'toujours la même partie après la reprise');
  assert.ok(Bs[0].etat.ticks > p.photo.ticks, 'elle avance');
});

// ─── Le camp à deux (v0.94.0, lot 6) : chaque joueur bâtit le sien, par une commande du lockstep ───
test('à deux, chacun a son camp et les chantiers passent par le lockstep : les deux machines le même camp, la même empreinte', async () => {
  const { ordonnerChantier, niveauDe } = await import('../js/camp.js');
  const executerCamp = (c, camp, B, etat) => { if (c.t === 'bat') ordonnerChantier(B.etat, c.cle, c.choix ?? null, camp); else executer(c, camp, B, etat); };
  const faire = () => nouvelleBataille(7, R, { soldats: 200, jours: 3, deux: true, camp: true });
  const Bs = [faire(), faire()], files = [[], []], ls = [], ecarts = []; let tour = 0;
  for (const B of Bs) B.etat.camp.dotation = B.etat.campEux.dotation = 5;      // (la dotation part de 0 depuis la v0.98.0)
  for (const moi of [0, 1]) ls.push(creerLockstep({ B: Bs[moi], moi, delai: 6, periode: 30, executer: executerCamp, envoyer: msg => files[1 - moi].push({ arrive: tour + 2, msg }), surEcart: (f, a, b) => ecarts.push([f, a, b]) }));
  const pomper = () => { tour++; for (const moi of [0, 1]) { const f = files[moi]; while (f.length && f[0].arrive <= tour) ls[moi].recevoir(f.shift().msg); } };
  let jouees = 0;
  for (let k = 0; k < 20000 && jouees < 400; k++) {
    pomper();
    if (ls[0].cadre === 40 && !ls[0].fait) { ls[0].fait = 1; ls[0].commander({ t: 'bat', cle: 'chars', choix: 0 }); }
    if (ls[1].cadre === 55 && !ls[1].fait) { ls[1].fait = 1; ls[1].commander({ t: 'bat', cle: 'artillerie', choix: 1 }); ls[1].commander({ t: 'bat', cle: 'aerodrome', choix: 0 }); }
    if (ls[0].cadre === 70 && !ls[0].fait2) { ls[0].fait2 = 1; ls[0].commander({ t: 'bat', cle: 'chars', choix: 0 }); }      // refusé chez les deux : déjà en chantier
    for (const l of ls) if (l.cadre_()) jouees = l.cadre;
  }
  assert.equal(ecarts.length, 0, `écarts : ${JSON.stringify(ecarts)}`);
  for (const B of Bs) {
    assert.deepEqual(B.etat.camp.batiments.chars.chantier, { vers: 2, nuits: 1, choix: 0 }, 'le chantier de l\'hôte');
    assert.equal(B.etat.camp.dotation, 2, '3 points payés par l\'hôte');
    assert.deepEqual(B.etat.campEux.batiments.artillerie.chantier, { vers: 2, nuits: 1, choix: 1 }, 'le chantier de l\'invité, avec son choix');
    assert.equal(B.etat.campEux.dotation, 2, '3 points de l\'invité : l\'artillerie au niveau 2 (3) ; l\'aérodrome (3) est refusé, il n\'en reste que 2');
    assert.equal(niveauDe(B.etat, 'aerodrome', 1), 1);
  }
  assert.equal(empreinteEtat(Bs[0]), empreinteEtat(Bs[1]));
});
