// Les amas d'un régiment (Jérôme, v0.114.1 : « des soldats bloqués dans une tranchée ennemie, leur pastille dans ma tranchée »).
// Un régiment dont les hommes se sont scindés (une poche chez l'ennemi, des égarés, une relève en route) n'a plus UN endroit : il en a plusieurs.
export const AMAS = {
  cellule: 20,        // m : deux hommes à moins de cette distance (de case en case, voisines comprises) sont du même amas
  isole: 6,           // hommes : à partir de là, un amas à part du gros a sa pastille, son nom sur le champ et son chemin
};
