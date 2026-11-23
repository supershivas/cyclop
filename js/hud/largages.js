// Les largages à l'écran (v0.162.0) : le bandeau d'un objet pris (le nom, l'icône de sa catégorie, la couleur de sa rareté, ce qu'il fait en quelques mots, qui
// l'a pris ; « Nouvelle découverte » la première fois), la musette (trois emplacements au-dessus du râtelier, touches 7, 8, 9 : un clic arme la visée), et
// les découvertes (la vitrine de l'accueil : `cyclopeen:decouvertes`, hud/vitrine.js). Le joueur apprend ce que fait un objet : (1) le fumigène et l'avion
// (le carnet), (2) la flèche de sa couleur et le survol (la bulle), (3) le bandeau à la prise, (4) l'anneau sous l'homme boosté, (5) le carnet du soir.
import { OBJET, RARETES, CATEGORIES, LARGAGE } from '../data/largages.js?v=0.162.0';

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function creerLargagesHud({ $, bataille, moi, viser, decouvertes, son }) {
  const bandeau = $('objet-bandeau'), musette = $('musette');
  let file = [], timer = 0;
  // les emplacements de la musette : le même gabarit que les boutons du râtelier (design system), un liseré de la rareté
  const cases = Array.from({ length: LARGAGE.musette }, (_, k) => {
    const b = el('button', 'batterie musette-case');
    b.type = 'button'; b.dataset.k = String(k);
    b.innerHTML = `<i class="objet-icone" aria-hidden="true"></i><b></b><span></span><i class="touche" aria-hidden="true">${7 + k}</i><u><s></s></u>`;
    b.onclick = () => viser(k);
    return b;
  });
  musette.append(...cases);

  function montrer(f) {
    const O = OBJET[f.o], R = RARETES[O.rarete];
    bandeau.style.setProperty('--rarete', R.couleur);
    bandeau.classList.toggle('mythique', !!R.brillance);
    bandeau.classList.toggle('eux', f.camp !== moi());
    const ic = el('i', 'objet-icone', CATEGORIES[O.cat].icone); ic.setAttribute('aria-hidden', 'true');
    const haut = el('small', null, `${R.nom} · ${f.camp === moi() ? (f.musette ? (f.livre ? 'dans la musette' : 'à ramener dans la tranchée') : 'pris par un des nôtres') : 'pris par ceux d\'en face'}${f.nouveau ? ' · nouvelle découverte' : ''}`);
    bandeau.replaceChildren(ic, el('div', 'objet-texte'));
    bandeau.lastChild.append(haut, el('b', null, O.nom), el('span', null, O.court));
    bandeau.hidden = false;
    bandeau.classList.remove('vient'); void bandeau.offsetWidth; bandeau.classList.add('vient');
    clearTimeout(timer);
    timer = setTimeout(suivant, f.camp === moi() ? 5200 : 4200);
  }
  function suivant() { const f = file.shift(); if (f) montrer(f); else bandeau.hidden = true; }

  // les événements du pas (main.js les passe tous) : le bandeau, la découverte, le carnet ; rend les lignes du carnet [texte, genre]
  function evenements(ev) {
    const lignes = [];
    for (const e of ev) {
      if (e.type === 'largage') { lignes.push(['Un avion passe au-dessus du no man\'s land : une caisse tombe en parachute.', null]); son?.interface_?.('largage'); }
      else if (e.type === 'caisse-sol') { decouvertes?.vu(e.o); }
      else if (e.type === 'objet') {
        const O = OBJET[e.o], nouveau = e.camp === moi() && !(e.musette) && decouvertes?.prendre(e.o);
        if (e.camp !== moi()) decouvertes?.vu(e.o);
        file.push({ o: e.o, camp: e.camp, musette: e.musette, nouveau });
        lignes.push([e.camp === moi() ? `${O.nom} (${RARETES[O.rarete].nom.toLowerCase()}) : ${e.musette ? 'à ramener dans notre tranchée' : O.court}.` : `Ceux d'en face prennent ${O.nom} (${RARETES[O.rarete].nom.toLowerCase()}) : ${O.court}.`, e.camp === moi() ? 'gain' : 'perte']);
      }
      else if (e.type === 'objet-livre') {
        const O = OBJET[e.o], nouveau = e.camp === moi() && decouvertes?.prendre(e.o);
        if (e.camp === moi()) { file.push({ o: e.o, camp: e.camp, musette: true, livre: true, nouveau }); lignes.push([`${O.nom} est dans la musette (touches 7, 8, 9).`, 'gain']); }
        else lignes.push([`Ceux d'en face ont ramené ${O.nom} dans leur tranchée.`, 'perte']);
      }
      else if (e.type === 'objet-perdu') lignes.push([`${OBJET[e.o].nom} tombe avec son porteur : il reste à prendre.`, null]);
      else if (e.type === 'objet-utilise' && e.camp !== moi()) lignes.push([`Ceux d'en face tirent ${OBJET[e.o].nom}.`, 'perte']);
      else if (e.type === 'objet-repli' && e.camp === moi()) lignes.push([e.refus, null]);
      else if (e.type === 'drapeau-arrache') lignes.push([e.camp === moi() ? 'Ceux d\'en face arrachent notre drapeau.' : 'Nous arrachons leur drapeau.', e.camp === moi() ? 'perte' : 'gain']);
    }
    if (bandeau.hidden && file.length) suivant();
    return lignes;
  }

  // la musette de mon camp, à chaque image du HUD ; `vise` : l'emplacement armé (ou null)
  function maj(vise) {
    const B = bataille(), LG = B?.etat.largages;
    musette.hidden = !LG || B.etat.phase !== 'jour';
    if (musette.hidden) return;
    const m = LG.musette[moi()];
    cases.forEach((b, k) => {
      const o = m[k], O = o ? OBJET[o] : null;
      b.classList.toggle('vide', !O); b.classList.toggle('muet', !O); b.classList.toggle('vise', vise === k);
      b.setAttribute('aria-disabled', O ? 'false' : 'true');
      b.style.setProperty('--rarete', O ? RARETES[O.rarete].couleur : 'transparent');
      b.querySelector('.objet-icone').textContent = O ? CATEGORIES[O.cat].icone : '';
      b.querySelector('b').textContent = O ? O.nom : 'Vide';
      b.querySelector('span').textContent = O ? (vise === k ? 'VISER' : 'PRÊT') : '';
      b.title = O ? `${O.nom} (${RARETES[O.rarete].nom}) : ${O.effet} Touche ${7 + k}, puis un clic sur le champ.` : `Musette, emplacement ${7 + k} : vide. Un objet de bombardement ramené dans une tranchée s'y range.`;
      b.setAttribute('aria-label', O ? `${O.nom}, touche ${7 + k}` : `Musette vide, touche ${7 + k}`);
    });
  }
  return { evenements, maj, cacher() { file = []; bandeau.hidden = true; clearTimeout(timer); } };
}

/* Les découvertes (la vitrine de l'accueil) : { o: 'vu' | 'pris', n: fois pris } dans `cyclopeen:decouvertes`, la progression permanente (section 11) ; rien en mode debug */
export function creerDecouvertes(store, ecrire = true) {
  let d = store.load('decouvertes') ?? { v: 1, objets: {} };
  const garder = () => { if (ecrire) try { store.save('decouvertes', d); } catch (e) { console.error(e); } };
  return {
    etat: () => d,
    vu(o) { if (!d.objets[o]) { d.objets[o] = { e: 'vu', n: 0 }; garder(); } },
    prendre(o) { const x = d.objets[o], nouveau = !x || x.e !== 'pris'; d.objets[o] = { e: 'pris', n: (x?.n ?? 0) + 1 }; garder(); return nouveau; },
    remplacer(nv) { d = nv?.objets ? nv : { v: 1, objets: {} }; garder(); },
  };
}
