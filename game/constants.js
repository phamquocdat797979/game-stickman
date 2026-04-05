const CANVAS_W    = 720;
const CANVAS_H    = 1280;
const ARENA       = { x1: 20, y1: 260, x2: 700, y2: 1260 };

const CHAR_SCALE    = 0.60;
const MAX_ACTIVE    = 25;
const MAX_PARTICLES = 100;
const AURA_EVERY    = 3; // frames

const TIER_STATS = {
  1: { maxHp: 100, atk: 5,  speed: 3000, skills: [] },
  2: { maxHp: 150, atk: 8,  speed: 2500, skills: ['fire'] },
  3: { maxHp: 200, atk: 12, speed: 2000, skills: ['fire','ice'] },
  4: { maxHp: 250, atk: 18, speed: 1500, skills: ['fire','ice','thunder'] },
  5: { maxHp: 300, atk: 25, speed: 1000, skills: ['fire','ice','thunder','soul'] },
};

const SKILL_CD = { fire: 8000, ice: 10000, thunder: 14000, soul: 18000 };

const BOSS_CONFIG = {
  hp:         3000,
  atk:        100,
  atkSpeed:   3000,
  aoeRadius:  200,
  spawnEvery: 3 * 60_000,
  warnBefore: 10_000,
};

const SUPPORT_DURATION = 60_000;
const REVIVE_WINDOW    = 30_000;
const REVIVE_COST      = { 1:20, 2:50, 3:200, 4:800, 5:3000 };
const ATK_MAX          = 1000;

const KILLS_PER_TIER = 2;
const ATTACK_COMMAND_COOLDOWN = 15_000;

module.exports = {
  CANVAS_W, CANVAS_H, ARENA, CHAR_SCALE, MAX_ACTIVE, MAX_PARTICLES, AURA_EVERY,
  TIER_STATS, SKILL_CD, BOSS_CONFIG, SUPPORT_DURATION, REVIVE_WINDOW, REVIVE_COST,
  ATK_MAX, KILLS_PER_TIER, ATTACK_COMMAND_COOLDOWN
};
