// L'atelier d'animation (Jérôme, 7 nov. : « un atelier dans lequel je peux définir les poses du soldat articulé, puis tu ferais les interpolations ») : une page à part.
// On règle la pose d'un soldat articulé articulation par articulation (curseurs), on la range en images clés sur une frise, et l'interpolation (js/pose-soldat.js) rejoue le mouvement.
// Le dessin est celui du jeu : le soldat articulé (js/rendu/soldat-articule.js) en pose libre (`poserLibre` : les angles viennent des curseurs, pas des poses calculées du nuanceur).
// Rien n'est écrit dans une bataille ; le brouillard de l'atelier est dans ce navigateur (`cyclopeen:atelier-anim`), l'export est un fichier JSON.
import { PALETTE } from './palette.js?v=0.113.0';
import { loadThree } from './three-lib.js?v=0.113.0';
import { identite, caracteristiques } from './identite.js?v=0.113.0';
import { aspect } from './aspect-soldat.js?v=0.113.0';
import { creerSoldatArticule, poserLibre } from './rendu/soldat-articule.js?v=0.113.0';
import { CHAMPS, NOMS_CHAMPS, COURBES } from './data/poses-soldat.js?v=0.113.0';
import { poseNeutre, poseDe, miroir, borner, echantillon, marcheEnImages } from './pose-soldat.js?v=0.113.0';

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
  ['Fusil', [['fusil', 'Rotation'], ['fusilX', 'Côté'], ['fusilZ', 'Avant'], ['fusilY', 'Pivot (m)']]],
];
// Les poses du jeu qu'on peut charger comme point de départ
const DU_JEU = [
  ['Repos', {}], ['Marche (pas gauche)', { vit: 1, phase: Math.PI / 2 }], ['Marche (pas droit)', { vit: 1, phase: -Math.PI / 2 }], ['Tir', { tir: 1 }], ['Accroupi', { tapi: 1 }],
  ['Feu retenu', { retenu: true }], ['Mêlée', { melee: true, pouss: 0 }], ['Mêlée (coup)', { melee: true, pouss: 1 }], ['Couché', { couche: 1 }],
];

// ─── l'état ───
const S = { anim: marcheEnImages(1, 0.8), pose: poseNeutre(), mode: 'lecture', sel: -1, t: 0, joue: true, vitesse: 1, yaw: 0.6, tangage: 0.2, ppm: 48, auto: false, id: 1234, camp: 0, niveau: 'fin' };
S.anim.nom = 'marche';
function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (d?.anim?.images?.length) { S.anim = normaliser(d.anim); S.pose = borner(d.pose ?? poseNeutre()); }
  } catch { /* pas de stockage : on part de la marche */ }
}
let attente = 0;
function garder() { clearTimeout(attente); attente = setTimeout(() => { try { localStorage.setItem(CLE, JSON.stringify({ anim: S.anim, pose: S.pose })); } catch { /* ignoré */ } }, 300); }
// une animation lue d'un fichier : poses bornées, images rangées, durée sensée
function normaliser(a) {
  const images = (a.images ?? []).map(i => ({ t: Math.max(0, +i.t || 0), pose: { ...poseNeutre(), ...borner(i.pose ?? {}) }, courbe: COURBES[i.courbe] ? i.courbe : 'doux' })).sort((x, y) => x.t - y.t);
  const fin = images.length ? images[images.length - 1].t : 0;
  return { nom: String(a.nom ?? 'animation').slice(0, 40), boucle: a.boucle !== false, duree: Math.max(0.1, +a.duree || fin || 1), images };
}
charger();

// ─── le soldat ───
function soldat() {
  const k = 40, I = identite(7, S.camp, S.id, k, 125);
  return aspect(S.id, S.camp, 7, I.rang, I.age, caracteristiques(S.id, S.camp));
}
let A = soldat();

// ─── la pose affichée ───
const poseAffichee = () => S.mode === 'edit' ? S.pose : echantillon(S.anim, S.t);

