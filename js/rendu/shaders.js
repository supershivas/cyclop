// Les programmes de nuanceur (GLSL) du rendu : du texte, rien d'autre. Un objet par matériau de rendu3d.js, avec son
// sommet (`v`) et son fragment (`f`) ; le texte est exactement celui d'avant la découpe.
export const solMat = {
  v: `
      attribute float aParoi; attribute vec2 aDecal; attribute float aFace;
      varying vec2 vUV; varying vec2 vXZ;
      uniform vec2 uTaille; uniform float uSuivre; uniform vec2 uVersSoleil;
      void main() {
        // une paroi prend la couleur de la case au-dessus d'elle (aDecal : vers elle), en plus sombre (la moitié basse de la texture)
        vec2 xz = position.xz + aDecal;
        float sombre = aParoi;
        // (labo) les parois suivent le soleil : une paroi d'un demi-mètre ou plus (aFace 4 à 7) est sombre si elle tourne le dos au soleil, claire sinon ; le dessus (aFace 8) ne change pas
        if (uSuivre > 0.5 && aFace < 7.5) {
          float f = mod(aFace, 4.0);
          vec2 n = f < 0.5 ? vec2(0.0, 1.0) : f < 1.5 ? vec2(0.0, -1.0) : f < 2.5 ? vec2(1.0, 0.0) : vec2(-1.0, 0.0);      // sud, nord, est, ouest : où la paroi regarde
          sombre = aFace > 3.5 && dot(n, uVersSoleil) <= 0.0 ? 1.0 : 0.0;
        }
        vUV = vec2(xz.x / uTaille.x, (xz.y / uTaille.y + (sombre > 0.5 ? 1.0 : 0.0)) * 0.5);
        vXZ = xz;
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }`,
  f: `
      uniform sampler2D uSol; uniform vec2 uTaille; uniform float uBord; uniform vec3 uBordCoul;
      uniform vec3 uKaki, uVert, uGlaise; uniform float uDissoudre;
      varying vec2 vUV; varying vec2 vXZ;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec4 c = texture2D(uSol, vUV);
        vec3 rgb = c.rgb;
        // le bord du terrain (v0.32.0, labo « Le bord de la carte ») : le sol se fond dans une couleur sur uBord mètres (0 : coupé net)
        if (uBord > 0.0) {
          float d = min(min(vXZ.x, uTaille.x - vXZ.x), min(vXZ.y, uTaille.y - vXZ.y));
          rgb = mix(uBordCoul, rgb, smoothstep(0.0, uBord, d));
        }
        // le bord se dissout dans le faux terrain (Jérôme, v0.61.0 : « plus de ligne franche ») : près du bord, des carrés de 2 m prennent les couleurs des plaques du faux terrain (les mêmes que fauxMat), de plus en plus nombreux ; l'eau reste de l'eau
        if (uDissoudre > 0.0) {
          float d = min(min(vXZ.x, uTaille.x - vXZ.x), min(vXZ.y, uTaille.y - vXZ.y));
          if (d < uDissoudre && rgb.b - rgb.r < 0.04) {
            float t = clamp(d / uDissoudre, 0.0, 1.0);
            if (h(floor(vXZ / 2.0) + 3.0) > t * t) {
              vec3 f = uKaki; float grand = h(floor(vXZ / 22.0)), petit = h(floor(vXZ / 2.0));
              if (grand > 0.6) f = uVert; else if (grand < 0.1) f = uGlaise;
              if (petit > 0.94) f = uGlaise;
              rgb = f;
            }
          }
        }
        gl_FragColor = vec4(rgb, 1.0);
      }`,
};

