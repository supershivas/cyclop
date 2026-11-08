// Le cycle de vie : écran titre → bataille → nuit → fin ; pause active,
// réglages, sauvegarde, mise à jour, debug. Les règles sont dans bataille.js
// (pures), le dessin dans rendu3d.js (il ne modifie jamais l'état).
import { createLoop } from './lib/loop.js?v=0.129.0';
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.129.0';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.129.0';
import { createGamepad } from './lib/gamepad.js?v=0.129.0';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.129.0';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.129.0';
import { ROLES } from './palette.js?v=0.129.0';
import { VERSION_CAMPAGNE, CLE as CLE_CAMPAGNE, cloturerDansLeStore, nouvelleCampagne, suivante, passage, bilan as bilanCampagne } from './campagne.js?v=0.129.0';
import { CAMPAGNE } from './data/campagne.js?v=0.129.0';
import { MISSIONS, MEMORIAL, peutDeployer, deployer, bordereau, progressionMission, progressionSecondaire, EUX, nouvelleBataille, etapesRestaurer, avancer, aube, ordonnerMarche, peutOrdonner, ordonnerBarrage, peutBarrage, arriereDe, ordonnerStance, peutStance, horloge, effectifs, tronconsTenus, moralEnMots, terrainResume, forcesTroncons, largeurZone, lettreZone, etendueZones, nomTroncon, actionDe, secteursDe, tronconsDeLigne, zone, photo, restaurer, PAS, NOUS } from './bataille.js?v=0.129.0';
import { ligneY, y0En, etatTranchee } from './tranchees.js?v=0.129.0';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.129.0';
import { AVION, MITRAILLAGE } from './data/mitraillage.js?v=0.129.0';
import { NIDS } from './data/nids.js?v=0.129.0';
import { ligneDe, apercuVol, avionsPrets, avionsRestants, positionDe, balayage } from './avions.js?v=0.129.0';
import { creerSon } from './audio.js?v=0.129.0';
import { CHAR, CHAR_RECHARGE, CHARS, CHAR_PAR_DEFAUT } from './data/chars.js?v=0.129.0';
import { GENIE, GENIE_DATA } from './data/genie.js?v=0.129.0';
import { pontEn } from './eaux.js?v=0.129.0';
import { PONTS_JEU, typePont } from './data/ponts.js?v=0.129.0';
import { routeChar } from './chars.js?v=0.129.0';
import { STANCES, STANCE_DEFAUT } from './data/stances.js?v=0.129.0';
import { METEO, SAISONS, SAISON_DEFAUT } from './data/meteo.js?v=0.129.0';
import { hash2 } from './lib/rng.js?v=0.129.0';
import { creerRendu, CAMERA, ZOOMS, ZOOMS_CADRAGE } from './rendu3d.js?v=0.129.0';
import { etatEnMots, experienceEnMots, chevrons, caracteristiques } from './identite.js?v=0.129.0';
import { aspect } from './aspect-soldat.js?v=0.129.0';
import { amasDe, placeDe, isoles } from './amas.js?v=0.129.0';
import { numeroCampagne } from './bataille.js?v=0.129.0';
import { ARTICULE } from './data/aspect-soldat.js?v=0.129.0';
import { refusCorvee, refusTransfert, planifierTransfert, annulerTransfert } from './nuit.js?v=0.129.0';
import { creerGestion } from './hud/regiments.js?v=0.129.0';
import { chargerContenu, appliquerSecteurs, appliquerCartes, appliquerCampagne } from './design-store.js?v=0.129.0';
import { ordonnerChar, refusOrdreChar } from './chars.js?v=0.129.0';
import { orienterNid, refusOrienterNid, raisonInactif } from './nids.js?v=0.129.0';
import { REPARE_AVION, reparationFaite } from './genie.js?v=0.129.0';
import { creerNidsHud } from './hud/nids.js?v=0.129.0';
import { creerPastilles } from './hud/pastilles.js?v=0.129.0';
import { creerSuivi } from './hud/suivi.js?v=0.129.0';
import { creerCharsHud } from './hud/chars.js?v=0.129.0';
import { creerCampHud } from './hud/camp.js?v=0.129.0';
import { affecterGueris, charsDispo, ordonnerChantier, refusCamp, ouverture, campDe, refusOrdre, batimentSous, emprisesCamp, emplacementCamp, etendueCamp, niveauDe, modif, rechargeDe as facteurRecharge } from './camp.js?v=0.129.0';
import { BATIMENTS, equipeEnMots } from './data/batiments.js?v=0.129.0';
import { deplacable } from './hud/deplacer.js?v=0.129.0';
import { creerSecteur, caseDe } from './hud/secteur.js?v=0.129.0';
import { palmares, tableau } from './hud/medailles.js?v=0.129.0';
import * as lecture from './hud/lecture.js?v=0.129.0';
import { creerFiche } from './hud/fiche.js?v=0.129.0';
import { chevronsHtml } from './hud/barres.js?v=0.129.0';
import { creerNuit, corveeDe, corveeCourte } from './hud/nuit.js?v=0.129.0';
import { creerCampagne } from './hud/campagne.js?v=0.129.0';
import { creerCarnet, deux } from './hud/carnet.js?v=0.129.0';
import { creerCarte } from './hud/carte.js?v=0.129.0';
import { creerPertes } from './hud/pertes.js?v=0.129.0';
import { creerBarreTemps } from './hud/temps.js?v=0.129.0';
import { creerChargement } from './hud/chargement.js?v=0.129.0';
import { creerRetours } from './hud/retours.js?v=0.129.0';
import { creerInfobulle } from './hud/infobulle.js?v=0.129.0';
import { SECTEURS } from './data/secteur.js?v=0.129.0';
import { DIFFICULTES, DIFFICULTE_DEFAUT, DUREES, DUREE_DEFAUT } from './data/difficulte.js?v=0.129.0';
import { preparerAleatoire, ID_ALEATOIRE } from './generateur.js?v=0.129.0';
import { creerLockstep, empreinteEtat } from './reseau/lockstep.js?v=0.129.0';
import { nouveauCode, codeValide, publier, ecouter } from './reseau/relais.js?v=0.129.0';
import { creerHote, creerInvite } from './reseau/lien.js?v=0.129.0';
import { SOLEIL_JEU } from './data/soleil.js?v=0.129.0';

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
    partieDeux: { version: 1 },     // les deux derniers points de reprise d'une partie à deux : [{ id (l'empreinte de l'état), photo }], et le camp joué
    campagne: { version: VERSION_CAMPAGNE },   // le registre d'une campagne (js/campagne.js) ; en mode debug, une autre clé
    prefs: { version: 1, debugWrites: false, defaults: { zoom: 2, camera: null, carte: true } },
  },
  secret: ['gh-token'],
});
const chargement = creerChargement({ $, instantane: DEBUG });
chargement.progres(0.3, 'Le jeu');
const prefs = store.load('prefs');
// Le son (Jérôme, v0.75.0) : synthétisé, déverrouillé au premier geste, coupé quand l'onglet est caché ; volumes gardés dans prefs.son
const son = creerSon(prefs);
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => son.debloquer(), { capture: true });
const ecouteDe = () => { const m = B?.etat.marges || { x: 0, y: 0 }; return { x: rendu.vue.cx - m.x, y: rendu.vue.cz - m.y, rayon: 640 / Math.max(1, rendu.ppm) }; };
// La carte se replie sur son en-tête (Jérôme, v0.30.0) : le champ gagne ~440 px de haut sur un petit écran ; l'état est retenu
function replierCarte(replie) {
  $('carte').classList.toggle('replie', replie);
  $('carte-bascule').setAttribute('aria-expanded', String(!replie));
  $('carte-bascule').setAttribute('aria-label', replie ? 'Déplier la carte du secteur' : 'Replier la carte du secteur');
}
replierCarte(prefs.carte === false);
$('carte-bascule').onclick = e => { const r = !$('carte').classList.contains('replie'); replierCarte(r); prefs.carte = !r; store.save('prefs', prefs); e.currentTarget.blur(); };
const { reglages: R, secteurs: retouchesSecteurs, cartes: cartesPerso, campagne: cartesCampagne } = await chargerContenu();
appliquerCartes(SECTEURS, cartesPerso);              // les cartes à vous (l'atelier) s'ajoutent à la liste des parties
appliquerSecteurs(SECTEURS, retouchesSecteurs);       // les retouches de l'atelier (publiées, puis celles de ce navigateur) : le terrain de départ des secteurs
appliquerCampagne(CAMPAGNE, SECTEURS, cartesCampagne);     // la carte de chaque bataille de la campagne (l'atelier, v0.42.0)
chargement.progres(0.45, 'Les réglages');

let B = null;                 // la bataille en cours
let vitesse = 1;              // ×1, ×2, ×4 : la vitesse du temps (plafonnée par le coût de la simulation)
let pauseActive = false;      // Espace : le temps s'arrête, les ordres restent possibles
let forme = 'bloc';            // la forme des prochains ordres en terrain libre (bloc, ligne, par deux, colonne) ; sur une tranchée, les hommes suivent le tracé
let modeMarche = false;        // le bouton « Marcher » d'une carte : le prochain clic sur le sol envoie les régiments choisis
const BATTERIES = [...NOMS_CALIBRES, AVION, CHAR, GENIE];   // les trois calibres, le mitraillage aérien (touche 4), le char (touche 5), puis le génie (touche 6, v0.66.0)
let departAvion = null;       // le premier clic d'une passe d'avion (v0.56.0) : { x, y }, le second clic la termine
const chevronsVus = new Map();      // les chevrons de chaque régiment à la dernière carte dessinée : de quoi voir qu'il en gagne un (lot E)
let nidChoisi = null, modeNid = null;     // le poste de mitrailleuse choisi (son numéro) et son ordre en préparation : « tourner », le prochain clic sur le sol (lot E)
let charChoisi = null, modeChar = null;       // le char choisi (son numéro) et l'ordre qu'on lui prépare : « marche » ou « cible », le prochain clic sur le sol (v0.81.0)
let leCamp = null, boutonsBarrage = null;           // le HUD du camp (créé plus bas)
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
const carnet = creerCarnet({ $, bataille: () => B, surLien: l => allerA(l), replie: prefs.carnet === false, surReplie: oui => { prefs.carnet = !oui; store.save('prefs', prefs); } });
const { noter, vider: viderCarnet } = carnet;
// les noms du carnet qu'on peut cliquer (Jérôme, v0.100.0) : un régiment, un tronçon, un homme
const lienReg = r => ({ texte: r.nom, cible: { reg: r.id } });
const lienTronc = t => ({ texte: nomTroncon(B, t), cible: { troncon: t } });
const lienHomme = id => { const { qui } = quiEst(id); return { texte: `${qui.prenom} ${qui.nom}`, cible: { soldat: id } }; };
const leDetail = creerSecteur({ $, bataille: () => B, moi: () => MOI, surSecteur: (s, idx) => detailSecteur(s, idx), surFermer: () => retourDuDetail() });
const lesPastilles = creerPastilles({ $, bataille: () => B, moi: () => MOI, versEcran: (x, y, h) => rendu.versEcran(x, y, h), hauteurSol: (x, y) => rendu.hauteurSol(x, y) });
const leCharHud = creerCharsHud({ pastilles: lesPastilles, $, bataille: () => B, moi: () => MOI, versEcran: (x, y, h) => rendu.versEcran(x, y, h), hauteurSol: (x, y) => rendu.hauteurSol(x, y), choisir: id => choisirChar(id), surBouton: act => actionChar(act) });
const leNidHud = creerNidsHud({ pastilles: lesPastilles, $, bataille: () => B, moi: () => MOI, versEcran: (x, y, h) => rendu.versEcran(x, y, h), hauteurSol: (x, y) => rendu.hauteurSol(x, y), choisir: id => choisirNid(id), surBouton: act => actionNid(act) });
const majPertes = creerPertes({ $, moi: () => MOI });
const majBarreTemps = creerBarreTemps({ $, bataille: () => B });
const laCarte = creerCarte({
  $, bataille: () => B, choisis: () => choisis,
  surSecteur: (s, ajout) => choisirSecteur(s, ajout), surCase: (idx, s, alt) => ordreCase(idx, s, alt),
  surRonde: (r, ajout) => r.camp === MOI ? choisirRegiment(r.id, ajout) : montrerRegiment(r.id),
  moi: () => MOI,
});
const nuit = creerNuit({
  $, bataille: () => B, choisis: () => choisis, pauser: () => { if (!reseau) loop.pause(); }, reprendre: () => reprendre(),
  sauvegarder: () => sauvegarder(), majHud: () => majHud(), toast: (t, g) => toast(t, g), dire: r => dire(r), invalider: () => { regimentsVus = ''; },
  choisir: (id, ajout) => id === 'tous' ? choisirTout() : choisirRegiment(id, ajout),
  moi: () => MOI, enReseau: () => !!reseau,
  surChoix: (reg, id) => reseau?.ls?.commander({ t: 'corvee', reg, id }), surPret: () => reseau.ls.commander({ t: 'pret' }),
});
// La gestion des régiments de la nuit (v0.116.0) : à deux, l'ordre part aux deux machines (executerCmd) ; seul, il s'applique tout de suite
const gestion = creerGestion({
  $, bataille: () => B, moi: () => MOI, actif: () => nuit.etat === 'choix', dire: r => dire(r),
  planifier: (de, vers, n) => {
    if (reseau) { const m = refusTransfert(B, MOI, de, vers, n); if (m) dire({ refus: m }); else reseau.ls.commander({ t: 'transfert', de, vers, n }); return; }
    const r = dire(planifierTransfert(B, MOI, de, vers, n)); if (r.ok) sauvegarder(); majHud();
  },
  annuler: k => { if (reseau) { reseau.ls.commander({ t: 'transfert', annule: k }); return; } annulerTransfert(B, MOI, k); sauvegarder(); majHud(); },
});
const laCampagne = creerCampagne({ $ });
const laFiche = creerFiche({ $, R, bataille: () => B });
const { montrerFiche, montrerSoldat, montrerRegiment, fermer: fermerFiche, maj: majFiche } = laFiche;

lockBrowserGestures($('ecran'));
stopTypeahead();
chargement.progres(0.5, 'Le moteur de rendu');
const rendu = await creerRendu($('canvas'), { mesure: MESURE, ...(DEBUG && params.has('grades') ? { grades: params.get('grades') || null } : {}) });     // ?debug=1&grades=fanion|jumelles|galons|(vide) : essayer une autre variante des grades (v0.68.0) ; par défaut `galons`, le képi et les galons (v0.69.0)
// La vue verrouillée (Jérôme, v0.121.0) : la caméra colle à un char, un poste ou un avion (cinéma ou à la personne) ; Échap, un geste sur la caméra ou le bouton la libèrent
const leSuivi = creerSuivi({ $, bataille: () => B, rendu, reduit: () => mouvementReduit, retour: (x, y) => { centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: x, z1: y, t: mouvementReduit ? 1 : 0 }; }, dire: t => toast(t) });
let avionChoisi = null;      // l'avion en vol dont la fiche est ouverte (le numéro de son vol)
rendu.ombresRelief = true; rendu.ombresNuages = true; rendu.soleilReglage = { ...SOLEIL_JEU }; rendu.eclairage = ['bas', 'moyen', 'haut'].includes(prefs.eclairage) ? prefs.eclairage : 'moyen';      // la lumière du labo lumière (v0.115.0) ; ombres du relief, nuages, un soleil qui se lève et se couche (Jérôme, v0.67.3)
// les soldats articulés de près (Jérôme, v0.105.0) : son aspect est tiré de son numéro (celui de la campagne pour nos hommes, comme son nom : un ancien garde son visage), de la graine d'identité, de son rang et de son âge
rendu.aspectDe = (Bt, id, camp) => {
  const { qui } = lecture.quiEst(Bt, id), nous = camp === NOUS, numero = nous ? numeroCampagne(Bt.etat, id) : id;
  return aspect(numero, camp, nous ? Bt.etat.graineIdentite : Bt.etat.graine, qui.rang, qui.age, caracteristiques(numero, camp));
};
rendu.articule = ARTICULE;
rendu.finesseDes = 4;      // le sol au demi-mètre à partir de 4 pixels par mètre (Jérôme, v0.52.3 ; au-dessous, tout dézoomé, il coûterait jusqu'à 3,4 fois plus de triangles)
// les retours sur le champ : le fanion et la réponse des hommes d'un ordre en terrain libre, l'impact des obus en trois temps (v0.41.3)
creerInfobulle({ $ });
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
  // un champ neuf (ni cratères ni morts : les obus qui tombent le creusent peu à peu), la saison, le temps et l'heure tirés au hasard (Jérôme, v0.59.1)
  const saison = ['ete', 'automne', 'hiver'][Math.floor(hasard() * 3)], temps = Object.keys(SAISONS[saison].transitions);
  D = nouvelleBataille(Math.floor(hasard() * 100000), R, { soldats: 240, saison });
  const m = D.etat.marges;
  // le lieu (dans le secteur), la direction (n'importe laquelle), la hauteur (quelques mètres), l'heure (de 7 h à 17 h 45)
  decorVue = {
    cx: m.x + 80 + hasard() * 240, cz: m.y + 70 + hasard() * 160,
    yaw: hasard() * Math.PI * 2, tangage: 0.045 + hasard() * 0.04,
    sens: hasard() < 0.5 ? -1 : 1, heure: 7 + hasard() * 10.75,
  };
  D.etat.meteo[0] = temps[Math.floor(hasard() * temps.length)];
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
    decorObus = 0.6 + Math.random() * 1.4;
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
  rendu.decor = true;                              // une illustration : aucun repère d'interface (la lettre du capitaine), et aucun son hors la musique (Jérôme, v0.100.0)
  rendu.survoler(-1, []); rendu.choisis = new Set();
  rendu.bord = null;                               // l'écran titre garde le ciel de brume
  rendu.attacher(D);
  rendu.vue.zoom = 4;
  rendu.cameraLibre(decorVue.yaw, decorVue.tangage);
  decorObus = 0.5;
}
// Tout ce que la partie laisse à l'écran hors de `#hud` (des enfants de `#ecran` : cacher le HUD ne les cache pas) : la fenêtre du régiment ouvert, celle du bâtiment, la bulle, l'infobulle,
// les repères, le cadre de sélection, les visées, les retours (Jérôme, retour du 2 nov. : « des fenêtres de HUD qui restent sur l'écran d'accueil »)
function purgerEcran() {
  for (const id of ['reg-ouvert', 'batiment', 'infobulle', 'equerres', 'repere', 'repere-soldat', 'cadre', 'visee', 'visee-nid', 'bulle']) { const e = $(id); if (e) e.hidden = true; }
  etiq.clear(); retours.vider(); equerres = null; fenetreVue = -1; regimentsVus = '';
  choisis = new Set(); rendu.choisis = choisis;
  modeBarrage = null; departAvion = null; modeMarche = false; charChoisi = null; modeChar = null; nidChoisi = null; modeNid = null;
  leNidHud.oublier(); leCharHud.oublier(); lesPastilles.oublier(); leCamp?.choisirCle(null); leDetail.fermer(false);
}
function montrerTitre() {
  if (reseau) return quitterReseau();
  loop.pause();
  montrerDecor();
  purgerEcran();
  $('titre').hidden = false;
  $('hud').hidden = true;
  $('etiquettes').replaceChildren(); etiq.clear(); etiqIsoles.length = 0;         // les noms des régiments de la partie quittée ne restent pas devant le décor (Jérôme, v0.59.1)
  $('reprendre-deux').hidden = !store.has('partieDeux');
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
// le nom et le texte de la mission du camp joué (la contre-attaque éclair a les siens : un seul ordre, dans les deux camps ; v0.108.0)
const missionNom = () => B.etat.mission === 'contre' ? 'Contre-attaque éclair' : objectif() === 'tenir' ? 'Tenir le secteur' : 'Prendre leur première ligne';
const missionOrdre = () => MISSIONS[B.etat.mission === 'contre' ? 'contre' : objectif()];
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
  modeBarrage = null; departAvion = null; modeMarche = false; charChoisi = null; modeChar = null; nidChoisi = null; modeNid = null; avionChoisi = null; leSuivi.liberer(); leNidHud.oublier(); leCharHud.oublier(); lesPastilles.oublier(); leCamp?.choisirCle(null); rendu.camp.choisir(null); pauseActive = false; vitesse = 1; loop.setTimeScale(1); fermerFiche(); nuit.fermer(); laCampagne.cacher();
  viderCarnet(); regimentsVus = '';
  laCarte.construire(); leDetail.fermer(false); avantDetail = null;
  $('titre').hidden = true;
  rendu.decor = false;
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
  if (!enJeu() || $('dialogue-pause').open || $('dialogue-depart').open) return;
  if (reseau) { if (!reseau.ls.etat.pause) { reseau.ls.commander({ t: 'pause', v: true }); reseau.pauseParMoi = true; } }      // à deux, la pause est celle des deux joueurs : le temps s'arrête pour tous
  else loop.pause();
  sauvegarder();
  $('abandonner-campagne').hidden = !B.etat.campagne || !!reseau;        // seulement dans une bataille de campagne
  $('dialogue-pause').showModal();
}
function reprendre() {
  if (reseau) { if (reseau.pauseParMoi && reseau.ls.etat.pause && !document.querySelector('dialog[open]')) { reseau.pauseParMoi = false; reseau.ls.commander({ t: 'pause', v: false }); } return; }
  if (!enJeu() || pauseActive || nuit.etat || B.etat.phase !== 'jour' || document.querySelector('dialog[open]')) return;
  loop.resume();
}

