/* La bataille : l'état d'une partie et ses règles. Logique pure (aucun DOM,
   aucune horloge, aucun hasard hors de la graine) : même graine, mêmes ordres, même
   bataille. Se teste dans Node (test/).

   Un pas = PAS s de jeu. Ordre des choses dans un pas : la grille de la foule,
   les obus (le terrain se creuse, des hommes meurent), en face (ses ordres), la
   foule (marche et tir), le retrait des morts, l'eau (quelques rangées de la
   passe horaire), le résumé du terrain pour les champs (une bande).

   Le jour dure `jour.duree` s (6 h → 18 h). À 18 h vient la nuit : l'eau des
   douze heures de nuit se calcule en lot, et la bataille attend l'aube
   (aube()). Après le dernier jour : la fin.

   La sauvegarde (photo) garde la graine, la liste compacte des impacts, l'état
   de la foule et les petites couches de logique ; jamais le relief : il se
   rejoue depuis la graine et les impacts (rejouerTerrain). */
import { createRng, hash2 } from './lib/rng.js?v=0.68.1';
import { impact, hydroLignes, etat as etatCase, vitesseEtat, vitesseCase, ETAT } from './terrain.js?v=0.68.1';
import { creerArmee, ajouterSoldat, construireGrille, pasArmee, tuerDans, effrayer, compacter, photoArmee, restaurerArmee, b64, deB64, DENSITE, place } from './army.js?v=0.68.1';
import { ligneSous } from './tranchees.js?v=0.68.1';
import { terrainDuSecteur } from './secteur-terrain.js?v=0.68.1';
import { detruirePont, reconstruirePont, pontEn } from './eaux.js?v=0.68.1';
import { PONT_COUPE } from './data/ponts.js?v=0.68.1';
import { calculerCouts, creerCacheChamps, dimensionsCouts, BLOC } from './champs.js?v=0.68.1';
import { CALIBRES, NOMS_CALIBRES } from './data/calibres.js?v=0.68.1';
import { preparerAleatoire, ID_ALEATOIRE } from './generateur.js?v=0.68.1';
import { AVION, MITRAILLAGE } from './data/mitraillage.js?v=0.68.1';
import { refusAvion, lancerAvion, avancerAvions, flotteDeDepart, reparerAvions } from './avions.js?v=0.68.1';
import { CHAR, CHAR_RECHARGE, CHAR_SORTIE } from './data/chars.js?v=0.68.1';
import { GENIE, GENIE_DATA } from './data/genie.js?v=0.68.1';
import { refusGenie, lancerGenie, avancerGenies, degatsGenies, sectionsDeDepart } from './genie.js?v=0.68.1';
import { refusChar, lancerChar, degatsChars, avancerChars } from './chars.js?v=0.68.1';
import { METEO, SAISONS, SAISON_DEFAUT, PREVISION_JUSTE, temperature } from './data/meteo.js?v=0.68.1';
import { SECTEURS } from './data/secteur.js?v=0.68.1';
import { REGIMENTS } from './data/lexique.js?v=0.68.1';
import { STANCES, STANCE_DEFAUT } from './data/stances.js?v=0.68.1';
import { grade } from './identite.js?v=0.68.1';
import { corvees, rejouerTravaux } from './nuit.js?v=0.68.1';

export const PAS = 1 / 30;                 // s de jeu par pas
export const NOUS = 0, EUX = 1;
const VERSION = 10;   // 10 : la solidité des ponts (pv, nom, historique), la coupure en attente de ses coûts (`etat.couts.coupure`) ; 9 : le génie (les sections, les ponts refaits) ; 8 : le chemin et le cap des chars ; 7 : le rapport du jour (les sorties et les pertes d'avions) ; 6 : les avions de mitraillage (une passe tracée, des points de vie, une flotte) ; 5 : la forme des cratères (rond, lèvre jetée, éclats : les impacts rejoués changent) ; 2 : la graine d'identité ; 3 : la campagne et les relevés ; 4 : les numéros de campagne, un effectif par camp, le rythme de l'IA (campagne, lots 1 à 3)

const ticksParHeure = R => Math.max(1, Math.round(R.jour.duree / (R.jour.heureFin - R.jour.heureDebut) / PAS));
export const ticksParJour = R => ticksParHeure(R) * (R.jour.heureFin - R.jour.heureDebut);
const PERIODE_COUTS = R => Math.max(1, Math.round(R.foule.champPeriode / PAS));

// ─── Création ────────────────────────────────────────────────────────────

function chaineMeteo(rng, jours, pluieAuMoins, saison = SAISON_DEFAUT) {
  const SA = SAISONS[saison] ?? SAISONS[SAISON_DEFAUT], TR = SA.transitions;
  const chaine = [SA.depart];
  for (let d = 1; d < jours; d++) {
    const tr = TR[chaine[d - 1]];
    chaine.push(rng.weighted(Object.entries(tr).map(([v, w]) => ({ v, w }))));
  }
  // le lot minimal doit voir venir la boue : des jours de pluie garantis (pas le premier)
  let manque = pluieAuMoins - chaine.filter(m => m === 'pluie').length;
  for (let d = 1; d < jours && manque > 0; d++) if (chaine[d] !== 'pluie') { chaine[d] = 'pluie'; manque--; }
  const previsions = chaine.map((m, d) => {
    const vrai = chaine[d + 1];
    if (!vrai) return null;
    return rng() < PREVISION_JUSTE ? vrai : rng.pick(Object.keys(TR));
  });
  return { chaine, previsions };
}

/* Une nouvelle bataille. opts : { secteur: 'essai', soldats: par camp, jours, mission, graineIdentite, campagne } (jours et mission :
   tirés de la graine par un hachage, sans toucher au générateur : l'ordre des tirages ne change pas).
   graineIdentite : d'où viennent les noms, âges et grades de NOS hommes (identite.js) ; elle ne sert qu'à cela. Une campagne la garde
   d'une bataille à l'autre pendant que la graine (terrain, météo, tirages) change ; hors campagne elle vaut la graine. En face, les
   hommes viennent toujours de la graine de la bataille : ce sont d'autres hommes à chaque fois.
   saison : 'ete' | 'automne' | 'hiver' (v0.53.0) : impose la saison du sol et du temps, quelle que soit celle du secteur (parties personnalisées, étapes de la campagne) ; absente, le secteur décide.
   campagne : { id, n } si la bataille est la n-ième d'une campagne (js/campagne.js) ; elle ne change rien à la partie.
   troupes : { regiments: [{ nom, survivants: [[numéro, rang, expérience, victimes], …] }], prochainNumero } : nos régiments reconstitués
   (lot 3) ; chacun reprend ses survivants (par le rang, puis l'expérience), complétés par des recrues sans expérience. Les numéros de
   bataille (`id`, contigus par régiment) ne sont pas ceux de la campagne (`numero`, stables) : `etat.numeros` dit lequel est lequel.
   soldatsEux : l'effectif d'en face, s'il diffère du nôtre (`soldats`). iaRythme : { barrage, offensive }, facteurs de la durée entre deux
   actions de l'IA d'en face (moins de 1 : plus souvent). */
