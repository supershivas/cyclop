// L'onglet « Design system » du labo (Jérôme, v0.98.0 : « intégrer le design system du jeu au labo : les fondations (typos, tailles, espaces, couleurs de l'UI), les boutons (différents états), les modales, fenêtres »).
// Rien n'est recopié : chaque planche est un cadre (`iframe`) qui charge les VRAIES feuilles du jeu (`css/style.css`, `js/lib/game.css`) et les rôles de couleur de `palette.js`, et pose dedans le vrai balisage des papiers, des
// boutons et des bulles. Les valeurs des fondations sont lues dans le `:root` de `css/style.css` (`jetons`) : changer une échelle dans la feuille change cette page. Les états qu'un pointeur seul montre (survol, focus) sont
// forcés par les classes `.est-survol` et `.est-focus`, que la feuille du jeu accepte pour cela (le jeu ne les écrit jamais). Le labo montre, il ne modifie rien.
import { ROLES, ALERTES } from './palette.js?v=0.99.3';
import { lignesInfo } from './hud/infobulle.js?v=0.99.3';

const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const roles = Object.entries({ ...ROLES }).map(([k, v]) => `--jeu-${k}:${v}`).join(';');

// Un cadre : la page du jeu en petit, sans son écran ; `corps` est du balisage du jeu
function cadre(stage, corps, { haut = '70vh', fond = 'fond', v2 = true } = {}) {
  const f = el('iframe', { title: 'Planche du design system', loading: 'eager' });
  f.style.cssText = `width:100%;height:${haut};border:1px solid rgba(0,0,0,.2);border-radius:6px;background:${ROLES[fond]}`;
  f.srcdoc = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link rel="stylesheet" href="js/lib/game.css"><link rel="stylesheet" href="css/style.css">${v2 ? '<link rel="stylesheet" href="css/ds-v2.css">' : ''}
<style>
  :root { ${roles}; --jeu-nous: ${ROLES.nous}; --jeu-eux: ${ROLES.eux}; }
  html, body { height: auto; overflow: auto; user-select: text; background: var(--jeu-fond); }
  body { padding: 20px 24px 32px; font: var(--texte)/1.4 var(--jeu-police); color: var(--jeu-encre); }
  h1, h2, h3 { font-weight: normal; margin: 0; }
  h1 { font-size: var(--texte-grand); margin-bottom: var(--e4); letter-spacing: var(--titre-lettres); }
  h2 { font-size: var(--texte-moyen); letter-spacing: var(--titre-lettres); margin: 28px 0 var(--pas); border-bottom: 1px solid var(--jeu-accent); padding-bottom: var(--e1); }
  .note { color: var(--jeu-brume); font-size: var(--texte-petit); max-width: 70ch; margin: 0 0 var(--pas); }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; vertical-align: middle; padding: var(--pas) var(--pas) var(--pas) 0; border-bottom: 1px solid var(--jeu-ombre); font-weight: normal; }
  th { color: var(--jeu-brume); font-size: var(--texte-petit); letter-spacing: var(--titre-lettres); }
  code { color: var(--jeu-nous); font-size: var(--texte-petit); }
  .demo.reg-ouvert { position: static; width: 100%; max-width: 44ch; }
  .demo.reg-ouvert .actions { margin-top: 0; }
  td button { white-space: nowrap; }
  td .reg-ouvert .actions button { padding: 0 var(--pas); }
  .rang { display: flex; flex-wrap: wrap; gap: 16px 24px; align-items: flex-start; }
  .echantillon { display: inline-block; width: 40px; height: 40px; border: 1px solid var(--jeu-brume); vertical-align: middle; margin-right: var(--pas); }
  .barre-e { display: inline-block; height: 12px; background: var(--jeu-nous); vertical-align: middle; }
  .ok { color: ${ROLES.nous}; } .non { color: ${ALERTES.orange}; }
