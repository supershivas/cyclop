// Le jeu à deux : l'appairage, la poignée de main, le départ, le pouls, la reprise (sorti de main.js, lot de dette du 24 nov.).
// `reseau` (l'état de la partie à deux, ou null) reste à main.js, qui le lit partout : ce module le lit par `lire()` et le pose par `poser(v)`.
// L'exécution des ordres (`executerCmd`) et les ordres à sec (`lancerMarche`…) restent à main.js : ils servent aussi à la partie seule.
import { loadVersion } from '../lib/app-update.js?v=0.170.2';
import { nouvelleBataille, restaurer, photo, NOUS, EUX } from '../bataille.js?v=0.170.2';
import { SECTEURS } from '../data/secteur.js?v=0.170.2';
import { SAISONS } from '../data/meteo.js?v=0.170.2';
import { ID_ALEATOIRE } from '../generateur.js?v=0.170.2';
import { creerLockstep } from './lockstep.js?v=0.170.2';
import { nouveauCode, codeValide, publier, ecouter } from './relais.js?v=0.170.2';
import { creerHote, creerInvite } from './lien.js?v=0.170.2';

let $, R, store, ESSAI, retouchesSecteurs, cartesPerso, lire, poser, bataille, reglerCamp, executerCmd, noter, toast, jouer, missionOrdre, loop, montrerTitre, demanderSecteur;
export function creerJeuADeux(ctx) {
  ({ $, R, store, ESSAI, retouchesSecteurs, cartesPerso, lire, poser, bataille, reglerCamp, executerCmd, noter, toast, jouer, missionOrdre, loop, montrerTitre, demanderSecteur } = ctx);
  brancher();
  return { quitter: quitterReseau, enregistrer: enregistrerDeux };
}

