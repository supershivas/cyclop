// Le jeu à deux, en lockstep (v0.30.0) : deux machines calculent la même bataille ; on n'échange que les ordres.
// La simulation est pure, à pas fixe (1/30 s) et à graine (`avancer`) : deux machines qui reçoivent les mêmes ordres aux mêmes cadres calculent la même partie.
//
// Un cadre = un pas de la simulation (ou un pas d'attente : la pause, la nuit). Un ordre donné au cadre F est exécuté au cadre F + `delai` par les deux machines
// (200 ms de retard à 6 : on ne le sent pas, et il laisse au réseau le temps d'arriver). Un cadre ne se joue que quand on a les ordres (même vides) des deux joueurs : si l'autre
// traîne, on attend. Toutes les `periode` cadres, on compare une empreinte de l'état : un écart, c'est une désynchronisation (dite à voix haute).
//
// Logique pure : ni DOM, ni horloge, ni réseau (`envoyer` est donné). Testée dans Node avec un réseau factice (test/lockstep.test.mjs).
import { avancer, photo } from '../bataille.js?v=0.52.0';

const fnv = (h, n) => Math.imul(h ^ (n | 0), 16777619) >>> 0;
const tampon = new DataView(new ArrayBuffer(8));
const bitsF = x => { tampon.setFloat64(0, x); return tampon.getUint32(0) ^ tampon.getUint32(4); };

/* L'empreinte de l'état : le temps, les hommes (position, vitesse, peur, blessure), les pertes, le moral, la posture, les tronçons, le hasard. Assez fine pour voir une dérive,
   assez légère pour se faire tous les 90 cadres. */
export function empreinteEtat(B) {
  const e = B.etat, A = B.armee;
  let h = 2166136261;
  for (const v of [e.ticks, e.tickJour, e.jour, e.rng, e.pertes[0], e.pertes[1], e.corps.length, e.barrages.length, e.impacts.length, A.n]) h = fnv(h, bitsF(v));
  for (let i = 0; i < A.n; i++) { h = fnv(h, bitsF(A.x[i])); h = fnv(h, bitsF(A.y[i])); h = fnv(h, A.blessure[i]); h = fnv(h, bitsF(A.peur[i])); }
  for (const r of e.regiments) { h = fnv(h, r.effectif); h = fnv(h, bitsF(r.moral)); h = fnv(h, bitsF(r.ordre.x)); h = fnv(h, bitsF(r.ordre.y)); for (const c of r.stance ?? 'volonte') h = fnv(h, c.charCodeAt(0)); }
  for (const t of e.troncons) h = fnv(h, t);
  for (const c of e.chars ?? []) { h = fnv(h, bitsF(c.x)); h = fnv(h, bitsF(c.y)); h = fnv(h, bitsF(c.pv)); }
  return h.toString(16);
}

/* Un joueur. `moi` : 0 (nous, le bleu : l'hôte) ou 1 (en face, le kaki : l'invité). `envoyer(msg)` : l'autre machine, dans l'ordre, sans perte (un canal WebRTC fiable).
   `executer(cmd, camp, B)` : ce que fait un ordre (main.js : la même fonction chez les deux). `surEcart(cadre, miennes, siennes)` : une désynchronisation. */
export function creerLockstep({ B, moi, envoyer, executer, delai = 6, periode = 90, surEcart = () => {} }) {
  let cadre = 0;                                   // le prochain cadre à jouer
  const miens = new Map(), siens = new Map();      // cadre → les ordres de chacun
  let aEnvoyer = [];                               // les ordres donnés depuis le dernier cadre : ils partent pour cadre + delai
  const hMiens = new Map(), hSiens = new Map();
  let ecart = null, dernierEnvoye = -1;
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
    if (hMiens.get(f) !== hSiens.get(f) && !ecart) { ecart = { cadre: f, miens: hMiens.get(f), siens: hSiens.get(f) }; surEcart(f, ecart.miens, ecart.siens); }
    hMiens.delete(f); hSiens.delete(f);
  }
  return {
    get cadre() { return cadre; },
    get ecart() { return ecart; },
    get etat() { return etat; },
    /* Un ordre du joueur (rien n'est changé tout de suite : il part pour `cadre + delai`). */
    commander(cmd) { aEnvoyer.push(cmd); },
    recevoir(msg) {
      if (msg.t === 'cmds') { siens.set(msg.f, msg.cmds); }
      else if (msg.t === 'hash') { hSiens.set(msg.f, msg.h); comparer(msg.f); }
    },
    /* Joue le prochain cadre s'il est prêt ; rend false si l'autre n'a pas encore parlé. */
    cadre_() {
      if (!siens.has(cadre) || !miens.has(cadre)) return false;
      // les ordres du cadre, ceux de l'hôte d'abord (le même ordre chez les deux)
      const a = (moi === 0 ? miens : siens).get(cadre), b = (moi === 0 ? siens : miens).get(cadre);
      for (const c of a) executer(c, 0, B, etat);
      for (const c of b) executer(c, 1, B, etat);
      miens.delete(cadre); siens.delete(cadre);
      if (!etat.pause) avancer(B); else B.evenements = [];       // (en pause, les événements du dernier pas ne se rejouent pas)
      const joue = cadre++;
      if (cadre % periode === 0) { const h = empreinteEtat(B); hMiens.set(cadre, h); envoyer({ t: 'hash', f: cadre, h }); comparer(cadre); }
      emettre(joue + delai);
      return true;
    },
  };
}
