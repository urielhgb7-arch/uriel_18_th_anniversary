import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Les lignes de temps, les six pierres, le gant.
 *
 * Trois partis pris qui expliquent tout le fichier :
 *
 * 1. LE GANT N'EST PAS DE LA GÉOMÉTRIE. Une main anatomique reconstruite en
 *    quelques milliers de triangles ne peut pas être crédible — c'était le
 *    défaut de la version précédente. Ici la silhouette est échantillonnée
 *    depuis un canvas 2D puis rendue en Points + InstancedMesh via
 *    ShaderMaterial. Elle passe d'hologramme à presque-réel en densifiant et en
 *    durcissant ses contours, ce qui est impossible avec un maillage plein.
 *
 * 2. BLOOM OBLIGATOIRE. Sans passe de bloom, un matériau émissif ressemble à du
 *    plastique coloré. C'est la vraie cause du rendu raté précédent, pas les
 *    couleurs. D'où EffectComposer + UnrealBloomPass, non négociable.
 *
 * 3. LES PIERRES SONT DE VRAIES FORMES 3D. Icosaèdres facettés en flatShading,
 *    avec réfraction (transmission) dès que l'appareil peut la payer. Posées
 *    comme des nœuds sur des branches divergentes, pas alignées sur un rail.
 *
 * Repère : +Y vers le haut, +Z vers la caméra, la main au centre.
 */

/* ── Palette ────────────────────────────────────────────────────────────────
   Les six teintes restent distinctes : ce sont les pierres, c'est le seul
   endroit du site qui a droit à de la chroma. Elles sont désaturées d'un cran
   par rapport au canon Marvel pour ne pas jurer avec le reste, quasi
   monochrome. Le gant, lui, ne connaît que l'or et le blanc. */
const STONE_COLORS = [0x5b8fd4, 0xd6b64a, 0xd45b52, 0x9068c4, 0x4fae74, 0xd98a4a];
const GOLD = new THREE.Color(0xc9a86a);
const HOLO = new THREE.Color(0x7fa8c9);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* ═══════════════════════════════════════════════════════════════════════════
   1. SILHOUETTE DE LA MAIN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Dessine la main dans un canvas puis en échantillonne les pixels.
 *
 * Pourquoi un canvas et pas une géométrie : on ne cherche pas un volume mais
 * une SILHOUETTE. Des capsules 2D qui se recouvrent donnent une union propre
 * sans travail de modélisation, et le canvas nous donne en prime la distance au
 * bord de chaque pixel — c'est elle qui sert à la fois de fausse profondeur et
 * de masque de durcissement des contours.
 *
 * Pose : poing de trois quarts, pouce et majeur en contact au sommet. La
 * position juste avant le claquement.
 */
