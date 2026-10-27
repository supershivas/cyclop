// L'onglet « Carte » de l'Atelier : un éditeur visuel. Le terrain d'un secteur vu de dessus, monté par les MÊMES modules que la bataille (`terrainDuSecteur`,
// `couleurCase`) : ce qu'on y voit est ce que le jeu monte au départ. Trois colonnes : la boîte à outils (poser du relief, de la végétation, sélectionner et déplacer, gommer),
// la scène (la carte, large), l'inspecteur (l'outil ou la forme choisie, puis les réglages du secteur). Chaque chiffre porte un nom et une description (`data/carte-outils.js`,
// `data/secteur-params.js`). Chaque retouche va dans le brouillon (`secteurs` de `cyclopeen:atelier`, à plat : « relief.bosses ») et se publie dans assets/design/secteurs.json ;
// le jeu les pose sur `SECTEURS` au lancement (`appliquerSecteurs`).
import { REGLAGES } from './data/reglages.js?v=0.96.0';
import { SECTEURS, VIERGE } from './data/secteur.js?v=0.96.0';
import { PALETTE, ORDRE } from './palette.js?v=0.96.0';
import { terrainDuSecteur, profilDe } from './secteur-terrain.js?v=0.96.0';
import { couleurCase } from './apparence.js?v=0.96.0';
import { etat as etatCase, hauteurQ } from './terrain.js?v=0.96.0';
import { ligneY } from './tranchees.js?v=0.96.0';
import { PARAMS } from './data/secteur-params.js?v=0.96.0';
import { SAISONS, SAISON_DEFAUT } from './data/meteo.js?v=0.96.0';
import { SECTEURS_ORIGINE } from './data/campagne.js?v=0.96.0';
import { OUTILS, GROUPES_OUTILS, champ, HERBE, SOLS } from './data/carte-outils.js?v=0.96.0';
import { distanceForme, extremite } from './formes.js?v=0.96.0';
import { validerSecteur } from './tranchees.js?v=0.96.0';
import { lireBrouillon, ecrireBrouillon, lireChemin, deplier, secteurEffectif, idCarte, nouvelleCarte } from './design-store.js?v=0.96.0';

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

