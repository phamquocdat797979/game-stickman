# ⚔️ STICKMAN BATTLE ROYALE — Tech Stack Guide
> **Phiên bản:** 3.0 · **Cập nhật:** Bám sát `stickman_battle_royale.md` v2.7

---

## 1. KIẾN TRÚC HỆ THỐNG

```
TikTok Live  (Gift · Comment · Like · Share)
     │
     ▼  WebSocket unofficial API
Node.js Server
  ├─ tiktok-live-connector   ← nhận event từ TikTok
  ├─ Game Logic (in-memory)  ← xử lý HP / ATK / Tier / Boss
  └─ Socket.IO               ← đẩy state xuống browser
     │
     ▼  WebSocket local
Browser (Chrome/Edge)
  └─ HTML5 Canvas            ← render game 60fps
     │
     ▼  OBS Window Capture
TikTok Live Stream           ← phát 9:16 / 30fps
```

---

## 2. CÔNG NGHỆ SỬ DỤNG

### 2.1 `tiktok-live-connector` — Kết nối TikTok Live
| | |
|---|---|
| **Cài đặt** | `npm install tiktok-live-connector` |
| **Giấy phép** | MIT · Miễn phí |
| **Link** | https://github.com/zerodytrash/TikTok-Live-Connector |

**Events dùng trong game:**

| Event TikTok | Dữ liệu nhận được | Hành động game |
|---|---|---|
| `gift` | `uniqueId`, `diamondCount` | Tạo nhân vật / nâng Tier / ủng hộ HP+ATK |
| `comment` | `uniqueId`, `comment` | `@Ten` tấn công · `+Ten` ủng hộ · `+stop` hủy |
| `like` | `uniqueId`, `likeCount` | +1 HP cho target/bản thân |
| `share` | `uniqueId` | +100 HP · +50 ATK vĩnh viễn / hồi sinh miễn phí |

> ⚠️ Cần tài khoản TikTok đang **LIVE thật sự** để connector nhận event. `diamondCount` = số xu trong game design.

---

### 2.2 `Node.js` v20 LTS — Backend Runtime
| | |
|---|---|
| **Tải về** | https://nodejs.org |
| **Giấy phép** | MIT · Miễn phí |

- Runtime duy nhất tương thích `tiktok-live-connector`
- JavaScript — dùng chung constants với frontend (Tier, ATK, HP...)
- Chạy tốt trên máy streamer bình thường khi phát livestream song song

---

### 2.3 `Socket.IO` — Real-time Server ↔ Browser
| | |
|---|---|
| **Cài đặt** | `npm install socket.io` |
| **Giấy phép** | MIT · Miễn phí |

Đẩy cập nhật game state từ server xuống browser tức thì (~5–20ms local):

```javascript
// Server → Browser: các event chính
io.emit('char_created',   { name, tier, hp, atk, x, y, color });
io.emit('char_attacked',  { attacker, target, dmg, skillType });
io.emit('char_tiered_up', { name, newTier });
io.emit('char_died',      { name, killedBy });
io.emit('char_revived',   { name });
io.emit('hp_healed',      { name, amount });
io.emit('atk_buffed',     { name, amount });
io.emit('support_set',    { supporter, target });
io.emit('boss_warning',   {});
io.emit('boss_spawned',   { hp: 3000 });
io.emit('boss_damaged',   { dmg, remainingHP });
io.emit('boss_killed',    { mvp });
io.emit('kill_feed',      { text, type });
io.emit('leaderboard',    [ top3 ]);
```

---

### 2.4 `Express.js` — Web Server
| | |
|---|---|
| **Cài đặt** | `npm install express` |
| **Giấy phép** | MIT · Miễn phí |

- Serve thư mục `public/` (HTML + JS game) cho Chrome
- Thêm REST endpoint cho streamer điều khiển game (spawn boss thủ công, reset...)

---

### 2.5 `HTML5 Canvas` — Game Engine
| | |
|---|---|
| **Cài đặt** | Không cần — có sẵn trong Chrome/Edge |
| **Giấy phép** | Web Standard · Miễn phí |

**Lý do chọn thay vì Phaser/PixiJS:** File `stickman_skeleton_name.html` đã viết hoàn chỉnh bằng Canvas — tái dùng 100% code nhân vật mà không cần viết lại.

**Code tái dùng từ `stickman_skeleton_name.html`:**

| Hàm / Class | Chức năng |
|---|---|
| `class Stickman` | Toàn bộ nhân vật: vẽ, tay chân, animation |
| `drawBoneWithChars()` | Ký tự tên bám dọc xương — đặc điểm riêng game |
| `solveIK()` | IK 2-bone solver cho tay và chân |
| `nameColor()` | Hash tên → màu HSL riêng mỗi người |
| `addFX('fire'/'ice'/'thunder'/'soul')` | 4 hiệu ứng kỹ năng đã hoàn chỉnh |
| `spawnP()` + `tickParticles()` | Hệ thống particle |
| `drawBG()` | Nền tối + sao |

**Phần cần viết thêm cho game:**
- Kill feed · Leaderboard top 3 · Boss HP bar (Canvas text/rect overlay)
- Timer hồi sinh 30s · Queue display · Boss warning shake effect

---

### 2.6 In-Memory State — Quản lý Game State
| | |
|---|---|
| **Cài đặt** | Không cần — JavaScript `Map` + `Object` thuần |

- Game chạy local, tối đa 25 nhân vật active → dữ liệu < 5KB
- Không cần Redis/DB: mỗi buổi stream = 1 session riêng, không cần persist
- Tốc độ truy cập: < 0.01ms

```javascript
const gameState = {
  characters:   new Map(), // username → CharacterData
  supportMap:   new Map(), // username → { target, expiry }
  bossActive:   false,
  bossHP:       0,
  bossTimer:    0,         // đếm ngược 3 phút
  waitingQueue: [],        // hàng chờ khi > MAX_ACTIVE
  frameCount:   0,
};
```

---

### 2.7 `OBS Studio` — Capture & Stream
| | |
|---|---|
| **Tải về** | https://obsproject.com |
| **Giấy phép** | GPL · Miễn phí |

- `Window Capture` → Chrome đang chạy game → stream lên TikTok
- Thiết lập: Output `720×1280` · FPS `30` · Bitrate `3,000–4,000 Kbps`
- Mở Chrome với: `chrome --window-size=720,1280 --app=http://localhost:4000`

---

## 3. ĐÁP ỨNG YÊU CẦU GAME DESIGN

*Mỗi tính năng trong `stickman_battle_royale.md` → công nghệ xử lý*

### 3.1 Tạo nhân vật & Hàng chờ (Queue)

