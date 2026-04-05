const { MAX_ACTIVE, ARENA, TIER_STATS, REVIVE_COST } = require('./constants');
const gameState = require('./gameState');

function getTierFromXu(xu) {
  if (xu < 50)   return 1;
  if (xu < 200)  return 2;
  if (xu < 800)  return 3;
  if (xu < 3000) return 4;
  return 5;
}

function createCharacterData(name, tier, xu) {
  const stats = TIER_STATS[tier];
  return {
    name,
    tier,
    totalXu: xu,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    atk: stats.atk,
    
    killsForTier: 0,
    killCount: 0,
    
    // Tọa độ ngẫu nhiên ban đầu để frontend render
    x: ARENA.x1 + Math.random() * (ARENA.x2 - ARENA.x1),
    y: ARENA.y1 + Math.random() * (ARENA.y2 - ARENA.y1),
    
    isDead: false,
    reviveExpiry: 0,
    deathTimer: null,
    
    skillCooldowns: { fire: 0, ice: 0, thunder: 0, soul: 0 },
    nextAttackTime: 0,
    commandCooldown: 0,
    commandTarget: null,
    commandTargetExpiry: 0,
    
    normalAttackCount: 0
  };
}

function removeCharacter(name) {
  gameState.characters.delete(name);
  gameState.supportMap.delete(name);
  if (gameState.io) gameState.io.emit('char_removed', { name });
  
  // Tự động kéo nhân vật đang đứng đợi từ queue vào sân
  promoteFromQueue();
}

function promoteFromQueue() {
  while (gameState.waitingQueue.length > 0 && gameState.characters.size < MAX_ACTIVE) {
    const nextChar = gameState.waitingQueue.shift();
    gameState.characters.set(nextChar.name, nextChar);
    
    // Đặt lại toạ độ để không kẹt chung chỗ
    nextChar.x = ARENA.x1 + Math.random() * (ARENA.x2 - ARENA.x1);
    nextChar.y = ARENA.y1 + Math.random() * (ARENA.y2 - ARENA.y1);

    if (gameState.io) {
      gameState.io.emit('char_created', nextChar);
      gameState.io.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });
      gameState.io.emit('kill_feed', { text: `🎉 ${nextChar.name} vào sân! [T${nextChar.tier}]`, type: 'join' });
    }
  }
}

// Xử lý khi nhân vật chết (Bắt đầu countdown 30s)
function onCharacterDied(name, killedBy) {
  const char = gameState.characters.get(name);
  if (!char) return;

  char.isDead = true;
  char.reviveExpiry = Date.now() + 30_000;

  if (gameState.io) {
    gameState.io.emit('char_died', { name, killedBy });
    gameState.io.emit('kill_feed', { text: `💀 ${name} đã bị loại!`, type: 'death' });
  }

  char.deathTimer = setTimeout(() => {
    if (char.isDead) removeCharacter(name);
  }, 30_000);
}

// Xử lý hồi sinh (Nhận xu cứu/share cứu)
function tryRevive(name, xu, byShare = false) {
  const char = gameState.characters.get(name);
  if (!char || !char.isDead) return false;
  if (Date.now() > char.reviveExpiry) return false;

  const cost = REVIVE_COST[char.tier];
  if (!byShare && xu < cost) return false;

  clearTimeout(char.deathTimer);
  char.isDead = false;
  char.hp = char.maxHp;
  
  if (gameState.io) {
    gameState.io.emit('char_revived', { name, hp: char.maxHp });
    gameState.io.emit('kill_feed', {
      text: byShare ? `💫 ${name} hồi sinh bằng Share!` : `💊 ${name} hồi sinh!`,
      type: 'revive'
    });
  }
  return true;
}

// Hàm chung để nâng Tier nhân vật
function tierUpCharacter(char) {
  if (char.tier >= 5) return;
  char.tier++;
  const oldStats = TIER_STATS[char.tier - 1];
  const newStats = TIER_STATS[char.tier];
  
  char.maxHp = newStats.maxHp;
  char.hp = char.maxHp; // Hồi đầy HP khi lên cấp để thanh máu không bị teo nhỏ
  
  // Dồn ATK cơ bản của các tier cũ và tier mới vào tổng ATK vĩnh viễn
  const atkDiff = newStats.atk - oldStats.atk;
  char.atk = Math.min(1000, char.atk + atkDiff);
}

module.exports = {
  getTierFromXu,
  createCharacterData,
  removeCharacter,
  promoteFromQueue,
  onCharacterDied,
  tryRevive,
  tierUpCharacter
};
