const { BOSS_CONFIG } = require('./constants');
const gameState = require('./gameState');
const characterManager = require('./characterManager');

// Khởi chạy đồng hồ tính Boss hiện diện
function triggerBossWarning() {
  if (gameState.io) {
    gameState.io.emit('boss_warning', {});
    gameState.io.emit('kill_feed', { text: '⚠️ BOSS SẮP XUẤT HIỆN! Chuẩn bị...', type: 'boss' });
  }
  setTimeout(() => spawnBoss(), BOSS_CONFIG.warnBefore);
}

function spawnBoss() {
  const boss = gameState.boss;
  boss.active = true;
  boss.hp = boss.maxHp;
  boss.dmgDealt = new Map();
  
  if (gameState.io) {
    gameState.io.emit('boss_spawned', { hp: boss.hp, maxHp: boss.maxHp, name: boss.name });
  }

  // Chuyển combat -> Đánh Boss
  gameState.bossActive = true;
  
  // Vòng lặp Boss xả Damage
  boss.atkInterval = setInterval(() => bossAoEAttack(), BOSS_CONFIG.atkSpeed);
}

function bossAoEAttack() {
  const boss = gameState.boss;
  if (!boss.active) return;
  
  if (gameState.io) {
    gameState.io.emit('boss_attack', { x: boss.x, y: boss.y, radius: BOSS_CONFIG.aoeRadius });
  }

  for (const [name, char] of gameState.characters) {
    if (char.isDead) continue;
    const dmg = BOSS_CONFIG.atk;
    char.hp -= dmg;
    
    if (gameState.io) {
      gameState.io.emit('char_attacked', { attacker: boss.name, target: name, dmg, skillType: 'boss' });
    }

    if (char.hp <= 0) {
      characterManager.onCharacterDied(name, boss.name);
    }
  }
}

// Hàm được gọi từ combatSystem
function attackBoss(attackerName, dmg) {
  const boss = gameState.boss;
  if (!boss.active) return;
  
  boss.hp -= dmg;
  const prevDmg = boss.dmgDealt.get(attackerName) || 0;
  boss.dmgDealt.set(attackerName, prevDmg + dmg);

  if (gameState.io) {
    gameState.io.emit('boss_damaged', { attacker: attackerName, dmg, remainingHP: boss.hp });
  }

  if (boss.hp <= 0) {
    onBossKilled();
  }
}

function onBossKilled() {
  const boss = gameState.boss;
  clearInterval(boss.atkInterval);
  boss.active = false;
  gameState.bossActive = false; // Về lại PvP

  let slayerName = null;
  let maxDmg = 0;
  
  for (const [name, d] of boss.dmgDealt) {
    if (d > maxDmg) { maxDmg = d; slayerName = name; }
  }

  if (slayerName) {
    const slayer = gameState.characters.get(slayerName);
    if (slayer) {
      slayer.isBossSlayer = true;
      slayer.bossSlayerExpiry = Date.now() + 3 * 60_000; // 3 phút
      setTimeout(() => { if (slayer) slayer.isBossSlayer = false; }, 3 * 60_000);
    }
  }

  // TIER UP TẤT CẢ TỪNG NGƯỜI
  for (const [, char] of gameState.characters) {
    if (!char.isDead) characterManager.tierUpCharacter(char);
  }
  for (const char of gameState.waitingQueue) {
    characterManager.tierUpCharacter(char);
  }

  if (gameState.io) {
    gameState.io.emit('boss_killed', { mvp: slayerName });
    gameState.io.emit('kill_feed', { text: `👹 BOSS DEFEATED! All survivors TIER UP!`, type: 'boss' });
  }
}

module.exports = {
  triggerBossWarning,
  spawnBoss,
  bossAoEAttack,
  attackBoss,
  onBossKilled
};