```javascript
// ── Bảng Tier theo xu ──────────────────────────────────────
function getTierFromXu(xu) {
  if (xu < 50)   return 1;  // 1–49   → T1, 100HP,  5ATK
  if (xu < 200)  return 2;  // 50–199 → T2, 150HP,  8ATK
  if (xu < 800)  return 3;  // 200–799→ T3, 200HP, 12ATK
  if (xu < 3000) return 4;  // 800–2999→T4, 250HP, 18ATK
  return 5;                 // 3000+  → T5, 300HP, 25ATK
}

// ── Xử lý Gift ─────────────────────────────────────────────
tiktok.on('gift', ({ uniqueId: user, diamondCount: xu }) => {

  // CASE 1: Chưa có nhân vật và không có trong queue → tạo mới
  const inQueue = gameState.waitingQueue.findIndex(c => c.name === user);

  if (!gameState.characters.has(user) && inQueue === -1) {
    const tier = getTierFromXu(xu);
    const char = createCharacter(user, tier, xu);

    if (gameState.characters.size < MAX_ACTIVE) {
      // Còn chỗ → vào sân ngay
      gameState.characters.set(user, char);
      io.emit('char_created', char);
      io.emit('kill_feed', { text: `🎉 ${user} tham chiến! [T${tier}]`, type: 'join' });
    } else {
      // Đầy sân → vào hàng chờ
      gameState.waitingQueue.push(char);
      io.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });
      io.emit('kill_feed', { text: `⏳ ${user} đang chờ vào sân...`, type: 'join' });
    }
    return;
  }

  // CASE 2: Đang trong hàng chờ → nâng Tier nếu đủ xu
  if (inQueue !== -1) {
    const qChar = gameState.waitingQueue[inQueue];
    qChar.totalXu += xu;
    const newTier = getTierFromXu(qChar.totalXu);
    if (newTier > qChar.tier) {
      qChar.tier  = newTier;
      qChar.hp    = qChar.maxHp = TIER_STATS[newTier].maxHp;
      qChar.atk   = TIER_STATS[newTier].atk;
    }
    // Không vào sân ngay — chờ đến lượt
    io.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });
    return;
  }

  // CASE 3: Đã có nhân vật trên sân → ủng hộ hoặc nâng Tier
  handleGiftForExistingChar(user, xu);
});

// ── Xử lý Gift cho nhân vật đã có trên sân ────────────────
function handleGiftForExistingChar(user, xu) {
  const char = gameState.characters.get(user);
  if (!char) return;

  const target = resolveTarget(user); // bản thân hoặc người đang ủng hộ
  const targetChar = gameState.characters.get(target);
  if (!targetChar) return;

  // Nếu nhân vật đang chết trong 30s revival window → thử hồi sinh
  if (targetChar.isDead) {
    tryRevive(target, xu);
    return;
  }

  // Kiểm tra nâng Tier (chỉ áp dụng khi ủng hộ bản thân)
  if (target === user) {
    char.totalXu += xu;
    const newTier = getTierFromXu(char.totalXu);
    if (newTier > char.tier) {
      tierUpCharacter(char);
      io.emit('char_tiered_up', { name: user, newTier: char.tier });
      io.emit('kill_feed', { text: `⬆️ ${user} nâng Tier lên T${char.tier}!`, type: 'tier' });
      return; // Tier-up hồi đầy HP → không cần heal thêm
    }
  }

  // Áp dụng HP + ATK bonus
  const bonus = getGiftBonus(xu);
  if (bonus.hp === 'FULL') {
    targetChar.hp = targetChar.maxHp;
  } else {
    targetChar.hp = Math.min(targetChar.maxHp, targetChar.hp + bonus.hp);
  }
  buffATK(targetChar, bonus.atk);
  io.emit('hp_healed', { name: target, amount: bonus.hp });
  io.emit('atk_buffed', { name: target, amount: bonus.atk });
}

// ── Bảng HP/ATK bonus từ xu ────────────────────────────────
function getGiftBonus(xu) {
  if (xu < 20)  return { hp: 20,     atk: 5   };
  if (xu < 100) return { hp: 50,     atk: 15  };
  if (xu < 500) return { hp: 120,    atk: 40  };
  return              { hp: 'FULL',  atk: 100 };
}
```

### 3.2 Hệ thống Comment (@attack / +support)

```javascript
tiktok.on('comment', ({ uniqueId: user, comment }) => {
  const text = comment.trim();

  if (text.startsWith('@')) {
    const targetName = text.slice(1).trim();
    attackByCommand(user, targetName);   // 15s cooldown per user
  }

  if (text.startsWith('+')) {
    const arg = text.slice(1).trim().toLowerCase();
    if (arg === 'stop') {
      clearSupportTarget(user);
      io.emit('kill_feed', { text: `❌ ${user} hủy ủng hộ`, type: 'support' });
    } else {
      setSupportTarget(user, arg, 60_000);
    }
  }
});

// ── @attack: chạy đến và đánh ngay — DMG = auto-attack bình thường ──
const ATTACK_COMMAND_COOLDOWN = 15_000; // 15 giây theo game design

function attackByCommand(user, targetName) {
  const attacker = gameState.characters.get(user);
  if (!attacker || attacker.isDead) return;
  if (gameState.bossActive) return; // boss phase: không dùng lệnh @

  // Kiểm tra cooldown 15s
  if (Date.now() < (attacker.commandCooldown || 0)) return;
  attacker.commandCooldown = Date.now() + ATTACK_COMMAND_COOLDOWN;

  // Tìm target theo tên (tìm kiếm case-insensitive)
  const target = [...gameState.characters.values()].find(
    c => c.name.toLowerCase() === targetName.toLowerCase() && !c.isDead
  );
  if (!target) return;
  if (target.name === user) return; // không tự đánh bản thân

  // Đặt commandTarget → AI movement sẽ chạy đến target
  attacker.commandTarget       = target.name;
  attacker.commandTargetExpiry = Date.now() + 5_000; // hết 5s nếu chưa đến được

  // DMG = auto-attack thường (không tăng, không giảm — theo game design)
  const dmg = attacker.atk;
  target.hp -= dmg;
  io.emit('char_attacked', { attacker: user, target: target.name, dmg, skillType: 'command' });
  io.emit('kill_feed', { text: `⚔️ ${user} → ${target.name} (-${dmg} HP)`, type: 'kill' });
  if (target.hp <= 0) onCharacterDied(target.name, user);
}
```

### 3.2b Hệ thống Like & Share

