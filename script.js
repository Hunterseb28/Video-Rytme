const marker = document.querySelector('#marker');
const trackWrap = document.querySelector('.track-wrap');
const positionEl = document.querySelector('#position');
const speedEl = document.querySelector('#speed');
const phaseEl = document.querySelector('#phase');
const statusEl = document.querySelector('#status');
const startBtn = document.querySelector('#startBtn');
const pauseBtn = document.querySelector('#pauseBtn');
const resetBtn = document.querySelector('#resetBtn');

const settings = {
  minSpeed: document.querySelector('#minSpeed'), maxSpeed: document.querySelector('#maxSpeed'),
  minPause: document.querySelector('#minPause'), maxPause: document.querySelector('#maxPause'),
  pauseChance: document.querySelector('#pauseChance'), variation: document.querySelector('#variation')
};
const outputs = {
  minSpeed: document.querySelector('#minSpeedValue'), maxSpeed: document.querySelector('#maxSpeedValue'),
  minPause: document.querySelector('#minPauseValue'), maxPause: document.querySelector('#maxPauseValue'),
  pauseChance: document.querySelector('#pauseChanceValue'), variation: document.querySelector('#variationValue')
};

// Position is stored in PIXELS, not percentages. This prevents any 63% -> 0% visual jump.
let y = 0;
let targetY = 0;
let speed = 120;
let targetSpeed = 120;
let running = false;
let paused = false;
let pauseUntil = 0;
let lastTime = 0;
let nextSpeedChange = 0;
let pauseAfterArrival = false;

const random = (min, max) => min + Math.random() * (max - min);

function readSettings() {
  return {
    minSpeed: Number(settings.minSpeed.value), maxSpeed: Number(settings.maxSpeed.value),
    minPause: Number(settings.minPause.value), maxPause: Number(settings.maxPause.value),
    pauseChance: Number(settings.pauseChance.value) / 100
  };
}

function trackHeight() {
  return Math.max(1, trackWrap.clientHeight);
}

function setMarkerPixelPosition() {
  // One and only one writer controls the marker transform.
  marker.style.transform = `translate3d(-50%, ${y}px, 0)`;
  const h = trackHeight();
  const percent = Math.round((1 - y / h) * 100);
  positionEl.textContent = `${Math.max(0, Math.min(100, percent))}%`;
  speedEl.textContent = `${(speed / 120).toFixed(2)}×`;
}

function chooseSpeed(now) {
  const s = readSettings();
  targetSpeed = random(Math.min(s.minSpeed, s.maxSpeed), Math.max(s.minSpeed, s.maxSpeed)) * 120;
  nextSpeedChange = now + random(1800, 4500);
}

function chooseDestination(now) {
  const h = trackHeight();
  const current = y;
  const roll = Math.random();

  // 0 = very top, h = very bottom. The point travels there; it NEVER jumps there.
  if (roll < 0.20) targetY = 0;
  else if (roll < 0.40) targetY = h;
  else targetY = random(h * 0.05, h * 0.95);

  // Avoid a destination too close to the current position.
  if (Math.abs(targetY - current) < h * 0.08) {
    targetY = current < h / 2 ? random(h * 0.60, h * 0.95) : random(h * 0.05, h * 0.40);
  }

  pauseAfterArrival = Math.random() <= readSettings().pauseChance;
  phaseEl.textContent = targetY > y ? 'MOVING DOWN' : 'MOVING UP';
}

function beginPause(now) {
  const s = readSettings();
  pauseUntil = now + random(Math.min(s.minPause, s.maxPause), Math.max(s.minPause, s.maxPause)) * 1000;
  paused = true;
  marker.classList.add('paused');
  phaseEl.textContent = 'PAUSED';
}

function frame(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(50, Math.max(0, now - lastTime)) / 1000;
  lastTime = now;

  if (running && !paused) {
    if (now >= nextSpeedChange) chooseSpeed(now);

    // Smoothly change speed, but NEVER change y by a random amount.
    speed += (targetSpeed - speed) * (1 - Math.exp(-dt / 0.8));

    const distance = targetY - y;
    const maxStep = speed * dt;

    if (Math.abs(distance) > 0.01) {
      // Continuous movement. Maximum movement per frame is speed * time.
      y += Math.sign(distance) * Math.min(Math.abs(distance), maxStep);
    }

    if (Math.abs(targetY - y) <= 0.01) {
      y = targetY;
      if (pauseAfterArrival) beginPause(now);
      else chooseDestination(now);
    }
  }

  if (running && paused && now >= pauseUntil) {
    paused = false;
    marker.classList.remove('paused');
    chooseDestination(now);
  }

  setMarkerPixelPosition();
  requestAnimationFrame(frame);
}

function start() {
  const h = trackHeight();
  // Start exactly where the marker is visually displayed.
  y = Math.max(0, Math.min(h, y));
  running = true;
  paused = false;
  marker.classList.remove('paused');
  const now = performance.now();
  lastTime = now;
  chooseSpeed(now);
  speed = targetSpeed;
  chooseDestination(now);
  statusEl.textContent = 'RUNNING';
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'PAUSE';
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    pauseUntil = Infinity;
    marker.classList.add('paused');
    phaseEl.textContent = 'PAUSED';
    pauseBtn.textContent = 'RESUME';
    statusEl.textContent = 'PAUSED';
  } else {
    paused = false;
    marker.classList.remove('paused');
    lastTime = performance.now();
    phaseEl.textContent = targetY > y ? 'MOVING DOWN' : 'MOVING UP';
    pauseBtn.textContent = 'PAUSE';
    statusEl.textContent = 'RUNNING';
  }
}

function reset() {
  running = false;
  paused = false;
  pauseUntil = 0;
  y = trackHeight() / 2;
  targetY = y;
  speed = 120;
  targetSpeed = 120;
  marker.classList.remove('paused');
  statusEl.textContent = 'READY';
  phaseEl.textContent = 'READY';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'PAUSE';
  setMarkerPixelPosition();
}

function updateOutputs() {
  outputs.minSpeed.textContent = `${Number(settings.minSpeed.value).toFixed(2)}×`;
  outputs.maxSpeed.textContent = `${Number(settings.maxSpeed.value).toFixed(2)}×`;
  outputs.minPause.textContent = `${Number(settings.minPause.value).toFixed(1)} s`;
  outputs.maxPause.textContent = `${Number(settings.maxPause.value).toFixed(1)} s`;
  outputs.pauseChance.textContent = `${settings.pauseChance.value}%`;
  outputs.variation.textContent = `${settings.variation.value}%`;
}

Object.values(settings).forEach(input => input.addEventListener('input', updateOutputs));
window.addEventListener('resize', () => { y = Math.max(0, Math.min(trackHeight(), y)); setMarkerPixelPosition(); });
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', reset);

reset();
updateOutputs();
requestAnimationFrame(frame);
