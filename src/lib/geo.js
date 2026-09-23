/**
 * Masque continental basse résolution, en [longitude, latitude].
 *
 * Sert à générer une texture équirectangulaire au runtime, échantillonnée
 * ensuite en grille de points sur le globe. Comme le rendu final est un nuage
 * de points et non un trait de côte, une silhouette juste suffit : les
 * approximations disparaissent à la discrétisation.
 *
 * L'Afrique est tracée plus finement que le reste — c'est la cible du vol de
 * caméra, elle doit se reconnaître au premier regard. Les mers intérieures
 * (Méditerranée, mer Noire) sont exclues en contournant leurs rives plutôt
 * qu'en perçant des trous : l'Europe et l'Asie sont deux polygones distincts
 * qui se recouvrent, et leur union redonne l'Eurasie.
 */

export const LANDMASSES = [
  // ── Afrique (tracé fin) ────────────────────────────────────────────────────
  [
    [10, 37], [15, 32], [20, 31], [25, 32], [30, 31], [33, 28],
    [35, 24], [37, 18], [39, 15], [43, 11], [48, 11], [51, 12],
    [48, 5], [45, 2], [40, -3], [39, -7], [40, -14], [35, -20],
    [33, -25], [32, -29], [28, -32], [25, -34], [20, -34.8], [18, -34],
    [15, -27], [13, -23], [12, -18], [12, -13], [13, -9], [12, -6],
    [9, -1], [9, 1], [9, 4], [8, 4], [5, 5], [3, 6],
    [0, 5.5], [-3, 5], [-7, 4.5], [-9, 6], [-11, 7], [-13, 9],
    [-15, 11], [-17, 14.7], [-16, 20], [-13, 24], [-11, 26], [-10, 30],
    [-9, 32], [-6, 35.8], [0, 36], [5, 37],
  ],

  // Madagascar : très visible depuis l'orbite africaine, à ne pas omettre.
  [[43, -12], [50, -15], [50, -25], [45, -25], [43, -20]],

  // ── Europe (Méditerranée contournée) ───────────────────────────────────────
  [
    [-9, 38], [-9, 43], [-2, 43], [-1, 46], [-4.5, 48], [2, 51],
    [8, 54], [8, 57], [5, 59], [5, 62], [11, 64], [15, 68],
    [21, 70], [28, 71], [32, 68], [40, 66], [45, 60], [48, 52],
    [48, 46], [40, 44], [30, 45], [28, 44], [24, 43], [23, 40],
    [21, 38], [24, 36], [20, 40], [16, 41], [14, 38], [12, 44],
    [7, 44], [3, 43], [0, 40], [-6, 36],
  ],
  [[-5, 50], [-2, 51], [1, 52], [-1, 54], [-3, 56], [-5, 58], [-7, 56], [-6, 52]], // Îles Britanniques

  // ── Asie ───────────────────────────────────────────────────────────────────
  [
    [28, 41], [36, 36], [35, 31], [34, 28], [38, 22], [43, 13],
    [52, 16], [59, 22], [56, 26], [50, 29], [48, 30], [57, 25],
    [61, 25], [67, 24], [70, 22], [73, 16], [77, 8], [80, 13],
    [84, 19], [88, 21], [92, 21], [98, 16], [104, 10], [109, 11],
    [108, 18], [110, 21], [117, 23], [122, 31], [122, 39], [126, 40],
    [131, 43], [141, 45], [143, 53], [155, 58], [163, 60], [170, 66],
    [179, 66], [170, 70], [160, 70], [145, 72], [130, 73], [115, 74],
    [100, 77], [85, 74], [70, 72], [60, 70], [50, 67], [45, 66],
    [45, 60], [48, 52], [48, 46], [40, 44], [33, 45], [30, 43],
  ],
  [[130, 31], [134, 34], [138, 35], [141, 38], [142, 41], [146, 44], [143, 43], [137, 36], [132, 33]], // Japon

  // ── Amériques ──────────────────────────────────────────────────────────────
  [
    [-165, 66], [-157, 71], [-145, 70], [-130, 70], [-115, 69], [-95, 68],
    [-85, 70], [-78, 73], [-70, 62], [-64, 60], [-56, 52], [-66, 45],
    [-74, 40], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 26],
    [-97, 20], [-92, 18], [-88, 21], [-83, 10], [-79, 9], [-95, 16],
    [-105, 20], [-110, 24], [-114, 32], [-121, 35], [-124, 42], [-128, 52],
    [-135, 58], [-150, 60], [-162, 58],
  ],
  [
    [-75, 11], [-71, 12], [-62, 10], [-52, 5], [-50, 0], [-44, -3],
    [-35, -6], [-39, -13], [-40, -20], [-48, -25], [-53, -34], [-57, -38],
    [-62, -40], [-65, -45], [-68, -52], [-71, -54], [-75, -50], [-74, -44],
    [-73, -37], [-71, -30], [-70, -20], [-71, -14], [-77, -10], [-81, -5],
    [-80, 0], [-78, 7],
  ],
  [[-45, 60], [-52, 65], [-55, 70], [-60, 76], [-45, 82], [-25, 82], [-20, 75], [-25, 70], [-38, 65]], // Groenland

  // ── Océanie ────────────────────────────────────────────────────────────────
  [
    [114, -22], [114, -33], [120, -34], [129, -32], [138, -35], [145, -38],
    [150, -37], [153, -28], [146, -19], [142, -11], [136, -12], [130, -12],
    [125, -14], [122, -18],
  ],
  [[131, -1], [141, -3], [150, -7], [147, -9], [140, -9], [134, -4]], // Nouvelle-Guinée
  [[95, 5], [100, 2], [106, -6], [102, -6], [96, 2]], // Sumatra
  [[109, 2], [119, 1], [117, -4], [110, -3]], // Bornéo
  [[172, -34], [178, -38], [175, -41], [170, -44], [166, -46], [170, -42]], // Nouvelle-Zélande

  // Antarctique : simple calotte, à peine visible mais son absence se remarque.
  [[-180, -90], [180, -90], [180, -70], [90, -68], [0, -72], [-90, -73], [-180, -72]],
];

/** Repères survolés pendant la descente, du plus large au plus précis. */
export const FLYBY_LABELS = [
  'Balayage orbital',
  'Continent africain',
  'Golfe de Guinée',
  'Bénin',
  'Cotonou',
];

/**
 * Trace les masses continentales sur un canvas équirectangulaire.
 * @returns {HTMLCanvasElement} canvas de `w`×`h`, terres en blanc sur noir.
 */
export function renderLandMask(w = 1024, h = 512) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';

  for (const poly of LANDMASSES) {
    ctx.beginPath();
    poly.forEach(([lng, lat], i) => {
      const x = ((lng + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }

  return cv;
}

/** Latitude/longitude en degrés → position cartésienne sur une sphère. */
export function latLngToVec3(lat, lng, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}
