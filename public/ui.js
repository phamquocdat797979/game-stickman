function drawLeaderboard(ctx, charsMap) {
  const sorted = [...charsMap.values()]
    .filter(c => !c.isDead)
    .sort((a, b) => b.tier !== a.tier ? b.tier - a.tier : b.atk - a.atk)
    .slice(0, 5);
  
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'left';
  let startX = 20;
  let startY = 40;
  
  ctx.fillStyle = '#fff';
  ctx.fillText('🏆 TOP QUYỀN LỰC:', startX, startY);
  
  sorted.forEach((c, idx) => {
    startY += 20;
    ctx.fillStyle = c.color;
    const prefix = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '▪';
    ctx.fillText(`${prefix} ${c.name} [T${c.tier}] ⚔${Math.floor(c.atk)}`, startX, startY);
  });
}

function drawBossBar(ctx, boss) {
  if (!boss || !boss.active) return;
  
  const bw = 400;
  const bh = 20;
  const bx = CANVAS_W / 2 - bw / 2;
  const by = 30;
  
  ctx.fillStyle = '#111';
  ctx.fillRect(bx, by, bw, bh);
  
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(bx, by, ratio * bw, bh);
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  
  ctx.font = 'bold 14px Courier New';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`👹 ${boss.name} (${Math.floor(boss.hp)}/${boss.maxHp})`, CANVAS_W / 2, by + bh / 2);
}

function drawKillFeed(ctx, entries) {
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let startY = 40;
  const startX = CANVAS_W - 200;
  
  entries.forEach(entry => {
    let color = '#fff';
    if (entry.type === 'kill') color = '#ff5252';
    if (entry.type === 'tier') color = '#ffea00';
    if (entry.type === 'support') color = '#4caf50';
    if (entry.type === 'boss') color = '#ff00ff';
    if (entry.type === 'death') color = '#888';
    
    ctx.fillStyle = '#000';
    ctx.fillText(entry.text, startX+1, startY+1);
    ctx.fillStyle = color;
    ctx.fillText(entry.text, startX, startY);
    startY += 16;
  });
}
