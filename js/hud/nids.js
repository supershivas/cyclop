// Nos postes de mitrailleuse sur le champ et leur fiche (Jérôme, lot E : « on sélectionne le poste et on règle la direction du cône ; barre de vie, barre de munitions ; de l'xp »).
// Sur le champ : au-dessus de chaque poste à nous, une étiquette (ses chevrons, sa vie, ses munitions, son expérience) ; un clic sur elle le choisit. La fiche (`#nid-fiche`) : les barres,
// le bonus de ses chevrons, « Tourner » (le prochain clic sur le sol : la direction du cône), « Droit devant », « Fermer ». Le dessin et les boutons seulement : les ordres partent par `surBouton` (main.js).
import { NIDS } from '../data/nids.js?v=0.115.1';
import { bonusEnMots } from '../data/experience.js?v=0.115.1';
import { chevronsNid, cadenceNid } from '../nids.js?v=0.115.1';
import { chevronsHtml } from './barres.js?v=0.115.1';
import { NOUS } from '../bataille.js?v=0.115.1';

const REDUIT = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function creerNidsHud({ $, bataille, moi = () => NOUS, versEcran, hauteurSol, choisir, surBouton }) {
  const etiq = new Map();
  $('nid-fiche').onclick = e => { const b = e.target.closest('[data-nid]'); if (b) surBouton(b.dataset.nid); };
  const pct = x => `${Math.max(0, Math.min(100, Math.round(x * 100)))}%`;
  // appelé à chaque image : les étiquettes, la fiche du poste choisi
  function maj(choisi, mode) {
    const B = bataille();
    if (!B) return;
    const M = moi(), nids = B.etat.nids.filter(n => n.camp === M && n.etat === 'actif'), vus = new Set();
    for (const n of nids) {
      vus.add(n.id);
      let e = etiq.get(n.id);
      if (!e) {
        const d = document.createElement('div'); d.className = 'char-etiq nid-etiq'; d.setAttribute('role', 'button'); d.tabIndex = 0; d.title = 'Choisir ce poste de mitrailleuse';
        d.innerHTML = '<span class="nom">Mitrailleuse</span><span class="chevrons"></span><span class="pv"><i></i></span><span class="canon"><i></i></span><span class="xp"><i></i></span>';
        d.onclick = ev => { ev.stopPropagation(); choisir(n.id); };
        $('chars-etiq').append(d);
        etiq.set(n.id, e = { d, pv: d.querySelector('.pv i'), muni: d.querySelector('.canon i'), xp: d.querySelector('.xp i'), chev: d.querySelector('.chevrons'), nb: chevronsNid(n) });
        e.chev.innerHTML = chevronsHtml(e.nb);
      }
      const [sx, sy] = versEcran(n.x, n.y, hauteurSol(n.x, n.y) + 2.5);
      const cv = $('canvas'), dedans = sx > -80 && sx < cv.clientWidth + 80 && sy > -40 && sy < cv.clientHeight + 120;
      // La règle (Jérôme, retour du 1er nov.) : l'étiquette n'est là que si le poste a quelque chose à dire — choisi, abîmé, presque à sec, ou il vient de tirer. Sinon le champ reste net.
      const E = NIDS.etiquette, parle = choisi === n.id || n.pv < NIDS.pv || n.muni <= NIDS.munitions * E.munBas || B.etat.temps - (n.derniere ?? -1e9) < E.apresRafale;
      e.d.hidden = !dedans || !parle || B.etat.phase !== 'jour';       // hors de la vue, la nuit ou sans rien à dire : pas d'étiquette
      if (!e.d.hidden) e.d.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      e.pv.style.width = pct(n.pv / NIDS.pv); e.muni.style.width = pct(n.muni / NIDS.munitions); e.xp.style.width = pct(n.exp ?? 0);
      const nb = chevronsNid(n);
      if (nb !== e.nb) { if (nb > e.nb && !REDUIT()) { e.chev.classList.remove('gagne'); void e.chev.offsetWidth; e.chev.classList.add('gagne'); } e.nb = nb; e.chev.innerHTML = chevronsHtml(nb); }
      e.d.classList.toggle('choisi', choisi === n.id);
      e.d.classList.toggle('vide', n.muni <= 0);
    }
    for (const [id, e] of etiq) if (!vus.has(id)) { e.d.remove(); etiq.delete(id); }
    const n = nids.find(k => k.id === choisi), fiche = $('nid-fiche');
    fiche.hidden = !n;
    if (!n) return;
    const nb = chevronsNid(n), vie = Math.round(n.pv / NIDS.pv * 100), tait = B.etat.troncons[n.troncon] !== n.camp;
    const MOTS = {
      pris: ['se tait', 'Son tronçon est pris : plus personne pour le servir.'],
      sec: ['à sec', 'La bande est vide : elle sera refaite à l\'aube.'],
      seul: ['sans servant', `Aucun de nos hommes à moins de ${NIDS.equipage} m : le poste se tait tant que la tranchée est vide.`],
      veille: ['veille', `Servi, mais personne à portée (${NIDS.portee} m) dans son cône : il tire dès qu'un ennemi y entre.`],
      tire: ['tire', `Tire à ${NIDS.portee} m, une rafale toutes les ${cadenceNid(n).toFixed(2).replace('.', ',')} s.`],
    }, [court, ordre] = MOTS[tait ? 'pris' : n.statut] ?? MOTS.veille;
    $('nid-fiche-etat-court').textContent = court;
    $('nid-fiche-ordre').textContent = ordre;
    $('nid-fiche-pv-t').textContent = `${vie} %`; $('nid-fiche-pv').style.width = `${vie}%`;
    $('nid-fiche-muni-t').textContent = `${n.muni} / ${NIDS.munitions}`; $('nid-fiche-muni').style.width = pct(n.muni / NIDS.munitions);
    $('nid-fiche-xp-t').innerHTML = nb ? chevronsHtml(nb) : 'novice'; $('nid-fiche-xp').style.width = pct(n.exp ?? 0);
    $('nid-fiche-bonus').textContent = `Chevrons : ${bonusEnMots('nid', nb)}.`;
    for (const b of fiche.querySelectorAll('[data-nid]')) b.classList.toggle('actif', b.dataset.nid === mode);
  }
  function oublier() { for (const e of etiq.values()) e.d.remove(); etiq.clear(); }
  return { maj, oublier };
}
