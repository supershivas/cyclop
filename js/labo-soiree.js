// Le sujet « La soirée » du labo (Jérôme, 18 nov. : « à la fin de la journée, c'est le moment des upgrades : le décompte des points gagnés ; améliorer les bâtiments, les avions, chars ou les équipements
// d'un ou plusieurs régiments » ; « un cheminement de fin de journée logique, avec la fenêtre d'upgrade, la fenêtre d'ordre et la fenêtre de stats/historique » ; ROADMAP, « Le soir, le moment des améliorations », lot 0).
// Trois temps, dans l'ordre où l'on pense : ce qui s'est passé (le rapport) → ce que j'ai (l'état-major : le décompte et les achats) → ce que je fais (les ordres de la nuit).
// Trois rangements à trancher : A les onglets, B trois colonnes côte à côte, C un défilé guidé avec retour libre. Les morceaux sont ceux du jeu (`hud/papier-nuit.js`), les données celles des papiers
// de la nuit et de la fin (`nuitExemple`, `finExemple` de labo-papiers.js, la bataille coupée au soir du 6e jour), les bâtiments et l'équipement ceux de `data/batiments.js`. Sous chaque cadre, la mesure
// de CHAQUE vue (un onglet, une étape) aux quatre tailles d'écran : la règle de la v0.134.0, aucun défilement dès 1280 × 800.
import { BATIMENTS, DOTATION, EQUIPEMENT, EQUIPEMENTS } from './data/batiments.js?v=0.150.0';
import { el, html, info, bouton, ordres, tuilesJour, reste, medailles, puceReleve, graphe, frise, corvee, etat } from './hud/papier-nuit.js?v=0.150.0';
import { iconeCorvee } from './hud/icones-nuit.js?v=0.150.0';
import { nuitExemple, finExemple, cadre, CSS_NUIT, CSS_FIN } from './labo-papiers.js?v=0.150.0';

const pts = n => `${n} pt${n > 1 ? 's' : ''}`;

// ─── Les données : un 6e soir de « Grande offensive » ────────────────────
export function soireeExemple() {
  const N = nuitExemple(), J = N.d.jour, F0 = finExemple();
  // la bataille jusqu'à ce soir : les jours passés seulement, sur l'axe de toute la bataille
  const F = { ...F0, moments: F0.moments.slice(0, J).map(m => ({ ...m, pire: false })), tenus: F0.tenus.slice(0, J),
    camps: F0.camps.map(c => ({ ...c, mortsParJour: c.mortsParJour.slice(0, J), effectifParJour: c.effectifParJour.slice(0, J) })) };
  const m = F.camps[0].mortsParJour; F.pire = m.indexOf(Math.max(...m)) + 1; F.moments[F.pire - 1].pire = true;
  N.sortes = N.sortes.filter(c => !c.equipe);      // l'équipement quitte les corvées : il s'achète à l'état-major
  const equip = [['casque'], [], ['casque', 'grenades'], [], ['brancards'], [], [], ['hotchkiss']];
  const regs = N.regs.map((r, k) => ({ ...r, equip: equip[k] ?? [], choisiEq: k === 3 || k === 6 }));
  N.regs = regs;
  // le camp : les niveaux, ce que la caisse avait hier, le décompte de ce soir, le panier
  const niveaux = { artillerie: [2, [0]], aerodrome: [1, []], chars: [2, [1]], sapeurs: [1, []], caserne: [2, [0]], hopital: [1, []] };
  const soir = [['Le jour tenu', DOTATION.soir], ['Nos lignes tenues à 75 %', DOTATION.tenue.points], ['Leur 2e ligne prise (la première fois)', DOTATION.ligne]];
  const camp = {
    hier: 3, soir, gagne: soir.reduce((t, [, n]) => t + n, 0),
    batiments: Object.fromEntries(Object.entries(niveaux).map(([k, [n, choix]]) => [k, { niveau: n, choix }])),
    panier: [{ cle: 'sapeurs', vers: 2, choix: 1 }, { eq: 'casque', regs: [3, 6] }],
    avions: [100, 62, 0], chars: { parc: 2, champ: [[88, 'déployé'], [0, 'détruit']] },
  };
  camp.caisse = camp.hier + camp.gagne;
  camp.engage = camp.panier.reduce((t, a) => t + (a.cle ? BATIMENTS[a.cle].niveaux[a.vers - 1].cout : EQUIPEMENT.cout * a.regs.length), 0);
  camp.libre = camp.caisse - camp.engage;
  return { N, F, camp, titre: `Le soir du ${J}e jour`, sansOrdre: 2 };
}

