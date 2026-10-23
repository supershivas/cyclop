// Estampille les imports et les feuilles de style avec la version (?v=1.4.2).
//
//   node outils/stamp-version.mjs                → dossiers js/ et src/, pages *.html de la racine
//   node outils/stamp-version.mjs --dossier lib --dossier js
//
// Source de vérité : supershivas/game-system/outils/stamp-version.mjs
// D'après scripts/stamp-version.mjs de Kingvi. Section 2 de CONVENTIONS.md :
// GitHub Pages sert les fichiers avec dix minutes de cache ; après une mise
// à jour, le navigateur mélangeait anciens et nouveaux modules (le jeu
// tournait avec l'ancien code, le labo avec le nouveau). À lancer après
// chaque changement de version.json, avant de pousser.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { options } from './navigateur.mjs';

const o = options(process.argv.slice(2));
const dossiers = [].concat(o.dossier || ['js', 'src']).filter(d => existsSync(d));
const { version } = JSON.parse(readFileSync('version.json', 'utf8'));
const v = `?v=${version}`;
let modifies = 0;

function estampiller(fichier, motifs) {
  const avant = readFileSync(fichier, 'utf8');
  // une ligne indentée qui commence par « import » ou « export » est un exemple dans un commentaire (js/lib/*.js) : la synchronisation de game-system le défait à chaque session, et l'arbre git démarrait modifié ;
  // elle n'est pas estampillée. (Correction locale : à proposer pour supershivas/game-system.)
  const s = avant.split('\n').map(l => /^\s+(?:import|export)\b/.test(l) ? l : motifs.reduce((t, re) => t.replace(re, (_, a, url, b) => `${a}${url}${v}${b}`), l)).join('\n');
  if (s !== avant) { writeFileSync(fichier, s); modifies++; }
}

const MODULES = [
  /(from\s+['"])(\.{1,2}\/[^'"?]+\.m?js)(?:\?v=[^'"]*)?(['"])/g,
  /(import\(\s*['"])(\.{1,2}\/[^'"?]+\.m?js)(?:\?v=[^'"]*)?(['"])/g,
  /(import\s+['"])(\.{1,2}\/[^'"?]+\.m?js)(?:\?v=[^'"]*)?(['"])/g,
];
const PAGES = [
  /(<script\b[^>]*\bsrc=")((?!https?:|\/\/)[^"?]+\.m?js)(?:\?v=[^"]*)?(")/g,
  /(<link\b[^>]*\bhref=")((?!https?:|\/\/)[^"?]+\.css)(?:\?v=[^"]*)?(")/g,
  /(import\s+[^;]*?from\s+['"])(\.{1,2}\/[^'"?]+\.m?js)(?:\?v=[^'"]*)?(['"])/g,
  /(import\(\s*['"])(\.{1,2}\/[^'"?]+\.m?js)(?:\?v=[^'"]*)?(['"])/g,
];
const CSS = [/(@import\s+(?:url\()?['"])((?!https?:)[^'"?]+\.css)(?:\?v=[^'"]*)?(['"])/g];

function parcourir(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!f.startsWith('.') && f !== 'node_modules' && f !== 'vendor') parcourir(p); }
    else if (/\.m?js$/.test(f)) estampiller(p, MODULES);
  }
}
dossiers.forEach(parcourir);
for (const f of readdirSync('.')) if (f.endsWith('.html')) estampiller(f, PAGES);
if (existsSync('css')) for (const f of readdirSync('css')) if (f.endsWith('.css')) estampiller(join('css', f), CSS);

console.log(`v${version} : ${modifies} fichier(s) estampillé(s)`);
