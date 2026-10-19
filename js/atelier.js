// L'Atelier (section 17) : il MODIFIE le contenu que le jeu lit.
// Chaque modification est gardée tout de suite dans ce navigateur (brouillon),
// visible dans le jeu de ce navigateur, puis publiée d'un geste dans le dépôt
// (un commit sur main, par l'API de GitHub) : assets/design/reglages.json.
// Les outils : les réglages chiffrés (Jérôme, v0.1.0) et la carte, en lecture seule pour l'instant (`atelier-carte.js`).
import { createPublisher, TOKEN_URL } from './lib/gh-publish.js?v=0.36.2';
import { validerSecteur } from './tranchees.js?v=0.36.2';
import { SECTEURS } from './data/secteur.js?v=0.36.2';
import { ongletCarte } from './atelier-carte.js?v=0.36.2';
import { chargerContenu, lireBrouillon, ecrireBrouillon, compterBrouillon, deplier, secteurEffectif } from './design-store.js?v=0.36.2';

const REPO = 'supershivas/cyclop';
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pub = createPublisher({ repo: REPO, tokenKey: 'cyclopeen:gh-token' });
let contenu = await chargerContenu();

function aPublier() {
  const b = lireBrouillon();
  const n = compterBrouillon(b);
  $('a-publier').textContent = n ? `${n} à publier` : '';
  return n;
}
const fusionner = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && a[k] && typeof a[k] === 'object' ? fusionner(a[k], v) : v; return a; };
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 3000); }

// ─── Réglages chiffrés ─────────────────────────────────────────────────────
function ongletReglages(zone) {
  const b = lireBrouillon();
  const champs = [];
  for (const [groupe, valeurs] of Object.entries(contenu.publie.reglages)) {
    for (const [cle, publie] of Object.entries(valeurs)) {
      if (typeof publie !== 'number') continue;
      const local = b.reglages?.[groupe]?.[cle];
      const input = el('input', { type: 'number', value: local ?? publie, step: 'any' });
      const etiquette = el('span', { textContent: `${groupe}.${cle}`, className: local != null ? 'at-modifie' : '' });
      input.onchange = () => {
        const v = Number(input.value);
        const br = lireBrouillon(); br.reglages = br.reglages || {}; br.reglages[groupe] = br.reglages[groupe] || {};
        if (v === publie) delete br.reglages[groupe][cle]; else br.reglages[groupe][cle] = v;
        if (!Object.keys(br.reglages[groupe]).length) delete br.reglages[groupe];
        ecrireBrouillon(br);
        etiquette.className = v === publie ? '' : 'at-modifie';
        aPublier();
      };
      champs.push(el('label', { className: 'at-field' }, etiquette, input));
    }
  }
  zone.replaceChildren(el('h2', { textContent: 'Réglages' }),
    el('p', { className: 'at-note', textContent: 'Les nombres du jeu (mètres, secondes de jeu, quarts de 25 cm). En rouge : modifié dans ce navigateur, pas encore publié. Le jeu de ce navigateur les utilise déjà, à la prochaine bataille.' }), ...champs);
}

// ─── Publier ───────────────────────────────────────────────────────────────
function ongletPublier(zone) {
  const jeton = el('input', { type: 'password', placeholder: 'github_pat_…', value: pub.getToken(), autocomplete: 'off' });
  const statut = el('p', { className: 'at-note' });
  const n = aPublier();
  zone.replaceChildren(
    el('h2', { textContent: 'Publier' }),
    el('p', { className: 'at-note' }, `Publier écrit les retouches dans le dépôt ${REPO} (un commit sur main) ; le jeu est à jour partout en une à dix minutes. Il faut un jeton GitHub limité à ce dépôt, avec le droit « Contents : Read and write ». Il reste dans ce navigateur et n'est jamais exporté. `,
      el('a', { href: TOKEN_URL, target: '_blank', rel: 'noopener', textContent: 'Créer un jeton' })),
    el('div', { className: 'at-row' }, jeton, el('button', { textContent: 'Enregistrer le jeton', onclick: () => { pub.setToken(jeton.value); toast('Jeton enregistré dans ce navigateur'); } })),
    el('div', { className: 'at-row' }, el('button', { className: 'primaire', textContent: n ? `Publier (${n})` : 'Rien à publier', disabled: !n, onclick: publier })),
    statut,
  );
  async function publier() {
    try {
      const b = lireBrouillon();
      const fichiers = [];
      if (b.reglages && Object.keys(b.reglages).length) {
        const enLigne = (await pub.readJSON('assets/design/reglages.json')) || {};
        for (const [g, v] of Object.entries(b.reglages)) enLigne[g] = { ...(enLigne[g] || {}), ...v };
        fichiers.push({ path: 'assets/design/reglages.json', json: enLigne });
      }
      if (b.secteurs && Object.keys(b.secteurs).length) {
        // un secteur retouché est contrôlé avant d'être écrit (tranchées dans l'ordre, tracé qui ne se coupe pas…) : on refuse à voix haute
        for (const id of Object.keys(b.secteurs)) {
          const pb = validerSecteur(secteurEffectif(SECTEURS[id], contenu.publie.secteurs[id], deplier(b.secteurs[id])));
          if (pb.length) throw new Error(`Secteur « ${SECTEURS[id].nom} » refusé : ${pb.join(' ; ')}. Corrigez-le dans l'onglet Carte.`);
        }
        const enLigne = (await pub.readJSON('assets/design/secteurs.json')) || {};
        for (const [id, plat] of Object.entries(b.secteurs)) enLigne[id] = fusionner(enLigne[id] || {}, deplier(plat));
        fichiers.push({ path: 'assets/design/secteurs.json', json: enLigne });
      }
      await pub.publish(fichiers, { message: "Publie les retouches de l'atelier", progress: t => { statut.textContent = t; } });
      ecrireBrouillon({});
      contenu = await chargerContenu();
      toast('Publié');
      ongletPublier(zone);
    } catch (e) { statut.textContent = e.message; }
  }
}

const ONGLETS = { Réglages: ongletReglages, Carte: zone => ongletCarte(zone, { el, R: contenu.reglages, publie: contenu.publie.secteurs, aPublier }), Publier: ongletPublier };
function ouvrir(nom) {
  for (const b of $('onglets').children) b.classList.toggle('is-on', b.textContent === nom);
  ONGLETS[nom]($('travail'));
  history.replaceState(null, '', `#${nom}`);
}
$('onglets').append(...Object.keys(ONGLETS).map(nom => el('button', { textContent: nom, onclick: () => ouvrir(nom) })));
ouvrir(ONGLETS[decodeURIComponent(location.hash.slice(1))] ? decodeURIComponent(location.hash.slice(1)) : 'Réglages');
aPublier();
