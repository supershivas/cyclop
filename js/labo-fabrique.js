// La fabrique de soldats du labo (Jérôme, 1er nov. : « un atelier de génération de soldats où l'on clique pour générer un soldat différent : à gauche son aspect avec un zoom précis sur lui,
// à droite ses stats, noms, armées »). Un clic tire un numéro d'homme ; son nom, son âge, son grade et ses caractéristiques sont ceux du jeu (`identite.js`, `caracteristiques`) ; son aspect
// est celui de `aspect` (js/aspect-soldat.js), dessiné par le soldat articulé (js/rendu/soldat-articule.js). Le labo montre sans rien modifier : rien n'est écrit dans une bataille.
// Le zoom est celui du jeu, en pixels de l'image par mètre (4 à 32 : les zooms du jeu ; 64 à 420 : plus près que le jeu ne va), l'image étant agrandie ×2 sans lissage comme à l'écran.
import { PALETTE } from './palette.js?v=0.107.0';
import { loadThree } from './three-lib.js?v=0.107.0';
import { hash2 } from './lib/rng.js?v=0.107.0';
import { identite, caracteristiques, departCaracs, CARACTERISTIQUES, caracEnMots, chevrons, experienceEnMots, etatEnMots } from './identite.js?v=0.107.0';
import { NOMS } from './data/noms.js?v=0.107.0';
import { aspect, aspectEnMots } from './aspect-soldat.js?v=0.107.0';
import { COIFFES, CHEVEUX, BARBES, PEAUX, NOMS_COULEURS_CHEVEUX, YEUX, NEZ, BOUCHES, SOURCILS } from './data/aspect-soldat.js?v=0.107.0';
import { creerSoldatArticule, trianglesVisibles } from './rendu/soldat-articule.js?v=0.107.0';
import { ZOOMS } from './rendu3d.js?v=0.107.0';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const GRAINE = 7;                         // la graine d'identité de la fabrique (n'importe laquelle : c'est le numéro qui fait l'homme)
const EFFECTIF = 125;                     // un régiment de la bataille
const FACTEUR = 2;                        // l'image est agrandie ×2, sans lissage (comme le jeu : 640 × 400 sur 1 280 × 800)
const TAN15 = Math.tan(15 * Math.PI / 180);   // le champ de la caméra du jeu : 30°
const POSES = [
  ['repos', 'Au repos', {}], ['marche', 'Marche', { vit: 1.4 }], ['tir', 'Tir', { tir: 1 }], ['tapi', 'Accroupi', { tapi: 1 }],
  ['retenu', 'Feu retenu', { tir: -1 }], ['melee', 'Mêlée', { melee: true }],
  ['bras', 'Blessé au bras', { blessure: 1 }], ['jambe', 'Blessé à la jambe', { blessure: 2 }], ['tete', 'Blessé à la tête', { blessure: 3 }], ['couche', 'Couché', { couche: 1 }],
];
// [clé, nom, hauteur visée (m), zoom conseillé (pixels par mètre)]
const CADRAGES = [['corps', 'Le corps', 0.88, 32], ['visage', 'Le visage', 1.53, 420], ['mains', 'Les mains', 0.85, 260], ['pieds', 'Les pieds', 0.2, 160]];
const GRADES_CHOIX = [['', 'Au hasard'], ...NOMS.nous.grades.map((g, k) => [String(k), g]).filter((_, k) => k !== 7)];

// ses galons, dits en mots (français : barrettes blanches sur les manches ; allemands : épaulettes des officiers, galon au col des sous-officiers)
function galons(H) {
  const r = H.ident.rang;
  if (r > 5) return 'aucun';
  if (H.camp) return r <= 2 ? `épaulettes à ${3 - r} étoile${r < 2 ? 's' : ''}` : `galon de col (${6 - r - 2 + (r === 3 ? 1 : 0)} rang${r > 3 ? '' : 's'})`;
  return r <= 2 ? `${3 - r} barrette${r < 2 ? 's' : ''} blanche${r < 2 ? 's' : ''}, larges, sur chaque manche` : `${6 - r} barrette${r < 5 ? 's' : ''} blanche${r < 5 ? 's' : ''}, minces, sur chaque manche`;
}

