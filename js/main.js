// Le cycle de vie : écran titre → bataille → nuit → fin ; pause active,
// réglages, sauvegarde, mise à jour, debug. Les règles sont dans bataille.js
// (pures), le dessin dans rendu3d.js (il ne modifie jamais l'état).
import { createLoop } from './lib/loop.js?v=0.41.3';
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.41.3';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.41.3';
import { createGamepad } from './lib/gamepad.js?v=0.41.3';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.41.3';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.41.3';
import { ROLES } from './palette.js?v=0.41.3';
import { VERSION_CAMPAGNE, CLE as CLE_CAMPAGNE, cloturerDansLeStore, nouvelleCampagne, suivante, passage, bilan as bilanCampagne } from './campagne.js?v=0.41.3';
import { MISSIONS, EUX, nouvelleBataille, etapesRestaurer, avancer, aube, ordonnerMarche, peutOrdonner, ordonnerBarrage, peutBarrage, ordonnerStance, peutStance, horloge, effectifs, tronconsTenus, moralEnMots, terrainResume, forcesTroncons, largeurZone, lettreZone, etendueZones, nomTroncon, actionDe, secteursDe, tronconsDeLigne, zone, photo, restaurer, PAS, NOUS } from './bataille.js?v=0.41.3';
import { ligneY } from './tranchees.js?v=0.41.3';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.41.3';
import { STANCES, STANCE_DEFAUT } from './data/stances.js?v=0.41.3';
import { METEO } from './data/meteo.js?v=0.41.3';
import { impact, hydroLignes } from './terrain.js?v=0.41.3';
import { hash2 } from './lib/rng.js?v=0.41.3';
import { creerRendu, CAMERA } from './rendu3d.js?v=0.41.3';
import { etatEnMots, experienceEnMots, chevrons } from './identite.js?v=0.41.3';
import { CORVEES } from './data/corvees.js?v=0.41.3';
import { refusCorvee } from './nuit.js?v=0.41.3';
import { chargerContenu, appliquerSecteurs, appliquerCartes } from './design-store.js?v=0.41.3';
import * as lecture from './hud/lecture.js?v=0.41.3';
import { creerFiche } from './hud/fiche.js?v=0.41.3';
import { chevronsHtml } from './hud/barres.js?v=0.41.3';
import { creerNuit, corveeDe, corveeCourte } from './hud/nuit.js?v=0.41.3';
import { creerCampagne } from './hud/campagne.js?v=0.41.3';
import { creerCarnet, deux } from './hud/carnet.js?v=0.41.3';
import { creerCarte } from './hud/carte.js?v=0.41.3';
import { creerPertes } from './hud/pertes.js?v=0.41.3';
import { creerBarreTemps } from './hud/temps.js?v=0.41.3';
import { creerChargement } from './hud/chargement.js?v=0.41.3';
import { SECTEURS } from './data/secteur.js?v=0.41.3';
import { creerLockstep, empreinteEtat } from './reseau/lockstep.js?v=0.41.3';
import { nouveauCode, codeValide, publier, ecouter } from './reseau/relais.js?v=0.41.3';
import { creerHote, creerInvite } from './reseau/lien.js?v=0.41.3';

const JEU = 'cyclopeen';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const ESSAI = params.get('essai');                         // ?essai=crete&graine=5 : l'atelier lance une bataille d'essai sur ce secteur (avec ses retouches de ce navigateur), sans écran titre ni sauvegarde
const SOLDATS = Number(params.get('soldats')) || 0;      // essai de charge : ?soldats=8000 (les deux camps)
const MESURE = params.has('mesure');                      // le rendu attend la fin du dessin (mesure honnête, plus lente)

for (const [role, couleur] of Object.entries(ROLES)) document.documentElement.style.setProperty(`--jeu-${role}`, couleur);

const store = createStore({
  game: JEU,
  debug: DEBUG,
  entries: {
    partie: { version: 1 },
    campagne: { version: VERSION_CAMPAGNE },   // le registre d'une campagne (js/campagne.js) ; en mode debug, une autre clé
    prefs: { version: 1, debugWrites: false, defaults: { zoom: 2, camera: null, carte: true } },
  },
  secret: ['gh-token'],
});
const chargement = creerChargement({ $, instantane: DEBUG });
chargement.progres(0.3, 'Le jeu');
const prefs = store.load('prefs');
// La carte se replie sur son en-tête (Jérôme, v0.30.0) : le champ gagne ~440 px de haut sur un petit écran ; l'état est retenu
function replierCarte(replie) {
  $('carte').classList.toggle('replie', replie);
  $('carte-bascule').setAttribute('aria-expanded', String(!replie));
  $('carte-bascule').setAttribute('aria-label', replie ? 'Déplier la carte du secteur' : 'Replier la carte du secteur');
}
replierCarte(prefs.carte === false);
$('carte-bascule').onclick = e => { const r = !$('carte').classList.contains('replie'); replierCarte(r); prefs.carte = !r; store.save('prefs', prefs); e.currentTarget.blur(); };
const { reglages: R, secteurs: retouchesSecteurs, cartes: cartesPerso } = await chargerContenu();
appliquerCartes(SECTEURS, cartesPerso);              // les cartes à vous (l'atelier) s'ajoutent à la liste des parties
appliquerSecteurs(SECTEURS, retouchesSecteurs);       // les retouches de l'atelier (publiées, puis celles de ce navigateur) : le terrain de départ des secteurs
chargement.progres(0.45, 'Les réglages');

let B = null;                 // la bataille en cours
let vitesse = 1;              // ×1, ×2, ×4 : la vitesse du temps (plafonnée par le coût de la simulation)
let pauseActive = false;      // Espace : le temps s'arrête, les ordres restent possibles
let forme = 'bloc';            // la forme des prochains ordres en terrain libre (bloc, ligne, par deux, colonne) ; sur une tranchée, les hommes suivent le tracé
let modeMarche = false;        // le bouton « Marcher » d'une carte : le prochain clic sur le sol envoie les régiments choisis
let modeBarrage = null;       // un calibre : le prochain clic gauche vise
let MOI = NOUS;               // le camp qu'on joue : le nôtre (bleu), ou le kaki quand on est l'invité d'une partie à deux (v0.30.0)
let reseau = null;            // une partie à deux sur le réseau : { moi, lien, ls, nuit : { corvees, pret } } ; sinon null
let choisis = new Set();      // les régiments choisis (ids)
const perf = { sim: 0, pas: 0 };

// Lire la bataille en mots (hud/lecture.js) et les fiches (hud/fiche.js) : la bataille en cours leur est donnée à chaque appel
const { majuscule, nomDe, enMots, pluriel } = lecture;
const indiceDe = id => lecture.indiceDe(B, id), quiEst = id => lecture.quiEst(B, id), tombe = id => lecture.tombe(B, id);
const corpsSous = (x, y, r) => lecture.corpsSous(B, x, y, r);
const numeroDe = r => lecture.numeroDe(B, r);     // le numéro d'ordre : « 3 · Viride »
const bilan = reg => lecture.bilan(B, reg), refuseAujourdhui = reg => lecture.refuseAujourdhui(B, reg);
const { noter, vider: viderCarnet } = creerCarnet({ $, bataille: () => B });
const majPertes = creerPertes({ $, moi: () => MOI });
const majBarreTemps = creerBarreTemps({ $, bataille: () => B });
const laCarte = creerCarte({
  $, bataille: () => B, choisis: () => choisis,
  surSecteur: (s, ajout) => choisirSecteur(s, ajout), surCase: (idx, s) => ordreCase(idx, s),
  surRonde: (r, ajout) => r.camp === MOI ? choisirRegiment(r.id, ajout) : montrerRegiment(r.id),
  moi: () => MOI,
});
const nuit = creerNuit({
  $, bataille: () => B, choisis: () => choisis, pauser: () => { if (!reseau) loop.pause(); }, reprendre: () => reprendre(),
  sauvegarder: () => sauvegarder(), majHud: () => majHud(), toast: (t, g) => toast(t, g), dire: r => dire(r), invalider: () => { regimentsVus = ''; },
  moi: () => MOI, enReseau: () => !!reseau,
  surChoix: (reg, id) => reseau?.ls?.commander({ t: 'corvee', reg, id }), surPret: () => reseau.ls.commander({ t: 'pret' }),
});
const laCampagne = creerCampagne({ $ });
const laFiche = creerFiche({ $, R, bataille: () => B });
const { montrerFiche, montrerSoldat, montrerRegiment, fermer: fermerFiche, maj: majFiche } = laFiche;

lockBrowserGestures($('ecran'));
stopTypeahead();
chargement.progres(0.5, 'Le moteur de rendu');
const rendu = await creerRendu($('canvas'), { mesure: MESURE });
// les retours sur le champ : le fanion et la réponse des hommes d'un ordre en terrain libre, l'impact des obus en trois temps (v0.41.3)
const retours = creerRetours({ $, rendu: () => rendu, bataille: () => B });
chargement.progres(0.75, 'Le champ de bataille');
rendu.redimensionner();
addEventListener('resize', () => rendu.redimensionner());

// ─── Écrans ────────────────────────────────────────────────────────────────
const enJeu = () => !!B && $('titre').hidden;

/* Derrière l'écran titre, le moteur du jeu (Jérôme, v0.8.1) : une bataille de décor, jamais sauvegardée. Un
   no man's land labouré et gorgé de pluie, des morts, l'heure arrêtée au coucher du soleil (ombres longues, le
   soir qui tombe), des obus au loin et une fumée dense. La caméra au ras du sol, et une image différente à
   chaque lancement : la graine, le lieu, la direction, l'heure (Jérôme, v0.8.2). L'aspect seulement : le
   hasard d'ici n'entre dans aucune règle. */
