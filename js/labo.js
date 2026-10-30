// Le Labo (section 16) : il MONTRE et compare, il ne modifie rien.
// Chaque sujet utilise les mêmes modules que le jeu (terrain, apparence,
// rendu three.js) : ce qu'on voit ici est ce que le jeu dessinera. Ajouter un
// sujet ou une variante = ajouter une entrée dans GROUPES.
import { afficherVersion } from './version-tag.js?v=0.99.0';
import { mountLabo } from './lib/labo-shell.js?v=0.99.0';
import { spriteCanvas, paletteToGPL, paletteToHex } from './lib/sprites.js?v=0.99.0';
import { PALETTE, ROLES } from './palette.js?v=0.99.0';
import { chargerContenu } from './design-store.js?v=0.99.0';
import { tuile, ETAT } from './tuiles.js?v=0.99.0';
import { creerTerrain, impact, hydroLignes, toucher } from './terrain.js?v=0.99.0';
import { FORMES } from './cratere.js?v=0.99.0';
import { CALIBRES } from './data/calibres.js?v=0.99.0';
import { METEO } from './data/meteo.js?v=0.99.0';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, mourir, regarderAu, aube, horloge, ticksParJour, rangDe } from './bataille.js?v=0.99.0';
import { AZIMUTS, COTES } from './data/soleil.js?v=0.99.0';
import { creerRendu, ZOOMS } from './rendu3d.js?v=0.99.0';
import { placesCommandement } from './army.js?v=0.99.0';
import { hash2 } from './lib/rng.js?v=0.99.0';
import { reglerVerdure } from './apparence.js?v=0.99.0';
import { maquetteChars } from './labo-chars.js?v=0.99.0';
import { fondations, boutons, fenetres, revision } from './labo-design-system.js?v=0.99.0';
import { gainTampon, gainCachets, gainFil, gainBordereau, victoireFanion, victoireTampon, victoireChevrons, victoireAube, ficheDeuxColonnes, ficheEtages, ficheRegistre, ficheDAbord } from './labo-recompenses.js?v=0.99.0';
import { maquetteBatiment, maquetteCamp } from './labo-batiments.js?v=0.99.0';
import { BATIMENTS } from './data/batiments.js?v=0.99.0';
import { JOURNAL } from './labo-journal.js?v=0.99.0';
import { loadVersion } from './lib/app-update.js?v=0.99.0';
import { maquetteEffets, maquetteAmbiance, maquetteEspace } from './labo-son.js?v=0.99.0';
import { calqueMoral } from './labo-moral.js?v=0.99.0';
import { maquetteTranchees, NOTES_TRANCHEES, NOMS_TRANCHEES } from './labo-tranchees.js?v=0.99.0';

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

