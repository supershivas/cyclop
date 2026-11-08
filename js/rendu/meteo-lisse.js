// La météo du labo lumière dans le jeu (session 4, « Éclairage : haut ») : au lieu de basculer d'un coup au changement de jour, le ciel, le soleil et la brume GLISSENT d'un temps à l'autre
// (le labo, `melangerMeteo` de lumiere/ciel.js), et la couverture des nuages respire un peu (le labo : la météo qui évolue). Logique pure : aucun DOM, aucune horloge (le temps est celui du dessin), aucun hasard.
// Ce qui ne glisse pas : la pluie et la neige (des particules, qui paraissent ou non) et tout ce qui est règle (le sol, la boue, le gel) : la météo de la bataille reste celle du jour.
export const TEMPS_LISSE = {                       // par temps du jeu (data/meteo.js) : soleil = la force des ombres portées (1 plein soleil, 0 sans ombre), brume = la force du voile de brouillard
  sec: { soleil: 1, brume: 0 }, beau: { soleil: 1, brume: 0 }, canicule: { soleil: 1, brume: 0 }, gel: { soleil: 0.85, brume: 0 },
  couvert: { soleil: 0.35, brume: 0 }, pluie: { soleil: 0.3, brume: 0 }, brouillard: { soleil: 0.35, brume: 1 }, neige: { soleil: 0.3, brume: 0 }, tempete: { soleil: 0.2, brume: 0.55 },
};
// vitesse : la part de l'écart rattrapée par seconde (le labo : 0,12 ; plus vif ici, un jour du jeu est court) ; respiration : l'amplitude de la couverture (part du ciel) et sa période (s)
export const LISSE = { vitesse: 0.35, respiration: 0.07, periodeS: 41 };

export function creerMeteoLisse() {
  const e = { soleil: 1, brume: 0, decalCouv: 0, pret: false };
  return {
    etat: e,
    // nom : le temps du jour ; dt : s ; t : le temps du dessin ; rend l'état (le même objet)
    maj(nom, dt, t) {
      const C = TEMPS_LISSE[nom] || TEMPS_LISSE.sec, a = e.pret ? 1 - Math.exp(-Math.max(0, dt) * LISSE.vitesse) : 1;
      const r = Math.sin(t * 2 * Math.PI / LISSE.periodeS);                  // un nuage qui passe : de la couverture en plus, du soleil en moins
      e.decalCouv = LISSE.respiration * r;
      e.brume += (C.brume - e.brume) * a;
      e.soleil += (C.soleil * (1 - 2 * Math.max(0, e.decalCouv)) - e.soleil) * a;
      e.pret = true; return e;
    },
    oublier() { e.pret = false; e.soleil = 1; e.brume = 0; e.decalCouv = 0; },      // l'éclairage quitte « haut » : la prochaine fois, on repart du temps du jour sans glisser
  };
}