// ─── Les morceaux ────────────────────────────────────────────────────────
// l'en-tête commun : le titre, les points qui restent (le décompte au survol), « À l'aube » toujours là
function enTete(S, { centre = null } = {}) {
  const K = S.camp;
  const puce = info(html('span', 'pn-puce ps-caisse', `<b>${K.libre}</b><span>${K.libre > 1 ? 'points à dépenser' : 'point à dépenser'}</span>`),
    `# La caisse de l'état-major\n${K.hier} gardés d'hier, **+${K.gagne}** ce soir, ${K.engage} commandés : **${K.libre}** à dépenser.\nLes commandes sont payées à l'aube ; ce qui n'est pas dépensé se garde.`);
  return el('header', 'pn-tete', el('h2', '', S.titre), centre, el('div', 'pn-pied', puce), info(bouton('bouton pn-aube', 'À l\'aube'), '# À l\'aube\nLa nuit s\'achève : les ordres s\'exécutent, les commandes sont payées, les chantiers s\'ouvrent.'));
}
// 1. le rapport : la journée en tuiles, le ciel, les médailles, puis la bataille jusqu'à ce soir (les graphiques de la fin de partie : la fin devient le dernier rapport)
function rapport(S, { serre = false } = {}) {
  const { N, F } = S, T = tuilesJour(N, { faits: serre ? 2 : 3 });
  const jour = el('div', 'ps-col', el('h3', '', 'La journée'), el('div', 'pn-tuiles', T.morts, T.eff), T.lig, T.fts, el('div', 'pn-reste', reste(N)));
  const bataille = el('div', 'ps-col', el('h3', '', 'La bataille jusqu\'à ce soir'), html('div', 'ps-graphe', graphe(F, { larg: serre ? 300 : 520, haut: serre ? 110 : 170 })), frise(F),
    el('h4', 'pn-sous', 'Médailles du jour'), el('div', 'pn-meds-l', medailles(N.med, serre ? { seules: true } : { plat: true })));
  return el('section', `ps-panneau ps-rapport${serre ? ' serre' : ''}`, jour, bataille);
}
// 2. l'état-major : le décompte du soir, puis le camp en tuiles (le palier suivant et son prix, ses deux choix), les engins sous leur bâtiment, l'équipement des régiments ; le panier
function etatMajor(S, { serre = false } = {}) {
  const K = S.camp;
  const decompte = el('div', 'ps-decompte', el('h3', '', 'Le décompte du soir'),
    el('ul', 'ps-lignes', el('li', 'discret', el('span', '', 'Gardés d\'hier'), el('b', '', String(K.hier))),
      ...K.soir.map(([nom, n]) => el('li', '', el('span', '', nom), el('b', '', `+${n}`))),
      el('li', 'ps-total', el('span', '', 'En caisse'), el('b', '', String(K.caisse))),
      el('li', 'discret', el('span', '', 'Commandé ce soir'), el('b', '', `−${K.engage}`)),
      el('li', 'ps-total', el('span', '', 'À dépenser'), el('b', '', String(K.libre)))));
  const tuiles = el('div', 'ps-camp');
  for (const [cle, B] of Object.entries(BATIMENTS)) {
    const c = K.batiments[cle], cmd = K.panier.find(a => a.cle === cle), vers = c.niveau + 1, P = B.niveaux[vers - 1];
    const crans = html('span', 'ps-crans', [1, 2, 3].map(n => `<i class="${n <= c.niveau ? 'plein' : cmd && n === vers ? 'cmd' : ''}"></i>`).join(''));
    const t = el('section', `tuile pn-t ps-bat${cmd ? ' commande' : ''}`, el('h4', '', B.court, crans));
    t.dataset.info = `# ${B.nom}\n## Niveau ${c.niveau} : ${B.niveaux[c.niveau - 1].nom}\n${B.niveaux[c.niveau - 1].effet}`;
    if (cle === 'aerodrome') t.append(el('div', 'ps-engins', ...K.avions.map((v, k) => info(el('span', `ps-engin${v ? '' : ' perdu'}`, html('i', '', `<b style="width:${v}%"></b>`)), `# Avion ${k + 1}\n${v ? `Cellule ${v} %` : 'Abattu : il ne reviendra pas.'}`))));
    if (cle === 'chars') t.append(el('div', 'ps-engins', ...K.chars.champ.map(([v, e], k) => info(el('span', `ps-engin${v ? '' : ' perdu'}`, html('i', '', `<b style="width:${v}%"></b>`)), `# Char ${k + 1}\n${e}${v ? `, coque ${v} %` : ''}`)), el('span', 'discret', `+${K.chars.parc} au parc`)));
    if (cmd) t.append(info(bouton('ps-choix choisi', el('span', '', `${P.choix ? P.choix[cmd.choix][0] : P.nom}`), el('b', '', '✓ commandé')), `# Commandé ce soir\n${P.nom}${P.choix ? ` : ${P.choix[cmd.choix][0].toLowerCase()}` : ''}, ${pts(P.cout)}, payés à l'aube. Un clic annule.`));
    else if (!P) t.append(el('p', 'discret', 'Niveau maximal.'));
    else {
      const opts = P.choix ? P.choix.map(([nom, effet]) => [nom, effet]) : [[P.nom, P.effet]];
      for (const [nom, effet] of serre ? opts.slice(0, 2) : opts) {
        const refus = P.cout > K.libre ? `Il manque ${P.cout - K.libre} point${P.cout - K.libre > 1 ? 's' : ''}.` : '';
        const b = info(bouton(`ps-choix${refus ? ' refus' : ''}`, el('span', '', nom), el('b', '', pts(P.cout))), `# ${nom}\n## ${P.nom} · niveau ${vers} · ${pts(P.cout)}\n${effet}${refus ? `\n**${refus}**` : ''}`);
        b.setAttribute('aria-disabled', refus ? 'true' : 'false'); t.append(b);
      }
    }
    tuiles.append(t);
  }
  // l'équipement : choisir des régiments (comme « Tous »), puis la pièce ; deux emplacements chacun
  const eq = K.panier.find(a => a.eq);
  const regs = el('div', 'ps-regs', ...S.N.regs.map(r => info(bouton(`ps-reg${r.choisiEq ? ' choisi' : ''}`, el('b', '', String(r.id + 1)),
    html('span', 'ps-places', [0, 1].map(k => r.equip[k] ? `<i class="plein" title="${EQUIPEMENTS[r.equip[k]].court}">${EQUIPEMENTS[r.equip[k]].court[0]}</i>` : eq?.regs.includes(r.id) && k === r.equip.length ? `<i class="cmd">${EQUIPEMENTS[eq.eq].court[0]}</i>` : '<i></i>').join(''))),
    `# ${r.nom}\n${r.equip.length ? `Porte : ${r.equip.map(k => EQUIPEMENTS[k].court.toLowerCase()).join(', ')}.` : 'Ne porte rien.'}${eq?.regs.includes(r.id) ? `\n**Commandé ce soir : ${EQUIPEMENTS[eq.eq].court.toLowerCase()}.**` : ''}\nUn clic le choisit ; Maj en ajoute.`)));
  const pieces = el('div', 'ps-pieces', ...Object.entries(EQUIPEMENTS).map(([k, E]) => info(bouton(`ps-choix ps-piece${eq?.eq === k ? ' choisi' : ''}`, el('span', '', E.court), el('b', '', `${pts(EQUIPEMENT.cout)} / rég.`)), `# ${E.nom}\n${E.effet}\nPour chaque régiment choisi : ${pts(EQUIPEMENT.cout)}, deux pièces au plus.`)));
  const equipement = el('section', 'tuile pn-t ps-equip', el('h4', '', 'Équiper les régiments', el('span', 'discret', ' · caserne niveau 2')), regs, pieces);
  return el('section', `ps-panneau ps-etatmajor${serre ? ' serre' : ''}`, decompte, el('div', 'ps-col', tuiles, equipement));
}
// 3. les ordres de la nuit : les corvées par régiment (le papier de la nuit, sans l'équipement), la relève, « Gérer les régiments »
// (« À retenir » n'y est plus : il est au rapport ; `sansPied` : la relève et « Gérer les régiments » vont ailleurs, dans la rangée du bas du défilé)
const piedOrdres = S => el('div', 'pn-pied ps-pied-ordres', puceReleve(S.N.reserve), info(bouton('bouton pn-gerer', 'Gérer les régiments'), '# Gérer les régiments\nFusionner deux régiments ou passer des soldats de l\'un à l\'autre.'));
function ordresNuit(S, { serre = false, sansPied = false } = {}) {
  return el('section', `ps-panneau ps-ordres${serre ? ' serre' : ''}`, sansPied ? null : piedOrdres(S), ordres(S.N, serre ? { larg: 64 } : {}));
}
const TEMPS = [['rapport', 'Le rapport', 'Ce qui s\'est passé', rapport], ['etatmajor', 'L\'état-major', 'Ce que j\'ai', etatMajor], ['ordres', 'Les ordres', 'Ce que je fais', ordresNuit]];
// la pastille d'un temps : des points attendent (2), un régiment sans ordre nouveau (3)
const pastille = (S, k) => k === 1 && S.camp.libre ? info(el('span', 'ps-pastille', String(S.camp.libre)), `# ${S.camp.libre} points attendent`) : k === 2 && S.sansOrdre ? info(el('span', 'ps-pastille', String(S.sansOrdre)), `# ${S.sansOrdre} régiments sans ordre nouveau\nIls gardent celui d'hier.`) : null;

