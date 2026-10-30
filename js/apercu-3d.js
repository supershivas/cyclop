// Un aperçu 3D d'un secteur : celui de l'Atelier (vue 3D de l'éditeur de carte) et celui du choix d'un secteur à la nouvelle partie. Le MÊME moteur que le jeu (`creerRendu` de rendu3d.js) posé sur une bataille de départ montée sur le secteur retouché
// (`nouvelleBataille`) : ce qu'on y voit est ce que le joueur verra (sol en cubes, tranchées, arbres, soldats, lumière du jour). En lecture seule : on la regarde
// (tourner, déplacer, zoomer) et l'on y construit : un clic sur le sol est rendu à l'éditeur (`surClic`, `surSurvol`, en mètres du terrain), qui dessine ses formes par-dessus
// (`surcouche`, projetées par `versEcran` : elles suivent le relief et la perspective). Chargée à la demande (three.js ne se charge qu'au premier passage en 3D).
import { creerRendu, CAMERA } from './rendu3d.js?v=0.99.3';
import { nouvelleBataille, regarderAu } from './bataille.js?v=0.99.3';
import { SECTEURS } from './data/secteur.js?v=0.99.3';

export async function creerVue3D({ R, hote, rotation = 0 }) {       // rotation : rad/s, la caméra tourne seule (le choix d'un secteur) ; l'atelier la laisse immobile
  const canvas = document.createElement('canvas');
  const sur = document.createElement('canvas');                      // la surcouche : les formes de l'éditeur, projetées sur le sol
  sur.className = 'ed-3d-sur';
  Object.assign(sur.style, { position: 'absolute', pointerEvents: 'none' });      // (sans CSS de la page : l'aperçu du choix d'un secteur n'a pas celui de l'atelier)
  hote.replaceChildren(canvas, sur);
  const rendu = await creerRendu(canvas, { respiration: 0 });      // la caméra ne respire pas : on construit, on ne joue pas
  rendu.bord = 'faux-noir';
  let B = null, actif = false, boucle = 0, derniere = 0, vu = false, ambiance = [12, 'sec'];

  // une bataille de départ sur le secteur `S` (déjà retouché) : `nouvelleBataille` lit `SECTEURS[id]`, qu'on remplace le temps de la monter
  function monter(id, S, graine, { soldats = true, cadrer = false, saison } = {}) {
    const avant = SECTEURS[id], v = rendu.vue, garde = vu && { cx: v.cx, cz: v.cz, zoom: v.zoom, yaw: v.cible.yaw, tangage: v.cible.tangage };
    SECTEURS[id] = S;
    try { B = nouvelleBataille(graine, R, { secteur: id, jours: 3, ...(saison ? { saison } : {}), ...(soldats ? {} : { soldats: 16 }) }); } finally { if (avant === undefined) delete SECTEURS[id]; else SECTEURS[id] = avant; }
    regarderAu(B, ambiance[0], saison === 'hiver' ? 'beau' : saison === 'ete' ? 'canicule' : ambiance[1]);      // le temps typique de la saison choisie
    rendu.attacher(B);
    rendu.redimensionner();
    if (cadrer) {                      // tout le secteur, au centre, vu de haut
      const m = S.marges; v.cx = m.x + S.largeur / 2; v.cz = m.y + S.hauteur / 2; v.zoom = 0; rendu.placerCamera(garde ? garde.yaw : CAMERA.yaw, 1.0); vu = true;
    } else if (garde) { v.cx = garde.cx; v.cz = garde.cz; v.zoom = garde.zoom; rendu.placerCamera(garde.yaw, garde.tangage); }
    else { rendu.placerCamera(CAMERA.yaw, CAMERA.tangage); v.zoom = 1; vu = true; }
    rendu.dessiner(0.033, []);
  }
  function image(t) {
    if (!actif) return;
    const dt = Math.min(0.1, (t - derniere) / 1000 || 0.033); derniere = t;
    if (rotation && !g) rendu.tourner(rotation * dt);
    if (B) { rendu.dessiner(dt, []); peindreSurcouche(); }
    boucle = requestAnimationFrame(image);
  }
  function activer(oui) {
    if (oui === actif) return;
    actif = oui;
    if (oui) { rendu.redimensionner(); derniere = performance.now(); boucle = requestAnimationFrame(image); } else cancelAnimationFrame(boucle);
  }

  function peindreSurcouche() {
    const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (!api.surcouche || !w) return;
    if (sur.width !== Math.round(w * dpr) || sur.height !== Math.round(h * dpr)) { sur.width = Math.round(w * dpr); sur.height = Math.round(h * dpr); }
    Object.assign(sur.style, { left: `${canvas.offsetLeft}px`, top: `${canvas.offsetTop}px`, width: `${w}px`, height: `${h}px` });
    const ctx = sur.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    api.surcouche(ctx, (x, y) => rendu.versEcran(x, y));
  }
  // un point de l'écran → [x, z] du terrain (null : le ciel)
  function sousLaSouris(e) {
    const r = canvas.getBoundingClientRect(), p = rendu.versTerrain(e.clientX - r.left, e.clientY - r.top);
    return p[0] < -1e4 ? null : p;
  }

  // la souris : glisser tourne et incline, le bouton droit (ou Maj, ou la molette) déplace, la molette zoome ; un clic (sans glisser) est rendu à l'éditeur
  let g = null;
  hote.addEventListener('contextmenu', e => e.preventDefault());
  hote.addEventListener('pointerdown', e => { g = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, bouge: false, bouton: e.button, deplacer: e.button !== 0 || e.shiftKey }; hote.setPointerCapture(e.pointerId); });
  hote.addEventListener('pointermove', e => {
    if (!g) { api.surSurvol?.(sousLaSouris(e)); return; }
    if (!g.bouge && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 4) return;      // un clic qui tremble n'est pas un glissé
    g.bouge = true;
    const dx = e.clientX - g.x, dy = e.clientY - g.y; g.x = e.clientX; g.y = e.clientY;
    if (g.deplacer) { const k = (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm; rendu.deplacerEcran(-dx * k, -dy * k); }
    else rendu.tourner(dx * 0.004, -dy * 0.003);
  });
  hote.addEventListener('pointerup', e => { const clic = g && !g.bouge && g.bouton === 0 && !g.deplacer; g = null; if (clic) api.surClic?.(sousLaSouris(e), e); });
  hote.addEventListener('pointerleave', () => { api.surSurvol?.(null); });
  hote.addEventListener('wheel', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    rendu.zoomer(e.deltaY < 0 ? 1 : -1, [e.clientX - r.left, e.clientY - r.top]);
  }, { passive: false });
  window.addEventListener('resize', () => { if (actif) rendu.redimensionner(); });
  new ResizeObserver(() => { if (actif) rendu.redimensionner(); }).observe(hote);          // la mise en page (une boîte de dialogue qui s'ouvre) change la taille sans fenêtre qui bouge

  // l'heure et le temps qu'il fait, sans remonter la bataille
  function regler(heure, meteo) { ambiance = [heure, meteo]; if (B) regarderAu(B, heure, meteo); }

  const api = {
    monter, activer, regler, rendu, surClic: null, surSurvol: null, surcouche: null,
    redimensionner: () => rendu.redimensionner(),
    recentrer: () => { rendu.placerCamera(CAMERA.yaw, CAMERA.tangage); if (B) { rendu.vue.cx = B.terrain.W / 2; rendu.vue.cz = B.terrain.H * 0.62; } rendu.vue.zoom = 1; },
    get bataille() { return B; },
  };
  return api;
}