// Le faux terrain au-delà du bord : un plan immense, des plaques de la couleur du sol, qui se perd dans la brume
export const fauxMat = {
  v: `varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
  f: `uniform vec3 uKaki, uVert, uGlaise, uBrume, uEau, uClair; uniform vec2 uCentre, uDemi; uniform float uPortee;
      uniform sampler2D uSol; uniform vec2 uTaille;
      uniform vec4 uRiv[8]; uniform int uNRiv;
      varying vec2 vXZ;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 d0 = abs(vXZ - uCentre) - uDemi;
        if (d0.x < 0.0 && d0.y < 0.0) discard;                       // sous le terrain : rien (le plan cachait les tranchées et les creux)
        vec3 c = uKaki;
        float grand = h(floor(vXZ / 22.0)), petit = h(floor(vXZ / 2.0));
        if (grand > 0.6) c = uVert; else if (grand < 0.1) c = uGlaise;
        if (petit > 0.94) c = uGlaise;
        // un fleuve qui touche le bord du champ continue ici, en méandres (v0.47.1) : uRiv[2k] = point de sortie et direction, uRiv[2k+1] = demi-largeur, phase, amplitude, graine
        for (int k = 0; k < 4; k++) {
          if (k >= uNRiv) break;
          vec4 a = uRiv[k * 2], b = uRiv[k * 2 + 1];
          vec2 rel = vXZ - a.xy, dir = a.zw, nor = vec2(-dir.y, dir.x);
          float t = dot(rel, dir), o = dot(rel, nor);
          if (t > -30.0 && t < 3500.0) {
            float tt = max(t, 0.0), ramp = smoothstep(0.0, 80.0, tt), lam = 190.0 + 110.0 * b.w, lam2 = lam * 0.37;
            float cen = ramp * b.z * (sin(tt / lam + b.y) - sin(b.y) + 0.4 * (sin(tt / lam2 + b.y * 2.3) - sin(b.y * 2.3)));
            float pente = ramp * b.z * (cos(tt / lam + b.y) / lam + 0.4 * cos(tt / lam2 + b.y * 2.3) / lam2);
            float larg = b.x * (1.0 + 0.3 * ramp * sin(tt / 137.0 + b.w * 6.0)) * sqrt(1.0 + pente * pente);
            if (abs(o - cen) < larg) { c = h(floor(vXZ / 3.0)) > 0.93 ? uClair : uEau; }
          }
        }
        // l'eau qui touche le bord du champ (un lac, la mer) continue au-delà, sur une longueur qui varie le long du bord, et finit en carrés de 2 m de moins en moins nombreux : pas de coupure nette (Jérôme, v0.64.1)
        vec2 e = vec2(clamp(vXZ.x, 0.5, uTaille.x - 0.5), clamp(vXZ.y, 0.5, uTaille.y - 0.5));
        vec3 te = texture2D(uSol, vec2(e.x / uTaille.x, e.y / uTaille.y * 0.5)).rgb;
        if (te.b - te.r > 0.04) {
          float dist = length(vXZ - e), lim = 30.0 + 90.0 * h(floor(e / 12.0) + 5.0);
          if (dist < lim && h(floor(vXZ / 2.0) + 9.0) > dist / lim) c = h(floor(vXZ / 3.0)) > 0.93 ? uClair : uEau;
        }
        vec2 q = max(abs(vXZ - uCentre) - uDemi, 0.0);
        c = mix(c, uBrume, smoothstep(30.0, uPortee, length(q)));
        gl_FragColor = vec4(c, 1.0);
      }`,
};

export const soldatMat = {
  v: `
      attribute vec3 aPos; attribute float aCamp; attribute float aPart; attribute float aJambe; attribute float aVit; attribute float aBras; attribute vec2 aTir;
      uniform float uT; uniform vec2 uSoleil; uniform float uBalance;
      varying float vCamp; varying float vPart; varying vec2 vXZ; varying float vLong;
      void main() {
        // une partie de 10 à 19 n'est dessinée que pour nous, de 20 à 29 que pour en face (casque, moustache : v0.27.0, au labo)
        float cp = aCamp > 1.5 ? aCamp - 2.0 : aCamp, kp = aPart;
        bool cache = false;
        if (kp >= 20.0) { kp -= 20.0; cache = cp < 0.5; } else if (kp >= 10.0) { kp -= 10.0; cache = cp > 0.5; }
        vCamp = aCamp; vPart = kp; vLong = position.y;
        vec3 p = position;
        // la peur : un homme se tapit (aVit < 0 : −1 − sa vitesse), sauf son ombre
        bool tapi = aVit < 0.0;
        float vit = tapi ? 0.0 : aVit;
        if (tapi && (kp < 0.5 || kp > 1.5)) p.y *= 0.6;
        // l'ombre suit le soleil : elle part des pieds, longue le matin et le soir (uSoleil : son bout, par mètre de hauteur)
        if (kp > 0.5 && kp < 1.5) {
          vec2 d = length(uSoleil) > 0.05 ? normalize(uSoleil) : vec2(0.6, 0.8);
          vec2 xz = vec2(-d.y, d.x) * position.x + (position.y > 0.5 ? uSoleil * 1.7 + d * 0.1 : -d * 0.05);
          p = vec3(xz.x, 0.03, xz.y);
        }
        vXZ = (p + aPos).xz;
        // les jambes qui marchent : un balancement autour de la hanche (0,8 m), selon la vitesse
        if (aJambe != 0.0 && vit > 0.15) {
          float a = sin(uT * 8.0 + aPos.x * 1.7 + aPos.z * 1.3) * 0.5 * min(1.0, vit) * aJambe;
          float y = p.y - 0.8;
          p.z = p.z * cos(a) - y * sin(a);
          p.y = 0.8 + p.z * sin(a) + y * cos(a);
        }
        // les bras balancent à la marche, à l'opposé des jambes (le style equipe-marche seulement : uBalance)
        if (uBalance > 0.5 && vit > 0.15 && abs(aBras) > 0.5 && abs(aBras) < 1.5 && aTir.x < 0.01) {
          float b = -sin(uT * 8.0 + aPos.x * 1.7 + aPos.z * 1.3) * 0.45 * min(1.0, vit) * aBras;
          vec3 d = p - vec3(0.0, 1.35, 0.0);
          p.y = 1.35 + d.y * cos(b) - d.z * sin(b);
          p.z = d.y * sin(b) + d.z * cos(b);
        }
        // il tire (aTir : x la pose, 1 quand il épaule, y le cap vers sa cible) : les bras et le fusil se lèvent devant lui
        // (autour de l'épaule, à 1,3 m), et il se tourne vers l'ennemi ; sa pose seulement, jamais la partie
        // feu retenu (aTir.x < 0) : le fusil est baissé, en travers devant les hanches, le canon vers l'avant ; il ne se lève que pour tirer (pose seulement)
        if (aTir.x < -0.5 && kp > 3.5 && kp < 4.5) {
          float a = -1.9;
          vec3 d = p - vec3(0.0, 0.9, 0.0);
          p.y = 0.9 + d.y * cos(a) - d.z * sin(a);
          p.z = d.y * sin(a) + d.z * cos(a);
        }
        float tir = clamp(aTir.x * 2.5, 0.0, 1.0);
        if (tir > 0.0 && !(aPart > 0.5 && aPart < 1.5)) {
          if (aBras != 0.0) {
            if (aBras > 1.5) p.x -= 0.28 * tir;
            float a = -1.45 * tir;
            vec3 d = p - vec3(0.0, 1.3, 0.0);
            p.y = 1.3 + d.y * cos(a) - d.z * sin(a);
            p.z = d.y * sin(a) + d.z * cos(a);
          }
        }
        // le cap (aTir.y) : vers sa cible quand il tire, sinon dans le sens où il marche (Jérôme, v0.47.2 : « les soldats avancent en arrière ») ; sa pose seulement
        if (abs(aTir.y) > 0.001 && !(aPart > 0.5 && aPart < 1.5)) {
          float c = cos(aTir.y), s = sin(aTir.y);
          p.xz = vec2(p.x * c + p.z * s, -p.x * s + p.z * c);
        }
        if (cache) p = vec3(0.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
      }`,
  f: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel;
      uniform vec3 uJambes; uniform vec3 uFusil; uniform vec3 uSac; uniform vec3 uVisage; uniform vec3 uCuir; uniform vec3 uBotte;
      uniform sampler2D uSol; uniform vec2 uTaille;
      varying float vCamp; varying float vPart; varying vec2 vXZ; varying float vLong;
      void main() {
        float k = floor(vPart + 0.5);
        // l'ombre : le sol qu'elle couvre, un ton plus sombre (la couleur de ses parois), fondue de plus en plus
        // vers son bout, sans trame (une ombre noire et pleine se lisait comme une tache ; Jérôme, v0.12.1 : plus de tramage)
        if (k == 1.0) {
          gl_FragColor = vec4(texture2D(uSol, vec2(vXZ.x / uTaille.x, (vXZ.y / uTaille.y + 1.0) * 0.5)).rgb, 0.95 - 0.6 * vLong);
          return;
        }
        bool sel = vCamp > 1.5;
        float camp = sel ? vCamp - 2.0 : vCamp;
        vec3 c = camp > 0.5 ? uEux : uNous;
        if (k == 1.0) c = uOmbre;
        else if (k == 2.0 && sel) c = uSel;           // le casque des choisis
        else if (k == 3.0) c = uJambes;
        else if (k == 4.0) c = uFusil;
        else if (k == 5.0) c = uSac;
        else if (k == 6.0 || k == 9.0) c = uVisage;
        else if (k == 7.0) c = uCuir;
        else if (k == 8.0) c = uBotte;
        gl_FragColor = vec4(c, 1.0);
      }`,
};

