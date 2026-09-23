/**
 * Tunnel quantique — WebGL brut, un seul quad plein écran.
 *
 * Volontairement sans three.js : c'est le tout premier moment spectaculaire du
 * site, il doit partir sans attendre le chargement d'une librairie. Tout est
 * mathématique dans le fragment shader, donc le coût est en fillrate, pas en
 * géométrie : un mobile tient le 60fps même en résolution pleine.
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;  // 0 → 1 sur toute la durée de la chute

/* Anneau lumineux doux : vaut 1 aux entiers de x, 0 à x+0.5. */
float band(float x, float power) {
  return pow(abs(fract(x) - 0.5) * 2.0, power);
}

/**
 * Motif du tunnel à une distance radiale décalée (pour l'aberration
 * chromatique). 1/r transforme le plan en couloir infini : plus on approche du
 * centre, plus la profondeur explose, ce qui donne la fuite perspective.
 */
float tunnel(vec2 uv, float shift, out float depth) {
  float r = length(uv) + shift;
  float a = atan(uv.y, uv.x);

  depth = 1.0 / max(r, 0.035);

  // La vitesse s'emballe avec la progression : accélération de la chute.
  float speed = 1.2 + uProgress * uProgress * 14.0;
  float v = depth + uTime * speed;
  float u = a / 3.14159265;

  float rings = band(v * 0.5, 7.0);
  float ribs  = band(u * 14.0, 4.0) * 0.55;
  // Filaments fins qui tournent : casse la régularité du maillage.
  float veins = band(u * 44.0 + v * 0.12, 22.0) * 0.8;

  float grid = max(rings, max(ribs, veins));

  // Les parois proches (r grand) s'assombrissent : le regard va vers le centre.
  float fade = smoothstep(1.35, 0.02, r);
  return grid * fade;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);

  // L'aberration s'intensifie avec la vitesse.
  float ab = 0.004 + uProgress * 0.022;
  float d0, d1, d2;
  float r = tunnel(uv, 0.0, d0);
  float g = tunnel(uv, ab, d1);
  float b = tunnel(uv, ab * 2.0, d2);

  // Violet vibranium au loin, cyan Stark au près.
  vec3 far  = vec3(0.55, 0.36, 0.98);
  vec3 near = vec3(0.05, 0.65, 0.92);
  vec3 tint = mix(near, far, clamp(d0 * 0.06, 0.0, 1.0));

  vec3 col = vec3(r, g, b) * tint * 2.6;

  // Halo central : la lumière au bout du tunnel.
  float core = pow(smoothstep(0.85, 0.0, length(uv)), 3.0);
  col += vec3(0.75, 0.6, 1.0) * core * (0.35 + uProgress * 1.8);

  // Filé radial lumineux quand la vitesse devient extrême.
  float streak = pow(1.0 - min(length(uv), 1.0), 6.0) * uProgress;
  col += vec3(0.9, 0.95, 1.0) * streak * 1.2;

  // Blanc final : concentré sur les 18 derniers % pour un vrai flash.
  float flash = pow(smoothstep(0.82, 1.0, uProgress), 2.0);
  col = mix(col, vec3(1.0), flash);

  // Fondu d'entrée court : on ne veut pas de coupe franche depuis l'UI iOS.
  col *= smoothstep(0.0, 0.06, uProgress);

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader: ${log}`);
  }
  return sh;
}

/**
 * Monte le tunnel sur un canvas.
 * @returns {{destroy:()=>void}|null} null si WebGL est indisponible — l'appelant
 *   doit alors se rabattre sur un fallback CSS.
 */
export function mountTunnel(canvas, { duration = 2200, tier = 'high', onDone } = {}) {
  const gl =
    canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
  if (!gl) return null;

  let prog;
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  } catch {
    return null;
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uProgress = gl.getUniformLocation(prog, 'uProgress');

  // Le coût est en fillrate pur : on plafonne le DPR selon le palier device.
  const maxDpr = tier === 'low' ? 1 : tier === 'mid' ? 1.5 : 2;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  };
  resize();
  window.addEventListener('resize', resize);

  let raf = 0;
  let dead = false;
  let finished = false;
  const t0 = performance.now();

  const onLost = (e) => {
    // Sans preventDefault le contexte ne revient jamais ; ici on abandonne
    // proprement et on laisse la scène suivante prendre le relais.
    e.preventDefault();
    dead = true;
    cancelAnimationFrame(raf);
    if (!finished) {
      finished = true;
      onDone?.();
    }
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const frame = (now) => {
    if (dead) return;
    const elapsed = now - t0;
    const p = Math.min(elapsed / duration, 1);

    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, elapsed / 1000);
    gl.uniform1f(uProgress, p);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (p >= 1) {
      if (!finished) {
        finished = true;
        onDone?.();
      }
      return;
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
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      // Libère le contexte tout de suite : un mobile n'en tolère que quelques-uns.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

