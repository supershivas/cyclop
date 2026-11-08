// Les données d'une journée, lues dans la bataille (refonte de la visualisation des données, Jérôme, 7 nov.) : logique pure (aucun DOM), lecture seule de l'état.
// Le bilan du soir, les fiches et leurs graphiques ne lisent que cette forme-là : `lireJournee(B, camp)` la tire d'une vraie bataille, le labo en fabrique d'exemple (`js/labo-donnees.js`).
// Rien n'est ajouté à l'état ni à la sauvegarde. Ce qui manque est dit à voix haute dans `manque` (la liste de ce qu'il faudrait compter pour aller plus loin).
//
// Forme : { jour, jours, camps: [nous, eux], tronconsTenus: [nous, eux], manque: [...] }, chaque camp :
//   { initial, debout, blesses, morts, evacues, mortsJour, mortsParJour: [..], prisParJour: [..], avions: { sorties, perdus, restent },
//     effectifParJour: [..] (les hommes vivants au soir de chaque jour, le jour même compris), blessesParJour: [..] (les nouvelles blessures de chaque jour),
//     regiments: [{ numero, nom, initial, debout, blesses, morts, evacues, mortsJour, moral, niveau: 'tient' | 'ebranle' | 'deroute',
//                   historique: [{ jour, vivants, blesses, morts, moral }] }] }   (l'historique vient de `etat.histo`, un instantané par soir, v0.120.0)
// `camp` : le camp du joueur (0 : nous) ; `camps[0]` est toujours le sien.

// Ce que l'état ne garde toujours pas (l'historique des soirs, `etat.histo`, a comblé les effectifs et les blessés par jour, v0.120.0)
export const MANQUE = [
  'Un historique par soldat (sa peur, sa fatigue et ses caractéristiques jour après jour : seules les valeurs d\'aujourd\'hui et de départ existent)',
];

const niveauMoral = (reg, R) => reg.deroute || reg.moral < R.moral.deroute ? 'deroute' : reg.moral < R.moral.ebranle ? 'ebranle' : 'tient';

export function lireJournee(B, camp = 0, R = B.R) {
  const { etat, armee: A } = B, jour = etat.jour, H = etat.histo || [];
  const par = c => {
    const regs = etat.regiments.filter(r => r.camp === c);
    const regiments = regs.map((r, k) => {
      let blesses = 0;
      for (let i = 0; i < A.n; i++) if (A.reg[i] === r.id && A.blessure[i]) blesses++;
      const releves = r.releves || 0;
      const historique = H.filter(h => h.jour < jour && h.regs[r.id]).map(h => ({ jour: h.jour, vivants: h.regs[r.id][0], blesses: h.regs[r.id][1], morts: h.regs[r.id][2], moral: h.regs[r.id][3] / 100 }));
      historique.push({ jour, vivants: r.effectif, blesses, morts: r.pertes, moral: r.moral });       // le soir d'aujourd'hui : lu en direct, il n'est dans l'historique qu'à l'aube
      return {
        historique, numero: k + 1, nom: r.nom || null, initial: r.initial, debout: Math.max(0, r.effectif - blesses), blesses, morts: r.pertes,
        evacues: Math.max(0, r.initial - r.effectif - r.pertes - releves), mortsJour: r.pertes - (r.debut?.pertes || 0), moral: r.moral, niveau: niveauMoral(r, R),
      };
    });
    const somme = k => regiments.reduce((s, r) => s + r[k], 0);
    const mortsParJour = etat.pertesJour.map(p => p[c]);
    const effectifParJour = Array.from({ length: jour }, (_, k) => regiments.reduce((t, r) => t + (r.historique.find(h => h.jour === k + 1)?.vivants ?? 0), 0));
    const cumulBlesses = [...H.filter(h => h.jour < jour).map(h => h.blesses[c]), etat.blesses[c]];
    const blessesParJour = cumulBlesses.map((v, k) => v - (cumulBlesses[k - 1] ?? 0));
    const [sorties, perdus] = etat.avionsJour[jour - 1]?.[c] ?? [0, 0];
    return {
      initial: somme('initial'), debout: somme('debout'), blesses: somme('blesses'), morts: etat.pertes[c], evacues: somme('evacues'),
      mortsJour: mortsParJour[jour - 1] ?? 0, mortsParJour, effectifParJour, blessesParJour, prisParJour: etat.prises.map(p => p[c]),
      avions: { sorties, perdus, restent: etat.avions?.[c]?.filter(pv => pv > 0).length ?? 0 }, regiments,
    };
  };
  const tenus = [0, 0];
  for (const c of etat.troncons || []) tenus[c]++;
  return { jour, jours: etat.meteo.length, camps: [par(camp), par(1 - camp)], tronconsTenus: camp === 0 ? tenus : [tenus[1], tenus[0]], manque: MANQUE };
}

/* Les faits marquants du jour, déduits des chiffres (le plus grave d'abord), pour la partie « À retenir » du bilan.
   Rend [{ genre: 'perte' | 'gain' | 'alerte' | 'calme', texte }] ; au plus `max`. */
export function faitsMarquants(d, max = 4) {
  const [n, e] = d.camps, faits = [], pl = (k, un, des) => `${k} ${k > 1 ? des : un}`;
  const j = d.jour - 1;
  const pris = n.prisParJour[j] ?? 0, perdus = e.prisParJour[j] ?? 0;
  const deroutes = n.regiments.filter(r => r.niveau === 'deroute' && r.debout + r.blesses > 0), ebranles = n.regiments.filter(r => r.niveau === 'ebranle');
  if (deroutes.length) faits.push({ genre: 'alerte', texte: `${deroutes.map(r => `${r.numero}`).join(', ')} en déroute` });
  if (perdus) faits.push({ genre: 'perte', texte: `${pl(perdus, 'tronçon perdu', 'tronçons perdus')}` });
  if (pris) faits.push({ genre: 'gain', texte: `${pl(pris, 'tronçon pris', 'tronçons pris')}` });
  const pire = [...n.regiments].sort((a, b) => b.mortsJour - a.mortsJour)[0];
  if (pire?.mortsJour >= 5 && pire.mortsJour * 4 >= n.mortsJour) faits.push({ genre: 'perte', texte: `Le ${pire.numero}${pire.nom ? ` (${pire.nom})` : ''} a perdu ${pl(pire.mortsJour, 'homme', 'hommes')}, le quart de nos morts du jour` });
  if (ebranles.length) faits.push({ genre: 'alerte', texte: `${pl(ebranles.length, 'régiment ébranlé', 'régiments ébranlés')}` });
  if (n.avions.perdus) faits.push({ genre: 'perte', texte: `${pl(n.avions.perdus, 'avion abattu', 'avions abattus')}` });
  const moy = n.mortsParJour.slice(0, j).reduce((s, v) => s + v, 0) / Math.max(1, j);
  if (j > 0 && n.mortsJour >= 1.5 * moy && n.mortsJour > 3) faits.push({ genre: 'perte', texte: 'Notre pire journée jusqu\'ici' });
  if (!faits.length) faits.push({ genre: 'calme', texte: 'Une journée sans fait marquant' });
  return faits.slice(0, max);
}
