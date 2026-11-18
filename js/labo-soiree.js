// Le sujet « La soirée » du labo (Jérôme, 18 nov. : « à la fin de la journée, c'est le moment des upgrades : le décompte des points gagnés ; améliorer les bâtiments, les avions, chars ou les équipements
// d'un ou plusieurs régiments » ; « un cheminement de fin de journée logique, avec la fenêtre d'upgrade, la fenêtre d'ordre et la fenêtre de stats/historique » ; ROADMAP, « Le soir, le moment des améliorations », lot 0).
// Trois temps, dans l'ordre où l'on pense : ce qui s'est passé (le rapport) → ce que j'ai (l'état-major : le décompte et les achats) → ce que je fais (les ordres de la nuit).
// Trois rangements à trancher : A les onglets, B trois colonnes côte à côte, C un défilé guidé avec retour libre. Les morceaux sont ceux du jeu (`hud/papier-nuit.js`), les données celles des papiers
// de la nuit et de la fin (`nuitExemple`, `finExemple` de labo-papiers.js, la bataille coupée au soir du 6e jour), les bâtiments et l'équipement ceux de `data/batiments.js`. Sous chaque cadre, la mesure
// de CHAQUE vue (un onglet, une étape) aux quatre tailles d'écran : la règle de la v0.134.0, aucun défilement dès 1280 × 800.
import { BATIMENTS, DOTATION, EQUIPEMENT, EQUIPEMENTS } from './data/batiments.js?v=0.149.1';
import { el, html, info, bouton, ordres, tuilesJour, reste, medailles, puceReleve, graphe, frise } from './hud/papier-nuit.js?v=0.149.1';
import { iconeCorvee } from './hud/icones-nuit.js?v=0.149.1';
import { nuitExemple, finExemple, cadre, CSS_NUIT, CSS_FIN } from './labo-papiers.js?v=0.149.1';

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

// ─── Les trois rangements ────────────────────────────────────────────────
export const SOIREES = {
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
.ps-choix { display: flex; justify-content: space-between; align-items: center; gap: var(--e1); min-height: var(--jeu-cible); padding: 0 var(--e2); text-align: left; font-size: var(--texte-petit); }
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
`;

export function soiree(stage, variante) { return cadre(stage, SOIREES[variante](soireeExemple()), { css: CSS_NUIT + CSS_FIN + CSS_SOIREE }); }
