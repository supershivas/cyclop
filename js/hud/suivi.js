// La vue verrouillée (Jérôme, v0.121.0 : « chars, mitrailleuses et avions : une vue verrouillée, style cinéma de GTA 5, avec un bouton dans la fiche ; la vue à la personne est-elle possible aussi ? »).
// Deux façons de coller la caméra à un engin :
//  · « cinéma » : la caméra tourne lentement autour de lui (de l'arrière vers l'avant, en deux fois quarante secondes), près du sol, deux bandes noires en haut et en bas ; il reste au centre, qu'il roule ou qu'il vole ;
//  · « à la personne » : la caméra est à son bord, à hauteur d'œil (l'équipage du char, le servant du poste, le pilote), et regarde où il regarde (son cap, la direction de son cône).
// Rien de neuf dans le moteur que trois réglages de la vue (`vue.haut`, `vue.dist`, `vue.portee`, rendu3d.js) : la caméra du jeu orbite déjà autour d'un point visé, ici ce point suit l'engin. Le dessin seulement :
// aucune lecture n'écrit dans la bataille. La vue se libère d'un geste sur la caméra (déplacer, tourner), Échap, le clic droit, ou le bouton ; la vue d'avant revient (le point visé glisse, l'angle et le zoom sont rendus).
import { positionDe } from '../avions.js?v=0.123.0';

const SOL_Y = 3;           // le niveau moyen du sol que vise la caméra (rendu3d.js : `SOL_Y`), pour calculer `vue.haut`
const PORTEE = 700;        // m : le plan lointain d'une vue verrouillée (au ras du sol, la vue porte loin)
const PERSONNE = { dist: 0.6, zoom: 6, tangage: 0.05 };
const CINEMA = { tangage: [0.3, 0.1, 0.11], periode: 36 };

/* Ce que la vue colle : où est l'engin, où il regarde, à quelle hauteur est son œil. Rend null s'il n'existe plus (un avion rentré). */
function cibleDe(B, genre, id) {
  if (genre === 'char') {
    const c = B.etat.chars.find(k => k.id === id);
    return c ? { x: c.x, y: c.y, cap: c.cap ?? Math.atan2(c.hy, c.hx), regard: 1.6, oeil: 3.2, zoom: 6, nom: c.etat === 'detruit' ? 'Épave de char' : 'Char', camp: c.camp } : null;
  }
  if (genre === 'nid') {
    const n = B.etat.nids.find(k => k.id === id);
    return n ? { x: n.x, y: n.y, cap: Math.atan2(n.ay, n.ax), regard: 1.2, oeil: 1.9, zoom: 7, nom: n.etat === 'detruit' ? 'Poste détruit' : 'Mitrailleuse', camp: n.camp } : null;
  }
  const v = B.etat.mitraillages.find(k => k.id === id);
  if (!v || (v.etat !== 'vol' && v.etat !== 'chute')) return null;
  const p = v.etat === 'vol' ? positionDe(v, B.etat.temps) : { x: v.chute?.x ?? v.cx, y: v.chute?.y ?? v.cy, h: 0, cap: v.chute?.cap ?? Math.atan2(v.uy, v.ux) };
  return { x: p.x, y: p.y, cap: p.cap, alt: p.h, regard: p.h + 1, oeil: p.h + 2.4, zoom: 4, nom: 'Avion', camp: v.camp };
}

export function creerSuivi({ $, bataille, rendu, reduit = () => false, retour = () => {}, dire = () => {} }) {
  let s = null;          // { genre, id, mode: 'cinema' | 'personne', t, avant }
  const badge = $('suivi'), nom = $('suivi-nom'), barres = $('cinema');
  $('suivi-liberer').onclick = () => liberer();

  function verrouiller(genre, id, mode) {
    const B = bataille(); if (!B) return false;
    if (s && s.genre === genre && s.id === id && s.mode === mode) { liberer(); return false; }      // le même bouton : on lâche
    if (!cibleDe(B, genre, id)) { dire('Cet engin n\'est plus là.'); return false; }
    const avant = s?.avant ?? { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage, zoom: rendu.vue.zoom, cx: rendu.vue.cx, cz: rendu.vue.cz };
    s = { genre, id, mode, t: 0, avant, neuf: true };
    badge.hidden = false; barres.hidden = mode !== 'cinema'; document.body.classList.toggle('vue-cinema', mode === 'cinema');
    document.body.classList.add('vue-verrouillee');
    return true;
  }
  function liberer() {
    if (!s) return;
    const { avant } = s; s = null;
    rendu.vue.haut = 0; rendu.vue.dist = null; rendu.vue.portee = 0;
    rendu.placerCamera(avant.yaw, avant.tangage); rendu.vue.zoom = avant.zoom;
    retour(avant.cx, avant.cz);           // le point visé glisse jusqu'où il était
    badge.hidden = true; barres.hidden = true; document.body.classList.remove('vue-cinema', 'vue-verrouillee');
  }

  /* Un pas : à appeler à chaque image (même en pause : la vue suit ce qui bouge, ou reste là où c'est figé) */
  function maj(dt) {
    if (!s) return;
    const B = bataille(); if (!B) { liberer(); return; }
    const c = cibleDe(B, s.genre, s.id);
    if (!c) { dire(s.genre === 'avion' ? 'L\'avion est rentré : la vue est libérée.' : 'La vue est libérée.'); liberer(); return; }
    const perso = s.mode === 'personne', r = reduit();
    s.t += dt;
    const V = rendu.vue, sol = rendu.hauteurSol(c.x, c.y);
    // le point visé : sur l'engin (à l'œil dans la vue à la personne, au milieu de sa caisse sinon), qui le suit sans à-coup
    const k = s.neuf || r || perso ? 1 : 1 - Math.exp(-dt * 9);
    V.cx += (c.x - V.cx) * k; V.cz += (c.y - V.cz) * k;
    const regard = perso ? c.oeil : c.regard, haut = sol + regard - SOL_Y;
    V.haut += (haut - V.haut) * (s.neuf ? 1 : Math.min(1, dt * 6));
    V.portee = PORTEE; V.zoom = perso ? PERSONNE.zoom : c.zoom; V.dist = perso ? PERSONNE.dist : null;
    // l'angle : derrière l'engin (la caméra à l'opposé de son cap) ; au cinéma elle fait le tour, lentement, du quart arrière vers l'avant puis revient
    const chasse = Math.atan2(-Math.cos(c.cap), -Math.sin(c.cap));
    const balai = perso || r ? 0 : 0.7 + 1.7 * Math.sin(s.t * 2 * Math.PI / (CINEMA.periode * 2) - 0.6);
    const voulu = chasse + balai;
    let d = voulu - V.cible.yaw; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    V.cible.yaw += d * (s.neuf ? 1 : perso ? Math.min(1, dt * 8) : Math.min(1, dt * 3)); if (s.neuf) V.yaw = V.cible.yaw;
    const tg = perso ? PERSONNE.tangage : CINEMA.tangage[0] + (r ? 0 : CINEMA.tangage[1] * Math.sin(s.t * 2 * Math.PI / CINEMA.periode) + CINEMA.tangage[2]);
    V.cible.tangage = tg; if (s.neuf) V.tangage = tg;
    s.neuf = false;
    nom.textContent = `${c.nom}${c.camp !== undefined && c.camp !== (B.etat.moi ?? 0) ? ' ennemi' : ''} · ${perso ? 'à la personne' : 'vue verrouillée'} · Échap pour libérer`;
  }
  return { verrouiller, liberer, maj, get actif() { return s; } };
}
