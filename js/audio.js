/* Le son (Jérôme, v0.75.0 : « Ajoute le son »). Tout est synthétisé en Web Audio (aucun fichier, aucune dépendance) ; le dessin et la logique ne le connaissent pas :
   main.js lui passe les événements de la bataille et l'état de l'écoute. Déverrouillé au premier geste du joueur (les navigateurs refusent avant), coupé quand l'onglet est caché.
   Deux volumes, gardés dans `prefs.son` : les effets (obus, fusillade, avion, char, vent, pluie) et la musique : les morceaux de Kingvi (`assets/music/`, MP3, repris du jeu frère à la demande de Jérôme, v0.76.2), en playlist avec fondu enchaîné de 8 s, qui changent selon l'humeur du champ (calme, combat, nuit, aube).
   Les bruitages (Jérôme, v0.99.6 : la synthèse était « très mauvaise ») : des mp3 CC0 de `assets/sons/` (catalogue et choix : `data/sons.js`), décodés au premier geste du joueur ;
   une famille dont le fichier manque ou n'est pas encore décodé retombe sur la synthèse d'avant (aucune erreur, aucun silence). Variantes, hauteur et voix simultanées : tirées/limitées ici, avec le générateur local.
   Le hasard du son est un petit générateur local (la graine de la bataille n'est jamais touchée). L'espace : un son loin est plus faible et vient du côté où il est (`ecoute` : le centre de la vue, en mètres du secteur, et sa largeur). */
import { SONS, DOSSIER_SONS, VOIX } from './data/sons.js?v=0.105.5';
const borne = (v, a, b) => v < a ? a : v > b ? b : v;
const COMMUN = { effets: 0.7, musique: 0.5 };
// ── La playlist : les fichiers de `assets/music/`. `humeur` : quand le champ la demande, on y passe en fondu (comme `lieu` dans Kingvi) ──
export const TRACKS = {
  'spring-reverb': { nom: 'Spring Reverb', file: 'Spring Reverb.mp3', humeur: 'calme' },
  'breaks': { nom: 'Abstract Breaks', file: 'Abstract Breaks.mp3', humeur: 'calme' },
  'breaks-2': { nom: 'Abstract Breaks II', file: 'Abstract Breaks II.mp3', humeur: 'calme' },
  'foret-noire': { nom: 'La Forêt Noire', file: 'La Forêt Noire.mp3', humeur: 'nuit' },
  'aube': { nom: 'L\'aube', file: 'L\'aube.mp3', humeur: 'aube' },
  'loups': { nom: 'The wolves', file: 'The wolves.mp3', humeur: 'combat' },
  'loups-2': { nom: 'The wolves II', file: 'The wolves II.mp3', humeur: 'combat' },
};
const XFADE = 8, GAIN_PISTE = 0.75;      // le fondu enchaîné (s) ; le niveau d'un morceau avant le curseur

