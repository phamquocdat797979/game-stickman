const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const socket = io();

// State
const charsMap = new Map();
let killFeed = [];
let bossState = { active: false, hp: 0, maxHp: 3000, name: 'DARK GOLEM' };

let lastTime = performance.now();

// Socket Listeners
socket.on('char_created', (data) => {
  const stickman = new Stickman(data.name, data.tier, TIER_COLORS[data.tier]);
  stickman.x = data.x;
  stickman.y = data.y;
  stickman.targetX = data.x;
  stickman.targetY = data.y;
  stickman.hp = data.hp;
  stickman.maxHp = data.maxHp;
  stickman.atk = data.atk;
  charsMap.set(data.name, stickman);
});

socket.on('char_removed', ({ name }) => {
  charsMap.delete(name);
});

socket.on('char_died', ({ name }) => {
  const char = charsMap.get(name);
  if (char) char.isDead = true;
});

socket.on('char_revived', ({ name, hp }) => {
  const char = charsMap.get(name);
  if (char) {
    char.isDead = false;
    char.hp = hp;
  }
});

socket.on('char_tiered_up', ({ name, newTier }) => {
  const char = charsMap.get(name);
  if (char) {
    char.tier = newTier;
    char.color = TIER_COLORS[newTier] || '#fff';
    spawnFloatingText(char.x, char.y - 120, 'TIER UP!', '#ffea00', true);
  }
});

socket.on('hp_healed', ({ name, amount }) => {
  const char = charsMap.get(name);
  if (char) {
    char.hp = Math.min(char.maxHp, char.hp + amount);
    spawnFloatingText(char.x, char.y - 100, `+${amount} HP`, '#4cff4c');
  }
});

socket.on('atk_buffed', ({ name, amount }) => {
  const char = charsMap.get(name);
  if (char) {
    char.atk += amount;
    spawnFloatingText(char.x + 20, char.y - 90, `+${amount} ATK`, '#ffcc44');
  }
});

socket.on('char_attacked', ({ attacker, target, dmg, skillType }) => {
  const t = charsMap.get(target);
  if (t) {
    t.hp -= dmg;
    let color = '#fff';
    if (skillType === 'fire') color = '#ff5722';
    if (skillType === 'ice') color = '#00bcd4';
    if (skillType === 'thunder_chain') color = '#ffeb3b';
    if (skillType === 'command') color = '#e91e63';
    
    spawnFloatingText(t.x, t.y - 80, `-${Math.floor(dmg)}`, color);
    
    if (skillType === 'fire') {
      spawnParticle(t.x, t.y-50, '#ff5722', 4, 3);
      spawnParticle(t.x, t.y-50, '#ff9800', 3, 2);
    }
  }
});

socket.on('kill_feed', (event) => {
  killFeed.push(event);
  if (killFeed.length > 5) killFeed.shift();
  
  setTimeout(() => {
    const idx = killFeed.indexOf(event);
    if (idx > -1) killFeed.splice(idx, 1);
  }, 10_000);
});

socket.on('boss_warning', () => {
  canvas.style.boxShadow = '0 0 50px red';
});
socket.on('boss_spawned', (b) => {
  bossState = Object.assign(bossState, b, { active: true });
  canvas.style.boxShadow = '0 0 20px rgba(0,0,0,1)';
});
socket.on('boss_damaged', (b) => {
  bossState.hp = b.remainingHP;
});
socket.on('boss_attack', ({ x, y, radius }) => {
   for(let i=0; i<30; i++) spawnParticle(x, y, '#cc0000', 10, 5);
});
socket.on('boss_killed', () => {
  bossState.active = false;
});

socket.on('sync_positions', (posData) => {
  for (const data of posData) {
    const char = charsMap.get(data.name);
    if (char) {
      char.targetX = data.x;
      char.targetY = data.y;
    }
  }
});

socket.on('char_action', ({ name, action }) => {
  const char = charsMap.get(name);
  if (char && action === 'attack') {
    if (typeof char.doAttackAnim === 'function') char.doAttackAnim();
  }
});

// Update Queue from server
socket.on('queue_updated', ({ queue }) => {
  document.title = `Game Stickman | Queue: ${queue.length}`;
});

let frameCount = 0;

function loop(time) {
  requestAnimationFrame(loop);
  const dt = time - lastTime;
  lastTime = time;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  updateMovement(charsMap, dt);

  // Background Arena limits
  ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
  ctx.strokeStyle = '#cccccc';
  ctx.beginPath();
  ctx.roundRect(ARENA.x1, ARENA.y1, ARENA.x2-ARENA.x1, ARENA.y2-ARENA.y1, 10);
  ctx.fill();
  ctx.stroke();

  frameCount++;
  if (frameCount % 3 === 0) {
    for (const [name, char] of charsMap) {
      if (!char.isDead && char.tier >= 3) {
        const count = char.tier - 2;
        for(let i=0; i<count; i++) {
           spawnParticle(char.x + (Math.random()-0.5)*40, char.y + (Math.random()-0.5)*20, char.color, 1, 2);
        }
      }
    }
  }

  // Sắp xếp Y để nhân vật ở dưới đè lên nhân vật ở trên (Depth sorting)
  const drawList = [...charsMap.values()].sort((a,b) => a.y - b.y);

  for (const char of drawList) {
    char.update(dt);
    char.draw(ctx);
  }

  updateAndDrawEffects(ctx);
  
  drawLeaderboard(ctx, charsMap);
  drawKillFeed(ctx, killFeed);
  
  if (bossState.active) {
    drawBossBar(ctx, bossState);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(360, 760, 50, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#cc0000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px Arial';
    ctx.fillText('👹', 360, 760);
  }
}

requestAnimationFrame(loop);