let D = null, decorT = 0, decorObus = 0, decorVue = null;
function decor() {
  if (D) return D;
  const hasard = Math.random;
  D = nouvelleBataille(Math.floor(hasard() * 100000), R, { soldats: 240 });
  const T = D.terrain, m = D.etat.marges;
  // le lieu (dans le secteur), la direction (n'importe laquelle), la hauteur (quelques mètres), l'heure (17 h à 17 h 45)
  decorVue = {
    cx: m.x + 80 + hasard() * 240, cz: m.y + 70 + hasard() * 160,
    yaw: hasard() * Math.PI * 2, tangage: 0.045 + hasard() * 0.04,
    sens: hasard() < 0.5 ? -1 : 1, heure: 17 + hasard() * 0.75,
  };
  const { cx, cz } = decorVue;
  for (let k = 0; k < 220; k++) impact(T, cx - 150 + hasard() * 300, cz - 150 + hasard() * 300, NOMS_CALIBRES[k % 3], R, k);
  for (let h = 0; h < 18; h++) hydroLignes(T, 0, T.H, METEO.pluie, R);
  for (let k = 0; k < 220; k++) D.etat.corps.push([Math.round((cx - 130 + hasard() * 260) * 10), Math.round((cz - 130 + hasard() * 260) * 10), k % 3 ? 0 : 1, 1, 900000 + k]);
  D.etat.meteo[0] = hasard() < 0.6 ? 'brouillard' : 'sec';
  return D;
}
// l'heure du décor, arrêtée
const tickDecor = h => Math.round(R.jour.duree / PAS * (h - R.jour.heureDebut) / (R.jour.heureFin - R.jour.heureDebut));
function decorPas(dt) {
  const d = decor(), v = decorVue;
  decorT += dt;
  d.etat.tickJour = tickDecor(v.heure);
  // des obus, devant la caméra, au loin
  if ((decorObus -= dt) < 0) {
    decorObus = 1.2 + Math.random() * 2;
    const loin = 60 + Math.random() * 160, cote = (Math.random() - 0.5) * 140;
    const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
    ordonnerBarrage(d, NOMS_CALIBRES[Math.floor(Math.random() * 3)], rendu.vue.cx + fx * loin - fz * cote, rendu.vue.cz + fz * loin + fx * cote, 1);
  }
  const ev = avancer(d);
  // la fumée dense : des colonnes qui montent de quelques trous et dérivent avec le vent
  for (let k = 0; k < 10; k++) {
    if (Math.random() > 0.35) continue;
    rendu.fumer(v.cx - 140 + hash2(k, 11, 3) * 280, v.cz - 140 + hash2(k, 12, 3) * 280);
  }
  // la vue glisse lentement de côté, et revient
  const g = Math.sin(decorT * 0.03) * 40 * v.sens;
  rendu.vue.cx = v.cx + Math.cos(v.yaw) * g;
  rendu.vue.cz = v.cz - Math.sin(v.yaw) * g;
  return ev;
}
function montrerDecor() {
  decor();
  rendu.bord = null;                               // l'écran titre garde le ciel de brume
  rendu.attacher(D);
  rendu.vue.zoom = 4;
  rendu.cameraLibre(decorVue.yaw, decorVue.tangage);
  decorObus = 0.5;
}
function montrerTitre() {
  if (reseau) return quitterReseau();
  loop.pause();
  montrerDecor();
  $('titre').hidden = false;
  $('hud').hidden = true;
  $('continuer').hidden = !store.has('partie');
  // La campagne (lot 7) : « Continuer » reprend la bataille de la campagne si c'est elle qu'on a laissée ; si on l'a remplacée par une autre partie, « Continuer la campagne » repart de la bataille qui suit
  const partie = $('continuer').hidden ? null : store.load('partie'), c = campagneEnCours();
  const laSienne = !!partie?.campagne && partie.campagne.id === c?.id;
  $('continuer').textContent = partie?.campagne ? 'Continuer la campagne' : 'Continuer';
  $('continuer-campagne').hidden = !c || laSienne;
  ($('continuer').hidden ? ($('continuer-campagne').hidden ? $('nouvelle') : $('continuer-campagne')) : $('continuer')).focus();
}
// la campagne laissée en cours (le registre `cyclopeen:campagne`), ou rien
function campagneEnCours() { const c = store.load(CLE_CAMPAGNE); return c?.statut === 'en cours' ? c : null; }
// une question à deux issues, dans la boîte de confirmation : vrai si le joueur répond oui
function confirmer(texte, oui) {
  const d = $('dialogue-confirmer');
  $('confirmer-texte').textContent = texte; $('confirmer-oui').textContent = oui;
  return new Promise(ok => { d.onclose = () => ok(d.returnValue === 'oui'); d.showModal(); });
}
// L'objectif de celui qui joue : la mission est celle des nôtres ; à deux, en face a l'objectif inverse (tenir ce qu'on attaque, prendre ce qu'on tient)
const objectif = () => (MOI === NOUS) === (B.etat.mission === 'tenir') ? 'tenir' : 'prendre';
function reglerCamp(camp) {
  MOI = camp;
  // l'interface parle de « nous » en bleu et « eux » en face : à l'invité, le kaki est « nous »
  document.documentElement.style.setProperty('--jeu-nous', camp === NOUS ? ROLES.nous : ROLES.eux);
  document.documentElement.style.setProperty('--jeu-eux', camp === NOUS ? ROLES.eux : ROLES.nous);
}
function jouer(bataille) {
  B = bataille;
  if (!reseau) reglerCamp(NOUS);
  rendu.bord = 'faux-ciel';                        // le champ se prolonge dans le ciel du jour, que la nuit mange (v0.33.0 ; le ciel suit la météo, v0.36.7)
  rendu.attacher(B); retours.vider();
  rendu.vue.zoom = prefs.zoom ?? 2;
  // la caméra du joueur (ou celle de départ : l'écran titre a la sienne) ; un réglage de la v0.2, sans tangage, est ignoré
  if (prefs.camera?.tangage) rendu.placerCamera(prefs.camera.yaw, prefs.camera.tangage); else rendu.placerCamera(CAMERA.yaw, CAMERA.tangage);
  if (MOI === EUX) rendu.placerCamera(Math.PI + CAMERA.yaw, CAMERA.tangage);      // l'invité regarde vers le sud : ses lignes sont en bas
  choisis = new Set(); rendu.choisis = choisis;
  modeBarrage = null; modeMarche = false; pauseActive = false; vitesse = 1; loop.setTimeScale(1); fermerFiche(); nuit.fermer(); laCampagne.cacher();
  viderCarnet(); regimentsVus = '';
  laCarte.construire();
  $('titre').hidden = true;
  $('hud').hidden = false;
  etiquettes();
  majHud();
  sauvegarder();
  if (B.etat.phase === 'nuit') nuit.montrer();
  else if (B.etat.phase === 'fin') montrerFin();
  else loop.resume();
}
function sauvegarder() { if (B && !reseau && !ESSAI) store.save('partie', photo(B)); }       // (une partie à deux ne se sauvegarde pas : l'autre machine n'y est plus)
function pause() {
  if (!enJeu() || $('dialogue-pause').open) return;
  if (reseau) { if (!reseau.ls.etat.pause) { reseau.ls.commander({ t: 'pause' }); reseau.pauseParMoi = true; } }      // à deux, la pause est celle des deux joueurs : le temps s'arrête pour tous
  else loop.pause();
  sauvegarder();
  $('dialogue-pause').showModal();
}
function reprendre() {
  if (reseau) { if (reseau.pauseParMoi && reseau.ls.etat.pause && !document.querySelector('dialog[open]')) { reseau.pauseParMoi = false; reseau.ls.commander({ t: 'pause' }); } return; }
  if (!enJeu() || pauseActive || nuit.etat || B.etat.phase !== 'jour' || document.querySelector('dialog[open]')) return;
  loop.resume();
}

