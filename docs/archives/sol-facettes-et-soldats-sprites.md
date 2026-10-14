# Sol à facettes et soldats en sprites (labo, v0.1.1) — non retenus

Deux variantes essayées dans le labo en v0.1.1, à la demande de Jérôme (« des
blocs plus organiques ? des soldats en sprites ? »). Jérôme a retenu les
variantes A, l'actuel : le sol en cubes et les soldats en boîtes (v0.2.0). Le
code est dans le commit `c22e1cb` (`js/rendu3d.js`, `js/data/soldats.js`).

## Sol à facettes

Un sommet à chaque coin de case, à la hauteur moyenne des quatre cases qui le
touchent (hauteur logique, au quart) ; par carrés de 5 m, grossiers (un seul
quadrilatère) sauf là où un obus a touché (un quadrilatère par case), le bord
d'un carré fin raccordé à la droite de son voisin grossier ; chaque facette à
l'ombre (tramée dans l'entre-deux) prend la couleur de la paroi.

Mesures (Chromium sans carte graphique, dessin attendu jusqu'au bout, zoom 4) :
autant que les cubes en début de partie ; après trois jours d'obus, 29 500
triangles et 20 ms contre 19 500 et 15,5 ms pour les cubes. La trame des pentes
faisait beaucoup de bruit le troisième jour.

## Soldats en sprites

Un quadrilatère par soldat, de la taille exacte du dessin, posé par le pied sur
un pixel entier ; un atlas d'octets (palette, couleur du camp, casque) ; trois
tailles selon le zoom, l'arrêt et deux pas ; le camp se lisait à la forme du
casque (à cimier, ou descendant sur les oreilles). Coût : le même que les
boîtes (la simulation domine). À reprendre si l'on veut des poses (couché, tir,
chute, corps) et un atelier de dessin des soldats.
