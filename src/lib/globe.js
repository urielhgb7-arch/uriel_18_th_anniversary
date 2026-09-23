import * as THREE from 'three';
import { renderLandMask, latLngToVec3 } from './geo';

/**
 * Globe holographique en dot-matrix + vol de caméra jusqu'à la cible.
 *
 * Choix de rendu : un seul THREE.Points pour toute la Terre. Une sphère
 * texturée demanderait une image de plusieurs centaines de Ko et rendrait mal
 * l'esthétique "hologramme" voulue ; ici les continents naissent d'un masque
 * dessiné au runtime (lib/geo.js), donc zéro asset réseau. Un seul draw call
 * pour ~8000 points passe partout, y compris sur mobile d'entrée de gamme.
 *
 * Ce module est importé en dynamic import() : three.js ne doit pas peser sur
 * le premier écran, qui doit s'afficher instantanément.
 */

const R = 1; // rayon du globe, unité de référence de la scène

/** Points de terre échantillonnés sur une grille lat/lng via le masque. */
function buildDots(step, mask) {
  const ctx = mask.getContext('2d');
  const { width: mw, height: mh } = mask;
  const pixels = ctx.getImageData(0, 0, mw, mh).data;

  const positions = [];
  const shades = [];

  for (let lat = -84; lat <= 84; lat += step) {
    // Compense la convergence des méridiens : sans ce cosinus les pôles
    // reçoivent autant de points que l'équateur et deviennent des pâtés.
    const circumference = Math.cos((lat * Math.PI) / 180);
    const lngStep = step / Math.max(circumference, 0.16);

    for (let lng = -180; lng < 180; lng += lngStep) {
      const px = Math.floor(((lng + 180) / 360) * mw);
      const py = Math.floor(((90 - lat) / 180) * mh);
      if (pixels[(py * mw + px) * 4] < 128) continue; // océan

      const [x, y, z] = latLngToVec3(lat, lng, R);
      positions.push(x, y, z);
      // Légère variation d'intensité : évite un aplat uniforme trop synthétique.
      shades.push(0.55 + Math.random() * 0.45);
    }
  }

  return { positions: new Float32Array(positions), shades: new Float32Array(shades) };
}

const DOT_VERT = `
attribute float aShade;
uniform float uSize;
uniform float uPixelRatio;
varying float vShade;
varying float vFacing;
void main() {
  vShade = aShade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  /* Produit scalaire normale·vue : atténue la face arrière du globe pour
     suggérer le volume sans écrire dans le depth buffer. */
  vec3 n = normalize(normalMatrix * position);
  vFacing = clamp(dot(n, normalize(-mv.xyz)), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (1.0 / -mv.z);
}`;

const DOT_FRAG = `
precision mediump float;
uniform vec3 uColorNear;
uniform vec3 uColorFar;
varying float vShade;
varying float vFacing;
void main() {
  /* Points ronds : on jette les coins du quad. */
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.32, 0.5, d);
  vec3 col = mix(uColorFar, uColorNear, vFacing);
  float a = soft * vShade * (0.18 + vFacing * 0.82);
  gl_FragColor = vec4(col, a);
}`;

/** Halo atmosphérique : sphère plus large rendue par l'intérieur. */
function buildAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: { uColor: { value: new THREE.Color('#5b8dd9') } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        /* Fresnel : l'intensité monte sur le limbe, nulle au centre. */
        float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
        gl_FragColor = vec4(uColor, clamp(rim, 0.0, 1.0) * 0.85);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(R * 1.19, 48, 32), mat);
}

