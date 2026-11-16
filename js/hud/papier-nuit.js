// Le papier de la nuit et la fin de partie (Jérôme, 15 nov., v0.134.0 : « la carte de nuit ne va pas du tout : jamais de barre de défilement, beaucoup d'espace perdu, la hiérarchie n'est pas claire » ;
// « l'écran de fin doit suivre la même logique, sans les ordres, avec plus de médailles et des moments clés » ; au labo, sujets « Le papier de la nuit », variante A « Deux colonnes », et « La fin de partie »,
// variante A « Le rapport », retenues). Des fonctions de DOM qui ne lisent que ce qu'on leur donne : `nuit.js` et `main.js` rassemblent les données (`lireJournee`, `lireBataille`, `palmares`), le labo
// en fabrique d'exemple. La hiérarchie : (a) ce qu'il faut décider (une rangée par régiment, ses corvées en icônes de 44 px, le nom au survol), (b) l'état de chaque régiment sur la même ligne,
// (c) la journée en tuiles serrées, (d) le reste (ciel, lune, avions, médailles en puces). Aucune couleur écrite : les variables `--jeu-*` (css/style.css, « Le papier de la nuit »).
// `N` (le soir) : { sortes (les corvées offertes), regs: [régiment de `lireJournee` + { corvee, donne, choisi, refus: { corvée: raison } }], d (lireJournee), reserve: { restants, total } | null,
//   ciel: { p, phase, couv, demain, prevision }, avions: { sorties, perdus, restent }, lignes (la phrase des tronçons), prise (la victoire anticipée) | null, med (palmares) }.
// `F` (la fin) : `lireBataille` + { med (palmares 'total') }.
import { CORVEES, CONTACT } from '../data/corvees.js?v=0.140.4';
import { faitsMarquants } from '../donnees-jour.js?v=0.140.4';
import { barreEffectif, batons, jaugeMoral, troncons, fait, reinitIds } from './bilan.js?v=0.140.4';
import { iconeCorvee, iconeMedaille, iconeMoment, iconeLune, boutonLoupe } from './icones-nuit.js?v=0.140.4';

const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;

export const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null && k !== false)); return e; };
export const html = (tag, cls, h) => { const e = el(tag, cls); e.innerHTML = h; return e; };
export const info = (e, t) => { e.dataset.info = t; return e; };
export const bouton = (cls, ...kids) => { const b = el('button', cls, ...kids); b.type = 'button'; return b; };
export const loupe = (nom, voir, lien) => boutonLoupe(nom, () => voir?.(lien));

