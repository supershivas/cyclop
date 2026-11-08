/* La gestion des régiments de la nuit (Jérôme, v0.116.0 : « fusionner deux régiments », « glisser-déposer des soldats d'un régiment vers un autre », « 1 soldat, 10 soldats ou tous les restants »)
   Une fenêtre : une carte par régiment (effectif, blessés, ce que les transferts prévus en feront) ; on choisit la quantité (1, 10, tous), puis on glisse une carte sur une autre — ou on clique la source, puis la cible.
   Rien ne change avant l'aube : les transferts se rangent dans l'état (`etat.transferts`), se lisent et s'annulent ici. Règle de tout glisser-déposer : la carte « prise » suit le pointeur avec une ombre,
   la cible est en pointillés et montre déjà le résultat, Échap annule, un simple clic n'est jamais un glissement. Lecture seule de l'état : les ordres passent par `planifier(de, vers, n)` et `annuler(k)`. */
import { disponibles } from '../nuit.js?v=0.125.0';
import { numeroDe } from './lecture.js?v=0.125.0';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const SEUIL = 6;       // px : en dessous, c'est un clic
export const QUANTITES = [['1', 1, '1 soldat'], ['10', 10, '10 soldats'], ['tous', -1, 'Tous les restants']];

// Les hommes qui sortent d'un régiment par le transfert `t`, et ce qu'il en reste pour les autres
const sortants = (B, camp, t) => t.n < 0 ? Math.max(0, B.etat.regiments[t.de].effectif - B.etat.transferts[camp].filter(u => u.de === t.de && u.n > 0).reduce((s, u) => s + u.n, 0)) : t.n;
export function bilanTransferts(B, camp) {
  const sort = new Map(), entre = new Map();
  for (const t of B.etat.transferts[camp]) {
    const n = sortants(B, camp, t);
    sort.set(t.de, (sort.get(t.de) ?? 0) + n); entre.set(t.vers, (entre.get(t.vers) ?? 0) + n);
  }
  return { sort, entre };
}

