// Le choix du secteur, avant une nouvelle partie (sorti de main.js, lot de dette du 24 nov.) : la liste des secteurs, la carte de papier,
// l'aperçu 3D, la saison, le niveau et la durée. `creerChoixSecteur(ctx)` rend `demanderSecteur(avecDifficulte)`.
import { SECTEURS } from '../data/secteur.js?v=0.169.0';
import { SAISONS, SAISON_DEFAUT } from '../data/meteo.js?v=0.169.0';
import { DIFFICULTES, DIFFICULTE_DEFAUT, DUREES, DUREE_DEFAUT } from '../data/difficulte.js?v=0.169.0';
import { preparerAleatoire, ID_ALEATOIRE } from '../generateur.js?v=0.169.0';

let $, DEBUG, params, prefs, store, R;     // donnés par main.js (`prefs` est l'objet des réglages, partagé : un choix gardé l'est pour tout le jeu)
export function creerChoixSecteur(ctx) {
  ({ $, DEBUG, params, prefs, store, R } = ctx);
  return demanderSecteur;
}

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
    hiver: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 1.5V14.5M2.4 4.8L13.6 11.2M2.4 11.2L13.6 4.8"/></svg>',
    printemps: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14.5V7"/><path d="M8 9C8 6 6 4 3 4C3 7 5 9 8 9Z"/><path d="M8 7.5C8 4.5 10 2.5 13 2.5C13 5.5 11 7.5 8 7.5Z"/></svg>' };      // (v0.135.0 : une pousse, le printemps)
  const SAISONS_CHOIX = ['printemps', 'ete', 'automne', 'hiver'];
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
        if (!apercuSecteur) { const { creerVue3D } = await import('../apercu-3d.js?v=0.169.0'); apercuSecteur = await creerVue3D({ R, hote, rotation: 0.12 }); apercuSecteur.surClic = () => agrandir(!d.classList.contains('agrandi')); }
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
