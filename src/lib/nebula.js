/**
 * Champ de particules projeté en perspective — canvas 2D.
 *
 * Pas de WebGL ici volontairement : l'univers B affiche beaucoup de texte, qui
 * doit rester du DOM (net, sélectionnable, lisible par un lecteur d'écran). Le
 * fond n'a donc qu'un rôle de profondeur, et une projection manuelle en 2D
 * suffit — tout en laissant le GPU libre pour les transforms CSS 3D du contenu.
 *
 * La projection est la perspective classique : screen = center + world/z * focal.
 * Les particules qui passent derrière la caméra sont recyclées au fond.
 */

const DEPTH = 1400; // profondeur du volume, en unités monde

export function mountNebula(canvas, { tier = 'high', tilt, scroll } = {}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  const COUNT = tier === 'low' ? 110 : tier === 'mid' ? 190 : 280;
  const PALETTE = ['#8b5cf6', '#0ea5e9', '#d4af37', '#c4b5fd'];

  let w = 0;
  let h = 0;
  let dpr = 1;
  const focal = 520;

  const particles = Array.from({ length: COUNT }, () => spawn(true));

  function spawn(initial) {
    return {
      // Étalé large : le champ doit couvrir les bords même en zoom perspectif.
      x: (Math.random() - 0.5) * 2600,
      y: (Math.random() - 0.5) * 2600,
      z: initial ? Math.random() * DEPTH : DEPTH,
      r: Math.random() * 1.7 + 0.5,
      c: PALETTE[(Math.random() * PALETTE.length) | 0],
      tw: Math.random() * Math.PI * 2, // phase de scintillement
      sp: 0.25 + Math.random() * 0.75, // vitesse propre
    };
  }

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1 : 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    // setTransform (et pas scale) : idempotent, donc sûr à chaque resize.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  let raf = 0;
  let dead = false;
  let last = performance.now();
  const smooth = { x: 0, y: 0 };
  let prevScroll = scroll?.current ?? 0;
  let velocity = 0;

  const frame = (now) => {
    if (dead) return;
    // dt borné : au retour d'onglet, le delta peut valoir plusieurs secondes et
    // téléporterait tout le champ.
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // La vitesse de scroll pousse les particules : sensation de traversée.
    const s = scroll?.current ?? 0;
    velocity += ((s - prevScroll) - velocity) * 0.12;
    prevScroll = s;

    const t = tilt?.current ?? { x: 0, y: 0 };
    smooth.x += (t.x - smooth.x) * 0.05;
    smooth.y += (t.y - smooth.y) * 0.05;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2 + smooth.x * 34;
    const cy = h / 2 + smooth.y * 34;
    const drift = 130 * dt + velocity * 480;

    for (const p of particles) {
      p.z -= drift * p.sp;
      if (p.z <= 1) {
        Object.assign(p, spawn(false));
        continue;
      }
      if (p.z > DEPTH) p.z = DEPTH;

      const k = focal / p.z;
      const sx = cx + p.x * k;
      const sy = cy + p.y * k;
      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

      // Atténuation avec la distance + scintillement lent.
      p.tw += dt * 1.6 * p.sp;
      const depthFade = 1 - p.z / DEPTH;
      const alpha = Math.min(1, depthFade * 1.5) * (0.45 + Math.sin(p.tw) * 0.28);
      if (alpha <= 0.01) continue;

      const radius = Math.max(0.4, p.r * k * 2.6);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.c;
      // Le halo coûte cher : réservé aux particules proches, où il se voit.
      if (depthFade > 0.62 && tier !== 'low') {
        ctx.shadowBlur = 11;
        ctx.shadowColor = p.c;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}
