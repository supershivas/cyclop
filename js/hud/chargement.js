// La barre de chargement (v0.28.0) : au lancement du jeu (le HTML la porte déjà, avant que le moindre script ne soit lu) et quand on relit ou commence une partie.
// Un papier au milieu de l'écran, une barre d'encre ; `progres(part, étape)` la remplit, `frame()` laisse le navigateur la peindre.
export function creerChargement({ $, instantane = false }) {
  const racine = $('chargement'), barre = $('chargement-barre'), titre = $('chargement-titre'), etape = $('chargement-etape');
  let derniere = 0;
  // (le mode debug, que les scripts pilotent, ne s'arrête jamais pour peindre : ses minutages restent ceux d'avant)
  const frame = () => instantane ? Promise.resolve() : new Promise(r => requestAnimationFrame(() => setTimeout(r)));
  function progres(part, texte = '') {
    const pc = Math.round(Math.max(0, Math.min(1, part)) * 100);
    barre.style.width = `${pc}%`;
    racine.setAttribute('aria-valuenow', String(pc));
    if (texte) etape.textContent = texte;
  }
  return {
    frame, progres,
    montrer(texte, part = 0) { titre.textContent = texte; etape.textContent = ''; racine.hidden = false; racine.classList.remove('fondu'); progres(part); derniere = performance.now(); },
    // peindre seulement si la dernière peinture date : 40 ms de travail de plus ne valent pas une image
    async peindre() { if (performance.now() - derniere > 40) { await frame(); derniere = performance.now(); } },
    cacher() { racine.classList.add('fondu'); setTimeout(() => { racine.hidden = true; }, instantane ? 0 : 250); },
    /* Un travail en étapes (un générateur qui rend [part, étape] et la valeur à la fin) sous la barre ; elle reste jusqu'à `cacher()`. */
    async executer(texte, gen) {
      this.montrer(texte); await frame();
      for (;;) {
        const s = gen.next();
        if (s.done) { progres(0.95, 'Le champ de bataille'); await frame(); return s.value; }      // (la barre reste : le rendu branche encore la bataille ; l'appelant la cache)
        progres(s.value[0] * 0.95, s.value[1]);
        await this.peindre();
      }
    },
  };
}
