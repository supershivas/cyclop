// Les tampons de la vue d'un soldat (v0.154.0) : un mot frappé au tiers haut de l'image (« Abattu », « Blessé », « Un camarade tombe »…) et une ligne dessous, un à la fois, en file.
// Le dessin seulement : hud/suivi.js dit quoi (les clés de data/tampons.js) ; l'horloge est celle du navigateur (le tampon est un retour d'écran, jamais l'état).
import { TAMPONS, RYTHME_TAMPONS as R } from '../data/tampons.js?v=0.170.2';

export function creerTampons(el) {
  const file = [];
  let fin = 0, cle = '', images = 0;      // (images : un tampon reste au moins quelques images, même sur une machine lente où 1,8 s passent en une ou deux images)
  const mot = el.querySelector('b'), ligne = el.querySelector('span');
  function montrer({ k, ligne: l }) {
    const T = TAMPONS[k];
    el.className = `tampon-fps${T.genre ? ` ${T.genre}` : ''}`;
    mot.textContent = T.mot; ligne.textContent = l ?? T.ligne ?? '';
    el.hidden = false; void el.getBoundingClientRect(); el.classList.add('frappe');
    fin = performance.now() + R.duree * 1000; images = 0;
  }
  return {
    // un tampon de plus ; le même (clé et ligne) qu'en cours n'est pas répété
    poser(k, l) {
      if (!TAMPONS[k] || `${k}|${l}` === cle && !el.hidden) return;
      cle = `${k}|${l}`;
      if (el.hidden) montrer({ k, ligne: l });
      else if (file.length < R.file) file.push({ k, ligne: l });
    },
    // à chaque image : le tampon se retire à l'heure dite, le suivant le remplace
    maj() { if (el.hidden || performance.now() < fin || ++images < 4) return; if (file.length) montrer(file.shift()); else { el.hidden = true; cle = ''; } },
    vider() { file.length = 0; fin = 0; cle = ''; el.hidden = true; },
  };
}
