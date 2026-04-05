function updateMovement(charsMap, dt) {
  for (const [name, char] of charsMap) {
    if (char.isDead) continue;
    
    // Server assigns targetX/Y. If client doesn't have exact target, it wanders around it.
    const dx = char.targetX - char.x;
    const dy = char.targetY - char.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      char.vx += (dx / dist) * 0.2;
      char.vy += (dy / dist) * 0.2;
    } else {
      // Wiggle random when idle
      if (Math.random() < 0.05) {
        char.vx += (Math.random() - 0.5);
        char.vy += (Math.random() - 0.5);
      }
      
      // Pick a random internal target occasionally if idle
      if (Math.random() < 0.01) {
        char.targetX = char.x + (Math.random() - 0.5) * 50;
        char.targetY = char.y + (Math.random() - 0.5) * 50;
      }
    }
    
    char.vx *= 0.9;
    char.vy *= 0.9;

    // Boundaries check hard stop
    if (char.x < ARENA.x1) { char.x = ARENA.x1; char.vx *= -0.5; char.targetX = char.x; }
    if (char.x > ARENA.x2) { char.x = ARENA.x2; char.vx *= -0.5; char.targetX = char.x; }
    if (char.y < ARENA.y1) { char.y = ARENA.y1; char.vy *= -0.5; char.targetY = char.y; }
    if (char.y > ARENA.y2) { char.y = ARENA.y2; char.vy *= -0.5; char.targetY = char.y; }
    
    // Cap velocity
    const speed = Math.hypot(char.vx, char.vy);
    if (speed > 2.5) {
      char.vx = (char.vx / speed) * 2.5;
      char.vy = (char.vy / speed) * 2.5;
    }

    char.x += char.vx;
    char.y += char.vy;
  }
}
