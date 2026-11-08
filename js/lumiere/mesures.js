// Les mesures du labo lumière : chronomètres autour de chaque calcul, moyennes glissantes, budgets, banc GPU, export JSON.
// Le seul module du labo qui lit l'horloge (la logique du terrain, de la lumière et de la foule n'en a pas).
import { ETAPES, BUDGET_IMAGE_MS, BUDGET_RECALCUL_CHUNK_MS, BANC } from './config.js?v=0.116.0';

const maintenant = () => performance.now();

// La résolution de l'horloge, en ms : le plus petit saut non nul de performance.now() vu en tournant dans une boucle (≈ 0,005 ms sous Chrome, 1 ms sous Firefox, 100 ms avec « resistFingerprinting »).
// Toute durée plus courte que cela est de la quantification : une mesure d'un seul appel ne dit rien, il faut des lots (le banc) ou des moyennes (les chronomètres de `noter`).
export function resolutionHorloge(essais = 400000, now = maintenant) {
  let mini = Infinity, a = now();
  for (let k = 0; k < essais; k++) { const b = now(); if (b > a) { mini = Math.min(mini, b - a); if (mini < 0.0005) break; a = b; } }
  return Number.isFinite(mini) ? mini : 0;
}

export function creerMesures() {
  const m = { v: new Map(), images: [], banc: null, evenements: [], resolution: resolutionHorloge() };
  // note une valeur (ms) sous un nom : dernière, moyenne glissante, pire, nombre
  m.noter = (nom, ms) => {
    const e = m.v.get(nom) || { dernier: 0, moy: ms, max: 0, n: 0 };
    e.dernier = ms; e.moy = e.n ? e.moy * 0.8 + ms * 0.2 : ms; e.max = Math.max(e.max, ms); e.n++;
    m.v.set(nom, e); return ms;
  };
  m.temps = (nom, f) => { const t = maintenant(); const r = f(); m.noter(nom, maintenant() - t); return r; };
  m.chrono = (nom, f) => { const t = maintenant(); f(); const ms = maintenant() - t; m.noter(nom, ms); return ms; };    // comme `temps`, mais rend les ms
  m.lire = nom => m.v.get(nom) || null;
  // Le pire d'une mesure, ou null quand il n'est que de la quantification de l'horloge (≤ 1,5 résolution, sur une horloge grossière) : on n'affiche pas 1 ms pour un calcul de 0,006 ms
  m.pire = nom => { const e = m.v.get(nom); if (!e) return null; return m.resolution >= 0.05 && e.max <= m.resolution * 1.5 ? null : e.max; };
  m.imageFaite = (ms) => { m.images.push(ms); if (m.images.length > 120) m.images.shift(); };
  m.fps = () => { const a = m.images; if (a.length < 2) return 0; const s = a.reduce((x, y) => x + y, 0); return 1000 * a.length / s; };
  m.msImage = () => { const a = m.images; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; };
  m.evenement = (texte) => { m.evenements.push({ texte }); if (m.evenements.length > 30) m.evenements.shift(); };
  return m;
}

// Le dépassement d'un budget : la valeur et le budget, ou null. Une étape qui dépasse est signalée au panneau, jamais masquée.
export function depassement(valeur, budget) { return budget > 0 && valeur != null && valeur > budget ? { valeur, budget } : null; }

