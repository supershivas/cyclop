// La vue verrouillée (Jérôme, v0.122.0 : « chars, mitrailleuses et avions : une vue verrouillée, style cinéma de GTA 5, avec un bouton dans la fiche ; la vue à la personne est-elle possible aussi ? » ;
// v0.124.0 : l'avion au bout de l'hélice et tourné vers le sol, l'accident vécu dans l'avion, le char sous le canon qui tremble et montre l'explosion, le suivi au-delà du bord).
// Deux façons de coller la caméra à un engin :
//  · « cinéma » : la caméra tourne lentement autour de lui (de l'arrière vers l'avant), près du sol, deux bandes noires en haut et en bas ; il reste au centre, qu'il roule ou qu'il vole ;
//  · « à la personne » : la caméra est à son bord et regarde où il regarde. Char : sous son canon, qu'elle suit vers sa cible ; à chaque tir elle tremble, puis file vers l'explosion en téléobjectif.
//    Poste : à l'œil du servant, dans l'axe du cône. Avion : au bout de l'hélice (rien du fuselage au premier plan), penchée vers le sol pour voir les mitraillages ; abattu, on reste à bord : le
//    tonneau, l'écran rouge, jusqu'à l'écrasement.
// Rien de neuf dans le moteur que quelques réglages de la vue (`vue.haut`, `dist`, `portee`, `hors`, `roulis`, `secousse`, rendu3d.js) : la caméra du jeu orbite déjà autour d'un point visé, ici ce point
// suit l'engin. Le dessin seulement : aucune lecture n'écrit dans la bataille. La vue se libère d'un geste sur la caméra (déplacer, tourner), Échap, le clic droit, ou le bouton ; la vue d'avant revient.
import { positionDe } from '../avions.js?v=0.128.1';

const SOL_Y = 3;           // le niveau moyen du sol que vise la caméra (rendu3d.js : `SOL_Y`), pour calculer `vue.haut`
const PORTEE = 700;        // m : le plan lointain d'une vue verrouillée (au ras du sol, la vue porte loin)
const PORTEE_AVION = 2500; // m : en altitude le haut de l'image est sous l'horizon : le sol y est à plus d'un kilomètre ; sans cela le fond (noir la nuit) mordait l'image
const HORS = 160;          // m : de combien le point visé peut dépasser le bord du terrain (un avion entre et sort 60 m au-delà ; au-delà, le faux terrain)
const PERSONNE = { dist: 0.6, zoom: 6, garde: 0.35 };      // garde : le sol est franchi par 0,35 m, pas les 1,5 m de la caméra libre : l'œil d'un char est bas
const CINEMA = { tangage: [0.3, 0.1, 0.11], periode: 36 };
const BOUT = 4.6;          // m : du centre de l'avion au-delà du disque de l'hélice : la caméra y est, le fuselage est derrière elle
const CANON = { avant: 1.0, droite: 1.05, haut: 0.9 };      // m : le Schneider porte son 75 à droite (rendu/engins.js, [1,35 ; 1,2 ; 1,05]) ; la caméra est sous le tube, un peu en arrière de la bouche
const TIR = { secousse: 0.05, retombe: 5, vers: [0.18, 0.4], garde: 1.7, retour: 2.3, fin: 2.6, tele: 0.5 };      // s : la secousse, le coup d'œil vers l'explosion (l'arrivée, la tenue, le retour), le zoom du téléobjectif
const ECRASE = 3.2;        // s qu'on reste sur l'épave avant de rendre la vue

const angle = d => d - 2 * Math.PI * Math.round(d / (2 * Math.PI));
const chasseDe = cap => Math.atan2(-Math.cos(cap), -Math.sin(cap));      // l'angle de la caméra qui regarde dans la direction `cap`, posée « derrière » le point visé
const doux = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