export const pointMat = {
  v: `
      attribute float aCamp; varying float vCamp;
      void main() { vCamp = aCamp; gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 1.2, 0.0), 1.0); gl_PointSize = 2.0; }`,
  f: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uOmbre; uniform vec3 uSel; varying float vCamp;
      void main() {
        if (gl_PointCoord.y > 0.5) { gl_FragColor = vec4(uOmbre, 1.0); return; }
        bool sel = vCamp > 1.5;
        float camp = sel ? vCamp - 2.0 : vCamp;
        gl_FragColor = vec4(sel ? uSel : (camp > 0.5 ? uEux : uNous), 1.0);
      }`,
};

export const anMat = {
  v: `uniform float uTaille; attribute float aTon; varying float vTon; void main() { vTon = aTon; gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 0.05, 0.0), 1.0); gl_PointSize = uTaille; }`,
  f: `uniform vec3 uOs; uniform vec3 uTerre; uniform vec3 uNous; uniform vec3 uEux; varying float vTon;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0 || r < 0.58) discard; vec3 c = vTon < 0.5 ? uOs : (vTon < 1.5 ? uNous : uEux); gl_FragColor = vec4(r > 0.82 ? uTerre : c, 1.0); }`,
};

export const tombeMat = {
  v: `
      attribute vec3 aPos; attribute float aPart; varying float vPart;
      void main() { vPart = aPart; gl_Position = projectionMatrix * viewMatrix * vec4(position + aPos, 1.0); }`,
  f: `
      uniform vec3 uTertre; uniform vec3 uFlanc; uniform vec3 uCroix; varying float vPart;
      void main() { gl_FragColor = vec4(vPart > 1.5 ? uCroix : (vPart > 0.5 ? uFlanc : uTertre), 1.0); }`,
};

export const tombePointMat = {
  v: `void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 0.3, 0.0), 1.0); gl_PointSize = 1.0; }`,
  f: `uniform vec3 uTertre; void main() { gl_FragColor = vec4(uTertre, 1.0); }`,
};

export const corpsMat = {
  v: `
      attribute vec3 aPos; attribute vec2 aInfo; attribute float aPart;
      varying float vEtat; varying float vPart;
      void main() {
        vEtat = aInfo.x; vPart = aPart;
        float c = cos(aInfo.y), s = sin(aInfo.y);
        vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
      }`,
  f: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uVieux; uniform vec3 uFlanc;
      varying float vEtat; varying float vPart;
      void main() {
        vec3 c = vEtat > 1.5 ? uVieux : (vEtat > 0.5 ? uEux : uNous);
        gl_FragColor = vec4(vPart > 0.5 ? uFlanc : c, 1.0);
      }`,
};

