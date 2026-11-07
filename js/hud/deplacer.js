// Une fenêtre qu'on déplace en la prenant par un endroit libre (Jérôme, v0.108.0 : « la fiche du régiment et les fiches des soldats sont déplaçables »).
// On saisit la poignée (la fenêtre entière sauf ses boutons, liens et listes), on tire, elle suit ; elle ne sort jamais de l'écran (8 px de marge).
// Le décalage `d` ({ x, y }, en pixels) est rendu à l'appelant : il l'ajoute à la place qu'il donne lui-même à la fenêtre (la fenêtre d'un régiment suit sa carte à chaque image),
// ou `surDeplace` l'écrit tout de suite (`translate`). Aucun état de bataille : c'est du dessin, rien n'est sauvegardé.
export function deplacable(el, { ignorer = 'button, a, input, select, summary, canvas, .fiche-liste', surDeplace = () => {} } = {}) {
  const d = { x: 0, y: 0 };
  el.classList.add('deplacable');
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest(ignorer)) return;
    const r = el.getBoundingClientRect(), base = { l: r.left - d.x, t: r.top - d.y, w: r.width, h: r.height }, x0 = e.clientX - d.x, y0 = e.clientY - d.y;
    el.setPointerCapture(e.pointerId); el.classList.add('tire');
    const borne = (v, a, b) => Math.max(a, Math.min(v, Math.max(a, b)));
    const bouge = ev => {
      d.x = borne(ev.clientX - x0, 8 - base.l, innerWidth - base.w - 8 - base.l);
      d.y = borne(ev.clientY - y0, 8 - base.t, innerHeight - base.h - 8 - base.t);
      surDeplace(d);
    };
    const fin = () => { el.classList.remove('tire'); el.removeEventListener('pointermove', bouge); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin); };
    el.addEventListener('pointermove', bouge); el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
    e.preventDefault();
  });
  return d;
}
