// L'atelier d'animation (Jérôme, 7 nov. : « un atelier dans lequel je peux définir les poses du soldat articulé, puis tu ferais les interpolations ») : une page à part.
// On règle la pose d'un soldat articulé articulation par articulation (curseurs), on la range en images clés sur une frise, et l'interpolation (js/pose-soldat.js) rejoue le mouvement.
// Le dessin est celui du jeu : le soldat articulé (js/rendu/soldat-articule.js) en pose libre (`poserLibre` : les angles viennent des curseurs, pas des poses calculées du nuanceur).
// Rien n'est écrit dans une bataille ; le brouillard de l'atelier est dans ce navigateur (`cyclopeen:atelier-anim`), l'export est un fichier JSON.
import { PALETTE } from './palette.js?v=0.131.0';
import { loadThree } from './three-lib.js?v=0.131.0';
import { identite, caracteristiques } from './identite.js?v=0.131.0';
import { aspect } from './aspect-soldat.js?v=0.131.0';
import { creerSoldatArticule, poserLibre } from './rendu/soldat-articule.js?v=0.131.0';
import { CHAMPS, NOMS_CHAMPS, COURBES } from './data/poses-soldat.js?v=0.131.0';
import { poseNeutre, poseDe, miroir, borner, echantillon, marcheEnImages, articulations, OS_ARTICULES, ikBras, ikJambe, CARRURE_NEUTRE } from './pose-soldat.js?v=0.131.0';
import * as E from './anim-edition.js?v=0.131.0';
import { MODELES } from './anim-modeles.js?v=0.131.0';
import { creerFrise } from './atelier-frise.js?v=0.131.0';
import { creerPoignees, OUTILS } from './atelier-poignees.js?v=0.131.0';

const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const CLE = 'cyclopeen:atelier-anim';
const TAN15 = Math.tan(15 * Math.PI / 180);
const FACTEUR = 2;

// Les groupes de curseurs : [titre, [champ, nom]]
const GROUPES = [
  ['Corps', [['buste', 'Buste'], ['tete', 'Tête'], ['descente', 'Baissé (m)'], ['poussee', 'Poussée (m)'], ['basques', 'Basques'], ['couche', 'Couché']]],
  ['Jambe gauche', [['hancheG', 'Hanche'], ['genouG', 'Genou'], ['chevilleG', 'Cheville']]],
  ['Jambe droite', [['hancheD', 'Hanche'], ['genouD', 'Genou'], ['chevilleD', 'Cheville']]],
  ['Bras gauche', [['epauleG', 'Épaule'], ['coudeG', 'Coude'], ['convG', 'Épaule (tour)']]],
  ['Bras droit', [['epauleD', 'Épaule'], ['coudeD', 'Coude'], ['convD', 'Épaule (tour)']]],
  ['Fusil', [['fusil', 'Flexion'], ['fusilLacet', 'Lacet (visée)'], ['fusilRoulis', 'Roulis'], ['fusilX', 'Côté'], ['fusilH', 'Hauteur'], ['fusilZ', 'Avant'], ['fusilY', 'Pivot (m)']]],
];
// Les poses du jeu qu'on peut charger comme point de départ
const DU_JEU = [
  ['Repos', {}], ['Marche (pas gauche)', { vit: 1, phase: Math.PI / 2 }], ['Marche (pas droit)', { vit: 1, phase: -Math.PI / 2 }], ['Tir', { tir: 1 }], ['Accroupi', { tapi: 1 }],
  ['Feu retenu', { retenu: true }], ['Mêlée', { melee: true, pouss: 0 }], ['Mêlée (coup)', { melee: true, pouss: 1 }], ['Couché', { couche: 1 }],
];

// ─── l'état ───
// `S.biblio` : toutes les animations ; `S.anim` est celle qu'on édite (`S.iAnim`). `S.selection` : les numéros des images choisies, `S.cle` : l'image « principale » (celle que les curseurs et les poignées modifient).
const S = { biblio: [], iAnim: 0, pose: poseNeutre(), mode: 'lecture', selection: new Set(), cle: null, t: 0, joue: true, sens: 1, vitesse: 1, fps: 30, zoomFrise: 260, gaucher: false, oignon: true, autoCle: false, presse: null, canaux: new Set(),
  yaw: 0.6, tangage: 0.2, ppm: 48, auto: false, id: 1234, camp: 0, niveau: 'fin', echelle: { taille: 1, epaules: 1, ventre: 1 } };