export function nouvelleBataille(graine, R, opts = {}) {
  const idSecteur = opts.secteur || 'essai';
  if (idSecteur === ID_ALEATOIRE) preparerAleatoire(graine);       // la carte aléatoire est tirée de la graine de la bataille (v0.49.0)
  const S = SECTEURS[idSecteur];
  const parCamp = opts.soldats || S.soldats, parCampEux = opts.soldatsEux || parCamp;
  const rng = createRng(graine);
  const J = typeof S.jours === 'number' ? { min: S.jours, max: S.jours } : S.jours;
  const jours = opts.jours || J.min + Math.floor(hash2(graine | 0, 41, 7) * (J.max - J.min + 1));
  const mission = opts.mission || (S.missions ? S.missions[Math.floor(hash2(graine | 0, 43, 7) * S.missions.length)] : null);
  const saison = opts.saison && SAISONS[opts.saison] ? opts.saison : S.saison;
  const { chaine, previsions } = chaineMeteo(rng.fork('meteo'), jours, saison ? (SAISONS[saison]?.pluieAuMoins ?? S.pluieAuMoins) : S.pluieAuMoins, saison);
  const etat = {
    v: VERSION, graine, graineIdentite: opts.graineIdentite ?? graine, campagne: opts.campagne ?? null, secteur: idSecteur, parCamp, parCampEux,
    mission, issue: null,               // la mission (tenir, prendre) et, à la fin, ce qu'il en est
    reserves: [S.reserves ?? 0, S.reserves ?? 0],   // régiments frais en réserve, par camp (la relève)
    parRegiment: Math.floor(parCamp / S.regiments), parRegimentEux: Math.floor(parCampEux / S.regiments),
    // la campagne : le numéro de campagne de nos hommes quand il n'est pas leur numéro de bataille ({ numéro de bataille : numéro }) et le prochain à donner
    numeros: opts.campagne || opts.troupes ? {} : null, prochainNumero: opts.troupes ? opts.troupes.prochainNumero : parCamp,
    iaRythme: { barrage: opts.iaRythme?.barrage ?? 1, offensive: opts.iaRythme?.offensive ?? 1 },
    jour: 1, tickJour: 0, ticks: 0, phase: 'jour',
    meteo: chaine, previsions,
    impacts: [],                        // [jour, tickJour, x×10, y×10, calibre] : de quoi rejouer le relief
    hydro: { passe: 0, ligne: 0 },
    couts: { bande: 0, version: 1, depuis: -1e9 },   // (depuis : le temps de la dernière version ; sert à étaler les champs, voir champDe)
    marges: { ...S.marges },            // le terrain déborde du secteur (zone())
    regiments: [], pertes: [0, 0], pertesJour: [[0, 0]], blesses: [0, 0],
    corps: [],                  // les morts restent où ils sont tombés : [x×10, y×10, camp, jour, id]
    sol: Object.fromEntries(['relief', 'arbres', 'bois', 'haies', 'buissons', 'retouches', 'objets', 'tranchees', 'saison'].map(k => [k, k === 'saison' ? saison : S[k]]).filter(([, v]) => v !== undefined).map(([k, v]) => [k, structuredClone(v)])),   // ce qui fait le sol du secteur, copié : les retouches de l'atelier (lots 1 et 2) ne changent pas une partie en cours
    tranchees: !!S.tranchees,   // (les batailles d'avant la v0.4.0 n'en ont pas)
    troncons: [],               // qui tient chaque tronçon (0 nous, 1 en face)
    prises: [[0, 0]],           // tronçons pris par chaque camp, jour par jour
    melee: [],                  // par tronçon, les secondes où les attaquants y sont écrasants (la prise d'un tronçon défendu ; v0.15.0)
    travaux: [],                // les travaux de la nuit : [jour, sorte, tronçons…] (nuit.js ; rejoués par la sauvegarde)
    tombes: [],                 // les morts inhumés : [x×10, y×10, camp, jour, id, jour de l'inhumation]
    abris: {},                  // les abris profonds : { tronçon : niveau } (nuit.js ; un 220 en crève un)
    evacues: [],                // les blessés évacués : [id, jour]
    releves: [],                // les hommes d'un régiment relevé, partis vivants : [numéro, régiment, expérience, victimes] (le registre de campagne)
    nuits: [],                  // ce que chaque nuit a vu : { jour, choix, bilan }
    grades: {},                 // les promus : { numéro: [rang, jour] } (le grade de départ vient du rang de création)
    batteries: Object.fromEntries(NOMS_CALIBRES.map(c => [c, 0])),   // s de jeu (depuis l'aube du jour 1) où la batterie est prête
    deux: !!opts.deux,                  // un second joueur commande en face (v0.30.0) : l'IA d'en face se tait, ses batteries rechargent comme les nôtres
    batteriesEux: Object.fromEntries(NOMS_CALIBRES.map(c => [c, 0])),
    barrages: [],
    chars: [],                          // les chars d'assaut en route ou en épave (v0.47.0) : voir chars.js
    mitraillages: [],                   // les avions en vol, en chute ou en épave (v0.55.0) : voir avions.js
    avionsJour: [[[0, 0], [0, 0]]],     // par jour et par camp : [sorties, avions abattus] (le rapport du soir, v0.59.0)
    avions: flotteDeDepart(),           // les points de vie de chaque avion de chaque camp (0 : perdu ; v0.57.0)
    genies: [],                         // les sections du génie en route ou au travail (v0.66.0) : voir genie.js
    sapeurs: sectionsDeDepart(),        // par camp : les sections au dépôt
    pontsRepares: [],                   // les ponts refaits par le génie : [numéro de l'ouvrage, jour, pas], rejoués avec les impacts
    pontsRompus: [],                    // les ponts tombés sous un char (v0.47.2) : [numéro de l'ouvrage, jour, pas] ; ceux qu'un obus coupe sont rejoués avec les impacts
    ia: { barrage: R.ia.barrage * 0.5, offensive: R.ia.offensive },
    temps: 0,                           // s de jeu écoulées, nuits non comptées
    rng: 0,
  };
  const B = monter(etat, R);
  etat.troncons = B.troncons.map(t => t.camp);
  etat.melee = B.troncons.map(() => 0);
  // Les régiments, côte à côte sur leur ligne ; dans les tranchées, la moitié dans la première, la moitié dans la deuxième
  const nReg = S.regiments, largeurReg = S.largeur / nReg, Z = zone(B);
  for (const camp of [NOUS, EUX]) {
    const ligne = Z.y0 + (camp === NOUS ? S.ligne.nous : S.ligne.eux);
    const parC = camp === NOUS ? parCamp : parCampEux, base = Math.floor(parC / nReg);
    for (let r = 0; r < nReg; r++) {
      const effectif = base + (r < parC - base * nReg ? 1 : 0), T = camp === NOUS ? opts.troupes?.regiments[r] : null;
      const reg = {
        id: etat.regiments.length, camp,
        nom: T ? T.nom : camp === NOUS ? REGIMENTS[r % REGIMENTS.length] : opts.deux ? REGIMENTS[(r + nReg) % REGIMENTS.length] : null,
        effectif, initial: effectif, pertes: 0,
        moral: R.moral.depart, deroute: false, vivres: R.nuit.vivres, stance: STANCE_DEFAUT,
        ordre: null, depart: null,
      };
      if (etat.tranchees) {
        const D = S.tranchees.depart, parLigne = Math.ceil(nReg / D.length), L = B.lignes.find(l => l.camp === camp && l.rang === D[Math.floor(r / parLigne)]);
        const w = S.largeur / parLigne, x0 = Z.x0 + (r % parLigne) * w;
        reg.ordre = formationTranchee(reg, L, x0 + 2, x0 + w - 2, R);
      } else reg.ordre = formation(reg, Z.x0 + (r + 0.5) * largeurReg, ligne, largeurReg, R);
      reg.depart = structuredClone(reg.ordre);
      etat.regiments.push(reg);
      const jeu = etat.tranchees ? 0.3 : 0.8, p = [0, 0];
      // les survivants d'abord (les plus gradés, puis les plus aguerris, aux premières places : la hiérarchie du régiment est celle de ses places),
      // puis des recrues sans expérience ; chacun garde son numéro de campagne
      const vieux = T ? [...T.survivants].sort((a, b) => a[1] - b[1] || b[2] - a[2] || a[0] - b[0]).slice(0, effectif) : [];
      for (let k = 0; k < effectif; k++) {
        place(reg.ordre, k, p);
        const i = ajouterSoldat(B.armee, p[0] + (rng() - 0.5) * jeu, p[1] + (rng() - 0.5) * jeu, camp, reg.id, k, rng(), B.armee.n);
        if (T) {
          const v = vieux[k], id = B.armee.id[i];
          etat.numeros[id] = v ? v[0] : etat.prochainNumero++;
          if (v) { B.armee.exp[i] = v[2]; B.armee.victimes[i] = v[3]; }
        }
      }
    }
  }
  etat.rng = rng.state;
  calculerCouts(B.terrain, R, B.couts, false);
  B.coutsNeufs.set(B.couts); B.coutsPrec.set(B.couts);
  return B;
}

/* L'ordre d'occuper une tranchée de x0 à x1 : les hommes le long du tracé, sur
   deux rangs au moins (plus s'ils n'y tiennent pas). */
function formationTranchee(reg, L, x0, x1, R) {
  const n = Math.max(1, reg.effectif), esp = R.tranchee.espacement;
  const rangs = Math.max(2, Math.ceil(n * esp / Math.max(esp, x1 - x0)));
  const cols = Math.ceil(n / rangs), xc = (x0 + x1) / 2;
  return {
    x: xc, y: L.y0, fx: 0, fy: reg.camp === NOUS ? -1 : 1, cols, esp,
    trace: { y0: L.y0, amp: L.amp, baie: L.baie, phase: L.phase, face: L.face, x0, x1, rangs, ligne: B_LIGNE(L) },
  };
}
const B_LIGNE = L => L.camp * 10 + L.rang;      // la ligne d'un ordre : 0..3 chez nous, 10..13 en face

// L'ordre d'un régiment : un point, un front (vers l'ennemi), une largeur
function formation(reg, x, y, largeurMax, R, forme = 'bloc') {
  const esp = R.foule.espacement;
  const n = Math.max(1, reg.effectif);
  const F = R.foule.formes[forme] ?? R.foule.formes.bloc;
  const cols = Math.max(1, Math.min(F.cols ?? Math.ceil(Math.sqrt(n * F.largeur)), Math.floor(largeurMax / esp)));
  return { x, y, fx: 0, fy: reg.camp === NOUS ? -1 : 1, cols, esp, forme };
}

/* Le secteur de bataille dans le terrain : { x0, y0, x1, y1 } (mètres). Autour,
   des marges sans régiments : les ordres n'y vont pas. */
export function zone(B) {
  const S = secteurDuJeu(B.etat), m = B.etat.marges;
  return { x0: m.x, y0: m.y, x1: m.x + S.largeur, y1: m.y + S.hauteur };
}

/* Le secteur d'une partie : sa donnée, et par-dessus ce qui fait son sol tel que la partie l'a reçu au départ (`etat.sol`), pas tel que l'atelier l'a republié depuis
   (une partie d'avant n'a pas `etat.sol` : elle lit le secteur d'aujourd'hui). Gardé par état : les règles le demandent à chaque pas. */
const secteurs = new WeakMap();
export function secteurDuJeu(etat) {
  let S = secteurs.get(etat);
  if (!S || S.sol !== etat.sol) { S = { ...(SECTEURS[etat.secteur] ?? SECTEURS.essai), ...etat.sol }; Object.defineProperty(S, 'sol', { value: etat.sol, enumerable: false }); secteurs.set(etat, S); }
  return S;
}

// L'état plus ce qui se refait (terrain, foule, champs)
function monter(etat, R) {
  // le sol que la partie a reçu au départ (`etat.sol`), pas celui que l'atelier a republié depuis ; une partie d'avant lit le secteur
  const S = secteurDuJeu(etat), m = etat.marges;
  const W = S.largeur + 2 * m.x, H = S.hauteur + 2 * m.y;
  const { terrain, lignes, troncons } = terrainDuSecteur(S, m, etat.graine, R, { tranchees: !!etat.tranchees });
  const faces = Int8Array.from(troncons, t => lignes[t.ligne].face);
  // (de la place pour les régiments de réserve : la relève les fait entrer)
  const armee = creerArmee({ capacite: etat.parCamp + (etat.parCampEux ?? etat.parCamp) + (etat.reserves?.[0] ?? 0) * ((etat.parRegiment ?? 0) + (etat.parRegimentEux ?? etat.parRegiment ?? 0)) + 16, W, H });
  const { bw, bh } = dimensionsCouts(terrain);
  return {
    etat, R, terrain, armee,
    couts: new Uint8Array(bw * bh), coutsNeufs: new Uint8Array(bw * bh), coutsPrec: new Uint8Array(bw * bh),
    champs: creerCacheChamps(terrain, R),
    lignes, troncons, faces, profondeur: S.tranchees?.profondeur ?? 6,
    evenements: [],
    volants: [],                // le dessin seulement : les corps en vol [indice dans etat.corps, x, y du départ, âge en s], jamais sauvegardés (vieillis par `avancer`, retirés après `projection.duree`)
    tirs: [],                   // le dessin seulement : les tirs du pas [x, y, cible x, cible y, camp]…, vidés par le rendu (jamais sauvegardés)
    disputes: new Uint8Array(troncons.length),   // le dessin seulement : un tronçon où l'autre camp est entré (rafraîchi par `prises`)
  };
}

// ─── Les ordres (le joueur) : ils rendent une raison quand ils sont refusés ──

/* Marcher : les régiments choisis prennent place côte à côte autour de (x, y). L'ordre se prépare à sec (`planMarche` : rien n'est
   changé, c'est ce que le dessin montre avant le clic, v0.21.0), puis `ordonnerMarche` l'applique. */
/* Les chemins vers (x, y) du centre de chacun des régiments : { reg, pts : [[x, y]…], atteint } (le champ de coûts du point visé, le même que celui des hommes ;
   rien n'est changé dans la partie : le cache des champs ne garde que ce qu'on peut recalculer). */
