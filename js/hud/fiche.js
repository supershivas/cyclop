// Les fiches : un homme (son nom, son âge, son grade, ce qu'il endure) ou un régiment (ses hommes, ses
// blessés, ses morts, et leurs fiches). De près, on regarde des hommes ; de loin, des régiments (Jérôme, v0.3.2).
// La charpente (Jérôme, 20 nov., v0.153.0 : les fiches, deuxième jet) : la bande noire, quatre chiffres clés, « Maintenant » et « Son parcours », le pied (hud/fiche-cadre.js).
import { NOUS, moralEnMots, rangDe } from '../bataille.js?v=0.156.0';
import { experienceEnMots, chevrons, peurEnMots, fatigueEnMots, CARACTERISTIQUES, caracEnMots } from '../identite.js?v=0.156.0';
import { majuscule, nomDe, indiceDe, premierDe, quiEst, tombe, bilan, enMots, refuseAujourdhui, actionEnMots, auFront, moyennes, prochainGrade, niveauMoral, numeroDe, statutOrdre } from './lecture.js?v=0.156.0';
import { bonusEnMots } from '../data/experience.js?v=0.156.0';
import { corps, REPERES } from './barres.js?v=0.156.0';
import { jauge as jaugeT, carac as caracT, bande, partage, fil } from './tuiles.js?v=0.156.0';
import { el, cle, rang, bloc, note, phrase, chevrons as chevronsDe, deux, image, poserEcusson, poserTampon } from './fiche-cadre.js?v=0.156.0';
import { barreEffectif, jaugeMoral, reinitIds } from './bilan.js?v=0.156.0';
import { palmares } from './medailles.js?v=0.156.0';
import { ZONES_EN_MOTS } from '../data/causes.js?v=0.156.0';
import { historiqueDe } from '../donnees-jour.js?v=0.156.0';

