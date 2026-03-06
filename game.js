const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

// ===== CANVAS =====
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ===== CONSTANT =====
const GRAVITY = 0.6;
const GROUND_Y = 350;
const WORLD_WIDTH = 3000;

// ===== CAMERA =====
const camera = { x: 0, y: 0 };

let cameraShake = 0;

// ===== INPUT =====
const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

document.addEventListener("mousedown", () => {
  player.attack();
});

// ===== IMAGE LOADER =====
function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// ===== PLAYER =====
class Player {
  constructor() {
    this.x = 200;
    this.y = GROUND_Y - 50;

    this.vx = 0;
    this.vy = 0;

    this.speed = 4;
    this.jumpPower = -12;

    this.facing = 1;
    this.onGround = false;

    this.frame = 0;
    this.frameTimer = 0;

    this.state = "idle";

    this.maxHp = 100;
    this.hp = 100;

    this.attackHit = false;

    this.animations = {
      idle: { img: load("sprites/IDLE.png"), frames: 10 },
      run: { img: load("sprites/RUN.png"), frames: 16 },
      attack: { img: load("sprites/ATTACK 1.png"), frames: 7 },
      hurt: { img: load("sprites/HURT.png"), frames: 4 },
    };
  }

  attack() {
    if (this.state !== "attack") {
      this.state = "attack";
      this.frame = 0;
      this.attackHit = false;
    }
  }

  update() {
    // ===== LOCK MOVEMENT SAAT ATTACK =====
    if (this.state !== "attack") {
      this.vx = 0;

      if (keys["a"]) {
        this.vx = -this.speed;
        this.facing = -1;
      }

      if (keys["d"]) {
        this.vx = this.speed;
        this.facing = 1;
      }

      if ((keys[" "] || keys["w"]) && this.onGround) {
        this.vy = this.jumpPower;
        this.onGround = false;
      }
    } else {
      // saat attack: tidak bisa move
      this.vx = 0;
    }

    // gravity
    this.vy += GRAVITY;

    this.x += this.vx;
    this.y += this.vy;

    if (this.y > GROUND_Y - 50) {
      this.y = GROUND_Y - 50;
      this.vy = 0;
      this.onGround = true;
    }

    // state
    if (this.state !== "attack") {
      if (this.vx !== 0) this.state = "run";
      else this.state = "idle";
    }

    this.animate();
    this.checkAttack();
  }

  checkAttack() {
    if (this.state !== "attack") return;

    if (this.frame === 3 && !this.attackHit) {
      const dist = Math.abs(this.x - enemy.x);

      if (dist < 120 && !enemy.dead) {
        enemy.takeDamage(10, this.facing);
        cameraShake = 15;
      }

      this.attackHit = true;
    }
  }

  animate() {
    const anim = this.animations[this.state];

    this.frameTimer++;

    if (this.frameTimer > 6) {
      this.frame++;
      this.frameTimer = 0;

      if (this.frame >= anim.frames) {
        if (this.state === "attack") this.state = "idle";

        this.frame = 0;
      }
    }
  }

  draw() {
    const anim = this.animations[this.state];
    const scale = 3;

    const screenX = this.x - camera.x;
    const screenY = this.y;

    const reflectionY = GROUND_Y + (GROUND_Y - this.y);

    // reflection
    ctx.save();

    ctx.translate(screenX, reflectionY);
    ctx.scale(this.facing, -1);
    ctx.globalAlpha = 0.25;

    ctx.drawImage(
      anim.img,
      this.frame * 96,
      0,
      96,
      96,
      -48 * scale,
      -80 * scale,
      96 * scale,
      96 * scale,
    );

    ctx.restore();

    // player
    ctx.save();

    ctx.translate(screenX, screenY);
    ctx.scale(this.facing, 1);

    ctx.drawImage(
      anim.img,
      this.frame * 96,
      0,
      96,
      96,
      -48 * scale,
      -48 * scale,
      96 * scale,
      96 * scale,
    );

    ctx.restore();
  }
}

// ===== ENEMY =====
class Enemy {
  constructor(x) {
    this.x = x;
    this.y = GROUND_Y - 50;

    this.vx = 0;
    this.vy = 0;

    this.speed = 1.5;
    this.jumpPower = -12;

    this.frame = 0;
    this.frameTimer = 0;

    this.state = "idle";
    this.facing = -1;

    this.maxHp = 100;
    this.hp = 100;

    this.dead = false;

    this.attackCooldown = 0;
    this.attackHit = false;

    this.knockback = 0;

    this.wanderTimer = 0;
    this.wanderDir = 1;

    this.onGround = false;

    this.animations = player.animations;
  }

  takeDamage(dmg, dir) {
    if (this.dead) return;

    this.hp -= dmg;
    this.knockback = dir * 12;

    if (this.hp <= 0) {
      this.dead = true;
      this.state = "idle";
    }
  }

