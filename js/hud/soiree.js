// La soirée (Jérôme, 18 nov. : le troisième jet du labo, « La soirée », variante A, passé en jeu en v0.150.0) : le papier du soir en trois étapes, à la place du papier de la nuit.
// 1. La journée : la carte du front (le plan des secteurs : nos lignes et les leurs, les tronçons pris ▲ et perdus ▼, une croix par homme tombé), « Aujourd'hui / Depuis le début »,
//    la courbe des effectifs, le registre de la dotation, trois moments du jour (dont la médaille). 2. Le camp : sept onglets, l'arbre en cercles (le nom au survol, la description au clic),
//    acheter, rendre, « Annuler ». 3. Les régiments : leurs corvées, les hommes en paquets de 10 qu'on glisse d'un régiment à l'autre, « Continuer la bataille ».
// Le dessin seulement : tout ce qui change l'état passe par les rappels de main.js (`rang`, `transfert`, `donner`, `passer`), qui disent leurs refus à voix haute. Les feuilles : css/style.css, « La soirée ».
import { ARBRES, ORDRE_ARBRES, PRIX, ROMAINS, nomRang } from '../data/ameliorations.js?v=0.159.0';
import { CORVEES } from '../data/corvees.js?v=0.159.0';
import { METEO } from '../data/meteo.js?v=0.159.0';
import { campDe, refusRang, disponible, depenseSoir } from '../camp.js?v=0.159.0';
import { zone, nombreZones, zoneDe, lettreZone } from '../bataille.js?v=0.159.0';
import { refusCorvee, contactDe, disponibles } from '../nuit.js?v=0.159.0';
import { lireJournee, lireBataille } from '../donnees-jour.js?v=0.159.0';
import { palmares } from './medailles.js?v=0.159.0';
import { el, html, info, bouton, corvee, puceReleve, vivres, motMoral, graphe } from './papier-nuit.js?v=0.159.0';
import { jaugeMoral } from './bilan.js?v=0.159.0';
import { iconeCorvee, iconeMedaille } from './icones-nuit.js?v=0.159.0';
import { iconeCamp } from './icones-camp.js?v=0.159.0';

const pts = n => `${n} pt${n > 1 ? 's' : ''}`;
const hache = k => { let x = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };      // (les croix ne bougent pas d'un dessin à l'autre)
const LIGNES = ['Leur 2e ligne', 'Leur 1re ligne', 'Notre 1re ligne', 'Notre 2e ligne'];
const COCHE = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 8.5l3 3 7-7"/></svg>';
const CADENAS = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="10" height="7"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>';
const LIEN = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 9.5l3-3M7 4.5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5L7.5 13A2.5 2.5 0 0 1 4 9.5L5.5 8"/></svg>';
const pips = (n, pleins) => html('span', 'ps-carres', Array.from({ length: n }, (_, k) => `<i class="${k < pleins ? 'plein' : ''}"></i>`).join(''));

/* Le front de ce soir, lu dans l'état : quatre lignes (leur 2e, leur 1re, notre 1re, notre 2e), chaque tronçon { x0, x1 } (0 à 1 sur la largeur du secteur), qui le tient ce soir, la veille au soir, au départ ;
   nos morts par secteur (aujourd'hui, depuis le début) ; les secteurs. Lecture seule. */
export function frontDe(B, moi) {
  const { etat } = B, Z = zone(B), W = Z.x1 - Z.x0, nz = nombreZones(B), x = v => { const f = (v - Z.x0) / W; return moi ? 1 - f : f; };
  const hier = (etat.histo ?? []).filter(h => h.jour < etat.jour && h.troncons).at(-1)?.troncons ?? null;
  const lignes = [[1 - moi, 1], [1 - moi, 0], [moi, 0], [moi, 1]].map(([c, rang]) => {
    const l = B.lignes.findIndex(L => L.camp === c && L.rang === rang);
    return l < 0 ? [] : B.troncons.flatMap((t, k) => t.ligne !== l ? [] : [{ x0: Math.min(x(t.x0), x(t.x1)), x1: Math.max(x(t.x0), x(t.x1)), soir: etat.troncons[k], hier: hier?.[k] ?? c, depart: c }]);
  });
  const morts = [Array(nz).fill(0), Array(nz).fill(0)];
  for (const c of etat.corps) if (c[2] === moi) { const z = Math.min(nz, Math.max(1, zoneDe(B, c[0] / 10))) - 1, s = moi ? nz - 1 - z : z; morts[1][s]++; if (c[3] === etat.jour) morts[0][s]++; }
  return { lignes, nz, lettres: Array.from({ length: nz }, (_, k) => lettreZone(moi ? nz - k : k + 1)), morts };
}