```javascript
// ── ❤️ Like: +1 HP cho target hoặc bản thân ──────────────────
tiktok.on('like', ({ uniqueId: user, likeCount }) => {
  // Mỗi like gọi 1 lần (likeCount thường = 1, đôi khi batch)
  const targetName = resolveTarget(user);
  const target     = gameState.characters.get(targetName);
  if (!target || target.isDead) return;

  const healAmt = likeCount || 1;                 // +1 HP / like
  if (target.hp >= target.maxHp) return;          // không hiện nếu đã đầy máu
  target.hp = Math.min(target.maxHp, target.hp + healAmt);
  io.emit('hp_healed', { name: targetName, amount: healAmt });
});

// ── 📤 Share: +100 HP + +50 ATK vĩnh viễn / hồi sinh miễn phí ──
tiktok.on('share', ({ uniqueId: user }) => {
  const targetName = resolveTarget(user);
  const target     = gameState.characters.get(targetName);

  if (!target) {
    // Chưa có nhân vật → share không có tác dụng (theo game design)
    return;
  }

  if (target.isDead) {
    // Đang chết trong 30s → hồi sinh miễn phí bằng share
    tryRevive(targetName, 0, true);
    return;
  }

  // Nhân vật đang sống → +100 HP + +50 ATK vĩnh viễn
  const healAmt = 100;
  if (target.hp < target.maxHp) {
    target.hp = Math.min(target.maxHp, target.hp + healAmt);
    io.emit('hp_healed', { name: targetName, amount: healAmt });
  }
  buffATK(target, 50);
  io.emit('atk_buffed', { name: targetName, amount: 50 });
  io.emit('kill_feed', {
    text: `📤 ${user} share ủng hộ ${targetName} (+100HP +50ATK)`,
    type: 'support'
  });
});
```

### 3.3 Hệ thống Auto-Attack & Kỹ năng

Game loop chạy server-side mỗi 100ms:

```javascript
// TIER STATS từ stickman_battle_royale.md
const TIER_STATS = {
  1: { atk: 5,  speed: 3000 },  // 3s/đòn
  2: { atk: 8,  speed: 2500 },
  3: { atk: 12, speed: 2000 },
  4: { atk: 18, speed: 1500 },
  5: { atk: 25, speed: 1000 },
};

// SKILL COOLDOWNS
const SKILL_CD = { fire: 8000, ice: 10000, thunder: 14000, soul: 18000 };

// Mỗi 3 đòn thường → rút ngẫu nhiên 1 kỹ năng
function tryUseSkill(char) {
  char.normalAttackCount++;
  if (char.normalAttackCount % 3 !== 0) return null;

  const skills = getAvailableSkills(char.tier); // theo Tier
  const available = skills.filter(s => Date.now() > char.skillCooldowns[s]);
  if (!available.length) return null; // cooldown → bỏ qua

  const skill = available[Math.floor(Math.random() * available.length)];
  char.skillCooldowns[skill] = Date.now() + SKILL_CD[skill];
  return skill;
}

// DAMAGE theo skill (stickman_battle_royale.md)
// fire:    AoE, DMG = ATK (tất cả trong phạm vi)
// ice:     Đơn, DMG = ATK×2, làm chậm 3s
// thunder: Đơn, DMG = ATK×2, dây chuyền 2 mục tiêu gần (DMG giảm 50%)
// soul:    Đơn, DMG = ATK×2, hút HP bản thân = DMG gây ra
```

### 3.4 Hệ thống Ủng hộ (Support)

```javascript
// +TenNguoi → ủng hộ 60 giây
function setSupportTarget(user, targetName, duration) {
  gameState.supportMap.set(user, {
    target:  targetName,
    expiry:  Date.now() + duration,
  });
  io.emit('support_set', { supporter: user, target: targetName });
}

// Khi Like / Gift / Share → áp dụng cho target đang ủng hộ
function resolveTarget(user) {
  const support = gameState.supportMap.get(user);
  if (support && Date.now() < support.expiry && gameState.characters.has(support.target)) {
    return support.target; // ủng hộ người khác
  }
  return user; // tự ủng hộ bản thân
}

// Bảng HP/ATK theo xu (giống nhau cho self/other support)
// 1–19 xu:   +20 HP · +5 ATK vĩnh viễn
// 20–99 xu:  +50 HP · +15 ATK vĩnh viễn
// 100–499 xu:+120 HP · +40 ATK vĩnh viễn
// 500+ xu:   Hồi đầy HP · +100 ATK vĩnh viễn
// Share:     +100 HP · +50 ATK vĩnh viễn

// ATK tối đa 1000 tổng cộng
function buffATK(char, amount) {
  char.atk = Math.min(1000, char.atk + amount);
}
```

### 3.5 Hệ thống Boss

```javascript
const BOSS_CONFIG = {
  hp:         3000,
  atk:        100,         // DMG mỗi AoE
  atkSpeed:   3000,        // ms giữa 2 lần AoE
  aoeRadius:  200,         // px — phạm vi AoE trên canvas
  spawnEvery: 3 * 60_000,  // 3 phút
  warnBefore: 10_000,      // cảnh báo trước 10s
};

let boss = {
  active:    false,
  hp:        0,
  maxHp:     3000,
  name:      'DARK GOLEM',
  x:         360, y: 760,  // giữa arena
  dmgDealt:  new Map(),    // username → tổng dmg đánh vào boss (theo dõi Boss Slayer)
};

// ── Boss cảnh báo & xuất hiện ──────────────────────────────
function triggerBossWarning() {
  io.emit('boss_warning', {});         // browser: rung màn hình + viền đỏ
  io.emit('kill_feed', { text: '⚠️ BOSS SẮP XUẤT HIỆN! Chuẩn bị...', type: 'boss' });
  setTimeout(spawnBoss, BOSS_CONFIG.warnBefore);
}

function spawnBoss() {
  boss.active   = true;
  boss.hp       = boss.maxHp;
  boss.dmgDealt = new Map();           // reset bảng ghi dmg
  io.emit('boss_spawned', { hp: boss.hp, maxHp: boss.maxHp, name: boss.name });

  // Chuyển chế độ AI: tất cả nhân vật đánh boss, không đánh nhau
  gameState.bossActive = true;         // combat loop dùng flag này

  // Boss AoE mỗi 3s
  boss.atkInterval = setInterval(bossAoEAttack, BOSS_CONFIG.atkSpeed);
}

// ── Boss AoE Attack ────────────────────────────────────────
function bossAoEAttack() {
  if (!boss.active) return;
  io.emit('boss_attack', { x: boss.x, y: boss.y, radius: BOSS_CONFIG.aoeRadius });

  for (const [name, char] of gameState.characters) {
    if (char.isDead) continue;
    // Browser gửi vị trí nhân vật, server tính khoảng cách (hoặc hit tất cả đơn giản hơn)
    // Phương án đơn giản: boss đánh tất cả nhân vật (không tính khoảng cách)
    const dmg = BOSS_CONFIG.atk;
    char.hp -= dmg;
    io.emit('char_attacked', { attacker: boss.name, target: name, dmg, skillType: 'boss' });
    if (char.hp <= 0) onCharacterDied(name, boss.name);
  }
}

// ── Nhân vật đánh boss ────────────────────────────────────
// Gọi từ combat loop khi gameState.bossActive = true
function attackBoss(attackerName, dmg) {
  if (!boss.active) return;
  boss.hp -= dmg;

  // Ghi nhận dmg để tính Boss Slayer
  const prev = boss.dmgDealt.get(attackerName) || 0;
  boss.dmgDealt.set(attackerName, prev + dmg);

  io.emit('boss_damaged', { attacker: attackerName, dmg, remainingHP: boss.hp });
  if (boss.hp <= 0) onBossKilled();
}

// ── Boss chết ─────────────────────────────────────────────
// (xem section 3.7 để biết tierUp cả queue)
// Boss Slayer: nhân vật gây nhiều sát thương nhất → danh hiệu 3 phút
function onBossKilled() {
  clearInterval(boss.atkInterval);
  boss.active          = false;
  gameState.bossActive = false;  // combat loop trở về chế độ nhân vật đánh nhau

  // Tìm Boss Slayer (nhân vật gây nhiều dmg nhất)
  let slayerName = null, maxDmg = 0;
  for (const [name, dmg] of boss.dmgDealt) {
    if (dmg > maxDmg) { maxDmg = dmg; slayerName = name; }
  }
  if (slayerName) {
    const slayer = gameState.characters.get(slayerName);
    if (slayer) {
      slayer.isBossSlayer    = true;
      slayer.bossSlayerExpiry = Date.now() + 3 * 60_000; // 3 phút
      setTimeout(() => { if (slayer) slayer.isBossSlayer = false; }, 3 * 60_000);
    }
  }

  // Tier-up tất cả (xem section 3.7)
  onBossKilledTierUp(slayerName);
}
```

