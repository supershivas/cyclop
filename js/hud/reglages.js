// La boîte des réglages (sorti de main.js, lot de dette du 24 nov.) : les volumes, l'éclairage, l'export et l'import des sauvegardes,
// la version et le journal des versions. `brancherReglages(ctx)` pose les gestes une fois.
import { pickJSONFile } from '../lib/save.js?v=0.170.2';
import { loadVersion, loadChangelog, downloadJSON } from '../lib/app-update.js?v=0.170.2';

export function brancherReglages({ $, JEU, son, rendu, prefs, store, sauvegarder, toast }) {
  for (const q of ['effets', 'musique']) {
    const champ = $(`son-${q}`);
    champ.value = Math.round(son.volumes[q] * 100);
    champ.oninput = () => { son.volume(q, champ.value / 100); prefs.son = son.volumes; store.save('prefs', prefs); if (q === 'effets') son.interface_('pret'); };
  }
  $('eclairage').value = rendu.eclairage;
  $('eclairage').onchange = () => { rendu.eclairage = $('eclairage').value; prefs.eclairage = rendu.eclairage; store.save('prefs', prefs); };      // Bas / Moyen / Haut (v0.116.0)
  $('exporter').onclick = () => { sauvegarder(); downloadJSON(store.exportAll(), `${JEU}-sauvegarde.json`); };
  $('importer').onclick = async () => {
    try {
      const n = store.importAll(await pickJSONFile());
      toast(`${n} élément(s) importé(s)`);
      setTimeout(() => location.reload(), 800);
    } catch (e) { toast(e.message, 'alerte'); }
  };
  loadVersion().then(v => { $('version').textContent = v ? `v${v}` : ''; });
  loadChangelog().then(entrees => {
    $('changelog').replaceChildren(...entrees.flatMap(e => {
      const h = document.createElement('h3'); h.textContent = `v${e.version} — ${e.date}`;
      const ul = document.createElement('ul');
      for (const c of e.changes) { const li = document.createElement('li'); li.textContent = c; ul.append(li); }
      return [h, ul];
    }));
  });
}
