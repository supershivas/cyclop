// Les sujets « Le papier de la nuit » et « La fin de partie » du labo (Jérôme, 15 nov., sur la v0.132.0 : « la carte de nuit ne va pas du tout. On doit toujours éviter les barres de défilement,
// il y a beaucoup d'espace perdu, la hiérarchie des informations n'est pas claire » ; « l'écran de fin de partie doit suivre la même logique (sans les ordres), avec un tableau de médailles encore plus fourni,
// des moments clés »). Chaque variante est un écran de jeu en petit : un cadre (`iframe`) qui charge les VRAIES feuilles (`css/style.css`, `css/ds-v2.css`), le haut et la rangée des régiments en place,
// et le papier posé entre les deux. Les graphiques sont ceux du jeu (`hud/bilan.js`, `hud/icones-nuit.js`) ; les données, une journée d'exemple (`journeeExemple` de labo-donnees.js : 8 régiments,
// les 4 corvées d'équipement en plus, des médailles pleines). Sous chaque cadre, la mesure : le défilement et le recouvrement des cartes à 1024 × 640, 1280 × 800, 1440 × 900 et 1920 × 1080.
// La hiérarchie (le prompt du chantier) : (a) ce qu'il faut décider cette nuit, (b) l'état de chaque régiment, (c) le bilan du jour, (d) le reste (ciel, lune, avions, médailles).
import { ROLES } from './palette.js?v=0.140.0';
import { CORVEES, CONTACT } from './data/corvees.js?v=0.140.0';
import { journeeExemple } from './labo-donnees.js?v=0.140.0';
import { barreEffectif, jaugeMoral } from './hud/bilan.js?v=0.140.0';
import { iconeCorvee, iconeMedaille, iconeMoment } from './hud/icones-nuit.js?v=0.140.0';
import { el, html, info, bouton, loupe, corvee, vivres, survolReg, etat, nomReg, corveesDe, rangeeTous, ordres, tuilesJour, reste, medailles, puceReleve,
  graphe, frise, issueLabo, tableMed, legende, momentsDuJour } from './hud/papier-nuit.js?v=0.140.0';
import { lignesInfo } from './hud/infobulle.js?v=0.140.0';

const roles = Object.entries(ROLES).map(([k, v]) => `--jeu-${k}:${v}`).join(';');
const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
export const TAILLES = [[1024, 640], [1280, 800], [1440, 900], [1920, 1080]];
const CARTES = 104;      // la hauteur réservée à la rangée des régiments, en bas de l'écran (comme `.nuit:not(.aube)` du jeu)

