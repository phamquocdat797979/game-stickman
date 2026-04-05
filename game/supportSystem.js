const { SUPPORT_DURATION, ATK_MAX } = require('./constants');
const gameState = require('./gameState');

function getGiftBonus(xu) {
  if (xu < 20)  return { hp: 20,     atk: 5   };
  if (xu < 100) return { hp: 50,     atk: 15  };
  if (xu < 500) return { hp: 120,    atk: 40  };
  return              { hp: 'FULL',  atk: 100 };
}

function setSupportTarget(user, targetName, duration = SUPPORT_DURATION) {
  gameState.supportMap.set(user, {
    target: targetName,
    expiry: Date.now() + duration,
  });
  if (gameState.io) {
    gameState.io.emit('support_set', { supporter: user, target: targetName });
  }
}

function clearSupportTarget(user) {
  gameState.supportMap.delete(user);
}

function resolveTarget(user) {
  const support = gameState.supportMap.get(user);
  if (support && Date.now() < support.expiry && gameState.characters.has(support.target)) {
    return support.target; // ủng hộ người khác
  }
  return user; // tự ủng hộ bản thân
}

function buffATK(char, amount) {
  char.atk = Math.min(ATK_MAX, char.atk + amount);
}

function applyHeal(char, amount) {
  if (amount === 'FULL') {
    char.hp = char.maxHp;
  } else {
    char.hp = Math.min(char.maxHp, char.hp + amount);
  }
}

module.exports = {
  getGiftBonus,
  setSupportTarget,
  clearSupportTarget,
  resolveTarget,
  buffATK,
  applyHeal
};
