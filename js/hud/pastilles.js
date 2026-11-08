// Les pastilles des engins sur le champ (Jérôme, v0.120.0 : « pastille 2B à appliquer aussi aux chars, avions et mitrailleuses alliés » ; sujet « Les engins d'en face sur le champ » du labo, variante F).
// Chaque char, poste de mitrailleuse et avion en vol, des deux camps, est un petit rond : le cœur à la couleur de son camp (bleu horizon chez nous, kaki d'en face), ceint d'un arc qui se vide avec
// sa vie ; un poste porte un trait, un avion un triangle ; détruit, l'anneau est pointillé et barré. Au survol il grossit et l'infobulle du jeu (`data-info`) dit tout : l'état, la vie, le canon ou la bande,
// l'expérience, les victimes. Le clic sur un des nôtres (char, poste) le choisit. Le dessin et les lignes de texte seulement : les données viennent de hud/chars.js, hud/nids.js et d'ici pour les avions.
// Les nombres d'avions : `positionDe` (avions.js). Rien n'est écrit dans la bataille.
import { positionDe, balayage } from '../avions.js?v=0.127.1';
import { MITRAILLAGE } from '../data/mitraillage.js?v=0.127.1';
import { NOUS } from '../bataille.js?v=0.127.1';

const NS = 'http://www.w3.org/2000/svg', R_ARC = 9, CIRC = 2 * Math.PI * R_ARC;
const REDUIT = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const MARQUES = { char: '', nid: '<rect class="marque" x="-1" y="-4" width="2" height="8"/>', avion: '<path class="marque" d="M0-5L4.5 4.5 0 2.2-4.5 4.5Z"/>' };
const NOMS_AVIONS = { 0: 'SPAD', 1: 'Albatros' };

