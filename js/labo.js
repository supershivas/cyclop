// Le Labo (section 16) : il MONTRE et compare, il ne modifie rien.
// Chaque sujet utilise les mêmes modules que le jeu (terrain, apparence,
// rendu three.js) : ce qu'on voit ici est ce que le jeu dessinera. Ajouter un
// sujet ou une variante = ajouter une entrée dans GROUPES.
import { mountLabo } from './lib/labo-shell.js?v=0.32.0';
import { spriteCanvas, paletteToGPL, paletteToHex } from './lib/sprites.js?v=0.32.0';
import { PALETTE, ROLES } from './palette.js?v=0.32.0';
import { chargerContenu } from './design-store.js?v=0.32.0';
import { tuile, ETAT } from './tuiles.js?v=0.32.0';
import { creerTerrain, impact, hydroLignes } from './terrain.js?v=0.32.0';
import { CALIBRES } from './data/calibres.js?v=0.32.0';
import { METEO } from './data/meteo.js?v=0.32.0';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, mourir } from './bataille.js?v=0.32.0';
import { creerRendu, ZOOMS } from './rendu3d.js?v=0.32.0';
import { hash2 } from './lib/rng.js?v=0.32.0';
import { reglerVerdure } from './apparence.js?v=0.32.0';
import { maquetteAssaut } from './labo-assaut.js?v=0.32.0';
import { calquePlaques } from './labo-plaques.js?v=0.32.0';
import { calqueBarre } from './labo-barre-temps.js?v=0.32.0';
import { maquetteProjections, maquetteVisee } from './labo-projections.js?v=0.32.0';
import { JOURNAL } from './labo-journal.js?v=0.32.0';
import { loadVersion } from './lib/app-update.js?v=0.32.0';

