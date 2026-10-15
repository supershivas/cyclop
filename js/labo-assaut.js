// Le sujet « Attaque d'une tranchée » du labo : une maquette jouée en boucle.
// Elle MONTRE comment l'interface pourrait dire ce que la règle de `prises()`
// (bataille.js) fait en silence : un tronçon de 25 m change de main quand il n'y
// reste plus un défenseur et que l'attaquant y a au moins `prise` hommes. Les nombres
// (prise, rapport) viennent de reglages.js ; la scène, elle, est écrite à la main
// (un assaut réel mettrait des minutes à venir).
import { PALETTE } from './palette.js?v=0.9.1';
import { hash2 } from './lib/rng.js?v=0.9.1';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

const NB = 6;                    // tronçons montrés (de 25 m)
const CIBLE = 2;                 // celui qu'on attaque
const L = 360, H = 210, K = 2;   // la scène : 360 × 210 pixels, agrandie ×2
const TW = L / NB;               // un tronçon : 60 pixels = 25 m
const YT = 95;                   // la tranchée
const T_CYCLE = 46;

// ce que la maquette raconte, à chaque seconde du cycle
const PHASES = [
  { t: 0, id: 'calme', nom: 'Calme' },
  { t: 6, id: 'prepa', nom: 'Préparation' },
  { t: 14, id: 'sortie', nom: 'Sortie' },
  { t: 22, id: 'contact', nom: 'Contact' },
  { t: 28.5, id: 'bascule', nom: 'Tronçon perdu' },
];
const JOURNAL = [
  { t: 6, texte: 'En face prépare : barrage de 220 sur le tronçon 3 de la 1re ligne.' },
  { t: 14, texte: 'Le 5e d\'en face sort de ses tranchées : 22 hommes contre 7 défenseurs (rapport 3,1 ; seuil 1,6).' },
  { t: 22, texte: 'Au contact, tronçon 3.' },
  { t: 26, texte: 'Plus qu\'un défenseur au tronçon 3 : s\'il tombe, le tronçon bascule.' },
  { t: 28.5, texte: 'Tronçon 3 perdu. Le 2e régiment perd du moral ; ceux d\'en face s\'aguerrissent.' },
  { t: 36, texte: 'Le 5e tient le tronçon 3 (14 hommes).' },
];

/* L'état de la scène à l'instant t du cycle (une fonction pure de t). */
function scene(t) {
  const def = t < 6 ? 12 : t < 14 ? Math.round(12 - 5 * (t - 6) / 8) : t < 28.5 ? Math.max(0, Math.floor(7 * (1 - (t - 14) / 14))) : 0;
  const att = t < 22 ? 0 : Math.min(16, Math.floor((t - 22) * 4));
  const bascule = t >= 28.5;
  const sortis = t >= 14 ? 22 - (t >= 22 ? Math.min(6, Math.floor(t - 22)) : 0) : 0;   // ceux qui ont quitté leur tranchée (et ceux qui sont tombés)
  const phase = [...PHASES].reverse().find(p => t >= p.t);
  return { def, att, bascule, sortis, phase, disputé: t >= 14 && !bascule, pris: bascule };
}