Object.defineProperty(S, 'anim', { get() { return S.biblio[S.iAnim]; }, set(a) { S.biblio[S.iAnim] = a; } });
const assainir = a => E.assainir(a, borner);
function depart() {
  const marche = marcheEnImages(1, 0.8); marche.nom = 'marche';
  S.biblio = [assainir(marche), ...MODELES.map(m => assainir(m.creer()))]; S.iAnim = 0;
}
function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (d?.biblio?.length) {                                    // v2 : toute la bibliothèque
      S.biblio = d.biblio.map(assainir); S.iAnim = Math.max(0, Math.min(S.biblio.length - 1, d.iAnim | 0)); S.pose = borner(d.pose ?? poseNeutre());
      if (d.fps) S.fps = d.fps; if (d.zoomFrise) S.zoomFrise = d.zoomFrise; S.autoCle = !!d.autoCle; S.canaux = new Set(d.canaux ?? []);
    } else if (d?.anim?.images?.length) {                       // v1 : une seule animation ; la bibliothèque s'ouvre avec les modèles à côté
      S.biblio = [assainir(d.anim), ...MODELES.map(m => assainir(m.creer()))]; S.iAnim = 0; S.pose = borner(d.pose ?? poseNeutre());
    } else depart();
  } catch { depart(); }
}
let attente = 0;
function garder() { clearTimeout(attente); attente = setTimeout(() => { try { localStorage.setItem(CLE, JSON.stringify({ v: 2, biblio: S.biblio, iAnim: S.iAnim, pose: S.pose, fps: S.fps, zoomFrise: S.zoomFrise, autoCle: S.autoCle, canaux: [...S.canaux] })); } catch { /* ignoré */ } }, 300); }
charger();
S.mode = 'lecture';

// ─── le soldat ───
function soldat() {
  const k = 40, I = identite(7, S.camp, S.id, k, 125);
  return aspect(S.id, S.camp, 7, I.rang, I.age, caracteristiques(S.id, S.camp));
}
let A = soldat();
let frise = null;
const majBoutons = () => frise?.maj();
const avertir = txt => { let t = $('aa-toast'); if (!t) { t = el('div', { id: 'aa-toast', className: 'aa-toast', role: 'status' }); document.body.append(t); } t.textContent = txt; t.hidden = false; clearTimeout(avertir.n); avertir.n = setTimeout(() => { t.hidden = true; }, 2800); };

// ─── l'historique (annuler / rétablir) : des photos de la bibliothèque, de la pose et du choix, prises AVANT chaque geste ───
const H = { pile: [], refaire: [] };
let geste = false, majHistorique = () => {};
const photo = () => JSON.stringify({ biblio: S.biblio, iAnim: S.iAnim, pose: S.pose, selection: [...S.selection], cle: S.cle, mode: S.mode, t: S.t });
function instantane() {
  const p = photo();
  if (H.pile[H.pile.length - 1] === p) return;
  H.pile.push(p); if (H.pile.length > 100) H.pile.shift();
  H.refaire.length = 0; majHistorique();
}
function restaurer(p) {
  const d = JSON.parse(p);
  S.biblio = d.biblio; S.iAnim = d.iAnim; S.pose = d.pose; S.mode = d.mode; S.t = d.t; S.joue = false; S.selection = new Set(d.selection); S.cle = d.cle;
  garder(); majBoutons(); majHistorique();
}
function annuler() { if (!H.pile.length) return; H.refaire.push(photo()); restaurer(H.pile.pop()); }
function retablir() { if (!H.refaire.length) return; H.pile.push(photo()); restaurer(H.refaire.pop()); }

// ─── la pose affichée ───
// en édition : la pose qu'on règle ; en lecture : celle de l'animation à l'instant t (en miroir si l'aperçu gaucher est demandé) ; `poseReelle` : la même sans le miroir (ce qu'on range dans une image)
const poseReelle = () => S.mode === 'edit' ? S.pose : echantillon(S.anim, S.t);
const poseAffichee = () => S.mode === 'lecture' && S.gaucher ? miroir(echantillon(S.anim, S.t)) : poseReelle();
const cleCourante = () => S.cle ? E.cle(S.anim, S.cle) : null;

