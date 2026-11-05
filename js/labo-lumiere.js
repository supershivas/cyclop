// Labo lumière — Cyclopéen : peut-on obtenir un rendu de lumière proche d'un GI voxel, sans raytracing, avec un budget tenable dans un navigateur ?
// Ce fichier relie les modules (terrain, lumière, foule, particules, rendu, mesures — js/lumiere/) à l'écran : réglages, boucle, souris, panneau de mesures.
// Il ne contient aucune règle : le futur jeu reprend js/lumiere/ tel quel.
import { ROLES } from './palette.js?v=0.113.0';
import { startUpdateCheck, loadVersion, loadChangelog } from './lib/app-update.js?v=0.113.0';
import { MONDE, TAILLES, COLONNES_MAX, LAMPES, ETAPES, QUALITES, RESOLUTIONS, METEOS, METEO_AUTO, NUAGES, SOLDATS_REELS, CAMERA, BARRAGE, FLASH, BUDGET_IMAGE_MS, BUDGET_RECALCUL_CHUNK_MS } from './lumiere/config.js?v=0.113.0';
import { creerMonde, impact, chunksDe, rectDeChunks } from './lumiere/terrain.js?v=0.113.0';
import { creerLumiere, calculerSoleil, calculerAO, calculerFlood, calculerCavite, majHauteurs, regionTotale } from './lumiere/lumiere.js?v=0.113.0';
import { creerFoule, regler as reglerFoule, avancer as avancerFoule } from './lumiere/foule.js?v=0.113.0';
import { aspectDe, creerSuivi, suivre, ecrire as ecrireReel, FLOATS as FLOATS_REEL, creerClasses, classer, ecrireJeu, FLOATS_JEU } from './lumiere/soldats-reels.js?v=0.113.0';
import { creerLampes, poserFixes, refaireFixes, majMobiles, lampesDeSoldats } from './lumiere/lampes.js?v=0.113.0';
import { creerParticules, explosion, avancer as avancerParticules, ecrire as ecrireParticules } from './lumiere/particules.js?v=0.113.0';
import { creerCamera, rayon, toucherSol, matrices } from './lumiere/camera.js?v=0.113.0';
import { ciel as calculerCiel, COUL } from './lumiere/ciel.js?v=0.113.0';
import { creerRendu } from './lumiere/rendu.js?v=0.113.0';
import { creerMesures, depassement, banc, exporter } from './lumiere/mesures.js?v=0.113.0';
import { createRng } from './lib/rng.js?v=0.113.0';