function nouvelle(graine, secteur = 'essai') {
  return nouvelleBataille(graine, R, { secteur, ...(SOLDATS ? { soldats: Math.floor(SOLDATS / 2) } : {}) });
}
// (v0.28.0 : sous une barre de chargement ; la relecture se fait par étapes, `etapesRestaurer`)
$('continuer').onclick = async () => {
  const p = store.load('partie');
  try { jouer(p ? await sousBarre('Relecture de la partie', etapesRestaurer(p, R)) : nouvelle(1)); }
  catch (e) { console.error(e); toast('Sauvegarde illisible : nouvelle bataille.', 'alerte'); jouer(nouvelle(1)); }
  chargement.cacher();
};
// Un travail en étapes sous la barre ; puis `jouer` (brancher la bataille au rendu : la fin de la barre)
async function sousBarre(titre, gen) { return chargement.executer(titre, gen); }
function* etapesNouvelle(graine, secteur) {
  yield [0.1, 'Le terrain et les régiments'];
  const b = nouvelle(graine, secteur);
  yield [0.9, 'La mise en place'];
  return b;
}
// une nouvelle bataille, et son ordre (la mission, la durée, la réserve) ; pas en mode debug, que les scripts pilotent
async function commencer(graine, secteur) { return lancer('Nouvelle partie', etapesNouvelle(graine, secteur)); }
async function lancer(titre, etapes) {
  jouer(await sousBarre(titre, etapes));
  chargement.cacher();
  if (DEBUG || !B.etat.mission) return;
  loop.pause();
  const e = B.etat;
  $('ordre-mission').textContent = MISSIONS[objectif()];
  $('ordre-duree').textContent = `La bataille durera ${e.meteo.length} jours.`;
  $('ordre-reserves').textContent = `En réserve : ${pluriel(e.reserves[MOI], 'régiment frais', 'régiments frais')}, pour la relève, la nuit.`;
  $('dialogue-ordre').showModal();
}
// La campagne (v0.36.4) : la bataille n d'une campagne, avec ses survivants (`suivante`). Le registre est celui de `cyclopeen:campagne` ; une partie en cours est remplacée.
function* etapesCampagne(s) {
  yield [0.1, 'Le terrain et les régiments'];
  const b = nouvelleBataille(s.graine, R, s.opts);
  yield [0.9, 'La mise en place'];
  return b;
}
function lancerCampagne(c) {
  const s = suivante(c);
  store.clear('partie');
  return lancer(`Bataille ${s.n}`, etapesCampagne(s));
}
// (pas encore d'écran titre pour la campagne, lot 7 : le mode debug la démarre, `__jeu.campagne`)
function demarrerCampagne(graineIdentite) {
  const c = nouvelleCampagne(graineIdentite);
  store.save(CLE_CAMPAGNE, c);
  return lancerCampagne(c);
}
$('ordre-compris').onclick = () => $('dialogue-ordre').close();
$('dialogue-ordre').addEventListener('close', reprendre);
// Le choix du secteur (v0.29.0 ; v0.37.1 : deux colonnes) : à gauche la liste des secteurs (`SECTEURS` de data/secteur.js, avec les retouches de l'atelier), à droite le secteur choisi en 3D,
// la caméra tourne seule (`apercu-3d.js`, le même moteur que le jeu) ; le terrain montré est celui qu'on jouera (la graine est tirée ici : « Autre terrain » en tire une autre).
// Rend { secteur, graine } ou null (annulé) ; en mode debug, celui de l'adresse (?secteur=crete) sans demander.
let apercuSecteur = null;
function demanderSecteur() {
  const d = $('dialogue-carte'), tirage = () => window.__seed ?? Date.now() % 100000;
  if (DEBUG) return Promise.resolve({ secteur: SECTEURS[params.get('secteur')] ? params.get('secteur') : 'essai', graine: tirage() });
  const liste = $('cartes-choix'), ids = Object.keys(SECTEURS);
  liste.replaceChildren(...Object.entries(SECTEURS).map(([id, S], k) => {
    const b = document.createElement('button'); b.className = 'carte-choix'; b.dataset.id = id; b.type = 'button';
    // la coupe nord-sud : le sol, rempli dessous ; leurs lignes (rouge d'avant : vert kaki) en haut, les nôtres en bas
    const pts = S.profil.map((v, i) => `${(i / (S.profil.length - 1) * 100).toFixed(1)},${(52 - v * 40).toFixed(1)}`).join(' ');
    b.innerHTML = `<svg viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true"><polygon class="remplissage" points="0,64 ${pts} 100,64"/><polyline class="sol" points="${pts}"/><line class="ligne-eux" x1="4" y1="6" x2="30" y2="6"/><line class="ligne-nous" x1="70" y1="6" x2="96" y2="6"/></svg>
      <b>${S.nom}<span class="touche">${k + 1}</span></b><p>${S.resume}</p>`;
    return b;
  }));
  return new Promise(ok => {
    let choisi = ids[0], graine = tirage(), ouvert = true;
    const fin = res => { ouvert = false; apercuSecteur?.activer(false); d.onclose = null; if (d.open) d.close(); ok(res); };
    // le secteur choisi, en 3D (le premier passage charge le moteur de l'aperçu ; sans WebGL, la liste reste utilisable)
    const montrer = async () => {
      for (const b of liste.children) b.setAttribute('aria-pressed', String(b.dataset.id === choisi));
      $('carte-legende').textContent = `${SECTEURS[choisi].nom} : ${SECTEURS[choisi].resume}`;
      try {
        if (!apercuSecteur) { const { creerVue3D } = await import('./apercu-3d.js?v=0.41.3'); apercuSecteur = await creerVue3D({ R, hote: $('carte-3d'), rotation: 0.12 }); }
        if (!ouvert) return;
        apercuSecteur.monter(choisi, SECTEURS[choisi], graine, { soldats: false, cadrer: true });
        apercuSecteur.activer(true);
      } catch (e) { console.warn('Aperçu 3D indisponible', e); $('carte-3d').hidden = true; }
    };
    const choisir = id => { if (id === choisi && apercuSecteur) return; choisi = id; montrer(); };
    liste.onclick = e => { const b = e.target.closest('.carte-choix'); if (b) choisir(b.dataset.id); };
    liste.ondblclick = e => { if (e.target.closest('.carte-choix')) fin({ secteur: choisi, graine }); };
    $('carte-autre').onclick = () => { graine = (Math.floor(Math.random() * 99999) + 1); montrer(); };
    $('carte-jouer').onclick = () => fin({ secteur: choisi, graine });
    d.onkeydown = e => {
      const k = Number(e.key);
      if (k >= 1 && k <= ids.length) { e.preventDefault(); choisir(ids[k - 1]); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const i = ids.indexOf(choisi) + (e.key === 'ArrowDown' ? 1 : -1); if (ids[i]) { choisir(ids[i]); liste.children[i].focus(); } }
      else if (e.key === 'Enter' && !e.target.closest('#carte-autre, form button')) { e.preventDefault(); fin({ secteur: choisi, graine }); }
    };
    d.onclose = () => { ouvert = false; apercuSecteur?.activer(false); ok(null); };            // annulé (Échap ou le bouton)
    $('carte-3d').hidden = false;
    d.showModal();
    liste.firstElementChild?.focus();
    montrer();
  });
}
// ─── Le jeu à deux, sur le réseau (Jérôme, v0.30.0) ───────────────────────────────────────────────────────────────
// Deux machines, la même bataille (lockstep : reseau/lockstep.js) ; on n'échange que les ordres, sur un canal WebRTC appairé à la main (reseau/lien.js). L'hôte joue le bleu, l'invité le kaki.
// Chaque ordre part pour les deux machines, et s'exécute au même cadre chez les deux ; le refus, lui, se dit tout de suite (l'ordre à sec).
let versionJeu = '';
loadVersion().then(v => { versionJeu = v || ''; });
const empreinteReglages = () => { const t = JSON.stringify([R, retouchesSecteurs, cartesPerso]); let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
function lancerMarche(ids, x, y) {
  if (!reseau) return ordonnerMarche(B, ids, x, y, forme);
  const p = peutOrdonner(B, ids, x, y, forme, MOI);
  if (p.ok) reseau.ls.commander({ t: 'marche', ids: p.regiments, x, y, forme });
  return p;
}
function lancerStance(ids, stance) {
  if (!reseau) return ordonnerStance(B, ids, stance);
  const p = peutStance(B, ids, stance, MOI);
  if (p.ok) reseau.ls.commander({ t: 'stance', ids: p.regiments, stance });
  return p;
}
function lancerBarrage(cal, x, y) {
  if (!reseau) return ordonnerBarrage(B, cal, x, y);
  const p = peutBarrage(B, cal, x, y, MOI);
  if (p.ok) reseau.ls.commander({ t: 'barrage', cal, x, y });
  return p;
}
// Ce que fait un ordre, le même chez les deux (`camp` : celui qui l'a donné)
function executerCmd(c, camp, b, st) {
  if (c.t === 'marche') { const r = ordonnerMarche(b, c.ids, c.x, c.y, c.forme, camp); if (camp === MOI && r.ok) { marque = { x: c.x, y: c.y, t: 2 }; ordreDonne(r); } }
  else if (c.t === 'barrage') { const r = ordonnerBarrage(b, c.cal, c.x, c.y, camp); if (camp === MOI && r.ok) marque = { x: c.x, y: c.y, t: 2 }; }
  else if (c.t === 'stance') { const r = ordonnerStance(b, c.ids, c.stance, camp); if (camp === MOI && r.ok) { noterStance(r.regiments, c.stance); regimentsVus = ''; majHud(); } }
  else if (c.t === 'pause') st.pause = !st.pause;
  else if (c.t === 'vitesse') st.vitesse = [1, 2, 4].includes(c.v) ? c.v : 1;
  else if (c.t === 'corvee') { const reg = b.etat.regiments[c.reg]; if (reg && reg.camp === camp && !refusCorvee(b, reg, c.id)) reseau.corvees[c.reg] = c.id; }
  else if (c.t === 'pret') {
    reseau.pret[camp] = true;
    if (reseau.pret[0] && reseau.pret[1] && b.etat.phase === 'nuit') {       // les deux sont prêts : l'aube, avec les corvées des deux
      const r = aube(b, reseau.corvees);
      reseau.corvees = {}; reseau.pret = [false, false];
      if (r.ok) nuit.apresAube(b, r);
    }
  }
}
function demarrerReseau({ moi, lien, graine, secteur }) {
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  reseau = { moi, lien, ls: null, corvees: {}, pret: [false, false], pauseParMoi: false };
  reglerCamp(moi);
  const b = nouvelleBataille(graine, R, { secteur, deux: true });
  reseau.ls = creerLockstep({
    B: b, moi, envoyer: m => lien.envoyer(m), executer: executerCmd,
    surEcart: (cadre) => { noter('Désynchronisation : les deux parties ne sont plus les mêmes.'); toast('Désynchronisation : les deux parties ont divergé.', 'alerte'); console.error('désynchronisation au cadre', cadre); },
  });
  lien.surMessage = m => { if (m.t === 'cmds' || m.t === 'hash') reseau.ls.recevoir(m); else if (m.t === 'quitte') quitterReseau('L\'autre commandant a quitté la partie.'); };
  lien.surFermeture = () => { if (reseau) quitterReseau('La connexion est perdue.'); };
  jouer(b);
  noter(`Vous êtes le ${moi === NOUS ? 'bleu' : 'kaki'}. ${MISSIONS[objectif()]}`);
  toast(`Vous êtes le ${moi === NOUS ? 'bleu' : 'kaki'}. Espace : pause pour les deux.`);
}
function quitterReseau(message) {
  const r = reseau; if (!r) return;
  reseau = null; reglerCamp(NOUS);
  try { r.lien.envoyer({ t: 'quitte' }); r.lien.fermer(); } catch { /* déjà fermé */ }
  if (message) toast(message);
  loop.resume(); montrerTitre();
}
// la poignée de main : la version du jeu et ses réglages doivent être les mêmes (les deux machines calculent avec le même code et les mêmes nombres)
function poigneeHote(lien, graine, secteur) {
  lien.surOuvert = () => lien.envoyer({ t: 'init', version: versionJeu, reglages: empreinteReglages(), graine, secteur });
  lien.surMessage = m => {
    if (m.t === 'ok') demarrerReseau({ moi: NOUS, lien, graine, secteur });
    else if (m.t === 'refus') { $('deux-statut').textContent = `L'autre machine refuse : ${m.raison}`; lien.fermer(); }
  };
}
function poigneeInvite(lien) {
  lien.surMessage = m => {
    if (m.t !== 'init') return;
    const raison = m.version !== versionJeu ? `elle joue la v${m.version}, vous la v${versionJeu} : rechargez la page` : m.reglages !== empreinteReglages() ? 'les réglages (l\'atelier) ne sont pas les mêmes' : !SECTEURS[m.secteur] ? 'secteur inconnu' : null;
    if (raison) { lien.envoyer({ t: 'refus', raison }); $('deux-statut').textContent = `Impossible de jouer ensemble : ${raison}.`; return; }
    lien.envoyer({ t: 'ok' });
    demarrerReseau({ moi: EUX, lien, graine: m.graine, secteur: m.secteur });
  };
}
{
  const dlg = $('dialogue-deux'), statut = t => { $('deux-statut').textContent = t; };
  const copier = async id => { const a = $(id); a.select(); try { await navigator.clipboard.writeText(a.value); statut('Copié.'); } catch { statut('Sélectionné : copiez-le à la main.'); } };
  let lien = null, arreterRelais = null;
  // dit à voix haute où en est la connexion, et pourquoi elle échoue
  const suivreEtat = l => {
    l.surEtat = e => {
      if (reseau) return;
      if (e === 'connecting') statut('Connexion en cours…');
      else if (e === 'failed') statut('La connexion a échoué : les deux machines ne se voient pas (même réseau ? pare-feu, Wi-Fi « invité » ou VPN qui isolent les appareils). Recommencez avec une nouvelle invitation.' + (/firefox/i.test(navigator.userAgent) ? ' Firefox pose problème : essayez Chrome sur les deux machines.' : ''));
    };
  };
  $('jouer-deux').onclick = () => {
    $('deux-choix').hidden = false; $('deux-hote').hidden = true; $('deux-invite').hidden = true; statut('');
    for (const id of ['deux-invitation', 'deux-reponse', 'deux-invitation-recue', 'deux-ma-reponse']) $(id).value = '';
    dlg.showModal();
  };
  dlg.addEventListener('close', () => { arreterRelais?.(); arreterRelais = null; if (!reseau && lien) { lien.fermer(); lien = null; } });
  $('deux-inviter').onclick = async () => {
    const choix = await demanderSecteur();
    if (!choix) return;
    const { secteur, graine } = choix;
    $('deux-choix').hidden = true; $('deux-hote').hidden = false; statut('Préparation de l\'invitation…');
    try {
      lien = creerHote(); poigneeHote(lien, graine, secteur); suivreEtat(lien);
      $('deux-invitation').value = await lien.inviter();
      const code = nouveauCode(); $('deux-code').textContent = code;
      const hors = () => statut('Relais injoignable : utilisez le copier-coller ci-dessous.');
      arreterRelais = ecouter(code, async m => {
        if (m.t !== 'reponse' || !lien || lien.pc.remoteDescription) return;
        try { statut('Connexion en cours…'); await lien.accepter(m.texte); } catch (e) { statut(`Réponse illisible : ${e.message}`); }
      }, hors);
      await publier(code, { t: 'invitation', texte: $('deux-invitation').value }).catch(e => { console.error(e); hors(); });
      statut(`Secteur : ${SECTEURS[secteur].nom}. En attente de l'autre joueur.`);
    } catch (e) { console.error(e); statut(`Impossible : ${e.message}`); }
  };
  $('deux-connecter').onclick = async () => {
    try { statut('Connexion…'); await lien.accepter($('deux-reponse').value); statut('Connexion en cours… (les deux machines doivent être sur le même réseau)'); }
    catch (e) { statut(`Réponse illisible : ${e.message}`); }
  };
  $('deux-rejoindre').onclick = () => { $('deux-choix').hidden = true; $('deux-invite').hidden = false; statut(''); };
  $('deux-repondre').onclick = async () => {
    try {
      statut('Préparation de la réponse…');
      lien = creerInvite(); poigneeInvite(lien); suivreEtat(lien);
      $('deux-ma-reponse').value = await lien.repondre($('deux-invitation-recue').value);
      statut('Renvoyez ce texte à celui qui vous invite : la partie commence quand il l\'aura collé.');
    } catch (e) { console.error(e); statut(`Invitation illisible : ${e.message}`); }
  };
  $('deux-rejoindre-code').onclick = () => {
    const code = $('deux-code-saisi').value;
    if (!codeValide(code)) return statut('Le code a 6 signes (lettres et chiffres).');
    arreterRelais?.(); statut('Recherche de l\'invitation…');
    let repondu = false;
    arreterRelais = ecouter(code, async m => {
      if (m.t !== 'invitation' || repondu) return;
      repondu = true;
      try {
        lien = creerInvite(); poigneeInvite(lien); suivreEtat(lien);
        await publier(code, { t: 'reponse', texte: await lien.repondre(m.texte) });
        statut('Réponse envoyée : la partie commence dans un instant…');
      } catch (e) { console.error(e); repondu = false; statut(`Impossible : ${e.message}`); }
    }, () => statut('Relais injoignable : utilisez le copier-coller ci-dessous.'));
  };
  $('deux-copier-invitation').onclick = () => copier('deux-invitation');
  $('deux-copier-reponse').onclick = () => copier('deux-ma-reponse');
}
$('nouvelle').onclick = async () => {
  if (store.has('partie')) {
    const deCampagne = !!store.load('partie')?.campagne;
    if (!await confirmer(deCampagne ? 'Une bataille de campagne est en cours. La remplacer ? La campagne reprendra à cette bataille avec « Continuer la campagne ».' : 'Une bataille est en cours. La remplacer ?', 'Nouvelle partie')) return;
  }
  const choix = await demanderSecteur();
  if (choix) commencer(choix.graine, choix.secteur);
};
// La campagne depuis l'écran titre (lot 7) : une neuve efface le registre ; « Continuer la campagne » repart de la bataille qui suit la dernière close
$('nouvelle-campagne').onclick = async () => {
  const c = campagneEnCours();
  if (c || store.has('partie')) {
    if (!await confirmer(c ? `Une campagne est en cours${c.batailles.length ? ` (${c.batailles.length} bataille${c.batailles.length > 1 ? 's' : ''} close${c.batailles.length > 1 ? 's' : ''})` : ''}. La remplacer ?` : 'Une bataille est en cours. La remplacer ?', 'Nouvelle campagne')) return;
  }
  demarrerCampagne(window.__seed ?? Date.now() % 100000);
};
$('continuer-campagne').onclick = async () => {
  const c = campagneEnCours();
  if (!c) return montrerTitre();
  if (store.has('partie') && !await confirmer('Une autre bataille est en cours. La remplacer par la suite de la campagne ?', 'Continuer la campagne')) return;
  lancerCampagne(c);
};
$('pause').onclick = pause;
$('reprendre').onclick = () => $('dialogue-pause').close();
$('dialogue-pause').addEventListener('close', reprendre);
$('quitter').onclick = () => { $('dialogue-pause').close(); sauvegarder(); montrerTitre(); };
$('pause-reglages').onclick = () => $('dialogue-reglages').showModal();
$('ouvrir-reglages').onclick = () => $('dialogue-reglages').showModal();
$('dialogue-reglages').addEventListener('close', reprendre);
// le bouton droit et celui de la molette appartiennent au jeu : leurs événements de souris ne vont pas plus loin que
// le canvas (empêcher le « pointerdown » supprime aussi mousedown et mouseup, que lisent les gestes)
for (const t of ['pointerdown', 'mousedown', 'mouseup', 'auxclick', 'contextmenu']) {
  window.addEventListener(t, e => {
    if (e.target !== $('canvas') || (t !== 'contextmenu' && e.button === 0)) return;
    e.preventDefault(); if (t !== 'pointerdown') e.stopImmediatePropagation();
  }, { capture: true });
}
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ─── La nuit, la fin ───────────────────────────────────────────────────────
function montrerFin() {
  loop.pause(); sauvegarder();
  // le registre de la campagne est écrit avant l'écran de fin : une coupure ne perd rien (idempotent si la partie est relue ici)
  let campagne = null;
  try { campagne = cloturerDansLeStore(store, B); } catch (e) { toast(`Campagne : ${e.message}`, 'alerte'); }
  // la campagne continue : le registre (variante A du labo) remplace l'écran de fin, un papier posé sur le champ
  if (campagne?.statut === 'en cours') { laCampagne.montrer(passage(campagne), () => lancerCampagne(campagne)); return; }
  // elle est finie : un papier sobre, les batailles puis les noms (Jérôme : sans fanfare), au lieu de l'écran de fin
  if (campagne) { laCampagne.montrerFin(bilanCampagne(campagne), montrerTitre); return; }
  const e = B.etat, [vNous, vEux] = effectifs(B);
  $('fin-titre').textContent = `${e.jour} jours.`;
  $('fin-issue').textContent = reseau ? `${e.issue?.reussie ? 'Le bleu' : 'Le kaki'} l'emporte. ${e.issue?.texte || ''}` : (e.issue?.texte || '');
  $('fin-nouvelle').hidden = !!reseau;
  // jour après jour : ce qu'il a coûté, sans un mot de plus
  $('fin-jours').replaceChildren(...e.pertesJour.slice(0, e.jour).map(([n, x], k) => Object.assign(document.createElement('li'), { textContent: `Jour ${k + 1} : ${n} des nôtres, ${x} en face.` })));
  $('fin-pertes').textContent = `${e.pertes[0]} des nôtres sont morts, ${e.pertes[1]} en face. Il en reste ${vNous} et ${vEux}.`;
  $('fin-lignes').textContent = e.tranchees ? `Tronçons tenus : ${tronconsTenus(B)[0]} des nôtres, ${tronconsTenus(B)[1]} en face.` : '';
  $('dialogue-fin').showModal();
}
$('fin-nouvelle').onclick = async () => { $('dialogue-fin').close(); const choix = await demanderSecteur(); if (!choix) return montrerTitre(); if (!ESSAI) store.clear('partie'); commencer(choix.graine, choix.secteur); };
$('fin-titre-btn').onclick = () => { $('dialogue-fin').close(); montrerTitre(); };

// ─── Réglages ──────────────────────────────────────────────────────────────
$('exporter').onclick = () => { sauvegarder(); downloadJSON(store.exportAll(), `${JEU}-sauvegarde.json`); };
$('importer').onclick = async () => {
  try {
    const n = store.importAll(await pickJSONFile());
    toast(`${n} élément(s) importé(s)`);
    setTimeout(() => location.reload(), 800);
  } catch (e) { toast(e.message, 'alerte'); }
};
loadVersion().then(v => { $('version').textContent = v ? `v${v}` : ''; });
loadChangelog().then(entrees => {
  $('changelog').replaceChildren(...entrees.flatMap(e => {
    const h = document.createElement('h3'); h.textContent = `v${e.version} — ${e.date}`;
    const ul = document.createElement('ul');
    for (const c of e.changes) { const li = document.createElement('li'); li.textContent = c; ul.append(li); }
    return [h, ul];
  }));
});

// Un message à l'écran (v0.41.3, sujet « Les toasts » du labo, variante B) : une languette sous les pertes, au centre, qui ne recouvre plus la rangée des régiments ;
// le genre (information, refus d'un ordre, alerte) donne le liseré et le petit mot du haut
const MOTS_TOAST = { refus: 'Ordre refusé', alerte: 'Attention' };
function toast(texte, genre = 'info') {
  const t = $('toast');
  t.className = `jeu-toast toast-${genre}`;
  t.replaceChildren(...(MOTS_TOAST[genre] ? [Object.assign(document.createElement('small'), { textContent: MOTS_TOAST[genre] })] : []), Object.assign(document.createElement('span'), { textContent: texte }));
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}
// Un ordre refusé se dit à voix haute (section 12)
function dire(r) { if (r?.refus) toast(r.refus, 'refus'); return r; }

// ─── Le HUD ────────────────────────────────────────────────────────────────
// La nuit, un régiment à qui l'on a donné un ordre (la carte se grise ; Jérôme, v0.38.3) : les autres ont encore celui d'hier, ou le repos
const donneeCetteNuit = r => nuit.etat === 'choix' && nuit.donnees.has(r.id);
const ordreEnMots = r => nuit.etat === 'choix' && nuit.corvees[r.id] ? `cette nuit : ${corveeDe(nuit.corvees[r.id]).toLowerCase()}` : actionDe(B, r);

// Nos régiments (Jérôme, v0.20.0 ; docs/ui-cible.md) : une rangée de cartes compactes (numéro et nom, chevrons d'expérience, la barre
// debout / blessés / tombés : plein, hachuré, vide) ; la carte choisie s'ouvre vers le haut (l'ordre en mots, les actions) sans pousser
// les autres. Plusieurs régiments choisis : s'ouvre celui qu'on a choisi en dernier. Trop étroit : des flèches font défiler la rangée.
let regimentsVus = '', regDebut = 0, regActifVu = -1, clicCarte = -1, fenetreVue = -1;
const CARTE_L = 112, CARTE_ECART = 8;
function majRegiments() {
  const e = B.etat, A = B.armee, regs = e.regiments.filter(r => r.camp === MOI && r.effectif);
  const bl = new Int32Array(e.regiments.length), ex = new Float32Array(e.regiments.length), vivants = new Int32Array(e.regiments.length);
  for (let i = 0; i < A.n; i++) if (A.camp[i] === MOI) { const g = A.reg[i]; vivants[g]++; ex[g] += A.exp[i]; if (A.blessure[i]) bl[g]++; }
  const place = Math.max(0, $('regiments').clientWidth - 2 * 40), visibles = place ? Math.max(1, Math.min(regs.length, Math.floor((place + CARTE_ECART) / (CARTE_L + CARTE_ECART)))) : regs.length;
  const actif = [...choisis].reverse().map(id => e.regiments[id]).find(r => r && r.camp === MOI && r.effectif) || null;
  const ia = actif ? regs.indexOf(actif) : -1;
  if (ia >= 0 && ia !== regActifVu && (ia < regDebut || ia >= regDebut + visibles)) regDebut = Math.min(Math.max(0, regs.length - visibles), Math.max(0, ia - Math.floor(visibles / 2)));
  regActifVu = ia;
  regDebut = Math.max(0, Math.min(regDebut, regs.length - visibles));
  const cle = regs.map(r => `${r.id}:${r.effectif}:${r.pertes}:${bl[r.id]}:${chevrons(ex[r.id] / Math.max(1, vivants[r.id]))}:${r.deroute ? 1 : 0}:${r.stance}:${moralEnMots(r, R)}:${choisis.has(r.id) ? 1 : 0}:${nuit.etat === 'choix' ? nuit.corvees[r.id] : ''}:${donneeCetteNuit(r) ? 1 : 0}`).join('|')
    + `#${regDebut}/${visibles}#${actif ? `${actif.id}:${ordreEnMots(actif)}:${choisis.size}:${modeMarche}:${forme}:${e.phase}` : ''}`;
  if (cle === regimentsVus) return;
  regimentsVus = cle;
  const pc = (n, r) => `${(n / r.initial * 100).toFixed(1)}%`;
  const cartes = regs.slice(regDebut, regDebut + visibles).map(r => {
    const bles = bl[r.id], debout = Math.max(0, r.effectif - bles), nb = chevrons(ex[r.id] / Math.max(1, vivants[r.id])), humeur = moralEnMots(r, R);
    const b = document.createElement('button');
    const niv = lecture.niveauMoral(r, R);
    b.className = `reg-carte${choisis.has(r.id) ? ' choisi' : ''}${niv !== 'tient' ? ` ${niv === 'deroute' ? 'deroute' : 'ebranle'}` : ''}${donneeCetteNuit(r) ? ' donne' : ''}${r.id === clicCarte ? ' clic' : ''}`; b.dataset.id = r.id;
    b.setAttribute('aria-pressed', String(choisis.has(r.id)));
    b.setAttribute('aria-label', `${numeroDe(r)} · ${r.nom} : ${debout} debout, ${bles} blessés, ${r.pertes} tombés, ${'chevron '.repeat(nb).trim() || 'aucun chevron'}${humeur.startsWith('tient') ? '' : `, ${humeur}`}${r.stance !== STANCE_DEFAUT ? `, ${STANCES[r.stance].court}` : ''}${donneeCetteNuit(r) ? `, ordre donné : ${corveeDe(nuit.corvees[r.id]).toLowerCase()}` : ''}`);
    // quatre lignes à place fixe : le nom, le statut (l'état moral, sinon la corvée de la nuit, sinon « Tient »), les chevrons et la posture, la barre ; le « ! » est hors du flux
    const statut = niv === 'deroute' ? 'En déroute' : niv === 'ebranle' ? 'Ébranlé' : nuit.etat === 'choix' ? `<span class="corvee">${corveeCourte(nuit.corvees[r.id])}</span>` : 'Tient';
    b.innerHTML = `<span class="l1"><b>${numeroDe(r)}</b> ${r.nom}</span>${niv === 'tient' ? '' : `<i class="alerte" aria-hidden="true">${niv === 'deroute' ? '!!' : '!'}</i>`}
      <span class="statut">${statut}</span>
      <span class="chevrons" aria-hidden="true">${chevronsHtml(nb)}${r.stance !== STANCE_DEFAUT ? `<span class="posture">${STANCES[r.stance].court}</span>` : ''}</span>
      <span class="barre" title="plein : debout (${debout}) · hachuré : blessés (${bles}) · vide : tombés (${r.pertes})"><i class="debout" style="width:${pc(debout, r)}"></i><i class="blesses" style="width:${pc(bles, r)}"></i><i class="tombes" style="width:${pc(r.pertes, r)}"></i></span>`;
    return b;
  });
  $('reg-rang').replaceChildren(...cartes);
  $('reg-prec').hidden = regDebut <= 0; $('reg-suiv').hidden = regDebut + visibles >= regs.length;
  const pan = $('reg-ouvert');
  if (!actif || ia < regDebut || ia >= regDebut + visibles) { pan.hidden = true; fenetreVue = -1; return; }
  const bles = bl[actif.id], debout = Math.max(0, actif.effectif - bles), humeur = moralEnMots(actif, R), tampon = humeur.startsWith('tient') ? '' : humeur, jour = e.phase === 'jour' && !nuit.etat;
  pan.dataset.id = actif.id;
  pan.innerHTML = `<div class="tete"><b>${numeroDe(actif)} · ${actif.nom}</b><span>${secteursDe(B, actif)}</span></div>
    <div class="compte">${debout} debout · ${bles} blessés · ${actif.pertes} tombés</div>
    <div class="ordre">${ordreEnMots(actif)}</div>${tampon ? `<span class="tampon">${tampon}</span>` : ''}
    ${choisis.size > 1 ? `<p class="discret">+ ${choisis.size - 1} autre${choisis.size > 2 ? 's' : ''} choisi${choisis.size > 2 ? 's' : ''}</p>` : ''}
    ${jour ? `<div class="actions formes" role="group" aria-label="Forme en terrain libre">${Object.entries(R.foule.formes).map(([k, f]) => `<button data-forme="${k}" class="${forme === k ? 'actif' : ''}" aria-pressed="${forme === k}">${f.nom}</button>`).join('')}</div>` : ''}
    ${jour ? `<div class="actions postures" role="group" aria-label="Posture de tir">${Object.entries(STANCES).map(([k, st], n) => {
      const m = peutStance(B, [...choisis], k, MOI), toutes = [...choisis].every(i => B.etat.regiments[i]?.stance === k);
      return `<button data-stance="${k}" class="${toutes ? 'actif' : ''}${m.ok ? '' : ' refus'}" aria-pressed="${toutes}" aria-disabled="${!m.ok}" title="${(m.ok ? `${st.dit} (Maj+${n + 1})` : m.refus).replace(/"/g, '&quot;')}">${st.nom}</button>`;
    }).join('')}</div>` : ''}
    <div class="actions">${jour ? `<button data-act="marche" class="${modeMarche ? 'actif' : ''}" aria-pressed="${modeMarche}">Marcher</button><button data-act="depart">Regagner sa tranchée</button>` : nuit.etat === 'choix' ? CORVEES.map(c => {
      const m = refusCorvee(B, actif, c.id), toutes = [...choisis].every(i => nuit.corvees[i] === c.id);
      return `<button data-corvee="${c.id}" class="${toutes ? 'actif' : ''}${m ? ' refus' : ''}" aria-disabled="${!!m}" title="${(m || c.dit).replace(/"/g, '&quot;')}">${c.nom}</button>`;
    }).join('') : ''}<button data-act="fiche">Fiche</button></div>`;
  pan.hidden = false;
  rejouerRebond();
  // le rabat se relève quand on change de régiment (v0.34.6)
  if (fenetreVue !== actif.id && !mouvementReduit) pan.animate([{ transform: 'perspective(500px) rotateX(88deg)', opacity: .4 }, { transform: 'perspective(500px) rotateX(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)' });
  fenetreVue = actif.id;
  placerFenetre();
}
$('reg-rang').onclick = e => {
  const c = e.target.closest('.reg-carte');
  if (!c || !B) return;
  const id = +c.dataset.id;
  if (e.shiftKey) choisirRegiment(id, true);
  else if (choisis.size === 1 && choisis.has(id)) { choisis = new Set(); rendu.choisis = choisis; modeMarche = false; majHud(); }
  else { clicCarte = id; choisirRegiment(id, false); clicCarte = -1; centrerSur(id); }
  c.blur();
};
$('reg-ouvert').onclick = e => {
  const co = e.target.closest('button[data-corvee]');
  if (co && B) { co.blur(); return nuit.donner(co.dataset.corvee); }
  const b = e.target.closest('button[data-act], button[data-forme], button[data-stance]');
  if (!b || !B) return;
  b.blur();
  if (b.dataset.stance) return donnerStance(b.dataset.stance);
  if (b.dataset.forme) { forme = b.dataset.forme; regimentsVus = ''; return majHud(); }
  if (b.dataset.act === 'fiche') return montrerRegiment(+$('reg-ouvert').dataset.id);
  if (b.dataset.act === 'marche') { modeMarche = !modeMarche; if (modeMarche) modeBarrage = null; return majHud(); }
  if (b.dataset.act === 'depart') {
    for (const id of [...choisis]) {
      const d = B.etat.regiments[id]?.depart;
      if (!d) continue;
      let x = d.x, y = d.y;
      if (d.trace) { const L = B.lignes.find(l => l.camp * 10 + l.rang === d.trace.ligne); x = (d.trace.x0 + d.trace.x1) / 2; y = L ? ligneY(L, x) : d.y; }
      const r = dire(lancerMarche([id], x, y));
      if (r.ok) { marque = { x, y, t: 2 }; ordreDonne(r); }
    }
    sauvegarder(); majHud();
  }
};
$('reg-prec').onclick = () => { regDebut = Math.max(0, regDebut - 1); regimentsVus = ''; majRegiments(); };
$('reg-suiv').onclick = () => { regDebut += 1; regimentsVus = ''; majRegiments(); };

// ─── La carte du secteur (Jérôme, v0.14.0) : huit secteurs numérotés de l'ouest à l'est, les quatre lignes de chaque camp (en
// face au nord, en haut), chaque case en deux tronçons de 25 m, à la couleur de celui qui les tient. Un numéro choisit le
// régiment du secteur ; une case envoie les régiments choisis dans cette tranchée (et la fait clignoter, ici et sur le terrain).
// La carte en proportions (Jérôme, v0.19.0) : les lignes à 20 m l'une de l'autre, un no man's land resserré de 64 px entre les premières
// (la carte entière tiendrait mal à l'écran en vraie grandeur) ; les régiments y sont des cercles, à leur place (au centre de leurs hommes).
function choisirRegiment(id, ajout) {
  if (!ajout) choisis = new Set();
  if (ajout && choisis.has(id)) choisis.delete(id); else choisis.add(id);
  rendu.choisis = choisis; majHud();
}
function choisirSecteur(s, ajout) {
  const regs = B.etat.regiments.filter(r => { const [a, b] = etendueZones(B, r.depart); return r.camp === MOI && r.effectif && s >= a && s <= b; });
  if (!regs.length) return toast(`Plus personne dans le secteur ${lettreZone(s)}.`, 'refus');
  if (!ajout) choisis = new Set();
  for (const r of regs) { if (ajout && choisis.has(r.id)) choisis.delete(r.id); else choisis.add(r.id); }
  rendu.choisis = choisis; majHud();
}
function ordreCase(idx, s) {
  if (B.etat.phase !== 'jour') return toast('La nuit, pas de marche : choisissez des régiments, puis une corvée.', 'refus');
  if (!choisis.size) return toast('Choisissez d\'abord un régiment (clic, cadre, T, ou la lettre d\'un secteur).', 'refus');
  const Z = zone(B), x = Z.x0 + (s - 0.5) * largeurZone(B), y = ligneY(B.lignes[idx], x);
  const r = dire(lancerMarche([...choisis], x, y));
  if (r.ok) { marque = { x, y, t: 2 }; sauvegarder(); ordreDonne(r); }
}
// Un ordre pris : les tronçons visés clignotent (sur le terrain et sur la carte, trois secondes) et le carnet dit ce que chacun va faire
function ordreDonne(r) {
  if (!r?.ok) return;
  if (r.tranchee && r.troncons?.length) {
    rendu.clignoter(r.troncons);
    const Z = zone(B), w = largeurZone(B), vises = new Set(r.troncons), els = [];
    for (const c of laCarte.cases) if (c.idx === r.ligne && tronconsDeLigne(B, c.idx, Z.x0 + (c.s - 1) * w, Z.x0 + c.s * w).some(k => vises.has(k))) els.push(c.el);
    for (const el of els) { el.classList.remove('clign'); void el.offsetWidth; el.classList.add('clign'); }
    setTimeout(() => { for (const el of els) el.classList.remove('clign'); }, 3200);
  }
  const regs = r.regiments.map(id => B.etat.regiments[id]);
  noter(regs.length > 2 ? `${regs.length} régiments en marche.` : regs.map(g => `${g.nom} : ${actionDe(B, g)}`).join(' ; ') + '.');
  regimentsVus = ''; majHud();
}

// Les événements de la bataille, racontés au carnet de bord (la boucle et le mode debug)
function raconter(ev) {
    for (const p of ev) {
      const reg = p.reg !== undefined ? B.etat.regiments[p.reg] : null;
      if (p.type === 'prise') noter(`${p.camp === MOI ? 'Pris' : 'Perdu'} : ${nomTroncon(B, p.troncon)}.`);
      else if (p.type === 'dispute') noter(`Ceux d'en face sont dans ${nomTroncon(B, p.troncon)}.`);
      else if (p.type === 'preparation') noter(`En face prépare au 220 sur ${nomTroncon(B, p.troncon)}.`);
      else if (p.type === 'poursuite') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} poursuit sur notre ligne suivante.`);
      else if (p.type === 'assaut') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} sort de ses tranchées${p.troncon >= 0 ? ` : ${nomTroncon(B, p.troncon)}` : ''}.`);
      else if (p.camp !== MOI) continue;
      else if (p.type === 'deroute') noter(`${reg.nom} est en déroute.`);
      else if (p.type === 'ralliement') noter(`${reg.nom} se rallie.`);
      else if (p.type === 'promu' && p.rang === 0) { const { qui } = quiEst(p.id); noter(`${qui.prenom} ${qui.nom} commande ${reg.nom}.`); }
    }
}
// Le temps (Jérôme, v0.19.0) : arrêter, ×1, ×2, ×4. Le pas de la simulation ne change pas (la partie est la même) : on en fait plus par
// image, tant que la simulation tient (`perf.sim` × la vitesse sous ~20 ms) ; la vitesse choisie dure jusqu'à la nuit, qui ramène à ×1 (v0.41.2).
function appliquerVitesse() {
  const plafond = perf.sim > 0 ? Math.max(1, Math.floor(20 / perf.sim)) : 4;
  loop.setTimeScale(Math.min(vitesse, plafond));
}
function basculerPause() {
  if (reseau) { reseau.pauseParMoi = false; return reseau.ls.commander({ t: 'pause' }); }
  pauseActive = !pauseActive; if (pauseActive) loop.pause(); else reprendre(); majHud();
}
function majTemps(h) {
  if (reseau) { pauseActive = reseau.ls.etat.pause; vitesse = reseau.ls.etat.vitesse; }
  appliquerVitesse();
  $('temps-pause').classList.toggle('actif', pauseActive); $('temps-pause').setAttribute('aria-pressed', String(pauseActive));
  for (const b of document.querySelectorAll('[data-vitesse]')) b.classList.toggle('actif', +b.dataset.vitesse === vitesse);
}

