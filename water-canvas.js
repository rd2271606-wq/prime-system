/**
 * PRIME SYSTEM — Classic Executive Ambient Canvas
 * Author: Shantanu Sharma
 */
(function () {
  const canvas = document.getElementById('water-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];
  let ripples = [];
  let time = 0;
  let mouse = { x: -1000, y: -1000 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  }

  window.addEventListener('resize', resize);

  function initParticles() {
    particles = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 220 + 140,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: 0.12,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function addRipple(x, y, maxR = 90) {
    if (ripples.length > 20) ripples.shift();
    ripples.push({
      x, y,
      radius: 0,
      maxRadius: maxR,
      alpha: 0.4
    });
  }

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (Math.random() < 0.08) addRipple(e.clientX, e.clientY, 50);
  });

  window.addEventListener('click', (e) => {
    addRipple(e.clientX, e.clientY, 100);
  });

  function draw() {
    time += 0.008;
    ctx.clearRect(0, 0, width, height);

    // Deep classic luxury dark background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#070a10');
    bg.addColorStop(0.5, '#05080e');
    bg.addColorStop(1, '#030508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle ambient lights
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let p of particles) {
      p.x += p.vx + Math.sin(time + p.phase) * 0.2;
      p.y += p.vy + Math.cos(time + p.phase) * 0.2;

      if (p.x < -p.radius) p.x = width + p.radius;
      if (p.x > width + p.radius) p.x = -p.radius;
      if (p.y < -p.radius) p.y = height + p.radius;
      if (p.y > height + p.radius) p.y = -p.radius;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grad.addColorStop(0, `rgba(0, 180, 255, ${p.alpha})`);
      grad.addColorStop(0.6, `rgba(0, 80, 180, ${p.alpha * 0.3})`);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Subtle water ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += 1.8;
      r.alpha -= 0.009;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${r.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  resize();
  draw();
})();