document.documentElement.style.setProperty('--jeu-accent', ROLES.accent);
const NOM = document.title.replace(/^Labo — /, ''); // le nom vient de la page (une apostrophe ne casse rien)
const { reglages: R } = await chargerContenu();
const VERSION = (await loadVersion()) || '';

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
function moteur(stage, { zoom = 3, pluie = false, gel = false, soldats = 600, cz = 185, camera = null, respiration = undefined, soldat = undefined, cadavre = undefined, morts = 0, effets = undefined, barrages = false, surLesArbres = false, vue = null, verdure = undefined, nuit = null, tombee = false, calque = null } = {}) {
  reglerVerdure(verdure);                                   // le sol vert (apparence.js) : avant que le sol ne se peigne
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(70vh,560px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  // le relevé : ce que coûte cette variante (le dessin attendu jusqu'au bout), et des zooms à essayer
  const releve = el('p', { className: 'releve', textContent: '…' });
  const zooms = el('p', {}, ...ZOOMS.map((z, i) => el('button', { className: 'essai', textContent: `Zoom ${z}`, onclick: () => { if (rendu) rendu.vue.zoom = i; } })));
  boite.append(canvas); calque?.(boite); stage.append(boite, releve, zooms);
  let raf = 0, rendu = null, fini = false;
  (async () => {
    const B = nouvelleBataille(5, R, { soldats });
    if (tombee) B.etat.phase = 'nuit';                       // la nuit : l'obscurité du jeu, ses lanternes
    if (pluie || gel) {
      // une journée de pluie sur un champ labouré, calculée d'un coup
      const T = B.terrain;
      for (let k = 0; k < 90; k++) impact(T, B.etat.marges.x + 120 + hash2(k, 1, 9) * 160, B.etat.marges.y + 110 + hash2(k, 2, 9) * 90, ['75', '155', '220'][k % 3], R, k);
      for (let h = 0; h < 24; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
      if (gel) B.etat.meteo[0] = 'gel'; else B.etat.meteo[0] = 'pluie';
    }
    if (morts) {
      // des morts de la veille (la glaise) et du jour (la couleur de leur camp), tombés en rangs là où l'on regarde
      const A = B.armee;
      for (let i = 0; i < A.n; i++) if (hash2(i, 5, 9) < morts && Math.abs(A.x[i] - B.etat.marges.x - 200) < 70 && Math.abs(A.y[i] - B.etat.marges.y - cz) < 45) mourir(B, i, 'tir');
      B.etat.corps.forEach((c, k) => { if (k % 2) c[3] = B.etat.jour - 1; });
    }
    ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).slice(2, 6).map(r => r.id), B.etat.marges.x + 200, B.etat.marges.y + 175);
    rendu = await creerRendu(canvas, { mesure: true, camera, respiration, soldat, cadavre, effets });
    if (fini) { rendu.detruire(); return; }
    if (nuit) rendu.styleNuit = nuit;
    rendu.redimensionner();
    rendu.attacher(B);
    if (vue) rendu.placerCamera(vue.yaw, vue.tangage);       // la caméra libre du jeu
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
  return () => { fini = true; cancelAnimationFrame(raf); rendu?.detruire(); reglerVerdure(0); };
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
      { title: 'Nuancier', note: `« Boue et ciel bas » : ${Object.keys(PALETTE).length} tons, et rien d\'autre (le vert kaki clair d\'en face depuis la v0.28.0).`, status: 'actuelle', render: s => {
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
  { id: 'interface', title: 'Interface', topics: [
    { id: 'plaques', title: 'Plaques et journal', variants: [
      { title: 'Les papiers d\'aujourd\'hui', status: 'actuelle', depuis: '0.31.1', note: 'L\'écran de la v0.31 : les boutons du temps et le billet en haut à gauche (sans montre dessinée), les pertes de chaque camp sur une ligne au centre, la carte repliable en haut à droite, une carte par régiment en bas (chevrons d\'expérience, barre debout / blessés / tombés) dont la choisie s\'ouvre vers le haut, les batteries à jauge de recharge, le carnet de bord au-dessus des cartes. Une maquette peinte à la main, sur le champ en direct.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calquePlaques('aujourdhui') }) },
      { title: 'Toutes la même plaque', status: 'ancienne', note: 'L\'interface d\'avant la v0.10.0 sur le champ en direct : l\'horloge, la fiche, les morts, les batteries, les régiments choisis sont des plaques identiques (terre, liseré de boue). Rien ne dit ce qui est permanent, ce qui est un ordre, ce qui est une fiche.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calquePlaques('actuelle') }) },
      { title: 'Trois familles', status: 'ancienne', note: 'Non retenu (v0.10.0). Un bandeau d\'instruments en haut (le temps, la mission, les morts : permanent, sans cadre) ; des cartes de régiment à liseré bleu et une barre d\'effectif (les ordres) ; une fiche encadrée à en-tête plein (ce qu\'on ouvre). On distingue l\'état de l\'action sans lire.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calquePlaques('familles') }) },
      { title: 'Des papiers de campagne', status: 'ancienne', note: 'Retenu en v0.10.0, remplacé : la montre de gousset est retirée depuis la v0.30.0 (l\'heure est dans le billet). Plus intradiégétique : une montre de gousset pour l\'heure, une feuille de situation (papier, lignes, tampon « ébranlé », barre debout / blessés / tombés) pour le régiment, un râtelier d\'obus (debout : prêt ; couché : se recharge), des croix au crayon pour les morts.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calquePlaques('papiers') }) },
      { title: 'Avec le carnet de bord', status: 'ancienne', note: 'Retenu en v0.10.0, la mise en page a changé depuis (v0.19.0, v0.20.0, v0.30.0). Les papiers de campagne, et un carnet de bord : les événements marquants à l\'heure où ils arrivent (la préparation d\'en face, la sortie, le dernier défenseur, le tronçon perdu), la ligne la plus récente surlignée. La mémoire de la pause active.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calquePlaques('carnet') }) },
    ] },
    { id: 'barre-temps', title: 'La barre du temps', variants: [
      { title: 'La bande de météo', status: 'actuelle', depuis: '0.31.2', note: 'La frise est elle-même la météo : chaque jour a la couleur de son temps (sec, pluie, brouillard, gel), demain hachuré, le reste en blanc ; la nuit est une barre sombre dessous ; le texte suit le repère au lieu d\'avoir sa ligne. Le plus dense, et le plus lisible en un coup d\'œil. En jeu depuis la v0.31.2 : de la largeur des boutons du haut, avec dessous la mission et le terrain sous la souris.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('bande') }) },
      { title: 'Quatre lignes de texte', status: 'ancienne', note: 'Le billet d\'aujourd\'hui, sous les boutons de vitesse : le jour, l\'heure et le temps, la prévision de demain, la mission, le terrain sous la souris. Rien ne montre où l\'on en est de la bataille.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('actuelle') }) },
      { title: 'La frise continue', note: 'Une ligne de texte, puis une frise de toute la bataille : chaque jour est un jour (clair) suivi de sa nuit (sombre), un trait bleu dit où l\'on est, et dessous, les seuls changements de météo (demain au trait pointillé : c\'est une prévision). Les jours d\'avant sont un ton plus bas.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('continue') }) },
      { title: 'Les jours en cases', note: 'Une case par jour, numérotée ; la case du jour s\'ouvre sur ses heures (jour puis nuit) avec le trait bleu ; la météo ne se dit qu\'au changement, un point sinon. Se lit comme un calendrier : « troisième jour sur onze ».', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('cases') }) },
      { title: 'Une seule ligne', note: 'Le jour, l\'heure, le temps d\'aujourd\'hui et celui de demain à côté des boutons de vitesse ; une règle de cinq pixels dessous, jours et nuits, le trait bleu. La mission et le terrain quittent ce papier. Presque rien à l\'écran.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('ligne') }) },
    ] },
    { id: 'assaut', title: 'Attaque d\'une tranchée', variants: [
      { title: 'Le feu se voit', status: 'actuelle', depuis: '0.9.2', note: 'Les hommes disent ce qu\'ils font : ceux qu\'on bombarde se tapissent et ne tirent plus, les autres tirent (éclair, traceur), un homme touché tombe et reste là. On lit à qui appartient la force sans un chiffre.', render: s => maquetteAssaut(s, 'feu') },
      { title: 'Le tronçon se lit', status: 'actuelle', depuis: '0.9.2', note: 'Le monde porte l\'état : des traverses découpent la tranchée en tronçons, un fanion flotte, se déchire, est amené puis remplacé par celui d\'en face ; le fil de fer est coupé ; le parapet est bouleversé ; les sacs sont retournés quand le tronçon est pris. Depuis la v0.18.0 : deux traverses par tronçon, du fil de fer devant les premières lignes, une porte d\'abri par niveau.', render: s => maquetteAssaut(s, 'marques') },
      { title: 'Le compteur', status: 'ancienne', note: 'Ce que voyait le joueur avant la v0.9.2 : des hommes en boîtes, des obus, et « Tronçons : 12 · 11 » en coin. Rien ne dit qu\'un tronçon est disputé, ni que le dernier défenseur va tomber. Allez à « Contact » avec la frise.', render: s => maquetteAssaut(s, 'actuelle') },
      { title: 'Les fusées', note: 'Non retenu (v0.9.2). L\'avant-dernier acte : une fusée d\'appel quand la sortie commence, deux fusées quand il ne reste qu\'un homme (le tronçon va basculer), et celle d\'en face, d\'une autre couleur, quand il est pris. Un signal lisible de loin, au zoom 1.', render: s => maquetteAssaut(s, 'fusees') },
      { title: 'Tout ensemble', note: 'Non retenu (v0.9.2). Le feu, les marques du tronçon et les fusées. Pour juger si le tout reste lisible, ou s\'il faut en retirer.', render: s => maquetteAssaut(s, 'tout') },
    ] },
  ] },
  { id: 'moteur', title: 'Moteur', topics: [
    { id: 'champ', title: 'Champ de bataille', variants: [
      { title: 'Zoom 4', note: 'Le rendu du jeu : quatre de nos régiments avancent ; à 4 pixels par mètre, chaque soldat est une silhouette allégée (jambes, corps, bras, tête, fusil) et son ombre ; l\'équipement n\'apparaît qu\'à partir de 6.', status: 'actuelle', render: s => moteur(s, { zoom: 3 }) },
      { title: 'Zoom 1', note: 'Tout le champ : chaque soldat n\'est plus qu\'un point (sa couleur sur son ombre) ; le sol garde le même relief qu\'au zoom 4 (depuis la v0.12.0).', render: s => moteur(s, { zoom: 0 }) },
      { title: 'Après un jour de pluie', note: 'Quatre-vingt-dix obus et vingt-quatre heures de pluie : la boue dans les creux, l\'eau dans les trous.', render: s => moteur(s, { zoom: 3, pluie: true }) },
      { title: 'Le gel', note: 'Le même champ, gelé : l\'eau devient de la glace, la boue porte.', render: s => moteur(s, { zoom: 3, gel: true }) },
    ] },
    { id: 'sol-vert', title: 'Le sol vert', variants: [
      { title: 'Des plaques de vert', status: 'actuelle', depuis: '0.9.3', note: 'Des plaques d\'une dizaine de mètres, vertes dans le sec et l\'humide, en plus des taches : le champ vire par endroits, comme une prairie qui reprend. Le kaki reste le fond.', render: s => moteur(s, { zoom: 2, cz: 150, soldats: 300, verdure: 2 }) },
      { title: 'Sans vert', status: 'ancienne', note: 'Le sol d\'avant la v0.9.3 : l\'herbe morte (kaki), la glaise, la boue. L\'herbe éparse est dans la couleur de la glaise.', render: s => moteur(s, { zoom: 2, cz: 150, soldats: 300, verdure: 0 }) },
      { title: 'Des taches vertes', note: 'Même sol ; l\'herbe éparse (une case sur 9 à 41) est verte (mousse) au lieu de glaise, vert sombre dans l\'humide. Presque rien ne change, sauf des touches de vert vivant.', render: s => moteur(s, { zoom: 2, cz: 150, soldats: 300, verdure: 1 }) },
      { title: 'Une prairie', note: 'Presque tout le sec est vert, le kaki n\'est plus que des plaques. Le cratère (lèvre claire, creux sombre) et la boue gardent leurs couleurs : à vous de dire si le vert écrase le ton « catastrophe peinte avec calme ».', render: s => moteur(s, { zoom: 2, cz: 150, soldats: 300, verdure: 3 }) },
      { title: 'Une prairie, après trois jours', note: 'La prairie après quatre-vingt-dix obus et une journée de pluie : on voit où le vert tient et où il est retourné.', render: s => moteur(s, { zoom: 3, soldats: 300, verdure: 3, pluie: true }) },
    ] },
    { id: 'nuit', title: 'La nuit sans trame', variants: [
      { title: 'Voile et halos', status: 'actuelle', depuis: '0.9.3', note: 'Le voile, et la lumière peint en plus une lueur chaude (os et herbe sèche) autour des lanternes, des feux et des fusées.', render: s => moteur(s, { zoom: 3, cz: 170, tombee: true, barrages: true, nuit: 'halos', effets: { feu: true, derive: true, fusees: 'toujours' }, surLesArbres: true }) },
      { title: 'La trame', status: 'ancienne', note: 'La nuit d\'avant la v0.9.3 : un pixel sur deux de la terre (Bayer 4 × 4), trouée autour des lumières. Aucune couleur de plus ; coût mesuré dans le rendu logiciel (voir « Dessin » ci-dessous).', render: s => moteur(s, { zoom: 3, cz: 170, tombee: true, barrages: true, nuit: 'trame', effets: { feu: true, derive: true, fusees: 'toujours' }, surLesArbres: true }) },
      { title: 'Un voile continu', note: 'Le même noir, sans trame : il monte en dégradé, les lumières le percent en douceur. Des couleurs qui n\'existent pas dans la palette (un mélange continu entre la terre et le sol).', render: s => moteur(s, { zoom: 3, cz: 170, tombee: true, barrages: true, nuit: 'doux', effets: { feu: true, derive: true, fusees: 'toujours' }, surLesArbres: true }) },
      { title: 'Halos, tout dézoomé', note: 'Les halos au zoom 1 : le champ entier, les lanternes le long des lignes.', render: s => moteur(s, { zoom: 0, cz: 150, soldats: 600, tombee: true, nuit: 'halos', effets: { feu: true, derive: true, fusees: 'toujours' } }) },
    ] },
    { id: 'camera', title: 'Caméra', variants: [
      { title: 'Libre, vers l\'horizon', status: 'actuelle', depuis: '0.28.0', note: 'La caméra du jeu depuis la v0.28.0 n\'est plus bornée : n\'importe quelle direction, de l\'horizon presque au zénith, le ciel de la couleur de la brume ; seul le sol la relève. Ici, à plat, tournée de 40°. (Touches : A, E, R, F et la molette ; C recentre.)', render: s => moteur(s, { zoom: 3, pluie: true, vue: { tangage: 0.22, yaw: 0.7 } }) },
      { title: 'Perspective et respiration', note: 'La caméra d\'avant la v0.28.0 (bornée : tournée de 34° au plus, inclinée de 40° à 77°) : un angle de 30°, plongée de 54°, tournée de 9° (les régiments lointains paraissent plus petits), et elle se balance d\'elle-même, très lentement (2° en 23 s) : le champ vit même quand rien ne bouge. La perspective et la respiration sont restées dans la caméra libre.', status: 'ancienne', depuis: '0.3.1', render: s => moteur(s, { zoom: 3, pluie: true }) },
      { title: 'Immobile', note: 'La même perspective, sans la respiration (v0.3.0).', status: 'ancienne', render: s => moteur(s, { zoom: 3, pluie: true, respiration: 0 }) },
      { title: 'Sans perspective', note: 'Presque la caméra de la v0.2 : un angle de 4°, tout a la même taille de près comme de loin.', status: 'ancienne', render: s => moteur(s, { zoom: 3, pluie: true, camera: { fov: 4 }, respiration: 0 }) },
      { title: 'Plus de perspective', note: 'Un angle de 50° et une plongée de 45° : le lointain rapetisse vite, l\'horizon se rapproche.', render: s => moteur(s, { zoom: 3, pluie: true, camera: { fov: 50, tangage: 0.8 } }) },
      { title: 'Respiration marquée', note: 'Le balancement deux fois plus ample (4°).', render: s => moteur(s, { zoom: 3, pluie: true, respiration: 0.07 }) },
    ] },
    { id: 'soldats', title: 'Soldats de près', variants: [
      { title: 'Équipé, bras qui balancent', status: 'actuelle', depuis: '0.28.0', note: 'Le même, dont les bras balancent à l\'opposé des jambes quand il marche (calculé dans le nuanceur, rien de plus pour le processeur).', render: s => moteur(s, { zoom: 6, cz: 205, soldat: 'equipe-marche' }) },
      { title: 'Silhouette complète', status: 'ancienne', note: 'Jambes, vareuse, visage, casque, le fusil à l\'épaule et le sac au dos (la glaise). Environ 55 triangles par homme de près.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'silhouette' }) },
      { title: 'Une boîte', note: 'Le soldat de la v0.7 : une boîte de la couleur de son camp, son dessus en guise de casque, et son ombre. Environ 10 triangles par homme.', status: 'ancienne', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'boite' }) },
      { title: 'Jambes, tête et casque', note: 'Les bandes molletières sombres (deux jambes), la vareuse, le visage clair, le casque plus large que la tête. Environ 40 triangles, seulement de près (6 pixels par mètre et plus) ; de loin, la boîte, puis le point.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'detail' }) },
      { title: 'La boîte et un fusil', note: 'La boîte de la v0.7, un fusil à l\'épaule (un trait de terre) : la silhouette du fantassin pour 8 triangles de plus.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'fusil' }) },
      { title: 'Équipé', note: 'Étape (v0.27.0, avant les bras qui balancent) : la silhouette et son équipement. Bottes, bandes molletières, capote aux basques rabattues, ceinturon, trois cartouchières, gourde, couverture roulée, mains, baïonnette ; chez nous le casque Adrian (cimier, visière) et la moustache du poilu, en face le casque à pointe et son couvre-nuque. Environ 190 triangles par homme, de 6 pixels par mètre et plus.', render: s => moteur(s, { zoom: 6, cz: 205, soldat: 'equipe' }) },
      { title: 'Équipé, vu de moins près', note: 'Le même équipé à 8 pixels par mètre : ce qu\'il en reste quand on regarde un régiment entier.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'equipe' }) },
      { title: 'Silhouette qui marche', note: 'La silhouette complète, et les jambes qui se balancent quand il marche (calculé dans le shader, selon sa vitesse : rien de plus pour le processeur).', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'marche' }) },
    ] },
    { id: 'cadavres', title: 'Cadavres', variants: [
      { title: 'Poses variées, équipés', status: 'actuelle', depuis: '0.28.0', note: 'Les poses variées, avec le soldat équipé (bottes, ceinturon, cartouchières, gourde, couverture, casque de son camp) : les morts sont les hommes qu\'on voyait debout, avec tout ce qu\'ils portaient.', render: s => moteur(s, { zoom: 6, cz: 205, soldat: 'equipe', cadavre: 'poses', morts: 0.3 }) },
      { title: 'La planche', status: 'ancienne', note: 'Aujourd\'hui : une boîte couchée de 1,7 m, la couleur du camp le jour même, la glaise le lendemain. Rien ne dit que c\'était un soldat.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'silhouette', cadavre: 'planche', morts: 0.3 }) },
      { title: 'Le soldat couché', note: 'Étape (v0.27.0) : le soldat lui-même, couché sur le dos, vareuse, bandes molletières, casque, fusil et sac comme debout ; de 4 pixels par mètre la silhouette allégée, dès 6 celle du style choisi. La glaise le lendemain.', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'silhouette', cadavre: 'couche', morts: 0.3 }) },
      { title: 'Poses variées', note: 'Le même soldat, tombé comme il est tombé : sur le dos, sur le ventre ou sur le côté, les bras et les jambes écartés selon son numéro (il reste ainsi d\'une image à l\'autre).', render: s => moteur(s, { zoom: 5, cz: 205, soldat: 'silhouette', cadavre: 'poses', morts: 0.3 }) },
    ] },
    { id: 'effets', title: 'Effets', variants: [
      { title: 'Tout ensemble', status: 'actuelle', note: 'Gerbe, onde, obus qui tombe, feu, fusées et corbeaux ; la fumée des obus reste 40 à 90 s et vire parfois au noir selon le calibre (v0.27.0) ; les fusils fument aussi (un petit nuage à chaque coup).', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { gerbe: true, onde: true, chute: true, derive: true, feu: true, fusees: 'toujours', corbeaux: 'toujours' } }) },
      { title: 'Les effets de la v0.7', note: 'L\'éclair, la terre jetée, une fumée tramée qui monte et se dissipe en quelques secondes.', status: 'ancienne', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: {} }) },
      { title: 'Gerbe de terre et onde', note: 'Une colonne de terre et de mottes, haute et serrée, qui retombe ; un anneau de poussière qui court au ras du sol.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { gerbe: true, onde: true } }) },
      { title: 'L\'obus qui tombe', note: 'Un quart de seconde avant l\'explosion, une traînée claire descend du ciel jusqu\'au point de chute (avec la gerbe).', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { chute: true, gerbe: true } }) },
      { title: 'La fumée qui reste', note: 'Plus de fumée, qui dure huit à seize secondes et dérive avec le vent vers l\'est : après un barrage, le champ reste voilé un moment.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { derive: true } }) },
      { title: 'Le feu', note: 'Un arbre abattu ou un buisson arraché brûle un moment : des flammes (l\'os et l\'herbe morte) et une fumée qui dérive.', render: s => moteur(s, { zoom: 4, cz: 170, barrages: true, effets: { feu: true, derive: true }, surLesArbres: true }) },
      { title: 'Fusées éclairantes', note: 'Le soir (après 16 h ; ici, toujours) : une fusée monte, s\'ouvre et descend lentement sous son parachute, une fumée derrière elle.', render: s => moteur(s, { zoom: 3, cz: 170, effets: { fusees: 'toujours' } }) },
      { title: 'Les corbeaux', note: 'Quelques points noirs qui tournent lentement au-dessus des morts (ici, au-dessus du champ).', render: s => moteur(s, { zoom: 4, cz: 170, effets: { corbeaux: 'toujours' } }) },
    ] },
    { id: 'projections', title: 'Projections', variants: [
      { title: 'Le jeu tel qu\'il est', status: 'actuelle', note: 'Un vrai obus de la logique sur un régiment en marche (zoom 8 pixels par mètre, choisissez le calibre, « Tirer un obus »). Les morts sont jetés à l\'opposé (v0.24.0), les survivants du souffle reçoivent une poussée et un bond (v0.16.0) : rien ne ralentit ceux qui sont près. Le cercle plein est le rayon mortel, le pointillé la zone du souffle (1,8 rayon).', render: s => maquetteProjections(s, R, 'A') },
      { title: 'Projetés en arc', depuis: '0.32.0', note: 'Tous ceux du souffle (le rayon du calibre) partent en l\'air à l\'opposé du point de chute, en arc, aussi loin qu\'ils étaient près ; en retombant, les plus proches sont tués, les autres blessés (ils restent tapis). Ceux de l\'anneau (jusqu\'à 1,8 rayon) sont ralentis au même instant, plus ou moins selon la distance, puis reprennent leur pas tous ensemble en deux secondes et demie : pas de vague.', render: s => maquetteProjections(s, R, 'B') },
      { title: 'Fauchés au ras du sol', depuis: '0.32.0', note: 'Le souffle est un peu plus large et rase la terre : un vol bas, rapide, plus long (une demi-seconde). Ceux de l\'anneau sont sonnés : ils s\'arrêtent net, se tapissent un instant (d\'autant plus longtemps qu\'ils sont près), puis repartent. Le plus brutal, le plus lisible de loin.', render: s => maquetteProjections(s, R, 'C') },
      { title: 'Soulevés, retombent près', depuis: '0.32.0', note: 'Le souffle les soulève presque à la verticale (un vol de plus d\'une seconde, très haut) et ils retombent près d\'où ils étaient, à peine plus loin. Ceux de l\'anneau marchent au ralenti, d\'un pas égal pendant deux secondes et demie, puis le reprennent d\'un coup : la poussière, la terre qui retombe.', render: s => maquetteProjections(s, R, 'D') },
    ] },
    { id: 'visee', title: 'Visée d\'un obus', variants: [
      { title: 'Le carré du jeu', status: 'actuelle', note: 'Aujourd\'hui : le curseur en croix, puis un petit carré à l\'endroit visé pendant deux secondes. Rien ne dit le rayon de l\'obus. Les trois cercles de cette vue sont donc des carrés, un par calibre (75, 155, 220 mm).', render: s => maquetteVisee(s, R, 'A') },
      { title: 'Un trait', depuis: '0.32.0', note: 'Un cercle plein d\'un trait d\'os (ombré de terre pour se lire sur l\'herbe comme sur la boue), du rayon du souffle de chaque calibre, un point au centre. Le plus sobre. Passez le pointeur sur le champ : un quatrième cercle le suit, du calibre choisi.', render: s => maquetteVisee(s, R, 'B') },
      { title: 'Des tirets qui tournent', depuis: '0.32.0', note: 'Le même cercle en tirets, qui tournent doucement : on voit tout de suite que c\'est une visée, pas un tracé du terrain.', render: s => maquetteVisee(s, R, 'C') },
      { title: 'Des cibles concentriques', depuis: '0.32.0', note: 'Le souffle en zone assombrie (un mélange de terre et de sol, hors palette comme les ombres), deux anneaux pointillés à deux tiers et à un tiers du rayon : plus on est près du centre, plus on tue. Dit l\'étendue ET la gravité.', render: s => maquetteVisee(s, R, 'D') },
      { title: 'Des repères au bord', depuis: '0.32.0', note: 'Un cercle fin, quatre repères au bord (nord, est, sud, ouest) et le rayon écrit en mètres sous le cercle : on lit la taille sans comparer aux hommes.', render: s => maquetteVisee(s, R, 'E') },
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

mountLabo(document.getElementById('labo'), {
  game: NOM, home: './', atelier: 'atelier.html', groups: GROUPES,
  accueil: { version: VERSION, intro: 'Ce qui a changé au labo, et où le voir. A est toujours la variante en jeu ; le point plein marque la retenue.', journal: JOURNAL },
});
