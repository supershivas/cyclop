// Les ouvrages d'un tronçon de tranchée en trois niveaux de détail (Jérôme, v0.84.0 : « propose des tranchées détaillées, trois niveaux de détails, intactes,
// légèrement détruites, complètement détruites »). Le dessin seulement, et de la géométrie pure (aucun THREE, aucun DOM : testée et mesurée dans Node, `outils/mesure-tranchees.mjs`).
// Le contexte `g` (rempli par troncons.js, ou par la mesure) donne ce que le sol sait : `surface(x, z)` la hauteur, `etat(x)` l'état du bout de tranchée sous x
// (2 creusée, 1 à moitié comblée, 0 comblée : lu de sa profondeur, donc rejoué par la sauvegarde, rien n'est gardé), `j(a, b)` un hachage 0..1 (le même désordre à chaque image),
// `quad` et `trait` (où écrire), `K` les couleurs (paires [dessus, flanc]), `pris` (le tronçon est à l'autre camp : le parapet devient le parados), `coupe` (le fil est coupé).
// Les trois niveaux (le jeu d'aujourd'hui, dans troncons.js, reste le niveau 0 : à la fois moins fourni de loin et sans banquette, sans cadres, sans abri) :
//   1 Silhouette — l'essentiel qui se lit de loin : un parapet continu par tranches de 5 m, les traverses, un fil à deux brins ;
//   2 Ouvrage — les sacs un à un, la banquette de tir, les lisses et les montants du boisage, le caillebotis, les barbelés sur piquets ;
//   3 Détaillé — trois assises de sacs, le clayonnage des parois, des cadres de boisage avec leur écharpe, un caniveau, une échelle, un abri, des plaques de meurtrière,
//       un fil téléphonique et une lanterne, des rouleaux de barbelé.
// La « texture » (v0.94.2 : « différents effets de texture ») : `g.texture` de 0 à 3, sans image (le jeu est en dix tons) : 0 des aplats (un ton par élément) ; 1 des tons variés d'un sac, d'une planche à l'autre (le jeu) ;
// 2 des joints entre les sacs, une ficelle sur le dessus, le grain des planches, le tressage du clayonnage ; 3 l'usure : la boue au pied des sacs, sur les planches, la mousse sur le dessus des sacs.
// À chaque niveau, l'état du bout de tranchée (creusée, à moitié comblée, comblée) change ce qui reste : en place, brisé et de travers, puis des éclats à terre.
import { ligneY, demiLargeur } from '../tranchees.js?v=0.94.2';
import { TRANCHEE_OUVRAGES } from '../data/tranchees.js?v=0.94.2';

export const NIVEAUX_TRANCHEES = [
  { n: 1, nom: 'Silhouette', note: 'Le parapet en tranches de 5 m, deux traverses, un fil à deux brins. Ce qui se lit de loin, pour presque rien.' },
  { n: 2, nom: 'Ouvrage', note: 'Les sacs un à un en deux assises, la banquette de tir, les lisses et les montants du boisage, le caillebotis, les barbelés sur piquets.' },
  { n: 3, nom: 'Détaillé', note: 'Trois assises de sacs, le clayonnage des parois, des cadres de boisage et leur écharpe, un caniveau, une échelle, un abri, des plaques de meurtrière, un fil téléphonique et une lanterne, des rouleaux de barbelé.' },
];

// Le mode « selon le zoom » : le niveau d'un zoom (p : pixels par mètre) — de loin la silhouette, de près tout le détail
export const niveauSelonZoom = p => (p >= 8 ? 3 : p >= 4 ? 2 : 1);

/* Les deux volumes dont tout est fait : la boîte (dessus et quatre flancs, 10 triangles : comme celle du jeu) et la poutre (un prisme carré de demi-côté e d'un point à un autre :
   les montants penchés, les planches qui pendent, les échelles couchées ; quatre flancs et un bout, 10 triangles). `quad(a, b, c, d, couleur)` écrit deux triangles. */
