// Le contenu modifiable par l'Atelier (section 17) : les réglages chiffrés
// publiés dans le dépôt (assets/design/reglages.json), plus les retouches de
// ce navigateur pas encore publiées. Le jeu l'appelle au lancement.
import { REGLAGES } from './data/reglages.js?v=0.84.1';

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
// Les cartes à vous (l'atelier, v0.38.0) : des secteurs entiers, publiés dans assets/design/cartes.json ; ils s'ajoutent à la liste des parties. Jamais par-dessus un secteur d'origine.
export function appliquerCartes(SECTEURS, cartes) {
  for (const [id, S] of Object.entries(cartes || {})) if (!(id in SECTEURS)) SECTEURS[id] = { ...structuredClone(S), perso: true };
}
// L'identifiant d'une carte neuve, tiré de son nom (sans accent, en minuscules), jamais un déjà pris
export function idCarte(nom, existants) {
  const slug = String(nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'carte';
  let id = `carte-${slug}`, k = 2;
  while (existants.has(id)) id = `carte-${slug}-${k++}`;
  return id;
}
// Une carte neuve : une copie du modèle (un secteur, ou le modèle vierge), sous un autre nom
export const nouvelleCarte = (modele, nom) => { const c = structuredClone(modele); delete c.perso; c.nom = nom; if (modele.nom === nom) c.resume = modele.resume; return c; };
export function appliquerSecteurs(SECTEURS, parId) {
  // les cartes d'origine ne se retouchent pas (Jérôme, v0.61.0) : une retouche d'un secteur d'origine, publiée ou de ce navigateur, est ignorée ; l'atelier en fait une copie, qui est une carte à vous
  for (const [id, r] of Object.entries(parId || {})) if (SECTEURS[id]?.perso) SECTEURS[id] = fusion(SECTEURS[id], r);
}
// Combien de réglages et de retouches de secteur attendent d'être publiés
// La campagne (v0.42.0) : { 1: id, 2: id, 3: id }, la carte de chaque bataille ; publiée dans assets/design/campagne.json, retouchée dans le brouillon (`campagne`).
// Une carte inconnue (supprimée) laisse la place à celle d'origine.
export function appliquerCampagne(CAMPAGNE, SECTEURS, rangs) {
  CAMPAGNE.batailles.forEach((B, i) => { const id = rangs?.[i + 1]; if (id && SECTEURS[id]) B.secteur = id; });
}
export const compterBrouillon = b => Object.keys(b.campagne || {}).length + Object.values(b.reglages || {}).reduce((s, g) => s + Object.keys(g).length, 0)
  + Object.values(b.secteurs || {}).reduce((s, g) => s + Object.keys(g).length, 0)
  + Object.keys(b.cartes || {}).length + (b.supprimees || []).length;

// → { reglages, secteurs, cartes, campagne, publie: { reglages, secteurs, cartes, campagne }, aPublier } ; cartes : { id: secteur entier }, les cartes à vous (publiées, puis celles de ce navigateur) ; secteurs : { id: retouches } en objets, à poser sur SECTEURS (`appliquerSecteurs`)
export async function chargerContenu() {
  const [reglages, secteursPublies, cartesPubliees, campagnePubliee] = await Promise.all([lireJSON('assets/design/reglages.json'), lireJSON('assets/design/secteurs.json'), lireJSON('assets/design/cartes.json'), lireJSON('assets/design/campagne.json')]);
  const publie = { reglages: fusion(REGLAGES, reglages), secteurs: secteursPublies || {}, cartes: cartesPubliees || {}, campagne: campagnePubliee || {} };
  const b = lireBrouillon();
  const cartes = { ...publie.cartes, ...(b.cartes || {}) };
  for (const id of b.supprimees || []) delete cartes[id];
  const secteurs = {};
  for (const id of new Set([...Object.keys(publie.secteurs), ...Object.keys(b.secteurs || {})])) secteurs[id] = fusion(publie.secteurs[id] || {}, deplier(b.secteurs?.[id]));
  return { reglages: fusion(publie.reglages, b.reglages), secteurs, cartes, campagne: { ...publie.campagne, ...(b.campagne || {}) }, publie, aPublier: compterBrouillon(b) };
}
