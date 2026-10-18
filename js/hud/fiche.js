// Les fiches : un homme (son nom, son âge, son grade, ce qu'il endure) ou un régiment (ses hommes, ses
// blessés, ses morts, et leurs fiches). De près, on regarde des hommes ; de loin, des régiments (Jérôme, v0.3.2).
import { NOUS, moralEnMots, rangDe } from '../bataille.js?v=0.33.0';
import { etatEnMots, experienceEnMots } from '../identite.js?v=0.33.0';
import { majuscule, nomDe, indiceDe, premierDe, quiEst, tombe, bilan, enMots, refuseAujourdhui } from './lecture.js?v=0.33.0';

// `$` : l'accès aux éléments ; `R` : les réglages ; `bataille()` : la bataille en cours
export function creerFiche({ $, R, bataille }) {
  let fiche = null;                 // { id, camp } : un soldat ; { reg } : un régiment
  let listeVue = '';                // ce que montre la liste du régiment (refaite seulement quand ça change)

  function montrerFiche(i) {
    const B = bataille();
    fiche = { id: B.armee.id[i], camp: B.armee.camp[i] };
    ouvrirFiche();
  }
  function montrerSoldat(id) { fiche = { id, camp: quiEst(bataille(), id).reg?.camp ?? NOUS }; ouvrirFiche(); }
  function montrerRegiment(regId) { fiche = { reg: regId }; ouvrirFiche(); }
  function ouvrirFiche() { $('fiche').hidden = false; listeVue = ''; majFiche(); }
  function fermerFiche() { fiche = null; $('fiche').hidden = true; $('repere-soldat').hidden = true; }

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
    const mots = [
      ...(i < 0 ? [tombe(B, fiche.id)] : [...etatEnMots(A.fatJ[i], A.fatB[i], A.peur[i], A.blessure[i]), experienceEnMots(A.exp[i])]),
      promu ? `promu ${qui.grade} le jour ${promu[1]}` : '',
    ].filter(Boolean);
    $('fiche-etat').replaceChildren(...mots.map(t => Object.assign(document.createElement('li'), { textContent: t })));
  }
  function majFicheRegiment(B) {
    const reg = B.etat.regiments[fiche.reg], A = B.armee, b = bilan(B, reg);
    $('fiche-nom').textContent = nomDe(reg);
    $('fiche-qui').textContent = enMots(b);
    $('fiche-regiment').hidden = true;
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