// ─── Les données d'exemple ───────────────────────────────────────────────
const PHASES = ['Nouvelle lune', 'Premier croissant', 'Premier quartier', 'Lune gibbeuse', 'Pleine lune', 'Lune gibbeuse', 'Dernier quartier', 'Dernier croissant'];
// la journée d'exemple est faite pour 100 hommes par camp : on la porte à l'échelle d'une vraie bataille (des régiments d'une centaine d'hommes)
function grossir(d, k) {
  const champs = ['initial', 'debout', 'blesses', 'morts', 'evacues', 'mortsJour'];
  for (const c of d.camps) {
    for (const f of champs) c[f] *= k;
    for (const f of ['mortsParJour', 'effectifParJour', 'blessesParJour']) c[f] = c[f].map(v => v * k);
    for (const r of c.regiments) { for (const f of champs) r[f] *= k; for (const h of r.historique) { h.vivants *= k; h.blesses *= k; h.morts *= k; } }
  }
  return d;
}
export function nuitExemple() {
  const d = grossir(journeeExemple('offensive'), 8);
  const regs = d.camps[0].regiments.map((r, k) => ({ ...r, id: k, vivres: [3, 2, 0, 1, 3, 2, 1, 2][k] }));
  d.camps[0].regiments = regs;
  const choix = ['repos', 'evacuer', 'contact', 'repos', 'ravitailler', 'eq-casque', 'repos', 'releve'];
  const refus = (r, c) => c === 'evacuer' && !r.blesses ? 'Aucun blessé à évacuer.' : c === 'eq-casque' && r.id === 1 ? 'Il a déjà ses casques.' : c === 'ravitailler' && r.vivres >= 3 ? 'Ses vivres sont pleins.' : '';
  return {
    titre: `Nuit du ${d.jour}e au ${d.jour + 1}e jour`, d, sortes: CORVEES,
    regs: regs.map(r => ({ ...r, corvee: choix[r.id], donne: r.id === 4 || r.id === 5, choisi: r.id === 4, refus: Object.fromEntries(CORVEES.map(c => [c.id, refus(r, c.id)])) })),
    reserve: { restants: 2, total: 4 },
    ciel: { p: 0.27, phase: PHASES[2], couv: 'ciel nuageux', demain: 'pluie', prevision: 'peut-être de la pluie' },
    avions: { sorties: 3, perdus: 1, restent: 2 },
    lignes: 'Pris 1 tronçon, perdu 3 tronçons.',
    med: {
      regiments: [
        { cle: 'meurtrier', titre: 'Le plus meurtrier', nom: '5 Syzygie', detail: '23 hommes abattus', reg: 4 },
        { cle: 'conquerant', titre: 'Le conquérant', nom: '2 Protogyne', detail: '1 tronçon pris', reg: 1 },
        { cle: 'sacrifie', titre: 'Le plus sacrifié', nom: '3 Céruléen', detail: '9 morts', reg: 2 },
        { cle: 'inutile', titre: 'Le plus inutile', nom: '8 Sinople', detail: 'rien abattu, rien pris', reg: 7 },
      ],
      soldats: [
        { cle: 'meurtrier', titre: 'Le plus meurtrier', nom: 'Achille Fournier', detail: 'caporal, Syzygie · 4 hommes abattus', soldat: 1 },
        { cle: 'aguerri', titre: 'Le plus aguerri', nom: 'Louis Brémond', detail: 'sergent, Hapax · a tout vu du feu', soldat: 2 },
        { cle: 'inutile', titre: 'Le plus inutile', nom: 'Eugène Pradel', detail: 'soldat, Viride · rien abattu en 6 jours', soldat: 3 },
      ],
    },
  };
}
// la bataille entière (la fin de partie) : 12 jours, les deux camps jour après jour, les moments, les médailles de la bataille (les nouvelles en plus)
export function finExemple() {
  const S = 12, d = journeeExemple('offensive');
  let s = 7; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const morts = [[], []], effectif = [[800], [800]], tenus = [], moments = [];
  let t0 = 16;
  for (let k = 0; k < S; k++) {
    const dur = [0.6, 0.8, 1.4, 1, 0.7, 2.2, 1.3, 0.8, 0.5, 1.6, 0.9, 0.7][k];
    morts[0].push(Math.round((8 + r() * 14) * dur)); morts[1].push(Math.round((9 + r() * 16) * dur));
    if (k) for (const c of [0, 1]) effectif[c].push(effectif[c][k - 1] - morts[c][k - 1] - Math.round(r() * 6));
    const pris = [0, 0, 1, 0, 0, 2, 1, 0, 0, 3, 0, 0][k], perdus = [0, 1, 2, 0, 0, 4, 0, 0, 0, 1, 0, 1][k];
    t0 += pris - perdus; tenus.push([t0, 32 - t0]);
    moments.push({ jour: k + 1, meteo: ['sec', 'sec', 'pluie', 'pluie', 'brouillard', 'pluie', 'couvert', 'sec', 'sec', 'pluie', 'couvert', 'sec'][k], pris, perdus,
      deroutes: [0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 0][k], assauts: [0, 1, 2, 0, 1, 3, 1, 0, 0, 2, 1, 0][k], chars: [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0][k], avions: [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0][k],
      ponts: [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0][k], postes: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0][k] });
  }
  const pire = morts[0].indexOf(Math.max(...morts[0]));
  moments[pire].pire = true;
  return {
    jours: S, issue: { reussie: true, tampon: 'Tenu', titre: 'Le secteur est tenu', texte: 'Tenir le secteur jusqu\'au 12e jour', merite: 14 },
    camps: [0, 1].map(c => ({ initial: 800, debout: effectif[c].at(-1) - 40, blesses: 31, evacues: 26, morts: morts[c].reduce((a, b) => a + b, 0), mortsParJour: morts[c], effectifParJour: effectif[c] })),
    tenus, moments, pire: pire + 1, regiments: d.camps[0].regiments,
    med: {
      regiments: [
        { cle: 'meurtrier', titre: 'Le plus meurtrier', nom: '5 Syzygie', detail: '112 hommes abattus' },
        { cle: 'conquerant', titre: 'Le conquérant', nom: '2 Protogyne', detail: '5 tronçons pris' },
        { cle: 'sacrifie', titre: 'Le plus sacrifié', nom: '3 Céruléen', detail: '61 morts' },
        { cle: 'roc', titre: 'Le roc', nom: '6 Murmuration', detail: '48 morts, jamais en déroute', neuf: true },
        { cle: 'inebranlable', titre: 'L\'inébranlable', nom: '1 Porphyre', detail: 'moral moyen 82 %', neuf: true },
        { cle: 'fuyard', titre: 'Le fuyard', nom: '3 Céruléen', detail: '3 déroutes', neuf: true },
        { cle: 'inutile', titre: 'Le plus inutile', nom: '8 Sinople', detail: '4 abattus, rien pris' },
      ],
      soldats: [
        { cle: 'meurtrier', titre: 'Le plus meurtrier', nom: 'Achille Fournier', detail: 'caporal, Syzygie · 17 abattus' },
        { cle: 'survivant', titre: 'Le survivant', nom: 'Jules Marchand', detail: 'soldat, Porphyre · 12 jours au front', neuf: true },
        { cle: 'aguerri', titre: 'Le plus aguerri', nom: 'Louis Brémond', detail: 'sergent, Hapax · a tout vu du feu' },
        { cle: 'inutile', titre: 'Le plus inutile', nom: 'Eugène Pradel', detail: 'soldat, Viride · rien en 12 jours' },
      ],
      engins: [
        { cle: 'char', titre: 'Le char le plus meurtrier', nom: 'Schneider « Verdun »', detail: '38 hommes abattus', neuf: true },
        { cle: 'poste', titre: 'Le poste le plus meurtrier', nom: 'Poste de la 1re ligne, B', detail: '54 hommes abattus', neuf: true },
        { cle: 'genie', titre: 'Le génie', nom: '2 sections', detail: '2 ponts refaits, 3 engins réparés', neuf: true },
      ],
    },
  };
}