// ─── l'écran ───
const sliders = {};
function monterPanneau() {
  const p = $('aa-poses');
  p.append(el('h3', { textContent: 'Partir d\'une pose du jeu' }));
  const liste = el('div', { className: 'aa-rang' });
  for (const [nom, etat] of DU_JEU) liste.append(el('button', { textContent: nom, onclick: () => { definir(poseDe(etat)); } }));
  p.append(liste);
  const outils = el('div', { className: 'aa-rang' });
  outils.append(el('button', { textContent: 'Miroir gauche ↔ droite', onclick: () => definir(miroir(S.pose)) }), el('button', { textContent: 'Pose neutre', onclick: () => definir(poseNeutre()) }));
  p.append(outils);
  for (const [titre, champs] of GROUPES) {
    p.append(el('h3', { textContent: titre }));
    for (const [c, nom] of champs) {
      const [lo, hi] = CHAMPS[c];
      const sortie = el('output'), curseur = el('input', { type: 'range', min: lo, max: hi, step: c === 'couche' ? 1 : 0.01 });
      curseur.oninput = () => { S.mode = 'edit'; S.joue = false; S.pose[c] = +curseur.value; if (S.sel >= 0) S.anim.images[S.sel].pose[c] = +curseur.value; sortie.textContent = (+curseur.value).toFixed(2); garder(); majBoutons(); };
      curseur.ondblclick = () => { curseur.value = poseNeutre()[c]; curseur.oninput(); };
      sliders[c] = { curseur, sortie };
      p.append(el('label', { className: 'aa-champ' }, el('span', { textContent: nom }), curseur, sortie));
    }
  }
  p.append(el('p', { className: 'aa-note', textContent: 'Double-clic sur un curseur : le remettre à zéro. Angles en radians (x : fléchir ; « tour » : autour de la verticale).' }));
}
// remplace la pose courante (et celle de l'image choisie)
function definir(pose) { S.mode = 'edit'; S.joue = false; S.pose = { ...pose }; if (S.sel >= 0) S.anim.images[S.sel].pose = { ...pose }; garder(); majBoutons(); }
function majCurseurs() {
  const P = poseAffichee();
  for (const c of NOMS_CHAMPS) { const { curseur, sortie } = sliders[c]; if (document.activeElement !== curseur) curseur.value = P[c]; sortie.textContent = P[c].toFixed(2); }
}