// Un soldat couché (v0.27.0, au labo) : la même forme que le soldat debout (`geometrieSoldat`), posée à plat ; sur le dos, sur le ventre ou sur le côté, les membres
// écartés, selon son numéro (aInfo.y, l'angle qu'il garde) quand uPoses vaut 1. aInfo.x : 0 nous, 1 eux, 2 la glaise (le lendemain) ; aCamp : toujours son camp.
export const corpsSoldatMat = {
  v: `
      attribute vec3 aPos; attribute vec2 aInfo; attribute float aCamp; attribute float aPart; attribute float aJambe; attribute float aBras;
      uniform float uPoses;
      varying float vEtat; varying float vPart; varying float vCamp;
      void main() {
        float kp = aPart;
        bool cache = false;
        if (kp >= 20.0) { kp -= 20.0; cache = aCamp < 0.5; } else if (kp >= 10.0) { kp -= 10.0; cache = aCamp > 0.5; }
        if (kp > 0.5 && kp < 1.5) cache = true;                       // pas d'ombre : il est couché
        vEtat = aInfo.x; vPart = kp; vCamp = aCamp;
        float h = fract(sin(aInfo.y * 91.7) * 43758.5453), h2 = fract(h * 7.31), h3 = fract(h * 13.17);
        vec3 p = position;
        if (uPoses > 0.5) {
          if (aJambe != 0.0) { float a = aJambe * (0.06 + 0.4 * h2); float y = p.y - 0.8; float x = p.x; p.x = x * cos(a) - y * sin(a); p.y = 0.8 + x * sin(a) + y * cos(a); }
          if (abs(aBras) > 0.5 && abs(aBras) < 1.5) { float a = aBras * (0.15 + 1.0 * h3); vec3 d = p - vec3(0.0, 1.35, 0.0); p.x = d.x * cos(a) - d.y * sin(a); p.y = 1.35 + d.x * sin(a) + d.y * cos(a); }
        }
        float pose = uPoses > 0.5 ? h : 0.0;
        vec3 q;
        if (pose < 0.55) q = vec3(p.x, p.z + 0.34, -p.y + 0.85);                                  // sur le dos : la face en l'air
        else if (pose < 0.8) q = vec3(-p.x, -p.z + 0.34, p.y - 0.85);                             // sur le ventre
        else q = vec3((h2 < 0.5 ? 1.0 : -1.0) * p.z, -(h2 < 0.5 ? 1.0 : -1.0) * p.x + 0.38, -p.y + 0.85);   // sur le côté
        float c = cos(aInfo.y), s = sin(aInfo.y);
        q = vec3(q.x * c - q.z * s, q.y, q.x * s + q.z * c);
        if (cache) q = vec3(0.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(q + aPos, 1.0);
      }`,
  f: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uVieux; uniform vec3 uJambes; uniform vec3 uFusil; uniform vec3 uSac; uniform vec3 uVisage; uniform vec3 uCuir; uniform vec3 uBotte;
      varying float vEtat; varying float vPart; varying float vCamp;
      void main() {
        float k = floor(vPart + 0.5);
        vec3 c = vEtat > 1.5 ? uVieux : (vCamp > 0.5 ? uEux : uNous);
        if (k == 3.0) c = uJambes; else if (k == 4.0) c = uFusil; else if (k == 5.0) c = uSac; else if (k == 6.0 || k == 9.0) c = uVisage; else if (k == 7.0) c = uCuir; else if (k == 8.0) c = uBotte;
        gl_FragColor = vec4(c, 1.0);
      }`,
};

export const corpsPointMat = {
  v: `
      attribute vec2 aInfo; varying float vEtat;
      void main() { vEtat = aInfo.x; gl_Position = projectionMatrix * viewMatrix * vec4(position + vec3(0.0, 0.3, 0.0), 1.0); gl_PointSize = 1.0; }`,
  f: `
      uniform vec3 uNous; uniform vec3 uEux; uniform vec3 uVieux; varying float vEtat;
      void main() { gl_FragColor = vec4(vEtat > 1.5 ? uVieux : (vEtat > 0.5 ? uEux : uNous), 1.0); }`,
};

export const herbeMat = {
  v: `
      attribute vec3 aPos; attribute float aHaut; uniform float uT; varying float vHaut;
      void main() {
        vHaut = aHaut;
        vec3 p = position;
        p.x += sin(uT * 1.6 + aPos.x * 0.37 + aPos.z * 0.21) * 0.07 * aHaut;        // le vent
        gl_Position = projectionMatrix * viewMatrix * vec4(p + aPos, 1.0);
      }`,
  f: `uniform vec3 uBas; uniform vec3 uHaut; varying float vHaut;
      void main() { gl_FragColor = vec4(vHaut > 0.6 ? uHaut : uBas, 1.0); }`,
};

export const eclMat = {
  v: `attribute float aTon; attribute float aTaille; varying float vTon; uniform float uTaille;
      void main() { vTon = aTon; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = aTon < 0.0 ? 0.0 : max(1.0, floor(uTaille * aTaille + 0.5)); if (aTon < 0.0) gl_Position = vec4(2.0); }`,
  f: `uniform sampler2D uPal; uniform float uNP; varying float vTon;
      void main() {
        float t = floor(vTon + 0.5);
        float a = 1.0;
        if (t > 50.0) { a = 0.6; t -= 100.0; }   // la fumée, fondue (plus de trame ; v0.12.1)
        gl_FragColor = vec4(texture2D(uPal, vec2((t + 0.5) / uNP, 0.25)).rgb, a);
      }`,
};

export const crMat = {
  v: `uniform float uT; void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = mod(floor(uT * 6.0 + position.x), 2.0) > 0.5 ? 3.0 : 2.0; }`,
  f: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }`,
};

