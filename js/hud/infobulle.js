// L'infobulle du HUD (Jérôme, v0.47.1 : « barre de vie générale : au survol, les informations (blessés, tués, secteurs…), idem pour les icônes de météo ») : une seule bulle, posée près du pointeur,
// qui dit ce que porte `data-info` de l'élément survolé : des lignes séparées par des retours, avec une hiérarchie (Jérôme, v0.47.1 : « toujours une hiérarchie (h1, h2…) et du gras ») :
// `# titre` (h1), `## sous-titre` (h2), une ligne simple (le corps) ; `**gras**` dans une ligne. Elle remplace le `title` du navigateur (lent, parfois invisible) et le `data-tip` des segments, qui ne recevaient
// aucun survol (le HUD ne prend pas le pointeur : `pointer-events: none`, sauf ce qui le demande). Le dessin seulement ; sans pointeur fin, rien.
const echapper = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// La typographie (règle commune des jeux, 18 nov.) : une espace insécable avant « : ; ! ? » et à l'intérieur des guillemets, posée AU RENDU (le texte des sources garde ses espaces
// ordinaires) ; un deux-points collé à un mot (« Vivres: ») en reçoit une ; « 12:30 », « x2 » et les adresses ne bougent pas (il faut une lettre, une parenthèse ou un « * » avant).
const NBSP = '\u00a0';
export const typographie = t => t
  .replace(/[ \t]+([:;!?»%])/g, `${NBSP}$1`)
  .replace(/([A-Za-zÀ-ÿ)*])([:;!?])(?=\s|$)/g, `$1${NBSP}$2`)
  .replace(/([^\s\u00a0])»/g, `$1${NBSP}»`)
  .replace(/«[ \t]*/g, `«${NBSP}`);
const enLigne = t => echapper(typographie(t)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
// le texte de `data-info` en lignes de la bulle : la même bulle partout, la même hiérarchie. Jamais de bloc de texte (Jérôme, 18 nov.) : `# titre` (h1), `## sous-titre` (h2), une ligne simple,
// et **les tableaux** : une ligne qui porte « | » est une rangée (`Vivres | **2** sur 3`) ; les rangées qui se suivent font un seul tableau, la première cellule est le libellé (en gras).
// Un titre n'existe que s'il a quelque chose à titrer (Jérôme, v0.100.0 : un énorme « Déplier le secteur de la carte » sur une simple bascule) : une bulle d'une seule ligne est
// une ligne simple en gras (`seul`), pas un h1 ; le titre vient quand un corps le suit.
export function lignesInfo(texte) {
  const lignes = texte.split(/\\n|\n/).filter(l => l.trim());
  if (lignes.length === 1 && !lignes[0].includes(' | ')) return `<span class="seul">${enLigne(lignes[0].replace(/^#{1,2} /, ''))}</span>`;
  const sortie = [];
  let rangs = null;
  for (const l of lignes) {
    if (l.includes(' | ') && !/^#{1,2} /.test(l)) {
      const [lib, ...val] = l.split(/\s+\|\s+/);
      const tete = !rangs && val.length > 1 && val.every(v => !/[\d*]/.test(v));      // la 1re rangée d'un tableau à plusieurs colonnes, sans chiffre : l'en-tête (« Hommes | Nous | En face »)
      (rangs ??= []).push(`<tr><th>${enLigne(lib)}</th>${val.map(v => tete ? `<th>${enLigne(v)}</th>` : `<td>${enLigne(v)}</td>`).join('')}</tr>`);
      continue;
    }
    if (rangs) { sortie.push(`<table class="t">${rangs.join('')}</table>`); rangs = null; }
    const [classe, corps] = l.startsWith('## ') ? ['h2', l.slice(3)] : l.startsWith('# ') ? ['h1', l.slice(2)] : ['p', l];
    sortie.push(`<span class="${classe}">${enLigne(corps)}</span>`);
  }
  if (rangs) sortie.push(`<table class="t">${rangs.join('')}</table>`);
  return sortie.join('');
}
// Les `title` du navigateur deviennent des `data-info` (Jérôme, v0.98.0 : « le survol de tous les éléments de l'interface donne une infobulle liée au design system ») : la bulle du jeu partout, jamais celle du système en plus.
// Un bouton sans texte garde son nom accessible (`aria-label`). Appelé une fois sur la page, puis à chaque ajout ou changement d'un `title` (le HUD se refait souvent).
export function adopterTitres(racine = document) {
  const faire = e => {
    const t = e.getAttribute('title');
    if (t === null) return;
    e.removeAttribute('title');
    if (t && (!e.dataset.info || e.dataset.titre)) { e.dataset.info = t; e.dataset.titre = '1'; }      // (un `title` qui change met la bulle à jour)
    if (t && !e.hasAttribute('aria-label') && !e.textContent.trim()) e.setAttribute('aria-label', t.replace(/^#+ /gm, '').split(/\\n|\n/)[0]);
  };
  if (racine instanceof Element && racine.hasAttribute('title')) faire(racine);
  racine.querySelectorAll?.('[title]').forEach(faire);
}
function surveillerTitres() {
  adopterTitres();
  new MutationObserver(lots => {
    for (const m of lots) {
      if (m.type === 'attributes') { if (m.target.hasAttribute('title')) adopterTitres(m.target); }
      else for (const n of m.addedNodes) if (n.nodeType === 1) adopterTitres(n);
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
}
export function creerInfobulle({ $ }) {
  surveillerTitres();
  const bulle = $('infobulle');
  let vers = null;
  // la bulle est un « popover » : dans la couche supérieure du navigateur, donc AU-DESSUS d'un dialogue modal (sans cela, l'infobulle d'un bouton du choix du secteur restait cachée derrière sa fenêtre, v0.106.0)
  bulle.setAttribute('popover', 'manual');
  const afficher = () => { bulle.hidden = false; try { if (!bulle.matches(':popover-open')) bulle.showPopover(); } catch { /* sans popover : la bulle reste dans la page */ } };
  const cacher = () => { bulle.hidden = true; vers = null; try { if (bulle.matches(':popover-open')) bulle.hidePopover(); } catch { /* idem */ } };
  const poser = e => {
    const x = Math.min(e.clientX + 14, innerWidth - bulle.offsetWidth - 6), y = e.clientY + 18 + bulle.offsetHeight > innerHeight ? e.clientY - bulle.offsetHeight - 10 : e.clientY + 18;
    bulle.style.transform = `translate(${Math.max(4, Math.round(x))}px, ${Math.max(4, Math.round(y))}px)`;
  };
  document.addEventListener('pointermove', e => {
    const c = e.target instanceof Element ? e.target.closest('[data-info], button[aria-label], [role="button"][aria-label], summary, input[aria-label]') : null;
    // sans `data-info`, un bouton **sans texte** (icône, flèche) dit son nom : tout ce qui se clique parle (v0.98.0) ; un bouton qui porte déjà son texte (la bascule de la carte, une carte de régiment) ne le répète pas (v0.100.0)
    const texte = c ? c.dataset.info || (c.classList.contains('reg-carte') || c.textContent.trim() ? '' : c.getAttribute('aria-label')) || '' : '';
    if (!c || !texte) { if (vers) cacher(); return; }
    if (c !== vers || bulle.dataset.texte !== texte) { vers = c; bulle.dataset.texte = texte; bulle.innerHTML = lignesInfo(texte); afficher(); }
    poser(e);
  });
  document.addEventListener('pointerleave', cacher);
  document.addEventListener('pointerdown', cacher);
  return { cacher };
}