// ─── D : les trois étapes (Jérôme, 18 nov., après le lot 0 : « chaque fenêtre trop compliquée, les CTA peu clairs ; trois étapes mieux hiérarchisées, ne pas répéter les informations ») ───
// Le cadre : le fil d'Ariane en tête (retour libre), en bas « ← Retour » et UN bouton principal qui dit où il mène. Chaque information n'est montrée qu'à une étape : les points, au camp seulement.
const ETAPES = [['La journée', 'Améliorer le camp →'], ['Le camp', 'Les régiments →'], ['Les régiments', 'À l\'aube']];
const ONGLETS = [...Object.keys(BATIMENTS), 'equipement'];
const NOMS_CHIFFRES = { dispersion: 'Dispersion', recharge: 'Recharge', salve220: 'Salve du 220', recharge220: 'Recharge du 220', longueur: 'Longueur de passe', pv: 'Points de vie', letal: 'Touche', franchit: 'Franchissement',
  canon: 'Recharge du canon', vitesse: 'Vitesse', travail: 'Durée du travail', hommes: 'Hommes par section', retour: 'Retour des blessés', vivres: 'Vivres', mort: 'Mort des blessés', reserves: 'Régiments en réserve' };
// l'avant → après d'un effet : « Recharge 100 % → 85 % » ; « Régiments en réserve +1 »
const avantApres = effets => Object.entries(effets ?? {}).map(([k, f]) => { const nom = NOMS_CHIFFRES[k.replace(/^\+/, '').split('.').pop()] ?? k; return k.startsWith('+') ? `${nom} : +${f}` : `${nom} : 100 % → ${Math.round(f * 100)} %`; });
const coutDe = a => a.cle ? BATIMENTS[a.cle].niveaux[a.vers - 1].cout : EQUIPEMENT.cout * a.regs.length;
const libre = K => K.caisse - K.panier.reduce((t, a) => t + coutDe(a), 0);

// l'état d'un nœud de l'arbre : rang (1 à 3), option (0, 1, ou null au rang 1)
function noeud(K, cle, rang, opt) {
  const c = K.batiments[cle], P = BATIMENTS[cle].niveaux[rang - 1], cmd = K.panier.find(a => a.cle === cle);
  if (rang <= c.niveau) return rang === 1 || c.choix[rang - 2] === opt ? 'acquis' : 'ecarte';
  if (cmd && cmd.vers === rang) return cmd.choix === opt || !P.choix ? 'commande' : 'ecarte';
  if (rang > c.niveau + 1 || cmd) return 'verrou';
  return P.cout > libre(K) ? 'cher' : 'dispo';
}
const MOTS_NOEUD = { acquis: 'Acquis', ecarte: 'Non choisi', commande: 'Commandé ce soir', verrou: 'Verrouillé', cher: 'Trop cher', dispo: 'Disponible' };