function majHud() {
  if (!B) return;
  const h = horloge(B), e = B.etat;
  majBarreTemps(B);
  $('mission').hidden = !e.mission;
  if (e.mission) $('mission').textContent = `${objectif() === 'tenir' ? 'Tenir le secteur' : 'Prendre leur première ligne'} · réserve : ${e.reserves[MOI]}`;
  majPertes(B); majTemps(h);
  majFiche();
  $('pause-active').hidden = !pauseActive;
  for (const b of $('batteries').children) {
    const cal = b.dataset.cal, reste = Math.ceil((MOI === NOUS ? e.batteries : e.batteriesEux)[cal] - e.temps);
    b.querySelector('span').textContent = reste > 0 ? `${reste} s` : 'prête';
    b.querySelector('s').style.width = `${Math.round(100 * (1 - Math.max(0, Math.min(1, (e.batteries[cal] - e.temps) / CALIBRES[cal].recharge))))}%`;
    b.classList.toggle('vise', modeBarrage === cal);
    b.classList.toggle('recharge', reste > 0);
  }
  majRegiments(); laCarte.maj();
  $('batteries').hidden = nuit.etat === 'choix';    // la nuit, pas de barrage
  $('ecran').classList.toggle('vise', !!modeBarrage || modeMarche);
}
$('batteries').append(...NOMS_CALIBRES.map((cal, k) => {
  const b = document.createElement('button');
  b.className = 'batterie'; b.dataset.cal = cal;
  b.setAttribute('aria-label', `Barrage de ${cal} (touche ${k + 1})`);
  // l'obus debout à gauche (sa taille dit le calibre), le calibre et l'état à droite, une jauge de recharge dessous (v0.30.0)
  const H = { 75: 22, 155: 30, 220: 38 }[cal] || 28, W = { 75: 8, 155: 11, 220: 14 }[cal] || 10;
  b.innerHTML = `<svg viewBox="0 0 ${W + 4} ${H + 4}" aria-hidden="true"><path d="M2 ${H + 2}V${Math.round(H * 0.45)}Q${2 + W / 2} 1 ${2 + W} ${Math.round(H * 0.45)}V${H + 2}Z"/><rect class="ceinture" x="2" y="${H - 6}" width="${W}" height="2.5"/></svg><b>${cal}</b><span>prête</span><i class="touche" aria-hidden="true">${k + 1}</i><u><s></s></u>`;
  b.onclick = () => viser(cal);
  return b;
}));
function viser(cal) {
  if (!B) return;
  if (B.etat.phase !== 'jour') return dire({ refus: 'Pas de barrage la nuit.' });
  modeBarrage = modeBarrage === cal ? null : cal; if (modeBarrage) modeMarche = false;
  majHud();
}