</style></head><body>${corps}</body></html>`;
  stage.append(f);
  return f;
}

// Les jetons du `:root` de la feuille du jeu, avec leur commentaire : [{ nom, valeur, dit }]
async function jetons() {
  const par = new Map();      // la feuille du jeu, puis la deuxième (css/ds-v2.css, en jeu depuis la v0.98.2) qui en redéfinit des jetons ; un jeton sans commentaire garde celui d'avant
  for (const f of ['css/style.css', 'css/ds-v2.css']) {
    const css = await (await fetch(f)).text();
    const bloc = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    for (const m of bloc.matchAll(/(--[\w-]+):\s*([^;]+);\s*(?:\/\*\s*([\s\S]*?)\s*\*\/)?/g)) par.set(m[1], { nom: m[1], valeur: m[2].trim(), dit: m[3] || par.get(m[1])?.dit || '' });
  }
  return [...par.values()];
}
const px = v => parseFloat(v);

// Le rapport de contraste WCAG de deux couleurs « #rrggbb »
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ─── Fondations ───
const USAGE_ROLES = {
  fond: ['Terre', 'Le fond du jeu ; l\'encre du papier ; le texte sur os.'],
  ombre: ['Boue sombre', 'Les filets, les séparations sur fond sombre, l\'ombre d\'un cran.'],
  encre: ['Os', 'Le papier ; le texte sur fond sombre.'],
  accent: ['Glaise', 'Le texte secondaire (« discret »), les bordures, un ordre refusé.'],
  nous: ['Bleu horizon', 'Notre camp ; le focus au clavier ; les liens.'],
  eux: ['Vert kaki clair', 'Le camp d\'en face.'],
  brume: ['Brume', 'Le survol d\'un bouton de papier ; les hachures ; le texte secondaire sur fond sombre.'],
  ebranle: ['Orange', 'Un régiment ébranlé (alerte : la forme porte l\'information, la couleur la confirme).'],
  deroute: ['Rouge', 'Un régiment en déroute (alerte).'],
};
export async function fondations(stage, vue) {
  const J = await jetons(), par = nom => J.filter(j => j.nom.startsWith(nom));
  let corps = '';
  if (vue === 'typo') {
    const echelle = [...par('--texte'), ...par('--titre-')];
    corps = `<h1>Typographie</h1><p class="note">Une police du système (monospace, en attendant une police d'identité auto-hébergée) et quatre tailles : jamais une cinquième. Un titre est en lettres espacées (<code>--titre-lettres</code>).</p>
      <h2>La police</h2><p style="font-family:var(--jeu-police);font-size:var(--texte-grand)">Cyclopéen — 0123456789 — « Le régiment tient la tranchée »</p><p class="note"><code>${par('--jeu-police')[0]?.valeur ?? ''}</code></p>
      <h2>Les tailles : quatre de texte, trois de titre</h2><table><tr><th>Jeton</th><th>Valeur</th><th>Où</th><th>Exemple</th></tr>${echelle.map(t => `<tr><td><code>${t.nom}</code></td><td>${t.valeur}</td><td>${t.dit}</td><td style="${t.nom.startsWith('--titre-') ? 'font-family:var(--police-titre);font-weight:var(--titre-poids);text-transform:uppercase;letter-spacing:var(--titre-lettres);' : ''}font-size:var(${t.nom})">Un obus de 155 tombe au nord</td></tr>`).join('')}</table>
      <h2>La hiérarchie</h2><div class="papier" style="max-width:48ch"><h2 style="margin:0 0 var(--e1);font-size:var(--texte-moyen);letter-spacing:var(--titre-lettres);border:0;padding:0">Titre de papier (16)</h2><p>Le texte courant se lit à 14 pixels : un papier, un bouton, une ligne du carnet.</p><p class="discret" style="font-size:var(--texte-petit)">Le texte discret (12, glaise) : un compteur, une légende, la note d'un tronçon.</p></div>`;
  } else if (vue === 'espaces') {
    const e = [...par('--e'), ...par('--pas')];
    corps = `<h1>Espaces, hauteurs et traits</h1><p class="note">Des multiples de 4 ; le pas du jeu est 8. Une valeur qui n'est pas dans l'échelle est un défaut : on la ramène à l'échelle, ou on propose d'ajouter un cran.</p>
      <h2>L'espacement</h2><table><tr><th>Jeton</th><th>Valeur</th><th>Où</th><th>Longueur</th></tr>${e.map(t => `<tr><td><code>${t.nom}</code></td><td>${t.valeur}</td><td>${t.dit}</td><td><span class="barre-e" style="width:${px(t.valeur) * 4}px"></span></td></tr>`).join('')}</table>
      <h2>Hauteurs, traits, ombre</h2><table><tr><th>Jeton</th><th>Valeur</th><th>Où</th></tr>${[...par('--jeu-cible'), ...par('--trait'), ...par('--ombre'), ...par('--titre')].map(t => `<tr><td><code>${t.nom}</code></td><td>${t.valeur}</td><td>${t.dit}</td></tr>`).join('')}</table>
      <h2>La cible d'un bouton</h2><p class="note">Tout bouton du HUD mesure ${par('--jeu-cible')[0]?.valeur ?? '44px'} de haut au moins (les boutons empilés d'un papier : 32 px, dans une grille de colonnes égales).</p>
      <div class="rang"><div class="papier" style="padding:var(--pas)"><button class="bouton" style="height:var(--jeu-cible)">44 px</button></div><div class="papier reg-ouvert demo" style="max-width:26ch"><div class="actions"><button>32 px</button><button>32 px</button></div></div></div>`;
  } else {
    corps = `<h1>Couleurs de l'interface</h1><p class="note">Dix tons de terrain, et neuf rôles pour l'interface (variables <code>--jeu-*</code>, posées par <code>palette.js</code>). Aucune autre couleur, hors les deux alertes. Le rapport est celui du texte du rôle sur la terre (en haut) et sur l'os (en bas) : 4,5 pour du texte, 3 pour un signe.</p>
      <table><tr><th>Rôle</th><th>Valeur</th><th>Usage</th><th>sur terre</th><th>sur os</th></tr>${Object.entries(ROLES).map(([k, v]) => {
        const [nom, dit] = USAGE_ROLES[k] ?? [k, ''], a = contraste(v, ROLES.fond), b = contraste(v, ROLES.encre), ok = x => `<span class="${x >= 4.5 ? 'ok' : x >= 3 ? '' : 'non'}">${x.toFixed(1)}</span>`;
        return `<tr><td><span class="echantillon" style="background:${v}"></span><code>--jeu-${k}</code></td><td>${v}<br><span class="note">${nom}</span></td><td>${dit}</td><td>${ok(a)}</td><td>${ok(b)}</td></tr>`;
      }).join('')}</table>
      <h2>Les deux papiers</h2><div class="rang"><div class="papier" style="width:30ch"><b style="font-weight:normal">Papier</b><br>L'os et la terre : tout ce qu'on lit longtemps.<br><span class="discret">Texte discret : glaise.</span></div><div class="plaque" style="width:30ch"><b style="font-weight:normal">Plaque</b><br>La terre et l'os, un liseré de boue : ce qui flotte sur le champ.</div></div>`;
  }
  cadre(stage, corps);
}

