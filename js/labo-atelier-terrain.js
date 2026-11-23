// L'atelier de terrain (Jérôme, 15 nov. : « dans le labo, un atelier de terrain où l'on peut régler heures, saisons et météo avec des curseurs ») :
// le vrai rendu du jeu sur une vraie bataille, et des curseurs pour l'heure (ou la nuit), la saison, le temps qu'il fait, le réglage « Éclairage »,
// le zoom et la caméra (l'inclinaison va jusqu'à l'horizon, pour voir le ciel). Le temps peut passer (un jour de jeu en une minute) et des obus
// tomber au centre de la vue (pour voir les éclairs, les incendies et les fusées la nuit). Le dessin seulement : aucune règle ne change.
import { nouvelleBataille, avancer, regarderAu, ordonnerMarche, ordonnerBarrage } from './bataille.js?v=0.161.1';
import { creerRendu, ZOOMS } from './rendu3d.js?v=0.161.1';
import { METEO } from './data/meteo.js?v=0.161.1';
import { SOLEIL_JEU } from './data/soleil.js?v=0.161.1';
import { hash2 } from './lib/rng.js?v=0.161.1';

// les crans des curseurs (l'ordre est celui du curseur, de gauche à droite)
const SAISONS = [['printemps', 'Printemps'], ['ete', 'Été'], ['automne', 'Automne'], ['hiver', 'Hiver']];
const TEMPS = ['canicule', 'beau', 'sec', 'gel', 'couvert', 'brouillard', 'pluie', 'neige', 'tempete'];
const ECLAIRAGES = [['bas', 'Bas'], ['moyen', 'Moyen'], ['haut', 'Haut']];
const hhmm = h => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// `zoom`, `saison` : les crans de départ
export function atelierTerrain(stage, R, el, { zoom = 3, saison = 2 } = {}) {
  const reglage = { heure: 9, nuit: false, saison, temps: 2, eclairage: 2, zoom, tangage: 0.95, yaw: 0.15, passe: false, obus: false };
  const boite = el('div'); boite.style.cssText = 'position:relative;width:100%;height:min(66vh,540px);overflow:hidden';
  const canvas = el('canvas'); canvas.style.cssText = 'position:absolute;left:0;top:0;image-rendering:pixelated';
  boite.append(canvas);
  const releve = el('p', { className: 'releve', textContent: '…' });
  // un curseur : son nom, sa valeur en clair, et ce qu'il change
  const curseurs = el('div'); curseurs.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 18px;margin:8px 0';
  const valeurs = {};
  function curseur(cle, nom, min, max, pas, texte) {
    const lbl = el('label'); lbl.style.cssText = 'display:flex;flex-direction:column;gap:2px';
    const tete = el('span'); const val = el('b', { textContent: texte(reglage[cle]) }); tete.append(nom + ' : ', val);
    const input = el('input', { type: 'range', min, max, step: pas, value: reglage[cle] }); input.style.cssText = 'width:100%;min-height:32px';
    input.setAttribute('aria-label', nom);
    input.oninput = () => { reglage[cle] = Number(input.value); val.textContent = texte(reglage[cle]); appliquer(cle); };
    valeurs[cle] = { input, val, texte };
    lbl.append(tete, input); curseurs.append(lbl);
  }
  function caseACocher(cle, nom) {
    const lbl = el('label'); lbl.style.cssText = 'display:flex;align-items:center;gap:8px;min-height:44px';
    const input = el('input', { type: 'checkbox', checked: reglage[cle] }); input.style.cssText = 'width:22px;height:22px';
    input.onchange = () => { reglage[cle] = input.checked; appliquer(cle); };
    valeurs[cle] = { input };
    lbl.append(input, nom); curseurs.append(lbl);
  }
  curseur('heure', 'Heure', 6, 18, 0.25, hhmm);
  curseur('saison', 'Saison', 0, SAISONS.length - 1, 1, v => SAISONS[v][1]);
  curseur('temps', 'Temps qu\'il fait', 0, TEMPS.length - 1, 1, v => METEO[TEMPS[v]].nom);
  curseur('eclairage', 'Éclairage', 0, 2, 1, v => ECLAIRAGES[v][1]);
  curseur('zoom', 'Zoom', 0, ZOOMS.length - 1, 1, v => `${ZOOMS[v]} px/m`);
  curseur('tangage', 'Inclinaison (vers l\'horizon)', 0.08, 1.35, 0.01, v => `${Math.round(v * 180 / Math.PI)}°`);
  curseur('yaw', 'Rotation', -0.6, 0.6, 0.01, v => `${Math.round(v * 180 / Math.PI)}°`);
  caseACocher('nuit', 'La nuit');
  caseACocher('passe', 'Le temps passe (un jour en une minute)');
  caseACocher('obus', 'Des obus au centre de la vue');
  const raz = el('button', { className: 'essai', textContent: 'Remettre la vue du jeu', onclick: () => {
    Object.assign(reglage, { zoom, tangage: 0.95, yaw: 0.15 });
    for (const k of ['zoom', 'tangage', 'yaw']) { valeurs[k].input.value = reglage[k]; valeurs[k].val.textContent = valeurs[k].texte(reglage[k]); }
    appliquer('tangage'); appliquer('zoom');
  } });
  const horizon = el('button', { className: 'essai', textContent: 'Regarder le ciel', onclick: () => {
    Object.assign(reglage, { zoom: 2, tangage: 0.12 });
    for (const k of ['zoom', 'tangage']) { valeurs[k].input.value = reglage[k]; valeurs[k].val.textContent = valeurs[k].texte(reglage[k]); }
    appliquer('tangage'); appliquer('zoom');
  } });
  stage.append(boite, curseurs, el('p', {}, raz, horizon), releve);

  let raf = 0, rendu = null, B = null, fini = false;
  // ce que chaque curseur change : l'heure et le temps sont relus à chaque image (la bataille avance, `regarderAu` les remet)
  function appliquer(cle) {
    if (!rendu || !B) return;
    if (cle === 'saison') {
      const s = SAISONS[reglage.saison][0];
      B.etat.sol.saison = s; rendu.attacher(B);      // la saison change la couleur de l'herbe (rendu3d.attacher) et les feuilles
    }
    if (cle === 'eclairage') rendu.eclairage = ECLAIRAGES[reglage.eclairage][0];
    if (cle === 'zoom') rendu.vue.zoom = reglage.zoom;
    if (cle === 'tangage' || cle === 'yaw') rendu.placerCamera(reglage.yaw, reglage.tangage);
  }
  (async () => {
    B = nouvelleBataille(5, R, { soldats: 600 });
    ordonnerMarche(B, B.etat.regiments.filter(r => r.camp === 0).slice(2, 6).map(r => r.id), B.etat.marges.x + 200, B.etat.marges.y + 175);
    rendu = await creerRendu(canvas, {});
    if (fini) { rendu.detruire(); return; }
    rendu.redimensionner(); rendu.attacher(B);
    window.__atelier = { rendu, B, reglage };                     // (les scripts : outils et captures)
    rendu.bord = 'faux-ciel'; rendu.ombresRelief = true; rendu.ombresNuages = true; rendu.soleilReglage = { ...SOLEIL_JEU };      // la lumière du jeu (main.js)
    rendu.vue.cx = B.etat.marges.x + 200; rendu.vue.cz = B.etat.marges.y + 200;
    for (const k of ['saison', 'eclairage', 'zoom', 'tangage']) appliquer(k);
    let t = performance.now(), tReleve = 0, tObus = 0.5, kObus = 0;
    const boucle = now => {
      const dt = Math.min(0.1, (now - t) / 1000); t = now;
      // le temps qui passe : un jour de jeu (6 h → 18 h) en 60 s ; le curseur de l'heure suit
      if (reglage.passe && !reglage.nuit) {
        reglage.heure += dt * 12 / 60; if (reglage.heure > 18) reglage.heure = 6;
        const v = valeurs.heure; v.input.value = reglage.heure; v.val.textContent = hhmm(reglage.heure);
      }
      if (reglage.obus && (tObus -= dt) < 0) {
        tObus = 2.5; kObus++;
        ordonnerBarrage(B, ['155', '75', '220'][kObus % 3], rendu.vue.cx + hash2(kObus, 3, 9) * 60 - 30, rendu.vue.cz - 10 + hash2(kObus, 4, 9) * 20, 1);
      }
      let ev = [];
      if (!reglage.nuit) { B.etat.phase = 'jour'; ev = avancer(B); }
      regarderAu(B, Math.min(reglage.heure, 17.99), TEMPS[reglage.temps]);     // l'heure et le temps choisis, à chaque image (`avancer` les ferait glisser)
      if (reglage.nuit) B.etat.phase = 'nuit';
      rendu.dessiner(dt, ev);
      if ((tReleve -= dt) < 0) {
        tReleve = 0.5;
        const st = rendu.stats;
        releve.textContent = `${reglage.nuit ? 'La nuit' : hhmm(reglage.heure)} · ${SAISONS[reglage.saison][1].toLowerCase()} · ${METEO[TEMPS[reglage.temps]].nom} · éclairage ${ECLAIRAGES[reglage.eclairage][1].toLowerCase()} · dessin ${st.ms.rendu} ms (côté jeu) · ${st.soldatsVus} soldats dessinés`;
      }
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
  })();
  return () => { fini = true; cancelAnimationFrame(raf); rendu?.detruire(); };
}
