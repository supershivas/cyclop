// La frise de l'atelier d'animation : la bibliothèque d'animations, le transport, tous les outils d'images clés et la piste (règle, curseur, glisser, sélection au cadre, zoom).
// Elle ne connaît ni le dessin ni les poignées : elle lit et change l'état de la page (`ctx.S`) par les opérations pures de js/anim-edition.js, et prévient la page (`ctx.instantane` avant chaque geste,
// pour annuler ; `ctx.garder` après ; `ctx.chargerCle` pour passer en édition sur une image).
import * as E from './anim-edition.js?v=0.131.0';
import { COURBES, CANAUX, NOMS_CANAUX } from './data/poses-soldat.js?v=0.131.0';
import { echantillon } from './pose-soldat.js?v=0.131.0';
import { MODELES } from './anim-modeles.js?v=0.131.0';
import { createPublisher } from './lib/gh-publish.js?v=0.131.0';
import { fichierAnimations, FICHIER_ANIMATIONS } from './animations-store.js?v=0.131.0';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const MARGE = 18, REGLE = 24, PISTE_H = 52;                 // px : la marge à gauche de la piste, la hauteur de la règle, celle de la rangée des images
const PAS_REGLE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
export const FPS = [12, 24, 30, 60];
const pub = createPublisher({ repo: 'supershivas/cyclop', tokenKey: 'cyclopeen:gh-token' });
export const MODES = [['boucle', 'Boucle'], ['unefois', 'Une fois'], ['allerretour', 'Aller-retour']];
export const COURBES_NOMS = { lineaire: 'Linéaire', doux: 'Doux', entree: 'Départ lent', sortie: 'Arrivée lente', entreesortie: 'Doux appuyé', palier: 'Palier (tenue)', ressort: 'Ressort', rebond: 'Rebond' };
export const RACCOURCIS = [
  ['Espace', 'Lire / pause'], ['← →', 'Image précédente / suivante (Maj : 10 images)'], [', .', 'Image clé précédente / suivante'], ['Début  Fin', 'Aller au début / à la fin'],
  ['I ou Entrée', 'Ajouter une image clé au curseur'], ['Suppr', 'Supprimer les images choisies'], ['Ctrl+D', 'Dupliquer'], ['Ctrl+C  X  V', 'Copier, couper, coller au curseur'],
  ['Ctrl+A', 'Tout sélectionner'], ['Échap', 'Tout désélectionner'], ['Ctrl+Z  Ctrl+Maj+Z', 'Annuler, rétablir'], ['E  W  R', 'Poignées : tourner, déplacer, échelle'], ['F', 'Viser l\'articulation choisie'],
  ['Maj + clic', 'Ajouter à la sélection'], ['Ctrl + clic', 'Inverser une image dans la sélection'], ['Glisser une image', 'La déplacer (Alt : sans accrochage à la grille)'], ['Glisser dans le vide', 'Sélection au cadre'],
  ['Double-clic dans la piste', 'Image clé à cet instant'], ['Ctrl + molette', 'Zoomer la frise'],
];

