// Les médailles (Jérôme, v0.73.1 : « un tableau des médailles à la fin de chaque journée, de chaque partie : le régiment le plus meurtrier, qui a pris le plus de secteurs, le plus inutile… idem pour les soldats »).
// Lecture seule de l'état : `tues` et `pris` de chaque régiment (bataille.js : un coup de fusil ou de baïonnette qui tue, un tronçon pris), `debut` (leur valeur au matin) ;
// pour un homme, `victimes` (déjà sur la fiche) et `etat.victDebut` (id → victimes au matin). Les morts ne figurent pas parmi les hommes (leur fiche s'est effacée avec eux).
import { quiEst, nomDe, auFront } from './lecture.js?v=0.133.0';
import { iconeMedaille, boutonLoupe } from './icones-nuit.js?v=0.133.0';

const pl = (n, un, des) => `${n} ${n > 1 ? des : un}`;
const meilleur = (liste, f) => liste.reduce((m, x) => (f(x) > (m ? f(m) : -Infinity) ? x : m), null);

/* Les médailles de `camp` : portee 'jour' (depuis le matin) ou 'total'. Rend { regiments: [{ titre, nom, detail }], soldats: [...] } */
export function palmares(B, camp, portee = 'jour') {
  const { etat, armee: A } = B, jour = portee === 'jour';
  const regs = etat.regiments.filter(r => r.camp === camp).map(r => ({
    r, tues: (r.tues || 0) - (jour ? r.debut?.tues || 0 : 0), pris: (r.pris || 0) - (jour ? r.debut?.pris || 0 : 0), pertes: r.pertes - (jour ? r.debut?.pertes || 0 : 0),
  }));
  const regiments = [];
  const donne = (titre, x, detail, cle) => { if (x) regiments.push({ titre, cle, nom: nomDe(x.r), detail, reg: x.r.id }); return x; };
  const meur = meilleur(regs, x => x.tues), conq = meilleur(regs, x => x.pris), sacr = meilleur(regs, x => x.pertes);
  donne('Le plus meurtrier', meur?.tues > 0 && meur, `${pl(meur?.tues, 'homme abattu', 'hommes abattus')}`, 'meurtrier');
  donne('Le conquérant', conq?.pris > 0 && conq, `${pl(conq?.pris, 'tronçon pris', 'tronçons pris')}`, 'conquerant');
  donne('Le plus sacrifié', sacr?.pertes > 0 && sacr, `${pl(sacr?.pertes, 'mort', 'morts')}`, 'sacrifie');
  // le plus inutile : ni abattu ni pris grand-chose ; à égalité, celui qui a le plus d'hommes (il en fallait moins)
  if (regs.length >= 3) {
    const bas = Math.min(...regs.map(x => x.tues + 5 * x.pris)), inutile = regs.filter(x => x.tues + 5 * x.pris === bas && x !== meur && x !== conq).sort((a, b) => b.r.initial - a.r.initial)[0];
    donne('Le plus inutile', inutile, inutile && (inutile.tues + inutile.pris ? `${pl(inutile.tues, 'homme abattu', 'hommes abattus')}, ${pl(inutile.pris, 'tronçon', 'tronçons')}` : 'rien abattu, rien pris'), 'inutile');
  }
  // les hommes encore debout
  const debut = etat.victDebut || {}, vivants = [];
  for (let i = 0; i < A.n; i++) if (A.camp[i] === camp && !A.mort[i]) vivants.push({ i, id: A.id[i], v: A.victimes[i] - (jour ? debut[A.id[i]] || 0 : 0) });
  const soldats = [];
  const homme = (titre, x, detail, cle) => {
    if (!x) return;
    const { reg, qui } = quiEst(B, x.id);
    soldats.push({ titre, cle, nom: `${qui.prenom} ${qui.nom}`, detail: `${qui.grade}${reg?.nom ? `, ${reg.nom}` : ''} · ${detail}`, soldat: x.id });
  };
  const tireur = meilleur(vivants, x => x.v);
  homme('Le plus meurtrier', tireur?.v > 0 && tireur, pl(tireur?.v, 'homme abattu', 'hommes abattus'), 'meurtrier');
  const ancien = meilleur(vivants, x => A.exp[x.i]);
  if (ancien && A.exp[ancien.i] > 0.08 && ancien !== tireur) homme('Le plus aguerri', ancien, 'a tout vu du feu', 'aguerri');
  const bleus = vivants.filter(x => x.v === 0 && x !== ancien);
  const inutile = meilleur(bleus, x => (etat.jour - auFront(B, x.id)) * 1000 - A.adresse[x.i]);   // le plus ancien au front, le plus mauvais tireur
  if (inutile && vivants.length >= 3) homme('Le plus inutile', inutile, `rien abattu${etat.jour > 1 ? ` en ${pl(etat.jour, 'jour', 'jours')} de front` : ''}`, 'inutile');
  return { regiments, soldats };
}

/* Le tableau des médailles (Jérôme, v0.132.0 : « en tableau, avec des icônes » ; avant, des lignes de texte) : une rangée par médaille (pictogramme, titre, nom, ce qu'il a fait) ;
   `voir(lien)` (facultatif) ajoute la loupe qui montre le régiment ou l'homme sur le champ ({ reg } ou { soldat }) */
export function tableau(p, voir = null) {
  const bloc = (titre, liste) => {
    const sec = document.createElement('section');
    sec.append(Object.assign(document.createElement('h4'), { textContent: titre }));
    if (!liste.length) { sec.append(Object.assign(document.createElement('p'), { className: 'discret', textContent: 'Personne ne s\'est distingué.' })); return sec; }
    const t = document.createElement('table'); t.className = 'medailles';
    for (const m of liste) {
      const tr = t.insertRow();
      const ic = tr.insertCell(); ic.className = 'med-icone'; ic.innerHTML = iconeMedaille(m.cle);
      const ti = tr.insertCell(); ti.className = 'med-titre'; ti.textContent = m.titre;
      const no = tr.insertCell(); no.className = 'med-nom'; no.textContent = m.nom;
      const de = tr.insertCell(); de.className = 'med-detail'; de.textContent = m.detail;
      if (voir) {
        const lien = m.soldat !== undefined ? { soldat: m.soldat } : m.reg !== undefined ? { reg: m.reg } : null, c = tr.insertCell(); c.className = 'med-voir';
        if (lien) c.append(boutonLoupe(`Voir ${m.nom} sur le champ`, () => voir(lien)));
      }
    }
    sec.append(t);
    return sec;
  };
  return [bloc('Les régiments', p.regiments), bloc('Les hommes', p.soldats)];
}
