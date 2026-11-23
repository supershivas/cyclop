// « La soirée », deuxième jet (Jérôme, 18 nov., après un brainstorm et sa maquette : « les CTA peuvent avoir une couleur hors palette… le rouge sang » ; « la hauteur doit être la même
// sur les trois étapes » ; « le titre dans un header en os sur fond sombre » ; « les cases d'améliorations n'ont pas d'icônes ; les rendre plus élégantes » ; « on peut améliorer les deux
// branches de chaque niveau » (les choix par lignée, « si cela a une logique ») ; « les améliorations sont disponibles immédiatement » (acquises au clic, rendues d'un clic jusqu'à l'aube)).
// Les deux règles neuves sont SIMULÉES ici (le jeu les prendra au lot suivant) : `LIGNEE` dit quel choix du niveau 2 ouvre chaque choix du niveau 3 (null : l'un ou l'autre).
import { BATIMENTS, EQUIPEMENT, EQUIPEMENTS } from './data/batiments.js?v=0.161.0';
import { el, html, info, bouton, tuilesJour, medailles, puceReleve, graphe, frise, corvee, etat } from './hud/papier-nuit.js?v=0.161.0';
import { iconeCorvee } from './hud/icones-nuit.js?v=0.161.0';
import { iconeCamp, iconeEquipement } from './hud/icones-camp.js?v=0.161.0';
import { cadre, CSS_NUIT, CSS_FIN } from './labo-papiers.js?v=0.161.0';
import { soireeExemple } from './labo-soiree.js?v=0.161.0';

const TRANSFERT = '<svg class="pic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="4" r="2"/><path d="M2 14v-4a3 3 0 0 1 6 0v4M9.5 9h5M12.5 6.5L15 9l-2.5 2.5"/></svg>';
const pts = n => `${n} pt${n > 1 ? 's' : ''}`;
const ROMAIN = ['I', 'II', 'III'];
// la lignée des choix du niveau 3 : l'indice du choix du niveau 2 qu'il demande, ou null (l'un ou l'autre suffit). Le sens d'abord : la cadence mène au tube neuf, les ambulances à la salle d'opération…
export const LIGNEE = {
  artillerie: [null, 1],     // Salve longue : l'un ou l'autre ; Tube neuf ← Caissons doublés (la cadence)
  aerodrome: [0, 1],         // Mitrailleuses jumelées ← Passe longue (l'attaque) ; Moteur de 180 ch ← Blindage du siège (tenir l'air)
  chars: [null, 0],          // Blindage renforcé : l'un ou l'autre ; Moteur renforcé ← Chenilles larges (le terrain)
  sapeurs: [0, 1],           // Sections de 30 ← Madriers taillés (le travail) ; Équipe de nuit ← Voiturettes (le mouvement)
  caserne: [null, 1],        // Réserve de plus : l'un ou l'autre ; Cantine de campagne ← Cuisine roulante (les vivres)
  hopital: [0, 1],           // Salle d'opération ← Ambulances ; Convalescence ← Chirurgiens
};
const NOMS = { dispersion: 'Dispersion', recharge: 'Recharge', salve220: 'Salve du 220', recharge220: 'Recharge du 220', longueur: 'Longueur de passe', pv: 'Points de vie', letal: 'Touche',
  franchit: 'Franchissement', canon: 'Recharge du canon', vitesse: 'Vitesse', travail: 'Durée du travail', hommes: 'Hommes par section', retour: 'Retour des blessés', vivres: 'Vivres',
  mort: 'Mort des blessés', reserves: 'Régiments en réserve', obus: 'Morts par obus', melee: 'Coups qui portent', portee: 'Portée du tir', mortBlesse: 'Mort des blessés' };
// le chiffre d'un effet : { nom, gain : « −20 % » ou « +1 », avant, apres } ; le premier effet d'un palier
function chiffre(effets) {
  const [k, f] = Object.entries(effets ?? {})[0] ?? [];
  if (!k) return null;
  const nom = NOMS[k.replace(/^\+/, '').split('.').pop()] ?? k;
  if (k.startsWith('+')) return { nom, gain: `+${f}`, avant: null };
  const p = Math.round((f - 1) * 100);
  return { nom, gain: `${p > 0 ? '+' : '−'}${Math.abs(p)} %`, avant: 100, apres: Math.round(f * 100) };
}
const carres = (n, pleins, cls = '') => html('span', `ps-carres ${cls}`, Array.from({ length: n }, (_, k) => `<i class="${k < pleins ? 'plein' : ''}"></i>`).join(''));

