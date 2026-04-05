// Helpers
const lerp = (a,b,t) => a+(b-a)*t;
const dist  = (a,b)  => Math.hypot(b.x-a.x, b.y-a.y);
const ang   = (a,b)  => Math.atan2(b.y-a.y, b.x-a.x);

function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++) h=(h*33^s.charCodeAt(i))>>>0; return h; }
function nameColor(n){ return `hsl(${hashStr(n)%360},88%,62%)`; }

function solveIK(base, target, l1, l2, flip=1){
  let d   = Math.min(dist(base,target), l1+l2-0.5);
  let a   = ang(base,target);
  let cos = Math.max(-1,Math.min(1,(d*d+l1*l1-l2*l2)/(2*d*l1)));
  let a1  = Math.acos(cos)*flip;
  return { joint:{x:base.x+Math.cos(a+a1)*l1, y:base.y+Math.sin(a+a1)*l1}, end:target };
}

function drawBoneWithChars(ctx, ax, ay, bx, by, chars, boneColor, charColor, glowColor, boneWidth, charSize, wobbleAmt, wobblePhase) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = boneColor;
  ctx.lineWidth   = boneWidth;
  ctx.lineCap     = 'round';
  ctx.shadowBlur  = 8;
  ctx.shadowColor = boneColor;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ax, ay, boneWidth*0.8, 0, Math.PI*2);
  ctx.fillStyle = boneColor;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();

  if (!chars || chars.length === 0) return;
  let boneLen = dist({x:ax,y:ay},{x:bx,y:by});
  let boneAng = ang({x:ax,y:ay},{x:bx,y:by});

  let perpX = -Math.sin(boneAng);
  let perpY =  Math.cos(boneAng);

  let spacing = Math.min(charSize * 1.1, boneLen / chars.length);
  let count   = Math.max(1, Math.floor(boneLen / spacing));
  let margin  = spacing * 0.5;

  ctx.save();
  ctx.font          = `bold ${charSize}px Courier New`;
  ctx.fillStyle     = charColor;
  ctx.shadowBlur    = 14;
  ctx.shadowColor   = glowColor;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';

  for (let i = 0; i < count; i++) {
    let t  = count === 1 ? 0.5 : i / (count - 1);
    let px = ax + Math.cos(boneAng) * (margin + t*(boneLen - margin*2));
    let py = ay + Math.sin(boneAng) * (margin + t*(boneLen - margin*2));
    let w  = Math.sin(wobblePhase + t*Math.PI*2) * wobbleAmt;
    px += perpX * w;
    py += perpY * w;

    let ch = chars[i % chars.length];
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(boneAng + Math.PI/2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

class Stickman {
  constructor(name, tier, overrideColor) {
    this.name = name;
    this.tier = tier || 1;
    this.col  = overrideColor || nameColor(name);
    
    this.x = 360;
    this.y = 800; // This acts as HIP point in original design, we'll keep it as GROUND/foot base
    this.targetX = this.x;
    this.targetY = this.y;
    this.vx = 0;
    this.vy = 0;

    let raw = name.toUpperCase().replace(/\s+/g,'').split('');
    while(raw.length < 9) raw = [...raw,...raw];
    this.chars = {
      torso:  raw.slice(0, Math.ceil(raw.length*.3)),
      uArmL:  raw.slice(Math.ceil(raw.length*.3),  Math.ceil(raw.length*.45)),
      lArmL:  raw.slice(Math.ceil(raw.length*.45), Math.ceil(raw.length*.55)),
      uArmR:  raw.slice(Math.ceil(raw.length*.55), Math.ceil(raw.length*.7)),
      lArmR:  raw.slice(Math.ceil(raw.length*.7),  Math.ceil(raw.length*.8)),
      uLegL:  raw.slice(Math.ceil(raw.length*.8),  Math.ceil(raw.length*.87)),
      lLegL:  raw.slice(Math.ceil(raw.length*.87), Math.ceil(raw.length*.93)),
      uLegR:  raw.slice(Math.ceil(raw.length*.93), Math.ceil(raw.length*.97)),
      lLegR:  raw.slice(Math.ceil(raw.length*.97)),
    };
    for(let k in this.chars) if(!this.chars[k].length) this.chars[k]=[raw[0]];

    this.boneCol = `hsla(${hashStr(name)%360},40%,25%,0.9)`;

    let sc = (1+(this.tier-1)*.07) * CS;
    this.headR  = 14 * CS;
    this.torsoH = 42 * sc;
    this.aL1=20*sc; this.aL2=18*sc;
    this.lL1=24*sc; this.lL2=21*sc;
    this.charSz = (11+this.tier) * CS;
    this.boneW  = (2+this.tier*.5) * CS;

    this.walkCycle  = Math.random()*Math.PI*2;
    this.idleBob    = Math.random()*Math.PI*2;
    this.wobblePhase= Math.random()*Math.PI*2;
    this.auraT      = 0;
    
    this.isAttacking= false;
    this.attackAnim = 0;
    this.skill      = -1;
    
    this.hp = 100;
    this.maxHp = 100;
    this.atk = 5;
    this.isDead = false;
  }

  get neck(){ let b=Math.sin(this.idleBob)*2.5*CS; return {x:this.x, y:this.y-this.lL1-this.lL2-this.torsoH+b}; }
  get hip(){  let b=Math.sin(this.idleBob)*2.5*CS; return {x:this.x, y:this.y-this.lL1-this.lL2+b}; }

  update(dt) {
    // If client movement changed x/y via vx/vy we can increase walkCycle proportionally
    let speed = Math.hypot(this.vx, this.vy);
    this.walkCycle += (speed > 0.5 ? 0.15 : 0);
    this.idleBob    += .045;
    this.wobblePhase+= .06;
    this.auraT++;

    if(this.isAttacking){
      this.attackAnim+=.045;
      if(this.attackAnim>=1){ this.isAttacking=false; this.attackAnim=0; this.skill=-1; }
    }
  }

  draw(ctx) {
    if (this.isDead) return;
    
    let neck=this.neck, hip=this.hip;
    let col=this.col, bone=this.boneCol;
    let speed = Math.hypot(this.vx, this.vy);
    let isWalking = speed > 0.5;
    
    let wobAmt = this.isAttacking ? 0.5 : 1.8;
    wobAmt *= CS;

    let wL = isWalking ? Math.sin(this.walkCycle)*16*CS : 0;
    let wR = isWalking ? Math.sin(this.walkCycle+Math.PI)*16*CS : 0;
    
    let footL={x:hip.x-10*CS+wL, y:this.y};
    let footR={x:hip.x+10*CS+wR, y:this.y};
    
    let ikLL=solveIK(hip,footL,this.lL1,this.lL2, 1);
    let ikLR=solveIK(hip,footR,this.lL1,this.lL2,-1);

    drawBoneWithChars(ctx, hip.x,hip.y, ikLL.joint.x,ikLL.joint.y, this.chars.uLegL, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase);
    drawBoneWithChars(ctx, ikLL.joint.x,ikLL.joint.y, footL.x,footL.y, this.chars.lLegL, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+1);
    drawBoneWithChars(ctx, hip.x,hip.y, ikLR.joint.x,ikLR.joint.y, this.chars.uLegR, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+.5);
    drawBoneWithChars(ctx, ikLR.joint.x,ikLR.joint.y, footR.x,footR.y, this.chars.lLegR, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+1.5);

    drawBoneWithChars(ctx, neck.x,neck.y, hip.x,hip.y, this.chars.torso, bone,col,col, this.boneW+1,this.charSz, wobAmt*.6, this.wobblePhase);

    ctx.save();
    ctx.beginPath(); ctx.arc(hip.x,hip.y,(this.boneW+1)*.9,0,Math.PI*2);
    ctx.fillStyle=bone; ctx.fill(); ctx.restore();

    let handL, handR;
    if(this.isAttacking){
      let p=this.attackAnim;
      let sp=Math.sin(p*Math.PI); 
      handR={x:neck.x+(10+sp*45)*CS,y:neck.y+(8-sp*12)*CS}; 
      handL={x:neck.x-(10+sp*45)*CS,y:neck.y+(8-sp*12)*CS};
    } else {
      let aw = isWalking ? Math.sin(this.walkCycle)*13*CS : Math.sin(this.idleBob)*5*CS;
      let ay = isWalking ? Math.sin(this.walkCycle)*8*CS : 0;
      handR={x:neck.x+28*CS-aw, y:neck.y+28*CS-ay};
      handL={x:neck.x-28*CS+aw, y:neck.y+28*CS+ay};
    }
    
    let ikAR=solveIK(neck,handR,this.aL1,this.aL2, 1);
    let ikAL=solveIK(neck,handL,this.aL1,this.aL2,-1);

    drawBoneWithChars(ctx, neck.x,neck.y, ikAL.joint.x,ikAL.joint.y, this.chars.uArmL, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+2);
    drawBoneWithChars(ctx, ikAL.joint.x,ikAL.joint.y, handL.x,handL.y, this.chars.lArmL, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+3);
    drawBoneWithChars(ctx, neck.x,neck.y, ikAR.joint.x,ikAR.joint.y, this.chars.uArmR, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+2.5);
    drawBoneWithChars(ctx, ikAR.joint.x,ikAR.joint.y, handR.x,handR.y, this.chars.lArmR, bone,col,col, this.boneW,this.charSz, wobAmt, this.wobblePhase+3.5);

    ctx.save();
    ctx.beginPath(); ctx.arc(neck.x,neck.y,this.boneW*.9,0,Math.PI*2);
    ctx.fillStyle=bone; ctx.fill(); ctx.restore();

    let headY=neck.y-this.headR;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(neck.x,neck.y); ctx.lineTo(neck.x,headY+this.headR);
    ctx.strokeStyle=bone; ctx.lineWidth=this.boneW; ctx.lineCap='round';
    ctx.shadowBlur=6; ctx.shadowColor=bone; ctx.stroke();

    ctx.beginPath(); ctx.arc(neck.x,headY,this.headR,0,Math.PI*2);
    ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.shadowBlur=18; ctx.shadowColor=col; ctx.stroke();
    ctx.beginPath(); ctx.arc(neck.x,headY,this.headR,0,Math.PI*2);
    ctx.fillStyle=`${col.replace('hsl','hsla').replace(')',',0.08)')}`; ctx.fill();
    
    ctx.fillStyle=col; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(neck.x-4*CS,headY-2*CS,2.2*CS,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(neck.x+4*CS,headY-2*CS,2.2*CS,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(neck.x,headY+4*CS,4*CS,0,Math.PI); ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke();

    let marks=['','','★','★★','⭐','👑'];
    if(this.tier>=2){
      ctx.font='11px serif'; ctx.fillStyle=col; ctx.textAlign='center'; ctx.shadowBlur=10;
      ctx.fillText(marks[this.tier]||'', neck.x, headY-this.headR-5);
    }
    ctx.restore();

    this.drawUI(ctx, neck.x, headY);
  }

  drawUI(ctx, nx, headY) {
    ctx.save();
    let bw=42, bh=3, bx=nx-bw/2, by=headY-this.headR-20;
    
    ctx.fillStyle='#111'; 
    ctx.fillRect(bx,by,bw,bh);
    let hw=Math.max(0, Math.min(1, this.hp/this.maxHp))*bw;
    ctx.fillStyle=this.hp>this.maxHp*.6?'#44ff66':this.hp>this.maxHp*.3?'#ffaa00':'#ff3333';
    ctx.fillRect(bx,by,hw,bh);
    ctx.strokeStyle='#222'; ctx.lineWidth=.5; ctx.strokeRect(bx,by,bw,bh);
    
    ctx.font='bold 9px Courier New'; 
    ctx.fillStyle='#111'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(this.name, nx, by-2);
    
    ctx.font = '7px Courier New';
    ctx.fillStyle = '#ffcc44'; ctx.textAlign='left';
    ctx.fillText(`⚔${Math.floor(this.atk)}`, bx + bw + 2, by+bh);
    ctx.restore();
  }

  doAttackAnim() {
    if(!this.isAttacking) {
      this.isAttacking=true; 
      this.attackAnim=0;
    }
  }
}
