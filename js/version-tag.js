// La version du jeu dans l'en-tête du labo et de l'atelier, en haut à droite : pour savoir qu'on est à jour (lue de version.json, sans cache).
export async function afficherVersion() {
  let v = '';
  try { v = (await (await fetch('./version.json', { cache: 'no-store' })).json()).version || ''; } catch { /* rien */ }
  if (!v) return;
  const entete = document.querySelector('.labo-head, .at-head');
  if (!entete || entete.querySelector('.version-tag')) return;
  const tag = document.createElement('span');
  tag.className = 'version-tag'; tag.textContent = `v${v}`; tag.title = 'Version du jeu';
  tag.style.cssText = 'font:12px/1 ui-monospace,monospace;opacity:.75;padding:0 8px;white-space:nowrap;align-self:center';
  const outil = entete.querySelector('.labo-tool, .at-tool');
  entete.insertBefore(tag, outil || null);
}
