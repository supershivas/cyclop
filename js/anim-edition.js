// L'édition des images clés d'une animation du soldat (logique pure : aucun DOM, aucune horloge) : tout ce qu'un outil d'animation à images clés fait sur une frise.
// Une animation : { nom, mode, duree, images: [{ id, t, pose, courbe }] } (js/pose-soldat.js). Les fonctions modifient l'animation reçue (l'atelier prend une photo avant chaque geste, pour annuler)
// et rendent ce qu'elles ont créé ou changé. Les images sont toujours rangées par t croissant ; deux images ne sont jamais au même instant (à 0,1 ms près : la dernière posée l'emporte).
import { COURBE_INVERSE, CANAUX, COURBES } from './data/poses-soldat.js?v=0.131.0';
import { echantillon, melanger, miroir, poseNeutre } from './pose-soldat.js?v=0.131.0';

const EPS = 1e-4;
const ensemble = ids => ids instanceof Set ? ids : new Set(ids ?? []);
const copie = o => JSON.parse(JSON.stringify(o));
const trier = anim => { anim.images.sort((a, b) => a.t - b.t); return anim; };

// ─── les numéros d'images ───
export const prochainId = anim => 'k' + (1 + Math.max(0, ...anim.images.map(i => parseInt(String(i.id).replace(/\D/g, ''), 10) || 0)));
export function completerIds(anim) { for (const i of anim.images) if (!i.id) i.id = prochainId(anim); return anim; }
export const cle = (anim, id) => anim.images.find(i => i.id === id) ?? null;
export const idsDe = anim => anim.images.map(i => i.id);
export const finDe = anim => anim.images.length ? Math.max(...anim.images.map(i => i.t)) : 0;

// Deux images au même instant : celle qui n'est pas `gardees` disparaît
function fusionner(anim, gardees) {
  const g = ensemble(gardees);
  trier(anim);
  const sortie = [];
  for (const im of anim.images) {
    const prec = sortie[sortie.length - 1];
    if (prec && Math.abs(prec.t - im.t) < EPS) { if (g.has(im.id) || !g.has(prec.id)) sortie[sortie.length - 1] = im; }
    else sortie.push(im);
  }
  anim.images = sortie;
}
const etendre = anim => { anim.duree = Math.max(anim.duree, finDe(anim)); };

// ─── créer ───
// Une image à l'instant t avec la pose donnée ; s'il y en a déjà une à cet instant, sa pose est remplacée
export function ajouterCle(anim, t, pose, courbe = 'doux') {
  t = Math.max(0, t);
  const ex = anim.images.find(i => Math.abs(i.t - t) < EPS);
  if (ex) { ex.pose = { ...pose }; if (courbe) ex.courbe = courbe; return ex; }
  const k = { id: prochainId(anim), t, pose: { ...pose }, courbe };
  anim.images.push(k); trier(anim); etendre(anim);
  return k;
}
// Une image intermédiaire entre l'image `id` et la suivante (ou la précédente pour la dernière), avec la pose que l'interpolation y donne
export function insererEntre(anim, id) {
  trier(anim);
  const i = anim.images.findIndex(k => k.id === id); if (i < 0 || anim.images.length < 2) return null;
  const autre = anim.images[i + 1] ?? anim.images[i - 1], t = (anim.images[i].t + autre.t) / 2;
  return ajouterCle(anim, t, echantillon(anim, t), anim.images[i].courbe);
}
// La pose de l'image `id` tenue jusqu'à l'instant `jusqua` (une image identique plus loin) : la pose dure
export function maintenir(anim, id, jusqua) {
  const k = cle(anim, id); if (!k || jusqua <= k.t + EPS) return null;
  return ajouterCle(anim, jusqua, k.pose, k.courbe);
}