for (const [role, couleur] of Object.entries(ROLES)) document.documentElement.style.setProperty(`--jeu-${role}`, couleur);
const $ = id => document.getElementById(id);
const CLE = 'cyclopeen:labo-lumiere';
const lireP = () => { try { return JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { return {}; } };
const ecrireP = () => { try { localStorage.setItem(CLE, JSON.stringify({ qualite: S.qualite, taille: S.taille, grille: S.grille, resolution: S.resolution, meteo: S.meteo })); } catch { /* pas de stockage : tant pis */ } };
const P0 = lireP();

const IDS = ETAPES.map(e => e.id), CALCULS = [1, 2, 4, 7];          // les étapes qui remplissent la texture de lumière
const TOUT_OFF = Object.fromEntries(IDS.map(i => [i, false]));
const S = {
  qualite: QUALITES[P0.qualite] ? P0.qualite : 'moyen', taille: TAILLES[P0.taille] ? P0.taille : 'grande', grille: ['auto', '1', '2'].includes(P0.grille) ? P0.grille : 'auto', resolution: RESOLUTIONS[P0.resolution] ? P0.resolution : 'jeu',
  etapes: {}, surcharges: new Set(), heure: 8, jour: 1, meteo: METEOS[P0.meteo] ? P0.meteo : 'sec', unites: MONDE.foule.defaut,
  meteoAuto: false, reels: true, comparer: 'normal', split: 0.5, toits: false, cycle: false, nBarrage: BARRAGE.obus, pause: false, banc: false,
};
const preset = () => QUALITES[S.qualite].etapes;
// la grille voulue, ramenée à 1 case par mètre si la carte aurait trop de colonnes (COLONNES_MAX)
const cpmVoulu = () => { const c = S.grille === 'auto' ? QUALITES[S.qualite].cpm : +S.grille, T = TAILLES[S.taille]; return T.largeurM * T.profondeurM * c * c > COLONNES_MAX ? 1 : c; };
const mesures = creerMesures();
const hasard = createRng(MONDE.graine + 100);

let M, L, F, R, C, particules = creerParticules(), flashs = [], file = [], temps = 0, soleilSale = false, dernierSoleil = 0;
let LA = null, lampesPerimees = false, dernierMob = -1, lueursData = new Float32Array(5 * 800);
let perime = {}, maillageAO = false, banque = null, moisi = 0;
// la météo qui évolue : `meteoNow` glisse vers la météo voulue (S.meteo) ; les nuages dérivent avec le vent
const CLES_METEO = ['humidite', 'pluie', 'neige', 'brouillard', 'voile', 'soleil', 'vent'];
const meteoNow = { ...METEOS[S.meteo] }; let prochainMeteo = 30; const derive = [0, 0];
function avancerMeteo(dt) {
  if (S.meteoAuto) {
    prochainMeteo -= dt;
    if (prochainMeteo <= 0) { const choix = (METEO_AUTO.suite[S.meteo] || ['sec']).filter(k => k !== S.meteo); /* toujours un autre temps */ S.meteo = choix[Math.floor(hasard() * choix.length)]; prochainMeteo = METEO_AUTO.tenueS[0] + hasard() * (METEO_AUTO.tenueS[1] - METEO_AUTO.tenueS[0]); marquerMeteo(); dire(`La météo tourne : ${METEOS[S.meteo].nom}`); setTimeout(() => dire(''), 2500); }
  }
  const k = 1 - Math.exp(-dt * (S.meteoAuto ? METEO_AUTO.vitesse : 0.6)), cible = METEOS[S.meteo];
  for (const c of CLES_METEO) meteoNow[c] += (cible[c] - meteoNow[c]) * k;
  derive[0] += dt * NUAGES.derive * (1 + meteoNow.vent); derive[1] += dt * NUAGES.derive * 0.3 * (1 + meteoNow.vent);
}
// Les soldats du jeu, avec son échelle de détail (rendu/soldats.js) : le point, la boîte, la silhouette allégée, le soldat équipé, puis l'articulé (squelette, visage) pour les plus proches.
// Le niveau de chacun vient de SES pixels par mètre : au premier plan d'une vue serrée on lit un visage, au fond le même champ n'est que des points.
const suivi = creerSuivi(MONDE.foule.max), classes = creerClasses(MONDE.foule.max);
const dataArt = new Float32Array(SOLDATS_REELS.maxArticule * FLOATS_REEL), dataEq = new Float32Array(SOLDATS_REELS.maxEquipe * FLOATS_JEU), dataLg = new Float32Array(SOLDATS_REELS.maxLegere * FLOATS_JEU), dataBt = new Float32Array(MONDE.foule.max * FLOATS_JEU);
let comptes = { art: 0, equipe: 0, legere: 0, boite: 0 };
function lotsSoldats() {
  const vide = { n: 0, data: dataBt };
  if (!S.reels || !F) { classes.masque.fill(0); comptes = { art: 0, equipe: 0, legere: 0, boite: 0 }; return { jeu: { boite: vide, legere: vide, equipe: vide }, reels: { n: 0, niveau: 'moyen', data: dataArt } }; }
  mesures.chrono('soldats:classer', () => { classer(F, L.hf, M, matrices(C).vp, R.hauteur, C.fov, classes); });
  const Cl = classes;
  const peur = flashs.filter(f => temps - f.t0 < 5);
  const tapiDe = (x, z) => { let t = 0; for (const f of peur) if (Math.hypot(f.x - x, f.z - z) < 28) t = Math.max(t, Math.min(1, (5 - (temps - f.t0)) / 1.5)); return t > 0.3; };      // la peur : on s'accroupit près d'un obus
  mesures.chrono('soldats:ecrire', () => {
    for (let q = 0; q < Cl.art.n; q++) {
      const i = Cl.art.i[q], x = F.x[i], z = F.z[i]; suivre(suivi, F, i, temps);
      ecrireReel(dataArt, q, { x, y: hauteurM(x, z), z, camp: F.camp[i], vit: suivi.vit[i], tapi: tapiDe(x, z) ? 0.9 : 0, cap: suivi.cap[i], temps, aspect: aspectDe(i, F.camp[i]) });
    }
    for (const [liste, data] of [[Cl.equipe, dataEq], [Cl.legere, dataLg]]) for (let q = 0; q < liste.n; q++) {
      const i = liste.i[q], x = F.x[i], z = F.z[i]; suivre(suivi, F, i, temps);
      ecrireJeu(data, q, { i, x, y: hauteurM(x, z), z, camp: F.camp[i], vit: suivi.vit[i], tapi: tapiDe(x, z), cap: suivi.cap[i] });
    }
    for (let q = 0; q < Cl.boite.n; q++) { const i = Cl.boite.i[q], x = F.x[i], z = F.z[i]; ecrireJeu(dataBt, q, { i, x, y: hauteurM(x, z), z, camp: F.camp[i], vit: 0, tapi: false, cap: 0 }); }
  });
  comptes = { art: Cl.art.n, equipe: Cl.equipe.n, legere: Cl.legere.n, boite: Cl.boite.n };
  return { jeu: { boite: { n: Cl.boite.n, data: dataBt }, legere: { n: Cl.legere.n, data: dataLg }, equipe: { n: Cl.equipe.n, data: dataEq } }, reels: { n: Cl.art.n, niveau: Cl.plusProche >= SOLDATS_REELS.pxmFin ? 'fin' : 'moyen', data: dataArt } };
}

const toast = (t) => { const e = $('ll-toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.n); toast.n = setTimeout(() => { e.hidden = true; }, 4200); };
const dire = (t) => { $('ll-etat').textContent = t || ''; };

// ─── Le monde et la lumière ───────────────────────────────────────────────────
const Q = () => QUALITES[S.qualite];
const cielCourant = () => calculerCiel({ heure: S.heure, jour: S.etapes[7] ? S.jour : 1, meteo: S.etapes[7] ? meteoNow : 'sec' });
let soleil = null;
function calculer(id, region) {                                       // un calcul de lumière sur une région, chronométré à part ; rend les ms
  return mesures.chrono(region === 'carte' ? `global:${id}` : `chunk:${id}`, () => {
    const r = region === 'carte' ? regionTotale(M) : region, q = Q();
    if (id === 1) calculerSoleil(M, L, r, soleil, q.porteeOmbre);
    else if (id === 2) calculerAO(M, L, r, q.rayonAO, q.directionsAO);
    else if (id === 4) calculerFlood(M, L, r);
    else if (id === 7) calculerCavite(M, L, r);
  });
}
function globalPour(id) {
  const ms = calculer(id, 'carte'); perime[id] = false;
  if (id === 2 && !maillageAO) { mesures.chrono('maillage:tout', () => R.tout(true)); maillageAO = true; }
  R.majLumiere(regionTotale(M));
  return ms;
}
function monter(cpm) {
  const t0 = performance.now();
  const T = TAILLES[S.taille];
  mesures.chrono('monde:creation', () => { M = creerMonde({ cpm, largeurM: T.largeurM, profondeurM: T.profondeurM }); });
  L = creerLumiere(M, Q()); F = creerFoule(M); reglerFoule(F, S.unites);
  soleil = cielCourant();
  majHauteurs(M, L, regionTotale(M));
  LA = creerLampes(M); mesures.chrono('lampes:statique', () => poserFixes(M, L.hf, LA)); lampesPerimees = false;
  R.relier(M, L, F, LA);
  file.length = 0; flashs.length = 0; particules = creerParticules();
  perime = { 1: true, 2: true, 4: true, 7: true }; maillageAO = false;
  for (const id of CALCULS) if (S.etapes[id]) globalPour(id);
  if (!maillageAO) R.tout(false);
  mesures.noter('monde:total', performance.now() - t0);
  C.sol = (x, z) => hauteurM(x, z);
  voirPreset('large', true);
}
const hauteurM = (x, z) => { const i = Math.floor(x * M.cpm), j = Math.floor(z * M.cpm); return i < 0 || j < 0 || i >= M.W || j >= M.H ? 0 : L.hf[j * M.W + i]; };

function appliquerQualite(q, { garder = false } = {}) {
  S.qualite = q; S.surcharges.clear();
  for (const id of IDS) S.etapes[id] = QUALITES[q].etapes.includes(id);
  ecrireP();
  if (!garder && M && M.cpm !== cpmVoulu()) { monter(cpmVoulu()); toast(`Grille ${cpmVoulu()} case(s) par mètre : terrain régénéré.`); }
  else if (M) for (const id of CALCULS) if (S.etapes[id] && perime[id]) globalPour(id);
  tracerReglages();
}
function basculerEtape(id, on) {
  S.etapes[id] = on;
  if (on && id === 6 && lampesPerimees) { poserFixes(M, L.hf, LA); lampesPerimees = false; R.majLampes(regionTotale(M)); }
  if (on && CALCULS.includes(id) && (perime[id] || (id === 2 && !maillageAO))) { const ms = globalPour(id); dire(`Étape ${id} calculée sur toute la carte : ${ms.toFixed(1)} ms`); setTimeout(() => dire(''), 2500); }
  if (on === preset().includes(id)) S.surcharges.delete(id); else S.surcharges.add(id);
  tracerReglages();
}

// ─── Un obus ──────────────────────────────────────────────────────────────────
function obus(xm, zm, { silencieux = false } = {}) {
  const imp = impact(M, xm, zm); if (!imp) return;
  // le maillage : les chunks dont une colonne a bougé (à 2 cases près : les flancs et l'AO des arêtes lisent les voisines)
  const zone = chunksDe(M, { i0: imp.i0 - 2, j0: imp.j0 - 2, i1: imp.i1 + 2, j1: imp.j1 + 2 });
  const liste = []; for (let r = zone.r0; r <= zone.r1; r++) for (let c = zone.c0; c <= zone.c1; c++) liste.push({ cx: c, cy: r });
  mesures.chrono('maillage:chunk', () => R.reconstruire(liste, S.etapes[2] && maillageAO));
  majHauteurs(M, L, imp); R.majHauteurs(imp);
  if (S.etapes[6]) mesures.chrono('lampes:statique', () => { const z = refaireFixes(M, L.hf, LA, { i0: imp.i0 - 2, j0: imp.j0 - 2, i1: imp.i1 + 2, j1: imp.j1 + 2 }); if (z) R.majLampes(z); });
  else lampesPerimees = true;
  // la lumière : le chunk touché et ses voisins (étape 3), sinon toute la carte
  const region = S.etapes[3] ? rectDeChunks(M, chunksDe(M, imp, 1)) : regionTotale(M);
  // chaque étape ne recalcule que ce que l'obus peut changer : sa zone d'influence (portée de l'ombre, rayon de l'AO…), toujours DANS le chunk touché et ses voisins
  const autour = m => { const k = Math.ceil(m * M.cpm) + 1; return { i0: Math.max(region.i0, imp.i0 - k), j0: Math.max(region.j0, imp.j0 - k), i1: Math.min(region.i1, imp.i1 + k), j1: Math.min(region.j1, imp.j1 + k) }; };
  const zones = { 1: autour(Q().porteeOmbre), 2: autour(Q().rayonAO), 4: region, 7: autour(3) };
  let total = 0;
  for (const id of CALCULS) {
    if (!S.etapes[id]) { perime[id] = true; if (id === 2) maillageAO = false; continue; }
    total += calculer(id, S.etapes[3] ? zones[id] : 'carte');
    if (!S.etapes[3]) mesures.noter(`chunk:${id}`, mesures.lire(`global:${id}`).dernier);
  }
  if (S.etapes[2] === false) maillageAO = false;
  mesures.noter('recalcul:total', total);
  R.majLumiere(region);
  mesures.noter('recalcul:cases', (region.i1 - region.i0 + 1) * (region.j1 - region.j0 + 1));
  const y = hauteurM(xm, zm);
  flashs.push({ x: xm, y: y + 3, z: zm, t0: temps });
  if (flashs.length > 20) flashs.shift();
  explosion(particules, xm, y, zm, { nbDebris: Q().debris, atmosphere: !!S.etapes[5] });
  if (!silencieux) mesures.evenement(`obus ${xm.toFixed(0)},${zm.toFixed(0)}`);
}
function barrage(cx, cz) {
  if (cx == null) { cx = C.cible[0]; cz = C.cible[2]; }
  for (let k = 0; k < S.nBarrage; k++) {
    const a = hasard() * 6.2832, r = Math.sqrt(hasard()) * BARRAGE.rayonM;
    file.push({ t: temps + (k / S.nBarrage) * BARRAGE.dureeS, x: Math.max(2, Math.min(M.largeurM - 2, cx + Math.cos(a) * r)), z: Math.max(2, Math.min(M.profondeurM - 2, cz + Math.sin(a) * r)) });
  }
  dire(`Barrage : ${S.nBarrage} obus en ${BARRAGE.dureeS} s`); setTimeout(() => dire(''), 2200);
}

// ─── La caméra ────────────────────────────────────────────────────────────────
let tween = null;
function voirPreset(nom, direct = false) {
  const p = CAMERA.presets[nom]; let cible = [M.largeurM / 2, 0, M.profondeurM / 2];
  if (nom === 'tranchee') { const a = M.abris.find(x => x.camp === 0 && x.niveau === 1) || M.abris[0]; cible = [a ? a.x : 128, 0, a ? a.z : 100]; }
  if (nom === 'colline') cible = [M.colline.x, 0, M.colline.z];
  if (nom === 'cratere') { const c = M.craters[M.craters.length - 1] || { x: 128, z: 80 }; cible = [c.x, 0, c.z]; }
  cible[1] = hauteurM(cible[0], cible[2]);
  const vers = { cible, distance: p.distance * (nom === 'large' ? M.largeurM / 256 : 1), tangage: p.tangage, lacet: p.lacet };
  if (direct) Object.assign(C, vers);
  else tween = { de: { cible: [...C.cible], distance: C.distance, tangage: C.tangage, lacet: C.lacet }, vers, t: 0 };
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('actif', b.dataset.cam === nom));
}
function avancerTween(dt) {
  if (!tween) return; tween.t = Math.min(1, tween.t + dt / 0.7);
  const k = tween.t * tween.t * (3 - 2 * tween.t), a = tween.de, b = tween.vers, mx = (u, v) => u + (v - u) * k;
  C.cible = [mx(a.cible[0], b.cible[0]), mx(a.cible[1], b.cible[1]), mx(a.cible[2], b.cible[2])];
  C.distance = mx(a.distance, b.distance); C.tangage = mx(a.tangage, b.tangage); C.lacet = mx(a.lacet, b.lacet);
  if (tween.t >= 1) tween = null;
}

// ─── L'image ──────────────────────────────────────────────────────────────────
function dimensionner() {
  const cv = $('ll-scene'), W = window.innerWidth, H = window.innerHeight, cible = RESOLUTIONS[S.resolution].hauteur;
  const f = cible ? Math.max(1, Math.round(H / cible)) : 1;
  R.dimensionner(Math.floor(W / f), Math.floor(H / f)); C.aspect = W / H;
  cv.style.width = '100%'; cv.style.height = '100%';
}
// la flamme de chaque lanterne et de chaque lampe portée : x, y, z, taille (m), phase
function lueursDe() {
  if (!S.etapes[6] || !LA) return { n: 0, data: lueursData };
  const liste = LA.fixes.concat(LA.dernieres); const n = Math.min(liste.length, lueursData.length / 5 | 0);
  for (let k = 0; k < n; k++) { const l = liste[k]; lueursData.set([l.x, l.y, l.z, l.fixe ? 0.5 : 0.35, (l.x * 7.3 + l.z * 3.1) % 6.28], k * 5); }
  return { n, data: lueursData };
}
function scene(etapesForcees) {
  const eff = etapesForcees || (S.comparer === 'tout-off' ? TOUT_OFF : S.etapes);
  const partage = !etapesForcees && S.comparer === 'partage';
  const c = cielCourant();
  const { n, nd } = ecrireParticules(particules);
  const fl = flashs.map(f => { const age = (temps - f.t0) / FLASH.dureeS; return { ...f, rayon: FLASH.rayonM, coul: f.coul || [1.2, 0.8, 0.45], force: f.fixe ? FLASH.intensite : Math.max(0, 1 - age) ** 2 * FLASH.intensite }; }).filter(f => f.force > 0.01);
  R.dessiner({ camera: C, ciel: c, etapes: eff, moitie: partage ? { etapes: TOUT_OFF } : null, split: partage ? S.split : 0, flashs: fl, particules: { n, nd, tampon: particules.sortie }, temps, derive, bordY: M.bordM, ...lotsSoldats(), masque: classes.masque, lueurs: lueursDe(), toitsTransparents: S.toits, ssaoEchantillons: Q().ssaoEchantillons || 10, brume: Q().brume });
}

// ─── La boucle ────────────────────────────────────────────────────────────────
let dernierT = performance.now();
function boucle(tms) {
  requestAnimationFrame(boucle);
  if (document.hidden || S.banc) { dernierT = tms; return; }
  const dtReel = Math.min(0.1, (tms - dernierT) / 1000); dernierT = tms; mesures.imageFaite(dtReel * 1000);
  const t0 = performance.now(), dt = S.pause ? 0 : Math.min(0.05, dtReel);
  if (!S.pause) {
    temps += dt; avancerMeteo(dt);
    if (S.etapes[6] && temps - dernierMob > 0.15) { dernierMob = temps; mesures.chrono('lampes:mobiles', () => { const z = majMobiles(M, L.hf, LA, lampesDeSoldats(F, L.hf, M, C.cible[0], C.cible[2])); if (z) R.majLampes(z); }); }
    mesures.chrono('foule', () => avancerFoule(F, dt));
    avancerParticules(particules, dt, hauteurM);
    flashs = flashs.filter(f => f.fixe || temps - f.t0 < FLASH.dureeS);
    while (file.length && file[0].t <= temps) { const o = file.shift(); obus(o.x, o.z, { silencieux: true }); }
    if (S.cycle) { S.heure = (S.heure + dt * 0.5) % 24; $('ll-heure').value = S.heure; soleilSale = true; majLibelles(); }
  }
  avancerTween(dtReel);
  if (soleilSale && performance.now() - dernierSoleil > (S.cycle ? 400 : 90)) { soleilSale = false; dernierSoleil = performance.now(); soleil = cielCourant(); if (S.etapes[1]) { calculer(1, 'carte'); R.majLumiere(regionTotale(M)); perime[1] = false; } else perime[1] = true; }
  const d = performance.now(); mesures.noter('js:avant-dessin', d - t0);
  scene();
  mesures.noter('js:image', performance.now() - t0);
  moisi += dtReel; if (moisi > 0.3) { moisi = 0; tracerMesures(); }
}

// ─── Le banc GPU ──────────────────────────────────────────────────────────────
async function lancerBanc() {
  const b = $('ll-banc'); b.disabled = true; S.banc = true;
  const avant = { fl: flashs, p: particules, comp: S.comparer }; S.comparer = 'normal';
  try {
    banque = await banc({
      appliquer: et => { S.bancEtapes = et; }, image: () => { scene(S.bancEtapes); R.attendre(); },
      preparer: () => { flashs = [0, 1, 2, 3].map(k => ({ x: M.W / M.cpm / 2 + (k - 1.5) * 18, y: 6, z: M.H / M.cpm / 2, t0: 0, fixe: true })); particules = creerParticules(7000, 3); for (let k = 0; k < 8; k++) explosion(particules, 70 + k * 16, 8, 80, { nbDebris: Q().debris, atmosphere: true }); for (let k = 0; k < 6; k++) avancerParticules(particules, 0.5, hauteurM); },
      rendre: () => { S.bancEtapes = null; flashs = avant.fl; particules = avant.p; },
      progression: t => { b.textContent = `Banc : ${t}`; },
    });
    mesures.evenement('banc GPU fait');
    dire(`Banc : image sans lumière ${banque.base.toFixed(1)} ms, toutes les étapes ${banque.toutes.toFixed(1)} ms`);
  } finally { S.banc = false; S.comparer = avant.comp; b.disabled = false; b.textContent = 'Mesurer le coût GPU'; dernierT = performance.now(); }
}

// ─── Le panneau de mesures ────────────────────────────────────────────────────
const ms = (v, d = 2) => v == null ? '—' : v.toFixed(d);
const nombre = v => Math.round(v).toLocaleString('fr-FR');
function cellule(valeur, budget, extra = '') {
  const dep = depassement(valeur, budget);
  return `<td class="${dep ? 'depasse' : ''}" title="${budget > 0 ? `budget ${budget} ms${dep ? ' — dépassé' : ''}` : 'pas de budget'}">${ms(valeur)}${dep ? ' ▲' : ''}${extra}</td>`;
}
function tracerMesures() {
  const fps = mesures.fps(), msI = mesures.msImage(), tot = mesures.lire('recalcul:total'), mail = mesures.lire('maillage:chunk'), fou = mesures.lire('foule'), js = mesures.lire('js:image');
  const lignes = ETAPES.map(e => {
    const g = mesures.lire(`global:${e.id}`), c = mesures.lire(`chunk:${e.id}`), b = banque ? (banque.marginal[e.id] ?? null) : null;
    const gpu = e.budget.gpuMs > 0 ? cellule(b, e.budget.gpuMs) : '<td>—</td>';
    return `<tr class="${S.etapes[e.id] ? '' : 'eteint'}"><td>${e.id} ${e.nom}</td>${e.budget.globalMs > 0 ? cellule(g?.dernier, e.budget.globalMs) : '<td>—</td>'}${e.budget.chunkMs > 0 ? cellule(c?.moy, e.budget.chunkMs) : '<td>—</td>'}${gpu}</tr>`;
  }).join('');
  const dep60 = depassement(msI, BUDGET_IMAGE_MS * 1.05);
  const g = R.gpu, logiciel = R.info.logiciel;
  $('ll-mesures-corps').innerHTML = `
    <dl>
      <dt>Images par seconde</dt><dd class="${fps && fps < 55 ? 'depasse' : 'ok'}">${ms(fps, 0)} (${ms(msI, 1)} ms)${dep60 ? ' ▲' : ''}</dd>
      <dt>Soldats</dt><dd>${nombre(F.n)}</dd>
      <dt>Grille</dt><dd>${M.W} × ${M.H} (${nombre(M.n)} colonnes), ${M.cpm} case/m</dd>
      <dt>Chunks</dt><dd>${M.cw * M.chh} de ${M.chunk} × ${M.chunk}</dd>
      <dt>Triangles · appels</dt><dd>${nombre(R.stats.triangles)} · ${R.stats.appels}</dd>
      <dt>Recalcul après un obus</dt><dd class="${depassement(tot?.moy, BUDGET_RECALCUL_CHUNK_MS) ? 'depasse' : ''}">${ms(tot?.moy)} ms${tot ? ` (pire ${ms(tot.max)})` : ''}${depassement(tot?.moy, BUDGET_RECALCUL_CHUNK_MS) ? ` ▲ budget ${BUDGET_RECALCUL_CHUNK_MS}` : ''}</dd>
      <dt>…dont maillage du chunk</dt><dd>${ms(mail?.moy)} ms</dd>
      <dt>Foule (CPU)</dt><dd>${ms(fou?.moy)} ms</dd>
      <dt>Soldats dessinés en volume</dt><dd>${comptes.art} articulés · ${comptes.equipe} équipés · ${comptes.legere} allégés · ${nombre(comptes.boite)} boîtes</dd>
      <dt>…choix et écriture</dt><dd>${ms(mesures.lire('soldats:classer')?.moy)} + ${ms(mesures.lire('soldats:ecrire')?.moy)} ms</dd>
      <dt>Lanternes · lampes portées</dt><dd>${LA ? `${LA.fixes.length} · ${LA.dernieres.length}` : '—'} (${ms(mesures.lire('lampes:mobiles')?.moy)} ms)</dd>
      <dt>JS par image</dt><dd>${ms(js?.moy, 1)} ms</dd>
      <dt>GPU scène · AO · composition</dt><dd>${g.scene == null ? 'n/d' : `${ms(g.scene, 1)} · ${ms(g.ssao, 1)} · ${ms(g.composition, 1)} ms`}</dd>
    </dl>
    <table><thead><tr><th>Étape</th><th>carte ms</th><th>chunk ms</th><th>GPU ms</th></tr></thead><tbody>${lignes}</tbody></table>
    ${logiciel ? `<p class="ll-alerte" title="${R.info.renderer.replace(/[<>&"]/g, '')}">Rendu logiciel : les temps GPU ne sont pas représentatifs (seuls les rapports comptent).</p>` : ''}
    ${banque ? `<p class="ll-note">Banc : image sans lumière ${ms(banque.base, 1)} ms ; toutes les étapes ${ms(banque.toutes, 1)} ms.</p>` : '<p class="ll-note">Colonne GPU : lancer le banc (le coût de chaque étape, seule).</p>'}`;
}
function majLibelles() {
  const h = Math.floor(S.heure), m = Math.round((S.heure - h) * 60);
  $('ll-heure-v').textContent = `${String(h).padStart(2, '0')} h ${String(m % 60).padStart(2, '0')}`;
  $('ll-unites-v').textContent = nombre(S.unites); $('ll-jour-v').textContent = S.jour;
  $('ll-barrage-v').textContent = S.nBarrage; $('ll-split-v').textContent = `${Math.round(S.split * 100)} %`;
}

// ─── Les réglages (l'engrenage) ───────────────────────────────────────────────
function tracerReglages() {
  const gq = $('ll-qualite'); gq.innerHTML = '';
  for (const [id, q] of Object.entries(QUALITES)) {
    const b = document.createElement('button'); b.className = 'bouton'; b.type = 'button'; b.textContent = q.nom; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(id === S.qualite));
    b.classList.toggle('actif', id === S.qualite); b.onclick = () => appliquerQualite(id); gq.append(b);
  }
  $('ll-qualite-note').textContent = `Étapes ${QUALITIES_TXT(S.qualite)} · ${QUALITES[S.qualite].cpm} case/m · AO sur ${QUALITES[S.qualite].rayonAO} m · ombres jusqu'à ${QUALITES[S.qualite].porteeOmbre} m.`;
  const box = $('ll-etapes'); box.innerHTML = '';
  for (const e of ETAPES) {
    const l = document.createElement('label'); l.className = 'll-etape';
    const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!S.etapes[e.id]; i.onchange = () => basculerEtape(e.id, i.checked);
    const t = document.createElement('span'); const surcharge = S.surcharges.has(e.id);
    t.innerHTML = `<b>${e.id} · ${e.nom}</b> ${surcharge ? '<span class="marque" title="Différent du niveau">•</span>' : ''}<small>${e.desc}</small>`;
    l.append(i, t); box.append(l);
  }
  $('ll-reviens').disabled = !S.surcharges.size;
}
const QUALITIES_TXT = q => QUALITES[q].etapes.join(', ');
function remplirSelects() {
  $('ll-grille').innerHTML = `<option value="auto">Selon le niveau</option><option value="1">1 (cube de 1 m)</option><option value="2">2 (cube de 50 cm)</option>`;
  $('ll-grille').value = S.grille;
  $('ll-taille').innerHTML = Object.entries(TAILLES).map(([k, t]) => `<option value="${k}">${t.nom}</option>`).join(''); $('ll-taille').value = S.taille;
  $('ll-resolution').innerHTML = Object.entries(RESOLUTIONS).map(([k, r]) => `<option value="${k}">${r.nom}</option>`).join(''); $('ll-resolution').value = S.resolution;
  const mt = $('ll-meteo'); mt.innerHTML = '';
  for (const [k, m] of Object.entries(METEOS)) { const b = document.createElement('button'); b.className = 'bouton ll-meteo-b'; b.type = 'button'; b.textContent = m.nom; b.dataset.meteo = k; b.onclick = () => { S.meteo = k; S.meteoAuto = false; majMeteoAuto(); ecrireP(); marquerMeteo(); if (!S.etapes[7]) { basculerEtape(7, true); toast('La météo est l\'étape 7 : activée.'); } }; mt.append(b); }
  marquerMeteo();
}
const majMeteoAuto = () => $('ll-meteo-auto').setAttribute('aria-pressed', String(S.meteoAuto));
const marquerMeteo = () => document.querySelectorAll('[data-meteo]').forEach(b => b.classList.toggle('actif', b.dataset.meteo === S.meteo));
function ouvrirReglages(ouvert) {
  const p = $('ll-reglages'); p.hidden = !ouvert; $('ll-ouvrir').setAttribute('aria-expanded', String(ouvert));
  if (ouvert) p.setAttribute('role', 'dialog'); else p.removeAttribute('role');          // « dialog » seulement ouvert : une mise à jour attend qu'on ait fini
}

