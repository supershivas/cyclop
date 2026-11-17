// Qui joue quoi pour les hommes articulés (étape 4 de docs/chantiers/animations-vers-le-jeu.md). Logique pure (le temps est un argument) : pour un homme, la pose du lecteur d'animations
// (marche, repos, tir) écrite dans les 25 nombres de la texture de poses, ou `null` pour les états sans animation (feu retenu, accroupi, couché, mêlée, blessures, officier au pistolet),
// que `poseJeu` (pose-jeu.js) continue de calculer. Un état de lecteur par homme (le fondu de 0,2 s en a besoin), purgé quand l'homme sort des hommes articulés (`fin`).
import { nouvelEtat, etatAnimationTab, termine } from '../lecteur-animations.js?v=0.144.3';
import { ANIMATIONS } from '../data/animations.js?v=0.144.3';
import { ANIM_JEU, MARCHE_JEU, CANAUX_TIR_EN_MARCHE, ALLURES, EPAULEMENT } from '../data/lecteur-animations.js?v=0.144.3';
import { NOMS_CHAMPS } from '../data/poses-soldat.js?v=0.144.3';
import { FLOTTANTS } from './pose-jeu.js?v=0.144.3';


const I_TORSION = NOMS_CHAMPS.indexOf('torsion'), I_BUSTE = NOMS_CHAMPS.indexOf('buste'), I_TETE = NOMS_CHAMPS.indexOf('tete');
const lisse = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// h : { vit, tir (comme soldats.js l'écrit : −1 feu retenu, 0..1 l'épaule, 2..3 la mêlée), coup (le `tirVal` brut : 1 au coup de feu, puis il retombe), tapi, couche, blessure, rang | aspect.rang }
export function avecAnimation(h) {
  const rang = h.rang ?? h.aspect?.rang ?? 6, tir = h.tir ?? 0;
  return rang >= 2.5 && !(h.tapi > 0) && !(h.couche > 0) && !(h.blessure > 0) && tir > -0.5 && tir < 1.5;
}