// ─── Boutons ───
const ETATS = [['Repos', ''], ['Survol', 'est-survol'], ['Focus clavier', 'est-focus'], ['Choisi', 'actif'], ['Refusé', 'refus'], ['Refusé · survol', 'refus est-survol']];
const dansPapier = (cls, texte = 'Ordre') => `<div class="papier reg-ouvert demo" style="padding:var(--e1)"><div class="actions" style="--cols:1"><button class="${cls}" ${cls.includes('actif') ? 'aria-pressed="true"' : ''}>${texte}</button></div></div>`;
export function boutons(stage) {
  const lignes = [
    ['Bouton de papier', '<code>.reg-ouvert .actions button</code><br>Les ordres d\'un régiment, les choix d\'un bâtiment, les corvées. Une grille de colonnes égales.', ETATS.map(([, c]) => dansPapier(c))],
    ['Le « ? » de la fenêtre', '<code>.reg-ouvert .tete .aide</code><br>Ouvre la fiche du régiment : petit, dans l\'en-tête.', ETATS.slice(0, 3).map(([, c]) => `<div class="papier reg-ouvert demo" style="padding:var(--e1);width:auto"><div class="tete" style="border:0;padding:0"><button type="button" class="aide ${c}">?</button></div></div>`)],
    ['Bouton de menu', '<code>.bouton</code><br>Terre sur os, un filet de glaise dessous ; le survol vire à la glaise.', ETATS.slice(0, 3).map(([, c]) => `<button class="bouton ${c}" style="height:var(--jeu-cible)">À l'aube</button>`)],
    ['Le camp', '<code>.camp-btn</code><br>« Le camp · 5 pts » : la dotation en toutes lettres.', ETATS.slice(0, 2).map(([, c]) => `<button class="camp-btn ${c}" style="width:auto">Le camp · 5 pts</button>`)],
  ];
  const corps = `<h1>Boutons</h1><p class="note">Chaque famille dans ses états. Le survol d'un bouton de papier vire à la brume sous l'encre (7 : 1) ; un bouton refusé (glaise, pointillé) devient plein et encré au survol : le texte ne disparaît jamais (v0.98.0 ; avant, glaise sur glaise). La raison d'un refus est dite dans l'infobulle.</p>
    <table><tr><th>Famille</th>${ETATS.map(([n]) => `<th>${n}</th>`).join('')}</tr>${lignes.map(([nom, dit, cases]) => `<tr><td style="min-width:22ch"><b style="font-weight:normal">${nom}</b><div class="note">${dit}</div></td>${ETATS.map((_, i) => `<td>${cases[i] ?? ''}</td>`).join('')}</tr>`).join('')}</table>`;
  cadre(stage, corps);
}

