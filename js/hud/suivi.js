// La vue verrouillée (Jérôme, v0.122.0 : « chars, mitrailleuses et avions : une vue verrouillée, style cinéma de GTA 5, avec un bouton dans la fiche ; la vue à la personne est-elle possible aussi ? » ;
// v0.124.0 : l'avion au bout de l'hélice et tourné vers le sol, l'accident vécu dans l'avion, le char sous le canon qui tremble et montre l'explosion, le suivi au-delà du bord).
// Deux façons de coller la caméra à un engin :
//  · « cinéma » : la caméra tourne lentement autour de lui (de l'arrière vers l'avant), près du sol, deux bandes noires en haut et en bas ; il reste au centre, qu'il roule ou qu'il vole ;
//  · « à la personne » : la caméra est à son bord et regarde où il regarde. Char : derrière lui, au-dessus (v0.132.0 : sous le canon, on était dans les chenilles), tournée vers sa cible ; à chaque tir elle tremble, puis file vers l'explosion en téléobjectif.
//    Poste : à l'œil du servant, dans l'axe du cône. Avion : au bout de l'hélice (rien du fuselage au premier plan), penchée vers le sol pour voir les mitraillages ; abattu, on reste à bord : le
//    tonneau, l'écran rouge, jusqu'à l'écrasement.
// Rien de neuf dans le moteur que quelques réglages de la vue (`vue.haut`, `dist`, `portee`, `hors`, `roulis`, `secousse`, rendu3d.js) : la caméra du jeu orbite déjà autour d'un point visé, ici ce point
// suit l'engin. Le dessin seulement : aucune lecture n'écrit dans la bataille. La vue se libère d'un geste sur la caméra (déplacer, tourner), Échap, le clic droit, ou le bouton ; la vue d'avant revient.
import { positionDe, refusPrise } from '../avions.js?v=0.166.1';
import { hauteurOeil, balancement, armeDe, aPortee } from '../tir-joueur.js?v=0.166.1';
import { TIR_JOUEUR as TJ } from '../data/tir-joueur.js?v=0.166.1';
import { CALIBRES } from '../data/calibres.js?v=0.166.1';
import { CHARS } from '../data/chars.js?v=0.166.1';
import { AVION_MAIN } from '../data/mitraillage.js?v=0.166.1';
import { creerAideVue } from './aide-vue.js?v=0.166.1';
// Les sensations de l'homme qu'on mène (v0.152.0) : le coup reçu (s), la balle qui frôle (s), le souffle d'un obus (portée en rayons du souffle, s de retour), la peur qui ferme le champ (opacité au plus)
const SENS = { coup: 1.2, frole: 0.5, roulis: 0.07, choc: 3, chocDuree: 2.5, peur: 0.75 };
import { indiceDe, quiEst, majuscule } from './lecture.js?v=0.166.1';
import { creerTampons } from './tampons-fps.js?v=0.166.1';
import { BLESSURES_FPS, RYTHME_TAMPONS } from '../data/tampons.js?v=0.166.1';
import { ZONES_EN_MOTS } from '../data/causes.js?v=0.166.1';
import { REPERES, jauge, corps } from './barres.js?v=0.166.1';

const SOL_Y = 3;           // le niveau moyen du sol que vise la caméra (rendu3d.js : `SOL_Y`), pour calculer `vue.haut`
const PORTEE = 700;        // m : le plan lointain d'une vue verrouillée (au ras du sol, la vue porte loin)
const PORTEE_AVION = 2500; // m : en altitude le haut de l'image est sous l'horizon : le sol y est à plus d'un kilomètre ; sans cela le fond (noir la nuit) mordait l'image
const HORS = 160;          // m : de combien le point visé peut dépasser le bord du terrain (un avion entre et sort 60 m au-delà ; au-delà, le faux terrain)
const PERSONNE = { dist: 0.6, zoom: 6, garde: 0.35 };      // garde : le sol est franchi par 0,35 m, pas les 1,5 m de la caméra libre : l'œil d'un char est bas
const CINEMA = { tangage: [0.3, 0.1, 0.11], periode: 36 };
// m : l'œil de la vue « à la personne » d'un char (Jérôme, v0.132.0 : « elle nous met dans les chenilles, elle doit être en dehors du char ») : 8 m derrière lui, 3,6 m au-dessus du sol, penché de 0,2 rad ;
// on voit le char entier de dos et ce qu'il vise. Essayés en captures et écartés : sous le canon (dans le flanc et les chenilles), sur le toit (la superstructure masque la moitié de l'image),
// à l'épaule droite (le flanc remplit la gauche), au ras du flanc (rien du char, un fanion en premier plan)
export const CANON = { avant: -8, droite: 0, haut: 3.6, tangage: 0.2 };
// La vue de poursuite (Jérôme, 23 nov., v0.165.0 : l'avion « doit avoir l'angle de la capture » : derrière lui et au-dessus, l'avion entier au premier plan ; le char « similaire, au-dessus, comme
// actuellement ») : la caméra tourne autour d'un point (`avant` m devant l'engin, `haut` m au-dessus de lui) à `dist` m, penchée de `tangage` rad. L'avion : son cap suivi en douceur (`suit` 1/s),
// une part de son roulis (`roulis`). Le char : plus aucun mouvement au tir ; le centre de l'image est le point visé, on peut regarder jusqu'au pied du char (la souris, jusqu'à `bas` rad)
const CHASSE = { avion: { avant: 6, haut: 2, dist: 24, tangage: 0.32, fov: 55, suit: 2.5, roulis: 0.35 }, char: { avant: 2, haut: 4.5, dist: 19, tangage: 0.32, fov: 50, bas: 1.0 } };      // fov : le champ (°) ; celui du jeu, 30°, serrait l'avion à le remplir
// s : le coup d'œil vers l'explosion (l'arrivée, la tenue, le retour), le zoom du téléobjectif. Plus de secousse au tir (Jérôme, v0.143.0 : « la vue du char vibre trop et on ne voit pas le résultat du tir »)
const TIR = { vers: [0.18, 0.4], garde: 1.7, retour: 2.3, fin: 2.6, tele: 0.5 };
// La souris oriente la vue à la personne (Jérôme, v0.143.0 : « bouger la souris bouge la vision ») : rad par pixel, et jusqu'où on lève ou baisse les yeux (rad, par rapport au tangage de l'engin)
const SOURIS = { lacet: 0.0022, tangage: 0.0022, haut: -1.0, bas: 0.9, pas: 120 };      // pas : px au plus par événement
const ECRASE = 3.2;        // s qu'on reste sur l'épave avant de rendre la vue
// Le plongeon vers la vue à la personne et le recul à la sortie (Jérôme, 21 nov., v0.160.0 : « quand on passe en vue FPS (avion, soldat, char), un mouvement de caméra qui plonge vers l'entité choisie ; zoom arrière lors de la désélection ») : s (l'horloge réelle, mais 100 ms au plus par image : la première image d'un char vu de près compile ses shaders et sautait tout le plongeon)
// La vue de l'homme tombé : de combien elle recule (m) et sa plongée (rad). 3 m et 1,05 rad jusqu'à la v0.160.0 : un mort au fond d'une tranchée restait caché par les sacs et le toit, frôlés de près (v0.160.1)
const MORT_VUE = { recul: 4.7, tangage: 1.3 };
const PLONGEON = { entree: 1.1, sortie: 0.9, pas: 0.1 };
// L'œil d'un soldat (Jérôme, v0.144.0 : « la vue FPS sur chaque soldat : on clique et on dirige le soldat, ZQSD et la souris ») : à 1,6 m du sol, un champ large (70° : la caméra du jeu est à 30°),
// la caméra à 0,3 m derrière le point de l'œil (l'homme lui-même n'est pas dessiné : `rendu.cacherSoldat`), un plan proche de 0,12 m (les autres hommes s'approchent à bout de bras)
// `zoom` est un INDICE de `ZOOMS` (8 = 24 px/m : les hommes de près sont articulés, au niveau fin, comme en jeu ; 12 était hors de la liste : `ZOOMS[12]` indéfini, tous les hommes redevenaient des boîtes)
const SOLDAT = { fov: 70, zoom: 8, dist: 0.3, proche: 0.12, garde: 0.5, haut: -1.2, bas: 1.0, lisse: 9 };      // lisse : 1/s, la vitesse à laquelle l'œil suit une marche du sol (v0.165.0)