// Le clic sur la carte d'un régiment (Jérôme, v0.32.2 ; v0.33.0 : les équerres, variante B du sujet « Le clic sur un régiment » du labo) : la caméra glisse
// jusqu'à lui (0,6 s, zoom et angle inchangés), quatre coins d'os se referment sur l'emprise de ses hommes et s'effacent, la carte s'allume un instant.
// Le dessin seulement ; un déplacement de la vue à la main coupe le glissement.
let centrage = null, equerres = null;
const mouvementReduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Le rebond d'un bouton (Jérôme, v0.41.3 ; sujet « Le clic sur un bouton » du labo, variante B) : dès l'appui, il s'enfonce (94 %) puis revient en dépassant un peu (105 %), 280 ms ;
// pas sur les cartes de régiment (elles ont leur clic), ni sur la carte, ni sur les flèches, ni dans une boîte de dialogue. La fenêtre d'ordres est refaite à chaque changement :
// l'animation reprend sur le bouton neuf, là où elle en était (`rejouerRebond`). Le dessin seulement.
const REBOND = [{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: .25 }, { transform: 'scale(1.05)', offset: .65 }, { transform: 'scale(1)' }];
const REBOND_MS = 280;
let rebond = null;
function jouerRebond(b, avance = 0) { if (!mouvementReduit) b.animate(REBOND, { duration: REBOND_MS, delay: -avance, easing: 'cubic-bezier(.2,.8,.3,1)' }); }
function surRebond(e) {
  const b = e.target.closest?.('button');
  if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true' || b.closest('.reg-rang, .carte-grille, .fleche, dialog')) return;
  jouerRebond(b);
  const [k, v] = Object.entries(b.dataset)[0] || [], hote = b.closest('[id]');
  rebond = k && hote ? { sel: `#${hote.id} [data-${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}="${v}"]`, t0: performance.now() } : null;
}
document.addEventListener('pointerdown', e => { if (e.button === 0) surRebond(e); });
document.addEventListener('click', e => { if (e.detail === 0) surRebond(e); });     // au clavier (Espace, Entrée)
function rejouerRebond() {
  if (!rebond) return;
  const ecoule = performance.now() - rebond.t0;
  if (ecoule < REBOND_MS) { const b = document.querySelector(rebond.sel); if (b) jouerRebond(b, ecoule); }
  rebond = null;
}
function centreDe(id) {
  const A = B.armee; let x = 0, y = 0, n = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === id) { x += A.x[i]; y += A.y[i]; n++; }
  return n ? { x: x / n, y: y / n } : null;
}
// le centre et l'emprise (en pixels) d'un régiment
function empriseDe(id) {
  const A = B.armee; let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === id) {
    const [sx, sy] = rendu.versEcran(A.x[i], A.y[i]);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); n++;
  }
  return n ? { x0, x1, y0, y1 } : null;
}
function centrerSur(id) {
  const c = centreDe(id);
  if (!c) return;
  centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: c.x, z1: c.y, t: mouvementReduit ? 1 : 0 };
  equerres = { id, t: 0 };
  const s = $('equerres'); s.hidden = false; s.replaceChildren(...[0, 1, 2, 3].map(() => document.createElement('i')));
}
function majCentrage(dt) {
  if (centrage) {
    centrage.t = Math.min(1, centrage.t + dt / 0.6);
    const k = 1 - (1 - centrage.t) ** 3;           // ralentit en arrivant
    rendu.vue.cx = centrage.x0 + (centrage.x1 - centrage.x0) * k; rendu.vue.cz = centrage.z0 + (centrage.z1 - centrage.z0) * k;
    rendu.deplacer(0, 0);
    if (centrage.t >= 1) centrage = null;
  }
  if (equerres) {
    const e = $('equerres'), c = empriseDe(equerres.id);
    if (!c || (equerres.t += dt) > 1.4) { e.hidden = true; equerres = null; return; }
    const t = mouvementReduit ? 0.5 : equerres.t, u = 1 - (1 - Math.min(1, t / 0.5)) ** 3, k = 1 + 1.4 * (1 - u);
    const w = Math.max(46, c.x1 - c.x0) / 2 + 12, h = Math.max(30, c.y1 - c.y0) / 2 + 12, mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2;
    const o = equerres.t < 1 ? 1 : Math.max(0, 1 - (equerres.t - 1) / 0.4);
    [...e.children].forEach((i, n) => {
      const a = n % 2 ? 1 : -1, b = n < 2 ? -1 : 1;
      i.style.opacity = o * Math.min(1, t * 6);
      i.style.transform = `translate(${Math.round(mx + a * w * k - (a > 0 ? 16 : 0))}px, ${Math.round(my + b * h * k - (b > 0 ? 16 : 0))}px)`;
    });
  }
}

