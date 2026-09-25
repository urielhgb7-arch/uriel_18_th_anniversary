import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX_SRC = `
  uniform float u_intensity;
  uniform float u_time;

  varying vec2 vUv;
  varying float vDisplacement;

  // Bruit de Perlin 3D (Stefan Gustavson, webgl-noise, domaine public / MIT).
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    vUv = uv;
    vDisplacement = cnoise(position + vec3(2.0 * u_time));
    vec3 newPosition = position + normal * (u_intensity * vDisplacement);
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT_SRC = `
  uniform float u_intensity;
  uniform float u_time;
  uniform vec3 u_color;

  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    float distort = 2.0 * vDisplacement * u_intensity * sin(vUv.y * 10.0 + u_time);
    vec3 color = mix(u_color, vec3(1.0), distort);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function BlobShader({
  color = "#0F3EFA",
  background = "#05060f",
  scale = 1.5,
  speed = 0.4,
  intensity = 0.5,
  followMouse = true,
  cameraZ = 8,
  className,
}) {
  const conteneurRef = useRef(null);

  useEffect(() => {
    const conteneur = conteneurRef.current;
    if (!conteneur) return;

    let largeur = conteneur.clientWidth;
    let hauteur = conteneur.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, largeur / hauteur, 0.1, 1000);
    camera.position.z = cameraZ;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(largeur, hauteur);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Transparent if no background is provided or it's 'transparent'
    if (background && background !== 'transparent') {
      renderer.setClearColor(background, 1);
    } else {
      renderer.setClearColor(0x000000, 0);
    }
    
    conteneur.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0 },
      u_intensity: { value: intensity },
      u_color: { value: new THREE.Color(color) },
    };

    const geometry = new THREE.IcosahedronGeometry(2, 20);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SRC,
      fragmentShader: FRAGMENT_SRC,
      uniforms,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scale);
    scene.add(mesh);

    const souris = new THREE.Vector2(0, 0);
    const cible = new THREE.Vector3(0, 0, 0);
    const courante = new THREE.Vector3(0, 0, 0);

    const suivreSouris = (evenement) => {
      const cadre = conteneur.getBoundingClientRect();
      souris.x = ((evenement.clientX - cadre.left) / cadre.width) * 2 - 1;
      souris.y = -((evenement.clientY - cadre.top) / cadre.height) * 2 + 1;
    };
    if (followMouse) conteneur.addEventListener("mousemove", suivreSouris);

    const observateur = new ResizeObserver(() => {
      largeur = conteneur.clientWidth;
      hauteur = conteneur.clientHeight;
      camera.aspect = largeur / hauteur;
      camera.updateProjectionMatrix();
      renderer.setSize(largeur, hauteur);
    });
    observateur.observe(conteneur);

    const horloge = new THREE.Clock();
    let rafId = 0;

    const mouvementReduit = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (mouvementReduit) {
      renderer.render(scene, camera);
    } else {
      const boucle = () => {
        rafId = requestAnimationFrame(boucle);
        uniforms.u_time.value = speed * horloge.getElapsedTime();

        if (followMouse) {
          cible.set(souris.x * 2, souris.y * 2, 0);
          courante.lerp(cible, 0.1);
          mesh.position.copy(courante);
        }
        renderer.render(scene, camera);
      };
      boucle();
    }

    return () => {
      cancelAnimationFrame(rafId);
      observateur.disconnect();
      if (followMouse) conteneur.removeEventListener("mousemove", suivreSouris);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      const canvas = renderer.domElement;
      if (canvas.parentNode === conteneur) conteneur.removeChild(canvas);
    };
  }, [color, background, scale, speed, intensity, followMouse, cameraZ]);

  return (
    <div
      ref={conteneurRef}
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