// L'homme d'un numéro : tout ce que la fabrique en dit (une seule fonction, que le test pourrait lire)
export function fabriquer(id, camp, rangVoulu = '') {
  const k = rangVoulu === '' ? Math.floor(hash2(id, 999, GRAINE) * EFFECTIF) : { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 10, 6: 40 }[rangVoulu] ?? 40;
  const I = identite(GRAINE, camp, id, k, EFFECTIF);
  const regId = 1 + Math.floor(hash2(id, 998, GRAINE) * 12);
  const carac = departCaracs(GRAINE, camp, id, k, EFFECTIF, regId);
  const a = aspect(id, camp, GRAINE, I.rang, I.age, carac);
  const exp = Math.pow(hash2(id, 997, GRAINE), 2) * 0.9;
  return { id, camp, k, regId, ident: I, carac, aspect: a, exp, peur: hash2(id, 996, GRAINE) * 0.3, fatigue: hash2(id, 995, GRAINE) * 0.35 };
}

export function maquetteFabrique(stage) {
  let fini = false, nettoyer = () => {};
  stage.append(el('p', { textContent: 'Chargement de la fabrique…' }));
  (async () => {
    const THREE = await loadThree();
    if (fini) return;
    stage.replaceChildren();
    nettoyer = monter(stage, THREE);
  })().catch(e => { stage.replaceChildren(el('pre', { textContent: `La fabrique n'a pas pu démarrer : ${e.message}` })); });
  return () => { fini = true; nettoyer(); };
}

