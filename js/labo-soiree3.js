// « La soirée », troisième jet (Jérôme, 18 nov., sur le deuxième jet ; ROADMAP « Le soir, le moment des améliorations », « Troisième jet ») :
// 1. la journée : la carte du front au centre (le plan des quatre secteurs : les tronçons pris et perdus, où nos hommes sont tombés), une bascule « Aujourd'hui / Depuis le début »
//    à la place du sous-écran, la courbe des effectifs dessous, le décompte en registre à droite, trois moments du jour en cartes (dont la médaille du jour) ;
// 2. le camp : sept onglets aux intitulés du jeu, des nœuds en icônes dans des cercles (le nom au survol, la description au clic), 5 niveaux (le I donné, 2 pistes × 4 rangs,
//    data/ameliorations.js, validé), « Annuler » qui rend tout ce qui a été dépensé ce soir (le « Rendre » de chaque nœud reste) ;
// 3. les régiments : « Continuer la bataille » ; les hommes en paquets de 10 traits (un paquet de 1 à 9 pour le reste), les blessés en paquets à part, en pointillé ; on glisse un paquet
//    d'une carte à l'autre autant qu'on veut ; un régiment vidé devient gris et disparaît à l'aube, sauf si on lui rend des hommes ou qu'on annule.
// RIEN N'EST EN JEU : les règles (deux pistes, l'achat au clic, les 5 niveaux, l'Infanterie, la dissolution) attendent que Jérôme tranche ce jet.
import { ARBRES, ORDRE_ARBRES, PRIX, DOTATION_SOIR, ROMAINS, nomRang } from './data/ameliorations.js?v=0.166.1';
import { el, html, info, bouton, corvee, puceReleve, vivres, motMoral, graphe } from './hud/papier-nuit.js?v=0.166.1';
import { jaugeMoral } from './hud/bilan.js?v=0.166.1';
import { iconeCorvee, iconeMedaille } from './hud/icones-nuit.js?v=0.166.1';
import { iconeCamp } from './hud/icones-camp.js?v=0.166.1';
import { cadre, CSS_NUIT, CSS_FIN } from './labo-papiers.js?v=0.166.1';
import { soireeExemple } from './labo-soiree.js?v=0.166.1';
import { CSS_SOIREE2 } from './labo-soiree2.js?v=0.166.1';