// ─── l'écran ───
const sliders = {};
function monterPanneau() {
  const p = $('aa-poses');
  p.append(el('h3', { textContent: 'Partir d\'une pose du jeu' }));
  const liste = el('div', { className: 'aa-rang' });
  for (const [nom, etat] of DU_JEU) liste.append(el('button', { textContent: nom, onclick: () => { definir(poseDe(etat)); } }));
  p.append(liste);
  const outils = el('div', { className: 'aa-rang' });
  outils.append(el('button', { textContent: 'Miroir gauche ↔ droite', onclick: () => definir(miroir(poseReelle())) }), el('button', { textContent: 'Pose neutre', onclick: () => definir(poseNeutre()) }));
  p.append(outils);
  for (const [titre, champs] of GROUPES) {
    p.append(el('h3', { textContent: titre }));
    for (const [c, nom] of champs) {
      const [lo, hi] = CHAMPS[c];
      const sortie = el('input', { type: 'number', step: 0.01, title: 'Une valeur exacte, sans limite (le curseur a sa course, pas la pose)' }), curseur = el('input', { type: 'range', min: lo, max: hi, step: c === 'couche' ? 1 : 0.01 });
      sortie.onchange = () => { if (sortie.value !== '') { geste = true; reglerChamp(c, +sortie.value); } };
      curseur.onpointerdown = curseur.onkeydown = () => { geste = true; };
      curseur.oninput = () => reglerChamp(c, +curseur.value);
      curseur.ondblclick = () => { geste = true; curseur.value = poseNeutre()[c]; curseur.oninput(); };
      sliders[c] = { curseur, sortie };
      p.append(el('label', { className: 'aa-champ' }, el('span', { textContent: nom }), curseur, sortie));
    }
  }
  p.append(el('p', { className: 'aa-note', textContent: 'Double-clic sur un curseur : le remettre à zéro. Angles en radians (x : fléchir ; « tour » : autour de la verticale).' }));
}
// passe en édition : si on lisait, la pose de l'animation à cet instant devient la pose à modifier (sans le miroir de l'aperçu) ; l'image principale est lâchée : on n'écrase pas une image clé par mégarde
function entrerEdition() {
  if (S.mode === 'lecture') { S.pose = { ...echantillon(S.anim, S.t) }; S.mode = 'edit'; S.cle = null; S.gaucher = false; majBoutons(); }
  S.joue = false;
}
// change un champ de la pose (un curseur, une poignée) ; l'image principale le suit ; en « clé auto », une image est créée au curseur s'il n'y en a pas
function reglerChamp(c, v) {
  if (geste) { instantane(); geste = false; }
  entrerEdition();
  if (!Number.isFinite(v)) return;      // (aucune limite : seulement des nombres)
  S.pose[c] = v;
  if (S.autoCle && !S.cle) { const k = E.ajouterCle(S.anim, Math.round(S.t * S.fps) / S.fps, S.pose, 'doux'); S.selection = new Set([k.id]); S.cle = k.id; majBoutons(); }
  const k = cleCourante(); if (k) k.pose[c] = v;
  garder(); majCurseurs();
}
// remplace la pose courante (et celle de l'image principale)
function definir(pose) { instantane(); entrerEdition(); S.pose = { ...pose }; const k = cleCourante(); if (k) k.pose = { ...pose }; garder(); majBoutons(); majCurseurs(); }
function majCurseurs() {
  const P = poseAffichee();
  for (const c of NOMS_CHAMPS) { const { curseur, sortie } = sliders[c]; if (document.activeElement !== curseur) curseur.value = P[c]; if (document.activeElement !== sortie) sortie.value = (+P[c].toFixed(3)); }
}
// choisir une image pour la modifier : sa pose devient celle qu'on règle, le curseur va à son instant
function chargerCle(id) {
  const k = E.cle(S.anim, id); if (!k) return;
  S.pose = { ...k.pose }; S.t = k.t; S.mode = 'edit'; S.joue = false; S.cle = id; S.selection.add(id); S.gaucher = false; majCurseurs();
}