function monter(stage, THREE) {
  const col = l => new THREE.Color(PALETTE[l]);
  // ─── l'état ───
  const S = { id: Math.floor(Math.random() * 65536), camp: 0, grade: '', niveau: 'fin', pose: 'repos', cadrage: 'corps', ppm: 32, yaw: 0.45, tangage: 0.28, auto: true, ombrage: true, histo: [], pos: -1 };
  const lire = () => { const q = new URLSearchParams(location.search); if (q.has('soldat')) { const [i, c] = q.get('soldat').split(':'); S.id = (+i || 0) & 0xffff; S.camp = c === '1' ? 1 : 0; } };
  lire();
  let H = fabriquer(S.id, S.camp, S.grade);
  // ─── la page : à gauche l'homme et ses commandes, à droite sa fiche ───
  const grille = el('div'); grille.style.cssText = 'display:grid;grid-template-columns:minmax(300px,1.5fr) minmax(280px,1fr);gap:16px;align-items:start';
  const gauche = el('div'), droite = el('div');
  const boite = el('div'); boite.style.cssText = `position:relative;width:100%;height:min(62vh,520px);background:${PALETTE.s};overflow:hidden;border:1px solid ${PALETTE.g}`;
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;cursor:grab;touch-action:none';
  const legende = el('div'); legende.style.cssText = `position:absolute;left:8px;bottom:8px;padding:2px 8px;background:${PALETTE.o};color:${PALETTE.t};font:12px/1.4 monospace;pointer-events:none`;
  boite.append(canvas, legende);
  const rang = (titre, ...contenu) => { const d = el('div'); d.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0'; if (titre) d.append(el('span', { textContent: titre, style: 'min-width:5.5em;opacity:.75;font-size:12px' })); d.append(...contenu); return d; };
  const bouton = (texte, f, cls = 'essai') => el('button', { className: cls, textContent: texte, onclick: f });
  const choix = (liste, cle, change) => liste.map(([id, nom]) => { const b = bouton(nom, () => { S[cle] = id; majBoutons(); change?.(); }); b.dataset.cle = cle; b.dataset.id = id; return b; });
  const generer = bouton('Générer un soldat', () => nouveau(), 'essai');
  generer.style.cssText = 'font-size:18px;padding:10px 18px;font-weight:bold';
  const precedent = bouton('←', () => aller(-1)), suivant = bouton('→', () => aller(1));
  precedent.title = 'Le soldat d\'avant'; suivant.title = 'Le soldat d\'après';
  const campBtns = choix([[0, 'Armée française'], [1, 'Armée allemande']], 'camp', () => { refaire(); });
  const gradeSel = el('select'); for (const [v, nom] of GRADES_CHOIX) gradeSel.append(el('option', { value: v, textContent: nom }));
  gradeSel.onchange = () => { S.grade = gradeSel.value; refaire(); };
  const poseBtns = choix(POSES.map(([id, nom]) => [id, nom]), 'pose', () => { ecrireHomme(); remplirFiche(); });
  const cadrBtns = choix(CADRAGES.map(([id, nom]) => [id, nom]), 'cadrage', () => { S.ppm = CADRAGES.find(c => c[0] === S.cadrage)[3]; if (S.cadrage === 'visage') { S.yaw = 0.2; S.tangage = 0.06; S.auto = false; auto.checked = false; } majBoutons(); });
  const niveauBtns = choix([['fin', 'Fin (24 px/m et plus)'], ['moyen', 'Intermédiaire (12 à 16 px/m)']], 'niveau', () => { remplirFiche(); });
  const zoomBtns = [4, 8, 16, 32, 64, 128, 200, 420].map(p => { const b = bouton(`${p} px/m`, () => { S.ppm = p; majBoutons(); }); b.dataset.cle = 'ppm'; b.dataset.id = p; return b; });
  const auto = el('input', { type: 'checkbox', checked: true, onchange: () => { S.auto = auto.checked; } });
  const ombr = el('input', { type: 'checkbox', checked: true, onchange: () => { S.ombrage = ombr.checked; } });
  const graineEl = el('input', { type: 'text', size: 12, title: 'Un numéro (0 à 65535), puis « :1 » pour l\'armée allemande. Entrée : charger.' });
  graineEl.onchange = () => { const [i, c] = graineEl.value.split(':'); const id = (+i || 0) & 0xffff; S.camp = c === '1' ? 1 : 0; S.histo = S.histo.slice(0, S.pos + 1); S.histo.push({ id, camp: S.camp }); S.pos = S.histo.length - 1; H = fabriquer(id, S.camp, S.grade); ecrireHomme(); remplirFiche(); majBoutons(); };
  gauche.append(boite,
    rang('', precedent, generer, suivant),
    rang('Détail', ...niveauBtns), rang('Zoom', ...zoomBtns), rang('Cadrage', ...cadrBtns), rang('Pose', ...poseBtns), rang('Armée', ...campBtns, gradeSel),
    rang('', el('label', {}, auto, ' faire tourner'), el('label', {}, ombr, ' relief des faces (hors palette : aplats du jeu si décoché)')),
    rang('Numéro', graineEl, el('span', { textContent: 'ou ?soldat=numéro:camp dans l\'adresse', style: 'font-size:12px;opacity:.7' })));
  grille.append(gauche, droite); stage.append(grille);
  const fiche = el('div'); fiche.style.cssText = `padding:12px 16px;background:${PALETTE.o};color:${PALETTE.t};border:1px solid ${PALETTE.s};font:13px/1.5 monospace`;
  droite.append(fiche);
  function majBoutons() {
    for (const b of stage.querySelectorAll('button[data-cle]')) b.classList.toggle('is-on', String(S[b.dataset.cle]) === b.dataset.id);
    for (const b of stage.querySelectorAll('button[data-cle]')) b.style.outline = String(S[b.dataset.cle]) === b.dataset.id ? `2px solid ${PALETTE.g}` : '';
  }
  // ─── la fiche ───
  function remplirFiche() {
    const { ident: I, aspect: a, carac, exp } = H, c = a.carrure, t = a.traits;
    const ligne = (k, v) => { const d = el('div'); d.style.cssText = 'display:flex;justify-content:space-between;gap:12px;border-bottom:1px dotted #0003'; d.append(el('span', { textContent: k, style: 'opacity:.7' }), el('span', { textContent: v, style: 'text-align:right' })); return d; };
    const titre = txt => { const h = el('div', { textContent: txt }); h.style.cssText = 'margin:12px 0 4px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;font-size:11px'; return h; };
    const barre = (nom, v) => { const d = el('div'); d.style.cssText = 'display:grid;grid-template-columns:5.5em 1fr 7em;gap:8px;align-items:center'; const f = el('div'); f.style.cssText = `height:8px;background:${PALETTE.r}`; const i = el('div'); i.style.cssText = `height:100%;width:${v}%;background:${PALETTE.s}`; f.append(i); d.append(el('span', { textContent: nom }), f, el('span', { textContent: `${v} · ${caracEnMots(v)}`, style: 'text-align:right' })); return d; };
    const nom = el('div'); nom.style.cssText = 'font-size:20px;font-weight:bold;line-height:1.2'; nom.textContent = `${I.prenom} ${I.nom.toUpperCase()}`;
    const ev = chevrons(exp);
    fiche.replaceChildren(nom, el('div', { textContent: `${I.grade}, ${I.age} ans`, style: 'opacity:.8' }),
      titre('Armée'), ligne('Camp', H.camp ? 'Armée allemande (en face)' : 'Armée française (la nôtre)'), ligne('Régiment', `n° ${H.regId}, ${EFFECTIF} hommes`), ligne('Matricule', `${String(H.id).padStart(5, '0')} · rang ${H.k + 1} du régiment`),
      ligne('Expérience', `${'▮'.repeat(ev)}${'▯'.repeat(3 - ev)} ${experienceEnMots(exp) || 'n\'a rien vu du feu'}`),
      titre('Caractéristiques'), ...CARACTERISTIQUES.map(([, nomC], q) => barre(nomC, carac[q])),
      ligne('État', etatEnMots(H.fatigue, H.fatigue * 0.8, H.peur, POSES.find(p => p[0] === S.pose)?.[2].blessure ?? 0).join(', ')),
      titre('Aspect'), ligne('Arme', I.rang <= 2 ? 'pistolet (les officiers n\'ont pas de fusil)' : H.camp ? 'fusil Mauser Gewehr 98, baïonnette' : 'fusil Lebel, baïonnette Rosalie'), ligne('Galons', galons(H)), ligne('Casque', H.camp ? COIFFES[a.coiffe].nomEux : COIFFES[a.coiffe].nom), ligne('Cheveux', a.cheveux === 0 ? 'chauve' : `${CHEVEUX[a.cheveux].nom}, ${NOMS_COULEURS_CHEVEUX[a.couleur]}`), ligne('Barbe', BARBES[a.barbe].nom), ligne('Peau', PEAUX[a.peau].nom),
      ligne('Visage', `yeux ${YEUX[t.yeux]}, nez ${NEZ[t.nez]}, bouche ${BOUCHES[t.bouche]}, sourcils ${SOURCILS[t.sourcils]}${t.rides ? `, ${t.rides > 1 ? 'front et joues ridés' : 'quelques rides'}` : ''}`),
      ligne('Carrure', `taille ${(1.7 * c.taille).toFixed(2)} m · épaules ×${c.epaules.toFixed(2)} · jambes ×${c.jambes.toFixed(2)} · ventre ×${c.ventre.toFixed(2)}`),
      ligne('Équipé de', aspectEnMots(a, H.camp).slice(1).filter(m => !/^(cheveux|crâne)/.test(m) && !BARBES.some(b => b.nom === m)).join(', ') || 'l\'ordinaire'),
      titre('Coût'), ligne('Triangles dessinés', `${trianglesVisibles(a, H.camp, POSES.find(p => p[0] === S.pose)?.[2].blessure ?? 0, { complet: true, niveau: S.niveau })} (modèle entier : ${niveaux.find(n => n.niveau === S.niveau).soldat.modele.triangles})`));
    graineEl.value = `${H.id}:${H.camp}`;
  }
  // ─── le dessin ───
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = col('s');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  // les deux niveaux de détail du jeu (v0.105.1) : le fin (24 px/m et plus) et l'intermédiaire (12 à 16 px/m) ; la fabrique les montre l'un ou l'autre, à quatre faces par boîte comme le jeu (`complet` : le derrière pour tourner autour)
  const niveaux = ['fin', 'moyen'].map(niveau => { const so = creerSoldatArticule(THREE, col, { complet: true, ombrage: 0.5, niveau }); const lo = so.instances(1); scene.add(lo.mesh); return { niveau, soldat: so, lot: lo }; });
  const soldat = niveaux[0].soldat;      // (pour l'horloge et le relief : les deux niveaux partagent leurs réglages ci-dessous)
  const sol = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({ color: col('b') })); sol.rotation.x = -Math.PI / 2; sol.position.y = -0.002; scene.add(sol);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: col('t'), transparent: true, opacity: 0.55 })); ombre.rotation.x = -Math.PI / 2; ombre.scale.y = 0.7; ombre.position.y = 0.002; scene.add(ombre);
  let dernierT = performance.now(), temps = 0, raf = 0, w = 0, h = 0;
  function taille() {
    const r = boite.getBoundingClientRect(); const nw = Math.max(80, Math.round(r.width / FACTEUR)), nh = Math.max(80, Math.round(r.height / FACTEUR));
    if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
  function ecrireHomme() {
    const P = POSES.find(p => p[0] === S.pose)[2];
    for (const { lot } of niveaux) { lot.ecrire(0, { x: 0, y: 0, z: 0, camp: H.camp, vit: P.vit ?? 0, tir: P.melee ? 2 + Math.max(0, Math.sin(temps * 4.6)) ** 2 : (P.tir ?? 0), tapi: P.tapi ?? 0, couche: P.couche ?? 0, blessure: P.blessure ?? 0, cap: 0, temps, aspect: H.aspect }); lot.envoyer(1); }
    ombre.scale.set(P.couche ? 2.0 : 1, P.couche ? 0.55 : 0.7, 1);
  }
  function image(now) {
    raf = requestAnimationFrame(image);
    const dt = Math.min(0.1, (now - dernierT) / 1000); dernierT = now; temps += dt;
    taille();
    ecrireHomme();       // (l'horloge de la marche entre dans les tampons de l'homme)
    if (S.auto) S.yaw += dt * 0.5;
    for (const { niveau, soldat: so, lot } of niveaux) { so.materiel.uniforms.uShade.value = S.ombrage ? 0.5 : 0; lot.mesh.visible = niveau === S.niveau; }
    // la caméra du jeu : un champ de 30°, placée pour que 1 m = ppm pixels de l'image
    const cible = new THREE.Vector3(0, CADRAGES.find(c => c[0] === S.cadrage)[2] * H.aspect.carrure.taille, 0);
    if (S.pose === 'couche') cible.y = 0.2;
    const d = h / (2 * S.ppm * TAN15);
    camera.position.set(cible.x + d * Math.sin(S.yaw) * Math.cos(S.tangage), cible.y + d * Math.sin(S.tangage), cible.z + d * Math.cos(S.yaw) * Math.cos(S.tangage));
    camera.lookAt(cible);
    camera.near = Math.max(0.02, d * 0.1); camera.far = d + 30; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const zj = ZOOMS.indexOf(S.ppm);
    legende.textContent = `${S.ppm} px/m${zj >= 0 ? ` — le zoom ${zj + 1} du jeu` : S.ppm > 16 ? ' — plus près que le jeu' : ''} · image ${w}×${h} ×${FACTEUR} · glisser : tourner, molette : zoomer`;
  }
  // ─── les actions ───
  function refaire() { H = fabriquer(H.id, S.camp, S.grade); ecrireHomme(); remplirFiche(); majBoutons(); }
  function nouveau() {
    S.histo = S.histo.slice(0, S.pos + 1);
    const id = Math.floor(Math.random() * 65536);
    S.histo.push({ id, camp: S.camp }); S.pos = S.histo.length - 1;
    H = fabriquer(id, S.camp, S.grade); ecrireHomme(); remplirFiche(); majBoutons();
  }
  function aller(sens) {
    const p = S.pos + sens; if (p < 0 || p >= S.histo.length) return;
    S.pos = p; const e = S.histo[p]; S.camp = e.camp; H = fabriquer(e.id, e.camp, S.grade); ecrireHomme(); remplirFiche(); majBoutons();
  }
  // glisser pour tourner, molette pour zoomer (le zoom suit les paliers continus : ×1,2 par cran)
  let glisse = null;
  canvas.onpointerdown = e => { glisse = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; S.auto = false; auto.checked = false; };
  canvas.onpointermove = e => { if (!glisse) return; S.yaw -= (e.clientX - glisse.x) * 0.01; S.tangage = Math.max(-0.2, Math.min(1.45, S.tangage + (e.clientY - glisse.y) * 0.008)); glisse = { x: e.clientX, y: e.clientY }; };
  canvas.onpointerup = canvas.onpointercancel = () => { glisse = null; canvas.style.cursor = 'grab'; };
  canvas.onwheel = e => { e.preventDefault(); S.ppm = Math.max(3, Math.min(900, +(S.ppm * (e.deltaY < 0 ? 1.2 : 1 / 1.2)).toFixed(1))); majBoutons(); };
  // le clavier : espace ou Entrée génère
  const touche = e => { if ((e.key === ' ' || e.key === 'Enter') && !/INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement?.tagName ?? '')) { e.preventDefault(); nouveau(); } };
  document.addEventListener('keydown', touche);
  S.histo.push({ id: H.id, camp: S.camp }); S.pos = 0;
  ecrireHomme(); remplirFiche(); majBoutons(); raf = requestAnimationFrame(image);
  return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', touche); renderer.dispose(); for (const { lot, soldat: so } of niveaux) { lot.geometrie.dispose(); so.materiel.dispose(); } };
}