// ─── Fenêtres, bulles, modales ───
export function fenetres(stage, vue) {
  let corps = '';
  if (vue === 'papiers') {
    corps = `<h1>Les papiers du champ</h1><p class="note">La fenêtre d'ordres d'un régiment et celle d'un bâtiment sont le même papier (<code>.papier.reg-ouvert</code>) : un en-tête (titre, secteur, « ? »), une ligne de ce qu'il fait, des boutons de même largeur. Largeur 44 caractères ; ombre d'un cran.</p>
      <div class="rang">
      <div class="papier reg-ouvert demo"><div class="tete"><b>2 · Protogyne</b><span>secteurs 3-4</span><button type="button" class="aide" aria-label="Fiche du régiment">?</button></div><div class="compte">52 debout · 9 blessés · 14 tombés</div><div class="ordre">Tient sa tranchée</div>
        <div class="actions formes"><button class="actif">Ligne</button><button>Colonne</button><button>Carré</button><button>Éparpillé</button></div>
        <div class="actions"><button>Marcher</button><button>Regagner sa tranchée</button></div></div>
      <div class="papier reg-ouvert demo"><div class="tete"><b>Le parc d'artillerie</b><span>niveau 1</span></div><div class="compte">Les trois calibres sont prêts : le 75, le 155 et le 220.</div>
        <div class="actions"><button class="refus">Tir de réglage · 3 pts</button><button class="refus">Caissons doublés · 3 pts</button></div></div>
      </div>`;
  } else if (vue === 'infobulle') {
    corps = `<h1>L'infobulle</h1><p class="note">Une seule bulle pour tout le jeu, posée près du pointeur : l'élément porte <code>data-info</code> (ou un <code>title</code>, que le jeu adopte et retire : jamais la bulle du navigateur en plus). Trois niveaux : <code># titre</code> (h1), <code>## sous-titre</code> (h2), le corps ; <code>**gras**</code>.</p>
      <div class="rang"><div class="infobulle" style="position:static">${lignesInfo('# Fiche du régiment\nLes hommes, le moral, les vivres, l\'équipement.')}</div>
      <div class="infobulle" style="position:static">${lignesInfo('# J2/13 · 16 h 46 · temps sec\nVent modéré : 29 km/h, vers le sud-est\nDemain : du brouillard, dit-on')}</div>
      <div class="infobulle" style="position:static">${lignesInfo('# Caissons doublés\n## Parc renforcé · 3 pts\nLa recharge de tous les calibres −15 %.\nIl manque **2 points** de dotation.')}</div></div>`;
  } else {
    corps = `<h1>Les dialogues</h1><p class="note">Une boîte de dialogue ne sert qu'à décider (nouvelle partie, abandon) ; le reste du jeu se pose en papier sur le champ. Fond de terre, filet de glaise, titre en majuscules (20), boutons <code>.bouton</code>.</p>
      <div class="rang"><dialog open style="position:static;margin:0;max-width:46ch"><h2>Nouvelle partie</h2><p>Une bataille est en cours. La remplacer ?</p><div style="display:flex;gap:var(--pas);justify-content:flex-end"><button class="bouton" style="height:var(--jeu-cible)">Annuler</button><button class="bouton" style="height:var(--jeu-cible)">Remplacer</button></div></dialog></div>`;
  }
  cadre(stage, corps);
}