function sampleHandSilhouette(count) {
  const W = 260;
  const H = 340;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /** Capsule = segment épais à bouts ronds. L'union des capsules fait la main. */
  const capsule = (x1, y1, x2, y2, r) => {
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  // Avant-bras, poignet, bracelet.
  capsule(128, 338, 130, 258, 30);
  capsule(130, 262, 131, 238, 35);

  // Paume : deux capsules croisées pour une masse un peu bombée.
  capsule(112, 232, 150, 232, 52);
  capsule(126, 250, 132, 196, 48);

  // Index, annulaire, auriculaire repliés contre la paume (dos de la main).
  capsule(96, 200, 100, 172, 21);
  capsule(100, 172, 116, 158, 19);
  capsule(150, 198, 154, 172, 20);
  capsule(154, 172, 142, 158, 18);
  capsule(172, 204, 176, 184, 17);
  capsule(176, 184, 166, 172, 15);

  // Majeur : sort de la paume et remonte vers le point de contact.
  capsule(128, 196, 122, 150, 20);
  capsule(122, 150, 118, 118, 18);

  // Pouce : part du bas-gauche, croise devant et rejoint le majeur au sommet.
  capsule(88, 226, 92, 178, 24);
  capsule(92, 178, 110, 132, 20);
  // Le contact lui-même, légèrement renflé : c'est le point qui va claquer.
  capsule(110, 132, 116, 120, 17);

  const data = ctx.getImageData(0, 0, W, H).data;
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3]);

  // Pixels intérieurs, puis mélange : un sous-échantillon régulier laisserait
  // apparaître la trame du canvas dans le nuage de points.
  const inside = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (alphaAt(x, y) > 128) inside.push((y << 12) | x);
    }
  }
  for (let i = inside.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [inside[i], inside[j]] = [inside[j], inside[i]];
  }

  const n = Math.min(count, inside.length);
  const pos = new Float32Array(n * 3);
  const scatter = new Float32Array(n * 3);
  const edge = new Float32Array(n);
  const seed = new Float32Array(n);

  /* Distance au bord, en 8 directions jusqu'à 15px. Sert à deux choses :
     l'épaisseur de la dalle en Z (épaisse au centre, nulle au bord) et le
     durcissement des contours en fin de matérialisation. */
  const RING = 15;
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const edgeDist = (x, y) => {
    for (let r = 1; r <= RING; r++) {
      for (const [dx, dy] of DIRS) {
        if (alphaAt(x + dx * r, y + dy * r) <= 128) return r / RING;
      }
    }
    return 1;
  };

  // Cadrage monde : ~1.9 unité de haut, centrée sur la paume et non sur la boîte.
  const SCALE = 1.9 / H;
  const CX = 128;
  const CY = 186;

  for (let i = 0; i < n; i++) {
    const px = inside[i] & 0xfff;
    const py = inside[i] >> 12;
    const d = edgeDist(px, py);

    const wx = (px - CX) * SCALE;
    const wy = -(py - CY) * SCALE; // canvas : y vers le bas
    // Dalle : la profondeur suit la distance au bord, donc la rotation produit
    // une vraie parallaxe au lieu d'un plan qui se retourne.
    const wz = (Math.random() - 0.5) * 0.46 * Math.pow(d, 0.65);

    pos[i * 3] = wx;
    pos[i * 3 + 1] = wy;
    pos[i * 3 + 2] = wz;

    // Position d'hologramme : dispersion radiale autour de la cible.
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const rad = 0.3 + Math.random() * 0.85;
    scatter[i * 3] = Math.sin(b) * Math.cos(a) * rad;
    scatter[i * 3 + 1] = Math.sin(b) * Math.sin(a) * rad * 0.8;
    scatter[i * 3 + 2] = Math.cos(b) * rad * 0.7;

    edge[i] = 1 - d; // 1 = sur le contour
    seed[i] = Math.random();
  }

  return { pos, scatter, edge, seed, count: n };
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LE GANT — Points + InstancedMesh
   ═══════════════════════════════════════════════════════════════════════════ */

const HAND_VERT = /* glsl */ `
  attribute vec3 aScatter;
  attribute float aEdge;
  attribute float aSeed;

  uniform float uTime;
  uniform float uMaterial;   // 0 = hologramme diffus, 1 = presque réel
  uniform float uDissolve;   // 0 → 1 pendant l'effondrement
  uniform float uSize;

  varying float vEdge;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vEdge = aEdge;
    vSeed = aSeed;

    // Chaque point a son propre seuil : le nuage se densifie par paliers au fil
    // des six pierres au lieu d'apparaître d'un bloc.
    float born = smoothstep(aSeed * 0.9, aSeed * 0.9 + 0.22, uMaterial);

    // Dérive lente tant que c'est un hologramme, nulle une fois matérialisé.
    vec3 drift = vec3(
      sin(uTime * 0.6 + aSeed * 21.0),
      cos(uTime * 0.5 + aSeed * 17.0),
      sin(uTime * 0.44 + aSeed * 13.0)
    ) * 0.055 * (1.0 - uMaterial);

    vec3 p = mix(position + aScatter, position, smoothstep(0.0, 1.0, uMaterial)) + drift;

    // Effondrement : les points s'échappent le long de leur propre dispersion.
    p += aScatter * uDissolve * 2.6;
    p.y += uDissolve * uDissolve * 1.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Balayage vertical : une ligne de scan qui monte, signature de l'hologramme.
    float scan = smoothstep(0.92, 1.0, sin(p.y * 5.5 - uTime * 2.2) * 0.5 + 0.5);

    // Les points de contour grossissent et gagnent en opacité à la fin : c'est
    // ce durcissement qui fait basculer la lecture d'« hologramme » à « objet ».
    float edgeBoost = 1.0 + aEdge * uMaterial * 1.5;
    float size = uSize * edgeBoost * (1.0 + scan * 0.8) * (0.55 + uMaterial * 0.6);

    gl_PointSize = size * (300.0 / max(-mv.z, 0.001));
    gl_Position = projectionMatrix * mv;

    vAlpha = born * (1.0 - uDissolve) * (0.32 + uMaterial * 0.68 + scan * 0.35);
  }
`;

