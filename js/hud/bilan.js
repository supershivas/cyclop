// Le bilan du soir en tuiles (Jérôme, 8 nov. : « passe le bilan du soir en jeu » ; le tableau de bord du sujet « Les données » du labo, retenu) : lecture seule de la journée (`lireJournee`, js/donnees-jour.js),
// des tuiles de papier (un titre, un chiffre, un graphique, un mot) et des graphiques en SVG dont les couleurs viennent du CSS (`.bi-nous`, `.bi-eux` : les variables `--jeu-*`, cerclées de terre comme les pastilles
// de la carte : aucune couleur écrite ici). La forme porte l'information (plein : debout, hachuré : blessés, pointillé : évacués, contour : tombés ; ▼ perte, ▲ gain, ◆ alerte, ○ calme) ; l'orange et le rouge d'alerte
// ne confirment que le moral. Des fonctions de DOM qui ne lisent que ce qu'on leur donne (jamais la bataille : `nuit.js` la lit pour elles).
import { faitsMarquants } from '../donnees-jour.js?v=0.128.0';

const el = (tag, cls = '', ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.flat().filter(k => k != null)); return e; };
const svgHtml = (cls, w, h, corps, nom) => `<svg class="bi ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${nom}" preserveAspectRatio="xMinYMid meet">${corps}</svg>`;
const enHtml = h => { const d = el('div', 'bi-boite'); d.innerHTML = h; return d; };
const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
let uid = 0;
export const reinitIds = () => { uid = 300; };       // les identifiants des motifs repartent d'un point fixe quand une fiche est refaite (l'empreinte du HUD)
const C = ['nous', 'eux'];

/* La barre d'effectifs d'un camp : debout (plein), blessés (hachuré), évacués (pointillé), tombés (contour) ; `echelle` : l'effectif qui remplit la largeur (le même pour les deux camps) */
export function barreEffectif(u, c, { echelle = u.initial, larg = 220, haut = 14 } = {}) {
  const id = `bi-h${++uid}`, k = larg / echelle;
  let x = 0; const segs = [];
  const seg = (n, cls) => { if (n > 0) segs.push(`<rect class="${cls}" x="${(x + 0.5).toFixed(1)}" y="1" width="${Math.max(1, n * k - 1).toFixed(1)}" height="${haut - 2}"/>`); x += n * k; };
  seg(u.debout, `bi-${C[c]}`); seg(u.blesses, `bi-hachure bi-${C[c]}-h`); seg(u.evacues, 'bi-pointille'); seg(u.morts, 'bi-contour');
  const corps = `<defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="bi-${C[c]}-fond" width="2" height="4"/></pattern></defs>`.replace('bi-hachure', '');
  return svgHtml(`bi-barre`, larg, haut, corps + segs.join('').replace(/class="bi-hachure bi-(nous|eux)-h"/g, `class="bi-hachure" fill="url(#${id})"`), `${u.debout} debout, ${u.blesses} blessés, ${u.evacues} évacués, ${u.morts} morts sur ${u.initial}`);
}
/* Les morts de chaque jour en petits bâtons (le dernier plein), sur une échelle commune aux deux camps */
export function batons(valeurs, c, { max = Math.max(1, ...valeurs), total = valeurs.length, larg = 220, haut = 26 } = {}) {
  const w = larg / Math.max(1, total), b = Math.min(14, w - 3);
  const barres = valeurs.map((v, k) => { const h = Math.max(v > 0 ? 2 : 0, v / max * (haut - 6)); return `<rect class="bi-${C[c]}${k === valeurs.length - 1 ? '' : ' bi-creux'}" x="${(k * w + (w - b) / 2).toFixed(1)}" y="${(haut - 1 - h).toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}"><title>Jour ${k + 1} : ${v}</title></rect>`; }).join('');
  return svgHtml('bi-batons', larg, haut, `${barres}<line class="bi-base" x1="0" x2="${larg}" y1="${haut - 0.5}" y2="${haut - 0.5}"/>`, `Morts par jour : ${valeurs.join(', ')}`);
}
/* La jauge de moral d'un régiment : un trait, deux repères (déroute, ébranlé) ; `niveau` : la couleur d'alerte qui confirme le mot */
export function jaugeMoral(m, niveau, { larg = 80, haut = 10 } = {}) {
  return svgHtml(`bi-moral bi-${niveau}`, larg, haut, `<rect class="bi-cadre" x="0.5" y="2.5" width="${larg - 1}" height="${haut - 5}"/><rect class="bi-niveau" x="1" y="3" width="${((larg - 2) * Math.max(0, Math.min(1, m))).toFixed(1)}" height="${haut - 6}"/>`
    + [0.25, 0.5].map(r => `<line class="bi-repere" x1="${larg * r}" x2="${larg * r}" y1="0" y2="${haut}"/>`).join(''), `Moral ${Math.round(m * 100)} %`);
}
/* Les tronçons : une case chacun, pleine pour qui le tient (nous à gauche, eux à droite) */
export function troncons(tenus, total = 32, larg = 220) {
  const tous = tenus[0] + tenus[1] || total, w = larg / tous, g = w > 5 ? 2 : w > 2.5 ? 1 : 0;   // l'écart entre deux cases se réduit quand elles sont nombreuses (128 tronçons dans un grand secteur)
  return svgHtml('bi-troncons', larg, 14, Array.from({ length: tous }, (_, k) => `<rect class="${k < tenus[0] ? 'bi-nous' : k >= tous - tenus[1] ? 'bi-eux' : 'bi-vide'}" x="${(k * w + g / 2).toFixed(1)}" y="1" width="${Math.max(0.5, w - g).toFixed(1)}" height="12"/>`).join(''), `Tronçons tenus : nous ${tenus[0]}, en face ${tenus[1]}`);
}
/* Le pictogramme d'un fait : la forme dit le genre */
export function fait(genre) {
  const f = { perte: '<path class="bi-plein" d="M2 3h12L8 14z"/>', gain: '<path class="bi-nous" d="M2 13h12L8 2z"/>', alerte: '<path class="bi-alerte" d="M8 1l7 7-7 7-7-7z"/><rect class="bi-alerte-p" x="7" y="4" width="2" height="5"/><rect class="bi-alerte-p" x="7" y="10.5" width="2" height="2"/>', calme: '<circle class="bi-anneau" cx="8" cy="8" r="5"/>' }[genre];
  return `<svg class="bi-fait" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${f}</svg>`;
}