export function cheminsVers(B, regs, x, y) {
  const A = B.armee, F = B.champs.champ(B.couts, B.etat.couts.version, x, y);
  return regs.map(r => {
    let n = 0, cx = 0, cy = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === r.id) { n++; cx += A.x[i]; cy += A.y[i]; }
    return { reg: r.id, ...F.chemin(n ? cx / n : r.ordre.x, n ? cy / n : r.ordre.y) };
  });
}
// la droite de (x1, y1) à (x2, y2) coupe-t-elle de l'eau profonde ?
function traverseEau(T, x1, y1, x2, y2) {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2));
  for (let k = 0; k <= n; k++) { const i = Math.floor(x1 + (x2 - x1) * k / n), j = Math.floor(y1 + (y2 - y1) * k / n); if (i >= 0 && j >= 0 && i < T.W && j < T.H && T.profond[j * T.W + i]) return true; }
  return false;
}
function planMarche(B, ids, x, y, forme = 'bloc', camp = NOUS) {
  const { etat, R } = B;
  const S = secteurDuJeu(etat);
  if (etat.phase !== 'jour') return { refus: 'La nuit, les ordres attendent l\'aube.' };
  let regs = ids.map(id => etat.regiments[id]).filter(r => r && r.camp === camp && r.effectif > 0);
  if (!regs.length) return { refus: 'Aucun régiment choisi.' };
  const Z = zone(B);
  if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return { refus: 'Hors du secteur.' };
  // le moral : un régiment en déroute n'obéit plus ; ébranlé, il ne sort pas vers l'ennemi
  // et un régiment qui refuse de monter (aujourd'hui) n'obéit à rien
  const refuse = regs.filter(r => r.deroute || r.refus === etat.jour || (r.moral < R.moral.ebranle && (camp === NOUS ? y < r.ordre.y - R.moral.avance : y > r.ordre.y + R.moral.avance)));
  let raison = null;
  if (refuse.length) {
    regs = regs.filter(r => !refuse.includes(r));
    raison = refuse.map(r => `${r.nom} ${r.deroute ? 'est en déroute' : r.refus === etat.jour ? 'refuse de monter : il tiendra sa tranchée, rien de plus' : 'est ébranlé : il ne sortira pas'}`).join(' ; ') + '.';
    if (!regs.length) return { refus: raison };
  }
  // le chemin de chacun (Jérôme, v0.47.2 : les régiments tiennent compte des ponts, le chemin se voit avant le clic) : le champ de coûts vers le point visé, du centre du régiment jusqu'à lui ;
  // de l'eau profonde qui barre la route, sans pont, est dite à voix haute
  const T = B.terrain;
  if (T.profond[(Math.floor(y)) * T.W + Math.floor(x)]) return { refus: 'On n\'entre pas dans l\'eau profonde.' };
  let chemins = cheminsVers(B, regs, x, y);
  const barres = chemins.filter(c => !c.atteint && traverseEau(T, c.pts[0][0], c.pts[0][1], x, y)).map(c => c.reg);
  if (barres.length) {
    const noms = barres.map(id => etat.regiments[id].nom).join(', '), barre = `${noms} : aucun passage, de l'eau profonde barre la route (il faut un pont)`;
    raison = raison ? `${raison} ; ${barre}` : barre;
    regs = regs.filter(r => !barres.includes(r.id)); chemins = chemins.filter(c => !barres.includes(c.reg));
    if (!regs.length) return { refus: raison, chemins: cheminsVers(B, barres.map(id => etat.regiments[id]), x, y) };
  }
  const largeurReg = S.largeur / S.regiments;
  regs.sort((a, b) => a.ordre.x - b.ordre.x);
  const items = [];
  // sur une tranchée : l'occuper, côte à côte le long de son tracé
  const L = ligneSous(B.lignes, x, y);
  if (L) {
    // (au plus la largeur d'un secteur, moins 4 m : un régiment, un secteur ; plus serré s'il le faut)
    const wmax = largeurSecteur(B) - 4;
    const longueurs = regs.map(r => Math.min(wmax, Math.ceil(Math.max(1, r.effectif) / 2) * R.tranchee.espacement));
    const total = longueurs.reduce((s, w) => s + w + 4, -4);
    let x0 = Math.max(Z.x0 + 1, Math.min(Z.x1 - 1 - total, x - total / 2)), debut = x0, fin = x0;
    regs.forEach((r, k) => {
      items.push({ r, ordre: formationTranchee(r, L, x0, Math.min(Z.x1 - 1, x0 + longueurs[k]), R) });
      fin = Math.min(Z.x1 - 1, x0 + longueurs[k]);
      x0 += longueurs[k] + 4;
    });
    // (la ligne et les tronçons visés : l'ordre clignote, le carnet le dit)
    const ligne = B.lignes.indexOf(L);
    return { regs, raison, items, chemins, tranchee: true, ligne, troncons: tronconsDeLigne(B, ligne, debut, fin) };
  }
  const largeurs = regs.map(r => formation(r, 0, 0, largeurReg, R, forme).cols * R.foule.espacement + 6);
  const total = largeurs.reduce((s, w) => s + w, 0);
  let cx = Math.max(Z.x0 + total / 2, Math.min(Z.x1 - total / 2, x)) - total / 2;
  regs.forEach((r, k) => {
    items.push({ r, ordre: formation(r, cx + largeurs[k] / 2, Math.max(Z.y0 + 4, Math.min(Z.y1 - 4, y)), largeurReg, R, forme) });
    cx += largeurs[k];
  });
  return { regs, raison, items, chemins, tranchee: false };
}
export function ordonnerMarche(B, ids, x, y, forme, camp = NOUS) {
  const p = planMarche(B, ids, x, y, forme, camp);
  if (p.refus) return { refus: p.refus };
  for (const { r, ordre } of p.items) { r.ordre = ordre; r.stance = STANCE_DEFAUT; reattribuer(B, r); }   // (la posture est une consigne de place : marcher la remet à volonté)
  const res = p.tranchee ? { ok: true, regiments: p.regs.map(r => r.id), tranchee: true, ligne: p.ligne, troncons: p.troncons } : { ok: true, regiments: p.regs.map(r => r.id) };
  return p.raison ? { ...res, refus: p.raison } : res;
}
/* L'ordre à sec : ce que `ordonnerMarche` ferait, sans rien changer. { refus } si rien ne partirait ; sinon { ok, tranchee, troncons },
   ou, en terrain libre, les emprises (un rectangle par régiment : x, y le centre, l la largeur, p la profondeur, en mètres) ;
   `refus` aussi quand certains seulement n'obéiraient pas. */
export function peutOrdonner(B, ids, x, y, forme, camp = NOUS) {
  const p = planMarche(B, ids, x, y, forme, camp);
  if (p.refus) return { refus: p.refus, chemins: p.chemins };
  const out = { ok: true, chemins: p.chemins, regiments: p.regs.map(r => r.id), tranchee: p.tranchee };
  if (p.raison) out.refus = p.raison;
  if (p.tranchee) { out.troncons = p.troncons; out.ligne = p.ligne; }
  else out.emprises = p.items.map(({ r, ordre }) => ({ x: ordre.x, y: ordre.y, l: ordre.cols * ordre.esp, p: Math.ceil(Math.max(1, r.effectif) / ordre.cols) * ordre.esp }));
  return out;
}

/* Les places de la nouvelle formation aux vivants du régiment, sans qu'ils se
   croisent : rangés de gauche à droite (le long du front) en colonnes, puis
   d'avant en arrière dans chaque colonne. Déterministe (à égalité, l'indice). */
function reattribuer(B, reg) {
  const A = B.armee, o = reg.ordre;
  const ids = [];
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) ids.push(i);
  if (o.trace) {
    // le long de la tranchée, d'ouest en est ; dans chaque colonne, de l'avant (le parapet) vers l'arrière
    const t = o.trace;
    ids.sort((a, b) => A.x[a] - A.x[b] || a - b);
    for (let c = 0; c * t.rangs < ids.length; c++) {
      ids.slice(c * t.rangs, (c + 1) * t.rangs).sort((a, b) => (A.y[a] - A.y[b]) * -t.face || a - b)
        .forEach((i, r) => { A.slot[i] = c * t.rangs + r; });
    }
    return;
  }
  const lat = i => -A.x[i] * o.fy + A.y[i] * o.fx;          // le long du front
  const prof = i => -(A.x[i] * o.fx + A.y[i] * o.fy);        // vers l'arrière
  ids.sort((a, b) => lat(a) - lat(b) || a - b);
  const rangs = Math.ceil(ids.length / o.cols);
  for (let c = 0; c * rangs < ids.length; c++) {
    const col = ids.slice(c * rangs, (c + 1) * rangs).sort((a, b) => prof(a) - prof(b) || a - b);
    col.forEach((i, r) => { A.slot[i] = r * o.cols + c; });
  }
}

/* La posture à sec (v0.36.0) : quels régiments la prendraient, sans rien changer. Même refus que la marche : la nuit, la déroute. */
export function peutStance(B, ids, stance, camp = NOUS) {
  const { etat } = B;
  if (!STANCES[stance]) return { refus: `Pas de posture « ${stance} ».` };
  if (etat.phase !== 'jour') return { refus: 'La nuit, les ordres attendent l\'aube.' };
  const regs = ids.map(id => etat.regiments[id]).filter(r => r && r.camp === camp && r.effectif > 0);
  if (!regs.length) return { refus: 'Aucun régiment choisi.' };
  const obeit = regs.filter(r => !r.deroute);
  const raison = obeit.length < regs.length ? regs.filter(r => r.deroute).map(r => `${r.nom ?? 'Un régiment'} est en déroute`).join(' ; ') + '.' : null;
  if (!obeit.length) return { refus: raison };
  return raison ? { ok: true, regiments: obeit.map(r => r.id), refus: raison } : { ok: true, regiments: obeit.map(r => r.id) };
}
/* La posture des régiments choisis : à volonté, feu retenu… Rend { ok, regiments } (et `refus` pour ceux qui n'obéissent pas) ou { refus }. */
export function ordonnerStance(B, ids, stance, camp = NOUS) {
  const p = peutStance(B, ids, stance, camp);
  if (!p.ok) return p;
  for (const id of p.regiments) B.etat.regiments[id].stance = stance;
  return p;
}

/* Le barrage à sec : { ok } ou { refus }, sans rien changer (à deux, on dit le refus tout de suite, l'ordre part ensuite pour les deux machines). */
const batterieDe = cal => CALIBRES[cal] ?? (cal === AVION ? MITRAILLAGE : cal === CHAR ? { recharge: CHAR_RECHARGE } : cal === GENIE ? { recharge: GENIE_DATA.recharge } : null);
const nomBatterie = cal => cal === AVION ? 'L\'escadrille rentre' : cal === CHAR ? 'Le prochain char n\'est pas prêt' : cal === GENIE ? 'Le génie n\'est pas prêt' : `La batterie de ${cal} recharge`;
export function peutBarrage(B, cal, x, y, camp = NOUS, x2, y2) {
  const { etat } = B, C = batterieDe(cal);
  if (!C) return { refus: `Pas de batterie de ${cal}.` };
  if (etat.phase !== 'jour') return { refus: 'La nuit, les ordres attendent l\'aube.' };
  const Z = zone(B);
  if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return { refus: 'Hors du secteur.' };
  if (camp === NOUS || etat.deux) {
    const reste = ((camp === NOUS ? etat.batteries : etat.batteriesEux)[cal] ?? 0) - etat.temps;
    if (reste > 0) return { refus: `${nomBatterie(cal)} : encore ${Math.ceil(reste)} s.` };
  }
  if (cal === CHAR) { const r = refusChar(B, departChar(B, camp, x), x, y); if (r) return { refus: r }; }
  if (cal === GENIE) { const r = refusGenie(B, camp, x, y, departChar(B, camp, x)?.ar); if (r.refus) return r; }
  if (cal === AVION) {
    const r = refusAvion(B, camp, x, y, x2, y2); if (r.refus) return r;
    if (!Number.isFinite(x2 ?? 0) || (x2 !== undefined && x2 !== null && (x2 < Z.x0 || y2 < Z.y0 || x2 >= Z.x1 || y2 >= Z.y1))) return { refus: 'Hors du secteur.' };
  }
  return { ok: true };
}
/* Un barrage d'artillerie autour de (x, y). */
export function ordonnerBarrage(B, cal, x, y, camp = NOUS, x2, y2) {
  const { etat } = B;
  const S = secteurDuJeu(etat);
  const C = batterieDe(cal);
  void S;
  if (!C) return { refus: `Pas de batterie de ${cal}.` };
  if (etat.phase !== 'jour') return { refus: 'La nuit, les ordres attendent l\'aube.' };
  const Z = zone(B);
  if (x < Z.x0 || y < Z.y0 || x >= Z.x1 || y >= Z.y1) return { refus: 'Hors du secteur.' };
  if (camp === NOUS || etat.deux) {        // (en face, l'IA tire sans attendre ; un second joueur recharge comme nous)
    const bat = camp === NOUS ? etat.batteries : (etat.batteriesEux ??= Object.fromEntries(NOMS_CALIBRES.map(c => [c, 0])));
    const reste = (bat[cal] ?? 0) - etat.temps;
    if (reste > 0) return { refus: `${nomBatterie(cal)} : encore ${Math.ceil(reste)} s.` };
    if (cal === CHAR) { const r = refusChar(B, departChar(B, camp, x), x, y); if (r) return { refus: r }; }
    if (cal === GENIE) { const r = refusGenie(B, camp, x, y, departChar(B, camp, x)?.ar); if (r.refus) return r; }
    if (cal === AVION) { const r = peutBarrage(B, cal, x, y, camp, x2, y2); if (r.refus) return r; }
    bat[cal] = etat.temps + C.recharge;
  }
  if (cal === CHAR) { lancerChar(B, camp, departChar(B, camp, x), x, y); return { ok: true }; }
  if (cal === GENIE) { const r = refusGenie(B, camp, x, y, departChar(B, camp, x)?.ar); if (r.refus) return r; lancerGenie(B, camp, r.pont, departChar(B, camp, x)?.ar); return { ok: true }; }
  if (cal === AVION) {
    // l'avion vient de hors de la carte, sur le prolongement de la passe tracée (A → B), et la balaie au fil de son vol (avions.js ; Jérôme, v0.55.0)
    const r = refusAvion(B, camp, x, y, x2, y2); if (r.refus) return r;
    lancerAvion(B, camp, r.ligne);
    return { ok: true };
  }
  etat.barrages.push({ camp, cal, x, y, reste: C.salve, prochain: etat.temps + 1.5 });
  return { ok: true };
}

