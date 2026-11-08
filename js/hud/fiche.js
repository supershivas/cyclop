// Les fiches : un homme (son nom, son âge, son grade, ce qu'il endure) ou un régiment (ses hommes, ses
// blessés, ses morts, et leurs fiches). De près, on regarde des hommes ; de loin, des régiments (Jérôme, v0.3.2).
import { NOUS, moralEnMots, rangDe } from '../bataille.js?v=0.127.2';
import { experienceEnMots, chevrons, peurEnMots, fatigueEnMots, CARACTERISTIQUES, caracEnMots } from '../identite.js?v=0.127.2';
import { majuscule, nomDe, indiceDe, premierDe, quiEst, tombe, bilan, enMots, refuseAujourdhui, actionEnMots, auFront, moyennes, prochainGrade, niveauMoral } from './lecture.js?v=0.127.2';
import { bonusEnMots } from '../data/experience.js?v=0.127.2';
import { corps, REPERES } from './barres.js?v=0.127.2';
import { jauge as jaugeT, carac as caracT, bande, partage, fil, tuilesDe } from './tuiles.js?v=0.127.2';
import { barreEffectif, jaugeMoral, reinitIds } from './bilan.js?v=0.127.2';
import { historiqueDe } from '../donnees-jour.js?v=0.127.2';