export function ongletCarte(zone, { el, R = REGLAGES, publie = {}, publieCartes = {}, publieCampagne = {}, aPublier = () => {} } = {}) {
  // ─── Les cartes : celles d'origine, celles à vous déjà publiées (cartes.json), celles de ce navigateur pas encore publiées (le brouillon) ───
  const construireCatalogue = () => {
    const b = lireBrouillon(), out = { ...SECTEURS, ...structuredClone(publieCartes), ...structuredClone(b.cartes || {}) };
    for (const id of b.supprimees || []) delete out[id];
    return out;
  };
  let catalogue = construireCatalogue();
  const estPerso = id => !(id in SECTEURS);
  // ─── Les pièces de l'écran ───
  const sel = el('select', { ariaLabel: 'Secteur' });
  // le nom d'une carte : celui du brouillon, sinon le publié, sinon celui de sa donnée
  const nomDe = id => lireBrouillon().secteurs?.[id]?.nom ?? publie[id]?.nom ?? catalogue[id].nom;
  const remplirSelecteur = () => { const v = sel.value; sel.replaceChildren(...Object.keys(catalogue).map(id => el('option', { value: id, textContent: nomDe(id) + (estPerso(id) ? ' · à vous' : '') }))); if (catalogue[v]) sel.value = v; };
  remplirSelecteur();
  const graine = el('input', { type: 'number', value: 1, step: 1, ariaLabel: 'Graine du hasard', title: 'La graine tire les bosses, les arbres et la boue de la carte : la même graine redonne la même carte. Elle ne change pas ce que vous posez.' });
  const nouvelle = el('button', { textContent: 'Autre graine', title: 'Tire une autre graine : le sol de départ change, vos retouches restent.', onclick: () => { graine.value = Math.floor(Math.random() * 99999) + 1; refaire(); } });
  // lance une bataille d'essai dans un autre onglet : le jeu lit déjà les retouches de ce navigateur (le brouillon), rien n'est publié ni sauvegardé
  const essayer = el('button', { textContent: 'Essayer dans le jeu', className: 'primaire', onclick: () => {
    const url = new URL('./', location.href); url.searchParams.set('essai', sel.value); url.searchParams.set('graine', String(Number(graine.value) | 0));
    window.open(url, '_blank');
  } });
  const coche = (texte, titre, defaut) => { const i = el('input', { type: 'checkbox', checked: defaut }); i.onchange = redessiner; return [i, el('label', { className: 'at-coche', title: titre }, i, texte)]; };
  const [cCourbes, lCourbes] = coche('Courbes de niveau', 'Une ligne claire à chaque mètre de hauteur : elles se resserrent là où le sol monte vite.', true);
  const [cArbres, lArbres] = coche('Arbres', 'Les arbres et les buissons du terrain.', true);
  const [cLignes, lLignes] = coche('Tranchées', 'Les lignes de tranchées (bleu : nous, kaki : en face, 1 la plus avancée) et les secteurs A à D.', true);
  const [cFormes, lFormes] = coche('Retouches', 'Les formes et les objets que vous avez posés.', true);
  const [cReperes, lReperes] = coche('Repères', 'Une grille tous les 50 m, avec les distances depuis l’ouest et le haut du secteur.', false);
  const zoom = el('select', { ariaLabel: 'Zoom', title: 'Taille de la carte à l’écran' }, ...[['0', 'Ajusté à l’écran'], ['1', 'Zoom × 1'], ['2', 'Zoom × 2'], ['3', 'Zoom × 3'], ['4', 'Zoom × 4']].map(([v, t]) => el('option', { value: v, textContent: t })));
  // Plan (2D, où l'on construit) ou 3D (le moteur du jeu, en lecture seule)
  const vuePlan = el('button', { textContent: 'Plan', className: 'is-on', title: 'Le terrain vu de dessus : c\u2019est là qu\u2019on construit.', onclick: () => basculer('plan') });
  const vue3d = el('button', { textContent: '3D', title: 'Le terrain tel que le jeu le montre : sol en cubes, tranchées, arbres, soldats. On y construit aussi : un clic pose avec l\u2019outil choisi, glisser tourne la vue.', onclick: () => basculer('3d') });
  const [cSoldats, lSoldats] = coche('Soldats (3D)', 'Montre les régiments à leur place de départ, pour juger de l\u2019échelle.', true);
  cSoldats.onchange = () => { perimee3D = true; if (mode === '3d') majVue3D(); };
  // la lumière de la vue 3D : l'heure et le temps qu'il fait (le jeu change de lumière toute la journée, et de temps d'un jour à l'autre)
  const AMBIANCES = { 'plein-jour': ['Plein jour', 12, 'sec'], soir: ['Soir', 17.5, 'sec'], aube: ['Aube', 6.5, 'sec'], pluie: ['Pluie', 12, 'pluie'], brouillard: ['Brouillard', 10, 'brouillard'], gel: ['Gel', 9, 'gel'], neige: ['Neige', 11, 'neige'], canicule: ['Forte chaleur', 13, 'canicule'] };
  const ambiance = el('select', { ariaLabel: 'Lumière de la vue 3D', title: 'La lumière et le temps de la vue 3D : l\u2019heure change les ombres, la pluie ou le brouillard changent l\u2019air. Cela ne change pas la carte.' },
    ...Object.entries(AMBIANCES).map(([id, [nom]]) => el('option', { value: id, textContent: nom })));
  ambiance.onchange = () => { const [, h, m] = AMBIANCES[ambiance.value]; v3d?.regler(h, m); };
  const canvas = el('canvas', { className: 'at-carte' });
  const hote3d = el('div', { className: 'ed-3d', hidden: true });
  const scene = el('div', { className: 'ed-scene' }, canvas);
  let mode = 'plan', v3d = null, perimee2D = true, perimee3D = true;
  const etatBarre = el('div', { className: 'ed-etat', textContent: 'Survolez la carte pour lire le sol sous la souris.' });
  const boite = el('div', { className: 'ed-boite' });
  const insp = el('div', { className: 'ed-insp' });
  let C = null, sol = null, minuterie = 0;

  // le secteur tel que le jeu le lira : sa donnée, les retouches publiées, celles de ce navigateur (le brouillon)
  const effectif = () => estPerso(sel.value) ? secteurEffectif(catalogue[sel.value], publie[sel.value], deplier(lireBrouillon().secteurs?.[sel.value])) : catalogue[sel.value];        // (une carte d'origine ne se retouche pas)
  const valeurPubliee = (cle, param) => lireChemin(secteurEffectif(catalogue[sel.value], publie[sel.value]), cle) ?? param.defaut;
  // écrit une valeur dans le brouillon, ou l'en retire si elle est celle du publié
  // Une carte d'origine ne se retouche pas (Jérôme, v0.61.0) : à la première retouche, l'atelier en fait une copie, qui devient une carte à vous (publiée, elle s'ajoute à la liste) ; la retouche s'applique à la copie
  function forker() {
    const nom = `${nomDe(sel.value)} (copie)`, def = nouvelleCarte(catalogue[sel.value], nom), id = idCarte(nom, new Set(Object.keys(catalogue)));
    def.profil = profilDe(terrainDuSecteur(def, { ...def.marges }, 1, R).terrain, def);
    const br = lireBrouillon(); delete br.secteurs?.[sel.value]; if (br.secteurs && !Object.keys(br.secteurs).length) delete br.secteurs;
    br.cartes = { ...(br.cartes || {}), [id]: def }; ecrireBrouillon(br);
    catalogue = construireCatalogue(); remplirSelecteur(); sel.value = id;
    setTimeout(() => sel.onchange?.(), 0);               // l'écran se refait sur la copie, une fois la retouche écrite
  }
  function noter(cle, v, pub) {
    if (!estPerso(sel.value)) { pub = valeurPubliee(cle, { defaut: pub }); forker(); }
    const br = lireBrouillon(); br.secteurs = br.secteurs || {}; const g = br.secteurs[sel.value] = br.secteurs[sel.value] || {};
    if (JSON.stringify(v) === JSON.stringify(pub)) delete g[cle]; else g[cle] = v;
    if (!Object.keys(g).length) delete br.secteurs[sel.value];
    if (!Object.keys(br.secteurs).length) delete br.secteurs;
    ecrireBrouillon(br); aPublier();
  }
  const plusTard = () => { clearTimeout(minuterie); minuterie = setTimeout(refaire, 120); };       // le terrain se refait (~0,3 s) : on attend que la main s'arrête

  // ─── Les retouches : des formes de relief et des objets, une seule histoire pour annuler et rétablir (en mémoire : elle ne survit pas à la page) ───
  let outil = 'selection', trace = null, curseurCarte = null, choix = null, edition = null, glisse = null;
  let trace3d = null, curseur3d = null;                          // dans la vue 3D : le premier clic d'un trait (crête, haie), et le point sous la souris (mètres du secteur)
  const reglagesOutil = { bosse: { r: 20, h: 3 }, creux: { r: 20, h: 3 }, crete: { r: 20, h: 3 }, plateau: { r: 20, h: 3 }, bois: { r: 20 }, degager: { r: 20 }, lac: { r: 25 }, marecage: { r: 30 }, fleuve: { r: 6 }, pont: { r: 3, type: 'planches' } };
  const histoire = [], futur = [];
  const cleDe = F => (F.f ? 'retouches' : 'objets');
  const genreDe = F => F.f || F.o;
  const listes = () => { const S = effectif(); return { retouches: structuredClone(S.retouches || []), objets: structuredClone(S.objets || []) }; };
  const publiees = () => { const S = secteurEffectif(catalogue[sel.value], publie[sel.value]); return { retouches: S.retouches || [], objets: S.objets || [] }; };
  // ce qu'on dessine : les listes, avec la forme en cours de glissé à la place de l'ancienne
  const affichees = () => { const l = listes(); if (edition) l[edition.cle][edition.i] = edition.F; return l; };
  function ecrireListes(l) { const pub = publiees(); for (const cle of ['retouches', 'objets']) noter(cle, l[cle], pub[cle]); tout(); plusTard(); }
  function poserListe(cle, liste) { histoire.push(listes()); futur.length = 0; ecrireListes({ ...listes(), [cle]: liste }); }
  function reajusterChoix() { if (choix && !listes()[choix.cle][choix.i]) choix = null; }
  const annuler = () => { if (histoire.length) { futur.push(listes()); ecrireListes(histoire.pop()); reajusterChoix(); tout(); } };
  const retablir = () => { if (futur.length) { histoire.push(listes()); ecrireListes(futur.pop()); reajusterChoix(); tout(); } };
  const arrondi = v => Math.round(v * 2) / 2;
  const poserForme = F => { const cle = cleDe(F); poserListe(cle, [...listes()[cle], F]); };
  function supprimerChoix() { if (!choix) return; const l = listes()[choix.cle]; l.splice(choix.i, 1); const c = choix.cle; choix = null; poserListe(c, l); }
  function nouvelleForme(def, x, y) {
    const F = { [def.type === 'relief' ? 'f' : 'o']: def.genre, x, y };
    const r = reglagesOutil[def.genre];
    if (def.champs.includes('r')) F.r = r.r;
    if (def.champs.includes('h')) F.h = r.h;
    if (def.champs.includes('type')) F.type = r.type;
    return F;
  }
  // la forme la plus proche d'un point (la gomme, la sélection) : on y est si le point tombe dans sa zone (rayon, au moins 5 m)
  function pres(x, y) {
    const l = listes(); let cible = null, best = Infinity;
    for (const cle of ['retouches', 'objets']) l[cle].forEach((F, i) => { const d = distanceForme(F, x, y); if (d < Math.max(F.r || 0, 5) && d < best) { best = d; cible = { cle, i }; } });
    return cible;
  }
  // les poignées d'une forme choisie, en mètres : le centre (déplacer), le rayon, les deux bouts d'un trait
  function poignees(F) {
    const def = OUTILS[genreDe(F)], [x2, y2] = extremite(F), mx = (F.x + x2) / 2, my = (F.y + y2) / 2;
    if (def.segment) {
      const h = [{ id: 'debut', x: F.x, y: F.y }, { id: 'fin', x: x2, y: y2 }, { id: 'milieu', x: mx, y: my }];
      if (def.champs.includes('r')) { const L = Math.hypot(x2 - F.x, y2 - F.y) || 1; h.push({ id: 'rayon', x: mx - (y2 - F.y) / L * F.r, y: my + (x2 - F.x) / L * F.r }); }
      return h;
    }
    return [{ id: 'centre', x: F.x, y: F.y }, ...(def.champs.includes('r') ? [{ id: 'rayon', x: F.x + F.r, y: F.y }] : [])];
  }
  const pxParM = () => canvas.getBoundingClientRect().width / (C ? C.T.W : 1);
  function appliquerGlisse(p) {
    const F = structuredClone(glisse.depart), dx = p[0] - glisse.p0[0], dy = p[1] - glisse.p0[1];
    switch (glisse.mode) {
      case 'centre': case 'milieu': F.x += dx; F.y += dy; if (F.x2 !== undefined) { F.x2 += dx; F.y2 += dy; } break;
      case 'debut': F.x = p[0]; F.y = p[1]; break;
      case 'fin': F.x2 = p[0]; F.y2 = p[1]; break;
      case 'rayon': F.r = Math.max(3, Math.min(80, Math.round(distanceForme({ ...F, r: 1 }, p[0], p[1])))); break;
    }
    edition = { ...glisse.cible, F };
  }
  // le contrôle du secteur tel qu'il serait publié : dit à voix haute, et l'onglet Publier le refait avant d'écrire
  let problemes = [];
  function verifier() {
    problemes = validerSecteur(effectif());
    essayer.disabled = problemes.length > 0; essayer.title = problemes.length ? 'Corrigez d’abord ce que le contrôle signale' : 'Une bataille d’essai dans un autre onglet, sans rien publier ni sauvegarder';
  }
  const tout = () => { verifier(); panneauBoite(); panneauInspecteur(); redessiner(); };

  // ─── Des champs avec un nom, une description, un curseur et un chiffre ───
  function champNum({ nom, desc, unite, min, max, pas, valeur, modifie = false, surInput, surChange, retour }) {
    const c = el('input', { type: 'range', min, max, step: pas, value: valeur, ariaLabel: nom });
    const n = el('input', { type: 'number', min, max, step: pas, value: valeur, ariaLabel: `${nom}, valeur` });
    const titre = el('span', { className: `at-champ-nom${modifie ? ' at-modifie' : ''}`, textContent: nom });
    const borne = v => Math.min(max, Math.max(min, v));
    c.oninput = () => { n.value = c.value; surInput?.(Number(c.value)); };
    c.onchange = () => surChange?.(Number(c.value));
    n.onchange = () => { const v = Number(n.value); if (!Number.isFinite(v)) { n.value = c.value; return; } c.value = n.value = borne(v); surInput?.(borne(v)); surChange?.(borne(v)); };
    return el('div', { className: 'at-champ' },
      el('div', { className: 'at-champ-tete' }, titre, n, el('span', { className: 'at-unite', textContent: unite || '' }), ...(retour ? [retour] : [])),
      el('p', { className: 'at-champ-desc', textContent: desc }), c);
  }

  // un choix dans une liste (le type d'un pont) : une liste déroulante, son nom et ce qu'elle dit (v0.47.2)
  function champListe({ nom, desc, valeur, liste, surChange }) {
    const sel = el('select', { ariaLabel: nom }, ...liste.map(o => el('option', { value: o.id, textContent: o.nom })));
    sel.value = valeur;
    const detail = el('p', { className: 'at-champ-desc', textContent: liste.find(o => o.id === sel.value)?.desc || desc });
    sel.onchange = () => { detail.textContent = liste.find(o => o.id === sel.value)?.desc || desc; surChange(sel.value); };
    return el('div', { className: 'at-champ' }, el('div', { className: 'at-champ-tete' }, el('span', { className: 'at-champ-nom', textContent: nom })), el('p', { className: 'at-champ-desc', textContent: desc }), sel, detail);
  }
  // ─── La boîte à outils (à gauche) ───
  function panneauBoite() {
    const bouton = id => {
      const d = OUTILS[id], b = el('button', { className: `ed-outil${id === outil ? ' is-on' : ''}`, title: `${d.nom} — ${d.aide}`, ariaPressed: String(id === outil), onclick: () => { outil = id; trace = null; trace3d = null; hote3d.classList.toggle('pose', id !== 'selection'); if (id !== 'selection') choix = null; tout(); canvas.style.cursor = id === 'selection' ? 'default' : 'crosshair'; } });
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d.icone}"/></svg><span>${d.nom}</span>`;
      return b;
    };
    boite.replaceChildren(
      el('div', { className: 'at-row ed-histo' },
        el('button', { textContent: 'Annuler', disabled: !histoire.length, title: 'Défait la dernière pose, déplacement ou suppression', onclick: annuler }),
        el('button', { textContent: 'Rétablir', disabled: !futur.length, onclick: retablir })),
      ...GROUPES_OUTILS.flatMap(g => [el('h3', { className: 'ed-groupe', textContent: g.titre }), ...Object.keys(OUTILS).filter(id => OUTILS[id].groupe === g.id).map(bouton)]));
  }

  // ─── L'inspecteur (à droite) : l'outil ou la forme choisie, puis le secteur ───
  function panneauInspecteur() {
    const l = listes(), pub = publiees(), n = l.retouches.length, m = l.objets.length, modif = JSON.stringify(l) !== JSON.stringify(pub);
    const blocs = [];
    if (problemes.length) blocs.push(el('div', { className: 'ed-alerte' }, el('p', { className: 'at-modifie', textContent: 'Ce secteur ne peut pas être publié :' }), el('ul', null, ...problemes.map(t => el('li', { textContent: t })))));
    const def = OUTILS[outil];
    if (outil === 'selection' && choix && l[choix.cle][choix.i]) {
      const F = l[choix.cle][choix.i], genre = genreDe(F), d = OUTILS[genre], noms = ['x', 'y', ...(d.segment ? ['x2', 'y2'] : []), ...d.champs];
      blocs.push(el('section', { className: 'ed-bloc' }, el('h3', { textContent: `Sélection : ${d.nom}` }), el('p', { className: 'at-note', textContent: `Glissez le carré du centre pour la déplacer${d.champs.includes('r') || d.segment ? ', les autres carrés pour la redimensionner' : ''}. Ou réglez ses chiffres ci-dessous.` }),
        ...noms.map(k => { const c = champ(k, genre); if (c.liste) return champListe({ ...c, valeur: F[k] ?? c.defaut, surChange: v => { edition = null; const copie = l[choix.cle]; copie[choix.i] = { ...F, [k]: v }; poserListe(choix.cle, copie); } }); return champNum({ ...c, valeur: F[k],
          surInput: v => { edition = { ...choix, F: { ...F, [k]: v } }; redessiner(); },
          surChange: v => { edition = null; const copie = l[choix.cle]; copie[choix.i] = { ...F, [k]: v }; poserListe(choix.cle, copie); } }); }),
        el('div', { className: 'at-row' }, el('button', { textContent: 'Supprimer', onclick: supprimerChoix }))));
    } else if (def.genre) {
      blocs.push(el('section', { className: 'ed-bloc' }, el('h3', { textContent: `Outil : ${def.nom}` }), el('p', { className: 'at-note', textContent: def.aide }),
        ...def.champs.map(k => { const c = champ(k, def.genre); const r = reglagesOutil[def.genre]; if (c.liste) return champListe({ ...c, valeur: r[k] ?? c.defaut, surChange: v => { r[k] = v; } }); return champNum({ ...c, valeur: r[k], surInput: v => { r[k] = v; redessiner(); } }); })));
    } else {
      blocs.push(el('section', { className: 'ed-bloc' }, el('h3', { textContent: def.nom }), el('p', { className: 'at-note', textContent: def.aide + (outil === 'selection' ? ' Rien n’est choisi pour l’instant.' : '') })));
    }
    blocs.push(el('section', { className: 'ed-bloc' }, el('h3', { textContent: 'Ce que vous avez posé' }),
      el('p', { className: 'at-note' }, el('span', { textContent: `${n} forme${n > 1 ? 's' : ''} de relief, ${m} objet${m > 1 ? 's' : ''}`, className: modif ? 'at-modifie' : '' }), modif ? ' (pas encore publiés : onglet Publier)' : ''),
      el('div', { className: 'at-row' }, el('button', { textContent: 'Tout effacer', disabled: !n && !m, onclick: () => { histoire.push(l); futur.length = 0; choix = null; ecrireListes({ retouches: [], objets: [] }); } }))));
    blocs.push(panneauSecteur());
    insp.replaceChildren(...blocs);
  }
  // ─── La campagne (v0.42.0) : la carte de chaque bataille ; le brouillon ne garde que ce qui diffère de ce qui est publié (ou des trois d'origine) ───
  const rangPublie = n => publieCampagne[n] && catalogue[publieCampagne[n]] ? publieCampagne[n] : SECTEURS_ORIGINE[n - 1];
  const rangs = () => { const br = lireBrouillon().campagne || {}, out = {}; for (let n = 1; n <= SECTEURS_ORIGINE.length; n++) out[n] = br[n] && catalogue[br[n]] ? br[n] : rangPublie(n); return out; };
  function poserRang(id, n) {
    const cur = rangs(), m = Object.keys(cur).find(k => cur[k] === id), neuf = { ...cur };
    if (n) { const deplace = cur[n]; neuf[n] = id; if (m && +m !== n) neuf[m] = deplace; }
    else if (m) {
      const origine = SECTEURS_ORIGINE[m - 1];
      if (origine === id || Object.values(cur).includes(origine)) return 'La bataille ' + m + ' reprend sa carte d\u2019origine : elle est déjà prise. Donnez plutôt cette bataille à une autre carte.';
      neuf[m] = origine;
    }
    const br = lireBrouillon(), c = {};
    for (let k = 1; k <= SECTEURS_ORIGINE.length; k++) if (neuf[k] !== rangPublie(k)) c[k] = neuf[k];
    if (Object.keys(c).length) br.campagne = c; else delete br.campagne;
    ecrireBrouillon(br); aPublier(); return null;
  }
  function champCampagne(id) {
    const cur = rangs(), m = Object.keys(cur).find(k => cur[k] === id);
    const choix = el('select', { ariaLabel: 'Bataille de campagne' }, el('option', { value: '', textContent: 'Aucune' }), ...Object.keys(cur).map(n => el('option', { value: n, textContent: `Bataille ${n} (aujourd\u2019hui : ${nomDe(cur[n])})` })));
    choix.value = m || '';
    const msg = el('p', { className: 'at-note', textContent: m ? `Cette carte est jouée à la bataille ${m} de la campagne.` : '' });
    choix.onchange = () => { const r = poserRang(id, +choix.value || 0); if (r) { msg.textContent = r; choix.value = m || ''; } else panneauInspecteur(); };
    return el('div', { className: 'at-champ' }, el('div', { className: 'at-champ-tete' }, el('span', { className: 'at-champ-nom', textContent: 'Dans la campagne' })),
      el('p', { className: 'at-champ-desc', textContent: 'La campagne enchaîne trois batailles de plus en plus dures, chacune sur une carte : en choisir une ici lui donne cette place (l\u2019autre carte de ce rang prend la vôtre). Les forces, les jours et la mission suivent le rang, pas la carte.' }), choix, msg);
  }
  // la saison de la carte (v0.52.0) : le temps de la bataille (neige et gel l'hiver, chaleur sèche l'été) et un sol plus ou moins sec ; une liste, comme le type d'un pont
  function champSaison(id) {
    const S = effectif(), pub = lireChemin(secteurEffectif(catalogue[id], publie[id]), 'saison') ?? SAISON_DEFAUT, actuelle = S.saison ?? SAISON_DEFAUT;
    const liste = Object.entries(SAISONS).map(([k, v]) => ({ id: k, nom: v.nom.charAt(0).toUpperCase() + v.nom.slice(1) + (k === SAISON_DEFAUT ? ' (par défaut)' : ''), desc: v.desc }));
    const c = champListe({ nom: 'Saison', desc: 'Le temps qu\u2019il fait pendant la bataille et l\u2019état du sol au départ.', valeur: actuelle, liste, surChange: v => { noter('saison', v, pub); plusTard(); majAlerte(); panneauInspecteur(); } });
    if (actuelle !== pub) c.querySelector('.at-champ-nom').classList.add('at-modifie');
    return c;
  }
  function panneauSecteur() {
    const base = effectif(), b = lireBrouillon().secteurs?.[sel.value] || {};
    const lignes = PARAMS.filter(p => !p.si || lireChemin(catalogue[sel.value], p.si)).map(p => {
      const v0 = lireChemin(base, p.cle) ?? p.defaut, pub = valeurPubliee(p.cle, p);
      let nomEl;
      const retour = el('button', { textContent: '↺', title: `Revenir à la valeur publiée (${pub})`, ariaLabel: `Revenir à la valeur publiée de ${p.nom}`, onclick: () => { poserParam(p, pub); panneauInspecteur(); } });
      const ligne = champNum({ ...p, valeur: v0, modifie: p.cle in b, retour, surInput: v => { poserParam(p, v); ligne.querySelector('.at-champ-nom').className = `at-champ-nom${v !== pub ? ' at-modifie' : ''}`; } });
      ligne.dataset.groupe = p.groupe || '';
      void nomEl;
      return ligne;
    });
    const remise = el('button', { textContent: 'Tout remettre comme publié', title: 'Efface toutes les retouches de ce secteur dans ce navigateur', onclick: () => {
      const br = lireBrouillon(); if (br.secteurs) { delete br.secteurs[sel.value]; if (!Object.keys(br.secteurs).length) delete br.secteurs; }
      ecrireBrouillon(br); aPublier(); histoire.length = futur.length = 0; choix = null; tout(); refaire();
    } });
    // le nom et le résumé : ce que la liste des nouvelles parties montre de la carte
    const id = sel.value, S = effectif(), perso = estPerso(id);
    const texte = (cle, nom, desc, long) => {
      const pub = lireChemin(secteurEffectif(catalogue[id], publie[id]), cle) ?? '';
      const e = long ? el('textarea', { rows: 4, ariaLabel: nom }) : el('input', { type: 'text', maxLength: 60, ariaLabel: nom });
      e.value = S[cle] ?? '';
      e.onchange = () => { noter(cle, e.value.trim(), pub); remplirSelecteur(); verifier(); majAlerte(); };
      return el('div', { className: 'at-champ' }, el('div', { className: 'at-champ-tete' }, el('span', { className: `at-champ-nom${e.value.trim() !== pub ? ' at-modifie' : ''}`, textContent: nom })), el('p', { className: 'at-champ-desc', textContent: desc }), e);
    };
    const enBrouillon = id in (lireBrouillon().cartes || {});
    const etat = perso ? el('p', { className: 'at-note', textContent: enBrouillon ? 'Carte à vous, pas encore publiée : elle s\u2019ajoutera à la liste des nouvelles parties quand vous publierez (onglet Publier).' : 'Carte à vous, publiée : elle est dans la liste des nouvelles parties.' }) : null;
    const supprimer = perso ? el('button', { textContent: 'Supprimer cette carte', title: 'La retire de la liste des nouvelles parties à la prochaine publication', onclick: () => supprimerCarte(id) }) : null;
    return el('details', { className: 'ed-bloc', open: true }, el('summary', { textContent: `Le secteur : ${S.nom}` }),
      ...(etat ? [etat] : []),
      texte('nom', 'Nom de la carte', 'Le titre dans la liste des nouvelles parties.', false),
      champCampagne(id),
      champSaison(id),
      texte('resume', 'Résumé', 'Deux phrases qui disent le caractère de la carte au joueur : le sol, l\u2019eau, la végétation, ce qu\u2019elle demande.', true),
      el('p', { className: 'at-note', textContent: 'En rouge : retouché dans ce navigateur, pas encore publié. Le jeu de ce navigateur l\u2019utilise déjà, à la prochaine bataille.' }),
      ...lignes.flatMap((r, k) => r.dataset.groupe && r.dataset.groupe !== lignes[k - 1]?.dataset.groupe ? [el('h4', { textContent: r.dataset.groupe }), r] : [r]), el('div', { className: 'at-row' }, remise, ...(supprimer ? [supprimer] : [])));
  }
  function poserParam(p, v) { noter(p.cle, v, valeurPubliee(p.cle, p)); verifier(); plusTard(); majAlerte(); }
  // (le contrôle bouge pendant un glissé de curseur : on ne refait que son bloc)
  function majAlerte() {
    const ancien = insp.querySelector('.ed-alerte');
    if (!problemes.length) { ancien?.remove(); return; }
    const neuf = el('div', { className: 'ed-alerte' }, el('p', { className: 'at-modifie', textContent: 'Ce secteur ne peut pas être publié :' }), el('ul', null, ...problemes.map(t => el('li', { textContent: t }))));
    if (ancien) ancien.replaceWith(neuf); else insp.prepend(neuf);
  }

  // ─── Créer une carte : une copie d'une carte (la vôtre, ou d'origine), ou un champ vierge ; elle vit dans le brouillon (`cartes`) jusqu'à la publication ───
  const dlg = el('dialog', { className: 'at-dialogue', ariaLabel: 'Nouvelle carte' });
  function ouvrirNouvelleCarte() {
    const nom = el('input', { type: 'text', maxLength: 40, placeholder: 'Les collines de l\u2019Argonne', ariaLabel: 'Nom de la carte' });
    const modele = el('select', { ariaLabel: 'Partir de' }, el('option', { value: '', textContent: 'Un champ vierge (from scratch)' }),
      ...Object.keys(catalogue).map(id => el('option', { value: id, textContent: `Une copie de : ${nomDe(id)}` })));
    modele.value = sel.value;
    const msg = el('p', { className: 'at-modifie' });
    const creer = el('button', { textContent: 'Créer la carte', className: 'primaire', onclick: () => {
      const n = nom.value.trim();
      if (!n) { msg.textContent = 'Donnez un nom à la carte.'; nom.focus(); return; }
      const depart = modele.value ? secteurEffectif(catalogue[modele.value], publie[modele.value], deplier(lireBrouillon().secteurs?.[modele.value])) : VIERGE;
      const def = nouvelleCarte(depart, n), id = idCarte(n, new Set(Object.keys(catalogue)));
      def.profil = profilDe(terrainDuSecteur(def, { ...def.marges }, 1, R).terrain, def);
      const br = lireBrouillon(); br.cartes = { ...(br.cartes || {}), [id]: def }; ecrireBrouillon(br);
      catalogue = construireCatalogue(); aPublier(); dlg.close();
      remplirSelecteur(); sel.value = id; sel.onchange();
    } });
    dlg.replaceChildren(el('h3', { textContent: 'Nouvelle carte' }),
      el('p', { className: 'at-note', textContent: 'Une copie reprend le relief, les arbres, les tranchées et tout ce que vous avez posé. Elle devient une carte à vous : une fois publiée, elle s\u2019ajoute à la liste des nouvelles parties.' }),
      el('label', { className: 'at-champ' }, el('span', { className: 'at-champ-nom', textContent: 'Nom' }), nom),
      el('label', { className: 'at-champ' }, el('span', { className: 'at-champ-nom', textContent: 'Partir de' }), modele), msg,
      el('div', { className: 'at-row' }, creer, el('button', { textContent: 'Annuler', onclick: () => dlg.close() })));
    if (!dlg.isConnected) document.body.append(dlg);          // (conventions, section 17 : les dialogues sont rattachés au body)
    dlg.showModal(); nom.focus();
  }
  function supprimerCarte(id) {
    if (!confirm(`Supprimer la carte « ${nomDe(id)} » ?`)) return;
    const br = lireBrouillon();
    if (br.cartes?.[id]) { delete br.cartes[id]; if (!Object.keys(br.cartes).length) delete br.cartes; } else br.supprimees = [...new Set([...(br.supprimees || []), id])];
    if (br.secteurs) { delete br.secteurs[id]; if (!Object.keys(br.secteurs).length) delete br.secteurs; }
    if (br.campagne) { for (const k of Object.keys(br.campagne)) if (br.campagne[k] === id) delete br.campagne[k]; if (!Object.keys(br.campagne).length) delete br.campagne; }
    ecrireBrouillon(br); catalogue = construireCatalogue(); aPublier();
    histoire.length = futur.length = 0; choix = null; remplirSelecteur(); sel.value = Object.keys(catalogue)[0]; sel.onchange();
  }

  // ─── La carte ───
  // le terrain se refait pour la vue qu'on regarde ; l'autre se refera quand on y passera
  function refaire() {
    perimee2D = perimee3D = true;
    if (mode === '3d') majVue3D(); else majPlan();
  }
  function majPlan() {
    if (!perimee2D && C) return redessiner();
    C = monterCarte(R, effectif(), Number(graine.value) | 0);
    sol = null; perimee2D = false;
    redessiner();
  }
  async function majVue3D() {
    if (!v3d) {
      etatBarre.textContent = 'Chargement de la vue 3D…';
      v3d = creerVue3D3(); v3d = await v3d;
      v3d.surClic = p => clic3D(secteurDe3D(p));
      v3d.surSurvol = p => { curseur3d = secteurDe3D(p); };
      v3d.surcouche = surcouche3D;
    }
    if (mode !== '3d') return;
    if (perimee3D || !v3d.bataille) { { const [, h, m] = AMBIANCES[ambiance.value]; v3d.regler(h, m); } v3d.monter(sel.value, effectif(), Number(graine.value) | 0, { soldats: cSoldats.checked }); perimee3D = false; }
    v3d.activer(true);
    etatBarre.textContent = 'Vue 3D : un clic pose avec l\u2019outil choisi (crête et haie : deux clics) · glisser tourne et incline · clic droit (ou Maj) + glisser déplace · molette zoome.';
  }
  const creerVue3D3 = async () => { const { creerVue3D } = await import('./apercu-3d.js?v=0.96.0'); return creerVue3D({ R, hote: hote3d }); };
  function basculer(m) {
    if (m === mode) return;
    mode = m;
    vuePlan.className = m === 'plan' ? 'is-on' : ''; vue3d.className = m === '3d' ? 'is-on' : '';
    canvas.hidden = m === '3d'; scene.hidden = m === '3d'; hote3d.hidden = m !== '3d';
    trace3d = null; curseur3d = null;
    if (m === '3d') majVue3D(); else { v3d?.activer(false); majPlan(); }
  }
  const echelle = () => Number(zoom.value) || Math.max(1, Math.min(4, Math.ceil((scene.clientWidth || 840) / (C ? C.T.W : 840))));
  function redessiner() {
    if (!C) return;
    const { T, S, lignes, marges: m } = C, k = echelle();
    if (!sol) { sol = document.createElement('canvas'); sol.width = T.W; sol.height = T.H; }
    if (sol.dataset.courbes !== String(cCourbes.checked) || !sol.dataset.fait) {
      sol.getContext('2d').putImageData(peindreSol(T, R, cCourbes.checked), 0, 0);
      sol.dataset.courbes = String(cCourbes.checked); sol.dataset.fait = '1';
    }
    canvas.width = T.W * k; canvas.height = T.H * k;
    if (Number(zoom.value)) { canvas.style.width = `${T.W * k}px`; canvas.style.height = `${T.H * k}px`; } else { canvas.style.width = '100%'; canvas.style.height = 'auto'; }
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sol, 0, 0, T.W * k, T.H * k);
    const px = n => n / (pxParM() || 1);                                  // n pixels de l'écran, en mètres de carte
    ctx.save(); ctx.scale(k, k);
    if (cArbres.checked) {
      ctx.fillStyle = PALETTE.w;
      for (const b of T.buissons) ctx.fillRect(b.i - 0.5, b.j - 0.5, 1.6, 1.6);
      for (const a of T.arbres) { ctx.fillStyle = PALETTE.t; ctx.fillRect(a.i - 2, a.j - 2, 4, 4); ctx.fillStyle = PALETTE.v; ctx.fillRect(a.i - 1.5, a.j - 1.5, 3, 3); }
    }
    ctx.font = `${px(11)}px ui-monospace, monospace`;
    if (cReperes.checked) {
      ctx.strokeStyle = PALETTE.o; ctx.fillStyle = PALETTE.o; ctx.globalAlpha = 0.35; ctx.lineWidth = px(1);
      for (let x = Math.ceil(-m.x / 50) * 50; x <= S.largeur + m.x; x += 50) { ctx.beginPath(); ctx.moveTo(m.x + x, 0); ctx.lineTo(m.x + x, T.H); ctx.stroke(); }
      for (let y = Math.ceil(-m.y / 50) * 50; y <= S.hauteur + m.y; y += 50) { ctx.beginPath(); ctx.moveTo(0, m.y + y); ctx.lineTo(T.W, m.y + y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (let x = Math.ceil(-m.x / 50) * 50; x <= S.largeur + m.x; x += 50) ctx.fillText(`${x}`, m.x + x + px(3), px(13));
      for (let y = Math.ceil(-m.y / 50) * 50; y <= S.hauteur + m.y; y += 50) ctx.fillText(`${y}`, px(3), m.y + y - px(3));
    }
    if (cLignes.checked) {
      ctx.lineWidth = px(1.5);
      // le secteur, découpé en quatre colonnes A à D
      ctx.strokeStyle = PALETTE.o; ctx.setLineDash([px(8), px(5)]);
      ctx.strokeRect(m.x, m.y, S.largeur, S.hauteur);
      const largeurZone = S.largeur / 4;
      for (let z = 1; z < 4; z++) { ctx.beginPath(); ctx.moveTo(m.x + z * largeurZone, m.y); ctx.lineTo(m.x + z * largeurZone, m.y + S.hauteur); ctx.stroke(); }
      ctx.setLineDash([]); ctx.fillStyle = PALETTE.o;
      'ABCD'.split('').forEach((l, z) => ctx.fillText(l, m.x + z * largeurZone + largeurZone / 2 - px(3), m.y - px(6)));
      // les lignes : 1 est la plus avancée de chaque camp ; bleu = nous, kaki = en face
      for (const L of lignes) {
        ctx.strokeStyle = L.camp === 0 ? PALETTE.n : PALETTE.x; ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        for (let x = 0; x <= T.W; x += 2) { const y = ligneY(L, x + 0.5); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.fillText(String(L.rang + 1), m.x + S.largeur + px(5), L.y0 + px(4));
      }
    }
    if (cFormes.checked || outil !== 'selection') dessinerRetouches(ctx, m, px);
    ctx.restore();
  }
  const glyphe = { bosse: '+', creux: '−', crete: '+', plateau: '=', bois: 'B', haie: 'H', degager: '×', lac: '≈', marecage: '~', fleuve: '≈', pont: '=' };
  function dessinerRetouches(ctx, m, px) {
    ctx.fillStyle = ctx.strokeStyle = PALETTE.o; ctx.lineWidth = px(1.5); ctx.textAlign = 'center';
    const dessiner = (F, enCours, choisie) => {
      const [x2, y2] = extremite(F), genre = genreDe(F), segment = OUTILS[genre].segment, r = F.r ?? px(7);
      ctx.setLineDash(genre === 'creux' || genre === 'degager' ? [px(5), px(4)] : enCours || genre === 'bois' ? [px(3), px(3)] : []);
      ctx.lineWidth = px(choisie ? 2.5 : 1.5);
      if (segment) { ctx.beginPath(); ctx.moveTo(m.x + F.x, m.y + F.y); ctx.lineTo(m.x + x2, m.y + y2); ctx.stroke(); }
      if (genre !== 'haie') for (const [qx, qy] of genre === 'crete' || genre === 'fleuve' || genre === 'pont' ? [[F.x, F.y], [x2, y2]] : [[F.x, F.y]]) { ctx.beginPath(); ctx.arc(m.x + qx, m.y + qy, r, 0, 6.2832); ctx.stroke(); }
      ctx.setLineDash([]); ctx.font = `${px(14)}px ui-monospace, monospace`; ctx.fillText(glyphe[genre] || '', m.x + (F.x + x2) / 2, m.y + (F.y + y2) / 2 + px(5));
    };
    const l = affichees();
    if (cFormes.checked) for (const cle of ['retouches', 'objets']) l[cle].forEach((F, i) => dessiner(F, false, choix?.cle === cle && choix.i === i));
    if (outil === 'selection' && choix && l[choix.cle][choix.i]) {
      const F = l[choix.cle][choix.i], t = px(7);
      for (const h of poignees(F)) { ctx.fillStyle = PALETTE.o; ctx.strokeStyle = PALETTE.t; ctx.lineWidth = px(1.5); ctx.fillRect(m.x + h.x - t, m.y + h.y - t, 2 * t, 2 * t); ctx.strokeRect(m.x + h.x - t, m.y + h.y - t, 2 * t, 2 * t); }
    }
    const def = OUTILS[outil];
    if (def.genre) {
      if (trace) dessiner({ [def.type === 'relief' ? 'f' : 'o']: def.genre, ...trace, ...(def.champs.includes('r') ? { r: reglagesOutil[def.genre].r } : {}) }, true);
      else if (curseurCarte && !def.segment) dessiner({ [def.type === 'relief' ? 'f' : 'o']: def.genre, x: curseurCarte[0], y: curseurCarte[1], ...(def.champs.includes('r') ? { r: reglagesOutil[def.genre].r } : {}) }, true);
    }
    ctx.textAlign = 'start'; ctx.setLineDash([]);
  }

  // ─── Construire dans la vue 3D : un clic sur le sol (les traits en deux clics : le glissé tourne la vue) ───
  const marges = () => catalogue[sel.value].marges;
  const secteurDe3D = p => (p ? [arrondi(p[0] - marges().x), arrondi(p[1] - marges().y)] : null);
  function gommerEn(p) { const c = pres(...p); if (c) { const l = listes()[c.cle]; l.splice(c.i, 1); if (choix) choix = null; poserListe(c.cle, l); } }
  function clic3D(p) {
    if (!p) return;
    const def = OUTILS[outil];
    if (outil === 'gomme') return gommerEn(p);
    if (outil === 'selection') { choix = pres(...p); tout(); return; }
    if (def.segment) {
      if (!trace3d) { trace3d = { x: p[0], y: p[1], x2: p[0], y2: p[1] }; return; }
      const T = trace3d; trace3d = null;
      if (Math.hypot(p[0] - T.x, p[1] - T.y) >= 4) poserForme({ ...nouvelleForme(def, T.x, T.y), x2: p[0], y2: p[1] });
      return;
    }
    poserForme(nouvelleForme(def, ...p));
  }
  // les formes posées, un anneau et un signe projetés sur le sol de la vue 3D (elles suivent le relief et la perspective)
  function surcouche3D(ctx, proj) {
    const m = marges(), l = affichees(), def = OUTILS[outil];
    const pt = (x, y) => { const q = proj(m.x + x, m.y + y); return q[0] < -1e4 ? null : q; };
    const ligne = pts => { ctx.beginPath(); let debut = true; for (const q of pts) { if (!q) { debut = true; continue; } if (debut) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); debut = false; } ctx.stroke(); };
    const anneau = (x, y, r) => ligne(Array.from({ length: 49 }, (_, k) => pt(x + Math.cos(k / 48 * 6.2832) * r, y + Math.sin(k / 48 * 6.2832) * r)));
    const dessiner = (F, enCours, choisie) => {
      const [x2, y2] = extremite(F), genre = genreDe(F), segment = OUTILS[genre].segment;
      ctx.strokeStyle = ctx.fillStyle = PALETTE.o; ctx.lineWidth = choisie ? 3.5 : 2;
      ctx.setLineDash(genre === 'creux' || genre === 'degager' ? [6, 5] : enCours || genre === 'bois' ? [3, 4] : []);
      if (segment) ligne([pt(F.x, F.y), pt(x2, y2)]);
      if (F.r && genre !== 'haie') for (const [qx, qy] of genre === 'crete' || genre === 'fleuve' || genre === 'pont' ? [[F.x, F.y], [x2, y2]] : [[F.x, F.y]]) anneau(qx, qy, F.r);
      ctx.setLineDash([]);
      const c = pt((F.x + x2) / 2, (F.y + y2) / 2);
      if (c) { if (F.r || segment) { ctx.font = '700 15px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(glyphe[genre] || '', c[0], c[1] + 5); } else { ctx.beginPath(); ctx.arc(c[0], c[1], choisie ? 7 : 5, 0, 6.2832); ctx.stroke(); } }
    };
    if (cFormes.checked) for (const cle of ['retouches', 'objets']) l[cle].forEach((F, i) => dessiner(F, false, choix?.cle === cle && choix.i === i));
    if (def.genre && !trace3d && curseur3d && !def.segment) dessiner({ [def.type === 'relief' ? 'f' : 'o']: def.genre, x: curseur3d[0], y: curseur3d[1], ...(def.champs.includes('r') ? { r: reglagesOutil[def.genre].r } : {}) }, true);
    if (trace3d) dessiner({ [def.type === 'relief' ? 'f' : 'o']: def.genre, x: trace3d.x, y: trace3d.y, x2: curseur3d?.[0] ?? trace3d.x2, y2: curseur3d?.[1] ?? trace3d.y2, ...(def.champs.includes('r') ? { r: reglagesOutil[def.genre].r } : {}) }, true);
  }

  // ─── La souris sur la carte ───
  const enMetres = e => { const r = canvas.getBoundingClientRect(); return [arrondi((e.clientX - r.left) / r.width * C.T.W - C.marges.x), arrondi((e.clientY - r.top) / r.height * C.T.H - C.marges.y)]; };
  canvas.onpointerdown = e => {
    if (!C || e.button !== 0) return;
    const p = enMetres(e), def = OUTILS[outil];
    if (outil === 'gomme') return gommerEn(p);
    if (outil === 'selection') {
      const tol = 9 / (pxParM() || 1);
      let mode = null, cible = choix && listes()[choix.cle][choix.i] ? choix : null;
      if (cible) { const F = listes()[cible.cle][cible.i]; const h = poignees(F).filter(q => Math.hypot(q.x - p[0], q.y - p[1]) <= tol).sort((a, b) => (a.id === 'rayon') - (b.id === 'rayon'))[0]; if (h) mode = h.id; }
      if (!mode) { cible = pres(...p); choix = cible; if (cible) mode = OUTILS[genreDe(listes()[cible.cle][cible.i])].segment ? 'milieu' : 'centre'; }
      if (!cible || !mode) { tout(); return; }
      glisse = { mode, cible, p0: p, depart: listes()[cible.cle][cible.i] };
      canvas.setPointerCapture(e.pointerId); panneauInspecteur(); redessiner(); return;
    }
    if (def.segment) { trace = { x: p[0], y: p[1], x2: p[0], y2: p[1] }; canvas.setPointerCapture(e.pointerId); return; }
    poserForme(nouvelleForme(def, ...p));
  };
  canvas.onpointerup = () => {
    if (glisse) {
      const g = glisse, F = edition?.F; glisse = null; edition = null;
      if (F && JSON.stringify(F) !== JSON.stringify(g.depart)) { const l = listes()[g.cible.cle]; l[g.cible.i] = F; poserListe(g.cible.cle, l); } else redessiner();
      return;
    }
    if (!trace) return;
    const T = trace, def = OUTILS[outil]; trace = null;
    if (Math.hypot(T.x2 - T.x, T.y2 - T.y) < 4) return redessiner();
    poserForme({ ...nouvelleForme(def, T.x, T.y), x2: T.x2, y2: T.y2 });
  };
  canvas.onpointerleave = () => { curseurCarte = null; if (OUTILS[outil].genre) redessiner(); };
  canvas.onpointermove = e => {
    if (!C) return;
    curseurCarte = enMetres(e);
    if (glisse) { appliquerGlisse(curseurCarte); redessiner(); }
    else if (trace) { trace.x2 = curseurCarte[0]; trace.y2 = curseurCarte[1]; redessiner(); }
    else if (OUTILS[outil].genre) redessiner();
    const r = canvas.getBoundingClientRect(), { T, marges: m } = C;
    const i = Math.floor((e.clientX - r.left) / r.width * T.W), j = Math.floor((e.clientY - r.top) / r.height * T.H);
    if (i < 0 || j < 0 || i >= T.W || j >= T.H) return;
    const c = j * T.W + i, x = i - m.x, y = j - m.y, dedans = x >= 0 && y >= 0 && x < C.S.largeur && y < C.S.hauteur;
    const lieu = dedans ? `secteur ${'ABCD'[Math.min(3, Math.floor(x / (C.S.largeur / 4)))]}` : 'marge, hors du secteur';
    const tr = T.troncon[c] >= 0 ? ' · dans une tranchée' : T.troncon[c] === -2 ? ' · dans un boyau' : '';
    etatBarre.textContent = `Position : ${x} m depuis l’ouest, ${y} m depuis le haut (${lieu})${tr} · Hauteur du sol : ${(hauteurQ(T, c) / 4).toFixed(1)} m · Sol : ${SOLS[etatCase(T, c, R)]} · Herbe : ${HERBE[T.herbe[c]]}`;
  };
  document.addEventListener('keydown', e => {
    if (!canvas.isConnected || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { if (choix) { e.preventDefault(); supprimerChoix(); } }
    else if (e.key === 'Escape') { choix = null; trace = null; trace3d = null; glisse = null; edition = null; tout(); }
  });
  sel.onchange = () => { histoire.length = futur.length = 0; trace = null; choix = null; tout(); refaire(); };
  graine.onchange = refaire; zoom.onchange = redessiner;
  window.addEventListener('resize', () => { if (canvas.isConnected) redessiner(); });

  zone.classList.add('at-plein');
  zone.replaceChildren(el('div', { className: 'ed' },
    el('div', { className: 'ed-haut' },
      el('span', { className: 'ed-vues', role: 'group', ariaLabel: 'Vue' }, vuePlan, vue3d), el('label', { className: 'at-coche' }, 'Secteur ', sel), el('button', { textContent: 'Nouvelle carte…', title: 'Crée une carte à vous : une copie d\u2019une carte existante, ou un champ vierge', onclick: ouvrirNouvelleCarte }), el('label', { className: 'at-coche', title: graine.title }, 'Graine ', graine), nouvelle, zoom,
      el('span', { className: 'ed-calques' }, lCourbes, lArbres, lLignes, lFormes, lReperes, lSoldats, el('label', { className: 'at-coche', title: ambiance.title }, 'Lumière (3D) ', ambiance)), essayer),
    boite, scene, hote3d, etatBarre, insp));
  canvas.style.cursor = 'default';
  tout();
  refaire();
}
