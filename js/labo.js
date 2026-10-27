// Le Labo (section 16) : il MONTRE et compare, il ne modifie rien.
// Chaque sujet utilise les mêmes modules que le jeu (terrain, apparence,
// rendu three.js) : ce qu'on voit ici est ce que le jeu dessinera. Ajouter un
// sujet ou une variante = ajouter une entrée dans GROUPES.
import { afficherVersion } from './version-tag.js?v=0.86.0';
import { mountLabo } from './lib/labo-shell.js?v=0.86.0';
import { spriteCanvas, paletteToGPL, paletteToHex } from './lib/sprites.js?v=0.86.0';
import { PALETTE, ROLES } from './palette.js?v=0.86.0';
import { chargerContenu } from './design-store.js?v=0.86.0';
import { tuile, ETAT } from './tuiles.js?v=0.86.0';
import { creerTerrain, impact, hydroLignes, toucher } from './terrain.js?v=0.86.0';
import { FORMES } from './cratere.js?v=0.86.0';
import { CALIBRES } from './data/calibres.js?v=0.86.0';
import { METEO } from './data/meteo.js?v=0.86.0';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, mourir, regarderAu, aube, horloge, ticksParJour, rangDe } from './bataille.js?v=0.86.0';
import { AZIMUTS, COTES } from './data/soleil.js?v=0.86.0';
import { creerRendu, ZOOMS } from './rendu3d.js?v=0.86.0';
import { placesCommandement } from './army.js?v=0.86.0';
import { hash2 } from './lib/rng.js?v=0.86.0';
import { reglerVerdure } from './apparence.js?v=0.86.0';
import { maquetteAssaut } from './labo-assaut.js?v=0.86.0';
import { calquePlaques } from './labo-plaques.js?v=0.86.0';
import { calqueBarre } from './labo-barre-temps.js?v=0.86.0';
import { maquetteProjections, maquetteVisee } from './labo-projections.js?v=0.86.0';
import { calqueBarreVie } from './labo-barre-vie.js?v=0.86.0';
import { calqueClic } from './labo-clic-regiment.js?v=0.86.0';
import { maquetteBoutons, calqueOrdre, calqueObus } from './labo-satisfaction.js?v=0.86.0';
import { calqueEtiquette, calqueToast, maquetteCartes } from './labo-hud-ux.js?v=0.86.0';
import { maquetteCampagne } from './labo-campagne.js?v=0.86.0';
import { maquetteCaisses, maquetteRates, maquetteSapes } from './labo-arcade.js?v=0.86.0';
import { maquetteChars } from './labo-chars.js?v=0.86.0';
import { maquetteGaz } from './labo-gaz.js?v=0.86.0';
import { maquetteAvions } from './labo-avions.js?v=0.86.0';
import { maquetteBatiment, maquetteCamp } from './labo-batiments.js?v=0.86.0';
import { BATIMENTS } from './data/batiments.js?v=0.86.0';
import { maquettePonts, PONTS, NOMS_PONTS } from './labo-ponts.js?v=0.86.0';
import { PONTS_JEU } from './data/ponts.js?v=0.86.0';
import { JOURNAL } from './labo-journal.js?v=0.86.0';
import { loadVersion } from './lib/app-update.js?v=0.86.0';
import { maquetteEffets, maquetteAmbiance, maquetteEspace } from './labo-son.js?v=0.86.0';
import { calqueMoral } from './labo-moral.js?v=0.86.0';

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

// ─── Les cratères : le même champ labouré, avec la forme à essayer (cratere.js) ───
// trois obus isolés (75, 155, 220) au milieu de la vue pour lire la forme, puis quarante-cinq au hasard (tous les mêmes d'une forme à l'autre :
// positions et calibres viennent de `hash2`, arrondis au décimètre comme les impacts de la sauvegarde)
function labourer(B, forme, cz) {
  const T = B.terrain, cx = B.etat.marges.x + 200, cy = B.etat.marges.y + cz, dm = v => Math.round(v * 10) / 10;
  ['75', '155', '220'].forEach((cal, k) => impact(T, dm(cx + (k - 1) * 14 + 0.37 * k), dm(cy + 0.5 * k), cal, R, 1000 + k, false, forme));
  for (let k = 0; k < 45; k++) impact(T, dm(cx - 70 + hash2(k, 1, 9) * 140), dm(cy - 40 + hash2(k, 2, 9) * 80), ['75', '155', '220'][k % 3], R, k, false, forme);
}
const SAISONS_ARBRES = [['ete', 'Été'], ['automne', 'Automne'], ['hiver', 'Hiver'], ['neige', 'Hiver · neige'], ['printemps', 'Printemps (une teinte, pas une saison)']];
// ce que coûte une forme : les cases touchées et le temps d'un obus, par calibre (300 obus isolés sur un petit sol plat)
const coutsCratere = {};
function coutCratere(nom) {
  if (coutsCratere[nom]) return coutsCratere[nom];
  const parts = ['75', '155', '220'].map(cal => {
    let cases = 0, ms = 0;
    for (let k = 0; k < 300; k++) {
      const T = creerTerrain(1, { largeur: 41, hauteur: 41, arbres: 0 }, R); T.base.fill(20); T.nappe.fill(-20);
      const t = performance.now(); impact(T, 20 + hash2(k, 1, 5), 20 + hash2(k, 2, 5), cal, R, k, false, FORMES[nom]); ms += performance.now() - t;
      for (let c = 0; c < T.diff.length; c++) if (T.diff[c]) cases++;
    }
    return `${cal} : ${(cases / 300).toFixed(0)} cases, ${(ms / 300 * 1000).toFixed(0)} µs`;
  });
  return (coutsCratere[nom] = `Un obus (cases touchées, temps de impact() ici) — ${parts.join(' · ')}`);
}

// ─── La parade des grades (v0.68.0) : un régiment de chaque camp rangé en plein champ, face à face, à la place que le jeu donne à son commandement (`placesCommandement`) ───
// 14 hommes de large, 5 rangs, un mètre et demi entre eux ; les hommes sont ceux du régiment (leurs rangs, leurs numéros) : seuls leurs places changent, la simulation attend (`vivant`)
function parader(B, cx0, cy0) {
  // au plus près du point demandé, loin des arbres (ils cachaient les rangs)
  let cx = cx0, cy = cy0, mieux = 1e9;
  for (let dx = -90; dx <= 90; dx += 6) for (let dy = -60; dy <= 60; dy += 6) {
    const x = cx0 + dx, y = cy0 + dy, d = dx * dx + dy * dy;
    if (d < mieux && !B.terrain.arbres.some(a => Math.abs(a.i - x) < 20 && Math.abs(a.j - y) < 20)) { mieux = d; cx = x; cy = y; }
  }
  const A = B.armee, COLS = 14, N = 70, ESP = 1.5, places = Array.from({ length: N }, (_, k) => k);
  placesCommandement({ cols: COLS }, N).forEach((t, g) => { const a = places[g]; places[g] = places[t]; places[t] = a; });
  for (const camp of [0, 1]) {
    const reg = B.etat.regiments.find(r => r.camp === camp);
    const ids = []; for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && ids.length < N) ids.push(i);
    ids.forEach((i, k) => {
      const col = places[k] % COLS, rang = (places[k] - col) / COLS, lx = (col - (COLS - 1) / 2) * ESP;
      A.x[i] = cx + lx; A.y[i] = cy + (camp === 0 ? 6 + rang * ESP : -6 - rang * ESP); A.vx[i] = 0; A.vy[i] = 0;
    });
  }
  return [cx, cy];
}

// Une colline pour juger l'ombre portée (labo « La lumière dans le relief ») : un mamelon de `r` mètres de rayon et `h` mètres de haut (sommet plat, flancs raides), à `dx` et `dz` mètres du point visé (le haut en marches d'un mètre, comme le sol du jeu) ; rien n'est sauvegardé
function poserColline(B, { dx = 0, dz = 0, r = 22, h = 9 }, cz) {
  const T = B.terrain, cx = B.etat.marges.x + 200 + dx, cy = B.etat.marges.y + cz + dz;
  for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(T.H - 1, Math.ceil(cy + r)); j++) for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(T.W - 1, Math.ceil(cx + r)); i++) {
    const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
    if (d >= r) continue;
    T.base[j * T.W + i] += Math.round(h * 4 * Math.min(1, (r - d) / (0.4 * r)));      // un sommet plat, des flancs raides (en quarts de mètre) : de quoi jeter une vraie ombre
    toucher(T, i, j);
  }
}

