// Le jeu à deux, en lockstep (v0.30.0) : deux machines calculent la même bataille ; on n'échange que les ordres.
// La simulation est pure, à pas fixe (1/30 s) et à graine (`avancer`) : deux machines qui reçoivent les mêmes ordres aux mêmes cadres calculent la même partie.
//
// Un cadre = un pas de la simulation (ou un pas d'attente : la pause, la nuit). Un ordre donné au cadre F est exécuté au cadre F + `delai` par les deux machines
// (200 ms de retard à 6 : on ne le sent pas, et il laisse au réseau le temps d'arriver). Un cadre ne se joue que quand on a les ordres (même vides) des deux joueurs : si l'autre
// traîne, on attend. Toutes les `periode` cadres, on compare une empreinte de l'état : un écart, c'est une désynchronisation (dite à voix haute).
//
// Logique pure : ni DOM, ni horloge, ni réseau (`envoyer` est donné). Testée dans Node avec un réseau factice (test/lockstep.test.mjs).
import { avancer, photo } from '../bataille.js?v=0.96.0';

const fnv = (h, n) => Math.imul(h ^ (n | 0), 16777619) >>> 0;
const tampon = new DataView(new ArrayBuffer(8));
const bitsF = x => { tampon.setFloat64(0, x); return tampon.getUint32(0) ^ tampon.getUint32(4); };

/* L'empreinte de l'état, par sections : le temps, les hommes (position, vitesse, peur, blessure), les régiments (effectif, moral, ordre, posture), les tronçons, les engins (chars, génie),
   le terrain (hauteurs, eau). Assez fine pour voir une dérive, assez légère pour se faire tous les 90 cadres ; par sections, un écart dit d'où il vient (`sectionsEtat`). */
export function sectionsEtat(B) {
  const e = B.etat, A = B.armee, T = B.terrain, S = {};
  let h = 2166136261;
  for (const v of [e.ticks, e.tickJour, e.jour, e.rng, e.pertes[0], e.pertes[1], e.corps.length, e.barrages.length, e.impacts.length, A.n]) h = fnv(h, bitsF(v));
  h = fnv(h, e.phase === 'jour' ? 1 : 2); S.temps = h;
  h = 2166136261;
  for (let i = 0; i < A.n; i++) { h = fnv(h, bitsF(A.x[i])); h = fnv(h, bitsF(A.y[i])); h = fnv(h, A.blessure[i]); h = fnv(h, bitsF(A.peur[i])); }
  S.hommes = h; h = 2166136261;
  for (const r of e.regiments) { h = fnv(h, r.effectif); h = fnv(h, bitsF(r.moral)); h = fnv(h, bitsF(r.ordre.x)); h = fnv(h, bitsF(r.ordre.y)); for (const c of r.stance ?? 'volonte') h = fnv(h, c.charCodeAt(0)); }
  S.regiments = h; h = 2166136261;
  for (const t of e.troncons) h = fnv(h, t);
  S.troncons = h; h = 2166136261;
  for (const c of e.chars ?? []) { h = fnv(h, bitsF(c.x)); h = fnv(h, bitsF(c.y)); h = fnv(h, bitsF(c.pv)); }
  for (const g of e.genies ?? []) { h = fnv(h, bitsF(g.x)); h = fnv(h, bitsF(g.y)); h = fnv(h, g.n); h = fnv(h, bitsF(g.travail)); }
  S.engins = h; h = 2166136261;
  if (T?.base) { const pas = Math.max(1, T.base.length >> 12); for (let i = 0; i < T.base.length; i += pas) { h = fnv(h, T.base[i]); h = fnv(h, T.diff[i]); h = fnv(h, T.pont?.[i] ?? 0); } }
  S.terrain = h; h = 2166136261;
  for (const K of [e.camp, e.campEux]) if (K) { h = fnv(h, bitsF(K.dotation)); for (const c of Object.values(K.batiments)) { h = fnv(h, c.niveau); h = fnv(h, c.chantier ? c.chantier.nuits : 0); } }
  S.camp = h;      // (v0.94.0 : le camp de chaque joueur)
  return S;
}
const hachage = sec => { let h = 2166136261; for (const v of Object.values(sec)) h = fnv(h, v); return h.toString(16); };
export function empreinteEtat(B) {
  return hachage(sectionsEtat(B));
}