/* un bouton de corvée : l'icône seule (44 × 44), son nom et ce qu'elle fait au survol */
export function corvee(c, actif, refus, donne = false, pour = '') {
  const b = bouton(`pn-c${actif ? ' actif' : ''}${refus ? ' refus' : ''}${actif && donne ? ' donne' : ''}`);
  b.innerHTML = iconeCorvee(c.id); b.dataset.corvee = c.id; b.dataset.pour = pour;
  b.setAttribute('aria-label', c.nom); b.setAttribute('aria-pressed', String(!!actif)); if (refus) b.setAttribute('aria-disabled', 'true');
  return info(b, `# ${c.nom}\n${refus ? `**${refus}**` : c.dit.replace(/^./, x => x.toUpperCase()) + '.'}`);
}
/* les vivres : trois crans (pleins : les nuits qui restent) */
export const vivres = n => html('span', 'pn-vivres', Array.from({ length: 3 }, (_, k) => `<i class="${k < n ? 'plein' : ''}"></i>`).join(''));
export const motMoral = n => n === 'deroute' ? 'déroute' : n === 'ebranle' ? 'ébranlé' : 'tient';
export function survolReg(r) {
  const h = r.historique?.length > 1 ? `\nSoir après soir : ${r.historique.map(x => `J${x.jour} ${x.vivants}`).join(' · ')}` : '';
  return `# Régiment ${r.nom}\n**${r.debout}** debout · ${r.blesses} blessés · ${r.evacues} évacués · ${r.morts} tombés (${r.mortsJour} aujourd'hui), sur ${r.initial}\nMoral ${Math.round(r.moral * 100)} % (${motMoral(r.niveau)}) · vivres pour ${pl(r.vivres, 'nuit', 'nuits')}${h}`;
}
/* l'état d'un régiment en une ligne : la barre (debout plein, blessés hachurés), le nombre debout, la jauge de moral, les vivres, les morts du jour */
export function etat(r, { larg = 96, mot = false, texte = false } = {}) {
  const e = el('div', `pn-etat${r.niveau !== 'tient' ? ` pn-${r.niveau}` : ''}`,
    html('span', 'pn-barre', barreEffectif(r, 0, { echelle: r.initial, larg, haut: 12 })),
    el('b', 'pn-debout', String(r.debout)), texte && r.blesses ? el('span', 'pn-bl', `+${r.blesses} bl.`) : null,
    html('span', 'pn-moral', jaugeMoral(r.moral, r.niveau, { larg: 40 })), mot ? el('span', 'pn-mot', motMoral(r.niveau)) : null,
    vivres(r.vivres), el('span', 'pn-mj', r.mortsJour ? `−${r.mortsJour}` : ''));
  return info(e, survolReg(r));
}
export function nomReg(r) {
  const b = bouton(`pn-nom${r.choisi ? ' choisi' : ''}`, el('b', '', String(r.numero)), el('span', '', r.nom ?? ''));
  b.setAttribute('aria-pressed', String(!!r.choisi)); b.dataset.reg = r.id;
  return info(b, `# ${r.nom}\nCette nuit : **${[...CORVEES, CONTACT].find(c => c.id === r.corvee)?.nom}**${r.donne ? ' (ordre donné)' : ''}\nUn clic le choisit (Maj : l'ajouter).`);
}
/* les corvées d'un régiment (ou la ligne « au contact » qui les remplace) */
export function corveesDe(N, r) {
  if (r.corvee === 'contact') return [info(html('div', 'pn-contact', `${iconeCorvee('contact')}<span>Au contact : il se bat toute la nuit</span>`), `# ${CONTACT.nom}\n${CONTACT.dit.replace(/^./, x => x.toUpperCase())}.`)];
  return N.sortes.map(c => corvee(c, r.corvee === c.id, r.refus[c.id], r.donne, r.id));
}
/* la rangée « Tous » : nos effectifs, et les corvées pour tous */
export function rangeeTous(N, { larg = 96 } = {}) {
  const u = N.d.camps[0], tout = c => N.regs.filter(r => r.corvee !== 'contact').every(r => r.corvee === c.id);
  const nom = info(bouton('pn-nom pn-tous', el('span', '', 'Tous'), el('kbd', '', 'T')), '# Tous les régiments\nUne corvée de cette rangée va à tous ; T les choisit tous.');
  nom.dataset.reg = 'tous';
  const e = info(el('div', 'pn-etat', html('span', 'pn-barre', barreEffectif(u, 0, { echelle: u.initial, larg, haut: 12 })), el('b', 'pn-debout', String(u.debout)), el('span', 'pn-legende', 'debout')),
    `# Nos effectifs\n**${u.debout}** debout, ${u.blesses} blessés, ${u.evacues} évacués, ${u.morts} tombés, sur ${u.initial}`);
  const libres = N.regs.filter(r => r.corvee !== 'contact');
  return [nom, e, N.sortes.map(c => corvee(c, libres.length > 0 && tout(c), libres.length && libres.every(r => r.refus[c.id]) ? libres[0].refus[c.id] : '', false, 'tous'))];
}
/* les ordres de la nuit : la rangée « Tous », puis une rangée par régiment (une grille commune : les colonnes s'alignent) */
export function ordres(N, { larg = 96, mot = false, texte = false, voir = null } = {}) {
  const g = el('div', 'pn-regs'); g.style.setProperty('--n', N.sortes.length);
  const [tn, te, tc] = rangeeTous(N, { larg });
  g.append(el('div', 'pn-r pn-r-tous', el('span', 'pn-vide'), tn, te, el('div', 'pn-cs', tc)));
  for (const r of N.regs) g.append(el('div', `pn-r${r.choisi ? ' choisi' : ''}${r.donne ? ' donne' : ''}`, loupe(`Voir ${r.nom ?? 'le régiment'} sur le champ`, voir, { reg: r.id }), nomReg(r), etat(r, { larg, mot, texte }), el('div', 'pn-cs', corveesDe(N, r))));
  return g;
}
/* la réserve pour la relève : « 2 sur 4 régiments frais » (v0.116.0) */
export const puceReleve = R => info(html('span', 'pn-puce', `${iconeCorvee('releve')}<b>${R.restants}</b><span>sur ${R.total} régiments frais</span>`), `# Relève\n${R.restants ? `${pl(R.restants, 'régiment frais attend', 'régiments frais attendent')} sur ${R.total} : chacun relève un régiment à l'aube.` : 'Plus un seul régiment frais : la relève est impossible.'}`);

/* le bilan du jour en tuiles serrées : les morts, les effectifs, les lignes, les faits ; chacune dit le reste au survol */
export function tuilesJour(N, { faits = 3 } = {}) {
  reinitIds();
  const d = N.d, [n, e] = d.camps, max = Math.max(...n.mortsParJour, ...e.mortsParJour, 1), base = Math.max(n.initial, e.initial);
  const t = (cls, titre, ...k) => el('section', `tuile pn-t ${cls}`, el('h4', '', titre), ...k);
  const morts = info(t('pn-t-morts', 'Morts du jour',
    el('div', 'pn-duo', el('b', 'bi-t-nous', String(n.mortsJour)), el('span', '', 'chez nous'), el('b', 'bi-t-eux', String(e.mortsJour)), el('span', '', 'en face')),
    html('div', 'pn-graphe', batons(n.mortsParJour, 0, { max, total: d.jours, haut: 18 }) + batons(e.mortsParJour, 1, { max, total: d.jours, haut: 18 }))),
    `# Les morts, jour après jour\n${n.mortsParJour.map((v, k) => `**Jour ${k + 1}** : ${v} chez nous, ${e.mortsParJour[k]} en face`).join('\n')}`);
  const eff = info(t('pn-t-eff', 'Effectifs', ...[0, 1].map(c => html('div', 'pn-graphe', barreEffectif(d.camps[c], c, { echelle: base, haut: 10 }))),
    el('div', 'pn-duo', el('b', 'bi-t-nous', String(n.debout)), el('span', '', `sur ${n.initial}`), el('b', 'bi-t-eux', String(e.debout)), el('span', '', `sur ${e.initial}`))),
    `# Effectifs\nNous : **${n.debout}** debout, ${n.blesses} blessés, ${n.evacues} évacués, ${n.morts} tombés\nEn face : **${e.debout}** debout, ${e.blesses} blessés, ${e.morts} tombés`);
  const lig = info(t('pn-t-lig', 'Lignes', html('div', 'pn-graphe', troncons(d.tronconsTenus, d.tronconsTenus[0] + d.tronconsTenus[1])),
    el('div', 'pn-duo', el('b', 'bi-t-nous', String(d.tronconsTenus[0])), el('span', '', 'à nous'), el('b', 'bi-t-eux', String(d.tronconsTenus[1])), el('span', '', 'à eux')),
    N.prise ? el('p', 'libelle', N.prise.court) : null),
    `# Les lignes\n${N.lignes}\nTronçons tenus : ${d.tronconsTenus[0]} par nous, ${d.tronconsTenus[1]} par eux${N.prise ? `\n${N.prise.long}` : ''}`);
  const fl = faitsMarquants(d, faits);
  const fts = info(t('pn-t-faits', 'À retenir', el('ul', 'bi-faits', ...fl.map(f => { const li = el('li'); li.innerHTML = fait(f.genre); li.append(el('span', '', f.texte)); return li; }))), `# À retenir\n${fl.map(f => f.texte).join('\n')}`);
  return { morts, eff, lig, fts };
}
/* le reste : la lune, le temps de demain, les avions (des puces, le détail au survol) */
export function reste(N) {
  const C = N.ciel, A = N.avions;
  return [
    info(html('span', 'pn-puce', `${iconeLune(C.p)}<span>${C.phase}</span>`), `# Cette nuit\n${C.phase}, ${C.couv}.`),
    info(html('span', 'pn-puce', `${iconeMoment(C.demain)}<span>Demain</span>`), `# Demain\n${C.prevision.replace(/^./, x => x.toUpperCase())}.`),
    info(html('span', 'pn-puce', `${iconeMoment('avion')}<b>${A.restent}</b><span>${A.restent > 1 ? 'avions' : 'avion'}</span>`), `# Le ciel\n${pl(A.sorties, 'sortie', 'sorties')} aujourd'hui, ${pl(A.perdus, 'avion abattu', 'avions abattus')} ; ${A.restent ? `${A.restent} ${A.restent > 1 ? 'restent, réparés' : 'reste, réparé'} cette nuit` : 'plus un seul'}.`),
  ];
}
/* les médailles : une puce par médaille (pictogramme, titre, nom ; ce qu'il a fait au survol) qui est aussi la loupe ; `seules` : l'icône seule */
export function medailles(p, { seules = false, loupes = true, plat = false, voir = null } = {}) {
  const puce = (m, groupe) => {
    const lien = m.soldat !== undefined ? { soldat: m.soldat } : m.reg !== undefined ? { reg: m.reg } : null, clic = loupes && lien;
    const b = el(clic ? 'button' : 'div', `pn-med${seules ? ' seule' : ''}`);
    if (clic) { b.type = 'button'; b.onclick = e => { e.stopPropagation(); b.blur(); voir?.(lien); }; }
    b.innerHTML = iconeMedaille(m.cle);
    if (!seules) b.append(el('span', 'pn-med-t', el('small', '', m.titre), el('span', '', m.nom)));
    if (m.neuf) b.classList.add('neuf');
    b.setAttribute('aria-label', `${m.titre} : ${m.nom}`);
    return info(b, `# ${m.titre}\n## ${groupe}\n**${m.nom}** · ${m.detail}${clic ? '\nUn clic le montre sur le champ.' : ''}`);
  };
  const groupes = [['Régiments', p.regiments], ['Hommes', p.soldats], ['Engins', p.engins]].filter(([, l]) => l?.length);
  if (plat) return groupes.flatMap(([g, l]) => l.map(m => puce(m, g)));
  return groupes.map(([g, l]) => el('div', 'pn-meds', el('h4', '', g), el('div', 'pn-meds-l', l.map(m => puce(m, g)))));
}

// ─── La fin de partie ─────────────────────────────────────────────────────
/* la bataille entière : les effectifs des deux camps (courbes), les morts de chaque jour (bâtons, nous au-dessus, eux dessous), les tronçons tenus le soir (une bande par jour) ; un même axe des jours */
export function graphe(F, { larg = 520, haut = 200 } = {}) {
  const J = F.jours, dx = larg / J, x = k => dx * (k + 0.5), [n, e] = F.camps;
  const hC = haut * 0.4, hB = haut * 0.42, y0 = hC + 6, mb = Math.max(...n.mortsParJour, ...e.mortsParJour), max = Math.max(n.initial, e.initial);
  const min = Math.min(...n.effectifParJour, ...e.effectifParJour) * 0.9, yC = v => 4 + (1 - (v - min) / (max - min)) * (hC - 8);
  const courbe = c => `<polyline class="fin-courbe fin-${c ? 'eux' : 'nous'}" points="${F.camps[c].effectifParJour.map((v, k) => `${x(k).toFixed(1)},${yC(v).toFixed(1)}`).join(' ')}"/>` + F.camps[c].effectifParJour.map((v, k) => `<circle class="bi-${c ? 'eux' : 'nous'}" cx="${x(k).toFixed(1)}" cy="${yC(v).toFixed(1)}" r="2.5"><title>Jour ${k + 1} : ${v} vivants ${c ? 'en face' : 'chez nous'}</title></circle>`).join('');
  const b = Math.min(14, dx - 4), mid = y0 + hB / 2;
  const bat = n.mortsParJour.map((v, k) => { const h = v / mb * (hB / 2 - 2); return `<rect class="bi-nous" x="${(x(k) - b / 2).toFixed(1)}" y="${(mid - h).toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}"><title>Jour ${k + 1} : ${v} morts chez nous</title></rect>`; }).join('')
    + e.mortsParJour.map((v, k) => { const h = v / mb * (hB / 2 - 2); return `<rect class="bi-eux" x="${(x(k) - b / 2).toFixed(1)}" y="${mid.toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}"><title>Jour ${k + 1} : ${v} morts en face</title></rect>`; }).join('');
  const yT = y0 + hB + 6, tot = Math.max(1, F.tenus[0]?.[0] + F.tenus[0]?.[1] || 1);
  const lig = F.tenus.map(([a], k) => `<rect class="bi-nous" x="${(x(k) - dx / 2 + 1).toFixed(1)}" y="${yT}" width="${(dx * a / tot - 1).toFixed(1)}" height="8"><title>Soir du jour ${k + 1} : ${a} tronçons à nous sur ${tot}</title></rect><rect class="bi-eux" x="${(x(k) - dx / 2 + dx * a / tot).toFixed(1)}" y="${yT}" width="${(dx * (1 - a / tot) - 1).toFixed(1)}" height="8"/>`).join('');
  const pire = !F.pire ? '' : `<rect class="fin-pire" x="${(x(F.pire - 1) - dx / 2).toFixed(1)}" y="0" width="${dx.toFixed(1)}" height="${yT + 8}"/>`;
  return `<svg class="bi fin-graphe" viewBox="0 0 ${larg} ${yT + 10}" role="img" aria-label="La bataille jour après jour">${pire}${courbe(1)}${courbe(0)}<line class="bi-base" x1="0" x2="${larg}" y1="${mid}" y2="${mid}"/>${bat}${lig}</svg>`;
}
export const NOMS_MOMENTS = { pris: 'tronçon pris', perdu: 'tronçon perdu', deroute: 'déroute', assaut: 'assaut d\'en face', char: 'char perdu', avion: 'avion abattu', pont: 'pont coupé', poste: 'poste détruit' };
/* les moments d'un jour : une icône par genre, le nombre dessous s'il y en a plus d'un */
export function momentsDuJour(m) {
  const l = [['pris', m.pris], ['perdu', m.perdus], ['deroute', m.deroutes], ['assaut', m.assauts], ['char', m.chars], ['avion', m.avions], ['pont', m.ponts], ['poste', m.postes]].filter(x => x[1]);
  return l.map(([k, n]) => info(html('span', `fin-m fin-m-${k}`, `${iconeMoment(k)}${n > 1 ? `<small>${n}</small>` : ''}`), `# Jour ${m.jour}\n${pl(n, NOMS_MOMENTS[k], NOMS_MOMENTS[k].replace(/^(\S+)( \S+)?/, (a, b, c) => `${b}s${c ? c.replace(/(\S+)$/, '$1s') : ''}`))}`));
}
export function frise(F) {
  const f = el('div', 'fin-frise', F.moments.map(m => el('div', `fin-jour${m.jour === F.pire ? ' pire' : ''}`, info(html('span', 'fin-j', `${iconeMoment(m.meteo)}<b>${m.jour}</b>`), `# Jour ${m.jour}\n${F.camps[0].mortsParJour[m.jour - 1] ?? 0} morts chez nous, ${F.camps[1].mortsParJour[m.jour - 1] ?? 0} en face${m.jour === F.pire ? '\n**La journée la plus meurtrière**' : ''}`), el('div', 'fin-ms', momentsDuJour(m)))));
  f.style.setProperty('--j', F.moments.length);
  return f;
}
export function issueLabo(F) {
  const [n, e] = F.camps;
  const k = (v, nom, cls = '') => el('div', `pn-cle ${cls}`, el('b', '', String(v)), el('span', '', nom));
  return el('header', `fin-issue${F.issue.reussie ? ' reussie' : ''}`,
    el('div', 'fin-tampon', F.issue.tampon), el('div', 'fin-titre', el('h2', '', F.issue.titre), el('p', 'libelle', `${F.issue.texte} · ${F.jours} jours`)),
    el('div', 'fin-cles', k(n.morts, 'morts chez nous', 'bi-t-nous'), k(e.morts, 'en face', 'bi-t-eux'), k(n.debout, `debout sur ${n.initial}`, 'bi-t-nous'), k(`${F.tenus.at(-1)[0]}/${F.tenus.at(-1)[0] + F.tenus.at(-1)[1]}`, 'tronçons à nous', 'bi-t-nous'), k(`+${F.issue.merite}`, 'mérite')),
    el('div', 'fin-boutons', bouton('bouton', 'Nouvelle partie'), bouton('bouton', 'Écran titre')));
}
/* les médailles de la bataille en tableau (pictogramme, titre, nom, ce qu'il a fait ; « nouvelle » marque les médailles proposées) */
export function tableMed(p) {
  return [['Les régiments', p.regiments], ['Les hommes', p.soldats], ['Les engins', p.engins]].filter(([, l]) => l?.length).map(([g, l]) => el('section', 'fin-med', el('h4', '', g), el('table', 'medailles',
    el('tbody', '', l.map(m => el('tr', m.neuf ? 'neuf' : '', html('td', 'med-icone', iconeMedaille(m.cle)), el('td', 'med-titre', m.titre), el('td', 'med-nom', m.nom), el('td', 'med-detail', m.detail)))))));
}
export const legende = (courbe = true) => info(html('p', 'libelle fin-legende', (courbe ? '<span><i class="lg-courbe"></i>vivants</span>' : '') + '<span><i class="lg-baton"></i>morts du jour</span><span><i class="lg-bande"></i>lignes le soir</span><span><i class="lg-pire"></i>la journée la plus meurtrière</span>'),
  '# La bataille\nLes courbes : les vivants de chaque camp, soir après soir\nLes bâtons : les morts de chaque jour, nous au-dessus, en face dessous\nLa bande : les tronçons tenus le soir\nLa colonne marquée : notre journée la plus meurtrière');