// ─── Souris et clavier ────────────────────────────────────────────────────────
function monde(ev) {
  const r = $('ll-scene').getBoundingClientRect();
  return toucherSol(rayon(C, ((ev.clientX - r.left) / r.width) * 2 - 1, 1 - ((ev.clientY - r.top) / r.height) * 2), hauteurM);
}
function brancherSouris() {
  const cv = $('ll-scene'); let drag = null;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, bouton: e.button, maj: e.shiftKey, bouge: false }; tween = null; });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.bouge = true;
    if (!drag.bouge) return; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.bouton === 2 && !drag.maj) { C.lacet -= dx * 0.006; C.tangage = Math.max(0.2, Math.min(1.45, C.tangage + dy * 0.005)); }
    else {                                                                                       // déplacer la vue : dans le plan du sol, selon le lacet
      const k = C.distance * 0.0016, c = Math.cos(C.lacet), s = Math.sin(C.lacet);
      C.cible[0] += (-dx * c + dy * s * Math.sin(C.tangage) * 1.2) * k; C.cible[2] += (dx * s + dy * c * Math.sin(C.tangage) * 1.2) * k;
      C.cible[0] = Math.max(0, Math.min(M.largeurM, C.cible[0])); C.cible[2] = Math.max(0, Math.min(M.profondeurM, C.cible[2])); C.cible[1] = hauteurM(C.cible[0], C.cible[2]);
    }
  });
  cv.addEventListener('pointerup', e => {
    if (drag && !drag.bouge && drag.bouton === 0 && !drag.maj) { const p = monde(e); if (p) obus(p[0], p[2]); }
    drag = null;
  });
  cv.addEventListener('wheel', e => { e.preventDefault(); C.distance = Math.max(8, Math.min(520, C.distance * Math.exp(e.deltaY * 0.0012))); tween = null; }, { passive: false });
}
function brancherClavier() {
  const enChamp = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range';
  const tenues = new Set();
  addEventListener('keydown', e => {
    if (enChamp(e) || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { ouvrirReglages(false); return; }
    if (k === ' ' && e.target.tagName !== 'BUTTON') { S.pause = !S.pause; S.pauseAuto = false; dire(S.pause ? 'Pause' : ''); e.preventDefault(); }
    else if (k === 'b') barrage(); else if (k === 'c') basculerComparer(); else if (k === 'v') basculerPartage();
    else if (/^[1-8]$/.test(k) && !e.altKey) { const id = +k; basculerEtape(id, !S.etapes[id]); }
    else tenues.add(k);
  });
  addEventListener('keyup', e => tenues.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { tenues.clear(); if (!S.pause) { S.pause = true; S.pauseAuto = true; dire('Pause : la fenêtre a perdu le focus'); } });    // section 9 : pause quand la fenêtre perd le focus
  addEventListener('focus', () => { if (S.pauseAuto) { S.pause = false; S.pauseAuto = false; dire(''); dernierT = performance.now(); } });
  setInterval(() => {
    if (!tenues.size || !C) return;
    const v = C.distance * 0.012, c = Math.cos(C.lacet), s = Math.sin(C.lacet); let ax = 0, az = 0;
    if (tenues.has('arrowleft') || tenues.has('q')) ax -= 1; if (tenues.has('arrowright') || tenues.has('d')) ax += 1;
    if (tenues.has('arrowup') || tenues.has('z') || tenues.has('w')) az -= 1; if (tenues.has('arrowdown') || tenues.has('s')) az += 1;
    if (!ax && !az) return; tween = null;
    C.cible[0] = Math.max(0, Math.min(M.largeurM, C.cible[0] + (ax * c + az * s) * v)); C.cible[2] = Math.max(0, Math.min(M.profondeurM, C.cible[2] + (-ax * s + az * c) * v)); C.cible[1] = hauteurM(C.cible[0], C.cible[2]);
  }, 16);
}
function basculerComparer() { S.comparer = S.comparer === 'tout-off' ? 'normal' : 'tout-off'; majComparer(); }
function basculerPartage() { S.comparer = S.comparer === 'partage' ? 'normal' : 'partage'; majComparer(); }
function majComparer() {
  $('ll-comparer').setAttribute('aria-pressed', String(S.comparer === 'tout-off')); $('ll-partage').setAttribute('aria-pressed', String(S.comparer === 'partage'));
  const et = $('ll-etiquettes'); et.hidden = S.comparer !== 'partage'; if (!et.hidden) { et.style.paddingLeft = `${S.split * 100 - 8}%`; et.style.paddingRight = `${(1 - S.split) * 100 - 8}%`; }
  dire(S.comparer === 'tout-off' ? 'Toutes les étapes désactivées' : S.comparer === 'partage' ? '' : '');
}

// ─── Mise en route ────────────────────────────────────────────────────────────
async function demarrer() {
  const cv = $('ll-scene');
  try { R = creerRendu(cv); } catch (e) { $('ll-etat').textContent = `Le rendu n'a pas démarré : ${e.message}`; console.error(e); return; }
  C = creerCamera();
  for (const id of IDS) S.etapes[id] = preset().includes(id);
  S.unites = MONDE.foule.defaut;
  $('ll-unites').value = S.unites; $('ll-heure').value = S.heure; $('ll-jour').value = S.jour; $('ll-barrage-n').value = S.nBarrage; $('ll-split').value = S.split; $('ll-toits').checked = S.toits;
  remplirSelects(); dimensionner();
  monter(cpmVoulu());
  tracerReglages(); majLibelles(); majComparer(); tracerMesures();
  brancherSouris(); brancherClavier();

  $('ll-unites').oninput = e => { S.unites = +e.target.value; reglerFoule(F, S.unites); majLibelles(); };
  $('ll-heure').oninput = e => { S.heure = +e.target.value; soleilSale = true; majLibelles(); };
  $('ll-jour').oninput = e => { S.jour = +e.target.value; majLibelles(); if (!S.etapes[7]) dire('Le jour de bataille est l\'étape 7 (météo).'); };
  $('ll-barrage-n').oninput = e => { S.nBarrage = +e.target.value; majLibelles(); };
  $('ll-split').oninput = e => { S.split = +e.target.value; majLibelles(); majComparer(); };
  $('ll-toits').onchange = e => { S.toits = e.target.checked; };
  $('ll-grille').onchange = e => { S.grille = e.target.value; ecrireP(); if (M.cpm !== cpmVoulu()) { monter(cpmVoulu()); toast(`Grille ${cpmVoulu()} case(s) par mètre : terrain régénéré.`); } };
  $('ll-taille').onchange = e => { S.taille = e.target.value; ecrireP(); monter(cpmVoulu()); toast(`Carte ${TAILLES[S.taille].largeurM} × ${TAILLES[S.taille].profondeurM} m${cpmVoulu() === 1 && (S.grille === '2' || (S.grille === 'auto' && Q().cpm === 2)) ? ' (grille ramenée à 1 case par mètre : trop de colonnes)' : ''} : terrain régénéré.`); };
  $('ll-resolution').onchange = e => { S.resolution = e.target.value; ecrireP(); dimensionner(); };
  $('ll-reviens').onclick = () => { appliquerQualite(S.qualite, { garder: true }); };
  $('ll-barrage').onclick = () => barrage();
  $('ll-comparer').onclick = basculerComparer; $('ll-partage').onclick = basculerPartage;
  $('ll-meteo-auto').onclick = () => { S.meteoAuto = !S.meteoAuto; majMeteoAuto(); if (S.meteoAuto) { prochainMeteo = 8; if (!S.etapes[7]) { basculerEtape(7, true); toast('La météo est l\'étape 7 : activée.'); } } };
  $('ll-reels').checked = S.reels; $('ll-reels').onchange = e => { S.reels = e.target.checked; };
  $('ll-cycle').onclick = () => { S.cycle = !S.cycle; $('ll-cycle').setAttribute('aria-pressed', String(S.cycle)); };
  document.querySelectorAll('[data-cam]').forEach(b => { b.onclick = () => voirPreset(b.dataset.cam); });
  $('ll-ouvrir').onclick = () => ouvrirReglages($('ll-reglages').hidden); $('ll-fermer').onclick = () => ouvrirReglages(false);
  $('ll-banc').onclick = () => lancerBanc();
  $('ll-export').onclick = () => {
    const j = exporter({ version: $('ll-version').textContent.replace(/^v/, ''), mesures, etat: { ...S, etapes: { ...S.etapes } }, rendu: R, monde: M, banc: banque });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' })), download: `labo-lumiere-${S.qualite}.json` });
    document.body.append(a); a.click(); a.remove(); toast('Mesures exportées.');
  };
  addEventListener('resize', dimensionner);

  const v = await loadVersion(); $('ll-version').textContent = v ? `v${v}` : 'v?';
  const jr = await loadChangelog('CHANGELOG.md', 5);
  $('ll-journal').innerHTML = jr.map(j => `<h4>v${j.version} — ${j.date}</h4><ul>${j.changes.map(c => `<li>${c.replace(/[<>&]/g, '')}</li>`).join('')}</ul>`).join('');
  startUpdateCheck({ isBusy: () => false, onUpdated: ver => toast(`Mis à jour en v${ver}`) });
  window.__lumiere = { S, mesures, meteoNow, METEOS, get comptes() { return comptes; }, get LA() { return LA; }, get M() { return M; }, get L() { return L; }, get R() { return R; }, get C() { return C; }, obus, barrage, basculerEtape, appliquerQualite, voirPreset, scene, lancerBanc, get banque() { return banque; }, tracerMesures, monter, dimensionner };
  requestAnimationFrame(boucle);
}
demarrer();
