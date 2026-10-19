// L'onglet « Carte » de l'Atelier. Le terrain d'un secteur vu de dessus, monté par les MÊMES modules que la bataille (`terrainDuSecteur`,
// `couleurCase`) : ce qu'on y voit est ce que le jeu monte au départ. Lot 1 : des curseurs règlent le relief, les arbres, les haies, la pluie
// du secteur ; chaque retouche va dans le brouillon (`secteurs` de `cyclopeen:atelier`, à plat : « relief.bosses ») et se publie dans
// assets/design/secteurs.json. Le jeu les pose sur `SECTEURS` au lancement (`appliquerSecteurs`).
import { REGLAGES } from './data/reglages.js?v=0.36.2';
import { SECTEURS } from './data/secteur.js?v=0.36.2';
import { PALETTE, ORDRE } from './palette.js?v=0.36.2';
import { terrainDuSecteur } from './secteur-terrain.js?v=0.36.2';
import { couleurCase } from './apparence.js?v=0.36.2';
import { etat as etatCase, hauteurQ } from './terrain.js?v=0.36.2';
import { ligneY } from './tranchees.js?v=0.36.2';
import { PARAMS } from './data/secteur-params.js?v=0.36.2';
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
  const nouvelle = el('button', { textContent: 'Autre graine', onclick: () => { graine.value = Math.floor(Math.random() * 99999) + 1; refaire(); } });
  const coche = (texte, defaut) => { const i = el('input', { type: 'checkbox', checked: defaut }); i.onchange = redessiner; return [i, el('label', { className: 'at-coche' }, i, texte)]; };
  const [cCourbes, lCourbes] = coche('Courbes de niveau', true);
  const [cArbres, lArbres] = coche('Arbres et buissons', true);
  const [cLignes, lLignes] = coche('Tranchées et secteurs', true);
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
        ecrireBrouillon(br); aPublier();
        clearTimeout(minuterie); minuterie = setTimeout(refaire, 120);       // le terrain se refait (~0,3 s) : on attend que la main s'arrête
      };
      curseur.oninput = () => poser(curseur.value); nombre.onchange = () => poser(nombre.value);
      const retour = el('button', { textContent: '\u21ba', title: `Revenir à ${pub}`, ariaLabel: `Revenir à la valeur publiée de ${p.nom}`, onclick: () => { poser(pub); } });
      rendre();
      return el('div', { className: 'at-reglage' }, nom, curseur, nombre, el('span', { className: 'at-unite', textContent: p.unite }), retour);
    });
    const tout = el('button', { textContent: 'Tout remettre comme publié', onclick: () => {
      const br = lireBrouillon(); if (br.secteurs) { delete br.secteurs[sel.value]; if (!Object.keys(br.secteurs).length) delete br.secteurs; }
      ecrireBrouillon(br); aPublier(); panneau(); refaire();
    } });
    reglages.replaceChildren(el('h3', { textContent: 'Réglages du secteur' }),
      el('p', { className: 'at-note', textContent: 'En rouge : retouché dans ce navigateur, pas encore publié (onglet Publier). Le jeu de ce navigateur les utilise déjà, à la prochaine bataille. La carte se refait quand la main s\u2019arrête.' }),
      ...rangees, tout);
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
    ctx.restore();
  }
  canvas.onpointermove = e => {
    if (!C) return;
    const r = canvas.getBoundingClientRect(), { T, marges: m } = C;
    const i = Math.floor((e.clientX - r.left) / r.width * T.W), j = Math.floor((e.clientY - r.top) / r.height * T.H);
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) return;
    const c = j * T.W + i, x = i - m.x, y = j - m.y, dedans = x >= 0 && y >= 0 && x < C.S.largeur && y < C.S.hauteur;
    const zone = dedans ? ` · secteur ${'ABCD'[Math.min(3, Math.floor(x / (C.S.largeur / 4)))]}` : ' · marge';
    const tr = T.troncon[c] >= 0 ? ' · tranchée' : T.troncon[c] === -2 ? ' · boyau' : '';
    lecture.textContent = `x ${x}, y ${y} m${zone}${tr} · hauteur ${(hauteurQ(T, c) / 4).toFixed(2)} m · ${NOMS_ETAT[etatCase(T, c, R)]} · herbe ${T.herbe[c]}`;
  };
  sel.onchange = () => { panneau(); refaire(); }; graine.onchange = refaire; zoom.onchange = redessiner;
  window.addEventListener('resize', () => { if (canvas.isConnected) redessiner(); });

  zone.replaceChildren(
    el('h2', { textContent: 'Carte' }),
    el('p', { className: 'at-note', textContent: 'Le terrain d\u2019un secteur vu de dessus, tel que la bataille le monte au départ. Les curseurs règlent le relief, les arbres, les haies et la pluie ; les retouches par formes viendront ensuite.' }),
    el('div', { className: 'at-row' }, sel, el('label', { className: 'at-coche' }, 'Graine ', graine), nouvelle, zoom),
    el('div', { className: 'at-row' }, lCourbes, lArbres, lLignes),
    el('div', { className: 'at-carte-zone' }, el('div', { className: 'at-carte-vue' }, resume, lecture, boite), reglages),
  );
  panneau();
  refaire();
}