// `$` : l'accès aux éléments ; `R` : les réglages ; `bataille()` : la bataille en cours ; `voir(id)` : voir par ses yeux ; `choisir(reg)` : choisir le régiment ; `posture(reg, stance)`
const CARAC_TITRES = {   // (elles montent à l'usage : tirer, frapper, marcher fatigué, tenir sous le feu ; elles baissent avec une blessure ou la terreur)
  adresse: 'la chance de toucher quand il tire', force: 'ses coups de baïonnette au corps à corps', endurance: 'se fatigue moins en marchant, encaisse mieux les coups de l\'ennemi au corps à corps', calme: 'la peur le gagne moins vite',
};
const COURT = { adresse: 'Tir', force: 'Force', endurance: 'Endur.', calme: 'Calme' };
const BLESSURE = ['Indemne', 'Bras', 'Jambe', 'Tête'];
const pl = (n, un, des) => (n > 1 ? des : un);
export function creerFiche({ $, R, bataille, voir = null, choisir = null, posture = null, moi = () => NOUS }) {
  let fiche = null;                 // { id, camp } : un soldat ; { reg } : un régiment
  let listeVue = '';                // ce que montre la liste du régiment (refaite seulement quand ça change)
  let statsVues = '';               // les chiffres, les jauges et le corps, refaits seulement quand ils changent (pas à chaque image : un bloc refait sous le pointeur perdrait sa bulle)
  let statsMort = '', lignePatrie = '';      // la médaille d'un mort, cherchée quand sa fiche est refaite
  function poser(sig, { cles, gauche, droite, titres = ['Maintenant', 'Son parcours'] }) {
    if (sig === statsVues) return;
    statsVues = sig;
    reinitIds();
    $('fiche-cles').replaceChildren(...cles);
    $('fiche-tuiles').replaceChildren(...gauche);
    $('fiche-parcours').replaceChildren(...droite);
    $('fiche-col-g').textContent = titres[0]; $('fiche-col-d').textContent = titres[1];
  }

  function montrerFiche(i) {
    const B = bataille();
    fiche = { id: B.armee.id[i], camp: B.armee.camp[i] };
    ouvrirFiche();
  }
  function montrerSoldat(id) { fiche = { id, camp: quiEst(bataille(), id).reg?.camp ?? NOUS }; ouvrirFiche(); }
  function montrerRegiment(regId) { fiche = { reg: regId }; ouvrirFiche(); }
  function ouvrirFiche() { $('fiche').hidden = false; listeVue = ''; statsVues = ''; majFiche(); }
  function fermerFiche() { fiche = null; statsVues = ''; $('fiche').hidden = true; $('repere-soldat').hidden = true; }

  function majFiche() {
    const B = bataille();
    if (!fiche || !B) return;
    if ('reg' in fiche) return majFicheRegiment(B);
    const A = B.armee, i = indiceDe(B, fiche.id), { reg: reg0, qui } = quiEst(B, fiche.id);
    $('fiche-nom').textContent = `${qui.prenom} ${qui.nom}`;
    $('fiche-qui').textContent = `${majuscule(qui.grade)}, ${qui.age} ans${reg0 ? ` · ${numeroDe(B, reg0)} · ${nomDe(reg0)}` : ''}`;
    const lien = $('fiche-regiment');
    lien.hidden = !reg0; lien.textContent = `← ${nomDe(reg0)}`; lien.onclick = () => montrerRegiment(reg0.id);
    const oeil = $('fiche-oeil'); oeil.hidden = !(voir && i >= 0 && A.camp[i] === moi() && !A.mort[i] && !B.etat.defunts?.[fiche.id]); oeil.onclick = () => voir(fiche.id);      // « Voir par ses yeux » : nos hommes vivants (v0.144.0)
    $('fiche-choisir').hidden = true; $('fiche-postures').hidden = true;
    $('fiche-liste').replaceChildren(); listeVue = '';
    const promu = B.etat.grades[fiche.id];
    const lignes = [promu ? `promu ${qui.grade} le jour ${promu[1]}` : ''];
    // Ses chiffres : ceux d'un vivant (la foule), d'un mort (sa fiche gardée, `etat.defunts`, v0.148.0), d'un évacué (`etat.evacues`) ; un relevé n'en garde pas
    const defunt = B.etat.defunts?.[fiche.id], evac = !defunt && i < 0 ? B.etat.evacues.find(e => e[0] === fiche.id) : null;
    let S = null;
    if (defunt) S = { exp: defunt[3], vict: defunt[4], caracs: defunt.slice(5, 9), bases: defunt.slice(9, 13), peur: defunt[13], fj: defunt[14], fb: defunt[15], bl: defunt[16], jour: defunt[0], camp: reg0?.camp ?? NOUS, zone: defunt[19] ?? '', arme: defunt[20] ?? '', par: defunt[21] ?? -1 };
    else if (evac) S = { exp: evac[5], vict: evac[6], caracs: evac[7].slice(0, 4), bases: evac[7].slice(4), peur: 0, fj: 0, fb: 0, bl: evac[2], jour: evac[1], camp: reg0?.camp ?? NOUS };
    else if (i >= 0) S = { exp: A.exp[i], vict: A.victimes[i], caracs: [A.adresse[i], A.force[i], A.endurance[i], A.calme[i]], bases: [A.adresse0[i], A.force0[i], A.endurance0[i], A.calme0[i]], peur: A.peur[i], fj: A.fatJ[i], fb: A.fatB[i], bl: A.blessure[i], jour: B.etat.jour, camp: A.camp[i] };
    const nb = S ? chevrons(S.exp) : 0;
    poserEcusson($('fiche-ec'), 'reg', { debout: defunt || !S ? 0 : 1, num: reg0 ? numeroDe(B, reg0) : '', chev: nb, detruit: !!defunt || !S });
    if (!S) {
      poserTampon($('fiche-tampon'), 'Relevé');
      poser(`x${fiche.id}`, { cles: [], gauche: [phrase(tombe(B, fiche.id))], droite: [] });
    } else {
      const { exp, caracs, bases, peur, fj, fb, bl, vict } = S;
      const depuis = auFront(B, fiche.id), nuits = Math.max(0, S.jour - depuis), suivant = i >= 0 && !defunt ? prochainGrade(S.camp, qui.rang) : '';
      const sig = `${fiche.id}:${defunt ? 'm' : evac ? 'e' : 'v'}:${bl}:${[peur, fj, fb, exp].map(v => Math.round(v * 100)).join(',')}:${caracs.map(Math.round).join(',')}:${S.jour}:${vict}`;
      if (defunt) poserTampon($('fiche-tampon'), 'Tombé', 'sang');
      else if (evac) poserTampon($('fiche-tampon'), 'Évacué');
      else poserTampon($('fiche-tampon'), peur >= REPERES.peur[0] ? peurEnMots(peur) : '', peur >= REPERES.peur[2] ? 'rouge' : peur >= REPERES.peur[1] ? 'orange' : '');
      // ses caractéristiques (v0.69.0) : elles jouent dans le tir (adresse), le corps à corps (force, endurance de l'autre), la fatigue (endurance) et la peur (calme) ; elles évoluent : l'encoche dit le départ,
      // une flèche le chemin fait depuis le début de la bataille (3 points ou plus)
      const caracsB = (larg) => bloc('Ses caractéristiques', CARACTERISTIQUES.map(([c], q) => {
        const v = Math.round(caracs[q]), d = v - bases[q], fleche = d >= 3 ? ' ↑' : d <= -3 ? ' ↓' : '';
        return rang(COURT[c], caracT(v, bases[q], { larg }), `${v}${fleche}`);
      }), `# Ses caractéristiques\n${CARACTERISTIQUES.map(([c, nom], q) => `${nom} | **${Math.round(caracs[q])}** ${caracEnMots(Math.round(caracs[q]))} (départ ${Math.round(bases[q])})`).join('\n')}\nL'encoche | sa valeur au début de la bataille\n${CARACTERISTIQUES.map(([c, nom]) => `${nom} | ${CARAC_TITRES[c]}`).join('\n')}`);
      const expB = bloc('Expérience', [rang('', jaugeT(exp, { reperes: REPERES.exp }), ''), el('p', 'fx-note', chevronsDe(nb), ` ${experienceEnMots(exp) || 'rien vu du feu'}${suivant ? ` · prochain grade : ${suivant}, si un supérieur tombe` : ''}`)]);
      const blesseMots = bl ? `blessé ${bl === 3 ? 'à la tête' : bl === 1 ? 'au bras' : 'à la jambe'}` : '';
      const cles = [
        cle(nuits + 1, pl(nuits + 1, 'jour', 'jours'), `au front, depuis le ${depuis === 1 ? '1er' : `${depuis}e`}`),
        cle(vict, pl(vict, 'homme', 'hommes'), `${pl(vict, 'abattu', 'abattus')}${defunt ? ' avant de tomber' : ''}`, vict ? bande(vict, Math.max(10, vict), { larg: 100, haut: 8, pas: 1 }) : ''),
        cle(nb ? '▲'.repeat(nb) : '—', '', experienceEnMots(exp) || 'rien vu du feu', '', `# Expérience\nChevrons | **${nb}**\n${experienceEnMots(exp) || 'rien vu du feu'}`),
        defunt ? cle(`J${defunt[0]}`, '', `tombé le ${defunt[0] === 1 ? '1er' : `${defunt[0]}e`} jour`) : cle(BLESSURE[bl] ?? '', '', bl ? 'blessé' : 'aucune blessure'),
      ];
      if (defunt) {
        // un mort (v0.151.0) : ni peur ni fatigue (elles n'ont plus de sens), mais sa mort : où le coup l'a pris, par quoi, par qui ; sa blessure d'avant reste sur le dessin
        const tireur = S.par >= 0 ? quiEst(B, S.par).qui : null;
        if (sig !== statsMort) { statsMort = sig; lignePatrie = palmares(B, S.camp, 'total').soldats.some(x => x.cle === 'patrie' && x.soldat === fiche.id) ? 'Médaille : mort pour la patrie' : ''; }
        const tue = [S.arme ? majuscule(S.arme) : majuscule(defunt[1] || ''), S.zone ? `touché ${ZONES_EN_MOTS[S.zone]}` : '', tireur ? `par ${tireur.grade} ${tireur.prenom} ${tireur.nom}` : '', bl ? `${blesseMots} avant` : ''].filter(Boolean);
        poser(sig + lignePatrie, { titres: ['Sa mort', 'Ce qu\'il était'], cles,
          gauche: [deux(bloc('Son corps', [image(corps(bl, fiche.id, { fatal: S.zone }))]), bloc('Ce qui l\'a tué', [el('p', 'fx-gros', tue[0] || 'On ne sait pas'), ...tue.slice(1).map(note)]))],
          droite: [caracsB(120), ...(lignePatrie ? [bloc('Médaille', [phrase('✝ Mort pour la patrie')])] : []), expB] });
        lignes.unshift(`Tombé le jour ${defunt[0]}${S.arme ? ` : ${S.arme}${S.zone ? `, ${ZONES_EN_MOTS[S.zone]}` : ''}` : defunt[1] ? ` (${defunt[1]})` : ''}.`);
        if (lignePatrie) lignes.push(lignePatrie);
      } else {
        poser(sig, { cles,
          gauche: [evac ? phrase(majuscule(tombe(B, fiche.id))) : bloc('Ce qu\'il endure', [rang('Peur', jaugeT(peur, { reperes: REPERES.peur, larg: 120 }), peurEnMots(peur)), rang('Jambes', jaugeT(fj, { reperes: REPERES.fatigue, larg: 120 }), fatigueEnMots(fj)), rang('Bras', jaugeT(fb, { reperes: REPERES.fatigue, larg: 120 }), fatigueEnMots(fb))],
            '# Ce qu\'il endure\nLa peur | elle le fait se tapir, puis fuir\nLes jambes | la marche, plus dans la boue\nLes bras | le tir\nLes repères | les seuils des mots')],
          droite: [deux(bloc('Son corps', [image(corps(bl, fiche.id))], `# Son corps\n${blesseMots ? majuscule(blesseMots) : 'Indemne'}`), caracsB(96)), expB] });
        if (evac) lignes.unshift(tombe(B, fiche.id)); else lignes.unshift(majuscule(actionEnMots(B, i)));
      }
    }
    $('fiche-etat').replaceChildren(...lignes.filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  }
  function majFicheRegiment(B) {
    const reg = B.etat.regiments[fiche.reg], A = B.armee, b = bilan(B, reg), nous = reg.camp === moi();
    $('fiche-nom').textContent = nomDe(reg);
    $('fiche-qui').textContent = `${numeroDe(B, reg)} · ${enMots(b)}`;
    $('fiche-regiment').hidden = true; $('fiche-oeil').hidden = true;
    const ch = $('fiche-choisir'); ch.hidden = !(choisir && nous && reg.effectif > 0); ch.onclick = () => choisir(reg.id);
    const po = $('fiche-postures'); po.hidden = !(posture && nous && reg.effectif > 0);
    for (const x of po.querySelectorAll('[data-stance]')) { x.setAttribute('aria-pressed', String(reg.stance === x.dataset.stance)); x.onclick = () => posture(reg.id, x.dataset.stance); }
    const m = moyennes(B, reg.id), nb = chevrons(m.exp), vivres = reg.vivres ?? R.nuit.vivres, niveau = niveauMoral(reg, R), hist = historiqueDe(B.etat.histo || [], reg, B.etat.jour, b.blesses);
    const morts = reg.pertes - (reg.debut?.pertes || 0), tues = reg.tues || 0, pris = reg.pris || 0, u = { debout: Math.max(0, b.vivants - b.blesses), blesses: b.blesses, evacues: b.evacues, morts: b.morts, initial: b.initial };
    poserEcusson($('fiche-ec'), 'reg', { debout: u.debout / Math.max(1, u.initial), blesses: u.blesses / Math.max(1, u.initial), num: numeroDe(B, reg), chev: nb, moral: niveau, detruit: !reg.effectif });
    poserTampon($('fiche-tampon'), !reg.effectif ? 'Anéanti' : niveau === 'deroute' ? 'En déroute' : niveau === 'ebranle' ? 'Ébranlé' : statutOrdre(B, reg), !reg.effectif ? 'sang' : niveau === 'deroute' ? 'rouge' : niveau === 'ebranle' ? 'orange' : '');
    const sig = `r${reg.id}:${[m.peur, m.fatJ, m.fatB, m.exp, reg.moral].map(v => Math.round(v * 100)).join(',')}:${vivres}:${reg.deroute ? 1 : 0}:${b.vivants}:${b.blesses}:${b.morts}:${b.evacues}:${tues}:${pris}:${hist.length}:${B.etat.jour}`;
    poser(sig, {
      cles: [
        cle(u.debout, `sur ${u.initial}`, `debout · ${u.blesses} bl. · ${u.morts} morts`, barreEffectif(u, reg.camp === NOUS ? 0 : 1, { larg: 100, haut: 8 }), `# Effectifs\nDebout | **${u.debout}** sur ${u.initial}\nBlessés | ${u.blesses}\nÉvacués | ${u.evacues}\nTombés | ${u.morts}`),
        cle(Math.round(reg.moral * 100), '%', `moral · ${moralEnMots(reg, R)}`, jaugeMoral(reg.moral, niveau, { larg: 100, haut: 8 }), '# Moral\nSous le premier repère | la déroute\nSous le second | ébranlé'),
        cle(tues, pl(tues, 'homme', 'hommes'), `${pl(tues, 'abattu', 'abattus')} par ses fusils`, '', '# Abattus\nAu fusil | ou à la baïonnette\nNi obus | ni avion, ni char'),
        cle(pris, pl(pris, 'tronçon', 'tronçons'), `${pl(pris, 'pris', 'pris')} depuis le début`, pris ? bande(pris, Math.max(8, pris), { larg: 100, haut: 8, pas: 1 }) : ''),
      ],
      gauche: [
        bloc('Ses hommes, en moyenne', [rang('Peur', jaugeT(m.peur, { reperes: REPERES.peur, larg: 120 }), peurEnMots(m.peur)), rang('Jambes', jaugeT(m.fatJ, { reperes: REPERES.fatigue, larg: 120 }), fatigueEnMots(m.fatJ)), rang('Bras', jaugeT(m.fatB, { reperes: REPERES.fatigue, larg: 120 }), fatigueEnMots(m.fatB))]),
        bloc('Vivres', [rang('', bande(vivres, R.nuit.vivres, { larg: 120, haut: 10, pas: 1 }), `${vivres} ${pl(vivres, 'nuit', 'nuits')}`)]),
        bloc('Aujourd\'hui', [phrase(`${morts} ${pl(morts, 'mort', 'morts')} · ${statutOrdre(B, reg).toLowerCase()}`)]),
      ],
      droite: [
        ...(hist.length > 1 ? [bloc('Soir après soir', [image(fil(hist, b.initial, { larg: 260, haut: 56 }))], '# Soir après soir\nPlein | l\'effectif\nTirets | le moral\nLe cercle | ce soir')] : []),
        bloc('Expérience', [rang('', jaugeT(m.exp, { reperes: REPERES.exp }), ''), el('p', 'fx-note', chevronsDe(nb), ` ${experienceEnMots(m.exp) || 'rien vu du feu'}`)], nb ? `# Chevrons\n${bonusEnMots('regiment', nb)}` : ''),
      ],
    });
    $('fiche-etat').replaceChildren(...[refuseAujourdhui(B, reg)].filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
    const sigListe = `${reg.id}:${b.vivants}:${b.blesses}:${b.morts}:${b.evacues}:${Object.keys(B.etat.grades).length}`;
    if (sigListe === listeVue) return;
    listeVue = sigListe;
    // les officiers vivants, puis les blessés, les morts, les évacués (les premiers noms, le reste en nombre) : chaque nom ouvre la fiche de l'homme
    const p0 = premierDe(B, reg.id), vivants = new Map();
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) vivants.set(A.id[i], i);
    const groupes = [['Officiers', [], 4], ['Blessés', [], 2], ['Morts', [], 2], ['Évacués', [], 2]];
    const evacues = new Set(B.etat.evacues.map(e => e[0]));
    for (let id = p0; id < p0 + reg.initial; id++) {
      const i = vivants.get(id);
      if (i === undefined) groupes[evacues.has(id) ? 3 : 2][1].push(id);
      else if (A.blessure[i]) groupes[1][1].push(id);
      else if (rangDe(B, id, reg.id) <= 3) groupes[0][1].push(id);   // les officiers et l'adjudant d'aujourd'hui (les promus compris)
    }
    groupes[0][1].sort((a, b) => rangDe(B, a, reg.id) - rangDe(B, b, reg.id));
    const els = [];
    for (const [titre, ids, max] of groupes) {
      if (!ids.length) continue;
      const puces = ids.slice(0, max).map(id => {
        const { qui } = quiEst(B, id), bt = el('button', 'nom fx-puce', `${qui.nom}, ${qui.grade}`);
        bt.type = 'button'; bt.dataset.info = `# ${qui.prenom} ${qui.nom}\n${majuscule(qui.grade)}\nUn clic | sa fiche`;
        bt.onclick = () => montrerSoldat(id); return bt;
      });
      els.push(el('div', 'fx-groupe', el('h4', '', `${titre} (${ids.length})`), el('div', 'fx-puces', ...puces, ids.length > max ? el('span', 'fx-note', `+${ids.length - max}`) : null)));
    }
    $('fiche-liste').replaceChildren(...els);
  }
  $('fiche-fermer').onclick = fermerFiche;

  return {
    montrerFiche, montrerSoldat, montrerRegiment, fermer: fermerFiche, maj: majFiche,
    get ouverte() { return fiche; },        // { id, camp } ou { reg } ou null
  };
}