/* D'où part un char de (camp) : l'arrière de son camp, à la colonne visée (null : pas de lignes dans ce secteur) */
function departChar(B, camp, x) {
  const a = arriereDe(B); if (!a) return null;
  // il naît hors du terrain, derrière son camp (nous au sud, en face au nord), et entre sur la route jusqu'à l'arrière (Jérôme, v0.48.1)
  const T = B.terrain;
  return { x, y: camp === NOUS ? T.H + CHAR_SORTIE : -CHAR_SORTIE, ar: a[camp] };
}
/* L'arrière de chaque camp [nous, en face] : la rangée derrière sa dernière ligne, où les blessés qui marchent s'arrêtent (Jérôme, v0.35.0) */
export function arriereDe(B) {
  const { etat, R } = B, Ld = secteurDuJeu(etat).tranchees?.lignes, y0 = etat.marges.y;
  return Ld ? [y0 + Math.max(...Ld.nous) + R.soldat.arriere, y0 + Math.min(...Ld.eux) - R.soldat.arriere] : null;
}

// ─── Un pas ──────────────────────────────────────────────────────────────

/* Avance d'un pas. Rend la liste des événements du pas (impacts, morts) pour
   le rendu et le HUD. */
export function avancer(B) {
  const { etat, R, terrain: T, armee: A } = B;
  B.evenements = [];
  if (etat.phase !== 'jour') return B.evenements;
  if (B.volants.length) { for (const v of B.volants) v[3] += PAS; B.volants = B.volants.filter(v => v[3] < R.obus.projection.duree); }
  const rng = createRng(etat.graine); rng.setState(etat.rng);
  const gel = !!METEO[etat.meteo[etat.jour - 1]].gel;
  etat.tickJour++; etat.ticks++;
  etat.temps = Math.round(etat.temps / PAS + 1) * PAS;
  // touché : il meurt (chance : gravite, ou s'il était déjà blessé), sinon il est blessé (bras, jambe, tête)
  const morts = [];
  const frapper = (i, cause, gravite, choc = null, par = -1) => {
    if (A.mort[i]) return;
    if (A.blessure[i] || rng() < gravite) {
      mourir(B, i, cause, choc && projeter(B, i, choc));
      morts.push(i);
      if (par >= 0 && A.victimes[par] < 65535) A.victimes[par]++;       // le tireur qui l'a abattu (la fiche le dit ; ni récompense ni expérience)
    } else {
      const r = rng();
      A.blessure[i] = r < 0.4 ? 1 : r < 0.8 ? 2 : 3;
      etat.blesses[A.camp[i]]++;
      const reg = etat.regiments[A.reg[i]];
      reg.moral = Math.max(0, reg.moral - R.moral.blesse * 125 / reg.initial);
      B.evenements.push({ type: 'blesse', camp: A.camp[i], cause, id: A.id[i] });
    }
  };
  const tir = (i, tx, ty) => { if (B.tirs.length < 2000) B.tirs.push(A.x[i], A.y[i], tx, ty, A.camp[i], i); };   // (le tireur en dernier : le dessin lui fait épauler son fusil
  const ctx = { T, R, arriere: arriereDe(B), regiments: etat.regiments, rng, dt: PAS, gel, frapper, champDe: r => champDe(B, r), faces: B.faces, tir, abri: c => abriDe(B, c) };

  construireGrille(A);
  // les obus
  for (const b of etat.barrages) {
    const C = CALIBRES[b.cal];
    while (b.reste > 0 && etat.temps >= b.prochain) {
      const gx = (rng() + rng() + rng() - 1.5) * C.dispersion, gy = (rng() + rng() + rng() - 1.5) * C.dispersion;
      const x = Math.round((b.x + gx) * 10) / 10, y = Math.round((b.y + gy) * 10) / 10;
      b.prochain += 1 / C.cadence * (0.7 + rng() * 0.6);
      b.reste--;
      tomber(B, x, y, b.cal, ctx, gel);
    }
  }
  etat.barrages = etat.barrages.filter(b => b.reste > 0);
  if (etat.mitraillages.length) avancerAvions(B, ctx, rng);
  if (etat.chars.length) avancerChars(B, ctx, rng);
  if (etat.genies.length) avancerGenies(B, ctx);
  if (T.coupes.length) noyades(B);
  enFace(B, rng);
  pasArmee(A, ctx);
  // un homme qui tombe fait peur à ceux qui sont à côté
  for (const i of morts) effrayer(A, A.x[i], A.y[i], 4, R.soldat.peurMort, R.experience);
  if (compacter(A)) for (const reg of etat.regiments) if (reg.effectif <= 0) reg.effectif = 0;
  // les tronçons : pris quand l'autre camp y est et que plus un défenseur n'y tient
  if (etat.tranchees && etat.tickJour % 15 === 0) prises(B);
  // le moral : chaque seconde
  if (etat.tickJour % 30 === 0) moral(B, 30 * PAS);

  // l'eau : la passe horaire avance de quelques rangées
  avancerEau(B, etat.tickJour);
  // le résumé du terrain pour les champs : une bande de carrés par pas
  const { bh } = dimensionsCouts(T);
  const P = PERIODE_COUTS(R), parPas = Math.ceil(bh / P);
  const b0 = etat.couts.bande, b1 = Math.min(bh, b0 + parPas);
  calculerCoutsBande(B, b0, b1, gel);
  etat.couts.bande = b1;
  if (b1 >= bh) { B.coutsPrec.set(B.couts); B.couts.set(B.coutsNeufs); etat.couts.version++; etat.couts.depuis = etat.temps; etat.couts.bande = 0; if (etat.couts.coupure) { etat.couts.coupure = false; barrerMarches(B); } }

  etat.rng = rng.state;
  // la fin du jour
  if (etat.tickJour >= ticksParJour(R)) {
    for (let p = 0; p < 12; p++) hydroLignes(T, 0, T.H, METEO[etat.meteo[etat.jour - 1]], R);
    etat.phase = etat.jour >= etat.meteo.length ? 'fin' : 'nuit';
    if (etat.phase === 'fin') etat.issue = juger(B, false);
    B.evenements.push({ type: etat.phase });
  } else if (etat.mission && etat.tickJour % 30 === 0) {
    // le secteur tombe : la bataille finit avant son terme
    const issue = juger(B, true);
    if (issue) { etat.issue = issue; etat.phase = 'fin'; B.evenements.push({ type: 'fin' }); }
  }
  return B.evenements;
}

/* La mission, jugée : à la fin (avant) ou à tout moment (le secteur tombe : nos
   lignes à moins de 40 %, ou plus un homme). Rend { reussie, texte } ou null. */
function juger(B, enCours) {
  const { etat } = B;
  if (!etat.mission) return enCours ? null : { reussie: null, texte: '' };
  const nos = [0, 0], leur1 = [0, 0];                 // [tenus, en tout]
  B.troncons.forEach((tr, k) => {
    const L = B.lignes[tr.ligne];
    if (L.camp === NOUS) { nos[1]++; if (etat.troncons[k] === NOUS) nos[0]++; }
    else if (L.rang === 0) { leur1[1]++; if (etat.troncons[k] === NOUS) leur1[0]++; }
  });
  const vivants = etat.regiments.some(r => r.camp === NOUS && r.effectif > 0);
  const tombe = !vivants || (nos[1] && nos[0] < nos[1] * 0.4);
  if (enCours) return tombe ? { reussie: false, texte: !vivants ? 'Il ne reste plus un homme dans le secteur.' : 'Le secteur est tombé.' } : null;
  if (tombe) return { reussie: false, texte: 'Le secteur est tombé.' };
  if (etat.mission === 'tenir') {
    const ok = nos[0] >= nos[1] * 0.9;
    return { reussie: ok, texte: ok ? 'Le secteur est tenu.' : `Le secteur n'est plus tenu : ${nos[1] - nos[0]} tronçons perdus.` };
  }
  const ok = leur1[0] >= leur1[1] * 0.75;
  return { reussie: ok, texte: ok ? `La première ligne d'en face est prise : ${leur1[0]} tronçons sur ${leur1[1]}.` : `La première ligne d'en face n'est pas prise : ${leur1[0]} tronçons sur ${leur1[1]}.` };
}
export const MISSIONS = {
  tenir: 'Tenir le secteur : à la fin, nos lignes doivent être à nous.',
  prendre: 'Prendre la première ligne d\'en face et la tenir jusqu\'à la fin.',
};

/* Un homme meurt (marqué : compacter() le retire) : les pertes, le moral de son
   régiment (plus encore pour un officier), un gradé remplacé, son corps là où il
   tombe (ou en ou : [x, y]). */
/* Le corps d'un mort d'obus est jeté à l'opposé du point de chute (v0.24.0) : plus loin s'il était près, plus loin pour un gros calibre ;
   sans hasard (un homme collé au point de chute part d'un côté fixé par son numéro). Rend où il tombe, dans le terrain. */
function projeter(B, i, { x0, y0, d, rayon }) {
  const P = B.R.obus.projection, A = B.armee, T = B.terrain;
  if (!P) return null;
  const dx = A.x[i] - x0, dy = A.y[i] - y0;
  const ux = d > 0.05 ? dx / d : (A.id[i] & 1 ? 1 : -1), uy = d > 0.05 ? dy / d : 0;
  const m = (P.min + (P.max - P.min) * (1 - d / rayon)) * rayon / P.rayonRef;
  return [Math.max(0.5, Math.min(T.W - 0.5, A.x[i] + ux * m)), Math.max(0.5, Math.min(T.H - 0.5, A.y[i] + uy * m))];
}

