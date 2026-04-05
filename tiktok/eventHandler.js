const { WebcastPushConnection } = require('tiktok-live-connector');
const gameState = require('../game/gameState');
const characterManager = require('../game/characterManager');
const supportSystem = require('../game/supportSystem');
const { MAX_ACTIVE, ATTACK_COMMAND_COOLDOWN } = require('../game/constants');

function setupTikTokEvents(username, io) {
  let tiktok = null;
  // Giả lập cho Control Panel
  if (username === 'EMULATOR') {
    const EventEmitter = require('events');
    tiktok = new EventEmitter();
  } else {
    tiktok = new WebcastPushConnection(username);
  }
  
  const pendingLikes = new Map();

  function handleSpawn(user, xu, io) {
    const tier = characterManager.getTierFromXu(xu);
    const char = characterManager.createCharacterData(user, tier, xu);

    if (gameState.characters.size < MAX_ACTIVE) {
      gameState.characters.set(user, char);
      if (io) {
        io.emit('char_created', char);
        io.emit('kill_feed', { text: `🎉 ${user} tham chiến! [T${tier}]`, type: 'join' });
      }
    } else {
      gameState.waitingQueue.push(char);
      if (io) {
        io.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });
        io.emit('kill_feed', { text: `⏳ ${user} đang chờ...`, type: 'join' });
      }
    }
  }

  // 1. Tặng Quà
  tiktok.on('gift', ({ uniqueId: user, diamondCount: xu }) => {
    const inQueue = gameState.waitingQueue.findIndex(c => c.name === user);

    if (!gameState.characters.has(user) && inQueue === -1) {
      handleSpawn(user, xu, io);
      return;
    }

    if (inQueue !== -1) {
      const qChar = gameState.waitingQueue[inQueue];
      qChar.totalXu += xu;
      const newTier = characterManager.getTierFromXu(qChar.totalXu);
      if (newTier > qChar.tier) {
        qChar.tier  = newTier;
        qChar.hp    = qChar.maxHp = require('../game/constants').TIER_STATS[newTier].maxHp;
        qChar.atk   = require('../game/constants').TIER_STATS[newTier].atk;
      }
      if (io) io.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });
      return;
    }

    handleGiftForExistingChar(user, xu, io);
  });
  
  function handleGiftForExistingChar(user, xu, io) {
    const char = gameState.characters.get(user);
    if (!char) return;

    const target = supportSystem.resolveTarget(user);
    const targetChar = gameState.characters.get(target);
    if (!targetChar) return;

    if (targetChar.isDead) { // Thử sống lại
      characterManager.tryRevive(target, xu);
      return;
    }

    if (target === user) { // Nâng tier
      char.totalXu += xu;
      const newTier = characterManager.getTierFromXu(char.totalXu);
      if (newTier > char.tier) {
        characterManager.tierUpCharacter(char);
        if (io) {
          io.emit('char_tiered_up', { name: user, newTier: char.tier });
          io.emit('kill_feed', { text: `⬆️ ${user} → T${char.tier}!`, type: 'tier' });
        }
        return;
      }
    }

    const bonus = supportSystem.getGiftBonus(xu);
    supportSystem.applyHeal(targetChar, bonus.hp);
    supportSystem.buffATK(targetChar, bonus.atk);
    
    if (io) {
      if (bonus.hp !== 'FULL' && bonus.hp > 0) io.emit('hp_healed', { name: target, amount: bonus.hp });
      if (bonus.atk > 0) io.emit('atk_buffed', { name: target, amount: bonus.atk });
    }
  }

  // 2. Bình luận
  tiktok.on('comment', ({ uniqueId: user, comment }) => {
    const text = comment.trim();
    if (text.startsWith('@')) {
      attackByCommand(user, text.slice(1).trim(), io);
    } else if (text.startsWith('+')) {
      const arg = text.slice(1).trim().toLowerCase();
      if (arg === 'stop') {
        supportSystem.clearSupportTarget(user);
        if (io) io.emit('kill_feed', { text: `❌ ${user} hủy ủng hộ`, type: 'support' });
      } else {
        supportSystem.setSupportTarget(user, arg);
      }
    }
  });

  function attackByCommand(user, targetName, io) {
    const attacker = gameState.characters.get(user);
    if (!attacker || attacker.isDead || gameState.bossActive) return;

    if (Date.now() < (attacker.commandCooldown || 0)) return;
    attacker.commandCooldown = Date.now() + ATTACK_COMMAND_COOLDOWN;

    const target = [...gameState.characters.values()].find(
      c => c.name.toLowerCase() === targetName.toLowerCase() && !c.isDead
    );
    if (!target || target.name === user) return;

    attacker.commandTarget = target.name;
    attacker.commandTargetExpiry = Date.now() + 5_000;

    const dmg = attacker.atk;
    target.hp -= dmg;
    
    if (io) {
      io.emit('char_attacked', { attacker: user, target: target.name, dmg, skillType: 'command' });
      io.emit('kill_feed', { text: `⚔️ ${user} → ${target.name} (-${dmg} HP)`, type: 'kill' });
    }
    
    if (target.hp <= 0) {
      characterManager.onCharacterDied(target.name, user);
      // Gọi hàm onKill cần lấy gián tiếp tránh cycle loop require
      require('../game/combatSystem').onKill?.(user, target.name);
    }
  }

  // 3. Thả Tim
  tiktok.on('like', ({ uniqueId: user, likeCount }) => {
    const inQueue = gameState.waitingQueue.findIndex(c => c.name === user);
    if (!gameState.characters.has(user) && inQueue === -1) {
      const currentLikes = (pendingLikes.get(user) || 0) + likeCount;
      if (currentLikes >= 50) {
        pendingLikes.delete(user);
        handleSpawn(user, 0, io); // Tạo bằng tim -> 0 xu, T1
      } else {
        pendingLikes.set(user, currentLikes);
      }
      return;
    }

    const targetName = supportSystem.resolveTarget(user);
    const target = gameState.characters.get(targetName);
    if (!target || target.isDead) return;

    const healAmt = likeCount || 1;
    if (target.hp >= target.maxHp) return;
    
    target.hp = Math.min(target.maxHp, target.hp + healAmt);
    if (io) io.emit('hp_healed', { name: targetName, amount: healAmt });
  });

  // 4. Chia sẻ
  tiktok.on('share', ({ uniqueId: user }) => {
    const inQueue = gameState.waitingQueue.findIndex(c => c.name === user);
    if (!gameState.characters.has(user) && inQueue === -1) {
       handleSpawn(user, 0, io); // Tạo bằng share -> 0 xu, T1
       return;
    }

    const targetName = supportSystem.resolveTarget(user);
    const target = gameState.characters.get(targetName);
    if (!target) return;

    if (target.isDead) { // Cứu bằng share
      characterManager.tryRevive(targetName, 0, true);
      return;
    }

    const healAmt = 100;
    if (target.hp < target.maxHp) {
      target.hp = Math.min(target.maxHp, target.hp + healAmt);
      if (io) io.emit('hp_healed', { name: targetName, amount: healAmt });
    }
    
    supportSystem.buffATK(target, 50);
    if (io) {
      io.emit('atk_buffed', { name: targetName, amount: 50 });
      io.emit('kill_feed', { text: `📤 ${user} share ủng hộ ${targetName} (+100HP +50ATK)`, type: 'support' });
    }
  });

  if (username !== 'EMULATOR') {
    tiktok.connect().then(state => {
      console.log(`[TikTok] Kết nối thành công vào Live của @${username}`);
    }).catch(e => {
      console.error(`[TikTok] Lỗi kết nối tài khoản @${username}:`, e.message);
    });
  }

  return tiktok;
}

module.exports = { setupTikTokEvents };