// La fenêtre d'ordres (Jérôme, v0.34.6 ; variante C « Le rabat » du sujet « La fenêtre d'ordres » du labo) : posée juste au-dessus de la carte du régiment choisi, elle se
// relève d'un coup, charnière en bas, comme un rabat de porte-cartes. Elle suit sa carte (la rangée défile, la fenêtre change de taille).
function placerFenetre() {
  const pan = $('reg-ouvert');
  if (pan.hidden || !B) return;
  const carte = [...$('reg-rang').children].find(c => +c.dataset.id === +pan.dataset.id);
  if (!carte) { pan.hidden = true; return; }
  const r = carte.getBoundingClientRect(), w = pan.offsetWidth, h = pan.offsetHeight;
  pan.style.translate = `${Math.round(Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)))}px ${Math.round(r.top - h - 8)}px`;
}

// Les noms de nos régiments, au-dessus d'eux : un cartouche (v0.41.3) : le numéro en carré (orange : ébranlé, rouge : en déroute), le nom et le secteur, le statut, la barre debout / blessés
const etiq = new Map();
function etiquettes() {
  $('etiquettes').replaceChildren();
  etiq.clear();
  for (const r of B.etat.regiments) {
    if (r.camp !== MOI) continue;
    const d = document.createElement('div');
    d.className = 'etiquette'; d.dataset.id = r.id;
    d.innerHTML = '<b class="num"></b><span class="corps"><span class="nom"></span><span class="statut"></span><span class="barre"><i class="debout"></i><i class="blesses"></i></span></span>';
    $('etiquettes').append(d);
    etiq.set(r.id, { d, num: d.querySelector('.num'), nom: d.querySelector('.nom'), statut: d.querySelector('.statut'), debout: d.querySelector('.debout'), blesses: d.querySelector('.blesses'), cle: '' });
  }
}
// Un clic sur le nom d'un régiment le choisit (Jérôme, v0.41.0) : comme sa carte, sans glisser la caméra ; Maj ajoute, et le seul choisi se désélectionne
$('etiquettes').onclick = e => {
  const d = e.target.closest('.etiquette');
  if (!d || !B || !enJeu()) return;
  const id = +d.dataset.id;
  if (e.shiftKey) choisirRegiment(id, true);
  else if (choisis.size === 1 && choisis.has(id)) { choisis = new Set(); rendu.choisis = choisis; modeMarche = false; majHud(); }
  else choisirRegiment(id, false);
};
const centres = new Map();
function majEtiquettes() {
  const A = B.armee;
  // (un régiment frais est arrivé à l'aube : son nom au-dessus de lui aussi)
  if (etiq.size !== B.etat.regiments.filter(r => r.camp === MOI).length) etiquettes();
  centres.clear();
  for (let i = 0; i < A.n; i++) {
    if (A.camp[i] !== MOI) continue;
    let c = centres.get(A.reg[i]);
    if (!c) centres.set(A.reg[i], c = { x: 0, y: 0, n: 0, ymin: 1e9, bl: 0 });
    c.x += A.x[i]; c.y += A.y[i]; c.n++; if (A.y[i] < c.ymin) c.ymin = A.y[i]; if (A.blessure[i]) c.bl++;
  }
  for (const [id, e] of etiq) {
    const d = e.d, c = centres.get(id);
    if (!c) { d.hidden = true; continue; }
    const [sx, sy] = rendu.versEcran(c.x / c.n, c.ymin - 2);
    // hors de l'écran : caché (sinon il dépasse, et l'audit d'écran le voit amputé)
    d.hidden = sx < 30 || sy < 20 || sx > innerWidth - 30 || sy > innerHeight;
    if (d.hidden) continue;
    d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    d.classList.toggle('choisi', choisis.has(id));
    // « 3 | Viride · B », puis « Tient », ou le moral quand il baisse, ou la corvée de la nuit ; la barre : debout, blessés
    const reg = B.etat.regiments[id], niv = lecture.niveauMoral(reg, R);
    const statut = niv === 'deroute' ? 'En déroute' : niv === 'ebranle' ? 'Ébranlé' : nuit.etat === 'choix' && nuit.corvees[id] ? corveeCourte(nuit.corvees[id]) : 'Tient';
    const debout = Math.max(0, c.n - c.bl), cle = `${numeroDe(reg)}|${reg.nom}|${secteursDe(B, reg)}|${statut}|${niv}|${debout}|${c.bl}`;
    if (cle === e.cle) continue;
    e.cle = cle;
    d.classList.toggle('ebranle', niv === 'ebranle'); d.classList.toggle('deroute', niv === 'deroute');
    e.num.textContent = numeroDe(reg); e.nom.textContent = `${reg.nom} · ${secteursDe(B, reg)}`; e.statut.textContent = statut;
    e.debout.style.width = `${(debout / reg.initial * 100).toFixed(1)}%`; e.blesses.style.width = `${(c.bl / reg.initial * 100).toFixed(1)}%`;
    d.setAttribute('aria-label', `${numeroDe(reg)} · ${reg.nom} : ${statut.toLowerCase()}, ${debout} debout, ${c.bl} blessés`);
  }
  const rs = $('repere-soldat'), is = laFiche.ouverte ? indiceDe(laFiche.ouverte.id) : -1;
  if (is >= 0) {
    const [sx, sy] = rendu.versEcran(B.armee.x[is], B.armee.y[is]);
    rs.hidden = false; rs.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
  } else rs.hidden = true;
  const m = $('repere');
  if (marque && marque.t > 0) {
    const [sx, sy] = rendu.versEcran(marque.x, marque.y);
    m.hidden = false; m.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
  } else m.hidden = true;
}
let marque = null;
// Le cercle d'un obus à (x, y), de rayon r : le souffle en zone assombrie, deux anneaux à deux tiers et à un tiers (plus près du centre, plus on tue), un point
function viseeObus(x, y, r) {
  const contour = rr => { let d = ''; for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, [px, py] = rendu.versEcran(x + Math.cos(a) * rr, y + Math.sin(a) * rr); d += `${k ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`; } return d + 'Z'; };
  const [cx, cy] = rendu.versEcran(x, y);
  return `<path class="ombre" d="${contour(r)}"/><path class="zone" d="${contour(r)}"/><path class="anneau" d="${contour(r * 0.66)}"/><path class="anneau" d="${contour(r * 0.33)}"/><circle class="pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2"/>`;
}
// La visée (v0.21.0) : de chaque régiment choisi au curseur une ligne, une croix au bout ; l'ordre à sec (`peutOrdonner`) dit ce qu'il occuperait
function majVisee() {
  const svg = $('visee');
  // Le barrage qu'on vise : le cercle du souffle du calibre, posé sur le sol (Jérôme, v0.32.3 : la variante D, « cibles concentriques », du sujet « Visée d'un obus » du labo)
  if (modeBarrage && enJeu() && B.etat.phase === 'jour' && !nuit.etat && souris && !glisse && !document.querySelector('dialog[open]')) {
    const [x, y] = rendu.versTerrain(souris.x, souris.y);
    rendu.surligner(null); svg.classList.remove('refus');
    svg.innerHTML = x > -1e4 ? viseeObus(x, y, CALIBRES[modeBarrage].rayon) : ''; svg.removeAttribute('hidden');
    return;
  }
  if (!(enJeu() && B.etat.phase === 'jour' && !nuit.etat && choisis.size && souris && !glisse && !modeBarrage && !document.querySelector('dialog[open]'))) {
    if (!svg.hasAttribute('hidden')) { svg.setAttribute('hidden', ''); rendu.surligner(null); }
    return;
  }
  const [x, y] = rendu.versTerrain(souris.x, souris.y), plan = peutOrdonner(B, [...choisis], x, y, forme, MOI);
  rendu.surligner(plan.ok ? { troncons: plan.troncons || [], rects: plan.emprises || [] } : null);
  const trait = (x1, y1, x2, y2) => `<line class="fond" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="encre" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  let d = '';
  for (const id of choisis) { const c = centres.get(id); if (c) { const [sx, sy] = rendu.versEcran(c.x / c.n, c.y / c.n); d += trait(Math.round(sx), Math.round(sy), souris.x, souris.y); } }
  d += `<g class="croix">${trait(souris.x - 7, souris.y - 7, souris.x + 7, souris.y + 7)}${trait(souris.x - 7, souris.y + 7, souris.x + 7, souris.y - 7)}</g>`;
  svg.classList.toggle('refus', !plan.ok);
  svg.innerHTML = d; svg.removeAttribute('hidden');
}

// ─── Les fiches et le survol : voir hud/fiche.js et hud/lecture.js ─────────────────────────────────────
const DE_PRES = 3;                // à partir de 3 pixels par mètre, on survole et clique des hommes
const dePres = () => rendu.ppm >= DE_PRES;
// le rayon de prise du pointeur, en mètres : une douzaine de pixels d'écran
const prise = px => px * (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;

// ─── Le survol : de près un homme, de loin un régiment ─────────────────────
let souris = null;                // la position du pointeur sur le canvas (souris seulement)
$('canvas').addEventListener('pointermove', e => { souris = e.pointerType === 'mouse' && !e.buttons ? { x: e.clientX, y: e.clientY } : null; });
$('canvas').addEventListener('pointerleave', () => { souris = null; });
// (les noms des régiments sont cliquables : sous eux, le survol continue comme avant, le terrain et la bulle ne disparaissent pas)
$('etiquettes').addEventListener('pointermove', e => { souris = e.pointerType === 'mouse' && !e.buttons ? { x: e.clientX, y: e.clientY } : null; });
$('etiquettes').addEventListener('pointerleave', () => { souris = null; });
// le régiment sous le point (les deux camps), à moins de r mètres
function regimentSous(x, y, r = 4, camp = -1) {
  const A = B.armee;
  let best = -1, bd = r * r;
  for (let i = 0; i < A.n; i++) {
    if (camp >= 0 && A.camp[i] !== camp) continue;
    const d = (A.x[i] - x) ** 2 + (A.y[i] - y) ** 2;
    if (d < bd) { bd = d; best = A.reg[i]; }
  }
  return best;
}
/* L'homme sous le pointeur (Jérôme, v0.35.0) : son corps entier, des pieds au casque, et non le point de sol sous la souris (la tête, vue de biais, tombait
   derrière lui). Les hommes proches du point visé sont projetés à l'écran (pieds et casque) et le pointeur doit tomber dans leur boîte ; le plus près de
   la ligne pieds-casque gagne, à égalité le plus proche de nous. Rend l'indice dans la foule, ou -1. */
const HAUTEUR_HOMME = 1.8, LARGEUR_HOMME = 0.5;
function hommeSous(px, py) {
  const [gx, gy] = rendu.versTerrain(px, py), A = B.armee;
  if (gx < -1e4) return -1;
  const cssParM = rendu.ppm * rendu.vue.facteur / (window.devicePixelRatio || 1);          // pixels CSS par mètre à l'écran
  const demi = Math.max(5, LARGEUR_HOMME / 2 * cssParM), marge = 4;
  const portee = 3 + HAUTEUR_HOMME / Math.max(0.15, Math.tan(Math.min(1.4, rendu.vue.tangage)));     // le sol que le corps recouvre, vu de biais
  const p2 = portee * portee;
  let best = -1, bd = Infinity, bs = -Infinity;
  for (let i = 0; i < A.n; i++) {
    const dx = A.x[i] - gx, dy = A.y[i] - gy;
    if (dx * dx + dy * dy > p2) continue;
    const h = rendu.hauteurSol(A.x[i], A.y[i]);
    const haut = rendu.versEcran(A.x[i], A.y[i], h + HAUTEUR_HOMME);
    const [fx, fy] = rendu.versEcran(A.x[i], A.y[i], h);
    // la capsule autour du segment pieds-casque (demi-largeur du corps, plus une marge) ; entre deux hommes, celui qui est devant (le plus bas à l'écran)
    const sx = haut[0] - fx, sy = haut[1] - fy, l2 = sx * sx + sy * sy || 1;
    const t = Math.max(0, Math.min(1, ((px - fx) * sx + (py - fy) * sy) / l2));
    const d = Math.hypot(px - (fx + sx * t), py - (fy + sy * t));
    if (d > demi + marge) continue;
    if (fy > bs || (fy === bs && d < bd)) { bd = d; bs = fy; best = i; }
  }
  return best;
}
// le terrain sous la souris, dans un coin (refait seulement quand la case ou ce qu'elle est change)
function majTerrain(x, y) {
  const p = $('terrain'), r = x === null ? null : terrainResume(B, x, y);
  if (!r) { p.hidden = true; return; }
  // une seule ligne, toujours : le sol et la marche ; sur une tranchée, son nom puis sa ligne de vie, aux couleurs des deux armées (les hommes de chacune dans le tronçon, de gauche à droite : nous, en face)
  let cle, rendu;
  if (r.troncon >= 0) {
    const f = forcesTroncons(B), a = f[r.troncon * 2 + MOI], b = f[r.troncon * 2 + 1 - MOI], tot = a + b;
    cle = `T|${r.tranchee}|${a}|${b}`;
    rendu = () => p.replaceChildren(Object.assign(document.createElement('span'), { className: 'nom', textContent: `Tranchée ${r.tranchee}` }),
      Object.assign(document.createElement('span'), { className: 'vit vie', innerHTML: `<span>${a}</span><i class="plein"><b style="width:${tot ? a / tot * 100 : 0}%;background:var(--jeu-nous)"></b><b style="width:${tot ? b / tot * 100 : 0}%;background:var(--jeu-eux)"></b></i><span>${b}</span>` }));
  } else {
    cle = `${r.lignes.slice(0, 2).join('\n')}|${r.vitesse}`;
    rendu = () => {
      const pc = Math.round(r.vitesse * 100);
      p.replaceChildren(Object.assign(document.createElement('span'), { className: 'nom', textContent: r.lignes.slice(0, 2).join(' · ') }),
        Object.assign(document.createElement('span'), { className: 'vit', innerHTML: `<i class="plein"><b style="width:${pc}%"></b></i><span>${pc} %</span>` }));
    };
  }
  if (p.dataset.cle !== cle) { p.dataset.cle = cle; rendu(); }
  p.hidden = false;
}
// Le survol global (Jérôme, v0.21.1) : le régiment sous la souris, ou sous une carte ou un cercle du HUD, s'allume avec tous ses hommes ; sinon le
// tronçon sous la souris (sauf quand la visée d'un ordre le montre déjà). Le dessin seulement.
let survolHud = -1;
function appliquerSurvol(reg, tr) {
  const vise = choisis.size && B.etat.phase === 'jour' && !nuit.etat && souris;
  rendu.survoler(survolHud >= 0 ? survolHud : reg, tr >= 0 && !vise && survolHud < 0 ? [tr] : []);
}
for (const [id, sel] of [['reg-rang', '.reg-carte'], ['carte-grille', '.carte-ronde']]) {
  $(id).addEventListener('pointerover', e => { const c = e.target.closest(sel); if (c) survolHud = c.dataset.id !== undefined ? +c.dataset.id : +c.dataset.reg; });
  $(id).addEventListener('pointerout', e => { if (e.target.closest(sel)) survolHud = -1; });
}
function majBulle() {
  const bulle = $('bulle');
  if (!souris || !enJeu() || glisse || document.querySelector('dialog[open]')) { bulle.hidden = true; majTerrain(null); appliquerSurvol(-1, -1); return; }
  const [x, y] = rendu.versTerrain(souris.x, souris.y);
  majTerrain(x, y);
  let lignes = null, regSous = -1;
  if (dePres()) {
    const i = hommeSous(souris.x, souris.y);
    if (i >= 0) {
      const A = B.armee, { reg, qui } = quiEst(A.id[i]); regSous = A.reg[i];
      lignes = [`${qui.prenom} ${qui.nom}`, `${majuscule(qui.grade)}, ${qui.age} ans · ${nomDe(reg)}`,
        [...etatEnMots(A.fatJ[i], A.fatB[i], A.peur[i], A.blessure[i]), experienceEnMots(A.exp[i])].filter(Boolean).join(', ')];
    } else {
      const mort = corpsSous(x, y, Math.max(1, prise(10)));
      if (mort >= 0) {
        const { reg, qui } = quiEst(mort);
        lignes = [`${qui.prenom} ${qui.nom}`, `${majuscule(qui.grade)}, ${qui.age} ans · ${nomDe(reg)}`, tombe(mort)];
      }
    }
  } else {
    const r = regimentSous(x, y, Math.max(4, prise(16)));
    if (r >= 0) { regSous = r; const reg = B.etat.regiments[r]; lignes = [nomDe(reg), enMots(bilan(reg)), majuscule(moralEnMots(reg, R)), refuseAujourdhui(reg)].filter(Boolean); }
  }
  const T = B.terrain, cc = Math.floor(y) * T.W + Math.floor(x);
  appliquerSurvol(regSous, x >= 0 && y >= 0 && x < T.W && y < T.H && T.troncon ? T.troncon[cc] : -1);
  if (!lignes) { bulle.hidden = true; return; }
  const cle = lignes.join('\n');
  if (bulle.dataset.cle !== cle) {
    bulle.dataset.cle = cle;
    bulle.replaceChildren(...lignes.map((t, k) => Object.assign(document.createElement('p'), { textContent: t, className: k ? 'discret' : '' })));
  }
  bulle.hidden = false;
  // à droite et sous le pointeur, ramenée dans l'écran
  const w = bulle.offsetWidth, h = bulle.offsetHeight;
  const bx = Math.min(souris.x + 16, innerWidth - w - 8), by = souris.y + 18 + h > innerHeight - 8 ? souris.y - h - 10 : souris.y + 18;
  bulle.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by)}px)`;
}