**Chế độ chiến đấu khi boss — combat loop cần kiểm tra `gameState.bossActive`:**
```javascript
// Trong setInterval combat loop (chạy server-side)
function combatTick() {
  for (const [name, char] of gameState.characters) {
    if (char.isDead || Date.now() < char.nextAttackTime) continue;

    if (gameState.bossActive) {
      // Boss phase: nhân vật tấn công boss, KHÔNG đánh nhau
      const dmg = calcDmg(char);          // ATK + skill
      attackBoss(name, dmg);
    } else {
      // Normal phase: tìm kẻ thù gần nhất và đánh
      const enemy = findNearestEnemy(char);
      if (enemy) autoAttack(char, enemy);
    }

    const speed      = TIER_STATS[char.tier].speed;
    char.nextAttackTime = Date.now() + speed;
  }
}
```

### 3.6 Kill Tier-Up (2 kills → +1 Tier)

```javascript
function onKill(killer, victim) {
  const char = gameState.characters.get(killer);
  if (!char) return;

  char.killCount++;             // kill count tổng (để emit kill_feed)
  char.killsForTier++;          // kill count riêng để tính tier-up

  io.emit('kill_feed', { text: `⚔️ ${killer} hạ ${victim}`, type: 'kill' });

  if (char.killsForTier >= 2 && char.tier < 5) { // mỗi 2 kills → tier up
    char.killsForTier = 0;      // ← RESET bộ đếm sau mỗi lần tier up (theo game design)
    tierUpCharacter(char);
    io.emit('char_tiered_up', { name: killer, newTier: char.tier });
    io.emit('kill_feed', {
      text: char.tier === 5
        ? `👑 ${killer} đạt TIER MAX!`
        : `⬆️ ${killer} (${char.killCount} kills) → T${char.tier}!`,
      type: 'tier'
    });
  }
}
```

### 3.7 Chết, Hồi sinh & Giải phóng slot Queue

```javascript
// ── Nhân vật chết ──────────────────────────────────────────
function onCharacterDied(name, killedBy) {
  const char = gameState.characters.get(name);
  if (!char) return;

  char.isDead       = true;
  char.reviveExpiry = Date.now() + 30_000; // 30 giây

  io.emit('char_died', { name, killedBy });
  io.emit('kill_feed', { text: `💀 ${name} đã bị loại!`, type: 'death' });

  // Sau 30s không hồi sinh → xóa hẳn & kéo người từ queue vào
  char.deathTimer = setTimeout(() => {
    if (char.isDead) {
      removeCharacter(name); // ← giải phóng slot → queue promotion tự động
    }
  }, 30_000);
}

// ── Xóa nhân vật + kéo người đầu queue vào sân ────────────
function removeCharacter(name) {
  gameState.characters.delete(name);
  gameState.supportMap.delete(name); // dọn support target
  io.emit('char_removed', { name });

  // Nếu còn người trong queue và sân có chỗ → kéo vào ngay
  promoteFromQueue();
}

function promoteFromQueue() {
  while (
    gameState.waitingQueue.length > 0 &&
    gameState.characters.size < MAX_ACTIVE
  ) {
    const nextChar = gameState.waitingQueue.shift(); // lấy người đầu hàng
    gameState.characters.set(nextChar.name, nextChar);

    // Spawn ở vị trí ngẫu nhiên trong arena
    nextChar.x = ARENA.x1 + Math.random() * (ARENA.x2 - ARENA.x1);
    nextChar.y = ARENA.y1 + Math.random() * (ARENA.y2 - ARENA.y1);

    io.emit('char_created', nextChar);  // browser thêm nhân vật mới
    io.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });
    io.emit('kill_feed', {
      text: `🎉 ${nextChar.name} vào sân! [T${nextChar.tier}]`,
      type: 'join'
    });
  }
}

// ── Hồi sinh ────────────────────────────────────────────────
// REVIVE_COST: xu tối thiểu cần tặng để hồi sinh theo Tier
const REVIVE_COST = { 1: 20, 2: 50, 3: 200, 4: 800, 5: 3000 };

function tryRevive(name, xu, byShare = false) {
  const char = gameState.characters.get(name);
  if (!char?.isDead) return false;
  if (Date.now() > char.reviveExpiry) return false;

  const cost = REVIVE_COST[char.tier];
  if (!byShare && xu < cost) return false;

  // Hồi sinh thành công
  clearTimeout(char.deathTimer);
  char.isDead = false;
  char.hp     = char.maxHp; // hồi đầy HP, giữ ATK và skill
  io.emit('char_revived', { name, hp: char.maxHp });
  io.emit('kill_feed', {
    text: byShare ? `💫 ${name} hồi sinh bằng Share!` : `💊 ${name} hồi sinh!`,
    type: 'revive'
  });
  return true;
}

// ── Boss chết → Tier-Up TẤT CẢ (kể cả queue) ──────────────
function onBossKilled(bossSlayerName) {
  // Nhân vật trên sân: tier up ngay
  for (const [, char] of gameState.characters) {
    if (!char.isDead) tierUpCharacter(char);
  }

  // Nhân vật trong queue: cũng tier up để không bị bất lợi
  for (const char of gameState.waitingQueue) {
    tierUpCharacter(char);
  }

  io.emit('boss_killed', { mvp: bossSlayerName });
  io.emit('kill_feed', { text: `👹 BOSS DEFEATED! All survivors TIER UP!`, type: 'boss' });
}

// ── Tier Up ────────────────────────────────────────────────
function tierUpCharacter(char) {
  if (char.tier >= 5) return;
  char.tier++;
  const stats   = TIER_STATS[char.tier];
  char.maxHp    = stats.maxHp;
  char.hp       = char.maxHp;   // hồi đầy HP khi lên Tier
  // ATK base tăng lên tier mới (nhưng giữ phần atk đã buff)
  const atkDiff = stats.atk - TIER_STATS[char.tier - 1].atk;
  char.atk      = Math.min(1000, char.atk + atkDiff);
}
```

