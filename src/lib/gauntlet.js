import * as THREE from 'three';

/**
 * Le Gantelet — main métallique articulée, en three.js.
 *
 * Pourquoi procédural et pas un modèle GLTF : une main riggée pèse plusieurs
 * mégaoctets, et le brief impose la fluidité mobile. Ici la géométrie est
 * construite à partir de capsules et de boîtes arrondies (~4000 triangles), les
 * phalanges sont de vrais Groups imbriqués — donc l'articulation est réelle, pas
 * une illusion 2D — et le métal vient d'un environment map généré au runtime.
 * Zéro octet à télécharger.
 *
 * La désintégration finale échantillonne les sommets de la main pour en faire un
 * nuage de points : c'est la géométrie elle-même qui se défait, comme demandé.
 */

const STONES = [
  { key: 'space', color: 0x3b82f6 },
  { key: 'mind', color: 0xeab308 },
  { key: 'reality', color: 0xef4444 },
  { key: 'power', color: 0xa855f7 },
  { key: 'time', color: 0x22c55e },
  { key: 'soul', color: 0xf97316 },
];

/**
 * Environment map équirectangulaire généré en canvas.
 * Sans IBL, un MeshStandardMaterial métallique rend noir et plastique : c'est
 * lui qui fournit les reflets qui font lire le métal.
 */
function makeEnvironment(renderer) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const ctx = cv.getContext('2d');

  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0.0, '#2a2158'); // zénith violacé
  grd.addColorStop(0.42, '#120b2e');
  grd.addColorStop(0.62, '#05020a');
  grd.addColorStop(1.0, '#0b1626'); // sol bleuté
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 256);

  // Sources lumineuses peintes : deviennent des reflets spéculaires nets.
  const blobs = [
    [120, 60, 70, 'rgba(160,130,255,0.95)'],
    [370, 48, 58, 'rgba(120,210,255,0.85)'],
    [255, 210, 90, 'rgba(255,205,120,0.4)'],
  ];
  for (const [x, y, r, color] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
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
 * Segment de phalange.
 *
 * Le pivot est placé à la base et la géométrie décalée vers le haut : une
 * rotation du groupe fléchit donc autour de l'articulation, et non autour du
 * centre du segment. C'est ce détail qui rend le pliage crédible.
 */
function bone(len, rTop, rBot, mat) {
  const pivot = new THREE.Group();
  const geo = new THREE.CapsuleGeometry((rTop + rBot) / 2, len, 4, 10);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = len / 2;
  pivot.add(mesh);
  // `tip` : point d'attache de la phalange suivante.
  const tip = new THREE.Group();
  tip.position.y = len;
  pivot.add(tip);
  return { pivot, mesh, tip };
}

/** Doigt à trois phalanges, chaînées par leurs pivots. */
function finger({ lengths, radii, mat }) {
  const joints = [];
  let parent = null;
  let root = null;

  lengths.forEach((len, i) => {
    const seg = bone(len, radii[i + 1], radii[i], mat);
    if (parent) parent.add(seg.pivot);
    else root = seg.pivot;
    joints.push(seg);
    parent = seg.tip;
  });

  return { root, joints, tip: parent };
}

/** Construit la main entière. Repère : +Y vers les doigts, +Z vers la caméra. */
function buildHand(env) {
  const group = new THREE.Group();

  const plate = new THREE.MeshStandardMaterial({
    color: 0x6f5a9a,
    metalness: 1,
    roughness: 0.26,
    envMap: env,
    envMapIntensity: 1.5,
  });
  const joint = new THREE.MeshStandardMaterial({
    color: 0x2a1b44,
    metalness: 0.95,
    roughness: 0.45,
    envMap: env,
    envMapIntensity: 1.1,
  });

  // ── Avant-bras ──
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.62, 6, 20), plate);
  forearm.position.y = -0.72;
  group.add(forearm);

  // Bracelet : marque la jonction bras/main, casse la silhouette lisse.
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 10, 28), joint);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.y = -0.4;
  group.add(cuff);

  // ── Paume ──
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 0.29), plate);
  palm.position.y = -0.03;
  group.add(palm);

  // Dos de la main légèrement bombé : évite l'aspect « brique ».
  const knuckleBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.5, 4, 14), plate);
  knuckleBar.rotation.z = Math.PI / 2;
  knuckleBar.position.set(0, 0.3, 0.02);
  group.add(knuckleBar);

  // ── Doigts ──
  // x croissant vers l'auriculaire ; longueurs décroissantes hors majeur.
  const specs = [
    { name: 'index', x: -0.21, lengths: [0.2, 0.16, 0.11], tilt: -0.07 },
    { name: 'middle', x: -0.04, lengths: [0.23, 0.18, 0.12], tilt: 0 },
    { name: 'ring', x: 0.12, lengths: [0.21, 0.16, 0.11], tilt: 0.06 },
    { name: 'pinky', x: 0.26, lengths: [0.16, 0.12, 0.09], tilt: 0.14 },
  ];

  const fingers = {};
  for (const spec of specs) {
    const f = finger({ lengths: spec.lengths, radii: [0.085, 0.077, 0.068, 0.058], mat: plate });
    f.root.position.set(spec.x, 0.33, 0.015);
    f.root.rotation.z = -spec.tilt;
    group.add(f.root);
    fingers[spec.name] = f;
  }

  // ── Pouce : deux phalanges, écarté et pivoté vers l'avant ──
  const thumb = finger({ lengths: [0.22, 0.17], radii: [0.1, 0.088, 0.075], mat: plate });
  thumb.root.position.set(-0.3, -0.04, 0.09);
  thumb.root.rotation.set(-0.5, 0, 0.72);
  group.add(thumb.root);
  fingers.thumb = thumb;

  // ── Pierres ──
  // La pierre de l'Esprit occupe le dos de la main ; les cinq autres sont
  // serties sur les articulations, comme sur le gantelet d'origine.
  const stones = [];
  const stoneSlots = [
    { pos: [0, 0.02, 0.17], size: 0.088 }, // Esprit (centrale)
    { pos: [-0.21, 0.33, 0.1], size: 0.05 },
    { pos: [-0.04, 0.34, 0.11], size: 0.05 },
    { pos: [0.12, 0.33, 0.1], size: 0.05 },
    { pos: [0.26, 0.31, 0.09], size: 0.044 },
    { pos: [-0.3, -0.04, 0.19], size: 0.05 }, // base du pouce
  ];

  stoneSlots.forEach((slot, i) => {
    const def = STONES[i];
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.9,
      metalness: 0.1,
      roughness: 0.12,
      envMap: env,
      envMapIntensity: 1.8,
    });
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(slot.size, 1), mat);
    gem.position.set(...slot.pos);
    group.add(gem);

    // Halo additif : la pierre doit éclairer autour d'elle.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(slot.size * 2.1, 14, 10),
      new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.position.copy(gem.position);
    group.add(halo);

    // Point light : projette la couleur sur le métal voisin. Coûteux, donc
    // réservé à la pierre centrale.
    let light = null;
    if (i === 0) {
      light = new THREE.PointLight(def.color, 2.2, 1.6);
      light.position.copy(gem.position).add(new THREE.Vector3(0, 0, 0.12));
      group.add(light);
    }

    stones.push({ gem, halo, light, mat, base: slot.size });
  });

  return { group, fingers, stones, materials: [plate, joint] };
}