const pts = n => `${n} pt${n > 1 ? 's' : ''}`;
const SECTEURS = ['A', 'B', 'C', 'D'];
const LIGNES = ['Leur 2e ligne', 'Leur 1re ligne', 'Notre 1re ligne', 'Notre 2e ligne'];
// un petit hasard tiré d'un nombre (les croix des morts ne bougent pas d'un dessin à l'autre)
const hache = k => { let x = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

// ─── L'exemple : le front de ce soir (un 6e soir), cohérent avec `soireeExemple` ───────────────────────────────
// `tenus[l][t]` : le camp qui tient le tronçon t (0 à 7 : deux par secteur) de la ligne l (0 : leur 2e ligne … 3 : notre 2e), au début, hier et ce soir (0 : nous, 1 : eux)
export function frontExemple(S) {
  const depart = LIGNES.map((_, l) => Array(8).fill(l < 2 ? 1 : 0));
  const hier = depart.map(l => [...l]);
  hier[1][2] = 0; hier[1][4] = 0; hier[1][5] = 0;            // leur 1re ligne : B (un tronçon) et C (les deux), pris les jours d'avant
  const soir = hier.map(l => [...l]);
  soir[0][4] = 0;                                            // aujourd'hui : un tronçon de leur 2e ligne, en C (la première fois : +2)
  soir[2][0] = 1; soir[2][1] = 1; soir[2][7] = 1;            // aujourd'hui : notre 1re ligne perdue en A (les deux tronçons) et en D (un)
  const [n] = S.N.d.camps, total = S.F.camps[0].mortsParJour.reduce((t, v) => t + v, 0);
  const part = (v, p) => p.map(x => Math.round(v * x));
  return { depart, hier, soir, morts: part(n.mortsJour, [0.45, 0.1, 0.3, 0.15]), mortsTout: part(total, [0.32, 0.2, 0.3, 0.18]),
    moments: [
      { genre: 'medaille', cle: S.N.med.regiments[0].cle, titre: S.N.med.regiments[0].titre, nom: S.N.med.regiments[0].nom, detail: S.N.med.regiments[0].detail, secteur: 2 },
      { genre: 'pris', titre: 'Leur 2e ligne', nom: 'Secteur C, 17 h', detail: 'un tronçon pris, la première fois', secteur: 2 },
      { genre: 'perdu', titre: 'Notre 1re ligne', nom: 'Secteur A, 15 h', detail: 'deux tronçons perdus', secteur: 0 },
    ] };
}

export function etapes3(S) {
  const N = S.N, K = S.camp, F = frontExemple(S);
  // la dotation de ce soir, avec la décision du 18 nov. (le soir rapporte +2)
  const soirLignes = K.soir.map(([nom, v], k) => [nom, k === 0 ? DOTATION_SOIR : v]);
  const caisseSoir = K.hier + soirLignes.reduce((t, [, v]) => t + v, 0);
  let caisse = caisseSoir;
  // le camp : les rangs acquis (« onglet:piste:rang »), ceux de ce soir (rendus d'un clic, ou tous par « Annuler »)
  const acquis = new Set(['artillerie:0:0', 'artillerie:0:1', 'artillerie:1:0', 'chars:1:0', 'sapeurs:0:0', 'caserne:0:0', 'infanterie:0:0']), ceSoir = new Set();
  // les régiments : leurs paquets, chacun { id, n, bl (blessés), de (le régiment d'origine) }
  const paquets = new Map(); let np = 0;
  const empaqueter = r => { const l = []; for (const [v, bl] of [[r.debout, false], [r.blesses, true]]) for (let x = v; x > 0; x -= 10) l.push({ id: np++, n: Math.min(10, x), bl, de: r.id }); return l; };
  for (const r of N.regs) paquets.set(r.id, empaqueter(r));
  const V = { etape: 0, vue: 'jour', moment: null, onglet: 'artillerie', sel: [0, 0], tenu: null };

  const p = el('section', 'papier pn ps ps-e ps3'), fil = el('nav', 'ps-fil'), corps = el('div', 'ps-corps'), bas = el('footer', 'ps-bas');
  p.append(el('header', 'ps-bande', el('h2', '', S.titre), fil), corps, bas);
  const ETAPES = [['La journée', 'Améliorer le camp'], ['Le camp', 'Les régiments'], ['Les régiments', 'Continuer la bataille']];
  const aller = k => { V.etape = k; rendre(); };
  function rendre() {
    fil.replaceChildren(...ETAPES.map(([nom], k) => {
      const fait = k < V.etape, b = bouton(`ps-pas${fait ? ' fait' : ''}`, fait ? html('span', 'ps-coche', '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3 3 7-7"/></svg>') : el('kbd', '', String(k + 1)), el('span', '', nom));
      b.setAttribute('aria-current', String(k === V.etape)); b.onclick = () => aller(k); return b;
    }).flatMap((b, k) => k ? [el('span', 'ps-fleche', '→'), b] : [b]));
    corps.replaceChildren([journee, camp, regiments][V.etape]());
    const retour = V.etape ? bouton('bouton ps-retour', `← ${ETAPES[V.etape - 1][0]}`) : el('span');
    if (V.etape) retour.onclick = () => aller(V.etape - 1);
    const cta = bouton('bouton ps-action', `${ETAPES[V.etape][1]}${V.etape < 2 ? ' →' : ''}`); cta.onclick = () => V.etape < 2 && aller(V.etape + 1);
    if (V.etape === 2) info(cta, `# Continuer la bataille\nLa nuit | **les corvées se font**\nÀ l'aube | les transferts marchent${vides().length ? `\nDissous | **${vides().map(r => r.nom).join(', ')}**` : ''}`);
    bas.replaceChildren(retour, cta);
  }

  // ─── 1. La journée ─────────────────────────────────────────────────────
  function carteFront() {
    const tout = V.vue === 'tout', avant = tout ? F.depart : F.hier, M = 92, W = M + 588, H = 184, cx = s => M + s * 147, y = [16, 48, 124, 158];
    const parts = [];
    // le no man's land, les secteurs, leurs lettres
    parts.push(`<rect class="nml" x="${M}" y="${y[1] + 14}" width="${W - M}" height="${y[2] - y[1] - 28}"/>`, `<text class="nml-t" x="${M + (W - M) / 2}" y="${(y[1] + y[2]) / 2 + 4}">no man's land</text>`);
    SECTEURS.forEach((s, k) => {
      if (k) parts.push(`<path class="sep" d="M${cx(k) - 3} 4V${H - 4}"/>`);
      const sur = V.moment !== null && F.moments[V.moment].secteur === k;
      if (sur) parts.push(`<rect class="sur" x="${cx(k)}" y="2" width="141" height="${H - 4}"/>`);
      parts.push(`<text class="lettre" x="${cx(k) + 8}" y="${(y[1] + y[2]) / 2 - 10}">${s}</text>`);
    });
    // où nos hommes sont tombés : une croix par homme, dans le secteur, autour de nos lignes et devant elles
    (tout ? F.mortsTout : F.morts).forEach((m, s) => {
      for (let i = 0; i < m; i++) {
        const a = hache(s * 1000 + i + (tout ? 7 : 0)), b = hache(s * 3000 + i * 7 + 1), x = cx(s) + 10 + a * 124, yy = y[1] + 20 + b * (y[3] - y[1] - 18);
        parts.push(`<path class="croix${tout ? ' vieux' : ''}" d="M${x - 2} ${yy - 2}l4 4M${x + 2} ${yy - 2}l-4 4"/>`);
      }
    });
    // les tronçons : un créneau par tronçon, au camp qui le tient ; ce qui a changé (aujourd'hui, ou depuis le début) est marqué : ▲ pris, ▼ perdu
    let pris = 0, perdus = 0;
    F.soir.forEach((ligne, l) => ligne.forEach((c, t) => {
      const s = t >> 1, x0 = cx(s) + 8 + (t & 1) * 68, x1 = x0 + 58, yy = y[l], ch = avant[l][t] !== c;
      let d = `M${x0} ${yy}`; for (let x = x0; x < x1; x += 8) d += `h4v${(x - x0) % 16 ? 4 : -4}h4v${(x - x0) % 16 ? -4 : 4}`;
      parts.push(`<path class="tr ${c ? 'eux' : 'nous'}${ch ? ` change ${c ? 'perdu' : 'pris'}` : ''}" d="${d}"/>`);
      if (ch) {
        if (c) perdus++; else pris++;
        parts.push(`<path class="marque ${c ? 'perdu' : 'pris'}" d="${c ? `M${(x0 + x1) / 2 - 5} ${yy - 12}h10l-5 7z` : `M${(x0 + x1) / 2 - 5} ${yy - 6}h10l-5 -7z`}"/>`);
      }
    }));
    LIGNES.forEach((nom, l) => parts.push(`<text class="ligne-t" x="${M - 8}" y="${y[l] + 4}">${nom}</text>`));
    const svg = html('div', 'ps3-front', `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="La carte du front">${parts.join('')}</svg>`);
    const tombes = (tout ? F.mortsTout : F.morts).reduce((a, b) => a + b, 0);
    info(svg, `# ${tout ? 'Depuis le début' : 'Aujourd\'hui'}\nPris | **${pris}** tronçon${pris > 1 ? 's' : ''}\nPerdus | **${perdus}** tronçon${perdus > 1 ? 's' : ''}\nTombés | **${tombes}** des nôtres\nUne croix | un homme`);
    return svg;
  }
  function journee() {
    const bascule = el('div', 'ps3-bascule', ...[['jour', 'Aujourd\'hui'], ['tout', 'Depuis le début']].map(([k, nom]) => {
      const b = bouton('ps3-b', nom); b.setAttribute('aria-pressed', String(V.vue === k)); b.onclick = () => { V.vue = k; rendre(); }; return b;
    }));
    const legende = el('div', 'ps3-legende', html('span', '', '<i class="lg tr-n"></i>à nous'), html('span', '', '<i class="lg tr-e"></i>à eux'), html('span', '', '<i class="lg pris">▲</i>pris'), html('span', '', '<i class="lg perdu">▼</i>perdu'), html('span', '', '<i class="lg croix">×</i>un mort'));
    const courbe = info(html('div', 'ps3-courbe', graphe(S.F, { larg: 600, haut: 64 })), `# Les effectifs\nJour après jour | les vivants, nous et en face\n${V.vue === 'jour' ? 'Ce soir | le dernier point' : 'Depuis | le premier matin'}`);
    const centre = el('div', 'ps3-centre', el('div', 'ps3-tete', el('h3', '', 'Le front'), bascule), carteFront(), legende, courbe);
    // le registre : la dotation, ligne à ligne, à la plume ; le total sous deux traits
    const rang = (nom, v, cls = '') => el('div', `ps3-reg-l ${cls}`, el('span', '', nom), el('i', ''), el('b', '', v));
    const registre = el('aside', 'ps3-registre', el('h3', '', 'Le registre'), el('small', 'ps3-reg-date', `${S.titre.replace('Le soir du ', '')} · la dotation`),
      rang('Gardés d\'hier', String(K.hier), 'discret'), ...soirLignes.map(([nom, v]) => rang(nom.replace(' (la première fois)', '').replace('Nos lignes tenues à 75 %', 'Nos lignes à 75\u00a0%'), `+${v}`)), rang('En caisse', String(caisseSoir), 'total'));
    info(registre, `# Le registre\nGardés d'hier | ${K.hier}\n${soirLignes.map(([nom, v]) => `${nom.replace(' (la première fois)', '')} | **+${v}**`).join('\n')}\nEn caisse | **${caisseSoir}**\nOn dépense | à l'étape 2, le camp`);
    // les moments du jour : la médaille, le tronçon pris, le tronçon perdu ; un clic montre leur secteur sur la carte
    const moments = el('div', 'ps3-moments', ...F.moments.map((m, k) => {
      const ic = m.genre === 'medaille' ? iconeMedaille(m.cle) : `<svg viewBox="0 0 16 16" width="18" height="18"><path d="${m.genre === 'pris' ? 'M2 12h12L8 3z' : 'M2 4h12L8 13z'}" fill="currentColor"/></svg>`;
      const b = bouton(`ps3-moment ${m.genre}`, html('span', 'ps3-m-ic', ic), el('span', 'ps3-m-t', m.titre), el('b', '', m.nom), el('small', '', m.detail));
      b.setAttribute('aria-pressed', String(V.moment === k)); b.onclick = () => { V.moment = V.moment === k ? null : k; rendre(); };
      return info(b, `# ${m.titre}\n${m.genre === 'medaille' ? 'Médaille | du jour\n' : ''}Où | **${m.nom}**\nQuoi | ${m.detail}\nUn clic | son secteur sur la carte`);
    }));
    return el('section', 'ps-panneau ps3-journee', centre, registre, moments);
  }

  // ─── 2. Le camp ─────────────────────────────────────────────────────────
  const cle = (o, pi, k) => `${o}:${pi}:${k}`;
  const prixDe = k => PRIX[k];
  // ce qu'un rang demande : le rang d'avant de sa piste, et son lien ; null si tout est là
  const manque = (o, pi, k) => {
    if (k && !acquis.has(cle(o, pi, k - 1))) return [o, pi, k - 1];
    const L = ARBRES[o].pistes[pi].rangs[k].lien;
    return L && !acquis.has(cle(...L)) ? L : null;
  };
  const etatRang = (o, pi, k) => acquis.has(cle(o, pi, k)) ? (ceSoir.has(cle(o, pi, k)) ? 'soir' : 'acquis') : manque(o, pi, k) ? 'verrou' : prixDe(k) > caisse ? 'cher' : 'dispo';
  const acheter = (o, pi, k) => { acquis.add(cle(o, pi, k)); ceSoir.add(cle(o, pi, k)); caisse -= prixDe(k); rendre(); };
  // rendre un rang de ce soir rembourse aussi ce qui, acheté ce soir, en dépendait (la suite de la piste, un lien d'un autre onglet)
  const rendreRang = c => {
    acquis.delete(c); ceSoir.delete(c); caisse += prixDe(+c.split(':')[2]);
    for (let encore = true; encore;) {
      encore = false;
      for (const x of ceSoir) { const [o, pi, k] = x.split(':'); if (manque(o, +pi, +k)) { acquis.delete(x); ceSoir.delete(x); caisse += prixDe(+k); encore = true; } }
    }
  };
  const depenseSoir = () => [...ceSoir].reduce((t, c) => t + prixDe(+c.split(':')[2]), 0);
  const peutAcheter = o => ARBRES[o].pistes.some((_, pi) => [0, 1, 2, 3].some(k => etatRang(o, pi, k) === 'dispo'));
  const nbAcquis = o => ARBRES[o].pistes.reduce((t, _, pi) => t + [0, 1, 2, 3].filter(k => acquis.has(cle(o, pi, k))).length, 0);
  const pips = (n, pleins) => html('span', 'ps-carres', Array.from({ length: n }, (_, k) => `<i class="${k < pleins ? 'plein' : ''}"></i>`).join(''));
  const LIEN = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 9.5l3-3M7 4.5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5L7.5 13A2.5 2.5 0 0 1 4 9.5L5.5 8"/></svg>';
  const CADENAS = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="10" height="7"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>';
  const COCHE = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 8.5l3 3 7-7"/></svg>';

  function noeud(o, pi, k) {
    const R = ARBRES[o].pistes[pi].rangs[k], st = etatRang(o, pi, k), sel = V.sel[0] === pi && V.sel[1] === k;
    const coin = st === 'acquis' || st === 'soir' ? COCHE : st === 'verrou' ? CADENAS : R.lien ? LIEN : '';
    const b = bouton(`ps3-n ${st}`, html('span', 'ps3-rond', iconeCamp(R.nom)), coin ? html('span', 'ps3-coin', coin) : null);
    b.setAttribute('aria-label', R.nom); b.setAttribute('aria-pressed', String(sel)); b.dataset.info = R.nom;      // le nom au survol ; la description au clic
    b.onclick = () => { V.sel = [pi, k]; rendre(); };
    return el('div', 'ps3-place', b, pips(prixDe(k), st === 'cher' ? Math.min(prixDe(k), caisse) : prixDe(k)));
  }
  function arbre(o) {
    const A = ARBRES[o], plein = (pi, k) => k < 0 || acquis.has(cle(o, pi, k));
    const racineSel = V.sel[0] === 'i';
    const racine = bouton('ps3-n acquis ps3-racine', html('span', 'ps3-rond', iconeCamp(A.i.nom)), html('span', 'ps3-coin', COCHE));
    racine.setAttribute('aria-label', A.i.nom); racine.setAttribute('aria-pressed', String(racineSel)); racine.dataset.info = A.i.nom;
    racine.onclick = () => { V.sel = ['i', 0]; rendre(); };
    // le lien de la racine vers le premier rang de chaque piste
    const fourche = html('div', 'ps3-fourche', `<svg viewBox="0 0 40 100" preserveAspectRatio="none"><path class="ok" d="M0 50H16M16 25V75"/>${[0, 1].map(pi => `<path class="${plein(pi, 0) ? 'ok' : ''}" d="M16 ${pi ? 75 : 25}H40"/>`).join('')}</svg>`);
    const pistes = A.pistes.map((P, pi) => el('div', 'ps3-piste', el('span', 'ps3-piste-t', P.nom), el('div', 'ps3-rangs', ...[0, 1, 2, 3].flatMap(k => k
      ? [html('span', `ps3-trait${plein(pi, k) && plein(pi, k - 1) ? ' ok' : ''}`, ''), noeud(o, pi, k)] : [noeud(o, pi, k)]))));
    return el('div', 'ps3-arbre', el('div', 'ps3-place ps3-place-i', racine), fourche, el('div', 'ps3-pistes', ...pistes));
  }
  // le panneau du nœud choisi : la description (au clic), le chiffre, le prix, le lien, le seul bouton d'achat
  function panneau(o) {
    const A = ARBRES[o];
    if (V.sel[0] === 'i') return el('div', 'ps3-noeud', el('div', 'ps-nt', html('span', 'ps-nt-ic ps3-rond', iconeCamp(A.i.nom)), el('div', '', el('h3', '', A.i.nom), el('span', 'ps-nt-sous', el('b', '', 'I'), el('small', '', 'donné au départ')))),
      el('p', 'ps3-chiffre', A.i.chiffre), el('div', 'ps-pousse'));
    const [pi, k] = V.sel, R = A.pistes[pi].rangs[k], st = etatRang(o, pi, k), c = cle(o, pi, k), m = manque(o, pi, k);
    const tete = el('div', 'ps-nt', html('span', 'ps-nt-ic ps3-rond', iconeCamp(R.nom)), el('div', '', el('h3', '', R.nom), el('span', 'ps-nt-sous', el('b', '', ROMAINS[k]), el('small', '', A.pistes[pi].nom), pips(prixDe(k), prixDe(k)))));
    const lien = R.lien ? el('div', `ps3-lien${acquis.has(cle(...R.lien)) ? ' ok' : ''}`, html('span', '', R.lien && acquis.has(cle(...R.lien)) ? COCHE : LIEN), el('span', '', `${ARBRES[R.lien[0]].court} · ${nomRang(R.lien)} ${ROMAINS[R.lien[2]]}`)) : null;
    let action;
    if (st === 'dispo') { action = bouton('bouton ps-acheter', `Améliorer · ${pts(prixDe(k))}`); action.onclick = () => acheter(o, pi, k); }
    else if (st === 'soir') { action = info(bouton('bouton ps-rendre', `Rendre · +${pts(prixDe(k))}`), '# Rendre\nAcquis | ce soir\nJusqu\'à l\'aube | un clic le rend et rembourse\nAvec lui | ce qui en dépendait, acheté ce soir'); action.onclick = () => { rendreRang(c); rendre(); }; }
    else action = el('p', 'ps-raison', st === 'acquis' ? 'Acquis.' : st === 'cher' ? `Il manque ${prixDe(k) - caisse} point${prixDe(k) - caisse > 1 ? 's' : ''}.` : `Demande ${m[0] === o ? '' : `${ARBRES[m[0]].court} · `}${nomRang(m)} ${ROMAINS[m[2]]}.`);
    return el('div', 'ps3-noeud', tete, el('p', 'ps3-chiffre', R.chiffre), lien, el('div', 'ps-pousse'), action);
  }
  function camp() {
    const onglets = el('nav', 'ps3-tabs', ...ORDRE_ARBRES.map(o => {
      const b = bouton('ps3-tab', el('span', 'ps3-tab-t', ARBRES[o].nom), pips(8, nbAcquis(o)), peutAcheter(o) ? info(el('i', 'ps-plus', '+'), '# Un rang à votre portée') : null);
      b.setAttribute('aria-selected', String(V.onglet === o)); b.onclick = () => { V.onglet = o; V.sel = [0, 0]; rendre(); };
      return b;
    }));
    const dep = depenseSoir();
    const caisseEl = info(el('div', 'ps-caisse', el('b', '', String(caisse)), el('span', '', caisse > 1 ? 'points' : 'point'),
      html('span', 'ps-carres ps-jetons', Array.from({ length: caisseSoir }, (_, k) => `<i class="${k < caisse ? 'plein' : 'depense'}"></i>`).join(''))),
      `# La caisse\nÀ dépenser | **${caisse}**${dep ? `\nDépensés ce soir | ${dep}, rendus jusqu'à l'aube` : ''}`);
    const annuler = bouton(`bouton ps3-annuler${dep ? '' : ' refus'}`, dep ? `Annuler · rend ${pts(dep)}` : 'Annuler');
    if (dep) annuler.onclick = () => { for (const c of [...ceSoir]) if (ceSoir.has(c)) rendreRang(c); rendre(); };
    else annuler.setAttribute('aria-disabled', 'true');
    info(annuler, dep ? `# Annuler\nRend | **tout ce qui a été dépensé ce soir**\nRangs | ${ceSoir.size}\nPoints | **+${dep}**` : '# Annuler\n**Rien n\'a été dépensé ce soir.**');
    return el('section', 'ps-panneau ps3-camp', el('div', 'ps-col ps3-gauche', onglets, arbre(V.onglet)), el('aside', 'ps-cote ps3-cote', el('div', 'ps3-caisse-l', caisseEl, annuler), panneau(V.onglet)));
  }

  // ─── 3. Les régiments ───────────────────────────────────────────────────
  const total = id => paquets.get(id).reduce((t, q) => t + q.n, 0);
  const vides = () => N.regs.filter(r => !total(r.id));
  const deplacer = (qid, vers) => {
    for (const [id, l] of paquets) { const i = l.findIndex(q => q.id === qid); if (i >= 0) { if (id === vers) return; const [q] = l.splice(i, 1); paquets.get(vers).push(q); break; } }
    V.tenu = null; rendre();
  };
  const annulerTransferts = () => { const tous = [...paquets.values()].flat(); for (const l of paquets.values()) l.length = 0; for (const q of tous.sort((a, b) => a.id - b.id)) paquets.get(q.de).push(q); V.tenu = null; rendre(); };
  const nomDe = id => N.regs.find(r => r.id === id).nom;
  // un paquet : n traits (10 au plus), en pointillé pour les blessés ; il se glisse (ou un clic le prend, un clic sur une carte le pose)
  function paquet(q, chez) {
    const w = q.n * 3 + 3, traits = Array.from({ length: q.n }, (_, k) => `<path d="M${3 + k * 3} 2v12"/>`).join('');
    const e = html('span', `ps3-paquet${q.bl ? ' bl' : ''}${q.de !== chez ? ' venu' : ''}${V.tenu === q.id ? ' tenu' : ''}`, `<svg viewBox="0 0 ${w} 16" width="${w}" height="16" aria-hidden="true">${traits}${q.n === 10 ? `<path class="lien" d="M1 11L${w - 1} 5"/>` : ''}</svg>`);
    e.draggable = true; e.tabIndex = 0; e.setAttribute('role', 'button');
    e.setAttribute('aria-label', `${q.n} ${q.bl ? 'blessés' : 'hommes'}${q.de !== chez ? ` du ${nomDe(q.de)}` : ''}`);
    e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', String(q.id)); ev.dataTransfer.effectAllowed = 'move'; V.tenu = q.id; };
    e.onclick = ev => { ev.stopPropagation(); V.tenu = V.tenu === q.id ? null : q.id; rendre(); };
    return info(e, `# ${q.n} ${q.bl ? (q.n > 1 ? 'blessés' : 'blessé') : (q.n > 1 ? 'hommes' : 'homme')}\n${q.de !== chez ? `Venus du | **${nomDe(q.de)}**\nÀ l'aube | ils marchent jusqu'ici\n` : ''}Glisser | sur une autre carte\nOu | un clic ici, puis sur la carte`);
  }
  function regiments() {
    const sortes = N.sortes, tous = el('div', 'ps-tous', el('span', '', 'Tous :'), ...sortes.map(c => corvee(c, false, '')));
    const bouge = [...paquets.entries()].some(([id, l]) => l.some(q => q.de !== id));
    const ann = bouton(`bouton ps3-annuler${bouge ? '' : ' refus'}`, 'Annuler les transferts');
    if (bouge) ann.onclick = annulerTransferts; else ann.setAttribute('aria-disabled', 'true');
    info(ann, bouge ? '# Annuler les transferts\nChaque paquet | revient à son régiment\nLes régiments vidés | **reprennent vie**' : '# Annuler les transferts\n**Aucun paquet n\'a bougé.**');
    const grille = el('div', 'ps3-cartes');
    for (const r of N.regs) {
      const l = paquets.get(r.id), debout = l.filter(q => !q.bl).reduce((t, q) => t + q.n, 0), bl = l.filter(q => q.bl).reduce((t, q) => t + q.n, 0), vide = !debout && !bl;
      const recu = l.filter(q => q.de !== r.id).reduce((t, q) => t + q.n, 0), parti = [...paquets.entries()].filter(([id]) => id !== r.id).flatMap(([, x]) => x).filter(q => q.de === r.id).reduce((t, q) => t + q.n, 0);
      const carte = el('article', `ps3-carte${vide ? ' vide' : ''}${V.tenu !== null ? ' cible' : ''}`);
      carte.ondragover = ev => { ev.preventDefault(); carte.classList.add('survol'); };
      carte.ondragleave = () => carte.classList.remove('survol');
      carte.ondrop = ev => { ev.preventDefault(); deplacer(+ev.dataTransfer.getData('text/plain'), r.id); };
      carte.onclick = () => { if (V.tenu !== null) deplacer(V.tenu, r.id); };
      const bilan = recu || parti ? el('span', 'ps3-solde', `${parti ? `−${parti}` : ''}${recu && parti ? ' ' : ''}${recu ? `+${recu}` : ''}`) : null;
      const tete = info(el('header', 'ps3-c-tete', el('b', '', String(r.id + 1)), el('span', '', r.nom), bilan),
        vide ? `# ${r.nom}\n**Vidé : il disparaît à l'aube.**\nSon nom | perdu, ses médailles aussi\nPour le garder | lui rendre des hommes, ou annuler`
          : `# Régiment ${r.nom}\nDebout | **${debout}** sur ${r.initial}\nBlessés | ${bl}\nMoral | **${Math.round(r.moral * 100)} %** ${motMoral(r.niveau)}\nVivres | **${r.vivres}** ${r.vivres > 1 ? 'nuits' : 'nuit'}${recu ? `\nReçus ce soir | +${recu}` : ''}${parti ? `\nPartis ce soir | −${parti}` : ''}`);
      const hommes = el('div', 'ps3-paquets', ...l.filter(q => !q.bl).map(q => paquet(q, r.id))), blesses = el('div', 'ps3-paquets bl', ...l.filter(q => q.bl).map(q => paquet(q, r.id)));
      const etatL = el('div', 'ps3-etat', el('b', '', String(debout)), el('small', '', bl ? `+${bl} bl.` : ''), html('span', 'pn-moral', jaugeMoral(r.moral, r.niveau, { larg: 40 })), vivres(Math.min(3, r.vivres)));
      const bas = vide ? el('p', 'ps3-dissous', 'Dissous à l\'aube')
        : r.corvee === 'contact' ? el('div', 'ps-corvees3', info(html('span', 'ps-contact3', iconeCorvee('contact')), '# Au contact\nCette nuit | **il se bat**\nCorvée | aucune'))
        : el('div', 'ps-corvees3', ...sortes.map(c => corvee(c, r.corvee === c.id, r.refus[c.id], r.donne, r.id)));
      carte.append(tete, etatL, hommes, blesses, bas);
      grille.append(carte);
    }
    return el('section', 'ps-panneau ps3-regiments', el('div', 'ps-regs-tete', tous, el('div', 'ps3-droite', ann, puceReleve(N.reserve))), grille);
  }

  p.vues = [
    ['La journée, aujourd\'hui', () => { V.etape = 0; V.vue = 'jour'; V.moment = null; rendre(); }],
    ['La journée, depuis le début', () => { V.etape = 0; V.vue = 'tout'; V.moment = 0; rendre(); }],
    ['Le camp, Parc d\'artillerie', () => { V.etape = 1; V.onglet = 'artillerie'; V.sel = [0, 3]; rendre(); }],
    ['Le camp, Infanterie', () => { V.etape = 1; V.onglet = 'infanterie'; V.sel = [1, 0]; rendre(); }],
    ['Les régiments', () => aller(2)],
    ['Les régiments, un régiment vidé', () => { V.etape = 2; for (const q of [...paquets.get(7)]) deplacer(q.id, 6); }],
  ].map(([nom, f]) => ({ nom, f }));
  rendre();
  return p;
}

// ─── La feuille ──────────────────────────────────────────────────────────
// Elle s'ajoute à celle du deuxième jet (le cadre : la bande sombre, la hauteur fixe, le pied, le rouge sang). Tout sélecteur porte `.ps-e` (le piège `.pn button`, labo-atelier.md).
export const CSS_SOIREE3 = `
/* 1 : la carte du front au centre, le registre à droite, les moments dessous */
.ps-e .ps3-journee { display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 260px); grid-template-rows: minmax(0, 1fr) auto; gap: var(--e3) var(--e5); }
.ps-e .ps3-centre { grid-column: 1; grid-row: 1; display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; gap: var(--e1); min-height: 0; }
.ps-e .ps3-tete { display: flex; justify-content: space-between; align-items: center; gap: var(--pas); }
.ps-e .ps3-tete h3 { font-size: var(--titre-3); }
.ps-e .ps3-bascule { display: inline-flex; border: 2px solid var(--jeu-fond); }
.papier.ps-e .ps3-bascule .ps3-b { min-height: 32px; padding: 0 var(--e3); background: var(--jeu-encre); color: var(--jeu-fond); border: 0; box-shadow: none; font-size: var(--texte-petit); }
.papier.ps-e .ps3-bascule .ps3-b[aria-pressed="true"] { background: var(--jeu-fond); color: var(--jeu-encre); font-weight: bold; }
.ps-e .ps3-front { min-height: 0; display: grid; }
.ps-e .ps3-front svg { width: 100%; height: 100%; max-height: 100%; display: block; }
.ps-e .ps3-front .nml { fill: var(--jeu-brume); opacity: .35; }
.ps-e .ps3-front .nml-t { font: 11px var(--jeu-police); fill: #42392e; text-anchor: middle; letter-spacing: .1em; }
.ps-e .ps3-front .sep { stroke: var(--jeu-accent); stroke-dasharray: 3 3; }
.ps-e .ps3-front .sur { fill: none; stroke: var(--jeu-fond); stroke-width: 2.5; }
.ps-e .ps3-front .lettre { font: 22px var(--police-titre); fill: var(--jeu-fond); }
.ps-e .ps3-front .ligne-t { font: 11px var(--jeu-police); fill: #42392e; text-anchor: end; }
.ps-e .ps3-front .tr { fill: none; stroke-width: 4; stroke-linejoin: miter; }
.ps-e .ps3-front .tr.nous { stroke: var(--jeu-nous); } .ps-e .ps3-front .tr.eux { stroke: var(--jeu-eux); }
.ps-e .ps3-front .tr.change { stroke-width: 6; }
.ps-e .ps3-front .tr.perdu { stroke-dasharray: 5 2; }
.ps-e .ps3-front .marque.pris { fill: var(--jeu-nous); stroke: var(--jeu-fond); stroke-width: 1; }
.ps-e .ps3-front .marque.perdu { fill: var(--jeu-fond); }
.ps-e .ps3-front .croix { stroke: var(--jeu-fond); stroke-width: 1.4; }
.ps-e .ps3-front .croix.vieux { stroke-width: 1; opacity: .55; }
.ps-e .ps3-legende { display: flex; flex-wrap: wrap; gap: var(--e1) var(--e4); font-size: var(--texte-petit); color: #42392e; }
.ps-e .ps3-legende span { display: inline-flex; align-items: center; gap: var(--e1); }
.ps-e .ps3-legende .lg { display: inline-block; width: 16px; height: 4px; font-style: normal; line-height: 4px; }
.ps-e .ps3-legende .tr-n { background: var(--jeu-nous); } .ps-e .ps3-legende .tr-e { background: var(--jeu-eux); }
.ps-e .ps3-legende .pris, .ps-e .ps3-legende .perdu, .ps-e .ps3-legende .croix { width: auto; height: auto; line-height: 1; color: var(--jeu-fond); }
.ps-e .ps3-legende .pris { color: var(--jeu-nous); -webkit-text-stroke: .5px var(--jeu-fond); }
.ps-e .ps3-courbe svg { width: 100%; height: auto; max-height: 64px; display: block; }
.ps-e .ps3-registre { display: grid; align-content: start; gap: 0; padding: var(--e3) var(--e4); border: 1px solid var(--jeu-fond); box-shadow: 4px 4px 0 var(--jeu-fond);
  background: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(116, 102, 79, .35) 27px 28px); grid-row: 1 / 2; grid-column: 2; }
.ps-e .ps3-registre h3 { font-size: var(--titre-3); }
.ps-e .ps3-reg-date { color: #42392e; margin-bottom: var(--pas); }
.ps-e .ps3-reg-l { display: grid; grid-template-columns: auto minmax(8px, 1fr) auto; align-items: baseline; gap: var(--e1); min-height: 28px; }
.ps-e .ps3-reg-l i { border-bottom: 1.5px dotted var(--jeu-accent); transform: translateY(-4px); }
.ps-e .ps3-reg-l b { font: 22px var(--police-titre); min-width: 2.5ch; text-align: right; }
.ps-e .ps3-reg-l.discret { color: #42392e; }
.ps-e .ps3-reg-l.total { border-top: 3px double var(--jeu-fond); margin-top: var(--pas); padding-top: var(--e1); font-weight: bold; }
.ps-e .ps3-reg-l.total i { border: 0; }
.ps-e .ps3-reg-l.total b { font-size: 48px; line-height: 1; }
.ps-e .ps3-moments { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--pas); }
.papier.ps-e .ps3-moment { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto auto; gap: 0 var(--pas); align-items: center; text-align: left; min-height: 0; padding: var(--e1) var(--pas);
  background: var(--jeu-encre); color: var(--jeu-fond); border: 1px solid var(--jeu-fond); box-shadow: 3px 3px 0 var(--jeu-fond); }
.papier.ps-e .ps3-moment[aria-pressed="true"] { outline: 2px solid var(--jeu-fond); outline-offset: 2px; background: var(--jeu-brume); }
.ps-e .ps3-moment.medaille { border-width: 2px; }
.ps-e .ps3-m-ic { grid-row: 1 / 4; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--jeu-fond); }
.ps-e .ps3-m-ic svg { width: 20px; height: 20px; }
.ps-e .ps3-moment.pris .ps3-m-ic { color: var(--jeu-nous); }
.ps-e .ps3-m-t { font-size: var(--texte-petit); color: #42392e; text-transform: uppercase; letter-spacing: .06em; }
.ps-e .ps3-moment b, .ps-e .ps3-moment small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-e .ps3-moment small { font-size: var(--texte-petit); }
/* 2 : sept onglets, l'arbre en cercles, le panneau du nœud */
.ps-e .ps3-camp { display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 280px); gap: var(--e5); }
.ps-e .ps3-gauche { grid-template-rows: auto minmax(0, 1fr); }
.ps-e .ps3-tabs { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--e1); }
.papier.ps-e .ps3-tab { position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; min-height: 52px; padding: var(--e1) 2px; background: var(--jeu-brume); color: var(--jeu-fond);
  border: 1px solid var(--jeu-fond); box-shadow: none; font-weight: bold; font-size: var(--texte-petit); line-height: 1.15; }
.ps-e .ps3-tab-t { text-align: center; white-space: normal; text-wrap: balance; hyphens: none; overflow-wrap: normal; }
.papier.ps-e .ps3-tab[aria-selected="true"] { background: var(--jeu-encre); border-width: 2px 2px 0; margin-bottom: -2px; }
.ps-e .ps3-tab .ps-carres { gap: 2px; } .ps-e .ps3-tab .ps-carres i { width: 6px; height: 6px; border-width: 1px; }
.ps-e .ps3-arbre { display: grid; grid-template-columns: 76px 36px minmax(0, 1fr); align-items: center; padding-top: var(--e3); border-top: 2px solid var(--jeu-fond); min-height: 0; }
.ps-e .ps3-fourche { align-self: stretch; position: relative; }
.ps-e .ps3-fourche svg { position: absolute; left: 0; width: 100%; top: 18%; height: 64%; overflow: visible; }
.ps-e .ps3-fourche path, .ps-e .ps3-trait { fill: none; stroke: var(--jeu-accent); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-dasharray: 4 3; }
.ps-e .ps3-fourche path.ok { stroke: var(--jeu-fond); stroke-width: 3; stroke-dasharray: none; }
.ps-e .ps3-pistes { display: grid; gap: var(--e5); }
.ps-e .ps3-piste { display: grid; gap: var(--pas); }
.ps-e .ps3-piste-t { font-weight: bold; font-size: var(--texte-petit); letter-spacing: .12em; text-transform: uppercase; line-height: 1; color: #42392e; }
.ps-e .ps3-rangs { display: grid; grid-template-columns: auto minmax(8px, 1fr) auto minmax(8px, 1fr) auto minmax(8px, 1fr) auto; align-items: start; }
.ps-e .ps3-trait { display: block; height: 0; margin-top: 32px; border-top: 2px dashed var(--jeu-accent); }
.ps-e .ps3-trait.ok { border-top: 3px solid var(--jeu-fond); }
.ps-e .ps3-place { display: grid; justify-items: center; gap: 4px; }
.papier.ps-e .ps3-n { position: relative; width: 64px; height: 64px; min-height: 64px; padding: 0; border-radius: 50%; display: grid; place-items: center;
  background: var(--jeu-encre); color: var(--jeu-fond); border: 2px solid var(--jeu-fond); box-shadow: 3px 3px 0 var(--jeu-fond); }
.ps-e .ps3-rond { display: grid; place-items: center; }
.ps-e .ps3-n .ps3-rond svg { width: 28px; height: 28px; }
.papier.ps-e .ps3-n.acquis { background: var(--jeu-fond); color: var(--jeu-encre); box-shadow: none; outline: 2px solid var(--jeu-fond); outline-offset: 2px; }
.papier.ps-e .ps3-n.soir { background: repeating-linear-gradient(135deg, var(--jeu-brume) 0 5px, var(--jeu-encre) 5px 8px); box-shadow: none; outline: 2px solid var(--jeu-fond); outline-offset: 2px; }
.papier.ps-e .ps3-n.cher { box-shadow: none; }
.papier.ps-e .ps3-n.verrou { box-shadow: none; border: 2px dashed var(--jeu-accent); color: #42392e; }
.ps-e .ps3-n.verrou .ps3-rond { opacity: .55; }
.papier.ps-e .ps3-n[aria-pressed="true"] { outline: 3px solid var(--jeu-fond); outline-offset: 5px; }
.ps-e .ps3-coin { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: var(--jeu-encre); color: var(--jeu-fond); border: 1.5px solid var(--jeu-fond); }
.ps-e .ps3-n.acquis .ps3-coin { background: var(--jeu-encre); }
.ps-e .ps3-place .ps-carres i { width: 7px; height: 7px; border-width: 1.2px; }
.ps-e .ps3-cote { grid-template-rows: auto minmax(0, 1fr); }
.ps-e .ps3-caisse-l { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--pas); }
.ps-e .ps3-caisse-l .ps-jetons { flex-wrap: wrap; max-width: 140px; }
.ps-e .ps3-caisse-l .ps-jetons i { width: 12px; height: 12px; }
.papier.ps-e .ps3-annuler { min-height: var(--jeu-cible); padding: 0 var(--pas); }
.papier.ps-e .ps3-annuler.refus { color: #42392e; border: 1px dashed var(--jeu-accent); box-shadow: none; background: repeating-linear-gradient(135deg, transparent 0 7px, rgba(116, 102, 79, .25) 7px 8px); cursor: not-allowed; }
.ps-e .ps3-noeud { display: flex; flex-direction: column; gap: var(--pas); min-height: 0; }
.ps-e .ps3-noeud .ps-pousse { flex: 1; }
.ps-e .ps3-noeud .ps-nt-ic { border-radius: 50%; }
.ps-e .ps3-noeud .ps-nt-ic svg { width: 28px; height: 28px; }
.ps-e .ps3-chiffre { margin: 0; font: 26px/1.1 var(--police-titre); letter-spacing: .02em; text-wrap: balance; }
.ps-e .ps3-lien { display: flex; align-items: center; gap: var(--e1); padding: var(--e1) var(--pas); border: 1px dashed var(--jeu-fond); font-size: var(--texte-petit); }
.ps-e .ps3-lien.ok { border-style: solid; }
/* 3 : les régiments, leurs paquets d'hommes */
.ps-e .ps3-regiments { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: var(--pas); }
.ps-e .ps3-droite { display: flex; align-items: center; gap: var(--pas); }
.ps-e .ps3-cartes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: var(--pas); min-height: 0; }
.ps-e .ps3-carte { display: grid; grid-template-rows: auto auto auto auto 1fr; gap: 4px; padding: var(--e1) var(--pas); border: 1px solid var(--jeu-fond); min-width: 0; box-sizing: border-box; }
.ps-e .ps3-carte.cible { cursor: copy; }
.ps-e .ps3-carte.survol { outline: 3px dashed var(--jeu-fond); outline-offset: 2px; }
.ps-e .ps3-carte.vide { background: var(--jeu-brume); color: #42392e; border-style: dashed; opacity: .75; }
.ps-e .ps3-c-tete { display: flex; align-items: center; gap: var(--e1); min-width: 0; }
.ps-e .ps3-c-tete > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold; }
.ps-e .ps3-solde { flex: none !important; font-weight: bold; font-size: var(--texte-petit); padding: 0 4px; border: 1px solid currentColor; }
.ps-e .ps3-etat { display: flex; align-items: center; gap: var(--e1); }
.ps-e .ps3-etat b { font-size: var(--titre-3); line-height: 1; }
.ps-e .ps3-etat small { font-size: var(--texte-petit); color: #42392e; min-width: 4ch; }
.ps-e .ps3-paquets { display: flex; flex-wrap: wrap; gap: 3px; min-height: 18px; align-content: start; }
.papier.ps-e .ps3-paquet { min-height: 0; min-width: 0; display: inline-grid; place-items: center; padding: 1px 2px; border: 1px solid transparent; cursor: grab; color: var(--jeu-fond); }
.ps-e .ps3-paquet svg path { stroke: currentColor; stroke-width: 1.5; }
.ps-e .ps3-paquet svg path.lien { stroke-width: 1.2; }
.ps-e .ps3-paquet.bl svg path { stroke-dasharray: 2 1.5; }
.ps-e .ps3-paquet.venu { border: 1px solid var(--jeu-fond); background: var(--jeu-brume); }
.ps-e .ps3-paquet.tenu { outline: 2px solid var(--jeu-fond); background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-e .ps3-paquet:hover, .ps-e .ps3-paquet:focus-visible { border-color: var(--jeu-fond); }
.ps-e .ps3-dissous { margin: 0; align-self: end; font: var(--titre-3) var(--police-titre); letter-spacing: .1em; text-transform: uppercase; }
`;

export function soiree3(stage) { return cadre(stage, etapes3(soireeExemple()), { css: CSS_NUIT + CSS_FIN + CSS_SOIREE2 + CSS_SOIREE3 }); }
