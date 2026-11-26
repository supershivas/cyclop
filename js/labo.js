// Le Labo (section 16) : il MONTRE et compare, il ne modifie rien.
// Chaque sujet utilise les mêmes modules que le jeu (terrain, apparence,
// rendu three.js) : ce qu'on voit ici est ce que le jeu dessinera. Ajouter un
// sujet ou une variante = ajouter une entrée dans GROUPES.
import { afficherVersion } from './version-tag.js?v=0.170.5';
import { mountLabo } from './lib/labo-shell.js?v=0.170.5';
import { spriteCanvas, paletteToGPL, paletteToHex } from './lib/sprites.js?v=0.170.5';
import { PALETTE, ROLES } from './palette.js?v=0.170.5';
import { chargerContenu } from './design-store.js?v=0.170.5';
import { tuile, ETAT } from './tuiles.js?v=0.170.5';
import { creerTerrain, impact, hydroLignes, toucher } from './terrain.js?v=0.170.5';
import { FORMES } from './cratere.js?v=0.170.5';
import { CALIBRES } from './data/calibres.js?v=0.170.5';
import { METEO } from './data/meteo.js?v=0.170.5';
import { nouvelleBataille, avancer, ordonnerMarche, ordonnerBarrage, mourir, regarderAu, aube, horloge, ticksParJour, rangDe } from './bataille.js?v=0.170.5';
import { BOUE_SOLDATS, SANG, VARIETE_SOLDATS } from './data/aspect-soldat.js?v=0.170.5';
import { AZIMUTS, COTES } from './data/soleil.js?v=0.170.5';
import { creerRendu, ZOOMS } from './rendu3d.js?v=0.170.5';
import { placesCommandement } from './army.js?v=0.170.5';
import { hash2 } from './lib/rng.js?v=0.170.5';
import { reglerVerdure } from './apparence.js?v=0.170.5';
import { maquetteChars } from './labo-chars.js?v=0.170.5';
import { maquetteEpaves } from './labo-epaves.js?v=0.170.5';
import { maquetteLargages } from './labo-largages.js?v=0.170.5';
import { maquetteCasques } from './labo-casques.js?v=0.170.5';
import { maquetteDemarches } from './labo-demarches.js?v=0.170.5';
import { fondations, boutons, unites, fenetres, revision } from './labo-design-system.js?v=0.170.5';
import { clic } from './labo-clic.js?v=0.170.5';
import { cartesSecteur } from './labo-cartes.js?v=0.170.5';
import { choixPaquets, ouverture, cartesRaretes, choixBoosters, dechirer } from './labo-cartes-soir.js?v=0.170.5';
import { patrouilleLabo } from './labo-patrouille.js?v=0.170.5';
import { EFFETS } from './rendu3d.js?v=0.170.5';
import { calqueEcussons } from './labo-ecussons.js?v=0.170.5';
import { plancheEcussons } from './labo-ecussons-armes.js?v=0.170.5';
import { gainTampon, gainCachets, gainFil, gainBordereau, victoireFanion, victoireTampon, victoireChevrons, victoireAube, ficheDeuxColonnes, ficheEtages, ficheRegistre, ficheDAbord } from './labo-recompenses.js?v=0.170.5';
import { maquetteBatiment, maquetteCamp } from './labo-batiments.js?v=0.170.5';
import { BATIMENTS } from './data/batiments.js?v=0.170.5';
import { JOURNAL } from './labo-journal.js?v=0.170.5';
import { loadVersion } from './lib/app-update.js?v=0.170.5';
import { maquetteEffets, maquetteAmbiance, maquetteEspace, maquetteBruitages } from './labo-son.js?v=0.170.5';
import { calqueMoral } from './labo-moral.js?v=0.170.5';
import { bilanRapport, bilanTuiles, bilanFrise } from './labo-donnees.js?v=0.170.5';
import { papierNuit, finDePartie } from './labo-papiers.js?v=0.170.5';
import { soiree } from './labo-soiree.js?v=0.170.5';
import { soiree2 } from './labo-soiree2.js?v=0.170.5';
import { soiree3 } from './labo-soiree3.js?v=0.170.5';
import { fichesTuiles, fichesProfil, fichesCompactes } from './labo-fiches.js?v=0.170.5';
import { fiches2 } from './labo-fiches2.js?v=0.170.5';
import { calqueEnnemis } from './labo-engins-ennemis.js?v=0.170.5';
import { maquetteTranchees, NOTES_TRANCHEES, NOMS_TRANCHEES } from './labo-tranchees.js?v=0.170.5';
import { maquetteFabrique } from './labo-fabrique.js?v=0.170.5';
import { atelierTerrain } from './labo-atelier-terrain.js?v=0.170.5';
import { entrees as encEntrees, lexiqueAZ, planche as encPlanche } from './labo-encyclopedie.js?v=0.170.5';

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
const SAISONS_ARBRES = [['ete', 'Été'], ['automne', 'Automne'], ['hiver', 'Hiver'], ['neige', 'Hiver · neige'], ['printemps', 'Printemps']];
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