/**
 * Nuage de poussière échantillonné sur la géométrie de la main.
 *
 * On lit les sommets réels de chaque mesh et on les repasse en espace monde :
 * la poussière épouse donc exactement la silhouette au moment du claquement.
 * Un semis aléatoire dans une boîte donnerait un nuage informe.
 */
function buildDust(handGroup, count) {
  const sources = [];
  handGroup.updateMatrixWorld(true);
  handGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry?.attributes?.position) sources.push(obj);
  });
  if (!sources.length) return null;

  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const mesh = sources[(Math.random() * sources.length) | 0];
    const attr = mesh.geometry.attributes.position;
    const vi = (Math.random() * attr.count) | 0;
    v.fromBufferAttribute(attr, vi).applyMatrix4(mesh.matrixWorld);
    pos.set([v.x, v.y, v.z], i * 3);

    // Dispersion : vers le haut et la droite, comme un souffle qui emporte.
    vel.set(
      [
        (Math.random() - 0.5) * 0.5 + 0.34,
        Math.random() * 0.62 + 0.2,
        (Math.random() - 0.5) * 0.4,
      ],
      i * 3
    );

    tint.setHSL(0.72 + Math.random() * 0.1, 0.55, 0.45 + Math.random() * 0.35);
    col.set([tint.r, tint.g, tint.b], i * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  points.visible = false;
  return { points, vel, count };
}

