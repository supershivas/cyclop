// Les mesures du labo lumière : chronomètres autour de chaque calcul, moyennes glissantes, budgets, banc GPU, export JSON.
// Le seul module du labo qui lit l'horloge (la logique du terrain, de la lumière et de la foule n'en a pas).
import { ETAPES, BUDGET_IMAGE_MS, BUDGET_RECALCUL_CHUNK_MS } from './config.js?v=0.121.0';

const maintenant = () => performance.now();

export function creerMesures() {
  const m = { v: new Map(), images: [], banc: null, evenements: [] };
  // note une valeur (ms) sous un nom : dernière, moyenne glissante, pire, nombre
  m.noter = (nom, ms) => {
    const e = m.v.get(nom) || { dernier: 0, moy: ms, max: 0, n: 0 };
    e.dernier = ms; e.moy = e.n ? e.moy * 0.8 + ms * 0.2 : ms; e.max = Math.max(e.max, ms); e.n++;
    m.v.set(nom, e); return ms;
  };
  m.temps = (nom, f) => { const t = maintenant(); const r = f(); m.noter(nom, maintenant() - t); return r; };
  m.chrono = (nom, f) => { const t = maintenant(); f(); const ms = maintenant() - t; m.noter(nom, ms); return ms; };    // comme `temps`, mais rend les ms
  m.lire = nom => m.v.get(nom) || null;
  m.imageFaite = (ms) => { m.images.push(ms); if (m.images.length > 120) m.images.shift(); };
  m.fps = () => { const a = m.images; if (a.length < 2) return 0; const s = a.reduce((x, y) => x + y, 0); return 1000 * a.length / s; };
  m.msImage = () => { const a = m.images; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; };
  m.evenement = (texte) => { m.evenements.push({ texte }); if (m.evenements.length > 30) m.evenements.shift(); };
  return m;
}

// Le dépassement d'un budget : la valeur et le budget, ou null. Une étape qui dépasse est signalée au panneau, jamais masquée.
export function depassement(valeur, budget) { return budget > 0 && valeur != null && valeur > budget ? { valeur, budget } : null; }

// Le banc GPU : le coût propre de chaque étape, seule puis cumulée, en millisecondes par image.
// `appliquer(etapes)` règle les étapes (objet { 1: bool … }) ; `image()` dessine une image ET attend la fin ; `preparer()` met en place de quoi éclairer / fumer (un flash, de la fumée) pendant le banc.
export async function banc({ appliquer, image, preparer, rendre, frames = 18, progression = () => {} }) {
  const tailles = {}; const mediane = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 4)]; };   // le meilleur quart : le bruit du processeur ne rend jamais une image plus rapide qu'elle n'est
  const mesurer = async (etapes) => {
    appliquer(etapes); await new Promise(r => setTimeout(r, 0));
    for (let k = 0; k < 3; k++) image();
    const t = [];
    for (let k = 0; k < frames; k++) { const t0 = maintenant(); image(); t.push(maintenant() - t0); if (k % 6 === 5) await new Promise(r => setTimeout(r, 0)); }
    return mediane(t);
  };
  const aucune = Object.fromEntries(ETAPES.map(e => [e.id, false]));
  preparer && preparer();
  const base = await mesurer(aucune);
  const seule = {}, cumul = {}; const cumulee = { ...aucune };
  for (const e of ETAPES) {
    if (e.id === 3) continue;                             // l'étape 3 est du calcul (le recalcul local), pas du dessin
    progression(`étape ${e.id}…`);
    seule[e.id] = await mesurer({ ...aucune, [e.id]: true });
    cumulee[e.id] = true; cumul[e.id] = await mesurer({ ...cumulee });
  }
  rendre && rendre();
  const marginal = Object.fromEntries(Object.entries(seule).map(([k, v]) => [k, Math.max(0, v - base)]));
  const sauts = {}; let prec = base; for (const e of ETAPES) if (cumul[e.id] != null) { sauts[e.id] = Math.max(0, cumul[e.id] - prec); prec = cumul[e.id]; }
  return { base, seule, marginal, cumul, sauts, toutes: cumul[8] ?? prec, frames, tailles };
}

// L'export JSON : de quoi décider quoi garder dans le vrai jeu
export function exporter({ version, mesures, etat, rendu, monde, banc }) {
  const lire = n => { const e = mesures.lire(n); return e ? { dernier_ms: +e.dernier.toFixed(3), moyenne_ms: +e.moy.toFixed(3), pire_ms: +e.max.toFixed(3), mesures: e.n } : null; };
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
    image: { fps: +mesures.fps().toFixed(1), ms: +mesures.msImage().toFixed(2), budget_ms: BUDGET_IMAGE_MS, triangles: Math.round(rendu.stats.triangles), appels: rendu.stats.appels, gpu_ms: rendu.gpu },
    recalcul_chunk_apres_obus: { total, budget_ms: BUDGET_RECALCUL_CHUNK_MS, depasse: !!depassement(total?.moyenne_ms, BUDGET_RECALCUL_CHUNK_MS), maillage },
    foule: { ms: lire('foule') },
    etapes, banc,
    remarque: rendu.info.logiciel ? 'Rendu logiciel : les temps GPU ne sont pas représentatifs, seuls les rapports entre étapes le sont.' : '',
  };
}
