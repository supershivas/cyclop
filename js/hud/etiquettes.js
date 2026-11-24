// Les étiquettes des régiments sur le champ (sorti de main.js, lot de dette du 24 nov.) : la bannière de chaque régiment au-dessus de lui,
// le petit nom de ses isolés, le repère du soldat dont la fiche est ouverte et celui du dernier ordre. Le clic sur une étiquette reste à main.js
// (il change la sélection). `creerEtiquettes(ctx)` rend { construire, maj, vider, oublier, centres } (`centres` : le centre du gros de chaque régiment).
import { secteursDe } from '../bataille.js?v=0.169.0';
import { amasDe, isoles } from '../amas.js?v=0.169.0';
import { ecussonHtml, reglerEcusson } from './ecussons.js?v=0.169.0';
import { corveeCourte } from './nuit.js?v=0.169.0';
import * as lecture from './lecture.js?v=0.169.0';

let $, rendu, R, bataille, moi, choisis, nuit, chevronsVus, fiche, marque;
export function creerEtiquettes(ctx) {
  ({ $, rendu, R, bataille, moi, choisis, nuit, chevronsVus, fiche, marque } = ctx);
  return { construire, maj, centres, oublier: () => etiq.clear(), vider: () => { $('etiquettes').replaceChildren(); etiq.clear(); etiqIsoles.length = 0; } };
}
const etiq = new Map();
function construire() {
  const B = bataille(), MOI = moi();
  $('etiquettes').replaceChildren();
  etiq.clear(); etiqIsoles.length = 0;
  for (const r of B.etat.regiments) {
    if (r.camp !== MOI) continue;
    const d = document.createElement('div');
    d.className = 'etiquette reg-ecu'; d.dataset.id = r.id;
    d.innerHTML = ecussonHtml('reg', 'nous');      // v0.141.0 : la bannière du régiment, son numéro dedans (hud/ecussons.js) ; le nom et le statut sont dans l'infobulle
    $('etiquettes').append(d);
    etiq.set(r.id, { d, cle: '' });
  }
}
const centres = new Map();
// les isolés d'un régiment (un amas à part du gros, v0.116.1) ont leur propre petit nom, au-dessus d'eux : « 3 · 12 isolés »
const etiqIsoles = [];
function etiquetteIsolee(k) {
  let e = etiqIsoles[k];
  if (!e) {
    const d = document.createElement('div');
    d.className = 'etiquette isole';
    d.innerHTML = '<b class="num"></b><span class="cart-corps"><span class="nom"></span></span>';
    $('etiquettes').append(d);
    e = etiqIsoles[k] = { d, num: d.querySelector('.num'), nom: d.querySelector('.nom'), cle: '' };
  }
  return e;
}
function maj() {
  const B = bataille(), MOI = moi(), m_ = marque();
  // (un régiment frais est arrivé à l'aube : son nom au-dessus de lui aussi)
  if (etiq.size !== B.etat.regiments.filter(r => r.camp === MOI).length) construire();
  centres.clear();
  const groupes = amasDe(B, { camp: MOI });
  for (const [id, g] of groupes) centres.set(id, g.amas[0]);
  for (const [id, e] of etiq) {
    const d = e.d, g = groupes.get(id), c = g && g.amas[0];
    if (!c) { d.hidden = true; continue; }
    const [sx, sy] = rendu.versEcran(c.x, c.ymin - 2);
    // hors de l'écran : caché (sinon il dépasse, et l'audit d'écran le voit amputé)
    d.hidden = sx < 30 || sy < 20 || sx > innerWidth - 30 || sy > innerHeight;
    if (d.hidden) continue;
    d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    // le numéro, la barre (debout, blessés : tous ses hommes, où qu'ils soient), les chevrons, le moral, choisi ; l'infobulle : « 3 · Viride · B », puis « Tient », ou le moral quand il baisse, ou la corvée de la nuit
    const reg = B.etat.regiments[id], niv = lecture.niveauMoral(reg, R);
    const statut = niv === 'deroute' ? 'En déroute' : niv === 'ebranle' ? 'Ébranlé' : nuit.etat === 'choix' && nuit.corvees[id] ? corveeCourte(nuit.corvees[id]) : lecture.statutOrdre(B, reg);
    const debout = Math.max(0, g.n - g.bl);
    reglerEcusson(d, { debout: debout / reg.initial, blesses: g.bl / reg.initial, num: lecture.numeroDe(B, reg), chev: chevronsVus.get(id) ?? 0, moral: niv === 'deroute' || niv === 'ebranle' ? niv : 'tient', choisi: choisis().has(id) });
    const cle = `${lecture.numeroDe(B, reg)}|${reg.nom}|${secteursDe(B, reg)}|${statut}|${debout}|${g.bl}`;
    if (cle === e.cle) continue;
    e.cle = cle;
    d.dataset.info = `# ${lecture.numeroDe(B, reg)} · ${reg.nom}\n## ${statut}\nSecteur | ${secteursDe(B, reg)}\nDebout | **${debout}**\nBlessés | **${g.bl}**\nTombés | ${reg.pertes}\nUn clic : le choisir (Maj : l'ajouter).`;
    d.setAttribute('aria-label', `${lecture.numeroDe(B, reg)} · ${reg.nom} : ${statut.toLowerCase()}, ${debout} debout, ${g.bl} blessés`);
  }
  // les isolés : un petit nom par amas à part ; un clic le choisit comme le nom du régiment (`$('etiquettes').onclick`)
  let k = 0;
  for (const [id, g] of groupes) {
    if (!etiq.has(id)) continue;
    for (const a of isoles(g)) {
      const e = etiquetteIsolee(k++), d = e.d, reg = B.etat.regiments[id];
      const [sx, sy] = rendu.versEcran(a.x, a.ymin - 2);
      d.hidden = sx < 30 || sy < 20 || sx > innerWidth - 30 || sy > innerHeight;
      if (d.hidden) continue;
      d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      d.dataset.id = id;
      d.classList.toggle('choisi', choisis().has(id));
      const cle = `${lecture.numeroDe(B, reg)}|${a.n}`;
      if (cle === e.cle) continue;
      e.cle = cle;
      e.num.textContent = lecture.numeroDe(B, reg); e.nom.textContent = `${a.n} isolés`;
      d.setAttribute('aria-label', `${lecture.numeroDe(B, reg)} · ${reg.nom} : ${a.n} hommes isolés du reste du régiment`);
    }
  }
  for (; k < etiqIsoles.length; k++) etiqIsoles[k].d.hidden = true;
  const rs = $('repere-soldat'), is = fiche.ouverte ? lecture.indiceDe(B, fiche.ouverte.id) : -1;
  if (is >= 0) {
    const [sx, sy] = rendu.versEcran(B.armee.x[is], B.armee.y[is]);
    rs.hidden = false; rs.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
  } else rs.hidden = true;
  const m = $('repere');
  if (m_ && m_.t > 0) {
    const [sx, sy] = rendu.versEcran(m_.x, m_.y);
    m.hidden = false; m.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
  } else m.hidden = true;
}
