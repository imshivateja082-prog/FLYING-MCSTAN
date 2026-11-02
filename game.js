/**
 * FLAPPY MC STAN – NIGHT CONCERT EDITION
 * game.js – Full canvas-based Flappy Bird engine
 */

// ─────────────────────────────────────────
//  Constants & Config
// ─────────────────────────────────────────
const CFG = {
  GRAVITY:        0.45,
  JUMP_VEL:      -8.5,
  PIPE_SPEED:     2.8,
  PIPE_INTERVAL:  1600,   // ms between pipe spawns
  PIPE_GAP:       185,    // gap between top and bottom mics
  PIPE_WIDTH:     72,
  CHAR_SIZE:      52,
  GROUND_HEIGHT:  80,
  INITIAL_SPEED:  2.8,
  SPEED_INC:      0.0004, // speed increase per frame
  MAX_ROT:        30,     // max rotation degrees
  ROT_UP:        -25,
  BG_LAYERS:      3,
};

// ─────────────────────────────────────────
//  State
// ─────────────────────────────────────────
let canvas, ctx;
let W, H;
let gameState = 'idle'; // idle | playing | dead
let score     = 0;
let highScore = parseInt(localStorage.getItem('mcstan_hs') || '0');
let animId    = null;
let lastTime  = 0;
let pipeTimer = 0;
let gameSpeed = CFG.INITIAL_SPEED;
let particles = [];
let stars     = [];
let phoneLights = [];

// Character
const bird = {
  x: 0, y: 0,
  vel: 0,
  rot: 0,
  radius: CFG.CHAR_SIZE / 2,
};

// Pipes / microphones
let pipes = [];

// Parallax BG layers
let bgLayers = [
  { x: 0, speed: 0.3, alpha: 1   },
  { x: 0, speed: 0.7, alpha: 0.7 },
  { x: 0, speed: 1.2, alpha: 0.5 },
];

// ─────────────────────────────────────────
//  Images
// ─────────────────────────────────────────
const images = {};
let imagesLoaded = 0;
const IMAGE_SOURCES = {
  character:  'assets/mc-stan-character.png',
  background: 'assets/concert-background.png',
  microphone: 'assets/microphone.png',
};

function preloadImages(cb) {
  const total = Object.keys(IMAGE_SOURCES).length;
  let loaded  = 0;
  for (const [key, src] of Object.entries(IMAGE_SOURCES)) {
    const img = new Image();
    img.onload = () => {
      images[key] = img;
      loaded++;
      if (loaded === total) cb();
    };
    img.onerror = () => {
      // Create a fallback canvas image
      images[key] = createFallback(key);
      loaded++;
      if (loaded === total) cb();
    };
    img.src = src;
  }
}

function createFallback(key) {
  const fc = document.createElement('canvas');
  fc.width = fc.height = 128;
  const fx = fc.getContext('2d');
  if (key === 'character') {
    fx.fillStyle = '#8844ff';
    fx.beginPath();
    fx.arc(64, 64, 62, 0, Math.PI * 2);
    fx.fill();
    fx.fillStyle = '#fff';
    fx.font = 'bold 36px sans-serif';
    fx.textAlign = 'center';
    fx.textBaseline = 'middle';
    fx.fillText('MS', 64, 64);
  } else if (key === 'background') {
    fx.fillStyle = '#050118';
    fx.fillRect(0, 0, 128, 128);
  } else if (key === 'microphone') {
    // Draw a simple mic shape
    fx.fillStyle = '#888';
    fx.beginPath();
    fx.roundRect(44, 10, 40, 70, 20);
    fx.fill();
    fx.fillStyle = '#555';
    fx.beginPath();
    fx.roundRect(50, 80, 28, 40, 4);
    fx.fill();
  }
  return fc;
}

// ─────────────────────────────────────────
//  Audio
// ─────────────────────────────────────────
const bgMusic   = new Audio('assets/samay-audio.mp4');
const goSound   = new Audio('assets/mc-stan-audio.mp4');

bgMusic.loop = true;
bgMusic.volume = 0.75;
goSound.loop = false;
goSound.volume = 0.9;

function playBgMusic() {
  goSound.pause();
  goSound.currentTime = 0;
  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});
}

function stopBgMusic() {
  bgMusic.pause();
}

function playGoSound() {
  bgMusic.pause();
  goSound.currentTime = 0;
  goSound.play().catch(() => {});
}

function stopGoSound() {
  goSound.pause();
  goSound.currentTime = 0;
}

