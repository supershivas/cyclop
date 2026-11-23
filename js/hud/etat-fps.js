/* Le tableau de bord des vues à la personne (Jérôme, 23 nov., v0.167.0 : « règles pour les vues FPS : toujours les contrôles visibles, toujours l'état et les infos de base, toujours les munitions
   avec leur intitulé (Lebel, Mitrailleuse…) » ; « on doit bien comprendre ce que sont les barres en bas et les points ») : en bas à droite, une ligne par chose qu'on surveille, son nom, sa barre (ou ses
   cartouches dessinées), sa valeur en peu de mots. Le dessin seulement : suivi.js lui donne les lignes à chaque image ; la structure n'est refaite que si les noms ou les cartouches changent,
   les barres et les valeurs sont posées sur place (un bouton ou un élément refait à chaque image perd ce qu'on y fait : design-system, point 5).
   Une ligne : { nom, val (0 à 1, ou null : pas de barre), texte, points (HTML des cartouches, ou ''), faible (la barre se vide : elle clignote doucement), att (estompée : automatique, rentré) } */
export function creerEtatFps(el) {
  let cle = '', refs = [];
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return {
    poser(titre, lignes) {
      const c = titre + '|' + lignes.map(l => `${l.nom}#${l.val === null || l.val === undefined ? 0 : 1}#${l.points ?? ''}`).join('|');
      if (c !== cle) {
        cle = c;
        el.innerHTML = `<p class="ef-titre">${esc(titre)}</p>` + lignes.map(l => `<div class="ef-l"><span class="ef-nom">${esc(l.nom)}</span><span class="ef-val"></span>`
          + (l.points ? `<span class="ef-points">${l.points}</span>` : '') + (l.val === null || l.val === undefined ? '' : '<span class="ef-barre"><i></i></span>') + '</div>').join('');
        refs = [...el.querySelectorAll('.ef-l')].map(d => ({ d, val: d.querySelector('.ef-val'), i: d.querySelector('.ef-barre i'), texte: null }));
      }
      lignes.forEach((l, k) => {
        const r = refs[k]; if (!r) return;
        if (r.texte !== l.texte) { r.texte = l.texte; r.val.textContent = l.texte ?? ''; }
        if (r.i) r.i.style.width = `${(Math.max(0, Math.min(1, l.val)) * 100).toFixed(1)}%`;
        r.d.classList.toggle('faible', !!l.faible); r.d.classList.toggle('att', !!l.att);
      });
    },
    vider() { cle = ''; refs = []; el.innerHTML = ''; },
  };
}
