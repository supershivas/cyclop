// Nos chars sur le champ et leur fiche (Jérôme, v0.81.0 : « les chars lancent des obus, avec une barre qui charge et une cible, lors de leur déplacement ; on peut leur donner d'autres ordres à la volée »).
// Sur le champ : au-dessus de chaque char à nous, une petite étiquette (sa barre de canon qui se remplit, puis PRÊT ; ses points de vie) ; de lui à sa cible, une ligne pointillée et une croix
// (de la cible qu'on lui a donnée : trait plein ; du carré d'ennemis qu'il a choisi : pointillé). Un clic sur l'étiquette le choisit. La fiche (`#char-fiche`) du char choisi : ses barres,
// « Marcher » / « Cible » (le prochain clic sur le sol), « Arrêt », « Tir libre », « Fermer ». Le dessin et les boutons seulement : les ordres partent par `surOrdre(ordre)` (main.js).
import { CHARS } from '../data/chars.js?v=0.83.2';
import { NOUS } from '../bataille.js?v=0.83.2';

const NS = 'http://www.w3.org/2000/svg';
export function creerCharsHud({ $, bataille, moi = () => NOUS, versEcran, hauteurSol, choisir, surBouton }) {
  const etiq = new Map(), svg = $('chars-cibles');
  let signature = '';
  const fraction = (B, c) => Math.max(0, Math.min(1, (B.etat.temps - (c.canonT ?? 0)) / CHARS[c.modele].canon.recharge));
  const secondes = (B, c) => Math.max(0, Math.ceil(CHARS[c.modele].canon.recharge - (B.etat.temps - (c.canonT ?? 0))));
  $('char-fiche').onclick = e => { const b = e.target.closest('[data-char]'); if (b) surBouton(b.dataset.char); };

  // appelé à chaque image : les étiquettes, les cibles, la fiche du char choisi
  function maj(choisi, mode) {
    const B = bataille();
    if (!B) return;
    const M = moi(), vivants = B.etat.chars.filter(c => c.camp === M && c.etat !== 'detruit');
    // les étiquettes
    const vus = new Set();
    for (const c of vivants) {
      vus.add(c.id);
      let e = etiq.get(c.id);
      if (!e) {
        const d = document.createElement('div'); d.className = 'char-etiq'; d.setAttribute('role', 'button'); d.tabIndex = 0; d.title = 'Choisir ce char';       // (une <div> : le rebond des boutons animait son `transform`, donc sa place)
        d.innerHTML = '<span class="nom">Char</span><span class="canon"><i></i></span><span class="pv"><i></i></span>';
        d.onclick = ev => { ev.stopPropagation(); choisir(c.id); };
        $('chars-etiq').append(d);
        etiq.set(c.id, e = { d, canon: d.querySelector('.canon i'), pv: d.querySelector('.pv i'), nom: d.querySelector('.nom'), pret: null });
      }
      const [sx, sy] = versEcran(c.x, c.y, hauteurSol(c.x, c.y) + 3.5);
      e.d.hidden = sx < -1e4;
      e.d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      const f = fraction(B, c);
      e.canon.style.width = `${(f * 100).toFixed(0)}%`;
      e.pv.style.width = `${Math.max(0, c.pv / CHARS[c.modele].pv * 100).toFixed(0)}%`;
      const pret = f >= 1;
      if (pret !== e.pret) { e.pret = pret; e.d.classList.toggle('pret', pret); }
      e.d.classList.toggle('choisi', choisi === c.id);
      const texte = pret ? 'Char · PRÊT' : `Char · ${secondes(B, c)} s`;
      if (e.nom.textContent !== texte) e.nom.textContent = texte;
    }
    for (const [id, e] of etiq) if (!vus.has(id)) { e.d.remove(); etiq.delete(id); }
    // les cibles : un SVG de la taille de l'écran
    const cv = $('canvas'), w = cv.clientWidth, h = cv.clientHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    const parts = [];
    for (const c of vivants) {
      if (!c.vise) continue;
      const [x1, y1] = versEcran(c.x, c.y, hauteurSol(c.x, c.y) + 1.5), [x2, y2] = versEcran(c.vise[0], c.vise[1]);
      if (x1 < -1e4 || x2 < -1e4) continue;
      const manuel = c.cible && c.vise === c.cible, cl = `${manuel ? 'manuelle' : 'auto'}${choisi === c.id ? ' choisie' : ''}`;
      parts.push(`<g class="${cl}"><line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"/><path d="M${(x2 - 7).toFixed(0)} ${y2.toFixed(0)}h14M${x2.toFixed(0)} ${(y2 - 7).toFixed(0)}v14"/><circle cx="${x2.toFixed(0)}" cy="${y2.toFixed(0)}" r="5"/></g>`);
    }
    // la cible donnée mais hors de portée : une croix seule, sur le sol
    for (const c of vivants) if (c.cible && c.vise !== c.cible) { const [x2, y2] = versEcran(c.cible[0], c.cible[1]); if (x2 > -1e4) parts.push(`<g class="manuelle loin"><path d="M${(x2 - 7).toFixed(0)} ${y2.toFixed(0)}h14M${x2.toFixed(0)} ${(y2 - 7).toFixed(0)}v14"/></g>`); }
    const sig = parts.join('');
    if (sig !== signature) { signature = sig; svg.innerHTML = sig; }
    // la fiche
    const c = vivants.find(k => k.id === choisi), fiche = $('char-fiche');
    fiche.hidden = !c;
    if (!c) return;
    const f = fraction(B, c), G = CHARS[c.modele].canon;
    $('char-fiche-titre').textContent = `${CHARS[c.modele].nom}${c.etat === 'enlise' ? ' · enlisé' : c.etat === 'arrive' ? ' · à l\'arrêt' : ''}`;
    $('char-fiche-pv').style.width = `${Math.max(0, c.pv / CHARS[c.modele].pv * 100).toFixed(0)}%`;
    $('char-fiche-canon').style.width = `${(f * 100).toFixed(0)}%`;
    $('char-fiche-etat').textContent = `Canon ${G.calibre} : ${f >= 1 ? 'PRÊT' : `encore ${secondes(B, c)} s`} · ${c.vise ? (c.cible && c.vise === c.cible ? 'sur la cible donnée' : 'sur le carré le plus chargé') : 'aucune cible à portée'}`;
    for (const b of fiche.querySelectorAll('[data-char]')) b.classList.toggle('vise', b.dataset.char === mode);
  }
  function oublier() { for (const e of etiq.values()) e.d.remove(); etiq.clear(); signature = ''; svg.innerHTML = ''; }
  return { maj, oublier };
}