// ─── Les morceaux communs : ceux du jeu (hud/papier-nuit.js) ─────────────
const pied = N => el('div', 'pn-pied', puceReleve(N.reserve), info(bouton('bouton pn-gerer', 'Gérer les régiments'), '# Gérer les régiments\nFusionner deux régiments ou passer des soldats de l\'un à l\'autre.'));
const tete = N => el('header', 'pn-tete', el('h2', '', N.titre), pied(N), aube());
const aube = () => info(bouton('bouton pn-aube', 'À l\'aube'), '# À l\'aube\nLa nuit s\'achève : les ordres donnés s\'exécutent, la dotation tombe.');

// ─── Les quatre papiers de la nuit ───────────────────────────────────────
export const NUITS = {
  // A : deux colonnes. Les ordres et l'état à gauche (les deux tiers), la journée et le reste à droite ; les médailles en puces sous la journée.
  colonnes(N) {
    const T = tuilesJour(N, { faits: 3 });
    return el('section', 'papier pn pn-va',
      tete(N),
      el('section', 'pn-ordres', ordres(N), T.fts),
      el('section', 'pn-jour', el('h3', '', 'La journée'), el('div', 'pn-tuiles', T.morts, T.eff), T.lig, el('div', 'pn-reste', reste(N)), el('h4', 'pn-sous', 'Médailles du jour'), el('div', 'pn-meds-l', medailles(N.med, { plat: true }))));
  },
  // B : les étages. Toute la largeur, du plus important au moins important : les ordres (l'état des régiments s'y étale), puis une bande du jour (quatre tuiles et les médailles en icônes).
  etages(N) {
    const T = tuilesJour(N, { faits: 2 });
    return el('section', 'papier pn pn-vb',
      tete(N),
      el('section', 'pn-ordres', ordres(N, { larg: 150, mot: true, texte: true })),
      el('section', 'pn-bande', T.fts, T.morts, T.eff, T.lig, el('section', 'tuile pn-t', el('h4', '', 'Le ciel'), el('div', 'pn-reste pn-pile', reste(N))), el('section', 'tuile pn-t pn-t-med', el('h4', '', 'Médailles'), el('div', 'pn-meds-icones', medailles(N.med, { seules: true })))));
  },
  // C : le tableau croisé. Les corvées nommées une fois en tête de colonne, l'état en colonnes de chiffres (comme un registre), la journée en chiffres-clés dans une colonne étroite.
  croise(N) {
    const T = tuilesJour(N, { faits: 2 });
    const g = el('div', 'pn-regs pn-croise'); g.style.setProperty('--n', N.sortes.length);
    const entete = el('div', 'pn-r pn-r-tete', el('span'), el('span', 'pn-h', 'Régiment'), el('span', 'pn-h pn-num', 'Debout'), el('span', 'pn-h pn-num', 'Blessés'), el('span', 'pn-h', 'Moral'), el('span', 'pn-h', 'Vivres'), el('span', 'pn-h pn-num', 'Morts'),
      el('div', 'pn-cs', N.sortes.map(c => info(html('span', 'pn-h pn-hc', `${iconeCorvee(c.id)}<span>${c.court}</span>`), `# ${c.nom}\n${c.dit.replace(/^./, x => x.toUpperCase())}.`))));
    const u = N.d.camps[0], tout = c => N.regs.filter(r => r.corvee !== 'contact').every(r => r.corvee === c.id);
    const nb = (v, cls = '') => el('span', `pn-num ${cls}`, String(v));
    g.append(entete, el('div', 'pn-r pn-r-tous', el('span'), info(bouton('pn-nom pn-tous', el('span', '', 'Tous'), el('kbd', '', 'T')), '# Tous les régiments\nUne corvée de cette rangée va à tous.'),
      nb(u.debout), nb(u.blesses), el('span'), el('span'), nb(u.mortsJour ? `−${u.mortsJour}` : ''), el('div', 'pn-cs', N.sortes.map(c => corvee(c, tout(c), '')))));
    for (const r of N.regs) g.append(el('div', `pn-r${r.choisi ? ' choisi' : ''}`, loupe(`Voir ${r.nom} sur le champ`), nomReg(r), info(nb(r.debout, 'fort'), survolReg(r)), info(nb(r.blesses || '·'), survolReg(r)),
      info(html('span', `pn-moral pn-${r.niveau}`, jaugeMoral(r.moral, r.niveau, { larg: 48 })), survolReg(r)), info(vivres(r.vivres), survolReg(r)), nb(r.mortsJour ? `−${r.mortsJour}` : '·'), el('div', 'pn-cs', corveesDe(N, r))));
    const [n, e] = N.d.camps;
    const cle = (v, nom, cls, aide) => info(el('div', `pn-cle ${cls}`, el('b', '', String(v)), el('span', '', nom)), aide);
    return el('section', 'papier pn pn-vc',
      tete(N),
      el('section', 'pn-ordres', g),
      el('section', 'pn-jour', el('h3', '', 'La journée'),
        cle(n.mortsJour, 'morts chez nous', 'bi-t-nous', T.morts.dataset.info), cle(e.mortsJour, 'morts en face', 'bi-t-eux', T.morts.dataset.info),
        cle(`${n.debout}`, `debout sur ${n.initial}`, 'bi-t-nous', T.eff.dataset.info), cle(`${N.d.tronconsTenus[0]}/${N.d.tronconsTenus[0] + N.d.tronconsTenus[1]}`, 'tronçons à nous', 'bi-t-nous', T.lig.dataset.info), T.fts, el('div', 'pn-reste', reste(N)),
        el('h4', 'pn-sous', 'Médailles du jour'), el('div', 'pn-meds-icones', medailles(N.med, { seules: true }))));
  },
  // D : le front. Une colonne par régiment, dans l'ordre de la rangée du bas (donc du champ), ses corvées en deux colonnes d'icônes ; la colonne « Tous » en tête ; la journée en bande dessous.
  front(N) {
    const T = tuilesJour(N, { faits: 2 });
    const cols = el('div', 'pn-front');
    const [tn, , tc] = rangeeTous(N);
    const u = N.d.camps[0];
    cols.append(el('div', 'pn-col pn-col-tous', tn, info(el('div', 'pn-vert pn-col-etat', html('span', 'pn-barre', barreEffectif(u, 0, { larg: 96, haut: 12 })), el('b', 'pn-debout', String(u.debout))), `# Nos effectifs\n**${u.debout}** debout sur ${u.initial}`), el('div', 'pn-cs', tc)));
    for (const r of N.regs) {
      const tete = nomReg(r);
      const et = info(el('div', `pn-vert${r.niveau !== 'tient' ? ` pn-${r.niveau}` : ''}`, html('span', 'pn-barre', barreEffectif(r, 0, { larg: 96, haut: 12 })), el('div', 'pn-ligne', el('b', 'pn-debout', String(r.debout)), el('span', 'pn-mj', r.mortsJour ? `−${r.mortsJour}` : '')),
        el('div', 'pn-ligne', html('span', 'pn-moral', jaugeMoral(r.moral, r.niveau, { larg: 48 })), vivres(r.vivres))), survolReg(r));
      cols.append(el('div', `pn-col${r.choisi ? ' choisi' : ''}`, tete, el('div', 'pn-col-etat', loupe(`Voir ${r.nom} sur le champ`), et), el('div', 'pn-cs', corveesDe(N, r))));
    }
    return el('section', 'papier pn pn-vd',
      tete(N),
      el('section', 'pn-ordres', cols),
      el('section', 'pn-bande', T.fts, T.morts, T.eff, T.lig, el('section', 'tuile pn-t', el('h4', '', 'Le ciel'), el('div', 'pn-reste pn-pile', reste(N))), el('section', 'tuile pn-t pn-t-med', el('h4', '', 'Médailles'), el('div', 'pn-meds-icones', medailles(N.med, { seules: true })))));
  },
};