export const plMat = {
  v: `attribute float aVit; uniform float uT; uniform vec2 uC; uniform vec2 uE; uniform float uTaille;
      void main() {
        vec3 p = position;
        p.y = 30.0 - mod(uT * aVit + position.y, 40.0);
        p.x = uC.x - uE.x * 0.5 + mod(p.x - uC.x + uE.x * 0.5 - uT * 2.0, uE.x);
        p.z = uC.y - uE.y * 0.5 + mod(p.z - uC.y + uE.y * 0.5, uE.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        gl_PointSize = uTaille;
      }`,
  f: `uniform vec3 uCol; void main() { if (gl_PointCoord.x > 0.5) discard; gl_FragColor = vec4(uCol, 1.0); }`,
};

// la neige (v0.51.0) : les mêmes points que la pluie, plus lents, ronds (des flocons, pas des traits)
export const neigeMat = { v: plMat.v, f: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }` };

export const brumeMat = {
  v: `void main() { gl_Position = vec4(position.xy, -1.0, 1.0); }`,
  f: `uniform vec3 uCol; uniform float uH;
      void main() {
        float loin = gl_FragCoord.y / uH;                          // 0 en bas, 1 en haut
        gl_FragColor = vec4(uCol, 0.2 * max(0.0, loin - 0.45) / 0.55);
      }`,
};

export const aoMat = {
  v: `attribute vec4 aPos; uniform vec2 uSoleil; varying vec2 vXZ; varying float vLong;
      void main() {
        vec2 d = length(uSoleil) > 0.05 ? normalize(uSoleil) : vec2(0.6, 0.8);
        vec2 xz = vec2(-d.y, d.x) * position.x + (position.y > 0.5 ? uSoleil * aPos.w : vec2(0.0));
        vXZ = vec2(aPos.x + xz.x, aPos.z + xz.y); vLong = position.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(aPos.x + xz.x, aPos.y + 0.04, aPos.z + xz.y, 1.0);
      }`,
  f: `uniform sampler2D uSol; uniform vec2 uTaille; varying vec2 vXZ; varying float vLong;
      void main() {
        gl_FragColor = vec4(texture2D(uSol, vec2(vXZ.x / uTaille.x, (vXZ.y / uTaille.y + 1.0) * 0.5)).rgb, 0.7 - 0.55 * vLong);
      }`,
};

export const lnMat = {
  v: `uniform float uT; varying float vF; void main() { vF = sin(uT * 9.0 + position.x * 3.1 + position.z); gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = 2.0; }`,
  f: `uniform vec3 uO; uniform vec3 uH; varying float vF; void main() { gl_FragColor = vec4(vF > -0.3 ? uO : uH, 1.0); }`,
};

export const nuitMat = {
  v: `void main() { gl_Position = vec4(position.xy, -1.0, 1.0); }`,
  f: `uniform vec3 uCol; uniform vec3 uLueur; uniform float uD; uniform float uMode; uniform sampler2D uLum; uniform vec2 uTaille;
      float bayer(vec2 p) {
        vec2 a = mod(p, 2.0), b = mod(floor(p / 2.0), 2.0);
        float m = a.x * 2.0 + a.y * 3.0 - a.x * a.y * 4.0;
        float n = b.x * 2.0 + b.y * 3.0 - b.x * b.y * 4.0;
        return (m * 4.0 + n + 0.5) / 16.0;
      }
      void main() {
        float clair = texture2D(uLum, gl_FragCoord.xy / uTaille).r;
        if (uMode < 0.5) {
          if (bayer(floor(gl_FragCoord.xy)) > uD * (1.0 - clair)) discard;
          gl_FragColor = vec4(uCol, 1.0);
        } else if (uMode < 1.5) {
          gl_FragColor = vec4(uCol, uD * (1.0 - clair));
        } else {
          float halo = clair * clair * 0.38 * min(1.0, uD * 1.6);
          gl_FragColor = vec4(mix(uCol, uLueur, halo / max(0.001, halo + uD * (1.0 - clair))), min(1.0, uD * (1.0 - clair) + halo));
        }
      }`,
};

// Le ciel du jeu (v0.36.8) : un dégradé de l'horizon au zénith et des nuages (un bruit de valeur, quatre octaves) sur un plan haut que la dérive du vent fait glisser.
// Tout vient du rayon de chaque pixel (la caméra : `uInvProj`, `uMonde`), donc le ciel tourne et s'incline avec elle.
export const cielMat = {
  v: `uniform mat4 uInvProj; uniform mat4 uMonde; varying vec3 vDir;
      void main() {
        vec4 p = uInvProj * vec4(position.xy, 1.0, 1.0);
        vDir = (uMonde * vec4(p.xyz / p.w, 0.0)).xyz;
        gl_Position = vec4(position.xy, 0.999, 1.0);
      }`,
  f: `uniform vec3 uHor; uniform vec3 uHaut; uniform vec3 uNuage; uniform float uCouv; uniform float uT; varying vec3 vDir;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float bruit(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec3 d = normalize(vDir);
        float e = max(d.y, 0.0);
        vec3 c = mix(uHor, uHaut, smoothstep(0.0, 0.3, e));
        vec2 q = d.xz / (e + 0.35) * 9.0 + vec2(uT * 0.012, uT * 0.004);
        float n = 0.5 * bruit(q) + 0.25 * bruit(q * 2.1 + 5.0) + 0.17 * bruit(q * 4.3 + 11.0) + 0.08 * bruit(q * 8.7 + 17.0);
        float nuage = smoothstep(0.56 - uCouv * 0.5, 0.74 - uCouv * 0.5, n) * smoothstep(0.0, 0.18, e);
        gl_FragColor = vec4(mix(c, uNuage, nuage), 1.0);
      }`,
};

// Le ciel de nuit (Jérôme, v0.40.0) : des étoiles, la lune dans sa phase, des nuages qui les cachent, une étoile filante de temps en temps. Un plan peint APRÈS le voile de
// la nuit, à la profondeur du fond : seul le ciel (là où le sol n'a rien dessiné) le reçoit. Tout est lu de la direction du rayon de chaque pixel, donc le ciel suit la caméra.
export const nuitCiel = {
  v: cielMat.v,
  f: `uniform vec3 uOs; uniform vec3 uBrume; uniform vec3 uTerre; uniform float uVis; uniform float uT; uniform float uCouv; uniform vec3 uLune; uniform float uClair; uniform vec2 uVue; varying vec3 vDir;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float bruit(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      // une couche « par-dessus » (couleur non prémultipliée)
      vec4 sur(vec4 b, vec3 c, float a) { float o = a + b.a * (1.0 - a); return o <= 0.0 ? vec4(0.0) : vec4((c * a + b.rgb * b.a * (1.0 - a)) / o, o); }
      float segment(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
      void main() {
        vec3 d = normalize(vDir);
        if (d.y <= 0.0 || uVis <= 0.0) { gl_FragColor = vec4(0.0); return; }     // (pas de discard : il couperait le test de profondeur avant le nuanceur)
        float az = atan(d.x, d.z), el = asin(clamp(d.y, -1.0, 1.0));
        // les nuages de la nuit (la même étoffe que le jour, plus épaisse avec la couverture)
        vec2 q = d.xz / (d.y + 0.35) * 9.0 + vec2(uT * 0.008, uT * 0.003);
        float n = 0.5 * bruit(q) + 0.25 * bruit(q * 2.1 + 5.0) + 0.17 * bruit(q * 4.3 + 11.0) + 0.08 * bruit(q * 8.7 + 17.0);
        float nuage = smoothstep(0.56 - uCouv * 0.5, 0.74 - uCouv * 0.5, n) * smoothstep(0.0, 0.18, d.y);
        vec4 c = vec4(0.0);
        // les étoiles : un point par case d'une grille d'angles (~6 pixels), une sur vingt-cinq, qui scintille
        vec2 g = vec2(az, el) * 110.0, cell = floor(g), f = fract(g);
        float r = h(cell);
        if (r > 0.96) {
          vec2 pos = vec2(h(cell + 7.1), h(cell + 3.3)) * 0.6 + 0.2;
          float tw = 0.65 + 0.35 * sin(uT * (1.5 + 3.0 * h(cell + 1.7)) + r * 50.0);
          c = sur(c, uOs, smoothstep(0.17, 0.07, length(f - pos)) * tw * (0.45 + 0.55 * h(cell + 9.0)));
        }
        // la lune : un disque de 0,03 rad, éclairé selon sa phase (uLune.z : 0 nouvelle, 0,5 pleine), le reste de la face à peine visible
        vec3 m = vec3(sin(uLune.x) * cos(uLune.y), sin(uLune.y), cos(uLune.x) * cos(uLune.y));
        float R = 0.03, ang = acos(clamp(dot(d, m), -1.0, 1.0));
        vec3 droite = normalize(cross(vec3(0.0, 1.0, 0.0), m)), haut = cross(m, droite);
        float lueur = uClair * 0.5 * smoothstep(0.35, 0.0, ang);
        c = sur(c, mix(uBrume, uOs, 0.4), lueur * 0.35);
        if (dot(d, m) > 0.0 && ang < R * 1.6) {
          vec2 l = vec2(dot(d, droite), dot(d, haut)) / (R * 1.0);
          float r2 = dot(l, l);
          if (r2 < 1.0) {
            float z = sqrt(1.0 - r2), psi = 6.2831853 * uLune.z;
            float eclaire = smoothstep(-0.03, 0.08, dot(vec3(l, z), vec3(sin(psi), 0.0, -cos(psi))));
            c = sur(c, mix(uBrume, uOs, 0.5 + 0.5 * z), mix(0.07, 1.0, eclaire));
          }
        }
        // une étoile filante : toutes les 7 s une chance sur deux, 0,9 s de vol, près de là où regarde la caméra
        float k = floor(uT / 7.0), tt = uT - k * 7.0;
        if (h(vec2(k, 1.3)) > 0.5 && tt < 0.9) {
          float a0 = uVue.x + (h(vec2(k, 2.1)) - 0.5) * 0.7, e0 = 0.15 + h(vec2(k, 3.7)) * 0.6, dir = (h(vec2(k, 5.9)) - 0.5) * 1.6;
          vec2 sens = normalize(vec2(sin(dir), -0.6 - 0.4 * h(vec2(k, 8.1))));
          vec2 p = vec2(atan(sin(az - a0), cos(az - a0)) * cos(e0), el - e0);
          vec2 tete = sens * tt * 0.3, queue = tete - sens * 0.05 * min(1.0, tt * 6.0);
          float dist = segment(p, queue, tete), x = clamp(dot(p - queue, tete - queue) / max(dot(tete - queue, tete - queue), 1e-6), 0.0, 1.0);
          c = sur(c, uOs, smoothstep(0.0025, 0.0006, dist) * (1.0 - tt / 0.9) * x);
        }
        // les nuages passent devant : sombres, éclaircis près de la lune
        c = sur(c, mix(uTerre, uBrume, clamp(lueur * 2.5, 0.0, 0.7)), nuage * 0.8);
        gl_FragColor = vec4(c.rgb, c.a * uVis);
      }`,
};