// Donner l'ordre de marche aux régiments choisis, là où l'on a cliqué
function ordreMarche(x, y) {
  const r = dire(lancerMarche([...choisis], x, y));
  if (r.ok) { marque = { x, y, t: 2 }; sauvegarder(); ordreDonne(r); if (!r.tranchee) retours.ordre(r.regiments, x, y); }
}
// La posture des régiments choisis (Maj+1 : à volonté, Maj+2 : feu retenu ; les boutons du rabat au lot 3) ; le carnet dit ce qui a pris
function noterStance(ids, stance) {
  const regs = ids.map(id => B.etat.regiments[id]);
  noter(regs.length > 2 ? `${regs.length} régiments : ${STANCES[stance].court}.` : regs.map(g => `${g.nom} : ${STANCES[stance].court}`).join(' ; ') + '.');
}
function donnerStance(stance) {
  if (!choisis.size) return toast('Choisissez d\'abord un régiment (clic, cadre, T, ou la lettre d\'un secteur).', 'refus');
  const r = dire(lancerStance([...choisis], stance));
  if (r.ok && !reseau) { noterStance(r.regiments, stance); sauvegarder(); regimentsVus = ''; majHud(); }
}
// Annuler, du plus récent au plus ancien : le barrage visé, « Marcher », la fiche, les régiments choisis (clic droit, Échap)
function annuler() {
  if (modeBarrage) modeBarrage = null;
  else if (modeMarche) modeMarche = false;
  else if (laFiche.ouverte) fermerFiche();
  else if (choisis.size) { choisis = new Set(); rendu.choisis = choisis; }
  majHud();
}

// ─── Commandes : clavier, souris (section 8) ───────────────────────────────
function choisirTout() {
  choisis = new Set(B.etat.regiments.filter(r => r.camp === MOI && r.effectif).map(r => r.id));
  rendu.choisis = choisis; majHud();
}
const STANCES_TOUCHES = ['volonte', 'retenu'];       // Maj+1, Maj+2 (touches physiques, comme les barrages)
const keys = createKeys({
  actions: {
    menu: 'Escape', pause: ' ', tout: 't', centrer: 'c', plus: ['+', '=', 'NumpadAdd'], moins: ['-', 'NumpadSubtract'],
    b1: 'Digit1', b2: 'Digit2', b3: 'Digit3',
  },
  onAction: (nom, e) => {
    if (!enJeu()) return;
    if (e?.shiftKey && (nom === 'b1' || nom === 'b2' || nom === 'b3')) { if (nom !== 'b3') donnerStance(STANCES_TOUCHES[Number(nom[1]) - 1]); return; }   // Maj+chiffre : la posture, jamais le barrage
    if (nom === 'menu') {
      if (modeBarrage || modeMarche || laFiche.ouverte || choisis.size) annuler(); else pause();
    }
    else if (nom === 'pause') basculerPause();
    else if (nom === 'tout') choisirTout();
    else if (nom === 'centrer') { rendu.placerCamera(MOI === EUX ? Math.PI + CAMERA.yaw : CAMERA.yaw, CAMERA.tangage); if (!reseau) { prefs.camera = null; store.save('prefs', prefs); } }
    else if (nom === 'plus') zoomer(1);
    else if (nom === 'moins') zoomer(-1);
    else if (nom[0] === 'b') viser(NOMS_CALIBRES[Number(nom[1]) - 1]);
  },
});
const pad = createGamepad({ actions: { menu: 'start', pause: 'select' }, onAction: nom => { if (nom === 'menu') pause(); } });
function zoomer(d, ancre) { rendu.zoomer(d, ancre); prefs.zoom = rendu.vue.zoom; store.save('prefs', prefs); }

const cadre = $('cadre');
let glisse = null;