// ─── La fin de partie ────────────────────────────────────────────────────
export const FINS = {
  // A : le rapport. L'issue en tête ; à gauche la bataille (courbes, morts, lignes) et, dessous, sur le même axe des jours, la frise des moments ; à droite les médailles en tableau.
  rapport(F) {
    return el('section', 'papier fin pf-a', issueLabo(F),
      el('section', 'fin-bataille', el('h3', '', 'La bataille'), html('div', 'fin-g', graphe(F)), frise(F), legende()),
      el('section', 'fin-meds', el('h3', '', 'Les médailles'), tableMed(F.med)));
  },
  // B : la frise. Une colonne par jour sur toute la largeur (le temps, les morts des deux camps, les lignes, les moments) ; les médailles en trois colonnes de puces dessous.
  frise(F) {
    const [n, e] = F.camps, mb = Math.max(...n.mortsParJour, ...e.mortsParJour), tot = F.tenus[0][0] + F.tenus[0][1];
    const jours = el('div', 'fin-cal', F.moments.map((m, k) => el('div', `fin-cal-j${m.pire ? ' pire' : ''}`,
      info(html('span', 'fin-j', `${iconeMoment(m.meteo)}<b>${m.jour}</b>`), `# Jour ${m.jour}\n${n.mortsParJour[k]} morts chez nous, ${e.mortsParJour[k]} en face\n${F.tenus[k][0]} tronçons à nous le soir${m.pire ? '\n**La journée la plus meurtrière**' : ''}`),
      html('div', 'fin-cal-b', `<i class="n" style="height:${(n.mortsParJour[k] / mb * 100).toFixed(0)}%"></i>`), el('span', 'fin-cal-v bi-t-nous', String(n.mortsParJour[k])),
      html('div', 'fin-cal-b eux', `<i class="e" style="height:${(e.mortsParJour[k] / mb * 100).toFixed(0)}%"></i>`), el('span', 'fin-cal-v', String(e.mortsParJour[k])),
      html('div', 'fin-cal-l', `<i style="width:${(F.tenus[k][0] / tot * 100).toFixed(0)}%"></i>`), el('div', 'fin-ms', momentsDuJour(m)))));
    return el('section', 'papier fin pf-b', issueLabo(F), el('section', 'fin-bataille', el('h3', '', 'La bataille, jour après jour'), jours, legende(false)),
      el('section', 'fin-meds', el('h3', '', 'Les médailles'), el('div', 'fin-meds-col', medailles(F.med, { loupes: false }))));
  },
  // C : le registre des jours. Une ligne par jour (le temps, les morts des deux camps en barres, les lignes, les moments en icônes) ; les médailles en tableau à droite ; la courbe des effectifs en tête.
  registre(F) {
    const [n, e] = F.camps, mb = Math.max(...n.mortsParJour, ...e.mortsParJour), tot = F.tenus[0][0] + F.tenus[0][1];
    const t = el('div', 'fin-reg', el('div', 'fin-reg-l fin-reg-tete', el('span', '', 'Jour'), el('span', '', 'Morts (nous | en face)'), el('span', '', 'Lignes le soir'), el('span', '', 'Moments')),
      F.moments.map((m, k) => el('div', `fin-reg-l${m.pire ? ' pire' : ''}`, html('span', 'fin-j', `${iconeMoment(m.meteo)}<b>${m.jour}</b>`),
        info(html('span', 'fin-duel', `<b>${n.mortsParJour[k]}</b><i class="n" style="width:${(n.mortsParJour[k] / mb * 50).toFixed(1)}%"></i><i class="e" style="width:${(e.mortsParJour[k] / mb * 50).toFixed(1)}%"></i><b>${e.mortsParJour[k]}</b>`), `# Jour ${m.jour}\n${n.mortsParJour[k]} morts chez nous, ${e.mortsParJour[k]} en face${m.pire ? '\n**La journée la plus meurtrière**' : ''}`),
        html('span', 'fin-cal-l', `<i style="width:${(F.tenus[k][0] / tot * 100).toFixed(0)}%"></i>`), el('div', 'fin-ms', momentsDuJour(m)))));
    return el('section', 'papier fin pf-c', issueLabo(F), el('section', 'fin-bataille', el('h3', '', 'Jour après jour'), t),
      el('section', 'fin-meds', el('h3', '', 'Les médailles'), tableMed(F.med)));
  },
};