**Luồng queue đầy đủ:**
```
Tặng gift khi sân đầy 25
  → push vào waitingQueue
  → hiển thị "⏳ đang chờ..."

Một nhân vật chết → 30s countdown
  → Hết 30s không hồi sinh → removeCharacter()
    → promoteFromQueue() tự động
      → nhân vật đầu queue vào sân
      → io.emit('char_created') → browser render
      → kill_feed: "🎉 [tên] vào sân!"

Nhân vật trong queue tặng thêm xu
  → nâng Tier ngay trong queue
  → khi vào sân sẽ có Tier cao hơn

Boss chết → ALL tier up
  → cả nhân vật trong queue cũng tier up
  → công bằng cho người đang chờ
```

---

## 4. MÀN HÌNH & CANVAS

### 4.1 TikTok Live — Tỷ lệ bắt buộc 9:16

| Thông số | Giá trị |
|---|---|
| Tỷ lệ | **9:16 (dọc/portrait)** |
| Độ phân giải đề xuất | **720 × 1280 px** |
| FPS stream | 30fps (TikTok chuẩn) |
| Bitrate | 3,000–4,000 Kbps |

### 4.2 Thiết kế 2D Free-Roam (toàn màn hình)

Nhân vật **di chuyển tự do theo cả X và Y** — không cố định trên 1 đường ground — để tận dụng toàn bộ diện tích canvas và chứa nhiều nhân vật hơn.

```
Y=0    ┌─────────────────────────────┐ ← 720px
       │ 👹 BOSS ██████░░  3000 HP   │ ← 50px  Boss bar
Y=50   │ 🥇PhamD T5 · 🥈Nguyen T3   │ ← 80px  Leaderboard
Y=130  │ ⚔️ A→B(-45)  💚X ủng hộ Y  │ ← 130px Kill feed (5 dòng)
Y=260  ├─────────────────────────────┤
       │                             │
       │  🧙     🧙🧙    🧙          │
       │    🧙🧙    🧙🧙    🧙🧙     │  ← Arena Free-Roam
       │  🧙    🧙    🧙      🧙    │    720 × 1020 px
       │    🧙🧙    🧙   🧙🧙       │
       │                             │
Y=1280 └─────────────────────────────┘
```

**Tính toán arena:**
```
Tổng canvas:       720 × 1280 = 921,600 px²
UI top (260px):    720 × 260  = 187,200 px²
Arena dùng được:   720 × 1020 = 734,400 px²
```

### 4.3 Compact Character Scale 0.60×

Nhân vật thu nhỏ còn 60% — **tên giữ nguyên 9px** để vẫn đọc được:

| Phần | Gốc (1.0×) | Compact (0.60×) |
|---|---|---|
| Head radius | 14px | **8px** |
| Torso | 42px | **25px** |
| Legs total | 45px | **27px** |
| Char font (xương) | 12–16px | **8px** (fixed) |
| **Tên font** | 11px | **9px** (fixed, không scale) |
| HP bar | 58×4px | **42×3px** |
| **Cao tổng** | ~185px | **~108px** |
| **Rộng slot** | ~95px | **~73px** |

```javascript
const CHAR_COMPACT_SCALE = 0.60; // 1 constant duy nhất điều chỉnh toàn bộ thân

// Trong constructor Stickman:
const CS = CHAR_COMPACT_SCALE;
this.headR  = Math.round(14 * CS);          // 8px
this.torsoH = 42 * (1+(tier-1)*.07) * CS;
this.lL1    = 24 * (1+(tier-1)*.07) * CS;
this.lL2    = 21 * (1+(tier-1)*.07) * CS;
this.aL1    = 20 * (1+(tier-1)*.07) * CS;
this.aL2    = 18 * (1+(tier-1)*.07) * CS;
this.charSz = Math.max(8, Math.round((11 + tier*0.5) * CS));
this.boneW  = Math.max(1.5, (2 + tier*0.5) * CS);

// Name tag KHÔNG scale:
this.nameFontSize = 9;   // px fixed
this.hpBarWidth   = 42;  // px fixed
```

### 4.4 Sức chứa nhân vật (Free-Roam + Compact)

```
Arena: 734,400 px²  ÷  Bounding box 1 nhân vật: 73×108 = 7,884 px²

Lý thuyết tối đa:         734,400 ÷ 7,884 = ~93 nhân vật
Mật độ thoải mái (~27%):  ~25 nhân vật active
Hàng chờ khi vượt quá:   Không giới hạn
```

| Số nhân vật active | Mật độ arena | Trải nghiệm |
|---|---|---|
| ≤ 15 | < 16% | ✅ Rất rõ, đẹp nhất |
| **16–25** | **16–27%** | **✅ Lý tưởng — khuyến nghị** |
| 26–35 | 28–38% | ⚠️ Hơi đông, vẫn đọc tên |
| > 35 | > 38% | ❌ Dùng hàng chờ |

**→ Giới hạn đề xuất: `MAX_ACTIVE = 25` nhân vật trên màn hình**

---

### 4.5 UI Rendering — HP Bar, ATK, Boss Bar, Kill Feed

*Bám sát phần `📊 HIỂN THỊ TRÊN MÀN HÌNH` trong `stickman_battle_royale.md`*

---

#### A. HP Bar + ATK trên đầu mỗi nhân vật

```javascript
// Vẽ trên mỗi nhân vật sau khi vẽ thân xương
function drawCharacterUI(ctx, char) {
  const headY = char.neckY - char.headR; // đỉnh đầu

  // ── HP BAR (compact 42×3px) ─────────────────────────
  const bw = 42, bh = 3;
  const bx = char.x - bw/2;
  const by = headY - char.headR - 18;
  const hpRatio = char.hp / char.maxHp;

  ctx.fillStyle = '#111';
  ctx.fillRect(bx, by, bw, bh);

  // Màu bar theo HP còn lại
  ctx.fillStyle = hpRatio > 0.6 ? '#44ff66'   // xanh lá
                : hpRatio > 0.3 ? '#ffaa00'   // cam
                :                  '#ff3333';  // đỏ
  ctx.fillRect(bx, by, hpRatio * bw, bh);

  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(bx, by, bw, bh);

  // Text HP (ẩn nếu đầy máu để khỏi rối)
  // Có thể hiện: "180/200" nhỏ bên cạnh nếu muốn

  // ── TÊN NHÂN VẬT (9px cố định) ─────────────────────
  ctx.font         = 'bold 9px Courier New';
  ctx.fillStyle    = '#ddd';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.name, char.x, headY - char.headR - 9);

  // ── ATK HIỆN TẠI (nhỏ, bên phải tên) ───────────────
  // Hiện ATK để người xem biết sức mạnh nhân vật
  ctx.font      = '7px Courier New';
  ctx.fillStyle = '#ffcc44';
  ctx.fillText(`⚔${char.atk}`, char.x + 24, headY - char.headR - 9);

  // ── TIER MARK (★ 👑) ────────────────────────────────
  const marks = ['','','★','★★','⭐','👑'];
  if (char.tier >= 2) {
    ctx.font      = '8px serif';
    ctx.fillStyle = char.color;
    ctx.fillText(marks[char.tier], char.x, headY - char.headR - 24);
  }
}
```