export function etapes(S) {
  const K = S.camp, N = S.N;
  K.panier = K.panier.filter(a => a.cle);       // (l'exemple part d'un panier de bâtiments seulement)
  const V = { etape: 0, onglet: 'artillerie', noeud: [2, 0], histo: false, piece: 'casque', regs: new Set([3, 6]), source: null, depot: null };
  S.transferts = [{ de: 0, vers: 6, n: 10 }];
  const p = el('section', 'papier pn ps ps-d'), corps = el('div', 'ps-corps'), bas = el('footer', 'ps-bas'), fil = el('nav', 'ps-fil');
  const tete = el('header', 'pn-tete', el('h2', '', S.titre), fil);
  p.append(tete, corps, bas);
  const aller = k => { V.etape = k; V.histo = false; rendre(); };
  function rendre() {
    fil.replaceChildren(...ETAPES.map(([nom], k) => { const b = bouton(`ps-etape${k < V.etape ? ' vu' : ''}`, el('kbd', '', String(k + 1)), el('span', '', nom)); b.setAttribute('aria-current', String(k === V.etape)); b.onclick = () => aller(k); return b; }));
    corps.replaceChildren([journee, camp, regiments][V.etape]());
    const retour = V.etape ? bouton('bouton ps-retour', `← ${ETAPES[V.etape - 1][0]}`) : el('span');
    if (V.etape) retour.onclick = () => aller(V.etape - 1);
    const suite = bouton('bouton pn-aube ps-cta', ETAPES[V.etape][1]); suite.onclick = () => V.etape < 2 && aller(V.etape + 1);
    bas.replaceChildren(retour, suite);
  }
  // 1. la journée : le décompte en grand ; trois chiffres ; « À retenir » ; l'historique derrière un lien
  function journee() {
    const [n, e] = N.d.camps, [pris, perdus] = N.d.prises ?? [0, 1], T = tuilesJour(N, { faits: 3 });
    const lignes = el('ol', 'ps-dec', el('li', 'discret', el('span', '', 'Gardés d\'hier'), el('b', '', String(K.hier))),
      ...K.soir.map(([nom, v], k) => { const li = el('li', '', el('span', '', nom), el('b', '', `+${v}`)); li.style.setProperty('--k', k + 1); return li; }));
    const total = el('div', 'ps-dec-total', el('b', '', String(K.caisse)), el('span', '', 'points à dépenser au camp')); total.style.setProperty('--k', K.soir.length + 1);
    const chiffre = (v, nom, cls) => el('div', `ps-chiffre ${cls}`, el('b', '', String(v)), el('span', '', nom));
    const lien = bouton('ps-lien', 'La bataille jusqu\'ici →'); lien.onclick = () => { V.histo = true; rendre(); };
    const page = el('section', 'ps-panneau ps-journee', el('div', 'ps-dec-col', el('h3', '', 'Ce soir, l\'état-major vous donne'), lignes, total),
      el('div', 'ps-col', el('div', 'ps-chiffres', chiffre(n.mortsJour, 'morts chez nous', 'bi-t-nous'), chiffre(e.mortsJour, 'morts en face', 'bi-t-eux'), chiffre(`${pris - perdus >= 0 ? '+' : ''}${pris - perdus}`, 'tronçons', '')), T.fts, lien));
    if (!V.histo) return page;
    const fermer = bouton('bouton', 'Fermer'); fermer.onclick = () => { V.histo = false; rendre(); };
    return el('section', 'ps-panneau ps-histo', el('div', 'ps-histo-tete', el('h3', '', 'La bataille jusqu\'ici'), fermer),
      el('div', 'ps-histo-corps', el('div', 'ps-col', html('div', 'ps-graphe', graphe(S.F, { larg: 520, haut: 160 })), frise(S.F)), el('div', 'ps-col', el('h4', 'pn-sous', 'Médailles du jour'), el('div', 'pn-meds-l', medailles(N.med, { plat: true })))));
  }
  // 2. le camp : sept onglets, l'arbre au centre, le panneau du nœud choisi à droite (le seul bouton d'achat) ; les points, ici seulement
  function camp() {
    const onglets = el('nav', 'ps-tabs', ...ONGLETS.map(cle => {
      const B = BATIMENTS[cle], c = K.batiments[cle];
      const achat = B ? [1, 2, 3].some(r => [0, 1, null].some(o => noeud(K, cle, r, o) === 'dispo')) : libre(K) >= EQUIPEMENT.cout;
      const b = bouton('ps-tab', el('span', '', B ? B.court : 'Équipement'), B ? html('span', 'ps-crans', [1, 2, 3].map(n => `<i class="${n <= c.niveau ? 'plein' : K.panier.some(a => a.cle === cle && a.vers === n) ? 'cmd' : ''}"></i>`).join('')) : null, achat ? el('i', 'ps-point') : null);
      b.setAttribute('aria-selected', String(V.onglet === cle)); b.onclick = () => { V.onglet = cle; V.noeud = cle === 'equipement' ? null : [Math.min(3, c.niveau + 1), 0]; rendre(); };
      return b;
    }));
    const caisse = el('div', 'ps-caisse', el('b', '', String(libre(K))), el('span', '', libre(K) > 1 ? 'points à dépenser' : 'point à dépenser'), K.panier.length ? el('span', 'discret', ` · ${K.panier.length} commande${K.panier.length > 1 ? 's' : ''} payée${K.panier.length > 1 ? 's' : ''} à l'aube`) : null);
    return el('section', 'ps-panneau ps-camp2', el('div', 'ps-camp-tete', onglets, caisse), ...(V.onglet === 'equipement' ? equipement() : arbre(V.onglet)));
  }
  function arbre(cle) {
    const B = BATIMENTS[cle], rangs = el('div', 'ps-arbre');
    B.niveaux.forEach((P, k) => {
      const rang = k + 1, opts = P.choix ? P.choix.map(([nom], i) => [nom, i]) : [[P.nom, null]];
      rangs.append(el('div', 'ps-rang', el('span', 'ps-rang-n', `Niv. ${rang}`, el('small', '', P.cout ? pts(P.cout) : 'donné')),
        ...opts.map(([nom, o]) => { const st = noeud(K, cle, rang, o), b = bouton(`ps-noeud ${st}`, el('b', '', nom), el('small', '', MOTS_NOEUD[st]));
          b.setAttribute('aria-pressed', String(V.noeud?.[0] === rang && V.noeud?.[1] === (o ?? 0))); b.onclick = () => { V.noeud = [rang, o ?? 0]; rendre(); }; return b; })));
    });
    const [rang, o] = V.noeud, P = B.niveaux[rang - 1], st = noeud(K, cle, rang, P.choix ? o : null), [nom, effet, effets] = P.choix ? P.choix[o] : [P.nom, P.effet, P.effets];
    const panneau = el('aside', 'ps-noeud-panneau', el('small', 'discret', `${B.nom} · niveau ${rang} · ${P.nom}`), el('h3', '', nom), el('p', '', effet),
      el('ul', 'ps-effets', ...avantApres({ ...(P.effets ?? {}), ...(P.choix ? effets : {}) }).map(t => el('li', '', t))));
    let cta;
    if (st === 'dispo') { cta = bouton('bouton pn-aube ps-acheter', `Commander · ${pts(P.cout)}`); cta.onclick = () => { K.panier.push({ cle, vers: rang, choix: P.choix ? o : null }); rendre(); }; }
    else if (st === 'commande') { cta = bouton('bouton ps-acheter', `Annuler la commande · ${pts(P.cout)}`); cta.onclick = () => { K.panier = K.panier.filter(a => a.cle !== cle); rendre(); }; }
    else cta = el('p', 'ps-raison', st === 'cher' ? `Il manque ${P.cout - libre(K)} point${P.cout - libre(K) > 1 ? 's' : ''}.` : st === 'verrou' ? (K.panier.some(a => a.cle === cle) ? 'Un palier par soir : celui d\'avant est commandé.' : 'Il faut d\'abord le niveau d\'avant.') : st === 'ecarte' ? 'L\'autre choix a été pris à ce palier.' : 'Déjà acquis.');
    panneau.append(cta, el('p', 'discret ps-note', 'Payé à l\'aube ; le chantier s\'achève au matin (le niveau 3 en deux nuits).'));
    const engins = cle === 'aerodrome' ? el('div', 'ps-engins', el('span', 'discret', 'Avions'), ...K.avions.map((v, k) => info(el('span', `ps-engin${v ? '' : ' perdu'}`, html('i', '', `<b style="width:${v}%"></b>`)), `# Avion ${k + 1}\n${v ? `Cellule ${v} %` : 'Abattu.'}`)))
      : cle === 'chars' ? el('div', 'ps-engins', el('span', 'discret', 'Chars'), ...K.chars.champ.map(([v, e], k) => info(el('span', `ps-engin${v ? '' : ' perdu'}`, html('i', '', `<b style="width:${v}%"></b>`)), `# Char ${k + 1}\n${e}`)), el('span', 'discret', `+${K.chars.parc} au parc`)) : null;
    return [el('div', 'ps-col', rangs, engins), panneau];
  }
  function equipement() {
    const pieces = el('div', 'ps-arbre ps-pieces2', ...Object.entries(EQUIPEMENTS).map(([k, E]) => { const b = bouton('ps-noeud dispo', el('b', '', E.court), el('small', '', `${pts(EQUIPEMENT.cout)} par régiment`)); b.setAttribute('aria-pressed', String(V.piece === k)); b.onclick = () => { V.piece = k; rendre(); }; return b; }));
    const regs = el('div', 'ps-regs2', ...N.regs.map(r => {
      const plein = r.equip.length >= EQUIPEMENT.places || r.equip.includes(V.piece), b = bouton(`ps-reg${V.regs.has(r.id) ? ' choisi' : ''}${plein ? ' refus' : ''}`, el('b', '', `${r.id + 1} ${r.nom}`),
        html('span', 'ps-places', [0, 1].map(k => r.equip[k] ? `<i class="plein">${EQUIPEMENTS[r.equip[k]].court[0]}</i>` : '<i></i>').join('')));
      if (plein) b.setAttribute('aria-disabled', 'true'); else b.onclick = () => { V.regs.has(r.id) ? V.regs.delete(r.id) : V.regs.add(r.id); rendre(); };
      return info(b, `# ${r.nom}\n${r.equip.length ? `Porte : ${r.equip.map(k => EQUIPEMENTS[k].court.toLowerCase()).join(', ')}.` : 'Ne porte rien.'}${plein ? `\n**${r.equip.includes(V.piece) ? 'Il l\'a déjà.' : 'Ses deux places sont prises.'}**` : ''}`);
    }));
    const E = EQUIPEMENTS[V.piece], n = V.regs.size, cout = n * EQUIPEMENT.cout;
    const cta = n && cout <= libre(K) ? bouton('bouton pn-aube ps-acheter', `Équiper ${n} régiment${n > 1 ? 's' : ''} · ${pts(cout)}`) : el('p', 'ps-raison', n ? `Il manque ${cout - libre(K)} point${cout - libre(K) > 1 ? 's' : ''}.` : 'Choisissez un ou plusieurs régiments.');
    if (cta.tagName === 'BUTTON') cta.onclick = () => { for (const id of V.regs) N.regs[id].equip.push(V.piece); K.caisse -= cout; V.regs.clear(); rendre(); };
    return [el('div', 'ps-col', el('h4', 'pn-sous', '1. La pièce'), pieces, el('h4', 'pn-sous', '2. Les régiments (deux pièces chacun)'), regs),
      el('aside', 'ps-noeud-panneau', el('small', 'discret', 'Caserne niveau 2 · équipement'), el('h3', '', E.nom), el('p', '', E.effet), cta, el('p', 'discret ps-note', 'La pièce arrive à l\'aube ; elle meurt avec le régiment.'))];
  }
  // 3. les régiments : une carte chacun, sa corvée en une ligne d'icônes ; glisser une carte sur une autre transfère ou fusionne (plus de fenêtre « Gérer les régiments »)
  function regiments() {
    const sortes = N.sortes, tous = el('div', 'ps-tous', el('span', '', 'Tous les régiments :'), ...sortes.map(c => corvee(c, false, '')));
    const grille = el('div', 'ps-cartes');
    for (const r of N.regs) {
      const sort = S.transferts.filter(t => t.de === r.id), entre = S.transferts.filter(t => t.vers === r.id);
      const carte = el('article', `ps-carte${V.source === r.id ? ' source' : ''}${V.depot === r.id ? ' depot' : ''}`);
      carte.draggable = true;
      carte.ondragstart = ev => { V.source = r.id; ev.dataTransfer.setData('text/plain', String(r.id)); };
      carte.ondragover = ev => { if (V.source !== null && V.source !== r.id) ev.preventDefault(); };
      carte.ondrop = ev => { ev.preventDefault(); if (V.source !== null && V.source !== r.id) { V.depot = r.id; rendre(); } };
      const poignee = info(bouton('ps-poignee', '⇄'), `# Transférer des hommes\nGlissez la carte de ${r.nom} sur une autre (ou un clic ici, puis un clic sur l'autre carte) : 1, 10, tous, ou fusionner.`);
      poignee.onclick = ev => { ev.stopPropagation(); V.source = V.source === r.id ? null : r.id; V.depot = null; rendre(); };
      carte.onclick = () => { if (V.source !== null && V.source !== r.id) { V.depot = r.id; rendre(); } };
      carte.append(el('header', 'ps-carte-tete', el('b', '', String(r.id + 1)), el('span', '', r.nom), poignee), etat(r, { larg: 96 }),
        r.corvee === 'contact' ? el('p', 'ps-contact discret', 'Au contact : il se bat toute la nuit') : el('div', 'ps-corvees', ...sortes.map(c => corvee(c, r.corvee === c.id, r.refus[c.id], r.donne, r.id))),
        ...sort.map((t, k) => { const a = bouton('ps-transfert', `−${t.n} → ${N.regs[t.vers].nom} · annuler`); a.onclick = ev => { ev.stopPropagation(); S.transferts.splice(S.transferts.indexOf(t), 1); rendre(); }; return a; }),
        ...entre.map(t => el('p', 'ps-transfert discret', `+${t.n} de ${N.regs[t.de].nom}`)));
      if (V.depot === r.id) {
        const src = N.regs[V.source], choix = [[1, '1'], [10, '10'], [src.debout, `Tous (${src.debout})`]].map(([n, t]) => { const b = bouton('bouton', t); b.onclick = ev => { ev.stopPropagation(); S.transferts.push({ de: V.source, vers: r.id, n }); V.source = V.depot = null; rendre(); }; return b; });
        const fus = bouton('bouton', 'Fusionner'); fus.onclick = ev => { ev.stopPropagation(); S.transferts.push({ de: V.source, vers: r.id, n: src.debout }); V.source = V.depot = null; rendre(); };
        const non = bouton('bouton', '×'); non.setAttribute('aria-label', 'Annuler'); non.onclick = ev => { ev.stopPropagation(); V.source = V.depot = null; rendre(); };
        carte.append(el('div', 'ps-depot', el('small', '', `De ${src.nom} vers ${r.nom} :`), el('div', 'ps-depot-b', ...choix, fus, non)));
      }
      grille.append(carte);
    }
    const releve = puceReleve(N.reserve);
    return el('section', 'ps-panneau ps-regiments', el('div', 'ps-regs-tete', tous, releve), grille);
  }
  p.vues = [['La journée', () => aller(0)], ['La journée, la bataille jusqu\'ici', () => { V.etape = 0; V.histo = true; rendre(); }], ['Le camp, Canons', () => { V.etape = 1; V.onglet = 'artillerie'; V.noeud = [2, 0]; rendre(); }],
    ['Le camp, Équipement', () => { V.etape = 1; V.onglet = 'equipement'; rendre(); }], ['Les régiments', () => aller(2)], ['Les régiments, un dépôt', () => { V.etape = 2; V.source = 0; V.depot = 6; rendre(); }]].map(([nom, f]) => ({ nom, f }));
  rendre();
  return p;
}