const HAND_FRAG = /* glsl */ `
  uniform vec3 uHolo;
  uniform vec3 uGold;
  uniform float uMaterial;

  varying float vEdge;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    // Sprite rond adouci. Sans ça, des carrés additifs font une bouillie.
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float fall = 1.0 - smoothstep(0.0, 0.25, r);

    // L'hologramme est froid, le presque-réel est or. Les contours virent à l'or
    // en premier : la silhouette se dessine avant que la masse ne se remplisse.
    vec3 col = mix(uHolo, uGold, clamp(uMaterial * (0.45 + vEdge * 0.75), 0.0, 1.0));
    col += vEdge * uMaterial * 0.35;

    gl_FragColor = vec4(col, vAlpha * fall);
  }
`;

function buildHand(tier) {
  const count = tier === 'low' ? 3200 : tier === 'mid' ? 6000 : 9000;
  const s = sampleHandSilhouette(count);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(s.pos, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(s.scatter, 3));
  geo.setAttribute('aEdge', new THREE.BufferAttribute(s.edge, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(s.seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMaterial: { value: 0 },
    uDissolve: { value: 0 },
    uSize: { value: tier === 'low' ? 2.4 : 2.0 },
    uHolo: { value: HOLO.clone() },
    uGold: { value: GOLD.clone() },
  };

  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: HAND_VERT,
      fragmentShader: HAND_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;

  /* Facettes : quelques centaines d'octaèdres métalliques posés sur les points
     intérieurs. Ils écrivent dans le depth buffer, donc ils occultent vraiment
     — c'est ce qui donne la matière que des points additifs seuls n'ont pas, et
     ce qui permet au texte de passer DERRIÈRE la main. */
  const maxFacets = tier === 'low' ? 0 : tier === 'mid' ? 240 : 420;
  let facets = null;
  const facetSeeds = [];

  if (maxFacets > 0) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a7550,
      metalness: 1,
      roughness: 0.34,
      emissive: GOLD.clone().multiplyScalar(0.22),
    });
    facets = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.052, 0), mat, maxFacets);
    facets.frustumCulled = false;
    facets.count = maxFacets;

    // On privilégie les points de cœur : les facettes forment la masse, les
    // points forment le halo et le contour.
    const pool = [];
    for (let i = 0; i < s.count; i++) if (s.edge[i] < 0.45) pool.push(i);
    for (let k = 0; k < maxFacets; k++) {
      const i = pool[(Math.random() * pool.length) | 0] ?? 0;
      facetSeeds.push({
        x: s.pos[i * 3],
        y: s.pos[i * 3 + 1],
        z: s.pos[i * 3 + 2],
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        threshold: 0.25 + Math.random() * 0.7,
        scale: 0.6 + Math.random() * 0.9,
      });
    }
  }

  return { points, uniforms, facets, facetSeeds, maxFacets };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LES LIGNES DE TEMPS
   ═══════════════════════════════════════════════════════════════════════════ */

const BRANCH_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * La branche s'allume DEPUIS la pierre et se propage vers ses deux extrémités.
 * uv.x est la coordonnée le long de la courbe, donc la propagation est une
 * simple distance à la position de la pierre.
 */
const BRANCH_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uLit;      // 0 → 1 : avancée de la propagation
  uniform float uAnchor;   // position de la pierre le long de la courbe
  uniform vec3  uColor;
  uniform float uFade;

  varying vec2 vUv;

  void main() {
    float d = abs(vUv.x - uAnchor);
    float front = uLit * 1.25;
    float lit = 1.0 - smoothstep(front - 0.08, front, d);

    // Base à peine visible : la ligne de temps existe avant d'être choisie.
    float base = 0.1;

    // Flux qui remonte la branche une fois allumée.
    float flow = sin(vUv.x * 26.0 - uTime * 3.4) * 0.5 + 0.5;
    flow = pow(flow, 3.0) * lit * 0.85;

    // Bords du tube plus sombres : donne le galbe, sinon le tube est un ruban plat.
    float round = sin(vUv.y * 3.14159);

    float a = (base + lit * 0.72 + flow) * round * uFade;
    vec3 col = uColor * (0.55 + lit * 0.9 + flow * 1.5);
    gl_FragColor = vec4(col, a);
  }