const chiffre = (n, nom, cls = '', aide = '') => { const d = el('div', `bi-chiffre ${cls}`, el('b', '', String(n)), el('span', '', nom)); if (aide) d.title = aide; return d; };
const tuile = (titre, ...k) => el('section', 'tuile', el('h4', '', titre), ...k);

/* Les tuiles du soir : `d` (lireJournee), `plus` : { reserve (régiments frais en réserve ou null), lignes (la phrase des tronçons du jour) }. Rend un tableau de tuiles prêtes à poser. */
export function tuilesDuSoir(d, plus = {}) {
  uid = 0;       // les identifiants des motifs repartent de zéro : l'empreinte du HUD ne dépend pas du nombre de bilans déjà dessinés
  const [n, e] = d.camps, j = d.jour - 1, max = Math.max(...n.mortsParJour, ...e.mortsParJour, 1), base = Math.max(n.initial, e.initial);
  const faits = faitsMarquants(d, 4);
  const aRetenir = tuile('À retenir', el('ul', 'bi-faits', ...faits.map(f => { const li = el('li', ''); li.innerHTML = fait(f.genre); li.append(el('span', '', f.texte)); return li; })));
  const effectifs = tuile('Effectifs', ...[0, 1].map(c => { const u = d.camps[c]; return el('div', 'bi-ligne', el('div', `bi-legende bi-t-${C[c]}`, el('span', '', c ? 'En face' : 'Nous'), el('b', '', `${u.debout} debout sur ${u.initial}`)), enHtml(barreEffectif(u, c, { echelle: base }))); }),
    el('p', 'discret bi-note', `Blessés ${n.blesses} · évacués ${n.evacues} · tombés ${n.morts}`));
  const pertes = tuile('Les morts du jour', el('div', 'bi-chiffres', chiffre(n.mortsJour, 'chez nous', 'bi-t-nous', 'Les hommes tombés chez nous aujourd\'hui, de leurs blessures du matin comprises'), chiffre(e.mortsJour, 'en face', 'bi-t-eux', 'Les hommes tombés en face aujourd\'hui'), chiffre(n.blessesParJour[j] ?? 0, 'blessés chez nous', '', 'Les nouvelles blessures chez nous aujourd\'hui')),
    enHtml(batons(n.mortsParJour, 0, { max, total: d.jours })), enHtml(batons(e.mortsParJour, 1, { max, total: d.jours })), el('p', 'discret bi-note', `Jour après jour, sur ${d.jours} jours : nous en haut, en face dessous.`));
  const lignes = tuile('Les lignes', el('div', 'bi-chiffres', chiffre(d.tronconsTenus[0], 'tenus par nous', 'bi-t-nous'), chiffre(d.tronconsTenus[1], 'tenus par eux', 'bi-t-eux'), ...(plus.reserve != null ? [chiffre(plus.reserve, 'régiments frais', '', 'Les régiments frais qui attendent la relève')] : [])),
    enHtml(troncons(d.tronconsTenus, d.tronconsTenus[0] + d.tronconsTenus[1])), plus.lignes ? el('p', '', plus.lignes) : null);
  const ciel = tuile('Le ciel', el('div', 'bi-chiffres', chiffre(n.avions.sorties, n.avions.sorties > 1 ? 'sorties' : 'sortie'), chiffre(n.avions.perdus, n.avions.perdus > 1 ? 'abattus' : 'abattu'), chiffre(n.avions.restent, 'restent', '', 'Les avions réparés cette nuit')), plus.avions ? el('p', 'discret bi-note', plus.avions) : null);
  return [aRetenir, effectifs, pertes, lignes, ciel];
}
/* Nos régiments : le numéro, l'effectif (la barre), le moral (la jauge), les morts du jour ; seulement ceux qui ont encore des hommes */
export function liste(d, { echelle = 14 } = {}) {
  uid = 100;
  const t = el('div', 'bi-regs', el('div', 'bi-reg bi-reg-tete', el('span', '', 'Rég.'), el('span', '', 'Effectif'), el('span', '', 'Moral'), el('span', 'bi-droite', 'Jour')));
  for (const r of d.camps[0].regiments.filter(r => r.debout + r.blesses > 0)) {
    const pt = r.niveau === 'deroute' ? ' !!' : r.niveau === 'ebranle' ? ' !' : '';
    const ligne = el('div', 'bi-reg', el('span', 'bi-num', `${r.numero}${pt}`), enHtml(barreEffectif(r, 0, { echelle: Math.max(echelle, r.initial), larg: 120, haut: 12 })), enHtml(jaugeMoral(r.moral, r.niveau)), el('span', 'bi-droite', r.mortsJour ? `−${r.mortsJour}` : '·'));
    ligne.title = `${r.nom ? `Régiment ${r.nom}` : 'Régiment'} : ${r.debout} debout, ${r.blesses} blessés, ${r.morts} morts, moral ${Math.round(r.moral * 100)} %`;
    t.append(ligne);
  }
  return t;
}