// ─── Les trois rangements ────────────────────────────────────────────────
export const SOIREES = {
  etapes,
  // A : les onglets. Trois onglets numérotés (1, 2, 3 ou Tab) ; on ouvre au rapport ; un seul temps à la fois, toute la place pour lui.
  onglets(S) {
    const panneaux = TEMPS.map(([, , , f]) => f(S)), barre = el('nav', 'ps-onglets');
    const montrer = k => { panneaux.forEach((p, i) => { p.hidden = i !== k; }); barre.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-selected', String(i === k))); };
    TEMPS.forEach(([, nom, sous], k) => { const b = bouton('ps-onglet', el('kbd', '', String(k + 1)), el('span', '', el('b', '', nom), el('small', '', sous)), pastille(S, k)); b.setAttribute('role', 'tab'); b.onclick = () => montrer(k); barre.append(b); });
    const p = el('section', 'papier pn ps ps-a', enTete(S, { centre: barre }), ...panneaux);
    p.vues = TEMPS.map(([, nom], k) => ({ nom, f: () => montrer(k) }));
    montrer(0);
    return p;
  },
  // B : trois colonnes côte à côte. Tout se voit d'un coup, de gauche à droite ; chaque temps est resserré (moins de médailles, des graphiques plus petits).
  colonnes(S) {
    return el('section', 'papier pn ps ps-b', enTete(S),
      ...TEMPS.map(([, nom, sous, f], k) => el('div', 'ps-colonne', el('h3', 'ps-titre', el('kbd', '', String(k + 1)), nom, el('small', '', ` · ${sous}`), pastille(S, k)), f(S, { serre: true }))));
  },
  // C : le défilé guidé. Un temps à la fois, dans l'ordre, avec « Suivant » en bas ; le fil d'Ariane en tête ramène à n'importe quel temps (le retour est libre) ; au dernier, « À l'aube ».
  defile(S) {
    const panneaux = TEMPS.map(([, , , f], k) => f(S, { sansPied: k === 2 })), fil = el('nav', 'ps-fil'), suite = el('div', 'ps-suite'), pied = piedOrdres(S);
    const montrer = k => {
      panneaux.forEach((p, i) => { p.hidden = i !== k; });
      fil.querySelectorAll('button').forEach((b, i) => { b.setAttribute('aria-current', String(i === k)); b.classList.toggle('vu', i < k); });
      suite.replaceChildren(k > 0 ? bouton('bouton ps-avant', `← ${TEMPS[k - 1][1]}`) : el('span'), k === 2 ? pied : el('span'), k < 2 ? bouton('bouton pn-aube ps-apres', `Suivant : ${TEMPS[k + 1][1]} →`) : bouton('bouton pn-aube ps-apres', 'À l\'aube'));
      suite.firstChild.onclick = () => montrer(k - 1); suite.lastChild.onclick = () => k < 2 && montrer(k + 1);
    };
    TEMPS.forEach(([, nom], k) => { const b = bouton('ps-etape', el('kbd', '', String(k + 1)), el('span', '', nom), pastille(S, k)); b.onclick = () => montrer(k); fil.append(b); });
    const p = el('section', 'papier pn ps ps-c', enTete(S, { centre: fil }), ...panneaux, suite);
    p.vues = TEMPS.map(([, nom], k) => ({ nom, f: () => montrer(k) }));
    montrer(0);
    return p;
  },
};

// ─── Les feuilles (ce qui passera dans css/style.css) ────────────────────
export const CSS_SOIREE = `
.ps { grid-template-columns: minmax(0, 1fr); grid-template-areas: none; }
.ps > * { grid-area: auto; min-width: 0; }
.ps .pn-tete { gap: var(--e4); }
.ps .pn-tete h2 { flex: 0 1 auto; white-space: nowrap; }
.ps .pn-tete > nav { flex: 1 1 auto; }
.ps-caisse b { font-size: var(--texte-moyen); }
.ps-panneau[hidden] { display: none !important; }
.ps-panneau { display: grid; gap: var(--e3) var(--e5); min-width: 0; align-content: start; }
.ps-col { display: grid; gap: var(--pas); align-content: start; min-width: 0; }
.ps h3 { margin: 0; }
.ps kbd { font: inherit; font-size: var(--texte-petit); border: 1px solid currentColor; padding: 0 4px; }
/* les onglets et le fil */
.ps-onglets, .ps-fil { display: flex; gap: var(--e1); justify-content: center; }
.ps-onglet, .ps-etape { display: flex; align-items: center; gap: var(--e1); min-height: var(--jeu-cible); padding: 0 var(--e3); background: transparent; color: var(--jeu-fond); border: 1px solid var(--jeu-accent); text-align: left; position: relative; }
.ps-onglet span { display: grid; line-height: 1.1; }
.ps-onglet small { font-size: var(--texte-petit); color: var(--jeu-accent); }
.ps-onglet[aria-selected="true"], .ps-etape[aria-current="true"] { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-onglet[aria-selected="true"] small { color: var(--jeu-encre); }
.ps-etape.vu { border-style: dotted; }
.ps-etape + .ps-etape::before { content: '→'; position: absolute; left: calc(-1 * var(--e1) - 0.6em); color: var(--jeu-accent); }
.ps-fil { gap: var(--e4); }
.ps-pastille { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 3px; box-sizing: border-box; background: var(--jeu-nous); color: var(--jeu-fond); border: 1px solid var(--jeu-fond); font-size: 11px; font-weight: bold; }
.ps-suite { display: flex; justify-content: space-between; }
.ps-suite .bouton { min-height: var(--jeu-cible); }
/* 1. le rapport */
.ps-rapport { grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); }
.ps-graphe svg { width: 100%; height: auto; display: block; }
/* 2. l'état-major */
.ps-etatmajor { grid-template-columns: minmax(200px, 0.6fr) minmax(0, 2fr); }
.ps-lignes { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.ps-lignes li { display: flex; justify-content: space-between; gap: var(--e3); border-bottom: 1px dotted var(--jeu-accent); padding: 2px 0; }
.ps-lignes li.discret { color: var(--jeu-accent); }
.ps-lignes li.ps-total { border-bottom: 1px solid var(--jeu-fond); font-weight: bold; }
.ps-lignes li.ps-total b { font-size: var(--texte-moyen); }
.ps-camp { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--pas); }
.ps-bat { display: grid; gap: var(--e1); align-content: start; }
.ps-bat h4 { display: flex; justify-content: space-between; align-items: center; }
.ps-bat.commande { outline: 2px solid var(--jeu-nous); }
.ps-crans { display: inline-flex; gap: 3px; }
.ps-crans i { width: 10px; height: 10px; border: 1px solid var(--jeu-fond); box-sizing: border-box; }
.ps-crans i.plein { background: var(--jeu-fond); }
.ps-crans i.cmd { background: repeating-linear-gradient(45deg, var(--jeu-nous) 0 2px, transparent 2px 4px); }
.ps-choix { display: flex; justify-content: space-between; align-items: center; gap: var(--e1); min-height: var(--jeu-cible); padding: 0 var(--pas); text-align: left; font-size: var(--texte-petit); }
.ps-choix span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-choix b { white-space: nowrap; }
.ps-choix.choisi { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-engins { display: flex; gap: var(--e1); align-items: center; font-size: var(--texte-petit); }
.ps-engin i { display: block; width: 32px; height: 8px; border: 1px solid var(--jeu-fond); }
.ps-engin i b { display: block; height: 100%; background: var(--jeu-fond); }
.ps-engin.perdu i { border-style: dotted; }
.ps-equip { display: grid; gap: var(--e1); }
.ps-regs { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: var(--e1); }
.ps-reg { display: grid; justify-items: center; gap: 2px; min-height: var(--jeu-cible); padding: 2px 0; border-top: 3px solid var(--jeu-nous); }
.ps-reg.choisi { background: var(--jeu-brume); outline: 2px solid var(--jeu-fond); }
.ps-places { display: flex; gap: 2px; }
.ps-places i { width: 14px; height: 14px; border: 1px solid var(--jeu-fond); box-sizing: border-box; font: bold 10px/12px var(--jeu-police); font-style: normal; text-align: center; }
.ps-places i.plein { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-places i.cmd { background: repeating-linear-gradient(45deg, var(--jeu-nous) 0 2px, transparent 2px 4px); }
.ps-pieces { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--e1); }
/* 3. les ordres */
.ps-ordres { grid-template-columns: minmax(0, 1fr); }
.ps-pied-ordres { justify-content: flex-end; }
/* B : trois colonnes */
.pn.ps-b { grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1.25fr); width: min(1880px, calc(100vw - 2 * var(--e4))); }
.ps-b .pn-tete { grid-column: 1 / -1; }
.ps-colonne { display: grid; gap: var(--pas); align-content: start; min-width: 0; border-left: 1px dotted var(--jeu-accent); padding-left: var(--e3); }
.ps-colonne:nth-child(2) { border-left: 0; padding-left: 0; }
.ps-titre { display: flex; align-items: center; gap: var(--e1); }
.ps-titre small { font-size: var(--texte-petit); color: var(--jeu-accent); font-family: var(--jeu-police); }
.ps-panneau.serre { grid-template-columns: minmax(0, 1fr); }
.serre .ps-camp { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.serre .ps-regs { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.serre .ps-pieces { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.serre .pn-tuiles .pn-graphe { display: none; }
.serre .pn-regs { --etat: minmax(0, 1fr); grid-template-columns: var(--jeu-cible) minmax(0, 12ch) var(--etat) repeat(var(--n), var(--jeu-cible)); }
.serre .pn-etat { min-width: 0; overflow: hidden; }
/* D : les trois étapes */
.ps-d { grid-template-rows: auto minmax(0, 1fr) auto; }
.ps-d .pn-tete { justify-content: space-between; }
.ps-d .ps-fil { flex: 0 1 auto; }
.ps-bas { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--jeu-accent); padding-top: var(--pas); }
.ps-bas .bouton { min-height: var(--jeu-cible); }
.ps-cta { min-width: 16rem; font-size: var(--texte-moyen); }
.ps-corps { min-height: 0; }
/* 1 */
.ps-journee { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; }
.ps-dec-col { display: grid; gap: var(--pas); }
.ps-dec { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--e1); font-size: var(--texte-moyen); }
.ps-dec li { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--jeu-accent); padding: var(--e1) 0; animation: ps-vient .4s both; animation-delay: calc(var(--k, 0) * .35s); }
.ps-dec li b { font-size: var(--titre-3); }
.ps-dec li.discret { color: var(--jeu-accent); }
.ps-dec-total { display: flex; align-items: baseline; gap: var(--e3); border-top: 2px solid var(--jeu-fond); padding-top: var(--pas); animation: ps-vient .4s both; animation-delay: calc(var(--k, 0) * .35s); }
.ps-dec-total b { font: var(--titre-1, 48px) var(--jeu-police-titre, inherit); font-size: 56px; line-height: 1; }
@keyframes ps-vient { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) { .ps-dec li, .ps-dec-total { animation: none; } }
.ps-chiffres { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--pas); }
.ps-chiffre { display: grid; border-top: 3px solid var(--jeu-accent); padding-top: var(--e1); }
.ps-chiffre.bi-t-nous { border-top-color: var(--jeu-nous); } .ps-chiffre.bi-t-eux { border-top-color: var(--jeu-eux); }
.ps-chiffre b { font-size: var(--titre-2); }
.ps-chiffre span { font-size: var(--texte-petit); color: var(--jeu-accent); }
.ps-lien { justify-self: start; background: none; border: 0; padding: 0 var(--e1); min-height: var(--jeu-cible); text-decoration: underline; color: var(--jeu-fond); box-shadow: none; }
.ps-histo-tete { display: flex; justify-content: space-between; align-items: center; }
.ps-histo-corps { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--e5); }
/* 2 */
.ps-camp2 { grid-template-columns: minmax(0, 1.5fr) minmax(240px, 1fr); }
.ps-camp-tete { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: var(--e4); }
.ps-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--jeu-fond); flex: 1 1 auto; }
.ps-tabs .ps-tab { flex: 1 1 0; padding-right: calc(var(--e3) + 8px); }
.ps-tab { display: grid; justify-items: center; gap: 2px; min-height: var(--jeu-cible); padding: var(--e1) var(--e3); background: transparent; border: 1px solid transparent; border-bottom: 0; box-shadow: none; position: relative; color: var(--jeu-fond); }
.ps-tab[aria-selected="true"] { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-tab[aria-selected="true"] .ps-crans i { border-color: var(--jeu-encre); } .ps-tab[aria-selected="true"] .ps-crans i.plein { background: var(--jeu-encre); }
.ps-point { position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--jeu-nous); border: 1px solid var(--jeu-fond); }
.ps-caisse { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: baseline; gap: 0 var(--e1); min-width: 0; }
.ps-caisse .discret { flex-basis: 100%; text-align: right; font-size: var(--texte-petit); }
.ps-caisse b { font-size: var(--titre-2); }
.ps-arbre { display: grid; gap: var(--pas); }
.ps-rang { display: grid; grid-template-columns: 6ch repeat(2, minmax(0, 1fr)); gap: var(--pas); align-items: stretch; position: relative; }
.ps-rang-n { display: grid; align-content: center; font-weight: bold; } .ps-rang-n small { font-weight: normal; color: var(--jeu-accent); }
.ps-rang:first-child .ps-noeud { grid-column: 2 / -1; }
.ps-rang + .ps-rang::before { content: ''; position: absolute; left: calc(6ch + var(--pas)); right: 0; top: calc(-1 * var(--pas)); height: var(--pas); background: linear-gradient(var(--jeu-accent), var(--jeu-accent)) center / 2px 100% no-repeat; }
.ps-noeud { display: grid; gap: 2px; text-align: left; min-height: 52px; padding: var(--e1) var(--pas); }
.ps-noeud small { font-size: var(--texte-petit); }
.ps-noeud.acquis { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-noeud.ecarte, .ps-noeud.verrou { opacity: .45; border-style: dotted; }
.ps-noeud.cher { border-style: dashed; }
.ps-noeud.commande { background: repeating-linear-gradient(45deg, var(--jeu-nous) 0 3px, transparent 3px 8px); }
.ps-noeud.dispo small { color: var(--jeu-fond); font-weight: bold; }
.ps-noeud[aria-pressed="true"] { outline: 3px solid var(--jeu-nous); outline-offset: 2px; }
.ps-noeud-panneau { display: grid; gap: var(--pas); align-content: start; border-left: 2px solid var(--jeu-fond); padding-left: var(--e4); }
.ps-noeud-panneau h3 { font-size: var(--titre-2); }
.ps-noeud-panneau p { margin: 0; }
.ps-effets { margin: 0; padding-left: 1.2em; font-weight: bold; }
.ps-acheter { min-height: var(--jeu-cible); }
.ps-raison { color: var(--jeu-accent); font-style: italic; }
.ps-note { font-size: var(--texte-petit); }
.ps-pieces2 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ps-regs2 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--e1); }
.ps-regs2 .ps-reg { grid-template-columns: minmax(0, 1fr) auto; justify-items: start; align-items: center; padding: 0 var(--pas); }
.ps-regs2 .ps-reg b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
/* 3 */
.ps-regiments { grid-template-columns: minmax(0, 1fr); }
.ps-regs-tete { display: flex; justify-content: space-between; align-items: center; gap: var(--e4); }
.ps-tous { display: flex; align-items: center; gap: var(--e1); }
.ps-cartes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--pas); }
.ps-carte { display: grid; gap: var(--e1); align-content: start; padding: var(--e1) var(--pas); border: 1px solid var(--jeu-accent); border-top: 3px solid var(--jeu-nous); cursor: grab; position: relative; min-width: 0; }
.ps-carte.source { outline: 3px solid var(--jeu-fond); background: var(--jeu-brume); }
.ps-carte.depot { outline: 3px dashed var(--jeu-nous); }
.ps-carte .pn-etat { min-width: 0; flex-wrap: wrap; }
.ps-carte-tete { display: flex; align-items: center; gap: var(--e1); }
.ps-carte-tete span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-poignee { min-height: 32px; min-width: 32px; padding: 0; }
.ps-corvees { display: flex; gap: var(--e1); }
.ps-corvees .pn-c { width: 40px; height: 40px; min-height: 40px; }
.ps-contact { margin: 0; min-height: 40px; display: flex; align-items: center; }
.ps-transfert { font-size: var(--texte-petit); margin: 0; text-align: left; min-height: 0; padding: 2px var(--e1); }
.ps-depot { position: absolute; inset: auto 0 0 0; background: var(--jeu-encre); border-top: 2px solid var(--jeu-fond); padding: var(--e1); display: grid; gap: var(--e1); z-index: 2; }
.ps-depot-b { display: flex; gap: var(--e1); flex-wrap: wrap; }
.ps-depot-b .bouton { min-height: 32px; padding: 0 var(--pas); }
`;

export function soiree(stage, variante) { return cadre(stage, SOIREES[variante](soireeExemple()), { css: CSS_NUIT + CSS_FIN + CSS_SOIREE }); }
