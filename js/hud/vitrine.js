// La vitrine des découvertes (Jérôme, 23 nov., v0.162.0 : « ajouter sur l'accueil l'état des découvertes des objets, une page spéciale ») : depuis l'écran titre,
// `#dialogue-vitrine`. En haut, le total et une barre par rareté ; puis les objets par catégorie, du plus commun au plus rare : inconnu (une silhouette
// et un « ? »), vu (tombé, ou pris par ceux d'en face : son nom et son effet), découvert (un des nôtres l'a pris : combien de fois). Un clic sur une case
// vue ou découverte montre l'objet en 3D qui tourne sous sa flèche (les modèles du jeu, rendu/largages-modeles.js). Les découvertes : hud/largages.js.
import { PALETTE } from '../palette.js?v=0.162.0';
import { OBJETS, RARETES, ORDRE_RARETES, CATEGORIES, ORDRE_CATEGORIES } from '../data/largages.js?v=0.162.0';
import { loadThree } from '../three-lib.js?v=0.162.0';
import { cacheModeles, construireObjet, fleche, anneau, briller, tourne, flotte } from '../rendu/largages-modeles.js?v=0.162.0';

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function creerVitrine({ $, decouvertes }) {
  const d = $('dialogue-vitrine'), haut = $('vitrine-haut'), grille = $('vitrine-grille'), fiche = $('vitrine-fiche'), toile = $('vitrine-3d');
  let scene3d = null, choisi = null;

  function remplir() {
    const D = decouvertes.etat().objets, etatDe = o => D[o.id]?.e ?? 'inconnu';
    const pris = OBJETS.filter(o => etatDe(o) === 'pris').length;
    haut.replaceChildren(el('p', 'vitrine-total', `${pris} / ${OBJETS.length} découverts`), ...ORDRE_RARETES.map(rk => {
      const R = RARETES[rk], liste = OBJETS.filter(o => o.rarete === rk), n = liste.filter(o => etatDe(o) === 'pris').length;
      const ligne = el('div', 'vitrine-rarete'); ligne.style.setProperty('--rarete', R.couleur);
      const barre = el('i', 'vitrine-barre'); barre.style.setProperty('--plein', `${Math.round(100 * n / liste.length)}%`);
      ligne.append(el('b', null, R.nom), barre, el('span', null, `${n} / ${liste.length}`));
      ligne.dataset.info = `${R.nom} | **${n}** sur ${liste.length}\nChance par caisse | ${R.poids} sur 100`;
      return ligne;
    }));
    grille.replaceChildren(...ORDRE_CATEGORIES.map(ck => {
      const C = CATEGORIES[ck], rang = el('section', 'vitrine-cat');
      rang.append(el('h3', null, C.nom));
      const cases = el('div', 'vitrine-cases');
      for (const O of OBJETS.filter(o => o.cat === ck).sort((a, b) => ORDRE_RARETES.indexOf(a.rarete) - ORDRE_RARETES.indexOf(b.rarete))) {
        const e = etatDe(O), R = RARETES[O.rarete], b = el('button', `vitrine-case ${e}`);
        b.type = 'button'; b.style.setProperty('--rarete', R.couleur);
        const ic = el('i', 'objet-icone', e === 'inconnu' ? '?' : C.icone); ic.setAttribute('aria-hidden', 'true');
        b.append(ic, el('b', null, e === 'inconnu' ? '? ? ?' : O.nom), el('span', null, e === 'pris' ? `× ${D[O.id].n}` : e === 'vu' ? 'vu' : R.nom));
        if (e === 'inconnu') { b.setAttribute('aria-disabled', 'true'); b.dataset.info = `${R.nom} | pas encore vu`; }
        else { b.dataset.info = `${O.nom}\n${R.nom} · ${C.nom}\n${O.court}`; b.onclick = () => montrer(O); }
        b.setAttribute('aria-pressed', String(choisi === O.id));
        cases.append(b);
      }
      rang.append(cases);
      return rang;
    }));
    if (!choisi) fiche.replaceChildren(el('p', 'vitrine-vide', pris ? 'Un clic sur un objet : il tourne ici.' : 'Aucun objet encore : les avions en larguent au-dessus du no man\'s land.'));
  }

  function montrer(O) {
    choisi = O.id;
    for (const b of grille.querySelectorAll('.vitrine-case')) b.setAttribute('aria-pressed', String(b.querySelector('b').textContent === O.nom));
    const R = RARETES[O.rarete], e = decouvertes.etat().objets[O.id];
    const pastille = el('i', 'objet-icone', CATEGORIES[O.cat].icone); pastille.style.setProperty('--rarete', R.couleur);
    fiche.replaceChildren(el('h3', null, O.nom), el('p', 'vitrine-sous', `${R.nom} · ${CATEGORIES[O.cat].nom}${e?.e === 'pris' ? ` · pris ${e.n} fois` : ' · vu, jamais pris'}`), el('p', null, O.effet));
    scene3d?.poser(O);
  }

  // l'objet choisi en 3D : un rendu à part, en pixels doublés, créé à la première ouverture
  async function monter3d() {
    if (scene3d) return;
    const THREE = await loadThree(), cache = cacheModeles(THREE);
    const renderer = new THREE.WebGLRenderer({ canvas: toile, antialias: false, alpha: false }); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(PALETTE.s);
    scene.add(new THREE.HemisphereLight(new THREE.Color(PALETTE.o), new THREE.Color(PALETTE.b), 1.1));
    const soleil = new THREE.DirectionalLight(new THREE.Color(PALETTE.o), 1.6); soleil.position.set(-4, 7, 5); scene.add(soleil);
    const sol = new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshLambertMaterial({ color: new THREE.Color(PALETTE.b) })); sol.rotation.x = -Math.PI / 2; scene.add(sol);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    let courant = null, raf = 0, t0 = performance.now();
    scene3d = {
      poser(O) {
        if (courant) { scene.remove(courant.support); courant.a.geometry.dispose(); courant.a.material.dispose(); }
        const { groupe } = construireObjet(THREE, O, 1, cache), col = RARETES[O.rarete].couleur;
        const f = fleche(THREE, cache, col, 0.9, !!RARETES[O.rarete].brillance), a = anneau(THREE, col, 0.9), support = new THREE.Group();
        support.add(groupe, f, a); scene.add(support);
        courant = { groupe, f, a, support, brille: briller(THREE, cache, groupe, f, a, 0.85) };
        if (!raf) boucle();
      },
      arreter() { cancelAnimationFrame(raf); raf = 0; },
    };
    function boucle() {
      raf = requestAnimationFrame(boucle);
      const w = Math.max(80, Math.round(toile.clientWidth / 2)), h = Math.max(80, Math.round(toile.clientHeight / 2));
      if (toile.width !== w || toile.height !== h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      const t = (performance.now() - t0) / 1000;
      if (courant) {
        const y = 0.35 + flotte(t);
        courant.groupe.rotation.y = tourne(t); courant.groupe.position.y = y;
        courant.f.position.y = y + courant.groupe.userData.hauteur + 0.25; courant.f.rotation.y = -tourne(t) * 0.5;
        courant.brille?.(t);
      }
      camera.position.set(0, 2.2, 4.6); camera.lookAt(0, 0.75, 0);
      renderer.render(scene, camera);
    }
  }

  d.addEventListener('close', () => scene3d?.arreter());
  return {
    async ouvrir() {
      choisi = null; remplir(); d.showModal();
      try { await monter3d(); } catch (e) { console.warn('La vitrine sans 3D :', e.message); }
      const premier = OBJETS.find(o => decouvertes.etat().objets[o.id]?.e === 'pris') ?? OBJETS.find(o => decouvertes.etat().objets[o.id]);
      if (premier) montrer(premier);
    },
  };
}