// ─── le dessin ───
async function demarrer() {
  monterPanneau();
  frise = creerFrise({ S, instantane, garder, chargerCle, poseReelle, majCurseurs, avertir, assainir });
  $('aa-frise').append(frise.monter()); frise.maj();
  const acts = frise.actions;
  const canvas = $('aa-canvas'), scene3 = $('aa-scene');
  const THREE = await loadThree();
  const col = l => new THREE.Color(PALETTE[l]);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = col('s');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const niveaux = ['fin', 'moyen'].map(niveau => { const so = creerSoldatArticule(THREE, col, { complet: true, ombrage: 0.5, niveau, translucide: true }); const lo = so.instances(1); scene.add(lo.mesh); return { niveau, so, lo }; });
  const sol = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({ color: col('b') })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.add(sol);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: col('t'), transparent: true, opacity: 0.55 })); ombre.rotation.x = -Math.PI / 2; ombre.scale.y = 0.7; ombre.position.y = 0.002; scene.add(ombre);
  // le soldat translucide pendant l'édition (on voit les os et les poignées au travers) : un premier passage n'écrit que la profondeur, le second mélange la couleur seulement
  // là où la surface est la plus proche ; sinon les faces de l'intérieur du corps se verraient aussi
  for (const n of niveaux) {
    const m = n.so.materiel;
    n.pre = new THREE.Mesh(n.lo.geometrie, new THREE.ShaderMaterial({ uniforms: m.uniforms, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, side: m.side, colorWrite: false }));
    n.pre.frustumCulled = false; scene.add(n.pre);
  }
  let w = 0, h = 0, dernier = performance.now(), cibleLisse = null;
  // les poignées 3D (js/atelier-poignees.js) : tourner, déplacer, échelle
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const G = creerPoignees(THREE, { canvas, camera, ppm: () => S.ppm, lire: c => poseAffichee()[c], regler: reglerChamp,
    ik: (id, cible) => {      // une main ou une cheville tirée vers `cible` : les angles de l'épaule et du coude (ou de la hanche et du genou) sont recalculés
      const P = poseAffichee(), g = id.endsWith('G') ? 'G' : 'D', car = S.carrure ?? CARRURE_NEUTRE;
      const r = id.startsWith('main') ? ikBras(P, car, g, cible) : ikJambe(P, car, g, cible);
      window.__atelier.dernierIk = { id, cible, r, car };      // (pour les scripts de test)
      for (const [c, v] of Object.entries(r)) reglerChamp(c, v);
    },
    echelleLire: cle => S.echelle[cle], echelleRegler: (cle, v) => { S.echelle[cle] = clamp(v, 0.7, 1.35); }, os: OS_ARTICULES, avant: () => { if (S.mode === 'lecture') { instantane(); entrerEdition(); } else geste = true; }, apres: () => majBoutons() });
  const barre = el('div', { className: 'aa-outils' });
  const boutonsOutils = OUTILS.map(([id, nom, touche]) => { const b = el('button', { textContent: `${nom} (${touche})`, title: `${nom} : touche ${touche}`, onclick: () => choisirOutil(id) }); barre.append(b); return [id, b]; });
  const bAnnuler = el('button', { textContent: '↶ Annuler', title: 'Annuler (Ctrl+Z)', onclick: annuler }), bRetablir = el('button', { textContent: '↷ Rétablir', title: 'Rétablir (Ctrl+Maj+Z ou Ctrl+Y)', onclick: retablir });
  majHistorique = () => { bAnnuler.disabled = !H.pile.length; bRetablir.disabled = !H.refaire.length; };
  majHistorique(); barre.append(bAnnuler, bRetablir);
  const viser = () => { S.focus = S.focus ? null : G.sel; };
  const boutonViser = el('button', { textContent: 'Viser (F)', title: 'Recentre la vue sur l\'articulation choisie (touche F) : on peut zoomer très près sans la perdre', onclick: viser });
  barre.append(boutonViser);
  barre.append(el('button', { textContent: 'Carrure ×1', title: 'Remet la carrure d\'origine (l\'échelle ne sert qu\'à l\'aperçu)', onclick: () => { S.echelle = { taille: 1, epaules: 1, ventre: 1 }; } }));
  scene3.append(barre);
  function choisirOutil(id) { G.outil = id; for (const [i, b] of boutonsOutils) b.setAttribute('aria-pressed', i === id); }
  choisirOutil('tourner');
  window.__atelier = { S, niveaux, jeu: null, G, camera, frise, E };       // (pour les scripts de test : `jeu` = { vit, tir, tapi, couche } fait dessiner la pose calculée du nuanceur à la place de la pose libre)
  function image(now) {
    requestAnimationFrame(image);
    const dt = Math.min(0.1, (now - dernier) / 1000); dernier = now;
    const r = scene3.getBoundingClientRect(), nw = Math.max(80, Math.round(r.width / FACTEUR)), nh = Math.max(80, Math.round(r.height / FACTEUR));
    if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    if (S.joue) {                                  // la lecture : en boucle, une fois, ou aller-retour
      const D = S.anim.duree, mode = S.anim.mode ?? 'boucle';
      S.t += dt * S.vitesse * S.sens;
      if (mode === 'boucle') S.t = ((S.t % D) + D) % D;
      else if (mode === 'allerretour') { if (S.t >= D) { S.t = D; S.sens = -1; } else if (S.t <= 0) { S.t = 0; S.sens = 1; } }
      else if (S.t >= D) { S.t = D; S.joue = false; majBoutons(); }
      frise.suivre();
    }
    if (S.mode === 'lecture') majCurseurs();
    const P = poseAffichee();
    // la carrure de l'aperçu : celle de l'homme × l'échelle des poignées
    const c0 = A.carrure, carrure = { ...c0, taille: c0.taille * S.echelle.taille, epaules: c0.epaules * S.echelle.epaules, ventre: c0.ventre * S.echelle.ventre };
    S.carrure = carrure;
    const A2 = { ...A, carrure };
    const fantome = S.mode === 'edit';      // en édition : le soldat translucide, les os et les poignées ; en lecture : plein, les poignées à peine suggérées
    const Jt = articulations(P, carrure);
    G.maj(Jt, { lecture: !fantome });
    // la pelure d'oignon : les poses des images clés voisines, en fantôme (bleu : l'image d'avant, jaune : celle d'après), seulement à l'arrêt
    const fant = [];
    if (S.oignon && !S.joue) { const pr = E.clePrecedente(S.anim, S.t), su = E.cleSuivante(S.anim, S.t); if (pr) fant.push({ J: articulations(pr.pose, carrure), couleur: 0x8cb6ff }); if (su) fant.push({ J: articulations(su.pose, carrure), couleur: 0xdde874 }); }
    G.fantomes(fant);
    for (const { niveau, so, lo } of niveaux) {
      const J = window.__atelier.jeu;
      poserLibre(so.materiel, J ? null : P);
      lo.ecrire(0, { x: 0, y: 0, z: 0, camp: S.camp, vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, cap: 0, temps: 0, aspect: A2, ...(J ?? {}) }); lo.envoyer(1);
      lo.mesh.visible = niveau === S.niveau;
      so.materiel.uniforms.uAlpha.value = fantome ? 0.42 : 1; so.materiel.transparent = fantome;
      niveaux.find(n => n.niveau === niveau).pre.visible = fantome && niveau === S.niveau;
    }
    ombre.scale.set(P.couche > 0.5 ? 2 : 1, P.couche > 0.5 ? 0.55 : 0.7, 1);
    if (S.auto) S.yaw += dt * 0.5;
    // la cible de la caméra : le milieu du corps, ou (touche F) l'articulation choisie, rejointe en douceur : de près, on règle une main ou le fusil sans le perdre de vue
    if (S.focus && !Jt[S.focus]) S.focus = null;
    const but = S.focus ? new THREE.Vector3(...Jt[S.focus].pos) : new THREE.Vector3(0, P.couche > 0.5 ? 0.2 : 0.88 * carrure.taille, 0);
    cibleLisse = cibleLisse ? cibleLisse.lerp(but, 1 - Math.exp(-dt * 12)) : but.clone();
    const cible = cibleLisse, d = h / (2 * S.ppm * TAN15);
    boutonViser.setAttribute('aria-pressed', !!S.focus);
    camera.position.set(d * Math.sin(S.yaw) * Math.cos(S.tangage), cible.y + d * Math.sin(S.tangage), d * Math.cos(S.yaw) * Math.cos(S.tangage));
    camera.lookAt(cible); camera.near = Math.max(0.02, d * 0.1); camera.far = d + 30; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    G.rendre(renderer);
    const choix = G.sel ? ` · ${G.nom(G.sel)}` : '';
    $('aa-legende').textContent = `${S.mode === 'edit' ? 'Édition' : S.gaucher ? 'Lecture (gaucher)' : 'Lecture'} · ${S.anim.nom} · t = ${S.t.toFixed(2)} s${choix} · clic : choisir une articulation, tirer l\'anneau (Maj : par 15°) · glisser ailleurs : tourner la vue · molette : zoom · Raccourcis : sous la frise`;
  }
  let glisse = null;
  canvas.onpointerdown = e => { canvas.setPointerCapture(e.pointerId); if (G.down(e)) { if (S.mode === 'lecture') { instantane(); entrerEdition(); } return; } glisse = { x: e.clientX, y: e.clientY }; S.auto = false; };
  canvas.onpointermove = e => { if (G.actif) { G.move(e, e.shiftKey); return; } if (!glisse) { G.move(e); canvas.style.cursor = G.survol ? 'pointer' : 'grab'; return; } S.yaw -= (e.clientX - glisse.x) * 0.01; S.tangage = Math.max(-0.2, Math.min(1.45, S.tangage + (e.clientY - glisse.y) * 0.008)); glisse = { x: e.clientX, y: e.clientY }; };
  canvas.onpointerup = canvas.onpointercancel = () => { G.up(); glisse = null; };
  canvas.onwheel = e => { e.preventDefault(); S.ppm = Math.max(8, Math.min(900, +(S.ppm * (e.deltaY < 0 ? 1.15 : 1 / 1.15)).toFixed(1))); };
  // le clavier : annuler, les outils de la frise, la lecture ; dans un champ de texte ou de nombre, les touches restent celles du champ
  document.addEventListener('keydown', e => {
    const t = document.activeElement, tag = t?.tagName ?? '';
    const saisie = tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'number'].includes(t.type));
    if (saisie) return;
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase(), faire = f => { e.preventDefault(); f(); };
      if (k === 'z') return faire(() => e.shiftKey ? retablir() : annuler());
      if (k === 'y') return faire(retablir);
      if (k === 'a') return faire(acts.toutes); if (k === 'c') return faire(acts.copier); if (k === 'x') return faire(acts.couper); if (k === 'v') return faire(acts.coller); if (k === 'd') return faire(acts.dupliquer);
      return;
    }
    if (tag === 'SELECT' || (tag === 'INPUT' && t.type === 'range' && /^(Arrow|Home|End|Page)/.test(e.key))) return;       // (les flèches d'un curseur ou d'une liste restent les leurs)
    const touche = e.key.toLowerCase(), prise = f => { e.preventDefault(); f(); };
    if (e.key === ' ' && tag !== 'BUTTON') return prise(acts.jouer);
    if (e.key === 'ArrowLeft') return prise(() => acts.pas(e.shiftKey ? -10 : -1));
    if (e.key === 'ArrowRight') return prise(() => acts.pas(e.shiftKey ? 10 : 1));
    if (e.key === ',') return prise(acts.clePrecedente); if (e.key === '.') return prise(acts.cleSuivante);
    if (e.key === 'Home') return prise(acts.debut); if (e.key === 'End') return prise(acts.finir);
    if (touche === 'i' || (e.key === 'Enter' && tag !== 'BUTTON')) return prise(acts.ajouter);
    if (e.key === 'Delete' || e.key === 'Backspace') return prise(acts.supprimer);
    if (e.key === 'Escape') { G.sel = null; S.focus = null; return acts.aucune(); }
    const o = OUTILS.find(([, , k]) => k.toLowerCase() === touche); if (o) return choisirOutil(o[0]);
    if (touche === 'f') viser();
  });
  requestAnimationFrame(image);
}
demarrer().catch(e => { $('aa-scene').textContent = `L'atelier n'a pas pu démarrer : ${e.message}`; });