// `ctx` : { $, bataille, moi, choisis, corvees(), donnees(), donner(id, ids), regarder(lien), rang({ a, o, p }), transfert({ a, de, vers, n, bl }), passer() }
export function creerSoiree(ctx) {
  const { $, bataille, moi } = ctx;
  const p = $('soiree'), fil = el('nav', 'ps-fil'), corps = el('div', 'ps-corps'), bas = el('footer', 'ps-bas'), titre = el('h2', '', '');
  p.replaceChildren(el('header', 'ps-bande', titre, fil), corps, bas);
  const V = { etape: 0, vue: 'jour', moment: null, onglet: 'artillerie', sel: null, tenu: null };
  let S = null;      // ce qui ne change pas de la soirée : la journée lue à l'ouverture
  const ETAPES = [['La journée', 'Améliorer le camp'], ['Le camp', 'Les régiments'], ['Les régiments', 'Continuer la bataille']];
  const aller = k => { V.etape = k; rendre(); };

  function montrer() {
    const B = bataille(), e = B.etat, M = moi();
    const d = lireJournee(B, M), K = campDe(e, M);
    const soir = K?.bride && K.soir?.jour === e.jour ? K.soir : null, caisseSoir = (K?.dotation ?? 0) + depenseSoir(e, M);
    const med = palmares(B, M, 'jour').regiments[0];
    const F = frontDe(B, M);
    // les moments : la médaille du jour, les lignes (pris, perdus), le plus grave du jour d'en face ou de chez nous (ou le temps de demain)
    const moments = [];
    if (med) moments.push({ genre: 'medaille', cle: med.cle, titre: med.titre, nom: med.nom, detail: med.detail, lien: { reg: med.reg } });
    const [pris, perdus] = e.prises[e.jour - 1] ?? [0, 0], nous = M === 0 ? [pris, perdus] : [perdus, pris];
    const secteurDe = genre => { for (const L of F.lignes) for (const t of L) if (genre === 'pris' ? t.soir === M && t.hier !== M : t.soir !== M && t.hier === M) return Math.min(F.nz - 1, Math.floor((t.x0 + t.x1) / 2 * F.nz)); return null; };
    if (nous[1]) moments.push({ genre: 'perdu', titre: 'Nos lignes', nom: `${nous[1]} tronçon${nous[1] > 1 ? 's' : ''} perdu${nous[1] > 1 ? 's' : ''}`, detail: secteurDe('perdu') != null ? `surtout en ${F.lettres[secteurDe('perdu')]}` : 'dans la journée', secteur: secteurDe('perdu') });
    if (nous[0]) moments.push({ genre: 'pris', titre: 'Leurs lignes', nom: `${nous[0]} tronçon${nous[0] > 1 ? 's' : ''} pris`, detail: secteurDe('pris') != null ? `surtout en ${F.lettres[secteurDe('pris')]}` : 'dans la journée', secteur: secteurDe('pris') });
    const m = e.moments?.[e.jour - 1];
    if (moments.length < 3 && m) {
      const [a, b] = M === 0 ? [0, 1] : [1, 0], faits = [['assauts', b, 'Leurs assauts', 'en face est sorti de ses tranchées'], ['deroutes', a, 'Nos déroutes', 'des régiments ont lâché pied'], ['chars', a, 'Nos chars', 'détruits aujourd\'hui'], ['avions', a, 'Nos avions', 'abattus aujourd\'hui']];
      for (const [g, c, t, dd] of faits) if (moments.length < 3 && m[g]?.[c]) moments.push({ genre: 'fait', titre: t, nom: String(m[g][c]), detail: dd });
    }
    const demain = e.previsions?.[e.jour - 1];
    if (moments.length < 3 && demain) moments.push({ genre: 'ciel', titre: 'Demain', nom: METEO[demain]?.nom?.replace(/^./, x => x.toUpperCase()) ?? '', detail: METEO[demain]?.prevision ?? '' });
    S = { d, F, soir, caisseSoir, moments, B: lireBataille(B, M), jour: e.jour, bride: !!K?.bride };
    titre.textContent = `Le soir du ${e.jour === 1 ? '1er' : `${e.jour}e`} jour`;
    V.etape = 0; V.vue = 'jour'; V.moment = null; V.tenu = null; V.sel = null;
    p.hidden = false;
    rendre();
  }
  function fermer() { p.hidden = true; S = null; }
  function rendre() {
    if (!S || p.hidden) return;
    const etapes = S.bride ? [0, 1, 2] : [0, 2];      // (sans camp, pas d'étape du camp : le jeu à deux d'avant la v0.94, le labo)
    fil.replaceChildren(...etapes.map((k, i) => {
      const fait = etapes.indexOf(V.etape) > i, b = bouton(`ps-pas${fait ? ' fait' : ''}`, fait ? html('span', 'ps-coche', COCHE.replace('width="12" height="12"', 'width="16" height="16"')) : el('kbd', '', String(i + 1)), el('span', '', ETAPES[k][0]));
      b.setAttribute('aria-current', String(k === V.etape)); b.onclick = () => aller(k); return b;
    }).flatMap((b, k) => k ? [el('span', 'ps-fleche', '→'), b] : [b]));
    corps.replaceChildren([journee, camp, regiments][V.etape]());
    const i = etapes.indexOf(V.etape), prec = etapes[i - 1], suiv = etapes[i + 1];
    const retour = prec != null ? bouton('bouton ps-retour', `← ${ETAPES[prec][0]}`) : el('span');
    if (prec != null) retour.onclick = () => aller(prec);
    const fin = suiv == null, cta = bouton('bouton ps-action', fin ? 'Continuer la bataille' : `${ETAPES[suiv][0]} →`);
    cta.id = 'soiree-action';
    cta.onclick = () => fin ? ctx.passer() : aller(suiv);
    if (fin) { const vd = videsDe(); info(cta, `# Continuer la bataille\nLa nuit | **les corvées se font**\nÀ l'aube | les achats sont confirmés, les paquets marchent${vd.length ? `\nDissous | **${vd.map(r => r.nom).join(', ')}**` : ''}`); }
    bas.replaceChildren(retour, cta);
  }

  // ─── 1. La journée ─────────────────────────────────────────────────────
  function carteFront() {
    const F = S.F, tout = V.vue === 'tout', M = moi(), Mg = 92, W = Mg + 588, H = 184, sw = (W - Mg) / F.nz, cx = s => Mg + s * sw, y = [16, 48, 124, 158], parts = [];
    parts.push(`<rect class="nml" x="${Mg}" y="${y[1] + 14}" width="${W - Mg}" height="${y[2] - y[1] - 28}"/>`, `<text class="nml-t" x="${Mg + (W - Mg) / 2}" y="${(y[1] + y[2]) / 2 + 4}">no man's land</text>`);
    F.lettres.forEach((s, k) => {
      if (k) parts.push(`<path class="sep" d="M${cx(k)} 4V${H - 4}"/>`);
      if (V.moment !== null && S.moments[V.moment]?.secteur === k) parts.push(`<rect class="sur" x="${cx(k) + 2}" y="2" width="${sw - 4}" height="${H - 4}"/>`);
      parts.push(`<text class="lettre" x="${cx(k) + 8}" y="${(y[1] + y[2]) / 2 - 10}">${s}</text>`);
    });
    F.morts[tout ? 1 : 0].forEach((m, s) => {
      for (let i = 0; i < Math.min(m, 140); i++) {
        const a = hache(s * 1000 + i + (tout ? 7 : 0)), b = hache(s * 3000 + i * 7 + 1), x = cx(s) + 10 + a * (sw - 20), yy = y[1] + 20 + b * (y[3] - y[1] - 18);
        parts.push(`<path class="croix${tout ? ' vieux' : ''}" d="M${x - 2} ${yy - 2}l4 4M${x + 2} ${yy - 2}l-4 4"/>`);
      }
    });
    let pris = 0, perdus = 0;
    F.lignes.forEach((ligne, l) => ligne.forEach(t => {
      const x0 = Mg + t.x0 * (W - Mg) + 3, x1 = Mg + t.x1 * (W - Mg) - 3, yy = y[l], avant = tout ? t.depart : t.hier, ch = avant !== t.soir, perdu = t.soir !== M;
      let d = `M${x0} ${yy}`; for (let x = x0, k = 0; x < x1 - 1; x += 4, k++) d += `h${Math.min(4, x1 - x)}v${k % 2 ? -4 : 4}`;
      parts.push(`<path class="tr ${perdu ? 'eux' : 'nous'}${ch ? ` change ${perdu ? 'perdu' : 'pris'}` : ''}" d="${d}"/>`);
      if (ch) { if (perdu) perdus++; else pris++; const xm = (x0 + x1) / 2; parts.push(`<path class="marque ${perdu ? 'perdu' : 'pris'}" d="${perdu ? `M${xm - 5} ${yy - 12}h10l-5 7z` : `M${xm - 5} ${yy - 6}h10l-5 -7z`}"/>`); }
    }));
    LIGNES.forEach((nom, l) => parts.push(`<text class="ligne-t" x="${Mg - 8}" y="${y[l] + 4}">${nom}</text>`));
    const svg = html('div', 'ps3-front', `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="La carte du front">${parts.join('')}</svg>`);
    const tombes = F.morts[tout ? 1 : 0].reduce((a, b) => a + b, 0);
    return info(svg, `# ${tout ? 'Depuis le début' : 'Aujourd\'hui'}\nPris | **${pris}** tronçon${pris > 1 ? 's' : ''}\nPerdus | **${perdus}** tronçon${perdus > 1 ? 's' : ''}\nTombés | **${tombes}** des nôtres\nUne croix | un homme`);
  }
  function journee() {
    const bascule = el('div', 'ps3-bascule', ...[['jour', 'Aujourd\'hui'], ['tout', 'Depuis le début']].map(([k, nom]) => {
      const b = bouton('ps3-b', nom); b.setAttribute('aria-pressed', String(V.vue === k)); b.onclick = () => { V.vue = k; rendre(); }; return b;
    }));
    const legende = el('div', 'ps3-legende', html('span', '', '<i class="lg tr-n"></i>à nous'), html('span', '', '<i class="lg tr-e"></i>à eux'), html('span', '', '<i class="lg pris">▲</i>pris'), html('span', '', '<i class="lg perdu">▼</i>perdu'), html('span', '', '<i class="lg croix">×</i>un mort'));
    const courbe = info(html('div', 'ps3-courbe', graphe(S.B, { larg: 600, haut: 64 })), '# Les effectifs\nJour après jour | les vivants, nous et en face\nLes bâtons | les morts de chaque jour');
    const centre = el('div', 'ps3-centre', el('div', 'ps3-tete', el('h3', '', 'Le front'), bascule), carteFront(), legende, courbe);
    const rang = (nom, v, cls = '') => el('div', `ps3-reg-l ${cls}`, el('span', '', nom), el('i', ''), el('b', '', v));
    const so = S.soir, lignes = so ? [['Le jour tenu', so.base], ['Nos lignes à 75 %', so.tenue], ['Une ligne d\'en face prise', so.lignes]].filter(([, v]) => v) : [];
    const hier = S.caisseSoir - (so?.points ?? 0);
    const registre = S.bride ? info(el('aside', 'ps3-registre', el('h3', '', 'Le registre'), el('small', 'ps3-reg-date', `${S.jour === 1 ? '1er' : `${S.jour}e`} jour · la dotation`),
      rang('Gardés d\'hier', String(hier), 'discret'), ...lignes.map(([nom, v]) => rang(nom, `+${v}`)), rang('En caisse', String(S.caisseSoir), 'total')),
      `# Le registre\nGardés d'hier | ${hier}\n${lignes.map(([nom, v]) => `${nom} | **+${v}**`).join('\n')}${lignes.length ? '\n' : ''}En caisse | **${S.caisseSoir}**\nOn dépense | à l'étape 2, le camp`) : el('aside', 'ps3-registre');
    const moments = el('div', 'ps3-moments', ...S.moments.map((m, k) => {
      const ic = m.genre === 'medaille' ? iconeMedaille(m.cle) : m.genre === 'pris' || m.genre === 'perdu' ? `<svg viewBox="0 0 16 16" width="18" height="18"><path d="${m.genre === 'pris' ? 'M2 12h12L8 3z' : 'M2 4h12L8 13z'}" fill="currentColor"/></svg>` : m.genre === 'ciel' ? iconeCorvee('repos') : '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 1.5L14.5 8 8 14.5 1.5 8z"/><path d="M8 5v3.5M8 10.5v.5"/></svg>';
      const b = bouton(`ps3-moment ${m.genre}`, html('span', 'ps3-m-ic', ic), el('span', 'ps3-m-t', m.titre), el('b', '', m.nom), el('small', '', m.detail));
      b.setAttribute('aria-pressed', String(V.moment === k));
      b.onclick = () => { if (m.lien) { ctx.regarder(m.lien); return; } V.moment = V.moment === k ? null : k; rendre(); };
      return info(b, `# ${m.titre}\n${m.genre === 'medaille' ? 'Médaille | du jour\n' : ''}Quoi | **${m.nom}**${m.detail ? `\nOù | ${m.detail}` : ''}${m.lien ? '\nUn clic | la vue va au régiment' : m.secteur != null ? '\nUn clic | son secteur sur la carte' : ''}`);
    }));
    return el('section', 'ps-panneau ps3-journee', centre, registre, moments);
  }

  // ─── 2. Le camp ─────────────────────────────────────────────────────────
  const K = () => campDe(bataille().etat, moi());
  const acquis = L => (K().rangs[L[0]]?.[L[1]] ?? 0) > L[2];
  const ceSoir = (o, pi) => K().achats.filter(([a, b]) => a === o && b === pi).length;
  function etatRang(o, pi, k) {
    const r = K().rangs[o][pi], R = ARBRES[o].pistes[pi].rangs[k];
    if (k < r) return k >= r - ceSoir(o, pi) ? 'soir' : 'acquis';
    if (k > r || (R.lien && !acquis(R.lien))) return 'verrou';
    return PRIX[k] > K().dotation ? 'cher' : 'dispo';
  }
  const peutAcheter = o => [0, 1].some(pi => K().rangs[o][pi] < 4 && etatRang(o, pi, K().rangs[o][pi]) === 'dispo');
  const nbAcquis = o => K().rangs[o][0] + K().rangs[o][1];
  function noeud(o, pi, k) {
    const R = ARBRES[o].pistes[pi].rangs[k], st = etatRang(o, pi, k), sel = V.sel?.[0] === pi && V.sel[1] === k;
    const coin = st === 'acquis' || st === 'soir' ? COCHE : st === 'verrou' ? CADENAS : R.lien ? LIEN : '';
    const b = bouton(`ps3-n ${st}`, html('span', 'ps3-rond', iconeCamp(R.nom)), coin ? html('span', 'ps3-coin', coin) : null);
    b.setAttribute('aria-label', R.nom); b.setAttribute('aria-pressed', String(sel)); b.dataset.info = R.nom; b.dataset.rang = `${o}:${pi}:${k}`;      // le nom au survol ; la description au clic
    b.onclick = () => { V.sel = [pi, k]; rendre(); };
    return el('div', 'ps3-place', b, pips(PRIX[k], st === 'cher' ? Math.min(PRIX[k], K().dotation) : PRIX[k]));
  }
  function arbre(o) {
    const A = ARBRES[o], plein = (pi, k) => k < 0 || acquis([o, pi, k]);
    const racine = bouton('ps3-n acquis ps3-racine', html('span', 'ps3-rond', iconeCamp(A.i.nom)), html('span', 'ps3-coin', COCHE));
    racine.setAttribute('aria-label', A.i.nom); racine.setAttribute('aria-pressed', String(V.sel?.[0] === 'i')); racine.dataset.info = A.i.nom;
    racine.onclick = () => { V.sel = ['i', 0]; rendre(); };
    const fourche = html('div', 'ps3-fourche', `<svg viewBox="0 0 40 100" preserveAspectRatio="none"><path class="ok" d="M0 50H16M16 25V75"/>${[0, 1].map(pi => `<path class="${plein(pi, 0) ? 'ok' : ''}" d="M16 ${pi ? 75 : 25}H40"/>`).join('')}</svg>`);
    const pistes = A.pistes.map((P, pi) => el('div', 'ps3-piste', el('span', 'ps3-piste-t', P.nom), el('div', 'ps3-rangs', ...[0, 1, 2, 3].flatMap(k => k
      ? [html('span', `ps3-trait${plein(pi, k) && plein(pi, k - 1) ? ' ok' : ''}`, ''), noeud(o, pi, k)] : [noeud(o, pi, k)]))));
    return el('div', 'ps3-arbre', el('div', 'ps3-place ps3-place-i', racine), fourche, el('div', 'ps3-pistes', ...pistes));
  }
  function panneau(o) {
    const A = ARBRES[o], e = bataille().etat;
    if (V.sel?.[0] === 'i') return el('div', 'ps3-noeud', el('div', 'ps-nt', html('span', 'ps-nt-ic ps3-rond', iconeCamp(A.i.nom)), el('div', '', el('h3', '', A.i.nom), el('span', 'ps-nt-sous', el('b', '', 'I'), el('small', '', 'donné au départ')))),
      el('p', 'ps3-chiffre', A.i.chiffre), el('div', 'ps-pousse'));
    const [pi, k] = V.sel, R = A.pistes[pi].rangs[k], st = etatRang(o, pi, k);
    const tete = el('div', 'ps-nt', html('span', 'ps-nt-ic ps3-rond', iconeCamp(R.nom)), el('div', '', el('h3', '', R.nom), el('span', 'ps-nt-sous', el('b', '', ROMAINS[k]), el('small', '', A.pistes[pi].nom), pips(PRIX[k], PRIX[k]))));
    const lien = R.lien ? el('div', `ps3-lien${acquis(R.lien) ? ' ok' : ''}`, html('span', '', acquis(R.lien) ? COCHE : LIEN), el('span', '', `${ARBRES[R.lien[0]].court} · ${nomRang(R.lien)} ${ROMAINS[R.lien[2]]}`)) : null;
    let action;
    const dernier = k === K().rangs[o][pi] - 1;
    if (st === 'dispo') { action = bouton('bouton ps-acheter', `Améliorer · ${pts(PRIX[k])}`); action.onclick = () => ctx.rang({ a: 'acheter', o, p: pi }); }
    else if (st === 'soir' && dernier) { action = info(bouton('bouton ps-rendre', `Rendre · +${pts(PRIX[k])}`), '# Rendre\nAcquis | ce soir\nJusqu\'à l\'aube | un clic le rend et rembourse\nAvec lui | ce qui en dépendait, acheté ce soir'); action.onclick = () => ctx.rang({ a: 'rendre', o, p: pi }); }
    else action = el('p', 'ps-raison', st === 'acquis' ? 'Acquis.' : st === 'soir' ? 'Acquis ce soir : la piste se rend par le haut.' : refusRang(e, o, pi, moi()) ?? 'Demande d\'abord le rang d\'avant.');
    return el('div', 'ps3-noeud', tete, el('p', 'ps3-chiffre', R.chiffre), lien, el('div', 'ps-pousse'), action);
  }
  function camp() {
    const o = V.onglet, e = bataille().etat;
    if (!V.sel) { const r = K().rangs[o]; V.sel = [0, Math.min(3, r[0])]; }
    const onglets = el('nav', 'ps3-tabs', ...ORDRE_ARBRES.map(x => {
      const b = bouton('ps3-tab', el('span', 'ps3-tab-t', ARBRES[x].nom), pips(8, nbAcquis(x)), peutAcheter(x) ? info(el('i', 'ps-plus', '+'), '# Un rang à votre portée') : null);
      b.setAttribute('aria-selected', String(V.onglet === x)); b.dataset.onglet = x; b.onclick = () => { V.onglet = x; V.sel = null; rendre(); };
      return b;
    }));
    const caisse = disponible(e, moi()), dep = depenseSoir(e, moi()), tot = caisse + dep;
    const caisseEl = info(el('div', 'ps-caisse', el('b', '', String(caisse)), el('span', '', caisse > 1 ? 'points' : 'point'),
      html('span', 'ps-carres ps-jetons', Array.from({ length: Math.min(tot, 30) }, (_, k) => `<i class="${k < caisse ? 'plein' : 'depense'}"></i>`).join(''))),
      `# La caisse\nÀ dépenser | **${caisse}**${dep ? `\nDépensés ce soir | ${dep}, rendus jusqu'à l'aube` : ''}`);
    const annuler = bouton(`bouton ps3-annuler${dep ? '' : ' refus'}`, dep ? `Annuler · rend ${pts(dep)}` : 'Annuler');
    if (dep) annuler.onclick = () => ctx.rang({ a: 'annuler' }); else annuler.setAttribute('aria-disabled', 'true');
    info(annuler, dep ? `# Annuler\nRend | **tout ce qui a été dépensé ce soir**\nRangs | ${K().achats.length}\nPoints | **+${dep}**` : '# Annuler\n**Rien n\'a été dépensé ce soir.**');
    return el('section', 'ps-panneau ps3-camp', el('div', 'ps-col ps3-gauche', onglets, arbre(o)), el('aside', 'ps-cote ps3-cote', el('div', 'ps3-caisse-l', caisseEl, annuler), panneau(o)));
  }

  // ─── 3. Les régiments ───────────────────────────────────────────────────
  // les paquets d'un régiment : ses hommes et ses blessés qui restent (moins ce qui part), en paquets de 10 ; ceux qui lui viennent d'ailleurs, par régiment d'origine
  function paquetsDe(B, r) {
    const T = B.etat.transferts[moi()], l = [], dix = (n, bl, de) => { for (let x = n; x > 0; x -= 10) l.push({ n: Math.min(10, x), bl, de }); };
    for (const bl of [false, true]) {
      dix(disponibles(B, moi(), r.id, bl), bl, r.id);
      for (const t of T) if (t.vers === r.id && !!t.bl === bl) dix(t.n, bl, t.de);
    }
    return l;
  }
  const videsDe = () => { const B = bataille(); return B.etat.regiments.filter(r => r.camp === moi() && r.effectif > 0 && !paquetsDe(B, r).length); };
  // déplacer un paquet : de l'endroit où il est (`chez`) vers `vers` ; son origine `de` ne change pas (un seul transfert, de l'origine à la dernière place)
  function deplacer(q, vers) {
    if (q.chez === vers) { V.tenu = null; rendre(); return; }
    if (q.chez !== q.de) ctx.transfert({ a: 'retrait', de: q.de, vers: q.chez, n: q.n, bl: q.bl });
    if (vers !== q.de) ctx.transfert({ a: 'ajout', de: q.de, vers, n: q.n, bl: q.bl });
    V.tenu = null; rendre();
  }
  function paquet(q) {
    const w = q.n * 3 + 3, traits = Array.from({ length: q.n }, (_, k) => `<path d="M${3 + k * 3} 2v12"/>`).join('');
    const nom = bataille().etat.regiments[q.de]?.nom ?? '';
    const e = html('span', `ps3-paquet${q.bl ? ' bl' : ''}${q.de !== q.chez ? ' venu' : ''}${V.tenu && V.tenu.cle === q.cle ? ' tenu' : ''}`, `<svg viewBox="0 0 ${w} 16" width="${w}" height="16" aria-hidden="true">${traits}${q.n === 10 ? `<path class="lien" d="M1 11L${w - 1} 5"/>` : ''}</svg>`);
    e.draggable = true; e.tabIndex = 0; e.setAttribute('role', 'button');
    e.setAttribute('aria-label', `${q.n} ${q.bl ? 'blessés' : 'hommes'}${q.de !== q.chez ? ` du ${nom}` : ''}`);
    e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', q.cle); ev.dataTransfer.effectAllowed = 'move'; V.tenu = q; };
    e.onclick = ev => { ev.stopPropagation(); V.tenu = V.tenu?.cle === q.cle ? null : q; rendre(); };
    e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); e.click(); } };
    return info(e, `# ${q.n} ${q.bl ? (q.n > 1 ? 'blessés' : 'blessé') : (q.n > 1 ? 'hommes' : 'homme')}\n${q.de !== q.chez ? `Venus du | **${nom}**\nÀ l'aube | ils marchent jusqu'ici\n` : ''}Glisser | sur une autre carte\nOu | un clic ici, puis sur la carte`);
  }
  function regiments() {
    const B = bataille(), e = B.etat, M = moi(), sortes = CORVEES, choisis = [...ctx.choisis()], contact = contactDe(B), corv = ctx.corvees(), donnees = ctx.donnees();
    const pourTous = c => { const b = corvee(c, false, ''); b.dataset.pour = 'tous'; return b; };
    const tous = el('div', 'ps-tous', el('span', '', 'Tous :'), ...sortes.map(pourTous));
    const bouge = e.transferts[M].length > 0;
    const ann = bouton(`bouton ps3-annuler${bouge ? '' : ' refus'}`, 'Annuler les transferts');
    if (bouge) ann.onclick = () => { ctx.transfert({ a: 'tout' }); V.tenu = null; rendre(); }; else ann.setAttribute('aria-disabled', 'true');
    info(ann, bouge ? '# Annuler les transferts\nChaque paquet | revient à son régiment\nLes régiments vidés | **reprennent vie**' : '# Annuler les transferts\n**Aucun paquet n\'a bougé.**');
    const regs = S.d.camps[0].regiments.filter(x => e.regiments[x.id]?.effectif > 0), grille = el('div', 'ps3-cartes');
    grille.style.setProperty('--n', String(Math.max(4, Math.ceil(regs.length / 2))));
    let rang = 0;
    for (const x of regs) {
      const r = e.regiments[x.id], l = paquetsDe(B, r).map(q => ({ ...q, chez: r.id, cle: `${r.id}:${q.de}:${q.bl ? 1 : 0}:${rang++}` }));
      const debout = l.filter(q => !q.bl).reduce((t, q) => t + q.n, 0), bl = l.filter(q => q.bl).reduce((t, q) => t + q.n, 0), vide = !debout && !bl;
      const recu = l.filter(q => q.de !== r.id).reduce((t, q) => t + q.n, 0), parti = e.transferts[M].filter(t => t.de === r.id).reduce((t, q) => t + q.n, 0);
      const carte = el('article', `ps3-carte${vide ? ' vide' : ''}${V.tenu ? ' cible' : ''}${choisis.includes(r.id) ? ' choisi' : ''}`);
      carte.dataset.reg = r.id;
      carte.ondragover = ev => { ev.preventDefault(); carte.classList.add('survol'); };
      carte.ondragleave = () => carte.classList.remove('survol');
      carte.ondrop = ev => { ev.preventDefault(); const q = V.tenu; if (q) deplacer(q, r.id); };
      carte.onclick = ev => { if (ev.target.closest('button')) return; if (V.tenu) deplacer(V.tenu, r.id); };
      const solde = recu || parti ? el('span', 'ps3-solde', `${parti ? `−${parti}` : ''}${recu && parti ? ' ' : ''}${recu ? `+${recu}` : ''}`) : null;
      const nomB = bouton(`ps3-nom${choisis.includes(r.id) ? ' choisi' : ''}`, el('b', '', String(x.numero)), el('span', '', r.nom));
      nomB.dataset.reg = r.id; nomB.setAttribute('aria-pressed', String(choisis.includes(r.id)));
      const etatL = el('div', 'ps3-etat', el('b', '', String(debout)), el('small', '', bl ? `+${bl} bl.` : ''), html('span', 'pn-moral', jaugeMoral(x.moral, x.niveau, { larg: 40 })), vivres(Math.min(3, x.vivres ?? 0)));
      const tete = info(el('header', 'ps3-c-tete', nomB, etatL, solde),
        vide ? `# ${r.nom}\n**Vidé : il disparaît à l'aube.**\nSon nom | perdu, ses médailles aussi\nPour le garder | lui rendre des hommes, ou annuler`
          : `# Régiment ${r.nom}\nDebout | **${debout}** sur ${x.initial}\nBlessés | ${bl}\nMoral | **${Math.round(x.moral * 100)} %** ${motMoral(x.niveau)}\nVivres | **${x.vivres ?? 0}** ${(x.vivres ?? 0) > 1 ? 'nuits' : 'nuit'}${recu ? `\nReçus ce soir | +${recu}` : ''}${parti ? `\nPartis ce soir | −${parti}` : ''}\nUn clic sur le nom | le choisir (Maj : l'ajouter)`);
      const hommes = el('div', 'ps3-paquets', ...l.filter(q => !q.bl).map(paquet)), blesses = el('div', 'ps3-paquets bl', ...l.filter(q => q.bl).map(paquet));
      const id = contact.has(r.id) ? 'contact' : corv[r.id];
      const basC = vide ? el('p', 'ps3-dissous', 'Dissous à l\'aube')
        : id === 'contact' ? el('div', 'ps-corvees3', info(html('span', 'ps-contact3', iconeCorvee('contact')), '# Au contact\nCette nuit | **il se bat**\nCorvée | aucune'))
        : el('div', 'ps-corvees3', ...sortes.map(c => corvee(c, id === c.id, refusCorvee(B, r, c.id) || '', donnees.has(r.id), r.id)));
      carte.append(tete, hommes, blesses, basC);
      grille.append(carte);
    }
    const R = e.mission ? ctx.reserve?.() : null;
    return el('section', 'ps-panneau ps3-regiments', el('div', 'ps-regs-tete', tous, el('div', 'ps3-droite', ann, ...(R?.total ? [puceReleve(R)] : []))), grille);
  }
  // les clics des corvées et des noms (comme le papier de la nuit d'avant : une corvée va au régiment de sa carte, et à tous les choisis s'il en est)
  corps.addEventListener('click', ev => {
    if (V.etape !== 2) return;
    const n = ev.target.closest('button.ps3-nom'), c = ev.target.closest('button[data-corvee]');
    if (n) { n.blur(); ctx.choisir(+n.dataset.reg, ev.shiftKey); rendre(); return; }
    if (c) {
      c.blur();
      const B = bataille(), pour = c.dataset.pour, ch = [...ctx.choisis()], nos = B.etat.regiments.filter(r => r.camp === moi() && r.effectif).map(r => r.id);
      ctx.donner(c.dataset.corvee, pour === 'tous' ? nos : ch.includes(+pour) ? ch : [+pour]);
      rendre();
    }
  });
  return { montrer, fermer, rendre, majCamp: () => { if (V.etape === 1) rendre(); }, majRegiments: () => { if (V.etape === 2) rendre(); }, get etape() { return V.etape; }, aller };
}
