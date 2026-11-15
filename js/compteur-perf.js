// Le compteur de performances (v0.134.1) : `?perf=1` dans l'adresse. Un petit panneau en haut à gauche montre, sur les deux dernières
// secondes, la durée des images (médiane, pire, part au-delà de 20 ms), le temps du JS par image et son détail (simulation, soldats,
// tranchées, sol, three.js), les appels de dessin, les triangles et la carte graphique que le navigateur utilise. « Copier » met ces
// lignes dans le presse-papiers : c'est ce qu'on mesure sur une vraie machine (le conteneur de développement n'a pas de carte graphique).
// Chargé seulement avec le paramètre : sans lui, rien de ce module ne tourne. Un outil de mesure, pas une partie de l'interface du jeu.

const N = 240;                                   // images gardées (deux secondes à 120 Hz)

export function creerCompteur({ rendu, stats }) {
  const intervalles = new Float32Array(N), js = new Float32Array(N);
  let k = 0, plein = false, derniere = 0, simImage = 0, debutRendu = 0, texte = '', majT = 0;
  const gl = rendu.renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const carte = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

  const boite = document.createElement('div');
  boite.id = 'compteur-perf';
  boite.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;background:var(--jeu-fond);color:var(--jeu-encre);font:11px/1.35 var(--jeu-police);padding:6px 8px;white-space:pre-wrap;max-width:400px;pointer-events:auto;opacity:.92';
  const courbe = document.createElement('canvas');
  courbe.width = N; courbe.height = 40; courbe.style.cssText = 'display:block;width:240px;height:40px;margin-top:4px';
  const lignes = document.createElement('div');
  const copier = document.createElement('button');
  copier.type = 'button'; copier.textContent = 'Copier'; copier.className = 'bouton'; copier.style.cssText = 'margin-top:4px;min-height:0;padding:2px 8px;font-size:11px';
  copier.onclick = () => { navigator.clipboard?.writeText(texte).then(() => { copier.textContent = 'Copié'; setTimeout(() => { copier.textContent = 'Copier'; }, 1200); }); };
  boite.append(lignes, courbe, copier);
  document.body.append(boite);
  const c2 = courbe.getContext('2d');
  const encre = getComputedStyle(document.documentElement).getPropertyValue('--jeu-encre').trim() || '#ccc';

  const quantile = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))];

  function afficher() {
    const n = plein ? N : k;
    if (n < 10) return;
    const iv = Array.from(intervalles.subarray(0, n)).sort((a, b) => a - b), j = Array.from(js.subarray(0, n)).sort((a, b) => a - b);
    const lents = iv.filter(v => v > 20).length;
    const s = rendu.stats, ms = s.ms, st = stats();
    texte = [
      `${Math.round(1000 / quantile(iv, 0.5))} i/s   image ${quantile(iv, 0.5).toFixed(1)} ms (pire ${iv[n - 1].toFixed(0)}), > 20 ms : ${Math.round(100 * lents / n)} %`,
      `JS par image ${quantile(j, 0.5).toFixed(1)} ms (90 % : ${quantile(j, 0.9).toFixed(1)}, pire ${j[n - 1].toFixed(0)})`,
      `simulation ${st.sim.toFixed(1)} ms/pas × ${st.vitesse}   dessin JS ${ms.rendu.toFixed(1)} ms`,
      `  soldats ${ms.soldats.toFixed(1)}  tranchées ${ms.tranchees.toFixed(1)}  sol ${ms.sol.toFixed(1)}  three ${ms.three.toFixed(1)}`,
      `appels ${s.appels}  triangles ${Math.round(s.trianglesDessines / 1000)} k  soldats ${st.soldats} (vus ${s.soldatsVus})`,
      `${rendu.vue.vw}×${rendu.vue.vh} ×${rendu.vue.facteur}  écran ×${window.devicePixelRatio}  zoom ${rendu.ppm} px/m`,
      carte,
    ].join('\n');
    lignes.textContent = texte;
    // la courbe : la durée de chaque image (de gauche à droite, la plus récente à droite), la ligne de 16,7 ms (60 i/s)
    c2.clearRect(0, 0, N, 40);
    c2.fillStyle = encre;
    for (let i = 0; i < n; i++) { const v = intervalles[(k - n + i + N) % N], h = Math.min(40, v * 40 / 50); c2.fillRect(N - n + i, 40 - h, 1, h); }
    c2.fillRect(0, 40 - 16.7 * 40 / 50, N, 1);
  }

  return {
    // le temps d'un pas de la simulation (appelé par la boucle à chaque pas)
    pas(ms) { simImage += ms; },
    debutImage() { debutRendu = performance.now(); },
    finImage() {
      const t = performance.now();
      if (derniere) { intervalles[k] = t - derniere; js[k] = simImage + (t - debutRendu); k = (k + 1) % N; if (!k) plein = true; }
      derniere = t; simImage = 0;
      if ((majT -= 1) <= 0) { majT = 30; afficher(); }
    },
  };
}
