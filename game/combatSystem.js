const { TIER_STATS, SKILL_CD } = require('./constants');
const gameState = require('./gameState');
const bossSystem = require('./bossSystem');
const characterManager = require('./characterManager');

function getAvailableSkills(tier) {
  return TIER_STATS[tier]?.skills || [];
}

// Tính logic combat cooldown & rút bài ngẫu nhiên 1 kỹ năng
function tryUseSkill(char) {
  char.normalAttackCount++;
  if (char.normalAttackCount % 3 !== 0) return null;

  const skills = getAvailableSkills(char.tier);
  const available = skills.filter(s => Date.now() > char.skillCooldowns[s]);
  if (!available.length) return null; // đang cooldown

  const skill = available[Math.floor(Math.random() * available.length)];
  char.skillCooldowns[skill] = Date.now() + SKILL_CD[skill];
  return skill;
}

function findNearestEnemy(char) {
  let nearest = null;
  let minDist = Infinity;
  for (const [name, enemy] of gameState.characters) {
    if (enemy.isDead || enemy.name === char.name) continue;
    const dx = enemy.x - char.x;
    const dy = enemy.y - char.y;
    const distSq = dx*dx + dy*dy;
    if (distSq < minDist) {
      minDist = distSq;
      nearest = enemy;
    }
  }
  return nearest;
}

function onKill(killerName, victimName) {
  const killer = gameState.characters.get(killerName);
  if (!killer) return;

  killer.killCount++;
  killer.killsForTier++;

  if (gameState.io) {
    gameState.io.emit('kill_feed', { text: `⚔️ ${killerName} hạ ${victimName}`, type: 'kill' });
  }

  // Tiêu diệt 2 nhân vật -> Tăng 1 Tier
  if (killer.killsForTier >= 2 && killer.tier < 5) {
    killer.killsForTier = 0; // Reset
    characterManager.tierUpCharacter(killer);
    
    if (gameState.io) {
      gameState.io.emit('char_tiered_up', { name: killerName, newTier: killer.tier });
      gameState.io.emit('kill_feed', {
        text: killer.tier === 5
          ? `👑 ${killerName} đạt TIER MAX!`
          : `⬆️ ${killerName} (${killer.killCount} kills) → T${killer.tier}!`,
        type: 'tier'
      });
    }
  }
}

function applyDamage(attacker, target, skill) {
  let dmg = attacker.atk;
  
  if (skill === 'ice') {
    dmg = attacker.atk * 2;
    target.nextAttackTime += 3000; // Làm chậm mục tiêu
  } 
  else if (skill === 'soul') {
    dmg = attacker.atk * 2;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg); // Buff lại cho bản thân
    if (gameState.io) gameState.io.emit('hp_healed', { name: attacker.name, amount: dmg });
  } 
  else if (skill === 'thunder') {
    dmg = attacker.atk * 2;
    let count = 0;
    for (const [name, enemy] of gameState.characters) {
      if (enemy === target || enemy === attacker || enemy.isDead) continue;
      if (count >= 2) break;
      const dist = Math.hypot(enemy.x - target.x, enemy.y - target.y);
      if (dist < 150) { // Bán kính lây sét
        enemy.hp -= attacker.atk;
        if (gameState.io) gameState.io.emit('char_attacked', { attacker: attacker.name, target: enemy.name, dmg: attacker.atk, skillType: 'thunder_chain' });
        if (enemy.hp <= 0) {
          characterManager.onCharacterDied(enemy.name, attacker.name);
          onKill(attacker.name, enemy.name);
        }
        count++;
      }
    }
  }

  // Trừ máu mục tiêu chính
  target.hp -= dmg;
  if (gameState.io) {
    gameState.io.emit('char_attacked', { attacker: attacker.name, target: target.name, dmg, skillType: skill || 'normal' });
  }

  if (target.hp <= 0) {
    characterManager.onCharacterDied(target.name, attacker.name);
    onKill(attacker.name, target.name);
  }
}

// Hàm Main Combat Loop của Server (AI Engine)
function combatTick() {
  const ATTACK_RANGE = 55;
  const ARENA_Y1 = 180;
  let didMove = false;

  for (const [name, char] of gameState.characters) {
    if (char.isDead) continue;
    
    let target = null;
    if (gameState.bossActive) target = { x: 360, y: 760 }; // Tọa độ Boss (Chính giữa)
    else target = findNearestEnemy(char);

    // 1. Logic Di Chuyển (Tiến Lại Gần)
    if (target) {
      const dx = target.x - char.x;
      const dy = target.y - char.y;
      const dist = Math.hypot(dx, dy);

      if (dist > ATTACK_RANGE) {
        // Tốc độ di chuyển khoảng 30px mỗi giây
        char.x += (dx / dist) * 3;
        char.y += (dy / dist) * 3;
        
        if(char.x < 20) char.x = 20; if(char.x > 700) char.x = 700;
        if(char.y < ARENA_Y1) char.y = ARENA_Y1; if(char.y > 1260) char.y = 1260;
        didMove = true;
      }
      
      // 2. Logic Tấn Công (Khi đã ở trong tầm đánh)
      if (Date.now() >= char.nextAttackTime && dist <= ATTACK_RANGE) {
        if (gameState.bossActive) {
          const skill = tryUseSkill(char);
          let dmg = char.atk;
          if (skill === 'ice' || skill === 'soul' || skill === 'thunder') dmg *= 2;
          bossSystem.attackBoss(name, dmg);
        } else {
          // PvP
          const skill = tryUseSkill(char);
          if (skill === 'fire') {
            let count = 0;
            for (const [n, e] of gameState.characters) {
              if (e.isDead || e.name === char.name || Math.hypot(e.x - char.x, e.y - char.y) > 120) continue;
              e.hp -= char.atk;
              if (gameState.io) gameState.io.emit('char_attacked', { attacker: name, target: n, dmg: char.atk, skillType: 'fire' });
              if (e.hp <= 0) {
                characterManager.onCharacterDied(e.name, name);
                onKill(name, e.name);
              }
              count++;
            }
            if (count > 0) {
              char.nextAttackTime = Date.now() + TIER_STATS[char.tier].speed;
              continue;
            }
          }
          applyDamage(char, target, skill);
        }
        char.nextAttackTime = Date.now() + TIER_STATS[char.tier].speed;
        
        // Gắn cờ xuất chiêu để client phát hiệu ứng animation vung vũ khí mới
        if (gameState.io) gameState.io.emit('char_action', { name: char.name, action: 'attack' });
      }
    }
  }

  if (didMove && gameState.io) {
    const posData = [];
    for (const [name, char] of gameState.characters) {
      if(!char.isDead) posData.push({ name: char.name, x: char.x, y: char.y });
    }
    gameState.io.emit('sync_positions', posData);
  }
}

module.exports = {
  combatTick,
  applyDamage,
  findNearestEnemy
};