// Le banc GPU : le coût propre de chaque étape, seule puis cumulée, en millisecondes par image.
// Fiable sous Firefox (v0.114.0) : cette horloge arrondit à 1 ms (100 ms avec la protection de la vie privée), et le « meilleur quart de 18 images » du premier banc lisait donc des 4 ou 5 ms à ±1 ms près,
// sur une file d'images que le GPU n'avait pas finies. Maintenant : des LOTS d'images, assez longs pour que la résolution de l'horloge compte pour moins de 2 % (`fenetreMs`, et 40 fois la résolution),
// la fin du dessin attendue une seule fois par lot (`fin()`), et la médiane de plusieurs lots ; chaque mesure porte son incertitude (résolution / images du lot).
// `appliquer(etapes)` règle les étapes ; `image()` DESSINE une image (sans attendre) ; `fin()` attend la fin du dessin ; `preparer()` met en place de quoi éclairer / fumer ; `now` et `pause` s'injectent pour le test.
export async function banc({ appliquer, image, fin, preparer, rendre, lots = BANC.lots, progression = () => {}, now = maintenant, resolution = m_res(now), pause = () => new Promise(r => setTimeout(r, 0)), fenetreMs = BANC.fenetreMs }) {
  const mediane = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor((b.length - 1) / 2)]; };
  const fenetre = Math.max(fenetreMs, resolution * 40), details = {};
  const lot = n => { const t0 = now(); for (let k = 0; k < n; k++) image(); fin(); return (now() - t0); };
  const mesurer = async (etapes, cle) => {
    appliquer(etapes); await pause();
    for (let k = 0; k < 2; k++) image(); fin();                                       // les compilations et les tampons se font ici
    let n = 1, d = lot(1);
    while (d < fenetre && n < BANC.imagesMax) { n = Math.min(BANC.imagesMax, Math.max(n + 1, Math.ceil(n * fenetre * 1.15 / Math.max(d, resolution * 0.5, 1e-3)))); d = lot(n); }
    const nbLots = d / n > BANC.lentMs ? BANC.lotsLents : lots, t = [d / n];
    for (let k = 1; k < nbLots; k++) { await pause(); t.push(lot(n) / n); }
    const med = mediane(t); details[cle] = { ms: med, images_par_lot: n, lots: t.length, min: Math.min(...t), max: Math.max(...t), incertitude: resolution / n };
    return med;
  };
  const aucune = Object.fromEntries(ETAPES.map(e => [e.id, false]));
  preparer && preparer();
  const base = await mesurer(aucune, 'base');
  const seule = {}, cumul = {}; const cumulee = { ...aucune };
  for (const e of ETAPES) {
    if (e.id === 3) continue;                             // l'étape 3 est du calcul (le recalcul local), pas du dessin
    progression(`étape ${e.id}…`);
    seule[e.id] = await mesurer({ ...aucune, [e.id]: true }, `seule:${e.id}`);
    cumulee[e.id] = true; cumul[e.id] = await mesurer({ ...cumulee }, `cumul:${e.id}`);
  }
  rendre && rendre();
  const marginal = Object.fromEntries(Object.entries(seule).map(([k, v]) => [k, Math.max(0, v - base)]));
  const sauts = {}; let prec = base; for (const e of ETAPES) if (cumul[e.id] != null) { sauts[e.id] = Math.max(0, cumul[e.id] - prec); prec = cumul[e.id]; }
  const dernier = ETAPES[ETAPES.length - 1].id;
  const incertitude = Math.max(...Object.values(details).map(d => d.incertitude));
  return { base, seule, marginal, cumul, sauts, toutes: cumul[dernier] ?? prec, details, resolution, incertitude, methode: 'lots' };
}
const m_res = now => resolutionHorloge(400000, now);

// L'export JSON : de quoi décider quoi garder dans le vrai jeu
export function exporter({ version, mesures, etat, rendu, monde, banc }) {
  const lire = n => { const e = mesures.lire(n); return e ? { dernier_ms: +e.dernier.toFixed(3), moyenne_ms: +e.moy.toFixed(3), pire_ms: +e.max.toFixed(3), pire_quantifie: mesures.resolution >= 0.05 && e.max <= mesures.resolution * 1.5, mesures: e.n } : null; };
  const etapes = ETAPES.map(e => {
    const g = lire(`global:${e.id}`), c = lire(`chunk:${e.id}`), b = banc ? banc.marginal[e.id] : null;
    return { etape: e.id, nom: e.nom, active: !!etat.etapes[e.id], budget: e.budget, cpu_global: g, cpu_chunk: c, gpu_banc_ms: b != null ? +b.toFixed(3) : null,
      depasse: [depassement(g?.moyenne_ms, e.budget.globalMs) && 'global', depassement(c?.moyenne_ms, e.budget.chunkMs) && 'chunk', depassement(b, e.budget.gpuMs) && 'gpu'].filter(Boolean) };
  });
  const total = lire('recalcul:total'), maillage = lire('maillage:chunk');
  return {
    page: 'Labo lumière — Cyclopéen', version, date: new Date().toISOString(), navigateur: navigator.userAgent, rendu: rendu.info,
    qualite: etat.qualite, surcharges: [...etat.surcharges], resolution_image: etat.resolution, heure: etat.heure, jour: etat.jour, meteo: etat.meteo,
    grille: { cases_par_metre: monde.cpm, largeur: monde.W, profondeur: monde.H, colonnes: monde.n, chunks: monde.cw * monde.chh, taille_chunk_cases: monde.chunk },
    unites: etat.unites, obus_tires: monde.obusTires,
    horloge_resolution_ms: +mesures.resolution.toFixed(4), chrono_gpu: !!rendu.info.chronoGPU,
    image: { fps: +mesures.fps().toFixed(1), ms: +mesures.msImage().toFixed(2), budget_ms: BUDGET_IMAGE_MS, triangles: Math.round(rendu.stats.triangles), appels: rendu.stats.appels, gpu_ms: rendu.gpu },
    recalcul_chunk_apres_obus: { total, budget_ms: BUDGET_RECALCUL_CHUNK_MS, depasse: !!depassement(total?.moyenne_ms, BUDGET_RECALCUL_CHUNK_MS), maillage },
    foule: { ms: lire('foule') },
    etapes, banc,
    remarque: rendu.info.logiciel ? 'Rendu logiciel : les temps GPU ne sont pas représentatifs, seuls les rapports entre étapes le sont.' : '',
  };
}