function moteur(stage, { zoom = 3, pluie = false, gel = false, soldats = 600, cz = 185, camera = null, respiration = undefined, soldat = undefined, cadavre = undefined, morts = 0, effets = undefined, barrages = false, surLesArbres = false, vue = null, verdure = undefined, nuit = null, tombee = false, calque = null, bord = null, centre = null, finesse = 1, cratere = null, arbres = undefined, saison = null, jours = undefined, versLesArbres = false, buissons = undefined, versLesBuissons = false, lumiere = null, colline = null, journee = null, grades = undefined, parade = false } = {}) {
  reglerVerdure(verdure);                                   // le sol vert (apparence.js) : avant que le sol ne se peigne
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(70vh,560px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  // le relevé : ce que coûte cette variante (le dessin attendu jusqu'au bout), et des zooms à essayer
  const releve = el('p', { className: 'releve', textContent: '…' });
  const zooms = el('p', {}, ...ZOOMS.map((z, i) => el('button', { className: 'essai', textContent: `Zoom ${z}`, onclick: () => { if (rendu) rendu.vue.zoom = i; } })));
  const ctx = { rendu: null, B: null };                      // ce que le calque peut lire du moteur, une fois lancé
  boite.append(canvas); const finCalque = calque?.(boite, ctx); stage.append(boite, releve);
  if (cratere) stage.append(el('p', {}, el('button', { className: 'essai', textContent: 'Sol fin · 6 pixels par mètre', onclick: () => { if (rendu) { rendu.finesse = 2; rendu.vue.zoom = 4; } } }), el('button', { className: 'essai', textContent: 'Au mètre · 3 pixels par mètre', onclick: () => { if (rendu) { rendu.finesse = 1; rendu.vue.zoom = 2; } } })), el('p', { className: 'releve', textContent: coutCratere(cratere) }));
  // les arbres variés (v0.52.6) : les saisons, à changer à chaud, et les jours de la chute des feuilles
  let reglerSaison = () => {};
  if (saison) {
    const boutons = [...SAISONS_ARBRES.map(([cle, nom]) => el('button', { className: 'essai', textContent: nom, onclick: () => reglerSaison(cle) }))];
    stage.append(el('p', {}, ...boutons));
    if (arbres?.chute) stage.append(el('p', {}, ...[1, 4, 7, 10].map(j => el('button', { className: 'essai', textContent: `Jour ${j}`, onclick: () => { if (ctx.B) ctx.B.etat.jour = j; } }))));
  }
  // la lumière dans le relief : l'heure (figée), la saison, l'azimut, les ombres du relief ; « Réinitialiser » remet les réglages de départ
  // (`journee` : la bataille tourne, un jour de jeu en `secondes` secondes ; sinon l'heure est figée)
  const depart = () => ({ ombres: !!lumiere?.ombres, heure: lumiere?.heure ?? 9, saison: 'automne', saisonnier: !!lumiere?.saisonnier, azimut: lumiere?.azimut ?? 'sud', fige: !journee, parois: !!lumiere?.parois, nuages: !!lumiere?.nuages, meteo: !!lumiere?.meteo });
  const lum = depart();
  let appliquerLumiere = () => {};
  if (lumiere) {
    const bascule = (nom, ...b) => el('p', {}, el('span', { textContent: nom + ' : ' }), ...b);
    const bouton = (t, f) => el('button', { className: 'essai', textContent: t, onclick: () => { f(); appliquerLumiere(); } });
    stage.append(
      bascule('Ombres du relief', bouton('Sans', () => { lum.ombres = false; }), bouton('Avec', () => { lum.ombres = true; })),
      bascule('Heure', ...[7, 8, 9, 10, 12, 14, 16, 17].map(h => bouton(`${h} h`, () => { lum.heure = h; lum.fige = true; })), bouton('Le temps passe', () => { lum.fige = false; })),
      bascule('Saison', ...[['automne', 'Automne'], ['hiver', 'Hiver'], ['ete', 'Été']].map(([k, n]) => bouton(n, () => { lum.saison = k; })), bouton('Soleil du jeu', () => { lum.saisonnier = false; }), bouton('Soleil de la saison', () => { lum.saisonnier = true; })),
      bascule('Soleil', ...[...Object.keys(COTES), ...Object.keys(AZIMUTS)].map(k => bouton(k, () => { lum.azimut = k; }))),
      bascule('Parois', bouton('Parois du jeu', () => { lum.parois = false; }), bouton('Parois selon le soleil', () => { lum.parois = true; })),
      bascule('Nuages', bouton('Sans ombres de nuages', () => { lum.nuages = false; }), bouton('Avec ombres de nuages', () => { lum.nuages = true; })),
      bascule('Ciel couvert', bouton('Ombres toujours', () => { lum.meteo = false; }), bouton('Sans ombres sous un ciel couvert', () => { lum.meteo = true; })),
      el('p', {}, bouton('Réinitialiser', () => { Object.assign(lum, depart()); })),
    );
  }
  stage.append(zooms);
  // les grades (v0.68.0) : d'un bouton à un capitaine, d'un camp ou de l'autre, au zoom où on le lit
  if (grades) stage.append(el('p', {}, ...[['Un capitaine · nous', 0], ['Un capitaine · en face', 1]].map(([nom, camp]) => el('button', { className: 'essai', textContent: nom, onclick: () => {
    const B = ctx.B, A = B?.armee; if (!A) return;
    for (let i = 0; i < A.n; i++) if (A.camp[i] === camp && rangDe(B, A.id[i], A.reg[i]) === 0) { rendu.vue.cx = A.x[i]; rendu.vue.cz = A.y[i]; if (rendu.vue.zoom < 4) rendu.vue.zoom = 5; return; }
  } }))));
  let raf = 0, rendu = null, fini = false;
  (async () => {
    const B = nouvelleBataille(5, R, { soldats, jours: journee?.jours ?? jours, ...(journee ? { saison: journee.saison } : {}) });
    if (tombee) B.etat.phase = 'nuit';                       // la nuit : l'obscurité du jeu, ses lanternes
    if (pluie || gel) {
      // une journée de pluie sur un champ labouré, calculée d'un coup
      const T = B.terrain;
      for (let k = 0; k < 90; k++) impact(T, B.etat.marges.x + 120 + hash2(k, 1, 9) * 160, B.etat.marges.y + 110 + hash2(k, 2, 9) * 90, ['75', '155', '220'][k % 3], R, k);
      for (let h = 0; h < 24; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
      if (gel) B.etat.meteo[0] = 'gel'; else B.etat.meteo[0] = 'pluie';
    }
    if (cratere) labourer(B, FORMES[cratere], cz);
    if (colline) poserColline(B, colline, cz);
    if (morts) {
      // des morts de la veille (la glaise) et du jour (la couleur de leur camp), tombés en rangs là où l'on regarde
      const A = B.armee;
      for (let i = 0; i < A.n; i++) if (hash2(i, 5, 9) < morts && Math.abs(A.x[i] - B.etat.marges.x - 200) < 70 && Math.abs(A.y[i] - B.etat.marges.y - cz) < 45) mourir(B, i, 'tir');
      B.etat.corps.forEach((c, k) => { if (k % 2) c[3] = B.etat.jour - 1; });
    }
    ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).slice(2, 6).map(r => r.id), B.etat.marges.x + 200, B.etat.marges.y + 175);
    rendu = await creerRendu(canvas, { mesure: true, camera, respiration, soldat, cadavre, effets, bord, arbres, buissons: buissons ? {} : null, grades });
    if (fini) { rendu.detruire(); return; }
    if (nuit) rendu.styleNuit = nuit;
    rendu.finesse = finesse;
    rendu.redimensionner();
    rendu.attacher(B);
    if (vue) rendu.placerCamera(vue.yaw, vue.tangage);       // la caméra libre du jeu
    rendu.vue.zoom = zoom; rendu.vue.cx = centre ? centre[0] : B.etat.marges.x + 200; rendu.vue.cz = centre ? centre[1] : B.etat.marges.y + cz;   // (coordonnées du secteur, plus les marges ; `centre` : celles du terrain)
    ctx.rendu = rendu; ctx.B = B;
    let vivant = !(grades || parade);                                      // les grades : la parade d'abord (la simulation attend), la bataille ensuite
    if (grades || parade) {
      [rendu.vue.cx, rendu.vue.cz] = parader(B, rendu.vue.cx, rendu.vue.cz);
      stage.append(el('p', {}, el('button', { className: 'essai', textContent: 'La parade (arrêtée)', onclick: () => { [rendu.vue.cx, rendu.vue.cz] = parader(B, B.etat.marges.x + 200, B.etat.marges.y + cz); vivant = false; } }), el('button', { className: 'essai', textContent: 'La bataille (en direct)', onclick: () => { vivant = true; } })));
    }
    if (versLesArbres) {                                       // le coin le plus boisé du secteur (l'arbre qui en a le plus dans ses 20 m)
      const T = B.terrain, m = B.etat.marges, dans = a => a.i > m.x + 20 && a.i < m.x + 380 && a.j > m.y + 20 && a.j < m.y + 280;
      let mieux = null, n = -1;
      for (const a of T.arbres) { if (!dans(a)) continue; const c = T.arbres.reduce((s, b) => s + ((a.i - b.i) ** 2 + (a.j - b.j) ** 2 < 400 ? 1 : 0), 0); if (c > n) { n = c; mieux = a; } }
      if (mieux) { rendu.vue.cx = mieux.i + 0.5; rendu.vue.cz = mieux.j + 0.5; }
    }
    if (versLesBuissons) {                                     // le coin le plus fourni en buissons (celui qui en a le plus dans ses 12 m)
      const T = B.terrain, m = B.etat.marges, dans = a => a.i > m.x + 20 && a.i < m.x + 380 && a.j > m.y + 20 && a.j < m.y + 280;
      let mieux = null, n = -1;
      for (const a of T.buissons) { if (!dans(a)) continue; const c = T.buissons.reduce((q, b) => q + ((a.i - b.i) ** 2 + (a.j - b.j) ** 2 < 144 ? 1 : 0), 0); if (c > n) { n = c; mieux = a; } }
      if (mieux) { rendu.vue.cx = mieux.i + 0.5; rendu.vue.cz = mieux.j + 0.5; }
    }
    reglerSaison = cle => {
      const S = { ete: ['ete', 'canicule'], automne: ['automne', 'sec'], hiver: ['hiver', 'gel'], neige: ['hiver', 'neige'], printemps: ['automne', 'sec'] }[cle];
      B.etat.sol.saison = S[0]; B.etat.meteo[B.etat.jour - 1] = S[1];
      rendu.saisonArbres = cle === 'printemps' ? 'printemps' : null;
    };
    if (saison) reglerSaison(saison);
    if (lumiere) {
      appliquerLumiere = () => {
        if (!journee) { B.etat.sol.saison = lum.saison; B.etat.phase = 'jour'; }
        rendu.ombresRelief = lum.ombres; rendu.ombresNuages = lum.nuages;
        rendu.soleilReglage = { saisonnier: lum.saisonnier, azimut: AZIMUTS[lum.azimut], cote: COTES[lum.azimut], parois: lum.parois, meteo: lum.meteo };
        if (lum.fige) regarderAu(B, lum.heure, journee ? B.etat.meteo[B.etat.jour - 1] : 'sec');
      };
      appliquerLumiere();
    }
    let tReleve = 0, tBarrage = 0.3, kBarrage = 0, accel = 0;
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
      let ev = [];
      if (vivant) {
        if (journee && !lum.fige) {
          // un jour de jeu en `secondes` secondes : plusieurs pas par image (au plus 150) ; la nuit est sautée (l'aube sans corvée), la dernière nuit s'arrête sur la fin de la bataille
          accel += dt * ticksParJour(R) / journee.secondes;
          for (let n = Math.min(150, Math.floor(accel)); n > 0 && B.etat.phase !== 'fin'; n--) { ev = ev.concat(avancer(B)); accel -= 1; if (B.etat.phase === 'nuit') aube(B); }
          accel = Math.min(accel, 150);
        } else ev = avancer(B);
      }
      if (lumiere && lum.fige) regarderAu(B, lum.heure, journee ? B.etat.meteo[B.etat.jour - 1] : 'sec');       // l'heure reste celle choisie : le soleil ne bouge pas pendant la comparaison
      rendu.dessiner(dt, ev);
      if ((tReleve -= dt) < 0) {
        tReleve = 0.5;
        const st = rendu.stats;
        releve.textContent = `Dessin : ${st.ms.renduFini} ms (rendu logiciel ici, attendu jusqu'au bout) · ${st.trianglesDessines} triangles · ${st.soldatsVus} soldats dessinés` + (grades ? ` · ${st.gradesVus} gradés` : '') + (lumiere ? ` · ombres du relief : ${rendu.ombresReliefEtat.enCours ? 'calcul…' : 'à jour'}, sol ${st.ms.sol} ms` : '') + (arbres || versLesArbres ? ` · arbres : ${Math.round(st.trianglesArbres)} triangles, tri ${st.msArbres} ms` : '') + (journee ? (h => ` · jour ${h.jour}/${h.jours}, ${h.heure} h ${String(h.minute).padStart(2, '0')}, ${METEO[h.meteo].nom}, ${h.saison}${lum.fige ? ' (heure figée)' : ''}${B.etat.phase === 'fin' ? ' · fin de la bataille' : ''}`)(horloge(B)) : '');
      }
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
  })();
  return () => { fini = true; finCalque?.(); cancelAnimationFrame(raf); rendu?.detruire(); reglerVerdure(0); };
}

// la scène des essais de lumière : la première tranchée, des cratères, une colline au sud-est (de quoi voir une grande ombre portée), à 4 pixels par mètre
const SCENE_LUMIERE = lumiere => ({ zoom: 3, soldats: 600, cz: 255, finesse: 2, cratere: 'tout', colline: { dx: 20, dz: 31, r: 20, h: 12 }, lumiere });

