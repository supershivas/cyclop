// Le mode debug du jeu (section 18 ; sorti de main.js, lot de dette du 24 nov.) : chargé seulement avec ?debug=1. `window.__jeu` pilote la
// bataille pour les scripts, les captures et les tests (coordonnées du SECTEUR : les marges s'ajoutent ici). `j` : ce que main.js lui prête.
export async function installerDebugJeu(j) {
  const { ouvrirSoir, horloge, effectifs, enJeu, loop, rendu, jouer, nouvelle, store, montrerTitre, son, leSuivi, choisirAvion, choisirChar, aube, nuit, avancer, evenements, raconter, majHud, choisirBatiment, montrerBatiment, commanderRang, lancerBarrage, ordonnerBarrage, lancerStance, ordonnerStance, lancerMarche, ordonnerMarche, empreinteEtat, montrerSoldat, majFiche, laFiche, $, majBulle, montrerFin, demarrerCampagne, laCampagne, CALIBRES } = j;
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.170.1');
  const B = () => j.B(), reseau = () => j.reseau();
  window.__seed = seedFromUrl() ?? undefined;
  installDebug({
    state: () => B() && { ...horloge(B()), effectifs: effectifs(B()), pertes: B().etat.pertes, impacts: B().etat.impacts.length, enJeu: enJeu(), pause: loop.paused },
    places: { centre: { x: 200, y: 150 }, nous: { x: 200, y: 230 }, eux: { x: 200, y: 70 } },
    // le mode debug parle en coordonnées du SECTEUR (0..400, 0..300) : les marges s'ajoutent ici
    teleport: ({ x, y }) => { rendu.vue.cx = x + B().etat.marges.x; rendu.vue.cz = y + B().etat.marges.y; },
    setTimeScale: s => loop.setTimeScale(s),
    setSeed: n => jouer(nouvelle(n)),
    reset: () => { store.clear('partie'); j.oublierBataille(); montrerTitre(); },
    extra: {
      stats: () => window.cyclopStats(),
      son, suivi: leSuivi, charChoisi: () => j.charChoisi(),
      choisirAvion: id => choisirAvion(id),      // la fiche d'un de nos avions en vol (les captures : sa pastille est souvent hors de l'écran)
      choisirChar: id => choisirChar(id),        // la fiche d'un de nos chars (v0.164.0 : l'essai de la visée de son chemin)
      // avance de n pas tout de suite (les nuits passent d'elles-mêmes)
      avancer(n = 30, passerNuits = true) {
        for (let k = 0; k < n && B().etat.phase !== 'fin'; k++) {
          if (B().etat.phase === 'nuit') {
            if (!passerNuits) break;
            aube(B(), nuit.etat === 'choix' ? nuit.corvees : {}); nuit.fermer();
          }
          const ev = avancer(B());
          evenements.push(...ev); raconter(ev);
        }
        majHud();
        return horloge(B());
      },
      raconter: ev => { raconter(ev); majHud(); },      // le carnet de bord : des événements de la bataille racontés tels quels (les scripts, les captures)
      batiment: cle => { choisirBatiment(cle); montrerBatiment(cle); },      // la fenêtre d'un bâtiment (les scripts)
      rang: (o, p, a = 'acheter') => commanderRang({ a, o, p }),      // un rang du camp, la nuit (à deux : par le lockstep)
      barrage: (cal, x, y, camp = 0, x2, y2) => { const m = B().etat.marges, X2 = x2 === undefined ? undefined : x2 + m.x, Y2 = y2 === undefined ? undefined : y2 + m.y; return reseau() ? lancerBarrage(cal, x + m.x, y + m.y, X2, Y2) : ordonnerBarrage(B(), cal, x + m.x, y + m.y, camp, X2, Y2); },
      stance: (ids, stance, camp = 0) => reseau() ? lancerStance(ids, stance) : ordonnerStance(B(), ids, stance, camp),
      marche: (ids, x, y) => reseau() ? lancerMarche(ids, x + B().etat.marges.x, y + B().etat.marges.y) : ordonnerMarche(B(), ids, x + B().etat.marges.x, y + B().etat.marges.y),
      reseau: () => reseau() ? { moi: reseau().moi, cadre: reseau().ls.cadre, pause: reseau().ls.etat.pause, vitesse: reseau().ls.etat.vitesse, ecart: reseau().ls.ecart, empreinte: empreinteEtat(B()), ticks: B().etat.ticks } : null,
      zoom: z => { rendu.vue.zoom = z; },
      ouvrirFiche: id => { montrerSoldat(id); majFiche(B()); },      // la fiche d'un homme par son numéro (les captures)
      fiche: () => laFiche.ouverte && { ...laFiche.ouverte, nom: $('fiche-nom').textContent, qui: $('fiche-qui').textContent, etat: $('fiche-etat').textContent, liste: $('fiche-liste').textContent },
      survol: (x, y) => { j.poserSouris({ x, y }); majBulle(); return $('bulle').hidden ? null : $('bulle').textContent; },
      camera: (yaw, tangage) => rendu.placerCamera(yaw, tangage),
      nuit: () => ouvrirSoir(),
      fin: () => montrerFin(),
      campagne: g => demarrerCampagne(g),
      papierCampagne: () => ({ ouvert: laCampagne.ouvert, texte: $('campagne').textContent }),
      bataille: () => B(),
      rendu: () => rendu,
      CALIBRES,
    },
  });
}
