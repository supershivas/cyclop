// Le contenu modifiable par l'Atelier (section 17) : les réglages chiffrés
// publiés dans le dépôt (assets/design/reglages.json), plus les retouches de
// ce navigateur pas encore publiées. Le jeu l'appelle au lancement.
import { REGLAGES } from './data/reglages.js?v=0.37.0';

const BROUILLON = 'cyclopeen:atelier';

async function lireJSON(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export function lireBrouillon() {
  try { return JSON.parse(localStorage.getItem(BROUILLON)) || {}; } catch { return {}; }
}
export function ecrireBrouillon(b) {
  try { localStorage.setItem(BROUILLON, JSON.stringify(b)); } catch { /* plein ou bloqué */ }
}

const fusion = (base, plus) => {
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(plus || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' ? fusion(out[k], v) : v;
  }
  return out;
};

// Les chemins d'un secteur (« relief.bosses ») : le brouillon les garde à plat, le fichier publié en objets
export const lireChemin = (o, cle) => cle.split('.').reduce((x, k) => x?.[k], o);
export function deplier(plat) {
  const out = {};
  for (const [cle, v] of Object.entries(plat || {})) {
    const ks = cle.split('.'); let o = out;
    for (const k of ks.slice(0, -1)) o = o[k] = o[k] || {};
    o[ks.at(-1)] = v;
  }
  return out;
}
// Le secteur tel que le jeu le lit : sa donnée, les retouches publiées, puis celles de ce navigateur
export const secteurEffectif = (base, ...retouches) => retouches.reduce((S, r) => fusion(S, r || {}), base);
export function appliquerSecteurs(SECTEURS, parId) {
  for (const [id, r] of Object.entries(parId || {})) if (SECTEURS[id]) SECTEURS[id] = fusion(SECTEURS[id], r);
}
// Combien de réglages et de retouches de secteur attendent d'être publiés
export const compterBrouillon = b => Object.values(b.reglages || {}).reduce((s, g) => s + Object.keys(g).length, 0)
  + Object.values(b.secteurs || {}).reduce((s, g) => s + Object.keys(g).length, 0);

// → { reglages, secteurs, publie: { reglages, secteurs }, aPublier } ; secteurs : { id: retouches } en objets, à poser sur SECTEURS (`appliquerSecteurs`)
export async function chargerContenu() {
  const [reglages, secteursPublies] = await Promise.all([lireJSON('assets/design/reglages.json'), lireJSON('assets/design/secteurs.json')]);
  const publie = { reglages: fusion(REGLAGES, reglages), secteurs: secteursPublies || {} };
  const b = lireBrouillon();
  const secteurs = {};
  for (const id of new Set([...Object.keys(publie.secteurs), ...Object.keys(b.secteurs || {})])) secteurs[id] = fusion(publie.secteurs[id] || {}, deplier(b.secteurs?.[id]));
  return { reglages: fusion(publie.reglages, b.reglages), secteurs, publie, aPublier: compterBrouillon(b) };
}