createPointer($('canvas'), {
  threshold: 6,
  onTap: p => {
    if (!enJeu()) return;
    const [x, y] = rendu.versTerrain(p.x, p.y);
    // Le clic droit annule (Jérôme, v0.21.2) : le barrage visé, « Marcher », la fiche, puis les régiments choisis ; il ne donne plus d'ordre.
    if (p.button === 2) return annuler();
    if (p.button !== 0) return;
    if (modeBarrage) {
      if (dire(lancerBarrage(modeBarrage, x, y)).ok) { marque = { x, y, t: 2 }; modeBarrage = null; sauvegarder(); }
      return majHud();
    }
    const jour = B.etat.phase === 'jour';
    if (modeMarche && jour) { modeMarche = false; ordreMarche(x, y); return majHud(); }
    // Le clic gauche choisit, puis ordonne : sur un de nos régiments (Maj : en ajouter ou en retirer), il le choisit ; ailleurs, avec des
    // régiments choisis, ils y marchent (sur une tranchée : l'occupent) et restent choisis. La nuit, on ne marche pas : on choisit pour les corvées.
    // (Jérôme, v0.35.0 : avec des régiments choisis, le clic ordonne même sur un régiment à nous, au lieu de le choisir ; pour changer de choix : sa carte,
    // son cercle, le cadre, T, ou Maj-clic sur lui)
    const rNous = regimentSous(x, y, dePres() ? 4 : Math.max(4, prise(16)), MOI);
    if (rNous >= 0 && !(jour && choisis.size && !p.event.shiftKey)) {
      if (!p.event.shiftKey) choisis = new Set();
      if (choisis.has(rNous) && p.event.shiftKey) choisis.delete(rNous); else choisis.add(rNous);
      rendu.choisis = choisis;
      return majHud();
    }
    if (jour && choisis.size && !p.event.shiftKey) { fermerFiche(); ordreMarche(x, y); return majHud(); }
    // sans régiment choisi : la fiche de ce qu'on touche, chez l'autre camp ou parmi les morts
    if (dePres()) {
      const i = hommeSous(p.x, p.y), mort = i < 0 ? corpsSous(x, y, Math.max(1, prise(10))) : -1;
      if (i >= 0) montrerFiche(i); else if (mort >= 0) montrerSoldat(mort);
    } else {
      const r = regimentSous(x, y, Math.max(4, prise(16)));
      if (r >= 0) montrerRegiment(r);
    }
    majHud();
  },
  onDragStart: p => { centrage = null; glisse = { bouton: p.button, x0: p.startX, y0: p.startY, cx: rendu.vue.cx, cz: rendu.vue.cz, ddx: p.dx, ddy: p.dy }; },
  onDrag: p => {
    if (!glisse) return;
    if (glisse.bouton === 1 && p.event.shiftKey) {
      // Maj + glisser avec la molette : déplacer la vue (le terrain suit la souris)
      const k = (window.devicePixelRatio || 1) / rendu.vue.facteur / rendu.ppm;
      rendu.vue.cx = glisse.cx; rendu.vue.cz = glisse.cz;
      rendu.deplacerEcran(-p.dx * k, -p.dy * k);
      return;
    }
    if (glisse.bouton === 1 || glisse.bouton === 2) {
      // glisser avec la molette (ou le bouton droit) : tourner (de gauche à droite) et incliner (de haut en bas) la caméra, un peu
      rendu.tourner((p.dx - glisse.ddx) * 0.004, -(p.dy - glisse.ddy) * 0.003);
      glisse.ddx = p.dx; glisse.ddy = p.dy;
      return;
    }
    const x = Math.min(p.startX, p.x), y = Math.min(p.startY, p.y);
    Object.assign(cadre.style, { left: `${x}px`, top: `${y}px`, width: `${Math.abs(p.dx)}px`, height: `${Math.abs(p.dy)}px` });
    cadre.hidden = false;
  },
  onDragEnd: p => {
    cadre.hidden = true;
    if (glisse?.bouton === 1 || glisse?.bouton === 2) { if (!reseau) { prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage }; store.save('prefs', prefs); } }
    if (!glisse || glisse.bouton !== 0 || !enJeu()) { glisse = null; return; }
    glisse = null;
    // choisir au cadre : les régiments dont au moins un homme est dans le cadre (à l'écran)
    const x0 = Math.min(p.startX, p.x), x1 = Math.max(p.startX, p.x), y0 = Math.min(p.startY, p.y), y1 = Math.max(p.startY, p.y);
    if (!p.event.shiftKey) choisis = new Set();
    const A = B.armee;
    for (let i = 0; i < A.n; i++) {
      if (A.camp[i] !== MOI || choisis.has(A.reg[i])) continue;
      const [sx, sy] = rendu.versEcran(A.x[i], A.y[i]);
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) choisis.add(A.reg[i]);
    }
    rendu.choisis = choisis; majHud();
  },
  onWheel: ({ delta, at }) => { if (enJeu()) zoomer(-delta, [at.x, at.y]); },
});

// ─── Boucle ────────────────────────────────────────────────────────────────
let derniere = performance.now();
const loop = createLoop({
  step: PAS,
  update() {
    if (!B) return;
    const t0 = performance.now();
    let ev;
    if (reseau) { const joue = reseau.ls.cadre_(); ev = joue ? B.evenements : []; }       // à deux : un cadre du lockstep (rien si l'autre n'a pas parlé)
    else ev = avancer(B);
    const ms = performance.now() - t0;
    perf.sim += (ms - perf.sim) * 0.05; perf.pas++;
    evenements.push(...ev);
    raconter(ev);
    if (ev.some(e => e.type === 'nuit')) {
      if (!reseau && vitesse > 1) { vitesse = 1; appliquerVitesse(); }          // la vitesse choisie dure jusqu'à la nuit (Jérôme, v0.41.2) : un assaut ou une prise ne la change plus
      nuit.montrer();
      if (reseau) { reseau.corvees = {}; reseau.pret = [false, false]; for (const [reg, id] of Object.entries(nuit.corvees)) if (id !== 'repos') reseau.ls.commander({ t: 'corvee', reg: +reg, id }); }     // (ses choix de départ : ceux d'hier, s'ils sont encore possibles)
    }
    if (ev.some(e => e.type === 'fin')) { montrerFin(); }
  },
  render() {
    const now = performance.now(), dt = Math.min(0.1, (now - derniere) / 1000);
    derniere = now;
    if (!$('titre').hidden) { rendu.dessiner(dt, decorPas(dt)); return; }      // l'écran titre : le décor
    if (!B) return;
    pad.poll();
    if (enJeu() && !document.querySelector('dialog[open]')) {
      const k = keys.axis(), m = pad.axis();
      const ax = k.x || m.x, ay = k.y || m.y;
      if (ax || ay) centrage = null;
      if (ax || ay) rendu.deplacerEcran(ax * dt * 260 / rendu.ppm, ay * dt * 260 / rendu.ppm);
      // tourner : A et E (Q et E en QWERTY), incliner : R et F — touches physiques, lues en continu
      const tour = (keys.held('KeyE') ? 1 : 0) - (keys.held('KeyQ') ? 1 : 0), incl = (keys.held('KeyF') ? 1 : 0) - (keys.held('KeyR') ? 1 : 0);
      if (tour || incl) {
        rendu.tourner(tour * dt * 0.9, incl * dt * 0.5);
        if (!reseau) prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage };
        clearTimeout(zoomer.t); zoomer.t = setTimeout(() => store.save('prefs', prefs), 400);
      }
    }
    if (marque) marque.t -= dt;
    majCentrage(dt);
    const ev = evenements.splice(0);
    retours.evenements(ev);
    rendu.dessiner(dt, ev);
    retours.maj(dt);
    majEtiquettes();
    placerFenetre();
    majVisee();
    majBulle();
    if ((hudT -= dt) <= 0) { hudT = 0.25; majHud(); }
  },
});
const evenements = [];
let hudT = 0;
loop.start();
$('temps-pause').onclick = e => { basculerPause(); e.currentTarget.blur(); };
for (const b of document.querySelectorAll('[data-vitesse]')) b.onclick = () => {
  b.blur();
  if (reseau) { reseau.ls.commander({ t: 'vitesse', v: +b.dataset.vitesse }); if (pauseActive) basculerPause(); return; }
  vitesse = +b.dataset.vitesse;
  if (pauseActive) basculerPause(); else majHud();
};
$('hud-reglages').onclick = e => { e.currentTarget.blur(); loop.pause(); $('dialogue-reglages').showModal(); };
autosave(sauvegarder, { everyMs: 10000 });

// ─── Mesure (comme pierreStats de Pierre) ──────────────────────────────────
window.cyclopStats = () => ({
  soldats: B?.armee.n ?? 0,
  ms: { simulation: +perf.sim.toFixed(2), ...rendu.stats.ms },
  pas: perf.pas, fps: loop.fps, ...(() => { const { ms, ...r } = rendu.stats; return r; })(),
  vue: { zoom: rendu.ppm, largeur: rendu.vue.vw, hauteur: rendu.vue.vh, facteur: rendu.vue.facteur },
});

// ─── Mise à jour automatique : jamais en pleine bataille (section 4) ───────
startUpdateCheck({
  isBusy: () => enJeu() && !loop.paused,
  beforeReload: sauvegarder,
  onUpdated: v => toast(`Mis à jour en v${v}`),
});

// ─── Mode debug (section 18) : chargé seulement avec ?debug=1 ──────────────
if (DEBUG) {
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.41.3');
  window.__seed = seedFromUrl() ?? undefined;
  installDebug({
    state: () => B && { ...horloge(B), effectifs: effectifs(B), pertes: B.etat.pertes, impacts: B.etat.impacts.length, enJeu: enJeu(), pause: loop.paused },
    places: { centre: { x: 200, y: 150 }, nous: { x: 200, y: 230 }, eux: { x: 200, y: 70 } },
    // le mode debug parle en coordonnées du SECTEUR (0..400, 0..300) : les marges s'ajoutent ici
    teleport: ({ x, y }) => { rendu.vue.cx = x + B.etat.marges.x; rendu.vue.cz = y + B.etat.marges.y; },
    setTimeScale: s => loop.setTimeScale(s),
    setSeed: n => jouer(nouvelle(n)),
    reset: () => { store.clear('partie'); B = null; montrerTitre(); },
    extra: {
      stats: () => window.cyclopStats(),
      // avance de n pas tout de suite (les nuits passent d'elles-mêmes)
      avancer(n = 30, passerNuits = true) {
        for (let k = 0; k < n && B.etat.phase !== 'fin'; k++) {
          if (B.etat.phase === 'nuit') {
            if (!passerNuits) break;
            aube(B, nuit.etat === 'choix' ? nuit.corvees : {}); nuit.fermer();
          }
          const ev = avancer(B);
          evenements.push(...ev); raconter(ev);
        }
        majHud();
        return horloge(B);
      },
      barrage: (cal, x, y, camp = 0) => reseau ? lancerBarrage(cal, x + B.etat.marges.x, y + B.etat.marges.y) : ordonnerBarrage(B, cal, x + B.etat.marges.x, y + B.etat.marges.y, camp),
      stance: (ids, stance, camp = 0) => reseau ? lancerStance(ids, stance) : ordonnerStance(B, ids, stance, camp),
      marche: (ids, x, y) => reseau ? lancerMarche(ids, x + B.etat.marges.x, y + B.etat.marges.y) : ordonnerMarche(B, ids, x + B.etat.marges.x, y + B.etat.marges.y),
      reseau: () => reseau ? { moi: reseau.moi, cadre: reseau.ls.cadre, pause: reseau.ls.etat.pause, vitesse: reseau.ls.etat.vitesse, ecart: reseau.ls.ecart, empreinte: empreinteEtat(B), ticks: B.etat.ticks } : null,
      zoom: z => { rendu.vue.zoom = z; },
      fiche: () => laFiche.ouverte && { ...laFiche.ouverte, nom: $('fiche-nom').textContent, qui: $('fiche-qui').textContent, etat: $('fiche-etat').textContent, liste: $('fiche-liste').textContent },
      survol: (x, y) => { souris = { x, y }; majBulle(); return $('bulle').hidden ? null : $('bulle').textContent; },
      camera: (yaw, tangage) => rendu.placerCamera(yaw, tangage),
      nuit: () => nuit.montrer(),
      fin: () => montrerFin(),
      campagne: g => demarrerCampagne(g),
      papierCampagne: () => ({ ouvert: laCampagne.ouvert, texte: $('campagne').textContent }),
      bataille: () => B,
      rendu: () => rendu,
      CALIBRES,
    },
  });
}

await chargement.frame();
montrerTitre();
chargement.progres(1, '');
chargement.cacher();
// Une bataille d'essai lancée depuis l'atelier (lot 4 de l'éditeur de carte) : le secteur retouché de ce navigateur, rien n'est sauvegardé (la partie en cours reste intacte)
if (ESSAI && SECTEURS[ESSAI]) {
  await commencer(Number(params.get('graine')) || Date.now() % 100000, ESSAI);
  toast('Partie d\u2019essai : rien n\u2019est sauvegardé');
}