**Hiển thị trực quan trên đầu mỗi nhân vật:**
```
         ★                   ← Tier mark (T2+)
      NguyenA  ⚔13           ← Tên (9px) + ATK hiện tại (7px vàng)
      [████░░]                ← HP bar 42px, màu theo %HP
         O                   ← Đầu nhân vật
        /|\
```

---

#### B. Số HP/ATK bay lên khi có thay đổi (Floating Text)

Bám sát yêu cầu: *"số HP hồi màu xanh bay lên đầu"*, *"ATK ↑ màu vàng nhấp nháy"*

```javascript
// Danh sách floating text đang bay
let floatingTexts = [];

function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({
    x, y,
    vy:      -1.5,         // bay lên
    text,
    color,
    alpha:   1.0,
    life:    60,           // 60 frames (~1 giây)
    maxLife: 60,
  });
}

// Render mỗi frame
function tickFloatingTexts(ctx) {
  floatingTexts = floatingTexts.filter(f => f.life > 0);
  for (const f of floatingTexts) {
    f.y     += f.vy;
    f.alpha  = f.life / f.maxLife;
    f.life--;

    ctx.save();
    ctx.globalAlpha  = f.alpha;
    ctx.font         = 'bold 11px Courier New';
    ctx.fillStyle    = f.color;
    ctx.textAlign    = 'center';
    ctx.shadowBlur   = 8;
    ctx.shadowColor  = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

// Khi Socket.IO nhận event:
socket.on('hp_healed',  ({ name, amount }) => {
  const char = characters.get(name);
  if (char && amount > 0 && char.hp < char.maxHp) { // không hiện nếu đã đầy
    spawnFloatingText(char.x, char.neckY - 30, `+${amount} HP`, '#44ff88');
  }
});

socket.on('atk_buffed', ({ name, amount }) => {
  const char = characters.get(name);
  if (char) {
    spawnFloatingText(char.x, char.neckY - 30, `ATK ↑+${amount}`, '#ffdd00');
  }
});

socket.on('attack', ({ target, dmg, skillType }) => {
  const char = characters.get(target);
  if (char) {
    // Màu theo loại kỹ năng
    const dmgColor = { fire:'#ff6600', ice:'#88ddff', thunder:'#ccccff', soul:'#dd44ff' }[skillType] || '#ffffff';
    spawnFloatingText(char.x, char.neckY - 20, `-${dmg}`, dmgColor);
  }
});
```

---

#### C. Vòng ủng hộ xanh lá (Support Ring)

Bám sát: *"Hiệu ứng: vòng xanh lá bao quanh nhân vật được ủng hộ"*

```javascript
function drawSupportRing(ctx, char, tick) {
  if (!char.isSupportTarget) return;

  const cy    = (char.neckY + char.hipY) / 2; // giữa thân
  const pulse = 0.6 + Math.sin(tick * 0.08) * 0.4; // nhịp thở

  ctx.save();
  ctx.strokeStyle      = `rgba(0, 255, 100, ${pulse})`;
  ctx.lineWidth        = 2;
  ctx.shadowBlur       = 12;
  ctx.shadowColor      = '#00ff66';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.ellipse(char.x, cy, 28, 45, 0, 0, Math.PI * 2); // hình oval bao thân
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
```

---

#### D. Boss HP Bar (trên cùng màn hình)

Bám sát: *"`👹 DARK GOLEM ████████░░░░ 4,200 / 5,000 HP`"*

```javascript
function drawBossBar(ctx, boss) {
  if (!boss.active) return;

  const barW = 620, barH = 18;
  const barX = (720 - barW) / 2;  // căn giữa
  const barY = 8;

  // Nền bar
  ctx.fillStyle = '#1a0000';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // Bar HP
  const hpRatio = boss.hp / boss.maxHp;
  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  gradient.addColorStop(0,   '#ff0000');
  gradient.addColorStop(0.5, '#ff4400');
  gradient.addColorStop(1,   '#ff8800');
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, hpRatio * barW, barH);

  // Viền đỏ
  ctx.strokeStyle = '#ff2200';
  ctx.lineWidth   = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Text: "👹 DARK GOLEM  4,200 / 3,000 HP"
  ctx.font      = 'bold 11px Courier New';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowBlur  = 6;
  ctx.shadowColor = '#ff4400';
  ctx.fillText(
    `👹 ${boss.name}  ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()} HP`,
    720 / 2,
    barY + barH + 12
  );
  ctx.shadowBlur = 0;
}
```

---

#### E. Leaderboard Top 3 (góc trên phải)

Bám sát: *"`🥇 PhamD T5 Lv3 230 HP`"*

```javascript
function drawLeaderboard(ctx, top3) {
  const medals = ['🥇', '🥈', '🥉'];
  let y = 55;

  ctx.font      = '10px Courier New';
  ctx.textAlign = 'right';

  for (let i = 0; i < top3.length; i++) {
    const c = top3[i];
    const hpColor = c.hp > c.maxHp * 0.5 ? '#44ff88' : '#ffaa00';

    ctx.fillStyle = '#cccccc';
    ctx.fillText(`${medals[i]} ${c.name}`, 715, y);

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`T${c.tier}  `, 715, y + 11);

    ctx.fillStyle = hpColor;
    ctx.fillText(`${c.hp}/${c.maxHp}HP`, 715, y + 11);

    y += 28;
  }
}
```

---

#### F. Kill Feed (góc trên trái, cuộn lên)

Bám sát format trong `stickman_battle_royale.md`:
```
⚔️  NguyenA  →  TranB  (-45 HP)
💚  ViewerX  đang ủng hộ  LeC
👑  PhamD  đạt  BOSS SLAYER
💀  TranB  đã bị loại
🎉  MinhE  tham chiến!  [T3]
```