// ─── La révision (v0.98.1) : le design system, deuxième jet (css/ds-v2.css, chargé après la feuille du jeu) ───
const meteo = `<div class="papier reg-ouvert demo"><h2>Météo</h2>
  <div class="libelle">Aujourd'hui</div><div>Temps sec, 14 °C</div>
  <div class="libelle">Le vent</div><div>Modéré : 29 km/h, vers le sud-est</div>
  <div class="libelle">Demain</div><div>Du brouillard, dit-on</div></div>`;
const meteoAvant = `<div class="papier reg-ouvert demo"><div class="tete"><b>J1/13 · 16 h 46 · temps sec, 14 °C</b></div>
  <div class="compte">Vent modéré : 29 km/h, vers le sud-est</div><div class="compte">Demain : du brouillard, dit-on</div></div>`;
export function revision(stage, vue) {
  let corps = '', v2 = true;
  if (vue === 'titres') {
    corps = `<h1 class="titre-ds">Cyclopéen</h1><p class="note">Les titres du jeu, des fenêtres et des dialogues passent au condensé fin et haut (Antonio, corps 300, capitales, lettres espacées), dans le style de Cast Iron ; le texte courant reste en mono. Trois tailles : 40 (jeu, dialogue), 28 (fenêtre, papier), 22 (section). Un titre n'est jamais coupé : pas de points de suspension, il passe à la ligne entre deux mots, équilibré.</p>
      <h2 class="titre-ds" style="border:0;margin:0">Nuit du 3e au 4e jour</h2><p class="note" style="margin-top:4px">28 · fenêtre, papier</p>
      <h3 class="titre-3" style="margin-top:16px">Les ordres de la nuit</h3><p class="note" style="margin-top:4px">22 · section</p>
      <div class="rang" style="margin-top:24px"><div><div class="note">Avant : la fenêtre météo avait pour « titre » tout son contenu, coupé dès que la ligne était longue</div>${meteoAvant}</div>
      <div><div class="note">Après : le titre est « Météo » ; ce qui la compose (aujourd'hui, le vent, demain) sont des libellés, pas des titres</div>${meteo}</div></div>
      <h2 style="margin-top:28px;font-size:var(--texte-moyen);font-family:var(--jeu-police)">La règle</h2>
      <p class="note">Un titre dit <b>ce qu'est</b> la fenêtre, en un ou deux mots. Une date, une valeur, une phrase, un compteur ne sont pas des titres : texte courant (14) ou libellé (12, glaise). Si un titre doit être coupé pour tenir, c'est qu'il porte un élément qui n'en est pas un.</p>`;
  } else if (vue === 'marges') {
    const lignes = [['Papier, haut et bas', '8 px', '16 px', '--papier-v'], ['Papier, côtés', '12 px', '24 px', '--papier-h'], ['Dialogue', '24 px', '32 px', '<code>dialog</code>'], ['Bouton de papier, hauteur', '32 px', '40 px', '--bouton-h'], ['Bouton, souffle de chaque côté', '8 px', '16 px', '--bouton-px'], ['Entre deux boutons', '4 px', '8 px', '--ecart'], ['Entre deux blocs d\'une fenêtre', '4 px', '12 px', '<code>.reg-ouvert</code> gap'], ['Bouton de menu, côtés', '16 px', '24 px', '<code>.bouton</code>']];
    corps = `<h1 class="titre-ds">Marges</h1><p class="note">Un cran de plus partout : plus de souffle autour du texte, des boutons plus faciles à viser. L'échelle gagne deux crans (24 et 32).</p>
      <table><tr><th>Où</th><th>Avant</th><th>Après</th><th>Jeton</th></tr>${lignes.map(([a, b, c, d]) => `<tr><td>${a}</td><td>${b}</td><td><b style="font-weight:normal;color:var(--jeu-nous)">${c}</b></td><td><code>${d}</code></td></tr>`).join('')}</table>
      <h2 style="font-size:var(--texte-moyen);font-family:var(--jeu-police)">Une fenêtre d'ordres</h2><div class="rang">
      <div class="papier reg-ouvert demo"><div class="tete"><b>2 · Protogyne</b><span>secteurs 3-4</span><button type="button" class="aide" aria-label="Fiche du régiment">?</button></div><div class="compte">52 debout · 9 blessés · 14 tombés</div><div class="ordre">Tient sa tranchée</div>
        <div class="actions"><button>Marcher</button><button>Regagner sa tranchée</button></div></div>
      <dialog open style="position:static;margin:0;max-width:46ch"><h2>Nouvelle partie</h2><p>Une bataille est en cours. La remplacer ?</p><div class="menu" style="display:flex;justify-content:flex-end"><button class="bouton" style="height:var(--jeu-cible)">Annuler</button><button class="bouton" style="height:var(--jeu-cible)">Remplacer</button></div></dialog></div>`;
  } else {
    const cas = c => `<div class="papier reg-ouvert demo" style="padding:var(--pas)"><div class="actions" style="--cols:1"><button class="${c}">Tir de réglage · 3 pts</button></div></div>`;
    const tableau = titre => `<h1 class="titre-ds" style="font-size:var(--titre-2,20px)">${titre}</h1><table><tr><th>Repos</th><th>Survol</th><th>Un bouton vivant, au survol</th></tr><tr><td>${cas('refus')}</td><td>${cas('refus est-survol')}</td><td>${cas('est-survol')}</td></tr></table>`;
    stage.append(el('p', { textContent: 'Un bouton qu\'on ne peut pas actionner (pas assez de points, bâtiment en chantier, posture interdite) se lit « impossible » avant même d\'y toucher : hachuré, pointillé, curseur « interdit ». Au survol rien ne change (aujourd\'hui il se remplit comme un bouton vivant) : la raison est dans l\'infobulle.' }));
    cadre(stage, tableau('Avant (v0.98.0)'), { haut: '200px', v2: false });
    cadre(stage, tableau('Après'), { haut: '200px', v2: true });
    return;
  }
  cadre(stage, corps, { v2 });
}
