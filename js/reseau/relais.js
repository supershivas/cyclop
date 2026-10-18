// Le rendez-vous par code court (v0.33.2) : l'hôte et l'invité s'échangent l'invitation et la réponse (les deux textes de lien.js) par un relais public, ntfy.sh, dont chaque « sujet » est une boîte aux lettres.
// Le code (6 signes) est le nom du sujet ; le relais ne voit que ces deux textes (des adresses réseau), jamais la partie, qui passe en direct entre les machines. Contacté seulement quand on invite ou qu'on rejoint.
const BASE = 'https://ntfy.sh';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';      // sans I, O, 0, 1 : on le dicte à voix haute
const sujet = code => `cyclopeen-${code.trim().toUpperCase()}`;

// un code au hasard du navigateur (hors logique de jeu : l'appairage n'est pas la partie)
export function nouveauCode() {
  const t = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(t, n => ALPHABET[n % ALPHABET.length]).join('');
}
export const codeValide = code => new RegExp(`^[${ALPHABET}]{6}$`).test(code.trim().toUpperCase());

export async function publier(code, objet) {
  const r = await fetch(`${BASE}/${sujet(code)}`, { method: 'POST', body: JSON.stringify(objet) });
  if (!r.ok) throw new Error(`le relais refuse (${r.status})`);
}
// écoute les messages du sujet (ceux d'avant aussi : l'invité arrive après l'invitation) ; rend une fonction qui arrête l'écoute
export function ecouter(code, surMessage, surErreur) {
  const es = new EventSource(`${BASE}/${sujet(code)}/sse?since=all`);
  es.onmessage = e => {
    try { const m = JSON.parse(JSON.parse(e.data).message); surMessage(m); } catch { /* un autre message du sujet : ignoré */ }
  };
  es.onerror = () => { if (es.readyState === EventSource.CLOSED) surErreur?.(); };
  return () => es.close();
}