function moteur(stage, { zoom = 3, pluie = false, gel = false, soldats = 600, cz = 185, camera = null, respiration = undefined, soldat = undefined, cadavre = undefined, morts = 0, effets = undefined, barrages = false, surLesArbres = false, vue = null, verdure = undefined, nuit = null, tombee = false, calque = null, bord = null, centre = null, finesse = 1, biseau = false, cratere = null, arbres = undefined, saison = null, jours = undefined, versLesArbres = false, buissons = undefined, versLesBuissons = false, lumiere = null, colline = null, journee = null, grades = undefined, parade = false } = {}) {
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
    rendu.biseau = biseau;
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

// une journée en dix secondes, par saison (Jérôme, v0.66.3) : la vraie bataille tourne (un jour de jeu de 360 s en 10 s), le soleil se lève d'un côté et se couche de l'autre, les ombres de nuages dérivent, un ciel couvert efface les ombres

const GROUPES = [
  { id: 'references', title: 'Références', topics: [
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
    { id: 'champ', title: 'Champ de bataille', variants: [
      { title: 'Zoom 4', note: 'Le rendu du jeu : quatre de nos régiments avancent ; à 4 pixels par mètre, chaque soldat est une silhouette allégée (jambes, corps, bras, tête, fusil) et son ombre ; l\'équipement n\'apparaît qu\'à partir de 6.', status: 'actuelle', render: s => moteur(s, { zoom: 3 }) },
      { title: 'Zoom 1', note: 'Tout le champ : chaque soldat n\'est plus qu\'un point (sa couleur sur son ombre) ; le sol garde le même relief qu\'au zoom 4 (depuis la v0.12.0).', render: s => moteur(s, { zoom: 0 }) },
      { title: 'Après un jour de pluie', note: 'Quatre-vingt-dix obus et vingt-quatre heures de pluie : la boue dans les creux, l\'eau dans les trous.', render: s => moteur(s, { zoom: 3, pluie: true }) },
      { title: 'Le gel', note: 'Le même champ, gelé : l\'eau devient de la glace, la boue porte.', render: s => moteur(s, { zoom: 3, gel: true }) },
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
    { id: 'ds-fondations', title: 'Fondations', variants: [
      { title: 'Typographie', status: 'actuelle', depuis: '0.98.0', note: 'La police et les quatre tailles, lues dans le `:root` de css/style.css (docs/design-system.md).', render: s => { fondations(s, 'typo'); } },
      { title: 'Espaces, hauteurs, traits', status: 'actuelle', depuis: '0.98.0', note: 'L\'échelle d\'espacement (multiples de 4), la cible d\'un bouton, le trait, l\'ombre d\'un cran.', render: s => { fondations(s, 'espaces'); } },
      { title: 'Couleurs de l\'interface', status: 'actuelle', depuis: '0.98.0', note: 'Les neuf rôles `--jeu-*` et leur contraste sur la terre et sur l\'os.', render: s => { fondations(s, 'couleurs'); } },
    ] },
    { id: 'ds-boutons', title: 'Boutons', variants: [
      { title: 'Les familles et leurs états', status: 'actuelle', depuis: '0.98.0', note: 'Repos, survol, focus clavier, choisi, refusé, refusé au survol : les vraies feuilles du jeu, états forcés par `.est-survol` et `.est-focus`.', render: s => { boutons(s); } },
    ] },
    { id: 'ds-revision', title: 'Révision (v2)', variants: [
      { title: 'Les titres', status: 'actuelle', depuis: '0.98.1', note: 'EN JEU depuis la v0.98.2 (Jérôme, v0.98.1 : « les titres en condensé fin et haut dans le style de Cast Iron » ; « jamais coupés »). Antonio, en attendant Cast Iron ; la fenêtre météo a pour titre « Météo », ses lignes sont des libellés.', render: s => { revision(s, 'titres'); } },
      { title: 'Les marges', status: 'actuelle', depuis: '0.98.1', note: 'EN JEU depuis la v0.98.2. Fenêtres, dialogues et boutons plus aérés : un cran de plus.', render: s => { revision(s, 'marges'); } },
      { title: 'Les boutons refusés', status: 'actuelle', depuis: '0.98.1', note: 'EN JEU depuis la v0.98.2. Hachurés, pointillés, curseur interdit, et rien ne change au survol.', render: s => { revision(s, 'refus'); } },
    ] },
    { id: 'ds-fenetres', title: 'Fenêtres, bulles et dialogues', variants: [
      { title: 'Les papiers du champ', status: 'actuelle', depuis: '0.98.0', note: 'La fenêtre d\'ordres d\'un régiment (avec son « ? ») et celle d\'un bâtiment.', render: s => { fenetres(s, 'papiers'); } },
      { title: 'L\'infobulle', status: 'actuelle', depuis: '0.98.0', note: 'La bulle unique du jeu : `data-info`, trois niveaux de texte. Les `title` sont adoptés.', render: s => { fenetres(s, 'infobulle'); } },
      { title: 'Les dialogues', status: 'actuelle', depuis: '0.98.0', note: 'La boîte de dialogue : pour décider seulement.', render: s => { fenetres(s, 'dialogue'); } },
    ] },
  ] },
  { id: 'interface', title: 'Interface', topics: [
    { id: 'moral-terrain', title: 'Le moral sur le champ', variants: [
      { title: 'Le liseré qui s\'effrite', depuis: '0.67.2', note: 'Un cadre autour des hommes. Ébranlé : des tirets orange qui marchent. En déroute : le cadre se casse en morceaux rouges qui vacillent et s\'éteignent à tour de rôle. Tient : rien (le silence dit « tout va bien »). Le plus discret ; il reprend la forme de l\'anneau et du cadre de choix, donc il se confond avec eux si le régiment est choisi.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('lisere') }) },
      { title: 'Le pennon', depuis: '0.67.2', note: 'Un mât planté au bord des hommes, toujours là : il tient droit, toile bleue déployée ; ébranlé, il penche et la toile pend à mi-mât, orange ; en déroute, il est à terre, la toile rouge en lambeaux. Reprend le fanion déchiré des tranchées. Se lit même sans couleur (droit, penché, couché), mais ajoute un objet par régiment à l\'écran.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('pennon') }) },
      { title: 'La trame', depuis: '0.67.2', note: 'Une hachure en biais sur toute l\'emprise, qui se resserre quand le régiment fléchit : espacée et orange (ébranlé), serrée et rouge avec un cadre pointillé (en déroute). C\'est la hachure de la barre de la carte, portée sur le champ. La plus lisible de loin, la plus lourde : elle couvre les hommes.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('trame') }) },
      { title: 'Les chevrons de repli', depuis: '0.67.2', note: 'L\'action plutôt que l\'état : ébranlé, un chevron orange pulse sous les hommes, vers l\'arrière ; en déroute, trois chevrons rouges coulent vers le sud. Dit où ils vont, pas ce qu\'ils sont ; invisible dès que le régiment s\'arrête.', render: s => moteur(s, { zoom: 2, cz: 185, soldats: 400, calque: calqueMoral('chevrons') }) },
    ] },
    { id: 'gain-point', title: 'Un point de dotation', variants: [
      { title: 'Le tampon', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION (Jérôme, v0.98.0 : « animation lors du gain d\'un point de dotation »). Un « +n » à double filet se plaque sur le bouton du camp, comme le tampon des papiers ; le nombre prend son rebond et le bouton s\'éclaircit une fois. Le plus bref (1,5 s), le plus proche du ton du jeu. Sans mouvement : seul le nombre change.', render: s => gainTampon(s) },
      { title: 'Les cachets', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Un petit cachet par point tombe du haut sur le bouton, l\'un après l\'autre, et le nombre monte à chaque chute : on compte les points qu\'on gagne, un par un.', render: s => gainCachets(s) },
      { title: 'Le fil des points', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Le papier de l\'aube liste d\'où viennent les points (l\'aube, les lignes tenues, une ligne prise) ; un jeton part de chaque ligne vers le bouton, en arc. On lit la cause, pas seulement la somme.', render: s => gainFil(s) },
      { title: 'Le bordereau', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Un bordereau se déplie sous le bouton, s\'écrit ligne à ligne, additionne ; la somme monte dans le bouton et le papier se replie. Le plus lisible, le plus long (3 s).', render: s => gainBordereau(s) },
    ] },
    { id: 'partie-gagnee', title: 'La partie gagnée', variants: [
      { title: 'Le fanion hissé', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION (Jérôme, v0.98.0 : « animation lors du gain de la partie »). Un mât sur la crête, la toile bleue monte d\'un cran à la fois (pas à pas, comme un fanion de tranchée) puis flotte ; le papier du résultat se pose dessous.', render: s => victoireFanion(s) },
      { title: 'Le tampon « tenu »', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Le rapport du dernier soir est posé sur le champ, un tampon « TENU » claque dessus, le papier tressaute une fois. Un geste de bureau, aucun éclat.', render: s => victoireTampon(s) },
      { title: 'Les chevrons', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Le ciel s\'éclaircit en six crans pendant que trois chevrons bleus (ceux des cartes de régiment) s\'allument un à un ; le papier du résultat se lit ensuite.', render: s => victoireChevrons(s) },
      { title: 'Le lever du jour', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Le soleil monte derrière la crête de la tranchée ; le titre s\'écrit lettre à lettre dans le ciel. Le plus calme, le plus long (4 s) : la catastrophe peinte avec calme.', render: s => victoireAube(s) },
    ] },
    { id: 'fiche-jour', title: 'La fiche de fin de journée', variants: [
      { title: 'Deux colonnes', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION (Jérôme, v0.98.0 : « plus claire, toujours développée, centrée, qui donne le nom des régiments dont l\'ordre n\'a pas été modifié ; peut-être 2 colonnes »). À gauche, le jour (ce qui s\'est passé) ; à droite, la nuit (ce qu\'on décide), avec la liste des régiments qui gardent leur ordre d\'hier. Le bouton « À l\'aube » en bas.', render: s => ficheDeuxColonnes(s) },
      { title: 'Trois étages', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Une colonne : le résultat en grands chiffres (morts des deux camps, tronçons), puis ce qui reste à décider (les ordres inchangés, la dotation, la réserve), puis le détail du jour en gris.', render: s => ficheEtages(s) },
      { title: 'Le registre', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Une ligne par régiment : son rang, ses hommes, l\'ordre de la nuit ; les ordres inchangés sont en pointillé. Le résumé du jour tient sur une ligne en haut. Le plus dense : tout se voit, rien ne se choisit d\'abord.', render: s => ficheRegistre(s) },
      { title: 'D\'abord ce qui reste à faire', status: 'a-trancher', depuis: '0.98.0', note: 'PROPOSITION. Un bandeau de terre porte la nuit, la dotation et la réserve ; en haut du papier, en grand : « 4 régiments n\'ont pas d\'ordre nouveau », leurs noms ; le coût du jour est dessous, en retrait. La hiérarchie la plus nette.', render: s => ficheDAbord(s) },
    ] },
  ] },
  { id: 'terrain', title: 'Terrain et engins', topics: [
    { id: 'tranchees', title: 'Les tranchées', variants: [
      { title: NOMS_TRANCHEES.A, status: 'actuelle', depuis: '0.88.1', note: `${NOTES_TRANCHEES.A} Trois tronçons de la première ligne : intact, légèrement détruit (six 75 et deux 155), complètement détruit (quatorze 155 et six 75) ; chacun dit son état et sa solidité (la barre du coin de l'écran, v0.84.0). Le tableau dessous donne le coût de chaque niveau et le bouton « Mesurer dans la scène » le dessin entier.`, render: s => maquetteTranchees(s, R, 'A') },
      ...['B', 'C', 'D'].map(c => ({ title: NOMS_TRANCHEES[c], status: 'retenue', depuis: '0.88.1', note: `En jeu (v0.88.1) selon le zoom. ${NOTES_TRANCHEES[c]}`, render: s => maquetteTranchees(s, R, c) })),
      { title: NOMS_TRANCHEES.E, status: 'ancienne', depuis: '0.88.1', note: NOTES_TRANCHEES.E, render: s => maquetteTranchees(s, R, 'E') },
    ] },
    { id: 'chars', title: 'Les chars d\'assaut', variants: [
      { title: 'Le Mark IV', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le losange britannique de 1917 : 8,05 m de long, 4,12 m avec ses sponsons, 28 t (« mâle » : un 6-livres par flanc ; la « femelle » n\'a que des mitrailleuses), huit hommes. La chenille fait le tour de la caisse, la poutre de décrochage est en travers du toit, la cabine dépasse. Il franchit les cratères les plus profonds du jeu (2,25 m), lentement. Le bouton « Livrée » le repeint à la façon des Mark IV pris à Cambrai en 1917 et retournés par les Allemands : gris, croix de fer sur les flancs ; il arrive alors de leur côté.', render: s => maquetteChars(s, R, 'mark4') },
      { title: 'Le Renault FT', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le char léger français de 1917 : 5 m avec sa queue, 1,74 m de large, 6,5 t, deux hommes. Le premier à tourelle tournante : elle suit l\'ennemi le plus proche et son 37 mm Puteaux lance un éclair. La queue de deux poutres l\'aide à franchir les tranchées ; il va vite (1,4 m/s) mais un cratère de plus d\'un mètre vingt l\'arrête. Peint en vert sombre avec des taches ocre, comme le camouflage de 1918.', render: s => maquetteChars(s, R, 'ft') },
      { title: 'Le Schneider CA 1', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le premier char français, en 1916 : une caisse trapue de 6 m, 13,5 t, six hommes, une proue en coin avec son éperon coupe-fils. Un 75 « de tranchée » court dépasse du flanc droit, deux Hotchkiss à l\'avant, deux coupoles. En bleu-gris. Les chenilles sont courtes sous la caisse : un cratère de 1,5 m le couche.', render: s => maquetteChars(s, R, 'schneider') },
      { title: 'Le Saint-Chamond', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le gros char français de 1917 : 8,9 m, 23 t, huit ou neuf hommes, un 75 de long tube dans la proue et quatre Hotchkiss. Sa caisse déborde très largement des chenilles : il franchit mal les trous, parce que l\'avant plonge (un cratère d\'un mètre le couche).', render: s => maquetteChars(s, R, 'stchamond') },
      { title: 'L\'A7V allemand', status: 'retenue', depuis: '0.52.2', note: 'Retenu (Jérôme, v0.45.0) ; en jeu : le Schneider (v0.47.0), les autres engins suivent (ROADMAP). Le seul char allemand construit en série (une vingtaine, en 1918) : 7,34 m, 3,1 m de large, 3,3 m de haut, 31,5 t, dix-huit hommes au moins ; un 57 mm à l\'avant, six mitrailleuses (deux par flanc, deux à l\'arrière), la croix de fer sur les flancs. Il vient d\'en face, vers nos lignes : nos hommes à vingt-cinq mètres s\'affolent et ses mitrailleuses en couchent quelques-uns. Garde au sol faible : un cratère d\'un mètre l\'arrête.', render: s => maquetteChars(s, R, 'a7v') },
    ] },
  ] },
  { id: 'ambiance', title: 'Ambiance', topics: [
    { id: 'son', title: 'Le son', variants: [
      { title: 'Les effets', status: 'actuelle', depuis: '0.76.0', note: 'En jeu (v0.75.0) : chaque son d\'événement, joué par le même module que la bataille (`js/audio.js`) : trois obus, une salve de 24, l\'avion abattu ou écrasé, le char détruit, les ponts, le cor du tronçon pris, la nuit, les trois petits sons de l\'interface. « Loin » les pose à 300 m à gauche. Cliquer une fois déverrouille le son (le navigateur le veut).', render: s => maquetteEffets(s) },
      { title: 'L\'ambiance', status: 'retenue', depuis: '0.76.0', note: 'Les sons qui ne s\'arrêtent pas : le vent (plus fort en tempête), la pluie et la neige, la fusillade (un lit de bruit et des claquements, selon le nombre de tirs), le moteur du char, celui de l\'avion (plus grave et plus fort bas), la musique lente. Les curseurs règlent ce que le jeu règle dans ses réglages.', render: s => maquetteAmbiance(s) },
      { title: 'L\'espace', status: 'retenue', depuis: '0.76.0', note: 'Un 155 tombe là où l\'on clique sur la carte : plus loin du centre de la vue il est plus faible, et il vient de son côté (jamais tout à fait muet : un gros bruit s\'entend de loin). La portée est la largeur que la vue montre (le zoom du jeu la change).', render: s => maquetteEspace(s) },
    ] },
  ] },
  { id: 'a-construire', title: 'À construire', topics: [
    { id: 'camp', title: 'Le camp et ses bâtiments', variants: [
      { title: 'Le camp en ligne', status: 'retenue', depuis: '0.85.0', note: 'Retenu (Jérôme, 27 octobre) ; pas encore dans le jeu. Les cinq bâtiments le long d\'une route, derrière la 4e ligne, dans la marge arrière du terrain actuel (840 × 640 m : aucune case de plus, voir docs/chantiers/camp-et-ameliorations.md). Le curseur des jours montre le camp qui grandit (un parcours d\'exemple : un chantier dure une nuit, il s\'élève sous un échafaudage) ; un clic sur un bâtiment ouvre son papier : ses ordres, le niveau suivant, son prix en points de dotation.', render: s => maquetteCamp(s, 'ligne') },
      { title: 'Le camp autour d\'une cour', status: 'ancienne', depuis: '0.85.0', note: 'Non retenu (Jérôme, 27 octobre) : reste au labo. Les mêmes bâtiments en U autour d\'une cour, l\'aérodrome au fond : plus ramassé en largeur (visible d\'un coup au zoom 1 ou 2), plus profond (il empiète davantage sur la marge arrière).', render: s => maquetteCamp(s, 'cour') },
      ...Object.entries(BATIMENTS).map(([cle, B]) => ({ title: B.nom, status: 'a-trancher', depuis: '0.85.0', note: `PROPOSITION. Remplace ${B.remplace} : ${B.unite}. Trois niveaux (boutons « Niveau »), le papier du bâtiment à droite : ses ordres et l\'amélioration suivante. Quatre soldats donnent l\'échelle.`, render: s => maquetteBatiment(s, cle) })),
    ] },
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