/* Un pont coupé avec des hommes dessus (Jérôme, v0.67.0 : « beaucoup de bugs de pathfinding lorsqu'un pont est détruit avec un régiment dessus »). Le tablier disparu, ils étaient dans l'eau profonde :
   la marche y est à 3 % (`vitesse.profond`), l'eau est un mur pour qui n'y est pas, les carrés de coûts alentour valent 0, donc le champ ne les menait plus nulle part (ils allaient droit vers leur place,
   au travers du fleuve, nageant sur place). Maintenant une part se noie (un hachage du numéro : sans hasard), les autres sont jetés sur la rive la plus proche, épuisés ; ceux qui attendaient d'y monter
   n'ont rien à faire de plus (l'eau est un mur pour eux, et leur régiment en est averti : `barrerMarches`). Les ouvrages coupés du pas sont dans `T.coupes`. */
function noyades(B) {
  const { terrain: T, armee: A, etat } = B, coupes = T.coupes.splice(0), W = T.W, H = T.H;
  const sur = new Map();                                    // case → l'ouvrage coupé dont elle était le tablier
  for (const P of coupes) for (const c of P.cases) sur.set(c, P);
  const sec = c => !T.profond[c] && !T.pont[c];
  const rive = (x, y) => {                                  // la case sèche la plus proche, en couronnes de plus en plus larges
    const i0 = x | 0, j0 = y | 0;
    for (let r = 1; r <= PONT_COUPE.rayonRive; r++) {
      let best = -1, bd = Infinity;
      for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
        if ((Math.abs(i - i0) !== r && Math.abs(j - j0) !== r) || i < 0 || j < 0 || i >= W || j >= H || !sec(j * W + i)) continue;
        const d = (i + 0.5 - x) ** 2 + (j + 0.5 - y) ** 2; if (d < bd) { bd = d; best = j * W + i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  };
  let noyes = 0, sauves = 0;
  for (let i = 0; i < A.n; i++) {
    if (A.mort[i]) continue;
    const P = sur.get((A.y[i] | 0) * W + (A.x[i] | 0)); if (!P) continue;
    if (hash2(A.id[i], T.pontsListe.indexOf(P), 9) < PONT_COUPE.noyes) { mourir(B, i, 'noyade'); noyes++; continue; }
    const c = rive(A.x[i], A.y[i]);
    if (c >= 0) { A.x[i] = (c % W) + 0.5 + (hash2(A.id[i], c, 1) - 0.5) * 0.6; A.y[i] = ((c / W) | 0) + 0.5 + (hash2(A.id[i], c, 2) - 0.5) * 0.6; }
    A.vx[i] = 0; A.vy[i] = 0; A.fatJ[i] = Math.max(A.fatJ[i], PONT_COUPE.fatigue);
    A.coince[i] = 0; sauves++;
  }
  etat.couts.coupure = true;                                // les coûts ne le savent pas encore : à leur prochain tour, `barrerMarches` arrête ceux dont la route passait par là
  if (noyes + sauves) B.evenements.push({ type: 'pont-noyes', x: coupes[0].mx, y: coupes[0].mz, noyes, sauves, nom: coupes[0].nom });
}
/* Les régiments dont la route passait par un pont coupé : le champ de coûts neuf ne mène plus à leur place (de l'eau profonde la barre). Sans cela, leurs hommes allaient droit vers leur place
   et s'entassaient sur la rive, contre l'eau, à pousser sans fin. Le régiment s'arrête où il est (l'ordre devient une place là où est son centre) ; le carnet le dit. */
function barrerMarches(B) {
  const { etat, R, terrain: T, armee: A } = B, S = secteurDuJeu(etat), largeurReg = S.largeur / S.regiments, Z = zone(B);
  for (const reg of etat.regiments) {
    if (!reg.effectif || reg.ordre.trace) continue;
    let n = 0, cx = 0, cy = 0;
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id && !A.mort[i]) { n++; cx += A.x[i]; cy += A.y[i]; }
    if (!n) continue;
    cx /= n; cy /= n;
    if (Math.hypot(reg.ordre.x - cx, reg.ordre.y - cy) < 6 || !traverseEau(T, cx, cy, reg.ordre.x, reg.ordre.y)) continue;
    const [{ atteint }] = cheminsVers(B, [reg], reg.ordre.x, reg.ordre.y);
    if (atteint) continue;
    reg.ordre = formation(reg, Math.max(Z.x0 + 2, Math.min(Z.x1 - 2, cx)), Math.max(Z.y0 + 2, Math.min(Z.y1 - 2, cy)), largeurReg, R, reg.ordre.forme);
    reattribuer(B, reg);
    B.evenements.push({ type: 'marche-barree', reg: reg.id, camp: reg.camp });
  }
}

export function mourir(B, i, cause, ou = null) {
  const { etat, R, armee: A } = B;
  if (A.mort[i]) return;
  A.mort[i] = 1;
  const reg = etat.regiments[A.reg[i]];
  reg.pertes++; reg.effectif--;
  etat.pertes[A.camp[i]]++;
  etat.pertesJour[etat.jour - 1][A.camp[i]]++;
  const rang = rangDe(B, A.id[i], A.reg[i]);
  reg.moral = Math.max(0, reg.moral - R.moral.mort * 125 / reg.initial - (rang <= 3 ? R.moral.officier : 0));
  if (rang <= 5) promouvoir(B, A.reg[i], rang);
  const [x, y] = ou || [A.x[i], A.y[i]];
  etat.corps.push([Math.round(x * 10), Math.round(y * 10), A.camp[i], etat.jour, A.id[i]]);
  if (ou && cause === 'obus') B.volants.push([etat.corps.length - 1, A.x[i], A.y[i], 0]);       // le dessin le fait voler (de là où il est tombé)
  B.evenements.push({ type: 'mort', camp: A.camp[i], cause, x, y, id: A.id[i] });
}

/* Les hommes de chaque camp dans chaque tronçon : [nous, en face] par tronçon. Refait tel quel pour `prises` ; pour
   le dessin et les mots (`actionDe`, la carte), le dernier compte (au plus une demi-seconde de retard). */
function compteTroncons(B) {
  const { etat, terrain: T, armee: A } = B, n = etat.troncons.length, compte = new Int32Array(n * 2);
  for (let i = 0; i < A.n; i++) {
    const t = T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)];
    if (t >= 0) compte[t * 2 + A.camp[i]]++;
  }
  B._forces = { tick: etat.ticks, compte };
  return compte;
}
export function forcesTroncons(B) {
  const f = B._forces;
  return f && Math.abs(B.etat.ticks - f.tick) < 15 ? f.compte : compteTroncons(B);
}

/* Qui tient chaque tronçon. Un tronçon vide de ses défenseurs, où l'autre camp est au moins `prise`, change de main. Un
   tronçon encore défendu aussi, quand les attaquants y sont `melee` fois plus nombreux que les défenseurs (et au moins
   `prise`) pendant `tenue` secondes : la mêlée (`etat.melee`), qui retombe dès que le rapport ne tient plus (v0.15.0 :
   avant, un seul défenseur debout, même blessé, gardait le tronçon contre un régiment entier). */
function prises(B) {
  const { etat, R, terrain: T, armee: A } = B;
  const n = etat.troncons.length, compte = compteTroncons(B), C = R.tranchee;
  for (let t = 0; t < n; t++) {
    const tient = etat.troncons[t], autre = 1 - tient;
    const avantDispute = B.disputes[t];
    B.disputes[t] = compte[t * 2 + autre] > 0 ? 1 : 0;
    if (!avantDispute && B.disputes[t] && tient === NOUS) B.evenements.push({ type: 'dispute', camp: tient, troncon: t });   // le carnet : l'autre camp est entré chez nous
    const def = compte[t * 2 + tient], att = compte[t * 2 + autre];
    const ecrase = att >= C.prise && (def === 0 || att >= C.melee * def);
    etat.melee[t] = ecrase ? etat.melee[t] + 15 * PAS : Math.max(0, etat.melee[t] - 30 * PAS);
    if (ecrase && (def === 0 || etat.melee[t] >= C.tenue)) {
      etat.melee[t] = 0;
      etat.troncons[t] = autre;
      etat.prises[etat.jour - 1][autre]++;
      const tr = B.troncons[t], gagnants = new Set();
      // ceux qui l'ont pris s'aguerrissent, leur régiment se reprend ; ceux qui devaient le tenir le perdent
      for (let i = 0; i < A.n; i++) {
        if (A.camp[i] !== autre || T.troncon[(A.y[i] | 0) * T.W + (A.x[i] | 0)] !== t) continue;
        A.exp[i] = Math.min(1, A.exp[i] + R.experience.prise);
        gagnants.add(A.reg[i]);
      }
      for (const reg of etat.regiments) {
        if (gagnants.has(reg.id)) reg.moral = Math.min(1, reg.moral + R.moral.prise);
        // la poursuite : en face, un régiment encore frais qui vient de prendre pousse jusqu'à notre ligne suivante
        // (il s'étire : c'est ce qui ouvre la fuite feinte, les Horaces et les Curiaces)
        if (gagnants.has(reg.id) && reg.camp === EUX && reg.ordre.trace && reg.ordre.trace.ligne < 10 && !reg.deroute
          && reg.moral >= R.moral.poursuite && reg.effectif >= reg.initial * 0.5) {
          const L = B.lignes[tr.ligne], suivante = B.lignes.find(M => M.camp === L.camp && M.rang === L.rang + 1);
          const t = reg.ordre.trace;
          if (suivante && t.ligne === L.camp * 10 + L.rang) { reg.ordre = formationTranchee(reg, suivante, t.x0, t.x1, R); reattribuer(B, reg); B.evenements.push({ type: 'poursuite', camp: EUX, reg: reg.id }); }
        }
        const o = reg.ordre.trace;
        if (reg.camp === tient && o && o.ligne === B.lignes[tr.ligne].camp * 10 + B.lignes[tr.ligne].rang && o.x1 > tr.x0 && o.x0 < tr.x1) reg.moral = Math.max(0, reg.moral - R.moral.perte);
      }
      B.evenements.push({ type: 'prise', camp: autre, troncon: t, x: (tr.x0 + tr.x1) / 2, y: B.lignes[tr.ligne].y0 });
    }
  }
}
// ─── Le moral, les grades ────────────────────────────────────────────────

// le premier numéro de chaque régiment (les numéros se suivent, régiment après régiment)
function premiers(B) {
  if (!B.premiers || B.premiers.length !== B.etat.regiments.length) {
    let p = 0;
    B.premiers = B.etat.regiments.map(r => { const v = p; p += r.initial; return v; });
  }
  return B.premiers;
}
/* Le rang d'un homme (0 capitaine … 6 soldat, identite.js) : celui de sa
   création dans son régiment, ou celui de sa promotion. */
/* Le numéro de campagne d'un de nos hommes (son nom en dépend) : le numéro de bataille quand la campagne n'en a pas donné d'autre. */
export const numeroCampagne = (etat, id) => etat.numeros?.[id] ?? id;
export function rangDe(B, id, reg) {
  const g = B.etat.grades[id];
  if (g !== undefined) return g[0];
  return grade(id - premiers(B)[reg], B.etat.regiments[reg].initial);
}
/* Un gradé de rang g est tombé : le plus proche en dessous de lui (le rang
   juste en dessous, puis le plus aguerri) prend sa place ; et ainsi de suite
   en dessous, jusqu'aux caporaux. */