`;

/**
 * Le flux de temps : un tronc qui se ramifie en six branches divergentes.
 * Les pierres sont les nœuds. Format portrait, donc la divergence est surtout
 * verticale — six branches étalées horizontalement sortiraient du cadre.
 */
function buildTimelines(tier) {
  const group = new THREE.Group();

  /* Le tronc dépasse volontairement du cadre en haut et en bas : le flux vient
     de plus loin que ce qu'on en voit. Seules les pierres doivent rester dans le
     champ — à z=0, la hauteur visible est d'environ 3,3 unités et la largeur
     d'environ 2,4 en portrait, ce qui borne tout ce qui suit. */
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, -2.6, -1.0),
    new THREE.Vector3(-0.14, -1.56, -0.66),
    new THREE.Vector3(0.1, -0.52, -0.38),
    new THREE.Vector3(-0.05, 0.52, -0.3),
    new THREE.Vector3(0.12, 1.56, -0.5),
    new THREE.Vector3(-0.02, 2.6, -0.86),
  ]);

  const radial = tier === 'low' ? 4 : 6;
  const tubular = tier === 'low' ? 60 : 110;

  const trunkMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLit: { value: 0.12 },
      uAnchor: { value: 0.5 },
      uColor: { value: new THREE.Color(0xa9b7c9) },
      uFade: { value: 1 },
    },
    vertexShader: BRANCH_VERT,
    fragmentShader: BRANCH_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(trunk, tubular, 0.018, radial, false), trunkMat));

  /* Six branches, alternées de part et d'autre du tronc et de plus en plus
     rasantes à mesure qu'on monte. `at` = départ sur le tronc, `dir` = côté.
     Les valeurs sont calées pour que la pierre — posée à 80 % de la branche —
     tombe dans |x| < 0.95 et |y| < 1.2 : au-delà, en portrait, elle sort du
     champ et devient intouchable. La branche, elle, continue au-delà. */
  const SPECS = [
    { at: 0.2, dir: -1, dx: 1.04, dy: 0.7, dz: 0.4 },
    { at: 0.3, dir: 1, dx: 1.08, dy: 0.5, dz: 0.18 },
    { at: 0.4, dir: -1, dx: 1.0, dy: 0.45, dz: -0.28 },
    { at: 0.5, dir: 1, dx: 0.98, dy: 0.33, dz: 0.45 },
    { at: 0.6, dir: -1, dx: 1.02, dy: 0.28, dz: 0.12 },
    { at: 0.7, dir: 1, dx: 1.06, dy: 0.13, dz: -0.22 },
  ];

  const branches = [];
  const STONE_AT = 0.8; // la pierre n'est pas au bout : la branche continue après

  SPECS.forEach((spec, i) => {
    const origin = trunk.getPointAt(spec.at);
    const end = new THREE.Vector3(
      origin.x + spec.dir * spec.dx,
      origin.y + spec.dy,
      origin.z + spec.dz,
    );
    const mid = new THREE.Vector3(
      origin.x + spec.dir * spec.dx * 0.45,
      origin.y + spec.dy * 0.34,
      origin.z + spec.dz * 0.6,
    );

    const curve = new THREE.CatmullRomCurve3([origin.clone(), mid, end]);
    const color = new THREE.Color(STONE_COLORS[i]);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLit: { value: 0 },
        uAnchor: { value: STONE_AT },
        uColor: { value: color },
        uFade: { value: 1 },
      },
      vertexShader: BRANCH_VERT,
      fragmentShader: BRANCH_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubular, 0.013, radial, false),
      mat,
    );
    group.add(mesh);
    branches.push({ mesh, mat, curve, anchor: curve.getPointAt(STONE_AT), color });
  });

  return { group, branches, trunkMat };
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LES PIERRES — vraies formes 3D
   ═══════════════════════════════════════════════════════════════════════════ */

/** Environnement peint : sans IBL, le métal et le verre rendent noirs. */
function makeEnvironment(renderer) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2a2a33');
  g.addColorStop(0.45, '#14141b');
  g.addColorStop(0.7, '#0a0a0f');
  g.addColorStop(1, '#1a1712');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  for (const [x, y, r, c] of [
    [130, 54, 74, 'rgba(255,240,215,0.95)'],
    [372, 44, 56, 'rgba(200,220,255,0.7)'],
    [256, 206, 96, 'rgba(201,168,106,0.38)'],
  ]) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.Texture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

/**
 * Une pierre = icosaèdre facetté. flatShading est ce qui donne les facettes :
 * sans lui, un icosaèdre subdivisé rend comme une boule lisse.
 * La réfraction (transmission) coûte une passe de rendu supplémentaire par
 * objet, donc elle est réservée au tier haut.
 */
function buildStones(env, tier, branches) {
  const stones = [];
  const refract = tier === 'high';

  branches.forEach((b, i) => {
    const color = new THREE.Color(STONE_COLORS[i]);

    const mat = refract
      ? new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.55,
          metalness: 0,
          roughness: 0.06,
          transmission: 0.92,
          ior: 2.2,
          thickness: 0.5,
          envMap: env,
          envMapIntensity: 2.2,
          flatShading: true,
        })
      : new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.95,
          metalness: 0.15,
          roughness: 0.1,
          envMap: env,
          envMapIntensity: 1.9,
          flatShading: true,
        });

    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.125, 0), mat);
    gem.position.copy(b.anchor);

    // Halo additif : la pierre doit éclairer le vide autour d'elle.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 9),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.copy(gem.position);

    stones.push({
      gem,
      halo,
      mat,
      color,
      home: b.anchor.clone(),
      spin: 0.3 + Math.random() * 0.5,
      taken: false,
      /* Avancée vers l'écran : la pierre vient se placer devant le regard. */
      approach: 0,
    });
  });

  return stones;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. CONSTELLATIONS (l'effondrement)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildConstellation(side, tier) {
  const n = tier === 'low' ? 90 : 170;
  const pos = new Float32Array(n * 3);
  const pts = [];

  for (let i = 0; i < n; i++) {
    /* Bornes calées sur le champ de la caméra : en portrait la demi-largeur
       visible ne fait que ~1.24 unité, donc une constellation à |x| > 2 serait
       simplement hors cadre. Elle longe les bords sans les franchir.
       Y couvre toute la course de la descente (0 → -7.7). */
    const x = side * (0.78 + Math.random() * 0.95);
    const y = -8 + Math.random() * 11;
    const z = -1.4 + Math.random() * 1.8;
    pos.set([x, y, z], i * 3);
    pts.push(new THREE.Vector3(x, y, z));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xdfe6f0,
      size: 0.036,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );

  // Quelques segments entre voisins proches : c'est ce qui fait « constellation »
  // plutôt que « poussière ».
  const seg = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (pts[i].distanceTo(pts[j]) < 0.78 && Math.random() < 0.22) {
        seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
        break;
      }
    }
  }
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3));
  const lines = new THREE.LineSegments(
    lgeo,
    new THREE.LineBasicMaterial({
      color: 0x9fb2c9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  return { stars, lines };
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LE TEXTE EN DEUX PLANS DE PROFONDEUR
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Texte rendu en texture, posé sur un plan DANS la scène.
 *
 * C'est le point clé de la cinématique : « And me… » est placé derrière la main
 * en Z, « I am Uriel. » devant. Les facettes de la main écrivent dans le depth
 * buffer, donc elles occultent réellement le plan arrière. Ce feuilletage est
 * trivial ici et impossible avec du texte DOM par-dessus un canvas.
 */
function makeTextPlane(text, { font, size, color, width }) {
  const cv = document.createElement('canvas');
  const dpr = 2;
  cv.width = 1024 * dpr;
  cv.height = 256 * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.fillText(text, 512, 128);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), mat);
  mesh.scale.setScalar(size);
  return { mesh, mat, tex };
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. MONTAGE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @param {'low'|'mid'|'high'} opts.tier
 * @param {boolean} opts.reduced
 * @param {{current:{x:number,y:number}}} opts.tilt
 * @param {(i:number)=>void} opts.onStoneTap
 * @param {()=>void} opts.onFlash
 * @param {(line:number)=>void} opts.onLine
 * @param {()=>void} opts.onCollapse
 * @param {()=>void} opts.onDone
 */
export function mountGauntlet(canvas, opts = {}) {
  const {
    tier = 'high',
    reduced = false,
    tilt,
    onStoneTap,
    onFlash,
    onLine,
    onCollapse,
    onDone,
  } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', alpha: false });
  } catch {
    return null;
  }

  const W = () => canvas.clientWidth || 1;
  const H = () => canvas.clientHeight || 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1 : 1.75));
  renderer.setSize(W(), H(), false);
  renderer.setClearColor(0x06060a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 60);
  camera.position.set(0, 0, 4.3);

  const env = makeEnvironment(renderer);
  scene.environment = env;

  scene.add(new THREE.AmbientLight(0x3a3a48, 1.1));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
  key.position.set(-2.4, 2.8, 2.6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb0d8, 1.5);
  rim.position.set(2.8, -1, -1.8);
  scene.add(rim);

  // ── Contenu ──
  const timelines = buildTimelines(tier);
  scene.add(timelines.group);

  const stones = buildStones(env, tier, timelines.branches);
  for (const s of stones) {
    scene.add(s.halo);
    scene.add(s.gem);
  }

  const hand = buildHand(tier);
  const handGroup = new THREE.Group();
  handGroup.add(hand.points);
  if (hand.facets) handGroup.add(hand.facets);
  /* La main démarre petite et lointaine : elle grandit et s'approche à chaque
     pierre. La collecte n'est pas un compteur, c'est une matérialisation. */
  handGroup.position.set(0, -0.1, -1.3);
  handGroup.scale.setScalar(0.62);
  scene.add(handGroup);

  const constL = buildConstellation(-1, tier);
  const constR = buildConstellation(1, tier);
  for (const c of [constL, constR]) {
    scene.add(c.stars);
    scene.add(c.lines);
  }

  // ── Texte : créé après le chargement des polices, sinon fallback système ──
  let textBack = null;
  let textFront = null;
  let textReady = false;

  const buildText = () => {
    textBack = makeTextPlane('And me…', {
      font: '300 76px Sentient, Georgia, serif',
      size: 1,
      color: 'rgba(190,205,225,0.92)',
      width: 3.6,
    });
    // Derrière la main : les facettes l'occultent réellement.
    textBack.mesh.position.set(0, 0.62, -1.15);
    scene.add(textBack.mesh);

    textFront = makeTextPlane('I am Uriel.', {
      font: '400 92px Sentient, Georgia, serif',
      size: 1,
      color: 'rgba(255,248,235,0.98)',
      width: 3.9,
    });
    // Devant la main.
    textFront.mesh.position.set(0, -0.5, 1.5);
    scene.add(textFront.mesh);

    textReady = true;
  };

  if (document.fonts?.ready) document.fonts.ready.then(buildText).catch(buildText);
  else buildText();

  // ── Post-traitement : LE point décisif ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(W(), H()),
    tier === 'low' ? 0.5 : 0.78, // force
    0.85, // rayon
    0.2, // seuil bas : l'hologramme doit émettre, pas seulement les pierres
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setSize(W(), H());

  /* ── Chorégraphie ──────────────────────────────────────────────────────── */
  let phase = 'collect'; // collect → charge → strike → collapse → done
  let phaseT = 0;
  let collected = 0;
  let material = 0; // matérialisation visée (0 → 1)
  let flashed = false;
  let finished = false;
  let collapseCalled = false;
  let line = 0;
  let lineTimer = 0;

  const CHARGE = 3.2;
  const STRIKE = 0.16;
  const COLLAPSE = 4.2;

  let raf = 0;
  let dead = false;
  const clock = new THREE.Clock();
  const sm = { x: 0, y: 0 };
  const camBase = camera.position.clone();

  const resize = () => {
    const w = W();
    const h = H();
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    // setSize propage aux passes, dont la résolution du bloom.
    composer.setSize(w, h);
  };
  window.addEventListener('resize', resize);
  resize();

  /* ── Tap sur une pierre ────────────────────────────────────────────────────
     Projection écran plutôt que Raycaster : les pierres font 0.125 d'unité, soit
     une cible de quelques pixels sur mobile. On prend la plus proche du doigt
     dans un rayon généreux — plus fiable qu'un rayon qui doit toucher la
     géométrie exacte. */
  const pick = (clientX, clientY) => {
    if (phase !== 'collect') return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    let best = -1;
    let bestD = 60; // px
    const v = new THREE.Vector3();

    stones.forEach((s, i) => {
      if (s.taken) return;
      v.copy(s.gem.position).project(camera);
      const sx = (v.x * 0.5 + 0.5) * rect.width;
      const sy = (-v.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(sx - px, sy - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });

    if (best >= 0) onStoneTap?.(best);
  };

  const onPointer = (e) => pick(e.clientX, e.clientY);
  canvas.addEventListener('pointerdown', onPointer);

  const onLost = (e) => {
    e.preventDefault();
    dead = true;
    cancelAnimationFrame(raf);
    if (!finished) {
      finished = true;
      onFlash?.();
      onDone?.();
    }
  };
  canvas.addEventListener('webglcontextlost', onLost);

  /* ── Boucle ─────────────────────────────────────────────────────────────── */
  const tmpMat = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpV = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  let lastFacetMat = -1;

  const frame = () => {
    if (dead) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    phaseT += dt;

    const tl = tilt?.current ?? { x: 0, y: 0 };
    sm.x += (tl.x - sm.x) * 0.05;
    sm.y += (tl.y - sm.y) * 0.05;

    hand.uniforms.uTime.value = t;
    timelines.trunkMat.uniforms.uTime.value = t;
    for (const b of timelines.branches) b.mat.uniforms.uTime.value = t;

    // Matérialisation : suit la cible en douceur, jamais par saut.
    const cur = hand.uniforms.uMaterial.value;
    hand.uniforms.uMaterial.value = lerp(cur, material, 0.045);
    const m = hand.uniforms.uMaterial.value;

    // La main grandit et s'avance avec la matérialisation.
    handGroup.scale.setScalar(lerp(0.62, 1.0, smooth(m)));
    handGroup.position.z = lerp(-1.3, 0, smooth(m));

    // Facettes : mises à jour seulement quand la matérialisation bouge.
    if (hand.facets && Math.abs(m - lastFacetMat) > 0.002) {
      lastFacetMat = m;
      for (let k = 0; k < hand.maxFacets; k++) {
        const f = hand.facetSeeds[k];
        const g = clamp01((m - f.threshold) / 0.3);
        const s = g * f.scale;
        tmpE.set(f.rx + t * 0.12, f.ry + t * 0.16, 0);
        tmpQ.setFromEuler(tmpE);
        tmpV.set(f.x, f.y, f.z);
        tmpS.setScalar(s);
        tmpMat.compose(tmpV, tmpQ, tmpS);
        hand.facets.setMatrixAt(k, tmpMat);
      }
      hand.facets.instanceMatrix.needsUpdate = true;
    }

    // Pierres : rotation propre, halo qui respire, avancée vers l'écran.
    stones.forEach((s, i) => {
      s.gem.rotation.y += dt * s.spin;
      s.gem.rotation.x += dt * s.spin * 0.4;

      const pulse = 0.85 + Math.sin(t * 1.4 + i * 1.1) * 0.25;
      s.mat.emissiveIntensity = (s.taken ? 1.8 : 0.55) * pulse;
      s.halo.material.opacity = (s.taken ? 0.26 : 0.1) * pulse;

      if (s.taken && s.approach < 1) s.approach = Math.min(1, s.approach + dt * 0.55);

      /* Vraie profondeur Z : la pierre quitte sa branche et vient se placer
         devant le regard, puis se range près de la main. */
      const a = easeOut(s.approach);
      const fwd = new THREE.Vector3(
        lerp(s.home.x, s.home.x * 0.18, a),
        lerp(s.home.y, s.home.y * 0.2, a),
        lerp(s.home.z, 2.1, Math.sin(a * Math.PI) * 0.9 + a * 0.1),
      );
      s.gem.position.copy(fwd);
      s.halo.position.copy(fwd);
      s.gem.scale.setScalar(1 + Math.sin(a * Math.PI) * 0.7);

      // Propagation de la lumière sur la branche, depuis la pierre.
      const b = timelines.branches[i];
      const target = s.taken ? 1 : 0;
      b.mat.uniforms.uLit.value = lerp(b.mat.uniforms.uLit.value, target, 0.035);
    });

    timelines.trunkMat.uniforms.uLit.value = lerp(
      timelines.trunkMat.uniforms.uLit.value,
      0.12 + (collected / 6) * 0.88,
      0.03,
    );

    if (phase === 'collect') {
      handGroup.rotation.y = Math.sin(t * 0.34) * 0.26 + sm.x * 0.3;
      handGroup.rotation.x = Math.sin(t * 0.27) * 0.1 + sm.y * 0.2;
      handGroup.position.y = -0.1 + Math.sin(t * 0.6) * 0.05;
      bloom.strength = (tier === 'low' ? 0.5 : 0.78) + m * 0.32;
    } else if (phase === 'charge') {
      const k = clamp01(phaseT / CHARGE);

      handGroup.rotation.y = lerp(handGroup.rotation.y, sm.x * 0.16, 0.04);
      handGroup.rotation.x = lerp(handGroup.rotation.x, -0.08 + sm.y * 0.1, 0.04);

      // Tremblement croissant.
      const shake = easeIn(k) * 0.02;
      handGroup.position.x = (Math.random() - 0.5) * shake;
      handGroup.position.y = -0.1 + (Math.random() - 0.5) * shake;

      bloom.strength = (tier === 'low' ? 0.5 : 0.78) + 0.32 + easeIn(k) * 1.5;

      // Les deux répliques, en deux plans de profondeur.
      if (textReady) {
        if (line >= 1) textBack.mat.opacity = Math.min(1, textBack.mat.opacity + dt * 1.6);
        if (line >= 2) textFront.mat.opacity = Math.min(1, textFront.mat.opacity + dt * 2.2);
        // Léger travelling : la parallaxe entre les deux plans se voit.
        camera.position.x = Math.sin(t * 0.5) * 0.12;
        camera.position.y = Math.sin(t * 0.38) * 0.07;
        camera.lookAt(0, 0, 0);
      }

      if (phaseT >= CHARGE) {
        phase = 'strike';
        phaseT = 0;
      }
    } else if (phase === 'strike') {
      const k = clamp01(phaseT / STRIKE);
      handGroup.rotation.z = Math.sin(k * Math.PI) * 0.12;
      bloom.strength = 2.6;

      if (k >= 1) {
        phase = 'collapse';
        phaseT = 0;
        if (!flashed) {
          flashed = true;
          onFlash?.();
        }
      }
    } else if (phase === 'collapse') {
      const k = clamp01(phaseT / COLLAPSE);

      if (!collapseCalled) {
        collapseCalled = true;
        onCollapse?.();
      }

      // L'EFFONDREMENT : la caméra descend, le décor remonte plus vite encore.
      // C'est la descente vue sur le site de référence — un travelling, pas un
      // scroll : rien ne défile, c'est l'espace qui s'écoule vers le haut.
      const d = easeIn(k);
      camera.position.y = camBase.y - d * 5.5;
      camera.position.z = lerp(camBase.z, 5.6, d);
      camera.lookAt(0, camera.position.y + 0.6, 0);

      timelines.group.position.y = d * 7.5;
      handGroup.position.y = -0.1 + d * 4.2;

      // La main se défait le long de sa propre dispersion.
      hand.uniforms.uDissolve.value = easeIn(k);

      // Les constellations montent sur les côtés.
      /* Les constellations restent quasi immobiles : c'est la caméra qui
         descend. Un léger contre-mouvement suffit à les placer en arrière-plan
         — les décaler autant que la caméra annulerait la descente. */
      const fade = Math.sin(clamp01(k / 0.85) * Math.PI);
      for (const c of [constL, constR]) {
        c.stars.material.opacity = fade * 0.9;
        c.lines.material.opacity = fade * 0.4;
        c.stars.position.y = -d * 0.6;
        c.lines.position.y = -d * 0.6;
      }

      // Les pierres et les branches s'éteignent.
      const out = 1 - clamp01(k / 0.6);
      timelines.trunkMat.uniforms.uFade.value = out;
      for (const b of timelines.branches) b.mat.uniforms.uFade.value = out;
      stones.forEach((s) => {
        s.gem.scale.setScalar(out * 1.2);
        s.halo.material.opacity *= out;
      });

      if (textReady) {
        textBack.mat.opacity *= 1 - clamp01(k / 0.3);
        textFront.mat.opacity *= 1 - clamp01(k / 0.5);
        textBack.mesh.position.y += d * 0.02;
        textFront.mesh.position.y += d * 0.03;
      }

      bloom.strength = lerp(2.6, 0.4, easeOut(k));

      if (k >= 1 && !finished) {
        finished = true;
        phase = 'done';
        onDone?.();
      }
    }

    composer.render();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const teardown = () => {
    dead = true;
    cancelAnimationFrame(raf);
    clearTimeout(lineTimer);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', onPointer);
    canvas.removeEventListener('webglcontextlost', onLost);
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      const mm = obj.material;
      if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
      else mm?.dispose();
    });
    textBack?.tex.dispose();
    textFront?.tex.dispose();
    env.dispose();
    composer.dispose?.();
    renderer.dispose();
  };

  return {
    /** Une pierre de plus : la main avance d'un degré de réel. */
    collect(i) {
      if (stones[i]?.taken) return;
      stones[i].taken = true;
      collected += 1;
      material = collected / 6;
      if (reduced) {
        hand.uniforms.uMaterial.value = material;
        stones[i].approach = 1;
      }
    },

    /** Lance la cinématique. */
    snap() {
      if (phase !== 'collect') return;

      if (reduced) {
        // Mouvement réduit : on livre le résultat sans chorégraphie.
        if (!flashed) {
          flashed = true;
          onFlash?.();
        }
        onLine?.(2);
        onCollapse?.();
        if (!finished) {
          finished = true;
          handGroup.visible = false;
          onDone?.();
        }
        return;
      }

      phase = 'charge';
      phaseT = 0;

      // « Et moi… » derrière la main, puis « Je suis Uriel. » devant.
      line = 1;
      onLine?.(1);
      lineTimer = setTimeout(() => {
        if (dead) return;
        line = 2;
        onLine?.(2);
      }, 1500);
    },

    /** Le bouton « passer » : on saute à la fin sans casser l'état. */
    skip() {
      if (finished) return;
      clearTimeout(lineTimer);
      if (!flashed) {
        flashed = true;
        onFlash?.();
      }
      if (!collapseCalled) {
        collapseCalled = true;
        onCollapse?.();
      }
      finished = true;
      phase = 'done';
      onDone?.();
    },

    destroy: teardown,
  };
}