export function creerGestion({ $, bataille, moi, actif, planifier, annuler, dire }) {
  const dialogue = $('dialogue-regiments'), grille = $('reg-grille'), prevus = $('reg-prevus'), bouton = $('nuit-gerer');
  let quantite = 10, source = null, signature = '', glisse = null;

  const ouvrir = () => { if (!actif()) return; signature = ''; dessiner(); if (!dialogue.open) dialogue.showModal(); };
  bouton.onclick = ouvrir;
  dialogue.addEventListener('keydown', e => e.stopPropagation());       // les raccourcis du jeu (T, B, flèches…) ne passent pas à travers la fenêtre
  dialogue.addEventListener('cancel', e => { if (glisse) { e.preventDefault(); finir(false); } else if (source) { e.preventDefault(); source = null; signature = ''; dessiner(); } });   // Échap : d'abord le geste, puis la source choisie, puis la fenêtre
  dialogue.addEventListener('close', () => { source = null; });

  const nom = (B, id) => `${numeroDe(B, B.etat.regiments[id])} · ${B.etat.regiments[id].nom}`;
  const qn = () => QUANTITES.find(q => q[1] === quantite);
  const phrase = (B, camp, t) => t.n < 0 ? `Tous les hommes de ${nom(B, t.de)} (${sortants(B, camp, t)}) rejoignent ${nom(B, t.vers)}${sortants(B, camp, t) === B.etat.regiments[t.de].effectif ? ' : fusion' : ''}`
    : `${t.n} soldat${t.n > 1 ? 's' : ''} de ${nom(B, t.de)} rejoignent ${nom(B, t.vers)}`;

  function dessiner() {
    const B = bataille(), camp = moi();
    if (!B) return;
    const e = B.etat, regs = e.regiments.filter(r => r.camp === camp && r.effectif > 0), { sort, entre } = bilanTransferts(B, camp), A = B.armee, bl = new Map();
    for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.blessure[i] && A.camp[i] === camp) bl.set(A.reg[i], (bl.get(A.reg[i]) ?? 0) + 1);
    // les quantités
    $('reg-quantites').replaceChildren(...QUANTITES.map(([cle, n, texte]) => {
      const b = el('button', { type: 'button', className: `bouton${n === quantite ? ' actif' : ''}`, textContent: texte });
      b.setAttribute('aria-pressed', String(n === quantite));
      b.onclick = () => { quantite = n; signature = ''; dessiner(); };
      b.dataset.info = n < 0 ? '# Tous les restants\nTous les hommes qui restent au régiment à l\'aube passent dans l\'autre : c\'est la fusion. Le régiment donneur disparaît.' : `# ${texte}\nLa quantité transférée à chaque glissement.`;
      return b;
    }));
    $('reg-aide').textContent = source != null ? `${nom(B, source)} : cliquez sur le régiment qui reçoit ${quantite < 0 ? 'tous ses hommes' : qn()[2].toLowerCase()} (Échap annule).` : 'Glissez un régiment sur un autre, ou cliquez le premier puis le second. Les hommes les rejoignent au début du jour suivant.';
    // les régiments
    grille.replaceChildren(...regs.map(r => {
      const sorti = sort.get(r.id) ?? 0, entre1 = entre.get(r.id) ?? 0, apres = r.effectif - sorti + entre1, libre = disponibles(B, camp, r.id) > 0;
      const c = el('div', { className: `reg-gestion${source === r.id ? ' source' : ''}`, tabIndex: 0 });
      c.dataset.reg = r.id; c.setAttribute('role', 'button'); c.setAttribute('aria-label', `${nom(B, r.id)} : ${r.effectif} hommes${sorti ? `, ${sorti} partent` : ''}${entre1 ? `, ${entre1} arrivent` : ''}`);
      c.append(el('b', { textContent: numeroDe(B, r) }), el('span', { className: 'nom', textContent: r.nom }),
        el('span', { className: 'effectif', textContent: `${r.effectif} homme${r.effectif > 1 ? 's' : ''}${bl.get(r.id) ? ` · ${bl.get(r.id)} blessé${bl.get(r.id) > 1 ? 's' : ''}` : ''}` }),
        el('span', { className: `apres${sorti || entre1 ? ' change' : ''}`, textContent: sorti || entre1 ? `à l'aube : ${apres}${apres === 0 ? ' (fusionné)' : ` (${apres - r.effectif > 0 ? '+' : '−'}${Math.abs(apres - r.effectif)})`}` : libre ? 'inchangé' : 'tous ses hommes sont promis' }));
      return c;
    }));
    // les transferts prévus
    const liste = e.transferts[camp];
    prevus.replaceChildren(...(liste.length ? liste.map((t, k) => {
      const b = el('button', { type: 'button', className: 'bouton', textContent: 'Annuler' });
      b.setAttribute('aria-label', `Annuler : ${phrase(B, camp, t)}`); b.onclick = () => { annuler(k); signature = ''; };
      return el('li', {}, el('span', { textContent: phrase(B, camp, t) }), b);
    }) : [el('li', { className: 'discret', textContent: 'Aucun transfert prévu.' })]));
    signature = sig(B);
  }
  const sig = B => `${moi()}|${quantite}|${source}|${B.etat.transferts[moi()].map(t => `${t.de}>${t.vers}:${t.n}`).join()}|${B.etat.regiments.filter(r => r.camp === moi()).map(r => r.effectif).join()}`;

  // un clic : la source, puis la cible
  function choisir(id) {
    const B = bataille(), camp = moi();
    if (source == null) {
      if (!disponibles(B, camp, id)) return dire({ refus: `Tous les hommes de ${nom(B, id)} sont déjà promis à un autre régiment.` });
      source = id; signature = ''; return dessiner();
    }
    const de = source; source = null; signature = '';
    if (de !== id) planifier(de, id, quantite);
    dessiner();
  }
  // un glissement : la carte « prise » suit le pointeur (copie ombrée), la cible est en pointillés et dit déjà son résultat
  grille.addEventListener('pointerdown', e => {
    const c = e.target.closest('.reg-gestion');
    if (!c || e.button !== 0 || glisse) return;
    glisse = { id: +c.dataset.reg, carte: c, x: e.clientX, y: e.clientY, pris: false, fantome: null, cible: null, pointeur: e.pointerId };
  });
  window.addEventListener('pointermove', e => {
    if (!glisse || e.pointerId !== glisse.pointeur) return;
    if (!glisse.pris) {
      if (Math.hypot(e.clientX - glisse.x, e.clientY - glisse.y) < SEUIL) return;
      const B = bataille();
      if (!disponibles(B, moi(), glisse.id)) { glisse = null; return; }     // rien à donner : c'est un clic, qui dira pourquoi
      glisse.pris = true; source = null;
      const r = glisse.carte.getBoundingClientRect(), f = glisse.carte.cloneNode(true);
      f.classList.add('fantome'); f.style.width = `${r.width}px`; f.style.left = `${r.left}px`; f.style.top = `${r.top}px`;
      glisse.dx = glisse.x - r.left; glisse.dy = glisse.y - r.top; glisse.fantome = f;
      document.body.append(f); glisse.carte.classList.add('pris');
      grille.classList.add('en-glisse');
    }
    glisse.fantome.style.left = `${e.clientX - glisse.dx}px`; glisse.fantome.style.top = `${e.clientY - glisse.dy}px`;
    const sous = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList?.contains('reg-gestion') && n !== glisse.carte);
    if (sous !== glisse.cible) {
      glisse.cible?.classList.remove('vise'); glisse.cible = sous ?? null; glisse.cible?.classList.add('vise');
      apercu();
    }
  });
  // la cible montre le résultat avant le lâcher
  function apercu() {
    const B = bataille(), camp = moi();
    for (const c of grille.children) c.querySelector('.apres').classList.remove('simule');
    if (!glisse?.cible) return;
    const de = B.etat.regiments[glisse.id], vers = B.etat.regiments[+glisse.cible.dataset.reg], dispo = disponibles(B, camp, glisse.id), n = quantite < 0 ? dispo : Math.min(quantite, dispo);
    const { sort, entre } = bilanTransferts(B, camp);
    const a = glisse.carte.querySelector('.apres'), b = glisse.cible.querySelector('.apres');
    a.textContent = `à l'aube : ${de.effectif - (sort.get(de.id) ?? 0) - n}`; b.textContent = `à l'aube : ${vers.effectif - (sort.get(vers.id) ?? 0) + (entre.get(vers.id) ?? 0) + n}`;
    a.classList.add('simule'); b.classList.add('simule');
  }
  function finir(valide) {
    if (!glisse) return;
    const g = glisse; glisse = null;
    g.fantome?.remove(); g.carte.classList.remove('pris'); g.cible?.classList.remove('vise'); grille.classList.remove('en-glisse');
    signature = '';
    if (g.pris) {
      if (valide && g.cible) planifier(g.id, +g.cible.dataset.reg, quantite);
      dessiner();
    } else if (valide) choisir(g.id);        // pas de glissement : un clic
  }
  window.addEventListener('pointerup', e => { if (glisse && e.pointerId === glisse.pointeur) finir(true); });
  window.addEventListener('pointercancel', e => { if (glisse && e.pointerId === glisse.pointeur) finir(false); });
  grille.addEventListener('keydown', e => {
    const c = e.target.closest('.reg-gestion');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choisir(+c.dataset.reg); }
  });

  // appelé à chaque rafraîchissement de l'interface : le bouton de la nuit, et la fenêtre si elle est ouverte
  function maj() {
    const B = bataille();
    bouton.hidden = !B || !actif();
    if (!B) return;
    const n = B.etat.transferts?.[moi()]?.length ?? 0;
    bouton.textContent = n ? `Gérer les régiments · ${n} transfert${n > 1 ? 's' : ''}` : 'Gérer les régiments';
    if (dialogue.open && !glisse && sig(B) !== signature) dessiner();
    if (dialogue.open && !actif()) dialogue.close();
  }
  return { ouvrir, maj, fermer: () => { if (dialogue.open) dialogue.close(); } };
}
