// Le rendu WebGL2 du labo lumière. Il LIT le terrain, la lumière (une texture RGBA8, une case = un texel) et la foule ; il ne modifie jamais l'état.
// Passes : 1) la scène dans un tampon (couleur + profondeur) : sol, toits, soldats, débris, fumée, pluie ;
//          2) l'AO écran (étape 8), si demandée ;  3) la composition à l'écran : ciel, fondu avec la distance, brume au sol (étape 5), AO écran, écran partagé.
// Chaque étape de lumière est un interrupteur de nuanceur (`cfg.etapes`), jamais une autre version du code : c'est ce qui rend « tout activé / tout désactivé » instantané.
import { MONDE, ATMOSPHERE, CAMERA, NUAGES, HORS_CARTE } from './config.js?v=0.122.0';
import { MAT } from './terrain.js?v=0.122.0';
import { FLOATS, construireChunk, creerTampons } from './maillage.js?v=0.122.0';
import { matrices } from './camera.js?v=0.122.0';
import * as REELS from './soldats-reels.js?v=0.122.0';
import { COULEURS_MATIERES, COUL } from './ciel.js?v=0.122.0';

const GLSL_COMMUN = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uLight; uniform vec2 uGrid; uniform float uCell;
uniform vec3 uSunDir, uSunCol, uSkyAmb, uGroundAmb, uSkyH, uSkyZ, uCam;
uniform vec4 uS;            // 1 directe, 2 AO, 4 propagée, 7 météo (0 ou 1)
uniform float uWet, uExpo, uNuit;
uniform int uFlashN; uniform vec4 uFlashA[8]; uniform vec4 uFlashB[8];
uniform vec4 uNuage;                 // couverture, décalage x, décalage z (m), échelle (1/m)
uniform float uNuageH, uNeige, uVent, uTemps; uniform vec3 uSnow;
vec4 gS; float gL;                   // les interrupteurs d'étapes de CE pixel (l'écran partagé en a deux jeux) ; gL : les lampes
uniform sampler2D uLamp; uniform float uLampOn; uniform vec3 uLampCol;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
// la densité du ciel au point q (mètres) du plan des nuages : la même fonction fait les nuages du ciel et leur ombre au sol
float nuageAt(vec2 q) { vec2 p = (q + uNuage.yz) * uNuage.w; float n = vn(p) * .55 + vn(p * 2.1 + 7.) * .3 + vn(p * 4.3 + 3.) * .15; float c = 1. - uNuage.x * 1.1; return smoothstep(c, c + .3, n); }
vec3 ciel(vec3 d) { float t = clamp(d.y, 0., 1.); vec3 c = mix(uSkyH, uSkyZ, pow(t, .55)); c += uSunCol * pow(max(dot(d, uSunDir), 0.), 28.) * .22; return c; }
vec3 finir(vec3 c) { c *= uExpo; c = c / (1. + c * .22); return pow(clamp(c, 0., 1.), vec3(1. / 2.2)); }
vec3 eclairer(vec3 alb, vec3 N, vec3 P, vec4 Ld, float ao, float under, float mud, float pudFlat) {
  float wet = gS.w > .5 ? uWet : 0.;
  if (gS.w > .5) alb = mix(alb, uSnow, uNeige * smoothstep(.55, .95, N.y) * .8);          // la neige blanchit ce qui regarde le ciel
  alb *= 1. - .5 * wet * mud;                                              // la boue mouillée est plus sombre
  float nl = max(dot(N, uSunDir), 0.);
  vec3 hemi = mix(uGroundAmb, uSkyAmb, N.y * .5 + .5);
  float aoF = gS.y > .5 ? ao * (.3 + .7 * pow(Ld.g, 1.3)) : 1.;
  vec3 sun = vec3(0.), amb;
  if (gS.x > .5) { sun = uSunCol * nl * Ld.r; amb = hemi * aoF; if (gS.w > .5) sun *= 1. - .72 * nuageAt(P.xz + uSunDir.xz / max(uSunDir.y, .08) * uNuageH); }      // l'ombre d'un nuage
  else amb = vec3(.62 + .38 * max(dot(N, normalize(vec3(-.4, .8, .45))), 0.)) * .8 * aoF;   // plat : seule la forme des cubes se lit
  if (gS.z > .5 && under > .5) { float fl = Ld.b; sun = vec3(0.); amb *= fl * fl; }       // sous un toit : le soleil n'entre pas, la lumière se propage
  vec3 col = alb * (sun + amb);
  vec3 V = normalize(uCam - P);
  if (wet > 0.) {                                                          // boue brillante, flaques qui reflètent le ciel
    float thr = 1. - .85 * wet, pud = smoothstep(thr, thr + .25, Ld.a) * pudFlat * step(.01, wet);
    vec3 H = normalize(V + uSunDir);
    float spec = pow(max(dot(N, H), 0.), mix(10., 110., wet)) * (.12 * mud + .9 * pud) * wet * (gS.x > .5 ? Ld.r : 1.) * step(.01, nl);
    float fres = .15 + .85 * pow(1. - max(dot(N, V), 0.), 4.);
    vec3 refl = ciel(reflect(-V, N)) * (.35 + .65 * fres);
    col = mix(col, refl * .85, pud * .8) + uSunCol * spec;
    if (under > .5 && gS.z > .5) col = mix(col, alb * amb, pud);
  }
  for (int k = 0; k < 8; k++) {                                            // les lumières temporaires (étape 6)
    if (k >= uFlashN) break;
    vec3 d = uFlashA[k].xyz - P; float dist = length(d), a = clamp(1. - dist / uFlashA[k].w, 0., 1.);
    col += alb * uFlashB[k].rgb * (a * a * (max(dot(N, d / max(dist, .001)), 0.) * .8 + .2) * uFlashB[k].a);
  }
  if (gL > .5) {                                                           // les lanternes et les lampes : une couche de la grille, cachée par le relief (lampes.js)
    vec2 spl = (P.xz + N.xz * .5 * uCell) / uCell;
    if (spl.x > 0. && spl.y > 0. && spl.x < uGrid.x && spl.y < uGrid.y) {
      float lm = texture(uLamp, spl / uGrid).r, fl = 1. + .08 * sin(uTemps * 11. + h21(floor(spl)) * 40.);
      col += alb * uLampCol * lm * (.45 + .55 * N.y) * 2.2 * fl * (.18 + .82 * uNuit);       // par grand jour, une flamme ne se voit presque pas
    }
  }
  return col;
}`;

const VS_SOL = `${GLSL_COMMUN}
layout(location = 0) in vec3 aPos; layout(location = 1) in vec4 aA; layout(location = 2) in float aUnder;
uniform mat4 uVP;
out vec3 vP; flat out vec3 vN; out float vAO, vVar; flat out float vMat, vUnder;
const vec3 NORM[6] = vec3[6](vec3(0, 1, 0), vec3(0, -1, 0), vec3(1, 0, 0), vec3(-1, 0, 0), vec3(0, 0, 1), vec3(0, 0, -1));
void main() { vP = aPos; vN = NORM[int(aA.z + .5)]; vAO = aA.x; vVar = aA.y; vMat = aA.w; vUnder = aUnder; gl_Position = uVP * vec4(aPos, 1.); }`;
const FS_SOL = `${GLSL_COMMUN}
uniform vec3 uMat[8]; uniform float uAlpha;
in vec3 vP; flat in vec3 vN; in float vAO, vVar; flat in float vMat, vUnder;
out vec4 o;
void main() {
  gS = uS; gL = uLampOn;
  vec3 N = normalize(vN);
  vec3 alb = uMat[int(vMat + .5)] * (1. + (vVar - .5) * .2);
  vec2 sp = (vP.xz + N.xz * .5 * uCell) / uCell;
  vec4 Ld = texture(uLight, sp / uGrid);
  float mud = (vMat > .5 && vMat < 3.5) ? 1. : .2;
  vec3 c = eclairer(alb, N, vP, Ld, vAO, vUnder, mud, smoothstep(.85, .98, N.y));
  o = vec4(finir(c), uAlpha);
}`;

const VS_SOLDATS = `${GLSL_COMMUN}
layout(location = 0) in vec2 aXZ; layout(location = 1) in float aCamp; layout(location = 2) in float aHide;
uniform mat4 uVP; uniform sampler2D uHF;
out vec3 vP; flat out float vCamp;
void main() {
  if (aHide > .5) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }           // cet homme est dessiné en volume (la boîte, la silhouette, l'équipé, l'articulé)
  ivec2 c = ivec2(floor(aXZ / uCell));
  float h = texelFetch(uHF, clamp(c, ivec2(0), ivec2(uGrid) - 1), 0).r;
  vP = vec3(aXZ.x, h + 1.2, aXZ.y);                                        // le point du jeu (rendu/shaders.js, pointMat) : deux pixels, l'homme sur son ombre
  gl_Position = uVP * vec4(vP, 1.);
  gl_PointSize = 2.; vCamp = aCamp;
}`;
const FS_SOLDATS = `${GLSL_COMMUN}
uniform vec3 uNous, uEux, uOmbre;
in vec3 vP; flat in float vCamp;
out vec4 o;
void main() {
  gS = uS; gL = uLampOn;
  if (gl_PointCoord.y > .5) { o = vec4(finir(uOmbre * .8), 1.); return; }
  vec3 alb = vCamp > .5 ? uEux : uNous;
  vec4 Ld = texture(uLight, vP.xz / uCell / uGrid);
  vec3 c = eclairer(alb * .62, vec3(0, 1, 0), vP, Ld, 1., 0., 0., 0.);
  o = vec4(finir(c), 1.);
}`;

const VS_PARTS = `${GLSL_COMMUN}
layout(location = 0) in vec3 aPos; layout(location = 1) in vec3 aA;
uniform mat4 uVP; uniform float uPx1;
out vec3 vP; flat out float vGenre, vAlpha, vSize;
void main() { vP = aPos; gl_Position = uVP * vec4(aPos, 1.); vSize = max(aA.x * uPx1 / gl_Position.w, 1.5); gl_PointSize = min(vSize, 900.); vGenre = aA.y; vAlpha = aA.z * (aA.y < .5 ? 1. : clamp((gl_Position.w - 3.) / 9., 0., 1.)); }`;
const FS_PARTS = `${GLSL_COMMUN}
uniform vec3 uMat[8];
in vec3 vP; flat in float vGenre, vAlpha, vSize;
out vec4 o;
void main() {
  gS = uS; gL = uLampOn; vec2 p = gl_PointCoord - .5; float d = length(p) * 2.;
  vec4 Ld = texture(uLight, vP.xz / uCell / uGrid);
  if (vGenre < .5) {
    vec3 c = eclairer(uMat[2], vec3(0, 1, 0), vP, Ld, 1., 0., 0., 0.);
    o = vec4(finir(c), 1.); return;
  }
  float a = vAlpha * (1. - smoothstep(.2, 1., d)); if (a < .01 || d > 1.) discard;
  vec3 alb = vGenre < 1.5 ? vec3(.07, .065, .06) + uMat[0] * .0 : uMat[0] * .8;    // fumée sombre, poussière claire
  vec3 c = alb * (uSunCol * .5 * (gS.x > .5 ? Ld.r : 1.) + uSkyAmb * 1.1);
  for (int k = 0; k < 8; k++) { if (k >= uFlashN) break; vec3 dd = uFlashA[k].xyz - vP; float dist = length(dd), f = clamp(1. - dist / uFlashA[k].w, 0., 1.); c += alb * uFlashB[k].rgb * f * f * uFlashB[k].a * .8; }
  o = vec4(finir(c), a);
}`;

const VS_PLUIE = `${GLSL_COMMUN}
uniform mat4 uVP; uniform float uT; uniform vec3 uCentre;
out float vA;
float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  int id = gl_VertexID >> 1; float f = float(id), bout = float(gl_VertexID & 1);
  vec3 p = uCentre + vec3((h(f) - .5) * 120., 0., (h(f + .37) - .5) * 120.);
  float y = fract(h(f + .71) - uT * (.55 + .2 * h(f + 2.))) * 55.;
  p.y = y + bout * 1.6; p.x += bout * (.15 + .06 * uVent);
  vA = (1. - bout) * .5 + .15; gl_Position = uVP * vec4(p, 1.);
}`;
const FS_PLUIE = `${GLSL_COMMUN}
in float vA; out vec4 o;
void main() { o = vec4(finir(uSkyH * 1.3 + .1), vA * .55); }`;

const VS_NEIGE = `${GLSL_COMMUN}
uniform mat4 uVP; uniform vec3 uCentre;
float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  float f = float(gl_VertexID);
  vec3 p = uCentre + vec3((h(f) - .5) * 120., 0., (h(f + .37) - .5) * 120.);
  p.y = fract(h(f + .71) - uTemps * (.03 + .015 * h(f + 2.))) * 55.;
  p.x += sin(uTemps * .8 + f) * 1.5 + uVent * p.y * .12; p.z += cos(uTemps * .6 + f * 1.3) * 1.2;
  gl_Position = uVP * vec4(p, 1.); gl_PointSize = 2. + 1.5 * step(.8, h(f + 5.));
}`;
const FS_NEIGE = `${GLSL_COMMUN}
out vec4 o; void main() { o = vec4(finir(uSnow * 1.6 + .15), .85); }`;

const VS_LUEURS = `${GLSL_COMMUN}
layout(location = 0) in vec3 aPos; layout(location = 1) in vec2 aA;
uniform mat4 uVP; uniform float uPx1;
out float vPh; out float vTaille;
void main() { gl_Position = uVP * vec4(aPos, 1.); vTaille = clamp(aA.x * uPx1 / gl_Position.w, 2., 26.); gl_PointSize = vTaille; vPh = aA.y; }`;
const FS_LUEURS = `${GLSL_COMMUN}
in float vPh; in float vTaille; out vec4 o;
void main() { float d = length(gl_PointCoord - .5) * 2.; if (d > 1.) discard; float f = (1. - d); f = f * f * (.85 + .15 * sin(uTemps * 9. + vPh * 6.)); o = vec4(uLampCol * 1.6 * f, f * (.3 + .7 * uNuit)); }`;

const VS_PLEIN = `#version 300 es
out vec2 uv; void main() { vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.); uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FS_SSAO = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 uv; out vec4 o;
uniform sampler2D uDepth; uniform mat4 uInvP, uP; uniform vec2 uTexel; uniform float uRayon; uniform int uN;
vec3 vp(vec2 c) { float d = texture(uDepth, c).r; vec4 p = uInvP * vec4(c * 2. - 1., d * 2. - 1., 1.); return p.xyz / p.w; }
void main() {
  if (texture(uDepth, uv).r >= .9999) { o = vec4(1.); return; }
  vec3 p = vp(uv), a = vp(uv + vec2(uTexel.x, 0.)), b = vp(uv - vec2(uTexel.x, 0.)), c = vp(uv + vec2(0., uTexel.y)), d = vp(uv - vec2(0., uTexel.y));
  vec3 dx = abs(a.z - p.z) < abs(p.z - b.z) ? a - p : p - b, dy = abs(c.z - p.z) < abs(p.z - d.z) ? c - p : p - d;
  vec3 n = normalize(cross(dx, dy)); if (n.z < 0.) n = -n;
  vec3 t = normalize(cross(n, abs(n.y) < .99 ? vec3(0, 1, 0) : vec3(1, 0, 0))), bt = cross(n, t);
  float ang = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  float occ = 0.;
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    float fi = float(i), r = sqrt((fi + .5) / float(uN)), ph = ang + fi * 2.399963;
    vec3 s = vec3(cos(ph) * r, sin(ph) * r, sqrt(max(1. - r * r, 0.)));
    vec3 sp = p + (t * s.x + bt * s.y + n * s.z) * uRayon * mix(.3, 1., fract(fi * .618));
    vec4 q = uP * vec4(sp, 1.); vec2 suv = q.xy / q.w * .5 + .5;
    if (suv.x < 0. || suv.y < 0. || suv.x > 1. || suv.y > 1.) continue;
    float sd = vp(suv).z, dz = abs(p.z - sd);
    occ += (sd >= sp.z + .04 ? 1. : 0.) * smoothstep(0., 1., uRayon / max(dz, .001));
  }
  o = vec4(vec3(clamp(1. - occ / float(uN) * 1.5, 0., 1.)), 1.);
}`;
const FS_FLOU = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 uv; out vec4 o; uniform sampler2D uAO; uniform vec2 uTexel;
void main() { float s = 0.; for (int j = -2; j < 2; j++) for (int i = -2; i < 2; i++) s += texture(uAO, uv + (vec2(i, j) + .5) * uTexel).r; o = vec4(vec3(s / 16.), 1.); }`;

