// Le Labo (section 16) : il MONTRE et compare, il ne modifie rien.
// Chaque sujet utilise les mêmes modules que le jeu (terrain, apparence,
// rendu three.js) : ce qu'on voit ici est ce que le jeu dessinera. Ajouter un
// sujet ou une variante = ajouter une entrée dans GROUPES.
import { mountLabo } from './lib/labo-shell.js?v=0.8.1';
import { spriteCanvas, paletteToGPL, paletteToHex } from './lib/sprites.js?v=0.8.1';
import { PALETTE, ROLES } from './palette.js?v=0.8.1';
import { chargerContenu } from './design-store.js?v=0.8.1';
import { tuile, ETAT } from './tuiles.js?v=0.8.1';
import { creerTerrain, impact, hydroLignes } from './terrain.js?v=0.8.1';
import { CALIBRES } from './data/calibres.js?v=0.8.1';
import { METEO } from './data/meteo.js?v=0.8.1';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage } from './bataille.js?v=0.8.1';
import { creerRendu, ZOOMS } from './rendu3d.js?v=0.8.1';
import { hash2 } from './lib/rng.js?v=0.8.1';

document.documentElement.style.setProperty('--jeu-accent', ROLES.accent);
const NOM = document.title.replace(/^Labo — /, ''); // le nom vient de la page (une apostrophe ne casse rien)
const { reglages: R } = await chargerContenu();

const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};
const telecharger = (blob, nom) => {
  const a = el('a', { href: URL.createObjectURL(blob), download: nom });
  document.body.append(a); a.click(); a.remove();
};