// une journée en dix secondes, par saison (Jérôme, v0.66.3) : la vraie bataille tourne (un jour de jeu de 360 s en 10 s), le soleil se lève d'un côté et se couche de l'autre, les ombres de nuages dérivent, un ciel couvert efface les ombres
const SCENE_JOURNEE = saison => ({ ...SCENE_LUMIERE({ ombres: true, azimut: 'Se lève à gauche', parois: true, nuages: true, meteo: true, saisonnier: true }), soldats: 400, journee: { saison, secondes: 10, jours: 30 } });

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
    { id: 'barre-vie', title: 'La barre de vie', variants: [
      { title: 'Le duel', status: 'actuelle', depuis: '0.33.0', note: 'Retenue (v0.33.0), en jeu. Un jeu de combat en un contre un : une barre de chaque côté d\'un médaillon (le jour), la vie collée au centre, ce qu\'on a perdu qui se vide vers le bord. Aucun chiffre : passez la souris sur un segment (debout, blessés hachuré, tombés). Dessous, les tronçons tenus : soixante-quatre graduations d\'os (tenus) ou de terre (perdus), sans couleur de camp.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarreVie('duel') }) },
      { title: 'Les biseaux', depuis: '0.32.2', note: 'Des barres penchées, épaisses, avec un liseré d\'os, le nom du camp collé au bord extérieur et un losange (la bataille, 2 sur 11) au centre. Les tronçons en quatre groupes, un par secteur.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarreVie('biseaux') }) },
      { title: 'Le fil du haut', depuis: '0.32.2', note: 'Des barres fines collées au bord de l\'écran, chacune une moitié de la largeur ; le jour pend au centre comme une languette. Presque rien : le champ reste grand (le souci d\'un écran de 13 pouces, v0.30.0).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarreVie('fil') }) },
      { title: 'Un segment par régiment', depuis: '0.32.2', note: 'Chaque barre est faite de huit segments, les huit régiments d\'un camp : on voit lequel tient et lequel fond. Au survol d\'un segment, le régiment (« 3 · Viride : 38 debout · 6 blessés · 12 tombés »). Les tronçons en quatre groupes dessous.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarreVie('segmentee') }) },
      { title: 'Le papier des pertes', status: 'ancienne', note: 'Jusqu\'à la v0.32 : un papier à deux lignes, une par camp (le nom, une barre, « debout · blessés · tombés », les tronçons tenus en chiffres). Tout est en chiffres : il faut lire pour savoir qui gagne.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarreVie('actuelle') }) },
    ] },
    { id: 'clic-regiment', title: 'Le clic sur un régiment', variants: [
      { title: 'Les équerres', status: 'actuelle', depuis: '0.33.0', note: 'Retenues (v0.33.0), en jeu : la caméra glisse aussi sur le régiment (0,6 s). Quatre coins d\'os se referment sur l\'emprise du régiment, comme un cadre de sélection qui se dessine ; la carte s\'allume un instant.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres') }) },
      { title: 'Le fanion', depuis: '0.32.2', note: 'Un pin numéroté, à la couleur de l\'armée, tombe du ciel au-dessus du régiment et rebondit ; la carte se soulève et retombe.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('fanion') }) },
      { title: 'Le fil', depuis: '0.32.2', note: 'Un trait pointillé se déroule de la carte jusqu\'au régiment, où un anneau bat deux fois ; on voit d\'où l\'on vient et où l\'on va.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('fil') }) },
      { title: 'Le sonar', status: 'ancienne', note: 'En jeu en v0.32.2, remplacé par les équerres en v0.33.0 : un clic sur la carte d\'un régiment, la caméra glisse sur lui (0,6 s) ; deux anneaux d\'os se resserrent autour de lui, la carte s\'enfonce d\'un cran. Cliquez une carte du bas.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('sonar') }) },
    ] },
    { id: 'fenetre-ordres', title: 'La fenêtre d\'ordres', variants: [
      { title: 'Le rabat', status: 'actuelle', depuis: '0.34.6', note: 'Retenu (v0.34.6), en jeu : posé juste au-dessus de la carte du régiment. Le papier est un rabat de carte qui se relève d\'un coup, charnière en bas, sur la carte : comme on ouvre un porte-cartes.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres', 'rabat') }) },
      { title: 'Le tiroir', depuis: '0.33.0', note: 'Le papier sort de la carte : il se déplie vers le haut, ancré à elle, en un quart de seconde. On voit d\'où il vient.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres', 'tiroir') }) },
      { title: 'Une seule feuille', depuis: '0.33.0', note: 'La carte et la fenêtre ne font plus qu\'une feuille : la carte s\'efface dans le papier de la fenêtre, collée à elle, sans ombre entre les deux, et la feuille se déroule vers le haut. Plus de papier qui flotte.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres', 'feuille') }) },
      { title: 'Ligne à ligne', depuis: '0.33.0', note: 'Le papier est posé d\'un coup mais s\'écrit : le titre, puis chaque ligne et chaque bouton apparaissent l\'un après l\'autre, à quelques centièmes d\'écart, comme un ordre qu\'on rédige.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres', 'lignes') }) },
      { title: 'Au régiment', status: 'ancienne', note: 'En jeu en v0.34.0 et v0.34.1, remplacée par le rabat en v0.34.6. La fenêtre quitte le bas de l\'écran : elle vient près des hommes, juste au-dessus de la boîte de leur nom (v0.34.1 ; la maquette la pose au-dessus de leur emprise), reliée à eux par une pointe, et les suit quand ils marchent. Elle fait un petit bond en arrivant.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres', 'bulle') }) },
      { title: 'Elle apparaît d\'un coup', status: 'ancienne', note: 'Jusqu\'à la v0.33 : un clic sur la carte, et le papier des ordres (le régiment, ce qu\'il fait, les formes, Marcher, Regagner, Fiche) est là, posé au-dessus de la carte, sans lien avec elle. Cliquez une carte du bas.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueClic('equerres', 'sec') }) },
    ] },
    { id: 'moral-terrain', title: 'Le moral sur le champ', variants: [
      { title: 'Le liseré qui s\'effrite', depuis: '0.67.2', note: 'Un cadre autour des hommes. Ébranlé : des tirets orange qui marchent. En déroute : le cadre se casse en morceaux rouges qui vacillent et s\'éteignent à tour de rôle. Tient : rien (le silence dit « tout va bien »). Le plus discret ; il reprend la forme de l\'anneau et du cadre de choix, donc il se confond avec eux si le régiment est choisi.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('lisere') }) },
      { title: 'Le pennon', depuis: '0.67.2', note: 'Un mât planté au bord des hommes, toujours là : il tient droit, toile bleue déployée ; ébranlé, il penche et la toile pend à mi-mât, orange ; en déroute, il est à terre, la toile rouge en lambeaux. Reprend le fanion déchiré des tranchées. Se lit même sans couleur (droit, penché, couché), mais ajoute un objet par régiment à l\'écran.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('pennon') }) },
      { title: 'La trame', depuis: '0.67.2', note: 'Une hachure en biais sur toute l\'emprise, qui se resserre quand le régiment fléchit : espacée et orange (ébranlé), serrée et rouge avec un cadre pointillé (en déroute). C\'est la hachure de la barre de la carte, portée sur le champ. La plus lisible de loin, la plus lourde : elle couvre les hommes.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('trame') }) },
      { title: 'Les chevrons de repli', depuis: '0.67.2', note: 'L\'action plutôt que l\'état : ébranlé, un chevron orange pulse sous les hommes, vers l\'arrière ; en déroute, trois chevrons rouges coulent vers le sud. Dit où ils vont, pas ce qu\'ils sont ; invisible dès que le régiment s\'arrête.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('chevrons') }) },
    ] },
    { id: 'clic-bouton', title: 'Le clic sur un bouton', variants: [
      { title: 'Le rebond', status: 'actuelle', depuis: '0.41.3', note: 'Retenu (v0.41.3), en jeu : Dès l\'appui, le bouton s\'enfonce (94 %), puis revient en dépassant un peu (105 %) : 280 ms. Le plus discret et le plus universel ; il dit « j\'ai senti ton doigt » avant même que l\'ordre parte.', render: s => maquetteBoutons(s, 'rebond') },
      { title: 'Sans retour', status: 'ancienne', depuis: '0.40.1', note: 'Jusqu\'à la v0.41.2 : Ce que le jeu faisait : le bouton s\'allume au survol (glaise), et au clic l\'ordre part, sans que le bouton lui-même réagisse. Seule la carte d\'un régiment s\'enfonce de deux pixels (v0.32.2). Une maquette du papier de campagne : les boutons de la fenêtre d\'ordres, les batteries, le temps. Le journal sous le papier dit l\'ordre reçu.', render: s => maquetteBoutons(s, 'actuelle') },
      { title: 'Le tampon', depuis: '0.40.1', note: 'Une empreinte REÇU, penchée, se plaque sur le bouton et s\'efface en une seconde ; le bouton s\'enfonce d\'un cran. C\'est le ton du jeu (les papiers de campagne, le registre) : un ordre se tamponne. Au son, un coup sourd (le jeu est muet pour l\'instant).', render: s => maquetteBoutons(s, 'tampon') },
      { title: 'L\'onde', depuis: '0.40.1', note: 'Un disque de glaise part du point cliqué (le centre au clavier) et remplit le bouton en 460 ms avant de s\'éteindre. Le retour dit où l\'on a cliqué : utile sur les boutons larges (« Regagner sa tranchée »).', render: s => maquetteBoutons(s, 'onde') },
      { title: 'Le cran', depuis: '0.40.1', note: 'Une touche de télégraphe : le bouton a un pied (une ombre de 3 px), descend de 2 px d\'un coup, tremble deux fois en deux images, puis remonte. Sans adoucissement (steps) : sec, mécanique, comme un levier.', render: s => maquetteBoutons(s, 'cran') },
      { title: 'Le maintien', depuis: '0.40.1', note: 'Un ordre qui compte se tient un quart de seconde : une jauge se remplit au pied du bouton, puis il se retourne (os sur terre) et l\'ordre part ; lâché avant, rien ne part. Évite les clics maladroits et donne du poids. Au clavier : Espace ou Entrée tenus. À réserver aux ordres lourds, pas à « Fiche ».', render: s => maquetteBoutons(s, 'maintien') },
    ] },

    { id: 'ordre-secteur', title: 'Un ordre sur un secteur', variants: [
      { title: 'Le fanion et la réponse des hommes', status: 'actuelle', depuis: '0.41.3', note: 'Retenu (v0.41.3), en jeu : en terrain libre, un fanion tombe au point cliqué et se plante pendant que chaque homme lève un « ! » et lance un peu de poussière, du plus près du secteur au plus loin. Sur une tranchée, rien de plus que le clignotement des tronçons. Cliquez un secteur : les régiments 1 et 2 y marchent vraiment.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('combine') }) },
      { title: 'Sans retour', status: 'ancienne', depuis: '0.40.1', note: 'Jusqu\'à la v0.41.2 : Ce que le jeu faisait : les régiments choisis se mettent en marche ; sur une tranchée, ses tronçons clignotent trois secondes (v0.21.0). En terrain libre, rien ne marque le point cliqué. Ici : cliquez un secteur, les régiments 1 et 2 y marchent vraiment (un ordre impossible est refusé à voix haute).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('actuelle') }) },
      { title: 'Le fanion planté', depuis: '0.40.1', note: 'Un fanion tombe au point cliqué, rebondit et se plante, la toile se déploie ; un fil pointillé court de chaque régiment au fanion. Le point d\'arrivée reste marqué 2,6 s : on voit où l\'on a envoyé quelqu\'un.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('fanion') }) },
      { title: 'L\'onde du secteur', depuis: '0.40.1', note: 'Trois anneaux partent du point cliqué sur le sol (en perspective) et l\'emprise de l\'ordre se dessine en pointillés qui défilent. On lit la zone, pas seulement le point (l\'emprise est indicative : 46 m sur 18 m).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('ondes') }) },
      { title: 'La réponse des hommes', depuis: '0.40.1', note: 'Chaque homme lève un petit « ! » puis lance un nuage de poussière à ses pieds, du plus près du secteur au plus loin : le régiment s\'ébranle comme une vague. C\'est le retour le plus « vivant », et le plus lourd (un dessin par homme).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('reponse') }) },
      { title: 'La bannière', depuis: '0.40.1', note: 'La bannière numérotée de chaque régiment se déploie au-dessus de ses hommes, flotte deux secondes puis se replie : on voit qui a reçu l\'ordre, et le numéro est celui de sa carte. Au zoom 1 et 2, elle remplace ce que le point ne dit pas.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('banniere') }) },
      { title: 'Le réticule', depuis: '0.40.1', note: 'Quatre coins d\'os se referment sur l\'emprise de l\'ordre et une croix se pose au milieu en tournant d\'un quart : le geste d\'un état-major qui pointe. Le plus économe, et le plus proche des équerres du clic sur un régiment.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueOrdre('reticule') }) },
    ] },

    { id: 'coup-obus', title: 'Le coup d\'obus', variants: [
      { title: 'La trajectoire', status: 'actuelle', depuis: '0.41.3', note: 'Retenu (v0.41.3), en jeu : Un trait d\'os suit l\'obus du ciel jusqu\'au sol, et son ombre grandit sur la cible jusqu\'au rayon du calibre : on voit venir le coup, on sait où il tombe, on peut crier. Au son, un sifflement qui monte (le jeu est muet pour l\'instant).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueObus('trajectoire') }) },
      { title: 'Sans retour', status: 'ancienne', depuis: '0.40.1', note: 'Jusqu\'à la v0.41.2 : Ce que le jeu faisait : la visée (le cercle du souffle) puis l\'obus tombe, la gerbe, l\'onde et la fumée du moteur, le cratère dans le sol. Ici : choisissez un calibre (75, 155, 220), cliquez le champ, un seul obus tombe où vous avez cliqué, après 1,3 s.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueObus('actuelle') }) },
      { title: 'L\'impact en trois temps', depuis: '0.40.1', note: 'Un éclair d\'os d\'un dixième de seconde sur la gerbe, puis un anneau de poussière qui s\'élargit en une demi-seconde ; la fumée qui reste est celle du jeu. Le coup a un début net, un milieu, une fin.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueObus('troisTemps') }) },
      { title: 'L\'onde de choc', depuis: '0.40.1', note: 'Un anneau de pression court sur le sol jusqu\'à trois fois le rayon, et le champ tremble : 1,5 px pour un 75, 3,5 pour un 155, 7 pour un 220, une demi-seconde. Le calibre se sent dans les mains. Coupée si le système demande un mouvement réduit.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueObus('ondeChoc') }) },
      { title: 'La terre qui retombe', depuis: '0.40.1', note: 'Des éclats de terre (14, 26 ou 44 selon le calibre, de la couleur du sol) partent en l\'air et retombent autour du cratère, puis s\'effacent. La terre arrachée par l\'obus devient visible : c\'est le thème du jeu.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueObus('terre') }) },
      { title: 'Le gel d\'image', depuis: '0.40.1', note: 'Sur un 155 et un 220, l\'image se fige 50 ou 90 ms au moment du choc, sous un voile d\'os qui s\'éteint ; rien sur un 75. La logique continue : on reprend le fil, les hommes ont déjà bougé. À essayer par petites doses : trop, il saccade.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueObus('gel') }) },
    ] },

    { id: 'nom-regiment', title: 'Le nom d\'un régiment', variants: [
      { title: 'Le cartouche', status: 'actuelle', depuis: '0.41.3', note: 'Retenu (v0.41.3), en jeu : un carré à numéro (bleu ; orange quand le régiment est ébranlé, rouge quand il est en déroute), le nom et le secteur (h1), le statut (h2 : « Tient », « Ébranlé », « En déroute », ou la corvée de la nuit), la barre debout / blessés au pied ; 44 px de haut au moins, un clic le choisit (Maj : en ajouter). Orange et rouge sont hors de la palette du terrain (`ALERTES` de palette.js).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueEtiquette('cartouche') }) },
      { title: 'Une ligne', status: 'ancienne', depuis: '0.41.0', note: 'Jusqu\'à la v0.41.2 : Ce que le jeu faisait : « 2 · Protogyne · B · Au contact de l\'ennemi », sur une ligne de papier au-dessus des hommes (v0.40.2 : un clic la choisit, mais elle reste une cible d\'une dizaine de pixels). Aucune hiérarchie : le nom, le secteur et l\'état se lisent d\'un bloc. Cliquez un nom.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueEtiquette('actuelle') }) },
      { title: 'Trois étages', depuis: '0.41.0', note: 'Le nom en grand (h1 : numéro et nom), le statut dessous (h2 : « Au contact », « Ébranlé », « Repos », ou « Tient »), le détail en corps de texte (secteur, hommes debout, blessés). Une cible de 44 px au moins, un liseré bleu comme les cartes de la rangée.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueEtiquette('bord') }) },
      { title: 'La pastille', depuis: '0.41.0', note: 'Un rond numéroté de 36 px, tout le champ reste net ; le nom n\'apparaît que pour le régiment choisi, ou quand son statut compte (au contact, ébranlé, repos). Le moins gênant sur la vue d\'ensemble, mais il faut cliquer ou attendre un statut pour lire un nom.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueEtiquette('pastille') }) },
      { title: 'Le fanion', depuis: '0.41.0', note: 'Un papier de carte posé sur une hampe qui descend vers les hommes ; le nom en h1, le détail dessous, et le statut en tampon penché sur le coin (comme « ébranlé » de la fenêtre d\'ordres). La hampe dit où est le régiment, le tampon n\'est là que si quelque chose ne va pas.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueEtiquette('fanion') }) },
    ] },

    { id: 'toasts', title: 'Les toasts', variants: [
      { title: 'Sous le duel', status: 'actuelle', depuis: '0.41.3', note: 'Retenu (v0.41.3), en jeu : Une languette qui descend du haut, au centre, juste sous les pertes : le seul endroit du champ où rien d\'autre n\'est posé. Un liseré dit le genre (bleu : information, glaise : refus, vert kaki clair : alerte) et un petit mot en capitales (« Ordre refusé », « Attention »).', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueToast('bande') }) },
      { title: 'Sur la rangée', status: 'ancienne', depuis: '0.41.0', note: 'Jusqu\'à la v0.41.2 : Ce que le jeu faisait : un papier d\'os en bas au centre, deux secondes et demie, exactement sur la rangée des cartes de régiment : il en cache une ou deux et se lit mal sur leur texte. Déclenchez les trois messages à gauche.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueToast('actuelle') }) },
      { title: 'La pile du bord', depuis: '0.41.0', note: 'Les messages s\'empilent au bord droit sous la carte, jusqu\'à trois, le plus récent en haut : un refus qui suit un autre ne le cache plus. Aucun message ne recouvre le champ ni la rangée, mais la colonne est loin du curseur.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueToast('pile') }) },
      { title: 'Dans le carnet', depuis: '0.41.0', note: 'Rien ne flotte : la ligne s\'écrit au bas du carnet de bord (en haut à gauche), surlignée de la couleur du genre. Le carnet est déjà l\'endroit où le jeu raconte, et la ligne reste ; mais un refus peut passer inaperçu si le carnet est replié.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueToast('carnet') }) },
      { title: 'À l\'objet', depuis: '0.41.0', note: 'Un refus parle depuis le régiment qu\'il vise : une bulle au-dessus de ses hommes, avec sa pointe. Les messages sans régiment (mise à jour, désynchronisation) tombent comme la languette du haut. Le plus lisible pour « qui a refusé ? », le plus bavard sur le champ.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueToast('objet') }) },
    ] },

    { id: 'carte-ordre', title: 'La carte d\'ordre', variants: [
      { title: 'Fond hachuré', status: 'actuelle', depuis: '0.41.3', note: 'Retenu (v0.41.3), en jeu : hauteur fixe de 76 px, la barre toujours au même endroit, le nom sur une ligne (coupé par « … »), le « ! » (« !! » en déroute, orange ou rouge) sur le coin, hors du flux. Le fond d\'un régiment ébranlé ou en déroute est hachuré d\'os et de brume ; choisi, des hachures plus légères (terre et boue sombre).', render: s => maquetteCartes(s, 'hachure') },
      { title: 'Avant la v0.41.3', status: 'ancienne', depuis: '0.41.0', note: 'Jusqu\'à la v0.41.2 : Ce que le jeu faisait : numéro et nom, un « ! » flottant quand le régiment est ébranlé, les chevrons ou le mot de la corvée, la barre. Défauts relevés sur la capture de Jérôme (v0.40.1) : la barre de la carte ébranlée n\'est pas à la hauteur des autres (le « ! » flottant sort du flux de la ligne du nom ; cette maquette reproduit la structure, pas ce décalage exact) ; « Au contact » remplace les chevrons ; sur un nom long, le texte est coupé.', render: s => maquetteCartes(s, 'avant') },
      { title: 'Fond de boue', depuis: '0.41.0', note: 'Hauteur fixe, la barre toujours au même endroit : le nom (h1), le statut (h2, « Tient » quand tout va bien), les chevrons et la barre au pied. Le « ! » est sur le bord haut, hors du flux. Un régiment ébranlé : le fond passe à la boue, un ton plus brun que la terre.', render: s => maquetteCartes(s, 'boue') },
      { title: 'Fond de glaise', depuis: '0.41.0', note: 'Même carte fixe ; le fond ébranlé est la glaise, le texte passe à la terre, le « ! » devient un tampon penché : le papier change de ton nettement. Attention : la glaise est aussi la couleur d\'une corvée donnée la nuit (v0.38.3), à revoir si on la garde.', render: s => maquetteCartes(s, 'glaise') },
      { title: 'Bord abîmé', depuis: '0.41.0', note: 'Même carte fixe ; le fond ébranlé est la boue sombre, le liseré du haut passe en pointillé glaise, et le « ! » est un onglet d\'os qui dépasse du bord : un papier qui a pris l\'eau.', render: s => maquetteCartes(s, 'abime') },
    ] },

    { id: 'bord-carte', title: 'Le bord de la carte', variants: [
      { title: 'Faux terrain dans la nuit', status: 'actuelle', depuis: '0.33.0', note: 'Retenu (v0.33.0), en jeu (pas à l\'écran titre, qui garde sa brume). Le champ se prolonge, mais qui s\'éteint dans le noir au lieu de la brume : le champ se prolonge, puis la nuit le mange. Entre « Faux terrain » et « Brouillard noir ».', render: s => moteur(s, { zoom: 1, soldats: 100, centre: [300, 80], vue: { tangage: 0.4, yaw: 0.7 }, bord: 'faux-noir' }) },
      { title: 'Brouillard noir', depuis: '0.32.2', note: 'Soixante mètres avant le bord, le sol s\'enfonce dans la terre noire (`t`) ; le fond est noir : on ne voit pas la fin, on voit la nuit qui la mange. (Les arbres des marges restent debout dans le noir : à régler si retenu.)', render: s => moteur(s, { zoom: 1, soldats: 100, centre: [300, 80], vue: { tangage: 0.4, yaw: 0.7 }, bord: 'noir' }) },
      { title: 'Brume épaisse', depuis: '0.32.2', note: 'Cent mètres avant le bord, le sol se perd dans la brume (`r`), le même gris que le ciel : l\'horizon se dissout, plus de ligne. Le plus calme, et le plus proche de l\'écran titre.', render: s => moteur(s, { zoom: 1, soldats: 100, centre: [300, 80], vue: { tangage: 0.4, yaw: 0.7 }, bord: 'brume' }) },
      { title: 'Faux terrain', depuis: '0.32.2', note: 'Le champ continue : un plan immense, des plaques de kaki, de vert et de glaise de la couleur du sol, qui se perdent dans la brume à cinq cents mètres. On ne sait plus où finit la carte, mais on peut croire qu\'elle est plus grande qu\'elle n\'est.', render: s => moteur(s, { zoom: 1, soldats: 100, centre: [300, 80], vue: { tangage: 0.4, yaw: 0.7 }, bord: 'faux' }) },
      { title: 'Le papier de la carte', depuis: '0.32.2', note: 'Le sol s\'efface dans l\'os (`o`) : le champ est un dessin sur une feuille, comme les papiers de campagne du HUD. Le jeu devient une carte d\'état-major.', render: s => moteur(s, { zoom: 1, soldats: 100, centre: [300, 80], vue: { tangage: 0.4, yaw: 0.7 }, bord: 'papier' }) },
      { title: 'Coupé net', status: 'ancienne', note: 'Jusqu\'à la v0.32 : le terrain s\'arrête sur une ligne droite, devant le ciel de brume. Vue ici à plat, tournée de 40°, vers le bord nord.', render: s => moteur(s, { zoom: 1, soldats: 100, centre: [300, 80], vue: { tangage: 0.4, yaw: 0.7 } }) },
    ] },
    { id: 'barre-temps', title: 'La barre du temps', variants: [
      { title: 'La bande de météo', status: 'actuelle', depuis: '0.31.2', note: 'La frise est elle-même la météo : chaque jour a la couleur de son temps (sec, pluie, brouillard, gel), demain hachuré, le reste en blanc ; la nuit est une barre sombre dessous ; le texte suit le repère au lieu d\'avoir sa ligne. Le plus dense, et le plus lisible en un coup d\'œil. En jeu depuis la v0.31.2 : de la largeur des boutons du haut, avec dessous la mission et le terrain sous la souris.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('bande') }) },
      { title: 'Quatre lignes de texte', status: 'ancienne', note: 'Le billet d\'aujourd\'hui, sous les boutons de vitesse : le jour, l\'heure et le temps, la prévision de demain, la mission, le terrain sous la souris. Rien ne montre où l\'on en est de la bataille.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('actuelle') }) },
      { title: 'La frise continue', note: 'Une ligne de texte, puis une frise de toute la bataille : chaque jour est un jour (clair) suivi de sa nuit (sombre), un trait bleu dit où l\'on est, et dessous, les seuls changements de météo (demain au trait pointillé : c\'est une prévision). Les jours d\'avant sont un ton plus bas.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('continue') }) },
      { title: 'Les jours en cases', note: 'Une case par jour, numérotée ; la case du jour s\'ouvre sur ses heures (jour puis nuit) avec le trait bleu ; la météo ne se dit qu\'au changement, un point sinon. Se lit comme un calendrier : « troisième jour sur onze ».', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('cases') }) },
      { title: 'Une seule ligne', note: 'Le jour, l\'heure, le temps d\'aujourd\'hui et celui de demain à côté des boutons de vitesse ; une règle de cinq pixels dessous, jours et nuits, le trait bleu. La mission et le terrain quittent ce papier. Presque rien à l\'écran.', render: s => moteur(s, { zoom: 3, cz: 185, soldats: 400, calque: calqueBarre('ligne') }) },
    ] },
    { id: 'campagne', title: 'Le papier de campagne', variants: [
      { title: 'Le registre', status: 'actuelle', depuis: '0.36.4', note: 'Retenu (v0.36.4), en jeu : un papier posé sur le champ à la fin de chaque bataille de campagne. Un seul papier, comme un registre de compagnie : la bataille qui finit en deux phrases, puis une ligne par régiment (les chevrons, la barre vétérans pleins et recrues hachurées, qui le commande, ce qui lui est venu d\'ailleurs), les régiments dissous en pied de page, un bouton pour partir. Le plus dense, tout se lit d\'un coup d\'œil.', render: s => maquetteCampagne(s, 'registre') },
      { title: 'Les cartes en rangée', depuis: '0.36.3', note: 'Non retenue (v0.36.4). Les cartes de régiment du jeu, les mêmes qu\'au bas de l\'écran de bataille : on retrouve ses régiments tels qu\'ils seront. Les dissous restent dessous, barrés, avec l\'endroit où leurs hommes sont passés. Moins de texte, plus de forme.', render: s => maquetteCampagne(s, 'cartes') },
      { title: 'La lettre', depuis: '0.36.3', note: 'Non retenue (v0.36.4). Une lettre de l\'état-major en phrases : la bataille, les régiments dissous, une phrase par régiment (ce qu\'il garde, qui le commande), la mission suivante. Aucun tableau ni chiffre mis en avant : une lecture, la plus proche du ton du jeu.', render: s => maquetteCampagne(s, 'lettre') },
      { title: 'Sur la carte', depuis: '0.36.3', note: 'Non retenue (v0.36.4). Les régiments sont des cercles numérotés aux places qu\'ils prendront, comme sur la carte du jeu ; les dissous en pointillé au bas, avec un trait vers qui a reçu leurs hommes. Survolez ou cliquez un régiment pour son papier.', render: s => maquetteCampagne(s, 'surLaCarte') },
    ] },
    { id: 'assaut', title: 'Attaque d\'une tranchée', variants: [
      { title: 'Le feu se voit', status: 'actuelle', depuis: '0.9.2', note: 'Les hommes disent ce qu\'ils font : ceux qu\'on bombarde se tapissent et ne tirent plus, les autres tirent (éclair, traceur), un homme touché tombe et reste là. On lit à qui appartient la force sans un chiffre.', render: s => maquetteAssaut(s, 'feu') },
      { title: 'Le tronçon se lit', status: 'actuelle', depuis: '0.9.2', note: 'Le monde porte l\'état : des traverses découpent la tranchée en tronçons, un fanion flotte, se déchire, est amené puis remplacé par celui d\'en face ; le fil de fer est coupé ; le parapet est bouleversé ; les sacs sont retournés quand le tronçon est pris. Depuis la v0.18.0 : deux traverses par tronçon, du fil de fer devant les premières lignes, une porte d\'abri par niveau.', render: s => maquetteAssaut(s, 'marques') },
      { title: 'Le compteur', status: 'ancienne', note: 'Ce que voyait le joueur avant la v0.9.2 : des hommes en boîtes, des obus, et « Tronçons : 12 · 11 » en coin. Rien ne dit qu\'un tronçon est disputé, ni que le dernier défenseur va tomber. Allez à « Contact » avec la frise.', render: s => maquetteAssaut(s, 'actuelle') },
      { title: 'Les fusées', note: 'Non retenu (v0.9.2). L\'avant-dernier acte : une fusée d\'appel quand la sortie commence, deux fusées quand il ne reste qu\'un homme (le tronçon va basculer), et celle d\'en face, d\'une autre couleur, quand il est pris. Un signal lisible de loin, au zoom 1.', render: s => maquetteAssaut(s, 'fusees') },
      { title: 'Tout ensemble', note: 'Non retenu (v0.9.2). Le feu, les marques du tronçon et les fusées. Pour juger si le tout reste lisible, ou s\'il faut en retirer.', render: s => maquetteAssaut(s, 'tout') },
    ] },
  ] },
  { id: 'terrain', title: 'Terrain', topics: [
    { id: 'ponts', title: 'Les ponts', variants: [
      { title: 'Le tablier du jeu', status: 'actuelle', depuis: '0.47.1', note: 'Ce que l\'éditeur de carte pose aujourd\'hui (v0.44.0) : un tablier de planches de 6 m sur l\'eau, une seule hauteur qui part de la rive la plus haute (v0.47.1). Pleine masse en cubes : l\'eau ne passe pas dessous, un obus le coupe. Les dix suivantes sont des ouvrages en volumes, au-dessus d\'un fleuve de 16 m dont l\'eau passe dessous.', render: s => maquettePonts(s, R, 'A') },
      ...Object.keys(PONTS).map(cle => PONTS_JEU[cle]
        ? { title: NOMS_PONTS[cle], status: 'retenue', depuis: '0.47.2', note: `En jeu (v0.47.2) : on le choisit dans l'éditeur de carte${PONTS_JEU[cle].char ? ' ; il porte un char' : ' ; il ne porte pas un char (il cède sous lui)'}. ${PONTS[cle]}`, render: s => maquettePonts(s, R, cle) }
        : { title: NOMS_PONTS[cle], status: 'ancienne', depuis: '0.52.2', note: `Non retenu (v0.47.2) : reste au labo. ${PONTS[cle]}`, render: s => maquettePonts(s, R, cle) }),
    ] },
  ] },
  { id: 'arcade', title: 'Arcade', topics: [
    { id: 'caisses', title: 'Les caisses de ravitaillement', variants: [
      { title: 'Le parachute', depuis: '0.38.2', note: 'Un ballon captif lâche une caisse dans le no man\'s land : elle descend sous un parachute d\'os pendant neuf secondes, une fumée dit où, et les deux camps courent vers elle. Le premier homme à moins de cinq mètres la prend, et le contenu se dit alors (vivres, obus, cartouches, pansements, fil de fer, vin). Pas de loot : des vivres et des outils. Aucun contenu n\'est branché dans le jeu.', render: s => maquetteCaisses(s, R, 'A') },
      { title: 'La caisse piégée', depuis: '0.38.2', note: 'La même caisse, marquée d\'un point d\'interrogation : une sur trois est piégée (deux 75 quand on l\'ouvre). Un pari plutôt qu\'une course ; l\'IA d\'en face y tombe comme nous.', render: s => maquetteCaisses(s, R, 'B') },
    ] },
    { id: 'obus-rates', title: 'Les obus ratés', variants: [
      { title: 'Il gît, un cercle', depuis: '0.38.2', note: 'Quatre obus sur dix d\'une salve ne partent pas : ils restent couchés dans la terre, un cercle pointillé dit où ne pas marcher. Un homme qui passe dessus le fait éclater une fois sur vingt par pas. « Désamorcer (la nuit) » les retire ; c\'est une corvée de plus pour la nuit.', render: s => maquetteRates(s, R, 'A') },
      { title: 'Il fume', depuis: '0.38.2', note: 'Pas de cercle : un fil de fumée monte de l\'obus raté, on le voit de loin, on le contourne ou pas. Plus sobre, moins lisible au zoom 1.', render: s => maquetteRates(s, R, 'B') },
      { title: 'Il couve', depuis: '0.38.2', note: 'Il gît sans rien dire, et éclate seul de quinze à trente-cinq secondes plus tard, après un tic-tac d\'une seconde (un anneau qui bat). L\'imprévu, pas la précaution : on ne peut plus rester près d\'un raté.', render: s => maquetteRates(s, R, 'C') },
    ] },
    { id: 'sapes', title: 'Les sapes et les mines', variants: [
      { title: 'La galerie', depuis: '0.38.2', note: 'On creuse de notre ligne vers la leur (six mètres par seconde dans la maquette, un mètre à l\'heure dans la vie) : la galerie se dessine en pointillés d\'os, des anneaux de bruit grossissent à sa tête, et plus on approche, plus l\'autre camp peut nous entendre : un camouflet crève alors la galerie. « Faire sauter » à tout moment : neuf 220 en carré, un cratère de dix-sept mètres, des morts. Sauter trop tôt, c\'est faire un trou dans le no man\'s land.', render: s => maquetteSapes(s, R, 'A') },
      { title: 'Le fourneau', depuis: '0.38.2', note: 'Sans galerie visible ni bruit : un point d\'os à la tête de la sape. Aucune chance d\'être entendu, aucune de savoir où l\'on en est autrement que par le papier. La mine est une surprise pour les deux camps.', render: s => maquetteSapes(s, R, 'B') },
      { title: 'Le cratère-lac', depuis: '0.38.2', note: 'Comme la galerie ; puis la nappe remonte dans le trou (l\'eau du jeu, jusqu\'à un mètre sous le sol d\'origine) : le cratère se remplit, et l\'on a fait un lac au milieu du passage. Un obstacle pour tous, pour des jours.', render: s => maquetteSapes(s, R, 'C') },
    ] },
    { id: 'gaz', title: 'Les gaz', variants: [
      { title: 'Les bouteilles (chlore, 1915)', status: 'a-trancher', depuis: '0.45.0', note: 'Le gaz tel qu\'il est venu la première fois, à Ypres le 22 avril 1915 : des bouteilles de chlore alignées sur le parapet d\'en face (5 730 ce jour-là, environ 170 tonnes sur six kilomètres), ouvertes à la main ; une nappe jaune-verte, haute de trois à quatre mètres, avance au vent à trois mètres par seconde. On voit chaque bouteille et son tuyau, les volutes en cubes translucides. Toux (la peur monte), brûlures, morts ; « Masques » divise la dose par cinq, « Reculer d\'une ligne » sort du chemin.', render: s => maquetteGaz(s, R, 'cylindres') },
      { title: 'Les obus à gaz (phosgène et ypérite)', status: 'a-trancher', depuis: '0.45.0', note: 'À partir de 1916 le gaz arrive par obus, sans vent : une salve de douze tombe sur nos lignes. Le phosgène (croix verte) fait un nuage bas, pâle, qui se dissipe vite ; l\'ypérite (croix jaune, juillet 1917) laisse des flaques brunes qui restent au sol et brûlent ceux qui y passent (des blessés, rarement des morts). Aucun avertissement : ce qu\'on gagne en vitesse, on le perd en prévenance.', render: s => maquetteGaz(s, R, 'obus') },
      { title: 'Dans les creux (une nappe qui coule)', status: 'a-trancher', depuis: '0.45.0', note: 'Plus lourd que l\'air, le gaz suit le relief : une grille de colonnes qui coulent vers le bas, comme de l\'eau, et s\'amassent dans les tranchées et les cratères, où elles restent des minutes de plus. Un homme au fond d\'un trou prend bien plus de dose que celui sur la lèvre. La tranchée devient un piège ; en vue de côté ou au ras du sol, on voit les fosses se remplir.', render: s => maquetteGaz(s, R, 'creux') },
    ] },
    { id: 'chars', title: 'Les chars d\'assaut', variants: [
      { title: 'Le Mark IV', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le losange britannique de 1917 : 8,05 m de long, 4,12 m avec ses sponsons, 28 t (« mâle » : un 6-livres par flanc ; la « femelle » n\'a que des mitrailleuses), huit hommes. La chenille fait le tour de la caisse, la poutre de décrochage est en travers du toit, la cabine dépasse. Il franchit les cratères les plus profonds du jeu (2,25 m), lentement. Le bouton « Livrée » le repeint à la façon des Mark IV pris à Cambrai en 1917 et retournés par les Allemands : gris, croix de fer sur les flancs ; il arrive alors de leur côté.', render: s => maquetteChars(s, R, 'mark4') },
      { title: 'Le Renault FT', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le char léger français de 1917 : 5 m avec sa queue, 1,74 m de large, 6,5 t, deux hommes. Le premier à tourelle tournante : elle suit l\'ennemi le plus proche et son 37 mm Puteaux lance un éclair. La queue de deux poutres l\'aide à franchir les tranchées ; il va vite (1,4 m/s) mais un cratère de plus d\'un mètre vingt l\'arrête. Peint en vert sombre avec des taches ocre, comme le camouflage de 1918.', render: s => maquetteChars(s, R, 'ft') },
      { title: 'Le Schneider CA 1', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le premier char français, en 1916 : une caisse trapue de 6 m, 13,5 t, six hommes, une proue en coin avec son éperon coupe-fils. Un 75 « de tranchée » court dépasse du flanc droit, deux Hotchkiss à l\'avant, deux coupoles. En bleu-gris. Les chenilles sont courtes sous la caisse : un cratère de 1,5 m le couche.', render: s => maquetteChars(s, R, 'schneider') },
      { title: 'Le Saint-Chamond', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le gros char français de 1917 : 8,9 m, 23 t, huit ou neuf hommes, un 75 de long tube dans la proue et quatre Hotchkiss. Sa caisse déborde très largement des chenilles : il franchit mal les trous, parce que l\'avant plonge (un cratère d\'un mètre le couche).', render: s => maquetteChars(s, R, 'stchamond') },
      { title: 'L\'A7V allemand', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le seul char allemand construit en série (une vingtaine, en 1918) : 7,34 m, 3,1 m de large, 3,3 m de haut, 31,5 t, dix-huit hommes au moins ; un 57 mm à l\'avant, six mitrailleuses (deux par flanc, deux à l\'arrière), la croix de fer sur les flancs. Il vient d\'en face, vers nos lignes : nos hommes à vingt-cinq mètres s\'affolent et ses mitrailleuses en couchent quelques-uns. Garde au sol faible : un cratère d\'un mètre l\'arrête.', render: s => maquetteChars(s, R, 'a7v') },
    ] },
    { id: 'avions', title: 'Les avions', variants: [
      { title: 'L\'œil de l\'artillerie', status: 'ancienne', depuis: '0.52.2', note: 'Non retenu (Jérôme, v0.45.0) : reste au labo. L\'avion de réglage, le rôle réel de l\'aviation de 1914 à 1918 : un Breguet 14 tourne à soixante-dix mètres au-dessus de leur tranchée et corrige le tir de nos batteries. Tant qu\'il vit, la salve de six 155 tombe près de la cible (dispersion de 6 m au lieu de 18) ; il rentre ou il tombe. Leur DCA (les éclatements sombres) le guette. Un choix de joueur : envoyer l\'appareil (et risquer l\'équipage) ou tirer à l\'aveugle. Le plus proche du jeu : il ne change aucune règle de la bataille, il resserre un nombre. Essayez la salve avec et sans l\'avion.', render: s => maquetteAvions(s, R, 'oeil') },
      { title: 'Le cirque (le Baron et les autres)', status: 'ancienne', depuis: '0.52.2', note: 'Non retenu (Jérôme, v0.45.0) : reste au labo. Le ciel disputé : trois Spad (Lt Aubry, Sgt Marchand, Cpl Vidal) contre le triplan rouge du « Baron » (un Fokker Dr.I, comme celui de Richthofen, abattu le 21 avril 1918) et deux Albatros. Ils se poursuivent, tirent des traceurs, tombent en fumée. Aucun compteur de victoires (DESIGN.md) : seuls comptent le nom du pilote, son état et le résultat : qui tient le ciel prive l\'autre de ses avions de réglage (A) et de ses mitraillages (C). Le plus spectaculaire, le plus indirect : le joueur ne dirige qu\'un ordre, « une patrouille ici ».', render: s => maquetteAvions(s, R, 'cirque') },
      { title: 'Le mitraillage', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu depuis la v0.46.0 comme un 4e bouton « Avion » : une passe en ligne sur une bande, sans les trois réponses ci-dessous. Deux appareils d\'attaque d\'en face (de type Halberstadt) arrivent à dix mètres du sol sur un régiment, mitraillent en ligne, remontent, reviennent. Trois réponses : rien ; le feu en l\'air (on tire, on reste debout : un coup au but abat l\'appareil au bout de quelques passes, mais on tombe plus) ; se jeter à terre (le tiers des pertes, aucune riposte). Le dilemme du fantassin sous l\'avion, en une posture de plus dans la fenêtre d\'ordres, comme « feu retenu ».', render: s => maquetteAvions(s, R, 'mitraillage') },
      { title: 'Les bombardiers de nuit', status: 'ancienne', depuis: '0.52.2', note: 'Non retenu (Jérôme, v0.45.0) : reste au labo. Un Gotha G.IV (bimoteur de bombardement allemand, 1917) vole la nuit sur nos lignes et cherche les lampes de l\'arrière (v0.39.0) : il lâche une chaîne de six bombes sur les lampes (5 m de précision), ou au hasard si on les éteint (36 m). Éteindre les lampes protège, mais coûte : la corvée de la nuit se travaille mal dans le noir. Les projecteurs et la DCA sont un pari : peut-être l\'abattre, mais leurs éclatements se voient. Le seul sujet qui prolonge une règle déjà en jeu (les lampes).', render: s => maquetteAvions(s, R, 'nuit') },
    ] },
  ] },
  { id: 'camp', title: 'Camp', topics: [
    { id: 'camp', title: 'Le camp et ses bâtiments', variants: [
      { title: 'Le camp en ligne', status: 'retenue', depuis: '0.84.0', note: 'Retenu (Jérôme, 27 octobre) ; pas encore dans le jeu. Les cinq bâtiments le long d\'une route, derrière la 4e ligne, dans la marge arrière du terrain actuel (840 × 640 m : aucune case de plus, voir docs/chantiers/camp-et-ameliorations.md). Le curseur des jours montre le camp qui grandit (un parcours d\'exemple : un chantier dure une nuit, il s\'élève sous un échafaudage) ; un clic sur un bâtiment ouvre son papier : ses ordres, le niveau suivant, son prix en points de dotation.', render: s => maquetteCamp(s, 'ligne') },
      { title: 'Le camp autour d\'une cour', status: 'ancienne', depuis: '0.84.0', note: 'Non retenu (Jérôme, 27 octobre) : reste au labo. Les mêmes bâtiments en U autour d\'une cour, l\'aérodrome au fond : plus ramassé en largeur (visible d\'un coup au zoom 1 ou 2), plus profond (il empiète davantage sur la marge arrière).', render: s => maquetteCamp(s, 'cour') },
      ...Object.entries(BATIMENTS).map(([cle, B]) => ({ title: B.nom, status: 'a-trancher', depuis: '0.84.0', note: `PROPOSITION. Remplace ${B.remplace} : ${B.unite}. Trois niveaux (boutons « Niveau »), le papier du bâtiment à droite : ses ordres et l\'amélioration suivante. Quatre soldats donnent l\'échelle.`, render: s => maquetteBatiment(s, cle) })),
    ] },
  ] },
  { id: 'son', title: 'Son', topics: [
    { id: 'son', title: 'Le son', variants: [
      { title: 'Les effets', status: 'actuelle', depuis: '0.76.0', note: 'En jeu (v0.75.0) : chaque son d\'événement, joué par le même module que la bataille (`js/audio.js`) : trois obus, une salve de 24, l\'avion abattu ou écrasé, le char détruit, les ponts, le cor du tronçon pris, la nuit, les trois petits sons de l\'interface. « Loin » les pose à 300 m à gauche. Cliquer une fois déverrouille le son (le navigateur le veut).', render: s => maquetteEffets(s) },
      { title: 'L\'ambiance', status: 'retenue', depuis: '0.76.0', note: 'Les sons qui ne s\'arrêtent pas : le vent (plus fort en tempête), la pluie et la neige, la fusillade (un lit de bruit et des claquements, selon le nombre de tirs), le moteur du char, celui de l\'avion (plus grave et plus fort bas), la musique lente. Les curseurs règlent ce que le jeu règle dans ses réglages.', render: s => maquetteAmbiance(s) },
      { title: 'L\'espace', status: 'retenue', depuis: '0.76.0', note: 'Un 155 tombe là où l\'on clique sur la carte : plus loin du centre de la vue il est plus faible, et il vient de son côté (jamais tout à fait muet : un gros bruit s\'entend de loin). La portée est la largeur que la vue montre (le zoom du jeu la change).', render: s => maquetteEspace(s) },
    ] },
  ] },
  { id: 'moteur', title: 'Moteur', topics: [
    { id: 'sol-fin', title: 'Le sol en cubes plus fins', variants: [
      { title: 'Cubes d\'un mètre', status: 'actuelle', depuis: '0.52.3', note: 'En jeu aux zooms 1 à 3 (Jérôme, v0.52.3 : le sol fin coûterait jusqu\'à 3,4 fois plus de triangles de loin). Le sol du jeu : une case, un cube d\'un mètre ; les pentes montent par marches d\'un mètre. Prenez le relevé de coût en bas, puis comparez avec les autres.', render: s => moteur(s, { zoom: 5, soldats: 400, cz: 185 }) },
      { title: 'Cubes d\'un demi-mètre', status: 'retenue', depuis: '0.52.3', note: 'Retenu (Jérôme, v0.52.3) : en jeu à partir de 4 pixels par mètre. Chaque case se coupe en quatre cubes dont la hauteur suit la pente (arrondie au quart de mètre) : les bosses et les bords de cratère montent par petites marches. Les couleurs se découpent aussi au demi-mètre : au bord d\'une tache d\'herbe ou de boue, un petit cube sur deux ou trois prend la couleur du voisin, du même niveau. Un mur d\'un mètre cinquante ou plus (tranchée, falaise) reste net. Jusqu\'à quatre fois plus de triangles de sol : regardez le relevé, au zoom 8 puis au zoom 3.', render: s => moteur(s, { zoom: 5, soldats: 400, cz: 185, finesse: 2 }) },
      { title: 'Un demi-mètre, après un jour de pluie', status: 'retenue', depuis: '0.52.3', note: 'Retenu (Jérôme, v0.52.3) : en jeu à partir de 4 pixels par mètre. Le même sol fin sur un champ labouré par les obus et trempé : c\'est là que la finesse se voit, sur les bords des cratères et les rigoles.', render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, pluie: true, finesse: 2 }) },
      { title: 'Un demi-mètre, vu de loin (zoom 3)', status: 'ancienne', depuis: '0.52.3', note: 'Non retenu (Jérôme, v0.52.3) : le jeu garde le mètre jusqu\'au zoom 3. Le prix du sol fin quand on le regarde de loin : plus de sol dans l\'écran, donc le coût le plus élevé. Une version du jeu ne le garderait qu\'à partir du zoom 6.', render: s => moteur(s, { zoom: 2, soldats: 400, cz: 185, finesse: 2 }) },
    ] },
    { id: 'lumiere-relief', title: 'La lumière dans le relief', variants: [
      { title: 'Le soleil du jeu', status: 'actuelle', depuis: '0.66.3', note: 'La référence : le soleil ne projette que les ombres des soldats et des arbres, le relief n\'en a pas. Même terrain, mêmes hommes, même colline (20 m de rayon, 12 m de haut, au sud-est de la vue) pour toutes les variantes suivantes ; l\'heure est figée (choisissez-la), les boutons règlent la saison et le soleil.', render: s => moteur(s, SCENE_LUMIERE({ ombres: false })) },
      { title: 'Les ombres du relief', status: 'essai', depuis: '0.66.3', note: 'Une case que le soleil ne voit pas (derrière la colline, un parapet, au fond d\'une tranchée, sous la lèvre d\'un cratère) prend la couleur de sa paroi : le ton le plus sombre de sa matière, comme l\'ombre des soldats. Aucune couleur nouvelle. Le soleil fait encore son arc du jeu (levant, sud, couchant).', render: s => moteur(s, SCENE_LUMIERE({ ombres: true, heure: 8 })) },
      { title: 'Le soleil sur un côté', status: 'essai', depuis: '0.66.3', note: '(Jérôme, v0.66.3 : « le soleil doit toujours être sur un côté du terrain ; les ombres s\'étirent vers la gauche ou vers la droite ».) Le soleil à gauche de l\'écran : toute la journée l\'ombre part vers la droite, un peu vers nous, longue le matin et le soir, courte à midi. Les boutons Soleil à gauche / à droite, et l\'heure : regardez l\'ombre de la colline s\'étirer.', render: s => moteur(s, SCENE_LUMIERE({ ombres: true, heure: 9, azimut: 'Soleil à gauche' })) },
      { title: 'Le soleil sur un côté, parois selon le soleil', status: 'essai', depuis: '0.66.3', note: 'Le soleil à gauche, et les parois d\'un demi-mètre ou plus claires ou sombres selon qu\'elles regardent le soleil : les flancs tournés vers la gauche sont éclairés, ceux tournés vers la droite et vers nous sont à l\'ombre (la lumière du jeu d\'avant, mais qui suit le côté choisi). La nuit, celle du jeu.', render: s => moteur(s, SCENE_LUMIERE({ ombres: true, heure: 9, azimut: 'Soleil à gauche', parois: true })) },
      { title: 'Sous les obus', status: 'essai', depuis: '0.66.3', note: 'Les ombres du relief, le soleil à gauche, et un barrage toutes les 3,5 s : les cratères neufs se creusent et leurs ombres suivent, sans retarder l\'image.', render: s => moteur(s, { ...SCENE_LUMIERE({ ombres: true, heure: 9, azimut: 'Soleil à gauche' }), barrages: true }) },
    ] },
    { id: 'journee-saison', title: 'Une journée en dix secondes', variants: [
      { title: 'Automne', status: 'essai', depuis: '0.66.3', note: 'La bataille tourne en accéléré (un jour de jeu en 10 s, trente jours) sur le terrain du labo, avec la colline : le soleil se lève à gauche et se couche à droite, l\'ombre de la colline passe de la droite à la gauche en vous regardant, les ombres du relief, les parois selon le soleil et les ombres de nuages. Le temps de chaque jour vient de la chaîne de la bataille : un jour de pluie ou de brouillard n\'a ni ombres ni plaques de nuages. « Le temps passe » relance la journée, une heure du jour la fige.', render: s => moteur(s, SCENE_JOURNEE('automne')) },
      { title: 'Hiver', status: 'essai', depuis: '0.66.3', note: 'La même journée de dix secondes en hiver : le soleil est bas (0,5 rad au plus haut), les ombres restent longues à midi, le sol est blanc.', render: s => moteur(s, SCENE_JOURNEE('hiver')) },
      { title: 'Été', status: 'essai', depuis: '0.66.3', note: 'La même journée de dix secondes en été : le soleil monte haut (1,2 rad), les ombres de midi sont courtes, peu de plaques de nuages par forte chaleur.', render: s => moteur(s, SCENE_JOURNEE('ete')) },
    ] },
    { id: 'cratere-forme', title: 'Des cratères moins carrés', variants: [
      { title: 'Le motif carré (avant la v0.52.5)', status: 'ancienne', depuis: '0.52.5', note: "Jusqu'à la v0.52.4 : une matrice de 3×3, 5×5 ou 7×7 cases en quarts de mètre, au centre de la case, et une lèvre en anneau carré autour (une case sur quatre sautée, jamais les coins). Le champ : trois obus isolés au milieu (75, 155, 220) et quarante-cinq au hasard, les mêmes dans toutes les variantes. Les deux boutons montrent le sol fin (6 pixels par mètre) et le mètre (3 pixels par mètre). Coût mesuré (Node, 10 000 obus, puis le labo en rendu logiciel) : impact() 1,5 à 2,8 µs ; 18, 40 et 66 cases touchées (75, 155, 220) ; sol 125 000 triangles au sol fin, 94 000 au mètre.", render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, finesse: 2, cratere: 'actuel' }) },
      { title: 'Un motif rond', status: 'ancienne', depuis: '0.52.5', note: "Non retenu (Jérôme, v0.52.5) : reste au labo. Un disque à la place de la matrice, pris au point exact de l'obus (au décimètre, pas au mètre) : profondeur p·(1 − (d/R)²) calculée en quatre points par case, donc des bords en pente au lieu de gradins. Le rayon est choisi pour creuser le même volume que la matrice ; la profondeur au centre est celle du calibre (le plancher et la dureté s'appliquent comme avant) et varie de 0 à 10 % avec le numéro de l'impact. La lèvre suit le disque (anneau rond, même épaisseur partout). Rayon de tir et létalité inchangés. Coût mesuré : impact() 7 à 10 µs (+5 à 7 µs : quatre points par case) ; 17, 45 et 56 cases ; volume creusé 94 à 96 % de la matrice ; sol 121 000 triangles au sol fin, 91 000 au mètre (−3 %).", render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, finesse: 2, cratere: 'rond' }) },
      { title: "Une lèvre jetée d'un côté", status: 'ancienne', depuis: '0.52.5', note: "Non retenu (Jérôme, v0.52.5) : reste au labo. Le motif carré d'avant, mais la terre jetée forme un anneau rond, plus large (de 0 à 2,2 m du bord), plus épais d'un côté (le côté est tiré du numéro de l'impact, trois fois plus épais que l'autre) et interrompu par endroits ; aucun coin. Le même volume de terre jetée en moyenne : seule sa place change. Coût mesuré : impact() 5 à 9 µs ; 16, 43 et 68 cases ; terre jetée −10 à −15 % ; sol 121 000 / 92 000 triangles.", render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, finesse: 2, cratere: 'levre' }) },
      { title: 'Des éclats autour', status: 'ancienne', depuis: '0.52.5', note: "Non retenu (Jérôme, v0.52.5) : reste au labo. Le motif carré et la lèvre carrée d'avant, plus de petits creux et monticules d'un quart de mètre sur deux à trois anneaux autour : 4 pour un 75, 8 pour un 155, 14 pour un 220, à des angles et des distances tirés du numéro de l'impact. Sans aucune autre forme, le contour reste carré : à voir surtout avec les autres. Coût mesuré : impact() 2 à 3 µs (inchangé) ; 22, 48 et 79 cases (+20 % de cases à refaire) ; sol 125 000 / 93 000 triangles.", render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, finesse: 2, cratere: 'eclats' }) },
      { title: 'Un cratère ovale', status: 'ancienne', depuis: '0.52.5', note: "Non retenu (Jérôme, v0.52.5) : reste au labo. Un disque étiré (grand axe × 1,25, petit axe ÷ 1,25 : la même aire) et tourné au hasard du numéro de l'impact, avec sa lèvre ovale. Les cratères ne sont plus tous des copies les uns des autres ; coût de la logique identique au disque. Coût mesuré : impact() 6 à 11 µs ; 16, 45 et 56 cases ; volume creusé 88 à 100 % ; sol 121 000 / 91 000 triangles.", render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, finesse: 2, cratere: 'ovale' }) },
      { title: 'Rond, lèvre jetée et éclats', status: 'retenue', depuis: '0.52.5', note: "Retenu (Jérôme, v0.52.5), en jeu : le disque, sa lèvre jetée d'un côté, plus les éclats : tout ce qui précède sauf l'ovale. Le plus lourd pour la logique (voir le relevé) et pour le dessin : plus de cases changent, plus de morceaux de sol à refaire. Coût mesuré : impact() 6 à 13 µs ; 20, 51 et 68 cases ; sol 122 000 / 92 000 triangles. Une salve de 24 obus de 75 coûte 0,15 ms de plus : rien à l'échelle d'un pas.", render: s => moteur(s, { zoom: 4, soldats: 400, cz: 185, finesse: 2, cratere: 'tout' }) },
    ] },
    { id: 'arbres-varies', title: 'Des arbres plus variés', variants: [
      { title: 'Les arbres d\'avant', status: 'ancienne', depuis: '0.52.6', note: 'Remplacé (Jérôme, v0.53.1) : reste au labo. Le jeu : un tronc de 6 à 9 m, quatre branches nues d\'une boîte chacune, tous pareils, nus en toute saison ; de loin ou aux zooms 1 et 2, le tronc seul. Au coin le plus boisé du secteur, 6 pixels par mètre. Le relevé du bas compte les triangles des arbres seuls (`arbres`) et le tri à chaque image. Mesuré au labo (200 soldats, rendu logiciel) : arbres 7 600 triangles à 4 pixels par mètre, 2 700 à 8, 2 100 à 16 ; tri 0,2 ms.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: null }) },
      { title: 'Six formes, sans feuilles', status: 'ancienne', depuis: '0.52.6', note: 'Non retenu seul (Jérôme, v0.53.1) : les formes sont en jeu avec leurs feuilles. Six familles tirées du hachage de la position (le terrain et la graine du monde ne changent pas) : le droit (30 %), le penché (18 %), le double tronc (14 %), le mort brisé par les obus (10 % : sommet cassé, branches qui pendent), le jeune (16 %, petit et fin), le grand (12 %). La hauteur suit toujours `v` et varie de -10 à +14 %, la largeur de ±10 %, le sens se tire aussi. Toujours nus : on ne juge ici que la silhouette. Arbres : 7 300 / 2 500 / 2 000 triangles à 4, 8 et 16 pixels par mètre (autant qu\'avant), tri 0,05 à 0,12 ms (un seul passage sur les arbres au lieu de seize).', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: { feuilles: false }, saison: 'automne' }) },
      { title: 'Été feuillu', status: 'retenue', depuis: '0.52.6', note: 'Retenu (Jérôme, v0.53.1), en jeu. Les six formes avec des touffes de feuilles, vertes (`v` dessus, `w` flancs, `s` pour la touffe sombre) : des boîtes aux bouts des branches et au sommet. Seulement à partir de 4 pixels par mètre et de près (le tronc seul aux zooms 1 à 3 et de loin, comme avant). Le mort ne porte jamais de feuilles. Les boutons du bas changent de saison à chaud. Arbres : 12 900 / 4 400 / 3 500 triangles à 4, 8 et 16 pixels par mètre (+70 % contre les arbres d\'avant ; la scène +9 % à 4, +9 % à 8) ; dessin dans le bruit de la mesure.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: { feuilles: true }, saison: 'ete' }) },
      { title: 'Automne, un arbre sur trois dégarni', status: 'retenue', depuis: '0.52.6', note: 'Retenu (Jérôme, v0.53.1), en jeu. Les feuilles de l\'automne en glaise et en herbe morte (`g`, `h`, flancs en boue `b`) ; un arbre sur trois (hachage) ne garde que la moitié de ses touffes. La saison par défaut du jeu. Arbres : 11 500 / 4 000 / 3 100 triangles à 4, 8 et 16 pixels par mètre.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: { feuilles: true }, saison: 'automne' }) },
      { title: 'Automne qui se dégarnit jour après jour', status: 'ancienne', depuis: '0.52.6', note: 'Non retenu (Jérôme, v0.53.1) : reste au labo. Comme la précédente, mais la part des arbres dégarnis puis nus grandit au fil des jours de la bataille (`horloge.jour`) : au jour 1 un tiers des arbres sont dégarnis, au dernier tous sont nus. Les boutons « Jour » du bas passent d\'un jour à l\'autre. Une règle de dessin seulement : rien n\'est sauvegardé, tout vient du jour et du hachage. Essayez les jours 1, 4, 7 et 10 d\'une bataille de dix jours.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: { feuilles: true, chute: true }, saison: 'automne', jours: 10 }) },
      { title: 'Hiver : nus, puis de la neige', status: 'retenue', depuis: '0.52.6', note: 'Retenu (Jérôme, v0.53.1), en jeu. En hiver les arbres sont nus (les formes seules) ; les jours de neige (`horloge.neige`), de petites coiffes d\'os (`o`) se posent sur les bouts de branches et sur le sommet des troncs, flancs en brume (`r`). Essayez « Hiver » puis « Hiver · neige ». Le mort garde une coiffe sur son éclat. Arbres sous la neige : 12 600 / 4 500 / 3 600 triangles ; nus (hiver sans neige) : ceux de la variante « Six formes ».', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: { feuilles: true }, saison: 'neige' }) },
      { title: 'Printemps (une teinte, sans règle)', status: 'ancienne', depuis: '0.52.6', note: 'Non retenu (Jérôme, v0.53.1) : reste au labo, sans règle. Pas une saison du jeu (Jérôme, v0.52.6 : pas de printemps dans `SAISONS`) : seulement une teinte du feuillage, pour voir. Des touffes plus petites et clairsemées (60 %, 40 % sur un arbre sur deux), vertes sur des flancs d\'herbe morte. Le sol et la météo restent ceux de l\'automne.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesArbres: true, arbres: { feuilles: true }, saison: 'printemps' }) },
      { title: 'Abattus : souche éclatée et tronc long', status: 'retenue', depuis: '0.52.6', note: 'Retenu (Jérôme, v0.53.1), en jeu. Un arbre abattu par un obus : une souche aux éclats, un tronc couché de 4,6 m (de 3,9 à 5,3 m selon l\'arbre) dans un sens tiré de la position, deux branches cassées. Du bois sombre, jamais de feuilles ; le feu reste à la souche. Des obus de 75 tombent sur les arbres ; l\'abattu d\'avant (une souche et un bâton dressé) est dans la première variante.', render: s => moteur(s, { zoom: 5, soldats: 200, cz: 150, versLesArbres: true, barrages: true, surLesArbres: true, arbres: { feuilles: true, abattus: 'longs' }, saison: 'automne' }) },
    ] },
    { id: 'grades', title: 'Les grades se voient', variants: [
      { title: 'Avant : tous pareils', status: 'ancienne', depuis: '0.68.0', note: 'Remplacé (Jérôme, v0.69.0), reste au labo. Le jeu d\'avant : capitaine, sergent et soldat ont la même silhouette ; le grade ne se lit que sur la fiche. Les boutons du bas mènent à un capitaine, de chaque camp. La parade range deux régiments face à face, le commandement au milieu du premier rang (`placesCommandement`) : le jeu, lui, place encore le capitaine au bout du rang, c\'est une proposition à part (docs/pistes-avancees.md, piste 7).', render: s => moteur(s, { zoom: 5, soldats: 600, parade: true, grades: null }) },
      { title: 'Le fanion', status: 'ancienne', depuis: '0.68.0', note: 'La silhouette d\'abord : se lit de loin. Le capitaine porte un fanion de commandement (deux bandes, os sur terre, à 3,5 m) qui dépasse de la troupe, la capote longue, le képi, l\'arme de poing à la place du fusil (plus de baïonnette qui dépasse du rang), trois galons aux manchettes, un corps de 6 % plus haut. Le lieutenant (et le sous-lieutenant) : képi, capote longue, pistolet, deux galons. Le sergent (et l\'adjudant) : un baudrier sombre en travers de la poitrine, deux chevrons. Le caporal : un brassard. Aux zooms 1 et 2 : le capitaine est un point de 4 pixels, le lieutenant de 3.', render: s => moteur(s, { zoom: 5, soldats: 600, grades: 'fanion' }) },
      { title: 'Les jumelles et la carte', status: 'ancienne', depuis: '0.68.0', note: 'Les accessoires de commandement : pas de mât, la troupe garde sa ligne. Le capitaine : képi, capote longue, jumelles sur la poitrine, étui de carte à la ceinture, pistolet, trois galons, 4 % plus haut. Le lieutenant : képi, étui de carte, pistolet, deux galons. Le sergent : baudrier et un chevron ; le caporal : brassard. Se lit à partir de 6 pixels par mètre ; de loin, la capote et le képi du capitaine.', render: s => moteur(s, { zoom: 5, soldats: 600, grades: 'jumelles' }) },
      { title: 'Le képi et les galons', status: 'retenue', depuis: '0.68.0', note: 'Retenu (Jérôme, v0.69.0), en jeu, avec un petit C d\'os sur fond de terre au-dessus du capitaine (il ne tourne pas avec lui). L\'uniforme seul, le plus discret : le képi, les galons aux manchettes, les épaulettes. Le capitaine : capote longue, trois galons, 10 % plus haut ; le lieutenant : képi, deux galons ; le sergent : deux chevrons et des épaulettes ; le caporal : un chevron. Aucun accessoire : les petits signes ne se lisent que de près (12 et 16 pixels par mètre), de loin on voit le képi, la capote et la taille.', render: s => moteur(s, { zoom: 5, soldats: 600, grades: 'galons' }) },
    ] },
    { id: 'buissons-varies', title: 'Des buissons plus variés', variants: [
      { title: 'Les buissons d\'avant', status: 'ancienne', depuis: '0.62.0', note: 'Remplacé (Jérôme, v0.63.0) : reste au labo. Le jeu d\'avant : deux ou trois boîtes basses, dessus glaise (`g`) et flancs boue (`b`), trois tailles, tous pareils en toute saison ; aucun buisson aux zooms 1 et 2. Au coin le plus fourni du secteur ; les boutons du bas changent de saison.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesBuissons: true, saison: 'automne' }) },
      { title: 'Sept formes, l\'été', status: 'retenue', depuis: '0.62.0', note: 'Retenu (Jérôme, v0.63.0), en jeu. Sept formes tirées du hachage de la position (le terrain et la graine du monde ne changent pas) : rond (30 %), étalé (20), haut et mince (14), en touffes (14), ajonc hérissé (10), ronces rampantes (6) et l\'épineux brisé, penché (6) ; une rotation de 0, 90, 180 ou 270° et une taille tirées aussi. Feuillage vert (`v` dessus, `w` et `s` flancs) et de petits cubes de fleurs claires (`o`) sur le dessus.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesBuissons: true, buissons: true, saison: 'ete' }) },
      { title: 'Sept formes, l\'automne', status: 'retenue', depuis: '0.62.0', note: 'Retenu sans les baies (Jérôme, v0.63.0), en jeu. Les mêmes formes dans les teintes des arbres d\'automne (orange, ocre, rouille), des flancs bruns (exception de palette déclarée avec les feuilles d\'arbre, v0.59.2). Les baies sombres du premier essai sont retirées.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesBuissons: true, buissons: true, saison: 'automne' }) },
      { title: 'Hiver : branches nues, puis neige', status: 'retenue', depuis: '0.62.0', note: 'En hiver les buissons sont nus (des boîtes plus fines et plus basses, boue et terre sombre) ; un jour de neige (bouton « Neige »), le dessus devient os (`o`). Ni fleurs ni baies.', render: s => moteur(s, { zoom: 4, soldats: 200, cz: 150, versLesBuissons: true, buissons: true, saison: 'hiver' }) },
      { title: 'Sept formes, de plus près', status: 'retenue', depuis: '0.62.0', note: 'Les mêmes formes à 8 pixels par mètre, l\'été : pour juger les silhouettes et les cubes de fleurs.', render: s => moteur(s, { zoom: 5, soldats: 120, cz: 150, versLesBuissons: true, buissons: true, saison: 'ete' }) },
    ] },
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
      { title: 'Le jeu tel qu\'il est', status: 'actuelle', depuis: '0.32.3', note: 'Un vrai obus de la logique sur un régiment en marche (zoom 8 pixels par mètre, choisissez le calibre, « Tirer un obus »). Les morts sont jetés à l\'opposé (v0.24.0), les survivants du souffle reçoivent une poussée (v0.16.0) mais ne sautent plus (retiré en v0.32.3 : soit projection, soit ralentissement, pas de saut) : rien ne ralentit ceux qui sont près. Le cercle plein est le rayon mortel, le pointillé la zone du souffle (1,8 rayon).', render: s => maquetteProjections(s, R, 'A') },
      { title: 'Projetés en arc', depuis: '0.32.0', note: 'Tous ceux du souffle (le rayon du calibre) partent en l\'air à l\'opposé du point de chute, en arc, aussi loin qu\'ils étaient près ; en retombant, les plus proches sont tués, les autres blessés (ils restent tapis). Ceux de l\'anneau (jusqu\'à 1,8 rayon) sont ralentis au même instant, plus ou moins selon la distance, puis reprennent leur pas tous ensemble en deux secondes et demie : pas de vague.', render: s => maquetteProjections(s, R, 'B') },
      { title: 'Fauchés au ras du sol', depuis: '0.32.0', note: 'Le souffle est un peu plus large et rase la terre : un vol bas, rapide, plus long (une demi-seconde). Ceux de l\'anneau sont sonnés : ils s\'arrêtent net, se tapissent un instant (d\'autant plus longtemps qu\'ils sont près), puis repartent. Le plus brutal, le plus lisible de loin.', render: s => maquetteProjections(s, R, 'C') },
      { title: 'Soulevés, retombent près', depuis: '0.32.0', note: 'Le souffle les soulève presque à la verticale (un vol de plus d\'une seconde, très haut) et ils retombent près d\'où ils étaient, à peine plus loin. Ceux de l\'anneau marchent au ralenti, d\'un pas égal pendant deux secondes et demie, puis le reprennent d\'un coup : la poussière, la terre qui retombe.', render: s => maquetteProjections(s, R, 'D') },
    ] },
    { id: 'visee', title: 'Visée d\'un obus', variants: [
      { title: 'Des cibles concentriques', status: 'retenue', depuis: '0.32.3', note: 'En jeu depuis la v0.32.3 (Jérôme : « D ») : quand on vise un barrage, le souffle du calibre est une zone assombrie (un mélange de terre et de sol, hors palette comme les ombres), avec deux anneaux pointillés à deux tiers et à un tiers du rayon : plus on est près du centre, plus on tue. Dit l\'étendue ET la gravité. Passez le pointeur sur le champ : un quatrième cercle le suit, du calibre choisi.', render: s => maquetteVisee(s, R, 'A') },
      { title: 'Un trait', depuis: '0.32.0', note: 'Un cercle plein d\'un trait d\'os (ombré de terre pour se lire sur l\'herbe comme sur la boue), du rayon du souffle de chaque calibre, un point au centre. Le plus sobre.', render: s => maquetteVisee(s, R, 'B') },
      { title: 'Des tirets qui tournent', depuis: '0.32.0', note: 'Le même cercle en tirets, qui tournent doucement : on voit tout de suite que c\'est une visée, pas un tracé du terrain.', render: s => maquetteVisee(s, R, 'C') },
      { title: 'Des repères au bord', depuis: '0.32.0', note: 'Un cercle fin, quatre repères au bord (nord, est, sud, ouest) et le rayon écrit en mètres sous le cercle : on lit la taille sans comparer aux hommes.', render: s => maquetteVisee(s, R, 'D') },
      { title: 'Le carré du jeu', status: 'ancienne', depuis: '0.32.3', note: 'Avant la v0.32.3 : le curseur en croix, puis un petit carré à l\'endroit visé pendant deux secondes. Rien ne disait le rayon de l\'obus. Les trois cercles de cette vue sont donc des carrés, un par calibre (75, 155, 220 mm).', render: s => maquetteVisee(s, R, 'E') },
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
afficherVersion();