// ─── Le jeu à deux, sur le réseau (Jérôme, v0.30.0) ───────────────────────────────────────────────────────────────
// Deux machines, la même bataille (lockstep : reseau/lockstep.js) ; on n'échange que les ordres, sur un canal WebRTC appairé à la main (reseau/lien.js). L'hôte joue le bleu, l'invité le kaki.
// Chaque ordre part pour les deux machines, et s'exécute au même cadre chez les deux ; le refus, lui, se dit tout de suite (l'ordre à sec).
let versionJeu = '';
loadVersion().then(v => { versionJeu = v || ''; });
const empreinteReglages = () => { const t = JSON.stringify([R, retouchesSecteurs, cartesPerso]); let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
// Un point de reprise d'une partie à deux, tous les 60 s : les deux machines l'écrivent au même cadre, avec le même nom (l'empreinte de l'état) ; on garde les deux derniers,
// car une machine coupée entre deux points n'a peut-être pas le plus récent. Rien n'est écrit en mode essai, ni quand la bataille est finie.
function enregistrerDeux(h) {
  if (!lire() || ESSAI || bataille().etat.phase === 'fin') return;
  const avant = store.load('partieDeux')?.points ?? [];
  try { store.save('partieDeux', { moi: lire().moi, version: versionJeu, points: [{ id: h, photo: photo(bataille()) }, ...avant.slice(0, 1)] }); } catch (e) { console.error(e); }
}
let repriseDeux = null;       // la sauvegarde qu'on veut reprendre (le bouton de l'écran titre), ou null
function demarrerReseau({ moi, lien, graine, secteur, saison, reprise }) {
  for (const d of document.querySelectorAll('dialog[open]')) d.close();
  poser({ moi, lien, ls: null, corvees: {}, pret: [false, false], pauseParMoi: false, departs: [false, false] });
  reglerCamp(moi);
  const b = reprise ? restaurer(reprise.photo, R) : nouvelleBataille(graine, R, { secteur, saison, deux: true, camp: true });      // à deux aussi, chacun a son camp (v0.94.0)
  lire().ls = creerLockstep({
    B: b, moi, surPoint: enregistrerDeux, envoyer: m => lien.envoyer(m), executer: executerCmd,
    surEcart: (cadre, a, b, sections) => { noter('Désynchronisation : les deux parties ne sont plus les mêmes.'); toast(`Désynchronisation (${sections.join(', ') || 'état'}) : les deux parties ont divergé.`, 'alerte'); console.error('désynchronisation au cadre', cadre, a, b, sections); },
  });
  // le pouls : un message toutes les 2 s même quand rien ne se joue (un onglet caché, une machine qui attend) ; 90 s de silence : l'autre n'est plus là
  lire().vu = performance.now(); lire().attendu = false;
  lire().pouls = setInterval(() => {
    if (!lire()) return;
    lien.envoyer({ t: 'ping' });
    if (performance.now() - lire().vu > 90000) quitterReseau('L\'autre machine ne répond plus : la connexion est perdue.');
  }, 2000);
  lien.surMessage = m => { if (!lire()) return; lire().vu = performance.now(); if (m.t === 'cmds' || m.t === 'hash') lire().ls.recevoir(m); else if (m.t === 'quitte') quitterReseau('L\'autre commandant a quitté la partie.'); };
  lien.surFermeture = () => { if (lire()) quitterReseau('La connexion est perdue.'); };
  lire().ls.etat.pause = true;                              // la bataille (neuve ou reprise) démarre en pause chez les deux, jusqu'à ce qu'ils soient prêts
  jouer(b);
  $('depart-statut').textContent = reprise ? 'Partie reprise. La bataille repart quand les deux commandants sont prêts.' : 'La bataille commence quand les deux commandants sont prêts.';
  $('deux-pret').disabled = false; $('deux-pret').textContent = 'Prêt'; $('dialogue-depart').showModal();
  noter(`Vous êtes le ${moi === NOUS ? 'bleu' : 'kaki'}. ${missionOrdre()}`);
  toast(`Vous êtes le ${moi === NOUS ? 'bleu' : 'kaki'}. Espace : pause pour les deux.`);
}
function quitterReseau(message) {
  const r = lire(); if (!r) return;
  clearInterval(r.pouls); $('dialogue-depart').close();
  poser(null); reglerCamp(NOUS);
  try { r.lien.envoyer({ t: 'quitte' }); r.lien.fermer(); } catch { /* déjà fermé */ }
  if (message) toast(message);
  loop().resume(); montrerTitre();
}
// la poignée de main : la version du jeu et ses réglages doivent être les mêmes (les deux machines calculent avec le même code et les mêmes nombres)
function poigneeHote(lien, graine, secteur, saison) {
  const reprise = repriseDeux;
  lien.surOuvert = () => lien.envoyer({ t: 'init', version: versionJeu, reglages: empreinteReglages(), graine, secteur, saison, reprise: reprise ? reprise.points.map(p => p.id) : null });
  lien.surMessage = m => {
    if (m.t === 'ok') demarrerReseau({ moi: NOUS, lien, graine, secteur, saison, reprise: reprise ? reprise.points.find(p => p.id === m.reprise) : null });
    else if (m.t === 'refus') { $('deux-statut').textContent = `L'autre machine refuse : ${m.raison}`; lien.fermer(); }
  };
}
function poigneeInvite(lien) {
  lien.surMessage = m => {
    if (m.t !== 'init') return;
    const raison = m.version !== versionJeu ? `elle joue la v${m.version}, vous la v${versionJeu} : rechargez la page` : m.reglages !== empreinteReglages() ? 'les réglages (l\'atelier) ne sont pas les mêmes' : !(SECTEURS[m.secteur] || m.secteur === ID_ALEATOIRE) ? 'secteur inconnu' : m.saison && !SAISONS[m.saison] ? 'saison inconnue' : null;
    if (raison) { lien.envoyer({ t: 'refus', raison }); $('deux-statut').textContent = `Impossible de jouer ensemble : ${raison}.`; return; }
    // la reprise d'une partie : les deux doivent la vouloir, avoir joué les mêmes camps (l'hôte le bleu) et partager un point (le plus récent des siens que l'hôte a aussi)
    const sauv = store.load('partieDeux'), point = m.reprise && sauv && sauv.version === versionJeu && sauv.moi === EUX ? m.reprise.map(id => sauv.points.find(q => q.id === id)).find(Boolean) : null;
    const refus = m.reprise && !point ? 'vous n\u2019avez pas de partie à deux à reprendre avec lui (autre camp, autre version, ou aucun point commun)' : !m.reprise && repriseDeux ? 'il lance une nouvelle partie, vous vouliez reprendre l\u2019ancienne' : '';
    if (refus) { lien.envoyer({ t: 'refus', raison: refus }); $('deux-statut').textContent = `Impossible de jouer ensemble : ${refus}.`; return; }
    lien.envoyer({ t: 'ok', reprise: point?.id ?? null });
    demarrerReseau({ moi: EUX, lien, graine: m.graine, secteur: m.secteur, saison: m.saison, reprise: point });
  };
}
function brancher() {
  $('dialogue-depart').addEventListener('cancel', e => e.preventDefault());       // Échap ne passe pas le départ : il faut dire « Prêt »
  $('deux-pret').onclick = () => { if (!lire()) return; $('deux-pret').disabled = true; $('deux-pret').textContent = 'En attente de l\'autre commandant…'; lire().ls.commander({ t: 'depart' }); };
  const dlg = $('dialogue-deux'), statut = t => { $('deux-statut').textContent = t; };
  const copier = async id => { const a = $(id); a.select(); try { await navigator.clipboard.writeText(a.value); statut('Copié.'); } catch { statut('Sélectionné : copiez-le à la main.'); } };
  let lien = null, arreterRelais = null;
  // dit à voix haute où en est la connexion, et pourquoi elle échoue
  const suivreEtat = l => {
    l.surEtat = e => {
      if (lire()) return;
      if (e === 'connecting') statut('Connexion en cours…');
      else if (e === 'failed') statut('La connexion a échoué : les deux machines ne se voient pas (même réseau ? pare-feu, Wi-Fi « invité » ou VPN qui isolent les appareils). Recommencez avec une nouvelle invitation.' + (/firefox/i.test(navigator.userAgent) ? ' Firefox pose problème : essayez Chrome sur les deux machines.' : ''));
    };
  };
  $('jouer-deux').onclick = () => { repriseDeux = null; ouvrirDeux(); };
  // reprendre : le bleu invite, le kaki rejoint, chacun avec sa sauvegarde (v0.60.0)
  $('reprendre-deux').onclick = () => { repriseDeux = store.load('partieDeux'); if (!repriseDeux) return; ouvrirDeux(repriseDeux.moi === NOUS ? 'Reprise : vous étiez le bleu, vous invitez.' : 'Reprise : vous étiez le kaki, vous rejoignez avec le code du bleu.'); };
  const ouvrirDeux = (mot = '') => {
    $('deux-choix').hidden = false; $('deux-hote').hidden = true; $('deux-invite').hidden = true; statut('');
    for (const id of ['deux-invitation', 'deux-reponse', 'deux-invitation-recue', 'deux-ma-reponse']) $(id).value = '';
    $('deux-inviter').hidden = !!repriseDeux && repriseDeux.moi !== NOUS; $('deux-rejoindre').hidden = !!repriseDeux && repriseDeux.moi === NOUS; statut(mot);
    dlg.showModal();
  };
  dlg.addEventListener('close', () => { arreterRelais?.(); arreterRelais = null; if (!lire() && lien) { lien.fermer(); lien = null; } });
  $('deux-inviter').onclick = async () => {
    const choix = repriseDeux ? { secteur: repriseDeux.points[0].photo.secteur ?? 'essai', graine: repriseDeux.points[0].photo.graine, saison: repriseDeux.points[0].photo.sol?.saison } : await demanderSecteur(false);
    if (!choix) return;
    const { secteur, graine, saison } = choix;
    $('deux-choix').hidden = true; $('deux-hote').hidden = false; statut('Préparation de l\'invitation…');
    try {
      lien = creerHote(); poigneeHote(lien, graine, secteur, saison); suivreEtat(lien);
      $('deux-invitation').value = await lien.inviter();
      const code = nouveauCode(); $('deux-code').textContent = code;
      const hors = () => statut('Relais injoignable : utilisez le copier-coller ci-dessous.');
      arreterRelais = ecouter(code, async m => {
        if (m.t !== 'reponse' || !lien || lien.pc.remoteDescription) return;
        try { statut('Connexion en cours…'); await lien.accepter(m.texte); } catch (e) { statut(`Réponse illisible : ${e.message}`); }
      }, hors);
      await publier(code, { t: 'invitation', texte: $('deux-invitation').value }).catch(e => { console.error(e); hors(); });
      statut(`Secteur : ${SECTEURS[secteur].nom}${SAISONS[saison] ? `, en ${SAISONS[saison].nom}` : ''}. En attente de l'autre joueur.`);
    } catch (e) { console.error(e); statut(`Impossible : ${e.message}`); }
  };
  $('deux-connecter').onclick = async () => {
    try { statut('Connexion…'); await lien.accepter($('deux-reponse').value); statut('Connexion en cours… (les deux machines doivent être sur le même réseau)'); }
    catch (e) { statut(`Réponse illisible : ${e.message}`); }
  };
  $('deux-rejoindre').onclick = () => { $('deux-choix').hidden = true; $('deux-invite').hidden = false; statut(''); };
  $('deux-repondre').onclick = async () => {
    try {
      statut('Préparation de la réponse…');
      lien = creerInvite(); poigneeInvite(lien); suivreEtat(lien);
      $('deux-ma-reponse').value = await lien.repondre($('deux-invitation-recue').value);
      statut('Renvoyez ce texte à celui qui vous invite : la partie commence quand il l\'aura collé.');
    } catch (e) { console.error(e); statut(`Invitation illisible : ${e.message}`); }
  };
  $('deux-rejoindre-code').onclick = () => {
    const code = $('deux-code-saisi').value;
    if (!codeValide(code)) return statut('Le code a 6 signes (lettres et chiffres).');
    arreterRelais?.(); statut('Recherche de l\'invitation…');
    let repondu = false;
    arreterRelais = ecouter(code, async m => {
      if (m.t !== 'invitation' || repondu) return;
      repondu = true;
      try {
        lien = creerInvite(); poigneeInvite(lien); suivreEtat(lien);
        await publier(code, { t: 'reponse', texte: await lien.repondre(m.texte) });
        statut('Réponse envoyée : la partie commence dans un instant…');
      } catch (e) { console.error(e); repondu = false; statut(`Impossible : ${e.message}`); }
    }, () => statut('Relais injoignable : utilisez le copier-coller ci-dessous.'));
  };
  $('deux-copier-invitation').onclick = () => copier('deux-invitation');
  $('deux-copier-reponse').onclick = () => copier('deux-ma-reponse');
}