/** Marqueur : prisme en lévitation, faisceau vers le sol, anneaux au sol. */
function buildMarker(lat, lng) {
  const group = new THREE.Group();
  const [x, y, z] = latLngToVec3(lat, lng, R);
  const normal = new THREE.Vector3(x, y, z).normalize();
  group.position.copy(normal).multiplyScalar(R);
  // Oriente le +Y local vers l'extérieur du globe.
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  const gold = new THREE.Color('#d4af37');
  const cyan = new THREE.Color('#0ea5e9');

  const prism = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.032, 0),
    new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.92 })
  );
  prism.position.y = 0.11;
  group.add(prism);

  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.05, 0)),
    new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity: 0.55 })
  );
  cage.position.y = 0.11;
  group.add(cage);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.02, 0.11, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beam.position.y = 0.055;
  group.add(beam);

  const rings = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.034, 40),
      new THREE.MeshBasicMaterial({
        color: i ? cyan : gold,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    // Les anneaux sont créés dans le plan XY : on les rabat au sol.
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    group.add(ring);
    rings.push(ring);
  }

  return { group, prism, cage, rings };
}

function buildStars(count) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Distribution uniforme sur la sphère (sinon accumulation aux pôles).
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 16 + Math.random() * 20;
    pos.set([s * Math.cos(a) * r, u * r, s * Math.sin(a) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.6 })
  );
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Monte le globe et lance la descente vers la cible.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object}   opts
 * @param {number}   opts.lat / opts.lng   coordonnées cible
 * @param {'low'|'mid'|'high'} opts.tier   densité de points et DPR
 * @param {number}   opts.duration         durée du vol (ms)
 * @param {boolean}  opts.reduced          si vrai, saute direct à l'état final
 * @param {(i:number)=>void} opts.onPhase  index de repère survolé (HUD React)
 * @param {()=>void} opts.onArrive
 * @param {{current:{x:number,y:number}}} opts.tilt  parallaxe gyroscope
 * @returns {{destroy:()=>void}|null} null si WebGL indisponible
 */
