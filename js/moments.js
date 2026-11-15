// Les moments clés de la bataille (Jérôme, 15 nov., v0.134.0 : « l'écran de fin : des moments clés » ; « des compteurs par jour ») : logique pure, aucun DOM, aucun hasard.
// Le carnet de bord n'est pas sauvegardé ; ce qu'en garde la fin de partie tient ici, dans l'état : pour chaque jour, et par camp, le nombre de déroutes, d'assauts d'en face, de chars
// détruits, d'avions abattus, de postes de mitrailleuse détruits, de ponts tombés (coupés par un obus ou rompus sous un char : un pont n'a pas de camp, il compte dans la case 0) et de
// travaux du génie finis (un pont refait, un char, un avion ou un poste remis en état). Les tronçons pris et perdus sont déjà dans `etat.prises` ; le temps, dans `etat.meteo`.
// Chaque régiment compte aussi ses déroutes (`reg.deroutes`, les médailles du roc et du fuyard). Lu à la fin par `lireBataille` (donnees-jour.js).
export const GENRES = ['deroutes', 'assauts', 'chars', 'avions', 'postes', 'ponts', 'genie'];
const PAR_EVENEMENT = {
  deroute: 'deroutes', assaut: 'assauts', 'char-detruit': 'chars', 'avion-abattu': 'avions', 'nid-detruit': 'postes', 'pont-coupe': 'ponts', 'pont-rompu': 'ponts',
  'pont-repare': 'genie', 'char-repare': 'genie', 'char-releve': 'genie', 'avion-repare': 'genie', 'nid-repare': 'genie',
};
export const jourVide = () => Object.fromEntries(GENRES.map(g => [g, [0, 0]]));

/* Les événements d'un pas (ceux que `avancer` rend) entrent dans le compte du jour en cours ; rien d'autre ne change */
export function noterMoments(etat, evenements) {
  for (const ev of evenements) {
    const g = PAR_EVENEMENT[ev.type];
    if (!g) continue;
    while (etat.moments.length < etat.jour) etat.moments.push(jourVide());      // (jamais de trou : un tableau creux se relirait autrement)
    etat.moments[etat.jour - 1][g][g === 'ponts' || ev.camp !== 1 ? 0 : 1]++;
    if (ev.type === 'deroute') { const r = etat.regiments.find(x => x.id === ev.reg); if (r) r.deroutes = (r.deroutes || 0) + 1; }
  }
}