function dessinerScene(g, t, S) {
  const rect = (x, y, w, h, c) => { g.fillStyle = PALETTE[c]; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  g.clearRect(0, 0, L, H);
  rect(0, 0, L, H, 'b');
  rect(0, 52, L, 30, 's');                              // le no man's land, labouré
  for (let i = 0; i < 60; i++) rect(hash2(i, 1, 4) * L, 10 + hash2(i, 2, 4) * 76, 3, 2, i % 3 ? 't' : 'g');   // cratères
  rect(0, YT - 3, L, 8, 't');                            // la tranchée
  rect(0, YT - 5, L, 2, 'g');                            // le parapet, du côté de l'ennemi
  // les tronçons : la forme dit qui tient (plein : tenu ; tireté : disputé ; double trait : pris par en face)
  for (let i = 0; i < NB; i++) {
    const x0 = i * TW + 2, x1 = (i + 1) * TW - 2;
    const cible = i === CIBLE, pris = cible && S.pris, dispute = cible && S.disputé;
    const c = pris ? 'x' : 'n';
    for (let x = x0; x < x1; x++) {
      if (dispute && (x >> 2) & 1) continue;
      rect(x, YT + 6, 1, 1, c);
      if (pris) rect(x, YT + 8, 1, 1, c);
    }
    rect(x0, YT + 4, 1, 5, c); rect(x1 - 1, YT + 4, 1, 5, c);
  }
  // nos défenseurs, dans la tranchée (les tronçons voisins : pleins)
  for (let i = 0; i < NB; i++) {
    const n = i === CIBLE ? S.def : 12;
    for (let k = 0; k < n; k++) rect(i * TW + 4 + k * 4.5, YT - 1, 2, 5, 'n');
    if (i === CIBLE) for (let k = n; k < 12; k++) rect(i * TW + 4 + k * 4.5, YT + 2, 3, 1, 't');     // un corps couché
  }
  // les barrages de 220 sur le tronçon visé
  if (t >= 6 && t < 14) {
    const k = Math.floor(t * 2);
    const ex = CIBLE * TW + 6 + hash2(k, 5, 4) * 48, ey = YT - 6 + hash2(k, 6, 4) * 10, f = (t * 2) % 1;
    if (f < 0.45) { rect(ex - 5, ey - 4, 10, 8, 'o'); rect(ex - 3, ey - 8, 6, 14, 'r'); }
    else rect(ex - 2, ey - 3 - 8 * f, 4, 4, 'r');
  }
  // les assaillants : de 14 s à 22 s ils traversent, ensuite ils sont dans la tranchée
  if (t >= 14) {
    for (let k = 0; k < S.sortis; k++) {
      const x = CIBLE * TW + 2 + (k % 11) * 5 + (k >> 4) * 2;
      const prog = Math.min(1, (t - 14 - (k % 6) * 0.4) / 8);
      const y = 30 + prog * (YT - 30) - (k >> 3) * 3;
      if (S.pris || prog >= 1) rect(x, YT, 2, 5, 'x'); else rect(x, y, 2, 5, 'x');
    }
  }
}

/* Les variantes : les mêmes données, de plus en plus dites. */
const FORMES = {
  actuelle: {},
  jauges: { jauges: true },
  phases: { jauges: true, phases: true },
  carte: { jauges: true, phases: true, carte: true },
};

export function maquetteAssaut(stage, variante) {
  const o = FORMES[variante];
  const boite = el('div'); boite.style.cssText = `position:relative;width:${L * K}px;max-width:100%;height:${H * K}px;background:${PALETTE.t};overflow:hidden;font:13px ui-monospace,monospace;color:${PALETTE.o}`;
  const canvas = el('canvas', { width: L, height: H }); canvas.style.cssText = `width:100%;height:100%;image-rendering:pixelated;display:block`;
  const calque = el('div'); calque.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  boite.append(canvas, calque);
  const plaque = (css, ...kids) => el('div', { style: `position:absolute;padding:4px 8px;background:${PALETTE.t};border:1px solid ${PALETTE.s};line-height:1.35;${css}` }, ...kids);
  const g = canvas.getContext('2d');

  const pips = (n, att) => {
    const row = el('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;max-width:106px';
    for (let k = 0; k < n; k++) {
      const p = el('i'); p.style.cssText = att
        ? `width:8px;height:8px;background:${PALETTE.x};clip-path:polygon(50% 0,100% 100%,0 100%)`
        : `width:7px;height:7px;background:${PALETTE.n}`;
      row.append(p);
    }
    return row;
  };

  const vue = { raf: 0, t0: performance.now() };
  let dernierT = -1, annonce = null;
  const maj = now => {
    const t = Math.max(0, (now - vue.t0) / 1000) % T_CYCLE, S = scene(t);
    dessinerScene(g, t, S);
    calque.replaceChildren();

    if (!o.jauges) {
      // l'interface d'aujourd'hui : un compteur, et une ligne qui passe (« Un tronçon perdu. »)
      calque.append(plaque('left:8px;top:8px', `Tronçons : ${S.pris ? 11 : 12} · ${S.pris ? 12 : 11}`));
      if (t >= 28.5 && t < 32) calque.append(plaque('left:50%;bottom:10px;transform:translateX(-50%)', 'Un tronçon perdu.'));
      if (t < 28.5 && t >= 6) calque.append(plaque(`left:8px;top:${K * 20}px;color:${PALETTE.r}`, '(rien d\'autre à l\'écran : ni la préparation, ni la sortie, ni les défenseurs qui tombent)'));
    } else {
      // une jauge sous chaque tronçon : les défenseurs (carrés), les attaquants dans la case (triangles), le seuil de prise
      for (let i = 0; i < NB; i++) {
        const cible = i === CIBLE, d = cible ? S.def : 12, a = cible ? S.att : 0;
        const etat = cible && S.pris ? 'perdu' : cible && S.disputé ? 'disputé' : 'tenu';
        const bloc = plaque(`left:${i * TW * K + 4}px;top:${(YT + 14) * K}px;width:${TW * K - 8}px;padding:3px 4px;font-size:11px`,
          el('div', { textContent: `${i + 1} · ${etat}`, style: `color:${etat === 'tenu' ? PALETTE.r : PALETTE.o}` }));
        bloc.append(pips(Math.min(d, 12), false));
        if (a) bloc.append(pips(Math.min(a, 12), true));
        if (cible && S.disputé) {
          const reste = el('div', { style: 'margin-top:2px;color:' + PALETTE.r }, d === 0 ? (a >= 3 ? 'plus un défenseur : il bascule' : `plus un défenseur, ${a}/3 pour prendre`) : `${d} contre ${a} · prise à 3`);
          bloc.append(reste);
        }
        calque.append(bloc);
      }
    }

    if (o.phases) {
      // les quatre temps de l'assaut, en haut : on voit où on en est
      const ligne = el('div'); ligne.style.cssText = 'display:flex;gap:10px;align-items:center';
      PHASES.slice(1).forEach((p, k) => {
        const actif = S.phase.id === p.id, passe = t >= p.t;
        ligne.append(el('span', { textContent: `${k + 1} ${p.nom}`, style: `padding:1px 6px;${actif ? `background:${PALETTE.o};color:${PALETTE.t}` : passe ? `border-bottom:2px solid ${PALETTE.o}` : `color:${PALETTE.r};border-bottom:2px dotted ${PALETTE.r}`}` }));
      });
      calque.append(plaque('left:8px;top:8px;right:8px;display:flex;justify-content:center', ligne));
      // le journal : les lignes qu'on peut relire en pause active
      const lignes = JOURNAL.filter(j => t >= j.t).slice(-3);
      if (lignes.length) calque.append(plaque(`left:8px;bottom:8px;width:460px;font-size:12px`, ...lignes.map((j, k) => el('div', { textContent: j.texte, style: k === lignes.length - 1 ? '' : `color:${PALETTE.r}` }))));
    }

    if (o.carte) {
      // la carte de situation : quatre lignes, six tronçons montrés par ligne, qui tient quoi
      const carte = el('div'); carte.style.cssText = 'display:grid;grid-template-columns:repeat(6,12px);gap:2px';
      const ligneDe = (camp, rang) => {
        for (let i = 0; i < NB; i++) {
          const tronc = el('i');
          const cible = camp === 0 && rang === 0 && i === CIBLE;
          const tenu = cible && S.pris ? 1 : camp;
          tronc.style.cssText = `height:9px;background:${tenu === 0 ? PALETTE.n : PALETTE.x};${cible && S.disputé ? `outline:2px dashed ${PALETTE.o};outline-offset:1px` : ''}`;
          if (tenu !== camp) tronc.style.clipPath = 'polygon(0 0,100% 0,100% 55%,0 55%)';
          carte.append(tronc);
        }
      };
      for (const [camp, rang] of [[1, 3], [1, 2], [1, 1], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3]]) ligneDe(camp, rang);
      calque.append(plaque('right:8px;top:44px;padding:6px', el('div', { textContent: 'Les lignes', style: `color:${PALETTE.r};font-size:11px;margin-bottom:3px` }), carte,
        el('div', { textContent: S.pris ? 'nous 11 · en face 12' : 'nous 12 · en face 11', style: 'font-size:11px;margin-top:3px' })));
    }

    vue.raf = requestAnimationFrame(maj);
  };
  vue.raf = requestAnimationFrame(maj);

  const aide = el('p', { textContent: 'La maquette tourne en boucle (46 s) : le calme, la préparation d\'en face au 220, la sortie de 22 hommes, le contact, la bascule du tronçon 3. Les carrés sont nos défenseurs, les triangles les assaillants dans la case ; le trait dit qui tient (plein : nous ; tireté : disputé ; double : pris par en face).' });
  const rejouer = el('button', { className: 'essai', textContent: 'Rejouer', onclick: () => { vue.t0 = performance.now(); } });
  stage.append(boite, el('p', {}, rejouer), aide);
  return () => cancelAnimationFrame(vue.raf);
}