function promouvoir(B, reg, g) {
  const { etat, armee: A } = B;
  for (let n = 0; n < 7 && g <= 5; n++) {
    let best = -1, br = 99;
    for (let i = 0; i < A.n; i++) {
      if (A.reg[i] !== reg || A.mort[i]) continue;
      const r = rangDe(B, A.id[i], reg);
      if (r <= g) continue;
      if (r < br || (r === br && A.exp[i] > A.exp[best])) { best = i; br = r; }
    }
    if (best < 0) return;
    etat.grades[A.id[best]] = [g, etat.jour];
    B.evenements.push({ type: 'promu', camp: A.camp[best], id: A.id[best], rang: g, reg });
    g = br;
  }
}
/* Le moral de chaque régiment, toutes les dt s : la peur de ses hommes le fait
   baisser ; au calme, il remonte, plus vite avec des officiers et des hommes
   aguerris. Trop bas, c'est la déroute : il reflue vers sa tranchée de départ
   et ne tire plus, jusqu'à ce qu'il se rallie. */
function moral(B, dt) {
  const { etat, R, armee: A } = B;
  const M = R.moral, n = etat.regiments.length;
  const peur = new Float32Array(n), exp = new Float32Array(n), off = new Uint8Array(n), nb = new Uint16Array(n);
  const cx = new Float32Array(n), cy = new Float32Array(n);
  for (let i = 0; i < A.n; i++) {
    const r = A.reg[i];
    peur[r] += A.peur[i]; exp[r] += A.exp[i]; nb[r]++; cx[r] += A.x[i]; cy[r] += A.y[i];
    if (rangDe(B, A.id[i], r) <= 3) off[r]++;
  }
  for (const reg of etat.regiments) {
    const k = reg.id;
    if (!nb[k]) continue;
    const p = peur[k] / nb[k], e = exp[k] / nb[k], encadrement = Math.min(1, off[k] / 2);
    const retour = M.retour * (0.4 + 0.6 * encadrement) * (0.7 + 0.6 * e) * (1 - p);
    reg.moral = Math.max(0, Math.min(1, reg.moral + (retour - M.peur * p) * dt));
    if (!reg.deroute && reg.moral < M.deroute) {
      reg.deroute = true;
      reg.ordre = structuredClone(reg.depart); reattribuer(B, reg);
      B.evenements.push({ type: 'deroute', camp: reg.camp, reg: k });
      // la contagion : les régiments voisins (du même camp, à moins de M.contagionRayon m) voient fuir les leurs
      for (const v of etat.regiments) {
        if (v === reg || v.camp !== reg.camp || !nb[v.id] || v.deroute) continue;
        const d = Math.hypot(cx[v.id] / nb[v.id] - cx[k] / nb[k], cy[v.id] / nb[v.id] - cy[k] / nb[k]);
        if (d < M.contagionRayon) v.moral = Math.max(0, v.moral - M.contagion * (1 - d / M.contagionRayon));
      }
    } else if (reg.deroute && reg.moral >= M.ralliement) {
      reg.deroute = false;
      B.evenements.push({ type: 'ralliement', camp: reg.camp, reg: k });
    }
  }
}
// Le moral en mots
export function moralEnMots(reg, R) {
  if (reg.deroute) return 'en déroute';
  const m = reg.moral, M = R.moral;
  return m >= 0.75 ? 'tient bon' : m >= M.ebranle ? 'tient' : m >= (M.ebranle + M.deroute) / 2 ? 'ébranlé' : 'au bord de la déroute';
}

/* Ce qu'est le terrain en (x, y), en quelques lignes (la plaque du survol) :
   l'état du sol, une tranchée (et qui la tient), un boyau, un cratère, la
   terre jetée, l'eau, un arbre, la marche, l'abri. */
const NOMS_ETAT = { [ETAT.SEC]: 'Sol sec', [ETAT.HUMIDE]: 'Sol humide', [ETAT.BOUE]: 'Boue', [ETAT.EAU]: 'Eau', [ETAT.GLACE]: 'Glace' };
const metres = q => `${(Math.abs(q) / 4).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m`;
export function terrainSous(B, x, y) {
  const { terrain: T, R, etat } = B;
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i >= T.W || j >= T.H) return null;
  const c = j * T.W + i, gel = !!METEO[etat.meteo[etat.jour - 1]].gel;
  const e = etatCase(T, c, R, gel), d = T.diff[c], t = T.troncon ? T.troncon[c] : -1;
  const lignes = [];
  if (t >= 0) {
    const tr = B.troncons[t], L = B.lignes[tr.ligne];
    lignes.push(`Tranchée, ${L.rang === 0 ? '1re' : `${L.rang + 1}e`} ligne ${L.camp === NOUS ? 'des nôtres' : 'd\'en face'}`);
    lignes.push(etat.troncons[t] === L.camp ? (L.camp === NOUS ? 'Tenue par nous' : 'Tenue en face') : (L.camp === NOUS ? 'Prise par en face' : 'Prise par nous'));
    if (d > -2) lignes.push('Comblée par les obus');
  } else if (t === -2) lignes.push(d > -2 ? 'Boyau comblé' : 'Boyau');
  else if (d <= -2) lignes.push(`Cratère, ${metres(d)} de creux`);
  else if (d < 0) lignes.push('Un creux');
  else if (d > 0) lignes.push('Terre jetée');
  lignes.push(T.profond[c] ? 'Eau profonde : on n\'y passe pas' : e === ETAT.EAU ? `Eau, ${Math.round(T.eau[c] * 100)} cm` : NOMS_ETAT[e]);
  if (T.pont[c]) lignes.push('Un pont');
  const arbre = T.arbres.find(a => a.i === i && a.j === j);
  if (arbre) lignes.push(arbre.abattu ? 'Un arbre abattu' : 'Un arbre');
  const buisson = T.buissons.find(b => Math.abs(b.i - i) <= 1 && Math.abs(b.j - j) <= 1);
  if (buisson) lignes.push(buisson.detruit ? 'Un buisson arraché' : 'Un buisson');
  if (T.herbe[c] && e !== ETAT.EAU) lignes.push(['', 'Herbe rare', 'Herbe', 'Herbe haute'][T.herbe[c]]);
  lignes.push(`On y marche à ${Math.round((T.profond[c] ? R.vitesse.profond : vitesseEtat(e, R)) * 100)} %`);
  if (d <= -2) lignes.push(t >= 0 ? 'À l\'abri des éclats ; le parapet protège de face' : 'À l\'abri des éclats');
  if (t >= 0 && etat.abris[t]) lignes.push(`Des abris profonds (${['', 'commencés', 'à moitié creusés', 'achevés'][Math.min(3, etat.abris[t])]})`);
  if (etat.tombes.some(c => Math.abs(c[0] / 10 - x) < 1 && Math.abs(c[1] / 10 - y) < 1)) lignes.push('Une tombe');
  return lignes;
}

/* Le terrain sous la souris en peu de mots (le coin de l'écran, v0.19.0) : ses lignes, sans la vitesse, et la vitesse de marche
   (0 à 1, 1 : le sol sec) pour une barre. */
export function terrainResume(B, x, y) {
  const lignes = terrainSous(B, x, y);
  if (!lignes) return null;
  const { terrain: T, R, etat } = B, gel = !!METEO[etat.meteo[etat.jour - 1]].gel;
  const c = Math.floor(y) * T.W + Math.floor(x), t = T.troncon ? T.troncon[c] : -1, tr = t >= 0 ? B.troncons[t] : null, xm = tr ? (tr.x0 + tr.x1) / 2 : 0;
  // `troncon` et `tranchee` : sur une tranchée, le tronçon et son nom (« B2 », « B2 en face »), pour la ligne de vie du coin de l'écran
  return { lignes: lignes.filter(l => !l.startsWith('On y marche')), vitesse: vitesseCase(T, c, R, gel), troncon: t >= 0 ? t : -1, tranchee: tr ? nomTranchee(B, tr.ligne, xm, xm) : null };
}

// Les tronçons tenus par chaque camp : [nous, en face]
/* Le nom d'un tronçon, en mots (le carnet de bord) : « B1, tronçon 3 » (le 3e, en comptant de l'ouest, de la tranchée B1). */
export function nomTroncon(B, t) {
  const tr = B.troncons[t];
  if (!tr) return 'un tronçon';
  const Z = zone(B), w = largeurZone(B), xm = (tr.x0 + tr.x1) / 2;
  return `${nomTranchee(B, tr.ligne, xm, xm)}, tronçon ${Math.floor(((xm - Z.x0) % w) / Math.max(1, tr.x1 - tr.x0)) + 1}`;
}

/* ─── Les secteurs et les noms des tranchées (Jérôme, v0.14.0 ; v0.21.3 : plus simples) ───
   La logique coupe le front en colonnes de 50 m (`secteurDe`, numérotées de l'ouest à l'est). Le joueur voit quatre secteurs de 100 m,
   A à D de l'ouest à l'est (un régiment de départ en occupe un, sans chevaucher le voisin) et quatre lignes par camp, numérotées de la
   plus avancée : une tranchée se dit « B1 » (secteur B, notre 1re ligne), « B2 en face » (leur 2e ligne). */
export const nombreSecteurs = B => secteurDuJeu(B.etat).regiments;
export const largeurSecteur = B => secteurDuJeu(B.etat).largeur / secteurDuJeu(B.etat).regiments;
export function secteurDe(B, x) {
  const n = secteurDuJeu(B.etat).regiments;
  return Math.max(1, Math.min(n, Math.floor((x - zone(B).x0) / largeurSecteur(B)) + 1));
}
export const nombreZones = B => Math.ceil(nombreSecteurs(B) / 2);
export const largeurZone = B => largeurSecteur(B) * 2;
export const zoneDe = (B, x) => Math.ceil(secteurDe(B, x) / 2);
export const lettreZone = z => String.fromCharCode(64 + z);
// les colonnes de 50 m qu'un régiment couvre (de a à b) : sa tranchée de départ, ou celle de son ordre
export function etendueSecteurs(B, o) {
  const t = o.trace;
  return t ? [secteurDe(B, t.x0 + 0.01), secteurDe(B, t.x1 - 0.01)] : [secteurDe(B, o.x), secteurDe(B, o.x)];
}
// les secteurs (A à D) qu'un régiment couvre (de a à b)
export function etendueZones(B, o) {
  const [a, b] = etendueSecteurs(B, o);
  return [Math.ceil(a / 2), Math.ceil(b / 2)];
}
// le secteur d'un régiment de départ : « A » (« A-B » s'il en couvrait deux)
export function secteursDe(B, reg) {
  const [a, b] = etendueZones(B, reg.depart);
  return a === b ? lettreZone(a) : `${lettreZone(a)}-${lettreZone(b)}`;
}
export const codeLigne = L => String(L.rang + 1);
// la tranchée d'une ligne entre deux abscisses : « B1 » (« B1–C1 » si elle court sur deux secteurs), « B1 en face » chez l'autre camp
export function nomTranchee(B, ligne, x0, x1) {
  const L = B.lignes[ligne], a = zoneDe(B, x0 + 0.01), b = zoneDe(B, x1 - 0.01), n = codeLigne(L);
  const nom = a === b ? `${lettreZone(a)}${n}` : `${lettreZone(a)}${n}–${lettreZone(b)}${n}`;
  return L.camp === NOUS ? nom : `${nom} en face`;
}
// les tronçons d'une ligne qui touchent [x0, x1]
export function tronconsDeLigne(B, ligne, x0, x1) {
  const out = [];
  B.troncons.forEach((tr, k) => { if (tr.ligne === ligne && tr.x1 > x0 && tr.x0 < x1) out.push(k); });
  return out;
}
/* Ce que fait un régiment, en mots (la feuille de situation, le carnet) : « tient B1 », « attaque B1 en face », « marche à
   l'attaque de B1 en face », « en terrain libre, secteur B ». Il attaque une tranchée dont l'autre camp tient encore un tronçon. */
