// Qui joue quoi pour les hommes articulés (étape 4 de docs/chantiers/animations-vers-le-jeu.md). Logique pure (le temps est un argument) : pour un homme, la pose du lecteur d'animations
// (marche, repos, tir) écrite dans les 25 nombres de la texture de poses, ou `null` pour les états sans animation (feu retenu, accroupi, couché, mêlée, blessures, officier au pistolet),
// que `poseJeu` (pose-jeu.js) continue de calculer. Un état de lecteur par homme (le fondu de 0,2 s en a besoin), purgé quand l'homme sort des hommes articulés (`fin`).
import { nouvelEtat, etatAnimationTab, termine } from '../lecteur-animations.js?v=0.131.0';
import { ANIMATIONS } from '../data/animations.js?v=0.131.0';
import { ANIM_JEU, MARCHE_JEU, CANAUX_TIR_EN_MARCHE } from '../data/lecteur-animations.js?v=0.131.0';
import { FLOTTANTS } from './pose-jeu.js?v=0.131.0';


// h : { vit, tir (comme soldats.js l'écrit : −1 feu retenu, 0..1 l'épaule, 2..3 la mêlée), coup (le `tirVal` brut : 1 au coup de feu, puis il retombe), tapi, couche, blessure, rang | aspect.rang }
export function avecAnimation(h) {
  const rang = h.rang ?? h.aspect?.rang ?? 6, tir = h.tir ?? 0;
  return rang >= 2.5 && !(h.tapi > 0) && !(h.couche > 0) && !(h.blessure > 0) && tir > -0.5 && tir < 1.5;
}

export function creerJeuAnimations({ animations = ANIMATIONS, sortie = new Float32Array(FLOTTANTS) } = {}) {
  const hommes = new Map(), duree = nom => animations.find(a => a.nom === nom).duree;
  const animMarche = duree(ANIM_JEU.marche), animTir = animations.find(a => a.nom === ANIM_JEU.tir);
  let image = 0;
  return {
    hommes,
    debut() { image++; },
    // La pose de l'homme `id` à l'instant `t` (le temps du jeu : figé à la pause), dans `sortie` ; null s'il n'a pas d'animation (l'appelant garde poseJeu).
    pose(id, h, t) {
      if (!avecAnimation(h)) { hommes.delete(id); return null; }       // (il n'y aura pas de fondu entre un état animé et un état calculé : la pose y saute)
      let e = hommes.get(id);
      const coup = h.coup ?? 0;
      if (!e) hommes.set(id, e = { etat: nouvelEtat(), ta: ((Math.imul(id + 1, 2654435761) >>> 0) / 4294967296) * animMarche, t: t, coup, tir: null, vu: 0 });       // (la foulée de départ : un hachage du numéro, pour que la troupe ne marche pas au pas)
      e.vu = image;
      const dt = Math.min(0.25, Math.max(0, t - e.t)); e.t = t;
      const marche = (h.vit ?? 0) > MARCHE_JEU.seuil;
      if (marche) e.ta += dt * Math.min(MARCHE_JEU.lectureMax, Math.max(MARCHE_JEU.lectureMin, h.vit / MARCHE_JEU.reference));      // la vitesse de lecture suit la vitesse ; `ta` garde la phase quand elle change
      if (e.tir && termine(animTir, e.tir, t)) e.tir = null;                                       // le tir « qu'on laisse finir » : un coup pendant ce temps n'en relance pas un
      if (!e.tir && coup > 0.5 && coup - e.coup >= MARCHE_JEU.saut) e.tir = { anim: ANIM_JEU.tir, depart: t, canaux: marche ? CANAUX_TIR_EN_MARCHE : undefined };
      e.coup = coup;
      const couches = [marche ? { anim: ANIM_JEU.marche, cle: 'marche', depart: t - e.ta } : { anim: ANIM_JEU.repos, cle: 'repos', depart: 0 }];
      if (e.tir) { e.tir.canaux = marche ? CANAUX_TIR_EN_MARCHE : undefined; couches.push(e.tir); }  // (en marche : les bras et le fusil du tir ; à l'arrêt : tout)
      sortie.set(etatAnimationTab(e.etat, couches, t, { animations }));       // (les 3 derniers flottants du dernier texel ne servent pas : ils restent à zéro)
      return sortie;
    },
    // Retire les hommes qui n'ont pas été vus depuis `debut` (sortis des plus proches)
    fin() { for (const [id, e] of hommes) if (e.vu !== image) hommes.delete(id); },
    vider() { hommes.clear(); },
  };
}
