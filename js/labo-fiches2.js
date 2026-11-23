// « Les fiches », deuxième jet (Jérôme, 20 nov. : « propose un nouveau design mieux organisé pour les fiches des soldats, des chars, des avions, des régiments ; revois la carte de fin
// de journée pour l'inspiration (header en noir, etc.) »). PROPOSITION : rien n'est en jeu.
// Une seule charpente pour les quatre fiches (et la fiche d'un mort), reprise de la soirée :
//   1. la bande noire : l'écusson de l'unité, son nom (le titre de la soirée), qui il est en une ligne, un tampon d'état (Tient, Ébranlé, En marche, Tombé), les icônes (vue verrouillée, fermer) ;
//   2. quatre chiffres clés, toujours à la même place : le gros chiffre, son mot, une petite barre ;
//   3. deux colonnes de la même hauteur : « Maintenant » (ce qui change sous nos yeux : jauges, ordre en cours) et « Son parcours » (ce qui s'accumule : courbe, expérience, victimes) ;
//   4. le pied : à gauche le lien ou l'action secondaire, à droite UN bouton rouge sang, l'action qui fait entrer dans l'unité (voir par ses yeux, monter à bord, choisir le régiment).
// Les pièces sont celles du jeu (écussons, jauges, caractéristiques et leur encoche, silhouette du corps, courbe soir après soir) ; l'exemple est fixe (un 6e jour).
import { el, html, info, bouton } from './hud/papier-nuit.js?v=0.165.0';
import { jauge, carac, bande, partage, fil } from './hud/tuiles.js?v=0.165.0';
import { corps, chevronsHtml, REPERES } from './hud/barres.js?v=0.165.0';
import { jaugeMoral } from './hud/bilan.js?v=0.165.0';
import { ecussonHtml, reglerEcusson } from './hud/ecussons.js?v=0.165.0';
import { cadre } from './labo-papiers.js?v=0.165.0';

const I = {
  oeil: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  cadre: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><circle cx="12" cy="12" r="2.5"/></svg>',
  fermer: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  marcher: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L20 4M20 4h-8M20 4v8"/></svg>',
  cible: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/></svg>',
  arret: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>',
  libre: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></svg>',
  parc: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7M5 10v10h14V10"/></svg>',
};

// ─── Les morceaux de la charpente ───
const icone = (k, nom, presse = false) => { const b = bouton('fx-icone', html('span', '', I[k])); b.setAttribute('aria-label', nom); if (presse) b.setAttribute('aria-pressed', 'true'); return info(b, `# ${nom}`); };
function bandeau({ type, num, chev, moral = 'tient', debout = 1, blesses = 0, detruit = false, nom, qui, tampon, alerte = '', vue = true }) {
  const ec = html('span', 'fx-ec', ecussonHtml(type, 'nous'));
  reglerEcusson(ec, { debout, blesses, num, chev, moral, detruit });
  const t = el('div', 'fx-titre', el('h2', '', nom), el('p', '', qui));
  const tp = tampon ? el('span', `fx-tampon${alerte ? ` ${alerte}` : ''}`, tampon) : null;
  return el('header', 'fx-bande', ec, t, tp, el('div', 'fx-icones', vue ? icone('cadre', 'Vue verrouillée') : null, icone('fermer', 'Fermer la fiche')));
}
// un chiffre clé : le chiffre, son unité, un mot, une petite barre (svg) ; `aide` : l'infobulle
const cle = (chiffre, unite, mot, svg = '', aide = '') => info(el('div', 'fx-cle', el('div', 'fx-cle-c', el('b', '', String(chiffre)), el('span', '', unite)), svg ? html('div', 'fx-cle-g', svg) : null, el('small', '', mot)), aide || `# ${mot}`);
const cles = (...l) => el('div', 'fx-cles', ...l);
// une rangée « nom · graphique · mot » (le langage des tuiles du jeu)
const rang = (nom, svg, mot = '') => el('div', 'fx-rang', el('span', 'fx-nom', nom), html('div', 'fx-g', svg), el('span', 'fx-mot', mot));
const bloc = (titre, ...kids) => el('section', 'fx-bloc', el('h4', '', titre), ...kids);
const colonnes = (gauche, droite, [tg, td] = ['Maintenant', 'Son parcours']) => el('div', 'fx-corps', el('div', 'fx-col', el('h3', '', tg), ...gauche), el('div', 'fx-col', el('h3', '', td), ...droite));
function pied(gauche, action) {
  const a = action ? bouton('bouton ps-action fx-action', action) : el('span');
  return el('footer', 'fx-bas', el('div', 'fx-bas-g', ...gauche), a);
}
const lien = (t, aide) => info(bouton('fx-lien', t), aide);
const chev = n => n ? html('span', 'fx-chev', chevronsHtml(n)) : el('span', 'fx-chev', 'novice');
const exp = (v, n, mot) => bloc('Expérience', rang('', jauge(v, { reperes: REPERES.exp, larg: 220 }), ''), el('p', 'fx-note', chev(n), ` ${mot}`));
const fiche = (...kids) => kids;

