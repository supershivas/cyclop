// Les animations du soldat publiées dans le dépôt (assets/design/animations.json), comme les réglages (design-store.js) : l'atelier d'animation les écrit,
// le jeu les lit au démarrage (`chargerAnimationsJeu`, main.js ; étape 4 de docs/chantiers/animations-vers-le-jeu.md). Sans fichier publié, ce sont les animations d'origine (data/animations.js).
// Logique pure (le seul accès réseau est `chargerAnimations`) ; module à part pour ne rien ajouter au chargement du jeu.
import { ANIMATIONS } from './data/animations.js?v=0.131.0';
import { assainir } from './anim-edition.js?v=0.131.0';
import { borner } from './pose-soldat.js?v=0.131.0';

export const FICHIER_ANIMATIONS = 'assets/design/animations.json';
export const FORMAT_ANIMATIONS = 'cyclopeen-animations';        // le même format que « Exporter tout » de l'atelier
export const VERSION_ANIMATIONS = 2;

const copie = a => assainir(structuredClone(a), borner);
export const animationsOrigine = () => ANIMATIONS.map(copie);

// Le contenu du fichier à publier pour une bibliothèque ; refuse à voix haute ce qui ne se joue pas
export function fichierAnimations(biblio) {
  if (!Array.isArray(biblio) || !biblio.length) throw new Error('Aucune animation à publier.');
  const animations = biblio.map(copie), noms = new Set();
  for (const a of animations) {
    if (!a.images.length) throw new Error(`L'animation « ${a.nom} » n'a aucune image.`);
    if (noms.has(a.nom)) throw new Error(`Deux animations s'appellent « ${a.nom} » : renommez-en une.`);
    noms.add(a.nom);
  }
  return { format: FORMAT_ANIMATIONS, v: VERSION_ANIMATIONS, animations };
}

// Les animations d'un fichier publié (déjà lu en JSON) ; un fichier absent, illisible ou vide laisse les animations d'origine
export function lireAnimations(d) {
  const liste = d && d.format === FORMAT_ANIMATIONS && Array.isArray(d.animations) ? d.animations : [];
  const animations = liste.filter(a => a?.images?.length).map(copie);
  return animations.length ? { animations, publie: true } : { animations: animationsOrigine(), publie: false };
}

export async function chargerAnimations() {
  let d = null;
  try { const r = await fetch(FICHIER_ANIMATIONS, { cache: 'no-store' }); d = r.ok ? await r.json() : null; } catch { /* hors ligne : l'origine */ }
  return lireAnimations(d);
}

// Les animations que le jeu joue : celles d'origine, remplacées NOM POUR NOM par celles du fichier publié (une animation qu'il ne publie pas, ou qu'on a renommée, reste celle d'origine :
// le jeu retrouve ses trois animations par leur nom, `ANIM_JEU` de data/lecteur-animations.js, et ne doit jamais en manquer une) ; les autres animations publiées s'ajoutent.
export function fusionAnimations(d) {
  const { animations: publiees, publie } = lireAnimations(d), origine = animationsOrigine();
  if (!publie) return { animations: origine, remplacees: [] };
  const noms = new Set(publiees.map(a => a.nom));
  return { animations: [...origine.filter(a => !noms.has(a.nom)), ...publiees], remplacees: origine.filter(a => noms.has(a.nom)).map(a => a.nom) };
}
export async function chargerAnimationsJeu() {
  let d = null;
  try { const r = await fetch(FICHIER_ANIMATIONS, { cache: 'no-store' }); d = r.ok ? await r.json() : null; } catch { /* hors ligne : l'origine */ }
  return fusionAnimations(d).animations;
}