// `$` : l'accès aux éléments ; `R` : les réglages ; `bataille()` : la bataille en cours
const CARAC_TITRES = {   // (elles montent à l'usage : tirer, frapper, marcher fatigué, tenir sous le feu ; elles baissent avec une blessure ou la terreur)
  adresse: 'la chance de toucher quand il tire', force: 'ses coups de baïonnette au corps à corps', endurance: 'se fatigue moins en marchant, encaisse mieux les coups de l\'ennemi au corps à corps', calme: 'la peur le gagne moins vite',
};
export function creerFiche({ $, R, bataille }) {
  let fiche = null;                 // { id, camp } : un soldat ; { reg } : un régiment
  let listeVue = '';                // ce que montre la liste du régiment (refaite seulement quand ça change)
  let statsVues = '';               // les jauges et le corps, refaits seulement quand ils changent
  // les tuiles de la fiche (Jérôme, 8 nov. : les tuiles du labo) : refaites quand une valeur change d'un point (pas à chaque image : une tuile refaite sous le pointeur perdrait sa bulle)
  function montrerTuiles(sig, blocs) {
    $('fiche-tuiles').hidden = !blocs;
    if (sig === statsVues) return;
    statsVues = sig;
    reinitIds();
    $('fiche-tuiles').replaceChildren(...(blocs ? tuilesDe(blocs) : []));
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
    $('fiche-qui').textContent = `${majuscule(qui.grade)}, ${qui.age} ans`;
    const lien = $('fiche-regiment');
    lien.hidden = !reg0; lien.textContent = nomDe(reg0); lien.onclick = () => montrerRegiment(reg0.id);
    $('fiche-liste').replaceChildren(); listeVue = '';
    const promu = B.etat.grades[fiche.id];
    const lignes = [promu ? `promu ${qui.grade} le jour ${promu[1]}` : ''];
    if (i < 0) { montrerTuiles('', null); lignes.unshift(tombe(B, fiche.id)); }
    else {
      const exp = A.exp[i], nb = chevrons(exp), peur = A.peur[i], fj = A.fatJ[i], fb = A.fatB[i], bl = A.blessure[i];
      const caracs = [A.adresse[i], A.force[i], A.endurance[i], A.calme[i]], bases = [A.adresse0[i], A.force0[i], A.endurance0[i], A.calme0[i]];
      const depuis = auFront(B, fiche.id), nuits = Math.max(0, B.etat.jour - depuis), vict = A.victimes[i], suivant = prochainGrade(A.camp[i], qui.rang);
      const sig = `${fiche.id}:${bl}:${[peur, fj, fb, exp].map(v => Math.round(v * 100)).join(',')}:${caracs.map(Math.round).join(',')}:${B.etat.jour}:${vict}`;
      if (sig !== statsVues) montrerTuiles(sig, [
        { titre: 'Ce qu\'il endure', graphes: [['Peur', jaugeT(peur, { reperes: REPERES.peur }), peurEnMots(peur)], ['Jambes', jaugeT(fj, { reperes: REPERES.fatigue }), fatigueEnMots(fj)], ['Bras', jaugeT(fb, { reperes: REPERES.fatigue }), fatigueEnMots(fb)]], aide: 'La peur, la fatigue des jambes (la marche, plus dans la boue) et des bras (le tir) : les repères sont les seuils des mots.' },
        // ses caractéristiques (v0.69.0) : elles jouent dans le tir (adresse), le corps à corps (force, endurance de l'autre), la fatigue (endurance) et la peur (calme) ; elles évoluent : l'encoche dit le départ,
        // une flèche le chemin fait depuis le début de la bataille (3 points ou plus)
        { titre: 'Ses caractéristiques', graphes: CARACTERISTIQUES.map(([cle, nom], q) => {
          const v = Math.round(caracs[q]), d = v - bases[q], fleche = d >= 3 ? ' ↑' : d <= -3 ? ' ↓' : '';
          return [nom, caracT(v, bases[q]), `${v} · ${caracEnMots(v)}${fleche}`];
        }), mot: 'L\'encoche : sa valeur au début de la bataille.', aide: CARACTERISTIQUES.map(([cle, nom]) => `${nom} : ${CARAC_TITRES[cle]}`).join('\n') },
        { titre: 'Son corps', graphes: [['', corps(bl, fiche.id), bl ? `Blessé ${bl === 3 ? 'à la tête' : bl === 1 ? 'au bras' : 'à la jambe'}` : 'Indemne']] },
        { titre: 'Au front', chiffre: nuits + 1, unite: nuits ? 'jours' : 'jour', mot: `depuis le jour ${depuis}` },
        { titre: 'A abattu', chiffre: vict, unite: vict > 1 ? 'hommes' : 'homme', mot: suivant ? `Prochain grade : ${suivant}, si un supérieur tombe` : '' },
        { titre: 'Expérience', graphes: [['', jaugeT(exp, { reperes: REPERES.exp }), '']], chevrons: nb, mot: experienceEnMots(exp) || 'rien vu du feu' },
      ]);
      lignes.unshift(majuscule(actionEnMots(B, i)));
    }
    $('fiche-etat').replaceChildren(...lignes.filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  }
  function majFicheRegiment(B) {
    const reg = B.etat.regiments[fiche.reg], A = B.armee, b = bilan(B, reg);
    $('fiche-nom').textContent = nomDe(reg);
    $('fiche-qui').textContent = enMots(b);
    $('fiche-regiment').hidden = true;
    const m = moyennes(B, reg.id), nb = chevrons(m.exp), vivres = reg.vivres ?? R.nuit.vivres, niveau = niveauMoral(reg, R), hist = historiqueDe(B.etat.histo || [], reg, B.etat.jour, b.blesses);
    const morts = reg.pertes - (reg.debut?.pertes || 0), tues = reg.tues || 0, pris = reg.pris || 0, u = { debout: Math.max(0, b.vivants - b.blesses), blesses: b.blesses, evacues: b.evacues, morts: b.morts, initial: b.initial };
    const sig = `r${reg.id}:${[m.peur, m.fatJ, m.fatB, m.exp, reg.moral].map(v => Math.round(v * 100)).join(',')}:${vivres}:${reg.deroute ? 1 : 0}:${b.vivants}:${b.blesses}:${b.morts}:${b.evacues}:${tues}:${pris}:${hist.length}:${B.etat.jour}`;
    if (sig !== statsVues) montrerTuiles(sig, [
      { titre: 'Effectifs', chiffre: u.debout, unite: `debout sur ${u.initial}`, graphes: [['', barreEffectif(u, 0, { larg: 200, haut: 14 }), '']], mot: `${u.blesses} blessés · ${u.evacues} évacués · ${u.morts} morts` },
      { titre: 'Moral', chiffre: `${Math.round(reg.moral * 100)} %`, graphes: [['', jaugeMoral(reg.moral, niveau, { larg: 200, haut: 12 }), '']], mot: `${majuscule(moralEnMots(reg, R))} · repères : déroute, ébranlé`, aide: 'Moral du régiment : sous le premier repère, la déroute.' },
      { titre: 'Ses hommes (en moyenne)', graphes: [['Peur', jaugeT(m.peur, { reperes: REPERES.peur }), peurEnMots(m.peur)], ['Jambes', jaugeT(m.fatJ, { reperes: REPERES.fatigue }), fatigueEnMots(m.fatJ)], ['Bras', jaugeT(m.fatB, { reperes: REPERES.fatigue }), fatigueEnMots(m.fatB)]] },
      ...(hist.length > 1 ? [{ titre: 'Au fil des jours', graphes: [['', fil(hist, b.initial), '']], mot: 'Effectif (plein) et moral (tirets), soir après soir : le dernier point est aujourd\'hui.' }] : []),
      { titre: 'Aujourd\'hui', chiffre: morts, unite: morts > 1 ? 'morts' : 'mort' },
      { titre: 'Performances', graphes: [['Abattus', partage(tues, 0, { max: Math.max(30, tues) }), String(tues)], ['Tronçons', bande(pris * 10, Math.max(50, pris * 10)), String(pris)]], aide: 'Les hommes qu\'il a abattus au fusil ou à la baïonnette, les tronçons pris (avec lui).' },
      { titre: 'Vivres', chiffre: vivres, unite: vivres > 1 ? 'nuits' : 'nuit', graphes: [['', bande(vivres * 10, R.nuit.vivres * 10), '']] },
      { titre: 'Expérience', graphes: [['', jaugeT(m.exp, { reperes: REPERES.exp }), '']], chevrons: nb, mot: experienceEnMots(m.exp) || 'rien vu du feu' },
    ]);
    $('fiche-etat').replaceChildren(...[refuseAujourdhui(B, reg), nb ? `Chevrons : ${bonusEnMots('regiment', nb)}` : ''].filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
    const sigListe = `${reg.id}:${b.vivants}:${b.blesses}:${b.morts}:${b.evacues}:${Object.keys(B.etat.grades).length}`;
    if (sigListe === listeVue) return;
    listeVue = sigListe;
    // les officiers vivants, les blessés, les morts : chaque nom ouvre la fiche de l'homme
    const p0 = premierDe(B, reg.id), vivants = new Map();
    for (let i = 0; i < A.n; i++) if (A.reg[i] === reg.id) vivants.set(A.id[i], i);
    const groupes = [['Officiers', []], ['Blessés', []], ['Morts', []], ['Évacués', []]];
    const evacues = new Set(B.etat.evacues.map(e => e[0]));
    for (let id = p0; id < p0 + reg.initial; id++) {
      const i = vivants.get(id);
      if (i === undefined) groupes[evacues.has(id) ? 3 : 2][1].push(id);
      else if (A.blessure[i]) groupes[1][1].push(id);
      else if (rangDe(B, id, reg.id) <= 3) groupes[0][1].push(id);   // les officiers et l'adjudant d'aujourd'hui (les promus compris)
    }
    groupes[0][1].sort((a, b) => rangDe(B, a, reg.id) - rangDe(B, b, reg.id));
    const els = [];
    for (const [titre, ids] of groupes) {
      if (!ids.length) continue;
      els.push(Object.assign(document.createElement('h3'), { textContent: `${titre} (${ids.length})` }));
      const ul = document.createElement('ul');
      for (const id of ids) {
        const { qui } = quiEst(B, id), li = document.createElement('li'), bt = document.createElement('button');
        bt.className = 'nom'; bt.textContent = `${qui.prenom} ${qui.nom}, ${qui.grade}`;
        bt.onclick = () => montrerSoldat(id);
        li.append(bt); ul.append(li);
      }
      els.push(ul);
    }
    $('fiche-liste').replaceChildren(...els);
  }
  $('fiche-fermer').onclick = fermerFiche;

  return {
    montrerFiche, montrerSoldat, montrerRegiment, fermer: fermerFiche, maj: majFiche,
    get ouverte() { return fiche; },        // { id, camp } ou { reg } ou null
  };
}