// ─── Le cadre : un écran de jeu en petit ─────────────────────────────────
const CSS_CADRE = `
  :root { ${roles}; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--jeu-ombre); font: var(--texte)/1.4 var(--jeu-police); }
  .faux-haut { position: fixed; left: var(--pas); top: var(--pas); display: flex; gap: var(--pas); }
  .faux-haut i, .faux-cartes i { display: block; background: var(--jeu-encre); box-shadow: var(--ombre-papier); opacity: .55; }
  .faux-haut i { width: 44px; height: 44px; } .faux-haut i.large { width: 180px; }
  .faux-cartes { position: fixed; left: var(--pas); right: var(--pas); bottom: var(--pas); display: flex; gap: var(--pas); height: 88px; }
  .faux-cartes i { flex: 1; max-width: 112px; border-top: 3px solid var(--jeu-nous); }
  .infobulle { position: fixed; }
`;
function cadre(stage, corps, { fin = false, css }) {
  const zone = Object.assign(document.createElement('div'), { className: 'pn-labo' });
  const tailles = Object.assign(document.createElement('div'), { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 8px;font:13px/1.4 ui-monospace,monospace' });
  const mesures = Object.assign(document.createElement('div'), { style: 'font:13px/1.5 ui-monospace,monospace;margin:8px 0;white-space:pre-wrap' });
  const boite = Object.assign(document.createElement('div'), { style: 'position:relative;overflow:hidden;border:1px solid rgba(0,0,0,.3);border-radius:4px' });
  const f = document.createElement('iframe');
  f.title = 'Un écran du jeu, en petit';
  f.style.cssText = 'border:0;transform-origin:0 0;position:absolute;left:0;top:0';
  f.srcdoc = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="js/lib/game.css"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/ds-v2.css"><style>${CSS_CADRE}${css}</style></head>
<body>${fin ? '' : '<div class="faux-haut"><i></i><i></i><i class="large"></i></div><div class="faux-cartes">' + '<i></i>'.repeat(8) + '</div>'}<div id="bulle" class="infobulle" hidden></div></body></html>`;
  boite.append(f); zone.append(tailles, boite, mesures); stage.append(zone);
  let taille = TAILLES[1];
  const poser = ([w, h]) => {
    taille = [w, h];
    const k = Math.min(1, (zone.clientWidth || 900) / w);
    f.width = w; f.height = h; f.style.transform = `scale(${k})`; boite.style.height = `${Math.ceil(h * k)}px`;
    for (const b of tailles.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.t === `${w}×${h}`));
  };
  for (const t of TAILLES) { const b = document.createElement('button'); b.type = 'button'; b.className = 'bouton'; b.dataset.t = `${t[0]}×${t[1]}`; b.textContent = `${t[0]} × ${t[1]}`; b.onclick = () => poser(t); tailles.append(b); }
  const mesurer = () => {
    const D = f.contentDocument, p = D.querySelector('.papier');
    const lignes = TAILLES.map(([w, h]) => {
      f.width = w; f.height = h;
      const r = p.getBoundingClientRect(), defile = Math.max(0, p.scrollHeight - p.clientHeight), large = Math.max(0, p.scrollWidth - p.clientWidth);
      const inner = [...p.querySelectorAll('*')].filter(x => x.scrollHeight > x.clientHeight + 1 && /auto|scroll/.test(D.defaultView.getComputedStyle(x).overflowY)).length;
      const cartes = fin ? 0 : Math.max(0, Math.round(r.bottom - (h - CARTES)));
      const ok = !defile && !large && !inner && !cartes;
      return `${ok ? '✓' : '✗'} ${w} × ${h} : ${defile ? `défile de ${defile} px` : 'aucun défilement'}${large ? `, déborde de ${large} px en largeur` : ''}${inner ? `, ${inner} zone(s) qui défile(nt)` : ''}${fin ? '' : cartes ? `, recouvre les cartes de ${cartes} px` : `, ${Math.round(h - CARTES - r.bottom)} px au-dessus des cartes`} ; papier ${Math.round(r.width)} × ${Math.round(r.height)}`;
    });
    mesures.textContent = lignes.join('\n');
    poser(taille);
  };
  f.onload = () => {
    const D = f.contentDocument;
    D.body.append(D.adoptNode(corps));
    // l'infobulle du jeu, en petit : `data-info` au survol
    const bulle = D.getElementById('bulle');
    D.addEventListener('pointerover', ev => { const c = ev.target.closest?.('[data-info]'); if (!c) { bulle.hidden = true; return; } bulle.innerHTML = lignesInfo(c.dataset.info); bulle.hidden = false; const r = c.getBoundingClientRect(); bulle.style.left = `${Math.min(r.left, D.documentElement.clientWidth - 300)}px`; bulle.style.top = `${r.bottom + 6 > D.documentElement.clientHeight - 120 ? r.top - bulle.offsetHeight - 6 : r.bottom + 6}px`; });
    D.fonts?.ready.then(mesurer) ?? mesurer();
  };
  poser(taille);
  const ro = new ResizeObserver(() => poser(taille)); ro.observe(zone);
  return () => ro.disconnect();
}

// ─── Les feuilles des variantes (ce qui passera dans css/style.css) ──────
export const CSS_NUIT = `
/* (le commun et la variante A sont dans css/style.css, « Le papier de la nuit ») */
/* B : les étages */
.pn-vb { grid-template-columns: minmax(0, 1fr); grid-template-areas: "tete" "ordres" "bande"; }
.pn.pn-vb:not(.aube) { row-gap: var(--pas); }
.pn-vb .pn-regs { --etat: minmax(0, 1fr); }
.pn-bande { grid-area: bande; display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto auto; gap: var(--pas); }
.pn-vb .pn-bande .pn-graphe:not(:first-of-type), .pn-vb .pn-t-morts .pn-graphe { display: none; }
.pn-vb .pn-bande .bi-faits li:nth-child(n+3) { display: none; }
.pn-vb .pn-bande .pn-meds-icones .pn-med.seule { min-height: var(--jeu-cible); }
.pn-bande .pn-meds-icones { flex-wrap: nowrap; gap: var(--e1); }
.pn-bande .bi-faits li span, .pn-bande .pn-duo span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-bande .bi-faits li { min-width: 0; }

/* C : le tableau croisé */
.pn-vc { grid-template-columns: minmax(0, auto) minmax(180px, 1fr); grid-template-areas: "tete tete" "ordres jour"; }
.pn-croise { grid-template-columns: var(--jeu-cible) minmax(11ch, 15ch) 6ch 7ch 48px 6ch 5ch repeat(var(--n), minmax(var(--jeu-cible), 52px)); }
.pn-croise .pn-cs { grid-column: 8 / -1; }
.pn-croise .pn-r-tous .pn-cs, .pn-croise .pn-r .pn-cs { grid-column: 8 / -1; }
.pn-croise button.pn-c { width: 100%; }
.pn-h { font-size: var(--texte-petit); color: var(--jeu-accent); white-space: nowrap; }
.pn-hc { display: grid; justify-items: center; gap: 2px; color: var(--jeu-fond); font-size: 11px; overflow: hidden; }
.pn-num { text-align: right; font-size: var(--texte-petit); }
.pn-num.fort { font-size: var(--texte); }
/* D : le front */
.pn-vd { grid-template-columns: minmax(0, 1fr); grid-template-areas: "tete" "ordres" "bande"; }
.pn-front { display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: var(--pas); }
.pn-col { display: grid; gap: var(--e1); align-content: start; min-width: 0; padding-top: var(--e1); border-top: 3px solid var(--jeu-nous); }
.pn-col.choisi { background: var(--jeu-brume); outline: 4px solid var(--jeu-brume); }
.pn-col-tous { border-top-color: var(--jeu-fond); }
.pn-col-tous button.pn-tous { grid-column: auto; }
.pn-col-etat { display: grid; grid-template-columns: var(--jeu-cible) minmax(0, 1fr); gap: var(--e1); align-items: start; }
.pn-col-tous .pn-col-etat { grid-template-columns: minmax(0, 1fr); }
.pn-col .pn-nom { min-height: var(--jeu-cible); }
.pn-col .pn-nom { display: flex; align-items: baseline; gap: var(--e1); }
.pn-col .pn-nom b { font-size: var(--texte-moyen); }
.pn-col .pn-nom span { font-size: var(--texte-petit); }
.pn-vert { display: grid; gap: var(--e0); font-size: var(--texte-petit); align-content: start; min-width: 0; }
.pn-vert .pn-barre .bi { width: 100%; }
.pn-ligne { display: flex; align-items: center; justify-content: space-between; gap: var(--e1); }
.pn-col .pn-cs { grid-column: auto; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--e1); }
.pn-col .pn-cs button.pn-c { width: 100%; }
.pn-col .pn-contact { grid-column: 1 / -1; flex-direction: column; justify-content: center; text-align: center; min-height: calc(4 * var(--jeu-cible) + 3 * var(--e1)); }

`;
export const CSS_FIN = `
/* (le commun et la variante A sont dans css/style.css) */
.fin { position: fixed; inset: var(--e5); margin: auto; width: min(1320px, calc(100vw - 2 * var(--e5))); height: fit-content; max-height: calc(100dvh - 2 * var(--e5)); box-sizing: border-box; }
/* B : la frise */
.pf-b { grid-template-columns: minmax(0, 1fr); grid-template-areas: "issue" "bataille" "meds"; }
.fin-cal { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--e1); }
.fin-cal-j { display: grid; justify-items: stretch; gap: 2px; padding: var(--e1); border: 1px solid var(--jeu-accent); text-align: center; }
.fin-cal-j .fin-j { justify-content: center; }
.fin-cal-b { height: 36px; display: flex; align-items: flex-end; justify-content: center; border-bottom: 1px solid var(--jeu-fond); }
.fin-cal-b.eux { align-items: flex-start; border-bottom: 0; }
.fin-cal-b i { width: 40%; display: block; border: 1px solid var(--jeu-fond); }
.fin-cal-b i.n { background: var(--jeu-nous); } .fin-cal-b i.e { background: var(--jeu-eux); }
.fin-cal-v { font-size: var(--texte-petit); line-height: 1; }
.fin-cal-l { display: block; height: 8px; background: var(--jeu-eux); border: 1px solid var(--jeu-fond); }
.fin-cal-l i { display: block; height: 100%; background: var(--jeu-nous); border-right: 1px solid var(--jeu-fond); }
.fin-cal-j .fin-ms { min-height: 44px; align-content: flex-start; }
.fin-meds-col { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: var(--e4); align-items: start; }
.fin-meds-col .pn-meds { align-content: start; }
.fin-meds-col .pn-meds-l { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
.fin-meds-col .pn-meds:not(:first-child) .pn-meds-l { grid-template-columns: minmax(0, 1fr); }
/* C : le registre des jours */
.pf-c { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "issue issue" "bataille meds"; }
.fin-reg { display: grid; }
.fin-reg-l { display: grid; grid-template-columns: 6ch minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 1.2fr); gap: var(--pas); align-items: center; min-height: 26px; border-bottom: 1px dotted var(--jeu-accent); padding: 0 var(--e1); }
.fin-reg-tete { font-size: var(--texte-petit); color: var(--jeu-accent); }
.fin-reg-l .fin-ms { justify-content: flex-start; }
.fin-duel { display: grid; grid-template-columns: 3ch 1fr 1fr 3ch; align-items: center; gap: 0; font-size: var(--texte-petit); }
.fin-duel b { font-weight: normal; text-align: right; padding-right: var(--e1); }
.fin-duel b:last-child { text-align: left; padding: 0 0 0 var(--e1); }
.fin-duel i { display: block; height: 10px; border: 1px solid var(--jeu-fond); box-sizing: border-box; }
.fin-duel i.n { justify-self: end; background: var(--jeu-nous); } .fin-duel i.e { background: var(--jeu-eux); }
`;

export function papierNuit(stage, variante) { return cadre(stage, NUITS[variante](nuitExemple()), { css: CSS_NUIT }); }
export function finDePartie(stage, variante) { return cadre(stage, FINS[variante](finExemple()), { fin: true, css: CSS_NUIT + CSS_FIN }); }