const angle = d => d - 2 * Math.PI * Math.round(d / (2 * Math.PI));
const chasseDe = cap => Math.atan2(-Math.cos(cap), -Math.sin(cap));      // l'angle de la caméra qui regarde dans la direction `cap`, posée « derrière » le point visé
const temps = o => { const n = performance.now(); o.u += Math.min(n - o.t0, PLONGEON.pas * 1000) / 1000; o.t0 = n; return o.u; };      // le temps du mouvement, borné par image
const doux = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

/* Ce que la vue colle : où est l'engin (x, y), où est l'œil de la vue à la personne (px, py, haut, cap, tangage), jusqu'où il regarde. Rend null s'il n'existe plus (un avion rentré). */
function cibleDe(B, genre, id, ctx = {}) {
  if (genre === 'soldat') {
    const A = B.armee, m = ctx.memo ?? {}; let i = m.indice ?? -1;
    if (i < 0 || A.id[i] !== id) { i = indiceDe(B, id); m.indice = i; }
    if (i < 0 || A.mort[i]) return null;
    const P = ctx.positions, x = P && P.x.length > i ? P.x[i] : A.x[i], y = P && P.y.length > i ? P.y[i] : A.y[i];
    const cap = A.camp[i] === 0 ? -Math.PI / 2 : Math.PI / 2;      // il regarde l'ennemi au départ (nous : le nord)
    const pil = B.pilotes?.find(p => p?.id === id), hv = hauteurOeil(B.terrain, A.x[i], A.y[i], pil?.posture ?? 0), memo = ctx.memo; if (memo) memo.oeil = memo.oeil === undefined ? hv : memo.oeil + (hv - memo.oeil) * Math.min(1, (ctx.dt ?? 0.016) * 8);      // (il monte sur la banquette en douceur)
    return { x, y, cap, regard: memo?.oeil ?? hv, zoom: SOLDAT.zoom, nom: 'Soldat', camp: A.camp[i], perso: { x, y, h: memo?.oeil ?? hv, cap, tangage: 0.0 } };
  }
  if (genre === 'char') {
    const c = B.etat.chars.find(k => k.id === id); if (!c) return null;
    const cap = c.cap ?? Math.atan2(c.hy, c.hx), co = Math.cos(cap), si = Math.sin(cap);
    const Q = CHASSE.char, px = c.x + co * Q.avant, py = c.y + si * Q.avant;
    // conduit à la main (v0.156.0) : on regarde devant la coque (la souris tourne le regard), le canon tire où l'on vise ; sinon vers sa cible
    const vise = c.vise && c.etat !== 'detruit' && !ctx.memo?.conduit ? c.vise : null, regard = vise ? Math.atan2(vise[1] - py, vise[0] - px) : cap;
    return { x: c.x, y: c.y, cap, regard: 1.6, zoom: 6, nom: c.etat === 'detruit' ? 'Épave de char' : 'Char', camp: c.camp, perso: { x: px, y: py, h: Q.haut, cap: regard, tangage: Q.tangage, chasse: Q } };
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
  // piloté (v0.157.0) : on regarde dans l'axe, un peu sous l'horizon (la ligne des mitrailleuses), la vue suit le tangage et le roulis
  const main = !!(v.main && !v.retour && v.etat === 'vol');
  return { x: p.x, y: p.y, cap: p.cap, alt: p.h, regard: p.h + 1, zoom: 4, nom: 'Avion', camp: v.camp, etat: v.etat, roulis: p.roulis ?? 0,
    perso: { x: p.x + co * (sol ? 0 : CHASSE.avion.avant), y: p.y + si * (sol ? 0 : CHASSE.avion.avant), h: p.h + CHASSE.avion.haut, cap: p.cap, tangage: CHASSE.avion.tangage - (main ? (p.pente ?? 0) * 0.4 : 0), alt: true, chasse: CHASSE.avion } };
}

export function creerSuivi({ $, bataille, rendu, reduit = () => false, retour = () => {}, dire = () => {}, verrou = document.body, touche = () => false, enPause = () => false, moi = () => 0, piloter = () => {}, conduire = () => {}, voler = () => {}, mort = () => {}, assourdir = () => {} }) {
  let s = null, sortie = null;      // `sortie` : le recul en cours après la vue (s vaut déjà null)          // { genre, id, mode: 'cinema' | 'personne', t, avant, tir, accident, fin }
  const carteEl = $('carte-soldat'), badge = $('suivi'), nom = $('suivi-nom'), barres = $('cinema'), rouge = $('accident'), viseur = $('viseur'), cartouches = $('cartouches'), coupEl = $('coup'), chocEl = $('choc'), peurEl = $('peur-voile'), canonEl = $('canon-barre'), volEl = $('vol-barres'), aide = creerAideVue($('aide-vue'));
  $('suivi-liberer').onclick = () => liberer();
  // l'avion piloté (v0.165.0, Jérôme : « un bouton qui permet de revenir au mode automatique et revenir à la base ») : le même effet que R
  const rentrerEl = $('suivi-rentrer');
  rentrerEl.onclick = () => { if (!s?.vole) return; if (!bataille()?.ailes?.[moi()]) { dire('Il décolle encore : vous prendrez les commandes en l\'air.'); return; } voler({ rentrer: true }); dire('Pilote automatique : il rentre à la base et se pose seul.'); };
  const tampons = creerTampons($('tampon-fps'));      // les tampons de la vue d'un soldat (v0.154.0) : ce qui lui arrive, ce qu'il fait, ce qui tombe autour de lui
  const nomDe = (B, id) => { const { qui } = quiEst(B, id); return `${qui.prenom} ${qui.nom}`; };

  /* La souris (vue à la personne) : le pointeur est capturé (le premier Échap rend le pointeur, et la vue avec lui) ; sans capture (refusée, ou un navigateur sans elle) le mouvement de la souris sert quand même */
  document.addEventListener('mousemove', e => {
    if (!s || s.mode !== 'personne') return;
    if (performance.now() < s.sourd || performance.now() < s.attente) return;      // (`attente` : la capture est demandée, pas encore accordée : le saut du pointeur n'est pas arrivé)      // juste après la capture, Chrome compte le saut du pointeur vers le centre (jusqu'à 640 px mesurés : la vue partait de côté)
    const borne = v => Math.max(-SOURIS.pas, Math.min(SOURIS.pas, v || 0));
    const fin = s.genre === 'soldat' ? (s.fov ?? SOLDAT.fov) / SOLDAT.fov : 1;      // épaulé, le champ est plus étroit : la souris tourne moins vite (v0.151.0)
    s.lacet += borne(e.movementX) * SOURIS.lacet * fin;
    if (s.vole) return;      // l'avion piloté : le clavier seul (v0.165.0, « un maniement classique ») ; la souris ne fait plus tourner la vue
    const bas = s.genre === 'soldat' ? SOLDAT.haut : SOURIS.haut, haut = s.genre === 'soldat' ? SOLDAT.bas : s.genre === 'char' ? CHASSE.char.bas : SOURIS.bas;      // (de lever les yeux à baisser la tête)
    s.pitch = Math.max(bas, Math.min(haut, s.pitch + borne(e.movementY) * SOURIS.tangage * fin));
  });
  /* Le tir (v0.147.0) : le clic gauche, tout de suite (pas au relâchement) ; la demande est posée dans `B.pilote.tir`, la simulation la prend au pas suivant (tir-joueur.js) */
  const quart = v => Math.round(v * 1000) / 1000;      // (les angles envoyés sont arrondis au millième : les deux machines calculent avec les mêmes nombres)
  function tirer() {
    if (!s || s.genre !== 'soldat' || s.mort) return;
    if (enPause()) { dire('Le temps est arrêté : on ne tire pas.'); return; }
    // un ennemi à moins de deux mètres devant lui : le clic frappe à la baïonnette (v0.154.0)
    const B = bataille(), cap = s.cap + s.lacet;
    if (B && s.indice >= 0 && aPortee(B.armee, s.indice, cap, TJ.melee.pres)) { piloter({ coup: true, cap: quart(cap) }); return; }
    piloter({ tir: true, cap: quart(s.cap + s.lacet), el: quart(-s.pitch) });      // `piloter` : seul, la commande s'applique tout de suite ; à deux, elle part aux deux machines (main.js)
  }
  /* Épauler (v0.151.0, Jérôme : « clic droit maintenu : épauler ») : le champ se resserre, le guidon tremble moins, il marche moins vite ; relâché, il baisse le fusil */
  const epauler = v => { if (!s || s.genre !== 'soldat' || s.epaule === v) return; s.epaule = v; rendu.fusilEpaule(v); piloter({ epaule: v }); };
  /* Parer (v0.154.0) : le bouton droit quand un ennemi est tout près devant lui ; le fusil en travers, les coups de l'autre portent deux fois moins */
  const parer = v => { if (!s || s.genre !== 'soldat' || !!s.parade === v) return; s.parade = v; rendu.fusilParade(v); piloter({ parade: v }); };
  const prochedevant = () => { const B = bataille(); return !!(B && s?.indice >= 0 && aPortee(B.armee, s.indice, s.cap + s.lacet, TJ.melee.pres * 1.25)); };
  /* Un autre homme (Tab, v0.154.0) : le plus proche de son régiment encore debout (à défaut, de son camp), autour de l'homme qu'on mène ou de son corps */
  function camarade() {
    const B = bataille(); if (!B || !s) return;
    const A = B.armee, d = B.etat.defunts?.[s.id], i0 = s.indice >= 0 && A.id[s.indice] === s.id ? s.indice : -1;
    const x0 = s.mort ? s.mort.x : i0 >= 0 ? A.x[i0] : s.derniere?.x ?? 0, y0 = s.mort ? s.mort.y : i0 >= 0 ? A.y[i0] : s.derniere?.y ?? 0, reg0 = i0 >= 0 ? A.reg[i0] : d ? d[2] : -1;
    let best = -1, bd = Infinity, bestR = -1, bdR = Infinity;
    for (let k = 0; k < A.n; k++) {
      if (A.mort[k] || A.camp[k] !== moi() || A.id[k] === s.id) continue;
      const dd = (A.x[k] - x0) ** 2 + (A.y[k] - y0) ** 2;
      if (A.reg[k] === reg0 && dd < bdR) { bdR = dd; bestR = k; }
      if (dd < bd) { bd = dd; best = k; }
    }
    const k = bestR >= 0 ? bestR : best; if (k < 0) { dire('Il ne reste personne.'); return; }
    const avant = s.avant; s.mort = null; s.avant = avant;
    verrouiller('soldat', A.id[k], 'personne');
  }
  const surChamp = e => document.pointerLockElement || e.target.id === 'canvas';
  /* Le char à la main (v0.156.0) : le clic gauche, un obus où le centre de l'image touche le sol ; le clic droit maintenu, les mitrailleuses dans le regard */
  function tirerCanon() {
    if (enPause()) { dire('Le temps est arrêté.'); return; }
    const cv = $('canvas'), B = bataille(), ch = B?.etat.chars.find(k => k.id === s.id), G = ch && CHARS[ch.modele]?.canon; if (!G) return;
    let [x, y] = rendu.versTerrain(cv.clientWidth / 2, cv.clientHeight / 2);
    // au-delà de sa portée (ou dans le ciel : le regard au ras de l'horizon) : le pointeur règle la hausse au plus loin, dans la direction du regard
    const az = ch.cap + s.lacet, loin = x < -1e4 || Math.hypot(x - ch.x, y - ch.y) > G.portee;
    if (loin) { x = ch.x + Math.cos(az) * G.portee * 0.98; y = ch.y + Math.sin(az) * G.portee * 0.98; dire(`À portée maximale : ${G.portee} m.`); }
    conduire({ tir: true, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }
  document.addEventListener('mousedown', e => {
    if (s?.vole && surChamp(e) && e.button === 0) { e.preventDefault(); if (!s.tirAile) { s.tirAile = true; voler({ tir: true }); } return; }
    if (s?.conduit && surChamp(e)) { e.preventDefault(); if (e.button === 0) tirerCanon(); else if (e.button === 2 && !s.rafale) { s.rafale = true; conduire({ rafale: true }); } return; }
    if (s?.genre !== 'soldat' || !surChamp(e)) return;
    if (s.mort) return;
    if (e.button === 0) { e.preventDefault(); tirer(); } else if (e.button === 2) { e.preventDefault(); if (prochedevant()) parer(true); else epauler(true); }
  });
  document.addEventListener('mouseup', e => { if (e.button === 0 && s?.vole && s.tirAile) { s.tirAile = false; voler({ tir: false }); } if (e.button === 2) { epauler(false); parer(false); if (s?.conduit && s.rafale) { s.rafale = false; conduire({ rafale: false }); } } });
  document.addEventListener('keyup', e => { if (e.code === 'KeyV' && s?.amoi) { s.amoi = false; piloter({ amoi: false }); } });
  /* R : recharger (le Lebel une cartouche à la fois, le Mauser d'une lame) ; C : s'accroupir, X : se coucher (la même touche relève) ; Espace : franchir le rebord devant lui (v0.152.0 : la pause passe à P dans cette vue) */
  document.addEventListener('keydown', e => {
    // H : toutes les commandes, ou l'essentiel (v0.158.0)
    if (e.code === 'KeyH' && !e.repeat && s && (s.genre === 'soldat' || s.conduit || s.vole) && !document.querySelector('dialog[open]')) { e.preventDefault(); aide.basculer(); return; }
    // l'avion : T le tir automatique, R rentrer (v0.157.0)
    if (s?.vole && !e.repeat && !document.querySelector('dialog[open]') && ['KeyT', 'KeyR'].includes(e.code)) {
      e.preventDefault(); const K = bataille()?.ailes?.[moi()];
      if (!K) { dire('Il décolle encore : vous prendrez les commandes en l\'air.'); return; }
      if (e.code === 'KeyT') { const auto = !K.auto; voler({ auto }); dire(auto ? 'Tir automatique : il tire seul, bas, sur les hommes devant lui.' : 'Tir à la main : clic maintenu.'); }
      else { voler({ rentrer: true }); dire('Pilote automatique : il rentre à la base et se pose seul.'); }
      return;
    }
    // le char : C la conduite (à la main ou sa route), T le tir (à la main ou le sien), R rentrer au parc (v0.156.0)
    if (s?.conduit && !e.repeat && !document.querySelector('dialog[open]') && ['KeyC', 'KeyT', 'KeyR'].includes(e.code)) {
      e.preventDefault(); const K = bataille()?.conduites?.[moi()];
      if (e.code === 'KeyC') { const v = !(K?.main ?? true); conduire({ main: v }); dire(v ? 'Conduite à la main : ZQSD.' : 'Conduite automatique : il suit sa route.'); }
      else if (e.code === 'KeyT') { const v = !(K?.tirMain ?? true); conduire({ tirMain: v }); dire(v ? 'Tir à la main : clic le canon, clic droit les mitrailleuses.' : 'Tir automatique : il choisit ses cibles.'); }
      else { conduire({ rentrer: true }); dire('Il rentre au parc.'); }
      return;
    }
    if (s?.genre !== 'soldat' || e.repeat || document.querySelector('dialog[open]')) return;
    if (!['KeyR', 'KeyC', 'KeyX', 'Space', 'KeyF', 'KeyV', 'KeyG', 'Tab'].includes(e.code)) return;
    e.preventDefault();
    if (e.code === 'Tab') { camarade(); return; }      // (aussi en pause, et sur le corps de celui qui vient de tomber)
    if (s.mort) return;
    if (enPause()) { dire('Le temps est arrêté : P pour reprendre.'); return; }
    if (e.code === 'KeyF') { piloter({ coup: true, cap: quart(s.cap + s.lacet) }); return; }
    if (e.code === 'KeyG') { piloter({ grenade: true, cap: quart(s.cap + s.lacet), el: quart(-s.pitch) }); return; }      // la grenade, dans le sens du regard (v0.158.0)
    if (e.code === 'KeyV') { if (!s.amoi) { s.amoi = true; piloter({ amoi: true }); dire('À moi !'); } return; }
    if (e.code === 'KeyR') piloter({ recharge: true });
    else if (e.code === 'Space') piloter({ saut: true });
    else { const pl = bataille()?.pilotes?.[moi()], q = e.code === 'KeyC' ? 1 : 2; piloter({ posture: (pl?.posture ?? 0) === q ? 0 : q }); }
  });
  document.addEventListener('pointerlockchange', () => {
    if (!s) return;
    if (document.pointerLockElement) { s.verrou = true; s.attente = 0; s.sourd = performance.now() + 250; } else if (s.verrou) liberer();
  });
  const prendreSouris = () => { try { const r = verrou.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* refusée : la souris libre sert */ } };
  const rendreSouris = () => { try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* rien */ } };

  function verrouiller(genre, id, mode) {
    const B = bataille(); if (!B) return false;
    if (s && s.genre === genre && s.id === id && s.mode === mode) { liberer(); return false; }      // le même bouton : on lâche
    if (!cibleDe(B, genre, id, { positions: rendu.positions })) { dire(genre === 'soldat' ? 'Cet homme n\'est plus là.' : 'Cet engin n\'est plus là.'); return false; }
    if (sortie) finirSortie();
    const avant = s?.avant ?? { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage, zoom: rendu.vue.zoom, cx: rendu.vue.cx, cz: rendu.vue.cz, fov: rendu.vue.fov };
    const deVue = !s && mode === 'personne' && !reduit() ? poseVue() : null;      // d'où plonge la caméra (pas d'un homme à un autre : Tab)
    s = { genre, id, mode, t: 0, avant, neuf: true, tir: null, fin: 0, lacet: 0, pitch: 0, verrou: false, sourd: 0, attente: 0, indice: -1 };
    if (deVue) s.entree = { t0: performance.now(), u: 0, de: deVue };
    if (genre === 'soldat') {
      rendu.cacherSoldat(id); rendu.fusil = true; rendu.fusilCamp?.(B.armee.camp[indiceDe(B, id)] ?? moi()); viseur.toggleAttribute('hidden', true);      // (un SVG n'a pas de propriété `hidden` : l'attribut)
      viseur.classList.remove('touche', 'mort'); document.body.classList.add('vue-soldat');      // plus d'interface : seuls le fusil, le viseur et les messages restent (v0.148.0)
      for (const el of [cartouches, coupEl, chocEl, peurEl, carteEl]) el.toggleAttribute('hidden', false);
      s.vuCarte = ''; s.vuBalles = ''; s.epaule = false; s.fov = SOLDAT.fov; s.course = false; s.choc = 0; s.vuCoup = 0; rendu.fusilEpaule(false);
      s.abattus = 0; s.blessure = null; s.terreur = false; s.camaradeT = -1e9; tampons.vider();
      s.parade = false; s.amoi = false; s.vuFrappe = 0; rendu.fusilParade(false);
      aide.montrer('soldat');
    }
    if (genre === 'avion' && mode === 'personne') {      // notre avion, à la personne : on le pilote, une fois en l'air (v0.157.0)
      const v = B.etat.mitraillages.find(k => k.id === id);
      if (v && v.camp === moi() && v.etat === 'vol') {
        s.vole = true; s.tirAile = false; volEl.toggleAttribute('hidden', false);
        aide.montrer('avion');
      }
    }
    if (genre === 'char' && mode === 'personne') {      // notre char, à la personne : on le conduit (v0.156.0)
      const ch = B.etat.chars.find(k => k.id === id);
      if (ch && ch.camp === moi() && ch.etat !== 'detruit') {
        s.conduit = true; s.rafale = false; s.lunette = false; conduire({ id });
        viseur.toggleAttribute('hidden', false); viseur.classList.remove('touche', 'mort'); canonEl.toggleAttribute('hidden', false);
        aide.montrer('char');
      }
    }
    if (mode === 'personne') { if (document.pointerLockElement) s.verrou = true; else { s.sourd = performance.now() + 400; s.attente = performance.now() + 2000; prendreSouris(); } } else rendreSouris();      // (Tab : la souris est déjà prise, v0.154.0)      // (sans capture au bout de 2 s : la souris libre sert)
    rendu.vue.roulis = 0; rendu.vue.secousse = 0; rendu.vue.fov = avant.fov;
    rouge.hidden = true; rouge.classList.remove('ecrase');
    badge.hidden = false; barres.hidden = mode !== 'cinema'; document.body.classList.toggle('vue-cinema', mode === 'cinema');
    document.body.classList.add('vue-verrouillee'); document.body.classList.toggle('vue-engin', !!(s.vole || s.conduit)); if (s.vole || s.conduit) rendu.lettresCachees = true;      // (les lettres des capitaines, des repères d'interface, pas dans l'image d'un engin qu'on pilote)
    return true;
  }
  /* La pose de la caméra : le point visé, sa hauteur, la distance, les angles, le champ */
  function poseVue(cible = false) { const V = rendu.vue; return { cx: V.cx, cz: V.cz, haut: V.haut, dist: V.dist ?? rendu.distanceZoom(V.zoom), yaw: cible ? V.cible.yaw : V.yaw, tangage: cible ? V.cible.tangage : V.tangage, fov: V.fov }; }      // (`cible` : les angles voulus, que la caméra rejoint en glissant)
  const melange = (a, b, f) => a + (b - a) * f;
  /* Poser la caméra entre deux poses (f de 0 à 1 ; le lacet par le plus court chemin) */
  function poser(de, vers, f) {
    const V = rendu.vue;
    V.cx = melange(de.cx, vers.cx, f); V.cz = melange(de.cz, vers.cz, f); V.haut = melange(de.haut, vers.haut, f); V.dist = melange(de.dist, vers.dist, f); V.fov = melange(de.fov, vers.fov, f);
    V.yaw = V.cible.yaw = de.yaw + angle(vers.yaw - de.yaw) * f; V.tangage = V.cible.tangage = melange(de.tangage, vers.tangage, f);
  }
  function finirSortie() {
    const S = sortie, V = rendu.vue; sortie = null; if (!S) return;
    V.dist = null; V.haut = 0; V.fov = S.vers.fov; V.cx = S.vers.cx; V.cz = S.vers.cz; rendu.placerCamera(S.vers.yaw, S.vers.tangage);
  }
  function majSortie() {
    const f = doux(temps(sortie) / PLONGEON.sortie);
    if (f >= 1) { finirSortie(); return; }
    poser(sortie.de, sortie.vers, f);
  }
  function liberer() {
    if (!s) { if (sortie) finirSortie(); return; }      // (un geste sur la caméra pendant le recul : il finit d'un coup)
    tampons.vider();
    const { avant, genre } = s, tombe = s.mort, conduit = s.conduit, vole = s.vole, de = reduit() ? null : poseVue(); s = null; rendreSouris();
    if (conduit) { conduire({ fin: true }); canonEl.toggleAttribute('hidden', true); }
    if (vole) { if (bataille()?.ailes?.[moi()]) voler({ fin: true }); volEl.toggleAttribute('hidden', true); rentrerEl.hidden = true; }
    rendu.fusilParade(false); aide.cacher();
    const V = rendu.vue;
    rendu.cacherSoldat(-1); rendu.fusilEpaule(false); rendu.fusil = false; viseur.toggleAttribute('hidden', true); for (const el of [cartouches, coupEl, chocEl, peurEl, carteEl]) el.toggleAttribute('hidden', true); document.body.classList.remove('vue-soldat'); if (genre === 'soldat') piloter({ fin: true }); V.proche = null;
    V.tgMin = null; V.haut = 0; V.dist = null; V.portee = 0; V.garde = null; V.hors = 0; V.roulis = 0; V.secousse = 0; V.fov = avant.fov;
    rendu.placerCamera(avant.yaw, avant.tangage); V.zoom = avant.zoom;
    if (de) {      // le recul (v0.160.0) : de l'œil à la vue d'avant (ou au-dessus de son corps), la distance, la hauteur, les angles et le champ ensemble
      const vers = { cx: tombe ? tombe.x : avant.cx, cz: tombe ? tombe.y : avant.cz, haut: 0, dist: rendu.distanceZoom(avant.zoom, avant.fov), yaw: avant.yaw, tangage: avant.tangage, fov: avant.fov };
      sortie = { t0: performance.now(), u: 0, de, vers }; poser(de, vers, 0);
    } else retour(avant.cx, avant.cz);           // le point visé glisse jusqu'où il était
    badge.hidden = true; barres.hidden = true; rouge.hidden = true; rouge.classList.remove('ecrase');
    document.body.classList.remove('vue-cinema', 'vue-verrouillee', 'vue-engin'); if (conduit || vole) rendu.lettresCachees = false;
    if (tombe) mort({ id: tombe.id, x: tombe.x, y: tombe.y });      // (l'homme qu'on menait est tombé : Échap ouvre sa fiche, la caméra glisse sur lui ; v0.154.0)
  }

  /* Les événements de la bataille de l'image : un tir de notre char suivi déclenche le coup d'œil vers l'explosion */
  function evenements(ev) {
    if (s?.genre === 'soldat') {      // un obus tout près (v0.152.0) : l'image se voile, le son s'étouffe, la vue tremble
      const d = s.derniere; if (!d) return;
      const B = bataille(), M = B?.armee.camp[s.indice] ?? moi(), reg = s.indice >= 0 ? B.armee.reg[s.indice] : -1, pres = (e, r) => Math.hypot(e.x - d.x, e.y - d.y) < r;
      for (const e of ev) {      // ce qui tombe autour de lui (v0.154.0) : un camarade, son régiment en déroute, une tranchée prise ou perdue tout près, sa promotion
        if (!B) break;
        if (e.type === 'mort' && e.camp === M && e.id !== s.id && pres(e, RYTHME_TAMPONS.voisin) && performance.now() - s.camaradeT > RYTHME_TAMPONS.camarade * 1000) { s.camaradeT = performance.now(); tampons.poser('camarade', nomDe(B, e.id)); }
        else if (e.type === 'deroute' && e.reg === reg) tampons.poser('deroute', `Le régiment ${B.etat.regiments[reg]?.nom ?? ''} lâche pied`);
        else if (e.type === 'promu' && e.id === s.id) tampons.poser('promu', quiEst(B, s.id).qui.grade);
        else if (e.type === 'prise' && pres(e, RYTHME_TAMPONS.tranchee)) tampons.poser(e.camp === M ? 'pris' : 'perdu');
      }
      for (const e of ev) {
        if (e.type !== 'impact') continue;
        const r = (CALIBRES[e.cal]?.rayon ?? 10) * SENS.choc, f = 1 - Math.hypot(e.x - d.x, e.y - d.y) / r;
        if (f > 0) { s.choc = Math.max(s.choc ?? 0, f); assourdir(f); }
      }
      return;
    }
    if (!s || s.genre !== 'char' || reduit()) return;
    if (s.mode === 'personne') return;      // à la personne, la vue ne bouge plus au tir (v0.165.0, Jérôme : « la caméra bouge bizarrement au tir ») : on voit l'obus partir et tomber
    for (const e of ev) if (e.type === 'char-tir' && e.id === s.id) s.tir = { t: 0, tx: e.tx, ty: e.ty };
  }

  /* Un pas : à appeler à chaque image (même en pause : la vue suit ce qui bouge, ou reste là où c'est figé) */
  function maj(dt) {
    tampons.maj();
    if (!s) { if (sortie) majSortie(); return; }
    const B = bataille(); if (!B) { liberer(); return; }
    if (B.etat.phase !== 'jour') { liberer(); return; }      // la nuit tombe (ou la bataille finit) : la vue rend la main, sinon la soirée s'ouvrait sous la vue d'un soldat, qui cache tout le HUD (v0.152.1)
    const c = cibleDe(B, s.genre, s.id, { memo: s, positions: rendu.positions, dt });
    if (!c) {
      if (s.genre === 'soldat') {
        // il est tombé (sa fiche est gardée : `etat.defunts`) : on reste une seconde sur son corps, la vue tombe avec lui ; Tab prend un camarade, Échap rend la vue et ouvre sa fiche (v0.154.0)
        // parti vivant (évacué, relevé) : la vue est libérée
        const d = B.etat.defunts?.[s.id];
        if (d && !s.mort) {
          s.mort = { t: 0, t0: performance.now(), id: s.id, x: d[17], y: d[18] };      // (la place du corps : les champs 17 et 18 de la fiche ; 11 et 12 sont des caractéristiques : la v0.148.0 visait là, à tort) piloter({ fin: true });
          rendu.fusil = false; rendu.lettresCachees = true; viseur.toggleAttribute('hidden', true); cartouches.toggleAttribute('hidden', true); carteEl.toggleAttribute('hidden', true); rendu.fusilParade(false);
          dire('Il est tombé · Tab : un camarade · Échap : sa fiche'); aide.cacher();
        }
        if (s.mort) {
          const M = s.mort, V = rendu.vue, r = reduit(); M.t = (performance.now() - M.t0) / 1000;      // (l'horloge réelle : la chute dure une seconde même si les images sont lentes)
          { const q = rendu.placeCorps?.(M.id); if (q) { M.x = q.x; M.y = q.y; } }      // le corps tel qu'il est dessiné, pas la place de la mort : un obus le jette plus loin (v0.160.1)
          // la vue quitte ses yeux : elle vise son corps au sol, recule de 3 m et le regarde d'en haut
          const f = r ? 1 : doux(M.t / 1.0), sol = rendu.hauteurSol(Math.max(0, M.x), Math.max(0, M.y)), k = r || f >= 1 ? 1 : Math.min(1, dt * 5);
          V.cx += (M.x - V.cx) * k; V.cz += (M.y - V.cz) * k;
          V.haut += (sol + 0.2 - SOL_Y - V.haut) * k; V.dist = SOLDAT.dist + MORT_VUE.recul * f;
          V.cible.tangage = V.tangage = s.pitch + (MORT_VUE.tangage - s.pitch) * f; V.fov = SOLDAT.fov;
          V.roulis = r ? 0 : 0.12 * Math.sin(Math.PI * Math.min(1, M.t / 1.2)); V.secousse = 0;
          s.choc = Math.max(0, (s.choc ?? 0) - dt / SENS.chocDuree); chocEl.style.opacity = (s.choc * 0.7).toFixed(3); peurEl.style.opacity = (0.75 * f).toFixed(3);
          return;
        }
        liberer(); dire('Il a quitté le front : la vue est libérée.');
        return;
      }
      dire(s.genre === 'avion' ? 'L\'avion est rentré : la vue est libérée.' : 'La vue est libérée.'); liberer(); return;
    }
    s.derniere = { x: c.x, y: c.y };
    const perso = s.mode === 'personne', r = reduit(), V = rendu.vue, P = c.perso;
    s.t += dt;
    // l'avion tombé : on reste à bord ; on le quitte quelques secondes après l'écrasement
    const chute = c.etat === 'chute', epave = c.etat === 'epave';
    if (epave) { s.fin += dt; if (s.fin > ECRASE) { dire('L\'avion s\'est écrasé : la vue est libérée.'); liberer(); return; } }
    // le point visé (hors de la vue à la personne : le centre de l'engin ; dedans : l'œil), qui le suit sans à-coup
    const px = perso ? P.x : c.x, py = perso ? P.y : c.y;
    const k = s.neuf || r || perso ? 1 : 1 - Math.exp(-dt * 9);
    V.cx += (px - V.cx) * k; V.cz += (py - V.cz) * k;
    let sol = rendu.hauteurSol(Math.max(0, px), Math.max(0, py));
    // l'homme (v0.165.0, Jérôme : « la vue tremble, saute ») : le sol est en marches de 25 cm, l'œil les montait d'un coup à chaque case ; il les suit en douceur
    if (s.genre === 'soldat') { s.solL = s.neuf || s.solL === undefined || r ? sol : s.solL + (sol - s.solL) * (1 - Math.exp(-dt * SOLDAT.lisse)); sol = s.solL; }
    const regard = perso ? P.h : c.regard, haut = sol + regard - SOL_Y;
    V.haut += (haut - V.haut) * (s.neuf || perso ? 1 : Math.min(1, dt * 6));
    V.portee = s.genre === 'avion' ? PORTEE_AVION : PORTEE; V.hors = HORS; V.zoom = perso ? PERSONNE.zoom : c.zoom; V.dist = perso ? P.chasse?.dist ?? PERSONNE.dist : null; V.garde = perso ? PERSONNE.garde : null;
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
    // l'homme : le pilote que la simulation tient (épaulé, son magasin), le balancement de son guidon (la même fonction que la balle : tir-joueur.js), le champ qui se resserre épaulé
    const pl = homme && B.pilotes?.[moi()]?.id === s.id ? B.pilotes[moi()] : {};
    let bc = 0, be = 0;
    if (homme) {
      if (s.indice >= 0 && pl.epaule) [bc, be] = balancement(B.armee, s.indice, B.etat.temps, { epaule: true, souffle: pl.souffle ?? 0, posture: pl.posture ?? 0 });      // (le guidon ne balance la vue qu'épaulé, v0.165.0 : à la hanche, sans viseur, la vue reste posée ; la balle, elle, part toujours avec le balancement)
      viseur.toggleAttribute('hidden', !s.epaule);      // le viseur n'est là qu'épaulé (v0.165.0, Jérôme : « pas de viseur avant d'épauler »)
      const voulu = pl.epaule ? TJ.epaule.fov : SOLDAT.fov; s.fov += (voulu - s.fov) * (r ? 1 : Math.min(1, dt / TJ.epaule.entre * 3));
    }
    V.fov = homme ? s.fov : perso && P.chasse ? P.chasse.fov : s.avant.fov * (1 - TIR.tele * w);
    // l'angle : à la personne, dans la direction du regard ; au cinéma, derrière l'engin, puis un balayage lent autour de lui
    // la souris : le regard qu'on a choisi s'ajoute au cap de l'engin ; pendant le coup d'œil vers l'explosion la vue file d'abord vers elle (w), puis revient au regard choisi
    const libre = perso ? 1 - w : 0;
    const chasse = chasseDe(tete + (perso ? s.lacet * libre : 0) + bc);
    const balai = perso || r ? 0 : 0.7 + 1.7 * Math.sin(s.t * 2 * Math.PI / (CINEMA.periode * 2) - 0.6);
    const voulu = chasse + balai, d = angle(voulu - V.cible.yaw);
    V.cible.yaw += d * (s.neuf ? 1 : perso && s.genre === 'avion' ? Math.min(1, dt * CHASSE.avion.suit) : perso ? Math.min(1, dt * (w > 0 || s.tir ? 14 : 24)) : Math.min(1, dt * 3)); if (s.neuf) V.yaw = V.cible.yaw;
    // l'inclinaison : à plat (le char), penchée vers le sol (l'avion), qui pique quand il tombe ; au cinéma, un va-et-vient bas
    if (homme) V.cible.yaw = V.yaw = voulu;      // la souris, tout de suite : pas de retard sur le regard
    let tg = perso ? P.tangage + s.pitch * libre : CINEMA.tangage[0] + (r ? 0 : CINEMA.tangage[1] * Math.sin(s.t * 2 * Math.PI / CINEMA.periode) + CINEMA.tangage[2]);
    if (perso && (chute || epave)) tg = epave ? 1.2 : Math.min(1.2, (s.pique ?? P.tangage) + dt * 0.7), s.pique = tg;
    if (homme) tg = s.pitch - be;      // (l'élévation de la balle est −pitch : le guidon qui monte relève la vue)
    V.cible.tangage = tg; if (s.neuf || (perso && chute) || homme) V.tangage = tg;
    // ZQSD (les touches physiques W, A, S, D : la même place en AZERTY et en QWERTY) : on marche dans le sens du regard ; la simulation lit `B.pilote` à chaque pas (army.js, `pasArmee`)
    if (homme) {
      const cap = P.cap + s.lacet, av = (touche('KeyW') ? 1 : 0) - (touche('KeyS') ? 1 : 0), la = (touche('KeyD') ? 1 : 0) - (touche('KeyA') ? 1 : 0);
      s.cap = P.cap;
      // la commande de marche : au premier pas, puis quand les touches changent, et quand le cap change de plus d'un millième (au plus vingt fois par seconde), seulement en marchant
      // Maj maintenue : courir (la commande part au changement)
      const court = touche('ShiftLeft') || touche('ShiftRight');
      if (court !== s.course && !enPause()) { s.course = court; if (court && s.epaule) epauler(false); piloter({ course: court }); }
      const cle = `${av}|${la}`, marche = av !== 0 || la !== 0, q = quart(cap);
      if (cle !== s.cleMarche || (marche && q !== s.capEnvoye && s.t - (s.tEnvoi ?? -1) >= 0.05) || s.cleMarche === undefined) {
        s.cleMarche = cle; s.capEnvoye = q; s.tEnvoi = s.t;
        piloter({ id: s.id, cap: q, av, la });
      }
      // (ce que le dernier coup a donné : écrit par la simulation, la même chez les deux joueurs)
      // le magasin : une cartouche par trait, vide en creux ; elles clignotent pendant qu'il recharge (aucun texte : on le voit)
      const W = armeDe(B.armee.camp[s.indice] ?? moi()), nb = pl.balles ?? W.balles, gr = pl.grenades ?? TJ.grenade.nombre, cleB = `${nb}/${W.balles}/${pl.recharge ? 1 : 0}/${gr}`;
      if (cleB !== s.vuBalles) {
        s.vuBalles = cleB; cartouches.classList.toggle('recharge', !!pl.recharge);
        cartouches.innerHTML = Array.from({ length: W.balles }, (_, k) => `<i${k < nb ? '' : ' class="vide"'}></i>`).join('') + '<b class="gren"></b>'.repeat(Math.max(0, gr));      // (les grenades qui restent, v0.158.0)
      }
      // ce que le coup a donné : le recul du fusil, le viseur (touché, tombé), le refus dit à voix haute
      if (pl.dernier && pl.dernier.n !== s.vuTir) {
        s.vuTir = pl.dernier.n; rendu.fusilTir();
        viseur.classList.remove('touche', 'mort'); void viseur.getBoundingClientRect(); if (pl.dernier.touche) viseur.classList.add(pl.dernier.mort ? 'mort' : 'touche');
        if (pl.dernier.ami) tampons.poser('ami', [pl.dernier.cible !== undefined ? nomDe(B, pl.dernier.cible) : '', ZONES_EN_MOTS[pl.dernier.zone] ?? ''].filter(Boolean).join(' · '));      // notre balle a touché un des nôtres (v0.158.0)
        if (pl.dernier.touche) {      // le tampon : son nom, où la balle l'a pris ; abattu, le compte depuis qu'on le mène
          const qui = pl.dernier.cible !== undefined ? nomDe(B, pl.dernier.cible) : '', ou = ZONES_EN_MOTS[pl.dernier.zone] ?? '';
          if (pl.dernier.mort) { s.abattus++; tampons.poser('abattu', [qui, ou, s.abattus > 1 ? `le ${s.abattus}e` : ''].filter(Boolean).join(' · ')); }
          else tampons.poser('touche', [qui, ou].filter(Boolean).join(' · '));
        }
      }
      if (pl.refus) { dire(pl.refus); pl.refus = null; }
      if (pl.frappe && pl.frappe.n !== s.vuFrappe) {      // le coup de baïonnette : le fusil part en avant, le viseur dit s'il a porté
        s.vuFrappe = pl.frappe.n; rendu.fusilCoup();
        viseur.classList.remove('touche', 'mort'); void viseur.getBoundingClientRect(); if (pl.frappe.touche) viseur.classList.add(pl.frappe.mort ? 'mort' : 'touche');
      }
      // les sensations : d'où vient le coup (un arc couleur de sang du côté du tireur ; plus pâle quand la balle frôle), le monde qui penche un instant, le souffle d'un obus, la peur qui ferme le champ
      if (pl.coup && pl.coup.n !== s.vuCoup) {
        s.vuCoup = pl.coup.n;
        const rel = Math.atan2(pl.coup.y - P.y, pl.coup.x - P.x) - (P.cap + s.lacet);
        const ra = angle(rel);      // (sur une ellipse au bord de l'image : devant, en haut ; à droite, à droite)
        coupEl.style.setProperty('--angle', `${(ra * 180 / Math.PI).toFixed(1)}deg`); coupEl.style.setProperty('--x', `${(50 + 44 * Math.sin(ra)).toFixed(1)}%`); coupEl.style.setProperty('--y', `${(50 - 44 * Math.cos(ra)).toFixed(1)}%`);
        coupEl.classList.remove('touche', 'frole'); void coupEl.getBoundingClientRect(); coupEl.classList.add(pl.coup.touche ? 'touche' : 'frole');
        if (pl.coup.touche && !r) s.penche = SENS.roulis * (Math.sin(rel) >= 0 ? -1 : 1);
      }
      s.penche = (s.penche ?? 0) * Math.exp(-dt * 4);
      s.choc = Math.max(0, (s.choc ?? 0) - dt / SENS.chocDuree);
      chocEl.style.opacity = (s.choc * 0.7).toFixed(3);
      peurEl.style.opacity = s.indice >= 0 ? (B.armee.peur[s.indice] * SENS.peur).toFixed(3) : '0';
      if (s.indice >= 0) {      // ce qui lui arrive (v0.154.0) : une blessure neuve, la terreur (au dernier repère de la peur ; elle ne revient qu'après être redescendue)
        const bl = B.armee.blessure[s.indice], peur = B.armee.peur[s.indice];
        if (s.blessure !== null && bl && bl !== s.blessure) tampons.poser('blesse', BLESSURES_FPS[bl] ?? '');
        s.blessure = bl;
        if (!s.terreur && peur >= REPERES.peur[2]) { s.terreur = true; tampons.poser('terrifie'); } else if (s.terreur && peur < REPERES.peur[1]) s.terreur = false;
      }
      if (s.indice >= 0) {      // sa carte (v0.165.0) : son nom, son grade, son régiment, son corps (la blessure), la peur, les jambes, les bras ; refaite seulement quand un chiffre change
        const A = B.armee, i = s.indice, q = v => Math.round(v * 20), cle = `${A.blessure[i]}|${q(A.peur[i])}|${q(A.fatJ[i])}|${q(A.fatB[i])}|${B.etat.grades[s.id]?.[0] ?? -1}`;
        if (cle !== s.vuCarte) {
          s.vuCarte = cle; const { qui, reg } = quiEst(B, s.id);
          carteEl.innerHTML = `<div class="cs-nom"><b>${qui.prenom} ${qui.nom}</b><span>${majuscule(qui.grade)}${reg?.nom ? ` · ${reg.nom}` : ''}</span></div>`
            + corps(A.blessure[i], s.id) + '<div class="jauges">'
            + jauge({ nom: 'Peur', val: A.peur[i], reperes: REPERES.peur }) + jauge({ nom: 'Jambes', val: A.fatJ[i], reperes: REPERES.fatigue }) + jauge({ nom: 'Bras', val: A.fatB[i], reperes: REPERES.fatigue }) + '</div>';
        }
      }
    }
    // le char conduit (v0.156.0) : ZQSD envoient la conduite au changement, le regard part pour les mitrailleuses, la barre du canon se remplit, Maj la lunette
    if (s.conduit) {
      const av = (touche('KeyW') ? 1 : 0) - (touche('KeyS') ? 1 : 0), tr = (touche('KeyD') ? 1 : 0) - (touche('KeyA') ? 1 : 0), cle = `${av}|${tr}`;
      if (cle !== s.cleConduite && !enPause()) { s.cleConduite = cle; conduire({ av, tr }); }
      const regard = quart(c.cap + s.lacet * libre);
      if (Math.abs(regard - (s.regardEnvoye ?? 1e9)) > 0.02 && s.t - (s.tRegard ?? -1) >= 0.1 && !enPause()) { s.regardEnvoye = regard; s.tRegard = s.t; conduire({ regard }); }
      const K = B.conduites?.[moi()], ch = B.etat.chars.find(k => k.id === s.id), G = ch && CHARS[ch.modele]?.canon;
      if (K?.refus) { dire(K.refus); K.refus = null; }
      if (ch && G) canonEl.style.setProperty('--plein', Math.max(0, Math.min(1, (B.etat.temps - (ch.canonT ?? 0)) / (G.recharge * (ch.canonMod ?? 1)))).toFixed(3));
      canonEl.classList.toggle('auto', !(K?.tirMain ?? true)); viseur.classList.toggle('auto', !(K?.tirMain ?? true));
      s.lunette = touche('ShiftLeft') || touche('ShiftRight');
      if (s.lunette && !w) V.fov = (P.chasse?.fov ?? s.avant.fov) * 0.4;
      if (ch?.etat === 'detruit') { dire('Le char est détruit.'); liberer(); return; }
    }
    // l'avion piloté (v0.157.0) : on prend les commandes dès qu'il est en l'air, Q/D et Z/S partent au changement ; la vue suit son roulis ; trois jauges : altitude, essence, munitions
    if (s.vole && !chute && !epave) {
      const v = B.etat.mitraillages.find(k => k.id === s.id), K = B.ailes?.[moi()];
      if (v && (!K || K.id !== s.id) && v.etat === 'vol' && !v.retour && (v.main || !refusPrise(v, B.etat.temps)) && s.t - (s.tPrise ?? -9) > 0.3 && !enPause()) { s.tPrise = s.t; s.cleVol = undefined; voler({ id: s.id }); }
      if (K && K.id === s.id) {
        const ro = (touche('KeyD') ? 1 : 0) - (touche('KeyA') ? 1 : 0), pi = (touche('KeyW') ? 1 : 0) - (touche('KeyS') ? 1 : 0), cle = `${ro}|${pi}`;      // Z monte, S descend (v0.165.0, Jérôme ; avant, comme un manche : Z piquait)
        if (cle !== s.cleVol && !enPause()) { s.cleVol = cle; voler({ ro, pi }); }
      }
      // les toasts du vol (v0.165.0) : il roule et décolle, il est à vous, il rentre, il se pose
      const aMoi = !!(K && K.id === s.id), etape = v?.retour ? ((c.alt ?? 99) < 3 ? 'pose' : 'retour') : aMoi ? 'main' : v && !v.main && refusPrise(v, B.etat.temps) ? 'decolle' : '';
      if (etape && etape !== s.etapeVol) {
        if (etape === 'decolle' && !s.etapeVol) dire('Décollage : il roule et prend l\'air, vous aurez les commandes en vol.');
        else if (etape === 'main') dire('En l\'air : il est à vous. Z monter · S descendre · Q D tourner · clic tirer.');
        else if (etape === 'retour' && s.etapeVol !== 'retour') dire('Retour à la base : il se pose seul.');
        else if (etape === 'pose') dire('Atterrissage.');
        s.etapeVol = etape;
      }
      rentrerEl.hidden = !aMoi || !!v?.retour;
      const m = v?.main, A = AVION_MAIN;
      volEl.style.setProperty('--alt', Math.max(0, Math.min(1, (c.alt ?? 0) / A.plafond)).toFixed(3));
      volEl.style.setProperty('--ess', m ? Math.max(0, m.essence / A.essence).toFixed(3) : '1');
      volEl.style.setProperty('--mun', m ? Math.max(0, m.munitions / A.munitions).toFixed(3) : '1');
      volEl.classList.toggle('auto', !!K?.auto); volEl.classList.toggle('rentre', !!v?.retour);
      if (!r) V.roulis = -(c.roulis ?? 0) * CHASSE.avion.roulis;      // (une part de son roulis : l'avion penche dans l'image, l'horizon un peu)
    }
    // le tonneau et l'écran rouge de l'avion abattu (la vue à la personne seulement)
    if (perso && (chute || epave) && s.genre === 'avion') {
      V.roulis += (chute && !r ? 5 : 0) * dt;        // (le même tour par seconde que la vrille de la maquette : rendu/avions.js)
      secousse = r ? 0 : Math.max(secousse, chute ? 0.04 : 0.015);
      rouge.hidden = false; rouge.classList.toggle('ecrase', epave);
    } else if (!perso || s.genre !== 'avion') V.roulis = homme ? (s.penche ?? 0) : 0;
    if (homme && !r) secousse = Math.max(secousse, (s.choc ?? 0) * 0.02);
    V.secousse = r ? 0 : secousse;
    // le plongeon (v0.160.0) : la caméra part de la vue d'avant et descend jusqu'à l'œil ; le fusil n'arrive qu'à la fin, le viseur se dessine peu à peu
    if (s.entree) {
      const f = r ? 1 : doux(temps(s.entree) / PLONGEON.entree);
      if (f >= 1) s.entree = null; else { poser(s.entree.de, poseVue(true), f); viseur.style.opacity = String(f * f); }
      if (homme) rendu.fusil = !s.entree;
      if (!s.entree) viseur.style.opacity = '';
    }
    // la fenêtre des commandes : les bascules en marche (v0.158.0)
    if (aide.mode) {
      const Pm = homme ? (B.pilotes?.[moi()] ?? {}) : {}, Kc = s.conduit ? B.conduites?.[moi()] : null, Ka = s.vole ? B.ailes?.[moi()] : null;
      aide.maj(homme ? { course: !!Pm.course, accroupi: Pm.posture === 1, couche: Pm.posture === 2, amoi: !!Pm.amoi } : s.conduit ? { conduiteAuto: Kc ? !Kc.main : false, tirAuto: Kc ? !Kc.tirMain : false } : { tirAuto: !!Ka?.auto });
    }
    s.neuf = false;
    nom.textContent = `${c.nom}${c.camp !== undefined && c.camp !== (B.etat.moi ?? 0) ? ' ennemi' : ''} · ${homme ? 'ZQSD pour marcher, la souris pour regarder' : perso ? 'à la personne' : 'vue verrouillée'} · Échap pour libérer`;
  }
  return { verrouiller, liberer, maj, evenements, tirer, get actif() { return s; }, get mene() { return !!s && (s.genre === 'soldat' || !!s.conduit || !!s.vole); } };
}
