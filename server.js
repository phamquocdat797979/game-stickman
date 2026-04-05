const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 4000;

// Middleware để parse body (cho admin/test endpoints)
app.use(express.json());

// Phục vụ frontend tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// === KHỞI TẠO GAME LOGIC ===
const gameState = require('./game/gameState');
const bossSystem = require('./game/bossSystem');
const combatSystem = require('./game/combatSystem');
const { setupTikTokEvents } = require('./tiktok/eventHandler');

// Cắm io vào gameState để các module có thể gửi sự kiện cho player
gameState.io = io;

// Khởi tạo máy chủ mô phỏng TikTok (Emulator)
const tiktokEmulator = setupTikTokEvents('EMULATOR', io);
app.set('tiktok-emulator', tiktokEmulator);

// Lưu biến instance connection để có thể đóng mở tuỳ ý
let currentTikTokConnection = null;

// === ADMIN & TEST ENDPOINTS ===
app.post('/api/simulate-gift', (req, res) => {
  const { user, amount } = req.body;
  // TODO: Phát event gift vào hệ thống game thông qua tiktokEvents
  console.log(`[Test] Nhận gift ảo từ ${user}: ${amount} xu`);
  req.app.get('tiktok-emulator')?.emit('gift', { uniqueId: user, diamondCount: amount });
  res.json({ success: true, message: 'Simulated gift' });
});

app.post('/api/simulate-comment', (req, res) => {
  const { user, text } = req.body;
  console.log(`[Test] Nhận comment ảo từ ${user}: ${text}`);
  req.app.get('tiktok-emulator')?.emit('comment', { uniqueId: user, comment: text });
  res.json({ success: true });
});

app.post('/api/simulate-like', (req, res) => {
  const { user, count } = req.body;
  console.log(`[Test] Nhận like ảo từ ${user} x${count}`);
  req.app.get('tiktok-emulator')?.emit('like', { uniqueId: user, likeCount: count });
  res.json({ success: true });
});

app.post('/api/simulate-share', (req, res) => {
  const { user } = req.body;
  console.log(`[Test] Nhận share ảo từ ${user}`);
  req.app.get('tiktok-emulator')?.emit('share', { uniqueId: user });
  res.json({ success: true });
});

app.post('/api/admin-command', (req, res) => {
  const { action } = req.body;
  console.log(`[Admin] Nhận lệnh điều khiển: ${action}`);
  
  if (action === 'spawn_boss') bossSystem.triggerBossWarning();
  if (action === 'clear_queue') gameState.waitingQueue = [];
  if (action === 'kill_all') {
    for (const [name, char] of gameState.characters) {
      if (!char.isDead) require('./game/characterManager').onCharacterDied(name, 'THE_GODS');
    }
  }
  if (action === 'add_bots') {
    for (let i = 1; i <= 5; i++) {
       const user = `Bot_${Math.floor(Math.random()*1000)}`;
       tiktokEmulator.emit('gift', { uniqueId: user, diamondCount: 1 });
    }
  }
  
  res.json({ success: true });
});

app.post('/api/connect-tiktok', (req, res) => {
  const { username } = req.body;
  console.log(`[Admin] Yêu cầu kết nối TikTok tới @${username}`);
  
  // Dọn connection cũ nếu đang chạy
  if (currentTikTokConnection) {
    try { currentTikTokConnection.disconnect(); } catch(e){}
  }
  // Setup connection mới
  currentTikTokConnection = setupTikTokEvents(username, io);
  res.json({ success: true });
});

app.post('/api/disconnect-tiktok', (req, res) => {
  if (currentTikTokConnection) {
    try { currentTikTokConnection.disconnect(); } catch(e){}
    currentTikTokConnection = null;
  }
  res.json({ success: true });
});

// Gắn biến io vào global / app để các module dễ lấy
app.set('io', io);

// Lắng nghe WebSocket
io.on('connection', (socket) => {
  console.log(`[Socket] Trình duyệt / OBS vừa kết nối (ID: ${socket.id})`);
  
  // Gửi thông tin sơ khởi nếu cần
  // socket.emit('queue_updated', { queue: gameState.waitingQueue.map(c => c.name) });

  socket.on('disconnect', () => {
    console.log(`[Socket] Bị ngắt kết nối (ID: ${socket.id})`);
  });
});

// Chạy server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎮 STICKMAN BATTLE ROYALE SERVER ĐANG CHẠY CỔNG ${PORT}`);
  console.log(`- Màn hình Game/OBS: http://localhost:${PORT}`);
  console.log(`- Bảng Điều Khiển:   http://localhost:${PORT}/control.html`);
  console.log(`======================================================\n`);
  
  // Bật game loop backend (10 tick/s)
  setInterval(combatSystem.combatTick, 100);
});