const FS_COMPO = `${GLSL_COMMUN}
in vec2 uv; out vec4 o;
uniform sampler2D uColor, uDepth, uAOtex; uniform mat4 uInvVP; uniform vec3 uLuneDir, uNuageCoul; uniform vec4 uHors; uniform float uBordY, uEtoiles;
uniform vec3 uMat[8];
uniform float uFocus, uFondu, uSplit, uAOon, uBrumeOn, uBrumeD, uBrumeK; uniform vec3 uBrumeCoul;
// le ciel : dégradé, soleil, lune, étoiles, nuages qui dérivent (ils se lisent sur le même champ que leur ombre au sol)
vec3 cielComplet(vec3 rd) {
  vec3 c = ciel(rd);
  if (rd.y > .0) {
    c += uSunCol * smoothstep(.9994, .9998, dot(rd, uSunDir)) * 2.;                       // le disque du soleil
    if (uEtoiles > .01) {
      vec2 g = rd.xz / (rd.y + .25) * 70.; float hh = h21(floor(g)), dd = length(fract(g) - .5);
      c += vec3(.8, .85, .9) * step(.985, hh) * smoothstep(.3, .05, dd) * (.55 + .45 * sin(uTemps * 3. + hh * 60.)) * uEtoiles * 1.6;
      c += vec3(.9, .9, .82) * smoothstep(.9985, .9992, dot(rd, uLuneDir)) * 1.4 * uEtoiles;       // la lune
    }
    float t = (uNuageH - uCam.y) / max(rd.y, .001);
    float d = nuageAt(uCam.xz + rd.xz * t) * smoothstep(.0, .16, rd.y);
    c = mix(c, uNuageCoul * (1. + uSunCol * .25) , d * .88);
  }
  return c;
}
// le faux terrain : un sol qui se prolonge jusqu'à l'horizon (la carte est un plateau de la même matière) ; du bruit, des plages d'herbe, de glaise et de boue, un relief qui ne sert qu'à l'ombrage
float relief(vec2 q) { return vn(q * .35) * .6 + vn(q * .9 + 5.) * .3 + vn(q * 2.3) * .1; }
vec3 horsCarte(vec3 rd) {
  float t = (uBordY - uCam.y) / rd.y; vec3 P = uCam + rd * t;
  vec2 q = P.xz / uHors.x; float n1 = vn(q * .35), n2 = vn(q * 1.2 + 4.), n3 = vn(q * 3.1 + 9.), n4 = vn(q * 9. + 2.);
  vec3 alb = mix(uMat[0], uMat[1], smoothstep(.42, .66, n1));
  alb = mix(alb, uMat[3], smoothstep(.55, .85, n2) * .65);
  alb = mix(alb, uMat[6], smoothstep(.62, .85, n3) * .45);
  alb *= .88 + .24 * n4;                                                      // du grain
  vec2 e = vec2(.4, 0.);
  vec3 N = normalize(vec3(-(relief(q + e.xy) - relief(q - e.xy)) * uHors.y, 1., -(relief(q + e.yx) - relief(q - e.yx)) * uHors.y));
  float terre = smoothstep(.5, .75, n2);
  return eclairer(alb, N, P, vec4(1., 1., 1., 0.), 1., 0., terre, 1.);
}
void main() {
  bool off = uv.x < uSplit;
  gS = off ? vec4(0.) : uS; gL = off ? 0. : uLampOn;
  float dp = texture(uDepth, uv).r;
  vec4 w = uInvVP * vec4(uv * 2. - 1., dp * 2. - 1., 1.); vec3 P = w.xyz / w.w;
  vec3 rd = normalize(P - uCam); float dist = length(P - uCam);
  vec3 hz = finir(uSkyH);
  vec3 col;
  if (dp >= .9999) {
    if (rd.y < -.0015) {                                                       // sous l'horizon : le faux terrain, qui se perd dans la brume
      col = finir(horsCarte(rd));
      float t = (uBordY - uCam.y) / rd.y;
      col = mix(col, hz, 1. - exp(-max(t - uFocus, 0.) * uFondu * .5));
      dist = t;
    } else col = finir(cielComplet(rd));
  } else {
    col = texture(uColor, uv).rgb;
    if (!off && uAOon > .5) col *= texture(uAOtex, uv).r;
    col = mix(col, hz, 1. - exp(-max(dist - uFocus, 0.) * uFondu));        // le fondu avec la distance (toujours là) : il ne commence qu'au-delà du point visé
  }
  if (!off && uBrumeOn > .5) {                                              // la brume au sol : épaisse en bas, légère en haut (intégrale exacte le long du rayon)
    float k = uBrumeK, ry = abs(rd.y) < .002 ? .002 * sign(rd.y + 1e-6) : rd.y;
    float dens = uBrumeD * exp(-k * uCam.y) * (1. - exp(-k * ry * dist)) / (k * ry);
    if (dp >= .9999 && rd.y >= -.0015) dens = uBrumeD * exp(-k * uCam.y) / k * (.12 + .5 * smoothstep(.12, .0, rd.y));        // le ciel bas : de la brume seulement près de l'horizon
    col = mix(col, finir(uBrumeCoul), 1. - exp(-dens));
  }
  o = vec4(col, 1.);
}`;