  update() {
    if (this.dead) return;

    // knockback
    if (this.knockback !== 0) {
      this.x += this.knockback;
      this.knockback *= 0.85;

      if (Math.abs(this.knockback) < 0.5) {
        this.knockback = 0;
      }

      return;
    }

    // gravity
    this.vy += GRAVITY;
    this.y += this.vy;

    if (this.y > GROUND_Y - 50) {
      this.y = GROUND_Y - 50;
      this.vy = 0;
      this.onGround = true;
    }

    const dx = player.x - this.x;
    const dist = Math.abs(dx);

    // cooldown attack
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    // ===== AI LOGIC =====

    if (dist < 120 && this.attackCooldown === 0) {
      this.state = "attack";

      if (this.frame === 3 && !this.attackHit) {
        if (dist < 120) {
          player.hp -= 10;
          cameraShake = 15;

          player.vx = Math.sign(dx) * -6;
        }

        this.attackHit = true;
      }
    } else if (dist < 400) {
      // chase player
      this.x += Math.sign(dx) * this.speed;
      this.facing = Math.sign(dx);
      this.state = "run";

      // jump if player is higher
      if (player.y + 20 < this.y && this.onGround) {
        this.vy = this.jumpPower;
        this.onGround = false;
      }
    } else {
      // wander random
      this.wanderTimer--;

      if (this.wanderTimer <= 0) {
        this.wanderTimer = 60 + Math.random() * 120;
        this.wanderDir = Math.random() > 0.5 ? 1 : -1;
      }

      this.x += this.wanderDir * this.speed * 0.5;
      this.state = "idle";
    }

    // ===== COLLISION HORIZONTAL =====
    const collideDist = 60;

    if (Math.abs(this.x - player.x) < collideDist) {
      const push = Math.sign(this.x - player.x) * 2;

      this.x += push;
      player.x -= push;
    }

    this.animate();
  }

  animate() {
    const anim = this.animations[this.state];

    this.frameTimer++;

    if (this.frameTimer > 6) {
      this.frame++;
      this.frameTimer = 0;

      if (this.frame >= anim.frames) {
        if (this.state === "attack") {
          this.attackCooldown = 40;
          this.attackHit = false;
          this.state = "idle";
        }

        this.frame = 0;
      }
    }
  }

  draw() {
    if (this.dead) return;

    const anim = this.animations[this.state];
    const scale = 3;

    const screenX = this.x - camera.x;
    const screenY = this.y;

    const reflectionY = GROUND_Y + (GROUND_Y - this.y);

    // reflection
    ctx.save();

    ctx.translate(screenX, reflectionY);
    ctx.scale(this.facing, -1);
    ctx.globalAlpha = 0.2;
    ctx.filter = "brightness(0.4)";

    ctx.drawImage(
      anim.img,
      this.frame * 96,
      0,
      96,
      96,
      -48 * scale,
      -80 * scale,
      96 * scale,
      96 * scale,
    );

    ctx.restore();

    // enemy
    ctx.save();

    ctx.filter = "brightness(0.4)";

    ctx.translate(screenX, screenY);
    ctx.scale(this.facing, 1);

    ctx.drawImage(
      anim.img,
      this.frame * 96,
      0,
      96,
      96,
      -48 * scale,
      -48 * scale,
      96 * scale,
      96 * scale,
    );

    ctx.restore();
  }
}

// ===== HP UI =====
function drawFighterHP() {
  const margin = 40;
  const width = canvas.width * 0.35;
  const height = 20;

  const p = player.hp / player.maxHp;
  const e = enemy.hp / enemy.maxHp;

  // player
  ctx.fillStyle = "black";
  ctx.fillRect(margin, margin, width, height);

  ctx.fillStyle = "gray";
  ctx.fillRect(margin, margin, width * p, height);

  ctx.strokeStyle = "white";
  ctx.strokeRect(margin, margin, width, height);

  // enemy
  const ex = canvas.width - width - margin;

  ctx.fillStyle = "black";
  ctx.fillRect(ex, margin, width, height);

  ctx.fillStyle = "gray";
  ctx.fillRect(ex + width * (1 - e), margin, width * e, height);

  ctx.strokeRect(ex, margin, width, height);
}

// ===== OBJECTS =====
const player = new Player();
const enemy = new Enemy(800);

// ===== GAME LOOP =====
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();
  enemy.update();

if (player.hp <= 0) {
  showModal("KALAH");
  return;
}

if (enemy.dead) {
  showModal("MENANG");
  return;
}

  camera.x = player.x - canvas.width / 2;
  camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH - canvas.width));

  // CAMERA SHAKE
  let shakeX = 0;
  let shakeY = 0;

  if (cameraShake > 0) {
    shakeX = (Math.random() - 0.5) * cameraShake;
    shakeY = (Math.random() - 0.5) * cameraShake;

    cameraShake *= 0.9;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // ground
  ctx.fillStyle = "#555";
  ctx.fillRect(-camera.x, GROUND_Y, WORLD_WIDTH, 400);

  enemy.draw();
  player.draw();

  ctx.restore();

  drawFighterHP();

  requestAnimationFrame(gameLoop);
}

gameLoop();

const modal = document.getElementById("modal");
const modalText = document.getElementById("modal-text");

function showModal(text) {
  modal.style.display = "flex";
  modalText.textContent = text;
}

function restart() {
  location.reload();
}
