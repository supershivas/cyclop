// Les fiches : un homme (son nom, son âge, son grade, ce qu'il endure) ou un régiment (ses hommes, ses
// blessés, ses morts, et leurs fiches). De près, on regarde des hommes ; de loin, des régiments (Jérôme, v0.3.2).
import { NOUS, moralEnMots, rangDe } from '../bataille.js?v=0.99.1';
import { experienceEnMots, chevrons, peurEnMots, fatigueEnMots, CARACTERISTIQUES, caracEnMots } from '../identite.js?v=0.99.1';
import { majuscule, nomDe, indiceDe, premierDe, quiEst, tombe, bilan, enMots, refuseAujourdhui, actionEnMots, auFront, moyennes, prochainGrade } from './lecture.js?v=0.99.1';
import { jauge, corps, chevronsHtml, REPERES } from './barres.js?v=0.99.1';

// `$` : l'accès aux éléments ; `R` : les réglages ; `bataille()` : la bataille en cours
const CARAC_TITRES = {   // (elles montent à l'usage : tirer, frapper, marcher fatigué, tenir sous le feu ; elles baissent avec une blessure ou la terreur)
  adresse: 'la chance de toucher quand il tire', force: 'ses coups de baïonnette au corps à corps', endurance: 'se fatigue moins en marchant, encaisse mieux les coups de l\'ennemi au corps à corps', calme: 'la peur le gagne moins vite',
};
export function creerFiche({ $, R, bataille }) {
  let fiche = null;                 // { id, camp } : un soldat ; { reg } : un régiment
  let listeVue = '';                // ce que montre la liste du régiment (refaite seulement quand ça change)
  let statsVues = '';               // les jauges et le corps, refaits seulement quand ils changent
  // les jauges et le corps de la fiche : refaits quand une valeur change d'un point (pas à chaque image)
  function montrerStats(sig, jauges, corpsHtml) {
    $('fiche-stats').hidden = !jauges;
    if (sig === statsVues) return;
    statsVues = sig;
    $('fiche-barres').innerHTML = jauges; $('fiche-corps').innerHTML = corpsHtml;
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
    if (i < 0) { montrerStats('', '', ''); lignes.unshift(tombe(B, fiche.id)); }
    else {
      const exp = A.exp[i], nb = chevrons(exp), peur = A.peur[i], fj = A.fatJ[i], fb = A.fatB[i];
      const caracs = [A.adresse[i], A.force[i], A.endurance[i], A.calme[i]], bases = [A.adresse0[i], A.force0[i], A.endurance0[i], A.calme0[i]];
      const sig = `${fiche.id}:${A.blessure[i]}:${[peur, fj, fb, exp].map(v => Math.round(v * 100)).join(',')}:${caracs.map(Math.round).join(',')}`;
      montrerStats(sig, [
        jauge({ nom: 'Peur', val: peur, reperes: REPERES.peur, mot: peurEnMots(peur) }),
        jauge({ nom: 'Jambes', val: fj, reperes: REPERES.fatigue, mot: fatigueEnMots(fj), titre: 'Fatigue des jambes (la marche, plus dans la boue)' }),
        jauge({ nom: 'Bras', val: fb, reperes: REPERES.fatigue, mot: fatigueEnMots(fb), titre: 'Fatigue des bras (le tir)' }),
        jauge({ nom: 'Expérience', val: exp, reperes: REPERES.exp, html: nb ? chevronsHtml(nb) : 'novice', titre: `Expérience : ${experienceEnMots(exp) || 'rien vu du feu'}` }),
        // ses caractéristiques (v0.69.0) : elles jouent dans le tir (adresse), le corps à corps (force, endurance de l'autre), la fatigue (endurance) et la peur (calme) ; elles évoluent : une flèche dit
        // le chemin fait depuis le début de la bataille (3 points ou plus)
        ...CARACTERISTIQUES.map(([cle, nom], q) => {
          const v = Math.round(caracs[q]), d = v - bases[q], fleche = d >= 3 ? ' ↑' : d <= -3 ? ' ↓' : '';
          return jauge({ nom, val: v / 100, mot: caracEnMots(v) + fleche, titre: `${nom} : ${v} sur 100${d ? ` (${d > 0 ? '+' : ''}${d} depuis le début de la bataille)` : ''} — ${CARAC_TITRES[cle]}` });
        }),
      ].join(''), corps(A.blessure[i], fiche.id));
      const depuis = auFront(B, fiche.id), nuits = Math.max(0, B.etat.jour - depuis), vict = A.victimes[i], suivant = prochainGrade(A.camp[i], qui.rang);
      lignes.unshift(majuscule(actionEnMots(B, i)), `Au front depuis le jour ${depuis}${nuits ? ` · ${nuits} nuit${nuits > 1 ? 's' : ''}` : ''}`);
      if (vict) lignes.push(`A abattu ${vict} homme${vict > 1 ? 's' : ''}`);
      if (suivant) lignes.push(`Prochain grade : ${suivant}, si un supérieur tombe`);
    }
    $('fiche-etat').replaceChildren(...lignes.filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  }
  function majFicheRegiment(B) {
    const reg = B.etat.regiments[fiche.reg], A = B.armee, b = bilan(B, reg);
    $('fiche-nom').textContent = nomDe(reg);
    $('fiche-qui').textContent = enMots(b);
    $('fiche-regiment').hidden = true;
    const m = moyennes(B, reg.id), nb = chevrons(m.exp), vivres = reg.vivres ?? R.nuit.vivres;
    montrerStats(`r${reg.id}:${[m.peur, m.fatJ, m.fatB, m.exp, reg.moral].map(v => Math.round(v * 100)).join(',')}:${vivres}:${reg.deroute ? 1 : 0}`, [
      jauge({ nom: 'Peur', val: m.peur, reperes: REPERES.peur, mot: peurEnMots(m.peur), titre: 'Peur moyenne de ses hommes' }),
      jauge({ nom: 'Jambes', val: m.fatJ, reperes: REPERES.fatigue, mot: fatigueEnMots(m.fatJ), titre: 'Fatigue moyenne des jambes' }),
      jauge({ nom: 'Bras', val: m.fatB, reperes: REPERES.fatigue, mot: fatigueEnMots(m.fatB), titre: 'Fatigue moyenne des bras' }),
      jauge({ nom: 'Expérience', val: m.exp, reperes: REPERES.exp, html: nb ? chevronsHtml(nb) : 'novice', titre: 'Expérience moyenne de ses hommes' }),
      jauge({ nom: 'Moral', val: reg.moral, reperes: [R.moral.deroute, R.moral.ebranle, 0.75], mot: moralEnMots(reg, R), titre: 'Moral du régiment : sous le premier repère, la déroute' }),
      jauge({ nom: 'Vivres', val: Math.min(1, vivres / R.nuit.vivres), mot: `${vivres} nuit${vivres > 1 ? 's' : ''}`, titre: 'Nuits de vivres restantes' }),
    ].join(''), '');
    $('fiche-etat').replaceChildren(...[majuscule(moralEnMots(reg, R)), refuseAujourdhui(B, reg)].filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
    const sig = `${reg.id}:${b.vivants}:${b.blesses}:${b.morts}:${b.evacues}:${Object.keys(B.etat.grades).length}`;
    if (sig === listeVue) return;
    listeVue = sig;
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
