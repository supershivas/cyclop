// Le sujet « La patrouille de nuit » du labo (Jérôme, 16 nov. : « une mission interlude où l'on déplace un petit groupe de soldats (30-50) d'un point A à un point B de nuit » ;
// accord pour une tuile sur le papier de la nuit, mais au labo d'abord, pour voir si c'est amusant). Un prototype, sans conséquence : la bataille du moteur, de nuit, de près ;
// quarante hommes de notre première ligne partent vers un point à portée de voix de leur fil ; en face, des fusées s'ouvrent au-dessus d'eux ; debout dans leur lumière, on est vu,
// et le poste de mitrailleuse le plus proche tire ; couchés dans un trou d'obus, on ne l'est pas. Un clic : où aller ; Espace (ou le bouton) : se coucher, se relever.
// La règle est pure (js/patrouille.js, chiffres : data/patrouille.js) ; ici, l'écran : le moteur (`pilote` : la règle écrit les places des hommes à chaque image), un calque 2D
// (le but, la destination, l'alerte, les rafales, le compte), la caméra qui suit le groupe. Palette du jeu seulement.
import { PALETTE as P } from './palette.js?v=0.158.0';
import { ARTICULE } from './data/aspect-soldat.js?v=0.158.0';
import { mourir, rangDe } from './bataille.js?v=0.158.0';
import { aspect } from './aspect-soldat.js?v=0.158.0';
import { caracteristiques } from './identite.js?v=0.158.0';
import { creerPatrouille, pasPatrouille, allerA, coucher, vivants } from './patrouille.js?v=0.158.0';
import { PATROUILLE } from './data/patrouille.js?v=0.158.0';

