const particles = [];
const floatingTexts = [];

function spawnParticle(x, y, color, speed, size) {
  if (particles.length > 200) particles.shift();
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * speed,
    vy: (Math.random() - 0.5) * speed,
    color,
    size: Math.random() * size + 1,
    life: 1.0,
    decay: Math.random() * 0.05 + 0.02
  });
}

function spawnFloatingText(x, y, text, color, isCrit=false) {
  floatingTexts.push({
    text, x, y, color,
    life: 1.0,
    vy: -1.5,
    size: isCrit ? 16 : 12
  });
}

function updateAndDrawEffects(ctx) {
  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Floating Texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life -= 0.02;
    
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    
    ctx.globalAlpha = ft.life;
    ctx.font = `bold ${ft.size}px Arial`;
    ctx.fillStyle = ft.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1.0;
}