```javascript
const killFeed   = [];     // tối đa 5 dòng gần nhất
const FEED_MAX   = 5;
const FEED_LIFE  = 8000;   // ms mỗi dòng tồn tại

function addKillFeed(text, type) {
  killFeed.unshift({ text, type, born: Date.now() }); // thêm lên đầu
  if (killFeed.length > FEED_MAX) killFeed.pop();
}

const FEED_COLOR = {
  kill:    '#ff6644',   // cam đỏ
  tier:    '#ffdd00',   // vàng
  boss:    '#ff4444',   // đỏ
  support: '#44ff88',   // xanh lá
  join:    '#88ccff',   // xanh nhạt
  death:   '#ff3333',   // đỏ
  revive:  '#aaddff',   // xanh nhạt
};

function drawKillFeed(ctx) {
  const now = Date.now();
  let y = 135;

  // Lọc bỏ dòng quá cũ
  const active = killFeed.filter(f => now - f.born < FEED_LIFE);

  for (const f of active) {
    const age   = (now - f.born) / FEED_LIFE;
    const alpha = age < 0.8 ? 1 : (1 - age) / 0.2; // fade out cuối

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font        = '9px Courier New';
    ctx.fillStyle   = FEED_COLOR[f.type] || '#cccccc';
    ctx.textAlign   = 'left';
    ctx.shadowBlur  = 4;
    ctx.shadowColor = FEED_COLOR[f.type] || '#888';
    ctx.fillText(f.text, 8, y);
    ctx.restore();

    y += 16;
  }
}
```

---

#### G. Timer hồi sinh (30s countdown trên nhân vật chết)

```javascript
function drawReviveTimer(ctx, char) {
  if (!char.isDead) return;
  const remaining = Math.max(0, char.reviveExpiry - Date.now());
  const secs      = Math.ceil(remaining / 1000);
  const progress  = remaining / 30_000; // 0→1

  // Vòng tròn đếm ngược
  const cx = char.x, cy = char.lastNeckY; // vị trí lúc chết
  const r  = 18;

  ctx.save();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + (1 - progress) * Math.PI * 2);
  ctx.stroke();

  ctx.font      = 'bold 10px Courier New';
  ctx.fillStyle = '#ff8888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(secs, cx, cy);
  ctx.restore();
}
```

---

#### H. Hàng chờ (Queue display)

```javascript
function drawQueue(ctx, queue) {
  if (!queue.length) return;

  ctx.font      = '8px Courier New';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';

  const names  = queue.slice(0, 5).map(c => c.name).join(' · ');
  const more   = queue.length > 5 ? ` +${queue.length - 5}` : '';
  ctx.fillText(`⏳ Hàng chờ: ${names}${more}`, 360, 1268);
}
```

---

#### I. Boss Slayer Badge (hiện 3 phút)

```javascript
function drawBossSlayerBadge(ctx, char) {
  if (!char.isBossSlayer) return;

  ctx.save();
  ctx.font         = '10px serif';
  ctx.fillStyle    = '#ffdd00';
  ctx.textAlign    = 'center';
  ctx.shadowBlur   = 10;
  ctx.shadowColor  = '#ff8800';
  ctx.fillText('⭐ BOSS SLAYER', char.x, char.neckY - char.headR - 32);
  ctx.restore();
}
```

---

#### J. Tổng hợp render loop hoàn chỉnh

```javascript
// public/game.js — main loop
function loop() {
  ctx.drawImage(bgCanvas, 0, 0);           // ① Background (offscreen)

  for (const [, char] of characters) {
    drawSupportRing(ctx, char, frameCount); // ② Vòng ủng hộ (dưới thân)
    char.draw(ctx);                         // ③ Thân nhân vật + xương
    drawCharacterUI(ctx, char);             // ④ HP bar + Tên + ATK + Tier
    drawBossSlayerBadge(ctx, char);         // ⑤ Badge ⭐ nếu có
    drawReviveTimer(ctx, char);             // ⑥ Countdown 30s nếu chết
  }

  tickEffects(ctx);                        // ⑦ Skill effects (Fire/Ice...)
  tickParticles(ctx);                      // ⑧ Particles
  tickFloatingTexts(ctx);                  // ⑨ Số bay lên (+HP, -DMG, ATK↑)

  drawBossBar(ctx, boss);                  // ⑩ Boss HP bar (trên cùng)
  drawLeaderboard(ctx, getTop3());         // ⑪ Leaderboard top 3
  drawKillFeed(ctx);                       // ⑫ Kill feed
  drawQueue(ctx, waitingQueue);            // ⑬ Hàng chờ

  frameCount++;
  requestAnimationFrame(loop);
}
```

---

## 5. HIỆU NĂNG — ĐẢM BẢO KHÔNG LAG KHI LIVESTREAM

### 5.1 Ngân sách CPU khi stream (máy i5 thế hệ 8–10)

| Tiến trình | CPU |
|---|---|
| OBS Studio (720p @30fps) | ~25–40% |
| Node.js game server | ~2–5% |
| **Canvas game render** | **~15–25%** cần giữ ở mức này |

### 5.2 Bảng hiệu năng theo số nhân vật

| Nhân vật | Frame time | FPS render | OBS stream | Kết quả |
|---|---|---|---|---|
| 10 | ~7ms | 60fps | 30fps ổn | ✅ An toàn |
| 20 | ~14ms | 60fps | 30fps ổn | ✅ Ổn định |
| **25** | **~17ms** | **~58fps** | **30fps ổn** | ✅ **Giới hạn tối ưu** |
| 30 | ~21ms | ~47fps | giật nhẹ | ⚠️ Cẩn thận |
| 40 | ~28ms | ~35fps | giật rõ | ❌ Không dùng |

### 5.3 Tối ưu bắt buộc (MUST DO)

**① shadowBlur chỉ cho T3+**
```javascript
// ❌ Set shadowBlur cho mọi tier → chậm
// ✅ Chỉ T3+ mới cần glow
if (tier >= 3) { ctx.shadowBlur = 6; ctx.shadowColor = col; }
else           { ctx.shadowBlur = 0; }
```

**② Giới hạn tổng particle**
```javascript
const MAX_PARTICLES = 100;
function spawnP(...) {
  if (particles.length >= MAX_PARTICLES) particles.shift(); // xóa hạt cũ
  particles.push({...});
}
```

**③ Aura spawn mỗi 3 frame, không phải mỗi frame**
```javascript
if (tier >= 3 && frameCount % 3 === 0) {
  const count = tier - 2; // T3=1, T4=2, T5=3 hạt
  for (let i = 0; i < count; i++) spawnP(...);
}
```

**④ Background dùng OffscreenCanvas**
```javascript
// Vẽ 1 lần lúc init, copy mỗi frame (~0.1ms thay vì ~1.5ms)
const bgCanvas = new OffscreenCanvas(720, 1280);
drawBGOnce(bgCanvas.getContext('2d'));

function loop() {
  ctx.drawImage(bgCanvas, 0, 0); // GPU copy
  drawCharacters();
  requestAnimationFrame(loop);
}
```

**⑤ Tắt render khi tab ẩn**
```javascript
document.addEventListener('visibilitychange', () => {
  document.hidden ? cancelAnimationFrame(animId) : (animId = requestAnimationFrame(loop));
});
```

---

## 6. CẤU TRÚC DỰ ÁN