export function primitives(quad) {
  const boite = (x0, x1, y0, y1, z0, z1, k) => {
    const [haut, flanc] = k;
    quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], haut);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], flanc);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], flanc);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], flanc);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], flanc);
  };
  const poutre = (ax, ay, az, bx, by, bz, e, k) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz);
    if (l < 1e-6) return;
    const nx = dx / l, ny = dy / l, nz = dz / l;
    // u : perpendiculaire à l'axe et à la verticale (à l'axe x quand la poutre est debout) ; v : la troisième arête
    let ux = nz, uy = 0, uz = -nx, ul = Math.hypot(ux, uz);
    if (ul < 1e-3) { ux = 0; uy = 0; uz = 1; ul = 1; }
    ux = ux / ul * e; uz = uz / ul * e;
    const vx = (ny * uz - nz * uy) , vy = (nz * ux - nx * uz), vz = (nx * uy - ny * ux), vl = Math.hypot(vx, vy, vz) || 1, k2 = e / vl;
    const wx = vx * k2, wy = vy * k2, wz = vz * k2;
    const P = (px, py, pz, s, t) => [px + ux * s + wx * t, py + uy * s + wy * t, pz + uz * s + wz * t];
    const A = [P(ax, ay, az, -1, -1), P(ax, ay, az, 1, -1), P(ax, ay, az, 1, 1), P(ax, ay, az, -1, 1)];
    const B = [P(bx, by, bz, -1, -1), P(bx, by, bz, 1, -1), P(bx, by, bz, 1, 1), P(bx, by, bz, -1, 1)];
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; quad(A[i], A[i2], B[i2], B[i], k[i % 2]); }
    quad(B[0], B[1], B[2], B[3], k[0]);
  };
  return { boite, poutre };
}