const el = (tag, css = '', ...kids) => { const e = document.createElement(tag); if (css) e.style.cssText = css; e.append(...kids.flat().filter(k => k != null)); return e; };
const MONO = 'ui-monospace,"DejaVu Sans Mono",Menlo,Consolas,monospace';
const reduit = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Le prototype : `pilote(ctx, dt)` pour le moteur (rend les événements de la bataille à dessiner), `calque(boite, ctx)` pour l'écran ; `graine` : les fusées */
export function patrouilleLabo({ graine = 7 } = {}) {
  let Pt = null, couches = null, monde = null, rafales = [], bandeau = null, suivre = true;
  const etat = { info: null, boutonCouche: null };

  // la mise en place, à la première image : la patrouille, son but, les postes d'en face, le sol
  function preparer(ctx) {
    const { B, rendu } = ctx, A = B.armee, m = B.etat.marges, cx = m.x + 200;
    let avant = Infinity, leur = -Infinity;      // notre ligne la plus avancée (au nord : y plus petit), la leur la plus proche (y plus grand), au milieu du secteur
    for (let i = 0; i < A.n; i++) if (!A.mort[i] && Math.abs(A.x[i] - cx) < 60) { if (A.camp[i] === 0) avant = Math.min(avant, A.y[i]); else leur = Math.max(leur, A.y[i]); }
    const nos = [];
    for (let i = 0; i < A.n; i++) if (!A.mort[i] && A.camp[i] === 0) nos.push([(A.x[i] - cx) ** 2 + (A.y[i] - avant) ** 2, i]);
    nos.sort((a, b) => a[0] - b[0]);
    const hommes = nos.slice(0, PATROUILLE.hommes).map(n => n[1]);
    Pt = creerPatrouille({ hommes, places: hommes.map(i => ({ x: A.x[i], y: A.y[i] })), but: { x: cx, y: leur + PATROUILLE.but }, graine });
    Pt.dest = { ...Pt.centre };      // (on attend le premier ordre)
    const T = B.terrain;
    monde = {
      creux: (x, y, m) => { const i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < T.W && j < T.H && T.diff[j * T.W + i] * 0.25 < m; },
      postes: B.etat.nids.filter(n => n.camp === 1 && n.etat !== 'detruit').map(n => ({ x: n.x, y: n.y })),
    };
    couches = new Uint8Array(A.n); rendu.couches = couches;
    rendu.aspectDe = (Bt, id, camp) => aspect(id, camp, Bt.etat.graine, rangDe(Bt, id, Bt.armee.reg[Bt.armee.id.indexOf(id)]) ?? 6, 25, caracteristiques(id, camp));      // (sans lui, aucun homme n'est articulé : `arti` de rendu/soldats.js)
    rendu.articule = ARTICULE;      // de près, les hommes du jeu (squelette, visage) : sans eux, un homme couché resterait une boîte debout
    rendu.vue.cx = Pt.centre.x; rendu.vue.cz = Pt.centre.y - 6;
    window.__patrouille = { patrouille: () => Pt, ctx, couches };      // (pour les essais du labo : la patrouille et le moteur, depuis la console)
  }

  function pilote(ctx, dt) {
    if (!ctx.B || !ctx.rendu) return [];
    if (!Pt) preparer(ctx);
    const { B, rendu } = ctx, A = B.armee;
    for (const e of pasPatrouille(Pt, dt, monde)) {
      if (e.t === 'fusee') rendu.fusee(e.x, e.y);
      else if (e.t === 'tombe') mourir(B, e.i, 'tir');
      else if (e.t === 'rafale') rafales.push({ poste: monde.postes[e.poste], x: e.x, y: e.y, t: 0.5 });
    }
    for (const h of Pt.hommes) { if (!h.vivant) { couches[h.i] = 0; continue; } A.x[h.i] = h.x; A.y[h.i] = h.y; A.vx[h.i] = h.vx; A.vy[h.i] = h.vy; couches[h.i] = Pt.couche ? 1 : 0; }
    if (suivre) { const k = reduit() ? 1 : Math.min(1, dt * 2); rendu.vue.cx += (Pt.centre.x - rendu.vue.cx) * k; rendu.vue.cz += (Pt.centre.y - 6 - rendu.vue.cz) * k; }
    rafales = rafales.filter(r => (r.t -= dt) > 0);
    const evs = B.evenements.splice(0);      // (les morts : le carnet du jeu n'est pas là ; le dessin des corps les lit dans l'état)
    return evs;
  }

  function calque(boite, ctx) {
    const cv = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none');
    bandeau = el('div', `position:absolute;left:50%;top:10px;transform:translateX(-50%);padding:4px 10px;background:${P.o};color:${P.t};font:12px ${MONO};box-shadow:3px 3px 0 ${P.t};pointer-events:none;white-space:nowrap`, '…');
    boite.append(cv, bandeau);
    boite.tabIndex = 0; boite.style.cursor = 'crosshair';
    const clic = ev => {
      if (!Pt || !ctx.rendu) return;
      const r = boite.getBoundingClientRect(), [x, y] = ctx.rendu.versTerrain(ev.clientX - r.left, ev.clientY - r.top);
      if (x > -1e4) { const res = allerA(Pt, x, y); if (res.refus) etat.info = res.refus; }
      boite.focus();
    };
    const touche = ev => { if (ev.code === 'Space' && Pt) { ev.preventDefault(); coucher(Pt); } };
    boite.addEventListener('click', clic); boite.addEventListener('keydown', touche);
    let raf = 0, partie = true;
    function boucle(now) {
      if (ctx.rendu && Pt) {
        const R = ctx.rendu, r = boite.getBoundingClientRect();
        if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) { cv.width = Math.round(r.width); cv.height = Math.round(r.height); }
        const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
        const E = (x, y) => R.versEcran(x, y, R.hauteurSol(x, y));
        // le but : un cercle pointillé d'os ; la destination : une croix ; le trajet : un trait
        const [bx, by] = E(Pt.but.x, Pt.but.y), [dx, dy] = E(Pt.dest.x, Pt.dest.y), [cx, cy] = E(Pt.centre.x, Pt.centre.y);
        g.lineWidth = 2; g.strokeStyle = P.o; g.setLineDash([5, 4]);
        if (bx > -1e4) { g.beginPath(); g.arc(bx, by, 26, 0, 7); g.stroke(); g.font = `bold 12px ${MONO}`; g.fillStyle = P.o; g.textAlign = 'center'; g.fillText('B', bx, by - 32); }
        if (dx > -1e4 && cx > -1e4 && !Pt.issue) { g.setLineDash([2, 4]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(dx, dy); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(dx - 6, dy); g.lineTo(dx + 6, dy); g.moveTo(dx, dy - 6); g.lineTo(dx, dy + 6); g.stroke(); }
        g.setLineDash([]);
        // les rafales : un trait du poste au groupe
        for (const f of rafales) { const [px, py] = E(f.poste.x, f.poste.y), [qx, qy] = E(f.x, f.y); if (px > -1e4 && qx > -1e4) { g.strokeStyle = P.o; g.globalAlpha = Math.min(1, f.t * 2); g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy); g.stroke(); g.globalAlpha = 1; } }
        // l'alerte d'en face : une barre qui se remplit (hachurée quand le poste tire), en haut à gauche ; le compte des hommes
        const ax = 14, ay = cv.height - 44, aw = 180;
        g.fillStyle = P.t; g.fillRect(ax - 2, ay - 2, aw + 4, 14); g.fillStyle = P.s; g.fillRect(ax, ay, aw, 10);
        g.fillStyle = Pt.feu ? P.o : P.g; g.fillRect(ax, ay, aw * (Pt.feu ? 1 : Pt.alerte), 10);
        g.font = `12px ${MONO}`; g.textAlign = 'left'; g.fillStyle = P.o;
        g.fillText(Pt.feu ? 'Vus : le poste tire' : Pt.alerte > 0 ? 'En face, on regarde…' : 'Pas vus', ax, ay - 8);
        g.fillText(`${vivants(Pt)} hommes sur ${Pt.hommes.length} · ${Pt.couche ? 'couchés' : 'debout'} · ${Math.floor(Pt.t / 60)} min ${String(Math.floor(Pt.t % 60)).padStart(2, '0')}`, ax, ay + 28);
      }
      // le bandeau : ce qu'il faut faire, puis l'issue
      if (Pt) {
        const n = vivants(Pt);
        bandeau.textContent = Pt.issue === 'arrivee' ? `Arrivés au point B : ${n} sur ${Pt.hommes.length}, en ${Math.floor(Pt.t / 60)} min ${String(Math.floor(Pt.t % 60)).padStart(2, '0')}. « Recommencer » pour une autre nuit.`
          : Pt.issue === 'perdue' ? 'La patrouille est perdue. « Recommencer » pour une autre nuit.'
          : etat.info ?? 'Un clic : où aller (le point B est cerclé). Espace : se coucher, se relever. Les fusées éclairent : debout dans leur lumière, on est vu.';
        if (etat.boutonCouche) etat.boutonCouche.textContent = Pt.couche ? 'Se relever (Espace)' : 'Se coucher (Espace)';
      }
      if (partie) raf = requestAnimationFrame(boucle);
    }
    raf = requestAnimationFrame(boucle);
    return () => { partie = false; cancelAnimationFrame(raf); boite.removeEventListener('click', clic); boite.removeEventListener('keydown', touche); };
  }

  /* Les boutons sous l'écran : se coucher, la caméra qui suit, recommencer (une autre graine : d'autres fusées) */
  function boutons(stage, recommencer) {
    const b = (t, f) => { const x = el('button', ''); x.className = 'essai'; x.textContent = t; x.onclick = f; return x; };
    etat.boutonCouche = b('Se coucher (Espace)', () => { if (Pt) coucher(Pt); });
    const suivi = b('Caméra : suit le groupe', () => { suivre = !suivre; suivi.textContent = suivre ? 'Caméra : suit le groupe' : 'Caméra : libre'; });
    stage.append(el('p', '', etat.boutonCouche, suivi, b('Recommencer', recommencer)));
  }
  return { pilote, calque, boutons };
}