```
stickman-battle-royale/
├── server.js                  ← Entry: Express + Socket.IO + TikTok
├── package.json
│
├── game/                      ← Logic (Node.js)
│   ├── constants.js           ← TIER_STATS, SKILL_CD, BOSS_CONFIG, REVIVE_COST
│   ├── gameState.js           ← characters Map, boss state, queue
│   ├── characterManager.js    ← createChar, tierUp, kill, revive, remove
│   ├── combatSystem.js        ← autoAttack, skillTrigger, calcDMG (fire/ice/thunder/soul)
│   ├── bossSystem.js          ← spawnBoss, bossAoE, bossKilled, mvpSlayer
│   └── supportSystem.js       ← setSupportTarget, resolveTarget, applyHeal, buffATK
│
├── tiktok/
│   └── eventHandler.js        ← onGift / onComment / onLike / onShare
│
└── public/                    ← Frontend (browser)
    ├── index.html             ← Canvas 720×1280 + Socket.IO import
    ├── control.html           ← 🎮 Trang Admin/Test kết nối TikTok (đổi từ test_control_panel.html)
    ├── constants.js           ← Shared constants (TIER_STATS, ARENA...)
    ├── stickman.js            ← Class Stickman compact 0.60× (từ file mẫu)
    ├── effects.js             ← addFX, spawnP, tickParticles, tickEffects
    ├── ui.js                  ← killFeed, leaderboard, bossBar, reviveTimer, queue
    ├── movement.js            ← 2D free-roam AI: seekTarget, wander, softBoundary
    └── game.js                ← Main loop: Socket.IO listeners + render 60fps
```

### 6.1 Tích hợp Control Panel API
Để trang `control.html` tương tác được với game, `server.js` sẽ mở sẵn các API endpoint mô phỏng:
```javascript
// server.js (Express endpoints cho Control Panel)
app.post('/api/simulate-gift', (req, res) => {
  const { user, amount } = req.body;
  tiktok.emit('gift', { uniqueId: user, diamondCount: amount });
  res.send('OK');
});

// Admin commands
app.post('/api/admin-command', (req, res) => {
  const { action } = req.body;
  if (action === 'spawn_boss') spawnBoss();
  if (action === 'clear_queue') gameState.waitingQueue = [];
  res.send('OK');
});
```

---

## 7. GAME CONSTANTS (tham chiếu nhanh)

```javascript
// ── Canvas & Arena ──────────────────────────────────────────
const CANVAS_W    = 720;
const CANVAS_H    = 1280;
const ARENA = { x1: 20, y1: 260, x2: 700, y2: 1260 }; // free-roam zone

// ── Character ───────────────────────────────────────────────
const CHAR_SCALE    = 0.60;   // compact scale
const MAX_ACTIVE    = 25;     // nhân vật tối đa trên sân
const MAX_PARTICLES = 100;    // particles cap
const AURA_EVERY    = 3;      // frame interval cho aura spawn

// ── Tier Stats (từ stickman_battle_royale.md) ───────────────
const TIER_STATS = {
  1: { maxHp: 100, atk: 5,  atkSpeed: 3000, skills: [] },
  2: { maxHp: 150, atk: 8,  atkSpeed: 2500, skills: ['fire'] },
  3: { maxHp: 200, atk: 12, atkSpeed: 2000, skills: ['fire','ice'] },
  4: { maxHp: 250, atk: 18, atkSpeed: 1500, skills: ['fire','ice','thunder'] },
  5: { maxHp: 300, atk: 25, atkSpeed: 1000, skills: ['fire','ice','thunder','soul'] },
};

// ── Skill Cooldowns (ms) ────────────────────────────────────
const SKILL_CD = { fire: 8000, ice: 10000, thunder: 14000, soul: 18000 };

// ── Boss ────────────────────────────────────────────────────
const BOSS = { hp: 3000, atk: 100, atkSpeed: 3000, spawnEvery: 180000 };

// ── Support / Revive ────────────────────────────────────────
const SUPPORT_DURATION = 60_000; // 60 giây
const REVIVE_WINDOW    = 30_000; // 30 giây sau khi chết
const REVIVE_COST      = { 1:20, 2:50, 3:200, 4:800, 5:3000 }; // xu
const ATK_MAX          = 1000;   // ATK tối đa

// ── Gift → HP/ATK Bonus ─────────────────────────────────────
const GIFT_BONUS = [
  { min: 1,   max: 19,  hp: 20,  atk: 5   },
  { min: 20,  max: 99,  hp: 50,  atk: 15  },
  { min: 100, max: 499, hp: 120, atk: 40  },
  { min: 500, max: Infinity, hp: 'FULL', atk: 100 },
];

// ── Kill Tier-Up ────────────────────────────────────────────
const KILLS_PER_TIER = 2; // mỗi 2 kills → +1 Tier

// ── Movement (free-roam) ────────────────────────────────────
const SPEED_AUTO   = 1.8; // px/frame tự động
const SPEED_ATTACK = 3.5; // px/frame theo lệnh @
const SPEED_BOSS   = 2.5; // px/frame boss phase
const SPEED_MAX    = 4.0;
const DAMPING      = 0.95;
```

---

## 8. QUICK START

```bash
# 1. Tạo thư mục project
mkdir stickman-battle-royale && cd stickman-battle-royale

# 2. Khởi tạo & cài dependencies
npm init -y
npm install express socket.io tiktok-live-connector
npm install -g nodemon

# 3. Chạy (trong lúc phát TikTok Live)
nodemon server.js

# 4. Mở 2 cửa sổ để chạy & điều khiển
chrome --window-size=720,1280 --app=http://localhost:4000          # Cửa sổ Game (để OBS quay)
chrome --new-window http://localhost:4000/control.html              # Cửa sổ Control (để bạn test/quản lý)
```

**package.json:**
```json
{
  "name": "stickman-battle-royale",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "tiktok-live-connector": "^1.7.2"
  }
}
```

---

## 9. TÓM TẮT NHANH

| Hạng mục | Lựa chọn | Chi phí |
|---|---|---|
| Kết nối TikTok | `tiktok-live-connector` | $0 |
| Backend | Node.js v20 LTS | $0 |
| Real-time | Socket.IO | $0 |
| Web server | Express.js | $0 |
| Game render | HTML5 Canvas (tái dùng file mẫu) | $0 |
| Game state | In-memory JS Map | $0 |
| Livestream | OBS Studio | $0 |
| **Tổng** | | **$0** |
| Canvas | 720 × 1280 (9:16 TikTok) | — |
| Arena | 720 × 1020 (2D free-roam) | — |
| Character scale | 0.60× compact | — |
| Nhân vật tối đa | **25 active** + hàng chờ | — |
| Game FPS | ~58–60fps | — |
| Stream FPS | 30fps ổn định | — |

---

*Stickman Battle Royale · Tech Stack Guide v3.0 · Bám sát game design v2.7*