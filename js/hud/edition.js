// L'édition sur l'écran titre (ROADMAP.md, lot 0) : le bouton qui passe d'une édition à l'autre (une autre adresse, d'autres sauvegardes),
// et ce que l'édition retire de l'accueil (le jeu à deux, dans l'édition itch). Les textes passent par `t` (js/textes.js).
import { t } from '../textes.js?v=0.170.5';

export function brancherEdition({ $, params, id, edition }) {
  if (!edition.deux) for (const b of ['jouer-deux', 'reprendre-deux']) $(b).hidden = true;
  const b = $('changer-edition'), vers = id === 'itch' ? 'classique' : 'itch';
  b.textContent = t(`titre.edition.${vers}`);
  b.title = t(`titre.edition.${vers}.info`);
  b.onclick = () => {
    const p = new URLSearchParams(params);
    if (vers === 'classique') p.delete('edition'); else p.set('edition', vers);
    const q = p.toString();
    location.href = location.pathname + (q ? `?${q}` : '');
  };
}
