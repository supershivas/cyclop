// L'estampillage de ce jeu : `node outils/stamp-version.mjs` (l'outil de game-system, réécrit à chaque synchronisation : on n'y touche pas), puis on retire les `?v=` qu'il met aux exemples
// d'import indentés des commentaires de js/lib/*.js. La synchronisation des modules les défait à chaque session : sans cela, l'arbre git démarrait modifié et chaque commit les rétablissait.
// À lancer à la place de stamp-version.mjs, après chaque changement de version.json.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const r = spawnSync(process.execPath, [new URL('./stamp-version.mjs', import.meta.url).pathname, ...process.argv.slice(2)], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
let n = 0;
for (const d of ['js/lib']) for (const f of readdirSync(d)) {
  if (!f.endsWith('.js')) continue;
  const p = join(d, f), avant = readFileSync(p, 'utf8');
  // (un chemin « ./lib/… » vu de js/ n'est jamais un vrai import de js/lib/, qui lit ses voisins en « ./nom.js » : c'est un exemple de commentaire)
  const apres = avant.split('\n').map(l => /^\s+(?:import|export)\b/.test(l) || /\.\/lib\/[^'"\s]*\?v=/.test(l) ? l.replace(/(\.\/lib\/[^'"\s?]*|\.\/[^'"\s?]*\.m?js)\?v=[^'"]*(['"])/g, '$1$2') : l).join('\n');
  if (apres !== avant) { writeFileSync(p, apres); n++; }
}
console.log(`${n} fichier(s) de js/lib/ remis sans estampille dans les exemples des commentaires`);