// ─────────────────────────────────────────
//  Canvas setup
// ─────────────────────────────────────────
function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  bird.x = W * 0.22;
  if (gameState === 'idle') {
    bird.y = H * 0.42;
  }
  initStars();
  initPhoneLights();
}

// ─────────────────────────────────────────
//  Stars / Atmosphere
// ─────────────────────────────────────────
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
    });
  }
}

function initPhoneLights() {
  phoneLights = [];
  const count = Math.floor(W / 6);
  for (let i = 0; i < count; i++) {
    phoneLights.push({
      x: Math.random() * W,
      y: H - CFG.GROUND_HEIGHT - Math.random() * 50,
      alpha: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.04 + 0.02,
      color: `hsl(${Math.floor(Math.random() * 60 + 180)}, 100%, 80%)`,
    });
  }
}

// ─────────────────────────────────────────
//  Particles
// ─────────────────────────────────────────
function spawnPassParticles(x, y) {
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    const hue   = Math.floor(Math.random() * 80 + 260); // purples/pinks
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: Math.random() * 0.04 + 0.02,
      r: Math.random() * 5 + 2,
      color: `hsl(${hue}, 100%, 65%)`,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.12;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────
//  Background rendering
// ─────────────────────────────────────────
let bgOffset = 0;

function drawBackground(dt) {
  // Base sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0,   '#030010');
  skyGrad.addColorStop(0.4, '#060124');
  skyGrad.addColorStop(0.7, '#080230');
  skyGrad.addColorStop(1,   '#000');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Draw background image (tiled / scrolling)
  if (images.background) {
    const bW = images.background.width;
    const bH = images.background.height;
    const scale = H / bH;
    const sw = bW * scale;

    // Move at very slow speed for parallax feel
    if (gameState === 'playing') bgOffset -= 0.5;
    bgOffset = bgOffset % sw;

    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let x = bgOffset - sw; x < W + sw; x += sw) {
      ctx.drawImage(images.background, x, 0, sw, H);
    }
    ctx.restore();
  }

  // Stars
  for (const s of stars) {
    s.twinkle += s.speed;
    const a = s.alpha * (0.5 + 0.5 * Math.sin(s.twinkle));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Atmosphere glow beams
  drawAtmosphereBeams(dt);

  // Phone lights (crowd)
  drawPhoneLights();

  // Ground
  drawGround();
}

// Animated light beams
let beamTime = 0;
const BEAMS = [
  { x: 0.15, hue: 280, speed: 0.6,  phase: 0 },
  { x: 0.35, hue: 200, speed: 0.4,  phase: 1 },
  { x: 0.55, hue: 340, speed: 0.7,  phase: 2 },
  { x: 0.75, hue: 260, speed: 0.5,  phase: 3 },
  { x: 0.9,  hue: 300, speed: 0.65, phase: 4 },
];

function drawAtmosphereBeams(dt) {
  beamTime += (dt || 16) * 0.001;
  for (const b of BEAMS) {
    const swing   = Math.sin(beamTime * b.speed + b.phase) * 0.12;
    const xPos    = (b.x + swing) * W;
    const grad    = ctx.createLinearGradient(xPos, H * 0.5, xPos, 0);
    grad.addColorStop(0, `hsla(${b.hue}, 100%, 60%, 0)`);
    grad.addColorStop(0.5, `hsla(${b.hue}, 100%, 65%, 0.07)`);
    grad.addColorStop(1, `hsla(${b.hue}, 100%, 70%, 0.18)`);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPos - 2, H);
    ctx.lineTo(xPos + 2, H);
    ctx.lineTo(xPos + 60, 0);
    ctx.lineTo(xPos - 60, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // Horizontal laser lines
  const laserColors = ['#c83aff', '#0096ff', '#ff2d87', '#00ffb3'];
  const laserY      = [H * 0.3, H * 0.42, H * 0.56, H * 0.64];
  for (let i = 0; i < laserColors.length; i++) {
    const pulse  = 0.3 + 0.25 * Math.sin(beamTime * 1.5 + i);
    const angleY = Math.sin(beamTime * 0.8 + i * 0.7) * 20;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = laserColors[i];
    ctx.lineWidth   = 1.2;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = laserColors[i];
    ctx.beginPath();
    ctx.moveTo(0, laserY[i] + angleY);
    ctx.lineTo(W, laserY[i] - angleY);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPhoneLights() {
  for (const p of phoneLights) {
    p.twinkle += p.speed;
    const a = p.alpha * (0.4 + 0.6 * Math.abs(Math.sin(p.twinkle)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle   = p.color;
    ctx.shadowBlur  = 6;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGround() {
  // Ground bar
  const gGrad = ctx.createLinearGradient(0, H - CFG.GROUND_HEIGHT, 0, H);
  gGrad.addColorStop(0, 'rgba(80,0,120,0.6)');
  gGrad.addColorStop(0.3, 'rgba(20,0,40,0.9)');
  gGrad.addColorStop(1, '#000');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, H - CFG.GROUND_HEIGHT, W, CFG.GROUND_HEIGHT);

  // Ground glow line
  ctx.save();
  ctx.strokeStyle = 'rgba(160,50,255,0.5)';
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 14;
  ctx.shadowColor = 'rgba(160,50,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, H - CFG.GROUND_HEIGHT);
  ctx.lineTo(W, H - CFG.GROUND_HEIGHT);
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────
//  Character
// ─────────────────────────────────────────
function drawCharacter() {
  const { x, y, rot, radius } = bird;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);

  // Outer glow ring (animated color)
  const t      = Date.now() * 0.002;
  const hue    = (t * 80) % 360;
  ctx.shadowBlur  = 22;
  ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;

  // Neon ring
  const ringGrad = ctx.createLinearGradient(-radius - 6, 0, radius + 6, 0);
  ringGrad.addColorStop(0,   `hsl(${hue}, 100%, 65%)`);
  ringGrad.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 100%, 70%)`);
  ringGrad.addColorStop(1,   `hsl(${hue}, 100%, 65%)`);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth   = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Clip character to circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();

  if (images.character) {
    ctx.drawImage(images.character, -radius, -radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = '#8844ff';
    ctx.fill();
  }

  // Inner glow overlay
  const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
  glowGrad.addColorStop(0, 'rgba(255,255,255,0)');
  glowGrad.addColorStop(1, `hsla(${hue}, 80%, 50%, 0.2)`);
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─────────────────────────────────────────
//  Microphone Obstacles
// ─────────────────────────────────────────
const MIC_W = CFG.PIPE_WIDTH;

function spawnPipe() {
  const minY   = H * 0.15;
  const maxY   = H - CFG.GROUND_HEIGHT - CFG.PIPE_GAP - H * 0.15;
  const gapTop = Math.random() * (maxY - minY) + minY;
  pipes.push({
    x:          W + MIC_W,
    gapTop:     gapTop,
    gapBottom:  gapTop + CFG.PIPE_GAP,
    passed:     false,
    glowHue:    Math.floor(Math.random() * 60 + 260),
  });
}

function updatePipes(dt) {
  pipeTimer += dt;
  if (pipeTimer >= CFG.PIPE_INTERVAL) {
    pipeTimer = 0;
    spawnPipe();
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= gameSpeed;

    // Score
    if (!p.passed && p.x + MIC_W < bird.x - bird.radius) {
      p.passed = true;
      score++;
      document.getElementById('current-score').textContent = score;
      spawnPassParticles(bird.x + bird.radius + 10, bird.y);
    }

    if (p.x + MIC_W < -50) {
      pipes.splice(i, 1);
    }
  }
}

function drawMicrophone(x, y, height, flipped) {
  if (!images.microphone) return;

  ctx.save();
  ctx.shadowBlur  = 18;
  ctx.shadowColor = `hsla(270, 100%, 65%, 0.7)`;

  if (flipped) {
    ctx.translate(x + MIC_W / 2, y + height / 2);
    ctx.scale(1, -1);
    ctx.drawImage(images.microphone, -MIC_W / 2, -height / 2, MIC_W, height);
  } else {
    ctx.drawImage(images.microphone, x, y, MIC_W, height);
  }
  ctx.restore();

  // Neon accent line at the inner edge
  ctx.save();
  ctx.strokeStyle = `rgba(180,80,255,0.8)`;
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 12;
  ctx.shadowColor = `rgba(180,80,255,1)`;
  if (flipped) {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + MIC_W, y + height);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + MIC_W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPipes() {
  for (const p of pipes) {
    const topH    = p.gapTop;
    const bottomH = H - CFG.GROUND_HEIGHT - p.gapBottom;

    // Top microphone (hanging down, flipped)
    drawMicrophone(p.x, 0, topH, true);

    // Bottom microphone (rising up)
    drawMicrophone(p.x, p.gapBottom, bottomH, false);

    // Gap glow
    ctx.save();
    ctx.globalAlpha = 0.12;
    const gapGrad = ctx.createLinearGradient(p.x, p.gapTop, p.x, p.gapBottom);
    gapGrad.addColorStop(0,   'rgba(160,80,255,0.5)');
    gapGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gapGrad.addColorStop(1,   'rgba(160,80,255,0.5)');
    ctx.fillStyle = gapGrad;
    ctx.fillRect(p.x, p.gapTop, MIC_W, CFG.PIPE_GAP);
    ctx.restore();
  }
}

// ─────────────────────────────────────────
//  Collision Detection
// ─────────────────────────────────────────
function checkCollision() {
  const r = bird.radius * 0.75; // slightly forgiving hitbox

  // Ground collision
  if (bird.y + r >= H - CFG.GROUND_HEIGHT) return true;
  // Ceiling collision
  if (bird.y - r <= 0) return true;

  // Pipe collisions
  for (const p of pipes) {
    if (bird.x + r > p.x + 6 && bird.x - r < p.x + MIC_W - 6) {
      if (bird.y - r < p.gapTop || bird.y + r > p.gapBottom) {
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────
//  Main Game Loop
// ─────────────────────────────────────────
function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  // Update speed
  if (gameState === 'playing') {
    gameSpeed = Math.min(CFG.INITIAL_SPEED + timestamp * CFG.SPEED_INC, 7);
  }

  // ── Draw ──
  drawBackground(dt);
  drawPipes();
  drawParticles();
  drawCharacter();

  // ── Physics ──
  if (gameState === 'playing') {
    bird.vel += CFG.GRAVITY;
    bird.y   += bird.vel;

    // Rotation
    const targetRot = bird.vel < 0
      ? CFG.ROT_UP
      : Math.min(bird.vel * 4.5, CFG.MAX_ROT);
    bird.rot += (targetRot - bird.rot) * 0.18;

    // Update pipes
    updatePipes(dt);
    updateParticles();

    // Collision
    if (checkCollision()) {
      triggerGameOver();
      return;
    }
  } else if (gameState === 'idle') {
    // Idle floating animation
    bird.y = H * 0.42 + Math.sin(timestamp * 0.002) * 8;
    bird.rot = Math.sin(timestamp * 0.002) * 5;
    updateParticles();
  }

  animId = requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────
//  Game State Functions
// ─────────────────────────────────────────
function startGame() {
  // Reset state
  score     = 0;
  gameSpeed = CFG.INITIAL_SPEED;
  pipes     = [];
  particles = [];
  pipeTimer = 0;

  bird.x   = W * 0.22;
  bird.y   = H * 0.42;
  bird.vel = 0;
  bird.rot = 0;

  document.getElementById('current-score').textContent = '0';

  // Hide start screen, show HUD
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  gameState = 'playing';
  stopGoSound();
  playBgMusic();

  if (animId) cancelAnimationFrame(animId);
  lastTime = performance.now();
  animId = requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
  gameState = 'dead';
  stopBgMusic();
  playGoSound();

  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('mcstan_hs', highScore);
  }

  // Show game over screen
  document.getElementById('go-score').textContent     = score;
  document.getElementById('go-highscore').textContent = highScore;
  document.getElementById('hud').classList.add('hidden');

  // Slight delay before showing game over for drama
  setTimeout(() => {
    document.getElementById('gameover-screen').classList.remove('hidden');
  }, 600);
}

function restartGame() {
  stopGoSound();
  document.getElementById('gameover-screen').classList.add('hidden');
  startGame();
}

// ─────────────────────────────────────────
//  Input
// ─────────────────────────────────────────
function jump() {
  if (gameState === 'playing') {
    bird.vel = CFG.JUMP_VEL;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
});

document.addEventListener('click', (e) => {
  // Prevent jump if clicking a button
  if (e.target.closest('button')) return;
  jump();
});

document.addEventListener('touchstart', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault();
  jump();
}, { passive: false });

// ─────────────────────────────────────────
//  Init
// ─────────────────────────────────────────
function init() {
  initCanvas();

  // Update high score on start screen
  document.getElementById('start-hs-value').textContent = highScore;

  preloadImages(() => {
    // Start idle animation immediately
    gameState = 'idle';
    lastTime  = performance.now();
    animId    = requestAnimationFrame(gameLoop);
  });
}

window.addEventListener('load', init);
