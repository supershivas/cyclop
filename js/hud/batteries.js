// Les boutons des ordres de batterie (sorti de main.js, lot de dette du 24 nov.) : les trois barrages, l'avion, le char, le génie ; leur état
// (PRÊT, les secondes, « Niv. 2 »), la jauge de recharge, l'infobulle. `creerBatteries(ctx)` rend { maj, reste, nom }.
import { NOUS } from '../bataille.js?v=0.170.0';
import { CALIBRES } from '../data/calibres.js?v=0.170.0';
import { AVION, MITRAILLAGE } from '../data/mitraillage.js?v=0.170.0';
import { CHAR, CHAR_RECHARGE } from '../data/chars.js?v=0.170.0';
import { GENIE, GENIE_DATA } from '../data/genie.js?v=0.170.0';
import { METEO } from '../data/meteo.js?v=0.170.0';
import { avionsPrets, avionsRestants } from '../avions.js?v=0.170.0';
import { reparationFaite } from '../genie.js?v=0.170.0';
import { charsDispo, refusOrdre, ouverture, rechargeDe as facteurRecharge } from '../camp.js?v=0.170.0';

let $, bataille, moi, vise, nuit, BATTERIES, viser, ouvrirBatiment, boutonsBarrage = null;
export function creerBatteries(ctx) {
  ({ $, bataille, moi, vise, nuit, BATTERIES, viser, ouvrirBatiment } = ctx);
  construire();
  return { maj: majBoutonsBarrage, reste: resteBatterie, nom: cal => NOMS_BATTERIES[cal] ?? `Batterie de ${cal}` };
}
const resteBatterie = cal => { const B = bataille(); return Math.max(0, Math.ceil(((moi() === NOUS ? B.etat.batteries : B.etat.batteriesEux)[cal] ?? 0) - B.etat.temps)); };
const rechargeDe = cal => (cal === CHAR ? CHAR_RECHARGE : cal === GENIE ? GENIE_DATA.recharge : (CALIBRES[cal] ?? MITRAILLAGE).recharge) * facteurRecharge(bataille().etat, moi(), cal);
const NOMS_BATTERIES = { [CHAR]: 'Char', [AVION]: 'Avion', [GENIE]: 'Génie' };
// L'état d'un ordre de batterie, pour son bouton dans la fenêtre du bâtiment (v0.96.0 ; avant, des boutons de batterie à part, en bas à droite) : le mot court (PRÊT, les secondes, « Niv. 2 »), l'infobulle, muet ou non
function etatOrdre(cal) {
  const B = bataille(), MOI = moi(), modeBarrage = vise();
  // l'infobulle en tableau (18 nov. : jamais de bloc de texte) : `L`, une rangée par chiffre, sous le nom de l'ordre
  const e = B.etat, reste = resteBatterie(cal), pret = reste <= 0, nom = NOMS_BATTERIES[cal] ?? `Batterie de ${cal}`;
  let texte = pret ? 'PRÊT' : `${reste} s`, compte = '', muet = !pret;
  const L = pret ? [] : [`Prêt dans | **${reste} s**`];
  if (cal === GENIE) {      // les sections du génie : combien au dépôt
    const dep = e.sapeurs[MOI], en = e.genies.filter(g => g.camp === MOI).length;
    compte = `×${dep}`; if (!dep) { texte = en ? 'au travail' : 'perdues'; muet = true; }
    L.push(`Au dépôt | **${dep}** section${dep > 1 ? 's' : ''}`, `Au travail | ${en}`, `Une section | ${GENIE_DATA.hommes} hommes sans arme`, `Réparation | ${reparationFaite(e, MOI) ? 'faite aujourd\'hui' : '**disponible**'}, une par jour`);
  }
  if (cal === CHAR && charsDispo(e, MOI) !== null) {      // le stock du parc (v0.99.10)
    const n = charsDispo(e, MOI); compte = `×${n}`; if (!n) { texte = 'épuisés'; muet = true; }
    L.push(`Au parc | **${n}** char${n > 1 ? 's' : ''}`, `Plus | aux niveaux supérieurs du parc`);
  }
  if (cal === AVION) {      // la flotte (v0.57.0) : combien d'avions restent, lesquels sont en l'air, leurs points de vie
    const flotte = e.avions[MOI], restants = avionsRestants(e, MOI), prets = avionsPrets(e, MOI);
    compte = `×${restants}`; if (!restants) { texte = 'perdus'; muet = true; } else if (!prets) { texte = 'en vol'; muet = true; }
    const meteo = e.meteo[e.jour - 1];
    if (MITRAILLAGE.cloue.includes(meteo) && restants) { texte = METEO[meteo].nom.replace(/^./, c => c.toUpperCase()); muet = true; L.unshift(`**Par ${METEO[meteo].nom}, les avions restent au sol.**`); }      // le brouillard cloue les avions : le bouton est muet (v0.99.8)
    flotte.forEach((pv, k) => L.push(`Avion ${k + 1} | ${pv > 0 ? `**${Math.round(pv)}** pv` : 'perdu'}`));
  }
  const verrou = refusOrdre(e, MOI, cal);      // le camp n'a pas ce bâtiment ou pas ce niveau (v0.87.0)
  if (verrou) { texte = `Niv. ${ouverture(cal)[1]}`; compte = ''; L.splice(0, L.length, `**${verrou}**`, 'Un clic ouvre le bâtiment.'); muet = true; }
  else L.push('Clic droit | le bâtiment');
  const titre = `# ${nom}\n${L.join('\n')}`;
  return { texte, compte, titre, muet, vise: modeBarrage === cal };
}
// Les ordres de batterie gardent leurs boutons, à portée de main (Jérôme, v0.96.1 : « remettre les boutons artillerie dans l'interface » ; v0.97.0 : « idem pour avion, chars et sapeurs », et plus de pastilles du camp) :
// trois barrages puis l'avion, le char et le génie, comme avant le camp (3 + 3). L'état (PRÊT, les secondes, « Niv. 2 » quand le bâtiment n'a pas le niveau, « ×2 » les avions et les sections), la touche, la jauge.
// Un bouton prêt vise ; un bouton fermé ouvre la fenêtre de son bâtiment (pour le bâtir) ; le clic droit l'ouvre toujours (pour l'améliorer). Le même `etatOrdre` pour tous.
const ICONES_ORDRE = {
  char: '<svg viewBox="0 0 38 24" aria-hidden="true" style="max-width:38px"><path d="M3 20L6 16H28L35 20Z"/><path d="M8 16V9H24L28 16Z"/><rect class="ceinture" x="26" y="11" width="11" height="2.5"/><rect class="ceinture" x="7" y="20" width="26" height="2.5"/></svg>',
  genie: '<svg viewBox="0 0 34 26" aria-hidden="true" style="max-width:34px"><path d="M2 20h30v4H2z"/><path d="M5 20V8h4v12zM25 20V8h4v12z"/><path d="M3 5h28v4H3z"/></svg>',
  avion: '<svg viewBox="0 0 34 30" aria-hidden="true" style="max-width:34px"><path d="M15 2h4v8h14v5H19v7h6v4H9v-4h6v-7H1v-5h14z"/></svg>',
};
const BATIMENT_DE = { '75': 'artillerie', '155': 'artillerie', '220': 'artillerie', avion: 'aerodrome', char: 'chars', genie: 'sapeurs' };
const NOM_COURT = { avion: 'Avion', char: 'Char', genie: 'Génie' };
function ordreBouton(cal) {
  const B = bataille();
  if (B && refusOrdre(B.etat, moi(), cal)) { ouvrirBatiment(BATIMENT_DE[cal]); return; }
  viser(cal);
}
function construire() {
boutonsBarrage = BATTERIES.map((cal, k) => {
  const b = document.createElement('button');
  b.className = 'batterie'; b.dataset.cal = cal; b.dataset.pret = '1';
  b.setAttribute('aria-label', `${cal === CHAR ? "Char d'assaut" : cal === AVION ? 'Mitraillage aérien' : cal === GENIE ? 'Génie : refaire un pont coupé' : `Barrage de ${cal}`} (touche ${k + 1})`);
  if (ICONES_ORDRE[cal]) b.innerHTML = `${ICONES_ORDRE[cal]}<b>${NOM_COURT[cal]}</b><span>PRÊT</span>${cal === AVION || cal === GENIE || cal === CHAR ? '<em class="flotte"></em>' : ''}<i class="touche" aria-hidden="true">${k + 1}</i><u><s></s></u>`;
  else {      // l'obus debout (sa taille dit le calibre), le calibre et l'état à droite, une jauge de recharge dessous (v0.30.0)
    const H = { 75: 22, 155: 30, 220: 38 }[cal] || 28, W = { 75: 8, 155: 11, 220: 14 }[cal] || 10;
    b.innerHTML = `<svg viewBox="0 0 ${W + 4} ${H + 4}" aria-hidden="true"><path d="M2 ${H + 2}V${Math.round(H * 0.45)}Q${2 + W / 2} 1 ${2 + W} ${Math.round(H * 0.45)}V${H + 2}Z"/><rect class="ceinture" x="2" y="${H - 6}" width="${W}" height="2.5"/></svg><b>${cal}</b><span>PRÊT</span><i class="touche" aria-hidden="true">${k + 1}</i><u><s></s></u>`;
  }
  b.onclick = () => ordreBouton(cal);
  b.oncontextmenu = e => { e.preventDefault(); ouvrirBatiment(BATIMENT_DE[cal]); };      // le clic droit : le bâtiment, pour l'améliorer
  return b;
});
$('batteries').append(...boutonsBarrage);
}
function majBoutonsBarrage() {
  if (!boutonsBarrage) return;
  const B = bataille(), MOI = moi();
  $('batteries').hidden = nuit.etat === 'choix';      // la nuit, pas de barrage
  for (const b of boutonsBarrage) {
    const cal = b.dataset.cal, s = etatOrdre(cal), reste = resteBatterie(cal), pret = reste <= 0;
    b.querySelector('span').textContent = s.texte;
    const flotte = b.querySelector('em'); if (flotte) flotte.textContent = s.compte;
    // une barre se remplit pendant le chargement (le bouton est muet : grisé, sans survol, il refuse le clic), puis « PRÊT » (Jérôme, v0.73.0)
    b.querySelector('s').style.width = `${Math.round(100 * (1 - Math.max(0, Math.min(1, reste / rechargeDe(cal)))))}%`;
    b.title = s.titre;
    b.classList.toggle('vise', s.vise); b.classList.toggle('recharge', !pret); b.classList.toggle('muet', s.muet && !s.vise);
    b.setAttribute('aria-disabled', s.muet && !s.vise ? 'true' : 'false');
    if (b.dataset.pret === '0' && pret && !refusOrdre(B.etat, MOI, cal)) { b.classList.remove('vient'); void b.offsetWidth; b.classList.add('vient'); }      // l'éclair d'un instant (coupé si le système demande moins de mouvement)
    b.dataset.pret = pret ? '1' : '0';
  }
}