// `allures` (v0.141.2, les démarches) : { marche: [noms], repos: [noms] } de js/anim-modeles.js (`allures`), dont les animations sont dans `animations` ; chaque homme joue celles de son numéro,
// à sa cadence, épaule avant son coup (`h.avant` : les secondes jusqu'au prochain, Infinity s'il n'est pas au feu) et tourne le buste vers sa cible en marchant (`h.vise`, rad). Sans `allures` : le jeu d'avant.
// `h.geste` (les gestes d'attente, v0.144.1) : 'froid', 'pluie', 'guetteur' ou 'gestes' joue, au repos, la boucle de ce geste quand elle a été ajoutée (`ajouterGeste`), sinon le repos de son allure
export function creerJeuAnimations({ animations: liste = ANIMATIONS, allures = null, sortie = new Float32Array(FLOTTANTS) } = {}) {
  let animations = liste;
  const hommes = new Map(), duree = nom => animations.find(a => a.nom === nom).duree;
  const animMarche = duree(ANIM_JEU.marche), animTir = animations.find(a => a.nom === ANIM_JEU.tir);
  const K = allures ? allures.marche.length : 0, dureesMarche = allures ? allures.marche.map(duree) : null, dureesRepos = allures ? allures.repos.map(duree) : null;
  const nomTir = allures?.tir ?? ANIM_JEU.tir, animTirJoue = animations.find(a => a.nom === nomTir);       // (les démarches : le tir épaulé, la crosse à l'épaule)
  let image = 0;
  return {
    hommes,
    debut() { image++; },
    // La pose de l'homme `id` à l'instant `t` (le temps du jeu : figé à la pause), dans `sortie` ; null s'il n'a pas d'animation (l'appelant garde poseJeu).
    pose(id, h, t) {
      if (!avecAnimation(h)) { hommes.delete(id); return null; }       // (il n'y aura pas de fondu entre un état animé et un état calculé : la pose y saute)
      let e = hommes.get(id);
      const coup = h.coup ?? 0;
      if (!e) {
        const u = (Math.imul(id + 1, 2654435761) >>> 0) / 4294967296, k = K ? (Math.imul(id + 7, 2246822519) >>> 0) % K : -1;      // (son allure : un autre hachage de son numéro)
        hommes.set(id, e = { etat: nouvelEtat(), ta: u * (K ? dureesMarche[k] : animMarche), tr: K ? ((Math.imul(id + 29, 1597334677) >>> 0) / 4294967296) * dureesRepos[k] : 0, t: t, coup, tir: null, vu: 0, k,
          cad: K ? 1 + ALLURES.cadence * (2 * ((Math.imul(id + 13, 3266489917) >>> 0) / 4294967296) - 1) : 1 });       // (la foulée de départ : un hachage du numéro, pour que la troupe ne marche pas au pas)
      }
      e.vu = image;
      const dt = Math.min(0.25, Math.max(0, t - e.t)); e.t = t;
      const marche = (h.vit ?? 0) > MARCHE_JEU.seuil;
      if (marche) e.ta += dt * e.cad * Math.min(MARCHE_JEU.lectureMax, Math.max(MARCHE_JEU.lectureMin, h.vit / MARCHE_JEU.reference));      // la vitesse de lecture suit la vitesse ; `ta` garde la phase quand elle change
      if (e.tir && termine(animTirJoue, e.tir, t)) e.tir = null;                                       // le tir « qu'on laisse finir » : un coup pendant ce temps n'en relance pas un
      if (!e.tir && coup > 0.5 && coup - e.coup >= MARCHE_JEU.saut) e.tir = { anim: nomTir, depart: t, canaux: marche ? CANAUX_TIR_EN_MARCHE : undefined };
      // (les démarches) il épaule AVANT son coup : l'animation part pour que son recul (à `avance` s de son début) tombe avec le coup de feu
      if (K && !e.tir && h.avant < EPAULEMENT.avance) e.tir = { anim: nomTir, depart: t - (EPAULEMENT.avance - Math.max(0, h.avant)), canaux: marche ? CANAUX_TIR_EN_MARCHE : undefined };
      e.coup = coup;
      const couches = [marche ? { anim: K ? allures.marche[e.k] : ANIM_JEU.marche, cle: 'marche', depart: t - e.ta } : (K && h.geste && allures.gestes?.[h.geste] ? { anim: allures.gestes[h.geste][e.k % allures.gestes[h.geste].length], cle: 'repos:' + h.geste, depart: -e.tr } : { anim: K ? allures.repos[e.k] : ANIM_JEU.repos, cle: 'repos', depart: -e.tr })];
      if (e.tir) { e.tir.canaux = marche ? CANAUX_TIR_EN_MARCHE : undefined; couches.push(e.tir); }  // (en marche : les bras et le fusil du tir ; à l'arrêt : tout)
      sortie.set(etatAnimationTab(e.etat, couches, t, { animations }));
      if (h.courbe && marche) { sortie[I_BUSTE] += MARCHE_JEU.courbe.buste; sortie[I_TETE] += MARCHE_JEU.courbe.tete; }      // (v0.142.3) il court courbé sous le feu       // (28 flottants : les 7 texels sont pleins)
      // (les démarches) il vise en marchant : le buste tourne vers sa cible pendant le tir (la torsion), le temps que le fusil se lève et jusqu'à ce qu'il redescende
      if (K && e.tir && h.vise) { const tt = t - e.tir.depart; sortie[I_TORSION] += h.vise * lisse(0, 0.2, tt) * (1 - lisse(0.8, 1, tt)); }
      return sortie;
    },
    // Retire les hommes qui n'ont pas été vus depuis `debut` (sortis des plus proches)
    fin() { for (const [id, e] of hommes) if (e.vu !== image) hommes.delete(id); },
    vider() { hommes.clear(); },
    // un geste d'attente : ses boucles (une par allure) rejoignent les animations jouées ; les hommes gardent leur état (pas de saut)
    ajouterGeste(geste, anims) { if (!allures) return; animations = [...animations, ...anims]; (allures.gestes ??= {})[geste] = anims.map(a => a.nom); },
    aGeste(geste) { return !!allures?.gestes?.[geste]; },
  };
}