/* Dessine les ouvrages du tronçon `tr` de la ligne `L` au niveau 1, 2 ou 3. */
export function ouvrageTroncon(g, tr, L, niveau) {
  const { boite, poutre, trait, surface, etat, j: hz, K } = g;
  const f = L.face, cote = (g.pris ? -1 : 1) * f, haut = g.prof * 0.25, x0 = tr.x0, x1 = tr.x1, premiere = L.rang === 0;
  const zc = x => ligneY(L, x), dm = x => demiLargeur(L, x);
  // Des tons qui varient d'un sac, d'une planche à l'autre (la « texture » sans image : une couleur de la palette par élément, tirée du hachage de sa position ; aucun triangle de plus)
  const tex = g.texture ?? 1;
  const tonSac = j => (!tex ? K.sac : j < 0.34 ? K.sac : j < 0.67 ? K.sac2 : K.sac3), tonBois = j => (!tex ? K.planche : j < 0.34 ? K.planche : j < 0.67 ? K.planche2 : K.madrier);
  const zp = x => zc(x) + cote * (dm(x) + 0.55);          // l'axe du parapet (du côté de l'ennemi, ou de l'autre quand le tronçon est pris)
  const zd = x => zc(x) - cote * (dm(x) + 0.55);          // l'axe du parados
  const pas = (a, b, p, fn) => { for (let x = a; x < b - 0.05; x += p) fn(x, Math.min(b, x + p), x + Math.min(p, b - x) / 2); };

  // ─── les sacs de sable ───
  if (niveau === 1) pas(x0, x1, 5, (a, b, xs) => {
    const e = etat(xs), j = hz(xs, 1), z = zp(xs), h = surface(xs, z);
    if (e === 2) boite(a, b, h, h + 0.5, z - 0.35, z + 0.35, K.sac);
    else if (e === 1) boite(a, a + (b - a) * (0.4 + 0.5 * j), h, h + 0.25, z - 0.35, z + 0.35, K.sac);
    else if (j < 0.5) boite(a + 1, a + 2.3, h, h + 0.2, z - 0.3, z + 0.3, K.sac2);
  });
  else {
    const p = niveau === 3 ? 0.9 : 1.6, assises = niveau === 3 ? 3 : 2;
    pas(x0, x1, p, (a, b, xs) => {
      const e = etat(xs), j = hz(xs * 1.7, 2), z = zp(xs), h = surface(xs, z), t = tonSac(j);
      if (e === 0) { if (j < 0.3) boite(a, b - 0.1, h, h + 0.22, z + (j - 0.15) * 3 - 0.2, z + (j - 0.15) * 3 + 0.2, K.sac2); return; }
      const a1 = 0.25 + 0.06 * j, l = b - a;
      boite(a, b, h, h + a1, z - 0.25, z + 0.25, t);
      if (tex >= 2) { boite(b - 0.03, b, h, h + a1 + 0.01, z - 0.26, z + 0.26, K.ombre); boite(a + 0.08, b - 0.08, h + a1, h + a1 + 0.012, z - 0.02, z + 0.02, K.ombre); }       // le joint avec le sac voisin, la ficelle sur le dessus
      if (tex >= 3) { boite(a - 0.03, b + 0.03, h, h + 0.09, z - 0.3, z + 0.3, K.boue); if (j > 0.72) boite(a + 0.1, a + l * 0.6, h + a1, h + a1 + 0.025, z - 0.18, z + 0.18, K.mousse); }       // la boue au pied, la mousse sur le dessus
      if (e === 2 ? j > 0.06 : j > 0.6) boite(a + l / 2, b + l / 2, h + a1, h + a1 + 0.24, z - 0.22, z + 0.22, tonSac(1 - j));
      if (assises === 3 && e === 2 && j > 0.35) boite(a + 0.1, b + 0.1, h + a1 + 0.24, h + a1 + 0.46, z - 0.19, z + 0.19, t);
      // un sac de l'assise du haut qui a glissé, à moitié dans la tranchée (niveau 3, tranchée abîmée)
      if (niveau === 3 && e === 1 && j < 0.2) { const zi = zc(xs) + cote * (dm(xs) - 0.2); boite(a, b - 0.2, surface(xs, zi), surface(xs, zi) + 0.2, zi - 0.2, zi + 0.2, K.sac2); }
    });
    // le parados : une assise basse derrière (niveau 3), intact ou à moitié seulement
    if (niveau === 3) pas(x0, x1, 1.8, (a, b, xs) => {
      const e = etat(xs), z = zd(xs), h = surface(xs, z);
      if (e === 2 || (e === 1 && hz(xs, 7) > 0.5)) boite(a, b - 0.15, h, h + 0.3, z - 0.28, z + 0.28, K.sac2);
    });
  }

  // ─── les traverses (de la terre laissée en travers) : deux par tronçon, plus basses quand la tranchée est comblée, rasées quand elle l'est tout à fait ───
  for (const x of [x0 + 6, x0 + 18]) {
    const e = etat(x), z = zc(x), h = surface(x, z);
    if (e === 0) continue;
    boite(x - 0.25, x + 0.25, h, h + (e === 2 ? 1.2 : 0.55), z - 1.5, z + 1.5, K.terre);
  }

  // ─── la banquette de tir, contre la paroi du parapet (niveaux 2 et 3) ───
  if (niveau >= 2) pas(x0, x1, 5, (a, b, xs) => {
    const e = etat(xs);
    if (e === 0 || (e === 1 && hz(xs, 3) > 0.5)) return;
    const zb = zc(xs) + cote * dm(xs), h = surface(xs, zc(xs));
    boite(a, b, h, h + (e === 2 ? 0.45 : 0.3), Math.min(zb, zb - cote * 0.55), Math.max(zb, zb - cote * 0.55), K.terre);
  });

  // ─── le boisage ───
  if (niveau === 2) {
    // des lisses le long des deux parois, des montants tous les 4 m
    pas(x0, x1, 5, (a, b, xs) => {
      const e = etat(xs);
      if (e === 0) return;
      const h = surface(xs, zc(xs));
      for (const s of [-1, 1]) { if (e === 1 && (hz(xs, 4) < 0.5) === (s > 0)) continue; const z = zc(xs) + s * (dm(xs) + 0.1); boite(a, b - 0.2, h + haut * 0.9, h + haut * 0.9 + 0.13, z - 0.07, z + 0.07, K.madrier); }
    });
    for (let x = x0 + 1; x < x1 - 1; x += 4) {
      const e = etat(x), h = surface(x, zc(x));
      for (const s of [-1, 1]) {
        const z = zc(x) + s * (dm(x) + 0.1);
        if (e === 2) boite(x - 0.1, x + 0.1, h, h + haut * 0.9, z - 0.1, z + 0.1, K.madrier);
        else if (e === 1 && hz(x, s) > 0.5) boite(x - 0.1, x + 0.1, h, h + haut * 0.4, z - 0.1, z + 0.1, K.madrier);
      }
    }
  } else if (niveau === 3) {
    // des cadres de boisage tous les 4 m : une semelle au sol, deux montants, une écharpe en diagonale ; la lisse qui les relie en haut de chaque paroi
    for (let x = x0 + 1; x < x1 - 1; x += 4) {
      const e = etat(x), zcx = zc(x), dmx = dm(x), h = surface(x, zcx), j = hz(x, 5);
      if (e === 0) {                                  // des éclats : un montant cassé au pied, une poutre couchée
        if (j < 0.6) { boite(x - 0.1, x + 0.1, h, h + 0.3, zcx + (j - 0.3) * 2 - 0.1, zcx + (j - 0.3) * 2 + 0.1, K.madrier); poutre(x - 1.2, h + 0.1, zcx - 0.4, x + 1.0, h + 0.1, zcx + 0.3, 0.07, K.madrier); }
        continue;
      }
      if (e === 2 || j > 0.4) boite(x - 0.12, x + 0.12, h, h + 0.05, zcx - dmx * 0.95, zcx + dmx * 0.95, K.planche);          // la semelle
      for (const s of [-1, 1]) {
        const z = zcx + s * (dmx + 0.1), haute = h + haut * 0.9;
        if (e === 2) { boite(x - 0.09, x + 0.09, h, haute, z - 0.09, z + 0.09, K.madrier); poutre(x - 0.1, h + 0.1, z, x + 1.5, haute - 0.05, z, 0.04, K.madrier); }       // l'écharpe
        else if ((hz(x, s + 9) > 0.5)) poutre(x, h, z, x, h + haut * 0.8, z - s * (0.45 + 0.3 * j), 0.09, K.madrier);                                                       // un montant qui a plié vers l'intérieur
        else boite(x - 0.09, x + 0.09, h, h + haut * 0.35, z - 0.09, z + 0.09, K.madrier);                                                                                  // un montant rompu
      }
    }
    pas(x0, x1, 5, (a, b, xs) => {
      const e = etat(xs);
      if (e === 0) return;
      const h = surface(xs, zc(xs));
      for (const s of [-1, 1]) {
        const z = zc(xs) + s * (dm(xs) + 0.1);
        if (e === 2) boite(a, b - 0.2, h + haut * 0.9, h + haut * 0.9 + 0.13, z - 0.07, z + 0.07, K.madrier);
        else if ((hz(xs, 4) < 0.5) === (s > 0)) poutre(a, h + haut * 0.9, z, b - 0.2, h + haut * 0.55, z, 0.06, K.madrier);       // la lisse qui pend
      }
    });
    // le clayonnage des parois : des panneaux de branches tressées, trois assises ; à moitié, des panneaux manquent, un autre pend ; comblé, quelques baguettes à terre
    pas(x0, x1, 2.5, (a, b, xs) => {
      const e = etat(xs), j = hz(xs, 11);
      if (e === 0) return;
      const h = surface(xs, zc(xs));
      for (const s of [-1, 1]) {
        const z = zc(xs) + s * (dm(xs) + 0.04), j2 = hz(xs, s * 3.3);
        if (e === 2) for (let k = 0; k < 3; k++) boite(a, b - 0.1, h + k * 0.4, h + k * 0.4 + 0.33, z - 0.04, z + 0.04, K.fascine);
        else if (j2 > 0.55) { boite(a, b - 0.1, h, h + 0.33, z - 0.04, z + 0.04, K.fascine); if (j2 > 0.8) boite(a, b - 0.1, h + 0.4, h + 0.73, z - 0.04, z + 0.04, K.fascine); }
        else if (j2 < 0.25 && j > 0.4) poutre(a, h + 0.9, z, b - 0.1, h + 0.2, z - s * 0.6, 0.05, K.fascine);
        if (e === 2 && tex >= 2) for (const u of [0.3, 0.85, 1.4, 1.95]) boite(a + u, a + u + 0.03, h, h + 1.16, z - 0.05, z + 0.05, K.ombre);       // le tressage : les montants du clayonnage
      }
    });
  }

  // ─── les échelles pour sortir de la tranchée (tous les niveaux : un montant au niveau 1, deux montants et trois barreaux au 2, cinq barreaux au 3) : contre la paroi du parapet ;
  // à moitié comblée elle penche et perd des barreaux, comblée elle gît à terre
  for (const dx of g.echelles ?? TRANCHEE_OUVRAGES.echelles) {
    const x = x0 + dx, e = etat(x), zcx = zc(x), dmx = dm(x), h = surface(x, zcx), j = hz(x, 12), zb = zcx + cote * (dmx - 0.3), zh = zcx + cote * (dmx + 0.35), top = h + haut + 0.3;
    if (e === 0) { poutre(x - 0.25, h + 0.1, zcx - 0.5, x - 0.2, h + 0.15, zcx + 1.3, 0.05, K.madrier); if (niveau > 1) poutre(x + 0.25, h + 0.1, zcx - 0.5, x + 0.3, h + 0.12, zcx + 1.3, 0.05, K.madrier); continue; }
    for (const s of niveau === 1 ? [0] : [-1, 1]) poutre(x + s * 0.25, h, zb, x + s * 0.25 + (e === 1 ? (s || 1) * 0.25 * j : 0), top, zh, niveau === 1 ? 0.12 : 0.05, K.madrier);
    const barreaux = niveau === 3 ? 5 : niveau === 2 ? 3 : 0;
    for (let k = 1; k <= barreaux; k++) { if (e === 1 && (k + Math.floor(j * 10)) % 2) continue; const u = k / (barreaux + 1); boite(x - 0.25, x + 0.25, h + (top - h) * u - 0.03, h + (top - h) * u + 0.03, zb + (zh - zb) * u - 0.04, zb + (zh - zb) * u + 0.04, K.planche); }
  }

  // ─── le fond : le caillebotis (niveaux 2 et 3), le caniveau et l'eau (3) ───
  if (niveau >= 2) {
    const p = niveau === 3 ? 0.9 : 1.5;
    pas(x0, x1, p, (a, b, xs) => {
      const e = etat(xs), j = hz(xs, 6), z = zc(xs), d = dm(xs), h = surface(xs, z);
      if (e === 0) { if (j < 0.25) boite(a, a + 0.5, h + 0.02, h + 0.07, z - d * 0.6 + j, z + d * 0.5, K.planche); return; }
      if (e === 1 && j < 0.5) return;
      boite(a, a + 0.5, h + 0.02, h + 0.09, z - d * (e === 2 ? 0.95 : 0.5), z + d * (e === 2 ? 0.95 : 0.3), tonBois(j));
      if (tex >= 2) { const zlo = z - d * (e === 2 ? 0.95 : 0.5), zhi = z + d * (e === 2 ? 0.95 : 0.3); for (const u of [0.15, 0.33]) boite(a + u, a + u + 0.02, h + 0.09, h + 0.097, zlo, zhi, K.ombre); if (tex >= 3 && hz(xs, 16) > 0.55) boite(a, a + 0.5, h + 0.09, h + 0.105, zlo + 0.2, zhi - 0.3, K.boue); }       // le grain ; la boue des bottes
    });
    if (niveau === 3) pas(x0, x1, 5, (a, b, xs) => {
      const e = etat(xs), z = zc(xs), h = surface(xs, z);
      if (e === 2) { for (const s of [-1, 1]) boite(a, b, h, h + 0.04, z + s * dm(xs) * 0.7 - 0.05, z + s * dm(xs) * 0.7 + 0.05, K.madrier); }          // deux longerons sous les planches
      if (e >= 1) { const l = e === 2 ? 5 : 2, d0 = a + (hz(xs, 8) * (5 - l)); boite(d0, d0 + l, h + 0.01, h + 0.035, z - 0.18, z + 0.18, K.eau); }    // le caniveau : l'eau qui coule au milieu, ou une flaque
    });
  }

  // ─── les ouvrages du niveau 3 : l'abri, les meurtrières, le fil téléphonique ───
  if (niveau === 3) {
    // un abri creusé dans la paroi de derrière : un huis de bois, l'ouverture noire, des sacs au-dessus
    {
      const x = x0 + 13, e = etat(x), zcx = zc(x), dmx = dm(x), h = surface(x, zcx), j = hz(x, 13), z = zcx - cote * (dmx + 0.12), sens = cote;
      if (e === 2) {
        boite(x - 0.62, x + 0.62, h, h + 1.25, Math.min(z, z + sens * 0.04), Math.max(z, z + sens * 0.04), K.ombre);
        for (const s of [-1, 1]) boite(x + s * 0.62 - 0.09, x + s * 0.62 + 0.09, h, h + 1.3, z - 0.1, z + 0.1, K.madrier);
        boite(x - 0.75, x + 0.75, h + 1.25, h + 1.4, z - 0.12, z + 0.12, K.madrier);
        boite(x - 0.85, x + 0.85, h + 1.4, h + 1.64, z - 0.3, z + 0.3, K.sac);
      } else if (e === 1) {
        boite(x - 0.71, x - 0.53, h, h + 1.3, z - 0.1, z + 0.1, K.madrier);                   // un seul montant tient
        poutre(x - 0.6, h + 1.3, z, x + 0.9 + 0.3 * j, h + 0.2, z - cote * 0.3, 0.07, K.madrier);   // le linteau a glissé
        boite(x - 0.5, x + 0.4, h, h + 0.5, z - 0.05, z + 0.05, K.ombre);
      } else if (j < 0.7) poutre(x - 1.1, h + 0.1, z - cote * 0.3, x + 1.0, h + 0.12, z - cote * 0.1, 0.07, K.madrier);
    }
    // deux plaques d'acier de meurtrière dans le parapet (un créneau entre deux plaques)
    if (premiere) for (const x of [x0 + 5, x0 + 17]) {
      const e = etat(x), z = zp(x), h = surface(x, z), j = hz(x, 14);
      if (e === 2) { boite(x - 0.7, x - 0.07, h, h + 0.85, z - 0.07, z + 0.07, K.acier); boite(x + 0.07, x + 0.7, h, h + 0.85, z - 0.07, z + 0.07, K.acier); }
      else if (e === 1 && j > 0.3) poutre(x - 0.7, h, z, x - 0.1 + 0.4 * j, h + 0.8, z + cote * 0.5, 0.05, K.acier);
    }
    // le fil téléphonique et sa lanterne : trois poteaux derrière, un fil en deux brins qui plonge au milieu ; coupé, il traîne à terre
    {
      const xs = [x0 + 3, x0 + 12.5, x0 + 22], px = xs.map(x => ({ x, z: zd(x) - cote * 0.3 })), haute = p => surface(p.x, p.z) + 2.3;
      px.forEach((p, i) => {
        const e = etat(p.x);
        if (e === 0) return;
        const h = surface(p.x, p.z);
        boite(p.x - 0.07, p.x + 0.07, h, h + 2.3, p.z - 0.07, p.z + 0.07, K.madrier);
        if (i === 1 && e === 2) { boite(p.x - 0.1, p.x + 0.1, h + 1.9, h + 2.1, p.z - 0.1 + cote * 0.25, p.z + 0.1 + cote * 0.25, K.lanterne); }
        if (i < 2) {
          const q = px[i + 1], m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }, coupe = etat(q.x) === 0 || (e === 1 && hz(p.x, 15) > 0.5);
          trait(p.x, haute(p), p.z, m.x, haute(p) - 0.35, m.z);
          if (coupe) trait(m.x, haute(p) - 0.35, m.z, m.x + 1, surface(m.x + 1, m.z) + 0.05, m.z);
          else trait(m.x, haute(p) - 0.35, m.z, q.x, haute(q), q.z);
        }
      });
    }
  }

  // ─── le fil de fer, devant les premières lignes ───
  if (premiere) {
    const etatFil = g.coupe ? 0 : 1, dz = [f * (L.amp + 6.5), f * (L.amp + 9)], k0 = etatFil ? 1 : 0.3;
    const rangs = niveau === 1 ? [dz[0]] : dz;
    for (let x = x0, n = 0; x < x1 - 0.05; x += 3, n++) {
      const xb = Math.min(x1, x + 3);
      if (!etatFil && n % 3 !== 0) continue;
      const pts = rangs.map(d => { const za = zc(x) + d, zb = zc(xb) + d; return [x, surface(x, za), za, xb, surface(xb, zb), zb]; });
      for (const [xa, ha, za, xb2, hb, zb] of pts) {
        for (const hh of (niveau === 1 ? [0.45, 0.9] : [0.35, 0.75, 1.15])) trait(xa, ha + hh * k0, za, xb2, hb + hh * k0, zb);
        if (niveau >= 2 && etatFil) boite(xa - 0.06, xa + 0.06, ha, ha + 1.3, za - 0.06, za + 0.06, K.madrier);
        // les rouleaux (niveau 3) : un anneau de fil enroulé tous les 3 m, relié au suivant
        if (niveau === 3 && etatFil) {
          const r = 0.42, cy = ha + r, N = 6;
          for (let q = 0; q < N; q++) {
            const a = q / N * 6.2832, b = (q + 1) / N * 6.2832;
            trait(xa, cy + Math.sin(a) * r, za + Math.cos(a) * r, xa, cy + Math.sin(b) * r, za + Math.cos(b) * r);
            trait(xa, cy + Math.sin(a) * r, za + Math.cos(a) * r, xb2, hb + r + Math.sin(a + 0.8) * r, zb + Math.cos(a + 0.8) * r);
          }
        }
      }
      if (niveau >= 2 && etatFil) {
        const [a, b] = pts;
        if (b) { trait(a[0], a[1] + 1.15, a[2], b[3], b[4] + 0.35, b[5]); trait(a[3], a[4] + 1.15, a[5], b[0], b[1] + 0.35, b[2]); trait(a[0], a[1] + 0.35, a[2], b[3], b[4] + 1.15, b[5]); trait(a[3], a[4] + 0.35, a[5], b[0], b[1] + 1.15, b[2]); }
      }
    }
  }
}

