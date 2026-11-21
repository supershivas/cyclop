// Nos postes de mitrailleuse sur le champ et leur fiche (Jérôme, lot E : « on sélectionne le poste et on règle la direction du cône ; barre de vie, barre de munitions ; de l'xp »).
// Sur le champ : au-dessus de chaque poste à nous, une étiquette (ses chevrons, sa vie, ses munitions, son expérience) ; un clic sur elle le choisit. La fiche (`#nid-fiche`) : les barres,
// le bonus de ses chevrons, « Tourner » (le prochain clic sur le sol : la direction du cône), « Droit devant », « Fermer ». Le dessin et les boutons seulement : les ordres partent par `surBouton` (main.js).
import { NIDS } from '../data/nids.js?v=0.155.0';
import { bonusEnMots } from '../data/experience.js?v=0.155.0';
import { chevronsNid, cadenceNid, servantNid, raisonInactif } from '../nids.js?v=0.155.0';
import { jauge as jaugeT, bande } from './tuiles.js?v=0.155.0';
import { el, cle, rang, bloc, phrase, chevrons as chevronsF, poserEcusson, poserTampon } from './fiche-cadre.js?v=0.155.0';
import { reinitIds } from './bilan.js?v=0.155.0';
import { REPERES } from './barres.js?v=0.155.0';
import { NOUS } from '../bataille.js?v=0.155.0';

const REDUIT = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function creerNidsHud({ $, bataille, moi = () => NOUS, versEcran, hauteurSol, choisir, surBouton, pastilles }) {
  $('nid-fiche').onclick = e => { const b = e.target.closest('[data-nid]'); if (b) surBouton(b.dataset.nid); };
  let tuilesVues = '';
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
      const lignes = [`# ${mien ? 'Mitrailleuse' : 'Mitrailleuse ennemie'}`, `## ${etat}`, `Poste | **${Math.round(vie * 100)} %** (${Math.max(0, Math.round(n.pv))} / ${NIDS.pv})`, ...plus];
      if (mien) {
        if (!detruit) lignes.push(`Bande | **${n.muni}** / ${NIDS.munitions}`, `Servi par | ${rs ? rs.nom : 'personne'}`, `Expérience | ${nb ? '▲'.repeat(nb) : 'novice'} (${Math.round((n.exp ?? 0) * 100)} %)`, `Bonus | ${bonusEnMots('nid', nb)}`);
        lignes.push(`Victimes | **${n.tues ?? 0}**${par ? ` (${par})` : ''}`, `Rafales | ${n.rafales ?? 0}`, detruit ? 'Le génie peut le refaire (touche 6 puis un clic sur lui).' : 'Un clic : le choisir et tourner son cône.');
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
    poserTampon($('nid-fiche-etat-court'), inactif ? 'Inactif' : court[0].toUpperCase() + court.slice(1), inactif || tait || n.muni <= 0 ? 'orange' : '');
    poserEcusson($('nid-fiche-ec'), 'nid', { debout: vie / 100, chev: nb, vide: n.muni <= 0 });
    $('nid-fiche-qui').textContent = `Poste de mitrailleuse · ${rs ? `servi par le ${rs.nom}` : 'sans servant'}`;
    $('nid-fiche-ordre').textContent = inactif || ordre;
    fiche.classList.toggle('inactif', !!inactif);
    { const sv = suivi && suivi.genre === 'nid' && suivi.id === n.id ? suivi.mode : null; $('nid-fiche-vue').setAttribute('aria-pressed', sv === 'cinema'); $('nid-fiche-personne').setAttribute('aria-pressed', sv === 'personne'); }
    for (const b of fiche.querySelectorAll('[data-nid="tourner"],[data-nid="droit"]')) b.setAttribute('aria-disabled', inactif ? 'true' : 'false');
    // ses tuiles (Jérôme, 8 nov. : les tuiles du labo) : le poste, sa bande, ses victimes, son expérience ; refaites seulement quand une valeur change
    const par = Object.entries(n.tuesReg ?? {}).map(([r, k]) => `${B.etat.regiments[r]?.nom ?? 'régiment ' + r} ${k}`).join(', ');
    const sigFiche = [n.id, vie, n.muni, n.tues ?? 0, n.rafales ?? 0, Math.round((n.exp ?? 0) * 100), par].join(':');
    if (sigFiche !== tuilesVues) {
      tuilesVues = sigFiche; reinitIds();
      const tues = n.tues ?? 0, raf = n.rafales ?? 0;
      $('nid-fiche-cles').replaceChildren(
        cle(vie, '%', 'le poste', jaugeT(vie / 100, { reperes: [0.25, 0.5], larg: 100, haut: 8 })),
        cle(n.muni, `sur ${NIDS.munitions}`, 'la bande · refaite à l\'aube', bande(n.muni, NIDS.munitions, { pas: 50, larg: 100, haut: 8 })),
        cle(tues, tues > 1 ? 'hommes' : 'homme', tues > 1 ? 'abattus' : 'abattu'),
        cle(raf, raf > 1 ? 'rafales' : 'rafale', raf > 1 ? 'tirées' : 'tirée'));
      $('nid-fiche-tuiles').replaceChildren(
        ...(par ? [bloc('Ses victimes', [phrase(par)], '# Ses victimes\nPar régiment d\'en face')] : []),
        bloc('Expérience', [rang('', jaugeT(n.exp ?? 0, { reperes: REPERES.exp }), ''), el('p', 'fx-note', chevronsF(nb), ` ${nb ? bonusEnMots('nid', nb) : 'novice · aucun bonus'}`)]));
    }
    for (const b of fiche.querySelectorAll('.fx-o[data-nid]')) b.setAttribute('aria-pressed', String(b.dataset.nid === mode));
  }
  function oublier() {}
  return { maj, oublier };
}