/* Ce que la vue colle : où est l'engin (x, y), où est l'œil de la vue à la personne (px, py, haut, cap, tangage), jusqu'où il regarde. Rend null s'il n'existe plus (un avion rentré). */
function cibleDe(B, genre, id) {
  if (genre === 'char') {
    const c = B.etat.chars.find(k => k.id === id); if (!c) return null;
    const cap = c.cap ?? Math.atan2(c.hy, c.hx), co = Math.cos(cap), si = Math.sin(cap);
    const px = c.x + co * CANON.avant - si * CANON.droite, py = c.y + si * CANON.avant + co * CANON.droite;
    const vise = c.vise && c.etat !== 'detruit' ? c.vise : null, regard = vise ? Math.atan2(vise[1] - py, vise[0] - px) : cap;
    return { x: c.x, y: c.y, cap, regard: 1.6, zoom: 6, nom: c.etat === 'detruit' ? 'Épave de char' : 'Char', camp: c.camp, perso: { x: px, y: py, h: CANON.haut, cap: regard, tangage: 0.04 } };
  }
  if (genre === 'nid') {
    const n = B.etat.nids.find(k => k.id === id); if (!n) return null;
    const cap = Math.atan2(n.ay, n.ax);
    return { x: n.x, y: n.y, cap, regard: 1.2, zoom: 7, nom: n.etat === 'detruit' ? 'Poste détruit' : 'Mitrailleuse', camp: n.camp, perso: { x: n.x, y: n.y, h: 1.9, cap, tangage: 0.05 } };
  }
  const v = B.etat.mitraillages.find(k => k.id === id);
  if (!v || (v.etat !== 'vol' && v.etat !== 'chute' && v.etat !== 'epave')) return null;
  const p = positionDe(v, B.etat.temps), co = Math.cos(p.cap), si = Math.sin(p.cap), sol = v.etat === 'epave';
  // l'œil : au bout de l'hélice, à l'altitude de l'avion, penché vers le sol (la passe mitraillée est devant et en dessous)
  return { x: p.x, y: p.y, cap: p.cap, alt: p.h, regard: p.h + 1, zoom: 4, nom: 'Avion', camp: v.camp, etat: v.etat,
    perso: { x: p.x + co * (sol ? 0 : BOUT), y: p.y + si * (sol ? 0 : BOUT), h: p.h + 0.3, cap: p.cap, tangage: 0.6, alt: true } };
}