function programme(gl, vs, fs, nom) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${nom} : ${gl.getShaderInfoLog(s)}`); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${nom} : ${gl.getProgramInfoLog(p)}`);
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

export function creerRendu(canvas) {
  let M, L, F;                                  // le monde, la lumière, la foule : reliés par `relier` (une autre grille = un autre monde)
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 indisponible');
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const info = { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
  info.logiciel = /swiftshader|llvmpipe|software|softpipe/i.test(info.renderer);
  const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  info.chronoGPU = !!tq;

  const progs = {
    sol: programme(gl, VS_SOL, FS_SOL, 'sol'), soldats: programme(gl, VS_SOLDATS, FS_SOLDATS, 'soldats'), parts: programme(gl, VS_PARTS, FS_PARTS, 'particules'),
    pluie: programme(gl, VS_PLUIE, FS_PLUIE, 'pluie'), neige: programme(gl, VS_NEIGE, FS_NEIGE, 'neige'), lueurs: programme(gl, VS_LUEURS, FS_LUEURS, 'lueurs'), reels: programme(gl, REELS.glslVert(), REELS.glslFrag(GLSL_COMMUN), 'soldats articulés'), jeu: programme(gl, REELS.glslVertJeu(), REELS.glslFragJeu(GLSL_COMMUN), 'soldats du jeu'), ssao: programme(gl, VS_PLEIN, FS_SSAO, 'ssao'), flou: programme(gl, VS_PLEIN, FS_FLOU, 'flou'), compo: programme(gl, VS_PLEIN, FS_COMPO, 'composition'),
  };
  const R = { gl, info, stats: { triangles: 0, appels: 0 }, gpu: { scene: null, ssao: null, composition: null }, largeur: 1, hauteur: 1 };

  // ─── les textures de données : la lumière (RGBA8) et les hauteurs (R32F), une case = un texel ───
  let texLamp = null, texLum = null, texHF = null, tampons = null, chunks = [], vaoS = null, vboS = null, vboC = null, vboH = null, masqueSale = true;
  const reglerTex = (t, fmt, interne, type, data, filtre) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, interne, M.W, M.H, 0, fmt, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtre); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtre);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  // relier : (re)crée tout ce qui dépend de la taille de la grille
  let LA = null;
  R.relier = (M2, L2, F2, A2) => {
    for (const c of chunks) if (c) for (const k of ['sol', 'toit']) if (c[k].vao) { gl.deleteVertexArray(c[k].vao); gl.deleteBuffer(c[k].vbo); gl.deleteBuffer(c[k].ibo); }
    for (const t of [texLamp, texLum, texHF]) if (t) gl.deleteTexture(t);
    if (vaoS) { gl.deleteVertexArray(vaoS); gl.deleteBuffer(vboS); gl.deleteBuffer(vboC); gl.deleteBuffer(vboH); }
    M = M2; L = L2; F = F2; LA = A2;
    texLum = gl.createTexture(); texHF = gl.createTexture(); texLamp = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    reglerTex(texLum, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, L.tex, gl.LINEAR);
    reglerTex(texHF, gl.RED, gl.R32F, gl.FLOAT, L.hf, gl.NEAREST);
    reglerTex(texLamp, gl.RED, gl.R8, gl.UNSIGNED_BYTE, LA.tex, gl.LINEAR);
    tampons = creerTampons(M); chunks = new Array(M.cw * M.chh).fill(null);
    vaoS = gl.createVertexArray(); vboS = gl.createBuffer(); vboC = gl.createBuffer(); vboH = gl.createBuffer();
    gl.bindVertexArray(vaoS);
    gl.bindBuffer(gl.ARRAY_BUFFER, vboS); gl.bufferData(gl.ARRAY_BUFFER, F.xy.byteLength, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vboC); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(F.camp), gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vboH); gl.bufferData(gl.ARRAY_BUFFER, F.max * 4, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null); masqueSale = true;
  };
  // le téléversement d'une région seulement (le recalcul local ne renvoie jamais toute la carte)
  const sous = (tex, region, fmt, type, data, pixel) => {
    const w = region.i1 - region.i0 + 1, h = region.j1 - region.j0 + 1;
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, M.W); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, region.i0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, region.j0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, pixel === 4 ? 4 : 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, region.i0, region.j0, w, h, fmt, type, data);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  };
  R.majLumiere = region => sous(texLum, region, gl.RGBA, gl.UNSIGNED_BYTE, L.tex, 4);
  R.majLampes = region => sous(texLamp, region, gl.RED, gl.UNSIGNED_BYTE, LA.tex, 1);
  R.majHauteurs = region => sous(texHF, region, gl.RED, gl.FLOAT, L.hf, 4);

  // ─── les maillages, un par chunk (sol et toit) ───
  const envoyer = (cible, T) => {
    if (!T.nv) { cible.ni = 0; return; }
    if (!cible.vao) { cible.vao = gl.createVertexArray(); cible.vbo = gl.createBuffer(); cible.ibo = gl.createBuffer(); }
    gl.bindVertexArray(cible.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cible.vbo); gl.bufferData(gl.ARRAY_BUFFER, T.v.subarray(0, T.nv * FLOATS), gl.DYNAMIC_DRAW);
    const S = FLOATS * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S, 28);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cible.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, T.x.subarray(0, T.nx), gl.DYNAMIC_DRAW);
    cible.ni = T.nx; gl.bindVertexArray(null);
  };
  R.reconstruire = (liste, ao) => {          // liste de { cx, cy } ; rend le temps en ms passé à construire (hors téléversement)
    for (const { cx, cy } of liste) {
      construireChunk(M, cx, cy, { ao }, tampons);
      const k = cy * M.cw + cx, c = chunks[k] || (chunks[k] = { sol: {}, toit: {} });
      envoyer(c.sol, tampons.sol); envoyer(c.toit, tampons.toit);
    }
  };
  R.tout = ao => R.reconstruire(Array.from({ length: M.cw * M.chh }, (_, k) => ({ cx: k % M.cw, cy: (k / M.cw) | 0 })), ao);

  // ─── la foule et les particules ───
  // les particules
  const vaoP = gl.createVertexArray(), vboP = gl.createBuffer(); let capP = 0;
  gl.bindVertexArray(vaoP); gl.bindBuffer(gl.ARRAY_BUFFER, vboP);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12); gl.bindVertexArray(null);
  const vaoL = gl.createVertexArray(), vboL = gl.createBuffer(); let capL = 0;
  gl.bindVertexArray(vaoL); gl.bindBuffer(gl.ARRAY_BUFFER, vboL);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12); gl.bindVertexArray(null);
  const vaoVide = gl.createVertexArray();

  // ─── les vrais soldats : le modèle du jeu (deux niveaux de détail), un tampon d'instances de 26 nombres par homme ───
  const instR = gl.createBuffer(), vaoR = {}; let capR = 0;
  const niveauR = niveau => {
    if (vaoR[niveau]) return vaoR[niveau];
    const Mo = REELS.modele(niveau), v = gl.createVertexArray(), P = progs.reels; gl.bindVertexArray(v);
    for (const [nom, k, cle] of REELS.PAR_SOMMET) {
      const loc = gl.getAttribLocation(P.p, nom); if (loc < 0) continue;
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, Mo[cle], gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instR);
    for (const [nom, k, off] of REELS.ATTRIBUTS) { const loc = gl.getAttribLocation(P.p, nom); if (loc < 0) continue; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, REELS.FLOATS * 4, off * 4); gl.vertexAttribDivisor(loc, 1); }
    gl.bindVertexArray(null);
    return (vaoR[niveau] = { v, n: Mo.triangles * 3 });
  };
  // les soldats du jeu (boîte, silhouette allégée, équipé) : une géométrie par style (rendu/geometries.js), un tampon d'instances chacun
  const instJ = {}, vaoJ = {}, capJ = {};
  const styleJ = style => {
    if (vaoJ[style]) return vaoJ[style];
    const G = REELS.geometrieJeu(style), v = gl.createVertexArray(), P = progs.jeu; gl.bindVertexArray(v);
    for (const [nom, k, cle] of REELS.PAR_SOMMET_JEU) { const loc = gl.getAttribLocation(P.p, nom); if (loc < 0) continue; const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, G[cle], gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, 0, 0); }
    instJ[style] = gl.createBuffer(); capJ[style] = 0; gl.bindBuffer(gl.ARRAY_BUFFER, instJ[style]);
    for (const [nom, k, off] of REELS.ATTRIBUTS_JEU) { const loc = gl.getAttribLocation(P.p, nom); if (loc < 0) continue; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, k, gl.FLOAT, false, REELS.FLOATS_JEU * 4, off * 4); gl.vertexAttribDivisor(loc, 1); }
    gl.bindVertexArray(null);
    return (vaoJ[style] = { v, n: G.n });
  };
  const PAL_J = Object.fromEntries(Object.entries(REELS.COULEURS_JEU).map(([k, l]) => [k, COUL[l]]));
  const paletteReels = () => { const o = {}; for (const [k, l] of Object.entries(REELS.COULEURS)) o[k] = COUL[l]; for (const [k, ls] of Object.entries(REELS.COULEURS_LISTES)) o[k] = ls.flatMap(l => COUL[l]); return o; };
  const PAL_R = paletteReels();

  // ─── les tampons d'image : scène (couleur + profondeur), AO ───
  let fbo = null, texCoul = null, texProf = null, fboAO = null, texAO = null, fboAO2 = null, texAO2 = null;
  const creerCible = (w, h, profondeur) => {
    const f = gl.createFramebuffer(), t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    let p = null;
    if (profondeur) {
      p = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, p);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, p, 0);
    }
    return { f, t, p };
  };
  const liberer = c => { if (!c) return; gl.deleteFramebuffer(c.f); gl.deleteTexture(c.t); if (c.p) gl.deleteTexture(c.p); };
  let cSc = null, cA1 = null, cA2 = null;
  R.dimensionner = (w, h) => {
    w = Math.max(16, w | 0); h = Math.max(16, h | 0);
    canvas.width = w; canvas.height = h; R.largeur = w; R.hauteur = h;
    liberer(cSc); liberer(cA1); liberer(cA2);
    cSc = creerCible(w, h, true); cA1 = creerCible(w, h, false); cA2 = creerCible(w, h, false);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  // ─── les chronomètres GPU (si le navigateur les donne) ───
  const attente = [];
  const chrono = (nom, f) => {
    if (!tq || attente.length > 12) { f(); return; }
    const q = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, q); f(); gl.endQuery(tq.TIME_ELAPSED_EXT); attente.push({ nom, q });
  };
  const lireChronos = () => {
    if (!tq) return;
    const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT);
    while (attente.length && gl.getQueryParameter(attente[0].q, gl.QUERY_RESULT_AVAILABLE)) {
      const { nom, q } = attente.shift(), ns = gl.getQueryParameter(q, gl.QUERY_RESULT); gl.deleteQuery(q);
      if (!disjoint) R.gpu[nom] = R.gpu[nom] == null ? ns / 1e6 : R.gpu[nom] * 0.85 + ns / 1e6 * 0.15;
    }
  };

  const uMat = new Float32Array(COULEURS_MATIERES.flat());
  const LAMPE_COUL = COUL.o.map((v, i) => v * 0.45 + COUL.orange[i] * 0.55);       // une flamme : l'os qui tire sur l'orange d'alerte
  const NEIGE_COUL = COUL.o.map((v, i) => (v * 0.78 + COUL.r[i] * 0.22) * 0.72);
  const poserCommun = (P, E, cam, m) => {
    const u = P.u, U3 = (n, v) => u[n] && gl.uniform3f(u[n], v[0], v[1], v[2]);
    if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, m.vp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texLum); u.uLight && gl.uniform1i(u.uLight, 0);
    u.uGrid && gl.uniform2f(u.uGrid, M.W, M.H); u.uCell && gl.uniform1f(u.uCell, M.cell);
    U3('uSunDir', E.ciel.sunDir); U3('uSunCol', E.ciel.sunCol); U3('uSkyAmb', E.ciel.skyAmb); U3('uGroundAmb', E.ciel.groundAmb); U3('uSkyH', E.ciel.skyH); U3('uSkyZ', E.ciel.skyZ); U3('uCam', m.oeil);
    u.uS && gl.uniform4f(u.uS, E.etapes[1] ? 1 : 0, E.etapes[2] ? 1 : 0, E.etapes[4] ? 1 : 0, E.etapes[7] ? 1 : 0);
    u.uWet && gl.uniform1f(u.uWet, E.ciel.humidite); u.uExpo && gl.uniform1f(u.uExpo, E.ciel.expo); u.uNuit && gl.uniform1f(u.uNuit, E.ciel.nuit);
    u.uNuage && gl.uniform4f(u.uNuage, E.ciel.nuages.couverture, E.derive[0], E.derive[1], 1 / NUAGES.echelleM); u.uNuageH && gl.uniform1f(u.uNuageH, NUAGES.hauteurM);
    u.uNeige && gl.uniform1f(u.uNeige, E.ciel.neige); u.uSnow && gl.uniform3f(u.uSnow, ...NEIGE_COUL); u.uVent && gl.uniform1f(u.uVent, E.ciel.vent); u.uTemps && gl.uniform1f(u.uTemps, E.temps);
    const fl = E.etapes[6] ? E.flashs.slice(0, 8) : [];
    u.uFlashN && gl.uniform1i(u.uFlashN, fl.length);
    if (fl.length && u.uFlashA) {
      const a = new Float32Array(32), b = new Float32Array(32);
      fl.forEach((f, k) => { a.set([f.x, f.y, f.z, f.rayon], k * 4); b.set([f.coul[0], f.coul[1], f.coul[2], f.force], k * 4); });
      gl.uniform4fv(u.uFlashA, a); gl.uniform4fv(u.uFlashB, b);
    }
    u.uMat && gl.uniform3fv(u.uMat, uMat);
    if (u.uLamp) { gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, texLamp); gl.uniform1i(u.uLamp, 4); gl.activeTexture(gl.TEXTURE0); }
    u.uLampOn && gl.uniform1f(u.uLampOn, E.etapes[6] ? 1 : 0); u.uLampCol && gl.uniform3f(u.uLampCol, ...LAMPE_COUL);
  };

  // Dessine une image. `E` : { camera, ciel, etapes: {1..8: bool}, flashs, particules: {n, tampon}, temps, split, toitsTransparents, ssaoEchantillons, brume: 'simple'|'complete' }
  // `E.moitie` (écran partagé) : { etapes } — ce que montre la moitié gauche
  R.dessiner = E => {
    lireChronos();
    const m = matrices(E.camera), W = R.largeur, H = R.hauteur;
    R.stats.triangles = 0; R.stats.appels = 0;
    const scene = (etapes, x0, x1) => {
      const ee = { ...E, etapes };
      gl.bindFramebuffer(gl.FRAMEBUFFER, cSc.f); gl.viewport(0, 0, W, H);
      if (x1 < W) { gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, 0, x1 - x0, H); } else if (x0 > 0) { gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, 0, W - x0, H); } else gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND); gl.depthMask(true);
      // le sol et les toits
      let P = progs.sol; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform1f(P.u.uAlpha, 1);
      for (const c of chunks) if (c && c.sol.ni) { gl.bindVertexArray(c.sol.vao); gl.drawElements(gl.TRIANGLES, c.sol.ni, gl.UNSIGNED_INT, 0); R.stats.triangles += c.sol.ni / 3; R.stats.appels++; }
      if (!E.toitsTransparents) for (const c of chunks) if (c && c.toit.ni) { gl.bindVertexArray(c.toit.vao); gl.drawElements(gl.TRIANGLES, c.toit.ni, gl.UNSIGNED_INT, 0); R.stats.triangles += c.toit.ni / 3; R.stats.appels++; }
      // les soldats
      P = progs.soldats; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texHF); gl.uniform1i(P.u.uHF, 1);
      gl.uniform3f(P.u.uNous, ...COUL.n); gl.uniform3f(P.u.uEux, ...COUL.x); gl.uniform3f(P.u.uOmbre, ...COUL.t);
      gl.bindVertexArray(vaoS);
      gl.drawArrays(gl.POINTS, 0, F.n); R.stats.appels++;
      gl.activeTexture(gl.TEXTURE0);
      if (E.jeu) {                                                         // les soldats du jeu : la boîte, la silhouette allégée, l'équipé
        P = progs.jeu; let prêt = false;
        for (const style of ['boite', 'legere', 'equipe']) {
          const L = E.jeu[style]; if (!L || !L.n) continue;
          if (!prêt) { gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform1f(P.u.uT, E.temps); gl.uniform1f(P.u.uBalance, 1); gl.uniform2f(P.u.uEch, 1, 1); gl.uniform2f(P.u.uSoleil, .5, .6); for (const [k, v] of Object.entries(PAL_J)) if (P.u[k]) gl.uniform3f(P.u[k], ...v); prêt = true; }
          const g = styleJ(style); gl.bindVertexArray(g.v); gl.drawArraysInstanced(gl.TRIANGLES, 0, g.n, L.n); R.stats.appels++; R.stats.triangles += g.n / 3 * L.n;
        }
      }
      if (E.reels && E.reels.n) {                                          // les vrais soldats articulés, de près
        P = progs.reels; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m);
        gl.uniform1f(P.u.uShade, 0); gl.uniform1f(P.u.uVoir, 1);
        for (const [k, v] of Object.entries(PAL_R)) if (P.u[k]) (v.length === 3 ? gl.uniform3f(P.u[k], ...v) : gl.uniform3fv(P.u[k], v));
        const g = niveauR(E.reels.niveau); gl.bindVertexArray(g.v); gl.drawArraysInstanced(gl.TRIANGLES, 0, g.n, E.reels.n); R.stats.appels++; R.stats.triangles += g.n / 3 * E.reels.n;
      }
      // les débris, puis (sans écrire la profondeur) fumée, poussière, toits transparents et pluie
      const np = E.particules.n, nd = E.particules.nd;
      P = progs.parts;
      if (np) { gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform1f(P.u.uPx1, (H / 2) / Math.tan(E.camera.fov / 2)); gl.bindVertexArray(vaoP); }
      if (nd) { gl.drawArrays(gl.POINTS, 0, nd); R.stats.appels++; }
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      if (np > nd) { gl.useProgram(P.p); gl.bindVertexArray(vaoP); gl.drawArrays(gl.POINTS, nd, np - nd); R.stats.appels++; }
      if (E.etapes[6] && E.lueurs && E.lueurs.n) {                          // la flamme des lanternes et des lampes : un point doux, ajouté à l'image
        P = progs.lueurs; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform1f(P.u.uPx1, (H / 2) / Math.tan(E.camera.fov / 2));
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.bindVertexArray(vaoL); gl.drawArrays(gl.POINTS, 0, E.lueurs.n); R.stats.appels++;
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      if (E.toitsTransparents) {
        P = progs.sol; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform1f(P.u.uAlpha, 0.28);
        for (const c of chunks) if (c && c.toit.ni) { gl.bindVertexArray(c.toit.vao); gl.drawElements(gl.TRIANGLES, c.toit.ni, gl.UNSIGNED_INT, 0); R.stats.triangles += c.toit.ni / 3; R.stats.appels++; }
      }
      if (E.etapes === ee.etapes && E.ciel.pluie > 0 && etapes[7]) {
        P = progs.pluie; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform1f(P.u.uT, E.temps); gl.uniform3f(P.u.uCentre, E.camera.cible[0] , 0, E.camera.cible[2]);
        gl.bindVertexArray(vaoVide); gl.drawArrays(gl.LINES, 0, Math.floor(2600 * E.ciel.pluie)); R.stats.appels++;
      }
      if (E.etapes === ee.etapes && E.ciel.neige > 0.02 && etapes[7]) {
        P = progs.neige; gl.useProgram(P.p); poserCommun(P, ee, E.camera, m); gl.uniform3f(P.u.uCentre, E.camera.cible[0], 0, E.camera.cible[2]);
        gl.bindVertexArray(vaoVide); gl.drawArrays(gl.POINTS, 0, Math.floor(3000 * E.ciel.neige)); R.stats.appels++;
      }
      gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST);
    };
    // la foule et les particules : les tampons partent une fois par image (même en écran partagé)
    gl.bindBuffer(gl.ARRAY_BUFFER, vboS); gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.xy, 0, F.n * 2);
    if (E.particules.n) { gl.bindBuffer(gl.ARRAY_BUFFER, vboP); const oct = E.particules.n * 24; if (oct > capP) { capP = Math.max(oct, 24 * 2048); gl.bufferData(gl.ARRAY_BUFFER, capP, gl.DYNAMIC_DRAW); } gl.bufferSubData(gl.ARRAY_BUFFER, 0, E.particules.tampon, 0, E.particules.n * 6); }
    if ((E.reels && E.reels.n) || masqueSale) { gl.bindBuffer(gl.ARRAY_BUFFER, vboH); gl.bufferSubData(gl.ARRAY_BUFFER, 0, E.masque, 0, F.n); masqueSale = !!(E.reels && E.reels.n); }
    if (E.reels && E.reels.n) { gl.bindBuffer(gl.ARRAY_BUFFER, instR); const oct = E.reels.n * REELS.FLOATS * 4; if (oct > capR) { capR = oct * 2; gl.bufferData(gl.ARRAY_BUFFER, capR, gl.DYNAMIC_DRAW); } gl.bufferSubData(gl.ARRAY_BUFFER, 0, E.reels.data, 0, E.reels.n * REELS.FLOATS); }
    if (E.lueurs && E.lueurs.n) { gl.bindBuffer(gl.ARRAY_BUFFER, vboL); const oct = E.lueurs.n * 20; if (oct > capL) { capL = Math.max(oct, 20 * 512); gl.bufferData(gl.ARRAY_BUFFER, capL, gl.DYNAMIC_DRAW); } gl.bufferSubData(gl.ARRAY_BUFFER, 0, E.lueurs.data, 0, E.lueurs.n * 5); }
    for (const style of ['boite', 'legere', 'equipe']) {
      const L = E.jeu && E.jeu[style]; if (!L || !L.n) continue;
      styleJ(style); gl.bindBuffer(gl.ARRAY_BUFFER, instJ[style]); const oct = L.n * REELS.FLOATS_JEU * 4;
      if (oct > capJ[style]) { capJ[style] = oct * 2; gl.bufferData(gl.ARRAY_BUFFER, capJ[style], gl.DYNAMIC_DRAW); }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, L.data, 0, L.n * REELS.FLOATS_JEU);
    }
    const tout = E.etapes, partage = E.moitie && E.split > 0;
    chrono('scene', () => {
      if (partage) {
        const xs = Math.round(E.split * W);
        scene(E.moitie.etapes, 0, xs); scene(tout, xs, W);
      } else scene(tout, 0, W);
    });
    // l'AO écran (étape 8)
    const ssao = tout[8] && E.ssaoEchantillons > 0;
    if (ssao) chrono('ssao', () => {
      gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(vaoVide); gl.viewport(0, 0, W, H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cA1.f); let P = progs.ssao; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cSc.p); gl.uniform1i(P.u.uDepth, 0);
      gl.uniformMatrix4fv(P.u.uInvP, false, m.invProj); gl.uniformMatrix4fv(P.u.uP, false, m.proj); gl.uniform2f(P.u.uTexel, 1 / W, 1 / H);
      gl.uniform1f(P.u.uRayon, 0.75); gl.uniform1i(P.u.uN, E.ssaoEchantillons); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cA2.f); P = progs.flou; gl.useProgram(P.p);
      gl.bindTexture(gl.TEXTURE_2D, cA1.t); gl.uniform1i(P.u.uAO, 0); gl.uniform2f(P.u.uTexel, 1 / W, 1 / H); gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    // la composition à l'écran
    chrono('composition', () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      const P = progs.compo; gl.useProgram(P.p); poserCommun(P, { ...E, etapes: tout }, E.camera, m);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cSc.t); gl.uniform1i(P.u.uColor, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, cSc.p); gl.uniform1i(P.u.uDepth, 2);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, cA2.t); gl.uniform1i(P.u.uAOtex, 3);
      gl.uniformMatrix4fv(P.u.uInvVP, false, m.invVP);
      gl.uniform1f(P.u.uFocus, E.camera.distance * 0.9);
      gl.uniform1f(P.u.uFondu, (ATMOSPHERE.fondu[E.brume] || ATMOSPHERE.fondu.simple) * (1 + 3.5 * (tout[7] ? E.ciel.brouillard : 0)));
      gl.uniform1f(P.u.uSplit, partage ? E.split : 0); gl.uniform1f(P.u.uAOon, ssao ? 1 : 0);
      gl.uniform1f(P.u.uBrumeOn, tout[5] || (tout[7] && E.ciel.brouillard > 0.02) ? 1 : 0);
      gl.uniform1f(P.u.uBrumeD, (tout[5] ? ATMOSPHERE.brumeSol.densite * (1 + E.ciel.voile * 1.2 + E.ciel.humidite * 0.6) : 0) + (tout[7] ? 0.22 * E.ciel.brouillard : 0)); gl.uniform1f(P.u.uBrumeK, ATMOSPHERE.brumeSol.chute);
      gl.uniform3f(P.u.uLuneDir, ...E.ciel.luneDir); gl.uniform3f(P.u.uNuageCoul, ...E.ciel.nuageCoul); gl.uniform4f(P.u.uHors, HORS_CARTE.echelleM, HORS_CARTE.relief, 0, 0); gl.uniform1f(P.u.uBordY, E.bordY); gl.uniform1f(P.u.uEtoiles, E.ciel.etoiles);
      gl.uniform3f(P.u.uBrumeCoul, ...E.ciel.brumeCoul);
      gl.bindVertexArray(vaoVide); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    });
  };
  // Attend la fin du dessin (le banc de mesure) : sinon les temps ne mesurent que l'envoi des commandes
  R.attendre = () => { const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  R.compterTriangles = () => R.stats.triangles;
  return R;
}
