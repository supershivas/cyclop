// Nos postes de mitrailleuse sur le champ et leur fiche (Jérôme, lot E : « on sélectionne le poste et on règle la direction du cône ; barre de vie, barre de munitions ; de l'xp »).
// Sur le champ : au-dessus de chaque poste à nous, une étiquette (ses chevrons, sa vie, ses munitions, son expérience) ; un clic sur elle le choisit. La fiche (`#nid-fiche`) : les barres,
// le bonus de ses chevrons, « Tourner » (le prochain clic sur le sol : la direction du cône), « Droit devant », « Fermer ». Le dessin et les boutons seulement : les ordres partent par `surBouton` (main.js).
import { NIDS } from '../data/nids.js?v=0.123.0';
import { bonusEnMots } from '../data/experience.js?v=0.123.0';
import { chevronsNid, cadenceNid, servantNid, raisonInactif } from '../nids.js?v=0.123.0';
import { chevronsHtml } from './barres.js?v=0.123.0';
import { NOUS } from '../bataille.js?v=0.123.0';

const REDUIT = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function creerNidsHud({ $, bataille, moi = () => NOUS, versEcran, hauteurSol, choisir, surBouton, pastilles }) {
  $('nid-fiche').onclick = e => { const b = e.target.closest('[data-nid]'); if (b) surBouton(b.dataset.nid); };
  const pct = x => `${Math.max(0, Math.min(100, Math.round(x * 100)))}%`;
  // appelé à chaque image : les étiquettes, la fiche du poste choisi
  function maj(choisi, mode, suivi = null) {
    const B = bataille();
    if (!B) return;
    const M = moi(), nids = B.etat.nids.filter(n => n.camp === M && n.etat === 'actif');
    // les pastilles (v0.120.0 : une par poste des deux camps, `hud/pastilles.js`) ; l'infobulle dit tout
    for (const n of B.etat.nids) {
      const mien = n.camp === M, detruit = n.etat === 'detruit', vie = Math.max(0, n.pv) / NIDS.pv, [sx, sy] = versEcran(n.x, n.y, hauteurSol(n.x, n.y) + 2.5), nb = chevronsNid(n);
      let etat = 'détruit', plus = [];
      if (!detruit) {
        const inactif = mien ? raisonInactif(B, n) : '', pris = B.etat.troncons[n.troncon] !== n.camp;
        etat = pris ? 'se tait (tronçon pris)' : inactif ? 'inactif' : n.muni <= 0 ? 'à sec' : n.statut === 'tire' ? 'tire' : 'veille';
        plus = mien ? [inactif || (n.statut === 'tire' ? `Tire à ${NIDS.portee} m, une rafale toutes les ${cadenceNid(n).toFixed(2).replace('.', ',')} s.` : `Cône de ${NIDS.portee} m, il tire dès qu'un ennemi y entre.`)] : [`Cône de tir vers nos lignes, portée ${NIDS.portee} m.`];
      }
      const rs = mien && !detruit ? (sv => sv >= 0 ? B.etat.regiments[B.armee.reg[sv]] : null)(servantNid(B, n, true)) : null;
      const par = Object.entries(n.tuesReg ?? {}).map(([r, k]) => `${B.etat.regiments[r]?.nom ?? 'régiment ' + r} ${k}`).join(', ');
      const lignes = [`# ${mien ? 'Mitrailleuse' : 'Mitrailleuse ennemie'}`, `## ${etat}`, `Poste : **${Math.round(vie * 100)} %** (${Math.max(0, Math.round(n.pv))} / ${NIDS.pv})`, ...plus];
      if (mien) {
        if (!detruit) lignes.push(`Bande : ${n.muni} / ${NIDS.munitions}`, rs ? `Servi par : ${rs.nom}` : 'Servi par : personne', `Expérience : ${nb ? '▲'.repeat(nb) : 'novice'} (${Math.round((n.exp ?? 0) * 100)} %) · ${bonusEnMots('nid', nb)}`);
        lignes.push(`Victimes : **${n.tues ?? 0}**${par ? ` (${par})` : ''} · rafales : ${n.rafales ?? 0}`, detruit ? 'Le génie peut le refaire (touche 6 puis un clic sur lui).' : 'Un clic : le choisir et tourner son cône.');
      }
      pastilles.poser(`n${n.id}`, { type: 'nid', camp: mien ? 'nous' : 'eux', sx, sy, vie, detruit, choisi: mien && choisi === n.id, info: lignes.join('\n'), vide: mien && !detruit && n.muni <= 0, chevrons: mien ? nb : undefined, onclick: mien && !detruit ? () => choisir(n.id) : null });
    }
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
    // sans servant (ou tronçon pris), la fenêtre est inactive : aucun ordre, les boutons grisés (v0.115.0)
    const inactif = raisonInactif(B, n), sv = servantNid(B, n, true), rs = sv >= 0 ? B.etat.regiments[B.armee.reg[sv]] : null;
    $('nid-fiche-etat-court').textContent = inactif ? 'inactif' : court;
    $('nid-fiche-ordre').textContent = inactif || `${ordre}${rs ? ` Servi par le ${rs.nom}.` : ''}`;
    fiche.classList.toggle('inactif', !!inactif);
    { const sv = suivi && suivi.genre === 'nid' && suivi.id === n.id ? suivi.mode : null; $('nid-fiche-vue').textContent = sv === 'cinema' ? 'Libérer la vue' : 'Vue verrouillée'; $('nid-fiche-personne').textContent = sv === 'personne' ? 'Libérer la vue' : 'À la personne'; }
    for (const b of fiche.querySelectorAll('[data-nid="tourner"],[data-nid="droit"]')) b.setAttribute('aria-disabled', inactif ? 'true' : 'false');
    const par = Object.entries(n.tuesReg ?? {}).map(([r, k]) => `${B.etat.regiments[r]?.nom ?? 'régiment ' + r} ${k}`).join(', ');
    $('nid-fiche-stats').innerHTML = `<b>Victimes :</b> ${n.tues ?? 0}${par ? ` (${par})` : ''}<br><b>Rafales :</b> ${n.rafales ?? 0}`;
    $('nid-fiche-pv-t').textContent = `${vie} %`; $('nid-fiche-pv').style.width = `${vie}%`;
    $('nid-fiche-muni-t').textContent = `${n.muni} / ${NIDS.munitions}`; $('nid-fiche-muni').style.width = pct(n.muni / NIDS.munitions);
    $('nid-fiche-xp-t').innerHTML = nb ? chevronsHtml(nb) : 'novice'; $('nid-fiche-xp').style.width = pct(n.exp ?? 0);
    $('nid-fiche-bonus').textContent = `Chevrons : ${bonusEnMots('nid', nb)}.`;
    for (const b of fiche.querySelectorAll('[data-nid]')) b.classList.toggle('actif', b.dataset.nid === mode);
  }
  function oublier() {}
  return { maj, oublier };
}
