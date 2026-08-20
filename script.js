const marker = document.querySelector('#marker');
const positionEl = document.querySelector('#position');
const speedEl = document.querySelector('#speed');
const phaseEl = document.querySelector('#phase');
const statusEl = document.querySelector('#status');
const startBtn = document.querySelector('#startBtn');
const pauseBtn = document.querySelector('#pauseBtn');
const resetBtn = document.querySelector('#resetBtn');

const settings = {
  minSpeed: document.querySelector('#minSpeed'),
  maxSpeed: document.querySelector('#maxSpeed'),
  minPause: document.querySelector('#minPause'),
  maxPause: document.querySelector('#maxPause'),
  pauseChance: document.querySelector('#pauseChance'),
  variation: document.querySelector('#variation')
};

const outputs = {
  minSpeed: document.querySelector('#minSpeedValue'),
  maxSpeed: document.querySelector('#maxSpeedValue'),
  minPause: document.querySelector('#minPauseValue'),
  maxPause: document.querySelector('#maxPauseValue'),
  pauseChance: document.querySelector('#pauseChanceValue'),
  variation: document.querySelector('#variationValue')
};

let position = 50; // 0 = bottom, 100 = top
let direction = 1;
let speed = 1;
let running = false;
let paused = false;
let pauseUntil = 0;
let lastTime = 0;
let nextSpeedChange = 0;

const random = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function readSettings() {
  return {
    minSpeed: Number(settings.minSpeed.value),
    maxSpeed: Number(settings.maxSpeed.value),
    minPause: Number(settings.minPause.value),
    maxPause: Number(settings.maxPause.value),
    pauseChance: Number(settings.pauseChance.value) / 100,
    variation: Number(settings.variation.value) / 100
  };
}

function setSpeed(next, now) {
  const s = readSettings();
  speed = clamp(next, s.minSpeed, Math.max(s.minSpeed, s.maxSpeed));
  nextSpeedChange = now + random(1600, 5000);
}

function chooseNewSpeed(now) {
  const s = readSettings();
  const base = random(s.minSpeed, Math.max(s.minSpeed, s.maxSpeed));
  const variation = 1 + random(-s.variation, s.variation);
  setSpeed(base * variation, now);
}

function choosePause() {
  const s = readSettings();
  if (Math.random() > s.pauseChance) return false;

  // Favor all three interesting cases: top, bottom or anywhere.
  const type = Math.random();
  if (type < 0.25) position = 100;
  else if (type < 0.50) position = 0;
  else position = random(8, 92);

  return true;
}

function beginPause(now) {
  const s = readSettings();
  const min = Math.min(s.minPause, s.maxPause);
  const max = Math.max(s.minPause, s.maxPause);
  pauseUntil = now + random(min, max) * 1000;
  paused = true;
  marker.classList.add('paused');
  phaseEl.textContent = 'PAUSED';
}

function updateUI() {
  marker.style.top = `${100 - position}%`;
  positionEl.textContent = `${Math.round(position)}%`;
  speedEl.textContent = `${speed.toFixed(2)}×`;
}

function frame(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  if (running && !paused) {
    if (now >= nextSpeedChange) chooseNewSpeed(now);

    // About 30 seconds for a full top-to-bottom trip at 1×.
    position += direction * (dt / 300) * speed;

    if (position >= 100) {
      position = 100;
      direction = -1;
      if (choosePause()) beginPause(now);
    } else if (position <= 0) {
      position = 0;
      direction = 1;
      if (choosePause()) beginPause(now);
    } else if (Math.random() < 0.0009 * dt && choosePause()) {
      beginPause(now);
    }

    phaseEl.textContent = direction > 0 ? 'MOVING UP' : 'MOVING DOWN';
  }

  if (running && paused && now >= pauseUntil) {
    paused = false;
    marker.classList.remove('paused');
    phaseEl.textContent = direction > 0 ? 'MOVING UP' : 'MOVING DOWN';
    chooseNewSpeed(now);
  }

  updateUI();
  requestAnimationFrame(frame);
}

function start() {
  running = true;
  paused = false;
  marker.classList.remove('paused');
  const now = performance.now();
  lastTime = now;
  chooseNewSpeed(now);
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
    marker.classList.remove('paused');
    phaseEl.textContent = direction > 0 ? 'MOVING UP' : 'MOVING DOWN';
    pauseBtn.textContent = 'PAUSE';
    statusEl.textContent = 'RUNNING';
    lastTime = performance.now();
  }
}

function reset() {
  running = false;
  paused = false;
  pauseUntil = 0;
  position = 50;
  direction = 1;
  speed = 1;
  marker.classList.remove('paused');
  statusEl.textContent = 'READY';
  phaseEl.textContent = 'MOVING';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = 'PAUSE';
  updateUI();
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
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', reset);

updateOutputs();
updateUI();
requestAnimationFrame(frame);