/* Un joueur. `moi` : 0 (nous, le bleu : l'hôte) ou 1 (en face, le kaki : l'invité). `envoyer(msg)` : l'autre machine, dans l'ordre, sans perte (un canal WebRTC fiable).
   `executer(cmd, camp, B)` : ce que fait un ordre (main.js : la même fonction chez les deux). `surEcart(cadre, miennes, siennes)` : une désynchronisation. */
export function creerLockstep({ B, moi, envoyer, executer, delai = 6, periode = 90, sauve = 20, surEcart = () => {}, surPoint = () => {} }) {
  let cadre = 0;                                   // le prochain cadre à jouer
  const miens = new Map(), siens = new Map();      // cadre → les ordres de chacun
  let aEnvoyer = [];                               // les ordres donnés depuis le dernier cadre : ils partent pour cadre + delai
  const hMiens = new Map(), hSiens = new Map(), sMiens = new Map(), sSiens = new Map();
  let ecart = null, dernierEnvoye = -1, attente = 0;      // attente : les appels de suite où l'autre n'avait pas encore parlé
  const etat = { vitesse: 1, pause: false };

  // les `delai` premiers cadres n'ont d'ordres pour personne : on les annonce vides
  for (let f = 0; f < delai; f++) { miens.set(f, []); envoyer({ t: 'cmds', f, cmds: [] }); }
  dernierEnvoye = delai - 1;

  function emettre(f) {                            // à chaque cadre joué, les ordres de l'instant partent pour le cadre joué + `delai`
    if (f <= dernierEnvoye) return;
    const cmds = aEnvoyer; aEnvoyer = [];
    miens.set(f, cmds); envoyer({ t: 'cmds', f, cmds }); dernierEnvoye = f;
  }
  function comparer(f) {
    if (!hMiens.has(f) || !hSiens.has(f)) return;
    if (hMiens.get(f) !== hSiens.get(f) && !ecart) {
      const a = sMiens.get(f) ?? {}, b = sSiens.get(f) ?? {}, sections = Object.keys(a).filter(k => a[k] !== b[k]);      // d'où vient l'écart
      ecart = { cadre: f, miens: hMiens.get(f), siens: hSiens.get(f), sections }; surEcart(f, ecart.miens, ecart.siens, sections);
    }
    hMiens.delete(f); hSiens.delete(f); sMiens.delete(f); sSiens.delete(f);
  }
  return {
    get cadre() { return cadre; },
    get ecart() { return ecart; },
    get attente() { return attente; },
    get etat() { return etat; },
    /* Un ordre du joueur (rien n'est changé tout de suite : il part pour `cadre + delai`). */
    commander(cmd) { aEnvoyer.push(cmd); },
    recevoir(msg) {
      if (msg.t === 'cmds') { siens.set(msg.f, msg.cmds); }
      else if (msg.t === 'hash') { hSiens.set(msg.f, msg.h); sSiens.set(msg.f, msg.s); comparer(msg.f); }
    },
    /* Joue le prochain cadre s'il est prêt ; rend false si l'autre n'a pas encore parlé. */
    cadre_() {
      if (!siens.has(cadre) || !miens.has(cadre)) { attente++; return false; }
      attente = 0;
      // les ordres du cadre, ceux de l'hôte d'abord (le même ordre chez les deux)
      const a = (moi === 0 ? miens : siens).get(cadre), b = (moi === 0 ? siens : miens).get(cadre);
      for (const c of a) executer(c, 0, B, etat);
      for (const c of b) executer(c, 1, B, etat);
      miens.delete(cadre); siens.delete(cadre);
      if (!etat.pause) avancer(B); else B.evenements = [];       // (en pause, les événements du dernier pas ne se rejouent pas)
      const joue = cadre++;
      if (cadre % periode === 0) { const sec = sectionsEtat(B), h = hachage(sec); hMiens.set(cadre, h); sMiens.set(cadre, sec); envoyer({ t: 'hash', f: cadre, h, s: sec }); comparer(cadre);
        // tous les `sauve` × `periode` cadres (60 s), un point de reprise : l'état est le même chez les deux, l'empreinte le nomme (Jérôme, v0.60.0 : reprendre une partie à deux)
        if (cadre % (periode * sauve) === 0 && !ecart) surPoint(h);
      }
      emettre(joue + delai);
      return true;
    },
  };
}
