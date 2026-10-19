// Le jeu à deux : deux machines, les mêmes ordres aux mêmes cadres, la même bataille (lockstep.js, sur un réseau factice qui retarde et mélange les arrivées entre cadres).
import { nouvelleBataille, ordonnerMarche, ordonnerBarrage, ordonnerStance, photo, zone } from '../js/bataille.js';
import { creerLockstep, empreinteEtat } from '../js/reseau/lockstep.js';
import { REGLAGES as R } from '../js/data/reglages.js';

group('jeu à deux');

// Un ordre : ce que fait chaque machine, la même fonction (main.js la fournit au jeu)
function executer(c, camp, B, etat) {
  if (c.t === 'marche') ordonnerMarche(B, c.ids, c.x, c.y, c.forme, camp);
  else if (c.t === 'barrage') ordonnerBarrage(B, c.cal, c.x, c.y, camp);
  else if (c.t === 'stance') ordonnerStance(B, c.ids, c.stance, camp);
  else if (c.t === 'pause') etat.pause = !etat.pause;
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