// ─── Les cinq fiches (l'exemple) ───
function soldat() {
  return fiche(
    bandeau({ type: 'reg', num: 1, chev: 2, nom: 'Jean Lefebvre', qui: 'Sergent, 23 ans · 1 · Régiment Porphyre', tampon: 'Inquiet', alerte: 'orange' }),
    cles(cle(6, 'jours', 'au front, depuis le 1er', '', '# Au front\nDepuis | le jour 1\nAujourd\'hui | le jour 6'),
      cle(4, 'hommes', 'abattus au fusil', bande(4, 10, { larg: 100, haut: 8, pas: 1 })),
      cle('▲▲', '', 'Aguerri · tir +6 %', '', '# Expérience\nChevrons | **2**\nBonus | tir +6 %, peur −10 %'),
      cle('Bras', 'droit', 'blessé, il tire moins bien', '', '# Sa blessure\nOù | **au bras droit**\nEffet | il épaule moins vite')),
    colonnes([
      bloc('Ce qu\'il endure', rang('Peur', jauge(0.42, { reperes: REPERES.peur, larg: 120 }), 'inquiet'), rang('Jambes', jauge(0.3, { reperes: REPERES.fatigue, larg: 120 }), 'frais'), rang('Bras', jauge(0.55, { reperes: REPERES.fatigue, larg: 120 }), 'las')),
      bloc('Il fait', el('p', 'fx-ordre', 'Tient sa place en B1 · tire sur B5')),
    ], [
      el('div', 'fx-deux', bloc('Son corps', html('div', 'fx-corps-s', corps(1, 6))),
        bloc('Ses caractéristiques', rang('Tir', carac(61, 52, { larg: 96 }), '61 ↑'), rang('Force', carac(44, 44, { larg: 96 }), '44'), rang('Endur.', carac(36, 40, { larg: 96 }), '36 ↓'), rang('Calme', carac(58, 47, { larg: 96 }), '58 ↑'))),
      exp(0.31, 2, 'aguerri · prochain grade : adjudant, si un supérieur tombe'),
    ]),
    pied([lien('← Son régiment', '# Le régiment Porphyre\nUn clic | sa fiche')], 'Voir par ses yeux'));
}
function mort() {
  return fiche(
    bandeau({ type: 'reg', num: 1, chev: 2, debout: 0, detruit: true, nom: 'Jean Lefebvre', qui: 'Sergent, 23 ans · 1 · Régiment Porphyre', tampon: 'Tombé', alerte: 'sang', vue: false }),
    cles(cle('J6', '', 'tombé le 6e jour, 17 h', ''), cle(4, 'hommes', 'abattus avant de tomber', bande(4, 10, { larg: 100, haut: 8, pas: 1 })),
      cle(6, 'jours', 'au front', ''), cle('▲▲', '', 'aguerri', '')),
    colonnes([
      el('div', 'fx-deux', bloc('Son corps', html('div', 'fx-corps-s', corps(1, 6, { fatal: 'tronc' }))),
        bloc('Ce qui l\'a tué', el('p', 'fx-gros', 'Un éclat de 155'), el('p', 'fx-note', 'touché à la poitrine'), el('p', 'fx-note', 'blessé au bras le 4e jour'))),
    ], [
      bloc('Ses caractéristiques', rang('Tir', carac(61, 52, { larg: 120 }), '61'), rang('Force', carac(44, 44, { larg: 120 }), '44'), rang('Endur.', carac(36, 40, { larg: 120 }), '36'), rang('Calme', carac(58, 47, { larg: 120 }), '58')),
      bloc('Médaille', el('p', 'fx-ordre', '✝ Mort pour la patrie'), el('p', 'fx-note', 'le plus meurtrier des tombés du jour')),
    ], ['Sa mort', 'Ce qu\'il était']),
    pied([lien('← Son régiment', '# Le régiment Porphyre'), lien('Où il est tombé', '# La vue va à son corps')], null));
}
function regiment() {
  const hist = [94, 90, 86, 80, 76, 71].map((v, k) => ({ jour: k + 1, vivants: v, moral: [0.9, 0.84, 0.7, 0.62, 0.7, 0.64][k] }));
  return fiche(
    bandeau({ type: 'reg', num: 1, chev: 1, debout: 71 / 94, blesses: 9 / 94, nom: 'Régiment Porphyre', qui: '1 · secteur A · capitaine Paul Moreau', tampon: 'Tient' }),
    cles(cle(71, 'sur 94', 'debout · 9 blessés · 14 morts', partage(71, 9, { max: 94, larg: 100, haut: 8 }), '# Effectifs\nDebout | **71**\nBlessés | 9\nTombés | 14'),
      cle('64', '%', 'moral · tient bon', jaugeMoral(0.64, 'tient', { larg: 100, haut: 8 })),
      cle(23, 'hommes', 'abattus par ses fusils', ''),
      cle(3, 'tronçons', 'pris depuis le début', bande(3, 8, { larg: 100, haut: 8, pas: 1 }))),
    colonnes([
      bloc('Ses hommes, en moyenne', rang('Peur', jauge(0.35, { reperes: REPERES.peur, larg: 120 }), 'calme'), rang('Jambes', jauge(0.4, { reperes: REPERES.fatigue, larg: 120 }), 'las'), rang('Bras', jauge(0.3, { reperes: REPERES.fatigue, larg: 120 }), 'frais')),
      bloc('Vivres', rang('', bande(2, 3, { larg: 120, haut: 10, pas: 1 }), '2 nuits')),
      bloc('Il fait', el('p', 'fx-ordre', 'Tient A1 · à volonté')),
    ], [
      info(bloc('Soir après soir', html('div', 'fx-fil', fil(hist, 94, { larg: 260, haut: 56 }))), '# Soir après soir\nPlein | l\'effectif\nTirets | le moral\nLe cercle | ce soir'),
      exp(0.12, 1, 'éprouvé · tir +3 %'),
      bloc('Officiers', el('div', 'fx-puces', ...['Moreau, capitaine', 'Girard, lieutenant', 'Roux, adjudant'].map(n => lien(n, `# ${n}\nUn clic | sa fiche`)))),
    ]),
    pied([el('div', 'fx-seg', ...['À volonté', 'Feu retenu'].map((t, k) => { const b = bouton('fx-seg-b', t); b.setAttribute('aria-pressed', String(!k)); return info(b, `# ${t}\nTouche | Maj+${k + 1}`); }))], 'Choisir le régiment'));
}
function char() {
  const ordres = el('div', 'fx-ordres', ...[['marcher', 'Marcher'], ['cible', 'Cible'], ['arret', 'Arrêt'], ['libre', 'Tir libre']].map(([k, t], i) => { const b = bouton(`fx-o${i === 0 ? ' actif' : ''}`, html('span', '', I[k]), el('span', '', t)); return info(b, `# ${t}`); }));
  return fiche(
    bandeau({ type: 'char', chev: 1, debout: 0.72, nom: 'Schneider CA 1', qui: 'Char d\'assaut · sorti au 2e jour', tampon: 'En marche' }),
    cles(cle(72, '%', 'coque · réparé une fois', jauge(0.72, { larg: 100, haut: 8 })), cle('PRÊT', '', 'canon de 75 chargé', jauge(1, { larg: 100, haut: 8 })),
      cle(11, 'hommes', 'tués · 7 au canon, 4 aux mitr.', partage(7, 4, { larg: 100, haut: 8 })), cle(23, 'obus', 'tirés · 67 en soute', bande(23, 90, { larg: 100, haut: 8 }))),
    colonnes([
      bloc('Il fait', el('p', 'fx-ordre', 'Marche vers B5 : encore 59 m'), ordres),
    ], [
      bloc('Victimes', rang('Canon', partage(7, 0, { max: 11, larg: 140 }), '7'), rang('Mitr.', partage(0, 4, { max: 11, larg: 140 }), '4')),
      exp(0.2, 1, 'éprouvé · rechargement −8 %'),
    ]),
    pied([info(bouton('bouton fx-sec', html('span', '', I.parc), el('span', '', 'Rentrer au parc')), '# Rentrer au parc\nLe génie | le répare la nuit')], 'Monter à bord'));
}
function avion() {
  const passe = html('div', 'fx-passe', '<svg viewBox="0 0 260 60" role="img" aria-label="La passe"><path class="fx-passe-t" d="M10 40H250"/><path class="fx-passe-f" d="M10 40H160"/><path class="fx-passe-a" d="M160 40l-8 -5v10z"/><text x="10" y="58">B5</text><text x="236" y="58">D6</text></svg>');
  return fiche(
    bandeau({ type: 'avion', chev: 0, debout: 0.8, nom: 'Avion de mitraillage n° 2', qui: 'Aérodrome · 3e sortie', tampon: 'Mitraille' }),
    cles(cle(80, '%', 'cellule · touché une fois', jauge(0.8, { larg: 100, haut: 8 })), cle(55, 'm', 'd\'altitude', ''),
      cle('60', '%', 'de la passe faite', jauge(0.6, { larg: 100, haut: 8 })), cle(6, 'hommes', 'tués à la mitrailleuse', '')),
    colonnes([bloc('La passe', passe, el('p', 'fx-note', 'de B5 à D6 · encore 12 s au-dessus de leurs lignes'))],
      [bloc('Ses sorties', rang('1re', partage(2, 0, { max: 8, larg: 140 }), '2'), rang('2e', partage(4, 0, { max: 8, larg: 140 }), '4'), rang('3e', partage(6, 0, { max: 8, larg: 140 }), '6'))]),
    pied([el('span', 'fx-note', 'Il rentre seul au bout de sa passe')], 'Monter à bord'));
}

