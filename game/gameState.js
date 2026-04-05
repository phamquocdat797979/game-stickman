const gameState = {
  characters:   new Map(), // username -> CharacterData object
  supportMap:   new Map(), // username -> { target, expiry }
  waitingQueue: [],        // array chứa thông tin characters đợi tới lượt
  bossActive:   false,
  frameCount:   0,
  
  boss: {
    active: false,
    hp: 0,
    maxHp: 3000,
    name: 'DARK GOLEM',
    x: 360, 
    y: 760, // Giữa bản đồ arena 720x1020
    dmgDealt: new Map(), // username -> tổng dmg đã đánh vô boss
    atkInterval: null
  },
  
  io: null, // Sẽ được gán tại server.js để emit từ server về UI
};

module.exports = gameState;
