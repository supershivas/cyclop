// Les largages à l'écran (v0.162.0) : le bandeau d'un objet pris (le nom, l'icône de sa catégorie, la couleur de sa rareté, ce qu'il fait en quelques mots, qui
// l'a pris ; « Nouvelle découverte » la première fois), la musette (trois emplacements au-dessus du râtelier, touches 7, 8, 9 : un clic arme la visée), et
// les découvertes (la vitrine de l'accueil : `cyclopeen:decouvertes`, hud/vitrine.js). Le joueur apprend ce que fait un objet : (1) le fumigène et l'avion
// (le carnet), (2) la flèche de sa couleur et le survol (la bulle), (3) le bandeau à la prise, (4) l'anneau sous l'homme boosté, (5) le carnet du soir.
import { OBJET, RARETES, CATEGORIES, LARGAGE } from '../data/largages.js?v=0.170.3';
import { CAPRICE, CAPRICES_JOUR } from '../data/caprices.js?v=0.170.3';
import { zone, zoneDe, lettreZone } from '../bataille.js?v=0.170.3';
import { prochaineCaisse, milieu } from '../largages.js?v=0.170.3';
import { capricePrevu, lieuCaprice } from '../caprices.js?v=0.170.3';

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function creerLargagesHud({ $, bataille, moi, viser, decouvertes, son, aller }) {
  const bandeau = $('objet-bandeau'), musette = $('musette'), puce = $('caprice'), annonce = $('annonce');
  let file = [], timer = 0, lieuBandeau = null, cleAnnonce = '', lieuAnnonce = null;
  // un clic sur l'annonce, le bandeau ou la pastille du caprice mène la caméra au lieu de l'événement (Jérôme, 23 nov., v0.164.0)
  const aLieu = l => () => { if (l()) aller?.(l().x, l().y); };
  annonce.onclick = aLieu(() => lieuAnnonce);
  bandeau.onclick = aLieu(() => typeof lieuBandeau === 'function' ? lieuBandeau() : lieuBandeau);
  puce.onclick = aLieu(() => { const B = bataille(); return B && lieuCaprice(B, zone(B)); });
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
    lieuBandeau = f.caprice ? (() => { const B = bataille(); return B && lieuCaprice(B, zone(B)); }) : f.x != null ? { x: f.x, y: f.y } : null;
    bandeau.dataset.info = lieuBandeau ? 'Un clic : la vue y va' : '';
    if (f.caprice) return montrerCaprice(f);
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
  // le bandeau d'un caprice du front (v0.163.0) : le même papier, « Caprice du front », le nom, ce qui arrive ; le camp touché quand il y en a un
  function montrerCaprice(f) {
    const K = CAPRICE[f.caprice], R = RARETES[K.rarete];
    bandeau.style.setProperty('--rarete', R.couleur);
    bandeau.classList.toggle('mythique', !!R.brillance); bandeau.classList.remove('eux');
    const ic = el('i', 'objet-icone', K.icone); ic.setAttribute('aria-hidden', 'true');
    const qui = f.camp < 0 ? 'tout le front' : f.camp === moi() ? 'chez nous' : 'chez ceux d\'en face';
    bandeau.replaceChildren(ic, el('div', 'objet-texte'));
    bandeau.lastChild.append(el('small', null, `Caprice du front · ${R.nom} · ${qui}${f.nouveau ? ' · nouvelle découverte' : ''}`), el('b', null, K.nom), el('span', null, K.court));
    bandeau.hidden = false;
    bandeau.classList.remove('vient'); void bandeau.offsetWidth; bandeau.classList.add('vient');
    clearTimeout(timer); timer = setTimeout(suivant, 6000);
  }
  function suivant() { const f = file.shift(); if (f) montrer(f); else bandeau.hidden = true; }

  // les événements du pas (main.js les passe tous) : le bandeau, la découverte, le carnet ; rend les lignes du carnet [texte, genre]
  function evenements(ev) {
    const lignes = [];
    for (const e of ev) {
      if (e.type === 'largage') { lignes.push(['Un avion passe au-dessus du no man\'s land : une caisse tombe en parachute.', null]); }
      else if (e.type === 'caisse-sol') { decouvertes?.vu(e.o); }
      else if (e.type === 'objet') {
        const O = OBJET[e.o], nouveau = e.camp === moi() && !(e.musette) && decouvertes?.prendre(e.o);
        if (e.camp !== moi()) decouvertes?.vu(e.o);
        file.push({ o: e.o, camp: e.camp, musette: e.musette, nouveau, x: e.x, y: e.y });
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
      else if (e.type === 'caprice') {
        const K = CAPRICE[e.id], nouveau = decouvertes?.caprice(e.id);
        file.unshift({ caprice: e.id, camp: e.camp, nouveau });      // (un caprice passe devant les objets)
        lignes.push([`Caprice du front : ${K.nom}. ${K.court}.`, e.camp === moi() ? 'perte' : e.camp < 0 ? null : 'gain']);
        clearTimeout(timer); bandeau.hidden = true;
      }
      else if (e.type === 'as-abattu') lignes.push([e.camp === moi() ? 'Notre as est abattu : une caisse légendaire tombe avec lui.' : 'Leur as est abattu : une caisse légendaire tombe avec lui.', e.camp === moi() ? 'perte' : 'gain']);
      else if (e.type === 'drapeau-arrache') lignes.push([e.camp === moi() ? 'Ceux d\'en face arrachent notre drapeau.' : 'Nous arrachons leur drapeau.', e.camp === moi() ? 'perte' : 'gain']);
    }
    if (bandeau.hidden && file.length) suivant();
    return lignes;
  }

  // la musette de mon camp, à chaque image du HUD ; `vise` : l'emplacement armé (ou null)
  // l'annonce (v0.164.0) : quelques secondes avant un caprice ou un largage, une carte bien visible en haut de l'écran : ce qui arrive, une phrase, où, dans combien
  // de secondes ; un appel sonore une fois ; un clic mène la vue au lieu. Elle ne met pas la partie en pause. Tout se lit de l'état (rien n'est tiré).
  function majAnnonce(B) {
    let a = null;
    if (B && B.etat.phase === 'jour') {
      const Z = zone(B), p = capricePrevu(B.etat), t = B.etat.temps;
      if (p && p.t - t <= CAPRICES_JOUR.annonce && p.t > t) {
        const K = CAPRICE[p.id], R = RARETES[K.rarete], l = lieuCaprice(B, Z, p);
        a = { cle: `c${p.t}`, genre: 'caprice', icone: K.icone, couleur: R.couleur, mythique: !!R.brillance, haut: `Caprice du front · ${R.nom}${K.camp ? (p.camp === moi() ? ' · chez nous' : ' · chez ceux d\'en face') : ''}`, titre: K.nom, texte: K.court, reste: p.t - t, tout: CAPRICES_JOUR.annonce, lieu: l };
      } else {
        const c = prochaineCaisse(B, Z);
        if (c && c.t - t <= LARGAGE.annonce) a = { cle: `l${c.t}`, genre: 'largage', icone: '☂', couleur: RARETES.commun.couleur, haut: 'Un largage', titre: 'Un avion arrive', texte: `Une caisse tombe sur le no man's land, secteur ${lettreZone(zoneDe(B, c.x))} : le premier arrivé la prend`, reste: c.t - t, tout: LARGAGE.annonce, lieu: { x: c.x, y: null } };
      }
    }
    annonce.hidden = !a;
    if (!a) { cleAnnonce = ''; return; }
    if (a.lieu && a.lieu.y == null) a.lieu = { x: a.lieu.x, y: milieu(B, a.lieu.x) };
    lieuAnnonce = a.lieu;
    if (a.cle !== cleAnnonce) {
      cleAnnonce = a.cle;
      annonce.style.setProperty('--rarete', a.couleur);
      annonce.classList.toggle('mythique', !!a.mythique); annonce.classList.toggle('caprice', a.genre === 'caprice');
      annonce.innerHTML = `<i class="objet-icone" aria-hidden="true"></i><div class="annonce-texte"><small></small><b></b><span></span></div><em></em><u><s></s></u>`;
      annonce.querySelector('i').textContent = a.icone; annonce.querySelector('small').textContent = a.haut; annonce.querySelector('b').textContent = a.titre; annonce.querySelector('span').textContent = a.texte;
      annonce.dataset.info = 'Un clic : la vue y va';
      annonce.classList.remove('vient'); void annonce.offsetWidth; annonce.classList.add('vient');
      son?.()?.annonce?.(a.genre);
    }
    annonce.querySelector('em').textContent = `dans ${Math.max(1, Math.ceil(a.reste))} s`;
    annonce.querySelector('s').style.width = `${Math.round(100 * Math.max(0, a.reste) / a.tout)}%`;
  }

  function maj(vise) {
    const B = bataille(), LG = B?.etat.largages;
    majAnnonce(B);
    // la pastille du caprice en cours : son icône, son nom, le temps qui reste en barre
    const a = B?.etat.caprices?.actif;
    puce.hidden = !a || B.etat.phase !== 'jour';
    if (a && !puce.hidden) {
      const K = CAPRICE[a.id], reste = Math.max(0, a.fin - B.etat.temps), tout = Math.max(1, a.fin - a.t0);
      puce.style.setProperty('--rarete', RARETES[K.rarete].couleur);
      if (puce.dataset.id !== a.id) { puce.dataset.id = a.id; puce.innerHTML = `<i class="objet-icone" aria-hidden="true"></i><b></b><u><s></s></u>`; puce.querySelector('i').textContent = K.icone; puce.querySelector('b').textContent = K.nom; puce.dataset.info = `${K.nom}\n${K.effet}`; }
      puce.querySelector('s').style.width = `${Math.round(100 * reste / tout)}%`;
    } else delete puce.dataset.id;
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
  return { evenements, maj, majAnnonce: () => majAnnonce(bataille()), cacher() { file = []; bandeau.hidden = true; annonce.hidden = true; cleAnnonce = ''; clearTimeout(timer); } };
}

/* Les découvertes (la vitrine de l'accueil) : { o: 'vu' | 'pris', n: fois pris } dans `cyclopeen:decouvertes`, la progression permanente (section 11) ; rien en mode debug */
export function creerDecouvertes(store, ecrire = true) {
  let d = store.load('decouvertes') ?? { v: 1, objets: {} };
  const garder = () => { if (ecrire) try { store.save('decouvertes', d); } catch (e) { console.error(e); } };
  return {
    etat: () => d,
    vu(o) { if (!d.objets[o]) { d.objets[o] = { e: 'vu', n: 0 }; garder(); } },
    prendre(o) { const x = d.objets[o], nouveau = !x || x.e !== 'pris'; d.objets[o] = { e: 'pris', n: (x?.n ?? 0) + 1 }; garder(); return nouveau; },
    caprice(id) { d.caprices ??= {}; const nouveau = !d.caprices[id]; d.caprices[id] = (d.caprices[id] ?? 0) + 1; garder(); return nouveau; },      // les caprices vécus (v0.163.0)
    remplacer(nv) { d = nv?.objets ? nv : { v: 1, objets: {} }; garder(); },
  };
}