export function actionDe(B, reg) {
  const mot = reg.stance && reg.stance !== STANCE_DEFAUT ? `, ${STANCES[reg.stance].court}` : '';       // (la posture, quand ce n'est pas l'ordinaire)
  return actionSansPosture(B, reg) + (reg.effectif && !reg.deroute ? mot : '');
}
function actionSansPosture(B, reg) {
  if (!reg.effectif) return 'plus personne';
  if (reg.deroute) return 'en déroute';
  const o = reg.ordre, t = o.trace;
  if (!t) return `en terrain libre, secteur ${lettreZone(zoneDe(B, o.x))}${o.forme && o.forme !== 'bloc' ? `, en ${B.R.foule.formes[o.forme]?.nom.toLowerCase() ?? o.forme}` : ''}`;
  const ligne = B.lignes.findIndex(L => L.camp * 10 + L.rang === t.ligne);
  const nom = nomTranchee(B, ligne, t.x0, t.x1), A = B.armee;
  let n = 0, somme = 0;
  for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) { n++; somme += A.y[i]; }
  const ks = tronconsDeLigne(B, ligne, t.x0, t.x1);
  const adverse = ks.some(k => B.etat.troncons[k] !== reg.camp), conteste = ks.some(k => B.disputes[k]);
  // les forces en présence dans ces tronçons (les nôtres, les leurs) et la mêlée en cours
  const f = forcesTroncons(B);
  let mine = 0, theirs = 0, melee = 0;
  for (const k of ks) { mine += f[k * 2 + reg.camp]; theirs += f[k * 2 + 1 - reg.camp]; melee = Math.max(melee, B.etat.melee?.[k] || 0); }
  const forces = `${mine} contre ${theirs}`, tour = melee > 0 ? `, mêlée ${Math.ceil(melee)}/${B.R.tranchee.tenue} s` : '';
  if (n && Math.abs(somme / n - t.y0) > 14) return adverse ? `marche à l'attaque de ${nom} (${theirs} en face)` : `marche vers ${nom}`;
  if (adverse) return `attaque ${nom} : ${forces}${tour}`;
  return `tient ${nom}${conteste ? ` : l'ennemi y est entré, ${forces}` : ''}`;
}
export function tronconsTenus(B) {
  const n = [0, 0];
  for (const c of B.etat.troncons) n[c]++;
  return n;
}

// Ce qui reste d'un coup d'obus pour un homme dans la case c (les abris de son tronçon)
export function abriDe(B, c) {
  const k = B.terrain.troncon ? B.terrain.troncon[c] : -1, n = k >= 0 ? B.etat.abris[k] : 0;
  return n ? 1 - B.R.nuit.abriParNiveau * n : 1;
}

function tomber(B, x, y, cal, ctx, gel) {
  const { etat, terrain: T, R } = B;
  const n = etat.impacts.length;
  etat.impacts.push([etat.jour, etat.tickJour, Math.round(x * 10), Math.round(y * 10), NOMS_CALIBRES.indexOf(cal)]);
  const coupes = T.versionPonts;
  const { rayon } = impact(T, x, y, cal, R, n, gel);
  if (T.versionPonts !== coupes) B.evenements.push({ type: 'pont-coupe', x, y, nom: T.coupes[T.coupes.length - 1]?.nom });      // un obus a coupé un pont (le carnet le dit)
  tuerDans(B.armee, x, y, rayon, ctx, CALIBRES[cal].letal);
  if (etat.chars.length) degatsChars(B, x, y, cal);
  if (etat.genies.length) degatsGenies(B, x, y, cal);
  // un gros obus tombé dans un tronçon crève un de ses abris
  const k = T.troncon ? T.troncon[(y | 0) * T.W + (x | 0)] : -1;
  if (k >= 0 && cal === R.nuit.abriDetruit && etat.abris[k]) { if (--etat.abris[k] <= 0) delete etat.abris[k]; }
  B.evenements.push({ type: 'impact', x, y, cal });
}

function avancerEau(B, tickJour) {
  const { etat, R, terrain: T } = B;
  const tph = ticksParHeure(R), m = METEO[etat.meteo[etat.jour - 1]];
  const passe = Math.floor(tickJour / tph), ligne = Math.floor((tickJour % tph) * T.H / tph);
  while (etat.hydro.passe < passe) {
    hydroLignes(T, etat.hydro.ligne, T.H, m, R);
    etat.hydro.passe++; etat.hydro.ligne = 0;
  }
  if (ligne > etat.hydro.ligne) { hydroLignes(T, etat.hydro.ligne, ligne, m, R); etat.hydro.ligne = ligne; }
}

function calculerCoutsBande(B, b0, b1, gel) {
  if (b1 <= b0) return;
  const { terrain: T, R } = B;
  // calculerCouts travaille sur tout le terrain : on lui passe une vue des rangées de la bande
  const { bw } = dimensionsCouts(T);
  const H = Math.min(T.H, b1 * BLOC) - b0 * BLOC;
  const vue = { ...T, H, base: T.base.subarray(b0 * BLOC * T.W), diff: T.diff.subarray(b0 * BLOC * T.W), eau: T.eau.subarray(b0 * BLOC * T.W), humid: T.humid.subarray(b0 * BLOC * T.W), troncon: T.troncon ? T.troncon.subarray(b0 * BLOC * T.W) : null,
    profond: T.profond.subarray(b0 * BLOC * T.W), pont: T.pont.subarray(b0 * BLOC * T.W), pontH: T.pontH.subarray(b0 * BLOC * T.W) };      // (l'eau profonde et les ponts aussi : sans eux, une bande refaite lisait d'autres rangées, v0.47.2)
  calculerCouts(vue, R, B.coutsNeufs.subarray(b0 * bw, b1 * bw), gel);
}

// Le champ de l'ordre d'un régiment (ou null : tout près, pas besoin)
/* Quand les coûts changent, tous les régiments redemandaient leur champ dans le même pas (5 ms chacun : 55 à 100 ms d'un coup, toutes les 2,7 s ; v0.34.4).
   Chacun garde donc l'ancienne version (`coutsPrec`, sauvegardée) un délai à lui, puis passe à la nouvelle : un champ par intervalle au lieu de seize d'un coup.
   Le délai ne vient que de l'état (le numéro du régiment, le temps de la version) : la partie relue suit les mêmes champs. */
function champDe(B, reg) {
  if (!reg.effectif) return null;
  const { couts: c } = B.etat, F = B.R.foule;
  const neuf = B.etat.temps - c.depuis >= (reg.id % F.champGroupes) * F.champRetard;
  return B.champs.champ(neuf ? B.couts : B.coutsPrec, neuf ? c.version : c.version - 1, reg.ordre.x, reg.ordre.y);
}

// ─── En face : des barrages sur nos hommes les plus serrés, et des avances ──
/* La posture d'en face (v0.36.3, `ia.stance`) : un régiment qui tient sa propre tranchée prend la posture du réglage ; celui qui est parti vers l'une de nos
   lignes, ou qui est en déroute, tire à volonté. Lue de l'ordre, sans hasard : la partie relue est la même. */
function postureIA(B) {
  const { etat, R } = B;
  if (!STANCES[R.ia.stance]) return;
  for (const reg of etat.regiments) {
    if (reg.camp !== EUX || !reg.effectif) continue;
    const t = reg.ordre.trace;
    reg.stance = t && t.ligne >= 10 && !reg.deroute ? R.ia.stance : STANCE_DEFAUT;
  }
}
function enFace(B, rng) {
  const { etat, R, armee: A } = B;
  if (etat.deux) return;                     // un joueur commande en face : pas d'IA
  if (R.ia.stance) postureIA(B);
  const S = secteurDuJeu(etat);
  if (etat.temps >= etat.ia.barrage) {
    etat.ia.barrage = etat.temps + R.ia.barrage * (etat.iaRythme?.barrage ?? 1) * (0.6 + rng() * 0.8);
    const d = A.dens[NOUS];
    let best = -1, bn = 0;
    for (let b = 0; b < d.length; b++) if (d[b] > bn) { bn = d[b]; best = b; }
    if (best >= 0) {
      const bx = best % A.dw, by = (best - bx) / A.dw;
      const cal = rng.weighted([{ v: '75', w: 6 }, { v: '155', w: 3 }, { v: '220', w: 1 }]);
      ordonnerBarrage(B, cal, (bx + 0.5) * DENSITE + (rng() - 0.5) * 20, (by + 0.5) * DENSITE + (rng() - 0.5) * 20, EUX);
    }
  }
  if (etat.temps >= etat.ia.offensive) {
    etat.ia.offensive = etat.temps + R.ia.offensive * (etat.iaRythme?.offensive ?? 1) * (0.7 + rng() * 0.6);
    if (etat.tranchees) {
      // l'assaut : un régiment encore fort, dans ses tranchées, sort et va prendre notre ligne la plus proche, en face de lui
      const leurs = etat.regiments.filter(r => r.camp === EUX && r.effectif > r.initial * R.tranchee.assaut && r.ordre.trace?.ligne >= 10 && !r.deroute && r.refus !== etat.jour && r.moral >= R.moral.ebranle + 0.1);
      if (leurs.length) {
        const nos = B.lignes.filter(L => L.camp === NOUS).sort((a, b) => a.y0 - b.y0);
        // pour chaque régiment, la première de nos lignes qu'on tient encore en face de lui, et combien la défendent
        const options = leurs.map(reg => {
          const t = reg.ordre.trace;
          const cible = nos.find(L => B.troncons.some((tr, k) => tr.ligne === B.lignes.indexOf(L) && etat.troncons[k] === NOUS && tr.x1 > t.x0 && tr.x0 < t.x1));
          let def = 0;
          if (cible) for (let i = 0; i < A.n; i++) if (A.camp[i] === NOUS && A.x[i] > t.x0 - 10 && A.x[i] < t.x1 + 10 && Math.abs(A.y[i] - cible.y0) < 8) def++;
          return { reg, cible, def, rapport: reg.effectif / Math.max(1, def) };
        }).filter(o => o.cible).sort((a, b) => b.rapport - a.rapport || a.reg.id - b.reg.id);
        const o = options[0];
        // il ne sort que là où il est le plus fort (au moins R.tranchee.rapport attaquants par défenseur) ;
        // sinon il prépare : un barrage lourd sur ce tronçon (des assauts partout, n'importe où, le saignaient à blanc)
        // (le carnet de bord : le tronçon que ça vise)
        const visee = o && B.troncons.findIndex(tr => tr.ligne === B.lignes.indexOf(o.cible) && tr.x1 > o.reg.ordre.trace.x0 && tr.x0 < o.reg.ordre.trace.x1);
        if (o && o.rapport >= R.tranchee.rapport) { o.reg.ordre = formationTranchee(o.reg, o.cible, o.reg.ordre.trace.x0, o.reg.ordre.trace.x1, R); reattribuer(B, o.reg); B.evenements.push({ type: 'assaut', camp: EUX, reg: o.reg.id, troncon: visee }); }
        else if (o) { const t = o.reg.ordre.trace; ordonnerBarrage(B, '220', (t.x0 + t.x1) / 2 + (rng() - 0.5) * 30, o.cible.y0, EUX); B.evenements.push({ type: 'preparation', camp: EUX, reg: o.reg.id, troncon: visee }); }
      }
    } else {
      const leurs = etat.regiments.filter(r => r.camp === EUX && r.effectif > r.initial * 0.4);
      if (leurs.length) {
        const reg = rng.pick(leurs);
        reg.ordre = { ...reg.ordre, y: Math.min(zone(B).y0 + S.ligne.nous - 40, reg.ordre.y + R.ia.avance) };
        reattribuer(B, reg);
      }
    }
  }
  // un régiment d'en face trop éprouvé retourne à son départ
  for (const reg of etat.regiments) {
    if (reg.camp === EUX && reg.effectif && reg.effectif < reg.initial * 0.4 && reg.ordre.y !== reg.depart.y) {
      reg.ordre = structuredClone(reg.depart); reattribuer(B, reg);
    }
  }
}

