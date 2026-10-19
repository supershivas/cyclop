// L'onglet « Carte » de l'Atelier. Le terrain d'un secteur vu de dessus, monté par les MÊMES modules que la bataille (`terrainDuSecteur`,
// `couleurCase`) : ce qu'on y voit est ce que le jeu monte au départ. Lot 1 : des curseurs règlent le relief, les arbres, les haies, la pluie
// du secteur, et des outils posent des formes de relief (`formes.js` ; lot 2 : annuler, rétablir) ; chaque retouche va dans le brouillon (`secteurs` de `cyclopeen:atelier`, à plat : « relief.bosses ») et se publie dans
// assets/design/secteurs.json. Le jeu les pose sur `SECTEURS` au lancement (`appliquerSecteurs`).
import { REGLAGES } from './data/reglages.js?v=0.36.2';
import { SECTEURS } from './data/secteur.js?v=0.36.2';
import { PALETTE, ORDRE } from './palette.js?v=0.36.2';
import { terrainDuSecteur } from './secteur-terrain.js?v=0.36.2';
import { couleurCase } from './apparence.js?v=0.36.2';
import { etat as etatCase, hauteurQ } from './terrain.js?v=0.36.2';
import { ligneY } from './tranchees.js?v=0.36.2';
import { PARAMS } from './data/secteur-params.js?v=0.36.2';
import { distanceForme, extremite } from './formes.js?v=0.36.2';
import { validerSecteur } from './tranchees.js?v=0.36.2';
import { lireBrouillon, ecrireBrouillon, lireChemin, deplier, secteurEffectif } from './design-store.js?v=0.36.2';

const NOMS_ETAT = ['sec', 'humide', 'boue', 'eau', 'glace'];
const rgb = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
const COULEURS = ORDRE.map(k => rgb(PALETTE[k]));

// → { S, T, lignes, marges } : le terrain de départ d'un secteur (déjà retouché), avec les réglages `R` du jeu
export function monterCarte(R, S, graine) {
  const { terrain, lignes } = terrainDuSecteur(S, { ...S.marges }, graine, R);
  return { S, T: terrain, lignes, marges: S.marges };
}

// Le sol, une couleur par case (les courbes de niveau au mètre éclaircissent la case)
function peindreSol(T, R, courbes) {
  const { W, H } = T, img = new ImageData(W, H), d = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const c = j * W + i, p = c * 4;
    let [r, g, b] = COULEURS[couleurCase(T, i, j, R)];
    if (courbes) {
      const m = hauteurQ(T, c) >> 2;
      if ((i + 1 < W && (hauteurQ(T, c + 1) >> 2) !== m) || (j + 1 < H && (hauteurQ(T, c + W) >> 2) !== m)) {
        const o = COULEURS[ORDRE.indexOf('o')];
        r = (r + o[0]) >> 1; g = (g + o[1]) >> 1; b = (b + o[2]) >> 1;
      }
    }
    d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
  }
  return img;
}