export function creerPastilles({ $, bataille, moi = () => NOUS, versEcran, hauteurSol }) {
  const pastilles = new Map(), vues = new Set();
  const conteneur = () => $('chars-etiq');

  function creer(cle, d) {
    const p = document.createElement('div');
    p.className = `engin-pastille ${d.camp} ${d.type}`;
    p.innerHTML = `<svg viewBox="-12 -12 24 24" width="24" height="24" aria-hidden="true"><circle class="halo" r="11"/><circle class="coeur" r="6"/><circle class="arc" r="${R_ARC}" fill="none" stroke-width="3" transform="rotate(-90)"/>${MARQUES[d.type]}<path class="croix" d="M-4-4L4 4M4-4L-4 4"/></svg>`;
    const e = { p, arc: p.querySelector('.arc'), vie: -1, detruit: null, info: '', chev: d.chevrons ?? 0, choisi: null, onclick: null };
    conteneur().append(p);
    pastilles.set(cle, e);
    return e;
  }

  /* Pose (ou déplace) la pastille de `cle`. `d` : { type: 'char' | 'nid' | 'avion', camp: 'nous' | 'eux', sx, sy, vie (0 à 1), detruit, choisi, info (le texte de l'infobulle), onclick (les nôtres), chevrons (les nôtres : le saut d'un chevron gagné), vide (la bande est à sec) } */
  function poser(cle, d) {
    vues.add(cle);
    const e = pastilles.get(cle) ?? creer(cle, d);
    const cache = !Number.isFinite(d.sx) || !Number.isFinite(d.sy) || d.sx < -1e4 || d.sx > (conteneur().clientWidth || 1e4) + 60 || d.sy < -60 || d.sy > (conteneur().clientHeight || 1e4) + 120;
    e.p.hidden = cache;
    if (cache) return;
    e.p.style.transform = `translate(${Math.round(d.sx)}px, ${Math.round(d.sy)}px) translate(-50%, -100%)`;
    const vie = Math.max(0, Math.min(1, d.vie));
    if (Math.abs(vie - e.vie) > 0.004 || e.detruit !== !!d.detruit) { e.vie = vie; e.arc.style.strokeDasharray = `${(CIRC * vie).toFixed(1)} ${CIRC.toFixed(1)}`; }
    if (e.detruit !== !!d.detruit) { e.detruit = !!d.detruit; e.p.classList.toggle('detruit', e.detruit); }
    if (e.choisi !== !!d.choisi) { e.choisi = !!d.choisi; e.p.classList.toggle('choisi', e.choisi); }
    e.p.classList.toggle('vide', !!d.vide);
    if (d.info !== e.info) { e.info = d.info; e.p.dataset.info = d.info; e.p.setAttribute('aria-label', d.info.split('\n')[0].replace(/^#+ /, '')); }
    if (d.onclick && !e.onclick) { e.p.setAttribute('role', 'button'); e.p.tabIndex = 0; e.p.onclick = ev => { ev.stopPropagation(); e.onclick?.(); }; }
    e.onclick = d.onclick ?? null;
    if (d.chevrons !== undefined && d.chevrons > e.chev && !REDUIT()) { e.p.classList.remove('gagne'); void e.p.offsetWidth; e.p.classList.add('gagne'); }      // un chevron de gagné : la pastille saute
    if (d.chevrons !== undefined) e.chev = d.chevrons;
  }

  /* Les avions en vol, des deux camps */
  function avions(choisir = null, choisi = null) {
    const B = bataille(); if (!B) return;
    const M = moi();
    if (B.etat.phase !== 'jour') return;
    for (const v of B.etat.mitraillages ?? []) {
      if (v.etat !== 'vol' && v.etat !== 'chute') continue;
      const p = v.etat === 'vol' ? positionDe(v, B.etat.temps) : { x: v.chute?.x ?? v.cx, y: v.chute?.y ?? v.cy, h: 0 };
      const [sx, sy] = versEcran(p.x, p.y, hauteurSol(p.x, p.y) + p.h + 3), mien = v.camp === M, vie = Math.max(0, v.pv) / MITRAILLAGE.pv, tire = v.etat === 'vol' && balayage(v, B.etat.temps).actif;
      const info = [`# ${mien ? 'Avion' : 'Avion ennemi'} (${NOMS_AVIONS[v.camp] ?? 'avion'})`,
        `## ${v.etat === 'chute' ? 'en chute' : tire ? 'mitraille' : 'en vol'}`,
        `Cellule : **${Math.round(vie * 100)} %** (${Math.max(0, Math.round(v.pv))} / ${MITRAILLAGE.pv})`,
        ...(v.etat === 'vol' ? [`Altitude : ${Math.round(p.h)} m, ${MITRAILLAGE.vitesse} m/s`, tire ? 'Ses balles tombent sur la bande tracée.' : 'Il suit sa passe tracée, puis rentre.'] : ['Il tombe : l\'épave restera sur le champ.']),
        ...(mien ? ['Les hommes d\'en face qui tirent en l\'air l\'abîment : plus il vole bas au-dessus d\'eux, plus il perd de points.'] : ['Nos hommes debout qui tirent en l\'air l\'abîment.'])].join('\n');
      poser(`a${v.id}`, { type: 'avion', camp: mien ? 'nous' : 'eux', sx, sy, vie, detruit: v.etat === 'chute', choisi: mien && choisi === v.id, info: mien && choisir ? `${info}\nUn clic : sa fiche et la vue verrouillée.` : info, onclick: mien && choisir && v.etat === 'vol' ? () => choisir(v.id) : null });
    }
  }

  /* Ce qui n'a pas été posé depuis le dernier balayage disparaît (un char hors du champ, un avion rentré) */
  function balayer() {
    for (const [cle, e] of pastilles) if (!vues.has(cle)) { e.p.remove(); pastilles.delete(cle); }
    vues.clear();
  }
  function oublier() { for (const e of pastilles.values()) e.p.remove(); pastilles.clear(); vues.clear(); }
  return { poser, avions, balayer, oublier };
}
void NS;