export function creerSon(prefs = {}) {
  let ctx = null, maitre = null, fx = null, mus = null, bruit = null, vol = { ...COMMUN, ...(prefs.son || {}) }, cache = false;
  let graine = 12345;
  const alea = () => (graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0) / 4294967296;
  const lits = {};                        // les sons en continu : vent, pluie, fusillade, char, avion, nuit
  let dernierImpact = 0;
  const tampons = {}, voix = {}, credit = { fusil: 0, mitrailleuse: 0, mitraillage: 0 };      // les sons décodés ('famille/variante'), les voix en cours par famille, le rythme des rafales
  let nVoix = 0, chargeLancee = false;
  let deck = null, courante = null, choix = 'playlist', humeurVoulue = 'calme', humeurDepuis = 0, combatLisse = 0, combatDepuis = 0, calmeDepuis = 0, humeur = 'calme';

  function demarrer() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();        // mille coups de fusil ne saturent pas la sortie
    maitre = ctx.createGain(); maitre.connect(ctx.destination); comp.connect(maitre);      // (le maître : coupé onglet caché, voir `cacher`)
    if (cache) maitre.gain.value = 0;
    fx = ctx.createGain(); fx.connect(comp);
    mus = ctx.createGain(); mus.connect(comp);
    regler();
    bruit = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = bruit.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = alea() * 2 - 1;
    // les sons en continu
    lits.vent = boucle('lowpass', 380, 0.7);
    lits.pluie = boucle('highpass', 2600, 0.5);
    lits.fusillade = boucle('bandpass', 1500, 0.9);
    lits.char = grondement('sawtooth', 42, 150);
    lits.avion = grondement('sawtooth', 96, 420);
    lits.vent.g.gain.value = lits.pluie.g.gain.value = lits.fusillade.g.gain.value = lits.char.g.gain.value = lits.avion.g.gain.value = 0;
    chargerChoisis();
  }

  // ─── Les bruitages en fichiers : chargés au premier geste (les navigateurs refusent le son avant), jamais au lancement du jeu ───
  const promesses = {};
  function charger(famille, id) {
    const cle = `${famille}/${id}`, d = SONS[famille]?.variantes[id];
    if (!ctx || !d) return Promise.resolve(null);
    return promesses[cle] ??= (async () => {               // (une seule fois par fichier ; un second appel attend le même décodage)
      try {
        const r = await fetch(DOSSIER_SONS + d.fichier);
        if (r.ok) tampons[cle] = await ctx.decodeAudioData(await r.arrayBuffer());
      } catch { /* le fichier manque : la synthèse reste */ }
      return tampons[cle] || null;
    })();
  }
  function chargerChoisis() {
    if (chargeLancee) return; chargeLancee = true;
    for (const [f, s] of Object.entries(SONS)) {
      if (s.genre === 'boucle') {                          // une boucle : une seule des choisies, tirée une fois
        const id = s.choisi[Math.floor(alea() * s.choisi.length)];
        charger(f, id).then(buf => { if (buf && ctx) lierBoucle(f, buf, s.gain * (s.variantes[id].gain ?? 1)); });
      } else for (const id of s.choisi) charger(f, id);
    }
  }
  // une boucle en fichier remplace la boucle synthétisée du même nom (qui se tait)
  function lierBoucle(nom, buf, base) {
    const src = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner();
    src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g); g.connect(p); p.connect(fx); src.start(0, alea() * buf.duration);
    lits[nom + 'F'] = { g, p, src, base };
    if (lits[nom]) lits[nom].g.gain.value = 0;
  }
  const lit = nom => lits[nom + 'F'] || lits[nom];
  /* Joue un coup d'une famille : une variante choisie au sort parmi celles que le jeu garde (`variante` : celle du labo), un peu plus grave ou aigu, plus sourd quand il est loin.
     Rend faux si rien n'est prêt (le fichier manque ou se décode encore) : l'appelant fait alors la synthèse. */
  function jouer(famille, v, pan, variante = null) {
    const s = SONS[famille];
    if (!ctx || !s) return false;
    const prets = (variante ? [variante] : s.choisi).filter(i => tampons[`${famille}/${i}`]);
    if (!prets.length) return false;
    if (nVoix >= VOIX.total) return true;                  // trop de bruit : celui-ci se perd dans les autres
    const id = prets[Math.floor(alea() * prets.length)], t = maintenant(), liste = voix[famille] ??= [];
    while (liste.length >= (VOIX[famille] || 8)) { const vieille = liste.shift(); vieille.g.gain.setTargetAtTime(0, t, 0.03); try { vieille.src.stop(t + 0.2); } catch { /* déjà finie */ } }
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(), p = ctx.createStereoPanner();
    src.buffer = tampons[`${famille}/${id}`]; src.playbackRate.value = 1 + (alea() * 2 - 1) * (s.taux || 0);
    g.gain.value = Math.min(1.5, v * s.gain * (s.variantes[id].gain ?? 1));
    f.type = 'lowpass'; f.frequency.value = 900 + 17000 * Math.min(1, v) ** 0.5;      // loin : sourd
    p.pan.value = pan; src.connect(f); f.connect(g); g.connect(p); p.connect(fx);
    const voixCourante = { src, g }; liste.push(voixCourante); nVoix++;
    src.onended = () => { nVoix--; const k = liste.indexOf(voixCourante); if (k >= 0) liste.splice(k, 1); g.disconnect(); };
    src.start(t);
    return true;
  }
  // le labo : écouter une candidate (une boucle tourne jusqu'à `stop`), sans voix limitées ni distance
  async function ecouter(famille, id, { v = 1 } = {}) {
    const s = SONS[famille], buf = await charger(famille, id);
    if (!ctx || !s || !buf) return () => {};
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; src.loop = s.genre === 'boucle'; g.gain.value = v * s.gain * (s.variantes[id].gain ?? 1);
    src.connect(g); g.connect(fx); src.start();
    return () => { try { src.stop(); } catch { /* déjà finie */ } g.disconnect(); };
  }
  function boucle(type, freq, q) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    s.buffer = bruit; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); f.connect(g); g.connect(p); p.connect(fx); s.start(0, alea());
    return { f, g, p };
  }
  function grondement(type, hz, coupure) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = type; o2.type = 'square'; o.frequency.value = hz; o2.frequency.value = hz * 0.5; f.type = 'lowpass'; f.frequency.value = coupure;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(p); p.connect(fx); o.start(); o2.start();
    return { o, o2, f, g, p };
  }
  function regler() { if (!ctx) return; fx.gain.value = vol.effets; mus.gain.value = vol.musique; }
  const maintenant = () => ctx.currentTime;

  // où l'on entend : un son plus loin est plus faible (jamais tout à fait muet pour un gros bruit) et vient de son côté
  function place(x, y, e, plancher = 0.08) {
    const rayon = Math.max(60, e.rayon), dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
    return { v: Math.max(plancher, 1 / (1 + (d / rayon) ** 2)), pan: borne(dx / rayon, -1, 1) };
  }
  function eclat(duree, { type = 'lowpass', f0 = 2000, f1 = 200, q = 0.8, gain = 1, pan = 0, attaque = 0.004 }) {
    const t = maintenant(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    s.buffer = bruit; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duree);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attaque); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    p.pan.value = pan; s.connect(f); f.connect(g); g.connect(p); p.connect(fx); s.start(t, alea() * 1.5, duree + 0.05);
  }
  function ton(hz0, hz1, duree, { type = 'sine', gain = 1, pan = 0 } = {}) {
    const t = maintenant(), o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.type = type; o.frequency.setValueAtTime(hz0, t); o.frequency.exponentialRampToValueAtTime(Math.max(15, hz1), t + duree);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    p.pan.value = pan; o.connect(g); g.connect(p); p.connect(fx); o.start(t); o.stop(t + duree + 0.05);
  }

  // ─── Les événements de la bataille ───
  function evenement(e, ecoute) {
    if (!ctx || cache || ctx.state !== 'running') return;
    const t = maintenant();
    if (e.type === 'impact') {
      if (t - dernierImpact < 0.03) return;      // une salve de 24 obus ne fait pas 24 sons dans le même instant
      dernierImpact = t;
      const { v, pan } = place(e.x, e.y, ecoute, 0.18), k = e.cal === '220' ? 2.2 : e.cal === '155' ? 1.5 : 1;
      if (jouer('obus' + e.cal, v, pan)) return;
      eclat(0.5 * k, { f0: 1800, f1: 60, gain: 1.1 * v, pan, q: 0.5 });
      ton(95 / k ** 0.5, 30, 0.55 * k, { gain: 0.9 * v, pan });
      eclat(0.09, { type: 'highpass', f0: 3000, f1: 1500, gain: 0.5 * v, pan });      // le claquement de l'éclat
    } else if (e.type === 'char-tir') {
      const { v, pan } = place(e.x, e.y, ecoute, 0.12);
      if (jouer('obus75', v * 0.8, pan)) return;
      eclat(0.22, { f0: 900, f1: 90, gain: 0.7 * v, pan, q: 0.6 }); ton(110, 45, 0.3, { gain: 0.6 * v, pan });
    } else if (e.type === 'nid-detruit') {
      const { v, pan } = place(e.x, e.y, ecoute, 0.2);
      if (jouer('obus75', v, pan)) return;
      eclat(0.5, { f0: 1400, f1: 70, gain: 0.8 * v, pan, q: 0.5 }); ton(90, 35, 0.4, { gain: 0.7 * v, pan });
    } else if (e.type === 'avion-abattu') {
      const { v, pan } = place(e.x, e.y, ecoute, 0.2);
      ton(520, 60, 2.2, { type: 'sawtooth', gain: 0.5 * v, pan });
    } else if (e.type === 'avion-ecrase' || e.type === 'char-detruit') {
      const { v, pan } = place(e.x, e.y, ecoute, 0.25);
      if (jouer('obus155', v, pan)) return;
      eclat(1.2, { f0: 1500, f1: 50, gain: 1.2 * v, pan, q: 0.4 }); ton(70, 25, 1.0, { gain: v, pan });
    } else if (e.type === 'pont-coupe' || e.type === 'pont-rompu') {
      const { v, pan } = place(e.x ?? ecoute.x, e.y ?? ecoute.y, ecoute, 0.2);
      if (jouer('obus155', v * 0.8, pan)) return;
      eclat(0.8, { f0: 900, f1: 100, gain: 0.9 * v, pan }); ton(180, 60, 0.6, { type: 'square', gain: 0.3 * v, pan });
    } else if (e.type === 'prise') {
      const { v, pan } = place(e.x, e.y ?? ecoute.y, ecoute, 0.3);
      ton(330, 330, 1.4, { type: 'triangle', gain: 0.25 * v, pan }); ton(247, 247, 1.8, { type: 'triangle', gain: 0.2 * v, pan });      // un cor, deux notes
    } else if (e.type === 'nuit') {
      ton(110, 108, 3, { type: 'triangle', gain: 0.4 });
    }
  }
  /* Un refus ou un ordre donné (l'interface) */
  function interface_(genre) {
    if (!ctx || cache || ctx.state !== 'running') return;
    if (genre === 'refus') ton(150, 90, 0.18, { type: 'square', gain: 0.18 });
    else if (genre === 'ordre') ton(520, 520, 0.07, { type: 'triangle', gain: 0.15 });
    else if (genre === 'pret') { ton(440, 440, 0.12, { type: 'triangle', gain: 0.15 }); }
  }

  // ─── La musique : deux platines (un morceau qui monte, l'autre qui s'éteint), comme dans Kingvi ───
  function lancerPiste(id) {
    if (!ctx || !TRACKS[id]) return;
    const t = maintenant(), vieux = deck, el = new Audio(`assets/music/${encodeURIComponent(TRACKS[id].file)}`), gain = ctx.createGain();
    el.preload = 'auto'; gain.gain.value = 0.0001;
    try { ctx.createMediaElementSource(el).connect(gain).connect(mus); } catch { return; }
    const fondu = vieux ? XFADE : 3;       // (le premier monte plus vite : pas huit secondes de silence)
    gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(GAIN_PISTE, t + fondu);
    el.play().catch(() => {});
    deck = { id, el, gain, depuis: t }; courante = id;
    if (vieux) {
      vieux.gain.gain.cancelScheduledValues(t); vieux.gain.gain.setValueAtTime(vieux.gain.gain.value, t); vieux.gain.gain.linearRampToValueAtTime(0.0001, t + XFADE);
      setTimeout(() => { vieux.el.pause(); vieux.el.removeAttribute('src'); vieux.el.load(); vieux.gain.disconnect(); }, XFADE * 1000 + 300);
    }
  }
  const pisteDe = h => { const ids = Object.keys(TRACKS).filter(k => TRACKS[k].humeur === h); return ids[Math.floor(alea() * ids.length)]; };
  // le suivant : de la même humeur s'il y en a plusieurs (le combat, la nuit), sinon la playlist calme dans l'ordre
  function suivante() {
    if (choix !== 'playlist') return choix;
    const ids = Object.keys(TRACKS).filter(k => TRACKS[k].humeur === humeur && k !== courante);
    if (ids.length) return ids[Math.floor(alea() * ids.length)];
    const calmes = Object.keys(TRACKS).filter(k => TRACKS[k].humeur === 'calme');
    return calmes[(calmes.indexOf(courante) + 1) % calmes.length];
  }
  // L'humeur du champ : la nuit, l'aube (la première heure du jour), le combat (la fusillade dense, tenue quelques secondes ; elle ne retombe qu'après un long calme), sinon calme
  function musique(dt, nuit, aube, dens) {
    const t = maintenant();
    combatLisse += (dens - combatLisse) * (1 - Math.exp(-dt / 2));
    if (combatLisse > 0.45) { combatDepuis += dt; calmeDepuis = 0; } else { calmeDepuis += dt; combatDepuis = 0; }
    const voulue = nuit ? 'nuit' : humeur === 'combat' ? (calmeDepuis > 20 ? (aube ? 'aube' : 'calme') : 'combat') : combatDepuis > 3 ? 'combat' : aube ? 'aube' : 'calme';
    if (voulue !== humeurVoulue) { humeurVoulue = voulue; humeurDepuis = t; }
    if (!deck) { lancerPiste(choix === 'playlist' ? (pisteDe('calme') || Object.keys(TRACKS)[0]) : choix); return; }
    const el = deck.el;
    // une humeur stable depuis 3 s a son morceau : on y passe en fondu (et on laisse finir un morceau d'humeur quand on la quitte)
    if (choix === 'playlist' && humeurVoulue !== humeur && t - humeurDepuis > 3 && t - deck.depuis > XFADE + 2) {
      humeur = humeurVoulue;
      if (TRACKS[courante]?.humeur !== humeur) { const id = pisteDe(humeur); if (id) { lancerPiste(id); return; } }
    }
    if (el.duration && el.duration - el.currentTime < XFADE + 0.3 && t - deck.depuis > XFADE) lancerPiste(suivante());
    else if ((el.ended || el.error) && t - deck.depuis > 2) lancerPiste(suivante());
  }

  // ─── Chaque image : la fusillade, le vent, les moteurs, la musique ───
  const doux = (g, v, dt, vite = 3) => { g.gain.value += (v - g.gain.value) * (1 - Math.exp(-dt * vite)); };
  function image(dt, { tirs, ecoute, meteo, nuit, aube = false, chars = [], avions = [], titre = false, enJeu = true }) {
    if (!ctx || cache || ctx.state !== 'running') return;
    // l'illustration de l'écran titre : la musique seule (Jérôme, v0.100.0), le vent, la pluie et la fusillade s'éteignent
    if (titre) {
      for (const nom of ['vent', 'pluie', 'avion']) doux(lit(nom).g, 0, dt, 6);
      doux(lits.char.g, 0, dt, 6); doux(lits.fusillade.g, 0, dt, 6);
      musique(dt, false, false, 0);
      return;
    }
    // les coups de fusil de l'image : quelques claquements au hasard parmi eux, de leur côté, sur un lit de grondement
    const n = tirs ? tirs.length / 6 : 0;
    let proche = 0;
    for (const k in credit) credit[k] = Math.min(3, credit[k] + (n || k === 'mitraillage' ? dt * (k === 'fusil' ? 16 : SONS[k].cadence) : 0));      // un rythme, pas un coup par tir : la foule est un bruit, pas mille claquements
    for (let q = 0; q < Math.min(8, n); q++) {
      const i = Math.floor(alea() * n) * 6, { v, pan } = place(tirs[i], tirs[i + 1], ecoute, 0.04), genre = tirs[i + 5] === -1 ? 'mitrailleuse' : 'fusil';      // (un nid de mitrailleuse : son tireur est -1)
      proche += v;
      if (credit[genre] >= 1 && jouer(genre, v, pan)) { credit[genre]--; continue; }
      if (!tampons[`${genre}/${SONS[genre].choisi[0]}`] && alea() < 0.7) eclat(0.05 + alea() * 0.05, { type: 'bandpass', f0: 2400 + alea() * 1800, f1: 900, q: 1.5, gain: 0.35 * v, pan });
    }
    const dens = n ? Math.min(1, proche / 5) : 0;
    doux(lits.fusillade.g, (tampons[`fusil/${SONS.fusil.choisi[0]}`] ? 0.15 : 0.35) * dens, dt, 6);      // (sous les vrais coups, le lit de grondement se fait discret)
    // le temps
    const pluie = meteo?.pluie || meteo?.neige ? 1 : 0, tempete = meteo?.tempete ? 1 : 0;
    const niveauVent = (enJeu ? 0.12 : 0.18) + 0.22 * tempete + (nuit ? 0.05 : 0), vent = lit('vent'), fv = lits.ventF;
    doux(vent.g, fv ? niveauVent * 5 * fv.base : niveauVent, dt, 1);
    if (!fv) lits.vent.f.frequency.value = 300 + 220 * Math.sin(maintenant() * 0.23) ** 2 + 400 * tempete;
    vent.p.pan.value = Math.sin(maintenant() * 0.11) * 0.5;
    const averse = enJeu || titre ? pluie : 0, pl = lit('pluie');
    doux(pl.g, lits.pluieF ? 0.12 * averse * 5 * lits.pluieF.base : 0.12 * averse, dt, 1);
    // les chars qui roulent : le plus proche donne le ton
    let vc = 0, pc = 0;
    for (const c of chars) if (c.etat === 'avance' || c.etat === 'enlise') { const { v, pan } = place(c.x, c.y, ecoute, 0.03); if (v > vc) { vc = v; pc = pan; } }
    doux(lits.char.g, 0.5 * vc, dt, 2); lits.char.p.pan.value = pc;
    lits.char.o.frequency.value = 38 + 7 * Math.sin(maintenant() * 9);
    // les avions en vol
    let va = 0, pa = 0, ha = 0;
    for (const a of avions) if (a.etat === 'vol' || a.etat === 'chute') { const { v, pan } = place(a.x ?? 0, a.y ?? 0, ecoute, 0.05); if (v > va) { va = v; pa = pan; ha = a.h || 0; } }
    const av = lit('avion');
    doux(av.g, lits.avionF ? va * lits.avionF.base : 0.3 * va, dt, 3); av.p.pan.value = pa;
    if (!lits.avionF) lits.avion.o.frequency.value = 90 + 14 * Math.sin(maintenant() * 14) + (ha < 20 ? 25 : 0);
    // le mitraillage : tant que l'avion balaie sa bande, des coups à la cadence de la famille, de son côté
    let mv = 0, mp = 0;
    for (const a of avions) if (a.mitraille) { const { v, pan } = place(a.x ?? 0, a.y ?? 0, ecoute, 0.1); if (v > mv) { mv = v; mp = pan; } }
    if (mv && credit.mitraillage >= 1 && jouer('mitraillage', mv, mp)) credit.mitraillage--;
    musique(dt, nuit, aube, dens);
  }

  // Onglet caché (conventions, section 9 ; Jérôme, v0.100.0) : tout se tait, la musique est mise en pause (un morceau lu par un élément audio avance même
  // quand le contexte est suspendu), et tout reprend au retour.
  function cacher(oui) {
    cache = oui;
    if (!ctx) return;
    if (oui) {
      maitre.gain.value = 0;
      if (deck) deck.el.pause();
      ctx.suspend().catch(() => {});
    } else {
      ctx.resume().catch(() => {});
      maitre.gain.value = 1;
      if (deck) deck.el.play().catch(() => {});
    }
  }
  return {
    // à appeler dans un geste du joueur (clic, touche) : crée le contexte ou le reprend
    debloquer() { demarrer(); if (ctx && ctx.state === 'suspended' && !cache) ctx.resume(); },
    evenement, image, interface_, cacher, ecouter, charger,
    // le labo : un morceau choisi (null : la playlist) et celui qu'on entend
    piste(id) { choix = id || 'playlist'; if (ctx) lancerPiste(id || suivante()); },
    get morceau() { return courante; },
    get lecture() { return deck && { id: deck.id, t: +deck.el.currentTime.toFixed(2), erreur: deck.el.error ? deck.el.error.code : 0, pret: deck.el.readyState, humeur }; },
    // le labo en crée un par variante et le ferme en la quittant
    fermer() { if (ctx) { try { ctx.close(); } catch { /* déjà fermé */ } ctx = null; } },
    get volumes() { return { ...vol }; },
    volume(quoi, v) { vol[quoi] = borne(v, 0, 1); regler(); return vol; },
    get actif() { return !!ctx && ctx.state === 'running'; },
  };
}