/** Applique une pose de doigt : rotations X croissantes = flexion. */
function flex(f, a, b, c) {
  f.joints[0].pivot.rotation.x = a;
  if (f.joints[1]) f.joints[1].pivot.rotation.x = b;
  if (f.joints[2]) f.joints[2].pivot.rotation.x = c;
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;

/**
 * Monte la scène du gantelet.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object}   opts
 * @param {'low'|'mid'|'high'} opts.tier
 * @param {boolean}  opts.reduced
 * @param {{current:{x:number,y:number}}} opts.tilt
 * @param {()=>void} opts.onFlash       pic du claquement (flash blanc React)
 * @param {()=>void} opts.onDissolved   poussière dissipée
 * @returns {{snap:()=>void, destroy:()=>void}|null}
 */
export function mountGauntlet(canvas, opts = {}) {
  const { tier = 'high', reduced = false, tilt, onFlash, onDissolved } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1 : 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
  camera.position.set(0, 0.05, 3.15);

  const env = makeEnvironment(renderer);
  scene.environment = env;

  const hand = buildHand(env);
  scene.add(hand.group);

  // Éclairage d'appoint : l'IBL donne les reflets, ces lampes sculptent le relief.
  scene.add(new THREE.AmbientLight(0x4a3a7a, 0.7));
  const key = new THREE.DirectionalLight(0xc9b8ff, 2.4);
  key.position.set(-2.2, 2.6, 2.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fc3f7, 1.9);
  rim.position.set(2.6, -0.8, -1.6);
  scene.add(rim);

  const dust = buildDust(hand.group, tier === 'low' ? 900 : tier === 'mid' ? 1800 : 2800);
  if (dust) scene.add(dust.points);

  // Pose de départ : pouce et majeur en contact, prêts à claquer.
  const POSE_READY = {
    thumb: [-0.26, -0.5],
    middle: [0.42, 0.34, 0.2],
    index: [0.16, 0.2, 0.14],
    ring: [0.2, 0.24, 0.16],
    pinky: [0.26, 0.3, 0.2],
  };

  const applyReady = () => {
    flex(hand.fingers.thumb, POSE_READY.thumb[0], POSE_READY.thumb[1]);
    flex(hand.fingers.middle, ...POSE_READY.middle);
    flex(hand.fingers.index, ...POSE_READY.index);
    flex(hand.fingers.ring, ...POSE_READY.ring);
    flex(hand.fingers.pinky, ...POSE_READY.pinky);
  };
  applyReady();

  /** État de la chorégraphie. */
  let phase = 'idle'; // idle → charge → strike → dissolve → done
  let phaseT = 0;
  let flashed = false;
  let dissolved = false;

  const CHARGE = 2.6; // montée en énergie (s)
  const STRIKE = 0.14; // le claquement lui-même : très bref, c'est ce qui le rend sec
  const DISSOLVE = 3.2;

  let raf = 0;
  let dead = false;
  const clock = new THREE.Clock();
  const smooth = { x: 0, y: 0 };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', resize);
  resize();

  const onLost = (e) => {
    e.preventDefault();
    dead = true;
    cancelAnimationFrame(raf);
    // Le récit ne doit pas s'arrêter sur une perte de contexte.
    if (!dissolved) {
      dissolved = true;
      onFlash?.();
      onDissolved?.();
    }
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const frame = () => {
    if (dead) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    phaseT += dt;

    // Parallaxe : la main se tourne vers le regard quand on incline l'appareil.
    const tl = tilt?.current ?? { x: 0, y: 0 };
    smooth.x += (tl.x - smooth.x) * 0.05;
    smooth.y += (tl.y - smooth.y) * 0.05;

    if (phase === 'idle') {
      // Flottement : respiration lente, la main est vivante mais en attente.
      hand.group.rotation.y = Math.sin(t * 0.42) * 0.19 + smooth.x * 0.32;
      hand.group.rotation.x = Math.sin(t * 0.33) * 0.08 + smooth.y * 0.2;
      hand.group.position.y = Math.sin(t * 0.72) * 0.045;

      hand.stones.forEach((s, i) => {
        const pulse = 0.85 + Math.sin(t * 1.5 + i * 1.1) * 0.3;
        s.mat.emissiveIntensity = pulse;
        s.halo.scale.setScalar(0.95 + Math.sin(t * 1.5 + i * 1.1) * 0.12);
      });
    } else if (phase === 'charge') {
      const k = Math.min(phaseT / CHARGE, 1);

      // La main se redresse et s'avance : elle se prépare.
      hand.group.rotation.y = lerp(hand.group.rotation.y, smooth.x * 0.2, 0.05);
      hand.group.rotation.x = lerp(hand.group.rotation.x, -0.12 + smooth.y * 0.12, 0.05);
      hand.group.position.z = lerp(hand.group.position.z, 0.34, 0.035);

      // Tremblement croissant : l'énergie devient difficile à contenir.
      const shake = easeIn(k) * 0.016;
      hand.group.position.x = (Math.random() - 0.5) * shake;
      hand.group.position.y = Math.sin(t * 0.72) * 0.045 + (Math.random() - 0.5) * shake;

      hand.stones.forEach((s, i) => {
        const ramp = 1 + easeIn(k) * 9;
        s.mat.emissiveIntensity = ramp * (0.85 + Math.sin(t * 9 + i) * 0.2);
        s.halo.material.opacity = 0.16 + easeIn(k) * 0.5;
        s.halo.scale.setScalar(1 + easeIn(k) * 1.5);
        if (s.light) s.light.intensity = 2.2 + easeIn(k) * 16;
      });

      // Le métal s'éclaircit sous la charge.
      hand.materials[0].envMapIntensity = 1.5 + easeIn(k) * 2.4;

      if (phaseT >= CHARGE) {
        phase = 'strike';
        phaseT = 0;
      }
    } else if (phase === 'strike') {
      const k = Math.min(phaseT / STRIKE, 1);
      const e = easeOut(k);

      // Le majeur fouette vers la paume ; le pouce s'écarte sous l'impulsion.
      flex(
        hand.fingers.middle,
        lerp(POSE_READY.middle[0], 1.42, e),
        lerp(POSE_READY.middle[1], 1.15, e),
        lerp(POSE_READY.middle[2], 0.75, e)
      );
      flex(hand.fingers.thumb, lerp(POSE_READY.thumb[0], -0.72, e), lerp(POSE_READY.thumb[1], -0.2, e));

      // Recul : la main encaisse son propre claquement.
      hand.group.rotation.z = Math.sin(e * Math.PI) * 0.1;

      if (k >= 1) {
        phase = 'dissolve';
        phaseT = 0;
        if (!flashed) {
          flashed = true;
          onFlash?.();
        }
        if (dust) {
          dust.points.visible = true;
          dust.points.material.opacity = 0.95;
        }
      }
    } else if (phase === 'dissolve') {
      const k = Math.min(phaseT / DISSOLVE, 1);

      // La main s'efface : opacité à la baisse sur tous ses matériaux.
      const fade = 1 - Math.min(k / 0.45, 1);
      hand.group.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.material.transparent = true;
        obj.material.opacity = fade;
      });
      hand.stones.forEach((s) => {
        s.mat.emissiveIntensity = 10 * fade;
        if (s.light) s.light.intensity = 18 * fade;
      });

      // La poussière s'envole, freinée puis dissipée.
      if (dust) {
        const p = dust.points.geometry.attributes.position;
        const drag = 1 - k * 0.55;
        for (let i = 0; i < dust.count; i++) {
          const i3 = i * 3;
          p.array[i3] += dust.vel[i3] * dt * drag;
          p.array[i3 + 1] += dust.vel[i3 + 1] * dt * drag;
          p.array[i3 + 2] += dust.vel[i3 + 2] * dt * drag;
          // Turbulence : les particules ne montent pas en ligne droite.
          dust.vel[i3] += (Math.random() - 0.5) * 0.02;
          dust.vel[i3 + 1] -= dt * 0.06; // gravité légère
        }
        p.needsUpdate = true;
        dust.points.material.opacity = 0.95 * (1 - easeIn(k));
      }

      if (k >= 1 && !dissolved) {
        dissolved = true;
        phase = 'done';
        onDissolved?.();
      }
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* Un seul teardown pour les deux modes : la scène est la même, donc le
     mouvement réduit doit libérer autant de VRAM que la version animée. Le GC
     ne récupère pas la mémoire GPU, il faut disposer explicitement. */
  const teardown = () => {
    dead = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', onLost);
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
    env.dispose();
    renderer.dispose();
  };

  // Mouvement réduit : pas de chorégraphie, on livre le résultat.
  if (reduced) {
    return {
      snap() {
        if (!flashed) {
          flashed = true;
          onFlash?.();
        }
        if (!dissolved) {
          dissolved = true;
          hand.group.visible = false;
          onDissolved?.();
        }
      },
      destroy: teardown,
    };
  }

  return {
    /** Déclenche la séquence. Ignoré si elle est déjà lancée. */
    snap() {
      if (phase !== 'idle') return;
      phase = 'charge';
      phaseT = 0;
    },
    destroy: teardown,
  };
}