// ─── supprimer, dupliquer, copier, coller ───
export function supprimerCles(anim, ids) {
  const g = ensemble(ids), avant = anim.images.length;
  const reste = anim.images.filter(i => !g.has(i.id));
  if (!reste.length) { trier(anim); anim.images = [anim.images[0]]; return avant - 1; }       // il reste toujours une image
  anim.images = reste; return avant - reste.length;
}
// Les images choisies recopiées plus loin (`ecart` secondes ; par défaut juste après le groupe, d'un pas `pas`) : rend les nouveaux numéros
export function dupliquerCles(anim, ids, { ecart = null, pas = 0.1 } = {}) {
  const sel = anim.images.filter(i => ensemble(ids).has(i.id)); if (!sel.length) return [];
  const t0 = Math.min(...sel.map(i => i.t)), t1 = Math.max(...sel.map(i => i.t)), d = ecart ?? (t1 - t0 + pas);
  const nouvelles = sel.map(i => ({ id: null, t: i.t + d, pose: { ...i.pose }, courbe: i.courbe }));
  for (const n of nouvelles) { n.id = prochainId({ images: [...anim.images, ...nouvelles.filter(x => x.id)] }); anim.images.push(n); }
  fusionner(anim, nouvelles.map(n => n.id)); etendre(anim);
  return nouvelles.map(n => n.id);
}
// Un presse-papiers : les images choisies, leurs instants relatifs à la première
export function copierCles(anim, ids) {
  const sel = trier(anim).images.filter(i => ensemble(ids).has(i.id)); if (!sel.length) return null;
  const t0 = sel[0].t;
  return { cles: sel.map(i => ({ dt: i.t - t0, pose: { ...i.pose }, courbe: i.courbe })), span: sel[sel.length - 1].t - t0 };
}
// Coller à l'instant t ; `canaux` (une liste de noms de CANAUX) : seuls ces groupes de champs sont collés, le reste garde ce que l'animation y donne déjà
export function collerCles(anim, presse, t, { canaux = null } = {}) {
  if (!presse?.cles?.length) return [];
  const champs = canaux?.length ? canaux.flatMap(c => CANAUX[c] ?? []) : null, ids = [];
  const bases = presse.cles.map(c => champs ? echantillon(anim, t + c.dt) : null);       // (les poses d'avant le collage, pas celles qu'il crée)
  presse.cles.forEach((c, n) => {
    const pose = champs ? { ...bases[n], ...Object.fromEntries(champs.map(f => [f, c.pose[f]])) } : { ...c.pose };
    ids.push(ajouterCle(anim, t + c.dt, pose, c.courbe).id);
  });
  return ids;
}

// ─── le temps ───
// Décaler les images choisies de `dt` secondes (jamais avant 0) ; celles qui en recouvrent une autre la remplacent. Rend le décalage réellement appliqué
export function deplacerCles(anim, ids, dt) {
  const g = ensemble(ids), sel = anim.images.filter(i => g.has(i.id)); if (!sel.length) return 0;
  dt = Math.max(dt, -Math.min(...sel.map(i => i.t)));
  for (const i of sel) i.t += dt;
  fusionner(anim, g); etendre(anim);
  return dt;
}
// Le glissé d'images à la souris : `placerCles` pose les images choisies à leur instant d'origine + dt (sans rien fusionner : on peut repasser sur une autre image et revenir), `finirDeplacement`
// règle les recouvrements au relâchement. `origines` : Map numéro → instant de départ. Rend le décalage réellement appliqué (jamais avant 0).
export function placerCles(anim, ids, origines, dt) {
  const g = ensemble(ids), sel = anim.images.filter(i => g.has(i.id) && origines.has(i.id)); if (!sel.length) return 0;
  dt = Math.max(dt, -Math.min(...sel.map(i => origines.get(i.id))));
  for (const i of sel) i.t = origines.get(i.id) + dt;
  trier(anim); etendre(anim);
  return dt;
}
export function finirDeplacement(anim, ids) { fusionner(anim, ids); etendre(anim); }
// Étirer le temps (facteur > 0) autour de `pivot` : les images choisies, ou toutes (et la durée) si `ids` est nul
export function etirerCles(anim, ids, facteur, pivot = null) {
  facteur = Math.max(0.02, facteur);
  const g = ids ? ensemble(ids) : null, sel = g ? anim.images.filter(i => g.has(i.id)) : anim.images; if (!sel.length) return;
  const p = pivot ?? (g ? Math.min(...sel.map(i => i.t)) : 0);
  for (const i of sel) i.t = Math.max(0, p + (i.t - p) * facteur);
  if (!g) anim.duree = Math.max(0.05, anim.duree * facteur);
  fusionner(anim, g ?? []); etendre(anim);
}
// Jouer les images choisies (ou toutes) à l'envers : l'ordre s'inverse sur leur étendue, et la courbe de chaque segment aussi
export function inverserCles(anim, ids = null) {
  const g = ids ? ensemble(ids) : null;
  const sel = trier(anim).images.filter(i => !g || g.has(i.id)); if (sel.length < 2) return;
  const t0 = sel[0].t, t1 = sel[sel.length - 1].t, anciennes = sel.map(i => i.courbe);
  sel.forEach((i, n) => { i.t = t0 + t1 - i.t; if (n > 0) i.courbe = COURBE_INVERSE[anciennes[n - 1]] ? COURBE_INVERSE[anciennes[n - 1]] : anciennes[n - 1]; });
  trier(anim);
}
// Espacer régulièrement les images choisies entre la première et la dernière
export function repartirCles(anim, ids) {
  const sel = trier(anim).images.filter(i => ensemble(ids).has(i.id)); if (sel.length < 3) return;
  const t0 = sel[0].t, t1 = sel[sel.length - 1].t;
  sel.forEach((i, n) => { i.t = t0 + (t1 - t0) * n / (sel.length - 1); });
}
// Caler les instants sur la grille d'images (1/fps)
export function quantifierCles(anim, ids, fps) {
  const g = ids ? ensemble(ids) : null;
  for (const i of anim.images) if (!g || g.has(i.id)) i.t = Math.max(0, Math.round(i.t * fps) / fps);
  fusionner(anim, g ?? []); etendre(anim);
}
// La durée de l'animation : la dernière image, plus `marge` (en boucle, le temps du retour à la première)
export function ajusterDuree(anim, marge = 0) { anim.duree = Math.max(0.05, finDe(anim) + marge); return anim.duree; }