export function etapes2(S) {
  const K = S.camp, N = S.N;
  // l'état du camp, à la façon des règles neuves : les choix acquis par bâtiment (« 2-0 », « 3-1 »), ceux de ce soir (rendus d'un clic), la caisse
  const acquis = Object.fromEntries(Object.entries(K.batiments).map(([cle, c]) => [cle, new Set(c.choix.map((o, k) => `${k + 2}-${o}`))]));
  acquis.artillerie.add('2-1');      // (l'exemple : l'artillerie a déjà ses deux branches du niveau 2)
  const ceSoir = new Set(), equipeSoir = [];
  const caisseSoir = K.caisse; let caisse = K.caisse;
  const V = { etape: 0, onglet: 'sapeurs', noeud: '2-0', histo: false, piece: 'casque', regs: new Set([3, 6]), source: null, depot: null };
  S.transferts = [{ de: 0, vers: 6, n: 10 }];

  const etatNoeud = (cle, r, o) => {
    const k = `${r}-${o}`, B = BATIMENTS[cle];
    if (r === 1) return 'acquis';
    if (acquis[cle].has(k)) return ceSoir.has(`${cle}:${k}`) ? 'soir' : 'acquis';
    if (r === 3) { const q = LIGNEE[cle][o]; if (q == null ? ![0, 1].some(i => acquis[cle].has(`2-${i}`)) : !acquis[cle].has(`2-${q}`)) return 'verrou'; }
    return B.niveaux[r - 1].cout > caisse ? 'cher' : 'dispo';
  };
  const peutAcheter = cle => cle === 'equipement' ? caisse >= EQUIPEMENT.cout : [2, 3].some(r => [0, 1].some(o => etatNoeud(cle, r, o) === 'dispo'));

  const p = el('section', 'papier pn ps ps-e'), fil = el('nav', 'ps-fil'), corps = el('div', 'ps-corps'), bas = el('footer', 'ps-bas');
  p.append(el('header', 'ps-bande', el('h2', '', S.titre), fil), corps, bas);
  const ETAPES = [['La journée', 'Améliorer le camp'], ['Le camp', 'Les régiments'], ['Les régiments', 'À l\'aube']];
  const aller = k => { V.etape = k; V.histo = false; rendre(); };
  function rendre() {
    fil.replaceChildren(...ETAPES.map(([nom], k) => {
      const fait = k < V.etape, b = bouton(`ps-pas${fait ? ' fait' : ''}`, fait ? html('span', 'ps-coche', '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3 3 7-7"/></svg>') : el('kbd', '', String(k + 1)), el('span', '', nom));
      b.setAttribute('aria-current', String(k === V.etape)); b.onclick = () => aller(k); return b;
    }).flatMap((b, k) => k ? [el('span', 'ps-fleche', '→'), b] : [b]));
    corps.replaceChildren([journee, camp, regiments][V.etape]());
    const retour = V.etape ? bouton('bouton ps-retour', `← ${ETAPES[V.etape - 1][0]}`) : el('span');
    if (V.etape) retour.onclick = () => aller(V.etape - 1);
    const cta = bouton('bouton ps-action', `${ETAPES[V.etape][1]}${V.etape < 2 ? ' →' : ''}`); cta.onclick = () => V.etape < 2 && aller(V.etape + 1);
    bas.replaceChildren(retour, cta);
  }

  // 1. la journée : le décompte en colonne, le total sous un trait épais ; trois chiffres ; « À retenir » en trois tuiles ; un lien discret vers l'historique
  function journee() {
    if (V.histo) {
      const fermer = bouton('bouton', '← La journée'); fermer.onclick = () => { V.histo = false; rendre(); };
      return el('section', 'ps-panneau ps-histo', el('div', 'ps-histo-tete', el('h3', '', 'La bataille jusqu\'ici'), fermer),
        el('div', 'ps-histo-corps', el('div', 'ps-col', html('div', 'ps-graphe', graphe(S.F, { larg: 520, haut: 110 })), frise(S.F)), el('div', 'ps-col', el('h4', 'pn-sous', 'Médailles du jour'), el('div', 'pn-meds-icones', medailles(N.med, { seules: true })))));
    }
    const [n, e] = N.d.camps;
    const ligne = (nom, v, cls = '') => el('div', `ps-l ${cls}`, el('span', '', nom), el('b', '', v));
    const dec = el('div', 'ps-decompte', ligne('Gardés d\'hier', String(K.hier), 'discret'), ...K.soir.map(([nom, v]) => ligne(nom, `+${v}`)), ligne('En caisse', String(K.caisse), 'ps-total'));
    const pire = N.regs.filter(r => r.mortsJour).sort((a, b) => b.mortsJour - a.mortsJour)[0], ebranles = N.regs.filter(r => r.niveau && r.niveau !== 'tient').length;
    const fait = (ic, v, nom, aide, extra = null) => info(el('div', 'ps-fait', html('span', 'ps-fait-ic', ic), el('b', '', v), el('span', '', nom), extra), aide);
    const faits = el('div', 'ps-faits',
      fait('<svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 5h10L8 12z" fill="currentColor"/></svg>', '−1', 'tronçon', '# Un tronçon perdu\nB1, tronçon 3 : ceux d\'en face y sont entrés à 15 h.'),
      pire ? fait(iconeCorvee('evacuer'), `−${pire.mortsJour}`, pire.nom, `# ${pire.nom}\n${pire.mortsJour} morts aujourd'hui, le quart des nôtres.`, html('span', 'ps-fait-barre', `<i style="width:${Math.round(100 * pire.debout / Math.max(1, pire.initial))}%"></i>`)) : null,
      fait('<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 1.5L14.5 8 8 14.5 1.5 8z"/><path d="M8 5v3.5M8 10.5v.5"/></svg>', `×${ebranles}`, ebranles > 1 ? 'ébranlés' : 'ébranlé', '# Régiments ébranlés\nLeur moral a baissé : ils tiennent moins bien.'));
    const lien = bouton('ps-lien', 'La bataille jusqu\'ici →'); lien.onclick = () => { V.histo = true; rendre(); };
    const chif = (v, nom, cls) => el('div', `ps-chiffre ${cls}`, el('b', '', String(v)), el('span', '', nom));
    return el('section', 'ps-panneau ps-journee', dec,
      el('div', 'ps-col', el('div', 'ps-chiffres', chif(n.mortsJour, 'morts chez nous', 'nous'), chif(e.mortsJour, 'morts en face', 'eux'), chif('12 / 32', 'tronçons à nous', '')), faits, lien));
  }

  // 2. le camp : les onglets à gauche en haut, l'arbre (I → II → III, les lignées tracées), à droite la caisse puis le nœud choisi et son seul bouton
  function camp() {
    const onglets = el('nav', 'ps-tabs', ...[...Object.keys(BATIMENTS), 'equipement'].map(cle => {
      const B = BATIMENTS[cle], n = B ? 1 + [2, 3].filter(r => [0, 1].some(o => acquis[cle].has(`${r}-${o}`))).length : null;
      const b = bouton('ps-tab', el('span', '', B ? B.court : 'Équipement'), B ? carres(3, n) : null, peutAcheter(cle) ? info(el('i', 'ps-plus', '+'), '# Une amélioration à votre portée') : null);
      b.setAttribute('aria-selected', String(V.onglet === cle)); b.onclick = () => { V.onglet = cle; V.noeud = '2-0'; rendre(); };
      return b;
    }));
    const tot = caisseSoir, depense = caisseSoir - caisse;
    const caisseEl = info(el('div', 'ps-caisse', el('b', '', String(caisse)), el('span', '', caisse > 1 ? 'points' : 'point'),
      html('span', 'ps-carres ps-jetons', Array.from({ length: tot }, (_, k) => `<i class="${k < caisse ? 'plein' : k < caisse + depense ? 'depense' : ''}"></i>`).join(''))),
      `# La caisse\n${caisse} à dépenser${depense ? ` ; ${depense} dépensés ce soir (rendus d'un clic jusqu'à l'aube)` : ''}.`);
    const [gauche, droite] = V.onglet === 'equipement' ? equipement() : arbre(V.onglet);
    return el('section', 'ps-panneau ps-camp3', el('div', 'ps-col', onglets, gauche), el('aside', 'ps-cote', caisseEl, droite));
  }
  function noeudBouton(cle, r, o, nom, cout) {
    const st = etatNoeud(cle, r, o), k = `${r}-${o}`;
    const b = bouton(`ps-n ${st}${r === 1 ? ' ps-n1' : ''}`, html('span', 'ps-n-ic', iconeCamp(nom)), el('b', '', nom), r > 1 ? carres(cout, st === 'cher' ? Math.min(cout, caisse) : cout) : null,
      st === 'acquis' || st === 'soir' ? html('span', 'ps-n-coin', '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 8.5l3 3 7-7"/></svg>')
        : st === 'verrou' ? html('span', 'ps-n-coin', '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>') : null);
    b.setAttribute('aria-pressed', String(V.noeud === k)); b.onclick = () => { V.noeud = k; rendre(); };
    return b;
  }
  function arbre(cle) {
    const B = BATIMENTS[cle], L = LIGNEE[cle], N2 = B.niveaux[1], N3 = B.niveaux[2];
    const st = (r, o) => etatNoeud(cle, r, o), plein = s => s === 'acquis' || s === 'soir';
    // les liens : I → les deux II ; chaque III vers le II de sa lignée (ou les deux) ; plein si les deux bouts sont acquis
    const trait = (d, ok) => `<path d="${d}" class="${ok ? 'ok' : ''}"/>`;
    const y = r => r ? 75 : 25;
    const lien1 = html('div', 'ps-lien1', `<svg viewBox="0 0 40 100" preserveAspectRatio="none">${trait('M0 50H20M20 25V75', true)}${[0, 1].map(o => trait(`M20 ${y(o)}H40`, plein(st(2, o)))).join('')}</svg>`);
    const lien2 = html('div', 'ps-lien2', `<svg viewBox="0 0 40 100" preserveAspectRatio="none">${[0, 1].map(o => L[o] == null
      ? trait(`M0 25H14M0 75H14M14 25V75M14 ${y(o)}H40`, plein(st(3, o)))
      : trait(L[o] === o ? `M0 ${y(o)}H40` : `M0 ${y(L[o])}C20 ${y(L[o])} 20 ${y(o)} 40 ${y(o)}`, plein(st(3, o)))).join('')}</svg>`);
    const en = (e, col, row) => { e.style.gridColumn = col; e.style.gridRow = row; return e; };
    const g = el('div', 'ps-arbre2', en(el('div', 'ps-rang-t', 'I'), 1, 1), en(el('div', 'ps-rang-t', 'II'), 3, 1), en(el('div', 'ps-rang-t', 'III'), 5, 1),
      en(noeudBouton(cle, 1, 0, B.niveaux[0].nom, 0), 1, '2 / 4'), en(lien1, 2, '2 / 4'), en(noeudBouton(cle, 2, 0, N2.choix[0][0], N2.cout), 3, 2), en(lien2, 4, '2 / 4'),
      en(noeudBouton(cle, 3, 0, N3.choix[0][0], N3.cout), 5, 2), en(noeudBouton(cle, 2, 1, N2.choix[1][0], N2.cout), 3, 3), en(noeudBouton(cle, 3, 1, N3.choix[1][0], N3.cout), 5, 3));
    // le panneau du nœud choisi
    const [r, o] = V.noeud.split('-').map(Number), P = B.niveaux[r - 1], [nom, effet, effets] = r === 1 ? [P.nom, P.effet, P.effets] : P.choix[o], s = st(r, o), c = chiffre(r === 1 ? P.effets : effets);
    const tete = el('div', 'ps-nt', html('span', 'ps-nt-ic', iconeCamp(nom)), el('div', '', el('h3', '', nom), el('span', 'ps-nt-sous', el('b', '', ROMAIN[r - 1]), r > 1 ? carres(P.cout, P.cout) : el('small', '', 'donné au départ'))));
    tete.dataset.info = `# ${nom}\n${effet}`;
    const ch = c ? el('div', 'ps-effet', el('div', 'ps-effet-t', el('span', '', c.nom), el('b', '', c.gain)),
      c.avant ? el('div', 'ps-ab', el('span', '', 'avant'), html('span', 'ps-ab-b', `<i style="width:${Math.min(100, c.avant / 2)}%"></i>`), el('small', '', `${c.avant} %`), el('span', '', 'après'), html('span', 'ps-ab-b apres', `<i style="width:${Math.min(100, c.apres / 2)}%"></i>`), el('small', '', `${c.apres} %`)) : null)
      : el('p', 'ps-effet-txt', effet);
    let action;
    const k = `${r}-${o}`;
    if (s === 'dispo') { action = bouton('bouton ps-acheter', `Améliorer · ${pts(P.cout)}`); action.onclick = () => { acquis[cle].add(k); ceSoir.add(`${cle}:${k}`); caisse -= P.cout; rendre(); }; }
    else if (s === 'soir') { action = info(bouton('bouton ps-rendre', `Rendre · +${pts(P.cout)}`), '# Rendre\nAcquis ce soir : jusqu\'à l\'aube, un clic le rend et rembourse.'); action.onclick = () => { acquis[cle].delete(k); ceSoir.delete(`${cle}:${k}`); caisse += P.cout; for (const o3 of [0, 1]) if (r === 2 && etatNoeud(cle, 3, o3) === 'verrou' && acquis[cle].has(`3-${o3}`)) { acquis[cle].delete(`3-${o3}`); if (ceSoir.delete(`${cle}:3-${o3}`)) caisse += N3.cout; } rendre(); }; }
    else action = el('p', 'ps-raison', s === 'acquis' ? 'Acquis.' : s === 'cher' ? `Il manque ${P.cout - caisse} point${P.cout - caisse > 1 ? 's' : ''}.` : `Demande ${L[o] == null ? `${N2.choix[0][0]} ou ${N2.choix[1][0]}` : N2.choix[L[o]][0]}.`);
    return [g, el('div', 'ps-noeud3', tete, ch, el('div', 'ps-pousse'), action)];
  }
  function equipement() {
    const pieces = el('div', 'ps-pieces3', ...Object.entries(EQUIPEMENTS).map(([k, E]) => { const b = bouton(`ps-n ${caisse >= EQUIPEMENT.cout ? 'dispo' : 'cher'}`, html('span', 'ps-n-ic', iconeEquipement(k)), el('b', '', E.court), carres(EQUIPEMENT.cout, EQUIPEMENT.cout)); b.setAttribute('aria-pressed', String(V.piece === k)); b.onclick = () => { V.piece = k; rendre(); }; return info(b, `# ${E.nom}\n${E.effet}`); }));
    const regs = el('div', 'ps-regs3', ...N.regs.map(r => {
      const plein = r.equip.length >= EQUIPEMENT.places || r.equip.includes(V.piece);
      const b = bouton(`ps-reg3${V.regs.has(r.id) ? ' choisi' : ''}${plein ? ' plein' : ''}`, el('b', '', String(r.id + 1)), el('span', '', r.nom),
        html('span', 'ps-places', [0, 1].map(i => r.equip[i] ? `<i class="${equipeSoir.some(x => x.reg === r.id && x.piece === r.equip[i]) ? 'soir' : 'pris'}">${iconeEquipement(r.equip[i])}</i>` : '<i></i>').join('')));
      if (plein) b.setAttribute('aria-disabled', 'true'); else b.onclick = () => { V.regs.has(r.id) ? V.regs.delete(r.id) : V.regs.add(r.id); rendre(); };
      return info(b, `# ${r.nom}\n${r.equip.length ? `Porte : ${r.equip.map(x => EQUIPEMENTS[x].court.toLowerCase()).join(', ')}.` : 'Ne porte rien.'}${plein ? `\n**${r.equip.includes(V.piece) ? 'Il l\'a déjà.' : 'Ses deux places sont prises.'}**` : '\nUn clic le choisit.'}`);
    }));
    const E = EQUIPEMENTS[V.piece], n = V.regs.size, cout = n * EQUIPEMENT.cout, c = chiffre(Object.fromEntries(Object.entries(E).filter(([, v]) => typeof v === 'number').slice(0, 1)));
    let action;
    if (n && cout <= caisse) { action = bouton('bouton ps-acheter', `Équiper ${n} régiment${n > 1 ? 's' : ''} · ${pts(cout)}`); action.onclick = () => { for (const id of V.regs) { N.regs[id].equip.push(V.piece); equipeSoir.push({ reg: id, piece: V.piece }); } caisse -= cout; V.regs.clear(); rendre(); }; }
    else action = el('p', 'ps-raison', n ? `Il manque ${cout - caisse} point${cout - caisse > 1 ? 's' : ''}.` : 'Choisissez un ou plusieurs régiments.');
    const tete = el('div', 'ps-nt', html('span', 'ps-nt-ic', iconeEquipement(V.piece)), el('div', '', el('h3', '', E.nom), el('span', 'ps-nt-sous', el('small', '', `${pts(EQUIPEMENT.cout)} par régiment, deux pièces chacun`))));
    const ch = c ? el('div', 'ps-effet', el('div', 'ps-effet-t', el('span', '', c.nom), el('b', '', c.gain))) : null;
    return [el('div', 'ps-col ps-equip3', pieces, regs), el('div', 'ps-noeud3', tete, ch, el('div', 'ps-pousse'), action)];
  }

  // 3. les régiments : des cartes sans filet bleu, l'état sans les morts du jour (ils sont à l'étape 1), les corvées en icônes ; le transfert en pictogramme sur les deux cartes, annulé dans la marge
  function regiments() {
    const sortes = N.sortes, tous = el('div', 'ps-tous', el('span', '', 'Tous :'), ...sortes.map(c => corvee(c, false, '')));
    const grille = el('div', 'ps-cartes3');
    for (const r of N.regs) {
      const carte = el('article', `ps-carte3${V.source === r.id ? ' source' : ''}${V.depot === r.id ? ' depot' : ''}`);
      carte.draggable = true;
      carte.ondragstart = ev => { V.source = r.id; ev.dataTransfer.setData('text/plain', String(r.id)); };
      carte.ondragover = ev => { if (V.source !== null && V.source !== r.id) ev.preventDefault(); };
      carte.ondrop = ev => { ev.preventDefault(); if (V.source !== null && V.source !== r.id) { V.depot = r.id; rendre(); } };
      carte.onclick = () => { if (V.source !== null && V.source !== r.id) { V.depot = r.id; rendre(); } };
      const poignee = info(bouton('ps-poignee', html('span', '', TRANSFERT)), `# Transférer des hommes\nGlissez la carte de ${r.nom} sur une autre, ou un clic ici puis sur l'autre carte : 1, 10, tous, ou fusionner.`);
      poignee.onclick = ev => { ev.stopPropagation(); V.source = V.source === r.id ? null : r.id; V.depot = null; rendre(); };
      const tr = S.transferts.filter(t => t.de === r.id || t.vers === r.id).map(t => {
        const sort = t.de === r.id, b = info(bouton('ps-tr', html('span', '', TRANSFERT), el('b', '', `${sort ? '−' : '+'}${t.n}`), el('i', 'ps-tr-x', '×')), `# ${sort ? `${t.n} hommes partent au ${N.regs[t.vers].nom}` : `${t.n} hommes arrivent du ${N.regs[t.de].nom}`}\nÀ l'aube. Un clic annule.`);
        b.onclick = ev => { ev.stopPropagation(); S.transferts.splice(S.transferts.indexOf(t), 1); rendre(); };
        return b;
      });
      carte.append(el('header', 'ps-c3-tete', el('b', '', String(r.id + 1)), el('span', '', r.nom), ...tr, poignee), etat(r, { larg: 96 }),
        r.corvee === 'contact' ? el('div', 'ps-corvees3', info(html('span', 'ps-contact3', iconeCorvee('contact')), '# Au contact\nIl se bat toute la nuit : pas de corvée.')) : el('div', 'ps-corvees3', ...sortes.map(c => corvee(c, r.corvee === c.id, r.refus[c.id], r.donne, r.id))));
      if (V.depot === r.id) {
        const src = N.regs[V.source], fin = n => ev => { ev.stopPropagation(); S.transferts.push({ de: V.source, vers: r.id, n }); V.source = V.depot = null; rendre(); };
        const b = (t, f) => { const x = bouton('bouton', t); x.onclick = f; return x; };
        const non = b('×', ev => { ev.stopPropagation(); V.source = V.depot = null; rendre(); }); non.setAttribute('aria-label', 'Annuler');
        carte.append(el('div', 'ps-depot', el('small', '', `De ${src.nom} :`), el('div', 'ps-depot-b', b('1', fin(1)), b('10', fin(10)), b('Tous', fin(src.debout)), b('Fusionner', fin(src.debout)), non)));
      }
      grille.append(carte);
    }
    return el('section', 'ps-panneau ps-regiments3', el('div', 'ps-regs-tete', tous, puceReleve(N.reserve)), grille);
  }

  p.vues = [['La journée', () => aller(0)], ['La bataille jusqu\'ici', () => { V.etape = 0; V.histo = true; rendre(); }], ['Le camp, Sapeurs', () => { V.etape = 1; V.onglet = 'sapeurs'; V.noeud = '2-0'; rendre(); }],
    ['Le camp, Équipement', () => { V.etape = 1; V.onglet = 'equipement'; rendre(); }], ['Les régiments', () => aller(2)], ['Les régiments, un dépôt', () => { V.etape = 2; V.source = 0; V.depot = 6; rendre(); }]].map(([nom, f]) => ({ nom, f }));
  rendre();
  return p;
}

// ─── La feuille ──────────────────────────────────────────────────────────
// Le rouge sang des boutons d'action (Jérôme, 18 nov. : « les CTA peuvent avoir une couleur hors palette… le rouge sang ») : hors palette, comme l'orange et le rouge du moral ;
// mesuré au brainstorm : le texte d'os sur le repos 8,2 : 1, sur le survol 6,3 : 1. Il ne se confond pas avec le rouge de déroute (#e5533d, vif, réservé au « ! ») : plus sombre, toujours un bouton plein.
export const CSS_SOIREE2 = `
.ps-e { --action: #7a0f1c; --action-survol: #9b1426; --action-appui: #5a0a14; --ps-h: clamp(260px, calc(100dvh - 372px), 430px);
  grid-template-columns: minmax(0, 1fr); grid-template-areas: none; row-gap: 0; }
.pn.ps-e { padding-top: 0; }
.ps-e > * { grid-area: auto; min-width: 0; }
/* l'en-tête : une bande sombre, le titre en os */
.papier.ps-e > .ps-bande { display: flex; align-items: center; justify-content: space-between; gap: var(--e4); margin: 0 calc(-1 * var(--e5)); padding: var(--pas) var(--e5); background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-e .ps-bande h2 { color: var(--jeu-encre); white-space: nowrap; }
.ps-e .ps-fil { display: flex; align-items: center; gap: var(--e1); }
.ps-e .ps-fleche { color: var(--jeu-accent); }
.papier.ps-e .ps-bande .ps-pas { display: flex; align-items: center; gap: var(--e1); min-height: var(--jeu-cible); padding: 0 var(--e3); background: transparent; color: var(--jeu-encre); border: 1px dashed var(--jeu-accent); box-shadow: none; }
.ps-e .ps-pas kbd { font: inherit; font-size: var(--texte-petit); border: 1px solid currentColor; padding: 0 4px; }
.papier.ps-e .ps-bande .ps-pas.fait { border: 1px solid var(--jeu-encre); }
.papier.ps-e .ps-bande .ps-pas[aria-current="true"] { background: var(--jeu-encre); color: var(--jeu-fond); border: 1px solid var(--jeu-encre); font-weight: bold; }
/* le corps : la même hauteur aux trois étapes */
.ps-e .ps-corps { height: var(--ps-h); overflow: auto; padding: var(--e4) 0; box-sizing: border-box; }
.ps-e .ps-corps > .ps-panneau { height: 100%; box-sizing: border-box; }
/* le pied : « ← Retour » et le bouton d'action, rouge sang */
.ps-e .ps-bas { display: flex; justify-content: space-between; align-items: center; margin: 0 calc(-1 * var(--e5)); padding: var(--e3) var(--e5) 0; border-top: 1px solid var(--jeu-accent); }
.ps-e .ps-bas .bouton { min-height: var(--jeu-cible); }
.ps-e .bouton.ps-action { min-width: 16rem; background: var(--action); color: var(--jeu-encre); border-color: var(--jeu-fond); font-weight: bold; font-size: var(--texte-moyen); }
.ps-e .bouton.ps-action:hover, .ps-e .bouton.ps-action.est-survol { background: var(--action-survol); color: var(--jeu-encre); }
.ps-e .bouton.ps-action:active { background: var(--action-appui); transform: translate(2px, 2px); box-shadow: none; }
.ps-e .bouton.ps-action:focus-visible { outline: 3px double var(--jeu-encre); outline-offset: 3px; }
/* 1 */
.ps-e .ps-journee { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--e5); align-content: start; }
.ps-e .ps-decompte { display: grid; align-content: start; font-size: var(--texte-moyen); }
.ps-e .ps-l { display: flex; justify-content: space-between; align-items: baseline; padding: var(--e1) 0; border-bottom: 1px dotted var(--jeu-accent); }
.ps-e .ps-l b { font-size: var(--titre-3); min-width: 3ch; text-align: right; }
.ps-e .ps-l.discret { color: #42392e; }
.ps-e .ps-l.ps-total { border-top: 3px solid var(--jeu-fond); border-bottom: 0; margin-top: var(--e1); padding-top: var(--pas); font-weight: bold; }
.ps-e .ps-l.ps-total b { font-size: 56px; line-height: 1; font-family: var(--police-titre); }
.ps-e .ps-chiffres { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--pas); }
.ps-e .ps-chiffre { display: grid; border-top: 3px solid var(--jeu-accent); padding-top: var(--e1); }
.ps-e .ps-chiffre.nous { border-top-color: var(--jeu-nous); } .ps-e .ps-chiffre.eux { border-top-color: var(--jeu-eux); }
.ps-e .ps-chiffre b { font-size: var(--titre-2); } .ps-e .ps-chiffre span { font-size: var(--texte-petit); color: #42392e; }
.ps-e .ps-faits { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--pas); }
.ps-e .ps-fait { display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto auto; align-items: center; justify-content: start; gap: 2px var(--e1); padding: var(--pas); border: 1px solid var(--jeu-fond); min-height: 64px; box-sizing: border-box; }
.ps-e .ps-fait b { font-size: var(--titre-3); }
.ps-e .ps-fait > span:not(.ps-fait-ic) { grid-column: 1 / -1; font-size: var(--texte-petit); color: #42392e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-e .ps-fait-ic { display: inline-grid; } .ps-fait-ic svg { width: 18px; height: 18px; }
.ps-e .ps-fait-barre { grid-column: 1 / -1; display: block; height: 6px; border: 1px solid var(--jeu-fond); }
.ps-e .ps-fait-barre i { display: block; height: 100%; background: var(--jeu-nous); }
.ps-e .ps-lien { justify-self: start; background: none; border: 0; box-shadow: none; padding: 0; min-height: var(--jeu-cible); color: var(--jeu-fond); text-decoration: underline; text-underline-offset: 3px; }
.ps-e .ps-histo { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: var(--pas); }
/* 2 */
.ps-e .ps-camp3 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 300px); gap: var(--e5); }
.ps-e .ps-camp3 > .ps-col { grid-template-rows: auto minmax(0, 1fr); }
.ps-e .ps-tabs { display: flex; gap: var(--e1); border: 0; }
.ps-e .ps-tab { flex: 1 1 0; min-width: 0; display: grid; justify-items: center; gap: 4px; min-height: var(--jeu-cible); padding: var(--e1) var(--e1); background: var(--jeu-brume); color: var(--jeu-fond); border: 1px solid var(--jeu-fond); box-shadow: none; position: relative; font-weight: bold; font-size: var(--texte-petit); }
.ps-e .ps-tab > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.ps-e .ps-tab[aria-selected="true"] { background: var(--jeu-encre); border-bottom-color: var(--jeu-encre); border-width: 2px 2px 0; padding-bottom: calc(var(--e1) + 2px); margin-bottom: -2px; }
.ps-e .ps-plus { position: absolute; top: -1px; right: -1px; width: 14px; height: 14px; display: grid; place-items: center; background: var(--jeu-fond); color: var(--jeu-encre); font: bold 12px/1 var(--jeu-police); font-style: normal; }
.ps-e .ps-carres { display: inline-flex; gap: 3px; vertical-align: middle; }
.ps-e .ps-carres i { width: 9px; height: 9px; border: 1.5px solid currentColor; box-sizing: border-box; }
.ps-e .ps-carres i.plein { background: currentColor; }
.ps-e .ps-arbre2 { display: grid; grid-template-columns: minmax(0, 0.8fr) 36px minmax(0, 1fr) 36px minmax(0, 1fr); grid-template-rows: auto auto auto; gap: var(--e4) 0; align-items: center; align-content: start; padding-top: var(--pas); border-top: 2px solid var(--jeu-fond); }
.ps-e .ps-rang-t { font: bold var(--titre-3) var(--police-titre); letter-spacing: .1em; border-bottom: 1px solid var(--jeu-fond); }
.ps-e .ps-lien1, .ps-e .ps-lien2 { align-self: stretch; position: relative; min-height: 0; }
.ps-e .ps-lien1 svg, .ps-e .ps-lien2 svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ps-e .ps-lien1 path, .ps-e .ps-lien2 path { fill: none; stroke: var(--jeu-accent); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-dasharray: 4 3; }
.ps-e .ps-lien1 path.ok, .ps-e .ps-lien2 path.ok { stroke: var(--jeu-fond); stroke-width: 3; stroke-dasharray: none; }
.ps-e .ps-n { position: relative; display: grid; justify-items: center; align-content: center; gap: 4px; min-height: 92px; padding: var(--pas) var(--e1); text-align: center; background: var(--jeu-encre); color: var(--jeu-fond); border: 2px solid var(--jeu-fond); box-shadow: 4px 4px 0 var(--jeu-fond); font-size: var(--texte-petit); }
.ps-e .ps-n b { line-height: 1.2; }
.ps-e .ps-n-ic svg, .ps-e .ps-nt-ic svg { width: 26px; height: 26px; }
.ps-e .ps-n.acquis, .ps-e .ps-n.soir { background: var(--jeu-brume); box-shadow: none; outline: 2px solid var(--jeu-fond); outline-offset: -6px; }
.ps-e .ps-n.soir { background: repeating-linear-gradient(135deg, var(--jeu-brume) 0 6px, var(--jeu-encre) 6px 8px); }
.ps-e .ps-n.cher { box-shadow: none; }
.ps-e .ps-n.verrou { box-shadow: none; border-style: dashed; border-color: var(--jeu-accent); color: #42392e; }
.ps-e .ps-n.verrou .ps-n-ic { opacity: .6; }
.ps-e .ps-n[aria-pressed="true"] { outline: 3px solid var(--jeu-fond); outline-offset: 4px; }
.ps-e .ps-n-coin { position: absolute; top: 4px; right: 4px; width: 16px; height: 16px; display: grid; place-items: center; }
.ps-e .ps-n.acquis .ps-n-coin, .ps-e .ps-n.soir .ps-n-coin { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-e .ps-cote { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: var(--e4); padding-left: var(--e4); border-left: 2px solid var(--jeu-fond); }
.ps-e .ps-caisse { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; align-items: end; gap: 0 var(--pas); }
.ps-e .ps-caisse b { grid-row: 1 / 3; font: 64px/0.85 var(--police-titre); }
.ps-e .ps-jetons i { width: 16px; height: 16px; }
.ps-e .ps-jetons i.depense { background: repeating-linear-gradient(135deg, currentColor 0 2px, transparent 2px 5px); }
.ps-e .ps-noeud3 { display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; gap: var(--pas); min-height: 0; }
.ps-e .ps-nt { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: var(--pas); align-items: center; }
.ps-e .ps-nt-ic { display: grid; place-items: center; width: 56px; height: 56px; border: 2px solid var(--jeu-fond); box-sizing: border-box; }
.ps-e .ps-nt h3 { font-size: var(--titre-2); line-height: 1; }
.ps-e .ps-nt-sous { display: flex; align-items: center; gap: var(--e1); }
.ps-effet { display: grid; gap: var(--e1); }
.ps-effet-t { display: flex; justify-content: space-between; align-items: baseline; }
.ps-effet-t span { font-weight: bold; }
.ps-effet-t b { font: 36px/1 var(--police-titre); }
.ps-e .ps-ab { display: grid; grid-template-columns: auto minmax(0, 1fr) 5ch; gap: var(--e1) var(--pas); align-items: center; font-size: var(--texte-petit); }
.ps-e .ps-ab small { text-align: right; font-weight: bold; }
.ps-e .ps-ab-b { display: block; height: 12px; border: 1.5px solid var(--jeu-fond); }
.ps-e .ps-ab-b i { display: block; height: 100%; background: var(--jeu-accent); }
.ps-e .ps-ab-b.apres i { background: var(--jeu-fond); }
.ps-effet-txt { margin: 0; }
.ps-e .ps-acheter { min-height: var(--jeu-cible); background: var(--jeu-fond); color: var(--jeu-encre); font-weight: bold; }
.ps-e .ps-rendre { min-height: var(--jeu-cible); }
.ps-e .ps-raison { margin: 0; padding: var(--pas); border: 1px dashed var(--jeu-accent); color: #42392e; text-align: center; }
.ps-equip3 { align-content: start; gap: var(--e3); }
.ps-e .ps-pieces3 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--pas); padding-top: var(--pas); border-top: 2px solid var(--jeu-fond); }
.ps-e .ps-pieces3 .ps-n { min-height: 76px; }
.ps-e .ps-regs3 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--e1); }
.ps-e .ps-reg3 { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--e1); min-height: var(--jeu-cible); padding: 0 var(--pas); text-align: left; }
.ps-e .ps-reg3 span:not(.ps-places) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ps-e .ps-reg3.choisi { background: var(--jeu-fond); color: var(--jeu-encre); }
.ps-e .ps-reg3.plein { opacity: .55; }
.ps-e .ps-reg3 .ps-places { display: flex; gap: 2px; }
.ps-e .ps-reg3 .ps-places i { display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid currentColor; box-sizing: border-box; }
.ps-e .ps-reg3 .ps-places i svg { width: 14px; height: 14px; }
.ps-e .ps-reg3 .ps-places i.soir { background: repeating-linear-gradient(135deg, transparent 0 3px, var(--jeu-brume) 3px 5px); }
/* 3 */
.ps-e .ps-regiments3 { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: var(--pas); }
.ps-e .ps-regs-tete { display: flex; justify-content: space-between; align-items: center; }
.ps-e .ps-tous { display: flex; align-items: center; gap: var(--e1); font-weight: bold; }
.ps-e .ps-cartes3 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: var(--pas); min-height: 0; }
.ps-e .ps-carte3 { position: relative; display: grid; grid-template-rows: auto auto 1fr; gap: var(--e1); padding: var(--pas); border: 1px solid var(--jeu-fond); cursor: grab; min-width: 0; box-sizing: border-box; }
.ps-e .ps-carte3.source { background: var(--jeu-brume); outline: 2px solid var(--jeu-fond); }
.ps-e .ps-carte3.depot { outline: 3px dashed var(--jeu-fond); outline-offset: 2px; }
.ps-e .ps-c3-tete { display: flex; align-items: center; gap: var(--e1); min-width: 0; }
.ps-e .ps-c3-tete > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold; }
.ps-e .ps-carte3 .pn-etat { min-width: 0; }
.ps-e .ps-carte3 .pn-mj { display: none; }
.ps-e .ps-poignee, .ps-e .ps-tr { min-height: 28px; min-width: 28px; padding: 0 4px; display: inline-flex; align-items: center; gap: 2px; box-shadow: none; }
.ps-e .ps-tr { border: 1px solid var(--jeu-fond); font-size: var(--texte-petit); }
.ps-e .ps-tr-x { font-style: normal; color: #42392e; margin-left: 2px; }
.ps-e .ps-corvees3 { display: flex; gap: var(--e1); align-items: end; }
.ps-e .ps-corvees3 .pn-c { width: 40px; height: 40px; min-height: 40px; }
.ps-e .ps-corvees3 .pn-c.refus, .ps-e .ps-corvees3 .pn-c[aria-disabled="true"] { background: none; border-style: dotted; opacity: .5; }
.ps-e .ps-contact3 { display: grid; place-items: center; width: 40px; height: 40px; border: 1px dashed var(--jeu-fond); }
.ps-e .ps-depot { position: absolute; inset: auto 0 0 0; background: var(--jeu-encre); border-top: 2px solid var(--jeu-fond); padding: var(--e1); display: grid; gap: var(--e1); z-index: 2; }
.ps-e .ps-depot-b { display: flex; gap: var(--e1); flex-wrap: wrap; }
.ps-e .ps-depot-b .bouton { min-height: 32px; padding: 0 var(--pas); }

.ps-e .ps-n.ps-n1 { min-height: var(--jeu-cible); grid-auto-flow: column; justify-content: start; align-items: center; gap: var(--pas); padding: 0 var(--pas); text-align: left; }
.ps-e .ps-n.ps-n1 .ps-n-ic svg { width: 20px; height: 20px; }
.ps-e .ps-col { display: grid; gap: var(--pas); align-content: start; min-width: 0; }
.ps-e .ps-histo-tete { display: flex; justify-content: space-between; align-items: center; }
.ps-e .ps-histo-corps { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: var(--e5); min-height: 0; }
.ps-e .ps-graphe svg { width: 100%; height: auto; display: block; }
`;

export function soiree2(stage) { return cadre(stage, etapes2(soireeExemple()), { css: CSS_NUIT + CSS_FIN + CSS_SOIREE2 }); }