/* L'aube : le jour suivant commence. */
/* L'aube : les corvées de la nuit (choix : { id de nos régiments : corvée },
   nuit.js), puis le jour suivant commence. Rend le bilan de la nuit. */
export function aube(B, choix = {}) {
  const { etat, R } = B;
  if (etat.phase !== 'nuit') return { refus: 'Ce n\'est pas la nuit.' };
  const rng = createRng(etat.graine); rng.setState(etat.rng);
  B.evenements = [];
  const soir = etat.regiments.map(r => r.moral);      // le moral du soir (la nuit en rend une part)
  const bilan = corvees(B, choix, { rng, mourir: (i, cause, ou) => mourir(B, i, cause, ou) });
  // le refus d'un jour : un régiment brisé (moral au plus bas, saigné) refuse de monter de toute la journée ;
  // il tient sa tranchée et rien de plus (le Discours de la servitude volontaire : il suffit de ne plus servir)
  const M = R.moral;
  for (const reg of etat.regiments) {
    if (!reg.effectif || (soir[reg.id] ?? 1) >= M.refusSous || reg.pertes < reg.initial * M.refusPertes || rng() >= M.refusChance) continue;
    reg.refus = etat.jour + 1;
    (bilan[reg.camp].refus ??= []).push(reg.id);
  }
  compacter(B.armee);
  etat.rng = rng.state;
  etat.jour++; etat.tickJour = 0; etat.phase = 'jour';
  reparerAvions(etat);
  etat.hydro = { passe: 0, ligne: 0 };
  etat.pertesJour.push([0, 0]);
  etat.avionsJour.push([[0, 0], [0, 0]]);
  etat.prises.push([0, 0]);
  return { ok: true, bilan };
}

// ─── Lecture ─────────────────────────────────────────────────────────────

export function horloge(B) {
  const { etat, R } = B;
  const f = etat.tickJour / ticksParJour(R);
  const h = R.jour.heureDebut + f * (R.jour.heureFin - R.jour.heureDebut);
  return {
    jour: etat.jour, jours: etat.meteo.length, phase: etat.phase,
    heure: Math.floor(h), minute: Math.floor((h % 1) * 60),
    meteo: etat.meteo[etat.jour - 1], prevision: etat.previsions[etat.jour - 1],
    gel: !!METEO[etat.meteo[etat.jour - 1]].gel, neige: !!METEO[etat.meteo[etat.jour - 1]].neige, chaud: !!METEO[etat.meteo[etat.jour - 1]].chaud, saison: etat.sol?.saison ?? SAISON_DEFAUT,
    tempete: !!METEO[etat.meteo[etat.jour - 1]].tempete,
    temperature: temperature(etat.sol?.saison, etat.meteo[etat.jour - 1], etat.graine, etat.jour),
    // le sol est blanc l'hiver tout entier, et un jour de neige où qu'on soit (v0.54.0)
    enneige: etat.sol?.saison === 'hiver' || !!METEO[etat.meteo[etat.jour - 1]].neige,
  };
}
/* Pour regarder un terrain sans jouer (la vue 3D de l'atelier) : l'heure du premier jour et le temps qu'il fait ; rien d'autre ne change */
export function regarderAu(B, heure, meteo = 'sec') {
  const { etat, R } = B, d = R.jour.heureDebut, f = Math.max(0, Math.min(0.999, (heure - d) / (R.jour.heureFin - d)));
  etat.tickJour = Math.round(f * ticksParJour(R));
  etat.meteo[etat.jour - 1] = meteo;
}
export const effectifs = B => [NOUS, EUX].map(c => B.etat.regiments.filter(r => r.camp === c).reduce((s, r) => s + r.effectif, 0));

// ─── Sauvegarde ──────────────────────────────────────────────────────────

export function photo(B) {
  return {
    ...structuredClone(B.etat),
    armee: photoArmee(B.armee),
    coutsActuels: b64(B.couts), coutsNeufs: b64(B.coutsNeufs), coutsPrec: b64(B.coutsPrec),
  };
}

/* Relire une partie en étapes (v0.28.0 : la barre de chargement) : un générateur qui rend `[part faite, ce qu'on fait]` entre deux morceaux de travail,
   et la bataille à la fin (`restaurer` le vide d'un coup : mêmes pas, même partie). */
export function restaurer(p, R) {
  const g = etapesRestaurer(p, R);
  for (;;) { const s = g.next(); if (s.done) return s.value; }
}
export function* etapesRestaurer(p, R) {
  yield [0, 'La sauvegarde'];
  const { armee, coutsActuels, coutsNeufs, coutsPrec, ...reste } = structuredClone(p);
  const etat = reste;
  // une sauvegarde d'avant les marges (v0.2) : tout glisse de la largeur des marges
  const avantMarges = !etat.marges;
  if (avantMarges) {
    const m = etat.marges = { ...secteurDuJeu(etat).marges };
    for (const imp of etat.impacts) { imp[2] += m.x * 10; imp[3] += m.y * 10; }
    for (const r of etat.regiments) for (const o of [r.ordre, r.depart]) { o.x += m.x; o.y += m.y; }
    for (const b of etat.barrages) { b.x += m.x; b.y += m.y; }
    etat.couts = { bande: 0, version: (etat.couts?.version || 1) + 1 };
  }
  etat.blesses ??= [0, 0];
  etat.corps ??= [];          // (avant la v0.3.3, les morts ne restaient pas)
  etat.grades ??= {};
  etat.reserves ??= [0, 0]; etat.mission ??= null; etat.issue ??= null;   // (avant la v0.9.0 : ni mission ni réserves)
  etat.parRegiment ??= Math.floor(etat.parCamp / secteurDuJeu(etat).regiments);
  etat.travaux ??= []; etat.tombes ??= []; etat.evacues ??= []; etat.nuits ??= [];   // (avant la v0.6.0 : pas de corvées)
  for (const reg of etat.regiments) { reg.moral ??= R.moral.depart; reg.deroute ??= false; reg.vivres ??= R.nuit.vivres; reg.stance ??= STANCE_DEFAUT; }   // (avant la v0.5.0 : pas de moral ; avant la v0.36.0 : pas de posture)
  etat.chars ??= []; etat.mitraillages ??= []; etat.pontsRompus ??= []; etat.genies ??= []; etat.pontsRepares ??= []; etat.sapeurs ??= sectionsDeDepart();   // (avant la v0.46.0 : pas d'avions)
  etat.deux ??= false; etat.batteriesEux ??= Object.fromEntries(NOMS_CALIBRES.map(c => [c, 0]));
  etat.abris ??= {};   // (avant la v0.11.0 : ni abris ; ni vivres)
  etat.troncons ??= []; etat.melee ??= etat.troncons.map(() => 0); etat.prises ??= etat.pertesJour.map(() => [0, 0]);   // (avant la v0.4.0 : pas de tranchées)
  yield [0.1, 'Le terrain'];
  const B = monter(etat, R);
  yield [0.25, 'Les obus et la pluie'];
  for (const f of etapesRejouer(B)) yield [0.25 + f * 0.65, 'Les obus et la pluie'];
  yield [0.92, 'Les hommes'];
  restaurerArmee(B.armee, armee);
  if (avantMarges) {
    for (let i = 0; i < B.armee.n; i++) { B.armee.x[i] += etat.marges.x; B.armee.y[i] += etat.marges.y; }
    calculerCouts(B.terrain, R, B.couts, false);
    B.coutsNeufs.set(B.couts); B.coutsPrec.set(B.couts);
  } else {
    B.couts.set(deB64(coutsActuels, Uint8Array));
    B.coutsNeufs.set(deB64(coutsNeufs, Uint8Array));
    B.coutsPrec.set(coutsPrec ? deB64(coutsPrec, Uint8Array) : B.couts);   // (avant la v0.34.4 : pas de version précédente, tous suivent la nouvelle)
  }
  etat.couts.depuis ??= -1e9;
  return B;
}

/* Refait le relief, l'eau et les arbres depuis la graine et les impacts, pas
   à pas, dans le même ordre que la partie : impacts du pas, puis l'eau ; la
   nuit en lot. */
export function rejouerTerrain(B) { for (const _ of etapesRejouer(B)); }
export function* etapesRejouer(B) {
  const { etat, R, terrain: T } = B;
  const tpj = ticksParJour(R);
  let k = 0, fait = 0;
  const total = Math.max(1, (etat.jour - 1) * tpj + etat.tickJour);      // (les pas à rejouer : la part faite se lit dessus)
  const imp = etat.impacts, rompus = etat.pontsRompus ?? [], repares = etat.pontsRepares ?? [];
  let rp = 0, rr = 0;
  for (let jour = 1; jour <= etat.jour; jour++) {
    const fin = jour < etat.jour ? tpj : etat.tickJour;
    const m = METEO[etat.meteo[jour - 1]];
    const sauve = { jour: etat.jour, hydro: etat.hydro };
    etat.jour = jour; etat.hydro = { passe: 0, ligne: 0 };
    for (let t = 1; t <= fin; t++) {
      while (k < imp.length && imp[k][0] === jour && imp[k][1] === t) {
        const [, , x10, y10, ci] = imp[k];
        impact(T, x10 / 10, y10 / 10, NOMS_CALIBRES[ci], R, k, !!m.gel);
        k++;
      }
      while (rp < rompus.length && rompus[rp][1] === jour && rompus[rp][2] === t) { const P = T.pontsListe[rompus[rp][0]]; if (P) detruirePont(T, P.cases[0] % T.W, (P.cases[0] / T.W) | 0, 0); rp++; }      // (un pont tombé sous un char)
      while (rr < repares.length && repares[rr][1] === jour && repares[rr][2] === t) { const P = T.pontsListe[repares[rr][0]]; if (P) reconstruirePont(T, P); rr++; }      // (un pont refait par le génie)
      avancerEau(B, t);
      if (++fait % 300 === 0) yield fait / total;
    }
    etat.jour = sauve.jour; etat.hydro = sauve.hydro;
    if (jour < etat.jour || etat.phase !== 'jour') for (let p = 0; p < 12; p++) hydroLignes(T, 0, T.H, m, R);
    // puis les travaux de la nuit, dans le même ordre que la partie (l'aube vient après l'eau de la nuit)
    if (jour < etat.jour) rejouerTravaux(B, jour);
  }
  T.coupes.length = 0;      // (les hommes ont été relevés dans la partie d'alors : rien à refaire pour les ponts coupés du rejeu)
}

export { DENSITE };
