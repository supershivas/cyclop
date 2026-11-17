// La vue verrouillée (Jérôme, v0.122.0 : « chars, mitrailleuses et avions : une vue verrouillée, style cinéma de GTA 5, avec un bouton dans la fiche ; la vue à la personne est-elle possible aussi ? » ;
// v0.124.0 : l'avion au bout de l'hélice et tourné vers le sol, l'accident vécu dans l'avion, le char sous le canon qui tremble et montre l'explosion, le suivi au-delà du bord).
// Deux façons de coller la caméra à un engin :
//  · « cinéma » : la caméra tourne lentement autour de lui (de l'arrière vers l'avant), près du sol, deux bandes noires en haut et en bas ; il reste au centre, qu'il roule ou qu'il vole ;
//  · « à la personne » : la caméra est à son bord et regarde où il regarde. Char : derrière lui, au-dessus (v0.132.0 : sous le canon, on était dans les chenilles), tournée vers sa cible ; à chaque tir elle tremble, puis file vers l'explosion en téléobjectif.
//    Poste : à l'œil du servant, dans l'axe du cône. Avion : au bout de l'hélice (rien du fuselage au premier plan), penchée vers le sol pour voir les mitraillages ; abattu, on reste à bord : le
//    tonneau, l'écran rouge, jusqu'à l'écrasement.
// Rien de neuf dans le moteur que quelques réglages de la vue (`vue.haut`, `dist`, `portee`, `hors`, `roulis`, `secousse`, rendu3d.js) : la caméra du jeu orbite déjà autour d'un point visé, ici ce point
// suit l'engin. Le dessin seulement : aucune lecture n'écrit dans la bataille. La vue se libère d'un geste sur la caméra (déplacer, tourner), Échap, le clic droit, ou le bouton ; la vue d'avant revient.
import { positionDe } from '../avions.js?v=0.146.1';
import { indiceDe } from './lecture.js?v=0.146.1';

const SOL_Y = 3;           // le niveau moyen du sol que vise la caméra (rendu3d.js : `SOL_Y`), pour calculer `vue.haut`
const PORTEE = 700;        // m : le plan lointain d'une vue verrouillée (au ras du sol, la vue porte loin)
const PORTEE_AVION = 2500; // m : en altitude le haut de l'image est sous l'horizon : le sol y est à plus d'un kilomètre ; sans cela le fond (noir la nuit) mordait l'image
const HORS = 160;          // m : de combien le point visé peut dépasser le bord du terrain (un avion entre et sort 60 m au-delà ; au-delà, le faux terrain)
const PERSONNE = { dist: 0.6, zoom: 6, garde: 0.35 };      // garde : le sol est franchi par 0,35 m, pas les 1,5 m de la caméra libre : l'œil d'un char est bas
const CINEMA = { tangage: [0.3, 0.1, 0.11], periode: 36 };
const BOUT = 4.6;          // m : du centre de l'avion au-delà du disque de l'hélice : la caméra y est, le fuselage est derrière elle
// m : l'œil de la vue « à la personne » d'un char (Jérôme, v0.132.0 : « elle nous met dans les chenilles, elle doit être en dehors du char ») : 8 m derrière lui, 3,6 m au-dessus du sol, penché de 0,2 rad ;
// on voit le char entier de dos et ce qu'il vise. Essayés en captures et écartés : sous le canon (dans le flanc et les chenilles), sur le toit (la superstructure masque la moitié de l'image),
// à l'épaule droite (le flanc remplit la gauche), au ras du flanc (rien du char, un fanion en premier plan)
export const CANON = { avant: -8, droite: 0, haut: 3.6, tangage: 0.2 };
// s : le coup d'œil vers l'explosion (l'arrivée, la tenue, le retour), le zoom du téléobjectif. Plus de secousse au tir (Jérôme, v0.143.0 : « la vue du char vibre trop et on ne voit pas le résultat du tir »)
const TIR = { vers: [0.18, 0.4], garde: 1.7, retour: 2.3, fin: 2.6, tele: 0.5 };
// La souris oriente la vue à la personne (Jérôme, v0.143.0 : « bouger la souris bouge la vision ») : rad par pixel, et jusqu'où on lève ou baisse les yeux (rad, par rapport au tangage de l'engin)
const SOURIS = { lacet: 0.0022, tangage: 0.0022, haut: -1.0, bas: 0.9, pas: 120 };      // pas : px au plus par événement
const ECRASE = 3.2;        // s qu'on reste sur l'épave avant de rendre la vue
// L'œil d'un soldat (Jérôme, v0.144.0 : « la vue FPS sur chaque soldat : on clique et on dirige le soldat, ZQSD et la souris ») : à 1,6 m du sol, un champ large (70° : la caméra du jeu est à 30°),
// la caméra à 0,3 m derrière le point de l'œil (l'homme lui-même n'est pas dessiné : `rendu.cacherSoldat`), un plan proche de 0,12 m (les autres hommes s'approchent à bout de bras)
const SOLDAT = { h: 1.6, fov: 70, zoom: 12, dist: 0.3, proche: 0.12, garde: 0.5, haut: -1.2, bas: 1.0 };