export function creerSuivi({ $, bataille, rendu, reduit = () => false, retour = () => {}, dire = () => {} }) {
  let s = null;          // { genre, id, mode: 'cinema' | 'personne', t, avant, tir, accident, fin }
  const badge = $('suivi'), nom = $('suivi-nom'), barres = $('cinema'), rouge = $('accident');
  $('suivi-liberer').onclick = () => liberer();

  function verrouiller(genre, id, mode) {
    const B = bataille(); if (!B) return false;
    if (s && s.genre === genre && s.id === id && s.mode === mode) { liberer(); return false; }      // le même bouton : on lâche
    if (!cibleDe(B, genre, id)) { dire('Cet engin n\'est plus là.'); return false; }
    const avant = s?.avant ?? { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage, zoom: rendu.vue.zoom, cx: rendu.vue.cx, cz: rendu.vue.cz, fov: rendu.vue.fov };
    s = { genre, id, mode, t: 0, avant, neuf: true, tir: null, fin: 0 };
    rendu.vue.roulis = 0; rendu.vue.secousse = 0; rendu.vue.fov = avant.fov;
    rouge.hidden = true; rouge.classList.remove('ecrase');
    badge.hidden = false; barres.hidden = mode !== 'cinema'; document.body.classList.toggle('vue-cinema', mode === 'cinema');
    document.body.classList.add('vue-verrouillee');
    return true;
  }
  function liberer() {
    if (!s) return;
    const { avant } = s; s = null;
    const V = rendu.vue;
    V.haut = 0; V.dist = null; V.portee = 0; V.garde = null; V.hors = 0; V.roulis = 0; V.secousse = 0; V.fov = avant.fov;
    rendu.placerCamera(avant.yaw, avant.tangage); V.zoom = avant.zoom;
    retour(avant.cx, avant.cz);           // le point visé glisse jusqu'où il était
    badge.hidden = true; barres.hidden = true; rouge.hidden = true; rouge.classList.remove('ecrase');
    document.body.classList.remove('vue-cinema', 'vue-verrouillee');
  }

  /* Les événements de la bataille de l'image : un tir de notre char suivi déclenche la secousse puis le coup d'œil vers l'explosion */
  function evenements(ev) {
    if (!s || s.genre !== 'char' || reduit()) return;
    for (const e of ev) if (e.type === 'char-tir' && e.id === s.id) s.tir = { t: 0, tx: e.tx, ty: e.ty };
  }

  /* Un pas : à appeler à chaque image (même en pause : la vue suit ce qui bouge, ou reste là où c'est figé) */
  function maj(dt) {
    if (!s) return;
    const B = bataille(); if (!B) { liberer(); return; }
    const c = cibleDe(B, s.genre, s.id);
    if (!c) { dire(s.genre === 'avion' ? 'L\'avion est rentré : la vue est libérée.' : 'La vue est libérée.'); liberer(); return; }
    const perso = s.mode === 'personne', r = reduit(), V = rendu.vue, P = c.perso;
    s.t += dt;
    // l'avion tombé : on reste à bord ; on le quitte quelques secondes après l'écrasement
    const chute = c.etat === 'chute', epave = c.etat === 'epave';
    if (epave) { s.fin += dt; if (s.fin > ECRASE) { dire('L\'avion s\'est écrasé : la vue est libérée.'); liberer(); return; } }
    // le point visé (hors de la vue à la personne : le centre de l'engin ; dedans : l'œil), qui le suit sans à-coup
    const px = perso ? P.x : c.x, py = perso ? P.y : c.y;
    const k = s.neuf || r || perso ? 1 : 1 - Math.exp(-dt * 9);
    V.cx += (px - V.cx) * k; V.cz += (py - V.cz) * k;
    const sol = rendu.hauteurSol(Math.max(0, px), Math.max(0, py));
    const regard = perso ? P.h : c.regard, haut = sol + regard - SOL_Y;
    V.haut += (haut - V.haut) * (s.neuf || perso ? 1 : Math.min(1, dt * 6));
    V.portee = s.genre === 'avion' ? PORTEE_AVION : PORTEE; V.hors = HORS; V.zoom = perso ? PERSONNE.zoom : c.zoom; V.dist = perso ? PERSONNE.dist : null; V.garde = perso ? PERSONNE.garde : null;
    // le tir du char : la secousse, puis la vue file vers l'explosion en téléobjectif et revient
    let tete = perso ? P.cap : c.cap, w = 0, secousse = 0;
    if (s.tir) {
      const T = s.tir; T.t += dt;
      if (T.t > TIR.fin) s.tir = null;
      else {
        secousse = TIR.secousse * Math.exp(-T.t * TIR.retombe);
        w = doux((T.t - TIR.vers[0]) / (TIR.vers[1] - TIR.vers[0])) * (1 - doux((T.t - TIR.garde) / (TIR.retour - TIR.garde)));
        if (perso) { const vers = Math.atan2(T.ty - py, T.tx - px); tete = P.cap + angle(vers - P.cap) * w; }
        if (w > 0.5 && T.t < TIR.garde) secousse += 0.012;      // l'explosion elle-même fait trembler
      }
    }
    V.fov = s.avant.fov * (1 - TIR.tele * w);
    // l'angle : à la personne, dans la direction du regard ; au cinéma, derrière l'engin, puis un balayage lent autour de lui
    const chasse = chasseDe(tete);
    const balai = perso || r ? 0 : 0.7 + 1.7 * Math.sin(s.t * 2 * Math.PI / (CINEMA.periode * 2) - 0.6);
    const voulu = chasse + balai, d = angle(voulu - V.cible.yaw);
    V.cible.yaw += d * (s.neuf ? 1 : perso ? Math.min(1, dt * (w > 0 || s.tir ? 14 : 8)) : Math.min(1, dt * 3)); if (s.neuf) V.yaw = V.cible.yaw;
    // l'inclinaison : à plat (le char), penchée vers le sol (l'avion), qui pique quand il tombe ; au cinéma, un va-et-vient bas
    let tg = perso ? P.tangage : CINEMA.tangage[0] + (r ? 0 : CINEMA.tangage[1] * Math.sin(s.t * 2 * Math.PI / CINEMA.periode) + CINEMA.tangage[2]);
    if (perso && (chute || epave)) tg = epave ? 1.2 : Math.min(1.2, (s.pique ?? P.tangage) + dt * 0.7), s.pique = tg;
    V.cible.tangage = tg; if (s.neuf || (perso && chute)) V.tangage = tg;
    // le tonneau et l'écran rouge de l'avion abattu (la vue à la personne seulement)
    if (perso && (chute || epave) && s.genre === 'avion') {
      V.roulis += (chute && !r ? 5 : 0) * dt;        // (le même tour par seconde que la vrille de la maquette : rendu/avions.js)
      secousse = r ? 0 : Math.max(secousse, chute ? 0.04 : 0.015);
      rouge.hidden = false; rouge.classList.toggle('ecrase', epave);
    } else if (!perso || s.genre !== 'avion') V.roulis = 0;
    V.secousse = r ? 0 : secousse;
    s.neuf = false;
    nom.textContent = `${c.nom}${c.camp !== undefined && c.camp !== (B.etat.moi ?? 0) ? ' ennemi' : ''} · ${perso ? 'à la personne' : 'vue verrouillée'} · Échap pour libérer`;
  }
  return { verrouiller, liberer, maj, evenements, get actif() { return s; } };
}