export function ongletCarte(zone, { el, R = REGLAGES, publie = {}, aPublier = () => {} } = {}) {
  const sel = el('select', { ariaLabel: 'Secteur' }, ...Object.entries(SECTEURS).map(([id, s]) => el('option', { value: id, textContent: s.nom })));
  const graine = el('input', { type: 'number', value: 1, step: 1, ariaLabel: 'Graine' });
  // lance une bataille d'essai dans un autre onglet : le jeu lit déjà les retouches de ce navigateur (le brouillon), rien n'est publié ni sauvegardé
  const essayer = el('button', { textContent: 'Essayer dans le jeu', className: 'primaire', onclick: () => {
    const url = new URL('./', location.href); url.searchParams.set('essai', sel.value); url.searchParams.set('graine', String(Number(graine.value) | 0));
    window.open(url, '_blank');
  } });
  const nouvelle = el('button', { textContent: 'Autre graine', onclick: () => { graine.value = Math.floor(Math.random() * 99999) + 1; refaire(); } });
  const coche = (texte, defaut) => { const i = el('input', { type: 'checkbox', checked: defaut }); i.onchange = redessiner; return [i, el('label', { className: 'at-coche' }, i, texte)]; };
  const [cCourbes, lCourbes] = coche('Courbes de niveau', true);
  const [cArbres, lArbres] = coche('Arbres et buissons', true);
  const [cLignes, lLignes] = coche('Tranchées et secteurs', true);
  const [cFormes, lFormes] = coche('Retouches', true);
  const zoom = el('select', { ariaLabel: 'Zoom' }, ...[['0', 'Ajusté'], ['1', '× 1'], ['2', '× 2'], ['3', '× 3']].map(([v, t]) => el('option', { value: v, textContent: t })));
  const canvas = el('canvas', { className: 'at-carte' });
  const lecture = el('p', { className: 'at-note at-lecture', textContent: 'Survolez la carte pour lire une case.' });
  const resume = el('p', { className: 'at-note' });
  const boite = el('div', { className: 'at-carte-boite' }, canvas);
  const reglages = el('div', { className: 'at-reglages' });
  let C = null, sol = null, minuterie = 0;

  // le secteur tel que le jeu le lira : sa donnée, les retouches publiées, celles de ce navigateur (le brouillon)
  const effectif = () => secteurEffectif(SECTEURS[sel.value], publie[sel.value], deplier(lireBrouillon().secteurs?.[sel.value]));
  const valeurPubliee = (cle, param) => lireChemin(secteurEffectif(SECTEURS[sel.value], publie[sel.value]), cle) ?? param.defaut;

  // écrit une valeur dans le brouillon, ou l'en retire si elle est celle du publié
  function noter(cle, v, pub) {
    const br = lireBrouillon(); br.secteurs = br.secteurs || {}; const g = br.secteurs[sel.value] = br.secteurs[sel.value] || {};
    if (JSON.stringify(v) === JSON.stringify(pub)) delete g[cle]; else g[cle] = v;
    if (!Object.keys(g).length) delete br.secteurs[sel.value];
    if (!Object.keys(br.secteurs).length) delete br.secteurs;
    ecrireBrouillon(br); aPublier();
  }
  const plusTard = () => { clearTimeout(minuterie); minuterie = setTimeout(refaire, 120); };       // le terrain se refait (~0,3 s) : on attend que la main s'arrête

  // ─── Les retouches de relief : des formes, un historique pour annuler et rétablir (en mémoire : il ne survit pas à la page) ───
  const NOMS_OUTILS = { regler: 'Lire', bosse: 'Bosse', creux: 'Creux', crete: 'Crête', plateau: 'Plateau', arbre: 'Arbre', buisson: 'Buisson', bois: 'Bois', haie: 'Haie', degager: 'Dégager', gomme: 'Gomme' };
  const RELIEF = ['bosse', 'creux', 'crete', 'plateau'];             // des formes de relief (`retouches`) ; les autres outils posent des objets (`objets`), sauf lire et gomme
  let outil = 'regler', rayon = 20, amplitude = 3, niveau = 3, trace = null, curseurCarte = null;
  const histoire = [], futur = [];
  // deux listes, une seule histoire : un annuler défait la dernière pose, relief ou objet
  const listes = () => { const S = effectif(); return { retouches: structuredClone(S.retouches || []), objets: structuredClone(S.objets || []) }; };
  const publiees = () => { const S = secteurEffectif(SECTEURS[sel.value], publie[sel.value]); return { retouches: S.retouches || [], objets: S.objets || [] }; };
  const formes = () => listes().retouches;
  function ecrireListes(l) { const pub = publiees(); for (const cle of ['retouches', 'objets']) noter(cle, l[cle], pub[cle]); panneauFormes(); redessiner(); plusTard(); verifier(); }
  function poserListe(cle, liste) { histoire.push(listes()); futur.length = 0; ecrireListes({ ...listes(), [cle]: liste }); }
  const annuler = () => { if (histoire.length) { futur.push(listes()); ecrireListes(histoire.pop()); } };
  const retablir = () => { if (futur.length) { histoire.push(listes()); ecrireListes(futur.pop()); } };
  const arrondi = v => Math.round(v * 2) / 2;
  const poserForme = F => { const cle = F.f ? 'retouches' : 'objets'; poserListe(cle, [...listes()[cle], F]); };
  function effacerPres(x, y) {
    const l = listes(); let cible = null, best = Infinity;
    for (const cle of ['retouches', 'objets']) l[cle].forEach((F, i) => { const d = distanceForme(F, x, y); if (d < Math.max(F.r || 0, 6) && d < best) { best = d; cible = [cle, i]; } });
    if (cible) { const liste = l[cible[0]]; liste.splice(cible[1], 1); poserListe(cible[0], liste); }
  }
  // le contrôle du secteur tel qu'il serait publié : dit à voix haute, et l'onglet Publier le refait avant d'écrire
  const verdict = el('div', { className: 'at-verdict' });
  function verifier() {
    const pb = validerSecteur(effectif());
    essayer.disabled = pb.length > 0; essayer.title = pb.length ? 'Corrigez d\u2019abord ce que le contrôle signale' : 'Une bataille d\u2019essai dans un autre onglet, sans rien publier ni sauvegarder';
    verdict.replaceChildren(...(pb.length ? [el('p', { className: 'at-modifie', textContent: 'Ce secteur ne peut pas être publié :' }), el('ul', null, ...pb.map(t => el('li', { textContent: t })))] : []));
  }
  const formesEl = el('div', { className: 'at-formes' });
  function panneauFormes() {
    const l = listes(), pub = publiees(), n = l.retouches.length, m = l.objets.length, modif = JSON.stringify(l) !== JSON.stringify(pub);
    const bouton = ([id, nom]) => el('button', { textContent: nom, className: id === outil ? 'is-on' : '', ariaPressed: String(id === outil), onclick: () => { outil = id; trace = null; panneauFormes(); redessiner(); } });
    const rangee = (titre, ids) => el('div', { className: 'at-outils', role: 'group', ariaLabel: titre }, el('span', { className: 'at-outils-titre', textContent: titre }), ...ids.map(id => bouton([id, NOMS_OUTILS[id]])));
    const glisseur = (nom, unite, min, max, pas, v, poser) => {
      const c = el('input', { type: 'range', min, max, step: pas, value: v, ariaLabel: nom }), t = el('span', { textContent: `${nom} ${v} ${unite}` });
      c.oninput = () => { poser(Number(c.value)); t.textContent = `${nom} ${c.value} ${unite}`; redessiner(); };
      return el('label', { className: 'at-glisseur' }, t, c);
    };
    const aRayon = outil !== 'regler' && outil !== 'gomme' && outil !== 'arbre' && outil !== 'buisson' && outil !== 'haie';
    const lignes = [];
    if (aRayon || outil === 'crete' || outil === 'haie') lignes.push(glisseur(outil === 'haie' ? 'Épaisseur du pinceau' : 'Rayon', 'm', 3, 80, 1, rayon, v => { rayon = v; }));
    if (outil === 'plateau') lignes.push(glisseur('Niveau', 'm', 0, 15, 0.5, niveau, v => { niveau = v; }));
    else if (RELIEF.includes(outil)) lignes.push(glisseur('Hauteur', 'm', 0.5, 12, 0.5, amplitude, v => { amplitude = v; }));
    if (outil === 'haie') lignes.shift();
    const aide = { regler: 'Choisissez un outil, puis cliquez sur la carte.', bosse: 'Un clic pose une bosse.', creux: 'Un clic creuse.', crete: 'Glissez d\u2019un point à l\u2019autre : une crête le long du trait.', plateau: 'Un clic aplanit à ce niveau (la hauteur lue au survol).',
      arbre: 'Un clic plante un arbre.', buisson: 'Un clic plante un buisson.', bois: 'Un clic plante une tache d\u2019arbres serrés, jusqu\u2019au rayon.', haie: 'Glissez d\u2019un point à l\u2019autre : une haie, avec des trous.',
      degager: 'Un clic retire les arbres et les buissons de la graine jusqu\u2019au rayon (pas ce que vous avez posé : la gomme).', gomme: 'Un clic retire la retouche ou l\u2019objet le plus proche. Pour déplacer : gommer, puis reposer.' }[outil];
    formesEl.replaceChildren(el('h3', { textContent: 'Retouches de la carte' }),
      rangee('Relief', ['bosse', 'creux', 'crete', 'plateau']), rangee('Objets', ['arbre', 'buisson', 'bois', 'haie', 'degager']), rangee('Autre', ['regler', 'gomme']),
      el('p', { className: 'at-note', textContent: aide }), ...lignes,
      el('div', { className: 'at-row' },
        el('button', { textContent: 'Annuler', disabled: !histoire.length, onclick: annuler }),
        el('button', { textContent: 'Rétablir', disabled: !futur.length, onclick: retablir }),
        el('button', { textContent: 'Tout effacer', disabled: !n && !m, onclick: () => { histoire.push(l); futur.length = 0; ecrireListes({ retouches: [], objets: [] }); } })),
      el('p', { className: 'at-note' }, el('span', { textContent: `${n} forme${n > 1 ? 's' : ''} de relief, ${m} objet${m > 1 ? 's' : ''}`, className: modif ? 'at-modifie' : '' }), modif ? ' (pas encore publiés)' : ''), verdict);
  }
  // un clic ou un glissé sur la carte, avec l'outil choisi
  const enMetres = e => { const r = canvas.getBoundingClientRect(); return [arrondi((e.clientX - r.left) / r.width * C.T.W - C.marges.x), arrondi((e.clientY - r.top) / r.height * C.T.H - C.marges.y)]; };
  canvas.onpointerdown = e => {
    if (!C || e.button !== 0 || outil === 'regler') return;
    const [x, y] = enMetres(e);
    if (outil === 'gomme') return effacerPres(x, y);
    if (outil === 'crete' || outil === 'haie') { trace = { x, y, x2: x, y2: y }; canvas.setPointerCapture(e.pointerId); return; }
    if (RELIEF.includes(outil)) return poserForme(outil === 'plateau' ? { f: 'plateau', x, y, r: rayon, h: niveau } : { f: outil, x, y, r: rayon, h: amplitude });
    poserForme(outil === 'arbre' || outil === 'buisson' ? { o: outil, x, y } : { o: outil, x, y, r: rayon });
  };
  canvas.onpointerup = e => {
    if (!trace) return;
    const T = trace; trace = null;
    if (Math.hypot(T.x2 - T.x, T.y2 - T.y) < 4) return redessiner();
    poserForme(outil === 'haie' ? { o: 'haie', x: T.x, y: T.y, x2: T.x2, y2: T.y2 } : { f: 'crete', x: T.x, y: T.y, x2: T.x2, y2: T.y2, r: rayon, h: amplitude });
  };

  function panneau() {
    const base = effectif(), b = lireBrouillon().secteurs?.[sel.value] || {};
    const rangees = PARAMS.filter(p => !p.si || lireChemin(SECTEURS[sel.value], p.si)).map(p => {
      const v0 = lireChemin(base, p.cle) ?? p.defaut, pub = valeurPubliee(p.cle, p);
      const curseur = el('input', { type: 'range', min: p.min, max: p.max, step: p.pas, value: v0, ariaLabel: p.nom });
      const nombre = el('input', { type: 'number', min: p.min, max: p.max, step: p.pas, value: v0, ariaLabel: `${p.nom} (valeur)` });
      const nom = el('span', { textContent: p.nom, className: p.cle in b ? 'at-modifie' : '' });
      const rendre = () => { nom.className = Number(curseur.value) !== pub ? 'at-modifie' : ''; };
      const poser = v => {
        v = Math.min(p.max, Math.max(p.min, Number(v)));
        if (!Number.isFinite(v)) return;
        curseur.value = nombre.value = v; rendre();
        const br = lireBrouillon(); br.secteurs = br.secteurs || {}; const g = br.secteurs[sel.value] = br.secteurs[sel.value] || {};
        if (v === pub) delete g[p.cle]; else g[p.cle] = v;
        if (!Object.keys(g).length) delete br.secteurs[sel.value];
        if (!Object.keys(br.secteurs).length) delete br.secteurs;
        ecrireBrouillon(br); aPublier(); verifier();
        plusTard();
      };
      curseur.oninput = () => poser(curseur.value); nombre.onchange = () => poser(nombre.value);
      const retour = el('button', { textContent: '\u21ba', title: `Revenir à ${pub}`, ariaLabel: `Revenir à la valeur publiée de ${p.nom}`, onclick: () => { poser(pub); } });
      rendre();
      const ligne = el('div', { className: 'at-reglage' }, nom, curseur, nombre, el('span', { className: 'at-unite', textContent: p.unite }), retour);
      ligne.dataset.groupe = p.groupe || '';
      return ligne;
    });
    const tout = el('button', { textContent: 'Tout remettre comme publié', onclick: () => {
      const br = lireBrouillon(); if (br.secteurs) { delete br.secteurs[sel.value]; if (!Object.keys(br.secteurs).length) delete br.secteurs; }
      ecrireBrouillon(br); aPublier(); histoire.length = futur.length = 0; panneau(); panneauFormes(); verifier(); refaire();
    } });
    reglages.replaceChildren(el('h3', { textContent: 'Réglages du secteur' }),
      el('p', { className: 'at-note', textContent: 'En rouge : retouché dans ce navigateur, pas encore publié (onglet Publier). Le jeu de ce navigateur les utilise déjà, à la prochaine bataille. La carte se refait quand la main s\u2019arrête.' }),
      ...rangees.flatMap((r, k) => r.dataset.groupe && r.dataset.groupe !== rangees[k - 1]?.dataset.groupe ? [el('h4', { textContent: r.dataset.groupe }), r] : [r]), tout);
  }

  function refaire() {
    C = monterCarte(R, effectif(), Number(graine.value) | 0);
    sol = null;
    resume.textContent = `${C.S.nom} : ${C.S.resume} Terrain ${C.T.W} × ${C.T.H} m, secteur ${C.S.largeur} × ${C.S.hauteur} m au milieu (marges ${C.marges.x} et ${C.marges.y} m). Le sol est celui du départ de la bataille : sec, tranchées creusées, aucun obus.`;
    redessiner();
  }
  function echelle() {
    const z = Number(zoom.value);
    return z || Math.max(1, Math.min(3, Math.floor((boite.clientWidth || 840) / C.T.W)));
  }
  function redessiner() {
    if (!C) return;
    const { T, S, lignes, marges: m } = C, k = echelle();
    if (!sol) { sol = document.createElement('canvas'); sol.width = T.W; sol.height = T.H; }
    const lastCourbes = sol.dataset.courbes === String(cCourbes.checked);
    if (!lastCourbes || !sol.dataset.fait) {
      sol.getContext('2d').putImageData(peindreSol(T, R, cCourbes.checked), 0, 0);
      sol.dataset.courbes = String(cCourbes.checked); sol.dataset.fait = '1';
    }
    canvas.width = T.W * k; canvas.height = T.H * k;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sol, 0, 0, T.W * k, T.H * k);
    ctx.save(); ctx.scale(k, k);
    if (cArbres.checked) {
      ctx.fillStyle = PALETTE.w;
      for (const b of T.buissons) ctx.fillRect(b.i - 0.5, b.j - 0.5, 1.6, 1.6);
      for (const a of T.arbres) { ctx.fillStyle = PALETTE.t; ctx.fillRect(a.i - 2, a.j - 2, 4, 4); ctx.fillStyle = PALETTE.v; ctx.fillRect(a.i - 1.5, a.j - 1.5, 3, 3); }
    }
    if (cLignes.checked) {
      ctx.lineWidth = 1 / k + 0.4; ctx.font = `${Math.round(9 / k * 1.4 + 3)}px ui-monospace, monospace`;
      // le secteur, découpé en quatre colonnes A à D
      ctx.strokeStyle = PALETTE.o; ctx.setLineDash([6, 4]);
      ctx.strokeRect(m.x, m.y, S.largeur, S.hauteur);
      const largeurZone = S.largeur / 4;
      for (let z = 1; z < 4; z++) { ctx.beginPath(); ctx.moveTo(m.x + z * largeurZone, m.y); ctx.lineTo(m.x + z * largeurZone, m.y + S.hauteur); ctx.stroke(); }
      ctx.setLineDash([]); ctx.fillStyle = PALETTE.o;
      'ABCD'.split('').forEach((l, z) => ctx.fillText(l, m.x + z * largeurZone + largeurZone / 2 - 3, m.y - 6));
      // les lignes : 1 est la plus avancée de chaque camp ; bleu = nous, kaki = en face
      for (const L of lignes) {
        ctx.strokeStyle = L.camp === 0 ? PALETTE.n : PALETTE.x; ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        for (let x = 0; x <= T.W; x += 2) { const y = ligneY(L, x + 0.5); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.fillText(String(L.rang + 1), m.x + S.largeur + 4, L.y0 + 3);
      }
    }
    if (cFormes.checked || outil !== 'regler') {
      // les retouches et les objets : un anneau (le rayon) et un signe au centre, un trait pour une crête ou une haie ; l'anneau du pinceau et le trait en cours
      const ox = m.x, oy = m.y, glyphe = { bosse: '+', creux: '\u2212', crete: '+', plateau: '=', bois: 'B', haie: 'H', degager: '\u00d7' };
      ctx.fillStyle = ctx.strokeStyle = PALETTE.o; ctx.lineWidth = 1 / k + 0.5; ctx.textAlign = 'center';
      const dessiner = (F, enCours) => {
        const [x2, y2] = extremite(F), genre = F.f || F.o, segment = genre === 'crete' || genre === 'haie', r = F.r ?? 2.5;
        ctx.setLineDash(genre === 'creux' || genre === 'degager' ? [3, 3] : enCours || genre === 'bois' ? [2, 2] : []);
        if (segment) { ctx.beginPath(); ctx.moveTo(ox + F.x, oy + F.y); ctx.lineTo(ox + x2, oy + y2); ctx.stroke(); }
        if (genre !== 'haie') for (const [px, py] of genre === 'crete' ? [[F.x, F.y], [x2, y2]] : [[F.x, F.y]]) { ctx.beginPath(); ctx.arc(ox + px, oy + py, r, 0, 6.2832); ctx.stroke(); }
        ctx.setLineDash([]); ctx.fillText(glyphe[genre] || '', ox + (F.x + x2) / 2, oy + (F.y + y2) / 2 + 3);
      };
      if (cFormes.checked) { const S = effectif(); for (const F of [...(S.retouches || []), ...(S.objets || [])]) dessiner(F, false); }
      if (trace) dessiner(outil === 'haie' ? { o: 'haie', ...trace } : { f: 'crete', ...trace, r: rayon }, true);
      else if (curseurCarte && outil !== 'regler' && outil !== 'gomme' && outil !== 'haie') dessiner({ [RELIEF.includes(outil) ? 'f' : 'o']: outil, x: curseurCarte[0], y: curseurCarte[1], ...(outil === 'arbre' || outil === 'buisson' ? {} : { r: rayon }) }, true);
      ctx.textAlign = 'start'; ctx.setLineDash([]);
    }
    ctx.restore();
  }
  canvas.onpointerleave = () => { curseurCarte = null; if (outil !== 'regler') redessiner(); };
  canvas.onpointermove = e => {
    if (!C) return;
    curseurCarte = enMetres(e);
    if (trace) { trace.x2 = curseurCarte[0]; trace.y2 = curseurCarte[1]; }
    if (outil !== 'regler') redessiner();
    const r = canvas.getBoundingClientRect(), { T, marges: m } = C;
    const i = Math.floor((e.clientX - r.left) / r.width * T.W), j = Math.floor((e.clientY - r.top) / r.height * T.H);
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) return;
    const c = j * T.W + i, x = i - m.x, y = j - m.y, dedans = x >= 0 && y >= 0 && x < C.S.largeur && y < C.S.hauteur;
    const zone = dedans ? ` · secteur ${'ABCD'[Math.min(3, Math.floor(x / (C.S.largeur / 4)))]}` : ' · marge';
    const tr = T.troncon[c] >= 0 ? ' · tranchée' : T.troncon[c] === -2 ? ' · boyau' : '';
    lecture.textContent = `x ${x}, y ${y} m${zone}${tr} · hauteur ${(hauteurQ(T, c) / 4).toFixed(2)} m · ${NOMS_ETAT[etatCase(T, c, R)]} · herbe ${T.herbe[c]}`;
  };
  sel.onchange = () => { histoire.length = futur.length = 0; trace = null; panneau(); panneauFormes(); verifier(); refaire(); }; graine.onchange = refaire; zoom.onchange = redessiner;
  window.addEventListener('resize', () => { if (canvas.isConnected) redessiner(); });

  zone.replaceChildren(
    el('h2', { textContent: 'Carte' }),
    el('p', { className: 'at-note', textContent: 'Le terrain d\u2019un secteur vu de dessus, tel que la bataille le monte au départ. Les outils posent des formes de relief (bosse, creux, crête, plateau) ; les curseurs règlent le relief d\u2019ensemble, les arbres, les haies et la pluie.' }),
    el('div', { className: 'at-row' }, sel, el('label', { className: 'at-coche' }, 'Graine ', graine), nouvelle, zoom, essayer),
    el('div', { className: 'at-row' }, lCourbes, lArbres, lLignes, lFormes),
    el('div', { className: 'at-carte-zone' }, el('div', { className: 'at-carte-vue' }, resume, lecture, boite), el('div', null, formesEl, reglages)),
  );
  panneau();
  panneauFormes();
  verifier();
  refaire();
}
