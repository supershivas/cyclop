// L'infobulle du HUD (Jérôme, v0.47.1 : « barre de vie générale : au survol, les informations (blessés, tués, secteurs…), idem pour les icônes de météo ») : une seule bulle, posée près du pointeur,
// qui dit ce que porte `data-info` de l'élément survolé : des lignes séparées par des retours, avec une hiérarchie (Jérôme, v0.47.1 : « toujours une hiérarchie (h1, h2…) et du gras ») :
// `# titre` (h1), `## sous-titre` (h2), une ligne simple (le corps) ; `**gras**` dans une ligne. Elle remplace le `title` du navigateur (lent, parfois invisible) et le `data-tip` des segments, qui ne recevaient
// aucun survol (le HUD ne prend pas le pointeur : `pointer-events: none`, sauf ce qui le demande). Le dessin seulement ; sans pointeur fin, rien.
const echapper = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// le texte de `data-info` en lignes de la bulle (h1, h2, corps) : la même bulle partout, la même hiérarchie
export function lignesInfo(texte) {
  return texte.split('\n').map(l => {
    const [classe, corps] = l.startsWith('## ') ? ['h2', l.slice(3)] : l.startsWith('# ') ? ['h1', l.slice(2)] : ['p', l];
    return `<span class="${classe}">${echapper(corps).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</span>`;
  }).join('');
}
export function creerInfobulle({ $ }) {
  const bulle = $('infobulle');
  let vers = null;
  const cacher = () => { bulle.hidden = true; vers = null; };
  const poser = e => {
    const x = Math.min(e.clientX + 14, innerWidth - bulle.offsetWidth - 6), y = e.clientY + 18 + bulle.offsetHeight > innerHeight ? e.clientY - bulle.offsetHeight - 10 : e.clientY + 18;
    bulle.style.transform = `translate(${Math.max(4, Math.round(x))}px, ${Math.max(4, Math.round(y))}px)`;
  };
  document.addEventListener('pointermove', e => {
    const c = e.target instanceof Element ? e.target.closest('[data-info]') : null;
    if (!c || !c.dataset.info) { if (vers) cacher(); return; }
    if (c !== vers || bulle.dataset.texte !== c.dataset.info) { vers = c; bulle.dataset.texte = c.dataset.info; bulle.innerHTML = lignesInfo(c.dataset.info); bulle.hidden = false; }
    poser(e);
  });
  document.addEventListener('pointerleave', cacher);
  document.addEventListener('pointerdown', cacher);
  return { cacher };
}