// ─── La planche d'échelle : tout se mesure au soldat (section 7) ───
function planche(stage, ppm) {
  const W = 46 * ppm, H = 12 * ppm;
  const c = el('canvas', { width: W, height: H });
  c.style.cssText = `width:${W}px;max-width:100%;image-rendering:pixelated;background:${PALETTE.t}`;
  const g = c.getContext('2d');
  const sol = H - 7 * ppm;                           // la ligne du sol
  const rect = (x, y, w, h, k) => { g.fillStyle = PALETTE[k]; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  rect(0, sol, W, H - sol, 'b');
  let x = ppm;
  // un cube d'un mètre (l'unité du terrain)
  rect(x, sol - ppm, ppm, ppm, 'g'); x += 2 * ppm;
  // les deux camps : 0,5 × 1,7 m, et leur ombre
  for (const k of ['n', 'x']) { rect(x, sol - 1.7 * ppm, 0.5 * ppm, 1.7 * ppm, k); rect(x + 0.5 * ppm, sol - 0.15 * ppm, 0.35 * ppm, 0.15 * ppm, 't'); x += 1.5 * ppm; }
  x += ppm;
  // un arbre de 7 m
  rect(x, sol - 7 * ppm, 0.55 * ppm, 7 * ppm, 's');
  for (let k = 0; k < 4; k++) rect(x + (k % 2 ? 0.5 : -1.6) * ppm, sol - (3.2 + k * 0.9) * ppm, 1.7 * ppm, 0.22 * ppm, 's');
  x += 4 * ppm;
  // la coupe des cratères : un obus sur un sol plat (la dureté réduit la profondeur)
  for (const [cal, n] of [['75', 1], ['155', 1], ['220', 1], ['220', 4]]) {
    const T = creerTerrain(1, { largeur: 15, hauteur: 15, arbres: 0 }, R);
    T.base.fill(20); T.nappe.fill(-20);
    for (let k = 0; k < n; k++) impact(T, 7.5, 7.5, cal, R, k);
    for (let i = 0; i < 15; i++) {
      const d = T.diff[7 * 15 + i] * 0.25;
      if (d < 0) rect(x + i * ppm, sol, ppm, -d * ppm, 't');
      else if (d > 0) rect(x + i * ppm, sol - d * ppm, ppm, d * ppm, 'g');
    }
    x += 12 * ppm;
    if (x > W - 12 * ppm) break;
  }
  // la nappe (vers −2 à −3 m) et le plancher dur (−6 m)
  rect(0, sol + 2.5 * ppm, W, 1, 'e');
  rect(0, sol + 6 * ppm, W, 1, 'r');
  stage.append(c, el('p', { textContent: `${ppm} pixels par mètre. De gauche à droite : un cube d'un mètre (l'unité du terrain), un soldat de chaque camp (1,70 m) et son ombre, un arbre, la coupe d'un obus de 75, de 155, de 220, et de quatre 220 au même endroit. Le trait clair à −2,5 m : la nappe ; à −6 m : le plancher dur.` }));
}

// ─── Les sols et les cratères, en tuiles (les mêmes que l'outil de lisibilité) ───
function tuiles(stage, gris = false) {
  const p = el('div', { className: 'planche' });
  const cas = [
    ['sec', tuile(R, ETAT.SEC)], ['humide', tuile(R, ETAT.HUMIDE)], ['boue', tuile(R, ETAT.BOUE)], ['eau', tuile(R, ETAT.EAU)],
    ['cratère de 155, sec', tuile(R, ETAT.SEC, { cratere: '155' })], ['cratère de 155, boue', tuile(R, ETAT.BOUE, { cratere: '155' })],
    ['nous, sur sol sec', tuile(R, ETAT.SEC, { soldat: 'n' })], ['en face, dans la boue', tuile(R, ETAT.BOUE, { soldat: 'x' })],
  ];
  const pal = gris ? Object.fromEntries(Object.entries(PALETTE).map(([k, hex]) => { const v = Math.round(lum(hex) ** (1 / 2.2) * 255).toString(16).padStart(2, '0'); return [k, `#${v}${v}${v}`]; })) : PALETTE;
  for (const [nom, rows] of cas) p.append(el('figure', {}, spriteCanvas(rows, pal, { scale: 8 }), el('figcaption', { textContent: nom })));
  stage.append(p, el('p', { textContent: gris ? 'En niveaux de gris : la forme porte l\'information, la couleur la confirme (section 5).' : 'Une case = un mètre. Le creux d\'un cratère est plus sombre, la terre jetée autour plus claire ; l\'eau a des rides.' }));
}

// ─── Le moteur, en direct : le rendu du jeu sur une petite bataille ───
function moteur(stage, { zoom = 3, pluie = false, gel = false, soldats = 600, cz = 185, camera = null, respiration = undefined, soldat = undefined, effets = undefined, barrages = false, surLesArbres = false } = {}) {
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(70vh,560px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  // le relevé : ce que coûte cette variante (le dessin attendu jusqu'au bout), et des zooms à essayer
  const releve = el('p', { className: 'releve', textContent: '…' });
  const zooms = el('p', {}, ...ZOOMS.map((z, i) => el('button', { className: 'essai', textContent: `Zoom ${z}`, onclick: () => { if (rendu) rendu.vue.zoom = i; } })));
  boite.append(canvas); stage.append(boite, releve, zooms);
  let raf = 0, rendu = null, fini = false;
  (async () => {
    const B = nouvelleBataille(5, R, { soldats });
    if (pluie || gel) {
      // une journée de pluie sur un champ labouré, calculée d'un coup
      const T = B.terrain;
      for (let k = 0; k < 90; k++) impact(T, B.etat.marges.x + 120 + hash2(k, 1, 9) * 160, B.etat.marges.y + 110 + hash2(k, 2, 9) * 90, ['75', '155', '220'][k % 3], R, k);
      for (let h = 0; h < 24; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
      if (gel) B.etat.meteo[0] = 'gel'; else B.etat.meteo[0] = 'pluie';
    }
    ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).slice(2, 6).map(r => r.id), B.etat.marges.x + 200, B.etat.marges.y + 175);
    rendu = await creerRendu(canvas, { mesure: true, camera, respiration, soldat, effets });
    if (fini) { rendu.detruire(); return; }
    rendu.redimensionner();
    rendu.attacher(B);
    rendu.vue.zoom = zoom; rendu.vue.cx = B.etat.marges.x + 200; rendu.vue.cz = B.etat.marges.y + cz;   // (coordonnées du secteur, plus les marges)
    let tReleve = 0, tBarrage = 0.3, kBarrage = 0;
    let t = performance.now();
    const boucle = now => {
      const dt = Math.min(0.1, (now - t) / 1000); t = now;
      // des obus réguliers au milieu de la vue, pour voir les effets
      if (barrages && (tBarrage -= dt) < 0) {
        tBarrage = 3.5;
        const cal = ['155', '75', '220'][kBarrage++ % 3];
        // (pour le feu : sur un arbre encore debout, près du centre)
        const arbre = surLesArbres && B.terrain.arbres.filter(a => !a.abattu && Math.abs(a.i - rendu.vue.cx) < 60 && Math.abs(a.j - rendu.vue.cz) < 40)[0];
        if (arbre) ordonnerBarrage(B, '75', arbre.i + 0.5, arbre.j + 0.5, 1);
        else ordonnerBarrage(B, cal, rendu.vue.cx + hash2(kBarrage, 3, 9) * 60 - 30, rendu.vue.cz - 10 + hash2(kBarrage, 4, 9) * 20, 1);
      }
      const ev = avancer(B);
      rendu.dessiner(dt, ev);
      if ((tReleve -= dt) < 0) {
        tReleve = 0.5;
        const st = rendu.stats;
        releve.textContent = `Dessin : ${st.ms.renduFini} ms (rendu logiciel ici, attendu jusqu'au bout) · ${st.trianglesDessines} triangles · ${st.soldatsVus} soldats dessinés`;
      }
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
  })();
  return () => { fini = true; cancelAnimationFrame(raf); rendu?.detruire(); };
}

const GROUPES = [
  { id: 'dessin', title: 'Dessin', topics: [
    { id: 'echelle', title: 'Échelle', variants: [
      { title: '8 pixels par mètre', note: 'Le zoom le plus proche du jeu : le soldat, l\'arbre, la coupe des cratères.', status: 'actuelle', render: s => planche(s, 8) },
      { title: '4 pixels par mètre', note: 'Le zoom 4 du jeu.', render: s => planche(s, 4) },
    ] },
    { id: 'sols', title: 'Sols et cratères', variants: [
      { title: 'En couleurs', note: 'Les tuiles que mesure l\'outil de lisibilité, peintes par les fonctions du jeu.', status: 'actuelle', render: s => tuiles(s) },
      { title: 'En niveaux de gris', note: 'La même chose sans la couleur.', render: s => tuiles(s, true) },
    ] },
    { id: 'palette', title: 'Palette', variants: [
      { title: 'Nuancier', note: '« Boue et ciel bas » : dix tons, et rien d\'autre.', status: 'actuelle', render: s => {
        s.append(el('div', { className: 'nuancier' }, ...Object.entries(PALETTE).map(([k, hex]) => {
          const d = el('div', { textContent: `${k} ${hex}` });
          d.style.background = hex;
          d.style.color = lum(hex) > 0.18 ? PALETTE.t : PALETTE.o;
          return d;
        })));
        s.append(el('p', {}, el('button', { className: 'essai', textContent: 'Palette .gpl', onclick: () => telecharger(new Blob([paletteToGPL(PALETTE, NOM)]), 'cyclopeen.gpl') }),
          el('button', { className: 'essai', textContent: 'Palette .hex', onclick: () => telecharger(new Blob([paletteToHex(PALETTE)]), 'cyclopeen.hex') })));
      } },
      { title: 'Contrastes', note: 'Rapport WCAG de chaque paire (4,5 pour du texte, 3 pour un signe).', render: s => {
        const ks = Object.keys(PALETTE);
        const t = el('table', { className: 'contraste' });
        t.append(el('tr', {}, el('th'), ...ks.map(k => el('th', { textContent: k }))));
        for (const a of ks) t.append(el('tr', {}, el('th', { textContent: a }), ...ks.map(b => el('td', { textContent: a === b ? '—' : contraste(PALETTE[a], PALETTE[b]).toFixed(1) }))));
        s.append(t);
      } },
    ] },
  ] },
  { id: 'moteur', title: 'Moteur', topics: [
    { id: 'champ', title: 'Champ de bataille', variants: [
      { title: 'Zoom 4', note: 'Le rendu du jeu : quatre de nos régiments avancent, chaque soldat est une boîte et son ombre.', status: 'actuelle', render: s => moteur(s, { zoom: 3 }) },
      { title: 'Zoom 1', note: 'Tout le champ : chaque soldat n\'est plus qu\'un point (sa couleur sur son ombre), le sol est à plat.', render: s => moteur(s, { zoom: 0 }) },
      { title: 'Après un jour de pluie', note: 'Quatre-vingt-dix obus et vingt-quatre heures de pluie : la boue dans les creux, l\'eau dans les trous.', render: s => moteur(s, { zoom: 3, pluie: true }) },
      { title: 'Le gel', note: 'Le même champ, gelé : l\'eau devient de la glace, la boue porte.', render: s => moteur(s, { zoom: 3, gel: true }) },
    ] },
    { id: 'camera', title: 'Caméra', variants: [
      { title: 'Perspective et respiration', note: 'La caméra du jeu : un angle de 30°, plongée de 54°, tournée de 9° (les régiments lointains paraissent plus petits), et elle se balance d\'elle-même, très lentement (2° en 23 s) : le champ vit même quand rien ne bouge.', status: 'actuelle', render: s => moteur(s, { zoom: 3, pluie: true }) },
      { title: 'Immobile', note: 'La même perspective, sans la respiration (v0.3.0).', status: 'ancienne', render: s => moteur(s, { zoom: 3, pluie: true, respiration: 0 }) },
      { title: 'Sans perspective', note: 'Presque la caméra de la v0.2 : un angle de 4°, tout a la même taille de près comme de loin.', status: 'ancienne', render: s => moteur(s, { zoom: 3, pluie: true, camera: { fov: 4 }, respiration: 0 }) },
      { title: 'Plus de perspective', note: 'Un angle de 50° et une plongée de 45° : le lointain rapetisse vite, l\'horizon se rapproche.', render: s => moteur(s, { zoom: 3, pluie: true, camera: { fov: 50, tangage: 0.8 } }) },
      { title: 'Respiration marquée', note: 'Le balancement deux fois plus ample (4°).', render: s => moteur(s, { zoom: 3, pluie: true, respiration: 0.07 }) },
    ] },
    { id: 'soldats', title: 'Soldats de près', variants: [
      { title: 'Silhouette complète', status: 'actuelle', note: 'Jambes, vareuse, visage, casque, le fusil à l\'épaule et le sac au dos (la glaise). Environ 55 triangles par homme de près.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'silhouette' }) },
      { title: 'Une boîte', note: 'Le soldat de la v0.7 : une boîte de la couleur de son camp, son dessus en guise de casque, et son ombre. Environ 10 triangles par homme.', status: 'ancienne', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'boite' }) },
      { title: 'Jambes, tête et casque', note: 'Les bandes molletières sombres (deux jambes), la vareuse, le visage clair, le casque plus large que la tête. Environ 40 triangles, seulement de près (6 pixels par mètre et plus) ; de loin, la boîte, puis le point.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'detail' }) },
      { title: 'La boîte et un fusil', note: 'La boîte de la v0.7, un fusil à l\'épaule (un trait de terre) : la silhouette du fantassin pour 8 triangles de plus.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'fusil' }) },
      { title: 'Silhouette qui marche', note: 'La silhouette complète, et les jambes qui se balancent quand il marche (calculé dans le shader, selon sa vitesse : rien de plus pour le processeur).', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'marche' }) },
    ] },
    { id: 'effets', title: 'Effets', variants: [
      { title: 'Tout ensemble', status: 'actuelle', note: 'Gerbe, onde, obus qui tombe, fumée qui reste, feu, fusées et corbeaux.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { gerbe: true, onde: true, chute: true, derive: true, feu: true, fusees: 'toujours', corbeaux: 'toujours' } }) },
      { title: 'Les effets de la v0.7', note: 'L\'éclair, la terre jetée, une fumée tramée qui monte et se dissipe en quelques secondes.', status: 'ancienne', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: {} }) },
      { title: 'Gerbe de terre et onde', note: 'Une colonne de terre et de mottes, haute et serrée, qui retombe ; un anneau de poussière qui court au ras du sol.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { gerbe: true, onde: true } }) },
      { title: 'L\'obus qui tombe', note: 'Un quart de seconde avant l\'explosion, une traînée claire descend du ciel jusqu\'au point de chute (avec la gerbe).', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { chute: true, gerbe: true } }) },
      { title: 'La fumée qui reste', note: 'Plus de fumée, qui dure huit à seize secondes et dérive avec le vent vers l\'est : après un barrage, le champ reste voilé un moment.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { derive: true } }) },
      { title: 'Le feu', note: 'Un arbre abattu ou un buisson arraché brûle un moment : des flammes (l\'os et l\'herbe morte) et une fumée qui dérive.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { feu: true, derive: true }, surLesArbres: true }) },
      { title: 'Fusées éclairantes', note: 'Le soir (après 16 h ; ici, toujours) : une fusée monte, s\'ouvre et descend lentement sous son parachute, une fumée derrière elle.', render: s => moteur(s, { zoom: 3, cz: 170, effets: { fusees: 'toujours' } }) },
      { title: 'Les corbeaux', note: 'Quelques points noirs qui tournent lentement au-dessus des morts (ici, au-dessus du champ).', render: s => moteur(s, { zoom: 4, cz: 170, effets: { corbeaux: 'toujours' } }) },
    ] },
    { id: 'calibres', title: 'Calibres', variants: Object.entries(CALIBRES).map(([cal, C], k) => ({
      title: cal, note: `Motif ${C.motif.length} × ${C.motif.length}, ${C.salve} obus par barrage, rayon mortel ${C.rayon} m, recharge ${C.recharge} s.`,
      status: k === 0 ? 'actuelle' : undefined,
      render: s => {
        const T = creerTerrain(1, { largeur: 15, hauteur: 15, arbres: 0 }, R);
        T.base.fill(20); T.nappe.fill(-20);
        impact(T, 7.5, 7.5, cal, R);
        const rows = [];
        for (let j = 0; j < 15; j++) { let r = ''; for (let i = 0; i < 15; i++) { const d = T.diff[j * 15 + i]; r += d > 0 ? 'g' : d === 0 ? 'h' : d >= -2 ? 'b' : d >= -4 ? 's' : 't'; } rows.push(r); }
        s.append(spriteCanvas(rows, PALETTE, { scale: 16 }), el('p', { textContent: 'Vu de dessus, un obus sur un sol plat : plus c\'est sombre, plus c\'est profond ; la lèvre est claire.' }));
      },
    })) },
  ] },
];

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

mountLabo(document.getElementById('labo'), { game: NOM, home: './', atelier: 'atelier.html', groups: GROUPES });