export function mountGlobe(canvas, opts) {
  const {
    lat, lng,
    tier = 'high',
    duration = 7000,
    reduced = false,
    onPhase,
    onArrive,
    tilt,
  } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: tier === 'high', alpha: true });
  } catch {
    return null; // pas de WebGL : l'appelant affiche son fallback
  }

  const dprCap = tier === 'low' ? 1 : tier === 'mid' ? 1.6 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.01, 100);

  // Pivot : porte la rotation propre du globe, séparée de son orientation cible.
  const pivot = new THREE.Group();
  scene.add(pivot);

  const step = tier === 'low' ? 3.2 : tier === 'mid' ? 2.4 : 1.9;
  const { positions, shades } = buildDots(step, renderLandMask(1024, 512));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aShade', new THREE.BufferAttribute(shades, 1));

  const dotMat = new THREE.ShaderMaterial({
    vertexShader: DOT_VERT,
    fragmentShader: DOT_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSize: { value: tier === 'low' ? 2.6 : 2.15 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uColorNear: { value: new THREE.Color('#e8f4ff') },
      uColorFar: { value: new THREE.Color('#6d4fd0') },
    },
  });

  const dots = new THREE.Points(geo, dotMat);
  pivot.add(dots);

  // Sphère opaque très sombre : masque les points de la face arrière.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x04060f })
  );
  pivot.add(shell);

  pivot.add(buildAtmosphere());

  const marker = buildMarker(lat, lng);
  marker.group.visible = false; // révélé à l'approche finale
  pivot.add(marker.group);

  const stars = tier === 'low' ? null : buildStars(tier === 'mid' ? 320 : 600);
  if (stars) scene.add(stars);

  // ── Orientation : amener la cible face caméra ───────────────────────────────
  // La caméra regarde l'origine depuis +Z. On cherche donc la rotation qui
  // envoie le vecteur de la cible sur +Z ; un slerp depuis une pose de départ
  // décalée produit le grand mouvement de rotation du globe.
  const [tx, ty, tz] = latLngToVec3(lat, lng, 1);
  const targetDir = new THREE.Vector3(tx, ty, tz).normalize();
  const qEnd = new THREE.Quaternion().setFromUnitVectors(targetDir, new THREE.Vector3(0, 0, 1));

  // Départ : ~150° avant l'arrivée, incliné. Le globe traverse l'écran.
  const qStart = qEnd
    .clone()
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -2.6))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.38));

  const CAM_FAR = 3.5;
  const CAM_NEAR = 1.34; // rase la surface sans entrer dans la sphère

  let raf = 0;
  let dead = false;
  let arrived = false;
  let phase = -1;
  const t0 = performance.now();
  const clock = new THREE.Clock();

  // Amortissement de la parallaxe : le gyroscope est bruité, un suivi direct
  // donne une image qui tremble.
  const smooth = { x: 0, y: 0 };

  const setPhase = (i) => {
    if (i !== phase) {
      phase = i;
      onPhase?.(i);
    }
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    dotMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  };
  window.addEventListener('resize', resize);
  resize();

  const onLost = (e) => {
    e.preventDefault();
    dead = true;
    cancelAnimationFrame(raf);
    if (!arrived) {
      arrived = true;
      onArrive?.();
    }
  };
  canvas.addEventListener('webglcontextlost', onLost);

  // Mouvement réduit : on montre l'état d'arrivée, sans vol.
  if (reduced) {
    pivot.quaternion.copy(qEnd);
    camera.position.set(0, 0, CAM_NEAR + 0.25);
    marker.group.visible = true;
    setPhase(4);
    arrived = true;
    renderer.render(scene, camera);
    onArrive?.();
    return {
      destroy() {
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('webglcontextlost', onLost);
        renderer.dispose();
      },
    };
  }

  const frame = (now) => {
    if (dead) return;
    const dt = clock.getDelta();
    const elapsed = now - t0;
    const p = Math.min(elapsed / duration, 1);

    // Trois temps : rotation large → descente → stabilisation.
    const eOrient = easeInOut(Math.min(p / 0.72, 1));
    const eZoom = easeInOut(Math.min(p / 0.88, 1));

    pivot.quaternion.slerpQuaternions(qStart, qEnd, eOrient);

    // Rotation résiduelle qui s'éteint : le globe "freine" à l'arrivée.
    const spin = (1 - eOrient) * dt * 0.34;
    pivot.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), spin);

    camera.position.z = CAM_FAR - (CAM_FAR - CAM_NEAR) * eZoom;

    // Parallaxe : léger décalage caméra selon l'inclinaison, atténué à l'approche
    // pour que la cible reste centrée à l'arrivée.
    const t = tilt?.current ?? { x: 0, y: 0 };
    smooth.x += (t.x - smooth.x) * 0.045;
    smooth.y += (t.y - smooth.y) * 0.045;
    const amp = 0.16 * (1 - eZoom * 0.8);
    camera.position.x = smooth.x * amp;
    camera.position.y = -smooth.y * amp;
    camera.lookAt(0, 0, 0);

    // Le champ se resserre en fin de course : compression télé, plus cinéma.
    const fov = 42 - 9 * easeOut(Math.max(0, (p - 0.55) / 0.45));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Repères HUD, calés sur l'avancée du vol.
    setPhase(p < 0.2 ? 0 : p < 0.45 ? 1 : p < 0.66 ? 2 : p < 0.85 ? 3 : 4);

    // Marqueur : n'apparaît qu'une fois la cible bien en vue.
    if (p > 0.62) {
      if (!marker.group.visible) marker.group.visible = true;
      const tSec = elapsed / 1000;
      marker.prism.rotation.y += dt * 1.5;
      marker.prism.rotation.x += dt * 0.5;
      marker.cage.rotation.y -= dt * 0.8;
      marker.prism.position.y = 0.11 + Math.sin(tSec * 2) * 0.008;
      marker.cage.position.y = marker.prism.position.y;
      // Anneaux en expansion décalée : pulsation de balise.
      marker.rings.forEach((ring, i) => {
        const cycle = (tSec * 0.75 + i * 0.5) % 1;
        ring.scale.setScalar(0.5 + cycle * 2.6);
        ring.material.opacity = (1 - cycle) * 0.75;
      });
    }

    if (stars) stars.rotation.y += dt * 0.008;

    renderer.render(scene, camera);

    if (p >= 1) {
      if (!arrived) {
        arrived = true;
        onArrive?.();
      }
      // On continue de rendre après l'arrivée : marqueur animé + parallaxe.
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      // Libération explicite : le GC ne récupère pas la VRAM tout seul.
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
      renderer.dispose();
    },
  };
}



