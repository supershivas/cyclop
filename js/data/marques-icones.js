// Les icônes des marques (Jérôme, v0.37.0) : 9 × 9 cases, une lettre par couleur de la palette (`t` terre : l'encre ; `s` boue sombre : l'ombre d'un cran),
// `.` pour le vide (conventions §12 : le dessin est de la donnée lisible). Le cadre (rond, arche, carré, écusson, losange, stèle, octogone) est dessiné
// par `hud/marques.js` : c'est lui qui porte la famille. `SIGLES` : la variante « sigles » du labo (deux lettres dans le même cadre).
export const ICONES = {
  bapteme: [
    '....t....', '...tt....', '..ttt....', '..tttt...', '.tttstt..', '.ttsstt..', '.ttsstt..', '..tttt...', '.........'],
  souffle: [
    '.....ttt.', '....t...t', '...t....t', '..t....tt', '.t.....t.', 't.....t..', 't...tt...', 'tttt.....', '.........'],
  deterre: [
    '......t..', '.....t...', '....t....', '...t.....', '..ttt....', '.ttttt...', 'tttttttt.', 'ttttttttt', '.........'],
  bras: [
    '........t', 'ttt.....t', 'tttttt..t', '.tsstttt.', '..tsttt..', '...tt.t..', '..t.....t', '.t.......', '.........'],
  jambe: [
    '...tt...t', '...tt..t.', '...tt.t..', '...tttt..', '...ttt...', '..tt.tt..', '.tt...tt.', '.ttt.....', '.........'],
  tete: [
    '...ttt...', '..t.t.t..', '.tt.t.tt.', '.t..tt.t.', '.ttttttt.', '..t.t.t..', '...ttt...', '.........', '.........'],
  'revenu-deux': [
    '.tt......', 't.ttt....', '.tt..t...', '.....t...', '..tt.....', '.t.ttt...', '..tt..t..', '......t..', '....ttt..'],
  'a-pied': [
    '..tt.....', '..tt.....', '...t.....', '..ttt....', '.t.t.t...', '...t.....', '..t.t....', '.t...t...', '.t...tt..'],
  'premier-jour': [
    '....t....', '....t....', '....t....', '....t....', '....t....', '....t....', '....t....', 'ttttttttt', '.........'],
  'cinq-jours': [
    '.........', 't.t.t.t.t', 't.t.t.t.t', 't.t.t.t.t', 't.t.t.t.t', 't.t.t.t.t', 'ttttttttt', '.........', '.........'],
  pluies: [
    '.t...t...', '.t...t..t', 't...t..t.', 't..t..t..', '..t..t...', '.t..t....', '.t.......', '.........', '.........'],
  gel: [
    '....t....', '.t..t..t.', '..t.t.t..', '...ttt...', 'ttttsttt.', '...ttt...', '..t.t.t..', '.t..t..t.', '....t....'],
  'dernier-jour': [
    '....t....', '..t.t.t..', '...ttt...', '.ttttttt.', 'ttttttttt', 'sssssssss', 'ttttttttt', '.........', '.........'],
  pelle: [
    '......t..', '.....t...', '....t....', '...t.....', '..ttt....', '.ttttt...', '.ttttt...', '..ttt....', '.........'],
  brancard: [
    '.........', '.........', 'ttttttttt', 't.......t', 'tsssssst.', '.t.....t.', 't.......t', '.........', '.........'],
  porteur: [
    '....t....', '...ttt...', '....t....', '....t....', '....t....', '.........', 'tt..t..tt', '.tttttt..', '.........'],
  soupe: [
    '..t.t.t..', '.t.t.t...', '.........', 'ttttttttt', 'tsssssst.', '.tsssst..', '..tttt...', '.........', '.........'],
  'coup-de-main': [
    '.........', 'tt.......', 'ttt.tt.tt', '.tt.t..t.', '..tt.t...', '...ttt...', '..t..tt..', '.t....tt.', '.........'],
  'entre-premier': [
    'ttt......', 't.t......', 't.tt.....', 't.t.t....', 't.t..t...', 't.t.tt...', 't.tt.....', 'ttt......', '.........'],
  'tenu-seul': [
    't.......t', 't.......t', 't...t...t', 't..ttt..t', 't...t...t', 't..t.t..t', 't.......t', 'ttttttttt', '.........'],
  repris: [
    'ttttttttt', 't.......t', 't.ttttt.t', 't.t...t.t', 't.t.t.t.t', 't.t...t.t', 't.......t', 'ttttttttt', '.........'],
  circonstance: [
    '.........', '....t....', '...ttt...', '..ttttt..', '.........', '....t....', '...ttt...', '..ttttt..', '.........'],
  regiment: [
    't........', 'tttt.....', 'tttttt...', 'ttttttt..', 'tttttt...', 'tttt.....', 't........', 't........', 't........'],
  cite: [
    'ttttttt..', 't.....tt.', 't.ttt..tt', 't.....t.t', 't.ttt.t.t', 't.....ttt', 't.ttt..t.', 't.....t..', 'ttttttt..'],
  tremble: [
    '.t..t..t.', '..t..t..t', '.t..t..t.', '..tttt...', '.tt..tt..', '.t....t..', '.ttttt...', '.........', '.........'],
  'pas-reflue': [
    '....t....', '...ttt...', '....t....', '...t.t...', '...t.t...', '...t.t...', 'ttttttttt', '.........', '.........'],
  rallie: [
    '..tttt...', '.t....t..', 't......t.', 't....tttt', 't.....tt.', 't......t.', '.t....t..', '..tttt...', '.........'],
  'jour-refuse': [
    '.........', '.........', '.....t...', 'ttttttt..', 'ttttttt..', '.....tt..', '.....t...', 'ttttttttt', '.........'],
  douze: [
    't.t.t.t.t', '.........', 't.t.t.t.t', '.........', 't.t.t.t.t', '.........', '.........', '.........', '.........'],
  enterre: [
    '....t....', '....t....', '..ttttt..', '....t....', '....t....', '....t....', '.........', 'ttttttttt', 'sssssssss'],
  entonnoir: [
    '.........', '.........', '.........', 'tt.....tt', 'ttt...ttt', '.ttt.ttt.', '..ttttt..', 'sssssssss', '.........'],
  'fusil-1': [
    '.........', '.........', '.........', '....t....', '...ttt...', '....t....', '.........', '.........', '.........'],
  'fusil-3': [
    '.........', '.........', '.........', '.t..t..t.', '.........', '.........', '.........', '.........', '.........'],
  'fusil-5': [
    '.........', '.t.....t.', '.........', '....t....', '.........', '.t.....t.', '.........', '.........', '.........'],
  'grade-abattu': [
    '.........', 'tt.....tt', '.tt...tt.', '..tt.tt..', '...ttt...', '..tt.tt..', '.tt...tt.', 'tt.....tt', '.........'],
};
// la variante « sigles » : deux lettres, dans le même cadre
export const SIGLES = {
  bapteme: 'Bf', souffle: 'Sb', deterre: 'Dé', bras: 'Mb', jambe: 'Mj', tete: 'Mt', 'revenu-deux': '2R', 'a-pied': 'Ap', 'premier-jour': '1j',
  'cinq-jours': '5j', pluies: '3p', gel: 'Gl', 'dernier-jour': 'Dj', pelle: 'Pp', brancard: 'Br', porteur: 'Pt', soupe: 'So', 'coup-de-main': 'Cm',
  'entre-premier': 'Ep', 'tenu-seul': 'Ts', repris: 'Rp', circonstance: 'Gc', regiment: 'Rg', cite: 'Ci', tremble: 'Tr', 'pas-reflue': 'Pr',
  rallie: 'Ra', 'jour-refuse': 'Jr', douze: '12', enterre: 'En', entonnoir: 'Eo', 'fusil-1': '·', 'fusil-3': '3·', 'fusil-5': '5·', 'grade-abattu': 'Ga',
};
