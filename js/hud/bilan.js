// Le bilan du soir en tuiles (Jérôme, 8 nov. : « passe le bilan du soir en jeu » ; le tableau de bord du sujet « Les données » du labo, retenu) : lecture seule de la journée (`lireJournee`, js/donnees-jour.js),
// des tuiles de papier (un titre, un chiffre, un graphique, un mot) et des graphiques en SVG dont les couleurs viennent du CSS (`.bi-nous`, `.bi-eux` : les variables `--jeu-*`, cerclées de terre comme les pastilles
// de la carte : aucune couleur écrite ici). La forme porte l'information (plein : debout, hachuré : blessés, pointillé : évacués, contour : tombés ; ▼ perte, ▲ gain, ◆ alerte, ○ calme) ; l'orange et le rouge d'alerte
// ne confirment que le moral. Des fonctions de DOM qui ne lisent que ce qu'on leur donne (jamais la bataille : `nuit.js` la lit pour elles).

const svgHtml = (cls, w, h, corps, nom) => `<svg class="bi ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${nom}" preserveAspectRatio="xMinYMid meet">${corps}</svg>`;
let uid = 0;
export const reinitIds = (base = 300) => { uid = base; };       // les identifiants des motifs repartent d'un point fixe quand une fiche est refaite (l'empreinte du HUD)
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


