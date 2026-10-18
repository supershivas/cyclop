// Le lien entre deux machines, sans serveur (v0.30.0) : un canal de données WebRTC, appairé en se passant deux textes (une invitation, une réponse), par ce qu'on veut :
// un message, un papier. Sur un même réseau local, aucun serveur n'est nécessaire (les adresses de la machine suffisent) ; le jeu reste une page statique.
//
// L'hôte : `const h = creerHote(); const invitation = await h.inviter(); … h.accepter(reponse)`.
// L'invité : `const i = creerInvite(); const reponse = await i.repondre(invitation)`.
// Puis, des deux côtés, `lien.canal` s'ouvre : `lien.envoyer(objet)`, `lien.surMessage = obj => …`, `lien.surOuvert`, `lien.surFermeture`.
const ICE = { iceServers: [] };           // (le réseau local : les adresses de la machine ; aucune ressource distante, section 21-22 des conventions)

const encoder = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/=+$/, '');
const decoder = txt => JSON.parse(decodeURIComponent(escape(atob(txt.trim().replace(/\s+/g, '')))));

// attendre que les adresses de la machine soient toutes trouvées (le texte à passer les contient)
function attendreAdresses(pc, delai = 4000) {
  return new Promise(ok => {
    if (pc.iceGatheringState === 'complete') return ok();
    const fin = () => { pc.removeEventListener('icegatheringstatechange', sur); clearTimeout(t); ok(); };
    const sur = () => { if (pc.iceGatheringState === 'complete') fin(); };
    const t = setTimeout(fin, delai);
    pc.addEventListener('icegatheringstatechange', sur);
  });
}

function lierCanal(lien, canal) {
  lien.canal = canal;
  canal.onopen = () => lien.surOuvert?.();
  canal.onclose = () => lien.surFermeture?.();
  canal.onmessage = e => { try { lien.surMessage?.(JSON.parse(e.data)); } catch (err) { console.error('message illisible', err); } };
}
function nouveau() {
  const pc = new RTCPeerConnection(ICE);
  const lien = {
    pc, canal: null, surMessage: null, surOuvert: null, surFermeture: null,
    envoyer(obj) { if (lien.canal?.readyState === 'open') lien.canal.send(JSON.stringify(obj)); },
    get ouvert() { return lien.canal?.readyState === 'open'; },
    fermer() { try { lien.canal?.close(); pc.close(); } catch { /* déjà fermé */ } },
  };
  pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) lien.surFermeture?.(); };
  return lien;
}

export function creerHote() {
  const lien = nouveau();
  lierCanal(lien, lien.pc.createDataChannel('jeu', { ordered: true }));     // fiable et dans l'ordre : le lockstep ne perd rien
  lien.inviter = async () => {
    await lien.pc.setLocalDescription(await lien.pc.createOffer());
    await attendreAdresses(lien.pc);
    return encoder({ t: 'invitation', sdp: lien.pc.localDescription.sdp });
  };
  lien.accepter = async texte => {
    const r = decoder(texte);
    if (r.t !== 'reponse') throw new Error('Ce texte n\'est pas une réponse.');
    await lien.pc.setRemoteDescription({ type: 'answer', sdp: r.sdp });
  };
  return lien;
}
export function creerInvite() {
  const lien = nouveau();
  lien.pc.ondatachannel = e => lierCanal(lien, e.channel);
  lien.repondre = async texte => {
    const r = decoder(texte);
    if (r.t !== 'invitation') throw new Error('Ce texte n\'est pas une invitation.');
    await lien.pc.setRemoteDescription({ type: 'offer', sdp: r.sdp });
    await lien.pc.setLocalDescription(await lien.pc.createAnswer());
    await attendreAdresses(lien.pc);
    return encoder({ t: 'reponse', sdp: lien.pc.localDescription.sdp });
  };
  return lien;
}