// ─── les poses ───
export function miroirCles(anim, ids = null) {
  const g = ids ? ensemble(ids) : null;
  for (const i of anim.images) if (!g || g.has(i.id)) i.pose = miroir(i.pose);
}
export function appliquerCourbe(anim, ids, courbe) {
  if (!COURBES[courbe]) return;
  const g = ensemble(ids);
  for (const i of anim.images) if (g.has(i.id)) i.courbe = courbe;
}
// Une image au milieu de deux autres (mélange des poses des deux images choisies, fraction k)
export function melangerCles(anim, idA, idB, k = 0.5) {
  const a = cle(anim, idA), b = cle(anim, idB); if (!a || !b) return null;
  return ajouterCle(anim, a.t + (b.t - a.t) * k, melanger(a.pose, b.pose, k), a.courbe);
}

// ─── la sélection ───
export const toutes = anim => new Set(idsDe(anim));
export const inverserSelection = (anim, ids) => { const g = ensemble(ids); return new Set(idsDe(anim).filter(i => !g.has(i))); };
export const clesDansIntervalle = (anim, t0, t1) => new Set(anim.images.filter(i => i.t >= Math.min(t0, t1) - EPS && i.t <= Math.max(t0, t1) + EPS).map(i => i.id));
// L'image la plus proche avant / après l'instant t (pour « image clé précédente / suivante »)
export const clePrecedente = (anim, t) => [...trier(anim).images].reverse().find(i => i.t < t - EPS) ?? null;
export const cleSuivante = (anim, t) => trier(anim).images.find(i => i.t > t + EPS) ?? null;

// ─── les animations et la bibliothèque ───
export const copierAnimation = a => copie(a);
export function miroirAnimation(a, suffixe = ' (gaucher)') {
  const m = copie(a); m.nom = a.nom + suffixe;
  for (const i of m.images) i.pose = miroir(i.pose);
  return m;
}
export function nomUnique(liste, nom) {
  const pris = new Set(liste.map(a => a.nom));
  if (!pris.has(nom)) return nom;
  const racine = nom.replace(/ \d+$/, '');
  for (let n = 2; ; n++) if (!pris.has(`${racine} ${n}`)) return `${racine} ${n}`;
}
export function animationVide(nom = 'animation', pose = poseNeutre()) {
  return { nom, mode: 'boucle', duree: 1, images: [{ id: 'k1', t: 0, pose: { ...pose }, courbe: 'doux' }] };
}
// Une animation lue d'un fichier ou du navigateur : images rangées, numéros, courbes et mode valides, poses complètes (aucune limite de valeur)
export function assainir(a, borner) {
  const images = (a?.images ?? []).map(i => ({ id: i.id, t: Math.max(0, +i.t || 0), pose: { ...poseNeutre(), ...borner(i.pose ?? {}) }, courbe: COURBES[i.courbe] ? i.courbe : 'doux' }));
  const r = { nom: String(a?.nom ?? 'animation').slice(0, 40), mode: ['boucle', 'unefois', 'allerretour'].includes(a?.mode) ? a.mode : a?.boucle === false ? 'unefois' : 'boucle', duree: 1, images };
  if (!images.length) return animationVide(r.nom);
  const vus = new Set();
  for (const i of images) if (!i.id || vus.has(i.id)) i.id = null; else vus.add(i.id);
  trier(r); completerIds(r); fusionner(r, []);
  r.duree = Math.max(0.05, +a?.duree || finDe(r)); etendre(r);
  return r;
}