export function creerFrise(ctx) {
  const { S } = ctx;
  const racine = el('div', { className: 'aa-frise-in' });
  let boutons = {}, champs = {}, piste, interieur, regle, rangee, tete, fin, boite, info, aide, tempo;
  const bouton = (id, texte, onclick, titre = '', cls = '') => { const b = el('button', { textContent: texte, onclick, title: titre, className: cls }); boutons[id] = b; return b; };
  const rang = (nom, ...contenu) => { const d = el('div', { className: 'aa-rang' }); if (nom) d.append(el('span', { className: 'aa-rang-nom', textContent: nom })); d.append(...contenu); return d; };
  const etiquette = (texte, champ) => el('label', {}, texte + ' ', champ);
  const grille = () => 1 / S.fps;
  const calerT = (t, libre = false) => Math.max(0, libre ? t : Math.round(t * S.fps) / S.fps);
  const duree = () => S.anim.duree;
  const sel = () => [...S.selection];
  const pps = () => S.zoomFrise;                         // pixels par seconde

  // un geste : photo avant (pour annuler), l'opération, puis tout se range et se rafraîchit
  function faire(f) {
    ctx.instantane(); const r = f(); ctx.garder(); nettoyerSelection(); maj(); return r;
  }
  function nettoyerSelection() {
    const ids = new Set(E.idsDe(S.anim));
    S.selection = new Set([...S.selection].filter(i => ids.has(i)));
    if (S.cle && !ids.has(S.cle)) S.cle = null;
  }
  const choisir = (ids, principal = null) => { S.selection = new Set(ids); S.cle = principal && S.selection.has(principal) ? principal : (S.selection.size === 1 ? [...S.selection][0] : S.cle && S.selection.has(S.cle) ? S.cle : null); };
  const aller = (t, charger = false) => {                // le curseur : en lecture (la pose de l'animation à cet instant), ou sur l'image si on y tombe et qu'on le demande
    S.t = Math.max(0, Math.min(duree(), t)); S.joue = false;
    const k = charger ? S.anim.images.find(i => Math.abs(i.t - S.t) < 1e-4) : null;
    if (k) ctx.chargerCle(k.id); else { S.mode = 'lecture'; S.cle = null; }
    maj();
  };

  // ─── les actions (aussi appelées par les raccourcis de la page) ───
  const actions = {
    jouer() {
      if (S.joue) S.joue = false;
      else { if (S.anim.mode === 'unefois' && S.t >= duree() - 1e-6) S.t = 0; S.sens = 1; S.joue = true; S.mode = 'lecture'; S.cle = null; }
      maj();
    },
    debut: () => aller(0), finir: () => aller(duree()),
    pas: n => aller(Math.round(S.t * S.fps + n) / S.fps),
    cleSuivante() { const k = E.cleSuivante(S.anim, S.t); if (k) aller(k.t, true); },
    clePrecedente() { const k = E.clePrecedente(S.anim, S.t); if (k) aller(k.t, true); },
    ajouter() {
      faire(() => { const pose = ctx.poseReelle(), k = E.ajouterCle(S.anim, calerT(S.t), pose, 'doux'); choisir([k.id], k.id); ctx.chargerCle(k.id, true); });
    },
    insererEntre() { if (S.cle) faire(() => { const k = E.insererEntre(S.anim, S.cle); if (k) choisir([k.id], k.id); }); },
    tenir() { if (S.cle) faire(() => { const k = E.maintenir(S.anim, S.cle, calerT(S.t)); if (k) choisir([k.id], k.id); else ctx.avertir('Placer le curseur après l\'image choisie.'); }); },
    dupliquer() { if (sel().length) faire(() => { const n = E.dupliquerCles(S.anim, sel(), { pas: grille() * 3 }); choisir(n, n[n.length - 1]); }); },
    copier() { if (!sel().length) return; S.presse = E.copierCles(S.anim, sel()); ctx.avertir(`${S.presse.cles.length} image(s) copiée(s).`); maj(); },
    couper() { if (!sel().length) return; actions.copier(); faire(() => E.supprimerCles(S.anim, sel())); },
    coller() { if (!S.presse) return; faire(() => { const n = E.collerCles(S.anim, S.presse, calerT(S.t), { canaux: [...S.canaux] }); choisir(n, n[n.length - 1]); }); },
    supprimer() { if (sel().length) faire(() => { E.supprimerCles(S.anim, sel()); choisir([]); }); },
    toutes() { choisir(E.toutes(S.anim)); maj(); },
    aucune() { choisir([]); maj(); },
    inverserSelection() { choisir(E.inverserSelection(S.anim, sel())); maj(); },
    miroirImages() { if (sel().length) faire(() => E.miroirCles(S.anim, sel())); },
    inverserTemps() { faire(() => E.inverserCles(S.anim, sel().length > 1 ? sel() : null)); },
    repartir() { if (sel().length > 2) faire(() => E.repartirCles(S.anim, sel())); },
    caler() { faire(() => E.quantifierCles(S.anim, sel().length ? sel() : null, S.fps)); },
    etirer() { const f = +champs.etirer.value; if (f > 0 && f !== 1) faire(() => E.etirerCles(S.anim, sel().length > 1 ? sel() : null, f)); },
    ajusterDuree() { faire(() => E.ajusterDuree(S.anim, S.anim.mode === 'boucle' && S.anim.images.length > 1 ? E.finDe(S.anim) / (S.anim.images.length - 1) : 0)); },
  };

  // ─── la bibliothèque d'animations ───
  const remettre = () => { S.selection = new Set(); S.cle = null; S.t = 0; S.mode = 'lecture'; S.joue = false; };
  const ajouterAnim = a => { a.nom = E.nomUnique(S.biblio, a.nom); S.biblio.push(a); S.iAnim = S.biblio.length - 1; remettre(); };
  const clips = {
    changer(i) { ctx.instantane(); S.iAnim = Math.max(0, Math.min(S.biblio.length - 1, i)); remettre(); ctx.garder(); maj(); },
    nouvelle() { faire(() => ajouterAnim(E.animationVide('animation', ctx.poseReelle()))); },
    dupliquer() { faire(() => { const c = E.copierAnimation(S.anim); c.nom += ' copie'; ajouterAnim(c); }); },
    gaucher() { faire(() => ajouterAnim(E.miroirAnimation(S.anim))); },
    supprimer() { if (S.biblio.length < 2) { ctx.avertir('Il faut garder une animation.'); return; } faire(() => { S.biblio.splice(S.iAnim, 1); S.iAnim = Math.min(S.iAnim, S.biblio.length - 1); remettre(); }); },
    modele() { const m = MODELES[+champs.modele.value]; if (m) faire(() => ajouterAnim(m.creer())); },
    renommer() { faire(() => { S.anim.nom = E.nomUnique(S.biblio.filter((_, i) => i !== S.iAnim), champs.nom.value.trim().slice(0, 40) || 'animation'); }); },
    exporter(tout) {
      const d = tout ? { format: 'cyclopeen-animations', v: 2, animations: S.biblio } : { format: 'cyclopeen-animation', v: 2, anim: S.anim };
      const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })), download: tout ? 'animations-soldat.json' : `animation-${S.anim.nom.replace(/[^\w-]+/g, '-') || 'sans-nom'}.json` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); ctx.avertir(tout ? 'Toutes les animations exportées.' : 'Animation exportée.');
    },
    // publier toute la bibliothèque dans le dépôt (un commit sur main) : le jeu ne la lit pas encore ; le jeton se colle dans l'Atelier (atelier.html, onglet Publier)
    async publier() {
      try {
        const fichier = fichierAnimations(S.biblio);
        if (!pub.hasToken) { ctx.avertir('Pas de jeton GitHub : collez-le dans l\u2019Atelier (onglet Publier).'); return; }
        boutons.publier.disabled = true; ctx.avertir('Publication…');
        await pub.publish([{ path: FICHIER_ANIMATIONS, json: fichier }], { message: "Publie les animations de l'atelier d'animation" });
        ctx.avertir(`${fichier.animations.length} animation(s) publiée(s).`);
      } catch (e) { ctx.avertir(e.message); } finally { boutons.publier.disabled = false; }
    },
    async importer(fichier) {
      try {
        const d = JSON.parse(await fichier.text()), liste = d.animations ?? [d.anim ?? d];
        faire(() => { for (const a of liste) ajouterAnim(ctx.assainir(a)); });
        ctx.avertir(`${liste.length} animation(s) importée(s).`);
      } catch (e) { ctx.avertir(`Fichier illisible : ${e.message}`); }
    },
  };

  // ─── la construction ───
  function monter() {
    champs.clip = el('select', { onchange: () => clips.changer(+champs.clip.value) });
    champs.nom = el('input', { type: 'text', size: 20, title: 'Le nom de l\'animation', onchange: clips.renommer });
    champs.modele = el('select', { title: 'Une animation toute faite, ajoutée à la bibliothèque' }); MODELES.forEach((m, i) => champs.modele.append(el('option', { value: i, textContent: m.nom })));
    const fichier = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async () => { if (fichier.files[0]) await clips.importer(fichier.files[0]); fichier.value = ''; } });
    racine.append(el('h3', { textContent: 'Animations' }), rang('',
      champs.clip, etiquette('Nom', champs.nom),
      bouton('nouvelle', '+ Nouvelle', clips.nouvelle, 'Une animation neuve, avec la pose affichée comme première image'),
      bouton('dupliquerAnim', 'Dupliquer l\'animation', clips.dupliquer), bouton('gaucher', 'Version gauchère', clips.gaucher, 'Une copie en miroir (le fusil à l\'épaule gauche) : le jeu jouera le miroir pour environ 10 % des hommes'),
      bouton('supprimerAnim', 'Supprimer l\'animation', clips.supprimer), el('span', { className: 'aa-sep' }),
      champs.modele, bouton('ajouterModele', '+ Modèle', clips.modele, 'Ajouter l\'animation toute faite choisie'),
      el('span', { className: 'aa-sep' }),
      bouton('exporter', 'Exporter', () => clips.exporter(false)), bouton('exporterTout', 'Exporter tout', () => clips.exporter(true)), bouton('importer', 'Importer…', () => fichier.click()), fichier,
      bouton('publier', 'Publier', clips.publier, 'Écrire toute la bibliothèque dans le dépôt (assets/design/animations.json) ; le jeu ne la lit pas encore')));

    champs.vitesse = el('select', { title: 'Vitesse de lecture', onchange: () => { S.vitesse = +champs.vitesse.value; } }); for (const v of [0.1, 0.25, 0.5, 1, 2]) champs.vitesse.append(el('option', { value: v, textContent: `×${v}`, selected: v === 1 }));
    champs.mode = el('select', { title: 'Comment l\'animation se joue', onchange: () => faire(() => { S.anim.mode = champs.mode.value; }) }); for (const [v, n] of MODES) champs.mode.append(el('option', { value: v, textContent: n }));
    champs.fps = el('select', { title: 'La grille d\'images : le curseur et les images s\'y accrochent', onchange: () => { S.fps = +champs.fps.value; maj(); ctx.garder(); } }); for (const f of FPS) champs.fps.append(el('option', { value: f, textContent: `${f} i/s` }));
    champs.duree = el('input', { type: 'number', min: 0.05, step: 0.05, title: 'La durée totale (s)', onchange: () => faire(() => { S.anim.duree = Math.max(+champs.duree.value || 1, E.finDe(S.anim), 0.05); }) });
    boutons.gaucherApercu = bouton('gaucherApercu', 'Aperçu gaucher', () => { S.gaucher = !S.gaucher; maj(); }, 'Jouer l\'animation en miroir (le fusil à l\'épaule gauche), sans la changer', 'aa-bascule');
    boutons.oignon = bouton('oignon', 'Oignon', () => { S.oignon = !S.oignon; maj(); }, 'Montrer en fantôme les poses des images clés voisines (bleu : avant, jaune : après)', 'aa-bascule');
    boutons.autocle = bouton('autocle', 'Clé auto', () => { S.autoCle = !S.autoCle; maj(); ctx.garder(); }, 'Toute modification de la pose (curseurs, poignées) crée ou met à jour une image clé au curseur', 'aa-bascule');
    tempo = el('span', { className: 'aa-tempo' });
    racine.append(rang('Lecture',
      bouton('debut', '⏮', actions.debut, 'Début (Début)'), bouton('imgMoins', '◀|', () => actions.pas(-1), 'Image précédente (←)'), bouton('clePrec', '⏴', actions.clePrecedente, 'Image clé précédente (,)'),
      bouton('jouer', '▶ Lire', actions.jouer, 'Lire / pause (Espace)'), bouton('cleSuiv', '⏵', actions.cleSuivante, 'Image clé suivante (.)'), bouton('imgPlus', '|▶', () => actions.pas(1), 'Image suivante (→)'), bouton('fin', '⏭', actions.finir, 'Fin (Fin)'),
      etiquette('Vitesse', champs.vitesse), champs.mode, champs.fps, etiquette('Durée (s)', champs.duree), bouton('ajusterDuree', 'Ajuster', actions.ajusterDuree, 'La durée devient celle de la dernière image'),
      boutons.gaucherApercu, boutons.oignon, boutons.autocle, tempo));

    champs.courbe = el('select', { title: 'L\'allure du passage de l\'image choisie à la suivante', onchange: () => { if (sel().length) faire(() => E.appliquerCourbe(S.anim, sel(), champs.courbe.value)); } });
    for (const c of Object.keys(COURBES)) champs.courbe.append(el('option', { value: c, textContent: COURBES_NOMS[c] ?? c }));
    champs.instant = el('input', { type: 'number', min: 0, step: 0.01, title: 'L\'instant de l\'image choisie (s)', onchange: () => { if (S.cle) faire(() => { const k = E.cle(S.anim, S.cle); if (k) E.deplacerCles(S.anim, [S.cle], Math.max(0, +champs.instant.value || 0) - k.t); }); } });
    champs.etirer = el('input', { type: 'number', min: 0.1, step: 0.1, value: 1.5, title: 'Facteur de temps : 2 = deux fois plus lent' });
    racine.append(el('h3', { textContent: 'Images clés' }),
      rang('Créer', bouton('ajouter', '+ Image', actions.ajouter, 'Une image clé au curseur, avec la pose affichée (I)'), bouton('entre', 'Insérer entre', actions.insererEntre, 'Une image au milieu de l\'image choisie et de la suivante'),
        bouton('tenir', 'Tenir jusqu\'au curseur', actions.tenir, 'La pose de l\'image choisie est tenue jusqu\'au curseur : la pose dure'), bouton('dupliquer', 'Dupliquer', actions.dupliquer, 'Ctrl+D'),
        bouton('copier', 'Copier', actions.copier, 'Ctrl+C'), bouton('couper', 'Couper', actions.couper, 'Ctrl+X'), bouton('coller', 'Coller', actions.coller, 'Coller au curseur (Ctrl+V), seulement les canaux cochés'), bouton('supprimer', 'Supprimer', actions.supprimer, 'Suppr')),
      rang('Choisir', bouton('toutes', 'Tout', actions.toutes, 'Ctrl+A'), bouton('aucune', 'Rien', actions.aucune, 'Échap'), bouton('inverserSel', 'Inverser', actions.inverserSelection),
        el('span', { className: 'aa-sep' }), el('span', { className: 'aa-rang-nom', textContent: 'Coller seulement' }), ...Object.entries(NOMS_CANAUX).map(([c, n]) => {
          const b = el('input', { type: 'checkbox', checked: S.canaux.has(c), onchange: () => { if (b.checked) S.canaux.add(c); else S.canaux.delete(c); ctx.garder(); } });
          return el('label', { title: 'Coller seulement ce groupe (rien de coché : tout)' }, b, ' ', n);
        })),
      rang('Modifier', etiquette('Courbe', champs.courbe), etiquette('Instant (s)', champs.instant),
        bouton('miroirImages', 'Miroir', actions.miroirImages, 'Retourner gauche et droite dans les images choisies'), bouton('inverserTemps', 'Inverser le temps', actions.inverserTemps, 'Jouer les images choisies (ou toutes) à l\'envers'),
        bouton('repartir', 'Répartir', actions.repartir, 'Espacer régulièrement les images choisies (au moins trois)'), bouton('caler', 'Caler sur la grille', actions.caler, 'Les instants se calent sur la grille d\'images'),
        etiquette('Étirer ×', champs.etirer), bouton('etirerBtn', 'Étirer', actions.etirer, 'Les images choisies (ou toutes) : le temps ×facteur')));

    // la piste : règle, rangée des images, curseur ; défile à l'horizontale
    champs.zoom = el('input', { type: 'range', min: 40, max: 2000, step: 10, title: 'Zoom de la frise (Ctrl + molette)', oninput: () => { S.zoomFrise = +champs.zoom.value; maj(); } });
    regle = el('div', { className: 'aa-regle' }); rangee = el('div', { className: 'aa-rangee' });
    tete = el('div', { className: 'aa-tete-lecture', title: 'Le curseur : le glisser dans la règle' }); fin = el('div', { className: 'aa-fin', title: 'Fin de l\'animation : glisser pour changer la durée' });
    boite = el('div', { className: 'aa-boite', hidden: true });
    interieur = el('div', { className: 'aa-piste-in' }); interieur.append(regle, rangee, fin, tete, boite);
    piste = el('div', { className: 'aa-piste', tabIndex: 0 }); piste.append(interieur);
    info = el('span', { className: 'aa-note' });
    aide = el('div', { className: 'aa-aide', hidden: true }); aide.append(el('h4', { textContent: 'Raccourcis' }), ...RACCOURCIS.map(([k, d]) => el('div', {}, el('kbd', { textContent: k }), ' ' + d)));
    racine.append(rang('Frise', etiquette('Zoom', champs.zoom), info, el('span', { className: 'aa-sep' }), bouton('aide', 'Raccourcis', () => { aide.hidden = !aide.hidden; }, 'La liste des raccourcis')), piste, aide);
    brancherPiste();
    return racine;
  }

  // ─── la piste : dessin ───
  const xDe = t => MARGE + t * pps();
  const tDe = x => (x - MARGE) / pps();
  function dessiner() {
    const largeur = Math.max(piste.clientWidth - 2, xDe(duree()) + 80);
    interieur.style.width = `${largeur}px`; interieur.style.height = `${REGLE + PISTE_H}px`;
    regle.style.height = `${REGLE}px`; rangee.style.cssText = `top:${REGLE}px;height:${PISTE_H}px`;
    // la règle : des graduations choisies pour être à 40 px au moins l'une de l'autre ; les images de la grille quand on est assez près
    regle.replaceChildren();
    const pas = PAS_REGLE.find(p => p * pps() >= 46) ?? 10, nb = Math.ceil((largeur - MARGE) / pps() / pas);
    for (let n = 0; n <= nb; n++) { const t = n * pas, g = el('div', { className: 'aa-grad', textContent: pas >= 1 ? `${t.toFixed(0)} s` : `${t.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}` }); g.style.left = `${xDe(t)}px`; regle.append(g); }
    if (grille() * pps() >= 7) for (let f = 0; f * grille() * pps() < largeur; f++) { const g = el('div', { className: 'aa-img' }); g.style.left = `${xDe(f * grille())}px`; regle.append(g); }
    // la fin de l'animation
    fin.style.left = `${xDe(duree())}px`; fin.style.top = '0'; fin.style.height = `${REGLE + PISTE_H}px`;
    // les images
    rangee.replaceChildren();
    S.anim.images.forEach((im, n) => {
      const choisie = S.selection.has(im.id), d = el('div', { className: 'aa-cle' + (choisie ? ' is-on' : '') + (S.cle === im.id ? ' is-prim' : ''), title: `Image ${n + 1} · ${im.t.toFixed(3)} s · ${COURBES_NOMS[im.courbe] ?? im.courbe}` });
      d.dataset.id = im.id; d.style.left = `${xDe(im.t)}px`; d.append(el('span', { textContent: String(n + 1) })); rangee.append(d);
    });
    placerTete();
  }
  function placerTete() { tete.style.left = `${xDe(S.t)}px`; tete.style.height = `${REGLE + PISTE_H}px`; }
  // le curseur suit la lecture : appelée à chaque image de la page ; la piste défile pour le garder dans la vue
  function suivre() {
    placerTete();
    const f = Math.round(S.t * S.fps), n = Math.round(duree() * S.fps);
    tempo.textContent = `${S.t.toFixed(2)} s · image ${f} / ${n}`;
    if (S.joue) { const x = xDe(S.t); if (x < piste.scrollLeft + 20 || x > piste.scrollLeft + piste.clientWidth - 20) piste.scrollLeft = Math.max(0, x - 60); }
  }

  // ─── la piste : la souris ───
  function brancherPiste() {
    let glisse = null;
    const pos = e => { const r = interieur.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    piste.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const p = pos(e), c = e.target.closest?.('.aa-cle');
      piste.setPointerCapture(e.pointerId); piste.focus({ preventScroll: true });
      if (e.target.classList.contains('aa-fin')) { glisse = { type: 'fin' }; return; }
      if (c) {                                                                                   // une image : la choisir, puis peut-être la glisser
        const id = c.dataset.id;
        if (e.shiftKey) S.selection.add(id);
        else if (e.ctrlKey || e.metaKey) { if (S.selection.has(id)) S.selection.delete(id); else S.selection.add(id); }
        else if (!S.selection.has(id)) S.selection = new Set([id]);
        S.cle = S.selection.has(id) ? id : S.cle && S.selection.has(S.cle) ? S.cle : null;
        if (S.cle) ctx.chargerCle(S.cle, true);
        glisse = { type: 'cles', x0: p.x, origines: new Map(S.anim.images.filter(i => S.selection.has(i.id)).map(i => [i.id, i.t])), bouge: false, id };
        maj(); return;
      }
      if (p.y < REGLE) { glisse = { type: 'tete' }; deplacerTete(e, p); return; }                // la règle : le curseur
      glisse = { type: 'boite', x0: p.x, y0: p.y, ajout: e.shiftKey, avant: new Set(S.selection), bouge: false };      // le vide : un cadre de sélection
    });
    piste.addEventListener('pointermove', e => {
      if (!glisse) return;
      const p = pos(e);
      if (glisse.type === 'tete') deplacerTete(e, p);
      else if (glisse.type === 'fin') { const t = Math.max(E.finDe(S.anim), 0.05, calerT(tDe(p.x), e.altKey)); if (Math.abs(t - duree()) > 1e-6) { if (!glisse.pris) { ctx.instantane(); glisse.pris = true; } S.anim.duree = t; dessiner(); champs.duree.value = t.toFixed(2); } }
      else if (glisse.type === 'cles') {
        if (!glisse.bouge && Math.abs(p.x - glisse.x0) < 3) return;
        if (!glisse.bouge) { ctx.instantane(); glisse.bouge = true; }
        E.placerCles(S.anim, sel(), glisse.origines, calerT((p.x - glisse.x0) / pps(), e.altKey)); dessiner();
      } else if (glisse.type === 'boite') {
        if (!glisse.bouge && Math.abs(p.x - glisse.x0) < 3 && Math.abs(p.y - glisse.y0) < 3) return;
        glisse.bouge = true; boite.hidden = false;
        boite.style.cssText = `left:${Math.min(p.x, glisse.x0)}px;top:${REGLE}px;width:${Math.abs(p.x - glisse.x0)}px;height:${PISTE_H}px`;
        const dedans = E.clesDansIntervalle(S.anim, tDe(glisse.x0), tDe(p.x));
        S.selection = glisse.ajout ? new Set([...glisse.avant, ...dedans]) : dedans; S.cle = S.selection.size === 1 ? [...S.selection][0] : null; dessiner();
      }
    });
    const fini = () => {
      if (!glisse) return;
      const g = glisse; glisse = null; boite.hidden = true;
      if (g.type === 'cles' && g.bouge) { E.finirDeplacement(S.anim, sel()); ctx.garder(); }
      if (g.type === 'fin' && g.pris) ctx.garder();
      if (g.type === 'boite' && !g.bouge && !g.ajout) { S.selection = new Set(); S.cle = null; }          // un clic dans le vide : tout lâcher
      maj();
    };
    piste.addEventListener('pointerup', fini); piste.addEventListener('pointercancel', fini);
    piste.addEventListener('dblclick', e => {                                                      // une image à cet instant, avec la pose qu'a l'animation
      const p = pos(e); if (e.target.closest?.('.aa-cle') || p.y < REGLE) return;
      faire(() => { const t = calerT(tDe(p.x), e.altKey), k = E.ajouterCle(S.anim, t, echantillon(S.anim, t), 'doux'); choisir([k.id], k.id); ctx.chargerCle(k.id, true); });
    });
    piste.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const avant = tDe(pos(e).x), vue = e.clientX - piste.getBoundingClientRect().left;
      S.zoomFrise = Math.max(40, Math.min(2000, S.zoomFrise * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); champs.zoom.value = S.zoomFrise; dessiner();
      piste.scrollLeft = xDe(avant) - vue;
    }, { passive: false });
    function deplacerTete(e, p) { S.t = Math.max(0, Math.min(duree(), calerT(tDe(p.x), e.altKey))); S.joue = false; S.mode = 'lecture'; S.cle = null; placerTete(); suivre(); ctx.majCurseurs(); }
  }

  // ─── tout remettre à jour (la sélection, la bibliothèque, les boutons) ───
  function maj() {
    nettoyerSelection();
    champs.clip.replaceChildren(...S.biblio.map((a, i) => el('option', { value: i, textContent: a.nom, selected: i === S.iAnim })));
    if (document.activeElement !== champs.nom) champs.nom.value = S.anim.nom;
    if (document.activeElement !== champs.duree) champs.duree.value = (+duree().toFixed(3));
    champs.mode.value = S.anim.mode ?? 'boucle'; champs.fps.value = S.fps; champs.vitesse.value = S.vitesse; champs.zoom.value = S.zoomFrise;
    boutons.jouer.textContent = S.joue ? '⏸ Pause' : '▶ Lire';
    boutons.gaucherApercu.setAttribute('aria-pressed', !!S.gaucher); boutons.oignon.setAttribute('aria-pressed', !!S.oignon); boutons.autocle.setAttribute('aria-pressed', !!S.autoCle);
    const n = S.selection.size, k = S.cle ? E.cle(S.anim, S.cle) : null;
    const off = (id, v) => { boutons[id].disabled = !!v; };
    off('dupliquer', !n); off('copier', !n); off('couper', !n); off('supprimer', !n); off('coller', !S.presse); off('inverserSel', !S.anim.images.length);
    off('entre', !k || S.anim.images.length < 2); off('tenir', !k); off('miroirImages', !n); off('repartir', n < 3); off('supprimerAnim', S.biblio.length < 2);
    champs.instant.disabled = !k; champs.courbe.disabled = !n;
    if (k && document.activeElement !== champs.instant) champs.instant.value = k.t.toFixed(3);
    if (n) champs.courbe.value = (E.cle(S.anim, S.cle ?? [...S.selection][0]) ?? { courbe: 'doux' }).courbe;
    info.textContent = `${S.anim.images.length} image(s) clé(s) · ${n} choisie(s)${S.presse ? ` · presse-papiers : ${S.presse.cles.length}` : ''}`;
    dessiner(); suivre();
  }
  return { monter, maj, suivre, actions, clips };
}