const VUES = [['Soldat', soldat], ['Mort', mort], ['Régiment', regiment], ['Char', char], ['Avion', avion]];
const CSS_FICHES2 = `
  .fx { position: fixed; left: var(--pas); top: 60px; width: min(660px, calc(100vw - 2 * var(--pas))); box-sizing: border-box; padding: 0 var(--e4) var(--e3); display: grid; row-gap: var(--e3);
    --action: #7a0f1c; --action-survol: #9b1426; --action-appui: #5a0a14; }
  .fx-bande { display: flex; align-items: center; gap: var(--e3); margin: 0 calc(-1 * var(--e4)); padding: var(--pas) var(--e4); background: var(--jeu-fond); color: var(--jeu-encre); }
  .fx-ec .ecusson { width: 60px; } .fx-ec .ecusson svg { width: 60px; height: 42px; }
  .fx-titre { flex: 1 1 0; min-width: 0; } .fx-titre h2 { margin: 0; color: var(--jeu-encre); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fx-titre p { margin: 0; font-size: var(--texte-petit); letter-spacing: var(--lettres-etiquette); opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fx-tampon { padding: 2px var(--pas); border: 3px double var(--jeu-encre); transform: rotate(-4deg); text-transform: uppercase; letter-spacing: var(--lettres-etiquette); font-size: var(--texte-petit); font-weight: bold; white-space: nowrap; }
  .fx-tampon.orange { border-color: var(--jeu-ebranle); color: var(--jeu-ebranle); } .fx-tampon.sang { border-color: var(--jeu-encre); background: var(--action); }
  .fx-icones { display: flex; gap: var(--e1); }
  .papier .fx-icone { width: var(--jeu-cible); min-height: var(--jeu-cible); padding: 0; display: grid; place-items: center; background: transparent; color: var(--jeu-encre); border: 1px solid var(--jeu-accent); box-shadow: none; }
  .papier .fx-icone[aria-pressed="true"] { background: var(--jeu-encre); color: var(--jeu-fond); }
  .fx-cles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid var(--jeu-accent); padding-bottom: var(--e3); }
  .fx-cle { padding: 0 var(--e3); border-left: 1px dashed var(--jeu-accent); display: grid; align-content: start; gap: var(--e1); min-width: 0; }
  .fx-cle:first-child { border-left: 0; padding-left: 0; }
  .fx-cle-c b { font-size: 28px; line-height: 1; font-family: var(--jeu-police-titre, inherit); } .fx-cle-c span { margin-left: var(--e1); font-size: var(--texte-petit); }
  .fx-cle small { font-size: var(--texte-petit); line-height: 1.3; }
  .fx-cle-g svg { display: block; width: 100%; height: 8px; }
  .fx-corps { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: var(--e4); height: clamp(196px, calc(100dvh - 448px), 300px); }
  .fx-col { display: flex; flex-direction: column; gap: var(--e3); min-width: 0; }
  .fx-col + .fx-col { border-left: 1px solid var(--jeu-accent); padding-left: var(--e4); }
  .fx-col h3 { margin: 0; font-size: var(--texte-petit); text-transform: uppercase; letter-spacing: var(--lettres-etiquette); color: var(--jeu-accent); }
  .fx-bloc h4 { margin: 0 0 var(--e1); font-size: var(--texte-petit); text-transform: uppercase; letter-spacing: var(--lettres-etiquette); }
  .fx-rang { display: grid; grid-template-columns: 7ch minmax(0, 1fr) 6ch; align-items: center; column-gap: var(--pas); min-height: 20px; }
  .fx-rang .fx-g svg { display: block; width: 100%; } .fx-mot { font-size: var(--texte-petit); text-align: right; white-space: nowrap; }
  .fx-deux { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--e3); }
  .fx-corps-s .corps { width: 40px; height: 92px; }
  .fx-ordre { margin: 0; } .fx-gros { margin: 0; font-size: var(--texte-moyen); font-weight: bold; } .fx-note { margin: 0; font-size: var(--texte-petit); }
  .fx-chev svg { width: 12px; height: 8px; stroke: currentColor; fill: none; stroke-width: 2; }
  .fx-fil svg { display: block; width: 100%; height: 56px; }
  .fx-puces { display: flex; flex-wrap: wrap; gap: var(--e1); }
  .papier .fx-lien { min-height: var(--jeu-cible); padding: 0 var(--e3); background: transparent; border: 1px dashed var(--jeu-accent); box-shadow: none; color: inherit; text-decoration: underline; }
  .fx-puces .fx-lien { min-height: 32px; font-size: var(--texte-petit); }
  .fx-ordres { display: grid; grid-template-columns: 1fr 1fr; gap: var(--e1); margin-top: var(--pas); }
  .papier .fx-o { display: flex; align-items: center; gap: var(--pas); min-height: var(--jeu-cible); padding: 0 var(--e3); }
  .papier .fx-o.actif { background: var(--jeu-fond); color: var(--jeu-encre); }
  .fx-passe svg { display: block; width: 100%; height: 60px; } .fx-passe-t { stroke: var(--jeu-accent); stroke-dasharray: 4 3; stroke-width: 2; }
  .fx-passe-f { stroke: var(--jeu-fond); stroke-width: 3; } .fx-passe-a { fill: var(--jeu-fond); } .fx-passe text { font-size: 12px; fill: var(--jeu-fond); }
  .fx-bas { display: flex; justify-content: space-between; align-items: center; gap: var(--e3); margin: 0 calc(-1 * var(--e4)); padding: var(--e3) var(--e4) 0; border-top: 1px solid var(--jeu-accent); }
  .fx-bas-g { display: flex; gap: var(--pas); align-items: center; }
  .papier .bouton.fx-action { min-width: 14rem; min-height: var(--jeu-cible); background: var(--action); color: var(--jeu-encre); border-color: var(--jeu-fond); font-weight: bold; font-size: var(--texte-moyen); }
  .papier .bouton.fx-sec { display: flex; align-items: center; gap: var(--pas); }
  .fx-seg { display: flex; } .papier .fx-seg-b { min-height: var(--jeu-cible); padding: 0 var(--e3); box-shadow: none; }
  .papier .fx-seg-b[aria-pressed="true"] { background: var(--jeu-fond); color: var(--jeu-encre); }
  .fx-vues { position: fixed; right: var(--pas); top: var(--pas); display: flex; gap: var(--e1); }
  .fx-vues .bouton[aria-pressed="true"] { background: var(--jeu-fond); color: var(--jeu-encre); }
`;

export function fiches2(stage) {
  const zone = el('section', 'papier fx'), vues = el('nav', 'fx-vues');      // (un seul papier, dont le contenu change : le cadre mesure le premier `.papier`)
  const montrer = k => { zone.replaceChildren(...VUES[k][1]()); for (const [i, b] of [...vues.children].entries()) b.setAttribute('aria-pressed', String(i === k)); };
  VUES.forEach(([nom], k) => { const b = bouton('bouton', nom); b.onclick = () => montrer(k); vues.append(b); });
  const corps = el('div', '', zone, vues);
  corps.vues = VUES.map(([nom], k) => ({ nom, f: () => montrer(k) }));
  montrer(0);
  return cadre(stage, corps, { css: CSS_FICHES2 });
}
