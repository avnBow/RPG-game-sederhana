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
const WORLD_HEIGHT = 800;

// ===== CAMERA =====
const camera = {
  x: 0,
  y: 0,
};

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

// ===== PLAYER =====
class Player {
  constructor() {
    this.x = 200;
    this.y = GROUND_Y - 50;

    this.vx = 0;
    this.vy = 0;

    this.speed = 4;
    this.jumpPower = -12;

    this.width = 96;
    this.height = 96;

    this.onGround = false;
    this.facing = 1;

    this.frame = 0;
    this.frameTimer = 0;

    this.state = "idle";

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
    }
  }

  update() {
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

    // gravity
    this.vy += GRAVITY;

    this.x += this.vx;
    this.y += this.vy;

    // ground collision
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
  }

  animate() {
    const anim = this.animations[this.state];

    this.frameTimer++;

    if (this.frameTimer > 6) {
      this.frame++;
      this.frameTimer = 0;

      if (this.frame >= anim.frames) {
        if (this.state === "attack") {
          this.state = "idle";
        }

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

    // ===== REFLECTION =====
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
      -80 * scale, // lebih ke bawah dari sebelumnya
      96 * scale,
      96 * scale,
    );

    ctx.restore();

    // ===== PLAYER =====
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

// ===== IMAGE LOADER =====
function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const player = new Player();


// ===== GAME LOOP =====
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();

  // camera follow X only
  camera.x = player.x - canvas.width / 2;
  camera.y = 0;

  // camera limit
  camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH - canvas.width));

  // draw ground
  ctx.fillStyle = "#555";
  ctx.fillRect(-camera.x, GROUND_Y, WORLD_WIDTH, 400);

  // draw player
  player.draw();

  requestAnimationFrame(gameLoop);
}

gameLoop();