// ─── la frise ───
let piste, curseurT, boutonJouer, boutonBoucle, champDuree, champT, choixCourbe, champNom, avertir;
function monterFrise() {
  const f = $('aa-frise');
  boutonJouer = el('button', { textContent: '▶ Lire', onclick: () => { if (S.joue) S.joue = false; else { S.joue = true; S.mode = 'lecture'; if (!S.anim.boucle && S.t >= S.anim.duree) S.t = 0; } majBoutons(); } });
  boutonBoucle = el('button', { textContent: 'Boucle', onclick: () => { S.anim.boucle = !S.anim.boucle; garder(); majBoutons(); } });
  const vit = el('select', { onchange: () => { S.vitesse = +vit.value; } }); for (const v of [0.1, 0.25, 0.5, 1, 2]) vit.append(el('option', { value: v, textContent: `×${v}`, selected: v === 1 }));
  champDuree = el('input', { type: 'number', min: 0.1, max: 20, step: 0.05, onchange: () => { S.anim.duree = Math.max(0.1, +champDuree.value || 1); garder(); majBoutons(); } });
  champNom = el('input', { type: 'text', size: 14, onchange: () => { S.anim.nom = champNom.value.slice(0, 40); garder(); } });
  piste = el('div', { className: 'aa-piste' });
  curseurT = el('div', { className: 'aa-curseur' });
  piste.onpointerdown = e => { if (e.target !== piste && e.target !== curseurT) return; const r = piste.getBoundingClientRect(); S.t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * S.anim.duree; S.joue = false; S.mode = 'lecture'; S.sel = -1; majBoutons(); };
  champT = el('input', { type: 'number', min: 0, step: 0.01, onchange: () => { if (S.sel < 0) return; S.anim.images[S.sel].t = Math.max(0, +champT.value || 0); trier(); } });
  choixCourbe = el('select', { onchange: () => { if (S.sel >= 0) { S.anim.images[S.sel].courbe = choixCourbe.value; garder(); } } }); for (const c of Object.keys(COURBES)) choixCourbe.append(el('option', { value: c, textContent: c }));
  const fichier = el('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async () => { try { const d = JSON.parse(await fichier.files[0].text()); S.anim = normaliser(d.anim ?? d); S.sel = -1; S.t = 0; S.mode = 'lecture'; garder(); majBoutons(); avertir('Animation chargée.'); } catch (e) { avertir(`Fichier illisible : ${e.message}`); } fichier.value = ''; } });
  avertir = txt => { note.textContent = txt; };
  const note = el('span', { className: 'aa-note' });
  f.append(el('h3', { textContent: 'Animation' }),
    el('div', { className: 'aa-rang' }, boutonJouer, boutonBoucle, el('label', {}, 'Vitesse ', vit), el('label', {}, 'Durée (s) ', champDuree), el('label', {}, 'Nom ', champNom)),
    piste,
    el('div', { className: 'aa-rang' },
      el('button', { textContent: '+ Image ici', title: 'Ajoute une image clé à l\'instant du curseur, avec la pose affichée', onclick: ajouter }),
      el('button', { textContent: 'Supprimer l\'image', onclick: () => { if (S.sel < 0 || S.anim.images.length < 2) return; S.anim.images.splice(S.sel, 1); S.sel = Math.min(S.sel, S.anim.images.length - 1); chargerImage(S.sel); } }),
      el('label', {}, 'Instant ', champT), el('label', {}, 'Courbe vers la suivante ', choixCourbe),
      el('button', { textContent: 'Marche du jeu', title: 'La marche en quatre images clés', onclick: () => { S.anim = marcheEnImages(1, 0.8); S.anim.nom = 'marche'; S.sel = -1; S.t = 0; S.mode = 'lecture'; garder(); majBoutons(); } }),
      el('button', { textContent: 'Exporter (JSON)', onclick: exporter }),
      el('button', { textContent: 'Importer…', onclick: () => fichier.click() }), fichier, note));
}
function trier() { const cle = S.sel >= 0 ? S.anim.images[S.sel] : null; S.anim.images.sort((a, b) => a.t - b.t); if (cle) S.sel = S.anim.images.indexOf(cle); S.anim.duree = Math.max(S.anim.duree, S.anim.images[S.anim.images.length - 1].t + 0.05); garder(); majBoutons(); }
function ajouter() {
  const t = Math.min(S.anim.duree, Math.max(0, S.t));
  const pose = { ...poseAffichee() };
  S.anim.images.push({ t, pose, courbe: 'doux' }); S.anim.images.sort((a, b) => a.t - b.t);
  S.sel = S.anim.images.findIndex(i => i.pose === pose); S.pose = { ...pose }; S.mode = 'edit'; S.joue = false; garder(); majBoutons();
}
function chargerImage(i) { S.sel = i; if (i >= 0) { S.pose = { ...S.anim.images[i].pose }; S.t = S.anim.images[i].t; S.mode = 'edit'; S.joue = false; } garder(); majBoutons(); }
function exporter() {
  const blob = new Blob([JSON.stringify({ format: 'cyclopeen-animation', v: 1, anim: S.anim }, null, 1)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `animation-${S.anim.nom.replace(/[^\w-]+/g, '-') || 'sans-nom'}.json` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  avertir('Exportée.');
}
function majBoutons() {
  boutonJouer.textContent = S.joue ? '⏸ Pause' : '▶ Lire';
  boutonBoucle.setAttribute('aria-pressed', S.anim.boucle);
  champDuree.value = S.anim.duree; champNom.value = S.anim.nom;
  piste.replaceChildren(curseurT);
  S.anim.images.forEach((im, i) => {
    const b = el('button', { className: 'aa-cle' + (i === S.sel ? ' is-on' : ''), textContent: String(i + 1), title: `Image ${i + 1} à ${im.t.toFixed(2)} s`, onclick: () => chargerImage(i) });
    b.style.left = `${100 * im.t / S.anim.duree}%`; piste.append(b);
  });
  const im = S.sel >= 0 ? S.anim.images[S.sel] : null;
  champT.disabled = choixCourbe.disabled = !im;
  if (im) { champT.value = im.t.toFixed(2); choixCourbe.value = im.courbe; }
  majCurseurs();
}

// ─── le dessin ───
async function demarrer() {
  monterPanneau(); monterFrise(); majBoutons();
  const canvas = $('aa-canvas'), scene3 = $('aa-scene');
  const THREE = await loadThree();
  const col = l => new THREE.Color(PALETTE[l]);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = col('s');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const niveaux = ['fin', 'moyen'].map(niveau => { const so = creerSoldatArticule(THREE, col, { complet: true, ombrage: 0.5, niveau }); const lo = so.instances(1); scene.add(lo.mesh); return { niveau, so, lo }; });
  const sol = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({ color: col('b') })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.add(sol);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: col('t'), transparent: true, opacity: 0.55 })); ombre.rotation.x = -Math.PI / 2; ombre.scale.y = 0.7; ombre.position.y = 0.002; scene.add(ombre);
  let w = 0, h = 0, dernier = performance.now();
  window.__atelier = { S, niveaux, jeu: null };       // (pour les scripts de test : `jeu` = { vit, tir, tapi, couche } fait dessiner la pose calculée du nuanceur à la place de la pose libre)
  function image(now) {
    requestAnimationFrame(image);
    const dt = Math.min(0.1, (now - dernier) / 1000); dernier = now;
    const r = scene3.getBoundingClientRect(), nw = Math.max(80, Math.round(r.width / FACTEUR)), nh = Math.max(80, Math.round(r.height / FACTEUR));
    if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    if (S.joue) {
      S.t += dt * S.vitesse;
      if (S.anim.boucle) S.t %= S.anim.duree; else if (S.t >= S.anim.duree) { S.t = S.anim.duree; S.joue = false; majBoutons(); }
    }
    if (S.mode === 'lecture') majCurseurs();
    curseurT.style.left = `${100 * Math.min(1, S.t / S.anim.duree)}%`;
    const P = poseAffichee();
    for (const { niveau, so, lo } of niveaux) {
      const J = window.__atelier.jeu;
      poserLibre(so.materiel, J ? null : P);
      lo.ecrire(0, { x: 0, y: 0, z: 0, camp: S.camp, vit: 0, tir: 0, tapi: 0, couche: 0, blessure: 0, cap: 0, temps: 0, aspect: A, ...(J ?? {}) }); lo.envoyer(1);
      lo.mesh.visible = niveau === S.niveau;
    }
    ombre.scale.set(P.couche > 0.5 ? 2 : 1, P.couche > 0.5 ? 0.55 : 0.7, 1);
    if (S.auto) S.yaw += dt * 0.5;
    const cible = new THREE.Vector3(0, P.couche > 0.5 ? 0.2 : 0.88 * A.carrure.taille, 0), d = h / (2 * S.ppm * TAN15);
    camera.position.set(d * Math.sin(S.yaw) * Math.cos(S.tangage), cible.y + d * Math.sin(S.tangage), d * Math.cos(S.yaw) * Math.cos(S.tangage));
    camera.lookAt(cible); camera.near = Math.max(0.02, d * 0.1); camera.far = d + 30; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    $('aa-legende').textContent = `${S.mode === 'edit' ? 'Édition' : 'Lecture'} · t = ${S.t.toFixed(2)} s · ${S.ppm} px/m · glisser : tourner, molette : zoomer`;
  }
  let glisse = null;
  canvas.onpointerdown = e => { glisse = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); S.auto = false; };
  canvas.onpointermove = e => { if (!glisse) return; S.yaw -= (e.clientX - glisse.x) * 0.01; S.tangage = Math.max(-0.2, Math.min(1.45, S.tangage + (e.clientY - glisse.y) * 0.008)); glisse = { x: e.clientX, y: e.clientY }; };
  canvas.onpointerup = canvas.onpointercancel = () => { glisse = null; };
  canvas.onwheel = e => { e.preventDefault(); S.ppm = Math.max(8, Math.min(120, +(S.ppm * (e.deltaY < 0 ? 1.15 : 1 / 1.15)).toFixed(1))); };
  document.addEventListener('keydown', e => { if (e.key === ' ' && !/INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement?.tagName ?? '')) { e.preventDefault(); boutonJouer.click(); } });
  requestAnimationFrame(image);
}
demarrer().catch(e => { $('aa-scene').textContent = `L'atelier n'a pas pu démarrer : ${e.message}`; });