function nouvelle(graine, secteur = 'essai', saison, difficulte, jours) {
  // le Mémorial : le mérite gardé devient de la dotation de départ (au plus `plafond`), il est dépensé
  const bonus = DEBUG ? 0 : Math.min(MEMORIAL.plafond, Math.floor((prefs.memorial || 0) * MEMORIAL.taux));
  if (bonus) { prefs.memorial = Math.max(0, (prefs.memorial || 0) - Math.ceil(bonus / MEMORIAL.taux)); store.save('prefs', prefs); }
  return nouvelleBataille(graine, R, { secteur, ...(bonus ? { dotationBonus: bonus } : {}), ...(saison ? { saison } : {}), ...(difficulte ? { difficulte } : {}), ...(jours ? { jours } : {}), ...(SOLDATS ? { soldats: Math.floor(SOLDATS / 2) } : {}), camp: true });
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
function* etapesNouvelle(graine, secteur, saison, difficulte, jours) {
  yield [0.1, 'Le terrain et les régiments'];
  const b = nouvelle(graine, secteur, saison, difficulte, jours);
  yield [0.9, 'La mise en place'];
  return b;
}
// une nouvelle bataille, et son ordre (la mission, la durée, la réserve) ; pas en mode debug, que les scripts pilotent
async function commencer(graine, secteur, saison, difficulte, jours) { return lancer('Nouvelle partie', etapesNouvelle(graine, secteur, saison, difficulte, jours)); }
async function lancer(titre, etapes) {
  jouer(await sousBarre(titre, etapes));
  chargement.cacher();
  if (DEBUG || !B.etat.mission) return;
  loop.pause();
  const e = B.etat;
  $('ordre-mission').textContent = missionOrdre();
  $('ordre-duree').textContent = `La bataille durera ${e.meteo.length} jour${e.meteo.length > 1 ? 's' : ''}${e.sol?.saison && SAISONS[e.sol.saison] ? `, en ${SAISONS[e.sol.saison].nom}` : ''}.`;
  $('dialogue-ordre').showModal();
}
// La campagne (v0.36.4) : la bataille n d'une campagne, avec ses survivants (`suivante`). Le registre est celui de `cyclopeen:campagne` ; une partie en cours est remplacée.
function* etapesCampagne(s) {
  yield [0.1, 'Le terrain et les régiments'];
  const b = nouvelleBataille(s.graine, R, { ...s.opts, camp: true });
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
// le bouton de mission : la modale dit quoi faire et où on en est (pause, reprise à la fermeture)
$('mission').onclick = () => {
  const m = progressionMission(B, MOI);
  $('mission-nom').textContent = missionNom();
  $('mission-texte').textContent = missionOrdre().replace(/^[^:]*: /, '').replace(/^./, c => c.toUpperCase());
  const pct = Math.round(100 * m.p), jauge = $('mission-barre');
  jauge.setAttribute('aria-valuenow', pct); jauge.firstChild.style.width = pct + '%'; jauge.lastChild.textContent = m.label ?? pct + ' %';
  $('mission-etat').textContent = m.texte;
  const ul = $('mission-secondaires'); ul.textContent = ''; $('mission-secondaires-titre').hidden = !(B.etat.secondaires || []).length;
  for (const s of B.etat.secondaires || []) {
    const q = progressionSecondaire(B, s), li = document.createElement('li');
    li.textContent = `${q.etat === 'reussie' ? '✓' : q.etat === 'echouee' ? '✗' : '○'} ${q.texte}${q.label && q.etat === 'cours' ? ' (' + q.label + ')' : ''}${q.raison ? ' — ' + q.raison : ''}`;
    ul.append(li);
  }
  loop.pause();
  $('dialogue-mission').showModal();
};
$('mission-fermer').onclick = () => $('dialogue-mission').close();
// Le « ? » de la carte et celui du plan d'un secteur (Jérôme, v0.108.0) : une modale d'explications, le temps s'arrête le temps de la lire
for (const id of ['carte-aide', 'secteur-aide']) $(id).onclick = e => { e.currentTarget.blur(); loop.pause(); $('dialogue-aide-carte').showModal(); };
$('aide-carte-fermer').onclick = () => $('dialogue-aide-carte').close();
$('dialogue-aide-carte').addEventListener('close', reprendre);
$('dialogue-mission').addEventListener('close', reprendre);
$('ordre-compris').onclick = () => $('dialogue-ordre').close();
$('dialogue-ordre').addEventListener('close', reprendre);
// Le choix du secteur (v0.29.0 ; v0.37.1 : deux colonnes ; v0.106.0 : des cartes de papier ; v0.107.0 : une pile dont les titres font le menu ; v0.108.0 : Jérôme, 2 nov. : « et si nous avons des dizaines de cartes, ça ne
// fonctionne plus : une liste à gauche, plus petite, l'aperçu et les options à droite, pas besoin de lire le titre des cartes qui ne sont pas au premier plan ») : à gauche la liste des secteurs (`SECTEURS` de
// data/secteur.js, avec les retouches de l'atelier ; elle défile, « Au hasard » reste épinglée en bas), à droite UNE carte de papier (nom, vraie carte en 3D, description, saison, niveau, durée) posée sur quelques feuilles
// qui ne sont que du décor. Un clic dans la liste : l'ancienne carte part sous les feuilles (une copie, avec une image figée de son aperçu) et la nouvelle grossit depuis la ligne cliquée ; l'aperçu 3D (UN seul moteur,
// `apercu-3d.js`, le même que le jeu, la caméra tourne seule) ne se monte qu'une fois la carte posée (monter reconstruit un terrain : ~1 s au rendu logiciel, qui gelait le glissement). Les réglages (saison, niveau,
// durée) sont ceux de la partie. « Au hasard » tire un autre secteur à chaque clic (la ligne, ou le dé « Une autre carte » sur la carte). Le terrain montré est celui qu'on jouera (la graine est tirée ici).
// Rend { secteur, graine, saison, difficulte, jours } ou null (annulé) ; en mode debug, celui de l'adresse (?secteur=crete) sans demander.
// Le papier d'une carte de secteur, sans rien de coûteux à redessiner : le bruit (grain fin, grandes taches) est dessiné UNE fois dans un canvas (noir, en transparence : le CSS le prend comme masque et le colore),
// et le contour déchiré est un `clip-path` tiré du nom de la carte. (Un bruit SVG et un filtre de déplacement faisaient le même effet mais se recalculaient à chaque glissement : 200 à 370 ms par image.)
let bruitsPapier = null;
function bruitsDuPapier() {
  if (bruitsPapier) return bruitsPapier;
  let g = 20241102; const hasard = () => (g = (Math.imul(g, 1664525) + 1013904223) >>> 0) / 4294967296;
  const toile = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const c1 = toile(240), x1 = c1.getContext('2d'), im = x1.createImageData(240, 240);
  for (let i = 0; i < im.data.length; i += 4) { const v = hasard(); im.data[i + 3] = v > 0.5 ? Math.round((v - 0.5) / 0.5 * 255) : 0; }
  x1.putImageData(im, 0, 0);
  const T = 480, c2 = toile(T), x2 = c2.getContext('2d');
  for (let k = 0; k < 46; k++) {
    const cx = hasard() * T, cy = hasard() * T, r = 24 + hasard() * 70, a = 0.25 + hasard() * 0.5;
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) { const gr = x2.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x2.fillStyle = gr; x2.fillRect(cx + dx - r, cy + dy - r, 2 * r, 2 * r); }
  }
  return bruitsPapier = [`url(${c1.toDataURL()})`, `url(${c2.toDataURL()})`];
}
function bordRonge(nom) {
  let g = 2166136261; for (const c of nom) g = Math.imul(g ^ c.charCodeAt(0), 16777619) >>> 0;
  const hasard = () => (g = (Math.imul(g, 1664525) + 1013904223) >>> 0) / 4294967296, pts = [];
  for (let i = 0; i <= 60; i++) pts.push(`${(i / 60 * 100).toFixed(2)}% ${(hasard() * 1.1).toFixed(2)}%`);
  for (let i = 1; i <= 30; i++) pts.push(`${(100 - hasard() * 0.5).toFixed(2)}% ${(i / 30 * 100).toFixed(2)}%`);
  for (let i = 60; i >= 0; i--) pts.push(`${(i / 60 * 100).toFixed(2)}% ${(100 - hasard() * 1.1).toFixed(2)}%`);
  for (let i = 29; i >= 1; i--) pts.push(`${(hasard() * 0.5).toFixed(2)}% ${(i / 30 * 100).toFixed(2)}%`);
  return `polygon(${pts.join(',')})`;
}
let apercuSecteur = null;
function demanderSecteur(avecDifficulte = true) {
  const d = $('dialogue-carte'), tirage = () => window.__seed ?? Date.now() % 100000;
  if (DEBUG) { const id = params.get('secteur'); if (id === ID_ALEATOIRE) preparerAleatoire(tirage()); return Promise.resolve({ secteur: SECTEURS[id] ? id : 'essai', graine: tirage(), saison: SAISONS[params.get('saison')] ? params.get('saison') : undefined, difficulte: DIFFICULTES[params.get('difficulte')] ? params.get('difficulte') : undefined }); }
  let graine = tirage(); preparerAleatoire(graine);                // la carte aléatoire (v0.49.0) : la dernière de la liste, tirée de la graine montrée
  // les cartes d'origine, celles qu'on a publiées, puis la carte au hasard en dernier
  const ids = Object.keys(SECTEURS).sort((a, b) => (a === ID_ALEATOIRE) - (b === ID_ALEATOIRE));
  const liste = $('cartes-choix'), scene = $('carte-table'), hote = $('carte-3d'), grande = $('carte-grande');
  const DE = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="5.5" r="1.1" fill="currentColor"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1.1" fill="currentColor"/></svg>';
  // une carte du jeu est la même sur tous les ordinateurs : sa graine vient de son nom, pas de l'heure (seule la carte au hasard change, à chaque tirage)
  const graineFixe = id => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h % 99999 + 1; };
  const H = (tag, classe, html) => { const e = document.createElement(tag); if (classe) e.className = classe; if (html !== undefined) e.innerHTML = html; return e; };
  const ICONES_SAISON = {      // un soleil, une feuille, un flocon (Jérôme, v0.60.2)
    ete: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M3.4 12.6L4.5 11.5M11.5 4.5L12.6 3.4"/></svg>',
    automne: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13C3 7 7 3 13 3C13 9 9 13 3 13Z"/><path d="M3 13L9 7"/></svg>',
    hiver: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 1.5V14.5M2.4 4.8L13.6 11.2M2.4 11.2L13.6 4.8"/></svg>' };
  const SAISONS_CHOIX = ['ete', 'automne', 'hiver'];
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  { const [grain, taches] = bruitsDuPapier(); scene.style.setProperty('--bruit-grain', grain); scene.style.setProperty('--bruit-taches', taches); }
  return new Promise(ok => {
    let choisi = ids[0], ouvert = true, saison = null, saisonHasard = false, meteoApercu = null, sequence = 0;       // saison : null tant que le joueur n'a rien touché (la saison du secteur, par défaut), puis son choix
    const saisonDe = () => saison ?? SECTEURS[choisi].saison ?? SAISON_DEFAUT;
    // le temps de l'aperçu (Jérôme, retour du 2 nov.) : tiré au sort parmi ceux de la saison, retiré à chaque tirage de la carte « Au hasard » et à chaque saison choisie ; il ne change pas la partie (le premier jour suit la saison)
    const tirerMeteo = () => { const ts = Object.keys(SAISONS[saisonDe()]?.transitions ?? {}); meteoApercu = ts.length ? ts[Math.floor(Math.random() * ts.length)] : null; };
    const graineDe = () => choisi === ID_ALEATOIRE ? graine : graineFixe(choisi);
    // le niveau (Jérôme, v0.70.0) et la durée (retour du 1er nov.) : le dernier choix est gardé dans les réglages (jamais en mode essai ni à deux)
    let difficulte = DIFFICULTES[prefs.difficulte] ? prefs.difficulte : DIFFICULTE_DEFAUT;
    let duree = DUREES[prefs.duree] ? prefs.duree : DUREE_DEFAUT;
    const resultat = () => ({ secteur: choisi, graine: graineDe(), saison: saisonDe(), difficulte: avecDifficulte ? difficulte : undefined, jours: avecDifficulte && !SECTEURS[choisi]?.joursFixes ? DUREES[duree].jours ?? undefined : undefined });

    // la liste : une ligne par secteur, petite (Jérôme, v0.51.0 : « pas d'aperçu du relief, uniquement les titres ») ; ce qu'est un secteur se lit sur sa carte
    liste.replaceChildren(...ids.map(id => { const b = H('button', id === ID_ALEATOIRE ? 'carte-ligne hasard' : 'carte-ligne', id === ID_ALEATOIRE ? `${DE}<span>Au hasard</span>` : '<span></span>'); b.type = 'button'; b.dataset.id = id; if (id !== ID_ALEATOIRE) b.firstChild.textContent = SECTEURS[id].nom; return b; }));
    const ligneDe = id => liste.querySelector(`[data-id="${CSS.escape(id)}"]`);

    // la carte : le papier (un fond aux bords rongés, du grain, des taches, des plis par-dessus le texte), le nom, la place de l'aperçu 3D (avec la saison dessus), la description, le niveau, la durée
    const reglage = (nom, classe, entrees) => {
      const r = H('div', 'carte-reglage'); r.append(H('span', 'carte-reglage-nom', nom));
      const rang = H('div', 'carte-reglage-rang'); rang.setAttribute('role', 'group'); rang.setAttribute('aria-label', nom);
      for (const [cle, texte, info] of entrees) { const b = H('button', 'pastille'); b.type = 'button'; b.dataset[classe] = cle; b.textContent = texte; b.title = info; b.setAttribute('aria-label', `${texte} : ${info}`); rang.append(b); }
      r.append(rang); return r;
    };
    const carte = H('div', 'carte-papier');
    {
      const cadre = H('div', 'carte-cadre', '<img class="carte-img" alt="" draggable="false">');
      const saisons = H('div', 'carte-saisons'); saisons.setAttribute('role', 'group'); saisons.setAttribute('aria-label', 'La saison');
      for (const s of SAISONS_CHOIX) { const b = H('button', 'pastille', `${ICONES_SAISON[s]}<span>${SAISONS[s].nom}</span>`); b.type = 'button'; b.dataset.saison = s; b.title = `${SAISONS[s].nom} : ${SAISONS[s].desc}`; b.setAttribute('aria-label', `${SAISONS[s].nom} : ${SAISONS[s].desc}`); saisons.append(b); }
      { const b = H('button', 'pastille', `${DE}<span>Hasard</span>`); b.type = 'button'; b.dataset.saison = 'hasard'; b.title = 'Une saison tirée au hasard'; b.setAttribute('aria-label', 'Au hasard : une saison tirée au sort'); saisons.append(b); }
      const de = H('button', 'pastille carte-de', `${DE}<span>Une autre carte</span>`); de.type = 'button'; de.title = 'Tirer un autre secteur au hasard';      // (seulement sur la carte « Au hasard »)
      cadre.append(saisons, de);
      const corps = H('div', 'carte-corps'); corps.append(cadre, H('p', 'carte-legende'));
      if (avecDifficulte) {            // (la description d'un niveau n'est qu'une infobulle : au survol, Jérôme, retour du 2 nov.)
        const reglages = H('div', 'carte-reglages');
        reglages.append(reglage('Niveau', 'difficulte', Object.entries(DIFFICULTES).map(([k, D]) => [k, D.nom, D.desc])), reglage('Durée', 'duree', Object.entries(DUREES).map(([k, D]) => [k, D.nom, D.desc])));
        corps.append(reglages);
      }
      const contenu = H('div', 'papier-contenu'); contenu.append(H('h3', 'carte-nom'), corps);
      const fond = H('div', 'papier-fond'); fond.style.clipPath = bordRonge('carte');
      carte.append(fond, contenu, H('div', 'papier-calque grain'), H('div', 'papier-calque taches'), H('div', 'papier-calque plis'));
    }
    // quelques feuilles dessous, pour l'épaisseur de la pile : du décor (aucun texte à lire)
    const feuilles = [[-7, -6, -1.4], [6, -11, 1.1], [-3, -16, -0.5]].map(([x, y, r], k) => { const f = H('div', 'carte-feuille'); f.style.clipPath = bordRonge(`feuille${k}`); f.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`; f.setAttribute('aria-hidden', 'true'); return f; });
    scene.replaceChildren(...feuilles, carte);
    const cadre = carte.querySelector('.carte-cadre'), img = carte.querySelector('.carte-img');

    const marquer = () => {
      for (const b of liste.children) b.setAttribute('aria-pressed', String(b.dataset.id === choisi));
      for (const b of d.querySelectorAll('[data-saison]')) b.setAttribute('aria-pressed', String(saisonHasard ? b.dataset.saison === 'hasard' : b.dataset.saison === saisonDe()));
      for (const b of d.querySelectorAll('[data-difficulte]')) b.setAttribute('aria-pressed', String(b.dataset.difficulte === difficulte));
      for (const b of d.querySelectorAll('[data-duree]')) { b.setAttribute('aria-pressed', String(b.dataset.duree === duree && !SECTEURS[choisi]?.joursFixes)); b.disabled = !!SECTEURS[choisi]?.joursFixes; b.dataset.titre ??= b.title; b.title = b.disabled ? 'Cette bataille dure un jour' : b.dataset.titre; }       // (la contre-attaque éclair : une journée, quelle que soit la durée choisie)
    };
    // l'image de ce que l'aperçu montrait, par secteur et par saison : la carte qui part la garde, et une carte déjà vue arrive avec la sienne
    const vues = {}, cleVue = () => `${choisi}|${saisonDe()}|${choisi === ID_ALEATOIRE ? graine : ''}`;
    const figer = () => { try { const cv = hote.querySelector('canvas'); if (cv && apercuSecteur && hote.parentElement === cadre && hote.style.visibility !== 'hidden') { apercuSecteur.rendu.dessiner(0.033, []); vues[cleVue()] = cv.toDataURL('image/png'); img.src = vues[cleVue()]; } } catch { /* sans image figée : le fond de la carte */ } };
    const majCarte = () => {
      const S = SECTEURS[choisi];
      carte.querySelector('.carte-nom').textContent = S.nom; carte.querySelector('.carte-legende').textContent = S.resume; carte.classList.toggle('hasard', choisi === ID_ALEATOIRE);
      if (vues[cleVue()]) img.src = vues[cleVue()]; else img.removeAttribute('src');
    };
    const changerReglage = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('carte-de')) { choisir(ID_ALEATOIRE); return; }
      if (b.dataset.saison) {      // « Au hasard » (Jérôme, retour du 1er nov.) : un clic tire une saison, montrée tout de suite sur l'aperçu et jouée telle quelle ; un autre clic en tire une autre
        if (b.dataset.saison === 'hasard') { saisonHasard = true; saison = SAISONS_CHOIX[Math.floor(Math.random() * SAISONS_CHOIX.length)]; tirerMeteo(); montrer(); }
        else if (saisonHasard || b.dataset.saison !== saisonDe()) { saisonHasard = false; saison = b.dataset.saison; tirerMeteo(); montrer(); }
      } else if (b.dataset.difficulte) { difficulte = b.dataset.difficulte; prefs.difficulte = difficulte; store.save('prefs', prefs); marquer(); }
      else if (b.dataset.duree) { duree = b.dataset.duree; prefs.duree = duree; store.save('prefs', prefs); marquer(); }
    };
    carte.onclick = changerReglage;

    // le glissement : l'ancienne carte (une copie, avec son image figée) part sous les feuilles, la nouvelle grossit depuis la ligne cliquée
    const partir = () => {
      const s = carte.cloneNode(true); s.classList.add('sortante'); s.inert = true; s.setAttribute('aria-hidden', 'true');
      for (const e of s.querySelectorAll('[id]')) e.removeAttribute('id'); s.querySelector('.carte-cadre #carte-3d')?.remove();
      scene.insertBefore(s, carte);
      s.animate([{ transform: 'none' }, { transform: 'translate(-12px, -9px) rotate(-1.8deg)' }], { duration: 420, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {}).finally(() => s.remove());
    };
    const arriver = (ligne, apres) => {
      if (reduit) { apres(); return; }
      const r = ligne.getBoundingClientRect(), c = carte.getBoundingClientRect(), dx = r.left + r.width / 2 - (c.left + c.width / 2), dy = r.top + r.height / 2 - (c.top + c.height / 2);
      carte.animate([{ transform: `translate(${dx}px, ${dy}px) scale(.2) rotate(-8deg)`, opacity: 0.2 }, { transform: `translate(${dx * 0.12}px, ${dy * 0.12}px) scale(1.015) rotate(0.8deg)`, opacity: 1, offset: 0.78 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.16,.84,.3,1)' }).finished.catch(() => {}).finally(apres);
    };

    // la carte agrandie (v0.51.0) : la liste et la carte s'effacent, l'aperçu prend la place et se parcourt (glisser : tourner, Maj ou bouton droit : déplacer, molette : zoomer) ; un autre clic ou Échap la réduit
    const agrandir = oui => {
      if (oui === d.classList.contains('agrandi') && apercuSecteur) return;
      d.classList.toggle('agrandi', oui); grande.hidden = !oui;
      if (oui) { figer(); grande.append(hote); } else cadre.prepend(hote);
      $('carte-conseil').textContent = oui ? 'Glissez pour tourner, Maj ou bouton droit pour déplacer, molette pour zoomer. Cliquez ou Échap pour réduire.' : 'Cliquez sur la carte pour l\'agrandir et la parcourir.';
      apercuSecteur?.redimensionner();
    };
    d.oncancel = e => { if (d.classList.contains('agrandi')) { e.preventDefault(); agrandir(false); } };
    const fin = res => { agrandir(false); ouvert = false; apercuSecteur?.activer(false); d.onclose = null; if (d.open) d.close(); ok(res); };
    // le secteur choisi, en 3D, sur la carte (le premier passage charge le moteur de l'aperçu ; sans WebGL, la carte garde son cadre vide) ; `data-apercu` dit ce qui est monté (les essais le lisent)
    const montrer = async () => {
      marquer();
      try {
        if (!apercuSecteur) { const { creerVue3D } = await import('./apercu-3d.js?v=0.129.0'); apercuSecteur = await creerVue3D({ R, hote, rotation: 0.12 }); apercuSecteur.surClic = () => agrandir(!d.classList.contains('agrandi')); }
        if (!ouvert) return;
        apercuSecteur.monter(choisi, SECTEURS[choisi], graineDe(), { soldats: false, cadrer: true, saison: saisonDe(), meteo: meteoApercu ?? undefined });
        hote.style.visibility = ''; d.dataset.apercu = `${choisi}:${graineDe()}:${saisonDe()}`;
        apercuSecteur.activer(true);
      } catch (e) { console.warn('Aperçu 3D indisponible', e); hote.hidden = true; }
    };
    // choisir un secteur : « Au hasard » en tire un autre à chaque fois, même déjà choisi (Jérôme, v0.60.2) ; avec la saison « Au hasard », chaque secteur choisi tire aussi une autre saison
    const choisir = id => {
      if (id === ID_ALEATOIRE) { graine = Math.floor(Math.random() * 99999) + 1; preparerAleatoire(graine); } else if (id === choisi && apercuSecteur) return;
      const mon = ++sequence;
      if (!reduit && apercuSecteur && !d.classList.contains('agrandi')) { figer(); partir(); }      // (l'image de l'ancienne carte, avant que l'état change)
      choisi = id; if (saisonHasard) saison = SAISONS_CHOIX[Math.floor(Math.random() * SAISONS_CHOIX.length)];
      tirerMeteo(); majCarte(); marquer();
      apercuSecteur?.activer(false); hote.style.visibility = 'hidden';       // l'aperçu ne se redessine pas pendant que la carte arrive (chaque image du 3D coûte, le glissement saccadait) ; `montrer` le relance
      arriver(ligneDe(id), () => { if (mon === sequence) montrer(); });
    };
    liste.onclick = e => { const b = e.target.closest('.carte-ligne'); if (b) choisir(b.dataset.id); };
    liste.ondblclick = e => { if (e.target.closest('.carte-ligne')) fin(resultat()); };
    $('carte-jouer').onclick = () => fin(resultat());
    d.onkeydown = e => {
      if (e.key === 'Escape' && d.classList.contains('agrandi')) { e.preventDefault(); agrandir(false); return; }
      const k = Number(e.key), aller = id => { choisir(id); const l = ligneDe(id); l.focus(); l.scrollIntoView({ block: 'nearest' }); };
      if (k >= 1 && k <= Math.min(9, ids.length)) { e.preventDefault(); aller(ids[k - 1]); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const i = ids.indexOf(choisi) + (e.key === 'ArrowDown' ? 1 : -1); if (ids[i]) aller(ids[i]); }
      else if (e.key === 'Enter' && !e.target.closest('form button')) { e.preventDefault(); fin(resultat()); }
    };
    d.onclose = () => { ouvert = false; apercuSecteur?.activer(false); ok(null); };            // annulé (Échap ou le bouton)
    hote.hidden = false; hote.style.visibility = ''; grande.hidden = true; d.classList.remove('agrandi'); delete d.dataset.apercu;
    $('carte-conseil').textContent = 'Cliquez sur la carte pour l\'agrandir et la parcourir.';
    cadre.prepend(hote); majCarte(); marquer();
    d.showModal();
    for (const l of liste.children) { const t = l.querySelector('span'); if (t && t.scrollWidth > t.clientWidth + 1) l.title = t.textContent; }       // (un nom tronqué par « … » se lit en entier au survol)
    ligneDe(choisi).focus();
    tirerMeteo();
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
function lancerBarrage(cal, x, y, x2, y2) {
  if (!reseau) return ordonnerBarrage(B, cal, x, y, NOUS, x2, y2);
  const p = peutBarrage(B, cal, x, y, MOI, x2, y2);
  if (p.ok) reseau.ls.commander(x2 === undefined ? { t: 'barrage', cal, x, y } : { t: 'barrage', cal, x, y, x2, y2 });
  return p;
}
// Ce que fait un ordre, le même chez les deux (`camp` : celui qui l'a donné)
function executerCmd(c, camp, b, st) {
  if (c.t === 'marche') { const r = ordonnerMarche(b, c.ids, c.x, c.y, c.forme, camp); if (camp === MOI && r.ok) { marque = { x: c.x, y: c.y, t: 2 }; ordreDonne(r); } }
  else if (c.t === 'char') { const r = ordonnerChar(b, c.id, c.ordre, c.x, c.y, camp); if (camp === MOI && r.ok && (c.ordre === 'marche' || c.ordre === 'cible')) marque = { x: c.x, y: c.y, t: 2 }; }
  else if (c.t === 'nid') { const r = orienterNid(b, c.id, camp, c.x, c.y); if (camp === MOI && r.refus) dire(r); }       // la direction du cône d'un poste (lot E)
  else if (c.t === 'barrage') { const r = ordonnerBarrage(b, c.cal, c.x, c.y, camp, c.x2, c.y2); if (camp === MOI && r.ok) marque = { x: c.x, y: c.y, t: 2 }; }
  else if (c.t === 'stance') { const r = ordonnerStance(b, c.ids, c.stance, camp); if (camp === MOI && r.ok) { noterStance(r.regiments, c.stance); regimentsVus = ''; majHud(); } }
  else if (c.t === 'renfort') { const r = deployer(b, camp, !!c.ralliee); if (camp === MOI) { if (r.ok) toast(`${r.mode === 'contre' ? 'Contre-attaque' : 'Renfort'} : ${r.ou}, ${r.n} hommes.`); else dire(r); majHud(); } }      // un régiment sort de la caserne (lot D)
  else if (c.t === 'transfert') { const r = c.annule != null ? annulerTransfert(b, camp, c.annule) : planifierTransfert(b, camp, c.de, c.vers, c.n); if (camp === MOI) { if (!r.ok) dire(r); majHud(); } }      // un transfert d'hommes entre régiments, prévu la nuit (v0.116.0)
  else if (c.t === 'hop') { const r = affecterGueris(b.etat, camp, c.reg ?? null); if (camp === MOI) { if (r.ok) toast('Affectation des guéris changée.'); else dire(r); majHud(); } }
  else if (c.t === 'bat') { const r = ordonnerChantier(b.etat, c.cle, c.choix ?? null, camp); if (camp === MOI) { if (r.ok) toast(`${BATIMENTS[c.cle].nom} : chantier lancé, fini à l'aube.`); else dire(r); majHud(); } }      // un chantier du camp (v0.94.0)
  else if (c.t === 'depart') {       // le départ : la bataille attend que les deux commandants se déclarent prêts (elle commence en pause chez les deux)
    reseau.departs[camp] = true;
    if (reseau.departs[0] && reseau.departs[1]) { st.pause = false; $('dialogue-depart').close(); }
    else if (camp !== MOI) $('depart-statut').textContent = 'L\'autre commandant est prêt.';
  }
  else if (c.t === 'pause') st.pause = c.v ?? !st.pause;      // un état demandé, pas une bascule : deux pauses demandées ensemble ne s'annulent plus
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
// Un point de reprise d'une partie à deux, tous les 60 s : les deux machines l'écrivent au même cadre, avec le même nom (l'empreinte de l'état) ; on garde les deux derniers,
// car une machine coupée entre deux points n'a peut-être pas le plus récent. Rien n'est écrit en mode essai, ni quand la bataille est finie.
function enregistrerDeux(h) {
  if (!reseau || ESSAI || B.etat.phase === 'fin') return;
  const avant = store.load('partieDeux')?.points ?? [];
  try { store.save('partieDeux', { moi: reseau.moi, version: versionJeu, points: [{ id: h, photo: photo(B) }, ...avant.slice(0, 1)] }); } catch (e) { console.error(e); }
}
$('dialogue-depart').addEventListener('cancel', e => e.preventDefault());       // Échap ne passe pas le départ : il faut dire « Prêt »
$('deux-pret').onclick = () => { if (!reseau) return; $('deux-pret').disabled = true; $('deux-pret').textContent = 'En attente de l\'autre commandant…'; reseau.ls.commander({ t: 'depart' }); };
let repriseDeux = null;       // la sauvegarde qu'on veut reprendre (le bouton de l'écran titre), ou null
function demarrerReseau({ moi, lien, graine, secteur, saison, reprise }) {
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  reseau = { moi, lien, ls: null, corvees: {}, pret: [false, false], pauseParMoi: false, departs: [false, false] };
  reglerCamp(moi);
  const b = reprise ? restaurer(reprise.photo, R) : nouvelleBataille(graine, R, { secteur, saison, deux: true, camp: true });      // à deux aussi, chacun a son camp (v0.94.0)
  reseau.ls = creerLockstep({
    B: b, moi, surPoint: enregistrerDeux, envoyer: m => lien.envoyer(m), executer: executerCmd,
    surEcart: (cadre, a, b, sections) => { noter('Désynchronisation : les deux parties ne sont plus les mêmes.'); toast(`Désynchronisation (${sections.join(', ') || 'état'}) : les deux parties ont divergé.`, 'alerte'); console.error('désynchronisation au cadre', cadre, a, b, sections); },
  });
  // le pouls : un message toutes les 2 s même quand rien ne se joue (un onglet caché, une machine qui attend) ; 90 s de silence : l'autre n'est plus là
  reseau.vu = performance.now(); reseau.attendu = false;
  reseau.pouls = setInterval(() => {
    if (!reseau) return;
    lien.envoyer({ t: 'ping' });
    if (performance.now() - reseau.vu > 90000) quitterReseau('L\'autre machine ne répond plus : la connexion est perdue.');
  }, 2000);
  lien.surMessage = m => { if (!reseau) return; reseau.vu = performance.now(); if (m.t === 'cmds' || m.t === 'hash') reseau.ls.recevoir(m); else if (m.t === 'quitte') quitterReseau('L\'autre commandant a quitté la partie.'); };
  lien.surFermeture = () => { if (reseau) quitterReseau('La connexion est perdue.'); };
  reseau.ls.etat.pause = true;                              // la bataille (neuve ou reprise) démarre en pause chez les deux, jusqu'à ce qu'ils soient prêts
  jouer(b);
  $('depart-statut').textContent = reprise ? 'Partie reprise. La bataille repart quand les deux commandants sont prêts.' : 'La bataille commence quand les deux commandants sont prêts.';
  $('deux-pret').disabled = false; $('deux-pret').textContent = 'Prêt'; $('dialogue-depart').showModal();
  noter(`Vous êtes le ${moi === NOUS ? 'bleu' : 'kaki'}. ${missionOrdre()}`);
  toast(`Vous êtes le ${moi === NOUS ? 'bleu' : 'kaki'}. Espace : pause pour les deux.`);
}
function quitterReseau(message) {
  const r = reseau; if (!r) return;
  clearInterval(r.pouls); $('dialogue-depart').close();
  reseau = null; reglerCamp(NOUS);
  try { r.lien.envoyer({ t: 'quitte' }); r.lien.fermer(); } catch { /* déjà fermé */ }
  if (message) toast(message);
  loop.resume(); montrerTitre();
}
// la poignée de main : la version du jeu et ses réglages doivent être les mêmes (les deux machines calculent avec le même code et les mêmes nombres)
function poigneeHote(lien, graine, secteur, saison) {
  const reprise = repriseDeux;
  lien.surOuvert = () => lien.envoyer({ t: 'init', version: versionJeu, reglages: empreinteReglages(), graine, secteur, saison, reprise: reprise ? reprise.points.map(p => p.id) : null });
  lien.surMessage = m => {
    if (m.t === 'ok') demarrerReseau({ moi: NOUS, lien, graine, secteur, saison, reprise: reprise ? reprise.points.find(p => p.id === m.reprise) : null });
    else if (m.t === 'refus') { $('deux-statut').textContent = `L'autre machine refuse : ${m.raison}`; lien.fermer(); }
  };
}
function poigneeInvite(lien) {
  lien.surMessage = m => {
    if (m.t !== 'init') return;
    const raison = m.version !== versionJeu ? `elle joue la v${m.version}, vous la v${versionJeu} : rechargez la page` : m.reglages !== empreinteReglages() ? 'les réglages (l\'atelier) ne sont pas les mêmes' : !(SECTEURS[m.secteur] || m.secteur === ID_ALEATOIRE) ? 'secteur inconnu' : m.saison && !SAISONS[m.saison] ? 'saison inconnue' : null;
    if (raison) { lien.envoyer({ t: 'refus', raison }); $('deux-statut').textContent = `Impossible de jouer ensemble : ${raison}.`; return; }
    // la reprise d'une partie : les deux doivent la vouloir, avoir joué les mêmes camps (l'hôte le bleu) et partager un point (le plus récent des siens que l'hôte a aussi)
    const sauv = store.load('partieDeux'), point = m.reprise && sauv && sauv.version === versionJeu && sauv.moi === EUX ? m.reprise.map(id => sauv.points.find(q => q.id === id)).find(Boolean) : null;
    const refus = m.reprise && !point ? 'vous n\u2019avez pas de partie à deux à reprendre avec lui (autre camp, autre version, ou aucun point commun)' : !m.reprise && repriseDeux ? 'il lance une nouvelle partie, vous vouliez reprendre l\u2019ancienne' : '';
    if (refus) { lien.envoyer({ t: 'refus', raison: refus }); $('deux-statut').textContent = `Impossible de jouer ensemble : ${refus}.`; return; }
    lien.envoyer({ t: 'ok', reprise: point?.id ?? null });
    demarrerReseau({ moi: EUX, lien, graine: m.graine, secteur: m.secteur, saison: m.saison, reprise: point });
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
  $('jouer-deux').onclick = () => { repriseDeux = null; ouvrirDeux(); };
  // reprendre : le bleu invite, le kaki rejoint, chacun avec sa sauvegarde (v0.60.0)
  $('reprendre-deux').onclick = () => { repriseDeux = store.load('partieDeux'); if (!repriseDeux) return; ouvrirDeux(repriseDeux.moi === NOUS ? 'Reprise : vous étiez le bleu, vous invitez.' : 'Reprise : vous étiez le kaki, vous rejoignez avec le code du bleu.'); };
  const ouvrirDeux = (mot = '') => {
    $('deux-choix').hidden = false; $('deux-hote').hidden = true; $('deux-invite').hidden = true; statut('');
    for (const id of ['deux-invitation', 'deux-reponse', 'deux-invitation-recue', 'deux-ma-reponse']) $(id).value = '';
    $('deux-inviter').hidden = !!repriseDeux && repriseDeux.moi !== NOUS; $('deux-rejoindre').hidden = !!repriseDeux && repriseDeux.moi === NOUS; statut(mot);
    dlg.showModal();
  };
  dlg.addEventListener('close', () => { arreterRelais?.(); arreterRelais = null; if (!reseau && lien) { lien.fermer(); lien = null; } });
  $('deux-inviter').onclick = async () => {
    const choix = repriseDeux ? { secteur: repriseDeux.points[0].photo.secteur ?? 'essai', graine: repriseDeux.points[0].photo.graine, saison: repriseDeux.points[0].photo.sol?.saison } : await demanderSecteur(false);
    if (!choix) return;
    const { secteur, graine, saison } = choix;
    $('deux-choix').hidden = true; $('deux-hote').hidden = false; statut('Préparation de l\'invitation…');
    try {
      lien = creerHote(); poigneeHote(lien, graine, secteur, saison); suivreEtat(lien);
      $('deux-invitation').value = await lien.inviter();
      const code = nouveauCode(); $('deux-code').textContent = code;
      const hors = () => statut('Relais injoignable : utilisez le copier-coller ci-dessous.');
      arreterRelais = ecouter(code, async m => {
        if (m.t !== 'reponse' || !lien || lien.pc.remoteDescription) return;
        try { statut('Connexion en cours…'); await lien.accepter(m.texte); } catch (e) { statut(`Réponse illisible : ${e.message}`); }
      }, hors);
      await publier(code, { t: 'invitation', texte: $('deux-invitation').value }).catch(e => { console.error(e); hors(); });
      statut(`Secteur : ${SECTEURS[secteur].nom}${SAISONS[saison] ? `, en ${SAISONS[saison].nom}` : ''}. En attente de l'autre joueur.`);
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
  if (choix) commencer(choix.graine, choix.secteur, choix.saison, choix.difficulte, choix.jours);
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
// « Quitter la partie » (Jérôme, v0.64.0) : la partie en cours est effacée, on revient à l'accueil ; « Écran titre » la garde. Une partie à deux : l'autre commandant est prévenu, et la reprise n'existe plus pour personne qui la quitte.
$('abandonner').onclick = async () => {
  if (!await confirmer(reseau ? 'Quitter la partie à deux ? Elle sera effacée de cette machine et l\'autre commandant sera prévenu.' : 'Quitter la partie ? Elle sera effacée : on ne pourra pas la reprendre.', 'Quitter la partie')) return;
  $('dialogue-pause').close();
  store.clear('partieDeux');
  if (reseau) { B = null; return quitterReseau('Vous avez quitté la partie.'); }
  store.clear('partie'); B = null;       // (sans B, l'enregistrement automatique n'écrit plus rien)
  montrerTitre();
};
// « Abandonner la campagne » (Jérôme, v0.64.2) : la campagne entière est effacée (son registre, et la bataille en cours), on revient à l'accueil
$('abandonner-campagne').onclick = async () => {
  if (!await confirmer('Abandonner la campagne ? Le registre des batailles jouées et la bataille en cours seront effacés : on ne pourra pas la reprendre.', 'Abandonner la campagne')) return;
  $('dialogue-pause').close();
  store.clear(CLE_CAMPAGNE); store.clear('partie'); B = null;
  montrerTitre();
};
$('pause-reglages').onclick = () => $('dialogue-reglages').showModal();
$('ouvrir-reglages').onclick = () => $('dialogue-reglages').showModal();
$('dialogue-reglages').addEventListener('close', reprendre);
// Échap ferme une fenêtre, il ne reprend jamais le jeu (Jérôme, v0.100.0) : le temps reste arrêté en pause active, Espace ou « Reprendre » le relance
for (const id of ['dialogue-pause', 'dialogue-mission', 'dialogue-ordre', 'dialogue-reglages', 'dialogue-aide-carte']) {
  $(id).addEventListener('cancel', () => {
    if (!enJeu()) return;
    if (reseau) reseau.pauseParMoi = false; else pauseActive = true;
    queueMicrotask(majHud);
  });
}
// le bouton droit et celui de la molette appartiennent au jeu : leurs événements de souris ne vont pas plus loin que
// le canvas (empêcher le « pointerdown » supprime aussi mousedown et mouseup, que lisent les gestes)
for (const t of ['pointerdown', 'mousedown', 'mouseup', 'auxclick', 'contextmenu']) {
  window.addEventListener(t, e => {
    if (e.target !== $('canvas') || (t !== 'contextmenu' && e.button === 0)) return;
    e.preventDefault(); if (t !== 'pointerdown') e.stopImmediatePropagation();
  }, { capture: true });
}
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { son.cacher(document.hidden); if (document.hidden) pause(); });

// ─── La nuit, la fin ───────────────────────────────────────────────────────
function montrerFin() {
  loop.pause(); sauvegarder();
  if (reseau) store.clear('partieDeux');          // la bataille est finie : rien à reprendre
  // le registre de la campagne est écrit avant l'écran de fin : une coupure ne perd rien (idempotent si la partie est relue ici)
  let campagne = null;
  try { campagne = cloturerDansLeStore(store, B); } catch (e) { toast(`Campagne : ${e.message}`, 'alerte'); }
  // la campagne continue : le registre (variante A du labo) remplace l'écran de fin, un papier posé sur le champ
  if (campagne?.statut === 'en cours') { laCampagne.montrer(passage(campagne), () => lancerCampagne(campagne)); return; }
  // elle est finie : un papier sobre, les batailles puis les noms (Jérôme : sans fanfare), au lieu de l'écran de fin
  if (campagne) { laCampagne.montrerFin(bilanCampagne(campagne), montrerTitre); return; }
  const e = B.etat, [vNous, vEux] = effectifs(B);
  $('fin-titre').textContent = `${e.jour} jour${e.jour > 1 ? 's' : ''}.`;
  $('fin-issue').textContent = reseau ? `${e.issue?.reussie ? 'Le bleu' : 'Le kaki'} l'emporte. ${e.issue?.texte || ''}` : (e.issue?.texte || '') + (e.issue?.secondaires ? ` Missions secondaires : ${e.issue.secondaires.reussies.length} réussie(s), ${e.issue.secondaires.score} points.` : '');
  $('fin-nouvelle').hidden = !!reseau;
  // jour après jour : ce qu'il a coûté, sans un mot de plus
  $('fin-jours').replaceChildren(...e.pertesJour.slice(0, e.jour).map(([n, x], k) => Object.assign(document.createElement('li'), { textContent: `Jour ${k + 1} : ${n} des nôtres, ${x} en face.` })));
  $('fin-pertes').textContent = `${e.pertes[0]} des nôtres sont morts, ${e.pertes[1]} en face. Il en reste ${vNous} et ${vEux}.`;
  $('fin-medailles').replaceChildren(Object.assign(document.createElement('h3'), { textContent: 'Médailles de la bataille' }), ...tableau(palmares(B, MOI, 'total')));
  $('fin-lignes').textContent = e.tranchees ? `Tronçons tenus : ${tronconsTenus(B)[0]} des nôtres, ${tronconsTenus(B)[1]} en face.` : '';
  // le bordereau de dotation (variante tampon + bordereau du labo, v0.99.3) : il s'écrit ligne à ligne, puis le tampon « +n » claque
  const bd = bordereau(B), zone_ = $('fin-bordereau'); zone_.hidden = !bd.total; zone_.replaceChildren();
  if (bd.total && !DEBUG && !reseau && !e.memorialVerse) { e.memorialVerse = true; prefs.memorial = (prefs.memorial || 0) + bd.total; store.save('prefs', prefs); }
  if (bd.total) {
    const ligne = (a, b, cls) => Object.assign(document.createElement('div'), { className: cls || 'bd-ligne', innerHTML: '' }).appendChild(document.createElement('span')).parentNode;
    bd.lignes.forEach(([t, n], k) => { const d = ligne(); d.firstChild.textContent = t; const b = document.createElement('b'); b.textContent = `+${n}`; d.append(b); d.style.animationDelay = `${k * 0.35}s`; zone_.append(d); });
    const somme = ligne(null, null, 'bd-ligne bd-somme'); somme.firstChild.textContent = 'Mérite'; const bs = document.createElement('b'); bs.textContent = `+${bd.total}`; somme.append(bs); somme.style.animationDelay = `${bd.lignes.length * 0.35}s`; zone_.append(somme);
    const t = document.createElement('div'); t.className = 'bd-tampon'; t.textContent = `+${bd.total}`; t.style.animationDelay = `${(bd.lignes.length + 1) * 0.35}s`; zone_.append(t);
  }
  $('dialogue-fin').showModal();
}
$('fin-nouvelle').onclick = async () => { $('dialogue-fin').close(); const choix = await demanderSecteur(); if (!choix) return montrerTitre(); if (!ESSAI) store.clear('partie'); commencer(choix.graine, choix.secteur, choix.saison, choix.difficulte, choix.jours); };
$('fin-titre-btn').onclick = () => { $('dialogue-fin').close(); montrerTitre(); };

// ─── Réglages ──────────────────────────────────────────────────────────────
for (const q of ['effets', 'musique']) {
  const champ = $(`son-${q}`);
  champ.value = Math.round(son.volumes[q] * 100);
  champ.oninput = () => { son.volume(q, champ.value / 100); prefs.son = son.volumes; store.save('prefs', prefs); if (q === 'effets') son.interface_('pret'); };
}
$('eclairage').value = rendu.eclairage;
$('eclairage').onchange = () => { rendu.eclairage = $('eclairage').value; prefs.eclairage = rendu.eclairage; store.save('prefs', prefs); };      // Bas / Moyen / Haut (v0.116.0)
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
  if (genre === 'refus') son.interface_('refus');
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
const CARTE_L = 112, CARTE_ECART = 8, CARTE_MIN = 88;      // (v0.65.0 : les cartes s'étirent de CARTE_MIN à 120 px ; si tous les régiments tiennent sur une ligne, pas de flèches)
function majRegiments() {
  const e = B.etat, A = B.armee, regs = e.regiments.filter(r => r.camp === MOI && r.effectif);
  const bl = new Int32Array(e.regiments.length), ex = new Float32Array(e.regiments.length), vivants = new Int32Array(e.regiments.length);
  for (let i = 0; i < A.n; i++) if (A.camp[i] === MOI) { const g = A.reg[i]; vivants[g]++; ex[g] += A.exp[i]; if (A.blessure[i]) bl[g]++; }
  const largeur = $('regiments').clientWidth, tient = largeur >= regs.length * CARTE_MIN + (regs.length - 1) * CARTE_ECART;
  const place = Math.max(0, largeur - 2 * 40), visibles = tient ? regs.length : place ? Math.max(1, Math.min(regs.length, Math.floor((place + CARTE_ECART) / (CARTE_L + CARTE_ECART)))) : regs.length;
  const actif = [...choisis].reverse().map(id => e.regiments[id]).find(r => r && r.camp === MOI && r.effectif) || null;
  const ia = actif ? regs.indexOf(actif) : -1;
  if (ia >= 0 && ia !== regActifVu && (ia < regDebut || ia >= regDebut + visibles)) regDebut = Math.min(Math.max(0, regs.length - visibles), Math.max(0, ia - Math.floor(visibles / 2)));
  regActifVu = ia;
  regDebut = Math.max(0, Math.min(regDebut, regs.length - visibles));
  const cle = regs.map(r => `${r.id}:${r.effectif}:${r.pertes}:${bl[r.id]}:${lecture.statutOrdre(B, r)}:${chevrons(ex[r.id] / Math.max(1, vivants[r.id]))}.${Math.round(ex[r.id] / Math.max(1, vivants[r.id]) * 20)}:${r.deroute ? 1 : 0}:${r.stance}:${moralEnMots(r, R)}:${choisis.has(r.id) ? 1 : 0}:${nuit.etat === 'choix' ? nuit.corvees[r.id] : ''}:${donneeCetteNuit(r) ? 1 : 0}`).join('|')
    + `#${regDebut}/${visibles}#${actif ? `${actif.id}:${ordreEnMots(actif)}:${(actif.equip ?? []).join('+')}:${choisis.size}:${modeMarche}:${forme}:${e.phase}` : ''}`;
  if (cle === regimentsVus) return;
  regimentsVus = cle;
  const pc = (n, r) => `${(n / r.initial * 100).toFixed(1)}%`;
  const cartes = regs.slice(regDebut, regDebut + visibles).map(r => {
    const bles = bl[r.id], debout = Math.max(0, r.effectif - bles), moy = ex[r.id] / Math.max(1, vivants[r.id]), nb = chevrons(moy), humeur = moralEnMots(r, R);
    const gagne = nb > (chevronsVus.get(r.id) ?? nb) && !matchMedia('(prefers-reduced-motion: reduce)').matches;       // un chevron de plus depuis la dernière fois (lot E) : il saute
    chevronsVus.set(r.id, nb);
    const b = document.createElement('button');
    const niv = lecture.niveauMoral(r, R);
    b.className = `reg-carte${choisis.has(r.id) ? ' choisi' : ''}${niv !== 'tient' ? ` ${niv === 'deroute' ? 'deroute' : 'ebranle'}` : ''}${donneeCetteNuit(r) ? ' donne' : ''}${r.id === clicCarte ? ' clic' : ''}`; b.dataset.id = r.id;
    b.setAttribute('aria-pressed', String(choisis.has(r.id)));
    b.setAttribute('aria-label', `${numeroDe(r)} · ${r.nom} : ${debout} debout, ${bles} blessés, ${r.pertes} tombés, ${'chevron '.repeat(nb).trim() || 'aucun chevron'}${humeur.startsWith('tient') ? '' : `, ${humeur}`}${r.stance !== STANCE_DEFAUT ? `, ${STANCES[r.stance].court}` : ''}${donneeCetteNuit(r) ? `, ordre donné : ${corveeDe(nuit.corvees[r.id]).toLowerCase()}` : ''}`);
    // quatre lignes à place fixe : le nom, le statut (l'état moral, sinon la corvée de la nuit, sinon « Tient »), les chevrons et la posture, la barre ; le « ! » est hors du flux
    const statut = niv === 'deroute' ? 'En déroute' : niv === 'ebranle' ? 'Ébranlé' : nuit.etat === 'choix' ? `<span class="corvee">${corveeCourte(nuit.corvees[r.id])}</span>` : lecture.statutOrdre(B, r);
    b.innerHTML = `<span class="l1"><b>${numeroDe(r)}</b> ${r.nom}</span>${niv === 'tient' ? '' : `<i class="alerte" aria-hidden="true">${niv === 'deroute' ? '!!' : '!'}</i>`}
      <span class="statut">${statut}</span>
      <span class="chevrons${gagne ? ' gagne' : ''}" aria-hidden="true">${chevronsHtml(nb)}<span class="xp" title="expérience moyenne de ses hommes : ${Math.round(moy * 100)} %"><i style="width:${Math.round(moy * 100)}%"></i></span>${r.stance !== STANCE_DEFAUT ? `<span class="posture">${STANCES[r.stance].court}</span>` : ''}</span>
      <span class="barre" title="plein : debout (${debout}) · hachuré : blessés (${bles}) · vide : tombés (${r.pertes})"><i class="debout" style="width:${pc(debout, r)}"></i><i class="blesses" style="width:${pc(bles, r)}"></i><i class="tombes" style="width:${pc(r.pertes, r)}"></i></span>`;
    return b;
  });
  $('reg-rang').replaceChildren(...cartes);
  $('reg-prec').hidden = regDebut <= 0; $('reg-suiv').hidden = regDebut + visibles >= regs.length;
  const pan = $('reg-ouvert');
  if (!actif || ia < regDebut || ia >= regDebut + visibles) { pan.hidden = true; fenetreVue = -1; return; }
  const bles = bl[actif.id], debout = Math.max(0, actif.effectif - bles), humeur = moralEnMots(actif, R), tampon = humeur.startsWith('tient') ? '' : humeur, jour = e.phase === 'jour' && !nuit.etat;
  pan.dataset.id = actif.id;
  pan.innerHTML = `<div class="tete"><b>${numeroDe(actif)} · ${actif.nom}</b><span>${secteursDe(B, actif)}</span><button type="button" class="aide" data-act="fiche" aria-label="Fiche du régiment" data-info="# Fiche du régiment&#10;Les hommes, le moral, les vivres, l'équipement.">?</button></div>
    <div class="compte">${debout} debout · ${bles} blessés · ${actif.pertes} tombés</div>
    <div class="ordre">${ordreEnMots(actif)}</div>${actif.equip?.length ? `<p class="discret">Équipé : ${equipeEnMots(actif)}</p>` : ''}${tampon ? `<span class="tampon">${tampon}</span>` : ''}
    ${choisis.size > 1 ? `<p class="discret">+ ${choisis.size - 1} autre${choisis.size > 2 ? 's' : ''} choisi${choisis.size > 2 ? 's' : ''}</p>` : ''}`;
  pan.hidden = false;
  rejouerRebond();
  // le rabat se relève quand on change de régiment (v0.34.6)
  if (fenetreVue !== actif.id && !mouvementReduit) pan.animate([{ transform: 'perspective(500px) rotateX(88deg)', opacity: .4 }, { transform: 'perspective(500px) rotateX(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)' });
  if (fenetreVue !== actif.id) { decalageFenetre.x = 0; decalageFenetre.y = 0; }         // (une autre fenêtre revient à sa place, sur sa carte)
  fenetreVue = actif.id;
  placerFenetre();
}
// La fenêtre d'un régiment et la fiche d'un homme se déplacent à la main (Jérôme, v0.108.0) ; celle du régiment suit sa carte, plus le décalage, qu'un autre régiment remet à zéro
const decalageFenetre = deplacable($('reg-ouvert'), { surDeplace: () => placerFenetre() });
deplacable($('fiche'), { surDeplace: d => { $('fiche').style.translate = `${d.x}px ${d.y}px`; } });
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
  const b = e.target.closest('button[data-act]');
  if (!b || !B) return;
  b.blur();
  if (b.dataset.act === 'fiche') return montrerRegiment(+$('reg-ouvert').dataset.id);
};
$('reg-prec').onclick = () => { regDebut = Math.max(0, regDebut - 1); regimentsVus = ''; majRegiments(); };
$('reg-suiv').onclick = () => { regDebut += 1; regimentsVus = ''; majRegiments(); };

// ─── La carte du secteur (Jérôme, v0.14.0) : huit secteurs numérotés de l'ouest à l'est, les quatre lignes de chaque camp (en
// face au nord, en haut), chaque case en deux tronçons de 25 m, à la couleur de celui qui les tient. Un numéro choisit le
// régiment du secteur ; une case envoie les régiments choisis dans cette tranchée (et la fait clignoter, ici et sur le terrain).
// La carte en proportions (Jérôme, v0.19.0) : les lignes à 20 m l'une de l'autre, un no man's land resserré de 64 px entre les premières
// (la carte entière tiendrait mal à l'écran en vraie grandeur) ; les régiments y sont des cercles, à leur place (au centre de leurs hommes).
// Les chars (v0.81.0) : un char à nous se choisit (son étiquette sur le champ, ou un clic sur lui) ; avec lui choisi, un clic sur le sol l'y envoie (« Cible » : son canon y vise) ;
// « Arrêt » le fige (il tire encore), « Tir libre » lui rend le choix de sa cible. Tout passe par `ordreChar` (le même ordre chez les deux à deux : la commande `char`).
// Les postes de mitrailleuse (lot E) : l'étiquette d'un poste à nous (ou un clic sur lui, sans régiment choisi) le choisit ; choisi, « Tourner » prépare l'ordre et le prochain clic sur le sol
// donne la direction du cône (±70° de sa direction d'origine ; un refus se dit à voix haute) ; « Droit devant » le remet face à l'ennemi. Même ordre chez les deux à deux : la commande `nid`.
function choisirNid(id) { avionChoisi = null; nidChoisi = id; modeNid = null; charChoisi = null; modeChar = null; modeBarrage = null; modeMarche = false; departAvion = null; choisis = new Set(); rendu.choisis = choisis; majHud(); }
function actionNid(act) {
  if (act === 'fermer') { nidChoisi = null; modeNid = null; return majHud(); }
  if (act === 'vue' || act === 'personne') { leSuivi.verrouiller('nid', nidChoisi, act === 'vue' ? 'cinema' : 'personne'); return majHud(); }
  const nc = B.etat.nids.find(k => k.id === nidChoisi), inactif = nc && (act === 'tourner' || act === 'droit') ? raisonInactif(B, nc) : '';
  if (inactif) { modeNid = null; dire({ refus: inactif }); return majHud(); }      // sans servant, la fenêtre est inactive (v0.115.0)
  if (act === 'tourner') { modeNid = modeNid === 'tourner' ? null : 'tourner'; return majHud(); }
  if (act === 'droit') { const n = B.etat.nids.find(k => k.id === nidChoisi); if (n) ordreNid(n.x, n.y + n.face * 50); }
}
function ordreNid(x, y) {
  if (nidChoisi === null) return;
  if (reseau) {
    const refus = refusOrienterNid(B, nidChoisi, MOI, x, y);
    if (refus) return dire({ refus });
    reseau.ls.commander({ t: 'nid', id: nidChoisi, x, y }); nidChoisi = null; modeNid = null;      // l'ordre est donné : la fenêtre se ferme
    return;
  }
  if (dire(orienterNid(B, nidChoisi, MOI, x, y)).ok) { marque = { x, y, t: 2 }; sauvegarder(); nidChoisi = null; modeNid = null; }
}
const nidSous = (x, y) => { let k = -1, md = 16; for (const n of B.etat.nids) if (n.camp === MOI && n.etat === 'actif') { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < md) { md = d; k = n.id; } } return k; };
function choisirAvion(id) { avionChoisi = id; nidChoisi = null; modeNid = null; charChoisi = null; modeChar = null; modeBarrage = null; modeMarche = false; departAvion = null; choisis = new Set(); rendu.choisis = choisis; majHud(); }
function actionAvion(act) {
  if (act === 'fermer') { avionChoisi = null; return majHud(); }
  if (act === 'vue' || act === 'personne') { leSuivi.verrouiller('avion', avionChoisi, act === 'vue' ? 'cinema' : 'personne'); majHud(); }
}
$('avion-fiche').onclick = e => { const b = e.target.closest('[data-avion]'); if (b) actionAvion(b.dataset.avion); };
// la fiche de l'avion choisi (v0.121.0) : sa cellule, son état ; elle se ferme quand l'avion rentre ou tombe
function majAvionFiche() {
  const f = $('avion-fiche'), v = avionChoisi === null ? null : (B.etat.mitraillages ?? []).find(k => k.id === avionChoisi && k.camp === MOI && k.etat === 'vol');
  if (avionChoisi !== null && !v) avionChoisi = null;
  f.hidden = !v;
  if (!v) return;
  const vie = Math.max(0, Math.round(v.pv / MITRAILLAGE.pv * 100)), p = positionDe(v, B.etat.temps), tire = balayage(v, B.etat.temps).actif;
  $('avion-fiche-titre').textContent = 'Avion de mitraillage';
  $('avion-fiche-etat-court').textContent = tire ? 'mitraille' : 'en vol';
  $('avion-fiche-ordre').textContent = tire ? 'Ses balles tombent sur la bande tracée.' : 'Il suit sa passe tracée, puis rentre à l\'aérodrome.';
  $('avion-fiche-pv-t').textContent = `${vie} %`; $('avion-fiche-pv').style.width = `${vie}%`;
  $('avion-fiche-stats').innerHTML = `<b>Altitude :</b> ${Math.round(p.h)} m<br><b>Vitesse :</b> ${MITRAILLAGE.vitesse} m/s`;
  const sv = leSuivi.actif && leSuivi.actif.genre === 'avion' && leSuivi.actif.id === v.id ? leSuivi.actif.mode : null;
  $('avion-fiche-vue').setAttribute('aria-pressed', sv === 'cinema'); $('avion-fiche-personne').setAttribute('aria-pressed', sv === 'personne');
}
function choisirChar(id) { avionChoisi = null; nidChoisi = null; modeNid = null; charChoisi = id; modeChar = null; modeBarrage = null; modeMarche = false; departAvion = null; choisis = new Set(); rendu.choisis = choisis; majHud(); }
function actionChar(act) {
  if (act === 'fermer') { charChoisi = null; modeChar = null; return majHud(); }
  if (act === 'vue' || act === 'personne') { leSuivi.verrouiller('char', charChoisi, act === 'vue' ? 'cinema' : 'personne'); return majHud(); }
  if (act === 'marche' || act === 'cible') { modeChar = modeChar === act ? null : act; return majHud(); }
  if (act === 'reparer') {      // le génie remet le char en état (v0.115.0) : un ordre « Génie » sur lui, un avion ou un char par jour
    const c = B.etat.chars.find(k => k.id === charChoisi);
    if (c && dire(lancerBarrage(GENIE, c.x, c.y)).ok) { toast('Le génie part remettre le char en état.'); sauvegarder(); }
    return majHud();
  }
  ordreChar(act, 0, 0);
}
function ordreChar(ordre, x, y) {
  if (charChoisi === null) return;
  if (reseau) {
    const refus = refusOrdreChar(B, charChoisi, ordre, x, y, MOI);
    if (refus) return dire({ refus });
    return reseau.ls.commander({ t: 'char', id: charChoisi, ordre, x, y });
  }
  const r = dire(ordonnerChar(B, charChoisi, ordre, x, y, MOI));
  if (r.ok && (ordre === 'marche' || ordre === 'cible')) marque = { x, y, t: 2 };
  if (r.ok) sauvegarder();
}
const charSous = (x, y) => { let k = -1, md = 49; for (const c of B.etat.chars) if (c.camp === MOI && c.etat !== 'detruit') { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < md) { md = d; k = c.id; } } return k; };
function choisirRegiment(id, ajout) {
  charChoisi = null; modeChar = null; nidChoisi = null; modeNid = null;
  if (!ajout) choisis = new Set();
  if (ajout && choisis.has(id)) choisis.delete(id); else choisis.add(id);
  rendu.choisis = choisis; majHud();
}
function choisirSecteur(s, ajout) {
  const regs = B.etat.regiments.filter(r => { const [a, b] = etendueZones(B, r.depart); return r.camp === MOI && r.effectif && s >= a && s <= b; });
  if (!regs.length) return;          // (le détail du secteur s'ouvre quand même : il dit ce qui s'y passe, v0.76.0)
  if (!ajout) choisis = new Set();
  for (const r of regs) { if (ajout && choisis.has(r.id)) choisis.delete(r.id); else choisis.add(r.id); }
  rendu.choisis = choisis; majHud();
}
// Une case de la carte (Jérôme, v0.108.0 : un secteur est une case, B1 par exemple) : sans régiment choisi (ou avec Alt, ou la nuit) elle ouvre le gros plan de cette case seule ; avec des régiments choisis, l'ordre de s'y rendre
function ordreCase(idx, s, alt = false) {
  if (alt || !choisis.size || B.etat.phase !== 'jour') return detailSecteur(s, idx);
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
  noter(regs.length > 2 ? `${regs.length} régiments en marche.` : regs.map(g => `${g.nom} : ${actionDe(B, g)}`).join(' ; ') + '.', { liens: regs.length > 2 ? [] : regs.map(lienReg) });
  regimentsVus = ''; majHud();
}

// Les événements de la bataille, racontés au carnet de bord (la boucle et le mode debug)
function raconter(ev) {
    for (const p of ev) {
      const reg = p.reg !== undefined ? B.etat.regiments[p.reg] : null;
      if (p.type === 'pont-coupe') noter(`Les obus coupent ${p.nom ? `le ${p.nom}` : 'un pont'} : il tombe à l'eau.`);
      else if (p.type === 'pont-noyes') noter(`${p.nom ?? 'Un pont'} tombe avec des hommes dessus : ${p.noyes} noyé(s), ${p.sauves} sur la rive.`);
      else if (p.type === 'marche-barree' && p.camp === MOI) noter(`${nomDe(B.etat.regiments[p.reg])} : plus de passage, le régiment s'arrête.`, { liens: [lienReg(reg)] });
      else if (p.type === 'nid-detruit') noter(p.camp === MOI ? `Un de nos nids de mitrailleuse est détruit (${nomTroncon(B, B.etat.nids[p.nid].troncon)}).` : 'Un nid de mitrailleuse d\'en face est détruit.', { liens: p.camp === MOI ? [lienTronc(B.etat.nids[p.nid].troncon)] : [] });
      else if (p.type === 'nid-repare' && p.camp === MOI) noter(`Le génie a refait un nid de mitrailleuse (${nomTroncon(B, B.etat.nids[p.nid].troncon)}).`, { liens: [lienTronc(B.etat.nids[p.nid].troncon)] });
      else if (p.type === 'char-repare' && p.camp === MOI) noter('Le génie a remis un char en état de marche.');
      else if (p.type === 'avion-repare' && p.camp === MOI) noter('Le génie a remis un avion en état de vol.');
      else if (p.type === 'pont-rompu') noter('Un pont cède sous le poids d\'un char : char et pont à l\'eau.');
      else if (p.type === 'prise') noter(`${p.camp === MOI ? 'Pris' : 'Perdu'} : ${nomTroncon(B, p.troncon)}.`, { liens: [lienTronc(p.troncon)], genre: p.camp === MOI ? 'gain' : 'perte' });
      else if (p.type === 'dispute') noter(`Ceux d'en face sont dans ${nomTroncon(B, p.troncon)}.`, { liens: [lienTronc(p.troncon)], genre: 'perte' });
      else if (p.type === 'preparation') noter(`En face prépare au 220 sur ${nomTroncon(B, p.troncon)}.`, { liens: [lienTronc(p.troncon)], genre: 'assaut' });
      else if (p.type === 'poursuite') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} poursuit sur notre ligne suivante.`, { liens: reg.nom ? [lienReg(reg)] : [], genre: 'assaut' });
      else if (p.type === 'assaut') noter(`${reg.nom ? `${reg.nom} d'en face` : 'Un régiment d\'en face'} sort de ses tranchées${p.troncon >= 0 ? ` : ${nomTroncon(B, p.troncon)}` : ''}.`, { liens: [...(reg.nom ? [lienReg(reg)] : []), ...(p.troncon >= 0 ? [lienTronc(p.troncon)] : [])], genre: 'assaut' });
      else if (p.camp !== MOI) continue;
      else if (p.type === 'deroute') noter(`${reg.nom} est en déroute.`, { liens: [lienReg(reg)], genre: 'perte' });
      else if (p.type === 'renfort' && p.camp === MOI) noter(`${reg.nom} sort de la caserne : ${p.mode === 'contre' ? 'contre-attaque' : 'il prend'} ${p.ou}.`, { liens: [lienReg(reg)] });
      else if (p.type === 'ralliees' && p.camp === MOI) noter(`${p.n} fuyards ralliés attendent à la caserne.`);
      else if (p.type === 'ralliement') noter(`${reg.nom} se rallie.`, { liens: [lienReg(reg)] });
      else if (p.type === 'palier') { const { qui } = quiEst(p.id); noter(`${qui.prenom} ${qui.nom} est devenu ${['excellent tireur', 'redoutable au corps à corps', 'infatigable', 'imperturbable'][p.carac]}.`, { liens: [lienHomme(p.id)] }); }
      else if (p.type === 'promu' && p.rang === 0) { const { qui } = quiEst(p.id); noter(`${qui.prenom} ${qui.nom} commande ${reg.nom}.`, { liens: [lienHomme(p.id), lienReg(reg)] }); }
    }
}
// Le temps (Jérôme, v0.19.0) : arrêter, ×1, ×2, ×4. Le pas de la simulation ne change pas (la partie est la même) : on en fait plus par
// image, tant que la simulation tient (`perf.sim` × la vitesse sous ~20 ms) ; la vitesse choisie dure jusqu'à la nuit, qui ramène à ×1 (v0.41.2).
function appliquerVitesse() {
  const plafond = perf.sim > 0 ? Math.max(1, Math.floor(20 / perf.sim)) : 4;
  loop.setTimeScale(Math.min(vitesse, plafond));
}
function basculerPause() {
  if (reseau) { reseau.pauseParMoi = false; return reseau.ls.commander({ t: 'pause', v: !reseau.ls.etat.pause }); }
  pauseActive = !pauseActive; if (pauseActive) loop.pause(); else reprendre(); majHud();
}
function majTemps(h) {
  if (reseau) { pauseActive = reseau.ls.etat.pause; vitesse = reseau.ls.etat.vitesse; }
  appliquerVitesse();
  $('temps-pause').classList.toggle('actif', pauseActive); $('temps-pause').setAttribute('aria-pressed', String(pauseActive));
  for (const b of document.querySelectorAll('[data-vitesse]')) b.classList.toggle('actif', +b.dataset.vitesse === vitesse);
}

// les secondes qu'il reste à une batterie à charger (0 : prête) et ce qu'il lui en faut en tout
const resteBatterie = cal => Math.max(0, Math.ceil(((MOI === NOUS ? B.etat.batteries : B.etat.batteriesEux)[cal] ?? 0) - B.etat.temps));
const rechargeDe = cal => (cal === CHAR ? CHAR_RECHARGE : cal === GENIE ? GENIE_DATA.recharge : (CALIBRES[cal] ?? MITRAILLAGE).recharge) * facteurRecharge(B.etat, MOI, cal);
const NOMS_BATTERIES = { [CHAR]: 'Char', [AVION]: 'Avion', [GENIE]: 'Génie' };
function majHud() {
  if (!B) return;
  const h = horloge(B), e = B.etat;
  majBarreTemps(B);
  $('mission').hidden = !e.mission;
  if (e.mission) $('mission').textContent = `${missionNom()} ▸`;
  majPertes(B); majTemps(h);
  majFiche();
  $('pause-active').hidden = !pauseActive;
  majRegiments(); nuit.maj(); gestion.maj(); laCarte.maj(); leDetail.maj();
  leCamp?.maj(B); majBoutonsBarrage();
  $('ecran').classList.toggle('vise', !!modeBarrage || modeMarche || !!modeChar);
}
// L'état d'un ordre de batterie, pour son bouton dans la fenêtre du bâtiment (v0.96.0 ; avant, des boutons de batterie à part, en bas à droite) : le mot court (PRÊT, les secondes, « Niv. 2 »), l'infobulle, muet ou non
function etatOrdre(cal) {
  const e = B.etat, reste = resteBatterie(cal), pret = reste <= 0, nom = NOMS_BATTERIES[cal] ?? `Batterie de ${cal}`;
  let texte = pret ? 'PRÊT' : `${reste} s`, compte = '', titre = pret ? '' : `${nom} : prêt dans ${reste} s`, muet = !pret;
  if (cal === GENIE) {      // les sections du génie : combien au dépôt
    const dep = e.sapeurs[MOI], en = e.genies.filter(g => g.camp === MOI).length;
    compte = `×${dep}`; if (!dep) { texte = en ? 'au travail' : 'perdues'; muet = true; }
    titre = `Génie : ${dep} section(s) au dépôt, ${en} en route ou au travail (${GENIE_DATA.hommes} hommes sans arme chacune) · un avion ou un char remis en état par jour (${reparationFaite(e, MOI) ? 'déjà fait aujourd\'hui' : 'disponible'})`;
  }
  if (cal === CHAR && charsDispo(e, MOI) !== null) {      // le stock du parc (v0.99.10)
    const n = charsDispo(e, MOI); compte = `×${n}`; if (!n) { texte = 'épuisés'; muet = true; }
    titre = `${n} char${n > 1 ? 's' : ''} au parc pour la bataille (le parc en garde plus à ses niveaux supérieurs)`;
  }
  if (cal === AVION) {      // la flotte (v0.57.0) : combien d'avions restent, lesquels sont en l'air, leurs points de vie
    const flotte = e.avions[MOI], restants = avionsRestants(e, MOI), prets = avionsPrets(e, MOI);
    compte = `×${restants}`; if (!restants) { texte = 'perdus'; muet = true; } else if (!prets) { texte = 'en vol'; muet = true; }
    titre = `Avions : ${flotte.map(pv => pv > 0 ? `${pv} pv` : 'perdu').join(', ')}`;
    const meteo = e.meteo[e.jour - 1];
    if (MITRAILLAGE.cloue.includes(meteo) && restants) { texte = METEO[meteo].nom.replace(/^./, c => c.toUpperCase()); muet = true; titre = `Par ${METEO[meteo].nom}, les avions restent au sol. ${titre}`; }      // le brouillard cloue les avions : le bouton est muet (v0.99.8)
  }
  const verrou = refusOrdre(e, MOI, cal);      // le camp n'a pas ce bâtiment ou pas ce niveau (v0.87.0)
  if (verrou) { texte = `Niv. ${ouverture(cal)[1]}`; compte = ''; titre = `${verrou} Un clic ouvre le bâtiment.`; muet = true; }
  else titre = `${titre}${titre ? ' · ' : ''}clic droit : le bâtiment`;
  return { texte, compte, titre, muet, vise: modeBarrage === cal };
}
// Les ordres de batterie gardent leurs boutons, à portée de main (Jérôme, v0.96.1 : « remettre les boutons artillerie dans l'interface » ; v0.97.0 : « idem pour avion, chars et sapeurs », et plus de pastilles du camp) :
// trois barrages puis l'avion, le char et le génie, comme avant le camp (3 + 3). L'état (PRÊT, les secondes, « Niv. 2 » quand le bâtiment n'a pas le niveau, « ×2 » les avions et les sections), la touche, la jauge.
// Un bouton prêt vise ; un bouton fermé ouvre la fenêtre de son bâtiment (pour le bâtir) ; le clic droit l'ouvre toujours (pour l'améliorer). Le même `etatOrdre` pour tous.
const ICONES_ORDRE = {
  char: '<svg viewBox="0 0 38 24" aria-hidden="true" style="max-width:38px"><path d="M3 20L6 16H28L35 20Z"/><path d="M8 16V9H24L28 16Z"/><rect class="ceinture" x="26" y="11" width="11" height="2.5"/><rect class="ceinture" x="7" y="20" width="26" height="2.5"/></svg>',
  genie: '<svg viewBox="0 0 34 26" aria-hidden="true" style="max-width:34px"><path d="M2 20h30v4H2z"/><path d="M5 20V8h4v12zM25 20V8h4v12z"/><path d="M3 5h28v4H3z"/></svg>',
  avion: '<svg viewBox="0 0 34 30" aria-hidden="true" style="max-width:34px"><path d="M15 2h4v8h14v5H19v7h6v4H9v-4h6v-7H1v-5h14z"/></svg>',
};
const BATIMENT_DE = { '75': 'artillerie', '155': 'artillerie', '220': 'artillerie', avion: 'aerodrome', char: 'chars', genie: 'sapeurs' };
const NOM_COURT = { avion: 'Avion', char: 'Char', genie: 'Génie' };
function ordreBouton(cal) {
  if (B && refusOrdre(B.etat, MOI, cal)) { choisirBatiment(BATIMENT_DE[cal]); montrerBatiment(BATIMENT_DE[cal]); return; }
  viser(cal);
}
boutonsBarrage = BATTERIES.map((cal, k) => {
  const b = document.createElement('button');
  b.className = 'batterie'; b.dataset.cal = cal; b.dataset.pret = '1';
  b.setAttribute('aria-label', `${cal === CHAR ? "Char d'assaut" : cal === AVION ? 'Mitraillage aérien' : cal === GENIE ? 'Génie : refaire un pont coupé' : `Barrage de ${cal}`} (touche ${k + 1})`);
  if (ICONES_ORDRE[cal]) b.innerHTML = `${ICONES_ORDRE[cal]}<b>${NOM_COURT[cal]}</b><span>PRÊT</span>${cal === AVION || cal === GENIE || cal === CHAR ? '<em class="flotte"></em>' : ''}<i class="touche" aria-hidden="true">${k + 1}</i><u><s></s></u>`;
  else {      // l'obus debout (sa taille dit le calibre), le calibre et l'état à droite, une jauge de recharge dessous (v0.30.0)
    const H = { 75: 22, 155: 30, 220: 38 }[cal] || 28, W = { 75: 8, 155: 11, 220: 14 }[cal] || 10;
    b.innerHTML = `<svg viewBox="0 0 ${W + 4} ${H + 4}" aria-hidden="true"><path d="M2 ${H + 2}V${Math.round(H * 0.45)}Q${2 + W / 2} 1 ${2 + W} ${Math.round(H * 0.45)}V${H + 2}Z"/><rect class="ceinture" x="2" y="${H - 6}" width="${W}" height="2.5"/></svg><b>${cal}</b><span>PRÊT</span><i class="touche" aria-hidden="true">${k + 1}</i><u><s></s></u>`;
  }
  b.onclick = () => ordreBouton(cal);
  b.oncontextmenu = e => { e.preventDefault(); choisirBatiment(BATIMENT_DE[cal]); montrerBatiment(BATIMENT_DE[cal]); };      // le clic droit : le bâtiment, pour l'améliorer
  return b;
});
$('batteries').append(...boutonsBarrage);
function majBoutonsBarrage() {
  if (!boutonsBarrage) return;
  $('batteries').hidden = nuit.etat === 'choix';      // la nuit, pas de barrage
  for (const b of boutonsBarrage) {
    const cal = b.dataset.cal, s = etatOrdre(cal), reste = resteBatterie(cal), pret = reste <= 0;
    b.querySelector('span').textContent = s.texte;
    const flotte = b.querySelector('em'); if (flotte) flotte.textContent = s.compte;
    // une barre se remplit pendant le chargement (le bouton est muet : grisé, sans survol, il refuse le clic), puis « PRÊT » (Jérôme, v0.73.0)
    b.querySelector('s').style.width = `${Math.round(100 * (1 - Math.max(0, Math.min(1, reste / rechargeDe(cal)))))}%`;
    b.title = s.titre;
    b.classList.toggle('vise', s.vise); b.classList.toggle('recharge', !pret); b.classList.toggle('muet', s.muet && !s.vise);
    b.setAttribute('aria-disabled', s.muet && !s.vise ? 'true' : 'false');
    if (b.dataset.pret === '0' && pret && !refusOrdre(B.etat, MOI, cal)) { b.classList.remove('vient'); void b.offsetWidth; b.classList.add('vient'); }      // l'éclair d'un instant (coupé si le système demande moins de mouvement)
    b.dataset.pret = pret ? '1' : '0';
  }
}
// Le camp (Jérôme, v0.87.0) : les bâtiments se choisissent au clic dans le champ, sur l'un des boutons de batterie fermés (ou clic droit), ou par la touche B ; leur papier porte les ordres et l'amélioration
leCamp = creerCampHud({
  moi: () => MOI, deployer: ralliee => { const p = peutDeployer(B, MOI, ralliee); if (!p.ok) { dire(p); return; } if (reseau) { reseau.ls.commander({ t: 'renfort', ralliee }); return; } const r = deployer(B, MOI, ralliee); if (r.ok) { toast(`${r.mode === 'contre' ? 'Contre-attaque' : 'Renfort'} : ${r.ou}, ${r.n} hommes.`); sauvegarder(); } majHud(); },
  bouton: $('camp-btn'), papier: $('batiment'), aller: () => versLeCamp(), reste: cal => resteBatterie(cal), affecter: reg => { if (reseau) { reseau.ls.commander({ t: 'hop', reg }); return; } const r = dire(affecterGueris(B.etat, MOI, reg)); if (r.ok) { toast(reg === null ? 'Les guéris reprendront leur place.' : `Les guéris repartiront au ${B.etat.regiments[reg].nom}.`); sauvegarder(); } majHud(); }, centrer: (x, y) => { centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: x, z1: y, t: mouvementReduit ? 1 : 0 }; },
  choisirAvion: id => choisirAvion(id),
  choisirChar: id => choisirChar(id),      // (le parc : un char déployé se choisit et la vue y va, v0.115.0)
  reparerAvion: () => { const m = B.etat.marges; if (dire(lancerBarrage(GENIE, m.x + 10, m.y + 10, REPARE_AVION, 0)).ok) { toast('Le génie part remettre un avion en état.'); sauvegarder(); } majHud(); },
  ameliorer: (k, choix) => {
    if (reseau) { const m = refusCamp(B.etat, k, choix, MOI); if (m) dire({ refus: m }); else reseau.ls.commander({ t: 'bat', cle: k, choix }); return; }      // à deux, l'ordre part aux deux machines (executerCmd)
    const r = dire(ordonnerChantier(B.etat, k, choix)); if (r.ok) { toast(`${BATIMENTS[k].nom} : chantier lancé, fini à l'aube.`); sauvegarder(); } majHud();
  },
});
// choisi par un bouton, un bâtiment peut être hors de l'écran (ou pas encore bâti) : la caméra glisse jusqu'à lui
function montrerBatiment(k) {
  const e = emplacementCamp(B.etat, k, MOI), [sx, sy] = rendu.versEcran(e.x, e.y, rendu.hauteurSol(e.x, e.y));
  const cv = $('canvas');
  if (sx > 60 && sx < cv.clientWidth - 60 && sy > 160 && sy < cv.clientHeight - 80) return;
  centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: e.x, z1: e.y, t: mouvementReduit ? 1 : 0 };
}
function choisirBatiment(k) {
  if (k && !campDe(B.etat, MOI)?.bride) return;
  if (k) { charChoisi = null; modeChar = null; modeBarrage = null; departAvion = null; modeMarche = false; }
  leCamp.choisirCle(k); rendu.camp.choisir(k, MOI); majHud();
}
// la touche B : la caméra glisse jusqu'au camp, et revient où elle était à la seconde pression
let avantCamp = null;
function versLeCamp() {
  if (!campDe(B.etat, MOI)?.bride) return toast('Pas de camp dans cette partie.', 'refus');
  // le milieu du camp, et le zoom qui le montre en entier (le plus fort où sa largeur tient dans 92 % de l'écran : v0.96.0, « la caméra n'intègre pas bien les bâtiments »)
  const E = etendueCamp(B.etat, MOI), x0 = E.x0, x1 = E.x1, cx = (E.x0 + E.x1) / 2, cy = (E.y0 + E.y1) / 2;      // (les cinq emplacements : le camp se cadre en entier, bâti ou non)
  const ici = Math.hypot(rendu.vue.cx - cx, rendu.vue.cz - cy) < 40;
  const but = ici && avantCamp ? avantCamp : { x: cx, y: cy };
  if (ici && avantCamp) rendu.vue.zoom = avantCamp.zoom;
  else { avantCamp = { x: rendu.vue.cx, y: rendu.vue.cz, zoom: rendu.vue.zoom }; let z = 0; while (z + 1 < ZOOMS_CADRAGE && ZOOMS[z + 1] * (x1 - x0) <= rendu.vue.vw * 0.92) z++; rendu.vue.zoom = z; }
  if (ici) avantCamp = null;
  centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: but.x, z1: but.y, t: mouvementReduit ? 1 : 0 };
}
function viser(cal) {
  if (!B) return;
  const ferme = refusOrdre(B.etat, MOI, cal);
  if (ferme) return dire({ refus: ferme });
  if (B.etat.phase !== 'jour') return dire({ refus: 'Pas de barrage la nuit.' });
  if (modeBarrage !== cal && resteBatterie(cal) > 0) return dire({ refus: `${NOMS_BATTERIES[cal] ?? `Batterie de ${cal}`} : encore ${resteBatterie(cal)} s à charger.` });
  if (cal === AVION && MITRAILLAGE.cloue.includes(B.etat.meteo[B.etat.jour - 1])) return dire({ refus: `Par ${METEO[B.etat.meteo[B.etat.jour - 1]].nom}, les avions restent au sol.` });      // muet par brouillard (v0.99.8)
  if (cal === AVION && modeBarrage !== AVION && !avionsRestants(B.etat, MOI)) return dire({ refus: 'Plus un avion : l\'escadrille est détruite.' });
  modeBarrage = modeBarrage === cal ? null : cal; departAvion = null; if (modeBarrage) modeMarche = false;
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
  const [k, v] = Object.entries(b.dataset).find(([n]) => n !== 'info' && n !== 'titre') || [], hote = b.closest('[id]');
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
// Le gros plan d'un secteur (Jérôme, v0.76.0 ; v0.100.0 : « un clic sur C2 cadre la vue 3D sur ce seul secteur ET la carte n'affiche plus que lui ») : la carte est remplacée par son plan, et la caméra
// glisse au milieu des hommes du secteur avec le zoom le plus fort qui en montre toute la largeur (92 % de l'image : comme `versLeCamp`) ; le reste du front sort du champ, et la caméra, bornée par le
// moteur, ne sort jamais du terrain. Le retour (« Vue d'ensemble », Échap, un second clic sur la même lettre) rend la vue d'avant : zoom et place.
let avantDetail = null;
function detailSecteur(s, idx) {
  const o = leDetail.ouvert;
  if (o && o.s === s && o.idx === idx) return leDetail.fermer();         // la case déjà montrée : un second clic revient à la vue d'ensemble
  if (!avantDetail) avantDetail = { zoom: rendu.vue.zoom, cx: rendu.vue.cx, cz: rendu.vue.cz };
  leDetail.montrer(s, idx);
  const c = caseDe(B, s, idx, MOI), w = c.x1 - c.x0;
  let z = 0; while (z + 1 < ZOOMS_CADRAGE && ZOOMS[z + 1] * w <= rendu.vue.vw * 0.92) z++;
  rendu.vue.zoom = z;
  centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: (c.x0 + c.x1) / 2, z1: c.yc, t: mouvementReduit ? 1 : 0 };
}
// la vue d'avant le gros plan (le zoom tout de suite, la place en glissant)
function retourDuDetail() {
  if (!avantDetail) return;
  rendu.vue.zoom = avantDetail.zoom;
  centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: avantDetail.cx, z1: avantDetail.cz, t: mouvementReduit ? 1 : 0 };
  avantDetail = null;
}
// Un nom du carnet cliqué (Jérôme, v0.100.0) : la vue glisse jusqu'au régiment, au tronçon (qui clignote) ou à l'homme (dont la fiche s'ouvre)
function allerA(l) {
  if (!B) return;
  const vers = (x, y) => { centrage = { x0: rendu.vue.cx, z0: rendu.vue.cz, x1: x, z1: y, t: mouvementReduit ? 1 : 0 }; };
  if (l.reg !== undefined) centrerSur(l.reg);
  else if (l.troncon !== undefined) {
    const tr = B.troncons[l.troncon];
    if (tr) { vers((tr.x0 + tr.x1) / 2, y0En(B.lignes[tr.ligne], (tr.x0 + tr.x1) / 2)); rendu.clignoter([l.troncon]); }
  } else if (l.soldat !== undefined) {
    const A = B.armee; let i = -1;
    for (let k = 0; k < A.n; k++) if (A.id[k] === l.soldat) { i = k; break; }
    if (i >= 0) vers(A.x[i], A.y[i]);
    montrerSoldat(l.soldat);
  }
  majHud();
}
function centreDe(id) {
  const p = placeDe(B, id);          // le plus gros amas : un régiment scindé se cherche là où il est le plus nombreux (hud : amas.js)
  return p ? { x: p.x, y: p.y } : null;
}
// l'emprise (en pixels) du plus gros amas d'un régiment : les équerres se referment sur lui, comme la caméra y va
function empriseDe(id) {
  const p = placeDe(B, id);
  if (!p) return null;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [tx, ty] of [[p.x0, p.y0], [p.x1, p.y0], [p.x0, p.y1], [p.x1, p.y1]]) {
    const [sx, sy] = rendu.versEcran(tx, ty);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return { x0, x1, y0, y1 };
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
// La fenêtre d'un bâtiment, posée au-dessus de lui (v0.96.0) : le point le plus haut de son emprise à l'écran, la fenêtre centrée dessus, sa base 12 px plus haut ; elle se relève d'un coup à l'ouverture, comme celle d'un régiment
let batimentVu = null;
function placerBatiment() {
  const pan = $('batiment'), k = leCamp?.choisi();
  if (!B || !k || pan.hidden) { batimentVu = null; return; }
  const e = emplacementCamp(B.etat, k, MOI);      // (son emplacement, qu'il soit bâti ou non : un bâtiment à bâtir se choisit par sa pastille)
  let sx = 0, sy = Infinity, n = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = e.x + ox * e.w / 2, py = e.y + oy * e.d / 2, [x, y] = rendu.versEcran(px, py, rendu.hauteurSol(px, py) + 6);
    if (x < -1e4) continue;
    sx += x; n++; sy = Math.min(sy, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  // la fenêtre suit son bâtiment (Jérôme, v0.100.0) : si la base n'est plus à l'écran (on a glissé la vue ailleurs), la fenêtre disparaît au lieu de rester collée au bord ; elle revient avec la base
  const dansLEcran = n > 0 && x1 > 0 && x0 < innerWidth && y1 > 0 && y0 < innerHeight;
  pan.style.visibility = dansLEcran ? '' : 'hidden';
  if (!dansLEcran) { batimentVu = null; return; }
  const w = pan.offsetWidth, h = pan.offsetHeight;
  pan.style.translate = `${Math.round(Math.max(8, Math.min(sx / n - w / 2, innerWidth - w - 8)))}px ${Math.round(Math.max(8, Math.min(sy - h - 12, innerHeight - h - 8)))}px`;
  if (batimentVu !== k && !mouvementReduit) pan.animate([{ transform: 'perspective(500px) rotateX(88deg)', opacity: .4 }, { transform: 'perspective(500px) rotateX(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)' });
  batimentVu = k;
}
function placerFenetre() {
  const pan = $('reg-ouvert');
  if (pan.hidden || !B) return;
  const carte = [...$('reg-rang').children].find(c => +c.dataset.id === +pan.dataset.id);
  if (!carte) { pan.hidden = true; return; }
  const r = carte.getBoundingClientRect(), w = pan.offsetWidth, h = pan.offsetHeight;
  pan.style.translate = `${Math.round(Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8))) + decalageFenetre.x}px ${Math.round(r.top - h - 8) + decalageFenetre.y}px`;
}

// Les noms de nos régiments, au-dessus d'eux : un cartouche (v0.41.3) : le numéro en carré (orange : ébranlé, rouge : en déroute), le nom et le secteur, le statut, la barre debout / blessés
const etiq = new Map();
function etiquettes() {
  $('etiquettes').replaceChildren();
  etiq.clear(); etiqIsoles.length = 0;
  for (const r of B.etat.regiments) {
    if (r.camp !== MOI) continue;
    const d = document.createElement('div');
    d.className = 'etiquette'; d.dataset.id = r.id;
    d.innerHTML = '<b class="num"></b><span class="cart-corps"><span class="nom"></span><span class="statut"></span><span class="barre"><i class="debout"></i><i class="blesses"></i></span></span>';
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
// les isolés d'un régiment (un amas à part du gros, v0.116.1) ont leur propre petit nom, au-dessus d'eux : « 3 · 12 isolés »
const etiqIsoles = [];
function etiquetteIsolee(k) {
  let e = etiqIsoles[k];
  if (!e) {
    const d = document.createElement('div');
    d.className = 'etiquette isole';
    d.innerHTML = '<b class="num"></b><span class="cart-corps"><span class="nom"></span></span>';
    $('etiquettes').append(d);
    e = etiqIsoles[k] = { d, num: d.querySelector('.num'), nom: d.querySelector('.nom'), cle: '' };
  }
  return e;
}
function majEtiquettes() {
  // (un régiment frais est arrivé à l'aube : son nom au-dessus de lui aussi)
  if (etiq.size !== B.etat.regiments.filter(r => r.camp === MOI).length) etiquettes();
  centres.clear();
  const groupes = amasDe(B, { camp: MOI });
  for (const [id, g] of groupes) centres.set(id, g.amas[0]);
  for (const [id, e] of etiq) {
    const d = e.d, g = groupes.get(id), c = g && g.amas[0];
    if (!c) { d.hidden = true; continue; }
    const [sx, sy] = rendu.versEcran(c.x, c.ymin - 2);
    // hors de l'écran : caché (sinon il dépasse, et l'audit d'écran le voit amputé)
    d.hidden = sx < 30 || sy < 20 || sx > innerWidth - 30 || sy > innerHeight;
    if (d.hidden) continue;
    d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    d.classList.toggle('choisi', choisis.has(id));
    // « 3 | Viride · B », puis « Tient », ou le moral quand il baisse, ou la corvée de la nuit ; la barre : debout, blessés (tous ses hommes, où qu'ils soient)
    const reg = B.etat.regiments[id], niv = lecture.niveauMoral(reg, R);
    const statut = niv === 'deroute' ? 'En déroute' : niv === 'ebranle' ? 'Ébranlé' : nuit.etat === 'choix' && nuit.corvees[id] ? corveeCourte(nuit.corvees[id]) : lecture.statutOrdre(B, reg);
    const debout = Math.max(0, g.n - g.bl), cle = `${numeroDe(reg)}|${reg.nom}|${secteursDe(B, reg)}|${statut}|${niv}|${debout}|${g.bl}`;
    if (cle === e.cle) continue;
    e.cle = cle;
    d.classList.toggle('ebranle', niv === 'ebranle'); d.classList.toggle('deroute', niv === 'deroute');
    e.num.textContent = numeroDe(reg); e.nom.textContent = `${reg.nom} · ${secteursDe(B, reg)}`; e.statut.textContent = statut;
    e.debout.style.width = `${(debout / reg.initial * 100).toFixed(1)}%`; e.blesses.style.width = `${(g.bl / reg.initial * 100).toFixed(1)}%`;
    d.setAttribute('aria-label', `${numeroDe(reg)} · ${reg.nom} : ${statut.toLowerCase()}, ${debout} debout, ${g.bl} blessés`);
  }
  // les isolés : un petit nom par amas à part ; un clic le choisit comme le nom du régiment (`$('etiquettes').onclick`)
  let k = 0;
  for (const [id, g] of groupes) {
    if (!etiq.has(id)) continue;
    for (const a of isoles(g)) {
      const e = etiquetteIsolee(k++), d = e.d, reg = B.etat.regiments[id];
      const [sx, sy] = rendu.versEcran(a.x, a.ymin - 2);
      d.hidden = sx < 30 || sy < 20 || sx > innerWidth - 30 || sy > innerHeight;
      if (d.hidden) continue;
      d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      d.dataset.id = id;
      d.classList.toggle('choisi', choisis.has(id));
      const cle = `${numeroDe(reg)}|${a.n}`;
      if (cle === e.cle) continue;
      e.cle = cle;
      e.num.textContent = numeroDe(reg); e.nom.textContent = `${a.n} isolés`;
      d.setAttribute('aria-label', `${numeroDe(reg)} · ${reg.nom} : ${a.n} hommes isolés du reste du régiment`);
    }
  }
  for (; k < etiqIsoles.length; k++) etiqIsoles[k].d.hidden = true;
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
// La passe d'un avion (Jérôme, v0.56.0) : avant le premier clic, un point ; ensuite la bande de A au curseur posée sur le sol, la route de l'avion (son entrée et sa sortie, hors de la carte)
// en pointillé, une flèche au bout, et ce qu'elle coûte : les hommes de la bande (ennemis, les nôtres) et les points de vie que l'avion y laisserait
let apercuAvion = { cle: '', quand: 0, val: null };
const apercuDe = l => {
  const cle = `${l.x1},${l.y1},${l.x2},${l.y2}`, t = performance.now();
  if (!apercuAvion.val || t - apercuAvion.quand > 700 || (apercuAvion.cle !== cle && t - apercuAvion.quand > 100)) apercuAvion = { cle, quand: t, val: apercuVol(B, MOI, l) };
  return apercuAvion.val;
};
function viseeAvion(x, y) {
  const E = (px, py) => rendu.versEcran(px, py), F = ([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`;
  const note = (px, py, t) => { const g = px > innerWidth - 330; return `<text x="${(px + (g ? -12 : 12)).toFixed(1)}" y="${(py - 10).toFixed(1)}"${g ? ' text-anchor="end"' : ''}>${t}</text>`; };
  const svg = $('visee');
  if (!departAvion) { const [cx, cy] = E(x, y); return `<circle class="pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3"/>${note(cx, cy, 'Début de la passe')}`; }
  const l = ligneDe(MOI, departAvion.x, departAvion.y, x, y, MITRAILLAGE.longueurMax * modif(B.etat, MOI, 'aerodrome.longueur')), [ax, ay] = E(departAvion.x, departAvion.y), [cx, cy] = E(x, y);
  if (l.refus) { svg.classList.add('refus'); return `<path class="anneau" d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${cx.toFixed(1)} ${cy.toFixed(1)}"/><circle class="pt" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3"/>${note(cx, cy, l.refus)}`; }
  const hw = MITRAILLAGE.largeur / 2, nx = -l.uy * hw, ny = l.ux * hw, ap = apercuDe(l);
  const bande = 'M' + [[l.x1 + nx, l.y1 + ny], [l.x2 + nx, l.y2 + ny], [l.x2 - nx, l.y2 - ny], [l.x1 - nx, l.y1 - ny]].map(([px, py]) => F(E(px, py))).join('L') + 'Z';
  const route = `M${F(E(ap.vol.ex, ap.vol.ey))}L${F(E(ap.vol.fx, ap.vol.fy))}`;
  const [bx, by] = E(l.x2, l.y2), [tx, ty] = E(l.x2 - l.ux * 6 + nx, l.y2 - l.uy * 6 + ny), [ux, uy] = E(l.x2 - l.ux * 6 - nx, l.y2 - l.uy * 6 - ny);
  const dit = `${ap.eux} d'en face · ${ap.nous} des nôtres · avion −${Math.round(ap.pertes)} pv`;
  return `<path class="route" d="${route}"/><path class="ombre" d="${bande}"/><path class="zone" d="${bande}"/><path class="pointe" d="M${tx.toFixed(1)} ${ty.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}L${ux.toFixed(1)} ${uy.toFixed(1)}"/><circle class="pt" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3"/>${note(cx, cy, dit)}`;
}
// La route d'un char (v0.47.0 ; v0.59.3 : son vrai chemin, détour par les ponts compris, et l'engin à son point de départ, derrière notre dernière ligne) : un trait pointillé de ce départ à l'objectif
// où l'engin se pose ; la recherche coûte ~50 ms : on la refait quand le point visé change de 2 m, et pas plus d'une fois tous les 120 ms
let routeVisee = { cle: '', pts: null, t: 0 };
function viseeChar(x, y) {
  const a = arriereDe(B), y0 = a ? a[MOI] : y, cle = `${Math.round(x / 2)},${Math.round(y / 2)},${Math.floor(B.etat.temps / 4)}`, t = performance.now();
  if (routeVisee.cle !== cle && t - routeVisee.t > 120) routeVisee = { cle, pts: a ? routeChar(B, x, y0, x, y) : null, t };
  const pts = [[x, y0], ...(routeVisee.pts ?? [[x, y]])], E = (px, py) => rendu.versEcran(px, py).map(v => v.toFixed(1)).join(' ');
  // l'engin vu de dessus (6 m sur 2,1) posé en (cx, cy), le nez dans la direction (ux, uy)
  const L = CHARS[CHAR_PAR_DEFAUT].longueur / 2, Lg = 1.05, boite = (cx, cy, ux, uy) => {
    const c = (u, v) => E(cx + ux * u - uy * v, cy + uy * u + ux * v);
    return `M${c(-L, -Lg)}L${c(L - 0.7, -Lg)}L${c(L, 0)}L${c(L - 0.7, Lg)}L${c(-L, Lg)}Z`;
  };
  const dir = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / d, (q[1] - p[1]) / d]; };
  const [ux, uy] = dir(pts[0], pts[1] ?? pts[0]), [vx, vy] = dir(pts[Math.max(0, pts.length - 2)], pts[pts.length - 1]);
  const depart = boite(pts[0][0], pts[0][1], ux, uy), arrivee = boite(x, y, vx, vy), route = 'M' + pts.map(([px, py]) => E(px, py)).join('L');
  const [cx, cy] = rendu.versEcran(x, y);
  return `<path class="anneau" d="${route}"/><path class="ombre" d="${depart}"/><path class="zone" d="${depart}"/><path class="ombre" d="${arrivee}"/><path class="zone" d="${arrivee}"/><circle class="pt" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2"/>`;
}
// La visée (v0.21.0) : de chaque régiment choisi au curseur une ligne, une croix au bout ; l'ordre à sec (`peutOrdonner`) dit ce qu'il occuperait
function majVisee() {
  const svg = $('visee');
  // Le barrage qu'on vise : le cercle du souffle du calibre, posé sur le sol (Jérôme, v0.32.3 : la variante D, « cibles concentriques », du sujet « Visée d'un obus » du labo)
  if (modeBarrage && enJeu() && B.etat.phase === 'jour' && !nuit.etat && souris && !glisse && !document.querySelector('dialog[open]')) {
    const [x, y] = rendu.versTerrain(souris.x, souris.y);
    rendu.surligner(null); svg.classList.remove('refus');
    svg.innerHTML = x > -1e4 ? (modeBarrage === AVION ? viseeAvion(x, y) : modeBarrage === CHAR ? viseeChar(x, y) : modeBarrage === GENIE ? viseeObus(x, y, 4) : viseeObus(x, y, CALIBRES[modeBarrage].rayon)) : ''; svg.removeAttribute('hidden');
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
  // le chemin que suivrait chaque régiment (le champ de coûts : il contourne l'eau, passe par les ponts), en pointillés, jusqu'au curseur (Jérôme, v0.47.2) ; sans chemin, la ligne droite d'avant
  const chemins = new Map((plan.chemins || []).map(c => [c.reg, c]));
  const piste = pts => { const q = pts.map(([px, py]) => rendu.versEcran(px, py)).filter(([sx]) => sx > -1e4).map(([sx, sy]) => `${Math.round(sx)},${Math.round(sy)}`).join(' '); return `<polyline class="fond" points="${q}"/><polyline class="encre" points="${q}"/>`; };
  for (const id of choisis) {
    const c = centres.get(id); if (!c) continue;
    const ch = chemins.get(id);
    if (ch && ch.pts.length > 1) d += piste(ch.atteint ? [...ch.pts, [x, y]] : ch.pts);
    else { const [sx, sy] = rendu.versEcran(c.x, c.y); d += trait(Math.round(sx), Math.round(sy), souris.x, souris.y); }
    // et le chemin de chaque amas isolé : il part d'où ses hommes sont, pas d'où est le gros
    for (const o of ch?.autres || []) if (o.pts.length > 1) d += piste(o.atteint ? [...o.pts, [x, y]] : o.pts);
  }
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
  // deux lignes, toujours (Jérôme, v0.100.0 : « les lignes longues sont coupées », « boue 35 % : de quoi ? ») : la première dit ce qu'est le lieu, la seconde son état ; chaque pourcentage porte son libellé
  // (« Marche 35 % » : la vitesse de marche, 100 % sur sol sec ; « Solidité » : ce qui reste de la tranchée) ; sur une tranchée, la première ligne a le nom et « Hommes » (la ligne de vie : nous, en face)
  const el = (classe, html, texte) => { const e = document.createElement('span'); e.className = classe; if (texte !== undefined) e.textContent = texte; else e.innerHTML = html; return e; };
  const rang = (...fils) => { const d = document.createElement('div'); d.className = 'l'; d.append(...fils); return d; };
  let cle, rendu;
  if (r.troncon >= 0) {
    const f = forcesTroncons(B), a = f[r.troncon * 2 + MOI], b = f[r.troncon * 2 + 1 - MOI], tot = a + b;
    // sa solidité (Jérôme, v0.84.0 : une barre de vie pour la tranchée) : ce qui reste de sa forme creusée, en trois mots (Intacte, Abîmée, Bouleversée) ; l'orange et le rouge confirment seulement
    const sol = Math.round(r.solidite * 100), mot = etatTranchee(r.solidite), niveau = mot === 'Intacte' ? '' : mot === 'Abîmée' ? ' abimee' : ' bouleversee';
    cle = `T|${r.tranchee}|${a}|${b}|${sol}`;
    rendu = () => p.replaceChildren(
      rang(el('nom', '', `Tranchée ${r.tranchee}`), el('vit vie', `<span class="lib">Hommes</span><span>${a}</span><i class="plein"><b style="width:${tot ? a / tot * 100 : 0}%;background:var(--jeu-nous)"></b><b style="width:${tot ? b / tot * 100 : 0}%;background:var(--jeu-eux)"></b></i><span>${b}</span>`)),
      rang(el('nom', '', `Solidité : ${mot}`), el(`vit sol${niveau}`, `<i class="plein"><b style="width:${sol}%"></b></i><span>${sol} %</span>`)));
  } else {
    const type = r.relief.join(' · ') || r.objets.slice(0, 2).join(' · ') || 'Terrain ouvert', etat = [r.sol, ...(r.relief.length ? r.objets.slice(0, 1) : r.objets.slice(2, 3))].filter(Boolean).join(' · ');
    cle = `${type}|${etat}|${r.vitesse}`;
    rendu = () => {
      const pc = Math.round(r.vitesse * 100);
      p.replaceChildren(rang(el('nom', '', type)), rang(el('nom', '', etat), el('vit', `<span class="lib">Marche</span><i class="plein"><b style="width:${pc}%"></b></i><span>${pc} %</span>`)));
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
// La visée d'un nid (Jérôme, v0.83.1) : sous la souris, le cône où sa mitrailleuse tire (portée, ±demiCone rad en avant), posé sur le sol ; une croix sur les hommes d'en face qu'il tient sous son feu ;
// « se tait » quand son tronçon est pris. Le dessin seulement (le calcul est celui de `avancerNids`).
function majViseeNid(x, y) {
  const svg = $('visee-nid');
  const survole = x === null ? null : B.etat.nids.find(k => k.etat === 'actif' && Math.abs(k.x - x) < 3 && Math.abs(k.y - y) < 3);
  const n = survole ?? (nidChoisi !== null ? B.etat.nids.find(k => k.id === nidChoisi && k.etat === 'actif') : null);      // (lot E : le poste choisi garde son cône à l'écran)
  if (!n) { if (!svg.hasAttribute('hidden')) { svg.setAttribute('hidden', ''); svg.innerHTML = ''; } return null; }
  const E = (px, py) => rendu.versEcran(px, py), F = ([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`, pts = [E(n.x, n.y)], c2 = Math.cos(NIDS.demiCone), A = B.armee;
  const ax = n.ax ?? 0, ay = n.ay ?? n.face;       // l'axe du cône : face à l'ennemi, ou tourné par le joueur
  for (let k = 0; k <= 16; k++) { const a = (k / 8 - 1) * NIDS.demiCone, co = Math.cos(a), si = Math.sin(a); pts.push(E(n.x + (ax * co - ay * si) * NIDS.portee, n.y + (ax * si + ay * co) * NIDS.portee)); }
  let croix = '', sous = 0;
  for (let i = 0; i < A.n && sous < 400; i++) {
    if (A.mort[i] || A.camp[i] === n.camp) continue;
    const dx = A.x[i] - n.x, dy = A.y[i] - n.y, d = Math.hypot(dx, dy);
    if (d >= NIDS.portee || d < 2 || (dx * ax + dy * ay) / d < c2) continue;
    sous++; const [px, py] = E(A.x[i], A.y[i]); croix += `M${(px - 5).toFixed(1)} ${(py - 5).toFixed(1)}l10 10m0 -10l-10 10`;
  }
  const tait = B.etat.troncons[n.troncon] !== n.camp, [nx, ny] = E(n.x + ax * NIDS.portee, n.y + ay * NIDS.portee);
  svg.innerHTML = `<path class="ombre" d="M${pts.map(F).join('L')}Z"/><path class="zone" d="M${pts.map(F).join('L')}Z"/><g class="croix"><path class="fond" d="${croix}"/><path class="encre" d="${croix}"/></g>`
    + `<text x="${nx.toFixed(1)}" y="${(ny + (ay > 0 ? 16 : -8)).toFixed(1)}" text-anchor="middle">${tait ? 'Se tait : son tronçon est pris' : `${sous} d'en face sous son feu`}</text>`;
  svg.removeAttribute('hidden');
  return survole ?? null;
}
function majBulle() {
  const bulle = $('bulle');
  if (!souris || !enJeu() || glisse || document.querySelector('dialog[open]')) { bulle.hidden = true; majTerrain(null); appliquerSurvol(-1, -1); majViseeNid(null); return; }
  const [x, y] = rendu.versTerrain(souris.x, souris.y);
  majTerrain(x, y);
  const nid = majViseeNid(modeBarrage || nuit.etat ? null : x, y);          // un nid sous la souris passe avant le régiment qui l'entoure
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
    const r = nid ? -1 : regimentSous(x, y, Math.max(4, prise(16)));
    if (nid) lignes = ['Un nid de mitrailleuse', `Solidité ${Math.round(nid.pv / NIDS.pv * 100)} %`, `Munitions ${Math.round(nid.muni / NIDS.munitions * 100)} %`, `Tire à ${NIDS.portee} m devant lui`];
    else if (r >= 0) { regSous = r; const reg = B.etat.regiments[r]; lignes = [nomDe(reg), enMots(bilan(reg)), majuscule(moralEnMots(reg, R)), refuseAujourdhui(reg), reg.equip?.length ? `Équipé : ${equipeEnMots(reg)}` : ''].filter(Boolean); }
  }
  const T = B.terrain, cc = Math.floor(y) * T.W + Math.floor(x);
  // un pont sous le pointeur (Jérôme, v0.67.0) : son nom, sa solidité en barre, son histoire (debout ou coupé)
  let pv = null;
  if (!lignes && regSous < 0 && T.pontsListe.length) {
    const k = pontEn(T, x, y, Math.max(1, prise(8))), P = k >= 0 ? T.pontsListe[k] : null;
    if (P) {
      pv = P.pv / P.pvMax;
      const hist = [P.coupures ? `Coupé ${P.coupures} fois` : 'Jamais coupé', P.reparations ? `refait ${P.reparations} fois` : null].filter(Boolean).join(', ');
      lignes = [P.nom, `${PONTS_JEU[typePont(P.type)].nom}${PONTS_JEU[typePont(P.type)].char ? ', porte un char' : ''}`, P.detruit ? 'Coupé : le génie peut le refaire' : `Solidité ${Math.ceil(P.pv)} / ${P.pvMax}`, hist];
    }
  }
  appliquerSurvol(regSous, x >= 0 && y >= 0 && x < T.W && y < T.H && T.troncon ? T.troncon[cc] : -1);
  if (!lignes) { bulle.hidden = true; return; }
  const cle = lignes.join('\n') + (pv === null ? '' : `|${pv}`);
  if (bulle.dataset.cle !== cle) {
    bulle.dataset.cle = cle;
    const barre = pv === null ? [] : [Object.assign(document.createElement('i'), { className: 'barre-pont', innerHTML: `<b style="width:${Math.round(pv * 100)}%"></b>` })];
    bulle.replaceChildren(...lignes.map((t, k) => Object.assign(document.createElement('p'), { textContent: t, className: k ? 'discret' : '' })), ...barre);
    if (barre.length) bulle.children[2].after(barre[0]);          // (la barre sous la ligne de solidité)
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
  noter(regs.length > 2 ? `${regs.length} régiments : ${STANCES[stance].court}.` : regs.map(g => `${g.nom} : ${STANCES[stance].court}`).join(' ; ') + '.', { liens: regs.length > 2 ? [] : regs.map(lienReg) });
}
function donnerStance(stance) {
  if (!choisis.size) return;
  const r = dire(lancerStance([...choisis], stance));
  if (r.ok && !reseau) { noterStance(r.regiments, stance); sauvegarder(); regimentsVus = ''; majHud(); }
}
// Annuler, du plus récent au plus ancien : le barrage visé, « Marcher », la fiche, les régiments choisis (clic droit, Échap)
function annuler() {
  if (leSuivi.actif) { leSuivi.liberer(); majHud(); return; }      // Échap, le clic droit : d'abord rendre la vue (v0.121.0)
  if (leDetail.ouvert !== null && !departAvion && !modeBarrage && !modeMarche && !modeChar) leDetail.fermer();        // Échap : d'abord revenir à la vue d'ensemble
  else if (departAvion) departAvion = null;       // le premier point d'une passe d'avion, avant le barrage lui-même
  else if (modeBarrage) modeBarrage = null;
  else if (modeMarche) modeMarche = false;
  else if (modeChar) modeChar = null;
  else if (modeNid) modeNid = null;
  else if (nidChoisi !== null) nidChoisi = null;
  else if (leCamp.choisi()) { leCamp.choisirCle(null); rendu.camp.choisir(null); }
  else if (charChoisi !== null) charChoisi = null;
  else if (avionChoisi !== null) avionChoisi = null;
  else if (laFiche.ouverte) fermerFiche();
  else if (choisis.size) { choisis = new Set(); rendu.choisis = choisis; }
  majHud();
}

// ─── Commandes : clavier, souris (section 8) ───────────────────────────────
function choisirTout() {
  choisis = new Set(B.etat.regiments.filter(r => r.camp === MOI && r.effectif).map(r => r.id));
  rendu.choisis = choisis; majHud();
}
// I : la fiche de ce qui est sous le pointeur, un des nôtres compris (Jérôme, v0.47.2 : « comment voir la fiche d'un seul de nos soldats ? » : le clic choisit son régiment) ; de près, l'homme ; de loin, son régiment
function ficheSous() {
  if (!souris || !B) return;
  const [x, y] = rendu.versTerrain(souris.x, souris.y);
  if (dePres()) {
    const i = hommeSous(souris.x, souris.y), mort = i < 0 ? corpsSous(x, y, Math.max(1, prise(10))) : -1;
    if (i >= 0) montrerFiche(i); else if (mort >= 0) montrerSoldat(mort); else toast('Pas d\'homme sous le pointeur.');
  } else { const r = regimentSous(x, y, Math.max(4, prise(16))); if (r >= 0) montrerRegiment(r); else toast('Pas de régiment sous le pointeur.'); }
  majHud();
}
const STANCES_TOUCHES = ['volonte', 'retenu'];       // Maj+1, Maj+2 (touches physiques, comme les barrages)
const keys = createKeys({
  actions: {
    menu: 'Escape', pause: ' ', tout: 't', centrer: 'c', camp: 'b', fiche: 'i', plus: ['+', '=', 'NumpadAdd'], moins: ['-', 'NumpadSubtract'],
    b1: 'Digit1', b2: 'Digit2', b3: 'Digit3', b4: 'Digit4', b5: 'Digit5', b6: 'Digit6',
  },
  onAction: (nom, e) => {
    if (!enJeu()) return;
    if (e?.shiftKey && (nom === 'b1' || nom === 'b2' || nom === 'b3')) { if (nom !== 'b3') donnerStance(STANCES_TOUCHES[Number(nom[1]) - 1]); return; }   // Maj+chiffre : la posture, jamais le barrage
    if (nom === 'menu') {
      // Échap ferme la fenêtre ouverte, rien d'autre (v0.108.0 : la modale du « ? » fermait aussi le gros plan derrière elle) ; `keys` a retenu la touche, le navigateur ne ferme plus la fenêtre de lui-même : l'événement `cancel` y est rejoué
      const fenetre = document.querySelector('dialog[open]');
      if (fenetre) { fenetre.dispatchEvent(new Event('cancel', { cancelable: true })); fenetre.close(); return; }
      if (modeBarrage || modeMarche || laFiche.ouverte || choisis.size || leCamp.choisi() || leDetail.ouvert !== null || charChoisi !== null || avionChoisi !== null || leSuivi.actif) annuler(); else pause();
    }
    else if (nom === 'pause') basculerPause();
    else if (nom === 'tout') choisirTout();
    else if (nom === 'camp') versLeCamp();
    else if (nom === 'fiche') ficheSous();
    else if (nom === 'centrer') { rendu.placerCamera(MOI === EUX ? Math.PI + CAMERA.yaw : CAMERA.yaw, CAMERA.tangage); if (!reseau) { prefs.camera = null; store.save('prefs', prefs); } }
    else if (nom === 'plus') zoomer(1);
    else if (nom === 'moins') zoomer(-1);
    else if (nom[0] === 'b') viser(BATTERIES[Number(nom[1]) - 1]);
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
    if (modeBarrage === AVION) {      // deux clics (Jérôme, v0.56.0) : le début de la passe, puis sa fin
      if (!departAvion) { departAvion = { x, y }; return majHud(); }
      if (dire(lancerBarrage(AVION, departAvion.x, departAvion.y, x, y)).ok) { marque = { x: departAvion.x, y: departAvion.y, t: 2 }; modeBarrage = null; departAvion = null; sauvegarder(); choisirBatiment(null); }
      return majHud();
    }
    if (modeBarrage) {
      if (dire(lancerBarrage(modeBarrage, x, y)).ok) { marque = { x, y, t: 2 }; modeBarrage = null; sauvegarder(); choisirBatiment(null); }
      return majHud();
    }
    // un bâtiment du camp : un clic sur lui le choisit (il est dans la marge arrière, hors du champ d'ordres : aucun régiment n'y va)
    const bat = campDe(B.etat, MOI)?.bride ? batimentSous(B.etat, x, y, 1, MOI) : null;
    if (bat) return choisirBatiment(leCamp.choisi() === bat ? null : bat);
    if (leCamp.choisi()) choisirBatiment(null);      // un clic ailleurs referme la fenêtre du bâtiment (le clic, lui, sert)
    const jour = B.etat.phase === 'jour';
    if (modeMarche && jour) { modeMarche = false; ordreMarche(x, y); return majHud(); }
    // un poste de mitrailleuse à nous (lot E) : sans régiment choisi, un clic sur lui le choisit ; choisi, un clic sur le sol tourne son cône (deux clics en tout)
    if (!p.event.shiftKey && !choisis.size) {
      const k = nidSous(x, y);
      if (k >= 0 && k !== nidChoisi) return choisirNid(k);
      if (nidChoisi !== null && jour && k < 0) { modeNid = null; ordreNid(x, y); return majHud(); }
    }
    // un char à nous : un clic sur lui le choisit ; choisi, un clic sur le sol lui donne son ordre (v0.81.0)
    if (!p.event.shiftKey) {
      const k = charSous(x, y);
      if (k >= 0 && k !== charChoisi) return choisirChar(k);
      if (charChoisi !== null && jour) { const m = modeChar === 'cible' ? 'cible' : 'marche'; modeChar = null; ordreChar(m, x, y); return majHud(); }
    }
    // Le clic gauche choisit, puis ordonne : sur un de nos régiments (Maj : en ajouter ou en retirer), il le choisit ; ailleurs, avec des
    // régiments choisis, ils y marchent (sur une tranchée : l'occupent) et restent choisis. La nuit, on ne marche pas : on choisit pour les corvées.
    // (Jérôme, v0.35.0 : avec des régiments choisis, le clic ordonne même sur un régiment à nous, au lieu de le choisir ; pour changer de choix : sa carte,
    // son cercle, le cadre, T, ou Maj-clic sur lui)
    // (Jérôme, v0.48.1 : de près, un clic sur un de nos hommes ouvre sa fiche ; son régiment se choisit par sa carte, son nom, le cadre ou T)
    if (dePres() && !p.event.shiftKey) {
      const h = hommeSous(p.x, p.y);
      if (h >= 0 && B.armee.camp[h] === MOI) { montrerFiche(h); return majHud(); }
    }
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
  onDragStart: p => { centrage = null; leSuivi.liberer(); glisse = { bouton: p.button, x0: p.startX, y0: p.startY, cx: rendu.vue.cx, cz: rendu.vue.cz, ddx: p.dx, ddy: p.dy }; },
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
    if (reseau) {
      const joue = reseau.ls.cadre_(); ev = joue ? B.evenements : [];
      // l'autre machine traîne (3 s sans ses ordres) : on le dit une fois, au lieu de laisser le jeu sembler figé
      if (!joue && reseau.ls.attente === 90 && !reseau.attendu) { reseau.attendu = true; toast('En attente de l\'autre machine…'); }
      else if (joue) reseau.attendu = false;
    }       // à deux : un cadre du lockstep (rien si l'autre n'a pas parlé)
    else ev = avancer(B);
    const ms = performance.now() - t0;
    perf.sim += (ms - perf.sim) * 0.05; perf.pas++;
    evenements.push(...ev);
    raconter(ev);
    if (ev.length) { const ec = ecouteDe(); for (const e of ev) son.evenement(e, ec); }
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
    if (!$('titre').hidden) { const dev = decorPas(dt); son.image(dt, { tirs: null, ecoute: { x: 0, y: 0, rayon: 100 }, meteo: null, nuit: false, titre: true, enJeu: false }); if (!$('dialogue-carte').open) rendu.dessiner(dt, dev); return; }      // l'écran titre : le décor (figé pendant le choix du secteur : caché derrière la fenêtre, il coûtait ~170 ms par image au rendu logiciel et le glissement des cartes saccadait)
    if (!B) return;
    pad.poll();
    if (enJeu() && !document.querySelector('dialog[open]')) {
      const k = keys.axis(), m = pad.axis();
      const ax = k.x || m.x, ay = k.y || m.y;
      if (ax || ay) { centrage = null; leSuivi.liberer(); }
      if (ax || ay) rendu.deplacerEcran(ax * dt * 260 / rendu.ppm, ay * dt * 260 / rendu.ppm);
      // tourner : A et E (Q et E en QWERTY), incliner : R et F — touches physiques, lues en continu
      const tour = (keys.held('KeyE') ? 1 : 0) - (keys.held('KeyQ') ? 1 : 0), incl = (keys.held('KeyF') ? 1 : 0) - (keys.held('KeyR') ? 1 : 0);
      if (tour || incl) {
        leSuivi.liberer();
        rendu.tourner(tour * dt * 0.9, incl * dt * 0.5);
        if (!reseau) prefs.camera = { yaw: rendu.vue.cible.yaw, tangage: rendu.vue.cible.tangage };
        clearTimeout(zoomer.t); zoomer.t = setTimeout(() => store.save('prefs', prefs), 400);
      }
    }
    if (marque) marque.t -= dt;
    if (leSuivi.actif) centrage = null;
    leSuivi.maj(dt);
    majCentrage(dt);
    const ev = evenements.splice(0);
    retours.evenements(ev);
    leSuivi.evenements(ev);
    rendu.aretesPonts = modeBarrage === GENIE && B.etat.phase === 'jour';
    const vols = (B.etat.mitraillages || []).filter(v => v.etat === 'vol' || v.etat === 'chute').map(v => ({ etat: v.etat, ...(v.etat === 'vol' ? positionDe(v, B.etat.temps) : { x: v.cx, y: v.cy, h: 0 }), mitraille: v.etat === 'vol' && balayage(v, B.etat.temps).actif }));
    son.image(dt, { tirs: loop.paused || B.etat.phase !== 'jour' ? null : B.tirs, ecoute: ecouteDe(), meteo: METEO[B.etat.meteo[B.etat.jour - 1]], nuit: B.etat.phase === 'nuit', aube: B.etat.phase === 'jour' && horloge(B).heure < 8, chars: loop.paused ? [] : B.etat.chars, avions: loop.paused ? [] : vols });
    rendu.gele = loop.paused && B.etat.phase === 'jour';      // le temps arrêté fige tout le dessin (v0.99.5)
    $('canvas').classList.toggle('gele', rendu.gele);
    rendu.dessiner(dt, ev);
    retours.maj(dt);
    majEtiquettes();
    if (choisis.size && charChoisi !== null) charChoisi = null;       // (des régiments choisis : plus de char choisi)
    if (choisis.size && nidChoisi !== null) { nidChoisi = null; modeNid = null; }
    // La fenêtre d'un poste se ferme d'elle-même (Jérôme, retour du 1er nov.) : à la nuit, quand le poste est détruit ou n'est plus à nous (en plus d'Échap, de « Fermer » et de l'ordre donné)
    if (nidChoisi !== null) { const nc = B.etat.nids.find(k => k.id === nidChoisi); if (!nc || nc.etat !== 'actif' || nc.camp !== MOI || B.etat.phase !== 'jour') { nidChoisi = null; modeNid = null; } }
    leCharHud.maj(charChoisi, modeChar, leSuivi.actif); leNidHud.maj(nidChoisi, modeNid, leSuivi.actif); lesPastilles.avions(choisirAvion, avionChoisi); lesPastilles.balayer(); majAvionFiche();
    placerFenetre(); placerBatiment();
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
$('hud-reglages').onclick = e => { e.currentTarget.blur(); if (reseau) { if (!reseau.ls.etat.pause) { reseau.ls.commander({ t: 'pause', v: true }); reseau.pauseParMoi = true; } } else loop.pause(); $('dialogue-reglages').showModal(); };
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
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.129.0');
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
      son, suivi: leSuivi, charChoisi: () => [charChoisi, modeChar, choisis.size],
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
      raconter: ev => { raconter(ev); majHud(); },      // le carnet de bord : des événements de la bataille racontés tels quels (les scripts, les captures)
      batiment: cle => { choisirBatiment(cle); montrerBatiment(cle); },      // la fenêtre d'un bâtiment (les scripts)
      bat: (cle, choix = null) => reseau ? reseau.ls.commander({ t: 'bat', cle, choix }) : ordonnerChantier(B.etat, cle, choix),      // un chantier du camp (à deux : par le lockstep)
      barrage: (cal, x, y, camp = 0, x2, y2) => { const m = B.etat.marges, X2 = x2 === undefined ? undefined : x2 + m.x, Y2 = y2 === undefined ? undefined : y2 + m.y; return reseau ? lancerBarrage(cal, x + m.x, y + m.y, X2, Y2) : ordonnerBarrage(B, cal, x + m.x, y + m.y, camp, X2, Y2); },
      stance: (ids, stance, camp = 0) => reseau ? lancerStance(ids, stance) : ordonnerStance(B, ids, stance, camp),
      marche: (ids, x, y) => reseau ? lancerMarche(ids, x + B.etat.marges.x, y + B.etat.marges.y) : ordonnerMarche(B, ids, x + B.etat.marges.x, y + B.etat.marges.y),
      reseau: () => reseau ? { moi: reseau.moi, cadre: reseau.ls.cadre, pause: reseau.ls.etat.pause, vitesse: reseau.ls.etat.vitesse, ecart: reseau.ls.ecart, empreinte: empreinteEtat(B), ticks: B.etat.ticks } : null,
      zoom: z => { rendu.vue.zoom = z; },
      ouvrirFiche: id => { montrerSoldat(id); majFiche(B); },      // la fiche d'un homme par son numéro (les captures)
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