function moteur(stage, { zoom = 3, pluie = false, gel = false, soldats = 600, cz = 185, camera = null, respiration = undefined, soldat = undefined, cadavre = undefined, morts = 0, effets = undefined, barrages = false, surLesArbres = false, vue = null, verdure = undefined, nuit = null, tombee = false, calque = null, bord = null, centre = null, finesse = 1, biseau = false, cratere = null, arbres = undefined, saison = null, jours = undefined, versLesArbres = false, buissons = undefined, versLesBuissons = false, lumiere = null, colline = null, journee = null, grades = undefined, parade = false, boue = null, variete = undefined, pilote = null, apres = null, demarches = undefined, suivreMarche = false } = {}) {
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
  // la boue sur les hommes (sujet « La boue sur les hommes ») : sa force, à changer à chaud
  if (boue != null) stage.append(el('p', {}, el('span', { textContent: 'Boue : ' }), ...[[0, 'Aucune'], [0.35, 'Légère'], [0.6, 'Moyenne'], [0.85, 'Forte']].map(([v, n]) => el('button', { className: 'essai', textContent: n, onclick: () => { if (rendu) rendu.boueSoldats = v; } }))));
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
    if (boue != null) rendu.boueSoldats = boue;
    if (demarches !== undefined) rendu.demarches = demarches;
    if (variete !== undefined) { rendu.varieteSoldats = variete; rendu.boueSoldats = BOUE_SOLDATS; rendu.sangSoldats = SANG.force; }      // (la variété se juge sur les soldats du jeu : sales)
    rendu.biseau = biseau;
    rendu.redimensionner();
    rendu.attacher(B);
    if (vue) rendu.placerCamera(vue.yaw, vue.tangage);       // la caméra libre du jeu
    rendu.vue.zoom = zoom; rendu.vue.cx = centre ? centre[0] : B.etat.marges.x + 200; rendu.vue.cz = centre ? centre[1] : B.etat.marges.y + cz;   // (coordonnées du secteur, plus les marges ; `centre` : celles du terrain)
    ctx.rendu = rendu; ctx.B = B;
    apres?.(stage, ctx);
    let vivant = !(grades || parade || pilote);                                      // les grades : la parade d'abord (la simulation attend), la bataille ensuite
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
      const S = { ete: ['ete', 'canicule'], automne: ['automne', 'sec'], hiver: ['hiver', 'gel'], neige: ['hiver', 'neige'], printemps: ['printemps', 'pluie'] }[cle];
      B.etat.sol.saison = S[0]; B.etat.meteo[B.etat.jour - 1] = S[1];
      rendu.saisonArbres = null;      // (le printemps est une saison du jeu depuis la v0.135.0)
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
      if (suivreMarche) { const A = B.armee; let n = 0, sx = 0, sy = 0; for (let i = 0; i < A.n; i++) if (A.camp[i] === 0 && A.vx[i] * A.vx[i] + A.vy[i] * A.vy[i] > 0.09) { n++; sx += A.x[i]; sy += A.y[i]; } if (n > 20) { rendu.vue.cx += (sx / n - rendu.vue.cx) * 0.2; rendu.vue.cz += (sy / n - rendu.vue.cz) * 0.2; } }      // (les démarches) la vue suit les hommes qui marchent
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
      if (pilote) ev = pilote(ctx, dt) ?? [];      // (v0.142.0) un prototype mène la bataille lui-même (la patrouille : la simulation est arrêtée, `vivant` faux)
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
      { title: 'Typographie', status: 'actuelle', depuis: '0.98.0', note: 'La police du texte (mono) et celle des titres (Antonio, deux graisses), les quatre tailles de texte et les trois de titre avec leur usage, lues dans le `:root` de css/style.css et de css/ds-v2.css (docs/design-system.md). À jour depuis la v0.100.0.', render: s => { fondations(s, 'typo'); } },
      { title: 'Espaces, hauteurs, traits', status: 'actuelle', depuis: '0.98.0', note: 'L\'échelle d\'espacement (multiples de 4), la cible d\'un bouton, le trait, l\'ombre d\'un cran.', render: s => { fondations(s, 'espaces'); } },
      { title: 'Couleurs de l\'interface', status: 'actuelle', depuis: '0.98.0', note: 'Les neuf rôles `--jeu-*` et leur contraste sur la terre et sur l\'os.', render: s => { fondations(s, 'couleurs'); } },
    ] },
    { id: 'ds-boutons', title: 'Boutons', variants: [
      { title: 'Les familles et leurs états', status: 'actuelle', depuis: '0.98.0', note: 'Repos, survol, focus clavier, choisi, refusé, refusé au survol : les vraies feuilles du jeu, états forcés par `.est-survol` et `.est-focus`.', render: s => { boutons(s); } },
    ] },
    { id: 'ds-clic', title: 'Le clic', variants: [
      { title: 'Le tampon', status: 'actuelle', depuis: '0.144.3', note: "A l'appui le bouton s'enfonce sur son ombre (3 px, l'ombre s'écrase), au relâchement il remonte en dépassant d'un pixel. La base des autres.", render: s => { clic(s, 'tampon'); } },
      { title: "L'onde", status: 'actuelle', depuis: '0.144.3', note: "Le tampon, plus un anneau qui part du point du clic et s'éteint dans le bouton.", render: s => { clic(s, 'onde'); } },
      { title: 'Les éclats', status: 'actuelle', depuis: '0.144.3', note: "Le tampon, plus huit petits cubes (os, glaise, terre) qui jaillissent du point du clic, retombent et s'éteignent.", render: s => { clic(s, 'eclats'); } },
      { title: "L'encrier", status: 'actuelle', depuis: '0.144.3', note: "Le tampon, plus un éclair inversé (terre sous l'os, 150 ms) et une secousse de 2 px de la planche.", render: s => { clic(s, 'encrier'); } },
      { title: 'Le tout', status: 'actuelle', depuis: '0.144.3', note: "Le tampon, l'onde, les éclats et l'éclair ensemble : le plus chargé.", render: s => { clic(s, 'tout'); } },
    ] },
    { id: 'ds-unites', title: 'Unités', variants: [
      { title: 'Les unités', status: 'actuelle', depuis: '0.110.0', note: 'Carte et étiquette de régiment, étiquette de char et de poste, batterie : le liseré de l\'armée, le survol, le choisi, l\'ordre des barres.', render: s => { unites(s); } },
    ] },
    { id: 'ds-revision', title: 'Révision (v2)', variants: [
      { title: 'Les titres', status: 'actuelle', depuis: '0.98.1', note: 'EN JEU depuis la v0.98.2 (Jérôme, v0.98.1 : « les titres en condensé fin et haut dans le style de Cast Iron » ; « jamais coupés »). Antonio, en attendant Cast Iron ; la fenêtre météo a pour titre « Météo », ses lignes sont des libellés.', render: s => { revision(s, 'titres'); } },
      { title: 'Les marges', status: 'actuelle', depuis: '0.98.1', note: 'EN JEU depuis la v0.98.2. Fenêtres, dialogues et boutons plus aérés : un cran de plus.', render: s => { revision(s, 'marges'); } },
      { title: 'Les boutons refusés', status: 'actuelle', depuis: '0.98.1', note: 'EN JEU depuis la v0.98.2. Hachurés, pointillés, curseur interdit, et rien ne change au survol.', render: s => { revision(s, 'refus'); } },
    ] },
    { id: 'encyclopedie', title: 'Encyclopédie des règles', variants: [
      { title: 'Les entrées', status: 'actuelle', depuis: '0.100.0', note: 'Chaque mot du jeu défini (le front, les hommes, le moral, les ordres, le combat, les armes lourdes, la nuit, le camp, le terrain et la météo, la bataille, l\'interface), avec sa capture. Une recherche, des catégories, des renvois.', render: s => { encEntrees(s); } },
      { title: 'Lexique A–Z', status: 'actuelle', depuis: '0.100.0', note: 'Tous les termes sur une ligne, de A à Z.', render: s => { lexiqueAZ(s); } },
      { title: 'La planche des captures', status: 'actuelle', depuis: '0.100.0', note: 'Toutes les captures du jeu (interface, unités, terrain, temps), faites par `node outils/encyclopedie.mjs` dans le vrai jeu.', render: s => { encPlanche(s); } },
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
    { id: 'signe-unites', title: 'Les unités : un seul signe', variants: [
      { title: 'A · L\'écusson', status: 'a-trancher', depuis: '0.140.0', note: 'PROPOSITION (Jérôme : « les engins ont un cercle avec barre de vie, les régiments sont complètement différents » ; d\'après une capture d\'un jeu de stratégie). Un bouclier au-dessus de chaque unité qu\'on commande (v0.140.1 : la forme et le dessin de chaque arme sont ceux retenus dans la planche D), régiment, char ou poste : la couleur dit le camp, le dessin dit l\'arme (casque, char, mitrailleuse), une barre fine dit les hommes debout (plein), blessés (hachuré), tombés (vide), les chevrons sont à droite de la barre, le numéro du régiment dans un onglet. Ébranlé : un liseré orange qui marche ; en déroute : rouge, haché ; choisi : cerclé d\'os. En bas, la même vignette par unité, sans texte (le nom vient au survol) : 46 px de large au lieu de 118. Le plus parlant ; le plus chargé des trois quand seize régiments sont à l\'écran.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEcussons('ecusson') }) },
      { title: 'B · Le jeton', status: 'a-trancher', depuis: '0.140.0', note: 'PROPOSITION. On garde le rond des engins d\'aujourd\'hui (v0.120.0) et on le donne aux régiments : le numéro au cœur, l\'arc de vie autour (blessés en pointillé), les chevrons dessus ; c\'est aussi le rond de la carte du secteur. Aucun signe nouveau à apprendre, le plus léger ; mais un régiment et un engin ne se distinguent que par un chiffre ou un dessin de 8 px.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEcussons('jeton') }) },
      { title: 'C · Le fanion', status: 'a-trancher', depuis: '0.140.0', note: 'PROPOSITION. Un fanion planté au-dessus de l\'unité : la hampe est la barre (elle se vide de haut en bas), la toile à la couleur du camp porte le numéro ou le dessin de l\'arme ; elle pend à demi quand le régiment est ébranlé, tout à fait en déroute. Le plus « 1914 », l\'état se lit sans couleur ; une barre verticale se compare moins bien d\'un régiment à l\'autre.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEcussons('fanion') }) },
      { title: 'D · Les écussons par arme : la planche', status: 'a-trancher', depuis: '0.140.1', note: 'PROPOSITION (Jérôme : « j\'aime l\'écusson, propose plusieurs idées d\'écussons pour chaque corps d\'armée »). Quatre idées pour chacune des cinq armes (infanterie, chars, mitrailleuses, avions, génie) : la même forme d\'écu pour tous avec un dessin différent, ou une forme qui dit l\'arme à elle seule (écu-casque, écu blindé et riveté, losange, écu ailé, écu crénelé). Chaque idée à sa taille sur le champ (26 px) et agrandie, intacte, entamée, choisie, en face, et en vignette. « Retenir » en garde une par arme (dans ce navigateur) : l\'ensemble en bas de page et la variante A les dessinent.', render: s => { plancheEcussons(s); } },
    ] },
    { id: 'engins-ennemis', title: 'Les engins d\'en face sur le champ', variants: [
      { title: 'Aujourd\'hui : l\'étiquette complète', status: 'actuelle', depuis: '0.115.0', note: 'La référence (v0.115.0). Un papier d\'os avec le nom, le pourcentage et une barre, comme celle de nos engins : Jérôme la trouve trop prégnante pour un engin qu\'on ne commande pas. Quatre postes d\'en face (intact, entamé, presque détruit, détruit) et quatre chars, au zoom 3 px/m ; essayez les autres zooms.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('actuelle') }) },
      { title: '1A · La barre nue', status: 'a-trancher', depuis: '0.115.0', note: 'PROPOSITION (idée 1 : une barre fine sans texte). Trois pixels de haut au-dessus de l\'engin, en kaki d\'en face, liseré de terre : l\'état se lit à sa longueur. Détruit : la barre disparaît, l\'épave parle seule. Le plus sobre ; mais un engin intact et un engin entamé à 90 % se ressemblent, et il n\'y a aucun repère pour un engin détruit hors de portée de l\'œil.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('barreNue') }) },
      { title: '1B · La barre à crans', status: 'a-trancher', depuis: '0.115.0', note: 'PROPOSITION (idée 1). La même barre en quatre crans (plus large pour un char que pour un poste) : on lit « trois quarts », « la moitié » sans mesurer. Détruit : quatre crans creux, une trace qui reste (on sait qu\'un engin était là). Un peu plus de bruit visuel que 1A, plus d\'information.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('barreCrans') }) },
      { title: '1C · La barre qui vient avec les dégâts', status: 'a-trancher', depuis: '0.115.0', note: 'PROPOSITION (idée 1 + 3). Rien tant que l\'engin est intact ; la barre apparaît dès qu\'il est touché, un trait de terre la souligne quand il est presque détruit. Le champ reste net au début de la bataille ; mais on ne repère plus un engin d\'en face sain, et un détruit ne se distingue que par son épave.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('barreSiEntame') }) },
      { title: '2A · La pastille forme', status: 'a-trancher', depuis: '0.115.0', note: 'PROPOSITION (idée 2 : une pastille qui grandit au survol). Un carré pour un char, un losange pour un poste ; plein (opérationnel), à demi (abîmé), creux et barré (détruit). Au survol elle s\'ouvre en une capsule : « Char 55 % » et sa barre. La forme dit le type sans texte, mais il faut apprendre deux formes.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('pastilleForme') }) },
      { title: '2B · La pastille jauge', status: 'a-trancher', depuis: '0.115.0', note: 'PROPOSITION (idée 2). Un rond kaki ceint d\'un arc qui se vide avec la vie (le poste porte un trait au milieu) ; détruit, un anneau pointillé barré. Au survol : il grossit et son nom s\'écrit dessous. L\'état se lit sans survol, d\'un coup d\'œil, par l\'arc ; le plus « tableau de bord » des six.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('pastilleJauge') }) },
      { title: '2C · La pastille et l\'infobulle', status: 'a-trancher', depuis: '0.115.0', note: 'PROPOSITION (idée 2). Un repère de 8 px, plein (opérationnel) ou creux (détruit), rien d\'autre. Le détail (nom, état, pourcentage) est dans l\'infobulle du jeu, au survol seulement. La plus discrète des six ; la vie d\'un engin entamé ne se lit qu\'en le survolant.', render: s => moteur(s, { zoom: 2, soldats: 400, calque: calqueEnnemis('pastilleInfobulle') }) },
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
    { id: 'cartes-secteur', title: 'Les cartes de secteur', variants: [
      { title: 'Elle glisse depuis la liste', status: 'a-trancher', depuis: '0.105.3', note: 'PROPOSITION (Jérôme, 2 nov. : « les cartes de secteur glissent sur une table »). La liste à gauche ; au clic, la carte du secteur (titre, sa vraie carte vue de haut, description, saison, niveau, durée) glisse depuis la liste et se pose de biais sur la pile. Celles du dessous ne montrent que leur onglet. Les réglages se gardent carte par carte.', render: s => cartesSecteur(s, { geste: 'glisse', R }) },
      { title: 'Elle est tirée de la pile', status: 'a-trancher', depuis: '0.105.3', note: 'PROPOSITION. La carte choisie sort de la pile par le côté, puis revient se poser dessus : le geste d\'une carte qu\'on tire d\'un paquet. Plus long (0,8 s), plus lisible quand la carte est déjà au milieu de la pile.', render: s => cartesSecteur(s, { geste: 'tire', R }) },
    ] },
    { id: 'soiree', title: 'La soirée', variants: [
      { title: 'Les trois étapes, troisième jet', status: 'retenue', depuis: '0.150.0', note: 'EN JEU depuis la v0.150.0 (Jérôme, 18 nov. : « je tranche : le troisième jet passe en jeu » ; js/hud/soiree.js, les règles dans js/camp.js et js/nuit.js). Ici avec un exemple fixe. PROPOSITION d\'origine (Jérôme, 18 nov., sur le deuxième jet ; ROADMAP « Troisième jet » ; contenu des arbres validé : docs/chantiers/soiree-arbres.md). 1 : la carte du front au centre (les quatre secteurs, nos lignes et les leurs, les tronçons pris ▲ et perdus ▼, une croix par homme tombé), la bascule « Aujourd\'hui / Depuis le début » à la place du sous-écran, la courbe des effectifs dessous ; le décompte en registre à droite (le soir rapporte +2, décision du 18 nov.) ; trois moments du jour en cartes, dont la médaille : un clic montre leur secteur sur la carte. 2 : sept onglets aux intitulés du jeu, plus de I, II, III en tête de colonne ; les nœuds sont des icônes dans des cercles, le nom au survol, la description au clic dans le panneau de droite ; le I donné puis deux pistes de quatre rangs (2, 3, 4, 5 points), un lien croisé marqué d\'un maillon ; « Annuler » rend tout ce qui a été dépensé ce soir, « Rendre » reste sur chaque nœud. 3 : « Continuer la bataille » ; l\'infobulle d\'un régiment en tableau ; les hommes en paquets de 10 traits (le reste en un paquet de 1 à 9), les blessés en paquets pointillés ; on glisse un paquet sur une autre carte (ou un clic sur lui puis sur la carte), autant qu\'on veut ; un régiment vidé devient gris, « Dissous à l\'aube », sauf si on lui rend des hommes ou qu\'on annule. Rien n\'est en jeu.', render: s => soiree3(s) },
      { title: 'Les trois étapes, deuxième jet', status: 'ancienne', depuis: '0.149.3', note: 'Remplacée par le troisième jet (Jérôme, 18 nov. : « l\'étape 1 trop vide », les nœuds en cercles, 5 niveaux, les transferts par paquets). PROPOSITION (Jérôme, 18 nov., après un brainstorm et sa maquette : « les CTA peuvent avoir une couleur hors palette… le rouge sang » ; « la hauteur doit être la même sur les trois étapes » ; « le titre dans un header en os sur fond sombre » ; « les cases d\'améliorations n\'ont pas d\'icônes, les rendre plus élégantes » ; « on peut améliorer les deux branches de chaque niveau », les choix par lignée « si cela a une logique » ; « les améliorations sont disponibles immédiatement »). L\'en-tête est une bande sombre, le titre en os, le fil d\'Ariane coché ; le corps a la même hauteur aux trois étapes ; le bouton d\'action du pied est rouge sang (hors palette). 1 : le décompte en colonne, le total sous un trait épais, trois chiffres, « À retenir » en trois tuiles, un lien discret. 2 : sept onglets (un « + » quand un achat est à portée), l\'arbre I → II → III avec ses lignées tracées (pointillé : pas encore ; plein : acquis), un pictogramme par amélioration, le coût en carrés ; à droite la caisse en jetons (hachés : dépensés ce soir), le nœud choisi, son chiffre avant → après et son seul bouton : « Améliorer », acquis tout de suite, ou « Rendre » jusqu\'à l\'aube. 3 : des cartes sans filet bleu, sans les morts du jour (ils sont à l\'étape 1), le transfert en pictogramme ⇄ −10 / +10 sur les deux cartes (un clic annule), le contact en icône. Les deux règles neuves sont simulées au labo seulement.', render: s => soiree2(s) },
      { title: 'Les trois étapes', status: 'ancienne', depuis: '0.149.3', note: 'Remplacée par le deuxième jet (Jérôme, 18 nov. : « pas mal mais il faut encore améliorer »). PROPOSITION (Jérôme, 18 nov. : « trois étapes mieux hiérarchisées, ne pas répéter les informations à chaque étape (comme les points de dotation). Étape 1 : résumé de la journée et décompte des points ; étape 2 : arbres de compétence de chaque catégorie ; étape 3 : gestion des régiments » ; « intégrer les arbres au même endroit, système Frostpunk 2 » ; l\'équipement en 7e catégorie ; glisser les cartes pour transférer). Après une recherche (XCOM 2, Into the Breach, Darkest Dungeon, Battle Brothers, Frostpunk 2, This War of Mine) : un fil d\'Ariane en tête (retour libre), en bas « ← Retour » et UN bouton principal qui dit où il mène. 1 la journée : le décompte en grand (les lignes arrivent l\'une après l\'autre), trois chiffres, « À retenir », et « La bataille jusqu\'ici » derrière un lien. 2 le camp : sept onglets, l\'arbre au centre (acquis, disponible, trop cher, verrouillé, commandé), le panneau du nœud à droite avec le seul bouton d\'achat et l\'avant → après ; les points ne sont montrés qu\'ici. 3 les régiments : une carte chacun, sa corvée en icônes ; on glisse une carte sur une autre (ou ⇄ puis un clic) : 1, 10, tous ou fusionner ; les transferts se lisent et s\'annulent sur les cartes. Tout se clique : les étapes, les onglets, les nœuds, commander, annuler, équiper, transférer. La mesure dit chaque vue.', render: s => soiree(s, 'etapes') },
      { title: 'Les onglets', status: 'ancienne', depuis: '0.149.2', note: 'Non retenue (Jérôme, 18 nov. : « je ne suis pas convaincu ; chaque fenêtre trop compliquée, les CTA peu clairs »). PROPOSITION (Jérôme, 18 nov. : « à la fin de la journée, c\'est le moment des upgrades : le décompte des points gagnés ; améliorer les bâtiments, les avions, chars ou les équipements d\'un ou plusieurs régiments » ; « un cheminement de fin de journée logique, avec la fenêtre d\'upgrade, la fenêtre d\'ordre et la fenêtre de stats/historique »). Trois onglets numérotés dans l\'en-tête : 1 le rapport (ce qui s\'est passé : la journée, le ciel, la bataille jusqu\'à ce soir, les médailles), 2 l\'état-major (ce que j\'ai : le décompte du soir, le camp en tuiles, les avions et les chars sous leur bâtiment, l\'équipement de plusieurs régiments à la fois), 3 les ordres (ce que je fais : les corvées, la relève, « Gérer les régiments »). On ouvre au rapport, on va et vient (1, 2, 3, Tab) ; une pastille sur l\'onglet 2 quand des points attendent, sur le 3 quand des régiments gardent l\'ordre d\'hier. Les points à dépenser et « À l\'aube » restent dans l\'en-tête. Un clic sur un onglet le montre ; la mesure sous le cadre dit chaque onglet.', render: s => soiree(s, 'onglets') },
      { title: 'Trois colonnes', status: 'ancienne', depuis: '0.149.2', note: 'Non retenue (Jérôme, 18 nov. : « je ne suis pas convaincu ; chaque fenêtre trop compliquée, les CTA peu clairs »). PROPOSITION. Les trois temps côte à côte, de gauche à droite, sur un papier plus large : rien ne se cache, rien ne se clique pour passer de l\'un à l\'autre. Le prix : chaque temps est resserré (les graphiques plus petits, les médailles en icônes, le camp sur deux colonnes de tuiles, les régiments sur deux rangées).', render: s => soiree(s, 'colonnes') },
      { title: 'Le défilé guidé', status: 'ancienne', depuis: '0.149.2', note: 'Non retenue (Jérôme, 18 nov. : « je ne suis pas convaincu ; chaque fenêtre trop compliquée, les CTA peu clairs »). PROPOSITION. Un temps à la fois, dans l\'ordre : « Suivant : l\'état-major → », puis « Suivant : les ordres → », puis « À l\'aube ». Le fil d\'Ariane de l\'en-tête ramène à n\'importe quel temps (le retour est libre, une étape vue est en pointillé), « À l\'aube » reste dans l\'en-tête pour qui veut passer vite. Le plus guidé : celui qui découvre le jeu suit l\'ordre. Un clic sur une étape ou sur « Suivant » la montre ; la mesure dit chaque étape.', render: s => soiree(s, 'defile') },
    ] },
    { id: 'papier-nuit', title: 'Le papier de la nuit', variants: [
      { title: 'Deux colonnes', status: 'ancienne', depuis: '0.134.0', note: 'Remplacée en jeu par la soirée en trois étapes (v0.150.0, sujet « La soirée »). Était EN JEU depuis la v0.134.0 (Jérôme, 15 nov. : retenue ; `hud/papier-nuit.js`, `hud/nuit.js`). Au départ : « la carte de nuit ne va pas du tout : jamais de barre de défilement, beaucoup d\'espace perdu, la hiérarchie n\'est pas claire »). À gauche, les deux tiers : ce qu\'il faut décider (la rangée « Tous », puis un régiment par ligne : la loupe, le nom, son état en une ligne — barre debout et blessés, le nombre debout, la jauge de moral, trois crans de vivres, les morts du jour — et ses corvées en icônes de 44 px, le nom au survol), la réserve de la relève et « Gérer les régiments ». À droite : la journée en quatre tuiles serrées (morts, effectifs, lignes, à retenir), puis les médailles en puces (un clic : la loupe). Le ciel, la lune et les avions en petites puces dans l\'en-tête, à côté de « À l\'aube ». La mesure sous le cadre : le défilement aux quatre tailles.', render: s => papierNuit(s, 'colonnes') },
      { title: 'Les étages', status: 'ancienne', depuis: '0.134.0', note: 'Non retenue (Jérôme, 15 nov.). Toute la largeur, du plus important au moins important : les ordres d\'abord (l\'état de chaque régiment s\'y étale, avec son mot : tient, ébranlé, déroute, et ses blessés), puis une seule bande pour la journée (à retenir, morts, effectifs, lignes, et les médailles en icônes seules, le détail au survol). Le plus net à lire de haut en bas ; les médailles n\'ont plus de nom à l\'écran.', render: s => papierNuit(s, 'etages') },
      { title: 'Le tableau croisé', status: 'ancienne', depuis: '0.134.0', note: 'Non retenue (Jérôme, 15 nov.). Un registre : les corvées nommées UNE fois en tête de colonne (icône et mot), puis une case par régiment ; l\'état en colonnes de chiffres (debout, blessés, moral, vivres, morts du jour). La journée en chiffres-clés dans une colonne étroite à droite, les médailles en icônes. Le plus dense, le plus « tableur » ; les barres disparaissent au profit des nombres.', render: s => papierNuit(s, 'croise') },
      { title: 'Le front', status: 'ancienne', depuis: '0.134.0', note: 'Non retenue (Jérôme, 15 nov.). Une colonne par régiment, dans l\'ordre de la rangée des cartes du bas (donc du champ, d\'ouest en est) : la loupe et le nom, l\'état, puis ses corvées en deux colonnes d\'icônes ; « Tous » en tête. La journée en bande dessous. Le papier parle comme la carte : on retrouve un régiment où il est ; mais une ligne de régiment se lit de haut en bas.', render: s => papierNuit(s, 'front') },
    ] },
    { id: 'fin-partie', title: 'La fin de partie', variants: [
      { title: 'Le rapport', status: 'retenue', depuis: '0.134.0', note: 'EN JEU depuis la v0.134.0 (Jérôme, 15 nov. : retenue ; `hud/papier-nuit.js`, `montrerFin` de main.js ; les moments : `js/moments.js`). Au départ : « la même logique que la nuit, sans les ordres, un tableau de médailles encore plus fourni, des moments clés »). L\'issue en tête (le tampon, la mission, les chiffres-clés, le mérite, les deux boutons). À gauche, la bataille entière sur un axe des jours : les vivants des deux camps en courbes, les morts de chaque jour en bâtons (nous au-dessus, en face dessous), les tronçons tenus le soir en bande, la journée la plus meurtrière marquée ; dessous, sur le même axe, la frise des moments (tronçons pris et perdus, déroutes, assauts, chars, avions, ponts, postes). À droite, les médailles en tableau : régiments, hommes et engins (« nouvelle » : les médailles proposées).', render: s => finDePartie(s, 'rapport') },
      { title: 'La frise', status: 'ancienne', depuis: '0.134.0', note: 'Non retenue (Jérôme, 15 nov.). Un calendrier : une case par jour sur toute la largeur (le temps, les morts des deux camps en bâtons, les lignes du soir, les moments en icônes) ; les médailles en trois colonnes de puces dessous, le détail au survol. Le temps se lit d\'un coup ; les médailles perdent leur détail à l\'écran.', render: s => finDePartie(s, 'frise') },
      { title: 'Le registre des jours', status: 'ancienne', depuis: '0.134.0', note: 'Non retenue (Jérôme, 15 nov.). Une ligne par jour (le temps, les morts face à face en barres, les lignes du soir, les moments en icônes), la journée la plus meurtrière soulignée ; les médailles en tableau à droite. Le plus proche d\'un registre de régiment ; pas de courbe des effectifs.', render: s => finDePartie(s, 'registre') },
    ] },
    { id: 'donnees-bilan', title: 'Les données : le bilan du soir', variants: [
      { title: 'Le rapport', status: 'ancienne', depuis: '0.117.0', note: 'Non retenu (Jérôme, 8 nov.). Le duel en haut (effectifs des deux camps en barres : plein = debout, hachuré = blessés, contour = tombés), « À retenir » (les faits marquants avec leur pictogramme), les morts de chaque jour en bâtons, la liste de nos régiments (effectif, moral, pertes du jour) et les lignes. Se lit de haut en bas, comme un rapport.', render: s => { bilanRapport(s); } },
      { title: 'Le tableau de bord', status: 'retenue', depuis: '0.117.0', note: 'EN JEU depuis la v0.124.0 (Jérôme, 8 nov. : le tableau de bord est retenu) : `hud/bilan.js`, dans le papier de la nuit. Un bandeau (le fait du jour) puis des tuiles de même poids, chacune un chiffre et un graphique : effectifs, pertes, lignes, ciel, moral, à retenir. Se lit par l\'oeil qui saute d\'une tuile à l\'autre ; le plus facile à comparer.', render: s => { bilanTuiles(s); } },
      { title: 'La frise', status: 'ancienne', depuis: '0.117.0', note: 'Non retenu (Jérôme, 8 nov.), mais ses courbes (les effectifs de chaque jour, lus dans l\'historique des soirs) sont reprises dans les fiches. La bataille entière en une courbe (les effectifs debout des deux camps, les tronçons pris et perdus en marques) ; le jour du bilan est déplié dessous. Dit l\'évolution de la bataille, pas seulement la journée ; le moins immédiat.', render: s => { bilanFrise(s); } },
    ] },
    { id: 'donnees-fiches', title: 'Les données : les fiches', variants: [
      { title: 'La bande noire, deuxième jet', status: 'retenue', depuis: '0.152.1', note: 'EN JEU depuis la v0.153.0 (Jérôme, 20 nov. : « passer en jeu ») : hud/fiche-cadre.js, fiche.js, chars.js, nids.js, l\'avion dans main.js. PROPOSITION d\'origine (Jérôme, 20 nov. : « un nouveau design mieux organisé pour les fiches des soldats, des chars, des avions, des régiments ; la carte de fin de journée pour l\'inspiration, le header en noir »). Une seule charpente pour toutes les fiches, celle de la soirée : (1) la bande noire : l\'écusson de l\'unité, son nom, qui il est en une ligne, un tampon d\'état (Tient, Inquiet, En marche, Mort pour la patrie), les icônes (vue verrouillée, fermer) ; (2) quatre chiffres clés, toujours à la même place (le gros chiffre, son mot, une petite barre) ; (3) deux colonnes de même hauteur : « Maintenant » (ce qui change sous nos yeux : jauges, l\'ordre en cours, les ordres d\'un char) et « Son parcours » (ce qui s\'accumule : la courbe soir après soir, l\'expérience, les victimes) ; (4) le pied : à gauche le lien ou l\'action secondaire, à droite UN bouton rouge sang, l\'action qui fait entrer dans l\'unité (voir par ses yeux, monter à bord, choisir le régiment). La fiche s\'ouvre à gauche, sous les boutons du haut, par-dessus le billet du temps (aujourd\'hui elle est sous lui et défile) ; le char perd ses trois rangées de gros boutons (quatre ordres en 2 × 2 dans « Maintenant », « Rentrer au parc » au pied) ; l\'avion gagne une vraie fiche (la passe, ses sorties). Les boutons en haut à droite du cadre changent de fiche (soldat, mort, régiment, char, avion). Exemple fixe (un 6e jour) ; rien n\'est en jeu.', render: s => fiches2(s) },
      { title: 'Les tuiles', status: 'ancienne', depuis: '0.119.0', note: 'Remplacée en v0.153.0 par la bande noire. EN JEU de la v0.125.0 à la v0.152.1 (Jérôme, 8 nov.) : `hud/tuiles.js`, `fiche.js`, `chars.js`, `nids.js` ; dans la fenêtre étroite d\'un char ou d\'un poste, deux colonnes de tuiles. Les fiches d\'un soldat, d\'un régiment, d\'un char et d\'une mitrailleuse dans le même langage : une tuile par sujet (un titre, un chiffre, un graphique, un mot). Large : pour une fiche qui s\'ouvre au milieu du champ.', render: s => { fichesTuiles(s); } },
      { title: 'Le profil', status: 'ancienne', depuis: '0.119.0', note: 'Non retenu (Jérôme, 8 nov.). Les mêmes blocs en rangées : le titre et le gros chiffre à gauche, les graphiques étiquetés au milieu, le mot à droite. Une seule colonne, qui se lit de haut en bas et se compare d\'une fiche à l\'autre.', render: s => { fichesProfil(s); } },
      { title: 'La compacte', status: 'ancienne', depuis: '0.119.0', note: 'Non retenu (Jérôme, 8 nov.). Les mêmes blocs à la largeur d\'une fenêtre du jeu (300 px) : une ligne titre-chiffre, le graphique dessous. La plus proche de ce que le jeu peut loger à côté du champ.', render: s => { fichesCompactes(s); } },
    ] },
    { id: 'fiche-jour', title: 'La fiche de fin de journée', variants: [
      { title: 'Deux colonnes', status: 'ancienne', depuis: '0.98.0', note: 'Remplacée par « Le papier de la nuit » (v0.134.0). PROPOSITION (Jérôme, v0.98.0 : « plus claire, toujours développée, centrée, qui donne le nom des régiments dont l\'ordre n\'a pas été modifié ; peut-être 2 colonnes »). À gauche, le jour (ce qui s\'est passé) ; à droite, la nuit (ce qu\'on décide), avec la liste des régiments qui gardent leur ordre d\'hier. Le bouton « À l\'aube » en bas.', render: s => ficheDeuxColonnes(s) },
      { title: 'Trois étages', status: 'ancienne', depuis: '0.98.0', note: 'Remplacée par « Le papier de la nuit » (v0.134.0). PROPOSITION. Une colonne : le résultat en grands chiffres (morts des deux camps, tronçons), puis ce qui reste à décider (les ordres inchangés, la dotation, la réserve), puis le détail du jour en gris.', render: s => ficheEtages(s) },
      { title: 'Le registre', status: 'ancienne', depuis: '0.98.0', note: 'Remplacée par « Le papier de la nuit » (v0.134.0). PROPOSITION. Une ligne par régiment : son rang, ses hommes, l\'ordre de la nuit ; les ordres inchangés sont en pointillé. Le résumé du jour tient sur une ligne en haut. Le plus dense : tout se voit, rien ne se choisit d\'abord.', render: s => ficheRegistre(s) },
      { title: 'D\'abord ce qui reste à faire', status: 'ancienne', depuis: '0.98.0', note: 'Remplacée par « Le papier de la nuit » (v0.134.0). PROPOSITION. Un bandeau de terre porte la nuit, la dotation et la réserve ; en haut du papier, en grand : « 4 régiments n\'ont pas d\'ordre nouveau », leurs noms ; le coût du jour est dessous, en retrait. La hiérarchie la plus nette.', render: s => ficheDAbord(s) },
    ] },
  ] },
  { id: 'terrain', title: 'Terrain et engins', topics: [
    { id: 'atelier-terrain', title: 'Atelier de terrain', variants: [
      { title: 'Heures, saisons et météo', status: 'actuelle', depuis: '0.134.9', note: 'Le rendu du jeu sur une vraie bataille, avec des curseurs : l\'heure (de 6 h à 18 h) ou la nuit, la saison, le temps qu\'il fait, le réglage « Éclairage » (bas, moyen, haut), le zoom, l\'inclinaison de la caméra (jusqu\'à l\'horizon, pour voir le ciel) et sa rotation. Le temps peut passer (un jour en une minute) et des obus tomber au centre de la vue (les éclairs, les incendies et, la nuit, les fusées).', render: s => atelierTerrain(s, R, el) },
    ] },
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
    { id: 'epaves', title: 'Les épaves', variants: [
      { title: 'Avions écrasés (SPAD)', status: 'actuelle', depuis: '0.103.0', note: 'Jérôme (1er novembre) : « un atelier de crash dans lequel on voit l\'aléatoire de la destruction ». Douze SPAD (le nôtre) à terre, chacun d\'une graine : le fuselage glisse, à plat, sur le flanc ou sur le dos, le nez plus ou moins planté ; les ailes, la queue, le moteur et les roues se détachent chacun leur tour (trois pièces libres au moins sur huit) et gisent à plat, sur la tranche ou à l\'envers, un peu enterrés ; ce qui a brûlé est noir. « Rejouer la chute » refait l\'instant où la carcasse touche. Dans le jeu : la même épave, tirée de l\'avion et de la graine de la bataille, reste sur le champ jusqu\'à la fin ; la chute creuse un cratère de 155 et trois petits de 75.', render: s => maquetteEpaves(s, R, 'spad') },
      { title: 'Avions écrasés (Albatros)', status: 'actuelle', depuis: '0.103.0', note: 'Les mêmes douze graines pour l\'Albatros D.V d\'en face : mêmes tirages, un autre avion (la croix sur le fuselage et sur les ailes).', render: s => maquetteEpaves(s, R, 'albatros') },
      { title: 'Chars détruits', status: 'actuelle', depuis: '0.103.0', note: 'Douze Schneider détruits : chenilles intactes, cassées (l\'arrière pend et traîne) ou déroulées à terre ; caisse entière, éventrée par un flanc (tôles ouvertes, intérieur noir) ou par le ventre ; coupole en place, ouverte ou arrachée ; canon droit, plié ou arraché ; suie, taches ou tout noirci ; des débris autour. Dans le jeu : chaque char détruit prend l\'épave de sa graine.', render: s => maquetteEpaves(s, R, 'char') },
    ] },
    { id: 'largages', title: 'Les largages et leurs objets', variants: [
      { title: 'Les objets', status: 'actuelle', depuis: '0.162.0', note: "En jeu (Jérôme, 23 nov. : « passe tout en jeu » ; la liste : « on oublie tous les objets qui ne sont pas un boost d'un soldat, du régiment entier, des renforts, des bombardements, un boost pour un avion, pour un char, des armes spéciales ; pas de moral, trop peu lisible ; on veut du fun ! »). Trente-cinq objets, un rang par catégorie, du plus commun au plus rare : le soldat (un par rareté, du tir ×3 au Revenant), le régiment (cartouches, clairon, grenades, le drapeau planté), les renforts (5, 10, 20, 40 hommes, un régiment frais, les taxis de la Marne : deux), les bombardements (de la salve de 75 à l'obus de 400 : quatre 220 d'un coup), les avions, les chars, les armes spéciales (cheddite, lance-flammes, crapouillot, Hotchkiss, tromblon). Six raretés (poids 50, 25, 13, 7, 4, 1 sur 100) ; le mythique brille de rouge et de rose. Un clic sur un objet donne sa fiche : ce qu'il fait, les mots du bandeau. La règle : js/largages.js ; les modèles et les nombres : js/data/largages.js.", render: s => maquetteLargages(s, 'galerie') },
      { title: 'Un objet de près', status: 'actuelle', depuis: '0.162.0', note: "Un objet à la fois, grand, qui tourne et flotte sous sa flèche, l'anneau de sa rareté au sol (il dit où est l'objet quand la flèche sort du cadre) ; c'est aussi la vue de la vitrine de l'accueil. Précédent, suivant, la première de chaque rareté ou de chaque catégorie.", render: s => maquetteLargages(s, 'pres') },
      { title: 'L\'ouverture du parachute', status: 'actuelle', depuis: '0.162.0', note: "En jeu (Jérôme, 23 nov. : « améliore l'ouverture du parachute »). Au ralenti (au quart, au dixième), la caméra de près : la chute libre, le sac fermé sur la caisse qui culbute ; l'extraction, la voile sort en fuseau étroit et long, les suspentes se tendent ; le gonflement, la coupole s'ouvre d'un coup, dépasse sa taille et revient (un ressort amorti), la caisse est freinée et balance fort ; la descente, la coupole respire et le balancement s'éteint. Au sol elle se dégonfle et glisse. La voile : huit fuseaux, os et brume, une cheminée au sommet. Les modèles du jeu (rendu/largages-modeles.js).", render: s => maquetteLargages(s, 'ouverture') },
      { title: 'Le largage', status: 'actuelle', depuis: '0.162.0', note: "En jeu : deux ou trois avions par jour (le premier entre 80 et 140 s de jeu, puis toutes les 90 à 150 s), à 55 m au-dessus du milieu du no man's land ; une seconde de chute libre, la corolle, 5 m/s ; les cinq hommes valides de chaque camp les plus proches (à moins de 160 m) courent quand la caisse n'est plus qu'à trois secondes du sol ; l'objet monte et tourne, grossi deux fois et demie ; le premier homme à 1,5 m le prend. Un objet à viser (bombardements, crapouillot) doit être ramené dans une tranchée de son camp ; son porteur tué, il tombe là et une nouvelle course s'ouvre. Ici une maquette sans le jeu (des boîtes pour les hommes) ; les boutons imposent la rareté.", render: s => maquetteLargages(s, 'largage') },
    ] },
  ] },
  { id: 'soldats', title: 'Soldats', topics: [
    { id: 'repos', title: 'Au repos dans la tranchée', variants: [
      { title: 'Le repos vivant', status: 'actuelle', depuis: '0.143.4', note: "En jeu (Jérôme, v0.143.4 ; « des mouvements simples lorsque les soldats attendent dans les tranchées : balancement du corps, de la tête, des mains qui tiennent les fusils »). Une boucle de 6 à 9 s, à phase propre à chaque homme : il respire (le buste), se balance, passe le poids d'une jambe sur l'autre, baisse et relève la tête, jette un coup d'œil d'un côté puis de l'autre (le buste tourne), rajuste sa prise (le fusil change de pente, les mains le suivent). Les amplitudes diffèrent d'un homme à l'autre. Le dessin seulement ; de près seulement (à 8 px/m ces mouvements font moins d'un pixel). Coût : celui du repos d'aujourd'hui (le même lecteur).", render: s => maquetteDemarches(s, { allures: true, repos: true, vivant: true }) },
      { title: 'La pose tenue', status: 'ancienne', note: "Le jeu d'avant la v0.143.4, de 12 px/m à 32 : au repos, chaque homme tient sa pose (le poids sur une jambe, le fusil à deux mains) sans bouger. Six hommes alignés comme au parapet, vus de trois quarts.", render: s => maquetteDemarches(s, { allures: true, repos: true, vivant: false }) },
      { title: 'Par le froid', status: 'retenue', depuis: '0.144.1', note: "En jeu (Jérôme, v0.144.1 ; le froid par gel et neige, la pluie par pluie, un guetteur sur dix en première ligne, les petits gestes pour un homme sur quatre). PROPOSITION d'abord (Jérôme, 17 nov. : « selon le temps »). Par le gel ou la neige : il tape des pieds par salves, se frotte les mains (la gauche quitte le fût pour la poignée, la droite tient le fusil), la tête rentrée, le dos rond. Dans le jeu, le temps du jour le choisirait (gel, neige) ; ici les six hommes l'ont.", render: s => maquetteDemarches(s, { allures: true, repos: true, geste: 'froid' }) },
      { title: 'Sous la pluie', status: 'retenue', depuis: '0.144.1', note: "En jeu (Jérôme, v0.144.1 ; le froid par gel et neige, la pluie par pluie, un guetteur sur dix en première ligne, les petits gestes pour un homme sur quatre). PROPOSITION d'abord (« selon le temps »). La tête baissée sous le casque, le dos rond, le repos vivant plus discret. Dans le jeu : pluie et tempête.", render: s => maquetteDemarches(s, { allures: true, repos: true, geste: 'pluie' }) },
      { title: 'Le guetteur', status: 'retenue', depuis: '0.144.1', note: "En jeu (Jérôme, v0.144.1 ; le froid par gel et neige, la pluie par pluie, un guetteur sur dix en première ligne, les petits gestes pour un homme sur quatre). PROPOSITION d'abord (« le guetteur »). Il se redresse pour regarder au loin en balayant l'horizon, puis se baisse à l'abri, les genoux pliés (la tête descend de 25 cm), et attend ; une boucle de 9 s. Dans le jeu : un homme sur dix d'une tranchée de première ligne ; ici les six.", render: s => maquetteDemarches(s, { allures: true, repos: true, geste: 'guetteur' }) },
      { title: 'Les petits gestes', status: 'retenue', depuis: '0.144.1', note: "En jeu (Jérôme, v0.144.1 ; le froid par gel et neige, la pluie par pluie, un guetteur sur dix en première ligne, les petits gestes pour un homme sur quatre). PROPOSITION d'abord (« les petits gestes »). Il rajuste son casque de la main gauche, la repose sur le fût, puis la porte à sa bouche (souffler dans ses doigts, tirer sur sa cigarette) ; une boucle de 10 s. Dans le jeu : à la place du repos vivant pour un homme sur quatre ; ici les six.", render: s => maquetteDemarches(s, { allures: true, repos: true, geste: 'gestes' }) },
    ] },
    { id: 'morts', title: 'La mort et les morts', variants: [
      { title: 'La chute', status: 'actuelle', depuis: '0.146.0', note: "En jeu (Jérôme, v0.146.0 : « les deux en jeu »). D'abord une PROPOSITION (Jérôme, 17 nov. : « la mort et les morts »). De près (12 px/m et plus), quand un homme est tué, il ne passe plus d'un coup au corps couché : ses genoux cèdent, il bascule de son côté en accélérant, s'étend et retombe un peu ; une seconde, jouée une fois. Le côté où il tombe (le dos, le ventre, un flanc) et sa pose finale viennent de son numéro. Ici six hommes tombent l'un après l'autre et se relèvent pour l'exemple ; vue de trois quarts.", render: s => maquetteDemarches(s, { morts: 'chute' }) },
      { title: 'Des morts dans des poses variées', status: 'retenue', depuis: '0.146.0', note: "En jeu (Jérôme, v0.146.0) : les morts du jour les plus proches (80 au plus), dès 12 px/m ; ceux de la veille restent les corps couleur de glaise. Seize morts, chacun tiré de son numéro : sur le dos (le genou levé, le pied à plat), sur le ventre, sur un flanc (les jambes repliées, le bras du dessus tombé devant) ; les bras le long du corps, en croix ou au-dessus de la tête ; la tête tournée, le buste tordu ; un sur quatre serre encore son fusil, les autres l'ont lâché à côté d'eux. Aucune main ni aucun pied ne flotte à plus de 40 cm ni ne passe sous le sol (une pose qui le ferait est tirée de nouveau). Aucun triangle de plus : le même squelette que les vivants.", render: s => maquetteDemarches(s, { morts: 'champ' }) },
      { title: 'Couchés comme avant', status: 'ancienne', note: "Ce que le squelette savait faire jusqu'ici : tous sur le dos, raides, les bras le long du corps, le fusil sur l'épaule. (Dans le jeu, les morts ne sont pas encore articulés : ce sont les corps en boîtes, couchés, à tous les zooms.)", render: s => maquetteDemarches(s, { morts: 'avant' }) },
    ] },
    { id: 'formes', title: 'Épaules et crânes', variants: [
      { title: 'Arrondis', status: 'actuelle', depuis: '0.145.1', note: "En jeu (Jérôme, v0.145.1 ; « arrondir les épaules, les crânes »). Les épaules : le haut du tronc et du bras aux coins coupés (un profil extrudé). Le crâne : un octogone au dessus bombé (un profil tourné, comme les casques), les trois faces de devant portent le visage ; les cheveux et la nuque le suivent. Au niveau fin seulement (24 px/m et plus) : environ +94 triangles par homme (+18 %), +23 500 pour 250 hommes.", render: s => maquetteCasques(s, { style: 'tour8', arrondi: true }) },
      { title: 'En boîtes', status: 'ancienne', note: "Le jeu d'avant la v0.145.1, de 24 px/m à 32 : le tronc, le haut des bras et la tête sont des boîtes ; les épaules font un angle droit, le crâne (visible quand le casque est tombé) est un cube. Quatre hommes, un sur deux blessé à la tête (sans casque : on voit le crâne).", render: s => maquetteCasques(s, { style: 'tour8', arrondi: false }) },
    ] },
    { id: 'casques', title: 'Les casques de près', variants: [
      { title: 'Un dôme tourné à 8 pans', status: 'actuelle', depuis: '0.143.4', note: "En jeu (Jérôme, v0.143.4). Un profil tourné autour de l'axe de la tête, comme au tour de potier : le dôme sans marches, d'une seule surface, avec le bord qui s'avance devant (la visière) et derrière (le couvre-nuque) pour l'Adrian, la jupe évasée et le long couvre-nuque pour le Stahlhelm ; huit pans à facettes, l'esprit cubique gardé. Presque gratuit : environ +16 triangles par homme (+3 %).", render: s => maquetteCasques(s, { style: 'tour8' }) },
      { title: 'Les anneaux octogonaux', status: 'ancienne', note: "Le jeu d'avant la v0.143.4, de 24 px/m à 32 : l'Adrian est quatre anneaux octogonaux de boîtes qui se resserrent (deux boîtes par anneau, l'une tournée de 45°), le Stahlhelm trois ; des marches nettes se voient sur le dôme. Quatre hommes, deux de chaque camp ; boutons 24 à 120 px/m (au-delà de 32, plus près que le jeu).", render: s => maquetteCasques(s, { style: 'anneaux' }) },
      { title: 'Six anneaux à douze pans', note: "Non retenue (Jérôme, 17 nov. : « les casques ne peuvent-ils pas avoir un rendu plus réaliste de près ? plus rond ? qu'est-ce que cela coûterait ? »). Toujours des boîtes, mais six anneaux plus fins à douze pans (trois boîtes par anneau) : les marches deviennent un grain. Le plus cher : environ +80 triangles par homme (+15 %).", render: s => maquetteCasques(s, { style: 'anneaux12' }) },
      { title: 'Un dôme tourné à 16 pans, lissé', note: "Non retenue. Le même profil, seize pans et la lumière lissée d'un pan à l'autre : rond. Environ +110 triangles par homme (+21 %). Le niveau intermédiaire (12 à 16 px/m) garde ses anneaux carrés dans tous les cas : le casque y fait 4 pixels.", render: s => maquetteCasques(s, { style: 'tour16' }) },
    ] },
    { id: 'demarches', title: 'Les démarches et le tir en marchant', variants: [
      { title: 'De près : une allure par homme, l\'épaulement', status: 'actuelle', depuis: '0.142.2', note: "En jeu (Jérôme, v0.142.2 ; 17 nov. : « des démarches plus réalistes : mouvement des épaules et des hanches, appui sur une jambe plus l'autre, fusil dans les deux mains ; chaque soldat a une démarche différente en fonction de sa graine » ; « des tirs avec épaulement depuis la marche »). Vingt-quatre allures : chacune sa foulée, sa cadence, son genou, son buste plus ou moins penché, son rebond, le poids reporté sur la jambe qui porte, les épaules qui tournent contre les hanches, une jambe qui fait un plus grand pas, sa façon de tenir le fusil à deux mains ; au repos, le poids sur une jambe. Chaque homme prend celle de son numéro, et une cadence à lui. Le tir : il épaule un quart de seconde AVANT le coup (le recul tombe avec l'éclair), continue de marcher, le buste tourné vers sa cible si elle est à moins de 50° de sa marche, puis rebaisse le fusil. Le dessin seulement : aucune règle ne change.", render: s => maquetteDemarches(s, { allures: true }) },
      { title: 'De près : les démarches d\'avant', status: 'ancienne', note: "Le jeu d'avant la v0.142.2, de 12 px/m à 32 : tous les hommes ont la même marche (une foulée de quatre images, le buste raide, les épaules fixes), seul le départ de la foulée change ; quand l'un tire, il se tourne tout entier vers sa cible et lève son fusil au moment de l'éclair. Le défilé : six hommes traversent la plaine de profil, chacun tire toutes les 2,5 à 4,5 s.", render: s => maquetteDemarches(s, { allures: false }) },
      { title: 'Les silhouettes : le fusil à deux mains, chacun son pas', status: 'retenue', depuis: '0.142.2', note: "En jeu (Jérôme, v0.142.2). De 6 à 8 px/m (là où le joueur passe le plus de temps) : le fusil tenu à deux mains en travers de la poitrine, chacun sa cadence (±12 %), sa foulée et son buste penché ; au tir, il épaule avant le coup et garde son cap de marche si sa cible est à moins de 30°. Les mouvements de quelques centimètres (épaules, hanches, rebond) ne s'y voient pas : ils ne sont que de près.", render: s => moteur(s, { zoom: 4, suivreMarche: true, demarches: true }) },
      { title: 'Les silhouettes d\'avant (6 px/m)', status: 'ancienne', note: "Le jeu d'avant la v0.142.2, de 6 à 8 px/m : le fusil en bandoulière le long du flanc, les bras qui balancent, tous les hommes au même rythme ; quatre régiments marchent.", render: s => moteur(s, { zoom: 4, suivreMarche: true, demarches: false }) },
    ] },
    { id: 'variete-soldats', title: 'Des soldats tous différents', variants: [
      { title: 'Tous différents, des hommes assis dans la tranchée', status: 'actuelle', depuis: '0.141.1', note: "En jeu (Jérôme, 16 nov., v0.141.1). Chaque homme, selon son numéro : un uniforme un peu plus clair ou plus sombre, un regard qui s'écarte de l'ennemi au repos, une place à 25 cm près dans le rang ; et dans une tranchée trois hommes sur dix s'assoient, le dos au parapet, les jambes allongées, quand ils n'ont ni peur ni blessure et n'ont pas tiré depuis huit secondes ; ils se relèvent pour tirer, marcher ou se battre. De très près (12 pixels par mètre et plus) ils sont accroupis : la pose assise des soldats articulés reste à faire.", render: s => moteur(s, { zoom: 4, variete: VARIETE_SOLDATS }) },
      { title: 'Tous pareils', status: 'ancienne', note: "Le jeu d'avant la v0.141.1 : dans un régiment au repos, chaque homme a la même teinte, regarde exactement vers l'ennemi et tient sa place au centimètre ; dans la tranchée, tous debout.", render: s => moteur(s, { zoom: 4, variete: null }) },
      { title: 'Le ton, le regard, le rang', note: "Non retenue seule (sans les hommes assis). Chaque homme, selon son numéro : un uniforme un peu plus clair ou plus sombre (±12 %), un regard qui s'écarte de l'ennemi au repos (±26°), une place à 25 cm près dans le rang. Le dessin seulement : aucune règle ne change, les morts gardent leur ton et leur place. Aucun triangle de plus.", render: s => moteur(s, { zoom: 4, variete: { ...VARIETE_SOLDATS, assis: 0 } }) },
    ] },
    { id: 'boue-soldats', title: 'La boue sur les hommes', variants: [
      { title: 'Selon les jours et le temps', status: 'actuelle', depuis: '0.139.2', note: "En jeu (Jérôme, 16 nov., v0.139.2). La couleur du sol sous chaque homme gagne son uniforme, presque tout aux pieds, un voile au-dessus de la ceinture : légère au premier matin (30 %), elle gagne 6 % par jour de bataille jusqu'à 85 % ; sous la pluie les uniformes foncent d'un quart. Ici le premier jour ; les boutons montrent les jours suivants.", render: s => moteur(s, { zoom: 4, boue: BOUE_SOLDATS }) },
      { title: 'Des uniformes propres', status: 'ancienne', note: "Le jeu d'avant la v0.139.2 : chaque homme est un aplat de la couleur de son armée, le même au premier matin et au dixième jour, sur l'herbe comme dans la boue.", render: s => moteur(s, { zoom: 4, boue: 0 }) },
      { title: 'La boue du sol, légère', note: "Non retenue seule : la dose fixe du premier matin. : « les soldats sont les éléments les moins réalistes »). La couleur du sol sous chaque homme gagne son uniforme : presque tout aux pieds, la moitié aux genoux, un voile au-dessus de la ceinture. Un homme dans la boue est couleur de boue, un homme dans l'herbe morte à peine sali. Aucune couleur nouvelle (un fondu entre deux tons de la palette), aucun triangle de plus ; une lecture de la texture du sol par pixel de soldat.", render: s => moteur(s, { zoom: 4, boue: 0.35 }) },
      { title: 'La boue du sol, forte', note: "Non retenue seule : la dose des derniers jours. La même, plus forte : des hommes qui tiennent la ligne depuis des jours. Le bleu horizon ne reste que sur les épaules et le casque.", render: s => moteur(s, { zoom: 4, boue: 0.85 }) },
      { title: 'Sous la pluie', note: "La boue légère sur un champ labouré par quatre-vingt-dix obus après vingt-quatre heures de pluie : les uniformes mouillés foncent d'un quart, et le sol qu'ils prennent est de la boue et de l'eau.", render: s => moteur(s, { zoom: 4, boue: 0.35, pluie: true }) },
    ] },
    { id: 'fabrique', title: 'Fabrique de soldats', variants: [
      { title: 'Un soldat par clic', status: 'a-trancher', depuis: '0.102.2', note: 'PROPOSITION (Jérôme, 1er nov. : « les membres qui bougent, le visage visible et différent pour chaque soldat, pilosité, accessoires, carrure et taille »). À gauche un soldat articulé (genou, coude, main, pied) au zoom qu\'on veut, de 4 à 420 pixels par mètre ; à droite sa fiche : nom, grade, caractéristiques et aspect, ceux que le jeu tirerait de ce numéro. « Générer » en tire un autre (la barre d\'espace aussi) ; la graine du bas le retrouve. Rien n\'est dans le jeu : `js/aspect-soldat.js` et `js/rendu/soldat-articule.js`.', render: s => maquetteFabrique(s) },
    ] },
  ] },
  { id: 'ambiance', title: 'Ambiance', topics: [
    { id: 'son', title: 'Le son', variants: [
      { title: 'Les bruitages à choisir', status: 'candidate', depuis: '0.99.6', note: 'Des sons libres de droits (CC0, OpenGameArt) pour remplacer la synthèse : explosions de 75, 155 et 220, fusil, mitrailleuse, mitraillage aérien, vol d\'avion, pluie, vent. 2 ou 3 candidates par famille, avec leur auteur et leur adresse. Écoutez, puis dites quelle lettre garder par famille : elle devient `choisi` dans `js/data/sons.js`. Les familles « répétées » (mitrailleuse, mitraillage) sont un seul coup joué à la cadence du jeu ; les boucles tournent jusqu\'à « Arrêter ».', render: s => maquetteBruitages(s) },
      { title: 'Les effets', status: 'actuelle', depuis: '0.76.0', note: 'En jeu (v0.75.0) : chaque son d\'événement, joué par le même module que la bataille (`js/audio.js`) : trois obus, une salve de 24, l\'avion abattu ou écrasé, le char détruit, les ponts, le cor du tronçon pris, la nuit, les trois petits sons de l\'interface. « Loin » les pose à 300 m à gauche. Cliquer une fois déverrouille le son (le navigateur le veut).', render: s => maquetteEffets(s) },
      { title: 'L\'ambiance', status: 'retenue', depuis: '0.76.0', note: 'Les sons qui ne s\'arrêtent pas : le vent (plus fort en tempête), la pluie et la neige, la fusillade (un lit de bruit et des claquements, selon le nombre de tirs), le moteur du char, celui de l\'avion (plus grave et plus fort bas), la musique lente. Les curseurs règlent ce que le jeu règle dans ses réglages.', render: s => maquetteAmbiance(s) },
      { title: 'L\'espace', status: 'retenue', depuis: '0.76.0', note: 'Un 155 tombe là où l\'on clique sur la carte : plus loin du centre de la vue il est plus faible, et il vient de son côté (jamais tout à fait muet : un gros bruit s\'entend de loin). La portée est la largeur que la vue montre (le zoom du jeu la change).', render: s => maquetteEspace(s) },
    ] },
  ] },
  { id: 'a-construire', title: 'À construire', topics: [
    { id: 'cartes-soir', title: 'Les cartes du soir', variants: [
      { title: 'Paquet · le booster', status: 'a-trancher', depuis: '0.170.4', note: 'PROPOSITION (Jérôme, 26 nov.). Le nom du set en grand, CYCLOPÉEN en petit, en Antonio (la police des titres) ; le paquet commun est mat, le brillant a un reflet qui suit le curseur, le rose porte le foil du mythique et contient toujours une carte mythique. Il penche vers le curseur.', render: s => choixBoosters(s) },
      { title: 'Ouverture · on déchire', status: 'a-trancher', depuis: '0.170.4', note: 'PROPOSITION (Jérôme, 26 nov.). Au clic, la déchirure court sur une ligne irrégulière, des éclats de papier sautent, la bande s\'envole. Les cartes sortent vite par le haut, une à une, de face, de la plus commune à la plus rare ; chacune se pose au-dessus des précédentes, en léger éventail ; le mythique sort un peu plus lentement et éclate. Les trois boutons ouvrent un paquet commun, brillant ou rose.', render: s => dechirer(s) },
      { title: 'Carte · le liseré', status: 'a-trancher', depuis: '0.170.4', note: 'PROPOSITION. Les six raretés ont chacune leur matière (Jérôme, 26 nov.) : peu commun, des lignes horizontales ; rare, un foil bleu à lignes verticales ; épique, un foil d\'argent à lignes obliques, un halo d\'argent, la carte qui flotte à peine ; légendaire, un foil doré à points, un halo doré, la carte qui flotte, un reflet léger ; mythique, rose partout, un foil rose en nuages, un halo rose, des étincelles qui tournent autour, la carte qui flotte, un reflet appuyé. Le nom en Antonio (la police des titres). Papier d\'os, le liseré à la couleur de la rareté, la rareté en bandeau. Trois cartes au choix, chacune dans ses six raretés.', render: s => cartesRaretes(s, 'a') },
      { title: 'Carte · le tampon', status: 'a-trancher', depuis: '0.170.4', note: 'PROPOSITION. Les six raretés ont chacune leur matière (Jérôme, 26 nov.) : peu commun, des lignes horizontales ; rare, un foil bleu à lignes verticales ; épique, un foil d\'argent à lignes obliques, un halo d\'argent, la carte qui flotte à peine ; légendaire, un foil doré à points, un halo doré, la carte qui flotte, un reflet léger ; mythique, rose partout, un foil rose en nuages, un halo rose, des étincelles qui tournent autour, la carte qui flotte, un reflet appuyé. Le nom en Antonio (la police des titres). Une carte de boue, la rareté en tampon (une à six étoiles : elle se lit sans la couleur) et en bandeau, la description sur un papier inséré.', render: s => cartesRaretes(s, 'b') },
      { title: 'Carte · l\'étiquette', status: 'a-trancher', depuis: '0.170.4', note: 'PROPOSITION. Les six raretés ont chacune leur matière (Jérôme, 26 nov.) : peu commun, des lignes horizontales ; rare, un foil bleu à lignes verticales ; épique, un foil d\'argent à lignes obliques, un halo d\'argent, la carte qui flotte à peine ; légendaire, un foil doré à points, un halo doré, la carte qui flotte, un reflet léger ; mythique, rose partout, un foil rose en nuages, un halo rose, des étincelles qui tournent autour, la carte qui flotte, un reflet appuyé. Le nom en Antonio (la police des titres). Le bandeau de rareté en haut, l\'image en grand, le nom et la description dessous.', render: s => cartesRaretes(s, 'c') },
      { title: 'Paquet · le paquet ficelé', status: 'ancienne', depuis: '0.170.1', note: 'Remplacée par le booster et sa déchirure (Jérôme, 26 nov.). PROPOSITION (Jérôme, 26 nov. : « à chaque tirage, le choix entre 3 paquets, trois types de cartes ; dans chaque paquet, 3 à 5 cartes ; chaque carte a plusieurs raretés » ; docs/chantiers/cartes-wtf.md). Une pile de cartes de dos, ficelée, une étiquette (l\'icône et la famille) ; une tranche par carte : l\'épaisseur laisse deviner 3, 4 ou 5 cartes sans le dire.', render: s => choixPaquets(s, 'a') },
      { title: 'Paquet · l\'enveloppe', status: 'ancienne', depuis: '0.170.1', note: 'Remplacée par le booster et sa déchirure (Jérôme, 26 nov.). PROPOSITION. Un pli militaire fermé d\'un cachet de cire à l\'icône de la famille ; ses tranches dépassent dessous. Le plus « papier », dans la suite des papiers du soir.', render: s => choixPaquets(s, 'b') },
      { title: 'Paquet · la caisse', status: 'ancienne', depuis: '0.170.1', note: 'Remplacée par le booster et sa déchirure (Jérôme, 26 nov.). PROPOSITION. La caisse des largages, le nom de la famille au pochoir : le lien avec les objets parachutés (mêmes raretés). Le nombre de cartes ne se devine pas.', render: s => choixPaquets(s, 'c') },
      { title: 'Ouverture · le ruban coupé', status: 'ancienne', depuis: '0.170.1', note: 'Remplacée par le booster et sa déchirure (Jérôme, 26 nov.). PROPOSITION. La ficelle saute, les cartes s\'étalent en éventail, face cachée, puis se retournent une à une, de la plus commune à la plus rare ; le mythique attend un temps et éclate. On en garde une au clic. ~2,5 s.', render: s => ouverture(s, 'a') },
      { title: 'Ouverture · le cachet brisé', status: 'ancienne', depuis: '0.170.1', note: 'Remplacée par le booster et sa déchirure (Jérôme, 26 nov.). PROPOSITION. Le cachet se fend et tombe, le rabat s\'ouvre, les cartes sortent de l\'enveloppe et se rangent ; même retournement. ~3 s.', render: s => ouverture(s, 'b') },
      { title: 'Ouverture · le couvercle', status: 'ancienne', depuis: '0.170.1', note: 'Remplacée par le booster et sa déchirure (Jérôme, 26 nov.). PROPOSITION. Le couvercle de la caisse saute (comme à l\'ouverture d\'une caisse parachutée), les cartes montent en gerbe et retombent en rang ; même retournement. La plus vive. ~3 s.', render: s => ouverture(s, 'c') },
    ] },
    { id: 'patrouille', title: 'La patrouille de nuit', variants: [
      { title: 'Le prototype', status: 'a-trancher', depuis: '0.142.0', note: 'PROTOTYPE (Jérôme, 16 nov. : « une mission interlude où l\'on déplace un petit groupe de soldats (30-50) d\'un point A à un point B de nuit » ; au labo d\'abord, pour voir si c\'est amusant). Quarante hommes de notre première ligne vont jusqu\'au point B, à portée de voix de leur fil. Un clic : où aller ; Espace : se coucher, se relever (couchés, ils rampent). En face, des fusées s\'ouvrent au-dessus du groupe : debout dans leur lumière, on est vu (la barre se remplit) et le poste de mitrailleuse le plus proche tire ; couchés dans un trou d\'obus, on ne l\'est pas ; dans le noir, seul le bruit trahit, tout près d\'un poste. Sans conséquence : aucune bataille ne s\'en souvient. Les chiffres sont dans data/patrouille.js, à éprouver.', render: s => { const p = patrouilleLabo({ graine: 1 + Math.floor(Math.random() * 9999) }); moteur(s, { zoom: 6, soldats: 600, tombee: true, effets: { ...EFFETS, fusees: false }, pilote: p.pilote, calque: p.calque, apres: st => p.boutons(st, () => location.reload()) }); } },
    ] },
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