const angle = d => d - 2 * Math.PI * Math.round(d / (2 * Math.PI));
const chasseDe = cap => Math.atan2(-Math.cos(cap), -Math.sin(cap));      // l'angle de la caméra qui regarde dans la direction `cap`, posée « derrière » le point visé
const doux = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

/* Ce que la vue colle : où est l'engin (x, y), où est l'œil de la vue à la personne (px, py, haut, cap, tangage), jusqu'où il regarde. Rend null s'il n'existe plus (un avion rentré). */
function cibleDe(B, genre, id, ctx = {}) {
  if (genre === 'soldat') {
    const A = B.armee, m = ctx.memo ?? {}; let i = m.indice ?? -1;
    if (i < 0 || A.id[i] !== id) { i = indiceDe(B, id); m.indice = i; }
    if (i < 0 || A.mort[i]) return null;
    const P = ctx.positions, x = P && P.x.length > i ? P.x[i] : A.x[i], y = P && P.y.length > i ? P.y[i] : A.y[i];
    const cap = A.camp[i] === 0 ? -Math.PI / 2 : Math.PI / 2;      // il regarde l'ennemi au départ (nous : le nord)
    return { x, y, cap, regard: SOLDAT.h, zoom: SOLDAT.zoom, nom: 'Soldat', camp: A.camp[i], perso: { x, y, h: SOLDAT.h, cap, tangage: 0.0 } };
  }
  if (genre === 'char') {
    const c = B.etat.chars.find(k => k.id === id); if (!c) return null;
    const cap = c.cap ?? Math.atan2(c.hy, c.hx), co = Math.cos(cap), si = Math.sin(cap);
    const px = c.x + co * CANON.avant - si * CANON.droite, py = c.y + si * CANON.avant + co * CANON.droite;
    const vise = c.vise && c.etat !== 'detruit' ? c.vise : null, regard = vise ? Math.atan2(vise[1] - py, vise[0] - px) : cap;
    return { x: c.x, y: c.y, cap, regard: 1.6, zoom: 6, nom: c.etat === 'detruit' ? 'Épave de char' : 'Char', camp: c.camp, perso: { x: px, y: py, h: CANON.haut, cap: regard, tangage: CANON.tangage } };
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

export function creerSuivi({ $, bataille, rendu, reduit = () => false, retour = () => {}, dire = () => {}, verrou = document.body, touche = () => false }) {
  let s = null;          // { genre, id, mode: 'cinema' | 'personne', t, avant, tir, accident, fin }
  const badge = $('suivi'), nom = $('suivi-nom'), barres = $('cinema'), rouge = $('accident');
  $('suivi-liberer').onclick = () => liberer();

  /* La souris (vue à la personne) : le pointeur est capturé (le premier Échap rend le pointeur, et la vue avec lui) ; sans capture (refusée, ou un navigateur sans elle) le mouvement de la souris sert quand même */
  document.addEventListener('mousemove', e => {
    if (!s || s.mode !== 'personne') return;
    if (performance.now() < s.sourd) return;      // juste après la capture, Chrome compte le saut du pointeur vers le centre (jusqu'à 640 px mesurés : la vue partait de côté)
    const borne = v => Math.max(-SOURIS.pas, Math.min(SOURIS.pas, v || 0));
    s.lacet += borne(e.movementX) * SOURIS.lacet;
    const bas = s.genre === 'soldat' ? SOLDAT.haut : SOURIS.haut, haut = s.genre === 'soldat' ? SOLDAT.bas : SOURIS.bas;      // (de lever les yeux à baisser la tête)
    s.pitch = Math.max(bas, Math.min(haut, s.pitch + borne(e.movementY) * SOURIS.tangage));
  });
  document.addEventListener('pointerlockchange', () => {
    if (!s) return;
    if (document.pointerLockElement) { s.verrou = true; s.sourd = performance.now() + 250; } else if (s.verrou) liberer();
  });
  const prendreSouris = () => { try { const r = verrou.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* refusée : la souris libre sert */ } };
  const rendreSouris = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* rien */ } };

  function verrouiller(genre, id, mode) {
    const B = bataille(); if (!B) return false;
    if (s && s.genre === genre && s.id === id && s.mode === mode) { liberer(); return false; }      // le même bouton : on lâche
    if (!cibleDe(B, genre, id, { positions: rendu.positions })) { dire(genre === 'soldat' ? 'Cet homme n\'est plus là.' : 'Cet engin n\'est plus là.'); return false; }
    const avant = s?.avant ?? { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage, zoom: rendu.vue.zoom, cx: rendu.vue.cx, cz: rendu.vue.cz, fov: rendu.vue.fov };
    s = { genre, id, mode, t: 0, avant, neuf: true, tir: null, fin: 0, lacet: 0, pitch: 0, verrou: false, sourd: 0, indice: -1 };
    if (genre === 'soldat') rendu.cacherSoldat(id);
    if (mode === 'personne') { s.sourd = performance.now() + 400; prendreSouris(); } else rendreSouris();
    rendu.vue.roulis = 0; rendu.vue.secousse = 0; rendu.vue.fov = avant.fov;
    rouge.hidden = true; rouge.classList.remove('ecrase');
    badge.hidden = false; barres.hidden = mode !== 'cinema'; document.body.classList.toggle('vue-cinema', mode === 'cinema');
    document.body.classList.add('vue-verrouillee');
    return true;
  }
  function liberer() {
    if (!s) return;
    const { avant } = s; s = null; rendreSouris();
    const V = rendu.vue;
    rendu.cacherSoldat(-1); const Bl = bataille(); if (Bl) Bl.pilote = null; V.proche = null;
    V.tgMin = null; V.haut = 0; V.dist = null; V.portee = 0; V.garde = null; V.hors = 0; V.roulis = 0; V.secousse = 0; V.fov = avant.fov;
    rendu.placerCamera(avant.yaw, avant.tangage); V.zoom = avant.zoom;
    retour(avant.cx, avant.cz);           // le point visé glisse jusqu'où il était
    badge.hidden = true; barres.hidden = true; rouge.hidden = true; rouge.classList.remove('ecrase');
    document.body.classList.remove('vue-cinema', 'vue-verrouillee');
  }

  /* Les événements de la bataille de l'image : un tir de notre char suivi déclenche le coup d'œil vers l'explosion */
  function evenements(ev) {
    if (!s || s.genre !== 'char' || reduit()) return;
    for (const e of ev) if (e.type === 'char-tir' && e.id === s.id) s.tir = { t: 0, tx: e.tx, ty: e.ty };
  }

  /* Un pas : à appeler à chaque image (même en pause : la vue suit ce qui bouge, ou reste là où c'est figé) */
  function maj(dt) {
    if (!s) return;
    const B = bataille(); if (!B) { liberer(); return; }
    const c = cibleDe(B, s.genre, s.id, { memo: s, positions: rendu.positions });
    if (!c) { dire(s.genre === 'avion' ? 'L\'avion est rentré : la vue est libérée.' : s.genre === 'soldat' ? 'Il est tombé : la vue est libérée.' : 'La vue est libérée.'); liberer(); return; }
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
    // le tir du char : la vue file vers l'explosion en téléobjectif et revient
    const homme = s.genre === 'soldat';      // un soldat : l'œil est la vue, ZQSD le mène (v0.144.0)
    if (homme) { V.zoom = SOLDAT.zoom; V.dist = SOLDAT.dist; V.garde = SOLDAT.garde; V.proche = SOLDAT.proche; V.tgMin = SOLDAT.haut; V.portee = PORTEE; }
    let tete = perso ? P.cap : c.cap, w = 0, secousse = 0;      // (la secousse ne reste que pour l'avion abattu)
    if (s.tir) {
      const T = s.tir; T.t += dt;
      if (T.t > TIR.fin) s.tir = null;
      else {
        w = doux((T.t - TIR.vers[0]) / (TIR.vers[1] - TIR.vers[0])) * (1 - doux((T.t - TIR.garde) / (TIR.retour - TIR.garde)));
        if (perso) { const vers = Math.atan2(T.ty - py, T.tx - px); tete = P.cap + angle(vers - P.cap) * w; }
      }
    }
    V.fov = homme ? SOLDAT.fov : s.avant.fov * (1 - TIR.tele * w);
    // l'angle : à la personne, dans la direction du regard ; au cinéma, derrière l'engin, puis un balayage lent autour de lui
    // la souris : le regard qu'on a choisi s'ajoute au cap de l'engin ; pendant le coup d'œil vers l'explosion la vue file d'abord vers elle (w), puis revient au regard choisi
    const libre = perso ? 1 - w : 0;
    const chasse = chasseDe(tete + (perso ? s.lacet * libre : 0));
    const balai = perso || r ? 0 : 0.7 + 1.7 * Math.sin(s.t * 2 * Math.PI / (CINEMA.periode * 2) - 0.6);
    const voulu = chasse + balai, d = angle(voulu - V.cible.yaw);
    V.cible.yaw += d * (s.neuf ? 1 : perso ? Math.min(1, dt * (w > 0 || s.tir ? 14 : 24)) : Math.min(1, dt * 3)); if (s.neuf) V.yaw = V.cible.yaw;
    // l'inclinaison : à plat (le char), penchée vers le sol (l'avion), qui pique quand il tombe ; au cinéma, un va-et-vient bas
    if (homme) V.cible.yaw = V.yaw = voulu;      // la souris, tout de suite : pas de retard sur le regard
    let tg = perso ? P.tangage + s.pitch * libre : CINEMA.tangage[0] + (r ? 0 : CINEMA.tangage[1] * Math.sin(s.t * 2 * Math.PI / CINEMA.periode) + CINEMA.tangage[2]);
    if (perso && (chute || epave)) tg = epave ? 1.2 : Math.min(1.2, (s.pique ?? P.tangage) + dt * 0.7), s.pique = tg;
    if (homme) tg = s.pitch;
    V.cible.tangage = tg; if (s.neuf || (perso && chute) || homme) V.tangage = tg;
    // ZQSD (les touches physiques W, A, S, D : la même place en AZERTY et en QWERTY) : on marche dans le sens du regard ; la simulation lit `B.pilote` à chaque pas (army.js, `pasArmee`)
    if (homme) {
      const cap = P.cap + s.lacet, av = (touche('KeyW') ? 1 : 0) - (touche('KeyS') ? 1 : 0), la = (touche('KeyD') ? 1 : 0) - (touche('KeyA') ? 1 : 0);
      B.pilote = { id: s.id, ax: av * Math.cos(cap) - la * Math.sin(cap), ay: av * Math.sin(cap) + la * Math.cos(cap) };
    }
    // le tonneau et l'écran rouge de l'avion abattu (la vue à la personne seulement)
    if (perso && (chute || epave) && s.genre === 'avion') {
      V.roulis += (chute && !r ? 5 : 0) * dt;        // (le même tour par seconde que la vrille de la maquette : rendu/avions.js)
      secousse = r ? 0 : Math.max(secousse, chute ? 0.04 : 0.015);
      rouge.hidden = false; rouge.classList.toggle('ecrase', epave);
    } else if (!perso || s.genre !== 'avion') V.roulis = 0;
    V.secousse = r ? 0 : secousse;
    s.neuf = false;
    nom.textContent = `${c.nom}${c.camp !== undefined && c.camp !== (B.etat.moi ?? 0) ? ' ennemi' : ''} · ${homme ? 'ZQSD pour marcher, la souris pour regarder' : perso ? 'à la personne' : 'vue verrouillée'} · Échap pour libérer`;
  }
  return { verrouiller, liberer, maj, evenements, get actif() { return s; } };
}