/* Le coût d'un niveau, mesuré sur un tronçon droit à plat (sans le sol ni les soldats) : { boites, traits, triangles, ms } pour `n` tronçons dans l'état `etat`
   (2 intact, 1 abîmé, 0 détruit). Le même résultat dans Node et dans le labo (`ms` : le temps de construction de la géométrie seulement). */
export function mesurerNiveau(niveau, etat, n = 1, now = () => 0, echelles = undefined, texture = undefined) {
  const compte = { sommets: 0, traits: 0 };
  const { boite, poutre } = primitives(() => { compte.sommets += 6; });
  const K = Object.fromEntries(['sac', 'sac2', 'sac3', 'planche2', 'boue', 'mousse', 'planche', 'madrier', 'terre', 'fascine', 'acier', 'eau', 'ombre', 'lanterne'].map(k => [k, [0, 0]]));
  const L = { camp: 0, rang: 0, y0: 100, amp: 1.5, phase: 1.234, face: -1 };
  const g = { boite, poutre, trait: () => { compte.traits++; }, surface: () => 0, etat: () => etat, j: (a, b) => { const q = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return q - Math.floor(q); }, K, prof: 6, pris: false, coupe: false, echelles, texture };
  const t0 = now();
  for (let k = 0; k < n; k++) ouvrageTroncon(g, { x0: k * 25, x1: k * 25 + 25 }, L, niveau);
  return { triangles: compte.sommets / 3, traits: compte.traits, ms: now() - t0 };
}
